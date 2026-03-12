import { ipcMain, type BrowserWindow } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { loadStateFromDisk, saveStateToDisk } from "./state-reader";
import type { SessionState, PlanStatus, VolleyState } from "./state-reader";
import { log, logError } from "./logger";

// ── Module-level state ────────────────────────────────────────────────────

let currentSessionId: string | null = null;
let planQueue: string[] = [];
let abortController: AbortController | null = null;
let getRepoRoot: () => string | null = () => null;
let getMainWindow: () => BrowserWindow | null = () => null;

// ── Helpers ───────────────────────────────────────────────────────────────

function getApiKey(): string | null {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const settingsPath = path.join(os.homedir(), ".volley", "settings.json");
    const raw = fs.readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(raw);
    return settings.ai?.anthropicKey || null;
  } catch {
    return null;
  }
}

function notifyRenderer(sessionId: string, planStatus: PlanStatus, planMarkdown?: string, error?: string): void {
  const win = getMainWindow();
  if (!win) return;
  win.webContents.send("planning:status-changed", { sessionId, planStatus, planMarkdown, error });
}

function updatePlanStatus(repoRoot: string, sessionId: string, planStatus: PlanStatus, planMarkdown?: string): boolean {
  const state = loadStateFromDisk(repoRoot);
  if (!state) return false;
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return false;
  session.planStatus = planStatus;
  if (planMarkdown !== undefined) session.planMarkdown = planMarkdown;
  saveStateToDisk(repoRoot, state);
  return true;
}

function loadProjectContext(repoRoot: string): string | null {
  try {
    const contextPath = path.join(repoRoot, ".volley", "context.md");
    if (fs.existsSync(contextPath)) {
      return fs.readFileSync(contextPath, "utf-8");
    }
  } catch { /* ignore */ }
  return null;
}

function buildPlanPrompt(session: SessionState, repoRoot: string): string {
  const todoType = session.todoType || "feature";
  const typeInstructions: Record<string, string> = {
    bug: `This is a BUG report. Focus on:
- Root cause analysis: what is likely causing this bug?
- Fix location: which files and functions need to change?
- Testing strategy: how to verify the fix and prevent regression?`,
    feature: `This is a FEATURE request. Focus on:
- Architecture: how should this feature be structured?
- Components to create/modify: which files need changes?
- Data flow: how does data move through the feature?`,
    improvement: `This is an IMPROVEMENT to existing functionality. Focus on:
- Current behavior: what exists today?
- Changes needed: what specific modifications are required?
- Migration concerns: could this break existing behavior?`,
  };

  const projectContext = loadProjectContext(repoRoot);
  const contextBlock = projectContext
    ? `\n## Project Context\nThe following is a pre-analyzed summary of the project. Use this to avoid re-reading files you already know about:\n\n${projectContext}\n`
    : "";

  return `You are a planning assistant for a software project located at: ${repoRoot}
${contextBlock}
Task: ${session.task}
${session.description ? `\nDescription: ${session.description}` : ""}

${typeInstructions[todoType] || typeInstructions.feature}

${projectContext ? "Use the project context above to skip unnecessary exploration. Focus on the files relevant to this task." : "Analyze the codebase to understand the relevant code, then create an implementation plan."}

Your output MUST follow this format:

## Summary
A 1-2 sentence overview of what needs to be done.

## Relevant Files
List the key files that need to be read, modified, or created. Use bullet points with file paths.

## Approach
Step-by-step implementation plan. Be specific about what changes to make in each file.

## Open Questions
List any ambiguities or decisions that the developer should consider before implementing.

Keep the plan concise and actionable. Focus on the specific codebase — reference actual file paths and function names you find.`;
}

// ── Core planning logic ───────────────────────────────────────────────────

