/* ── Feature cards ──────────────────────────────────────────────── */
export interface Feature {
  title: string;
  description: string;
  icon: string; // SVG path data for a 24×24 viewBox
}

export const FEATURES: Feature[] = [
  {
    title: "Parallel sessions",
    description:
      "Run multiple AI coding sessions at the same time. Each one gets its own branch and workspace.",
    icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  },
  {
    title: "Built-in git",
    description:
      "Commit, push, and manage branches from inside the app. Diff stats update live per session.",
    icon: "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
  },
  {
    title: "Grid view",
    description:
      "See all sessions at once in a grid. Useful for keeping track of what's running.",
    icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  },
  {
    title: "Project switching",
    description:
      "Switch between repos. Volley auto-detects projects and keeps state per-project.",
    icon: "M3 7l9-4 9 4M3 7v10l9 4M3 7l9 4M21 7v10l-9 4M21 7l-9 4M12 11v11",
  },
  {
    title: "Session lifecycle",
    description:
      "Sessions move through todo, in progress, and completed. Pick up where you left off.",
    icon: "M12 2a10 10 0 1 0 10 10M12 2v10l7-4",
  },
  {
    title: "Powered by Claude",
    description:
      "Uses the Claude agent SDK under the hood. Bring your own Anthropic API key.",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  },
];

/* ── How-it-works steps ────────────────────────────────────────── */
export interface Step {
  number: number;
  title: string;
  description: string;
  icon: string;
}

export const STEPS: Step[] = [
  {
    number: 1,
    title: "Download",
    description:
      "Grab the .dmg and drop it in Applications.",
    icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  },
  {
    number: 2,
    title: "Open a repo",
    description:
      "Point it at any git repo. It picks up the project automatically.",
    icon: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  },
  {
    number: 3,
    title: "Start sessions",
    description:
      "Create sessions, describe the work, and let them run in parallel.",
    icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8",
  },
];

/* ── Animation timing ──────────────────────────────────────────── */
export const TIMING = {
  /** Total animation cycle including pause */
  totalCycle: 16,
  /** Act 1: multi-session blitz */
  act1Start: 0,
  act1End: 8,
  /** Act 2: workflow zoom */
  act2Start: 8,
  act2End: 14,
  /** Pause before loop */
  pauseDuration: 2,
  /** Typing speed in ms per character */
  typingSpeed: 40,
  /** Code streaming speed in ms per line */
  codeLineSpeed: 200,
} as const;

/* ── Fake session data for showcase ────────────────────────────── */
export const SHOWCASE_SESSIONS = [
  { slug: "auth-middleware", name: "Add auth middleware", branch: "feat/auth" },
  { slug: "api-tests", name: "Write API tests", branch: "test/api" },
  { slug: "responsive-nav", name: "Fix responsive nav", branch: "fix/nav" },
  { slug: "setup-ci", name: "Setup CI pipeline", branch: "chore/ci" },
] as const;

/* ── Agent message types for showcase ──────────────────────────── */
export type FakeAgentMsg =
  | { type: "user"; content: string }
  | { type: "text"; content: string }
  | { type: "tool"; name: string; summary: string; done: boolean }
  | { type: "done"; cost: string; duration: string };

/**
 * Each session has a scripted agent conversation flow.
 * Messages appear one at a time during the animation.
 */
export const SHOWCASE_AGENT_FLOWS: FakeAgentMsg[][] = [
  // Pane 0 — auth middleware
  [
    { type: "user", content: "Add JWT auth middleware to protect API routes" },
    { type: "text", content: "I'll create an auth middleware and update the route config." },
    { type: "tool", name: "Read", summary: "src/app/api/route.ts", done: true },
    { type: "tool", name: "Write", summary: "src/middleware.ts", done: true },
    { type: "tool", name: "Edit", summary: "src/lib/auth.ts", done: true },
    { type: "tool", name: "Bash", summary: "npm run typecheck", done: true },
    { type: "text", content: "Auth middleware is set up. Protected routes now require a valid JWT in the Authorization header." },
    { type: "done", cost: "$0.034", duration: "18s" },
  ],
  // Pane 1 — API tests
  [
    { type: "user", content: "Write tests for the user CRUD endpoints" },
    { type: "text", content: "I'll read the existing API routes and write vitest tests." },
    { type: "tool", name: "Glob", summary: "src/app/api/**/*.ts", done: true },
    { type: "tool", name: "Read", summary: "src/app/api/users/route.ts", done: true },
    { type: "tool", name: "Write", summary: "tests/api/users.test.ts", done: true },
    { type: "tool", name: "Bash", summary: "npx vitest run tests/api", done: true },
    { type: "text", content: "All 6 tests pass — covers GET, POST, PUT, DELETE with validation." },
    { type: "done", cost: "$0.028", duration: "14s" },
  ],
  // Pane 2 — responsive nav
  [
    { type: "user", content: "Fix nav menu — doesn't close on mobile after click" },
    { type: "tool", name: "Grep", summary: "/MobileMenu|NavMenu/", done: true },
    { type: "tool", name: "Read", summary: "src/components/Nav.tsx", done: true },
    { type: "text", content: "The issue is the click handler doesn't close the menu. Adding an onNavigate callback." },
    { type: "tool", name: "Edit", summary: "src/components/Nav.tsx", done: true },
    { type: "tool", name: "Edit", summary: "src/components/MobileMenu.tsx", done: true },
    { type: "text", content: "Fixed — menu closes on navigation and on outside click." },
    { type: "done", cost: "$0.019", duration: "11s" },
  ],
  // Pane 3 — CI pipeline
  [
    { type: "user", content: "Set up GitHub Actions CI with lint, test, build" },
    { type: "tool", name: "Read", summary: "package.json", done: true },
    { type: "tool", name: "Write", summary: ".github/workflows/ci.yml", done: true },
    { type: "tool", name: "Bash", summary: "cat .github/workflows/ci.yml", done: true },
    { type: "text", content: "CI workflow created with 3 jobs: lint, test, and build. Triggers on push and PR to main." },
    { type: "done", cost: "$0.015", duration: "8s" },
  ],
];
