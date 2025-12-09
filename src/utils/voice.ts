import {
  ChatInputCommandInteraction,
  GuildMember,
  VoiceBasedChannel,
} from "discord.js";

export function ensureUserVoiceChannel(
  interaction: ChatInputCommandInteraction
): VoiceBasedChannel | null {
  if (!interaction.guild) {
    void interaction.reply({
      content: "This command is for servers only.",
      ephemeral: true,
    });
    return null;
  }

  const member = interaction.member as GuildMember | null;
  const voiceChannel = member?.voice?.channel ?? null;
  if (!voiceChannel) {
    void interaction.reply({
      content: "You need to be in a voice channel to use this command.",
      ephemeral: true,
    });
    return null;
  }

  const botChannelId = interaction.guild.members.me?.voice?.channelId;
  if (botChannelId && botChannelId !== voiceChannel.id) {
    void interaction.reply({
      content:
        "You must be in the same voice channel as the bot to use this command.",
      ephemeral: true,
    });
    return null;
  }

  return voiceChannel;
}
