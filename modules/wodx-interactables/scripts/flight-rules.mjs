/**
 * WoDX Interactables: flight (decisions B6620 to B6629). Pure rules, no Foundry, so the harness can test them;
 * flight.mjs does the Foundry side.
 *
 * Before this, an aircraft on the map had no height: its "air" flag only took the ground out of its rolls. Now a
 * flying mount or vehicle has an altitude, kept as the elevation of its token or tile and of everyone aboard, set by the
 * one at the controls (their token's elevation). What the books give:
 *   - falling: a die of bashing for every 10 feet, 10 dice at most; from 100 feet it is lethal (V20 core pdf p. 304);
 *   - a crash hurts those inside by its dice less the vehicle's Durability, halved when strapped in, and aircraft
 *     strap everyone in (Mage 20th p. 459, as WoDX Combat's vehicle-rules has it);
 *   - aircraft need Pilot to fly at all (Mage 20th p. 462);
 *   - a hover bike flies no higher than 20 metres and carries no cargo in the air (Cyberpunk 2020 Concrete Jungle
 *     pdf p. 40);
 *   - an AV does not glide: with its engines gone it drops (Cyberpunk 2020 Forlorn Hope pdf p. 72);
 *   - a fast flight low through hills at night is a Pilot roll; a failure goes astray, a fumble crashes; the AV-4's
 *     terrain-following radar makes it possible at all (Forlorn Hope pdf p. 67).
 * The rest are house readings, named where they are used (B6622 to B6627).
 */

/** Feet in a metre, and the hover bike's ceiling (20 metres, Concrete Jungle pdf p. 40). */
export const FT_PER_M = 3.28084;
export const HOVERBIKE_CEILING = Math.round(20 * FT_PER_M);

/**
 * B6622: how each flying kind flies. ceiling: feet above the ground (house figures, kept high enough never to matter
 * on a map, but for the hover bike's book figure); hovers: it can hang still and go straight up or down (a
 * helicopter, an aerodyne, a balloon, a winged beast); unpiloted: what it does with nobody at the controls:
 *   "drops"  it falls at once: an aerodyne's fans hold it up only while someone flies it (Forlorn Hope pdf p. 72);
 *   "glides" an aeroplane or a jet comes down slowly; someone must take the controls before it lands hard;
 *   "spins"  a helicopter autorotates down, a hard landing but not a fall (house reading);
 *   "drifts" a balloon goes with the wind;
 *   "flies"  a beast flies on by itself.
 * skill: the Ability that flies it (a hover bike is ridden with Drive, flown with Pilot).
 */
export const FLYERS = {
  balloon:    {ceiling: 10000, hovers: true, unpiloted: "drifts", skill: "pilot"},
  plane:      {ceiling: 15000, hovers: false, unpiloted: "glides", skill: "pilot"},
  helicopter: {ceiling: 10000, hovers: true, unpiloted: "spins", skill: "pilot"},
  jet:        {ceiling: 45000, hovers: false, unpiloted: "glides", skill: "pilot"},
  gryphon:    {ceiling: 3000, hovers: true, unpiloted: "flies", skill: "ride"},
  aerodyne:   {ceiling: 10000, hovers: true, unpiloted: "drops", skill: "pilot"},
  assaultav:  {ceiling: 10000, hovers: true, unpiloted: "drops", skill: "pilot", radar: true},
  hoverbike:  {ceiling: HOVERBIKE_CEILING, hovers: true, unpiloted: "drops", skill: "pilot", dual: true}
};
export const flies = kind => !!FLYERS[kind];

/**
 * B6623: bands of height above the ground. low: among the rooftops and the treetops, where the ground below still
 * gets in the way (its difficulty and its cover count in a chase); over: above the rooftops, open sky; high: out of
 * reach of most hands and small arms (WoDX Targeting already counts the height in every range). House figures.
 */
export const BANDS = [
  {id: "ground", to: 1, label: "On the ground"},
  {id: "low", to: 50, label: "Low, among the rooftops"},
  {id: "over", to: 300, label: "Over the rooftops"},
  {id: "high", to: Infinity, label: "High above"}
];
export function bandOf(feet) {
  const f = Math.max(0, Number(feet) || 0);
  return BANDS.find(b => f < b.to) ?? BANDS[BANDS.length - 1];
}
export const airborne = feet => (Number(feet) || 0) >= 1;

/**
 * The height the one at the controls asks for, held by what the kind can do. kind; ground: the floor under it
 * (feet); want: the elevation asked for (feet); pilotDots: the flier's dots in the Ability that flies it.
 * -> {to (elevation, feet), held: null|"cannot"|"ceiling"|"untrained", note, takeoff, landing}
 */
export function climb(kind, {ground = 0, from = 0, want = 0, pilotDots = 1} = {}) {
  const F = FLYERS[kind], g = Number(ground) || 0, w = Number(want) || 0, f = Number(from) || 0;
  if ( !F ) return {to: g, held: w > g ? "cannot" : null, note: w > g ? "It cannot leave the ground." : "", takeoff: false, landing: false};
  let to = Math.max(g, w), held = null, note = "";
  if ( to > g && (Number(pilotDots) || 0) < 1 ) {
    to = g; held = "untrained";
    note = F.dual ? "Its fans stay folded: flying the hover bike takes Pilot, not Drive (Concrete Jungle pdf p. 40)." : "Nobody flies one without Pilot (Mage 20th p. 462).";
  } else if ( to - g > F.ceiling ) {
    to = g + F.ceiling; held = "ceiling";
    note = F.dual ? `The hover bike goes no higher than 20 metres (${HOVERBIKE_CEILING} feet) above the ground (Concrete Jungle pdf p. 40).` : `It goes no higher than ${F.ceiling} feet.`;
  }
  return {to, held, note, takeoff: f - g < 1 && to - g >= 1, landing: f - g >= 1 && to - g < 1};
}

