import { Line, LineChart, ReferenceArea, ResponsiveContainer, YAxis } from "recharts";
import type { Marker, ReferenceRange } from "../types";
import { chartScale } from "../lib/chartScale";
import { chartPoints, type ChartPoint } from "../lib/chartPoints";

interface Props {
  marker: Marker;
  range: ReferenceRange;
}

const LINE = "rgb(15 118 110)";

/** Only detection-limit points get a (hollow) dot, so they stand out from real readings. */
function CensoredDot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.censored) return null;
  return <circle cx={cx} cy={cy} r={2.5} fill="white" stroke={LINE} strokeWidth={1.25} />;
}

export function Sparkline({ marker, range }: Props) {
  const data = chartPoints(marker);
  if (data.length < 2) {
    return <span className="inline-block w-24 text-center text-xs text-slate-400">—</span>;
  }

  const { domain } = chartScale(
    data.map((d) => d.v),
    [range],
    3,
  );
  const band: [number, number] | null =
    range.kind === "between"
      ? [range.low, range.high]
      : range.kind === "lt" || range.kind === "lte"
        ? [domain[0], range.high]
        : range.kind === "gt" || range.kind === "gte"
          ? [range.low, domain[1]]
          : null;

  return (
    <div className="h-6 w-24" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 3, right: 3, bottom: 3, left: 3 }}>
          <YAxis hide domain={domain} allowDataOverflow />
          {band && (
            <ReferenceArea
              y1={band[0]}
              y2={band[1]}
              fill="rgb(16 185 129)"
              fillOpacity={0.12}
              stroke="none"
            />
          )}
          <Line
            type="monotone"
            dataKey="v"
            stroke={LINE}
            strokeWidth={1.5}
            dot={<CensoredDot />}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
