import React, { useState, useEffect } from "react";

interface Props {
  name: string;
  input: Record<string, any>;
  id: string;
  result?: string;
}

/** One-line summary of a tool call */
function toolSummary(name: string, input: Record<string, any>): string {
  switch (name) {
    case "Read":
      return input.file_path || input.path || "";
    case "Edit":
      return input.file_path || input.path || "";
    case "Write":
      return input.file_path || input.path || "";
    case "Bash":
      return input.command ? (input.command.length > 80 ? input.command.slice(0, 80) + "..." : input.command) : "";
    case "Glob":
      return input.pattern || "";
    case "Grep":
      return input.pattern ? `/${input.pattern}/` : "";
    default:
      return "";
  }
}

const TOOL_ICONS: Record<string, string> = {
  Read: "M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z",
  Edit: "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  Write: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  Bash: "M4 17l6-6-6-6M12 19h8",
  Glob: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  Grep: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
};

export default function ToolCallBlock({ name, input, id, result }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [highlightedResult, setHighlightedResult] = useState<string | null>(null);
  const summary = toolSummary(name, input);

  // Highlight result content
  useEffect(() => {
    if (!expanded || !result) return;
    // For short results just show plain
    if (result.length < 100) {
      setHighlightedResult(null);
      return;
    }
    // Try auto-highlight via IPC
    window.volley.highlight.auto(result.slice(0, 5000)).then((html) => {
      if (html) setHighlightedResult(html);
    });
  }, [expanded, result]);

  const iconPath = TOOL_ICONS[name] || TOOL_ICONS.Bash;

  return (
    <div className="rounded border border-white/[0.06] bg-vo-surface overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer hover:bg-white/[0.03] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className={`text-gray-600 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="currentColor"
        >
          <path d="M2 1l4 3-4 3V1z" />
        </svg>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 flex-shrink-0">
          <path d={iconPath} />
        </svg>
        <span className="text-[11px] font-medium text-gray-400">{name}</span>
        {summary && (
          <span className="text-[11px] text-gray-600 font-mono truncate">{summary}</span>
        )}
        {result !== undefined && (
          <span className="ml-auto text-[9px] text-gray-500 flex-shrink-0">done</span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/[0.04] px-3 py-2 space-y-2 max-h-[400px] overflow-y-auto">
          {/* Input */}
          <div>
            <span className="text-[9px] text-gray-600 uppercase tracking-wider">Input</span>
            {name === "Bash" && input.command ? (
              <pre className="text-[11px] font-mono text-gray-400 mt-1 whitespace-pre-wrap break-all bg-vo-base rounded px-2 py-1.5">
                $ {input.command}
              </pre>
            ) : name === "Edit" ? (
              <div className="text-[11px] font-mono mt-1 space-y-1">
                <div className="text-gray-500">{input.file_path || input.path}</div>
                {input.old_string && (
                  <pre className="text-red-400/70 bg-red-500/[0.05] rounded px-2 py-1 whitespace-pre-wrap break-all">
                    - {input.old_string}
                  </pre>
                )}
                {input.new_string && (
                  <pre className="text-green-400/80 bg-green-500/[0.06] rounded px-2 py-1 whitespace-pre-wrap break-all">
                    + {input.new_string}
                  </pre>
                )}
              </div>
            ) : (
              <pre className="text-[11px] font-mono text-gray-400 mt-1 whitespace-pre-wrap break-all bg-vo-base rounded px-2 py-1.5">
                {JSON.stringify(input, null, 2)}
              </pre>
            )}
          </div>

          {/* Result */}
          {result !== undefined && (
            <div>
              <span className="text-[9px] text-gray-600 uppercase tracking-wider">Output</span>
              {highlightedResult ? (
                <pre
                  className="text-[11px] font-mono mt-1 bg-vo-base rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-all"
                  dangerouslySetInnerHTML={{ __html: highlightedResult }}
                />
              ) : (
                <pre className="text-[11px] font-mono text-gray-400 mt-1 whitespace-pre-wrap break-all bg-vo-base rounded px-2 py-1.5 max-h-[200px] overflow-y-auto">
                  {result || "(empty)"}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
