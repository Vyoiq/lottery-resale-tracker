import type { PriceSource, PrismaClient } from "@prisma/client";
import { getOperationSettings } from "@/lib/appSettings";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { hasBuybackIntent, hasPokemonCardContext, isOfficialNonBuybackUrl, pokemonSourceGate } from "@/lib/pokemonFilters";

const searchParamNames = ["q", "query", "keyword", "word", "search", "name"];
const pokemonPriceTestKeywords = ["スペシャルBOX ポケモンセンターヒロシマ", "ポケモンカード BOX", "ポケカ BOX"];
const cleanSalesOnlyKeywords = ["販売価格", "通販価格", "在庫", "売り切れ", "カートに入れる", "購入"];
const testKeywords = ["スペシャルBOX ポケモンセンターヒロシマ", "ポケモンカード BOX", "ポケカ BOX"];
const buybackKeywords = ["買取", "買取価格", "買取表", "高価買取", "未開封買取", "ポケカ", "ポケモンカード", "トレカ"];
const salesOnlyKeywords = ["販売価格", "通販価格", "在庫", "売り切れ", "カートに入れる"];

export type TemplateInferenceResult = {
  checkedCount: number;
  basePriceSourceCount: number;
  inferredCount: number;
  inferenceFailedCount: number;
  testSuccessCount: number;
  testFailedCount: number;
  enabledCount: number;
  skippedReasons: string[];
};

type Candidate = {
  template: string;
  reason: string;
};

export async function inferTemplatesForBasePriceSources(client: PrismaClient = defaultPrisma): Promise<TemplateInferenceResult> {
  const settings = await getOperationSettings(client);
  const sources = await client.priceSource.findMany({
    where: { searchUrlTemplate: "" },
    orderBy: { updatedAt: "desc" },
    take: 30
  });
  const result = emptyResult();
  result.basePriceSourceCount = sources.length;

  for (const source of sources) {
    const inferred = await inferAndSavePriceSourceTemplate(source.id, client, {
      allowEnable: settings.priceSourceAutoEnableInferredTemplate && isHighTrustMemo(source.memo)
    });
    mergeResult(result, inferred);
  }

  return result;
}

export async function inferAndSavePriceSourceTemplate(
  priceSourceId: string,
  client: PrismaClient = defaultPrisma,
  options: { allowEnable?: boolean } = {}
): Promise<TemplateInferenceResult> {
  const result = emptyResult();
  const source = await client.priceSource.findUnique({ where: { id: priceSourceId } });
  if (!source) {
    addReason(result, "PriceSourceが見つかりません");
    return result;
  }

  result.checkedCount = 1;
  if (placeholderSourceReason(source)) {
    result.inferenceFailedCount = 1;
    addReason(result, "プレースホルダーURLのため推定しません");
    return result;
  }

  const gate = pokemonSourceGate(
    { title: source.name, description: source.memo, url: source.baseUrl, normalizedUrl: source.baseUrl },
    "price"
  );
  if (!gate.ok || isOfficialNonBuybackUrl(source.baseUrl)) {
    const reason = [...gate.reasons, isOfficialNonBuybackUrl(source.baseUrl) ? "公式/商品情報サイトで買取ページではありません" : null]
      .filter(Boolean)
      .join(" / ");
    result.inferenceFailedCount = 1;
    addReason(result, `${source.shopName}: searchUrlTemplate推定対象外 (${reason})`);
    await markInferenceFailure(client, source.id, `searchUrlTemplate推定対象外: ${reason}`);
    return result;
  }

  try {
    const page = await fetchText(source.baseUrl);
    const candidates = inferTemplatesFromHtml(source.baseUrl, page.html);
    if (candidates.length === 0) {
      result.inferenceFailedCount = 1;
      result.testFailedCount = 1;
      await markInferenceFailure(client, source.id, "検索フォームまたは検索リンクを検出できませんでした");
      addReason(result, `${source.shopName}: 検索フォームまたは検索リンクなし`);
      return result;
    }

    for (const candidate of candidates.slice(0, 8)) {
      const test = await testPriceSourceTemplate(candidate.template);
      if (!test.success) {
        result.testFailedCount += 1;
        addReason(result, `${source.shopName}: ${candidate.reason} / ${test.reason}`);
        continue;
      }

      const enable = Boolean(options.allowEnable);
      await client.priceSource.update({
        where: { id: source.id },
        data: {
          searchUrlTemplate: candidate.template,
          enabled: enable,
          lastCheckedAt: new Date(),
          lastSuccessAt: new Date(),
          lastHttpStatus: test.httpStatus,
          successCount: { increment: 1 },
          lastError: null,
          memo: appendMemo(source.memo, [
            "searchUrlTemplateを自動推定しました。",
            `template: ${candidate.template}`,
            `reason: ${candidate.reason}`,
            enable ? "設定により自動有効化しました。" : "enabled: false のまま保存しました。"
          ])
        }
      });
      result.inferredCount = 1;
      result.testSuccessCount += 1;
      if (enable) result.enabledCount = 1;
      return result;
    }

    result.inferenceFailedCount = 1;
    await markInferenceFailure(client, source.id, "推定候補のテスト取得に失敗しました");
  } catch (error) {
    result.inferenceFailedCount = 1;
    result.testFailedCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    await markInferenceFailure(client, source.id, message);
    addReason(result, `${source.shopName}: ${message}`);
  }

  return result;
}

