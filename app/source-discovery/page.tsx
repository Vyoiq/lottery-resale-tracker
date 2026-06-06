import Link from "next/link";
import {
  addDiscoveredPriceSourceAction,
  addDiscoveredWatchSourceAction,
  bulkAddDiscoveredPriceCandidatesAction,
  bulkAddDiscoveredPriceSourcesAction,
  bulkAddDiscoveredWatchCandidatesAction,
  bulkAddDiscoveredWatchSourcesAction,
  bulkIgnoreDiscoveredSourcesAction,
  createDiscoveryQueryAction,
  ignoreDiscoveredSourceAction,
  runPriceSourceDiscoveryAction,
  runAiClassificationAction,
  runSourceCuratorAction,
  runSourceDiscoveryAction,
  toggleDiscoveryQueryAction
} from "@/lib/actions";
import { dateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { Badge, buttonClass, Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass, smallButtonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  pokemon: "ポケモン",
  trading_card: "トレカ",
  electronics: "家電",
  stationery: "文具",
  other: "その他"
};

const typeLabels: Record<string, string> = {
  watch_source_candidate: "監視ソース候補",
  price_source_candidate: "価格ソース候補",
  unknown: "不明"
};

const statusLabels: Record<string, string> = {
  new: "未登録",
  added_watch_source: "WatchSource登録済み",
  added_price_source: "PriceSource登録済み",
  ignored: "無視"
};

export default async function SourceDiscoveryPage({
  searchParams
}: {
  searchParams: { q?: string; detectedType?: string; discoveryType?: string; category?: string; status?: string; quickFilter?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const detectedType = searchParams.detectedType?.trim() ?? "";
  const discoveryType = searchParams.discoveryType?.trim() ?? "";
  const quickFilter = searchParams.quickFilter?.trim() ?? "";
  const category = searchParams.category?.trim() ?? "";
  const status = searchParams.status?.trim() ?? "new";

  const [queries, rawSources, watchSources, priceSources] = await Promise.all([
    prisma.discoveryQuery.findMany({ orderBy: [{ enabled: "desc" }, { category: "asc" }, { name: "asc" }] }),
    prisma.discoveredSource.findMany({
      where: {
        AND: [
          quickFilter === "current"
            ? {
                OR: [
                  {
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
                  },
                  { discoveryType: { in: ["amazon_invitation_sale", "amazon_preorder", "amazon_regular_sale"] } }
                ]
              }
            : {},
          quickFilter === "price"
            ? {
                OR: [{ discoveryType: "price_buyback_page" }, { detectedType: "price_source_candidate" }]
              }
            : {},
          detectedType ? { detectedType } : {},
          discoveryType ? { discoveryType } : {},
          category ? { category } : {},
          status ? { status } : {},
          q
            ? {
                OR: [
                  { title: { contains: q } },
                  { url: { contains: q } },
                  { description: { contains: q } },
                  { matchedKeywords: { contains: q } },
                  { reason: { contains: q } },
                  { aiExcludeReason: { contains: q } }
                ]
              }
            : {}
        ]
      },
      include: { discoveryQuery: { select: { name: true, query: true } } },
      orderBy: [{ status: "asc" }, { aiIsCurrentlyOpen: "desc" }, { aiConfidenceScore: "desc" }, { confidenceScore: "desc" }, { discoveredAt: "desc" }],
      take: 200
    }),
    prisma.watchSource.findMany({ select: { url: true } }),
    prisma.priceSource.findMany({ select: { baseUrl: true, searchUrlTemplate: true } })
  ]);
  const sources = rawSources.sort((a, b) => {
    const aPrice = a.discoveryType === "price_buyback_page" || a.detectedType === "price_source_candidate" ? 1 : 0;
    const bPrice = b.discoveryType === "price_buyback_page" || b.detectedType === "price_source_candidate" ? 1 : 0;
    const aTemplate = a.searchUrlTemplateCandidate ? 1 : 0;
    const bTemplate = b.searchUrlTemplateCandidate ? 1 : 0;
    const aCurrent = isSimpleEligibleSource(a) ? 1 : 0;
    const bCurrent = isSimpleEligibleSource(b) ? 1 : 0;
    return bCurrent - aCurrent || bPrice - aPrice || bTemplate - aTemplate || b.confidenceScore - a.confidenceScore;
  });
  const watchSourceUrls = new Set(watchSources.map((source) => source.url));
  const priceSourceUrls = new Set(priceSources.flatMap((source) => [source.baseUrl, source.searchUrlTemplate]));

  return (
    <>
      <PageHeader
        title="Source Discovery"
        description="公開RSS、許可された検索API、既存の公開ページから、抽選情報ページと買取価格ページの候補URLを探します。Google検索結果ページの直接スクレイピングは行いません。"
      >
        <form action={runSourceDiscoveryAction}>
          <button className={buttonClass} type="submit">ソース候補を探す</button>
        </form>
        <form action={runPriceSourceDiscoveryAction}>
          <button className={secondaryButtonClass} type="submit">PriceSource 候補だけ探す</button>
        </form>
        <form action={runAiClassificationAction}>
          <button className={secondaryButtonClass} type="submit">AI分類を実行</button>
        </form>
        <form action={runSourceCuratorAction}>
          <button className={secondaryButtonClass} type="submit">AI Source Curatorを実行</button>
        </form>
        <Link href="/sources" className={secondaryButtonClass}>監視ソース管理へ</Link>
        <Link href="/price-sources" className={secondaryButtonClass}>価格ソース管理へ</Link>
      </PageHeader>

      <Card className="mb-6 border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
        発見候補を WatchSource / PriceSource に追加しても、必ず <strong>enabled: false</strong> で登録します。
        実際に巡回する前に、URL、利用規約、アクセス頻度を確認してください。
      </Card>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">検索キーワード</h2>
          {queries.length === 0 ? (
            <EmptyState message="DiscoveryQuery がありません。seed を投入するか、右のフォームから追加してください。" />
          ) : (
            <div className="grid gap-2">
              {queries.map((query) => (
                <div key={query.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <div>
                    <div className="font-medium">{query.name}</div>
                    <div className="text-xs text-muted-foreground">{query.query} / {categoryLabels[query.category] ?? query.category} / {query.type}</div>
                  </div>
                  <form action={toggleDiscoveryQueryAction}>
                    <input type="hidden" name="id" value={query.id} />
                    <input type="hidden" name="enabled" value={String(!query.enabled)} />
                    <button className={smallButtonClass} type="submit">{query.enabled ? "有効" : "無効"}</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold">検索キーワードを追加</h2>
          <form action={createDiscoveryQueryAction} className="grid gap-3 md:grid-cols-2">
            <Field label="名前"><input className={inputClass} name="name" required /></Field>
            <Field label="検索キーワード"><input className={inputClass} name="query" required /></Field>
            <Field label="種別">
              <select className={inputClass} name="type" defaultValue="both">
                <option value="watch_source">監視ソース</option>
                <option value="price_source">価格ソース</option>
                <option value="both">両方</option>
              </select>
            </Field>
            <Field label="カテゴリ">
              <select className={inputClass} name="category" defaultValue="pokemon">
                {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="メモ"><input className={inputClass} name="memo" /></Field>
            <label className="flex items-center gap-2 text-sm">
              <input name="enabled" type="checkbox" defaultChecked /> 有効
            </label>
            <div className="md:col-span-2">
              <button className={buttonClass} type="submit">追加</button>
            </div>
          </form>
        </Card>
      </div>

      <Card className="mb-4 p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_190px_200px_220px_160px_160px_auto]">
          <input className={inputClass} name="q" defaultValue={q} placeholder="タイトル、URL、キーワード検索" />
          <select className={inputClass} name="quickFilter" defaultValue={quickFilter}>
            <option value="">クイックフィルターなし</option>
            <option value="current">現在受付中候補のみ</option>
            <option value="price">買取価格ページ候補のみ</option>
          </select>
          <select className={inputClass} name="detectedType" defaultValue={detectedType}>
            <option value="">種別すべて</option>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className={inputClass} name="discoveryType" defaultValue={discoveryType}>
            <option value="">discoveryType すべて</option>
            <option value="current_lottery_application">current_lottery_application</option>
            <option value="ended_lottery_article">ended_lottery_article</option>
            <option value="lottery_news_article">lottery_news_article</option>
            <option value="official_product_page">official_product_page</option>
            <option value="price_buyback_page">price_buyback_page</option>
            <option value="sales_page">sales_page</option>
            <option value="amazon_invitation_sale">amazon_invitation_sale</option>
            <option value="amazon_preorder">amazon_preorder</option>
            <option value="amazon_regular_sale">amazon_regular_sale</option>
            <option value="amazon_unavailable">amazon_unavailable</option>
            <option value="amazon_excluded_marketplace">amazon_excluded_marketplace</option>
            <option value="amazon_unknown">amazon_unknown</option>
            <option value="unknown">unknown</option>
          </select>
          <select className={inputClass} name="category" defaultValue={category}>
            <option value="">カテゴリすべて</option>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className={inputClass} name="status" defaultValue={status}>
            <option value="">状態すべて</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className={secondaryButtonClass} type="submit">絞り込み</button>
        </form>
      </Card>

      {sources.length === 0 ? (
        <EmptyState
          title="発見候補がありません"
          message="検索キーワードを有効化して、候補検索を実行してください。初回はRSS検索や公開ページ取得に時間がかかる場合があります。"
        />
      ) : (
        <form>
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            <button className={secondaryButtonClass} formAction={bulkAddDiscoveredWatchSourcesAction} type="submit">選択をWatchSource登録</button>
            <button className={secondaryButtonClass} formAction={bulkAddDiscoveredPriceSourcesAction} type="submit">選択をPriceSource登録</button>
            <button className={secondaryButtonClass} formAction={bulkAddDiscoveredWatchCandidatesAction} type="submit">WatchSource候補を一括登録</button>
            <button className={secondaryButtonClass} formAction={bulkAddDiscoveredPriceCandidatesAction} type="submit">PriceSource候補を一括登録</button>
            <button className={secondaryButtonClass} formAction={bulkAddDiscoveredPriceCandidatesAction} type="submit">テンプレートなしもbaseUrl登録</button>
            <button className={secondaryButtonClass} formAction={bulkIgnoreDiscoveredSourcesAction} type="submit">選択を無視</button>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[1900px] text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">選択</th>
                  <th className="px-4 py-3">候補</th>
                  <th className="px-4 py-3">種別</th>
                  <th className="px-4 py-3">discoveryType</th>
                  <th className="px-4 py-3">カテゴリ</th>
                  <th className="px-4 py-3">信頼度</th>
                  <th className="px-4 py-3">AI判定</th>
                  <th className="px-4 py-3">Auto Pilot</th>
                  <th className="px-4 py-3">Simple表示</th>
                  <th className="px-4 py-3">検索URL推定</th>
                  <th className="px-4 py-3">検索キーワード</th>
                  <th className="px-4 py-3">発見日時</th>
                  <th className="px-4 py-3">登録状態</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const computedStatus = watchSourceUrls.has(source.normalizedUrl)
                    ? "added_watch_source"
                    : priceSourceUrls.has(source.normalizedUrl)
                      ? "added_price_source"
                      : source.status;
                  const canAdd = computedStatus === "new";
                  return (
                    <tr key={source.id} className="border-t border-border align-top">
                      <td className="px-4 py-3"><input name="ids" type="checkbox" value={source.id} disabled={!canAdd} /></td>
                      <td className="max-w-xl px-4 py-3">
                        <a className="font-medium text-primary" href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                        <div className="mt-1 break-all text-xs text-muted-foreground">{source.normalizedUrl}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{source.description ?? "-"}</div>
                        <div className="mt-1 text-xs text-amber-700">{source.reason ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={source.detectedType} /></td>
                      <td className="px-4 py-3"><DiscoveryTypeBadge type={source.discoveryType} /></td>
                      <td className="px-4 py-3">{categoryLabels[source.category] ?? source.category}</td>
                      <td className="px-4 py-3 tabular-nums">{source.confidenceScore.toFixed(2)}</td>
                      <td className="max-w-sm px-4 py-3">
                        <div className="mb-2 grid gap-1 text-xs">
                          <div className="flex flex-wrap gap-1">
                            <SourceUsefulnessBadge value={source.sourceUsefulness} />
                            <Badge tone={source.aiTrustLevel === "high" ? "success" : source.aiTrustLevel === "medium" ? "warning" : "neutral"}>
                              trust: {source.aiTrustLevel}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground">推奨: {source.aiRecommendedAction}</div>
                          <div className="text-muted-foreground">自動登録: {source.aiCanAutoRegister ? "可" : "不可"} / 自動有効化: {source.aiCanAutoEnable ? "可" : "不可"}</div>
                          {source.aiSourceReason ? <div className="text-muted-foreground">{source.aiSourceReason}</div> : null}
                          {source.aiRiskReason ? <div className="text-rose-700">{source.aiRiskReason}</div> : null}
                        </div>
                        {source.aiClassifiedAt ? (
                          <div className="grid gap-1 text-xs">
                            <div className="flex flex-wrap gap-1">
                              <Badge tone={source.aiIsLotteryApplicationPage ? "success" : "neutral"}>
                                {source.aiIsLotteryApplicationPage ? "抽選応募ページ" : "抽選応募ページではない"}
                              </Badge>
                              <Badge tone={source.aiIsCurrentlyOpen ? "success" : source.aiIsPastOrEnded ? "danger" : "warning"}>
                                {source.aiIsCurrentlyOpen ? "受付中" : source.aiIsPastOrEnded ? "終了候補" : "受付不明"}
                              </Badge>
                            </div>
                            <div className="tabular-nums text-muted-foreground">AI {source.aiConfidenceScore?.toFixed(2) ?? "-"}</div>
                            <div className="text-muted-foreground">記事日付: {dateTime(source.articlePublishedAt)}</div>
                            <div className="text-muted-foreground">応募締切: {dateTime(source.aiApplicationEndAt)}</div>
                            <div className="text-muted-foreground">{source.aiReason ?? "-"}</div>
                            {source.aiExcludeReason ? <div className="text-rose-700">{source.aiExcludeReason}</div> : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">未分類</span>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-xs leading-5">
                        {computedStatus !== "new" ? <Badge tone="success">自動/手動登録済み</Badge> : <Badge tone="warning">未登録</Badge>}
                        {source.aiCanAutoEnable ? <div className="mt-1 text-emerald-700">安全チェック後に自動有効化候補</div> : null}
                        <div className="mt-1 text-muted-foreground">{autoPilotHint(source, computedStatus)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={isSimpleEligibleSource(source) ? "success" : "neutral"}>
                          {isSimpleEligibleSource(source) ? "表示対象" : "非表示"}
                        </Badge>
                        {source.aiExcludeReason ? <div className="mt-1 text-xs text-rose-700">{source.aiExcludeReason}</div> : null}
                      </td>
                      <td className="max-w-sm px-4 py-3">
                        {source.searchUrlTemplateCandidate ? (
                          <div className="break-all text-xs">{source.searchUrlTemplateCandidate}</div>
                        ) : (
                          <div className="text-xs text-amber-700">要確認</div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {source.requiresReview ? "検索URLテンプレート要確認" : `provider: ${source.providerName ?? "-"}`}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{source.discoveryQuery.name}</div>
                        <div className="text-xs text-muted-foreground">{source.discoveryQuery.query}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{source.matchedKeywords ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3">{dateTime(source.discoveredAt)}<div className="text-xs text-muted-foreground">最終確認 {dateTime(source.lastSeenAt)}</div></td>
                      <td className="px-4 py-3"><StatusBadge status={computedStatus} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button className={smallButtonClass} formAction={addDiscoveredWatchSourceAction} name="id" value={source.id} type="submit" disabled={!canAdd}>WatchSource</button>
                          <button className={smallButtonClass} formAction={addDiscoveredPriceSourceAction} name="id" value={source.id} type="submit" disabled={!canAdd}>PriceSource</button>
                          <button className={smallButtonClass} formAction={ignoreDiscoveredSourceAction} name="id" value={source.id} type="submit" disabled={source.status === "ignored"}>無視</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </form>
      )}
    </>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === "watch_source_candidate") return <Badge tone="primary">{typeLabels[type]}</Badge>;
  if (type === "price_source_candidate") return <Badge tone="success">{typeLabels[type]}</Badge>;
  return <Badge tone="neutral">{typeLabels[type] ?? type}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "new") return <Badge tone="warning">{statusLabels[status]}</Badge>;
  if (status === "ignored") return <Badge tone="danger">{statusLabels[status]}</Badge>;
  return <Badge tone="success">{statusLabels[status] ?? status}</Badge>;
}

function DiscoveryTypeBadge({ type }: { type: string }) {
  if (type === "current_lottery_application") return <Badge tone="success">{type}</Badge>;
  if (type === "amazon_invitation_sale" || type === "amazon_preorder" || type === "amazon_regular_sale") return <Badge tone="success">{type}</Badge>;
  if (type === "amazon_excluded_marketplace" || type === "amazon_unknown" || type === "amazon_unavailable") return <Badge tone="danger">{type}</Badge>;
  if (type === "price_buyback_page") return <Badge tone="primary">{type}</Badge>;
  if (type === "ended_lottery_article" || type === "lottery_news_article") return <Badge tone="danger">{type}</Badge>;
  if (type === "sales_page" || type === "official_product_page") return <Badge tone="warning">{type}</Badge>;
  return <Badge tone="neutral">{type}</Badge>;
}

function SourceUsefulnessBadge({ value }: { value: string }) {
  if (value === "watch_source") return <Badge tone="primary">watch_source向き</Badge>;
  if (value === "price_source") return <Badge tone="success">price_source向き</Badge>;
  if (value === "both") return <Badge tone="success">both</Badge>;
  if (value === "ignore") return <Badge tone="danger">ignore</Badge>;
  return <Badge tone="warning">manual_review</Badge>;
}

function autoPilotHint(source: {
  sourceUsefulness: string;
  aiTrustLevel: string;
  aiCanAutoRegister: boolean;
  aiCanAutoEnable: boolean;
  aiRiskReason: string | null;
  searchUrlTemplateCandidate: string | null;
  requiresReview: boolean;
  discoveryType: string;
  detectedType: string;
}, computedStatus: string) {
  if (source.aiRiskReason) return `人間の確認が必要: ${source.aiRiskReason}`;
  if (computedStatus === "new" && source.aiCanAutoRegister) return "Auto Pilotで登録できます。";
  if (computedStatus !== "new" && source.aiCanAutoEnable) return "Auto Pilotで安全チェック後に有効化できます。";
  if (source.sourceUsefulness === "manual_review") return "manual_reviewのため人間の確認が必要です。";
  if (source.requiresReview || (source.detectedType === "price_source_candidate" && !source.searchUrlTemplateCandidate)) {
    return "searchUrlTemplateを自動推定できない場合は手動確認になります。";
  }
  if (source.aiTrustLevel !== "high") return `AI信頼度 ${source.aiTrustLevel} のため自動有効化は保留します。`;
  return "Auto Pilotが次回も安全条件を評価します。";
}

function isSimpleEligibleSource(source: {
  discoveryType: string;
  aiIsLotteryApplicationPage: boolean | null;
  aiIsCurrentlyOpen: boolean | null;
  aiIsPastOrEnded: boolean | null;
  aiIsJustArticle: boolean | null;
  aiApplicationEndAt: Date | null;
}) {
  const now = new Date();
  if (["amazon_invitation_sale", "amazon_preorder", "amazon_regular_sale"].includes(source.discoveryType)) {
    return source.aiIsPastOrEnded !== true && source.aiIsJustArticle !== true;
  }
  return (
    source.discoveryType === "current_lottery_application" &&
    source.aiIsLotteryApplicationPage === true &&
    source.aiIsCurrentlyOpen === true &&
    source.aiIsPastOrEnded === false &&
    source.aiIsJustArticle === false &&
    Boolean(source.aiApplicationEndAt && source.aiApplicationEndAt.getTime() >= now.getTime())
  );
}
