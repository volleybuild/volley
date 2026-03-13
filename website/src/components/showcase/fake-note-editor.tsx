"use client";

import { SHOWCASE_SESSIONS } from "@/lib/constants";

interface FakeNoteEditorProps {
  visibleLines: number;
  generateVisible: boolean;
  generateActive: boolean;
}

export function FakeNoteEditor({
  visibleLines,
  generateVisible,
  generateActive,
}: FakeNoteEditorProps) {
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
          className="text-accent-dim flex-shrink-0"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span className="text-[13px] font-medium text-gray-200">
          Sprint planning
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 sm:px-10 py-6 sm:py-8 overflow-hidden">
        <p className="text-[11px] sm:text-[12px] text-gray-500 mb-3 sm:mb-4">
          Ship these items this sprint:
        </p>

        <div className="space-y-2 sm:space-y-2.5">
          {SHOWCASE_SESSIONS.map((s, i) => (
            <div
              key={s.slug}
              className={`flex items-start gap-2 text-[11px] sm:text-[12px] transition-all duration-300 ${
                i < visibleLines
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-1.5"
              }`}
            >
              <span className="text-accent-dim/60 mt-[1px] flex-shrink-0">
                •
              </span>
              <span className="text-gray-300">{s.name}</span>
            </div>
          ))}
        </div>

        {/* Typing cursor — visible while lines are appearing */}
        {visibleLines > 0 && !generateVisible && (
          <div className="mt-2 ml-1">
            <span className="inline-block w-[5px] h-[13px] bg-accent-bright/70 animate-cursor-blink" />
          </div>
        )}

        {/* Generate todos button */}
        <div
          className={`mt-6 sm:mt-8 flex justify-center transition-all duration-300 ${
            generateVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <div
            className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] font-medium cursor-default transition-all duration-500 ${
              generateActive
                ? "bg-accent/15 text-accent-bright border border-accent/25 shadow-[0_0_24px_-6px_rgba(110,231,183,0.5)]"
                : "bg-white/[0.04] text-gray-500 border border-white/[0.06]"
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={generateActive ? "text-accent-bright" : ""}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Generate todos
          </div>
        </div>
      </div>
    </div>
  );
}
