/**
 * WoDX Interactables: carrying and dragging the fallen, and moving large things (B5070 to B5086, Ben's Carry Bodies
 * Desk, 14 November 2026). Pure rules, no Foundry calls; haul.mjs does the Foundry side.
 *
 *   Who       Anyone in reach of a character who is Incapacitated, unconscious, asleep, staked, in torpor or dead can
 *             carry or drag them (B5070).
 *   Lifting   The VtDA20 lifting chart (p. 335) gives what a Strength lifts. Strength counts Potence and the boosts the
 *             sheet already adds (Crinos and the other forms). Two or more together add their Strength. Under the
 *             chart's weight: carry; over it: drag (B5071).
 *   Pace      Half pace carrying, quarter pace dragging, no roll for a body (B5072).
 *   Hands     Carrying takes two hands, dragging, hauling and pulling something light one; pushing something past
 *             the chart takes two. A body with more hands keeps the rest free (B5073).
 *   Fights    +1 difficulty to dodge with a burden; letting go is free; knocked down, dazed or stunned drops it (B5074).
 *   Things    Made-map furniture and heavy stores move; walls, doors and fixed fittings stay (B5080). Under the chart:
 *             half pace, no roll. Up to two steps over: quarter pace and Strength + Athletics at 6 each turn. Past
 *             that it will not budge until others take hold and add their Strength (B5081).
 *   Wheels    A cart, barrow or wagon counts as half its load; mud, snow and rubble double it again; no stairs or
 *             ladders (B5082).
 *   Noise     Dragging heavy furniture is loud each turn; dragging a body is quiet; carrying is silent (B5083).
 *   Piles     A sack, a basket, a crate or a barrel of goods is hauled along at half pace with one hand (B5084).
 *   Doorways  A thing pushed into a doorway blocks it and is good cover; shoving it aside is a feat on the same chart
 *             (B5085). No general encumbrance: only bodies and large things use these rules (B5086).
 * The weights are house figures: the books give none for bodies or furniture (docs/PENDING-REVIEW.md).
 */

/** The lifting chart, VtDA20 p. 335: [Strength, kg]. Past 15 each dot adds 450 kg (house reading). */
export const CHART = [[1, 20], [2, 45], [3, 115], [4, 180], [5, 295], [6, 360], [7, 410], [8, 455], [9, 545], [10, 680],
  [11, 910], [12, 1360], [13, 1815], [14, 2265], [15, 2720]];
const num = v => Number(v) || 0;

/** What a Strength lifts, in kg (0 for none). */
export function liftKg(level) {
  const l = Math.floor(num(level));
  if ( l <= 0 ) return 0;
  if ( l <= 15 ) return CHART[l - 1][1];
  return 2720 + (l - 15) * 450;
}
/** The least Strength that lifts a weight. */
export function levelFor(kg) {
  const w = Math.max(0, num(kg));
  if ( w <= 0 ) return 0;
  for ( const [l, k] of CHART ) if ( k >= w ) return l;
  return 15 + Math.ceil((w - 2720) / 450);
}
/** Strength for lifting: the dots (with what the sheet adds) and Potence. */
export const liftStrength = ({strength = 0, potence = 0} = {}) => Math.max(0, num(strength)) + Math.max(0, num(potence));
/** Two or more together: their Strength added (B5071). */
export const teamStrength = (list = []) => list.reduce((t, c) => t + liftStrength(c), 0);
/** Steps of the chart a weight is past a Strength (0 when it is lifted). */
export const stepsOver = (kg, level) => Math.max(0, levelFor(kg) - Math.floor(num(level)));

/* ------------------------------------------------------------------ */
/*  The fallen (B5070)                                                 */
/* ------------------------------------------------------------------ */

/** Token statuses that mean a character can be carried: Foundry's own and WoDX Chronicle's (wodx- prefix). */
export const FALLEN = {"dead": "dead", "unconscious": "unconscious", "sleep": "asleep", "wodx-incapacitated": "incapacitated",
  "wodx-staked": "staked", "wodx-torpor": "in torpor", "paralysis": "paralysed"};
/** Health levels that leave a mortal body Incapacitated (seven filled boxes). */
export const DOWN_AT = 7;
/**
 * Is a character down? statuses: their token statuses; wounds: health levels filled; asleep: WoDX NPC's routine says
 * they sleep, or the day-sleep has them. -> {down, why}
 */
export function fallenOf({statuses = [], wounds = 0, asleep = false} = {}) {
  const set = new Set(statuses instanceof Set ? [...statuses] : statuses);
  for ( const [id, why] of Object.entries(FALLEN) ) if ( set.has(id) ) return {down: true, why};
  if ( num(wounds) >= DOWN_AT ) return {down: true, why: "incapacitated"};
  if ( asleep ) return {down: true, why: "asleep"};
  return {down: false, why: ""};
}

