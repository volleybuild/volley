export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function escapeOsascript(s: string): string {
  return s.replace(/'/g, "\\'");
}

export function escapeShell(s: string): string {
  return s.replace(/'/g, "'\\''");
}
