import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addManualPriceRecord,
  clearListingVerdict,
  ignoreLotteryListing,
  recordPurchase,
  recordSale,
  runPriceCheckForListingAction,
  setApplicationMilestone,
  setListingVerdict,
  unignoreLotteryListing,
  updateLotteryRetailPrice
} from "@/lib/actions";
import { userVerdicts } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { priorityLabelText, priorityTone } from "@/lib/priority";
import { applicationStatusLabels, dateOnly, dateTime, listingStatusLabels, multiple, percent, priceStatusLabels, userVerdictLabels, yen } from "@/lib/format";
import { Badge, buttonClass, Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass, textareaClass } from "@/components/ui";

function tone(status: string) {
  if (["active", "found", "good", "won", "purchased", "sold"].includes(status)) return "success";
  if (["error", "ignored", "wrong_price", "wrong_product", "duplicate", "lost"].includes(status)) return "danger";
  if (["low_interest", "expired", "applied", "skipped"].includes(status)) return "warning";
  return "neutral";
}

export default async function LotteryDetailPage({ params }: { params: { id: string } }) {
  const listing = await prisma.lotteryListing.findUnique({
    where: { id: params.id },
    include: { priceRecords: { orderBy: [{ price: "desc" }, { extractedAt: "desc" }] } }
  });
  if (!listing) notFound();

  const bestConfidence = listing.priceRecords[0]?.confidenceScore ?? 0;

  return (
    <>
      <PageHeader title="抽選詳細" description="抽選情報、応募状況、購入・売却実績、価格履歴を確認します。">
        <Link href="/lotteries" className={secondaryButtonClass}>一覧へ戻る</Link>
      </PageHeader>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">{listing.productName}</h2>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div><dt className="text-muted-foreground">店舗</dt><dd>{listing.storeName}</dd></div>
            <div><dt className="text-muted-foreground">抽選状態</dt><dd><Badge tone={tone(listing.status)}>{listingStatusLabels[listing.status]}</Badge></dd></div>
            <div><dt className="text-muted-foreground">応募状況</dt><dd><Badge tone={tone(listing.applicationStatus)}>{applicationStatusLabels[listing.applicationStatus]}</Badge></dd></div>
            <div><dt className="text-muted-foreground">応募締切</dt><dd>{dateOnly(listing.applicationEndAt)}</dd></div>
            <div><dt className="text-muted-foreground">応募日</dt><dd>{dateTime(listing.appliedAt)}</dd></div>
            <div><dt className="text-muted-foreground">当選日</dt><dd>{dateTime(listing.wonAt)}</dd></div>
            <div><dt className="text-muted-foreground">落選日</dt><dd>{dateTime(listing.lostAt)}</dd></div>
            <div><dt className="text-muted-foreground">購入日</dt><dd>{dateTime(listing.purchasedAt)}</dd></div>
            <div><dt className="text-muted-foreground">売却日</dt><dd>{dateTime(listing.soldAt)}</dd></div>
            <div><dt className="text-muted-foreground">検出日時</dt><dd>{dateTime(listing.detectedAt)}</dd></div>
            <div><dt className="text-muted-foreground">最終確認</dt><dd>{dateTime(listing.lastSeenAt)}</dd></div>
            <div>
              <dt className="text-muted-foreground">応募優先度</dt>
              <dd>
                <Badge tone={priorityTone(listing.applicationPriorityLabel) as "success" | "primary" | "warning" | "neutral" | "danger"}>
                  {listing.applicationPriorityLabel}: {priorityLabelText(listing.applicationPriorityLabel)} ({listing.applicationPriorityScore})
                </Badge>
              </dd>
            </div>
            <div><dt className="text-muted-foreground">ユーザー判定</dt><dd>{listing.userVerdict ? <Badge tone={tone(listing.userVerdict)}>{userVerdictLabels[listing.userVerdict]}</Badge> : "未判定"}</dd></div>
            <div className="md:col-span-2"><dt className="text-muted-foreground">URL</dt><dd><a className="text-primary" href={listing.lotteryUrl} target="_blank">{listing.lotteryUrl}</a></dd></div>
            <div className="md:col-span-2"><dt className="text-muted-foreground">検出理由</dt><dd>{listing.confidenceReason ?? "-"} / {listing.matchedKeywords ?? "-"}</dd></div>
            <div className="md:col-span-2"><dt className="text-muted-foreground">説明</dt><dd>{listing.description ?? "-"}</dd></div>
          </dl>

          <div className="mt-4 grid gap-3">
            <ApplicationButtons listingId={listing.id} />
            <VerdictForm listingId={listing.id} />
            {listing.ignored ? (
              <form action={unignoreLotteryListing}>
                <input type="hidden" name="id" value={listing.id} />
                <button className={secondaryButtonClass} type="submit">無視解除</button>
              </form>
            ) : (
              <form action={ignoreLotteryListing} className="flex gap-2">
                <input type="hidden" name="id" value={listing.id} />
                <input className={inputClass} name="ignoredReason" placeholder="無視理由" />
                <button className="h-10 rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50" type="submit">無視</button>
              </form>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">利益計算</h2>
            <form action={runPriceCheckForListingAction}>
              <input type="hidden" name="id" value={listing.id} />
              <button className={buttonClass} type="submit">価格チェック</button>
            </form>
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">価格状態</dt><dd><Badge tone={tone(listing.priceStatus)}>{priceStatusLabels[listing.priceStatus]}</Badge></dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">最高価格信頼度</dt><dd>{bestConfidence.toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">定価</dt><dd>{yen(listing.retailPrice)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">最高買取価格</dt><dd>{yen(listing.bestBuyPrice)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">想定利益</dt><dd className="font-semibold">{yen(listing.estimatedProfit)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">想定ROI</dt><dd>{percent(listing.roi)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">倍率</dt><dd>{multiple(listing.priceMultiplier)}</dd></div>
            <div className="border-t border-border pt-3 flex justify-between"><dt className="text-muted-foreground">購入価格</dt><dd>{yen(listing.purchasePrice)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">売却価格</dt><dd>{yen(listing.salePrice)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">送料/手数料</dt><dd>{yen(listing.shippingCost)} / {yen(listing.fee)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">実利益</dt><dd className="font-semibold">{yen(listing.actualProfit)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">実利益率</dt><dd>{percent(listing.actualProfitRate)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">実ROI</dt><dd>{percent(listing.actualRoi)}</dd></div>
          </dl>

          <form action={updateLotteryRetailPrice} className="mt-4 grid gap-2">
            <input type="hidden" name="id" value={listing.id} />
            <Field label="定価を修正">
              <input className={inputClass} name="retailPrice" type="number" min="0" defaultValue={listing.retailPrice ?? ""} />
            </Field>
            <button className={secondaryButtonClass} type="submit">定価を保存</button>
          </form>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">購入記録</h2>
          <form action={recordPurchase} className="grid gap-3">
            <input type="hidden" name="id" value={listing.id} />
            <Field label="購入価格"><input className={inputClass} name="purchasePrice" type="number" min="0" defaultValue={listing.purchasePrice ?? listing.retailPrice ?? ""} required /></Field>
            <Field label="購入メモ"><textarea className={textareaClass} name="purchaseMemo" defaultValue={listing.purchaseMemo ?? ""} /></Field>
            <button className={buttonClass} type="submit">購入した</button>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold">売却記録</h2>
          <form action={recordSale} className="grid gap-3">
            <input type="hidden" name="id" value={listing.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="購入価格"><input className={inputClass} name="purchasePrice" type="number" min="0" defaultValue={listing.purchasePrice ?? listing.retailPrice ?? ""} required /></Field>
              <Field label="売却価格"><input className={inputClass} name="salePrice" type="number" min="0" defaultValue={listing.salePrice ?? ""} required /></Field>
              <Field label="送料"><input className={inputClass} name="shippingCost" type="number" min="0" defaultValue={listing.shippingCost ?? 0} /></Field>
              <Field label="手数料"><input className={inputClass} name="fee" type="number" min="0" defaultValue={listing.fee ?? 0} /></Field>
            </div>
            <Field label="売却先"><input className={inputClass} name="saleDestination" defaultValue={listing.saleDestination ?? ""} /></Field>
            <Field label="売却メモ"><textarea className={textareaClass} name="saleMemo" defaultValue={listing.saleMemo ?? ""} /></Field>
            <button className={buttonClass} type="submit">売却した</button>
          </form>
        </Card>
      </div>

      <Card className="mb-6 p-4">
        <h2 className="mb-3 font-semibold">手入力で価格修正</h2>
        <form action={addManualPriceRecord} className="grid gap-4 md:grid-cols-5">
          <input type="hidden" name="lotteryListingId" value={listing.id} />
          <Field label="買取店"><input className={inputClass} name="shopName" defaultValue="手入力" required /></Field>
          <Field label="買取価格"><input className={inputClass} name="price" type="number" min="0" required /></Field>
          <Field label="URL"><input className={inputClass} name="sourceUrl" type="url" defaultValue={listing.lotteryUrl} /></Field>
          <Field label="一致タイトル"><input className={inputClass} name="matchedTitle" defaultValue={listing.productName} /></Field>
          <div className="flex items-end"><button className={buttonClass} type="submit">価格を追加</button></div>
          <div className="md:col-span-5">
            <Field label="メモ/rawText"><textarea className={textareaClass} name="rawText" /></Field>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4"><h2 className="font-semibold">価格履歴</h2></div>
        {listing.priceRecords.length === 0 ? (
          <div className="p-4"><EmptyState message="価格履歴がありません。" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">買取店</th>
                <th className="px-4 py-3 text-right">価格</th>
                <th className="px-4 py-3">一致タイトル</th>
                <th className="px-4 py-3">信頼度</th>
                <th className="px-4 py-3">取得日時</th>
                <th className="px-4 py-3">URL</th>
              </tr>
            </thead>
            <tbody>
              {listing.priceRecords.map((record) => (
                <tr key={record.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">{record.shopName}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{yen(record.price)}</td>
                  <td className="max-w-md px-4 py-3">{record.matchedTitle}<div className="text-xs text-muted-foreground">{record.rawText?.slice(0, 160)}</div></td>
                  <td className="px-4 py-3 tabular-nums">{record.confidenceScore.toFixed(2)}</td>
                  <td className="px-4 py-3">{dateTime(record.extractedAt)}</td>
                  <td className="px-4 py-3"><a className="text-primary" href={record.sourceUrl} target="_blank">開く</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function ApplicationButtons({ listingId }: { listingId: string }) {
  const actions = [
    ["applied", "応募した"],
    ["won", "当選した"],
    ["lost", "落選した"],
    ["skipped", "スキップした"]
  ];
  return (
    <Card className="bg-muted/20 p-3">
      <div className="mb-2 text-sm font-semibold">応募状況</div>
      <div className="flex flex-wrap gap-2">
        {actions.map(([value, label]) => (
          <form key={value} action={setApplicationMilestone}>
            <input type="hidden" name="id" value={listingId} />
            <input type="hidden" name="applicationStatus" value={value} />
            <button className={secondaryButtonClass} type="submit">{label}</button>
          </form>
        ))}
      </div>
    </Card>
  );
}

function VerdictForm({ listingId }: { listingId: string }) {
  const buttons = userVerdicts.filter((item) => item !== "other");

  return (
    <Card className="bg-muted/20 p-3">
      <div className="mb-2 text-sm font-semibold">判定フィードバック</div>
      <form action={setListingVerdict} className="grid gap-2">
        <input type="hidden" name="id" value={listingId} />
        <div className="flex flex-wrap gap-2">
          {buttons.map((verdict) => (
            <button key={verdict} className={secondaryButtonClass} name="userVerdict" value={verdict} type="submit">
              {userVerdictLabels[verdict]}
            </button>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-[160px_1fr_auto]">
          <select className={inputClass} name="userVerdict" defaultValue="other">
            {userVerdicts.map((verdict) => <option key={verdict} value={verdict}>{userVerdictLabels[verdict]}</option>)}
          </select>
          <input className={inputClass} name="userVerdictMemo" placeholder="判定メモ" />
          <button className={buttonClass} type="submit">メモ付きで保存</button>
        </div>
      </form>
      <form action={clearListingVerdict} className="mt-2">
        <input type="hidden" name="id" value={listingId} />
        <button className="text-xs font-medium text-muted-foreground hover:text-foreground" type="submit">判定をクリア</button>
      </form>
    </Card>
  );
}
