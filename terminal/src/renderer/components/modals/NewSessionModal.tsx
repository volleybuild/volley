import React, { useRef, useEffect, useState } from "react";
import { useUiStore } from "../../store/ui-store";
import Modal, { ModalTitle, ModalActions, ModalButton, ModalInput } from "./Modal";

export default function NewSessionModal() {
  const open = useUiStore((s) => s.newSessionModalOpen);
  const close = useUiStore((s) => s.closeNewSessionModal);
  const inputRef = useRef<HTMLInputElement>(null);
  const [task, setTask] = useState("");

  useEffect(() => {
    if (open) {
      setTask("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const submit = () => {
    const trimmed = task.trim();
    if (!trimmed) return;
    close();
    window.volley.session.start(trimmed);
  };

  return (
    <Modal open={open} onClose={close}>
      <ModalTitle
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
        }
      >
        New session
      </ModalTitle>

      <ModalInput
        value={task}
        onChange={setTask}
        placeholder="Task description..."
        inputRef={inputRef}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />

      <ModalActions hint="↵ to start">
        <ModalButton onClick={close}>Cancel</ModalButton>
        <ModalButton onClick={submit} variant="primary" disabled={!task.trim()}>
          Start
        </ModalButton>
      </ModalActions>
    </Modal>
  );
}
