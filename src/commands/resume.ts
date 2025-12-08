import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, CommandDependencies } from "../types/command";

const data = new SlashCommandBuilder()
  .setName("resume")
  .setDescription("Resume the paused track");

const execute = async (
  interaction: ChatInputCommandInteraction,
  { music }: CommandDependencies
) => {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This command is for servers only.",
      ephemeral: true,
    });
    return;
  }
  const resumed = music.resume(interaction.guild);
  await interaction.reply(resumed ? "Resumed playback." : "Nothing to resume.");
};

export const resumeCommand: Command = { data, execute };
