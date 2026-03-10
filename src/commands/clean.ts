import { c, glyph } from "../ui.js";
import { listSessions, removeSession } from "../session.js";

export function cmdClean(): void {
  const sessions = listSessions();
  const idle = sessions.filter((s) => s.status !== "running");

  if (idle.length === 0) {
    console.log(`\n${c.dim}Nothing to clean up.${c.reset}\n`);
    return;
  }

  console.log(
    `\n${glyph.filled} ${c.mint}Cleaning up... ${c.dim}(${idle.length} session${idle.length === 1 ? "" : "s"})${c.reset}\n`,
  );

  for (const s of idle) {
    try {
      removeSession(s.id, false);
      console.log(`  ${glyph.filled} Removed ${s.id}`);
    } catch (e: any) {
      console.log(`  ${glyph.error} ${s.id}: ${e.message}`);
    }
  }
  console.log();
}
