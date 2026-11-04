import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { STRINGS, type Lang, type Strings } from "./strings";

const STORAGE_KEY = "medical-portal:lang";

interface I18n {
  lang: Lang;
  t: Strings;
  setLang: (lang: Lang) => void;
}

const Ctx = createContext<I18n | null>(null);

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "uk") return stored;
  } catch {
    /* storage unavailable */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  return /^uk\b/i.test(nav) ? "uk" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = STRINGS[lang].app.title;
  }, [lang]);

  const value = useMemo<I18n>(
    () => ({
      lang,
      t: STRINGS[lang],
      setLang: (next) => {
        setLangState(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* storage unavailable: choice lasts for this visit */
        }
      },
    }),
    [lang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
