import play from "play-dl";
import SpotifyWebApi from "spotify-web-api-node";
import { Track, TrackSource } from "./types";
import { env } from "../config/env";

interface SpotifyAuthState {
  expiresAt: number;
}

export class SearchService {
  private spotify?: SpotifyWebApi;
  private spotifyAuth?: SpotifyAuthState;

  constructor() {
    if (env.spotifyClientId && env.spotifyClientSecret) {
      this.spotify = new SpotifyWebApi({
        clientId: env.spotifyClientId,
        clientSecret: env.spotifyClientSecret,
      });
    }
  }

  async search(
    query: string,
    source: TrackSource | "auto" = "auto",
    limit = 20
  ): Promise<Track[]> {
    const results: Track[] = [];

    if (source !== "spotify") {
      const yt = await play.search(query, {
        limit: 10,
        source: { youtube: "video" },
      });
      yt.forEach((item) => {
        if (!item.url) return;
        results.push({
          title: item.title ?? "Unknown title",
          url: item.url,
          source: "youtube",
          duration: item.durationInSec,
          playbackUrl: item.url,
        });
      });
    }

    if (source !== "youtube" && this.spotify) {
      const spotifyTracks = await this.searchSpotify(query, 10);
      results.push(...spotifyTracks);
    }

    return results.slice(0, limit);
  }

  async resolvePlayable(track: Track): Promise<Track> {
    if (track.playbackUrl) {
      return track;
    }

    if (track.source === "spotify") {
      const lookupQuery = track.searchQuery ?? track.title;
      const yt = await play.search(lookupQuery, {
        limit: 1,
        source: { youtube: "video" },
      });
      const first = yt[0];
      if (!first || !first.url) {
        throw new Error("Unable to find a playable version for this track");
      }
      return { ...track, playbackUrl: first.url };
    }

    if (track.source === "youtube" && !track.url) {
      throw new Error("Track is missing a YouTube URL");
    }

    return track;
  }

  private async searchSpotify(query: string, limit: number): Promise<Track[]> {
    if (!this.spotify) return [];
    await this.ensureSpotifyToken();
    const res = await this.spotify.searchTracks(query, { limit });
    const items = res.body.tracks?.items ?? [];

    return items.map((item): Track => {
      const artistNames = item.artists.map((artist) => artist.name).join(", ");
      const title = `${item.name} - ${artistNames}`;
      return {
        title,
        url: item.external_urls.spotify,
        source: "spotify",
        duration: Math.floor((item.duration_ms ?? 0) / 1000),
        searchQuery: title,
      };
    });
  }

  private async ensureSpotifyToken(): Promise<void> {
    if (!this.spotify) return;
    const now = Date.now();
    if (this.spotifyAuth && this.spotifyAuth.expiresAt > now + 60_000) {
      return;
    }

    const response = await this.spotify.clientCredentialsGrant();
    const expiresIn = response.body["expires_in"] ?? 3600;
    const accessToken = response.body["access_token"];
    this.spotify.setAccessToken(accessToken);
    this.spotifyAuth = {
      expiresAt: now + expiresIn * 1000,
    };
  }
}
