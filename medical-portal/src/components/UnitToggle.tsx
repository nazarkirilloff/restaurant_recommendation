import { useRef, type KeyboardEvent } from "react";
import type { UnitSystem } from "../lib/units";
import { useI18n } from "../i18n/I18n";

const OPTIONS: UnitSystem[] = ["si", "us"];

/** SI (as in the file) ⇄ US conventional units. Radio group with arrow keys. */
export function UnitToggle({
  units,
  onChange,
}: {
  units: UnitSystem;
  onChange: (u: UnitSystem) => void;
}) {
  const { t } = useI18n();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = (index + 1) % OPTIONS.length;
    onChange(OPTIONS[next]);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t.units.group}
      className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"
    >
      {OPTIONS.map((o, i) => {
        const checked = units === o;
        return (
          <button
            key={o}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            title={o === "si" ? t.units.siTitle : t.units.usTitle}
            onClick={() => onChange(o)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              checked
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {o === "si" ? t.units.si : t.units.us}
          </button>
        );
      })}
    </div>
  );
}
