import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { parseFile } from "../lib/parseFile";
import type { ParsedWorkbook } from "../types";

interface Props {
  onLoaded: (workbook: ParsedWorkbook) => void;
}

interface ErrorState {
  message: string;
  detail?: string;
}

export function FileUpload({ onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      const result = await parseFile(file);
      setBusy(false);
      if (result.ok) {
        onLoaded(result.workbook);
      } else {
        setError({ message: result.message, detail: result.detail });
      }
    },
    [onLoaded],
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <label
        htmlFor="file-input"
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-10 text-center transition-colors dark:bg-slate-900 ${
          dragActive
            ? "border-teal-500 bg-teal-50/50 dark:border-teal-400 dark:bg-teal-950/30"
            : "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600"
        }`}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
          {busy ? (
            <FileSpreadsheet className="h-6 w-6 animate-pulse" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
        </div>
        <h2 className="text-lg font-semibold tracking-tight">
          {busy ? "Reading your file…" : "Upload your lab results"}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Drag a file here or click to browse.
        </p>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Supports .xlsx and .csv · .numbers must be exported first
        </p>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Your data stays in your browser. Nothing is uploaded or stored.
        </p>
        <input
          ref={inputRef}
          id="file-input"
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv,.numbers"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </label>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <p className="font-medium">{error.message}</p>
          {error.detail && (
            <p className="mt-1 text-rose-700 dark:text-rose-300">{error.detail}</p>
          )}
        </div>
      )}
    </div>
  );
}
