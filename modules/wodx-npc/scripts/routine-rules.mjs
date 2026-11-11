/**
 * WoDX NPC 0.2 (Phase 7c): the pure rules of routines, places and reactions. No Foundry calls, so the harness can test
 * them. main.mjs and routines.mjs read the clock, the scenes and the tokens and hand the results here.
 *
 *   A routine is a list of hour blocks: {from, to, place, activity, when, days, feast, label}. The first block that
 *   fits the time wins, so the special blocks (Sundays, feast days) come before the everyday ones.
 *     from, to   whole hours 0 to 24; a block from 21 to 6 runs past midnight; from equal to to (or 0 to 24) is all day
 *     place      a role ("home", "work", "church" ...) or one place's id
 *     when       "any", "day" or "night" (by the Chronicle's sunrise and sunset, not by the hour)
 *     days       weekdays it runs on (0 Monday ... 6 Sunday), or null for every day
 *     feast      "any", "only" (feast days only) or "not" (never on a feast day)
 *   A block past midnight belongs to the day it started on: Saturday's 21:00 to 06:00 block is still Saturday's at 02:00.
 *
 * "describe" is a function of world time that returns {hour, minute, dayOfWeek, isNight, feast, jdn}: the Chronicle's
 * describeTime plus feastOn below. Tests build it from WoDX Chronicle's date engine.
 */

export const ACTIVITIES = {
  sleep: "Sleeping", rest: "At rest", work: "At work", pray: "At prayer", drink: "Drinking", patrol: "On watch",
  hunt: "Hunting", hide: "In hiding", errand: "On errands", attend: "Attending their master", wander: "Out and about"
};

/** Kinds of place a scene, or a region inside one, can be tagged with. */
export const PLACE_KINDS = {
  home: "Home", workplace: "Workplace or shop", church: "Church, chapel or cloister", tavern: "Tavern or inn",
  haven: "Haven (a Cainite's resting place)", gate: "Gate, watch-house or barracks", market: "Market or square",
  street: "Street, lane or road", castle: "Castle, keep or court", wilds: "Woods, fields or wilds", caern: "Caern or sacred site",
  other: "Other"
};

/** The roles a routine block can name, and the kinds of place each falls back to when the NPC has none set. */
export const ROLES = {
  home: {label: "Home", kinds: ["home"]},
  work: {label: "Workplace", kinds: ["workplace", "market"]},
  church: {label: "Church", kinds: ["church"]},
  tavern: {label: "Tavern", kinds: ["tavern"]},
  haven: {label: "Haven", kinds: ["haven", "home"]},
  post: {label: "Watch post", kinds: ["gate", "castle"]},
  market: {label: "Market", kinds: ["market", "street"]},
  street: {label: "The streets", kinds: ["street", "market"]},
  court: {label: "Court", kinds: ["castle"]},
  wilds: {label: "The wilds", kinds: ["wilds", "caern"]},
  domitor: {label: "With their domitor", kinds: []}
};

const weekdays = [0, 1, 2, 3, 4, 5];
const B = (from, to, place, activity, more = {}) => ({from, to, place, activity, when: "any", days: null, feast: "any", label: "", ...more});

/**
 * Ready routines. Each template of 7b has one by default (DEFAULT_PRESET); the rest can be picked in the editor.
 * Hours are WoDX readings of the trade, not book rules. The canonical hours follow the Western monastic day. Where
 * Rothenstein's own notes give a time, the presets follow them: the market shutters at dusk, and the priest is in the
 * church from dusk until the late bell (Rothenstein Codex, The Lower Town; Places, Ludovic's Presbytery).
 */
