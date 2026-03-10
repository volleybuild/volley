import React from "react";
import { useUiStore } from "../../store/ui-store";
import { useProjectStore } from "../../store/project-store";
import Modal, { ModalTitle, ModalActions, ModalButton } from "./Modal";

export default function SwitchProjectModal() {
  const open = useUiStore((s) => s.switchProjectModalOpen);
  const targetId = useUiStore((s) => s.switchProjectTargetId);
  const close = useUiStore((s) => s.closeSwitchProjectModal);
  const projects = useProjectStore((s) => s.projects);

  const targetProject = projects.find((p) => p.id === targetId);

  const handleConfirm = () => {
    if (!targetId) return;
    close();
    window.volley.project.switch(targetId);
  };

  return (
    <Modal open={open} onClose={close} variant="danger">
      <ModalTitle
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        }
        subtitle={`Switching to "${targetProject?.name ?? "unknown"}" will stop all running sessions.`}
      >
        Switch project?
      </ModalTitle>

      <ModalActions>
        <ModalButton onClick={close}>Cancel</ModalButton>
        <ModalButton onClick={handleConfirm} variant="danger">
          Switch
        </ModalButton>
      </ModalActions>
    </Modal>
  );
}
