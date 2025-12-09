import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, CommandDependencies } from "../types/command";
import { ensureUserVoiceChannel } from "../utils/voice";

const data = new SlashCommandBuilder()
  .setName("resume")
  .setDescription("Resume the paused track");

const execute = async (
  interaction: ChatInputCommandInteraction,
  { music }: CommandDependencies
) => {
  if (!ensureUserVoiceChannel(interaction) || !interaction.guild) return;
  const resumed = music.resume(interaction.guild);
  await interaction.reply(resumed ? "Resumed playback." : "Nothing to resume.");
};

export const resumeCommand: Command = { data, execute };
