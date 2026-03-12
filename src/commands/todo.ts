import { glyph, c } from "../ui.js";
import { createTodoSession, updateTodoSession } from "../session.js";
import type { TodoType } from "../types.js";

const VALID_TYPES = ["bug", "feature", "improvement"] as const;

export async function cmdTodo(args: string[]): Promise<void> {
  // Handle --update flag: volley todo --update <id> [--type <t>] [--description <d>] [<new task>]
  if (args[0] === "--update") {
    const id = args[1];
    if (!id) {
      console.error(`${glyph.error} Usage: volley todo --update <session-id> [--type <type>] [--description <desc>] [new task]`);
      process.exit(1);
    }

    const remaining = args.slice(2);
    const updates: { task?: string; todoType?: TodoType; description?: string } = {};

    // Parse flags from remaining args
    const taskParts: string[] = [];
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i] === "--type" && remaining[i + 1]) {
        const t = remaining[i + 1];
        if (!VALID_TYPES.includes(t as TodoType)) {
          console.error(`${glyph.error} Invalid type "${t}". Must be one of: ${VALID_TYPES.join(", ")}`);
          process.exit(1);
        }
        updates.todoType = t as TodoType;
        i++;
      } else if (remaining[i] === "--description" && remaining[i + 1]) {
        updates.description = remaining[i + 1];
        i++;
      } else {
        taskParts.push(remaining[i]);
      }
    }

    if (taskParts.length > 0) {
      updates.task = taskParts.join(" ");
    }

    if (!updates.task && !updates.todoType && !updates.description) {
      console.error(`${glyph.error} Nothing to update. Provide a new task, --type, or --description.`);
      process.exit(1);
    }

    try {
      const session = updateTodoSession(id, updates);
      console.log(`\n  ${glyph.filled} Updated todo: ${c.mint}${session.id}${c.reset}\n`);
    } catch (e: any) {
      console.error(`${glyph.error} ${e.message}`);
      process.exit(1);
    }
    return;
  }

  // Parse flags for create: volley todo [--type <t>] [--description <d>] [--no-plan] [--source-note <id>] <task>
  let todoType: TodoType | undefined;
  let description: string | undefined;
  let autoPlan = true;
  let sourceNoteId: string | undefined;
  const taskParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--type" && args[i + 1]) {
      const t = args[i + 1];
      if (!VALID_TYPES.includes(t as TodoType)) {
        console.error(`${glyph.error} Invalid type "${t}". Must be one of: ${VALID_TYPES.join(", ")}`);
        process.exit(1);
      }
      todoType = t as TodoType;
      i++;
    } else if (args[i] === "--description" && args[i + 1]) {
      description = args[i + 1];
      i++;
    } else if (args[i] === "--source-note" && args[i + 1]) {
      sourceNoteId = args[i + 1];
      i++;
    } else if (args[i] === "--no-plan") {
      autoPlan = false;
    } else {
      taskParts.push(args[i]);
    }
  }

  const task = taskParts.join(" ");
  if (!task) {
    console.error(`${glyph.error} Provide a task description.`);
    console.error(`  Usage: volley todo [--type bug|feature|improvement] [--description "..."] "my task"`);
    process.exit(1);
  }

  try {
    const session = createTodoSession(task, { todoType, description, autoPlan, sourceNoteId });
    console.log(`\n  ${glyph.filled} Todo created: ${c.mint}${session.id}${c.reset}`);
    if (session.todoType) {
      console.log(`  ${c.dim}Type: ${session.todoType}${c.reset}`);
    }
    console.log(`  ${c.dim}Run 'volley start ${session.id}' to begin work.${c.reset}\n`);
  } catch (e: any) {
    console.error(`${glyph.error} ${e.message}`);
    process.exit(1);
  }
}
