import { pauseCommand } from "../src/commands/pause";
import { playCommand } from "../src/commands/play";
import { Track } from "../src/music/types";
import { ensureUserVoiceChannel } from "../src/utils/voice";

jest.mock("../src/utils/voice", () => ({
  ensureUserVoiceChannel: jest.fn(),
}));

jest.mock("play-dl", () => ({
  validate: jest.fn(),
  playlist_info: jest.fn(),
  search: jest.fn(),
}));

describe("pauseCommand", () => {
  const voiceChannel = { id: "voice-1" } as any;
  const guild = { id: "guild-1" } as any;

  const makeInteraction = () => {
    return {
      guild,
      reply: jest.fn().mockResolvedValue(undefined),
    } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ensureUserVoiceChannel as jest.Mock).mockReturnValue(voiceChannel);
  });

  it("replies when paused successfully", async () => {
    const interaction = makeInteraction();
    const music = { pause: jest.fn().mockReturnValue(true) } as any;

    await pauseCommand.execute(interaction, { music } as any);

    expect(ensureUserVoiceChannel).toHaveBeenCalledWith(interaction);
    expect(music.pause).toHaveBeenCalledWith(guild);
    expect(interaction.reply).toHaveBeenCalledWith("Paused playback.");
  });

  it("informs when nothing is playing", async () => {
    const interaction = makeInteraction();
    const music = { pause: jest.fn().mockReturnValue(false) } as any;

    await pauseCommand.execute(interaction, { music } as any);

    expect(interaction.reply).toHaveBeenCalledWith("Nothing is playing.");
  });
});

describe("playCommand", () => {
  const voiceChannel = { id: "voice-1", guild: { id: "guild-1" } } as any;
  const query = "test song";

  const makeInteraction = () => {
    return {
      guild: voiceChannel.guild,
      user: { tag: "tester#0001" },
      options: {
        getString: jest.fn().mockImplementation((name: string) => {
          if (name === "query") return query;
          if (name === "source") return null;
          return null;
        }),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
    } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ensureUserVoiceChannel as jest.Mock).mockReturnValue(voiceChannel);
    const playDl = require("play-dl");
    playDl.validate.mockResolvedValue("search");
  });

  it("queues the first search result and replies", async () => {
    const interaction = makeInteraction();

    const playable: Track = {
      title: "Result Track",
      url: "http://example.com",
      source: "youtube",
    } as Track;

    const search = {
      getSpotifyPlaylistFromUrl: jest.fn().mockResolvedValue(null),
      search: jest
        .fn()
        .mockResolvedValue([
          { title: playable.title, source: playable.source, url: playable.url },
        ]),
      resolvePlayable: jest.fn().mockResolvedValue({ ...playable }),
    } as any;

    const music = {
      play: jest.fn().mockResolvedValue(playable),
    } as any;

    await playCommand.execute(interaction, { music, search } as any);

    expect(ensureUserVoiceChannel).toHaveBeenCalledWith(interaction);
    expect(search.search).toHaveBeenCalledWith(query, "auto");
    expect(search.resolvePlayable).toHaveBeenCalled();
    expect(music.play).toHaveBeenCalledWith(
      voiceChannel,
      expect.objectContaining({ title: playable.title })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining(playable.title)
    );
  });
});
