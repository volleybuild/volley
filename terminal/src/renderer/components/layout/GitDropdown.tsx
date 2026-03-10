import React, { useState, useRef, useEffect } from "react";
import { useSessionStatus } from "../../hooks/use-session-status";
import { useUiStore } from "../../store/ui-store";
import { useSessionStore } from "../../store/session-store";

interface LineStat {
  files: number;
  insertions: number;
  deletions: number;
}

interface GitDropdownProps {
  sessionId: string;
}

const ICON_GIT = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="6" r="2" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M12 8v4m0 0l-6 6m6-6l6 6" />
  </svg>
);

const ICON_CHEVRON = (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export default function GitDropdown({ sessionId }: GitDropdownProps) {
  const [open, setOpen] = useState(false);
  const [conflictFiles, setConflictFiles] = useState<string[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { status } = useSessionStatus(sessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const session = sessions.get(sessionId);
  const addToast = useUiStore((s) => s.addToast);
  const openCommitModal = useUiStore((s) => s.openCommitModal);
  const bumpGitAction = useUiStore((s) => s.bumpGitAction);
  const setRightPaneView = useUiStore((s) => s.setRightPaneView);

  const gitActionVersion = useUiStore((s) => s.gitActionVersion);
  const [lineStat, setLineStat] = useState<LineStat | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.volley.git.lineStat(sessionId).then((stat) => {
      if (!cancelled) setLineStat(stat);
    });
    return () => { cancelled = true; };
  }, [sessionId, gitActionVersion]);

  const uncommitted = status?.uncommitted ?? 0;
  const unpushed = status?.unpushed ?? 0;
  const behind = status?.behind ?? 0;
  const sourceBranch = status?.sourceBranch ?? "main";
  const hasDot = uncommitted > 0 || unpushed > 0 || behind > 0;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleCommit = async () => {
    setOpen(false);
    const gitStatus = await window.volley.git.status(sessionId);
    if (gitStatus.error) {
      addToast(gitStatus.error, "error");
      return;
    }
    if (!gitStatus.dirty) {
      addToast("Nothing to commit", "info");
      return;
    }
    openCommitModal(sessionId, gitStatus.files.length);
  };

  const handleCommitAndPush = async () => {
    setOpen(false);
    const gitStatus = await window.volley.git.status(sessionId);
    if (gitStatus.error) {
      addToast(gitStatus.error, "error");
      return;
    }
    if (!gitStatus.dirty) {
      // Nothing to commit — just push if there are unpushed commits
      if (unpushed > 0) {
        await doPush();
      } else {
        addToast("Nothing to commit or push", "info");
      }
      return;
    }
    // Open commit modal — after commit completes, push will happen via the modal's onCommitAndPush
    openCommitModal(sessionId, gitStatus.files.length);
  };

  const doPush = async () => {
    addToast("Pushing...", "info");
    const result = await window.volley.git.push(sessionId);
    if (result.ok) {
      bumpGitAction();
      setRightPaneView("pr");
      addToast("Pushed — create a PR", "success");
    } else {
      addToast(result.error || "Push failed", "error");
    }
  };

  const handlePush = async () => {
    setOpen(false);
    if (unpushed === 0 && uncommitted === 0) {
      setRightPaneView("pr");
      return;
    }
    await doPush();
  };

  const handleSync = async () => {
    setOpen(false);
    addToast(`Syncing from ${sourceBranch}...`, "info");
    const result = await window.volley.git.mergeSource(sessionId);
    bumpGitAction();
    if (result.ok) {
      addToast(`Synced from ${sourceBranch}`, "success");
    } else if (result.conflicts && result.conflicts.length > 0) {
      addToast(`Merge conflicts in ${result.conflicts.length} file(s)`, "error");
      setConflictFiles(result.conflicts);
    } else if (result.error?.includes("would be overwritten")) {
      addToast("Commit your changes before syncing — uncommitted files overlap with incoming changes", "error");
    } else {
      addToast(result.error || "Merge failed", "error");
    }
  };

  const handleResolveWithAgent = () => {
    if (!conflictFiles) return;
    const files = conflictFiles.join(", ");
    window.volley.agent.send(
      sessionId,
      `There are merge conflicts after syncing from ${sourceBranch}. Please resolve the conflicts in these files: ${files}\n\nResolve each conflict by choosing the correct code, then stage the resolved files with git add.`
    );
    setConflictFiles(null);
    setRightPaneView("agent");
  };

  const handleCreatePr = () => {
    setOpen(false);
    setRightPaneView("pr");
  };

  const openLandModal = useUiStore((s) => s.openLandModal);

  const handleLand = () => {
    setOpen(false);
    openLandModal(sessionId, sourceBranch, session?.branch ?? "");
  };

  const branchBadge = "text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 rounded px-1 py-px";

  const menuItemClass = (disabled: boolean) =>
    `flex items-center justify-between w-full px-2.5 py-1.5 text-[11px] text-left rounded transition-colors duration-75 ${
      disabled
        ? "text-gray-600 cursor-default"
        : "text-gray-300 hover:bg-white/[0.06] hover:text-gray-100 cursor-pointer"
    }`;

  return (
    <div ref={ref} className="relative">
      <button
        className="titlebar-no-drag flex items-center justify-center gap-0.5 h-6 px-1.5 rounded bg-transparent border-none cursor-pointer transition-colors duration-150 text-gray-600 hover:text-gray-400 hover:bg-white/[0.06] relative"
        title="Git actions"
        onClick={() => setOpen(!open)}
      >
        {ICON_GIT}
        {ICON_CHEVRON}
        {hasDot && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-vo-surface border border-white/[0.08] rounded-lg shadow-xl shadow-black/40 py-1 z-50">
          <button
            className={menuItemClass(uncommitted === 0)}
            onClick={uncommitted > 0 ? handleCommit : undefined}
          >
            <span className="flex items-center gap-1.5">
              Commit
              {uncommitted > 0 && lineStat && lineStat.files > 0 && (
                <span className="flex items-center gap-1 text-[10px] tabular-nums">
                  <span className="text-gray-500">{lineStat.files} {lineStat.files === 1 ? "file" : "files"}</span>
                  <span className="text-green-400">+{lineStat.insertions}</span>
                  <span className="text-red-400">-{lineStat.deletions}</span>
                </span>
              )}
              {uncommitted > 0 && (!lineStat || lineStat.files === 0) && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              )}
            </span>
            <span className="text-gray-600 text-[10px]">⌘⇧C</span>
          </button>
          <button
            className={menuItemClass(uncommitted === 0 && unpushed === 0)}
            onClick={uncommitted > 0 || unpushed > 0 ? handleCommitAndPush : undefined}
          >
            <span>Commit &amp; Push</span>
            <span className="text-gray-600 text-[10px]" />
          </button>
          <button
            className={menuItemClass(unpushed === 0 && uncommitted > 0)}
            onClick={unpushed > 0 || uncommitted === 0 ? handlePush : undefined}
          >
            <span>Push</span>
            <span className="text-gray-600 text-[10px]">⌘⇧P</span>
          </button>
          <div className="h-px bg-white/[0.06] my-1" />
          <button
            className={menuItemClass(false)}
            onClick={handleSync}
          >
            <span className="flex items-center gap-1.5">
              Sync from <span className={branchBadge}>{sourceBranch}</span>
              {behind > 0 && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[9px] text-amber-400/90 bg-amber-500/15 rounded px-1 py-px">{behind} behind</span>
                </>
              )}
            </span>
          </button>
          <button
            className={menuItemClass(false)}
            onClick={handleCreatePr}
          >
            <span>Create PR</span>
            <span className="text-gray-600 text-[10px]" />
          </button>
          <button
            className={menuItemClass(uncommitted > 0)}
            onClick={uncommitted === 0 ? handleLand : undefined}
          >
            <span className="flex items-center gap-1.5">Complete &amp; Merge to <span className={branchBadge}>{sourceBranch}</span></span>
            <span className="text-gray-600 text-[10px]" />
          </button>
        </div>
      )}
      {conflictFiles && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConflictFiles(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setConflictFiles(null);
          }}
        >
          <div className="bg-vo-surface border border-vo-border rounded-lg shadow-2xl w-96 p-4">
            <div className="text-xs text-gray-400 mb-1">Merge conflicts</div>
            <div className="text-xs text-gray-500 mb-2">
              {conflictFiles.length} file{conflictFiles.length !== 1 ? "s" : ""} with conflicts:
            </div>
            <div className="text-[10px] font-mono text-red-400/80 bg-red-500/10 rounded px-2 py-1.5 mb-3 max-h-32 overflow-y-auto">
              {conflictFiles.map((f) => (
                <div key={f}>{f}</div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1"
                onClick={() => setConflictFiles(null)}
              >
                Resolve manually
              </button>
              <button
                className="text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded px-3 py-1 font-medium"
                onClick={handleResolveWithAgent}
                autoFocus
              >
                Resolve with agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
