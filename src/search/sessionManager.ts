import crypto from "crypto";
import { Track } from "../music/types";

export interface SearchSession {
  id: string;
  userId: string;
  createdAt: number;
  results: Track[];
  page: number;
}

export class SearchSessionManager {
  private sessions = new Map<string, SearchSession>();
  private ttlMs = 10 * 60 * 1000;

  create(results: Track[], userId: string): SearchSession {
    const id = crypto.randomUUID();
    const session: SearchSession = {
      id,
      userId,
      createdAt: Date.now(),
      results,
      page: 0,
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id: string): SearchSession | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    if (Date.now() - session.createdAt > this.ttlMs) {
      this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  updatePage(id: string, page: number): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.page = page;
  }

  delete(id: string): void {
    this.sessions.delete(id);
  }
}
