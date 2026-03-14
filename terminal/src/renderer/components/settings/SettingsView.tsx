import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUiStore } from "../../store/ui-store";
import type { SoundName } from "../../services/sound-service";
import { playSound } from "../../services/sound-service";

interface UserSettings {
  ai?: { anthropicKey?: string; authMethod?: "apiKey" | "oauth"; model?: string; customBaseUrl?: string };
}

interface ProjectConfig {
  start?: string;
  provider?: string;
  symlinks?: string[];
  setup?: string[];
}

export default function SettingsView() {
  const closeSettings = useUiStore((s) => s.closeSettings);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const soundSettings = useUiStore((s) => s.soundSettings);
  const toggleSound = useUiStore((s) => s.toggleSound);
  const toggleSoundEvent = useUiStore((s) => s.toggleSoundEvent);

  // ── AI settings ───────────────────────────────────────────────────────
  const [authMethod, setAuthMethod] = useState<"oauth" | "apiKey">("oauth");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasEnvKey, setHasEnvKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-20250514");
  const [customBaseUrl, setCustomBaseUrl] = useState("");

  // ── OAuth state ─────────────────────────────────────────────────────
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null);
  const [claudeLoggedIn, setClaudeLoggedIn] = useState(false);
  const [claudeEmail, setClaudeEmail] = useState<string | undefined>();

  // ── Project context state ───────────────────────────────────────────────
  const [analyzeStatus, setAnalyzeStatus] = useState<"idle" | "analyzing" | "done" | "failed">("idle");
  const [analyzeError, setAnalyzeError] = useState("");
  const [contextExists, setContextExists] = useState(false);
  const [contextUpdatedAt, setContextUpdatedAt] = useState<string | undefined>();

  // ── Log file ──────────────────────────────────────────────────────────
  const [logPath, setLogPath] = useState<string | null>(null);

  // ── Project config ────────────────────────────────────────────────────
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({});
  const [projectDirty, setProjectDirty] = useState(false);

  // Load on mount
  useEffect(() => {
    window.volley.settings.getUser().then((s: UserSettings) => {
      setApiKey(s.ai?.anthropicKey || "");
      if (s.ai?.authMethod) setAuthMethod(s.ai.authMethod);
      if (s.ai?.model) setSelectedModel(s.ai.model);
      setCustomBaseUrl(s.ai?.customBaseUrl || "");
    });
    window.volley.settings.checkEnvKey().then(({ hasEnvKey }) => {
      setHasEnvKey(hasEnvKey);
    });
    window.volley.settings.getProject().then((c: ProjectConfig) => {
      setProjectConfig(c);
    });
    window.volley.config.getLogPath().then(({ path }) => {
      setLogPath(path);
    });
    checkClaudeAuth();
    window.volley.planning.contextStatus().then(({ exists, analyzing, updatedAt }) => {
      setContextExists(exists);
      setContextUpdatedAt(updatedAt);
      if (analyzing) setAnalyzeStatus("analyzing");
    });
    window.volley.planning.onAnalyzeStatus(({ status, error }) => {
      setAnalyzeStatus(status as any);
      if (error) setAnalyzeError(error);
      if (status === "done") {
        setContextExists(true);
        setContextUpdatedAt(new Date().toISOString());
      }
    });
  }, []);

  const checkClaudeAuth = () => {
    window.volley.settings.claudeAuthStatus().then(({ installed, loggedIn, email }) => {
      setClaudeInstalled(installed);
      setClaudeLoggedIn(loggedIn);
      setClaudeEmail(email);
    });
  };

  // ── AI handlers ───────────────────────────────────────────────────────
  const saveKeyTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleKeyChange = useCallback((value: string) => {
    setApiKey(value);
    setTestStatus("idle");
    clearTimeout(saveKeyTimer.current);
    saveKeyTimer.current = setTimeout(() => {
      window.volley.settings.setUser({ ai: { anthropicKey: value } });
    }, 800);
  }, []);

  const handleAuthMethodChange = (method: "oauth" | "apiKey") => {
    setAuthMethod(method);
    window.volley.settings.setUser({ ai: { authMethod: method } });
  };

  const handleTestConnection = async () => {
    const key = apiKey || undefined;
    if (!key && !hasEnvKey) return;
    setTestStatus("loading");
    await window.volley.settings.setUser({ ai: { anthropicKey: apiKey } });
    const result = await window.volley.settings.testConnection(apiKey || "env");
    if (result.ok) {
      setTestStatus("success");
    } else {
      setTestStatus("error");
      setTestError(result.error || "Connection failed");
    }
  };

  const handleAnalyzeProject = async () => {
    setAnalyzeStatus("analyzing");
    setAnalyzeError("");
    const result = await window.volley.planning.analyzeProject();
    if (!result.ok && result.error !== "Aborted") {
      // Status update will come from IPC event, but handle immediate errors
    }
  };

  // ── Project config handlers ───────────────────────────────────────────
  const updateProject = useCallback((patch: Partial<ProjectConfig>) => {
    setProjectConfig((prev) => ({ ...prev, ...patch }));
    setProjectDirty(true);
  }, []);

  const saveProject = async () => {
    await window.volley.settings.setProject(projectConfig);
    setProjectDirty(false);
  };

  // ── List editor helpers ───────────────────────────────────────────────
  const addListItem = (key: "symlinks" | "setup") => {
    const list = [...(projectConfig[key] || []), ""];
    updateProject({ [key]: list });
  };
  const updateListItem = (key: "symlinks" | "setup", index: number, value: string) => {
    const list = [...(projectConfig[key] || [])];
    list[index] = value;
    updateProject({ [key]: list });
  };
  const removeListItem = (key: "symlinks" | "setup", index: number) => {
    const list = [...(projectConfig[key] || [])];
    list.splice(index, 1);
    updateProject({ [key]: list });
  };

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
      active
        ? "bg-accent-bright/10 text-accent-bright"
        : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
    }`;

  return (
    <div className="flex-1 overflow-y-auto bg-vo-base p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 cursor-pointer transition-colors"
            onClick={closeSettings}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-[15px] font-medium text-gray-200">Settings</h1>
        </div>

        {/* ── AI Section ─────────────────────────────────────────────── */}
        <section className="bg-vo-surface rounded-lg border border-vo-border p-5 space-y-4">
          <h2 className="text-[13px] font-medium text-gray-300 uppercase tracking-wider">AI Configuration</h2>

          {hasEnvKey && (
            <div className="flex items-center gap-2 text-xs text-accent-bright/80 bg-accent-bright/[0.06] rounded px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              ANTHROPIC_API_KEY detected in environment
            </div>
          )}

          {/* Auth method tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-vo-base rounded-lg w-fit">
            <button className={tabClass(authMethod === "oauth")} onClick={() => handleAuthMethodChange("oauth")}>
              Claude Account
            </button>
            <button className={tabClass(authMethod === "apiKey")} onClick={() => handleAuthMethodChange("apiKey")}>
              API Key
            </button>
          </div>

          {/* ── OAuth tab ──────────────────────────────────────────── */}
          {authMethod === "oauth" && (
            <div className="space-y-3">
              {claudeInstalled === null ? (
                <p className="text-xs text-gray-600">Checking status...</p>
              ) : !claudeInstalled ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-yellow-400/80 bg-yellow-500/[0.06] rounded px-3 py-2.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Claude Code CLI is not installed. Install it first to log in with your Claude account.</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Install via{" "}
                    <code className="text-gray-500 bg-vo-base rounded px-1 py-0.5">npm install -g @anthropic-ai/claude-code</code>
                    {" "}or see the{" "}
                    <button
                      className="text-accent-bright/70 hover:text-accent-bright underline underline-offset-2 cursor-pointer"
                      onClick={() => window.volley.openExternal("https://docs.anthropic.com/en/docs/claude-code/getting-started")}
                    >
                      getting started guide
                    </button>.
                  </p>
                </div>
              ) : claudeLoggedIn ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-accent-bright/80 bg-accent-bright/[0.06] rounded px-3 py-2.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>
                      Logged in{claudeEmail ? ` (${claudeEmail})` : ""} — using your Claude subscription
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Agent usage is included with your Claude Pro, Max, Team, or Enterprise plan.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Log in with your Claude account to use agent features with your existing subscription (Pro, Max, Team, or Enterprise).
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">
                      Run the following command in your terminal:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-vo-base rounded px-3 py-2 text-[13px] font-mono text-accent-bright/80 select-all">claude login</code>
                      <button
                        className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors border bg-vo-input border-vo-border text-gray-400 hover:text-gray-200 hover:border-gray-500"
                        onClick={checkClaudeAuth}
                      >
                        Refresh
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      After completing login in your browser, click Refresh to detect your credentials.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── API Key tab ────────────────────────────────────────── */}
          {authMethod === "apiKey" && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Anthropic API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    className="w-full bg-vo-input border border-vo-border rounded px-3 py-2 text-[13px] text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-accent-bright/40 focus:ring-1 focus:ring-accent-bright/20"
                    placeholder={hasEnvKey ? "Using environment variable" : "sk-ant-..."}
                    value={apiKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 cursor-pointer"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  className={`px-3 py-2 rounded text-xs font-medium cursor-pointer transition-colors border ${
                    testStatus === "success"
                      ? "bg-accent-bright/10 border-accent-bright/30 text-accent-bright"
                      : testStatus === "error"
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-vo-input border-vo-border text-gray-400 hover:text-gray-200 hover:border-gray-500"
                  }`}
                  onClick={handleTestConnection}
                  disabled={testStatus === "loading"}
                >
                  {testStatus === "loading" ? "Testing..." : testStatus === "success" ? "Connected" : testStatus === "error" ? "Failed" : "Test"}
                </button>
              </div>
              {testStatus === "error" && (
                <p className="text-[11px] text-red-400">{testError}</p>
              )}
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Get your API key from the{" "}
                <button
                  className="text-accent-bright/70 hover:text-accent-bright underline underline-offset-2 cursor-pointer"
                  onClick={() => window.volley.openExternal("https://console.anthropic.com/settings/keys")}
                >
                  Anthropic Console
                </button>
                . This is the developer platform (console.anthropic.com) — separate from a claude.ai chat subscription.
                You'll need to{" "}
                <button
                  className="text-accent-bright/70 hover:text-accent-bright underline underline-offset-2 cursor-pointer"
                  onClick={() => window.volley.openExternal("https://console.anthropic.com/")}
                >
                  create an account
                </button>
                {" "}and add credits to get started.
              </p>
            </div>
          )}

          {/* ── Default Model ──────────────────────────────────────── */}
          <div className="space-y-2 pt-2 border-t border-vo-border">
            <label className="text-xs text-gray-500">Default Model</label>
            <select
              className="w-full bg-vo-input border border-vo-border rounded px-3 py-2 text-[13px] text-gray-200 focus:outline-none focus:border-accent-bright/40 focus:ring-1 focus:ring-accent-bright/20 cursor-pointer"
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                window.volley.settings.setUser({ ai: { model: e.target.value } });
              }}
            >
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</option>
              <option value="claude-opus-4-20250514">Claude Opus 4 (Most capable)</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fastest)</option>
            </select>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              The model used for agent sessions. Can also be changed per-session from the prompt area.
            </p>
          </div>

          {/* ── Custom Base URL ────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Custom API Base URL</label>
            <input
              type="text"
              className="w-full bg-vo-input border border-vo-border rounded px-3 py-2 text-[13px] text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-accent-bright/40 focus:ring-1 focus:ring-accent-bright/20"
              placeholder="https://api.anthropic.com (default)"
              value={customBaseUrl}
              onChange={(e) => {
                setCustomBaseUrl(e.target.value);
                window.volley.settings.setUser({ ai: { customBaseUrl: e.target.value || undefined } });
              }}
            />
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Override the API endpoint for use with compatible providers (e.g. OpenRouter, AWS Bedrock proxy).
              Leave empty to use the default Anthropic API.
            </p>
          </div>
        </section>

        {/* ── Sound Section ────────────────────────────────────────── */}
        <section className="bg-vo-surface rounded-lg border border-vo-border p-5 space-y-4">
          <h2 className="text-[13px] font-medium text-gray-300 uppercase tracking-wider">Sound</h2>

          {/* Master toggle */}
          <div className="flex items-center justify-between py-0.5">
            <label className="text-xs text-gray-400">Enable sound effects</label>
            <button
              className={`relative w-10 h-[22px] rounded-full cursor-pointer transition-colors duration-200 ${
                soundEnabled ? "bg-accent-bright/70" : "bg-gray-700"
              }`}
              onClick={toggleSound}
            >
              <span
                className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  soundEnabled ? "translate-x-[18px]" : ""
                }`}
              />
            </button>
          </div>

          {/* Per-event toggles */}
          {soundEnabled && (
            <div className="space-y-1 pt-1 border-t border-vo-border">
              {([
                ["sessionStarted", "Session started"],
                ["sessionPaused", "Session paused"],
                ["agentWaiting", "Agent waiting for input"],
                ["agentDone", "Agent done"],
                ["sessionError", "Session error"],
              ] as [SoundName, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-1.5">
                  <label className="text-xs text-gray-500">{label}</label>
                  <div className="flex items-center gap-3">
                    <button
                      className="text-gray-600 hover:text-gray-400 cursor-pointer transition-colors"
                      title="Preview"
                      onClick={() => playSound(key)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 010 7.07" />
                      </svg>
                    </button>
                    <button
                      className={`relative w-10 h-[22px] rounded-full cursor-pointer transition-colors duration-200 ${
                        soundSettings[key] ? "bg-accent-bright/70" : "bg-gray-700"
                      }`}
                      onClick={() => toggleSoundEvent(key)}
                    >
                      <span
                        className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          soundSettings[key] ? "translate-x-[18px]" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Project Context Section ──────────────────────────────── */}
        <section className="bg-vo-surface rounded-lg border border-vo-border p-5 space-y-4">
          <h2 className="text-[13px] font-medium text-gray-300 uppercase tracking-wider">Project Context</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs text-gray-500">Project context</label>
                <p className="text-[11px] text-gray-600">
                  {contextExists
                    ? `Last analyzed ${contextUpdatedAt ? new Date(contextUpdatedAt).toLocaleDateString() : "recently"}`
                    : "Not analyzed yet"}
                </p>
              </div>
              <button
                className={`px-3 py-2 rounded text-xs font-medium cursor-pointer transition-colors border ${
                  analyzeStatus === "analyzing"
                    ? "bg-accent-bright/10 border-accent-bright/30 text-accent-bright animate-pulse"
                    : analyzeStatus === "done"
                      ? "bg-accent-bright/10 border-accent-bright/30 text-accent-bright"
                      : analyzeStatus === "failed"
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-vo-input border-vo-border text-gray-400 hover:text-gray-200 hover:border-gray-500"
                }`}
                onClick={handleAnalyzeProject}
                disabled={analyzeStatus === "analyzing"}
              >
                {analyzeStatus === "analyzing" ? "Analyzing..." : contextExists ? "Re-analyze" : "Analyze Project"}
              </button>
            </div>
            {analyzeStatus === "failed" && analyzeError && (
              <p className="text-[11px] text-red-400">{analyzeError}</p>
            )}
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Analyzes your project structure and writes a context summary to <code className="text-gray-500 bg-vo-base rounded px-1 py-0.5">.volley/context.md</code>.
              AI agents use this for faster, more accurate results.
            </p>
          </div>
        </section>

        {/* ── Project Config Section ─────────────────────────────────── */}
        <section className="bg-vo-surface rounded-lg border border-vo-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-gray-300 uppercase tracking-wider">Project Configuration</h2>
            {projectDirty && (
              <button
                className="px-3 py-1.5 rounded text-xs font-medium bg-accent-bright/10 border border-accent-bright/30 text-accent-bright hover:bg-accent-bright/20 cursor-pointer transition-colors"
                onClick={saveProject}
              >
                Save
              </button>
            )}
          </div>

          {/* Start command */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Start command</label>
            <input
              type="text"
              className="w-full bg-vo-input border border-vo-border rounded px-3 py-2 text-[13px] text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-accent-bright/40 focus:ring-1 focus:ring-accent-bright/20"
              placeholder="npm run dev"
              value={projectConfig.start || ""}
              onChange={(e) => updateProject({ start: e.target.value || undefined })}
            />
            <p className="text-[11px] text-gray-600">Command to start your dev server, run automatically in each new session.</p>
          </div>

          {/* Provider override */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Git provider</label>
            <select
              className="w-full bg-vo-input border border-vo-border rounded px-3 py-2 text-[13px] text-gray-200 focus:outline-none focus:border-accent-bright/40 focus:ring-1 focus:ring-accent-bright/20 cursor-pointer"
              value={projectConfig.provider || ""}
              onChange={(e) => updateProject({ provider: e.target.value || undefined })}
            >
              <option value="">Auto-detect</option>
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
              <option value="bitbucket">Bitbucket</option>
            </select>
            <p className="text-[11px] text-gray-600">Override the detected git hosting provider for PR and issue links.</p>
          </div>

          {/* Symlinks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs text-gray-500">Symlink paths</label>
                <p className="text-[11px] text-gray-600">Files symlinked into each session worktree from the main repo (e.g. .env).</p>
              </div>
              <button
                className="text-[11px] text-accent-bright/60 hover:text-accent-bright cursor-pointer"
                onClick={() => addListItem("symlinks")}
              >
                + Add
              </button>
            </div>
            {(projectConfig.symlinks || []).map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-vo-input border border-vo-border rounded px-3 py-2 text-[13px] text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-accent-bright/40 focus:ring-1 focus:ring-accent-bright/20"
                  placeholder="path/to/link"
                  value={item}
                  onChange={(e) => updateListItem("symlinks", i, e.target.value)}
                />
                <button
                  className="px-2 text-gray-600 hover:text-red-400 cursor-pointer"
                  onClick={() => removeListItem("symlinks", i)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {/* Setup commands */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs text-gray-500">Setup commands</label>
                <p className="text-[11px] text-gray-600">Commands run once when a new session worktree is created (e.g. install dependencies).</p>
              </div>
              <button
                className="text-[11px] text-accent-bright/60 hover:text-accent-bright cursor-pointer"
                onClick={() => addListItem("setup")}
              >
                + Add
              </button>
            </div>
            {(projectConfig.setup || []).map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-vo-input border border-vo-border rounded px-3 py-2 text-[13px] text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-accent-bright/40 focus:ring-1 focus:ring-accent-bright/20"
                  placeholder="npm install"
                  value={item}
                  onChange={(e) => updateListItem("setup", i, e.target.value)}
                />
                <button
                  className="px-2 text-gray-600 hover:text-red-400 cursor-pointer"
                  onClick={() => removeListItem("setup", i)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Troubleshooting Section ──────────────────────────────────── */}
        <section className="bg-vo-surface rounded-lg border border-vo-border p-5 space-y-4">
          <h2 className="text-[13px] font-medium text-gray-300 uppercase tracking-wider">Troubleshooting</h2>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500">Log file</label>
              <button
                className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors border bg-vo-input border-vo-border text-gray-400 hover:text-gray-200 hover:border-gray-500"
                onClick={() => window.volley.config.openLogFile()}
              >
                Open
              </button>
            </div>
            <p className="text-[13px] text-gray-400 font-mono break-all select-all">
              {logPath || "Loading..."}
            </p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Application logs for debugging session creation, socket connections, and other issues.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
