/**
 * WoDX Storyteller (B3280-B3289): towns that change over time (rules in town-rules.mjs).
 *
 * Every market is a town with a running condition: people, prosperity and unrest. Once a week of game time (checked
 * at most once a game hour, never during a skip; up to twelve weeks played after a skip, the rest settle quietly) the
 * town turn reads the markets (supply, prices, taxes, closed roads, shut shops), sieges at the town, plague years by
 * region and the town's own ground, and changes the towns. Fires, floods, storms, earthquakes, failed harvests,
 * plague, riots and risings are events: a failed harvest also makes bread short in the town's market. A siege won by
 * storm sacks the town (wodxBattle) and dated events with market news (wodxEventFired) reach every town.
 *
 * World setting townTurn: Auto (the week lands with one Undo card for the Storyteller; an event where a player
 * character stands waits in the approval queue) or Suggest (every town's week waits in the queue) or Off.
 * Hidden world state wodx-storyteller.townState. Big events start rumours from the town's traders, go in the
 * Storyteller's log, and fire wodxTown {town, kind, text, big} for other modules (passers-by, factions).
 */
import * as TR from "./town-rules.mjs";
import * as MT from "./market-turn-rules.mjs";
import * as MK from "./market-rules.mjs";
import * as MV from "./market-moves-rules.mjs";
import * as News from "./market-news-rules.mjs";
import * as Markets from "./markets.mjs";
import * as Rumours from "./rumours.mjs";
import * as Battles from "./battles.mjs";
import {MOD, esc, chron, isActiveGM, isPC, gmIds, setting, log} from "./core.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {WORLD_REGIONS} from "../../wodx-chronicle/scripts/world-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const TYPE = `${MOD}.town`;
const all = c => (c ? [...(c.contents ?? c)] : []);
const now = () => game.time?.worldTime ?? 0;
const latitude = () => { try { return Number(game.settings.get("wodx-chronicle", "latitude")) || 50.1; } catch (e) { return 50.1; } };
const dateAt = t => { try { const d = describeTime(t, latitude()); return {month: d.month, year: d.year}; } catch (e) { return {month: 1, year: 1197}; } };
const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch (e) { return false; } };
const mode = () => setting("townTurn") ?? "auto";
export const state = () => TR.normState(setting("townState"));
async function save(st) { if ( game.user.isGM ) await game.settings.set(MOD, "townState", TR.normState(st)); }
const hashOf = s => { let h = 2166136261; for ( const c of String(s) ) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
/** A number source for one town and one turn: the same world draws the same, and a week run by hand twice draws anew. */
function seeded(seed) { let a = hashOf(seed) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function registerTownSettings() {
  game.settings.register(MOD, "townTurn", {name: "Towns change over time", scope: "world", config: true, type: String, default: "auto",
    hint: "Once a week of game time every market's town grows or shrinks, does better or worse and grows angrier or calmer, from its market, sieges, plague years and disasters (fire, flood, storm, earthquake, failed harvests), with riots and risings when anger boils over. Auto: the week lands with an Undo card; an event where a player character stands waits in the approval queue. Suggest: every change waits in the queue. Off: towns change only by hand.",
    choices: {auto: "Auto", suggest: "Suggest", off: "Off"}});
  game.settings.register(MOD, "townState", {scope: "world", config: false, type: Object, default: TR.blankState()});
}

/* ------------------------------------------------------------------ */
/*  What the town turn reads                                           */
/* ------------------------------------------------------------------ */

const sceneName = id => { const s = game.scenes?.get(id); return s?.navName || s?.name || ""; };
/** Sieges still running, by the market they sit at. */
function besiegedIds(markets) {
  const out = new Set();
  try { for ( const b of Battles.list() ) if ( b.kind === "siege" && !b.over ) { const m = TR.townOfPlace(b.place || b.war?.place, markets, sceneName); if ( m ) out.add(m.id); } } catch (e) { /* no battles */ }
  return out;
}
function ctxFor(m, sieges, {town = null, year = 0} = {}) {
  const shut = m.traders.length ? m.traders.filter(t => t.shut).length / m.traders.length : 0;
  let taxes = (m.moves ?? []).filter(v => v.type === "tax").reduce((s, v) => s + v.rate, 0);
  // B3616: a levy of the land (WoDX Chronicle's taxes) weighs on the town too; a crushing one most of all
  try { const law = chron()?.law?.tax; if ( law ) taxes += law.rules.townTaxFrom(law.here(regionOfMarket(m, town), year || undefined)); } catch (e) { /* no taxes of the land */ }
  return {foodSupply: MK.supplyOf(m, "food"), foodIndex: MK.indexOf(m, "food") * (1 + MV.taxOn(m, "food")), fuelIndex: MK.indexOf(m, "fuel"),
    taxes, closedRoads: Object.keys(m.unsafe ?? {}).length, shutShare: shut, besieged: sieges.has(m.id)};
}
/** The town's region of the world: its own, else its first scene's, else the chronicle's homeland. */
function regionOfMarket(m, t) {
  if ( t?.region && WORLD_REGIONS[t.region] ) return t.region;
  try {
    const w = chron()?.world;
    const sc = (m?.scenes ?? []).map(s => game.scenes.get(s)).find(Boolean);
    const id = (sc && w?.here ? w.here(sc)?.id : null) ?? (typeof w?.homeland?.() === "string" ? w.homeland() : null);
    if ( id && WORLD_REGIONS[id] ) return id;
  } catch (e) { /* fall through */ }
  return "moravia";
}
/** Markets where a player character's token stands now. */
function pcTowns(st) {
  const ids = new Set();
  for ( const s of all(game.scenes) ) {
    if ( !all(s.tokens).some(t => isPC(t.actor)) ) continue;
    const m = MK.marketOfScene(st, s.id);
    if ( m ) ids.add(m.id);
  }
  return ids;
}
/** People from the settlement generator's record, when a settlement journal bears the market's name. */
function peopleFromRecord(m) {
  const want = String(m.name ?? "").toLowerCase().trim();
  for ( const j of all(game.journal) ) {
    const rec = j.flags?.["wodx-npc"]?.settlement?.record;
    if ( rec && String(rec.name ?? "").toLowerCase().trim() === want && Number(rec.population) > 0 ) return {people: Number(rec.population), region: String(rec.region ?? "")};
  }
  return null;
}
/** Towns for markets that have none yet, seeded from the settlement record where there is one. */
function withNewTowns(st, markets) {
  for ( const m of markets ) if ( !st.towns[m.id] ) {
    const rec = peopleFromRecord(m);
    st.towns[m.id] = TR.newTown(m, {people: rec?.people ?? 0, region: rec?.region && WORLD_REGIONS[rec.region] ? rec.region : ""});
  }
  return st;
}

/* ------------------------------------------------------------------ */
/*  The week                                                           */
/* ------------------------------------------------------------------ */

const ev = e => `${e.name ?? e.town}: ${e.text}`;

/** Run the weeks that are due. force: one week now whatever the clock says. Returns {events, queued} or null. */
/** B3437: when sickness spreads between towns, each town's own sickness this week (contagion.mjs), else undefined. */
function sickFor() {
  const co = game.modules.get(MOD)?.api?.upkeep?.contagion;
  if ( !co?.on?.() ) return undefined;
  const towns = co.state().towns;
  return m => (towns[m.id] ? co.rules.townHit(towns[m.id]) : null);
}

export async function run({force = false, reason = ""} = {}) {
  if ( !isActiveGM() || (mode() === "off" && !force) ) return null;
  const mst = Markets.state();
  if ( !mst.markets.length ) return null;
  const t0 = now();
  // before: as the towns stood, so Undo also takes back towns this turn made
  const before = state();
  let st = withNewTowns(TR.normState(before), mst.markets);
  let due = MT.turnsDue(st.last, t0);
  if ( due.start && !force ) { await save({...st, last: t0}); return null; }
  if ( force ) due = {due: 1, skipped: 0};
  if ( !due.due ) return null;
  const base = Number.isFinite(Number(st.last)) && st.last !== null && !force ? Number(st.last) : t0 - MT.WEEK;
  const sieges = besiegedIds(mst.markets);
  const pcs = pcTowns(mst);
  const events = [], food = new Set();
  for ( let i = 0; i < due.due; i++ ) {
    const at = base + (i + 1) * MT.WEEK, d = dateAt(at);
    const r = TR.weekTowns(st, mst.markets, {year: d.year, month: d.month, ctxFor: m => ctxFor(m, sieges, {town: st.towns?.[m.id] ?? null, year: d.year}),
      regionOf: t => regionOfMarket(MK.marketById(mst, t.id), t), latOf: (t, region) => WORLD_REGIONS[region]?.lat ?? latitude(),
      randFor: id => seeded(`${id}:${at}:${st.turns}`), sickFor: sickFor()});
    st.turns = (st.turns ?? 0) + 1;
    st = r.state;
    for ( const e of r.events ) { events.push(e); if ( e.effect?.food ) food.add(e.town); }
  }
  if ( due.skipped ) st = TR.settleWeeks(st, due.skipped, {year: dateAt(t0).year});
  st.last = force ? (before.last ?? t0) : due.skipped ? t0 : base + due.due * MT.WEEK;
  const when = reason || (due.due > 1 || due.skipped ? `${due.due + due.skipped} weeks` : "a week");
  return land({before, after: st, events, food, pcs, when});
}

/**
 * Let a turn's result stand. Auto: every town but those where a player character stands and something happened
 * lands now with one Undo card; those wait in the approval queue. Suggest: every town that changed waits there.
 */
async function land({before, after, events, food = new Set(), pcs = new Set(), when = "a week"}) {
  const suggest = mode() === "suggest";
  const changed = Object.keys(after.towns).filter(id => JSON.stringify(after.towns[id]) !== JSON.stringify(before.towns[id] ?? null));
  const hold = new Set(changed.filter(id => suggest || (pcs.has(id) && events.some(e => e.town === id))));
  const next = TR.normState({...after, towns: {...after.towns}});
  for ( const id of hold ) { if ( before.towns[id] ) next.towns[id] = before.towns[id]; else delete next.towns[id]; }
  const landed = changed.filter(id => !hold.has(id));
  const snap = TR.snapshot(before, landed);
  const marketSnap = [];
  for ( const id of [...food].filter(id => !hold.has(id)) ) marketSnap.push(await shortBread(id));
  await save(next);
  const mine = events.filter(e => !hold.has(e.town));
  if ( landed.length ) await card({events: mine, snap, marketSnap: marketSnap.filter(Boolean), when, towns: landed, after: next});
  for ( const e of mine ) await tell(e);
  for ( const id of hold ) {
    const m = MK.marketById(Markets.state(), id);
    const es = events.filter(e => e.town === id);
    const a = after.towns[id], b = before.towns[id];
    await chron()?.propose?.({type: TYPE, key: `town:${id}:${after.last}`, title: `${m?.name ?? id}: the town's ${when}`,
      detail: [...es.map(e => e.text), b ? `People ${b.people} to ${a.people}; ${TR.prosperityWord(b.prosperity).toLowerCase()} to ${TR.prosperityWord(a.prosperity).toLowerCase()}; ${TR.unrestWord(b.unrest).toLowerCase()} to ${TR.unrestWord(a.unrest).toLowerCase()}.` : ""].filter(Boolean).join(" "),
      data: {town: a, events: es, food: food.has(id)}});
  }
  return {events, queued: [...hold]};
}

/** A failed harvest makes bread short in the town's market; returns what to put back on Undo. */
async function shortBread(id) {
  const m = MK.marketById(Markets.state(), id);
  if ( !m ) return null;
  const prev = {supply: m.supply.food ?? "normal", index: MK.indexOf(m, "food")};
  await Markets.setMarket(id, {supply: {food: prev.supply === "none" ? "none" : "short"}, index: {food: Math.min(MK.INDEX.max, Math.round(prev.index * 150) / 100)}});
  return {id, ...prev};
}

/** A big event: rumours from the town's traders, a line in the log, and the hook for other modules. */
async function tell(e) {
  // B3618: with the town's name and region, so WoDX Chronicle can ask whether a rising wins
  let name = "", region = "";
  try { const m = MK.marketById(Markets.state(), e.town); name = m?.name ?? ""; region = regionOfMarket(m, state().towns?.[e.town]); } catch (err) { /* name and region are optional */ }
  Hooks.callAll("wodxTown", {town: e.town, kind: e.kind, text: e.text, big: e.big, name, region});
  if ( !e.big ) return;
  try { await log({kind: "note", text: ev(e)}); } catch (err) { /* log is optional */ }
  if ( setting("rumourNetwork") === false ) return;
  const m = MK.marketById(Markets.state(), e.town);
  const tellers = (m?.traders ?? []).map(t => t.actor).filter(a => game.actors.get(a));
  try { await Rumours.startRumour({text: `${e.text.replace(/\.$/, "")} in ${m?.name ?? "the town"}.`, tellers, big: e.kind === "rising" || e.kind === "sack", truth: "true"}); }
  catch (err) { console.error(`${MOD} | town talk`, err); }
}

async function card({events, snap, marketSnap = [], when, towns, after}) {
  const names = id => MK.marketById(Markets.state(), id)?.name ?? id;
  const list = events.map(e => `<li><b>${esc(e.name ?? names(e.town))}</b>: ${esc(e.text)}</li>`).join("");
  const rows = towns.map(id => { const t = after.towns[id]; return t ? `<li>${esc(names(id))}: ${t.people.toLocaleString("en")} people, ${esc(TR.prosperityWord(t.prosperity).toLowerCase())}, ${esc(TR.unrestWord(t.unrest).toLowerCase())}${t.struck ? `, ${esc(t.struck.name.toLowerCase())}` : ""}</li>` : ""; }).join("");
  return ChatMessage.create({speaker: {alias: "Towns"}, whisper: gmIds(), flags: {[MOD]: {townTurn: {snap, marketSnap, applied: true}}},
    content: `<div class="wodx-card wst-towns wst-town-turn"><h3>The towns after ${esc(when)}</h3>
      ${list ? `<ul>${list}</ul>` : ""}<details><summary>Every town</summary><ul>${rows}</ul></details>
      <p class="wodx-quiet">Undo puts these towns back as they were before this turn${marketSnap.length ? ", and their bread back in the market" : ""}.</p>
      <div class="wodx-buttons"><button type="button" data-action="wst-town-undo">Undo</button></div></div>`});
}

async function undo(msg) {
  const f = msg?.flags?.[MOD]?.townTurn;
  if ( !f?.applied || !game.user.isGM ) return;
  await save({...TR.restore(state(), f.snap), last: state().last});
  for ( const s of f.marketSnap ?? [] ) await Markets.setMarket(s.id, {supply: {food: s.supply}, index: {food: s.index}});
  await msg.update({[`flags.${MOD}.townTurn.applied`]: false});
}

/* ------------------------------------------------------------------ */
/*  News that lands at once                                            */
/* ------------------------------------------------------------------ */

async function landNow(news, why) {
  const mst = Markets.state();
  if ( !mst.markets.length || mode() === "off" ) return null;
  const before = state();
  const d = dateAt(now());
  const r = TR.applyNow(withNewTowns(TR.normState(before), mst.markets), news, d);
  if ( !r.events.length ) return null;
  for ( const e of r.events ) e.name = MK.marketById(mst, e.town)?.name ?? e.town;
  return land({before, after: {...r.state, last: before.last}, events: r.events, pcs: pcTowns(mst), when: why});
}

async function onEventFired(e) {
  if ( !isActiveGM() ) return;
  const preset = News.newsFor(e ?? {});
  const n = preset ? TR.newsEvent(preset, {name: e?.name ?? ""}) : null;
  if ( n ) await landNow([n], e?.name ? `the news (${e.name})` : "the news");
}

async function onBattle({battle, step} = {}) {
  if ( !isActiveGM() || !battle?.over || !step ) return;
  const m = TR.townOfPlace(battle.place || battle.war?.place, Markets.state().markets, sceneName);
  if ( !m ) return;
  const st = state();
  const key = `battle:${battle.id}`;
  if ( st.towns[m.id]?.seen?.includes(key) ) return;
  const n = TR.battleEvent(battle, m.id);
  if ( !n ) return;
  const r = await landNow([n], battle.name || "the battle");
  // A battle reaches a town once, whatever is undone or fought on after
  const s2 = state();
  if ( s2.towns[m.id] ) { s2.towns[m.id].seen = [...s2.towns[m.id].seen, key].slice(-40); await save(s2); }
  return r;
}

/* ------------------------------------------------------------------ */
/*  The Towns window                                                   */
/* ------------------------------------------------------------------ */

const opt = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(v)}</option>`).join("");

export async function editTown(id) {
  if ( !game.user.isGM ) return;
  const mst = Markets.state(), m = MK.marketById(mst, id);
  if ( !m ) return;
  const st = withNewTowns(state(), mst.markets), t = st.towns[id];
  const regions = {"": `By its places (now ${WORLD_REGIONS[regionOfMarket(m, {...t, region: ""})]?.label ?? "Moravia"})`, ...Object.fromEntries(Object.entries(WORLD_REGIONS).map(([k, r]) => [k, r.label]))};
  const scars = t.scars.slice().reverse().map(s => `<li>${s.year}: ${esc(s.text)}</li>`).join("");
  const res = await foundry.applications.api.DialogV2.prompt({rejectClose: false, position: {width: 560}, window: {title: `${m.name}: the town`}, classes: ["wodx-dialog", "wst-towns"],
    content: `<div class="wodx-field"><label>People</label><input type="number" name="people" min="0" max="${TR.MAX_PEOPLE}" value="${t.people}"></div>
      <div class="wodx-field"><label>Prosperity</label><select name="prosperity" data-fixed>${TR.PROSPERITY.map((w, i) => `<option value="${i}"${Math.round(t.prosperity) === i ? " selected" : ""}>${esc(w)}</option>`).join("")}</select></div>
      <div class="wodx-field"><label>Unrest</label><select name="unrest" data-fixed>${TR.UNREST.map((w, i) => `<option value="${i}"${Math.round(t.unrest) === i ? " selected" : ""}>${esc(w)}</option>`).join("")}</select></div>
      <div class="wodx-field"><label>Built of</label><select name="build" data-fixed>${opt(TR.BUILDS, t.build)}</select></div>
      <div class="wodx-field"><label>Part of the world</label><span>${searchBox("select[name=region]", "Search regions…", "Search regions")}<select name="region">${opt(regions, t.region)}</select></span></div>
      ${Object.entries(TR.TAGS).map(([k, v]) => `<label><input type="checkbox" name="tag.${k}"${t.tags[k] ? " checked" : ""}> ${esc(v)}</label>`).join("<br>")}
      ${t.struck ? `<p>${esc(t.struck.name)}: ${t.struck.weeks} more weeks.</p>` : ""}
      ${scars ? `<h4>What the town has been through</h4><ul class="wst-scroll">${scars}</ul>` : ""}`,
    ok: {label: "Save", callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object}});
  if ( !res ) return;
  const cur = state();
  const was = cur.towns[id] ?? t;
  // A level picked by hand keeps the fraction unless the level itself changed
  const lvl = (v, old) => (Math.round(Number(old)) === Number(v) ? old : Number(v));
  cur.towns[id] = TR.normTown({...was, people: Number(res.people), prosperity: lvl(res.prosperity, was.prosperity), unrest: lvl(res.unrest, was.unrest),
    build: res.build, region: res.region, tags: Object.fromEntries(Object.keys(TR.TAGS).map(k => [k, !!res[`tag.${k}`]])), hand: true});
  await save(cur);
}

export async function townsDialog() {
  if ( !game.user.isGM ) return;
  const mst = Markets.state();
  const st = withNewTowns(state(), mst.markets);
  const year = dateAt(now()).year;
  const rows = mst.markets.map(m => { const t = st.towns[m.id]; return `<tr><td>${esc(m.name)}</td><td>${t.people.toLocaleString("en")} (${esc(TR.sizeWord(t.people, year))})</td>
    <td>${esc(TR.prosperityWord(t.prosperity))}</td><td>${esc(TR.unrestWord(t.unrest))}</td><td>${esc([t.struck?.name, ...t.marks.map(x => x.why)].filter(Boolean).join(", "))}</td>
    <td><button type="button" data-town="${esc(m.id)}">Edit</button></td></tr>`; }).join("");
  let picked = null;
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 720}, window: {title: "Towns"}, classes: ["wodx-dialog", "wst-towns"],
    content: `<p>Every market is a town. Each week its people, prosperity and unrest follow its market, sieges, plague and disasters. Only the Storyteller sees this.</p>
      ${mst.markets.length > 5 ? searchBox("table.wst-towns-t", "Search towns…", "Search towns") : ""}<div class="wst-scroll"><table class="wst-towns-t"><thead><tr><th>Town</th><th>People</th><th>Prosperity</th><th>Unrest</th><th>Now</th><th></th></tr></thead><tbody>${rows || "<tr><td colspan='6'>No markets yet: set one up in Markets first.</td></tr>"}</tbody></table></div>`,
    render: (event, dialog) => {
      const el = dialog.element ?? dialog;
      el.querySelectorAll?.("button[data-town]").forEach(b => b.addEventListener("click", () => { picked = b.dataset.town; dialog.close(); }));
    },
    buttons: [...(mst.markets.length ? [{action: "week", label: "Run a week now"}] : []), {action: "close", label: "Close"}]});
  if ( picked ) return editTown(picked);
  if ( res === "week" ) return run({force: true, reason: "a week (run by hand)"});
}

/* ------------------------------------------------------------------ */
/*  Setup and what others read                                         */
/* ------------------------------------------------------------------ */

/** A town's condition in words by market id, or for the market a scene belongs to. */
export const of = id => TR.view(state().towns[id] ?? null);
export function ofScene(scene) {
  const m = MK.marketOfScene(Markets.state(), typeof scene === "string" ? scene : scene?.id);
  return m ? of(m.id) : null;
}

export function registerApproval() {
  chron()?.registerApprovalHandler?.(TYPE, {label: "Towns", approve: async entry => {
    const t = entry.data?.town;
    if ( !t?.id ) return;
    const st = state();
    st.towns[t.id] = TR.normTown(t);
    await save(st);
    if ( entry.data?.food ) await shortBread(t.id);
    for ( const e of entry.data?.events ?? [] ) await tell(e);
  }});
}

export async function setupTowns() {
  registerApproval();
  let lastHour = -1;
  Hooks.on("updateWorldTime", () => {
    const hour = Math.floor(now() / 3600);
    if ( hour === lastHour || skipping() || !isActiveGM() ) return;
    lastHour = hour;
    run().catch(e => console.error(`${MOD} | towns`, e));
  });
  Hooks.on("wodxSkipEnd", () => { if ( isActiveGM() ) run().catch(e => console.error(`${MOD} | towns`, e)); });
  Hooks.on("wodxEventFired", e => { onEventFired(e).catch(err => console.error(`${MOD} | towns`, err)); });
  Hooks.on("wodxBattle", p => { onBattle(p).catch(err => console.error(`${MOD} | towns`, err)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const f = message.flags?.[MOD]?.townTurn;
    const b = f && html?.querySelector?.("[data-action=wst-town-undo]");
    if ( !b ) return;
    if ( !game.user.isGM ) { b.remove(); return; }
    b.disabled = !f.applied;
    b.addEventListener("click", () => { b.disabled = true; undo(message).catch(e => console.error(`${MOD} |`, e)); });
  });
}

/** B3420: the town at each settlement age, for the chronicle rebuild's ages step (recipe ages). */
export const atAges = (id, ages = []) => TR.townAtAges(state().towns[id] ?? null, ages);
export const api = () => ({open: townsDialog, edit: editTown, state, of, ofScene, run, undo, atAges, rules: TR});
