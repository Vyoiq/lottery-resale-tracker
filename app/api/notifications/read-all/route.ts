import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const result = await prisma.notification.updateMany({
    where: { read: false },
    data: {
      read: true,
      readAt: new Date()
    }
  });
  return NextResponse.json({ ok: true, updatedCount: result.count });
}
