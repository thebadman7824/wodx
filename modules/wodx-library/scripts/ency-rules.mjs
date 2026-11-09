/**
 * The Encyclopaedia Tenebrarum (WoDX Library 0.3.0, versions and editions 0.4.0), the pure part: the entry format, its checks, and the journal
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
 * Optional (Library 0.4.0):
 *   claim.versions  where books disagree: [{text, refs}], two or more, each with its own source; the claim's text
 *                   says what is in question
 *   editions        how a rule changed from edition to edition: [{edition, text, refs}], oldest first
 *   wodx            how WoDX plays it: {text, rule}, rule an optional UUID of the shelf entry or journal it links to
 */

export const KINDS = {lore: "Lore", character: "Character", faction: "Faction", place: "Place", power: "Power", mechanic: "Rule", term: "Term", event: "Event"};
/** How sure a claim is: the book says it outright, the book implies it, or it is WoDX's reading where the book is silent. */
export const TIERS = {stated: "Stated", implied: "Implied", rumour: "Might be true", open: "Unknown", reading: "House reading"};
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
  const part = (label, p) => {
    if ( !str(p?.text) ) out.push(`${who}: ${label} has no text`);
    if ( /\b(the book|book's|chapter|section|sidebar)\b/i.test(p?.text ?? "") ) out.push(`${who}: ${label} describes the book, not the world; the page reference already says where`);
    if ( !Array.isArray(p?.refs) || !p.refs.length ) out.push(`${who}: ${label} has no source`);
    for ( const r of p?.refs ?? [] ) {
      if ( !books[r?.book] ) out.push(`${who}: ${label} cites an unknown book "${r?.book}"`);
      if ( !(Number(r?.page) > 0) ) out.push(`${who}: ${label} has no page`);
    }
  };
  for ( const [i, c] of (e.claims ?? []).entries() ) {
    part(`claim ${i + 1}`, c);
    if ( !TIERS[c?.tier] ) out.push(`${who}: claim ${i + 1} has no tier`);
    if ( c?.versions !== undefined ) {
      if ( !Array.isArray(c.versions) || c.versions.length < 2 ) out.push(`${who}: claim ${i + 1} needs two or more versions where books differ`);
      else c.versions.forEach((v, j) => part(`claim ${i + 1} version ${j + 1}`, v));
    }
  }
  if ( e.editions !== undefined ) {
    if ( !Array.isArray(e.editions) || !e.editions.length ) out.push(`${who}: editions must be a list`);
    else e.editions.forEach((v, j) => { if ( !str(v?.edition) ) out.push(`${who}: edition ${j + 1} has no edition name`); part(`edition ${j + 1}`, v); });
  }
  if ( e.wodx !== undefined ) {
    if ( !str(e.wodx?.text) ) out.push(`${who}: wodx has no text`);
    if ( e.wodx?.rule !== undefined && !/^(Compendium|JournalEntry|Item|RollTable)\.[\w.-]+$/.test(e.wodx.rule) ) out.push(`${who}: wodx.rule must be a document UUID`);
  }
  const text = entryText(e);
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
  const src = refs => `<span class="wodx-shelf-src">${(refs ?? []).map(r => esc(refText(r, books))).join("; ")}</span>`;
  const versions = c => Array.isArray(c.versions) && c.versions.length ? `<ul class="wodx-ency-versions">${c.versions.map(v => `<li>${esc(v.text)} ${src(v.refs)}</li>`).join("")}</ul>` : "";
  const claims = (e.claims ?? []).map(c => `<li>${esc(c.text)} <span class="wodx-ency-tier wodx-ency-${esc(c.tier)}">${esc(TIERS[c.tier] ?? c.tier)}</span> ${src(c.refs)}${versions(c)}</li>`).join("");
  const editions = Array.isArray(e.editions) && e.editions.length ? `<p><strong>From edition to edition</strong></p><ol class="wodx-ency-editions">${e.editions.map(v => `<li><em>${esc(v.edition)}:</em> ${esc(v.text)} ${src(v.refs)}</li>`).join("")}</ol>` : "";
  const wodx = e.wodx?.text ? `<p><strong>In WoDX:</strong> ${esc(e.wodx.text)}${e.wodx.rule ? ` @UUID[${e.wodx.rule}]{the rule}` : ""}</p>` : "";
  const see = (e.see ?? []).map(s => `@UUID[Compendium.${pack}.JournalEntry.${docId(s)}]{${esc(titles[s] ?? s)}}`).join(", ");
  const html = `<p><em>${esc(KINDS[e.kind] ?? e.kind)}</em></p><p>${esc(e.summary)}</p><ul>${claims}</ul>${editions}${wodx}${see ? `<p><strong>See also:</strong> ${see}</p>` : ""}`;
  return {_id: docId(e.id), name: e.title, pages: [{name: e.title, type: "text", text: {content: html, format: 1}}],
    flags: {[MOD]: {shelf: `ency-${e.id}`, ency: e.id, kind: e.kind, book: [...new Set((e.claims ?? []).flatMap(c => (c.refs ?? []).map(r => r.book)))].join(", "), lines: e.lines, eras: e.eras}}};
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
/** All the words of an entry, for the checks: claims, the versions where books differ, editions and the WoDX note. */
export function entryText(e) {
  const claims = (e?.claims ?? []).flatMap(c => [c?.text, ...(Array.isArray(c?.versions) ? c.versions.map(v => v?.text) : [])]);
  return [e?.title, e?.summary, ...claims, ...(Array.isArray(e?.editions) ? e.editions.map(v => v?.text) : []), e?.wodx?.text].filter(str).join(". ");
}
