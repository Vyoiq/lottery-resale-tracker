import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { priorityLabelText, priorityTone } from "@/lib/priority";
import { priceStatusLabels, relativeCount, userVerdictLabels } from "@/lib/format";
import { Badge, Card, PageHeader, StatCard, secondaryButtonClass } from "@/components/ui";

export default async function ScoreTuningPage() {
  const [
    priorityGroups,
    verdictGroups,
    sWrongPriceCount,
    uncheckedPriceCount,
    foundListings,
    totalListings
  ] = await Promise.all([
    prisma.lotteryListing.groupBy({ by: ["applicationPriorityLabel"], _count: true }),
    prisma.lotteryListing.groupBy({ by: ["userVerdict"], where: { userVerdict: { not: null } }, _count: true }),
    prisma.lotteryListing.count({ where: { applicationPriorityLabel: "S", userVerdict: "wrong_price" } }),
    prisma.lotteryListing.count({ where: { priceStatus: "unchecked" } }),
    prisma.lotteryListing.findMany({
      where: { priceStatus: "found" },
      select: { id: true, priceRecords: { orderBy: [{ price: "desc" }, { confidenceScore: "desc" }], take: 1, select: { confidenceScore: true } } }
    }),
    prisma.lotteryListing.count()
  ]);

  const priorityCounts = Object.fromEntries(priorityGroups.map((item) => [item.applicationPriorityLabel, item._count]));
  const verdictCounts = Object.fromEntries(verdictGroups.map((item) => [item.userVerdict ?? "none", item._count]));
  const needsReviewPriceCount = foundListings.filter((listing) => (listing.priceRecords[0]?.confidenceScore ?? 0) < 0.7).length;

  return (
    <>
      <PageHeader title="スコア調整" description="応募優先度スコアとユーザー判定の偏りを見て、誤検出やしきい値の妥当性を確認します。">
        <Link href="/review" className={secondaryButtonClass}>誤検出レビューへ</Link>
      </PageHeader>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <StatCard label="総抽選数" value={relativeCount(totalListings)} />
        <StatCard label="Sなのに価格違い" value={relativeCount(sWrongPriceCount)} note="高優先スコアの価格誤検出" />
        <StatCard label="要確認価格" value={relativeCount(needsReviewPriceCount)} note="最高価格 confidenceScore < 0.70" />
        <StatCard label="価格未取得" value={relativeCount(uncheckedPriceCount)} note={priceStatusLabels.unchecked} />
        <StatCard label="フィードバック済み" value={relativeCount(Object.values(verdictCounts).reduce((sum, count) => sum + count, 0))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">S/A/B/C/D の件数</h2>
          <div className="space-y-3">
            {["S", "A", "B", "C", "D"].map((label) => (
              <div key={label} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <Badge tone={priorityTone(label) as "success" | "primary" | "warning" | "neutral" | "danger"}>{label}: {priorityLabelText(label)}</Badge>
                <Link className="font-semibold tabular-nums hover:text-primary" href={`/lotteries?sort=priority&q=&ignored=all&status=&priceStatus=&verdict=`}>
                  {relativeCount(priorityCounts[label] ?? 0)}
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold">userVerdict ごとの件数</h2>
          <div className="space-y-3">
            {Object.entries(userVerdictLabels).map(([verdict, label]) => (
              <div key={verdict} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <span className="text-sm">{label}</span>
                <Link className="font-semibold tabular-nums hover:text-primary" href={`/lotteries?verdict=${verdict}&ignored=all`}>
                  {relativeCount(verdictCounts[verdict] ?? 0)}
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <h2 className="mb-2 font-semibold">調整の見方</h2>
        <div className="grid gap-2 text-sm text-muted-foreground">
          <p>Sランクに `価格が違う` が増える場合は、価格 confidenceScore の加点を弱めるか、販売価格っぽい候補の減点を強めます。</p>
          <p>要確認価格が多い場合は、`/price-checker` で検索キーワードと除外理由を見て、商品名正規化や価格抽出の条件を調整します。</p>
          <p>価格未取得が多い場合は、PriceSource の検索URLテンプレート、対象サイトの公開ページ構造、アクセス頻度を確認します。</p>
        </div>
      </Card>
    </>
  );
}
