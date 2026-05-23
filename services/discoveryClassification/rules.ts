export const discoveryTypes = [
  "current_lottery_application",
  "ended_lottery_article",
  "lottery_news_article",
  "official_product_page",
  "price_buyback_page",
  "sales_page",
  "unknown"
] as const;

export type DiscoveryType = (typeof discoveryTypes)[number];

const applicationKeywords = [
  "応募",
  "抽選販売",
  "受付期間",
  "応募フォーム",
  "応募締切",
  "受付中",
  "lottery",
  "campaign"
];

const lotteryKeywords = ["抽選", "抽選販売", "応募", "当選", "受付"];
const priceKeywords = ["買取", "買取価格", "買取表", "買取検索", "高価買取", "未開封買取", "トレカ買取", "ポケカ買取"];
const salesKeywords = ["販売価格", "通販価格", "在庫", "カート", "購入", "売り切れ", "定価"];
const articleKeywords = ["記事", "ニュース", "news", "article", "コラム", "レポート"];
const productKeywords = ["商品情報", "商品ページ", "製品情報", "product"];
const officialOrStoreHints = ["pokemoncenter", "pokemon-card.com", "yodobashi", "biccamera", "geo-online", "tsutaya"];
const relevantCardKeywords = [
  "ポケモンカード",
  "ポケカ",
  "トレカ",
  "抽選",
  "抽選販売",
  "応募",
  "予約",
  "受付期間",
  "応募締切",
  "買取",
  "pokemon",
  "card",
  "trading card"
];
const yodobashiNoiseUrlTokens = [
  "image.yodobashi.com/yoyaku/khn/",
  "/yoyaku/khn/",
  "pc_all_bloadband",
  "bloadband",
  "broadband",
  "wimax",
  "wirelessgate",
  "pc_all",
  "/store/470044"
];
const generalNoiseKeywords = [
  "ブロードバンド",
  "wimax",
  "ワイヤレスゲート",
  "j:com",
  "iijmio",
  "ゴールドポイント",
  "dvd",
  "blu-ray",
  "家電",
  "パソコン",
  "食品",
  "通信契約",
  "お申し込み",
  "商品一覧",
  "通常販売"
];

export type DiscoveryClassificationInput = {
  url: string;
  title: string;
  description?: string | null;
  rawText?: string | null;
  applicationEndAt?: Date | null;
  aiIsLotteryApplicationPage?: boolean | null;
  aiIsCurrentlyOpen?: boolean | null;
  aiIsPastOrEnded?: boolean | null;
  aiIsJustArticle?: boolean | null;
  aiIsProductSalesPage?: boolean | null;
  aiIsPriceBuybackPage?: boolean | null;
};

export type DiscoveryClassificationResult = {
  discoveryType: DiscoveryType;
  articlePublishedAt: Date | null;
  excludeReason: string | null;
  scoreAdjustment: number;
};

export function classifyDiscoveryType(input: DiscoveryClassificationInput, now = new Date()): DiscoveryClassificationResult {
  const articlePublishedAt = extractArticlePublishedAt(input.url, `${input.title} ${input.description ?? ""} ${input.rawText ?? ""}`);
  const text = `${input.title} ${input.description ?? ""} ${input.rawText ?? ""} ${input.url}`.toLowerCase();
  const hardExclusion = classifyHardExclusion(input.url, text);
  if (hardExclusion) {
    return result(hardExclusion.discoveryType, articlePublishedAt, hardExclusion.reason, hardExclusion.scoreAdjustment);
  }
  const isArticle = hasAny(text, articleKeywords) || Boolean(articlePublishedAt);
  const isOldArticle = articlePublishedAt ? daysBetween(articlePublishedAt, now) > 30 : false;
  const endIsPast = input.applicationEndAt ? input.applicationEndAt.getTime() < now.getTime() : false;
  const hasLottery = hasAny(text, lotteryKeywords);
  const hasApplication = hasAny(text, applicationKeywords);
  const hasPrice = hasAny(text, priceKeywords) || input.aiIsPriceBuybackPage === true;
  const hasSales = hasAny(text, salesKeywords) || input.aiIsProductSalesPage === true;
  const hasProduct = hasAny(text, productKeywords);
  const officialOrStore = officialOrStoreHints.some((hint) => text.includes(hint));

  if (hasPrice) {
    return result("price_buyback_page", articlePublishedAt, "買取価格ページのため抽選応募候補から除外", -0.4);
  }

  if (input.aiIsJustArticle === true || isArticle) {
    if (isOldArticle || endIsPast || input.aiIsPastOrEnded === true) {
      return result("ended_lottery_article", articlePublishedAt, "記事日付または応募締切が過去のため除外", -0.6);
    }
    if (hasLottery) {
      return result("lottery_news_article", articlePublishedAt, "ニュース記事のため応募ページではない", -0.4);
    }
  }

  if (endIsPast || input.aiIsPastOrEnded === true) {
    return result("ended_lottery_article", articlePublishedAt, "応募締切またはAI判定が終了済みのため除外", -0.5);
  }

  if (hasSales) {
    return result("sales_page", articlePublishedAt, "通常販売ページの可能性が高いため除外", -0.3);
  }

  if (hasProduct && !hasApplication) {
    return result("official_product_page", articlePublishedAt, "商品紹介ページの可能性が高いため除外", -0.2);
  }

  if (
    input.aiIsLotteryApplicationPage === true &&
    input.aiIsCurrentlyOpen === true &&
    input.aiIsPastOrEnded === false &&
    input.aiIsJustArticle === false
  ) {
    return result("current_lottery_application", articlePublishedAt, null, 0.25);
  }

  if (hasApplication && !isOldArticle && !endIsPast && officialOrStore) {
    return result("current_lottery_application", articlePublishedAt, null, 0.15);
  }

  if (hasLottery && isArticle) {
    return result("lottery_news_article", articlePublishedAt, "抽選関連の記事であり応募ページではない", -0.25);
  }

  return result("unknown", articlePublishedAt, "現在応募できる抽選応募ページと断定できない", -0.1);
}

