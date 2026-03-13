import * as fs from "node:fs";
import * as path from "node:path";

export type SessionLifecycle = "todo" | "in_progress" | "completed";
export type TodoType = "bug" | "feature" | "improvement";

export interface Folder {
  id: string;
  name: string;
  order: number;
}

export interface SessionState {
  id: string;
  branch: string;
  baseBranch?: string;
  worktreePath: string;
  task: string;
  status: "running" | "idle" | "done";
  lifecycle?: SessionLifecycle;
  pid?: number;
  createdAt: string;
  completedAt?: string;
  mergedTo?: string;
  agentSessionId?: string;
  todoType?: TodoType;
  description?: string;
  planStatus?: string;
  planMarkdown?: string;
  sourceNoteId?: string | null;
  folderId?: string | null;
}

export interface VolleyState {
  repoRoot: string;
  sessions: SessionState[];
  todoFolders?: Folder[];
}

export function loadStateFromDisk(repoRoot: string): VolleyState | null {
  const statePath = path.join(repoRoot, ".volley", "state.json");

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(statePath, "utf-8");
    return JSON.parse(raw) as VolleyState;
  } catch {
    return null;
  }
}

export function saveStateToDisk(repoRoot: string, state: VolleyState): void {
  const volleyDir = path.join(repoRoot, ".volley");
  if (!fs.existsSync(volleyDir)) {
    fs.mkdirSync(volleyDir, { recursive: true });
  }
  const statePath = path.join(volleyDir, "state.json");
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
}