export function inferTemplatesFromHtml(baseUrl: string, html: string): Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const form of html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)) {
    const formHtml = form[0];
    if (!/search|keyword|query|word|name|買取|検索|探す/i.test(formHtml)) continue;
    const action = attr(formHtml, "action") || baseUrl;
    for (const input of formHtml.matchAll(/<input\b[^>]*>/gi)) {
      const name = attr(input[0], "name");
      if (!name || !searchParamNames.includes(name.toLowerCase())) continue;
      addCandidate(candidates, seen, buildTemplate(baseUrl, action, name), `form action=${action} input name=${name}`);
    }
  }

  for (const hrefMatch of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodeHtml(hrefMatch[1]);
    const label = stripTags(hrefMatch[2]);
    const text = `${href} ${label}`;
    if (!/search|keyword|query|word|name|買取|買取価格|買取表|検索/i.test(text)) continue;
    const url = safeUrl(href, baseUrl);
    if (!url) continue;
    for (const param of searchParamNames) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, "{keyword}");
        addCandidate(candidates, seen, url.toString().replace("%7Bkeyword%7D", "{keyword}"), `search link param=${param}`);
      }
    }
  }

  const current = safeUrl(baseUrl, baseUrl);
  if (current) {
    for (const param of searchParamNames) {
      if (current.searchParams.has(param)) {
        current.searchParams.set(param, "{keyword}");
        addCandidate(candidates, seen, current.toString().replace("%7Bkeyword%7D", "{keyword}"), `baseUrl param=${param}`);
      }
    }
  }

  return candidates;
}

export async function testPriceSourceTemplate(template: string) {
  if (!template.includes("{keyword}")) return { success: false, reason: "{keyword} がありません", httpStatus: null as number | null };
  if (/example\.com|placeholder/i.test(template)) return { success: false, reason: "プレースホルダーURLです", httpStatus: null as number | null };

  for (const keyword of pokemonPriceTestKeywords) {
    const url = template.replace("{keyword}", encodeURIComponent(keyword));
    try {
      const response = await fetchText(url);
      const text = response.html.slice(0, 120000);
      const cleanHasBuyback = hasPokemonCardContext(text) && hasBuybackIntent(text);
      const cleanSalesOnly = cleanSalesOnlyKeywords.some((word) => text.includes(word)) && !cleanHasBuyback;
      if (response.status === 200 && cleanHasBuyback && !cleanSalesOnly) {
        return { success: true, reason: "ポケモンカード買取HTMLを確認しました", httpStatus: response.status };
      }
      const hasBuyback = buybackKeywords.some((word) => text.includes(word));
      const salesOnly = salesOnlyKeywords.some((word) => text.includes(word)) && !text.includes("買取");
      if (response.status === 200 && hasBuyback && !salesOnly) {
        return { success: true, reason: "テスト取得成功", httpStatus: response.status };
      }
    } catch {
      // Try the next keyword.
    }
  }
  return { success: false, reason: "テストキーワードで買取系HTMLを確認できませんでした", httpStatus: null as number | null };
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "LotteryResaleTracker/1.0 (+local personal use)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    const html = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { status: response.status, html };
  } finally {
    clearTimeout(timeout);
  }
}

function buildTemplate(baseUrl: string, action: string, paramName: string) {
  const url = safeUrl(action, baseUrl) ?? new URL(baseUrl);
  url.searchParams.set(paramName, "{keyword}");
  return url.toString().replace("%7Bkeyword%7D", "{keyword}");
}

function attr(html: string, name: string) {
  const pattern = new RegExp(`${name}=["']([^"']+)["']`, "i");
  return decodeHtml(html.match(pattern)?.[1] ?? "");
}

function safeUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl);
  } catch {
    return null;
  }
}

function addCandidate(candidates: Candidate[], seen: Set<string>, template: string, reason: string) {
  if (!template.includes("{keyword}") || seen.has(template)) return;
  seen.add(template);
  candidates.push({ template, reason });
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"");
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function emptyResult(): TemplateInferenceResult {
  return {
    checkedCount: 0,
    basePriceSourceCount: 0,
    inferredCount: 0,
    inferenceFailedCount: 0,
    testSuccessCount: 0,
    testFailedCount: 0,
    enabledCount: 0,
    skippedReasons: []
  };
}

function mergeResult(target: TemplateInferenceResult, source: TemplateInferenceResult) {
  target.checkedCount += source.checkedCount;
  target.inferredCount += source.inferredCount;
  target.inferenceFailedCount += source.inferenceFailedCount;
  target.testSuccessCount += source.testSuccessCount;
  target.testFailedCount += source.testFailedCount;
  target.enabledCount += source.enabledCount;
  target.skippedReasons.push(...source.skippedReasons);
}

function addReason(result: TemplateInferenceResult, reason: string) {
  result.skippedReasons.push(reason);
}

async function markInferenceFailure(client: PrismaClient, id: string, message: string) {
  await client.priceSource.update({
    where: { id },
    data: {
      lastCheckedAt: new Date(),
      failureCount: { increment: 1 },
      lastError: `searchUrlTemplate推定失敗: ${message}`
    }
  });
}

function appendMemo(memo: string | null, lines: string[]) {
  return [memo, lines.join("\n")].filter(Boolean).join("\n\n");
}

function isHighTrustMemo(memo: string | null) {
  return Boolean(memo?.includes("aiTrustLevel: high") || memo?.includes("trust: high"));
}
