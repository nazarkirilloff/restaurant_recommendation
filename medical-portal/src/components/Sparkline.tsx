import { Line, LineChart, ReferenceArea, ResponsiveContainer, YAxis } from "recharts";
import type { Marker, ReferenceRange } from "../types";

interface Props {
  marker: Marker;
  range: ReferenceRange;
}

export function Sparkline({ marker, range }: Props) {
  const data = marker.measurements
    .filter((m) => m.value.kind === "number" || m.value.kind === "operator")
    .map((m) => ({
      t: m.date.getTime(),
      v: m.value.kind === "empty" || m.value.kind === "qualitative" ? null : m.value.numeric,
    }))
    .filter((d) => d.v != null);

  if (data.length < 2) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const values = data.map((d) => d.v as number);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  let lo = dataMin;
  let hi = dataMax;
  if (range.kind === "between") {
    lo = Math.min(lo, range.low);
    hi = Math.max(hi, range.high);
  } else if (range.kind === "lt" || range.kind === "lte") {
    hi = Math.max(hi, range.high);
  } else if (range.kind === "gt" || range.kind === "gte") {
    lo = Math.min(lo, range.low);
  }
  const pad = (hi - lo) * 0.1 || hi * 0.1 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;

  return (
    <div className="h-6 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={[yMin, yMax]} />
          {range.kind === "between" && (
            <ReferenceArea
              y1={range.low}
              y2={range.high}
              fill="rgb(16 185 129)"
              fillOpacity={0.12}
              stroke="none"
            />
          )}
          {(range.kind === "lt" || range.kind === "lte") && (
            <ReferenceArea
              y1={yMin}
              y2={range.high}
              fill="rgb(16 185 129)"
              fillOpacity={0.12}
              stroke="none"
            />
          )}
          {(range.kind === "gt" || range.kind === "gte") && (
            <ReferenceArea
              y1={range.low}
              y2={yMax}
              fill="rgb(16 185 129)"
              fillOpacity={0.12}
              stroke="none"
            />
          )}
          <Line
            type="monotone"
            dataKey="v"
            stroke="rgb(15 118 110)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