export function classifyHardExclusion(url: string, text: string): { discoveryType: DiscoveryType; reason: string; scoreAdjustment: number } | null {
  const lowerUrl = url.toLowerCase();
  const lowerText = text.toLowerCase();
  const host = safeHost(lowerUrl);
  const isYodobashi = host.endsWith("yodobashi.com") || host.endsWith("yodobashi.co.jp") || lowerUrl.includes("yodobashi");
  const hasRelevantCardKeyword = hasAny(lowerText, relevantCardKeywords);
  const matchedNoiseUrl = yodobashiNoiseUrlTokens.find((token) => lowerUrl.includes(token));
  const matchedNoiseKeyword = generalNoiseKeywords.find((keyword) => lowerText.includes(keyword.toLowerCase()));

  if (matchedNoiseUrl) {
    return {
      discoveryType: "unknown",
      reason: matchedNoiseUrl.includes("store") ? "除外: ヨドバシ汎用ストアページ" : "除外: ブロードバンド申し込みページ",
      scoreAdjustment: -1
    };
  }

  if (isYodobashi && lowerUrl.includes("/store/")) {
    return { discoveryType: "unknown", reason: "除外: ヨドバシ汎用ストアページ", scoreAdjustment: -1 };
  }

  if (isYodobashi && matchedNoiseKeyword) {
    return { discoveryType: "unknown", reason: `除外: ヨドバシノイズキーワード ${matchedNoiseKeyword}`, scoreAdjustment: -0.9 };
  }

  if (isYodobashi && !hasRelevantCardKeyword) {
    return { discoveryType: "unknown", reason: "除外: ポケモンカード/トレカ/抽選/買取関連キーワードなし", scoreAdjustment: -0.8 };
  }

  return null;
}

export function isSimpleEligible(input: {
  discoveryType: string | null;
  aiIsLotteryApplicationPage: boolean | null;
  aiIsCurrentlyOpen: boolean | null;
  aiIsPastOrEnded: boolean | null;
  aiIsJustArticle: boolean | null;
  ignored: boolean;
  applicationEndAt: Date | null;
}) {
  const now = new Date();
  return (
    input.discoveryType === "current_lottery_application" &&
    input.aiIsLotteryApplicationPage === true &&
    input.aiIsCurrentlyOpen === true &&
    input.aiIsPastOrEnded === false &&
    input.aiIsJustArticle === false &&
    input.ignored === false &&
    Boolean(input.applicationEndAt && input.applicationEndAt.getTime() >= now.getTime())
  );
}

export function extractArticlePublishedAt(url: string, text = "") {
  const fromUrl =
    matchDate(url, /\/article\/(20\d{2})\/(\d{1,2})\/(\d{1,2})\//) ??
    matchDate(url, /\/(20\d{2})\/(\d{1,2})\/(\d{1,2})(?:\/|[-_.])/) ??
    matchDate(url, /[?&](?:date|published|pubdate)=(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (fromUrl) return fromUrl;

  return (
    matchDate(text, /(20\d{2})年(\d{1,2})月(\d{1,2})日/) ??
    matchDate(text, /(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/)
  );
}

function result(
  discoveryType: DiscoveryType,
  articlePublishedAt: Date | null,
  excludeReason: string | null,
  scoreAdjustment: number
): DiscoveryClassificationResult {
  return { discoveryType, articlePublishedAt, excludeReason, scoreAdjustment };
}

function hasAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()));
}

function matchDate(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / (24 * 60 * 60 * 1000));
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
