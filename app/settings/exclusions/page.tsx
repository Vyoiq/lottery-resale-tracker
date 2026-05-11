import { createExclusionKeyword, toggleExclusionKeyword } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { Badge, buttonClass, Card, EmptyState, Field, inputClass, PageHeader, secondaryButtonClass, textareaClass } from "@/components/ui";

export default async function ExclusionsPage() {
  const keywords = await prisma.exclusionKeyword.findMany({ orderBy: [{ enabled: "desc" }, { keyword: "asc" }] });

  return (
    <>
      <PageHeader title="除外キーワード" description="該当する抽選は応募優先度をDに下げます。自動削除はしません。" />

      <Card className="mb-6 p-4">
        <form action={createExclusionKeyword} className="grid gap-4 md:grid-cols-[240px_1fr_120px]">
          <Field label="キーワード">
            <input className={inputClass} name="keyword" placeholder="オリパ" required />
          </Field>
          <Field label="メモ">
            <textarea className={textareaClass} name="memo" />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-muted-foreground">
            <input name="enabled" type="checkbox" defaultChecked />
            有効
          </label>
          <div className="md:col-span-3">
            <button className={buttonClass} type="submit">追加</button>
          </div>
        </form>
      </Card>

      {keywords.length === 0 ? (
        <EmptyState message="除外キーワードがありません。" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">キーワード</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">メモ</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{item.keyword}</td>
                  <td className="px-4 py-3"><Badge tone={item.enabled ? "success" : "neutral"}>{item.enabled ? "有効" : "無効"}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.memo ?? "-"}</td>
                  <td className="px-4 py-3">
                    <form action={toggleExclusionKeyword} className="flex justify-end">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="enabled" value={item.enabled ? "false" : "true"} />
                      <button className={secondaryButtonClass} type="submit">{item.enabled ? "無効化" : "有効化"}</button>
                    </form>
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
