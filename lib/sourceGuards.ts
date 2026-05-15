const placeholderTokens = ["example.com", "placeholder", "サンプル", "プレースホルダー", "要差し替え", "要確認"];

export function placeholderReason(value: string | null | undefined) {
  if (!value) return null;
  const lowered = value.toLowerCase();
  const matched = placeholderTokens.find((token) => lowered.includes(token.toLowerCase()));
  return matched ? `プレースホルダー判定キーワード「${matched}」を含むため` : null;
}

export function isPlaceholderSourceText(value: string | null | undefined) {
  return Boolean(placeholderReason(value));
}

export function placeholderSourceReason(source: {
  name?: string | null;
  storeName?: string | null;
  shopName?: string | null;
  url?: string | null;
  baseUrl?: string | null;
  searchUrlTemplate?: string | null;
  memo?: string | null;
}) {
  const fields = [
    ["ソース名", source.name],
    ["店舗名", source.storeName ?? source.shopName],
    ["URL", source.url],
    ["baseUrl", source.baseUrl],
    ["searchUrlTemplate", source.searchUrlTemplate],
    ["メモ", source.memo]
  ] as const;
  for (const [label, value] of fields) {
    const reason = placeholderReason(value);
    if (reason) return `${label}: ${reason}`;
  }
  return null;
}

export function isPlaceholderWatchSource(source: { name?: string | null; storeName?: string | null; url?: string | null; memo?: string | null }) {
  return Boolean(placeholderSourceReason(source));
}

export function isPlaceholderPriceSource(source: {
  name?: string | null;
  shopName?: string | null;
  baseUrl?: string | null;
  searchUrlTemplate?: string | null;
  memo?: string | null;
}) {
  return Boolean(placeholderSourceReason(source));
}

export const placeholderWarningMessage = "このURLはプレースホルダーです。実在する公開URLに差し替えてから有効化してください。";
