import { describe, expect, it } from "vitest";
import { flagStatus, matchesExpected, statusTone } from "./flagStatus";
import { parseReferenceRange } from "./parseReferenceRange";
import { parseValue } from "./parseValue";

const flag = (value: unknown, range: string) =>
  flagStatus(parseValue(value), parseReferenceRange(range));

describe("flagStatus — numeric", () => {
  it("between", () => {
    expect(flag(5.7, "3.9–5.6 mmol/L")).toBe("high");
    expect(flag(3.8, "3.9–5.6 mmol/L")).toBe("low");
    expect(flag(5.6, "3.9–5.6 mmol/L")).toBe("normal");
    expect(flag(3.9, "3.9–5.6 mmol/L")).toBe("normal");
  });

  it("strict and inclusive bounds", () => {
    expect(flag(4.99, "<5.0")).toBe("normal");
    expect(flag(5.0, "<5.0")).toBe("high");
    expect(flag(5.0, "≤5.0")).toBe("normal");
    expect(flag(1.0, ">1.0")).toBe("low");
    expect(flag(1.0, "≥1.0")).toBe("normal");
    expect(flag(48, "≥75 nmol/L")).toBe("low");
  });

  it("detection-limit values are compared as intervals", () => {
    expect(flag("<9.0", "<34 IU/mL")).toBe("normal");
    expect(flag("<9.0", "<9 IU/mL")).toBe("normal");
    expect(flag("<50", "<34 IU/mL")).toBe("unknown"); // could be either side
    expect(flag(">500", "≥200 µg/g")).toBe("normal");
    expect(flag(">500", ">500 µg/g")).toBe("normal");
    expect(flag(">500", "<100")).toBe("high");
    expect(flag("<1", "3–17")).toBe("low");
    expect(flag("≤16", "0–16 µmol/L")).toBe("normal");
  });

  it("qualitative 'normal' against a numeric range", () => {
    expect(flag("normal", "0–16 µmol/L")).toBe("normal");
    expect(flag("2–3 per HPF", "0–10/HPF")).toBe("unknown");
  });
});

describe("flagStatus — qualitative", () => {
  it("negatives", () => {
    expect(flag("not detected", "Not detected")).toBe("match");
    expect(flag("negative", "Negative")).toBe("match");
    expect(flag("not detected", "Negative")).toBe("match");
    expect(flag("trace", "Negative")).toBe("mismatch");
    expect(flag("single per HPF", "Not detected")).toBe("mismatch");
    expect(flag("0.5 mmol/L (+)", "Not detected")).toBe("mismatch");
    expect(flag(0, "Negative")).toBe("match");
    expect(flag(1.2, "Negative")).toBe("mismatch");
  });

  it("descriptive ranges and exact matches", () => {
    expect(matchesExpected("yellow", "Light yellow to yellow")).toBe(true);
    expect(matchesExpected("pale yellow", "Light yellow to yellow")).toBe(true);
    expect(matchesExpected("straw", "Light yellow to yellow")).toBe(true);
    expect(matchesExpected("red", "Light yellow to yellow")).toBe(false);
    expect(flag("clear", "Clear")).toBe("match");
    expect(flag("cloudy", "Clear")).toBe("mismatch");
    expect(flag("single in prep.", "Single in prep.")).toBe("match");
  });

  it("constants and missing ranges are informational", () => {
    expect(flag("A", "Constant per individual")).toBe("info");
    expect(flag("A", "N/A")).toBe("info");
    expect(flag(5, "N/A")).toBe("unknown");
    expect(flag(null, "<5")).toBe("unknown");
  });
});

describe("statusTone", () => {
  it("maps statuses to tones", () => {
    expect(statusTone("high")).toBe("bad");
    expect(statusTone("normal")).toBe("ok");
    expect(statusTone("mismatch")).toBe("warn");
    expect(statusTone("unknown")).toBe("muted");
  });
});
