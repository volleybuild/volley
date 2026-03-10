import { c } from "../ui.js";

export function showHelp(): void {
  console.log(`
${c.mint}${c.bold}▸▸ volley${c.reset} ${c.dim}— parallel Claude Code agents in isolated git worktrees${c.reset}

${c.bold}USAGE${c.reset}
  volley <command> [args]       ${c.dim}(or: vo <command>)${c.reset}

${c.bold}COMMANDS${c.reset}
  ${c.mint}open${c.reset}                  Launch the Volley terminal app (default command)
  ${c.mint}init${c.reset}                  Set up .volley.json with guided config
  ${c.mint}start${c.reset} <task>          Create a worktree + branch, launch Claude Code
  ${c.mint}list${c.reset}                  Show all sessions
  ${c.mint}status${c.reset} [id]           Detailed status of a session (or overview)
  ${c.mint}diff${c.reset} <id>             Show uncommitted changes in a session
  ${c.mint}commit${c.reset} <id> [-m ".."] Commit changes in a session
  ${c.mint}push${c.reset} <id>             Push session branch to remote
  ${c.mint}pr${c.reset} <id> [--title ..]  Create a pull request (or open browser)
  ${c.mint}merge${c.reset} <id>            Merge default branch into session
  ${c.mint}land${c.reset} <id>             Merge session branch into base branch and clean up
  ${c.mint}complete${c.reset} <id>         Guided commit → push → PR → remove flow
  ${c.mint}remove${c.reset} <id> [-f]      Remove a session, clean up worktree + branch
  ${c.mint}clean${c.reset}                 Remove all idle sessions

${c.bold}EXAMPLES${c.reset}
  ${c.dim}# Set up volley${c.reset}
  volley init

  ${c.dim}# Kick off two parallel tasks${c.reset}
  volley start "add dark mode toggle"
  volley start "fix auth redirect bug"

  ${c.dim}# Check what's happening${c.reset}
  volley list

  ${c.dim}# See the diff from a session${c.reset}
  volley diff add-dark-mode-toggle

  ${c.dim}# Done with a session — clean up${c.reset}
  volley remove add-dark-mode-toggle

${c.bold}HOW IT WORKS${c.reset}
  ${c.dim}Each session gets a git worktree (isolated working copy) on a new
  branch, then Claude Code is launched inside it. Switch branches in
  VS Code to review changes. Merge when you're happy.${c.reset}
`);
}
