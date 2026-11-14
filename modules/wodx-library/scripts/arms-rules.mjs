/**
 * WoDX Library: everyday arms, weapon fittings and traps in play (B3805 to B3807). No Foundry calls here.
 *
 * WoDX Combat asks armOf for the plain things on a sheet that fight (a cleaver, a can of pepper spray), fitFor for
 * what the fittings the character has on do to one weapon, and atHand for the initiative a worn holster or scabbard
 * gives. The Use window sets, springs and disarms traps with the trap functions here.
 */
import {ARMS, FITTINGS, CARRIERS, WARDS, TRAPS, KIT} from "../data/goods-arms.mjs";

export {ARMS, FITTINGS, CARRIERS, WARDS, TRAPS, KIT};

/** A thing's plain good name: no count, no quality tag, any case. */
export function bare(name) {
  return String(name ?? "").trim().replace(/\s*\((plain work|good work|fine work|masterwork|weak|strong)\)\s*$/i, "").replace(/\s*\(\d+\)\s*$/, "").toLowerCase();
}
const lookup = table => {
  const by = new Map(Object.entries(table).map(([k, v]) => [k.toLowerCase(), {name: k, ...v}]));
  return name => by.get(bare(name)) ?? null;
};
export const armOf = lookup(ARMS);
export const fittingOf = lookup(FITTINGS);
export const carrierOf = lookup(CARRIERS);
export const wardOf = lookup(WARDS);
export const trapOf = lookup(TRAPS);
export const kitOf = lookup(KIT);

const BOW = /\b(long|short|composite|recurve|self|hunting|war)?bow\b/i;
const CROSSBOW = /crossbow|arbalest|arbalète|armbrust/i;
const PISTOL = /\b(pistol|revolver|derringer|glock|colt|beretta|handgun|magnum|sidearm|six-?shooter)\b/i;
const LONGGUN = /\b(rifle|carbine|musket|shotgun|arquebus|harquebus|fusil|caliver|blunderbuss|smg|submachine|assault|uzi|tommy|ak-?47|m16|ar-?15)\b/i;
const BLADE = /\b(sword|sabre|saber|rapier|falchion|scimitar|katana|cutlass|longsword|broadsword|blade|machete|epee|épée)\b/i;

/** What sort of weapon this is, for fittings: bow, crossbow, pistol, longgun, gun (any firearm), blade or null. */
export function kindsOf(w = {}) {
  const n = String(w.name ?? ""), out = new Set();
  if ( w.ranged && CROSSBOW.test(n) ) out.add("crossbow");
  else if ( w.ranged && (BOW.test(n) || (w.ability === "archery" && !/sling|javelin|dart|spear/i.test(n))) ) out.add("bow");
  if ( w.ranged && PISTOL.test(n) ) out.add("pistol");
  if ( w.ranged && LONGGUN.test(n) ) out.add("longgun");
  if ( out.has("pistol") || out.has("longgun") || (w.ranged && w.ability === "firearms" && !/flare/i.test(n)) ) out.add("gun");
  if ( !w.ranged && BLADE.test(n) ) out.add("blade");
  return out;
}

/**
 * A plain thing on a sheet as a weapon for WoDX Combat's list, or null. item: {id, name, type, system: {isequipped}}.
 * Only plain Items: a real Melee or Ranged Weapon is the system's own.
 */
export function weaponEntry(item) {
  if ( !item || item.type !== "Item" ) return null;
  const a = armOf(item.name);
  if ( !a ) return null;
  return {id: item.id, name: item.name, ranged: !!a.ranged, natural: false, attribute: a.attribute ?? "dexterity", ability: a.ability,
    secondaryId: "", accuracy: 0, dmgAttr: a.dmgAttr ?? "", dmgBonus: Number(a.dmg) || 0, type: a.kind, diff: a.diff ?? 6,
    minStr: 0, piercing: 0, range: Number(a.range) || 0, equipped: !!item.system?.isequipped, shots: null, crossbow: false,
    desc: a.note ?? "", good: true, special: a.special ?? null, radius: a.radius ?? 0, spent: !!a.spent};
}

/**
 * What the fittings a character has on (equipped) do to one weapon: {diff, far, smart, silenced, light, noMinStr,
 * quickReload, spareString, wax, names}. items: the character's items; w: the weapon (name, ranged, ability).
 */
export function fitFor(items = [], w = {}) {
  const kinds = kindsOf(w);
  const out = {diff: 0, far: 0, smart: 0, silenced: false, light: false, noMinStr: false, quickReload: false, spareString: false, wax: false, names: []};
  for ( const i of items ?? [] ) {
    if ( !i?.system?.isequipped ) continue;
    const f = fittingOf(i.name);
    if ( !f || !kinds.has(f.fits) ) continue;
    out.names.push(f.name);
    out.diff = Math.min(out.diff, Number(f.diff) || 0);
    out.far = Math.max(out.far, Number(f.far) || 0);
    out.smart = Math.min(out.smart, Number(f.smart) || 0);
    for ( const k of ["silenced", "light", "noMinStr", "quickReload", "spareString", "wax"] ) if ( f[k] ) out[k] = true;
  }
  return out;
}

