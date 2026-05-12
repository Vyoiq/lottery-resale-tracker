import Link from "next/link";
import { clearListingVerdict, setListingVerdict } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { priorityLabelText, priorityTone } from "@/lib/priority";
import { dateOnly, multiple, percent, userVerdictLabels, yen } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, secondaryButtonClass, smallButtonClass } from "@/components/ui";

type ReviewListing = {
  id: string;
  productName: string;
  storeName: string;
  applicationEndAt: Date | null;
  bestBuyPrice: number | null;
  retailPrice: number | null;
  estimatedProfit: number | null;
  roi: number | null;
  priceMultiplier: number | null;
  priceStatus: string;
  confidenceScore: number;
  applicationPriorityScore: number;
  applicationPriorityLabel: string;
  userVerdict: string | null;
  userVerdictMemo: string | null;
  priceRecords: { confidenceScore: number }[];
};

const listingSelect = {
  id: true,
  productName: true,
  storeName: true,
  applicationEndAt: true,
  bestBuyPrice: true,
  retailPrice: true,
  estimatedProfit: true,
  roi: true,
  priceMultiplier: true,
  priceStatus: true,
  confidenceScore: true,
  applicationPriorityScore: true,
  applicationPriorityLabel: true,
  userVerdict: true,
  userVerdictMemo: true,
  priceRecords: {
    orderBy: [{ price: "desc" as const }, { confidenceScore: "desc" as const }],
    take: 1,
    select: { confidenceScore: true }
  }
};

export default async function ReviewPage() {
  const [sRank, foundPriceListings, lowListingConfidence, tooHighPrice, shortProductName] = await Promise.all([
    prisma.lotteryListing.findMany({
      where: { applicationPriorityLabel: "S", ignored: false },
      orderBy: [{ applicationPriorityScore: "desc" }, { estimatedProfit: "desc" }],
      take: 20,
      select: listingSelect
    }),
    prisma.lotteryListing.findMany({
      where: { priceStatus: "found", ignored: false },
      orderBy: [{ applicationPriorityScore: "desc" }, { estimatedProfit: "desc" }],
      take: 100,
      select: listingSelect
    }),
    prisma.lotteryListing.findMany({
      where: { confidenceScore: { lt: 0.4 }, ignored: false },
      orderBy: [{ applicationPriorityScore: "desc" }, { detectedAt: "desc" }],
      take: 20,
      select: listingSelect
    }),
    prisma.lotteryListing.findMany({
      where: {
        ignored: false,
        OR: [{ priceMultiplier: { gte: 20 } }, { bestBuyPrice: { gte: 100000 } }]
      },
      orderBy: [{ priceMultiplier: "desc" }, { bestBuyPrice: "desc" }],
      take: 20,
      select: listingSelect
    }),
    prisma.lotteryListing.findMany({
      where: { ignored: false },
      orderBy: [{ applicationPriorityScore: "desc" }, { detectedAt: "desc" }],
      take: 100,
      select: listingSelect
    })
  ]);

  const needsReviewPrice = foundPriceListings.filter((listing) => topPriceConfidence(listing) < 0.7).slice(0, 20);
  const shortNameListings = shortProductName.filter((listing) => listing.productName.trim().length < 8).slice(0, 20);

  return (
    <>
      <PageHeader title="誤検出レビュー" description="応募前に確認したい高リスク候補をまとめて確認します。">
        <Link href="/settings/score-tuning" className={secondaryButtonClass}>スコア調整へ</Link>
      </PageHeader>

      <div className="grid gap-5">
        <ReviewSection title="Sランク候補" description="応募優先度が最も高い候補です。価格と商品一致を応募前に確認してください。" listings={sRank} />
        <ReviewSection title="要確認価格" description="価格は取得済みですが、最高価格の confidenceScore が 0.70 未満です。" listings={needsReviewPrice} />
        <ReviewSection title="confidenceScore が低い候補" description="抽選情報そのものの検出信頼度が低い候補です。" listings={lowListingConfidence} />
        <ReviewSection title="価格が高すぎる候補" description="倍率が20倍以上、または最高買取価格が10万円以上の候補です。誤検出の可能性があります。" listings={tooHighPrice} />
        <ReviewSection title="商品名が短すぎる候補" description="商品名が短く、別商品と混ざりやすい候補です。" listings={shortNameListings} />
      </div>
    </>
  );
}

