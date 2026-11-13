/**
 * WoDX Combat 3.13.0: the body plan in Foundry. The rules are body-rules.js.
 *
 *  - bodyFor(actor): the body a character has now, from the Storyteller's shape flag (wodx-combat.shape), a
 *    shapechanger's form, the live effects (Shape of the Beast, Mist Form, Feral Claws...) and the lasting changes kept
 *    by WoDX Storyteller (flag wodx-storyteller.body, with a feature key).
 *  - When the shape changes, held weapons and armor that no longer fit come off, with an Undo card (house rule B1205).
 *  - The maiming card: offered to the Storyteller after a heavy blow to a limb or eye; "Mark as lost" adds a lasting
 *    change in WoDX Storyteller (house rule B1204).
 */
import * as B from "./body-rules.js";
import { effectsOf } from "./movement.js";

const MOD = "wodx-combat", ST = "wodx-storyteller";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const gx = () => game.wodxActions?.garouRules ?? null;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);

/** What body-rules reads from an actor. */
export function viewOf(actor) {
  if ( !actor ) return {};
  const G = gx();
  const shifter = !!G?.isShifter?.(actor);
  let garouForm = null, feraKey = null;
  if ( shifter ) { try { const i = G.info(actor); garouForm = i.form; feraKey = i.feraKey; } catch (e) { /* sheet without forms */ } }
  const changes = actor.flags?.[ST]?.body;
  const features = (Array.isArray(changes) ? changes : []).map(c => B.featureOf({feature: c?.feature, lost: c?.feature === "lost", lostPart: c?.lostPart, what: c?.what})).filter(Boolean);
  return {shapeFlag: actor.flags?.[MOD]?.shape ?? null, shifter, garouForm, feraKey, effects: effectsOf(actor), features};
}

/** The body a character has now. */
export const bodyFor = actor => B.bodyOf(viewOf(actor));

/** Weapons and armor on the sheet, in the shape gearToDrop reads. */
function gearOf(actor) {
  const out = [];
  for ( const i of actor?.items ?? [] ) {
    const kind = ["Melee Weapon", "Ranged Weapon"].includes(i.type) ? "weapon" : i.type === "Armor" ? "armor" : null;
    if ( !kind || i.system?.isnatural ) continue;
    const ded = !!(i.flags?.["wodx-actions"]?.attuned || i.flags?.["wodx-actions"]?.dedicated || /\bdedicated\b/i.test(String(i.system?.description ?? "")));
    out.push({id: i.id, name: i.name, kind, equipped: !!i.system?.isequipped, dedicated: ded});
  }
  return out;
}

/** Look at a character's shape and take off what no longer fits. Runs on the active GM. */
async function checkShape(actor) {
  if ( !isActiveGM() || !actor || !game.settings.get(MOD, "bodyGear") ) return;
  const body = bodyFor(actor);
  const before = actor.flags?.[MOD]?.bodyShape ?? "person";
  if ( before === body.shape ) return;
  await actor.setFlag(MOD, "bodyShape", body.shape);
  const gear = gearOf(actor), drop = B.gearToDrop(body, gear);
  if ( !drop.length ) return;
  await actor.updateEmbeddedDocuments("Item", drop.map(d => ({_id: d.id, "system.isequipped": false})));
  const names = drop.map(d => `${esc(gear.find(g => g.id === d.id)?.name)} (${esc(d.why)})`).join(", ");
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), whisper: [...gmIds(), ...game.users.filter(u => !u.isGM && actor.testUserPermission?.(u, "OWNER")).map(u => u.id)],
    flags: {[MOD]: {bodyGear: {actor: actor.uuid, ids: drop.map(d => d.id)}}},
    content: `<div class="vtc-card"><p><b>${esc(actor.name)}</b> takes the shape: <b>${esc(body.label)}</b>. Comes off: ${names}.</p><p><small>House rule. Dedicated items stay.</small></p><button type="button" data-action="wodx-body-undo">Undo</button></div>`});
}

