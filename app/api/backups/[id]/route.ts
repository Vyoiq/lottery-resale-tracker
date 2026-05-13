import { NextResponse } from "next/server";
import { deleteBackup } from "@/services/backups/backupService";
import { apiErrorBody } from "@/lib/errorMessages";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const record = await deleteBackup(params.id);
    if (!record) return NextResponse.json({ ok: false, error: "バックアップが見つかりません。" }, { status: 404 });
    return NextResponse.json({ ok: true, deleted: record });
  } catch (error) {
    return NextResponse.json(apiErrorBody("バックアップ削除", error), { status: 500 });
  }
}
