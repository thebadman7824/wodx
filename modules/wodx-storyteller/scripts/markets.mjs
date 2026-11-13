/**
 * WoDX Storyteller 0.26.0: markets, the living economy's first build (rules in market-rules.mjs).
 *
 *   World setting wodx-storyteller.markets = {v, markets: [{id, name, scenes, index, supply, note, traders}]}.
 *   Prices (api.upkeep.money.price) read the market of the trader's tile or of the scene in view.
 *   A trader is an NPC and a container with a stock list (WoDX Interactables). When its stock is drawn, the market's
 *   supply thins or fills the draw, and the NPC's purse pays half price for what comes in; a thin till buys less.
 *   Only the Storyteller sees and edits markets. The weekly market turn (market-turn.mjs, 0.48.0) moves them; a market
 *   lists the markets it trades with, and one cut off (a siege, a quarantine) is left alone by the turn.
 *   0.49.0: a market also shows what factions have laid on it (taxes, monopolies, smuggling), the roads a raid has
 *   closed and which shops have shut; the Storyteller sets or ends each by hand here (market-moves.mjs, caravans.mjs).
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
/** Storyteller 0.48.0: the weekly market turn writes the whole state at once (one setting update a week). */
export async function saveState(st) { if ( game.user.isGM ) await save(st); }

const ICS = "wodx-interactables";
const containerTiles = scene => (scene?.tiles ?? []).filter(t => t.flags?.[ICS]?.container);
const tileLabel = t => `${t.parent?.name ?? "Scene"}: ${t.flags?.[ICS]?.stock ? "stocked " : ""}${t.flags?.[ICS]?.kind ?? "container"} (${Math.round(t.x)}, ${Math.round(t.y)})`;

