import { createBackupAction, deleteBackupAction } from "@/lib/actions";
import { formatBytes } from "@/lib/exportUtils";
import { dateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buttonClass, Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const backups = await prisma.backupRecord.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <PageHeader title="バックアップ" description="SQLite DB の手動バックアップを作成、ダウンロード、削除できます。復元機能はまだ実装していません。">
        <form action={createBackupAction} className="flex gap-2">
          <input className={inputClass} name="memo" placeholder="メモ任意" />
          <button className={buttonClass} type="submit">バックアップ作成</button>
        </form>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <a className={secondaryButtonClass} href="/api/export/json">JSONエクスポート</a>
          <a className={secondaryButtonClass} href="/api/export/lotteries">抽選一覧CSV</a>
          <a className={secondaryButtonClass} href="/api/export/prices">価格履歴CSV</a>
          <a className={secondaryButtonClass} href="/api/export/sales">応募・売却履歴CSV</a>
        </div>
      </Card>

      {backups.length === 0 ? (
        <EmptyState
          title="バックアップはまだありません"
          message="SQLite DB はローカルファイルなので、初回セットアップ後と運用前後にバックアップを作成しておくと安心です。作成されたDBコピーは backups/ に保存され、Gitには含めません。"
          action={
            <form action={createBackupAction}>
              <button className={buttonClass} type="submit">今すぐバックアップ作成</button>
            </form>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ファイル名</th>
                <th className="px-4 py-3">作成日時</th>
                <th className="px-4 py-3 text-right">サイズ</th>
                <th className="px-4 py-3">メモ</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{backup.filename}</td>
                  <td className="px-4 py-3">{dateTime(backup.createdAt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBytes(backup.sizeBytes)}</td>
                  <td className="max-w-sm px-4 py-3 text-muted-foreground">{backup.memo ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <a className={secondaryButtonClass} href={`/api/backups/${backup.id}/download`}>ダウンロード</a>
                      <form action={deleteBackupAction}>
                        <input type="hidden" name="id" value={backup.id} />
                        <button className="inline-flex h-10 items-center justify-center rounded-md border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50" type="submit">
                          削除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="mt-4 p-4 text-sm text-muted-foreground">
        <Field label="保存先">
          <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs">backups/</div>
        </Field>
      </Card>
    </>
  );
}
