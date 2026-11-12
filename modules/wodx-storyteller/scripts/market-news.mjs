/**
 * WoDX Storyteller 0.36.0: market news (rules in market-news-rules.mjs).
 *
 * Hears WoDX Chronicle's dated events (wodxEventFired, wodxEventUndone) and the trades WoDX Actions completes
 * (wodxTradeDone). Each piece of news is a card for the Storyteller with what it would change: the markets' prices
 * and supply, and the passers-by crowd (WoDX NPC) on scenes that have one. Apply changes them; Undo, or taking the
 * event back, puts them as they were. Nothing changes until the Storyteller applies it.
 */
import * as N from "./market-news-rules.mjs";
import * as MK from "./market-rules.mjs";
import * as Markets from "./markets.mjs";
import * as Money from "./money.mjs";
import {MOD, esc, isActiveGM, gmIds} from "./core.mjs";

const NPC = "wodx-npc";
const H3 = "margin:0;font-size:1.05em";
let kinds = [];

export function registerMarketNewsSettings() {
  game.settings.register(MOD, "tradeTally", {scope: "world", config: false, type: Object, default: {}});
}

const crowdScenes = () => game.scenes.filter(s => s.flags?.[NPC]?.crowd?.on);
const kindLabel = k => ({food: "food", drink: "drink", medicine: "medicine", fuel: "fuel", arms: "arms", cloth: "cloth", valuables: "valuables", tech: "tech", faith: "faith", materials: "materials"})[k] ?? k;

function changeLines(changes, crowd) {
  const out = changes.map(c => `<li><b>${esc(c.name)}</b>: ${esc([
    ...Object.entries(c.index).map(([k, v]) => `${kindLabel(k)} price x${v}`),
    ...Object.entries(c.supply).map(([k, v]) => `${kindLabel(k)} ${MK.SUPPLY[v]?.label.toLowerCase() ?? v}`)].join(", "))}</li>`);
  if ( crowd.length ) out.push(`<li>Passers-by: ${esc(crowd.map(c => c.name).join(", "))} ${crowd[0].density === "busy" ? "busier" : "quieter"}</li>`);
  return out.join("");
}

async function card({title, text, changes, crowd, key, eventId = null}) {
  if ( !changes.length && !crowd.length ) return null;
  return ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(),
    flags: {[MOD]: {marketNews: {key, eventId, changes, crowd, applied: false}}},
    content: `<div class="vta-card wodx-x wst-news"><header class="vta-head"><h3 style="${H3}">${esc(title)}</h3><span class="vta-verdict">Markets</span></header><div class="vta-body">
      <p>${esc(text)}</p><ul>${changeLines(changes, crowd)}</ul>
      <p class="wodx-quiet">A suggestion (house rule). Nothing changes until you apply it.</p>
      <div class="wodx-buttons"><button type="button" data-action="wst-news-apply">Apply</button> <button type="button" data-action="wst-news-undo" disabled>Undo</button></div></div></div>`});
}

async function apply(msg) {
  const f = msg.flags?.[MOD]?.marketNews;
  if ( !f || f.applied ) return;
  for ( const c of f.changes ) await Markets.setMarket(c.id, {index: c.index, supply: c.supply});
  for ( const c of f.crowd ) await game.scenes.get(c.scene)?.update({[`flags.${NPC}.crowd.density`]: c.density});
  await msg.update({[`flags.${MOD}.marketNews.applied`]: true});
}
async function undo(msg, {why = ""} = {}) {
  const f = msg.flags?.[MOD]?.marketNews;
  if ( !f?.applied ) return;
  for ( const c of f.changes ) await Markets.setMarket(c.id, N.undoChange(c));
  for ( const c of f.crowd ) await game.scenes.get(c.scene)?.update({[`flags.${NPC}.crowd.density`]: c.prev ?? "normal"});
  await msg.update({[`flags.${MOD}.marketNews.applied`]: false});
  if ( why ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: `<div class="vta-card wodx-x"><div class="vta-body"><p>${esc(why)}</p></div></div>`});
}

