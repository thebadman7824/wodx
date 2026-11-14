/**
 * WoDX Storyteller (B3430-B3436): sickness in the towns (rules in contagion-rules.mjs).
 *
 * A town is a market. Once a week, right after the market turn (market-turn.mjs), every sick town moves a week along
 * its outbreak; its prices, supply and passers-by follow how hard it presses; and it may pass the sickness along its
 * trade links and with the caravans that left it. Living player characters in a sick town may catch it and then roll
 * Stamina each week (M20 p. 442). Sick characters and vampires carrying a sickness in the blood (WoDX Actions' carrier
 * flag, V20 p. 303) can carry it into a clean town. History offers the outbreaks of its time and land, region by
 * region, and the Future Darkness plagues come with their dated events. A new town falling sick waits in the approval
 * queue where a player character is (all of them on Suggest); the week's changes come with one Undo card.
 * Hidden world state wodx-storyteller.contagionState (contagion-rules normState).
 */
import * as R from "./contagion-rules.mjs";
import * as MK from "./market-rules.mjs";
import * as MT from "./market-turn-rules.mjs";
import * as Markets from "./markets.mjs";
import * as Rumours from "./rumours.mjs";
import {living} from "./hardship.mjs";
import {MOD, esc, chron, isActiveGM, isPC, gmIds, setting, log, tripContext} from "./core.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const TYPE = `${MOD}.contagion`;
const NPC = "wodx-npc", ACT = "wodx-actions";
const all = c => (c ? [...(c.contents ?? c)] : []);
const now = () => game.time?.worldTime ?? 0;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const combat = () => game.wodxCombat ?? game.modules.get("wodx-combat")?.api ?? null;
const mode = () => setting("contagion") ?? "auto";
export const on = () => mode() !== "off";
export const state = () => R.normState(setting("contagionState"));
async function save(st) { if ( game.user.isGM ) await game.settings.set(MOD, "contagionState", R.normState(st)); }
const ownerIds = a => all(game.users).filter(u => !u.isGM && a.testUserPermission?.(u, "OWNER")).map(u => u.id);
const marketName = (st, id) => MK.marketById(st, id)?.name ?? id;

export function registerContagionSettings() {
  game.settings.register(MOD, "contagion", {name: "Sickness spreads between towns", scope: "world", config: true, type: String, default: "auto",
    hint: "Once a week a sick town moves on through its outbreak, its prices and crowds follow, and it may pass the sickness to the towns it trades with. History offers the outbreaks of the year and land. Auto: a town falls sick at once unless a player character is there, which waits in the approval queue. Suggest: every new sick town waits in the queue. Off: nothing spreads. Needs markets set up.",
    choices: {auto: "Auto", suggest: "Suggest", off: "Off"}});
  game.settings.register(MOD, "contagionPeople", {name: "Characters can fall sick", scope: "world", config: true, type: Boolean, default: true,
    hint: "A living player character in a sick town may catch the sickness and rolls Stamina each week (M20 p. 442). The card has Undo."});
  game.settings.register(MOD, "contagionState", {scope: "world", config: false, type: Object, default: R.blankState()});
}

/* ---------------- Where ---------------- */

const homeland = () => { try { const h = chron()?.world?.homeland?.(); return typeof h === "string" ? h : "moravia"; } catch (e) { return "moravia"; } };
export function regionOfMarket(m) {
  try {
    const sc = (m?.scenes ?? []).map(s => game.scenes.get(s)).find(Boolean) ?? null;
    return (sc ? chron()?.world?.here?.(sc)?.id : null) ?? homeland();
  } catch (e) { return homeland(); }
}
const latOf = region => { try { return num(chron()?.world?.regions?.[region]?.lat ?? 50); } catch (e) { return 50; } };
const monthAt = t => { try { return describeTime(t, 50).month; } catch (e) { return 6; } };
const sceneOfActor = a => all(game.scenes).find(s => all(s.tokens).some(k => k.actorId === a.id && !k.hidden)) ?? null;

/** The outbreak in the town a scene belongs to, as the Hunt and the passers-by read it, or null. */
export function here(scene = globalThis.canvas?.scene) {
  if ( !scene || !on() ) return null;
  const m = MK.marketOfScene(Markets.state(), scene.id);
  const o = m ? state().towns[m.id] : null;
  return o && o.week > 0 ? {...R.huntHit(o), market: m.id} : null;
}

