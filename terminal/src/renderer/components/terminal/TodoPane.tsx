import React, { useState, useRef, useEffect } from "react";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";
import { useNoteStore } from "../../store/note-store";
import type { TodoType, PlanStatus } from "../../store/types";

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

function PlanStatusIndicator({ status }: { status?: PlanStatus }) {
  if (!status) return null;

  const configs: Record<PlanStatus, { symbol: string; label: string; className: string }> = {
    pending: { symbol: "\u25CC", label: "Plan pending", className: "text-gray-500" },
    planning: { symbol: "\u25D1", label: "Planning...", className: "text-accent-bright animate-pulse" },
    ready: { symbol: "\u25CF", label: "Plan ready", className: "text-green-400" },
    failed: { symbol: "\u2715", label: "Plan failed", className: "text-red-400" },
  };

  const cfg = configs[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${cfg.className}`} title={cfg.label}>
      <span className="text-sm">{cfg.symbol}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

function PlanMarkdownView({ markdown }: { markdown: string }) {
  // Simple markdown section parser
  const sections = markdown.split(/^(## .+)$/m).filter(Boolean);
  const parsed: { heading?: string; content: string }[] = [];

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i].trim();
    if (s.startsWith("## ")) {
      parsed.push({ heading: s.replace("## ", ""), content: sections[i + 1]?.trim() || "" });
      i++; // skip content block
    } else if (parsed.length === 0) {
      parsed.push({ content: s });
    }
  }

  return (
    <div className="w-full space-y-3">
      {parsed.map((section, i) => (
        <div key={i}>
          {section.heading && (
            <h3 className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              {section.heading}
            </h3>
          )}
          <div className="text-[12px] text-gray-400 leading-relaxed whitespace-pre-wrap">
            {section.content}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const planningEnabled = useUiStore((s) => s.planningEnabled);
  const addToast = useUiStore((s) => s.addToast);
  const updateSessionTask = useSessionStore((s) => s.updateSessionTask);
  const updateSessionDescription = useSessionStore((s) => s.updateSessionDescription);
  const updateSessionTodoType = useSessionStore((s) => s.updateSessionTodoType);
  const updateSessionPlan = useSessionStore((s) => s.updateSessionPlan);

  const [editingPlan, setEditingPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState("");
  const planTextareaRef = useRef<HTMLTextAreaElement>(null);

  if (!session) return null;

  const todoType = session.todoType || "feature";
  const typeConfig = TYPE_CONFIG[todoType];

  const handleStart = () => {
    window.volley.session.startTodo(sessionId);
  };

  const handleDelete = async () => {
    await window.volley.session.delete(sessionId);
  };

  const handlePlan = async () => {
    const result = await window.volley.planning.planOne(sessionId);
    if (!result.ok) {
      addToast(result.error || "Failed to start planning", "error");
    }
  };

  const handleCancelPlan = async () => {
    await window.volley.planning.cancel(sessionId);
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

  const handleEditPlan = () => {
    setPlanDraft(session.planMarkdown || "");
    setEditingPlan(true);
    setTimeout(() => planTextareaRef.current?.focus(), 0);
  };

  const handleSavePlan = () => {
    setEditingPlan(false);
    const trimmed = planDraft.trim();
    if (trimmed !== (session.planMarkdown || "").trim()) {
      updateSessionPlan(sessionId, trimmed);
      window.volley.session.updatePlan(sessionId, trimmed);
    }
  };

  const showPlanButton = planningEnabled && (!session.planStatus || session.planStatus === "pending");
  const showCancelButton = session.planStatus === "planning";
  const showRetryButton = planningEnabled && session.planStatus === "failed";
  const showReplanButton = planningEnabled && session.planStatus === "ready";

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

        {/* Plan status — hide "pending" when planning is disabled */}
        {session.planStatus && (planningEnabled || session.planStatus !== "pending") && (
          <PlanStatusIndicator status={session.planStatus} />
        )}

        {/* Hint when planning is disabled but todo has pending plan */}
        {!planningEnabled && session.planStatus === "pending" && (
          <button
            onClick={() => useUiStore.getState().openSettings()}
            className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors cursor-pointer underline underline-offset-2"
          >
            Enable AI Planning in Settings to generate plans
          </button>
        )}

        {/* Description — always shown, editable */}
        <EditableDescription value={session.description || ""} onSave={handleSaveDescription} />

        {/* Plan markdown */}
        {session.planStatus === "ready" && session.planMarkdown && (
          <div className="w-full rounded-lg bg-white/[0.03] border border-accent-bright/[0.15] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Plan</span>
              <button
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                onClick={editingPlan ? handleSavePlan : handleEditPlan}
              >
                {editingPlan ? "Save" : "Edit"}
              </button>
            </div>
            {editingPlan ? (
              <textarea
                ref={planTextareaRef}
                className="w-full text-[12px] text-gray-400 leading-relaxed bg-transparent outline-none resize-none font-mono min-h-[200px]"
                value={planDraft}
                onChange={(e) => setPlanDraft(e.target.value)}
                onBlur={handleSavePlan}
                onKeyDown={(e) => { if (e.key === "Escape") { setEditingPlan(false); } }}
              />
            ) : (
              <PlanMarkdownView markdown={session.planMarkdown} />
            )}
          </div>
        )}

        {/* Planning animation */}
        {session.planStatus === "planning" && (
          <div className="w-full rounded-lg bg-white/[0.03] border border-accent-bright/[0.1] px-4 py-4 flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-bright animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-bright animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-bright animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[12px] text-accent-bright/80">Generating implementation plan...</span>
          </div>
        )}

        {/* Failed state */}
        {session.planStatus === "failed" && (
          <div className="w-full rounded-lg bg-red-500/[0.05] border border-red-500/[0.15] px-4 py-3 space-y-1.5">
            <p className="text-[12px] text-red-400 font-medium">Plan generation failed</p>
            {session.planError && (
              <p className="text-[11px] text-red-400/70 font-mono break-all">{session.planError}</p>
            )}
            <p className="text-[10px] text-gray-500">
              Check your AI configuration in{" "}
              <button
                onClick={() => useUiStore.getState().openSettings()}
                className="text-gray-400 hover:text-gray-300 underline underline-offset-2 cursor-pointer"
              >
                Settings
              </button>
              {" "}or view the{" "}
              <button
                onClick={() => window.volley.config.openLogFile()}
                className="text-gray-400 hover:text-gray-300 underline underline-offset-2 cursor-pointer"
              >
                log file
              </button>
              {" "}for details.
            </p>
          </div>
        )}

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
          {showPlanButton && (
            <button
              onClick={handlePlan}
              className="px-4 py-1.5 rounded-md bg-blue-500/10 text-blue-400 text-[12px] font-medium hover:bg-blue-500/20 transition-colors cursor-pointer border border-blue-500/20"
            >
              Plan
            </button>
          )}
          {showCancelButton && (
            <button
              onClick={handleCancelPlan}
              className="px-4 py-1.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[12px] font-medium hover:bg-yellow-500/20 transition-colors cursor-pointer border border-yellow-500/20"
            >
              Cancel
            </button>
          )}
          {showRetryButton && (
            <button
              onClick={handlePlan}
              className="px-4 py-1.5 rounded-md bg-blue-500/10 text-blue-400 text-[12px] font-medium hover:bg-blue-500/20 transition-colors cursor-pointer border border-blue-500/20"
            >
              Retry
            </button>
          )}
          {showReplanButton && (
            <button
              onClick={handlePlan}
              className="px-4 py-1.5 rounded-md bg-white/[0.04] text-gray-400 text-[12px] font-medium hover:text-gray-300 hover:bg-white/[0.06] transition-colors cursor-pointer border border-white/[0.06]"
            >
              Re-plan
            </button>
          )}
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
