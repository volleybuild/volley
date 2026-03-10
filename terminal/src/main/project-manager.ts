import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export interface Project {
  id: string;
  name: string;
  path: string;
}

export interface ProjectRegistry {
  projects: Project[];
  activeProjectId: string | null;
}

function getRegistryPath(): string {
  return path.join(os.homedir(), ".volley", "projects.json");
}

export function loadRegistry(): ProjectRegistry {
  const registryPath = getRegistryPath();
  try {
    const raw = fs.readFileSync(registryPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { projects: [], activeProjectId: null };
  }
}

export function saveRegistry(registry: ProjectRegistry): void {
  const registryPath = getRegistryPath();
  const dir = path.dirname(registryPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf-8");
}

function isGitRepo(dirPath: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], {
      cwd: dirPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

function projectId(repoPath: string): string {
  return crypto.createHash("sha256").update(repoPath).digest("hex").slice(0, 12);
}

function detectSetupCommand(repoPath: string): string | null {
  if (fs.existsSync(path.join(repoPath, "bun.lockb"))) return "bun install";
  if (fs.existsSync(path.join(repoPath, "pnpm-lock.yaml"))) return "pnpm install";
  if (fs.existsSync(path.join(repoPath, "yarn.lock"))) return "yarn install";
  if (fs.existsSync(path.join(repoPath, "package-lock.json"))) return "npm install";
  if (fs.existsSync(path.join(repoPath, "package.json"))) return "npm install";
  if (fs.existsSync(path.join(repoPath, "Gemfile"))) return "bundle install";
  if (fs.existsSync(path.join(repoPath, "requirements.txt"))) return "pip install -r requirements.txt";
  if (fs.existsSync(path.join(repoPath, "go.mod"))) return "go mod download";
  return null;
}

function detectSymlinks(repoPath: string): string[] {
  const candidates = [".env", ".env.local", ".env.development", ".env.production", ".env.test"];
  return candidates.filter((f) => fs.existsSync(path.join(repoPath, f)));
}

/** Ensure .volley.json, .volley/ dir, and .gitignore entry exist */
function ensureVolleyInit(repoPath: string): void {
  const configPath = path.join(repoPath, ".volley.json");
  if (!fs.existsSync(configPath)) {
    const config: Record<string, any> = {};
    const setup = detectSetupCommand(repoPath);
    if (setup) config.setup = [setup];
    const symlinks = detectSymlinks(repoPath);
    if (symlinks.length > 0) config.symlinks = symlinks;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  const volleyDir = path.join(repoPath, ".volley");
  if (!fs.existsSync(volleyDir)) {
    fs.mkdirSync(volleyDir, { recursive: true });
  }

  const gitignorePath = path.join(repoPath, ".gitignore");
  const entry = ".volley/";
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    if (!content.includes(entry)) {
      fs.writeFileSync(gitignorePath, content.trimEnd() + "\n" + entry + "\n");
    }
  } else {
    fs.writeFileSync(gitignorePath, entry + "\n");
  }
}

export function addProject(repoPath: string): { project: Project; registry: ProjectRegistry } {
  const resolved = path.resolve(repoPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Path does not exist: ${resolved}`);
  }

  if (!isGitRepo(resolved)) {
    throw new Error(`Not a git repository: ${resolved}`);
  }

  const registry = loadRegistry();

  // Deduplicate by resolved path
  const existing = registry.projects.find((p) => p.path === resolved);
  if (existing) {
    return { project: existing, registry };
  }

  ensureVolleyInit(resolved);

  const project: Project = {
    id: projectId(resolved),
    name: path.basename(resolved),
    path: resolved,
  };

  registry.projects.push(project);
  saveRegistry(registry);

  return { project, registry };
}

export function removeProject(pid: string): ProjectRegistry {
  const registry = loadRegistry();
  registry.projects = registry.projects.filter((p) => p.id !== pid);
  if (registry.activeProjectId === pid) {
    registry.activeProjectId = registry.projects.length > 0 ? registry.projects[0].id : null;
  }
  saveRegistry(registry);
  return registry;
}

export function setActiveProject(pid: string): ProjectRegistry {
  const registry = loadRegistry();
  const project = registry.projects.find((p) => p.id === pid);
  if (!project) throw new Error(`Project not found: ${pid}`);
  registry.activeProjectId = pid;
  saveRegistry(registry);
  return registry;
}

export function migrateCurrentRepo(repoRoot: string | null): void {
  if (!repoRoot) return;
  const registry = loadRegistry();
  if (registry.projects.length > 0) return; // Already has projects

  const resolved = path.resolve(repoRoot);
  ensureVolleyInit(resolved);

  const project: Project = {
    id: projectId(resolved),
    name: path.basename(resolved),
    path: resolved,
  };

  registry.projects.push(project);
  registry.activeProjectId = project.id;
  saveRegistry(registry);
}
