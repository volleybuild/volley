import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { VolleyState, Session } from "./types.js";
import { getRepoRoot } from "./utils/git.js";
import { getWorktreeDir, getStatePath, ensureDir } from "./utils/paths.js";

/** Migrate sessions to include lifecycle field */
function migrateState(state: VolleyState): VolleyState {
  for (const session of state.sessions) {
    // Existing sessions without lifecycle field are "in_progress"
    if (!(session as Session).lifecycle) {
      (session as Session).lifecycle = "in_progress";
    }
  }
  return state;
}

export function loadState(): VolleyState {
  const repoRoot = getRepoRoot();
  const statePath = getStatePath(repoRoot);

  if (existsSync(statePath)) {
    const raw = readFileSync(statePath, "utf-8");
    const state = JSON.parse(raw) as VolleyState;
    return migrateState(state);
  }

  return { repoRoot, sessions: [] };
}

export function saveState(state: VolleyState): void {
  const dir = getWorktreeDir(state.repoRoot);
  ensureDir(dir);
  writeFileSync(getStatePath(state.repoRoot), JSON.stringify(state, null, 2));
}

export function ensureGitignore(repoRoot: string): void {
  const gitignorePath = join(repoRoot, ".gitignore");
  const entry = ".volley/";

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (content.includes(entry)) return;
    writeFileSync(gitignorePath, content.trimEnd() + "\n" + entry + "\n");
  } else {
    writeFileSync(gitignorePath, entry + "\n");
  }
}
