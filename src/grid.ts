import { execSync } from "node:child_process";
import type { Rect, GridConfig, Session } from "./types.js";
import { slugify } from "./utils/strings.js";

function getScreenBounds(): Rect {
  if (process.platform === "darwin") {
    try {
      const script = `tell application "Finder" to get bounds of window of desktop`;
      const result = execSync(`osascript -e '${script}'`, { encoding: "utf-8" }).trim();
      const [x, y, width, height] = result.split(", ").map(Number);
      // Account for menu bar (~25px)
      return { x, y: y + 25, width, height: height - 25 };
    } catch {
      // Fallback: common MacBook resolution
    }
  }
  return { x: 0, y: 25, width: 1920, height: 1055 };
}

function calculateGrid(count: number, screen: Rect, config: GridConfig): Rect[] {
  const maxCols = config.maxColumns ?? 4;
  const maxRows = config.maxRows ?? 3;
  const gap = config.gap ?? 10;
  const max = maxCols * maxRows;

  // Clamp to max
  const n = Math.min(count, max);
  if (n === 0) return [];

  // Columns first: stay at 1 column as long as possible, add columns when rows exceed maxRows
  let cols = 1;
  while (Math.ceil(n / cols) > maxRows && cols < maxCols) {
    cols++;
  }
  const rows = Math.ceil(n / cols);

  const cellWidth = (screen.width - gap * (cols + 1)) / cols;
  const cellHeight = (screen.height - gap * (rows + 1)) / rows;

  const rects: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Last row: stretch terminals to fill remaining width
    const lastRow = row === rows - 1;
    const itemsInLastRow = n - (rows - 1) * cols;
    const isLastRow = lastRow && itemsInLastRow < cols;

    let x: number, w: number;
    if (isLastRow) {
      const lastRowCols = itemsInLastRow;
      const lastCellWidth = (screen.width - gap * (lastRowCols + 1)) / lastRowCols;
      x = screen.x + gap + col * (lastCellWidth + gap);
      w = lastCellWidth;
    } else {
      x = screen.x + gap + col * (cellWidth + gap);
      w = cellWidth;
    }

    const y = screen.y + gap + row * (cellHeight + gap);

    rects.push({ x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(cellHeight) });
  }

  return rects;
}

export function resolveTerminalApp(terminal?: string): string {
  if (terminal === "iterm") return "iTerm2";
  if (terminal === "warp") return "Warp";
  return "Terminal";
}

export function retileWindows(sessions: Session[], terminal?: string, gridConfig?: GridConfig): void {
  if (!gridConfig) return;
  if (sessions.length === 0) return;

  const screen = getScreenBounds();
  const rects = calculateGrid(sessions.length, screen, gridConfig);

  if (process.platform === "darwin") {
    const app = resolveTerminalApp(terminal);

    // Build a single osascript that repositions all windows
    // Match by terminal window title set during launch
    const commands: string[] = [];
    for (let i = 0; i < sessions.length && i < rects.length; i++) {
      const r = rects[i];
      const x2 = r.x + r.width;
      const y2 = r.y + r.height;
      const slug = slugify(sessions[i].task);
      commands.push(`
        repeat with w in windows
          if name of w contains "volley: ${slug}" then
            set bounds of w to {${r.x}, ${r.y}, ${x2}, ${y2}}
          end if
        end repeat`);
    }

    const script = `tell application "${app}"
      ${commands.join("\n")}
    end tell`;

    try {
      execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { stdio: "pipe" });
    } catch {
      // Best effort — window might not exist yet
    }
  }

  if (process.platform === "linux" && (!terminal || terminal === "tmux")) {
    // tmux: use tiled layout
    try {
      execSync("tmux select-layout tiled", { stdio: "pipe" });
    } catch {
      // Not in tmux or no sessions
    }
  }
}