export const PRESETS = {
  "night-watch": {label: "Guard, night watch", blocks: [
    B(18, 24, "street", "patrol", {label: "Rounds of the streets"}), B(0, 6, "post", "patrol", {label: "At the watch post"}),
    B(6, 14, "home", "sleep"), B(14, 18, "home", "rest")]},
  "day-watch": {label: "Guard, day watch", blocks: [
    B(6, 18, "post", "patrol"), B(18, 21, "tavern", "drink", {days: [4, 5, 6]}), B(21, 6, "home", "sleep"), B(0, 24, "home", "rest")]},
  merchant: {label: "Merchant or shopkeeper", blocks: [
    B(8, 10, "church", "pray", {days: [6], label: "Mass"}), B(8, 10, "church", "pray", {feast: "only", label: "Mass"}),
    B(6, 24, "work", "work", {when: "day", days: weekdays, feast: "not", label: "Trading until the market shutters at dusk"}),
    B(18, 21, "tavern", "drink", {days: [4, 5]}), B(21, 6, "home", "sleep"), B(0, 24, "home", "rest")]},
  labourer: {label: "Labourer or craftsman", blocks: [
    B(7, 9, "church", "pray", {days: [6], label: "Mass"}), B(7, 9, "church", "pray", {feast: "only", label: "Mass"}),
    B(5, 19, "work", "work", {days: weekdays, feast: "not"}), B(19, 21, "tavern", "drink", {days: [5]}),
    B(21, 5, "home", "sleep"), B(0, 24, "home", "rest")]},
  priest: {label: "Priest (the canonical hours)", blocks: [
    B(6, 13, "church", "pray", {days: [6], label: "Mass and the offices"}), B(6, 13, "church", "pray", {feast: "only", label: "Mass and the offices"}),
    B(2, 3, "church", "pray", {label: "Matins and Lauds"}), B(6, 7, "church", "pray", {label: "Prime"}),
    B(7, 12, "street", "errand", {label: "Parish rounds"}), B(12, 13, "church", "pray", {label: "Sext"}),
    B(12, 21, "church", "pray", {when: "night", label: "Vespers to Compline, dusk to the late bell"}),
    B(13, 24, "home", "work", {when: "day", label: "Parish work"}), B(21, 2, "home", "sleep"), B(3, 6, "home", "sleep"), B(0, 24, "home", "rest")]},
  innkeeper: {label: "Innkeeper or tavern-keeper", blocks: [
    B(7, 9, "church", "pray", {days: [6], label: "Mass"}), B(6, 24, "tavern", "work"), B(0, 6, "home", "sleep")]},
  ghoul: {label: "Ghoul, errands by day", blocks: [
    B(0, 24, "domitor", "attend", {when: "night"}), B(8, 16, "market", "errand", {when: "day"}), B(0, 24, "haven", "sleep", {when: "day"})]},
  neonate: {label: "Cainite, hunts by night", blocks: [
    B(0, 24, "haven", "sleep", {when: "day"}), B(20, 2, "street", "hunt", {when: "night"}), B(0, 24, "haven", "rest", {when: "night"})]},
  elder: {label: "Cainite elder, holds court", blocks: [
    B(0, 24, "haven", "sleep", {when: "day"}), B(19, 23, "court", "work", {when: "night", label: "Holds court"}),
    B(23, 2, "street", "hunt", {when: "night"}), B(0, 24, "haven", "rest", {when: "night"})]},
  garou: {label: "Garou, guards the wilds", blocks: [B(0, 24, "wilds", "patrol", {when: "night"}), B(0, 24, "home", "rest", {when: "day"})]},
  hunter: {label: "Hunter, watches by night", blocks: [
    B(21, 3, "street", "hunt", {when: "night"}), B(7, 18, "work", "work", {days: weekdays, feast: "not"}), B(3, 7, "home", "sleep"),
    B(0, 24, "home", "rest")]},
  recluse: {label: "Recluse (stays at home)", blocks: [B(0, 24, "home", "rest")]}
};
/** The routine each 7b template starts from. Spirits, ghosts and beasts have none: they keep no hours a town would know. */
export const DEFAULT_PRESET = {guard: "night-watch", civilian: "labourer", ghoul: "ghoul", neonate: "neonate", elder: "elder", garou: "garou", hunter: "hunter"};

export const blocksOf = (routine, template, year = null) => {
  if ( Array.isArray(routine?.blocks) && routine.blocks.length ) return routine.blocks;
  const key = PRESETS[routine?.preset] ? routine.preset : DEFAULT_PRESET[template];
  return presetBlocks(key, routine?.age || ageOf(year));
};

/* ------------------------------------------------------------------ */
/*  Routines by era (NPC 0.13.0, B704 to B706)                         */
/* ------------------------------------------------------------------ */

/**
 * The ages a ready routine can change with. A routine follows the year unless the Storyteller fixes its age
 * (routine.age). House readings of how working days changed in the Czech lands: the clock and the town ordinance
 * after 1500; the factory's twelve-hour day in the nineteenth century; the eight-hour day from 1918 and the short
 * Saturday; the five-day week, late bars and fewer at Mass after 1980. The Future Darkness keeps the modern hours.
 */
export const AGES = {
  medieval: {label: "Medieval (to 1499)", from: -9999},
  early: {label: "Early modern (1500 to 1799)", from: 1500},
  industrial: {label: "Industrial (1800 to 1913)", from: 1800},
  c20: {label: "Twentieth century (1914 to 1979)", from: 1914},
  modern: {label: "Modern (1980 on)", from: 1980}
};
const AGE_ORDER = Object.keys(AGES);
/** The age of a year; no year known keeps the medieval hours the presets were first written for. */
export function ageOf(year) {
  const y = Number(year);
  if ( !Number.isFinite(y) || !y ) return "medieval";
  let out = "medieval";
  for ( const k of AGE_ORDER ) if ( y >= AGES[k].from ) out = k;
  return out;
}
/** A preset's hours in an age: that age's version, else the nearest earlier one, else its first hours. */
export function presetBlocks(key, age = "medieval") {
  const p = PRESETS[key];
  if ( !p ) return [];
  const i = Math.max(0, AGE_ORDER.indexOf(AGES[age] ? age : "medieval"));
  for ( let k = i; k >= 0; k-- ) if ( p.ages?.[AGE_ORDER[k]] ) return p.ages[AGE_ORDER[k]];
  return p.blocks ?? [];
}
/** Ready routines that belong to the year (those with a `from` year after it are left out of the picker). */
export const presetsFor = year => Object.fromEntries(Object.entries(PRESETS).filter(([, p]) => !p.from || !Number(year) || Number(year) >= p.from));

