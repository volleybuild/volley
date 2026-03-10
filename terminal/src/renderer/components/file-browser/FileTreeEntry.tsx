import React, { useState, useCallback } from "react";
import { getFileIcon } from "../../constants/file-icons";

const ICON_CHEVRON_RIGHT = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>`;
const ICON_CHEVRON_DOWN = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>`;
const ICON_FILE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const ICON_FOLDER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`;

interface Entry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface Props {
  entry: Entry;
  basePath: string;
  depth: number;
  activeFilePath: string | null;
  onFileSelect: (path: string, basePath: string) => void;
  changedFiles?: Map<string, string>;
}

const ENTRY_BASE = "flex items-center gap-1 py-0.5 px-2 cursor-pointer select-none whitespace-nowrap hover:bg-white/[0.04]";

function changeDotColor(status: string | undefined): string {
  if (!status) return "";
  switch (status) {
    case "A": case "?": return "bg-emerald-400";
    case "M": case "dir": return "bg-yellow-400";
    case "D": return "bg-red-400";
    default: return "bg-yellow-400";
  }
}

export default function FileTreeEntry({ entry, basePath, depth, activeFilePath, onFileSelect, changedFiles }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<Entry[] | null>(null);

  const handleDirClick = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && children === null) {
      const entries = await window.volley.fs.readdir(entry.path, basePath);
      setChildren(entries);
    }
  }, [expanded, children, entry.path, basePath]);

  const handleFileClick = useCallback(() => {
    onFileSelect(entry.path, basePath);
  }, [entry.path, basePath, onFileSelect]);

  const paddingLeft = 8 + depth * 16;
  const isActive = !entry.isDirectory && entry.path === activeFilePath;

  if (entry.isDirectory) {
    return (
      <div>
        <div
          className={`${ENTRY_BASE} text-gray-400`}
          style={{ paddingLeft }}
          onClick={handleDirClick}
        >
          <span
            className="flex-shrink-0 flex items-center w-2.5"
            dangerouslySetInnerHTML={{
              __html: expanded ? ICON_CHEVRON_DOWN : ICON_CHEVRON_RIGHT,
            }}
          />
          <span className="flex-shrink-0 flex items-center text-accent-bright">
            <span dangerouslySetInnerHTML={{ __html: ICON_FOLDER }} />
          </span>
          <span className="overflow-hidden text-ellipsis">{entry.name}</span>
          {changedFiles?.has(entry.path) && (
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${changeDotColor(changedFiles.get(entry.path))}`} />
          )}
        </div>
        {expanded && children && (
          <div>
            {children.map((child) => (
              <FileTreeEntry
                key={child.path}
                entry={child}
                basePath={basePath}
                depth={depth + 1}
                activeFilePath={activeFilePath}
                onFileSelect={onFileSelect}
                changedFiles={changedFiles}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const fileIcon = getFileIcon(entry.name) || ICON_FILE;
  const changeStatus = changedFiles?.get(entry.path);

  return (
    <div
      className={`${ENTRY_BASE} ${isActive ? "bg-accent/10 text-gray-200" : "text-gray-400"}`}
      style={{ paddingLeft }}
      onClick={handleFileClick}
    >
      <span
        className="flex-shrink-0 flex items-center w-2.5"
        style={{ visibility: "hidden" }}
        dangerouslySetInnerHTML={{ __html: ICON_CHEVRON_RIGHT }}
      />
      <span className="flex-shrink-0 flex items-center">
        <span dangerouslySetInnerHTML={{ __html: fileIcon }} />
      </span>
      <span className="overflow-hidden text-ellipsis">{entry.name}</span>
      {changeStatus && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${changeDotColor(changeStatus)}`} />
      )}
    </div>
  );
}
