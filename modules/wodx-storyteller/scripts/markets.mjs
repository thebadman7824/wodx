/**
 * WoDX Storyteller 0.23.0: markets, the living economy's first build (rules in market-rules.mjs).
 *
 *   World setting wodx-storyteller.markets = {v, markets: [{id, name, scenes, index, supply, note, traders}]}.
 *   Prices (api.upkeep.money.price) read the market of the trader's tile or of the scene in view.
 *   A trader is an NPC and a container with a stock list (WoDX Interactables). When its stock is drawn, the market's
 *   supply thins or fills the draw, and the NPC's purse pays half price for what comes in; a thin till buys less.
 *   Only the Storyteller sees and edits markets. The weekly market turn is a later build.
 */
import * as MK from "./market-rules.mjs";
import * as Money from "./money.mjs";
import {MOD, esc, isActiveGM} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

let KINDS = {};
const kindIds = () => Object.keys(KINDS);

export function registerMarketSettings() {
  game.settings.register(MOD, "markets", {scope: "world", config: false, type: Object, default: MK.blankState()});
}

export const state = () => MK.normState(game.settings.get(MOD, "markets"), kindIds());
async function save(st) { await game.settings.set(MOD, "markets", MK.normState(st, kindIds())); }

const ICS = "wodx-interactables";
const containerTiles = scene => (scene?.tiles ?? []).filter(t => t.flags?.[ICS]?.container);
const tileLabel = t => `${t.parent?.name ?? "Scene"}: ${t.flags?.[ICS]?.stock ? "stocked " : ""}${t.flags?.[ICS]?.kind ?? "container"} (${Math.round(t.x)}, ${Math.round(t.y)})`;

/** A stock draw for a trader's container: supply thins or fills it, and the till pays half price. In place. */
function onStockFilter(tile, fresh) {
  if ( !isActiveGM() || !Array.isArray(fresh) ) return;
  const t = MK.traderOfTile(state(), tile?.uuid);
  if ( !t ) return;
  const kindOf = name => Money.findGoodSync(name)?.good?.kind ?? null;
  const priced = (name, count) => Money.priceSync(name, {count, market: t.market})?.total ?? null;
  let lines = MK.applySupply(fresh, t.market, kindOf);
  const actor = game.actors.get(t.actor);
  let cost = 0;
  if ( actor ) {
    const till = Money.purseOf(actor);
    const r = MK.affordable(lines, till.carried + till.bank, priced);
    lines = r.lines; cost = r.cost;
  }
  fresh.splice(0, fresh.length, ...lines);
  if ( actor && cost > 0 ) Money.pay(actor, cost, {atHome: true, note: "Restocked the shop"}).catch(e => console.error(`${MOD} | till`, e));
}

/* ---------------------------------------------------------------- the Markets window */

const opt = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(v)}</option>`).join("");

async function editMarket(id = null) {
  const st = state();
  const m = id ? MK.marketById(st, id) : MK.normMarket({name: "New market"}, kindIds());
  if ( !m ) return;
  const scenes = game.scenes.contents;
  const sceneRows = scenes.map(s => `<li><label><input type="checkbox" name="scene.${s.id}"${m.scenes.includes(s.id) ? " checked" : ""}> ${esc(s.name)}</label></li>`).join("");
  const kindRows = Object.entries(KINDS).map(([k, label]) => `<tr><td>${esc(label)}</td>
    <td><input type="number" name="index.${k}" min="${MK.INDEX.min}" max="${MK.INDEX.max}" step="0.05" value="${MK.indexOf(m, k)}" aria-label="${esc(label)} price index"></td>
    <td><select name="supply.${k}" data-fixed aria-label="${esc(label)} supply">${opt(Object.fromEntries(Object.entries(MK.SUPPLY).map(([s, v]) => [s, v.label])), MK.supplyOf(m, k))}</select></td></tr>`).join("");
  const npcs = game.actors.filter(a => !a.hasPlayerOwner).sort((a, b) => a.name.localeCompare(b.name));
  const tiles = scenes.flatMap(containerTiles);
  const traderRows = [...m.traders, {actor: "", tile: ""}].map((t, i) => `<tr>
    <td><select name="trader.${i}.actor" aria-label="Trader"><option value="">(none)</option>${npcs.map(a => `<option value="${a.id}"${a.id === t.actor ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></td>
    <td><select name="trader.${i}.tile" aria-label="Shop container"><option value="">(none)</option>${tiles.map(x => `<option value="${esc(x.uuid)}"${x.uuid === t.tile ? " selected" : ""}>${esc(tileLabel(x))}</option>`).join("")}</select></td>
    <td>${t.actor && game.actors.get(t.actor) ? esc(Money.purseOf(game.actors.get(t.actor)).text.carried) : ""}</td></tr>`).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 700}, window: {title: `Market: ${m.name}`}, classes: ["wodx-dialog", "wst-market"],
    content: `<label>Name <input type="text" name="name" value="${esc(m.name)}" maxlength="80"></label>
      <h4>Places in this market</h4>${scenes.length > 5 ? searchBox("ul.wst-market-scenes", "Search places…", "Search places") : ""}<div class="wst-scroll" style="max-height:140px"><ul class="wst-market-scenes">${sceneRows}</ul></div>
      <h4>Prices and supply by category</h4><p class="hint">Price index: 1 is normal, 0.5 a glut, 3 a famine price. Supply thins or fills what traders restock: None, Short, Normal or Plenty. House rules.</p>
      <div class="wst-scroll" style="max-height:260px"><table class="wst-market-kinds" data-fixed><thead><tr><th>Category</th><th>Price index</th><th>Supply</th></tr></thead><tbody>${kindRows}</tbody></table></div>
      <h4>Traders</h4><p class="hint">An NPC and the container that is their shop (a container with a stock list). The NPC's purse is the till: restocking costs half price.</p>
      ${npcs.length > 5 ? searchBox("table.wst-market-traders select", "Search NPCs…", "Search NPCs") : ""}<div class="wst-scroll" style="max-height:200px"><table class="wst-market-traders"><thead><tr><th>NPC</th><th>Shop</th><th>Till</th></tr></thead><tbody>${traderRows}</tbody></table></div>
      <label>Notes <textarea name="note" rows="2">${esc(m.note)}</textarea></label>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))},
      ...(id ? [{action: "delete", label: "Remove this market"}] : []), {action: "cancel", label: "Cancel"}]});
  if ( !res || res === "cancel" ) return;
  if ( res === "delete" ) {
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Remove market"}, content: `<p>Remove the market ${esc(m.name)}? Its shops and NPCs stay; only the market's prices and links go.</p>`});
    if ( ok ) await save({...st, markets: st.markets.filter(x => x.id !== id)});
    return;
  }
  const next = {...m, name: res.name || m.name, note: res.note ?? "", scenes: scenes.filter(s => res[`scene.${s.id}`]).map(s => s.id), index: {}, supply: {}, traders: []};
  for ( const k of kindIds() ) { next.index[k] = Number(res[`index.${k}`]); next.supply[k] = res[`supply.${k}`]; }
  for ( let i = 0; i <= m.traders.length; i++ ) if ( res[`trader.${i}.actor`] && res[`trader.${i}.tile`] ) next.traders.push({actor: res[`trader.${i}.actor`], tile: res[`trader.${i}.tile`]});
  const others = st.markets.filter(x => x.id !== m.id);
  await save({...st, markets: id ? st.markets.map(x => (x.id === id ? next : x)) : [...others, {...next, id: ""}]});
}

