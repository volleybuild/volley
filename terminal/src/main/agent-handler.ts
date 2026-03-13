import { ipcMain, type BrowserWindow } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { loadStateFromDisk } from "./state-reader";

interface AgentSessionState {
  agentSessionId: string | null;
  messages: any[];
  activeQuery: any | null;
}

const agentSessions = new Map<string, AgentSessionState>();

function getAgentState(sessionId: string): AgentSessionState {
  let state = agentSessions.get(sessionId);
  if (!state) {
    state = { agentSessionId: null, messages: [], activeQuery: null };
    agentSessions.set(sessionId, state);
  }
  return state;
}

function getApiKey(): string | null {
  // Check env first
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // Read from user settings
  try {
    const settingsPath = path.join(os.homedir(), ".volley", "settings.json");
    const raw = fs.readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(raw);
    return settings.ai?.anthropicKey || null;
  } catch {
    return null;
  }
}

function resolveWorktree(repoRoot: string, sessionId: string): string | null {
  const state = loadStateFromDisk(repoRoot);
  const session = state?.sessions.find(s => s.id === sessionId);
  return session?.worktreePath ?? null;
}

/** Load cached messages from disk */
function loadMessageCache(repoRoot: string, sessionId: string): any[] {
  try {
    const cachePath = path.join(repoRoot, ".volley", "sessions", sessionId, "agent-messages.json");
    if (fs.existsSync(cachePath)) {
      return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    }
  } catch { /* ignore */ }
  return [];
}

/** Save message cache to disk */
function saveMessageCache(repoRoot: string, sessionId: string, messages: any[]): void {
  try {
    const dir = path.join(repoRoot, ".volley", "sessions", sessionId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "agent-messages.json"), JSON.stringify(messages), "utf-8");
  } catch { /* ignore */ }
}

/** Save agent session ID to state */
function saveAgentSessionId(repoRoot: string, sessionId: string, agentSessionId: string): void {
  try {
    const dir = path.join(repoRoot, ".volley", "sessions", sessionId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "agent-session.json"), JSON.stringify({ agentSessionId }), "utf-8");
  } catch { /* ignore */ }
}

/** Load agent session ID from disk */
function loadAgentSessionId(repoRoot: string, sessionId: string): string | null {
  try {
    const filePath = path.join(repoRoot, ".volley", "sessions", sessionId, "agent-session.json");
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return data.agentSessionId || null;
    }
  } catch { /* ignore */ }
  return null;
}

/** Read installed Claude Code skills from ~/.claude/skills/ */
function listInstalledSkills(): { name: string; description: string; content: string }[] {
  const skillsDir = path.join(os.homedir(), ".claude", "skills");
  try {
    if (!fs.existsSync(skillsDir)) return [];
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills: { name: string; description: string; content: string }[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const skillMd = path.join(skillsDir, entry.name, "SKILL.md");
      if (!fs.existsSync(skillMd)) continue;

      try {
        const raw = fs.readFileSync(skillMd, "utf-8");
        // Parse YAML frontmatter
        const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) continue;

        const fm = fmMatch[1];
        const nameMatch = fm.match(/^name:\s*(.+)$/m);
        const descMatch = fm.match(/^description:\s*"?(.+?)"?\s*$/m);
        const name = nameMatch ? nameMatch[1].trim() : entry.name;
        const description = descMatch ? descMatch[1].trim() : "";
        // Content is everything after frontmatter
        const content = raw.slice(fmMatch[0].length).trim();

        skills.push({ name, description, content });
      } catch { /* skip unreadable skills */ }
    }

    return skills;
  } catch {
    return [];
  }
}