/* ---------------- Starting and ending ---------------- */

/** Put a new outbreak into the state (st is changed). Returns {o, m} or null. */
function begin(st, mst, {market, disease, source = "", scale = 1} = {}) {
  const m = MK.marketById(mst, market);
  if ( !m || !R.DISEASES[disease] || st.towns[m.id] ) return null;
  const o = R.newOutbreak({market: m.id, disease, at: now(), year: tripContext(now()).year, region: regionOfMarket(m), source, scale});
  st.towns[m.id] = o;
  return {o, m};
}

/** Tell of a town falling sick: the log, a card unless quiet, the rumour network and a hook. */
async function announce(m, disease, source = "", {quiet = false} = {}) {
  const d = R.DISEASES[disease];
  await log({kind: "contagion", attention: "Sickness in a town", place: m.scenes[0] ?? null, text: `${d.label} reaches ${m.name}.${source ? ` ${source}` : ""}`});
  if ( !quiet ) await ChatMessage.create({speaker: {alias: "Sickness"}, whisper: gmIds(), content: `<div class="wodx-card wst-contagion"><h3>${esc(d.label)} in ${esc(m.name)}</h3><p>${esc(d.note)}${source ? ` ${esc(source)}` : ""}</p><p class="wodx-quiet">${esc(d.ref)}. It moves on with each week of the markets.</p></div>`});
  await talk(m, `${d.label} has come to ${m.name}.`);
  Hooks.callAll("wodxContagion", {phase: "start", market: m.id, disease});
}

/** A town falls sick. Returns the outbreak or null. */
export async function start({market, disease, source = "", scale = 1, quiet = false} = {}) {
  if ( !game.user.isGM ) return null;
  const st = state(), mst = Markets.state();
  if ( st.towns[market] ) return st.towns[market];
  const b = begin(st, mst, {market, disease, source, scale});
  if ( !b ) return null;
  await save(st);
  await announce(b.m, disease, source, {quiet});
  return b.o;
}

/** The town is rid of it now (the Storyteller ends it): prices, supply, crowds and quarantine go back. */
export async function end(market, {immune = true} = {}) {
  if ( !game.user.isGM ) return;
  const st = state(), o = st.towns[market];
  if ( !o ) return;
  await lift(o, {quarantine: true});
  delete st.towns[market];
  if ( immune ) st.immune[market] = {...(st.immune[market] ?? {}), [o.disease]: now() + R.IMMUNE_WEEKS * R.WEEK};
  await save(st);
  Hooks.callAll("wodxContagion", {phase: "end", market, disease: o.disease});
}

/** Shut the town (the market is cut off: no trade in the market turn, a sixth of the spread) or open it again. */
export async function quarantine(market, shut = true) {
  if ( !game.user.isGM ) return;
  const st = state(), o = st.towns[market];
  const m = MK.marketById(Markets.state(), market);
  if ( !m ) return;
  if ( o ) { o.quarantined = !!shut; if ( shut && o.cut0 === null ) o.cut0 = m.cut; await save(st); }
  await Markets.setMarket(market, {cut: shut ? true : !!o?.cut0});
  await log({kind: "contagion", place: m.scenes[0] ?? null, text: shut ? `${m.name} is shut in quarantine.` : `${m.name} opens its gates again.`});
}

/* ---------------- What the town feels ---------------- */

const crowdScenes = m => (m?.scenes ?? []).map(s => game.scenes.get(s)).filter(s => s?.flags?.[NPC]?.crowd?.on);

/** Put the town's prices, supply and crowds where this week's sickness puts them, against what stood before it came. */
async function feel(o) {
  const m = MK.marketById(Markets.state(), o.market);
  if ( !m ) return o;
  const hit = R.marketHit(o);
  if ( !hit ) return lift(o);
  const out = {...o};
  if ( !out.market0 ) out.market0 = {index: {...m.index}, supply: {...m.supply}};
  const index = {}, supply = {};
  for ( const [k, x] of Object.entries(hit.index) ) index[k] = Math.round((out.market0.index[k] ?? 1) * x * 100) / 100;
  const order = ["none", "short", "normal", "plenty"];
  for ( const k of new Set([...Object.keys(hit.supply), ...Object.keys(out.market0.supply), "food", "medicine"]) ) {
    const was = out.market0.supply[k] ?? "normal", want = hit.supply[k];
    supply[k] = want && order.indexOf(want) < order.indexOf(was) ? want : was;
  }
  await Markets.setMarket(m.id, {index, supply});
  if ( !out.crowd0 ) {
    out.crowd0 = crowdScenes(m).map(s => ({scene: s.id, prev: s.flags[NPC].crowd.density ?? "normal"}));
    for ( const c of out.crowd0 ) await game.scenes.get(c.scene)?.update({[`flags.${NPC}.crowd.density`]: hit.crowd});
  }
  return out;
}

