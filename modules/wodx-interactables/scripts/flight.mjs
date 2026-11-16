/**
 * WoDX Interactables: flight on the map (decisions B6620 to B6629). The rules are in flight-rules.mjs.
 *
 * The one at the controls flies by their own token's elevation: setting it (Foundry's token HUD, or a drag with the
 * elevation keys) takes the craft and everyone aboard up or down with them, held by what the craft can do (its
 * ceiling; Pilot to fly it at all). Things that bring a craft down, run by the active Storyteller:
 *   - wrecked in the air (its Structure gone): it falls, and everyone aboard takes the crash;
 *   - nobody left at the controls: an aerodyne, an armoured AV or a hover bike drops at once; anything else gets a
 *     card saying what it does (it glides, autorotates, drifts, or the beast flies on);
 *   - someone who leaves a craft in the air (gets off, or walks off its token) falls from that height, unless they
 *     fly themselves (their token is set to fly).
 * Paperdoll draws the height: the picture lifts, its shadow stays on the ground, dust blows out at take-off.
 */
import * as F from "./flight-rules.mjs";
import * as C from "./chase-rules.mjs";
import * as R from "./interact-rules.mjs";
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";

const MOD = "wodx-interactables";
let deps = {};
const num = v => Number(v) || 0;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"})[c]);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);

/** Feet in so many of a scene's units (elevation is kept in the scene's units). */
const unitsOf = scene => scene?.grid?.units || "ft";
export const toFeet = (scene, v) => TERMS.toFeet(num(v), unitsOf(scene));
export const fromFeet = (scene, ft) => num(ft) / Math.max(1e-9, toFeet(scene, 1));

const centreOf = doc => {
  const g = doc.parent?.grid?.size ?? 100, tile = doc.documentName === "Tile";
  const w = tile ? num(doc.width) : (num(doc.width) || 1) * g, h = tile ? num(doc.height) : (num(doc.height) || 1) * g;
  return {x: num(doc.x) + w / 2, y: num(doc.y) + h / 2};
};
/** The floor under a thing on the map, in scene units: the highest region bottom it stands in, else 0. */
export function groundUnder(doc) {
  const p = centreOf(doc);
  let g = 0;
  for ( const r of doc.parent?.regions ?? [] ) {
    const b = r.elevation?.bottom;
    if ( !Number.isFinite(b) || b <= g ) continue;
    let inside = false;
    try { inside = !!r.testPoint({x: p.x, y: p.y, elevation: b}); } catch (e) { try { inside = !!r.object?.testPoint?.({x: p.x, y: p.y}, b); } catch (e2) { inside = false; } }
    if ( inside && b <= num(doc.elevation) + 0.01 ) g = b;
  }
  return g;
}
/** Feet above the ground under it. */
export const altOf = doc => (doc ? Math.max(0, toFeet(doc.parent, num(doc.elevation) - groundUnder(doc))) : 0);

const aboardOf = doc => { const f = doc.flags?.[MOD] ?? {}; return [f.driver, ...(Array.isArray(f.riders) ? f.riders : [])].filter(r => r?.t); };
const dotsOf = (actor, key) => num(actor?.system?.abilities?.[key]?.value);
const kindOf = doc => deps.describeObj?.(doc)?.kind ?? doc.flags?.[MOD]?.mountKind ?? null;
const ownersOf = actor => game.users.filter(u => u.isGM || actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);

/** Wrecked: its Structure gone. A tile that has never been struck keeps no Structure of its own: its body's counts. */
function isWrecked(o, kind) {
  if ( !o?.hull ) return false;
  const structure = num(o.hull.structure) || C.bodyOf(kind, o.built || num(deps.yearNow?.()) || 2030)?.structure || 0;
  return R.hullState(o.hull, structure).state === "wrecked";
}

/** B6629: what is loaded on a vehicle token (its sheet's hold, less its mounted guns); a mount tile carries none. */
function cargoOf(doc) {
  try { return (doc?.actor?.items?.contents ?? []).filter(i => i.type !== "Ranged Weapon" && i.type !== "Melee Weapon").length; } catch (e) { return 0; }
}

