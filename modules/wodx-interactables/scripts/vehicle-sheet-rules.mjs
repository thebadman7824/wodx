/**
 * WoDX Interactables: the vehicle's own sheet (decisions B4968 and B4969). Pure rules; vehicle-sheet.mjs does the
 * Foundry side. A vehicle is an actor of the module's own kind, "wodx-interactables.vehicle", on a token: it is got
 * into and driven as a mount tile is, and its figures come from the same tables (chase-rules: the chart's safe and top
 * speed and Maneuver, the body's Durability and Structure, Mage 20th pp. 458-463), for the year it was built, or the
 * chronicle's year when that is left blank. Damage is kept for the whole vehicle, as the book does, not by part.
 */
import {MOUNTS, hullState} from "./interact-rules.mjs";
import {bodyOf, chartOf, WAYS} from "./chase-rules.mjs";

export const VEHICLE_TYPE = "wodx-interactables.vehicle";

/** The kinds a vehicle sheet can be: the mount kinds that are not beasts. */
export const VEHICLE_KINDS = Object.keys(MOUNTS).filter(k => !MOUNTS[k].beast && !["horse", "mule"].includes(k));

/** Paint and finish, for the sheet and the sprite (B4969: different colours and styles, Ben 2026-11-14). */
export const COLOURS = {
  "": "As it comes", black: "Black", white: "White", grey: "Grey", silver: "Silver", red: "Red", maroon: "Maroon", blue: "Blue",
  navy: "Navy", green: "Green", olive: "Olive drab", brown: "Brown", tan: "Tan", cream: "Cream", yellow: "Yellow", orange: "Orange",
  rust: "Rusted", camo: "Camouflage", wood: "Varnished wood", brass: "Brass and lacquer"
};
export const STYLES = {
  "": "Plain", worn: "Worn", fine: "Fine", rugged: "Rugged", sporting: "Sporting", working: "Working", official: "Official (police, post, army)",
  luxury: "Luxury", hearse: "Hearse or funeral", taxi: "Cab or hire", armoured: "Up-armoured", custom: "Custom"
};

/** A vehicle's year for its figures: the year it was built, else the chronicle's. */
export const yearOf = (sys, chronicleYear = 0) => Number(sys?.built) > 0 ? Number(sys.built) : (Number(chronicleYear) || 0);

/**
 * Everything the sheet shows for a vehicle. sys: the actor's system data {kind, built, lost, burning, seats, lights};
 * -> {kind, label, year, body, chart, seats, hull (interact-rules hullState), skill, track: [{n, lost}]}
 */
export function figures(sys = {}, chronicleYear = 0) {
  const kind = VEHICLE_KINDS.includes(sys.kind) ? sys.kind : "car";
  const M = MOUNTS[kind], year = yearOf(sys, chronicleYear);
  const body = bodyOf(kind, year), chart = chartOf(kind, year);
  const speed = !chart && WAYS[kind]?.speed ? WAYS[kind].speed(year || 2000) : null;
  const structure = body?.structure ?? 0;
  const hull = hullState({lost: sys.lost, burning: sys.burning}, structure);
  const seats = Number(sys.seats) > 0 ? Math.min(40, Math.round(Number(sys.seats))) : M.seats;
  const track = Array.from({length: structure}, (_, i) => ({n: i + 1, lost: i < hull.lost}));
  return {kind, label: M.label, year, body, chart, speed, seats, hull, skill: M.skill, track, from: M.from ?? 0, early: !!(M.from && year && year < M.from)};
}

/** Marking the track: a click on box n sets n lost, a click on the last box lost takes one off. */
export function markTrack(lost = 0, n = 0, structure = 0) {
  const l = Math.max(0, Math.round(Number(lost) || 0)), k = Math.max(0, Math.min(Number(structure) || 0, Math.round(Number(n) || 0)));
  return k === l ? k - 1 : k;
}

/**
 * Headlights: a motor vehicle from 1900 lights the road ahead (house figures, B4969): the token's light, a cone ahead.
 * -> Foundry token light data, or null when it has none.
 */
export function headlights(kind, year, on = false) {
  const W = WAYS[kind];
  if ( !on || !W?.motor || (Number(year) || 0) < 1900 ) return null;
  const big = ["truck", "armoured", "tank"].includes(kind);
  return {dim: big ? 24 : 18, bright: big ? 10 : 8, angle: 70, color: "#ffe9b0", alpha: 0.35, animation: {type: null}};
}

/** Things in the hold: guns go on the weapon list of whoever is aboard; the rest is cargo. */
export const isMountedGun = item => item?.type === "Ranged Weapon" || item?.type === "Melee Weapon";
