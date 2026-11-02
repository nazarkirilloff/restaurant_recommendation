import { describe, expect, it } from "vitest";
import type { Marker } from "../types";
import { matchesQuery, searchByCategory } from "./search";

const m = (nameEn: string, nameUa: string, category: string): Marker => ({
  nameEn,
  nameUa,
  category,
  standard: { kind: "none", raw: "" },
  biohacker: { kind: "none", raw: "" },
  measurements: [],
});

const hdl = m("HDL Cholesterol", "ЛПВЩ (Холестерин ЛПВЩ)", "Lipids & CV");
const lpa = m("Lp(a)", "Ліпопротеїн (а)", "Lipids & CV");
const alt = m("ALT", "АЛТ (Аланінамінотрансфераза)", "Liver & Pancreas");
const mcv = m("MCV", "Середній об'єм еритроцитів", "CBC");
const neut = m("Neutrophils %", "Нейтрофіли (%)", "CBC");

describe("matchesQuery", () => {
  it("matches English and Ukrainian names, ignoring case", () => {
    expect(matchesQuery(hdl, "hdl")).toBe(true);
    expect(matchesQuery(hdl, "холест")).toBe(true);
    expect(matchesQuery(alt, "аланін")).toBe(true);
    expect(matchesQuery(alt, "ALT")).toBe(true);
  });

  it("requires every word", () => {
    expect(matchesQuery(hdl, "hdl chol")).toBe(true);
    expect(matchesQuery(hdl, "hdl ldl")).toBe(false);
  });

  it("searches categories only when no name matches anywhere", () => {
    const glucose = m("Glucose (Fasting)", "Глюкоза", "Glucose-Insulin");
    const a1c = m("HbA1c", "Глікований гемоглобін", "Glucose-Insulin");
    const all = [hdl, lpa, alt, mcv, neut, glucose, a1c];
    // "glucose" is a name → HbA1c (same panel) is not listed.
    expect(searchByCategory(all, "glucose")).toBe(false);
    expect(all.filter((x) => matchesQuery(x, "glucose", false))).toEqual([glucose]);
    // "cbc" is only a category → the whole panel.
    expect(searchByCategory(all, "cbc")).toBe(true);
    expect(all.filter((x) => matchesQuery(x, "cbc", true))).toEqual([mcv, neut]);
    expect(matchesQuery(alt, "liver alt", true)).toBe(true);
    expect(searchByCategory(all, "")).toBe(false);
  });

  it("ignores punctuation and apostrophes", () => {
    expect(matchesQuery(lpa, "lp(a)")).toBe(true);
    expect(matchesQuery(lpa, "lp a")).toBe(true);
    expect(matchesQuery(mcv, "обєм")).toBe(true);
    expect(matchesQuery(mcv, "об'єм")).toBe(true);
    expect(matchesQuery(neut, "neutrophils %")).toBe(true);
  });

  it("short words match word starts only, so 'a' doesn't match everything", () => {
    expect(matchesQuery(hdl, "a")).toBe(false);
    expect(matchesQuery(alt, "al")).toBe(true);
  });

  it("an empty query matches everything", () => {
    expect(matchesQuery(hdl, "")).toBe(true);
    expect(matchesQuery(hdl, "   ")).toBe(true);
  });
});
