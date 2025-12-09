import http from "http";
import {
  ButtonInteraction,
  Client,
  GatewayIntentBits,
  GuildMember,
  Interaction,
  StringSelectMenuInteraction,
} from "discord.js";
import { env, requireEnv } from "./config/env";
import { commands } from "./commands";
import { buildSearchPayload } from "./commands/search";
import { MusicManager } from "./music/manager";
import { SearchService } from "./music/search";
import { SearchSessionManager } from "./search/sessionManager";
import { CommandDependencies } from "./types/command";
import { Track } from "./music/types";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const music = new MusicManager();
const searchService = new SearchService();
const sessions = new SearchSessionManager();
const commandMap = new Map(commands.map((cmd) => [cmd.data.name, cmd]));

function ensureGuildMember(interaction: Interaction): GuildMember {
  if (
    !interaction.guild ||
    !interaction.member ||
    !(interaction.member instanceof GuildMember)
  ) {
    throw new Error("This interaction must be used inside a server.");
  }
  return interaction.member as GuildMember;
}

async function handleCommand(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;
  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  const deps: CommandDependencies = {
    client,
    music,
    search: searchService,
    sessions,
  };

  try {
    await command.execute(interaction, deps);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}

async function handleSearchNavigation(interaction: ButtonInteraction) {
  const [action, sessionId] = interaction.customId.split(":");
  if (!sessionId) return;
  const session = sessions.get(sessionId);
  if (!session) {
    await interaction.reply({
      content: "Search session expired.",
      ephemeral: true,
    });
    return;
  }
  if (interaction.user.id !== session.userId) {
    await interaction.reply({
      content: "Only the user who started the search can control it.",
      ephemeral: true,
    });
    return;
  }

  const totalPages = Math.max(1, Math.ceil(session.results.length / 10));
  if (action === "search-prev" && session.page > 0) {
    session.page -= 1;
  }
  if (action === "search-next" && session.page < totalPages - 1) {
    session.page += 1;
  }
  const payload = buildSearchPayload(session);
  await interaction.update(payload);
}

async function handleSearchSelect(interaction: StringSelectMenuInteraction) {
  const [, sessionId] = interaction.customId.split(":");
  const session = sessions.get(sessionId);
  if (!session) {
    await interaction.reply({
      content: "Search session expired.",
      ephemeral: true,
    });
    return;
  }
  if (interaction.user.id !== session.userId) {
    await interaction.reply({
      content: "Only the user who started the search can pick songs.",
      ephemeral: true,
    });
    return;
  }

  const selectedIndex = Number(interaction.values[0]);
  const track: Track | undefined = session.results[selectedIndex];
  if (!track) {
    await interaction.reply({ content: "Invalid selection.", ephemeral: true });
    return;
  }

  const member = ensureGuildMember(interaction);
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    await interaction.reply({
      content: "Join a voice channel first.",
      ephemeral: true,
    });
    return;
  }

  try {
    const playable = await searchService.resolvePlayable({
      ...track,
      requestedBy: interaction.user.tag,
    });
    await music.play(voiceChannel, playable);
    await interaction.reply({
      content: `Queued **${playable.title}**`,
      ephemeral: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to queue that track.";
    await interaction.reply({ content: message, ephemeral: true });
  }
}

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleCommand(interaction);
    return;
  }
  if (interaction.isButton() && interaction.customId.startsWith("search-")) {
    await handleSearchNavigation(interaction);
    return;
  }
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("search-select")
  ) {
    await handleSearchSelect(interaction as StringSelectMenuInteraction);
    return;
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

// Minimal HTTP server for Render health checks (free tier requires Web Service)
const PORT = process.env.PORT || 3000;
http
  .createServer((_, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  })
  .listen(PORT, () => {
    console.log(`Health-check server listening on port ${PORT}`);
  });

const token = requireEnv(env.token, "DISCORD_TOKEN");
client.login(token);
