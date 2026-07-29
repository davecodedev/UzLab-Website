/**
 * Folds Uzbek Latin, Uzbek Cyrillic and Russian into one comparable form, so a
 * query typed in one script finds documents written in another.
 *
 * This is needed because the register genuinely mixes scripts — often inside a
 * single document, where an Uzbek-Latin heading is followed by a Russian
 * standard name. Without folding, a user searching "gaz" would miss "газ" and
 * a user searching "Пищевая" would miss "Pishevaya".
 *
 * Deliberately lossy and one-directional: everything collapses to bare Latin
 * ASCII. It is a matching key, never shown to anyone.
 */

// Order matters — multi-character sequences must be replaced before their
// single-character prefixes, or "sh" would be consumed as "s" + "h".
const CYRILLIC_TO_LATIN: [RegExp, string][] = [
  // Uzbek Cyrillic letters with no Russian equivalent.
  [/ў/g, 'o'],
  [/қ/g, 'q'],
  [/ғ/g, 'g'],
  [/ҳ/g, 'h'],
  // Russian / shared.
  [/щ/g, 'sh'],
  [/ш/g, 'sh'],
  [/ч/g, 'ch'],
  [/ц/g, 's'],
  [/ю/g, 'yu'],
  [/я/g, 'ya'],
  [/ё/g, 'yo'],
  [/ж/g, 'j'],
  [/х/g, 'h'],
  [/э/g, 'e'],
  [/ы/g, 'i'],
  [/[ъь]/g, ''],
  [/а/g, 'a'],
  [/б/g, 'b'],
  [/в/g, 'v'],
  [/г/g, 'g'],
  [/д/g, 'd'],
  [/е/g, 'e'],
  [/з/g, 'z'],
  [/и/g, 'i'],
  [/й/g, 'y'],
  [/к/g, 'k'],
  [/л/g, 'l'],
  [/м/g, 'm'],
  [/н/g, 'n'],
  [/о/g, 'o'],
  [/п/g, 'p'],
  [/р/g, 'r'],
  [/с/g, 's'],
  [/т/g, 't'],
  [/у/g, 'u'],
  [/ф/g, 'f'],
];

// Uzbek Latin digraphs and the apostrophe-bearing letters (oʻ, gʻ), which
// appear with at least five different apostrophe characters across the two
// registers — straight, curly, backtick and modifier letters.
// Written as explicit code points: the registers use at least five different
// apostrophes for the same Uzbek letters (oʻ, gʻ), and a literal character
// class is far too easy to get subtly wrong — a missing variant silently stops
// "o'lchash" matching "oʻlchash".
//   U+0027 '   U+0060 `   U+00B4 ´   U+02BB ʻ   U+02BC ʼ
//   U+2018 '   U+2019 '   U+2032 ′
const APOSTROPHES = /[\u0027\u0060\u00B4\u02BB\u02BC\u2018\u2019\u2032]/g;

const LATIN_NORMALISE: [RegExp, string][] = [[APOSTROPHES, '']];

/**
 * Reduces text to a script-neutral matching key: lowercase bare Latin, with
 * runs of non-alphanumerics collapsed to single spaces.
 */
export function foldForSearch(input: string): string {
  let s = input.toLowerCase();

  for (const [re, to] of CYRILLIC_TO_LATIN) s = s.replace(re, to);
  for (const [re, to] of LATIN_NORMALISE) s = s.replace(re, to);

  // Strip diacritics that survive (e.g. ā, é) down to their base letters.
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  return s
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Splits a user's query into folded terms. Terms shorter than two characters
 * are dropped: they match almost everything and only slow the query down.
 */
export function foldQueryTerms(query: string): string[] {
  return foldForSearch(query)
    .split(' ')
    .filter((t) => t.length >= 2);
}
