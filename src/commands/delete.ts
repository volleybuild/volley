import { glyph, c } from "../ui.js";
import { deleteSession } from "../session.js";

export function cmdDelete(args: string[]): void {
  const id = args[0];
  if (!id) {
    console.error(`${glyph.error} Provide a session ID to delete.`);
    process.exit(1);
  }

  try {
    deleteSession(id);
    console.log(`\n  ${glyph.filled} Deleted session: ${c.mint}${id}${c.reset}\n`);
  } catch (e: any) {
    console.error(`${glyph.error} ${e.message}`);
    process.exit(1);
  }
}
