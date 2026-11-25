/**
 * Learning from a source (B6230-B6239): when experience is spent, the character names where the trait is learned (a
 * teacher, a book, a school or course of the age, or practice), and the rise comes at the end of a long task.
 * Pure rules: no Foundry calls, so the harness can test them on their own.
 *
 * Books: V20 pdf 131 (a new Ability or Discipline needs tutoring and study as well as the experience, from a night
 * course to years for a first dot of Thaumaturgy; a mentor can only teach what they know), V20 pdf 136 (an out-of-clan
 * Discipline needs a vampire teacher, who feeds the student a blood point first), V20 Dark Ages pdf 189 (Celerity,
 * Fortitude, Potence and the clan's own Disciplines can be learned alone; any other needs a mentor who knows the
 * Discipline to the level wanted). The times, difficulties and the table of books and schools are house figures
 * (B6232, B6233), logged in docs/PENDING-REVIEW.md.
 */

export const END = 9999;
export const SOURCE_KINDS = {
  teacher: "A teacher",
  book: "A book",
  course: "A school or course",
  practice: "Practice on their own",
  storyteller: "A teacher the Storyteller finds",
  spirit: "A spirit who teaches it"
};

/** Normalise a trait name or key for matching ("Animal Ken" and "animalken" match; "crafts" and "craft" match). */
export const norm = s => String(s ?? "").toLowerCase().replace(/^wod\.[a-z.]*\./, "").replace(/[^a-z]/g, "").replace(/^crafts$/, "craft");

const PHYSICAL = ["celerity", "fortitude", "potence"];
/** Esoteric traits: a source is needed before they can rise at all, and they take twice as long (B6231). */
export const isSorcery = name => /thaumaturg|necromanc|path of|sorcer|koldun|dur-an-ki|abyss mystic/i.test(String(name ?? ""));
export const isEsoteric = (p) => {
  const n = String(p?.label ?? "");
  if ( p?.kind === "ability" || p?.kind === "newAbility" ) return norm(n) === "occult" || norm(p?.key) === "occult" || /lore\b/i.test(n);
  if ( p?.kind === "discipline" || p?.kind === "newDiscipline" ) return isSorcery(n);
  return false;
};

/**
 * Which sources may teach this purchase (B6230, B6231). p: the purchase {kind, label, discipline}; line: the
 * learner's line. Returns {allowed: [kinds], why} where why says what the books ask.
 */
export function sourcesFor(p, {line = "mortal"} = {}) {
  const name = norm(p?.label);
  const physical = PHYSICAL.includes(name);
  switch ( p?.kind ) {
    case "attribute": case "willpower":
      return {allowed: ["teacher", "practice"], why: "Raised by use and practice (V20 pdf 131), or faster with a teacher."};
    case "virtue": case "road":
      return {allowed: ["teacher", "practice"], why: "Grows from what the character lives through, or from a guide on the Road."};
    case "training":
      return {allowed: ["teacher", "practice"], why: "An animal learns from whoever trains it."};
    case "ability":
      if ( isEsoteric(p) ) return {allowed: ["teacher", "book", "course"], why: "Occult and the Lores need a teacher or a text; practice alone teaches nothing here."};
      return {allowed: ["teacher", "book", "course", "practice"], why: "Raised by use and practice, or faster from a teacher, a book or a school (V20 pdf 131)."};
    case "newAbility":
      return {allowed: ["teacher", "book", "course"], why: "A new Ability needs tutoring and study (V20 pdf 131)."};
    case "discipline":
      if ( isSorcery(p.label) ) return {allowed: ["teacher", "book"], why: "Blood sorcery is learned from a master or their texts (V20 pdf 131)."};
      if ( physical || p.discipline === "clan" || p.discipline === "caitiff" || line === "ghoul" )
        return {allowed: ["teacher", "practice"], why: "Physical and clan Disciplines can be learned alone (V20 Dark Ages pdf 189)."};
      return {allowed: ["teacher"], why: "Any other Discipline needs a mentor who knows it to the level wanted (V20 Dark Ages pdf 189)."};
    case "newDiscipline":
      if ( isSorcery(p.label) ) return {allowed: ["teacher", "book"], why: "A first dot of blood sorcery comes from a master or their texts (V20 pdf 131)."};
      return {allowed: ["teacher"], why: "A new Discipline needs a teacher (V20 pdf 131, pdf 136)."};
    // B6273: every line's own powers
    case "stat": return statSources(p);
    case "power": case "newPower": return powerSources(p);
    default:
      return {allowed: ["teacher", "practice"], why: ""};
  }
}

