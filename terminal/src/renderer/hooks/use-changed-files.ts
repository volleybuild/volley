import { useState, useEffect, useCallback, useRef } from "react";
import { useUiStore } from "../store/ui-store";

export function useChangedFiles(sessionId: string | null): Map<string, string> {
  const [changedFiles, setChangedFiles] = useState<Map<string, string>>(new Map());
  const gitActionVersion = useUiStore((s) => s.gitActionVersion);
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    if (!sessionId) {
      setChangedFiles(new Map());
      return;
    }
    window.volley.git.changes(sessionId).then((data) => {
      if (!mountedRef.current) return;
      const map = new Map<string, string>();

      // Merge staged + unstaged, unstaged takes priority for display
      for (const f of data.staged) {
        map.set(f.path, f.status);
      }
      for (const f of data.unstaged) {
        map.set(f.path, f.status);
      }

      // Bubble up to parent directories
      const dirSet = new Set<string>();
      for (const filePath of map.keys()) {
        const parts = filePath.split("/");
        for (let i = 1; i < parts.length; i++) {
          dirSet.add(parts.slice(0, i).join("/"));
        }
      }
      for (const dir of dirSet) {
        if (!map.has(dir)) {
          map.set(dir, "dir");
        }
      }

      setChangedFiles(map);
    }).catch(() => {});
  }, [sessionId]);

  useEffect(() => { refresh(); }, [refresh, gitActionVersion]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return changedFiles;
}
