import React, { useRef, useEffect } from "react";
import { useSessionStore } from "../../store/session-store";

interface Props {
  sessionId: string;
  visible: boolean;
  className?: string;
}

export default function TerminalPane({ sessionId, visible, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const session = useSessionStore((s) => s.sessions.get(sessionId));

  // Mount or re-attach xterm into DOM
  useEffect(() => {
    if (!session?.terminal || !containerRef.current) return;
    if (containerRef.current.children.length > 0) return;

    if (session.terminal.element) {
      // Terminal was already opened — re-attach its existing DOM node
      containerRef.current.appendChild(session.terminal.element);
    } else {
      session.terminal.open(containerRef.current);
    }
  }, [session]);

  // Fit + resize on visibility change
  useEffect(() => {
    if (!visible || !session?.terminal || !session.fitAddon) return;
    const fitAddon = session.fitAddon;

    let resizeTimeout: ReturnType<typeof setTimeout>;

    const fit = () => {
      fitAddon.fit();
      const d = fitAddon.proposeDimensions();
      if (d && d.cols > 0 && d.rows > 0) {
        window.volley.pty.resize(sessionId, d.cols, d.rows);
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
  }, [visible, session, sessionId]);

  // Focus when becoming visible
  useEffect(() => {
    if (visible && session?.terminal) {
      session.terminal.focus();
    }
  }, [visible, session]);

  return (
    <div
      ref={containerRef}
      className={`terminal-container ${className ?? ""}`}
      style={{ display: visible ? undefined : "none" }}
    />
  );
}
