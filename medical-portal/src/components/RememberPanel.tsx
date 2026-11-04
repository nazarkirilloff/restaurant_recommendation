import { useState, type FormEvent } from "react";
import { KeyRound, Lock, Trash2 } from "lucide-react";
import type { DeviceMemory } from "../hooks/useDeviceMemory";
import { MIN_PASSPHRASE } from "../lib/vault";
import { useI18n } from "../i18n/I18n";

interface Props {
  memory: DeviceMemory;
  /** Open a file (the decrypted saved copy) exactly like an upload. */
  onOpen: (file: File) => void;
  busy: boolean;
}

const input =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:focus:border-teal-400";
const primary =
  "inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500";
const secondary =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

/** Opt-in, passphrase-encrypted "remember my last file on this device". */
export function RememberPanel({ memory, onOpen, busy }: Props) {
  const { t } = useI18n();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  if (!memory.available) return null;

  const reset = () => {
    setPass("");
    setConfirm("");
    setError(null);
  };

  const onSet = async (e: FormEvent) => {
    e.preventDefault();
    if (pass.length < MIN_PASSPHRASE) return setError(t.remember.tooShort(MIN_PASSPHRASE));
    if (pass !== confirm) return setError(t.remember.mismatch);
    setWorking(true);
    await memory.setPassphrase(pass);
    setWorking(false);
    reset();
  };

  const onUnlock = async (e: FormEvent) => {
    e.preventDefault();
    setWorking(true);
    setError(null);
    const opened = await memory.unlock(pass);
    setWorking(false);
    if (!opened) return setError(t.remember.wrong);
    reset();
    onOpen(new File([opened.bytes], opened.name));
  };

  const forgetButton = (
    <button type="button" onClick={() => void memory.forget().then(reset)} title={t.remember.forgetTitle} className={secondary}>
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      {t.remember.forget}
    </button>
  );

  return (
    <div className="mt-4 space-y-3">
      {memory.hasSaved && !memory.unlocked && (
        <form
          onSubmit={onUnlock}
          className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="flex items-center gap-2 text-sm font-medium">
            <Lock className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden />
            {t.remember.lockedTitle}
          </p>
          <input
            type="password"
            autoComplete="current-password"
            aria-label={t.remember.passphrase}
            placeholder={t.remember.passphrase}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className={input}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="submit" disabled={working || busy || pass === ""} className={primary}>
              <KeyRound className="h-4 w-4" aria-hidden />
              {working ? t.remember.unlocking : t.remember.unlock}
            </button>
            {forgetButton}
          </div>
        </form>
      )}

      <label className="flex cursor-pointer items-start gap-2.5 px-1 text-sm">
        <input
          type="checkbox"
          checked={memory.remember}
          onChange={(e) => {
            reset();
            memory.setRemember(e.target.checked);
          }}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-teal-700"
        />
        <span>
          <span className="font-medium">{t.remember.optIn}</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">{t.remember.help}</span>
        </span>
      </label>

      {memory.remember && !memory.hasSaved && !memory.unlocked && (
        <form
          onSubmit={onSet}
          className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="text-sm font-medium">{t.remember.setTitle}</p>
          <input
            type="password"
            autoComplete="new-password"
            aria-label={t.remember.passphrase}
            placeholder={t.remember.passphrase}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className={input}
          />
          <input
            type="password"
            autoComplete="new-password"
            aria-label={t.remember.confirm}
            placeholder={t.remember.confirm}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={input}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.remember.noRecovery}</p>
          <button type="submit" disabled={working} className={primary}>
            {t.remember.setButton}
          </button>
        </form>
      )}

      {memory.remember && memory.unlocked && (
        <p className="flex items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            {t.remember.armed}
          </span>
          {memory.hasSaved && forgetButton}
        </p>
      )}

      {error && (
        <p role="alert" className="px-1 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
