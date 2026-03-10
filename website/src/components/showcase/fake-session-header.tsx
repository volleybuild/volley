import { StatusDot } from "../ui/status-dot";

interface FakeSessionHeaderProps {
  slug: string;
  branch: string;
  baseBranch?: string;
  status: "pending" | "running" | "idle" | "done";
}

const TB =
  "flex items-center justify-center w-6 h-6 rounded bg-transparent border-none transition-colors duration-150 flex-shrink-0";
const TB_DEFAULT = `${TB} text-gray-600`;
const TB_DANGER = `${TB} text-gray-600`;

/**
 * Exact copy of the real SessionHeader markup (active session state).
 * Shows: StatusDot · slug · branch → base + icon buttons
 */
export function FakeSessionHeader({
  slug,
  branch,
  baseBranch = "main",
  status,
}: FakeSessionHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1 flex-shrink-0 text-[11px] select-none bg-vo-base border-b border-white/[0.06]">
      <StatusDot status={status} className="w-[7px] h-[7px]" />
      <span className="text-gray-200 font-medium">{slug}</span>
      <span className="text-gray-700 mx-0.5">&middot;</span>

      {/* Branch info */}
      <div className="flex items-center gap-1.5 text-gray-500">
        <span className="text-gray-400">{branch}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-600"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <span className="text-gray-500">{baseBranch}</span>
      </div>

      <span className="flex-1" />

      {/* Panel toggle buttons — decorative */}
      {/* Terminal */}
      <button className={TB_DEFAULT}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      </button>
      {/* Files */}
      <button className={TB_DEFAULT}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      </button>
      {/* Changes */}
      <button className={TB_DEFAULT}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
      {/* Run */}
      <button className={TB_DEFAULT}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </button>

      <span className="w-px h-3.5 bg-white/[0.08] flex-shrink-0" />

      {/* Git */}
      <button className={TB_DEFAULT}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M12 8v4m0 0l-6 6m6-6l6 6" />
        </svg>
      </button>

      {/* Remove */}
      <button className={TB_DANGER}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      </button>
    </div>
  );
}
