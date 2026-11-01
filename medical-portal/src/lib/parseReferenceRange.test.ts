import { describe, expect, it } from "vitest";
import { formatRange, parseReferenceRange, rangeUnit } from "./parseReferenceRange";

describe("parseReferenceRange", () => {
  it.each([
    ["<5.0 mmol/L", { kind: "lt", high: 5, unit: "mmol/L" }],
    ["<5.7%", { kind: "lt", high: 5.7, unit: "%" }],
    ["<2.0", { kind: "lt", high: 2, unit: undefined }],
    [">1.0 mmol/L (men)", { kind: "gt", low: 1, unit: "mmol/L", note: "men" }],
    ["≥75 nmol/L", { kind: "gte", low: 75, unit: "nmol/L" }],
    [">=75 nmol/L", { kind: "gte", low: 75 }],
    ["≤16 µmol/L", { kind: "lte", high: 16, unit: "µmol/L" }],
    ["3.9–5.6 mmol/L", { kind: "between", low: 3.9, high: 5.6, unit: "mmol/L" }],
    ["3.9-5.6 mmol/L", { kind: "between", low: 3.9, high: 5.6 }],
    ["3,9–5,6 ммоль/л", { kind: "between", low: 3.9, high: 5.6, unit: "ммоль/л" }],
    ["1.005–1.025", { kind: "between", low: 1.005, high: 1.025, unit: undefined }],
    ["0–10/HPF", { kind: "between", low: 0, high: 10, unit: "/HPF" }],
    ["4.0–10.0 ×10⁹/L", { kind: "between", low: 4, high: 10, unit: "×10⁹/L" }],
    [">90 mL/min/1.73 m²", { kind: "gt", low: 90, unit: "mL/min/1.73 m²" }],
  ])("numeric %s", (text, expected) => {
    expect(parseReferenceRange(text)).toMatchObject(expected);
  });

  it("moves every parenthetical into note", () => {
    expect(parseReferenceRange("<1.8 mmol/L (Attia: aggressive, <70 mg/dL)")).toMatchObject({
      kind: "lt",
      high: 1.8,
      unit: "mmol/L",
      note: "Attia: aggressive, <70 mg/dL",
    });
    expect(parseReferenceRange("80–560 µg/dL (men 40–50)")).toMatchObject({
      kind: "between",
      low: 80,
      high: 560,
      note: "men 40–50",
    });
  });

  it("keeps a bare annotation-only target numeric", () => {
    expect(parseReferenceRange(">90 (higher = better)")).toMatchObject({
      kind: "gt",
      low: 90,
      unit: undefined,
      note: "higher = better",
    });
  });

  it.each(["Negative", "Not detected", "Clear", "Light yellow to yellow", "Single in prep."])(
    "qualitative %s",
    (text) => {
      expect(parseReferenceRange(text)).toMatchObject({ kind: "qualitative", expected: text });
    },
  );

  it("strips the note from a qualitative expectation", () => {
    expect(parseReferenceRange("Negative (must be absent)")).toMatchObject({
      kind: "qualitative",
      expected: "Negative",
      note: "must be absent",
    });
  });

  it("recognizes constants and missing targets", () => {
    expect(parseReferenceRange("Constant per individual").kind).toBe("constant");
    expect(parseReferenceRange("N/A (must be negative)").kind).toBe("none");
    expect(parseReferenceRange("N/A").kind).toBe("none");
    expect(parseReferenceRange("").kind).toBe("none");
    expect(parseReferenceRange(null).kind).toBe("none");
  });
});

describe("formatRange", () => {
  it("preserves the file's precision and drops notes", () => {
    expect(formatRange(parseReferenceRange("<5.0 mmol/L"))).toBe("<5.0 mmol/L");
    expect(formatRange(parseReferenceRange("4.0–5.0 mmol/L (Attia focuses on ApoB)"))).toBe(
      "4.0–5.0 mmol/L",
    );
    expect(formatRange(parseReferenceRange("3.9-5.6 mmol/L"))).toBe("3.9–5.6 mmol/L");
    expect(formatRange(parseReferenceRange(">=75"))).toBe("≥75");
  });

  it("formats non-numeric kinds", () => {
    expect(formatRange(parseReferenceRange("Negative"))).toBe("Negative");
    expect(formatRange(parseReferenceRange("Constant per individual"))).toBe("Constant");
    expect(formatRange(parseReferenceRange("N/A"))).toBe("—");
  });

  it("appends an inherited unit", () => {
    const r = parseReferenceRange(">90 (higher = better)");
    (r as { unit?: string }).unit = "mL/min";
    expect(formatRange(r)).toBe(">90 mL/min");
    expect(rangeUnit(r)).toBe("mL/min");
  });
});
