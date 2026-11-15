/**
 * WoDX Library: everyday arms, weapon fittings and traps in play (B3805 to B3807). No Foundry calls here.
 *
 * WoDX Combat asks armOf for the plain things on a sheet that fight (a cleaver, a can of pepper spray), fitFor for
 * what the fittings the character has on do to one weapon, and atHand for the initiative a worn holster or scabbard
 * gives. The Use window sets, springs and disarms traps with the trap functions here.
 */
import {ARMS, FITTINGS, CARRIERS, WARDS, TRAPS, KIT, AMMO} from "../data/goods-arms.mjs";
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";

export {ARMS, FITTINGS, CARRIERS, WARDS, TRAPS, KIT, AMMO};

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
export const ammoOf = lookup(AMMO);
/** Something a load needs besides the round (a powder horn). */
export const isAmmoNeed = name => Object.values(AMMO).some(a => a.needs && a.needs === bare(name));

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
  const r = TERMS.successes(faces, diff);
  return {successes: r.successes, botch: r.botch};
}

/* ---------------------------------------------------------------- ammunition (B3900, B3901) */

const SHOTGUN = /\b(shotgun|scattergun|coach gun|blunderbuss)\b/i;
const SLING = /\bsling\b(?! ?shot)/i;
const MUZZLE_LOCKS = new Set(["handgonne", "matchlock", "wheellock", "flintlock", "snaphance", "percussion"]);
const SEMI = /\b(glock|beretta|automatic|semi-?auto|luger|mauser c96|browning|m1911|1911|sig|walther|makarov|tokarev|desert eagle)\b/i;

/**
 * Which ammunition a weapon takes: bow, crossbow, sling, muzzle (ball and powder), shotgun, magazine (a box-fed
 * pistol: a magazine, or loose cartridges), cartridge, or null (no ammunition the goods know of).
 * lock: WoDX Combat's lock for a gun (matchlock, flintlock, cartridge ...), when it knows one.
 */
export function ammoKindOf(w = {}, lock = null) {
  const n = String(w.name ?? "");
  if ( !w.ranged ) return null;
  if ( CROSSBOW.test(n) ) return "crossbow";
  if ( SLING.test(n) && !/gun sling/i.test(n) ) return "sling";
  // A sheet that names no ability reads as Archery to WoDX Combat, so a gun by name or lock is never taken for a bow
  const gun = (lock && lock !== "none") || PISTOL.test(n) || LONGGUN.test(n) || SHOTGUN.test(n);
  if ( BOW.test(n) || (w.ability === "archery" && !gun && !/javelin|dart|spear|throw/i.test(n)) ) return "bow";
  if ( lock && MUZZLE_LOCKS.has(lock) ) return "muzzle";
  if ( SHOTGUN.test(n) ) return "shotgun";
  if ( PISTOL.test(n) && SEMI.test(n) && !/revolver/i.test(n) ) return "magazine";
  if ( w.ability === "firearms" || PISTOL.test(n) || LONGGUN.test(n) || lock ) return "cartridge";
  return null;
}

/** How many of a thing a sheet row holds: the sheet's count, a "(7)" in the name, else 1. */
export function countOf(item) {
  const q = Math.floor(Number(item?.flags?.["wodx-sheets"]?.qty) || 0);
  if ( q > 0 ) return q;
  const m = /\((\d+)\)\s*$/.exec(String(item?.name ?? ""));
  return m ? Math.max(1, Number(m[1])) : 1;
}

/** The ammunition a character holds for this kind: [{item, ammo, count}], magazines before loose rounds. */
export function ammoIn(items = [], kind) {
  const out = [];
  for ( const i of items ?? [] ) {
    const a = ammoOf(i?.name);
    if ( !a ) continue;
    const fits = a.kind === kind || (kind === "magazine" && a.kind === "cartridge");
    if ( fits ) out.push({item: i, ammo: a, count: countOf(i)});
  }
  return out.sort((x, y) => (y.ammo.rounds === "full") - (x.ammo.rounds === "full"));
}

/**
 * A reload from what the character holds. kind: ammoKindOf; need: rounds the weapon lacks; max: its capacity.
 * Returns {ok, rounds, spend: [{item, n}], why}: rounds loaded (at most need), and how many of each row it takes.
 */
export function reloadPlan(items = [], kind, need, max) {
  if ( !kind ) return {ok: true, rounds: need, spend: [], why: ""};
  if ( need <= 0 ) return {ok: false, rounds: 0, spend: [], why: "it is already loaded"};
  const have = ammoIn(items, kind);
  if ( !have.length ) return {ok: false, rounds: 0, spend: [], why: `no ${AMMO_LABEL[kind]} in Possessions`};
  const lacks = have.find(h => h.ammo.needs && !(items ?? []).some(i => bare(i?.name) === h.ammo.needs));
  if ( lacks && have.every(h => h.ammo.needs) ) return {ok: false, rounds: 0, spend: [], why: `no ${lacks.ammo.needs.replace(/^an? /, "")} to load it with`};
  const mag = have.find(h => h.ammo.rounds === "full");
  if ( mag ) return {ok: true, rounds: need, spend: [{item: mag.item, n: 1}], why: ""};
  let left = need; const spend = [];
  for ( const h of have ) {
    if ( left <= 0 ) break;
    const n = Math.min(left, h.count);
    spend.push({item: h.item, n}); left -= n;
  }
  return {ok: true, rounds: need - left, spend, why: left > 0 ? `only ${need - left} of ${max}` : ""};
}

/** An arrow or a stone for one shot: {ok, spend: {item, n}, why}. */
export function shotPlan(items = [], kind) {
  const h = ammoIn(items, kind).find(x => x.ammo.spentPerShot);
  if ( !h ) return {ok: false, spend: null, why: `no ${AMMO_LABEL[kind]} left`};
  return {ok: true, spend: {item: h.item, n: 1}, why: ""};
}

export const AMMO_LABEL = {bow: "arrows", sling: "sling stones", crossbow: "crossbow bolts", muzzle: "musket balls", shotgun: "shotgun shells",
  magazine: "magazines or cartridges", cartridge: "cartridges"};
