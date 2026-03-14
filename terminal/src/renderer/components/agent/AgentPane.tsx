import React, { useEffect, useRef, useState } from "react";
import { useAgentStore } from "../../store/agent-store";
import { useUiStore } from "../../store/ui-store";
import ToolCallBlock from "./ToolCallBlock";
import TerminalPrompt from "./TerminalPrompt";
import DiffStatFooter from "./DiffStatFooter";
import type { AgentMessage } from "../../types/agent";
import { parseSDKMessage } from "../../hooks/use-agent-listeners";

const EMPTY_MESSAGES: AgentMessage[] = [];

interface Props {
  sessionId: string;
  visible: boolean;
  className?: string;
}

export default function AgentPane({ sessionId, visible, className = "" }: Props) {
  const messages = useAgentStore((s) => s.messages[sessionId] || EMPTY_MESSAGES);
  const status = useAgentStore((s) => s.status[sessionId] || "idle");
  const historyLoaded = useAgentStore((s) => !!s.historyLoaded[sessionId]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null); // null = loading
  const settingsOpen = useUiStore((s) => s.settingsOpen);

  // Check for API key or OAuth on mount and when returning from settings
  useEffect(() => {
    if (settingsOpen) return; // will re-check when settings closes
    let cancelled = false;

    // Run checks independently so one failure doesn't override others
    const checks = {
      envKey: false,
      userKey: false,
      oauth: false,
    };

    const resolve = () => {
      if (!cancelled) {
        setHasKey(checks.envKey || checks.userKey || checks.oauth);
      }
    };

    let done = 0;
    const tick = () => { if (++done === 3) resolve(); };

    window.volley.settings.checkEnvKey()
      .then(({ hasEnvKey }) => { checks.envKey = hasEnvKey; })
      .catch(() => {})
      .finally(tick);

    window.volley.settings.getUser()
      .then((user) => { checks.userKey = !!(user as any).ai?.anthropicKey; })
      .catch(() => {})
      .finally(tick);

    window.volley.settings.claudeAuthStatus()
      .then(({ loggedIn }) => { checks.oauth = loggedIn; })
      .catch(() => {})
      .finally(tick);

    return () => { cancelled = true; };
  }, [settingsOpen]);

  // Load history on mount (once)
  useEffect(() => {
    if (historyLoaded) return;
    useAgentStore.getState().markHistoryLoaded(sessionId);
    window.volley.agent.history(sessionId).then((history) => {
      if (history && history.length > 0) {
        // History is raw SDK messages — parse them into UI format
        const parsed: AgentMessage[] = [];
        for (const raw of history) {
          // Our custom user-prompt entries (saved by agent:send handler)
          if (raw._type === "user-prompt") {
            parsed.push({ type: "user", content: raw.content, images: raw.images });
            continue;
          }
          parsed.push(...parseSDKMessage(raw));
        }
        useAgentStore.getState().loadHistory(sessionId, parsed);
      }
    }).catch(() => { /* handler may not be registered yet */ });
  }, [sessionId, historyLoaded]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!userScrolledUp.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Scroll to bottom when session becomes visible
  useEffect(() => {
    if (visible && scrollRef.current) {
      // Reset scroll state and scroll to bottom
      userScrolledUp.current = false;
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visible]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledUp.current = !atBottom;
  };

  // Build paired tool calls: match tool_use with tool_result by id
  const toolResults = new Map<string, string>();
  for (const msg of messages) {
    if (msg.type === "tool_result") {
      toolResults.set(msg.id, msg.content);
    }
  }

  return (
    <div className={`flex flex-col ${className}`} style={{ display: visible ? "flex" : "none" }}>
      {/* Message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        onScroll={handleScroll}
      >
        {messages.length === 0 && status === "idle" && (
          <div className="flex-1 flex items-center justify-center h-full">
            {hasKey === false ? (
              <div className="text-center space-y-3 max-w-xs">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-yellow-500/60">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                <p className="text-[13px] text-gray-300">API key required</p>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Add your Anthropic API key to use the AI agent. You can set it in Settings or via the <span className="font-mono text-gray-500">ANTHROPIC_API_KEY</span> environment variable.
                </p>
                <button
                  className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-accent-bright/10 border border-accent-bright/30 text-accent-bright hover:bg-accent-bright/20 cursor-pointer transition-colors"
                  onClick={() => useUiStore.getState().openSettings()}
                >
                  Open Settings
                </button>
              </div>
            ) : (
              <div className="text-center space-y-2 text-gray-600">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-gray-700">
                  <path d="M12 2a10 10 0 0110 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
                <p className="text-[12px]">Ask the agent to help with this session</p>
                <p className="text-[10px] text-gray-700">It can read, edit, and run commands in the worktree</p>
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBlock key={i} msg={msg} toolResult={msg.type === "tool_use" ? toolResults.get(msg.id) : undefined} />
        ))}
      </div>

      {/* Prompt input */}
      <TerminalPrompt sessionId={sessionId} disabled={hasKey === false} visible={visible} />
      <DiffStatFooter sessionId={sessionId} />
    </div>
  );
}

function MessageBlock({ msg, toolResult }: { msg: AgentMessage; toolResult?: string }) {
  if (msg.type === "user") {
    // Check if this is a skill invocation (starts with /)
    const isSkill = msg.content?.startsWith("/") ?? false;
    let skillName = "";
    let skillArgs = "";
    if (isSkill) {
      const spaceIdx = msg.content.indexOf(" ");
      skillName = spaceIdx === -1 ? msg.content : msg.content.slice(0, spaceIdx);
      skillArgs = spaceIdx === -1 ? "" : msg.content.slice(spaceIdx + 1);
    }

    return (
      <div className="flex items-start gap-2">
        <span className="text-[13px] text-gray-500 select-none flex-shrink-0 leading-relaxed">›</span>
        <div className="text-[13px] font-mono leading-relaxed text-gray-200 whitespace-pre-wrap break-words flex-1">
          {msg.images && msg.images.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {msg.images.map((img, i) => (
                <img
                  key={i}
                  src={`data:${img.mediaType};base64,${img.base64}`}
                  alt="Attached image"
                  className="max-w-48 max-h-36 rounded-lg border border-white/[0.08] object-contain"
                />
              ))}
            </div>
          )}
          {isSkill ? (
            <>
              <span className="inline-block text-[11px] font-semibold text-gray-300 bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5 mr-1.5">
                {skillName}
              </span>
              {skillArgs && <span>{skillArgs}</span>}
            </>
          ) : (
            msg.content
          )}
        </div>
      </div>
    );
  }

  if (msg.type === "text") {
    return (
      <div className="flex items-start gap-2 pl-0.5">
        <span className="text-[11px] text-gray-600 select-none flex-shrink-0 leading-relaxed mt-px font-mono">⌁</span>
        <div className="text-[13px] font-mono leading-relaxed text-gray-400 whitespace-pre-wrap break-words flex-1">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === "tool_use") {
    return <ToolCallBlock name={msg.name} input={msg.input} id={msg.id} result={toolResult} />;
  }

  if (msg.type === "tool_result") {
    // Results are shown inside ToolCallBlock, skip standalone rendering
    return null;
  }

  if (msg.type === "error") {
    return (
      <div className="text-[12px] font-mono bg-red-500/[0.08] border border-red-500/20 rounded px-3 py-2 text-red-400">
        {msg.message}
      </div>
    );
  }

  if (msg.type === "done") {
    return (
      <div className="flex items-center gap-2 text-[10px] text-gray-600 py-1">
        <span className="h-px flex-1 bg-white/[0.04]" />
        <span>
          Done
          {msg.costUsd != null && ` · $${msg.costUsd.toFixed(4)}`}
          {msg.durationMs != null && ` · ${(msg.durationMs / 1000).toFixed(1)}s`}
        </span>
        <span className="h-px flex-1 bg-white/[0.04]" />
      </div>
    );
  }

  return null;
}
