// Runs SheetJS off the main thread (see lib/parseSafely.ts).
import { parseBytes } from "../lib/parseFile";

interface WorkerScope {
  onmessage: ((e: MessageEvent<{ name: string; bytes: ArrayBuffer }>) => void) | null;
  postMessage(message: unknown): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (e) => {
  scope.postMessage(parseBytes(e.data.name, e.data.bytes));
};
