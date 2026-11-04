import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * Content-Security-Policy for the built single-file page. It is what makes
 * "nothing leaves your browser" enforced rather than promised: no network
 * connections of any kind (fetch/XHR/WebSocket/beacons), no external images,
 * scripts, styles, fonts, frames, forms or <base>. Scripts are allowed only by
 * hash, the worker only as blob:, and Trusted Types block DOM injection.
 * (Top-level navigation can't be restricted by CSP; there is no code that does it.)
 */
function csp(scriptHashes: string[]): string {
  return [
    "default-src 'none'",
    `script-src ${scriptHashes.join(" ")}`,
    "style-src 'unsafe-inline'", // React/Recharts style attributes and the inlined stylesheet
    "img-src data: blob:",
    "font-src data:",
    "connect-src 'none'",
    "worker-src blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "media-src 'none'",
    "manifest-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "require-trusted-types-for 'script'",
    "trusted-types default",
  ].join("; ");
}

/** After the single-file plugin has inlined everything, hash every inline script and add the CSP. */
function contentSecurityPolicy(): Plugin {
  let outDir = "dist";
  return {
    name: "content-security-policy",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    writeBundle() {
      const file = join(outDir, "index.html");
      const html = readFileSync(file, "utf8");
      const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(
        (m) => `'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`,
      );
      if (hashes.length === 0) throw new Error("CSP: no inline scripts found");
      const meta = `<meta http-equiv="Content-Security-Policy" content="${csp(hashes)}" />`;
      const charset = /<meta charset="UTF-8"\s*\/?>/i;
      if (!charset.test(html)) throw new Error("CSP: <meta charset> not found");
      writeFileSync(file, html.replace(charset, (m) => `${m}\n    ${meta}`));
    },
  };
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), contentSecurityPolicy()],
  server: {
    port: 5173,
    // Localhost only: never expose the dev server (and the project folder) to the network.
    host: "127.0.0.1",
    strictPort: true,
  },
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    // No <link rel="modulepreload"> exists in a single file; drop the fetch()-based polyfill.
    modulePreload: false,
    // (vite-plugin-singlefile turns code splitting off, so everything lands in one file.)
  },
});
