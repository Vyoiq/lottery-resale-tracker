"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { collectPricesForListing } from "@/services/priceCollectors/base";
import { refreshListingBestPrice } from "@/services/priceCollectors/savePriceRecords";
import { deleteBackup } from "@/services/backups/backupService";
import { operationSettingsFromForm, saveOperationSettings } from "@/lib/appSettings";
import { prisma } from "@/lib/prisma";
import { recalculateAllListingPriorities, recalculateListingPriority } from "@/lib/priorityService";
import { calculateActualSaleMetrics } from "@/lib/salesCalculations";
import { runFullOperation, runOperationTask, operationRunTypes } from "@/services/operations/operationRunner";
import { isPlaceholderPriceSource, placeholderSourceReason } from "@/lib/sourceGuards";
import { addDiscoveredSourceAsPriceSource, addDiscoveredSourceAsWatchSource, ignoreDiscoveredSource } from "@/services/sourceDiscovery/discoveryRunner";
import { cleanupPlaceholderSources } from "@/services/sources/placeholderCleanup";

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}

function optionalStr(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length > 0 ? value : null;
}

function optionalInt(formData: FormData, key: string) {
  const value = Number(str(formData, key));
  return Number.isFinite(value) ? Math.trunc(value) : null;
}

export async function createWatchSource(formData: FormData) {
  const data = {
    name: str(formData, "name"),
    storeName: str(formData, "storeName"),
    url: str(formData, "url"),
    type: str(formData, "type") || "html",
    memo: optionalStr(formData, "memo")
  };
  const placeholder = placeholderSourceReason(data);
  await prisma.watchSource.create({
    data: {
      ...data,
      enabled: !placeholder && formData.get("enabled") === "on"
    }
  });
  revalidatePath("/sources");
  revalidatePath("/health");
  redirect("/sources");
}

export async function createWatchSourceFromPreset(formData: FormData) {
  const preset = await prisma.sourcePreset.findUnique({ where: { id: str(formData, "id") } });
  if (!preset) return;

  const existing = await prisma.watchSource.findUnique({ where: { url: preset.url } });
  if (!existing) {
    await prisma.watchSource.create({
      data: {
        name: preset.name,
        storeName: preset.storeName,
        url: preset.url,
        type: preset.type,
        enabled: false,
        memo: [preset.description, preset.memo].filter(Boolean).join("\n\n") || null
      }
    });
  }
  revalidatePath("/");
  revalidatePath("/sources");
  revalidatePath("/sources/presets");
}

export async function createSelectedWatchSourcesFromPresets(formData: FormData) {
  const ids = formData.getAll("presetIds").filter((value): value is string => typeof value === "string" && value.length > 0);
  if (ids.length === 0) return;

  const presets = await prisma.sourcePreset.findMany({ where: { id: { in: ids } } });
  const existing = await prisma.watchSource.findMany({ where: { url: { in: presets.map((preset) => preset.url) } }, select: { url: true } });
  const existingUrls = new Set(existing.map((source) => source.url));
  const data = presets
    .filter((preset) => !existingUrls.has(preset.url))
    .map((preset) => ({
      name: preset.name,
      storeName: preset.storeName,
      url: preset.url,
      type: preset.type,
      enabled: false,
      memo: [preset.description, preset.memo].filter(Boolean).join("\n\n") || null
    }));

  if (data.length > 0) await prisma.watchSource.createMany({ data });
  revalidatePath("/");
  revalidatePath("/sources");
  revalidatePath("/sources/presets");
}

export async function createPriceSourceFromPreset(formData: FormData) {
  const preset = await prisma.priceSourcePreset.findUnique({ where: { id: str(formData, "id") } });
  if (!preset) return;

  const existing = await prisma.priceSource.findFirst({
    where: { OR: [{ searchUrlTemplate: preset.searchUrlTemplate }, { baseUrl: preset.baseUrl }] }
  });
  if (!existing) {
    await prisma.priceSource.create({
      data: {
        name: preset.name,
        shopName: preset.shopName,
        baseUrl: preset.baseUrl,
        searchUrlTemplate: preset.searchUrlTemplate,
        enabled: false,
        memo: [preset.description, preset.memo].filter(Boolean).join("\n\n") || null
      }
    });
  }
  revalidatePath("/");
  revalidatePath("/price-sources");
  revalidatePath("/price-sources/presets");
}

