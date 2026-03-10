import { c, glyph } from "../ui.js";
import { git } from "../utils/git.js";
import { loadState } from "../state.js";

export function cmdDiff(args: string[]): void {
  const id = args[0];
  if (!id) {
    console.error(`${glyph.error} Usage: volley diff <session-id> [--stat] [--staged] [--file <path>]`);
    process.exit(1);
  }

  const flags = args.slice(1);
  const statFlag = flags.includes("--stat");
  const stagedFlag = flags.includes("--staged");
  const fileIdx = flags.indexOf("--file");
  const filePath = fileIdx !== -1 ? flags[fileIdx + 1] : null;

  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) {
    console.error(`${glyph.error} Session "${id}" not found.`);
    process.exit(1);
  }

  const cwd = session.worktreePath;

  try {
    let gitArgs: string;

    if (stagedFlag) {
      gitArgs = statFlag ? "diff --cached --stat" : "diff --cached";
    } else if (statFlag) {
      gitArgs = "diff HEAD --stat";
    } else if (filePath) {
      gitArgs = `diff HEAD -- ${filePath}`;
    } else {
      gitArgs = "diff HEAD";
    }

    // Append file filter if combined with other flags
    if (filePath && !gitArgs.includes("-- ")) {
      gitArgs += ` -- ${filePath}`;
    }

    const diff = git(gitArgs, cwd);
    if (!diff) {
      console.log(`\n${c.dim}No ${stagedFlag ? "staged " : ""}changes${filePath ? ` in ${filePath}` : ""} for "${id}".${c.reset}\n`);
    } else {
      console.log(diff);
    }
  } catch (e: any) {
    console.error(`${glyph.error} ${e.message}`);
    process.exit(1);
  }
}
