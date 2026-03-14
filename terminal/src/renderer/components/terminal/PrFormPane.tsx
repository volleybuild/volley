import React, { useState, useEffect } from "react";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";

export default function PrFormPane() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const addToast = useUiStore((s) => s.addToast);
  const bumpGitAction = useUiStore((s) => s.bumpGitAction);

  const session = activeSessionId ? sessions.get(activeSessionId) : null;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [base, setBase] = useState("main");
  const [submitting, setSubmitting] = useState(false);
  const [cliAvailable, setCliAvailable] = useState<boolean | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);

  // Pre-fill title from session task and detect provider
  useEffect(() => {
    if (!activeSessionId || !session) return;
    setTitle(session.task || "");
    setPrUrl(null);

    window.volley.git.provider(activeSessionId).then((info) => {
      setCliAvailable(info.cliAvailable);
    });
  }, [activeSessionId]);

  if (!activeSessionId || !session) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
        No active session
      </div>
    );
  }

  // Show success state after PR creation
  if (prUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
        <div className="text-accent-bright text-sm font-medium">PR Created</div>
        <button
          className="text-xs text-accent-bright/80 hover:text-accent-bright underline"
          onClick={() => window.volley.openExternal(prUrl)}
        >
          Open in browser
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      addToast("Title is required", "error");
      return;
    }
    setSubmitting(true);
    const result = await window.volley.git.createPr(activeSessionId, title.trim(), body.trim(), base.trim());
    setSubmitting(false);

    if (result.ok && result.url) {
      setPrUrl(result.url);
      bumpGitAction();
      window.volley.openExternal(result.url);
      addToast("PR created", "success");
    } else if (result.prUrl) {
      // CLI not available — open browser fallback
      window.volley.openExternal(result.prUrl);
      addToast("Opened PR in browser", "info");
    } else {
      addToast(result.error || "PR creation failed", "error");
    }
  };

  const handleOpenBrowser = async () => {
    const info = await window.volley.git.provider(activeSessionId);
    if (info.webUrl) {
      // Build a compare URL manually
      const url = info.provider === "github"
        ? `${info.webUrl}/compare/${base}...${encodeURIComponent(session.branch)}?expand=1`
        : info.provider === "gitlab"
          ? `${info.webUrl}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(session.branch)}&merge_request[target_branch]=${encodeURIComponent(base)}`
          : info.provider === "azure"
            ? `${info.webUrl}/pullrequestcreate?sourceRef=${encodeURIComponent(session.branch)}&targetRef=${encodeURIComponent(base)}`
            : `${info.webUrl}/pull-requests/new?source=${encodeURIComponent(session.branch)}&dest=${encodeURIComponent(base)}`;
      window.volley.openExternal(url);
      addToast("Opened in browser", "info");
    } else {
      addToast("No remote URL detected", "error");
    }
  };

  // No CLI available — show fallback
  if (cliAvailable === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
        <div className="text-gray-400 text-xs text-center">
          No CLI tool detected.<br />
          Create your PR in the browser instead.
        </div>
        <button
          className="text-xs bg-accent-bright/20 text-accent-bright hover:bg-accent-bright/30 rounded px-3 py-1.5 transition-colors"
          onClick={handleOpenBrowser}
        >
          Open in Browser
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-3 gap-2 overflow-y-auto">
      <div className="text-xs text-gray-400 font-medium">Create Pull Request</div>

      <label className="text-[10px] text-gray-500">Title</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-accent-bright/40 transition-colors"
        placeholder="PR title"
        autoFocus
      />

      <label className="text-[10px] text-gray-500">Description</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-accent-bright/40 transition-colors min-h-[80px] resize-y"
        placeholder="Optional description"
      />

      <label className="text-[10px] text-gray-500">Base branch</label>
      <input
        type="text"
        value={base}
        onChange={(e) => setBase(e.target.value)}
        className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-accent-bright/40 transition-colors"
        placeholder="main"
      />

      <div className="flex gap-2 mt-1">
        <button
          className="flex-1 text-xs bg-accent-bright/20 text-accent-bright hover:bg-accent-bright/30 rounded px-3 py-1.5 font-medium transition-colors disabled:opacity-40 disabled:cursor-default"
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
        >
          {submitting ? "Creating..." : "Create PR"}
        </button>
        <button
          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 transition-colors"
          onClick={handleOpenBrowser}
        >
          Browser
        </button>
      </div>
    </div>
  );
}
