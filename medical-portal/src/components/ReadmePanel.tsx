import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import type { InfoSheet } from "../types";
import { useI18n } from "../i18n/I18n";

export function ReadmePanel({ info }: { info: InfoSheet[] }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  if (info.length === 0 || info.every((s) => s.lines.length === 0)) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Info className="h-4 w-4 text-slate-500" />
          {t.readme.about}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-4 border-t border-slate-200 bg-slate-50/50 px-4 py-4 text-sm dark:border-slate-800 dark:bg-slate-900/50">
          {info.map((sheet) => (
            <div key={sheet.name}>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {sheet.name}
              </h4>
              <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                {sheet.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
