import React, { useRef, useEffect } from "react";
import { useSessionStore } from "../../store/session-store";

interface Props {
  sessionId: string;
  className?: string;
}

export default function RunTerminalPane({ sessionId, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const session = useSessionStore((s) => s.sessions.get(sessionId));
  const runTerminal = session?.runTerminal ?? null;
  const runFitAddon = session?.runFitAddon ?? null;

  // Mount or re-attach xterm into DOM
  useEffect(() => {
    if (!runTerminal || !containerRef.current) return;
    if (containerRef.current.children.length > 0) return;

    if (runTerminal.element) {
      containerRef.current.appendChild(runTerminal.element);
    } else {
      runTerminal.open(containerRef.current);
    }
  }, [runTerminal]);

  // Fit + resize
  useEffect(() => {
    if (!runTerminal || !runFitAddon) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;

    const fit = () => {
      runFitAddon.fit();
      const d = runFitAddon.proposeDimensions();
      if (d && d.cols > 0 && d.rows > 0) {
        window.volley.run.resize(sessionId, d.cols, d.rows);
      }
    };

    const raf = requestAnimationFrame(fit);

    const onResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(fit, 100);
    };

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", onResize);
    };
  }, [runTerminal, runFitAddon, sessionId]);

  if (!runTerminal) return null;

  return (
    <div
      ref={containerRef}
      className={`terminal-container ${className ?? ""}`}
    />
  );
}