/** Moves of our own: their hooks know not to act on them again. */
const lifting = new Set();
async function setElevation(doc, elevation) {
  if ( !doc || Math.abs(num(doc.elevation) - elevation) < 0.001 ) return;
  lifting.add(doc.uuid);
  try { await doc.update({elevation}, {wodxMove: false, wodxFlight: true}); } catch (e) { console.warn(`${MOD} | flight`, e); } finally { lifting.delete(doc.uuid); }
}
async function card(title, lines, whisper = []) {
  return ChatMessage.create({speaker: {alias: "WoDX"}, whisper, content: `<div class="wodx-card wix-flight"><h3>${esc(title)}</h3>${lines.map(l => `<p>${esc(l)}</p>`).join("")}</div>`});
}

/** Active GM: the one at the controls set their height. Takes the craft and everyone aboard with them. */
export async function onPilotHeight(tokDoc, want) {
  const scene = tokDoc.parent;
  for ( const doc of deps.mountsOf?.(scene) ?? [] ) {
    if ( doc.id === tokDoc.id || doc.flags?.[MOD]?.driver?.t !== tokDoc.uuid ) continue;
    const o = deps.describeObj?.(doc), kind = o?.kind;
    if ( !F.flies(kind) ) return;
    const ground = groundUnder(doc), gFt = toFeet(scene, ground);
    const skill = F.FLYERS[kind].skill, dots = dotsOf(tokDoc.actor, skill);
    const wrecked = isWrecked(o, kind);
    const res = wrecked && num(want) > num(doc.elevation)
      ? {to: toFeet(scene, num(doc.elevation)), held: "wrecked", note: "It is wrecked: it goes nowhere but down.", takeoff: false, landing: false}
      : F.climb(kind, {ground: gFt, from: toFeet(scene, num(doc.elevation)), want: toFeet(scene, want), pilotDots: dots, cargo: cargoOf(doc)});
    const to = fromFeet(scene, res.to);
    if ( Math.abs(to - num(want)) > 0.001 ) await setElevation(tokDoc, to);
    await setElevation(doc, to);
    for ( const r of aboardOf(doc) ) {
      if ( r.t === tokDoc.uuid ) continue;
      const td = await fromUuid(r.t).catch(() => null);
      if ( td?.parent?.id === scene.id ) await setElevation(td, to);
    }
    if ( res.note ) await card(`${o?.title || C.WAYS[kind]?.label || "It"}`, [res.note], ownersOf(tokDoc.actor));
    if ( res.takeoff || res.landing ) deps.mapEvent?.(res.takeoff ? "takeoff" : "landing", {doc, tokDoc, noise: R.MOUNTS[kind]?.noise ?? "loud", object: kind, extra: {feet: Math.round(res.to - gFt)}});
    return res;
  }
  return null;
}

/** Damage through WoDX Combat's soak, as a fall is. */
async function hurt(tokDoc, dice, type) {
  if ( dice < 1 ) return "a hard jolt, no harm";
  const what = `${dice} ${type} ${dice === 1 ? "die" : "dice"}`;
  if ( !game.wodxCombat?.soakAndApply ) return `${what}; WoDX Combat is off, so roll soak and apply it by hand`;
  try { await game.wodxCombat.soakAndApply(tokDoc.object ?? tokDoc.actor, {mode: "pool", amount: dice, type, fireSun: false, soakDiff: 6, soak: true, fortBlood: "auto", soakBonus: 0}); return `${what}, soaked on the WoDX Combat card`; }
  catch (e) { console.error(`${MOD} | flight`, e); return `${what}; roll soak and apply it by hand`; }
}

/** Active GM: a craft comes down out of control. why: "wrecked" | "unpiloted". */
export async function bringDown(doc, why = "wrecked") {
  const scene = doc.parent, o = deps.describeObj?.(doc), kind = o?.kind;
  const feet = altOf(doc);
  if ( !F.flies(kind) || !F.airborne(feet) ) return null;
  const year = o?.built || num(deps.yearNow?.()) || 2030;
  const body = C.bodyOf(kind, year), crash = F.crashFall(kind, body, {feet});
  const ground = groundUnder(doc), label = o?.title || R.MOUNTS[kind]?.label || "craft";
  await setElevation(doc, ground);
  const lines = [why === "wrecked" ? `The ${label.toLowerCase()} is wrecked in the air and falls ${Math.round(feet)} feet.` : `${F.unpiloted(kind, feet).note} It falls ${Math.round(feet)} feet.`];
  for ( const r of aboardOf(doc) ) {
    const td = await fromUuid(r.t).catch(() => null);
    if ( !td || td.parent?.id !== scene.id ) continue;
    await setElevation(td, ground);
    lines.push(`${td.name}: ${crash.parts.join(", ")}: ${await hurt(td, crash.dice, crash.type)}.`);
  }
  // the craft itself takes the fall too (Mage 20th p. 459: what gets through its Durability comes off its Structure)
  const levels = F.fallDice(feet).dice;
  if ( why !== "wrecked" && body && levels > body.durability ) {
    const lost = Math.min(body.structure, num(o?.hull?.lost) + levels - body.durability);
    try {
      if ( doc.documentName === "Token" && doc.actor ) await doc.actor.update({"system.lost": lost});
      else await doc.update({[`flags.${MOD}.hull`]: {...(doc.flags?.[MOD]?.hull ?? {}), lost, structure: body.structure}});
    } catch (e) { console.warn(`${MOD} | flight`, e); }
  }
  await card(`${label} comes down`, lines);
  deps.mapEvent?.("crash", {doc, noise: "loud", object: kind, extra: {feet: Math.round(feet), why}});
  return {feet, crash};
}

