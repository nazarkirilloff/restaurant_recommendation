import { describe, expect, it } from "vitest";
import { parseValue } from "./parseValue";

describe("parseValue", () => {
  it("reads numbers and numeric text", () => {
    expect(parseValue(6.12)).toEqual({ kind: "number", numeric: 6.12, text: "6.12" });
    expect(parseValue("6.12")).toMatchObject({ kind: "number", numeric: 6.12 });
    expect(parseValue("6,12")).toMatchObject({ kind: "number", numeric: 6.12 });
    expect(parseValue("5.2 mmol/L")).toMatchObject({ kind: "number", numeric: 5.2 });
    expect(parseValue("45 %")).toMatchObject({ kind: "number", numeric: 45 });
  });

  it("reads detection-limit values as operators", () => {
    expect(parseValue("<9.0")).toMatchObject({ kind: "operator", op: "<", numeric: 9 });
    expect(parseValue(">500")).toMatchObject({ kind: "operator", op: ">", numeric: 500 });
    expect(parseValue("≤16")).toMatchObject({ kind: "operator", op: "≤", numeric: 16 });
    expect(parseValue(">= 3")).toMatchObject({ kind: "operator", op: "≥", numeric: 3 });
  });

  it.each(["A", "+ (positive)", "trace", "not detected", "2–3 per HPF", "0.5 mmol/L (+)", "single per HPF"])(
    "keeps %s qualitative",
    (text) => {
      expect(parseValue(text)).toEqual({ kind: "qualitative", text });
    },
  );

  it("treats blanks as empty", () => {
    expect(parseValue(null)).toEqual({ kind: "empty" });
    expect(parseValue(undefined)).toEqual({ kind: "empty" });
    expect(parseValue("   ")).toEqual({ kind: "empty" });
    expect(parseValue(Number.NaN)).toEqual({ kind: "empty" });
  });
});
