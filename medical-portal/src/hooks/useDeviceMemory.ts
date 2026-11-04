import { useCallback, useEffect, useRef, useState } from "react";
import {
  forgetFile,
  loadSealed,
  rememberPreference,
  saveSealed,
  setRememberPreference,
  storageAvailable,
} from "../lib/deviceStore";
import { keyFor, newKey, seal, unseal, type OpenedFile, type SealedFile, type VaultKey } from "../lib/vault";

export interface DeviceMemory {
  /** On-device storage works in this browser (otherwise the option is hidden). */
  available: boolean;
  /** The user opted in. */
  remember: boolean;
  /** An encrypted copy is stored on this device. */
  hasSaved: boolean;
  /** A key is held in memory for this visit: files opened now get saved. */
  unlocked: boolean;
  setRemember: (on: boolean) => void;
  /** Choose the passphrase for new saves (when nothing is saved yet). */
  setPassphrase: (passphrase: string) => Promise<void>;
  /** Decrypt the saved copy; null if the passphrase is wrong or the copy was altered. */
  unlock: (passphrase: string) => Promise<OpenedFile | null>;
  /** Save a successfully opened file, encrypted (no-op unless opted in and unlocked). */
  keep: (file: File) => Promise<void>;
  forget: () => Promise<void>;
}

/**
 * State for the opt-in encrypted "remember my last file". The passphrase is
 * never stored; only the derived, non-extractable key is kept in memory for
 * the current visit, so files opened later in the visit are saved too.
 */
export function useDeviceMemory(): DeviceMemory {
  const [available, setAvailable] = useState(false);
  const [remember, setRememberState] = useState(rememberPreference);
  const [sealed, setSealed] = useState<SealedFile | null>(null);
  const [vaultKey, setVaultKey] = useState<VaultKey | null>(null);
  const keyRef = useRef<VaultKey | null>(null);
  keyRef.current = vaultKey;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await storageAvailable();
      if (cancelled) return;
      setAvailable(ok);
      // loadSealed also deletes any plaintext copy left by an earlier version.
      if (ok) {
        const s = await loadSealed();
        if (!cancelled) setSealed(s);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const forget = useCallback(async () => {
    await forgetFile();
    setSealed(null);
    setVaultKey(null);
  }, []);

  const setRemember = useCallback(
    (on: boolean) => {
      setRememberState(on);
      setRememberPreference(on);
      // "Off" means nothing stored and no key kept.
      if (!on) void forget();
    },
    [forget],
  );

  const setPassphrase = useCallback(async (passphrase: string) => {
    setVaultKey(await newKey(passphrase));
  }, []);

  const unlock = useCallback(async (passphrase: string) => {
    const current = await loadSealed();
    setSealed(current);
    if (!current) return null;
    const vk = await keyFor(passphrase, current);
    const opened = await unseal(current, vk);
    if (opened) setVaultKey(vk);
    return opened;
  }, []);

  const keep = useCallback(
    async (file: File) => {
      const vk = keyRef.current;
      if (!remember || !available || !vk) return;
      const s = await seal({ name: file.name, savedAt: Date.now(), bytes: await file.arrayBuffer() }, vk);
      if (await saveSealed(s)) setSealed(s);
    },
    [remember, available],
  );

  return {
    available,
    remember: remember && available,
    hasSaved: sealed !== null,
    unlocked: vaultKey !== null,
    setRemember,
    setPassphrase,
    unlock,
    keep,
    forget,
  };
}
