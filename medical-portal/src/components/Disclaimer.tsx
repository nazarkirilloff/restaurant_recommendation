import { useState } from "react";
import { ShieldAlert, X } from "lucide-react";

const STORAGE_KEY = "medical-portal:disclaimer-dismissed";

export function Disclaimer() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  return (
    <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">Educational visualization only.</span> Not
            medical advice. Reference ranges are illustrative — consult your physician.
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
          aria-label="Dismiss disclaimer"
          className="rounded p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
