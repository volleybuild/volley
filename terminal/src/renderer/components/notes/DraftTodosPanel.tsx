import React, { useState, useEffect, useCallback } from "react";
import { useNoteStore } from "../../store/note-store";
import { useUiStore } from "../../store/ui-store";

type TodoType = "bug" | "feature" | "improvement";

interface DraftTodo {
  title: string;
  type: TodoType;
  description: string;
  selected: boolean;
}

interface Props {
  noteId: string;
  noteContent: string;
  onDone: () => void;
}

const TYPE_OPTIONS: { value: TodoType; label: string; activeColor: string }[] = [
  { value: "bug", label: "Bug", activeColor: "bg-red-500/20 text-red-300 ring-1 ring-red-500/40" },
  { value: "feature", label: "Feature", activeColor: "bg-accent-bright/20 text-accent-bright ring-1 ring-accent-bright/40" },
  { value: "improvement", label: "Improvement", activeColor: "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40" },
];

export default function DraftTodosPanel({ noteId, noteContent, onDone }: Props) {
  const [drafts, setDrafts] = useState<DraftTodo[]>([]);
  const [extracting, setExtracting] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addToast = useUiStore((s) => s.addToast);

  useEffect(() => {
    let cancelled = false;

    async function extract() {
      setExtracting(true);
      setError(null);

      const result = await window.volley.notes.extractTodos(noteId, noteContent);

      if (cancelled) return;
      setExtracting(false);

      if (!result.ok) {
        setError(result.error || "Extraction failed");
        return;
      }

      if (!result.drafts || result.drafts.length === 0) {
        setError(result.error || "No action items found");
        return;
      }

      setDrafts(
        result.drafts.map((d: any) => ({
          title: d.title,
          type: d.type as TodoType,
          description: d.description || "",
          selected: true,
        }))
      );
    }

    extract();
    return () => { cancelled = true; };
  }, [noteId, noteContent]);

  const toggleSelect = useCallback((idx: number) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, selected: !d.selected } : d))
    );
  }, []);

  const updateTitle = useCallback((idx: number, title: string) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, title } : d))
    );
  }, []);

  const updateType = useCallback((idx: number, type: TodoType) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, type } : d))
    );
  }, []);

  const selectedCount = drafts.filter((d) => d.selected).length;

  const handleMerge = useCallback(() => {
    const selectedIndices = drafts
      .map((d, i) => (d.selected ? i : -1))
      .filter((i) => i >= 0);
    if (selectedIndices.length < 2) return;

    const first = drafts[selectedIndices[0]];
    const mergedDescription = selectedIndices
      .map((i) => drafts[i])
      .map((d) => d.description || d.title)
      .join(". ");

    const merged: DraftTodo = {
      title: first.title,
      type: first.type,
      description: mergedDescription,
      selected: true,
    };

    // Replace first selected with merged, remove the rest
    const removeSet = new Set(selectedIndices.slice(1));
    setDrafts((prev) =>
      prev
        .map((d, i) => (i === selectedIndices[0] ? merged : d))
        .filter((_, i) => !removeSet.has(i))
    );
  }, [drafts]);

  const handleCreate = async () => {
    const selected = drafts.filter((d) => d.selected && d.title.trim());
    if (selected.length === 0) return;

    setCreating(true);
    const createdIds: string[] = [];
    let failures = 0;

    for (const draft of selected) {
      try {
        const result = await window.volley.session.createTodo(draft.title.trim(), {
          todoType: draft.type,
          description: draft.description || undefined,
          autoPlan: false,
          sourceNoteId: noteId,
        });
        if (result.ok && result.id) {
          createdIds.push(result.id);
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
    }

    setCreating(false);

    if (failures > 0 && createdIds.length > 0) {
      addToast(`Created ${createdIds.length} todos (${failures} failed)`, "info");
    } else if (failures > 0) {
      addToast(`Failed to create todos`, "error");
    } else {
      addToast(`Created ${createdIds.length} todo${createdIds.length !== 1 ? "s" : ""}`, "success");
    }

    onDone();
  };

  return (
    <div className="flex flex-col border-t border-white/[0.06] bg-[#0a0a10] min-h-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] flex-shrink-0">
        <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
          Draft Todos
        </span>
        <button
          onClick={onDone}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
        {extracting && (
          <div className="flex items-center gap-3 py-4 justify-center">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-bright animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-bright animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-bright animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[12px] text-accent-bright/80">Extracting todos...</span>
          </div>
        )}

        {error && !extracting && (
          <div className="text-[12px] text-gray-500 text-center py-4">
            {error}
          </div>
        )}

        {drafts.map((draft, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 border transition-colors ${
              draft.selected
                ? "bg-white/[0.03] border-white/[0.08]"
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
            <div className="flex-1 min-w-0 space-y-1">
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateTitle(idx, e.target.value)}
                className="w-full bg-transparent text-[12px] text-gray-200 outline-none placeholder-gray-600"
                placeholder="Todo title..."
              />

              {/* Description */}
              {draft.description && (
                <p className="text-[11px] text-gray-500 leading-snug truncate">
                  {draft.description}
                </p>
              )}

              {/* Type buttons */}
              <div className="flex items-center gap-1">
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

      {/* Footer */}
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