const monFri = [0, 1, 2, 3, 4];
/** Later ages of the first presets. Medieval hours stay as they were written above. */
const LATER = {
  "night-watch": {
    c20: [B(22, 6, "street", "patrol", {label: "The night shift on the streets"}), B(6, 14, "home", "sleep"), B(0, 24, "home", "rest")]},
  "day-watch": {
    c20: [B(6, 14, "post", "patrol", {label: "The early shift"}), B(18, 22, "tavern", "drink", {days: [4, 5]}), B(23, 6, "home", "sleep"), B(0, 24, "home", "rest")]},
  merchant: {
    early: [B(8, 10, "church", "pray", {days: [6], label: "Mass"}), B(8, 10, "church", "pray", {feast: "only", label: "Mass"}),
      B(7, 18, "work", "work", {days: weekdays, feast: "not", label: "Trading by the town clock"}), B(18, 21, "tavern", "drink", {days: [4, 5]}),
      B(22, 6, "home", "sleep"), B(0, 24, "home", "rest")],
    industrial: [B(9, 10, "church", "pray", {days: [6], label: "Mass"}), B(7, 19, "work", "work", {days: weekdays, feast: "not", label: "Shop hours"}),
      B(19, 22, "tavern", "drink", {days: [4, 5], label: "The coffee house or the inn"}), B(22, 6, "home", "sleep"), B(0, 24, "home", "rest")],
    c20: [B(9, 10, "church", "pray", {days: [6], label: "Sunday Mass"}), B(8, 18, "work", "work", {days: monFri, label: "Shop hours"}),
      B(8, 12, "work", "work", {days: [5], label: "Saturday morning"}), B(19, 22, "tavern", "drink", {days: [4]}), B(23, 7, "home", "sleep"), B(0, 24, "home", "rest")],
    modern: [B(9, 19, "work", "work", {days: monFri, label: "Shop hours"}), B(9, 13, "work", "work", {days: [5], label: "Saturday morning"}),
      B(20, 23, "tavern", "drink", {days: [4]}), B(23, 7, "home", "sleep"), B(0, 24, "home", "rest")]},
  labourer: {
    industrial: [B(7, 9, "church", "pray", {days: [6], label: "Mass"}), B(6, 18, "work", "work", {days: weekdays, feast: "not", label: "The workshop's twelve hours"}),
      B(19, 22, "tavern", "drink", {days: [5]}), B(21, 5, "home", "sleep"), B(0, 24, "home", "rest")],
    c20: [B(8, 9, "church", "pray", {days: [6], label: "Sunday Mass"}), B(6, 14, "work", "work", {days: monFri, label: "The eight-hour day"}),
      B(6, 12, "work", "work", {days: [5], label: "Saturday morning"}), B(18, 21, "tavern", "drink", {days: [4, 5]}), B(22, 5, "home", "sleep"), B(0, 24, "home", "rest")],
    modern: [B(7, 16, "work", "work", {days: monFri}), B(18, 22, "tavern", "drink", {days: [4]}), B(23, 6, "home", "sleep"), B(0, 24, "home", "rest")]},
  priest: {
    industrial: [B(7, 12, "church", "pray", {days: [6], label: "Sunday Masses"}), B(7, 12, "church", "pray", {feast: "only", label: "Feast-day Masses"}),
      B(7, 8, "church", "pray", {label: "Morning Mass"}), B(8, 12, "street", "errand", {label: "Parish rounds"}), B(12, 18, "home", "work", {label: "Parish work"}),
      B(18, 19, "church", "pray", {label: "Evening prayer"}), B(22, 6, "home", "sleep"), B(0, 24, "home", "rest")]},
  innkeeper: {
    industrial: [B(9, 10, "church", "pray", {days: [6], label: "Mass"}), B(10, 24, "tavern", "work"), B(0, 9, "home", "sleep"), B(0, 24, "home", "rest")],
    c20: [B(10, 23, "tavern", "work"), B(0, 9, "home", "sleep"), B(0, 24, "home", "rest")],
    modern: [B(11, 1, "tavern", "work", {label: "Open till late"}), B(1, 10, "home", "sleep"), B(0, 24, "home", "rest")]},
  neonate: {
    industrial: [B(0, 24, "haven", "sleep", {when: "day"}), B(21, 3, "street", "hunt", {when: "night", label: "Hunting the gaslit streets"}), B(0, 24, "haven", "rest", {when: "night"})],
    modern: [B(0, 24, "haven", "sleep", {when: "day"}), B(22, 4, "street", "hunt", {when: "night", label: "Clubs and late streets"}), B(0, 24, "haven", "rest", {when: "night"})]},
  hunter: {
    c20: [B(21, 3, "street", "hunt", {when: "night"}), B(8, 16, "work", "work", {days: monFri}), B(3, 7, "home", "sleep"), B(0, 24, "home", "rest")],
    modern: [B(21, 3, "street", "hunt", {when: "night"}), B(9, 17, "work", "work", {days: monFri}), B(3, 8, "home", "sleep"), B(0, 24, "home", "rest")]}
};
for ( const [k, ages] of Object.entries(LATER) ) if ( PRESETS[k] ) PRESETS[k].ages = {...ages};

