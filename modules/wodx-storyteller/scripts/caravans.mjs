/**
 * WoDX Storyteller 0.49.0: caravans on the road between linked markets (rules in caravan-rules.mjs).
 *
 * The weekly market turn hands over the goods that linked markets trade; they leave as a caravan and reach the far
 * market after the days the road takes in that year. The active Storyteller's client brings caravans in as the clock
 * passes. A caravan in town sets WoDX Interactables' living tiles that wait for one. A player character who travels
 * between the two markets while a caravan is out is noted in the Storyteller's log.
 * World settings: caravans (on or off) and the hidden caravanState = {v, list}.
 */
import * as CR from "./caravan-rules.mjs";
import * as MK from "./market-rules.mjs";
import * as Markets from "./markets.mjs";
import * as Country from "./country-rules.mjs";
import * as Rumours from "./rumours.mjs";
import {MOD, esc, chron, isActiveGM, gmIds, setting, log, timeLabel, tripContext, travelOf, sceneName} from "./core.mjs";

let KINDS = {};
const label = k => String(KINDS[k] ?? k).toLowerCase();
const now = () => game.time?.worldTime ?? 0;

export function registerCaravanSettings() {
  game.settings.register(MOD, "caravans", {name: "Caravans carry the trade between markets", scope: "world", config: true, type: Boolean, default: true,
    hint: "When linked markets trade in the weekly turn, the goods leave as a caravan of the year (a pack train, wagons, a goods train, lorries) and arrive after the days the road takes. A caravan lost on the road delivers nothing. Off: goods arrive at once, as before. Nothing happens until two markets are linked."});
  game.settings.register(MOD, "caravanState", {scope: "world", config: false, type: Object, default: CR.blankState()});
}
export const on = () => setting("caravans") !== false;
export const state = () => CR.normState(setting("caravanState"));
async function save(st) { if ( game.user.isGM ) await game.settings.set(MOD, "caravanState", CR.normState(st)); }

/** The road between two markets: the distance and, across the country map, the legs. */
function roadBetween(a, b, year) {
  const spot = m => {
    const scenes = (m.scenes ?? []).map(id => game.scenes.get(id)).filter(Boolean);
    const sc = scenes.find(s => travelOf(s).at) ?? scenes[0] ?? null;
    return sc ? {name: sceneName(sc), travel: travelOf(sc)} : null;
  };
  const p = spot(a), q = spot(b);
  if ( p?.travel?.at && q?.travel?.at ) {
    try {
      const t = Country.countryTrip({at: p.travel.at, name: a.name}, {at: q.travel.at, name: b.name}, {year, want: "coach"});
      if ( t?.km ) return {km: t.km, legs: (t.legs ?? []).some(l => l.hired) ? [] : t.legs};
    } catch (e) { console.error(`${MOD} | caravan road`, e); }
  }
  const km = q?.travel?.km ?? p?.travel?.km ?? null;
  return {km, legs: []};
}

/** Caravans set out with the week's trade. force: {marketId: dots of armed followers of whoever holds it}. */
export async function depart(shipments = [], trades = [], {at = now(), force = {}} = {}) {
  if ( !isActiveGM() || !on() ) return [];
  const loads = CR.cargoes(shipments, trades);
  if ( !loads.length ) return [];
  const mk = Markets.state(), st = state(), ctx = tripContext(at);
  const out = [];
  for ( const load of loads ) {
    const a = MK.marketById(mk, load.from), b = MK.marketById(mk, load.to);
    if ( !a || !b ) continue;
    const road = roadBetween(a, b, ctx.year);
    const c = CR.setOut(load, {id: foundry.utils.randomID(), now: at, year: ctx.year, future: ctx.future, km: road.km, legs: road.legs,
      names: {from: a.name, to: b.name}, guard: CR.guardFor({senderForce: force[a.id] ?? 0, raidedLately: false})});
    if ( c ) { st.list.push(c); out.push(c); }
  }
  if ( !out.length ) return [];
  await save(st);
  for ( const c of out ) Hooks.callAll("wodxCaravan", {phase: "left", caravan: c});
  return out;
}

/** Take caravans off the road as if they never left (the market turn's Undo). */
export async function remove(ids = []) {
  const st = state(), drop = new Set(ids);
  if ( !st.list.some(c => drop.has(c.id)) ) return;
  await save({...st, list: st.list.filter(c => !drop.has(c.id))});
  syncMaps();
}

