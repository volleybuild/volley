import React, { useState, useRef, useEffect } from "react";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";
import { useNoteStore } from "../../store/note-store";
import type { TodoType } from "../../store/types";

interface Props {
  sessionId: string;
  visible: boolean;
  className?: string;
}

const TODO_TYPES: TodoType[] = ["bug", "feature", "improvement"];

const TYPE_CONFIG: Record<TodoType, { label: string; color: string; bg: string; icon: string }> = {
  bug: {
    label: "Bug",
    color: "text-red-400",
    bg: "bg-red-500/15 border-red-500/25",
    icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>`,
  },
  feature: {
    label: "Feature",
    color: "text-accent-bright",
    bg: "bg-accent-bright/15 border-accent-bright/25",
    icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  },
  improvement: {
    label: "Improvement",
    color: "text-blue-400",
    bg: "bg-blue-500/15 border-blue-500/25",
    icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  },
};

function EditableTitle({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  };

  if (!editing) {
    return (
      <p
        className="text-[16px] text-gray-200 font-medium text-center leading-snug cursor-pointer hover:text-white transition-colors"
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value}
      </p>
    );
  }

  return (
    <input
      ref={inputRef}
      className="text-[16px] text-gray-200 font-medium text-center leading-snug bg-transparent border-b border-accent-bright/40 outline-none w-full max-w-lg"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
    />
  );
}

function EditableDescription({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }
  };

  useEffect(autoResize, [draft]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed !== (value || "").trim()) onSave(trimmed);
  };

  return (
    <div className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3">
      <textarea
        ref={textareaRef}
        className="w-full text-[12px] text-gray-400 leading-relaxed bg-transparent outline-none resize-none placeholder-gray-600"
        placeholder="Add a description..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        rows={1}
      />
    </div>
  );
}

export default function TodoPane({ sessionId, visible, className = "" }: Props) {
  const session = useSessionStore((s) => s.sessions.get(sessionId));
  const addToast = useUiStore((s) => s.addToast);
  const updateSessionTask = useSessionStore((s) => s.updateSessionTask);
  const updateSessionDescription = useSessionStore((s) => s.updateSessionDescription);
  const updateSessionTodoType = useSessionStore((s) => s.updateSessionTodoType);

  if (!session) return null;

  const todoType = session.todoType || "feature";
  const typeConfig = TYPE_CONFIG[todoType];

  const handleStart = () => {
    window.volley.session.startTodo(sessionId);
  };

  const handleDelete = async () => {
    await window.volley.session.delete(sessionId);
  };

  const handleSaveTitle = (task: string) => {
    updateSessionTask(sessionId, task);
    window.volley.session.updateTodo(sessionId, { task });
  };

  const handleSaveDescription = (description: string) => {
    updateSessionDescription(sessionId, description);
    window.volley.session.updateTodo(sessionId, { description });
  };

  const handleCycleType = () => {
    const idx = TODO_TYPES.indexOf(todoType);
    const next = TODO_TYPES[(idx + 1) % TODO_TYPES.length];
    updateSessionTodoType(sessionId, next);
    window.volley.session.updateTodo(sessionId, { todoType: next });
  };

  return (
    <div
      className={`flex flex-col items-center justify-start overflow-y-auto ${className}`}
      style={{ display: visible ? "flex" : "none" }}
    >
      <div className="flex flex-col items-center gap-5 max-w-2xl w-full px-6 py-8">
        {/* Type badge — clickable to cycle */}
        <button
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-colors hover:opacity-80 ${typeConfig.bg} ${typeConfig.color}`}
          onClick={handleCycleType}
          title="Click to change type"
        >
          <span dangerouslySetInnerHTML={{ __html: typeConfig.icon }} />
          {typeConfig.label}
        </button>

        {/* Title — click to edit */}
        <EditableTitle value={session.task} onSave={handleSaveTitle} />

        {/* Description — always shown, editable */}
        <EditableDescription value={session.description || ""} onSave={handleSaveDescription} />

        {/* Source note link */}
        {session.sourceNoteId && (
          <SourceNoteLink sourceNoteId={session.sourceNoteId} />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleStart}
            className="px-4 py-1.5 rounded-md bg-accent-bright/15 text-accent-bright text-[12px] font-medium hover:bg-accent-bright/25 transition-colors cursor-pointer border border-accent-bright/20"
          >
            Start
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-1.5 rounded-md bg-white/[0.04] text-gray-500 text-[12px] font-medium hover:text-red-400 hover:bg-red-500/[0.08] transition-colors cursor-pointer border border-white/[0.06]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SourceNoteLink({ sourceNoteId }: { sourceNoteId: string }) {
  const note = useNoteStore((s) => s.notes.find((n) => n.id === sourceNoteId));
  const setActiveNote = useNoteStore((s) => s.setActiveNote);

  const handleClick = () => {
    useSessionStore.setState({ activeSessionId: null });
    setActiveNote(sourceNoteId);
  };

  return (
    <button
      onClick={handleClick}
      className="text-[11px] text-gray-500 hover:text-accent-bright transition-colors cursor-pointer underline underline-offset-2"
    >
      From note: {note?.title || sourceNoteId}
    </button>
  );
}
