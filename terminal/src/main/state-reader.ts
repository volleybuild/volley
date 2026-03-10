import * as fs from "node:fs";
import * as path from "node:path";

export type SessionLifecycle = "todo" | "in_progress" | "completed";

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
}

export interface VolleyState {
  repoRoot: string;
  sessions: SessionState[];
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
