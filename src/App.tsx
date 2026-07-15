import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderPlus, Search } from "lucide-react";
import type { Artifact, Comment, Feedback, Project, Verdict } from "@/types";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  docBranchVersions,
  listArtifacts,
  readDocAtRef,
  readFeedback,
  writeFeedback,
} from "@/lib/data";
import { tauriMissing } from "@/lib/devMock";
import { isExternalHref, resolvePath } from "@/lib/paths";
import { buildVersions, refShort, type DocVersion } from "@/lib/versions";
import {
  loadPreferredBranch,
  loadProjects,
  loadSelectedId,
  newId,
  PROJECT_COLORS,
  saveProjects,
  savePreferredBranch,
  saveSelectedId,
} from "@/lib/projects";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Sidebar, type Selection } from "@/components/keystone/Sidebar";
import { QueueList } from "@/components/keystone/QueueList";
import { ArtifactView } from "@/components/keystone/ArtifactView";
import { ProjectSwitcher } from "@/components/keystone/ProjectSwitcher";

const POLL_MS = 2500;

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selection, setSelection] = useState<Selection>({
    by: "status",
    value: "awaiting-review",
  });
  const [query, setQuery] = useState("");
  // Navigation history (back/forward), as a stack of artifact paths.
  const [nav, setNav] = useState<{ stack: string[]; index: number }>({
    stack: [],
    index: -1,
  });
  // Feedback is bound to the path it was loaded for, so a stale value from the
  // previously-viewed document is never shown while the new one loads.
  const [feedbackEntry, setFeedbackEntry] = useState<{
    path: string;
    data: Feedback | null;
  } | null>(null);

  // Version switching (view the same doc across worktrees/branches).
  const [branchRefs, setBranchRefs] = useState<string[]>([]);
  const [branchView, setBranchView] = useState<{
    ref: string;
    label: string;
    content: string;
  } | null>(null);
  const [preferredBranch, setPreferredBranch] = useState<string | null>(null);

  const selectedPath = nav.index >= 0 ? nav.stack[nav.index] : null;
  const canBack = nav.index > 0;
  const canForward = nav.index < nav.stack.length - 1;
  const feedback =
    feedbackEntry && feedbackEntry.path === selectedPath
      ? feedbackEntry.data
      : null;

  const artifactsRef = useRef(artifacts);
  artifactsRef.current = artifacts;

  const navigate = useCallback((path: string) => {
    setNav(({ stack, index }) => {
      if (stack[index] === path) return { stack, index };
      const base = stack.slice(0, index + 1);
      base.push(path);
      return { stack: base, index: base.length - 1 };
    });
  }, []);
  const back = useCallback(
    () => setNav((n) => (n.index > 0 ? { ...n, index: n.index - 1 } : n)),
    [],
  );
  const forward = useCallback(
    () =>
      setNav((n) =>
        n.index < n.stack.length - 1 ? { ...n, index: n.index + 1 } : n,
      ),
    [],
  );
  const loadErrored = useRef(false);

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) ?? null;

  // Load persisted projects on startup.
  useEffect(() => {
    const stored = loadProjects();
    setProjects(stored);
    const sel = loadSelectedId();
    setSelectedProjectId(
      sel && stored.some((p) => p.id === sel) ? sel : (stored[0]?.id ?? null),
    );
  }, []);

  const refresh = useCallback(async (folder: string) => {
    try {
      const list = await listArtifacts(folder);
      setArtifacts(list);
      loadErrored.current = false;
    } catch (e) {
      if (!loadErrored.current) {
        loadErrored.current = true;
        toast.error("Couldn't read folder", { description: String(e) });
      }
    }
  }, []);

  // Load + poll artifacts for the active project.
  useEffect(() => {
    if (!selectedProject) {
      setArtifacts([]);
      return;
    }
    const folder = selectedProject.folder;
    refresh(folder);
    const t = setInterval(() => refresh(folder), POLL_MS);
    return () => clearInterval(t);
  }, [selectedProject, refresh]);

  // Load existing feedback when the selected artifact changes.
  useEffect(() => {
    if (!selectedPath) {
      setFeedbackEntry(null);
      return;
    }
    const path = selectedPath;
    let cancelled = false;
    readFeedback(path)
      .then((data) => !cancelled && setFeedbackEntry({ path, data }))
      .catch(() => !cancelled && setFeedbackEntry({ path, data: null }));
    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  // Remember the preferred branch per project.
  useEffect(() => {
    setPreferredBranch(
      selectedProjectId ? loadPreferredBranch(selectedProjectId) : null,
    );
  }, [selectedProjectId]);

  // Discover other versions of the open document, and apply the branch
  // preference (navigate to a preferred worktree, or load a branch read-only).
  useEffect(() => {
    setBranchView(null);
    setBranchRefs([]);
    const cur = artifactsRef.current.find((a) => a.path === selectedPath);
    const folder = selectedProject?.folder;
    if (!cur?.repoRelPath || !folder) return;
    const rel = cur.repoRelPath;
    const pref = preferredBranch;

    // Preferred version lives in another worktree → navigate to it (the guard
    // `cur.branch !== pref` stops this from looping after the navigation).
    if (pref && cur.branch !== pref) {
      const wtVer = artifactsRef.current.find(
        (a) => a.repoRelPath === rel && a.branch === pref && a.path !== selectedPath,
      );
      if (wtVer) {
        navigate(wtVer.path);
        return;
      }
    }

    let cancelled = false;
    docBranchVersions(folder, rel)
      .then((refs) => {
        if (cancelled) return;
        setBranchRefs(refs);
        if (!pref) return;
        const match = refs.find((r) => refShort(r) === pref);
        if (!match) return;
        readDocAtRef(folder, match, rel).then((content) => {
          if (!cancelled && content != null)
            setBranchView({ ref: match, label: match, content });
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedPath, selectedProject?.folder, preferredBranch, navigate]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesSelection = (a: Artifact) =>
      selection.by === "kind"
        ? a.kind === selection.value
        : selection.value === "all"
          ? true
          : a.status === selection.value;
    return artifacts
      .filter(matchesSelection)
      .filter((a) => (q ? a.title.toLowerCase().includes(q) : true))
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  }, [artifacts, selection, query]);

  const selected = artifacts.find((a) => a.path === selectedPath) ?? null;

  // Keyboard back/forward (Cmd/Ctrl + [ or ]).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "[") {
        e.preventDefault();
        back();
      } else if (e.key === "]") {
        e.preventDefault();
        forward();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, forward]);

  // Follow an internal doc link; hand external links to the OS browser.
  const handleLink = (href: string) => {
    if (!href) return;
    if (isExternalHref(href)) {
      if (tauriMissing()) window.open(href, "_blank", "noopener");
      else void openUrl(href).catch(() => {});
      return;
    }
    if (href.startsWith("#")) return; // in-page anchor, not yet handled
    if (!selected) return;
    const target = resolvePath(selected.path, href);
    const hit =
      artifacts.find((a) => a.path === target) ??
      artifacts.find(
        (a) => a.repoRelPath && target.endsWith(`/${a.repoRelPath}`),
      );
    if (hit) navigate(hit.path);
    else toast("Link target isn't in this project", { description: href });
  };

  const versions = selected
    ? buildVersions(selected, artifacts, branchRefs)
    : [];
  const currentVersionKey = branchView
    ? `br:${branchView.ref}`
    : selected
      ? `wt:${selected.path}`
      : null;
  const override = branchView
    ? { label: branchView.label, content: branchView.content }
    : null;

  const selectVersion = (v: DocVersion) => {
    if (!selectedProject) return;
    if (v.kind === "worktree") {
      savePreferredBranch(selectedProject.id, v.label);
      setPreferredBranch(v.label);
      setBranchView(null);
      if (v.path && v.path !== selectedPath) navigate(v.path);
    } else if (v.ref) {
      const short = refShort(v.ref);
      savePreferredBranch(selectedProject.id, short);
      setPreferredBranch(short);
      // branchView is loaded by the version effect reacting to preferredBranch.
    }
  };

  const persistProjects = (next: Project[]) => {
    setProjects(next);
    saveProjects(next);
  };

  const handleCreateProject = (name: string, folder: string) => {
    const project: Project = {
      id: newId(),
      name,
      folder,
      color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      createdAt: new Date().toISOString(),
    };
    persistProjects([...projects, project]);
    handleSelectProject(project.id);
    toast.success("Project created", { description: name });
  };

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    saveSelectedId(id);
    setNav({ stack: [], index: -1 });
    setFeedbackEntry(null);
    setSelection({ by: "status", value: "awaiting-review" });
  };

  const persist = async (next: Feedback, notify?: () => void) => {
    if (!selected) return;
    try {
      await writeFeedback(selected.path, next);
      setFeedbackEntry({ path: selected.path, data: next });
      if (selectedProject) refresh(selectedProject.folder);
      notify?.();
    } catch (e) {
      toast.error("Couldn't write feedback", { description: String(e) });
    }
  };

  const baseFeedback = (): Feedback => ({
    target: selected!.filename,
    status: "pending",
    verdict: feedback?.verdict ?? "changes-requested",
    reviewedAt: new Date().toISOString(),
    summary: feedback?.summary ?? "",
    comments: feedback?.comments ?? [],
  });

  const handleSubmit = (verdict: Verdict, summary: string) => {
    if (!selected) return;
    persist({ ...baseFeedback(), verdict, summary }, () =>
      toast.success("Feedback sent", {
        description: `${selected.filename.replace(/\.md$/, "")}.feedback.md written`,
      }),
    );
  };

  const handleCreateComment = (comment: Comment) => {
    if (!selected) return;
    const base = baseFeedback();
    persist({ ...base, comments: [...base.comments, comment] }, () =>
      toast.success("Comment added"),
    );
  };

  const handleDeleteComment = (id: string) => {
    if (!selected) return;
    const base = baseFeedback();
    persist({ ...base, comments: base.comments.filter((c) => c.id !== id) });
  };

  // No projects yet — full-screen onboarding.
  if (projects.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <FolderPlus className="size-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Keystone
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create a project for a client and point it at a folder. Keystone
            watches it for Markdown artifacts to review.
          </p>
        </div>
        <div className="w-72">
          <ProjectSwitcher
            projects={projects}
            selectedId={null}
            onSelect={handleSelectProject}
            onCreate={handleCreateProject}
          />
        </div>
        <Toaster position="bottom-right" richColors />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        artifacts={artifacts}
        selection={selection}
        onSelect={setSelection}
      />

      {/* Queue column */}
      <div className="flex w-[22rem] shrink-0 flex-col py-4">
        <div className="relative px-3 pb-2">
          <Search className="absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artifacts…"
            className="glass rounded-xl border-0 pl-9 shadow-none"
          />
        </div>
        <div className="min-h-0 flex-1">
          <QueueList
            artifacts={visible}
            selectedPath={selectedPath}
            onSelect={(a) => navigate(a.path)}
          />
        </div>
      </div>

      {/* Detail column */}
      <main className="min-w-0 flex-1">
        <ArtifactView
          artifact={selected}
          feedback={feedback}
          versions={versions}
          currentVersionKey={currentVersionKey}
          override={override}
          canBack={canBack}
          canForward={canForward}
          onBack={back}
          onForward={forward}
          onSelectVersion={selectVersion}
          onLinkClick={handleLink}
          onSubmitFeedback={handleSubmit}
          onCreateComment={handleCreateComment}
          onDeleteComment={handleDeleteComment}
        />
      </main>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
