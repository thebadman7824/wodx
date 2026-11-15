/**
 * WoDX NPC (NPC Motives Desk part three, B5692-B5698): what cults, servants, followers, Embraces and a faction on guard
 * do for the NPCs behind them, and the hours they keep on the map. The pure part; cults.mjs, servant-world.mjs,
 * orders.mjs, fates.mjs, factions.mjs and routines.mjs act on the world.
 *
 * Book basis (in WoDX's own words; printed pages):
 *   Herd adds a die a dot to hunting rolls, and may be a cult built around the vampire (V20 p. 114).
 *   The Cult Background adds its dice to a ritual worked with the cult gathered (M20 p. 310).
 *   Retainers and ghouls keep a vampire's haven and serve by day (V20 pp. 115-116).
 *   Demon: The Fallen's followers and thralls (pp. 155-161).
 * WoDX readings: the hours, the reasons for an Embrace, how many faithful are seen, and the rest.
 */

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const DAY = 86400;
const hash = s => { let h = 2166136261; for ( const c of String(s) ) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const B = (from, to, place, activity, more = {}) => ({from, to, place, activity, when: "any", days: null, feast: "any", label: "", ...more});

/* ---- Duties: hours laid over an NPC's own routine, first in line ---- */

/** Is a duty in force at now? */
export const dutyActive = (d, now) => !!d?.place && (!d.until || num(now) < num(d.until));
/** The routine's blocks with the duties in force laid on top (the first block that fits an hour wins). */
export function withDuties(blocks = [], duties = {}, now = 0) {
  const on = Object.values(duties ?? {}).filter(d => dutyActive(d, now)).map(({until, why, ...b}) => ({...B(0, 24, b.place, b.activity), ...b, duty: true}));
  return on.length ? [...on, ...(blocks ?? [])] : blocks;
}

/* ---- e2: the faithful on the map ---- */

/** The night of the week a cult meets (0 to 6), the same for the same cult. */
export const worshipDay = id => hash(`cult:${id}`) % 7;
/** The weekly evening at the meeting place. */
export const worshipDuty = (place, cultName, day) => B(19, 23, place, "pray", {days: [day], label: `At the gathering of ${cultName || "the faithful"}`});
/** How many of the faithful are named and seen: up to six, never more than the members. */
export const SEEN = 6;
export const recruitWanted = (members, named) => Math.max(0, Math.min(SEEN, Math.round(num(members))) - Math.round(num(named)));

/* ---- e1: what a cult does for its founder ---- */

/** The purpose a cult serves, by kind, for the cult's card. */
export const PURPOSE = {
  blood: "feeds its founder without the hunt", kuei: "feeds its founder breath and blood, and hides the court",
  thralls: "gives its founder worship and Faith", netaru: "keeps its founder's body and rites",
  cult: "lends its faith to its founder's rituals", wyrm: "spreads the Wyrm's taint where it meets",
  sect: "sways the town for its founder", remembrance: "keeps its founder's memory alive", dreamers: "feeds its founder's Glamour",
  oldfaith: "keeps the old rites near the caern", flock: "watches and listens for its founder"
};
/** The bond an ordained member takes toward an NPC founder, by cult kind (null: none). */
export const BIND = {blood: "blood", kuei: null, thralls: "pact", netaru: "cult"};
/**
 * The week's service. dots: the cult's Background dots (cult-rules dotsFor).
 * Returns {herd, bind, dice, taint, influence}: the Herd it stands for on the founder's sheet, the bond for the ordained, the Cult dots on
 * the founder's rituals, taint laid on the place, and Influence for the founder's faction (to the cult's dots).
 */
export function cultServes(kind, dots = 0) {
  const d = Math.max(0, Math.min(5, Math.round(num(dots))));
  return {herd: ["blood", "kuei"].includes(kind) ? d : 0, bind: BIND[kind] ?? null, dice: ["cult", "wyrm", "netaru"].includes(kind) ? d : 0,
    taint: kind === "wyrm" && d > 0 ? 1 : 0, influence: kind === "sect" ? d : 0};
}

/* ---- e3: a raid at the meeting place ---- */

/** Who raids a cult: the Church before 1700, the town's watch after (Storyteller's reach kinds). */
export const raidForce = year => (num(year) < 1700 ? "purge" : "patrol");

/* ---- g3: servants attend their masters ---- */

/** The hours a bound servant keeps at its master's place: a ghoul or retainer by day, the rest in the evening. */
export function servantDuty(kind, place, masterLine = "vampire") {
  if ( !place ) return null;
  if ( (kind === "blood" || kind === "retainer") && masterLine === "vampire" ) return B(0, 24, place, "attend", {when: "day", label: "Keeping the master's haven"});
  return B(18, 22, place, "attend", {label: "Attending the master"});
}
/** A servant attending its master brings a vessel on the master's hunting night: one more die. */
export const VESSEL_DIE = 1;

/* ---- g4: a follower sent to fetch ---- */

/** What comes of a fetch: "comes" (regards the master well enough), "refuses", or "carried" (a thing, not a person). */
export function fetchAnswer({person = true, step = 0} = {}) {
  if ( !person ) return "carried";
  return num(step) >= 0 ? "comes" : "refuses";
}
export const REFUSALS = ["I have no business with them.", "Tell them to come themselves.", "Not tonight.", "I am going nowhere with you.", "Leave me be."];
export const refusal = seed => REFUSALS[hash(seed) % REFUSALS.length];

/* ---- g5: why an Embrace is made off the screen ---- */

export const EMBRACE_REASONS = {
  servant: "to replace a lost servant", obsession: "out of an obsession with the mortal", weapon: "as a weapon in the Jyhad",
  skill: "for a skill worth keeping", pack: "to grow the pack", heir: "to have an heir", love: "out of a love that would not let go",
  spite: "to spite a rival", accident: "in a hunger that went too far"
};
const SECT_REASONS = {
  camarilla: ["skill", "weapon", "heir", "servant", "obsession", "love"], sabbat: ["pack", "pack", "weapon", "spite", "accident"],
  anarch: ["love", "spite", "skill", "pack", "accident"], independent: ["servant", "skill", "heir", "obsession"],
  court: ["heir", "servant", "skill", "weapon", "love"], none: ["accident", "obsession", "love", "servant"]
};
/** Natures that lean to a reason (V20 Archetypes). */
const NATURE_LEAN = {architect: "heir", bravo: "weapon", director: "skill", fanatic: "weapon", gallant: "love", "bon vivant": "love",
  bully: "spite", rebel: "spite", monster: "accident", caregiver: "servant", visionary: "obsession", curmudgeon: "servant"};
/** A reason for one Embrace: the sire's Nature leans one way half the time, else one of its sect's. roll: 0 to 1. */
export function embraceReason(sect = "none", nature = "", roll = 0.5) {
  const lean = NATURE_LEAN[String(nature ?? "").toLowerCase()];
  if ( lean && num(roll) < 0.5 ) return lean;
  const list = SECT_REASONS[sect] ?? SECT_REASONS.none;
  return list[Math.floor((num(roll) * 1000) % list.length)];
}
/** Courts that need the Prince's (or the lord's) leave for an Embrace, and the chance a sire goes without it. */
export const LEAVE_SECTS = new Set(["camarilla", "court"]);
export const WITHOUT_LEAVE = 0.25;
export const withoutLeave = (sect, roll, office = "") => LEAVE_SECTS.has(sect) && !/prince|lord|voivode/i.test(String(office ?? "")) && num(roll) < WITHOUT_LEAVE;

/* ---- g6: a faction on guard ---- */

/** The watch one of the faction's people keeps at its place until the next faction turn. */
export const guardDuty = (place, until) => ({...B(0, 24, place, "patrol", {label: "Standing guard for the faction"}), until});
export const GUARD_DAYS = 7;
export const guardUntil = now => num(now) + GUARD_DAYS * DAY;
