import type { Marker, Measurement, ParsedWorkbook, RangeMode, ReferenceRange, Status } from "../types";
import { flagStatus } from "./flagStatus";
import { activeRange, isOutOfRange } from "./ranges";
import { trend, type Trend } from "./trend";

export interface ReportItem {
  marker: Marker;
  range: ReferenceRange;
  /** Judged by the standard range because there's no biohacker target. */
  fellBack: boolean;
  latest: Measurement;
  status: Status;
  previous?: Measurement;
  previousStatus?: Status;
  change: Trend | null;
}

export interface SheetReport {
  sheet: string;
  latestDate: Date | null;
  /** Latest result out of range or unexpected. */
  attention: ReportItem[];
  /** Out of range / unexpected at the previous test, fine now. */
  backInRange: ReportItem[];
  /** Markers whose latest result is fine (and weren't just fixed). */
  okCount: number;
  /** Markers with no verdict (no range, info only). */
  otherCount: number;
}

const isProblem = (s: Status) => isOutOfRange(s) || s === "mismatch";
const isFine = (s: Status) => s === "normal" || s === "match";

function item(marker: Marker, mode: RangeMode): ReportItem | null {
  const { range, fellBack } = activeRange(marker, mode);
  const n = marker.measurements.length;
  const latest = marker.measurements[n - 1];
  if (!latest) return null;
  const previous = marker.measurements[n - 2];
  return {
    marker,
    range,
    fellBack,
    latest,
    status: flagStatus(latest.value, range),
    previous,
    previousStatus: previous ? flagStatus(previous.value, range) : undefined,
    change: trend(previous, latest, range),
  };
}

/** What a doctor needs from the workbook: problems first, recent fixes, and counts. */
export function buildReport(workbook: ParsedWorkbook, mode: RangeMode): SheetReport[] {
  return workbook.data.map((sheet) => {
    const report: SheetReport = {
      sheet: sheet.name,
      latestDate: sheet.dates[sheet.dates.length - 1] ?? null,
      attention: [],
      backInRange: [],
      okCount: 0,
      otherCount: 0,
    };
    for (const marker of sheet.markers) {
      const it = item(marker, mode);
      if (!it) continue;
      if (isProblem(it.status)) report.attention.push(it);
      else if (isFine(it.status) && it.previousStatus && isProblem(it.previousStatus)) {
        report.backInRange.push(it);
      } else if (isFine(it.status)) report.okCount++;
      else report.otherCount++;
    }
    return report;
  });
}
