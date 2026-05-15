import type { SearchProvider } from "./types";
import { discoverFromSearchRss } from "./rssSearchProvider";

export const publicSearchFeedProvider: SearchProvider = {
  name: "public_search_feed",
  async discover(query) {
    const candidates = await discoverFromSearchRss(query);
    return {
      providerName: this.name,
      candidates: candidates.map((candidate) => ({ ...candidate, providerName: this.name })),
      skipped: false
    };
  }
};
