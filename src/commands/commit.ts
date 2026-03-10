import { c, glyph } from "../ui.js";
import { git, getRepoRoot } from "../utils/git.js";
import { ask, confirm } from "../utils/prompt.js";
import { loadState } from "../state.js";

export async function cmdCommit(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error(`${glyph.error} Usage: volley commit <session-id> [-m "message"] [--all]`);
    process.exit(1);
  }

  const flags = args.slice(1);
  const allFlag = flags.includes("--all");
  let message: string | null = null;
  const mIdx = flags.indexOf("-m");
  if (mIdx !== -1 && flags[mIdx + 1]) {
    message = flags[mIdx + 1];
  }

  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) {
    console.error(`${glyph.error} Session "${id}" not found.`);
    process.exit(1);
  }

  const cwd = session.worktreePath;

  // Check for changes
  const statusOutput = git("status --porcelain", cwd);
  if (!statusOutput) {
    console.log(`\n${c.dim}Nothing to commit in "${id}".${c.reset}\n`);
    return;
  }

  const files = statusOutput.split("\n").filter((l) => l.length >= 3);

  if (allFlag) {
    // Stage everything
    git("add -A", cwd);
    console.log(`\n  ${c.mint}Staged ${files.length} file${files.length !== 1 ? "s" : ""}${c.reset}`);
  } else {
    // Show file list
    console.log(`\n  ${c.bold}Changed files:${c.reset}`);
    for (const line of files) {
      const xy = line.substring(0, 2);
      const path = line.substring(3);
      const statusChar = xy.trim()[0];
      const color = statusChar === "M" ? c.amber : statusChar === "D" ? c.red : c.green;
      console.log(`    ${color}${statusChar}${c.reset} ${path}`);
    }
    console.log();

    const ok = await confirm("Stage all and commit?", true);
    if (!ok) {
      console.log(`${c.dim}  Aborted.${c.reset}\n`);
      return;
    }
    git("add -A", cwd);
  }

  // Get commit message
  if (!message) {
    message = await ask(`  ${c.dim}Commit message:${c.reset} `);
  }
  if (!message) {
    console.log(`${c.dim}  Aborted (empty message).${c.reset}\n`);
    return;
  }

  try {
    git(`commit -m "${message.replace(/"/g, '\\"')}"`, cwd);
    console.log(`  ${glyph.filled} Committed: ${c.mint}${message}${c.reset}\n`);
  } catch (e: any) {
    console.error(`${glyph.error} ${e.message}`);
    process.exit(1);
  }
}
