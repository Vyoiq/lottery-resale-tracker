import type { PrismaClient } from "@prisma/client";
import { getOperationSettings } from "@/lib/appSettings";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { recalculateAllListingPriorities } from "@/lib/priorityService";
import { createBackup, pruneBackups } from "@/services/backups/backupService";
import { runCollectors } from "@/services/collectors/base";
import { runAiClassification } from "@/services/aiClassification/runAiClassification";
import { refreshListingStatuses } from "@/services/listings/listingStatusService";
import { generateNotifications } from "@/services/notifications/generateNotifications";
import { runPriceCollectors } from "@/services/priceCollectors/base";
import { inferTemplatesForBasePriceSources } from "@/services/priceSources/templateInference";
import { runPriceSourceDiscovery, runSourceDiscovery } from "@/services/sourceDiscovery/discoveryRunner";
import { runSourceCurator } from "@/services/sourceDiscovery/sourceCurator";
import { runSafeSourceAutomation } from "@/services/sources/safeSourceAutomation";

export type AutoPilotRunResult = {
  success: boolean;
  skipped: boolean;
  message: string;
  runId?: string;
  simpleEligibleCount: number;
  nextActions: string[];
};

export async function runAutoPilot(
  client: PrismaClient = defaultPrisma,
  options: { force?: boolean; trigger?: string } = {}
): Promise<AutoPilotRunResult> {
  const settings = await getOperationSettings(client);
  const throttle = await shouldThrottleAutoPilot(client, settings.autoPilotIntervalMinutes);

  if (false && !settings.autoPilotEnabled && !options.force) {
    return { success: true, skipped: true, message: "Auto Pilot は設定により無効です。", simpleEligibleCount: await countSimpleEligible(client), nextActions: [] };
  }

  if (throttle && !options.force) {
    return {
      success: true,
      skipped: true,
      message: `Auto Pilot は直近${settings.autoPilotIntervalMinutes}分以内に実行済みのためスキップしました。`,
      simpleEligibleCount: await countSimpleEligible(client),
      nextActions: []
    };
  }

  const run = await client.operationRun.create({
    data: {
      type: "autopilot",
      startedAt: new Date(),
      success: false,
      message: "実行中"
    }
  });

  const lines: string[] = [];
  let success = true;

  try {
    const sourceDiscovery = await runSourceDiscovery(client, { maxCandidates: settings.autoPilotMaxDiscoveryCount });
    lines.push(`Source Discovery 発見 ${sourceDiscovery.foundCount} 件 / 新規 ${sourceDiscovery.newCount} 件 / 更新 ${sourceDiscovery.updatedCount} 件`);
    if (sourceDiscovery.errorCount > 0) lines.push(`Source Discovery エラー ${sourceDiscovery.errorCount} 件\n${sourceDiscovery.errorMessage ?? ""}`);

    const priceDiscovery = await runPriceSourceDiscovery(client, { maxCandidates: settings.autoPilotMaxDiscoveryCount });
    lines.push(`PriceSource Discovery 発見 ${priceDiscovery.foundCount} 件 / 新規 ${priceDiscovery.newCount} 件 / 更新 ${priceDiscovery.updatedCount} 件`);
    if (priceDiscovery.errorCount > 0) lines.push(`PriceSource Discovery エラー ${priceDiscovery.errorCount} 件\n${priceDiscovery.errorMessage ?? ""}`);

    const aiLimit = Math.max(0, settings.autoPilotMaxAiClassifications);
    const ai = await runAiClassification(client, { sourceLimit: aiLimit, listingLimit: Math.ceil(aiLimit / 2) });
    lines.push(
      ai.skipped
        ? `AI分類 スキップ: ${ai.skipReason ?? "設定なし"}`
        : `AI分類 DiscoveredSource ${ai.discoveredClassifiedCount}/${ai.discoveredTargetCount} 件 / LotteryListing ${ai.listingClassifiedCount}/${ai.listingTargetCount} 件 / エラー ${ai.errorCount} 件`
    );
    if (ai.errorMessage) lines.push(`AI分類エラー詳細:\n${ai.errorMessage}`);

    const curator = await runSourceCurator(client, {
      registerLimit: settings.autoPilotMaxAutoRegister,
      enableLimit: settings.autoPilotMaxAutoEnable
    });
    lines.push(
      `Curator 自動登録 WatchSource ${curator.registeredWatchCount} 件 / PriceSource ${curator.registeredPriceCount} 件 / base登録 ${curator.registeredBasePriceCount} 件`
    );
    lines.push(`Curator テンプレート推定成功 ${curator.templateInferenceSuccessCount} 件 / テスト成功 ${curator.templateTestSuccessCount} 件`);

    const templates = await inferTemplatesForBasePriceSources(client);
    lines.push(`searchUrlTemplate 自動推定 成功 ${templates.inferredCount} 件 / 失敗 ${templates.inferenceFailedCount} 件 / テスト成功 ${templates.testSuccessCount} 件`);

    const safe = await runSafeSourceAutomation(client, {
      watchLimit: settings.autoPilotMaxAutoEnable,
      priceLimit: settings.autoPilotMaxAutoEnable,
      minTrust: settings.autoPilotSafeEnableOnly ? "high" : settings.safeAutoEnableMinTrust
    });
    lines.push(`自動有効化 WatchSource ${safe.watchAutoEnabledCount} 件 / PriceSource ${safe.priceAutoEnabledCount} 件`);
    lines.push(`自動無効化 WatchSource ${safe.watchAutoDisabledCount} 件 / PriceSource ${safe.priceAutoDisabledCount} 件`);
    if (safe.skippedReasons.length > 0) lines.push(`自動有効化できなかった理由:\n${safe.skippedReasons.slice(0, 20).join("\n")}`);

    const collect = await runCollectors();
    lines.push(`抽選収集 新規 ${collect.newListingCount} 件 / 更新 ${collect.updatedListingCount} 件 / スキップ ${collect.skippedCount} 件 / エラー ${collect.errorCount} 件`);
    if (collect.errorCount > 0) success = false;

    const statuses = await refreshListingStatuses(client);
    await recalculateAllListingPriorities(client);
    lines.push(`status再判定 active ${statuses.activeCount} 件 / ended ${statuses.endedCount} 件 / unknown ${statuses.unknownCount} 件`);

    const prices = await runPriceCollectors();
    lines.push(`価格取得 対象 ${prices.targetCount} 件 / 新規 ${prices.newPriceCount} 件 / 更新 ${prices.updatedPriceCount} 件 / エラー ${prices.errorCount} 件`);
    if (prices.errorMessage) lines.push(`価格取得メモ:\n${prices.errorMessage}`);

    const notifications = await generateNotifications(client);
    lines.push(`通知生成 新規 ${notifications.createdCount} 件 / 更新 ${notifications.updatedCount} 件`);

    if (settings.autoBackupEnabled) {
      const backup = await createBackup({ memo: `Auto Pilot (${options.trigger ?? "manual"})` }, client);
      const pruned = await pruneBackups(settings.backupRetentionCount, client);
      lines.push(`バックアップ ${backup.filename} / 削除 ${pruned} 件`);
    } else {
      lines.push("バックアップ 設定によりスキップ");
    }

    const simpleEligibleCount = await countSimpleEligible(client);
    const nextActions = await getAutoPilotNextActions(client, simpleEligibleCount);
    lines.push(`最終的に /simple に表示可能な候補 ${simpleEligibleCount} 件`);
    if (nextActions.length > 0) lines.push(`次に必要なアクション:\n${nextActions.map((action) => `- ${action}`).join("\n")}`);

    const solved = [
      sourceDiscovery.foundCount > 0 ? `Source Discoveryで候補 ${sourceDiscovery.foundCount} 件を整理` : null,
      priceDiscovery.foundCount > 0 ? `PriceSource Discoveryで候補 ${priceDiscovery.foundCount} 件を整理` : null,
      curator.registeredWatchCount + curator.registeredPriceCount + curator.registeredBasePriceCount > 0
        ? `WatchSource / PriceSource を ${curator.registeredWatchCount + curator.registeredPriceCount + curator.registeredBasePriceCount} 件自動登録`
        : null,
      templates.inferredCount + curator.templateInferenceSuccessCount > 0
        ? `searchUrlTemplateを ${templates.inferredCount + curator.templateInferenceSuccessCount} 件推定`
        : null,
      safe.watchAutoEnabledCount + safe.priceAutoEnabledCount > 0
        ? `安全チェック済みソースを ${safe.watchAutoEnabledCount + safe.priceAutoEnabledCount} 件自動有効化`
        : null,
      collect.newListingCount + collect.updatedListingCount > 0 ? `抽選情報を ${collect.newListingCount + collect.updatedListingCount} 件保存/更新` : null,
      prices.newPriceCount + prices.updatedPriceCount > 0 ? `価格候補を ${prices.newPriceCount + prices.updatedPriceCount} 件保存/更新` : null
    ].filter(Boolean);
    const unresolved = [
      simpleEligibleCount === 0 ? "/simple表示候補はまだ0件です" : null,
      safe.watchAutoEnabledCount + safe.priceAutoEnabledCount === 0 ? "安全条件を満たす自動有効化候補がありません" : null,
      prices.errorMessage?.includes("有効な実URLのPriceSource") ? "有効な価格ソースがまだありません" : null,
      collect.errorCount > 0 ? `抽選情報収集でエラー ${collect.errorCount} 件` : null,
      prices.errorCount > 0 ? `価格取得でエラー ${prices.errorCount} 件` : null
    ].filter(Boolean);
    const manual = [
      ...safe.skippedReasons.slice(0, 8),
      ...nextActions.filter((action) => action.includes("自動処理では安全に有効化できませんでした") || action.includes("manual_review"))
    ];
    lines.push(`自動で解決できたこと:\n${solved.length > 0 ? solved.map((item) => `- ${item}`).join("\n") : "- 今回は安全に自動解決できる項目がありませんでした"}`);
    lines.push(`まだ解決できていないこと:\n${unresolved.length > 0 ? unresolved.map((item) => `- ${item}`).join("\n") : "- なし"}`);
    lines.push(`人間の確認が必要なもの:\n${manual.length > 0 ? manual.map((item) => `- ${item}`).join("\n") : "- なし"}`);
    lines.push("次に見る画面:\n- /simple\n- /source-discovery\n- /price-sources");

    const message = lines.join("\n");
    await client.operationRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), success, message }
    });
    return { success, skipped: false, message, runId: run.id, simpleEligibleCount, nextActions };
  } catch (error) {
    const message = [...lines, `Auto Pilot エラー: ${error instanceof Error ? error.message : String(error)}`].join("\n");
    await client.operationRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), success: false, message }
    });
    return { success: false, skipped: false, message, runId: run.id, simpleEligibleCount: await countSimpleEligible(client), nextActions: [] };
  }
}

