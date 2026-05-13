export type DiscoveryCandidate = {
  title: string;
  url: string;
  description?: string | null;
};

export function normalizeDiscoveredUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(utm_|fbclid|gclid|yclid|msclkid)/i.test(key)) url.searchParams.delete(key);
    }
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function hostName(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export function buildSearchRssUrls(query: string) {
  const url = new URL("https://www.bing.com/news/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "rss");
  url.searchParams.set("cc", "jp");
  url.searchParams.set("setlang", "ja");
  return [url.toString()];
}

export function candidateSearchTemplate(url: string) {
  try {
    const parsed = new URL(url);
    for (const key of ["q", "query", "keyword", "keywords", "search", "s"]) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, "{keyword}");
        return parsed.toString();
      }
    }
    parsed.searchParams.set("q", "{keyword}");
    return parsed.toString();
  } catch {
    return url.includes("{keyword}") ? url : `${url}${url.includes("?") ? "&" : "?"}q={keyword}`;
  }
}

export function textFromHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeXmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
