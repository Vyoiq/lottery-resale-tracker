import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

export const operationSettingDefaults = {
  collectEnabled: true,
  priceCollectEnabled: true,
  notificationsEnabled: true,
  autoBackupEnabled: false,
  collectIntervalMinutes: 360,
  priceCollectIntervalMinutes: 720,
  backupRetentionCount: 10,
  notificationMinRoi: 100,
  notificationMinProfit: 3000
};

export type OperationSettings = typeof operationSettingDefaults;
export type OperationSettingKey = keyof OperationSettings;

const booleanKeys = new Set<OperationSettingKey>([
  "collectEnabled",
  "priceCollectEnabled",
  "notificationsEnabled",
  "autoBackupEnabled"
]);

export async function getOperationSettings(client: PrismaClient = defaultPrisma): Promise<OperationSettings> {
  const rows = await client.appSetting.findMany({
    where: { key: { in: Object.keys(operationSettingDefaults) } }
  });
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return {
    collectEnabled: parseBoolean(values.get("collectEnabled"), operationSettingDefaults.collectEnabled),
    priceCollectEnabled: parseBoolean(values.get("priceCollectEnabled"), operationSettingDefaults.priceCollectEnabled),
    notificationsEnabled: parseBoolean(values.get("notificationsEnabled"), operationSettingDefaults.notificationsEnabled),
    autoBackupEnabled: parseBoolean(values.get("autoBackupEnabled"), operationSettingDefaults.autoBackupEnabled),
    collectIntervalMinutes: parseInteger(values.get("collectIntervalMinutes"), operationSettingDefaults.collectIntervalMinutes, 1),
    priceCollectIntervalMinutes: parseInteger(values.get("priceCollectIntervalMinutes"), operationSettingDefaults.priceCollectIntervalMinutes, 1),
    backupRetentionCount: parseInteger(values.get("backupRetentionCount"), operationSettingDefaults.backupRetentionCount, 1),
    notificationMinRoi: parseInteger(values.get("notificationMinRoi"), operationSettingDefaults.notificationMinRoi, 0),
    notificationMinProfit: parseInteger(values.get("notificationMinProfit"), operationSettingDefaults.notificationMinProfit, 0)
  };
}

export async function saveOperationSettings(settings: OperationSettings, client: PrismaClient = defaultPrisma) {
  for (const [key, value] of Object.entries(settings) as Array<[OperationSettingKey, OperationSettings[OperationSettingKey]]>) {
    await client.appSetting.upsert({
      where: { key },
      update: { value: stringifySettingValue(key, value) },
      create: { key, value: stringifySettingValue(key, value) }
    });
  }
}

export function operationSettingsFromForm(formData: FormData): OperationSettings {
  return {
    collectEnabled: formData.get("collectEnabled") === "on",
    priceCollectEnabled: formData.get("priceCollectEnabled") === "on",
    notificationsEnabled: formData.get("notificationsEnabled") === "on",
    autoBackupEnabled: formData.get("autoBackupEnabled") === "on",
    collectIntervalMinutes: parseInteger(readFormValue(formData, "collectIntervalMinutes"), operationSettingDefaults.collectIntervalMinutes, 1),
    priceCollectIntervalMinutes: parseInteger(readFormValue(formData, "priceCollectIntervalMinutes"), operationSettingDefaults.priceCollectIntervalMinutes, 1),
    backupRetentionCount: parseInteger(readFormValue(formData, "backupRetentionCount"), operationSettingDefaults.backupRetentionCount, 1),
    notificationMinRoi: parseInteger(readFormValue(formData, "notificationMinRoi"), operationSettingDefaults.notificationMinRoi, 0),
    notificationMinProfit: parseInteger(readFormValue(formData, "notificationMinProfit"), operationSettingDefaults.notificationMinProfit, 0)
  };
}

function stringifySettingValue(key: OperationSettingKey, value: OperationSettings[OperationSettingKey]) {
  if (booleanKeys.has(key)) return value ? "true" : "false";
  return String(value);
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseInteger(value: string | undefined, fallback: number, min: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.trunc(parsed));
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}
