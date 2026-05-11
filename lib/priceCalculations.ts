export function calculatePriceMetrics(input: {
  retailPrice?: number | null;
  bestBuyPrice?: number | null;
  shippingCost?: number;
  fee?: number;
}) {
  const retailPrice = input.retailPrice ?? 0;
  const bestBuyPrice = input.bestBuyPrice ?? 0;
  const shippingCost = input.shippingCost ?? 0;
  const fee = input.fee ?? 0;

  if (retailPrice <= 0 || bestBuyPrice <= 0) {
    return {
      estimatedProfit: null,
      profitRate: null,
      roi: null,
      priceMultiplier: null
    };
  }

  const estimatedProfit = bestBuyPrice - retailPrice - shippingCost - fee;
  return {
    estimatedProfit,
    profitRate: (estimatedProfit / bestBuyPrice) * 100,
    roi: (estimatedProfit / retailPrice) * 100,
    priceMultiplier: bestBuyPrice / retailPrice
  };
}
