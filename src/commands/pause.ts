import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, CommandDependencies } from "../types/command";
import { ensureUserVoiceChannel } from "../utils/voice";

const data = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pause the current track");

const execute = async (
  interaction: ChatInputCommandInteraction,
  { music }: CommandDependencies
) => {
  if (!ensureUserVoiceChannel(interaction) || !interaction.guild) return;
  const paused = music.pause(interaction.guild);
  await interaction.reply(paused ? "Paused playback." : "Nothing is playing.");
};

export const pauseCommand: Command = { data, execute };
