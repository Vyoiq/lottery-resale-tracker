import { NextResponse } from "next/server";
import { apiErrorBody } from "@/lib/errorMessages";
import { restoreBackup } from "@/services/backups/backupService";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const result = await restoreBackup(params.id);
    return NextResponse.json({
      ok: true,
      restored: {
        id: result.restored.id,
        filename: result.restored.filename,
        sizeBytes: result.restored.sizeBytes,
        createdAt: result.restored.createdAt
      },
      preRestoreBackup: result.preRestoreBackup,
      operationRunId: result.operationRun.id
    });
  } catch (error) {
    return NextResponse.json(apiErrorBody("バックアップ復元", error), { status: 500 });
  }
}
