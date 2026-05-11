import { NextResponse } from "next/server";
import { runCollectors } from "@/services/collectors/base";

export async function POST() {
  const run = await runCollectors();
  return NextResponse.json({
    id: run.id,
    targetSourceCount: run.targetSourceCount,
    successCount: run.successCount,
    errorCount: run.errorCount,
    newListingCount: run.newListingCount,
    updatedListingCount: run.updatedListingCount,
    skippedCount: run.skippedCount,
    errorMessage: run.errorMessage
  });
}
