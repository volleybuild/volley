"use client";

import { Badge } from "../ui/badge";
import { TypingText } from "./typing-text";

interface FakeCommitModalProps {
  visible: boolean;
  typingActive: boolean;
  committed: boolean;
}

const FILES = [
  { name: "src/middleware.ts", status: "A" as const },
  { name: "src/lib/auth.ts", status: "A" as const },
  { name: "src/app/layout.tsx", status: "M" as const },
  { name: "package.json", status: "M" as const },
];

const STATUS_COLORS = {
  A: "mint" as const,
  M: "amber" as const,
  D: "red" as const,
};

export function FakeCommitModal({
  visible,
  typingActive,
  committed,
}: FakeCommitModalProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 animate-modal-backdrop">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-[320px] rounded-xl overflow-hidden animate-modal-in"
        style={{
          background: "linear-gradient(180deg, #0f0f12 0%, #0a0a0c 100%)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06), 0 25px 50px -12px rgba(0,0,0,0.8), 0 0 60px -10px rgba(110,231,183,0.08)",
        }}
      >
        <div className="p-4">
          {/* Title */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-accent-bright"
              >
                <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-white/90">
              Commit changes
            </h2>
          </div>

          {/* Stat bar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.04] text-[10px]">
              <span className="text-gray-400">4 files</span>
              <span className="text-green-400">+127</span>
              <span className="text-red-400">-3</span>
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden flex">
              <div
                className="h-full bg-green-400/60"
                style={{ width: "97%" }}
              />
              <div
                className="h-full bg-red-400/60"
                style={{ width: "3%" }}
              />
            </div>
          </div>

          {/* File list */}
          <div className="mb-3 rounded-lg overflow-hidden border border-white/[0.06]">
            <div className="px-2.5 py-1 bg-white/[0.02] border-b border-white/[0.04]">
              <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">
                Changed files
              </span>
            </div>
            <div className="bg-[#0a0a0c]">
              {FILES.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-2 px-2.5 py-1 text-[11px]"
                >
                  <Badge color={STATUS_COLORS[file.status]}>
                    {file.status}
                  </Badge>
                  <span className="text-gray-400 truncate font-mono text-[10px]">
                    {file.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Commit message */}
          <div className="mb-3">
            <div className="w-full px-2.5 py-2 bg-[#0a0a0c] border border-white/[0.08] rounded-lg text-[11px] text-white/90 font-mono min-h-[36px]">
              <TypingText
                text="Add authentication middleware and auth helpers"
                active={typingActive}
                speed={30}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button className="px-3 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-colors">
              Cancel
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                committed
                  ? "text-[#0a0a0c] bg-gradient-to-b from-[#6ee7b7] to-[#34d399] shadow-[0_0_20px_-5px_rgba(110,231,183,0.4)]"
                  : "text-[#0a0a0c] bg-gradient-to-b from-[#6ee7b7]/60 to-[#34d399]/60"
              }`}
            >
              {committed ? "Committed!" : "Commit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
