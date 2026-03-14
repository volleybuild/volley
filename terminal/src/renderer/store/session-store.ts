import { create } from "zustand";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import type { SessionState, SessionLifecycle, TodoType } from "./types";
import { getTerminalTheme } from "../constants/themes";
import { useUiStore } from "./ui-store";
import { playSound } from "../services/sound-service";

interface SessionStore {
  sessions: Map<string, SessionState>;
  activeSessionId: string | null;
  gridMode: boolean;
  startCommand: string | null;
  setupLogs: Record<string, string>;
  todoFolders: FolderData[];
  addSession: (session: VolleySession & { pendingId?: string }) => void;
  addTodoSession: (session: { id: string; task: string; todoType?: TodoType; description?: string; sourceNoteId?: string | null; folderId?: string | null }) => void;
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
  setSetupWarning: (sessionId: string, warning: string) => void;
  dismissSetupWarning: (sessionId: string) => void;
  updateSessionDescription: (sessionId: string, description: string) => void;
  updateSessionTodoType: (sessionId: string, todoType: TodoType) => void;
  reorderSessions: (orderedIds: string[], lifecycle: SessionLifecycle) => void;
  pauseSession: (sessionId: string) => void;
  resumeSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  fetchTodoFolders: () => Promise<void>;
  createTodoFolder: (name: string) => Promise<FolderData | null>;
  renameTodoFolder: (id: string, name: string) => Promise<void>;
  deleteTodoFolder: (id: string) => Promise<void>;
  reorderTodoFolders: (orderedIds: string[]) => void;
  moveSessionToFolder: (sessionId: string, folderId: string | null) => Promise<void>;
  updateAllTerminalThemes: () => void;
}

