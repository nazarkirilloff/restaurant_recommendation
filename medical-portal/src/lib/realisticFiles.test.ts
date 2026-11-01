// End-to-end checks against the "real-world" fixtures (see fixtures/make-realistic.mjs
// for the full list of quirks they contain). Each file goes through parseFile, exactly
// as an upload in the browser would.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { DataSheet, Marker, ParsedWorkbook } from "../types";
import { flagStatus } from "./flagStatus";
import { formatRange } from "./parseReferenceRange";
import { parseFile } from "./parseFile";

async function load(name: string): Promise<ParsedWorkbook> {
  const path = fileURLToPath(new URL(`../../fixtures/${name}`, import.meta.url));
  const result = await parseFile(new File([readFileSync(path)], name));
  if (!result.ok) throw new Error(`${result.message} ${result.detail ?? ""}`);
  return result.workbook;
}

const find = (s: DataSheet, nameEn: string): Marker => {
  const m = s.markers.find((x) => x.nameEn === nameEn);
  if (!m) throw new Error(`missing ${nameEn}; have ${s.markers.map((x) => x.nameEn).join(", ")}`);
  return m;
};
const latest = (m: Marker) => m.measurements[m.measurements.length - 1];
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const BLOOD_DATES = ["2024-02-06", "2024-09-17", "2025-03-04", "2025-07-01", "2025-11-18"];

/** Checks shared by the .xlsx and the CSV export of the Blood sheet. */
function checkBlood(blood: DataSheet) {
  // Section labels ("ЛІПІДИ / LIPIDS") and blank rows are not markers.
  expect(blood.markers).toHaveLength(29);
  expect(blood.markers.some((m) => m.nameEn.includes("LIPIDS"))).toBe(false);

  // Mixed date headers, sorted; the empty "planned" column is dropped.
  expect(blood.dates.map(ymd)).toEqual(BLOOD_DATES);

  // Whitespace and non-breaking spaces in names are normalized.
  expect(find(blood, "ALT").nameUa).toBe("АЛТ");
  find(blood, "Testosterone Total");

  // Out-of-order column ends up in date order; float noise is not displayed.
  const tc = find(blood, "Total Cholesterol");
  expect(tc.measurements.map((x) => x.raw)).toEqual(["5.9", "5,62", "5.21", "5.04", "4.86"]);
  expect(formatRange(tc.standard)).toBe("до 5,0 ммоль/л");
  expect(tc.standard).toMatchObject({ kind: "lte", high: 5, unit: "ммоль/л" });
  expect(flagStatus(tc.measurements[0].value, tc.standard)).toBe("high");
  expect(flagStatus(latest(tc).value, tc.standard)).toBe("normal");

  // "-", "—" and "N/A" mean "not done", not a result.
  expect(find(blood, "ApoB").measurements).toHaveLength(3);
  expect(find(blood, "Total Bilirubin").measurements).toHaveLength(4);
  expect(find(blood, "ESR").measurements).toHaveLength(4);

  // Ukrainian-style ranges.
  expect(find(blood, "HDL Cholesterol").standard).toMatchObject({ kind: "gte", low: 1 });
  expect(find(blood, "Triglycerides").standard).toMatchObject({ kind: "lt", high: 1.7 });
  expect(find(blood, "Glucose (Fasting)").standard).toMatchObject({ kind: "between", low: 3.9, high: 5.6 });
  expect(find(blood, "TSH").standard).toMatchObject({ kind: "between", low: 0.4, high: 4 });
  expect(find(blood, "ESR").standard).toMatchObject({ kind: "lte", high: 15, unit: "мм/год" });

  // Values with units and decimal commas.
  const a1c = find(blood, "HbA1c");
  expect(a1c.measurements[0].value).toMatchObject({ kind: "number", numeric: 5.9 });
  expect(flagStatus(a1c.measurements[0].value, a1c.standard)).toBe("high");
  expect(find(blood, "Creatinine").measurements[0].value).toMatchObject({ numeric: 94 });
  expect(latest(find(blood, "hs-CRP")).value).toMatchObject({ numeric: 0.42 });

  // Detection limits with comma / space.
  const tpo = find(blood, "Anti-TPO");
  expect(tpo.measurements.map((x) => flagStatus(x.value, tpo.standard))).toEqual(["normal", "normal"]);

  expect(flagStatus(latest(find(blood, "Blood Group ABO")).value, find(blood, "Blood Group ABO").standard)).toBe("info");
}

describe("realistic_lab_results.xlsx", () => {
  it("reads data sheets, info sheet and all quirks", async () => {
    const wb = await load("realistic_lab_results.xlsx");
    expect(wb.data.map((d) => d.name)).toEqual(["Blood", "Urine"]);
    expect(wb.info.map((i) => i.name)).toEqual(["Notes"]);
    const blood = wb.data[0];
    checkBlood(blood);

    // Formula cells use the cached value.
    const homa = find(blood, "HOMA-IR");
    expect(homa.measurements[0].value).toMatchObject({ numeric: 3.2 });
    expect(flagStatus(homa.measurements[0].value, homa.standard)).toBe("high");

    expect(blood.categories).toEqual([
      "Lipids & CV",
      "Glucose-Insulin",
      "Liver & Pancreas",
      "Kidney",
      "Thyroid",
      "Hormones",
      "Vitamins",
      "Iron",
      "CBC",
      "Inflammation & Immunology",
      "Antibodies",
      "Blood Group",
    ]);
  });

  it("flags Ukrainian qualitative urine results", async () => {
    const urine = (await load("realistic_lab_results.xlsx")).data[1];
    const st = (name: string) => {
      const m = find(urine, name);
      return m.measurements.map((x) => flagStatus(x.value, m.standard));
    };
    expect(st("Urine Color")).toEqual(["match", "match", "match"]);
    expect(st("Urine Transparency")).toEqual(["match", "mismatch", "match"]);
    expect(st("Urine Protein (qual.)")).toEqual(["mismatch", "match", "match"]);
    expect(st("Urine Glucose")).toEqual(["match", "match", "match"]);
    expect(st("Urine Specific Gravity")).toEqual(["high", "normal", "normal"]);
    expect(st("Urine Leukocytes (micro.)")).toEqual(["normal", "unknown", "normal"]);
    expect(st("Urine Bacteria")).toEqual(["match", "mismatch", "match"]);
  });
});

describe("realistic_blood_cp1251.csv", () => {
  it("decodes Windows-1251, splits on ';' and parses like the workbook", async () => {
    const wb = await load("realistic_blood_cp1251.csv");
    expect(wb.data).toHaveLength(1);
    expect(find(wb.data[0], "Total Cholesterol").nameUa).toBe("Загальний холестерин");
    checkBlood(wb.data[0]);
  });
});

describe("realistic_urine.numbers", () => {
  it("reads an Apple Numbers file", async () => {
    const wb = await load("realistic_urine.numbers");
    expect(wb.data).toHaveLength(1);
    const urine = wb.data[0];
    expect(urine.markers).toHaveLength(9);
    expect(urine.dates.map(ymd)).toEqual(["2024-02-06", "2025-03-04", "2025-11-18"]);
    const sg = find(urine, "Urine Specific Gravity");
    expect(sg.measurements.map((x) => x.raw)).toEqual(["1.027", "1,020", "1.018"]);
  });
});