export async function runAutoPilotIfAllowed(client: PrismaClient = defaultPrisma) {
  return runAutoPilot(client, { force: false, trigger: "simple_empty" });
}

async function shouldThrottleAutoPilot(client: PrismaClient, intervalMinutes: number) {
  const threshold = new Date(Date.now() - intervalMinutes * 60 * 1000);
  const recent = await client.operationRun.findFirst({
    where: {
      type: "autopilot",
      startedAt: { gte: threshold }
    },
    orderBy: { startedAt: "desc" }
  });
  return Boolean(recent);
}

async function countSimpleEligible(client: PrismaClient) {
  const now = new Date();
  const listings = await client.lotteryListing.findMany({
    where: {
      status: "active",
      ignored: false,
      estimatedProfit: { gt: 0 },
      priceStatus: "found",
      bestBuyPrice: { not: null },
      OR: [
        {
          applicationEndAt: { gte: now },
          discoveryType: "current_lottery_application",
          aiIsLotteryApplicationPage: true,
          aiIsCurrentlyOpen: true,
          aiIsPastOrEnded: false,
          aiIsJustArticle: false,
          aiIsProductSalesPage: false,
          aiExcludeReason: null
        },
        {
          discoveryType: { in: ["amazon_invitation_sale", "amazon_preorder", "amazon_regular_sale"] },
          aiIsPastOrEnded: { not: true },
          aiIsJustArticle: { not: true },
          aiExcludeReason: null
        }
      ]
    },
    select: { sourceName: true, sourceUrl: true }
  });
  return listings.filter((listing) => !placeholderSourceReason({ name: listing.sourceName, url: listing.sourceUrl })).length;
}

