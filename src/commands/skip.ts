import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, CommandDependencies } from "../types/command";
import { ensureUserVoiceChannel } from "../utils/voice";

const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skip the current track");

const execute = async (
  interaction: ChatInputCommandInteraction,
  { music }: CommandDependencies
) => {
  if (!ensureUserVoiceChannel(interaction) || !interaction.guild) return;
  music.skip(interaction.guild);
  await interaction.reply("Skipped to the next track.");
};

export const skipCommand: Command = { data, execute };
