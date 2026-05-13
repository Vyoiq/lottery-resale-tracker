import Link from "next/link";
import { Card, PageHeader, secondaryButtonClass } from "@/components/ui";

const steps = [
  {
    title: "1. 監視ソースプリセットを追加する",
    body: "公開ページやRSSから抽選情報を探すための候補URLを追加します。追加直後は無効状態なので、すぐには巡回されません。",
    href: "/sources/presets",
    link: "監視ソースプリセットへ"
  },
  {
    title: "2. 価格ソースプリセットを追加する",
    body: "買取価格候補を探すための検索URLテンプレートを追加します。URLが正しいか、公開ページかを確認してから使います。",
    href: "/price-sources/presets",
    link: "価格ソースプリセットへ"
  },
  {
    title: "3. enabled を true にする",
    body: "追加した監視ソースと価格ソースを確認し、実際に使うものだけ有効化します。ログインが必要なURLや規約上問題があるURLは有効化しないでください。",
    href: "/sources",
    link: "監視ソースを確認"
  },
  {
    title: "4. npm run operate を実行する",
    body: "抽選情報収集、価格取得、通知生成をまとめて実行します。画面から実行する場合はダッシュボードまたは運用設定を使います。",
    href: "/settings/operations",
    link: "運用設定へ"
  },
  {
    title: "5. バックアップを作る",
    body: "SQLite DB はローカルファイルです。初回設定後、定期運用前後、復元前にはバックアップを作成してください。",
    href: "/backups",
    link: "バックアップへ"
  },
  {
    title: "6. Windows タスクスケジューラを設定する",
    body: "毎日決まった時間に operate.bat や backup.bat を実行すると、ローカル運用が安定します。まずは手動実行でログを確認してください。",
    href: "/settings/operations",
    link: "運用設定へ"
  }
];

export default function GettingStartedPage() {
  return (
    <>
      <PageHeader
        title="初回セットアップガイド"
        description="ローカル運用を始めるときに最低限確認する手順です。自動応募、自動購入、ログイン自動化は行いません。"
      >
        <Link href="/health" className={secondaryButtonClass}>ヘルスチェック</Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        {steps.map((step) => (
          <Card key={step.title} className="p-4">
            <h2 className="font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
            <div className="mt-4">
              <Link href={step.href} className={secondaryButtonClass}>{step.link}</Link>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-amber-200 bg-amber-50/60 p-4">
        <h2 className="font-semibold text-amber-900">運用前の注意</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          プリセットは候補です。実際に巡回する前にURL、公開ページであること、利用規約、アクセス頻度を確認してください。
          PCがスリープしていると Windows タスクスケジューラの実行は失敗または遅延することがあります。
        </p>
      </Card>
    </>
  );
}
