import React, { useEffect, useRef, useState } from "react";
import { useUiStore } from "../../store/ui-store";
import { useSessionStore } from "../../store/session-store";
import Modal, { ModalTitle, ModalButton } from "./Modal";

export default function CompleteModal() {
  const open = useUiStore((s) => s.completeModalOpen);
  const sessionId = useUiStore((s) => s.completeSessionId);
  const baseBranch = useUiStore((s) => s.completeBaseBranch);
  const sessionBranch = useUiStore((s) => s.completeSessionBranch);
  const close = useUiStore((s) => s.closeCompleteModal);
  const addToast = useUiStore((s) => s.addToast);
  const bumpGitAction = useUiStore((s) => s.bumpGitAction);
  const setRightPaneView = useUiStore((s) => s.setRightPaneView);
  const setLifecycle = useSessionStore((s) => s.setLifecycle);

  const [uncommitted, setUncommitted] = useState(0);
  const [unpushed, setUnpushed] = useState(0);
  const [pushing, setPushing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [merged, setMerged] = useState(false);
  const mergeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !sessionId) {
      setUncommitted(0);
      setUnpushed(0);
      setPushing(false);
      setMerging(false);
      setMerged(false);
      return;
    }
    window.volley.git.sessionStatus(sessionId).then((status) => {
      setUncommitted(status.uncommitted);
      setUnpushed(status.unpushed);
    });
  }, [open, sessionId]);

  const handleMergeLocally = async () => {
    if (!sessionId) return;
    setMerging(true);
    const result = await window.volley.git.land(sessionId);
    if (result.ok) {
      bumpGitAction();
      const mergedTo = result.baseBranch ?? baseBranch;
      const completeResult = await window.volley.session.complete(sessionId, mergedTo);
      if (completeResult.ok) {
        setLifecycle(sessionId, "completed", { completedAt: Date.now(), mergedTo });
      }
      setMerging(false);
      setMerged(true);
    } else {
      setMerging(false);
      close();
      addToast(result.error || "Merge failed", "error");
    }
  };

  const handlePushBaseBranch = async () => {
    setPushing(true);
    try {
      // Push the base branch to origin from the repo root
      // We use the session's land result which already merged into the base branch at repoRoot
      const result = await window.volley.git.pushBaseBranch(baseBranch);
      if (result.ok) {
        addToast(`Pushed ${baseBranch} to origin`, "success");
      } else {
        addToast(result.error || "Push failed", "error");
      }
    } catch {
      addToast("Push failed", "error");
    }
    setPushing(false);
    close();
  };

  const handleSkipPush = () => {
    addToast(`Merged into ${baseBranch} (local only)`, "success");
    close();
  };

  const handleCreatePr = async () => {
    if (!sessionId) return;
    close();
    if (unpushed > 0) {
      addToast("Pushing...", "info");
      const result = await window.volley.git.push(sessionId);
      if (result.ok) {
        bumpGitAction();
        addToast("Pushed — create a PR", "success");
      } else {
        addToast(result.error || "Push failed", "error");
        return;
      }
    }
    setRightPaneView("pr");
  };

  const hasUncommitted = uncommitted > 0;
  const hasUnpushed = unpushed > 0;

  // After merge: show push-to-origin prompt
  if (merged) {
    return (
      <Modal open={open} onClose={handleSkipPush} variant="success">
        <ModalTitle
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          }
          subtitle={`Your changes have been merged into ${baseBranch} locally. Push to sync with the remote?`}
        >
          Merged into {baseBranch}
        </ModalTitle>

        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-white/[0.04]">
          <ModalButton onClick={handleSkipPush}>Skip</ModalButton>
          <ModalButton onClick={handlePushBaseBranch} variant="primary" disabled={pushing}>
            {pushing ? "Pushing..." : `Push ${baseBranch} to origin`}
          </ModalButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} width="w-[480px]">
      <ModalTitle
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        }
      >
        Complete session
      </ModalTitle>

      {/* Two-path cards */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Merge locally */}
        <div className="relative flex flex-col rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent/70">
              <circle cx="18" cy="18" r="3"/>
              <circle cx="6" cy="6" r="3"/>
              <path d="M6 21V9a9 9 0 009 9"/>
            </svg>
            <span className="text-xs font-medium text-white/90">Merge locally</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed mb-4 flex-1">
            Merges your changes directly into <span className="text-accent/80 font-mono">{baseBranch}</span> on your machine.
          </p>
          <ModalButton
            onClick={handleMergeLocally}
            variant="primary"
            disabled={hasUncommitted || merging}
            ref={mergeRef}
          >
            {merging ? "Merging..." : "Merge"}
          </ModalButton>
        </div>

        {/* Create PR */}
        <div className="relative flex flex-col rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent/70">
              <circle cx="18" cy="18" r="3"/>
              <circle cx="6" cy="6" r="3"/>
              <path d="M18 6v6a3 3 0 01-3 3H6"/>
              <path d="M9 12l-3 3 3 3"/>
            </svg>
            <span className="text-xs font-medium text-white/90">Create PR</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed mb-4 flex-1">
            Push your changes and open a pull request for review.
          </p>
          <ModalButton onClick={handleCreatePr} variant="primary">
            Create PR
          </ModalButton>
        </div>
      </div>

      {/* Warnings */}
      {(hasUncommitted || hasUnpushed) && (
        <div className="space-y-1.5">
          {hasUncommitted && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
              </svg>
              <span className="text-[11px] text-amber-400/90">
                {uncommitted} uncommitted file{uncommitted !== 1 ? "s" : ""} — commit before merging
              </span>
            </div>
          )}
          {hasUnpushed && !hasUncommitted && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
              <span className="text-[11px] text-gray-500">
                {unpushed} unpushed commit{unpushed !== 1 ? "s" : ""} — will be pushed automatically for PR
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