/** A stock draw for a trader's container: supply thins or fills it, and the till pays half price. In place. */
function onStockFilter(tile, fresh) {
  if ( !isActiveGM() || !Array.isArray(fresh) ) return;
  const t = MK.traderOfTile(state(), tile?.uuid);
  if ( !t ) return;
  // 0.49.0: a shop that has shut draws no new stock
  if ( t.shut ) { fresh.splice(0, fresh.length); return; }
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
    <td>${t.actor && game.actors.get(t.actor) ? esc(Money.purseOf(game.actors.get(t.actor)).text.carried) : ""}</td>
    <td>${t.actor ? `<label><input type="checkbox" name="trader.${i}.shut"${t.shut ? " checked" : ""}> Shut</label>${t.behind ? ` ${t.behind} wk behind` : ""}${t.backer ? ` (backed by ${esc(t.backer)})` : ""}` : ""}</td></tr>`).join("");
  // 0.49.0: what factions have laid on this market, and roads a raid has closed
  const mv = game.modules.get(MOD)?.api?.upkeep?.marketMoves;
  const factions = id ? (mv?.views?.(st) ?? []).filter(v => !v.idle).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const moveRows = m.moves.map(v => `<li><label><input type="checkbox" name="endmove.${esc(v.id)}"> End it:</label> ${esc(mv?.words?.(v) ?? v.name)}${v.weeks ? `, ${v.weeks} wk` : ""}</li>`).join("");
  const roadRows = Object.entries(m.unsafe).map(([l, w]) => `<li><label><input type="checkbox" name="openroad.${esc(l)}"> Open it:</label> the road to ${esc(MK.marketById(st, l)?.name ?? l)}, closed ${w} more ${w === 1 ? "week" : "weeks"}</li>`).join("");
  const movesHtml = !id ? "" : `<h4>Factions and this market</h4><p class="hint">A faction may tax the market, corner one kind of goods, smuggle past another's tax, or raid it. Taxes and monopolies raise prices and cut what traders earn; a raid takes a caravan on the road, or strips the stalls and closes a road. Your word stands here whatever the faction's dots. House rules.</p>
      ${moveRows || roadRows ? `<ul class="wst-market-moves-l">${moveRows}${roadRows}</ul>` : "<p class=\"hint\">Nothing is laid on this market.</p>"}
      ${factions.length ? `<div class="wst-market-move-add"><select name="move.faction" aria-label="Faction"><option value="">(no new move)</option>${factions.map(v => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join("")}</select>
        <select name="move.type" data-fixed aria-label="Move"><option value="tax">Tax</option><option value="monopoly">Monopoly</option><option value="smuggle">Smuggle</option><option value="raid">Raid now</option></select>
        <select name="move.goods" aria-label="Goods"><option value="">Every kind (tax)</option>${opt(KINDS, "")}</select>
        <select name="move.rate" data-fixed aria-label="Tax rate"><option value="0.1">Light</option><option value="0.2">Heavy</option><option value="0.3">Crushing</option></select></div>` : "<p class=\"hint\">No faction to act here yet (WoDX NPC, Factions).</p>"}`;
  const others = st.markets.filter(x => x.id !== m.id);
  const linkRows = others.map(x => `<li><label><input type="checkbox" name="link.${esc(x.id)}"${m.links.includes(x.id) ? " checked" : ""}> ${esc(x.name)}</label></li>`).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 700}, window: {title: `Market: ${m.name}`}, classes: ["wodx-dialog", "wst-market"],
    content: `<label>Name <input type="text" name="name" value="${esc(m.name)}" maxlength="80"></label>
      <h4>Places in this market</h4>${scenes.length > 5 ? searchBox("ul.wst-market-scenes", "Search places…", "Search places") : ""}<div class="wst-scroll" style="max-height:140px"><ul class="wst-market-scenes">${sceneRows}</ul></div>
      <h4>Trade and the week</h4><p class="hint">Each week linked markets trade: goods go where they are short, and prices meet part way (more in an age of railways). A market cut off (a siege, a quarantine) is left as it is by the weekly turn. House rules.</p>
      ${others.length ? `${others.length > 5 ? searchBox("ul.wst-market-links", "Search markets…", "Search markets") : ""}<div class="wst-scroll" style="max-height:120px"><ul class="wst-market-links">${linkRows}</ul></div>` : "<p class=\"hint\">No other market to trade with yet.</p>"}
      <label><input type="checkbox" name="cut"${m.cut ? " checked" : ""}> Cut off: the weekly turn leaves this market alone</label>
      <h4>Prices and supply by category</h4><p class="hint">Price index: 1 is normal, 0.5 a glut, 3 a famine price. Supply thins or fills what traders restock: None, Short, Normal or Plenty. House rules.</p>
      <div class="wst-scroll" style="max-height:260px"><table class="wst-market-kinds" data-fixed><thead><tr><th>Category</th><th>Price index</th><th>Supply</th></tr></thead><tbody>${kindRows}</tbody></table></div>
      <h4>Traders</h4><p class="hint">An NPC and the container that is their shop (a container with a stock list). The NPC's purse is the till: restocking costs half price.</p>
      ${npcs.length > 5 ? searchBox("table.wst-market-traders select", "Search NPCs…", "Search NPCs") : ""}<div class="wst-scroll" style="max-height:200px"><table class="wst-market-traders"><thead><tr><th>NPC</th><th>Shop</th><th>Till</th><th>Shop is</th></tr></thead><tbody>${traderRows}</tbody></table></div>
      ${movesHtml}
      <label>Notes <textarea name="note" rows="2">${esc(m.note)}</textarea></label>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))},
      ...(id ? [{action: "delete", label: "Remove this market"}] : []), {action: "cancel", label: "Cancel"}]});
  if ( !res || res === "cancel" ) return;
  if ( res === "delete" ) {
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Remove market"}, content: `<p>Remove the market ${esc(m.name)}? Its shops and NPCs stay; only the market's prices and links go.</p>`});
    if ( ok ) await save({...st, markets: st.markets.filter(x => x.id !== id)});
    return;
  }
  const links = others.filter(x => res[`link.${x.id}`]).map(x => x.id);
  const next = {...m, name: res.name || m.name, note: res.note ?? "", scenes: scenes.filter(s => res[`scene.${s.id}`]).map(s => s.id), index: {}, supply: {}, traders: [],
    links, cut: !!res.cut};
  for ( const k of kindIds() ) { next.index[k] = Number(res[`index.${k}`]); next.supply[k] = res[`supply.${k}`]; }
  for ( let i = 0; i <= m.traders.length; i++ ) if ( res[`trader.${i}.actor`] && res[`trader.${i}.tile`] ) {
    // The same trader in the same shop keeps what the weeks have done to it; unticking Shut opens it with a clean slate
    const was = m.traders.find(t => t.actor === res[`trader.${i}.actor`] && t.tile === res[`trader.${i}.tile`]) ?? {};
    const shut = !!res[`trader.${i}.shut`];
    next.traders.push({actor: res[`trader.${i}.actor`], tile: res[`trader.${i}.tile`], backer: was.backer,
      ...(shut ? {shut: true, shutWeeks: was.shut ? was.shutWeeks : 0, behind: was.behind} : was.shut ? {} : {behind: was.behind})});
  }
  next.moves = m.moves.filter(v => !res[`endmove.${v.id}`]);
  next.unsafe = Object.fromEntries(Object.entries(m.unsafe).filter(([l]) => !res[`openroad.${l}`]));
  // A link goes both ways: the other side follows what was ticked here
  const mirror = x => ({...x, links: links.includes(x.id) ? [...new Set([...x.links, m.id])] : x.links.filter(l => l !== m.id),
    unsafe: Object.fromEntries(Object.entries(x.unsafe ?? {}).filter(([l]) => l !== m.id || next.unsafe[x.id]))});
  await save({...st, markets: id ? st.markets.map(x => (x.id === id ? next : mirror(x))) : [...others, {...next, id: ""}]});
  if ( id && res["move.faction"] ) await mv?.set?.({market: id, faction: res["move.faction"], type: res["move.type"], goods: res["move.goods"] ?? "", rate: Number(res["move.rate"]) || 0.1});
}