/** Take the town's sickness off its market and crowds. */
async function lift(o, {quarantine: q = false} = {}) {
  const out = {...o};
  if ( out.market0 ) {
    const m = MK.marketById(Markets.state(), o.market);
    if ( m ) {
      const index = {}, supply = {};
      for ( const k of Object.keys(R.marketHit({...o, week: Math.max(1, Math.round(o.weeks / 3))})?.index ?? {food: 1, medicine: 1, faith: 1}) ) index[k] = out.market0.index[k] ?? 1;
      for ( const k of ["food", "medicine"] ) supply[k] = out.market0.supply[k] ?? "normal";
      await Markets.setMarket(o.market, {index, supply});
    }
    out.market0 = null;
  }
  if ( out.crowd0 ) { for ( const c of out.crowd0 ) await game.scenes.get(c.scene)?.update({[`flags.${NPC}.crowd.density`]: c.prev ?? "normal"}); out.crowd0 = null; }
  if ( q && o.quarantined ) await Markets.setMarket(o.market, {cut: !!o.cut0});
  return out;
}

/** News in the rumour network, from the town's traders. */
async function talk(m, text) {
  if ( setting("rumourNetwork") === false ) return;
  const tellers = (m?.traders ?? []).map(t => t.actor).filter(a => game.actors.get(a));
  try { await Rumours.startRumour({text, tellers, truth: "true"}); } catch (e) { console.error(`${MOD} | contagion talk`, e); }
}

/* ---------------- People ---------------- */

const stamina = a => { const s = a?.system?.attributes?.stamina; return Math.max(1, num(s?.total ?? s?.value) || 1); };
async function rollStamina(a, diff) {
  const r = new Roll(`${stamina(a)}d10`);
  await r.evaluate();
  let s = 0, ones = 0;
  for ( const f of r.dice.flatMap(d => d.results.map(x => x.result)) ) { if ( f === 1 ) ones++; if ( f >= diff ) s++; }
  return {successes: Math.max(0, s - ones)};
}

/** The week for living player characters: catching it in a sick town, then the weekly roll while sick. */
async function people(st, mst, rng) {
  const lines = [], hurt = [], carriers = [];
  if ( setting("contagionPeople") === false ) return {lines, hurt, carriers};
  for ( const a of all(game.actors).filter(x => living(x)) ) {
    const sc = sceneOfActor(a), m = sc ? MK.marketOfScene(mst, sc.id) : null;
    const o = m ? st.towns[m.id] : null;
    let x = st.people[a.id] ?? null;
    if ( !x && o && rng() < R.exposeChance(o) ) {
      const d = R.DISEASES[o.disease];
      const r = await rollStamina(a, d.diff);
      if ( r.successes > 0 ) lines.push(`${a.name} is near the sick in ${m.name} and throws it off (Stamina ${d.diff}).`);
      else { x = {disease: o.disease, since: now(), weeks: 0, held: 0, where: m.name}; st.people[a.id] = x; lines.push(`${a.name} catches ${d.label.toLowerCase()} in ${m.name} (failed Stamina ${d.diff}).`); }
      continue;
    }
    if ( !x ) continue;
    const d = R.DISEASES[x.disease];
    const rolled = R.strikesThisWeek(x) ? await rollStamina(a, d.diff) : null;
    const w = R.illnessWeek(x, rolled);
    if ( !w ) { delete st.people[a.id]; continue; }
    if ( w.illness ) st.people[a.id] = w.illness; else delete st.people[a.id];
    if ( w.damage ) { await combat()?.applyDamage?.(a, w.dmg, w.damage); hurt.push({actor: a.id, dmg: w.dmg, n: w.damage}); }
    lines.push(`${a.name}, sick with ${d.label.toLowerCase()}: ${!w.strikes ? "a quiet week" : w.damage ? `${w.damage} ${w.dmg}` : "holds it off this week"}${w.over ? "; it has run its course" : ""}.`);
    // A sick character in a clean town can carry it there
    if ( w.illness && m && !st.towns[m.id] && !R.isImmune(st, m.id, x.disease, now()) ) carriers.push({market: m.id, disease: x.disease, who: a.name});
  }
  // Vampires who carry a sickness in the blood (WoDX Actions' carrier flag names it as disease once known)
  for ( const a of all(game.actors) ) {
    const c = a.flags?.[ACT]?.carrier;
    if ( !c?.disease || !R.DISEASES[c.disease] ) continue;
    const sc = sceneOfActor(a), m = sc ? MK.marketOfScene(mst, sc.id) : null;
    if ( m && !st.towns[m.id] && !R.isImmune(st, m.id, c.disease, now()) ) carriers.push({market: m.id, disease: c.disease, who: a.name, blood: true});
  }
  return {lines, hurt, carriers};
}

