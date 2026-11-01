import { Languages } from "lucide-react";
import { useI18n } from "../i18n/I18n";

/** One button labelled with the other language, e.g. "Українська" while in English. */
export function LanguageToggle() {
  const { lang, t, setLang } = useI18n();
  const other = lang === "en" ? "uk" : "en";
  return (
    <button
      type="button"
      onClick={() => setLang(other)}
      lang={other}
      title={t.topBar.language}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      <Languages className="h-3.5 w-3.5" aria-hidden />
      {t.switchLangLabel}
    </button>
  );
}
