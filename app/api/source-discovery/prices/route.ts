import { NextResponse } from "next/server";
import { apiErrorBody } from "@/lib/errorMessages";
import { runOperationTask } from "@/services/operations/operationRunner";

export async function POST() {
  try {
    const result = await runOperationTask("price_source_discovery");
    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (error) {
    return NextResponse.json(apiErrorBody("価格ソース自動発見", error), { status: 500 });
  }
}
