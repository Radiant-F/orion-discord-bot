import { MusicManager } from "../src/music/manager";
import { Track } from "../src/music/types";

// Mock heavy voice/streaming dependencies so unit tests stay lightweight
jest.mock("@discordjs/voice", () => {
  const subscribe = jest.fn();
  const destroy = jest.fn();
  const connection = {
    joinConfig: { channelId: "voice-1" },
    subscribe,
    destroy,
  } as any;

  const player = () => {
    const handlers: Record<string, Function[]> = {};
    return {
      pause: jest.fn().mockReturnValue(true),
      unpause: jest.fn().mockReturnValue(true),
      stop: jest.fn(),
      play: jest.fn(),
      on: jest.fn((event: string, cb: Function) => {
        handlers[event] = handlers[event] || [];
        handlers[event].push(cb);
      }),
    } as any;
  };

  return {
    createAudioPlayer: jest.fn(() => player()),
    createAudioResource: jest.fn((stream: any) => ({ stream })),
    demuxProbe: jest.fn(async (stream: any) => ({ stream, type: "opus" })),
    joinVoiceChannel: jest.fn(() => connection),
    entersState: jest.fn(async (conn: any) => conn),
    VoiceConnectionStatus: { Ready: "ready" },
    AudioPlayerStatus: { Idle: "idle" },
    StreamType: {},
  } as any;
});

jest.mock("youtubei.js", () => ({
  Innertube: { create: jest.fn() },
  UniversalCache: class {},
}));

jest.mock("youtube-dl-exec", () => ({
  constants: { YOUTUBE_DL_PATH: "yt-dlp" },
}));

describe("MusicManager", () => {
  const guild = { id: "guild-1" } as any;
  const voiceChannel = { id: "voice-1", guild } as any;
  const track: Track = {
    title: "Test Track",
    url: "http://example.com",
    source: "youtube",
  } as Track;

  const createQueueStub = () => {
    return {
      join: jest.fn().mockResolvedValue(undefined),
      enqueue: jest.fn(),
      pause: jest.fn().mockReturnValue(true),
      resume: jest.fn().mockReturnValue(true),
      skip: jest.fn(),
      stop: jest.fn(),
      clearUpcoming: jest.fn().mockReturnValue(2),
      getQueue: jest.fn().mockReturnValue({ current: undefined, upcoming: [] }),
    } as any;
  };

  let manager: MusicManager;
  let queueStub: any;

  beforeEach(() => {
    manager = new MusicManager();
    queueStub = createQueueStub();
    (manager as any).queues.set(guild.id, queueStub);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("play joins the channel and enqueues the track", async () => {
    await manager.play(voiceChannel, track);
    expect(queueStub.join).toHaveBeenCalledWith(voiceChannel);
    expect(queueStub.enqueue).toHaveBeenCalledWith(track);
  });

  it("pause delegates to the queue", () => {
    const result = manager.pause(guild);
    expect(queueStub.pause).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("resume delegates to the queue", () => {
    const result = manager.resume(guild);
    expect(queueStub.resume).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("skip triggers queue stop", () => {
    manager.skip(guild);
    expect(queueStub.skip).toHaveBeenCalled();
  });

  it("stop clears playback state", () => {
    manager.stop(guild);
    expect(queueStub.stop).toHaveBeenCalled();
  });

  it("clear returns number of removed tracks", () => {
    const removed = manager.clear(guild);
    expect(queueStub.clearUpcoming).toHaveBeenCalled();
    expect(removed).toBe(2);
  });

  it("getState exposes queue snapshot", () => {
    const state = manager.getState(guild);
    expect(queueStub.getQueue).toHaveBeenCalled();
    expect(state).toEqual({ current: undefined, upcoming: [] });
  });
});
