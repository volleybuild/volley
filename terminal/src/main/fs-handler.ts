import { ipcMain } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";

const HIDDEN = new Set([".git", "node_modules", ".volley", "dist", ".DS_Store"]);
const MAX_FILE_SIZE = 500 * 1024; // 500KB

function safePath(base: string, relativePath: string): string | null {
  const resolved = path.resolve(base, relativePath);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    return null;
  }
  return resolved;
}

export function registerFsHandlers(getRepoRoot: () => string | null): void {
  ipcMain.handle(
    "fs:readdir",
    async (
      _event,
      { relativePath, basePath }: { relativePath: string; basePath?: string }
    ) => {
      const repoRoot = getRepoRoot();
      const base = basePath || repoRoot;
      if (!base) return [];
      const dirPath = safePath(base, relativePath);
      if (!dirPath) return [];

      try {
        const entries = await fs.promises.readdir(dirPath, {
          withFileTypes: true,
        });

        const results: {
          name: string;
          path: string;
          isDirectory: boolean;
        }[] = [];

        for (const entry of entries) {
          if (HIDDEN.has(entry.name)) continue;
          results.push({
            name: entry.name,
            path: path.join(relativePath, entry.name),
            isDirectory: entry.isDirectory(),
          });
        }

        // Sort: directories first, then alphabetical
        results.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory)
            return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

        return results;
      } catch {
        return [];
      }
    }
  );

  ipcMain.handle(
    "fs:readfile",
    async (
      _event,
      { relativePath, basePath }: { relativePath: string; basePath?: string }
    ) => {
      const repoRoot = getRepoRoot();
      const base = basePath || repoRoot;
      if (!base) return null;
      const filePath = safePath(base, relativePath);
      if (!filePath) return null;

      try {
        const stat = await fs.promises.stat(filePath);
        const truncated = stat.size > MAX_FILE_SIZE;
        const fd = await fs.promises.open(filePath, "r");
        const buffer = Buffer.alloc(Math.min(stat.size, MAX_FILE_SIZE));
        await fd.read(buffer, 0, buffer.length, 0);
        await fd.close();

        return {
          relativePath,
          content: buffer.toString("utf-8"),
          size: stat.size,
          truncated,
        };
      } catch {
        return null;
      }
    }
  );

  ipcMain.handle(
    "fs:reporoot",
    (_event, opts?: { basePath?: string }) => {
      const repoRoot = getRepoRoot();
      const base = opts?.basePath || repoRoot;
      if (!base) return "";
      return path.basename(base);
    }
  );
}
