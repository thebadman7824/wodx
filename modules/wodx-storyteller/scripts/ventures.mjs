/**
 * WoDX Storyteller 0.60.0: putting money into a venture (rules in venture-rules.mjs, B2740-B2743).
 *
 * A character puts money from the purse into a caravan, a workshop or a trading house on a market the Storyteller
 * has set up. Each weekly market turn (market-turn.mjs) the venture pays its share into the purse (the bank where the
 * era has banks), or loses part of its value. Lost caravans (wodxCaravan), raids (wodxMarketMove) and traders going
 * broke (wodxTraderBroke) hit the ventures they touch at once. A large stake shows in the Markets window, draws a
 * rival faction's notice and may earn a seat, which waits in the approval queue for the Storyteller.
 * Players open the window from Property and building; their requests go to the active Storyteller's client by
 * socket. Hidden world state wodx-storyteller.ventureState = {v, list}. World setting ventures (on or off).
 */
import * as VR from "./venture-rules.mjs";
import * as MK from "./market-rules.mjs";
import * as MV from "./market-moves-rules.mjs";
import * as Markets from "./markets.mjs";
import * as Money from "./money.mjs";
import {MOD, SOCKET, esc, chron, isActiveGM, gmIds, setting, tripContext, moneyWords} from "./core.mjs";
import {sphereFor} from "../../wodx-chronicle/scripts/world-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const TYPE = `${MOD}.venture`;
let KINDS = {};
const label = k => String(KINDS[k] ?? k);
const now = () => game.time?.worldTime ?? 0;
const era = () => tripContext(now());
const region = () => { try { return setting("moneyRegion") || "moravian"; } catch (e) { return "moravian"; } };
const all = c => (c ? [...(c.contents ?? c)] : []);
export const on = () => setting("ventures") !== false;
export const state = () => VR.normState(setting("ventureState"));
async function save(st) { if ( game.user.isGM ) await game.settings.set(MOD, "ventureState", VR.normState(st)); }
const words = amount => moneyWords(amount, era().year);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function registerVentureSettings() {
  game.settings.register(MOD, "ventures", {name: "Characters can put money into ventures", scope: "world", config: true, type: Boolean, default: true,
    hint: "A character can put money into a caravan, a workshop or a trading house on a market you have set up (Property and building, Ventures). Each weekly market turn it pays a share into the purse or loses part of its value. Off: no new ventures, and those standing earn and lose nothing."});
  game.settings.register(MOD, "ventureState", {scope: "world", config: false, type: Object, default: VR.blankState()});
}

/** Influence from the sheet: a background Feature named Influence. */
export function influenceOf(a) {
  for ( const i of a?.items ?? [] ) {
    if ( i.type === "Feature" && /background/.test(String(i.system?.type ?? "")) && /^influence\b/i.test(i.name ?? "") ) return num(i.system?.value);
  }
  return num(a?.system?.backgrounds?.influence?.value);
}

/** The way of life of a market's part of the world: its first scene's region, else the homeland. */
function sphereOf(market) {
  const year = era().year;
  let id = null;
  try {
    const w = chron()?.world;
    const sc = market?.scenes?.map(s => game.scenes.get(s)).find(Boolean) ?? null;
    id = (sc && w?.here ? w.here(sc)?.id : null) ?? (typeof w?.homeland?.() === "string" ? w.homeland() : null);
  } catch (e) { id = null; }
  try { return sphereFor(id ?? "moravia", year); } catch (e) { return "latin"; }
}
export function formHere(market) { const e = era(); return VR.formFor(e.year, sphereOf(market), {future: e.future}); }

/** How the market treats a venture this week. */
function tradeHere(v, st) {
  const m = MK.marketById(st, v.market);
  if ( !m ) return {factor: 0, why: ["the market is gone"]};
  const roads = m.links ?? [];
  const closed = !!m.cut || (v.kind === "caravan" && roads.length > 0 && roads.every(l => (m.unsafe?.[l] ?? 0) > 0));
  const t = v.trader ? m.traders.find(x => x.actor === v.trader) : null;
  return VR.tradeOf(v, {supply: v.goods ? MK.supplyOf(m, v.goods) : "normal", index: v.goods ? MK.indexOf(m, v.goods) : 1,
    tax: v.goods ? MV.taxOn(m, v.goods) : 0, monopoly: !!(v.goods && MV.monopolyOn(m, v.goods)), closed, shut: !!t?.shut});
}

