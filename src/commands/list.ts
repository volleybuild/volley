import { c, glyph, statusBadge } from "../ui.js";
import { listSessions, getSessionStats } from "../session.js";
import { git } from "../utils/git.js";
import { loadState } from "../state.js";

export function cmdList(): void {
  const sessions = listSessions();

  if (sessions.length === 0) {
    console.log(`\n${c.dim}No active sessions. Start one with:${c.reset}`);
    console.log(`  ${c.mint}volley start "your task here"${c.reset}\n`);
    return;
  }

  const state = loadState();
  const repoRoot = state.repoRoot;

  console.log(
    `\n${glyph.filled} ${c.bold}Volley (${sessions.length} session${sessions.length === 1 ? "" : "s"})${c.reset}\n`,
  );

  const colId = Math.max(4, ...sessions.map((s) => s.id.length));

  // Header
  console.log(
    `  ${c.dim}${"ID".padEnd(colId)}  ${"STATUS".padEnd(12)}  TASK${c.reset}`,
  );
  console.log(`  ${c.dim}${"─".repeat(colId + 30)}${c.reset}`);

  for (const s of sessions) {
    // Line 1: ID, status, task
    console.log(
      `  ${c.white}${s.id.padEnd(colId)}${c.reset}  ${statusBadge(s.status).padEnd(12 + 20)}  ${s.task}`,
    );

    // Line 2: stats
    const stats = getSessionStats(s, repoRoot);
    const parts: string[] = [stats.elapsed];

    if (stats.commits > 0 || stats.filesChanged > 0) {
      parts.push(`${stats.commits} commit${stats.commits === 1 ? "" : "s"}`);
      parts.push(`${stats.filesChanged} file${stats.filesChanged === 1 ? "" : "s"}`);
      parts.push(`${c.green}+${stats.insertions}${c.dim} ${c.red}-${stats.deletions}${c.dim}`);
    } else {
      parts.push("no changes");
    }

    // Git indicators
    const gitBadges: string[] = [];
    try {
      const porcelain = git("status --porcelain", s.worktreePath).trim();
      if (porcelain) gitBadges.push(`${c.amber}[dirty]${c.dim}`);
    } catch { /* ignore */ }
    try {
      const branch = git("rev-parse --abbrev-ref HEAD", s.worktreePath);
      const unpushed = parseInt(git(`rev-list --count origin/${branch}..HEAD`, s.worktreePath), 10) || 0;
      if (unpushed > 0) gitBadges.push(`${c.mint}[unpushed]${c.dim}`);
    } catch { /* ignore */ }
    try {
      let defaultBranch = "main";
      try {
        const headRef = git("symbolic-ref refs/remotes/origin/HEAD", s.worktreePath);
        defaultBranch = headRef.replace("refs/remotes/origin/", "");
      } catch { /* fallback */ }
      const behind = parseInt(git(`rev-list --count HEAD..origin/${defaultBranch}`, s.worktreePath), 10) || 0;
      if (behind > 0) gitBadges.push(`${c.amber}[behind ${behind}]${c.dim}`);
    } catch { /* ignore */ }

    const indent = "".padEnd(colId + 2);
    const gitSuffix = gitBadges.length > 0 ? `  ${gitBadges.join(" ")}` : "";
    console.log(`  ${indent}${c.dim}${parts.join(" · ")}${c.reset}${gitSuffix}`);
    console.log();
  }
}
