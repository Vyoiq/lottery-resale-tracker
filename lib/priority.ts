export type PriorityListingInput = {
  productName: string;
  title: string;
  description?: string | null;
  rawText?: string | null;
  status: string;
  applicationEndAt?: Date | null;
  retailPrice?: number | null;
  bestBuyPrice?: number | null;
  estimatedProfit?: number | null;
  roi?: number | null;
  priceStatus: string;
  confidenceScore?: number | null;
  ignored?: boolean | null;
};

export function priorityLabel(score: number) {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 50) return "B";
  if (score >= 25) return "C";
  return "D";
}

export function priorityLabelText(label: string) {
  return {
    S: "最優先",
    A: "応募推奨",
    B: "要確認",
    C: "低優先",
    D: "対象外"
  }[label] ?? "対象外";
}

export function priorityTone(label: string) {
  if (label === "S") return "success";
  if (label === "A") return "primary";
  if (label === "B") return "warning";
  if (label === "C") return "neutral";
  return "danger";
}

export function computeApplicationPriority(input: {
  listing: PriorityListingInput;
  bestPriceConfidence?: number | null;
  exclusionKeywords?: string[];
}) {
  const listing = input.listing;
  const now = Date.now();
  const searchableText = `${listing.productName} ${listing.title} ${listing.description ?? ""} ${listing.rawText ?? ""}`.toLowerCase();
  const matchedExclusion = (input.exclusionKeywords ?? []).find((keyword) => searchableText.includes(keyword.toLowerCase()));

  if (listing.ignored || listing.status === "ignored" || matchedExclusion) {
    return { score: 0, label: "D", matchedExclusion };
  }

  let score = 0;
  const confidence = input.bestPriceConfidence ?? 0;
  const deadline = listing.applicationEndAt?.getTime();

  if (listing.status === "active") score += 15;
  else score -= 20;

  if (listing.priceStatus === "found") score += 15;
  else if (listing.priceStatus === "unchecked") score -= 15;
  else if (listing.priceStatus === "error") score -= 25;
  else score -= 20;

  if (listing.retailPrice && listing.retailPrice > 0) score += 10;
  else score -= 15;

  const profit = listing.estimatedProfit ?? 0;
  if (profit >= 50000) score += 25;
  else if (profit >= 20000) score += 22;
  else if (profit >= 10000) score += 18;
  else if (profit >= 3000) score += 12;
  else if (profit > 0) score += 6;
  else score -= 10;

  const roi = listing.roi ?? 0;
  if (roi >= 500) score += 20;
  else if (roi >= 200) score += 15;
  else if (roi >= 100) score += 10;
  else if (roi >= 30) score += 5;

  if (confidence >= 0.85) score += 15;
  else if (confidence >= 0.7) score += 10;
  else if (confidence >= 0.5) score += 3;
  else if (listing.priceStatus === "found") score -= 12;

  if (deadline) {
    if (deadline < now) score -= 40;
    else {
      const daysLeft = (deadline - now) / (24 * 60 * 60 * 1000);
      if (daysLeft <= 1) score += 15;
      else if (daysLeft <= 3) score += 10;
      else if (daysLeft <= 7) score += 5;
    }
  } else {
    score -= 8;
  }

  if ((listing.productName ?? "").length < 8) score -= 10;
  if ((listing.confidenceScore ?? 0) < 0.4) score -= 8;

  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return { score: bounded, label: priorityLabel(bounded), matchedExclusion };
}
