import { PrismaClient } from "@prisma/client";
import { calculatePriceMetrics } from "../lib/priceCalculations";
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
  await prisma.priceSourcePreset.deleteMany();
  await prisma.exclusionKeyword.deleteMany();
  await prisma.collectorRunItem.deleteMany();
  await prisma.collectorRun.deleteMany();
  await prisma.lotteryListing.deleteMany();
  await prisma.watchSource.deleteMany();
  await prisma.discoveredSource.deleteMany();
  await prisma.discoveryQuery.deleteMany();
  await prisma.sourcePreset.deleteMany();

  await prisma.discoveryQuery.createMany({
    data: [
      { name: "ポケモンカード 抽選販売", query: "ポケモンカード 抽選販売", type: "watch_source", category: "pokemon", enabled: true },
      { name: "ポケカ 抽選 予約", query: "ポケカ 抽選 予約", type: "watch_source", category: "pokemon", enabled: true },
      { name: "ポケモンカード スペシャルBOX 抽選", query: "ポケモンカード スペシャルBOX 抽選", type: "watch_source", category: "pokemon", enabled: true },
      { name: "ポケモンカード 買取価格", query: "ポケモンカード 買取価格", type: "price_source", category: "pokemon", enabled: true },
      { name: "ポケカ 買取価格", query: "ポケカ 買取価格", type: "price_source", category: "pokemon", enabled: true },
      { name: "ポケモンカード 買取表", query: "ポケモンカード 買取表", type: "price_source", category: "pokemon", enabled: true },
      { name: "ポケカ 買取表", query: "ポケカ 買取表", type: "price_source", category: "pokemon", enabled: true },
      { name: "スペシャルBOX 買取価格", query: "スペシャルBOX 買取価格", type: "price_source", category: "pokemon", enabled: true },
      { name: "ポケモンセンター ヒロシマ BOX 買取", query: "ポケモンセンター ヒロシマ BOX 買取", type: "price_source", category: "pokemon", enabled: true },
      { name: "ポケモンカード BOX 買取検索", query: "ポケモンカード BOX 買取検索", type: "price_source", category: "pokemon", enabled: true },
      { name: "スペシャルBOX 買取", query: "スペシャルBOX 買取", type: "price_source", category: "pokemon", enabled: true },
      { name: "トレカ 抽選販売", query: "トレカ 抽選販売", type: "watch_source", category: "trading_card", enabled: true },
      { name: "トレカ 買取検索", query: "トレカ 買取検索", type: "price_source", category: "trading_card", enabled: true },
      { name: "トレカ 買取価格 検索", query: "トレカ 買取価格 検索", type: "price_source", category: "trading_card", enabled: true },
      { name: "トレカ 買取表 ポケカ", query: "トレカ 買取表 ポケカ", type: "price_source", category: "trading_card", enabled: true }
    ]
  });

  await prisma.watchSource.createMany({
    data: [
      {
        name: "ポケモンセンターオンライン",
        storeName: "ポケモンセンターオンライン",
        url: "https://www.pokemoncenter-online.com/",
        type: "html",
        enabled: false,
        memo: "初期サンプルです。サイトポリシーを確認してから有効化してください。"
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
        category: "pokemon",
        description: "公式オンラインストアの公開トップページです。抽選販売ページやお知らせURLは実運用前に確認してください。",
        defaultEnabled: false,
        recommended: true,
        tags: "pokemon,ポケモンカード,公式,BOX",
        memo: "要確認: 実際に巡回する前にサイトポリシーと対象URLを確認してください。"
      },
      {
        name: "ポケモンカードゲーム公式",
        storeName: "ポケモンカード公式",
        url: "https://www.pokemon-card.com/",
        type: "html",
        category: "pokemon",
        description: "公式情報の公開ページ候補です。抽選販売情報そのものではない可能性があります。",
        defaultEnabled: false,
        recommended: true,
        tags: "pokemon,ポケカ,公式,ニュース",
        memo: "要確認: ニュースや商品ページなど、より適切なURLがあれば差し替えてください。"
      },
      {
        name: "ヨドバシ.com お知らせ候補",
        storeName: "ヨドバシカメラ",
        url: "https://www.yodobashi.com/",
        type: "html",
        category: "electronics",
        description: "抽選販売やお知らせページの候補です。具体的な抽選ページURLは要確認です。",
        defaultEnabled: false,
        recommended: false,
        tags: "家電,抽選販売,ゲーム,トレカ",
        memo: "要確認: 抽選販売ページのURLが変わる可能性があります。"
      },
      {
        name: "ビックカメラ 抽選販売候補",
        storeName: "ビックカメラ",
        url: "https://www.biccamera.com/",
        type: "html",
        category: "electronics",
        description: "抽選販売ページ候補です。実際の公開ページURLに差し替えてください。",
        defaultEnabled: false,
        recommended: false,
        tags: "家電,抽選販売,ゲーム",
        memo: "要確認: ログイン不要の公開ページのみを対象にしてください。"
      },
      {
        name: "GEO お知らせ候補",
        storeName: "GEO",
        url: "https://geo-online.co.jp/",
        type: "html",
        category: "trading_card",
        description: "GEOのお知らせ/抽選販売候補です。具体的な公開URLは要確認です。",
        defaultEnabled: false,
        recommended: false,
        tags: "トレカ,ゲーム,抽選販売",
        memo: "要確認: URLと利用規約を確認してから有効化してください。"
      },
      {
        name: "TSUTAYA トレカお知らせ候補",
        storeName: "TSUTAYA",
        url: "https://tsutaya.tsite.jp/",
        type: "html",
        category: "trading_card",
        description: "TSUTAYAの抽選/トレカお知らせ候補です。具体的な公開URLは要確認です。",
        defaultEnabled: false,
        recommended: false,
        tags: "トレカ,抽選販売,お知らせ",
        memo: "要確認: 店舗別ページやキャンペーンページはURL変更の可能性があります。"
      },
      {
        name: "カードショップお知らせRSS プレースホルダー",
        storeName: "カードショップ例",
        url: "https://example.com/card-shop-news.xml",
        type: "rss",
        category: "trading_card",
        description: "カードショップ系のお知らせRSSを登録するためのプレースホルダーです。",
        defaultEnabled: false,
        recommended: false,
        tags: "トレカ,RSS,買取,抽選",
        memo: "要差し替え: 実在する公開RSSに変更してください。"
      }
    ]
  });

  await prisma.priceSourcePreset.createMany({
    data: [
      {
        name: "トレカ買取検索 プレースホルダー",
        shopName: "トレカ買取店例",
        baseUrl: "https://example.com/",
        searchUrlTemplate: "https://example.com/search?q={keyword}",
        category: "trading_card",
        description: "{keyword} に商品名をURLエンコードして差し込む価格検索URLの例です。",
        defaultEnabled: false,
        recommended: false,
        tags: "トレカ,買取,検索,要差し替え",
        memo: "要差し替え: 実在するログイン不要の公開検索ページに変更してください。"
      },
      {
        name: "カードショップ買取検索 プレースホルダー",
        shopName: "カードショップ例",
        baseUrl: "https://example.com/card/",
        searchUrlTemplate: "https://example.com/card/search?keyword={keyword}",
        category: "trading_card",
        description: "カードショップ系の買取検索ページを登録するためのプレースホルダーです。",
        defaultEnabled: false,
        recommended: false,
        tags: "ポケカ,BOX,買取価格,要確認",
        memo: "要確認: 販売価格ページではなく買取価格ページを指定してください。"
      },
      {
        name: "ポケモンカード買取検索 プレースホルダー",
        shopName: "ポケカ買取店例",
        baseUrl: "https://example.com/pokemon-card/",
        searchUrlTemplate: "https://example.com/pokemon-card/buy?q={keyword}",
        category: "pokemon",
        description: "ポケモンカード向け買取検索URLの例です。",
        defaultEnabled: false,
        recommended: false,
        tags: "pokemon,ポケカ,スペシャルBOX,買取",
        memo: "要差し替え: 実在する公開ページの検索URLテンプレートに変更してください。"
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
