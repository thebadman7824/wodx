/**
 * Languages, the pure part: who understands what, and how speech in an unknown tongue reads.
 */

/** Languages a table in each era is likely to meet. The Storyteller can type any other. */
export const LANGUAGES = {
  common: ["Latin", "Greek", "Hebrew", "Arabic", "German", "Czech", "Slovak", "Polish", "Hungarian", "Romani", "Yiddish",
    "French", "Italian", "Spanish", "Portuguese", "English", "Dutch", "Russian", "Turkish", "Old Church Slavonic", "Mandarin",
    "Cantonese", "Japanese", "Korean", "Hindi", "Persian", "Egyptian (ancient)", "Coptic", "Norse", "Gaelic", "Welsh"],
  supernatural: ["Garou (the High Tongue)", "Enochian", "the Tongue of the Dead", "Wyrm-speech"]
};

/**
 * How many languages beyond the native one a rating in Linguistics gives: 1, 2, 4, 8, 16. Advisory only: the
 * window shows it beside the list, and nothing stops the Storyteller adding more.
 */
export function linguisticsAllows(dots) {
  const n = Math.max(0, Math.min(5, Number(dots) || 0));
  return n ? 2 ** (n - 1) : 0;
}

export const norm = s => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** Does any of these language lists include the language? */
export function understands(lists, language) {
  const l = norm(language);
  if ( !l ) return true;
  return lists.some(list => (list ?? []).some(x => norm(x) === l));
}

/** A small string hash, so the same word always sounds the same. */
function hash(s) {
  let h = 2166136261;
  for ( let i = 0; i < s.length; i++ ) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const SOUNDS = {
  default: ["ka", "ra", "mi", "to", "ne", "sa", "lo", "vi", "da", "ze", "ul", "or", "in", "ash"],
  latin: ["us", "um", "ae", "is", "et", "qu", "ri", "ta", "or", "es", "ti", "ca", "nu", "ex"],
  german: ["sch", "ei", "en", "ch", "au", "er", "st", "ig", "zu", "ung", "ber", "ach", "ie", "ft"],
  czech: ["př", "ch", "ně", "ý", "ov", "ská", "dž", "ou", "ř", "ec", "ní", "va", "st", "ko"],
  hebrew: ["sh", "ah", "el", "im", "ot", "ba", "ha", "ri", "me", "kh", "ad", "on", "ei", "na"]
};

/** Speech in a tongue the reader lacks: each word becomes a made-up word of about the same length. */
export function scramble(text, language = "") {
  const key = norm(language);
  const sounds = SOUNDS[Object.keys(SOUNDS).find(k => key.startsWith(k))] ?? SOUNDS.default;
  return String(text ?? "").replace(/[\p{L}\p{M}']+/gu, word => {
    let h = hash(`${key}|${word.toLowerCase()}`);
    let out = "";
    while ( out.length < word.length ) { out += sounds[h % sounds.length]; h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; }
    out = out.slice(0, Math.max(1, word.length));
    return word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase() ? out[0].toUpperCase() + out.slice(1) : out;
  });
}

/** "/in Latin Pax tecum" → {language: "Latin", text: "Pax tecum"}; known names may have spaces. */
export function parseInCommand(message, known = []) {
  const m = String(message ?? "").match(/^\/in\s+(.+)$/is);
  if ( !m ) return null;
  const rest = m[1];
  const names = [...known].sort((a, b) => b.length - a.length);
  for ( const n of names ) {
    if ( norm(rest).startsWith(`${norm(n)} `) ) return {language: n, text: rest.slice(n.length).trim()};
  }
  const [first, ...words] = rest.split(/\s+/);
  return words.length ? {language: first, text: words.join(" ")} : null;
}
