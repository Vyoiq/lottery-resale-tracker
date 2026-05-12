export const notificationTypes = [
  "high_priority",
  "deadline_soon",
  "price_found",
  "price_error",
  "not_applied_deadline_today",
  "won_not_purchased",
  "purchased_not_sold"
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type NotificationSeverity = "info" | "warning" | "important";

export type NotificationCandidate = {
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
};

export type NotificationListing = {
  id: string;
  title: string;
  productName: string;
  storeName: string;
  status: string;
  applicationEndAt: Date | null;
  applicationPriorityLabel: string;
  applicationPriorityScore: number;
  ignored: boolean;
  priceStatus: string;
  retailPrice: number | null;
  bestBuyPrice: number | null;
  estimatedProfit: number | null;
  roi: number | null;
  priceRecords: { confidenceScore: number }[];
  applicationStatus: string;
  purchasedAt: Date | null;
  soldAt: Date | null;
  purchasePrice: number | null;
  salePrice: number | null;
};

export type NotificationRuleOptions = {
  minProfit?: number;
  minRoi?: number;
};

const oneDayMs = 24 * 60 * 60 * 1000;

export function buildNotificationCandidates(listing: NotificationListing, now = new Date(), options: NotificationRuleOptions = {}): NotificationCandidate[] {
  if (listing.ignored || listing.status === "ignored") return [];

  const candidates: NotificationCandidate[] = [];
  const bestConfidence = listing.priceRecords[0]?.confidenceScore ?? 0;
  const profit = listing.estimatedProfit ?? 0;
  const roi = listing.roi ?? 0;
  const minProfit = options.minProfit ?? 3000;
  const minRoi = options.minRoi ?? 100;
  const isActive = listing.status === "active";

  if (listing.applicationPriorityLabel === "S" && isActive) {
    candidates.push({
      type: "high_priority",
      title: "Sランクの応募候補があります",
      message: `${listing.productName} は応募優先度 ${listing.applicationPriorityScore} 点です。利益と締切を確認してください。`,
      severity: "important"
    });
  }

  if (isAOrHigher(listing.applicationPriorityLabel) && isWithinDays(listing.applicationEndAt, now, 3)) {
    candidates.push({
      type: "deadline_soon",
      title: "応募締切が近い高優先候補です",
      message: `${listing.storeName} の ${listing.productName} は ${formatDate(listing.applicationEndAt)} が締切です。`,
      severity: "warning"
    });
  }

  if (listing.priceStatus === "found" && (profit >= minProfit || roi >= minRoi)) {
    const severity: NotificationSeverity = profit >= minProfit && roi >= minRoi && bestConfidence >= 0.7 ? "important" : "info";
    candidates.push({
      type: "price_found",
      title: "利益が見込める価格候補があります",
      message: `${listing.productName} は想定利益 ${formatYen(profit)}、ROI ${formatPercent(roi)}、価格信頼度 ${bestConfidence.toFixed(2)} です。`,
      severity
    });
  }

  if (listing.priceStatus === "error") {
    candidates.push({
      type: "price_error",
      title: "価格取得でエラーが発生しました",
      message: `${listing.productName} の価格取得に失敗しています。価格ソースまたは商品名を確認してください。`,
      severity: "warning"
    });
  }

  if (isActive && listing.applicationStatus === "not_applied" && isToday(listing.applicationEndAt, now)) {
    candidates.push({
      type: "not_applied_deadline_today",
      title: "本日締切で未応募です",
      message: `${listing.productName} は本日 ${formatDate(listing.applicationEndAt)} 締切ですが、応募状況が未応募です。`,
      severity: "important"
    });
  }

  if (listing.applicationStatus === "won" && !listing.purchasedAt && !listing.purchasePrice) {
    candidates.push({
      type: "won_not_purchased",
      title: "当選後の購入記録がありません",
      message: `${listing.productName} は当選済みです。購入した場合は購入記録を入力してください。`,
      severity: "important"
    });
  }

  if (listing.applicationStatus === "purchased" && !listing.soldAt && !listing.salePrice) {
    candidates.push({
      type: "purchased_not_sold",
      title: "購入済みで未売却です",
      message: `${listing.productName} は購入済みですが売却記録がありません。保有状況を確認してください。`,
      severity: "warning"
    });
  }

  return candidates;
}

export function isAOrHigher(label: string) {
  return label === "S" || label === "A";
}

function isWithinDays(value: Date | null, now: Date, days: number) {
  if (!value) return false;
  const diff = value.getTime() - now.getTime();
  return diff >= 0 && diff <= days * oneDayMs;
}

function isToday(value: Date | null, now: Date) {
  if (!value) return false;
  return value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth() && value.getDate() === now.getDate();
}

function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDate(value: Date | null) {
  if (!value) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}
