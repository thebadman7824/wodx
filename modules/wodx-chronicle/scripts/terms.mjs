/**
 * WoDX shared terms (B6180-B6199): one meaning for the words every module uses. Pure: no Foundry calls, so the
 * harness and every module's rules files can import it ("../../wodx-chronicle/scripts/terms.mjs").
 *
 * Time follows V20 (pdf p. 262): a turn is the time a simple action takes, three seconds at its shortest; a scene is
 * a stretch of play in one place; a chapter is one session; a story is a full plot; downtime runs between scenes.
 * Dice follow V20 (pdf p. 257 to 258): difficulty 2 to 10, 6 when none is given, a 10 always succeeds, each 1 takes
 * away a success, and a roll with no success and a 1 showing is a botch.
 *
 * The guard test tools/harness/terms-guard.test.mjs fails when a module writes its own copy of these again.
 */
import {describeTime, secondsToNextDawn, secondsToNextDusk} from "./calendar.mjs";

/* -------------------------------------------- */
/*  Time                                        */
/* -------------------------------------------- */

export const SECOND = 1;
export const MINUTE = 60;
export const HOUR = 3600;
export const DAY = 86400;
export const WEEK = 7 * DAY;
/** "A month" in a rule that counts time (rent, a herd filling again, a cult fading): 30 days (B6181). */
export const MONTH_DAYS = 30;
export const MONTH = MONTH_DAYS * DAY;
/** "A year" in a rule that counts time or age: the Julian year of 365.25 days, so four years are 1461 days (B6181). */
export const YEAR_DAYS = 365.25;
export const YEAR = YEAR_DAYS * DAY;
/** A month as a twelfth of a year (30.4375 days), where the real length matters over many months: a pregnancy, an age. */
export const CALENDAR_MONTH = YEAR / 12;
/** The Moon's cycle, new moon to new moon (the Chronicle clock's moon uses the same figure). */
export const LUNAR_MONTH_DAYS = 29.530588853;
export const LUNAR_MONTH = LUNAR_MONTH_DAYS * DAY;
/** The fae "year and a day". */
export const YEAR_AND_A_DAY_DAYS = 366;

/** Seconds a turn takes when nothing else says: the books' three seconds (V20 pdf 262, V20 Dark Ages pdf 344, W20 pdf 241). */
export const TURN_SECONDS = 3;
/** A round is a turn of a fight. */
export const ROUND_SECONDS = TURN_SECONDS;
/** A scene that must be put on the clock (a power "for the scene" with no scene running): one hour (B6182). */
export const SCENE_SECONDS = HOUR;
/** A night's count turns over at noon, so the small hours belong to the night that began at dusk (B6183). */
export const NIGHT_TURNS_AT_HOUR = 12;

/** The words for how long something lasts, the order they grow in. */
export const PERIODS = {
  turn: "this turn", round: "this round", scene: "this scene", night: "tonight", day: "today", week: "this week",
  month: "this month", lunar: "this lunar month", season: "this season", year: "this year", chapter: "this session",
  story: "this story", chronicle: "the chronicle"
};
/** Periods that end by the clock, in seconds. Turn, scene, chapter and story end by play, not the clock. */
export const PERIOD_SECONDS = {turn: TURN_SECONDS, round: ROUND_SECONDS, scene: SCENE_SECONDS, night: DAY, day: DAY,
  week: WEEK, month: MONTH, lunar: LUNAR_MONTH, season: YEAR / 4, year: YEAR};

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const floorBy = (t, len) => Math.floor(num(t) / len);

/** Which day, night, week, month or lunar month a world time falls in (counted from world time 0). */
export const dayIndex = t => floorBy(t, DAY);
export const nightIndex = t => floorBy(num(t) - (NIGHT_TURNS_AT_HOUR * HOUR), DAY);
export const weekIndex = t => floorBy(t, WEEK);
export const monthIndex = t => floorBy(t, MONTH);
export const lunarIndex = t => floorBy(t, LUNAR_MONTH);
export const yearIndex = t => floorBy(t, YEAR);
/** Outside a fight, the turn a world time falls in, at a turn's length. */
export const turnIndex = (t, turnSeconds = TURN_SECONDS) => floorBy(t, Math.max(1, num(turnSeconds) || TURN_SECONDS));

