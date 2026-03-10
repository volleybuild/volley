import React, { useRef, useEffect } from "react";
import type { Skill } from "../../skills/registry";

interface Props {
  suggestions: Skill[];
  selectedIdx: number;
  onSelect: (skill: Skill) => void;
  onHover: (idx: number) => void;
  /** Compact mode for grid cells - smaller text, tighter padding */
  compact?: boolean;
}

/**
 * Shared skill suggestions dropdown.
 * Used by both TerminalPrompt and GridCompactInput.
 */
export default function SkillSuggestions({
  suggestions,
  selectedIdx,
  onSelect,
  onHover,
  compact = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (suggestions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`max-h-40 overflow-y-auto ${
        compact
          ? "bg-vo-elevated border border-white/[0.08] rounded"
          : "border-b border-white/[0.04]"
      }`}
    >
      {suggestions.map((skill, i) => (
        <button
          key={skill.name}
          className={`flex items-center gap-3 w-full text-left transition-colors cursor-pointer ${
            compact ? "px-2.5 py-1.5" : "px-4 py-1.5"
          } ${
            i === selectedIdx
              ? "bg-white/[0.04]"
              : "hover:bg-white/[0.02]"
          }`}
          onMouseEnter={() => onHover(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(skill);
          }}
        >
          <span
            className={`font-mono flex-shrink-0 ${
              compact ? "text-[10px]" : "text-[12px]"
            } ${i === selectedIdx ? "text-accent-bright" : "text-gray-400"}`}
          >
            /{skill.name}
          </span>
          <span
            className={`text-gray-600 truncate ${
              compact ? "text-[9px]" : "text-[10px]"
            }`}
          >
            {skill.description}
          </span>
        </button>
      ))}
    </div>
  );
}
