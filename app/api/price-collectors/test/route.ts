import { NextResponse } from "next/server";
import { testPriceCollection } from "@/services/priceCollectors/base";

export async function POST(request: Request) {
  const body = await request.json();
  const productName = String(body.productName ?? "").trim();
  const priceSourceId = body.priceSourceId ? String(body.priceSourceId) : undefined;
  if (!productName) {
    return NextResponse.json({ error: "productName is required" }, { status: 400 });
  }
  const result = await testPriceCollection({ productName, priceSourceId });
  return NextResponse.json({
    source: result.source,
    candidates: result.result.candidates,
    rejected: result.result.rejected,
    keywords: result.result.keywords,
    searches: result.result.searches,
    searchUrl: result.result.searchUrl,
    httpStatus: result.result.httpStatus
  });
}