/** Falling, as V20 core pdf p. 304: a die of bashing every 10 feet, 10 at most; 100 feet or more is lethal. */
export function fallDice(feet) {
  const f = Math.max(0, Number(feet) || 0);
  return {dice: Math.min(10, Math.floor(f / 10)), type: f >= 100 ? "lethal" : "bashing"};
}

/**
 * B6624: a flying vehicle that comes down out of control (wrecked in the air, or an AV with nobody flying it). Everyone
 * aboard takes the fall's dice (or, when it was flat out, the speed's: a die each 10 mph, the chase's crash dice,
 * whichever is more), less the vehicle's Durability when its body covers them, halved when strapped in (Mage 20th
 * p. 459; aircraft strap everyone in). A hover bike's body covers nobody (B6621). Fewer than 1 die is a bad jolt.
 * body: chase-rules bodyOf; feet: the height it falls; mph: its speed. -> {dice, type, parts}
 */
export function crashFall(kind, body, {feet = 0, mph = 0} = {}) {
  const fall = fallDice(feet), speed = Math.min(10, Math.floor((Number(mph) || 0) / 10));
  const raw = Math.max(fall.dice, speed);
  const parts = [fall.dice >= speed ? `${Math.round(feet)} feet: ${fall.dice} dice` : `${Math.round(mph)} mph: ${speed} dice`];
  let left = raw;
  if ( body?.shelter ) { left = Math.max(0, left - (Number(body.durability) || 0) - (Number(body.guard) || 0)); parts.push(`less its Durability ${body.durability}${body.guard ? ` and guard ${body.guard}` : ""}`); }
  if ( FLYERS[kind] && kind !== "gryphon" && kind !== "hoverbike" ) { left = Math.floor(left / 2); parts.push("halved, strapped in"); }
  return {dice: left, type: fall.type === "lethal" || raw >= 10 ? "lethal" : "bashing", parts};
}

/**
 * B6625: what happens when nobody is left at the controls in the air. -> {kind: FLYERS unpiloted, falls, note}
 */
export function unpiloted(kind, feet = 0) {
  const F = FLYERS[kind];
  if ( !F || !airborne(feet) ) return {kind: null, falls: false, note: ""};
  const note = {
    drops: "An AV does not glide: with nobody flying it, it drops (Forlorn Hope pdf p. 72).",
    glides: "It glides on, losing height: someone must take the controls before it comes down hard.",
    spins: "Its rotor turns in the wind and it sinks fast: someone must take the controls or it lands hard.",
    drifts: "It drifts with the wind.",
    flies: "The beast flies on by itself."
  }[F.unpiloted];
  return {kind: F.unpiloted, falls: F.unpiloted === "drops", note};
}

/**
 * B6626: flying low and fast. Below the rooftops a flier weaves among buildings and trees: in a chase the ground's own
 * difficulty and cover count for it as for a car (above them nothing gets in the way, as before); flat out down there
 * it is +1 more, the night's fast low flight of Forlorn Hope pdf p. 67, and terrain-following radar (an armoured AV)
 * takes that +1 off. alt: feet above the ground (undefined: not known, treated as high, as before B6622).
 * -> {low, diff, cover, parts}
 */
export function lowFlight(kind, alt, {groundDiff = 0, groundLabel = "", cover = false, flatOut = false} = {}) {
  if ( alt === undefined || alt === null || !Number.isFinite(Number(alt)) ) return {low: false, diff: 0, cover: false, parts: []};
  const b = bandOf(alt);
  if ( b.id !== "low" ) return {low: false, diff: 0, cover: false, parts: []};
  const parts = [];
  let diff = 0;
  if ( groundDiff ) { diff += groundDiff; parts.push(`flying low over ${String(groundLabel).toLowerCase()} +${groundDiff}`); }
  if ( flatOut && !FLYERS[kind]?.radar ) { diff += 1; parts.push("fast and low +1"); }
  return {low: true, diff, cover: !!cover, parts};
}

/**
 * B6627: where the shadow of a flier falls on the map, and how much its picture is lifted (Paperdoll draws both).
 * feet: height above the ground; grid: pixels a square; units: feet a square. The picture rises with the height up to
 * a square and a half (it is seen from above, so it cannot rise far); the shadow shrinks and fades as it climbs, and is
 * gone above the rooftops. -> {lift (px), shadow: {scale, alpha} or null}
 */
export function liftOf(feet, grid = 100, units = 5) {
  const f = Math.max(0, Number(feet) || 0), g = Number(grid) || 100, u = Number(units) || 5;
  if ( f < 1 ) return {lift: 0, shadow: null};
  const lift = Math.min(g * 1.5, (f / u) * g * 0.25);
  const t = Math.min(1, f / 300);
  return {lift: Math.round(lift), shadow: {scale: 1 - 0.5 * t, alpha: Math.max(0.12, 0.45 * (1 - t))}};
}
