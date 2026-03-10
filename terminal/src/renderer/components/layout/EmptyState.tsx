import React from "react";
import { useUiStore } from "../../store/ui-store";

export default function EmptyState() {
  const openNewSessionModal = useUiStore((s) => s.openNewSessionModal);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-2 flex justify-center">
          <svg
            width="40"
            height="36"
            viewBox="0 0 48 40"
            fill="none"
            className="text-accent-bright"
          >
            <path
              d="M8 4L24 20L8 36"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.25"
            />
            <path
              d="M18 4L34 20L18 36"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
            <path
              d="M28 4L44 20L28 36"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          className="text-xs font-bold uppercase tracking-[4px] mb-1 bg-gradient-to-r from-accent-bright to-accent-dim bg-clip-text text-transparent"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          VOLLEY
        </div>
        <div className="text-gray-600 text-xs mb-4">No active sessions</div>
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
