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

import {ANIMAL_PRESETS, ANIMAL_DEFAULT_PRESET} from "./animal-rules.mjs";
import {MORTAL_PRESETS, MORTAL_DEFAULT_PRESET} from "./mortal-rules.mjs";
import {SUPERNATURAL_PRESETS, SUPERNATURAL_DEFAULT_PRESET} from "./supernatural-rules.mjs";

export const ACTIVITIES = {
  sleep: "Sleeping", rest: "At rest", work: "At work", pray: "At prayer", drink: "Drinking", patrol: "On watch",
  hunt: "Hunting", hide: "In hiding", errand: "On errands", attend: "Attending their master", wander: "Out and about",
  graze: "Grazing", roost: "Roosting"
};

/** Kinds of place a scene, or a region inside one, can be tagged with. */
export const PLACE_KINDS = {
  home: "Home", workplace: "Workplace or shop", church: "Church, chapel or another house of worship", mosque: "Mosque",
  synagogue: "Synagogue or prayer house", temple: "Temple, pagoda or monastery of the faiths of Asia", tavern: "Tavern or inn",
  haven: "Haven (a Cainite's resting place)", gate: "Gate, watch-house or barracks", market: "Market or square",
  street: "Street, lane or road", castle: "Castle, keep or court", wilds: "Woods, fields or wilds", caern: "Caern or sacred site",
  alley: "Back alley or courtyard", yard: "Farmyard, stable or village", docks: "Docks or riverside", park: "Park, garden or churchyard",
  sewer: "Sewer, cellar or tunnels", hospital: "Hospital or asylum", station: "Station or depot",
  elysium: "Elysium (the Prince's neutral ground)", chantry: "Chantry or Horizon (a mage's stronghold)",
  // B3555: places that weigh on the faerie soul (WoDX Actions everyday Banality)
  office: "Office, counting house or bureau", courthouse: "Court of law, town hall or council chamber", technocracy: "Technocracy site (a Construct, a lab)",
  other: "Other"
};

/**
 * NPC 0.50.0 (B2662): a house of worship of each faith has a kind of its own. The "church" role finds the faith's own
 * kind first, then a place tagged plainly as a church (as every house of worship was before). Other modules that know
 * only "church" read baseKind.
 */
export const WORSHIP_KINDS = ["church", "mosque", "synagogue", "temple"];
export const WORSHIP_KIND = {western: "church", orthodox: "church", islamic: "mosque", jewish: "synagogue", hindu: "temple",
  theravada: "temple", tibetan: "temple", chinese: "temple", own: "temple"};
export const isWorship = kind => WORSHIP_KINDS.includes(kind);
export const baseKind = kind => (isWorship(kind) ? "church" : kind);
/** The kinds of place the church role looks for, for a faith. */
export const worshipKinds = faith => [...new Set([WORSHIP_KIND[faith] ?? "church", "church"])];

