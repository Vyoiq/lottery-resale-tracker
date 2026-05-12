import { NextResponse } from "next/server";
import { deleteBackup } from "@/services/backups/backupService";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const record = await deleteBackup(params.id);
  if (!record) return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  return NextResponse.json({ ok: true, deleted: record });
}
