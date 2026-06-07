import { placeholderSourceReason } from "@/lib/sourceGuards";
import { pokemonSourceGate } from "@/lib/pokemonFilters";
import { isAllowedAmazonDiscoveryType, isAmazonExcludedDiscoveryType } from "@/services/discoveryClassification/rules";

export type SourceUsefulness = "watch_source" | "price_source" | "both" | "ignore" | "manual_review";
export type SourceRecommendedAction = "add_watch_source" | "add_price_source" | "add_both" | "ignore" | "manual_review";
export type SourceTrustLevel = "high" | "medium" | "low";

export type SourceUsefulnessInput = {
  title: string;
  normalizedUrl: string;
  description?: string | null;
  detectedType: string;
  discoveryType: string;
  confidenceScore: number;
  matchedKeywords?: string[] | string | null;
  reason?: string | null;
  requiresReview?: boolean | null;
  searchUrlTemplateCandidate?: string | null;
  aiIsLotteryApplicationPage?: boolean | null;
  aiIsCurrentlyOpen?: boolean | null;
  aiIsPastOrEnded?: boolean | null;
  aiIsJustArticle?: boolean | null;
  aiIsProductSalesPage?: boolean | null;
  aiIsPriceBuybackPage?: boolean | null;
  aiConfidenceScore?: number | null;
  aiExcludeReason?: string | null;
};

export function evaluateSourceUsefulness(input: SourceUsefulnessInput) {
  const riskReasons = getRiskReasons(input);
  const watchGate = pokemonSourceGate(input, "watch");
  const priceGate = pokemonSourceGate(input, "price");
  const pokemonRiskReasons = Array.from(new Set([...watchGate.reasons, ...priceGate.reasons]));
  if (!watchGate.ok && !priceGate.ok) riskReasons.push(...pokemonRiskReasons);
  const riskReason = riskReasons.length > 0 ? riskReasons.join(" / ") : null;
  const confidence = Math.max(input.confidenceScore ?? 0, input.aiConfidenceScore ?? 0);
  const isPriceCandidate =
    priceGate.ok &&
    (input.discoveryType === "price_buyback_page" ||
      input.detectedType === "price_source_candidate" ||
      input.aiIsPriceBuybackPage === true);
  const isWatchCandidate =
    watchGate.ok &&
    (input.discoveryType === "current_lottery_application" ||
      isAllowedAmazonDiscoveryType(input.discoveryType) ||
      (input.aiIsLotteryApplicationPage === true && input.aiIsCurrentlyOpen === true && input.aiIsPastOrEnded !== true));
  const hasTemplate = Boolean(input.searchUrlTemplateCandidate?.includes("{keyword}"));

  if (riskReason) {
    return buildResult({
      sourceUsefulness: "ignore",
      aiRecommendedAction: "ignore",
      aiCanAutoRegister: false,
      aiCanAutoEnable: false,
      aiTrustLevel: "low",
      aiSourceReason: "ノイズ、過去記事、通常販売ページ、または利用に不向きな候補です。",
      aiRiskReason: riskReason
    });
  }

  const aiTrustLevel: SourceTrustLevel = confidence >= 0.8 ? "high" : confidence >= 0.55 ? "medium" : "low";
  const priceNeedsReview = isPriceCandidate && !hasTemplate;
  const usefulForPrice = isPriceCandidate && hasTemplate;
  const usefulForWatch = isWatchCandidate;
  const sourceUsefulness: SourceUsefulness =
    usefulForPrice && usefulForWatch ? "both" : usefulForPrice ? "price_source" : usefulForWatch ? "watch_source" : priceNeedsReview ? "manual_review" : "manual_review";
  const aiCanAutoRegister = aiTrustLevel === "high" && sourceUsefulness !== "manual_review";
  const aiCanAutoEnable = aiCanAutoRegister && !input.requiresReview;
  const aiRecommendedAction: SourceRecommendedAction =
    !aiCanAutoRegister
      ? "manual_review"
      : sourceUsefulness === "both"
        ? "add_both"
        : sourceUsefulness === "price_source"
          ? "add_price_source"
          : "add_watch_source";

  const aiSourceReason =
    sourceUsefulness === "price_source"
      ? "買取価格ページ候補で、検索URLテンプレートを推定できています。"
      : sourceUsefulness === "watch_source"
        ? "現在受付中の抽選応募ページ候補です。"
        : sourceUsefulness === "both"
          ? "抽選応募ページ候補かつ価格取得元候補として利用できる可能性があります。"
          : priceNeedsReview
            ? "買取価格ページ候補ですが、検索URLテンプレートを確認する必要があります。"
            : "監視ソースまたは価格ソースとして自動登録する根拠が不足しています。";

  return buildResult({
    sourceUsefulness,
    aiRecommendedAction,
    aiCanAutoRegister,
    aiCanAutoEnable,
    aiTrustLevel,
    aiSourceReason,
    aiRiskReason: priceNeedsReview ? "searchUrlTemplateを推定できないため手動確認が必要です。" : null
  });
}

function getRiskReasons(input: SourceUsefulnessInput) {
  const risks: string[] = [];
  const placeholder = placeholderSourceReason({ name: input.title, url: input.normalizedUrl, memo: input.description });
  if (placeholder) risks.push(placeholder);
  if (input.aiExcludeReason) risks.push(input.aiExcludeReason);
  if (input.discoveryType === "ended_lottery_article") risks.push("過去の抽選記事です。");
  if (input.discoveryType === "lottery_news_article") risks.push("ニュース記事であり応募ページではありません。");
  if ((input.discoveryType === "sales_page" || input.aiIsProductSalesPage === true) && !isAllowedAmazonDiscoveryType(input.discoveryType)) {
    risks.push("通常販売ページです。");
  }
  if (isAmazonExcludedDiscoveryType(input.discoveryType)) risks.push("Amazonマーケットプレイス、中古、外部販売者、在庫なし、またはAmazon販売と断定できない商品です。");
  if (input.aiIsJustArticle === true) risks.push("記事ページです。");
  if (input.aiIsPastOrEnded === true) risks.push("AIが過去または終了済みと判定しています。");
  if (input.discoveryType === "unknown" && input.detectedType === "unknown") risks.push("監視ソース/価格ソースとしての根拠が不足しています。");
  return risks;
}

function buildResult<T extends {
  sourceUsefulness: SourceUsefulness;
  aiRecommendedAction: SourceRecommendedAction;
  aiCanAutoRegister: boolean;
  aiCanAutoEnable: boolean;
  aiTrustLevel: SourceTrustLevel;
  aiSourceReason: string;
  aiRiskReason: string | null;
}>(result: T) {
  return result;
}
