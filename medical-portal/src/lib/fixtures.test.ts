// Guard for a public repository: every data file under fixtures/ must say it is
// synthetic. Real lab files are blocked by .gitignore everywhere else; this
// catches one dropped into fixtures/ (the only place data files are allowed).
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { decodeText } from "./parseFile";

const DIR = fileURLToPath(new URL("../../fixtures/", import.meta.url));
const DATA = /\.(xlsx|xlsm|xls|csv|tsv|numbers|ods|pdf)$/i;
const MARKER = /synthetic|синтетичн/i;

function textOf(name: string): string {
  const bytes = readFileSync(DIR + name);
  if (/\.(csv|tsv)$/i.test(name)) return decodeText(new Uint8Array(bytes));
  if (/\.pdf$/i.test(name)) return bytes.toString("latin1");
  const wb = XLSX.read(bytes, { type: "buffer" });
  return wb.SheetNames.map((s) => `${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`).join("\n");
}

describe("fixtures are synthetic", () => {
  const files = readdirSync(DIR).filter((f) => DATA.test(f));

  it("finds the fixture files", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it.each(files)("%s is marked synthetic", (name) => {
    expect(MARKER.test(textOf(name)), `${name} has no "synthetic" marker — is it real data?`).toBe(true);
  });
});
