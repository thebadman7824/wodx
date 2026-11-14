/**
 * WoDX Combat: fighting with and around vehicles, the Foundry side of vehicle-rules.js (decisions B4790 to B4799).
 * The vehicle a token is aboard comes from WoDX Interactables (movement.js rideOf), with its body for the year.
 *   - a blow at someone inside a closed vehicle goes into the vehicle unless it scores 4 successes (a window);
 *     armoured vehicles and aircraft take every blow from outside (Mage 20th pp. 459-463);
 *   - the vehicle's Durability turns aside that much damage; the rest comes off its Structure. The tile shows it:
 *     a tint that darkens as it is battered, a word over it, and wrecked at its Structure (it goes nowhere after);
 *   - ramming, as a weapon on the attack menu at the wheel: Durability + a die a 10 mph + its mass, bashing, at
 *     Dexterity + Drive held to its Maneuver; a vehicle rammed takes it on its body, and the people inside both take
 *     the crash less the Durability, halved when strapped in;
 *   - a hit that sets the fuel off: 12 dice of aggravated fire to all aboard, and a fire on the map where it burns;
 *   - the one at the wheel swerves in place of dodging; anyone else sat inside does not dodge.
 * World setting "vehicleCombat" (on by default) turns it all off.
 */
import * as VR from "./vehicle-rules.js";
import * as MVJ from "./movement.js";

let D = null;
export const rules = VR;
const IX = "wodx-interactables";
const ix = () => { const m = game.modules.get(IX); return m?.active ? m.api : null; };
export const vehiclesOn = () => { try { return !!ix() && game.settings.get(D.MOD, "vehicleCombat"); } catch (e) { return false; } };
const gmHere = () => {
  const gm = game.users.activeGM ?? game.users.filter(u => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id))[0];
  return !!gm && gm.id === game.user.id;
};

/** The vehicle under an actor's token (with a body), or null. */
export function vehicleFor(actor, tok = null) {
  if ( !D || !vehiclesOn() || !actor ) return null;
  try { const r = MVJ.rideOf(MVJ.tokenFor(actor, tok)); return VR.hasBody(r) ? r : null; } catch (e) { return null; }
}

/** The tile a ride is on. */
const VEH = "wodx-interactables.vehicle";
/** B4968: a vehicle's own ride (as rideOf would give someone aboard it), from its token. */
function ownRide(actor, tok = null) {
  const doc = tok?.document ?? tok ?? canvas?.scene?.tokens?.find(t => t.actor?.id === actor.id);
  const api = ix(), R = api?.rules;
  if ( !doc || !api?.describeObj ) return null;
  const o = api.describeObj(doc);
  if ( !o?.vehicle ) return null;
  const C = api.chase?.rules ?? null;
  const body = C?.bodyOf ? C.bodyOf(o.kind, o.built) : null;
  if ( !body ) return null;
  return {kind: o.kind, body, role: "none", tile: doc.id, tileUuid: doc.uuid, label: o.title || R?.MOUNTS?.[o.kind]?.label || "vehicle",
    lost: Number(o.hull?.lost) || 0, wrecked: (Number(o.hull?.lost) || 0) >= body.structure, year: o.built, motor: !!C?.WAYS?.[o.kind]?.motor, air: !!C?.WAYS?.[o.kind]?.air};
}
/** B4968: the mounted guns of the vehicle someone is aboard, for the attack menu. */
export function mountedGuns(actor, tok = null) {
  try {
    const at = MVJ.tokenFor(actor, tok), r = at ? MVJ.rideOf(at) : null;
    if ( !r?.vehicleActor ) return [];
    const v = fromUuidSync(r.vehicleActor);
    return v ? v.items.filter(i => i.type === "Ranged Weapon" || i.type === "Melee Weapon").map(i => ({item: i, vehicle: v})) : [];
  } catch (e) { return []; }
}
const tileOf = ride => { try { return ride?.tileUuid ? fromUuidSync(ride.tileUuid) : canvas?.scene?.tiles?.get(ride?.tile) ?? null; } catch (e) { return null; } };
/** Everyone aboard a vehicle tile: [{a, t, n}]. */
function aboardOf(tile) {
  const f = tile?.flags?.[IX] ?? {};
  return [f.driver, ...(Array.isArray(f.riders) ? f.riders : [])].filter(x => x?.t);
}