async function planSession(sessionId: string): Promise<void> {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    notifyRenderer(sessionId, "failed", undefined, "No repo root");
    return;
  }

  // Set status to planning
  updatePlanStatus(repoRoot, sessionId, "planning");
  notifyRenderer(sessionId, "planning");
  currentSessionId = sessionId;

  const apiKey = getApiKey();
  abortController = new AbortController();

  try {
    // Re-read state to get latest session data
    const state = loadStateFromDisk(repoRoot);
    const session = state?.sessions.find(s => s.id === sessionId);
    if (!session) {
      notifyRenderer(sessionId, "failed", undefined, "Session not found");
      currentSessionId = null;
      return;
    }

    const prompt = buildPlanPrompt(session, repoRoot);

    // Dynamic import for ESM-only SDK
    const importDynamic = new Function("specifier", "return import(specifier)");
    const { query } = await importDynamic("@anthropic-ai/claude-agent-sdk");

    const env: Record<string, string | undefined> = { ...process.env };
    if (apiKey) {
      env.ANTHROPIC_API_KEY = apiKey;
    }

    const options: Record<string, any> = {
      cwd: repoRoot,
      permissionMode: "plan" as const,
      allowedTools: ["Read", "Glob", "Grep"],
      env,
      abortController,
    };

    log("planner: starting SDK query for", sessionId);
    const q = query({ prompt, options });
    let resultText = "";

    for await (const message of q) {
      // Check if aborted
      if (abortController?.signal.aborted) {
        log("planner: abort signal received during iteration");
        break;
      }

      // Log message types for debugging
      if (message.type === "system") {
        log("planner: system message, subtype:", (message as any).subtype);
      } else if (message.type === "assistant") {
        const toolUses = message.content?.filter((b: any) => b.type === "tool_use") || [];
        const textBlocks = message.content?.filter((b: any) => b.type === "text") || [];
        if (toolUses.length > 0) {
          log("planner: assistant tool_use:", toolUses.map((t: any) => t.name).join(", "));
        }
        if (textBlocks.length > 0) {
          log("planner: assistant text response,", textBlocks.reduce((n: number, b: any) => n + (b.text?.length || 0), 0), "chars");
        }
      } else if (message.type === "result") {
        log("planner: result message, keys:", Object.keys(message).join(", "));
      } else {
        log("planner: message type:", message.type, "keys:", Object.keys(message).join(", "));
      }

      // Collect text from multiple possible locations
      for (const contentSource of [message.content, (message as any).result?.content, (message as any).message?.content]) {
        if (contentSource && Array.isArray(contentSource)) {
          for (const block of contentSource) {
            if (block.type === "text" && block.text) {
              resultText = block.text;
            }
          }
        }
      }
      // SDK result message has .result as a plain string (the final assistant text)
      if (typeof (message as any).result === "string" && (message as any).result.length > 0) {
        resultText = (message as any).result;
      }
      if (typeof (message as any).text === "string") {
        resultText = (message as any).text;
      }
    }

    // Check if we were aborted
    if (abortController?.signal.aborted) {
      updatePlanStatus(repoRoot, sessionId, "pending");
      notifyRenderer(sessionId, "pending");
      log("planner: aborted for", sessionId);
      currentSessionId = null;
      abortController = null;
      return;
    }

    // Check if session still exists
    const currentState = loadStateFromDisk(repoRoot);
    const stillExists = currentState?.sessions.find(s => s.id === sessionId);
    if (!stillExists) {
      log("planner: session", sessionId, "was deleted during planning");
      currentSessionId = null;
      abortController = null;
      return;
    }

    if (resultText) {
      updatePlanStatus(repoRoot, sessionId, "ready", resultText);
      notifyRenderer(sessionId, "ready", resultText);
      log("planner: plan ready for", sessionId);
    } else {
      updatePlanStatus(repoRoot, sessionId, "failed");
      notifyRenderer(sessionId, "failed", undefined, "No plan text generated");
      logError("planner: no plan text for", sessionId);
    }
  } catch (err: any) {
    if (abortController?.signal.aborted) {
      updatePlanStatus(repoRoot, sessionId, "pending");
      notifyRenderer(sessionId, "pending");
      log("planner: aborted via catch for", sessionId);
    } else {
      const errMsg = err.message || String(err);
      updatePlanStatus(repoRoot, sessionId, "failed");
      notifyRenderer(sessionId, "failed", undefined, errMsg);
      logError("planner error for", sessionId + ":", errMsg);
      if (err.stack) logError("planner stack:", err.stack);
    }
  } finally {
    currentSessionId = null;
    abortController = null;
  }
}

