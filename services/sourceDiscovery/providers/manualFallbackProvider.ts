import type { SearchProvider } from "./types";
import { discoverFromKnownPublicPages } from "./presetLinkProvider";

export const manualFallbackProvider: SearchProvider = {
  name: "manual_fallback",
  async discover(query) {
    const candidates = await discoverFromKnownPublicPages(query);
    return {
      providerName: this.name,
      candidates: candidates.map((candidate) => ({ ...candidate, providerName: this.name })),
      skipped: false,
      message: "既存の公開ページからリンク候補を抽出"
    };
  }
};
