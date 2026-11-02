import type { CellValue, Marker, Measurement, ParsedWorkbook, ReferenceRange } from "../types";
import { markerKey } from "./markerKey";

export type UnitSystem = "si" | "us";

interface Conversion {
  /** Normalized SI unit the file must use for this marker. */
  from: string;
  /** Conventional (US) unit shown after conversion. */
  to: string;
  factor: number;
  /** Decimals shown for converted values. */
  decimals: number;
}

const MMOL_TO_MGDL_CHOL: Omit<Conversion, "decimals"> = { from: "mmol/l", to: "mg/dL", factor: 38.67 };

/** SI → conventional factors (standard clinical conversion factors). */
const CONVERSIONS: Record<string, Conversion> = {
  "total cholesterol": { ...MMOL_TO_MGDL_CHOL, decimals: 0 },
  "ldl cholesterol": { ...MMOL_TO_MGDL_CHOL, decimals: 0 },
  "hdl cholesterol": { ...MMOL_TO_MGDL_CHOL, decimals: 0 },
  "non hdl cholesterol": { ...MMOL_TO_MGDL_CHOL, decimals: 0 },
  triglycerides: { from: "mmol/l", to: "mg/dL", factor: 88.57, decimals: 0 },
  "glucose fasting": { from: "mmol/l", to: "mg/dL", factor: 18.016, decimals: 0 },
  apob: { from: "g/l", to: "mg/dL", factor: 100, decimals: 0 },
  creatinine: { from: "µmol/l", to: "mg/dL", factor: 1 / 88.42, decimals: 2 },
  "uric acid": { from: "µmol/l", to: "mg/dL", factor: 1 / 59.48, decimals: 1 },
  urea: { from: "mmol/l", to: "mg/dL BUN", factor: 2.801, decimals: 1 },
  "total bilirubin": { from: "µmol/l", to: "mg/dL", factor: 1 / 17.104, decimals: 2 },
  "vitamin d 25 oh": { from: "nmol/l", to: "ng/mL", factor: 1 / 2.496, decimals: 0 },
  "testosterone total": { from: "nmol/l", to: "ng/dL", factor: 28.842, decimals: 0 },
  "free testosterone": { from: "pmol/l", to: "pg/mL", factor: 1 / 3.467, decimals: 0 },
  estradiol: { from: "pmol/l", to: "pg/mL", factor: 1 / 3.671, decimals: 0 },
  "cortisol morning": { from: "nmol/l", to: "µg/dL", factor: 1 / 27.59, decimals: 1 },
  "iron serum": { from: "µmol/l", to: "µg/dL", factor: 5.585, decimals: 0 },
  "magnesium serum": { from: "mmol/l", to: "mg/dL", factor: 2.431, decimals: 2 },
  hemoglobin: { from: "g/l", to: "g/dL", factor: 0.1, decimals: 1 },
  mchc: { from: "g/l", to: "g/dL", factor: 0.1, decimals: 1 },
  "total protein": { from: "g/l", to: "g/dL", factor: 0.1, decimals: 1 },
  albumin: { from: "g/l", to: "g/dL", factor: 0.1, decimals: 1 },
};

/** "ммоль/л", "mmol/L", "μmol/L", "umol/l" → "mmol/l" / "µmol/l". */
export function normalizeUnit(unit: string): string {
  return unit
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/μ|^u(?=mol)|мк/g, "µ")
    .replace(/ммоль/g, "mmol")
    .replace(/нмоль/g, "nmol")
    .replace(/пмоль/g, "pmol")
    .replace(/µмоль/g, "µmol")
    .replace(/моль/g, "mol")
    .replace(/г\/л/g, "g/l")
    .replace(/\/л$/, "/l");
}

function rangeUnitOf(r: ReferenceRange): string | undefined {
  return "unit" in r ? r.unit : undefined;
}

/** The conversion that applies to this marker, if its unit is the expected SI one. */
export function conversionFor(marker: Marker): Conversion | null {
  const c = CONVERSIONS[markerKey(marker.nameEn)];
  const unit = rangeUnitOf(marker.standard);
  if (!c || !unit || normalizeUnit(unit) !== c.from) return null;
  return c;
}

function fmt(n: number, decimals: number): string {
  return n.toFixed(decimals);
}

function convertValue(v: CellValue, c: Conversion): { value: CellValue; raw?: string } {
  if (v.kind === "number") {
    const numeric = v.numeric * c.factor;
    const raw = fmt(numeric, c.decimals);
    return { value: { kind: "number", numeric, text: raw }, raw };
  }
  if (v.kind === "operator") {
    const numeric = v.numeric * c.factor;
    const raw = `${v.op}${fmt(numeric, c.decimals)}`;
    return { value: { kind: "operator", op: v.op, numeric, text: raw }, raw };
  }
  return { value: v };
}

/**
 * Converts a numeric range. Bounds stay exact (so statuses never change);
 * only the display text is rounded. A range in some other unit is left alone.
 */
function convertRange(r: ReferenceRange, c: Conversion): ReferenceRange {
  const unit = rangeUnitOf(r);
  if (!unit || normalizeUnit(unit) !== c.from) return r;
  const note = r.note ? ` (${r.note})` : "";
  const d = (n: number) => fmt(n * c.factor, c.decimals);
  switch (r.kind) {
    case "between":
      return { ...r, low: r.low * c.factor, high: r.high * c.factor, unit: c.to, raw: `${d(r.low)}–${d(r.high)} ${c.to}${note}` };
    case "lt":
    case "lte":
      return { ...r, high: r.high * c.factor, unit: c.to, raw: `${r.kind === "lt" ? "<" : "≤"}${d(r.high)} ${c.to}${note}` };
    case "gt":
    case "gte":
      return { ...r, low: r.low * c.factor, unit: c.to, raw: `${r.kind === "gt" ? ">" : "≥"}${d(r.low)} ${c.to}${note}` };
    default:
      return r;
  }
}

export function convertMarker(marker: Marker, system: UnitSystem): Marker {
  if (system === "si") return marker;
  const c = conversionFor(marker);
  if (!c) return marker;
  return {
    ...marker,
    standard: convertRange(marker.standard, c),
    biohacker: convertRange(marker.biohacker, c),
    measurements: marker.measurements.map((m): Measurement => {
      const { value, raw } = convertValue(m.value, c);
      return { ...m, value, raw: raw ?? m.raw };
    }),
  };
}

/** The whole workbook in the chosen unit system (SI = as in the file). */
export function convertWorkbook(wb: ParsedWorkbook, system: UnitSystem): ParsedWorkbook {
  if (system === "si") return wb;
  return {
    ...wb,
    data: wb.data.map((s) => ({ ...s, markers: s.markers.map((m) => convertMarker(m, system)) })),
  };
}
