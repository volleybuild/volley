import React from "react";
import IconButton from "../shared/IconButton";

const ICON_CHEVRON_RIGHT = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>`;
const ICON_CHEVRON_DOWN = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>`;
const ICON_PLUS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>`;

interface Props {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  dimmed?: boolean;
  onAddItem?: () => void;
  extraActions?: React.ReactNode;
  children: React.ReactNode;
}

export default function SidebarSection({
  title,
  count,
  expanded,
  onToggle,
  dimmed,
  onAddItem,
  extraActions,
  children,
}: Props) {
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddItem?.();
  };

  return (
    <div className="mb-1">
      <div
        className={`w-full flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium tracking-wider uppercase cursor-pointer hover:bg-white/[0.03] rounded transition-colors ${
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
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            dimmed ? "bg-white/[0.03]" : "bg-white/[0.05]"
          }`}
        >
          {count}
        </span>
        {extraActions}
        {onAddItem && (
          <IconButton
            size="md"
            onClick={handleAddClick}
            title={`Add ${title.toLowerCase()}`}
            className="opacity-50 hover:opacity-100"
          >
            <span dangerouslySetInnerHTML={{ __html: ICON_PLUS }} />
          </IconButton>
        )}
      </div>

      {expanded && (
        <div className="space-y-0.5 mt-0.5">
          {children}
        </div>
      )}
    </div>
  );
}
