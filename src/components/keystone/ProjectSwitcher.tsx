import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Check, ChevronsUpDown, FolderOpen, Plus } from "lucide-react";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProjectSwitcherProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, folder: string) => void;
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

export function ProjectSwitcher({
  projects,
  selectedId,
  onSelect,
  onCreate,
}: ProjectSwitcherProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState<string | null>(null);

  const current = projects.find((p) => p.id === selectedId) ?? null;

  const pickFolder = async () => {
    const picked = await open({ directory: true, multiple: false });
    if (typeof picked === "string") setFolder(picked);
  };

  const submit = () => {
    if (!name.trim() || !folder) return;
    onCreate(name.trim(), folder);
    setDialogOpen(false);
    setName("");
    setFolder(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="glass flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-sidebar-accent/50">
            {current ? (
              <>
                <Dot color={current.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {current.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {current.folder}
                  </span>
                </span>
              </>
            ) : (
              <span className="flex-1 text-sm text-muted-foreground">
                No project
              </span>
            )}
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 rounded-xl">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Projects
          </DropdownMenuLabel>
          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="gap-2.5 rounded-lg"
            >
              <Dot color={p.color} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.id === selectedId && (
                <Check className="size-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          {projects.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onClick={() => setDialogOpen(true)}
            className="gap-2.5 rounded-lg text-primary focus:text-primary"
          >
            <Plus className="size-4" />
            New project…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              A project is one client workspace, watching a single folder. Fully
              separate from your other projects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme FC"
                className="rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>
            <div className="space-y-2">
              <Label>Watched folder</Label>
              <button
                onClick={pickFolder}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50",
                  !folder && "text-muted-foreground",
                )}
              >
                <FolderOpen className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">
                  {folder ?? "Choose a folder…"}
                </span>
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={!name.trim() || !folder}
              onClick={submit}
            >
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
