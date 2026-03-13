"use client";

import { SHOWCASE_SESSIONS } from "@/lib/constants";

interface FakeTodoPlanProps {
  /** How many items are visible (0–4, for staggered appearance) */
  visibleItems: number;
  /** Index of the item being started (highlighted before launch) */
  startingIndex: number | null;
}

export function FakeTodoPlan({
  visibleItems,
  startingIndex,
}: FakeTodoPlanProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 h-9 border-b border-white/[0.06] flex-shrink-0">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-500 flex-shrink-0"
        >
          <path d="M12 2a10 10 0 1 0 10 10" />
          <path d="M12 2v10l7-4" />
        </svg>
        <span className="text-[13px] font-medium text-gray-200">Todo</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-500">
          {visibleItems}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 sm:px-6 py-4 sm:py-5 space-y-2 overflow-hidden">
        {SHOWCASE_SESSIONS.map((s, i) => {
          const isStarting = startingIndex === i;
          return (
            <div
              key={s.slug}
              className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border transition-all duration-300 ${
                i < visibleItems
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-1.5"
              } ${
                isStarting
                  ? "bg-accent/10 border-accent/25 shadow-[0_0_16px_-4px_rgba(110,231,183,0.4)]"
                  : "bg-white/[0.02] border-white/[0.06]"
              }`}
            >
              {/* Hollow circle */}
              <span
                className={`w-[10px] h-[10px] rounded-full border-[1.5px] flex-shrink-0 transition-colors duration-300 ${
                  isStarting
                    ? "border-accent-bright bg-accent-bright/20"
                    : "border-gray-600"
                }`}
              />

              {/* Name + branch */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[12px] sm:text-[13px] font-medium truncate transition-colors duration-300 ${
                    isStarting ? "text-accent-bright" : "text-gray-300"
                  }`}
                >
                  {s.name}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-accent-cyan/40 flex-shrink-0"
                  >
                    <circle cx="12" cy="6" r="2" />
                    <circle cx="6" cy="18" r="2" />
                    <circle cx="18" cy="18" r="2" />
                    <path d="M12 8v4m0 0l-6 6m6-6l6 6" />
                  </svg>
                  <span className="text-[10px] text-accent-cyan/40">
                    {s.branch}
                  </span>
                </div>
              </div>

              {/* Start button */}
              <div
                className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all duration-300 ${
                  isStarting
                    ? "bg-accent/20 text-accent-bright"
                    : "bg-white/[0.04] text-gray-500"
                }`}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Start
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
