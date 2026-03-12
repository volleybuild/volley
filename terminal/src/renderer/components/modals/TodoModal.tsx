import React, { useRef, useEffect, useState } from "react";
import { useUiStore } from "../../store/ui-store";
import Modal, { ModalTitle, ModalActions, ModalButton, ModalInput, ModalTextarea } from "./Modal";

type TodoType = "bug" | "feature" | "improvement";

const TYPE_OPTIONS: { value: TodoType; label: string; color: string; activeColor: string }[] = [
  { value: "bug", label: "Bug", color: "text-red-400", activeColor: "bg-red-500/20 text-red-300 ring-1 ring-red-500/40" },
  { value: "feature", label: "Feature", color: "text-accent-bright", activeColor: "bg-accent-bright/20 text-accent-bright ring-1 ring-accent-bright/40" },
  { value: "improvement", label: "Improvement", color: "text-blue-400", activeColor: "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40" },
];

export default function TodoModal() {
  const open = useUiStore((s) => s.todoModalOpen);
  const close = useUiStore((s) => s.closeTodoModal);
  const addToast = useUiStore((s) => s.addToast);
  const inputRef = useRef<HTMLInputElement>(null);

  const [task, setTask] = useState("");
  const [todoType, setTodoType] = useState<TodoType>("feature");
  const [description, setDescription] = useState("");
  useEffect(() => {
    if (open) {
      setTask("");
      setTodoType("feature");
      setDescription("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const submit = async () => {
    const trimmed = task.trim();
    if (!trimmed) return;
    close();
    try {
      const result = await window.volley.session.createTodo(trimmed, {
        todoType,
        description: description.trim() || undefined,
      });
      if (!result.ok) {
        addToast(result.error || "Failed to create todo", "error");
      }
    } catch (e: any) {
      addToast(e.message || "Failed to create todo", "error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Modal open={open} onClose={close}>
      <ModalTitle
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
        }
      >
        New todo
      </ModalTitle>

      <ModalInput
        value={task}
        onChange={setTask}
        placeholder="Task title..."
        inputRef={inputRef}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            // Don't submit on plain Enter — let Cmd+Enter do it
          }
          handleKeyDown(e);
        }}
      />

      {/* Type selector */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1">Type</span>
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTodoType(opt.value)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
              todoType === opt.value
                ? opt.activeColor
                : "text-gray-500 hover:text-gray-300 bg-white/[0.03] hover:bg-white/[0.06]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Description textarea */}
      <div className="mt-3">
        <ModalTextarea
          value={description}
          onChange={setDescription}
          placeholder="Describe what needs to be done..."
          rows={3}
          onKeyDown={handleKeyDown}
        />
      </div>

      <ModalActions hint={"\u2318\u21B5 to create"}>
        <ModalButton onClick={close}>Cancel</ModalButton>
        <ModalButton onClick={submit} variant="primary" disabled={!task.trim()}>
          Create
        </ModalButton>
      </ModalActions>
    </Modal>
  );
}
