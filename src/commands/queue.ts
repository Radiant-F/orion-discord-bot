import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command, CommandDependencies } from "../types/command";
import { formatDuration } from "../utils/format";

const data = new SlashCommandBuilder()
  .setName("queue")
  .setDescription("Show the current music queue");

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

  const state = music.getState(interaction.guild);
  const embed = new EmbedBuilder().setTitle("Queue");

  if (state.current) {
    embed.addFields({
      name: "Now Playing",
      value: `${state.current.title} (${formatDuration(
        state.current.duration
      )})`,
    });
  }

  if (!state.upcoming.length) {
    embed.setDescription("Queue is empty.");
  } else {
    const description = state.upcoming
      .slice(0, 10)
      .map(
        (track, idx) =>
          `${idx + 1}. ${track.title} (${formatDuration(track.duration)})`
      )
      .join("\n");
    embed.setDescription(description);
    if (state.upcoming.length > 10) {
      embed.setFooter({ text: `+${state.upcoming.length - 10} more` });
    }
  }

  await interaction.reply({ embeds: [embed] });
};

export const queueCommand: Command = { data, execute };
