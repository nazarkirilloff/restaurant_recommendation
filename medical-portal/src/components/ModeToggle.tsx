import type { RangeMode } from "../types";

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: RangeMode;
  onChange: (m: RangeMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Reference mode"
      className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"
    >
      <button
        role="radio"
        aria-checked={mode === "standard"}
        onClick={() => onChange("standard")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === "standard"
            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        Standard medical
      </button>
      <button
        role="radio"
        aria-checked={mode === "biohacker"}
        onClick={() => onChange("biohacker")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === "biohacker"
            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        Biohacker
      </button>
    </div>
  );
}
