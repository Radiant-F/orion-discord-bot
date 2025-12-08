import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { Command, CommandDependencies } from "../types/command";
import { TrackSource } from "../music/types";

const data = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Play a song from YouTube or Spotify")
  .addStringOption((option) =>
    option.setName("query").setDescription("Song name or URL").setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("source")
      .setDescription("Force a specific source")
      .addChoices(
        { name: "Auto", value: "auto" },
        { name: "YouTube", value: "youtube" },
        { name: "Spotify", value: "spotify" }
      )
  );

async function ensureVoice(
  interaction: ChatInputCommandInteraction
): Promise<GuildMember> {
  const member = interaction.member;
  if (!member || !(member as GuildMember).voice?.channel) {
    throw new Error("You need to be in a voice channel to use this command.");
  }
  return member as GuildMember;
}

const execute = async (
  interaction: ChatInputCommandInteraction,
  { music, search }: CommandDependencies
) => {
  const member = await ensureVoice(interaction);
  const voiceChannel = member.voice.channel;
  const query = interaction.options.getString("query", true);
  const source =
    (interaction.options.getString("source") as TrackSource | "auto" | null) ??
    "auto";

  await interaction.deferReply();

  const results = await search.search(query, source);
  if (!results.length) {
    await interaction.editReply("No results found for that query.");
    return;
  }

  const first = results[0];
  const playable = await search.resolvePlayable(first);
  playable.requestedBy = interaction.user.tag;
  await music.play(voiceChannel!, playable);

  await interaction.editReply(
    `Queued **${playable.title}** from ${playable.source.toUpperCase()}`
  );
};

export const playCommand: Command = {
  data,
  execute,
};
