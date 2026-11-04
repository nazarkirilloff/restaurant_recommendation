import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { DataSheet, Marker, ParsedWorkbook } from "../types";
import { getExplanation } from "../data/markerExplanations";
import { flagStatus } from "./flagStatus";
import { formatRange } from "./parseReferenceRange";
import { parseFile } from "./parseFile";
import { parseWorkbook } from "./parseWorkbook";

const FIXTURE = fileURLToPath(new URL("../../fixtures/sample_lab_results.xlsx", import.meta.url));

let wb: ParsedWorkbook;

function sheet(name: string): DataSheet {
  const s = wb.data.find((d) => d.name === name);
  if (!s) throw new Error(`missing sheet ${name}`);
  return s;
}

function marker(sheetName: string, nameEn: string): Marker {
  const m = sheet(sheetName).markers.find((x) => x.nameEn === nameEn);
  if (!m) throw new Error(`missing marker ${nameEn}`);
  return m;
}

const latest = (m: Marker) => m.measurements[m.measurements.length - 1];

beforeAll(async () => {
  const file = new File([readFileSync(FIXTURE)], "sample_lab_results.xlsx");
  const result = await parseFile(file);
  if (!result.ok) throw new Error(result.message);
  wb = result.workbook;
});

describe("sample workbook (wide layout)", () => {
  it("finds three result sheets and the README", () => {
    expect(wb.data.map((d) => d.name)).toEqual(["Blood", "Urine", "Stool"]);
    expect(sheet("Blood").markers).toHaveLength(78);
    expect(sheet("Urine").markers).toHaveLength(16);
    expect(sheet("Stool").markers).toHaveLength(3);
    expect(sheet("Blood").dates).toHaveLength(9);
    expect(sheet("Urine").dates).toHaveLength(3);
    expect(sheet("Stool").dates).toHaveLength(2);
    expect(wb.info.map((i) => i.name)).toEqual(["README"]);
    expect(wb.info[0].lines[0]).toBe("Master Lab Results — Example (Synthetic)");
  });

  it("keeps categories in file order", () => {
    expect(sheet("Blood").categories).toEqual([
      "Lipids & CV",
      "Glucose-Insulin",
      "Thyroid",
      "Hormones",
      "Liver & Pancreas",
      "Kidney",
      "Iron",
      "Vitamins",
      "CBC",
      "Inflammation & Immunology",
      "Antibodies",
      "Blood Group",
    ]);
  });

  it("reads dates as local calendar days", () => {
    const first = sheet("Blood").dates[0];
    expect([first.getFullYear(), first.getMonth(), first.getDate()]).toEqual([2023, 0, 19]);
    const m = marker("Blood", "Total Cholesterol");
    expect(m.measurements.map((x) => x.date.getDate())).toEqual([19, 14, 11, 15, 19, 14, 22]);
  });

  it("skips empty cells instead of recording zeros", () => {
    const m = marker("Blood", "Lp(a)");
    expect(m.measurements).toHaveLength(1);
    expect(m.measurements[0].raw).toBe("42");
  });

  it("keeps bilingual names and both ranges", () => {
    const m = marker("Blood", "Total Cholesterol");
    expect(m.nameUa).toBe("Загальний холестерин");
    expect(formatRange(m.standard)).toBe("<5.0 mmol/L");
    expect(formatRange(m.biohacker)).toBe("4.0–5.0 mmol/L");
    expect(m.biohacker.kind !== "none" && "note" in m.biohacker && m.biohacker.note).toBe(
      "Attia focuses on ApoB",
    );
  });

  it("inherits a missing biohacker unit from the standard range", () => {
    expect(formatRange(marker("Blood", "GFR (CKD-EPI)").biohacker)).toBe(">90 mL/min/1.73 m²");
  });
});

