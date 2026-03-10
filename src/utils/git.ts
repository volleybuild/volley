import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { confirm } from "./prompt.js";

export function git(args: string, cwd?: string): string {
  return execSync(`git ${args}`, {
    cwd: cwd ?? process.cwd(),
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function isGitRepo(): boolean {
  try {
    git("rev-parse --show-toplevel");
    return true;
  } catch {
    return false;
  }
}

function initGitRepo(cwd: string): void {
  git("init", cwd);
  git("add -A", cwd);
  try {
    git('commit -m "Initial commit"', cwd);
  } catch {
    git('commit --allow-empty -m "Initial commit"', cwd);
  }
  console.log(`  Initialized git repo with initial commit.\n`);
}

export function getRepoRoot(): string {
  if (!isGitRepo()) {
    throw new Error("Not a git repository. Run `git init` first or use `volley start` which can initialize one for you.");
  }
  // Use --git-common-dir to always resolve to the main repo root,
  // even when running from inside a worktree
  const commonDir = git("rev-parse --git-common-dir");
  return resolve(process.cwd(), commonDir, "..");
}

export async function ensureGitRepo(): Promise<string> {
  if (!isGitRepo()) {
    const cwd = process.cwd();
    const ok = await confirm(`No git repo found. Initialize one in ${cwd}?`);
    if (!ok) {
      throw new Error("No git repository found. Run `git init` first.");
    }
    initGitRepo(cwd);
    return cwd;
  }
  const commonDir = git("rev-parse --git-common-dir");
  return resolve(process.cwd(), commonDir, "..");
}