function syncMaps() {
  try { game.modules.get("wodx-interactables")?.api?.living?.sync?.({force: true})?.catch?.(() => {}); } catch (e) { /* Interactables is off */ }
}

/** Bring in what has arrived. One look at a time, so two clock ticks cannot bring the same caravan in twice. */
let chain = Promise.resolve([]);
export function tick() {
  chain = chain.then(look, look);
  return chain;
}
async function look() {
  if ( !isActiveGM() ) return [];
  const before = state();
  if ( !before.list.length ) return [];
  const r = CR.tick(before, now());
  if ( !r.arrived.length && r.state.list.length === before.list.length ) return [];
  await save(r.state);
  for ( const c of r.arrived ) await bringIn(c);
  syncMaps();
  return r.arrived;
}

async function bringIn(c) {
  const d = CR.deliver(Markets.state(), c);
  if ( d.changes.length ) await Markets.saveState(d.state);
  const lines = d.changes.map(x => `${label(x.kind)}: supply ${MK.SUPPLY[x.from].label.toLowerCase()} to ${MK.SUPPLY[x.to].label.toLowerCase()}`);
  await ChatMessage.create({speaker: {alias: "Markets"}, whisper: gmIds(),
    content: `<div class="wodx-card wst-markets wst-caravan"><h3>A caravan comes in</h3><p>${esc(CR.describe(c, {kindLabel: label}))}, ${CR.daysOf(c)} ${CR.daysOf(c) === 1 ? "day" : "days"} on the road. It stands in ${esc(c.toName)} for ${CR.IN_TOWN_DAYS} days.</p>
      ${lines.length ? `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}<p class="wodx-quiet">House rules.</p></div>`});
  Hooks.callAll("wodxCaravan", {phase: "arrived", caravan: c, changes: d.changes});
}

/** A caravan is lost on the road. by: who took it, for the card and the talk. */
export async function loseCaravan(id, {by = null, quiet = false} = {}) {
  if ( !isActiveGM() ) return null;
  const r = CR.markLost(state(), id, {now: now(), by});
  if ( !r.caravan ) return null;
  await save(r.state);
  const l = CR.lose(Markets.state(), r.caravan);
  if ( l.changes.length ) await Markets.saveState(l.state);
  const c = r.caravan;
  if ( !quiet ) await ChatMessage.create({speaker: {alias: "Markets"}, whisper: gmIds(),
    content: `<div class="wodx-card wst-markets wst-caravan"><h3>A caravan is lost</h3><p>${esc(CR.describe(c, {kindLabel: label}))} never arrives${by ? `: ${esc(by)}` : ""}.</p>
      ${l.changes.length ? `<ul>${l.changes.map(x => `<li>${esc(x.name)}, ${esc(label(x.kind))}: price x${x.from} to x${x.to}</li>`).join("")}</ul>` : ""}<p class="wodx-quiet">House rules.</p></div>`});
  if ( setting("rumourNetwork") !== false ) {
    const tellers = (MK.marketById(Markets.state(), c.to)?.traders ?? []).map(t => t.actor).filter(a => game.actors.get(a));
    try { await Rumours.startRumour({text: `The ${CR.freightOf(c).label.replace(/^an? /, "")} from ${c.fromName} never reached ${c.toName}.`, tellers}); } catch (e) { console.error(`${MOD} | caravan talk`, e); }
  }
  Hooks.callAll("wodxCaravan", {phase: "lost", caravan: c, changes: l.changes});
  return {caravan: c, changes: l.changes};
}

/** Bring a caravan in now, whatever the clock says. */
export async function arriveNow(id) {
  if ( !isActiveGM() ) return null;
  const st = state(), c = st.list.find(x => x.id === id && x.state === "road");
  if ( !c ) return null;
  c.arrive = Math.max(c.left + 1, now());
  await save(st);
  return tick();
}

/** A character's trip: note any caravan on the same road at the same time. Called by core's travel. */
export async function onTrip({actor = null, fromScene = null, destScene = null, start = now(), arrive = now()} = {}) {
  if ( !isActiveGM() || !fromScene || !destScene ) return [];
  const mk = Markets.state();
  const a = MK.marketOfScene(mk, fromScene), b = MK.marketOfScene(mk, destScene);
  if ( !a || !b || a.id === b.id ) return [];
  const met = CR.between(state(), a.id, b.id, start, arrive);
  for ( const c of met ) {
    const same = c.from === a.id;
    await log({kind: "world", actor: actor?.id ?? null, name: actor?.name ?? null, place: b.name, attention: "A caravan on the road",
      text: `${CR.describe(c, {kindLabel: label})} is on this road, ${same ? "going the same way" : "coming the other way"}, ${CR.whereWords(c, start, Country.LAND_WORDS)} when ${actor?.name ?? "the traveller"} sets out. Guard ${c.guard}.`});
  }
  return met;
}

/** Scenes of markets where a caravan stands now (for living tiles). */
export function inTownScenes() {
  const ids = CR.inTown(state());
  if ( !ids.length ) return [];
  const mk = Markets.state();
  return [...new Set(ids.flatMap(id => MK.marketById(mk, id)?.scenes ?? []))];
}

/* ---------------------------------------------------------------- the Caravans window */

export async function caravansDialog() {
  if ( !game.user.isGM ) return;
  const st = state(), t = now();
  const rows = st.list.map(c => `<tr><td>${esc(CR.describe(c, {kindLabel: label}))}</td><td>${esc(CR.whereWords(c, t, Country.LAND_WORDS))}</td>
    <td>${c.state === "road" ? esc(timeLabel(c.arrive)) : c.state === "town" ? "Came in" : "Lost"}</td><td>${c.guard}</td>
    <td>${c.state === "road" ? `<button type="button" data-caravan-in="${esc(c.id)}">Bring it in</button> <button type="button" data-caravan-lost="${esc(c.id)}">Lost on the road</button>` : ""}</td></tr>`).join("");
  let pick = null;
  await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 760}, window: {title: "Caravans"}, classes: ["wodx-dialog", "wst-caravans"],
    content: `<p>The trade between linked markets, on the road. Goods bound for a market in want arrive with the caravan; one lost on the road delivers nothing and makes its cargo dearer where it was bound. Guard is what a raid must beat. Only the Storyteller sees this. House rules.</p>
      <div class="wst-scroll" style="max-height:420px"><table class="wst-caravans-t" data-fixed><thead><tr><th>Caravan</th><th>Where</th><th>Arrives</th><th>Guard</th><th></th></tr></thead>
      <tbody>${rows || "<tr><td colspan='5'>No caravan is out. They leave with the weekly market turn, when linked markets trade.</td></tr>"}</tbody></table></div>`,
    render: (ev, dialog) => {
      const el = dialog.element ?? dialog;
      el.querySelectorAll?.("button[data-caravan-in]").forEach(b => b.addEventListener("click", () => { pick = {id: b.dataset.caravanIn, act: "in"}; dialog.close(); }));
      el.querySelectorAll?.("button[data-caravan-lost]").forEach(b => b.addEventListener("click", () => { pick = {id: b.dataset.caravanLost, act: "lost"}; dialog.close(); }));
    },
    buttons: [{action: "close", label: "Close", default: true}]});
  if ( pick?.act === "in" ) { await arriveNow(pick.id); return caravansDialog(); }
  if ( pick?.act === "lost" ) { await loseCaravan(pick.id); return caravansDialog(); }
}

export async function setupCaravans() {
  try { KINDS = (await import("../../wodx-library/data/goods.mjs")).KINDS ?? {}; } catch (e) { KINDS = {}; }
  let lastHour = -1;
  Hooks.on("updateWorldTime", () => {
    const hour = Math.floor(now() / 3600);
    let skipping = false;
    try { skipping = !!chron()?.isSkipping?.(); } catch (e) { skipping = false; }
    if ( hour === lastHour || skipping || !isActiveGM() ) return;
    lastHour = hour;
    tick().catch(e => console.error(`${MOD} | caravans`, e));
  });
  Hooks.on("wodxSkipEnd", () => { if ( isActiveGM() ) tick().catch(e => console.error(`${MOD} | caravans`, e)); });
}

export const rules = CR;
export const api = () => ({open: caravansDialog, state, on, depart, tick, lose: loseCaravan, arriveNow, remove, inTownScenes, onTrip, rules: CR});
