import React, { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useNoteStore } from "../../store/note-store";
import { useAutoSave } from "../../hooks/use-auto-save";
import IconButton from "../shared/IconButton";
import DraftTodosPanel from "./DraftTodosPanel";
import "./note-styles.css";

interface Props {
  noteId: string;
}

export default function NoteEditor({ noteId }: Props) {
  const note = useNoteStore((s) => s.notes.find((n) => n.id === noteId));
  const updateNote = useNoteStore((s) => s.updateNote);
  const archiveNote = useNoteStore((s) => s.archiveNote);
  const unarchiveNote = useNoteStore((s) => s.unarchiveNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const [title, setTitle] = useState(note?.title ?? "");
  const [showDrafts, setShowDrafts] = useState(false);
  const { save, flush } = useAutoSave(noteId);

  // Sync title from store when note changes
  useEffect(() => {
    if (note) setTitle(note.title);
  }, [note?.id]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Placeholder.configure({ placeholder: "Start writing..." }),
      ],
      content: note?.content ? JSON.parse(note.content) : undefined,
      onUpdate: ({ editor }) => {
        save(JSON.stringify(editor.getJSON()));
      },
    },
    [noteId],
  );

  // Flush on unmount
  useEffect(() => {
    return () => flush();
  }, [flush]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      updateNote(noteId, { title: e.target.value });
    },
    [noteId, updateNote],
  );

  const handleArchive = useCallback(() => {
    if (note?.status === "archived") {
      unarchiveNote(noteId);
    } else {
      archiveNote(noteId);
    }
  }, [noteId, note?.status, archiveNote, unarchiveNote]);

  const handleDelete = useCallback(() => {
    deleteNote(noteId);
  }, [noteId, deleteNote]);

  const handleExtractTodos = useCallback(() => {
    // Flush any pending auto-save, then save current content before extracting
    flush();
    if (editor) {
      const content = JSON.stringify(editor.getJSON());
      updateNote(noteId, { content });
    }
    setShowDrafts(true);
  }, [flush, editor, noteId, updateNote]);

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        Note not found
      </div>
    );
  }

  const isArchived = note.status === "archived";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="flex-shrink-0 text-accent-bright"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          className="flex-1 bg-transparent text-gray-100 text-sm font-medium outline-none placeholder-gray-600"
          placeholder="Untitled"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleExtractTodos}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-colors bg-accent-bright/10 text-accent-bright border border-accent-bright/20 hover:bg-accent-bright/15 hover:border-accent-bright/30"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Generate todos
          </button>
          <div className="flex items-center gap-0.5">
          <IconButton onClick={handleArchive} title={isArchived ? "Unarchive" : "Archive"} size="md">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </IconButton>
          <IconButton onClick={handleDelete} title="Delete" size="md" variant="danger">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </IconButton>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="flex items-center gap-0.5 px-5 py-1.5 border-b border-white/[0.06] flex-shrink-0">
          <ToolbarButton
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            label="H1"
          />
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            label="H2"
          />
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            label="H3"
          />
          <span className="w-px h-4 bg-white/[0.08] mx-1" />
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="B"
            bold
          />
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="I"
            italic
          />
          <span className="w-px h-4 bg-white/[0.08] mx-1" />
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            icon="bullet"
          />
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            icon="ordered"
          />
        </div>
      )}

      {/* Editor */}
      <div className={`overflow-y-auto px-5 py-4 note-editor-container ${showDrafts ? "max-h-[50%]" : "flex-1"}`}>
        <EditorContent editor={editor} />
      </div>

      {/* Draft Todos Panel */}
      {showDrafts && (
        <div className="flex-1 min-h-0">
          <DraftTodosPanel
            noteId={noteId}
            noteContent={note.content}
            onDone={() => setShowDrafts(false)}
          />
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  icon,
  bold,
  italic,
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
  icon?: "bullet" | "ordered";
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-1.5 py-1 rounded text-[11px] transition-colors ${
        active
          ? "text-accent-bright bg-accent-bright/10"
          : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"
      } ${bold ? "font-bold" : ""} ${italic ? "italic" : ""}`}
    >
      {icon === "bullet" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="9" y1="6" x2="20" y2="6" />
          <line x1="9" y1="12" x2="20" y2="12" />
          <line x1="9" y1="18" x2="20" y2="18" />
          <circle cx="4" cy="6" r="1.5" fill="currentColor" />
          <circle cx="4" cy="12" r="1.5" fill="currentColor" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" />
        </svg>
      )}
      {icon === "ordered" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="10" y1="6" x2="20" y2="6" />
          <line x1="10" y1="12" x2="20" y2="12" />
          <line x1="10" y1="18" x2="20" y2="18" />
          <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
          <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
          <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
        </svg>
      )}
      {label}
    </button>
  );
}
