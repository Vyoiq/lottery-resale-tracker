import { prisma } from "@/lib/prisma";
import { dateTime } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import Link from "next/link";

export default async function RunsPage() {
  const runs = await prisma.collectorRun.findMany({ orderBy: { startedAt: "desc" }, take: 100 });

  return (
    <>
      <PageHeader title="収集ログ" description="collector の手動実行/API実行ログです。" />
      {runs.length === 0 ? (
        <EmptyState message="収集ログがありません。" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">開始</th>
                <th className="px-4 py-3">終了</th>
                <th className="px-4 py-3">成功</th>
                <th className="px-4 py-3">エラー</th>
                <th className="px-4 py-3">新規</th>
                <th className="px-4 py-3">更新</th>
                <th className="px-4 py-3">結果</th>
                <th className="px-4 py-3 text-right">詳細</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">{dateTime(run.startedAt)}</td>
                  <td className="px-4 py-3">{dateTime(run.finishedAt)}</td>
                  <td className="px-4 py-3 tabular-nums">{run.successCount}</td>
                  <td className="px-4 py-3 tabular-nums">{run.errorCount}</td>
                  <td className="px-4 py-3 tabular-nums">{run.newListingCount}</td>
                  <td className="px-4 py-3 tabular-nums">{run.updatedListingCount}</td>
                  <td className="px-4 py-3">
                    <Badge tone={run.errorCount > 0 ? "warning" : "success"}>{run.errorCount > 0 ? "一部失敗" : "成功"}</Badge>
                    {run.errorMessage ? <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{run.errorMessage}</pre> : null}
                  </td>
                  <td className="px-4 py-3 text-right"><Link className="text-primary" href={`/runs/${run.id}`}>開く</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
