import Link from "next/link";
import {
  cleanupPlaceholderSourcesAction,
  createPriceSource,
  inferAllPriceSourceTemplatesAction,
  inferPriceSourceTemplateAction,
  runAutoPilotAction,
  togglePriceSource,
  updatePriceSourceTemplate
} from "@/lib/actions";
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
        description="{keyword} を含む検索URLテンプレートがある PriceSource だけが自動価格取得に使われます。テンプレート未設定の候補は baseUrl として保持し、後で編集してください。"
      >
        <Link href="/price-sources/presets" className={secondaryButtonClass}>プリセットから追加</Link>
        <form action={cleanupPlaceholderSourcesAction}>
          <button className={secondaryButtonClass} type="submit">プレースホルダーを無効化</button>
        </form>
        <form action={inferAllPriceSourceTemplatesAction}>
          <button className={buttonClass} type="submit">テンプレート自動推定</button>
        </form>
      </PageHeader>

      <Card className="mb-4 border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
        <div className="font-semibold">Auto Pilotが価格ソース候補を自動整理します</div>
        <p className="mt-1">候補探索、searchUrlTemplate推定、テスト取得、安全チェックを行い、条件を満たすものだけ自動有効化します。</p>
      </Card>

      {false ? <Card className="mb-4 border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
        <div className="font-semibold">追加後はこの画面で確認してから有効化してください</div>
        <p className="mt-1">
          PriceSource Discovery や AI Source Curator が追加した候補は安全のため enabled: false です。
          searchUrlTemplate が空のものは baseUrl 登録済みですが、価格取得には使えません。
        </p>
      </Card> : null}

      {enabledRealSourceCount === 0 ? (
        <Card className="mb-4 border-rose-200 bg-rose-50/70 p-4 text-sm leading-6 text-rose-900">
          <div className="font-semibold">有効な価格ソースがありません。Auto Pilotで価格ソース候補を自動探索できます。</div>
          <p className="mt-1">価格ソース候補を自動探索し、テンプレート推定とテスト取得を行います。安全チェック済みの候補だけ自動有効化します。</p>
          <form action={runAutoPilotAction} className="mt-3">
            <button className={buttonClass} type="submit">Auto Pilotで価格ソースを自動探索する</button>
          </form>
        </Card>
      ) : false && enabledRealSourceCount === 0 ? (
        <Card className="mb-4 border-rose-200 bg-rose-50/70 p-4 text-sm leading-6 text-rose-900">
          <div className="font-semibold">有効な実URLのPriceSourceが0件です</div>
          <p className="mt-1">
            プレースホルダーではなく、{"{keyword}"} を含む検索URLテンプレートが設定された PriceSource を有効化してください。
            候補がない場合は <Link href="/source-discovery?quickFilter=price" className="font-medium underline">Source Discovery の買取価格ページ候補</Link> を確認してください。
          </p>
        </Card>
      ) : null}

      <Card className="mb-6 p-4">
        <form action={createPriceSource} className="grid gap-4 md:grid-cols-4">
          <Field label="ソース名"><input className={inputClass} name="name" required /></Field>
          <Field label="買取店名"><input className={inputClass} name="shopName" required /></Field>
          <Field label="baseUrl"><input className={inputClass} name="baseUrl" type="url" required /></Field>
          <Field label="検索URLテンプレート"><input className={inputClass} name="searchUrlTemplate" placeholder="https://example.com/search?q={keyword}" /></Field>
          <div className="md:col-span-3">
            <Field label="メモ"><textarea className={textareaClass} name="memo" /></Field>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-muted-foreground">
            <input name="enabled" type="checkbox" />
            有効化する
          </label>
          <div className="md:col-span-4"><button className={buttonClass} type="submit">価格ソースを追加</button></div>
        </form>
      </Card>

      {sources.length === 0 ? (
        <EmptyState
          title="価格ソースはまだ登録されていません"
          message="Auto Pilotで買取価格ページ候補を自動探索し、テンプレート推定とテスト取得まで進めます。手動追加は最後の手段です。"
          action={
            <form action={runAutoPilotAction}>
              <button className={buttonClass} type="submit">Auto Pilotで価格ソースを自動探索する</button>
            </form>
          }
        />
      ) : false && sources.length === 0 ? (
        <EmptyState
          title="価格ソースが未登録です"
          message="プリセットまたは Source Discovery から候補を追加し、URLと利用規約を確認してから有効化してください。"
          action={<Link href="/source-discovery?quickFilter=price" className={secondaryButtonClass}>価格ソース候補を確認</Link>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1460px] text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">買取店</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">有効/無効</th>
                <th className="px-4 py-3">取得状況</th>
                <th className="px-4 py-3">自動化</th>
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
                      <div className="break-all">{source.searchUrlTemplate || "検索URLテンプレート未設定"}</div>
                      <div className="text-xs text-muted-foreground">baseUrl: {source.baseUrl}</div>
                      {placeholder ? <div className="mt-1 text-xs font-medium text-rose-700">{placeholderWarningMessage} 理由: {placeholderReason}</div> : null}
                      {!hasTemplate ? (
                        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-900">
                          <div className="font-semibold">検索URLテンプレート未設定</div>
                          <div>価格取得にはテンプレート設定が必要です。baseUrl は登録済みです。</div>
                          <div>テスト取得不可。編集して searchUrlTemplate を設定してください。</div>
                        </div>
                      ) : null}
                      <form action={updatePriceSourceTemplate} className="mt-2 flex gap-2">
                        <input type="hidden" name="id" value={source.id} />
                        <input
                          className={inputClass}
                          name="searchUrlTemplate"
                          defaultValue={source.searchUrlTemplate}
                          placeholder={`${source.baseUrl}${source.baseUrl.includes("?") ? "&" : "?"}q={keyword}`}
                        />
                        <button className={secondaryButtonClass} type="submit">保存</button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid gap-1">
                        <Badge tone={placeholder ? "danger" : "success"}>{placeholder ? "要差し替え" : "実URL候補"}</Badge>
                        <Badge tone={hasTemplate ? "success" : "warning"}>{hasTemplate ? "testable_price_source" : "base_price_source_needs_template"}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={placeholder && source.enabled ? "danger" : source.enabled ? "success" : "neutral"}>
                        {placeholder && source.enabled ? "有効・要無効化" : source.enabled ? "有効" : "無効"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs leading-5">
                      <div>最終成功: {dateTime(source.lastSuccessAt)}</div>
                      <div>最終HTTP: {source.lastHttpStatus ?? "-"}</div>
                      <div>成功 {source.successCount} / 失敗 {source.failureCount}</div>
                      {source.lastError ? <div className="mt-1 text-rose-700">{source.lastError}</div> : null}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs leading-5">
                      {source.memo?.includes("AI自動有効化") ? <Badge tone="success">AI自動有効化</Badge> : <Badge tone="neutral">手動/未自動</Badge>}
                      <div className="mt-1 text-muted-foreground">最終テスト成功: {dateTime(source.lastSuccessAt)}</div>
                      <div className="text-muted-foreground">連続失敗目安: {source.failureCount}</div>
                      {source.memo?.includes("自動停止") ? <div className="mt-1 text-rose-700">{lastAutomationLine(source.memo, "自動停止")}</div> : null}
                      {source.memo?.includes("AI自動有効化") ? <div className="mt-1 text-emerald-700">{lastAutomationLine(source.memo, "AI自動有効化")}</div> : null}
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
                            {source.enabled ? "無効化" : placeholder ? "有効化不可" : !hasTemplate ? "要テンプレート" : "有効化"}
                          </button>
                        </form>
                        {hasTemplate ? <PriceSourceTestButton priceSourceId={source.id} /> : <div className="text-xs text-amber-700">テスト取得不可</div>}
                        {!hasTemplate ? (
                          <form action={inferPriceSourceTemplateAction}>
                            <input type="hidden" name="id" value={source.id} />
                            <button className={secondaryButtonClass} type="submit">推定して保存</button>
                          </form>
                        ) : null}
                        {!hasTemplate ? <div className="text-xs text-muted-foreground">推定成功後に有効化候補として表示されます</div> : null}
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

function lastAutomationLine(memo: string | null, keyword: string) {
  return memo
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes(keyword))
    .at(-1) ?? "";
}