/* ------------------------------------------------------------------ */
/*  Weight of a body (B5071, house figures)                            */
/* ------------------------------------------------------------------ */

/** A grown person, and by the age bands WoDX Paperdoll draws (figure-rules GROWTH). */
export const PERSON_KG = {"": 70, youth: 60, young: 45, child: 30, small: 15};
/** Shapes from WoDX Combat's body rules. null: nothing there to carry (mist, a body in the earth). */
export const SHAPE_KG = {glabro: 110, crinos: 300, hispo: 180, lupus: 50, wolf: 45, bat: 1, rat: 1, bird: 2, serpent: 6, fish: 8, spider: 1,
  zulo: 160, chiropteran: 140, mist: null, earth: null};
/** A creature by the squares its token takes (a dog in one, a horse in two, an ox or a bear in three). */
export const CREATURE_KG = [[1, 40], [2, 450], [3, 900], [4, 2500]];
/**
 * What a body weighs. view: {creature, squares, shape, growth, intangible}. -> {kg, can, why}
 */
export function bodyKg(view = {}) {
  if ( view.intangible ) return {kg: 0, can: false, why: "there is no body to take hold of"};
  if ( view.shape && Object.hasOwn(SHAPE_KG, view.shape) ) {
    const kg = SHAPE_KG[view.shape];
    if ( kg === null ) return {kg: 0, can: false, why: view.shape === "earth" ? "they are in the earth" : "there is no body to take hold of"};
    return {kg, can: true, why: ""};
  }
  if ( view.creature ) {
    const sq = Math.max(1, Math.round(num(view.squares) || 1));
    const row = CREATURE_KG.find(([s]) => s >= sq) ?? CREATURE_KG[CREATURE_KG.length - 1];
    return {kg: row[1], can: true, why: ""};
  }
  return {kg: PERSON_KG[view.growth] ?? PERSON_KG[""], can: true, why: ""};
}

/* ------------------------------------------------------------------ */
/*  Large things (B5080)                                               */
/* ------------------------------------------------------------------ */

/** Containers, empty (house figures), plus a kilo for each thing inside. */
export const CONTAINER_KG = {chest: 30, box: 25, cabinet: 60, drawers: 45, strongbox: 25, safe: 400};
/** A hiding place that is furniture. The rest (curtains, shadows, a loft, a priest hole) are part of the house. */
export const HIDE_KG = {wardrobe: 70, bed: 50};
/** Cover that moves: a table. Counters, bars, barricades and walls are built in. */
export const COVER_KG = {table: 30};
/** Mounts and vehicles that can be pushed by hand when nobody is at the reins. Wheels: they roll. */
export const VEHICLE_KG = {cart: 250, carriage: 600, motorbike: 180, car: 1100};
/** Piles: the box kind (a crate, a barrel, a sack, a basket) is hauled, not pushed (B5084). */
export const PILE_KINDS = new Set(["box"]);
/**
 * What a tile is as a thing to move. f: the tile's flags.wodx-interactables; items: how many things are inside.
 * -> null (it does not move) or {kg, label, wheels, pile, ground}
 * The Storyteller's own setting wins: haulFixed keeps it still, haulKg sets its weight and makes any tile movable,
 * haulWheels puts it on wheels (B5080).
 */
export function thingOf(f = {}, items = 0) {
  if ( !f || f.haulFixed ) return null;
  const extra = Math.max(0, num(items));
  const own = num(f.haulKg) > 0 ? num(f.haulKg) : null;
  let kg = null, label = "", wheels = !!f.haulWheels, pile = false;
  if ( f.container ) {
    const k = CONTAINER_KG[f.kind] !== undefined ? f.kind : "box";
    kg = CONTAINER_KG[k] + extra;
    // a barrel full of ale is heavy; an open sack is light
    if ( k === "box" && f.material === "heavy" ) kg = 100 + extra;
    else if ( k === "box" && f.ds === "open" ) kg = 15 + extra;
    label = {chest: "chest", box: f.material === "heavy" ? "barrel" : f.ds === "open" ? "sack" : "crate", cabinet: "cabinet", drawers: "desk", strongbox: "strongbox", safe: "safe"}[k];
    pile = PILE_KINDS.has(k);
  } else if ( f.hide && HIDE_KG[f.hideKind] ) {
    kg = HIDE_KG[f.hideKind]; label = f.hideKind === "bed" ? "bed" : "wardrobe";
  } else if ( f.cover && COVER_KG[f.coverKind ?? "table"] ) {
    kg = COVER_KG[f.coverKind ?? "table"]; label = "table";
  } else if ( f.mount && VEHICLE_KG[f.mountKind] ) {
    kg = VEHICLE_KG[f.mountKind]; label = {cart: "cart", carriage: "carriage", motorbike: "motorcycle", car: "motor car"}[f.mountKind]; wheels = true;
  }
  if ( own !== null ) kg = own;
  if ( kg === null ) return null;
  return {kg, label: String(f.title ?? "").trim() || label || "thing", wheels, pile};
}

