import React from "react";
import IconButton from "../shared/IconButton";
import VolleyLoader from "../shared/VolleyLoader";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface Props {
  note: NoteData;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  indented?: boolean;
  extracting?: boolean;
}

export default function NoteItem({ note, isActive, onClick, onDelete, onArchive, draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver, indented, extracting }: Props) {
  const isArchived = note.status === "archived";

  return (
    <div
      className={`group flex items-start gap-2 px-2.5 py-2 cursor-pointer hover:bg-white/[0.03] rounded text-[13px] titlebar-no-drag transition-colors duration-75 relative ${
        isActive ? "bg-white/[0.03]" : ""
      } ${isArchived ? "opacity-60" : ""} ${isDragOver ? "border-t border-accent-bright/50" : "border-t border-transparent"} ${indented ? "pl-4" : ""}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r bg-accent-bright" />
      )}

      {/* Document icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mt-[3px] flex-shrink-0 text-gray-500"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>

      <div className="flex flex-col gap-0.5 overflow-hidden min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              className={`truncate font-medium leading-snug ${
                isActive ? "text-gray-100" : "text-gray-400"
              }`}
            >
              {note.title || "Untitled"}
            </span>
            {extracting && (
              <VolleyLoader size="xs" className="flex-shrink-0" />
            )}
          </span>
          <span className="flex items-center gap-0.5 flex-shrink-0 h-5">
            {/* Timestamp — hidden on hover when actions show */}
            <span className="text-[11px] text-gray-600 tabular-nums group-hover:hidden leading-5">
              {relativeTime(note.updatedAt)}
            </span>
            {/* Hover actions */}
            {onArchive && !isArchived && (
              <IconButton
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
                title="Archive note"
                className="hidden group-hover:flex"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="21 8 21 21 3 21 3 8" />
                  <rect x="1" y="3" width="22" height="5" />
                  <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete note"
                variant="danger"
                className="hidden group-hover:flex"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </IconButton>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
