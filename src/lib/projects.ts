import type { Project } from "@/types";

const PROJECTS_KEY = "keystone.projects";
const SELECTED_KEY = "keystone.selectedProject";

/** Distinct, calm accent colors for project chips. */
export const PROJECT_COLORS = [
  "oklch(0.62 0.19 293)", // violet
  "oklch(0.6 0.17 250)", // blue
  "oklch(0.62 0.15 165)", // teal
  "oklch(0.66 0.16 55)", // amber
  "oklch(0.62 0.2 15)", // red
  "oklch(0.6 0.16 330)", // pink
];

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Project[]) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function loadSelectedId(): string | null {
  return localStorage.getItem(SELECTED_KEY);
}

export function saveSelectedId(id: string | null): void {
  if (id) localStorage.setItem(SELECTED_KEY, id);
  else localStorage.removeItem(SELECTED_KEY);
}

/** Preferred branch/worktree per project — the version to favor when browsing. */
export function loadPreferredBranch(projectId: string): string | null {
  return localStorage.getItem(`keystone.pref.${projectId}`);
}

export function savePreferredBranch(projectId: string, branch: string | null): void {
  const key = `keystone.pref.${projectId}`;
  if (branch) localStorage.setItem(key, branch);
  else localStorage.removeItem(key);
}
