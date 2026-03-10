import { useEffect } from "react";
import { useSessionStore } from "../store/session-store";
import { useUiStore } from "../store/ui-store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const sessionStore = useSessionStore.getState();
      const uiStore = useUiStore.getState();

      // Cmd+N — new session
      if (meta && e.key === "n") {
        e.preventDefault();
        uiStore.openNewSessionModal();
        return;
      }

      // Cmd+B — toggle file browser
      if (meta && e.key === "b") {
        e.preventDefault();
        const active = sessionStore.activeSessionId
          ? sessionStore.sessions.get(sessionStore.activeSessionId)
          : null;
        if (active) {
          uiStore.setFileTreeBasePath(active.worktreePath);
        }
        uiStore.setRightPaneView(uiStore.rightPaneView === "files" ? null : "files");
        return;
      }

      // Cmd+G — toggle grid
      if (meta && e.key === "g") {
        e.preventDefault();
        sessionStore.toggleGridMode();
        return;
      }

      // Cmd+Shift+C — commit
      if (meta && e.shiftKey && e.key === "C") {
        e.preventDefault();
        handleCommit();
        return;
      }

      // Cmd+Shift+P — push + PR
      if (meta && e.shiftKey && e.key === "P") {
        e.preventDefault();
        handlePush();
        return;
      }

      // Cmd+Shift+G — toggle changes pane
      if (meta && e.shiftKey && e.key === "G") {
        e.preventDefault();
        const { rightPaneView, setRightPaneView } = useUiStore.getState();
        setRightPaneView(rightPaneView === "changes" ? null : "changes");
        return;
      }

      // Cmd+Shift+R — start/restart run process
      if (meta && e.shiftKey && e.key === "R") {
        e.preventDefault();
        handleRun();
        return;
      }

      // Cmd+W — close tab
      if (meta && e.key === "w") {
        e.preventDefault();
        if (sessionStore.activeSessionId) {
          window.volley.pty.kill(sessionStore.activeSessionId);
          sessionStore.removeSession(sessionStore.activeSessionId);
        }
        return;
      }

      // Cmd+1-9 — switch tab by index
      if (meta && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        const ids = Array.from(sessionStore.sessions.keys());
        if (idx < ids.length) {
          sessionStore.focusSession(ids[idx]);
        }
        return;
      }

      // Cmd+[ — prev tab
      if (meta && e.key === "[") {
        e.preventDefault();
        navigateTab(-1);
        return;
      }

      // Cmd+] — next tab
      if (meta && e.key === "]") {
        e.preventDefault();
        navigateTab(1);
        return;
      }

      // Escape — close file viewer
      if (e.key === "Escape") {
        if (uiStore.fileViewerOpen) {
          e.preventDefault();
          uiStore.closeFileViewer();
          return;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}

function navigateTab(direction: number) {
  const { sessions, activeSessionId, focusSession } = useSessionStore.getState();
  const ids = Array.from(sessions.keys());
  if (ids.length === 0) return;

  const currentIdx = activeSessionId ? ids.indexOf(activeSessionId) : -1;
  let nextIdx = currentIdx + direction;
  if (nextIdx < 0) nextIdx = ids.length - 1;
  if (nextIdx >= ids.length) nextIdx = 0;
  focusSession(ids[nextIdx]);
}

async function handleCommit() {
  const { activeSessionId } = useSessionStore.getState();
  const { addToast, openCommitModal } = useUiStore.getState();
  if (!activeSessionId) return;

  const status = await window.volley.git.status(activeSessionId);
  if (status.error) {
    addToast(status.error, "error");
    return;
  }
  if (!status.dirty) {
    addToast("Nothing to commit", "info");
    return;
  }
  openCommitModal(activeSessionId, status.files.length);
}

async function handlePush() {
  const { activeSessionId } = useSessionStore.getState();
  const { addToast, bumpGitAction, setRightPaneView } = useUiStore.getState();
  if (!activeSessionId) return;

  // If already pushed (no unpushed commits), open PR pane instead
  try {
    const status = await window.volley.git.sessionStatus(activeSessionId);
    if (status.unpushed === 0 && status.uncommitted === 0) {
      setRightPaneView("pr");
      return;
    }
  } catch { /* proceed with push */ }

  addToast("Pushing...", "info");
  const result = await window.volley.git.push(activeSessionId);
  if (result.ok) {
    bumpGitAction();
    setRightPaneView("pr");
    addToast("Pushed — create a PR", "success");
  } else {
    addToast(result.error || "Push failed", "error");
  }
}

async function handleRun() {
  const { activeSessionId, startCommand, initRunTerminal } = useSessionStore.getState();
  const { addToast, setRightPaneView } = useUiStore.getState();
  if (!activeSessionId || !startCommand) return;

  initRunTerminal(activeSessionId);
  setRightPaneView("run");
  const result = await window.volley.run.start(activeSessionId);
  if (!result.ok) {
    addToast(result.error || "Failed to start", "error");
  }
}
