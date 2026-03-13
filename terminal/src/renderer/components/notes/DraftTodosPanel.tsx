import React, { useState, useCallback } from "react";
import { useNoteStore, type DraftTodoType } from "../../store/note-store";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";
import { useElapsedTick } from "../../hooks/use-elapsed-tick";
import VolleyLoader from "../shared/VolleyLoader";

const TYPE_OPTIONS: { value: DraftTodoType; label: string; activeColor: string }[] = [
  { value: "bug", label: "Bug", activeColor: "bg-red-500/20 text-red-300 ring-1 ring-red-500/40" },
  { value: "feature", label: "Feature", activeColor: "bg-accent-bright/20 text-accent-bright ring-1 ring-accent-bright/40" },
  { value: "improvement", label: "Improvement", activeColor: "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40" },
];

const PHASE_LABELS: Record<string, string> = {
  analyzing: "Analyzing note",
  scanning: "Scanning project files",
  reading: "Reading code",
  generating: "Generating todos",
};

function formatElapsed(startedAt: number): string {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface Props {
  noteId: string;
  noteTitle: string;
  onDone: () => void;
  onRetry?: () => void;
}

export default function DraftTodosPanel({ noteId, noteTitle, onDone, onRetry }: Props) {
  const extraction = useNoteStore((s) => s.extractions[noteId]);
  const updateDraft = useNoteStore((s) => s.updateDraft);
  const mergeDrafts = useNoteStore((s) => s.mergeDrafts);
  const markCreated = useNoteStore((s) => s.markCreated);
  const continueExtraction = useNoteStore((s) => s.continueExtraction);
  const createTodoFolder = useSessionStore((s) => s.createTodoFolder);
  const moveSessionToFolder = useSessionStore((s) => s.moveSessionToFolder);
  const [creating, setCreating] = useState(false);
  const addToast = useUiStore((s) => s.addToast);

  // Tick every second so elapsed time updates
  useElapsedTick();

  const drafts = extraction?.drafts ?? [];
  const extracting = extraction?.status === "extracting";
  const created = extraction?.status === "created";
  const error = extraction?.error ?? null;
  const needsMoreTurns = error === "needs_more_turns";
  const phase = extraction?.phase ?? null;
  const startedAt = extraction?.startedAt ?? null;

  const toggleSelect = useCallback((idx: number) => {
    updateDraft(noteId, idx, { selected: !drafts[idx]?.selected });
  }, [noteId, updateDraft, drafts]);

  const updateTitle = useCallback((idx: number, title: string) => {
    updateDraft(noteId, idx, { title });
  }, [noteId, updateDraft]);

  const updateType = useCallback((idx: number, type: DraftTodoType) => {
    updateDraft(noteId, idx, { type });
  }, [noteId, updateDraft]);

  const selectedCount = drafts.filter((d) => d.selected).length;

  const handleMerge = useCallback(() => {
    mergeDrafts(noteId);
  }, [noteId, mergeDrafts]);

  const handleCreate = async () => {
    const selected = drafts.filter((d) => d.selected && d.title.trim());
    if (selected.length === 0) return;

    setCreating(true);
    const createdIds: string[] = [];
    let failures = 0;

    // Create a folder named after the note
    const folderName = noteTitle.trim() || "Untitled";
    const folder = await createTodoFolder(folderName);

    for (const draft of selected) {
      try {
        const result = await window.volley.session.createTodo(draft.title.trim(), {
          todoType: draft.type,
          description: draft.description || undefined,
          sourceNoteId: noteId,
        });
        if (result.ok && result.id) {
          createdIds.push(result.id);
          // Move into the folder
          if (folder) {
            await moveSessionToFolder(result.id, folder.id);
          }
        } else {
          failures++;
        }
      } catch {
        failures++;
      }
    }

    // Link back to note and archive it
    if (createdIds.length > 0) {
      await window.volley.notes.addTodoIds(noteId, createdIds);
      useNoteStore.getState().addTodoIdsToNote(noteId, createdIds);
      await useNoteStore.getState().archiveNote(noteId);
      // Mark extraction as created (keeps results visible)
      markCreated(noteId, createdIds);
    }

    setCreating(false);

    if (failures > 0 && createdIds.length > 0) {
      addToast(`Created ${createdIds.length} todos in "${folderName}" (${failures} failed)`, "info");
    } else if (failures > 0) {
      addToast(`Failed to create todos`, "error");
    } else {
      addToast(`Created ${createdIds.length} todo${createdIds.length !== 1 ? "s" : ""} in "${folderName}"`, "success");
    }
  };

  // ── Created summary view ──────────────────────────────────────────────
  if (created) {
    const count = extraction.createdTodoIds?.length ?? 0;
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] flex-shrink-0">
          <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
            Created ({count})
          </span>
          <button
            onClick={onDone}
            className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-1 min-h-0">
          {drafts.filter((d) => d.selected).map((draft, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 border border-white/[0.04] bg-white/[0.01]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent-bright/60 flex-shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[12px] text-gray-400 truncate">{draft.title}</span>
              <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0 ${
                TYPE_OPTIONS.find((o) => o.value === draft.type)?.activeColor ?? ""
              }`}>
                {draft.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] flex-shrink-0">
        <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
          {extracting ? "Extracting" : `Results (${drafts.length})`}
        </span>
        <button
          onClick={onDone}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-1.5 min-h-0">
        {extracting && (
          <div className="flex flex-col items-center gap-3 py-6">
            <VolleyLoader size="sm" variant="mono" className="text-white/70" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[12px] text-white/90 font-medium">
                {phase ? PHASE_LABELS[phase] ?? "Processing" : "Extracting todos"}...
              </span>
              {startedAt && (
                <span className="text-[11px] text-white/40 tabular-nums">
                  {formatElapsed(startedAt)}
                </span>
              )}
            </div>
          </div>
        )}

        {error && !extracting && (
          <div className="flex flex-col items-center gap-3 py-6">
            {needsMoreTurns ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400/60">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-[12px] text-white/60 text-center max-w-[260px]">
                  Taking longer than expected — the agent needs more time to finish
                </span>
                <button
                  onClick={() => continueExtraction(noteId)}
                  className="px-3.5 py-1.5 rounded-md text-[11px] font-medium text-accent-bright bg-accent-bright/10 hover:bg-accent-bright/15 border border-accent-bright/20 transition-colors"
                >
                  Continue extraction
                </button>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400/60">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-[12px] text-white/60 text-center max-w-[240px]">{error}</span>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-3 py-1 rounded-md text-[11px] font-medium text-white/80 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] transition-colors"
                  >
                    Try again
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {drafts.map((draft, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 border transition-colors ${
              draft.selected
                ? "bg-white/[0.02] border-white/[0.06]"
                : "bg-transparent border-transparent opacity-50"
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleSelect(idx)}
              className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-white/[0.15] flex items-center justify-center cursor-pointer hover:border-white/[0.3] transition-colors"
            >
              {draft.selected && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent-bright">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateTitle(idx, e.target.value)}
                className="w-full bg-transparent text-[12px] text-gray-200 font-medium outline-none placeholder-gray-600"
                placeholder="Todo title..."
              />

              {/* Description — multiline */}
              {draft.description && (
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {draft.description}
                </p>
              )}

              {/* Type buttons */}
              <div className="flex items-center gap-1 pt-0.5">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateType(idx, opt.value)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                      draft.type === opt.value
                        ? opt.activeColor
                        : "text-gray-600 hover:text-gray-400 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer — always visible */}
      {drafts.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onDone}
              className="px-3 py-1 rounded text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
            >
              Clear
            </button>
            {selectedCount >= 2 && (
              <button
                onClick={handleMerge}
                className="px-3 py-1 rounded text-[11px] text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-colors border border-white/[0.08]"
              >
                Merge ({selectedCount})
              </button>
            )}
          </div>
          <button
            onClick={handleCreate}
            disabled={selectedCount === 0 || creating}
            className="px-4 py-1.5 rounded-md bg-accent-bright/15 text-accent-bright text-[12px] font-medium hover:bg-accent-bright/25 transition-colors cursor-pointer border border-accent-bright/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : `Create Selected (${selectedCount})`}
          </button>
        </div>
      )}
    </div>
  );
}
