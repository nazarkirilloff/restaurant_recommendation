/**
 * Normalizes a marker name into a lookup key.
 *
 *   "Lp(a)"               → "lp a"
 *   "Non-HDL Cholesterol" → "non hdl cholesterol"
 *   "Neutrophils %"       → "neutrophils percent"
 *   "Neutrophils #"       → "neutrophils number"
 */
export function markerKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/#/g, " number ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
