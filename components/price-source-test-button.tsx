"use client";

import { useState } from "react";
import { secondaryButtonClass } from "@/components/ui";

type TestResult = {
  error?: string;
  httpStatus?: number;
  searchUrl?: string;
  searches?: Array<{
    keyword: string;
    searchUrl: string;
    httpStatus: number;
    candidates: Array<{
      matchedTitle: string;
      price: number;
      confidenceScore: number;
      priceKind: string;
    }>;
  }>;
};

const testProducts = ["スペシャルBOX ポケモンセンターヒロシマ", "ポケモンカード BOX"];

export function PriceSourceTestButton({ priceSourceId }: { priceSourceId: string }) {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    try {
      const responses = await Promise.all(
        testProducts.map(async (productName) => {
          const response = await fetch("/api/price-collectors/test", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ productName, priceSourceId })
          });
          return (await response.json()) as TestResult;
        })
      );
      setResult(mergeResults(responses));
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "価格取得テストに失敗しました" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid justify-items-end gap-2">
      <button className={secondaryButtonClass} type="button" onClick={runTest} disabled={loading}>
        {loading ? "テスト中..." : "テスト取得"}
      </button>
      {result ? (
        <div className="w-full max-w-lg rounded-md border border-border bg-background p-3 text-left text-xs leading-5">
          {result.error ? (
            <div className="font-medium text-rose-700">{result.error}</div>
          ) : (
            <>
              <div>HTTP: {result.httpStatus ?? "-"}</div>
              <div className="break-all">URL: {result.searchUrl ?? "-"}</div>
              {(result.searches ?? []).flatMap((search) => search.candidates.slice(0, 2)).length === 0 ? (
                <div className="mt-2 text-amber-700">価格候補なし</div>
              ) : (
                <div className="mt-2 grid gap-1">
                  {(result.searches ?? []).flatMap((search) =>
                    search.candidates.slice(0, 2).map((candidate) => (
                      <div key={`${search.keyword}-${candidate.matchedTitle}-${candidate.price}`}>
                        {candidate.matchedTitle} / {candidate.price.toLocaleString()}円 / {candidate.priceKind} / confidence {candidate.confidenceScore.toFixed(2)}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function mergeResults(results: TestResult[]) {
  const firstError = results.find((result) => result.error);
  if (firstError) return firstError;
  return {
    httpStatus: results[0]?.httpStatus,
    searchUrl: results[0]?.searchUrl,
    searches: results.flatMap((result) => result.searches ?? [])
  };
}
