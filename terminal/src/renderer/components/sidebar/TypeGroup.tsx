import React from "react";
import type { TodoType } from "../../store/types";

const TYPE_LABELS: Record<TodoType, string> = {
  bug: "Bug",
  feature: "Feature",
  improvement: "Improvement",
};

const TYPE_COLORS: Record<TodoType, string> = {
  bug: "bg-red-400",
  feature: "bg-accent-bright",
  improvement: "bg-blue-400",
};

interface Props {
  type: TodoType;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function TypeGroup({ type, count, expanded, onToggle, children }: Props) {
  return (
    <div className="mb-0.5">
      <div
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] cursor-pointer hover:bg-white/[0.03] rounded transition-colors"
        onClick={onToggle}
      >
        {/* Chevron */}
        <span className="flex-shrink-0 opacity-50">
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>

        {/* Colored dot */}
        <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${TYPE_COLORS[type]}`} />

        {/* Label */}
        <span className="flex-1 text-gray-400 font-medium uppercase tracking-wider">
          {TYPE_LABELS[type]}
        </span>

        {/* Count */}
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-500">
          {count}
        </span>
      </div>

      {expanded && (
        <div className="pl-3 space-y-0.5 mt-0.5">{children}</div>
      )}
    </div>
  );
}
