import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, CommandDependencies } from "../types/command";
import { ensureUserVoiceChannel } from "../utils/voice";

const data = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("Clear all tracks in the queue (keeps the current track)");

const execute = async (
  interaction: ChatInputCommandInteraction,
  { music }: CommandDependencies
) => {
  const voiceChannel = ensureUserVoiceChannel(interaction);
  if (!voiceChannel || !interaction.guild) return;

  const removed = music.clear(interaction.guild);
  if (!removed) {
    await interaction.reply("Queue is already empty.");
    return;
  }

  await interaction.reply(
    `Cleared ${removed} track${removed === 1 ? "" : "s"} from the queue.`
  );
};

export const clearCommand: Command = { data, execute };
