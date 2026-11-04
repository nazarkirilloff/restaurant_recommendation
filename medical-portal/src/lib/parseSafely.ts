import type { ParseResult } from "../types";
import { precheck } from "./limits";

/** The parts of a Worker this module uses (so tests can pass a fake). */
export interface WorkerLike {
  postMessage(message: unknown, transfer: Transferable[]): void;
  terminate(): void;
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
}

export interface SafeParseOptions {
  /** Creates the parse worker. */
  createWorker?: () => WorkerLike;
  /**
   * Parses on the current thread when no worker can be created (tests).
   * The app passes none: without a worker it reports an error rather than
   * parsing unprotected on the main thread.
   */
  fallback?: (name: string, bytes: ArrayBuffer) => ParseResult;
  /** Give up (and kill the worker) after this long. */
  timeoutMs?: number;
}

export const PARSE_TIMEOUT_MS = 30_000;

/**
 * Parses a file in a Web Worker, so a huge or malicious file can't freeze the
 * page: after `timeoutMs` the worker is terminated, and a worker crash (e.g.
 * out of memory on a zip bomb) is reported instead of taking the tab down.
 */
export async function parseSafely(file: File, opts: SafeParseOptions = {}): Promise<ParseResult> {
  const pre = precheck(file.name, file.size);
  if (pre) return pre;
  const bytes = await file.arrayBuffer();

  let worker: WorkerLike | null = null;
  try {
    worker = opts.createWorker?.() ?? null;
  } catch {
    worker = null;
  }
  if (!worker) {
    if (opts.fallback) return opts.fallback(file.name, bytes);
    return {
      ok: false,
      code: "unreadable",
      message: "Could not start the file reader.",
      detail: "This browser blocked the background reader (Web Worker).",
    };
  }

  const w = worker;
  const timeoutMs = opts.timeoutMs ?? PARSE_TIMEOUT_MS;
  return new Promise<ParseResult>((resolve) => {
    let done = false;
    const finish = (result: ParseResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      w.onmessage = null;
      w.onerror = null;
      w.terminate();
      resolve(result);
    };
    const timer = setTimeout(
      () =>
        finish({
          ok: false,
          code: "timeout",
          message: "Reading this file took too long.",
          detail: `Stopped after ${Math.round(timeoutMs / 1000)} s.`,
        }),
      timeoutMs,
    );
    w.onmessage = (e) => finish(e.data as ParseResult);
    w.onerror = (e) => {
      e.preventDefault?.();
      finish({
        ok: false,
        code: "tooComplex",
        message: "This file is too big to analyse.",
        detail: "The reader ran out of resources.",
      });
    };
    // Transfer, don't copy: the page keeps no second copy of the bytes.
    w.postMessage({ name: file.name, bytes }, [bytes]);
  });
}
