import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

export const operationSettingDefaults = {
  collectEnabled: true,
  priceCollectEnabled: true,
  notificationsEnabled: true,
  autoBackupEnabled: false,
  sourceDiscoveryEnabled: false,
  priceSourceDiscoveryEnabled: false,
  collectIntervalMinutes: 360,
  priceCollectIntervalMinutes: 720,
  backupRetentionCount: 10,
  notificationMinRoi: 100,
  notificationMinProfit: 3000,
  sourceDiscoveryMode: "candidates_only",
  priceSourceDiscoveryMode: "candidates_only",
  sourceDiscoveryAutoAddMinConfidence: 0.75,
  aiSourceCuratorEnabled: true,
  aiSourceCuratorAutoRegisterWatch: true,
  aiSourceCuratorAutoRegisterPrice: true,
  sourceDiscoveryAutoEnableHighTrust: false,
  priceSourceDiscoveryAutoEnableHighTrust: false,
  priceSourceAutoEnableInferredTemplate: false,
  safeAutoEnableWatchSources: true,
  safeAutoEnablePriceSources: true,
  safeAutoEnableMinTrust: "high",
  safeAutoEnableWatchLimit: 3,
  safeAutoEnablePriceLimit: 3,
  autoDisableFailureThreshold: 3,
  autoPilotEnabled: true,
  autoPilotRunOnEmptySimple: false,
  autoPilotRunWhenNoWatchSource: false,
  autoPilotRunWhenNoPriceSource: false,
  autoPilotMaxDiscoveryCount: 80,
  autoPilotMaxAiClassifications: 5,
  autoPilotMaxAutoRegister: 20,
  autoPilotMaxAutoEnable: 3,
  autoPilotIntervalMinutes: 30,
  autoPilotSafeEnableOnly: true,
  aiSourceCuratorRegisterLimit: 20,
  aiSourceCuratorEnableLimit: 3
};

export type OperationSettings = typeof operationSettingDefaults;
export type OperationSettingKey = keyof OperationSettings;

