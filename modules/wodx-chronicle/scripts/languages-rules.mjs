/**
 * Languages, the pure part: who understands what, and how speech in an unknown tongue reads.
 */

/** Languages a table in each era is likely to meet. The Storyteller can type any other. */
export const LANGUAGES = {
  common: ["Latin", "Greek", "Hebrew", "Arabic", "German", "Czech", "Slovak", "Polish", "Hungarian", "Romani", "Yiddish",
    "French", "Italian", "Spanish", "Portuguese", "English", "Dutch", "Russian", "Turkish", "Old Church Slavonic", "Mandarin",
    "Cantonese", "Japanese", "Korean", "Hindi", "Persian", "Egyptian (ancient)", "Coptic", "Norse", "Gaelic", "Welsh",
    "Swedish", "Danish", "Romanian", "Serbian", "Armenian", "Georgian", "Mongolian", "Sanskrit", "Bengali", "Urdu", "Tamil", "Tibetan", "Vietnamese",
    "Thai", "Khmer", "Malay", "Javanese", "Tagalog", "Swahili", "Amharic", "Hausa", "Yoruba", "Akan (Twi)", "Mande (Bambara)", "Kikongo", "Zulu",
    "Xhosa", "Afrikaans", "Berber (Tamazight)", "Nahuatl", "Maya (Yucatec)", "Quechua", "Guaraní", "Navajo (Diné)", "Lakota", "Cherokee", "Inuktitut",
    "Māori", "Hawaiian", "Samoan"],
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

/**
 * V20 has no Linguistics Ability: each Language Merit (1 point) gives one language, and Natural Linguist (2 points)
 * makes each give two (V20 pdf 492 to 493, printed 484 to 485). From the names of a character's Merits.
 */
export function languagesFromMerits(names = []) {
  const list = names.map(n => String(n ?? ""));
  const count = list.filter(n => /^language\b/i.test(n.trim())).length;
  return list.some(n => /natural linguist/i.test(n)) ? count * 2 : count;
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
  hebrew: ["sh", "ah", "el", "im", "ot", "ba", "ha", "ri", "me", "kh", "ad", "on", "ei", "na"],
  arabic: ["al", "ah", "kh", "ma", "il", "un", "sa", "ra", "qa", "bi", "na", "th", "ya", "ha"],
  persian: ["ast", "ān", "kh", "sh", "ra", "be", "mi", "dar", "ya", "zi", "gar", "ha", "ne", "ba"],
  turkish: ["lar", "ük", "ış", "çe", "gü", "de", "ya", "ol", "er", "ba", "kı", "mü", "sen", "ti"],
  hindi: ["ka", "hai", "ra", "na", "ya", "bh", "ti", "ma", "dh", "se", "ko", "ja", "pa", "la"],
  mandarin: ["zh", "ang", "xi", "ao", "sh", "en", "li", "qu", "ui", "ong", "ma", "de", "ni", "wo"],
  cantonese: ["ng", "oi", "ei", "au", "hk", "am", "ga", "lo", "si", "ye", "ma", "ho", "ji", "ko"],
  japanese: ["ka", "shi", "no", "ta", "ru", "mo", "wa", "ne", "yo", "ki", "su", "ha", "ri", "tsu"],
  korean: ["yo", "eo", "ha", "ni", "da", "seu", "eun", "ga", "ji", "ko", "im", "ne", "ra", "mu"],
  swahili: ["wa", "ku", "ni", "mba", "nya", "li", "ka", "ta", "zi", "mwa", "ha", "ki", "ngo", "pa"],
  yoruba: ["gb", "ọ", "ni", "wa", "ba", "ṣe", "ko", "ti", "la", "mo", "fi", "ra", "ẹ", "yi"],
  nahuatl: ["tl", "chi", "hua", "co", "tz", "qui", "ya", "ca", "me", "xo", "pa", "ti", "no", "atl"],
  quechua: ["qa", "ch'", "ku", "lla", "nchi", "pa", "ri", "su", "wa", "ya", "mi", "ta", "na", "q'a"],
  hawaiian: ["ka", "le", "wa", "hi", "nu", "ma", "ʻo", "ke", "la", "pu", "ai", "ha", "no", "ku"],
  "māori": ["wh", "ka", "te", "ra", "ngā", "ti", "ma", "ho", "ki", "pu", "ta", "re", "wa", "nu"],
  russian: ["sk", "ov", "na", "ye", "st", "vo", "ka", "zh", "ny", "da", "shch", "ra", "li", "po"]
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

/* ------------------------------------------------------------------ */
/*  B3162, B3163: the allowance holds, and a related language gives the gist                                  */
/* ------------------------------------------------------------------ */

/**
 * How many languages a character may list: the native one, plus Linguistics (1, 2, 4, 8, 16) or the Language Merits.
 * The Storyteller is never held to it.
 */
export const allowance = ({linguistics = 0, merits = 0} = {}) => 1 + linguisticsAllows(linguistics) + Math.max(0, Number(merits) || 0);
/** May a player save this list? Only a longer list over the allowance is refused, so an old sheet is never cut. */
export function listAllowed(before = [], after = [], allow = 1) {
  return after.length <= Math.max(allow, before.length);
}

/** Families close enough that a speaker of one catches the gist of another. WoDX's own grouping. */
export const FAMILIES = [
  ["Latin", "French", "Italian", "Spanish", "Portuguese", "Romanian"],
  ["Czech", "Slovak", "Polish", "Russian", "Serbian", "Old Church Slavonic"],
  ["German", "Dutch", "Yiddish", "Afrikaans", "English"],
  ["Swedish", "Danish", "Norse"],
  ["Gaelic", "Welsh"],
  ["Hebrew", "Arabic", "Amharic"],
  ["Hindi", "Urdu", "Bengali", "Sanskrit"],
  ["Mandarin", "Cantonese"],
  ["Swahili", "Kikongo", "Zulu", "Xhosa"],
  ["Malay", "Javanese", "Tagalog"],
  ["Egyptian (ancient)", "Coptic"]
];
/** A language the reader knows that is kin to this one, or null. */
export function kinOf(lists, language) {
  const l = norm(language);
  const fam = FAMILIES.find(f => f.some(x => norm(x) === l));
  if ( !fam ) return null;
  for ( const list of lists ) for ( const x of list ?? [] ) if ( norm(x) !== l && fam.some(f => norm(f) === norm(x)) ) return x;
  return null;
}
/** The roll for the gist: Intelligence + Linguistics (Academics where there is no Linguistics), difficulty 7. */
export const GIST = {difficulty: 7};
