import { dateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { operationTypeLabel } from "@/services/operations/operationRunner";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OperationRunsPage() {
  const runs = await prisma.operationRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 200
  });

  return (
    <>
      <PageHeader title="運用実行ログ" description="収集、価格取得、通知、バックアップ、一括実行の結果を確認します。" />
      {runs.length === 0 ? (
        <EmptyState message="運用実行ログはありません。" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">開始</th>
                <th className="px-4 py-3">終了</th>
                <th className="px-4 py-3">結果</th>
                <th className="px-4 py-3">メッセージ</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-medium">{operationTypeLabel(run.type)}</td>
                  <td className="px-4 py-3">{dateTime(run.startedAt)}</td>
                  <td className="px-4 py-3">{dateTime(run.finishedAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={run.success ? "success" : "danger"}>{run.success ? "成功" : "失敗"}</Badge>
                  </td>
                  <td className="max-w-2xl whitespace-pre-wrap px-4 py-3 text-muted-foreground">{run.message ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
