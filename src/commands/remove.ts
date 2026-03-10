import { c, glyph } from "../ui.js";
import { git } from "../utils/git.js";
import { removeSession } from "../session.js";
import { loadState } from "../state.js";

export function cmdRemove(args: string[]): void {
  const force = args.includes("--force") || args.includes("-f");
  const id = args.find((a) => !a.startsWith("-"));

  if (!id) {
    console.error(`${glyph.error} Usage: volley remove <session-id> [--force]`);
    process.exit(1);
    return;
  }

  // Check for uncommitted/unpushed changes before removing
  if (!force) {
    const state = loadState();
    const session = state.sessions.find((s) => s.id === id);
    if (session) {
      const cwd = session.worktreePath;
      const warnings: string[] = [];

      try {
        const statusOutput = git("status --porcelain", cwd);
        if (statusOutput) {
          const count = statusOutput.split("\n").filter((l) => l.length >= 3).length;
          warnings.push(`${count} uncommitted file${count !== 1 ? "s" : ""}`);
        }
      } catch { /* ignore */ }

      try {
        const branch = git("rev-parse --abbrev-ref HEAD", cwd);
        const count = parseInt(git(`rev-list --count origin/${branch}..HEAD`, cwd), 10) || 0;
        if (count > 0) {
          warnings.push(`${count} unpushed commit${count !== 1 ? "s" : ""}`);
        }
      } catch {
        // No upstream — check for any commits
        try {
          const count = parseInt(git("rev-list --count HEAD", cwd), 10) || 0;
          if (count > 0) {
            warnings.push(`${count} unpushed commit${count !== 1 ? "s" : ""}`);
          }
        } catch { /* ignore */ }
      }

      if (warnings.length > 0) {
        console.error(`\n${glyph.error} Session "${id}" has ${warnings.join(" and ")}.`);
        console.error(`  ${c.dim}Use ${c.reset}--force${c.dim} to remove anyway.${c.reset}\n`);
        process.exit(1);
        return;
      }
    }
  }

  try {
    removeSession(id, force);
    console.log(
      `\n${glyph.filled} Session "${id}" removed (worktree + branch cleaned up).\n`,
    );
  } catch (e: any) {
    console.error(`${glyph.error} ${e.message}`);
    process.exit(1);
  }
}
