import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Compass,
  FlaskConical,
  GraduationCap,
  History,
  Inbox,
  Layers,
  Lightbulb,
  ListTodo,
  Loader2,
  Milestone,
  PenTool,
  Scale,
  ScrollText,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { Artifact, ArtifactKind, ArtifactStatus, Project } from "@/types";
import { cn } from "@/lib/utils";
import { KIND_FAMILIES, KIND_LABEL } from "@/lib/format";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectSwitcher } from "./ProjectSwitcher";

/** The active view: either a status lens or a document-type lens. */
export type Selection =
  | { by: "status"; value: ArtifactStatus | "all" }
  | { by: "kind"; value: ArtifactKind };

const STATUS_ITEMS: {
  value: ArtifactStatus | "all";
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "awaiting-review", label: "Awaiting review", icon: Inbox },
  { value: "in-review", label: "In review", icon: Loader2 },
  { value: "done", label: "Done", icon: CheckCircle2 },
  { value: "all", label: "All artifacts", icon: Layers },
];

const KIND_ICON: Record<ArtifactKind, LucideIcon> = {
  spec: ScrollText,
  design: PenTool,
  decision: Scale,
  rfc: Milestone,
  reference: BookOpen,
  guide: Compass,
  tutorial: GraduationCap,
  explanation: Lightbulb,
  runbook: Terminal,
  changelog: History,
  research: FlaskConical,
  plan: ListTodo,
  report: BarChart3,
  note: StickyNote,
};

interface SidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, folder: string) => void;
  artifacts: Artifact[];
  selection: Selection;
  onSelect: (s: Selection) => void;
}

function NavItem({
  icon: Icon,
  label,
  count,
  active,
  spin,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  active: boolean;
  spin?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", spin && active && "animate-spin")} />
      <span className="flex-1 truncate text-left">{label}</span>
      {count > 0 && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs tabular-nums",
            active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  artifacts,
  selection,
  onSelect,
}: SidebarProps) {
  const statusCount = (v: ArtifactStatus | "all") =>
    v === "all" ? artifacts.length : artifacts.filter((a) => a.status === v).length;
  const kindCount = (k: ArtifactKind) =>
    artifacts.filter((a) => a.kind === k).length;

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 p-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pt-1">
        <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Layers className="size-4" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Keystone</span>
      </div>

      <ProjectSwitcher
        projects={projects}
        selectedId={selectedProjectId}
        onSelect={onSelectProject}
        onCreate={onCreateProject}
      />

      <ScrollArea className="-mx-1 min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-1">
          {/* Status lens */}
          <nav className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-xs font-medium text-muted-foreground/70">
              Review queue
            </p>
            {STATUS_ITEMS.map(({ value, label, icon }) => (
              <NavItem
                key={value}
                icon={icon}
                label={label}
                count={statusCount(value)}
                spin={value === "in-review"}
                active={selection.by === "status" && selection.value === value}
                onClick={() => onSelect({ by: "status", value })}
              />
            ))}
          </nav>

          {/* Type lens — only families/kinds present in this project */}
          {KIND_FAMILIES.map((family) => {
            const kinds = family.kinds.filter((k) => kindCount(k) > 0);
            if (kinds.length === 0) return null;
            return (
              <nav key={family.name} className="flex flex-col gap-1">
                <p className="px-3 pb-1 text-xs font-medium text-muted-foreground/70">
                  {family.name}
                </p>
                {kinds.map((k) => (
                  <NavItem
                    key={k}
                    icon={KIND_ICON[k]}
                    label={KIND_LABEL[k]}
                    count={kindCount(k)}
                    active={selection.by === "kind" && selection.value === k}
                    onClick={() => onSelect({ by: "kind", value: k })}
                  />
                ))}
              </nav>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