/** The roles a routine block can name, and the kinds of place each falls back to when the NPC has none set. */
export const ROLES = {
  home: {label: "Home", kinds: ["home"]},
  work: {label: "Workplace", kinds: ["workplace", "market"]},
  church: {label: "Church or house of worship", kinds: ["church"]},
  tavern: {label: "Tavern", kinds: ["tavern"]},
  haven: {label: "Haven", kinds: ["haven", "home"]},
  post: {label: "Watch post", kinds: ["gate", "castle"]},
  market: {label: "Market", kinds: ["market", "street"]},
  street: {label: "The streets", kinds: ["street", "market"]},
  court: {label: "Court", kinds: ["castle"]},
  wilds: {label: "The wilds", kinds: ["wilds", "caern"]},
  domitor: {label: "With their domitor", kinds: []},
  // NPC 0.21.0 (B1002): places animals keep
  yard: {label: "The yard", kinds: ["yard", "home"]},
  alley: {label: "Back alleys", kinds: ["alley", "street"]},
  sewer: {label: "Sewers and cellars", kinds: ["sewer", "alley"]},
  docks: {label: "The riverside", kinds: ["docks", "street"]},
  park: {label: "Parks and churchyards", kinds: ["park", "church", "wilds"]},
  hospital: {label: "Hospital or asylum", kinds: ["hospital", "workplace"]},
  caern: {label: "The caern", kinds: ["caern", "wilds"]}
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
/** The routine each 7b template starts from. Spirits and the plain beast have none; the animal archetypes keep their own (animal-rules). */
export const DEFAULT_PRESET = {guard: "night-watch", civilian: "labourer", ghoul: "ghoul", neonate: "neonate", elder: "elder", garou: "garou", hunter: "hunter"};

/**
 * The blocks an NPC follows. Their own blocks win as they stand; a ready routine follows the year, and from NPC
 * 0.49.0 (B2572) the faith its people keep (keep: {faith, region}, see forFaith below).
 */
export const blocksOf = (routine, template, year = null, keep = null, {prayers = true} = {}) => {
  const y = Number(year) || 0;
  if ( Array.isArray(routine?.blocks) && routine.blocks.length ) {
    // NPC 0.50.0: the Storyteller's own hours stand; the five prayers are laid over them only when asked for
    if ( !prayers || routine?.prayers !== "five" || NO_WEEK.has(template) ) return routine.blocks;
    if ( keep?.faith === "islamic" ) return withPrayers(routine.blocks, {...keep, year: y});
    return DAILY_WORSHIP[keep?.faith] ? withWorship(routine.blocks, keep.faith) : routine.blocks;
  }
  const key = PRESETS[routine?.preset] ? routine.preset : DEFAULT_PRESET[template];
  const blocks = presetBlocks(key, routine?.age || ageOf(year));
  if ( !keep?.faith || NO_WEEK.has(template) ) return blocks;
  const turned = forFaith(blocks, {...keep, year: y});
  if ( !prayers ) return turned;
  // NPC 0.65.0 (B2980): the other faiths' daily worship, as the five prayers
  if ( keep.faith !== "islamic" ) return keepsWorship(routine?.prayers, keep.faith, keep.region, y) ? withWorship(turned, keep.faith) : turned;
  if ( !keepsPrayers(routine?.prayers, keep.region, y) ) return turned;
  return withPrayers(turned, {...keep, year: y});
};

/* ------------------------------------------------------------------ */
/*  Routines by faith (NPC 0.49.0, B2572)                              */
/* ------------------------------------------------------------------ */

/**
 * The ready routines were written for a Western Christian town: Mass on Sunday, a working week of Monday to
 * Saturday, the canonical hours for the clergy. A people who keep another faith (WoDX Chronicle's faith-rules: the
 * region's, or the scene's own) get the same hours turned to their week:
 *
 *   rest day   Sunday for the churches, Friday for Islam (the noon prayer at the great mosque), the Sabbath for the
 *              Jewish year; the faiths of India, China, Tibet and Southeast Asia keep no weekly day of rest, so their
 *              working week runs every day and the weekly worship moves to the holy days (the moon days of the
 *              Buddhist south, the temple feasts), until the Sunday week took hold there (SUNDAY_FROM)
 *   the week   the whole week turns with the rest day, so the night out and the short day fall on its eve
 *   words      Mass becomes Friday prayer, the Sabbath service, the temple; the clergy's offices become the
 *              prayers of that faith
 *
 * Kindred, Garou and the other night folk keep their own hours and are left as they are. A house reading, rounded for
 * play; the books give no such table.
 */
const NO_WEEK = new Set(["neonate", "elder", "garou", "spirit", "beast"]);

/** The year the Sunday week (the government's and the schools' day off) took hold in a region whose faith has none,
 *  or turned a Friday land to Sunday (Turkey in 1935, Soviet Central Asia in 1924, the Dutch Indies, the colonies). */
export const SUNDAY_FROM = {
  "india": 1843, "china": 1912, "japan": 1876, "korea": 1895, "southeast-asia": 1899, "tibet-himalaya": 1959,
  "nusantara": 1800, "west-africa": 1900, "east-africa": 1900, "anatolia": 1935, "central-asia": 1924, "antarctica": 1899
};
/** The weekday (0 Monday ... 6 Sunday) a faith rests and worships in a region and year, or null for none. */
export function restDay(faith, region = null, year = 0) {
  const y = Number(year) || 0, sun = SUNDAY_FROM[region];
  if ( faith === "western" || faith === "orthodox" ) return 6;
  if ( faith === "jewish" ) return 5;
  if ( sun && y >= sun ) return 6;
  if ( faith === "islamic" ) return 4;
  return null;
}

/** The weekday a faith gathers to worship (whatever day the state rests): null for the faiths with no weekly day. */
export const holyDay = faith => ({western: 6, orthodox: 6, islamic: 4, jewish: 5})[faith] ?? null;

/** What weekly worship, feast-day worship and the clergy's offices are called in each faith. */
const WORDS = {
  orthodox: {week: "The Divine Liturgy", feast: "The Liturgy of the feast", offices: {"Matins and Lauds": "Matins", "Mass and the offices": "The Liturgy and the hours"}},
  islamic: {week: "Friday prayer at the great mosque", feast: "The prayer of the feast", hours: [12, 14],
    offices: {"Matins and Lauds": "The dawn prayer", "Prime": "Lessons after the dawn prayer", "Sext": "The noon prayer",
      "Vespers": "The sunset prayer", "Vespers to Compline, dusk to the late bell": "The sunset and night prayers",
      "The office": "Prayer and teaching", "Parish work": "The mosque's work", "Parish rounds": "Rounds of the quarter",
      "Mass and the offices": "Friday prayer and the sermon"}},
  jewish: {week: "The Sabbath service", feast: "Prayers of the festival",
    offices: {"Matins and Lauds": "Morning prayer", "Prime": "Study", "Sext": "Afternoon prayer", "Vespers": "Evening prayer",
      "Vespers to Compline, dusk to the late bell": "Evening prayer and study", "Parish work": "The congregation's work",
      "Parish rounds": "Visits in the quarter", "Mass and the offices": "The Sabbath service and study"}},
  hindu: {week: "At the temple", feast: "At the temple for the festival",
    offices: {"Matins and Lauds": "Dawn worship", "Prime": "Recitation", "Sext": "The noon offering", "Vespers": "The evening lamps",
      "Vespers to Compline, dusk to the late bell": "The evening lamps and the last worship", "Parish work": "The temple's work",
      "Parish rounds": "Rites in the households", "Mass and the offices": "The temple's great worship"}},
  theravada: {week: "At the monastery", feast: "At the monastery on the moon day",
    offices: {"Matins and Lauds": "Morning chanting", "Prime": "The alms round", "Sext": "The last meal before noon",
      "Vespers": "Evening chanting", "Vespers to Compline, dusk to the late bell": "Evening chanting and sitting",
      "Parish work": "The monastery's work", "Parish rounds": "Teaching in the villages", "Mass and the offices": "The moon day's teaching"}},
  tibetan: {week: "At the monastery", feast: "At the monastery for the festival",
    offices: {"Matins and Lauds": "Morning prayers in the assembly hall", "Prime": "Debate in the courtyard", "Sext": "The noon assembly",
      "Vespers": "Evening prayers", "Vespers to Compline, dusk to the late bell": "Evening prayers and study",
      "Parish work": "The monastery's work", "Parish rounds": "Rites in the households", "Mass and the offices": "The great assembly"}},
  chinese: {week: "Offerings at the temple", feast: "At the temple for the festival",
    offices: {"Matins and Lauds": "Morning recitation", "Prime": "Study of the classics", "Sext": "The noon offering",
      "Vespers": "Evening recitation", "Vespers to Compline, dusk to the late bell": "Evening recitation",
      "Parish work": "The temple's work", "Parish rounds": "Rites in the households", "Mass and the offices": "The temple's great rite"}},
  own: {week: "At the holy place", feast: "At the holy place for the festival",
    offices: {"Matins and Lauds": "The dawn rite", "Vespers": "The evening rite", "Parish work": "The keeper's work",
      "Parish rounds": "Rites in the households", "Mass and the offices": "The great rite"}}
};
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MASS = /^(sunday |feast-day )?mass(es)?$/i;

/** A ready routine's blocks turned to a faith's week. keep: {faith, region, year}. The Western church: unchanged. */
export function forFaith(blocks, {faith = "western", region = null, year = 0} = {}) {
  if ( !faith || faith === "western" || !Array.isArray(blocks) ) return blocks;
  const rest = restDay(faith, region, year), words = WORDS[faith] ?? {}, shift = rest === null ? 0 : rest - 6;
  const turn = d => (((d + shift) % 7) + 7) % 7;
  const dayWords = label => (shift ? label.replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g, w => DAY_NAMES[turn(DAY_NAMES.indexOf(w))]) : label);
  return blocks.map(b => {
    const out = {...b}, days = Array.isArray(b.days) && b.days.length ? b.days : null;
    const worship = b.place === "church" && b.activity === "pray";
    const weekly = worship && days?.length === 1 && days[0] === 6;
    const holy = holyDay(faith);
    if ( weekly && holy === null ) Object.assign(out, {days: null, feast: "only"});
    else if ( weekly ) out.days = [holy];
    else if ( days && rest === null ) { if ( days.length >= 5 ) out.days = null; }
    else if ( days && shift ) out.days = days.map(turn);
    if ( weekly && holy !== null && words.hours ) [out.from, out.to] = words.hours;
    const lab = String(b.label ?? "");
    if ( worship && (weekly || MASS.test(lab)) ) out.label = (weekly && holy !== null) ? (words.week ?? lab) : (words.feast ?? lab);
    else if ( words.offices?.[lab] ) out.label = words.offices[lab];
    else out.label = dayWords(lab);
    if ( faith === "islamic" && b.activity === "drink" && !lab ) out.label = Number(year) >= 1550 ? "The coffee house" : "With friends at the bathhouse";
    return out;
  });
}

