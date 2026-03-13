import React, { useEffect, useState } from "react";
import type { SessionState } from "../../store/types";
import { useAgentStore } from "../../store/agent-store";
import { formatElapsed } from "../../utils/format";
import StatusDot from "../shared/StatusDot";
import IconButton from "../shared/IconButton";

const ICON_BRANCH = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M12 8v4m0 0l-6 6m6-6l6 6"/></svg>`;
const ICON_CHECK = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_PLAY = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

interface LineStat {
  files: number;
  insertions: number;
  deletions: number;
}

interface Props {
  session: SessionState;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRemove?: () => void;
  onCancelSetup?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  indented?: boolean;
}

export default function TabItem({ session, isActive, onClick, onDelete, onPause, onResume, onRemove, onCancelSetup, draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver, indented }: Props) {
  const now = Date.now();
  const [stat, setStat] = useState<LineStat | null>(null);
  const isPending = session.status === "pending";
  const isPaused = session.status === "paused";
  const isTodo = session.lifecycle === "todo";
  const isCompleted = session.lifecycle === "completed";
  const isInProgress = session.lifecycle === "in_progress" && !isPending;
  const agentStatus = useAgentStore((s) => s.status[session.id] || "idle");

  useEffect(() => {
    // Don't fetch stats for pending, paused, todo, or completed sessions
    if (isPending || isPaused || isTodo || isCompleted) return;
    let cancelled = false;
    const fetch = () => {
      window.volley.git.lineStat(session.id).then((d) => {
        if (!cancelled) setStat(d);
      });
    };
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [session.id, isPending, isPaused, isTodo, isCompleted]);

  const hasStats = stat && (stat.files > 0);

  const handleStartTodo = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.volley.session.startTodo(session.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div
      className={`group flex items-start gap-2 px-2.5 py-2 cursor-pointer hover:bg-white/[0.03] rounded text-[13px] titlebar-no-drag transition-colors duration-75 relative ${
        isActive ? "bg-white/[0.03]" : ""
      } ${isCompleted ? "opacity-60" : ""} ${isDragOver ? "border-t border-accent-bright/50" : "border-t border-transparent"} ${indented ? "pl-4" : ""}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {isActive && (
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r ${
          isCompleted ? "bg-green-500/50" : "bg-accent-bright"
        }`} />
      )}

      {/* Status indicator — for todos, the dot becomes an X on hover */}
      {isTodo ? (
        onDelete ? (
          <span className="w-5 h-5 flex-shrink-0 relative">
            <span className={`absolute inset-0 m-auto w-2 h-2 rounded-full group-hover:hidden ${
              session.todoType === "bug" ? "bg-red-400" :
              session.todoType === "improvement" ? "bg-blue-400" :
              "bg-accent-bright"
            }`} />
            <IconButton
              onClick={handleDelete}
              title="Delete todo"
              variant="danger"
              className="hidden group-hover:flex absolute inset-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </IconButton>
          </span>
        ) : (
          <span className={`mt-[5px] w-2 h-2 rounded-full flex-shrink-0 ${
            session.todoType === "bug" ? "bg-red-400" :
            session.todoType === "improvement" ? "bg-blue-400" :
            "bg-accent-bright"
          }`} />
        )
      ) : isCompleted ? (
        <span className="mt-[4px] w-[10px] h-[10px] rounded-full bg-green-500/30 flex-shrink-0 flex items-center justify-center text-green-400">
          <span dangerouslySetInnerHTML={{ __html: ICON_CHECK }} />
        </span>
      ) : isPaused ? (
        <span className="mt-[5px] w-2 h-2 rounded-full flex-shrink-0 bg-gray-500" />
      ) : !isPending && agentStatus !== "idle" ? (
        <span
          className={`mt-[5px] w-2 h-2 rounded-full flex-shrink-0 ${
            agentStatus === "thinking" ? "bg-accent-bright animate-pulse" :
            agentStatus === "coding" ? "bg-yellow-400 animate-pulse" :
            agentStatus === "waiting" ? "bg-accent-blue animate-pulse" :
            agentStatus === "done" ? "bg-green-400" :
            agentStatus === "error" ? "bg-red-400" :
            "bg-gray-500"
          }`}
        />
      ) : (
        <StatusDot status={session.status} className="mt-[5px]" />
      )}

      <div className="flex flex-col gap-0.5 overflow-hidden min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span
            className={`truncate font-medium leading-snug ${
              isCompleted ? "text-gray-500" : isActive ? "text-gray-100" : "text-gray-400"
            }`}
          >
            {isTodo ? session.task : session.slug}
          </span>

          {/* Right side badge/info */}
          {isTodo ? (
            <span className="flex items-center gap-0.5 flex-shrink-0">
              <button
                className="w-5 h-5 rounded text-accent hover:bg-accent/20 transition-colors flex items-center justify-center"
                onClick={handleStartTodo}
                title="Start session"
              >
                <span dangerouslySetInnerHTML={{ __html: ICON_PLAY }} />
              </button>
            </span>
          ) : isCompleted ? (
            <span className="flex items-center gap-1 flex-shrink-0 h-5">
              <span className="text-[11px] text-gray-600 group-hover:hidden">
                {session.completedAt ? formatElapsed(now - session.completedAt) : ""}
              </span>
              {onRemove && (
                <IconButton
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  title="Remove session"
                  variant="danger"
                  className="hidden group-hover:flex"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </IconButton>
              )}
            </span>
          ) : isPending ? (
            <span className="flex items-center gap-1 flex-shrink-0 h-5">
              <span className="text-[11px] text-gray-500 group-hover:hidden">
                Setting up...
              </span>
              {onCancelSetup && (
                <IconButton
                  onClick={(e) => { e.stopPropagation(); onCancelSetup(); }}
                  title="Cancel setup"
                  variant="danger"
                  className="hidden group-hover:flex"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </IconButton>
              )}
            </span>
          ) : isPaused ? (
            <span className="flex items-center gap-0.5 flex-shrink-0 h-5">
              <span className="text-[11px] text-gray-500 group-hover:hidden">Paused</span>
              {onResume && (
                <IconButton
                  onClick={(e) => { e.stopPropagation(); onResume(); }}
                  title="Resume session"
                  className="hidden group-hover:flex text-accent-bright"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </IconButton>
              )}
              {onRemove && (
                <IconButton
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  title="Remove session"
                  variant="danger"
                  className="hidden group-hover:flex"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </IconButton>
              )}
            </span>
          ) : isInProgress && session.exitCode === null ? (
            <span className="flex items-center gap-0.5 flex-shrink-0 h-5">
              <span className="tabular-nums text-[11px] text-gray-600 group-hover:hidden">
                {formatElapsed(now - session.startTime)}
              </span>
              {onPause && (
                <IconButton
                  onClick={(e) => { e.stopPropagation(); onPause(); }}
                  title="Pause session"
                  className="hidden group-hover:flex"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                  </svg>
                </IconButton>
              )}
              {onRemove && (
                <IconButton
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  title="Remove session"
                  variant="danger"
                  className="hidden group-hover:flex"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </IconButton>
              )}
            </span>
          ) : session.exitCode !== null ? (
            <span className="flex items-center gap-1 flex-shrink-0 h-5">
              <span className={`rounded-full px-1.5 text-[11px] leading-4 whitespace-nowrap group-hover:hidden ${
                session.exitCode === 0
                  ? "bg-green-500/15 text-green-400"
                  : "bg-red-500/15 text-red-400"
              }`}>
                exit {session.exitCode}
              </span>
              {onRemove && (
                <IconButton
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  title="Remove session"
                  variant="danger"
                  className="hidden group-hover:flex"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </IconButton>
              )}
            </span>
          ) : null}
        </div>

        {/* Branch info - only for in_progress sessions */}
        {!isPending && !isPaused && !isTodo && !isCompleted && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] text-accent-cyan/60 truncate">
              <span dangerouslySetInnerHTML={{ __html: ICON_BRANCH }} />
              {session.branch}
            </span>
            {agentStatus !== "idle" && (
              <span className={`inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 leading-[16px] flex-shrink-0 whitespace-nowrap ${
                agentStatus === "thinking" ? "text-accent-bright bg-accent-bright/10" :
                agentStatus === "coding" ? "text-yellow-400 bg-yellow-500/10" :
                agentStatus === "waiting" ? "text-accent-cyan bg-accent-cyan/10" :
                agentStatus === "done" ? "text-green-400 bg-green-500/10" :
                agentStatus === "error" ? "text-red-400 bg-red-500/10" :
                "text-gray-400 bg-white/5"
              }`}>
                {agentStatus !== "error" && agentStatus !== "done" && (
                  <span className={`w-1 h-1 rounded-full animate-pulse ${
                    agentStatus === "thinking" ? "bg-accent-bright" :
                    agentStatus === "coding" ? "bg-yellow-400" :
                    agentStatus === "waiting" ? "bg-accent-cyan" :
                    "bg-gray-400"
                  }`} />
                )}
                {agentStatus === "thinking" ? "Thinking..." :
                 agentStatus === "coding" ? "Using tools..." :
                 agentStatus === "waiting" ? "Waiting..." :
                 agentStatus === "done" ? "Done" :
                 agentStatus === "error" ? "Error" : agentStatus}
              </span>
            )}
          </div>
        )}

        {/* Merged to info for completed sessions */}
        {isCompleted && session.mergedTo && (
          <span className="text-[11px] text-gray-600">
            Merged to {session.mergedTo}
          </span>
        )}

        {/* Stats for in_progress sessions */}
        {!isPending && !isPaused && !isTodo && !isCompleted && hasStats && (
          <div className="flex items-center gap-1.5 text-[11px] tabular-nums mt-0.5 text-gray-500">
            <span>{stat!.files} {stat!.files === 1 ? "file" : "files"}</span>
            <span className="text-gray-700">·</span>
            <span className="text-green-400">+{stat!.insertions}</span>
            <span className="text-red-400">-{stat!.deletions}</span>
          </div>
        )}
      </div>
    </div>
  );
}