/**
 * The key a use or an effect is filed under for a period (B6184). ctx: {worldTime, combat: {id, round} or null,
 * scene: the scene tally, turnSeconds}. Two times with the same key are in the same turn, scene, night and so on.
 */
export function periodKey(per, {worldTime = 0, combat = null, scene = 0, turnSeconds = TURN_SECONDS} = {}) {
  const t = num(worldTime);
  switch (per) {
    case "turn": case "round": return combat ? `${combat.id}:${combat.round ?? 0}` : `t${scene}:${turnIndex(t, turnSeconds)}`;
    case "scene": return `s${scene}`;
    case "night": return `n${nightIndex(t)}`;
    case "day": return `d${dayIndex(t)}`;
    case "week": return `w${weekIndex(t)}`;
    case "month": return `m${monthIndex(t)}`;
    case "lunar": return `l${lunarIndex(t)}`;
    case "year": return `y${yearIndex(t)}`;
    default: return "story";
  }
}

/** Seconds for a count of a period: seconds(2, "week"). Turn-long counts take the table's turn length. */
export function seconds(n, per = "second", {turnSeconds = TURN_SECONDS} = {}) {
  const k = String(per).toLowerCase().replace(/s$/, "");
  const len = k === "second" ? 1 : k === "minute" ? MINUTE : k === "hour" ? HOUR : (k === "turn" || k === "round") ? (num(turnSeconds) || TURN_SECONDS)
    : PERIOD_SECONDS[k] ?? null;
  if ( len === null ) throw new Error(`Unknown period ${per}`);
  return num(n) * len;
}

/**
 * Is it night at a world time and latitude? Night runs from sunset to sunrise, as the Chronicle clock shows it (the sun
 * for the date and place, not set hours): a summer evening at 21:00 in Moravia is still day (B6185).
 */
export function isNightAt(time, latitude = 50) {
  try { return !!describeTime(num(time), num(latitude)).isNight; } catch (e) { return null; }
}
/** Seconds to the next dawn and dusk (the Chronicle clock's sun). */
export const toDawn = (time, latitude = 50) => secondsToNextDawn(num(time), num(latitude));
export const toDusk = (time, latitude = 50) => secondsToNextDusk(num(time), num(latitude));

/* -------------------------------------------- */
/*  Dice                                        */
/* -------------------------------------------- */

export const DEFAULT_DIFFICULTY = 6;
export const MIN_DIFFICULTY = 2;
export const MAX_DIFFICULTY = 10;
/** A difficulty within the books' 2 to 10; anything else (missing, text) is 6. */
export function clampDifficulty(d) {
  const n = Math.round(Number(d));
  if ( !Number.isFinite(n) ) return DEFAULT_DIFFICULTY;
  return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, n));
}

/**
 * Count a roll of ten-sided dice the V20 way.
 * opts: specialty (a 10 counts twice), willpower (one automatic success, and no botch), auto (more automatic successes,
 * added after the 1s cancel), canBotch (false for damage and soak), onesCancel (false where a book says 1s do not take
 * away successes), doubleOnes (each 1 counts as two, an Umbral storm).
 * Returns {raw, ones, net, successes, botch, difficulty}: raw is dice that hit, net the successes after the 1s,
 * successes adds the automatic ones.
 */
export function successes(faces = [], difficulty = DEFAULT_DIFFICULTY, opts = {}) {
  const {specialty = false, willpower = false, auto = 0, canBotch = true, onesCancel = true, doubleOnes = false} = opts;
  const diff = clampDifficulty(difficulty);
  let raw = 0, ones = 0;
  for ( const f0 of faces ?? [] ) {
    const f = Number(f0);
    if ( f === 1 ) ones += doubleOnes ? 2 : 1;
    if ( f >= diff || f === 10 ) raw += (specialty && f === 10) ? 2 : 1;
  }
  const net = Math.max(0, raw - (onesCancel ? ones : 0));
  const extra = (willpower ? 1 : 0) + Math.max(0, num(auto));
  const botch = canBotch && raw === 0 && ones > 0 && extra === 0;
  return {raw, ones, net, successes: net + extra, botch, difficulty: diff};
}