/* ---------------- The week ---------------- */

const pcMarkets = mst => {
  const ids = new Set();
  for ( const s of all(game.scenes) ) { if ( !all(s.tokens).some(t => isPC(t.actor)) ) continue; const m = MK.marketOfScene(mst, s.id); if ( m ) ids.add(m.id); }
  return ids;
};

/**
 * The weeks of sickness, called by the market turn after it has run. weeks: how many passed; left: caravans that
 * set out this week ([{from, to}]). Returns {rows, spread, queued} or null.
 */
export async function weekRun({weeks = 1, left = [], rand = Math.random} = {}) {
  if ( !isActiveGM() || !on() ) return null;
  const mst = Markets.state();
  if ( !mst.markets.length ) return null;
  const before = state(), snapMarkets = MT.snapshot(mst, mst.markets.map(m => m.id));
  const crowd0 = all(game.scenes).filter(s => s.flags?.[NPC]?.crowd?.on).map(s => ({scene: s.id, density: s.flags[NPC].crowd.density ?? "normal"}));
  const ctx = tripContext(now()), year = ctx.year;
  const regions = new Map(mst.markets.map(m => [m.id, regionOfMarket(m)]));
  const seasonAt = id => R.seasonOf(monthAt(now()), latOf(regions.get(id)));
  let st = before;
  const lines = [], spread = [], queued = [], begun = [];
  let hurt = [];
  const n = Math.max(1, Math.min(12, Math.floor(num(weeks))));
  for ( let i = 0; i < n; i++ ) {
    const r = R.weekTowns(st, {now: now()});
    st = r.state;
    for ( const row of r.rows ) {
      const name = marketName(mst, row.market);
      if ( row.phase === "over" ) {
        await lift({...before.towns[row.market], ...row.outbreak}, {quarantine: true});
        lines.push(`${name}: the ${R.DISEASES[row.outbreak.disease].label.toLowerCase()} is over. ${Math.round(row.outbreak.dead * 100)}% of the people died of it.`);
        Hooks.callAll("wodxContagion", {phase: "over", market: row.market, disease: row.outbreak.disease});
      } else {
        st.towns[row.market] = await feel(row.outbreak);
        if ( row.phase !== row.from && i === n - 1 ) lines.push(R.describe(row.outbreak, name));
      }
    }
    const tries = R.spreadWeek(st, mst.markets, {routes: i === 0 ? left : [], seasonAt, year, now: now(), rng: rand});
    const pcs = pcMarkets(mst);
    for ( const t of tries ) {
      const src = `Carried from ${marketName(mst, t.from)}.`;
      if ( mode() === "suggest" || pcs.has(t.to) ) queued.push({market: t.to, disease: t.disease, source: src, key: `spread:${t.to}:${t.disease}`});
      else {
        const b = begin(st, mst, {market: t.to, disease: t.disease, source: src});
        if ( !b ) continue;
        st.towns[t.to] = await feel(R.advance(b.o).outbreak);
        spread.push(t); begun.push({m: b.m, disease: t.disease, source: src});
      }
    }
  }
  // People, once for the run
  const p = await people(st, mst, rand);
  lines.push(...p.lines);
  hurt = p.hurt;
  for ( const c of p.carriers ) {
    const d = R.DISEASES[c.disease];
    if ( c.blood && !d.blood ) continue;
    if ( rand() < d.spread * 0.5 ) queued.push({market: c.market, disease: c.disease, source: `${c.who} brought it${c.blood ? " in the blood, from vessel to vessel" : ""}.`, key: `carried:${c.market}:${c.disease}`});
  }
  // History and the season's outbreaks
  for ( const s of R.seedsDue(st, mst.markets, {regionOf: id => regions.get(id), year, now: now()}) ) {
    st.seeded.push(s.key);
    queued.push({market: s.market, disease: s.disease, source: `${s.name}: ${s.note}`, scale: s.scale, key: `seed:${s.key}`});
  }
  await save(st);
  for ( const b of begun ) await announce(b.m, b.disease, b.source, {quiet: true});
  for ( const q of queued ) {
    const d = R.DISEASES[q.disease];
    await chron()?.propose?.({type: TYPE, key: q.key, title: `${d.label} reaches ${marketName(mst, q.market)}`,
      detail: `${q.source} ${d.note} Approving starts the outbreak there; it then runs week by week with the markets.`, data: {market: q.market, disease: q.disease, source: q.source, scale: q.scale ?? 1}});
  }
  for ( const t of spread ) lines.push(`${R.DISEASES[t.disease].label} spreads from ${marketName(mst, t.from)} to ${marketName(mst, t.to)}.`);
  if ( lines.length ) {
    await ChatMessage.create({speaker: {alias: "Sickness"}, whisper: gmIds(), flags: {[MOD]: {contagion: {before, snapMarkets, crowd0, hurt, applied: true}}},
      content: `<div class="wodx-card wst-contagion"><h3>Sickness in the towns</h3><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
        ${queued.length ? `<p>${queued.length} more ${queued.length === 1 ? "town waits" : "towns wait"} in the approval queue.</p>` : ""}
        <p class="wodx-quiet">M20 p. 442; V20 p. 303. Undo puts the towns, their markets and crowds and any harm to characters back as they were.</p>
        <div class="wodx-buttons"><button type="button" data-action="wst-contagion-undo">Undo</button></div></div>`});
    for ( const h of hurt ) {
      const a = game.actors.get(h.actor);
      if ( a ) await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor: a}), whisper: [...gmIds(), ...ownerIds(a)], content: `<div class="wodx-card wst-contagion"><p><b>${esc(a.name)}</b> is sick: ${h.n} ${esc(h.dmg)} this week.</p></div>`});
    }
  }
  return {lines, spread, queued};
}

