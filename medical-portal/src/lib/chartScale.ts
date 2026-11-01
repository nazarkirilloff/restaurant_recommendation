import type { ReferenceRange } from "../types";

export interface Scale {
  domain: [number, number];
  ticks: number[];
}

/** Round a float for display: 0.30000000000000004 → 0.3. */
export function cleanTick(n: number): number {
  return Number(n.toPrecision(10));
}

/** A "nice" step (1, 2, 2.5 or 5 × 10ⁿ) close to `raw`. */
export function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}

function bounds(range?: ReferenceRange): number[] {
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

/**
 * Y axis covering the data and the reference bounds, with round tick values.
 * Never extends below zero when everything is non-negative (lab values are).
 */
export function chartScale(
  values: number[],
  ranges: (ReferenceRange | undefined)[],
  targetTicks = 5,
): Scale {
  const all = [...values, ...ranges.flatMap(bounds)].filter(Number.isFinite);
  if (all.length === 0) return { domain: [0, 1], ticks: [0, 1] };

  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const step = niceStep((hi - lo) / (targetTicks - 1));
  const nonNegative = Math.min(...all) >= 0;
  let start = Math.floor((lo - step * 0.25) / step) * step;
  if (nonNegative) start = Math.max(0, start);
  const end = Math.ceil((hi + step * 0.25) / step) * step;

  const ticks: number[] = [];
  for (let t = start; t <= end + step / 1000; t += step) ticks.push(cleanTick(t));
  return { domain: [cleanTick(start), cleanTick(end)], ticks };
}

/** Tick label: no float noise, no needless zeros. */
export function formatTick(n: number): string {
  return String(cleanTick(n));
}
