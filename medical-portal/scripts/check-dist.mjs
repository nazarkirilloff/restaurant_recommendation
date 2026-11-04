#!/usr/bin/env node
// Verifies the built single-file page keeps its privacy guarantees. Run after
// `npm run build` (CI does): `node scripts/check-dist.mjs [path/to/index.html]`.
//
//  1. A Content-Security-Policy meta tag exists and is strict: no network
//     connections, no external resources, scripts by hash only, Trusted Types.
//  2. Every inline script's hash is allowed by it (so the page actually runs).
//  3. No code — in the page or in base64-inlined workers — uses a network API.
//  4. No element loads anything from a URL.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseAst } from "vite";

const file = process.argv[2] ?? new URL("../dist/index.html", import.meta.url).pathname;
const html = readFileSync(file, "utf8");
const failures = [];
const fail = (msg) => failures.push(msg);

// --- 1. CSP ------------------------------------------------------------------
const metas = [...html.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/gi)];
if (metas.length !== 1) fail(`expected exactly one CSP meta tag, found ${metas.length}`);
const policy = new Map(
  (metas[0]?.[1] ?? "")
    .split(";")
    .map((d) => d.trim().split(/\s+/))
    .filter((parts) => parts[0])
    .map(([name, ...values]) => [name, values]),
);
const exactly = (name, ...values) => {
  const got = policy.get(name);
  if (!got || got.join(" ") !== values.join(" ")) fail(`CSP ${name} must be "${values.join(" ")}", got "${got?.join(" ") ?? "(missing)"}"`);
};
exactly("default-src", "'none'");
exactly("connect-src", "'none'");
exactly("worker-src", "blob:");
exactly("object-src", "'none'");
exactly("frame-src", "'none'");
exactly("base-uri", "'none'");
exactly("form-action", "'none'");
exactly("require-trusted-types-for", "'script'");
for (const name of ["img-src", "font-src"]) {
  const bad = (policy.get(name) ?? []).filter((v) => v !== "data:" && v !== "blob:");
  if (bad.length) fail(`CSP ${name} may only allow data:/blob:, got ${bad.join(" ")}`);
}
const scriptSrc = policy.get("script-src") ?? [];
const nonHash = scriptSrc.filter((v) => !/^'sha256-[A-Za-z0-9+/=]+'$/.test(v));
if (scriptSrc.length === 0) fail("CSP script-src missing");
if (nonHash.length) fail(`CSP script-src may only contain hashes, got ${nonHash.join(" ")}`);
for (const [name, values] of policy) {
  if (values.some((v) => /^(https?:|\*|'unsafe-eval'|'strict-dynamic')/.test(v) || (v === "'unsafe-inline'" && name !== "style-src"))) {
    fail(`CSP ${name} is too permissive: ${values.join(" ")}`);
  }
}
// The CSP must come before any script so it applies to all of them.
if (metas[0] && html.search(/<script\b/i) < metas[0].index) fail("CSP meta tag comes after a <script>");

// --- 2. inline scripts are allowed by hash -------------------------------------
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
for (const [, attrs, body] of scripts) {
  if (/\bsrc\s*=/.test(attrs)) fail(`external script: <script${attrs}>`);
  const hash = `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
  if (!scriptSrc.includes(hash)) fail(`inline script not allowed by CSP (hash ${hash})`);
}

// --- 3. parsing stays in the worker; no network APIs anywhere -----------------
// Inlined workers are large string literals (base64 in Vite 5, plain source in
// Vite 8). Find them with a real JS parser, so the checker doesn't depend on
// how the bundler happens to encode them.
const WORKER_MIN = 50_000;
const workers = [];
let mainCode = "";
for (const [, , body] of scripts) {
  const cuts = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.type === "Literal" && typeof node.value === "string" && node.value.length >= WORKER_MIN) {
      cuts.push([node.start, node.end, node.value]);
      return;
    }
    if (node.type === "TemplateLiteral" && node.quasis.length === 1) {
      const text = node.quasis[0].value.cooked ?? "";
      if (text.length >= WORKER_MIN) {
        cuts.push([node.start, node.end, text]);
        return;
      }
    }
    for (const key in node) if (key !== "type" && key !== "start" && key !== "end") visit(node[key]);
  };
  try {
    visit(parseAst(body));
  } catch (err) {
    fail(`an inline script can't be parsed: ${String(err.message ?? err).slice(0, 80)}`);
    continue;
  }
  let rest = "";
  let at = 0;
  for (const [start, end, text] of cuts.sort((a, b) => a[0] - b[0])) {
    rest += body.slice(at, start);
    at = end;
    workers.push(/^[A-Za-z0-9+/]+={0,2}$/.test(text) ? Buffer.from(text, "base64").toString("utf8") : text);
  }
  mainCode += rest + body.slice(at) + "\n";
}
if (workers.length === 0) fail("no inlined worker found (is parsing back on the main thread?)");
if (!workers.some((w) => /onmessage/.test(w) && /openxmlformats/.test(w))) fail("no inlined worker contains the spreadsheet parser");
if (/openxmlformats|SheetJS/.test(mainCode)) fail("the spreadsheet parser is on the main thread (it must run only in the worker)");

const NETWORK = {
  "fetch()": /\bfetch\s*\(/,
  XMLHttpRequest: /XMLHttpRequest/,
  sendBeacon: /sendBeacon/,
  WebSocket: /new\s+WebSocket\b/,
  EventSource: /\bEventSource\b/,
  importScripts: /importScripts\s*\(/,
  RTCPeerConnection: /RTCPeerConnection/,
};
const code = [["main thread", mainCode], ...workers.map((w, i) => [`worker ${i + 1}`, w])];
for (const [where, text] of code) {
  for (const [api, re] of Object.entries(NETWORK)) if (re.test(text)) fail(`${api} found in ${where}`);
}

// --- 4. no element loads a URL --------------------------------------------------
const markup = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
for (const m of markup.matchAll(/\b(src|href|action|poster|data)\s*=\s*"([^"]*)"/gi)) {
  if (!/^(data:|blob:|#|$)/.test(m[2])) fail(`markup loads a URL: ${m[0].slice(0, 80)}`);
}

// --- report -----------------------------------------------------------------------
if (failures.length) {
  console.error(`✗ ${file}\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log(
  `✓ ${file}: strict CSP (${scriptSrc.length} script hashes, Trusted Types), parser only in ${workers.length} worker(s), no network APIs in page or worker, no external resources`,
);
