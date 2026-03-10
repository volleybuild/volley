"use client";

import { useEffect, useState } from "react";

interface TypingTextProps {
  text: string;
  /** Whether typing should be active */
  active: boolean;
  /** ms per character */
  speed?: number;
  className?: string;
  /** Called when typing finishes */
  onDone?: () => void;
}

export function TypingText({
  text,
  active,
  speed = 40,
  className = "",
  onDone,
}: TypingTextProps) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!active) {
      setDisplayed("");
      return;
    }

    let i = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        onDone?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, active, speed, onDone]);

  return (
    <span className={className}>
      {displayed}
      {active && displayed.length < text.length && (
        <span className="animate-cursor-blink text-accent-bright">|</span>
      )}
    </span>
  );
}
