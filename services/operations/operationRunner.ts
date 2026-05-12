import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { getOperationSettings } from "@/lib/appSettings";
import { recalculateAllListingPriorities } from "@/lib/priorityService";
import { createBackup, pruneBackups } from "@/services/backups/backupService";
import { runCollectors } from "@/services/collectors/base";
import { generateNotifications } from "@/services/notifications/generateNotifications";
import { runPriceCollectors } from "@/services/priceCollectors/base";

export const operationRunTypes = ["collect", "price_collect", "notifications", "backup", "full_run"] as const;
export type OperationRunType = (typeof operationRunTypes)[number];

export type OperationStepResult = {
  type: OperationRunType;
  success: boolean;
  message: string;
  runId?: string;
};

export async function runOperationTask(type: OperationRunType, client: PrismaClient = defaultPrisma): Promise<OperationStepResult> {
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
    const message = await executeSingleTask(type, client);
    await client.operationRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        success: true,
        message
      }
    });
    return { type, success: true, message, runId: run.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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
    full_run: "一括実行"
  }[type] ?? type;
}

async function executeSingleTask(type: Exclude<OperationRunType, "full_run">, client: PrismaClient) {
  if (type === "collect") {
    const result = await runCollectors();
    await recalculateAllListingPriorities(client);
    return `新規 ${result.newListingCount} 件、更新 ${result.updatedListingCount} 件、スキップ ${result.skippedCount} 件、エラー ${result.errorCount} 件`;
  }

  if (type === "price_collect") {
    const result = await runPriceCollectors();
    await recalculateAllListingPriorities(client);
    return `対象 ${result.targetCount} 件、新規 ${result.newPriceCount} 件、更新 ${result.updatedPriceCount} 件、エラー ${result.errorCount} 件`;
  }

  if (type === "notifications") {
    const result = await generateNotifications(client);
    return `確認 ${result.checkedCount} 件、候補 ${result.candidateCount} 件、新規 ${result.createdCount} 件、更新 ${result.updatedCount} 件`;
  }

  const settings = await getOperationSettings(client);
  const backup = await createBackup({ memo: "運用タスクから作成" }, client);
  const prunedCount = await pruneBackups(settings.backupRetentionCount, client);
  return `${backup.filename} を作成、保持件数超過 ${prunedCount} 件を削除`;
}
