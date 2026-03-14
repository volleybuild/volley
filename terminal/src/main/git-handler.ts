import { ipcMain } from "electron";
import { execFileSync, execFile } from "node:child_process";
import { loadStateFromDisk, type SessionState } from "./state-reader";
import {
  type ProviderName,
  getProviderInfo,
  getDefaultBranch,
  buildPrUrl,
} from "./git-provider";

/** Background fetch: caches last-fetch timestamps per repo to avoid repeated network calls */
const lastFetchTime = new Map<string, number>();
const FETCH_COOLDOWN_MS = 60_000; // only fetch once per minute per repo

function backgroundFetch(cwd: string, branch: string): void {
  const key = `${cwd}:${branch}`;
  const now = Date.now();
  const last = lastFetchTime.get(key) ?? 0;
  if (now - last < FETCH_COOLDOWN_MS) return; // still fresh
  lastFetchTime.set(key, now);
  // Fire-and-forget async fetch — never blocks the main process
  execFile("git", ["fetch", "origin", branch], {
    cwd, encoding: "utf-8", timeout: 15_000,
  }, (err: any) => {
    if (err) console.log(`[volley] background fetch failed for ${branch}:`, err.message);
  });
}

function hasRemote(cwd: string): boolean {
  try {
    const remotes = execFileSync("git", ["remote"], {
      cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return remotes.split("\n").includes("origin");
  } catch { return false; }
}

function resolveSession(repoRoot: string, sessionId: string): SessionState | null {
  const state = loadStateFromDisk(repoRoot);
  return state?.sessions.find(s => s.id === sessionId) ?? null;
}

/** Return the subset of `paths` that should be excluded from change lists. */
function getIgnoredPaths(cwd: string, paths: string[]): Set<string> {
  const ignored = new Set<string>();
  if (paths.length === 0) return ignored;

  // 1. Check files directly against gitignore
  try {
    const out = execFileSync("git", ["check-ignore", "--no-index", ...paths], {
      cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (out) out.split("\n").forEach(p => ignored.add(p.trim()));
  } catch { /* exit 1 = no matches */ }

  // 2. Check parent directories with trailing slash — catches patterns like
  //    "node_modules/" which only match directories but miss symlinks to dirs
  const dirsToCheck = new Set<string>();
  for (const p of paths) {
    if (ignored.has(p)) continue;
    const slash = p.indexOf("/");
    if (slash > 0) dirsToCheck.add(p.substring(0, slash));
  }
  if (dirsToCheck.size > 0) {
    const dirArgs = Array.from(dirsToCheck).map(d => d + "/");
    try {
      const out = execFileSync("git", ["check-ignore", "--no-index", ...dirArgs], {
        cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (out) {
        const ignoredDirs = new Set(out.split("\n").map(d => d.trim().replace(/\/$/, "")));
        for (const p of paths) {
          if (ignored.has(p)) continue;
          const slash = p.indexOf("/");
          if (slash > 0 && ignoredDirs.has(p.substring(0, slash))) {
            ignored.add(p);
          }
        }
      }
    } catch { /* exit 1 = no matches */ }
  }

  return ignored;
}

/** Parse `git status --porcelain` output into staged/unstaged change lists, filtering ignored paths. */
function parseGitChanges(cwd: string): { staged: { path: string; status: string }[]; unstaged: { path: string; status: string }[] } {
  const output = execFileSync("git", ["status", "--porcelain"], {
    cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
  }).trimEnd();
  if (!output) return { staged: [], unstaged: [] };

  const allPaths = output.split("\n")
    .filter(l => l.length >= 4)
    .map(l => { const raw = l.substring(3); return raw.includes(" -> ") ? raw.split(" -> ")[1] : raw; });
  const ignoredPaths = getIgnoredPaths(cwd, allPaths);

  const staged: { path: string; status: string }[] = [];
  const unstaged: { path: string; status: string }[] = [];

  for (const line of output.split("\n")) {
    if (line.length < 4) continue;
    const x = line[0];
    const y = line[1];
    const rawPath = line.substring(3);
    const filePath = rawPath.includes(" -> ") ? rawPath.split(" -> ")[1] : rawPath;
    if (ignoredPaths.has(filePath)) continue;
    if (x !== " " && x !== "?") staged.push({ path: filePath, status: x });
    if (y !== " ") unstaged.push({ path: filePath, status: y === "?" ? "?" : y });
  }

  return { staged, unstaged };
}

export function registerGitHandlers(getRepoRoot: () => string | null, getProvider: () => ProviderName | undefined): void {

  // ── git:status ──────────────────────────────────────────────────────────

  ipcMain.handle("git:status", (_event, { sessionId }: { sessionId: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { dirty: false, files: [], error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { dirty: false, files: [], error: "Session not found" };
    try {
      const output = execFileSync("git", ["status", "--porcelain"], {
        cwd: session.worktreePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      const files = output ? output.split("\n") : [];
      return { dirty: files.length > 0, files };
    } catch (err: any) {
      return { dirty: false, files: [], error: err.message };
    }
  });

  // ── git:commit ──────────────────────────────────────────────────────────

  ipcMain.handle("git:commit", (_event, { sessionId, message, files }: { sessionId: string; message: string; files?: string[] }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { ok: false, error: "Session not found" };
    try {
      if (files && files.length > 0) {
        execFileSync("git", ["add", "--", ...files], {
          cwd: session.worktreePath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      } else {
        execFileSync("git", ["add", "-A"], {
          cwd: session.worktreePath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      }
      execFileSync("git", ["commit", "-m", message], {
        cwd: session.worktreePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── git:push ────────────────────────────────────────────────────────────

  ipcMain.handle("git:push", (_event, { sessionId }: { sessionId: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { ok: false, error: "Session not found" };
    try {
      execFileSync("git", ["push", "-u", "origin", session.branch], {
        cwd: session.worktreePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Build PR URL using provider detection
      let prUrl: string | undefined;
      try {
        const info = getProviderInfo(session.worktreePath, getProvider());
        const baseBranch = getDefaultBranch(session.worktreePath);
        prUrl = buildPrUrl(info, session.branch, baseBranch) ?? undefined;
      } catch { /* ignore PR URL errors */ }

      return { ok: true, prUrl };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── git:diff-stat ───────────────────────────────────────────────────────

  ipcMain.handle("git:diff-stat", (_event, { sessionId }: { sessionId: string }) => {
    const empty = { added: 0, modified: 0, deleted: 0, hasConflicts: false };
    const repoRoot = getRepoRoot();
    if (!repoRoot) return empty;
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return empty;

    const cwd = session.worktreePath;
    const sourceBranch = session.baseBranch || getDefaultBranch(cwd);
    const remote = hasRemote(cwd);
    const sourceRef = remote ? `origin/${sourceBranch}` : sourceBranch;

    // Find merge-base using session's base branch directly (no branch iteration)
    let bestBase: string | null = null;
    let bestMergeBase: string | null = null;
    try {
      bestMergeBase = execFileSync("git", ["merge-base", "HEAD", sourceRef], {
        cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 5000,
      }).trim();
      bestBase = sourceRef;
    } catch { /* no merge base found */ }

    let added = 0;
    let modified = 0;
    let deleted = 0;
    const changedFiles = new Set<string>();

    // Committed changes: diff against merge-base
    if (bestMergeBase) {
      try {
        const output = execFileSync("git", ["diff", "--name-status", bestMergeBase, "HEAD"], {
          cwd: session.worktreePath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (output) {
          for (const line of output.split("\n")) {
            const parts = line.split("\t");
            if (parts.length < 2) continue;
            const file = parts[parts.length - 1];
            if (changedFiles.has(file)) continue;
            changedFiles.add(file);
            const s = parts[0][0];
            if (s === "A") added++;
            else if (s === "D") deleted++;
            else modified++;
          }
        }
      } catch { /* no diff available */ }
    }

    // Uncommitted changes: reuse parseGitChanges (already filters ignored files)
    try {
      const { staged, unstaged } = parseGitChanges(session.worktreePath);
      for (const entry of [...staged, ...unstaged]) {
        if (changedFiles.has(entry.path)) continue;
        changedFiles.add(entry.path);
        const s = entry.status;
        if (s === "A" || s === "?") added++;
        else if (s === "D") deleted++;
        else modified++;
      }
    } catch { /* ignore */ }

    // Check for potential conflicts: files changed on both our branch and the base
    let hasConflicts = false;
    if (bestBase && bestMergeBase && changedFiles.size > 0) {
      try {
        const theirs = execFileSync("git", ["diff", "--name-only", `${bestMergeBase}..${bestBase}`], {
          cwd: session.worktreePath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (theirs) {
          for (const f of theirs.split("\n")) {
            if (changedFiles.has(f)) { hasConflicts = true; break; }
          }
        }
      } catch { /* ignore */ }
    }

    return { added, modified, deleted, hasConflicts };
  });

  // ── git:line-stat ──────────────────────────────────────────────────────

  ipcMain.handle("git:line-stat", (_event, { sessionId }: { sessionId: string }) => {
    const empty = { files: 0, insertions: 0, deletions: 0 };
    const repoRoot = getRepoRoot();
    if (!repoRoot) return empty;
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return empty;

    const cwd = session.worktreePath;
    const fileSet = new Set<string>();
    let insertions = 0;
    let deletions = 0;

    const sourceBranch = session.baseBranch || getDefaultBranch(cwd);
    const remote = hasRemote(cwd);
    const sourceRef = remote ? `origin/${sourceBranch}` : sourceBranch;

    // Find merge-base using session's base branch directly (no branch iteration)
    let mergeBase: string | null = null;
    try {
      mergeBase = execFileSync("git", ["merge-base", "HEAD", sourceRef], {
        cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 5000,
      }).trim();
    } catch { /* no merge base found */ }

    // Committed changes: numstat against merge-base
    if (mergeBase) {
      try {
        const output = execFileSync("git", ["diff", "--numstat", `${mergeBase}..HEAD`], {
          cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (output) {
          for (const line of output.split("\n")) {
            const [ins, del, file] = line.split("\t");
            if (!file || ins === "-") continue; // binary
            fileSet.add(file);
            insertions += parseInt(ins, 10) || 0;
            deletions += parseInt(del, 10) || 0;
          }
        }
      } catch { /* no diff */ }
    }

    // Uncommitted changes (staged + unstaged tracked files)
    for (const args of [["diff", "--numstat"], ["diff", "--numstat", "--cached"]]) {
      try {
        const output = execFileSync("git", args, {
          cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (output) {
          for (const line of output.split("\n")) {
            const [ins, del, file] = line.split("\t");
            if (!file || ins === "-") continue; // binary
            fileSet.add(file);
            insertions += parseInt(ins, 10) || 0;
            deletions += parseInt(del, 10) || 0;
          }
        }
      } catch { /* ignore */ }
    }

    // Untracked files: git diff --numstat misses these, use parseGitChanges
    // which filters out gitignored paths (including symlinked directories)
    try {
      const { staged, unstaged } = parseGitChanges(cwd);
      for (const entry of [...staged, ...unstaged]) {
        if (entry.status !== "?" || fileSet.has(entry.path)) continue;
        // Count lines in untracked file via --no-index diff
        try {
          execFileSync("git", ["diff", "--numstat", "--no-index", "/dev/null", entry.path], {
            cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
          });
        } catch (e: any) {
          // exit code 1 = files differ, stdout has the numstat
          const out = (e.stdout || "").trim();
          if (out) {
            const [ins, del] = out.split("\t");
            if (ins && ins !== "-") {
              fileSet.add(entry.path);
              insertions += parseInt(ins, 10) || 0;
              deletions += parseInt(del, 10) || 0;
            }
          }
        }
      }
    } catch { /* ignore */ }

    return { files: fileSet.size, insertions, deletions };
  });

  // ── git:session-status ─────────────────────────────────────────────────

  ipcMain.handle("git:session-status", (_event, { sessionId }: { sessionId: string }) => {
    const empty = { uncommitted: 0, unpushed: 0, behind: 0, hasConflicts: false, sourceBranch: "main" };
    const repoRoot = getRepoRoot();
    if (!repoRoot) return empty;
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return empty;

    const cwd = session.worktreePath;
    const sourceBranch = session.baseBranch || getDefaultBranch(cwd);

    // uncommitted: count unique changed files (reuses same logic as git:changes)
    let uncommitted = 0;
    try {
      const { staged, unstaged } = parseGitChanges(cwd);
      const uniqueFiles = new Set([...staged, ...unstaged].map(e => e.path));
      uncommitted = uniqueFiles.size;
    } catch { /* ignore */ }

    // current branch name
    let currentBranch = "";
    try {
      currentBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch { /* ignore */ }

    const remote = hasRemote(cwd);
    // Use origin/<branch> when remote exists, local <branch> otherwise
    const sourceRef = remote ? `origin/${sourceBranch}` : sourceBranch;

    // unpushed: commits ahead of origin/<branch> (only meaningful with a remote)
    let unpushed = 0;
    if (currentBranch && remote) {
      try {
        unpushed = parseInt(execFileSync("git", ["rev-list", "--count", `origin/${currentBranch}..HEAD`], {
          cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
        }).trim(), 10) || 0;
      } catch { /* no upstream — count commits since branch point from source branch */
        try {
          const mergeBase = execFileSync("git", ["merge-base", "HEAD", sourceRef], {
            cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
          }).trim();
          unpushed = parseInt(execFileSync("git", ["rev-list", "--count", `${mergeBase}..HEAD`], {
            cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
          }).trim(), 10) || 0;
        } catch { /* ignore */ }
      }
    }

    // behind: commits on source branch not in HEAD
    // Trigger a background fetch so we eventually detect newly pushed commits
    // (never blocks the main process — uses cached data until fetch completes)
    if (remote) {
      backgroundFetch(cwd, sourceBranch);
    }

    let behind = 0;
    try {
      behind = parseInt(execFileSync("git", ["rev-list", "--count", `HEAD..${sourceRef}`], {
        cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      }).trim(), 10) || 0;
    } catch { /* ignore */ }

    // hasConflicts: files changed on both branches
    let hasConflicts = false;
    try {
      const mergeBase = execFileSync("git", ["merge-base", "HEAD", sourceRef], {
        cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      if (mergeBase) {
        const oursRaw = execFileSync("git", ["diff", "--name-only", mergeBase], {
          cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        const theirsRaw = execFileSync("git", ["diff", "--name-only", `${mergeBase}..${sourceRef}`], {
          cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
        }).trim();

        if (oursRaw && theirsRaw) {
          const ours = new Set(oursRaw.split("\n"));
          for (const f of theirsRaw.split("\n")) {
            if (ours.has(f)) { hasConflicts = true; break; }
          }
        }
      }
    } catch { /* ignore */ }

    return { uncommitted, unpushed, behind, hasConflicts, sourceBranch };
  });

  // ── git:changes ────────────────────────────────────────────────────────

  ipcMain.handle("git:changes", (_event, { sessionId }: { sessionId: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { staged: [], unstaged: [], error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { staged: [], unstaged: [], error: "Session not found" };
    try {
      return parseGitChanges(session.worktreePath);
    } catch (err: any) {
      return { staged: [], unstaged: [], error: err.message };
    }
  });

  // ── git:stage ─────────────────────────────────────────────────────────

  ipcMain.handle("git:stage", (_event, { sessionId, files }: { sessionId: string; files: string[] }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { ok: false, error: "Session not found" };
    try {
      // Filter out gitignored files to avoid "The following paths are ignored" errors
      const ignored = getIgnoredPaths(session.worktreePath, files);
      const safeFiles = files.filter(f => !ignored.has(f));
      if (safeFiles.length === 0) return { ok: true };
      execFileSync("git", ["add", "--", ...safeFiles], {
        cwd: session.worktreePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── git:unstage ───────────────────────────────────────────────────────

  ipcMain.handle("git:unstage", (_event, { sessionId, files }: { sessionId: string; files: string[] }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { ok: false, error: "Session not found" };
    try {
      execFileSync("git", ["reset", "HEAD", "--", ...files], {
        cwd: session.worktreePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── git:discard ───────────────────────────────────────────────────────

  ipcMain.handle("git:discard", (_event, { sessionId, files }: { sessionId: string; files: string[] }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { ok: false, error: "Session not found" };
    try {
      // Separate tracked vs untracked
      const trackedFiles: string[] = [];
      const untrackedFiles: string[] = [];
      for (const f of files) {
        try {
          execFileSync("git", ["ls-files", "--error-unmatch", f], {
            cwd: session.worktreePath,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          });
          trackedFiles.push(f);
        } catch {
          untrackedFiles.push(f);
        }
      }
      if (trackedFiles.length > 0) {
        execFileSync("git", ["checkout", "HEAD", "--", ...trackedFiles], {
          cwd: session.worktreePath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      }
      if (untrackedFiles.length > 0) {
        execFileSync("git", ["clean", "-f", "--", ...untrackedFiles], {
          cwd: session.worktreePath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── git:file-diff ─────────────────────────────────────────────────────

  ipcMain.handle("git:file-diff", (_event, { sessionId, filePath, staged }: { sessionId: string; filePath: string; staged: boolean }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { diff: "", error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { diff: "", error: "Session not found" };
    try {
      let diff: string;
      if (staged) {
        diff = execFileSync("git", ["diff", "--cached", "--", filePath], {
          cwd: session.worktreePath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      } else {
        // Try normal diff first
        try {
          diff = execFileSync("git", ["diff", "--", filePath], {
            cwd: session.worktreePath,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          });
        } catch {
          diff = "";
        }
        // If empty, file might be untracked — use --no-index
        if (!diff.trim()) {
          try {
            execFileSync("git", ["diff", "--no-index", "/dev/null", filePath], {
              cwd: session.worktreePath,
              encoding: "utf-8",
              stdio: ["pipe", "pipe", "pipe"],
            });
            diff = ""; // identical (shouldn't happen for untracked)
          } catch (e: any) {
            // exit code 1 means files differ — stdout has the diff
            if (e.stdout) {
              diff = e.stdout;
            } else {
              diff = "";
            }
          }
        }
      }
      return { diff };
    } catch (err: any) {
      return { diff: "", error: err.message };
    }
  });

  // ── git:provider ────────────────────────────────────────────────────────

  ipcMain.handle("git:provider", (_event, { sessionId }: { sessionId: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { provider: "unknown" as const, repoPath: "", webUrl: "", cliAvailable: false };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) {
      return { provider: "unknown" as const, repoPath: "", webUrl: "", cliAvailable: false };
    }
    return getProviderInfo(session.worktreePath, getProvider());
  });

  // ── git:create-pr ─────────────────────────────────────────────────────

  ipcMain.handle("git:create-pr", (_event, { sessionId, title, body, base }: { sessionId: string; title: string; body: string; base: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { ok: false, error: "Session not found" };

    const cwd = session.worktreePath;
    const info = getProviderInfo(cwd, getProvider());

    if (info.provider === "github" && info.cliAvailable) {
      try {
        const args = ["pr", "create", "--title", title, "--body", body, "--base", base];
        const output = execFileSync("gh", args, {
          cwd,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        // gh pr create prints the PR URL on success
        return { ok: true, url: output };
      } catch (err: any) {
        return { ok: false, error: err.stderr || err.message };
      }
    }

    if (info.provider === "gitlab" && info.cliAvailable) {
      try {
        const args = ["mr", "create", "--title", title, "--description", body, "--target-branch", base, "--source-branch", session.branch, "-y"];
        const output = execFileSync("glab", args, {
          cwd,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        return { ok: true, url: output };
      } catch (err: any) {
        return { ok: false, error: err.stderr || err.message };
      }
    }

    // Fallback: return browser PR URL
    const baseBranch = base || getDefaultBranch(cwd);
    const prUrl = buildPrUrl(info, session.branch, baseBranch);
    return { ok: false, prUrl: prUrl ?? undefined, error: "No CLI available — use browser" };
  });

  // ── git:list-branches ────────────────────────────────────────────────

  ipcMain.handle("git:list-branches", () => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { branches: [], current: "" };

    let current = "";
    try {
      current = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: repoRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch { /* ignore */ }

    const branches: { name: string; remote: boolean }[] = [];
    const localNames = new Set<string>();

    // Local branches
    try {
      const out = execFileSync("git", ["branch", "--format=%(refname:short)"], {
        cwd: repoRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (out) {
        for (const name of out.split("\n")) {
          const trimmed = name.trim();
          if (trimmed) {
            localNames.add(trimmed);
            branches.push({ name: trimmed, remote: false });
          }
        }
      }
    } catch { /* ignore */ }

    // Remote branches (deduplicate against locals)
    try {
      const out = execFileSync("git", ["branch", "-r", "--format=%(refname:short)"], {
        cwd: repoRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (out) {
        for (const name of out.split("\n")) {
          const trimmed = name.trim();
          if (!trimmed || trimmed.includes("/HEAD")) continue;
          // Strip origin/ prefix for dedup check
          const shortName = trimmed.replace(/^origin\//, "");
          if (localNames.has(shortName)) continue;
          branches.push({ name: trimmed, remote: true });
        }
      }
    } catch { /* ignore */ }

    return { branches, current };
  });

  // ── git:merge-source ──────────────────────────────────────────────────

  ipcMain.handle("git:merge-source", (_event, { sessionId }: { sessionId: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { ok: false, error: "Session not found" };

    const cwd = session.worktreePath;
    const sourceBranch = session.baseBranch || getDefaultBranch(cwd);
    const remote = hasRemote(cwd);
    const mergeRef = remote ? `origin/${sourceBranch}` : sourceBranch;

    try {
      if (remote) {
        execFileSync("git", ["fetch", "origin", sourceBranch], {
          cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
        });
      }
      const output = execFileSync("git", ["merge", mergeRef], {
        cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      return { ok: true, output };
    } catch (err: any) {
      // Check if we're in a merge-conflict state
      let conflictFiles: string[] = [];
      try {
        const raw = execFileSync("git", ["diff", "--name-only", "--diff-filter=U"], {
          cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (raw) conflictFiles = raw.split("\n");
      } catch { /* ignore */ }

      const msg = (err.stderr || err.stdout || err.message || "").toString().trim();
      return {
        ok: false,
        error: msg || "Merge failed",
        conflicts: conflictFiles.length > 0 ? conflictFiles : undefined,
      };
    }
  });

  // ── git:land ────────────────────────────────────────────────────────

  ipcMain.handle("git:land", (_event, { sessionId }: { sessionId: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };
    const session = resolveSession(repoRoot, sessionId);
    if (!session) return { ok: false, error: "Session not found" };

    const baseBranch = session.baseBranch || getDefaultBranch(session.worktreePath);

    // Check for uncommitted changes in the session worktree
    try {
      const status = execFileSync("git", ["status", "--porcelain"], {
        cwd: session.worktreePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (status) {
        return { ok: false, error: "Session has uncommitted changes — commit or discard them first" };
      }
    } catch (err: any) {
      return { ok: false, error: err.message };
    }

    // Check for uncommitted changes in the base branch (repoRoot)
    try {
      const baseStatus = execFileSync("git", ["status", "--porcelain"], {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (baseStatus) {
        return { ok: false, error: `Target branch "${baseBranch}" has uncommitted changes — commit or stash them first` };
      }
    } catch (err: any) {
      return { ok: false, error: `Failed to check target branch: ${err.message}` };
    }

    // Merge session branch into base branch (runs from repoRoot)
    try {
      execFileSync("git", ["merge", session.branch], {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err: any) {
      const msg = err.stdout || err.stderr || err.message || "";
      if (msg.includes("CONFLICT")) {
        // Abort the failed merge so repoRoot is clean
        try {
          execFileSync("git", ["merge", "--abort"], {
            cwd: repoRoot,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          });
        } catch { /* ignore */ }
        return { ok: false, error: "Merge conflicts — resolve manually or use the PR flow" };
      }
      return { ok: false, error: `Merge failed: ${msg}` };
    }

    return { ok: true, baseBranch };
  });

  // ── git:push-base-branch ──────────────────────────────────────────────

  ipcMain.handle("git:push-base-branch", (_event, { baseBranch }: { baseBranch: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };
    try {
      execFileSync("git", ["push", "origin", baseBranch], {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });
}
