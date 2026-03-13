import React, { useEffect, useState } from "react";
import { useUiStore } from "../../store/ui-store";

// Minimum time the splash stays visible — one full dot animation cycle (1.08s)
// plus the entrance animation (600ms) and a short hold
const MIN_DISPLAY_MS = 1800;

export default function SplashScreen() {
  const appReady = useUiStore((s) => s.appReady);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [visible, setVisible] = useState(true);

  // Guarantee minimum display time
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const canDismiss = appReady && minTimeElapsed;

  // Once both conditions are met, fade out then unmount
  useEffect(() => {
    if (!canDismiss) return;
    const timer = setTimeout(() => setVisible(false), 400);
    return () => clearTimeout(timer);
  }, [canDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(110,231,183,0.04) 0%, #09090b 60%), #09090b",
        transition: "opacity 400ms ease-out",
        opacity: canDismiss ? 0 : 1,
        pointerEvents: canDismiss ? "none" : "auto",
      }}
    >
      {/* Container for logo + wordmark */}
      <div className="flex flex-col items-center gap-4">
        {/* Animated three-dot logo — larger version with glow */}
        <div
          className="splash-logo"
          style={{ animationDelay: "0ms" }}
        >
          <svg
            width="72"
            height="60"
            viewBox="0 0 76 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            overflow="visible"
          >
            <defs>
              <filter id="splash-glow-mint" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
                <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.2 0 0 0 0 0.83 0 0 0 0 0.6 0 0 0 0.5 0" result="c" />
                <feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="splash-glow-amber" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
                <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.98 0 0 0 0 0.75 0 0 0 0 0.14 0 0 0 0.5 0" result="c" />
                <feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="splash-glow-violet" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
                <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.65 0 0 0 0 0.55 0 0 0 0 0.97 0 0 0 0.5 0" result="c" />
                <feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g filter="url(#splash-glow-mint)">
              <circle cx="15" cy="15" r="15" fill="#34d399" className="animate-vl-dot0" style={{ transformOrigin: "15px 15px" }} />
            </g>
            <g filter="url(#splash-glow-amber)">
              <circle cx="61" cy="15" r="15" fill="#fbbf24" className="animate-vl-dot1" style={{ transformOrigin: "61px 15px" }} />
            </g>
            <g filter="url(#splash-glow-violet)">
              <circle cx="38" cy="49" r="15" fill="#a78bfa" className="animate-vl-dot2" style={{ transformOrigin: "38px 49px" }} />
            </g>
          </svg>
        </div>

        {/* Wordmark */}
        <div
          className="text-[26px] tracking-[-0.5px] text-[#e8eaf0] splash-wordmark"
          style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}
        >
          Volley
        </div>
      </div>
    </div>
  );
}
