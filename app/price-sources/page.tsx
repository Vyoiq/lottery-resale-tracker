import Link from "next/link";
import { cleanupPlaceholderSourcesAction, createPriceSource, togglePriceSource } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { dateTime } from "@/lib/format";
import { placeholderSourceReason, placeholderWarningMessage } from "@/lib/sourceGuards";
import { Badge, buttonClass, Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass, textareaClass } from "@/components/ui";
import { PriceSourceTestButton } from "@/components/price-source-test-button";

export default async function PriceSourcesPage() {
  const sources = await prisma.priceSource.findMany({ orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }] });
  const enabledRealSourceCount = sources.filter(
    (source) => source.enabled && !placeholderSourceReason(source) && source.searchUrlTemplate.includes("{keyword}")
  ).length;

  return (
    <>
      <PageHeader
        title="価格ソース"
        description="{keyword} に商品名をURLエンコードして公開検索ページを取得します。ログイン不要の公開ページだけを登録してください。プレースホルダーURLは有効化できません。"
      >
        <Link href="/price-sources/presets" className={secondaryButtonClass}>プリセットから追加</Link>
        <form action={cleanupPlaceholderSourcesAction}>
          <button className={secondaryButtonClass} type="submit">プレースホルダーを無効化</button>
        </form>
      </PageHeader>

      <Card className="mb-4 border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
        <div className="font-semibold">追加後はこの画面で有効化してください</div>
        <p className="mt-1">
          `enabled` が有効な価格ソースだけが価格取得に使われます。`example.com`、`サンプル`、`プレースホルダー`、`要差し替え`、`要確認` を含むソースは安全のため有効化できません。
        </p>
      </Card>

      {enabledRealSourceCount === 0 ? (
        <Card className="mb-4 border-rose-200 bg-rose-50/70 p-4 text-sm leading-6 text-rose-900">
          <div className="font-semibold">有効な実URLのPriceSourceが0件です</div>
          <p className="mt-1">
            プレースホルダーではなく、`{"{keyword}"}` を含む検索URLテンプレートが設定されたPriceSourceを有効化してください。
            候補がない場合は <Link href="/source-discovery?quickFilter=price" className="font-medium underline">Source Discoveryの買取価格ページ候補</Link> を確認してください。
          </p>
        </Card>
      ) : null}

      <Card className="mb-6 p-4">
        <form action={createPriceSource} className="grid gap-4 md:grid-cols-4">
          <Field label="ソース名"><input className={inputClass} name="name" required /></Field>
          <Field label="買取店名"><input className={inputClass} name="shopName" required /></Field>
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
          message="プリセットまたは Source Discovery から候補を追加し、URLと利用規約を確認してから有効化してください。"
          action={<Link href="/price-sources/presets" className={secondaryButtonClass}>価格ソースプリセットを確認</Link>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">買取店名</th>
                <th className="px-4 py-3">検索URLテンプレート</th>
                <th className="px-4 py-3">品質</th>
                <th className="px-4 py-3">有効/無効</th>
                <th className="px-4 py-3">取得状況</th>
                <th className="px-4 py-3">メモ</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => {
                const placeholderReason = placeholderSourceReason(source);
                const placeholder = Boolean(placeholderReason);
                const hasTemplate = source.searchUrlTemplate.includes("{keyword}");
                return (
                  <tr key={source.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 font-medium">
                      {source.shopName}
                      <div className="text-xs text-muted-foreground">{source.name}</div>
                      {placeholder ? <div className="mt-1"><Badge tone="danger">プレースホルダー</Badge></div> : null}
                    </td>
                    <td className="max-w-lg px-4 py-3">
                      <div className="break-all">{source.searchUrlTemplate || "未設定"}</div>
                      <div className="text-xs text-muted-foreground">{source.baseUrl}</div>
                      {placeholder ? <div className="mt-1 text-xs font-medium text-rose-700">{placeholderWarningMessage} 理由: {placeholderReason}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid gap-1">
                        <Badge tone={placeholder ? "danger" : "success"}>{placeholder ? "プレースホルダー" : "実URL候補"}</Badge>
                        <Badge tone={hasTemplate ? "success" : "warning"}>{hasTemplate ? "検索URLあり" : "検索URL要確認"}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={placeholder && source.enabled ? "danger" : source.enabled ? "success" : "neutral"}>
                        {placeholder && source.enabled ? "有効（要無効化）" : source.enabled ? "有効" : "無効"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs leading-5">
                      <div>最終成功: {dateTime(source.lastSuccessAt)}</div>
                      <div>最終HTTP: {source.lastHttpStatus ?? "-"}</div>
                      <div>成功 {source.successCount} / 失敗 {source.failureCount}</div>
                      {source.lastError ? <div className="mt-1 text-rose-700">{source.lastError}</div> : null}
                    </td>
                    <td className="max-w-sm px-4 py-3 text-xs text-muted-foreground">{source.memo ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="grid justify-items-end gap-2">
                      <form action={togglePriceSource} className="flex justify-end">
                        <input type="hidden" name="id" value={source.id} />
                        <input type="hidden" name="enabled" value={source.enabled ? "false" : "true"} />
                        <button
                          className={secondaryButtonClass}
                          type="submit"
                          disabled={!source.enabled && (placeholder || !hasTemplate)}
                          title={!source.enabled && placeholder ? placeholderWarningMessage : !hasTemplate ? "検索URLテンプレートを設定してください" : undefined}
                        >
                          {source.enabled ? "無効化" : placeholder ? "有効化不可" : !hasTemplate ? "要確認" : "有効化"}
                        </button>
                      </form>
                      <PriceSourceTestButton priceSourceId={source.id} />
                      </div>
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
