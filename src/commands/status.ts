import { c, glyph, statusBadge } from "../ui.js";
import { getSessionStatus, logSession } from "../session.js";
import { git } from "../utils/git.js";
import { cmdList } from "./list.js";

export function cmdStatus(args: string[]): void {
  const id = args[0];
  if (!id) {
    cmdList();
    return;
  }

  const session = getSessionStatus(id);
  if (!session) {
    console.error(`${glyph.error} Session "${id}" not found.`);
    process.exit(1);
    return;
  }

  console.log(`\n${glyph.filled} ${c.bold}${session.id}${c.reset}\n`);
  console.log(
    `  ${c.bold}Branch${c.reset}    ${c.amber}${session.branch}${c.reset}`,
  );
  console.log(
    `  ${c.bold}Path${c.reset}      ${c.dim}${session.worktreePath}${c.reset}`,
  );
  console.log(`  ${c.bold}Task${c.reset}      ${session.task}`);
  console.log(`  ${c.bold}Status${c.reset}    ${statusBadge(session.status)}`);
  console.log(
    `  ${c.bold}Created${c.reset}   ${c.dim}${session.createdAt}${c.reset}`,
  );
  if (session.pid) {
    console.log(
      `  ${c.bold}PID${c.reset}       ${c.dim}${session.pid}${c.reset}`,
    );
  }

  // Git status section
  const gitParts: string[] = [];
  try {
    const porcelain = git("status --porcelain", session.worktreePath).trim();
    const uncommitted = porcelain ? porcelain.split("\n").length : 0;
    if (uncommitted > 0) {
      gitParts.push(`${c.amber}${uncommitted} uncommitted${c.reset}`);
    }
  } catch { /* ignore */ }

  try {
    const branch = git("rev-parse --abbrev-ref HEAD", session.worktreePath);
    const count = parseInt(git(`rev-list --count origin/${branch}..HEAD`, session.worktreePath), 10) || 0;
    if (count > 0) {
      gitParts.push(`${c.mint}${count} unpushed${c.reset}`);
    }
  } catch { /* no upstream */ }

  try {
    // Determine default branch
    let defaultBranch = "main";
    try {
      const headRef = git("symbolic-ref refs/remotes/origin/HEAD", session.worktreePath);
      defaultBranch = headRef.replace("refs/remotes/origin/", "");
    } catch { /* fallback to main */ }

    const behind = parseInt(git(`rev-list --count HEAD..origin/${defaultBranch}`, session.worktreePath), 10) || 0;
    if (behind > 0) {
      gitParts.push(`${c.amber}${behind} behind ${defaultBranch}${c.reset}`);
    } else {
      gitParts.push(`${c.dim}up to date with ${defaultBranch}${c.reset}`);
    }
  } catch { /* ignore */ }

  if (gitParts.length > 0) {
    console.log(`  ${c.bold}Git${c.reset}       ${gitParts.join(` ${c.dim}·${c.reset} `)}`);
  }

  console.log(`\n  ${c.bold}Commits:${c.reset}`);
  const log = logSession(id);
  if (log === "(no commits yet)") {
    console.log(`  ${c.dim}${log}${c.reset}`);
  } else {
    for (const line of log.split("\n")) {
      console.log(`  ${c.dim}${line}${c.reset}`);
    }
  }
  console.log();
}
