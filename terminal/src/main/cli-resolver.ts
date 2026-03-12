import { app } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { log } from "./logger";

/**
 * Returns [command, args, env] for spawning the Volley CLI.
 * In packaged builds, uses the bundled CLI via Electron's own binary
 * (with ELECTRON_RUN_AS_NODE=1 so it acts as plain Node).
 * Otherwise falls back to the global `volley` command.
 */
export function spawnCliArgs(cliArgs: string[]): [string, string[], Record<string, string>] {
  if (app.isPackaged) {
    const bundled = path.join(process.resourcesPath, "cli", "cli.js");
    if (fs.existsSync(bundled)) {
      log("CLI: using bundled", bundled);
      return [process.execPath, [bundled, ...cliArgs], { ELECTRON_RUN_AS_NODE: "1" }];
    }
  }
  log("CLI: using global volley command");
  return ["volley", cliArgs, {}];
}
