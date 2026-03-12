import { spawn, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, symlinkSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import type { Session, VolleyState, SessionStats } from "./types.js";
import { git } from "./utils/git.js";
import { slugify } from "./utils/strings.js";
import { getWorktreeDir, ensureDir } from "./utils/paths.js";
import { loadVolleyConfig } from "./config.js";
import { loadState, saveState, ensureGitignore } from "./state.js";
import { retileWindows } from "./grid.js";
import { launchTerminal } from "./terminal.js";
import { getRepoRoot } from "./utils/git.js";

function getSocketPath(repoRoot: string): string {
  const hash = createHash("sha256").update(repoRoot).digest("hex").slice(0, 12);
  return `/tmp/volley-${hash}.sock`;
}

function sendSocketMessage(repoRoot: string, message: object): void {
  const socketPath = getSocketPath(repoRoot);
  if (!existsSync(socketPath)) return;

  const payload = JSON.stringify(message) + "\n";
  const script = [
    `const net = require("net");`,
    `const sock = net.createConnection(${JSON.stringify(socketPath)}, () => {`,
    `  sock.write(${JSON.stringify(payload)});`,
    `  sock.on("data", () => sock.destroy());`,
    `  setTimeout(() => sock.destroy(), 2000);`,
    `});`,
    `sock.on("error", () => process.exit(0));`,
  ].join("\n");
  spawn("node", ["-e", script], { detached: true, stdio: "ignore" }).unref();
}

export function startSession(task: string, branchPrefix = "vo", baseBranchOverride?: string): Session {
  const repoRoot = getRepoRoot();
  const volleyDir = getWorktreeDir(repoRoot);
  ensureDir(volleyDir);
  ensureGitignore(repoRoot);

  const slug = slugify(task);
  const id = slug || `session-${Date.now()}`;
  const branch = `${branchPrefix}/${id}`;
  const worktreePath = resolve(join(volleyDir, id));

  // Check for existing session with same id
  const state = loadState();
  if (state.sessions.find((s) => s.id === id)) {
    throw new Error(`Session "${id}" already exists. Use a different task name or remove it first.`);
  }

  // Create worktree + branch from current HEAD (or override)
  const baseBranch = baseBranchOverride || git("rev-parse --abbrev-ref HEAD", repoRoot);
  git(`worktree add -b ${branch} "${worktreePath}" ${baseBranch}`, repoRoot);

  // Apply .volley.json config (symlinks + setup commands)
  const config = loadVolleyConfig(repoRoot);

  // Always symlink .volley.json so volley commands work from inside sessions
  const volleyJsonPath = join(repoRoot, ".volley.json");
  if (config && existsSync(volleyJsonPath)) {
    const volleyJsonLink = join(worktreePath, ".volley.json");
    if (!existsSync(volleyJsonLink)) {
      symlinkSync(volleyJsonPath, volleyJsonLink);
    }
  }

  if (config) {
    if (config.symlinks) {
      for (const file of config.symlinks) {
        const target = join(repoRoot, file);
        const link = join(worktreePath, file);
        if (existsSync(target)) {
          // Skip if the file is tracked by git — the worktree already has it
          try {
            git(`ls-files --error-unmatch "${file}"`, repoRoot);
            console.log(`  Skipped ${file} (tracked by git)`);
            continue;
          } catch {
            // Not tracked — safe to symlink
          }
          ensureDir(dirname(link));
          symlinkSync(target, link);
          console.log(`  Symlinked ${file}`);
        }
      }
    }
    if (config.setup) {
      for (const cmd of config.setup) {
        console.log(`  Running: ${cmd}`);
        try {
          execSync(cmd, { cwd: worktreePath, stdio: "inherit" });
        } catch (err: any) {
          console.error(`  Command failed: ${cmd}`);
          // Continue — session will still be created
        }
      }
    }
  }

  const session: Session = {
    id,
    branch,
    baseBranch,
    worktreePath,
    task,
    status: "running",
    lifecycle: "in_progress",
    createdAt: new Date().toISOString(),
  };

  // Launch terminal in the worktree
  const termProcess = launchTerminal(worktreePath, task, branch, config?.terminal);
  // Volley terminal owns the pty — don't track the fire-and-forget PID
  if (config?.terminal !== "volley") {
    session.pid = termProcess.pid;
  }

  state.sessions.push(session);
  saveState(state);

  // Retile all windows if grid is enabled
  if (config?.grid) {
    // Small delay to let the new terminal window appear
    setTimeout(() => {
      retileWindows(state.sessions, config?.terminal, config?.grid);
    }, 500);
  }

  return session;
}

export function listSessions(): Session[] {
  const state = loadState();
  return refreshStatuses(state);
}

function refreshStatuses(state: VolleyState): Session[] {
  for (const session of state.sessions) {
    if (session.status === "running" && session.pid) {
      try {
        process.kill(session.pid, 0);
      } catch {
        session.status = "idle";
      }
    }
    // Sessions without a PID (e.g. volley terminal) stay "running" until removed
  }
  saveState(state);
  return state.sessions;
}

export function getSessionStatus(id: string): Session | undefined {
  const state = loadState();
  refreshStatuses(state);
  return state.sessions.find((s) => s.id === id);
}

export function removeSession(id: string, force = false): void {
  const state = loadState();
  const idx = state.sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`Session "${id}" not found.`);

  const session = state.sessions[idx];

  if (session.pid) {
    try {
      process.kill(session.pid, "SIGTERM");
    } catch {
      // already dead
    }
  }

  try {
    git(`worktree remove "${session.worktreePath}" ${force ? "--force" : ""}`, state.repoRoot);
  } catch (e) {
    if (!force) {
      throw new Error(
        `Could not remove worktree (uncommitted changes?). Use --force to override.\n${e}`
      );
    }
    execSync(`rm -rf "${session.worktreePath}"`);
    git("worktree prune", state.repoRoot);
  }

  try {
    git(`branch -D ${session.branch}`, state.repoRoot);
  } catch {
    // branch might have been merged/deleted already
  }

  state.sessions.splice(idx, 1);
  saveState(state);

  // Notify volley terminal to close the tab
  sendSocketMessage(state.repoRoot, {
    action: "close",
    requestId: `cli-remove-${Date.now()}`,
    sessionId: id,
  });

  // Retile remaining windows if grid is enabled
  const repoRoot = state.repoRoot;
  const config = loadVolleyConfig(repoRoot);
  if (config?.grid && state.sessions.length > 0) {
    retileWindows(state.sessions, config?.terminal, config?.grid);
  }
}

