import { NextResponse } from "next/server";
import { runOperationTask } from "@/services/operations/operationRunner";
import { apiErrorBody } from "@/lib/errorMessages";

export async function POST() {
  try {
    const result = await runOperationTask("source_discovery");
    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (error) {
    return NextResponse.json(apiErrorBody("ソース自動発見", error), { status: 500 });
  }
}
