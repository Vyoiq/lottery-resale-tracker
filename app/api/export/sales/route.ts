import { NextResponse } from "next/server";
import { csvContent, dateValue, exportTimestamp } from "@/lib/exportUtils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.lotteryListing.findMany({
    where: {
      OR: [
        { applicationStatus: { in: ["applied", "won", "lost", "purchased", "sold", "skipped"] } },
        { appliedAt: { not: null } },
        { purchasedAt: { not: null } },
        { soldAt: { not: null } }
      ]
    },
    orderBy: [{ soldAt: "desc" }, { purchasedAt: "desc" }, { appliedAt: "desc" }],
    select: {
      productName: true,
      storeName: true,
      applicationStatus: true,
      appliedAt: true,
      wonAt: true,
      lostAt: true,
      purchasedAt: true,
      soldAt: true,
      purchasePrice: true,
      purchaseMemo: true,
      salePrice: true,
      shippingCost: true,
      fee: true,
      saleDestination: true,
      actualProfit: true,
      actualProfitRate: true,
      actualRoi: true,
      saleMemo: true
    }
  });

  const csv = csvContent([
    [
      "商品名",
      "店舗名",
      "応募状況",
      "応募日",
      "当選日",
      "落選日",
      "購入日",
      "売却日",
      "購入価格",
      "売却価格",
      "送料",
      "手数料",
      "売却先",
      "実利益",
      "実利益率",
      "実ROI",
      "購入メモ",
      "売却メモ"
    ],
    ...rows.map((row) => [
      row.productName,
      row.storeName,
      row.applicationStatus,
      dateValue(row.appliedAt),
      dateValue(row.wonAt),
      dateValue(row.lostAt),
      dateValue(row.purchasedAt),
      dateValue(row.soldAt),
      row.purchasePrice ?? "",
      row.salePrice ?? "",
      row.shippingCost ?? "",
      row.fee ?? "",
      row.saleDestination ?? "",
      row.actualProfit ?? "",
      row.actualProfitRate ?? "",
      row.actualRoi ?? "",
      row.purchaseMemo ?? "",
      row.saleMemo ?? ""
    ])
  ]);

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="application-sales-history-${exportTimestamp()}.csv"`
    }
  });
}