export async function createSelectedPriceSourcesFromPresets(formData: FormData) {
  const ids = formData.getAll("presetIds").filter((value): value is string => typeof value === "string" && value.length > 0);
  if (ids.length === 0) return;

  const presets = await prisma.priceSourcePreset.findMany({ where: { id: { in: ids } } });
  const existing = await prisma.priceSource.findMany({
    where: {
      OR: [
        { searchUrlTemplate: { in: presets.map((preset) => preset.searchUrlTemplate) } },
        { baseUrl: { in: presets.map((preset) => preset.baseUrl) } }
      ]
    },
    select: { searchUrlTemplate: true, baseUrl: true }
  });
  const existingTemplates = new Set(existing.map((source) => source.searchUrlTemplate));
  const existingBaseUrls = new Set(existing.map((source) => source.baseUrl));
  const data = presets
    .filter((preset) => !existingTemplates.has(preset.searchUrlTemplate) && !existingBaseUrls.has(preset.baseUrl))
    .map((preset) => ({
      name: preset.name,
      shopName: preset.shopName,
      baseUrl: preset.baseUrl,
      searchUrlTemplate: preset.searchUrlTemplate,
      enabled: false,
      memo: [preset.description, preset.memo].filter(Boolean).join("\n\n") || null
    }));

  if (data.length > 0) await prisma.priceSource.createMany({ data });
  revalidatePath("/");
  revalidatePath("/price-sources");
  revalidatePath("/price-sources/presets");
}

export async function createDiscoveryQueryAction(formData: FormData) {
  await prisma.discoveryQuery.create({
    data: {
      name: str(formData, "name") || str(formData, "query"),
      query: str(formData, "query"),
      type: str(formData, "type") || "both",
      category: str(formData, "category") || "other",
      enabled: formData.get("enabled") === "on",
      memo: optionalStr(formData, "memo")
    }
  });
  revalidatePath("/source-discovery");
}

export async function toggleDiscoveryQueryAction(formData: FormData) {
  await prisma.discoveryQuery.update({
    where: { id: str(formData, "id") },
    data: { enabled: str(formData, "enabled") === "true" }
  });
  revalidatePath("/source-discovery");
}

export async function updateWatchSource(formData: FormData) {
  const id = str(formData, "id");
  const data = {
    name: str(formData, "name"),
    storeName: str(formData, "storeName"),
    url: str(formData, "url"),
    type: str(formData, "type") || "html",
    memo: optionalStr(formData, "memo")
  };
  const placeholder = placeholderSourceReason(data);
  await prisma.watchSource.update({
    where: { id },
    data: {
      ...data,
      enabled: !placeholder && formData.get("enabled") === "on"
    }
  });
  revalidatePath("/sources");
  revalidatePath("/health");
  redirect("/sources");
}

export async function toggleWatchSource(formData: FormData) {
  const id = str(formData, "id");
  const enabled = str(formData, "enabled") === "true";
  const source = await prisma.watchSource.findUnique({ where: { id } });
  if (!source) return;
  if (enabled && placeholderSourceReason(source)) {
    await prisma.watchSource.update({
      where: { id },
      data: { enabled: false, lastError: "プレースホルダーのため有効化できません。" }
    });
    revalidatePath("/sources");
    revalidatePath("/health");
    return;
  }
  await prisma.watchSource.update({
    where: { id },
    data: { enabled }
  });
  revalidatePath("/sources");
  revalidatePath("/health");
}

export async function ignoreLotteryListing(formData: FormData) {
  const id = str(formData, "id");
  await prisma.lotteryListing.update({
    where: { id },
    data: {
      ignored: true,
      ignoredReason: optionalStr(formData, "ignoredReason"),
      ignoredAt: new Date(),
      status: "ignored"
    }
  });
  await recalculateListingPriority(prisma, id);
  revalidateListingViews(id);
}

export async function unignoreLotteryListing(formData: FormData) {
  const id = str(formData, "id");
  await prisma.lotteryListing.update({
    where: { id },
    data: {
      ignored: false,
      ignoredReason: null,
      ignoredAt: null,
      status: "active"
    }
  });
  await recalculateListingPriority(prisma, id);
  revalidateListingViews(id);
}

