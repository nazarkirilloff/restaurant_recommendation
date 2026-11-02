import {
  ArrowDown,
  ArrowUp,
  Check,
  Circle,
  Info,
  Minus,
  TriangleAlert,
} from "lucide-react";
import type { Status } from "../types";
import { statusTone } from "../lib/flagStatus";
import { useI18n } from "../i18n/I18n";

const TONE_CLASSES: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  bad: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
  warn: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  info: "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  muted:
    "bg-slate-50 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800",
};

function StatusIcon({ status }: { status: Status }) {
  const cls = "h-3.5 w-3.5";
  switch (status) {
    case "normal":
    case "match":
      return <Check className={cls} aria-hidden />;
    case "high":
      return <ArrowUp className={cls} aria-hidden />;
    case "low":
      return <ArrowDown className={cls} aria-hidden />;
    case "mismatch":
      return <TriangleAlert className={cls} aria-hidden />;
    case "borderline":
      return <Circle className={cls} aria-hidden />;
    case "info":
      return <Info className={cls} aria-hidden />;
    default:
      return <Minus className={cls} aria-hidden />;
  }
}

export function StatusPill({
  status,
  size = "sm",
}: {
  status: Status;
  size?: "sm" | "xs";
}) {
  const { t } = useI18n();
  const tone = statusTone(status);
  const label = t.status[status];
  const sizeCls = size === "xs" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium ${sizeCls} ${TONE_CLASSES[tone]}`}
      aria-label={t.statusAria(label)}
    >
      <StatusIcon status={status} />
      <span>{label}</span>
    </span>
  );
}
