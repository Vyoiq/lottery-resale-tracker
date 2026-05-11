export const listingStatusLabels: Record<string, string> = {
  active: "受付中",
  ended: "終了",
  unknown: "不明",
  ignored: "無視"
};

export const sourceTypeLabels: Record<string, string> = {
  html: "HTML",
  rss: "RSS",
  other: "その他"
};

export const priceStatusLabels: Record<string, string> = {
  unchecked: "未取得",
  found: "取得済み",
  not_found: "見つからない",
  error: "エラー"
};

export const userVerdictLabels: Record<string, string> = {
  good: "良い候補",
  wrong_price: "価格が違う",
  wrong_product: "商品が違う",
  low_interest: "興味なし",
  expired: "期限切れ",
  duplicate: "重複",
  other: "その他"
};

export const applicationStatusLabels: Record<string, string> = {
  not_applied: "未応募",
  applied: "応募済み",
  won: "当選",
  lost: "落選",
  purchased: "購入済み",
  sold: "売却済み",
  skipped: "スキップ"
};

export function dateOnly(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

export function dateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function relativeCount(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

export function yen(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}

export function percent(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(1)}%`;
}

export function multiple(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(1)}倍`;
}
