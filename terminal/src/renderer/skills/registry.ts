export interface Skill {
  name: string;
  description: string;
  content: string; // full SKILL.md body for prompt expansion
}

let cachedSkills: Skill[] | null = null;

/** Load skills from the main process (reads ~/.claude/skills/) */
export async function loadSkills(): Promise<Skill[]> {
  if (cachedSkills) return cachedSkills;
  try {
    cachedSkills = await window.volley.agent.listSkills();
  } catch {
    cachedSkills = [];
  }
  return cachedSkills;
}

/** Invalidate the cache so skills are re-read on next load */
export function invalidateSkillCache(): void {
  cachedSkills = null;
}

/** Get currently cached skills (synchronous, returns [] if not yet loaded) */
export function getCachedSkills(): Skill[] {
  return cachedSkills ?? [];
}

/**
 * Match a user input against a skill.
 * Returns the matched skill + trailing args, or null.
 */
export function matchSkill(
  input: string,
  skills: Skill[]
): { skill: Skill; args: string } | null {
  if (!input.startsWith("/")) return null;
  const spaceIdx = input.indexOf(" ");
  const command = spaceIdx === -1 ? input.slice(1) : input.slice(1, spaceIdx);
  const args = spaceIdx === -1 ? "" : input.slice(spaceIdx + 1).trim();

  const lower = command.toLowerCase();
  const skill = skills.find((s) => s.name.toLowerCase() === lower);
  if (!skill) return null;
  return { skill, args };
}

/**
 * Filter skills whose name starts with the given query (without the leading /).
 */
export function filterSkills(query: string, skills: Skill[]): Skill[] {
  const lower = query.toLowerCase();
  if (!lower) return skills;
  return skills.filter((s) => s.name.toLowerCase().startsWith(lower));
}

/**
 * Build the expanded prompt for a matched skill.
 * Prepends the skill content and appends user args.
 */
export function expandSkillPrompt(skill: Skill, args: string): string {
  const parts = [`Use the following skill:\n\n${skill.content}`];
  if (args) {
    parts.push(`\nUser request: ${args}`);
  }
  return parts.join("\n");
}
