import type { ParseResult } from "../types";
import { parseSafely } from "./parseSafely";
// Bundled into the single HTML file as a blob: worker (no extra file, no network).
import ParseWorker from "../workers/parse.worker?worker&inline";

/** How the app reads an uploaded file: in a Web Worker, with a timeout. */
export function parseInBrowser(file: File): Promise<ParseResult> {
  return parseSafely(file, { createWorker: () => new ParseWorker() });
}
