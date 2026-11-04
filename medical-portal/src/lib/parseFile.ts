import * as XLSX from "xlsx";
import type { ParseResult } from "../types";
import { parseWorkbook } from "./parseWorkbook";

import { LIMITS, extension, precheck } from "./limits";

export { LIMITS, precheck };

type Failure = Extract<ParseResult, { ok: false }>;

function tooComplex(detail: string): Failure {
  return { ok: false, code: "tooComplex", message: "This file is too big to analyse.", detail };
}

/** Rejects workbooks beyond LIMITS (uses the full size SheetJS records before truncating). */
function checkShape(wb: XLSX.WorkBook): Failure | null {
  if (wb.SheetNames.length > LIMITS.maxSheets) {
    return tooComplex(`${wb.SheetNames.length} sheets (limit ${LIMITS.maxSheets}).`);
  }
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const ref = ws?.["!fullref"] ?? ws?.["!ref"];
    if (!ref) continue;
    const r = XLSX.utils.decode_range(ref);
    const rows = r.e.r - r.s.r + 1;
    const cols = r.e.c - r.s.c + 1;
    if (rows > LIMITS.maxRows) return tooComplex(`${rows} rows in a sheet (limit ${LIMITS.maxRows}).`);
    if (cols > LIMITS.maxCols) return tooComplex(`${cols} columns in a sheet (limit ${LIMITS.maxCols}).`);
  }
  return null;
}

/**
 * Parses file bytes. Synchronous and DOM-free, so it runs inside the parse
 * worker (see parseSafely.ts) as well as in tests.
 */
export function parseBytes(name: string, bytes: ArrayBuffer): ParseResult {
  const pre = precheck(name, bytes.byteLength);
  if (pre) return pre;
  const ext = extension(name);
  // Stop reading a sheet just past the row limit; the full size stays in !fullref.
  const sheetRows = LIMITS.maxRows + 1;
  try {
    let wb: XLSX.WorkBook;
    if (ext === "csv") {
      // Decode ourselves so Cyrillic survives; raw keeps every cell as text.
      // SheetJS detects "," vs ";" separators.
      wb = XLSX.read(decodeText(new Uint8Array(bytes)), { type: "string", raw: true, sheetRows });
    } else {
      // cellNF exposes number formats, so date-formatted header cells are recognized.
      wb = XLSX.read(bytes, { type: "array", cellNF: true, sheetRows });
    }
    return checkShape(wb) ?? parseWorkbook(wb, name);
  } catch (err) {
    return {
      ok: false,
      code: ext === "numbers" ? "numbersUnreadable" : "unreadable",
      message: "Could not read this file.",
      detail:
        ext === "numbers"
          ? "In Numbers choose File → Export To → Excel…, then upload that file."
          : err instanceof Error
            ? err.message
            : String(err),
    };
  }
}

/** Reads a file on the current thread (tests, and the fallback when workers are unavailable). */
export async function parseFile(file: File): Promise<ParseResult> {
  return precheck(file.name, file.size) ?? parseBytes(file.name, await file.arrayBuffer());
}

/**
 * CSV bytes → text. UTF-8 when valid; otherwise Windows-1251, which is what
 * Excel writes for "CSV" on Ukrainian/Russian Windows.
 */
export function decodeText(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1251").decode(bytes);
  }
  return text.replace(/^﻿/, "");
}
