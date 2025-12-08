import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, CommandDependencies } from "../types/command";

const data = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Stop playback and clear the queue");

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
  music.stop(interaction.guild);
  await interaction.reply("Stopped playback and cleared the queue.");
};

export const stopCommand: Command = { data, execute };
