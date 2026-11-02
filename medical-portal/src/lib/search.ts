import type { Marker } from "../types";

/** Lowercase, apostrophes dropped, other punctuation → space: "Lp(a)" → "lp a", "об'єм" → "обєм". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’ʼ`]/g, "")
    .replace(/[^\p{L}\p{N}%]+/gu, " ")
    .trim();
}

function wordsMatch(words: string[], text: string): boolean {
  const haystack = normalize(text);
  const tokens = haystack.split(" ");
  return words.every((w) =>
    w.length >= 3 ? haystack.includes(w) : tokens.some((t) => t.startsWith(w)),
  );
}

function queryWords(query: string): string[] {
  return normalize(query).split(" ").filter(Boolean);
}

/**
 * True when every word of the query appears in the marker's English or
 * Ukrainian name ("hdl", "холест", "lp(a)"). With `byCategory`, the category
 * name is searched too. Words match by prefix of a word, or anywhere for 3+ letters.
 */
export function matchesQuery(marker: Marker, query: string, byCategory = false): boolean {
  const words = queryWords(query);
  if (words.length === 0) return true;
  const text = `${marker.nameEn} ${marker.nameUa}${byCategory ? ` ${marker.category}` : ""}`;
  return wordsMatch(words, text);
}

/**
 * Search names first; only when no marker name matches anywhere does the
 * category count ("cbc", "lipids"). Otherwise "glucose" would also list every
 * marker in the "Glucose-Insulin" panel.
 */
export function searchByCategory(markers: Marker[], query: string): boolean {
  if (queryWords(query).length === 0) return false;
  return !markers.some((m) => matchesQuery(m, query));
}
