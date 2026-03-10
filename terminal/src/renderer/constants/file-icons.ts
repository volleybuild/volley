interface Badge {
  label: string;
  bg: string;
  fg?: string;
}

const BADGES: Record<string, Badge> = {
  ts: { label: "TS", bg: "#3178c6" },
  tsx: { label: "TS", bg: "#3178c6" },
  js: { label: "JS", bg: "#f7df1e", fg: "#1a1a1a" },
  jsx: { label: "JS", bg: "#f7df1e", fg: "#1a1a1a" },
  py: { label: "PY", bg: "#3572a5" },
  go: { label: "GO", bg: "#00add8" },
  rs: { label: "RS", bg: "#de5722" },
  json: { label: "{}", bg: "#f7df1e", fg: "#1a1a1a" },
  css: { label: "CS", bg: "#a855f7" },
  scss: { label: "CS", bg: "#a855f7" },
  html: { label: "HT", bg: "#e34c26" },
  md: { label: "MD", bg: "#666" },
  yaml: { label: "YM", bg: "#cb171e" },
  yml: { label: "YM", bg: "#cb171e" },
  sh: { label: "SH", bg: "#22c55e" },
  bash: { label: "SH", bg: "#22c55e" },
  zsh: { label: "SH", bg: "#22c55e" },
  toml: { label: "TM", bg: "#9c4221" },
  sql: { label: "SQ", bg: "#336791" },
  graphql: { label: "GQ", bg: "#e535ab" },
  gql: { label: "GQ", bg: "#e535ab" },
  proto: { label: "PB", bg: "#4285f4" },
  java: { label: "JV", bg: "#b07219" },
  kt: { label: "KT", bg: "#a97bff" },
  swift: { label: "SW", bg: "#f05138" },
  c: { label: " C", bg: "#555" },
  h: { label: " H", bg: "#555" },
  cpp: { label: "C+", bg: "#004482" },
  hpp: { label: "H+", bg: "#004482" },
  rb: { label: "RB", bg: "#cc342d" },
  php: { label: "PH", bg: "#4f5d95" },
  lua: { label: "LU", bg: "#000080" },
  zig: { label: "ZG", bg: "#f7a41d", fg: "#1a1a1a" },
  ex: { label: "EX", bg: "#6e4a7e" },
  exs: { label: "EX", bg: "#6e4a7e" },
  erl: { label: "ER", bg: "#b83998" },
  hs: { label: "HS", bg: "#5e5086" },
};

const SPECIAL: Record<string, Badge> = {
  dockerfile: { label: "DK", bg: "#2496ed" },
  "package.json": { label: "NP", bg: "#cb3837" },
  "tsconfig.json": { label: "TS", bg: "#3178c6" },
  ".gitignore": { label: "GI", bg: "#f05032" },
  makefile: { label: "MK", bg: "#427819" },
  ".env": { label: "EN", bg: "#ecd53f", fg: "#1a1a1a" },
};

export function getFileIcon(filename: string): string | null {
  const lower = filename.toLowerCase();

  const special = SPECIAL[lower];
  if (special) return makeBadge(special);

  const dot = lower.lastIndexOf(".");
  if (dot !== -1) {
    const ext = lower.slice(dot + 1);
    const badge = BADGES[ext];
    if (badge) return makeBadge(badge);
  }

  return null;
}

function makeBadge({ label, bg, fg = "#fff" }: Badge): string {
  return `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="3" fill="${bg}"/><text x="7" y="10.5" text-anchor="middle" font-family="SF Mono,Menlo,monospace" font-size="8" font-weight="600" fill="${fg}">${label}</text></svg>`;
}
