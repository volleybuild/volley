import React, { useEffect, useRef, useState } from "react";
import { useUiStore } from "../../store/ui-store";
import Modal, { ModalTitle, ModalActions, ModalButton } from "./Modal";

export default function PullModal() {
  const open = useUiStore((s) => s.pullModalOpen);
  const sessionId = useUiStore((s) => s.pullSessionId);
  const baseBranch = useUiStore((s) => s.pullBaseBranch);
  const behindCount = useUiStore((s) => s.pullBehindCount);
  const close = useUiStore((s) => s.closePullModal);
  const addToast = useUiStore((s) => s.addToast);
  const bumpGitAction = useUiStore((s) => s.bumpGitAction);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const [conflictFiles, setConflictFiles] = useState<string[] | null>(null);
  const setRightPaneView = useUiStore((s) => s.setRightPaneView);

  useEffect(() => {
    if (open) {
      setConflictFiles(null);
      requestAnimationFrame(() => confirmRef.current?.focus());
    }
  }, [open]);

  const confirm = async () => {
    if (!sessionId) return;
    close();
    addToast(`Pulling from ${baseBranch}...`, "info");
    const result = await window.volley.git.mergeSource(sessionId);
    bumpGitAction();
    if (result.ok) {
      addToast(`Pulled from ${baseBranch}`, "success");
    } else if (result.conflicts && result.conflicts.length > 0) {
      addToast(`Merge conflicts in ${result.conflicts.length} file(s)`, "error");
      setConflictFiles(result.conflicts);
    } else if (result.error?.includes("would be overwritten")) {
      addToast("Commit your changes before pulling — uncommitted files overlap with incoming changes", "error");
    } else {
      addToast(result.error || "Pull failed", "error");
    }
  };

  const handleResolveWithAgent = () => {
    if (!conflictFiles || !sessionId) return;
    const files = conflictFiles.join(", ");
    window.volley.agent.send(
      sessionId,
      `There are merge conflicts after pulling from ${baseBranch}. Please resolve the conflicts in these files: ${files}\n\nResolve each conflict by choosing the correct code, then stage the resolved files with git add.`
    );
    setConflictFiles(null);
    setRightPaneView("agent" as any);
  };

  return (
    <>
      <Modal open={open} onClose={close}>
        <ModalTitle
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          }
          subtitle={`Merges the latest changes from ${baseBranch} into your session branch.`}
        >
          Pull from {baseBranch}
        </ModalTitle>

        {behindCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[11px] text-gray-400">
              {behindCount} new commit{behindCount !== 1 ? "s" : ""} on {baseBranch}
            </span>
          </div>
        )}

        <ModalActions hint="↵ to pull">
          <ModalButton onClick={close}>Cancel</ModalButton>
          <ModalButton onClick={confirm} variant="primary" ref={confirmRef}>
            Pull
          </ModalButton>
        </ModalActions>
      </Modal>

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
    </>
  );
}
