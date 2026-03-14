import React, { useEffect } from "react";
import { useUiStore } from "../../store/ui-store";

/**
 * Persistent update notification banner.
 * Shows in bottom-right corner when an update is available.
 * Supports download progress and install action.
 */
export default function UpdateBanner() {
  const updateInfo = useUiStore((s) => s.updateInfo);
  const updateDismissed = useUiStore((s) => s.updateDismissed);
  const updateDownloading = useUiStore((s) => s.updateDownloading);
  const updateDownloadProgress = useUiStore((s) => s.updateDownloadProgress);
  const updateDownloadedPath = useUiStore((s) => s.updateDownloadedPath);
  const dismissUpdate = useUiStore((s) => s.dismissUpdate);
  const setUpdateDownloading = useUiStore((s) => s.setUpdateDownloading);
  const setUpdateDownloadProgress = useUiStore((s) => s.setUpdateDownloadProgress);
  const setUpdateDownloadedPath = useUiStore((s) => s.setUpdateDownloadedPath);
  const addToast = useUiStore((s) => s.addToast);

  // Subscribe to download progress events
  useEffect(() => {
    window.volley.app.onDownloadProgress((progress) => {
      setUpdateDownloadProgress(progress.percent);
    });

    window.volley.app.onDownloadComplete(({ path }) => {
      setUpdateDownloadedPath(path);
      addToast("Update downloaded! Click Install to continue.", "success");
    });
  }, [setUpdateDownloadProgress, setUpdateDownloadedPath, addToast]);

  // Don't show if no update, dismissed, or no download URL
  if (!updateInfo?.hasUpdate || updateDismissed) {
    return null;
  }

  const handleDownload = async () => {
    if (!updateInfo.downloadUrl) {
      // No download URL - open release page
      window.volley.openExternal(updateInfo.releaseUrl);
      return;
    }

    setUpdateDownloading(true);
    setUpdateDownloadProgress(0);

    const result = await window.volley.app.downloadUpdate(updateInfo.downloadUrl);

    if (!result.ok) {
      setUpdateDownloading(false);
      addToast(result.error || "Download failed", "error");
    }
    // Success is handled by onDownloadComplete event
  };

  const handleInstall = async () => {
    if (!updateDownloadedPath) return;

    const result = await window.volley.app.openUpdate(updateDownloadedPath);
    if (!result.ok) {
      addToast(result.error || "Failed to open installer", "error");
    }
  };

  const handleCancel = () => {
    if (updateDownloading) {
      window.volley.app.cancelDownload();
      setUpdateDownloading(false);
      setUpdateDownloadProgress(0);
    }
  };

  const handleViewRelease = () => {
    window.volley.openExternal(updateInfo.releaseUrl);
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{
        maxWidth: "320px",
      }}
    >
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0f0f12 0%, #0a0a0c 100%)",
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.06),
            0 0 0 1px inset rgba(255,255,255,0.02),
            0 25px 50px -12px rgba(0,0,0,0.8),
            0 12px 24px -8px rgba(0,0,0,0.5),
            0 0 60px -10px rgba(110, 231, 183, 0.08)
          `,
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-16"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(110,231,183,0.4), transparent)",
          }}
        />

        {/* Content */}
        <div className="p-4">
          {/* Header with dismiss button */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent-bright/10 border border-accent-bright/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-bright">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/90">Update Available</h3>
                <p className="text-[11px] text-gray-500">
                  v{updateInfo.latestVersion}
                  <span className="text-gray-600 mx-1">•</span>
                  <button
                    onClick={handleViewRelease}
                    className="text-accent-bright/60 hover:text-accent-bright cursor-pointer"
                  >
                    View release
                  </button>
                </p>
              </div>
            </div>

            <button
              onClick={dismissUpdate}
              className="text-gray-600 hover:text-gray-400 cursor-pointer transition-colors p-1 -m-1"
              title="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Progress bar (during download) */}
          {updateDownloading && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                <span>Downloading...</span>
                <span>{updateDownloadProgress}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-bright transition-all duration-300 rounded-full"
                  style={{ width: `${updateDownloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {updateDownloadedPath ? (
              // Downloaded - show Install button
              <button
                onClick={handleInstall}
                className="
                  flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all
                  text-[#0a0a0c] bg-gradient-to-b from-[#6ee7b7] to-[#34d399]
                  hover:from-[#7eedc4] hover:to-[#3ddda3]
                  shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_20px_-5px_rgba(110,231,183,0.4)]
                "
              >
                Install & Restart
              </button>
            ) : updateDownloading ? (
              // Downloading - show Cancel button
              <button
                onClick={handleCancel}
                className="
                  flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors
                  text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]
                "
              >
                Cancel
              </button>
            ) : (
              // Ready to download
              <button
                onClick={handleDownload}
                className="
                  flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all
                  text-[#0a0a0c] bg-gradient-to-b from-[#6ee7b7] to-[#34d399]
                  hover:from-[#7eedc4] hover:to-[#3ddda3]
                  shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_20px_-5px_rgba(110,231,183,0.4)]
                "
              >
                {updateInfo.downloadUrl ? "Download" : "View Download"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
