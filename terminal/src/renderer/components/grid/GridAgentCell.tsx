import React, { useEffect, useRef } from "react";
import { useAgentStore } from "../../store/agent-store";
import { parseSDKMessage } from "../../hooks/use-agent-listeners";
import type { AgentMessage } from "../../types/agent";
import GridToolCall from "./GridToolCall";
import GridCompactInput from "./GridCompactInput";
import GridAgentQuestion from "./GridAgentQuestion";

const EMPTY_MESSAGES: AgentMessage[] = [];
const MAX_VISIBLE_MESSAGES = 6;

interface Props {
  sessionId: string;
  isSelected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

/**
 * Compact agent conversation cell for grid view.
 * Shows last N messages with truncation, inline tool calls,
 * and a compact input for quick replies.
 */
export default function GridAgentCell({
  sessionId,
  isSelected = false,
  onSelect,
  disabled = false,
}: Props) {
  const messages = useAgentStore((s) => s.messages[sessionId] || EMPTY_MESSAGES);
  const status = useAgentStore((s) => s.status[sessionId] || "idle");
  const historyLoaded = useAgentStore((s) => !!s.historyLoaded[sessionId]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    if (historyLoaded) return;
    useAgentStore.getState().markHistoryLoaded(sessionId);
    window.volley.agent.history(sessionId).then((history) => {
      if (history && history.length > 0) {
        const parsed: AgentMessage[] = [];
        for (const raw of history) {
          if (raw._type === "user-prompt") {
            parsed.push({ type: "user", content: raw.content, images: raw.images });
            continue;
          }
          parsed.push(...parseSDKMessage(raw));
        }
        useAgentStore.getState().loadHistory(sessionId, parsed);
      }
    }).catch(() => {});
  }, [sessionId, historyLoaded]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Build tool results map
  const toolResults = new Map<string, string>();
  for (const msg of messages) {
    if (msg.type === "tool_result") {
      toolResults.set(msg.id, msg.content);
    }
  }

  // Filter to displayable messages and take last N
  const displayMessages = messages.filter(
    (m) => m.type === "user" || m.type === "text" || m.type === "tool_use" || m.type === "done"
  );
  const hiddenCount = Math.max(0, displayMessages.length - MAX_VISIBLE_MESSAGES);
  const visibleMessages = displayMessages.slice(-MAX_VISIBLE_MESSAGES);

  // Check if agent is asking a question (last text message ends with ?)
  const lastTextMsg = [...messages].reverse().find((m) => m.type === "text");
  const isAskingQuestion =
    status === "idle" &&
    lastTextMsg?.type === "text" &&
    lastTextMsg.content.trim().endsWith("?");

  const handleCellClick = () => {
    onSelect?.();
  };

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      onClick={handleCellClick}
    >
      {/* Message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 min-h-0"
      >
        {/* Empty state */}
        {messages.length === 0 && status === "idle" && (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center text-gray-600">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto mb-1.5 opacity-50"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
              <p className="text-[9px]">Ready for input</p>
            </div>
          </div>
        )}

        {/* Hidden messages indicator */}
        {hiddenCount > 0 && (
          <div className="text-[9px] text-gray-600 text-center py-1">
            ↑ {hiddenCount} more
          </div>
        )}

        {/* Messages */}
        {visibleMessages.map((msg, i) => (
          <GridMessage
            key={i}
            msg={msg}
            toolResult={msg.type === "tool_use" ? toolResults.get(msg.id) : undefined}
            isQuestion={
              isAskingQuestion &&
              msg.type === "text" &&
              msg === lastTextMsg
            }
          />
        ))}
      </div>

      {/* Compact input */}
      <GridCompactInput
        sessionId={sessionId}
        disabled={disabled}
        onFocus={onSelect}
      />
    </div>
  );
}

interface GridMessageProps {
  msg: AgentMessage;
  toolResult?: string;
  isQuestion?: boolean;
}

function GridMessage({ msg, toolResult, isQuestion }: GridMessageProps) {
  if (msg.type === "user") {
    return (
      <div className="flex items-start gap-1.5">
        <span className="text-[10px] text-gray-500 flex-shrink-0">›</span>
        <span className="text-[10px] text-gray-200 truncate flex-1">
          {msg.content}
        </span>
      </div>
    );
  }

  if (msg.type === "text") {
    // If this is a question, show highlighted box
    if (isQuestion) {
      return <GridAgentQuestion content={msg.content} />;
    }

    return (
      <div className="flex items-start gap-1.5">
        <span className="text-[9px] text-gray-600 flex-shrink-0 mt-px">⌁</span>
        <span className="text-[10px] text-gray-400 line-clamp-2 flex-1">
          {msg.content}
        </span>
      </div>
    );
  }

  if (msg.type === "tool_use") {
    return (
      <GridToolCall
        name={msg.name}
        input={msg.input}
        isDone={toolResult !== undefined}
      />
    );
  }

  if (msg.type === "done") {
    return (
      <div className="flex items-center gap-2 text-[9px] text-gray-600 py-1 mt-auto">
        <span className="h-px flex-1 bg-white/[0.04]" />
        <span>
          Done
          {msg.costUsd != null && ` · $${msg.costUsd.toFixed(3)}`}
          {msg.durationMs != null && ` · ${(msg.durationMs / 1000).toFixed(0)}s`}
        </span>
        <span className="h-px flex-1 bg-white/[0.04]" />
      </div>
    );
  }

  return null;
}