async function undoGear(message) {
  const f = message.flags?.[MOD]?.bodyGear;
  const actor = f?.actor ? await fromUuid(f.actor) : null;
  if ( !actor || !game.user.isGM ) return;
  await actor.updateEmbeddedDocuments("Item", f.ids.filter(id => actor.items.get(id)).map(id => ({_id: id, "system.isequipped": true})));
  await message.update({content: `<div class="vtc-card"><p><s>${esc(actor.name)}: gear came off</s> (undone, put back on)</p></div>`});
}

/** The Storyteller's card after a heavy blow to a limb or eye. */
export async function offerMaim(target, offer, {attacker = null} = {}) {
  if ( !target || !offer || !game.settings.get(MOD, "hitLocations") ) return;
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX"},
    flags: {[MOD]: {maim: {actor: target.uuid, part: offer.part, label: offer.label, by: attacker?.name ?? ""}}},
    content: `<div class="vtc-card"><p>A heavy blow to <b>${esc(target.name)}</b>'s <b>${esc(offer.label.toLowerCase())}</b>. The Storyteller may rule it crippled until those health levels heal (+2 difficulty on actions with it, VtDA20 p. 348), or lost for good: then ${esc(target.name)} ${esc(offer.stops)}.</p><p><small>Offered at 3 or more lethal or aggravated levels after soak (house rule). Regrowing a lost part: Kindred with blood (VtDA20 p. 340), ghouls with Willpower, blood and a Stamina roll (V20 p. 501), Garou unless it becomes a Battle Scar (W20 p. 259).</small></p><button type="button" data-action="wodx-cripple">Crippled until healed</button> <button type="button" data-action="wodx-maim">Lost for good</button></div>`});
}

async function cripple(message) {
  const f = message.flags?.[MOD]?.maim;
  const actor = f?.actor ? await fromUuid(f.actor) : null;
  if ( !actor || !game.user.isGM ) return;
  await actor.createEmbeddedDocuments("ActiveEffect", [{name: `Crippled: ${f.label.toLowerCase()}`, img: "icons/svg/bones.svg",
    description: "+2 difficulty on actions with this part until the health levels from the blow heal (VtDA20 p. 348). Remove it then.", flags: {[MOD]: {crippled: f.part}}}]);
  await message.update({content: `<div class="vtc-card"><p>${esc(actor.name)}'s ${esc(f.label.toLowerCase())} is crippled until those health levels heal.</p></div>`});
}

async function maim(message) {
  const f = message.flags?.[MOD]?.maim;
  const actor = f?.actor ? await fromUuid(f.actor) : null;
  const api = game.modules.get(ST)?.active ? game.modules.get(ST).api?.body : null;
  if ( !actor || !game.user.isGM ) return;
  if ( !api?.add ) { ui.notifications.warn("WoDX Combat: losing a part needs WoDX Storyteller on."); return; }
  const part = /eye/.test(f.part) ? "eyes" : /hand/.test(f.part) ? "hands" : /arm/.test(f.part) ? "arms" : /leg/.test(f.part) ? "legs" : "whole";
  await api.add(actor, {source: "scar", part, what: `${f.label} lost`, feature: "lost", lostPart: f.part, by: f.by});
  await message.update({content: `<div class="vtc-card"><p>${esc(actor.name)}'s ${esc(f.label.toLowerCase())} is lost (on the lasting changes record).</p></div>`});
}

/* ---------- Where wounds are (Combat 3.22.0, house rule B2690) ---------- */

/** The track the doll reads: a wraith's Corpus, else the health track. */
export function trackOf(actor) {
  const d = actor?.system?.health?.damage ?? {};
  const c = d.corpus && (Number(d.corpus.bashing) || Number(d.corpus.lethal) || Number(d.corpus.aggravated)) ? d.corpus : d;
  return {bashing: Number(c.bashing) || 0, lethal: Number(c.lethal) || 0, aggravated: Number(c.aggravated) || 0};
}
const woundsOf = actor => { const w = actor?.flags?.[MOD]?.wounds; return Array.isArray(w) ? w : []; };

/** After damage from an attack card lands: note where (the owner or the GM who applied it calls this). */
export async function recordWound(actor, data, r, msgId) {
  if ( !actor || !data?.location?.id || !r?.after ) return;
  const type = r.effType ?? data.type, levels = Math.max(0, (Number(r.after[type]) || 0) - (Number(r.before?.[type]) || 0)) || data.levels;
  const list = B.trimWounds(B.addWounds(woundsOf(actor), {part: data.location.id, type, levels, msg: msgId, at: Date.now()}), trackOf(actor));
  await actor.setFlag(MOD, "wounds", list);
}

