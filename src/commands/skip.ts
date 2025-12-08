import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, CommandDependencies } from "../types/command";

const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skip the current track");

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
  music.skip(interaction.guild);
  await interaction.reply("Skipped to the next track.");
};

export const skipCommand: Command = { data, execute };
