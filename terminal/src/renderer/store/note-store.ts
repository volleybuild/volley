import { create } from "zustand";

interface NoteStore {
  notes: NoteData[];
  folders: FolderData[];
  activeNoteId: string | null;

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
}

function createNoteStore() {
  return create<NoteStore>((set, get) => ({
    notes: [],
    folders: [],
    activeNoteId: null,

    fetchNotes: async () => {
      const { notes, folders } = await window.volley.notes.list();
      set({ notes, folders: folders ?? [] });
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

    clearNotes: () => set({ notes: [], folders: [], activeNoteId: null }),

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
  }));
}

// Preserve store across Vite HMR
export const useNoteStore: ReturnType<typeof createNoteStore> =
  (import.meta as any).hot?.data?.noteStore ?? createNoteStore();

if ((import.meta as any).hot) {
  (import.meta as any).hot.data.noteStore = useNoteStore;
  (import.meta as any).hot.accept();
}
