const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opts);
    cache.set(key, f);
  }
  return f;
}

/** "19 Jan 2023" (en-GB) · "19 січ. 2023 р." (uk-UA) */
export function formatDateLong(d: Date, locale = "en-GB"): string {
  return formatter(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** "Jan 23" — for chart axis ticks. */
export function formatDateShort(d: Date, locale = "en-GB"): string {
  return formatter(locale, { month: "short", year: "2-digit" }).format(d);
}

/**
 * Builds a calendar date at local midnight. Lab dates are calendar days, not
 * instants — `new Date("2023-01-19")` would be UTC midnight and render as the
 * previous day in timezones west of UTC.
 */
export function localDate(year: number, month1: number, day: number): Date | null {
  const d = new Date(year, month1 - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month1 - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

/**
 * Parses a date written as text: ISO `2023-01-19` (optionally with a time part)
 * or day-first `19.01.2023` / `19/01/2023`.
 */
export function parseDateText(text: string): Date | null {
  const s = text.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
  if (m) return localDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  if (m) return localDate(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}
