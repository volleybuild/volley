import React from "react";
import { useSessionStore } from "../../store/session-store";

interface Props {
  sessionId: string;
  visible: boolean;
  className?: string;
}

export default function PausedPane({ sessionId, visible, className = "" }: Props) {
  const session = useSessionStore((s) => s.sessions.get(sessionId));
  const resumeSession = useSessionStore((s) => s.resumeSession);

  if (!session) return null;

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      style={{ display: visible ? "flex" : "none" }}
    >
      <div className="flex flex-col items-center gap-4 max-w-md w-full px-6">
        {/* Pause icon */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <circle cx="12" cy="12" r="10" />
          <line x1="10" y1="15" x2="10" y2="9" />
          <line x1="14" y1="15" x2="14" y2="9" />
        </svg>

        <div className="text-center">
          <p className="text-[13px] font-medium text-gray-400">
            Session paused
          </p>
          <p className="text-[12px] text-accent-bright mt-1 truncate max-w-xs">
            {session.task}
          </p>
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-gray-200 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] transition-colors cursor-pointer"
          onClick={() => resumeSession(sessionId)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-accent-bright">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Resume
        </button>

        <p className="text-[11px] text-gray-600 text-center max-w-xs">
          The terminal process was paused to save resources. Resume to reconnect.
        </p>
      </div>
    </div>
  );
}
