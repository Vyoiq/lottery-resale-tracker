import { NextResponse } from "next/server";
import { csvContent, dateValue, exportTimestamp } from "@/lib/exportUtils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.priceRecord.findMany({
    orderBy: [{ extractedAt: "desc" }],
    include: {
      lotteryListing: {
        select: {
          productName: true,
          storeName: true,
          lotteryUrl: true
        }
      }
    }
  });

  const csv = csvContent([
    [
      "商品名",
      "抽選商品名",
      "店舗名",
      "買取店",
      "買取価格",
      "一致タイトル",
      "confidenceScore",
      "取得日時",
      "価格URL",
      "抽選URL",
      "rawText"
    ],
    ...rows.map((row) => [
      row.productName,
      row.lotteryListing.productName,
      row.lotteryListing.storeName,
      row.shopName,
      row.price,
      row.matchedTitle,
      row.confidenceScore,
      dateValue(row.extractedAt),
      row.sourceUrl,
      row.lotteryListing.lotteryUrl,
      row.rawText ?? ""
    ])
  ]);

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="price-records-${exportTimestamp()}.csv"`
    }
  });
}
