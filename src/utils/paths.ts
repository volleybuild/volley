import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function getWorktreeDir(repoRoot: string): string {
  return join(repoRoot, ".volley");
}

export function getStatePath(repoRoot: string): string {
  return join(getWorktreeDir(repoRoot), "state.json");
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