function formatElapsed(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getSessionStats(session: Session, repoRoot: string): SessionStats {
  const elapsed = formatElapsed(session.createdAt);

  try {
    const baseBranch = git("rev-parse --abbrev-ref HEAD", repoRoot);

    // Commit count on the branch
    let commits = 0;
    try {
      const count = git(`rev-list --count ${baseBranch}..${session.branch}`, repoRoot);
      commits = parseInt(count, 10) || 0;
    } catch {
      // branch may not have diverged yet
    }

    // Diff stats: committed changes (base..branch) + uncommitted changes in worktree
    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;

    try {
      // Get combined stats: committed + uncommitted
      const stat = git(`diff --shortstat ${baseBranch}`, session.worktreePath);
      if (stat) {
        const filesMatch = stat.match(/(\d+) file/);
        const insMatch = stat.match(/(\d+) insertion/);
        const delMatch = stat.match(/(\d+) deletion/);
        if (filesMatch) filesChanged = parseInt(filesMatch[1], 10);
        if (insMatch) insertions = parseInt(insMatch[1], 10);
        if (delMatch) deletions = parseInt(delMatch[1], 10);
      }
    } catch {
      // worktree may be in a bad state
    }

    return { elapsed, commits, filesChanged, insertions, deletions };
  } catch {
    return { elapsed, commits: 0, filesChanged: 0, insertions: 0, deletions: 0 };
  }
}

export function diffSession(id: string): string {
  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) throw new Error(`Session "${id}" not found.`);

  try {
    return git("diff HEAD", session.worktreePath);
  } catch {
    return "(no changes)";
  }
}

export function logSession(id: string): string {
  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) throw new Error(`Session "${id}" not found.`);

  const baseBranch = git("rev-parse --abbrev-ref HEAD", state.repoRoot);
  try {
    return git(`log --oneline ${baseBranch}..${session.branch}`, state.repoRoot);
  } catch {
    return "(no commits yet)";
  }
}

/**
 * Create a todo session (no worktree/branch yet, just metadata)
 */
export function createTodoSession(task: string): Session {
  const repoRoot = getRepoRoot();
  const volleyDir = getWorktreeDir(repoRoot);
  ensureDir(volleyDir);
  ensureGitignore(repoRoot);

  const slug = slugify(task);
  const id = slug || `session-${Date.now()}`;

  const state = loadState();
  if (state.sessions.find((s) => s.id === id)) {
    throw new Error(`Session "${id}" already exists. Use a different task name.`);
  }

  const session: Session = {
    id,
    branch: "",
    baseBranch: "",
    worktreePath: "",
    task,
    status: "idle",
    lifecycle: "todo",
    createdAt: new Date().toISOString(),
  };

  state.sessions.push(session);
  saveState(state);

  return session;
}

/**
 * Update a todo session's task description
 */
export function updateTodoSession(id: string, task: string): Session {
  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) throw new Error(`Session "${id}" not found.`);
  if (session.lifecycle !== "todo") {
    throw new Error(`Session "${id}" is not a todo (it's ${session.lifecycle}).`);
  }

  session.task = task;
  saveState(state);
  return session;
}

/**
 * Start a todo session (creates worktree/branch, moves to in_progress)
 */
