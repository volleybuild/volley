import { glyph, c } from "../ui.js";
import { createTodoSession, updateTodoSession } from "../session.js";

export async function cmdTodo(args: string[]): Promise<void> {
  // Handle --update flag: volley todo --update <id> <new task>
  if (args[0] === "--update") {
    const id = args[1];
    const task = args.slice(2).join(" ");
    if (!id || !task) {
      console.error(`${glyph.error} Usage: volley todo --update <session-id> <new task>`);
      process.exit(1);
    }

    try {
      const session = updateTodoSession(id, task);
      console.log(`\n  ${glyph.filled} Updated todo: ${c.mint}${session.id}${c.reset}\n`);
    } catch (e: any) {
      console.error(`${glyph.error} ${e.message}`);
      process.exit(1);
    }
    return;
  }

  // Create a new todo: volley todo <task>
  const task = args.join(" ");
  if (!task) {
    console.error(`${glyph.error} Provide a task description.`);
    console.error(`  Usage: volley todo "my task description"`);
    process.exit(1);
  }

  try {
    const session = createTodoSession(task);
    console.log(`\n  ${glyph.filled} Todo created: ${c.mint}${session.id}${c.reset}`);
    console.log(`  ${c.dim}Run 'volley start ${session.id}' to begin work.${c.reset}\n`);
  } catch (e: any) {
    console.error(`${glyph.error} ${e.message}`);
    process.exit(1);
  }
}
