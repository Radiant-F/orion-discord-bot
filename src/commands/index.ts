import { Command } from "../types/command";
import { pauseCommand } from "./pause";
import { playCommand } from "./play";
import { queueCommand } from "./queue";
import { resumeCommand } from "./resume";
import { searchCommand } from "./search";
import { skipCommand } from "./skip";
import { stopCommand } from "./stop";
import { clearCommand } from "./clear";

export const commands: Command[] = [
  playCommand,
  searchCommand,
  pauseCommand,
  resumeCommand,
  skipCommand,
  stopCommand,
  queueCommand,
  clearCommand,
];
