import { runOperationTasksAction, runSingleOperationTaskAction, updateOperationSettingsAction } from "@/lib/actions";
import { getOperationSettings } from "@/lib/appSettings";
import { dateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { operationTypeLabel } from "@/services/operations/operationRunner";
import { Badge, buttonClass, Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

function statusTone(success: boolean) {
  return success ? "success" : "danger";
}

export default async function OperationSettingsPage() {
  const [settings, runs] = await Promise.all([
    getOperationSettings(),
    prisma.operationRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 })
  ]);

  return (
    <>
      <PageHeader title="運用設定" description="収集、価格取得、通知、バックアップの手動実行と定期実行向けの設定を管理します。">
        <div className="flex flex-wrap gap-2">
          <form action={runOperationTasksAction}>
            <button className={buttonClass} type="submit">運用タスクをまとめて実行</button>
          </form>
          <a className={secondaryButtonClass} href="/operation-runs">実行ログ</a>
        </div>
      </PageHeader>

      <Card className="mb-6 p-4">
        <form action={updateOperationSettingsAction} className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ToggleField name="collectEnabled" label="抽選情報収集を有効化" checked={settings.collectEnabled} />
            <ToggleField name="priceCollectEnabled" label="価格取得を有効化" checked={settings.priceCollectEnabled} />
            <ToggleField name="notificationsEnabled" label="通知生成を有効化" checked={settings.notificationsEnabled} />
            <ToggleField name="autoBackupEnabled" label="自動バックアップを有効化" checked={settings.autoBackupEnabled} />
            <ToggleField name="sourceDiscoveryEnabled" label="Source Discovery を一括実行に含める" checked={settings.sourceDiscoveryEnabled} />
            <ToggleField name="priceSourceDiscoveryEnabled" label="PriceSource Discovery を一括実行に含める" checked={settings.priceSourceDiscoveryEnabled} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Field label="抽選情報収集の実行間隔（分）">
              <input className={inputClass} name="collectIntervalMinutes" type="number" min="1" defaultValue={settings.collectIntervalMinutes} />
            </Field>
            <Field label="価格取得の実行間隔（分）">
              <input className={inputClass} name="priceCollectIntervalMinutes" type="number" min="1" defaultValue={settings.priceCollectIntervalMinutes} />
            </Field>
            <Field label="バックアップ保持件数">
              <input className={inputClass} name="backupRetentionCount" type="number" min="1" defaultValue={settings.backupRetentionCount} />
            </Field>
            <Field label="最低ROI通知しきい値（%）">
              <input className={inputClass} name="notificationMinRoi" type="number" min="0" defaultValue={settings.notificationMinRoi} />
            </Field>
            <Field label="最低利益通知しきい値（円）">
              <input className={inputClass} name="notificationMinProfit" type="number" min="0" defaultValue={settings.notificationMinProfit} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="ソース自動発見モード">
              <select className={inputClass} name="sourceDiscoveryMode" defaultValue={settings.sourceDiscoveryMode}>
                <option value="candidates_only">候補発見のみ</option>
                <option value="auto_add_disabled">WatchSource / PriceSource に自動追加（enabled: false）</option>
                <option value="auto_add_high_confidence_disabled">高信頼候補だけ自動追加（enabled: false）</option>
              </select>
            </Field>
            <Field label="高信頼自動追加の最低信頼度（0-1）">
              <input className={inputClass} name="sourceDiscoveryAutoAddMinConfidence" type="number" min="0" max="1" step="0.05" defaultValue={settings.sourceDiscoveryAutoAddMinConfidence} />
            </Field>
            <Field label="PriceSource 自動発見モード">
              <select className={inputClass} name="priceSourceDiscoveryMode" defaultValue={settings.priceSourceDiscoveryMode}>
                <option value="candidates_only">候補発見のみ</option>
                <option value="auto_add_high_confidence_disabled">高信頼候補だけ PriceSource に自動追加（enabled: false）</option>
                <option value="manual_review">すべて手動確認</option>
              </select>
            </Field>
          </div>

          <div>
            <button className={buttonClass} type="submit">設定を保存</button>
          </div>
        </form>
      </Card>

      <Card className="mb-6 p-4">
        <h2 className="mb-3 font-semibold">個別実行</h2>
        <div className="flex flex-wrap gap-2">
          <TaskButton type="collect" label="抽選情報収集" />
          <TaskButton type="price_collect" label="価格取得" />
          <TaskButton type="notifications" label="通知生成" />
          <TaskButton type="backup" label="バックアップ作成" />
          <TaskButton type="source_discovery" label="ソース自動発見" />
          <TaskButton type="price_source_discovery" label="価格ソース自動発見" />
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {runs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="最近の実行ログはありません"
              message="一括実行または個別実行を押すと、成功/失敗、件数、エラー詳細がここに表示されます。"
            />
          </div>
        ) : (
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">種別</th>
              <th className="px-4 py-3">開始</th>
              <th className="px-4 py-3">終了</th>
              <th className="px-4 py-3">結果</th>
              <th className="px-4 py-3">メッセージ</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t border-border align-top">
                <td className="px-4 py-3 font-medium">{operationTypeLabel(run.type)}</td>
                <td className="px-4 py-3">{dateTime(run.startedAt)}</td>
                <td className="px-4 py-3">{dateTime(run.finishedAt)}</td>
                <td className="px-4 py-3"><Badge tone={statusTone(run.success)}>{run.success ? "成功" : "失敗"}</Badge></td>
                <td className="max-w-xl whitespace-pre-wrap px-4 py-3">
                  {run.success ? (
                    <span className="text-muted-foreground">{run.message ?? "-"}</span>
                  ) : (
                    <pre className="rounded-md border border-rose-200 bg-rose-50 p-3 font-sans text-xs leading-5 text-rose-800">{run.message ?? "エラー詳細がありません。"}</pre>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Card>
    </>
  );
}

function ToggleField({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <input className="h-4 w-4" name={name} type="checkbox" defaultChecked={checked} />
    </label>
  );
}

function TaskButton({ type, label }: { type: string; label: string }) {
  return (
    <form action={runSingleOperationTaskAction}>
      <input type="hidden" name="type" value={type} />
      <button className={secondaryButtonClass} type="submit">{label}</button>
    </form>
  );
}
