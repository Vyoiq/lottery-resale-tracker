import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { getOperationSettings } from "@/lib/appSettings";
import { recalculateAllListingPriorities } from "@/lib/priorityService";
import { createBackup, pruneBackups } from "@/services/backups/backupService";
import { runCollectors } from "@/services/collectors/base";
import { generateNotifications } from "@/services/notifications/generateNotifications";
import { runPriceCollectors } from "@/services/priceCollectors/base";
import { runPriceSourceDiscovery, runSourceDiscovery } from "@/services/sourceDiscovery/discoveryRunner";
import { cleanupPlaceholderSources } from "@/services/sources/placeholderCleanup";
import { operationFailureMessage } from "@/lib/errorMessages";
import { refreshListingStatuses } from "@/services/listings/listingStatusService";
import { runAiClassification } from "@/services/aiClassification/runAiClassification";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { runSourceCurator } from "@/services/sourceDiscovery/sourceCurator";

export const operationRunTypes = ["collect", "price_collect", "notifications", "backup", "source_discovery", "price_source_discovery", "ai_classification", "source_curator", "cleanup_ended", "full_run"] as const;
export type OperationRunType = (typeof operationRunTypes)[number];

export type OperationStepResult = {
  type: OperationRunType;
  success: boolean;
  message: string;
  runId?: string;
};

type OperationTaskOptions = {
  backupMemo?: string | null;
};

export async function runOperationTask(type: OperationRunType, client: PrismaClient = defaultPrisma, options: OperationTaskOptions = {}): Promise<OperationStepResult> {
  if (type === "full_run") return runFullOperation(client);

  const startedAt = new Date();
  const run = await client.operationRun.create({
    data: {
      type,
      startedAt,
      success: false,
      message: "実行中"
    }
  });

  try {
    const result = await executeSingleTask(type, client, options);
    await client.operationRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        success: result.success,
        message: result.message
      }
    });
    return { type, success: result.success, message: result.message, runId: run.id };
  } catch (error) {
    const message = operationFailureMessage(operationTypeLabel(type), error);
    await client.operationRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        success: false,
        message
      }
    });
    return { type, success: false, message, runId: run.id };
  }
}