async function onEventFired(ev) {
  const key = N.newsFor(ev);
  if ( !key || !isActiveGM() ) return;
  const p = N.PRESETS[key], st = Markets.state();
  const changes = N.marketChanges(key, st.markets, kinds, MK.INDEX);
  const crowd = p.crowd ? crowdScenes().map(s => ({scene: s.id, name: s.name, density: p.crowd, prev: s.flags[NPC].crowd.density ?? "normal"})) : [];
  await card({title: `${p.label}: ${ev.name ?? "news"}`, text: p.note, changes, crowd, key: `event:${ev.id}`, eventId: ev.id});
}
async function onEventUndone(ev) {
  if ( !isActiveGM() || !ev?.id ) return;
  const msgs = game.messages.filter(m => m.flags?.[MOD]?.marketNews?.eventId === ev.id && m.flags[MOD].marketNews.applied);
  for ( const m of msgs ) await undo(m, {why: `${ev.name ?? "The event"} was taken back, so the market news it brought is undone.`});
}

async function onTradeDone(t = {}) {
  if ( !isActiveGM() ) return;
  await Money.goodsList();
  const st = Markets.state();
  const tile = t.shop ? (() => { try { return fromUuidSync(t.shop); } catch (e) { return null; } })() : null;
  const m = (tile ? MK.marketOfTile(st, tile.uuid) : null) ?? (t.scene ? MK.marketOfScene(st, t.scene) : null);
  if ( !m ) return;
  const all = foundry.utils.deepClone(game.settings.get(MOD, "tradeTally") ?? {});
  let tally = all[m.id] ?? {};
  const notices = [];
  for ( const [line, dir] of [[t.sold, "in"], [t.bought, "out"]] ) {
    if ( !line?.name ) continue;
    const kind = Money.findGoodSync(line.name)?.good?.kind ?? null;
    if ( !kind ) continue;
    const r = N.countTrade(tally, {kind, dir, count: line.count, worldTime: game.time.worldTime});
    tally = r.tally;
    if ( r.notice ) notices.push(r.notice);
  }
  all[m.id] = tally;
  await game.settings.set(MOD, "tradeTally", all);
  for ( const n of notices ) {
    const c = N.tradeChange(m, n, MK.INDEX);
    const word = N.TRADE_STEP[n.dir].word;
    await card({title: `${m.name}: ${kindLabel(n.kind)} ${word}`, changes: c ? [c] : [], crowd: [], key: `trade:${m.id}:${n.kind}:${n.dir}`,
      text: `The player characters have ${n.dir === "in" ? "sold" : "bought"} ${n.count} lots of ${kindLabel(n.kind)} here this week. The market is ${word}.`});
  }
}

export async function setupMarketNews() {
  try { kinds = Object.keys((await import("../../wodx-library/data/goods.mjs")).KINDS ?? {}); } catch (e) { kinds = []; }
  Hooks.on("wodxEventFired", ev => { onEventFired(ev).catch(e => console.error(`${MOD} | market news`, e)); });
  Hooks.on("wodxEventUndone", ev => { onEventUndone(ev).catch(e => console.error(`${MOD} | market news`, e)); });
  Hooks.on("wodxTradeDone", t => { onTradeDone(t).catch(e => console.error(`${MOD} | market news`, e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const f = message.flags?.[MOD]?.marketNews;
    if ( !html || !f ) return;
    const a = html.querySelector?.("[data-action=wst-news-apply]"), u = html.querySelector?.("[data-action=wst-news-undo]");
    if ( !game.user.isGM ) { a?.remove(); u?.remove(); return; }
    if ( a ) { a.disabled = !!f.applied; a.addEventListener("click", () => { a.disabled = true; apply(message).catch(e => console.error(`${MOD} |`, e)); }); }
    if ( u ) { u.disabled = !f.applied; u.addEventListener("click", () => { u.disabled = true; undo(message).catch(e => console.error(`${MOD} |`, e)); }); }
  });
}

export const api = () => ({rules: N, apply, undo});
