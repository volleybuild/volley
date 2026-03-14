import { execFileSync } from "node:child_process";

export type ProviderName = "github" | "gitlab" | "bitbucket" | "azure" | "unknown";

export interface ProviderInfo {
  provider: ProviderName;
  repoPath: string;
  webUrl: string;
  cliAvailable: boolean;
}

const HOST_MAP: Record<string, ProviderName> = {
  "github.com": "github",
  "gitlab.com": "gitlab",
  "bitbucket.org": "bitbucket",
  "dev.azure.com": "azure",
  "ssh.dev.azure.com": "azure",
};

const CLI_MAP: Record<string, string> = {
  github: "gh",
  gitlab: "glab",
  bitbucket: "bb",
};

/**
 * Parse a git remote URL into provider + repoPath.
 * Supports SSH (git@host:owner/repo.git) and HTTPS (https://host/owner/repo.git).
 */
export function detectProvider(remoteUrl: string): { provider: ProviderName; repoPath: string } {
  // SSH format: git@github.com:owner/repo.git
  const sshMatch = remoteUrl.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    const host = sshMatch[1];
    const repoPath = sshMatch[2];
    const provider = HOST_MAP[host] || "unknown";
    return { provider, repoPath };
  }

  // HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = remoteUrl.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (httpsMatch) {
    const host = httpsMatch[1];
    const repoPath = httpsMatch[2];
    const provider = HOST_MAP[host] || (host.endsWith(".visualstudio.com") ? "azure" : "unknown");
    return { provider, repoPath };
  }

  return { provider: "unknown", repoPath: "" };
}

/** Check if a CLI tool is on PATH (uses `which`). */
export function isCliAvailable(command: string): boolean {
  try {
    execFileSync("which", [command], { stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

/** Full detection: reads git remote, detects provider, checks CLI availability. */
export function getProviderInfo(cwd: string, overrideProvider?: ProviderName): ProviderInfo {
  let remoteUrl = "";
  try {
    remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return { provider: overrideProvider || "unknown", repoPath: "", webUrl: "", cliAvailable: false };
  }

  const detected = detectProvider(remoteUrl);
  const provider = overrideProvider || detected.provider;
  const repoPath = detected.repoPath;

  // Build web URL from the detected host
  let webUrl = "";
  if (provider !== "unknown" && repoPath) {
    if (provider === "azure") {
      webUrl = buildAzureWebUrl(remoteUrl, repoPath);
    } else {
      const hostMap: Record<string, string> = {
        github: "https://github.com",
        gitlab: "https://gitlab.com",
        bitbucket: "https://bitbucket.org",
      };
      webUrl = `${hostMap[provider]}/${repoPath}`;
    }
  }

  const cli = CLI_MAP[provider];
  const cliAvailable = cli ? isCliAvailable(cli) : false;

  return { provider, repoPath, webUrl, cliAvailable };
}

/** Get default branch from remote (symbolic-ref, fallback "main"). */
export function getDefaultBranch(cwd: string): string {
  try {
    const headRef = execFileSync("git", ["symbolic-ref", "refs/remotes/origin/HEAD"], {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return headRef.replace("refs/remotes/origin/", "");
  } catch {
    return "main";
  }
}

/**
 * Build the web URL for an Azure DevOps remote.
 * SSH paths use v3/org/project/repo → https://dev.azure.com/org/project/_git/repo
 * HTTPS paths already contain org/project/_git/repo.
 * Legacy visualstudio.com URLs use https://{host}/{repoPath}.
 */
function buildAzureWebUrl(remoteUrl: string, repoPath: string): string {
  // SSH: repoPath = "v3/org/project/repo"
  if (remoteUrl.startsWith("git@")) {
    const parts = repoPath.replace(/^v3\//, "").split("/");
    if (parts.length >= 3) {
      const [org, project, ...repoParts] = parts;
      const repo = repoParts.join("/");
      return `https://dev.azure.com/${org}/${project}/_git/${repo}`;
    }
  }

  // HTTPS legacy: https://{org}.visualstudio.com/project/_git/repo
  const httpsMatch = remoteUrl.match(/^https?:\/\/([^/]+)\//);
  if (httpsMatch) {
    const host = httpsMatch[1];
    if (host.endsWith(".visualstudio.com")) {
      return `https://${host}/${repoPath}`;
    }
  }

  // HTTPS new: https://dev.azure.com/org/project/_git/repo — repoPath already correct
  return `https://dev.azure.com/${repoPath}`;
}

/** Build a browser PR/MR URL for the provider. Returns null for unknown providers. */
export function buildPrUrl(info: ProviderInfo, branch: string, baseBranch: string): string | null {
  switch (info.provider) {
    case "github":
      return `${info.webUrl}/compare/${baseBranch}...${encodeURIComponent(branch)}?expand=1`;
    case "gitlab":
      return `${info.webUrl}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(branch)}&merge_request[target_branch]=${encodeURIComponent(baseBranch)}`;
    case "bitbucket":
      return `${info.webUrl}/pull-requests/new?source=${encodeURIComponent(branch)}&dest=${encodeURIComponent(baseBranch)}`;
    case "azure":
      return `${info.webUrl}/pullrequestcreate?sourceRef=${encodeURIComponent(branch)}&targetRef=${encodeURIComponent(baseBranch)}`;
    default:
      return null;
  }
}
