import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.lotteryListing.findMany({
    where: { applicationStatus: "sold" },
    orderBy: [{ soldAt: "desc" }],
    select: {
      productName: true,
      storeName: true,
      appliedAt: true,
      wonAt: true,
      purchasedAt: true,
      soldAt: true,
      purchasePrice: true,
      salePrice: true,
      shippingCost: true,
      fee: true,
      actualProfit: true,
      actualProfitRate: true,
      actualRoi: true,
      saleMemo: true
    }
  });

  const header = [
    "商品名",
    "店舗名",
    "応募日",
    "当選日",
    "購入日",
    "売却日",
    "購入価格",
    "売却価格",
    "送料",
    "手数料",
    "実利益",
    "実利益率",
    "実ROI",
    "メモ"
  ];

  const csv = [
    header,
    ...rows.map((row) => [
      row.productName,
      row.storeName,
      dateValue(row.appliedAt),
      dateValue(row.wonAt),
      dateValue(row.purchasedAt),
      dateValue(row.soldAt),
      row.purchasePrice ?? "",
      row.salePrice ?? "",
      row.shippingCost ?? "",
      row.fee ?? "",
      row.actualProfit ?? "",
      row.actualProfitRate ?? "",
      row.actualRoi ?? "",
      row.saleMemo ?? ""
    ])
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-history.csv"`
    }
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function dateValue(value: Date | null) {
  if (!value) return "";
  return new Date(value).toISOString();
}
