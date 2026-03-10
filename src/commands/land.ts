import { c, glyph } from "../ui.js";
import { git } from "../utils/git.js";
import { ask, confirm } from "../utils/prompt.js";
import { loadState } from "../state.js";
import { removeSession } from "../session.js";

export async function cmdLand(args: string[]): Promise<void> {
  const id = args.find((a) => !a.startsWith("-"));
  if (!id) {
    console.error(`${glyph.error} Usage: volley land <session-id>`);
    process.exit(1);
  }

  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) {
    console.error(`${glyph.error} Session "${id}" not found.`);
    process.exit(1);
  }

  const cwd = session.worktreePath;

  console.log(`\n  ${c.bold}Landing session:${c.reset} ${c.mint}${id}${c.reset}`);
  console.log(`  ${c.dim}${session.branch} → ${session.baseBranch}${c.reset}\n`);

  // Step 1: Check uncommitted changes in worktree
  const statusOutput = git("status --porcelain", cwd);
  if (statusOutput) {
    const fileCount = statusOutput.split("\n").filter((l) => l.length >= 3).length;
    console.log(`  ${c.amber}${fileCount} uncommitted file${fileCount !== 1 ? "s" : ""}${c.reset}`);

    const doCommit = await confirm("Stage all and commit?", true);
    if (doCommit) {
      git("add -A", cwd);
      const message = await ask(`  ${c.dim}Commit message:${c.reset} `);
      if (message) {
        try {
          git(`commit -m "${message.replace(/"/g, '\\"')}"`, cwd);
          console.log(`  ${glyph.filled} Committed: ${c.mint}${message}${c.reset}`);
        } catch (e: any) {
          console.error(`  ${glyph.error} Commit failed: ${e.message}`);
        }
      } else {
        console.log(`  ${c.dim}Skipped commit.${c.reset}`);
      }
    } else {
      console.log(`  ${c.dim}Skipped commit.${c.reset}`);
    }
  } else {
    console.log(`  ${c.dim}No uncommitted changes.${c.reset}`);
  }

  // Step 2: Merge session branch into base branch
  console.log(`\n  ${c.dim}Merging ${session.branch} into ${session.baseBranch}...${c.reset}`);
  try {
    const output = git(`merge ${session.branch}`, state.repoRoot);
    if (output) console.log(`  ${c.dim}${output}${c.reset}`);
    console.log(`\n  ${glyph.filled} Merged ${c.mint}${session.branch}${c.reset} into ${c.mint}${session.baseBranch}${c.reset}`);
  } catch (e: any) {
    if (e.message?.includes("CONFLICT") || e.stdout?.includes("CONFLICT")) {
      console.log(`\n  ${c.amber}Merge conflicts detected.${c.reset} Resolve them in the repo root:`);
      console.log(`  ${c.dim}${state.repoRoot}${c.reset}`);
      console.log(`  ${c.dim}Session kept — run 'volley land ${id}' again after resolving.${c.reset}\n`);
    } else {
      console.error(`\n  ${glyph.error} Merge failed: ${e.message}`);
    }
    return;
  }

  // Step 3: Clean up session
  try {
    removeSession(id, true);
    console.log(`  ${glyph.filled} Session "${id}" removed.\n`);
  } catch (e: any) {
    console.error(`  ${glyph.error} Cleanup failed: ${e.message}`);
  }
}
