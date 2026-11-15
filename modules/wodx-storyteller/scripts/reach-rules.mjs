/**
 * The world's own hand (B4861-B4866): the rules for what the world sends and does when one of its systems acts, so
 * that a warrant, a raid, a road encounter or a lever pulled in an institution changes the map and the sheets without
 * the Storyteller staging it (Ben's Storyteller's Hand picks w2 to w5, 14 November 2026). Pure, no Foundry.
 *
 * The people sent are the quick extras of kits-rules.mjs (house figures, from the books' weapon charts). Which extras,
 * how many and the lever readings are house readings (docs/PENDING-REVIEW.md).
 */
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const early = year => !(num(year) >= 1600);

/** Who each kind of move sends, before and from 1600: [[extra key, count]]. */
export const FORCES = {
  law: {early: [["watch", 2]], late: [["police", 2]]},
  patrol: {early: [["watch", 3]], late: [["police", 3]]},
  soldiers: {early: [["manatarms", 3]], late: [["soldier", 3]]},
  raid: {early: [["manatarms", 1], ["peasant", 3]], late: [["soldier", 1], ["thug", 2]]},
  purge: {early: [["manatarms", 2], ["peasant", 4]], late: [["soldier", 2], ["police", 2]]},
  secret: {early: [["manatarms", 2]], late: [["thug", 3]]}
};
export const FORCE_WORDS = {law: "the watch", patrol: "a patrol", soldiers: "soldiers", raid: "hunters", purge: "the purge", secret: "men with no names"};
export const forceWords = (kind, year) => (kind === "law" || kind === "patrol") && !early(year) ? (kind === "law" ? "the police" : "a police patrol") : (FORCE_WORDS[kind] ?? "people");

/** The extras one move sends in a year: [{key, n}]. */
export function forceFor(kind, year) {
  const f = FORCES[kind];
  if ( !f ) return [];
  return (early(year) ? f.early : f.late).map(([key, n]) => ({key, n}));
}

/* ---- the road (w3) ---- */

const COUNT = {a: 1, an: 1, one: 1, lone: 1, two: 2, pair: 2, couple: 2, three: 3, four: 4, five: 5, six: 6, several: 3, few: 3, some: 2, pack: 4, band: 4};
export const BEASTS = [
  [/\bwol(f|ves)\b/i, {early: "wolf_da", late: "wolf"}],
  [/\bhounds?\b|\bdogs?\b|\bcurs?\b/i, {early: "dog_da", late: "dog"}]
];
export const HOSTILE = /\bbandits?\b|\brobbers?\b|\bbrigands?\b|\boutlaws?\b|\braiders?\b|\bthieves\b|\bhighwaym[ae]n\b|\bambush|\bcutthroats?\b|\bmuggers?\b|\bthugs?\b|\bgang\b|\bwol(f|ves)\b|\bferal\b/i;
const MEN = /\bbandits?\b|\brobbers?\b|\bbrigands?\b|\boutlaws?\b|\braiders?\b|\bthieves\b|\bhighwaym[ae]n\b|\bcutthroats?\b|\bmuggers?\b|\bthugs?\b|\bgang\b/i;

function countNear(text, m) {
  const words = String(text).slice(0, m.index).toLowerCase().split(/[^a-z-]+/).filter(Boolean).slice(-3);
  const w = [...words].reverse().find(x => COUNT[x]);
  const plural = /s$|ves$|men$/i.test(m[0]);
  return Math.max(1, Math.min(6, w ? COUNT[w] : (plural ? 3 : 1)));
}

/**
 * What a road encounter line puts on the map: {hostile, extras: [{key, n}], people}. Beasts and armed men come as
 * extras that fight; anyone else comes as people from WoDX Creation (people true), who talk and pass.
 */
export function roadPlan(text = "", year = 1197) {
  const s = String(text ?? "");
  const hostile = HOSTILE.test(s);
  const extras = [];
  for ( const [re, keys] of BEASTS ) {
    const m = s.match(re);
    if ( m ) extras.push({key: early(year) ? keys.early : keys.late, n: countNear(s, m)});
  }
  const men = s.match(MEN);
  if ( men ) extras.push({key: early(year) ? "bandit" : "thug", n: countNear(s, men)});
  return {hostile: hostile && extras.length > 0, extras, people: !extras.length};
}

/* ---- the law (w5) ---- */

/** The day hours a vampire's haven is knocked up (working hours; the night itself is the sun's, terms.isNightAt). */
export const DAY_FROM = 9, DAY_TO = 16;
export const isDayHour = h => num(h) >= DAY_FROM && num(h) < DAY_TO;
/** Lines who sleep by day and can be taken at the haven then. */
export const DAY_SLEEPERS = ["vampire"];

