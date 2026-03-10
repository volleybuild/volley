import React, { useRef, useEffect, useState } from "react";
import { useUiStore } from "../../store/ui-store";
import Modal, { ModalTitle, ModalActions, ModalButton, ModalTextarea } from "./Modal";

interface FileChange {
  path: string;
  status: string;
}

interface LineStat {
  files: number;
  insertions: number;
  deletions: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  M: { label: "M", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" },
  A: { label: "A", color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
  D: { label: "D", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
  "?": { label: "?", color: "text-gray-400", bg: "bg-white/10 border-white/20" },
  R: { label: "R", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
};

export default function CommitModal() {
  const open = useUiStore((s) => s.commitModalOpen);
  const fileCount = useUiStore((s) => s.commitFileCount);
  const sessionId = useUiStore((s) => s.commitSessionId);
  const close = useUiStore((s) => s.closeCommitModal);
  const addToast = useUiStore((s) => s.addToast);
  const bumpGitAction = useUiStore((s) => s.bumpGitAction);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [files, setFiles] = useState<FileChange[]>([]);
  const [lineStat, setLineStat] = useState<LineStat | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !sessionId) {
      setFiles([]);
      setLineStat(null);
      setMessage("");
      return;
    }
    requestAnimationFrame(() => textareaRef.current?.focus());

    window.volley.git.changes(sessionId).then((result) => {
      if (result.error) return;
      const map = new Map<string, FileChange>();
      for (const f of result.unstaged) map.set(f.path, f);
      for (const f of result.staged) map.set(f.path, f);
      setFiles(Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path)));
    });

    window.volley.git.lineStat(sessionId).then((stat) => {
      setLineStat(stat);
    });
  }, [open, sessionId]);

  const submit = async () => {
    const msg = message.trim();
    if (!msg || !sessionId) return;
    close();
    const result = await window.volley.git.commit(sessionId, msg);
    if (result.ok) {
      bumpGitAction();
      addToast("Committed", "success");
    } else {
      addToast(result.error || "Commit failed", "error");
    }
  };

  const statusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG["?"];
    return (
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded border text-[10px] font-bold ${config.color} ${config.bg}`}>
        {config.label}
      </span>
    );
  };

  return (
    <Modal open={open} onClose={close} width="w-[440px]">
      <ModalTitle
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v6M12 16v6"/>
          </svg>
        }
      >
        Commit changes
      </ModalTitle>

      {/* Stat bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.04]">
          {lineStat ? (
            <>
              <span className="text-[11px] text-gray-400 tabular-nums">
                {lineStat.files} {lineStat.files === 1 ? "file" : "files"}
              </span>
              <span className="text-gray-700">·</span>
              <span className="text-[11px] text-green-400 tabular-nums font-medium">+{lineStat.insertions}</span>
              <span className="text-[11px] text-red-400 tabular-nums font-medium">−{lineStat.deletions}</span>
            </>
          ) : (
            <span className="text-[11px] text-gray-500 tabular-nums">
              {fileCount} file{fileCount !== 1 ? "s" : ""} changed
            </span>
          )}
        </div>

        {/* Insertion/deletion mini bar */}
        {lineStat && lineStat.insertions + lineStat.deletions > 0 && (
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div className="h-full flex">
              <div
                className="h-full bg-green-400/60"
                style={{ width: `${(lineStat.insertions / (lineStat.insertions + lineStat.deletions)) * 100}%` }}
              />
              <div
                className="h-full bg-red-400/60"
                style={{ width: `${(lineStat.deletions / (lineStat.insertions + lineStat.deletions)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="relative mb-4 rounded-lg overflow-hidden border border-white/[0.06]">
          {/* Subtle header */}
          <div className="px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.04]">
            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">Changed files</span>
          </div>

          <div className="max-h-[180px] overflow-y-auto bg-[#0a0a0c]">
            {files.map((f, i) => (
              <div
                key={f.path}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.02] transition-colors"
                style={{
                  animationDelay: `${i * 20}ms`,
                }}
              >
                {statusBadge(f.status)}
                <span className="text-[11px] font-mono text-gray-300 truncate">{f.path}</span>
              </div>
            ))}
          </div>

          {/* Fade out at bottom */}
          {files.length > 5 && (
            <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-[#0a0a0c] to-transparent pointer-events-none" />
          )}
        </div>
      )}

      {/* Commit message */}
      <ModalTextarea
        value={message}
        onChange={setMessage}
        placeholder="Commit message..."
        rows={2}
        textareaRef={textareaRef}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
      />

      <ModalActions hint="⌘↵ to commit">
        <ModalButton onClick={close}>Cancel</ModalButton>
        <ModalButton onClick={submit} variant="primary" disabled={!message.trim()}>
          Commit
        </ModalButton>
      </ModalActions>
    </Modal>
  );
}
