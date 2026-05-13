import { access } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { Badge, Card, PageHeader, secondaryButtonClass } from "@/components/ui";
import { dateTime, relativeCount } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getBackupDirectory } from "@/services/backups/backupService";
import { operationTypeLabel } from "@/services/operations/operationRunner";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const dbStatus = await checkDb();
  const [
    watchSourceCount,
    enabledWatchSourceCount,
    priceSourceCount,
    enabledPriceSourceCount,
    latestCollectRun,
    latestPriceCollectRun,
    latestBackup,
    latestOperationRun,
    backupsDirectoryExists,
    logsDirectoryExists
  ] = await Promise.all([
    prisma.watchSource.count().catch(() => 0),
    prisma.watchSource.count({ where: { enabled: true } }).catch(() => 0),
    prisma.priceSource.count().catch(() => 0),
    prisma.priceSource.count({ where: { enabled: true } }).catch(() => 0),
    prisma.operationRun.findFirst({ where: { type: "collect" }, orderBy: { startedAt: "desc" } }).catch(() => null),
    prisma.operationRun.findFirst({ where: { type: "price_collect" }, orderBy: { startedAt: "desc" } }).catch(() => null),
    prisma.backupRecord.findFirst({ orderBy: { createdAt: "desc" } }).catch(() => null),
    prisma.operationRun.findFirst({ orderBy: { startedAt: "desc" } }).catch(() => null),
    exists(getBackupDirectory()),
    exists(path.resolve(process.cwd(), "logs"))
  ]);

  return (
    <>
      <PageHeader title="ヘルスチェック" description="ローカル運用に必要なDB、ソース、実行ログ、バックアップ/ログディレクトリの状態を確認します。">
        <Link href="/getting-started" className={secondaryButtonClass}>初回セットアップガイド</Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">基本状態</h2>
          <div className="grid gap-3">
            <HealthRow label="DB接続" ok={dbStatus.ok} value={dbStatus.ok ? "接続できます" : dbStatus.message} />
            <HealthRow label="backups/ ディレクトリ" ok={backupsDirectoryExists} value={backupsDirectoryExists ? "存在します" : "まだありません"} />
            <HealthRow label="logs/ ディレクトリ" ok={logsDirectoryExists} value={logsDirectoryExists ? "存在します" : "まだありません"} neutral={!logsDirectoryExists} />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold">ソース設定</h2>
          <div className="grid gap-3">
            <HealthRow label="WatchSource 件数" ok={watchSourceCount > 0} value={`${relativeCount(watchSourceCount)}件`} />
            <HealthRow label="有効な WatchSource" ok={enabledWatchSourceCount > 0} value={`${relativeCount(enabledWatchSourceCount)}件`} />
            <HealthRow label="PriceSource 件数" ok={priceSourceCount > 0} value={`${relativeCount(priceSourceCount)}件`} />
            <HealthRow label="有効な PriceSource" ok={enabledPriceSourceCount > 0} value={`${relativeCount(enabledPriceSourceCount)}件`} />
          </div>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">実行履歴</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <HealthRow label="最終 collect 実行" ok={Boolean(latestCollectRun)} value={latestCollectRun ? `${dateTime(latestCollectRun.finishedAt ?? latestCollectRun.startedAt)} / ${latestCollectRun.success ? "成功" : "失敗"}` : "未実行"} />
            <HealthRow label="最終 price collect 実行" ok={Boolean(latestPriceCollectRun)} value={latestPriceCollectRun ? `${dateTime(latestPriceCollectRun.finishedAt ?? latestPriceCollectRun.startedAt)} / ${latestPriceCollectRun.success ? "成功" : "失敗"}` : "未実行"} />
            <HealthRow label="最終 backup" ok={Boolean(latestBackup)} value={latestBackup ? `${dateTime(latestBackup.createdAt)} / ${latestBackup.filename}` : "未作成"} />
            <HealthRow label="最終運用実行" ok={Boolean(latestOperationRun)} value={latestOperationRun ? `${operationTypeLabel(latestOperationRun.type)} / ${dateTime(latestOperationRun.finishedAt ?? latestOperationRun.startedAt)} / ${latestOperationRun.success ? "成功" : "失敗"}` : "未実行"} />
          </div>
        </Card>
      </div>
    </>
  );
}

function HealthRow({ label, value, ok, neutral }: { label: string; value: string; ok: boolean; neutral?: boolean }) {
  const tone = neutral ? "neutral" : ok ? "success" : "warning";
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge tone={tone}>{neutral ? "任意" : ok ? "OK" : "確認"}</Badge>
        <span className="break-all">{value}</span>
      </div>
    </div>
  );
}

async function checkDb() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return { ok: true, message: "接続できます" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function exists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}