/** Ready routines that begin in later ages. from: the first year the picker offers them. */
Object.assign(PRESETS, {
  student: {label: "Student", from: 1348, blocks: [
    B(7, 9, "church", "pray", {days: [6], label: "Mass"}), B(6, 11, "work", "work", {days: weekdays, feast: "not", label: "Lectures"}),
    B(13, 17, "work", "work", {days: weekdays, feast: "not", label: "Disputations and study"}), B(19, 22, "tavern", "drink", {days: [3, 4, 5]}),
    B(22, 5, "home", "sleep"), B(0, 24, "home", "rest")],
  ages: {modern: [B(9, 16, "work", "work", {days: monFri, label: "Lectures"}), B(20, 2, "tavern", "drink", {days: [3, 4, 5]}),
    B(2, 9, "home", "sleep"), B(23, 8, "home", "sleep"), B(0, 24, "home", "rest")]}},
  factory: {label: "Factory hand", from: 1800, blocks: LATER.labourer.industrial.map(b => (b.activity === "work" ? {...b, label: "The mill's twelve hours"} : b)),
    ages: {c20: LATER.labourer.c20, modern: [B(6, 14, "work", "work", {days: monFri, label: "The morning shift"}), B(18, 22, "tavern", "drink", {days: [4]}),
      B(22, 5, "home", "sleep"), B(0, 24, "home", "rest")]}},
  police: {label: "Police patrol", from: 1850, blocks: [
    B(18, 2, "street", "patrol", {label: "The evening beat"}), B(2, 4, "post", "patrol", {label: "At the station"}), B(4, 12, "home", "sleep"), B(0, 24, "home", "rest")]},
  clerk: {label: "Clerk or office worker", from: 1850, blocks: [
    B(9, 10, "church", "pray", {days: [6], label: "Mass"}), B(8, 18, "work", "work", {days: weekdays, feast: "not", label: "Office hours"}),
    B(19, 22, "tavern", "drink", {days: [4], label: "The coffee house"}), B(22, 7, "home", "sleep"), B(0, 24, "home", "rest")],
  ages: {c20: [B(8, 17, "work", "work", {days: monFri}), B(8, 12, "work", "work", {days: [5]}), B(19, 22, "tavern", "drink", {days: [4]}), B(23, 7, "home", "sleep"), B(0, 24, "home", "rest")],
    modern: [B(9, 17, "work", "work", {days: monFri}), B(19, 22, "tavern", "drink", {days: [4]}), B(23, 7, "home", "sleep"), B(0, 24, "home", "rest")]}},
  "night-shift": {label: "Night-shift worker", from: 1900, blocks: [
    B(22, 6, "work", "work", {days: monFri, label: "The night shift"}), B(7, 15, "home", "sleep"), B(0, 24, "home", "rest")]}
});

/**
 * NPC 0.18.0 (B825): the rival kinds' hours, and more people of the town. WoDX readings, house rules. Hours that
 * change with the age have an `ages` entry; the rest keep their first hours in every age.
 */
