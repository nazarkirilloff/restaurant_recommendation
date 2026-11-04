// Passphrase encryption for the opt-in "remember my last file" copy.
//
// AES-GCM-256 with a key derived by PBKDF2-SHA256 (600k iterations, random
// 16-byte salt). Everything about the file — name, save time, bytes — is inside
// the ciphertext; only the KDF parameters, salt and IV are stored in the clear.
// AES-GCM authenticates, so a wrong passphrase or a tampered record fails to
// open instead of yielding garbage. Keys are non-extractable CryptoKeys; the
// passphrase itself is never stored.

/** Bytes backed by a plain ArrayBuffer (what WebCrypto accepts). */
type Bytes = Uint8Array<ArrayBuffer>;

export const KDF_ITERATIONS = 600_000;
export const MIN_PASSPHRASE = 8;
const VERSION = 2;

export interface SealedFile {
  v: typeof VERSION;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: Bytes;
  iv: Bytes;
  ct: ArrayBuffer;
}

export interface OpenedFile {
  name: string;
  savedAt: number;
  bytes: ArrayBuffer;
}

/** A derived key plus the salt/iterations it came from (reused for later saves). */
export interface VaultKey {
  key: CryptoKey;
  salt: Bytes;
  iterations: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Binds the format version and KDF strength to the ciphertext. */
const aad = (iterations: number) => enc.encode(`medical-portal/v${VERSION}/pbkdf2-sha256/${iterations}`);

function random(n: number): Bytes {
  return crypto.getRandomValues(new Uint8Array(n));
}

async function derive(passphrase: string, salt: Bytes, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** A fresh key for a new passphrase (random salt). */
export async function newKey(passphrase: string, iterations = KDF_ITERATIONS): Promise<VaultKey> {
  const salt = random(16);
  return { key: await derive(passphrase, salt, iterations), salt, iterations };
}

/** The key a passphrase gives for an existing sealed record. */
export async function keyFor(passphrase: string, sealed: SealedFile): Promise<VaultKey> {
  return {
    key: await derive(passphrase, sealed.salt, sealed.iterations),
    salt: sealed.salt,
    iterations: sealed.iterations,
  };
}

/** Layout of the plaintext: [u32 header length][header JSON][file bytes]. */
export async function seal(file: OpenedFile, vk: VaultKey): Promise<SealedFile> {
  const header = enc.encode(JSON.stringify({ name: file.name, savedAt: file.savedAt }));
  const plain = new Uint8Array(4 + header.length + file.bytes.byteLength);
  new DataView(plain.buffer).setUint32(0, header.length);
  plain.set(header, 4);
  plain.set(new Uint8Array(file.bytes), 4 + header.length);

  const iv = random(12); // fresh for every encryption
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(vk.iterations) },
    vk.key,
    plain,
  );
  return { v: VERSION, kdf: "PBKDF2-SHA256", iterations: vk.iterations, salt: vk.salt, iv, ct };
}

/** Decrypts a sealed record; null for a wrong passphrase or a modified record. */
export async function unseal(sealed: SealedFile, vk: VaultKey): Promise<OpenedFile | null> {
  try {
    const plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: sealed.iv, additionalData: aad(sealed.iterations) },
        vk.key,
        sealed.ct,
      ),
    );
    const len = new DataView(plain.buffer).getUint32(0);
    const header = JSON.parse(dec.decode(plain.subarray(4, 4 + len))) as { name: unknown; savedAt: unknown };
    if (typeof header.name !== "string" || typeof header.savedAt !== "number") return null;
    return { name: header.name, savedAt: header.savedAt, bytes: plain.slice(4 + len).buffer };
  } catch {
    return null;
  }
}

/** Shape check for records read back from storage (anything else is discarded). */
export function isSealed(x: unknown): x is SealedFile {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    r.v === VERSION &&
    r.kdf === "PBKDF2-SHA256" &&
    typeof r.iterations === "number" &&
    r.iterations >= 100_000 &&
    r.salt instanceof Uint8Array &&
    r.salt.length === 16 &&
    r.iv instanceof Uint8Array &&
    r.iv.length === 12 &&
    r.ct instanceof ArrayBuffer
  );
}
