import React from "react";
import { useSessionStore } from "../../store/session-store";

export default function StatusBar() {
  const sessions = useSessionStore((s) => s.sessions);

  const total = sessions.size;
  let running = 0;
  let exited = 0;
  for (const [, session] of sessions) {
    if (session.status === "running" || session.status === "idle") running++;
    if (session.status === "exited") exited++;
  }

  const parts = [`${total} session${total !== 1 ? "s" : ""}`];
  if (running > 0) parts.push(`${running} running`);
  if (exited > 0) parts.push(`${exited} exited`);

  return (
    <div className="flex items-center justify-between px-3 py-0.5 flex-shrink-0 text-[11px] select-none bg-vo-base border-t border-white/[0.06]">
      <span className="text-gray-600">{parts.join(" | ")}</span>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 bg-accent-bright" />
        <span className="text-gray-600">socket</span>
      </div>
    </div>
  );
}
