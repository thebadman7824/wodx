/**
 * The Encyclopaedia Tenebrarum (WoDX Library 0.3.0), the pure part: the entry format, its checks, and the journal
 * an entry becomes. Every entry is WoDX's own words with book and page; nothing from 5th edition or later; every
 * claim carries a tier and a source. No Foundry in here, so the check script and the tests use it too.
 *
 * An entry:
 *   {id, title, kind, lines: [...], eras: [...], summary, claims: [{text, tier, refs: [{book, page, pdf}]}], see: [ids]}
 *   id       lower-case words joined by hyphens, unique across the encyclopedia
 *   kind     one of KINDS
 *   summary  one or two sentences, the gist
 *   claims   each a statement in WoDX's words, with its tier and at least one reference
 *   refs     book: a key of the book list; page: the printed page; pdf: the pdf page when it differs (optional)
 *   see      other entries' ids, linked in the journal
 */

export const KINDS = {lore: "Lore", character: "Character", faction: "Faction", place: "Place", power: "Power", mechanic: "Rule", term: "Term", event: "Event"};
/** How sure a claim is: the book says it outright, the book implies it, or it is WoDX's reading where the book is silent. */
export const TIERS = {stated: "Stated", implied: "Implied", reading: "House reading"};
/** Titles from 5th edition or later never go in. */
export const BANNED = /\b(V5|W5|5th Edition|Fifth Edition|Vampire: The Masquerade 5|Werewolf: The Apocalypse 5|Chronicles of Darkness|Vampire: The Requiem|Werewolf: The Forsaken|Mage: The Awakening)\b/i;

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const str = v => typeof v === "string" && v.trim().length > 0;

