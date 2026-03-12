import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";

interface FileEntry {
  path: string;
  status: string;
}

function statusColor(status: string): string {
  switch (status) {
    case "A": case "?": return "bg-emerald-400";
    case "M": return "bg-yellow-400";
    case "D": return "bg-red-400";
    case "R": return "bg-blue-400";
    default: return "bg-gray-400";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "A": return "Added";
    case "?": return "Untracked";
    case "M": return "Modified";
    case "D": return "Deleted";
    case "R": return "Renamed";
    default: return status;
  }
}

export default function ChangesPane() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const gitActionVersion = useUiStore((s) => s.gitActionVersion);
  const bumpGitAction = useUiStore((s) => s.bumpGitAction);
  const openDiff = useUiStore((s) => s.openDiff);
  const addToast = useUiStore((s) => s.addToast);

  const [staged, setStaged] = useState<FileEntry[]>([]);
  const [unstaged, setUnstaged] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    if (!activeSessionId) return;
    setLoading(true);
    window.volley.git.changes(activeSessionId).then((data) => {
      if (!mountedRef.current) return;
      setStaged(data.staged);
      setUnstaged(data.unstaged);
      setLoading(false);
    }).catch(() => {
      if (mountedRef.current) setLoading(false);
    });
  }, [activeSessionId]);

  useEffect(() => { refresh(); }, [refresh, gitActionVersion]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleStage = async (files: string[]) => {
    if (!activeSessionId) return;
    const result = await window.volley.git.stage(activeSessionId, files);
    if (result.ok) bumpGitAction();
    else addToast(result.error || "Stage failed", "error");
  };

  const handleUnstage = async (files: string[]) => {
    if (!activeSessionId) return;
    const result = await window.volley.git.unstage(activeSessionId, files);
    if (result.ok) bumpGitAction();
    else addToast(result.error || "Unstage failed", "error");
  };

  const handleDiscard = async (files: string[]) => {
    if (!activeSessionId) return;
    const result = await window.volley.git.discard(activeSessionId, files);
    if (result.ok) bumpGitAction();
    else addToast(result.error || "Discard failed", "error");
  };

  const handleCommit = async () => {
    if (!activeSessionId || !commitMsg.trim()) return;
    const result = await window.volley.git.commit(activeSessionId, commitMsg.trim());
    if (result.ok) {
      setCommitMsg("");
      bumpGitAction();
      addToast("Committed", "success");
    } else {
      addToast(result.error || "Commit failed", "error");
    }
  };

  const totalChanges = staged.length + unstaged.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {loading && totalChanges === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-[13px]">Loading...</div>
      ) : totalChanges === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-[13px]">No changes</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Staged section */}
          <div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] cursor-pointer select-none hover:bg-white/[0.04]"
              onClick={() => setStagedOpen(!stagedOpen)}
            >
              <span className="flex-shrink-0 flex items-center w-3 text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${stagedOpen ? "rotate-90" : ""}`}>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
              <span className="text-[13px] text-gray-400 font-medium">Staged</span>
              <span className="text-[11px] text-gray-600">({staged.length})</span>
              <span className="flex-1" />
              {staged.length > 0 && (
                <button
                  className="text-[11px] text-gray-600 hover:text-gray-300 px-1 cursor-pointer transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleUnstage(staged.map(f => f.path)); }}
                >
                  Unstage All
                </button>
              )}
            </div>
            {stagedOpen && staged.map((file) => (
              <FileRow
                key={`s-${file.path}`}
                file={file}
                isStaged
                onStage={() => {}}
                onUnstage={() => handleUnstage([file.path])}
                onDiscard={() => {}}
                onViewDiff={() => openDiff(file.path, true)}
              />
            ))}
          </div>

          {/* Unstaged section */}
          <div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] cursor-pointer select-none hover:bg-white/[0.04]"
              onClick={() => setUnstagedOpen(!unstagedOpen)}
            >
              <span className="flex-shrink-0 flex items-center w-3 text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${unstagedOpen ? "rotate-90" : ""}`}>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
              <span className="text-[13px] text-gray-400 font-medium">Unstaged</span>
              <span className="text-[11px] text-gray-600">({unstaged.length})</span>
              <span className="flex-1" />
              {unstaged.length > 0 && (
                <button
                  className="text-[11px] text-gray-600 hover:text-gray-300 px-1 cursor-pointer transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleStage(unstaged.map(f => f.path)); }}
                >
                  Stage All
                </button>
              )}
            </div>
            {unstagedOpen && unstaged.map((file) => (
              <FileRow
                key={`u-${file.path}`}
                file={file}
                isStaged={false}
                onStage={() => handleStage([file.path])}
                onUnstage={() => {}}
                onDiscard={() => handleDiscard([file.path])}
                onViewDiff={() => openDiff(file.path, false)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Commit area */}
      {staged.length > 0 && (
        <div className="flex-shrink-0 border-t border-white/[0.06] p-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Commit message..."
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            className="w-full bg-vo-base border border-vo-border rounded px-2 py-1.5 text-[13px] text-vo-text outline-none focus:border-accent/50 mb-1.5"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCommit();
              }
            }}
          />
          <button
            className={`w-full text-[11px] font-medium rounded py-1.5 transition-colors ${
              commitMsg.trim()
                ? "bg-accent-bright text-vo-base hover:bg-accent cursor-pointer"
                : "bg-white/[0.06] text-gray-600 cursor-default"
            }`}
            onClick={handleCommit}
            disabled={!commitMsg.trim()}
          >
            Commit ({staged.length} file{staged.length !== 1 ? "s" : ""})
          </button>
        </div>
      )}
    </div>
  );
}

function FileRow({ file, isStaged, onStage, onUnstage, onDiscard, onViewDiff }: {
  file: FileEntry;
  isStaged: boolean;
  onStage: () => void;
  onUnstage: () => void;
  onDiscard: () => void;
  onViewDiff: () => void;
}) {
  return (
    <div className="group flex items-center gap-1.5 px-3 py-1 hover:bg-white/[0.04]">
      <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${statusColor(file.status)}`} title={statusLabel(file.status)} />
      <span
        className="text-[13px] text-gray-400 truncate flex-1 cursor-pointer hover:text-gray-200"
        onClick={onViewDiff}
        title={file.path}
      >
        {file.path}
      </span>
      <span className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
        {isStaged ? (
          <button
            className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-yellow-400 hover:bg-white/[0.08] transition-colors cursor-pointer"
            onClick={onUnstage}
            title="Unstage"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
          </button>
        ) : (
          <>
            <button
              className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-accent-bright hover:bg-white/[0.08] transition-colors cursor-pointer"
              onClick={onStage}
              title="Stage"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <button
              className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
              onClick={onDiscard}
              title="Discard"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </>
        )}
        <button
          className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-accent-cyan hover:bg-white/[0.08] transition-colors cursor-pointer"
          onClick={onViewDiff}
          title="View Diff"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18" strokeDasharray="2 4" /></svg>
        </button>
      </span>
    </div>
  );
}
