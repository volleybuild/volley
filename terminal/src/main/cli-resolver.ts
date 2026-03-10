import { app } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Returns [command, args] for spawning the Volley CLI.
 * In packaged builds, uses the bundled CLI; otherwise falls back to the global `volley` command.
 */
export function spawnCliArgs(cliArgs: string[]): [string, string[]] {
  if (app.isPackaged) {
    const bundled = path.join(process.resourcesPath, "cli", "cli.js");
    if (fs.existsSync(bundled)) {
      return ["node", [bundled, ...cliArgs]];
    }
  }
  return ["volley", cliArgs];
}
