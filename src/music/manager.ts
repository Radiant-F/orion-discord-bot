import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  demuxProbe,
  StreamType,
} from "@discordjs/voice";
import { Guild, VoiceBasedChannel } from "discord.js";
import { Readable, PassThrough } from "stream";
import { spawn } from "child_process";
import play from "play-dl";
import ytdl from "@distube/ytdl-core";
import { Innertube, UniversalCache } from "youtubei.js";
import { Track } from "./types";
import youtubeDlExec from "youtube-dl-exec";

// Get the yt-dlp binary path
const ytDlpPath =
  (youtubeDlExec as any).constants?.YOUTUBE_DL_PATH ||
  require("youtube-dl-exec").constants.YOUTUBE_DL_PATH;

// Idle timeout before disconnecting (3 minutes)
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;

class GuildQueue {
  private guild: Guild;
  private connection?: VoiceConnection;
  private player: AudioPlayer;
  private queue: Track[] = [];
  private current?: Track;
  private youtubeClient?: Promise<Innertube>;
  private idleTimeout?: NodeJS.Timeout;
  private onDestroy?: () => void;

  constructor(guild: Guild, onDestroy?: () => void) {
    this.guild = guild;
    this.onDestroy = onDestroy;
    this.player = createAudioPlayer();
    this.player.on(AudioPlayerStatus.Idle, () => {
      this.playNext();
    });
    this.player.on("error", (err) => {
      console.error(`Audio player error in guild ${guild.id}:`, err);
      this.playNext();
    });
  }

