import React, { useEffect, useRef } from "react";
import { useUiStore } from "../../store/ui-store";
import { useSessionStore } from "../../store/session-store";
import Modal, { ModalTitle, ModalActions, ModalButton } from "./Modal";

export default function LandModal() {
  const open = useUiStore((s) => s.landModalOpen);
  const sessionId = useUiStore((s) => s.landSessionId);
  const baseBranch = useUiStore((s) => s.landBaseBranch);
  const sessionBranch = useUiStore((s) => s.landSessionBranch);
  const close = useUiStore((s) => s.closeLandModal);
  const addToast = useUiStore((s) => s.addToast);
  const bumpGitAction = useUiStore((s) => s.bumpGitAction);
  const setLifecycle = useSessionStore((s) => s.setLifecycle);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => confirmRef.current?.focus());
    }
  }, [open]);

  const confirm = async () => {
    if (!sessionId) return;
    close();
    addToast("Merging into " + baseBranch + "...", "info");
    const result = await window.volley.git.land(sessionId);
    if (result.ok) {
      bumpGitAction();
      addToast(`Merged into ${result.baseBranch ?? baseBranch}`, "success");
      const mergedTo = result.baseBranch ?? baseBranch;
      const completeResult = await window.volley.session.complete(sessionId, mergedTo);
      if (completeResult.ok) {
        setLifecycle(sessionId, "completed", { completedAt: Date.now(), mergedTo });
      }
    } else {
      addToast(result.error || "Merge failed", "error");
    }
  };

  return (
    <Modal open={open} onClose={close} variant="success">
      <ModalTitle
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <circle cx="18" cy="18" r="3"/>
            <circle cx="6" cy="6" r="3"/>
            <path d="M6 21V9a9 9 0 009 9"/>
          </svg>
        }
        subtitle={
          <>
            This will merge the session branch into{" "}
            <span className="text-accent font-mono">{baseBranch}</span>{" "}
            and mark the session as completed.
          </>
        }
      >
        Merge to {baseBranch}
      </ModalTitle>

      {/* Visual merge indicator */}
      <div className="relative flex items-center justify-center py-4 mb-2">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative flex items-center gap-4 px-4 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.06]">
          {/* Session branch */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-mono text-gray-400">{sessionBranch}</span>
          </div>

          {/* Arrow */}
          <svg width="20" height="12" viewBox="0 0 20 12" className="text-accent/60">
            <path d="M0 6h16M12 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          {/* Target branch */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-xs font-mono text-gray-300">{baseBranch}</span>
          </div>
        </div>
      </div>

      <ModalActions hint="↵ to merge">
        <ModalButton onClick={close}>Cancel</ModalButton>
        <ModalButton onClick={confirm} variant="primary" ref={confirmRef}>
          Merge & Complete
        </ModalButton>
      </ModalActions>
    </Modal>
  );
}
