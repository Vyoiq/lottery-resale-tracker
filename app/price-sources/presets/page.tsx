import { createPriceSourceFromPreset, createSelectedPriceSourcesFromPresets } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { Badge, buttonClass, Card, EmptyState, inputClass, PageHeader, secondaryButtonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  pokemon: "ポケモン",
  trading_card: "トレカ",
  electronics: "家電",
  stationery: "文具",
  other: "その他"
};

export default async function PriceSourcePresetsPage({
  searchParams
}: {
  searchParams: { q?: string; category?: string; recommended?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const category = searchParams.category?.trim() ?? "";
  const recommended = searchParams.recommended === "true";

  const presets = await prisma.priceSourcePreset.findMany({
    where: {
      AND: [
        category ? { category } : {},
        recommended ? { recommended: true } : {},
        q
          ? {
              OR: [
                { name: { contains: q } },
                { shopName: { contains: q } },
                { baseUrl: { contains: q } },
                { searchUrlTemplate: { contains: q } },
                { description: { contains: q } },
                { tags: { contains: q } },
                { memo: { contains: q } }
              ]
            }
          : {}
      ]
    },
    orderBy: [{ recommended: "desc" }, { category: "asc" }, { shopName: "asc" }, { name: "asc" }]
  });
  const existing = await prisma.priceSource.findMany({ select: { searchUrlTemplate: true, baseUrl: true } });
  const existingTemplates = new Set(existing.map((source) => source.searchUrlTemplate));
  const existingBaseUrls = new Set(existing.map((source) => source.baseUrl));

  return (
    <>
      <PageHeader
        title="価格ソースプリセット"
        description="買取価格検索ページの候補を PriceSource にコピーします。追加時は必ず無効状態になり、取得前にURLと利用規約を確認してください。"
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
        <EmptyState title="条件に一致する価格ソースプリセットはありません" message="カテゴリ、推奨のみ、キーワード検索を外して再確認してください。公開検索URLが分かっている場合は価格ソース画面から手入力できます。" />
      ) : (
        <form action={createSelectedPriceSourcesFromPresets}>
          <div className="mb-3 flex justify-end">
            <button className={buttonClass} type="submit">選択したプリセットを追加</button>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">選択</th>
                  <th className="px-4 py-3">ソース</th>
                  <th className="px-4 py-3">買取店</th>
                  <th className="px-4 py-3">検索URLテンプレート</th>
                  <th className="px-4 py-3">カテゴリ</th>
                  <th className="px-4 py-3">タグ</th>
                  <th className="px-4 py-3">説明</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((preset) => {
                  const added = existingTemplates.has(preset.searchUrlTemplate) || existingBaseUrls.has(preset.baseUrl);
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
                      <td className="px-4 py-3">{preset.shopName}</td>
                      <td className="max-w-md truncate px-4 py-3">
                        {preset.searchUrlTemplate}
                        <div className="text-xs text-muted-foreground">{preset.baseUrl}</div>
                      </td>
                      <td className="px-4 py-3">{categoryLabels[preset.category] ?? preset.category}</td>
                      <td className="max-w-40 px-4 py-3 text-xs text-muted-foreground">{preset.tags ?? "-"}</td>
                      <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">
                        {preset.description ?? "-"}
                        {preset.memo ? <div className="mt-1 text-amber-700">{preset.memo}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className={secondaryButtonClass} formAction={createPriceSourceFromPreset} name="id" value={preset.id} type="submit" disabled={added}>
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
