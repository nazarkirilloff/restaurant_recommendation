import * as XLSX from "xlsx";
import type { ParseResult } from "../types";
import { parseWorkbook } from "./parseWorkbook";

const MAX_BYTES = 20 * 1024 * 1024;
const SPREADSHEET_EXT = new Set(["xlsx", "xlsm", "xls", "numbers"]);

function extension(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** Reads an uploaded file in the browser. Nothing leaves the page. */
export async function parseFile(file: File): Promise<ParseResult> {
  const ext = extension(file.name);

  if (!SPREADSHEET_EXT.has(ext) && ext !== "csv") {
    return {
      ok: false,
      code: "unsupportedType",
      ext,
      message: `Unsupported file type${ext ? ` “.${ext}”` : ""}.`,
      detail: "Upload an .xlsx, .numbers or .csv file.",
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      code: "tooLarge",
      message: "This file is too large.",
      detail: "Lab result files are usually well under 20 MB.",
    };
  }

  try {
    let wb: XLSX.WorkBook;
    if (ext === "csv") {
      // Decode ourselves so Cyrillic survives; raw keeps every cell as text.
      // SheetJS detects "," vs ";" separators.
      const text = decodeText(new Uint8Array(await file.arrayBuffer()));
      wb = XLSX.read(text, { type: "string", raw: true });
    } else {
      // cellNF exposes number formats, so date-formatted header cells are recognized.
      wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellNF: true });
    }
    return parseWorkbook(wb, file.name);
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
  return text.replace(/^\uFEFF/, "");
}
