import dotenv from "dotenv";

dotenv.config();

export const env = {
  token: process.env.DISCORD_TOKEN ?? "",
  clientId: process.env.DISCORD_CLIENT_ID ?? "",
  guildId: process.env.DISCORD_GUILD_ID,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}
