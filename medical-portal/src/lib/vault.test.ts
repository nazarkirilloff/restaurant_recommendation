import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KDF_ITERATIONS, isSealed, keyFor, newKey, seal, unseal, type OpenedFile } from "./vault";

// Fast KDF for most tests; one test uses the real 600k default.
const FAST = 1_000;

const fixture = readFileSync(
  fileURLToPath(new URL("../../fixtures/realistic_lab_results.xlsx", import.meta.url)),
);
const file: OpenedFile = {
  name: "Ivan Petrenko – blood 2025.xlsx",
  savedAt: 1_760_000_000_000,
  bytes: fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength),
};

/** Does `needle` appear anywhere in `hay` (byte-level)? */
function contains(hay: ArrayBuffer | Uint8Array, needle: Uint8Array): boolean {
  const h = hay instanceof Uint8Array ? hay : new Uint8Array(hay);
  outer: for (let i = 0; i <= h.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (h[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

describe("vault", () => {
  it("round-trips name, date and bytes", async () => {
    const vk = await newKey("correct horse battery", FAST);
    const sealed = await seal(file, vk);
    const opened = await unseal(sealed, await keyFor("correct horse battery", sealed));
    expect(opened?.name).toBe(file.name);
    expect(opened?.savedAt).toBe(file.savedAt);
    expect(new Uint8Array(opened!.bytes)).toEqual(new Uint8Array(file.bytes));
  });

  it("stores nothing readable: no file name, no file content", async () => {
    const sealed = await seal(file, await newKey("correct horse battery", FAST));
    expect(contains(sealed.ct, new TextEncoder().encode("Ivan Petrenko"))).toBe(false);
    expect(contains(sealed.ct, new Uint8Array(file.bytes).subarray(0, 64))).toBe(false);
    expect(Object.keys(sealed).sort()).toEqual(["ct", "iterations", "iv", "kdf", "salt", "v"]);
  });

  it("refuses a wrong passphrase", async () => {
    const sealed = await seal(file, await newKey("correct horse battery", FAST));
    expect(await unseal(sealed, await keyFor("wrong horse battery", sealed))).toBeNull();
  });

  it("refuses a tampered record (ciphertext, IV, or weakened KDF)", async () => {
    const pass = "correct horse battery";
    const sealed = await seal(file, await newKey(pass, FAST));
    const ct = new Uint8Array(sealed.ct.slice(0));
    ct[10] ^= 1;
    expect(await unseal({ ...sealed, ct: ct.buffer }, await keyFor(pass, sealed))).toBeNull();
    const iv = sealed.iv.slice();
    iv[0] ^= 1;
    expect(await unseal({ ...sealed, iv }, await keyFor(pass, sealed))).toBeNull();
    // Changing the stored iteration count breaks authentication too.
    const weakened = { ...sealed, iterations: 2_000 };
    expect(await unseal(weakened, await keyFor(pass, weakened))).toBeNull();
  });

  it("uses a fresh IV per save and a fresh salt per passphrase", async () => {
    const vk = await newKey("correct horse battery", FAST);
    const a = await seal(file, vk);
    const b = await seal(file, vk);
    expect(a.iv).not.toEqual(b.iv);
    expect(new Uint8Array(a.ct)).not.toEqual(new Uint8Array(b.ct));
    const other = await newKey("correct horse battery", FAST);
    expect(other.salt).not.toEqual(vk.salt);
  });

  it("defaults to 600k PBKDF2 iterations", async () => {
    expect(KDF_ITERATIONS).toBeGreaterThanOrEqual(600_000);
    const sealed = await seal(file, await newKey("correct horse battery"));
    expect(sealed.iterations).toBe(KDF_ITERATIONS);
    expect((await unseal(sealed, await keyFor("correct horse battery", sealed)))?.name).toBe(file.name);
  });

  it("recognizes only well-formed sealed records", async () => {
    const sealed = await seal(file, await newKey("correct horse battery", 100_000));
    expect(isSealed(sealed)).toBe(true);
    // The old plaintext format must not pass.
    expect(isSealed({ name: "x.xlsx", savedAt: 1, bytes: new ArrayBuffer(4) })).toBe(false);
    expect(isSealed({ ...sealed, iterations: 10 })).toBe(false);
    expect(isSealed({ ...sealed, iv: new Uint8Array(4) })).toBe(false);
    expect(isSealed(null)).toBe(false);
  });
});
