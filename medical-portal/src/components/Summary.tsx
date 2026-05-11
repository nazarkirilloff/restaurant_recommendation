import { CalendarRange, CircleAlert, ListChecks, TriangleAlert } from "lucide-react";
import type { DataSheet, RangeMode } from "../types";
import { flagStatus } from "../lib/flagStatus";
import { formatDateLong } from "../lib/format";

interface Props {
  sheet: DataSheet;
  mode: RangeMode;
  filter: FilterKey | null;
  onFilter: (key: FilterKey | null) => void;
}

export type FilterKey = "outOfRange" | "qualitativeFail" | "all";

export function Summary({ sheet, mode, filter, onFilter }: Props) {
  let outOfRange = 0;
  let qualitativeFail = 0;
  let latest: Date | null = null;

  for (const marker of sheet.markers) {
    const latestMeasurement = marker.measurements[marker.measurements.length - 1];
    if (!latestMeasurement) continue;
    if (!latest || latestMeasurement.date > latest) latest = latestMeasurement.date;
    const range = mode === "biohacker" ? marker.biohacker : marker.standard;
    const effectiveRange =
      range.kind === "none" && mode === "biohacker" ? marker.standard : range;
    const status = flagStatus(latestMeasurement.value, effectiveRange);
    if (status === "high" || status === "low") outOfRange++;
    if (status === "mismatch") qualitativeFail++;
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
      label: "Markers",
      value: String(sheet.markers.length),
      sub: `${sheet.dates.length} test ${sheet.dates.length === 1 ? "date" : "dates"}`,
      selectable: true,
    },
    {
      key: "outOfRange",
      icon: <CircleAlert className="h-4 w-4" />,
      label: "Out of range",
      value: String(outOfRange),
      sub: mode === "biohacker" ? "vs Biohacker target" : "vs Standard range",
      selectable: true,
    },
    {
      key: "qualitativeFail",
      icon: <TriangleAlert className="h-4 w-4" />,
      label: "Unexpected",
      value: String(qualitativeFail),
      sub: "Qualitative results",
      selectable: true,
    },
    {
      key: "info",
      icon: <CalendarRange className="h-4 w-4" />,
      label: "Latest test",
      value: latest ? formatDateLong(latest) : "—",
      selectable: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((tile) => {
        const isActive =
          tile.selectable &&
          (filter === tile.key || (tile.key === "all" && filter == null));
        return (
          <button
            key={tile.key}
            disabled={!tile.selectable}
            onClick={() => {
              if (!tile.selectable) return;
              if (tile.key === "all") onFilter(null);
              else onFilter(filter === tile.key ? null : (tile.key as FilterKey));
            }}
            className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors ${
              isActive
                ? "border-teal-500 bg-teal-50/60 dark:border-teal-400 dark:bg-teal-950/30"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            } ${!tile.selectable ? "cursor-default" : "cursor-pointer"}`}
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              {tile.icon}
              <span>{tile.label}</span>
            </div>
            <div className="text-2xl font-semibold tracking-tight tabnum">
              {tile.value}
            </div>
            {tile.sub && (
              <div className="text-xs text-slate-500 dark:text-slate-400">{tile.sub}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