export async function marketsDialog() {
  if ( !game.user.isGM ) return;
  await Money.goodsList();
  const st = state();
  // B3110: stakes characters hold in the market's ventures show beside the factions' moves
  const stakes = id => { try { return game.modules.get(MOD)?.api?.upkeep?.ventures?.stakes?.(id) ?? ""; } catch (e) { return ""; } };
  const rows = st.markets.map(m => { const sk = stakes(m.id); return `<tr><td>${esc(m.name)}${m.cut ? " (cut off)" : ""}</td><td>${m.scenes.length}</td><td>${m.traders.length}</td>
    <td>${m.moves.length || Object.keys(m.unsafe).length || m.traders.some(t => t.shut) || sk ? esc([m.moves.length ? `${m.moves.length} faction ${m.moves.length === 1 ? "move" : "moves"}` : "", Object.keys(m.unsafe).length ? "a road closed" : "", m.traders.some(t => t.shut) ? `${m.traders.filter(t => t.shut).length} shut` : "", sk].filter(Boolean).join(", ")) : ""}</td>
    <td>${Object.keys(m.index).length || Object.keys(m.supply).length ? esc([...Object.entries(m.index).map(([k, v]) => `${KINDS[k] ?? k} x${v}`), ...Object.entries(m.supply).map(([k, v]) => `${KINDS[k] ?? k} ${MK.SUPPLY[v].label.toLowerCase()}`)].slice(0, 4).join(", ")) : "All normal"}</td>
    <td><button type="button" data-market="${esc(m.id)}">Edit</button></td></tr>`; }).join("");
  let picked = null;
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 720}, window: {title: "Markets"}, classes: ["wodx-dialog", "wst-markets"],
    content: `<p>A market is a settlement: its places, a price index and supply for each kind of goods, and its traders. Prices in its places follow it. Only the Storyteller sees this.</p>
      ${st.markets.length > 5 ? searchBox("table.wst-markets-t", "Search markets…", "Search markets") : ""}<div class="wst-scroll"><table class="wst-markets-t"><thead><tr><th>Market</th><th>Places</th><th>Traders</th><th>Factions and shops</th><th>Not normal</th><th></th></tr></thead><tbody>${rows || "<tr><td colspan='6'>No markets yet.</td></tr>"}</tbody></table></div>`,
    render: (ev, dialog) => {
      const el = dialog.element ?? dialog;
      el.querySelectorAll?.("button[data-market]").forEach(b => b.addEventListener("click", () => { picked = b.dataset.market; dialog.close(); }));
    },
    buttons: [{action: "add", label: "New market"}, ...(st.markets.length ? [{action: "week", label: "Run a week now"}, {action: "caravans", label: "Caravans"}, {action: "ventures", label: "Ventures"}] : []), {action: "close", label: "Close"}]});
  if ( picked ) return editMarket(picked);
  if ( res === "add" ) return editMarket(null);
  if ( res === "caravans" ) return game.modules.get(MOD)?.api?.upkeep?.caravans?.open?.();
  if ( res === "ventures" ) return game.modules.get(MOD)?.api?.upkeep?.ventures?.open?.();
  if ( res === "week" ) return game.modules.get(MOD)?.api?.upkeep?.marketTurn?.run?.({force: true, reason: "a week (run by hand)"});
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
