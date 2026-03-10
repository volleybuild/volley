import React from "react";
import { useUiStore } from "../../store/ui-store";
import { useSessionStore } from "../../store/session-store";

export default function RightPaneTabBar() {
  const rightPaneView = useUiStore((s) => s.rightPaneView);
  const setRightPaneView = useUiStore((s) => s.setRightPaneView);
  const diffFilePath = useUiStore((s) => s.diffFilePath);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null;
  const hasRunTerminal = activeSession?.runTerminal != null;

  const tabClass = (tab: string, active: boolean, enabled: boolean) =>
    `px-2 py-0.5 rounded text-[10px] transition-colors duration-150 ${
      !enabled
        ? "text-gray-700 cursor-default"
        : active
          ? "text-accent-bright bg-accent-muted"
          : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] cursor-pointer"
    }`;

  const handleTabClick = (tab: "files" | "run" | "changes" | "diff" | "pr" | "terminal") => {
    if (tab === "run" && !hasRunTerminal) return;
    if (tab === "diff" && !diffFilePath) return;
    // Toggle: clicking active tab closes the pane
    if (rightPaneView === tab) {
      setRightPaneView(null);
    } else {
      setRightPaneView(tab);
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-vo-surface flex-shrink-0 select-none border-b border-white/[0.06]">
      <button
        className={tabClass("terminal", rightPaneView === "terminal", true)}
        onClick={() => handleTabClick("terminal")}
      >
        Terminal
      </button>
      <button
        className={tabClass("files", rightPaneView === "files", true)}
        onClick={() => handleTabClick("files")}
      >
        Files
      </button>
      <button
        className={tabClass("changes", rightPaneView === "changes", true)}
        onClick={() => handleTabClick("changes")}
      >
        Changes
      </button>
      <button
        className={tabClass("run", rightPaneView === "run", hasRunTerminal)}
        onClick={() => handleTabClick("run")}
      >
        <span className="flex items-center gap-1">
          {hasRunTerminal && (
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
              activeSession!.runStatus === "running"
                ? "bg-accent-bright"
                : activeSession!.runStatus === "exited"
                  ? (activeSession!.runExitCode === 0 ? "bg-gray-500" : "bg-red-500")
                  : "bg-gray-600"
            }`} />
          )}
          Run
          {hasRunTerminal && activeSession!.runStatus === "exited" && (
            <span className="text-gray-600 text-[9px]">exit {activeSession!.runExitCode}</span>
          )}
        </span>
      </button>
      {diffFilePath && (
        <button
          className={tabClass("diff", rightPaneView === "diff", true)}
          onClick={() => handleTabClick("diff")}
        >
          Diff
        </button>
      )}
      {rightPaneView === "pr" && (
        <button
          className={tabClass("pr", true, true)}
          onClick={() => handleTabClick("pr")}
        >
          PR
        </button>
      )}
      <span className="flex-1" />
      <button
        className="text-gray-600 hover:text-gray-400 text-[10px] px-1 cursor-pointer"
        onClick={() => setRightPaneView(null)}
        title="Close pane"
      >
        ×
      </button>
    </div>
  );
}
