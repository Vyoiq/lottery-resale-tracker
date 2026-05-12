import Link from "next/link";
import { generateNotificationsAction, markAllNotificationsRead, markNotificationRead } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { dateTime, notificationSeverityLabels, notificationTypeLabels } from "@/lib/format";
import { Badge, buttonClass, Card, EmptyState, inputClass, PageHeader, secondaryButtonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

function severityTone(severity: string) {
  if (severity === "important") return "danger";
  if (severity === "warning") return "warning";
  return "neutral";
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: { unread?: string; severity?: string };
}) {
  const unread = searchParams.unread ?? "";
  const severity = searchParams.severity ?? "";
  const notifications = await prisma.notification.findMany({
    where: {
      ...(unread === "true" ? { read: false } : {}),
      ...(severity ? { severity } : {})
    },
    include: {
      lotteryListing: {
        select: {
          id: true,
          productName: true,
          storeName: true,
          applicationEndAt: true,
          applicationPriorityLabel: true
        }
      }
    },
    orderBy: [{ read: "asc" }, { severity: "asc" }, { createdAt: "desc" }],
    take: 200
  });

  return (
    <>
      <PageHeader title="通知" description="抽選情報、価格情報、応募状況から生成されたアプリ内通知を確認します。">
        <div className="flex flex-wrap gap-2">
          <form action={generateNotificationsAction}>
            <button className={buttonClass} type="submit">通知を更新</button>
          </form>
          <form action={markAllNotificationsRead}>
            <button className={secondaryButtonClass} type="submit">全て既読にする</button>
          </form>
        </div>
      </PageHeader>

      <Card className="mb-4 p-4">
        <form className="grid gap-3 md:grid-cols-[180px_180px_auto]">
          <select className={inputClass} name="unread" defaultValue={unread}>
            <option value="">全て表示</option>
            <option value="true">未読のみ</option>
          </select>
          <select className={inputClass} name="severity" defaultValue={severity}>
            <option value="">重要度すべて</option>
            <option value="important">重要</option>
            <option value="warning">注意</option>
            <option value="info">通常</option>
          </select>
          <button className={secondaryButtonClass} type="submit">絞り込み</button>
        </form>
      </Card>

      {notifications.length === 0 ? (
        <EmptyState message="通知はありません。" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">重要度</th>
                <th className="px-4 py-3">通知</th>
                <th className="px-4 py-3">関連商品</th>
                <th className="px-4 py-3">作成日時</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <Badge tone={severityTone(notification.severity) as "neutral" | "warning" | "danger"}>
                      {notificationSeverityLabels[notification.severity] ?? notification.severity}
                    </Badge>
                    <div className="mt-2 text-xs text-muted-foreground">{notificationTypeLabels[notification.type] ?? notification.type}</div>
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <div className="font-semibold">{notification.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{notification.message}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/lotteries/${notification.lotteryListingId}`} className="font-medium hover:text-primary">
                      {notification.lotteryListing.productName}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {notification.lotteryListing.storeName} / 優先度 {notification.lotteryListing.applicationPriorityLabel}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{dateTime(notification.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={notification.read ? "neutral" : "primary"}>{notification.read ? "既読" : "未読"}</Badge>
                    {notification.readAt ? <div className="mt-1 text-xs text-muted-foreground">{dateTime(notification.readAt)}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/lotteries/${notification.lotteryListingId}`} className={secondaryButtonClass}>詳細へ移動</Link>
                      {!notification.read ? (
                        <form action={markNotificationRead}>
                          <input type="hidden" name="id" value={notification.id} />
                          <button className={secondaryButtonClass} type="submit">既読にする</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