/* ------------------------------------------------------------------ */
/*  Wheels and ground (B5082)                                          */
/* ------------------------------------------------------------------ */

/** Ground words in a region's name or a scene's ground that double a wheeled load. */
export const ROUGH = /\b(mud|muddy|bog|marsh|snow|snowy|rubble|ruin|ruins|scree|sand|sandy|ploughed|plowed)\b/i;
/** The weight that counts for a move: on wheels half, and doubled again on rough ground. */
export function movingKg({kg = 0, wheels = false, rough = false} = {}) {
  const w = Math.max(0, num(kg));
  if ( !wheels ) return w;
  return rough ? w : w / 2;
}

/* ------------------------------------------------------------------ */
/*  The move (B5071, B5072, B5081, B5084)                              */
/* ------------------------------------------------------------------ */

export const PACE = {carry: 0.5, drag: 0.25, haul: 0.5, push: 0.5, strain: 0.25};
export const WORDS = {carry: "carrying", drag: "dragging", haul: "hauling", push: "pushing", strain: "straining at"};
/** Steps over the chart at which a thing still moves, with a roll each turn. */
export const STRAIN_STEPS = 2;
export const ROLL = {attr: "strength", ability: "athletics", diff: 6};

/**
 * How a load moves. kind: "body" or "thing"; kg: what it weighs as moved (movingKg); strength: the team's lifting
 * Strength; want: "carry" or "drag" for a body, "push" or "haul" for a thing; pile: a pile (hauled).
 * -> {mode, factor, roll (a Strength + Athletics roll each turn), budge (false: it will not move), over (steps),
 *     need (Strength still wanted to move it at all), note}
 */
export function moveOf({kind = "body", kg = 0, strength = 0, want = "", pile = false} = {}) {
  const over = stepsOver(kg, strength);
  const need = Math.max(0, levelFor(kg) - STRAIN_STEPS - Math.floor(num(strength)));
  if ( over > STRAIN_STEPS ) return {mode: "none", factor: 0, roll: false, budge: false, over, need,
    note: `too heavy: it needs ${need} more Strength (others can take hold and add theirs)`};
  if ( kind === "body" ) {
    // A body: carried if the chart lifts it and that is what was asked for; otherwise dragged, no roll (B5072)
    const mode = over === 0 && want !== "drag" ? "carry" : "drag";
    return {mode, factor: PACE[mode], roll: false, budge: true, over, need: 0, note: mode === "carry" ? "half pace" : "quarter pace"};
  }
  const base = pile || want === "haul" ? "haul" : "push";
  if ( over === 0 ) return {mode: base, factor: PACE[base], roll: false, budge: true, over, need: 0, note: "half pace, no roll"};
  return {mode: "strain", factor: PACE.strain, roll: true, budge: true, over, need: 0,
    note: `quarter pace, and Strength + Athletics at ${ROLL.diff} each turn (${over} step${over === 1 ? "" : "s"} past the chart)`};
}

/** Hands a load takes (B5073): carrying a body or straining at a heavy thing takes two; the rest take one. */
export const HANDS = {carry: 2, drag: 1, haul: 1, push: 1, strain: 2};
/** The hands a character still has free. hands: how many their body has (WoDX Combat's body: two for a person). */
export const handsFree = (hands = 2, mode = "") => Math.max(0, Math.round(num(hands)) - (HANDS[mode] ?? 0));

/**
 * What a burden does to an attack with a weapon (B5073). free: hands free; hands: hands the body has; weapon:
 * {twoHanded, melee, natural (claws, fangs: no hands)}; ambidextrous: the Merit.
 * -> {blocked (why, or ""), diff, note}
 */
export function attackWith({free = 2, hands = 2, weapon = {}, ambidextrous = false, mode = ""} = {}) {
  if ( !mode ) return {blocked: "", diff: 0, note: ""};
  const what = WORDS[mode] ?? "holding something";
  if ( weapon?.natural ) return {blocked: "", diff: 0, note: ""};
  const needs = weapon?.twoHanded ? 2 : 1;
  if ( free < needs ) return {blocked: free ? `a two-handed weapon needs both hands, and one is ${what}` : `both hands are ${what}`, diff: 0, note: ""};
  // The off-hand rule: the hand that drags is the good one when there are only two (V20 p. 273, +1 unless Ambidextrous)
  if ( num(hands) <= 2 && free === 1 && !ambidextrous ) return {blocked: "", diff: 1, note: `${what[0].toUpperCase()}${what.slice(1)}: the off hand, +1 difficulty`};
  return {blocked: "", diff: 0, note: ""};
}
/** A shield needs a hand of its own beside the weapon (B5073). */
export const shieldHeld = ({free = 2, weaponHands = 1} = {}) => free >= Math.max(0, weaponHands) + 1;
/** +1 difficulty to dodge with any burden (B5074). */
export const DODGE = 1;

