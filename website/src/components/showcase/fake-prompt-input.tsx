/**
 * Exact copy of the real TerminalPrompt markup.
 * Shows: hints row (/ skills, ⌘V paste image, ↵ send) + › input line
 */

interface FakePromptInputProps {
  isBusy?: boolean;
  className?: string;
}

export function FakePromptInput({
  isBusy = false,
  className = "",
}: FakePromptInputProps) {
  return (
    <div
      className={`flex-shrink-0 border-t border-white/[0.04] bg-vo-base ${className}`}
    >
      {/* Hints row */}
      <div className="px-4 pt-2 pb-1 min-h-[24px]">
        {isBusy ? (
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span className="inline-block w-1 h-1 rounded-full bg-accent-bright animate-pulse" />
            <span>Using tools...</span>
            <span className="text-gray-700">&middot;</span>
            <span className="text-red-400/70">stop</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-[10px] text-gray-600">
            <span>
              <kbd className="inline-block bg-white/[0.06] border border-[#2a3140] rounded px-1 py-px font-mono text-[11px] text-[#8b919e] leading-[18px]">
                /
              </kbd>{" "}
              skills
            </span>
            <span>
              <kbd className="inline-block bg-white/[0.06] border border-[#2a3140] rounded px-1 py-px font-mono text-[11px] text-[#8b919e] leading-[18px]">
                ⌘V
              </kbd>{" "}
              paste image
            </span>
            <span>
              <kbd className="inline-block bg-white/[0.06] border border-[#2a3140] rounded px-1 py-px font-mono text-[11px] text-[#8b919e] leading-[18px]">
                ↵
              </kbd>{" "}
              send
            </span>
          </div>
        )}
      </div>

      {/* Input line */}
      <div className="flex items-start gap-2 px-4 pt-1 pb-3">
        <span
          className={`text-[13px] font-mono select-none leading-[20px] flex-shrink-0 ${
            isBusy ? "text-gray-700" : "text-gray-500"
          }`}
        >
          &rsaquo;
        </span>
        <span className="flex-1 text-[13px] font-mono leading-[20px] text-gray-600">
          {isBusy ? "" : "Ask something, or type / for skills"}
        </span>
      </div>
    </div>
  );
}
