type Status = "pending" | "running" | "idle" | "done";

interface StatusDotProps {
  status: Status;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  pending: "bg-accent-bright animate-status-pending",
  running: "bg-accent-bright animate-status-running",
  idle: "bg-status-idle animate-status-idle",
  done: "bg-[#666]",
};

export function StatusDot({ status, className = "" }: StatusDotProps) {
  return (
    <span
      className={`inline-block flex-shrink-0 w-1.5 h-1.5 rounded-full ${statusStyles[status]} ${className}`}
    />
  );
}
