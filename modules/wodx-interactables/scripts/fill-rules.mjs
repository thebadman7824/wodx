/**
 * WoDX Interactables 0.17.0: fill a container by place and era. No Foundry calls here.
 *
 * The Storyteller picks the kind of place (a home, an armoury, a church, a workshop, a den, a camp, a clinic) and how
 * many things; a draw from WoDX Library's Gear by era for the chronicle's era comes back for review, and only what
 * the Storyteller keeps goes in. Guns too big to carry, ship and siege gear and parries are never drawn; cyberware
 * only in a clinic. A small container (a box, drawers, a strongbox, a safe) only takes what can be hidden in a
 * coat or smaller.
 * 0.20.0: the place starts at a first guess: the container's own fill place (a generated map's file can set it), else
 * the WoDX NPC place tag of the region it sits in, else the scene's tag, else a home. The Storyteller can change it.
 */

/** What kind of thing an item of Gear by era is, or null when it never goes in a container. */
export function categoryOf(item) {
  const f = item?.flags?.["wodx-library"] ?? {};
  const kind = String(f.kind ?? "").toLowerCase(), type = item?.type;
  if ( /heavy|ship|crew-served|exoskeleton|exoarmor|parry/.test(kind) ) return null;
  if ( f.cyber || f.implant || f.surgery || /cyber|implant|bioware/.test(kind) ) return "cyber";
  if ( /shield/.test(kind) ) return "shield";
  if ( type === "Armor" || /^armor/.test(kind) ) return "armor";
  if ( /thrown/.test(kind) ) return "thrown";
  if ( type === "Ranged Weapon" || /^ranged/.test(kind) ) return "ranged";
  if ( type === "Melee Weapon" || /^melee/.test(kind) ) return "melee";
  return null;
}

/** How likely each kind of thing is in each kind of place (0: never). */
export const PLACES = {
  home: {label: "A home", w: {melee: 3, ranged: 1, thrown: 1, armor: 0, shield: 0, cyber: 0}},
  armory: {label: "An armoury, guardhouse or barracks", w: {melee: 3, ranged: 3, thrown: 2, armor: 3, shield: 2, cyber: 0}},
  church: {label: "A church, chapel or monastery", w: {melee: 1, ranged: 0, thrown: 0, armor: 0, shield: 0, cyber: 0}},
  workshop: {label: "A workshop or smithy", w: {melee: 3, ranged: 1, thrown: 1, armor: 2, shield: 1, cyber: 0}},
  den: {label: "A den of thieves or a gang's hideout", w: {melee: 3, ranged: 2, thrown: 2, armor: 1, shield: 0, cyber: 0}},
  camp: {label: "A soldiers' or travellers' camp", w: {melee: 2, ranged: 2, thrown: 1, armor: 2, shield: 2, cyber: 0}},
  clinic: {label: "A clinic or a back-room surgeon", w: {melee: 1, ranged: 0, thrown: 0, armor: 0, shield: 0, cyber: 4}}
};

/** The fill place that fits each kind of WoDX NPC place; null where none fits (then a home). */
export const FROM_NPC_PLACE = {
  home: "home", haven: "home", tavern: "home", workplace: "workshop", market: "workshop", church: "church",
  gate: "armory", castle: "armory", wilds: "camp", street: null, caern: null, other: null
};

/**
 * The first guess of place for a container. own: its fillPlace flag; regions: the place kinds of the regions it sits
 * in, the smallest first; scene: the scene's place kind. Returns {place, from: "own" | "region" | "scene" | null}.
 */
export function placeGuess({own = null, regions = [], scene = null} = {}) {
  if ( PLACES[own] ) return {place: own, from: "own"};
  for ( const k of regions ?? [] ) if ( FROM_NPC_PLACE[k] ) return {place: FROM_NPC_PLACE[k], from: "region"};
  if ( FROM_NPC_PLACE[scene] ) return {place: FROM_NPC_PLACE[scene], from: "scene"};
  return {place: "home", from: null};
}

/** Containers that only take small things: what hides in a pocket, a jacket or a coat. */
export const SMALL = new Set(["box", "drawers", "strongbox", "safe"]);
const SMALL_CONCEAL = new Set(["P", "J", "C"]);

export function fits(item, containerKind) {
  if ( !SMALL.has(containerKind) ) return true;
  const cat = categoryOf(item);
  if ( cat === "cyber" ) return true;
  if ( cat === "armor" || cat === "shield" ) return false;
  return SMALL_CONCEAL.has(String(item?.system?.conceal ?? "").toUpperCase());
}

/** The items that may be drawn for this era, place and container, each with its weight. */
export function candidates(items, {era = null, place = "home", container = "chest"} = {}) {
  const w = (PLACES[place] ?? PLACES.home).w;
  const out = [];
  for ( const it of items ?? [] ) {
    const cat = categoryOf(it);
    if ( !cat || !w[cat] ) continue;
    if ( era && !(it.flags?.["wodx-library"]?.eras ?? []).includes(era) ) continue;
    if ( !fits(it, container) ) continue;
    out.push({item: it, weight: w[cat], cat});
  }
  return out;
}

/** Draw up to count different items, by weight. rng returns [0, 1). */
export function draw(items, {era = null, place = "home", container = "chest", count = 3, rng = Math.random} = {}) {
  const pool = candidates(items, {era, place, container});
  const picked = [];
  const n = Math.max(0, Math.min(12, Math.round(Number(count) || 0)));
  while ( picked.length < n && pool.length ) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = rng() * total, i = 0;
    for ( ; i < pool.length - 1; i++ ) { r -= pool[i].weight; if ( r < 0 ) break; }
    picked.push(pool.splice(i, 1)[0].item);
  }
  return picked;
}

/** Add lines to a container's list, once each. */
export function mergeLines(existing, add) {
  const have = String(existing ?? "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  for ( const a of add ?? [] ) if ( a && !have.includes(a) ) have.push(a);
  return have.join("\n");
}
