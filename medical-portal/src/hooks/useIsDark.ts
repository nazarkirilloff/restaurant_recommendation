import { useSyncExternalStore } from "react";

// One MutationObserver for the whole page, shared by every chart and sparkline.
const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!observer) {
    observer = new MutationObserver(() => listeners.forEach((l) => l()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

const isDark = () => document.documentElement.classList.contains("dark");

/** Tracks the `dark` class on <html>, so components drawing SVG can pick colors. */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, isDark, () => false);
}
