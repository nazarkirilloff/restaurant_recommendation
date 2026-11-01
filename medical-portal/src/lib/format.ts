const LONG = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const SHORT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
});

/** "19 Jan 2023" */
export function formatDateLong(d: Date): string {
  return LONG.format(d);
}

/** "Jan 23" — for chart axis ticks. */
export function formatDateShort(d: Date): string {
  return SHORT.format(d);
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
