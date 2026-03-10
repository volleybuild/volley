import React from "react";
import { useUiStore } from "../../store/ui-store";

export default function FileViewer() {
  const fileViewerOpen = useUiStore((s) => s.fileViewerOpen);
  const fileViewerPath = useUiStore((s) => s.fileViewerPath);
  const fileViewerContent = useUiStore((s) => s.fileViewerContent);
  const fileViewerSize = useUiStore((s) => s.fileViewerSize);
  const closeFileViewer = useUiStore((s) => s.closeFileViewer);

  if (!fileViewerOpen) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-1 flex-shrink-0"
        style={{ fontSize: "11px" }}
      >
        <button
          className="flex items-center justify-center w-6 h-6 rounded text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"
          title="Back (Esc)"
          onClick={closeFileViewer}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5m0 0l7 7m-7-7l7-7" />
          </svg>
        </button>
        <span className="text-gray-300 truncate">{fileViewerPath}</span>
        <span className="flex-1" />
        <span className="text-gray-600">{fileViewerSize}</span>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="file-viewer-pre">
          <code dangerouslySetInnerHTML={{ __html: fileViewerContent }} />
        </pre>
      </div>
    </div>
  );
}