export function registerAgentHandlers(getRepoRoot: () => string | null, getMainWindow: () => BrowserWindow | null): void {

  // ── agent:list-skills ─────────────────────────────────────────────────
  ipcMain.handle("agent:list-skills", () => {
    return listInstalledSkills();
  });

  // ── agent:save-image ──────────────────────────────────────────────────
  ipcMain.handle("agent:save-image", (_event, { sessionId, base64, mediaType }: { sessionId: string; base64: string; mediaType: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { path: null, error: "No repo root" };
    const worktree = resolveWorktree(repoRoot, sessionId);
    if (!worktree) return { path: null, error: "Session not found" };

    const ext = mediaType === "image/png" ? "png"
      : mediaType === "image/jpeg" ? "jpg"
      : mediaType === "image/gif" ? "gif"
      : mediaType === "image/webp" ? "webp"
      : "png";

    const dir = path.join(repoRoot, ".volley", "sessions", sessionId, "attachments");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `${Date.now()}.${ext}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, Buffer.from(base64, "base64"));

    return { path: filePath };
  });

  // ── agent:send ─────────────────────────────────────────────────────────
  ipcMain.on("agent:send", async (_event, { sessionId, prompt: initialPrompt, images }: { sessionId: string; prompt: string; images?: { base64: string; mediaType: string }[] }) => {
    let prompt = initialPrompt;
    const mainWindow = getMainWindow();
    if (!mainWindow) return;

    const repoRoot = getRepoRoot();
    if (!repoRoot) {
      mainWindow.webContents.send("agent:error", { sessionId, error: "No repo root" });
      return;
    }

    const apiKey = getApiKey();

    const worktree = resolveWorktree(repoRoot, sessionId);
    if (!worktree) {
      mainWindow.webContents.send("agent:error", { sessionId, error: "Session not found" });
      return;
    }

    const agentState = getAgentState(sessionId);

    // Try to load saved session ID if we don't have one
    if (!agentState.agentSessionId) {
      agentState.agentSessionId = loadAgentSessionId(repoRoot, sessionId);
    }

    // Load cached messages if we have none
    if (agentState.messages.length === 0) {
      agentState.messages = loadMessageCache(repoRoot, sessionId);
    }

    // Auto-inject brainstorm prompt on first message
    if (!agentState.agentSessionId && agentState.messages.length === 0) {
      const brainstormPath = path.join(repoRoot, ".volley", "sessions", sessionId, "brainstorm.md");
      if (fs.existsSync(brainstormPath)) {
        try {
          const brainstormContent = fs.readFileSync(brainstormPath, "utf-8");
          prompt = brainstormContent + "\n\n---\n\n" + prompt;
          // Rename to prevent re-injection
          fs.renameSync(brainstormPath, brainstormPath + ".used");
        } catch { /* ignore */ }
      }
    }

    // Persist the user's prompt so it survives restart
    const userEntry: any = { _type: "user-prompt", content: prompt };
    if (images && images.length > 0) {
      userEntry.images = images;
    }
    agentState.messages.push(userEntry);
    saveMessageCache(repoRoot, sessionId, agentState.messages);

    try {
      // Dynamic import — must use Function() to prevent tsc from converting to require(),
      // because the Agent SDK is ESM-only (.mjs) and cannot be require()'d.
      const importDynamic = new Function("specifier", "return import(specifier)");
      const { query } = await importDynamic("@anthropic-ai/claude-agent-sdk");

      const env: Record<string, string | undefined> = { ...process.env };
      if (apiKey) {
        env.ANTHROPIC_API_KEY = apiKey;
      }

      const options: Record<string, any> = {
        cwd: worktree,
        permissionMode: "acceptEdits" as const,
        allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
        includePartialMessages: true,
        env,
      };

      if (agentState.agentSessionId) {
        options.resume = agentState.agentSessionId;
      }

      const q = query({ prompt, options });
      agentState.activeQuery = q;

      let saveCounter = 0;

      for await (const message of q) {
        // Store the agent session ID on init
        if (message.type === "system" && (message as any).subtype === "init") {
          agentState.agentSessionId = (message as any).session_id;
          saveAgentSessionId(repoRoot, sessionId, agentState.agentSessionId!);
        }

        // Cache all non-streaming messages
        if (message.type !== "stream_event") {
          agentState.messages.push(message);
          saveCounter++;
          // Periodically persist to disk (every 5 messages)
          if (saveCounter % 5 === 0) {
            saveMessageCache(repoRoot, sessionId, agentState.messages);
          }
        }

        // Forward to renderer
        mainWindow.webContents.send("agent:message", { sessionId, message });
      }

      // Final save
      saveMessageCache(repoRoot, sessionId, agentState.messages);
      agentState.activeQuery = null;
      mainWindow.webContents.send("agent:done", { sessionId });
    } catch (err: any) {
      agentState.activeQuery = null;
      mainWindow.webContents.send("agent:error", { sessionId, error: err.message });
    }
  });

  // ── agent:interrupt ────────────────────────────────────────────────────
  ipcMain.on("agent:interrupt", (_event, { sessionId }: { sessionId: string }) => {
    const agentState = agentSessions.get(sessionId);
    if (agentState?.activeQuery) {
      try {
        agentState.activeQuery.abort();
      } catch {
        // Some versions use .interrupt()
        try { agentState.activeQuery.interrupt(); } catch { /* ignore */ }
      }
      agentState.activeQuery = null;
    }
  });

  // ── agent:history ──────────────────────────────────────────────────────
  ipcMain.handle("agent:history", (_event, { sessionId }: { sessionId: string }) => {
    const agentState = agentSessions.get(sessionId);
    if (agentState && agentState.messages.length > 0) {
      return agentState.messages;
    }
    // Try loading from disk
    const repoRoot = getRepoRoot();
    if (!repoRoot) return [];
    return loadMessageCache(repoRoot, sessionId);
  });
}