const booleanKeys = new Set<OperationSettingKey>([
  "collectEnabled",
  "priceCollectEnabled",
  "notificationsEnabled",
  "autoBackupEnabled",
  "sourceDiscoveryEnabled",
  "priceSourceDiscoveryEnabled",
  "aiSourceCuratorEnabled",
  "aiSourceCuratorAutoRegisterWatch",
  "aiSourceCuratorAutoRegisterPrice",
  "sourceDiscoveryAutoEnableHighTrust",
  "priceSourceDiscoveryAutoEnableHighTrust",
  "priceSourceAutoEnableInferredTemplate",
  "safeAutoEnableWatchSources",
  "safeAutoEnablePriceSources",
  "autoPilotEnabled",
  "autoPilotRunOnEmptySimple",
  "autoPilotRunWhenNoWatchSource",
  "autoPilotRunWhenNoPriceSource",
  "autoPilotSafeEnableOnly"
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
    sourceDiscoveryEnabled: parseBoolean(values.get("sourceDiscoveryEnabled"), operationSettingDefaults.sourceDiscoveryEnabled),
    priceSourceDiscoveryEnabled: parseBoolean(values.get("priceSourceDiscoveryEnabled"), operationSettingDefaults.priceSourceDiscoveryEnabled),
    collectIntervalMinutes: parseInteger(values.get("collectIntervalMinutes"), operationSettingDefaults.collectIntervalMinutes, 1),
    priceCollectIntervalMinutes: parseInteger(values.get("priceCollectIntervalMinutes"), operationSettingDefaults.priceCollectIntervalMinutes, 1),
    backupRetentionCount: parseInteger(values.get("backupRetentionCount"), operationSettingDefaults.backupRetentionCount, 1),
    notificationMinRoi: parseInteger(values.get("notificationMinRoi"), operationSettingDefaults.notificationMinRoi, 0),
    notificationMinProfit: parseInteger(values.get("notificationMinProfit"), operationSettingDefaults.notificationMinProfit, 0),
    sourceDiscoveryMode: parseSourceDiscoveryMode(values.get("sourceDiscoveryMode"), operationSettingDefaults.sourceDiscoveryMode),
    priceSourceDiscoveryMode: parsePriceSourceDiscoveryMode(
      values.get("priceSourceDiscoveryMode"),
      operationSettingDefaults.priceSourceDiscoveryMode
    ),
    sourceDiscoveryAutoAddMinConfidence: parseFloatSetting(
      values.get("sourceDiscoveryAutoAddMinConfidence"),
      operationSettingDefaults.sourceDiscoveryAutoAddMinConfidence,
      0,
      1
    ),
    aiSourceCuratorEnabled: parseBoolean(values.get("aiSourceCuratorEnabled"), operationSettingDefaults.aiSourceCuratorEnabled),
    aiSourceCuratorAutoRegisterWatch: parseBoolean(
      values.get("aiSourceCuratorAutoRegisterWatch"),
      operationSettingDefaults.aiSourceCuratorAutoRegisterWatch
    ),
    aiSourceCuratorAutoRegisterPrice: parseBoolean(
      values.get("aiSourceCuratorAutoRegisterPrice"),
      operationSettingDefaults.aiSourceCuratorAutoRegisterPrice
    ),
    sourceDiscoveryAutoEnableHighTrust: parseBoolean(
      values.get("sourceDiscoveryAutoEnableHighTrust"),
      operationSettingDefaults.sourceDiscoveryAutoEnableHighTrust
    ),
    priceSourceDiscoveryAutoEnableHighTrust: parseBoolean(
      values.get("priceSourceDiscoveryAutoEnableHighTrust"),
      operationSettingDefaults.priceSourceDiscoveryAutoEnableHighTrust
    ),
    priceSourceAutoEnableInferredTemplate: parseBoolean(
      values.get("priceSourceAutoEnableInferredTemplate"),
      operationSettingDefaults.priceSourceAutoEnableInferredTemplate
    ),
    safeAutoEnableWatchSources: parseBoolean(values.get("safeAutoEnableWatchSources"), operationSettingDefaults.safeAutoEnableWatchSources),
    safeAutoEnablePriceSources: parseBoolean(values.get("safeAutoEnablePriceSources"), operationSettingDefaults.safeAutoEnablePriceSources),
    safeAutoEnableMinTrust: parseAutoEnableMinTrust(values.get("safeAutoEnableMinTrust"), operationSettingDefaults.safeAutoEnableMinTrust),
    safeAutoEnableWatchLimit: parseInteger(values.get("safeAutoEnableWatchLimit"), operationSettingDefaults.safeAutoEnableWatchLimit, 0),
    safeAutoEnablePriceLimit: parseInteger(values.get("safeAutoEnablePriceLimit"), operationSettingDefaults.safeAutoEnablePriceLimit, 0),
    autoDisableFailureThreshold: parseInteger(
      values.get("autoDisableFailureThreshold"),
      operationSettingDefaults.autoDisableFailureThreshold,
      1
    ),
    autoPilotEnabled: parseBoolean(values.get("autoPilotEnabled"), operationSettingDefaults.autoPilotEnabled),
    autoPilotRunOnEmptySimple: parseBoolean(values.get("autoPilotRunOnEmptySimple"), operationSettingDefaults.autoPilotRunOnEmptySimple),
    autoPilotRunWhenNoWatchSource: parseBoolean(values.get("autoPilotRunWhenNoWatchSource"), operationSettingDefaults.autoPilotRunWhenNoWatchSource),
    autoPilotRunWhenNoPriceSource: parseBoolean(values.get("autoPilotRunWhenNoPriceSource"), operationSettingDefaults.autoPilotRunWhenNoPriceSource),
    autoPilotMaxDiscoveryCount: parseInteger(values.get("autoPilotMaxDiscoveryCount"), operationSettingDefaults.autoPilotMaxDiscoveryCount, 1),
    autoPilotMaxAiClassifications: parseInteger(
      values.get("autoPilotMaxAiClassifications"),
      operationSettingDefaults.autoPilotMaxAiClassifications,
      0
    ),
    autoPilotMaxAutoRegister: parseInteger(values.get("autoPilotMaxAutoRegister"), operationSettingDefaults.autoPilotMaxAutoRegister, 0),
    autoPilotMaxAutoEnable: parseInteger(values.get("autoPilotMaxAutoEnable"), operationSettingDefaults.autoPilotMaxAutoEnable, 0),
    autoPilotIntervalMinutes: parseInteger(values.get("autoPilotIntervalMinutes"), operationSettingDefaults.autoPilotIntervalMinutes, 1),
    autoPilotSafeEnableOnly: parseBoolean(values.get("autoPilotSafeEnableOnly"), operationSettingDefaults.autoPilotSafeEnableOnly),
    aiSourceCuratorRegisterLimit: parseInteger(
      values.get("aiSourceCuratorRegisterLimit"),
      operationSettingDefaults.aiSourceCuratorRegisterLimit,
      1
    ),
    aiSourceCuratorEnableLimit: parseInteger(
      values.get("aiSourceCuratorEnableLimit"),
      operationSettingDefaults.aiSourceCuratorEnableLimit,
      0
    )
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
    sourceDiscoveryEnabled: formData.get("sourceDiscoveryEnabled") === "on",
    priceSourceDiscoveryEnabled: formData.get("priceSourceDiscoveryEnabled") === "on",
    collectIntervalMinutes: parseInteger(readFormValue(formData, "collectIntervalMinutes"), operationSettingDefaults.collectIntervalMinutes, 1),
    priceCollectIntervalMinutes: parseInteger(readFormValue(formData, "priceCollectIntervalMinutes"), operationSettingDefaults.priceCollectIntervalMinutes, 1),
    backupRetentionCount: parseInteger(readFormValue(formData, "backupRetentionCount"), operationSettingDefaults.backupRetentionCount, 1),
    notificationMinRoi: parseInteger(readFormValue(formData, "notificationMinRoi"), operationSettingDefaults.notificationMinRoi, 0),
    notificationMinProfit: parseInteger(readFormValue(formData, "notificationMinProfit"), operationSettingDefaults.notificationMinProfit, 0),
    sourceDiscoveryMode: parseSourceDiscoveryMode(readFormValue(formData, "sourceDiscoveryMode"), operationSettingDefaults.sourceDiscoveryMode),
    priceSourceDiscoveryMode: parsePriceSourceDiscoveryMode(
      readFormValue(formData, "priceSourceDiscoveryMode"),
      operationSettingDefaults.priceSourceDiscoveryMode
    ),
    sourceDiscoveryAutoAddMinConfidence: parseFloatSetting(
      readFormValue(formData, "sourceDiscoveryAutoAddMinConfidence"),
      operationSettingDefaults.sourceDiscoveryAutoAddMinConfidence,
      0,
      1
    ),
    aiSourceCuratorEnabled: formData.get("aiSourceCuratorEnabled") === "on",
    aiSourceCuratorAutoRegisterWatch: formData.get("aiSourceCuratorAutoRegisterWatch") === "on",
    aiSourceCuratorAutoRegisterPrice: formData.get("aiSourceCuratorAutoRegisterPrice") === "on",
    sourceDiscoveryAutoEnableHighTrust: formData.get("sourceDiscoveryAutoEnableHighTrust") === "on",
    priceSourceDiscoveryAutoEnableHighTrust: formData.get("priceSourceDiscoveryAutoEnableHighTrust") === "on",
    priceSourceAutoEnableInferredTemplate: formData.get("priceSourceAutoEnableInferredTemplate") === "on",
    safeAutoEnableWatchSources: formData.get("safeAutoEnableWatchSources") === "on",
    safeAutoEnablePriceSources: formData.get("safeAutoEnablePriceSources") === "on",
    safeAutoEnableMinTrust: parseAutoEnableMinTrust(readFormValue(formData, "safeAutoEnableMinTrust"), operationSettingDefaults.safeAutoEnableMinTrust),
    safeAutoEnableWatchLimit: parseInteger(
      readFormValue(formData, "safeAutoEnableWatchLimit"),
      operationSettingDefaults.safeAutoEnableWatchLimit,
      0
    ),
    safeAutoEnablePriceLimit: parseInteger(
      readFormValue(formData, "safeAutoEnablePriceLimit"),
      operationSettingDefaults.safeAutoEnablePriceLimit,
      0
    ),
    autoDisableFailureThreshold: parseInteger(
      readFormValue(formData, "autoDisableFailureThreshold"),
      operationSettingDefaults.autoDisableFailureThreshold,
      1
    ),
    autoPilotEnabled: formData.get("autoPilotEnabled") === "on",
    autoPilotRunOnEmptySimple: formData.get("autoPilotRunOnEmptySimple") === "on",
    autoPilotRunWhenNoWatchSource: formData.get("autoPilotRunWhenNoWatchSource") === "on",
    autoPilotRunWhenNoPriceSource: formData.get("autoPilotRunWhenNoPriceSource") === "on",
    autoPilotMaxDiscoveryCount: parseInteger(readFormValue(formData, "autoPilotMaxDiscoveryCount"), operationSettingDefaults.autoPilotMaxDiscoveryCount, 1),
    autoPilotMaxAiClassifications: parseInteger(
      readFormValue(formData, "autoPilotMaxAiClassifications"),
      operationSettingDefaults.autoPilotMaxAiClassifications,
      0
    ),
    autoPilotMaxAutoRegister: parseInteger(
      readFormValue(formData, "autoPilotMaxAutoRegister"),
      operationSettingDefaults.autoPilotMaxAutoRegister,
      0
    ),
    autoPilotMaxAutoEnable: parseInteger(
      readFormValue(formData, "autoPilotMaxAutoEnable"),
      operationSettingDefaults.autoPilotMaxAutoEnable,
      0
    ),
    autoPilotIntervalMinutes: parseInteger(readFormValue(formData, "autoPilotIntervalMinutes"), operationSettingDefaults.autoPilotIntervalMinutes, 1),
    autoPilotSafeEnableOnly: formData.get("autoPilotSafeEnableOnly") === "on",
    aiSourceCuratorRegisterLimit: parseInteger(
      readFormValue(formData, "aiSourceCuratorRegisterLimit"),
      operationSettingDefaults.aiSourceCuratorRegisterLimit,
      1
    ),
    aiSourceCuratorEnableLimit: parseInteger(
      readFormValue(formData, "aiSourceCuratorEnableLimit"),
      operationSettingDefaults.aiSourceCuratorEnableLimit,
      0
    )
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

function parseFloatSetting(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parseSourceDiscoveryMode(value: string | undefined, fallback: string) {
  if (value === "candidates_only" || value === "auto_add_disabled" || value === "auto_add_high_confidence_disabled") return value;
  return fallback;
}

function parsePriceSourceDiscoveryMode(value: string | undefined, fallback: string) {
  if (value === "candidates_only" || value === "auto_add_high_confidence_disabled" || value === "manual_review") return value;
  return fallback;
}

function parseAutoEnableMinTrust(value: string | undefined, fallback: string) {
  if (value === "high" || value === "medium") return value;
  return fallback;
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}