function ReviewSection({ title, description, listings }: { title: string; description: string; listings: ReviewListing[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <Badge>{listings.length}件</Badge>
        </div>
      </div>
      {listings.length === 0 ? (
        <div className="p-4"><EmptyState message="該当する候補はありません。" /></div>
      ) : (
        <>
        <div className="grid gap-3 p-4 md:hidden">
          {listings.map((listing) => (
            <ReviewCard key={listing.id} listing={listing} />
          ))}
        </div>
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">商品</th>
              <th className="px-4 py-3">締切</th>
              <th className="px-4 py-3 text-right">価格/利益</th>
              <th className="px-4 py-3">優先度</th>
              <th className="px-4 py-3">信頼度</th>
              <th className="px-4 py-3">判定</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id} className="border-t border-border align-top">
                <td className="max-w-md px-4 py-3">
                  <Link href={`/lotteries/${listing.id}`} className="font-medium hover:text-primary">{listing.productName}</Link>
                  <div className="mt-1 text-xs text-muted-foreground">{listing.storeName}</div>
                </td>
                <td className="px-4 py-3">{dateOnly(listing.applicationEndAt)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <div>{yen(listing.bestBuyPrice)} / {yen(listing.estimatedProfit)}</div>
                  <div className="text-xs text-muted-foreground">{percent(listing.roi)} / {multiple(listing.priceMultiplier)}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={priorityTone(listing.applicationPriorityLabel) as "success" | "primary" | "warning" | "neutral" | "danger"}>
                    {listing.applicationPriorityLabel}: {priorityLabelText(listing.applicationPriorityLabel)} ({listing.applicationPriorityScore})
                  </Badge>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  <div>抽選 {listing.confidenceScore.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">価格 {topPriceConfidence(listing).toFixed(2)}</div>
                </td>
                <td className="min-w-56 px-4 py-3">
                  {listing.userVerdict ? <Badge>{userVerdictLabels[listing.userVerdict]}</Badge> : <span className="text-xs text-muted-foreground">未判定</span>}
                  {listing.userVerdictMemo ? <div className="mt-1 text-xs text-muted-foreground">{listing.userVerdictMemo}</div> : null}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      ["good", "良い"],
                      ["wrong_price", "価格違い"],
                      ["wrong_product", "商品違い"],
                      ["low_interest", "興味なし"],
                      ["expired", "期限切れ"],
                      ["duplicate", "重複"]
                    ].map(([value, label]) => (
                      <form key={value} action={setListingVerdict}>
                        <input type="hidden" name="id" value={listing.id} />
                        <input type="hidden" name="userVerdict" value={value} />
                        <button className={smallButtonClass} type="submit">{label}</button>
                      </form>
                    ))}
                    <form action={clearListingVerdict}>
                      <input type="hidden" name="id" value={listing.id} />
                      <button className={smallButtonClass} type="submit">クリア</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
    </Card>
  );
}

function ReviewCard({ listing }: { listing: ReviewListing }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/lotteries/${listing.id}`} className="font-semibold leading-6 hover:text-primary">{listing.productName}</Link>
          <div className="mt-1 text-xs text-muted-foreground">{listing.storeName} / 締切 {dateOnly(listing.applicationEndAt)}</div>
        </div>
        <Badge tone={priorityTone(listing.applicationPriorityLabel) as "success" | "primary" | "warning" | "neutral" | "danger"}>
          {listing.applicationPriorityLabel}: {priorityLabelText(listing.applicationPriorityLabel)}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Metric label="買取価格" value={yen(listing.bestBuyPrice)} strong />
        <Metric label="想定利益" value={yen(listing.estimatedProfit)} strong tone="success" />
        <Metric label="ROI / 倍率" value={`${percent(listing.roi)} / ${multiple(listing.priceMultiplier)}`} />
        <Metric label="信頼度" value={`抽選 ${listing.confidenceScore.toFixed(2)} / 価格 ${topPriceConfidence(listing).toFixed(2)}`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {listing.userVerdict ? <Badge>{userVerdictLabels[listing.userVerdict]}</Badge> : <span className="text-xs text-muted-foreground">未判定</span>}
      </div>
      <VerdictButtons listingId={listing.id} />
    </div>
  );
}

function Metric({ label, value, strong, tone }: { label: string; value: React.ReactNode; strong?: boolean; tone?: "success" }) {
  return (
    <div className="rounded bg-muted/50 p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words tabular-nums ${strong ? "font-semibold" : ""} ${tone === "success" ? "text-emerald-700" : ""}`}>{value}</div>
    </div>
  );
}

function VerdictButtons({ listingId }: { listingId: string }) {
  const buttons = [
    ["good", "良い"],
    ["wrong_price", "価格違い"],
    ["wrong_product", "商品違い"],
    ["low_interest", "興味なし"],
    ["expired", "期限切れ"],
    ["duplicate", "重複"]
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {buttons.map(([value, label]) => (
        <form key={value} action={setListingVerdict}>
          <input type="hidden" name="id" value={listingId} />
          <input type="hidden" name="userVerdict" value={value} />
          <button className={smallButtonClass} type="submit">{label}</button>
        </form>
      ))}
      <form action={clearListingVerdict}>
        <input type="hidden" name="id" value={listingId} />
        <button className={smallButtonClass} type="submit">クリア</button>
      </form>
    </div>
  );
}

function topPriceConfidence(listing: Pick<ReviewListing, "priceRecords">) {
  return listing.priceRecords[0]?.confidenceScore ?? 0;
}
