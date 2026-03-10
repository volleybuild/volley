import { existsSync } from "node:fs";
import { join } from "node:path";
import { c, glyph, spinner, statusBadge } from "../ui.js";
import { ensureGitRepo } from "../utils/git.js";
import { startSession, startTodoSession, listSessions } from "../session.js";

export async function cmdStart(args: string[]): Promise<void> {
  const taskOrId = args.join(" ");
  if (!taskOrId) {
    console.error(`${glyph.error} Provide a task description or todo session ID.`);
    console.log(`  ${c.dim}volley start "add dark mode toggle"${c.reset}`);
    process.exit(1);
  }

  let repoRoot: string;
  try {
    repoRoot = await ensureGitRepo();
  } catch (e: any) {
    console.error(`${glyph.error} ${e.message}`);
    process.exit(1);
    return;
  }

  // Check if this is an existing todo session ID
  const sessions = listSessions();
  const todoSession = sessions.find(s => s.id === taskOrId && s.lifecycle === "todo");

  // Check if .volley.json exists for the first-start hint
  const hasConfig = existsSync(join(repoRoot, ".volley.json"));

  const loading = spinner(todoSession ? "Starting todo session..." : "Setting up worktree...");

  try {
    // If it's a todo session, start it; otherwise create a new session
    const session = todoSession ? startTodoSession(taskOrId) : startSession(taskOrId);
    loading.stop();
    console.log(`${glyph.filled} Session deployed\n`);
    console.log(`  ${c.bold}ID${c.reset}       ${session.id}`);
    console.log(
      `  ${c.bold}Branch${c.reset}   ${c.mint}${session.branch}${c.reset}`,
    );
    console.log(
      `  ${c.bold}Path${c.reset}     ${c.dim}${session.worktreePath}${c.reset}`,
    );
    console.log(`  ${c.bold}Task${c.reset}     ${session.task}`);
    console.log(`  ${c.bold}Status${c.reset}   ${statusBadge(session.status)}`);
    console.log();
    console.log(`  ${c.dim}Terminal opened in worktree.${c.reset}`);
    console.log(`  ${c.dim}Run your agent there, e.g: ${c.reset}claude "${session.task}"`);

    if (!hasConfig) {
      console.log();
      console.log(
        `  ${c.mint}${c.bold}▸ Tip:${c.reset} ${c.mint}run ${c.bold}volley init${c.reset}${c.mint} to set up terminal, grid layout, and auto-bootstrapping${c.reset}`,
      );
    }

    console.log();
  } catch (e: any) {
    loading.stop();
    console.error(`${glyph.error} ${e.message}`);
    process.exit(1);
  }
}
