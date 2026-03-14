import { app, shell } from "electron";
import { autoUpdater, CancellationToken } from "electron-updater";
import { log, logError } from "./logger";

// ── Types ────────────────────────────────────────────────────────────────────

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  downloadUrl: string | null;
  releaseNotes: string | null;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const GITHUB_REPO = "volleybuild/volley";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// ── State ────────────────────────────────────────────────────────────────────

let cachedResult: UpdateCheckResult | null = null;
let cacheTime = 0;
let cancellationToken: CancellationToken | null = null;
let lastReleaseUrl = `https://github.com/${GITHUB_REPO}/releases`;

// ── Configure autoUpdater ────────────────────────────────────────────────────

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

// Suppress default error dialog
autoUpdater.on("error", () => {});

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Check for updates via electron-updater (queries GitHub Releases)
 */
export async function checkForUpdates(forceRefresh = false): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion();

  // Return cached result if still valid
  if (!forceRefresh && cachedResult && Date.now() - cacheTime < CACHE_DURATION) {
    log("update-checker: returning cached result");
    return cachedResult;
  }

  try {
    log("update-checker: checking for updates via electron-updater");
    const checkResult = await autoUpdater.checkForUpdates();

    if (!checkResult || !checkResult.updateInfo) {
      log("update-checker: no update info returned");
      return noUpdateResult(currentVersion);
    }

    const latestVersion = checkResult.updateInfo.version;
    const hasUpdate = latestVersion !== currentVersion && isVersionLessThan(currentVersion, latestVersion);
    const releaseUrl = `https://github.com/${GITHUB_REPO}/releases/tag/v${latestVersion}`;
    lastReleaseUrl = releaseUrl;

    // Extract release notes
    let releaseNotes: string | null = null;
    if (checkResult.updateInfo.releaseNotes) {
      if (typeof checkResult.updateInfo.releaseNotes === "string") {
        releaseNotes = checkResult.updateInfo.releaseNotes;
      } else if (Array.isArray(checkResult.updateInfo.releaseNotes)) {
        releaseNotes = checkResult.updateInfo.releaseNotes
          .map((n) => (typeof n === "string" ? n : n.note))
          .join("\n");
      }
    }

    const result: UpdateCheckResult = {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseUrl,
      // Set downloadUrl to releaseUrl so renderer truthiness checks work
      downloadUrl: hasUpdate ? releaseUrl : null,
      releaseNotes,
    };

    cachedResult = result;
    cacheTime = Date.now();

    log("update-checker: current=%s, latest=%s, hasUpdate=%s", currentVersion, latestVersion, hasUpdate);
    return result;
  } catch (error: any) {
    logError("update-checker: failed to check for updates:", error.message);
    return noUpdateResult(currentVersion);
  }
}

/**
 * Wire autoUpdater download events to IPC forwarding callbacks.
 * Call this before downloadUpdate().
 */
export function setupDownloadListeners(
  onProgress: (progress: DownloadProgress) => void,
  onComplete: () => void,
  onError: (error: string) => void,
): void {
  // Remove previous listeners to avoid duplicates
  autoUpdater.removeAllListeners("download-progress");
  autoUpdater.removeAllListeners("update-downloaded");
  autoUpdater.removeAllListeners("error");

  autoUpdater.on("download-progress", (info) => {
    onProgress({
      percent: Math.round(info.percent),
      transferred: info.transferred,
      total: info.total,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    log("update-checker: download complete (electron-updater)");
    onComplete();
  });

  autoUpdater.on("error", (err) => {
    logError("update-checker: download error:", err.message);
    onError(err.message);
  });
}

/**
 * Download the update via electron-updater.
 * Returns { ok, error? }. Progress/completion come through setupDownloadListeners.
 */
export async function downloadUpdate(): Promise<{ ok: boolean; error?: string }> {
  try {
    log("update-checker: starting download via electron-updater");
    cancellationToken = new CancellationToken();
    await autoUpdater.downloadUpdate(cancellationToken);
    return { ok: true };
  } catch (error: any) {
    if (error.message === "cancelled") {
      log("update-checker: download cancelled");
      return { ok: false, error: "Download cancelled" };
    }
    logError("update-checker: download error:", error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Cancel ongoing download
 */
export function cancelDownload(): void {
  if (cancellationToken) {
    cancellationToken.cancel();
    cancellationToken = null;
  }
}

/**
 * Install the downloaded update via quitAndInstall.
 * Falls back to opening the release page if quitAndInstall fails (e.g. unsigned app on macOS).
 */
export async function installUpdate(): Promise<{ ok: boolean; error?: string }> {
  try {
    log("update-checker: attempting quitAndInstall");
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  } catch (error: any) {
    logError("update-checker: quitAndInstall failed, falling back to release page:", error.message);
    try {
      await shell.openExternal(lastReleaseUrl);
      return { ok: true };
    } catch (shellError: any) {
      return { ok: false, error: shellError.message };
    }
  }
}

/**
 * Get current app version
 */
export function getAppVersion(): string {
  return app.getVersion();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isVersionLessThan(a: string, b: string): boolean {
  const partsA = a.replace(/^v/, "").split(".").map(Number);
  const partsB = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return true;
    if (numA > numB) return false;
  }
  return false;
}

function noUpdateResult(currentVersion: string): UpdateCheckResult {
  return {
    hasUpdate: false,
    currentVersion,
    latestVersion: currentVersion,
    releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
    downloadUrl: null,
    releaseNotes: null,
  };
}
