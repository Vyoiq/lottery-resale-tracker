import { access } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { Badge, Card, PageHeader, secondaryButtonClass } from "@/components/ui";
import { dateTime, relativeCount } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { getBackupDirectory } from "@/services/backups/backupService";
import { operationTypeLabel } from "@/services/operations/operationRunner";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const dbStatus = await checkDb();
  const [
    watchSources,
    priceSources,
    latestCollectRun,
    latestPriceCollectRun,
    latestBackup,
    latestOperationRun,
    backupsDirectoryExists,
    logsDirectoryExists
  ] = await Promise.all([
    prisma.watchSource.findMany().catch(() => []),
    prisma.priceSource.findMany().catch(() => []),
    prisma.operationRun.findFirst({ where: { type: "collect" }, orderBy: { startedAt: "desc" } }).catch(() => null),
    prisma.operationRun.findFirst({ where: { type: "price_collect" }, orderBy: { startedAt: "desc" } }).catch(() => null),
    prisma.backupRecord.findFirst({ orderBy: { createdAt: "desc" } }).catch(() => null),
    prisma.operationRun.findFirst({ orderBy: { startedAt: "desc" } }).catch(() => null),
    exists(getBackupDirectory()),
    exists(path.resolve(process.cwd(), "logs"))
  ]);

  const placeholderWatchSources = watchSources.filter((source) => placeholderSourceReason(source));
  const enabledPlaceholderWatchSources = placeholderWatchSources.filter((source) => source.enabled);
  const placeholderPriceSources = priceSources.filter((source) => placeholderSourceReason(source));
  const enabledPlaceholderPriceSources = placeholderPriceSources.filter((source) => source.enabled);
  const enabledWatchSourceCount = watchSources.filter((source) => source.enabled).length;
  const enabledPriceSourceCount = priceSources.filter((source) => source.enabled).length;
  const usableEnabledPriceSourceCount = priceSources.filter((source) => source.enabled && !placeholderSourceReason(source)).length;

  return (
    <>
      <PageHeader title="ヘルスチェック" description="DB、ソース、実行ログ、バックアップ、プレースホルダーURLの安全状態を確認します。">
        <Link href="/getting-started" className={secondaryButtonClass}>初回セットアップガイド</Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">基本状態</h2>
          <div className="grid gap-3">
            <HealthRow label="DB接続" ok={dbStatus.ok} value={dbStatus.ok ? "接続できます" : dbStatus.message} />
            <HealthRow label="backups/ ディレクトリ" ok={backupsDirectoryExists} value={backupsDirectoryExists ? "存在します" : "まだありません"} neutral={!backupsDirectoryExists} />
            <HealthRow label="logs/ ディレクトリ" ok={logsDirectoryExists} value={logsDirectoryExists ? "存在します" : "まだありません"} neutral={!logsDirectoryExists} />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold">ソース設定</h2>
          <div className="grid gap-3">
            <HealthRow label="WatchSource 件数" ok={watchSources.length > 0} value={`${relativeCount(watchSources.length)}件`} />
            <HealthRow label="有効な WatchSource" ok={enabledWatchSourceCount > 0} value={`${relativeCount(enabledWatchSourceCount)}件`} />
            <HealthRow label="PriceSource 件数" ok={priceSources.length > 0} value={`${relativeCount(priceSources.length)}件`} />
            <HealthRow label="有効な PriceSource" ok={enabledPriceSourceCount > 0} value={`${relativeCount(enabledPriceSourceCount)}件`} />
            <HealthRow label="有効な実URL PriceSource" ok={usableEnabledPriceSourceCount > 0} value={`${relativeCount(usableEnabledPriceSourceCount)}件`} />
          </div>
        </Card>

        <Card className={`p-4 lg:col-span-2 ${enabledPlaceholderWatchSources.length > 0 || enabledPlaceholderPriceSources.length > 0 ? "border-rose-200 bg-rose-50/70" : ""}`}>
          <h2 className="mb-3 font-semibold">プレースホルダーURL安全チェック</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <HealthRow label="プレースホルダー WatchSource" ok={placeholderWatchSources.length === 0} value={`${relativeCount(placeholderWatchSources.length)}件`} neutral={placeholderWatchSources.length > 0 && enabledPlaceholderWatchSources.length === 0} />
            <HealthRow label="危険: 有効なプレースホルダー WatchSource" ok={enabledPlaceholderWatchSources.length === 0} value={`${relativeCount(enabledPlaceholderWatchSources.length)}件`} danger={enabledPlaceholderWatchSources.length > 0} />
            <HealthRow label="プレースホルダー PriceSource" ok={placeholderPriceSources.length === 0} value={`${relativeCount(placeholderPriceSources.length)}件`} neutral={placeholderPriceSources.length > 0 && enabledPlaceholderPriceSources.length === 0} />
            <HealthRow label="危険: 有効なプレースホルダー PriceSource" ok={enabledPlaceholderPriceSources.length === 0} value={`${relativeCount(enabledPlaceholderPriceSources.length)}件`} danger={enabledPlaceholderPriceSources.length > 0} />
          </div>
          {enabledPlaceholderWatchSources.length > 0 || enabledPlaceholderPriceSources.length > 0 ? (
            <div className="mt-4 text-sm leading-6 text-rose-800">
              危険なソースがあります。`npm run cleanup:placeholders` または `/sources` / `/price-sources` の「プレースホルダーを無効化」を実行してください。
            </div>
          ) : null}
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

function HealthRow({ label, value, ok, neutral, danger }: { label: string; value: string; ok: boolean; neutral?: boolean; danger?: boolean }) {
  const tone = danger ? "danger" : neutral ? "neutral" : ok ? "success" : "warning";
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge tone={tone}>{danger ? "危険" : neutral ? "確認" : ok ? "OK" : "確認"}</Badge>
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
