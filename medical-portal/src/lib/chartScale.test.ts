import { describe, expect, it } from "vitest";
import { chartScale, formatTick, niceStep } from "./chartScale";
import { parseReferenceRange } from "./parseReferenceRange";

const r = (s: string) => parseReferenceRange(s);

describe("chartScale", () => {
  it("picks round steps", () => {
    expect(niceStep(0.37)).toBe(0.5);
    expect(niceStep(1.4)).toBe(2);
    expect(niceStep(2.3)).toBe(2.5);
    expect(niceStep(70)).toBe(100);
  });

  it("covers data and both ranges with clean ticks (Total Cholesterol)", () => {
    const s = chartScale([6.12, 5.84, 5.5, 5.32, 5.08, 4.86, 4.74], [r("<5.0"), r("4.0–5.0")]);
    expect(s.domain[0]).toBeLessThanOrEqual(4);
    expect(s.domain[1]).toBeGreaterThanOrEqual(6.12);
    for (const t of s.ticks) expect(String(t)).toMatch(/^\d+(\.\d{1,2})?$/);
    expect(s.ticks[0]).toBe(s.domain[0]);
    expect(s.ticks[s.ticks.length - 1]).toBe(s.domain[1]);
  });

  it("never goes negative for non-negative data", () => {
    const s = chartScale([0.05, 0.04, 0.03], [r("0–0.2")]);
    expect(s.domain[0]).toBe(0);
  });

  it("handles a single flat value", () => {
    const s = chartScale([42], []);
    expect(s.domain[0]).toBeLessThan(42);
    expect(s.domain[1]).toBeGreaterThan(42);
  });

  it("formats ticks without float noise", () => {
    expect(formatTick(0.1 + 0.2)).toBe("0.3");
    expect(formatTick(5)).toBe("5");
  });
});
