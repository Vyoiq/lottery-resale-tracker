import Link from "next/link";
import { notFound } from "next/navigation";
import { updateWatchSource } from "@/lib/actions";
import { sourceTypes } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { sourceTypeLabels } from "@/lib/format";
import { buttonClass, Card, Field, inputClass, PageHeader, secondaryButtonClass, textareaClass } from "@/components/ui";

export default async function EditSourcePage({ params }: { params: { id: string } }) {
  const source = await prisma.watchSource.findUnique({ where: { id: params.id } });
  if (!source) notFound();

  return (
    <>
      <PageHeader title="監視ソースを編集">
        <Link href="/sources" className={secondaryButtonClass}>一覧へ戻る</Link>
      </PageHeader>
      <Card className="p-4">
        <form action={updateWatchSource} className="grid gap-4 md:grid-cols-4">
          <input type="hidden" name="id" value={source.id} />
          <Field label="ソース名">
            <input className={inputClass} name="name" defaultValue={source.name} required />
          </Field>
          <Field label="店舗名">
            <input className={inputClass} name="storeName" defaultValue={source.storeName} required />
          </Field>
          <Field label="URL">
            <input className={inputClass} name="url" type="url" defaultValue={source.url} required />
          </Field>
          <Field label="種別">
            <select className={inputClass} name="type" defaultValue={source.type}>
              {sourceTypes.map((type) => <option key={type} value={type}>{sourceTypeLabels[type]}</option>)}
            </select>
          </Field>
          <div className="md:col-span-3">
            <Field label="メモ">
              <textarea className={textareaClass} name="memo" defaultValue={source.memo ?? ""} />
            </Field>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-muted-foreground">
            <input name="enabled" type="checkbox" defaultChecked={source.enabled} />
            有効
          </label>
          <div className="md:col-span-4">
            <button className={buttonClass} type="submit">更新する</button>
          </div>
        </form>
      </Card>
    </>
  );
}
