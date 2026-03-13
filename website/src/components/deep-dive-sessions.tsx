"use client";

import { useEffect, useState } from "react";
import { AppFrame } from "./showcase/app-frame";
import { FakeSidebar, type FakeSession } from "./showcase/fake-sidebar";

const INITIAL_SESSIONS: FakeSession[] = [
  {
    slug: "auth-middleware",
    name: "Add auth middleware",
    branch: "feat/auth",
    status: "running",
    lifecycle: "in_progress",
    visible: true,
    elapsed: "1:42",
    stats: { files: 3, insertions: 48, deletions: 5 },
    agentStatus: "thinking",
  },
  {
    slug: "api-tests",
    name: "Write API tests",
    branch: "test/api",
    status: "running",
    lifecycle: "in_progress",
    visible: true,
    elapsed: "0:38",
    stats: { files: 1, insertions: 24, deletions: 0 },
    agentStatus: "coding",
  },
  {
    slug: "responsive-nav",
    name: "Fix responsive nav",
    branch: "fix/nav",
    status: "done",
    lifecycle: "completed",
    visible: true,
    elapsed: "2h ago",
  },
];

export function DeepDiveSessions() {
  const [sessions, setSessions] = useState<FakeSession[]>(INITIAL_SESSIONS);
  const [activeSlug, setActiveSlug] = useState<string | null>(
    "auth-middleware",
  );

  useEffect(() => {
    // Update api-tests stats
    const t1 = setTimeout(() => {
      setActiveSlug("api-tests");
      setSessions((prev) =>
        prev.map((s) =>
          s.slug === "api-tests"
            ? {
                ...s,
                stats: { files: 2, insertions: 56, deletions: 3 },
                elapsed: "1:05",
              }
            : s,
        ),
      );
    }, 2500);

    // Auth middleware completes
    const t2 = setTimeout(() => {
      setSessions((prev) =>
        prev.map((s) =>
          s.slug === "auth-middleware"
            ? {
                ...s,
                status: "done" as const,
                lifecycle: "completed" as const,
                elapsed: "3m ago",
                agentStatus: null,
                stats: undefined,
              }
            : s,
        ),
      );
    }, 4000);

    // Api-tests completes
    const t3 = setTimeout(() => {
      setSessions((prev) =>
        prev.map((s) =>
          s.slug === "api-tests"
            ? {
                ...s,
                status: "done" as const,
                lifecycle: "completed" as const,
                elapsed: "1m ago",
                agentStatus: null,
                stats: undefined,
              }
            : s,
        ),
      );
      setActiveSlug(null);
    }, 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <AppFrame>
      <div className="flex h-[280px]">
        <FakeSidebar
          sessions={sessions}
          activeSlug={activeSlug}
          hideNotes
          className="w-full border-none"
        />
      </div>
    </AppFrame>
  );
}
