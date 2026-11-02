import { Lock } from "lucide-react";
import { useI18n } from "../i18n/I18n";

export function Footer({ remembered = false }: { remembered?: boolean }) {
  const { t } = useI18n();
  return (
    <footer className="no-print mt-12 border-t border-slate-200 bg-white py-6 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 text-center">
        <p className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          {remembered ? t.upload.privacyRemembered : t.footer.privacy}
        </p>
        <p className="text-slate-400 dark:text-slate-500">{t.footer.version}</p>
      </div>
    </footer>
  );
}
