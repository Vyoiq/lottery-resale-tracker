import { NextResponse } from "next/server";
import { createBackup } from "@/services/backups/backupService";
import { apiErrorBody } from "@/lib/errorMessages";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const record = await createBackup({ memo: typeof body.memo === "string" ? body.memo : null });
    return NextResponse.json({ ok: true, ...record });
  } catch (error) {
    return NextResponse.json(apiErrorBody("バックアップ作成", error), { status: 500 });
  }
}
