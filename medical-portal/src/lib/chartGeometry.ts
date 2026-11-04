// Geometry for the hand-written SVG charts (TrendChart, Sparkline).
// Pure functions, so they're unit-tested without a browser.
import type { ReferenceRange } from "../types";
import type { ChartPoint } from "./chartPoints";

export type Scale = (v: number) => number;

/** Linear map from a domain to a pixel range (a flat domain maps to the middle). */
export function linear([d0, d1]: [number, number], [r0, r1]: [number, number]): Scale {
  if (d1 === d0) return () => (r0 + r1) / 2;
  const k = (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}

/** Up to `max` evenly spaced time ticks across [t0, t1]; one tick for a single date. */
export function timeTicks(t0: number, t1: number, max = 6): number[] {
  if (t1 <= t0) return [t0];
  const n = Math.max(2, max);
  return Array.from({ length: n }, (_, i) => t0 + ((t1 - t0) * i) / (n - 1));
}

/** SVG path through the points in order (straight segments: no invented in-between values). */
export function linePath(points: ChartPoint[], x: Scale, y: Scale): string {
  return points.map((p, i) => `${i ? "L" : "M"}${round(x(p.t))},${round(y(p.v))}`).join("");
}

/** The active range as a [low, high] value band, clipped to the visible domain. */
export function bandOf(range: ReferenceRange, [lo, hi]: [number, number]): [number, number] | null {
  let band: [number, number] | null = null;
  switch (range.kind) {
    case "between":
      band = [range.low, range.high];
      break;
    case "lt":
    case "lte":
      band = [lo, range.high];
      break;
    case "gt":
    case "gte":
      band = [range.low, hi];
      break;
    default:
      return null;
  }
  const a = Math.max(lo, Math.min(band[0], band[1]));
  const b = Math.min(hi, Math.max(band[0], band[1]));
  return b > a ? [a, b] : null;
}

/** Boundary values of a range, drawn as dashed lines for the "other" range. */
export function boundaryLines(range?: ReferenceRange): number[] {
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

/** Index of the point whose x position is nearest to `px` (for the tooltip). */
export function nearestIndex(points: ChartPoint[], x: Scale, px: number): number {
  let best = 0;
  let dist = Infinity;
  points.forEach((p, i) => {
    const d = Math.abs(x(p.t) - px);
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return best;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
