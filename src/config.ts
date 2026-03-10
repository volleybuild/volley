import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { VolleyConfig } from "./types.js";

export function loadVolleyConfig(repoRoot: string): VolleyConfig | null {
  const configPath = join(repoRoot, ".volley.json");
  if (!existsSync(configPath)) return null;
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as VolleyConfig;
}
