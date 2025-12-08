export type TrackSource = "youtube" | "spotify";

export interface Track {
  title: string;
  url: string;
  source: TrackSource;
  duration?: number | null;
  searchQuery?: string;
  playbackUrl?: string;
  requestedBy?: string;
}
