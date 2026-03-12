import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from "electron";
import { execFile, execFileSync, spawn } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import hljs from "highlight.js/lib/common";
import { PtyManager } from "./pty-manager";
import { SocketServer } from "./socket-server";
import { loadStateFromDisk } from "./state-reader";
import { registerFsHandlers } from "./fs-handler";
import { registerGitHandlers } from "./git-handler";
import { registerSettingsHandlers } from "./settings-handler";
import { registerAgentHandlers } from "./agent-handler";
import { spawnCliArgs } from "./cli-resolver";
import {
  loadRegistry,
  addProject,
  removeProject,
  setActiveProject,
  migrateCurrentRepo,
} from "./project-manager";
import type { ProviderName } from "./git-provider";
import { log, logError, getLogFilePath } from "./logger";

// ── Module-level state ────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
let ptyManager: PtyManager;
let socketServer: SocketServer | null = null;
let repoRoot: string | null = null;
let providerOverride: ProviderName | undefined;
let stateWatcher: fs.FSWatcher | null = null;

function detectRepoRoot(): string | null {
  // Explicit --repo flag takes priority
  const args = process.argv.slice(2);
  const repoIdx = args.indexOf("--repo");
  if (repoIdx !== -1 && args[repoIdx + 1]) {
    return path.resolve(args[repoIdx + 1]);
  }

  // First, check if we're in a git worktree — if so, use the main repo
  // This must happen BEFORE directory traversal, because worktrees may have
  // their own .volley.json copied from the main repo
  try {
    const gitCommonDir = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // git-common-dir returns the path to the shared .git directory
    // For worktrees this is an absolute path like /path/to/main-repo/.git
    // For regular repos this is just ".git" (relative)
    if (gitCommonDir && gitCommonDir !== ".git") {
      // We're in a worktree — gitCommonDir is an absolute path to main repo's .git
      // Remove the /.git suffix to get the main repo path
      const mainRepo = gitCommonDir.endsWith("/.git")
        ? gitCommonDir.slice(0, -5)  // Remove "/.git"
        : path.dirname(path.resolve(gitCommonDir));
      if (fs.existsSync(path.join(mainRepo, ".volley", "state.json")) ||
          fs.existsSync(path.join(mainRepo, ".volley.json"))) {
        log("detected worktree, using main repo:", mainRepo);
        return mainRepo;
      }
    }
  } catch {
    // Not in a git repo or git not available — continue with directory traversal
  }

  // Try multiple starting points — Electron/electronmon can change cwd
  const startDirs = [
    process.cwd(),
    // __dirname is terminal/dist/main — go up 3 levels to repo root
    path.resolve(__dirname, "..", "..", ".."),
    // app path
    app.getAppPath(),
  ];

  for (const start of startDirs) {
    let dir = start;
    while (true) {
      if (fs.existsSync(path.join(dir, ".volley.json"))) {
        return dir;
      }
      if (fs.existsSync(path.join(dir, ".volley", "state.json"))) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  // Last resort: try git show-toplevel for regular repos
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function createWindow(): BrowserWindow {
  const iconPath = path.join(__dirname, "..", "..", "resources", "icon.png");
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#08080c",
    icon,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Set macOS dock icon
  if (process.platform === "darwin" && icon) {
    app.dock.setIcon(icon);
  }

  const viteDevServer = process.env.VITE_DEV_SERVER;
  if (viteDevServer) {
    win.loadURL(viteDevServer);
  } else {
    win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  }

  return win;
}

// Track session IDs we've already opened so we can diff on state changes
// Maps session id → lifecycle so we can detect lifecycle transitions
const knownSessions = new Map<string, string>();

// Track pending sessions: pendingId → task name
const pendingTasks = new Map<string, string>();

function syncSessions(): void {
  if (!repoRoot) return;
  const state = loadStateFromDisk(repoRoot);
  if (!state) {
    log("syncSessions: no state file");
    return;
  }
  log("syncSessions:", state.sessions.length, "sessions in state, known:", knownSessions.size);

  const activeIds = new Set<string>();

  const slugify = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "-");

  for (const session of state.sessions) {
    // Skip sessions with invalid status
    if (session.status !== "running" && session.status !== "idle" && session.status !== "done") continue;

    // For in_progress sessions, check worktree exists
    // Todo and completed sessions don't have worktrees
    const lifecycle = session.lifecycle || "in_progress"; // Migration fallback
    if (lifecycle === "in_progress" && !fs.existsSync(session.worktreePath)) continue;

    activeIds.add(session.id);

    const previousLifecycle = knownSessions.get(session.id);

    if (previousLifecycle === undefined) {
      // New session we haven't seen yet — spawn pty and notify renderer
      knownSessions.set(session.id, lifecycle);

      // Only spawn PTY for in_progress sessions with worktrees
      if (lifecycle === "in_progress" && session.worktreePath && !ptyManager.has(session.id)) {
        ptyManager.spawn(session.worktreePath, session.id);
      }

      // Match pending task to this session by task name or session id
      let matchedPendingId: string | undefined;
      for (const [pendingId, task] of pendingTasks) {
        if (slugify(task) === slugify(session.task) || slugify(task) === slugify(session.id)) {
          matchedPendingId = pendingId;
          pendingTasks.delete(pendingId);
          break;
        }
      }

      log("sending session:opened for", session.id, `lifecycle=${lifecycle}`, matchedPendingId ? `(was pending ${matchedPendingId})` : "");
      mainWindow?.webContents.send("session:opened", {
        id: session.id,
        slug: session.id,
        branch: session.branch,
        baseBranch: session.baseBranch,
        worktreePath: session.worktreePath,
        task: session.task,
        lifecycle,
        completedAt: session.completedAt,
        mergedTo: session.mergedTo,
        pendingId: matchedPendingId,
      });
    } else if (previousLifecycle !== lifecycle) {
      // Lifecycle transition (e.g. "todo" → "in_progress")
      knownSessions.set(session.id, lifecycle);

      // Spawn PTY if transitioning to in_progress
      if (lifecycle === "in_progress" && session.worktreePath && !ptyManager.has(session.id)) {
        ptyManager.spawn(session.worktreePath, session.id);
      }

      // Match pending task by task name or session id
      let matchedPendingId: string | undefined;
      for (const [pendingId, task] of pendingTasks) {
        if (slugify(task) === slugify(session.task) || slugify(task) === slugify(session.id)) {
          matchedPendingId = pendingId;
          pendingTasks.delete(pendingId);
          break;
        }
      }

      log("lifecycle transition for", session.id, `${previousLifecycle} → ${lifecycle}`, matchedPendingId ? `(was pending ${matchedPendingId})` : "");
      mainWindow?.webContents.send("session:opened", {
        id: session.id,
        slug: session.id,
        branch: session.branch,
        baseBranch: session.baseBranch,
        worktreePath: session.worktreePath,
        task: session.task,
        lifecycle,
        completedAt: session.completedAt,
        mergedTo: session.mergedTo,
        pendingId: matchedPendingId,
      });
    }
  }

  // Sessions that were removed from state — close them
  for (const id of knownSessions.keys()) {
    if (!activeIds.has(id)) {
      knownSessions.delete(id);
      ptyManager.kill(id);
      mainWindow?.webContents.send("session:closed", { sessionId: id });
    }
  }
}

function teardownStateWatcher(): void {
  if (stateWatcher) {
    stateWatcher.close();
    stateWatcher = null;
  }
}

function watchStateFile(): void {
  // Already watching — don't create duplicate watchers on page reload
  if (stateWatcher) return;
  if (!repoRoot) return;

  const statePath = path.join(repoRoot, ".volley", "state.json");

  // Debounce — state.json may be written multiple times quickly
  let debounce: ReturnType<typeof setTimeout> | null = null;

  const doWatch = () => {
    if (!fs.existsSync(statePath)) {
      // File doesn't exist yet — poll until it appears
      setTimeout(doWatch, 2000);
      return;
    }
    try {
      stateWatcher = fs.watch(statePath, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => syncSessions(), 300);
      });
      stateWatcher.on("error", () => {
        // File may have been deleted and recreated — retry
        stateWatcher?.close();
        stateWatcher = null;
        setTimeout(doWatch, 2000);
      });
    } catch {
      setTimeout(doWatch, 2000);
    }
  };

  doWatch();
}

