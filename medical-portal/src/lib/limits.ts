import type { ParseResult } from "../types";

// Kept free of SheetJS imports so the page can check a file before handing it
// to the parse worker without bundling the parser into the main thread.

/**
 * Limits that keep a malformed or malicious file from exhausting the tab.
 * Real lab workbooks are far smaller (the sample: 4 sheets, 79 rows, 14 columns).
 */
export const LIMITS = {
  maxBytes: 20 * 1024 * 1024,
  maxSheets: 50,
  maxRows: 5_000,
  maxCols: 300,
};

const SPREADSHEET_EXT = new Set(["xlsx", "xlsm", "xls", "numbers"]);

type Failure = Extract<ParseResult, { ok: false }>;

export function extension(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** Checks that need only the name and size; null when the file may be read. */
export function precheck(name: string, size: number): Failure | null {
  const ext = extension(name);
  if (!SPREADSHEET_EXT.has(ext) && ext !== "csv") {
    return {
      ok: false,
      code: "unsupportedType",
      ext,
      message: `Unsupported file type${ext ? ` “.${ext}”` : ""}.`,
      detail: "Upload an .xlsx, .numbers or .csv file.",
    };
  }
  if (size > LIMITS.maxBytes) {
    return {
      ok: false,
      code: "tooLarge",
      message: "This file is too large.",
      detail: "Lab result files are usually well under 20 MB.",
    };
  }
  return null;
}

