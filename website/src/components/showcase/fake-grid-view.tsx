"use client";

import { SHOWCASE_AGENT_FLOWS, SHOWCASE_SESSIONS } from "@/lib/constants";
import { FakeSessionPane } from "./fake-session-pane";

interface FakeGridViewProps {
  /** How many messages are visible per pane (driven by animation) */
  visibleMsgCounts: number[];
  /** Status for each of the 4 panes */
  statuses: ("pending" | "running" | "idle" | "done")[];
  className?: string;
}

export function FakeGridView({
  visibleMsgCounts,
  statuses,
  className = "",
}: FakeGridViewProps) {
  return (
    <div className={`grid grid-cols-2 gap-px h-full ${className}`}>
      {SHOWCASE_SESSIONS.map((session, i) => (
        <FakeSessionPane
          key={session.slug}
          slug={session.slug}
          status={statuses[i] ?? "pending"}
          messages={SHOWCASE_AGENT_FLOWS[i]}
          visibleMsgCount={visibleMsgCounts[i] ?? 0}
        />
      ))}
    </div>
  );
}
