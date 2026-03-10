import { c, glyph } from "../ui.js";
import { git } from "../utils/git.js";
import { loadState } from "../state.js";

export function cmdMerge(args: string[]): void {
  const id = args.find((a) => !a.startsWith("-"));
  if (!id) {
    console.error(`${glyph.error} Usage: volley merge <session-id>`);
    process.exit(1);
  }

  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) {
    console.error(`${glyph.error} Session "${id}" not found.`);
    process.exit(1);
  }

  const cwd = session.worktreePath;

  // Determine default branch
  let defaultBranch = "main";
  try {
    const headRef = git("symbolic-ref refs/remotes/origin/HEAD", cwd);
    defaultBranch = headRef.replace("refs/remotes/origin/", "");
  } catch { /* fallback to main */ }

  console.log(`\n  ${c.dim}Fetching from origin...${c.reset}`);
  try {
    git("fetch origin", cwd);
  } catch (e: any) {
    console.error(`${glyph.error} Fetch failed: ${e.message}`);
    process.exit(1);
  }

  console.log(`  ${c.dim}Merging origin/${defaultBranch} into ${session.branch}...${c.reset}`);
  try {
    const output = git(`merge origin/${defaultBranch}`, cwd);
    if (output) console.log(`  ${c.dim}${output}${c.reset}`);
    console.log(`\n  ${glyph.filled} Merged ${c.mint}origin/${defaultBranch}${c.reset} into ${c.mint}${session.branch}${c.reset}\n`);
  } catch (e: any) {
    if (e.message?.includes("CONFLICT") || e.stdout?.includes("CONFLICT")) {
      console.log(`\n  ${c.amber}Merge conflicts detected.${c.reset} Resolve them in the session worktree:`);
      console.log(`  ${c.dim}${cwd}${c.reset}\n`);
    } else {
      console.error(`${glyph.error} Merge failed: ${e.message}`);
      process.exit(1);
    }
  }
}