/** Hits less 1s, below 0 when the 1s outnumber the hits (some rules read how badly a roll failed). */
export function margin(faces = [], difficulty = DEFAULT_DIFFICULTY, opts = {}) {
  const r = successes(faces, difficulty, opts);
  return r.raw - r.ones;
}

/* -------------------------------------------- */
/*  Health and damage                           */
/* -------------------------------------------- */

/** The seven health levels below Healthy (V20 pdf 290, the sheet on pdf 86), and the dice each takes away. */
export const HEALTH_LEVELS = ["bruised", "hurt", "injured", "wounded", "mauled", "crippled", "incapacitated"];
export const HEALTH_LABELS = {bruised: "Bruised", hurt: "Hurt", injured: "Injured", wounded: "Wounded", mauled: "Mauled", crippled: "Crippled", incapacitated: "Incapacitated"};
const PENALTY_BY_PLACE = [0, -1, -1, -2, -2, -5, null];
export const WOUND_PENALTY = Object.fromEntries(HEALTH_LEVELS.map((k, i) => [k, PENALTY_BY_PLACE[i]]));
/** A level's place, 1 (Bruised) to 7 (Incapacitated); 0 is unhurt. */
export const LEVEL_INDEX = {unhurt: 0, ...Object.fromEntries(HEALTH_LEVELS.map((k, i) => [k, i + 1]))};
export const DAMAGE_TYPES = ["bashing", "lethal", "aggravated"];
const DAMAGE_ALIAS = {b: "bashing", bash: "bashing", l: "lethal", leth: "lethal", a: "aggravated", agg: "aggravated", aggr: "aggravated", aggravated: "aggravated", bashing: "bashing", lethal: "lethal"};
/** A damage word as one of the three types, or null. Chimerical damage is a Changeling's own and kept as "chimerical". */
export function damageType(word) {
  const k = String(word ?? "").trim().toLowerCase();
  if ( k === "chimerical" ) return "chimerical";
  return DAMAGE_ALIAS[k] ?? null;
}

/* -------------------------------------------- */
/*  Distance and weight                         */
/* -------------------------------------------- */

/** One map square is 5 feet (rule 35), which is 5/3 yards. */
export const SQUARE_FEET = 5;
export const FEET_PER_YARD = 3;
export const YARDS_PER_MILE = 1760;
export const KG_PER_LB = 0.45359237;

/**
 * How many of a scene unit make one yard: ft 3, yd 1, m 1, km 1/1000, mi 1/1760. A scene with no unit named counts in
 * yards; a unit not known here reads as feet.
 * The books give ranges as "yards or meters" and count the two the same (V20 pdf 290: "three yards or meters"), so a
 * metre is a yard here, the same in every module (B6186).
 */
export function unitsPerYard(units = "ft") {
  const u = String(units ?? "").trim().toLowerCase().replace(/\.$/, "");
  if ( ["", "yd", "yds", "yard", "yards", "m", "meter", "meters", "metre", "metres"].includes(u) ) return 1;
  if ( ["km", "kilometer", "kilometers", "kilometre", "kilometres"].includes(u) ) return 1 / 1000;
  if ( ["mi", "mile", "miles"].includes(u) ) return 1 / YARDS_PER_MILE;
  return FEET_PER_YARD;
}
/** A distance in scene units as yards, and back. */
export const toYards = (distance, units = "ft") => num(distance) / unitsPerYard(units);
export const fromYards = (yards, units = "ft") => num(yards) * unitsPerYard(units);
export const toFeet = (distance, units = "ft") => toYards(distance, units) * FEET_PER_YARD;
export const kgFromLb = lb => num(lb) * KG_PER_LB;
export const lbFromKg = kg => num(kg) / KG_PER_LB;

