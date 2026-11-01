import * as XLSX from "xlsx";
import type { ParseResult } from "../types";
import { parseWorkbook } from "./parseWorkbook";

const MAX_BYTES = 20 * 1024 * 1024;
const SPREADSHEET_EXT = new Set(["xlsx", "xlsm", "xls"]);

function extension(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** Reads an uploaded file in the browser. Nothing leaves the page. */
export async function parseFile(file: File): Promise<ParseResult> {
  const ext = extension(file.name);

  if (ext === "numbers") {
    return {
      ok: false,
      message: "Apple Numbers files can't be read directly yet.",
      detail: "In Numbers choose File → Export To → Excel… (or CSV…), then upload that file.",
    };
  }
  if (!SPREADSHEET_EXT.has(ext) && ext !== "csv") {
    return {
      ok: false,
      message: `Unsupported file type${ext ? ` “.${ext}”` : ""}.`,
      detail: "Upload an .xlsx or .csv file.",
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: "This file is too large.",
      detail: "Lab result files are usually well under 20 MB.",
    };
  }

  try {
    let wb: XLSX.WorkBook;
    if (ext === "csv") {
      // Decode as UTF-8 ourselves so Cyrillic names survive; raw keeps every cell as text.
      const text = await file.text();
      wb = XLSX.read(text.replace(/^﻿/, ""), { type: "string", raw: true });
    } else {
      wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    }
    return parseWorkbook(wb, file.name);
  } catch (err) {
    return {
      ok: false,
      message: "Could not read this file.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
