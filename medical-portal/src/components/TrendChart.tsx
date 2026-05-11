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
} from "recharts";
import type { Marker, ReferenceRange } from "../types";
import { formatDateLong, formatDateShort } from "../lib/format";

interface Props {
  marker: Marker;
  active: ReferenceRange;
  secondary?: ReferenceRange;
}

interface Point {
  t: number;
  v: number;
  raw: string;
}

function rangeBounds(r: ReferenceRange): { lo?: number; hi?: number } {
  if (r.kind === "between") return { lo: r.low, hi: r.high };
  if (r.kind === "lt" || r.kind === "lte") return { hi: r.high };
  if (r.kind === "gt" || r.kind === "gte") return { lo: r.low };
  return {};
}

export function TrendChart({ marker, active, secondary }: Props) {
  const data: Point[] = marker.measurements
    .filter((m) => m.value.kind === "number" || m.value.kind === "operator")
    .map((m) => ({
      t: m.date.getTime(),
      v: (m.value as { numeric: number }).numeric,
      raw: m.raw,
    }));

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        No numeric measurements to chart.
      </div>
    );
  }

  const values = data.map((d) => d.v);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const aBounds = rangeBounds(active);
  const sBounds = secondary ? rangeBounds(secondary) : {};
  const lo = Math.min(dataMin, aBounds.lo ?? dataMin, sBounds.lo ?? dataMin);
  const hi = Math.max(dataMax, aBounds.hi ?? dataMax, sBounds.hi ?? dataMax);
  const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.1 || 1;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="2 3" stroke="rgb(226 232 240)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => formatDateShort(new Date(v))}
            stroke="rgb(148 163 184)"
            tick={{ fontSize: 11, fill: "rgb(100 116 139)" }}
          />
          <YAxis
            domain={[lo - pad, hi + pad]}
            stroke="rgb(148 163 184)"
            tick={{ fontSize: 11, fill: "rgb(100 116 139)" }}
            width={48}
          />
          {active.kind === "between" && (
            <ReferenceArea
              y1={active.low}
              y2={active.high}
              fill="rgb(16 185 129)"
              fillOpacity={0.12}
              stroke="rgb(167 243 208)"
              strokeOpacity={0.5}
              ifOverflow="extendDomain"
            />
          )}
          {(active.kind === "lt" || active.kind === "lte") && (
            <ReferenceArea
              y1={lo - pad}
              y2={active.high}
              fill="rgb(16 185 129)"
              fillOpacity={0.12}
              stroke="none"
            />
          )}
          {(active.kind === "gt" || active.kind === "gte") && (
            <ReferenceArea
              y1={active.low}
              y2={hi + pad}
              fill="rgb(16 185 129)"
              fillOpacity={0.12}
              stroke="none"
            />
          )}
          {secondary && secondary.kind === "between" && (
            <>
              <ReferenceLine
                y={secondary.low}
                stroke="rgb(148 163 184)"
                strokeDasharray="4 3"
                strokeOpacity={0.6}
              />
              <ReferenceLine
                y={secondary.high}
                stroke="rgb(148 163 184)"
                strokeDasharray="4 3"
                strokeOpacity={0.6}
              />
            </>
          )}
          {secondary &&
            (secondary.kind === "lt" || secondary.kind === "lte") && (
              <ReferenceLine
                y={secondary.high}
                stroke="rgb(148 163 184)"
                strokeDasharray="4 3"
                strokeOpacity={0.6}
              />
            )}
          {secondary &&
            (secondary.kind === "gt" || secondary.kind === "gte") && (
              <ReferenceLine
                y={secondary.low}
                stroke="rgb(148 163 184)"
                strokeDasharray="4 3"
                strokeOpacity={0.6}
              />
            )}
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid rgb(226 232 240)",
              background: "white",
            }}
            labelFormatter={(v) => formatDateLong(new Date(Number(v)))}
            formatter={(value: number) => [value, "Value"]}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke="rgb(15 118 110)"
            strokeWidth={2}
            dot={{ r: 3, fill: "rgb(15 118 110)" }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
