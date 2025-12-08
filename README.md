# Orion Discord Music Bot

TypeScript Discord music bot with YouTube + Spotify search, queue, and paginated search UI.

## Setup

1. Copy `.env.example` to `.env` and fill in your secrets (token, client ID, optional guild ID for faster command deploys, Spotify client credentials). Keep the token private—do not commit it.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Deploy slash commands (guild-scoped if `DISCORD_GUILD_ID` is set, otherwise global):
   ```bash
   npm run deploy:commands
   ```

## Development

- Run in watch mode:
  ```bash
  npm run dev
  ```
- Build and start:
  ```bash
  npm run build
  npm start
  ```

## Features

- `/play` plays from YouTube/Spotify (auto-detect), joins your voice channel, queues when already playing.
- `/search` returns combined YouTube + Spotify results with next/previous buttons and a dropdown to queue a track (10 items per page).
- `/pause`, `/resume`, `/skip`, `/stop`, `/queue` to control playback and view the queue.

## Notes

- Spotify results are resolved to YouTube for playback. Provide Spotify client credentials for richer search results.
- The bot needs the `Guilds` and `GuildVoiceStates` intents enabled in the Discord developer portal.