async function getAutoPilotNextActions(client: PrismaClient, simpleEligibleCount: number) {
  const [watchCandidates, basePriceSources, manualReview, enabledPriceSources] = await Promise.all([
    client.discoveredSource.count({ where: { status: "new", discoveryType: "current_lottery_application" } }),
    client.priceSource.count({ where: { enabled: false, searchUrlTemplate: "" } }),
    client.discoveredSource.count({ where: { status: "new", sourceUsefulness: "manual_review" } }),
    client.priceSource.count({ where: { enabled: true, searchUrlTemplate: { contains: "{keyword}" } } })
  ]);
  const actions: string[] = [];
  if (simpleEligibleCount > 0) return actions;
  if (enabledPriceSources === 0) actions.push("ポケモンカード買取価格ソースを自動整理中です。安全条件を満たす候補が見つかるまで価格取得はスキップします。");
  if (watchCandidates > 0) actions.push(`WatchSource候補 ${watchCandidates} 件はありますが、安全条件を満たすものだけ自動有効化します。`);
  if (basePriceSources > 0) actions.push(`searchUrlTemplateを自動推定できないPriceSourceが ${basePriceSources} 件あります。`);
  if (manualReview > 0) actions.push(`AI判定がmanual_reviewの候補が ${manualReview} 件あります。`);
  if (enabledPriceSources === 0) actions.push("有効な価格ソースがまだありません。安全チェック済みのPriceSourceが見つかるまで価格取得はスキップされます。");
  return actions.filter((action) => !action.includes("有効な価格ソース") && !action.includes("譛牙柑縺ｪ萓｡譬ｼ"));
}
