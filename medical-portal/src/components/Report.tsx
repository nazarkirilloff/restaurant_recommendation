import { useEffect, useMemo } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import type { ParsedWorkbook, RangeMode } from "../types";
import { buildReport, type ReportItem } from "../lib/report";
import { formatDateLong } from "../lib/format";
import { formatRange, rangeUnit } from "../lib/parseReferenceRange";
import { useI18n } from "../i18n/I18n";
import { StatusPill } from "./StatusPill";

interface Props {
  workbook: ParsedWorkbook;
  mode: RangeMode;
  onBack: () => void;
}

/**
 * A one-page summary for a doctor: per sheet, what's out of range now, what
 * just came back into range, and how many other markers are fine. Designed
 * for A4 printing / "Save as PDF".
 */
export function Report({ workbook, mode, onBack }: Props) {
  const { lang, t } = useI18n();
  const sheets = useMemo(() => buildReport(workbook, mode), [workbook, mode]);
  const today = useMemo(() => new Date(), []);

  // Always print light, even when the screen is in dark mode.
  useEffect(() => {
    const root = document.documentElement;
    // Browsers can fire beforeprint more than once per print; only the first
    // one sees the real theme.
    let printing = false;
    let wasDark = false;
    const before = () => {
      if (printing) return;
      printing = true;
      wasDark = root.classList.contains("dark");
      root.classList.remove("dark");
    };
    const after = () => {
      if (!printing) return;
      printing = false;
      if (wasDark) root.classList.add("dark");
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const name = (it: ReportItem) =>
    lang === "uk" && it.marker.nameUa
      ? [it.marker.nameUa, it.marker.nameEn]
      : [it.marker.nameEn, it.marker.nameUa];

  const value = (it: ReportItem, which: "latest" | "previous") => {
    const m = which === "latest" ? it.latest : it.previous;
    if (!m) return <span className="text-slate-400">—</span>;
    const unit = rangeUnit(it.range) ?? rangeUnit(it.marker.standard);
    return (
      <>
        <span className="tabnum whitespace-nowrap font-medium">
          {m.raw}
          {unit && m.value.kind !== "qualitative" ? ` ${unit}` : ""}
        </span>
        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
          {formatDateLong(m.date, t.locale)}
        </span>
      </>
    );
  };

  const notes = (it: ReportItem) =>
    [it.marker.standard, it.marker.biohacker]
      .map((r) => r.note)
      .filter((n): n is string => !!n)
      .join(" · ");

  const table = (items: ReportItem[]) => (
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="border-b border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <th className="py-1.5 pr-3 font-medium">{t.report.marker}</th>
          <th className="py-1.5 pr-3 font-medium">{t.report.latest}</th>
          <th className="py-1.5 pr-3 font-medium">{t.report.previous}</th>
          <th className="py-1.5 pr-3 font-medium">{t.report.change}</th>
          <th className="py-1.5 pr-3 font-medium">{t.report.range}</th>
          <th className="py-1.5 font-medium">{t.report.status}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => {
          const [primary, secondary] = name(it);
          const note = notes(it);
          return (
            <tr
              key={it.marker.nameEn}
              className="break-inside-avoid border-b border-slate-200 align-top dark:border-slate-800"
            >
              <td className="py-1.5 pr-3">
                <span className="font-medium">{primary}</span>
                {secondary && (
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">{secondary}</span>
                )}
                {note && (
                  <span className="block text-[11px] italic text-slate-500 dark:text-slate-400">{note}</span>
                )}
              </td>
              <td className="py-1.5 pr-3">{value(it, "latest")}</td>
              <td className="py-1.5 pr-3">{value(it, "previous")}</td>
              <td className="tabnum whitespace-nowrap py-1.5 pr-3">
                {it.change ? `${it.change.direction === "up" ? "↗" : "↘"} ${it.change.amount}` : "—"}
              </td>
              <td className="tabnum py-1.5 pr-3">
                {formatRange(it.range)}
                {it.fellBack && (
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    {t.report.fallback}
                  </span>
                )}
              </td>
              <td className="py-1.5">
                <StatusPill status={it.status} size="xs" />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="report min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t.report.back}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Printer className="h-4 w-4" aria-hidden />
            {t.report.print}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <header className="mb-6 border-b border-slate-300 pb-4 dark:border-slate-700">
          <h1 className="text-2xl font-semibold tracking-tight">{t.report.title}</h1>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs text-slate-600 dark:text-slate-300">
            <dt className="text-slate-500 dark:text-slate-400">{t.report.file}</dt>
            <dd>{workbook.fileName}</dd>
            <dt className="text-slate-500 dark:text-slate-400">{t.report.ranges}</dt>
            <dd>{t.mode[mode]}</dd>
            <dt className="text-slate-500 dark:text-slate-400">{t.report.prepared}</dt>
            <dd>{formatDateLong(today, t.locale)}</dd>
          </dl>
        </header>

        <div className="space-y-8">
          {sheets.map((s) => (
            <section key={s.sheet}>
              <h2 className="break-after-avoid flex flex-wrap items-baseline justify-between gap-2 text-lg font-semibold">
                {s.sheet}
                {s.latestDate && (
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {t.report.latestTest}: {formatDateLong(s.latestDate, t.locale)}
                  </span>
                )}
              </h2>

              <h3 className="break-after-avoid mb-2 mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
                {t.report.attention}
              </h3>
              {s.attention.length > 0 ? (
                table(s.attention)
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">{t.report.noAttention}</p>
              )}

              {s.backInRange.length > 0 && (
                <>
                  <h3 className="break-after-avoid mb-2 mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {t.report.backInRange}
                  </h3>
                  {table(s.backInRange)}
                </>
              )}

              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                {t.report.okCount(s.okCount)}
                {s.otherCount > 0 && <> {t.report.otherCount(s.otherCount)}</>}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-10 border-t border-slate-300 pt-3 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t.report.disclaimer}
        </p>
      </main>
    </div>
  );
}
