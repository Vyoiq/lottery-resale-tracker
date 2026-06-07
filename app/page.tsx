import Link from "next/link";
import { createBackupAction, generateNotificationsAction, runCollectorsAction, runOperationTasksAction, runPriceCollectorsAction } from "@/lib/actions";
import { endOfDay, startOfDay, subDays } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { priorityLabelText, priorityTone } from "@/lib/priority";
import {
  applicationStatusLabels,
  dateOnly,
  dateTime,
  multiple,
  notificationSeverityLabels,
  percent,
  relativeCount,
  yen
} from "@/lib/format";
import { Badge, buttonClass, Card, EmptyState, PageHeader, StatCard, secondaryButtonClass } from "@/components/ui";
import { operationTypeLabel } from "@/services/operations/operationRunner";

export const dynamic = "force-dynamic";

type ListingWithPrice = Awaited<ReturnType<typeof prisma.lotteryListing.findMany>>[number] & {
  priceRecords?: { confidenceScore: number }[];
};

type NotificationWithListing = Awaited<ReturnType<typeof prisma.notification.findMany>>[number] & {
  lotteryListing: { id: string; productName: string; storeName: string };
};

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yesterday = subDays(now, 1);

  const [
    applicationCandidates,
    todayDeadlineListings,
    latestRun,
    sourcesCount,
    statusGroups,
    thisMonthSold,
    allSold,
    purchasedUnsoldCount,
    highProfitListings,
    highRoiListings,
    uncheckedPriceListings,
    priceErrorListings,
    newListings,
    unreadNotificationCount,
    importantUnreadCount,
    latestNotifications,
    latestBackup,
    backupCount,
    latestOperationRun,
    activePriceSourceCount,
    recommendedSourcePresets,
    recommendedPriceSourcePresets,
    existingWatchSourceUrls,
    existingPriceSources,
    newWatchSourceCandidateCount,
    newPriceSourceCandidateCount,
    uncheckedDiscoveredSourceCount
  ] = await Promise.all([
    prisma.lotteryListing.findMany({
      where: {
        ignored: false,
        status: "active",
        applicationEndAt: { gte: now },
        priceStatus: "found",
        estimatedProfit: { gt: 0 },
        priceRecords: { some: { confidenceScore: { gte: 0.7 } } }
      },
      include: { priceRecords: { orderBy: [{ price: "desc" }, { confidenceScore: "desc" }], take: 1 } },
      orderBy: [{ applicationPriorityScore: "desc" }, { estimatedProfit: "desc" }],
      take: 8
    }),
    prisma.lotteryListing.findMany({
      where: { ignored: false, status: "active", applicationEndAt: { gte: todayStart, lte: todayEnd } },
      orderBy: { applicationEndAt: "asc" },
      take: 8
    }),
    prisma.collectorRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.watchSource.count({ where: { enabled: true } }),
    prisma.lotteryListing.groupBy({ by: ["applicationStatus"], _count: true }),
    prisma.lotteryListing.findMany({
      where: { applicationStatus: "sold", soldAt: { gte: monthStart }, actualProfit: { not: null } },
      select: { actualProfit: true, actualRoi: true }
    }),
    prisma.lotteryListing.findMany({
      where: { applicationStatus: "sold", actualProfit: { not: null } },
      select: { actualProfit: true, actualRoi: true }
    }),
    prisma.lotteryListing.count({ where: { applicationStatus: "purchased" } }),
    prisma.lotteryListing.findMany({
      where: { ignored: false, status: "active", applicationEndAt: { gte: now }, estimatedProfit: { not: null } },
      include: { priceRecords: { orderBy: [{ price: "desc" }, { confidenceScore: "desc" }], take: 1 } },
      orderBy: { estimatedProfit: "desc" },
      take: 8
    }),
    prisma.lotteryListing.findMany({
      where: { ignored: false, status: "active", applicationEndAt: { gte: now }, roi: { not: null } },
      include: { priceRecords: { orderBy: [{ price: "desc" }, { confidenceScore: "desc" }], take: 1 } },
      orderBy: { roi: "desc" },
      take: 8
    }),
    prisma.lotteryListing.findMany({ where: { ignored: false, priceStatus: "unchecked" }, orderBy: { detectedAt: "desc" }, take: 8 }),
    prisma.lotteryListing.findMany({ where: { ignored: false, priceStatus: "error" }, orderBy: { priceCheckedAt: "desc" }, take: 8 }),
    prisma.lotteryListing.findMany({ where: { ignored: false, detectedAt: { gte: yesterday } }, orderBy: { detectedAt: "desc" }, take: 8 }),
    prisma.notification.count({ where: { read: false } }),
    prisma.notification.count({ where: { read: false, severity: "important" } }),
    prisma.notification.findMany({
      where: { read: false },
      include: { lotteryListing: { select: { id: true, productName: true, storeName: true } } },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      take: 6
    }),
    prisma.backupRecord.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.backupRecord.count(),
    prisma.operationRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.priceSource.count({ where: { enabled: true } }),
    prisma.sourcePreset.findMany({ where: { recommended: true }, select: { url: true } }),
    prisma.priceSourcePreset.findMany({ where: { recommended: true }, select: { baseUrl: true, searchUrlTemplate: true } }),
    prisma.watchSource.findMany({ select: { url: true } }),
    prisma.priceSource.findMany({ select: { baseUrl: true, searchUrlTemplate: true } }),
    prisma.discoveredSource.count({ where: { status: "new", detectedType: "watch_source_candidate" } }),
    prisma.discoveredSource.count({ where: { status: "new", detectedType: "price_source_candidate" } }),
    prisma.discoveredSource.count({ where: { status: "new" } })
  ]);

  const statusCounts = Object.fromEntries(statusGroups.map((item) => [item.applicationStatus, item._count]));
  const appliedCount = (statusCounts.applied ?? 0) + (statusCounts.won ?? 0) + (statusCounts.lost ?? 0) + (statusCounts.purchased ?? 0) + (statusCounts.sold ?? 0);
  const wonCount = (statusCounts.won ?? 0) + (statusCounts.purchased ?? 0) + (statusCounts.sold ?? 0);
  const lostCount = statusCounts.lost ?? 0;
  const purchasedCount = (statusCounts.purchased ?? 0) + (statusCounts.sold ?? 0);
  const soldCount = statusCounts.sold ?? 0;
  const thisMonthProfit = sum(thisMonthSold.map((item) => item.actualProfit));
  const totalProfit = sum(allSold.map((item) => item.actualProfit));
  const avgActualRoi = average(allSold.map((item) => item.actualRoi));
  const winRate = appliedCount > 0 ? (wonCount / appliedCount) * 100 : null;
  const existingWatchUrls = new Set(existingWatchSourceUrls.map((source) => source.url));
  const existingPriceBaseUrls = new Set(existingPriceSources.map((source) => source.baseUrl));
  const existingPriceTemplates = new Set(existingPriceSources.map((source) => source.searchUrlTemplate));
  const unaddedRecommendedPresetCount =
    recommendedSourcePresets.filter((preset) => !existingWatchUrls.has(preset.url)).length +
    recommendedPriceSourcePresets.filter((preset) => !existingPriceBaseUrls.has(preset.baseUrl) && !existingPriceTemplates.has(preset.searchUrlTemplate)).length;
  const latestOperationAt = latestOperationRun?.finishedAt ?? latestOperationRun?.startedAt ?? null;
  const isOperationStale = latestOperationAt ? now.getTime() - latestOperationAt.getTime() > 24 * 60 * 60 * 1000 : true;
  const setupWarnings = [
    sourcesCount === 0 ? { title: "有効な監視ソースがありません", body: "Auto Pilotで公開ページ候補を自動探索し、安全チェック済みのものだけ自動有効化します。自動応募・自動購入は行いません。", href: "/simple", link: "Auto Pilotを使う" } : null,
    activePriceSourceCount === 0 ? { title: "有効な価格ソースがありません", body: "Auto Pilotで価格ソース候補の探索、テンプレート推定、テスト取得まで自動整理します。安全条件を満たすものだけ有効化します。", href: "/simple", link: "Auto Pilotを使う" } : null,
    sourcesCount === 0 ? { title: "有効な監視ソースが0件です", body: "抽選情報を収集するには、監視ソースを追加して有効化してください。", href: "/sources/presets", link: "監視ソースプリセットへ" } : null,
    activePriceSourceCount === 0 ? { title: "有効な価格ソースが0件です", body: "買取価格候補を取得するには、価格ソースを追加して有効化してください。", href: "/price-sources/presets", link: "価格ソースプリセットへ" } : null,
    backupCount === 0 ? { title: "バックアップが未作成です", body: "SQLite DBの消失に備えて、初回設定後にバックアップを作成してください。", href: "/backups", link: "バックアップへ" } : null,
    isOperationStale ? { title: "最終運用実行から24時間以上経過しています", body: "毎日使う場合は、一括実行または npm run operate の定期実行を確認してください。", href: "/settings/operations", link: "運用設定へ" } : null
  ].filter((item): item is { title: string; body: string; href: string; link: string } =>
    item !== null && item.href !== "/sources/presets" && item.href !== "/price-sources/presets"
  );

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        description="抽選情報、買取価格、応募状況、確定利益、通知をまとめて確認します。応募や購入処理の自動化は行いません。"
      >
        <div className="hidden">
          <form action={runCollectorsAction}>
            <button className={buttonClass} type="submit">抽選情報を更新</button>
          </form>
          <form action={runPriceCollectorsAction}>
            <button className={secondaryButtonClass} type="submit">買取価格を更新</button>
          </form>
          <form action={generateNotificationsAction}>
            <button className={secondaryButtonClass} type="submit">通知を更新</button>
          </form>
          <form action={runOperationTasksAction}>
            <button className={secondaryButtonClass} type="submit">運用タスクをまとめて実行</button>
          </form>
          <form action={createBackupAction}>
            <button className={secondaryButtonClass} type="submit">バックアップ作成</button>
          </form>
          <Link href="/simple" className={buttonClass}>シンプルモードで見る</Link>
          <Link href="/getting-started" className={secondaryButtonClass}>初回セットアップガイド</Link>
          <Link href="/health" className={secondaryButtonClass}>ヘルスチェック</Link>
          <Link href="/backups" className={secondaryButtonClass}>バックアップ一覧へ</Link>
        </div>
      </PageHeader>

      <Card className="mb-6 border-teal-200 bg-teal-50/70 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-teal-950">毎日の応募判断はシンプルモードで確認</h2>
            <p className="mt-1 text-sm leading-6 text-teal-900">
              商品名、締切、定価、買取価格、想定利益、ROI、価格信頼度だけを絞って表示します。
            </p>
          </div>
          <Link href="/simple" className={`${buttonClass} px-6 py-3 text-base`}>シンプルモードで見る</Link>
        </div>
      </Card>

      {false && setupWarnings.length > 0 ? (
        <Card className="mb-6 border-amber-200 bg-amber-50/70 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-amber-950">初回設定・運用状態の確認が必要です</h2>
              <p className="mt-1 text-sm text-amber-900">収集、価格取得、バックアップ、定期実行の準備状況を確認してください。</p>
            </div>
            <Link href="/getting-started" className={secondaryButtonClass}>初回ガイドを見る</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {setupWarnings.map((warning) => (
              <div key={warning.title} className="rounded-md border border-amber-200 bg-white/70 p-3">
                <div className="font-medium text-amber-950">{warning.title}</div>
                <p className="mt-1 text-sm leading-6 text-amber-900">{warning.body}</p>
                <Link href={warning.href} className="mt-2 inline-flex text-sm font-semibold text-primary">{warning.link}</Link>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_1fr_1.2fr]">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">最新通知</h2>
              <p className="mt-1 text-xs text-muted-foreground">未読 {relativeCount(unreadNotificationCount)}件 / 重要 {relativeCount(importantUnreadCount)}件</p>
            </div>
            <Link href="/notifications" className={secondaryButtonClass}>一覧</Link>
          </div>
          <NotificationList notifications={latestNotifications} compact />
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">今日締切</h2>
              <p className="mt-1 text-xs text-muted-foreground">当日締切の未無視候補</p>
            </div>
            <Link href="/lotteries?sort=deadline" className={secondaryButtonClass}>一覧</Link>
          </div>
          <DeadlineList listings={todayDeadlineListings} />
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">応募候補</h2>
              <p className="mt-1 text-xs text-muted-foreground">高信頼価格かつ想定利益がプラス</p>
            </div>
            <Link href="/lotteries?sort=priority" className={secondaryButtonClass}>一覧</Link>
          </div>
          <CandidateTable listings={applicationCandidates} />
        </Card>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="未読通知" value={`${relativeCount(unreadNotificationCount)}件`} tone={unreadNotificationCount > 0 ? "warning" : "neutral"} />
        <StatCard label="重要通知" value={`${relativeCount(importantUnreadCount)}件`} tone={importantUnreadCount > 0 ? "danger" : "neutral"} />
        <StatCard label="応募済み件数" value={`${relativeCount(appliedCount)}件`} />
        <StatCard label="当選件数" value={`${relativeCount(wonCount)}件`} />
        <StatCard label="売却済み件数" value={`${relativeCount(soldCount)}件`} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="落選件数" value={`${relativeCount(lostCount)}件`} />
        <StatCard label="購入済み件数" value={`${relativeCount(purchasedCount)}件`} />
        <StatCard label="今月の確定利益" value={yen(thisMonthProfit)} />
        <StatCard label="累計確定利益" value={yen(totalProfit)} />
        <StatCard label="当選率" value={percent(winRate)} note="当選・購入・売却 / 応募済み以上" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="平均実ROI" value={percent(avgActualRoi)} />
        <StatCard label="未売却の商品数" value={`${relativeCount(purchasedUnsoldCount)}件`} />
        <StatCard label="応募候補" value={`${relativeCount(applicationCandidates.length)}件`} note="高信頼価格・利益プラス" />
        <StatCard label="今日締切の抽選" value={`${relativeCount(todayDeadlineListings.length)}件`} />
        <StatCard label="有効な監視ソース" value={`${relativeCount(sourcesCount)}件`} note={latestRun ? `最終収集: ${dateTime(latestRun.finishedAt ?? latestRun.startedAt)}` : "未実行"} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="有効な価格ソース" value={`${relativeCount(activePriceSourceCount)}件`} />
        <StatCard label="未追加の推奨プリセット" value={`${relativeCount(unaddedRecommendedPresetCount)}件`} />
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">プリセット管理</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/sources/presets" className={secondaryButtonClass}>監視ソース</Link>
            <Link href="/price-sources/presets" className={secondaryButtonClass}>価格ソース</Link>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="新しい監視ソース候補" value={`${relativeCount(newWatchSourceCandidateCount)}件`} tone={newWatchSourceCandidateCount > 0 ? "warning" : "neutral"} />
        <StatCard label="新しい価格ソース候補" value={`${relativeCount(newPriceSourceCandidateCount)}件`} tone={newPriceSourceCandidateCount > 0 ? "warning" : "neutral"} />
        <StatCard label="未確認の発見候補" value={`${relativeCount(uncheckedDiscoveredSourceCount)}件`} />
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Source Discovery</div>
          <div className="mt-3">
            <Link href="/source-discovery" className={buttonClass}>候補URLを確認</Link>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <StatCard label="最終バックアップ日時" value={latestBackup ? dateTime(latestBackup.createdAt) : "-"} note={latestBackup?.filename ?? "未作成"} />
        <StatCard label="バックアップ件数" value={`${relativeCount(backupCount)}件`} note="backups/ に保存" />
      </div>

      <Card className="mb-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">最新の運用実行結果</h2>
          <Link href="/operation-runs" className={secondaryButtonClass}>運用ログ</Link>
        </div>
        {latestOperationRun ? (
          <div className="grid gap-2 text-sm md:grid-cols-[160px_160px_120px_1fr]">
            <div><span className="text-muted-foreground">種別</span><div className="font-medium">{operationTypeLabel(latestOperationRun.type)}</div></div>
            <div><span className="text-muted-foreground">開始</span><div>{dateTime(latestOperationRun.startedAt)}</div></div>
            <div><span className="text-muted-foreground">結果</span><div><Badge tone={latestOperationRun.success ? "success" : "danger"}>{latestOperationRun.success ? "成功" : "失敗"}</Badge></div></div>
            <div>
              <span className="text-muted-foreground">メッセージ</span>
              <pre className={`mt-1 whitespace-pre-wrap rounded-md p-2 font-sans text-xs leading-5 ${latestOperationRun.success ? "bg-muted/40 text-muted-foreground" : "border border-rose-200 bg-rose-50 text-rose-800"}`}>
                {latestOperationRun.message ?? "-"}
              </pre>
            </div>
          </div>
        ) : (
          <EmptyState message="運用タスクはまだ実行されていません。" />
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <ListingPanel title="利益額が高い抽選" listings={highProfitListings} href="/lotteries?sort=profit" />
        <ListingPanel title="ROIが高い抽選" listings={highRoiListings} href="/lotteries?sort=roi" />
        <ListingPanel title="価格未取得の抽選" listings={uncheckedPriceListings} href="/lotteries?priceStatus=unchecked" />
        <ListingPanel title="価格取得エラーの抽選" listings={priceErrorListings} href="/lotteries?priceStatus=error" />
      </div>
    </>
  );
}

function NotificationList({ notifications, compact = false }: { notifications: NotificationWithListing[]; compact?: boolean }) {
  if (notifications.length === 0) return <EmptyState message="未読通知はありません。" />;

  return (
    <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
      {notifications.map((notification) => (
        <Link key={notification.id} href={`/lotteries/${notification.lotteryListingId}`} className="rounded-md border border-border bg-white p-3 hover:bg-muted">
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={notification.severity === "important" ? "danger" : notification.severity === "warning" ? "warning" : "neutral"}>
              {notificationSeverityLabels[notification.severity] ?? notification.severity}
            </Badge>
            <span className="text-xs text-muted-foreground">{dateTime(notification.createdAt)}</span>
          </div>
          <div className="font-semibold">{notification.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{notification.message}</div>
          <div className="mt-2 text-xs text-muted-foreground">{notification.lotteryListing.storeName} / {notification.lotteryListing.productName}</div>
        </Link>
      ))}
    </div>
  );
}

function DeadlineList({ listings }: { listings: ListingWithPrice[] }) {
  if (listings.length === 0) return <EmptyState message="今日締切の抽選はありません。" />;
  return (
    <div className="grid gap-3">
      {listings.slice(0, 5).map((listing) => (
        <Link key={listing.id} href={`/lotteries/${listing.id}`} className="rounded-md border border-amber-200 bg-amber-50/50 p-3 hover:bg-amber-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{listing.productName}</div>
              <div className="mt-1 text-xs text-muted-foreground">{listing.storeName}</div>
            </div>
            <Badge tone="warning">{dateOnly(listing.applicationEndAt)}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>定価 {yen(listing.retailPrice)}</span>
            <span>利益 {yen(listing.estimatedProfit)}</span>
            <span>ROI {percent(listing.roi)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CandidateTable({ listings }: { listings: ListingWithPrice[] }) {
  if (listings.length === 0) return <EmptyState message="応募候補はありません。価格取得や定価入力を確認してください。" />;
  return (
    <div className="grid gap-3">
      {listings.slice(0, 5).map((listing) => (
        <Link key={listing.id} href={`/lotteries/${listing.id}`} className="rounded-md border border-border bg-white p-3 hover:bg-muted">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="line-clamp-2 font-semibold leading-6">{listing.productName}</div>
              <div className="mt-1 text-xs text-muted-foreground">{listing.storeName} / 締切 {dateOnly(listing.applicationEndAt)}</div>
            </div>
            <PriorityBadge label={listing.applicationPriorityLabel} score={listing.applicationPriorityScore} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <MetricMini label="定価" value={yen(listing.retailPrice)} />
            <MetricMini label="最高買取" value={yen(listing.bestBuyPrice)} strong />
            <MetricMini label="想定利益" value={yen(listing.estimatedProfit)} strong tone="success" />
            <MetricMini label="ROI / 倍率" value={`${percent(listing.roi)} / ${multiple(listing.priceMultiplier)}`} strong />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{applicationStatusLabels[listing.applicationStatus]}</Badge>
            <span className="text-xs text-primary">元ページを開く</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function MetricMini({ label, value, strong, tone }: { label: string; value: React.ReactNode; strong?: boolean; tone?: "success" }) {
  return (
    <div className="rounded bg-muted/50 p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 tabular-nums ${strong ? "font-semibold" : ""} ${tone === "success" ? "text-emerald-700" : ""}`}>{value}</div>
    </div>
  );
}

function ListingPanel({ title, listings, href }: { title: string; listings: ListingWithPrice[]; href: string }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Link href={href} className={secondaryButtonClass}>一覧</Link>
      </div>
      {listings.length === 0 ? (
        <EmptyState message="表示できる情報がありません。" />
      ) : (
        <>
        <div className="grid gap-3 md:hidden">
          {listings.map((listing) => (
            <Link key={listing.id} href={`/lotteries/${listing.id}`} className="rounded-md border border-border p-3 hover:bg-muted">
              <div className="font-semibold leading-6">{listing.productName}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <MetricMini label="最高買取" value={yen(listing.bestBuyPrice)} strong />
                <MetricMini label="利益" value={yen(listing.estimatedProfit)} strong tone="success" />
                <MetricMini label="ROI" value={percent(listing.roi)} />
                <MetricMini label="優先度" value={<PriorityBadge label={listing.applicationPriorityLabel} score={listing.applicationPriorityScore} />} />
              </div>
            </Link>
          ))}
        </div>
        <table className="hidden w-full text-sm md:table">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="py-2">商品</th><th className="py-2">価格</th><th className="py-2">優先度</th></tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id} className="border-t border-border">
                <td className="max-w-xs truncate py-3 font-medium"><Link href={`/lotteries/${listing.id}`}>{listing.productName}</Link></td>
                <td className="py-3 text-xs">{yen(listing.bestBuyPrice)} / 利益 {yen(listing.estimatedProfit)}<div className="text-muted-foreground">ROI {percent(listing.roi)}</div></td>
                <td className="py-3"><PriorityBadge label={listing.applicationPriorityLabel} score={listing.applicationPriorityScore} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
    </Card>
  );
}

function PriorityBadge({ label, score }: { label: string; score: number }) {
  return <Badge tone={priorityTone(label) as "success" | "primary" | "warning" | "neutral" | "danger"}>{label}: {priorityLabelText(label)} ({score})</Badge>;
}

function sum(values: Array<number | null>): number {
  let total = 0;
  for (const value of values) total += value ?? 0;
  return total;
}

function average(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null);
  if (filtered.length === 0) return null;
  return filtered.reduce((total, value) => total + value, 0) / filtered.length;
}
