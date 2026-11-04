import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { ParseResult } from "../types";
import { LIMITS, parseBytes } from "./parseFile";
import { parseSafely, type WorkerLike } from "./parseSafely";

const sample = readFileSync(fileURLToPath(new URL("../../fixtures/sample_lab_results.xlsx", import.meta.url)));
const sampleFile = () => new File([sample], "sample_lab_results.xlsx");

/** A fake worker that answers like the real one, after `delay` ms, or crashes. */
function fakeWorker(behaviour: "answer" | "hang" | "crash", delay = 0) {
  const calls = { terminated: 0, transferred: 0 };
  const w: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage(msg: unknown, transfer: Transferable[]) {
      calls.transferred = transfer.length;
      const { name, bytes } = msg as { name: string; bytes: ArrayBuffer };
      if (behaviour === "hang") return;
      setTimeout(() => {
        if (behaviour === "crash") w.onerror?.({ preventDefault() {} } as ErrorEvent);
        else w.onmessage?.({ data: parseBytes(name, bytes) } as MessageEvent);
      }, delay);
    },
    terminate() {
      calls.terminated++;
    },
  };
  return { w, calls };
}

describe("parseSafely", () => {
  it("returns the worker's result, transfers the bytes, and terminates the worker", async () => {
    const { w, calls } = fakeWorker("answer");
    const r = await parseSafely(sampleFile(), { createWorker: () => w });
    expect(r.ok).toBe(true);
    expect(calls).toEqual({ terminated: 1, transferred: 1 });
  });

  it("kills a worker that takes too long", async () => {
    const { w, calls } = fakeWorker("hang");
    const r = await parseSafely(sampleFile(), { createWorker: () => w, timeoutMs: 50 });
    expect(r).toMatchObject({ ok: false, code: "timeout" });
    expect(calls.terminated).toBe(1);
  });

  it("reports a worker crash instead of taking the page down", async () => {
    const { w, calls } = fakeWorker("crash");
    const r = await parseSafely(sampleFile(), { createWorker: () => w });
    expect(r).toMatchObject({ ok: false, code: "tooComplex" });
    expect(calls.terminated).toBe(1);
  });

  it("ignores a late answer after the timeout", async () => {
    const { w } = fakeWorker("answer", 120);
    const r = await parseSafely(sampleFile(), { createWorker: () => w, timeoutMs: 20 });
    expect(r).toMatchObject({ code: "timeout" });
  });

  it("without a worker: uses an explicit fallback, otherwise reports an error", async () => {
    const createWorker = () => {
      throw new Error("blocked");
    };
    expect((await parseSafely(sampleFile(), { createWorker, fallback: parseBytes })).ok).toBe(true);
    expect(await parseSafely(sampleFile(), { createWorker })).toMatchObject({ ok: false, code: "unreadable" });
  });

  it("rejects by type and size before reading anything", async () => {
    let created = 0;
    const createWorker = () => {
      created++;
      return fakeWorker("answer").w;
    };
    expect(await parseSafely(new File(["x"], "a.pdf"), { createWorker })).toMatchObject({ code: "unsupportedType" });
    const huge = { name: "big.xlsx", size: LIMITS.maxBytes + 1, arrayBuffer: () => Promise.reject() } as unknown as File;
    expect(await parseSafely(huge, { createWorker })).toMatchObject({ code: "tooLarge" });
    expect(created).toBe(0);
  });
});

describe("size caps", () => {
  const book = (rows: unknown[][], sheets = 1): ArrayBuffer => {
    const wb = XLSX.utils.book_new();
    for (let i = 0; i < sheets; i++) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `S${i}`);
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  };
  const header = ["Marker EN", "Reference", "2025-01-01"];

  it("rejects too many rows, columns or sheets", () => {
    const manyRows = [header, ...Array.from({ length: LIMITS.maxRows + 5 }, (_, i) => [`M${i}`, "<1", 0.5])];
    expect(parseBytes("rows.xlsx", book(manyRows))).toMatchObject({ code: "tooComplex" });
    const wide = [[...header, ...Array.from({ length: LIMITS.maxCols }, (_, i) => `c${i}`)], ["ALT", "<41", 33]];
    expect(parseBytes("cols.xlsx", book(wide))).toMatchObject({ code: "tooComplex" });
    expect(parseBytes("sheets.xlsx", book([header, ["ALT", "<41", 33]], LIMITS.maxSheets + 1))).toMatchObject({
      code: "tooComplex",
    });
  });

  it("rejects an oversized CSV too", () => {
    const csv = [header.join(","), ...Array.from({ length: LIMITS.maxRows + 5 }, (_, i) => `M${i},<1,0.5`)].join("\n");
    const bytes = new TextEncoder().encode(csv);
    expect(parseBytes("rows.csv", bytes.buffer as ArrayBuffer)).toMatchObject({ code: "tooComplex" });
  });

  it("accepts files right at the limits", () => {
    const rows = [header, ...Array.from({ length: LIMITS.maxRows - 1 }, (_, i) => [`M${i}`, "<1", 0.5])];
    const r: ParseResult = parseBytes("ok.xlsx", book(rows));
    expect(r.ok).toBe(true);
  });
});
