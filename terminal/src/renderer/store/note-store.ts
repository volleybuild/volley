import { create } from "zustand";

export type DraftTodoType = "bug" | "feature" | "improvement";

export interface DraftTodo {
  title: string;
  type: DraftTodoType;
  description: string;
  selected: boolean;
}

export type ExtractionPhase = "analyzing" | "scanning" | "reading" | "generating";

export interface ExtractionState {
  status: "extracting" | "done" | "error" | "created";
  drafts: DraftTodo[];
  error: string | null;
  phase: ExtractionPhase | null;
  startedAt: number | null;
  partialResult: string | null;
  createdTodoIds?: string[];
}

interface NoteStore {
  notes: NoteData[];
  folders: FolderData[];
  activeNoteId: string | null;
  extractions: Record<string, ExtractionState>;

  fetchNotes: () => Promise<void>;
  createNote: (title: string) => Promise<NoteData | null>;
  updateNote: (id: string, updates: { title?: string; content?: string }) => void;
  addTodoIdsToNote: (noteId: string, todoIds: string[]) => void;
  archiveNote: (id: string) => Promise<void>;
  unarchiveNote: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  reorderNotes: (orderedIds: string[]) => void;
  setActiveNote: (id: string | null) => void;
  clearNotes: () => void;
  createFolder: (name: string) => Promise<FolderData | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  reorderFolders: (orderedIds: string[]) => void;
  moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  startExtraction: (noteId: string, noteContent: string) => void;
  continueExtraction: (noteId: string) => void;
  clearExtraction: (noteId: string) => void;
  markCreated: (noteId: string, todoIds: string[]) => void;
  updateDraft: (noteId: string, idx: number, updates: Partial<DraftTodo>) => void;
  mergeDrafts: (noteId: string) => void;
}

function persistExtractions(extractions: Record<string, ExtractionState>): void {
  // Persist "done" entries with drafts and "created" entries
  const toPersist: Record<string, any> = {};
  for (const [noteId, ext] of Object.entries(extractions)) {
    if (ext.status === "done" && ext.drafts.length > 0) {
      toPersist[noteId] = { status: ext.status, drafts: ext.drafts, error: null };
    } else if (ext.status === "created") {
      toPersist[noteId] = { status: ext.status, drafts: ext.drafts, createdTodoIds: ext.createdTodoIds, error: null };
    }
  }
  window.volley.notes.saveExtractions(toPersist);
}

