import type { CellValue, ReferenceRange, Status } from "../types";

export type Tone = "ok" | "bad" | "warn" | "info" | "muted";

/** An interval with open/closed ends. Infinite ends are always open. */
interface Interval {
  lo: number;
  loOpen: boolean;
  hi: number;
  hiOpen: boolean;
}

function normalInterval(range: ReferenceRange): Interval | null {
  switch (range.kind) {
    case "between":
      return { lo: range.low, loOpen: false, hi: range.high, hiOpen: false };
    case "lt":
      return { lo: -Infinity, loOpen: true, hi: range.high, hiOpen: true };
    case "lte":
      return { lo: -Infinity, loOpen: true, hi: range.high, hiOpen: false };
    case "gt":
      return { lo: range.low, loOpen: true, hi: Infinity, hiOpen: true };
    case "gte":
      return { lo: range.low, loOpen: false, hi: Infinity, hiOpen: true };
    default:
      return null;
  }
}

/**
 * The set of values a result can stand for. A plain number is a point; "<9.0"
 * (below the detection limit) means somewhere in [0, 9.0) — lab concentrations
 * are never negative.
 */
function valueInterval(value: CellValue): Interval | null {
  if (value.kind === "number") {
    return { lo: value.numeric, loOpen: false, hi: value.numeric, hiOpen: false };
  }
  if (value.kind === "operator") {
    const n = value.numeric;
    switch (value.op) {
      case "<":
        return { lo: Math.min(0, n), loOpen: false, hi: n, hiOpen: true };
      case "≤":
        return { lo: Math.min(0, n), loOpen: false, hi: n, hiOpen: false };
      case ">":
        return { lo: n, loOpen: true, hi: Infinity, hiOpen: true };
      case "≥":
        return { lo: n, loOpen: false, hi: Infinity, hiOpen: true };
    }
  }
  return null;
}

function entirelyBelow(v: Interval, n: Interval): boolean {
  return v.hi < n.lo || (v.hi === n.lo && (v.hiOpen || n.loOpen));
}

function entirelyAbove(v: Interval, n: Interval): boolean {
  return v.lo > n.hi || (v.lo === n.hi && (v.loOpen || n.hiOpen));
}

function inside(v: Interval, n: Interval): boolean {
  const lowerOk = v.lo > n.lo || (v.lo === n.lo && (!n.loOpen || v.loOpen));
  const upperOk = v.hi < n.hi || (v.hi === n.hi && (!n.hiOpen || v.hiOpen));
  return lowerOk && upperOk;
}

function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+]+/gu, " ")
    .trim();
}

const NEGATIVE_WORDS = [
  "negative",
  "not detected",
  "absent",
  "none",
  "neg",
  "nil",
  "not found",
  "no",
  "не виявлено",
  "негативний",
  "відсутні",
];

const NORMAL_WORDS = ["normal", "norm", "within range", "within normal limits", "норма"];

// Colors labs commonly report that fall inside "light yellow to yellow".
const COLOR_SYNONYMS: Record<string, string> = {
  straw: "yellow",
  "straw yellow": "yellow",
  "pale yellow": "yellow",
  "light yellow": "yellow",
};

function isNegative(text: string): boolean {
  const t = norm(text);
  return NEGATIVE_WORDS.includes(t);
}

/** Does a qualitative result agree with the expected qualitative reference? */
export function matchesExpected(valueText: string, expectedText: string): boolean {
  const v = norm(valueText);
  const e = norm(expectedText);
  if (!v || !e) return false;
  if (v === e) return true;

  if (isNegative(e)) return isNegative(v);

  // Ranges of descriptive values, e.g. "Light yellow to yellow".
  if (/\bto\b/.test(e)) {
    const options = e.split(/\bto\b/).map((s) => s.trim());
    const candidate = COLOR_SYNONYMS[v] ?? v;
    if (options.some((o) => o === v || o === candidate || o.endsWith(` ${candidate}`))) {
      return true;
    }
  }
  return false;
}

/**
 * Status of one result against one reference range.
 * Numeric: low / normal / high (or unknown when a censored value like "<50"
 * can't be placed against "<34"). Qualitative: match / mismatch.
 */
export function flagStatus(value: CellValue, range: ReferenceRange): Status {
  if (value.kind === "empty") return "unknown";
  if (range.kind === "constant") return "info";

  if (range.kind === "qualitative") {
    if (value.kind === "qualitative") {
      return matchesExpected(value.text, range.expected) ? "match" : "mismatch";
    }
    // A number against "Negative"/"Not detected": zero is the only agreeing value.
    if (isNegative(range.expected) && value.kind === "number") {
      return value.numeric === 0 ? "match" : "mismatch";
    }
    return "unknown";
  }

  if (range.kind === "none") {
    return value.kind === "qualitative" ? "info" : "unknown";
  }

  const n = normalInterval(range);
  if (!n) return "unknown";

  if (value.kind === "qualitative") {
    if (NORMAL_WORDS.includes(norm(value.text))) return "normal";
    return "unknown";
  }

  const v = valueInterval(value);
  if (!v) return "unknown";
  if (inside(v, n)) return "normal";
  if (entirelyBelow(v, n)) return "low";
  if (entirelyAbove(v, n)) return "high";
  return "unknown";
}

export function statusLabel(status: Status): string {
  switch (status) {
    case "low":
      return "Low";
    case "high":
      return "High";
    case "normal":
      return "In range";
    case "match":
      return "As expected";
    case "mismatch":
      return "Unexpected";
    case "borderline":
      return "Borderline";
    case "info":
      return "Info";
    case "unknown":
      return "No verdict";
  }
}

export function statusTone(status: Status): Tone {
  switch (status) {
    case "normal":
    case "match":
      return "ok";
    case "low":
    case "high":
      return "bad";
    case "mismatch":
    case "borderline":
      return "warn";
    case "info":
      return "info";
    case "unknown":
      return "muted";
  }
}
