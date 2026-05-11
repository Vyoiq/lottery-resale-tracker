import { NextResponse } from "next/server";
import { runPriceCollectors } from "@/services/priceCollectors/base";

export async function POST() {
  const run = await runPriceCollectors();
  return NextResponse.json(run);
}
