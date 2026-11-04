export type RangeMode = "standard" | "biohacker";

export type ReferenceRange =
  | {
      kind: "between";
      low: number;
      high: number;
      unit?: string;
      note?: string;
      raw: string;
    }
  | {
      kind: "lt" | "lte";
      high: number;
      unit?: string;
      note?: string;
      raw: string;
    }
  | {
      kind: "gt" | "gte";
      low: number;
      unit?: string;
      note?: string;
      raw: string;
    }
  | {
      kind: "qualitative";
      expected: string;
      note?: string;
      raw: string;
    }
  | {
      kind: "constant";
      note?: string;
      raw: string;
    }
  | {
      kind: "none";
      /** e.g. "past infection — immunity" from "N/A (past infection — immunity)". */
      note?: string;
      raw: string;
    };

export type CellValue =
  | { kind: "number"; numeric: number; text: string }
  | { kind: "operator"; op: "<" | ">" | "≤" | "≥"; numeric: number; text: string }
  | { kind: "qualitative"; text: string }
  | { kind: "empty" };

export type Status =
  | "low"
  | "normal"
  | "high"
  | "match"
  | "mismatch"
  | "borderline"
  | "info"
  | "unknown";

export interface Measurement {
  date: Date;
  raw: string;
  value: CellValue;
}

export interface Marker {
  nameEn: string;
  nameUa: string;
  category: string;
  standard: ReferenceRange;
  biohacker: ReferenceRange;
  measurements: Measurement[];
}

export interface DataSheet {
  name: string;
  markers: Marker[];
  categories: string[];
  dates: Date[];
}

export interface InfoSheet {
  name: string;
  lines: string[];
}

export interface ParsedWorkbook {
  fileName: string;
  data: DataSheet[];
  info: InfoSheet[];
}

export type ParseErrorCode =
  | "unsupportedType"
  | "tooLarge"
  | "unreadable"
  | "numbersUnreadable"
  | "noResultSheets"
  | "tooComplex"
  | "timeout";

export type ParseResult =
  | { ok: true; workbook: ParsedWorkbook }
  | {
      ok: false;
      /** Stable identifier; the UI shows a translated message for it. */
      code: ParseErrorCode;
      /** English message (logs, tests). */
      message: string;
      detail?: string;
      /** File extension, for unsupportedType. */
      ext?: string;
    };
