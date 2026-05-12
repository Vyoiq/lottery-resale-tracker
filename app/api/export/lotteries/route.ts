import { NextResponse } from "next/server";
import { csvContent, dateValue, exportTimestamp } from "@/lib/exportUtils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.lotteryListing.findMany({
    orderBy: [{ detectedAt: "desc" }],
    select: {
      title: true,
      productName: true,
      storeName: true,
      sourceName: true,
      lotteryUrl: true,
      applicationStartAt: true,
      applicationEndAt: true,
      resultAnnouncementAt: true,
      purchaseDeadlineAt: true,
      status: true,
      applicationStatus: true,
      applicationPriorityLabel: true,
      applicationPriorityScore: true,
      retailPrice: true,
      bestBuyPrice: true,
      estimatedProfit: true,
      profitRate: true,
      roi: true,
      priceMultiplier: true,
      priceStatus: true,
      detectedAt: true,
      lastSeenAt: true,
      ignored: true,
      userVerdict: true
    }
  });

  const csv = csvContent([
    [
      "抽選タイトル",
      "商品名",
      "店舗名",
      "ソース名",
      "URL",
      "応募開始",
      "応募締切",
      "当選発表",
      "購入期限",
      "抽選ステータス",
      "応募状況",
      "優先度",
      "優先度スコア",
      "定価",
      "最高買取価格",
      "想定利益",
      "利益率",
      "ROI",
      "倍率",
      "価格ステータス",
      "検出日時",
      "最終確認日時",
      "無視",
      "ユーザー判定"
    ],
    ...rows.map((row) => [
      row.title,
      row.productName,
      row.storeName,
      row.sourceName,
      row.lotteryUrl,
      dateValue(row.applicationStartAt),
      dateValue(row.applicationEndAt),
      dateValue(row.resultAnnouncementAt),
      dateValue(row.purchaseDeadlineAt),
      row.status,
      row.applicationStatus,
      row.applicationPriorityLabel,
      row.applicationPriorityScore,
      row.retailPrice ?? "",
      row.bestBuyPrice ?? "",
      row.estimatedProfit ?? "",
      row.profitRate ?? "",
      row.roi ?? "",
      row.priceMultiplier ?? "",
      row.priceStatus,
      dateValue(row.detectedAt),
      dateValue(row.lastSeenAt),
      row.ignored ? "true" : "false",
      row.userVerdict ?? ""
    ])
  ]);

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lottery-listings-${exportTimestamp()}.csv"`
    }
  });
}