/** Problems with one entry, as plain sentences. `books` is the book list keyed by id. */
export function checkEntry(e, books = {}) {
  const out = [];
  const who = e?.id ?? "(no id)";
  if ( !e || typeof e !== "object" ) return [`${who}: not an entry`];
  if ( !ID.test(e.id ?? "") ) out.push(`${who}: the id must be lower-case words joined by hyphens`);
  if ( !str(e.title) ) out.push(`${who}: no title`);
  if ( !KINDS[e.kind] ) out.push(`${who}: kind must be one of ${Object.keys(KINDS).join(", ")}`);
  if ( !Array.isArray(e.lines) || !e.lines.length ) out.push(`${who}: no lines`);
  if ( !Array.isArray(e.eras) || !e.eras.length ) out.push(`${who}: no eras`);
  if ( !str(e.summary) ) out.push(`${who}: no summary`);
  if ( !Array.isArray(e.claims) || !e.claims.length ) out.push(`${who}: no claims`);
  for ( const [i, c] of (e.claims ?? []).entries() ) {
    if ( !str(c?.text) ) out.push(`${who}: claim ${i + 1} has no text`);
    if ( /\b(the book|book's|chapter|section|sidebar)\b/i.test(c?.text ?? "") ) out.push(`${who}: claim ${i + 1} describes the book, not the world; the page reference already says where`);
    if ( !TIERS[c?.tier] ) out.push(`${who}: claim ${i + 1} has no tier`);
    if ( !Array.isArray(c?.refs) || !c.refs.length ) out.push(`${who}: claim ${i + 1} has no source`);
    for ( const r of c?.refs ?? [] ) {
      if ( !books[r?.book] ) out.push(`${who}: claim ${i + 1} cites an unknown book "${r?.book}"`);
      if ( !(Number(r?.page) > 0) ) out.push(`${who}: claim ${i + 1} has no page`);
    }
  }
  const text = [e.title, e.summary, ...(e.claims ?? []).map(c => c?.text)].join(" ");
  if ( BANNED.test(text) ) out.push(`${who}: names a 5th edition or later book`);
  if ( /—/.test(text) ) out.push(`${who}: an em-dash in the text`);
  if ( /\b(he|she|him|her|his|hers)\b/i.test(text) && !e.gender ) out.push(`${who}: a gendered pronoun without a known gender`);
  return out;
}

/** Problems with the whole set: each entry's, unknown or duplicate ids, links to entries that do not exist, banned books. */
export function checkAll(entries = [], bookList = []) {
  const books = Object.fromEntries(bookList.map(b => [b.id, b]));
  const out = [];
  for ( const b of bookList ) if ( BANNED.test(`${b.title} ${b.edition ?? ""}`) ) out.push(`book ${b.id}: 5th edition or later`);
  const ids = new Set();
  for ( const e of entries ) {
    out.push(...checkEntry(e, books));
    if ( ids.has(e?.id) ) out.push(`${e.id}: the id is used twice`);
    ids.add(e?.id);
  }
  for ( const e of entries ) for ( const s of e?.see ?? [] ) if ( !ids.has(s) ) out.push(`${e.id}: sees "${s}", which is not an entry`);
  return out;
}

/** A stable 16-character document id for an entry id, so links can be written before the documents exist. */
export function docId(id) {
  const s = String(id ?? "");
  let a = 0x811c9dc5, b = 0x01000193;
  for ( let i = 0; i < s.length; i++ ) { a = Math.imul(a ^ s.charCodeAt(i), 16777619); b = Math.imul(b + s.charCodeAt(i), 2654435761); }
  const part = n => (n >>> 0).toString(36).padStart(7, "0").slice(-8);
  return `ency${part(a)}${part(b)}`.slice(0, 16).padEnd(16, "0");
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const refText = (r, books) => `${books[r.book]?.short ?? books[r.book]?.title ?? r.book}, p. ${r.page}${r.pdf && Number(r.pdf) !== Number(r.page) ? ` (pdf ${r.pdf})` : ""}`;

/** The journal an entry becomes, in the pack `pack` (its collection id), with its links. */
export function toJournal(e, {books = {}, pack = "world.wodx-encyclopedia", titles = {}, MOD = "wodx-library"} = {}) {
  const claims = (e.claims ?? []).map(c => `<li>${esc(c.text)} <span class="wodx-ency-tier wodx-ency-${esc(c.tier)}">${esc(TIERS[c.tier] ?? c.tier)}</span> <span class="wodx-shelf-src">${c.refs.map(r => esc(refText(r, books))).join("; ")}</span></li>`).join("");
  const see = (e.see ?? []).map(s => `@UUID[Compendium.${pack}.JournalEntry.${docId(s)}]{${esc(titles[s] ?? s)}}`).join(", ");
  const html = `<p><em>${esc(KINDS[e.kind] ?? e.kind)}</em></p><p>${esc(e.summary)}</p><ul>${claims}</ul>${see ? `<p><strong>See also:</strong> ${see}</p>` : ""}`;
  return {_id: docId(e.id), name: e.title, pages: [{name: e.title, type: "text", text: {content: html, format: 1}}],
    flags: {[MOD]: {shelf: `ency-${e.id}`, ency: e.id, kind: e.kind, book: [...new Set((e.claims ?? []).flatMap(c => c.refs.map(r => r.book)))].join(", "), lines: e.lines, eras: e.eras}}};
}

/* ---- The text-overlap check: no run of words copied from the books ---- */

export const SHINGLE = 8;
const words = t => String(t ?? "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
/** Every run of n words in a text, as strings. */
export function shingles(text, n = SHINGLE) {
  const w = words(text), out = new Set();
  for ( let i = 0; i + n <= w.length; i++ ) out.add(w.slice(i, i + n).join(" "));
  return out;
}
/** The runs of n words an entry shares with a source text. Empty: nothing copied. */
export function overlap(entryText, sourceShingles, n = SHINGLE) {
  return [...shingles(entryText, n)].filter(s => sourceShingles.has(s));
}
export const entryText = e => [e.title, e.summary, ...(e.claims ?? []).map(c => c.text)].join(". ");
