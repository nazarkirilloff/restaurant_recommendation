import { CalendarRange, CircleAlert, ListChecks, TriangleAlert } from "lucide-react";
import type { DataSheet, RangeMode } from "../types";
import { isNumericRange } from "../lib/parseReferenceRange";
import { activeRange, isOutOfRange, latestStatus } from "../lib/ranges";
import { formatDateLong } from "../lib/format";
import { useI18n } from "../i18n/I18n";

interface Props {
  sheet: DataSheet;
  mode: RangeMode;
  filter: FilterKey | null;
  onFilter: (key: FilterKey | null) => void;
}

export type FilterKey = "outOfRange" | "qualitativeFail" | "all";

export function Summary({ sheet, mode, filter, onFilter }: Props) {
  const { t } = useI18n();
  let outOfRange = 0;
  let qualitativeFail = 0;
  let fellBack = 0;
  let latest: Date | null = null;

  for (const marker of sheet.markers) {
    const latestMeasurement = marker.measurements[marker.measurements.length - 1];
    if (!latestMeasurement) continue;
    if (!latest || latestMeasurement.date > latest) latest = latestMeasurement.date;
    const status = latestStatus(marker, mode);
    if (isOutOfRange(status)) outOfRange++;
    if (status === "mismatch") qualitativeFail++;
    if (activeRange(marker, mode).fellBack && isNumericRange(marker.standard)) fellBack++;
  }

  const tiles: {
    key: FilterKey | "info";
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    selectable: boolean;
  }[] = [
    {
      key: "all",
      icon: <ListChecks className="h-4 w-4" />,
      label: t.summary.markers,
      value: String(sheet.markers.length),
      sub: t.summary.testDates(sheet.dates.length),
      selectable: true,
    },
    {
      key: "outOfRange",
      icon: <CircleAlert className="h-4 w-4" />,
      label: t.summary.outOfRange,
      value: String(outOfRange),
      sub:
        mode === "biohacker"
          ? fellBack > 0
            ? `${t.summary.vsBiohacker} · ${t.summary.useStandard(fellBack)}`
            : t.summary.vsBiohacker
          : t.summary.vsStandard,
      selectable: true,
    },
    {
      key: "qualitativeFail",
      icon: <TriangleAlert className="h-4 w-4" />,
      label: t.summary.unexpected,
      value: String(qualitativeFail),
      sub: t.summary.qualitative,
      selectable: true,
    },
    {
      key: "info",
      icon: <CalendarRange className="h-4 w-4" />,
      label: t.summary.latestTest,
      value: latest ? formatDateLong(latest, t.locale) : "—",
      selectable: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((tile) => {
        const body = (
          <>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              {tile.icon}
              <span>{tile.label}</span>
            </div>
            <div className="text-2xl font-semibold tracking-tight tabnum">{tile.value}</div>
            {tile.sub && (
              <div className="text-xs text-slate-500 dark:text-slate-400">{tile.sub}</div>
            )}
          </>
        );
        const base = "flex flex-col items-start gap-1 rounded-xl border p-4 text-left";
        if (!tile.selectable) {
          return (
            <div
              key={tile.key}
              className={`${base} border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900`}
            >
              {body}
            </div>
          );
        }
        const isActive = filter === tile.key || (tile.key === "all" && filter == null);
        return (
          <button
            key={tile.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              if (tile.key === "all") onFilter(null);
              else onFilter(filter === tile.key ? null : (tile.key as FilterKey));
            }}
            className={`${base} cursor-pointer transition-colors ${
              isActive
                ? "border-teal-500 bg-teal-50/60 dark:border-teal-400 dark:bg-teal-950/30"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            }`}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
