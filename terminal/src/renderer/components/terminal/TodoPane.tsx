import React from "react";
import { useSessionStore } from "../../store/session-store";

interface Props {
  sessionId: string;
  visible: boolean;
  className?: string;
}

export default function TodoPane({ sessionId, visible, className = "" }: Props) {
  const session = useSessionStore((s) => s.sessions.get(sessionId));

  if (!session) return null;

  const handleStart = () => {
    window.volley.session.startTodo(sessionId);
  };

  const handleDelete = async () => {
    await window.volley.session.delete(sessionId);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      style={{ display: visible ? "flex" : "none" }}
    >
      <div className="flex flex-col items-center gap-4 max-w-md w-full px-6">
        {/* Hollow circle icon */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <circle cx="12" cy="12" r="9" />
        </svg>

        {/* Task description */}
        <p className="text-[14px] text-gray-300 font-medium text-center">
          {session.task}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleStart}
            className="px-4 py-1.5 rounded-md bg-accent-bright/15 text-accent-bright text-[12px] font-medium hover:bg-accent-bright/25 transition-colors cursor-pointer border border-accent-bright/20"
          >
            Start
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-1.5 rounded-md bg-white/[0.04] text-gray-500 text-[12px] font-medium hover:text-red-400 hover:bg-red-500/[0.08] transition-colors cursor-pointer border border-white/[0.06]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
