import React from "react";
import { useUiStore } from "../../store/ui-store";

export default function EmptyState() {
  const openNewSessionModal = useUiStore((s) => s.openNewSessionModal);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center animate-[fadeIn_600ms_ease-out]">
        {/* Three-dots logo with glow */}
        <div className="mb-3 flex justify-center">
          <svg width="60" height="50" viewBox="0 0 76 64" fill="none">
            <defs>
              <filter id="glow-mint" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
                <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.2 0 0 0 0 0.83 0 0 0 0 0.6 0 0 0 0.3 0" result="c" />
                <feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
                <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.98 0 0 0 0 0.75 0 0 0 0 0.14 0 0 0 0.3 0" result="c" />
                <feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-violet" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
                <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.65 0 0 0 0 0.55 0 0 0 0 0.97 0 0 0 0.3 0" result="c" />
                <feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g filter="url(#glow-mint)"><circle cx="15" cy="15" r="15" fill="#34d399" /></g>
            <g filter="url(#glow-amber)"><circle cx="61" cy="15" r="15" fill="#fbbf24" /></g>
            <g filter="url(#glow-violet)"><circle cx="38" cy="49" r="15" fill="#a78bfa" /></g>
          </svg>
        </div>

        {/* Wordmark */}
        <div
          className="text-[22px] tracking-[-0.5px] mb-1 text-[#e8eaf0]"
          style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}
        >
          Volley
        </div>

        <div className="text-gray-600 text-xs mb-5">No active sessions</div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-500 mb-4">
          <div>
            <kbd>⌘N</kbd> <span className="ml-1">New session</span>
          </div>
          <div>
            <kbd>⌘G</kbd> <span className="ml-1">Grid mode</span>
          </div>
          <div>
            <kbd>⌘W</kbd> <span className="ml-1">Close tab</span>
          </div>
          <div>
            <kbd>⌘]</kbd> <span className="ml-1">Next tab</span>
          </div>
          <div>
            <kbd>⌘B</kbd> <span className="ml-1">File browser</span>
          </div>
        </div>

        <button
          className="text-xs text-accent-bright hover:text-accent cursor-pointer bg-transparent border border-accent/30 rounded px-3 py-1 hover:bg-accent/10"
          onClick={openNewSessionModal}
        >
          + New session
        </button>
      </div>
    </div>
  );
}
