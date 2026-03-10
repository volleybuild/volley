import React from "react";
import type { AgentStatus } from "../../types/agent";

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-accent-bright animate-status-pending",
  running: "bg-accent-bright animate-status-running",
  idle: "bg-status-idle animate-status-idle",
  done: "bg-[#666]",
  exited: "bg-red-500 animate-status-exited",
};

// Agent status overrides session status for the dot
const AGENT_STATUS_CLASSES: Record<AgentStatus, string> = {
  idle: "", // No override, use session status
  thinking: "bg-accent-bright animate-status-thinking",
  coding: "bg-accent-bright animate-status-running",
  waiting: "bg-status-idle animate-status-waiting",
  done: "bg-[#666]",
  error: "bg-red-500",
};

interface Props {
  status: string;
  agentStatus?: AgentStatus;
  className?: string;
}

export default function StatusDot({ status, agentStatus, className = "" }: Props) {
  // Agent status takes precedence if it's active
  let dotClass = STATUS_CLASSES[status] ?? "bg-[#666]";

  if (agentStatus && agentStatus !== "idle" && agentStatus !== "done") {
    dotClass = AGENT_STATUS_CLASSES[agentStatus];
  }

  return (
    <span
      className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${dotClass} ${className}`}
    />
  );
}
