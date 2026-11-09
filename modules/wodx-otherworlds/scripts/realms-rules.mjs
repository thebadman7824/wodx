/**
 * WoDX Otherworlds 0.4.0: the Near Dreaming and its trods, the moon's roads, the Avatar Storm and the Great
 * Maelstroms by date, Disembodiment, and the Net. Pure rules, harness-tested. Mechanics from the book check in
 * research/book-checks/otherworld-rules.md, pages pdf / printed. Where a book is silent the figure is a house rule
 * and is logged in docs/PENDING-REVIEW.md.
 */
const n = v => Math.trunc(Number(v) || 0);
const count = (dice, diff) => { const d = dice ?? []; const hits = d.filter(x => x >= diff).length, ones = d.filter(x => x === 1).length;
  return {hits, ones, successes: Math.max(0, hits - ones), botch: hits === 0 && ones > 0}; };

/* ------------------------------------------------------------------ */
/*  The Near Dreaming: the Mists (C20 pdf 304-305 / pp. 303-304)        */
/* ------------------------------------------------------------------ */

/**
 * The Mists on one who enters or leaves the Near Dreaming, by Glamour minus Banality. The book's chart runs from
 * no effect at the top to lasting states at the bottom; the steps here are WoDX's reading of it (house wording).
 * Banality 10: no way in. A creature with no Glamour of its own gets in only if enchanted.
 */
export const MIST_STEPS = [
  {min: 5, entry: "Steps through at once, clear-headed.", leave: "Remembers it all, and goes on remembering."},
  {min: 2, entry: "A moment of confusion at the threshold, gone in a few breaths.", leave: "Remembers it clearly for a day, then the edges blur."},
  {min: 0, entry: "Dazed for the scene: +1 difficulty on Perception and Wits rolls.", leave: "Remembers it like a vivid dream: the main of it, not the details."},
  {min: -3, entry: "Lost in the Mists for a while: wanders, and needs leading.", leave: "Keeps only fragments, and explains them away."},
  {min: -Infinity, entry: "Overwhelmed: the Mists hold the mind for a long time, perhaps for good.", leave: "Forgets it entirely."}
];
export function mists({glamour = 0, banality = 0, enchanted = false, fae = false} = {}) {
  const g = n(glamour), b = n(banality);
  if ( b >= 10 ) return {canEnter: false, why: "Banality 10: the Dreaming is closed to them.", score: g - b};
  if ( !fae && g <= 0 && !enchanted ) return {canEnter: false, why: "Without Glamour of their own they need to be enchanted first.", score: g - b};
  const score = g - b;
  const step = MIST_STEPS.find(s => score >= s.min);
  return {canEnter: true, score, entry: step.entry, leave: step.leave, step: MIST_STEPS.indexOf(step)};
}

/* ------------------------------------------------------------------ */
/*  Trods (C20 pdf 53, 309-310 / pp. 52, 308-309)                     */
/* ------------------------------------------------------------------ */

export const TRODS = {
  silver: {label: "The Silver Path", note: "Dark-kin and Thallain on it lose 1 Glamour a turn, then health; they spend 1 more Glamour to attack a protected traveller, or take -2 dice. A changeling may let one creature pass for 1 Glamour, for this trod."},
  balor: {label: "A Path of Balor", note: "Old and one-way; black paths run to the Shadowlands."},
  twilight: {label: "A twilight road", note: "Its gateways are guarded."}
};
export const GATE_KINDS = {
  near: "A Near Dreaming gateway: a simple task opens it (a tapped pattern, an easy riddle, a song).",
  far: "A Far Dreaming gateway: it opens only at set times, after a hard riddle, or for a Treasure of up to 2.",
  shifting: "A shifting gateway: it realigns to a new trod a few minutes after each use."
};

/**
 * Time on a trod is unreliable (C20 pdf 53 / p. 52; the book gives no table). House figures, seeded: most trips take
 * the time planned; one in four runs fast or slow (half to double); one in ten loses or gains a day or more.
 * Returns {hours, slip: "none"|"fast"|"slow"|"lost", days}.
 */
export function trodTime(hours, rand = Math.random) {
  const h = Math.max(1, Number(hours) || 1);
  const r = rand();
  if ( r < 0.65 ) return {hours: h, slip: "none", days: 0};
  if ( r < 0.9 ) { const f = 0.5 + rand() * 1.5; return {hours: Math.max(1, Math.round(h * f)), slip: f < 1 ? "fast" : "slow", days: 0}; }
  const days = 1 + Math.floor(rand() * 7);
  return {hours: h + days * 24, slip: "lost", days};
}

