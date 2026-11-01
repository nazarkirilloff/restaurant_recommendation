import type { ReferenceRange } from "../types";
import { toNumber } from "./parseValue";

const NUM = String.raw`[+-]?\d+(?:[.,]\d+)?`;
const OP_RE = new RegExp(String.raw`^(<=|>=|<|>|≤|≥)\s*(${NUM})\s*(.*)$`);
const BETWEEN_RE = new RegExp(String.raw`^(${NUM})\s*(?:–|—|-|to)\s*(${NUM})\s*(.*)$`, "i");

/** Splits "<5.0 mmol/L (men) (fasting)" into body "<5.0 mmol/L" and note "men; fasting". */
function splitNotes(raw: string): { body: string; note?: string } {
  const notes: string[] = [];
  const body = raw
    .replace(/\(([^()]*)\)/g, (_, inner: string) => {
      if (inner.trim()) notes.push(inner.trim());
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { body, note: notes.length ? notes.join("; ") : undefined };
}

/**
 * Parses a reference-range cell. Recognized forms:
 *   "3.9–5.6 mmol/L", "0-16 µmol/L", "<5.0 mmol/L", "≥75 nmol/L", ">90 (higher = better)",
 *   "Negative", "Not detected", "Light yellow to yellow", "Constant per individual", "N/A (…)".
 * Parenthetical annotations are moved to `note`.
 */
export function parseReferenceRange(input: unknown): ReferenceRange {
  const raw = input == null ? "" : String(input).trim();
  if (raw === "" || /^n\/?a\b/i.test(raw) || raw === "—" || raw === "-") {
    return { kind: "none", raw };
  }

  const { body, note } = splitNotes(raw);

  if (/constant/i.test(body)) return { kind: "constant", note, raw };

  let m = OP_RE.exec(body);
  if (m) {
    const value = toNumber(m[2]);
    const unit = m[3].trim() || undefined;
    switch (m[1]) {
      case "<":
        return { kind: "lt", high: value, unit, note, raw };
      case "<=":
      case "≤":
        return { kind: "lte", high: value, unit, note, raw };
      case ">":
        return { kind: "gt", low: value, unit, note, raw };
      default:
        return { kind: "gte", low: value, unit, note, raw };
    }
  }

  m = BETWEEN_RE.exec(body);
  if (m) {
    let low = toNumber(m[1]);
    let high = toNumber(m[2]);
    if (low > high) [low, high] = [high, low];
    return { kind: "between", low, high, unit: m[3].trim() || undefined, note, raw };
  }

  return { kind: "qualitative", expected: body || raw, note, raw };
}

/** Display text for a range, without annotations: "3.9–5.6 mmol/L", "<5.0 mmol/L". */
export function formatRange(range: ReferenceRange): string {
  switch (range.kind) {
    case "none":
      return "—";
    case "constant":
      return "Constant";
    case "qualitative":
      return range.expected;
    default: {
      // Use the file's own text so precision is preserved ("5.0", not "5").
      const body = splitNotes(range.raw)
        .body.replace(/(\d)\s*-\s*(\d)/, "$1–$2")
        .replace(/^<=/, "≤")
        .replace(/^>=/, "≥");
      // The unit may have been inherited from the other range column.
      if (range.unit && !body.includes(range.unit)) return `${body} ${range.unit}`;
      return body;
    }
  }
}

/** Unit of a numeric range, if the file states one. */
export function rangeUnit(range: ReferenceRange): string | undefined {
  switch (range.kind) {
    case "between":
    case "lt":
    case "lte":
    case "gt":
    case "gte":
      return range.unit;
    default:
      return undefined;
  }
}

export function isNumericRange(range: ReferenceRange): boolean {
  return (
    range.kind === "between" ||
    range.kind === "lt" ||
    range.kind === "lte" ||
    range.kind === "gt" ||
    range.kind === "gte"
  );
}
