import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, History, Trash2, Upload } from "lucide-react";
import type { DeviceMemory } from "../hooks/useDeviceMemory";
import { formatDateLong } from "../lib/format";
import { parseFile } from "../lib/parseFile";
import type { ParsedWorkbook, ParseResult } from "../types";
import { useI18n } from "../i18n/I18n";

interface Props {
  onLoaded: (workbook: ParsedWorkbook) => void;
  memory: DeviceMemory;
}

type ErrorState = Extract<ParseResult, { ok: false }>;

export function FileUpload({ onLoaded, memory }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { t } = useI18n();
  const { keep } = memory;
  const shown = error ? t.errors[error.code](error.ext) : null;

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      const result = await parseFile(file);
      setBusy(false);
      if (result.ok) {
        await keep(file);
        onLoaded(result.workbook);
      } else {
        setError(result);
      }
    },
    [onLoaded, keep],
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
          {busy ? t.upload.reading : t.upload.title}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t.upload.hint}
        </p>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {t.upload.formats}
        </p>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          {memory.remember ? t.upload.privacyRemembered : t.upload.privacy}
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

      {memory.available && (
        <div className="mt-4 space-y-3">
          {memory.saved && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="min-w-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const s = memory.saved!;
                    void handleFile(new File([s.bytes], s.name));
                  }}
                  className="inline-flex max-w-full items-center gap-2 text-sm font-medium text-teal-700 hover:underline disabled:opacity-50 dark:text-teal-300"
                >
                  <History className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{t.remember.reopen(memory.saved.name)}</span>
                </button>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t.remember.saved(formatDateLong(new Date(memory.saved.savedAt), t.locale))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void memory.forget()}
                title={t.remember.forgetTitle}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {t.remember.forget}
              </button>
            </div>
          )}
          <label className="flex cursor-pointer items-start gap-2.5 px-1 text-sm">
            <input
              type="checkbox"
              checked={memory.remember}
              onChange={(e) => memory.setRemember(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-teal-700"
            />
            <span>
              <span className="font-medium">{t.remember.optIn}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{t.remember.help}</span>
            </span>
          </label>
        </div>
      )}

      {error && shown && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <p className="font-medium">{shown.message}</p>
          {(shown.detail ?? error.detail) && (
            <p className="mt-1 text-rose-700 dark:text-rose-300">{shown.detail ?? error.detail}</p>
          )}
        </div>
      )}
    </div>
  );
}
