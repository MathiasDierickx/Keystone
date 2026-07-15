import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Artifact, Verdict } from "@/types";
import { listArtifacts, writeFeedback } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Sidebar, type QueueFilter } from "@/components/keystone/Sidebar";
import { QueueList } from "@/components/keystone/QueueList";
import { ArtifactView } from "@/components/keystone/ArtifactView";

function App() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [filter, setFilter] = useState<QueueFilter>("awaiting-review");
  const [query, setQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    listArtifacts().then(setArtifacts);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artifacts
      .filter((a) => (filter === "all" ? true : a.status === filter))
      .filter((a) => (q ? a.title.toLowerCase().includes(q) : true))
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  }, [artifacts, filter, query]);

  const selected = artifacts.find((a) => a.path === selectedPath) ?? null;

  const handleSubmit = (verdict: Verdict, body: string) => {
    if (!selected) return;
    writeFeedback({
      target: selected.filename,
      status: "pending",
      verdict,
      reviewedAt: new Date().toISOString(),
      body,
    });
    setArtifacts((prev) =>
      prev.map((a) =>
        a.path === selected.path
          ? { ...a, hasFeedback: true, status: "in-review" }
          : a,
      ),
    );
    toast.success("Feedback sent", {
      description: `${selected.filename.replace(/\.md$/, "")}.feedback.md written`,
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        folder="~/reviews"
        artifacts={artifacts}
        active={filter}
        onSelect={setFilter}
        onPickFolder={() => toast("Folder picker comes next (Tauri fs).")}
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
        <ArtifactView artifact={selected} onSubmitFeedback={handleSubmit} />
      </main>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
