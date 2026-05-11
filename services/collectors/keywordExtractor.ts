export const lotteryKeywords = [
  "抽選",
  "抽選販売",
  "応募",
  "受付",
  "当選",
  "販売",
  "予約",
  "限定",
  "ポケモンカード",
  "ポケカ",
  "BOX",
  "スペシャルBOX",
  "拡張パック",
  "トレカ"
];

export function keywordScore(text: string) {
  const normalized = text.toLowerCase();
  const matched = lotteryKeywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
  const score = Math.min(1, matched.length / 5);
  return { matched, score };
}

export function looksLikeLottery(text: string) {
  const { matched, score } = keywordScore(text);
  return matched.length >= 2 || score >= 0.4;
}

export function confidenceReason(text: string) {
  const { matched } = keywordScore(text);
  if (matched.length >= 4) return "タイトルと本文に抽選系キーワードが複数含まれるため";
  if (matched.length >= 2) return "抽選販売に関連するキーワードが複数含まれるため";
  if (matched.length === 1) return "抽選販売に関連するキーワードが含まれるため";
  return "抽選販売に関連するキーワードが不足しています";
}
