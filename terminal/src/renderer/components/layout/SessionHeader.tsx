import React from "react";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";
import { useSessionStatus } from "../../hooks/use-session-status";
import StatusDot from "../shared/StatusDot";
import GitDropdown from "./GitDropdown";

const ICON_BRANCH = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M12 8v4m0 0l-6 6m6-6l6 6"/></svg>`;

const TB = "titlebar-no-drag flex items-center justify-center w-6 h-6 rounded bg-transparent border-none transition-colors duration-150 flex-shrink-0";
const TB_DEFAULT = `${TB} text-gray-600 hover:text-gray-400 hover:bg-white/[0.06] cursor-pointer`;
const TB_ACTIVE = `${TB} text-gray-200 bg-white/[0.08] hover:bg-white/[0.10] ring-1 ring-accent-bright/30 cursor-pointer`;
const TB_DANGER = `${TB} text-gray-600 hover:text-red-400 hover:bg-red-500/[0.12] cursor-pointer`;
const TB_DISABLED = `${TB} text-gray-700 cursor-default opacity-50`;

export default function SessionHeader() {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const addToast = useUiStore((s) => s.addToast);
  const openRemoveModal = useUiStore((s) => s.openRemoveModal);
  const rightPaneView = useUiStore((s) => s.rightPaneView);
  const setRightPaneView = useUiStore((s) => s.setRightPaneView);
  const setFileTreeBasePath = useUiStore((s) => s.setFileTreeBasePath);
  const startCommand = useSessionStore((s) => s.startCommand);
  const initRunTerminal = useSessionStore((s) => s.initRunTerminal);

  const { status: sessionStatus } = useSessionStatus(activeSessionId);

  if (!activeSessionId || sessions.size === 0) return null;

  const session = sessions.get(activeSessionId);
  if (!session) return null;

  const isPending = session.status === "pending";
  const isTodo = session.lifecycle === "todo";
  const baseBranch = sessionStatus?.sourceBranch || session.baseBranch || "main";

  const handleFileTree = () => {
    setFileTreeBasePath(session.worktreePath);
    setRightPaneView(rightPaneView === "files" ? null : "files");
  };

  const handleChanges = () => {
    setRightPaneView(rightPaneView === "changes" ? null : "changes");
  };

  const handleRun = async () => {
    // Stop any existing run process before starting a new one
    if (session.runStatus === "running") {
      window.volley.run.stop(activeSessionId);
    }
    initRunTerminal(activeSessionId);
    setRightPaneView("run");
    const result = await window.volley.run.start(activeSessionId);
    if (!result.ok) {
      addToast(result.error || "Failed to start", "error");
    }
  };

  const handleRemove = async () => {
    const [status, sessionStatus] = await Promise.all([
      window.volley.git.status(activeSessionId),
      window.volley.git.sessionStatus(activeSessionId),
    ]);
    openRemoveModal(activeSessionId, status.dirty, status.files.length, sessionStatus.unpushed);
  };

  if (isPending) {
    return (
      <div className="titlebar-drag flex items-center gap-2 px-3 pt-3 pb-1 flex-shrink-0 text-[11px] select-none bg-vo-base border-b border-white/[0.06]">
        <StatusDot status={session.status} className="w-[7px] h-[7px]" />
        <span className="text-gray-200 font-medium">{session.slug}</span>
        <span className="text-gray-500">Setting up...</span>
      </div>
    );
  }

  if (isTodo) {
    return (
      <div className="titlebar-drag flex items-center gap-2 px-3 pt-3 pb-1 flex-shrink-0 text-[11px] select-none bg-vo-base border-b border-white/[0.06]">
        {/* Hollow circle */}
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-500 flex-shrink-0">
          <circle cx="3.5" cy="3.5" r="2.5" />
        </svg>
        <span className="text-gray-200 font-medium truncate">{session.task}</span>
        <span className="flex-1" />
        <button
          className="titlebar-no-drag px-2 py-0.5 rounded text-[10px] font-medium bg-accent-bright/15 text-accent-bright hover:bg-accent-bright/25 transition-colors cursor-pointer border border-accent-bright/20"
          onClick={() => window.volley.session.startTodo(activeSessionId!)}
        >
          Start
        </button>
        <button
          className={TB_DANGER}
          title="Delete todo"
          onClick={() => window.volley.session.delete(activeSessionId!)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="titlebar-drag flex items-center gap-2 px-3 pt-3 pb-1 flex-shrink-0 text-[11px] select-none bg-vo-base border-b border-white/[0.06]">
      <StatusDot status={session.status} className="w-[7px] h-[7px]" />
      <span className="text-gray-200 font-medium">{session.slug}</span>
      <span className="text-gray-700 mx-0.5">·</span>
      <div className="flex items-center gap-1.5 text-gray-500">
        <span className="text-gray-400">{session.branch}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <span className="text-gray-500">{baseBranch}</span>
      </div>
      <span className="flex-1" />

      {/* Panel toggle buttons */}
      <button
        className={rightPaneView === "terminal" ? TB_ACTIVE : TB_DEFAULT}
        title="Terminal (⌘T)"
        onClick={() => setRightPaneView(rightPaneView === "terminal" ? null : "terminal")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      </button>
      <button
        className={rightPaneView === "files" ? TB_ACTIVE : TB_DEFAULT}
        title="File browser (⌘B)"
        onClick={handleFileTree}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      </button>
      <button
        className={rightPaneView === "changes" ? TB_ACTIVE : TB_DEFAULT}
        title="Changes (⌘⇧G)"
        onClick={handleChanges}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
      <button
        className={!startCommand ? TB_DISABLED : rightPaneView === "run" ? TB_ACTIVE : TB_DEFAULT}
        title={!startCommand ? "No start command configured — set one in Settings" : session.runStatus === "running" ? "Restart (⌘⇧R)" : "Run (⌘⇧R)"}
        onClick={startCommand ? handleRun : undefined}
      >
        {session.runStatus === "running" && startCommand ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>

      <span className="w-px h-3.5 bg-white/[0.08] flex-shrink-0" />

      {/* Git dropdown */}
      <GitDropdown sessionId={activeSessionId} />

      {/* Remove */}
      <button className={TB_DANGER} title="Remove session" onClick={handleRemove}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      </button>
    </div>
  );
}