/** Wayfare 3 with Fae 5 opens a portal onto a random Near Dreaming trod; 5 successes (extended) pick the road; a botch goes somewhere dangerous. */
export function wayfarePortal({successes = 0, botch = false} = {}) {
  if ( botch ) return {open: true, chosen: false, danger: true};
  const s = n(successes);
  return {open: s > 0, chosen: s >= 5, danger: false};
}

/* ------------------------------------------------------------------ */
/*  The moon's roads (W20 pdf 313, 321-322, 209 / pp. 311, 319-320, 207) */
/* ------------------------------------------------------------------ */

/** How the moon's phase changes the hazards of a Moon Path or Bridge: safest at the full moon (house figures). Index 0 new ... 4 full. */
export function moonRisk(index) {
  const i = ((n(index) % 8) + 8) % 8;
  const d = Math.min(i, 8 - i);           // 0 new ... 4 full
  return [1.5, 1.25, 1, 0.75, 0.5][d];
}
export const CAERNS = {1: {gauntlet: 4, reach: 1000}, 2: {gauntlet: 4, reach: 2000}, 3: {gauntlet: 3, reach: 3000}, 4: {gauntlet: 3, reach: 6000}, 5: {gauntlet: 2, reach: 10000}};
export const bridgeReach = level => CAERNS[Math.min(5, Math.max(1, n(level)))].reach;

/** The Rite of the Opened Bridge: Wits + Enigmas at 8 - the ritemaster's caern level, +3 dice for a matching totem, +1 difficulty after a failure; successes equal to the far caern's level. */
export function openedBridge({wits = 0, enigmas = 0, caern = 1, target = 1, totemMatch = false, failedBefore = false} = {}) {
  return {pool: n(wits) + n(enigmas) + (totemMatch ? 3 : 0), diff: Math.min(10, Math.max(3, 8 - n(caern) + (failedBefore ? 1 : 0))), need: Math.max(1, n(target))};
}
export function openedBridgeResult(plan, dice) {
  const c = count(dice, plan.diff);
  return {...c, open: c.successes >= plan.need, renew: "every 13 moons", speed: "a thousandth of the time"};
}

/* ------------------------------------------------------------------ */
/*  The Avatar Storm (M20 pdf 480-481 / pp. 479-480)                   */
/* ------------------------------------------------------------------ */

export const STORM_MODES = {auto: "By the date (from the Avatar Storm in the chronicle's events)", on: "Raging", fading: "Fading", off: "Never happened"};
/** Is the Storm in force? mode: the setting; fired: whether the Avatar Storm event has fired. */
export function stormState(mode = "auto", fired = false) {
  if ( mode === "off" ) return {on: false, fading: false};
  if ( mode === "on" ) return {on: true, fading: false};
  if ( mode === "fading" ) return {on: true, fading: true};
  return {on: !!fired, fading: false};
}
/** Who the Storm leaves alone: spirits, shapechangers, unAwakened sorcerers (a sting only), astral travellers. */
export function stormHurts({type = "", sorcerer = false, astral = false, wyck = false} = {}) {
  if ( astral || wyck ) return false;
  if ( sorcerer ) return false;
  return type === "Mage";
}
/**
 * Shredding Winds: permanent Paradox + Arete at 6, each success a level of aggravated damage (lethal or bashing while
 * the Storm fades, at the Storyteller's word). Shield of the Soul leaves only the Paradox dice.
 */
export function shredding({paradox = 0, arete = 0, shield = false, fading = false} = {}, dice) {
  const pool = n(paradox) + (shield ? 0 : n(arete));
  const c = dice ? count(dice, 6) : null;
  return {pool, diff: 6, damage: fading ? "lethal or bashing (the Storm is fading)" : "aggravated", ...(c ? {levels: c.successes, botch: c.botch} : {})};
}
/** An Effect sent across the Gauntlet: the Storyteller rolls the Shredding dice on the caster's Arete at 6; each success takes one from the spell. */
export function acrossGauntlet(arete, dice) {
  return {pool: n(arete), diff: 6, ...(dice ? {lost: count(dice, 6).successes} : {})};
}

/* ------------------------------------------------------------------ */
/*  The Great Maelstroms by the chronicle's events (Wraith 20th)       */
/* ------------------------------------------------------------------ */