export async function runFullOperation(client: PrismaClient = defaultPrisma): Promise<OperationStepResult> {
  const settings = await getOperationSettings(client);
  const fullRun = await client.operationRun.create({
    data: {
      type: "full_run",
      startedAt: new Date(),
      success: false,
      message: "実行中"
    }
  });

  const steps: OperationStepResult[] = [];

  if (settings.sourceDiscoveryEnabled) steps.push(await runOperationTask("source_discovery", client));
  else steps.push({ type: "source_discovery", success: true, message: "設定によりスキップ" });

  if (settings.priceSourceDiscoveryEnabled) steps.push(await runOperationTask("price_source_discovery", client));
  else steps.push({ type: "price_source_discovery", success: true, message: "設定によりスキップ" });

  steps.push(await runOperationTask("ai_classification", client));
  steps.push(await runOperationTask("source_curator", client));

  if (settings.collectEnabled) steps.push(await runOperationTask("collect", client));
  else steps.push({ type: "collect", success: true, message: "設定によりスキップ" });

  if (settings.priceCollectEnabled) steps.push(await runOperationTask("price_collect", client));
  else steps.push({ type: "price_collect", success: true, message: "設定によりスキップ" });

  if (settings.notificationsEnabled) steps.push(await runOperationTask("notifications", client));
  else steps.push({ type: "notifications", success: true, message: "設定によりスキップ" });

  if (settings.autoBackupEnabled) steps.push(await runOperationTask("backup", client));
  else steps.push({ type: "backup", success: true, message: "設定によりスキップ" });

  const success = steps.every((step) => step.success);
  const nextActions = await getOperationNextActions(client);
  const message = [
    steps.map((step) => `${operationTypeLabel(step.type)}: ${step.message}`).join("\n"),
    nextActions.length > 0 ? `\n次アクション:\n${nextActions.map((action) => `- ${action}`).join("\n")}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  await client.operationRun.update({
    where: { id: fullRun.id },
    data: {
      finishedAt: new Date(),
      success,
      message
    }
  });

  return { type: "full_run", success, message, runId: fullRun.id };
}

export function operationTypeLabel(type: string) {
  return {
    collect: "抽選情報収集",
    price_collect: "価格取得",
    notifications: "通知生成",
    backup: "バックアップ",
    source_discovery: "ソース自動発見",
    price_source_discovery: "価格ソース自動発見",
    ai_classification: "AI分類",
    source_curator: "AI Source Curator",
    reclassify_sources: "ソース再判定",
    cleanup_ended: "終了済み再判定",
    restore_backup: "バックアップ復元",
    full_run: "一括実行"
  }[type] ?? type;
}

async function getOperationNextActions(client: PrismaClient) {
  const now = new Date();
  const [activeListingCount, enabledWatchSources, enabledPriceSources, allPriceSources, currentDiscoveryCandidateCount, priceDiscoveryCandidateCount] = await Promise.all([
    client.lotteryListing.count({
      where: {
        status: "active",
        ignored: false,
        applicationEndAt: { gte: now }
      }
    }),
    client.watchSource.findMany({ where: { enabled: true } }),
    client.priceSource.findMany({ where: { enabled: true } }),
    client.priceSource.findMany(),
    client.discoveredSource.count({
      where: {
        status: "new",
        discoveryType: "current_lottery_application",
        OR: [
          { aiClassifiedAt: null },
          {
            aiIsLotteryApplicationPage: true,
            aiIsCurrentlyOpen: true,
            aiIsPastOrEnded: false,
            aiIsJustArticle: false
          }
        ]
      }
    }),
    client.discoveredSource.count({
      where: {
        status: "new",
        OR: [{ discoveryType: "price_buyback_page" }, { detectedType: "price_source_candidate" }]
      }
    })
  ]);

  const enabledRealWatchSourceCount = enabledWatchSources.filter((source) => !placeholderSourceReason(source)).length;
  const enabledRealPriceSourceCount = enabledPriceSources.filter(
    (source) => !placeholderSourceReason(source) && source.searchUrlTemplate.includes("{keyword}")
  ).length;
  const basePriceSourceNeedsTemplateCount = allPriceSources.filter(
    (source) => !placeholderSourceReason(source) && !source.searchUrlTemplate.includes("{keyword}")
  ).length;

  const actions: string[] = [];
  if (activeListingCount === 0) {
    actions.push("active抽選が0件です。Source Discoveryを実行し、/source-discovery?quickFilter=current で現在受付中候補を確認してください。");
  }
  if (enabledRealWatchSourceCount === 0) {
    actions.push("有効な実URLのWatchSourceが0件です。/sources または /source-discovery を確認してください。");
  }
  if (enabledRealPriceSourceCount === 0) {
    actions.push("有効なPriceSourceが0件です。/source-discovery?quickFilter=price または /price-sources を確認してください。");
  }
  if (currentDiscoveryCandidateCount > 0) {
    actions.push(`未登録の現在受付中候補が ${currentDiscoveryCandidateCount} 件あります。/source-discovery?quickFilter=current で確認してください。`);
  }
  if (priceDiscoveryCandidateCount > 0 && enabledRealPriceSourceCount === 0) {
    actions.push(`買取価格ページ候補が ${priceDiscoveryCandidateCount} 件あります。searchUrlTemplateがある候補を優先してPriceSourceに追加してください。`);
  }
  if (basePriceSourceNeedsTemplateCount > 0 && enabledRealPriceSourceCount === 0) {
    actions.push(`PriceSource候補はありますが、searchUrlTemplate未推定のためbaseUrl登録に留まっています。/price-sources で searchUrlTemplate を設定してください。対象 ${basePriceSourceNeedsTemplateCount} 件`);
  }
  return actions;
}

async function executeSingleTask(type: Exclude<OperationRunType, "full_run">, client: PrismaClient, options: OperationTaskOptions) {
  const cleanup =
    type === "price_collect"
      ? await cleanupPlaceholderSources(client)
      : { disabledWatchSourceCount: 0, disabledPriceSourceCount: 0, message: "" };
  const cleanupPrefix =
    cleanup.disabledWatchSourceCount > 0 || cleanup.disabledPriceSourceCount > 0
      ? `プレースホルダー無効化: WatchSource ${cleanup.disabledWatchSourceCount} 件、PriceSource ${cleanup.disabledPriceSourceCount} 件\n${cleanup.message}\n\n`
      : "";

  if (type === "collect") {
    const result = await runCollectors();
    const statuses = await refreshListingStatuses(client);
    await recalculateAllListingPriorities(client);
    const details = result.errorMessage ? `\n\nエラー詳細:\n${result.errorMessage}` : "";
    return {
      success: result.errorCount === 0,
      message: `${cleanupPrefix}新規 ${result.newListingCount} 件、更新 ${result.updatedListingCount} 件、スキップ ${result.skippedCount} 件、エラー ${result.errorCount} 件\nstatus再判定 ${statuses.checkedCount} 件 / 更新 ${statuses.updatedCount} 件 / active ${statuses.activeCount} 件 / ended ${statuses.endedCount} 件 / unknown ${statuses.unknownCount} 件${details}`
    };
  }

  if (type === "price_collect") {
    const result = await runPriceCollectors();
    await recalculateAllListingPriorities(client);
    const details = result.errorMessage ? `\n\nエラー詳細:\n${result.errorMessage}` : "";
    return {
      success: result.errorCount === 0,
      message: `${cleanupPrefix}対象 ${result.targetCount} 件、新規 ${result.newPriceCount} 件、更新 ${result.updatedPriceCount} 件、プレースホルダースキップ ${"skippedPlaceholderCount" in result ? result.skippedPlaceholderCount : 0} 件、エラー ${result.errorCount} 件${details}`
    };
  }

  if (type === "notifications") {
    const result = await generateNotifications(client);
    return {
      success: true,
      message: `確認 ${result.checkedCount} 件、候補 ${result.candidateCount} 件、新規 ${result.createdCount} 件、更新 ${result.updatedCount} 件`
    };
  }

  if (type === "source_discovery") {
    const result = await runSourceDiscovery(client);
    const details = result.errorMessage ? `\n\nエラー詳細:\n${result.errorMessage}` : "";
    const providerNotes = result.providerMessages.length > 0 ? `\n\nprovider:\n${result.providerMessages.join("\n")}` : "";
    return {
      success: result.errorCount === 0,
      message: `検索キーワード ${result.queryCount} 件、発見 ${result.foundCount} 件、新規 ${result.newCount} 件、更新 ${result.updatedCount} 件、WatchSource自動追加 ${result.autoAddedWatchCount} 件、PriceSource自動追加 ${result.autoAddedPriceCount} 件、エラー ${result.errorCount} 件${providerNotes}${details}`
    };
  }

  if (type === "price_source_discovery") {
    const result = await runPriceSourceDiscovery(client);
    const details = result.errorMessage ? `\n\nエラー詳細:\n${result.errorMessage}` : "";
    const providerNotes = result.providerMessages.length > 0 ? `\n\nprovider:\n${result.providerMessages.join("\n")}` : "";
    return {
      success: result.errorCount === 0,
      message: `価格検索キーワード ${result.queryCount} 件、発見 ${result.foundCount} 件、新規 ${result.newCount} 件、更新 ${result.updatedCount} 件、PriceSource自動追加 ${result.autoAddedPriceCount} 件、エラー ${result.errorCount} 件${providerNotes}${details}`
    };
  }

  if (type === "ai_classification") {
    const result = await runAiClassification(client);
    if (result.skipped) {
      return {
        success: true,
        message: result.skipReason ?? "AI分類をスキップ"
      };
    }
    const details = result.errorMessage ? `\n\nエラー詳細:\n${result.errorMessage}` : "";
    return {
      success: true,
      message: `provider=${result.provider} / DiscoveredSource ${result.discoveredClassifiedCount}/${result.discoveredTargetCount} 件、LotteryListing ${result.listingClassifiedCount}/${result.listingTargetCount} 件を分類、エラー ${result.errorCount} 件${details}`
    };
  }

  if (type === "source_curator") {
    const result = await runSourceCurator(client);
    const skippedReasons = result.skippedReasons.length > 0 ? `\n\n自動登録できなかった理由:\n${result.skippedReasons.join("\n")}` : "";
    return {
      success: true,
      message: [
        `評価対象 ${result.checkedCount} 件`,
        `baseUrl登録済みPriceSource ${result.basePriceSourceCount} 件`,
        `WatchSource登録候補 ${result.watchCandidateCount} 件`,
        `WatchSource自動登録 ${result.registeredWatchCount} 件`,
        `WatchSource登録成功 ${result.watchRegisterSuccessCount} 件`,
        `PriceSource自動登録 ${result.registeredPriceCount} 件`,
        `searchUrlTemplateなしでbaseUrl登録 ${result.registeredBasePriceCount} 件`,
        `searchUrlTemplate推定成功 ${result.templateInferenceSuccessCount} 件`,
        `searchUrlTemplate推定失敗 ${result.templateInferenceFailureCount} 件`,
        `テスト取得成功 ${result.templateTestSuccessCount} 件`,
        `テスト取得失敗 ${result.templateTestFailureCount} 件`,
        `自動有効化対象 ${result.autoEnableCandidateCount} 件`,
        `WatchSource自動有効化 ${result.enabledWatchCount} 件`,
        `PriceSource自動有効化 ${result.enabledPriceCount} 件`,
        `manual_review ${result.manualReviewCount} 件`,
        `ignore ${result.ignoreCount} 件`,
        `スキップ ${result.skippedCount} 件`
      ].join("、") + skippedReasons + (result.autoEnableSkippedReasons.length > 0 ? `\n\n自動有効化スキップ理由:\n${result.autoEnableSkippedReasons.join("\n")}` : "")
    };
  }

  if (type === "cleanup_ended") {
    const result = await refreshListingStatuses(client);
    await recalculateAllListingPriorities(client);
    return {
      success: true,
      message: `再判定 ${result.checkedCount} 件 / 更新 ${result.updatedCount} 件 / active ${result.activeCount} 件 / ended ${result.endedCount} 件 / unknown ${result.unknownCount} 件 / ignored ${result.ignoredCount} 件`
    };
  }

  const settings = await getOperationSettings(client);
  const backup = await createBackup({ memo: options.backupMemo ?? "運用タスクから作成" }, client);
  const prunedCount = await pruneBackups(settings.backupRetentionCount, client);
  return {
    success: true,
    message: `${backup.filename} を作成、保持件数超過 ${prunedCount} 件を削除`
  };
}