/**
 * The faith a person's origin points to where it differs from the land's (WoDX Creation's origins): a Jewish
 * household in Brno keeps the Sabbath, an Arab family in Iberia Friday prayer, a Greek one in Venice the Liturgy.
 * null: they keep the faith of the place.
 */
const ORIGIN_FAITH = {jewish: "jewish", arabic: "islamic", turkish: "islamic", persian: "islamic", greek: "orthodox", russian: "orthodox",
  serbian: "orthodox", romanian: "orthodox", armenian: "orthodox", tamil: "hindu", hindi: "hindu", tibetan: "tibetan", chinese: "chinese"};
export const originFaith = origin => ORIGIN_FAITH[String(origin ?? "").toLowerCase()] ?? null;

/* ------------------------------------------------------------------ */
/*  The five daily prayers and Ramadan (NPC 0.50.0, B2660 to B2661)    */
/* ------------------------------------------------------------------ */

/**
 * A Muslim NPC on a ready routine stops for the five prayers wherever they are: at dawn before sunrise, after noon,
 * in the afternoon, after sunset and at nightfall. Each takes twenty minutes. The prayer leader (any routine with
 * daily prayers at the house of worship) leads all five at the mosque. On Friday the noon prayer is the Friday prayer
 * the week already holds. In Ramadan a meal before dawn, the fast broken at sunset, the night prayers at the mosque
 * and a late night out come on top; daytime drinking with friends waits for the night.
 *
 * A block laid on the sun: sun is "sunrise", "noon", "afternoon" or "sunset" and off the minutes from it [start, end].
 * The sun's times are the Chronicle's for the day (they move with the season and the latitude); where the sun does
 * not rise or set, 06:00 and 18:00 stand in. from and to stay as whole hours for the routine window. A block whose
 * place is "same" keeps the NPC where the next fitting block puts them.
 *
 * Under the Soviet campaign against religion (Central Asia, 1929 to 1990) the prayers are not kept by default.
 * A house reading of when the prayers fall, rounded for play; the books give no prayer table.
 */
