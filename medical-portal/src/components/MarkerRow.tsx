import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Marker, RangeMode } from "../types";
import { StatusPill } from "./StatusPill";
import { Sparkline } from "./Sparkline";
import { TrendChart } from "./TrendChart";
import { Explanation } from "./Explanation";
import { flagStatus, statusTone } from "../lib/flagStatus";
import { useI18n } from "../i18n/I18n";
import { formatRange, isNumericRange, rangeUnit } from "../lib/parseReferenceRange";
import { formatDateLong } from "../lib/format";
import { activeRange } from "../lib/ranges";
import { trend, type TrendTone } from "../lib/trend";

interface Props {
  marker: Marker;
  mode: RangeMode;
}

const TONE_TEXT: Record<string, string> = {
  ok: "text-emerald-700 dark:text-emerald-300",
  bad: "text-rose-700 dark:text-rose-300",
  warn: "text-amber-700 dark:text-amber-300",
  info: "text-slate-600 dark:text-slate-300",
  muted: "text-slate-500 dark:text-slate-400",
};

const TREND_TEXT: Record<TrendTone, string> = {
  better: "text-emerald-600 dark:text-emerald-400",
  worse: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-400 dark:text-slate-500",
};

export function MarkerRow({ marker, mode }: Props) {
  const [open, setOpen] = useState(false);
  const { lang, t } = useI18n();
  const { range, fellBack, other } = activeRange(marker, mode);
  // In Ukrainian the Ukrainian name leads (when the file has one).
  const [primaryName, secondaryName] =
    lang === "uk" && marker.nameUa ? [marker.nameUa, marker.nameEn] : [marker.nameEn, marker.nameUa];

  const latest = marker.measurements[marker.measurements.length - 1];
  const previous = marker.measurements[marker.measurements.length - 2];
  const status = latest ? flagStatus(latest.value, range) : "unknown";
  const change = trend(previous, latest, range);
  const changeText = change ? t.trend(change) : "";

  const unit = rangeUnit(range) ?? rangeUnit(marker.standard);
  const canExpand = marker.measurements.length > 0;

  return (
    <div
      className={`group border-b border-slate-200 last:border-b-0 dark:border-slate-800`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => canExpand && setOpen((o) => !o)}
        className={`grid w-full grid-cols-1 items-center gap-3 px-4 py-3 text-left transition-colors md:grid-cols-[1.4fr_1fr_1.1fr_auto] hover:bg-slate-50 dark:hover:bg-slate-900/60 ${
          !canExpand ? "cursor-default" : "cursor-pointer"
        }`}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <StatusPill status={status} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {primaryName}
            </span>
            {secondaryName && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {secondaryName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-2 md:justify-end">
          <span
            className={`tabnum text-lg font-semibold ${TONE_TEXT[statusTone(status)]}`}
          >
            {latest ? latest.raw : "—"}
          </span>
          {unit && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{unit}</span>
          )}
          {change && (
            <span
              className={`text-xs tabnum ${TREND_TEXT[change.tone]}`}
              title={changeText}
            >
              <span aria-hidden>{change.direction === "up" ? "↗" : "↘"} </span>
              {change.amount}
              <span className="sr-only">. {changeText}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 md:justify-end">
          <span className="flex flex-col text-right">
            <span className="tabnum text-xs text-slate-500 dark:text-slate-400">
              {formatRange(range)}
            </span>
            {fellBack && isNumericRange(range) && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {t.row.noBiohackerTarget}
              </span>
            )}
          </span>
          <Sparkline marker={marker} range={range} />
        </div>

        {canExpand && (
          <ChevronDown
            className={`hidden h-4 w-4 text-slate-400 transition-transform md:block ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/30">
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">{t.row.standard}</span>
              <span className="tabnum font-medium">
                {formatRange(marker.standard)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">{t.row.biohacker}</span>
              <span className="tabnum font-medium">
                {marker.biohacker.kind !== "none"
                  ? formatRange(marker.biohacker)
                  : t.row.noTarget}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">{t.row.latest}</span>
              <span className="font-medium">{t.status[status]}</span>
            </div>
          </div>

          <TrendChart marker={marker} active={range} secondary={other} unit={unit} />

          <div className="mt-4">
            <Explanation marker={marker} status={status} />
          </div>

          {marker.measurements.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-500 dark:text-slate-400">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-4 text-left font-medium">{t.row.date}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t.row.value}</th>
                    <th className="py-2 text-left font-medium">{t.row.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...marker.measurements].reverse().map((m, i) => {
                    const s = flagStatus(m.value, range);
                    return (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/60"
                      >
                        <td className="py-1.5 pr-4 tabnum text-slate-600 dark:text-slate-300">
                          {formatDateLong(m.date, t.locale)}
                        </td>
                        <td className="py-1.5 pr-4 text-right tabnum">{m.raw}</td>
                        <td className="py-1.5">
                          <StatusPill status={s} size="xs" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
