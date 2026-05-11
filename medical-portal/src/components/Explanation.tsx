import type { Marker, Status } from "../types";
import { getExplanation } from "../data/markerExplanations";

interface Props {
  marker: Marker;
  status: Status;
}

export function Explanation({ marker, status }: Props) {
  const explanation = getExplanation(marker.nameEn);
  const biohackerNote =
    marker.biohacker.kind !== "none" ? marker.biohacker.note : undefined;
  const standardNote =
    marker.standard.kind !== "none" ? marker.standard.note : undefined;

  if (!explanation && !biohackerNote && !standardNote) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
      {explanation && (
        <p>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            What it is.
          </span>{" "}
          {explanation.summary}
        </p>
      )}
      {explanation?.high && status === "high" && (
        <p className="mt-2">
          <span className="font-medium text-rose-700 dark:text-rose-300">
            Above range.
          </span>{" "}
          {explanation.high}
        </p>
      )}
      {explanation?.low && status === "low" && (
        <p className="mt-2">
          <span className="font-medium text-rose-700 dark:text-rose-300">
            Below range.
          </span>{" "}
          {explanation.low}
        </p>
      )}
      {(standardNote || biohackerNote) && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {standardNote && (
            <span>
              <span className="font-medium">Standard note:</span> {standardNote}
              {biohackerNote ? " · " : ""}
            </span>
          )}
          {biohackerNote && (
            <span>
              <span className="font-medium">Biohacker note:</span> {biohackerNote}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
