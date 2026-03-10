import React, { useEffect, useState } from "react";
import type { SessionState } from "../../store/types";
import { useAgentStore } from "../../store/agent-store";
import { formatElapsed } from "../../utils/format";
import StatusDot from "../shared/StatusDot";

const ICON_BRANCH = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M12 8v4m0 0l-6 6m6-6l6 6"/></svg>`;
const ICON_CHECK = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_PLAY = `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

interface LineStat {
  files: number;
  insertions: number;
  deletions: number;
}

interface Props {
  session: SessionState;
  isActive: boolean;
  onClick: () => void;
}

export default function TabItem({ session, isActive, onClick }: Props) {
  const now = Date.now();
  const [stat, setStat] = useState<LineStat | null>(null);
  const isPending = session.status === "pending";
  const isTodo = session.lifecycle === "todo";
  const isCompleted = session.lifecycle === "completed";
  const agentStatus = useAgentStore((s) => s.status[session.id] || "idle");

  useEffect(() => {
    // Don't fetch stats for pending, todo, or completed sessions
    if (isPending || isTodo || isCompleted) return;
    let cancelled = false;
    const fetch = () => {
      window.volley.git.lineStat(session.id).then((d) => {
        if (!cancelled) setStat(d);
      });
    };
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [session.id, isPending, isTodo, isCompleted]);

  const hasStats = stat && (stat.files > 0);

  const handleStartTodo = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.volley.session.startTodo(session.id);
  };

  return (
    <div
      className={`flex items-start gap-2 px-2.5 py-2 cursor-pointer hover:bg-white/[0.03] rounded text-xs titlebar-no-drag transition-colors duration-75 relative ${
        isActive ? "bg-white/[0.03]" : ""
      } ${isCompleted ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      {isActive && (
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r ${
          isCompleted ? "bg-green-500/50" : "bg-accent-bright"
        }`} />
      )}

      {/* Status indicator */}
      {isTodo ? (
        <span className="mt-[5px] w-[7px] h-[7px] rounded-full border border-gray-500 flex-shrink-0" />
      ) : isCompleted ? (
        <span className="mt-[4px] w-[9px] h-[9px] rounded-full bg-green-500/30 flex-shrink-0 flex items-center justify-center text-green-400">
          <span dangerouslySetInnerHTML={{ __html: ICON_CHECK }} />
        </span>
      ) : !isPending && agentStatus !== "idle" ? (
        <span
          className={`mt-[5px] w-[7px] h-[7px] rounded-full flex-shrink-0 ${
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
            <button
              className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center gap-1"
              onClick={handleStartTodo}
              title="Start session"
            >
              <span dangerouslySetInnerHTML={{ __html: ICON_PLAY }} />
              Start
            </button>
          ) : isCompleted ? (
            <span className="text-[10px] text-gray-600 flex-shrink-0">
              {session.completedAt ? formatElapsed(now - session.completedAt) : ""}
            </span>
          ) : isPending ? (
            <span className="text-[10px] text-gray-500 flex-shrink-0">
              Setting up...
            </span>
          ) : session.exitCode !== null ? (
            <span className={`flex-shrink-0 rounded-full px-1.5 text-[10px] leading-4 whitespace-nowrap ${
              session.exitCode === 0
                ? "bg-green-500/15 text-green-400"
                : "bg-red-500/15 text-red-400"
            }`}>
              exit {session.exitCode}
            </span>
          ) : (
            <span className="tabular-nums text-[10px] text-gray-600 flex-shrink-0">
              {formatElapsed(now - session.startTime)}
            </span>
          )}
        </div>

        {/* Branch info - only for in_progress sessions */}
        {!isPending && !isTodo && !isCompleted && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] text-accent-cyan/60 truncate">
              <span dangerouslySetInnerHTML={{ __html: ICON_BRANCH }} />
              {session.branch}
            </span>
            {agentStatus !== "idle" && (
              <span className={`inline-flex items-center gap-1 text-[9px] rounded-full px-1.5 leading-[16px] flex-shrink-0 whitespace-nowrap ${
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
          <span className="text-[10px] text-gray-600">
            Merged to {session.mergedTo}
          </span>
        )}

        {/* Stats for in_progress sessions */}
        {!isPending && !isTodo && !isCompleted && hasStats && (
          <div className="flex items-center gap-1.5 text-[10px] tabular-nums mt-0.5 text-gray-500">
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
