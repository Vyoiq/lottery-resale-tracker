import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateTime } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, secondaryButtonClass, StatCard } from "@/components/ui";

function durationMs(start: Date, end?: Date | null) {
  if (!end) return "-";
  const ms = end.getTime() - start.getTime();
  return `${(ms / 1000).toFixed(1)}秒`;
}

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const run = await prisma.collectorRun.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { startedAt: "asc" } } }
  });
  if (!run) notFound();

  return (
    <>
      <PageHeader title="収集ログ詳細" description="ソースごとの取得結果、HTTPステータス、キーワード、エラーを確認します。">
        <Link href="/runs" className={secondaryButtonClass}>一覧へ戻る</Link>
      </PageHeader>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="実行開始日時" value={dateTime(run.startedAt)} />
        <StatCard label="実行終了日時" value={dateTime(run.finishedAt)} />
        <StatCard label="実行時間" value={durationMs(run.startedAt, run.finishedAt)} />
        <StatCard label="対象ソース数" value={`${run.targetSourceCount}件`} />
        <StatCard label="成功数" value={`${run.successCount}件`} />
        <StatCard label="失敗数" value={`${run.errorCount}件`} />
        <StatCard label="新規/更新" value={`${run.newListingCount} / ${run.updatedListingCount}`} />
        <StatCard label="スキップ数" value={`${run.skippedCount}件`} />
      </div>

      {run.errorMessage ? (
        <Card className="mb-6 p-4">
          <h2 className="mb-2 font-semibold">エラー内容</h2>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{run.errorMessage}</pre>
        </Card>
      ) : null}

      {run.items.length === 0 ? (
        <EmptyState message="ソースごとの結果がありません。" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ソース</th>
                <th className="px-4 py-3">結果</th>
                <th className="px-4 py-3">HTTP</th>
                <th className="px-4 py-3">取得件数</th>
                <th className="px-4 py-3">新規/更新/skip</th>
                <th className="px-4 py-3">キーワード</th>
                <th className="px-4 py-3">エラー</th>
              </tr>
            </thead>
            <tbody>
              {run.items.map((item) => (
                <tr key={item.id} className="border-t border-border align-top">
                  <td className="max-w-sm px-4 py-3">
                    <div className="font-medium">{item.sourceName}</div>
                    <a className="text-xs text-primary" href={item.sourceUrl} target="_blank">{item.sourceUrl}</a>
                  </td>
                  <td className="px-4 py-3"><Badge tone={item.success ? "success" : "danger"}>{item.success ? "成功" : "失敗"}</Badge></td>
                  <td className="px-4 py-3 tabular-nums">{item.httpStatus ?? "-"}</td>
                  <td className="px-4 py-3 tabular-nums">{item.fetchedCount}</td>
                  <td className="px-4 py-3 tabular-nums">{item.newListingCount} / {item.updatedListingCount} / {item.skippedCount}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">{item.matchedKeywords || "-"}</td>
                  <td className="max-w-sm px-4 py-3 text-xs text-muted-foreground">{item.errorMessage ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
