import { c, glyph } from "../ui.js";
import { git, getRepoRoot } from "../utils/git.js";
import { loadState } from "../state.js";

export function cmdPush(args: string[]): void {
  const id = args.find((a) => !a.startsWith("-"));
  if (!id) {
    console.error(`${glyph.error} Usage: volley push <session-id>`);
    process.exit(1);
  }

  const state = loadState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) {
    console.error(`${glyph.error} Session "${id}" not found.`);
    process.exit(1);
  }

  const cwd = session.worktreePath;

  try {
    git(`push -u origin ${session.branch}`, cwd);
    console.log(`\n  ${glyph.filled} Pushed ${c.mint}${session.branch}${c.reset} to origin\n`);

    // Show PR compare URL if provider detected
    try {
      const remoteUrl = git("remote get-url origin", cwd);
      let provider = "";
      let repoPath = "";
      const sshMatch = remoteUrl.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
      const httpsMatch = remoteUrl.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
      const host = sshMatch?.[1] || httpsMatch?.[1] || "";
      repoPath = sshMatch?.[2] || httpsMatch?.[2] || "";
      if (host.includes("github")) provider = "github";
      else if (host.includes("gitlab")) provider = "gitlab";
      else if (host.includes("bitbucket")) provider = "bitbucket";

      let defaultBranch = "main";
      try {
        const headRef = git("symbolic-ref refs/remotes/origin/HEAD", cwd);
        defaultBranch = headRef.replace("refs/remotes/origin/", "");
      } catch { /* fallback */ }

      if (provider && repoPath) {
        const hostMap: Record<string, string> = {
          github: "https://github.com",
          gitlab: "https://gitlab.com",
          bitbucket: "https://bitbucket.org",
        };
        const webUrl = `${hostMap[provider]}/${repoPath}`;
        let prUrl = "";
        if (provider === "github") {
          prUrl = `${webUrl}/compare/${defaultBranch}...${encodeURIComponent(session.branch)}?expand=1`;
        } else if (provider === "gitlab") {
          prUrl = `${webUrl}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(session.branch)}&merge_request[target_branch]=${encodeURIComponent(defaultBranch)}`;
        } else if (provider === "bitbucket") {
          prUrl = `${webUrl}/pull-requests/new?source=${encodeURIComponent(session.branch)}&dest=${encodeURIComponent(defaultBranch)}`;
        }
        if (prUrl) {
          console.log(`  ${c.dim}Create PR:${c.reset} ${prUrl}\n`);
        }
      }
    } catch { /* ignore provider detection errors */ }
  } catch (e: any) {
    console.error(`${glyph.error} Push failed: ${e.message}`);
    process.exit(1);
  }
}
