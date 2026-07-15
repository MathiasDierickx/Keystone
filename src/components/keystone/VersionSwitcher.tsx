import { Check, ChevronDown, GitBranch, HardDrive } from "lucide-react";
import type { DocVersion } from "@/lib/versions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VersionSwitcherProps {
  versions: DocVersion[];
  currentKey: string | null;
  onSelect: (v: DocVersion) => void;
}

export function VersionSwitcher({
  versions,
  currentKey,
  onSelect,
}: VersionSwitcherProps) {
  // Only worth showing when there is more than one version to choose from.
  if (versions.length <= 1) return null;

  const current = versions.find((v) => v.key === currentKey);
  const worktrees = versions.filter((v) => v.kind === "worktree");
  const branches = versions.filter((v) => v.kind === "branch");

  const Row = (v: DocVersion) => (
    <DropdownMenuItem
      key={v.key}
      onClick={() => onSelect(v)}
      className="gap-2 rounded-lg"
    >
      {v.kind === "worktree" ? (
        <HardDrive className="size-3.5 text-muted-foreground" />
      ) : (
        <GitBranch className="size-3.5 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1 truncate">{v.label}</span>
      {v.isMain && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          main
        </span>
      )}
      {v.key === currentKey && <Check className="size-3.5 text-primary" />}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 py-1 text-xs",
            "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          )}
        >
          <GitBranch className="size-3" />
          <span className="max-w-40 truncate">{current?.label ?? "version"}</span>
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-xl">
        {worktrees.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Worktrees
            </DropdownMenuLabel>
            {worktrees.map(Row)}
          </>
        )}
        {branches.length > 0 && (
          <>
            {worktrees.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Other branches
            </DropdownMenuLabel>
            {branches.map(Row)}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
