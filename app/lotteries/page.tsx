import Link from "next/link";
import { clearListingVerdict, ignoreLotteryListing, runCollectorsAction, runPriceCollectorsAction, setListingVerdict, unignoreLotteryListing } from "@/lib/actions";
import { applicationStatuses, listingStatuses, userVerdicts } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { priorityLabelText, priorityTone } from "@/lib/priority";
import { applicationStatusLabels, dateOnly, listingStatusLabels, multiple, percent, priceStatusLabels, userVerdictLabels, yen } from "@/lib/format";
import { Badge, buttonClass, Card, dangerButtonClass, EmptyState, inputClass, PageHeader, secondaryButtonClass, smallButtonClass } from "@/components/ui";

function tone(status: string) {
  if (["active", "found", "good", "sold", "won", "purchased"].includes(status)) return "success";
  if (["ended", "unchecked", "not_found", "not_applied"].includes(status)) return "neutral";
  if (["ignored", "error", "wrong_price", "wrong_product", "duplicate", "lost"].includes(status)) return "danger";
  return "warning";
}

function priceConfidenceLabel(score: number, priceStatus: string) {
  if (priceStatus !== "found") return "-";
  return score >= 0.7 ? "高信頼価格" : "要確認価格";
}

export default async function LotteriesPage({
  searchParams
}: {
  searchParams: {
    q?: string;
    productName?: string;
    storeName?: string;
    status?: string;
    priceStatus?: string;
    applicationStatus?: string;
    sort?: string;
    ignored?: string;
    verdict?: string;
  };
}) {
  const q = searchParams.q?.trim() ?? "";
  const productName = searchParams.productName?.trim() ?? "";
  const storeName = searchParams.storeName?.trim() ?? "";
  const status = searchParams.status?.trim() ?? "";
  const priceStatus = searchParams.priceStatus?.trim() ?? "";
  const applicationStatus = searchParams.applicationStatus?.trim() ?? "";
  const ignored = searchParams.ignored ?? "false";
  const verdict = searchParams.verdict?.trim() ?? "";
  const sort = searchParams.sort ?? "priority";

  const listings = await prisma.lotteryListing.findMany({
    where: {
      AND: [
        ignored === "all" ? {} : { ignored: ignored === "true" },
        status ? { status } : {},
        priceStatus ? { priceStatus } : {},
        applicationStatus ? { applicationStatus } : {},
        verdict ? { userVerdict: verdict } : {},
        productName ? { productName: { contains: productName } } : {},
        storeName ? { storeName: { contains: storeName } } : {},
        q
          ? { OR: [{ title: { contains: q } }, { productName: { contains: q } }, { storeName: { contains: q } }, { description: { contains: q } }, { rawText: { contains: q } }] }
          : {}
      ]
    },
    orderBy:
      sort === "deadline"
        ? [{ applicationEndAt: "asc" }, { detectedAt: "desc" }]
        : sort === "new"
          ? [{ detectedAt: "desc" }]
          : sort === "profit"
            ? [{ estimatedProfit: "desc" }, { applicationPriorityScore: "desc" }]
            : sort === "roi"
              ? [{ roi: "desc" }, { applicationPriorityScore: "desc" }]
              : sort === "actualProfit"
                ? [{ actualProfit: "desc" }, { soldAt: "desc" }]
                : sort === "actualRoi"
                  ? [{ actualRoi: "desc" }, { soldAt: "desc" }]
                  : [{ applicationPriorityScore: "desc" }, { estimatedProfit: "desc" }],
    take: 200,
    include: { priceRecords: { orderBy: [{ price: "desc" }, { confidenceScore: "desc" }], take: 1 } }
  });

  return (
    <>
      <PageHeader title="抽選一覧" description="抽選情報、価格候補、応募状況、購入・売却実績を一覧で確認します。">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <form action={runCollectorsAction}><button className={buttonClass} type="submit">抽選情報を更新</button></form>
          <form action={runPriceCollectorsAction}><button className={secondaryButtonClass} type="submit">買取価格を更新</button></form>
        </div>
      </PageHeader>

      <Card className="mb-4 p-4">
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_150px_150px_130px_130px_140px_130px_130px_150px_auto]">
          <input className={inputClass} name="q" defaultValue={q} placeholder="キーワード検索" />
          <input className={inputClass} name="productName" defaultValue={productName} placeholder="商品名" />
          <input className={inputClass} name="storeName" defaultValue={storeName} placeholder="店舗名" />
          <select className={inputClass} name="status" defaultValue={status}>
            <option value="">抽選状態すべて</option>
            {listingStatuses.map((item) => <option key={item} value={item}>{listingStatusLabels[item]}</option>)}
          </select>
          <select className={inputClass} name="priceStatus" defaultValue={priceStatus}>
            <option value="">価格すべて</option>
            {Object.entries(priceStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className={inputClass} name="applicationStatus" defaultValue={applicationStatus}>
            <option value="">応募状況すべて</option>
            {applicationStatuses.map((item) => <option key={item} value={item}>{applicationStatusLabels[item]}</option>)}
          </select>
          <select className={inputClass} name="ignored" defaultValue={ignored}>
            <option value="false">無視を除く</option>
            <option value="true">無視のみ</option>
            <option value="all">すべて</option>
          </select>
          <select className={inputClass} name="verdict" defaultValue={verdict}>
            <option value="">判定すべて</option>
            {userVerdicts.map((item) => <option key={item} value={item}>{userVerdictLabels[item]}</option>)}
          </select>
          <select className={inputClass} name="sort" defaultValue={sort}>
            <option value="priority">応募優先度順</option>
            <option value="profit">想定利益順</option>
            <option value="roi">想定ROI順</option>
            <option value="actualProfit">実利益順</option>
            <option value="actualRoi">実ROI順</option>
            <option value="deadline">締切が近い順</option>
            <option value="new">新着順</option>
          </select>
          <button className={secondaryButtonClass} type="submit">絞り込み</button>
        </form>
      </Card>

      {listings.length === 0 ? (
        <EmptyState message="抽選情報がありません。" />
      ) : (
        <>
        <div className="grid gap-3 md:hidden">
          {listings.map((listing) => {
            const priceConfidence = listing.priceRecords[0]?.confidenceScore ?? 0;
            return <LotteryMobileCard key={listing.id} listing={listing} priceConfidence={priceConfidence} />;
          })}
        </div>
        <Card className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">商品</th>
                <th className="px-4 py-3">締切</th>
                <th className="px-4 py-3">応募状況</th>
                <th className="px-4 py-3 text-right">定価/最高買取</th>
                <th className="px-4 py-3 text-right">想定利益</th>
                <th className="px-4 py-3 text-right">実利益</th>
                <th className="px-4 py-3 text-right">実ROI</th>
                <th className="px-4 py-3">価格</th>
                <th className="px-4 py-3">優先度</th>
                <th className="px-4 py-3">判定</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => {
                const priceConfidence = listing.priceRecords[0]?.confidenceScore ?? 0;
                return (
                  <tr key={listing.id} className="border-t border-border align-top">
                    <td className="max-w-sm px-4 py-3 font-medium">
                      <Link href={`/lotteries/${listing.id}`} className="hover:text-primary">{listing.productName}</Link>
                      <div className="mt-1 text-xs text-muted-foreground">{listing.storeName} / {listing.title}</div>
                      {listing.ignored ? <div className="mt-1 text-xs text-rose-700">無視: {listing.ignoredReason ?? "-"}</div> : null}
                    </td>
                    <td className="px-4 py-3">{dateOnly(listing.applicationEndAt)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={tone(listing.applicationStatus)}>{applicationStatusLabels[listing.applicationStatus]}</Badge>
                      {listing.applicationStatus === "sold" ? <div className="mt-1 text-xs text-emerald-700">売却済み</div> : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div>{yen(listing.retailPrice)}</div>
                      <div className="text-xs text-muted-foreground">{yen(listing.bestBuyPrice)}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="font-semibold">{yen(listing.estimatedProfit)}</div>
                      <div className="text-xs text-muted-foreground">{percent(listing.roi)} / {multiple(listing.priceMultiplier)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{yen(listing.actualProfit)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{percent(listing.actualRoi)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={tone(listing.priceStatus)}>{priceStatusLabels[listing.priceStatus]}</Badge>
                      {listing.priceStatus === "found" ? <div className="mt-1"><Badge tone={priceConfidence >= 0.7 ? "success" : "warning"}>{priceConfidenceLabel(priceConfidence, listing.priceStatus)}</Badge></div> : null}
                      <div className="mt-1 text-xs text-muted-foreground">信頼度 {priceConfidence.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={priorityTone(listing.applicationPriorityLabel) as "success" | "primary" | "warning" | "neutral" | "danger"}>
                        {listing.applicationPriorityLabel}: {priorityLabelText(listing.applicationPriorityLabel)} ({listing.applicationPriorityScore})
                      </Badge>
                    </td>
                    <td className="min-w-56 px-4 py-3">
                      {listing.userVerdict ? (
                        <div className="mb-2">
                          <Badge tone={tone(listing.userVerdict)}>{userVerdictLabels[listing.userVerdict]}</Badge>
                          <div className="mt-1 text-xs text-muted-foreground">{listing.userVerdictMemo ?? ""}</div>
                        </div>
                      ) : <div className="mb-2 text-xs text-muted-foreground">未判定</div>}
                      <VerdictButtons listingId={listing.id} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/lotteries/${listing.id}`} className={secondaryButtonClass}>詳細</Link>
                        {listing.ignored ? (
                          <form action={unignoreLotteryListing}><input type="hidden" name="id" value={listing.id} /><button className={secondaryButtonClass} type="submit">無視解除</button></form>
                        ) : (
                        <form action={ignoreLotteryListing} className="flex gap-2">
                          <input type="hidden" name="id" value={listing.id} />
                          <input className="h-10 w-28 rounded-md border border-border px-2 text-xs" name="ignoredReason" placeholder="理由" />
                            <button className={dangerButtonClass} type="submit">無視</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        </>
      )}
    </>
  );
}

function LotteryMobileCard({
  listing,
  priceConfidence
}: {
  listing: Awaited<ReturnType<typeof prisma.lotteryListing.findMany>>[number] & { priceRecords: { confidenceScore: number }[] };
  priceConfidence: number;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/lotteries/${listing.id}`} className="font-semibold leading-6 hover:text-primary">{listing.productName}</Link>
          <div className="mt-1 text-xs text-muted-foreground">{listing.storeName}</div>
        </div>
        <PriorityBadge label={listing.applicationPriorityLabel} score={listing.applicationPriorityScore} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <MobileMetric label="締切" value={dateOnly(listing.applicationEndAt)} />
        <MobileMetric label="応募状況" value={<Badge tone={tone(listing.applicationStatus)}>{applicationStatusLabels[listing.applicationStatus]}</Badge>} />
        <MobileMetric label="定価" value={yen(listing.retailPrice)} />
        <MobileMetric label="最高買取" value={yen(listing.bestBuyPrice)} strong />
        <MobileMetric label="想定利益" value={yen(listing.estimatedProfit)} strong tone="success" />
        <MobileMetric label="ROI / 倍率" value={`${percent(listing.roi)} / ${multiple(listing.priceMultiplier)}`} strong />
        <MobileMetric label="実利益" value={yen(listing.actualProfit)} strong />
        <MobileMetric label="実ROI" value={percent(listing.actualRoi)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={tone(listing.priceStatus)}>{priceStatusLabels[listing.priceStatus]}</Badge>
        {listing.priceStatus === "found" ? <Badge tone={priceConfidence >= 0.7 ? "success" : "warning"}>{priceConfidenceLabel(priceConfidence, listing.priceStatus)}</Badge> : null}
        <span className="text-xs text-muted-foreground">信頼度 {priceConfidence.toFixed(2)}</span>
        {listing.userVerdict ? <Badge tone={tone(listing.userVerdict)}>{userVerdictLabels[listing.userVerdict]}</Badge> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/lotteries/${listing.id}`} className={secondaryButtonClass}>詳細</Link>
        {listing.ignored ? (
          <form action={unignoreLotteryListing}><input type="hidden" name="id" value={listing.id} /><button className={secondaryButtonClass} type="submit">無視解除</button></form>
        ) : (
          <form action={ignoreLotteryListing} className="flex min-w-0 flex-1 gap-2">
            <input type="hidden" name="id" value={listing.id} />
            <input className="h-10 min-w-0 flex-1 rounded-md border border-border px-2 text-xs" name="ignoredReason" placeholder="無視理由" />
            <button className={dangerButtonClass} type="submit">無視</button>
          </form>
        )}
      </div>

      <div className="mt-3">
        <VerdictButtons listingId={listing.id} />
      </div>
    </Card>
  );
}

function MobileMetric({
  label,
  value,
  strong,
  tone
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
  tone?: "success";
}) {
  return (
    <div className="rounded-md bg-muted/45 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words tabular-nums ${strong ? "font-semibold" : ""} ${tone === "success" ? "text-emerald-700" : ""}`}>{value}</div>
    </div>
  );
}

function PriorityBadge({ label, score }: { label: string; score: number }) {
  const toneName = priorityTone(label) as "success" | "primary" | "warning" | "neutral" | "danger";
  const emphasis = label === "S" || label === "A" ? "text-sm" : "";
  return <Badge tone={toneName}><span className={emphasis}>{label}: {priorityLabelText(label)} ({score})</span></Badge>;
}

function VerdictButtons({ listingId }: { listingId: string }) {
  const verdicts = [
    ["good", "良い"],
    ["wrong_price", "価格違い"],
    ["wrong_product", "商品違い"],
    ["low_interest", "興味なし"],
    ["expired", "期限切れ"],
    ["duplicate", "重複"]
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {verdicts.map(([value, label]) => (
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