describe("sample workbook — flags", () => {
  const std = (s: string, n: string, i?: number) => {
    const m = marker(s, n);
    const meas = i === undefined ? latest(m) : m.measurements[i];
    return flagStatus(meas.value, m.standard);
  };
  const bio = (s: string, n: string) => {
    const m = marker(s, n);
    return flagStatus(latest(m).value, m.biohacker);
  };

  it("Total Cholesterol trends from high to in range", () => {
    expect(std("Blood", "Total Cholesterol", 0)).toBe("high");
    expect(std("Blood", "Total Cholesterol")).toBe("normal");
    expect(bio("Blood", "Total Cholesterol")).toBe("normal");
  });

  it("ApoB is in range by standard but above the biohacker target", () => {
    expect(std("Blood", "ApoB")).toBe("normal");
    expect(bio("Blood", "ApoB")).toBe("high");
  });

  it("handles censored, qualitative and constant results", () => {
    expect(std("Blood", "Anti-TPO")).toBe("normal");
    expect(std("Blood", "H. pylori IgG", 0)).toBe("high");
    expect(std("Blood", "Blood Group ABO")).toBe("info");
    expect(std("Urine", "Urine Color", 0)).toBe("match");
    expect(std("Urine", "Urine Color", 1)).toBe("match");
    expect(std("Urine", "Urine Protein (qual.)", 0)).toBe("mismatch");
    expect(std("Urine", "Urine Ketones")).toBe("mismatch");
    expect(std("Urine", "Urine Urobilinogen", 0)).toBe("normal");
    expect(std("Urine", "Urine Bacteria", 0)).toBe("mismatch");
    expect(std("Stool", "Fecal Elastase")).toBe("normal");
  });
});

describe("explanations", () => {
  it("cover nearly every blood marker in the sample", () => {
    const blood = sheet("Blood").markers;
    const missing = blood.filter((m) => !getExplanation(m.nameEn)).map((m) => m.nameEn);
    expect(getExplanation("Lp(a)")).not.toBeNull();
    expect(getExplanation("Neutrophils %")).not.toBeNull();
    expect(missing.length).toBeLessThanOrEqual(15);
  });
});

describe("CSV and error paths", () => {
  it("parses a UTF-8 CSV export of one sheet", async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Marker EN", "Marker UA", "Category", "Reference", "Biohacker Range", "2024-03-11", "2025-05-19"],
      ["ALT", "АЛТ", "Liver", "<41 U/L (men)", "<25 U/L", "36", "27"],
    ]);
    const csv = "﻿" + XLSX.utils.sheet_to_csv(ws);
    const result = await parseFile(new File([csv], "blood.csv", { type: "text/csv" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const m = result.workbook.data[0].markers[0];
    expect(m.nameUa).toBe("АЛТ");
    expect(m.measurements.map((x) => x.raw)).toEqual(["36", "27"]);
    expect(m.measurements[1].date.getDate()).toBe(19);
  });

  it("accepts Excel date cells in the header and dd.mm.yyyy text", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Test Name", "Reference", new Date(2024, 2, 11), "19.05.2025"],
      ["Glucose", "3.9–5.6 mmol/L", 5.4, 5.0],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, ws, "Sheet1");
    const reread = XLSX.read(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
    const result = parseWorkbook(reread, "x.xlsx");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const dates = result.workbook.data[0].dates;
    expect(dates.map((d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()])).toEqual([
      [2024, 3, 11],
      [2025, 5, 19],
    ]);
  });

  it("explains files without a recognizable layout", async () => {
    const ws = XLSX.utils.aoa_to_sheet([["hello", "world"]]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, ws, "Sheet1");
    const result = parseWorkbook(book, "x.xlsx");
    expect(result).toMatchObject({ ok: false, message: "No result sheets found in this file." });
  });

  it("rejects .numbers and unknown types with guidance", async () => {
    expect(await parseFile(new File(["x"], "results.numbers"))).toMatchObject({ ok: false });
    expect(await parseFile(new File(["x"], "results.pdf"))).toMatchObject({ ok: false });
  });
});
