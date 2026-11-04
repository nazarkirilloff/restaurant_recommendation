import { describe, expect, it } from "vitest";
import { bandOf, boundaryLines, linePath, linear, nearestIndex, timeTicks } from "./chartGeometry";
import { parseReferenceRange } from "./parseReferenceRange";

const r = (s: string) => parseReferenceRange(s);
const pts = [
  { t: 0, v: 6, raw: "6" },
  { t: 10, v: 5, raw: "5" },
  { t: 20, v: 4.5, raw: "4.5", censored: "below" as const },
];

describe("chart geometry", () => {
  it("maps values linearly, with y pointing down", () => {
    const y = linear([4, 8], [100, 0]);
    expect(y(4)).toBe(100);
    expect(y(8)).toBe(0);
    expect(y(6)).toBe(50);
    expect(linear([5, 5], [0, 10])(5)).toBe(5);
  });

  it("spaces time ticks evenly, one for a single date", () => {
    expect(timeTicks(0, 100, 5)).toEqual([0, 25, 50, 75, 100]);
    expect(timeTicks(7, 7)).toEqual([7]);
  });

  it("draws straight segments through every point in order", () => {
    expect(linePath(pts, (t) => t * 10, (v) => v)).toBe("M0,6L100,5L200,4.5");
  });

  it("clips the active-range band to the visible domain", () => {
    expect(bandOf(r("3.9–5.6"), [3, 7])).toEqual([3.9, 5.6]);
    expect(bandOf(r("<5.0"), [3, 7])).toEqual([3, 5]);
    expect(bandOf(r(">1.0"), [0, 2])).toEqual([1, 2]);
    expect(bandOf(r("<5.0"), [6, 7])).toBeNull(); // entirely below the visible area
    expect(bandOf(r("Negative"), [0, 1])).toBeNull();
  });

  it("gives boundary lines for the other range", () => {
    expect(boundaryLines(r("4.0–5.0"))).toEqual([4, 5]);
    expect(boundaryLines(r("<1.8"))).toEqual([1.8]);
    expect(boundaryLines(r("N/A"))).toEqual([]);
    expect(boundaryLines(undefined)).toEqual([]);
  });

  it("finds the nearest point for the tooltip", () => {
    const x = (t: number) => t * 10;
    expect(nearestIndex(pts, x, 0)).toBe(0);
    expect(nearestIndex(pts, x, 140)).toBe(1);
    expect(nearestIndex(pts, x, 999)).toBe(2);
  });
});
