import { createSelectedWatchSourcesFromPresets, createWatchSourceFromPreset } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { sourceTypeLabels } from "@/lib/format";
import { Badge, buttonClass, Card, EmptyState, inputClass, PageHeader, secondaryButtonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  pokemon: "ポケモン",
  trading_card: "トレカ",
  electronics: "家電",
  stationery: "文具",
  other: "その他"
};

export default async function SourcePresetsPage({
  searchParams
}: {
  searchParams: { q?: string; category?: string; recommended?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const category = searchParams.category?.trim() ?? "";
  const recommended = searchParams.recommended === "true";

  const presets = await prisma.sourcePreset.findMany({
    where: {
      AND: [
        category ? { category } : {},
        recommended ? { recommended: true } : {},
        q
          ? {
              OR: [
                { name: { contains: q } },
                { storeName: { contains: q } },
                { url: { contains: q } },
                { description: { contains: q } },
                { tags: { contains: q } },
                { memo: { contains: q } }
              ]
            }
          : {}
      ]
    },
    orderBy: [{ recommended: "desc" }, { category: "asc" }, { storeName: "asc" }, { name: "asc" }]
  });
  const existing = await prisma.watchSource.findMany({ select: { url: true } });
  const existingUrls = new Set(existing.map((source) => source.url));

  return (
    <>
      <PageHeader
        title="監視ソースプリセット"
        description="公開ページ/RSSの監視候補を WatchSource にコピーします。追加時は必ず無効状態になり、巡回前にURLと利用規約を確認してください。"
      />

      <Card className="mb-4 p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto]">
          <input className={inputClass} name="q" defaultValue={q} placeholder="キーワード検索" />
          <select className={inputClass} name="category" defaultValue={category}>
            <option value="">カテゴリすべて</option>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className={inputClass} name="recommended" defaultValue={recommended ? "true" : ""}>
            <option value="">すべて</option>
            <option value="true">推奨のみ</option>
          </select>
          <button className={secondaryButtonClass} type="submit">絞り込み</button>
        </form>
      </Card>

      {presets.length === 0 ? (
        <EmptyState title="条件に一致するプリセットはありません" message="カテゴリ、推奨のみ、キーワード検索を外して再確認してください。URLが不確実な場合は手入力で追加できます。" />
      ) : (
        <form action={createSelectedWatchSourcesFromPresets}>
          <div className="mb-3 flex justify-end">
            <button className={buttonClass} type="submit">選択したプリセットを追加</button>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">選択</th>
                  <th className="px-4 py-3">ソース</th>
                  <th className="px-4 py-3">店舗</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">カテゴリ</th>
                  <th className="px-4 py-3">タグ</th>
                  <th className="px-4 py-3">説明</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((preset) => {
                  const added = existingUrls.has(preset.url);
                  return (
                    <tr key={preset.id} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <input name="presetIds" type="checkbox" value={preset.id} disabled={added} />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {preset.name}
                        <div className="mt-1 flex gap-1">
                          {preset.recommended ? <Badge tone="primary">推奨</Badge> : null}
                          {added ? <Badge tone="success">追加済み</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">{preset.storeName}</td>
                      <td className="max-w-sm truncate px-4 py-3">
                        <a className="text-primary" href={preset.url} target="_blank">{preset.url}</a>
                        <div className="text-xs text-muted-foreground">{sourceTypeLabels[preset.type] ?? preset.type}</div>
                      </td>
                      <td className="px-4 py-3">{categoryLabels[preset.category] ?? preset.category}</td>
                      <td className="max-w-40 px-4 py-3 text-xs text-muted-foreground">{preset.tags ?? "-"}</td>
                      <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">
                        {preset.description ?? "-"}
                        {preset.memo ? <div className="mt-1 text-amber-700">{preset.memo}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className={secondaryButtonClass} formAction={createWatchSourceFromPreset} name="id" value={preset.id} type="submit" disabled={added}>
                          {added ? "追加済み" : "追加"}
                        </button>
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