/* -------------------------------------------- */
/*  Eras                                        */
/* -------------------------------------------- */

/**
 * The era profiles' years and rule sets, as data/eras.json has them (the harness checks the two agree). The group is
 * the broad age the people, gear and talk generators use.
 */
export const ERAS = [
  {id: "mythic-age", start: -10000, end: -3101, group: "ancient", rules: "livinggods"},
  {id: "bronze-kings", start: -3100, end: -1178, group: "ancient", rules: "livinggods"},
  {id: "iron-dawn", start: -1177, end: -801, group: "ancient", rules: "livinggods"},
  {id: "greece-republic", start: -800, end: -28, group: "ancient", rules: "classical"},
  {id: "roman-empire", start: -27, end: 476, group: "ancient", rules: "classical"},
  {id: "migration-age", start: 477, end: 907, group: "ancient", rules: "classical"},
  {id: "premyslid-duchy", start: 908, end: 1196, group: "ancient", rules: "classical"},
  {id: "dark-ages", start: 1197, end: 1346, group: "medieval", rules: "darkages"},
  {id: "long-night", start: 1347, end: 1449, group: "medieval", rules: "darkages"},
  {id: "renaissance", start: 1450, end: 1600, group: "early-modern", rules: "darkages"},
  {id: "age-of-reason", start: 1601, end: 1836, group: "early-modern", rules: "darkages"},
  {id: "victorian", start: 1837, end: 1901, group: "industrial", rules: "victorian"},
  {id: "wild-west", start: 1860, end: 1899, group: "industrial", rules: "victorian", regional: true},
  {id: "great-war", start: 1914, end: 1918, group: "industrial", rules: "victorian"},
  {id: "mid-century", start: 1919, end: 1989, group: "mid-century", rules: "victorian"},
  {id: "modern", start: 1990, end: 2003, group: "modern", rules: "modern"},
  {id: "time-of-judgment", start: 2004, end: 2004, group: "modern", rules: "modern"},
  {id: "future-darkness", start: 2010, end: 2098, group: "future", rules: "modern"},
  {id: "time-of-future-judgement", start: 2099, end: 2099, group: "future", rules: "modern"}
];
export const ERA_IDS = ERAS.map(e => e.id);
const ERA_BY_ID = Object.fromEntries(ERAS.map(e => [e.id, e]));
export const eraById = id => ERA_BY_ID[String(id ?? "").toLowerCase()] ?? null;
/** Eras that look like another for gear and items (no chart of their own). */
export const ERA_LIKE = {"time-of-future-judgement": "future-darkness", "age-of-reason": "renaissance", "mid-century": "great-war"};
/** The era for a year (the broad one, not a regional one such as the Wild West); between eras, the one before. */
export function eraAt(year) {
  const y = num(year);
  let best = null;
  for ( const e of ERAS ) if ( !e.regional && e.start <= y ) best = e;
  return best ?? ERAS[0];
}
export const eraGroup = idOrYear => (typeof idOrYear === "number" ? eraAt(idOrYear) : eraById(idOrYear))?.group ?? "medieval";
/** Does an era play by the Dark Ages rules (Roads, the Dark Ages Abilities)? The era profile's own rule set says. */
export const darkAgesRules = id => ["darkages", "livinggods", "classical"].includes(eraById(id)?.rules);
/** The eras before the modern world's electric light and wire: everything to the Age of Reason. */
export const MEDIEVAL_YEAR_END = 1449;
/**
 * The span of years stock speech is written for (NPC talk and its grammar), on the era profiles' years: medieval to the
 * Long Night, early modern to the Age of Reason, the nineteenth century to the Great War, the twentieth to 1989, modern
 * after; "future" from the Future Darkness era on that branch, and past 2025 otherwise (the main timeline ends in 2022).
 */
export function speechBand(year, branch = "") {
  const y = Number(year);
  if ( !Number.isFinite(y) ) return "modern";
  const g = eraGroup(y);
  if ( g === "ancient" || g === "medieval" ) return "medieval";
  if ( g === "early-modern" ) return "earlymodern";
  if ( g === "industrial" ) return "nineteenth";
  if ( g === "mid-century" ) return "twentieth";
  if ( branch === "future" && y >= eraById("future-darkness").start ) return "future";
  return y >= 2026 ? "future" : "modern";
}

