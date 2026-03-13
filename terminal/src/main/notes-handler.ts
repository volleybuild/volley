import { ipcMain } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import { log, logError } from "./logger";

interface Folder {
  id: string;
  name: string;
  order: number;
}

interface Note {
  id: string;
  title: string;
  content: string;
  status: "active" | "archived";
  todoIds: string[];
  createdAt: string;
  updatedAt: string;
  folderId?: string | null;
}

interface NotesFile {
  notes: Note[];
  folders?: Folder[];
}

export function registerNotesHandlers(getRepoRoot: () => string | null): void {
  function notesPath(): string | null {
    const root = getRepoRoot();
    if (!root) return null;
    return path.join(root, ".volley", "notes.json");
  }

  function loadNotes(): NotesFile {
    const p = notesPath();
    if (!p) return { notes: [], folders: [] };
    try {
      const raw = fs.readFileSync(p, "utf-8");
      const data = JSON.parse(raw) as NotesFile;
      if (!data.folders) data.folders = [];
      return data;
    } catch {
      return { notes: [], folders: [] };
    }
  }

  function saveNotes(data: NotesFile): boolean {
    const p = notesPath();
    if (!p) return false;
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
      return true;
    } catch (err: any) {
      logError("notes: failed to save:", err.message);
      return false;
    }
  }

  ipcMain.handle("notes:list", () => {
    return loadNotes();
  });

  ipcMain.handle("notes:create", (_event, { title }: { title: string }) => {
    try {
      const data = loadNotes();
      const now = new Date().toISOString();
      const note: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        content: "",
        status: "active",
        todoIds: [],
        createdAt: now,
        updatedAt: now,
      };
      data.notes.push(note);
      if (!saveNotes(data)) {
        return { ok: false, error: "Failed to save notes" };
      }
      log("notes: created", note.id);
      return { ok: true, note };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("notes:update", (_event, { id, title, content }: { id: string; title?: string; content?: string }) => {
    try {
      const data = loadNotes();
      const note = data.notes.find((n) => n.id === id);
      if (!note) return { ok: false, error: "Note not found" };
      if (title !== undefined) note.title = title;
      if (content !== undefined) note.content = content;
      note.updatedAt = new Date().toISOString();
      if (!saveNotes(data)) {
        return { ok: false, error: "Failed to save notes" };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("notes:archive", (_event, { id }: { id: string }) => {
    try {
      const data = loadNotes();
      const note = data.notes.find((n) => n.id === id);
      if (!note) return { ok: false, error: "Note not found" };
      note.status = "archived";
      note.updatedAt = new Date().toISOString();
      if (!saveNotes(data)) {
        return { ok: false, error: "Failed to save notes" };
      }
      log("notes: archived", id);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("notes:unarchive", (_event, { id }: { id: string }) => {
    try {
      const data = loadNotes();
      const note = data.notes.find((n) => n.id === id);
      if (!note) return { ok: false, error: "Note not found" };
      note.status = "active";
      note.updatedAt = new Date().toISOString();
      if (!saveNotes(data)) {
        return { ok: false, error: "Failed to save notes" };
      }
      log("notes: unarchived", id);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("notes:delete", (_event, { id }: { id: string }) => {
    try {
      const data = loadNotes();
      const idx = data.notes.findIndex((n) => n.id === id);
      if (idx === -1) return { ok: false, error: "Note not found" };
      data.notes.splice(idx, 1);
      if (!saveNotes(data)) {
        return { ok: false, error: "Failed to save notes" };
      }
      log("notes: deleted", id);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("notes:reorder", (_event, { ids }: { ids: string[] }) => {
    try {
      const data = loadNotes();
      const byId = new Map(data.notes.map((n) => [n.id, n]));
      const ordered: Note[] = [];
      for (const id of ids) {
        const note = byId.get(id);
        if (note) ordered.push(note);
      }
      // Add any notes not in ids at the end
      for (const note of data.notes) {
        if (!ids.includes(note.id)) ordered.push(note);
      }
      data.notes = ordered;
      if (!saveNotes(data)) {
        return { ok: false, error: "Failed to save notes" };
      }
      log("notes: reordered", ids.length, "notes");
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("notes:add-todo-ids", (_event, { noteId, todoIds }: { noteId: string; todoIds: string[] }) => {
    try {
      const data = loadNotes();
      const note = data.notes.find((n) => n.id === noteId);
      if (!note) return { ok: false, error: "Note not found" };
      const existing = new Set(note.todoIds);
      for (const id of todoIds) existing.add(id);
      note.todoIds = [...existing];
      note.updatedAt = new Date().toISOString();
      if (!saveNotes(data)) {
        return { ok: false, error: "Failed to save notes" };
      }
      log("notes: added", todoIds.length, "todo ids to note", noteId);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── Folder handlers ──────────────────────────────────────────────────

  ipcMain.handle("notes:folder-create", (_event, { name }: { name: string }) => {
    try {
      const data = loadNotes();
      const folders = data.folders!;
      const minOrder = folders.length > 0 ? Math.min(...folders.map((f) => f.order)) : 0;
      const folder: Folder = {
        id: `nf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        order: minOrder - 1,
      };
      folders.unshift(folder);
      if (!saveNotes(data)) return { ok: false, error: "Failed to save" };
      log("notes: folder created", folder.id);
      return { ok: true, folder };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("notes:folder-rename", (_event, { id, name }: { id: string; name: string }) => {
    try {
      const data = loadNotes();
      const folder = data.folders!.find((f) => f.id === id);
      if (!folder) return { ok: false, error: "Folder not found" };
      folder.name = name;
      if (!saveNotes(data)) return { ok: false, error: "Failed to save" };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("notes:folder-delete", (_event, { id }: { id: string }) => {
    try {
      const data = loadNotes();
      const idx = data.folders!.findIndex((f) => f.id === id);
      if (idx === -1) return { ok: false, error: "Folder not found" };
      data.folders!.splice(idx, 1);
      // Unset folderId on contained notes
      for (const note of data.notes) {
        if (note.folderId === id) note.folderId = null;
      }
      if (!saveNotes(data)) return { ok: false, error: "Failed to save" };
      log("notes: folder deleted", id);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("notes:folder-reorder", (_event, { ids }: { ids: string[] }) => {
    try {
      const data = loadNotes();
      const byId = new Map(data.folders!.map((f) => [f.id, f]));
      const ordered: Folder[] = [];
      for (let i = 0; i < ids.length; i++) {
        const f = byId.get(ids[i]);
        if (f) { f.order = i; ordered.push(f); }
      }
      for (const f of data.folders!) {
        if (!ids.includes(f.id)) ordered.push(f);
      }
      data.folders = ordered;
      if (!saveNotes(data)) return { ok: false, error: "Failed to save" };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("notes:move-to-folder", (_event, { noteId, folderId }: { noteId: string; folderId: string | null }) => {
    try {
      const data = loadNotes();
      const note = data.notes.find((n) => n.id === noteId);
      if (!note) return { ok: false, error: "Note not found" };
      note.folderId = folderId;
      note.updatedAt = new Date().toISOString();
      if (!saveNotes(data)) return { ok: false, error: "Failed to save" };
      log("notes: moved", noteId, "to folder", folderId);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── Extraction state persistence ──────────────────────────────────────

  function extractionsPath(): string | null {
    const root = getRepoRoot();
    if (!root) return null;
    return path.join(root, ".volley", "extractions.json");
  }

  ipcMain.handle("notes:extractions-load", () => {
    const p = extractionsPath();
    if (!p) return { extractions: {} };
    try {
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw);
    } catch {
      return { extractions: {} };
    }
  });

  ipcMain.handle("notes:extractions-save", (_event, { extractions }: { extractions: Record<string, any> }) => {
    const p = extractionsPath();
    if (!p) return { ok: false };
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify({ extractions }, null, 2));
      return { ok: true };
    } catch (err: any) {
      logError("notes: failed to save extractions:", err.message);
      return { ok: false };
    }
  });
}
