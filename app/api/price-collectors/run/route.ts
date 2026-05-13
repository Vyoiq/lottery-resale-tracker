import { NextResponse } from "next/server";
import { runPriceCollectors } from "@/services/priceCollectors/base";
import { apiErrorBody } from "@/lib/errorMessages";

export async function POST() {
  try {
    const run = await runPriceCollectors();
    return NextResponse.json({ ok: run.errorCount === 0, ...run }, { status: run.errorCount === 0 ? 200 : 207 });
  } catch (error) {
    return NextResponse.json(apiErrorBody("価格取得", error), { status: 500 });
  }
}
