import { c, glyph } from "../ui.js";
import { git } from "../utils/git.js";
import { ask, confirm } from "../utils/prompt.js";
import { loadState } from "../state.js";
import { removeSession, completeSession } from "../session.js";

export async function cmdComplete(args: string[]): Promise<void> {
  // Parse flags
  const mergedToIdx = args.indexOf("--merged-to");
  let mergedTo: string | undefined;
  if (mergedToIdx !== -1 && args[mergedToIdx + 1]) {
    mergedTo = args[mergedToIdx + 1];
    args.splice(mergedToIdx, 2);
  }

  const id = args.find((a) => !a.startsWith("-"));
  if (!id) {
    console.error(`${glyph.error} Usage: volley complete <session-id> [--merged-to <branch>]`);
    process.exit(1);
  }

  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) {
    console.error(`${glyph.error} Session "${id}" not found.`);
    process.exit(1);
  }

  // Non-interactive mode: just mark as completed
  if (mergedTo !== undefined) {
    try {
      completeSession(id, mergedTo || undefined);
      console.log(`\n  ${glyph.filled} Session "${id}" completed and archived.\n`);
    } catch (e: any) {
      console.error(`${glyph.error} ${e.message}`);
      process.exit(1);
    }
    return;
  }

  const cwd = session.worktreePath;

  console.log(`\n  ${c.bold}Completing session:${c.reset} ${c.mint}${id}${c.reset}\n`);

  // Step 1: Check uncommitted changes
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

  // Step 2: Check unpushed commits
  let unpushed = 0;
  try {
    const branch = git("rev-parse --abbrev-ref HEAD", cwd);
    unpushed = parseInt(git(`rev-list --count origin/${branch}..HEAD`, cwd), 10) || 0;
  } catch {
    // No upstream — count all commits
    try {
      unpushed = parseInt(git("rev-list --count HEAD", cwd), 10) || 0;
    } catch { /* ignore */ }
  }

  if (unpushed > 0) {
    console.log(`  ${c.mint}${unpushed} unpushed commit${unpushed !== 1 ? "s" : ""}${c.reset}`);

    const doPush = await confirm("Push to origin?", true);
    if (doPush) {
      try {
        git(`push -u origin ${session.branch}`, cwd);
        console.log(`  ${glyph.filled} Pushed ${c.mint}${session.branch}${c.reset}`);
      } catch (e: any) {
        console.error(`  ${glyph.error} Push failed: ${e.message}`);
      }
    } else {
      console.log(`  ${c.dim}Skipped push.${c.reset}`);
    }
  } else {
    console.log(`  ${c.dim}All commits pushed.${c.reset}`);
  }

  // Step 3: Offer to create PR
  const doCreatePr = await confirm("Create a pull request?", true);
  if (doCreatePr) {
    // Inline PR creation (same logic as cmdPr but non-interactive for title)
    let provider = "";
    let repoPath = "";
    try {
      const remoteUrl = git("remote get-url origin", cwd);
      const sshMatch = remoteUrl.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
      const httpsMatch = remoteUrl.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
      const host = sshMatch?.[1] || httpsMatch?.[1] || "";
      repoPath = sshMatch?.[2] || httpsMatch?.[2] || "";
      if (host.includes("github")) provider = "github";
      else if (host.includes("gitlab")) provider = "gitlab";
      else if (host.includes("bitbucket")) provider = "bitbucket";
    } catch { /* ignore */ }

    let base = "main";
    try {
      const headRef = git("symbolic-ref refs/remotes/origin/HEAD", cwd);
      base = headRef.replace("refs/remotes/origin/", "");
    } catch { /* fallback */ }

    const hostMap: Record<string, string> = {
      github: "https://github.com",
      gitlab: "https://gitlab.com",
      bitbucket: "https://bitbucket.org",
    };
    const webUrl = provider && repoPath ? `${hostMap[provider]}/${repoPath}` : "";

    let prUrl = "";
    if (provider === "github" && webUrl) {
      prUrl = `${webUrl}/compare/${base}...${encodeURIComponent(session.branch)}?expand=1`;
    } else if (provider === "gitlab" && webUrl) {
      prUrl = `${webUrl}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(session.branch)}&merge_request[target_branch]=${encodeURIComponent(base)}`;
    } else if (provider === "bitbucket" && webUrl) {
      prUrl = `${webUrl}/pull-requests/new?source=${encodeURIComponent(session.branch)}&dest=${encodeURIComponent(base)}`;
    }

    if (prUrl) {
      console.log(`  ${c.dim}Opening PR in browser...${c.reset}`);
      console.log(`  ${prUrl}`);
      try {
        const { execSync } = await import("node:child_process");
        execSync(`open "${prUrl}"`, { stdio: "ignore" });
      } catch { /* ignore */ }
    } else {
      console.log(`  ${c.dim}Could not detect provider — create PR manually.${c.reset}`);
    }
  } else {
    console.log(`  ${c.dim}Skipped PR creation.${c.reset}`);
  }

  // Step 4: Offer to remove session
  const doRemove = await confirm("Remove session?", false);
  if (doRemove) {
    try {
      removeSession(id, true);
      console.log(`\n  ${glyph.filled} Session "${id}" removed.\n`);
    } catch (e: any) {
      console.error(`  ${glyph.error} ${e.message}`);
    }
  } else {
    console.log(`  ${c.dim}Session kept.${c.reset}`);
  }

  console.log();
}
