import { testPriceCollection } from "@/services/priceCollectors/base";
import { prisma } from "@/lib/prisma";
import { yen } from "@/lib/format";
import { Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass } from "@/components/ui";

export default async function PriceCheckerPage({
  searchParams
}: {
  searchParams: { productName?: string; priceSourceId?: string };
}) {
  const productName = searchParams.productName?.trim() ?? "";
  const priceSourceId = searchParams.priceSourceId ?? "";
  const sources = await prisma.priceSource.findMany({ orderBy: [{ enabled: "desc" }, { shopName: "asc" }] });
  let result: Awaited<ReturnType<typeof testPriceCollection>> | null = null;
  let errorMessage: string | null = null;

  if (productName) {
    try {
      result = await testPriceCollection({ productName, priceSourceId: priceSourceId || undefined });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <>
      <PageHeader title="価格テスト" description="商品名の揺れ、買取/販売判定、除外理由をdry-runで確認します。DB保存は行いません。" />
      <Card className="mb-6 p-4">
        <form className="grid gap-4 md:grid-cols-[1fr_260px_auto]">
          <Field label="商品名"><input className={inputClass} name="productName" defaultValue={productName} required /></Field>
          <Field label="PriceSource">
            <select className={inputClass} name="priceSourceId" defaultValue={priceSourceId}>
              <option value="">有効なソースから選択</option>
              {sources.map((source) => <option key={source.id} value={source.id}>{source.shopName} - {source.name}</option>)}
            </select>
          </Field>
          <div className="flex items-end"><button className={secondaryButtonClass} type="submit">dry-run</button></div>
        </form>
      </Card>

      {errorMessage ? <Card className="mb-6 p-4 text-sm text-rose-700">{errorMessage}</Card> : null}
      {!productName ? <EmptyState message="商品名を入力してテストしてください。" /> : null}

      {result ? (
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-3 font-semibold">検索デバッグ</h2>
            <div className="text-sm">
              <div className="mb-2 text-muted-foreground">実際に使った検索キーワード</div>
              <div className="flex flex-wrap gap-2">
                {result.result.keywords.map((keyword) => (
                  <span key={keyword} className="rounded bg-muted px-2 py-1 text-xs font-medium">{keyword}</span>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {result.result.searches.map((search) => (
                <div key={search.searchUrl} className="rounded border border-border p-3">
                  <div className="font-medium">{search.keyword}</div>
                  <a className="break-all text-xs text-primary" href={search.searchUrl} target="_blank">{search.searchUrl}</a>
                  <div className="mt-1 text-xs text-muted-foreground">HTTP {search.httpStatus} / 候補 {search.candidates.length} / 除外 {search.rejected.length}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold">採用候補</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">検索キーワード</th>
                  <th className="px-4 py-3">候補タイトル</th>
                  <th className="px-4 py-3 text-right">抽出価格</th>
                  <th className="px-4 py-3">判定</th>
                  <th className="px-4 py-3">confidenceScore</th>
                  <th className="px-4 py-3">URL/rawText</th>
                </tr>
              </thead>
              <tbody>
                {result.result.candidates.map((candidate, index) => (
                  <tr key={`${candidate.sourceUrl}-${index}`} className="border-t border-border align-top">
                    <td className="px-4 py-3 text-xs">{candidate.usedKeyword ?? "-"}</td>
                    <td className="max-w-sm px-4 py-3">{candidate.matchedTitle}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{yen(candidate.price)}</td>
                    <td className="px-4 py-3">{candidate.priceKind === "buy" ? "買取" : candidate.priceKind === "sell" ? "販売" : "不明"}</td>
                    <td className="px-4 py-3 tabular-nums">{candidate.confidenceScore.toFixed(2)}</td>
                    <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">
                      <a className="text-primary" href={candidate.sourceUrl} target="_blank">検索URLを開く</a>
                      <div className="mt-2">{candidate.rawText.slice(0, 240)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.result.candidates.length === 0 ? <div className="p-4"><EmptyState message="採用候補が見つかりませんでした。" /></div> : null}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold">除外された候補</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">検索キーワード</th>
                  <th className="px-4 py-3">候補タイトル</th>
                  <th className="px-4 py-3 text-right">価格</th>
                  <th className="px-4 py-3">判定</th>
                  <th className="px-4 py-3">score</th>
                  <th className="px-4 py-3">除外理由</th>
                  <th className="px-4 py-3">rawText</th>
                </tr>
              </thead>
              <tbody>
                {result.result.rejected.map((candidate, index) => (
                  <tr key={`${candidate.matchedTitle}-${index}`} className="border-t border-border align-top">
                    <td className="px-4 py-3 text-xs">{candidate.usedKeyword ?? "-"}</td>
                    <td className="max-w-sm px-4 py-3">{candidate.matchedTitle}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{yen(candidate.price)}</td>
                    <td className="px-4 py-3">{candidate.priceKind === "buy" ? "買取" : candidate.priceKind === "sell" ? "販売" : "不明"}</td>
                    <td className="px-4 py-3 tabular-nums">{candidate.confidenceScore.toFixed(2)}</td>
                    <td className="px-4 py-3 text-rose-700">{candidate.reason}</td>
                    <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">{candidate.rawText.slice(0, 220)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.result.rejected.length === 0 ? <div className="p-4"><EmptyState message="除外候補はありません。" /></div> : null}
          </Card>
        </div>
      ) : null}
    </>
  );
}