function createSessionStore() {
  return create<SessionStore>((set, get) => ({
  sessions: new Map(),
  activeSessionId: null,
  gridMode: false,
  startCommand: null,
  setupLogs: {},
  todoFolders: [],

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
    const isPaused = !!(session as any).paused;

    let terminal: Terminal | null = null;
    let fitAddon: FitAddon | null = null;

    if (!isTodo && !isPaused) {
      terminal = new Terminal({
        theme: getTerminalTheme(useUiStore.getState().theme),
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
      status: isPaused ? "paused" : isTodo ? "idle" : "running",
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
      todoType: (session as any).todoType,
      description: (session as any).description,
      planStatus: (session as any).planStatus,
      planMarkdown: (session as any).planMarkdown,
      sourceNoteId: (session as any).sourceNoteId,
      folderId: (session as any).folderId,
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

  addTodoSession: ({ id, task, todoType, description, sourceNoteId, folderId }) => {
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
      todoType,
      description,
      sourceNoteId,
      folderId,
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
      theme: getTerminalTheme(useUiStore.getState().theme),
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

  setSetupWarning: (sessionId, warning) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;
    const next = new Map(sessions);
    next.set(sessionId, { ...session, setupWarning: warning });
    set({ sessions: next });
  },

  dismissSetupWarning: (sessionId) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;
    const next = new Map(sessions);
    next.set(sessionId, { ...session, setupWarning: undefined });
    set({ sessions: next });
  },

  updateSessionDescription: (sessionId, description) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;
    const next = new Map(sessions);
    next.set(sessionId, { ...session, description });
    set({ sessions: next });
  },

  updateSessionTodoType: (sessionId, todoType) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;
    const next = new Map(sessions);
    next.set(sessionId, { ...session, todoType });
    set({ sessions: next });
  },

  reorderSessions: (orderedIds, lifecycle) => {
    const { sessions } = get();
    const matching: SessionState[] = [];
    const rest: [string, SessionState][] = [];

    for (const [key, session] of sessions) {
      if (session.lifecycle === lifecycle) {
        matching.push(session);
      } else {
        rest.push([key, session]);
      }
    }

    const byId = new Map(matching.map(s => [s.id, s]));
    const ordered = orderedIds.map(id => byId.get(id)).filter(Boolean) as SessionState[];
    // Add any matching sessions not in orderedIds
    for (const s of matching) {
      if (!orderedIds.includes(s.id)) ordered.push(s);
    }

    const next = new Map<string, SessionState>();
    // Preserve order: non-matching first in original order, then reordered matching
    // Actually, we need to interleave by lifecycle position. Simpler: just rebuild by lifecycle order
    const allEntries: [string, SessionState][] = [...rest, ...ordered.map(s => [s.id, s] as [string, SessionState])];
    const lifecycleOrder: Record<string, number> = { todo: 0, in_progress: 1, completed: 2 };
    allEntries.sort((a, b) => {
      const la = lifecycleOrder[a[1].lifecycle] ?? 1;
      const lb = lifecycleOrder[b[1].lifecycle] ?? 1;
      return la - lb;
    });
    for (const [key, session] of allEntries) {
      next.set(key, session);
    }

    set({ sessions: next });
    window.volley.session.reorder(orderedIds, lifecycle);
  },

  pauseSession: (sessionId) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;

    // Dispose xterm terminal
    session.terminal?.dispose();
    session.runTerminal?.dispose();

    // Kill PTY in main process
    window.volley.pty.pause(sessionId);

    const next = new Map(sessions);
    next.set(sessionId, {
      ...session,
      status: "paused",
      terminal: null,
      fitAddon: null,
      runTerminal: null,
      runFitAddon: null,
      runStatus: "idle",
      runExitCode: null,
    });
    set({ sessions: next });
    playSound("sessionPaused");
  },

  resumeSession: (sessionId) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);
    if (!session) return;

    // Create new xterm terminal
    const terminal = new Terminal({
      theme: getTerminalTheme(useUiStore.getState().theme),
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
      fontSize: 12,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "block",
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    try {
      terminal.loadAddon(new WebglAddon());
    } catch {
      // WebGL not available
    }

    terminal.onData((data: string) => {
      window.volley.pty.write(sessionId, data);
    });

    // Spawn PTY in main process
    window.volley.pty.resume(sessionId);

    const next = new Map(sessions);
    next.set(sessionId, {
      ...session,
      status: "running",
      terminal,
      fitAddon,
    });
    set({ sessions: next });
    playSound("sessionStarted");
  },

  clearAllSessions: () => {
    for (const [, session] of get().sessions) {
      session.terminal?.dispose();
      session.runTerminal?.dispose();
    }
    set({ sessions: new Map(), activeSessionId: null, setupLogs: {}, todoFolders: [] });
  },

  fetchTodoFolders: async () => {
    const { folders } = await window.volley.session.foldersList();
    set({ todoFolders: folders ?? [] });
  },

  createTodoFolder: async (name: string) => {
    const result = await window.volley.session.folderCreate(name);
    if (result.ok && result.folder) {
      set((state) => ({ todoFolders: [result.folder!, ...state.todoFolders] }));
      return result.folder;
    }
    return null;
  },

  renameTodoFolder: async (id: string, name: string) => {
    const result = await window.volley.session.folderRename(id, name);
    if (result.ok) {
      set((state) => ({
        todoFolders: state.todoFolders.map((f) => (f.id === id ? { ...f, name } : f)),
      }));
    }
  },

  deleteTodoFolder: async (id: string) => {
    const result = await window.volley.session.folderDelete(id);
    if (result.ok) {
      set((state) => {
        const next = new Map(state.sessions);
        for (const [key, session] of next) {
          if (session.folderId === id) {
            next.set(key, { ...session, folderId: null });
          }
        }
        return {
          todoFolders: state.todoFolders.filter((f) => f.id !== id),
          sessions: next,
        };
      });
    }
  },

  reorderTodoFolders: (orderedIds: string[]) => {
    set((state) => {
      const byId = new Map(state.todoFolders.map((f) => [f.id, f]));
      const ordered = orderedIds
        .map((id, i) => {
          const f = byId.get(id);
          return f ? { ...f, order: i } : null;
        })
        .filter(Boolean) as FolderData[];
      for (const f of state.todoFolders) {
        if (!orderedIds.includes(f.id)) ordered.push(f);
      }
      return { todoFolders: ordered };
    });
    window.volley.session.folderReorder(orderedIds);
  },

  moveSessionToFolder: async (sessionId: string, folderId: string | null) => {
    const result = await window.volley.session.moveToFolder(sessionId, folderId);
    if (result.ok) {
      set((state) => {
        const next = new Map(state.sessions);
        const session = next.get(sessionId);
        if (session) {
          next.set(sessionId, { ...session, folderId });
        }
        return { sessions: next };
      });
    }
  },

  updateAllTerminalThemes: () => {
    const theme = getTerminalTheme(useUiStore.getState().theme);
    const sessions = get().sessions;
    for (const session of sessions.values()) {
      if (session.terminal) {
        session.terminal.options.theme = theme;
      }
      if (session.runTerminal) {
        session.runTerminal.options.theme = theme;
      }
    }
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
