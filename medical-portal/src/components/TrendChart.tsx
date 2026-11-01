import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { Marker, ReferenceRange } from "../types";
import { formatDateLong, formatDateShort } from "../lib/format";
import { chartScale, formatTick } from "../lib/chartScale";
import { chartPoints, type ChartPoint } from "../lib/chartPoints";
import { chartTheme, type ChartTheme } from "../lib/chartTheme";
import { useIsDark } from "../hooks/useIsDark";
import { useI18n } from "../i18n/I18n";

interface Props {
  marker: Marker;
  active: ReferenceRange;
  secondary?: ReferenceRange;
  unit?: string;
}

/** Filled dot for a measured value, hollow dot for a detection-limit value. */
function Dot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
  r?: number;
  theme: ChartTheme;
}) {
  const { cx, cy, payload, r = 3.5, theme } = props;
  if (cx == null || cy == null || !payload) return null;
  return payload.censored ? (
    <circle cx={cx} cy={cy} r={r + 0.5} fill={theme.surface} stroke={theme.line} strokeWidth={1.5} />
  ) : (
    <circle cx={cx} cy={cy} r={r} fill={theme.line} />
  );
}

function ChartTooltip({ active, payload, unit }: TooltipProps<number, string> & { unit?: string }) {
  const { t } = useI18n();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="text-slate-500 dark:text-slate-400">{formatDateLong(new Date(p.t), t.locale)}</div>
      <div className="tabnum font-medium text-slate-900 dark:text-slate-100">
        {p.raw}
        {unit ? ` ${unit}` : ""}
      </div>
      {p.censored && (
        <div className="mt-0.5 text-slate-500 dark:text-slate-400">
          {p.censored === "below" ? t.chart.belowLimit : t.chart.aboveLimit}
        </div>
      )}
    </div>
  );
}

function bandFor(range: ReferenceRange, domain: [number, number]): [number, number] | null {
  switch (range.kind) {
    case "between":
      return [range.low, range.high];
    case "lt":
    case "lte":
      return [domain[0], range.high];
    case "gt":
    case "gte":
      return [range.low, domain[1]];
    default:
      return null;
  }
}

function linesFor(range?: ReferenceRange): number[] {
  if (!range) return [];
  switch (range.kind) {
    case "between":
      return [range.low, range.high];
    case "lt":
    case "lte":
      return [range.high];
    case "gt":
    case "gte":
      return [range.low];
    default:
      return [];
  }
}

export function TrendChart({ marker, active, secondary, unit }: Props) {
  const theme = chartTheme(useIsDark());
  const { t } = useI18n();
  const data = chartPoints(marker);

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {t.chart.noNumeric}
      </div>
    );
  }

  const { domain, ticks } = chartScale(
    data.map((d) => d.v),
    [active, secondary],
  );
  const band = bandFor(active, domain);
  const hasCensored = data.some((d) => d.censored);

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="2 3" stroke={theme.grid} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              padding={{ left: 12, right: 12 }}
              tickFormatter={(v) => formatDateShort(new Date(v), t.locale)}
              stroke={theme.axis}
              tick={{ fontSize: 11, fill: theme.tick }}
            />
            <YAxis
              domain={domain}
              ticks={ticks}
              tickFormatter={formatTick}
              stroke={theme.axis}
              tick={{ fontSize: 11, fill: theme.tick }}
              width={44}
              allowDataOverflow
            />
            {band && (
              <ReferenceArea
                y1={band[0]}
                y2={band[1]}
                fill={theme.band}
                fillOpacity={0.12}
                stroke="none"
              />
            )}
            {linesFor(secondary).map((y) => (
              <ReferenceLine
                key={y}
                y={y}
                stroke={theme.secondary}
                strokeDasharray="4 3"
                strokeOpacity={0.7}
              />
            ))}
            <Tooltip content={<ChartTooltip unit={unit} />} />
            <Line
              type="monotone"
              dataKey="v"
              stroke={theme.line}
              strokeWidth={2}
              dot={<Dot theme={theme} />}
              activeDot={<Dot r={5} theme={theme} />}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        {band && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm bg-emerald-500/20" aria-hidden />
            {t.chart.activeRange}
          </span>
        )}
        {secondary && linesFor(secondary).length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-slate-400" aria-hidden />
            {t.chart.otherRange}
          </span>
        )}
        {hasCensored && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-teal-700 dark:border-teal-400"
              aria-hidden
            />
            {t.chart.detectionLimit}
          </span>
        )}
      </div>
    </div>
  );
}
