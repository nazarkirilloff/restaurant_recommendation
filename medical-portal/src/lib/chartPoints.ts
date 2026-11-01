import type { Marker } from "../types";

export interface ChartPoint {
  t: number;
  v: number;
  raw: string;
  /**
   * Set for detection-limit results ("<9.0", ">500"): the true value lies
   * beyond `v`, so charts draw it differently instead of as a real reading.
   */
  censored?: "below" | "above";
}

/** Plottable points of a marker, oldest first. Qualitative results are skipped. */
export function chartPoints(marker: Marker): ChartPoint[] {
  const out: ChartPoint[] = [];
  for (const m of marker.measurements) {
    if (m.value.kind === "number") {
      out.push({ t: m.date.getTime(), v: m.value.numeric, raw: m.raw });
    } else if (m.value.kind === "operator") {
      const below = m.value.op === "<" || m.value.op === "≤";
      out.push({
        t: m.date.getTime(),
        v: m.value.numeric,
        raw: m.raw,
        censored: below ? "below" : "above",
      });
    }
  }
  return out;
}
