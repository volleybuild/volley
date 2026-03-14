import React, { useRef, useCallback, useState, useEffect, useLayoutEffect } from "react";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";
import { useNoteStore } from "../../store/note-store";
import TabItem from "../sidebar/TabItem";
import NoteItem from "../sidebar/NoteItem";
import SidebarSection from "../sidebar/SidebarSection";
import SidebarFolder from "../sidebar/SidebarFolder";
import TypeGroup from "../sidebar/TypeGroup";
import ProjectDropdown from "../sidebar/ProjectDropdown";
import SidebarSearch from "../sidebar/SidebarSearch";
import IconButton from "../shared/IconButton";
import type { SessionState, TodoType } from "../../store/types";

const FILTER_OPTIONS = [
  { value: "all" as const, label: "All" },
  { value: "bug" as const, label: "Bug", color: "text-red-400" },
  { value: "feature" as const, label: "Feature", color: "text-accent-bright" },
  { value: "improvement" as const, label: "Improvement", color: "text-blue-400" },
];

function TodoFilterPopover({
  open,
  activeFilter,
  onSelect,
  onClose,
}: {
  open: boolean;
  activeFilter: string;
  onSelect: (type: "all" | "bug" | "feature" | "improvement") => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-40 bg-[#0f0f12] border border-white/[0.08] rounded-lg shadow-xl py-1 min-w-[120px]">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(opt.value);
              onClose();
            }}
            className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors cursor-pointer flex items-center gap-2 ${
              activeFilter === opt.value
                ? "bg-white/[0.06] text-white"
                : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
            }`}
          >
            {opt.value !== "all" && (
              <span className={`w-2 h-2 rounded-full ${
                opt.value === "bug" ? "bg-red-400" :
                opt.value === "feature" ? "bg-accent-bright" :
                "bg-blue-400"
              }`} />
            )}
            {opt.label}
          </button>
        ))}
      </div>
    </>
  );
}

function FolderCreateInput({
  onCommit,
  onDiscard,
}: {
  onCommit: (name: string) => void;
  onDiscard: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useLayoutEffect(() => {
    // Focus on next frame so the DOM has rendered
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onCommit(trimmed);
    } else {
      onDiscard();
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5">
      {/* Folder icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="flex-shrink-0 text-gray-500"
      >
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onDiscard();
          }
        }}
        placeholder="Folder name"
        className="flex-1 min-w-0 bg-transparent border border-accent-bright/40 rounded px-2 py-1 text-[13px] text-gray-300 outline-none placeholder:text-gray-600 font-medium"
      />
    </div>
  );
}

export default function Sidebar() {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const focusSession = useSessionStore((s) => s.focusSession);
  const gridMode = useSessionStore((s) => s.gridMode);
  const toggleGridMode = useSessionStore((s) => s.toggleGridMode);
  const todoFolders = useSessionStore((s) => s.todoFolders);
  const fetchTodoFolders = useSessionStore((s) => s.fetchTodoFolders);
  const createTodoFolder = useSessionStore((s) => s.createTodoFolder);
  const renameTodoFolder = useSessionStore((s) => s.renameTodoFolder);
  const deleteTodoFolder = useSessionStore((s) => s.deleteTodoFolder);
  const moveSessionToFolder = useSessionStore((s) => s.moveSessionToFolder);
  const openNewSessionModal = useUiStore((s) => s.openNewSessionModal);
  const openTodoModal = useUiStore((s) => s.openTodoModal);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const sidebarSections = useUiStore((s) => s.sidebarSections);
  const toggleSidebarSection = useUiStore((s) => s.toggleSidebarSection);
  const todoFilterType = useUiStore((s) => s.todoFilterType);
  const setTodoFilterType = useUiStore((s) => s.setTodoFilterType);
  const todoViewMode = useUiStore((s) => s.todoViewMode);
  const setTodoViewMode = useUiStore((s) => s.setTodoViewMode);
  const collapsedFolders = useUiStore((s) => s.collapsedFolders);
  const toggleFolder = useUiStore((s) => s.toggleFolder);
  const sidebarSearch = useUiStore((s) => s.sidebarSearch);
  const addToast = useUiStore((s) => s.addToast);

  const notes = useNoteStore((s) => s.notes);
  const noteFolders = useNoteStore((s) => s.folders);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const createNote = useNoteStore((s) => s.createNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const archiveNote = useNoteStore((s) => s.archiveNote);
  const createNoteFolder = useNoteStore((s) => s.createFolder);
  const renameNoteFolder = useNoteStore((s) => s.renameFolder);
  const deleteNoteFolder = useNoteStore((s) => s.deleteFolder);
  const moveNoteToFolder = useNoteStore((s) => s.moveNoteToFolder);
  const extractions = useNoteStore((s) => s.extractions);
  const removeSession = useSessionStore((s) => s.removeSession);
  const pauseSession = useSessionStore((s) => s.pauseSession);
  const resumeSession = useSessionStore((s) => s.resumeSession);

  const [filterOpen, setFilterOpen] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragSection, setDragSection] = useState<string | null>(null);
  const [creatingNoteFolder, setCreatingNoteFolder] = useState(false);
  const [creatingTodoFolder, setCreatingTodoFolder] = useState(false);

  // Fetch folders on mount
  useEffect(() => {
    fetchTodoFolders();
  }, [fetchTodoFolders]);

  // Search helper
  const matchesSearch = (query: string, ...fields: (string | undefined | null)[]) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return fields.some((f) => f && f.toLowerCase().includes(q));
  };

  // Group sessions by lifecycle
  const sessionArray = Array.from(sessions.values());
  const allTodoSessions = sessionArray.filter((s) => s.lifecycle === "todo");
  const todoSessions = (todoFilterType === "all"
    ? allTodoSessions
    : allTodoSessions.filter((s) => (s.todoType || "feature") === todoFilterType)
  ).filter((s) => matchesSearch(sidebarSearch, s.task, s.description));
  const inProgressSessions = sessionArray
    .filter((s) => s.lifecycle === "in_progress" || (!s.lifecycle && s.status !== "exited"))
    .filter((s) => matchesSearch(sidebarSearch, s.slug, s.task, s.branch));
  const completedSessions = sessionArray
    .filter((s) => s.lifecycle === "completed")
    .filter((s) => matchesSearch(sidebarSearch, s.slug, s.task, s.branch));

  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setSidebarWidth(e.clientX);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [setSidebarWidth]);

  const activeNotes = notes.filter((n) => n.status === "active" && matchesSearch(sidebarSearch, n.title));
  const archivedNotes = notes.filter((n) => n.status === "archived" && matchesSearch(sidebarSearch, n.title));

  const handleNoteClick = (noteId: string) => {
    useSessionStore.setState({ activeSessionId: null });
    setActiveNote(noteId);
    useUiStore.getState().closeSettings();
    useUiStore.getState().closeFileViewer();
  };

  const handleSessionClick = (sessionId: string) => {
    focusSession(sessionId);
    setActiveNote(null);
  };

  const handleCreateNote = async () => {
    const note = await createNote("Untitled");
    if (note) {
      useSessionStore.setState({ activeSessionId: null });
      useUiStore.getState().closeSettings();
      useUiStore.getState().closeFileViewer();
    }
  };

  const handleDeleteTodo = async (sessionId: string) => {
    await window.volley.session.delete(sessionId);
    removeSession(sessionId);
  };

  const handlePauseSession = (sessionId: string) => {
    pauseSession(sessionId);
  };

  const handleResumeSession = (sessionId: string) => {
    resumeSession(sessionId);
  };

  const handleRemoveSession = async (sessionId: string) => {
    await window.volley.session.remove(sessionId);
    removeSession(sessionId);
  };

  const handleCancelSetup = (pendingId: string) => {
    window.volley.session.cancelSetup(pendingId);
    removeSession(pendingId);
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
  };

  const handleArchiveNote = async (noteId: string) => {
    await archiveNote(noteId);
  };

  // ── Drag-and-drop helpers (drag source only — drops handled by folders/root zones) ──
  const makeDragHandlers = (section: string, id: string, folderId?: string | null) => ({
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ id, section, folderId: folderId ?? null }));
      e.dataTransfer.effectAllowed = "move";
      setDragSection(section);
    },
    onDragEnd: () => {
      setDragOverId(null);
      setDragSection(null);
    },
  });

  // ── Notes section: group by folder ─────────────────────────────────────
  const alphaNote = (a: NoteData, b: NoteData) => (a.title || "").localeCompare(b.title || "");
  const ungroupedNotes = activeNotes.filter((n) => !n.folderId).sort(alphaNote);
  const notesByFolder = new Map<string, NoteData[]>();
  for (const note of activeNotes) {
    if (note.folderId) {
      const list = notesByFolder.get(note.folderId) ?? [];
      list.push(note);
      notesByFolder.set(note.folderId, list);
    }
  }
  for (const [key, list] of notesByFolder) notesByFolder.set(key, list.sort(alphaNote));
  const sortedNoteFolders = [...noteFolders].sort((a, b) => a.name.localeCompare(b.name));

  // ── Todo section: group by folder (list mode) or type ──────────────────
  const alphaTodo = (a: SessionState, b: SessionState) => a.task.localeCompare(b.task);
  const ungroupedTodos = todoSessions.filter((s) => !s.folderId).sort(alphaTodo);
  const todosByFolder = new Map<string, SessionState[]>();
  for (const session of todoSessions) {
    if (session.folderId) {
      const list = todosByFolder.get(session.folderId) ?? [];
      list.push(session);
      todosByFolder.set(session.folderId, list);
    }
  }
  for (const [key, list] of todosByFolder) todosByFolder.set(key, list.sort(alphaTodo));
  const sortedTodoFolders = [...todoFolders].sort((a, b) => a.name.localeCompare(b.name));

  // Type grouping (apply search filter)
  const filteredAllTodos = allTodoSessions.filter((s) => matchesSearch(sidebarSearch, s.task, s.description));
  const todosByType = new Map<TodoType, SessionState[]>();
  if (todoViewMode === "type") {
    for (const session of filteredAllTodos) {
      const type = session.todoType || "feature";
      const list = todosByType.get(type) ?? [];
      list.push(session);
      todosByType.set(type, list);
    }
    for (const [key, list] of todosByType) todosByType.set(key, list.sort(alphaTodo));
  }
  const typeOrder: TodoType[] = ["bug", "feature", "improvement"];

  // ── Folder create helpers ──────────────────────────────────────────────
  const handleCreateNoteFolder = () => {
    // Ensure section is expanded so the input is visible
    if (!sidebarSections.notes) toggleSidebarSection("notes");
    setCreatingNoteFolder(true);
  };

  const handleCreateTodoFolder = () => {
    if (!sidebarSections.todo) toggleSidebarSection("todo");
    setCreatingTodoFolder(true);
  };

  // ── View mode toggle + filter button ───────────────────────────────────
  const viewModeToggle = (
    <IconButton
      size="md"
      onClick={(e) => {
        e.stopPropagation();
        setTodoViewMode(todoViewMode === "list" ? "type" : "list");
      }}
      title={todoViewMode === "list" ? "Group by type" : "List view"}
      className={todoViewMode === "type" ? "opacity-100 text-accent-bright" : "opacity-50 hover:opacity-100"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        {todoViewMode === "list" ? (
          // Stack/group icon
          <>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </>
        ) : (
          // List icon
          <>
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </>
        )}
      </svg>
    </IconButton>
  );

  const filterButton = (
    <div className="relative flex items-center gap-0.5">
      {viewModeToggle}
      {todoViewMode === "list" && (
        <IconButton
          size="md"
          onClick={(e) => {
            e.stopPropagation();
            setFilterOpen(!filterOpen);
          }}
          title="Filter by type"
          className={todoFilterType !== "all" ? "opacity-100 text-accent-bright" : "opacity-50 hover:opacity-100"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </IconButton>
      )}
      <TodoFilterPopover
        open={filterOpen}
        activeFilter={todoFilterType}
        onSelect={setTodoFilterType}
        onClose={() => setFilterOpen(false)}
      />
    </div>
  );

  // ── Notes extra actions (folder icon + add note) ──────────────────────
  const notesFolderButton = (
    <IconButton
      size="md"
      onClick={(e) => {
        e.stopPropagation();
        handleCreateNoteFolder();
      }}
      title="Create folder"
      className="opacity-50 hover:opacity-100"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    </IconButton>
  );

  // ── Root drop zone for moving items out of folders ────────────────────
  const makeRootDropZone = (section: string, moveFn: (id: string, folderId: string | null) => Promise<void>) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragSection !== section) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverId("__root__" + section);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("text/plain");
      try {
        const data = JSON.parse(raw);
        if (data.id && data.folderId) {
          moveFn(data.id, null);
        }
      } catch {
        // ignore
      }
      setDragOverId(null);
      setDragSection(null);
    },
    onDragLeave: () => setDragOverId(null),
  });

  return (
    <div
      style={{ width: sidebarWidth }}
      className="flex-shrink-0 bg-vo-surface flex flex-col overflow-hidden relative z-10"
    >
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-px hover:w-1 bg-white/[0.06] hover:bg-accent-bright/30 cursor-col-resize transition-all z-20"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>
      <div className="titlebar-drag pl-20 pr-2 h-9 flex items-center justify-between flex-shrink-0">
        <span className="text-gray-500 text-[11px] tracking-wide flex items-center gap-1.5">
          <svg width="16" height="13" viewBox="0 0 76 64" fill="none">
            <circle cx="15" cy="15" r="15" fill="#34d399" />
            <circle cx="61" cy="15" r="15" fill="#fbbf24" />
            <circle cx="38" cy="49" r="15" fill="#a78bfa" />
          </svg>
          <ProjectDropdown />
        </span>
      </div>
      <div className="px-3 py-1.5 flex-shrink-0 flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-widest text-gray-600 uppercase">Sessions</span>
        <button
          className={`titlebar-no-drag flex items-center justify-center w-5 h-5 rounded transition-colors duration-150 border-none cursor-pointer ${
            gridMode
              ? "text-gray-200 bg-white/[0.08] ring-1 ring-accent-bright/30 hover:bg-white/[0.10]"
              : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.06]"
          }`}
          title="Grid mode (\u2318G)"
          onClick={toggleGridMode}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="8" height="8" rx="1" />
            <rect x="13" y="3" width="8" height="8" rx="1" />
            <rect x="3" y="13" width="8" height="8" rx="1" />
            <rect x="13" y="13" width="8" height="8" rx="1" />
          </svg>
        </button>
      </div>
      <SidebarSearch />
      <div className="flex-1 overflow-y-auto px-1.5">
        {/* Notes Section */}
        {(activeNotes.length > 0 || !sidebarSearch) && (
          <SidebarSection
            title="Notes"
            count={activeNotes.length}
            expanded={sidebarSections.notes}
            onToggle={() => toggleSidebarSection("notes")}
            onAddItem={handleCreateNote}
            extraActions={notesFolderButton}
          >
            {/* Inline folder creation */}
            {creatingNoteFolder && (
              <FolderCreateInput
                onCommit={async (name) => {
                  await createNoteFolder(name);
                  setCreatingNoteFolder(false);
                }}
                onDiscard={() => setCreatingNoteFolder(false)}
              />
            )}

            {/* Note folders first */}
            {sortedNoteFolders.map((folder) => {
              const folderNotes = notesByFolder.get(folder.id) ?? [];
              if (sidebarSearch && folderNotes.length === 0) return null;
              return (
                <SidebarFolder
                  key={folder.id}
                  folder={folder}
                  expanded={!collapsedFolders.has(folder.id)}
                  onToggle={() => toggleFolder(folder.id)}
                  onRename={(name) => renameNoteFolder(folder.id, name)}
                  onDelete={() => deleteNoteFolder(folder.id)}
                  onDrop={(itemId) => moveNoteToFolder(itemId, folder.id)}

                  itemCount={folderNotes.length}
                >
                  {folderNotes.map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      isActive={note.id === activeNoteId}
                      onClick={() => handleNoteClick(note.id)}
                      onDelete={() => handleDeleteNote(note.id)}
                      onArchive={() => handleArchiveNote(note.id)}
                      draggable
                      indented
                      extracting={extractions[note.id]?.status === "extracting"}
                      {...makeDragHandlers("notes", note.id, folder.id)}
                    />
                  ))}
                </SidebarFolder>
              );
            })}

            {/* Ungrouped notes after folders */}
            {ungroupedNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isActive={note.id === activeNoteId}
                onClick={() => handleNoteClick(note.id)}
                onDelete={() => handleDeleteNote(note.id)}
                onArchive={() => handleArchiveNote(note.id)}
                draggable
                extracting={extractions[note.id]?.status === "extracting"}
                {...makeDragHandlers("notes", note.id, null)}
              />
            ))}

            {/* Root drop zone (when folders exist) */}
            {sortedNoteFolders.length > 0 && (
              <div
                className={`h-2 rounded transition-colors ${
                  dragOverId === "__root__notes" ? "bg-accent-bright/10" : ""
                }`}
                {...makeRootDropZone("notes", moveNoteToFolder)}
              />
            )}
          </SidebarSection>
        )}

        {/* Archived Notes Section */}
        {archivedNotes.length > 0 && (
          <SidebarSection
            title="Archived"
            count={archivedNotes.length}
            expanded={sidebarSections.archivedNotes}
            onToggle={() => toggleSidebarSection("archivedNotes")}
            dimmed
          >
            {archivedNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isActive={note.id === activeNoteId}
                onClick={() => handleNoteClick(note.id)}
                onDelete={() => handleDeleteNote(note.id)}
                draggable
                extracting={extractions[note.id]?.status === "extracting"}
                {...makeDragHandlers("archivedNotes", note.id)}
              />
            ))}
          </SidebarSection>
        )}

        {/* Todo Section */}
        {(!sidebarSearch || filteredAllTodos.length > 0) && (
          <SidebarSection
            title="Todo"
            count={todoViewMode === "type" ? filteredAllTodos.length : todoSessions.length}
            expanded={sidebarSections.todo}
            onToggle={() => toggleSidebarSection("todo")}
            onAddItem={() => openTodoModal()}
            extraActions={
              <div className="flex items-center gap-0.5">
                {todoViewMode === "list" && (
                  <IconButton
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateTodoFolder();
                    }}
                    title="Create folder"
                    className="opacity-50 hover:opacity-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                  </IconButton>
                )}
                {filterButton}
              </div>
            }
          >
            {todoViewMode === "type" ? (
              /* ── Type-grouped view ─────────────────────────────── */
              <>
                {typeOrder.map((type) => {
                  const items = todosByType.get(type) ?? [];
                  if (items.length === 0) return null;
                  const groupKey = `type-${type}`;
                  return (
                    <TypeGroup
                      key={type}
                      type={type}
                      count={items.length}
                      expanded={!collapsedFolders.has(groupKey)}
                      onToggle={() => toggleFolder(groupKey)}
                    >
                      {items.map((session) => (
                        <TabItem
                          key={session.id}
                          session={session}
                          isActive={session.id === activeSessionId && !activeNoteId}
                          onClick={() => handleSessionClick(session.id)}
                          onDelete={() => handleDeleteTodo(session.id)}
                          indented
                        />
                      ))}
                    </TypeGroup>
                  );
                })}
              </>
            ) : (
              /* ── List view with folders ────────────────────────── */
              <>
                {/* Inline folder creation */}
                {creatingTodoFolder && (
                  <FolderCreateInput
                    onCommit={async (name) => {
                      await createTodoFolder(name);
                      setCreatingTodoFolder(false);
                    }}
                    onDiscard={() => setCreatingTodoFolder(false)}
                  />
                )}

                {/* Todo folders first */}
                {sortedTodoFolders.map((folder) => {
                  const folderItems = todosByFolder.get(folder.id) ?? [];
                  if (sidebarSearch && folderItems.length === 0) return null;
                  return (
                    <SidebarFolder
                      key={folder.id}
                      folder={folder}
                      expanded={!collapsedFolders.has(folder.id)}
                      onToggle={() => toggleFolder(folder.id)}
                      onRename={(name) => renameTodoFolder(folder.id, name)}
                      onDelete={() => deleteTodoFolder(folder.id)}
                      onDrop={(itemId) => moveSessionToFolder(itemId, folder.id)}
    
                      itemCount={folderItems.length}
                    >
                      {folderItems.map((session) => (
                        <TabItem
                          key={session.id}
                          session={session}
                          isActive={session.id === activeSessionId && !activeNoteId}
                          onClick={() => handleSessionClick(session.id)}
                          onDelete={() => handleDeleteTodo(session.id)}
                          draggable
                          indented
                          {...makeDragHandlers("todo", session.id, folder.id)}
                        />
                      ))}
                    </SidebarFolder>
                  );
                })}

                {/* Ungrouped todos after folders */}
                {ungroupedTodos.map((session) => (
                  <TabItem
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSessionId && !activeNoteId}
                    onClick={() => handleSessionClick(session.id)}
                    onDelete={() => handleDeleteTodo(session.id)}
                    draggable
                    {...makeDragHandlers("todo", session.id, null)}
                  />
                ))}

                {/* Root drop zone */}
                {sortedTodoFolders.length > 0 && (
                  <div
                    className={`h-2 rounded transition-colors ${
                      dragOverId === "__root__todo" ? "bg-accent-bright/10" : ""
                    }`}
                    {...makeRootDropZone("todo", moveSessionToFolder)}
                  />
                )}
              </>
            )}
          </SidebarSection>
        )}

        {/* In Progress Section */}
        {(inProgressSessions.length > 0 || !sidebarSearch) && (
          <SidebarSection
            title="In Progress"
            count={inProgressSessions.length}
            expanded={sidebarSections.inProgress}
            onToggle={() => toggleSidebarSection("inProgress")}
          >
            {inProgressSessions.map((session) => (
              <TabItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId && !activeNoteId}
                onClick={() => handleSessionClick(session.id)}
                onPause={() => handlePauseSession(session.id)}
                onResume={() => handleResumeSession(session.id)}
                onRemove={() => handleRemoveSession(session.id)}
                onCancelSetup={() => handleCancelSetup(session.id)}
              />
            ))}
          </SidebarSection>
        )}

        {/* Completed Section */}
        {completedSessions.length > 0 && (
          <SidebarSection
            title="Completed"
            count={completedSessions.length}
            expanded={sidebarSections.completed}
            onToggle={() => toggleSidebarSection("completed")}
            dimmed
          >
            {completedSessions.map((session) => (
              <TabItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId && !activeNoteId}
                onClick={() => handleSessionClick(session.id)}
                onRemove={() => handleRemoveSession(session.id)}
              />
            ))}
          </SidebarSection>
        )}
      </div>
      <div className="px-3 py-3 flex-shrink-0 space-y-1.5">
        <button
          className="titlebar-no-drag w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[12px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] cursor-pointer transition-colors duration-75 border border-white/[0.06]"
          title="New session (\u2318N)"
          onClick={openNewSessionModal}
        >
          + New session
        </button>
        <button
          className="titlebar-no-drag w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[12px] text-gray-600 hover:text-gray-400 hover:bg-white/[0.04] cursor-pointer transition-colors duration-75"
          title="Settings"
          onClick={() => useUiStore.getState().openSettings()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>
    </div>
  );
}
