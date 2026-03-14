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

const ICON_COMMIT = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v6M12 16v6"/>
  </svg>
);

const ICON_PUSH = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5M5 12l7-7 7 7"/>
  </svg>
);

const ICON_PULL = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12l7 7 7-7"/>
  </svg>
);

const ICON_CHECK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
);

export default function GitDropdown({ sessionId }: GitDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { status } = useSessionStatus(sessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const session = sessions.get(sessionId);
  const addToast = useUiStore((s) => s.addToast);
  const openCommitModal = useUiStore((s) => s.openCommitModal);
  const openPullModal = useUiStore((s) => s.openPullModal);
  const openCompleteModal = useUiStore((s) => s.openCompleteModal);
  const bumpGitAction = useUiStore((s) => s.bumpGitAction);

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

  const handlePush = async () => {
    setOpen(false);
    if (unpushed === 0) return;
    addToast("Pushing...", "info");
    const result = await window.volley.git.push(sessionId);
    if (result.ok) {
      bumpGitAction();
      addToast("Pushed to origin", "success");
    } else {
      addToast(result.error || "Push failed", "error");
    }
  };

  const handlePull = () => {
    setOpen(false);
    openPullModal(sessionId, sourceBranch, behind);
  };

  const handleComplete = () => {
    setOpen(false);
    openCompleteModal(sessionId, sourceBranch, session?.branch ?? "");
  };

  const badgeClass = "text-[10px] font-medium tabular-nums rounded-full px-1.5 py-px";

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
          {/* Commit */}
          <button
            className={menuItemClass(uncommitted === 0)}
            onClick={uncommitted > 0 ? handleCommit : undefined}
          >
            <span className="flex items-center gap-1.5">
              <span className="text-gray-500">{ICON_COMMIT}</span>
              Commit
            </span>
            {uncommitted > 0 && lineStat && lineStat.files > 0 && (
              <span className={`${badgeClass} text-emerald-400 bg-emerald-500/15`}>
                {lineStat.files} {lineStat.files === 1 ? "file" : "files"}
              </span>
            )}
          </button>

          {/* Push */}
          <button
            className={menuItemClass(unpushed === 0)}
            onClick={unpushed > 0 ? handlePush : undefined}
          >
            <span className="flex items-center gap-1.5">
              <span className="text-gray-500">{ICON_PUSH}</span>
              Push
            </span>
            {unpushed > 0 && (
              <span className={`${badgeClass} text-emerald-400 bg-emerald-500/15`}>
                {unpushed} ahead
              </span>
            )}
          </button>

          {/* Pull */}
          <button
            className={menuItemClass(false)}
            onClick={handlePull}
          >
            <span className="flex items-center gap-1.5">
              <span className="text-gray-500">{ICON_PULL}</span>
              Pull
            </span>
            {behind > 0 && (
              <span className={`${badgeClass} text-amber-400 bg-amber-500/15`}>
                {behind} behind
              </span>
            )}
          </button>

          <div className="h-px bg-white/[0.06] my-1" />

          {/* Complete */}
          <button
            className={menuItemClass(false)}
            onClick={handleComplete}
          >
            <span className="flex items-center gap-1.5">
              <span className="text-gray-500">{ICON_CHECK}</span>
              Complete
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
