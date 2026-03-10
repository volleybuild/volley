import React, { useEffect, useRef } from "react";
import { useUiStore } from "../../store/ui-store";
import { useSessionStore } from "../../store/session-store";
import Modal, { ModalTitle, ModalActions, ModalButton } from "./Modal";

export default function RemoveModal() {
  const open = useUiStore((s) => s.removeModalOpen);
  const sessionId = useUiStore((s) => s.removeSessionId);
  const dirty = useUiStore((s) => s.removeDirty);
  const fileCount = useUiStore((s) => s.removeFileCount);
  const unpushedCount = useUiStore((s) => s.removeUnpushedCount);
  const close = useUiStore((s) => s.closeRemoveModal);
  const addToast = useUiStore((s) => s.addToast);
  const removeSession = useSessionStore((s) => s.removeSession);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => confirmRef.current?.focus());
    }
  }, [open]);

  const parts: string[] = [];
  if (dirty) parts.push(`${fileCount} uncommitted file${fileCount !== 1 ? "s" : ""}`);
  if (unpushedCount > 0) parts.push(`${unpushedCount} unpushed commit${unpushedCount !== 1 ? "s" : ""}`);

  const confirm = async () => {
    if (!sessionId) return;
    close();
    const result = await window.volley.session.remove(sessionId);
    if (result.ok) {
      removeSession(sessionId);
      addToast("Session removed", "success");
    } else {
      addToast(result.error || "Remove failed", "error");
    }
  };

  return (
    <Modal open={open} onClose={close} variant="danger">
      <ModalTitle
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="10" y1="11" x2="10" y2="17" strokeLinecap="round"/>
            <line x1="14" y1="11" x2="14" y2="17" strokeLinecap="round"/>
          </svg>
        }
        subtitle={
          parts.length > 0
            ? `This session has ${parts.join(" and ")}. Removing will delete the worktree and branch permanently.`
            : "This will delete the worktree and branch permanently."
        }
      >
        Remove session
      </ModalTitle>

      {/* Warning badges for dirty state */}
      {parts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {dirty && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {fileCount} uncommitted
            </span>
          )}
          {unpushedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {unpushedCount} unpushed
            </span>
          )}
        </div>
      )}

      <ModalActions hint="↵ to confirm">
        <ModalButton onClick={close}>Cancel</ModalButton>
        <ModalButton onClick={confirm} variant="danger" ref={confirmRef}>
          Remove
        </ModalButton>
      </ModalActions>
    </Modal>
  );
}
