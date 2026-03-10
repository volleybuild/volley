"use client";

import { StatusDot } from "../ui/status-dot";

/* ── Types ─────────────────────────────────────────────────────── */

export type SessionLifecycle = "todo" | "in_progress" | "completed";

export interface FakeSession {
  slug: string;
  name: string;
  branch: string;
  status: "pending" | "running" | "idle" | "done";
  lifecycle: SessionLifecycle;
  visible: boolean;
  /** Elapsed time string for in_progress sessions */
  elapsed?: string;
  /** Diff stats for in_progress sessions */
  stats?: { files: number; insertions: number; deletions: number };
  /** Agent status badge for in_progress sessions */
  agentStatus?: "thinking" | "coding" | null;
}

interface FakeSidebarProps {
  sessions: FakeSession[];
  activeSlug: string | null;
  className?: string;
}

/* ── SidebarSection (matches SidebarSection.tsx) ───────────────── */

function Section({
  title,
  count,
  dimmed = false,
  showAdd = false,
  children,
}: {
  title: string;
  count: number;
  dimmed?: boolean;
  showAdd?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      {/* Section header */}
      <div
        className={`w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium tracking-wider uppercase rounded ${
          dimmed ? "text-gray-600" : "text-gray-500"
        }`}
      >
        {/* Chevron down */}
        <span className="flex-shrink-0 opacity-50">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
        <span className="flex-1 text-left">{title}</span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded ${
            dimmed ? "bg-white/[0.03]" : "bg-white/[0.05]"
          }`}
        >
          {count}
        </span>
        {showAdd && (
          <span className="p-0.5 rounded opacity-50">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        )}
      </div>
      <div className="space-y-0.5 mt-0.5">{children}</div>
    </div>
  );
}

/* ── TabItem variants (matches TabItem.tsx) ─────────────────────── */

function TodoItem({
  session,
  isActive,
}: {
  session: FakeSession;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-2 px-2.5 py-2 rounded text-xs transition-colors duration-75 relative ${
        isActive ? "bg-white/[0.03]" : ""
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-accent-bright" />
      )}
      {/* Hollow circle */}
      <span className="mt-[5px] w-[7px] h-[7px] rounded-full border border-gray-500 flex-shrink-0" />
      <div className="flex flex-col gap-0.5 overflow-hidden min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span
            className={`truncate font-medium leading-snug ${
              isActive ? "text-gray-100" : "text-gray-400"
            }`}
          >
            {session.name}
          </span>
          {/* Start button */}
          <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-accent/10 text-accent flex items-center gap-1">
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start
          </span>
        </div>
      </div>
    </div>
  );
}

function InProgressItem({
  session,
  isActive,
}: {
  session: FakeSession;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-2 px-2.5 py-2 rounded text-xs transition-colors duration-75 relative ${
        isActive ? "bg-white/[0.03]" : ""
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-accent-bright" />
      )}
      <StatusDot
        status={session.status}
        className="mt-[5px] w-[7px] h-[7px]"
      />
      <div className="flex flex-col gap-0.5 overflow-hidden min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span
            className={`truncate font-medium leading-snug ${
              isActive ? "text-gray-100" : "text-gray-400"
            }`}
          >
            {session.slug}
          </span>
          <span className="tabular-nums text-[10px] text-gray-600 flex-shrink-0">
            {session.elapsed ?? "0:00"}
          </span>
        </div>
        {/* Branch + agent status */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] text-accent-cyan/60 truncate">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="6" r="2" />
              <circle cx="6" cy="18" r="2" />
              <circle cx="18" cy="18" r="2" />
              <path d="M12 8v4m0 0l-6 6m6-6l6 6" />
            </svg>
            {session.branch}
          </span>
          {session.agentStatus && (
            <span
              className={`inline-flex items-center gap-1 text-[9px] rounded-full px-1.5 leading-[16px] flex-shrink-0 whitespace-nowrap ${
                session.agentStatus === "thinking"
                  ? "text-accent-bright bg-accent-bright/10"
                  : "text-yellow-400 bg-yellow-500/10"
              }`}
            >
              <span
                className={`w-1 h-1 rounded-full animate-pulse ${
                  session.agentStatus === "thinking"
                    ? "bg-accent-bright"
                    : "bg-yellow-400"
                }`}
              />
              {session.agentStatus === "thinking"
                ? "Thinking..."
                : "Using tools..."}
            </span>
          )}
        </div>
        {/* Diff stats */}
        {session.stats && session.stats.files > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] tabular-nums mt-0.5 text-gray-500">
            <span>
              {session.stats.files}{" "}
              {session.stats.files === 1 ? "file" : "files"}
            </span>
            <span className="text-gray-700">&middot;</span>
            <span className="text-green-400">+{session.stats.insertions}</span>
            <span className="text-red-400">-{session.stats.deletions}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CompletedItem({
  session,
  isActive,
}: {
  session: FakeSession;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-2 px-2.5 py-2 rounded text-xs transition-colors duration-75 relative opacity-60 ${
        isActive ? "bg-white/[0.03]" : ""
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-green-500/50" />
      )}
      {/* Green check circle */}
      <span className="mt-[4px] w-[9px] h-[9px] rounded-full bg-green-500/30 flex-shrink-0 flex items-center justify-center text-green-400">
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <div className="flex flex-col gap-0.5 overflow-hidden min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-medium leading-snug text-gray-500">
            {session.slug}
          </span>
          <span className="text-[10px] text-gray-600 flex-shrink-0">
            {session.elapsed ?? "2h ago"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar (matches Sidebar.tsx) ─────────────────────────────── */

export function FakeSidebar({
  sessions,
  activeSlug,
  className = "",
}: FakeSidebarProps) {
  const visible = sessions.filter((s) => s.visible);
  const todos = visible.filter((s) => s.lifecycle === "todo");
  const inProgress = visible.filter((s) => s.lifecycle === "in_progress");
  const completed = visible.filter((s) => s.lifecycle === "completed");

  return (
    <div
      className={`w-[180px] flex-shrink-0 bg-vo-surface flex flex-col overflow-hidden ${className}`}
    >
      {/* Title bar area — matches real sidebar with pl-20 for traffic lights */}
      <div className="pl-[18px] pr-2 h-9 flex items-center gap-2 flex-shrink-0">
        {/* Traffic lights (macOS window controls) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
          <span className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
          <span className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
        </div>
        <span className="flex-1 flex items-center gap-1.5 text-gray-500 text-[11px] tracking-wide">
          <svg width="16" height="14" viewBox="0 0 48 40" fill="none" className="text-accent-bright flex-shrink-0">
            <path d="M8 4L24 20L8 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
            <path d="M18 4L34 20L18 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <path d="M28 4L44 20L28 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {/* Grid toggle button */}
        <span className="flex items-center justify-center w-6 h-6 rounded text-gray-600 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </span>
      </div>

      {/* Sessions header */}
      <div className="px-3 py-1.5 flex-shrink-0 flex items-center justify-between">
        <span className="text-[10px] font-medium text-vo-text-muted uppercase tracking-wider">
          Sessions
        </span>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-1.5">
        {todos.length > 0 && (
          <Section title="Todo" count={todos.length} showAdd>
            {todos.map((s) => (
              <TodoItem
                key={s.slug}
                session={s}
                isActive={s.slug === activeSlug}
              />
            ))}
          </Section>
        )}

        {inProgress.length > 0 && (
          <Section title="In Progress" count={inProgress.length}>
            {inProgress.map((s) => (
              <InProgressItem
                key={s.slug}
                session={s}
                isActive={s.slug === activeSlug}
              />
            ))}
          </Section>
        )}

        {completed.length > 0 && (
          <Section title="Completed" count={completed.length} dimmed>
            {completed.map((s) => (
              <CompletedItem
                key={s.slug}
                session={s}
                isActive={s.slug === activeSlug}
              />
            ))}
          </Section>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="px-3 py-2.5 flex-shrink-0 space-y-1.5">
        <div className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] text-gray-500 border border-white/[0.06]">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New session
        </div>
        <div className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] text-gray-600">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </div>
      </div>
    </div>
  );
}