/**
 * What the law does at a stage (law-heat-rules STAGES keys): "come" (the watch come to the culprit's scene) when Wanted (warrant) or a manhunt is
 * first reached; through a manhunt "patrol" each night, and "haven" by day for a day sleeper whose haven is known.
 */
export function lawMove(stage, {crossed = false, line = "mortal", hour = 12, havenKnown = false, night = null, time = null, latitude = 50} = {}) {
  if ( stage !== "warrant" && stage !== "manhunt" ) return null;
  if ( crossed ) return "come";
  if ( stage !== "manhunt" ) return null;
  // B6185: night is sunset to sunrise where the scene is (passed in); else the sun for the time given, else for the hour
  const dark = typeof night === "boolean" ? night : !!TERMS.isNightAt(time ?? num(hour) * TERMS.HOUR, latitude);
  if ( DAY_SLEEPERS.includes(line) && havenKnown && !dark && isDayHour(hour) ) return "haven";
  if ( dark ) return "patrol";
  return null;
}
/** One patrol a culprit a day: the day number a patrol last went out is kept, and this says if one is due. */
export const patrolDue = (lastDay, day) => lastDay === null || lastDay === undefined || num(day) > num(lastDay);

/* ---- levers (w2) ---- */

/**
 * What each institution lever does (institution-rules.mjs KINDS). Each entry: for, the moves when the lever helps
 * its target (the asker or no target); against, when it is turned on someone else. Moves:
 *   tale {tone, did, big}     a rumour about the target           cool {factor}       the law's heat on the target lowered
 *   heat {deed}               a deed on the target's heat         arrest {mode}       the law comes for the target
 *   force {kind, hostile}     extras sent to the target's scene   hunters {n}         hunter pressure and a file
 *   town {event}              a town event at the institution     money {wages, who}  a purse changes by months of wages
 *   seat / unseat             a seat for the target, or taken     know {what}         a card to the asker with what is found
 *   attitude {delta}          the seat holders' feeling for the target                doubt               rumours about the target doubted
 */
