import Link from "next/link";
import { createWatchSource, toggleWatchSource } from "@/lib/actions";
import { sourceTypes } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { dateTime, sourceTypeLabels } from "@/lib/format";
import { Badge, buttonClass, Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass, textareaClass } from "@/components/ui";

export default async function SourcesPage() {
  const sources = await prisma.watchSource.findMany({ orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }] });

  return (
    <>
      <PageHeader title="監視ソース" description="ログイン不要で閲覧できる公開HTML/RSSだけを低頻度で巡回します。" />
      <div className="mb-4 flex justify-end">
        <Link href="/sources/presets" className={secondaryButtonClass}>プリセットから追加</Link>
      </div>

      <Card className="mb-6 p-4">
        <form action={createWatchSource} className="grid gap-4 md:grid-cols-4">
          <Field label="ソース名">
            <input className={inputClass} name="name" required />
          </Field>
          <Field label="店舗名">
            <input className={inputClass} name="storeName" required />
          </Field>
          <Field label="URL">
            <input className={inputClass} name="url" type="url" required />
          </Field>
          <Field label="種別">
            <select className={inputClass} name="type" defaultValue="html">
              {sourceTypes.map((type) => <option key={type} value={type}>{sourceTypeLabels[type]}</option>)}
            </select>
          </Field>
          <div className="md:col-span-3">
            <Field label="メモ">
              <textarea className={textareaClass} name="memo" />
            </Field>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-muted-foreground">
            <input name="enabled" type="checkbox" defaultChecked />
            有効
          </label>
          <div className="md:col-span-4">
            <button className={buttonClass} type="submit">監視ソースを追加</button>
          </div>
        </form>
      </Card>

      {sources.length === 0 ? (
        <EmptyState message="監視ソースがありません。" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ソース名</th>
                <th className="px-4 py-3">店舗名</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">有効/無効</th>
                <th className="px-4 py-3">最終チェック</th>
                <th className="px-4 py-3">結果</th>
                <th className="px-4 py-3">HTTP</th>
                <th className="px-4 py-3">取得/新規</th>
                <th className="px-4 py-3">キーワード</th>
                <th className="px-4 py-3">エラー</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{source.name}</td>
                  <td className="px-4 py-3">{source.storeName}</td>
                  <td className="max-w-sm truncate px-4 py-3"><a className="text-primary" href={source.url} target="_blank">{source.url}</a></td>
                  <td className="px-4 py-3">{sourceTypeLabels[source.type] ?? source.type}</td>
                  <td className="px-4 py-3"><Badge tone={source.enabled ? "success" : "neutral"}>{source.enabled ? "有効" : "無効"}</Badge></td>
                  <td className="px-4 py-3">{dateTime(source.lastCheckedAt)}</td>
                  <td className="px-4 py-3">
                    {source.lastSuccess === null ? "-" : <Badge tone={source.lastSuccess ? "success" : "danger"}>{source.lastSuccess ? "成功" : "失敗"}</Badge>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{source.lastHttpStatus ?? "-"}</td>
                  <td className="px-4 py-3 tabular-nums">{source.lastFetchedCount} / {source.lastNewListingCount}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">{source.lastMatchedKeywords ?? "-"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">{source.lastError ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link className={secondaryButtonClass} href={`/sources/${source.id}/edit`}>編集</Link>
                      <form action={toggleWatchSource}>
                        <input type="hidden" name="id" value={source.id} />
                        <input type="hidden" name="enabled" value={source.enabled ? "false" : "true"} />
                        <button className={secondaryButtonClass} type="submit">{source.enabled ? "無効化" : "有効化"}</button>
                      </form>
                    </div>
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
