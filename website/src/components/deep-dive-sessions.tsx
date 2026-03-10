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
  {
    slug: "update-readme",
    name: "Update README",
    branch: "",
    status: "pending",
    lifecycle: "todo",
    visible: true,
  },
];

export function DeepDiveSessions() {
  const [sessions, setSessions] = useState<FakeSession[]>(INITIAL_SESSIONS);
  const [activeSlug, setActiveSlug] = useState<string | null>("auth-middleware");

  useEffect(() => {
    // New todo appears
    const t1 = setTimeout(() => {
      setSessions((prev) => [
        ...prev,
        {
          slug: "setup-ci",
          name: "Setup CI pipeline",
          branch: "",
          status: "pending",
          lifecycle: "todo" as const,
          visible: true,
        },
      ]);
    }, 1500);

    // Start working on api-tests — switch to it
    const t2 = setTimeout(() => {
      setActiveSlug("api-tests");
      setSessions((prev) =>
        prev.map((s) =>
          s.slug === "api-tests"
            ? { ...s, stats: { files: 2, insertions: 56, deletions: 3 }, elapsed: "1:05" }
            : s,
        ),
      );
    }, 2500);

    // Auth middleware completes
    const t3 = setTimeout(() => {
      setSessions((prev) =>
        prev.map((s) =>
          s.slug === "auth-middleware"
            ? { ...s, status: "done" as const, lifecycle: "completed" as const, elapsed: "3m ago", agentStatus: null, stats: undefined }
            : s,
        ),
      );
    }, 4000);

    // Start a todo
    const t4 = setTimeout(() => {
      setSessions((prev) =>
        prev.map((s) =>
          s.slug === "update-readme"
            ? {
                ...s,
                status: "running" as const,
                lifecycle: "in_progress" as const,
                branch: "docs/readme",
                elapsed: "0:02",
                agentStatus: "thinking" as const,
              }
            : s,
        ),
      );
      setActiveSlug("update-readme");
    }, 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <AppFrame>
      <div className="flex h-[280px]">
        <FakeSidebar
          sessions={sessions}
          activeSlug={activeSlug}
          className="w-full border-none"
        />
      </div>
    </AppFrame>
  );
}
