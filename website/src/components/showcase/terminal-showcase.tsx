"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SHOWCASE_SESSIONS,
  SHOWCASE_AGENT_FLOWS,
} from "@/lib/constants";
import { AppFrame } from "./app-frame";
import { FakeSidebar, type FakeSession } from "./fake-sidebar";
import { FakeNoteEditor } from "./fake-note-editor";
import { FakeTodoPlan } from "./fake-todo-plan";
import { FakeSessionHeader } from "./fake-session-header";
import { FakeAgentMessages } from "./fake-agent-cell";
import { FakePromptInput } from "./fake-prompt-input";
import { FakeCommitModal } from "./fake-commit-modal";

type Phase =
  | "note-editing"
  | "generate-todos"
  | "show-plan"
  | "session-active"
  | "show-commit"
  | "typing-commit"
  | "committed"
  | "session-done";

export function TerminalShowcase() {
  const [phase, setPhase] = useState<Phase>("note-editing");
  const [sessionCount, setSessionCount] = useState(0);
  const [statuses, setStatuses] = useState<
    ("pending" | "running" | "idle" | "done")[]
  >(["pending", "pending", "pending", "pending"]);

  // Per-pane visible message counts (only pane 0 is displayed)
  const [msgCounts, setMsgCounts] = useState([0, 0, 0, 0]);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Note editor state
  const [noteLineCount, setNoteLineCount] = useState(0);
  const [generateVisible, setGenerateVisible] = useState(false);
  const [generateActive, setGenerateActive] = useState(false);

  // Plan view state
  const [planItemCount, setPlanItemCount] = useState(0);
  const [startingIndex, setStartingIndex] = useState<number | null>(null);

  // Commit state
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
    setPhase("note-editing");
    setSessionCount(0);
    setStatuses(["pending", "pending", "pending", "pending"]);
    setMsgCounts([0, 0, 0, 0]);
    setNoteLineCount(0);
    setGenerateVisible(false);
    setGenerateActive(false);
    setPlanItemCount(0);
    setStartingIndex(null);
    setCommitModalVisible(false);
    setCommitTyping(false);
    setCommitted(false);
    setPushedBadge(false);
  }, []);

  /** Stream messages for pane 0 one at a time */
  const startMessageStreaming = useCallback(() => {
    const maxLen = SHOWCASE_AGENT_FLOWS[0].length;
    let count = 0;

    msgIntervalRef.current = setInterval(() => {
      count++;
      if (count <= maxLen) {
        setMsgCounts([count, 0, 0, 0]);
      }
      if (count >= maxLen) {
        if (msgIntervalRef.current) {
          clearInterval(msgIntervalRef.current);
          msgIntervalRef.current = null;
        }
      }
    }, 450);
  }, []);

  const runAnimation = useCallback(() => {
    clearTimeouts();
    resetState();

    // ── Act 1: Note → Generate Todos ──────────────────────

    // Lines appear one by one
    schedule(() => setNoteLineCount(1), 500);
    schedule(() => setNoteLineCount(2), 1000);
    schedule(() => setNoteLineCount(3), 1500);
    schedule(() => setNoteLineCount(4), 2000);

    // Generate button appears, then activates
    schedule(() => setGenerateVisible(true), 2700);
    schedule(() => {
      setGenerateActive(true);
      setPhase("generate-todos");
    }, 3300);

    // Todos appear in sidebar one by one
    schedule(() => setSessionCount(1), 3800);
    schedule(() => setSessionCount(2), 4200);
    schedule(() => setSessionCount(3), 4600);
    schedule(() => setSessionCount(4), 5000);

    // ── Act 2: Todo plan view ─────────────────────────────

    // Switch from note editor to plan view
    schedule(() => {
      setPhase("show-plan");
    }, 5800);

    // Plan items appear with stagger
    schedule(() => setPlanItemCount(1), 6000);
    schedule(() => setPlanItemCount(2), 6200);
    schedule(() => setPlanItemCount(3), 6400);
    schedule(() => setPlanItemCount(4), 6600);

    // First item highlights (about to start)
    schedule(() => setStartingIndex(0), 7400);

    // ── Act 3: Session runs ───────────────────────────────

    // First todo becomes a running session
    schedule(() => {
      setPhase("session-active");
      setStatuses(["running", "pending", "pending", "pending"]);
      startMessageStreaming();
    }, 8000);

    // ── Act 4: Commit & done ──────────────────────────────

    schedule(() => {
      setCommitModalVisible(true);
      setPhase("show-commit");
    }, 12200);

    schedule(() => {
      setCommitTyping(true);
      setPhase("typing-commit");
    }, 12700);

    schedule(() => {
      setCommitted(true);
      setPhase("committed");
    }, 14200);

    schedule(() => {
      setCommitModalVisible(false);
      setPushedBadge(true);
    }, 14700);

    schedule(() => {
      setStatuses(["done", "pending", "pending", "pending"]);
      setMsgCounts([SHOWCASE_AGENT_FLOWS[0].length, 0, 0, 0]);
      setPhase("session-done");
    }, 15200);

    // Loop
    schedule(() => {
      runAnimation();
    }, 18000);
  }, [clearTimeouts, resetState, schedule, startMessageStreaming]);

  useEffect(() => {
    runAnimation();
    return () => clearTimeouts();
  }, [runAnimation, clearTimeouts]);

  // ── Derived state ────────────────────────────────────────

  const showNoteEditor =
    phase === "note-editing" || phase === "generate-todos";

  const showPlan = phase === "show-plan";

  const showSession = !showNoteEditor && !showPlan;

  const isBusy = showSession && statuses[0] === "running";

  const activeNote = showNoteEditor ? "Sprint planning" : null;

  // Highlight first session in sidebar when starting from plan or during session
  const activeSlug = showSession
    ? SHOWCASE_SESSIONS[0].slug
    : startingIndex !== null
      ? SHOWCASE_SESSIONS[startingIndex].slug
      : null;

  // Build sidebar sessions with lifecycle data
  const sidebarSessions: FakeSession[] = SHOWCASE_SESSIONS.map((s, i) => {
    const status = statuses[i];
    const visible = i < sessionCount;

    let lifecycle: FakeSession["lifecycle"] = "todo";
    if (status === "running") lifecycle = "in_progress";
    else if (status === "done") lifecycle = "completed";

    return {
      slug: s.slug,
      name: s.name,
      branch: s.branch,
      status,
      lifecycle,
      visible,
      elapsed:
        lifecycle === "in_progress"
          ? "0:12"
          : lifecycle === "completed"
            ? "2:34"
            : undefined,
      stats:
        lifecycle === "in_progress" && status === "running"
          ? { files: 3, insertions: 42, deletions: 7 }
          : undefined,
      agentStatus: status === "running" ? "thinking" : null,
    };
  });

  return (
    <AppFrame>
      <div className="flex h-[400px] sm:h-[460px] md:h-[520px] relative">
        {/* Sidebar */}
        <FakeSidebar
          sessions={sidebarSessions}
          activeSlug={activeSlug}
          activeNote={activeNote}
          className="hidden sm:flex border-r border-white/[0.06]"
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {showNoteEditor ? (
            /* ── Note editor: lines appear, then generate todos ── */
            <FakeNoteEditor
              visibleLines={noteLineCount}
              generateVisible={generateVisible}
              generateActive={generateActive}
            />
          ) : showPlan ? (
            /* ── Todo plan: items with start buttons ── */
            <FakeTodoPlan
              visibleItems={planItemCount}
              startingIndex={startingIndex}
            />
          ) : (
            /* ── Single session view ── */
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
