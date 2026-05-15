import type { SearchProvider } from "./types";

export const serpApiProvider: SearchProvider = {
  name: "serpapi",
  async discover(query) {
    const apiKey = process.env.SERPAPI_API_KEY?.trim();
    if (!apiKey) {
      return {
        providerName: this.name,
        candidates: [],
        skipped: true,
        message: "SerpAPI: APIキー未設定のためスキップ"
      };
    }

    const url = new URL("https://serpapi.com/search");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query.query);
    url.searchParams.set("hl", "ja");
    url.searchParams.set("gl", "jp");
    url.searchParams.set("num", "10");
    url.searchParams.set("api_key", apiKey);

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`SerpAPI HTTP ${response.status}`);
    const json = (await response.json()) as {
      organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
    };

    return {
      providerName: this.name,
      candidates: (json.organic_results ?? [])
        .filter((item) => item.title && item.link)
        .map((item) => ({
          title: item.title!,
          url: item.link!,
          description: item.snippet ?? null,
          providerName: this.name
        })),
      skipped: false
    };
  }
};