async function undo(msg) {
  const f = msg?.flags?.[MOD]?.contagion;
  if ( !f?.applied || !game.user.isGM ) return;
  await save(f.before);
  await Markets.saveState(MT.restore(Markets.state(), f.snapMarkets));
  for ( const c of f.crowd0 ?? [] ) await game.scenes.get(c.scene)?.update({[`flags.${NPC}.crowd.density`]: c.density});
  for ( const h of f.hurt ?? [] ) { const a = game.actors.get(h.actor); if ( a ) await combat()?.healDamage?.(a, h.dmg, h.n); }
  await msg.update({[`flags.${MOD}.contagion.applied`]: false});
}

/* ---------------- Dated events: the Future Darkness plagues ---------------- */

async function onEventFired(ev) {
  const disease = R.EVENT_SICKNESS[ev?.id];
  if ( !disease || !isActiveGM() || !on() ) return;
  const mst = Markets.state(), home = homeland();
  const m = mst.markets.find(x => regionOfMarket(x) === home) ?? mst.markets[0];
  if ( !m ) return;
  const d = R.DISEASES[disease];
  await chron()?.propose?.({type: TYPE, key: `event:${ev.id}:${m.id}`, title: `${d.label} reaches ${m.name}`,
    detail: `${ev.name ?? "News"}: ${ev.summary ?? ""} ${d.note}`, data: {market: m.id, disease, source: ev.name ?? "", scale: 1}});
}

/* ---------------- The Storyteller's window ---------------- */

