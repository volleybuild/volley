import React, { useState, useRef, useEffect } from "react";

interface Props {
  folder: FolderData;
  expanded: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDrop: (itemId: string) => void;
  itemCount: number;
  children: React.ReactNode;
}

export default function SidebarFolder({
  folder,
  expanded,
  onToggle,
  onRename,
  onDelete,
  onDrop,
  itemCount,
  children,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) {
      onRename(trimmed);
    } else {
      setEditName(folder.name);
    }
    setEditing(false);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.id) onDrop(data.id);
    } catch {
      if (raw) onDrop(raw);
    }
  };

  return (
    <div className="mb-0.5">
      <div
        className={`group flex items-center gap-1 px-2 py-1 text-[10px] cursor-pointer hover:bg-white/[0.03] rounded transition-colors ${
          isDragOver ? "ring-1 ring-accent-bright/50 bg-accent-bright/5" : ""
        }`}
        onClick={onToggle}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {/* Chevron */}
        <span className="flex-shrink-0 opacity-50">
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>

        {/* Folder icon */}
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="flex-shrink-0 text-gray-500"
        >
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>

        {/* Name */}
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setEditName(folder.name);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent border border-white/10 rounded px-1 py-0 text-[10px] text-gray-300 outline-none focus:border-accent-bright/40"
          />
        ) : (
          <span className="flex-1 min-w-0 truncate text-gray-400 font-medium">
            {folder.name}
          </span>
        )}

        {/* Count */}
        <span className="text-[9px] text-gray-600 flex-shrink-0">{itemCount}</span>

        {/* Hover actions */}
        {!editing && (
          <span className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
            <button
              className="p-0.5 rounded hover:bg-white/[0.08] text-gray-500 hover:text-gray-300 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              title="Rename folder"
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              className="p-0.5 rounded hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete folder"
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        )}
      </div>

      {expanded && (
        <div className="pl-3 space-y-0.5 mt-0.5">{children}</div>
      )}
    </div>
  );
}