const night = {when: "night"}, day = {when: "day"};
Object.assign(PRESETS, {
  "sabbat-pack": {label: "Sabbat pack, runs at night", from: 1493, blocks: [
    B(0, 24, "haven", "sleep", day), B(19, 21, "haven", "pray", {...night, days: [6], label: "Ritae with the pack"}),
    B(21, 3, "street", "hunt", {...night, label: "Running with the pack"}), B(0, 24, "haven", "rest", night)],
  ages: {modern: [B(0, 24, "haven", "sleep", day), B(20, 22, "haven", "pray", {...night, days: [6], label: "Ritae with the pack"}),
    B(22, 4, "street", "hunt", {...night, label: "A war party in the streets"}), B(0, 24, "haven", "rest", night)]}},
  sheriff: {label: "Sheriff or enforcer, keeps the domain", blocks: [
    B(0, 24, "haven", "sleep", day), B(20, 24, "street", "patrol", {...night, label: "Rounds of the domain"}),
    B(0, 2, "court", "work", {...night, label: "Reports to the prince"}), B(2, 4, "street", "hunt", night), B(0, 24, "haven", "rest", night)]},
  tremere: {label: "Tremere, works in the chantry", blocks: [
    B(0, 24, "haven", "sleep", day), B(19, 3, "work", "work", {...night, label: "Study in the chantry"}),
    B(3, 5, "street", "hunt", night), B(0, 24, "haven", "rest", night)]},
  mage: {label: "Mage, sanctum and study", blocks: [
    B(8, 12, "home", "work", {label: "Study in the sanctum"}), B(14, 18, "work", "work", {days: weekdays, feast: "not", label: "A living in the town"}),
    B(21, 1, "home", "work", {days: [2, 5], label: "Workings by night"}), B(1, 8, "home", "sleep"), B(0, 24, "home", "rest")]},
  technocrat: {label: "Order of Reason, later the Technocracy", from: 1325, blocks: [
    B(6, 18, "work", "work", {days: weekdays, feast: "not", label: "The workshop and the guild"}), B(19, 21, "tavern", "drink", {days: [4]}),
    B(21, 6, "home", "sleep"), B(0, 24, "home", "rest")],
  ages: {c20: [B(8, 17, "work", "work", {days: monFri, label: "The office"}), B(22, 2, "street", "patrol", {days: [1, 3], label: "A night sweep"}),
    B(23, 7, "home", "sleep"), B(0, 24, "home", "rest")],
    modern: [B(9, 18, "work", "work", {days: monFri, label: "The office"}), B(22, 3, "street", "patrol", {days: [1, 3], label: "A night sweep"}),
      B(23, 7, "home", "sleep"), B(0, 24, "home", "rest")]}},
  changeling: {label: "Changeling, two lives", blocks: [
    B(8, 16, "work", "work", {days: weekdays, feast: "not", label: "A mortal living"}),
    B(20, 2, "tavern", "drink", {days: [4, 5], label: "At the freehold, or a revel"}), B(22, 7, "home", "sleep"), B(0, 24, "home", "rest")]},
  wraith: {label: "Wraith, stays by a fetter", blocks: [
    B(22, 4, "street", "wander", {...night, label: "Walks the old ways"}), B(0, 24, "home", "rest", {label: "By a fetter"})]},
  inquisitor: {label: "Inquisitor, questions by day and hunts by night", from: 1231, blocks: [
    B(6, 9, "church", "pray", {label: "Mass and the offices"}), B(9, 17, "street", "errand", {days: weekdays, label: "Questions in the town"}),
    B(21, 3, "street", "hunt", night), B(3, 6, "home", "sleep"), B(17, 21, "church", "pray"), B(0, 24, "home", "rest")],
  ages: {c20: [B(9, 17, "work", "work", {days: monFri, label: "The Society's work"}), B(21, 2, "street", "hunt", night), B(2, 8, "home", "sleep"), B(0, 24, "home", "rest")]}},
  soldier: {label: "Soldier or man-at-arms", blocks: [
    B(6, 12, "post", "patrol", {label: "Drill and the watch"}), B(12, 18, "post", "patrol", {days: weekdays}),
    B(18, 22, "tavern", "drink", {days: [4, 5]}), B(22, 6, "home", "sleep", {label: "In barracks"}), B(0, 24, "home", "rest", {label: "In barracks"})]},
  beggar: {label: "Beggar", blocks: [
    B(7, 12, "church", "work", {label: "Begging on the church steps"}), B(12, 18, "market", "work", {label: "Begging in the market"}),
    B(18, 21, "tavern", "wander", {label: "Scraps at the inn door"}), B(21, 7, "street", "sleep", {label: "Sleeps rough"}), B(0, 24, "street", "rest")]},
  noble: {label: "Noble, holds court", blocks: [
    B(8, 10, "church", "pray", {days: [6], label: "Mass"}), B(10, 14, "court", "work", {label: "Holds court"}),
    B(14, 18, "wilds", "wander", {days: [2, 4], label: "The hunt"}), B(18, 22, "court", "rest", {label: "Feasting"}),
    B(22, 8, "home", "sleep"), B(0, 24, "home", "rest")],
  ages: {c20: [B(9, 17, "work", "work", {days: monFri, label: "Estates and business"}), B(19, 23, "tavern", "drink", {days: [4]}),
    B(23, 8, "home", "sleep"), B(0, 24, "home", "rest")]}},
  monk: {label: "Monk or nun (the cloister's hours)", blocks: [
    B(2, 3, "church", "pray", {label: "Matins and Lauds"}), B(6, 7, "church", "pray", {label: "Prime"}),
    B(7, 12, "work", "work", {label: "Labour in the cloister"}), B(12, 13, "church", "pray", {label: "Sext"}),
    B(13, 17, "work", "work", {label: "Study and copying"}), B(17, 18, "church", "pray", {label: "Vespers"}),
    B(19, 20, "church", "pray", {label: "Compline"}), B(20, 2, "home", "sleep"), B(3, 6, "home", "sleep"), B(0, 24, "home", "rest")]}
});
Object.assign(DEFAULT_PRESET, {sabbat: "sabbat-pack", sheriff: "sheriff", mage: "mage", technocrat: "technocrat", changeling: "changeling",
  inquisitor: "inquisitor", soldier: "soldier", ghost: "wraith"});

/* ------------------------------------------------------------------ */
/*  Which block is current                                             */
/* ------------------------------------------------------------------ */

const allDay = b => b.from === b.to || (b.from === 0 && b.to === 24);
const wraps = b => !allDay(b) && b.from > b.to;
/** Is the hour inside the block's hours? */
export function hourIn(b, hour) {
  if ( allDay(b) ) return true;
  return wraps(b) ? (hour >= b.from || hour < b.to) : (hour >= b.from && hour < b.to);
}

/** The block in force at a world time, and its index: {block, index} or null. */
export function blockAt(blocks, time, describe) {
  const d = describe(time);
  let yesterday = null;
  for ( let i = 0; i < (blocks?.length ?? 0); i++ ) {
    const b = blocks[i];
    if ( !hourIn(b, d.hour) ) continue;
    // The part of a block after midnight belongs to the day it started on
    const day = wraps(b) && d.hour < b.to ? (yesterday ??= describe(time - 86400)) : d;
    if ( Array.isArray(b.days) && b.days.length && !b.days.includes(day.dayOfWeek) ) continue;
    if ( b.feast === "only" && !day.feast ) continue;
    if ( b.feast === "not" && day.feast ) continue;
    if ( b.when === "day" && d.isNight ) continue;
    if ( b.when === "night" && !d.isNight ) continue;
    return {block: b, index: i};
  }
  return null;
}

