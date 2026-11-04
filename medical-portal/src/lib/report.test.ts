import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { ParsedWorkbook } from "../types";
import { parseFile } from "./parseFile";
import { buildReport } from "./report";

let wb: ParsedWorkbook;

beforeAll(async () => {
  const path = fileURLToPath(new URL("../../fixtures/sample_lab_results.xlsx", import.meta.url));
  const result = await parseFile(new File([readFileSync(path)], "sample_lab_results.xlsx"));
  if (!result.ok) throw new Error(result.message);
  wb = result.workbook;
});

const names = (items: { marker: { nameEn: string } }[]) => items.map((i) => i.marker.nameEn);

describe("buildReport", () => {
  it("lists out-of-range and unexpected results, in file order (standard ranges)", () => {
    const [blood, urine, stool] = buildReport(wb, "standard");
    expect(blood.sheet).toBe("Blood");
    // Latest values outside the standard range in the sample: positive IgG antibodies.
    expect(names(blood.attention)).toEqual(["HSV 1/2 IgG", "CMV IgG", "EBV VCA IgG", "EBV EBNA IgG"]);
    expect(names(blood.backInRange)).toEqual(["H. pylori IgG"]);
    expect(names(urine.attention)).toEqual(["Urine Ketones"]);
    expect(urine.attention[0].status).toBe("mismatch");
    expect(names(urine.backInRange)).toEqual(["Urine Bacteria"]);
    expect(stool.attention).toEqual([]);
    expect(stool.okCount).toBe(3);
  });

  it("puts every marker with a result in exactly one bucket", () => {
    for (const mode of ["standard", "biohacker"] as const) {
      const reports = buildReport(wb, mode);
      reports.forEach((r, i) => {
        const withResults = wb.data[i].markers.filter((m) => m.measurements.length > 0).length;
        expect(r.attention.length + r.backInRange.length + r.okCount + r.otherCount).toBe(withResults);
      });
    }
  });

  it("reports markers that came back into range since the previous test", () => {
    const [blood] = buildReport(wb, "standard");
    // Total Cholesterol: 5.08 (high, <5.0) → 4.86 → 4.74; the previous test was already fine.
    expect(names(blood.backInRange)).not.toContain("Total Cholesterol");
    // hs-CRP was 3.2 (high) long ago but in range for several tests → plain "ok".
    expect(names(blood.backInRange)).not.toContain("hs-CRP");
    for (const it of blood.backInRange) {
      expect(["normal", "match"]).toContain(it.status);
      expect(["high", "low", "mismatch"]).toContain(it.previousStatus);
    }
  });

  it("biohacker mode flags more and marks fallbacks", () => {
    const std = buildReport(wb, "standard")[0];
    const bio = buildReport(wb, "biohacker")[0];
    expect(bio.attention.length).toBeGreaterThan(std.attention.length);
    expect(names(bio.attention)).toContain("ApoB");
    const pylori = [...bio.attention, ...bio.backInRange].find((i) => i.marker.nameEn === "H. pylori IgG");
    expect(pylori?.fellBack).toBe(true);
  });

  it("includes the change and previous result for context", () => {
    const bio = buildReport(wb, "biohacker")[0];
    const apob = bio.attention.find((i) => i.marker.nameEn === "ApoB")!;
    expect(apob.latest.raw).toBe("0.71");
    expect(apob.previous?.raw).toBe("0.86");
    expect(apob.change).toMatchObject({ direction: "down", amount: "0.15", tone: "better" });
  });
});
