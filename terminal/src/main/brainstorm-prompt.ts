import * as fs from "node:fs";
import * as path from "node:path";
import { log } from "./logger";

// ── TipTap → plain text ──────────────────────────────────────────────────

interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  text?: string;
  marks?: { type: string }[];
}

function tiptapToPlainText(json: TipTapNode): string {
  const lines: string[] = [];

  function walk(node: TipTapNode): void {
    switch (node.type) {
      case "doc":
        if (node.content) node.content.forEach((c) => walk(c));
        break;
      case "heading": {
        const level = node.attrs?.level || 1;
        const prefix = "#".repeat(level) + " ";
        lines.push(prefix + extractText(node));
        break;
      }
      case "paragraph":
        lines.push(extractText(node));
        break;
      case "bulletList":
      case "orderedList":
        if (node.content) node.content.forEach((c) => walk(c));
        break;
      case "listItem":
        lines.push("- " + extractText(node));
        break;
      default:
        if (node.content) node.content.forEach((c) => walk(c));
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

// ── Public API ────────────────────────────────────────────────────────────

interface BrainstormOpts {
  task: string;
  todoType?: string;
  description?: string;
  sourceNoteContent?: string;
  projectContext?: string;
}

export function buildBrainstormPrompt(opts: BrainstormOpts): string {
  const sections: string[] = [];

  sections.push(`# Task: ${opts.task}`);
  if (opts.todoType) {
    sections.push(`Type: ${opts.todoType}`);
  }
  if (opts.description) {
    sections.push(`## Description\n${opts.description}`);
  }
  if (opts.sourceNoteContent) {
    sections.push(`## Source Note\n${opts.sourceNoteContent}`);
  }
  if (opts.projectContext) {
    sections.push(`## Project Context\n${opts.projectContext}`);
  }

  sections.push(`## Instructions

Before starting implementation, explore the codebase to understand the relevant code. Then:

1. Propose 2-3 possible approaches to this task
2. Recommend one approach with a brief justification
3. Present your recommended plan in clear sections: what files to change, what to add, key considerations
4. Ask me to confirm or adjust before implementing

Focus on being specific — reference actual file paths and function names from the codebase.`);

  return sections.join("\n\n");
}

export function loadSourceNoteContent(repoRoot: string, sourceNoteId: string): string | null {
  try {
    const notesPath = path.join(repoRoot, ".volley", "notes.json");
    if (!fs.existsSync(notesPath)) return null;
    const data = JSON.parse(fs.readFileSync(notesPath, "utf-8"));
    const notes = data.notes || [];
    const note = notes.find((n: any) => n.id === sourceNoteId);
    if (!note || !note.content) return null;

    // Convert TipTap JSON to plain text
    try {
      const json = JSON.parse(note.content);
      return tiptapToPlainText(json);
    } catch {
      return note.content;
    }
  } catch (err) {
    log("brainstorm-prompt: failed to load source note:", String(err));
    return null;
  }
}