/** Every change of block between two world times, checked every `step` seconds: [{time, index, block}]. */
export function changesBetween(blocks, from, to, describe, step = 600) {
  const out = [];
  let last = blockAt(blocks, from, describe)?.index ?? -1;
  for ( let t = from + step; t <= to; t += step ) {
    const now = blockAt(blocks, t, describe);
    const k = now?.index ?? -1;
    if ( k !== last ) { out.push({time: t, index: k, block: now?.block ?? null}); last = k; }
  }
  return out;
}

/** Check a block list a person typed: returns a list of problems (empty when fine). */
export function checkBlocks(blocks) {
  const bad = [];
  (blocks ?? []).forEach((b, i) => {
    const n = i + 1;
    if ( !Number.isInteger(b.from) || b.from < 0 || b.from > 24 ) bad.push(`Block ${n}: "from" must be a whole hour, 0 to 24`);
    if ( !Number.isInteger(b.to) || b.to < 0 || b.to > 24 ) bad.push(`Block ${n}: "to" must be a whole hour, 0 to 24`);
    if ( !b.place ) bad.push(`Block ${n} has no place`);
    if ( !ACTIVITIES[b.activity] ) bad.push(`Block ${n} has no activity`);
  });
  return bad;
}

/* ------------------------------------------------------------------ */
/*  Places                                                             */
/* ------------------------------------------------------------------ */

