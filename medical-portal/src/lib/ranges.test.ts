import { describe, expect, it } from "vitest";
import type { Marker, Measurement } from "../types";
import { parseReferenceRange } from "./parseReferenceRange";
import { parseValue } from "./parseValue";
import { activeRange, latestStatus } from "./ranges";
import { decimalsOf, trend } from "./trend";

function marker(standard: string, biohacker: string, values: unknown[] = []): Marker {
  return {
    nameEn: "X",
    nameUa: "",
    category: "C",
    standard: parseReferenceRange(standard),
    biohacker: parseReferenceRange(biohacker),
    measurements: values.map((v, i) => meas(v, i)),
  };
}

function meas(v: unknown, i = 0): Measurement {
  return { date: new Date(2024, 0, 1 + i), raw: String(v), value: parseValue(v) };
}

describe("activeRange", () => {
  it("uses the column for the mode and reports the other one", () => {
    const m = marker("<5.0 mmol/L", "4.0–5.0 mmol/L");
    expect(activeRange(m, "standard")).toMatchObject({ source: "standard", fellBack: false });
    expect(activeRange(m, "standard").other?.raw).toBe("4.0–5.0 mmol/L");
    expect(activeRange(m, "biohacker")).toMatchObject({ source: "biohacker", fellBack: false });
    expect(activeRange(m, "biohacker").other?.raw).toBe("<5.0 mmol/L");
  });

  it("falls back to standard, and says so, when there is no biohacker target", () => {
    const m = marker("<16 RU/mL (negative)", "N/A (must be negative)");
    const a = activeRange(m, "biohacker");
    expect(a).toMatchObject({ source: "standard", fellBack: true, other: undefined });
    expect(a.range.raw).toBe("<16 RU/mL (negative)");
    expect(activeRange(m, "standard").fellBack).toBe(false);
  });

  it("latestStatus follows the mode", () => {
    const m = marker("<1.0 g/L", "<0.65 g/L", [1.28, 0.71]);
    expect(latestStatus(m, "standard")).toBe("normal");
    expect(latestStatus(m, "biohacker")).toBe("high");
    expect(latestStatus(marker("<1", "<1"), "standard")).toBe("unknown");
  });
});

describe("trend", () => {
  const r = (s: string) => parseReferenceRange(s);

  it("keeps the data's precision instead of rounding to zero", () => {
    expect(decimalsOf("1.018")).toBe(3);
    expect(decimalsOf("5,62")).toBe(2);
    expect(decimalsOf("42")).toBe(0);
    expect(trend(meas("1.02"), meas("1.018"), r("1.005–1.025"))).toMatchObject({
      direction: "down",
      amount: "0.002",
      tone: "neutral",
    });
    expect(trend(meas(4.86), meas(4.74), r("<5.0"))).toMatchObject({ amount: "0.12" });
  });

  it("colors by direction relative to the range", () => {
    // Above an upper limit and coming down.
    expect(trend(meas(6.12), meas(5.84), r("<5.0"))?.tone).toBe("better");
    // Crossing into range.
    expect(trend(meas(5.2), meas(4.9), r("<5.0"))).toMatchObject({
      tone: "better",
      description: "Down 0.3 since previous result — now within range",
    });
    // Leaving the range.
    expect(trend(meas(4.9), meas(5.3), r("<5.0"))).toMatchObject({
      tone: "worse",
      description: "Up 0.4 since previous result — now outside range",
    });
    // Below a lower limit and going further down.
    expect(trend(meas(60), meas(48), r("≥75"))?.tone).toBe("worse");
    // A value on a strict bound is outside it (">1.3" excludes 1.30).
    expect(trend(meas("1.30"), meas("1.34"), r(">1.3 mmol/L"))?.tone).toBe("better");
    // Moving inside the range is neutral.
    expect(trend(meas(2.15), meas(1.71), r("0.4–4.0"))?.tone).toBe("neutral");
    // Qualitative range: no judgment.
    expect(trend(meas(1), meas(2), r("Negative"))?.tone).toBe("neutral");
  });

  it("returns nothing when there is no measurable change", () => {
    expect(trend(meas(0.25), meas(0.25), r("<1"))).toBeNull();
    expect(trend(undefined, meas(1), r("<1"))).toBeNull();
    expect(trend(meas("<9.0"), meas(5), r("<34"))).toBeNull();
    expect(trend(meas("yellow"), meas("clear"), r("Clear"))).toBeNull();
  });
});
