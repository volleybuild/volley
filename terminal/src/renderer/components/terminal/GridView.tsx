import React, { useState } from "react";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";
import { useAgentStore } from "../../store/agent-store";
import { formatElapsed } from "../../utils/format";
import StatusDot from "../shared/StatusDot";
import SetupPane from "./SetupPane";
import GridAgentCell from "../grid/GridAgentCell";

const ICON_FILE_TREE_SM = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`;

export default function GridView() {
  const sessions = useSessionStore((s) => s.sessions);
  const focusSession = useSessionStore((s) => s.focusSession);
  const setGridMode = useSessionStore((s) => s.setGridMode);
  const setRightPaneView = useUiStore((s) => s.setRightPaneView);
  const setFileTreeBasePath = useUiStore((s) => s.setFileTreeBasePath);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const count = sessions.size;
  if (count === 0) return null;

  const cols = Math.ceil(Math.sqrt(count));
  const now = Date.now();

  // Get agent status for each session (for the status dot)
  const getAgentStatus = (sessionId: string) => {
    return useAgentStore.getState().status[sessionId] || "idle";
  };

  return (
    <div
      className="flex-1"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "1px",
        height: "100%",
      }}
    >
      {Array.from(sessions.entries()).map(([id, session]) => {
        const agentStatus = getAgentStatus(id);
        const isSelected = selectedId === id;

        return (
          <div
            key={id}
            className={`flex flex-col bg-vo-base overflow-hidden border ${
              isSelected ? "border-accent-bright/50" : "border-white/[0.06]"
            }`}
            onClick={() => setSelectedId(id)}
          >
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 flex-shrink-0 cursor-default select-none text-[10px] ${
                isSelected ? "bg-accent-bright/[0.04]" : "bg-vo-surface"
              }`}
              onDoubleClick={() => {
                setGridMode(false);
                focusSession(id);
              }}
            >
              <StatusDot
                status={session.status}
                agentStatus={agentStatus}
              />
              <span className="truncate text-gray-400">{session.slug}</span>
              <span className="flex-1" />
              {session.runStatus === "running" && (
                <button
                  className="flex items-center justify-center w-4 h-4 rounded-sm text-accent-bright bg-transparent border-none cursor-pointer flex-shrink-0 hover:text-accent hover:bg-accent/10"
                  title="View run output"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGridMode(false);
                    focusSession(id);
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
              )}
              <button
                className="flex items-center justify-center w-4 h-4 rounded-sm text-gray-600 bg-transparent border-none cursor-pointer flex-shrink-0 hover:text-accent-bright hover:bg-accent/10"
                title="Browse files"
                onClick={(e) => {
                  e.stopPropagation();
                  setGridMode(false);
                  focusSession(id);
                  setFileTreeBasePath(session.worktreePath);
                  setRightPaneView("files");
                }}
                dangerouslySetInnerHTML={{ __html: ICON_FILE_TREE_SM }}
              />
              <span className="tabular-nums text-[10px] text-gray-600">
                {formatElapsed(now - session.startTime)}
              </span>
            </div>
            {session.status === "pending" ? (
              <SetupPane
                sessionId={id}
                visible={true}
                className="flex-1 relative"
              />
            ) : (
              <GridAgentCell
                sessionId={id}
                isSelected={isSelected}
                onSelect={() => setSelectedId(id)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
