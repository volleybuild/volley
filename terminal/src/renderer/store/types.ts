import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";

export type SessionLifecycle = "todo" | "in_progress" | "completed";
export type TodoType = "bug" | "feature" | "improvement";
export type PlanStatus = "pending" | "planning" | "ready" | "failed";

export interface SessionState {
  id: string;
  slug: string;
  branch: string;
  baseBranch?: string;
  task: string;
  worktreePath: string;
  startTime: number;
  status: "pending" | "running" | "idle" | "exited";
  lifecycle: SessionLifecycle;
  completedAt?: number;
  mergedTo?: string;
  exitCode: number | null;
  terminal: Terminal | null;
  fitAddon: FitAddon | null;
  runTerminal: Terminal | null;
  runFitAddon: FitAddon | null;
  runStatus: "idle" | "running" | "exited";
  runExitCode: number | null;
  setupWarning?: string;
  todoType?: TodoType;
  description?: string;
  planStatus?: PlanStatus;
  planMarkdown?: string;
  planError?: string;
  sourceNoteId?: string | null;
  folderId?: string | null;
}

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}
