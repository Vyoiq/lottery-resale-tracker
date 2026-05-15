import Link from "next/link";
import {
  addDiscoveredPriceSourceAction,
  addDiscoveredWatchSourceAction,
  bulkAddDiscoveredPriceSourcesAction,
  bulkAddDiscoveredWatchSourcesAction,
  bulkIgnoreDiscoveredSourcesAction,
  createDiscoveryQueryAction,
  ignoreDiscoveredSourceAction,
  runPriceSourceDiscoveryAction,
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
  searchParams: { q?: string; detectedType?: string; category?: string; status?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const detectedType = searchParams.detectedType?.trim() ?? "";
  const category = searchParams.category?.trim() ?? "";
  const status = searchParams.status?.trim() ?? "new";

  const [queries, sources, watchSources, priceSources] = await Promise.all([
    prisma.discoveryQuery.findMany({ orderBy: [{ enabled: "desc" }, { category: "asc" }, { name: "asc" }] }),
    prisma.discoveredSource.findMany({
      where: {
        AND: [
          detectedType ? { detectedType } : {},
          category ? { category } : {},
          status ? { status } : {},
          q
            ? {
                OR: [
                  { title: { contains: q } },
                  { url: { contains: q } },
                  { description: { contains: q } },
                  { matchedKeywords: { contains: q } },
                  { reason: { contains: q } }
                ]
              }
            : {}
        ]
      },
      include: { discoveryQuery: { select: { name: true, query: true } } },
      orderBy: [{ status: "asc" }, { confidenceScore: "desc" }, { discoveredAt: "desc" }],
      take: 200
    }),
    prisma.watchSource.findMany({ select: { url: true } }),
    prisma.priceSource.findMany({ select: { baseUrl: true, searchUrlTemplate: true } })
  ]);
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
        <form className="grid gap-3 md:grid-cols-[1fr_200px_160px_160px_auto]">
          <input className={inputClass} name="q" defaultValue={q} placeholder="タイトル、URL、キーワード検索" />
          <select className={inputClass} name="detectedType" defaultValue={detectedType}>
            <option value="">種別すべて</option>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
            <button className={secondaryButtonClass} formAction={bulkIgnoreDiscoveredSourcesAction} type="submit">選択を無視</button>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[1440px] text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">選択</th>
                  <th className="px-4 py-3">候補</th>
                  <th className="px-4 py-3">種別</th>
                  <th className="px-4 py-3">カテゴリ</th>
                  <th className="px-4 py-3">信頼度</th>
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
                      <td className="px-4 py-3">{categoryLabels[source.category] ?? source.category}</td>
                      <td className="px-4 py-3 tabular-nums">{source.confidenceScore.toFixed(2)}</td>
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
