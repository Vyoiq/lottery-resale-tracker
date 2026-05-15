export const aiClassificationSystemPrompt = `
あなたは日本語の公開Webページを分類する検証器です。
目的は「現在応募できる抽選応募ページ」を、記事・過去告知・通常販売ページ・買取価格ページから厳密に分けることです。

判定方針:
- 自動応募や購入可否は判定対象ではありません。ページ内容の分類だけを行ってください。
- 「抽選」「応募」「受付」「当選」などがあっても、過去のお知らせやまとめ記事なら isLotteryApplicationPage=false または isPastOrEnded=true にしてください。
- 現在応募可能か本文から断定できない場合、isCurrentlyOpen は null にしてください。
- 締切や受付終了の文言があれば isPastOrEnded=true を優先してください。
- 販売ページだけなら isProductSalesPage=true、買取価格ページなら isPriceBuybackPage=true にしてください。
- ポケモンカード/ポケカは category=pokemon_card、その他トレカは trading_card にしてください。
- 日付は ISO 8601 で返してください。根拠が弱い日付は null にしてください。
- reason は短く具体的に、excludeReason は候補から外す理由があるときだけ返してください。
`.trim();

export function discoveredSourceUserPrompt(input: {
  url: string;
  title: string;
  description: string | null;
  rawText: string | null;
  matchedKeywords: string | null;
  detectedType: string;
  discoveredAt: Date;
}) {
  return `
次の公開Webページ候補を分類してください。

URL: ${input.url}
title: ${input.title}
description: ${input.description ?? ""}
matchedKeywords: ${input.matchedKeywords ?? ""}
detectedType: ${input.detectedType}
discoveredAt: ${input.discoveredAt.toISOString()}
本文:
${trimBody(input.rawText)}
`.trim();
}

export function lotteryListingUserPrompt(input: {
  lotteryUrl: string;
  title: string;
  productName: string;
  storeName: string;
  description: string | null;
  rawText: string | null;
  matchedKeywords: string | null;
  applicationStartAt: Date | null;
  applicationEndAt: Date | null;
  resultAnnouncementAt: Date | null;
  purchaseDeadlineAt: Date | null;
}) {
  return `
次の抽選候補レコードを分類してください。

URL: ${input.lotteryUrl}
title: ${input.title}
productName: ${input.productName}
storeName: ${input.storeName}
description: ${input.description ?? ""}
matchedKeywords: ${input.matchedKeywords ?? ""}
existingDates:
- applicationStartAt: ${input.applicationStartAt?.toISOString() ?? ""}
- applicationEndAt: ${input.applicationEndAt?.toISOString() ?? ""}
- resultAnnouncementAt: ${input.resultAnnouncementAt?.toISOString() ?? ""}
- purchaseDeadlineAt: ${input.purchaseDeadlineAt?.toISOString() ?? ""}
本文:
${trimBody(input.rawText)}
`.trim();
}

function trimBody(value: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, 3000);
}
