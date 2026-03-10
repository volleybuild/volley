"use client";

import { useEffect, useRef } from "react";
import type { FakeAgentMsg } from "@/lib/constants";

/* ── Tool icons (matches GridToolCall.tsx from the app) ────────── */
const TOOL_ICONS: Record<string, string> = {
  Read: "M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z",
  Edit: "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  Write:
    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  Bash: "M4 17l6-6-6-6M12 19h8",
  Glob: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  Grep: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
};

/* ── Agent messages (no input, used by both grid cells and full view) ── */

interface FakeAgentMessagesProps {
  messages: FakeAgentMsg[];
  visibleCount: number;
  /** Padding: grid cells use compact, full view uses larger */
  compact?: boolean;
  className?: string;
}

export function FakeAgentMessages({
  messages,
  visibleCount,
  compact = false,
  className = "",
}: FakeAgentMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visible = messages.slice(0, visibleCount);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  const px = compact ? "px-2.5 py-2" : "px-4 py-3";
  const spacing = compact ? "space-y-1.5" : "space-y-3";

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto ${px} ${spacing} min-h-0 ${className}`}
    >
      {visible.length === 0 && (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center text-gray-600 space-y-2">
            <svg
              width={compact ? "18" : "32"}
              height={compact ? "18" : "32"}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto text-gray-700"
            >
              <path d="M12 2a10 10 0 0110 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            {compact ? (
              <p className="text-[9px]">Ready for input</p>
            ) : (
              <>
                <p className="text-[12px]">
                  Ask the agent to help with this session
                </p>
                <p className="text-[10px] text-gray-700">
                  It can read, edit, and run commands in the worktree
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {visible.map((msg, i) =>
        compact ? (
          <GridMessage key={i} msg={msg} />
        ) : (
          <FullMessage key={i} msg={msg} />
        ),
      )}
    </div>
  );
}

/* ── Grid compact input (matches GridCompactInput.tsx) ──────────── */

interface FakeGridCompactInputProps {
  isBusy?: boolean;
}

export function FakeGridCompactInput({ isBusy = false }: FakeGridCompactInputProps) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-vo-surface border-t border-white/[0.04] text-[10px]">
      <span className="text-gray-600">&rsaquo;</span>
      {isBusy ? (
        <>
          <span className="text-gray-500 flex-1">Working...</span>
          <span className="text-red-400/70 text-[9px]">stop</span>
        </>
      ) : (
        <span className="text-gray-600 flex-1">Ask something...</span>
      )}
    </div>
  );
}

/* ── Grid message (compact, matches GridAgentCell GridMessage) ─── */

function GridMessage({ msg }: { msg: FakeAgentMsg }) {
  if (msg.type === "user") {
    return (
      <div className="flex items-start gap-1.5">
        <span className="text-[10px] text-gray-500 flex-shrink-0">
          &rsaquo;
        </span>
        <span className="text-[10px] text-gray-200 truncate flex-1">
          {msg.content}
        </span>
      </div>
    );
  }

  if (msg.type === "text") {
    return (
      <div className="flex items-start gap-1.5">
        <span className="text-[9px] text-gray-600 flex-shrink-0 mt-px">
          ⌁
        </span>
        <span className="text-[10px] text-gray-400 line-clamp-2 flex-1">
          {msg.content}
        </span>
      </div>
    );
  }

  if (msg.type === "tool") {
    return <ToolCallRow msg={msg} compact />;
  }

  if (msg.type === "done") {
    return <DoneDivider msg={msg} />;
  }

  return null;
}

/* ── Full-size message (matches AgentPane MessageBlock) ────────── */

function FullMessage({ msg }: { msg: FakeAgentMsg }) {
  if (msg.type === "user") {
    return (
      <div className="flex items-start gap-2">
        <span className="text-[13px] text-gray-500 select-none flex-shrink-0 leading-relaxed">
          &rsaquo;
        </span>
        <div className="text-[13px] font-mono leading-relaxed text-gray-200 whitespace-pre-wrap break-words flex-1">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === "text") {
    return (
      <div className="flex items-start gap-2 pl-0.5">
        <span className="text-[11px] text-gray-600 select-none flex-shrink-0 leading-relaxed mt-px font-mono">
          ⌁
        </span>
        <div className="text-[13px] font-mono leading-relaxed text-gray-400 whitespace-pre-wrap break-words flex-1">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === "tool") {
    return <ToolCallRow msg={msg} />;
  }

  if (msg.type === "done") {
    return <DoneDivider msg={msg} />;
  }

  return null;
}

/* ── Shared sub-components ─────────────────────────────────────── */

function ToolCallRow({
  msg,
  compact = false,
}: {
  msg: Extract<FakeAgentMsg, { type: "tool" }>;
  compact?: boolean;
}) {
  const iconPath = TOOL_ICONS[msg.name] || TOOL_ICONS.Bash;
  const iconSize = compact ? "11" : "13";
  const textSize = compact ? "text-[10px]" : "text-[11px]";

  if (compact) {
    // Grid-style single-line tool call (matches GridToolCall)
    return (
      <div className="flex items-center gap-1.5 text-[10px] py-0.5">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-600 flex-shrink-0"
        >
          <path d={iconPath} />
        </svg>
        <span className="text-gray-400 font-medium flex-shrink-0">
          {msg.name}
        </span>
        <span className="text-gray-600 font-mono truncate flex-1 min-w-0">
          {msg.summary}
        </span>
        {msg.done ? (
          <span className="text-accent-dim flex-shrink-0">✓</span>
        ) : (
          <span className="text-accent-bright flex-shrink-0 grid-tool-running">
            ⟳
          </span>
        )}
      </div>
    );
  }

  // Full-size tool call block (matches ToolCallBlock)
  return (
    <div className="rounded border border-white/[0.06] bg-vo-surface overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 text-left">
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className="text-gray-600"
          fill="currentColor"
        >
          <path d="M2 1l4 3-4 3V1z" />
        </svg>
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-500 flex-shrink-0"
        >
          <path d={iconPath} />
        </svg>
        <span className={`${textSize} font-medium text-gray-400`}>
          {msg.name}
        </span>
        <span className={`${textSize} text-gray-600 font-mono truncate`}>
          {msg.summary}
        </span>
        {msg.done && (
          <span className="ml-auto text-[9px] text-gray-500 flex-shrink-0">
            done
          </span>
        )}
      </div>
    </div>
  );
}

function DoneDivider({
  msg,
}: {
  msg: Extract<FakeAgentMsg, { type: "done" }>;
}) {
  return (
    <div className="flex items-center gap-2 text-[9px] text-gray-600 py-1 mt-auto">
      <span className="h-px flex-1 bg-white/[0.04]" />
      <span>
        Done &middot; {msg.cost} &middot; {msg.duration}
      </span>
      <span className="h-px flex-1 bg-white/[0.04]" />
    </div>
  );
}