/** Rage, Gnosis, Arete, Glamour, Faith, Balance and the Chi Virtues (B6273). */
function statSources(p) {
  switch ( norm(p?.key) ) {
    case "gnosis": return {allowed: ["spirit", "teacher", "practice"], why: "Gnosis grows with the spirits' regard and time spent among them (W20 pdf 246)."};
    case "arete": return {allowed: ["teacher", "practice"], why: "Arete rises with insight: a mentor's guidance or the mage's own seeking (M20 pdf 337 to 338)."};
    case "faith": return {allowed: ["practice"], why: "Faith grows from the worship and the deeds of the Fallen themselves (Demon: The Fallen pdf 165)."};
    default: return {allowed: ["teacher", "practice"], why: "Grows from what the character lives through, or faster with a guide."};
  }
}

/** Spheres, Arts, Realms, Arcanoi, Lores, Hekau, Paths of sorcery and Gifts (B6273). */
function powerSources(p) {
  const first = p?.kind === "newPower" || !(Number(p?.current) > 0);
  switch ( p?.cat ) {
    case "gift":
      return {allowed: ["spirit", "teacher"], why: "A Gift is taught by a spirit (summoned at a caern, a night's work) or by a Garou who knows it (a lunar month at least; W20 pdf 153 to 154)."};
    case "sphere":
      return {allowed: ["teacher", "book"], why: "A Sphere is taught by a mentor who knows it better, of the mage's own Tradition or sect; another sect's teacher takes far longer (M20 pdf 338)."};
    case "art": case "realm":
      return first ? {allowed: ["teacher"], why: "A first dot of an Art or Realm is taught by one of the fae who knows it (C20 pdf 177)."}
        : {allowed: ["teacher", "practice"], why: "An Art or Realm grows with use, or faster with a fae teacher (C20 pdf 177)."};
    case "arcanos":
      return first ? {allowed: ["teacher"], why: "An Arcanos is taught by a wraith who knows it, most often of its Guild (Wraith 20th pdf 367)."}
        : {allowed: ["teacher", "practice"], why: "An Arcanos grows with use, or faster with a Guild teacher (Wraith 20th pdf 367)."};
    case "lore":
      return {allowed: ["teacher", "practice"], why: "A Lore is remembered from before the Fall, alone or with another of the Fallen to wake the memory (Demon: The Fallen pdf 165)."};
    case "hekau": case "numina":
      return first ? {allowed: ["teacher", "book"], why: "A first dot of a path of magic comes from a master or the texts that hold it."}
        : {allowed: ["teacher", "book", "practice"], why: "A path of magic grows with practice, a master or its texts."};
    default:
      return {allowed: ["teacher", "practice"], why: ""};
  }
}

/** Does a new out-of-clan Discipline need the teacher's blood first (V20 pdf 136)? */
export const needsBlood = (p, {line} = {}) => line === "vampire" && p?.kind === "newDiscipline" && p?.clan === false && !PHYSICAL.includes(norm(p.label));

/* -------------------------------------------------------------------- */
/*  Books and schools                                                     */
/* -------------------------------------------------------------------- */

/** Quality of a book or course: dice added and the difficulty (B6232). */
export const QUALITY = {
  fine: {label: "fine", dice: 2, diff: 5},
  good: {label: "good", dice: 1, diff: 6},
  poor: {label: "poor", dice: 0, diff: 7}
};

/**
 * Everyday books that teach (WoDX Library's manuals, papers and occult goods), by a pattern on the item's name, so the
 * clearer names the Library gives them still match. traits: normalised trait names; max: the highest dot the book can
 * bring a reader to (B6233). Any item can teach instead with flags["wodx-creation"].teaches = {traits, max, quality}.
 */
