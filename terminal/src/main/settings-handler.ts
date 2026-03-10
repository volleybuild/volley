import { ipcMain } from "electron";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const USER_SETTINGS_DIR = path.join(os.homedir(), ".volley");
const USER_SETTINGS_PATH = path.join(USER_SETTINGS_DIR, "settings.json");

function readJson(filePath: string): Record<string, any> {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeJson(filePath: string, data: Record<string, any>): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function registerSettingsHandlers(getRepoRoot: () => string | null): void {

  // ── settings:get-user ──────────────────────────────────────────────────
  ipcMain.handle("settings:get-user", () => {
    return readJson(USER_SETTINGS_PATH);
  });

  // ── settings:set-user ──────────────────────────────────────────────────
  ipcMain.handle("settings:set-user", (_event, partial: Record<string, any>) => {
    try {
      const existing = readJson(USER_SETTINGS_PATH);
      const merged = deepMerge(existing, partial);
      writeJson(USER_SETTINGS_PATH, merged);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── settings:get-project ───────────────────────────────────────────────
  ipcMain.handle("settings:get-project", () => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return {};
    return readJson(path.join(repoRoot, ".volley.json"));
  });

  // ── settings:set-project ───────────────────────────────────────────────
  ipcMain.handle("settings:set-project", (_event, config: Record<string, any>) => {
    const repoRoot = getRepoRoot();
    if (!repoRoot) return { ok: false, error: "No repo root" };
    try {
      writeJson(path.join(repoRoot, ".volley.json"), config);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── settings:test-connection ───────────────────────────────────────────
  ipcMain.handle("settings:test-connection", async (_event, { apiKey }: { apiKey: string }) => {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (response.ok) {
        return { ok: true };
      }
      const body = await response.json().catch(() => ({}));
      return { ok: false, error: (body as any).error?.message || `HTTP ${response.status}` };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── settings:check-env-key ─────────────────────────────────────────────
  ipcMain.handle("settings:check-env-key", () => {
    return { hasEnvKey: !!process.env.ANTHROPIC_API_KEY };
  });

  // ── settings:claude-auth-status ────────────────────────────────────────
  // Uses fast file/keychain checks instead of CLI commands (which can hang in Electron)
  ipcMain.handle("settings:claude-auth-status", () => {
    // Check if Claude Code is installed by looking for ~/.claude directory
    const claudeDir = path.join(os.homedir(), ".claude");
    const installed = fs.existsSync(claudeDir);

    if (!installed) {
      return { installed: false, loggedIn: false };
    }

    // Check for OAuth credentials in macOS keychain (instant, no hanging)
    if (process.platform === "darwin") {
      try {
        const result = execFileSync("security", [
          "find-generic-password", "-s", "Claude Code-credentials", "-w",
        ], { timeout: 3000, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });

        if (result && result.trim()) {
          // Parse the credential JSON to extract subscription info
          try {
            const creds = JSON.parse(result.trim());
            const oauth = creds.claudeAiOauth;
            if (oauth?.accessToken) {
              return { installed: true, loggedIn: true, email: oauth.subscriptionType || "authenticated" };
            }
          } catch {
            // JSON parse failed but credential exists — still logged in
            return { installed: true, loggedIn: true };
          }
        }
      } catch {
        // Keychain entry not found — not logged in
      }
    }

    return { installed: true, loggedIn: false };
  });

  // ── settings:claude-login ──────────────────────────────────────────────
  // Note: `claude login` requires a proper TTY and can't be spawned from Electron.
  // This handler is kept as a no-op — the UI directs users to run it manually.
  ipcMain.handle("settings:claude-login", () => {
    return { ok: false, error: "Please run 'claude login' in your terminal" };
  });
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
