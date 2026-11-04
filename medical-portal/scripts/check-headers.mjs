#!/usr/bin/env node
// Checks the security headers of a deployed copy of the page:
//   node scripts/check-headers.mjs https://labs.example.org/
// Exits 1 and lists what's wrong if the host doesn't send the headers the
// build generated (dist/_headers), or serves a page without its CSP.

/** Header checks shared with the browser tests. Returns a list of problems. */
export function headerProblems(headers, html, { https = true } = {}) {
  const get = (name) => (typeof headers.get === "function" ? headers.get(name) : headers[name.toLowerCase()]) ?? null;
  const problems = [];
  const expect = (name, test, hint) => {
    const value = get(name);
    if (value === null) problems.push(`missing ${name} (${hint})`);
    else if (!test(value)) problems.push(`${name} is "${value.slice(0, 120)}" (${hint})`);
  };

  expect(
    "Content-Security-Policy",
    (v) =>
      /(^|;)\s*default-src 'none'/.test(v) &&
      /(^|;)\s*connect-src 'none'/.test(v) &&
      /(^|;)\s*frame-ancestors 'none'/.test(v) &&
      /(^|;)\s*require-trusted-types-for 'script'/.test(v) &&
      !/'unsafe-eval'|\*/.test(v),
    "needs default-src/connect-src/frame-ancestors 'none' and Trusted Types",
  );
  expect("X-Frame-Options", (v) => v.toUpperCase() === "DENY", "should be DENY");
  expect("Referrer-Policy", (v) => v === "no-referrer", "should be no-referrer");
  expect("X-Content-Type-Options", (v) => v.toLowerCase() === "nosniff", "should be nosniff");
  expect("Cross-Origin-Opener-Policy", (v) => v === "same-origin", "should be same-origin");
  expect("Permissions-Policy", (v) => /camera=\(\)/.test(v) && /microphone=\(\)/.test(v) && /geolocation=\(\)/.test(v), "should disable camera, microphone, geolocation…");
  if (https) expect("Strict-Transport-Security", (v) => /max-age=\d{7,}/.test(v), "HTTPS only, max-age ≥ ~4 months");

  if (html !== undefined && !/<meta\s+http-equiv="Content-Security-Policy"/i.test(html)) {
    problems.push("the page itself has no CSP meta tag (is this the built dist/index.html?)");
  }
  return problems;
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const url = process.argv[2];
  if (!url) {
    console.error("usage: node scripts/check-headers.mjs <url>");
    process.exit(2);
  }
  const res = await fetch(url, { redirect: "follow" });
  const problems = headerProblems(res.headers, await res.text(), { https: res.url.startsWith("https:") });
  if (!res.url.startsWith("https:")) problems.push("not served over HTTPS");
  if (problems.length) {
    console.error(`✗ ${res.url}\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`✓ ${res.url}: security headers OK`);
}
