import { spawn, execSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { terminalPresets } from "./constants/terminals.js";
import { slugify } from "./utils/strings.js";

function isCustomTemplate(value: string): boolean {
  return value.includes("{cwd}");
}

function launchFromTemplate(template: string, cwd: string, task: string, slug: string, branch: string): ChildProcess {
  const resolved = template
    .replace(/\{cwd\}/g, cwd)
    .replace(/\{slug\}/g, slug)
    .replace(/\{branch\}/g, branch)
    .replace(/\{task\}/g, task);

  return spawn("sh", ["-c", resolved], { detached: true, stdio: "ignore" });
}

export function launchTerminal(cwd: string, task: string, branch: string, terminal?: string): ChildProcess {
  const slug = slugify(task);

  // Environment variable override (used by Electron app to suppress external terminals)
  const envTerminal = process.env.VOLLEY_TERMINAL;
  if (envTerminal) terminal = envTerminal;

  // Custom template
  if (terminal && isCustomTemplate(terminal)) {
    return launchFromTemplate(terminal, cwd, task, slug, branch);
  }

  // Named preset
  if (terminal && terminalPresets[terminal]) {
    return terminalPresets[terminal](cwd, task, slug, branch);
  }

  // Auto-detect platform default
  const platform = process.platform;

  if (platform === "darwin") {
    return terminalPresets.terminal(cwd, task, slug, branch);
  }

  if (platform === "linux") {
    try {
      execSync("which tmux", { stdio: "pipe" });
      return terminalPresets.tmux(cwd, task, slug, branch);
    } catch {
      return terminalPresets.alacritty(cwd, task, slug, branch);
    }
  }

  if (platform === "win32") {
    return terminalPresets["windows-terminal"](cwd, task, slug, branch);
  }

  // Fallback: try kitty
  return terminalPresets.kitty(cwd, task, slug, branch);
}
