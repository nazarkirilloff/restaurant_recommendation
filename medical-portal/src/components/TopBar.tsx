import { FileSpreadsheet, FileText, Moon, RotateCcw, Sun } from "lucide-react";
import type { RangeMode } from "../types";
import { ModeToggle } from "./ModeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { UnitToggle } from "./UnitToggle";
import type { UnitSystem } from "../lib/units";
import { useI18n } from "../i18n/I18n";

interface Props {
  fileName: string;
  measurementCount: number;
  mode: RangeMode;
  onModeChange: (m: RangeMode) => void;
  onReset: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onReport: () => void;
  units: UnitSystem;
  onUnitsChange: (u: UnitSystem) => void;
}

export function TopBar({
  fileName,
  measurementCount,
  mode,
  onModeChange,
  onReset,
  theme,
  onThemeToggle,
  onReport,
  units,
  onUnitsChange,
}: Props) {
  const { t } = useI18n();
  return (
    <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-col">
            <div className="truncate text-sm font-medium" title={fileName}>
              {fileName}
            </div>
            <div className="hidden text-xs text-slate-500 dark:text-slate-400 md:block">
              {t.topBar.measurements(measurementCount)}
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ModeToggle mode={mode} onChange={onModeChange} />
          <UnitToggle units={units} onChange={onUnitsChange} />
        </div>

        <div className="flex items-center gap-1">
          <LanguageToggle />
          <button
            type="button"
            onClick={onReport}
            title={t.report.openTitle}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{t.report.open}</span>
            <span className="sr-only sm:hidden">{t.report.openTitle}</span>
          </button>
          <button
            type="button"
            onClick={onThemeToggle}
            aria-label={theme === "dark" ? t.topBar.toLight : t.topBar.toDark}
            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.topBar.newFile}</span>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-2 md:hidden dark:border-slate-800">
        <ModeToggle mode={mode} onChange={onModeChange} />
        <UnitToggle units={units} onChange={onUnitsChange} />
      </div>
    </header>
  );
}
