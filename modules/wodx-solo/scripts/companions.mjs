/**
 * WoDX Solo: companions carry the fallen (B5079, Ben's Carry Bodies Desk, c10).
 *
 * In a Lone Chronicle nobody else is at the table to pick the player's character up. When that character goes down
 * (incapacitated, unconscious, asleep, staked, in torpor or dead, as WoDX Interactables reads it), the seat has the
 * nearest companion carry or drag them away from danger by itself: an NPC who serves the character first (a ghoul, a
 * retainer, a follower, a bound one), else a friendly NPC on the scene. The panel's Carry the fallen asks a companion to
 * do the same for anyone else who is down. The carrying itself is WoDX Interactables' (the body moves on the map with
 * the carrier) and the walk is WoDX NPC's (orderCarry): in a fight the companion does it on its own turn.
 *
 *   setting wodx-solo.carry   Boolean  "Companions carry the fallen" (default on)
 */
import * as R from "./solo-rules.mjs";
import {addAsks, characterOf, tell} from "./panel.mjs";

const MOD = "wodx-solo";
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const haul = () => (game.modules.get("wodx-interactables")?.active ? game.modules.get("wodx-interactables").api?.haul ?? null : null);
const npcApi = () => (game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc").api ?? null : null);

let H = null; // from main.mjs: {isOn, isSeat, log, get}

const yards = (a, b) => {
  try {
    const g = canvas.scene.grid, c = d => ({x: d.x + (d.width || 1) * g.size / 2, y: d.y + (d.height || 1) * g.size / 2});
    const units = canvas.grid.measurePath([c(a), c(b)]).distance;
    const toYards = game.modules.get("wodx-combat")?.api?.auto?.toYards;
    return toYards ? toYards(units, g.units ?? "ft") : units / 3;
  } catch (e) { return null; }
};
/** The actor ids a follower serves (WoDX NPC's orders, Chronicle's binding, Creation's domitor and patron). */
function servesOf(actor) {
  const f = actor?.flags ?? {}, out = [];
  const id = v => (typeof v === "string" ? v.split(".").pop() : v?.id ?? null);
  for ( const v of Array.isArray(f["wodx-npc"]?.serves) ? f["wodx-npc"].serves : [] ) out.push(id(v));
  out.push(id(f["wodx-chronicle"]?.bound?.actor), id(f["wodx-creation"]?.lineage?.domitor), id(f["wodx-creation"]?.ally?.patron));
  return out.filter(Boolean);
}

/** The companions on the fallen one's scene, ranked by solo-rules.mjs companionFor. */
export function companionFor(body, master = null) {
  const ix = haul();
  if ( !ix || !body?.parent ) return null;
  const F = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  const list = all(body.parent.tokens).filter(t => t.id !== body.id && t.actor && !t.hidden).map(t => ({
    id: t.id, name: t.name, distance: yards(t, body), player: !!t.actor.hasPlayerOwner, down: !!ix.fallenOf(t)?.down,
    holding: !!t.flags?.["wodx-interactables"]?.hauling, hands: !!ix.handsOf(t.actor),
    serves: !!master && servesOf(t.actor).includes(master.id), friendly: t.disposition === F
  }));
  const c = R.companionFor(list);
  return c ? body.parent.tokens.get(c.id) : null;
}

/** Have a companion carry this fallen token. The seat only. -> {ok, text} */
export async function carryFallen(body, {why = "", userId = null} = {}) {
  if ( !H?.isSeat() || !body ) return {ok: false, text: ""};
  const npc = npcApi();
  if ( !npc?.orderCarry || !haul() ) return {ok: false, text: "Carrying needs WoDX NPC and WoDX Interactables."};
  if ( (body.flags?.["wodx-interactables"]?.haul?.by ?? []).length ) return {ok: false, text: `${body.name} is already being carried.`};
  const player = game.users.find(u => !u.isGM && u.active) ?? null;
  const comp = companionFor(body, characterOf(player));
  if ( !comp ) {
    if ( userId ) await tell(userId, `<p>No companion is near enough to carry ${foundry.utils.escapeHTML?.(body.name) ?? body.name}.</p>`);
    return {ok: false, text: "no companion near"};
  }
  if ( body.parent?.id !== canvas.scene?.id ) return {ok: false, text: "not on the seat's scene"};
  const r = await npc.orderCarry(comp.object ?? comp, body.object ?? body);
  await H.log({kind: "carry", source: MOD, title: `${comp.name} carries ${body.name}`, note: `${why}${why ? "; " : ""}${r?.text ?? ""}`});
  if ( userId && r?.text ) await tell(userId, `<p>${foundry.utils.escapeHTML?.(r.text) ?? r.text}</p>`);
  return {ok: !!r?.ok || !!r?.later, text: r?.text ?? ""};
}

/** The watcher: the lone player's own character goes down. */
const pending = new Set();
function watch(actor) {
  if ( !H?.isSeat() || H.get("carry") === false || !actor ) return;
  const player = game.users.find(u => !u.isGM && u.active) ?? null;
  const mine = characterOf(player);
  const base = actor.isToken ? (actor.baseActor ?? actor) : actor;
  if ( !mine || base.id !== mine.id ) return;
  const body = all(canvas.scene?.tokens).find(t => t.actorId === mine.id);
  if ( !body || pending.has(body.id) ) return;
  pending.add(body.id);
  // a moment for the statuses to settle, and for the knock that put them down to finish
  setTimeout(async () => {
    try {
      const f = haul()?.fallenOf(body);
      if ( f?.down ) await carryFallen(body, {why: `${mine.name} is down (${f.why})`});
    } catch (e) { console.warn(`${MOD} | carry`, e); }
    finally { pending.delete(body.id); }
  }, 1500);
}

export function registerCarrySettings() {
  game.settings.register(MOD, "carry", {name: "Companions carry the fallen",
    hint: "In a Lone Chronicle, when the player's character goes down, the nearest companion (one who serves them, else a friendly NPC) carries or drags them away from danger by itself. The panel's Carry the fallen asks a companion to carry anyone else who is down.",
    scope: "world", config: true, type: Boolean, default: true});
}

export function installCarry(helpers) {
  H = helpers;
  addAsks({
    "ask.carry": async p => {
      const scene = game.scenes.get(p.sceneId), body = scene?.tokens?.get(p.tokenId);
      if ( !body ) return null;
      if ( !haul()?.fallenOf(body)?.down ) return tell(p.userId, `<p>${body.name} is not down.</p>`);
      return carryFallen(body, {why: "the player asked", userId: p.userId});
    }
  });
  const onEffect = e => { if ( e.parent?.documentName === "Actor" ) watch(e.parent); };
  Hooks.on("createActiveEffect", onEffect);
  Hooks.on("deleteActiveEffect", onEffect);
  Hooks.on("updateActor", (actor, ch) => { if ( foundry.utils.hasProperty(ch, "system.health") ) watch(actor); });
}

export const carryApi = {companionFor, carryFallen};
