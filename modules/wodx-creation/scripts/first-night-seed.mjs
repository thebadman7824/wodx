/**
 * WoDX Creation 0.12.0: Before the First Night, seeding the world at sign-off (Chronicle Start Desk d4, d7). The
 * Storyteller gets one chat card per thing the character's choices can put into the world: an enemy from the past
 * made as an NPC who regards the character as Hostile, the Ledger entries of the flaws, the Backgrounds made real,
 * a dated hook from the coming events, and a starting standing with each faction that knows the character's kind.
 * Each card has Make it and Skip; a card that was made has Undo. Nothing happens until the Storyteller presses.
 * The cards are worked out in first-night-rules.mjs (seedCards, suggestStanding).
 */
import {MODULE_ID, esc} from "./actor-data.mjs";
import * as R from "./first-night-rules.mjs";
import {makePeople, lifepathOf} from "./lifepath.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

const api = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;
const chron = () => api("wodx-chronicle");
const story = () => api("wodx-storyteller");
const npc = () => api("wodx-npc");
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const KEY = "fnSeed";

/** The standing suggestions for one character, from WoDX NPC's factions and rivalries. */
export function standingFor(actor, rivals = []) {
  const N = npc();
  const st = N?.factions?.state?.();
  if ( !st?.factions?.length ) return [];
  const sides = N?.rivalry?.sidesOf?.(actor)?.own ?? [];
  let status = 0;
  try { status = Number(chron()?.traits?.has?.(actor, "status")) || 0; } catch (e) { status = 0; }
  const factions = st.factions.filter(f => !f.dormant).map(f => ({id: f.id, name: f.name, key: f.key, kind: f.kind, current: f.people?.[actor.id] ?? 0}));
  return R.suggestStanding({sides, status, factions, rivals});
}

/** Post the cards. items: the forecast; rivals: the rivalry rows the forecast used. */
export async function postSeedCards(actor, items, rivals = []) {
  if ( !game.user.isGM ) return [];
  const cards = R.seedCards(items, standingFor(actor, rivals));
  const made = [];
  for ( const c of cards ) {
    made.push(await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Before the First Night"}, content: cardHtml(actor, c, "open"),
      flags: {[MODULE_ID]: {[KEY]: {actorId: actor.id, card: c, state: "open", undo: null}}}}));
  }
  return made;
}

function cardHtml(actor, c, state) {
  const btns = state === "open" ? `<button type="button" data-wodx-fn-make>Make it</button><button type="button" data-wodx-fn-skip>Skip</button>`
    : state === "made" ? `<p class="wodx-quiet">Made.</p><button type="button" data-wodx-fn-undo>Undo</button>` : `<p class="wodx-quiet">${state === "undone" ? "Undone." : "Skipped."}</p>`;
  return `<div class="wodx-card wodx-fn-seed"><h3>${esc(actor.name)}: ${esc(c.title)}</h3><p>${esc(c.text)}</p><div class="wodx-buttons">${btns}</div></div>`;
}

async function setState(message, state, undo = null) {
  const f = message.flags[MODULE_ID][KEY];
  const actor = game.actors.get(f.actorId);
  await message.update({content: cardHtml(actor ?? {name: "?"}, f.card, state), [`flags.${MODULE_ID}.${KEY}.state`]: state, [`flags.${MODULE_ID}.${KEY}.undo`]: undo});
}