async function payInto(actor, amount, why) {
  if ( !actor || amount <= 0 ) return;
  await Money.receive(actor, amount, {to: Money.moneyNow().banks ? "bank" : "carried", note: why});
}
const ownersOf = a => all(game.users).filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);

/* ------------------------------------------------------------------ */
/*  The week, with the market turn                                     */
/* ------------------------------------------------------------------ */

/**
 * Run the weeks for every open venture: pay or lose, then a large stake's notice. Called by the market turn after
 * the markets have moved. Returns {lines, paid, queued} or null when off.
 */
export async function weekRun({weeks = 1, stamp = now(), rand = Math.random} = {}) {
  if ( !isActiveGM() || !on() ) return null;
  const st0 = state();
  if ( !VR.openOf(st0).length ) return null;
  const mst = Markets.state(), e = era();
  const n = Math.max(1, Math.min(VR.WEEK_CAP, Math.round(num(weeks)) || 1));
  const caravansOn = setting("caravans") !== false;
  let views = [];
  try { views = game.modules.get(MOD)?.api?.upkeep?.marketMoves?.views?.(mst) ?? []; } catch (e2) { views = []; }
  const st = {...st0, list: st0.list.map(v => ({...v}))};
  const lines = [], paid = new Map(), queued = [];
  for ( let i = 0; i < st.list.length; i++ ) {
    let v = st.list[i];
    if ( v.state !== "open" ) continue;
    const a = game.actors.get(v.actor);
    const inf = influenceOf(a);
    let got = 0, lost = 0, last = "";
    for ( let w = 0; w < n && v.state === "open"; w++ ) {
      const r = VR.week(v, {trade: tradeHere(v, mst), year: e.year, future: e.future, influence: inf, rand, caravansOn, now: stamp});
      v = r.venture; got += r.payout; lost += r.lost; if ( r.lost || !last ) last = r.line;
    }
    const mk = MK.marketById(mst, v.market);
    const nt = VR.notice(v, {views, year: e.year, region: region(), influence: inf});
    if ( nt.rival ) { v.rival = nt.rival; v.log = [...v.log, {t: stamp, text: `${nt.rival} has taken note of this stake.`}].slice(-VR.LOG_CAP); }
    if ( nt.seat ) { v.seat = "offered"; queued.push(v); }
    st.list[i] = v;
    if ( got && a ) { await payInto(a, got, `${v.form?.kind ?? "A venture"}: its share`); paid.set(v.id, got); }
    const head = VR.describe(v, {marketName: mk?.name ?? "", money: words});
    const said = n > 1 ? `${got ? `paid ${words(got)} over ${n} weeks` : "paid nothing"}${lost ? `, lost ${words(lost)}` : ""}.` : last.replace(/\d+/, d => words(Number(d)));
    lines.push({actor: v.actor, text: `${head}: ${said}${nt.rival ? ` ${nt.rival} has taken note of the stake.` : ""}${v.state === "lost" ? " The venture is gone." : ""}`});
  }
  await save(st);
  for ( const v of queued ) {
    const a = game.actors.get(v.actor);
    await chron()?.propose?.({type: TYPE, key: `venture-seat:${v.id}`, title: `${v.name}: ${v.form?.seat || "a seat"}`,
      detail: `${v.name} has held a large stake in ${v.form?.kind || "a venture"} for ${v.weeks} weeks and has Influence (${influenceOf(a)}). Approve to give them ${v.form?.seat || "a seat"}: losses hurt a little less and the share pays a little more. No Background dots change.`,
      data: {venture: v.id}});
  }
  if ( lines.length ) await card(lines, {stamp, snap: st0, paid: [...paid]});
  return {lines, paid: [...paid], queued: queued.map(v => v.id)};
}