/** Who was aboard each craft as last seen, to tell who stepped off in the air. */
const seen = new Map();
const seenOf = doc => seen.get(doc.uuid) ?? null;
const remember = doc => seen.set(doc.uuid, aboardOf(doc).map(r => r.t));

/** Active GM: someone left a craft in the air: they fall, unless they fly. */
async function steppedOff(doc, uuid, feet) {
  const td = await fromUuid(uuid).catch(() => null);
  if ( !td || td.parent?.id !== doc.parent?.id || td.movementAction === "fly" ) return;
  const tdFeet = altOf(td);
  if ( !F.airborne(tdFeet) ) return;
  const fall = F.fallDice(Math.min(feet, tdFeet));
  await setElevation(td, groundUnder(td));
  await card(`${td.name} falls`, [`${td.name} goes over the side ${Math.round(tdFeet)} feet up: ${await hurt(td, fall.dice, fall.type)}.`]);
  deps.mapEvent?.("fall", {doc, tokDoc: td, noise: "loud", object: kindOf(doc), extra: {feet: Math.round(tdFeet)}});
}

/** Active GM: a craft's riders, driver or damage changed. */
async function onCraftChanged(doc) {
  const kind = kindOf(doc);
  if ( !F.flies(kind) ) { remember(doc); return; }
  const feet = altOf(doc), before = seenOf(doc), now = aboardOf(doc).map(r => r.t);
  remember(doc);
  if ( !F.airborne(feet) ) return;
  const o = deps.describeObj?.(doc);
  if ( isWrecked(o, kind) ) { await bringDown(doc, "wrecked"); return; }
  if ( before ) for ( const u of before.filter(u => !now.includes(u)) ) await steppedOff(doc, u, feet);
  if ( before && before.length && !doc.flags?.[MOD]?.driver?.t ) {
    const u = F.unpiloted(kind, feet);
    if ( u.falls ) await bringDown(doc, "unpiloted");
    else if ( u.note ) await card(`${o?.title || R.MOUNTS[kind]?.label}: nobody at the controls`, [u.note]);
  }
}

export function setupFlight(d = {}) {
  deps = d;
  const go = fn => (...a) => { if ( isActiveGM() ) fn(...a).catch(e => console.error(`${MOD} | flight`, e)); };
  Hooks.on("updateToken", (doc, changes, options) => {
    if ( !isActiveGM() || options?.wodxFlight || lifting.has(doc.uuid) ) return;
    if ( "elevation" in (changes ?? {}) ) go(onPilotHeight)(doc, changes.elevation);
    if ( changes?.flags?.[MOD] && deps.beastOf?.(doc) ) go(onCraftChanged)(doc);
  });
  Hooks.on("updateTile", (doc, changes) => { if ( changes?.flags?.[MOD] && doc.flags?.[MOD]?.mount ) go(onCraftChanged)(doc); });
  // a vehicle on its own sheet: its damage is on the sheet (B4968)
  Hooks.on("updateActor", (actor, changes) => {
    if ( !("lost" in (changes?.system ?? {})) ) return;
    for ( const t of actor.getActiveTokens?.(false, true) ?? [] ) go(onCraftChanged)(t);
  });
  Hooks.on("canvasReady", () => { for ( const doc of deps.mountsOf?.(canvas.scene) ?? [] ) remember(doc); });
  return {rules: F, altOf, groundUnder, onPilotHeight, bringDown, toFeet, fromFeet};
}
