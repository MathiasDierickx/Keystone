import { Inbox, Loader2, CheckCircle2, Layers } from "lucide-react";
import type { Artifact, ArtifactStatus, Project } from "@/types";
import { cn } from "@/lib/utils";
import { ProjectSwitcher } from "./ProjectSwitcher";

export type QueueFilter = ArtifactStatus | "all";

const FILTERS: { key: QueueFilter; label: string; icon: typeof Inbox }[] = [
  { key: "awaiting-review", label: "Awaiting review", icon: Inbox },
  { key: "in-review", label: "In review", icon: Loader2 },
  { key: "done", label: "Done", icon: CheckCircle2 },
  { key: "all", label: "All artifacts", icon: Layers },
];

interface SidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, folder: string) => void;
  artifacts: Artifact[];
  active: QueueFilter;
  onSelect: (f: QueueFilter) => void;
}

export function Sidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  artifacts,
  active,
  onSelect,
}: SidebarProps) {
  const count = (f: QueueFilter) =>
    f === "all"
      ? artifacts.length
      : artifacts.filter((a) => a.status === f).length;

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-5 p-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pt-1">
        <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Layers className="size-4" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Keystone</span>
      </div>

      {/* Project context switcher */}
      <ProjectSwitcher
        projects={projects}
        selectedId={selectedProjectId}
        onSelect={onSelectProject}
        onCreate={onCreateProject}
      />

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground/70">
          Review queue
        </p>
        {FILTERS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          const n = count(key);
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  key === "in-review" && isActive && "animate-spin",
                )}
              />
              <span className="flex-1 text-left">{label}</span>
              {n > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs tabular-nums",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
