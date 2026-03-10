import React, { useEffect, useRef, useState } from "react";
import { useSessionStore } from "../../store/session-store";
import { useElapsedTick } from "../../hooks/use-elapsed-tick";
import { formatElapsed } from "../../utils/format";

interface Props {
  sessionId: string;
  visible: boolean;
  className?: string;
}

export default function SetupPane({ sessionId, visible, className = "" }: Props) {
  const session = useSessionStore((s) => s.sessions.get(sessionId));
  const setupLogs = useSessionStore((s) => s.setupLogs[sessionId] ?? "");
  const [showLogs, setShowLogs] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  useElapsedTick();

  const isFailed = session?.status === "exited" && session.exitCode !== 0;

  // Auto-scroll log area
  useEffect(() => {
    if (showLogs && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [setupLogs, showLogs]);

  if (!session) return null;

  const elapsed = formatElapsed(Date.now() - session.startTime);

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      style={{ display: visible ? "flex" : "none" }}
    >
      <div className="flex flex-col items-center gap-3 max-w-md w-full px-6">
        {/* Spinner or error icon */}
        {isFailed ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-bright animate-spin" style={{ animationDuration: "1.5s" }}>
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        )}

        {/* Task name + elapsed */}
        <div className="text-center">
          <p className={`text-[13px] font-medium ${isFailed ? "text-red-400" : "text-gray-300"}`}>
            {isFailed ? "Setup failed" : "Setting up"}{" "}
            <span className="text-accent-bright">{session.task}</span>
          </p>
          <p className="text-[11px] text-gray-600 tabular-nums mt-1">{elapsed}</p>
        </div>

        {/* Show/hide logs toggle */}
        <button
          className="text-[11px] text-gray-500 hover:text-gray-300 cursor-pointer bg-transparent border-none transition-colors"
          onClick={() => setShowLogs(!showLogs)}
        >
          {showLogs ? "Hide logs" : "Show logs"}
        </button>

        {/* Log output */}
        {showLogs && (
          <pre
            ref={logRef}
            className="w-full max-h-[300px] overflow-y-auto rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[11px] font-mono text-gray-500 leading-relaxed whitespace-pre-wrap break-all"
          >
            {setupLogs || "Waiting for output..."}
          </pre>
        )}
      </div>
    </div>
  );
}
