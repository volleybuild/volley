#!/usr/bin/env node

import { glyph } from "./ui.js";
import { cmdInit } from "./commands/init.js";
import { cmdStart } from "./commands/start.js";
import { cmdList } from "./commands/list.js";
import { cmdStatus } from "./commands/status.js";
import { cmdDiff } from "./commands/diff.js";
import { cmdCommit } from "./commands/commit.js";
import { cmdRemove } from "./commands/remove.js";
import { cmdClean } from "./commands/clean.js";
import { cmdPush } from "./commands/push.js";
import { cmdPr } from "./commands/pr.js";
import { cmdMerge } from "./commands/merge.js";
import { cmdComplete } from "./commands/complete.js";
import { cmdLand } from "./commands/land.js";
import { showHelp } from "./commands/help.js";
import { cmdOpen } from "./commands/open.js";
import { cmdTodo } from "./commands/todo.js";
import { cmdDelete } from "./commands/delete.js";

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "init":
      await cmdInit();
      break;
    case "start":
    case "s":
      await cmdStart(args);
      break;
    case "list":
    case "ls":
      cmdList();
      break;
    case "status":
    case "st":
      cmdStatus(args);
      break;
    case "diff":
    case "d":
      cmdDiff(args);
      break;
    case "commit":
    case "ci":
      await cmdCommit(args);
      break;
    case "push":
      cmdPush(args);
      break;
    case "pr":
      await cmdPr(args);
      break;
    case "merge":
    case "mg":
      cmdMerge(args);
      break;
    case "complete":
    case "done":
      await cmdComplete(args);
      break;
    case "land":
    case "ld":
      await cmdLand(args);
      break;
    case "remove":
    case "rm":
      cmdRemove(args);
      break;
    case "todo":
    case "t":
      await cmdTodo(args);
      break;
    case "delete":
    case "del":
      cmdDelete(args);
      break;
    case "clean":
      cmdClean();
      break;
    case "open":
    case "o":
      await cmdOpen();
      break;
    case "help":
    case "--help":
    case "-h":
      showHelp();
      break;
    case undefined:
      await cmdOpen();
      break;
    default:
      console.error(`${glyph.error} Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
