import { ask } from "./utils/prompt.js";

// ── ANSI colors ────────────────────────────────────────────────────────────

export const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  amber: "\x1b[33m",
  honey: "\x1b[38;5;214m",
  mint: "\x1b[38;5;79m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bgAmber: "\x1b[43m",
  bgGray: "\x1b[100m",
  bgHoney: "\x1b[48;5;214m",
  bgRed: "\x1b[41m",
};

// ── Glyphs ─────────────────────────────────────────────────────────────────

export const glyph = {
  filled: `${c.mint}▸${c.reset}`,
  empty: `${c.mint}▹${c.reset}`,
  error: `${c.red}▸${c.reset}`,
};

// ── Spinner ────────────────────────────────────────────────────────────────

export function spinner(text: string): { stop: () => void } {
  const frames = [
    `${c.mint}▹${c.reset} ${c.dim}${text}${c.reset}`,
    `${c.mint}▸${c.reset} ${c.dim}${text}${c.reset}`,
  ];
  let i = 0;
  process.stdout.write(frames[0]);
  const timer = setInterval(() => {
    i = (i + 1) % frames.length;
    process.stdout.write(`\r${frames[i]}`);
  }, 300);

  return {
    stop() {
      clearInterval(timer);
      process.stdout.write(`\r${"".padEnd(text.length + 4)}\r`);
    },
  };
}

// ── Status badge ───────────────────────────────────────────────────────────

export function statusBadge(status: string): string {
  switch (status) {
    case "running":
      return `${c.bgAmber}${c.bold} RUNNING ${c.reset}`;
    case "idle":
      return `${c.bgGray}${c.bold} IDLE ${c.reset}`;
    case "done":
      return `${c.bgHoney}${c.bold} DONE ${c.reset}`;
    default:
      return `${c.bgRed}${c.bold} ${status.toUpperCase()} ${c.reset}`;
  }
}

// ── Choose (styled menu) ───────────────────────────────────────────────────

export async function choose(
  prompt: string,
  options: string[],
  defaultIdx = 0,
): Promise<string> {
  console.log(`\n  ${c.bold}${prompt}${c.reset}`);
  for (let i = 0; i < options.length; i++) {
    const marker = i === defaultIdx ? `${c.mint}›${c.reset}` : " ";
    const label =
      i === defaultIdx
        ? `${c.mint}${options[i]}${c.reset}`
        : `${c.dim}${options[i]}${c.reset}`;
    console.log(`  ${marker} ${c.dim}${i + 1}.${c.reset} ${label}`);
  }
  const answer = await ask(`  ${c.dim}Choose [${defaultIdx + 1}]:${c.reset} `);
  const idx = answer ? parseInt(answer, 10) - 1 : defaultIdx;
  if (idx >= 0 && idx < options.length) return options[idx];
  return options[defaultIdx];
}