async function card(lines, {stamp, snap, paid}) {
  await ChatMessage.create({speaker: {alias: "Ventures"}, whisper: gmIds(), flags: {[MOD]: {ventureWeek: {snap, paid, applied: true, stamp}}},
    content: `<div class="wodx-card wst-ventures wst-venture-week"><h3>Ventures this week</h3><ul>${lines.map(l => `<li>${esc(l.text)}</li>`).join("")}</ul>
      <p class="wodx-quiet">Undo puts the ventures back as they were and takes back what they paid.</p>
      <div class="wodx-buttons"><button type="button" data-action="wst-venture-undo">Undo</button></div></div>`});
  // Each player hears of their own
  const byOwner = new Map();
  for ( const l of lines ) for ( const u of ownersOf(game.actors.get(l.actor)) ) byOwner.set(u, [...(byOwner.get(u) ?? []), l.text]);
  for ( const [u, ls] of byOwner ) {
    await ChatMessage.create({speaker: {alias: "Ventures"}, whisper: [u], content: `<div class="wodx-card wst-ventures"><h3>Your ventures</h3><ul>${ls.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`});
  }
}

export async function undo(msg) {
  const f = msg?.flags?.[MOD]?.ventureWeek;
  if ( !f?.applied || !game.user.isGM ) return;
  const st = state();
  for ( const [id, amount] of f.paid ?? [] ) {
    const v = st.list.find(x => x.id === id), a = game.actors.get(v?.actor ?? "");
    if ( a && amount > 0 ) await Money.pay(a, amount, {atHome: true, note: "A venture's week taken back"});
  }
  await save(f.snap);
  await msg.update({[`flags.${MOD}.ventureWeek.applied`]: false});
}

/* ------------------------------------------------------------------ */
/*  What happens on the markets                                        */
/* ------------------------------------------------------------------ */

/** A happening hits the ventures it touches at once: a lost caravan, a raid, a trader going broke. */
export async function onHappening(type, ctx = {}, text = "") {
  if ( !isActiveGM() || !on() ) return [];
  const st = state();
  const hit = VR.touched(st, type, ctx);
  if ( !hit.length ) return [];
  const out = [];
  for ( const v of hit ) {
    const a = game.actors.get(v.actor);
    const r = VR.hit(v, type, {influence: influenceOf(a), now: now(), text});
    st.list = st.list.map(x => (x.id === v.id ? r.venture : x));
    out.push({actor: v.actor, text: `${VR.describe(r.venture, {money: words})}: ${text.toLowerCase()}, lost ${words(r.lost)}.${r.venture.state === "lost" ? " The venture is gone." : ""}`});
  }
  await save(st);
  await ChatMessage.create({speaker: {alias: "Ventures"}, whisper: [...new Set([...gmIds(), ...out.flatMap(o => ownersOf(game.actors.get(o.actor)))])],
    content: `<div class="wodx-card wst-ventures"><h3>A loss for ${out.length === 1 ? "a venture" : "ventures"}</h3><ul>${out.map(o => `<li>${esc(o.text)}</li>`).join("")}</ul></div>`});
  return out;
}

/* ------------------------------------------------------------------ */
/*  Putting in and taking out                                          */
/* ------------------------------------------------------------------ */

/** GM: put money in from an actor's purse. Returns {ok, why, venture}. */
export async function put({actorId, market, kind = "house", goods = "", trader = "", amount = 0, ventureId = null} = {}) {
  if ( !game.user.isGM ) return {ok: false, why: "Only the Storyteller's table can do this."};
  if ( !on() ) return {ok: false, why: "Ventures are switched off."};
  const a = game.actors.get(actorId);
  if ( !a ) return {ok: false, why: "No such character."};
  const st = state(), e = era(), amt = Math.round(num(amount));
  const p = Money.purseOf(a);
  const res = Money.resourcesOf(a), inf = influenceOf(a);
  const old = ventureId ? st.list.find(v => v.id === ventureId && v.state === "open" && v.actor === a.id) : null;
  const check = VR.canPut({amount: amt, have: p.carried + p.bank, resources: res, influence: inf, held: old ? 0 : VR.openOf(st, a.id).length, year: e.year, region: region()});
  if ( !check.ok ) return check;
  const mk = MK.marketById(Markets.state(), old?.market ?? market);
  if ( !mk ) return {ok: false, why: "Pick a market the Storyteller has set up."};
  const paid = await Money.pay(a, amt, {atHome: true, note: `Put into ${old?.form?.kind ?? "a venture"}`});
  if ( !paid.ok ) return {ok: false, why: `The purse is short by ${paid.text}.`};
  let v;
  if ( old ) v = VR.addTo(old, amt, now());
  else {
    const f = formHere(mk);
    v = VR.openVenture({id: foundry.utils.randomID(), actor: a.id, name: a.name, market: mk.id, kind, goods: KINDS[goods] ? goods : "",
      trader: kind === "house" && mk.traders.some(t => t.actor === trader) ? trader : "", amount: amt, now: now(), year: e.year, sphere: sphereOf(mk), future: e.future});
    v.form = {stake: f.stake, kind: VR.kindWords(v.kind, f), seat: f.seat};
  }
  await save({...st, list: old ? st.list.map(x => (x.id === v.id ? v : x)) : [...st.list, v]});
  Hooks.callAll("wodxVenture", {phase: old ? "added" : "opened", venture: v});
  return {ok: true, venture: v};
}