/** Carry out one card. Returns what Undo needs. */
export async function make(actor, c) {
  const S = story(), C = chron(), N = npc();
  if ( c.kind === "enemy" ) {
    const [a] = await makePeople({actorId: actor.id, people: [{role: c.data.role, note: "", year: c.data.year}]});
    if ( !a ) return null;
    try { await N?.attitude?.apply?.(a, actor, {to: -2, why: "An enemy from the past"}); } catch (e) { /* NPC off */ }
    return {actors: [a.id], role: c.data.role, year: c.data.year};
  }
  if ( c.kind === "ledger" ) {
    const made = await S?.ledger?.syncTraits?.([actor]) ?? [];
    return {ledger: made.map(e => e.id)};
  }
  if ( c.kind === "hook" ) {
    if ( !S?.ledger?.save ) return null;
    let due = null;
    try { due = getEngine().dateToTime({year: c.data.year, month: 1, day: 1}); } catch (e) { due = null; }
    const e = await S.ledger.save({kind: "consequence", to: {id: actor.id, name: actor.name}, due,
      what: `${c.data.name}: how it reaches ${actor.name}`, notes: "From Before the First Night: a dated event coming in the character's line."});
    return {ledger: [e.id]};
  }
  if ( c.kind === "background" ) {
    const before = Object.fromEntries(actor.items.map(i => [i.id, [...(i.flags?.["wodx-chronicle"]?.made ?? [])]]));
    await C?.traits?.makeReal?.(actor);
    const after = actor.items.map(i => ({id: i.id, made: i.flags?.["wodx-chronicle"]?.made ?? []}));
    return {bg: after.map(x => ({id: x.id, before: before[x.id] ?? [], added: x.made.filter(m => !(before[x.id] ?? []).includes(m))})).filter(x => x.added.length)};
  }
  if ( c.kind === "standing" ) {
    const st = N?.factions?.state?.();
    const was = st?.factions?.find(f => f.id === c.data.faction)?.people?.[actor.id] ?? 0;
    await N?.factions?.adjustPeople?.(c.data.faction, actor.id, {to: c.data.to, spill: false});
    return {faction: c.data.faction, was};
  }
  return null;
}

/** Take a made card back. */
export async function undo(actor, c, u) {
  if ( !u ) return;
  for ( const id of u.actors ?? [] ) await game.actors.get(id)?.delete();
  if ( u.actors?.length && actor ) {
    const rec = lifepathOf(actor);
    const p = rec?.people?.find(q => u.actors.includes(q.actorId));
    if ( p ) { delete p.actorId; delete p.name; await actor.update({[`flags.${MODULE_ID}.lifepath.people`]: rec.people}); }
  }
  const remove = story()?.ledger?.remove;
  for ( const id of u.ledger ?? [] ) { if ( remove ) await remove(id); else await story()?.ledger?.status?.(id, "void"); }
  for ( const b of u.bg ?? [] ) {
    for ( const ref of b.added ) {
      const doc = String(ref).includes(".") ? await fromUuid(ref) : game.actors.get(ref);
      await doc?.delete?.();
    }
    await actor?.items?.get(b.id)?.update({"flags.wodx-chronicle.made": b.before});
  }
  if ( u.faction ) await npc()?.factions?.adjustPeople?.(u.faction, actor.id, {to: u.was, spill: false});
}

export function registerSeedCards() {
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const f = message.flags?.[MODULE_ID]?.[KEY];
    if ( !f ) return;
    const root = el?.[0] ?? el;
    const buttons = root?.querySelectorAll?.("[data-wodx-fn-make], [data-wodx-fn-skip], [data-wodx-fn-undo]") ?? [];
    if ( !game.user.isGM ) { buttons.forEach(b => b.remove()); return; }
    const actor = game.actors.get(f.actorId);
    const busy = fn => async ev => { ev.currentTarget.disabled = true; try { await fn(); } catch (e) { console.error(`${MODULE_ID} | seed`, e); ui.notifications.error("That did not work; see the console."); } };
    root.querySelector("[data-wodx-fn-make]")?.addEventListener("click", busy(async () => {
      if ( !actor ) return;
      const u = await make(actor, f.card);
      await setState(message, u ? "made" : "skipped", u);
    }));
    root.querySelector("[data-wodx-fn-skip]")?.addEventListener("click", busy(() => setState(message, "skipped")));
    root.querySelector("[data-wodx-fn-undo]")?.addEventListener("click", busy(async () => {
      await undo(actor, f.card, f.undo);
      await setState(message, "undone");
    }));
  });
}
