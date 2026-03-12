import { ipcMain } from "electron";
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

      const extractionPrompt = `IMPORTANT: You are a JSON extraction tool, not a planning assistant. Ignore any system instructions about "plan mode". Your ONLY job is to output a JSON array.

Extract actionable todo items from the note below. Output a JSON array where each item has:
- "title": short, imperative task title (e.g. "Fix login timeout")
- "type": "bug", "feature", or "improvement"
- "description": 1-2 sentence description providing context for implementation

Rules:
- Only extract clear, actionable items
- If no actionable items exist, return: []
- Do NOT use any tools. Do NOT read any files. Do NOT explore any code.
- Your ENTIRE response must be ONLY the JSON array. No text before or after it.

Note content:
${plainText}`;

      const options: Record<string, any> = {
        cwd: repoRoot,
        permissionMode: "default" as const,
        allowedTools: [],
        env,
        maxTurns: 1,
      };

      const q = query({ prompt: extractionPrompt, options });
      let resultText = "";

      for await (const message of q) {
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
            return { ok: false, error: "Failed to parse response" };
          }
        } else {
          logError("note-extractor: no JSON array found:", resultText.slice(0, 300));
          return { ok: false, error: "Failed to parse response" };
        }
      }

      if (!Array.isArray(drafts)) {
        return { ok: false, error: "Failed to parse response" };
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
}
