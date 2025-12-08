import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { MusicManager } from "../music/manager";
import { SearchService } from "../music/search";
import { SearchSessionManager } from "../search/sessionManager";

export interface CommandDependencies {
  client: Client;
  music: MusicManager;
  search: SearchService;
  sessions: SearchSessionManager;
}

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder;
  execute(
    interaction: ChatInputCommandInteraction,
    deps: CommandDependencies
  ): Promise<void>;
}