function createNoteStore() {
  return create<NoteStore>((set, get) => ({
    notes: [],
    folders: [],
    activeNoteId: null,
    extractions: {},

    fetchNotes: async () => {
      const [{ notes, folders }, { extractions: saved }] = await Promise.all([
        window.volley.notes.list(),
        window.volley.notes.loadExtractions(),
      ]);
      // Restore persisted extractions with full ExtractionState shape
      const restored: Record<string, ExtractionState> = {};
      for (const [noteId, ext] of Object.entries(saved ?? {})) {
        const s = (ext as any)?.status;
        if (s === "done" && Array.isArray((ext as any).drafts)) {
          restored[noteId] = {
            status: "done",
            drafts: (ext as any).drafts.map((d: any) => ({
              title: d.title ?? "",
              type: d.type ?? "feature",
              description: d.description ?? "",
              selected: d.selected ?? true,
            })),
            error: null,
            phase: null,
            startedAt: null,
            partialResult: null,
          };
        } else if (s === "created") {
          restored[noteId] = {
            status: "created",
            drafts: ((ext as any).drafts ?? []).map((d: any) => ({
              title: d.title ?? "",
              type: d.type ?? "feature",
              description: d.description ?? "",
              selected: d.selected ?? true,
            })),
            error: null,
            phase: null,
            startedAt: null,
            partialResult: null,
            createdTodoIds: (ext as any).createdTodoIds ?? [],
          };
        }
      }
      set({ notes, folders: folders ?? [], extractions: restored });
    },

    createNote: async (title: string) => {
      const result = await window.volley.notes.create(title);
      if (result.ok && result.note) {
        set((state) => ({
          notes: [...state.notes, result.note!],
          activeNoteId: result.note!.id,
        }));
        return result.note;
      }
      return null;
    },

    updateNote: (id: string, updates: { title?: string; content?: string }) => {
      const now = new Date().toISOString();
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === id ? { ...n, ...updates, updatedAt: now } : n
        ),
      }));
      window.volley.notes.update(id, updates);
    },

    addTodoIdsToNote: (noteId: string, todoIds: string[]) => {
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === noteId
            ? { ...n, todoIds: [...new Set([...n.todoIds, ...todoIds])] }
            : n
        ),
      }));
    },

    archiveNote: async (id: string) => {
      const result = await window.volley.notes.archive(id);
      if (result.ok) {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, status: "archived" as const, updatedAt: new Date().toISOString() } : n
          ),
          activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        }));
      }
    },

    unarchiveNote: async (id: string) => {
      const result = await window.volley.notes.unarchive(id);
      if (result.ok) {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, status: "active" as const, updatedAt: new Date().toISOString() } : n
          ),
        }));
      }
    },

    deleteNote: async (id: string) => {
      const result = await window.volley.notes.delete(id);
      if (result.ok) {
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
          activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        }));
      }
    },

    reorderNotes: (orderedIds: string[]) => {
      set((state) => {
        const byId = new Map(state.notes.map((n) => [n.id, n]));
        const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as NoteData[];
        // Add any notes not in orderedIds at the end
        for (const n of state.notes) {
          if (!orderedIds.includes(n.id)) ordered.push(n);
        }
        return { notes: ordered };
      });
      window.volley.notes.reorder(orderedIds);
    },

    setActiveNote: (id: string | null) => set({ activeNoteId: id }),

    clearNotes: () => set({ notes: [], folders: [], activeNoteId: null, extractions: {} }),

    createFolder: async (name: string) => {
      const result = await window.volley.notes.folderCreate(name);
      if (result.ok && result.folder) {
        set((state) => ({ folders: [result.folder!, ...state.folders] }));
        return result.folder;
      }
      return null;
    },

    renameFolder: async (id: string, name: string) => {
      const result = await window.volley.notes.folderRename(id, name);
      if (result.ok) {
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? { ...f, name } : f)),
        }));
      }
    },

    deleteFolder: async (id: string) => {
      const result = await window.volley.notes.folderDelete(id);
      if (result.ok) {
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          notes: state.notes.map((n) =>
            n.folderId === id ? { ...n, folderId: null } : n
          ),
        }));
      }
    },

    reorderFolders: (orderedIds: string[]) => {
      set((state) => {
        const byId = new Map(state.folders.map((f) => [f.id, f]));
        const ordered = orderedIds
          .map((id, i) => {
            const f = byId.get(id);
            return f ? { ...f, order: i } : null;
          })
          .filter(Boolean) as FolderData[];
        for (const f of state.folders) {
          if (!orderedIds.includes(f.id)) ordered.push(f);
        }
        return { folders: ordered };
      });
      window.volley.notes.folderReorder(orderedIds);
    },

    moveNoteToFolder: async (noteId: string, folderId: string | null) => {
      const result = await window.volley.notes.moveToFolder(noteId, folderId);
      if (result.ok) {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId ? { ...n, folderId } : n
          ),
        }));
      }
    },

    startExtraction: async (noteId: string, noteContent: string) => {
      set((state) => ({
        extractions: {
          ...state.extractions,
          [noteId]: { status: "extracting", drafts: [], error: null, phase: "analyzing", startedAt: Date.now(), partialResult: null },
        },
      }));

      const result = await window.volley.notes.extractTodos(noteId, noteContent) as any;

      if (!result.ok) {
        const isNeedsMoreTurns = result.error === "needs_more_turns" && result.partialResult;
        set((state) => ({
          extractions: {
            ...state.extractions,
            [noteId]: {
              status: "error",
              drafts: [],
              error: isNeedsMoreTurns ? "needs_more_turns" : (result.error || "Extraction failed"),
              phase: null,
              startedAt: state.extractions[noteId]?.startedAt ?? null,
              partialResult: isNeedsMoreTurns ? result.partialResult : null,
            },
          },
        }));
        return;
      }

      if (!result.drafts || result.drafts.length === 0) {
        set((state) => ({
          extractions: {
            ...state.extractions,
            [noteId]: { status: "error", drafts: [], error: result.error || "No action items found", phase: null, startedAt: null, partialResult: null },
          },
        }));
        return;
      }

      set((state) => ({
        extractions: {
          ...state.extractions,
          [noteId]: {
            status: "done",
            error: null,
            phase: null,
            startedAt: null,
            partialResult: null,
            drafts: result.drafts!.map((d: any) => ({
              title: d.title,
              type: d.type as DraftTodoType,
              description: d.description || "",
              selected: true,
            })),
          },
        },
      }));
      persistExtractions(get().extractions);
    },

    continueExtraction: async (noteId: string) => {
      const ext = get().extractions[noteId];
      if (!ext?.partialResult) return;

      const partialResult = ext.partialResult;

      set((state) => ({
        extractions: {
          ...state.extractions,
          [noteId]: { ...state.extractions[noteId], status: "extracting", error: null, phase: "generating", startedAt: Date.now(), partialResult },
        },
      }));

      const result = await window.volley.notes.continueTodos(noteId, partialResult);

      if (!result.ok) {
        set((state) => ({
          extractions: {
            ...state.extractions,
            [noteId]: {
              status: "error",
              drafts: [],
              error: result.error || "Extraction failed",
              phase: null,
              startedAt: state.extractions[noteId]?.startedAt ?? null,
              partialResult: null,
            },
          },
        }));
        return;
      }

      if (!result.drafts || result.drafts.length === 0) {
        set((state) => ({
          extractions: {
            ...state.extractions,
            [noteId]: { status: "error", drafts: [], error: result.error || "No action items found", phase: null, startedAt: null, partialResult: null },
          },
        }));
        return;
      }

      set((state) => ({
        extractions: {
          ...state.extractions,
          [noteId]: {
            status: "done",
            error: null,
            phase: null,
            startedAt: null,
            partialResult: null,
            drafts: result.drafts!.map((d: any) => ({
              title: d.title,
              type: d.type as DraftTodoType,
              description: d.description || "",
              selected: true,
            })),
          },
        },
      }));
      persistExtractions(get().extractions);
    },

    clearExtraction: (noteId: string) => {
      set((state) => {
        const { [noteId]: _, ...rest } = state.extractions;
        return { extractions: rest };
      });
      persistExtractions(get().extractions);
    },

    markCreated: (noteId: string, todoIds: string[]) => {
      set((state) => {
        const ext = state.extractions[noteId];
        if (!ext) return state;
        return {
          extractions: {
            ...state.extractions,
            [noteId]: {
              ...ext,
              status: "created",
              createdTodoIds: todoIds,
            },
          },
        };
      });
      persistExtractions(get().extractions);
    },

    updateDraft: (noteId: string, idx: number, updates: Partial<DraftTodo>) => {
      set((state) => {
        const ext = state.extractions[noteId];
        if (!ext) return state;
        return {
          extractions: {
            ...state.extractions,
            [noteId]: {
              ...ext,
              drafts: ext.drafts.map((d, i) => (i === idx ? { ...d, ...updates } : d)),
            },
          },
        };
      });
      persistExtractions(get().extractions);
    },

    mergeDrafts: (noteId: string) => {
      set((state) => {
        const ext = state.extractions[noteId];
        if (!ext) return state;
        const selectedIndices = ext.drafts
          .map((d, i) => (d.selected ? i : -1))
          .filter((i) => i >= 0);
        if (selectedIndices.length < 2) return state;

        const first = ext.drafts[selectedIndices[0]];
        const mergedDescription = selectedIndices
          .map((i) => ext.drafts[i])
          .map((d) => d.description || d.title)
          .join(". ");

        const merged: DraftTodo = {
          title: first.title,
          type: first.type,
          description: mergedDescription,
          selected: true,
        };

        const removeSet = new Set(selectedIndices.slice(1));
        return {
          extractions: {
            ...state.extractions,
            [noteId]: {
              ...ext,
              drafts: ext.drafts
                .map((d, i) => (i === selectedIndices[0] ? merged : d))
                .filter((_, i) => !removeSet.has(i)),
            },
          },
        };
      });
      persistExtractions(get().extractions);
    },
  }));
}

// Preserve store across Vite HMR
export const useNoteStore: ReturnType<typeof createNoteStore> =
  (import.meta as any).hot?.data?.noteStore ?? createNoteStore();

// Listen for extraction progress events from main process
if (!(import.meta as any).hot?.data?.progressListenerRegistered) {
  window.volley.notes.onExtractProgress(({ noteId, phase }) => {
    const ext = useNoteStore.getState().extractions[noteId];
    if (ext && ext.status === "extracting") {
      useNoteStore.setState((state) => ({
        extractions: {
          ...state.extractions,
          [noteId]: { ...state.extractions[noteId], phase: phase as ExtractionPhase },
        },
      }));
    }
  });
}

if ((import.meta as any).hot) {
  (import.meta as any).hot.data.noteStore = useNoteStore;
  (import.meta as any).hot.data.progressListenerRegistered = true;
  (import.meta as any).hot.accept();
}