/** Each Great Maelstrom WoDX dates: the event id that starts it and the years it rages (house spans). */
export const GREAT_MAELSTROMS = [
  {id: "black-death", name: "the Second Great Maelstrom", from: 1347, to: 1352},
  {id: "third-great-maelstrom", name: "the Third Great Maelstrom", from: 1600, to: 1601},
  {id: "fourth-great-maelstrom", name: "the Fourth Great Maelstrom", from: 1916, to: 1918},
  {id: "fifth-great-maelstrom", name: "the Fifth Great Maelstrom", from: 1945, to: 1945},
  {id: "sixth-great-maelstrom", name: "the Sixth Great Maelstrom", from: 1999, to: 2000}
];
/** The Great Maelstrom raging in a year, or null. fired: the event ids that have fired, or null to go by the years alone. */
export function greatMaelstrom(year, fired = null) {
  const y = Number(year);
  if ( !Number.isFinite(y) ) return null;
  const m = GREAT_MAELSTROMS.find(g => y >= g.from && y <= g.to && (!fired || fired.includes(g.id)));
  return m?.name ?? null;
}
/** Maelstrom damage dice by bells (Wr20 pdf 361 / p. 296); a Great Maelstrom is run as five bells. */
export const BELLS = {1: 4, 2: 6, 3: 8, 4: 12, 5: 16};
export function maelstromDice(bells, {haunt = 0} = {}) {
  const b = Math.min(5, Math.max(1, n(bells)));
  const left = b - n(haunt);
  return {dice: BELLS[b], sheltered: n(haunt) > 0 && left <= 0, breaksAfterHours: n(haunt) > 0 && left > 0 ? n(haunt) : 0};
}

/* ------------------------------------------------------------------ */
/*  Disembodiment (M20 pdf 89-90 / pp. 88-89)                          */
/* ------------------------------------------------------------------ */

/** Three phases of the moon, about three months: the only figure the book gives. Nothing past that is a rule. */
export const DISEMBODY_DAYS = 3 * 29.53059;
export function disembodiment(seconds) {
  if ( !Number.isFinite(Number(seconds)) || seconds === null ) return {known: false, days: 0, due: false};
  const days = Math.max(0, Number(seconds)) / 86400;
  return {known: true, days, due: days >= DISEMBODY_DAYS, left: Math.max(0, DISEMBODY_DAYS - days)};
}

/* ------------------------------------------------------------------ */
/*  The Net (World of Future Darkness, scan pp. 9)                      */
/* ------------------------------------------------------------------ */

/** The years the Net can be entered (house rule: the article sets it in the future; WoDX opens it from 1990). */
export const NET_FROM = 1990;
export const netOpen = year => Number(year) >= NET_FROM;
/** A system's Traits: 3 dots of Intelligence for each 2 CPUs (at least 1), always Computer 5. */
export const netSystem = cpus => ({intelligence: Math.max(1, Math.floor(n(cpus) * 3 / 2)), computer: 5});
/** Net combat: Intelligence + Computer at 6, each side; Program Strength adds automatic successes. */
export function netPool({intelligence = 0, computer = 0, program = 0} = {}) {
  return {pool: n(intelligence) + n(computer), diff: 6, auto: n(program)};
}
/**
 * One exchange: the side with more successes deals the difference as damage dice; the loser soaks with Wits plus any
 * protection program's strength. Returns {winner: "a"|"b"|null, damageDice, soakPool}.
 */
export function netExchange(a, b, diceA, diceB, {witsA = 0, witsB = 0, protectA = 0, protectB = 0} = {}) {
  const sa = count(diceA, 6).successes + n(a.program), sb = count(diceB, 6).successes + n(b.program);
  if ( sa === sb ) return {winner: null, a: sa, b: sb, damageDice: 0, soakPool: 0};
  const aWins = sa > sb;
  return {winner: aWins ? "a" : "b", a: sa, b: sb, damageDice: Math.abs(sa - sb), soakPool: aWins ? n(witsB) + n(protectB) : n(witsA) + n(protectA)};
}
/** A program test (evasion, stealth, detection, intrusion, decryption): Computer + Program Strength against the system's Intelligence + its program, each at 6. */
export function programTest(user, system) {
  return {userPool: n(user.computer) + n(user.program), systemPool: n(system.intelligence) + n(system.program), diff: 6};
}

/* ------------------------------------------------------------------ */
/*  Layer sound                                                        */
/* ------------------------------------------------------------------ */

/** The loop a client plays for the world its token stands in: <root>/<layer>.ogg (the Storyteller's own files). */
export const LAYER_SOUNDS = ["penumbra", "shadowlands", "dreaming", "net"];
export function layerSoundFor({layer = "physical", inNet = false} = {}, root = "wodx-kits/layers") {
  const k = inNet ? "net" : layer;
  return LAYER_SOUNDS.includes(k) ? `${String(root).replace(/\/+$/, "")}/${k}.ogg` : null;
}