export async function setListingVerdict(formData: FormData) {
  const id = str(formData, "id");
  const verdict = str(formData, "userVerdict");
  const allowed = new Set(["good", "wrong_price", "wrong_product", "low_interest", "expired", "duplicate", "other"]);
  if (!allowed.has(verdict)) return;

  await prisma.lotteryListing.update({
    where: { id },
    data: {
      userVerdict: verdict,
      userVerdictMemo: optionalStr(formData, "userVerdictMemo"),
      userVerdictAt: new Date()
    }
  });
  revalidateListingViews(id);
}

export async function clearListingVerdict(formData: FormData) {
  const id = str(formData, "id");
  await prisma.lotteryListing.update({
    where: { id },
    data: {
      userVerdict: null,
      userVerdictMemo: null,
      userVerdictAt: null
    }
  });
  revalidateListingViews(id);
}

export async function setApplicationMilestone(formData: FormData) {
  const id = str(formData, "id");
  const nextStatus = str(formData, "applicationStatus");
  const now = new Date();
  const data =
    nextStatus === "applied"
      ? { applicationStatus: "applied", appliedAt: now }
      : nextStatus === "won"
        ? { applicationStatus: "won", wonAt: now }
        : nextStatus === "lost"
          ? { applicationStatus: "lost", lostAt: now }
          : nextStatus === "skipped"
            ? { applicationStatus: "skipped", skippedAt: now }
            : null;

  if (!data) return;
  await prisma.lotteryListing.update({ where: { id }, data });
  revalidateListingViews(id);
}

export async function recordPurchase(formData: FormData) {
  const id = str(formData, "id");
  const purchasePrice = optionalInt(formData, "purchasePrice");
  if (!purchasePrice || purchasePrice <= 0) return;

  await prisma.lotteryListing.update({
    where: { id },
    data: {
      applicationStatus: "purchased",
      purchasedAt: new Date(),
      purchasePrice,
      purchaseMemo: optionalStr(formData, "purchaseMemo")
    }
  });
  revalidateListingViews(id);
}

export async function recordSale(formData: FormData) {
  const id = str(formData, "id");
  const listing = await prisma.lotteryListing.findUnique({ where: { id } });
  if (!listing) return;

  const salePrice = optionalInt(formData, "salePrice");
  if (!salePrice || salePrice <= 0) return;
  const purchasePrice = optionalInt(formData, "purchasePrice") ?? listing.purchasePrice ?? listing.retailPrice;
  const shippingCost = optionalInt(formData, "shippingCost") ?? 0;
  const fee = optionalInt(formData, "fee") ?? 0;
  const metrics = calculateActualSaleMetrics({ purchasePrice, salePrice, shippingCost, fee });

  await prisma.lotteryListing.update({
    where: { id },
    data: {
      applicationStatus: "sold",
      soldAt: new Date(),
      purchasedAt: listing.purchasedAt ?? new Date(),
      purchasePrice,
      salePrice,
      shippingCost,
      fee,
      saleDestination: optionalStr(formData, "saleDestination"),
      saleMemo: optionalStr(formData, "saleMemo"),
      actualProfit: metrics.actualProfit,
      actualProfitRate: metrics.actualProfitRate,
      actualRoi: metrics.actualRoi
    }
  });
  revalidateListingViews(id);
}

export async function runCollectorsAction() {
  await runOperationTask("collect");
  revalidatePath("/");
  revalidatePath("/simple");
  revalidatePath("/lotteries");
  revalidatePath("/sources");
  revalidatePath("/runs");
  revalidatePath("/operation-runs");
  revalidatePath("/review");
  revalidatePath("/settings/score-tuning");
}

export async function createPriceSource(formData: FormData) {
  const baseUrl = str(formData, "baseUrl");
  const searchUrlTemplate = str(formData, "searchUrlTemplate");
  const sourceData = {
    name: str(formData, "name"),
    shopName: str(formData, "shopName"),
    baseUrl,
    searchUrlTemplate,
    memo: optionalStr(formData, "memo")
  };
  const placeholder = isPlaceholderPriceSource(sourceData);
  await prisma.priceSource.create({
    data: {
      ...sourceData,
      enabled: !placeholder && formData.get("enabled") === "on",
    }
  });
  revalidatePath("/price-sources");
  revalidatePath("/health");
}

