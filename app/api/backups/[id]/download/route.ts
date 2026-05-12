import { readFile, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveBackupRecordPath } from "@/services/backups/backupService";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const record = await prisma.backupRecord.findUnique({ where: { id: params.id } });
  if (!record) return NextResponse.json({ error: "Backup not found" }, { status: 404 });

  const filePath = resolveBackupRecordPath(record.path);
  const [file, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(fileStat.size),
      "Content-Disposition": `attachment; filename="${record.filename}"`
    }
  });
}
