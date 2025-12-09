import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, CommandDependencies } from "../types/command";
import { TrackSource } from "../music/types";
import { ensureUserVoiceChannel } from "../utils/voice";
import play from "play-dl";

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

const execute = async (
  interaction: ChatInputCommandInteraction,
  { music, search }: CommandDependencies
) => {
  const voiceChannel = ensureUserVoiceChannel(interaction);
  if (!voiceChannel) return;
  const query = interaction.options.getString("query", true);
  const source =
    (interaction.options.getString("source") as TrackSource | "auto" | null) ??
    "auto";

  await interaction.deferReply();

  // Spotify playlist handling (queue up to 20 tracks)
  const spotifyPlaylist = await search.getSpotifyPlaylistFromUrl(query, 20);
  if (spotifyPlaylist) {
    const { name, tracks } = spotifyPlaylist;
    if (!tracks.length) {
      await interaction.editReply("Playlist is empty or could not be read.");
      return;
    }

    let queued = 0;
    for (const track of tracks) {
      try {
        const playable = await search.resolvePlayable(track);
        playable.requestedBy = interaction.user.tag;
        await music.play(voiceChannel, playable);
        queued += 1;
      } catch (err) {
        console.error("Failed to queue playlist track", track, err);
      }
    }

    if (!queued) {
      await interaction.editReply(
        "Could not queue any tracks from that playlist."
      );
      return;
    }

    await interaction.editReply(
      `Queued ${queued} track${
        queued === 1 ? "" : "s"
      } from Spotify playlist **${name ?? "Spotify playlist"}**`
    );
    return;
  }

  // If the query is a YouTube playlist URL, enqueue multiple tracks (up to 20)
  const validation = await play.validate(query);
  if (validation === "yt_playlist") {
    try {
      const playlist = await play.playlist_info(query, { incomplete: false });
      const videos = (playlist as unknown as { videos?: any[] })?.videos ?? [];
      const tracks = videos.slice(0, 20).map((video: any) => ({
        title: video.title ?? "Unknown title",
        url: video.url,
        source: "youtube" as const,
        duration: video.durationInSec,
        playbackUrl: video.url,
        requestedBy: interaction.user.tag,
      }));

      if (!tracks.length) {
        await interaction.editReply("Playlist is empty or could not be read.");
        return;
      }

      for (const track of tracks) {
        await music.play(voiceChannel, track);
      }

      await interaction.editReply(
        `Queued ${tracks.length} tracks from playlist **${
          playlist?.title ?? "YouTube playlist"
        }**`
      );
      return;
    } catch (err) {
      console.error("Failed to process playlist", err);
      await interaction.editReply(
        "Could not load that playlist. Please try another link."
      );
      return;
    }
  }

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