export async function contagionDialog() {
  if ( !game.user.isGM ) return;
  const mst = Markets.state(), st = state(), ctx = tripContext(now());
  const opt = (v, l, sel = false) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(l)}</option>`;
  const rows = mst.markets.map(m => {
    const o = st.towns[m.id];
    return `<tr><td>${esc(m.name)}</td><td>${o ? esc(R.describe(o, m.name).replace(/^[^:]*: /, "")) : Object.keys(st.immune[m.id] ?? {}).length ? "Clean; recently through a sickness" : "Clean"}</td>
      <td>${o ? `<button type="button" data-q="${esc(m.id)}">${o.quarantined ? "Open the gates" : "Quarantine"}</button> <button type="button" data-end="${esc(m.id)}">End it</button>` : ""}</td></tr>`;
  }).join("");
  const sick = Object.entries(st.people).map(([id, x]) => `<li>${esc(game.actors.get(id)?.name ?? id)}: ${esc(R.DISEASES[x.disease].label)} (week ${x.weeks}, caught in ${esc(x.where)}) <button type="button" data-cure="${esc(id)}">Cured</button></li>`).join("");
  const firstRegion = mst.markets[0] ? regionOfMarket(mst.markets[0]) : homeland();
  const list = R.diseasesFor(ctx.year, firstRegion, {future: ctx.future});
  let picked = null;
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 760}, window: {title: "Sickness in the towns", resizable: true}, classes: ["wodx-dialog", "wst-contagion"],
    content: `<p>Each market is a town. A sick town moves on week by week with the markets and may pass its sickness to the towns it trades with. Only the Storyteller sees this.</p>
      ${mst.markets.length > 5 ? searchBox("table.wst-contagion-t", "Search towns…", "Search towns") : ""}<div class="wst-scroll"><table class="wst-contagion-t"><thead><tr><th>Town</th><th>Sickness</th><th></th></tr></thead><tbody>${rows || "<tr><td colspan='3'>No markets yet: set up a market first.</td></tr>"}</tbody></table></div>
      ${sick ? `<h4>Sick characters</h4><ul>${sick}</ul>` : ""}
      ${mst.markets.length ? `<fieldset><legend>Start an outbreak</legend><label>Town <select name="market" data-fixed>${mst.markets.map(m => opt(m.id, m.name)).join("")}</select></label>
        <label>Sickness <select name="disease" data-fixed>${list.map(id => opt(id, R.DISEASES[id].label)).join("")}</select></label>
        <p class="wodx-quiet">The list fits the year and the land of the first town. ${esc(list.map(id => `${R.DISEASES[id].label}: ${R.DISEASES[id].ref}`).join("; "))}.</p></fieldset>` : ""}`,
    render: (ev, dialog) => {
      const el = dialog.element ?? dialog;
      el.querySelectorAll?.("button[data-q]").forEach(b => b.addEventListener("click", () => { picked = {q: b.dataset.q}; dialog.close(); }));
      el.querySelectorAll?.("button[data-end]").forEach(b => b.addEventListener("click", () => { picked = {end: b.dataset.end}; dialog.close(); }));
      el.querySelectorAll?.("button[data-cure]").forEach(b => b.addEventListener("click", () => { picked = {cure: b.dataset.cure}; dialog.close(); }));
    },
    buttons: [...(mst.markets.length && list.length ? [{action: "start", label: "Start it", callback: (ev, btn) => ({market: btn.form.elements.market?.value, disease: btn.form.elements.disease?.value})}] : []), {action: "close", label: "Close"}]});
  if ( picked?.q ) { await quarantine(picked.q, !st.towns[picked.q]?.quarantined); return contagionDialog(); }
  if ( picked?.end ) { await end(picked.end); return contagionDialog(); }
  if ( picked?.cure ) { const s = state(); delete s.people[picked.cure]; await save(s); return contagionDialog(); }
  if ( res?.market && res?.disease ) { await start({market: res.market, disease: res.disease, source: ""}); return contagionDialog(); }
}

/* ---------------- Setup ---------------- */

export function registerApproval() {
  chron()?.registerApprovalHandler?.(TYPE, {label: "Sickness", approve: async entry => { const d = entry.data ?? {}; await start({market: d.market, disease: d.disease, source: d.source ?? "", scale: d.scale ?? 1}); }});
}

export async function setupContagion() {
  registerApproval();
  Hooks.on("wodxEventFired", ev => { onEventFired(ev).catch(e => console.error(`${MOD} | contagion`, e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const f = message.flags?.[MOD]?.contagion;
    const b = f && html?.querySelector?.("[data-action=wst-contagion-undo]");
    if ( !b ) return;
    if ( !game.user.isGM ) { b.remove(); return; }
    b.disabled = !f.applied;
    b.addEventListener("click", () => { b.disabled = true; undo(message).catch(e => console.error(`${MOD} |`, e)); });
  });
}

export const rules = R;
export const api = () => ({open: contagionDialog, state, on, here, start, end, quarantine, week: weekRun, undo, regionOf: regionOfMarket, rules: R});