/* -------------------------------------------- */
/*  Who is who                                  */
/* -------------------------------------------- */

/** The lines, as WoDX names them, and the kinds WoDX Combat and Actions use for each. */
export const LINES = ["vampire", "kueijin", "ghoul", "werewolf", "kinfolk", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "exalted", "spirit", "creature", "mortal"];
/** WoDX Combat's kind for each line. Combat fights a Kuei-jin as Kindred (its sheet is a Vampire sheet). */
export const LINE_KIND = {vampire: "kindred", kueijin: "kindred", ghoul: "ghoul", werewolf: "lupine", kinfolk: "mortal", mage: "mage", changeling: "fae", wraith: "wraith",
  hunter: "hunter", mummy: "mummy", demon: "demon", exalted: "exalted", spirit: "spirit", creature: "beast", mortal: "mortal"};
export const KIND_LINE = {kindred: "vampire", ghoul: "ghoul", lupine: "werewolf", mage: "mage", fae: "changeling", wraith: "wraith", hunter: "hunter",
  mummy: "mummy", demon: "demon", exalted: "exalted", spirit: "spirit", beast: "creature", mortal: "mortal"};
const TYPE_LINE = {vampire: "vampire", werewolf: "werewolf", "changing breed": "werewolf", changingbreed: "werewolf", mage: "mage", changeling: "changeling",
  wraith: "wraith", hunter: "hunter", mummy: "mummy", demon: "demon", exalted: "exalted", spirit: "spirit", creature: "creature", mortal: "mortal"};

const variantOf = a => {
  const v = a?.system?.settings?.variant;
  return String(typeof v === "string" ? v : "").toLowerCase();
};
const flagsOf = a => a?.flags ?? {};

/**
 * The line an actor (or its plain data) belongs to (B6187). A Mortal sheet is a ghoul when the sheet's variant says
 * ghoul or revenant, or WoDX Creation or NPC marked it; kinfolk the same way. A Creature that drank vitae is a ghoul.
 * A Kuei-jin is a Vampire sheet of the system's Kindred of the East variant ("kindredeast"); the Exalted sheet is the
 * Exalted crossover, a line of its own. A PC sheet reads its splat.
 */
export function lineOf(actor) {
  if ( !actor ) return "mortal";
  let t = String(actor.type ?? "").toLowerCase();
  if ( t === "pc" ) t = String(actor.system?.settings?.splat ?? "mortal").toLowerCase();
  const v = variantOf(actor), f = flagsOf(actor), cr = f["wodx-creation"] ?? {}, np = f["wodx-npc"] ?? {};
  if ( t === "mortal" ) {
    if ( /ghoul|revenant/.test(v) || cr.ghoul || np.ghoul ) return "ghoul";
    if ( /kinfolk/.test(v) || cr.lineage?.kinfolk || np.kinfolk ) return "kinfolk";
    return "mortal";
  }
  if ( t === "creature" && cr.animalGhoul ) return "ghoul";
  if ( t === "vampire" && /kindredeast|kindred of the east|kuei|cathayan/.test(v) ) return "kueijin";
  if ( /kuei|cathayan/.test(t) ) return "kueijin";
  if ( t.startsWith("changel") ) return "changeling";
  return TYPE_LINE[t] ?? "mortal";
}
export const kindOfLine = line => LINE_KIND[line] ?? "mortal";
export const lineOfKind = kind => KIND_LINE[String(kind ?? "").toLowerCase()] ?? "mortal";

/** A party or group sheet, not a person. */
export const isGroup = a => /group/i.test(String(a?.type ?? ""));
/** A player character: a person sheet some player owns (B6188). */
export const isPC = a => !!a && !!a.hasPlayerOwner && !isGroup(a);
/** A Storyteller character: a person sheet no player owns. */
export const isNPC = a => !!a && !a.hasPlayerOwner && !isGroup(a);
