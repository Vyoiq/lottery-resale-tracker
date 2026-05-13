import { NextResponse } from "next/server";
import { runCollectors } from "@/services/collectors/base";
import { apiErrorBody } from "@/lib/errorMessages";

export async function POST() {
  try {
    const run = await runCollectors();
    return NextResponse.json({
      ok: run.errorCount === 0,
      id: run.id,
      targetSourceCount: run.targetSourceCount,
      successCount: run.successCount,
      errorCount: run.errorCount,
      newListingCount: run.newListingCount,
      updatedListingCount: run.updatedListingCount,
      skippedCount: run.skippedCount,
      errorMessage: run.errorMessage
    }, { status: run.errorCount === 0 ? 200 : 207 });
  } catch (error) {
    return NextResponse.json(apiErrorBody("抽選情報収集", error), { status: 500 });
  }
}