/** Show a word over a tile for everyone looking at the scene. */
function floatTile(tile, word, color = "#ffb070") {
  try {
    if ( !tile || !globalThis.canvas?.interface || tile.parent?.id !== canvas.scene?.id ) return;
    const c = {x: Number(tile.x) + Number(tile.width) / 2, y: Number(tile.y) + Number(tile.height) / 2};
    canvas.interface.createScrollingText(c, word, {anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, direction: CONST.TEXT_ANCHOR_POINTS?.TOP,
      distance: canvas.grid?.size ?? 100, fontSize: 28, fill: color, stroke: 0x000000, strokeThickness: 4, jitter: 0.2, duration: 2800});
  } catch (e) { /* no canvas */ }
}
export function floatOn(tile, word, color) {
  floatTile(tile, word, color);
  try { game.socket.emit(D.SOCKET, {vehicles: "float", tile: tile?.uuid, word, color}); } catch (e) { /* offline */ }
}

/**
 * Damage to a vehicle's body, written on its tile (the Storyteller's client writes; a player's asks). levels: the
 * damage roll's successes. burning: the fuel went up (it is wrecked and burns). -> the hullBlow result
 */
export async function strikeHull(tile, body, levels = 0, {burning = false} = {}) {
  if ( !tile || !body ) return null;
  // B4968: a vehicle on its own sheet keeps its damage there; its token shows it (Interactables setLights tints it)
  const sheet = tile.documentName === "Token" && tile.actor?.type === VEH ? tile.actor : null;
  const h0 = sheet ? {lost: sheet.system.lost, burning: sheet.system.burning} : tile.flags?.[IX]?.hull ?? {};
  const r = VR.hullBlow(body, burning ? body.structure + body.durability : levels, h0.lost);
  if ( !game.user.isGM ) {
    game.socket.emit(D.SOCKET, {vehicles: "hull", tile: tile.uuid, body, levels, burning});
    return r;
  }
  if ( !r.lost && !burning ) { floatOn(tile, "Bounces off", "#d8d8d8"); return r; }
  if ( sheet ) await sheet.update({"system.lost": r.total, "system.burning": burning || !!h0.burning});
  const hull = {lost: r.total, structure: body.structure, burning: burning || !!h0.burning, tint0: h0.tint0 ?? tile.texture?.tint?.css ?? tile.texture?.tint ?? "#ffffff"};
  const st = ix()?.rules?.hullState?.(hull, body.structure) ?? {tint: null, state: r.wrecked ? "wrecked" : "damaged"};
  if ( !sheet ) await tile.update({[`flags.${IX}.hull`]: hull, "texture.tint": st.tint ?? hull.tint0});
  floatOn(tile, burning ? "The fuel goes up!" : r.wrecked ? "Wrecked!" : `−${r.lost} Structure`, burning || r.wrecked ? "#ff6040" : "#ffb070");
  if ( r.wrecked ) { try { ix()?.mapEvent?.("crash", {doc: tile, noise: "loud", object: tile.flags?.[IX]?.mountKind ?? "", extra: {how: burning ? "fire" : "wrecked"}}); } catch (e) { /* no listeners */ } }
  if ( burning ) {
    // the fire on the map, where the wreck burns (WoDX Interactables' fire hazard: whoever goes into it burns)
    try {
      await tile.parent.createEmbeddedDocuments("Tile", [{x: tile.x, y: tile.y, width: tile.width, height: tile.height, texture: {src: "icons/svg/fire.svg"}, alpha: 0.85,
        flags: {[IX]: {hazard: true, hazardKind: "fire", size: "inferno", heat: "bonfire", burning: true, title: "A burning wreck"}, [D.MOD]: {wreckFire: tile.id}}}]);
    } catch (e) { console.warn(`${D.MOD} | wreck fire`, e); }
  }
  return r;
}

/** Whether attacker and target are aboard the same vehicle. */
const sameRide = (a, b) => !!(a && b && a.tile && a.tile === b.tile);