/** GM: take money out (all closes it). Returns {ok, back, cut}. */
export async function take({actorId, ventureId, amount = 0, all: everything = false} = {}) {
  if ( !game.user.isGM ) return {ok: false, why: "Only the Storyteller's table can do this."};
  const st = state(), v = st.list.find(x => x.id === ventureId && x.actor === actorId);
  if ( !v || v.state !== "open" ) return {ok: false, why: "That venture is not open."};
  const e = era();
  const r = VR.takeOut(v, amount, {year: e.year, future: e.future, all: everything, now: now()});
  if ( !r.back && !everything ) return {ok: false, why: "Take out a sum of money."};
  await save({...st, list: st.list.map(x => (x.id === v.id ? r.venture : x))});
  await payInto(game.actors.get(actorId), r.back, `Taken out of ${v.form?.kind ?? "a venture"}`);
  Hooks.callAll("wodxVenture", {phase: r.venture.state === "closed" ? "closed" : "taken", venture: r.venture});
  return {ok: true, back: r.back, cut: r.cut};
}

/** A player's request, on the active Storyteller's client. */
export async function onRequest(payload = {}) {
  const user = game.users.get(payload.userId), a = game.actors.get(payload.actorId);
  if ( !user || !a || !a.testUserPermission?.(user, "OWNER") ) return null;
  const r = payload.op === "take" ? await take(payload) : await put(payload);
  game.socket.emit(SOCKET, {type: "answer", payload: {userId: user.id, kind: "venture", result: {ok: !!r?.ok, why: r?.why}}});
  return r;
}
async function ask(op, body) {
  if ( game.user.isGM ) {
    const r = op === "take" ? await take(body) : await put(body);
    if ( !r.ok ) ui.notifications.warn(r.why ?? "That could not be done.");
    return r;
  }
  if ( !game.users.activeGM ) { ui.notifications.warn("No Storyteller is connected, so this could not be sent."); return {ok: false}; }
  game.socket.emit(SOCKET, {type: "req.venture", payload: {...body, op, userId: game.user.id}});
  ui.notifications.info("Sent to the Storyteller's table.");
  return {ok: true, sent: true};
}

/* ------------------------------------------------------------------ */
/*  The window                                                         */
/* ------------------------------------------------------------------ */

/** Who can put money in: a player's own characters; for the Storyteller, the player characters, the selected tokens'
 * actors (an NPC investor) and anyone who already holds a venture. */
function investors(st) {
  if ( !game.user.isGM ) return all(game.actors).filter(a => a.isOwner && !/group/i.test(String(a.type ?? "")));
  const ids = new Set([...all(game.actors).filter(a => a.hasPlayerOwner && !/group/i.test(String(a.type ?? ""))).map(a => a.id),
    ...(globalThis.canvas?.tokens?.controlled ?? []).map(t => t.actor?.id).filter(Boolean), ...VR.openOf(st).map(v => v.actor)]);
  return [...ids].map(id => game.actors.get(id)).filter(Boolean);
}

