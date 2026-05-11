import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { applicationStatusLabels, dateOnly, percent, relativeCount, yen } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, secondaryButtonClass, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [allListings, soldListings] = await Promise.all([
    prisma.lotteryListing.findMany({
      select: {
        storeName: true,
        applicationStatus: true
      }
    }),
    prisma.lotteryListing.findMany({
      where: { applicationStatus: "sold" },
      orderBy: [{ soldAt: "desc" }],
      select: {
        id: true,
        productName: true,
        storeName: true,
        appliedAt: true,
        wonAt: true,
        purchasedAt: true,
        soldAt: true,
        purchasePrice: true,
        salePrice: true,
        shippingCost: true,
        fee: true,
        actualProfit: true,
        actualProfitRate: true,
        actualRoi: true,
        saleDestination: true,
        saleMemo: true
      }
    })
  ]);

  const appliedCount = allListings.filter((item) => ["applied", "won", "lost", "purchased", "sold"].includes(item.applicationStatus)).length;
  const wonCount = allListings.filter((item) => ["won", "purchased", "sold"].includes(item.applicationStatus)).length;
  const soldCount = soldListings.length;
  const totalProfit = sum(soldListings.map((item) => item.actualProfit));
  const averageProfit = soldCount > 0 ? totalProfit / soldCount : null;
  const averageRoi = average(soldListings.map((item) => item.actualRoi));
  const winRate = appliedCount > 0 ? (wonCount / appliedCount) * 100 : null;

  const monthlyProfit = Array.from(groupBy(soldListings, (item) => monthKey(item.soldAt)).entries())
    .map(([month, items]) => ({ month, count: items.length, profit: sum(items.map((item) => item.actualProfit)) }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const productRanking = soldListings
    .map((item) => ({ id: item.id, productName: item.productName, storeName: item.storeName, profit: item.actualProfit ?? 0, roi: item.actualRoi, soldAt: item.soldAt }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 20);

  const storeRows = Array.from(groupBy(allListings, (item) => item.storeName).entries())
    .map(([storeName, items]) => {
      const storeApplied = items.filter((item) => ["applied", "won", "lost", "purchased", "sold"].includes(item.applicationStatus)).length;
      const storeWon = items.filter((item) => ["won", "purchased", "sold"].includes(item.applicationStatus)).length;
      return { storeName, applied: storeApplied, won: storeWon, winRate: storeApplied > 0 ? (storeWon / storeApplied) * 100 : null };
    })
    .sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1));

  return (
    <>
      <PageHeader title="分析" description="応募結果と売却実績から、確定利益と当選率を確認します。">
        <a href="/api/export/sales" className={secondaryButtonClass}>売却履歴CSV</a>
      </PageHeader>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <StatCard label="応募数" value={`${relativeCount(appliedCount)}件`} />
        <StatCard label="当選数" value={`${relativeCount(wonCount)}件`} />
        <StatCard label="売却数" value={`${relativeCount(soldCount)}件`} />
        <StatCard label="平均利益" value={yen(averageProfit)} />
        <StatCard label="平均ROI" value={percent(averageRoi)} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="累計確定利益" value={yen(totalProfit)} />
        <StatCard label="当選率" value={percent(winRate)} />
        <StatCard label="売却済みステータス" value={applicationStatusLabels.sold} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-border p-4"><h2 className="font-semibold">月別確定利益</h2></div>
          {monthlyProfit.length === 0 ? <div className="p-4"><EmptyState message="売却履歴がありません。" /></div> : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr><th className="px-4 py-3">月</th><th className="px-4 py-3 text-right">売却数</th><th className="px-4 py-3 text-right">確定利益</th></tr>
              </thead>
              <tbody>{monthlyProfit.map((row) => (
                <tr key={row.month} className="border-t border-border"><td className="px-4 py-3">{row.month}</td><td className="px-4 py-3 text-right">{row.count}</td><td className="px-4 py-3 text-right font-semibold">{yen(row.profit)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border p-4"><h2 className="font-semibold">店舗別当選率</h2></div>
          {storeRows.length === 0 ? <div className="p-4"><EmptyState message="応募履歴がありません。" /></div> : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr><th className="px-4 py-3">店舗</th><th className="px-4 py-3 text-right">応募</th><th className="px-4 py-3 text-right">当選</th><th className="px-4 py-3 text-right">当選率</th></tr>
              </thead>
              <tbody>{storeRows.map((row) => (
                <tr key={row.storeName} className="border-t border-border"><td className="px-4 py-3">{row.storeName}</td><td className="px-4 py-3 text-right">{row.applied}</td><td className="px-4 py-3 text-right">{row.won}</td><td className="px-4 py-3 text-right">{percent(row.winRate)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-border p-4"><h2 className="font-semibold">商品別利益ランキング</h2></div>
        {productRanking.length === 0 ? <div className="p-4"><EmptyState message="売却履歴がありません。" /></div> : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">商品</th>
                <th className="px-4 py-3">店舗</th>
                <th className="px-4 py-3">売却日</th>
                <th className="px-4 py-3 text-right">実利益</th>
                <th className="px-4 py-3 text-right">実ROI</th>
              </tr>
            </thead>
            <tbody>{productRanking.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="max-w-md px-4 py-3 font-medium"><Link href={`/lotteries/${row.id}`} className="hover:text-primary">{row.productName}</Link></td>
                <td className="px-4 py-3">{row.storeName}</td>
                <td className="px-4 py-3">{dateOnly(row.soldAt)}</td>
                <td className="px-4 py-3 text-right font-semibold">{yen(row.profit)}</td>
                <td className="px-4 py-3 text-right"><Badge>{percent(row.roi)}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

function monthKey(value: Date | null) {
  if (!value) return "未設定";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sum(values: Array<number | null>): number {
  let total = 0;
  for (const value of values) total += value ?? 0;
  return total;
}

function average(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null);
  if (filtered.length === 0) return null;
  return filtered.reduce((total, value) => total + value, 0) / filtered.length;
}
