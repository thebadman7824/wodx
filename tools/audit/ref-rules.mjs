/**
 * Page-reference audit: pure helpers (tested in tools/harness/ref-audit.test.mjs).
 * The CLI is ref-audit.mjs beside this file.
 *
 * A reference is {book, page, pdf?, text, where}. `page` is the number as written. For an Encyclopaedia
 * claim it is the printed page and `pdf` is given. A page ref in code or docs is often just "p. 285";
 * the audit then tries both readings (printed and pdf) and reports which one the book's text supports.
 */

/** Book names as written in code and docs, longest first, mapped to Encyclopaedia book ids where one exists. */
export const ALIASES = [
  // Books the 2026-11-12 sample found read as another book (ref-sample-60): named before any shorter name they contain
  ["Cyberpunk 2020", "cp2020"], ["CP2020", "cp2020"], ["CP 2020", "cp2020"],
  ["World of Future Darkness", "wofd"], ["WoFD", "wofd"],
  ["Mummy: The Resurrection", "mtr"], ["Mummy: the Resurrection", "mtr"], ["MtR", "mtr"], ["Mummy 2nd", "mummy2"],
  ["Time of Judgment", "toj"], ["Ascension", "ascension"], ["Apocalypse", "apocalypse"], ["Gehenna", "gehenna"], ["End Game", "endgame"],
  ["War of Ages", "warofages"], ["A World of Rage", "worldofrage"], ["Mage Storytellers Companion", "mstc"],
  ["Los Angeles by Night", "labn"], ["LA by Night", "labn"], ["Chicago by Night", "chibn"], ["Montreal by Night", "montrealbn"],
  ["Clanbook: Assamite", "cbassamite"], ["Clanbook Assamite", "cbassamite"], ["Blood Sacrifice", "bloodsac"],
  ["Kindred of the East Companion", "kotecomp"], ["KotE Companion", "kotecomp"], ["Succubus Club", "succubus"],
  ["Children of the Night", "cotn"], ["Umbra: The Velvet Shadow", "velvet"], ["Book of the Wyrm", "botw"],
  ["V20 Dark Ages Companion", "v20dacomp"], ["Tome of Secrets", "tome"], ["Lore of the Clans", "lotc"],
  ["Lore of the Bloodlines", "lotb"], ["Rites of the Blood", "rotb"], ["Black Hand", "blackhand"],
  ["Anarchs Unbound", "anarchs"], ["Red List", "redlist"], ["Children of the Revolution", "cotr"],
  ["Jyhad Diary", "beckett"], ["Wild West", "wildwest"], ["Dust to Dust", "dust"],
  ["Storytellers Handbook", "sthr"], ["Clanbook: Gangrel", "cbgangrel"], ["Clanbook: Lasombra", "cblasombra"],
  ["V20 Companion", "v20comp"], ["Ghouls & Revenants", "gr"], ["Ghouls and Revenants", "gr"], ["G&R", "gr"],
  ["Revenants", "gr"],
  ["V20 Dark Ages", "v20da"], ["Vampire: The Dark Ages 20th", "v20da"], ["VtDA20", "v20da"], ["V20DA", "v20da"],
  ["Dark Ages: Vampire", "dav"], ["DA:V", "dav"],
  ["W20 Changing Breeds", "cb"], ["Changing Breeds", "cb"], ["CB", "cb"],
  ["Dark Ages: Werewolf", "wtda"], ["DA:W", "wtda"], ["W:DA", "wtda"],
  ["Dark Ages: Mage Grimoire", "dagrim"], ["Grimoire", "dagrim"],
  ["Dark Ages: Mage", "damage"], ["DA:M", "damage"],
  ["Dark Ages: Inquisitor", "inquisitor"], ["DA:I", "inquisitor"], ["Inquisitor", "inquisitor"],
  ["Dark Ages: Fae", "dafae"], ["DA:F", "dafae"],
  ["Sorcerers Crusade", "sc"], ["Sorcerer's Crusade", "sc"], ["Sorcerer", "sorcerer"],
  ["Wraith: The Great War", "greatwar"], ["Great War", "greatwar"],
  ["Wraith 20th", "wr20"], ["Wraith 20", "wr20"], ["Wr20", "wr20"],
  ["Mage 20", "m20"], ["M20", "m20"], ["C20", "c20"], ["W20", "w20"],
  ["Hunter: The Reckoning", "htr"], ["HtR", "htr"], ["Hunters Hunted II", "hh2"], ["HH2", "hh2"],
  ["Demon: The Fallen", "demon"], ["Demon", "demon"], ["Mummy", "mummy2"],
  ["Kindred of the East", "kote"], ["KotE", "kote"], ["Orpheus", "orpheus"],
  ["Victorian Age", "vav"], ["Future Darkness", "wofd"], ["V20", "v20"]
];

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let BOOK_RE, BOOK_OF;
const REF_RE = /(?<![A-Za-z])(?:(pdf|printed)\s+)?(pp?\.|page|pages)\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?(?:\s*\(\s*pdf\s*(?:p\.\s*)?(\d{1,3}))?/gi;

/**
 * Page refs in one line of code or docs. Each ref takes the nearest book named before it on the line,
 * else `fallback` (the last book named on an earlier line of the same comment or paragraph).
 * Returns {refs, last}: `last` is the book to carry to the next line.
 */
export function refsInLine(line, fallback = null) {
  const marks = [];
  for ( const m of line.matchAll(BOOK_RE) ) marks.push({at: m.index, book: BOOK_OF.get(m[1])});
  const refs = [];
  for ( const m of line.matchAll(REF_RE) ) {
    const before = marks.filter(k => k.at < m.index);
    const book = before.length ? before[before.length - 1].book : fallback;
    const kind = m[1]?.toLowerCase() ?? null;
    const n = Number(m[3]);
    const ref = {book, page: n, to: m[4] ? Number(m[4]) : n, kind};
    if ( m[5] ) { ref.pdf = Number(m[5]); ref.kind = "printed"; }
    refs.push(ref);
  }
  return {refs, last: marks.length ? marks[marks.length - 1].book : fallback};
}

/** Split a book's OCR text into pdf pages: form feeds first, else "page N" marker lines. Returns a Map pdfPage -> text, or null. */
export function splitPages(text) {
  if ( text.includes("\f") ) return new Map(text.split("\f").map((t, i) => [i + 1, t]));
  const re = /^\s*(?:[=#\-\[]+\s*)?(?:pdf\s+)?page\s+(\d{1,4})\b.*$/gim;
  const hits = [...text.matchAll(re)];
  if ( hits.length < 3 ) return null;
  const pages = new Map();
  hits.forEach((h, i) => pages.set(Number(h[1]), text.slice(h.index + h[0].length, hits[i + 1]?.index ?? text.length)));
  return pages;
}

const STOP = new Set(("about above after again against along also among another because been before being below between both " +
  "cannot could does doing down during each either every first from further have having here into itself just like made make " +
  "many more most much must never only other over same should since some such than that their them then there these they " +
  "this those three through under until upon very what when where which while whom with within without would your one two " +
  "four five once roll rolls dice difficulty successes success points point dots per turn scene night character characters " +
  "storyteller player players house rule wodx").split(" "));

/** The words a claim should share with its page: 5+ letters, not common, cut to 6 letters so plurals and tenses match. */
export function keywords(text) {
  const out = new Set();
  for ( const w of String(text).toLowerCase().replace(/[’']/g, "").match(/[a-z]{5,}/g) ?? [] ) if ( !STOP.has(w) ) out.add(w.slice(0, 6));
  return [...out];
}

/** Word stems of a stretch of book text (OCR noise tolerated: hyphens at line ends are joined). */
export function stems(text) {
  const s = new Set();
  for ( const w of String(text).toLowerCase().replace(/-\s*\n\s*/g, "").replace(/[’']/g, "").match(/[a-z]{5,}/g) ?? [] ) s.add(w.slice(0, 6));
  return s;
}

/**
 * Book names from books.json: {"cp2020": {"file": "...", "aliases": ["Cyberpunk 2020"]}} adds those names for that id,
 * so a new book or a local short name needs no code change. Returns the full alias list, longest names first.
 */
export function withAliases(map = {}) {
  const extra = [];
  for ( const [id, m] of Object.entries(map ?? {}) ) for ( const a of m?.aliases ?? [] ) if ( typeof a === "string" && a.trim() ) extra.push([a.trim(), id]);
  const seen = new Set(), all = [];
  for ( const a of [...extra, ...ALIASES] ) if ( !seen.has(a[0]) ) { seen.add(a[0]); all.push(a); }
  return all.sort((x, y) => y[0].length - x[0].length);
}

/** Set the names refsInLine knows (the built-in list plus books.json aliases). */
export function useAliases(list = ALIASES) {
  BOOK_RE = new RegExp(`(?<![A-Za-z0-9])(${[...list].sort((x, y) => y[0].length - x[0].length).map(a => esc(a[0])).join("|")})(?![A-Za-z0-9])`, "g");
  BOOK_OF = new Map(list.map(a => [a[0], a[1]]));
}

/** Fewer letters than this on the cited pages (one either side) means the OCR is blank there, not that the ref is wrong. */
export const BLANK_LETTERS = 200;

/** True when the cited pdf pages exist in the text but hold next to no letters (a scanned image with no OCR). */
export function blankPages(pages, from, to = from) {
  let seen = false, letters = 0;
  for ( let p = from - 1; p <= to + 1; p++ ) { const t = pages.get(p); if ( t != null ) { seen = true; letters += (t.match(/[A-Za-z]/g) ?? []).length; } }
  return seen && letters < BLANK_LETTERS;
}

/** Share of the keywords found on pdf pages from..to, one page either side. */
export function support(words, pages, from, to = from) {
  if ( !words.length ) return null;
  const s = new Set();
  for ( let p = from - 1; p <= to + 1; p++ ) { const t = pages.get(p); if ( t ) for ( const w of stems(t) ) s.add(w); }
  if ( !s.size ) return null;
  return words.filter(w => s.has(w)).length / words.length;
}

/**
 * Judge one ref against a book's pages. offset = pdf page minus printed page.
 * Returns {score, reading, scores} where reading is "printed", "pdf", or null when the text has no such page.
 */
export function judge(ref, words, pages, offset) {
  const scores = {};
  if ( ref.pdf != null ) scores.printed = support(words, pages, ref.pdf, ref.pdf + (ref.to - ref.page));
  else {
    if ( ref.kind !== "pdf" && offset != null ) scores.printed = support(words, pages, ref.page + offset, ref.to + offset);
    if ( ref.kind !== "printed" ) scores.pdf = support(words, pages, ref.page, ref.to);
  }
  let reading = null, score = null;
  for ( const [k, v] of Object.entries(scores) ) if ( v != null && (score == null || v > score) ) { reading = k; score = v; }
  // Nothing found, and blank OCR on every reading tried: the text can't judge this ref, so it is not counted as low
  const tried = ref.pdf != null ? [[ref.pdf, ref.pdf + (ref.to - ref.page)]]
    : [ref.kind !== "pdf" && offset != null ? [ref.page + offset, ref.to + offset] : null, ref.kind !== "printed" ? [ref.page, ref.to] : null].filter(Boolean);
  const blank = !score && tried.length > 0 && tried.every(([a, b]) => blankPages(pages, a, b));
  if ( blank ) return {score: null, reading: "blank", scores, blank: true};
  return {score, reading, scores};
}

/** The usual pdf-minus-printed offset per book, from Encyclopaedia refs. */
export function offsetsFrom(refs) {
  const by = {};
  for ( const r of refs ) if ( r.pdf != null ) { const o = r.pdf - r.page; ((by[r.book] ??= {})[o] ??= 0); by[r.book][o]++; }
  const out = {};
  for ( const [b, c] of Object.entries(by) ) out[b] = Number(Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]);
  return out;
}

useAliases(ALIASES);
