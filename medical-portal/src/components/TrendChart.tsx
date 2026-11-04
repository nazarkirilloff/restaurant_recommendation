import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Marker, ReferenceRange } from "../types";
import { formatDateLong, formatDateShort } from "../lib/format";
import { chartScale, formatTick } from "../lib/chartScale";
import { chartPoints, type ChartPoint } from "../lib/chartPoints";
import { bandOf, boundaryLines, linePath, linear, nearestIndex, timeTicks } from "../lib/chartGeometry";
import { chartTheme } from "../lib/chartTheme";
import { useIsDark } from "../hooks/useIsDark";
import { useI18n } from "../i18n/I18n";

interface Props {
  marker: Marker;
  active: ReferenceRange;
  secondary?: ReferenceRange;
  unit?: string;
}

const HEIGHT = 256;
const M = { top: 10, right: 16, bottom: 26, left: 48 };

/** Width of an element, kept up to date (one observer per expanded chart). */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

export function TrendChart({ marker, active, secondary, unit }: Props) {
  const theme = chartTheme(useIsDark());
  const { t } = useI18n();
  const [wrap, width] = useWidth<HTMLDivElement>(640);
  const [selected, setSelected] = useState<number | null>(null);
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
  const t0 = data[0].t;
  const t1 = data[data.length - 1].t;
  // A little room at both ends so the first and last dots aren't cut in half.
  const pad = (t1 - t0) * 0.03 || 1;
  const x = linear(t1 > t0 ? [t0 - pad, t1 + pad] : [t0 - 1, t0 + 1], [M.left, width - M.right]);
  const y = linear(domain, [HEIGHT - M.bottom, M.top]);
  const band = bandOf(active, domain);
  const others = boundaryLines(secondary).filter((v) => v >= domain[0] && v <= domain[1]);
  const xTicks = timeTicks(t0, t1, Math.max(2, Math.min(6, Math.floor((width - M.left - M.right) / 90))));
  const hasCensored = data.some((d) => d.censored);
  const point: ChartPoint | null = selected === null ? null : data[selected];

  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setSelected(nearestIndex(data, x, e.clientX - box.left));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const last = data.length - 1;
    const cur = selected ?? last;
    const next =
      e.key === "ArrowLeft" ? Math.max(0, cur - 1)
      : e.key === "ArrowRight" ? Math.min(last, cur + 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : e.key === "Escape" ? null
      : undefined;
    if (next === undefined) return;
    e.preventDefault();
    setSelected(next);
  };

  return (
    <div>
      <div ref={wrap} className="relative h-64 w-full">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          tabIndex={0}
          aria-label={t.chart.ariaLabel(data.length)}
          onPointerMove={onPointer}
          onPointerLeave={() => setSelected(null)}
          onKeyDown={onKey}
          onBlur={() => setSelected(null)}
          className="block overflow-visible rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          {/* grid + y axis */}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke={theme.grid} strokeDasharray="2 3" />
              <text x={M.left - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill={theme.tick}>
                {formatTick(v)}
              </text>
            </g>
          ))}
          <line x1={M.left} x2={M.left} y1={M.top} y2={HEIGHT - M.bottom} stroke={theme.axis} />
          <line x1={M.left} x2={width - M.right} y1={HEIGHT - M.bottom} y2={HEIGHT - M.bottom} stroke={theme.axis} />
          {/* x axis */}
          {xTicks.map((tt) => (
            <text key={tt} x={x(tt)} y={HEIGHT - M.bottom + 16} textAnchor="middle" fontSize={11} fill={theme.tick}>
              {formatDateShort(new Date(tt), t.locale)}
            </text>
          ))}
          {/* active range band, other range as dashed lines */}
          {band && (
            <rect
              x={M.left}
              width={width - M.left - M.right}
              y={y(band[1])}
              height={Math.max(0, y(band[0]) - y(band[1]))}
              fill={theme.band}
              fillOpacity={0.12}
            />
          )}
          {others.map((v) => (
            <line key={v} x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke={theme.secondary} strokeDasharray="4 3" strokeOpacity={0.7} />
          ))}
          {/* the line and its dots: filled = measured, hollow = detection limit */}
          <path d={linePath(data, x, y)} fill="none" stroke={theme.line} strokeWidth={2} strokeLinejoin="round" />
          {data.map((p, i) => {
            const r = i === selected ? 5 : 3.5;
            return p.censored ? (
              <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={r + 0.5} fill={theme.surface} stroke={theme.line} strokeWidth={1.5} />
            ) : (
              <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={r} fill={theme.line} />
            );
          })}
          {point && (
            <line x1={x(point.t)} x2={x(point.t)} y1={M.top} y2={HEIGHT - M.bottom} stroke={theme.axis} strokeDasharray="3 3" />
          )}
        </svg>
        {point && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900"
            style={{
              left: Math.min(Math.max(0, x(point.t) + 10), Math.max(0, width - 190)),
              top: Math.max(0, y(point.v) - 60),
            }}
          >
            <div className="text-slate-500 dark:text-slate-400">{formatDateLong(new Date(point.t), t.locale)}</div>
            <div className="tabnum font-medium text-slate-900 dark:text-slate-100">
              {point.raw}
              {unit ? ` ${unit}` : ""}
            </div>
            {point.censored && (
              <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                {point.censored === "below" ? t.chart.belowLimit : t.chart.aboveLimit}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        {band && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm bg-emerald-500/20" aria-hidden />
            {t.chart.activeRange}
          </span>
        )}
        {others.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-slate-400" aria-hidden />
            {t.chart.otherRange}
          </span>
        )}
        {hasCensored && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-teal-700 dark:border-teal-400" aria-hidden />
            {t.chart.detectionLimit}
          </span>
        )}
      </div>
    </div>
  );
}