/** A ram on the attack menu: a weapon entry for weaponList, or null. */
export function ramWeapon(attacker, tok = null) {
  const ride = vehicleFor(attacker, tok);
  if ( !VR.canRam(ride) || ride.wrecked ) return null;
  const at = MVJ.tokenFor(attacker, tok);
  const rd = VR.ramDice(ride, MVJ.movedYards(at));
  const tile = tileOf(ride);
  // the vehicle reaches as far as its own edge from the one at the wheel
  const size = canvas?.scene?.grid?.size ?? 100, unit = canvas?.scene?.grid?.distance ?? 5;
  const reachBonus = tile ? Math.max(0, (Math.max(Number(tile.width) || 0, Number(tile.height) || 0) / size / 2 - 0.5) * unit) : 0;
  return {id: "vehicle:ram", vehicle: true, ram: true, name: `Ram with the ${String(ride.label).toLowerCase()} (${rd.dice} dice: ${rd.parts.join(", ")})`,
    ranged: false, attribute: "dexterity", ability: ride.skill, secondaryId: "", accuracy: 0, dmgAttr: "", dmgBonus: rd.dice, type: "bashing",
    diff: VR.RAM_DIFF, minStr: 0, piercing: 0, range: 0, equipped: false, shots: null, crossbow: false, reachBonus, maneuverCap: ride.maneuver,
    desc: "Mage 20th p. 459: ramming", rideTile: ride.tile};
}

/** The driving pool held to the vehicle's Maneuver (for a ram). -> {dice, note} */
export function capPool(attacker, w, dice, tok = null) {
  if ( !w?.vehicle ) return {dice, note: ""};
  const ride = vehicleFor(attacker, tok);
  const c = VR.maneuverCap(ride, dice);
  return {dice: c.dice, note: c.held ? `held to the ${String(ride.label).toLowerCase()}'s Maneuver ${ride.maneuver} (Mage 20th p. 458)` : ""};
}

/** The swerve, as a defense plan, for whoever is at the wheel (vehicle-rules swerve). */
export function swerveOf(target, {ranged = false, wounds = 0, targetTok = null} = {}) {
  const ride = vehicleFor(target, targetTok);
  if ( !VR.atWheel(ride) ) return null;
  return VR.swerve(ride, {dex: D.attr(target, "dexterity"), dots: D.ability(target, ride.skill), ranged, wounds});
}
/** Sat inside a vehicle (not at the wheel): no dodge on foot. */
export function seatedIn(target, targetTok = null) {
  const ride = vehicleFor(target, targetTok);
  return VR.seated(ride) ? ride : null;
}

/**
 * Before the damage is soaked: does the vehicle take the blow in place of the one inside? -> {ride, shielded,
 * through, note}
 */
export function shelterFor({attacker, attackerTok = null, target, targetTok = null, w, attackSuccesses = 0} = {}) {
  // B4968: the vehicle itself is the target: its body takes every blow
  if ( target?.type === VEH ) {
    const own = ownRide(target, targetTok);
    if ( own ) return {ride: own, shielded: true, through: false, note: `The ${String(own.label).toLowerCase()} itself is struck.`};
  }
  const ride = target ? vehicleFor(target, targetTok) : null;
  if ( !ride ) return {ride: null, shielded: false, through: false, note: ""};
  const aRide = attacker ? vehicleFor(attacker, attackerTok) : null;
  return {ride, ...VR.shelter(ride, {attackSuccesses, sameVehicle: sameRide(aRide, ride), ram: !!w?.ram})};
}

/**
 * After a blow that hit: the vehicle's body, a crash's dice to those inside, the fuel. levels: the damage roll's
 * successes. Returns {lines, rolls, apply} (apply after the card is posted).
 */
