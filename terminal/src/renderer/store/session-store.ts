import { create } from "zustand";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import type { SessionState, SessionLifecycle } from "./types";
import { volleyTheme } from "../constants/theme";

interface SessionStore {
  sessions: Map<string, SessionState>;
  activeSessionId: string | null;
  gridMode: boolean;
  startCommand: string | null;
  setupLogs: Record<string, string>;
  addSession: (session: VolleySession & { pendingId?: string }) => void;
  addTodoSession: (session: { id: string; task: string }) => void;
  addPendingSession: (pendingId: string, task: string) => void;
  writePendingOutput: (pendingId: string, data: string) => void;
  setPendingFailed: (pendingId: string, error: string) => void;
  removeSession: (sessionId: string) => void;
  updateSessionTask: (sessionId: string, task: string) => void;
  setLifecycle: (sessionId: string, lifecycle: SessionLifecycle, metadata?: { completedAt?: number; mergedTo?: string }) => void;
  focusSession: (sessionId: string) => void;
  setStatus: (sessionId: string, status: SessionState["status"]) => void;
  setExitCode: (sessionId: string, exitCode: number) => void;
  toggleGridMode: () => void;
  setGridMode: (mode: boolean) => void;
  fetchStartCommand: () => void;
  initRunTerminal: (sessionId: string) => void;
  disposeRunTerminal: (sessionId: string) => void;
  setRunStatus: (sessionId: string, status: SessionState["runStatus"], exitCode?: number) => void;
  clearAllSessions: () => void;
}

