import { ipcMain } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { log, logError } from "./logger";
import { loadProjectContext } from "./project-context";

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

interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  text?: string;
  marks?: { type: string }[];
}

function tiptapToPlainText(json: TipTapNode): string {
  const lines: string[] = [];

  function walk(node: TipTapNode, depth = 0): void {
    switch (node.type) {
      case "doc":
        if (node.content) node.content.forEach((c) => walk(c, depth));
        break;
      case "heading": {
        const level = node.attrs?.level || 1;
        const prefix = "#".repeat(level) + " ";
        const text = extractText(node);
        lines.push(prefix + text);
        break;
      }
      case "paragraph": {
        const text = extractText(node);
        lines.push(text);
        break;
      }
      case "bulletList":
        if (node.content) node.content.forEach((c) => walk(c, depth));
        break;
      case "orderedList":
        if (node.content) node.content.forEach((c) => walk(c, depth));
        break;
      case "listItem": {
        const text = extractText(node);
        lines.push("- " + text);
        break;
      }
      default:
        if (node.content) node.content.forEach((c) => walk(c, depth));
        break;
    }
  }

  function extractText(node: TipTapNode): string {
    if (node.text) return node.text;
    if (!node.content) return "";
    return node.content.map((c) => extractText(c)).join("");
  }

  walk(json);
  return lines.join("\n");
}

interface DraftTodo {
  title: string;
  type: "bug" | "feature" | "improvement";
  description: string;
}

// ── Public API ────────────────────────────────────────────────────────────

