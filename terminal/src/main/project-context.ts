import { ipcMain, type BrowserWindow } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { log, logError } from "./logger";

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

// ── Public utilities ──────────────────────────────────────────────────────

export function loadProjectContext(repoRoot: string): string | null {
  try {
    const contextPath = path.join(repoRoot, ".volley", "context.md");
    if (fs.existsSync(contextPath)) {
      return fs.readFileSync(contextPath, "utf-8");
    }
  } catch { /* ignore */ }
  return null;
}

// ── Project Context Analyzer ──────────────────────────────────────────────

let analyzeAbortController: AbortController | null = null;
let getRepoRoot: () => string | null = () => null;
let getMainWindow: () => BrowserWindow | null = () => null;

async function analyzeProject(): Promise<{ ok: boolean; error?: string }> {
  const repoRoot = getRepoRoot();
  if (!repoRoot) return { ok: false, error: "No repo root" };

  const apiKey = getApiKey();
  analyzeAbortController = new AbortController();

  const win = getMainWindow();

  try {
    log("project-context: starting project analysis for", repoRoot);
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

      for (const contentSource of [message.content, (message as any).result?.content, (message as any).message?.content]) {
        if (contentSource && Array.isArray(contentSource)) {
          for (const block of contentSource) {
            if (block.type === "text" && block.text) {
              resultText = block.text;
            }
          }
        }
      }
      if (typeof (message as any).result === "string" && (message as any).result.length > 0) {
        resultText = (message as any).result;
      }
      if (typeof (message as any).text === "string") {
        resultText = (message as any).text;
      }
    }

    log("analyzer: finished, processed", messageCount, "messages, resultText length:", resultText.length);

    if (analyzeAbortController?.signal.aborted) {
      log("project-context: project analysis aborted");
      win?.webContents.send("planning:analyze-status", { status: "idle" });
      return { ok: false, error: "Aborted" };
    }

    if (resultText) {
      const contextPath = path.join(repoRoot, ".volley", "context.md");
      const volleyDir = path.join(repoRoot, ".volley");
      if (!fs.existsSync(volleyDir)) fs.mkdirSync(volleyDir, { recursive: true });
      fs.writeFileSync(contextPath, resultText, "utf-8");
      log("project-context: written to", contextPath, `(${resultText.length} chars)`);
      win?.webContents.send("planning:analyze-status", { status: "done" });
      return { ok: true };
    } else {
      logError("project-context: no context text generated");
      win?.webContents.send("planning:analyze-status", { status: "failed", error: "No output generated" });
      return { ok: false, error: "No output generated" };
    }
  } catch (err: any) {
    const errMsg = err.message || String(err);
    logError("project-context: analyze error:", errMsg);
    if (err.stack) logError("project-context: analyze stack:", err.stack);
    win?.webContents.send("planning:analyze-status", { status: "failed", error: errMsg });
    return { ok: false, error: errMsg };
  } finally {
    analyzeAbortController = null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export function registerProjectContextHandlers(
  repoRootGetter: () => string | null,
  mainWindowGetter: () => BrowserWindow | null,
): void {
  getRepoRoot = repoRootGetter;
  getMainWindow = mainWindowGetter;

  ipcMain.handle("planning:analyze-project", async () => {
    if (analyzeAbortController) {
      return { ok: false, error: "Analysis already in progress" };
    }
    analyzeProject().catch(err => {
      logError("project-context: analyze-project error:", err.message);
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
