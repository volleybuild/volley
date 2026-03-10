import React from "react";

interface Props {
  name: string;
  input: Record<string, any>;
  isDone: boolean;
}

/** One-line summary of a tool call for grid view */
function toolSummary(name: string, input: Record<string, any>): string {
  switch (name) {
    case "Read":
      return input.file_path || input.path || "";
    case "Edit":
      return input.file_path || input.path || "";
    case "Write":
      return input.file_path || input.path || "";
    case "Bash":
      return input.command
        ? input.command.length > 40
          ? input.command.slice(0, 40) + "..."
          : input.command
        : "";
    case "Glob":
      return input.pattern || "";
    case "Grep":
      return input.pattern ? `/${input.pattern}/` : "";
    case "Task":
      return input.description || "";
    case "WebFetch":
      return input.url || "";
    case "WebSearch":
      return input.query || "";
    default:
      return "";
  }
}

const TOOL_ICONS: Record<string, string> = {
  Read: "M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z",
  Edit: "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  Write: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  Bash: "M4 17l6-6-6-6M12 19h8",
  Glob: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  Grep: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  Task: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  WebFetch: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  WebSearch: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
};

/**
 * Ultra-compact tool call display for grid cells.
 * Single line: icon | name | summary | status
 */
export default function GridToolCall({ name, input, isDone }: Props) {
  const summary = toolSummary(name, input);
  const iconPath = TOOL_ICONS[name] || TOOL_ICONS.Bash;

  return (
    <div className="flex items-center gap-1.5 text-[10px] py-0.5">
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-gray-600 flex-shrink-0"
      >
        <path d={iconPath} />
      </svg>
      <span className="text-gray-400 font-medium flex-shrink-0">{name}</span>
      {summary && (
        <span className="text-gray-600 font-mono truncate flex-1 min-w-0">
          {summary}
        </span>
      )}
      {isDone ? (
        <span className="text-accent-dim flex-shrink-0">✓</span>
      ) : (
        <span className="text-accent-bright flex-shrink-0 grid-tool-running">
          ⟳
        </span>
      )}
    </div>
  );
}