/** An undone attack takes its records back. */
export async function undoWound(actor, msgId) {
  const list = woundsOf(actor);
  if ( !actor || !list.some(w => w.msg === msgId) ) return;
  await actor.setFlag(MOD, "wounds", B.undoWounds(list, msgId));
}

/** The doll's numbers for an actor: {partId: {b, l, a}}. */
export const woundMap = actor => B.woundsByPart(woundsOf(actor), trackOf(actor), bodyFor(actor));

/** The Storyteller places a level of harm on a part, or clears a part. */
async function placeWound(actor, part, type) {
  const next = B.placeWound(woundsOf(actor), trackOf(actor), part, type, Date.now());
  if ( !next ) { ui.notifications.info(`Mark the ${type} level on the health track first: every ${type} level already has a place.`); return false; }
  await actor.setFlag(MOD, "wounds", next);
  return true;
}
async function clearWound(actor, part) { await actor.setFlag(MOD, "wounds", B.clearWounds(woundsOf(actor), part)); }

export function setupBody() {
  game.settings.register(MOD, "hitLocations", {name: "Hit locations (house rule)",
    hint: "Every attack lands on a part of the body: the attacker may aim at a part (the book's aimed-attack difficulty for its size) or the blow lands at random by size. A heavy blow to a limb or eye offers the Storyteller a maiming. Parts have no health of their own.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "bodyGear", {name: "Gear comes off in shapes that cannot use it (house rule)",
    hint: "When a character takes a shape without hands, weapons in hand drop; in a shape that cannot wear armor, armor comes off. Dedicated items stay. Each change posts an Undo card.",
    scope: "world", config: true, type: Boolean, default: true});
  const later = actor => setTimeout(() => checkShape(actor).catch(e => console.warn("WoDX Combat | body", e)), 50);
  Hooks.on("wodxFormChanged", actor => later(actor));
  Hooks.on("createActiveEffect", e => { if ( e.parent?.documentName === "Actor" ) later(e.parent); });
  Hooks.on("deleteActiveEffect", e => { if ( e.parent?.documentName === "Actor" ) later(e.parent); });
  // As the health track heals (or is set by hand), the oldest records of each kind go; only the user who changed it writes
  Hooks.on("updateActor", (actor, ch, _o, userId) => {
    if ( userId !== game.user.id || !foundry.utils.hasProperty(ch, "system.health.damage") ) return;
    const list = woundsOf(actor);
    if ( !list.length ) return;
    const next = B.trimWounds(list, trackOf(actor));
    if ( next.length !== list.length ) actor.setFlag(MOD, "wounds", next).catch(e => console.warn("WoDX Combat | wounds", e));
  });
  Hooks.on("updateActor", (actor, ch) => { if ( foundry.utils.hasProperty(ch, `flags.${MOD}.shape`) || foundry.utils.hasProperty(ch, `flags.${ST}.body`) || foundry.utils.hasProperty(ch, "system.shapes") ) later(actor); });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    if ( msg.flags?.[MOD]?.bodyGear ) el.querySelector("[data-action='wodx-body-undo']")?.addEventListener("click", () => undoGear(msg));
    if ( msg.flags?.[MOD]?.maim ) el.querySelector("[data-action='wodx-maim']")?.addEventListener("click", () => maim(msg));
    if ( msg.flags?.[MOD]?.maim ) el.querySelector("[data-action='wodx-cripple']")?.addEventListener("click", () => cripple(msg));
  });
  return {
    of: bodyFor, view: viewOf, rules: B, check: checkShape,
    /** Put a character in a shape by hand (null: back to what the sheet and effects say). */
    setShape: async (actor, key) => (key && B.SHAPES[key]) ? actor.setFlag(MOD, "shape", key) : actor.unsetFlag(MOD, "shape"),
    offerMaim, wounds: woundMap, placeWound, clearWound, recordWound, undoWound, track: trackOf
  };
}