async function planAll(): Promise<void> {
  const repoRoot = getRepoRoot();
  if (!repoRoot) return;

  const state = loadStateFromDisk(repoRoot);
  if (!state) return;

  // Find all todos with planStatus pending
  const pendingTodos = state.sessions.filter(
    s => s.lifecycle === "todo" && s.planStatus === "pending"
  );

  if (pendingTodos.length === 0) return;

  planQueue = pendingTodos.map(s => s.id);
  log("planner: plan-all queued", planQueue.length, "sessions");

  // Process sequentially
  for (const sessionId of [...planQueue]) {
    // Check if still in queue (may have been cancelled)
    if (!planQueue.includes(sessionId)) continue;
    planQueue = planQueue.filter(id => id !== sessionId);
    await planSession(sessionId);
  }

  planQueue = [];
}

// ── Project Context Analyzer ──────────────────────────────────────────────

let analyzeAbortController: AbortController | null = null;

async function analyzeProject(): Promise<{ ok: boolean; error?: string }> {
  const repoRoot = getRepoRoot();
  if (!repoRoot) return { ok: false, error: "No repo root" };

  const apiKey = getApiKey();
  analyzeAbortController = new AbortController();

  const win = getMainWindow();

  try {
    log("planner: starting project analysis for", repoRoot);
    win?.webContents.send("planning:analyze-status", { status: "analyzing" });

    const importDynamic = new Function("specifier", "return import(specifier)");
    const { query } = await importDynamic("@anthropic-ai/claude-agent-sdk");

    const env: Record<string, string | undefined> = { ...process.env };
    if (apiKey) env.ANTHROPIC_API_KEY = apiKey;

    const prompt = `You are analyzing a software project to create a concise context document that will help future AI planning tasks work faster.

Project root: ${repoRoot}

Explore the project structure and key files, then produce a context summary. Read the most important files — package.json, config files, main entry points, and key source files.

Your output MUST follow this format exactly:

## Stack
List the key technologies (language, framework, build tools, etc.) as a comma-separated list.

## Structure
Brief description of the directory layout and architecture.

## Key Files
List the most important files with a one-line description of each.

## Patterns
Notable coding patterns, conventions, or architecture decisions.

## Build & Run
How to build and run the project (commands).

Be concise — this will be injected into future prompts, so keep it under 200 lines. Focus on information that helps understand WHERE to make changes for new features or bug fixes.`;

    const options: Record<string, any> = {
      cwd: repoRoot,
      permissionMode: "plan" as const,
      allowedTools: ["Read", "Glob", "Grep"],
      env,
      abortController: analyzeAbortController,
    };

    const q = query({ prompt, options });
    let resultText = "";

    let messageCount = 0;
    for await (const message of q) {
      if (analyzeAbortController?.signal.aborted) break;
      messageCount++;

      // Log all message types for debugging
      if (message.type === "system") {
        log("analyzer: system message, subtype:", (message as any).subtype);
      } else if (message.type === "assistant") {
        const toolUses = message.content?.filter((b: any) => b.type === "tool_use") || [];
        const textBlocks = message.content?.filter((b: any) => b.type === "text") || [];
        if (toolUses.length > 0) {
          log("analyzer: tool_use:", toolUses.map((t: any) => t.name).join(", "));
        }
        if (textBlocks.length > 0) {
          log("analyzer: text response,", textBlocks.reduce((n: number, b: any) => n + (b.text?.length || 0), 0), "chars");
        }
      } else if (message.type === "result") {
        log("analyzer: result message, subtype:", (message as any).subtype, "cost:", (message as any).total_cost_usd);
      } else {
        log("analyzer: message type:", message.type, "keys:", Object.keys(message).join(", "));
      }

      // Collect text from multiple possible locations
      for (const contentSource of [message.content, (message as any).result?.content, (message as any).message?.content]) {
        if (contentSource && Array.isArray(contentSource)) {
          for (const block of contentSource) {
            if (block.type === "text" && block.text) {
              resultText = block.text;
            }
          }
        }
      }
      // SDK result message has .result as a plain string (the final assistant text)
      if (typeof (message as any).result === "string" && (message as any).result.length > 0) {
        resultText = (message as any).result;
      }
      if (typeof (message as any).text === "string") {
        resultText = (message as any).text;
      }
    }

    log("analyzer: finished, processed", messageCount, "messages, resultText length:", resultText.length);

    if (analyzeAbortController?.signal.aborted) {
      log("planner: project analysis aborted");
      win?.webContents.send("planning:analyze-status", { status: "idle" });
      return { ok: false, error: "Aborted" };
    }

    if (resultText) {
      const contextPath = path.join(repoRoot, ".volley", "context.md");
      const volleyDir = path.join(repoRoot, ".volley");
      if (!fs.existsSync(volleyDir)) fs.mkdirSync(volleyDir, { recursive: true });
      fs.writeFileSync(contextPath, resultText, "utf-8");
      log("planner: project context written to", contextPath, `(${resultText.length} chars)`);
      win?.webContents.send("planning:analyze-status", { status: "done" });
      return { ok: true };
    } else {
      logError("planner: no context text generated");
      win?.webContents.send("planning:analyze-status", { status: "failed", error: "No output generated" });
      return { ok: false, error: "No output generated" };
    }
  } catch (err: any) {
    const errMsg = err.message || String(err);
    logError("planner: analyze error:", errMsg);
    if (err.stack) logError("planner: analyze stack:", err.stack);
    win?.webContents.send("planning:analyze-status", { status: "failed", error: errMsg });
    return { ok: false, error: errMsg };
  } finally {
    analyzeAbortController = null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export function stopPlanner(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (analyzeAbortController) {
    analyzeAbortController.abort();
    analyzeAbortController = null;
  }
  planQueue = [];
  currentSessionId = null;
}

export function registerPlannerHandlers(
  repoRootGetter: () => string | null,
  mainWindowGetter: () => BrowserWindow | null,
): void {
  getRepoRoot = repoRootGetter;
  getMainWindow = mainWindowGetter;

  // Reset stuck "planning" sessions on startup
  setTimeout(() => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return;
    const state = loadStateFromDisk(repoRoot);
    if (!state) return;
    let changed = false;
    for (const session of state.sessions) {
      if (session.planStatus === "planning") {
        session.planStatus = "pending";
        changed = true;
      }
    }
    if (changed) {
      saveStateToDisk(repoRoot, state);
      log("planner: reset stuck planning sessions to pending");
    }
  }, 1000);

  ipcMain.handle("planning:plan-one", async (_event, { sessionId }: { sessionId: string }) => {
    try {
      if (currentSessionId) {
        return { ok: false, error: "A plan is already in progress" };
      }
      // Fire and forget — status updates come via IPC events
      planSession(sessionId).catch(err => {
        logError("planner: plan-one error:", err.message);
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("planning:plan-all", async () => {
    try {
      if (currentSessionId) {
        return { ok: false, error: "A plan is already in progress" };
      }
      planAll().catch(err => {
        logError("planner: plan-all error:", err.message);
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("planning:cancel", async (_event, { sessionId }: { sessionId: string }) => {
    // Remove from queue if queued
    planQueue = planQueue.filter(id => id !== sessionId);

    // If currently planning this session, abort
    if (currentSessionId === sessionId && abortController) {
      abortController.abort();
      return { ok: true };
    }

    // If it was in the queue, revert to pending
    const repoRoot = getRepoRoot();
    if (repoRoot) {
      updatePlanStatus(repoRoot, sessionId, "pending");
      notifyRenderer(sessionId, "pending");
    }

    return { ok: true };
  });

  ipcMain.handle("planning:status", () => {
    return { currentSessionId, queue: [...planQueue] };
  });

  ipcMain.handle("planning:analyze-project", async () => {
    if (analyzeAbortController) {
      return { ok: false, error: "Analysis already in progress" };
    }
    // Fire and forget — status updates come via IPC events
    analyzeProject().catch(err => {
      logError("planner: analyze-project error:", err.message);
    });
    return { ok: true };
  });

  ipcMain.handle("planning:context-status", () => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { exists: false, analyzing: false };
    const contextPath = path.join(repoRoot, ".volley", "context.md");
    const exists = fs.existsSync(contextPath);
    let updatedAt: string | undefined;
    if (exists) {
      try {
        const stat = fs.statSync(contextPath);
        updatedAt = stat.mtime.toISOString();
      } catch { /* ignore */ }
    }
    return { exists, analyzing: !!analyzeAbortController, updatedAt };
  });
}