export function startTodoSession(id: string, branchPrefix = "vo", baseBranchOverride?: string): Session {
  const state = loadState();
  const idx = state.sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`Session "${id}" not found.`);

  const session = state.sessions[idx];
  if (session.lifecycle !== "todo") {
    throw new Error(`Session "${id}" is not a todo (it's ${session.lifecycle}).`);
  }

  const repoRoot = state.repoRoot;
  const volleyDir = getWorktreeDir(repoRoot);
  const branch = `${branchPrefix}/${id}`;
  const worktreePath = resolve(join(volleyDir, id));

  // Create worktree + branch from current HEAD (or override)
  const baseBranch = baseBranchOverride || git("rev-parse --abbrev-ref HEAD", repoRoot);
  git(`worktree add -b ${branch} "${worktreePath}" ${baseBranch}`, repoRoot);

  // Apply .volley.json config (symlinks + setup commands)
  const config = loadVolleyConfig(repoRoot);

  // Always symlink .volley.json so volley commands work from inside sessions
  const volleyJsonPath = join(repoRoot, ".volley.json");
  if (config && existsSync(volleyJsonPath)) {
    const volleyJsonLink = join(worktreePath, ".volley.json");
    if (!existsSync(volleyJsonLink)) {
      symlinkSync(volleyJsonPath, volleyJsonLink);
    }
  }

  if (config) {
    if (config.symlinks) {
      for (const file of config.symlinks) {
        const target = join(repoRoot, file);
        const link = join(worktreePath, file);
        if (existsSync(target)) {
          try {
            git(`ls-files --error-unmatch "${file}"`, repoRoot);
            continue; // Skip tracked files
          } catch {
            // Not tracked — safe to symlink
          }
          ensureDir(dirname(link));
          symlinkSync(target, link);
        }
      }
    }
    if (config.setup) {
      for (const cmd of config.setup) {
        try {
          execSync(cmd, { cwd: worktreePath, stdio: "inherit" });
        } catch (err: any) {
          console.error(`  Command failed: ${cmd}`);
          // Continue — session will still be created
        }
      }
    }
  }

  // Update session to in_progress
  session.branch = branch;
  session.baseBranch = baseBranch;
  session.worktreePath = worktreePath;
  session.status = "running";
  session.lifecycle = "in_progress";

  // Launch terminal in the worktree
  const termProcess = launchTerminal(worktreePath, session.task, branch, config?.terminal);
  if (config?.terminal !== "volley") {
    session.pid = termProcess.pid;
  }

  saveState(state);

  // Retile all windows if grid is enabled
  if (config?.grid) {
    setTimeout(() => {
      retileWindows(state.sessions.filter(s => s.lifecycle === "in_progress"), config?.terminal, config?.grid);
    }, 500);
  }

  return session;
}

/**
 * Mark a session as completed (keeps metadata, deletes git resources)
 */
export function completeSession(id: string, mergedTo?: string): Session {
  const state = loadState();
  const idx = state.sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`Session "${id}" not found.`);

  const session = state.sessions[idx];
  if (session.lifecycle === "completed") {
    throw new Error(`Session "${id}" is already completed.`);
  }
  if (session.lifecycle === "todo") {
    throw new Error(`Session "${id}" is a todo and hasn't been started.`);
  }

  // Kill process if running
  if (session.pid) {
    try {
      process.kill(session.pid, "SIGTERM");
    } catch {
      // already dead
    }
  }

  // Remove worktree (if it exists)
  if (session.worktreePath && existsSync(session.worktreePath)) {
    try {
      git(`worktree remove "${session.worktreePath}" --force`, state.repoRoot);
    } catch {
      execSync(`rm -rf "${session.worktreePath}"`);
      git("worktree prune", state.repoRoot);
    }
  }

  // Remove branch (if it exists)
  if (session.branch) {
    try {
      git(`branch -D ${session.branch}`, state.repoRoot);
    } catch {
      // branch might have been merged/deleted already
    }
  }

  // Update session to completed state
  session.lifecycle = "completed";
  session.completedAt = new Date().toISOString();
  session.worktreePath = "";
  session.branch = "";
  session.status = "done";
  if (mergedTo) session.mergedTo = mergedTo;

  saveState(state);

  // Notify volley terminal
  sendSocketMessage(state.repoRoot, {
    action: "complete",
    requestId: `cli-complete-${Date.now()}`,
    sessionId: id,
  });

  return session;
}

/**
 * Permanently delete a session from history
 */
export function deleteSession(id: string): void {
  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) throw new Error(`Session "${id}" not found.`);

  // If it's a todo or completed session, just remove from state
  if (session.lifecycle === "todo" || session.lifecycle === "completed") {
    state.sessions = state.sessions.filter((s) => s.id !== id);
    saveState(state);

    sendSocketMessage(state.repoRoot, {
      action: "close",
      requestId: `cli-delete-${Date.now()}`,
      sessionId: id,
    });
    return;
  }

  // For in_progress sessions, use the existing removeSession logic
  removeSession(id, true);
}
