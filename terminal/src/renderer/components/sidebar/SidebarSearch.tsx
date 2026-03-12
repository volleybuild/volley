import React, { useRef, useState } from "react";
import { useUiStore } from "../../store/ui-store";

const SEARCH_INPUT_ID = "sidebar-search-input";

export function focusSidebarSearch() {
  const el = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
  el?.focus();
}

export default function SidebarSearch() {
  const query = useUiStore((s) => s.sidebarSearch);
  const setQuery = useUiStore((s) => s.setSidebarSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const active = focused || !!query;

  return (
    <div className="px-3 pb-1 flex-shrink-0">
      <div className="flex items-center gap-1.5 px-2 py-[5px] rounded-md bg-white/[0.03]">
        {/* Search icon */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`flex-shrink-0 transition-colors duration-150 ${
            active ? "text-accent-bright/60" : "text-gray-600"
          }`}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          id={SEARCH_INPUT_ID}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setQuery("");
              inputRef.current?.blur();
            }
          }}
          placeholder="Filter..."
          className="flex-1 min-w-0 bg-transparent text-[12px] text-gray-300 outline-none placeholder:text-gray-600 placeholder:italic tracking-wide"
        />

        {/* Clear button / shortcut hint — both always in DOM to prevent layout shift */}
        <div className="flex-shrink-0 relative w-4 h-4 flex items-center justify-center">
          <button
            className={`absolute inset-0 flex items-center justify-center text-gray-600 hover:text-gray-400 transition-colors cursor-pointer rounded hover:bg-white/[0.06] ${query ? "" : "invisible"}`}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <kbd className={`text-[10px] text-gray-700 tracking-tight ${query || focused ? "invisible" : ""}`}>
            &#8984;F
          </kbd>
        </div>
      </div>
    </div>
  );
}
