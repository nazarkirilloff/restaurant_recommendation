import { useCallback, useEffect, useState } from "react";
import {
  forgetFile,
  loadFile,
  rememberPreference,
  saveFile,
  setRememberPreference,
  storageAvailable,
  type SavedFile,
} from "../lib/deviceStore";

export interface DeviceMemory {
  /** On-device storage works in this browser (otherwise the option is hidden). */
  available: boolean;
  /** The user opted in. */
  remember: boolean;
  /** The saved file, if any. */
  saved: SavedFile | null;
  setRemember: (on: boolean) => void;
  /** Store a successfully opened file (no-op unless opted in). */
  keep: (file: File) => Promise<void>;
  forget: () => Promise<void>;
}

export function useDeviceMemory(): DeviceMemory {
  const [available, setAvailable] = useState(false);
  const [remember, setRememberState] = useState(rememberPreference);
  const [saved, setSaved] = useState<SavedFile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await storageAvailable();
      if (cancelled) return;
      setAvailable(ok);
      if (ok) {
        const file = await loadFile();
        if (!cancelled) setSaved(file);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const forget = useCallback(async () => {
    await forgetFile();
    setSaved(null);
  }, []);

  const setRemember = useCallback(
    (on: boolean) => {
      setRememberState(on);
      setRememberPreference(on);
      // Turning the option off deletes what was kept: "off" means nothing stored.
      if (!on) void forget();
    },
    [forget],
  );

  const keep = useCallback(
    async (file: File) => {
      if (!remember || !available) return;
      const bytes = await file.arrayBuffer();
      if (await saveFile(file.name, bytes)) setSaved({ name: file.name, savedAt: Date.now(), bytes });
    },
    [remember, available],
  );

  return { available, remember: remember && available, saved, setRemember, keep, forget };
}
