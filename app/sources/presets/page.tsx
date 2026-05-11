import { createWatchSourceFromPreset } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { sourceTypeLabels } from "@/lib/format";
import { buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";

export default async function SourcePresetsPage() {
  const presets = await prisma.sourcePreset.findMany({ orderBy: [{ category: "asc" }, { storeName: "asc" }] });
  const existing = await prisma.watchSource.findMany({ select: { url: true } });
  const existingUrls = new Set(existing.map((source) => source.url));

  return (
    <>
      <PageHeader title="監視ソースプリセット" description="候補から WatchSource にコピーします。追加時は必ず無効状態で登録します。" />
      {presets.length === 0 ? (
        <EmptyState message="プリセットがありません。" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ソース名</th>
                <th className="px-4 py-3">店舗名</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">カテゴリ</th>
                <th className="px-4 py-3">説明</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {presets.map((preset) => (
                <tr key={preset.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-medium">{preset.name}</td>
                  <td className="px-4 py-3">{preset.storeName}</td>
                  <td className="max-w-sm truncate px-4 py-3"><a className="text-primary" href={preset.url} target="_blank">{preset.url}</a><div className="text-xs text-muted-foreground">{sourceTypeLabels[preset.type] ?? preset.type}</div></td>
                  <td className="px-4 py-3">{preset.category}</td>
                  <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">{preset.description}</td>
                  <td className="px-4 py-3">
                    <form action={createWatchSourceFromPreset} className="flex justify-end">
                      <input type="hidden" name="id" value={preset.id} />
                      <button className={buttonClass} type="submit">{existingUrls.has(preset.url) ? "再コピー" : "追加"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
