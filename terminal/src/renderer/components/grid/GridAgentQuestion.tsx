import React from "react";

interface Props {
  content: string;
}

/**
 * Highlighted question box for grid cells.
 * Shows when agent is waiting for user input.
 * - Amber border/background
 * - "Waiting for your reply" hint
 * - 2-line clamp on question text
 */
export default function GridAgentQuestion({ content }: Props) {
  return (
    <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded px-2 py-1.5 my-1">
      <div className="flex items-start gap-1.5">
        <span className="text-[10px] text-gray-500 flex-shrink-0 mt-px">⌁</span>
        <p className="text-[10px] text-gray-200 leading-relaxed line-clamp-2 flex-1">
          {content}
        </p>
      </div>
      <div className="flex items-center gap-1 mt-1.5 text-[9px] text-amber-500/70">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="flex-shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>Waiting for your reply</span>
      </div>
    </div>
  );
}