/* ------------------------------------------------------------------ */
/*  Noise (B5083)                                                      */
/* ------------------------------------------------------------------ */

/** What a turn of moving it sounds like: heavy furniture scraping is loud, a cart creaks, a body drags quietly. */
export function noiseOf({kind = "body", mode = "carry", kg = 0, wheels = false} = {}) {
  if ( kind === "body" ) return mode === "carry" ? "silent" : "quiet";
  if ( wheels ) return "quiet";
  return num(kg) >= 20 ? "loud" : "quiet";
}

/* ------------------------------------------------------------------ */
/*  Waking while carried (B5078)                                       */
/* ------------------------------------------------------------------ */

/** Struggling free: Strength + Athletics at 6 against the carrier's Strength at 6; more successes win. */
export const STRUGGLE = {own: ["strength", "athletics"], carrier: ["strength"], diff: 6};
export const struggleWins = (mine = 0, theirs = 0) => num(mine) > num(theirs);

/* ------------------------------------------------------------------ */
/*  Shapes on the map (B5075, B5085)                                   */
/* ------------------------------------------------------------------ */

/** How a carried or dragged body looks: tilted across the carrier's square, or lying behind the one dragging it. */
export const LOOK = {carry: {rotation: 90, alpha: 0.6}, drag: {rotation: 90, alpha: 0.85}};
/** A bleeding body (lethal or aggravated damage, or dead) leaves blood; the rest leave scuffs. */
export const bleeds = ({lethal = 0, aggravated = 0, dead = false} = {}) => !!dead || num(lethal) + num(aggravated) > 0;
/** Trail colours: blood and scuffs. */
export const TRAIL = {blood: {color: "#7a0d0d", alpha: 0.75, width: 10}, scuff: {color: "#5a4a38", alpha: 0.4, width: 6}};

/** Where a dragged body lies: a square behind the one dragging it, against the way they went. */
export function behind(to, from, size = 100) {
  const dx = num(to.x) - num(from.x), dy = num(to.y) - num(from.y), d = Math.hypot(dx, dy);
  if ( !d ) return {x: num(to.x), y: num(to.y) + size};
  return {x: num(to.x) - Math.round(dx / d) * size, y: num(to.y) - Math.round(dy / d) * size};
}

/** Does a rectangle {x, y, w, h} sit over a door's middle? A door: wall ends c [x1, y1, x2, y2]. pad: pixels. */
export function overDoor(rect, c, pad = 0) {
  if ( !Array.isArray(c) || c.length < 4 ) return false;
  const mx = (c[0] + c[2]) / 2, my = (c[1] + c[3]) / 2;
  return mx >= rect.x - pad && mx <= rect.x + rect.w + pad && my >= rect.y - pad && my <= rect.y + rect.h + pad;
}
/** A barricade in a doorway is good cover (V20 pdf p. 286), and a solid thing blocks sight as well (B5085). */
export const BARRICADE_COVER = 2;
export const SEE_THROUGH = new Set(["table", "cart", "carriage", "motorcycle", "motor car"]);

/**
 * Where the floor under a baked-in thing is copied from when it moves: the patch beside it, on the side away from
 * where it went, kept inside the scene. rect: where it stood; to: where it is now; bounds: the scene's rectangle.
 */
export function floorPatch(rect, to, bounds) {
  const dx = num(to.x) - num(rect.x), dy = num(to.y) - num(rect.y);
  const tries = [];
  if ( Math.abs(dx) >= Math.abs(dy) ) tries.push([dx > 0 ? -1 : 1, 0], [0, -1], [0, 1], [dx > 0 ? 1 : -1, 0]);
  else tries.push([0, dy > 0 ? -1 : 1], [-1, 0], [1, 0], [0, dy > 0 ? 1 : -1]);
  const inside = r => !bounds || (r.x >= bounds.x && r.y >= bounds.y && r.x + r.w <= bounds.x + bounds.w && r.y + r.h <= bounds.y + bounds.h);
  for ( const [sx, sy] of tries ) {
    const r = {x: rect.x + sx * rect.w, y: rect.y + sy * rect.h, w: rect.w, h: rect.h};
    if ( inside(r) ) return r;
  }
  return null;
}