export const PRAYERS = [
  {key: "dawn", sun: "sunrise", off: [-80, -60], from: 5, to: 6, label: "The dawn prayer"},
  {key: "noon", sun: "noon", off: [10, 30], from: 12, to: 13, label: "The noon prayer", days: [0, 1, 2, 3, 5, 6]},
  {key: "afternoon", sun: "afternoon", off: [0, 20], from: 15, to: 16, label: "The afternoon prayer"},
  {key: "sunset", sun: "sunset", off: [5, 25], from: 18, to: 19, label: "The sunset prayer"},
  {key: "night", sun: "sunset", off: [90, 110], from: 20, to: 21, label: "The night prayer"}
];
export const RAMADAN = [
  {key: "suhur", sun: "sunrise", off: [-140, -85], from: 3, to: 4, place: "home", activity: "rest", label: "The meal before dawn"},
  {key: "iftar", sun: "sunset", off: [0, 85], from: 18, to: 19, place: "home", activity: "rest", label: "Breaking the fast"},
  {key: "tarawih", sun: "sunset", off: [115, 190], from: 20, to: 22, place: "church", activity: "pray", label: "The night prayers of Ramadan"},
  {key: "night-out", sun: "sunset", off: [190, 300], from: 22, to: 24, place: "street", activity: "wander", label: "Out in the Ramadan night"}
];
/** Years a region's Muslims do not keep the prayers openly by default: [from, to]. */
export const PRAYERS_HIDDEN = {"central-asia": [[1929, 1990]]};
export const PRAYER_MODES = {"": "As their faith and land keep", five: "Kept (the five prayers and Ramadan for Islam, the daily services or rites of other faiths)", none: "Not kept"};
/** Are the prayers kept? mode: the routine's own pick ("five", "none" or none). */
export function keepsPrayers(mode, region = null, year = 0) {
  if ( mode === "five" ) return true;
  if ( mode === "none" ) return false;
  const y = Number(year) || 0;
  return !(PRAYERS_HIDDEN[region] ?? []).some(([a, b]) => y >= a && y <= b);
}
const leads = blocks => blocks.some(b => b.place === "church" && b.activity === "pray" && !b.days?.length && b.feast !== "only" && !b.sun);
/** The prayer and Ramadan blocks laid over a routine's blocks (the prayers first, so they win). */
export function withPrayers(blocks, {year = 0} = {}) {
  if ( !Array.isArray(blocks) ) return blocks;
  const leader = leads(blocks);
  const B0 = {when: "any", days: null, feast: "any"};
  const pray = PRAYERS.map(p => ({...B0, from: p.from, to: p.to, sun: p.sun, off: [...p.off], days: p.days ? [...p.days] : null,
    place: leader ? "church" : "same", activity: "pray", label: leader ? `Leads ${p.label.replace(/^The /, "the ")}` : p.label, prayer: p.key}));
  const fast = RAMADAN.map(p => ({...B0, from: p.from, to: p.to, sun: p.sun, off: [...p.off], place: p.place, activity: p.activity, ramadan: "only",
    label: leader && p.key === "tarawih" ? "Leads the night prayers of Ramadan" : p.label, prayer: p.key}));
  const rest = blocks.map(b => (b.activity === "drink" && !b.ramadan ? {...b, ramadan: "not"} : b));
  return [...pray, ...fast, ...rest];
}
/* ------------------------------------------------------------------ */
/*  Daily worship of the other faiths (NPC 0.65.0, B2980 to B2982)     */
/* ------------------------------------------------------------------ */

