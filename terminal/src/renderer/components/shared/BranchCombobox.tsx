import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";

interface BranchComboboxProps {
  value: string;
  onChange: (branch: string) => void;
}

interface BranchEntry {
  name: string;
  remote: boolean;
}

export default function BranchCombobox({ value, onChange }: BranchComboboxProps) {
  const [branches, setBranches] = useState<BranchEntry[]>([]);
  const [currentBranch, setCurrentBranch] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.volley.git.listBranches().then(({ branches: b, current }) => {
      setBranches(b);
      setCurrentBranch(current);
    });
  }, []);

  // Compute dropdown position when open
  useEffect(() => {
    if (!open || !containerRef.current) {
      setDropdownPos(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [open]);

  // Filter branches by query
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, query]);

  // Group: locals first, then remotes
  const locals = useMemo(() => filtered.filter((b) => !b.remote), [filtered]);
  const remotes = useMemo(() => filtered.filter((b) => b.remote), [filtered]);
  const flatList = useMemo(() => [...locals, ...remotes], [locals, remotes]);

  // Clamp highlight when list changes
  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlightIdx}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  // Close on outside click (check both the input container and the portaled dropdown)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (name: string) => {
    onChange(name);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, flatList.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (flatList[highlightIdx]) select(flatList[highlightIdx].name);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  const displayValue = value || "";
  const placeholder = currentBranch ? `Current branch (${currentBranch})` : "Current branch";

  return (
    <div ref={containerRef} className="relative mt-3">
      <label className="block text-[11px] text-gray-500 mb-1.5 font-medium tracking-wide uppercase">
        Base branch
      </label>

      <div className="relative group">
        <div className="absolute -inset-px rounded-lg bg-accent/0 group-focus-within:bg-accent/5 transition-colors pointer-events-none" />

        <div className="relative flex items-center">
          {/* Branch icon */}
          <svg
            className="absolute left-3 w-3.5 h-3.5 text-gray-600 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="6" y1="3" x2="6" y2="15" strokeLinecap="round" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={open ? query : displayValue}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              setQuery("");
            }}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            onKeyDown={handleKeyDown}
            className="
              w-full pl-9 pr-8 py-2
              bg-[#0a0a0c]
              border border-white/[0.08]
              rounded-lg
              text-sm text-white/90
              placeholder:text-gray-600
              outline-none
              focus:border-accent/40
              transition-colors
              font-mono
            "
            style={{
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
            }}
          />

          {/* Clear button / chevron */}
          {value ? (
            <button
              type="button"
              className="absolute right-2.5 text-gray-600 hover:text-gray-400 transition-colors"
              onClick={() => {
                onChange("");
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <svg
              className="absolute right-2.5 w-3 h-3 text-gray-600 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown — portaled to body to escape modal overflow-hidden */}
      {open && dropdownPos && flatList.length > 0 && createPortal(
        <div
          ref={listRef}
          className="fixed max-h-48 overflow-y-auto rounded-lg border border-white/[0.08] py-1"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
            background: "linear-gradient(180deg, #0f0f12 0%, #0a0a0c 100%)",
            boxShadow: "0 12px 24px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {locals.length > 0 && remotes.length > 0 && (
            <div className="px-3 pt-1.5 pb-1 text-[10px] text-gray-600 font-medium tracking-wider uppercase">
              Local
            </div>
          )}

          {locals.map((b) => {
            const idx = flatList.indexOf(b);
            const isCurrent = b.name === currentBranch;
            return (
              <div
                key={b.name}
                data-idx={idx}
                className={`
                  flex items-center gap-2 px-3 py-1.5 text-sm font-mono cursor-pointer
                  ${idx === highlightIdx ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}
                `}
                onMouseEnter={() => setHighlightIdx(idx)}
                onClick={() => select(b.name)}
              >
                <span className={isCurrent ? "text-accent" : "text-white/80"}>
                  {b.name}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-accent/60">(current)</span>
                )}
              </div>
            );
          })}

          {remotes.length > 0 && (
            <div className="px-3 pt-2.5 pb-1 text-[10px] text-gray-600 font-medium tracking-wider uppercase">
              Remote
            </div>
          )}

          {remotes.map((b) => {
            const idx = flatList.indexOf(b);
            return (
              <div
                key={b.name}
                data-idx={idx}
                className={`
                  flex items-center gap-2 px-3 py-1.5 text-sm font-mono cursor-pointer
                  ${idx === highlightIdx ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}
                `}
                onMouseEnter={() => setHighlightIdx(idx)}
                onClick={() => select(b.name)}
              >
                <span className="text-white/60">{b.name}</span>
              </div>
            );
          })}
        </div>,
        document.body,
      )}

      {open && dropdownPos && query && flatList.length === 0 && createPortal(
        <div
          ref={listRef}
          className="fixed rounded-lg border border-white/[0.08] px-3 py-3 text-xs text-gray-600 font-mono"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
            background: "linear-gradient(180deg, #0f0f12 0%, #0a0a0c 100%)",
          }}
        >
          No branches matching "{query}"
        </div>,
        document.body,
      )}
    </div>
  );
}