function createSessionStore() {
  return create<SessionStore>((set, get) => ({
  sessions: new Map(),
  activeSessionId: null,
  gridMode: false,
  startCommand: null,
  setupLogs: {},

  addSession: (session) => {
    const { sessions } = get();
    const existing = sessions.get(session.id);

    // Allow through if: session doesn't exist, or existing is a todo being replaced
    if (existing && existing.lifecycle !== "todo") return;

    // Find matching pending session — either by explicit pendingId or by task name
    let matchedPendingId: string | undefined = session.pendingId;
    if (!matchedPendingId) {
      const slugify = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "-");
      for (const [key, s] of sessions) {
        if (s.status === "pending" && slugify(s.task) === slugify(session.task)) {
          matchedPendingId = key;
          break;
        }
      }
    }
    const pending = matchedPendingId ? sessions.get(matchedPendingId) : undefined;

    // Todo sessions transitioning to another lifecycle don't need a terminal
    const isTodo = (session.lifecycle as SessionLifecycle) === "todo";

    let terminal: Terminal | null = null;
    let fitAddon: FitAddon | null = null;

    if (!isTodo) {
      terminal = new Terminal({
        theme: volleyTheme,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: "block",
        allowProposedApi: true,
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      try {
        terminal.loadAddon(new WebglAddon());
      } catch {
        // WebGL not available, software renderer is fine
      }

      terminal.onData((data: string) => {
        window.volley.pty.write(session.id, data);
      });
    }

    const newSession: SessionState = {
      id: session.id,
      slug: session.slug,
      branch: session.branch,
      baseBranch: session.baseBranch,
      task: session.task,
      worktreePath: session.worktreePath,
      startTime: pending?.startTime ?? Date.now(),
      status: isTodo ? "idle" : "running",
      lifecycle: (session.lifecycle as SessionLifecycle) || "in_progress",
      completedAt: session.completedAt ? new Date(session.completedAt).getTime() : undefined,
      mergedTo: session.mergedTo,
      exitCode: null,
      terminal,
      fitAddon,
      runTerminal: null,
      runFitAddon: null,
      runStatus: "idle",
      runExitCode: null,
    };

    // Build new map, replacing pending and/or todo entries at same position
    const next = new Map<string, SessionState>();
    for (const [key, value] of sessions) {
      if (key === matchedPendingId) {
        // Replace pending entry with new session
        next.set(session.id, newSession);
      } else if (key === session.id && existing?.lifecycle === "todo") {
        // Replace todo entry in-place with the new session
        next.set(session.id, newSession);
      } else {
        next.set(key, value);
      }
    }
    // If neither pending nor todo was replaced, append
    if (!pending && !existing) {
      next.set(session.id, newSession);
    }

    // Dispose pending terminal if it exists
    if (pending?.terminal) {
      pending.terminal.dispose();
    }

    // Clean up setup logs for matched pending session
    const updatedLogs = { ...get().setupLogs };
    if (matchedPendingId) {
      delete updatedLogs[matchedPendingId];
    }

    set({ sessions: next, activeSessionId: session.id, setupLogs: updatedLogs });
  },

  addPendingSession: (pendingId, task) => {
    const { sessions } = get();
    if (sessions.has(pendingId)) return;

    const pendingSession: SessionState = {
      id: pendingId,
      slug: task,
      branch: "",
      task,
      worktreePath: "",
      startTime: Date.now(),
      status: "pending",
      lifecycle: "in_progress",
      exitCode: null,
      terminal: null,
      fitAddon: null,
      runTerminal: null,
      runFitAddon: null,
      runStatus: "idle",
      runExitCode: null,
    };

    const next = new Map(sessions);
    next.set(pendingId, pendingSession);
    set({ sessions: next, activeSessionId: pendingId, setupLogs: { ...get().setupLogs, [pendingId]: "" } });
  },

  addTodoSession: ({ id, task }) => {
    const { sessions } = get();
    if (sessions.has(id)) return;

    const todoSession: SessionState = {
      id,
      slug: id,
      branch: "",
      task,
      worktreePath: "",
      startTime: Date.now(),
      status: "idle",
      lifecycle: "todo",
      exitCode: null,
      terminal: null,
      fitAddon: null,
      runTerminal: null,
      runFitAddon: null,
      runStatus: "idle",
      runExitCode: null,
    };

    const next = new Map(sessions);
    next.set(id, todoSession);
    set({ sessions: next });
  },

  writePendingOutput: (pendingId, data) => {
    const { sessions } = get();
    const session = sessions.get(pendingId);
    if (!session || session.status !== "pending") return;
    const { setupLogs } = get();
    set({ setupLogs: { ...setupLogs, [pendingId]: (setupLogs[pendingId] ?? "") + data } });
  },

  setPendingFailed: (pendingId, error) => {
    const { sessions, setupLogs } = get();
    const session = sessions.get(pendingId);
    if (!session) return;
    const next = new Map(sessions);
    next.set(pendingId, { ...session, status: "exited", exitCode: 1 });
    set({ sessions: next, setupLogs: { ...setupLogs, [pendingId]: (setupLogs[pendingId] ?? "") + `\n${error}\n` } });
  },

  removeSession: (sessionId) => {
    const { sessions, activeSessionId } = get();
    const session = sessions.get(sessionId);
    if (!session) return;

    session.terminal?.dispose();
    session.runTerminal?.dispose();
    const next = new Map(sessions);
    next.delete(sessionId);

    let nextActive = activeSessionId;
    if (activeSessionId === sessionId) {
      const remaining = Array.from(next.keys());
      nextActive = remaining.length > 0 ? remaining[remaining.length - 1] : null;
    }

    set({ sessions: next, activeSessionId: nextActive });
  },

  updateSessionTask: (sessionId, task) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;

    const next = new Map(sessions);
    next.set(sessionId, { ...session, task });
    set({ sessions: next });
  },

  setLifecycle: (sessionId, lifecycle, metadata) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;

    // Dispose terminals when completing
    if (lifecycle === "completed") {
      session.terminal?.dispose();
      session.runTerminal?.dispose();
    }

    const next = new Map(sessions);
    next.set(sessionId, {
      ...session,
      lifecycle,
      terminal: lifecycle === "completed" ? null : session.terminal,
      runTerminal: lifecycle === "completed" ? null : session.runTerminal,
      completedAt: metadata?.completedAt ?? session.completedAt,
      mergedTo: metadata?.mergedTo ?? session.mergedTo,
    });
    set({ sessions: next });
  },

  focusSession: (sessionId) => {
    const { sessions } = get();
    if (!sessions.has(sessionId)) return;
    set({ activeSessionId: sessionId });
  },

  setStatus: (sessionId, status) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;

    const next = new Map(sessions);
    next.set(sessionId, { ...session, status });
    set({ sessions: next });
  },

  setExitCode: (sessionId, exitCode) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;

    const next = new Map(sessions);
    next.set(sessionId, { ...session, exitCode });
    set({ sessions: next });
  },

  toggleGridMode: () => {
    set((state) => ({ gridMode: !state.gridMode }));
  },

  setGridMode: (mode) => {
    set({ gridMode: mode });
  },

  fetchStartCommand: () => {
    window.volley.config.getStartCommand().then(({ command }) => {
      set({ startCommand: command });
    });
  },

  initRunTerminal: (sessionId) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;

    // Dispose existing run terminal if any
    session.runTerminal?.dispose();

    const runTerminal = new Terminal({
      theme: volleyTheme,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
      fontSize: 12,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "block",
      allowProposedApi: true,
    });

    const runFitAddon = new FitAddon();
    runTerminal.loadAddon(runFitAddon);

    try {
      runTerminal.loadAddon(new WebglAddon());
    } catch {
      // WebGL not available
    }

    runTerminal.onData((data: string) => {
      window.volley.run.write(sessionId, data);
    });

    const next = new Map(sessions);
    next.set(sessionId, {
      ...session,
      runTerminal,
      runFitAddon,
      runStatus: "running",
      runExitCode: null,
    });
    set({ sessions: next });
  },

  disposeRunTerminal: (sessionId) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session || !session.runTerminal) return;

    window.volley.run.stop(sessionId);
    session.runTerminal.dispose();

    const next = new Map(sessions);
    next.set(sessionId, {
      ...session,
      runTerminal: null,
      runFitAddon: null,
      runStatus: "idle",
      runExitCode: null,
    });
    set({ sessions: next });
  },

  setRunStatus: (sessionId, status, exitCode) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;

    const next = new Map(sessions);
    next.set(sessionId, {
      ...session,
      runStatus: status,
      runExitCode: exitCode ?? session.runExitCode,
    });
    set({ sessions: next });
  },

  clearAllSessions: () => {
    for (const [, session] of get().sessions) {
      session.terminal?.dispose();
      session.runTerminal?.dispose();
    }
    set({ sessions: new Map(), activeSessionId: null, setupLogs: {} });
  },
}));
}

// Preserve store across Vite HMR
export const useSessionStore: ReturnType<typeof createSessionStore> =
  import.meta.hot?.data?.store ?? createSessionStore();

if (import.meta.hot) {
  import.meta.hot.data.store = useSessionStore;
  import.meta.hot.accept();
}