const hash = s => { let h = 2166136261; for ( const c of String(s) ) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/**
 * The place a block sends an NPC to. ctx: {places: [{id, kind}], roles: {role: placeId}, seed (the actor's id),
 * domitorPlace (the domitor's current place, for "domitor")}.
 * A role the NPC has set wins; else a place of a fitting kind, the same one for the same NPC each time.
 * Returns {place, missing}: missing names a role whose place no longer exists.
 */
export function resolvePlace(block, {places = [], roles = {}, seed = "", domitorPlace = null} = {}) {
  if ( !block?.place ) return {place: null, missing: null};
  const ids = new Set(places.map(p => p.id));
  const p = block.place;
  if ( ids.has(p) ) return {place: p, missing: null};
  if ( p === "domitor" ) {
    if ( domitorPlace && ids.has(domitorPlace) ) return {place: domitorPlace, missing: null};
    return resolvePlace({...block, place: "haven"}, {places, roles, seed});
  }
  let missing = null;
  if ( roles?.[p] ) {
    if ( ids.has(roles[p]) ) return {place: roles[p], missing: null};
    missing = p;
  }
  if ( !ROLES[p] && !missing ) missing = p; // a place id that was deleted
  for ( const k of ROLES[p]?.kinds ?? [] ) {
    const cands = places.filter(x => x.kind === k).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if ( cands.length ) return {place: cands[hash(`${seed}:${p}`) % cands.length].id, missing};
  }
  return {place: null, missing};
}

/** Where a routine puts an NPC at a time: {place, block, index, missing}. */
export function placeAt(blocks, time, describe, ctx) {
  const hit = blockAt(blocks, time, describe);
  if ( !hit ) return {place: null, block: null, index: -1, missing: null};
  return {...resolvePlace(hit.block, ctx), block: hit.block, index: hit.index};
}

const TITLES = /^(captain|father|brother|sister|master|mistress|richter|baba|old|young|sir|lady|lord|dame|frau|herr|mother|the)$/i;
const strip = s => String(s ?? "").replace(/^⚔\s*BATTLEMAP\s*·\s*/u, "");
/**
 * A first guess at a place from a scene's name: {kind, owner}. Rothenstein names its private rooms "Trespass · X's ..."
 * and its trades "Workplace · ...". Story scenes (encounters, sessions) are left untagged.
 */
export function guessPlace(name) {
  const n = strip(name);
  if ( /^(encounter|sessio)\b/i.test(n) ) return {kind: "", owner: ""};
  const own = /([A-ZÀ-Ž][\p{L}'-]+(?:\s+[A-ZÀ-Ž][\p{L}-]+)?)['’]s\b/u.exec(n);
  const owner = own ? own[1] : "";
  const rules = [
    [/\b(lair|haven)\b/i, "haven"],
    [/\b(watch-house|barracks|gate|toll-post|guardhouse)\b/i, "gate"],
    [owner ? /\b(house|room|rooms|chambers|cabin|cottage|presbytery|quarters|home)\b/i : /\b(cottage|house)\b/i, "home"],
    [/\b(church|chapel|cathedral|churchyard|cloister|scriptorium|hermitage|abbey|monastery|church close)\b/i, "church"],
    [/\b(tavern|inn|alehouse|brewhouse)\b/i, "tavern"],
    [/\b(keep|castle|bailey|great hall|ward|undercroft)\b/i, "castle"],
    [/\b(market|square)\b/i, "market"],
    [/\b(caern)\b/i, "caern"],
    [/\b(forest|woods?|grove|clearing|fields?|trail|mountain|ashfield|ruins|meadow|moor|marsh|adit|camp)\b/i, "wilds"],
    [/\b(lane|street|road|quay|close|common|ford|cross|ferry)\b/i, "street"],
    [/\b(bakery|shop|workshop|store|warehouse|mill|tannery|laboratory|smithy|stables|wellhouse)\b/i, "workplace"]
  ];
  for ( const [re, kind] of rules ) if ( re.test(n) ) return {kind, owner};
  if ( /^workplace\b/i.test(n) ) return {kind: "workplace", owner};
  if ( /^trespass\b/i.test(n) ) return {kind: "home", owner};
  return {kind: "", owner};
}

/** Does an owner's name (from a place's title) fit an actor's name? "Captain Ondrej" fits "Ondrej of the Watch". */
export function ownerMatches(owner, actorName) {
  const words = String(owner ?? "").split(/\s+/).filter(w => w.length >= 3 && !TITLES.test(w)).map(w => w.toLowerCase());
  if ( !words.length ) return false;
  const have = new Set(String(actorName ?? "").toLowerCase().split(/[^\p{L}'-]+/u));
  return words.every(w => have.has(w));
}

/* ------------------------------------------------------------------ */
/*  Feast days and the curfew                                          */
/* ------------------------------------------------------------------ */

/* The church calendar lives in WoDX Chronicle (feast and fast days); the routines read the same feasts. */
export {easterJDN, FIXED_FEASTS, MOVABLE_FEASTS, parseFeasts, feastOn} from "../../wodx-chronicle/scripts/church-rules.mjs";

/** Curfew: from the start hour until dawn (decision B85: about 21:00 to dawn). */
export function isCurfew({hour, minute = 0, isNight}, start = 21) {
  const h = hour + minute / 60;
  return h >= start || (!!isNight && h < 12);
}

/* ------------------------------------------------------------------ */
/*  Reactions                                                          */
/* ------------------------------------------------------------------ */

export const TRIGGERS = {enter: "Entering", leave: "Leaving", stay: "Staying"};
export const CONDITIONS = {night: "At night", curfew: "During the curfew", trespass: "Trespass (a private place)",
  weapon: "A weapon in hand", supernatural: "The supernatural shown openly"};
export const RESPONSES = {challenge: "Challenge them", alarm: "Raise the alarm", send: "Send for help", flee: "Flee", fight: "Fight", ignore: "Let it pass"};
/** Responses WoDX can carry out by itself in Auto; a fight waits for the Storyteller unless fights start by themselves. */
export const SELF_RESPONSES = ["challenge", "alarm", "send", "flee", "ignore"];

/** Which of a region's conditions hold. sit: {night, curfew, trespass, weapon, supernatural}. No conditions: always. */
export function conditionsMet(conds, sit, match = "any") {
  const list = (conds ?? []).filter(c => CONDITIONS[c]);
  if ( !list.length ) return {met: true, which: []};
  const which = list.filter(c => !!sit[c]);
  return {met: match === "all" ? which.length === list.length : which.length > 0, which};
}

/** Successes on a roll of dice d10s against a difficulty, with 1s cancelling (V20). rng: () => [0, 1). */
export function rollSuccesses(pool, diff, rng = Math.random) {
  const dice = Array.from({length: Math.max(0, pool)}, () => 1 + Math.floor(rng() * 10));
  const hits = dice.filter(d => d >= diff).length, ones = dice.filter(d => d === 1).length;
  return {dice, successes: hits - ones, botch: hits === 0 && ones > 0};
}

/**
 * Auspex against Obfuscate, by the era's book. Returns {result: "sees" | "roll" | "contest" | "blind", diff, why}.
 *   V20 (p. 142, the "Seeing the Unseen" sidebar): Auspex higher, Perception + Awareness at 7 minus the difference;
 *     Obfuscate higher, unseen; equal, a resisted roll at 7, Perception + Awareness against Manipulation + Subterfuge.
 *   V20 Dark Ages (p. 195, "See the Unseen"): Auspex equal or higher, Perception + Awareness at 8 minus 1 a dot above;
 *     Obfuscate higher, unseen. No resisted roll.
 * Pages are printed pages. A mortal without Auspex cannot find an Obfuscated vampire by Awareness alone (both books).
 */
export function pierce(auspex, obfuscate, book = "v20da") {
  const a = Number(auspex) || 0, o = Number(obfuscate) || 0;
  if ( o <= 0 ) return {result: "sees", diff: null, why: "not hidden by Obfuscate"};
  if ( a <= 0 || a < o ) return {result: "blind", diff: null, why: `Obfuscate ${o} against Auspex ${a}: unseen`};
  if ( book === "v20" ) {
    if ( a === o ) return {result: "contest", diff: 7, why: `Auspex ${a} equals Obfuscate ${o}: a resisted roll (V20 p. 142)`};
    return {result: "roll", diff: Math.max(2, 7 - (a - o)), why: `Auspex ${a} over Obfuscate ${o} (V20 p. 142)`};
  }
  return {result: "roll", diff: Math.max(2, 8 - (a - o)), why: `Auspex ${a} against Obfuscate ${o} (V20 Dark Ages p. 195)`};
}

/**
 * Does a watcher notice an intruder? Pure: the caller says what the watcher can see.
 *   watcher: {perception, alertness, awareness, auspex, awake, inSight}
 *   intruder: {dexterity, stealth, manipulation, subterfuge, sneaking, obfuscate (0 when not using it)}
 *   book: "v20" or "v20da" (the era's)
 * Sneaking (V20 Dark Ages p. 169): Dexterity + Stealth against Perception + Alertness, the watcher needing more
 * successes. An intruder in plain sight within view is seen.
 * Returns {noticed, why, rolls}.
 */
export function notice(watcher, intruder, {rng = Math.random, diff = 6, book = "v20da"} = {}) {
  if ( !watcher.awake ) return {noticed: false, why: "asleep"};
  if ( !watcher.inSight ) return {noticed: false, why: "out of sight"};
  if ( (intruder.obfuscate ?? 0) > 0 ) {
    const p = pierce(watcher.auspex, intruder.obfuscate, book);
    if ( p.result === "blind" ) return {noticed: false, why: p.why};
    const w = rollSuccesses((watcher.perception ?? 0) + (watcher.awareness ?? 0), p.diff, rng);
    if ( p.result === "contest" ) {
      const i = rollSuccesses((intruder.manipulation ?? 0) + (intruder.subterfuge ?? 0), p.diff, rng);
      return {noticed: w.successes > i.successes, why: `${p.why}: ${w.successes} against ${i.successes}`, rolls: {w, i}};
    }
    return {noticed: w.successes > 0, why: `${p.why}: Perception + Awareness at ${p.diff}, ${w.successes} success${w.successes === 1 ? "" : "es"}`, rolls: {w}};
  }
  if ( !intruder.sneaking ) return {noticed: true, why: "in plain sight"};
  const w = rollSuccesses((watcher.perception ?? 0) + (watcher.alertness ?? 0), diff, rng);
  const i = rollSuccesses((intruder.dexterity ?? 0) + (intruder.stealth ?? 0), diff, rng);
  return {noticed: w.successes > i.successes,
    why: `Perception + Alertness ${w.successes} against Dexterity + Stealth ${i.successes} (V20 Dark Ages p. 169)`, rolls: {w, i}};
}

/**
 * What a watcher does about what it noticed, scored from its 7b profile. sit:
 *   {supernatural, weapon, trespass, curfew, night, alliesNear, intruderKind, watcherKind, homeGround}
 * Returns [{action, score, why}] best first.
 */
export function pickReaction(profile, sit) {
  const p = profile, out = [], tac = p.tactics ?? [], fears = p.fears ?? [];
  const afraid = (sit.supernatural && fears.includes("supernatural")) || (sit.weapon && fears.includes("violence"));
  const amiss = [sit.curfew && "abroad in the curfew", sit.trespass && "trespassing", sit.weapon && "weapon drawn", sit.supernatural && "the supernatural shown"].filter(Boolean);
  const keeper = ["guard", "ghoul", "elder"].includes(p.template) || tac.includes("guard") || (tac.includes("call") && p.loyalty >= 1);
  if ( keeper ) {
    let sc = 2 + p.loyalty + (sit.curfew ? 1.5 : 0) + (sit.trespass ? 1.5 : 0) - (sit.weapon ? 0.5 : 0) - (afraid ? 3 : 0);
    out.push({action: "challenge", score: sc, why: amiss.length ? `keeps order here: ${amiss.join(", ")}` : "keeps order here"});
  }
  {
    const sc = 0.5 + p.caution + (sit.supernatural ? 2 : 0) + (sit.weapon ? 1 : 0) + (sit.alliesNear ? 0.5 : 0) + (afraid ? 1 : 0);
    out.push({action: "alarm", score: sc, why: sit.alliesNear ? `${sit.alliesNear} others within call` : "shouts for anyone near"});
  }
  if ( tac.includes("call") || keeper ) {
    out.push({action: "send", score: 0.5 + p.loyalty + ((sit.supernatural || sit.weapon) ? 1.5 : 0) - (sit.alliesNear ? 0.5 : 0), why: "sends for the watch"});
  }
  {
    const sc = (amiss.length ? p.cowardice * 1.5 : 0) + (afraid ? 3 + p.caution : 0);
    const r = [afraid && "faces what it fears", amiss.length && p.cowardice >= 1 && "not one to stand"].filter(Boolean);
    if ( r.length ) out.push({action: "flee", score: sc, why: r.join("; ")});
  }
  {
    let sc = 2 * p.aggression - 2 + (sit.weapon ? p.aggression : 0) + (sit.homeGround && sit.trespass ? 1.5 : 0) - (afraid ? 4 : 0);
    const r = [sit.weapon && "a blade is out", sit.homeGround && sit.trespass && "on its own ground"].filter(Boolean);
    if ( tac.includes("supernatural") && sit.supernatural ) { sc += 3 + p.aggression; r.push("a hunter goes for the monster"); }
    out.push({action: "fight", score: sc, why: r.length ? r.join("; ") : "picks a fight"});
  }
  out.push({action: "ignore", score: amiss.length ? 0.2 : 3, why: amiss.length ? "looks away" : "nothing amiss"});
  return out.sort((a, b) => b.score - a.score).map(o => ({...o, score: Math.round(o.score * 10) / 10}));
}

/** Auto carries out the best response it can by itself; a fight stops it and waits for the Storyteller. */
export function autoReaction(options, {fightOk = false} = {}) {
  const top = options[0];
  if ( !top ) return {act: null};
  // NPC 0.15.0: a fight is carried out too when WoDX Combat starts fights by themselves (Auto)
  return SELF_RESPONSES.includes(top.action) || (fightOk && top.action === "fight") ? {act: top} : {act: null, needsStoryteller: top};
}
