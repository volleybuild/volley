import React, { useEffect, useState, useCallback } from "react";
import { useUiStore } from "../../store/ui-store";
import { useSessionStore } from "../../store/session-store";
import { getLanguageFromPath } from "../../constants/languages";
import { formatFileSize } from "../../utils/format";
import { useChangedFiles } from "../../hooks/use-changed-files";
import FileTreeEntry from "./FileTreeEntry";

interface Entry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export default function FileTreePanel() {
  const basePath = useUiStore((s) => s.fileTreeBasePath);
  const openFileViewer = useUiStore((s) => s.openFileViewer);
  const activeFilePath = useUiStore((s) => s.activeFilePath);
  const setActiveFilePath = useUiStore((s) => s.setActiveFilePath);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const changedFiles = useChangedFiles(activeSessionId);

  const [rootName, setRootName] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadedBasePath, setLoadedBasePath] = useState<string | null>(null);

  useEffect(() => {
    if (!basePath) return;
    if (basePath === loadedBasePath) return;

    setLoadedBasePath(basePath);
    (async () => {
      const name = await window.volley.fs.repoRoot(basePath);
      setRootName(name);
      const items = await window.volley.fs.readdir(".", basePath);
      setEntries(items);
    })();
  }, [basePath, loadedBasePath]);

  const handleFileSelect = useCallback(
    async (path: string, base: string) => {
      setActiveFilePath(path);
      const result = await window.volley.fs.readfile(path, base);
      if (!result) return;

      const lang = getLanguageFromPath(path);
      let highlighted: string | undefined;

      if (lang) {
        highlighted = await window.volley.highlight.run(result.content, lang);
      }
      if (!highlighted) {
        highlighted = await window.volley.highlight.auto(result.content);
      }
      if (!highlighted) {
        // Simple HTML escaping
        const div = document.createElement("div");
        div.textContent = result.content;
        highlighted = div.innerHTML;
      }

      // Wrap each line in a <span class="line"> for CSS counter line numbers
      const lines = highlighted.split("\n");
      const content = lines
        .map((line) => `<span class="line">${line || " "}</span>`)
        .join("");

      const size =
        formatFileSize(result.size) + (result.truncated ? " (truncated)" : "");

      openFileViewer(result.relativePath, content, size);
    },
    [openFileViewer, setActiveFilePath],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-1 flex-shrink-0" />
      <div className="flex items-center px-3 py-1 flex-shrink-0">
        <span className="text-gray-500 text-[11px] tracking-wide truncate">
          {rootName}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto text-xs">
        {entries.map((entry) => (
          <FileTreeEntry
            key={entry.path}
            entry={entry}
            basePath={basePath}
            depth={0}
            activeFilePath={activeFilePath}
            onFileSelect={handleFileSelect}
            changedFiles={changedFiles}
          />
        ))}
      </div>
    </div>
  );
}
