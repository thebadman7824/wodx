import {MODULE_ID, esc} from "./util.mjs";
import * as T from "./trait-rules.mjs";

/**
 * WoDX Chronicle 0.23.0 (Traits With Teeth step 8): backgrounds made into things in the world, by the Storyteller.
 *   People   Allies, Contacts, Retainers, Mentor and the like become NPC sheets (made by WoDX Creation's People when it
 *            is on), each flagged wodx-chronicle.bound = {actor, bg, role} and set to its starting attitude toward
 *            the character in WoDX NPC. A Kindred's retainers are made ghouls of that Kindred.
 *   Places   Domain, Node, Haunt and the like become a region on the scene the character is on, owned by the
 *            character in WoDX Storyteller.
 * What was made is kept on the background item (flag wodx-chronicle.made), so running it again only makes what a
 * grown background now calls for, and a sheet deleted since is made again.
 */

const api = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;
const FOLDER = "WoDX backgrounds";

/** {itemId: [ids or UUIDs still in the world]} for the character's backgrounds. */
export function madeOf(actor) {
  const out = {};
  for ( const i of actor?.items ?? [] ) {
    const ids = i.flags?.[MODULE_ID]?.made;
    if ( !Array.isArray(ids) ) continue;
    out[i.id] = ids.filter(x => (String(x).includes(".") ? !!fromUuidSync?.(x) : !!game.actors.get(x)));
  }
  return out;
}
export const plan = (actor, view) => T.worldPlan(view, madeOf(actor));

async function folderId() {
  let f = game.folders.find(x => x.type === "Actor" && x.name === FOLDER);
  f ??= await Folder.create({name: FOLDER, type: "Actor", color: "#4a3b2a"});
  return f.id;
}

async function makePeople(actor, p) {
  const P = api("wodx-creation")?.people;
  let made = [];
  if ( P?.generate && P?.create && p.kind !== "kindred" && !["vampire", "werewolf", "mage", "changeling", "wraith", "demon", "mummy"].includes(p.kind) ) {
    const gen = Array.from({length: p.more}, (_, i) => P.generate({batch: `bg-${actor.id}-${p.key}`, row: p.have + i, kind: p.kind === "ghoul" ? "ghoul" : "mortal"}));
    made = await P.create({people: gen, domitorId: p.kind === "ghoul" ? actor.id : null}) ?? [];
  } else {
    // The holder's own kind (a Kindred's mentor): a sheet of the holder's type, named from WoDX Creation when it can
    const folder = await folderId();
    for ( let i = 0; i < p.more; i++ ) {
      let name = `${actor.name}'s ${p.role.toLowerCase()}`;
      try { name = P?.generate?.({batch: `bg-${actor.id}-${p.key}`, row: p.have + i})?.name || name; } catch (e) { /* default name */ }
      made.push(await Actor.create({name, type: actor.type, folder}));
    }
  }
  const AT = api("wodx-npc")?.attitude;
  for ( const n of made.filter(Boolean) ) {
    await n.update({[`flags.${MODULE_ID}.bound`]: {actor: actor.id, bg: p.key, role: p.role}});
    try { await AT?.apply?.(n, actor, {to: p.to, why: `${p.role} to ${actor.name} (${p.name} ${p.rating})`}); } catch (e) { /* no NPC module */ }
  }
  return made.filter(Boolean).map(n => n.id);
}

async function makePlace(actor, p) {
  const scene = canvas?.scene;
  if ( !scene ) return [];
  const g = scene.grid?.size ?? 100;
  const tok = actor.getActiveTokens?.(true, true)?.find(t => t.parent?.id === scene.id) ?? null;
  const cx = tok ? tok.x + (tok.width ?? 1) * g / 2 : (scene.width ?? 4000) / 2;
  const cy = tok ? tok.y + (tok.height ?? 1) * g / 2 : (scene.height ?? 3000) / 2;
  const w = p.size * g;
  const [reg] = await scene.createEmbeddedDocuments("Region", [{name: `${actor.name}'s ${p.word}`, color: "#8a6a2a",
    shapes: [{type: "rectangle", x: Math.round(cx - w / 2), y: Math.round(cy - w / 2), width: w, height: w, rotation: 0, hole: false}],
    flags: {[MODULE_ID]: {place: {actor: actor.id, bg: p.key, rating: p.rating}}}}]);
  if ( !reg ) return [];
  try { await api("wodx-storyteller")?.owners?.set?.(reg, {kind: "actor", id: actor.id, name: actor.name, note: `${p.name} ${p.rating}`}); } catch (e) { /* no owners */ }
  return [reg.uuid];
}

/** Storyteller only: make what the character's backgrounds call for. Returns [{name, made: [names]}]. */
export async function makeReal(actor, view) {
  if ( !game.user.isGM || !actor ) return [];
  const done = [];
  for ( const p of plan(actor, view).filter(x => x.more > 0) ) {
    const item = actor.items.get(p.id);
    let ids = [];
    try { ids = p.place ? await makePlace(actor, p) : await makePeople(actor, p); } catch (e) { console.error(`${MODULE_ID} |`, e); }
    if ( !ids.length ) continue;
    const before = madeOf(actor)[p.id] ?? [];
    await item?.update({[`flags.${MODULE_ID}.made`]: [...before, ...ids]});
    done.push({name: p.name, made: ids.map(x => (String(x).includes(".") ? fromUuidSync?.(x)?.name : game.actors.get(x)?.name) ?? x)});
  }
  if ( done.length ) await ChatMessage.create({speaker: {alias: "Chronicle"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="wodx-card"><h3>${esc(actor.name)}: backgrounds made real</h3><ul>${done.map(d => `<li><b>${esc(d.name)}</b>: ${d.made.map(esc).join(", ")}</li>`).join("")}</ul></div>`});
  return done;
}
