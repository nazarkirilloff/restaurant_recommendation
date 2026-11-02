import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useI18n } from "../i18n/I18n";

interface Props {
  value: string;
  onChange: (q: string) => void;
  /** Matches in the current sheet; shown only while searching. */
  count: number;
  /** Other sheets with matches, as quick links. */
  elsewhere: { sheet: string; count: number }[];
  onJump: (sheet: string) => void;
}

function isTyping(el: Element | null): boolean {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

export function SearchBox({ value, onChange, count, elsewhere, onJump }: Props) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);

  // "/" focuses the search box from anywhere on the page (unless already typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(document.activeElement)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searching = value.trim() !== "";

  return (
    <div className="no-print space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          ref={input}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onChange("");
              input.current?.blur();
            }
          }}
          aria-label={t.search.label}
          placeholder={t.search.placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-24 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:focus:border-teal-400"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {searching ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                input.current?.focus();
              }}
              aria-label={t.search.clear}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd
              title={t.search.shortcut}
              className="hidden rounded border border-slate-200 px-1.5 text-[11px] text-slate-400 sm:inline dark:border-slate-700"
            >
              /
            </kbd>
          )}
        </div>
      </div>
      {searching && (
        <p
          aria-live="polite"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400"
        >
          <span>{t.search.results(count)}</span>
          {elsewhere.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{t.search.alsoIn}</span>
              {elsewhere.map((e) => (
                <button
                  key={e.sheet}
                  type="button"
                  onClick={() => onJump(e.sheet)}
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-teal-700 hover:bg-teal-50 dark:border-slate-700 dark:text-teal-300 dark:hover:bg-teal-950/40"
                >
                  {e.sheet} <span className="tabnum text-slate-400">{e.count}</span>
                </button>
              ))}
            </>
          )}
        </p>
      )}
    </div>
  );
}
