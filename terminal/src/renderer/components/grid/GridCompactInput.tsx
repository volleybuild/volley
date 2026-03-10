import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAgentStore } from "../../store/agent-store";
import {
  loadSkills,
  getCachedSkills,
  filterSkills,
  matchSkill,
  expandSkillPrompt,
  type Skill,
} from "../../skills/registry";
import SkillSuggestions from "../shared/SkillSuggestions";
import { HighlightedInputOverlay } from "../shared/HighlightedInput";

interface Props {
  sessionId: string;
  disabled?: boolean;
  onFocus?: () => void;
}

/**
 * Compact single-line input for grid cells.
 * - No hints row, no attachment support
 * - Shows "Working..." + stop button when busy
 * - Supports skill autocomplete (uses shared SkillSuggestions)
 */
export default function GridCompactInput({
  sessionId,
  disabled = false,
  onFocus,
}: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const status = useAgentStore((s) => s.status[sessionId] || "idle");
  const isBusy =
    status === "thinking" || status === "coding" || status === "waiting";
  const isWaitingForUser = status === "waiting";

  // Skill autocomplete state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [suggestions, setSuggestions] = useState<Skill[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const isSlashMode = value.startsWith("/") && !value.includes(" ");

  // Load skills on mount
  useEffect(() => {
    loadSkills().then(setSkills);
  }, []);

  // Update suggestions when in slash mode
  useEffect(() => {
    if (!isSlashMode) {
      setSuggestions([]);
      return;
    }
    const query = value.slice(1);
    const matches = filterSkills(query, skills);
    setSuggestions(matches.slice(0, 5)); // Limit to 5 in grid
    setSelectedIdx(0);
  }, [value, skills, isSlashMode]);

  const insertSkill = useCallback((skill: Skill) => {
    setValue(`/${skill.name} `);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || isBusy || disabled) return;

    const allSkills = getCachedSkills();
    const matched = matchSkill(trimmed, allSkills);

    if (matched) {
      const expandedPrompt = expandSkillPrompt(matched.skill, matched.args);
      window.volley.agent.send(sessionId, expandedPrompt);
      useAgentStore
        .getState()
        .addMessage(sessionId, { type: "user", content: trimmed });
    } else {
      window.volley.agent.send(sessionId, trimmed);
      useAgentStore
        .getState()
        .addMessage(sessionId, { type: "user", content: trimmed });
    }

    useAgentStore.getState().setStatus(sessionId, "thinking");
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Slash mode navigation
    if (isSlashMode && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        insertSkill(suggestions[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setValue("");
        return;
      }
    }

    // Normal submit
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.volley.agent.interrupt(sessionId);
    useAgentStore.getState().setStatus(sessionId, "idle");
  };

  const handleFocus = () => {
    onFocus?.();
  };

  // Determine placeholder based on status
  const getPlaceholder = () => {
    if (isWaitingForUser) return "Reply to agent...";
    if (status === "idle") return "Ask something...";
    return "Follow up...";
  };

  // Busy state: show "Working..." + stop
  if (isBusy && !isWaitingForUser) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-vo-surface border-t border-white/[0.04] text-[10px]">
        <span className="text-gray-600">›</span>
        <span className="text-gray-500 flex-1">Working...</span>
        <button
          className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 px-1 py-0.5 rounded transition-colors cursor-pointer"
          onClick={handleStop}
        >
          stop
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Skill suggestions popup - positioned above input */}
      {isSlashMode && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 z-10">
          <SkillSuggestions
            suggestions={suggestions}
            selectedIdx={selectedIdx}
            onSelect={insertSkill}
            onHover={setSelectedIdx}
            compact
          />
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-vo-surface border-t border-white/[0.04]">
        <span
          className={`text-[11px] flex-shrink-0 ${
            isWaitingForUser ? "text-accent-bright" : "text-gray-600"
          }`}
        >
          ›
        </span>
        <div className="flex-1 relative min-w-0">
          {/* Highlighted overlay */}
          {value.startsWith("/") && value.includes(" ") && (
            <div className="absolute inset-0 pointer-events-none text-[10px] font-mono truncate">
              <HighlightedInputOverlay value={value} className="text-gray-200" />
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            className={`w-full bg-transparent text-[10px] font-mono placeholder-gray-600 focus:outline-none disabled:text-gray-600 caret-accent-bright ${
              value.startsWith("/") && value.includes(" ") ? "text-transparent" : "text-gray-200"
            }`}
            placeholder={getPlaceholder()}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            disabled={disabled}
          />
        </div>
        <span className="text-[9px] text-gray-700 opacity-0 group-focus-within:opacity-100 transition-opacity flex-shrink-0">
          ↵
        </span>
      </div>
    </div>
  );
}
