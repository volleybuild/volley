"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SHOWCASE_SESSIONS,
  SHOWCASE_AGENT_FLOWS,
} from "@/lib/constants";
import { AppFrame } from "./app-frame";
import { FakeSidebar, type FakeSession } from "./fake-sidebar";
import { FakeGridView } from "./fake-grid-view";
import { FakeSessionHeader } from "./fake-session-header";
import { FakeAgentMessages } from "./fake-agent-cell";
import { FakePromptInput } from "./fake-prompt-input";
import { FakeCommitModal } from "./fake-commit-modal";

type Phase =
  | "sidebar-idle"
  | "sessions-appearing"
  | "grid-view"
  | "agents-working"
  | "zoom-session"
  | "show-commit"
  | "typing-commit"
  | "committed"
  | "back-to-grid"
  | "all-done";

export function TerminalShowcase() {
  const [phase, setPhase] = useState<Phase>("sidebar-idle");
  const [sessionCount, setSessionCount] = useState(1);
  const [isGridView, setIsGridView] = useState(false);
  const [statuses, setStatuses] = useState<
    ("pending" | "running" | "idle" | "done")[]
  >(["idle", "pending", "pending", "pending"]);

  // Per-pane visible message counts (drives the agent conversation reveal)
  const [msgCounts, setMsgCounts] = useState([0, 0, 0, 0]);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [commitModalVisible, setCommitModalVisible] = useState(false);
  const [commitTyping, setCommitTyping] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [pushedBadge, setPushedBadge] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
    if (msgIntervalRef.current) {
      clearInterval(msgIntervalRef.current);
      msgIntervalRef.current = null;
    }
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutRef.current.push(id);
    return id;
  }, []);

  const resetState = useCallback(() => {
    setPhase("sidebar-idle");
    setSessionCount(1);
    setIsGridView(false);
    setStatuses(["idle", "pending", "pending", "pending"]);
    setMsgCounts([0, 0, 0, 0]);
    setCommitModalVisible(false);
    setCommitTyping(false);
    setCommitted(false);
    setPushedBadge(false);
  }, []);

  /** Start staggered message reveal across all 4 panes */
  const startMessageStreaming = useCallback(() => {
    const maxLens = SHOWCASE_AGENT_FLOWS.map((flow) => flow.length);
    const counters = [0, 0, 0, 0];
    let tick = 0;

    msgIntervalRef.current = setInterval(() => {
      tick++;
      for (let i = 0; i < 4; i++) {
        if (
          tick >= i + 1 &&
          (tick - (i + 1)) % 2 === 0 &&
          counters[i] < maxLens[i]
        ) {
          counters[i]++;
        }
      }
      setMsgCounts([...counters]);

      if (counters.every((c, i) => c >= maxLens[i])) {
        if (msgIntervalRef.current) {
          clearInterval(msgIntervalRef.current);
          msgIntervalRef.current = null;
        }
      }
    }, 350);
  }, []);

  const runAnimation = useCallback(() => {
    clearTimeouts();
    resetState();

    // Act 1: Multi-session blitz

    schedule(() => {
      setSessionCount(2);
      setPhase("sessions-appearing");
    }, 1000);

    schedule(() => setSessionCount(3), 2500);
    schedule(() => setSessionCount(4), 4000);

    schedule(() => {
      setIsGridView(true);
      setPhase("grid-view");
    }, 5000);

    schedule(() => {
      setStatuses(["running", "running", "running", "running"]);
      setPhase("agents-working");
      startMessageStreaming();
    }, 5500);

    // Act 2: Workflow zoom

    schedule(() => {
      setIsGridView(false);
      setMsgCounts((prev) => {
        const next = [...prev];
        next[0] = SHOWCASE_AGENT_FLOWS[0].length;
        return next;
      });
      setPhase("zoom-session");
    }, 9000);

    schedule(() => {
      setCommitModalVisible(true);
      setPhase("show-commit");
    }, 11000);

    schedule(() => {
      setCommitTyping(true);
      setPhase("typing-commit");
    }, 11500);

    schedule(() => {
      setCommitted(true);
      setPhase("committed");
    }, 13000);

    schedule(() => {
      setCommitModalVisible(false);
      setPushedBadge(true);
    }, 13500);

    schedule(() => {
      setIsGridView(true);
      setStatuses(["done", "done", "done", "done"]);
      setMsgCounts(SHOWCASE_AGENT_FLOWS.map((f) => f.length));
      setPhase("all-done");
    }, 14500);

    schedule(() => {
      runAnimation();
    }, 17000);
  }, [clearTimeouts, resetState, schedule, startMessageStreaming]);

  useEffect(() => {
    runAnimation();
    return () => clearTimeouts();
  }, [runAnimation, clearTimeouts]);

  // Build sidebar sessions with lifecycle data
  const sidebarSessions: FakeSession[] = SHOWCASE_SESSIONS.map((s, i) => {
    const status = statuses[i];
    const visible = i < sessionCount;

    // Determine lifecycle from animation phase and status
    let lifecycle: FakeSession["lifecycle"] = "todo";
    if (status === "running") lifecycle = "in_progress";
    else if (status === "done") lifecycle = "completed";
    else if (status === "idle" && i === 0) lifecycle = "in_progress";

    return {
      slug: s.slug,
      name: s.name,
      branch: s.branch,
      status,
      lifecycle,
      visible,
      elapsed: lifecycle === "in_progress"
        ? status === "running" ? "0:12" : "0:00"
        : lifecycle === "completed" ? "2:34" : undefined,
      stats: lifecycle === "in_progress" && status === "running"
        ? { files: i + 1, insertions: (i + 1) * 12, deletions: i * 3 }
        : undefined,
      agentStatus: status === "running" ? (i % 2 === 0 ? "thinking" : "coding") : null,
    };
  });

  const isZoomed =
    phase === "zoom-session" ||
    phase === "show-commit" ||
    phase === "typing-commit" ||
    phase === "committed";

  const isBusy = isZoomed && statuses[0] === "running";

  return (
    <AppFrame>
      <div className="flex h-[400px] sm:h-[460px] md:h-[520px] relative">
        {/* Sidebar */}
        <FakeSidebar
          sessions={sidebarSessions}
          activeSlug={isZoomed ? SHOWCASE_SESSIONS[0].slug : null}
          className="hidden sm:flex border-r border-white/[0.06]"
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {isGridView ? (
            /* ── Grid view: 4 cells with compact headers + messages + inputs ── */
            <FakeGridView
              visibleMsgCounts={msgCounts}
              statuses={statuses}
            />
          ) : isZoomed ? (
            /* ── Zoomed single-session: SessionHeader + AgentMessages + TerminalPrompt ── */
            <>
              <FakeSessionHeader
                slug={SHOWCASE_SESSIONS[0].slug}
                branch={SHOWCASE_SESSIONS[0].branch}
                baseBranch="main"
                status={statuses[0]}
              />
              <FakeAgentMessages
                messages={SHOWCASE_AGENT_FLOWS[0]}
                visibleCount={msgCounts[0]}
              />
              <FakePromptInput isBusy={isBusy} />
              {pushedBadge && (
                <div className="absolute top-1 right-2 z-10">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                    pushed
                  </span>
                </div>
              )}
            </>
          ) : (
            /* ── Single session (pre-grid): SessionHeader + AgentMessages + TerminalPrompt ── */
            <>
              <FakeSessionHeader
                slug={SHOWCASE_SESSIONS[0].slug}
                branch={SHOWCASE_SESSIONS[0].branch}
                baseBranch="main"
                status={statuses[0]}
              />
              <FakeAgentMessages
                messages={SHOWCASE_AGENT_FLOWS[0]}
                visibleCount={msgCounts[0]}
              />
              <FakePromptInput />
            </>
          )}

          {/* Commit modal overlay */}
          <FakeCommitModal
            visible={commitModalVisible}
            typingActive={commitTyping}
            committed={committed}
          />
        </div>
      </div>
    </AppFrame>
  );
}