/** Initiative from a worn holster, sling or scabbard with its kind of weapon equipped: {init, names}. weapons: [{name, ranged, ability, equipped}]. */
export function atHand(items = [], weapons = []) {
  const carried = new Set(weapons.filter(w => w.equipped).flatMap(w => [...kindsOf(w)]));
  let init = 0; const names = [];
  for ( const i of items ?? [] ) {
    if ( !i?.system?.isequipped ) continue;
    const c = carrierOf(i.name);
    if ( c && carried.has(c.carries) ) { init = Math.max(init, Number(c.init) || 0); names.push(c.name); }
  }
  return {init, names};
}

/** Whether something worn covers this (eyes, gas): the first ward's name, or null. */
export function coveredBy(items = [], what = "eyes") {
  for ( const i of items ?? [] ) {
    if ( !i?.system?.isequipped ) continue;
    const w = wardOf(i.name);
    if ( w?.covers?.includes(what) ) return w.name;
  }
  return null;
}

/** The difficulty to see a trap that was set with this many successes (the trap's own, +1 for each success past the first, at most 9). */
export const findDiff = (trap, successes = 1) => Math.min(9, (Number(trap?.find) || 6) + Math.max(0, (Number(successes) || 0) - 1));

/**
 * What setting a trap came to. {successes, botch} from the setter's roll: botched, it springs on the setter;
 * no successes, it is not set; otherwise set, as hard to see as findDiff.
 */
export function setResult(trap, {successes = 0, botch = false} = {}) {
  if ( botch ) return {set: false, springs: true, line: `It springs on the one setting it.`};
  if ( successes < 1 ) return {set: false, springs: false, line: `It is not set right: it would not catch anyone.`};
  return {set: true, springs: false, diff: findDiff(trap, successes), line: `It is set and hidden (difficulty ${findDiff(trap, successes)} to see it before it springs).`};
}

/**
 * What a trap does to whoever walks into it. noticed: the victim's Perception + Alertness found it in time.
 * Returns {caught, dice, kind, hold, alarm, line}.
 */
export function springResult(trap, {noticed = false} = {}) {
  if ( noticed ) return {caught: false, dice: 0, kind: trap.kind, hold: null, alarm: null, line: `Seen in time: it is stepped around.`};
  const harms = Number(trap.dice) > 0;
  const bits = [harms ? `${trap.dice} dice of ${trap.kind} damage` : "", trap.hold === "immobilized" ? "held fast (completely immobilized until opened)" : trap.hold === "held" ? "caught (held until they work free)" : "", trap.alarm ? `${trap.alarm}` : ""].filter(Boolean);
  return {caught: true, dice: Number(trap.dice) || 0, kind: trap.kind, hold: trap.hold ?? null, alarm: trap.alarm ?? null, line: `It springs: ${bits.join("; ") || "nothing more"}.`};
}

/** Disarming: Dexterity + Security against the difficulty to see it. A botch springs it on the one disarming it. */
export function disarmResult({successes = 0, botch = false} = {}) {
  if ( botch ) return {safe: false, springs: true, line: "It springs on the one disarming it."};
  if ( successes < 1 ) return {safe: false, springs: false, line: "It cannot be made safe this time; it is still set."};
  return {safe: true, springs: false, line: "It is made safe and can be taken up."};
}

/** The pool for a roll from a character's values: {attribute, ability}. */
export const poolOf = (attribute, ability) => Math.max(0, (Number(attribute) || 0) + (Number(ability) || 0));

/** Summary lines for an item's description and the Use window. */
export function summaryOf(name) {
  const a = armOf(name);
  if ( a ) return `${a.ranged ? "Thrown or fired" : "In the hand"}: ${a.dmgAttr ? "Strength + " : ""}${a.dmg} ${a.kind}, difficulty ${a.diff}${a.range ? `, range ${a.range}` : ""}.${a.note ? ` ${a.note}` : ""}`;
  const f = fittingOf(name);
  if ( f ) return `Fitted to a ${f.fits === "longgun" ? "long gun" : f.fits}: ${f.note}`;
  const c = carrierOf(name);
  if ( c ) return `Worn, with a ${c.carries === "longgun" ? "long gun" : c.carries} carried: +${c.init} initiative (it is at hand).`;
  const w = wardOf(name);
  if ( w ) return `Worn: ${w.note}`;
  const t = trapOf(name);
  if ( t ) return `A trap: set with ${cap(t.set[0])} + ${cap(t.set[1])} (difficulty ${t.set[2]}). ${t.note}`;
  const k = kitOf(name);
  if ( k ) return k.note;
  return "";
}
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** V20 successes: each face at or above the difficulty, less one for each 1; a botch is no successes and a 1. */
export function countSuccesses(faces = [], diff = 6) {
  const hits = faces.filter(f => f >= diff).length, ones = faces.filter(f => f === 1).length;
  const successes = Math.max(0, hits - ones);
  return {successes, botch: hits === 0 && ones > 0};
}
