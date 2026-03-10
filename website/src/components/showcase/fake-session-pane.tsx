"use client";

import type { FakeAgentMsg } from "@/lib/constants";
import { StatusDot } from "../ui/status-dot";
import { FakeAgentMessages, FakeGridCompactInput } from "./fake-agent-cell";

interface FakeSessionPaneProps {
  slug: string;
  status: "pending" | "running" | "idle" | "done";
  messages: FakeAgentMsg[];
  visibleMsgCount: number;
  isSelected?: boolean;
}

/**
 * Grid cell: compact header + GridAgentCell messages + GridCompactInput.
 * Matches the real GridView cell markup exactly.
 */
export function FakeSessionPane({
  slug,
  status,
  messages,
  visibleMsgCount,
  isSelected = false,
}: FakeSessionPaneProps) {
  const isBusy = status === "running" && visibleMsgCount < messages.length;

  return (
    <div
      className={`flex flex-col bg-vo-base overflow-hidden border ${
        isSelected ? "border-accent-bright/50" : "border-white/[0.06]"
      }`}
    >
      {/* Grid cell header — matches GridView.tsx */}
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 flex-shrink-0 select-none text-[10px] ${
          isSelected ? "bg-accent-bright/[0.04]" : "bg-vo-surface"
        }`}
      >
        <StatusDot status={status} />
        <span className="truncate text-gray-400">{slug}</span>
        <span className="flex-1" />
        {/* Folder icon */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-gray-600 flex-shrink-0"
        >
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
        <span className="tabular-nums text-[10px] text-gray-600 flex-shrink-0">
          {status === "running"
            ? "0:12"
            : status === "done"
              ? "2:34"
              : "--:--"}
        </span>
      </div>

      {/* Agent messages (compact/grid mode) */}
      <FakeAgentMessages
        messages={messages}
        visibleCount={visibleMsgCount}
        compact
      />

      {/* Grid compact input */}
      <FakeGridCompactInput isBusy={isBusy} />
    </div>
  );
}
