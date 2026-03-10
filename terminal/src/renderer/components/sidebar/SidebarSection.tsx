import React, { useState, useRef, useEffect } from "react";

const ICON_CHEVRON_RIGHT = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>`;
const ICON_CHEVRON_DOWN = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>`;
const ICON_PLUS = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>`;

interface Props {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  dimmed?: boolean;
  onAddItem?: (task: string) => void;
  children: React.ReactNode;
}

export default function SidebarSection({
  title,
  count,
  expanded,
  onToggle,
  dimmed,
  onAddItem,
  children,
}: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    setNewTask("");
  };

  const handleSubmit = () => {
    const trimmed = newTask.trim();
    if (trimmed && onAddItem) {
      onAddItem(trimmed);
    }
    setIsAdding(false);
    setNewTask("");
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewTask("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className="mb-1">
      <div
        className={`w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium tracking-wider uppercase cursor-pointer hover:bg-white/[0.03] rounded transition-colors ${
          dimmed ? "text-gray-600" : "text-gray-500"
        }`}
        onClick={onToggle}
      >
        <span
          className="flex-shrink-0 opacity-50"
          dangerouslySetInnerHTML={{
            __html: expanded ? ICON_CHEVRON_DOWN : ICON_CHEVRON_RIGHT,
          }}
        />
        <span className="flex-1 text-left">{title}</span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded ${
            dimmed ? "bg-white/[0.03]" : "bg-white/[0.05]"
          }`}
        >
          {count}
        </span>
        {onAddItem && (
          <button
            className="p-0.5 rounded hover:bg-white/[0.08] transition-colors opacity-50 hover:opacity-100"
            onClick={handleAddClick}
            title={`Add ${title.toLowerCase()}`}
          >
            <span dangerouslySetInnerHTML={{ __html: ICON_PLUS }} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-0.5 mt-0.5">
          {isAdding && (
            <div className="mx-1 mb-1">
              <input
                ref={inputRef}
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleCancel}
                placeholder="Enter task description..."
                className="w-full px-2 py-1.5 text-[11px] bg-white/[0.05] border border-white/[0.1] rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50"
              />
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
