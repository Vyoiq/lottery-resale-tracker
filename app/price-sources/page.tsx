import Link from "next/link";
import { createPriceSource, togglePriceSource } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { dateTime } from "@/lib/format";
import { isPlaceholderPriceSource } from "@/lib/sourceGuards";
import { Badge, buttonClass, Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass, textareaClass } from "@/components/ui";

export default async function PriceSourcesPage() {
  const sources = await prisma.priceSource.findMany({ orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }] });

  return (
    <>
      <PageHeader title="価格ソース" description="{keyword} に商品名をURLエンコードして公開検索ページを取得します。ログイン不要の公開ページだけを登録してください。" />
      <div className="mb-4 flex justify-end">
        <Link href="/price-sources/presets" className={secondaryButtonClass}>プリセットから追加</Link>
      </div>
      <Card className="mb-4 border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
        <div className="font-semibold">プリセット追加後はこの画面で有効化してください</div>
        <p className="mt-1">
          `enabled` が有効な価格ソースだけが価格取得に使われます。`example.com` を含むURLはプレースホルダーのため、実在する公開検索URLへ差し替えるまで有効化できません。
        </p>
      </Card>
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
        <EmptyState
          title="価格ソースが未登録です"
          message="買取価格を自動取得するには、公開検索ページのURLテンプレートを登録します。プリセットから追加したあと、URLと利用規約を確認して有効化してください。"
          action={<Link href="/price-sources/presets" className={secondaryButtonClass}>価格ソースプリセットを確認</Link>}
        />
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
              {sources.map((source) => {
                const placeholder = isPlaceholderPriceSource(source);
                return (
                  <tr key={source.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      {source.shopName}
                      <div className="text-xs text-muted-foreground">{source.name}</div>
                      {placeholder ? <div className="mt-1"><Badge tone="warning">要差し替え</Badge></div> : null}
                    </td>
                    <td className="max-w-lg px-4 py-3">
                      <div className="truncate">{source.searchUrlTemplate}</div>
                      <div className="text-xs text-muted-foreground">{source.baseUrl}</div>
                      {placeholder ? <div className="mt-1 text-xs font-medium text-amber-700">example.com を含むプレースホルダーURLです。実在URLへ差し替えるまで有効化できません。</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={placeholder && source.enabled ? "danger" : source.enabled ? "success" : "neutral"}>
                        {placeholder && source.enabled ? "有効（要無効化）" : source.enabled ? "有効" : placeholder ? "無効（要差し替え）" : "無効"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{dateTime(source.lastCheckedAt)}</td>
                    <td className="max-w-sm truncate px-4 py-3 text-xs text-muted-foreground">{source.memo ?? "-"}</td>
                    <td className="px-4 py-3">
                      <form action={togglePriceSource} className="flex justify-end">
                        <input type="hidden" name="id" value={source.id} />
                        <input type="hidden" name="enabled" value={source.enabled ? "false" : "true"} />
                        <button
                          className={secondaryButtonClass}
                          type="submit"
                          disabled={!source.enabled && placeholder}
                          title={!source.enabled && placeholder ? "example.com はプレースホルダーのため有効化できません" : undefined}
                        >
                          {source.enabled ? "無効化" : placeholder ? "有効化不可" : "有効化"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
