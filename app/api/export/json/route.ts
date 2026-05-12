import { NextResponse } from "next/server";
import { exportTimestamp } from "@/lib/exportUtils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [watchSources, lotteryListings, priceSources, priceRecords, notifications] = await Promise.all([
    prisma.watchSource.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.lotteryListing.findMany({ orderBy: { detectedAt: "asc" } }),
    prisma.priceSource.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.priceRecord.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.notification.findMany({ orderBy: { createdAt: "asc" } })
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      watchSources,
      lotteryListings,
      priceSources,
      priceRecords,
      notifications
    }
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lottery-resale-tracker-export-${exportTimestamp()}.json"`
    }
  });
}
