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

interface Attachment {
  base64: string;
  mediaType: string;
  name: string;
}

interface Props {
  sessionId: string;
  disabled?: boolean;
}

export default function PromptInput({ sessionId, disabled = false }: Props) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const status = useAgentStore((s) => s.status[sessionId] || "idle");
  const isBusy = status === "thinking" || status === "coding" || status === "waiting";
  const [isDragging, setIsDragging] = useState(false);

  // Skill autocomplete state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [suggestions, setSuggestions] = useState<Skill[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load skills on mount
  useEffect(() => {
    loadSkills().then(setSkills);
  }, []);

  // Auto-focus when idle
  useEffect(() => {
    if (!isBusy) textareaRef.current?.focus();
  }, [isBusy]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  // Update suggestions when value changes
  useEffect(() => {
    if (!value.startsWith("/")) {
      setShowDropdown(false);
      return;
    }
    // Extract the command portion (first word after /)
    const spaceIdx = value.indexOf(" ");
    const query = spaceIdx === -1 ? value.slice(1) : null;

    // Only show autocomplete while typing the command name (no space yet)
    if (query === null) {
      setShowDropdown(false);
      return;
    }

    const matches = filterSkills(query, skills);
    setSuggestions(matches);
    setSelectedIdx(0);
    setShowDropdown(matches.length > 0);
  }, [value, skills]);

  // Scroll selected item into view
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current) return;
    const el = dropdownRef.current.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx, showDropdown]);

  const insertSkill = useCallback(
    (skill: Skill) => {
      setValue(`/${skill.name} `);
      setShowDropdown(false);
      textareaRef.current?.focus();
    },
    []
  );

  const addImageFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // dataUrl format: data:image/png;base64,iVBOR...
        const base64 = dataUrl.split(",")[1];
        const mediaType = file.type || "image/png";
        setAttachments((prev) => [...prev, { base64, mediaType, name: file.name }]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = e.clipboardData.files;
      if (files.length > 0) {
        const hasImages = Array.from(files).some((f) => f.type.startsWith("image/"));
        if (hasImages) {
          e.preventDefault();
          addImageFiles(files);
        }
      }
    },
    [addImageFiles]
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
    [addImageFiles]
  );

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || isBusy) return;

    const currentAttachments = [...attachments];
    const currentImages = currentAttachments.map((a) => ({ base64: a.base64, mediaType: a.mediaType }));

    // Save images and build augmented prompt
    let finalPrompt = trimmed;
    if (currentAttachments.length > 0) {
      const savedPaths: string[] = [];
      for (const att of currentAttachments) {
        const result = await window.volley.agent.saveImage(sessionId, att.base64, att.mediaType);
        if (result.path) savedPaths.push(result.path);
      }
      if (savedPaths.length > 0) {
        const imageRefs = savedPaths.map((p) => `[The user attached an image: ${p}]`).join("\n");
        finalPrompt = finalPrompt ? `${imageRefs}\n\n${finalPrompt}` : imageRefs;
      }
    }

    const allSkills = getCachedSkills();
    const matched = matchSkill(trimmed, allSkills);

    const displayContent = trimmed || "(image attached)";
    const messageImages = currentImages.length > 0 ? currentImages : undefined;

    if (matched) {
      const expandedPrompt = expandSkillPrompt(matched.skill, matched.args);
      // For skills with images, prepend image refs to the expanded prompt
      const skillPrompt = currentAttachments.length > 0
        ? finalPrompt.replace(trimmed, expandedPrompt)
        : expandedPrompt;
      window.volley.agent.send(sessionId, skillPrompt, messageImages);
      useAgentStore.getState().addMessage(sessionId, { type: "user", content: displayContent, images: messageImages });
    } else {
      window.volley.agent.send(sessionId, finalPrompt, messageImages);
      useAgentStore.getState().addMessage(sessionId, { type: "user", content: displayContent, images: messageImages });
    }

    useAgentStore.getState().setStatus(sessionId, "thinking");
    setValue("");
    setAttachments([]);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && suggestions.length > 0) {
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
        setShowDropdown(false);
        return;
      }
    }

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
      className={`flex-shrink-0 border-t bg-vo-surface px-3 py-2 ${isDragging ? "border-accent-bright/50" : "border-white/[0.06]"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attachment thumbnails */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              <img
                src={`data:${att.mediaType};base64,${att.base64}`}
                alt={att.name}
                className="w-16 h-16 object-cover rounded-lg border border-white/[0.08]"
              />
              <button
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => removeAttachment(i)}
              >
                &times;
              </button>
              <div className="text-[9px] text-gray-500 text-center mt-0.5 truncate max-w-16">
                {att.name}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2">
        {/* Skill autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 right-12 mb-1 bg-vo-surface border border-white/[0.08] rounded-lg shadow-xl shadow-black/40 py-1 z-50 max-h-52 overflow-y-auto"
          >
            {suggestions.map((skill, i) => (
              <button
                key={skill.name}
                className={`flex flex-col w-full px-3 py-1.5 text-left transition-colors duration-75 cursor-pointer ${
                  i === selectedIdx
                    ? "bg-white/[0.08] text-gray-100"
                    : "text-gray-400 hover:bg-white/[0.04]"
                }`}
                onMouseEnter={() => setSelectedIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep textarea focus
                  insertSkill(skill);
                }}
              >
                <span className="text-[12px] font-mono text-gray-200">
                  /{skill.name}
                </span>
                <span className="text-[10px] text-gray-500 leading-tight truncate">
                  {skill.description}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 flex items-start gap-2 bg-vo-input border border-vo-border rounded-lg px-3 py-2 focus-within:border-accent-bright/40 focus-within:ring-1 focus-within:ring-accent-bright/20">
          <span className="text-[13px] text-gray-500 select-none flex-shrink-0 font-mono leading-[21px]">›</span>
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent text-[13px] text-gray-200 font-mono placeholder-gray-600 resize-none focus:outline-none disabled:opacity-40 leading-[21px]"
            placeholder={disabled ? "Configure API key in Settings" : isBusy ? "Working..." : "Ask something, or type / for skills"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isBusy || disabled}
            rows={1}
          />
        </div>
        {isBusy ? (
          <button
            className="flex-shrink-0 px-3 py-2 rounded-lg text-[12px] font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer transition-colors"
            onClick={handleStop}
          >
            Stop
          </button>
        ) : (
          <button
            className="flex-shrink-0 px-3 py-2 rounded-lg text-[12px] font-medium bg-accent-bright/10 border border-accent-bright/30 text-accent-bright hover:bg-accent-bright/20 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-default"
            onClick={handleSubmit}
            disabled={!value.trim()}
          >
            Send
          </button>
        )}
      </div>
      {isBusy && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-bright animate-pulse" />
          {status === "thinking" ? "Thinking..." : status === "coding" ? "Using tools..." : "Waiting..."}
        </div>
      )}
    </div>
  );
}