/** Read provider override from .volley.json for current repo */
function readProviderOverride(): ProviderName | undefined {
  if (!repoRoot) return undefined;
  try {
    const raw = fs.readFileSync(path.join(repoRoot, ".volley.json"), "utf-8");
    const config = JSON.parse(raw);
    return config.provider || undefined;
  } catch {
    return undefined;
  }
}

/** Switch to a different project — tears down current state and sets up new one */
function switchToProject(projectPath: string): void {
  log("switching project:", repoRoot, "→", projectPath);
  // Tear down current project
  ptyManager.killAll();
  socketServer?.stop();
  socketServer = null;
  teardownStateWatcher();
  knownSessions.clear();
  pendingTasks.clear();

  // Set new project
  repoRoot = path.resolve(projectPath);
  providerOverride = readProviderOverride();

  // Start new socket server
  socketServer = new SocketServer(repoRoot, ptyManager);
  socketServer.setWindow(mainWindow!);
  socketServer.start();

  // Notify renderer
  const registry = loadRegistry();
  const project = registry.projects.find((p) => p.path === repoRoot);
  mainWindow?.webContents.send("project:switched", {
    projectId: project?.id ?? null,
    projectName: project?.name ?? path.basename(repoRoot),
    projectPath: repoRoot,
  });

  // Sync sessions for new project
  syncSessions();
  watchStateFile();
}

