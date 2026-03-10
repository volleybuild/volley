import React, { useState, useEffect, useRef } from "react";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";
import { html as diff2html } from "diff2html";

const MAX_DIFF_SIZE = 500 * 1024; // 500KB

export default function DiffViewerPane() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const diffFilePath = useUiStore((s) => s.diffFilePath);
  const diffStaged = useUiStore((s) => s.diffStaged);
  const closeDiff = useUiStore((s) => s.closeDiff);

  const [diffHtml, setDiffHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [tooLarge, setTooLarge] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeSessionId || !diffFilePath) return;
    setLoading(true);
    setTooLarge(false);
    setDiffHtml("");

    window.volley.git.fileDiff(activeSessionId, diffFilePath, diffStaged).then((result) => {
      if (result.error) {
        setDiffHtml(`<div class="text-red-400 p-4">${result.error}</div>`);
      } else if (!result.diff.trim()) {
        setDiffHtml('<div class="text-gray-600 p-4">No changes</div>');
      } else if (result.diff.length > MAX_DIFF_SIZE) {
        setTooLarge(true);
        // Show stats only
        const lines = result.diff.split("\n");
        const addCount = lines.filter(l => l.startsWith("+") && !l.startsWith("+++")).length;
        const delCount = lines.filter(l => l.startsWith("-") && !l.startsWith("---")).length;
        setDiffHtml(`<div class="text-gray-400 p-4">Diff too large to render (${(result.diff.length / 1024).toFixed(0)}KB)<br/><br/><span class="text-emerald-400">+${addCount}</span> <span class="text-red-400">-${delCount}</span></div>`);
      } else {
        const rendered = diff2html(result.diff, {
          outputFormat: "line-by-line",
          drawFileList: false,
          colorScheme: "dark",
        });
        setDiffHtml(rendered);
      }
      setLoading(false);
    }).catch(() => {
      setDiffHtml('<div class="text-red-400 p-4">Failed to load diff</div>');
      setLoading(false);
    });
  }, [activeSessionId, diffFilePath, diffStaged]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-2 py-1 flex-shrink-0 border-b border-white/[0.06]">
        <button
          className="text-[10px] text-gray-600 hover:text-gray-300 cursor-pointer"
          onClick={closeDiff}
          title="Back to changes"
        >
          ← Back
        </button>
        <span className="text-[10px] text-gray-400 truncate">{diffFilePath}</span>
        {diffStaged && (
          <span className="text-[9px] text-accent-bright/60 bg-accent-bright/10 rounded px-1">staged</span>
        )}
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto diff-viewer"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">Loading diff...</div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: diffHtml }} />
        )}
      </div>
    </div>
  );
}