/** The Ventures window: what each character has put in, and putting in or taking out. */
export async function venturesDialog() {
  try { KINDS = (await import("../../wodx-library/data/goods.mjs")).KINDS ?? {}; } catch (e) { KINDS = {}; }
  const st = state(), mst = Markets.state(), e = era(), cur = Money.moneyNow(), unit = cur.units[0];
  const actors = investors(st);
  const ids = new Set(actors.map(a => a.id));
  const list = st.list.filter(v => game.user.isGM || ids.has(v.actor));
  const mName = id => MK.marketById(mst, id)?.name ?? "a market gone";
  const rows = list.map(v => `<tr><td>${esc(v.name)}</td><td>${esc(v.form?.stake ?? "")} in ${esc(v.form?.kind ?? "")}${v.goods ? ` (${esc(label(v.goods).toLowerCase())})` : ""}</td><td>${esc(mName(v.market))}</td>
    <td>${esc(words(v.value))}<br><small>put in ${esc(words(v.put))}, paid ${esc(words(v.paid))}</small></td>
    <td>${v.state === "open" ? `${VR.isLarge(v, e.year, region()) ? "Large stake" : "Open"}${v.seat === true ? `; ${esc(v.form?.seat ?? "a seat")}` : v.seat === "offered" ? "; a seat offered" : ""}${v.rival ? `; rival: ${esc(v.rival)}` : ""}` : v.state === "lost" ? "Gone" : "Closed"}</td>
    <td>${v.state === "open" ? `<input type="number" min="0" step="any" name="take.${v.id}" aria-label="Take out, in ${esc(unit[1])}" style="width:6em"> <label><input type="checkbox" name="all.${v.id}"> All</label>` : ""}</td></tr>`).join("");
  const markets = mst.markets.filter(m => !m.cut);
  const f = formHere(markets[0] ?? null);
  const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  const traders = markets.flatMap(m => m.traders.filter(t => game.actors.get(t.actor)).map(t => ({m: m.id, id: t.actor, name: `${game.actors.get(t.actor).name} (${m.name})`})));
  const content = `<p>Put money into ${esc(f.caravan)}, ${esc(f.workshop)} or ${esc(f.house)} on a market. In ${e.year || "this year"} a stake is ${esc(f.stake)}. Each week it pays a share into the purse, or loses part of its value to a lost caravan, a glut, a raid or a trader going broke. Resources sets how much can go in at once (a year's allowance) and, with Influence, how many ventures a character holds; Influence softens a loss. Taking money out early costs ${Math.round(VR.EXIT_CUT[f.age] * 100)} in the hundred now.</p>
    ${list.length > 5 ? searchBox("table.wst-ventures-t", "Search ventures…", "Search ventures") : ""}<div class="wst-scroll"><table class="wst-ventures-t"><thead><tr><th>Who</th><th>Venture</th><th>Market</th><th>Worth</th><th>Standing</th><th>Take out (${esc(unit[1])})</th></tr></thead><tbody>${rows || "<tr><td colspan='6'>No ventures yet.</td></tr>"}</tbody></table></div>
    ${on() && markets.length && actors.length ? `<fieldset><legend>Put money in</legend>
      <label>Who <select name="actor" data-fixed>${actors.map(a => opt(a.id, a.name)).join("")}</select></label>
      <label>Market <select name="market" data-fixed>${markets.map(m => opt(m.id, m.name)).join("")}</select></label>
      <label>Into <select name="kind" data-fixed>${VR.KINDS.map(k => opt(k, VR.KIND_LABEL[k])).join("")}</select></label>
      <label>Goods <select name="goods" data-fixed>${opt("", "Any")}${Object.keys(KINDS).filter(k => k !== "coin").map(k => opt(k, label(k))).join("")}</select></label>
      ${traders.length ? `<label>Trader (a trading house) <select name="trader" data-fixed>${opt("", "None")}${traders.map(t => opt(t.id, t.name)).join("")}</select></label>` : ""}
      <label>Sum (${esc(unit[1])}) <input type="number" min="0" step="any" name="amount"></label>
      <label>Or add to <select name="add" data-fixed>${opt("", "A new venture")}${list.filter(v => v.state === "open").map(v => opt(v.id, `${v.name}: ${v.form?.kind ?? ""}`)).join("")}</select></label></fieldset>`
      : `<p class="hint">${!on() ? "Ventures are switched off in the settings." : !markets.length ? "The Storyteller has not set up a market yet." : "No character to put money in for."}</p>`}
    <p class="hint">Resources and Influence as the books give them (V20 Backgrounds; V20 Dark Ages pp. 181-182 for the allowance). A large stake is ${VR.LARGE_WAGES} months of a plain wage or more.</p>`;
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 760}, window: {title: "Ventures", resizable: true}, classes: ["wodx-dialog", "wst-ventures"],
    content, buttons: [{action: "save", label: "Do it", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "close", label: "Close"}]});
  if ( !res || typeof res !== "object" ) return;
  const w = unit[2];
  for ( const v of list.filter(x => x.state === "open") ) {
    const amt = Math.round(num(res[`take.${v.id}`]) * w), everything = !!res[`all.${v.id}`];
    if ( amt > 0 || everything ) await ask("take", {actorId: v.actor, ventureId: v.id, amount: amt, all: everything});
  }
  const amt = Math.round(num(res.amount) * w);
  if ( amt > 0 && res.actor ) {
    const add = res.add ? list.find(v => v.id === res.add) : null;
    await ask("put", {actorId: add?.actor ?? res.actor, market: res.market, kind: res.kind, goods: res.goods ?? "", trader: res.trader ?? "", amount: amt, ventureId: add?.id ?? null});
  }
}