// ── CLI spawn helper ─────────────────────────────────────────────────────

/** Base env for CLI subprocesses — tells the CLI not to open external terminals */
const cliBaseEnv = { ...process.env, VOLLEY_TERMINAL: "volley" };

function spawnCli(args: string[], cwd: string) {
  const [cmd, fullArgs, extraEnv] = spawnCliArgs(args);
  return spawn(cmd, fullArgs, {
    cwd,
    env: { ...cliBaseEnv, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function execCli(args: string[], cwd: string, callback: (err: Error | null, stdout: string, stderr: string) => void) {
  const [cmd, fullArgs, extraEnv] = spawnCliArgs(args);
  execFile(cmd, fullArgs, { cwd, env: { ...cliBaseEnv, ...extraEnv } }, callback);
}

// ── App startup ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const detectedRepo = detectRepoRoot();
  log("cwd:", process.cwd());
  log("__dirname:", __dirname);
  log("detected repo:", detectedRepo);

  ptyManager = new PtyManager();

  mainWindow = createWindow();
  ptyManager.setWindow(mainWindow);

  // Block Electron's default Cmd+Shift+R reload — we use it for "run"
  mainWindow.webContents.on("before-input-event", (_event, input) => {
    if ((input.meta || input.control) && input.shift && input.key.toLowerCase() === "r") {
      _event.preventDefault();
    }
  });

  // Cmd+Option+I / Ctrl+Shift+I to toggle dev tools
  mainWindow.webContents.on("before-input-event", (_event, input) => {
    if ((input.meta && input.alt && input.key.toLowerCase() === "i") ||
        (input.control && input.shift && input.key.toLowerCase() === "i")) {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  // ── Register all IPC handlers ONCE with getter closures ────────────────

  registerFsHandlers(() => repoRoot);
  registerGitHandlers(() => repoRoot, () => providerOverride);
  registerSettingsHandlers(() => repoRoot);
  registerAgentHandlers(() => repoRoot, () => mainWindow);

  // ── PTY handlers ───────────────────────────────────────────────────────

  ipcMain.on("pty:write", (_event, { sessionId, data }: { sessionId: string; data: string }) => {
    ptyManager.write(sessionId, data);
  });

  ipcMain.on("pty:resize", (_event, { sessionId, cols, rows }: { sessionId: string; cols: number; rows: number }) => {
    ptyManager.resize(sessionId, cols, rows);
  });

  ipcMain.on("pty:kill", (_event, { sessionId }: { sessionId: string }) => {
    ptyManager.kill(sessionId);
  });

  // Syntax highlighting (highlight.js runs in main process — CJS module)
  ipcMain.handle("hljs:highlight", (_event, { code, language }: { code: string; language: string }) => {
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      return "";
    }
  });

  ipcMain.handle("hljs:highlightAuto", (_event, { code }: { code: string }) => {
    try {
      return hljs.highlightAuto(code).value;
    } catch {
      return "";
    }
  });

  // ── Project IPC handlers ───────────────────────────────────────────────

  ipcMain.handle("project:list", () => {
    const registry = loadRegistry();
    return { projects: registry.projects, activeProjectId: registry.activeProjectId };
  });

  ipcMain.handle("project:add", async (_event, { repoPath }: { repoPath: string }) => {
    try {
      const result = addProject(repoPath);
      return { ok: true, project: result.project, registry: result.registry };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("project:remove", (_event, { projectId }: { projectId: string }) => {
    try {
      const registry = removeProject(projectId);
      return { ok: true, registry };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("project:switch", (_event, { projectId }: { projectId: string }) => {
    try {
      const registry = setActiveProject(projectId);
      const project = registry.projects.find((p) => p.id === projectId);
      if (!project) return { ok: false, error: "Project not found" };
      switchToProject(project.path);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("project:pick-folder", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openDirectory"],
      title: "Select a git repository",
    });
    if (result.canceled || result.filePaths.length === 0) return { path: null };
    return { path: result.filePaths[0] };
  });

  // ── Initialize project ─────────────────────────────────────────────────

  // Migrate current repo into project registry if needed
  migrateCurrentRepo(detectedRepo);

  // Load active project from registry (or fall back to detected repo)
  const registry = loadRegistry();
  if (registry.activeProjectId) {
    const activeProject = registry.projects.find((p) => p.id === registry.activeProjectId);
    if (activeProject) {
      repoRoot = path.resolve(activeProject.path);
    }
  }
  if (!repoRoot && detectedRepo) {
    repoRoot = path.resolve(detectedRepo);
  }

  providerOverride = readProviderOverride();

  if (repoRoot) {
    log("repoRoot:", repoRoot);
    log("state path:", path.join(repoRoot, ".volley", "state.json"));
    log("state exists:", fs.existsSync(path.join(repoRoot, ".volley", "state.json")));

    socketServer = new SocketServer(repoRoot, ptyManager);
    socketServer.setWindow(mainWindow);
    socketServer.start();
  } else {
    logError("could not detect repo root");
  }

  // Wait for renderer to signal it's ready, then sync
  // Use .on (not .once) so page reloads (Cmd+R) re-sync sessions
  ipcMain.on("renderer:ready", () => {
    log("renderer ready, syncing sessions...");
    // Clear known sessions so all get re-sent to the fresh renderer
    knownSessions.clear();
    syncSessions();
    watchStateFile();
  });

  // ── Session handlers ────────────────────────────────────────────────────

  // Handle new session requests from renderer
  ipcMain.on("session:start", (_event, { task, baseBranch }: { task: string; baseBranch?: string }) => {
    if (!repoRoot) return;

    const pendingId = "pending-" + Date.now();
    pendingTasks.set(pendingId, task);

    // Notify renderer immediately so a pending tab appears
    mainWindow?.webContents.send("session:pending", { pendingId, task });

    const args = ["start", task];
    if (baseBranch) args.push("--base", baseBranch);
    log("session:start CLI args:", args, "cwd:", repoRoot);
    const child = spawnCli(args, repoRoot);

    child.stdout?.on("data", (chunk: Buffer) => {
      mainWindow?.webContents.send("session:setup-output", { pendingId, data: chunk.toString() });
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      log("session:start stderr:", text.trimEnd());
      mainWindow?.webContents.send("session:setup-output", { pendingId, data: text });
    });

    child.on("error", (err) => {
      logError("session:start spawn error:", err.message);
      pendingTasks.delete(pendingId);
      mainWindow?.webContents.send("session:setup-failed", { pendingId, error: err.message });
    });

    child.on("exit", (code) => {
      log("session:start exited with code", code);
      if (code !== 0) {
        pendingTasks.delete(pendingId);
        mainWindow?.webContents.send("session:setup-failed", { pendingId, error: `volley start exited with code ${code}` });
      } else {
        // On success, trigger syncSessions to pick up the new session
        // The file watcher should also trigger this, but we do it explicitly to avoid race conditions
        setTimeout(() => syncSessions(), 100);
      }
    });
  });

  // ── Config handlers ───────────────────────────────────────────────────

  ipcMain.handle("config:get-log-path", () => {
    return { path: getLogFilePath() };
  });

  ipcMain.handle("config:open-log-file", async () => {
    const logPath = getLogFilePath();
    await shell.openPath(logPath);
    return { ok: true };
  });

  ipcMain.handle("config:get-start", () => {
    if (!repoRoot) return { command: null };
    const configPath = path.join(repoRoot, ".volley.json");
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(raw);
      return { command: config.start || null };
    } catch {
      return { command: null };
    }
  });

  // ── Run terminal handlers ─────────────────────────────────────────────

  ipcMain.handle("run:start", (_event, { sessionId }: { sessionId: string }) => {
    if (!repoRoot) return { ok: false, error: "No repo root" };
    // Read start command from config
    const configPath = path.join(repoRoot, ".volley.json");
    let command: string | null = null;
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(raw);
      command = config.start || null;
    } catch { /* no config */ }
    if (!command) return { ok: false, error: "No start command configured" };

    // Find the session's worktree path
    const state = loadStateFromDisk(repoRoot);
    const session = state?.sessions.find(s => s.id === sessionId);
    if (!session) return { ok: false, error: "Session not found" };

    ptyManager.spawnRun(session.worktreePath, sessionId, command);
    return { ok: true };
  });

  ipcMain.on("run:stop", (_event, { sessionId }: { sessionId: string }) => {
    ptyManager.killRun(sessionId);
  });

  ipcMain.on("run:write", (_event, { sessionId, data }: { sessionId: string; data: string }) => {
    ptyManager.writeRun(sessionId, data);
  });

  ipcMain.on("run:resize", (_event, { sessionId, cols, rows }: { sessionId: string; cols: number; rows: number }) => {
    ptyManager.resizeRun(sessionId, cols, rows);
  });

  ipcMain.handle("session:remove", (_event, { sessionId }: { sessionId: string }) => {
    if (!repoRoot) return Promise.resolve({ ok: false, error: "No repo root" });
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      execCli(["remove", sessionId, "--force"], repoRoot!, (err, _stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: stderr || err.message });
        } else {
          resolve({ ok: true });
        }
      });
    });
  });

  // Create a todo session (no worktree/branch yet)
  ipcMain.handle("session:create-todo", (_event, { task }: { task: string }) => {
    if (!repoRoot) return Promise.resolve({ ok: false, error: "No repo root" });
    return new Promise<{ ok: boolean; id?: string; error?: string }>((resolve) => {
      execCli(["todo", task], repoRoot!, (err, _stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: stderr || err.message });
        } else {
          // Trigger sync to pick up the new session
          setTimeout(() => syncSessions(), 100);
          resolve({ ok: true });
        }
      });
    });
  });

  // Update a todo session's task
  ipcMain.handle("session:update-todo", (_event, { sessionId, task }: { sessionId: string; task: string }) => {
    if (!repoRoot) return Promise.resolve({ ok: false, error: "No repo root" });
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      execCli(["todo", "--update", sessionId, task], repoRoot!, (err, _stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: stderr || err.message });
        } else {
          setTimeout(() => syncSessions(), 100);
          resolve({ ok: true });
        }
      });
    });
  });

  // Start a todo session (creates worktree/branch)
  ipcMain.on("session:start-todo", (_event, { sessionId, baseBranch }: { sessionId: string; baseBranch?: string }) => {
    if (!repoRoot) return;

    const pendingId = "pending-" + Date.now();
    pendingTasks.set(pendingId, sessionId);

    // Notify renderer that setup is in progress
    mainWindow?.webContents.send("session:pending", { pendingId, task: sessionId });

    const args = ["start", sessionId];
    if (baseBranch) args.push("--base", baseBranch);
    log("session:start-todo CLI args:", args, "cwd:", repoRoot);
    const child = spawnCli(args, repoRoot);

    child.stdout?.on("data", (chunk: Buffer) => {
      mainWindow?.webContents.send("session:setup-output", { pendingId, data: chunk.toString() });
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      log("session:start-todo stderr:", text.trimEnd());
      mainWindow?.webContents.send("session:setup-output", { pendingId, data: text });
    });

    child.on("error", (err) => {
      logError("session:start-todo spawn error:", err.message);
      pendingTasks.delete(pendingId);
      mainWindow?.webContents.send("session:setup-failed", { pendingId, error: err.message });
    });

    child.on("exit", (code) => {
      log("session:start-todo exited with code", code);
      if (code !== 0) {
        pendingTasks.delete(pendingId);
        mainWindow?.webContents.send("session:setup-failed", { pendingId, error: `volley start exited with code ${code}` });
      } else {
        setTimeout(() => syncSessions(), 100);
      }
    });
  });

  // Mark session as completed
  ipcMain.handle("session:complete", (_event, { sessionId, mergedTo }: { sessionId: string; mergedTo?: string }) => {
    if (!repoRoot) return Promise.resolve({ ok: false, error: "No repo root" });
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const args = ["complete", sessionId];
      if (mergedTo) args.push("--merged-to", mergedTo);

      execCli(args, repoRoot!, (err, _stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: stderr || err.message });
        } else {
          setTimeout(() => syncSessions(), 100);
          resolve({ ok: true });
        }
      });
    });
  });

  // Delete session from history
  ipcMain.handle("session:delete", (_event, { sessionId }: { sessionId: string }) => {
    if (!repoRoot) return Promise.resolve({ ok: false, error: "No repo root" });
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      execCli(["delete", sessionId], repoRoot!, (err, _stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: stderr || err.message });
        } else {
          setTimeout(() => syncSessions(), 100);
          resolve({ ok: true });
        }
      });
    });
  });

  ipcMain.on("shell:openExternal", (_event, { url }: { url: string }) => {
    shell.openExternal(url);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

app.on("window-all-closed", () => {
  ptyManager?.killAll();
  socketServer?.stop();
  app.quit();
});

app.on("before-quit", () => {
  stateWatcher?.close();
  ptyManager?.killAll();
  socketServer?.stop();
});
