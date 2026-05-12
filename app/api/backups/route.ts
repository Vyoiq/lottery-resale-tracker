import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const records = await prisma.backupRecord.findMany({
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(records);
}
