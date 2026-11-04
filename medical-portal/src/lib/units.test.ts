import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { ParsedWorkbook } from "../types";
import { flagStatus } from "./flagStatus";
import { formatRange, parseReferenceRange } from "./parseReferenceRange";
import { parseValue } from "./parseValue";
import { parseFile } from "./parseFile";
import { conversionFor, convertWorkbook, normalizeUnit } from "./units";
import { trend } from "./trend";

const books: Record<string, ParsedWorkbook> = {};

beforeAll(async () => {
  for (const name of ["sample_lab_results.xlsx", "realistic_lab_results.xlsx"]) {
    const path = fileURLToPath(new URL(`../../fixtures/${name}`, import.meta.url));
    const r = await parseFile(new File([readFileSync(path)], name));
    if (!r.ok) throw new Error(r.message);
    books[name] = r.workbook;
  }
});

const find = (wb: ParsedWorkbook, nameEn: string) =>
  wb.data.flatMap((s) => s.markers).find((m) => m.nameEn === nameEn)!;

describe("normalizeUnit", () => {
  it("treats English and Ukrainian spellings alike", () => {
    expect(normalizeUnit("mmol/L")).toBe("mmol/l");
    expect(normalizeUnit("ммоль/л")).toBe("mmol/l");
    expect(normalizeUnit("µmol/L")).toBe("µmol/l");
    expect(normalizeUnit("μmol/L")).toBe("µmol/l"); // Greek mu
    expect(normalizeUnit("umol/l")).toBe("µmol/l");
    expect(normalizeUnit("мкмоль/л")).toBe("µmol/l");
    expect(normalizeUnit("g/L")).toBe("g/l");
    expect(normalizeUnit("г/л")).toBe("g/l");
  });
});

describe("convertWorkbook", () => {
  it("converts lipids to mg/dL (values and both ranges)", () => {
    const us = convertWorkbook(books["sample_lab_results.xlsx"], "us");
    const ldl = find(us, "LDL Cholesterol");
    expect(ldl.measurements.map((m) => m.raw)).toEqual(["157", "146", "132", "122", "108", "95", "85"]);
    expect(formatRange(ldl.standard)).toBe("<116 mg/dL");
    // Attia's <1.8 mmol/L is the familiar "<70 mg/dL".
    expect(formatRange(ldl.biohacker)).toBe("<70 mg/dL");
    expect(ldl.biohacker.note).toBe("Attia: aggressive, <70 mg/dL");
    expect(formatRange(find(us, "Glucose (Fasting)").standard)).toBe("70–101 mg/dL");
    expect(formatRange(find(us, "Vitamin D 25-OH").standard)).toBe("≥30 ng/mL");
    expect(find(us, "Creatinine").measurements.at(-1)!.raw).toBe("1.01");
    expect(formatRange(find(us, "Hemoglobin").standard)).toBe("13.5–17.5 g/dL");
    // The change adds up with what's displayed: 95 → 85 is 10 (exact values differ by 9.3).
    const last = ldl.measurements.slice(-2);
    expect(last.map((m) => m.raw)).toEqual(["95", "85"]);
    expect(trend(last[0], last[1], ldl.biohacker)).toMatchObject({ direction: "down", amount: "10" });
  });

  it("converts Ukrainian-unit ranges and leaves unknown markers alone", () => {
    const real = books["realistic_lab_results.xlsx"];
    expect(conversionFor(find(real, "Total Cholesterol"))).not.toBeNull(); // "до 5,0 ммоль/л"
    const us = convertWorkbook(real, "us");
    expect(formatRange(find(us, "Total Cholesterol").standard)).toBe("≤193 mg/dL");
    expect(find(us, "Creatinine").measurements[0].raw).toBe("1.06"); // "94 мкмоль/л"
    // No conversion defined → same object.
    expect(find(us, "TSH")).toBe(find(real, "TSH"));
    expect(find(us, "WBC")).toBe(find(real, "WBC"));
  });

  it("never changes a status: every measurement, both modes, both fixtures", () => {
    for (const wb of Object.values(books)) {
      const us = convertWorkbook(wb, "us");
      wb.data.forEach((sheet, si) => {
        sheet.markers.forEach((m, mi) => {
          const c = us.data[si].markers[mi];
          for (const key of ["standard", "biohacker"] as const) {
            m.measurements.forEach((meas, i) => {
              expect(flagStatus(c.measurements[i].value, c[key]), `${m.nameEn} ${key} #${i}`).toBe(
                flagStatus(meas.value, m[key]),
              );
            });
          }
        });
      });
    }
  });

  it("rounding the display can't flip a borderline result", () => {
    const wb: ParsedWorkbook = {
      fileName: "x",
      info: [],
      data: [
        {
          name: "Blood",
          categories: ["Lipids"],
          dates: [new Date(2025, 0, 1)],
          markers: [
            {
              nameEn: "Total Cholesterol",
              nameUa: "",
              category: "Lipids",
              standard: parseReferenceRange("<5.0 mmol/L"),
              biohacker: parseReferenceRange("N/A"),
              measurements: [{ date: new Date(2025, 0, 1), raw: "4.99", value: parseValue(4.99) }],
            },
          ],
        },
      ],
    };
    const m = convertWorkbook(wb, "us").data[0].markers[0];
    // 4.99 mmol/L → 192.96 → shown "193"; limit 5.0 → 193.35 → shown "<193". Still in range.
    expect(m.measurements[0].raw).toBe("193");
    expect(formatRange(m.standard)).toBe("<193 mg/dL");
    expect(flagStatus(m.measurements[0].value, m.standard)).toBe("normal");
  });

  it("SI returns the workbook untouched", () => {
    const wb = books["sample_lab_results.xlsx"];
    expect(convertWorkbook(wb, "si")).toBe(wb);
  });
});