export async function togglePriceSource(formData: FormData) {
  const id = str(formData, "id");
  const enabled = str(formData, "enabled") === "true";
  const source = await prisma.priceSource.findUnique({
    where: { id },
  });
  if (!source) return;
  if (enabled && (isPlaceholderPriceSource(source) || !source.searchUrlTemplate.includes("{keyword}"))) {
    revalidatePath("/price-sources");
    revalidatePath("/health");
    return;
  }
  await prisma.priceSource.update({
    where: { id },
    data: { enabled }
  });
  revalidatePath("/price-sources");
  revalidatePath("/price-sources/presets");
  revalidatePath("/health");
}

export async function updateLotteryRetailPrice(formData: FormData) {
  const id = str(formData, "id");
  const retailPrice = optionalInt(formData, "retailPrice");
  await prisma.lotteryListing.update({
    where: { id },
    data: { retailPrice }
  });
  await refreshListingBestPrice(prisma, id);
  await recalculateListingPriority(prisma, id);
  revalidateListingViews(id);
}

export async function addManualPriceRecord(formData: FormData) {
  const listingId = str(formData, "lotteryListingId");
  const listing = await prisma.lotteryListing.findUnique({ where: { id: listingId } });
  if (!listing) return;
  const price = Number(str(formData, "price"));
  if (!Number.isFinite(price)) return;

  await prisma.priceRecord.create({
    data: {
      lotteryListingId: listingId,
      productName: listing.productName,
      shopName: str(formData, "shopName") || "手入力",
      price: Math.trunc(price),
      sourceUrl: str(formData, "sourceUrl") || listing.lotteryUrl,
      matchedTitle: str(formData, "matchedTitle") || listing.productName,
      confidenceScore: 1,
      rawText: optionalStr(formData, "rawText")
    }
  });
  await refreshListingBestPrice(prisma, listingId);
  await recalculateListingPriority(prisma, listingId);
  revalidateListingViews(listingId);
}

export async function runPriceCheckForListingAction(formData: FormData) {
  const id = str(formData, "id");
  try {
    await collectPricesForListing(id);
  } catch {
    await recalculateListingPriority(prisma, id);
  }
  revalidateListingViews(id);
}

export async function runPriceCollectorsAction() {
  await runOperationTask("price_collect");
  revalidatePath("/");
  revalidatePath("/simple");
  revalidatePath("/lotteries");
  revalidatePath("/price-sources");
  revalidatePath("/operation-runs");
  revalidatePath("/review");
  revalidatePath("/settings/score-tuning");
}

export async function createExclusionKeyword(formData: FormData) {
  await prisma.exclusionKeyword.create({
    data: {
      keyword: str(formData, "keyword"),
      enabled: formData.get("enabled") === "on",
      memo: optionalStr(formData, "memo")
    }
  });
  await recalculateAllListingPriorities(prisma);
  revalidatePath("/settings/exclusions");
  revalidatePath("/");
  revalidatePath("/lotteries");
  revalidatePath("/review");
  revalidatePath("/settings/score-tuning");
}

export async function toggleExclusionKeyword(formData: FormData) {
  await prisma.exclusionKeyword.update({
    where: { id: str(formData, "id") },
    data: { enabled: str(formData, "enabled") === "true" }
  });
  await recalculateAllListingPriorities(prisma);
  revalidatePath("/settings/exclusions");
  revalidatePath("/");
  revalidatePath("/lotteries");
  revalidatePath("/review");
  revalidatePath("/settings/score-tuning");
}

export async function generateNotificationsAction() {
  await runOperationTask("notifications");
  revalidatePath("/");
  revalidatePath("/notifications");
  revalidatePath("/lotteries");
  revalidatePath("/operation-runs");
}

export async function markNotificationRead(formData: FormData) {
  await prisma.notification.update({
    where: { id: str(formData, "id") },
    data: {
      read: true,
      readAt: new Date()
    }
  });
  revalidatePath("/");
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  await prisma.notification.updateMany({
    where: { read: false },
    data: {
      read: true,
      readAt: new Date()
    }
  });
  revalidatePath("/");
  revalidatePath("/notifications");
}

export async function createBackupAction(formData?: FormData) {
  const memo = formData ? optionalStr(formData, "memo") : null;
  await runOperationTask("backup", prisma, { backupMemo: memo ?? "手動バックアップ" });
  revalidatePath("/");
  revalidatePath("/backups");
  revalidatePath("/operation-runs");
}

