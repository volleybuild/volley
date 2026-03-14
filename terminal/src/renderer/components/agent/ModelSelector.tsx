import React, { useState, useEffect, useRef } from "react";

export interface ModelOption {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  group: "recommended" | "powerful" | "fast";
}

const MODELS: ModelOption[] = [
  {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    shortLabel: "Sonnet 4",
    description: "Best balance of speed and capability",
    group: "recommended",
  },
  {
    id: "claude-opus-4-20250514",
    label: "Claude Opus 4",
    shortLabel: "Opus 4",
    description: "Most capable, best for complex tasks",
    group: "powerful",
  },
  {
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    shortLabel: "Haiku 4.5",
    description: "Fastest and most affordable",
    group: "fast",
  },
];

const GROUP_LABELS: Record<string, string> = {
  recommended: "Recommended",
  powerful: "Powerful",
  fast: "Fast",
};

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

interface Props {
  disabled?: boolean;
}

export default function ModelSelector({ disabled = false }: Props) {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load saved model from settings on mount
  useEffect(() => {
    window.volley.settings.getUser().then((s) => {
      if (s.ai?.model) setSelectedModel(s.ai.model);
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setOpen(false);
    window.volley.settings.setUser({ ai: { model: modelId } });
  };

  const current = MODELS.find((m) => m.id === selectedModel);
  const displayLabel = current?.shortLabel || selectedModel;

  // Group models
  const groups = ["recommended", "powerful", "fast"] as const;

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        title="Select model"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span>{displayLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 w-64 bg-vo-surface border border-white/[0.08] rounded-lg shadow-xl shadow-black/40 py-1 z-50">
          {groups.map((group) => {
            const groupModels = MODELS.filter((m) => m.group === group);
            if (groupModels.length === 0) return null;
            return (
              <div key={group}>
                <div className="px-3 pt-2 pb-1 text-[10px] text-gray-600 uppercase tracking-wider font-medium">
                  {GROUP_LABELS[group]}
                </div>
                {groupModels.map((model) => (
                  <button
                    key={model.id}
                    className={`flex flex-col w-full px-3 py-1.5 text-left transition-colors duration-75 cursor-pointer ${
                      model.id === selectedModel
                        ? "bg-accent-bright/[0.08] text-gray-100"
                        : "text-gray-400 hover:bg-white/[0.04]"
                    }`}
                    onClick={() => handleSelect(model.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium">{model.label}</span>
                      {model.id === selectedModel && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent-bright">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600 leading-tight">
                      {model.description}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
          <div className="border-t border-white/[0.06] mt-1 pt-1 px-3 py-1.5">
            <span className="text-[10px] text-gray-600">
              Custom models can be set in Settings
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export { MODELS, DEFAULT_MODEL };
