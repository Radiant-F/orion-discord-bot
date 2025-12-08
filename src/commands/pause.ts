import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, CommandDependencies } from "../types/command";

const data = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pause the current track");

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
  const paused = music.pause(interaction.guild);
  await interaction.reply(paused ? "Paused playback." : "Nothing is playing.");
};

export const pauseCommand: Command = { data, execute };