export async function deleteBackupAction(formData: FormData) {
  await deleteBackup(str(formData, "id"));
  revalidatePath("/");
  revalidatePath("/backups");
}

export async function updateOperationSettingsAction(formData: FormData) {
  await saveOperationSettings(operationSettingsFromForm(formData));
  revalidatePath("/");
  revalidatePath("/settings/operations");
}

export async function runOperationTasksAction() {
  await runFullOperation();
  revalidateOperationViews();
}

export async function cleanupPlaceholderSourcesAction() {
  await cleanupPlaceholderSources();
  revalidatePath("/");
  revalidatePath("/sources");
  revalidatePath("/price-sources");
  revalidatePath("/health");
  revalidatePath("/operation-runs");
}

export async function runSourceDiscoveryAction() {
  await runOperationTask("source_discovery");
  revalidatePath("/");
  revalidatePath("/source-discovery");
  revalidatePath("/sources");
  revalidatePath("/price-sources");
  revalidatePath("/operation-runs");
}

export async function cleanupEndedListingsAction() {
  await runOperationTask("cleanup_ended");
  revalidatePath("/");
  revalidatePath("/simple");
  revalidatePath("/lotteries");
  revalidatePath("/operation-runs");
  revalidatePath("/settings/operations");
}

export async function runPriceSourceDiscoveryAction() {
  await runOperationTask("price_source_discovery");
  revalidatePath("/");
  revalidatePath("/simple");
  revalidatePath("/source-discovery");
  revalidatePath("/price-sources");
  revalidatePath("/operation-runs");
}

export async function runAiClassificationAction() {
  await runOperationTask("ai_classification");
  revalidatePath("/");
  revalidatePath("/simple");
  revalidatePath("/source-discovery");
  revalidatePath("/lotteries");
  revalidatePath("/operation-runs");
}

export async function runSingleOperationTaskAction(formData: FormData) {
  const type = str(formData, "type");
  if (!operationRunTypes.includes(type as (typeof operationRunTypes)[number]) || type === "full_run") return;
  await runOperationTask(type as Exclude<(typeof operationRunTypes)[number], "full_run">);
  revalidateOperationViews();
}

export async function addDiscoveredWatchSourceAction(formData: FormData) {
  await addDiscoveredSourceAsWatchSource(str(formData, "id"));
  revalidateDiscoveryViews();
}

export async function addDiscoveredPriceSourceAction(formData: FormData) {
  await addDiscoveredSourceAsPriceSource(str(formData, "id"));
  revalidateDiscoveryViews();
}

export async function ignoreDiscoveredSourceAction(formData: FormData) {
  await ignoreDiscoveredSource(str(formData, "id"));
  revalidateDiscoveryViews();
}

export async function bulkAddDiscoveredWatchSourcesAction(formData: FormData) {
  const ids = formData.getAll("ids").filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const id of ids) await addDiscoveredSourceAsWatchSource(id);
  revalidateDiscoveryViews();
}

export async function bulkAddDiscoveredPriceSourcesAction(formData: FormData) {
  const ids = formData.getAll("ids").filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const id of ids) await addDiscoveredSourceAsPriceSource(id);
  revalidateDiscoveryViews();
}

export async function bulkIgnoreDiscoveredSourcesAction(formData: FormData) {
  const ids = formData.getAll("ids").filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const id of ids) await ignoreDiscoveredSource(id);
  revalidateDiscoveryViews();
}

function revalidateListingViews(id: string) {
  revalidatePath("/");
  revalidatePath("/simple");
  revalidatePath("/lotteries");
  revalidatePath(`/lotteries/${id}`);
  revalidatePath("/review");
  revalidatePath("/settings/score-tuning");
  revalidatePath("/analytics");
  revalidatePath("/notifications");
}

function revalidateOperationViews() {
  revalidatePath("/");
  revalidatePath("/simple");
  revalidatePath("/source-discovery");
  revalidatePath("/operation-runs");
  revalidatePath("/settings/operations");
  revalidatePath("/runs");
  revalidatePath("/backups");
  revalidatePath("/lotteries");
  revalidatePath("/notifications");
  revalidatePath("/price-sources");
}

function revalidateDiscoveryViews() {
  revalidatePath("/");
  revalidatePath("/source-discovery");
  revalidatePath("/sources");
  revalidatePath("/price-sources");
  revalidatePath("/health");
}
