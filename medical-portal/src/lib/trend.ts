import type { Measurement, ReferenceRange } from "../types";
import { flagStatus } from "./flagStatus";

export type TrendTone = "better" | "worse" | "neutral";

export interface Trend {
  direction: "up" | "down";
  /** Size of the change, at the precision of the data: "0.002", "0.12", "8". */
  amount: string;
  tone: TrendTone;
  /** The change moved the result into, or out of, the range. */
  crossing: "into" | "outOf" | null;
}

/** Digits after the decimal separator in a cell's text ("1.018" → 3, "5,62" → 2). */
export function decimalsOf(text: string): number {
  const m = /[.,](\d+)/.exec(text);
  return m ? m[1].length : 0;
}

/** The number as displayed ("5,62" → 5.62); falls back to the value when the text has units. */
function shown(m: Measurement, value: number): number {
  const t = m.raw.trim();
  return /^[+-]?\d+(?:[.,]\d+)?$/.test(t) ? Number(t.replace(",", ".")) : value;
}

/** How far a value sits outside the range (0 = inside). */
export function distanceFromRange(v: number, range: ReferenceRange): number | null {
  switch (range.kind) {
    case "between":
      return v < range.low ? range.low - v : v > range.high ? v - range.high : 0;
    case "lt":
    case "lte":
      return Math.max(0, v - range.high);
    case "gt":
    case "gte":
      return Math.max(0, range.low - v);
    default:
      return null;
  }
}

/**
 * Change between the previous and latest result. Only plain numbers count —
 * a detection-limit value like "<9.0" has no exact size to subtract.
 * Tone is relative to the range: moving toward it is "better", away is "worse",
 * staying inside it is "neutral".
 */
export function trend(
  previous: Measurement | undefined,
  latest: Measurement | undefined,
  range: ReferenceRange,
): Trend | null {
  if (!previous || !latest) return null;
  if (previous.value.kind !== "number" || latest.value.kind !== "number") return null;

  const a = previous.value.numeric;
  const b = latest.value.numeric;
  const decimals = Math.max(decimalsOf(previous.raw), decimalsOf(latest.raw));
  // The size of the change is computed from the numbers as displayed, so it
  // adds up on screen (95 → 85 is "10", even if the exact values differ by 9.3).
  const diff = Number((shown(latest, b) - shown(previous, a)).toFixed(decimals));
  if (diff === 0) return null;

  const direction = diff > 0 ? "up" : "down";
  const amount = Math.abs(diff).toFixed(decimals);

  let tone: TrendTone = "neutral";
  // Inside/outside comes from flagStatus so strict bounds agree with the status pill
  // (1.30 is *outside* ">1.3"); the distance only says by how much.
  const gap = (m: Measurement, v: number): number | null => {
    const d = distanceFromRange(v, range);
    if (d === null) return null;
    return flagStatus(m.value, range) === "normal" ? 0 : Math.max(d, Number.EPSILON);
  };
  const da = gap(previous, a);
  const db = gap(latest, b);
  if (da !== null && db !== null && !(da === 0 && db === 0)) {
    tone = db < da ? "better" : db > da ? "worse" : "neutral";
  }

  const crossing: Trend["crossing"] =
    da !== null && db !== null && da > 0 && db === 0
      ? "into"
      : da !== null && db !== null && da === 0 && db > 0
        ? "outOf"
        : null;
  return { direction, amount, tone, crossing };
}
