import { clsx } from "clsx";

export function PageHeader({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={clsx("rounded-md border border-border bg-card text-card-foreground shadow-sm", className)}>{children}</section>;
}

export function StatCard({
  label,
  value,
  note,
  tone = "neutral"
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
}) {
  const toneClasses = {
    neutral: "",
    success: "border-emerald-200 bg-emerald-50/60",
    warning: "border-amber-200 bg-amber-50/60",
    danger: "border-rose-200 bg-rose-50/60",
    primary: "border-teal-200 bg-teal-50/60"
  };
  return (
    <Card className={clsx("p-4", toneClasses[tone])}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 break-words text-2xl font-semibold tabular-nums">{value}</div>
      {note ? <div className="mt-1 text-xs text-muted-foreground">{note}</div> : null}
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
}) {
  const classes = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    primary: "bg-teal-50 text-teal-700 ring-teal-200"
  };
  return <span className={clsx("inline-flex rounded px-2 py-1 text-xs font-medium ring-1 ring-inset", classes[tone])}>{children}</span>;
}

export function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export const textareaClass =
  "min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90";

export const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-muted";

export const dangerButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50";

export const smallButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted";

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">{message}</div>;
}
