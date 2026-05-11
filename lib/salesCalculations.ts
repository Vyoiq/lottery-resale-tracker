export function calculateActualSaleMetrics(input: {
  purchasePrice?: number | null;
  salePrice?: number | null;
  shippingCost?: number | null;
  fee?: number | null;
}) {
  const purchasePrice = input.purchasePrice ?? 0;
  const salePrice = input.salePrice ?? 0;
  const shippingCost = input.shippingCost ?? 0;
  const fee = input.fee ?? 0;

  if (purchasePrice <= 0 || salePrice <= 0) {
    return {
      actualProfit: null,
      actualProfitRate: null,
      actualRoi: null
    };
  }

  const actualProfit = salePrice - purchasePrice - shippingCost - fee;

  return {
    actualProfit,
    actualProfitRate: round1((actualProfit / salePrice) * 100),
    actualRoi: round1((actualProfit / purchasePrice) * 100)
  };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
