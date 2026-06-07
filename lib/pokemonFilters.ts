export const pokemonCardTerms = [
  "ポケモンカード",
  "ポケカ",
  "ポケモンセンター",
  "pokemon card",
  "pokémon card",
  "pokemoncard",
  "スペシャルbox",
  "special box",
  "拡張パック",
  "強化拡張パック"
];

export const pokemonBroadTerms = [
  ...pokemonCardTerms,
  "トレカ",
  "box",
  "ボックス"
];

export const lotterySaleTerms = [
  "抽選",
  "応募",
  "受付",
  "予約",
  "招待",
  "招待販売",
  "amazon招待",
  "抽選販売",
  "予約抽選",
  "応募受付",
  "受付中"
];

export const buybackTerms = [
  "買取",
  "買取価格",
  "買取表",
  "高価買取",
  "未開封買取",
  "買取検索",
  "buyback"
];

export const pokemonNoiseTerms = [
  "格安sim",
  "スマホ",
  "スマートフォン",
  "タブレット",
  "リズム天国",
  "デジモン",
  "ゲーム特集",
  "家電",
  "通信契約",
  "wimax",
  "wi-fi",
  "wifi",
  "ブロードバンド",
  "中古スマホ",
  "ゴールドポイント",
  "snow man",
  "dvd",
  "blu-ray",
  "ブルーレイ",
  "cd",
  "食品",
  "j:com",
  "iijmio",
  "ワイヤレスゲート",
  "汎用キャンペーン",
  "pr記事",
  "マーケットプレイス",
  "メルカリ",
  "ヤフオク",
  "フリマ"
];

export const newsArticleTerms = [
  "ニュース",
  "記事",
  "インタビュー",
  "レビュー",
  "コラム",
  "inside-games.jp",
  "game.watch.impress.co.jp",
  "automaton-media.com",
  "/article/",
  "/news/"
];

export const officialNonBuybackHosts = [
  "pokemoncenter-online.com",
  "pokemon-card.com"
];

export function combinedSourceText(input: {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  normalizedUrl?: string | null;
  rawText?: string | null;
  reason?: string | null;
  matchedKeywords?: string | string[] | null;
  aiReason?: string | null;
  aiSourceReason?: string | null;
}) {
  const keywords = Array.isArray(input.matchedKeywords) ? input.matchedKeywords.join(" ") : input.matchedKeywords;
  return [
    input.title,
    input.description,
    input.url,
    input.normalizedUrl,
    input.rawText,
    input.reason,
    keywords,
    input.aiReason,
    input.aiSourceReason
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchedTerms(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term.toLowerCase()));
}

export function hasAnyTerm(text: string, terms: string[]) {
  return matchedTerms(text, terms).length > 0;
}

export function hasPokemonCardContext(text: string) {
  const lower = text.toLowerCase();
  if (hasAnyTerm(lower, pokemonCardTerms)) return true;
  return lower.includes("ポケモン") && (lower.includes("カード") || lower.includes("box") || lower.includes("ボックス"));
}

export function hasLotterySaleIntent(text: string) {
  return hasAnyTerm(text, lotterySaleTerms);
}

export function hasBuybackIntent(text: string) {
  return hasAnyTerm(text, buybackTerms);
}

export function pokemonNoiseReasons(text: string) {
  const reasons = matchedTerms(text, pokemonNoiseTerms).map((term) => `ポケモンカード対象外: ${term}`);
  if (hasAnyTerm(text, newsArticleTerms) && !hasLotterySaleIntent(text) && !hasBuybackIntent(text)) {
    reasons.push("ニュース/記事ページ");
  }
  return reasons;
}

export function isOfficialNonBuybackUrl(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    return officialNonBuybackHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return false;
  }
}

export function pokemonSourceGate(
  input: Parameters<typeof combinedSourceText>[0],
  mode: "watch" | "price" | "either"
) {
  const text = combinedSourceText(input);
  const noise = pokemonNoiseReasons(text);
  const hasPokemon = hasPokemonCardContext(text);
  const hasLottery = hasLotterySaleIntent(text);
  const hasBuyback = hasBuybackIntent(text);
  const reasons: string[] = [];

  if (noise.length > 0) reasons.push(...noise);
  if (!hasPokemon) reasons.push("ポケモンカード系キーワードなし");
  if (mode === "watch" && !hasLottery) reasons.push("抽選/応募/予約/招待キーワードなし");
  if (mode === "price" && !hasBuyback) reasons.push("買取系キーワードなし");
  if (mode === "either" && !hasLottery && !hasBuyback) reasons.push("抽選/買取系キーワードなし");

  return {
    ok: reasons.length === 0,
    hasPokemon,
    hasLottery,
    hasBuyback,
    matchedPokemon: matchedTerms(text, pokemonBroadTerms),
    matchedLottery: matchedTerms(text, lotterySaleTerms),
    matchedBuyback: matchedTerms(text, buybackTerms),
    reasons
  };
}
