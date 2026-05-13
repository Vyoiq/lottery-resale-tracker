import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { getOperationSettings } from "@/lib/appSettings";
import { recalculateAllListingPriorities } from "@/lib/priorityService";
import { createBackup, pruneBackups } from "@/services/backups/backupService";
import { runCollectors } from "@/services/collectors/base";
import { generateNotifications } from "@/services/notifications/generateNotifications";
import { runPriceCollectors } from "@/services/priceCollectors/base";
import { runSourceDiscovery } from "@/services/sourceDiscovery/discoveryRunner";
import { operationFailureMessage } from "@/lib/errorMessages";

export const operationRunTypes = ["collect", "price_collect", "notifications", "backup", "source_discovery", "full_run"] as const;
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

  if (settings.collectEnabled) steps.push(await runOperationTask("collect", client));
  else steps.push({ type: "collect", success: true, message: "設定によりスキップ" });

  if (settings.priceCollectEnabled) steps.push(await runOperationTask("price_collect", client));
  else steps.push({ type: "price_collect", success: true, message: "設定によりスキップ" });

  if (settings.notificationsEnabled) steps.push(await runOperationTask("notifications", client));
  else steps.push({ type: "notifications", success: true, message: "設定によりスキップ" });

  if (settings.autoBackupEnabled) steps.push(await runOperationTask("backup", client));
  else steps.push({ type: "backup", success: true, message: "設定によりスキップ" });

  const success = steps.every((step) => step.success);
  const message = steps.map((step) => `${operationTypeLabel(step.type)}: ${step.message}`).join("\n");

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
    restore_backup: "バックアップ復元",
    full_run: "一括実行"
  }[type] ?? type;
}

async function executeSingleTask(type: Exclude<OperationRunType, "full_run">, client: PrismaClient, options: OperationTaskOptions) {
  if (type === "collect") {
    const result = await runCollectors();
    await recalculateAllListingPriorities(client);
    const details = result.errorMessage ? `\n\nエラー詳細:\n${result.errorMessage}` : "";
    return {
      success: result.errorCount === 0,
      message: `新規 ${result.newListingCount} 件、更新 ${result.updatedListingCount} 件、スキップ ${result.skippedCount} 件、エラー ${result.errorCount} 件${details}`
    };
  }

  if (type === "price_collect") {
    const result = await runPriceCollectors();
    await recalculateAllListingPriorities(client);
    const details = result.errorMessage ? `\n\nエラー詳細:\n${result.errorMessage}` : "";
    return {
      success: result.errorCount === 0,
      message: `対象 ${result.targetCount} 件、新規 ${result.newPriceCount} 件、更新 ${result.updatedPriceCount} 件、エラー ${result.errorCount} 件${details}`
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
    return {
      success: result.errorCount === 0,
      message: `検索キーワード ${result.queryCount} 件、発見 ${result.foundCount} 件、新規 ${result.newCount} 件、更新 ${result.updatedCount} 件、WatchSource自動追加 ${result.autoAddedWatchCount} 件、PriceSource自動追加 ${result.autoAddedPriceCount} 件、エラー ${result.errorCount} 件${details}`
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
