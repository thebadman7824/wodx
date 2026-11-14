/**
 * Punishment and what follows (B3610-B3611): the pure part. No Foundry here, so the harness can test it.
 *
 * After a guilty verdict (law-trial-rules.mjs) the court picks a sentence from what the law of the land allows
 * (the law record's punish list) by how grave the deeds were (law-heat-rules GRAVITY). The sentence leaves a mark on
 * the character: a criminal record (on paper, or in a database once the age has one), a brand, outlaw status in
 * that land, banishment from it, or time in a cell, a galley, a camp or a colony. A death sentence is the
 * Storyteller's to carry out or not. Sentence lengths are house figures (docs/PENDING-REVIEW.md).
 */
import {GRAVITY} from "./law-heat-rules.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Sentences by weight, most fitting first within each tier. */
export const TIERS = {
  light: ["fine", "penance", "pillory", "flogging", "bamboo", "confiscation"],
  middle: ["prison", "hard-labour", "banishment", "transportation", "galleys", "camp", "maiming", "outlawry", "outcaste", "enslave"],
  grave: ["hanging", "death-state", "burning", "camp", "transportation", "galleys", "hard-labour", "prison", "outlawry"]
};
/** Which tier a set of deeds earns: light up to 2, middle up to 5, grave beyond. */
export function tierOf(deeds = []) {
  const g = deeds.reduce((s, d) => s + (GRAVITY[d?.deed ?? d] ?? 1), 0);
  return {weight: g, tier: g <= 2 ? "light" : g <= 5 ? "middle" : "grave"};
}

/** What each sentence leaves on the character. years: [least, most] for time served. */
export const MARKS = {
  fine: {kind: "fine", words: "Fined"}, penance: {kind: "record", words: "Penance done before the church"},
  pillory: {kind: "record", words: "Stood in the pillory"}, flogging: {kind: "record", words: "Flogged"}, bamboo: {kind: "record", words: "Beaten with the bamboo"},
  confiscation: {kind: "fine", words: "Land and goods taken"},
  prison: {kind: "time", words: "Prison", years: [1, 5]}, "hard-labour": {kind: "time", words: "Hard labour", years: [2, 10]},
  galleys: {kind: "time", words: "The galleys", years: [3, 10]}, camp: {kind: "time", words: "A labour camp", years: [5, 25]},
  transportation: {kind: "time", words: "Transportation overseas", years: [7, 14], away: true},
  banishment: {kind: "banished", words: "Banished from the land"}, outlawry: {kind: "outlaw", words: "Outlawed: anyone may kill them"},
  maiming: {kind: "brand", words: "Branded"}, outcaste: {kind: "record", words: "Put out of caste"}, enslave: {kind: "time", words: "Sold into slavery", years: [5, 40]},
  hanging: {kind: "death", words: "Condemned to death"}, "death-state": {kind: "death", words: "Condemned to death"}, burning: {kind: "death", words: "Condemned to the fire"}
};

/** The sentences the court may pass: the tier's sentences the land allows, else the nearest tier's. */
export function sentencesFor(law = {}, deeds = []) {
  const allowed = new Set(law.punish ?? []);
  const {tier} = tierOf(deeds);
  const order = tier === "grave" ? ["grave", "middle", "light"] : tier === "middle" ? ["middle", "light", "grave"] : ["light", "middle"];
  for ( const t of order ) { const l = TIERS[t].filter(p => allowed.has(p)); if ( l.length ) return {tier: t, list: l}; }
  return {tier: "light", list: ["fine"]};
}

/** A record of a sentence, kept on paper or, once the age has databases, in a computer. */
export const recordKind = year => (n(year) >= 1970 ? "database" : n(year) >= 1880 ? "file" : "register");

/**
 * The mark a sentence leaves. year: when; region: where; weight: tierOf weight (longer time for graver deeds).
 * Returns {id, kind, punish, words, region, year, until, record}.
 */
export function markFor(punish, {year = 0, region = "", weight = 3, id = ""} = {}) {
  const m = MARKS[punish] ?? MARKS.fine;
  const yrs = m.years ? Math.round(m.years[0] + (m.years[1] - m.years[0]) * clamp((n(weight) - 2) / 6, 0, 1)) : 0;
  return {id: String(id || `${punish}-${year}`).slice(0, 40), kind: m.kind, punish, words: `${m.words}${yrs ? ` (${yrs} year${yrs === 1 ? "" : "s"})` : ""}`,
    region: String(region).slice(0, 40), year: n(year), until: yrs ? n(year) + yrs : 0, away: !!m.away, record: recordKind(year)};
}
export function normMark(m = {}) {
  const k = ["fine", "record", "time", "banished", "outlaw", "brand", "death"].includes(m.kind) ? m.kind : "record";
  return {id: String(m.id ?? "").slice(0, 40), kind: k, punish: String(m.punish ?? "").slice(0, 20), words: String(m.words ?? "").slice(0, 120), region: String(m.region ?? "").slice(0, 40),
    year: n(m.year), until: n(m.until), away: !!m.away, record: ["register", "file", "database"].includes(m.record) ? m.record : "register", pardoned: !!m.pardoned};
}

/** Marks still in force in a year: time not yet served, outlawry and banishment until pardoned, brands for good. */
export function inForce(marks = [], year = 0) {
  return marks.map(normMark).filter(m => !m.pardoned && (m.kind === "time" ? n(year) < m.until : m.kind !== "fine"));
}

/** What the marks mean for the character where they stand: outlawed or banished here, a brand to hide, a record. */
export function standingHere(marks = [], region = "", year = 0) {
  const live = inForce(marks, year);
  return {
    outlaw: live.some(m => m.kind === "outlaw" && m.region === region),
    banished: live.some(m => m.kind === "banished" && m.region === region),
    serving: live.find(m => m.kind === "time") ?? null,
    branded: live.some(m => m.kind === "brand"),
    records: live.filter(m => m.kind === "record" || m.kind === "time").length,
    condemned: live.some(m => m.kind === "death" && m.region === region)
  };
}

/** Lines for the undying (B3611): what a sentence means to each kind of character, for the Storyteller. */
export const LINE_PUNISH = {
  vampire: "A Kindred condemned to hang survives the rope; the body may go to the anatomists, or to the grave, and either way wakes. A cell with a window is a death sentence of its own.",
  ghoul: "Time in a cell starves a ghoul of the domitor's blood.",
  werewolf: "A Garou in a cell for years may not stay a prisoner, or stay sane.",
  mage: "Years of the world's walls and routine wear at a mage's will.",
  changeling: "Iron bars and the grey of a prison drain the Glamour.",
  wraith: "A wraith's Fetters may lie in the condemned cell or the gallows yard.",
  hunter: "In the cells, the hunter learns who else the law has caught.",
  mummy: "An executed mummy rises again, and the law has lost a body.",
  demon: "A condemned host may still leave the demon a body to keep.",
  revenant: "The family can buy a pardon, and will want it repaid.",
  mortal: ""
};