const T = (tone, did, big = false) => ({op: "tale", tone, did, big});
export const LEVERS = {
  records: {for: [{op: "cool", factor: 0.5}], against: [T(-1, "has an old record turn up")]},
  denounce: {for: [], against: [T(-2, "was denounced from the pulpit", true), {op: "hunters", n: 1}]},
  sanctuary: {for: [{op: "cool", factor: 0}], against: [{op: "cool", factor: 0}]},
  inquiry: {for: [{op: "hunters", n: 1}], against: [{op: "hunters", n: 2}, T(-1, "is under inquiry")]},
  permit: {for: [{op: "seat"}], against: [{op: "money", wages: -2}, T(-1, "was barred from the trade")]},
  prices: {for: [{op: "town", event: "prices"}, {op: "money", wages: 3, who: "asker"}], against: [{op: "town", event: "prices"}, {op: "money", wages: -2}]},
  expel: {for: [], against: [{op: "unseat"}, T(-1, "was thrown out")]},
  papers: {for: [{op: "cool", factor: 0.5}], against: [{op: "heat", deed: "tax"}]},
  licence: {for: [{op: "money", wages: 1}], against: [{op: "money", wages: -2}, T(-1, "was refused a licence")]},
  curfew: {for: [{op: "town", event: "curfew"}], against: [{op: "town", event: "curfew"}]},
  levy: {for: [{op: "town", event: "levy"}, {op: "money", wages: 3, who: "asker"}], against: [{op: "town", event: "levy"}, {op: "money", wages: -3}]},
  file: {for: [{op: "cool", factor: 0.5}], against: [{op: "heat", deed: "tax"}]},
  blind: {for: [{op: "cool", factor: 0.5}], against: [{op: "cool", factor: 0.5}]},
  raid: {for: [{op: "town", event: "patrol"}, {op: "force", kind: "patrol"}], against: [{op: "heat", deed: "break"}, {op: "force", kind: "law", hostile: true}]},
  arrest: {for: [], against: [{op: "arrest", mode: "arrest"}]},
  rumour: {for: [T(1, "is spoken well of")], against: [T(-1, "is talked about")]},
  print: {for: [T(1, "is in the paper", true)], against: [T(-1, "is in the paper", true)]},
  kill: {for: [{op: "doubt"}], against: [{op: "doubt"}]},
  campaign: {for: [T(2, "is praised in the paper for weeks", true)], against: [T(-2, "is attacked in the paper for weeks", true)]},
  library: {for: [{op: "know", what: "lore"}], against: [{op: "know", what: "lore"}]},
  teach: {for: [T(1, "teaches openly")], against: [T(-1, "teaches dangerous things")]},
  degree: {for: [{op: "seat"}], against: [{op: "unseat"}, T(-1, "was refused a degree")]},
  look: {for: [{op: "know", what: "money"}], against: [{op: "know", what: "money"}]},
  loan: {for: [{op: "money", wages: 6}], against: [{op: "money", wages: -6}]},
  ruin: {for: [{op: "money", wages: 3}], against: [{op: "money", wages: -6}, T(-1, "is going under")]},
  rescue: {for: [{op: "money", wages: 12}], against: [{op: "money", wages: -12}, T(-1, "is ruined", true)]},
  inside: {for: [{op: "seat"}], against: [{op: "seat"}]},
  hire: {for: [{op: "seat"}], against: [{op: "unseat"}, {op: "money", wages: -1}]},
  buy: {for: [{op: "money", wages: -6, who: "asker"}, T(1, "has bought a business")], against: [{op: "money", wages: -6, who: "asker"}, {op: "money", wages: 3}]},
  move: {for: [{op: "town", event: "works"}], against: [{op: "town", event: "works"}]},
  docket: {for: [{op: "cool", factor: 0.5}], against: [{op: "heat", deed: "tax"}]},
  bail: {for: [{op: "cool", factor: 0.5}], against: [{op: "arrest", mode: "arrest"}]},
  sentence: {for: [{op: "cool", factor: 0}], against: [{op: "heat", deed: "theft"}]},
  overturn: {for: [{op: "cool", factor: 0}, T(1, "was cleared")], against: [{op: "arrest", mode: "arrest"}]},
  audience: {for: [{op: "attitude", delta: 1}], against: [{op: "attitude", delta: -1}]},
  grant: {for: [{op: "money", wages: 3}], against: [{op: "money", wages: -2}]},
  appoint: {for: [{op: "seat"}], against: [{op: "seat"}]},
  decree: {for: [{op: "town", event: "decree"}], against: [{op: "town", event: "decree"}, {op: "heat", deed: "tax"}]},
  assess: {for: [{op: "know", what: "money"}], against: [{op: "know", what: "money"}]},
  relief: {for: [{op: "money", wages: 3}], against: [{op: "money", wages: -2}]},
  audit: {for: [{op: "know", what: "money"}], against: [{op: "money", wages: -3}, {op: "heat", deed: "tax"}]},
  farm: {for: [{op: "money", wages: 6}], against: [{op: "money", wages: -3}]},
  supply: {for: [{op: "town", event: "short"}, {op: "money", wages: 3, who: "asker"}], against: [{op: "town", event: "short"}, {op: "money", wages: -2}]},
  billet: {for: [{op: "money", wages: 1}], against: [{op: "money", wages: -2}, {op: "force", kind: "soldiers"}]},
  patrol: {for: [{op: "town", event: "patrol"}, {op: "force", kind: "patrol"}], against: [{op: "force", kind: "patrol"}]},
  martial: {for: [{op: "town", event: "martial"}, {op: "force", kind: "soldiers"}], against: [{op: "town", event: "martial"}, {op: "force", kind: "soldiers"}]},
  whisper: {for: [], against: [{op: "hunters", n: 1}, T(-1, "was denounced in a whisper")]},
  summon: {for: [], against: [{op: "arrest", mode: "summon"}]},
  grace: {for: [{op: "town", event: "calm"}, {op: "cool", factor: 0.5}], against: [{op: "town", event: "calm"}]},
  hand: {for: [], against: [{op: "arrest", mode: "arrest"}, {op: "hunters", n: 2}]},
  watch: {for: [{op: "know", what: "where"}], against: [{op: "know", what: "where"}]},
  dossier: {for: [{op: "know", what: "money"}], against: [{op: "heat", deed: "tax"}, {op: "know", what: "money"}]},
  detain: {for: [], against: [{op: "arrest", mode: "detain"}]},
  vanish: {for: [], against: [{op: "force", kind: "secret", hostile: true}, T(-1, "has not been seen for days")]}
};

/** The moves one lever makes: against when the target is someone other than the asker. */
export function leverMoves(key, {asker = null, target = null} = {}) {
  const l = LEVERS[key];
  if ( !l ) return [];
  const against = !!target && target !== asker;
  const list = against ? l.against : l.for;
  return list.map(m => ({...m, on: m.who === "asker" || !target ? "asker" : "target"}));
}

/** Months of wages as a sum (wage: one month's wage in the base unit). */
export const wagesSum = (wages, wage) => Math.round(Math.abs(num(wages)) * Math.max(1, num(wage)));

/* ---- the Veil (x3) ---- */

