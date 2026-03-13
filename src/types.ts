import type { ChildProcess } from "node:child_process";

export type SessionLifecycle = "todo" | "in_progress" | "completed";
export type TodoType = "bug" | "feature" | "improvement";

export interface Session {
  id: string;
  branch: string;
  baseBranch: string;
  worktreePath: string;
  task: string;
  status: "running" | "idle" | "done";
  lifecycle: SessionLifecycle;
  pid?: number;
  createdAt: string;
  completedAt?: string;
  mergedTo?: string;
  todoType?: TodoType;
  description?: string;
  planStatus?: string;
  planMarkdown?: string;
  sourceNoteId?: string | null;
  folderId?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  order: number;
}

export interface VolleyState {
  repoRoot: string;
  sessions: Session[];
  todoFolders?: Folder[];
}

export interface GridConfig {
  maxColumns?: number;
  maxRows?: number;
  gap?: number;
}

export interface VolleyConfig {
  symlinks?: string[];
  setup?: string[];
  start?: string;
  terminal?: string;
  grid?: GridConfig;
  provider?: "github" | "gitlab" | "bitbucket";
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SessionStats {
  elapsed: string;
  commits: number;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export type LaunchFn = (cwd: string, task: string, slug: string, branch: string) => ChildProcess;

export interface Project {
  id: string;
  name: string;
  path: string;
}

export interface ProjectRegistry {
  projects: Project[];
  activeProjectId: string | null;
}