export const BOOKS = [
  {match: /latin grammar/i, traits: ["linguistics", "academics"], max: 3, quality: "good"},
  {match: /herbal/i, traits: ["medicine"], max: 2, quality: "good"},
  {match: /falconry/i, traits: ["animalken"], max: 3, quality: "good"},
  {match: /guild'?s (handwritten )?book|book of trade secrets/i, traits: ["craft"], max: 3, quality: "fine"},
  {match: /fencing manual/i, traits: ["melee"], max: 3, quality: "good"},
  {match: /cookery book/i, traits: ["craft"], max: 2, quality: "poor"},
  {match: /military drill book/i, traits: ["melee", "firearms", "leadership"], max: 2, quality: "poor"},
  {match: /medical guide/i, traits: ["medicine"], max: 2, quality: "poor"},
  {match: /car repair manual/i, traits: ["craft", "technology", "drive"], max: 2, quality: "good"},
  {match: /radio handbook/i, traits: ["technology"], max: 2, quality: "good"},
  {match: /army field manual/i, traits: ["firearms", "survival"], max: 2, quality: "good"},
  {match: /martial arts manual/i, traits: ["brawl"], max: 2, quality: "poor"},
  {match: /language course/i, traits: ["linguistics"], max: 2, quality: "good"},
  {match: /programming book/i, traits: ["computer"], max: 3, quality: "good"},
  {match: /lockpicking course/i, traits: ["larceny"], max: 3, quality: "fine"},
  {match: /handwritten grimoire/i, traits: ["occult"], max: 3, quality: "good"},
  {match: /grimoire chapbook/i, traits: ["occult"], max: 2, quality: "poor"},
  {match: /farmer'?s almanac/i, traits: ["survival", "animalken"], max: 1, quality: "poor"},
  {match: /travel guidebook/i, traits: ["linguistics", "streetwise"], max: 1, quality: "poor"}
];

/** What a carried item teaches: {name, traits, max, quality} or null. it: {name, flags}. */
export function bookOf(it) {
  const own = it?.flags?.["wodx-creation"]?.teaches;
  if ( own && Array.isArray(own.traits) && own.traits.length ) {
    return {name: String(it.name ?? "A book"), traits: own.traits.map(norm).filter(Boolean), max: Math.max(1, Math.min(10, Math.trunc(Number(own.max) || 3))),
      quality: QUALITY[own.quality] ? own.quality : "good"};
  }
  const row = BOOKS.find(b => b.match.test(String(it?.name ?? "")));
  return row ? {name: String(it.name), traits: row.traits, max: row.max, quality: row.quality} : null;
}

const KNOWLEDGES = ["academics", "law", "medicine", "science", "linguistics", "politics", "finance", "investigation", "computer", "technology", "hearthwisdom", "seneschal", "theology"];
/**
 * Schools and courses of the age (B6234), global, by year. traits "*" is any Ability but Occult and the Lores. A course
 * with resources needs that many dots of Resources: the World of Future Darkness sells its skills at a price.
 */
export const COURSES = [
  {key: "apprentice", name: "An apprenticeship with a master of the trade", from: -3000, to: END, traits: ["craft", "animalken", "ride", "drive"], quality: "good", interval: "week"},
  {key: "monastery", name: "A monastery or cathedral school", from: 600, to: 1850, traits: ["academics", "linguistics", "medicine", "theology"], quality: "good", interval: "week"},
  {key: "fencing", name: "A fencing master's school", from: 1300, to: 1950, traits: ["melee"], quality: "good", interval: "week"},
  {key: "university", name: "A university (Bologna and Paris; Prague from 1348)", from: 1200, to: END, traits: ["academics", "law", "medicine", "science", "linguistics", "theology"], quality: "good", interval: "week"},
  {key: "printed", name: "A printed book bought for the purpose", from: 1450, to: END, traits: KNOWLEDGES, quality: "poor", interval: "week"},
  {key: "library", name: "A public library or an evening school", from: 1850, to: END, traits: [...KNOWLEDGES, "craft"], quality: "good", interval: "week"},
  {key: "radio", name: "A correspondence, radio or film course", from: 1920, to: 2005, traits: ["craft", "technology", "linguistics", "academics", "drive"], quality: "poor", interval: "week"},
  {key: "net", name: "Courses and videos on the net", from: 1995, to: END, traits: [...KNOWLEDGES, "craft", "drive"], quality: "poor", interval: "week"},
  {key: "upload", name: "An uploaded skill, bought and installed", from: 2030, to: END, traits: ["*"], quality: "fine", interval: "day", resources: 3}
];

/** The courses open in a year that teach this trait. */
export function coursesFor(p, year) {
  const y = Number(year);
  const t = norm(p?.label), k = norm(p?.key);
  const fits = c => c.traits.includes("*") ? !isEsoteric(p) && (p?.kind === "ability" || p?.kind === "newAbility") : (c.traits.includes(t) || c.traits.includes(k));
  return COURSES.filter(c => Number.isFinite(y) && y >= c.from && y <= c.to && fits(c));
}

/** Does a book teach this trait to this dot? */
export const bookTeaches = (b, p) => !!b && (b.traits.includes(norm(p?.label)) || b.traits.includes(norm(p?.key)) || b.traits.some(x => x.length > 5 && norm(p?.label).includes(x))) && (Number(p?.next) || 1) <= b.max;

/* -------------------------------------------------------------------- */
/*  The long task                                                         */
/* -------------------------------------------------------------------- */

/** Successes the study needs: twice the new rating, four times for the esoteric (B6232). */
export const goalOf = p => Math.max(2, (Number(p?.next) || 1) * (isEsoteric(p) || p?.kind === "newDiscipline" || p?.kind === "newPower" || p?.kind === "power" || (p?.kind === "discipline" && p?.discipline === "other") ? 4 : 2));
/** A Gift is bought whole: its level sets the study, not a next dot (B6273). */
const giftGoal = p => Math.max(2, 2 * (Number(p?.level) || 1));

/**
 * The plan for one source (B6232): {kind, name, id, interval, diff, dice, goal, ok, why}.
 * src: {kind, id?, name?, rating? (a teacher's dots), quality? (a book or course), interval?}.
 */
export function planFor(p, src = {}, {speed = "full"} = {}) {
  const plan = planAtFull(p, src);
  return SPEEDS[speed] && speed !== "full" && Number.isFinite(plan.goal) ? {...plan, goal: quicker(plan.goal, speed)} : plan;
}

/**
 * Desk pick (#2506, 25 Nov): a world setting shortens every study. The book's pace is "full"; "half" and "quarter"
 * need that share of the successes, so about that share of the weeks. House rule; the book sets no pace (V20 Dark Ages
 * pdf 186: the Storyteller decides, and one dot per Trait a story).
 */
export const SPEEDS = {full: {label: "The book's pace", share: 1}, half: {label: "Twice as fast (half the time)", share: 0.5}, quarter: {label: "Four times as fast (a quarter of the time)", share: 0.25}};
export const quicker = (goal, speed = "full") => Math.max(1, Math.ceil((Number(goal) || 1) * (SPEEDS[speed]?.share ?? 1)));

function planAtFull(p, src = {}) {
  const goal = goalOf(p);
  const next = Number(p?.next) || 1, current = Number(p?.current) || 0;
  const base = {kind: src.kind, id: src.id ?? "", name: src.name ?? SOURCE_KINDS[src.kind] ?? "", goal, ok: true, why: ""};
  switch ( src.kind ) {
    case "teacher": {
      const r = Number(src.rating) || 0;
      if ( r < next ) return {...base, ok: false, why: `${src.name ?? "The teacher"} has only ${r}; a teacher must know it to ${next} (V20 Dark Ages pdf 189)`, interval: "week", diff: 6, dice: 0};
      // B6273: a mentor of another sect takes far longer (M20 pdf 338): three times the successes
      const g = p?.cat === "gift" ? Math.max(4, giftGoal(p) * 2) : (src.otherSect ? goal * 3 : goal);
      return {...base, goal: g, interval: "week", diff: r >= next + 2 ? 5 : 6, dice: Math.max(1, Math.min(3, r - current)), fine: r >= next + 2, ...(src.otherSect ? {why: "Of another sect: three times as long"} : {})};
    }
    case "book": case "course": {
      const q = QUALITY[src.quality] ?? QUALITY.good;
      return {...base, interval: src.interval === "day" ? "day" : "week", diff: q.diff, dice: q.dice, quality: q.label};
    }
    case "practice":
      return {...base, interval: "month", diff: 7, dice: 0};
    case "storyteller":
      return {...base, interval: "week", diff: 6, dice: 1, pending: true};
    // B6273: a spirit teaches a Gift in a night (W20 pdf 153); a Garou teacher takes a lunar month at least
    case "spirit":
      return {...base, goal: p?.cat === "gift" ? giftGoal(p) : goal, interval: "day", diff: 6, dice: 1};
    default:
      return {...base, ok: false, why: "Name where it is learned", interval: "week", diff: 6, dice: 0};
  }
}

const P_SUCCESS = {4: 0.6, 5: 0.5, 6: 0.4, 7: 0.3, 8: 0.2};
/** Rough rolls needed for a pool, for the estimate the player sees before choosing. */
export function estimateRolls(plan, pool) {
  const per = Math.max(0.3, (Number(pool) || 1) * (P_SUCCESS[plan?.diff] ?? 0.4));
  return Math.max(1, Math.ceil((Number(plan?.goal) || 1) / per));
}
const UNIT = {day: ["night", "nights"], week: ["week", "weeks"], month: ["month", "months"]};
export function timeWords(plan, pool) {
  const n = estimateRolls(plan, pool);
  const [one, many] = UNIT[plan?.interval] ?? UNIT.week;
  return `about ${n} ${n === 1 ? one : many}`;
}

/**
 * The learner's own roll for the study (B6232): {attr, ability, pool} as a long task wants them. Attributes roll the
 * Attribute itself; Abilities roll Intelligence and the Ability; Disciplines, Virtues, the Road and Willpower roll
 * permanent Willpower. sysAbility: the purchase's key is one of the sheet's own Abilities.
 */
export function rollFor(p, {sysAbility = false} = {}) {
  if ( p?.kind === "attribute" ) return {attr: p.key, ability: "", pool: ""};
  if ( p?.kind === "ability" && sysAbility ) return {attr: "intelligence", ability: p.key, pool: ""};
  if ( p?.kind === "ability" || p?.kind === "newAbility" ) return {attr: "intelligence", ability: "", pool: "", extra: Number(p.current) || 0};
  return {attr: "intelligence", ability: "", pool: "willpower"};
}

/** Learning held on an actor (flag wodx-creation.learning): open records only. */
export const openLearning = rec => Object.entries(rec ?? {}).filter(([, r]) => r && !r.done).map(([id, r]) => ({id, ...r}));
/** Is this trait being learned already? One study at a time for each trait. */
export function learningFor(rec, kind, key, label = "") {
  const k = norm(label);
  return openLearning(rec).find(r => (r.purchase?.kind === kind && r.purchase?.key === key) || (k && ["newAbility", "newDiscipline", "newPower"].includes(kind) && norm(r.purchase?.label) === k)) ?? null;
}

/** The line for the spend's experience log entry. */
export const logName = (p, src, done = false) => `${done ? "" : "Learning: "}${p.kind === "newDiscipline" || p.kind === "newAbility" || p.kind === "newPower" ? `${p.label} (new)` : `${p.label} ${p.current} → ${p.next}`}${src?.name ? `, ${done ? "learned " : ""}from ${src.kind === "practice" ? "practice" : src.name}` : ""}`;

/* -------------------------------------------- */
/*  A willing teacher (B7131)                    */
/* -------------------------------------------- */

/**
 * B7131: a teacher has to be willing (house rule; V20 pdf 131 expects a mentor, not just someone with the dots). For an
 * NPC teacher, WoDX NPC's attitude toward the student (-3 Hunted to +3 Honoured) and trust in them (-5 to +5) decide:
 * Welcome or better, or trusting them (2 or more), teaches; Hostile or worse, or distrusting them (-2 or less),
 * refuses; anything between asks a price, which goes to the Ledger as the student's debt (a boon between Kindred). A
 * teacher whose town is not the student's needs a trip there first. A character a player runs always teaches (the
 * players settle it between them), and the Storyteller can override any of it.
 *   pc: the teacher has a player owner; attitude, trust: numbers or null (unknown counts as 0)
 *   town, here: the teacher's town and the student's (names, "" when not known: then no trip is asked)
 *   override: "teach", "price" or "refuse" set by the Storyteller, else ""
 * Returns {will: "teach"|"price"|"refuse", trip (the town to travel to, or ""), why}.
 */
export const WILL = {teach: "Willing to teach", price: "Asks a price", refuse: "Refuses to teach"};
export function willingness({pc = false, attitude = 0, trust = 0, town = "", here = "", override = "", name = "The teacher"} = {}) {
  const trip = town && here && norm(town) !== norm(here) ? String(town) : "";
  const tripWhy = trip ? `; lives in ${trip}, so a trip there comes first` : "";
  if ( WILL[override] ) return {will: override, trip, why: `${WILL[override]} (the Storyteller's word)${tripWhy}`};
  if ( pc ) return {will: "teach", trip, why: `A player's character: settle it between you${tripWhy}`};
  const at = Math.round(Number(attitude) || 0), tr = Math.round(Number(trust) || 0);
  if ( at <= -2 || tr <= -2 ) return {will: "refuse", trip, why: `${name} ${at <= -2 ? "is hostile to them" : "distrusts them"} and will not teach`};
  if ( at >= 2 || tr >= 2 ) return {will: "teach", trip, why: `${name} ${at >= 2 ? "welcomes them" : "trusts them"} and teaches freely${tripWhy}`};
  return {will: "price", trip, why: `${name} will teach for a price${tripWhy}`};
}

/**
 * What a teacher who is neither friend nor foe asks, by the year and the teacher's kind (house figures). kindred: the
 * teacher is a vampire teaching a vampire, which is a boon in every age. Returns {kind ("debt"|"boon"), size, what}.
 */
export function priceFor(year, {kindred = false, next = 1} = {}) {
  if ( kindred ) return {kind: "boon", size: (Number(next) || 1) >= 4 ? "major" : "minor", what: "a boon owed for the teaching"};
  const y = year === null || year === undefined || year === "" ? NaN : Number(year);
  const what = !Number.isFinite(y) ? "a fee or a service in return"
    : y < 1500 ? "a guild fee, or a season's service in the teacher's house"
    : y < 1900 ? "a tutor's wage, or work done for the teacher"
    : y < 2030 ? "tuition paid, or a favour done for the teacher"
    : "a contract: hours of work, data or a favour owed";
  return {kind: "debt", size: null, what};
}

/* -------------------------------------------------------------------- */
/*  Find a teacher (desk pick, #2506, 25 Nov)                             */
/* -------------------------------------------------------------------- */

/**
 * Asking around town for someone who teaches a trait: Charisma + the better of Streetwise and Etiquette, difficulty 6
 * (house rule: the books set no roll for it; V20 Dark Ages has no Streetwise, so Etiquette there).
 */
export const ASK_DIFF = 6;
export const askPool = ({charisma = 0, streetwise = 0, etiquette = 0} = {}) => Math.max(1, (Number(charisma) || 0) + Math.max(Number(streetwise) || 0, Number(etiquette) || 0));
/** Successes from d10 faces at a difficulty, each one cancelling a success (V20 Dark Ages p. 322). botch: no success and a one. */
export function countSuccesses(faces = [], diff = ASK_DIFF) {
  const hits = faces.filter(f => f >= diff).length, ones = faces.filter(f => f === 1).length;
  return {successes: Math.max(0, hits - ones), botch: hits === 0 && ones > 0};
}
const WILL_ORDER = {teach: 0, price: 1, refuse: 2};
/**
 * Whom asking around turns up, best first: someone in the learner's town before anyone else, a willing teacher before
 * one who asks a price, the more skilled first. A refuser is never named. cands: [{id, name, rating, will, sameTown}].
 */
export function askAroundPick(cands = [], next = 1) {
  return cands.filter(c => (Number(c.rating) || 0) >= next && c.will !== "refuse" && c.sameTown)
    .sort((a, b) => (WILL_ORDER[a.will] ?? 1) - (WILL_ORDER[b.will] ?? 1) || (Number(b.rating) || 0) - (Number(a.rating) || 0) || String(a.name).localeCompare(String(b.name)))[0] ?? null;
}