/**
 * What the Veil's two lowest bands do (Storyteller ledger-rules VEIL_BANDS: Failing 1 to 2, Torn 0).
 *   Failing  each breach also adds a deed to the law's heat on the culprit and a point of hunter pressure
 *   Torn     the region's hunters take a turn every week as on alarm, and rumours of a breach spread twice as fast
 */
export function veilBand(value) {
  const v = num(value);
  if ( v < 1 ) return "torn";
  if ( v < 3 ) return "failing";
  return "holding";
}
export function veilMoves(band) {
  if ( band === "failing" ) return {breachHeat: 1, breachHunters: 1, weeklyAlarm: false, rumourSpeed: 1};
  if ( band === "torn" ) return {breachHeat: 1, breachHunters: 2, weeklyAlarm: true, rumourSpeed: 2};
  return {breachHeat: 0, breachHunters: 0, weeklyAlarm: false, rumourSpeed: 1};
}

/* ---- Threads of Fate write-backs (w1) ---- */

/**
 * What each ending write-back on the Threads of Fate cards (data/threads-cards.mjs) does, by its words. Moves:
 *   standing {delta, who}   the region's factions regard the player characters (who "pcs") by a step
 *   memory {kind, of}       the story's NPC (and the region's faction leaders) remember the player characters
 *   heirs                   strong grudges pass to the heirs of the dead (WoDX NPC memory turn reads the same)
 *   debt {from, size}       a ledger debt or boon to the player characters, or from them
 *   paid                    open debts the story touched are marked paid
 *   hunters {n, lead}       hunter pressure in the story's region, with a file on whom the story was about
 *   town {event}            a town event for the story's town
 * Rumours and tales are already spread by threads.mjs. House readings (docs/PENDING-REVIEW.md).
 */
export const WRITE_BACKS = {
  "Both sides owe the peacemakers": [{op: "standing", delta: 1}, {op: "debt", from: "npc", size: "minor"}],
  "Every party that wanted it is angry": [{op: "standing", delta: -1}],
  "Its old keepers remember": [{op: "memory", kind: "cold"}],
  "Those who helped gain standing": [{op: "standing", delta: 1}],
  "Whoever waited is grateful": [{op: "standing", delta: 1}, {op: "memory", kind: "favour"}],
  "Hunters gain a lead": [{op: "hunters", n: 2, lead: true}],
  "The watchers are satisfied for now": [{op: "hunters", n: -2}],
  "A debt is owed to whoever held it back": [{op: "debt", from: "npc", size: "minor"}],
  "A new debt, longer and stranger": [{op: "debt", from: "pcs", size: "major"}],
  "What was paid is gone": [{op: "paid"}],
  "A grudge against the players": [{op: "memory", kind: "insult"}],
  "A powerful grudge": [{op: "memory", kind: "betrayed"}],
  "Grudges carry to the heirs": [{op: "heirs"}],
  "Its keepers owe a kindness": [{op: "memory", kind: "favour"}, {op: "debt", from: "npc", size: "trivial"}],
  "The accused remembers who stood by them": [{op: "memory", kind: "saved"}],
  "The creditor is satisfied": [{op: "memory", kind: "kept"}, {op: "paid"}],
  "The survivors remember who helped": [{op: "memory", kind: "saved"}],
  "Whoever waited is let down": [{op: "memory", kind: "broken"}, {op: "standing", delta: -1}],
  "The place changes hands": [{op: "town", event: "hands"}],
  "The place is changed for the worse": [{op: "town", event: "dread"}]
};
/** The moves for one write-back {to, what}; an unknown one by its system: [] for rumours and tales. */
export function writeMoves(w = {}) {
  if ( ["rumours", "tales"].includes(w.to) ) return [];
  const known = WRITE_BACKS[w.what];
  if ( known ) return known;
  return {factions: [{op: "standing", delta: 1}], memory: [{op: "memory", kind: "warm"}], ledger: [{op: "debt", from: "npc", size: "minor"}],
    hunters: [{op: "hunters", n: 1, lead: true}], towns: [{op: "town", event: "dread"}]}[w.to] ?? [];
}

/**
 * B4883: a call for help, and how long before help comes (house figures). A telephone or radio call brings the police
 * (or the watch before 1600) in ten minutes; a bell, horn or shout brings the watch in twenty; with neither, a runner
 * fetches them in half an hour. Returns {kind, seconds, words}.
 */
export function helpPlan(how = "shout", year = 1197) {
  const wired = (how === "phone" && num(year) >= 1890) || (how === "radio" && num(year) >= 1930);
  const minutes = wired ? 10 : how === "bell" || how === "shout" ? 20 : 30;
  return {kind: "law", seconds: minutes * 60, minutes, words: forceWords("law", year)};
}
export const helpDue = (list = [], now = 0) => (Array.isArray(list) ? list : []).filter(h => h && num(h.at) <= num(now));
