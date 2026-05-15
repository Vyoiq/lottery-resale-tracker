import type { SearchProvider } from "./types";

export const braveSearchProvider: SearchProvider = {
  name: "brave",
  async discover(query) {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
    if (!apiKey) {
      return {
        providerName: this.name,
        candidates: [],
        skipped: true,
        message: "Brave Search API: APIキー未設定のためスキップ"
      };
    }

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query.query);
    url.searchParams.set("count", "10");
    url.searchParams.set("country", "JP");
    url.searchParams.set("search_lang", "jp");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey
      }
    });
    if (!response.ok) throw new Error(`Brave Search API HTTP ${response.status}`);
    const json = (await response.json()) as {
      web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
    };

    return {
      providerName: this.name,
      candidates: (json.web?.results ?? [])
        .filter((item) => item.title && item.url)
        .map((item) => ({
          title: item.title!,
          url: item.url!,
          description: item.description ?? null,
          providerName: this.name
        })),
      skipped: false
    };
  }
};