export async function afterHit({attacker, attackerTok = null, target, targetTok = null, w, hit = false, shelter = null, attackSuccesses = 0, levels = 0, dmgDice = 0} = {}) {
  const out = {lines: [], rolls: [], applies: []};
  if ( !D || !vehiclesOn() || !hit ) return {...out, apply: async () => {}};
  const esc = D.esc;
  // The body takes the blow
  if ( shelter?.shielded && shelter.ride ) {
    const ride = shelter.ride, tile = tileOf(ride), r = VR.hullBlow(ride.body, levels, ride.lost);
    out.lines.push(`<b>The ${esc(String(ride.label).toLowerCase())} takes it:</b> ${levels} level${levels === 1 ? "" : "s"} against Durability ${ride.body.durability}: ${r.bounced ? "it bounces off" : `${r.lost} off its Structure (${r.total} of ${r.structure} lost)${r.wrecked ? ", and it is <b>wrecked</b>" : ""}`} (Mage 20th p. 458).`);
    const fuel = !w?.ram && VR.fuelGoes(ride, {attackSuccesses, levels});
    if ( fuel ) out.lines.push(`<b>The fuel goes up:</b> ${VR.FUEL_SUCCESSES} successes to hit and ${VR.FUEL_LEVELS} levels of damage (Mage 20th p. 459): ${VR.FUEL_DICE} dice of aggravated fire to everyone aboard.`);
    out.applies.push(() => strikeHull(tile, ride.body, levels, {burning: fuel}));
    // A crash shakes those inside (a ram); the fuel burns them
    const crash = w?.ram ? VR.crashDice(ride, dmgDice, {year: ride.year}) : 0;
    for ( const p of aboardOf(tile) ) {
      const td = await fromUuid(p.t).catch(() => null), actor = td?.actor;
      if ( !actor ) continue;
      if ( crash ) await hurt(out, actor, "bashing", crash, `the crash (${dmgDice} dice less Durability ${ride.body.durability}${ride.body.guard ? ` and the lorry's +${ride.body.guard}` : ""}${VR.strapped(ride, ride.year) ? ", halved: strapped in" : ""})`);
      if ( fuel ) await hurt(out, actor, "aggravated", VR.FUEL_DICE, "the fire");
    }
  } else if ( shelter?.through ) out.lines.push(esc(shelter.note));
  // Ramming another vehicle: the rammer's own people feel it too, and its body takes the same blow (house reading
  // B4793). Running someone down on foot does not shake those inside.
  if ( w?.ram && shelter?.ride ) {
    const mine = vehicleFor(attacker, attackerTok);
    if ( mine ) {
      const tile = tileOf(mine), r = VR.hullBlow(mine.body, levels, mine.lost);
      out.lines.push(`<b>The ${esc(String(mine.label).toLowerCase())} that rammed:</b> ${r.bounced ? "no harm to it" : `${r.lost} off its Structure${r.wrecked ? ", and it is <b>wrecked</b>" : ""}`}.`);
      out.applies.push(() => strikeHull(tile, mine.body, levels));
      const crash = VR.crashDice(mine, dmgDice, {year: mine.year});
      if ( crash ) for ( const p of aboardOf(tile) ) {
        const td = await fromUuid(p.t).catch(() => null), actor = td?.actor;
        if ( actor ) await hurt(out, actor, "bashing", crash, "the impact");
      }
    }
  }
  return {lines: out.lines, rolls: out.rolls, apply: async () => { for ( const f of out.applies ) { try { await f(); } catch (e) { console.warn(`${D.MOD} | vehicle`, e); } } }};
}

async function hurt(out, actor, type, dice, why) {
  if ( !dice ) return;
  const f = await D.soakFall(actor, type, dice);
  out.rolls.push(...f.rolls);
  out.lines.push(`${D.esc(actor.name)}, ${D.esc(why)}: ${dice} dice, ${f.damage} success${f.damage === 1 ? "" : "es"}, ${f.soaked} soaked: <b>${f.levels}</b> ${type}.`);
  if ( f.levels ) out.applies.push(() => D.applyDamage(actor, type, f.levels));
}

async function onSocket(p) {
  if ( !p?.vehicles ) return;
  const tile = p.tile ? await fromUuid(p.tile).catch(() => null) : null;
  if ( p.vehicles === "float" ) return floatTile(tile, p.word, p.color);
  if ( p.vehicles === "hull" && gmHere() ) await strikeHull(tile, p.body, p.levels, {burning: !!p.burning});
}

export function setupVehicles(deps) {
  D = deps;
  game.settings.register(D.MOD, "vehicleCombat", {
    name: "Fighting in and around vehicles (Durability, ramming)",
    hint: "Those inside a closed car, lorry or coach are shielded unless the attack scores 4 successes; armoured vehicles and aircraft shield them fully. A vehicle's Durability turns damage aside and the rest wrecks it, shown on its tile. Ramming is on the attack menu at the wheel: Durability + a die a 10 mph + its mass. The one at the wheel swerves in place of dodging. Mage 20th pp. 458-463. Needs WoDX Interactables' vehicles.",
    scope: "world", config: true, type: Boolean, default: true
  });
  Hooks.once("ready", () => game.socket.on(D.SOCKET, p => { if ( p?.vehicles ) onSocket(p); }));
  return {vehicleFor, ramWeapon, capPool, swerveOf, seatedIn, shelterFor, afterHit, strikeHull, on: vehiclesOn, rules: VR};
}
