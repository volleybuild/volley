"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SHOWCASE_AGENT_FLOWS } from "@/lib/constants";
import { AppFrame } from "./showcase/app-frame";
import { FakeSessionHeader } from "./showcase/fake-session-header";
import { FakeAgentMessages } from "./showcase/fake-agent-cell";
import { FakePromptInput } from "./showcase/fake-prompt-input";

/* ── Git dropdown menu items ─────────────────────────────────── */

const GIT_ITEMS = [
  {
    label: "Commit",
    shortcut: "⌘⇧C",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <line x1="1.05" y1="12" x2="7" y2="12" />
        <line x1="17.01" y1="12" x2="22.96" y2="12" />
      </svg>
    ),
    badge: "4 files",
    badgeColor: "text-accent-bright bg-accent-bright/10",
  },
  {
    label: "Push",
    shortcut: "⌘⇧P",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    ),
    badge: "1 ahead",
    badgeColor: "text-accent-cyan bg-accent-cyan/10",
  },
  {
    label: "Pull",
    shortcut: "⌘⇧L",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    ),
  },
  { type: "separator" as const },
  {
    label: "Switch branch",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M12 8v4m0 0l-6 6m6-6l6 6" />
      </svg>
    ),
  },
  {
    label: "Create branch",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    label: "Stash changes",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      </svg>
    ),
  },
];

function FakeGitDropdown({
  visible,
  highlightIndex,
}: {
  visible: boolean;
  highlightIndex: number | null;
}) {
  if (!visible) return null;

  let itemIdx = 0;

  return (
    <div className="absolute top-9 right-12 z-30 w-[200px] rounded-lg border border-white/[0.08] bg-[#161719] shadow-2xl shadow-black/60 py-1 animate-modal-in">
      {GIT_ITEMS.map((item, i) => {
        if ("type" in item && item.type === "separator") {
          return (
            <div
              key={`sep-${i}`}
              className="h-px bg-white/[0.06] my-1"
            />
          );
        }

        const idx = itemIdx++;
        const isHighlighted = highlightIndex === idx;

        return (
          <div
            key={item.label}
            className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded text-[11px] transition-colors duration-100 ${
              isHighlighted
                ? "bg-accent/15 text-accent-bright"
                : "text-gray-300"
            }`}
          >
            <span
              className={`flex-shrink-0 ${
                isHighlighted ? "text-accent-bright" : "text-gray-500"
              }`}
            >
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {"badge" in item && item.badge && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${item.badgeColor}`}
              >
                {item.badge}
              </span>
            )}
            {"shortcut" in item && item.shortcut && !item.badge && (
              <span className="text-[9px] text-gray-600">
                {item.shortcut}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Deep-dive Git section ───────────────────────────────────── */

export function DeepDiveGit() {
  const [msgCount, setMsgCount] = useState(0);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutRef.current.push(id);
    return id;
  }, []);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    setMsgCount(0);
    setDropdownVisible(false);
    setHighlightIndex(null);
  }, []);

  const runAnimation = useCallback(() => {
    clearTimeouts();
    resetState();

    // Stream a few messages
    const maxLen = SHOWCASE_AGENT_FLOWS[0].length;
    let count = 0;
    intervalRef.current = setInterval(() => {
      count++;
      setMsgCount(count);
      if (count >= maxLen) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 350);

    // Open dropdown
    schedule(() => setDropdownVisible(true), 2200);

    // Highlight items one by one
    schedule(() => setHighlightIndex(0), 2700);
    schedule(() => setHighlightIndex(1), 3400);
    schedule(() => setHighlightIndex(0), 4100);

    // Close dropdown
    schedule(() => setDropdownVisible(false), 5200);

    // Loop
    schedule(() => runAnimation(), 7500);
  }, [clearTimeouts, resetState, schedule]);

  useEffect(() => {
    runAnimation();
    return () => clearTimeouts();
  }, [runAnimation, clearTimeouts]);

  return (
    <AppFrame>
      <div className="h-[280px] flex flex-col relative overflow-hidden">
        <FakeSessionHeader
          slug="auth-middleware"
          branch="feat/auth"
          baseBranch="main"
          status="running"
        />
        <FakeAgentMessages
          messages={SHOWCASE_AGENT_FLOWS[0]}
          visibleCount={msgCount}
        />
        <FakePromptInput isBusy={msgCount < SHOWCASE_AGENT_FLOWS[0].length} />
        <FakeGitDropdown
          visible={dropdownVisible}
          highlightIndex={highlightIndex}
        />
      </div>
    </AppFrame>
  );
}
