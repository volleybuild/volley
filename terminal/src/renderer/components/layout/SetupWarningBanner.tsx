import React from "react";
import { useSessionStore } from "../../store/session-store";

export default function SetupWarningBanner() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const session = useSessionStore((s) =>
    s.activeSessionId ? s.sessions.get(s.activeSessionId) : undefined,
  );
  const dismissSetupWarning = useSessionStore((s) => s.dismissSetupWarning);

  if (!session?.setupWarning || !activeSessionId) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/[0.08] border-b border-yellow-500/20 text-[11px] text-yellow-400/90 flex-shrink-0">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="flex-shrink-0"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span className="flex-1 truncate">
        {session.setupWarning}
        <span className="text-yellow-500/50 mx-1.5">&mdash;</span>
        <button
          className="text-yellow-400/70 hover:text-yellow-300 underline underline-offset-2 cursor-pointer"
          onClick={() => window.volley.config.openLogFile()}
        >
          Open logs
        </button>
      </span>
      <button
        className="text-yellow-500/50 hover:text-yellow-300 cursor-pointer p-0.5"
        onClick={() => dismissSetupWarning(activeSessionId)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
