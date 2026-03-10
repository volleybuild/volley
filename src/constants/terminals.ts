import { spawn, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import type { LaunchFn } from "../types.js";
import { escapeOsascript, escapeShell } from "../utils/strings.js";
import { getRepoRoot } from "../utils/git.js";

export function getSocketPath(repoRoot: string): string {
  const hash = createHash("sha256").update(repoRoot).digest("hex").slice(0, 12);
  return `/tmp/volley-${hash}.sock`;
}

// Welcome message printed inside each new terminal
function welcomeScript(cwd: string, task: string, slug: string, branch: string): string {
  return `cd '${escapeShell(cwd)}' && echo '' && echo '\\033[38;5;79m\\033[1m▸▸ volley: ${escapeShell(slug)}\\033[0m' && echo '  Branch: ${escapeShell(branch)}' && echo '  Path:   ${escapeShell(cwd)}' && echo '' && echo '  Run your agent here, e.g:' && echo '    claude "${escapeShell(task)}"' && echo '' && exec $SHELL`;
}

function welcomeScriptOsa(cwd: string, task: string, slug: string, branch: string): string {
  return `clear && cd '${cwd}' && echo '' && echo '\\\\033[38;5;79m\\\\033[1m▸▸ volley: ${slug}\\\\033[0m' && echo '  Branch: ${branch}' && echo '  Path:   ${cwd}' && echo '' && echo '  Run your agent here, e.g:' && echo '    claude \\"${escapeOsascript(task)}\\"' && echo '' && exec $SHELL`;
}

export const terminalPresets: Record<string, LaunchFn> = {
  terminal: (cwd, task, slug, branch) => {
    const script = `tell application "Terminal"
      activate
      do script "${welcomeScriptOsa(cwd, task, slug, branch)}"
      set custom title of front window to "volley: ${slug}"
    end tell`;
    return spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" });
  },

  iterm: (cwd, task, slug, branch) => {
    const script = `tell application "iTerm2"
      create window with default profile
      tell current session of current window
        write text "${welcomeScriptOsa(cwd, task, slug, branch)}"
      end tell
      set name of current tab of current window to "volley: ${slug}"
    end tell`;
    return spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" });
  },

  warp: (cwd, task, slug, branch) => {
    return spawn("open", ["-a", "Warp", cwd], { detached: true, stdio: "ignore" });
  },

  kitty: (cwd, task, slug, branch) => {
    return spawn("kitty", [
      "--directory", cwd,
      "--title", `volley: ${slug}`,
      "sh", "-c", welcomeScript(cwd, task, slug, branch),
    ], { detached: true, stdio: "ignore" });
  },

  alacritty: (cwd, task, slug, branch) => {
    return spawn("alacritty", [
      "--working-directory", cwd,
      "--title", `volley: ${slug}`,
      "-e", "sh", "-c", welcomeScript(cwd, task, slug, branch),
    ], { detached: true, stdio: "ignore" });
  },

  hyper: (cwd, task, slug, branch) => {
    return spawn("hyper", [cwd], { detached: true, stdio: "ignore" });
  },

  "windows-terminal": (cwd, task, slug, branch) => {
    return spawn("cmd", [
      "/c", "start", "wt",
      "-d", cwd,
      "--title", `volley: ${slug}`,
      "cmd", "/k", `echo volley: ${slug} & echo Branch: ${branch} & echo Path: ${cwd} & echo. & echo Run your agent here`,
    ], { detached: true, stdio: "ignore" });
  },

  tmux: (cwd, task, slug, branch) => {
    const session = `volley-${slug}`;
    const cmd = welcomeScript(cwd, task, slug, branch);
    execSync(
      `tmux new-session -d -s "${session}" -c "${cwd}" "sh -c '${escapeShell(cmd)}'"`
    );
    return spawn("true", [], { detached: true, stdio: "ignore" });
  },

  volley: (cwd, task, slug, branch) => {
    const repoRoot = getRepoRoot();
    const socketPath = getSocketPath(repoRoot);

    if (!existsSync(socketPath)) {
      throw new Error(
        "Volley is not running. Launch it first:\n" +
        "  cd terminal && npm run dev -- --repo " + repoRoot
      );
    }

    const message = JSON.stringify({
      action: "open",
      requestId: `cli-${Date.now()}`,
      session: { id: slug, slug, branch, worktreePath: cwd, task },
    }) + "\n";

    // Fire-and-forget: connect to socket and send the open message
    const script = `
      const net = require("net");
      const sock = net.createConnection(${JSON.stringify(socketPath)}, () => {
        sock.write(${JSON.stringify(message)});
        sock.on("data", () => sock.destroy());
        setTimeout(() => sock.destroy(), 2000);
      });
      sock.on("error", (err) => {
        process.stderr.write("Volley socket error: " + err.message + "\\n");
        process.exit(1);
      });
    `;

    return spawn("node", ["-e", script], { detached: true, stdio: "ignore" });
  },
};
