#!/usr/bin/env node
/**
 * Book-number check (B7050): every working rule's numbers against its own book page, one row at a time.
 *
 *   node tools/books/numbers-check.mjs [--set v20-disciplines] [--out <dir>] [--id <row id>] [--show]
 *
 * For each row of a rule set it opens the book page the row cites (and the page after it, since a power often runs on),
 * finds the row's name there, and takes the text from that name to the next row's name. It then compares the row's
 * numbers with that text:
 *   diff   the difficulty the row rolls against; the text's "difficulty N" numbers
 *   pool   each trait in the roll; the trait's name in the text
 *   cost   the kind of point the row spends (blood, Willpower, Gnosis ...); that word in the text
 *   nums   every number in the row's effect line; the number (as a digit or a word) in the text
 * Verdicts: agrees (every check passed), check (a number or trait was not found; a person reads the page and gives the
 * row its final verdict), no-name (the name is not on the cited page or the next one), no-book (the book is not in the
 * text set). The script never decides that a number is wrong: it only sorts the rows a person must read first.
 *
 * Book text stays in the project files folder (rule 5): the report holds row ids, file paths, line numbers and pdf
 * page numbers, never the book's words. --show prints the window for one row (--id) to the terminal only.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {findBooks, pagesOf} from "./books.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const TEXT = opt("text") ?? process.env.WODX_BOOK_TEXT ?? "/mnt/project-files/book-text";

/** Book label in WoDX data -> book id in the text set. */
export const BOOK_IDS = {V20: "v20", VtDA20: "v20da", "V20DA": "v20da", W20: "w20", "W20 CB": "w20cb", "DA:W": "wtda",
  WtDA: "wtda", Wr20: "wr20", W20Wr: "wr20", M20: "m20", C20: "c20", DtF: "demon", HH2: "hh2", KotE: "kote", "DA:F": "dafae"};

/** Rules a book gives once for a whole group, read on the page named: a row that follows them passes those checks. */
const THAUM_V20 = row => /^Thaumaturgy/.test(row.group ?? "")
  ? {page: "v20 pdf 221", diff: row.level + 3, pool: "willpower", cost: "b1", why: "Thaumaturgy paths: a blood point, Willpower against the power's level +3"} : null;

/** Rule sets: where the rows live and how a row maps to {id, name, page, book, pool, diff, cost, effect}. */
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
export const SETS = {
  "v20-disciplines": {file: "modules/wodx-actions/data/disciplines-v20.json", book: "V20", general: THAUM_V20,
    rows: d => d.powers.map(p => ({id: p.id, name: p.n, group: p.d, level: p.l, page: p.p, book: p.book ?? "V20", pool: p.r, diff: p.diff, cost: p.c, time: p.t, effect: p.e}))},
  "v20da-disciplines": {file: "modules/wodx-actions/data/disciplines-daw.json", book: "VtDA20",
    rows: d => d.powers.map(p => ({id: p.id, name: p.n, group: p.d, level: p.l, page: p.p, book: p.book ?? "VtDA20", pool: p.r, diff: p.diff, cost: p.c, time: p.t, effect: p.e}))},
  "w20-gifts": {file: "modules/wodx-actions/data/gifts-w20.json", book: "W20",
    rows: d => d.gifts.map(p => ({id: p.id, name: p.n, level: p.l, page: p.p, book: p.book ?? "W20", pool: p.r, diff: p.d, cost: p.c, time: p.t, effect: p.e}))},
  "w20cb-gifts": {file: "modules/wodx-actions/data/gifts-fera.json", book: "W20 CB",
    rows: d => d.gifts.map(p => ({id: p.id, name: p.n, level: p.l, page: p.p, book: p.book ?? "W20 CB", pool: p.r, diff: p.d, cost: p.c, time: p.t, effect: p.e}))},
  "wtda-gifts": {file: "modules/wodx-actions/data/gifts-daw.json", book: "DA:W",
    rows: d => d.gifts.map(p => ({id: p.id, name: p.n, level: p.l, page: p.p, book: "DA:W", pool: p.r, diff: p.d, cost: p.c, time: p.t, effect: p.e}))},
  "wr20-arcanoi": {file: "modules/wodx-actions/data/arcanoi-w20.json", book: "Wr20",
    rows: d => d.arts.map(p => ({id: p.id, name: p.n, group: p.d, level: p.l, page: p.p, book: "Wr20", pool: p.r, diff: p.diff, cost: p.c, effect: p.e}))},
};

