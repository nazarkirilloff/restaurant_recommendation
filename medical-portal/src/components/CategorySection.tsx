import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Marker, RangeMode } from "../types";
import { MarkerRow } from "./MarkerRow";

interface Props {
  category: string;
  markers: Marker[];
  mode: RangeMode;
  outOfRangeCount: number;
}

export function CategorySection({ category, markers, mode, outOfRangeCount }: Props) {
  const [open, setOpen] = useState(true);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 print-block">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`Toggle ${category}`}
            className="no-print rounded p-1 text-slate-500 transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-800"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`}
            />
          </button>
          <h3 className="text-sm font-semibold tracking-tight">
            {category}
            <span className="ml-2 text-xs font-normal text-slate-500 tabnum">
              {markers.length}
            </span>
          </h3>
        </div>
        {outOfRangeCount > 0 && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900">
            {outOfRangeCount} off
          </span>
        )}
      </header>
      {open && (
        <div>
          {markers.map((m) => (
            <MarkerRow key={`${category}/${m.nameEn}`} marker={m} mode={mode} />
          ))}
        </div>
      )}
    </section>
  );
}