export function registerNoteExtractorHandlers(getRepoRoot: () => string | null): void {
  ipcMain.handle("notes:extract-todos", async (_event, { noteId, content }: { noteId: string; content: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };

    if (!content) return { ok: false, error: "Note is empty" };

    // Parse TipTap JSON to plain text
    let plainText: string;
    try {
      const json = JSON.parse(content);
      plainText = tiptapToPlainText(json);
    } catch {
      plainText = content;
    }

    if (!plainText.trim()) return { ok: false, error: "Note is empty" };

    const apiKey = getApiKey();

    try {
      log("note-extractor: extracting todos from note", noteId, `(${plainText.length} chars)`);

      const importDynamic = new Function("specifier", "return import(specifier)");
      const { query } = await importDynamic("@anthropic-ai/claude-agent-sdk");

      const env: Record<string, string | undefined> = { ...process.env };
      if (apiKey) env.ANTHROPIC_API_KEY = apiKey;

      const projectContext = loadProjectContext(repoRoot);
      const contextBlock = projectContext
        ? `\n## Project Context\nUse this to understand the codebase structure:\n\n${projectContext}\n`
        : "";

      const extractionPrompt = `You are a todo extraction assistant for a software project at: ${repoRoot}
${contextBlock}
Extract actionable todo items from the note below. Use Glob to find relevant files and Read to check implementations, then output a JSON array. Each item must have:
- "title": short, imperative task title (e.g. "Fix login timeout")
- "type": "bug" | "feature" | "improvement"
- "description": 2-4 sentence description referencing specific file paths and function names.

CRITICAL RULES:
- You have limited turns. Do at most 3 tool calls total, then output the JSON.
- Your FINAL message MUST be ONLY a JSON array — no markdown, no explanation, no text before or after.
- If no actionable items exist, return: []
- Never ask questions — make reasonable assumptions.

Note content:
${plainText}`;

      const options: Record<string, any> = {
        cwd: repoRoot,
        permissionMode: "plan" as const,
        allowedTools: ["Glob", "Read"],
        env,
        maxTurns: 6,
      };

      const sendProgress = (phase: string) => {
        try { _event.sender.send("notes:extract-progress", { noteId, phase }); } catch {}
      };

      sendProgress("analyzing");

      const q = query({ prompt: extractionPrompt, options });
      let resultText = "";

      for await (const message of q) {
        // Detect tool use to send progress phases
        for (const contentSource of [message.content, (message as any).message?.content]) {
          if (contentSource && Array.isArray(contentSource)) {
            for (const block of contentSource) {
              if (block.type === "tool_use" && block.name) {
                if (block.name === "Glob") sendProgress("scanning");
                else if (block.name === "Read") sendProgress("reading");
              }
            }
          }
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
        if (typeof (message as any).result === "string" && (message as any).result.length > 0) {
          resultText = (message as any).result;
        }
        if (typeof (message as any).text === "string") {
          resultText = (message as any).text;
        }
      }

      sendProgress("generating");

      if (!resultText) {
        logError("note-extractor: no result text");
        return { ok: false, error: "Failed to parse response" };
      }

      // Extract JSON from response — handle markdown fences and surrounding text
      let jsonText = resultText.trim();

      // Strip markdown fences
      if (jsonText.includes("```")) {
        const fenceMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (fenceMatch) jsonText = fenceMatch[1].trim();
      }

      let drafts: DraftTodo[];
      try {
        drafts = JSON.parse(jsonText);
      } catch {
        // Fallback: find the first JSON array in the response
        const arrayMatch = resultText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            drafts = JSON.parse(arrayMatch[0]);
          } catch {
            logError("note-extractor: failed to parse JSON:", resultText.slice(0, 300));
            return { ok: false, error: "needs_more_turns", partialResult: resultText };
          }
        } else {
          logError("note-extractor: no JSON array found:", resultText.slice(0, 300));
          return { ok: false, error: "needs_more_turns", partialResult: resultText };
        }
      }

      if (!Array.isArray(drafts)) {
        return { ok: false, error: "needs_more_turns", partialResult: resultText };
      }

      // Validate and sanitize each draft
      const validTypes = ["bug", "feature", "improvement"];
      drafts = drafts
        .filter((d) => d && typeof d.title === "string" && d.title.trim())
        .map((d) => ({
          title: d.title.trim(),
          type: validTypes.includes(d.type) ? d.type : "feature",
          description: typeof d.description === "string" ? d.description.trim() : "",
        }));

      if (drafts.length === 0) {
        return { ok: true, drafts: [], error: "No action items found" };
      }

      log("note-extractor: extracted", drafts.length, "draft todos from note", noteId);
      return { ok: true, drafts };
    } catch (err: any) {
      const errMsg = err.message || String(err);
      logError("note-extractor error:", errMsg);
      if (err.stack) logError("note-extractor stack:", err.stack);
      return { ok: false, error: errMsg };
    }
  });

  // ── Continue extraction when agent ran out of turns ───────────────────
  ipcMain.handle("notes:continue-extraction", async (_event, { noteId, partialResult }: { noteId: string; partialResult: string }) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };

    const apiKey = getApiKey();

    try {
      log("note-extractor: continuing extraction for note", noteId, `(${partialResult.length} chars partial)`);

      const importDynamic = new Function("specifier", "return import(specifier)");
      const { query } = await importDynamic("@anthropic-ai/claude-agent-sdk");

      const env: Record<string, string | undefined> = { ...process.env };
      if (apiKey) env.ANTHROPIC_API_KEY = apiKey;

      const sendProgress = (phase: string) => {
        try { _event.sender.send("notes:extract-progress", { noteId, phase }); } catch {}
      };

      sendProgress("generating");

      const continuePrompt = `You were extracting actionable todo items from a note but ran out of turns. Here is the analysis you produced so far:

---
${partialResult}
---

Now produce the final result. Output ONLY a JSON array where each item has:
- "title": short, imperative task title
- "type": "bug" | "feature" | "improvement"
- "description": 2-4 sentence description referencing specific file paths and function names.

If no actionable items can be extracted, return: []
Output ONLY the JSON array — no markdown fences, no explanation.`;

      const options: Record<string, any> = {
        cwd: repoRoot,
        permissionMode: "plan" as const,
        allowedTools: ["Glob", "Read"],
        env,
        maxTurns: 6,
      };

      const q = query({ prompt: continuePrompt, options });
      let resultText = "";

      for await (const message of q) {
        // Detect tool use to send progress phases
        for (const contentSource of [message.content, (message as any).message?.content]) {
          if (contentSource && Array.isArray(contentSource)) {
            for (const block of contentSource) {
              if (block.type === "tool_use" && block.name) {
                if (block.name === "Glob") sendProgress("scanning");
                else if (block.name === "Read") sendProgress("reading");
              }
            }
          }
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

      if (!resultText) {
        logError("note-extractor: continue - no result text");
        return { ok: false, error: "Failed to parse response" };
      }

      let jsonText = resultText.trim();
      if (jsonText.includes("```")) {
        const fenceMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (fenceMatch) jsonText = fenceMatch[1].trim();
      }

      let drafts: DraftTodo[];
      try {
        drafts = JSON.parse(jsonText);
      } catch {
        const arrayMatch = resultText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            drafts = JSON.parse(arrayMatch[0]);
          } catch {
            logError("note-extractor: continue - failed to parse JSON:", resultText.slice(0, 300));
            return { ok: false, error: "Failed to parse response" };
          }
        } else {
          logError("note-extractor: continue - no JSON array found:", resultText.slice(0, 300));
          return { ok: false, error: "Failed to parse response" };
        }
      }

      if (!Array.isArray(drafts)) {
        return { ok: false, error: "Failed to parse response" };
      }

      const validTypes = ["bug", "feature", "improvement"];
      drafts = drafts
        .filter((d) => d && typeof d.title === "string" && d.title.trim())
        .map((d) => ({
          title: d.title.trim(),
          type: validTypes.includes(d.type) ? d.type : "feature",
          description: typeof d.description === "string" ? d.description.trim() : "",
        }));

      if (drafts.length === 0) {
        return { ok: true, drafts: [], error: "No action items found" };
      }

      log("note-extractor: continue - extracted", drafts.length, "draft todos from note", noteId);
      return { ok: true, drafts };
    } catch (err: any) {
      const errMsg = err.message || String(err);
      logError("note-extractor continue error:", errMsg);
      return { ok: false, error: errMsg };
    }
  });
}
