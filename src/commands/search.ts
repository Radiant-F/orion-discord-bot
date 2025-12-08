import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { Command, CommandDependencies } from "../types/command";
import { formatDuration } from "../utils/format";
import { SearchSession } from "../search/sessionManager";

const RESULTS_PER_PAGE = 10;

const data = new SlashCommandBuilder()
  .setName("search")
  .setDescription("Search tracks on YouTube and Spotify")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("Song name or artist")
      .setRequired(true)
  );

function paginate(session: SearchSession) {
  const start = session.page * RESULTS_PER_PAGE;
  const slice = session.results.slice(start, start + RESULTS_PER_PAGE);
  return {
    start,
    slice,
    totalPages: Math.max(
      1,
      Math.ceil(session.results.length / RESULTS_PER_PAGE)
    ),
  };
}

function buildPayload(session: SearchSession) {
  const { start, slice, totalPages } = paginate(session);
  const embed = new EmbedBuilder()
    .setTitle(`Search results (${session.results.length} found)`)
    .setFooter({ text: `Page ${session.page + 1} / ${totalPages}` });

  if (!slice.length) {
    embed.setDescription("No results to show.");
  } else {
    embed.setDescription(
      slice
        .map((track, idx) => {
          const index = start + idx + 1;
          return `${index}. [${track.title}](${
            track.url
          }) • ${track.source.toUpperCase()} • ${formatDuration(
            track.duration
          )}`;
        })
        .join("\n")
    );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`search-select:${session.id}`)
    .setPlaceholder("Pick a track to queue")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      slice.map((track, idx) => ({
        label: track.title.slice(0, 100),
        description: `${track.source.toUpperCase()} • ${formatDuration(
          track.duration
        )}`.slice(0, 100),
        value: `${start + idx}`,
      }))
    );

  const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`search-prev:${session.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Previous")
      .setDisabled(session.page === 0),
    new ButtonBuilder()
      .setCustomId(`search-next:${session.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Next")
      .setDisabled(session.page >= totalPages - 1)
  );

  const selectorRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  return {
    embeds: [embed],
    components: [controls, selectorRow],
    ephemeral: true,
  };
}

const execute = async (
  interaction: ChatInputCommandInteraction,
  { search, sessions }: CommandDependencies
) => {
  const query = interaction.options.getString("query", true);
  await interaction.deferReply({ ephemeral: true });

  const results = await search.search(query, "auto", 30);
  if (!results.length) {
    await interaction.editReply("No results found.");
    return;
  }

  const session = sessions.create(results, interaction.user.id);
  const payload = buildPayload(session);
  await interaction.editReply(payload);
};

export const searchCommand: Command = { data, execute };
export { buildPayload as buildSearchPayload };
