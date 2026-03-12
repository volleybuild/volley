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

interface Attachment {
  base64: string;
  mediaType: string;
  name: string;
}

interface Props {
  sessionId: string;
  disabled?: boolean;
}

export default function TerminalPrompt({ sessionId, disabled = false }: Props) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const status = useAgentStore((s) => s.status[sessionId] || "idle");
  const isBusy =
    status === "thinking" || status === "coding" || status === "waiting";

  // Skill autocomplete state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [suggestions, setSuggestions] = useState<Skill[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Determine if we're in slash-command mode
  const isSlashMode = value.startsWith("/") && !value.includes(" ");

  // Load skills on mount
  useEffect(() => {
    loadSkills().then(setSkills);
  }, []);

  // Auto-focus when idle
  useEffect(() => {
    if (!isBusy && !disabled) inputRef.current?.focus();
  }, [isBusy, disabled]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  // Update suggestions when in slash mode
  useEffect(() => {
    if (!isSlashMode) {
      setSuggestions([]);
      return;
    }
    const query = value.slice(1);
    const matches = filterSkills(query, skills);
    setSuggestions(matches);
    setSelectedIdx(0);
  }, [value, skills, isSlashMode]);

  const insertSkill = useCallback((skill: Skill) => {
    setValue(`/${skill.name} `);
    inputRef.current?.focus();
  }, []);

  // Image attachment handlers
  const addImageFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        const mediaType = file.type || "image/png";
        setAttachments((prev) => [
          ...prev,
          { base64, mediaType, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = e.clipboardData.files;
      if (files.length > 0) {
        const hasImages = Array.from(files).some((f) =>
          f.type.startsWith("image/"),
        );
        if (hasImages) {
          e.preventDefault();
          addImageFiles(files);
        }
      }
    },
    [addImageFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addImageFiles(e.dataTransfer.files);
      }
    },
    [addImageFiles],
  );

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || isBusy || disabled) return;

    const currentAttachments = [...attachments];
    const currentImages = currentAttachments.map((a) => ({
      base64: a.base64,
      mediaType: a.mediaType,
    }));

    // Save images and build augmented prompt
    let finalPrompt = trimmed;
    if (currentAttachments.length > 0) {
      const savedPaths: string[] = [];
      for (const att of currentAttachments) {
        const result = await window.volley.agent.saveImage(
          sessionId,
          att.base64,
          att.mediaType,
        );
        if (result.path) savedPaths.push(result.path);
      }
      if (savedPaths.length > 0) {
        const imageRefs = savedPaths
          .map((p) => `[The user attached an image: ${p}]`)
          .join("\n");
        finalPrompt = finalPrompt
          ? `${imageRefs}\n\n${finalPrompt}`
          : imageRefs;
      }
    }

    const allSkills = getCachedSkills();
    const matched = matchSkill(trimmed, allSkills);

    const displayContent = trimmed || "(image attached)";
    const messageImages = currentImages.length > 0 ? currentImages : undefined;

    if (matched) {
      const expandedPrompt = expandSkillPrompt(matched.skill, matched.args);
      const skillPrompt =
        currentAttachments.length > 0
          ? finalPrompt.replace(trimmed, expandedPrompt)
          : expandedPrompt;
      window.volley.agent.send(sessionId, skillPrompt, messageImages);
      useAgentStore.getState().addMessage(sessionId, {
        type: "user",
        content: displayContent,
        images: messageImages,
      });
    } else {
      window.volley.agent.send(sessionId, finalPrompt, messageImages);
      useAgentStore.getState().addMessage(sessionId, {
        type: "user",
        content: displayContent,
        images: messageImages,
      });
    }

    useAgentStore.getState().setStatus(sessionId, "thinking");
    setValue("");
    setAttachments([]);
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
        setSelectedIdx(
          (i) => (i - 1 + suggestions.length) % suggestions.length,
        );
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

  const handleStop = () => {
    window.volley.agent.interrupt(sessionId);
    useAgentStore.getState().setStatus(sessionId, "idle");
  };

  return (
    <div
      className={`flex-shrink-0 border-t bg-vo-base relative ${isDragging ? "border-accent-bright/50" : "border-white/[0.04]"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attachment thumbnails */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-4 pt-2 flex-wrap">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              <img
                src={`data:${att.mediaType};base64,${att.base64}`}
                alt={att.name}
                className="w-12 h-12 object-cover rounded border border-white/[0.08]"
              />
              <button
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] leading-none opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => removeAttachment(i)}
              >
                ×
              </button>
              <div className="text-[9px] text-gray-600 text-center mt-0.5 truncate max-w-12">
                {att.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skill suggestions - inline section above hints */}
      {isSlashMode && (
        <SkillSuggestions
          suggestions={suggestions}
          selectedIdx={selectedIdx}
          onSelect={insertSkill}
          onHover={setSelectedIdx}
        />
      )}

      {/* Hints row */}
      <div className="px-4 pt-3 pb-1.5 min-h-[24px]">
        {isBusy ? (
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-bright animate-pulse" />
            <span>
              {status === "thinking"
                ? "Thinking..."
                : status === "coding"
                  ? "Using tools..."
                  : "Waiting..."}
            </span>
            <span className="text-gray-700">·</span>
            <button
              className="text-red-400/70 hover:text-red-400 transition-colors cursor-pointer"
              onClick={handleStop}
            >
              stop
            </button>
          </div>
        ) : disabled ? (
          <div className="text-[11px] text-gray-600">
            Configure API key in Settings to use the agent
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[11px] text-gray-600">
            <span className="flex items-center gap-1">
              <kbd className="text-gray-500 bg-white/[0.06] px-1.5 py-0.5 rounded text-[11px] leading-none border border-white/[0.06]">/</kbd> skills
            </span>
            <span className="flex items-center gap-1">
              <kbd className="text-gray-500 bg-white/[0.06] px-1.5 py-0.5 rounded text-[11px] leading-none border border-white/[0.06]">⌘V</kbd> paste image
            </span>
            <span className="flex items-center gap-1">
              <kbd className="text-gray-500 bg-white/[0.06] px-1.5 py-0.5 rounded text-[11px] leading-none border border-white/[0.06]">↵</kbd> send
            </span>
          </div>
        )}
      </div>

      {/* Input line */}
      <div className="flex items-start gap-2 px-4 pt-1.5 pb-3">
        <span
          className={`text-[15px] font-mono font-bold select-none leading-[20px] flex-shrink-0 ${
            isBusy
              ? "text-gray-700"
              : disabled
                ? "text-gray-700"
                : "text-accent-bright/70"
          }`}
        >
          ›
        </span>
        <div className="flex-1 relative">
          {/* Highlighted overlay */}
          {value.startsWith("/") && value.includes(" ") && (
            <div className="absolute inset-0 pointer-events-none text-[13px] font-mono leading-[20px] whitespace-pre-wrap break-words">
              <HighlightedInputOverlay
                value={value}
                className="text-gray-200"
              />
            </div>
          )}
          <textarea
            ref={inputRef}
            className={`w-full bg-transparent text-[13px] font-mono leading-[20px] placeholder-gray-600 resize-none focus:outline-none disabled:text-gray-600 caret-accent-bright p-0 m-0 ${
              value.startsWith("/") && value.includes(" ")
                ? "text-transparent"
                : "text-gray-200"
            }`}
            placeholder={
              isBusy
                ? ""
                : disabled
                  ? ""
                  : "Ask something, or type / for skills"
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isBusy || disabled}
            rows={1}
          />
        </div>
      </div>
    </div>
  );
}
