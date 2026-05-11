import { createPriceSource, togglePriceSource } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { dateTime } from "@/lib/format";
import { Badge, buttonClass, Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass, textareaClass } from "@/components/ui";

export default async function PriceSourcesPage() {
  const sources = await prisma.priceSource.findMany({ orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }] });

  return (
    <>
      <PageHeader title="価格ソース" description="{keyword} に商品名をURLエンコードして公開検索ページを取得します。ログイン不要の公開ページだけを登録してください。" />
      <Card className="mb-6 p-4">
        <form action={createPriceSource} className="grid gap-4 md:grid-cols-4">
          <Field label="ソース名"><input className={inputClass} name="name" required /></Field>
          <Field label="店舗名"><input className={inputClass} name="shopName" required /></Field>
          <Field label="ベースURL"><input className={inputClass} name="baseUrl" type="url" required /></Field>
          <Field label="検索URLテンプレート"><input className={inputClass} name="searchUrlTemplate" placeholder="https://example.com/search?q={keyword}" required /></Field>
          <div className="md:col-span-3">
            <Field label="メモ"><textarea className={textareaClass} name="memo" /></Field>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-muted-foreground">
            <input name="enabled" type="checkbox" defaultChecked />
            有効
          </label>
          <div className="md:col-span-4"><button className={buttonClass} type="submit">価格ソースを追加</button></div>
        </form>
      </Card>

      {sources.length === 0 ? (
        <EmptyState message="価格ソースがありません。" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">店舗名</th>
                <th className="px-4 py-3">検索URLテンプレート</th>
                <th className="px-4 py-3">有効/無効</th>
                <th className="px-4 py-3">最終チェック</th>
                <th className="px-4 py-3">メモ</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{source.shopName}<div className="text-xs text-muted-foreground">{source.name}</div></td>
                  <td className="max-w-lg truncate px-4 py-3">{source.searchUrlTemplate}</td>
                  <td className="px-4 py-3"><Badge tone={source.enabled ? "success" : "neutral"}>{source.enabled ? "有効" : "無効"}</Badge></td>
                  <td className="px-4 py-3">{dateTime(source.lastCheckedAt)}</td>
                  <td className="max-w-sm truncate px-4 py-3 text-xs text-muted-foreground">{source.memo ?? "-"}</td>
                  <td className="px-4 py-3">
                    <form action={togglePriceSource} className="flex justify-end">
                      <input type="hidden" name="id" value={source.id} />
                      <input type="hidden" name="enabled" value={source.enabled ? "false" : "true"} />
                      <button className={secondaryButtonClass} type="submit">{source.enabled ? "無効化" : "有効化"}</button>
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
