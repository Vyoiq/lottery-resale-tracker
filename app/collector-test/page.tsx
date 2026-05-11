import { dryRunUrl } from "@/services/collectors/base";
import { sourceTypes } from "@/lib/domain";
import { dateOnly, sourceTypeLabels } from "@/lib/format";
import { Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass } from "@/components/ui";

export default async function CollectorTestPage({
  searchParams
}: {
  searchParams: { url?: string; type?: string; storeName?: string; sourceName?: string };
}) {
  const url = searchParams.url?.trim() ?? "";
  const type = searchParams.type || "html";
  const storeName = searchParams.storeName?.trim() || "テスト店舗";
  const sourceName = searchParams.sourceName?.trim() || "テストURL";
  let result: Awaited<ReturnType<typeof dryRunUrl>> | null = null;
  let errorMessage: string | null = null;

  if (url) {
    try {
      result = await dryRunUrl({ url, type, storeName, sourceName });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <>
      <PageHeader title="テスト収集" description="監視ソースに登録せず、指定URLをdry-runで取得・抽出します。DB保存は行いません。" />

      <Card className="mb-6 p-4">
        <form className="grid gap-4 md:grid-cols-[1fr_160px_180px_180px_auto]">
          <Field label="URL">
            <input className={inputClass} name="url" type="url" defaultValue={url} required />
          </Field>
          <Field label="種別">
            <select className={inputClass} name="type" defaultValue={type}>
              {sourceTypes.map((item) => <option key={item} value={item}>{sourceTypeLabels[item]}</option>)}
            </select>
          </Field>
          <Field label="店舗名">
            <input className={inputClass} name="storeName" defaultValue={storeName} />
          </Field>
          <Field label="ソース名">
            <input className={inputClass} name="sourceName" defaultValue={sourceName} />
          </Field>
          <div className="flex items-end">
            <button className={secondaryButtonClass} type="submit">テスト実行</button>
          </div>
        </form>
      </Card>

      {errorMessage ? (
        <Card className="mb-6 p-4">
          <h2 className="mb-2 font-semibold">取得エラー</h2>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{errorMessage}</pre>
        </Card>
      ) : null}

      {!url ? (
        <EmptyState message="URLを入力してテスト実行してください。" />
      ) : result ? (
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-3 font-semibold">取得結果</h2>
            <div className="grid gap-3 text-sm md:grid-cols-4">
              <div><span className="text-muted-foreground">HTTP</span><div className="font-medium">{result.httpStatus ?? "-"}</div></div>
              <div><span className="text-muted-foreground">抽出候補</span><div className="font-medium">{result.candidates.length}件</div></div>
              <div><span className="text-muted-foreground">保存予定</span><div className="font-medium">{result.listings.length}件</div></div>
              <div><span className="text-muted-foreground">キーワード</span><div className="font-medium">{result.matchedKeywords.join(", ") || "-"}</div></div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">抽出タイトル</th>
                  <th className="px-4 py-3">本文/リンク</th>
                  <th className="px-4 py-3">キーワード</th>
                  <th className="px-4 py-3">日付候補</th>
                  <th className="px-4 py-3">保存予定 LotteryListing</th>
                </tr>
              </thead>
              <tbody>
                {result.listings.map((listing, index) => (
                  <tr key={`${listing.lotteryUrl}-${index}`} className="border-t border-border align-top">
                    <td className="max-w-xs px-4 py-3 font-medium">{listing.title}</td>
                    <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">
                      <a className="text-primary" href={listing.lotteryUrl} target="_blank">{listing.lotteryUrl}</a>
                      <div className="mt-2">{listing.description}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{listing.matchedKeywords || "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{listing.extractedDatesRaw || "-"}</td>
                    <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">
                      <div>商品名: {listing.productName}</div>
                      <div>締切: {dateOnly(listing.applicationEndAt)}</div>
                      <div>状態: {listing.status}</div>
                      <div>score: {listing.confidenceScore.toFixed(2)}</div>
                      <div>理由: {listing.confidenceReason}</div>
                      <div>hash: {listing.contentHash?.slice(0, 16)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.listings.length === 0 ? <div className="p-4"><EmptyState message="保存予定の候補はありません。キーワードや日付抽出結果を確認してください。" /></div> : null}
          </Card>
        </div>
      ) : null}
    </>
  );
}
