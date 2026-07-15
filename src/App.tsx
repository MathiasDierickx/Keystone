import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderPlus, Search } from "lucide-react";
import type { Artifact, Comment, Feedback, Project, Verdict } from "@/types";
import { listArtifacts, readFeedback, writeFeedback } from "@/lib/data";
import {
  loadProjects,
  loadSelectedId,
  newId,
  PROJECT_COLORS,
  saveProjects,
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
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
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
      setFeedback(null);
      return;
    }
    let cancelled = false;
    readFeedback(selectedPath)
      .then((fb) => !cancelled && setFeedback(fb))
      .catch(() => !cancelled && setFeedback(null));
    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

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
    setSelectedPath(null);
    setFeedback(null);
    setSelection({ by: "status", value: "awaiting-review" });
  };

  const persist = async (next: Feedback, notify?: () => void) => {
    if (!selected) return;
    try {
      await writeFeedback(selected.path, next);
      setFeedback(next);
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
            onSelect={(a) => setSelectedPath(a.path)}
          />
        </div>
      </div>

      {/* Detail column */}
      <main className="min-w-0 flex-1">
        <ArtifactView
          artifact={selected}
          feedback={feedback}
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