  async join(channel: VoiceBasedChannel): Promise<void> {
    if (
      this.connection &&
      this.connection.joinConfig.channelId === channel.id
    ) {
      return;
    }

    this.connection = joinVoiceChannel({
      guildId: channel.guild.id,
      channelId: channel.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    this.connection.subscribe(this.player);
  }

  enqueue(track: Track): void {
    // Clear idle timeout since we're adding a track
    this.clearIdleTimeout();
    this.queue.push(track);
    if (!this.current) {
      this.playNext();
    }
  }

  getQueue(): { current?: Track; upcoming: Track[] } {
    return { current: this.current, upcoming: [...this.queue] };
  }

  pause(): boolean {
    return this.player.pause(true);
  }

  resume(): boolean {
    return this.player.unpause();
  }

  skip(): void {
    this.player.stop(true);
  }

  stop(): void {
    this.queue = [];
    this.current = undefined;
    this.player.stop(true);
  }

  disconnect(): void {
    this.clearIdleTimeout();
    this.queue = [];
    this.current = undefined;
    this.player.stop(true);
    if (this.connection) {
      this.connection.destroy();
      this.connection = undefined;
    }
    this.onDestroy?.();
    console.debug(`Disconnected from voice in guild ${this.guild.id}`);
  }

  private startIdleTimeout(): void {
    this.clearIdleTimeout();
    this.idleTimeout = setTimeout(() => {
      console.debug(
        `Idle timeout reached for guild ${this.guild.id}, disconnecting...`
      );
      this.disconnect();
    }, IDLE_TIMEOUT_MS);
  }

  private clearIdleTimeout(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = undefined;
    }
  }

  private async playNext(): Promise<void> {
    const next = this.queue.shift();
    if (!next) {
      this.current = undefined;
      // Start idle timeout when nothing is playing
      this.startIdleTimeout();
      return;
    }
    this.current = next;
    const url = next.playbackUrl ?? next.url;
    if (!url) {
      console.error("No playable URL for track", next);
      this.playNext();
      return;
    }

    const validatedUrl = await this.ensureYouTubeUrl(url, next);
    if (!validatedUrl) {
      this.playNext();
      return;
    }

    console.debug("Starting playback for", {
      url: validatedUrl,
      track: next.title,
    });

    // Try yt-dlp first (most reliable, actively maintained)
    const ytdlpResource = await this.tryYtDlp(validatedUrl);
    if (ytdlpResource) {
      console.debug("Playing via yt-dlp");
      this.player.play(ytdlpResource);
      return;
    }

    // Fallback to play-dl
    console.debug("Attempting play-dl stream");
    try {
      const streamInfo = await play.stream(validatedUrl);
      const resource: AudioResource = createAudioResource(streamInfo.stream, {
        inputType: streamInfo.type,
      });
      this.player.play(resource);
      console.debug("Playing via play-dl");
      return;
    } catch (err) {
      console.warn("play-dl stream failed", err);
    }

    // Fallback to ytdl-core
    try {
      const ytStream = ytdl(validatedUrl, {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25,
      });
      const { stream, type } = await demuxProbe(ytStream);
      const resource = createAudioResource(stream, { inputType: type });
      this.player.play(resource);
      console.debug("Playing via ytdl-core");
      return;
    } catch (err) {
      console.warn("ytdl-core play failed", err);
    }

    // Fallback to youtubei.js
    const youtubeiResource = await this.tryYoutubei(validatedUrl);
    if (youtubeiResource) {
      console.debug("Playing via youtubei.js");
      this.player.play(youtubeiResource);
      return;
    }

    console.error("All playback fallbacks failed", next);
    this.playNext();
  }

  private async ensureYouTubeUrl(
    url: string,
    track: Track
  ): Promise<string | null> {
    // If already a valid YouTube URL, return as-is
    const validation = await play.validate(url);
    if (validation === "yt_video") return url;

    // Try to re-search by title to recover a playable URL
    const query = track.searchQuery ?? track.title;
    try {
      const results = await play.search(query, {
        limit: 1,
        source: { youtube: "video" },
      });
      const first = results[0];
      if (first?.url && (await play.validate(first.url)) === "yt_video") {
        return first.url;
      }
    } catch (err) {
      console.error("Failed to recover YouTube URL via search", err);
    }

    console.error("Unable to obtain valid YouTube URL", { url, track });
    return null;
  }

  private async getYoutubeClient(): Promise<Innertube> {
    if (!this.youtubeClient) {
      this.youtubeClient = Innertube.create({
        cache: new UniversalCache(false),
      });
    }
    return this.youtubeClient;
  }

  private extractVideoId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) {
        return u.pathname.replace("/", "");
      }
      const v = u.searchParams.get("v");
      if (v) return v;
      return null;
    } catch {
      return null;
    }
  }

  private async tryYoutubei(url: string): Promise<AudioResource | null> {
    const videoId = this.extractVideoId(url);
    if (!videoId) return null;
    try {
      const yt = await this.getYoutubeClient();
      const audioStream = (await yt.download(videoId, {
        type: "audio",
        quality: "best",
      })) as unknown as Readable;
      const { stream: probed, type } = await demuxProbe(audioStream);
      return createAudioResource(probed, { inputType: type });
    } catch (err) {
      console.error("youtubei download failed", err);
      return null;
    }
  }

  private async tryYtDlp(url: string): Promise<AudioResource | null> {
    try {
      console.debug("Attempting yt-dlp stream", { url, ytDlpPath });

      const proc = spawn(
        ytDlpPath,
        [
          url,
          "-o",
          "-",
          "-f",
          "bestaudio[ext=webm][acodec=opus]/bestaudio/best",
          "--no-playlist",
          "--quiet",
          "--no-warnings",
        ],
        {
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      // Log any stderr for debugging
      proc.stderr?.on("data", (data: Buffer) => {
        console.debug("yt-dlp stderr:", data.toString());
      });

      const stdout = proc.stdout;
      if (!stdout) {
        proc.kill();
        return null;
      }

      // Wait a bit to ensure the stream has started
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { stream, type } = await demuxProbe(stdout);
      console.debug("yt-dlp stream created successfully", { type });
      return createAudioResource(stream, { inputType: type });
    } catch (err) {
      console.error("yt-dlp fallback failed", err);
      return null;
    }
  }
}

export class MusicManager {
  private queues = new Map<string, GuildQueue>();

  getQueue(guild: Guild): GuildQueue {
    const existing = this.queues.get(guild.id);
    if (existing) return existing;
    const queue = new GuildQueue(guild, () => {
      // Remove from map when queue disconnects
      this.queues.delete(guild.id);
    });
    this.queues.set(guild.id, queue);
    return queue;
  }

  async play(channel: VoiceBasedChannel, track: Track): Promise<Track> {
    const queue = this.getQueue(channel.guild);
    await queue.join(channel);
    queue.enqueue(track);
    return track;
  }

  pause(guild: Guild): boolean {
    return this.getQueue(guild).pause();
  }

  resume(guild: Guild): boolean {
    return this.getQueue(guild).resume();
  }

  skip(guild: Guild): void {
    this.getQueue(guild).skip();
  }

  stop(guild: Guild): void {
    this.getQueue(guild).stop();
  }

  getState(guild: Guild): { current?: Track; upcoming: Track[] } {
    return this.getQueue(guild).getQueue();
  }
}
