import React, { useRef, useCallback } from "react";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";
import TerminalPane from "./TerminalPane";
import SetupPane from "./SetupPane";
import RunTerminalPane from "./RunTerminalPane";
import RightPaneTabBar from "./RightPaneTabBar";
import ChangesPane from "./ChangesPane";
import DiffViewerPane from "./DiffViewerPane";
import PrFormPane from "./PrFormPane";
import FileTreePanel from "../file-browser/FileTreePanel";
import AgentPane from "../agent/AgentPane";
import TodoPane from "./TodoPane";
import PausedPane from "./PausedPane";

export default function TabbedView() {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const rightPaneView = useUiStore((s) => s.rightPaneView);
  const rightPaneWidth = useUiStore((s) => s.rightPaneWidth);
  const setRightPaneWidth = useUiStore((s) => s.setRightPaneWidth);

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      setRightPaneWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [setRightPaneWidth]);

  return (
    <div ref={containerRef} className="flex-1 flex min-h-0 overflow-hidden">
      {/* Primary view: Agent pane */}
      <div className="flex-1 min-w-0 relative overflow-hidden">
        {Array.from(sessions.keys()).map((id) => {
          const session = sessions.get(id);
          const isPending = session?.status === "pending";
          const isPaused = session?.status === "paused";
          const isTodo = session?.lifecycle === "todo";

          if (isPending) {
            return (
              <SetupPane
                key={id}
                sessionId={id}
                visible={id === activeSessionId}
                className="absolute inset-0"
              />
            );
          }

          if (isPaused) {
            return (
              <PausedPane
                key={id}
                sessionId={id}
                visible={id === activeSessionId}
                className="absolute inset-0"
              />
            );
          }

          if (isTodo) {
            return (
              <TodoPane
                key={id}
                sessionId={id}
                visible={id === activeSessionId}
                className="absolute inset-0"
              />
            );
          }

          return (
            <AgentPane
              key={id}
              sessionId={id}
              visible={id === activeSessionId}
              className="absolute inset-0"
            />
          );
        })}
      </div>
      {rightPaneView !== null && activeSessionId && (
        <>
          {/* Resize handle */}
          <div
            className="w-px hover:w-1 flex-shrink-0 bg-white/[0.06] hover:bg-accent-bright/30 cursor-col-resize transition-all relative"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>
          <div
            style={{ width: rightPaneWidth }}
            className="flex-shrink-0 flex flex-col min-h-0 overflow-hidden"
          >
            <RightPaneTabBar />
            {rightPaneView === "files" && <FileTreePanel />}
            {rightPaneView === "terminal" && (
              <TerminalPane
                sessionId={activeSessionId}
                visible={true}
                className="flex-1 min-h-0"
              />
            )}
            {rightPaneView === "run" && (
              <RunTerminalPane
                sessionId={activeSessionId}
                className="flex-1 min-h-0"
              />
            )}
            {rightPaneView === "changes" && <ChangesPane />}
            {rightPaneView === "diff" && <DiffViewerPane />}
            {rightPaneView === "pr" && <PrFormPane />}
          </div>
        </>
      )}
    </div>
  );
}
