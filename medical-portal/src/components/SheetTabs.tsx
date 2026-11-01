import { useRef, type KeyboardEvent } from "react";
import type { DataSheet } from "../types";
import { useI18n } from "../i18n/I18n";

interface Props {
  sheets: DataSheet[];
  active: string;
  onChange: (name: string) => void;
}

export const SHEET_PANEL_ID = "sheet-panel";
export const sheetTabId = (name: string) => `sheet-tab-${name.replace(/\W+/g, "-")}`;

/**
 * WAI-ARIA tabs: one tab stop; ←/→ (and Home/End) move between sheets and
 * activate them, so keyboard users don't have to tab through every sheet.
 */
export function SheetTabs({ sheets, active, onChange }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const { t } = useI18n();

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % sheets.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + sheets.length) % sheets.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = sheets.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(sheets[next].name);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t.tabs.group}
      className="no-print sticky top-14 z-10 -mx-4 overflow-x-auto border-b border-slate-200 bg-slate-50/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80"
    >
      <div className="flex min-w-max gap-1">
        {sheets.map((s, i) => {
          const isActive = s.name === active;
          return (
            <button
              key={s.name}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={sheetTabId(s.name)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={SHEET_PANEL_ID}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(s.name)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {s.name}
              <span className="ml-2 text-xs text-slate-400 tabnum">{s.markers.length}</span>
              {isActive && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal-600 dark:bg-teal-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
