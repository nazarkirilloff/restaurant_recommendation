import type { DataSheet } from "../types";

interface Props {
  sheets: DataSheet[];
  active: string;
  onChange: (name: string) => void;
}

export function SheetTabs({ sheets, active, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Result sheets"
      className="no-print sticky top-14 z-10 -mx-4 overflow-x-auto border-b border-slate-200 bg-slate-50/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80"
    >
      <div className="flex min-w-max gap-1">
        {sheets.map((s) => {
          const isActive = s.name === active;
          return (
            <button
              key={s.name}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(s.name)}
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