export async function marketsDialog() {
  if ( !game.user.isGM ) return;
  await Money.goodsList();
  const st = state();
  const rows = st.markets.map(m => `<tr><td>${esc(m.name)}</td><td>${m.scenes.length}</td><td>${m.traders.length}</td>
    <td>${Object.keys(m.index).length || Object.keys(m.supply).length ? esc([...Object.entries(m.index).map(([k, v]) => `${KINDS[k] ?? k} x${v}`), ...Object.entries(m.supply).map(([k, v]) => `${KINDS[k] ?? k} ${MK.SUPPLY[v].label.toLowerCase()}`)].slice(0, 4).join(", ")) : "All normal"}</td>
    <td><button type="button" data-market="${esc(m.id)}">Edit</button></td></tr>`).join("");
  let picked = null;
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 640}, window: {title: "Markets"}, classes: ["wodx-dialog", "wst-markets"],
    content: `<p>A market is a settlement: its places, a price index and supply for each kind of goods, and its traders. Prices in its places follow it. Only the Storyteller sees this.</p>
      ${st.markets.length > 5 ? searchBox("table.wst-markets-t", "Search markets…", "Search markets") : ""}<div class="wst-scroll"><table class="wst-markets-t"><thead><tr><th>Market</th><th>Places</th><th>Traders</th><th>Not normal</th><th></th></tr></thead><tbody>${rows || "<tr><td colspan='5'>No markets yet.</td></tr>"}</tbody></table></div>`,
    render: (ev, dialog) => {
      const el = dialog.element ?? dialog;
      el.querySelectorAll?.("button[data-market]").forEach(b => b.addEventListener("click", () => { picked = b.dataset.market; dialog.close(); }));
    },
    buttons: [{action: "add", label: "New market"}, {action: "close", label: "Close"}]});
  if ( picked ) return editMarket(picked);
  if ( res === "add" ) return editMarket(null);
}

export async function setMarket(id, patch = {}) {
  if ( !game.user.isGM ) return null;
  const st = state(), m = MK.marketById(st, id);
  if ( !m ) return null;
  const next = {...m, ...patch, index: {...m.index, ...(patch.index ?? {})}, supply: {...m.supply, ...(patch.supply ?? {})}};
  await save({...st, markets: st.markets.map(x => (x.id === id ? next : x))});
  return MK.marketById(state(), id);
}

export async function setupMarkets() {
  try { KINDS = (await import("../../wodx-library/data/goods.mjs")).KINDS ?? {}; } catch (e) { KINDS = {}; }
  await Money.goodsList();
  Hooks.on("wodxStockFilter", onStockFilter);
}

export const api = () => ({open: marketsDialog, edit: editMarket, state, set: setMarket, of: Money.marketFor,
  traderOf: tile => MK.traderOfTile(state(), typeof tile === "string" ? tile : tile?.uuid), rules: MK});
