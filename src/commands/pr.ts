import { execSync, execFileSync } from "node:child_process";
import { c, glyph } from "../ui.js";
import { git } from "../utils/git.js";
import { ask } from "../utils/prompt.js";
import { loadState } from "../state.js";

export async function cmdPr(args: string[]): Promise<void> {
  const id = args.find((a) => !a.startsWith("-"));
  if (!id) {
    console.error(`${glyph.error} Usage: volley pr <session-id> [--title "..."] [--body "..."] [--base main]`);
    process.exit(1);
  }

  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) {
    console.error(`${glyph.error} Session "${id}" not found.`);
    process.exit(1);
  }

  const cwd = session.worktreePath;

  // Parse flags
  let title: string | null = null;
  let body = "";
  let base = "";

  const titleIdx = args.indexOf("--title");
  if (titleIdx !== -1 && args[titleIdx + 1]) title = args[titleIdx + 1];

  const bodyIdx = args.indexOf("--body");
  if (bodyIdx !== -1 && args[bodyIdx + 1]) body = args[bodyIdx + 1];

  const baseIdx = args.indexOf("--base");
  if (baseIdx !== -1 && args[baseIdx + 1]) base = args[baseIdx + 1];

  // Detect default branch for base
  if (!base) {
    try {
      const headRef = git("symbolic-ref refs/remotes/origin/HEAD", cwd);
      base = headRef.replace("refs/remotes/origin/", "");
    } catch {
      base = "main";
    }
  }

  // Detect provider
  let provider = "";
  let repoPath = "";
  let webUrl = "";
  try {
    const remoteUrl = git("remote get-url origin", cwd);
    const sshMatch = remoteUrl.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
    const httpsMatch = remoteUrl.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
    const host = sshMatch?.[1] || httpsMatch?.[1] || "";
    repoPath = sshMatch?.[2] || httpsMatch?.[2] || "";
    if (host.includes("github")) provider = "github";
    else if (host.includes("gitlab")) provider = "gitlab";
    else if (host.includes("bitbucket")) provider = "bitbucket";

    const hostMap: Record<string, string> = {
      github: "https://github.com",
      gitlab: "https://gitlab.com",
      bitbucket: "https://bitbucket.org",
    };
    if (provider && repoPath) webUrl = `${hostMap[provider]}/${repoPath}`;
  } catch { /* ignore */ }

  // Check if CLI is available
  let cliAvailable = false;
  const cliCmd = provider === "github" ? "gh" : provider === "gitlab" ? "glab" : "";
  if (cliCmd) {
    try {
      execFileSync("which", [cliCmd], { stdio: ["pipe", "pipe", "pipe"] });
      cliAvailable = true;
    } catch { /* not available */ }
  }

  // Prompt for title if not provided
  if (!title) {
    title = await ask(`  ${c.dim}PR title:${c.reset} `);
  }
  if (!title) {
    console.log(`${c.dim}  Aborted (empty title).${c.reset}\n`);
    return;
  }

  if (cliAvailable) {
    try {
      if (provider === "github") {
        const output = execFileSync("gh", ["pr", "create", "--title", title, "--body", body, "--base", base], {
          cwd,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        console.log(`\n  ${glyph.filled} PR created: ${c.mint}${output}${c.reset}\n`);
      } else if (provider === "gitlab") {
        const output = execFileSync("glab", ["mr", "create", "--title", title, "--description", body, "--target-branch", base, "--source-branch", session.branch, "-y"], {
          cwd,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        console.log(`\n  ${glyph.filled} MR created: ${c.mint}${output}${c.reset}\n`);
      }
    } catch (e: any) {
      console.error(`${glyph.error} ${e.stderr || e.message}`);
      process.exit(1);
    }
  } else {
    // Open browser fallback
    let prUrl = "";
    if (provider === "github" && webUrl) {
      prUrl = `${webUrl}/compare/${base}...${encodeURIComponent(session.branch)}?expand=1`;
    } else if (provider === "gitlab" && webUrl) {
      prUrl = `${webUrl}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(session.branch)}&merge_request[target_branch]=${encodeURIComponent(base)}`;
    } else if (provider === "bitbucket" && webUrl) {
      prUrl = `${webUrl}/pull-requests/new?source=${encodeURIComponent(session.branch)}&dest=${encodeURIComponent(base)}`;
    }

    if (prUrl) {
      console.log(`\n  ${c.dim}No CLI tool available. Opening browser...${c.reset}`);
      console.log(`  ${prUrl}\n`);
      try {
        execSync(`open "${prUrl}"`, { stdio: "ignore" });
      } catch { /* ignore open errors */ }
    } else {
      console.error(`${glyph.error} Could not detect provider. Push your branch and create a PR manually.`);
      process.exit(1);
    }
  }
}
