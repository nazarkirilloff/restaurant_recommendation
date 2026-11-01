import { useRef, type KeyboardEvent } from "react";
import type { RangeMode } from "../types";

const OPTIONS: { mode: RangeMode; label: string }[] = [
  { mode: "standard", label: "Standard medical" },
  { mode: "biohacker", label: "Biohacker" },
];

/** Radio group: one tab stop, arrow keys switch mode (WAI-ARIA radio pattern). */
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: RangeMode;
  onChange: (m: RangeMode) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = (index + step + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next].mode);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Reference ranges"
      className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"
    >
      {OPTIONS.map((o, i) => {
        const checked = mode === o.mode;
        return (
          <button
            key={o.mode}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.mode)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              checked
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