/** Text as the matcher reads it: mojibake mended, line-end hyphens joined, lower case, words split by single spaces. */
export function norm(t) {
  return String(t ?? "")
    .replace(/â€™|â€˜|’|‘/g, "'").replace(/â€œ|â€\u009d|â€\u009c|“|”/g, '"').replace(/â€”|â€“|—|–/g, " - ").replace(/â€¢|•/g, " * ")
    .replace(/(\w)-[ \t]*\n[ \t]*(\w)/g, "$1$2")
    .toLowerCase().replace(/'/g, "").replace(/[^a-z0-9+]+/g, " ").trim();
}
const WORDNUM = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  once: 1, twice: 2, half: 0.5, single: 1, double: 2, a: null};
/** Every number a normalized text states, digits and number words. */
export function numbersIn(n) {
  const out = new Set();
  for ( const w of n.split(" ") ) {
    if ( /^\d+$/.test(w) ) out.add(+w);
    else if ( WORDNUM[w] ) out.add(WORDNUM[w]);
  }
  return out;
}
/** Difficulties a text states: "difficulty 6", "difficulty of 7", "difficulty is 8", "difficulties 6". */
export function difficultiesIn(n) {
  const out = new Set(), re = /\bdifficult(?:y|ies)(?: (?:of|is|equal to|becomes|rises to|drops to|to|at))?(?: a| the)? (\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/g;
  let m;
  while ( (m = re.exec(n)) ) out.add(/^\d+$/.test(m[1]) ? +m[1] : WORDNUM[m[1]]);
  return out;
}
/** Trait spellings in roll strings -> words the books use. */
const TRAIT = {animalken: "animal ken", arc: null, var: null, occult: "occult", streetwise: "streetwise", selfcontrol: "self control",
  primalurge: "primal urge", enigmas: "enigmas", arete: "arete", gnosis: "gnosis", rage: "rage", willpower: "willpower", wp: "willpower",
  humanity: "humanity", path: null, road: null, lore: null, glamour: "glamour", banality: "banality", pathos: "pathos", angst: "angst",
  disc: null, discipline: null, rating: null, level: null, power: null, stamina: "stamina", int: "intelligence"};
export function poolTraits(r) {
  if ( !r || typeof r !== "string" ) return [];
  return r.split("+").map(part => part.split("|").map(t => t.trim().toLowerCase()).filter(Boolean)
    .map(t => t in TRAIT ? TRAIT[t] : t.replace(/[^a-z ]/g, " ").trim()).filter(Boolean)).filter(a => a.length);
}
const COST = {b: ["blood"], w: ["willpower"], g: ["gnosis"], r: ["rage"], p: ["pathos"], q: ["quintessence"], gl: ["glamour"], c: ["chi"], f: ["faith"]};
export function costWords(c) {
  const m = /^([a-z]+)\d*/.exec(String(c ?? "").toLowerCase());
  return m && COST[m[1]] ? COST[m[1]] : [];
}

const bookCache = new Map();
let books = null;
function book(id) {
  if ( !books ) books = new Map(findBooks(TEXT).map(b => [b.id, b]));
  if ( bookCache.has(id) ) return bookCache.get(id);
  const b = books.get(id);
  const val = b ? {pages: new Map(pagesOf(b).map(p => [p.n, p.text])), offset: null} : null;
  if ( val ) val.offset = offsetOf(val.pages);
  bookCache.set(id, val);
  return val;
}
/** pdf minus printed page: the commonest gap between a page's pdf number and a page number printed in its first or last lines. */
export function offsetOf(pages) {
  const votes = new Map();
  for ( const [n, t] of pages ) {
    const lines = String(t).split("\n").map(l => l.trim()).filter(Boolean);
    for ( const l of [...lines.slice(0, 3), ...lines.slice(-3)] ) {
      const m = /^(\d{1,3})$/.exec(l) ?? /^(\d{1,3})\s+\S/.exec(l) ?? /\S\s+(\d{1,3})$/.exec(l);
      if ( !m ) continue;
      const off = n - +m[1];
      if ( off >= -20 && off <= 90 ) votes.set(off, (votes.get(off) ?? 0) + 1);
    }
  }
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

/** A line as a heading: level dots, a leading "the" and a page number dropped. */
const headingOf = l => norm(l).replace(/^(?:\* ?)+/, "").replace(/^the /, "").replace(/ \d+$/, "").trim();
/** What may follow a name on its heading line: a rank word (Wraith Arts), a level, a breed or tribe tag. */
const HEAD_TAIL = /^(?:common|initiate|ancient|modern|basic|advanced|level \w+|rank \w+|\w+ \w+ \w+|\w+ \w+|\w+)$/;

/** The window for one row: its name on its page (printed page + offset, then one either side), to the next row's name. */
export function windowFor(row, nextNames, b) {
  const pdf = row.page + b.offset;
  // A heading first: a line that is the name, perhaps after level dots, on the pages around the cited one
  const name0 = norm(row.name).replace(/^the /, "");
  for ( const n of [pdf, pdf - 1, pdf + 1, pdf + 2] ) {
    const lines = String(b.pages.get(n) ?? "").split("\n");
    const at = lines.findIndex(l => { const x = headingOf(l); return x === name0 || (x.startsWith(name0 + " ") && HEAD_TAIL.test(x.slice(name0.length + 1))); });
    if ( at < 0 ) continue;
    const rest = lines.slice(at).concat(...[n + 1, n + 2].map(x => String(b.pages.get(x) ?? "").split("\n")));
    // stop at the next heading that is another row's name
    const others = new Set(nextNames.map(x => norm(x).replace(/^the /, "")).filter(x => x && x !== name0));
    let end = rest.length;
    for ( let i = 1; i < rest.length; i++ ) {
      const x = headingOf(rest[i]);
      // a heading led by level dots ("•• Beckoning") starts the next power, listed in WoDX or not
      if ( i > 1 && /^\s*(?:•|â€¢)+\s*[A-Z]/.test(rest[i]) ) { end = i; break; }
      if ( others.has(x) || [...others].some(o => x.startsWith(o + " ") && HEAD_TAIL.test(x.slice(o.length + 1)) && x.split(" ").length <= o.split(" ").length + 2) ) { end = i; break; }
    }
    return norm(rest.slice(0, end).join("\n")).slice(0, 8000);
  }
  const span = [pdf, pdf + 1, pdf + 2].map(n => b.pages.get(n) ?? "").join("\n");
  const n = norm(span), name = norm(row.name).replace(/^the /, "");
  let at = n.indexOf(` ${name} `) + 1 || (n.startsWith(name + " ") ? 0 : -1);
  if ( at < 0 ) {
    // the page before, for a row whose cited page is where it ends
    const n0 = norm([pdf - 1, pdf].map(x => b.pages.get(x) ?? "").join("\n"));
    const at0 = n0.indexOf(` ${name} `);
    if ( at0 >= 0 ) return cut(n0.slice(at0), name, nextNames);
    return squashedWindow(row, nextNames, b, pdf);
  }
  return cut(n.slice(at), name, nextNames);
}
/** OCR with run-together words ("artisanscommand levelone"): the same search with every space taken out. The window
 * keeps its digits, so difficulties and numbers still read; trait names are matched squashed too (checkRow). */
const squash = t => norm(t).replace(/ /g, "");
function squashedWindow(row, nextNames, b, pdf) {
  const sq = [pdf - 1, pdf, pdf + 1, pdf + 2].map(x => squash(b.pages.get(x) ?? "")).join(" ");
  const name = squash(row.name).replace(/^the/, "");
  if ( name.length < 6 ) return null;
  const at = sq.indexOf(name);
  if ( at < 0 ) return null;
  let end = Math.min(sq.length, at + 4000);
  for ( const nn of nextNames ) {
    const x = squash(nn).replace(/^the/, "");
    if ( x.length < 6 || x === name ) continue;
    const i = sq.indexOf(x, at + name.length);
    if ( i > at && i < end ) end = i;
  }
  return " " + sq.slice(at, end).replace(/(\d+)/g, " $1 ").replace(/difficult(y|ies)/g, " difficult$1 ") + " ";
}
function cut(w, name, nextNames) {
  let end = Math.min(w.length, 6000);
  for ( const nn of nextNames ) {
    const x = norm(nn).replace(/^the /, "");
    if ( !x || x === name ) continue;
    const i = w.indexOf(` ${x} `, name.length + 1);
    if ( i > 40 && i < end ) end = i;
  }
  return w.slice(0, end);
}

export function checkRow(row, win, general = null) {
  const notes = [];
  if ( general ) {
    const g = general;
    const d = typeof row.diff === "number" ? row.diff : +row.diff;
    if ( d === g.diff ) {
      row = {...row, diff: null};
      const ds = difficultiesIn(win);
      if ( ds.size && !ds.has(d) ) notes.push(`diff ${d} by the group rule; the power's own text says ${[...ds].join("/")}`);
    }
    if ( String(row.pool).toLowerCase() === g.pool ) row = {...row, pool: null};
    if ( String(row.cost).toLowerCase() === g.cost ) row = {...row, cost: null, costChecked: true};
  }
  const diff = row.diff;
  const ds = difficultiesIn(win);
  let dNum = typeof diff === "number" ? diff : /^\d+$/.test(String(diff ?? "")) ? +diff : null;
  if ( dNum !== null ) {
    if ( !ds.size ) notes.push(`diff ${dNum}: the text states no difficulty`);
    else if ( !ds.has(dNum) ) notes.push(`diff ${dNum}: the text says ${[...ds].join("/")}`);
  }
  for ( const alts of poolTraits(row.pool) ) {
    if ( !alts.some(t => win.includes(t) || win.includes(t.replace(/ /g, ""))) ) notes.push(`pool: ${alts.join("|")} not in the text`);
  }
  for ( const w of costWords(row.cost) ) if ( !win.includes(w) ) notes.push(`cost ${row.cost}: no "${w}" in the text`);
  if ( !row.cost && !row.costChecked && /\bspend(?:s|ing)? (?:a|one|two|three|\d+) (?:blood|willpower|gnosis|rage|pathos|quintessence|glamour)/.test(win) ) notes.push("cost: the text spends a point, the row spends none");
  // A row with no roll or no cost whose page gives one (the power then runs as "no roll: one success" or free)
  if ( !row.pool && !general ) {
    const roll = proposeRoll(win);
    if ( roll.pool ) notes.push(`no roll in the row; the text rolls ${roll.pool}${roll.diff ? ` at ${roll.diff}` : ""}`);
  }
  const wn = numbersIn(win);
  const en = norm(row.effect ?? "");
  for ( const x of numbersIn(en) ) {
    if ( x === 1 || x === 0.5 ) continue; // "one", "a" and "half" turn up everywhere
    if ( !wn.has(x) ) notes.push(`number ${x} in the effect is not in the text`);
  }
  return notes;
}

const TRAITS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits",
  "willpower", "humanity", "conscience", "conviction", "self control", "instinct", "courage", "gnosis", "rage", "arete", "enigmas", "occult",
  "empathy", "intimidation", "subterfuge", "awareness", "alertness", "athletics", "brawl", "melee", "archery", "firearms", "medicine",
  "survival", "animal ken", "expression", "leadership", "performance", "stealth", "investigation", "academics", "crafts", "body crafts",
  "etiquette", "larceny", "streetwise", "primal urge", "rituals", "lore", "politics", "science", "technology", "law", "commerce",
  "hearth wisdom", "theology", "seneschal", "riddles", "kenning", "glamour", "banality", "pathos", "angst", "chi", "yin", "yang", "hun", "po",
  "faith", "torment", "sekhem", "conviction", "computer", "drive", "dodge", "ride", "insight", "persuasion", "legerdemain"];
const TRAIT_RE = `(?:${TRAITS.map(t => t.replace(/ /g, " ?")).join("|")})\\b`;
/** What the page's first roll is: "roll(s) Trait + Trait ... difficulty N" (an Attribute alone, or two traits). */
export function proposeRoll(win) {
  const re = new RegExp(`\\brolls? (?:a |an |the |his |her |their )?(?:extended |resisted )?(${TRAIT_RE})(?: \\+ (${TRAIT_RE})(?: (?:or|and) (${TRAIT_RE}))?)?(?:[^.]{0,80}?difficult(?:y|ies)(?: (?:of|is|equal to))?(?: the)? (\\d+))?`);
  const m = re.exec(win);
  if ( !m ) return {};
  const t = x => x?.replace(/ /g, "");
  return {pool: [t(m[1]), m[2] ? [t(m[2]), t(m[3])].filter(Boolean).join("|") : null].filter(Boolean).join("+"), diff: m[4] ? +m[4] : null};
}

/** Line of a row in its data file, for the review desk. */
function lineOf(file, id) {
  const lines = fs.readFileSync(path.join(ROOT, file), "utf8").split("\n");
  const i = lines.findIndex(l => l.includes(`"${id}"`));
  return i + 1;
}

export function runSet(key, {windows = false} = {}) {
  const set = SETS[key];
  const rows = set.rows(J(set.file));
  const out = [];
  rows.forEach((row, i) => {
    const bid = BOOK_IDS[row.book] ?? row.book;
    const b = book(bid);
    const base = {set: key, id: row.id, name: row.name, file: set.file, line: lineOf(set.file, row.id), book: bid, page: row.page,
      diff: row.diff ?? null, pool: row.pool ?? null, cost: row.cost ?? null};
    if ( !b ) return out.push({...base, verdict: "no-book", notes: [`book ${bid} is not in the text set`]});
    if ( typeof row.page !== "number" ) return out.push({...base, verdict: "no-page", notes: ["the row cites no page"]});
    const nextNames = rows.slice(i + 1, i + 12).map(r => r.name).concat(rows.slice(Math.max(0, i - 3), i).map(r => r.name));
    const win = windowFor(row, nextNames, b);
    base.pdf = row.page + b.offset;
    if ( !win ) return out.push({...base, verdict: "no-name", notes: [`"${row.name}" is not on pdf ${base.pdf - 1}-${base.pdf + 2}`]});
    const general = set.general?.(row) ?? null;
    const notes = checkRow(row, win, general);
    if ( general ) base.general = `${general.why} (${general.page})`;
    out.push({...base, verdict: notes.length ? "check" : "agrees", notes, ...(windows || (args.includes("--show") && opt("id") === row.id) ? {window: win} : {})});
  });
  return out;
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const keys = opt("set") ? opt("set").split(",") : Object.keys(SETS);
  const dir = opt("out");
  for ( const k of keys ) {
    let res = runSet(k);
    if ( opt("id") ) {
      res = res.filter(r => r.id === opt("id"));
      for ( const r of res ) { console.log(JSON.stringify({...r, window: undefined}, null, 1)); if ( r.window ) console.log("\n" + r.window); }
      continue;
    }
    const tally = res.reduce((t, r) => (t[r.verdict] = (t[r.verdict] ?? 0) + 1, t), {});
    console.log(k.padEnd(20), res.length, "rows", JSON.stringify(tally));
    if ( dir ) { fs.mkdirSync(dir, {recursive: true}); fs.writeFileSync(path.join(dir, `${k}.jsonl`), res.map(r => JSON.stringify(r)).join("\n") + "\n"); }
  }
}
