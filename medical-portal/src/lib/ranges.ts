import type { Marker, RangeMode, ReferenceRange, Status } from "../types";
import { flagStatus } from "./flagStatus";

export interface ActiveRange {
  /** The range results are judged against. */
  range: ReferenceRange;
  /** Which column it came from. */
  source: RangeMode;
  /** Biohacker mode was asked for, but this marker has no biohacker target. */
  fellBack: boolean;
  /** The other column's range, if it has one (drawn as dashed lines on charts). */
  other?: ReferenceRange;
}

/**
 * The single place that decides which reference range applies to a marker.
 * In biohacker mode a marker without a biohacker target (e.g. "N/A") is judged
 * by its standard range, and `fellBack` says so.
 */
export function activeRange(marker: Marker, mode: RangeMode): ActiveRange {
  const hasBio = marker.biohacker.kind !== "none";
  const hasStd = marker.standard.kind !== "none";
  if (mode === "biohacker" && hasBio) {
    return {
      range: marker.biohacker,
      source: "biohacker",
      fellBack: false,
      other: hasStd ? marker.standard : undefined,
    };
  }
  return {
    range: marker.standard,
    source: "standard",
    fellBack: mode === "biohacker",
    other: mode === "standard" && hasBio ? marker.biohacker : undefined,
  };
}

/** Status of the most recent result under the given mode. */
export function latestStatus(marker: Marker, mode: RangeMode): Status {
  const latest = marker.measurements[marker.measurements.length - 1];
  return latest ? flagStatus(latest.value, activeRange(marker, mode).range) : "unknown";
}

export function isOutOfRange(status: Status): boolean {
  return status === "high" || status === "low";
}