/**
 * The daily worship of the faiths that keep it outside Islam, laid over a ready routine the way the five prayers are:
 *   jewish     the morning service at the synagogue after sunrise and the afternoon and evening services together at
 *              sunset, on the six days before the Sabbath (the Sabbath service is already in the week); the routine
 *              that serves the synagogue leads both
 *   hindu      worship at the household shrine at sunrise and the evening lamp at sunset
 *   theravada  food given to the monks on their morning round, in the street
 *   tibetan    the walk round the temple at sunrise
 *   chinese    incense at the household altar at sunrise
 * The clergy of the last four keep their own offices and get nothing laid over. Under campaigns against religion
 * (WORSHIP_HIDDEN) it is not kept openly by default. A house reading, rounded for play; the books give no such table.
 */
export const DAILY_WORSHIP = {
  jewish: [
    {key: "shacharit", sun: "sunrise", off: [10, 50], from: 6, to: 7, place: "church", label: "The morning service", days: [0, 1, 2, 3, 4, 6], leads: true},
    {key: "mincha", sun: "sunset", off: [-25, 20], from: 18, to: 19, place: "church", label: "The afternoon and evening services", days: [0, 1, 2, 3, 6], leads: true}
  ],
  hindu: [
    {key: "puja", sun: "sunrise", off: [-10, 15], from: 6, to: 7, place: "home", label: "Worship at the household shrine"},
    {key: "lamp", sun: "sunset", off: [0, 15], from: 18, to: 19, place: "home", label: "The evening lamp at the shrine"}
  ],
  theravada: [{key: "alms", sun: "sunrise", off: [15, 40], from: 6, to: 7, place: "street", label: "Gives food to the monks on their round"}],
  tibetan: [{key: "kora", sun: "sunrise", off: [0, 40], from: 6, to: 7, place: "church", label: "Walks the circuit round the temple"}],
  chinese: [{key: "incense", sun: "sunrise", off: [0, 10], from: 6, to: 7, place: "home", label: "Incense at the household altar"}]
};
/** Years a region's people do not keep their daily worship openly by default: [from, to]. */
export const WORSHIP_HIDDEN = {
  "russia": [[1929, 1990]], "central-asia": [[1929, 1990]], "china": [[1966, 1976]], "tibet-himalaya": [[1959, 1979]]
};
/** Is a faith's daily worship kept? mode as keepsPrayers. */
export function keepsWorship(mode, faith, region = null, year = 0) {
  if ( !DAILY_WORSHIP[faith] || mode === "none" ) return false;
  if ( mode === "five" ) return true;
  const y = Number(year) || 0;
  return !(WORSHIP_HIDDEN[region] ?? []).some(([a, b]) => y >= a && y <= b);
}
/** The daily worship blocks of a faith laid over a routine's blocks (first, so they win). */
export function withWorship(blocks, faith) {
  const rows = DAILY_WORSHIP[faith];
  if ( !Array.isArray(blocks) || !rows ) return blocks;
  const leader = leads(blocks);
  const B0 = {when: "any", days: null, feast: "any"};
  return [...rows.filter(w => !leader || w.leads).map(w => ({...B0, from: w.from, to: w.to, sun: w.sun, off: [...w.off], days: w.days ? [...w.days] : null,
    place: w.place, activity: "pray", label: leader ? `Leads ${w.label.replace(/^The /, "the ")}` : w.label, prayer: w.key})), ...blocks];
}
const hoursOf = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? "")); return m ? Number(m[1]) + Number(m[2]) / 60 : null; };
/** The hours [start, end] a sun block runs on a day (end may pass 24). */
export function sunWindow(b, d) {
  const rise = hoursOf(d?.sunrise) ?? 6, set = hoursOf(d?.sunset) ?? 18, noon = (rise + set) / 2;
  const base = {sunrise: rise, sunset: set, noon, afternoon: noon + 0.6 * (set - noon)}[b.sun];
  if ( base === undefined ) return null;
  const [a, z] = Array.isArray(b.off) ? b.off : [0, 20];
  return [(((base + a / 60) % 24) + 24) % 24, (((base + a / 60) % 24) + 24) % 24 + (z - a) / 60];
}
const inSun = (b, d) => {
  const w = sunWindow(b, d);
  if ( !w ) return hourIn(b, d.hour);
  const h = d.hour + (Number(d.minute) || 0) / 60;
  return ((h - w[0]) % 24 + 24) % 24 < w[1] - w[0];
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
export const presetsFor = year => Object.fromEntries(Object.entries(PRESETS).filter(([, p]) => !Number(year) || ((!p.from || Number(year) >= p.from) && (!p.to || Number(year) <= p.to))));

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
// NPC 0.21.0 (B1000): the animals' hours
Object.assign(PRESETS, ANIMAL_PRESETS);
Object.assign(DEFAULT_PRESET, ANIMAL_DEFAULT_PRESET);
// NPC 0.23.0 (B1005): criminals, combatants and townsfolk
Object.assign(PRESETS, MORTAL_PRESETS);
Object.assign(DEFAULT_PRESET, MORTAL_DEFAULT_PRESET);
// NPC 0.24.0 (B1009): supernatural NPCs by line
Object.assign(PRESETS, SUPERNATURAL_PRESETS);
Object.assign(DEFAULT_PRESET, SUPERNATURAL_DEFAULT_PRESET);
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
export function blockAt(blocks, time, describe, from = 0) {
  const d = describe(time);
  let yesterday = null;
  for ( let i = from; i < (blocks?.length ?? 0); i++ ) {
    const b = blocks[i];
    // NPC 0.50.0: a block laid on the sun (the prayers) reads the day's sunrise and sunset to the minute
    if ( b.sun ? !inSun(b, d) : !hourIn(b, d.hour) ) continue;
    // The part of a block after midnight belongs to the day it started on
    const day = !b.sun && wraps(b) && d.hour < b.to ? (yesterday ??= describe(time - 86400)) : d;
    if ( Array.isArray(b.days) && b.days.length && !b.days.includes(day.dayOfWeek) ) continue;
    if ( b.feast === "only" && !day.feast ) continue;
    if ( b.feast === "not" && day.feast ) continue;
    if ( b.ramadan === "only" && !day.ramadan ) continue;
    if ( b.ramadan === "not" && day.ramadan ) continue;
    if ( b.when === "day" && d.isNight ) continue;
    if ( b.when === "night" && !d.isNight ) continue;
    // NPC 0.21.0: months it runs in (1 January ... 12 December), for seasons: pasture, winter sleep
    if ( Array.isArray(b.months) && b.months.length && d.month && !b.months.includes(day.month ?? d.month) ) continue;
    // NPC 0.50.0: "same" prays where the next fitting block puts them
    if ( b.place === "same" ) {
      const under = blockAt(blocks.map(x => (x.place === "same" ? {...x, days: [-1]} : x)), time, describe, i + 1);
      return {block: {...b, place: under?.block?.place ?? "home"}, index: i};
    }
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
    if ( b.sun && !sunWindow(b, {}) ) bad.push(`Block ${n}: the sun can be sunrise, noon, afternoon or sunset`);
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
export function resolvePlace(block, {places = [], roles = {}, seed = "", domitorPlace = null, faith = null} = {}) {
  if ( !block?.place ) return {place: null, missing: null};
  const ids = new Set(places.map(p => p.id));
  const p = block.place;
  if ( ids.has(p) ) return {place: p, missing: null};
  if ( p === "domitor" ) {
    if ( domitorPlace && ids.has(domitorPlace) ) return {place: domitorPlace, missing: null};
    return resolvePlace({...block, place: "haven"}, {places, roles, seed, faith});
  }
  let missing = null;
  if ( roles?.[p] ) {
    if ( ids.has(roles[p]) ) return {place: roles[p], missing: null};
    missing = p;
  }
  if ( !ROLES[p] && !missing ) missing = p; // a place id that was deleted
  // NPC 0.50.0 (B2662): the house of worship of their own faith first
  const kinds = p === "church" && faith ? worshipKinds(faith) : (ROLES[p]?.kinds ?? []);
  for ( const k of kinds ) {
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
    [/\b(mosque|masjid|madrasa|minaret)\b/i, "mosque"],
    [/\b(synagogue|shul|beth midrash|prayer house)\b/i, "synagogue"],
    [/\b(church|chapel|cathedral|churchyard|cloister|scriptorium|hermitage|abbey|monastery|church close)\b/i, "church"],
    [/\b(temple|pagoda|stupa|gompa|vihara|mandir)\b/i, "temple"],
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
export const RESPONSES = {challenge: "Challenge them", alarm: "Raise the alarm", send: "Send for help", flee: "Flee", fight: "Fight", ignore: "Let it pass",
  report: "Tell someone later"};
/** Responses WoDX can carry out by itself in Auto; a fight waits for the Storyteller unless fights start by themselves. */
export const SELF_RESPONSES = ["challenge", "alarm", "send", "flee", "ignore", "report"];

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
export function notice(watcher, intruder, {rng = Math.random, diff = 6, book = "v20da", watcherDiff = diff, intruderDiff = diff} = {}) {
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
  // 0.45.3: each side may have its own difficulty (WoDX Senses passes how each one moves)
  const w = rollSuccesses((watcher.perception ?? 0) + (watcher.alertness ?? 0), watcherDiff, rng);
  const i = rollSuccesses((intruder.dexterity ?? 0) + (intruder.stealth ?? 0), intruderDiff, rng);
  return {noticed: w.successes > i.successes,
    why: `Perception + Alertness ${w.successes} against Dexterity + Stealth ${i.successes} (V20 Dark Ages p. 169)`, rolls: {w, i}};
}

/**
 * NPC 0.43.0 (house rule, the NPC look design): what a worn disguise does at a guarded place. look: WoDX Library's
 * reading (look.disguise = {station, sides}); records: the intruder's flags.wodx-actions.disguise ({npcId: {held}});
 * watchers: ids of the NPCs who keep this place. Records from those watchers count; with none of theirs, any record does.
 * Returns {pass: the disguise's sides count as worn, seenThrough: a watcher here saw through it}. Seen through wins.
 */
export function disguiseAt(look, records = {}, watchers = []) {
  const none = {pass: false, seenThrough: false};
  if ( !look?.disguise ) return none;
  const all = Object.entries(records ?? {}).filter(([, r]) => r && typeof r === "object");
  const theirs = all.filter(([id]) => watchers.includes(id));
  const use = theirs.length ? theirs : all;
  if ( !use.length ) return none;
  const seenThrough = use.some(([, r]) => r.held === false);
  return {pass: !seenThrough && use.some(([, r]) => r.held === true), seenThrough};
}

/**
 * What a watcher does about what it noticed, scored from its 7b profile. sit:
 *   {supernatural, weapon, trespass, curfew, night, alliesNear, intruderKind, watcherKind, homeGround, bloody (NPC 0.32.0),
 *    seenThrough (a disguise a watcher here saw through, NPC 0.43.0)}
 * Returns [{action, score, why}] best first.
 */
export function pickReaction(profile, sit) {
  const p = profile, out = [], tac = p.tactics ?? [], fears = p.fears ?? [];
  const afraid = (sit.supernatural && fears.includes("supernatural")) || (sit.weapon && fears.includes("violence"))
    || (sit.wraith && fears.includes("wraith"));
  // NPC 0.21.0 (B1001): animals bark or raise a racket only when they are callers; they never send for the watch
  const beast = !!p.animal, herd = Number(p.herd ?? 0), terr = Number(p.territory ?? 0), hung = Number(p.hunger ?? 0);
  // Animals take no fright at the supernatural as such (Ben, 2026-11-12): only a wraith, through their fears
  const amiss = [sit.curfew && !beast && "abroad in the curfew", sit.trespass && "trespassing", sit.weapon && "weapon drawn", sit.supernatural && !beast && "the supernatural shown",
    sit.bloody && !beast && "blood on them", sit.seenThrough && !beast && "dressed as one of us"].filter(Boolean);
  const keeper = ["guard", "ghoul", "elder"].includes(p.template) || tac.includes("guard") || (tac.includes("call") && p.loyalty >= 1);
  if ( keeper ) {
    let sc = 2 + p.loyalty + (sit.curfew ? 1.5 : 0) + (sit.trespass ? 1.5 : 0) + (sit.bloody ? 1 : 0) + (sit.seenThrough ? 1.5 : 0) - (sit.weapon ? 0.5 : 0) - (afraid ? 3 : 0);
    const what = beast ? "barks and bristles" : "keeps order here";
    out.push({action: "challenge", score: sc, why: amiss.length ? `${what}: ${amiss.join(", ")}` : what});
  }
  if ( !beast || tac.includes("call") ) {
    const sc = 0.5 + p.caution + (sit.supernatural ? 2 : 0) + (sit.weapon ? 1 : 0) + (sit.alliesNear ? 0.5 : 0) + (afraid ? 1 : 0);
    out.push({action: "alarm", score: sc, why: beast ? "raises a racket" : sit.alliesNear ? `${sit.alliesNear} others within call` : "shouts for anyone near"});
  }
  if ( !beast && (tac.includes("call") || keeper) ) {
    out.push({action: "send", score: 0.5 + p.loyalty + ((sit.supernatural || sit.weapon) ? 1.5 : 0) + (sit.bloody ? 1 : 0) + (sit.seenThrough ? 1 : 0) - (sit.alliesNear ? 0.5 : 0), why: "sends for the watch"});
  }
  {
    const startled = tac.includes("scatter") && amiss.length > 0;
    const sc = (amiss.length ? p.cowardice * 1.5 : 0) + (afraid ? 3 + p.caution : 0) + (startled ? 2 + herd / 2 : 0);
    const r = [afraid && "faces what it fears", amiss.length && p.cowardice >= 1 && "not one to stand", startled && "scatters"].filter(Boolean);
    if ( r.length ) out.push({action: "flee", score: sc, why: r.join("; ")});
  }
  {
    let sc = 2 * p.aggression - 2 + (sit.weapon ? p.aggression : 0) + (sit.homeGround && sit.trespass ? 1.5 : 0) - (afraid ? 4 : 0);
    const r = [sit.weapon && "a blade is out", sit.homeGround && sit.trespass && "on its own ground"].filter(Boolean);
    if ( tac.includes("supernatural") && sit.supernatural ) { sc += 3 + p.aggression; r.push("a hunter goes for the monster"); }
    if ( terr && (sit.trespass || sit.homeGround) ) { sc += 1.5 * terr; r.push("defends its own patch"); }
    if ( hung && sit.hungry && sit.alone ) { sc += 1.5 * hung; r.push("hungry, and this one is alone"); }
    out.push({action: "fight", score: sc, why: r.length ? r.join("; ") : "picks a fight"});
  }
  // NPC 0.23.0 (B1007): lets it pass now and tells the watch, the gang or the secret police within a couple of hours
  if ( tac.includes("report") && (amiss.length || sit.supernatural) ) {
    out.push({action: "report", score: 2 + p.cunning + (afraid ? 1 : 0) + (sit.supernatural ? 1 : 0), why: "says nothing now, and tells someone later"});
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
