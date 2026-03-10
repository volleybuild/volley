import { existsSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { c, glyph, choose } from "../ui.js";
import { ask, confirm } from "../utils/prompt.js";
import { ensureGitRepo } from "../utils/git.js";

function detectTerminals(): string[] {
  const found: string[] = [];

  if (process.platform === "darwin") {
    // Terminal.app is always available
    found.push("terminal");
    const macApps: [string, string][] = [
      ["iTerm", "iterm"],
      ["Warp", "warp"],
    ];
    for (const [app, preset] of macApps) {
      if (
        existsSync(`/Applications/${app}.app`) ||
        existsSync(`/Applications/${app}2.app`)
      ) {
        found.push(preset);
      }
    }
  }

  // Check PATH-based terminals
  const pathTerminals: [string, string][] = [
    ["kitty", "kitty"],
    ["alacritty", "alacritty"],
    ["hyper", "hyper"],
    ["tmux", "tmux"],
  ];

  for (const [bin, preset] of pathTerminals) {
    try {
      execSync(`which ${bin}`, { stdio: "pipe" });
      found.push(preset);
    } catch {
      // not installed
    }
  }

  if (process.platform === "win32") {
    found.push("windows-terminal");
  }

  return found;
}

function detectSymlinks(repoRoot: string): string[] {
  const candidates = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
  ];
  return candidates.filter((f) => existsSync(join(repoRoot, f)));
}

function detectSetupCommand(repoRoot: string): string | null {
  if (existsSync(join(repoRoot, "bun.lockb"))) return "bun install";
  if (existsSync(join(repoRoot, "pnpm-lock.yaml"))) return "pnpm install";
  if (existsSync(join(repoRoot, "yarn.lock"))) return "yarn install";
  if (existsSync(join(repoRoot, "package-lock.json"))) return "npm install";
  if (existsSync(join(repoRoot, "package.json"))) return "npm install";
  if (existsSync(join(repoRoot, "Gemfile"))) return "bundle install";
  if (existsSync(join(repoRoot, "requirements.txt")))
    return "pip install -r requirements.txt";
  if (existsSync(join(repoRoot, "go.mod"))) return "go mod download";
  return null;
}

export async function cmdInit(): Promise<void> {
  console.log(`\n${c.mint}${c.bold}▸▸ volley init${c.reset}\n`);

  let repoRoot: string;
  try {
    repoRoot = await ensureGitRepo();
  } catch (e: any) {
    console.error(`${glyph.error} ${e.message}`);
    process.exit(1);
    return;
  }

  const configPath = join(repoRoot, ".volley.json");
  if (existsSync(configPath)) {
    const overwrite = await confirm(
      `${c.mint}.volley.json already exists.${c.reset} Overwrite?`,
    );
    if (!overwrite) {
      console.log(`\n  ${c.dim}Keeping existing config.${c.reset}\n`);
      return;
    }
  }

  const config: Record<string, any> = {};

  // ── Terminal ──────────────────────────────────────────────────────────

  const detected = detectTerminals();
  if (detected.length > 0) {
    const choice = await choose("Which terminal should volley open?", detected);
    // Only set if it's not the platform default
    const isDefault =
      (process.platform === "darwin" && choice === "terminal") ||
      (process.platform === "linux" && choice === "tmux");
    if (!isDefault) {
      config.terminal = choice;
    }
  }

  // ── Grid ──────────────────────────────────────────────────────────────

  const enableGrid = await confirm(
    "Enable grid tiling? (auto-arrange terminal windows)",
    true,
  );
  if (enableGrid) {
    config.grid = {};
    const customize = await confirm(
      "Customize grid? (default: 4 columns, 3 rows, 10px gap)",
    );
    if (customize) {
      const cols = await ask(`  ${c.dim}Max columns [4]:${c.reset} `);
      const rows = await ask(`  ${c.dim}Max rows [3]:${c.reset} `);
      const gap = await ask(`  ${c.dim}Gap in px [10]:${c.reset} `);
      if (cols) config.grid.maxColumns = parseInt(cols, 10);
      if (rows) config.grid.maxRows = parseInt(rows, 10);
      if (gap) config.grid.gap = parseInt(gap, 10);
    }
  }

  // ── Symlinks ──────────────────────────────────────────────────────────

  const foundEnvFiles = detectSymlinks(repoRoot);
  if (foundEnvFiles.length > 0) {
    console.log(`\n  ${c.bold}Symlink files into worktrees?${c.reset}`);
    console.log(`  ${c.dim}Found: ${foundEnvFiles.join(", ")}${c.reset}`);
    const useDetected = await confirm("Symlink these files?", true);
    if (useDetected) {
      config.symlinks = foundEnvFiles;
    }
  } else {
    const addSymlinks = await confirm(
      "Any files to symlink into worktrees? (e.g. .env)",
    );
    if (addSymlinks) {
      const files = await ask(`  ${c.dim}Files (comma-separated):${c.reset} `);
      if (files) {
        config.symlinks = files
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean);
      }
    }
  }

  // ── Setup ─────────────────────────────────────────────────────────────

  const detectedSetup = detectSetupCommand(repoRoot);
  if (detectedSetup) {
    console.log(`\n  ${c.bold}Setup command for new worktrees?${c.reset}`);
    console.log(`  ${c.dim}Detected: ${detectedSetup}${c.reset}`);
    const useDetected = await confirm(
      `Run "${detectedSetup}" in new worktrees?`,
      true,
    );
    if (useDetected) {
      config.setup = [detectedSetup];
    }
  } else {
    const addSetup = await confirm(
      "Any setup commands to run in new worktrees?",
    );
    if (addSetup) {
      const cmd = await ask(`  ${c.dim}Command:${c.reset} `);
      if (cmd) {
        config.setup = [cmd];
      }
    }
  }

  // ── Write ─────────────────────────────────────────────────────────────

  const json = JSON.stringify(config, null, 2);
  console.log(`\n  ${c.bold}Config:${c.reset}`);
  console.log(`  ${c.dim}${json.split("\n").join("\n  ")}${c.reset}`);

  const write = await confirm(`\nWrite to .volley.json?`, true);
  if (write) {
    writeFileSync(configPath, json + "\n");
    console.log(`\n${glyph.filled} Created .volley.json\n`);
  } else {
    console.log(`\n  ${c.dim}Aborted.${c.reset}\n`);
  }
}
