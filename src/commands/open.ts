import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { c, glyph } from "../ui.js";
import { getRepoRoot } from "../utils/git.js";
import { getSocketPath } from "../constants/terminals.js";
import { loadState } from "../state.js";

function ping(socketPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = createConnection(socketPath, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => resolve(false));
    sock.setTimeout(1000, () => {
      sock.destroy();
      resolve(false);
    });
  });
}

export async function cmdOpen(): Promise<void> {
  let repoRoot: string;
  try {
    repoRoot = getRepoRoot();
  } catch (e: any) {
    console.error(`${glyph.error} ${e.message}`);
    process.exit(1);
    return;
  }

  const socketPath = getSocketPath(repoRoot);

  // Check if already running
  if (existsSync(socketPath) && (await ping(socketPath))) {
    console.log(`${glyph.filled} Volley is already running for this repo.`);
    return;
  }

  // Resolve the terminal directory relative to the CLI package
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const terminalDir = resolve(__dirname, "..", "..", "terminal");

  if (!existsSync(terminalDir)) {
    console.error(
      `${glyph.error} Terminal app not found at ${terminalDir}`,
    );
    process.exit(1);
    return;
  }

  // Load state for session count
  let sessionCount = 0;
  try {
    const state = loadState();
    sessionCount = state.sessions.length;
  } catch {
    // no state yet — that's fine
  }

  // Spawn the Electron app detached
  const child = spawn("npx", ["electron", ".", "--repo", repoRoot], {
    cwd: terminalDir,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  console.log(`${glyph.filled} Launching Volley terminal...\n`);
  console.log(`  ${c.bold}Repo${c.reset}       ${c.dim}${repoRoot}${c.reset}`);
  if (sessionCount > 0) {
    console.log(
      `  ${c.bold}Sessions${c.reset}   ${c.mint}${sessionCount}${c.reset} ${c.dim}session${sessionCount === 1 ? "" : "s"} will be resumed${c.reset}`,
    );
  }
  console.log();
}
