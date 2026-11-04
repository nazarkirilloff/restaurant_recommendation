import type { Marker, ReferenceRange } from "../types";
import { chartScale } from "../lib/chartScale";
import { chartPoints } from "../lib/chartPoints";
import { bandOf, linePath, linear } from "../lib/chartGeometry";
import { chartTheme } from "../lib/chartTheme";
import { useIsDark } from "../hooks/useIsDark";

interface Props {
  marker: Marker;
  range: ReferenceRange;
}

const W = 96;
const H = 24;
const P = 3;

/**
 * A tiny fixed-size trend line with the active range band. Plain SVG, no
 * measuring or observers, so ~80 of them render cheaply. Only detection-limit
 * points get a (hollow) dot, so they stand out from real readings.
 */
export function Sparkline({ marker, range }: Props) {
  const theme = chartTheme(useIsDark());
  const data = chartPoints(marker);
  if (data.length < 2) {
    return <span className="inline-block w-24 text-center text-xs text-slate-400">—</span>;
  }

  const { domain } = chartScale(
    data.map((d) => d.v),
    [range],
    3,
  );
  const x = linear([data[0].t, data[data.length - 1].t], [P, W - P]);
  const y = linear(domain, [H - P, P]);
  const band = bandOf(range, domain);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="block shrink-0">
      {band && (
        <rect x={P} width={W - 2 * P} y={y(band[1])} height={Math.max(0, y(band[0]) - y(band[1]))} fill={theme.band} fillOpacity={0.12} />
      )}
      <path d={linePath(data, x, y)} fill="none" stroke={theme.line} strokeWidth={1.5} strokeLinejoin="round" />
      {data
        .filter((p) => p.censored)
        .map((p) => (
          <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={2.5} fill={theme.surface} stroke={theme.line} strokeWidth={1.25} />
        ))}
    </svg>
  );
}
