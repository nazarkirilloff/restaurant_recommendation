import type { CellValue } from "../types";

const NUM = String.raw`[+-]?\d+(?:[.,]\d+)?`;
const OPERATOR_RE = new RegExp(String.raw`^(<=|>=|<|>|≤|≥)\s*(${NUM})$`);
const NUMBER_RE = new RegExp(String.raw`^(${NUM})$`);
// A number followed only by a unit, e.g. "5.2 mmol/L". Anything with digits or
// brackets after the number ("2–3 per HPF", "0.5 mmol/L (+)") stays qualitative.
const NUMBER_WITH_UNIT_RE = new RegExp(String.raw`^(${NUM})\s*([^\d()]+)$`);

export function toNumber(text: string): number {
  return Number(text.replace(",", "."));
}

function normalizeOp(op: string): "<" | ">" | "≤" | "≥" {
  if (op === "<=") return "≤";
  if (op === ">=") return "≥";
  return op as "<" | ">" | "≤" | "≥";
}

/** Classifies one result cell from the spreadsheet. */
export function parseValue(cell: unknown): CellValue {
  if (cell == null) return { kind: "empty" };

  if (typeof cell === "number") {
    if (!Number.isFinite(cell)) return { kind: "empty" };
    return { kind: "number", numeric: cell, text: String(cell) };
  }

  const text = String(cell).trim();
  if (text === "") return { kind: "empty" };

  let m = OPERATOR_RE.exec(text);
  if (m) {
    return { kind: "operator", op: normalizeOp(m[1]), numeric: toNumber(m[2]), text };
  }

  m = NUMBER_RE.exec(text);
  if (m) return { kind: "number", numeric: toNumber(m[1]), text };

  m = NUMBER_WITH_UNIT_RE.exec(text);
  if (m && /\p{L}|%|\//u.test(m[2])) {
    return { kind: "number", numeric: toNumber(m[1]), text };
  }

  return { kind: "qualitative", text };
}
