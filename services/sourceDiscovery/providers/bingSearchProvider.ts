import type { SearchProvider } from "./types";

export const bingSearchProvider: SearchProvider = {
  name: "bing",
  async discover(query) {
    const apiKey = process.env.BING_SEARCH_API_KEY?.trim();
    if (!apiKey) {
      return {
        providerName: this.name,
        candidates: [],
        skipped: true,
        message: "Bing Web Search API: APIキー未設定のためスキップ"
      };
    }

    const url = new URL("https://api.bing.microsoft.com/v7.0/search");
    url.searchParams.set("q", query.query);
    url.searchParams.set("mkt", "ja-JP");
    url.searchParams.set("count", "10");
    url.searchParams.set("responseFilter", "Webpages");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": apiKey
      }
    });
    if (!response.ok) throw new Error(`Bing Web Search API HTTP ${response.status}`);
    const json = (await response.json()) as {
      webPages?: { value?: Array<{ name?: string; url?: string; snippet?: string }> };
    };

    return {
      providerName: this.name,
      candidates: (json.webPages?.value ?? [])
        .filter((item) => item.name && item.url)
        .map((item) => ({
          title: item.name!,
          url: item.url!,
          description: item.snippet ?? null,
          providerName: this.name
        })),
      skipped: false
    };
  }
};
