import Link from "next/link";
import { ignoreLotteryListing, runPriceCheckForListingAction, runSourceCuratorAction, setApplicationMilestone } from "@/lib/actions";
import { applicationStatusLabels, dateOnly, multiple, percent, priceStatusLabels, yen } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { priorityLabelText, priorityTone } from "@/lib/priority";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { Badge, buttonClass, Card, EmptyState, inputClass, PageHeader, secondaryButtonClass, smallButtonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type SimpleListing = Awaited<ReturnType<typeof getSimpleListings>>[number];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function boolParam(searchParams: SearchParams, key: string, defaultValue: boolean) {
  const value = first(searchParams[key]);
  if (value === undefined) return defaultValue;
  return value === "true";
}

async function getSimpleListings(searchParams: SearchParams) {
  const now = new Date();
  const showEnded = boolParam(searchParams, "showEnded", false);
  const profitOnly = boolParam(searchParams, "profitOnly", true);
  const priorityOnly = boolParam(searchParams, "priorityOnly", false);
  const priceFoundOnly = boolParam(searchParams, "priceFoundOnly", true);
  const hideIgnored = boolParam(searchParams, "hideIgnored", true);
  const noiseKeywords = ["Snow Man", "Blu-ray", "DVD", "CD", "アナログレコード", "ファイナルファンタジー", "ゴールドポイント", "ゲームソフト", "映像作品", "音楽作品"];

  const listings = await prisma.lotteryListing.findMany({
    where: {
      AND: [
        hideIgnored ? { ignored: false } : {},
        showEnded ? {} : { status: "active", applicationEndAt: { gte: now } },
        showEnded
          ? {}
          : {
              discoveryType: "current_lottery_application",
              aiIsLotteryApplicationPage: true,
              aiIsCurrentlyOpen: true,
              aiIsPastOrEnded: false,
              aiIsJustArticle: false,
              aiIsProductSalesPage: false,
              aiExcludeReason: null
            },
        profitOnly ? { estimatedProfit: { gt: 0 } } : {},
        priorityOnly ? { applicationPriorityLabel: { in: ["S", "A", "B"] } } : {},
        priceFoundOnly ? { priceStatus: "found", bestBuyPrice: { not: null } } : {},
        ...noiseKeywords.map((keyword) => ({
          NOT: {
            OR: [
              { productName: { contains: keyword } },
              { title: { contains: keyword } },
              { description: { contains: keyword } },
              { rawText: { contains: keyword } }
            ]
          }
        }))
      ]
    },
    include: { priceRecords: { orderBy: [{ price: "desc" }, { confidenceScore: "desc" }], take: 1 } },
    take: 300
  });

  return listings
    .filter((listing) => !placeholderSourceReason({ name: listing.sourceName, url: listing.sourceUrl }))
    .sort((a, b) => {
    const aConfidence = a.priceRecords[0]?.confidenceScore ?? 0;
    const bConfidence = b.priceRecords[0]?.confidenceScore ?? 0;
    const aActive = isAccepting(a, now) ? 1 : 0;
    const bActive = isAccepting(b, now) ? 1 : 0;
    const aProfit = (a.estimatedProfit ?? 0) > 0 ? 1 : 0;
    const bProfit = (b.estimatedProfit ?? 0) > 0 ? 1 : 0;
    const aPokemon = isPokemonCardListing(a) ? 1 : 0;
    const bPokemon = isPokemonCardListing(b) ? 1 : 0;
    const aAiPreferred = isAiPreferredListing(a) ? 1 : 0;
    const bAiPreferred = isAiPreferredListing(b) ? 1 : 0;
    const aAiConfidence = a.aiConfidenceScore ?? 0;
    const bAiConfidence = b.aiConfidenceScore ?? 0;
    const aPriceFound = a.priceStatus === "found" ? 1 : 0;
    const bPriceFound = b.priceStatus === "found" ? 1 : 0;
    const aPriorityRank = priorityRank(a.applicationPriorityLabel);
    const bPriorityRank = priorityRank(b.applicationPriorityLabel);
    const aDeadline = a.applicationEndAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDeadline = b.applicationEndAt?.getTime() ?? Number.MAX_SAFE_INTEGER;

    return (
      bAiPreferred - aAiPreferred ||
      bPokemon - aPokemon ||
      bActive - aActive ||
      bProfit - aProfit ||
      bPriceFound - aPriceFound ||
      bPriorityRank - aPriorityRank ||
      aDeadline - bDeadline ||
      (b.roi ?? -Infinity) - (a.roi ?? -Infinity) ||
      bConfidence - aConfidence ||
      bAiConfidence - aAiConfidence ||
      b.applicationPriorityScore - a.applicationPriorityScore
    );
    });
}

async function getSimpleDiagnostics() {
  const now = new Date();
  const [enabledWatchSources, enabledPriceSources, activeListingCount, currentDiscoveryCandidateCount, priceDiscoveryCandidateCount] = await Promise.all([
    prisma.watchSource.findMany({ where: { enabled: true } }),
    prisma.priceSource.findMany({ where: { enabled: true } }),
    prisma.lotteryListing.count({
      where: {
        status: "active",
        ignored: false,
        applicationEndAt: { gte: now }
      }
    }),
    prisma.discoveredSource.count({
      where: {
        status: "new",
        discoveryType: "current_lottery_application",
        OR: [
          { aiClassifiedAt: null },
          {
            aiIsLotteryApplicationPage: true,
            aiIsCurrentlyOpen: true,
            aiIsPastOrEnded: false,
            aiIsJustArticle: false
          }
        ]
      }
    }),
    prisma.discoveredSource.count({
      where: {
        status: "new",
        OR: [{ discoveryType: "price_buyback_page" }, { detectedType: "price_source_candidate" }]
      }
    })
  ]);

  return {
    activeListingCount,
    enabledWatchSourceCount: enabledWatchSources.length,
    enabledRealWatchSourceCount: enabledWatchSources.filter((source) => !placeholderSourceReason(source)).length,
    enabledPriceSourceCount: enabledPriceSources.length,
    enabledRealPriceSourceCount: enabledPriceSources.filter(
      (source) => !placeholderSourceReason(source) && source.searchUrlTemplate.includes("{keyword}")
    ).length,
    currentDiscoveryCandidateCount,
    priceDiscoveryCandidateCount
  };
}

export default async function SimplePage({ searchParams }: { searchParams: SearchParams }) {
  const showEnded = boolParam(searchParams, "showEnded", false);
  const profitOnly = boolParam(searchParams, "profitOnly", true);
  const priorityOnly = boolParam(searchParams, "priorityOnly", false);
  const priceFoundOnly = boolParam(searchParams, "priceFoundOnly", true);
  const hideIgnored = boolParam(searchParams, "hideIgnored", true);
  const [listings, diagnostics] = await Promise.all([
    getSimpleListings(searchParams),
    getSimpleDiagnostics()
  ]);

  return (
    <>
      <PageHeader
        title="シンプルモード"
        description="応募判断に必要な抽選情報、定価、買取価格、想定利益、ROIだけを1画面で確認します。"
      >
        <Link href="/lotteries" className={secondaryButtonClass}>詳細一覧へ</Link>
      </PageHeader>

      {false && diagnostics.enabledRealPriceSourceCount === 0 ? (
        <Card className="mb-5 border-rose-200 bg-rose-50/70 p-4 text-sm leading-6 text-rose-900">
          <div className="font-semibold">有効な価格ソースがありません</div>
          <div className="mt-1">
            PriceSource Discovery を実行し、<Link href="/source-discovery" className="font-medium underline">/source-discovery</Link> で候補を確認したうえで、
            <Link href="/price-sources" className="font-medium underline">/price-sources</Link> から使う価格ソースを有効化してください。
          </div>
        </Card>
      ) : null}

      {diagnostics.enabledRealPriceSourceCount === 0 ? (
        <Card className="mb-5 border-rose-200 bg-rose-50/70 p-4 text-sm leading-6 text-rose-900">
          <div className="font-semibold">有効な実URLのPriceSourceがありません</div>
          <div className="mt-1">
            PriceSource Discoveryを実行し、<Link href="/source-discovery?quickFilter=price" className="font-medium underline">/source-discovery</Link> で候補を確認したうえで、
            <Link href="/price-sources" className="font-medium underline">/price-sources</Link> から使う価格ソースを有効化してください。
          </div>
        </Card>
      ) : null}

      <Card className="mb-5 border-teal-200 bg-teal-50/50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-teal-950">普段はこの画面だけで確認できます</h2>
            <p className="mt-1 text-sm leading-6 text-teal-900">
              デフォルトでは、受付中かつ利益がある候補を、締切が近い順、ROIが高い順、価格信頼度が高い順で表示します。
            </p>
          </div>
          <div className="text-sm text-teal-900">
            表示件数 <span className="font-semibold tabular-nums">{listings.length}</span> 件
          </div>
        </div>
      </Card>

      <Card className="mb-5 p-4">
        <form className="grid gap-3 md:grid-cols-5">
          <FilterSelect label="終了済みも表示" name="showEnded" value={showEnded} />
          <FilterSelect label="利益ありのみ" name="profitOnly" value={profitOnly} />
          <FilterSelect label="S/Aランクのみ" name="priorityOnly" value={priorityOnly} />
          <FilterSelect label="価格取得済みのみ" name="priceFoundOnly" value={priceFoundOnly} />
          <FilterSelect label="無視を非表示" name="hideIgnored" value={hideIgnored} />
          <div className="flex items-end md:col-span-5">
            <button className={buttonClass} type="submit">表示を更新</button>
          </div>
        </form>
      </Card>

      {listings.length === 0 ? <SimpleEmptyGuidance diagnostics={diagnostics} /> : null}

      {false && listings.length === 0 ? (
        <EmptyState
          title="判断できる候補がありません"
          message="フィルターを緩めるか、抽選情報収集、価格取得、定価入力の状態を確認してください。"
          action={<Link href="/settings/operations" className={secondaryButtonClass}>運用設定を確認</Link>}
        />
      ) : (
        <div className="grid gap-4">
          {listings.map((listing) => (
            <SimpleListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </>
  );
}

function SimpleEmptyGuidance({ diagnostics }: { diagnostics: Awaited<ReturnType<typeof getSimpleDiagnostics>> }) {
  const causes = [
    diagnostics.activeListingCount === 0 ? "受付中の抽選がありません" : null,
    diagnostics.enabledRealWatchSourceCount === 0 ? "有効なWatchSourceがありません" : null,
    diagnostics.enabledRealPriceSourceCount === 0 ? "有効なPriceSourceがありません" : null,
    diagnostics.currentDiscoveryCandidateCount === 0 ? "現在受付中のDiscovery候補がありません" : null,
    diagnostics.priceDiscoveryCandidateCount === 0 ? "買取価格ページ候補がありません" : null
  ].filter(Boolean);

  return (
    <Card className="border-amber-200 bg-amber-50/70 p-5">
      <h2 className="text-lg font-semibold text-amber-950">/simple に表示できる候補がありません</h2>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        厳しめの条件で「現在応募できる抽選」「利益あり」「価格取得済み」を優先表示しています。以下を順に確認してください。
      </p>
      <div className="mt-4 grid gap-2 text-sm text-amber-950">
        {causes.map((cause) => (
          <div key={cause} className="rounded-md border border-amber-200 bg-white/60 px-3 py-2">{cause}</div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/source-discovery?quickFilter=current" className={secondaryButtonClass}>Source Discoveryを確認</Link>
        <Link href="/source-discovery?quickFilter=price" className={secondaryButtonClass}>PriceSource Discoveryを確認</Link>
        <Link href="/sources" className={secondaryButtonClass}>WatchSourceを有効化</Link>
        <Link href="/price-sources" className={secondaryButtonClass}>PriceSourceを有効化</Link>
        {diagnostics.currentDiscoveryCandidateCount > 0 || diagnostics.priceDiscoveryCandidateCount > 0 ? (
          <form action={runSourceCuratorAction}>
            <button className={buttonClass} type="submit">AI Source Curatorを実行</button>
          </form>
        ) : null}
        <Link href="/settings/operations" className={buttonClass}>運用タスクを実行</Link>
      </div>
      <div className="mt-3 text-xs leading-5 text-amber-800">
        現在の状態: active抽選 {diagnostics.activeListingCount} 件 / 有効WatchSource {diagnostics.enabledRealWatchSourceCount} 件 / 有効PriceSource {diagnostics.enabledRealPriceSourceCount} 件 / 受付中候補 {diagnostics.currentDiscoveryCandidateCount} 件 / 価格候補 {diagnostics.priceDiscoveryCandidateCount} 件
      </div>
    </Card>
  );
}

function SimpleListingCard({ listing }: { listing: SimpleListing }) {
  const confidence = listing.priceRecords[0]?.confidenceScore ?? 0;
  const accepting = isAccepting(listing, new Date());
  const profitPositive = (listing.estimatedProfit ?? 0) > 0;

  return (
    <Card className={`p-4 ${listing.ignored ? "opacity-70" : ""}`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(280px,1.2fr)_minmax(520px,2fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <PriorityBadge label={listing.applicationPriorityLabel} score={listing.applicationPriorityScore} />
            <Badge tone={accepting ? "success" : "neutral"}>{accepting ? "受付中" : "受付外"}</Badge>
            {profitPositive ? <Badge tone="success">利益あり</Badge> : <Badge tone="warning">利益要確認</Badge>}
            {listing.ignored ? <Badge tone="danger">無視中</Badge> : null}
            {listing.aiClassifiedAt ? (
              <Badge tone={isAiPreferredListing(listing) ? "success" : "warning"}>
                AI {listing.aiConfidenceScore?.toFixed(2) ?? "-"}
              </Badge>
            ) : null}
          </div>
          <Link href={`/lotteries/${listing.id}`} className="text-base font-semibold leading-7 hover:text-primary">
            {listing.productName}
          </Link>
          <div className="mt-1 text-sm text-muted-foreground">{listing.storeName}</div>
          <div className="mt-2 text-sm">
            応募締切: <span className="font-semibold tabular-nums">{dateOnly(listing.applicationEndAt)}</span>
          </div>
          <a className="mt-2 block break-all text-xs text-primary hover:underline" href={listing.lotteryUrl} target="_blank" rel="noreferrer">
            {compactUrl(listing.lotteryUrl)}
          </a>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6">
          <Metric label="定価" value={yen(listing.retailPrice)} />
          <Metric label="最高買取価格" value={yen(listing.bestBuyPrice)} strong />
          <Metric label="想定利益" value={yen(listing.estimatedProfit)} strong tone={profitPositive ? "success" : "warning"} />
          <Metric label="利益率" value={percent(listing.profitRate)} />
          <Metric label="ROI" value={percent(listing.roi)} strong />
          <Metric label="倍率" value={multiple(listing.priceMultiplier)} />
          <Metric label="価格信頼度" value={`${confidence.toFixed(2)} ${confidenceLabel(confidence, listing.priceStatus)}`} tone={confidence >= 0.7 ? "success" : "warning"} />
          <Metric label="価格状態" value={priceStatusLabels[listing.priceStatus] ?? listing.priceStatus} />
          <Metric label="応募状況" value={applicationStatusLabels[listing.applicationStatus] ?? listing.applicationStatus} />
        </div>

        <div className="flex flex-wrap gap-2 xl:w-44 xl:flex-col">
          <a className={secondaryButtonClass} href={listing.lotteryUrl} target="_blank" rel="noreferrer">元ページを開く</a>
          <form action={setApplicationMilestone}>
            <input type="hidden" name="id" value={listing.id} />
            <input type="hidden" name="applicationStatus" value="applied" />
            <button className={`${buttonClass} w-full`} type="submit">応募した</button>
          </form>
          <form action={ignoreLotteryListing}>
            <input type="hidden" name="id" value={listing.id} />
            <input type="hidden" name="ignoredReason" value="シンプルモードで無視" />
            <button className={`${smallButtonClass} w-full text-rose-700`} type="submit">無視する</button>
          </form>
          <form action={runPriceCheckForListingAction}>
            <input type="hidden" name="id" value={listing.id} />
            <button className={`${smallButtonClass} w-full`} type="submit">価格を再取得</button>
          </form>
          <Link href={`/lotteries/${listing.id}`} className={secondaryButtonClass}>詳細を見る</Link>
        </div>
      </div>
    </Card>
  );
}

function FilterSelect({ label, name, value }: { label: string; name: string; value: boolean }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <select className={inputClass} name={name} defaultValue={String(value)}>
        <option value="true">ON</option>
        <option value="false">OFF</option>
      </select>
    </label>
  );
}

function Metric({
  label,
  value,
  strong,
  tone
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-md bg-muted/45 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words tabular-nums ${strong ? "text-lg font-semibold" : "font-medium"} ${tone === "success" ? "text-emerald-700" : ""} ${tone === "warning" ? "text-amber-700" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function PriorityBadge({ label, score }: { label: string; score: number }) {
  return (
    <Badge tone={priorityTone(label) as "success" | "primary" | "warning" | "neutral" | "danger"}>
      {label}: {priorityLabelText(label)} ({score})
    </Badge>
  );
}

function confidenceLabel(score: number, priceStatus: string) {
  if (priceStatus !== "found") return "未取得";
  if (score >= 0.85) return "高信頼";
  if (score >= 0.7) return "信頼";
  if (score >= 0.5) return "要確認";
  return "低信頼";
}

function isAccepting(listing: { status: string; applicationEndAt: Date | null }, now: Date) {
  return listing.status === "active" && (!listing.applicationEndAt || listing.applicationEndAt.getTime() >= now.getTime());
}

function isPokemonCardListing(listing: { productName: string; title: string; description: string | null; rawText: string | null }) {
  const text = `${listing.productName} ${listing.title} ${listing.description ?? ""} ${listing.rawText ?? ""}`.toLowerCase();
  return ["ポケモンカード", "ポケカ", "pokemon", "スペシャルbox", "拡張パック"].some((keyword) => text.includes(keyword.toLowerCase()));
}

function isAiPreferredListing(listing: {
  aiIsLotteryApplicationPage: boolean | null;
  aiIsCurrentlyOpen: boolean | null;
  aiIsPastOrEnded: boolean | null;
  aiIsJustArticle: boolean | null;
  aiIsProductSalesPage: boolean | null;
  aiCategory: string | null;
  aiExcludeReason: string | null;
}) {
  return (
    listing.aiIsLotteryApplicationPage === true &&
    listing.aiIsCurrentlyOpen === true &&
    listing.aiIsPastOrEnded === false &&
    listing.aiIsJustArticle === false &&
    listing.aiIsProductSalesPage !== true &&
    !listing.aiExcludeReason &&
    (listing.aiCategory === "pokemon_card" || listing.aiCategory === "trading_card")
  );
}

function priorityRank(label: string) {
  return { S: 5, A: 4, B: 3, C: 2, D: 1 }[label] ?? 0;
}

function compactUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return value;
  }
}
