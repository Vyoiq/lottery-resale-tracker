import { PrismaClient } from "@prisma/client";
import { calculatePriceMetrics } from "../lib/priceCalculations";
import { calculateActualSaleMetrics } from "../lib/salesCalculations";
import { recalculateAllListingPriorities } from "../lib/priorityService";

const prisma = new PrismaClient();

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 999);
  return date;
};

async function main() {
  await prisma.operationRun.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.backupRecord.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.priceCollectorRun.deleteMany();
  await prisma.priceRecord.deleteMany();
  await prisma.priceSource.deleteMany();
  await prisma.exclusionKeyword.deleteMany();
  await prisma.collectorRunItem.deleteMany();
  await prisma.collectorRun.deleteMany();
  await prisma.lotteryListing.deleteMany();
  await prisma.watchSource.deleteMany();
  await prisma.sourcePreset.deleteMany();

  await prisma.watchSource.createMany({
    data: [
      {
        name: "ポケモンセンターオンライン",
        storeName: "ポケモンセンターオンライン",
        url: "https://www.pokemoncenter-online.com/",
        type: "html",
        enabled: false,
        memo: "公開ページのみを低頻度で巡回してください。サイトポリシーを確認してから有効化します。"
      },
      {
        name: "サンプルRSS",
        storeName: "サンプル店舗",
        url: "https://example.com/rss.xml",
        type: "rss",
        enabled: false,
        memo: "RSS形式の監視ソース例です。実在する公開RSSに差し替えてください。"
      }
    ]
  });

  await prisma.sourcePreset.createMany({
    data: [
      {
        name: "ポケモンセンターオンライン",
        storeName: "ポケモンセンターオンライン",
        url: "https://www.pokemoncenter-online.com/",
        type: "html",
        category: "ポケモンカード",
        description: "公開トップページ。実運用前にサイトポリシーを確認してください。",
        defaultEnabled: false
      },
      {
        name: "ポケモンカードゲーム トレーナーズウェブサイト",
        storeName: "ポケモンカード公式",
        url: "https://www.pokemon-card.com/",
        type: "html",
        category: "ポケモンカード",
        description: "公式情報の公開ページ候補です。大量巡回はしないでください。",
        defaultEnabled: false
      }
    ]
  });

  await prisma.priceSource.create({
    data: {
      name: "サンプル買取検索",
      shopName: "サンプル買取店",
      baseUrl: "https://example.com/",
      searchUrlTemplate: "https://example.com/search?q={keyword}",
      enabled: false,
      memo: "価格取得元の形式例です。ログイン不要の公開検索ページに差し替えてください。"
    }
  });

  await prisma.exclusionKeyword.createMany({
    data: [
      { keyword: "オリパ", enabled: true, memo: "抽選販売ではないランダム商品販売の可能性が高い" },
      { keyword: "くじ", enabled: true },
      { keyword: "中古", enabled: true },
      { keyword: "傷あり", enabled: true },
      { keyword: "開封済み", enabled: true },
      { keyword: "販売価格のみ", enabled: true },
      { keyword: "在庫なし", enabled: true }
    ]
  });

  const productName = "ポケモンカードゲーム スカーレット＆バイオレット スペシャルBOX ポケモンセンターヒロシマ";
  const retailPrice = 2090;
  const bestBuyPrice = 31000;
  const metrics = calculatePriceMetrics({ retailPrice, bestBuyPrice });
  const actual = calculateActualSaleMetrics({ purchasePrice: retailPrice, salePrice: bestBuyPrice, shippingCost: 0, fee: 0 });

  const listing = await prisma.lotteryListing.create({
    data: {
      title: "抽選販売 サンプル: スペシャルBOX ポケモンセンターヒロシマ",
      productName,
      storeName: "サンプル店舗",
      sourceName: "seed sample",
      sourceUrl: "https://example.com/",
      lotteryUrl: "https://example.com/lottery/sample",
      description: "自動検出結果、価格計算、応募状況、売却実績の表示確認用サンプルです。",
      applicationStartAt: daysFromNow(-20),
      applicationEndAt: daysFromNow(2),
      resultAnnouncementAt: daysFromNow(5),
      purchaseDeadlineAt: daysFromNow(9),
      detectedAt: daysFromNow(-1),
      lastSeenAt: new Date(),
      status: "active",
      confidenceScore: 0.8,
      matchedKeywords: "抽選, 応募, 受付, ポケモンカード, BOX",
      confidenceReason: "タイトルと本文に抽選系キーワードが複数含まれるため",
      extractedDatesRaw: "2026年5月10日 23:59まで",
      normalizedUrl: "https://example.com/lottery/sample",
      contentHash: "seed-sample",
      retailPrice,
      bestBuyPrice,
      estimatedProfit: metrics.estimatedProfit,
      profitRate: metrics.profitRate,
      roi: metrics.roi,
      priceMultiplier: metrics.priceMultiplier,
      priceCheckedAt: new Date(),
      priceStatus: "found",
      applicationPriorityScore: 100,
      applicationPriorityLabel: "S",
      ignored: false,
      userVerdict: "good",
      userVerdictMemo: "サンプル確認用",
      userVerdictAt: new Date(),
      applicationStatus: "not_applied",
      rawText: "抽選販売 応募 受付 限定 ポケモンカード BOX"
    }
  });

  await prisma.priceRecord.create({
    data: {
      lotteryListingId: listing.id,
      productName,
      shopName: "サンプル買取店",
      price: bestBuyPrice,
      sourceUrl: "https://example.com/buy/sample",
      matchedTitle: "スペシャルBOX ポケモンセンターヒロシマ",
      confidenceScore: 0.95,
      rawText: "スペシャルBOX ポケモンセンターヒロシマ 買取価格 31,000円"
    }
  });

  await recalculateAllListingPriorities(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
