import dotenv from "dotenv";

dotenv.config();

export const env = {
  token: process.env.DISCORD_TOKEN ?? "",
  clientId: process.env.DISCORD_CLIENT_ID ?? "",
  guildId: process.env.DISCORD_GUILD_ID,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  // Optional: YouTube cookie header to bypass stricter playback checks
  youtubeCookie: process.env.YOUTUBE_COOKIE,
  // Optional: Path to a yt-dlp compatible cookies file (Netscape format)
  youtubeCookieFile: process.env.YOUTUBE_COOKIE_FILE,
  // Optional: Inline cookies content (Netscape format). If set, we'll write to a temp file and use it.
  youtubeCookiesText: process.env.YOUTUBE_COOKIES,
};

export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}
