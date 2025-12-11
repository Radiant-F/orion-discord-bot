# Orion Discord Music Bot - AI Developer Guide

## Architecture Overview

This is a TypeScript Discord music bot that plays audio from YouTube and Spotify using Discord.js v14 and @discordjs/voice. The bot uses slash commands and provides an interactive search UI with pagination.

### Core Components

- **src/index.ts**: Main entry point. Initializes Discord client with voice intents, sets up shared services (MusicManager, SearchService, SearchSessionManager), and routes interactions to commands or UI handlers.
- **src/music/manager.ts**: Manages per-guild audio playback queues. Each GuildQueue owns a VoiceConnection and AudioPlayer. Uses fallback chain: yt-dlp → youtubei.js → ytdl-core → play-dl to handle YouTube playback restrictions.
- **src/music/search.ts**: SearchService handles URL detection (YouTube/Spotify) and search. Spotify tracks are metadata-only; they're resolved to YouTube playback URLs via `resolvePlayable()`.
- **src/commands/**: Each command exports a `Command` object with Discord.js SlashCommandBuilder data and an async execute function.
- **src/search/sessionManager.ts**: In-memory storage for paginated search results (10-minute TTL). Each session has a UUID and tracks user-specific pagination state.

### Data Flow

1. User invokes `/play` or `/search` → command handler called with CommandDependencies
2. SearchService checks if query is URL (Spotify/YouTube) or keyword search
3. For Spotify: fetch metadata, convert to Track, resolve playback URL from YouTube
4. MusicManager.play() joins voice channel, creates/gets GuildQueue, enqueues Track
5. GuildQueue.playNext() tries yt-dlp first (most reliable), then falls back to other libraries if stream fails
6. Search results use Discord components (buttons + select menu) for pagination and track selection

## Key Patterns & Conventions

### Command Structure

All commands follow this pattern:

```typescript
const data = new SlashCommandBuilder()
  .setName("commandname")
  .setDescription("...");

const execute = async (
  interaction: ChatInputCommandInteraction,
  { music, search, sessions }: CommandDependencies
) => {
  // Always check voice channel first
  const voiceChannel = ensureUserVoiceChannel(interaction);
  if (!voiceChannel) return;

  await interaction.deferReply(); // For slow operations
  // ... command logic
};

export const myCommand: Command = { data, execute };
```

Register new commands in [src/commands/index.ts](src/commands/index.ts) by adding to the exported array.

### YouTube Cookie Handling (Critical for Render/Production)

YouTube often blocks automated playback with "Sign in to confirm you're not a bot". The codebase supports three cookie strategies (set in .env):

1. **YOUTUBE_COOKIE**: Raw cookie header string (passed to play-dl via `play.setToken()`)
2. **YOUTUBE_COOKIE_FILE**: Path to Netscape-format cookies file (for yt-dlp)
3. **YOUTUBE_COOKIES**: Inline Netscape cookies text (written to temp file at startup)

This is configured in [src/music/manager.ts](src/music/manager.ts#L26-L53). When adding new playback methods, ensure cookies are passed to the underlying library.

### Interaction Routing

The bot handles three interaction types in [src/index.ts](src/index.ts#L146-L167):

- **ChatInputCommand**: Slash commands → dispatch to command map
- **Button**: Navigation (search-prev/search-next) → update SearchSession page
- **StringSelectMenu**: Track selection → queue selected track from session

Search interactions are prefixed with `search-prev:`, `search-next:`, `search-select:` followed by session UUID.

### Dependency Injection

Commands receive a `CommandDependencies` object with:

- `client`: Discord.js Client instance
- `music`: Shared MusicManager (one queue per guild)
- `search`: Shared SearchService (Spotify API client, YouTube search)
- `sessions`: SearchSessionManager (stores paginated search results)

This makes commands testable—see [tests/commands.test.ts](tests/commands.test.ts) for mocking patterns.

## Development Workflows

### Local Development

```bash
npm run dev              # Watch mode with ts-node-dev
npm run deploy:commands  # Deploy slash commands (guild-scoped if DISCORD_GUILD_ID set)
```

### Building & Production

```bash
npm run build  # Compile TypeScript to dist/
npm start      # Run compiled JS from dist/index.js
```

### Testing

```bash
npm test  # Run Jest with ts-jest
```

Mock pattern for voice dependencies: Mock `@discordjs/voice` module entirely since it requires native bindings. See [tests/musicManager.test.ts](tests/musicManager.test.ts#L4-L43) for reference.

### Environment Variables

Required:

- `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`: Discord bot credentials
- `DISCORD_GUILD_ID`: Optional. Use for faster guild-scoped command deployment during dev.

Optional but recommended:

- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`: Enable Spotify search and URL handling
- `YOUTUBE_COOKIE`/`YOUTUBE_COOKIE_FILE`/`YOUTUBE_COOKIES`: Bypass YouTube bot detection (critical on Render)

## Important Design Decisions

### Why Multiple YouTube Libraries?

YouTube playback is fragile due to anti-bot measures. The fallback chain in [GuildQueue.playNext()](src/music/manager.ts#L173-L204):

1. **yt-dlp**: Most reliable, actively maintained, but spawns subprocess
2. **youtubei.js**: Pure JS, no external deps, good fallback
3. **ytdl-core**: Fast, npm-native, but often blocked
4. **play-dl**: Good for search, less reliable for streaming

Always try yt-dlp first; fallback to others if stream fails.

### Why Separate Track and Playable?

A `Track` from Spotify has metadata (title, url, source) but no playback URL. The `resolvePlayable()` method (in SearchService) converts Spotify tracks to YouTube playback URLs by searching YouTube for the track title. This separation keeps the Track type simple and allows lazy resolution.

### Idle Disconnect Timeout

GuildQueue disconnects after 3 minutes of inactivity (no tracks in queue) to avoid lingering voice connections. See [src/music/manager.ts](src/music/manager.ts#L56) `IDLE_TIMEOUT_MS`. Reset on enqueue, started on playback end.

## Adding Features

**New Command**: Create `src/commands/mycommand.ts`, export `Command` object, add to [src/commands/index.ts](src/commands/index.ts), run `npm run deploy:commands`.

**New Search Source**: Add URL regex and handler to [SearchService.search()](src/music/search.ts#L31-L140). If source needs playback resolution (like Spotify), implement in `resolvePlayable()`.

**Playlist Support**: See [src/commands/play.ts](src/commands/play.ts#L38-L67) for Spotify playlist and [play.ts](src/commands/play.ts#L70-L112) for YouTube playlist handling. Both enqueue up to 20 tracks.

## Common Pitfalls

- **Forgetting `deferReply()`**: Search/play operations can take >3s. Always defer for slow operations.
- **Not checking voice channel**: Use `ensureUserVoiceChannel()` helper from [src/utils/voice.ts](src/utils/voice.ts) before music operations.
- **Testing with real Discord API**: Mock `@discordjs/voice` entirely; native bindings fail in Jest.
- **Ignoring cookie expiration**: YouTube cookies expire. Rotate `YOUTUBE_COOKIE` if playback suddenly fails in production.
