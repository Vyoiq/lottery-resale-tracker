"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runCollectors } from "@/services/collectors/base";
import { collectPricesForListing, runPriceCollectors } from "@/services/priceCollectors/base";
import { refreshListingBestPrice } from "@/services/priceCollectors/savePriceRecords";
import { generateNotifications } from "@/services/notifications/generateNotifications";
import { prisma } from "@/lib/prisma";
import { recalculateAllListingPriorities, recalculateListingPriority } from "@/lib/priorityService";
import { calculateActualSaleMetrics } from "@/lib/salesCalculations";

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
  await prisma.watchSource.create({
    data: {
      name: str(formData, "name"),
      storeName: str(formData, "storeName"),
      url: str(formData, "url"),
      type: str(formData, "type") || "html",
      enabled: formData.get("enabled") === "on",
      memo: optionalStr(formData, "memo")
    }
  });
  revalidatePath("/sources");
  redirect("/sources");
}

export async function createWatchSourceFromPreset(formData: FormData) {
  const preset = await prisma.sourcePreset.findUnique({ where: { id: str(formData, "id") } });
  if (!preset) return;

  await prisma.watchSource.upsert({
    where: { url: preset.url },
    update: {
      name: preset.name,
      storeName: preset.storeName,
      type: preset.type,
      enabled: false,
      memo: preset.description
    },
    create: {
      name: preset.name,
      storeName: preset.storeName,
      url: preset.url,
      type: preset.type,
      enabled: false,
      memo: preset.description
    }
  });
  revalidatePath("/sources");
  revalidatePath("/sources/presets");
  redirect("/sources");
}

export async function updateWatchSource(formData: FormData) {
  const id = str(formData, "id");
  await prisma.watchSource.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      storeName: str(formData, "storeName"),
      url: str(formData, "url"),
      type: str(formData, "type") || "html",
      enabled: formData.get("enabled") === "on",
      memo: optionalStr(formData, "memo")
    }
  });
  revalidatePath("/sources");
  redirect("/sources");
}

export async function toggleWatchSource(formData: FormData) {
  await prisma.watchSource.update({
    where: { id: str(formData, "id") },
    data: { enabled: str(formData, "enabled") === "true" }
  });
  revalidatePath("/sources");
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
  await runCollectors();
  await recalculateAllListingPriorities(prisma);
  revalidatePath("/");
  revalidatePath("/lotteries");
  revalidatePath("/sources");
  revalidatePath("/runs");
  revalidatePath("/review");
  revalidatePath("/settings/score-tuning");
}

export async function createPriceSource(formData: FormData) {
  await prisma.priceSource.create({
    data: {
      name: str(formData, "name"),
      shopName: str(formData, "shopName"),
      baseUrl: str(formData, "baseUrl"),
      searchUrlTemplate: str(formData, "searchUrlTemplate"),
      enabled: formData.get("enabled") === "on",
      memo: optionalStr(formData, "memo")
    }
  });
  revalidatePath("/price-sources");
}

export async function togglePriceSource(formData: FormData) {
  await prisma.priceSource.update({
    where: { id: str(formData, "id") },
    data: { enabled: str(formData, "enabled") === "true" }
  });
  revalidatePath("/price-sources");
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
  await runPriceCollectors();
  await recalculateAllListingPriorities(prisma);
  revalidatePath("/");
  revalidatePath("/lotteries");
  revalidatePath("/price-sources");
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
  await generateNotifications();
  revalidatePath("/");
  revalidatePath("/notifications");
  revalidatePath("/lotteries");
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

function revalidateListingViews(id: string) {
  revalidatePath("/");
  revalidatePath("/lotteries");
  revalidatePath(`/lotteries/${id}`);
  revalidatePath("/review");
  revalidatePath("/settings/score-tuning");
  revalidatePath("/analytics");
  revalidatePath("/notifications");
}
