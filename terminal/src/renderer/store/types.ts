import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";

export type SessionLifecycle = "todo" | "in_progress" | "completed";

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
}

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}
