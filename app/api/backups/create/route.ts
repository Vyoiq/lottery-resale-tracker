import { NextResponse } from "next/server";
import { createBackup } from "@/services/backups/backupService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const record = await createBackup({ memo: typeof body.memo === "string" ? body.memo : null });
  return NextResponse.json(record);
}
