import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  await prisma.notification.update({
    where: { id: params.id },
    data: {
      read: true,
      readAt: new Date()
    }
  });
  return NextResponse.json({ ok: true });
}