/** For the Markets window: "2 stakes (1 large)". */
export function stakesWords(marketId) {
  const e = era(), s = VR.stakesIn(state(), marketId);
  if ( !s.length ) return "";
  const big = s.filter(v => VR.isLarge(v, e.year, region())).length;
  return `${s.length} ${s.length === 1 ? "stake" : "stakes"}${big ? ` (${big} large)` : ""}`;
}

export function registerApproval() {
  chron()?.registerApprovalHandler?.(TYPE, {label: "Ventures", approve: async entry => {
    const st = state(), id = entry.data?.venture;
    const v = st.list.find(x => x.id === id);
    if ( !v || v.state !== "open" ) return;
    v.seat = true;
    v.log = [...v.log, {t: now(), text: `Given ${v.form?.seat || "a seat"}.`}].slice(-VR.LOG_CAP);
    await save(st);
    Hooks.callAll("wodxVenture", {phase: "seat", venture: v});
  }, reject: async entry => {
    const st = state(), v = st.list.find(x => x.id === entry.data?.venture);
    // Refused: the offer can come again after another eight weeks
    if ( v && v.seat === "offered" ) { v.seat = false; v.weeks = 0; await save(st); }
  }});
}

export async function setupVentures() {
  try { KINDS = (await import("../../wodx-library/data/goods.mjs")).KINDS ?? {}; } catch (e) { KINDS = {}; }
  registerApproval();
  Hooks.on("wodxCaravan", ({phase, caravan} = {}) => {
    if ( phase !== "lost" || !caravan ) return;
    onHappening("caravanLost", {from: caravan.from, to: caravan.to}, "A caravan was lost on the road").catch(e => console.error(`${MOD} | ventures`, e));
  });
  Hooks.on("wodxMarketMove", ({move, market} = {}) => {
    if ( move?.type !== "raid" ) return;
    onHappening("raid", {market: market ?? move.market}, "The market was raided").catch(e => console.error(`${MOD} | ventures`, e));
  });
  Hooks.on("wodxTraderBroke", ({market, actor} = {}) => {
    onHappening("traderBroke", {market, trader: actor}, "The trader went broke").catch(e => console.error(`${MOD} | ventures`, e));
  });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const f = message.flags?.[MOD]?.ventureWeek;
    const b = f && html?.querySelector?.("[data-action=wst-venture-undo]");
    if ( !b ) return;
    if ( !game.user.isGM ) { b.remove(); return; }
    b.disabled = !f.applied;
    b.addEventListener("click", () => { b.disabled = true; undo(message).catch(e => console.error(`${MOD} |`, e)); });
  });
}

export const rules = VR;
export const api = () => ({open: venturesDialog, state, on, put, take, week: weekRun, undo, hit: onHappening, influenceOf, form: formHere, stakes: stakesWords, rules: VR});
