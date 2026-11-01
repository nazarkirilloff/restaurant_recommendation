import * as XLSX from "xlsx";
import type { DataSheet, InfoSheet, Marker, Measurement, ParseResult } from "../types";
import { localDate, parseDateText } from "./format";
import { parseValue } from "./parseValue";
import { isNumericRange, parseReferenceRange } from "./parseReferenceRange";

type Role = "nameEn" | "nameUa" | "category" | "standard" | "biohacker";

const ROLE_PATTERNS: [Role, RegExp][] = [
  ["nameUa", /^(marker|name|test)\s*\(?(ua|uk|укр)\)?$|^назва|^показник/i],
  ["nameEn", /^(marker|name|test|analyte|parameter)(\s*name)?\s*\(?(en)?\)?$/i],
  ["category", /^(category|panel|group|категорія|група)$/i],
  ["biohacker", /biohacker|optimal|target|оптимал/i],
  ["standard", /^(reference|ref\.?|norm|range|норма|референс)/i],
];

const MAX_HEADER_SCAN = 10;

interface Cell {
  v: unknown;
  t?: string;
  w?: string;
  z?: string | number;
}

function cellAt(ws: XLSX.WorkSheet, r: number, c: number): Cell | undefined {
  return ws[XLSX.utils.encode_cell({ r, c })] as Cell | undefined;
}

function cellText(cell: Cell | undefined): string {
  if (!cell || cell.v == null) return "";
  if (cell.v instanceof Date) return cell.v.toISOString().slice(0, 10);
  if (typeof cell.v === "number") return cleanNumber(cell.v);
  // Collapse runs of whitespace, including non-breaking spaces from copy-paste.
  return String(cell.v).replace(/\s+/g, " ").trim();
}

/** 4.859999999999999 → "4.86": hides binary floating-point noise. */
function cleanNumber(n: number): string {
  return String(Number(n.toPrecision(12)));
}

/** What the cell shows: Excel's formatted text when present, else the cleaned value. */
function displayText(cell: Cell | undefined): string {
  if (cell?.t === "n" && cell.w) return cell.w.trim();
  return cellText(cell);
}

/** A header cell is a date if it is an Excel date serial or ISO / dd.mm.yyyy text. */
function headerDate(cell: Cell | undefined): Date | null {
  if (!cell || cell.v == null) return null;
  if (typeof cell.v === "number") {
    const fmt = typeof cell.z === "string" ? cell.z : undefined;
    const looksLikeSerial = cell.v > 20000 && cell.v < 80000; // ~1954–2119
    if ((fmt && XLSX.SSF.is_date(fmt)) || (cell.t === "d") || (!fmt && looksLikeSerial)) {
      // Header dates are calendar days. Snap serials a few seconds short of
      // midnight (a known SheetJS write artifact in some time zones) to that day.
      const day = cell.v % 1 > 1 - 1 / 1440 ? Math.ceil(cell.v) : Math.floor(cell.v);
      const p = XLSX.SSF.parse_date_code(day);
      return p ? localDate(p.y, p.m, p.d) : null;
    }
    return null;
  }
  if (cell.v instanceof Date) {
    return localDate(cell.v.getFullYear(), cell.v.getMonth() + 1, cell.v.getDate());
  }
  return parseDateText(String(cell.v));
}

interface Layout {
  headerRow: number;
  columns: Partial<Record<Role, number>>;
  dateColumns: { col: number; date: Date }[];
}

function detectLayout(ws: XLSX.WorkSheet, range: XLSX.Range): Layout | null {
  const lastScan = Math.min(range.e.r, range.s.r + MAX_HEADER_SCAN);
  for (let r = range.s.r; r <= lastScan; r++) {
    const columns: Partial<Record<Role, number>> = {};
    const dateColumns: { col: number; date: Date }[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = cellAt(ws, r, c);
      const date = headerDate(cell);
      if (date) {
        dateColumns.push({ col: c, date });
        continue;
      }
      const text = cellText(cell);
      if (!text) continue;
      for (const [role, re] of ROLE_PATTERNS) {
        if (columns[role] === undefined && re.test(text)) {
          columns[role] = c;
          break;
        }
      }
    }
    if (columns.nameEn !== undefined && dateColumns.length > 0) {
      return { headerRow: r, columns, dateColumns };
    }
  }
  return null;
}

function readInfoSheet(name: string, ws: XLSX.WorkSheet, range: XLSX.Range): InfoSheet {
  const lines: string[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const parts: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const t = cellText(cellAt(ws, r, c));
      if (t) parts.push(t);
    }
    if (parts.length) lines.push(parts.join("  "));
  }
  return { name, lines };
}

function readDataSheet(
  name: string,
  ws: XLSX.WorkSheet,
  range: XLSX.Range,
  layout: Layout,
): DataSheet {
  const { columns, dateColumns } = layout;
  const markers: Marker[] = [];
  const categories: string[] = [];
  const usedDates = new Map<number, Date>();

  const text = (r: number, role: Role) =>
    columns[role] === undefined ? "" : cellText(cellAt(ws, r, columns[role]!));

  for (let r = layout.headerRow + 1; r <= range.e.r; r++) {
    const nameEn = text(r, "nameEn");
    if (!nameEn) continue;

    const standard = parseReferenceRange(text(r, "standard"));
    const biohacker = parseReferenceRange(text(r, "biohacker"));
    // Biohacker targets are often written without a unit (">90 (higher = better)").
    if (isNumericRange(biohacker) && isNumericRange(standard)) {
      const b = biohacker as { unit?: string };
      const s = standard as { unit?: string };
      if (!b.unit && s.unit) b.unit = s.unit;
    }

    const measurements: Measurement[] = [];
    for (const { col, date } of dateColumns) {
      const cell = cellAt(ws, r, col);
      const value = parseValue(cell?.v);
      if (value.kind === "empty") continue;
      measurements.push({ date, raw: displayText(cell), value });
    }
    measurements.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Section labels such as "ЛІПІДИ / LIPIDS": a name and nothing else.
    const categoryText = text(r, "category");
    if (
      measurements.length === 0 &&
      !categoryText &&
      standard.kind === "none" &&
      biohacker.kind === "none"
    ) {
      continue;
    }
    for (const m of measurements) usedDates.set(m.date.getTime(), m.date);

    const category = categoryText || name;
    if (!categories.includes(category)) categories.push(category);

    markers.push({
      nameEn,
      nameUa: text(r, "nameUa"),
      category,
      standard,
      biohacker,
      measurements,
    });
  }

  const dates = [...usedDates.values()].sort((a, b) => a.getTime() - b.getTime());
  return { name, markers, categories, dates };
}

/** Turns a SheetJS workbook into result sheets (wide layout) and info sheets. */
export function parseWorkbook(wb: XLSX.WorkBook, fileName: string): ParseResult {
  const data: DataSheet[] = [];
  const info: InfoSheet[] = [];

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const layout = detectLayout(ws, range);
    if (layout) {
      const sheet = readDataSheet(name, ws, range, layout);
      if (sheet.markers.length > 0) data.push(sheet);
    } else {
      const sheet = readInfoSheet(name, ws, range);
      if (sheet.lines.length > 0) info.push(sheet);
    }
  }

  if (data.length === 0) {
    return {
      ok: false,
      message: "No result sheets found in this file.",
      detail:
        "Expected a header row with a marker-name column (e.g. “Marker EN”) followed by date columns such as 2024-03-11, one row per marker.",
    };
  }

  return { ok: true, workbook: { fileName, data, info } };
}
