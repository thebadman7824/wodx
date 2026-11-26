/**
 * WoDX Creation: what a character carries (the owner's desk picks of 26 Nov). The rules are kit-rules.mjs.
 *
 *   Starting kit (inv1)   the wizard's "What they carry" page: a suggested kit from the station, the land and the
 *                         Abilities, bought out of a month of the Resources allowance; the leftover goes to the purse.
 *   NPC things (inv2)     the first time someone deals with an NPC who carries nothing, the Storyteller's computer
 *                         gives them the kit of their station and land, cut to what their purse allows, and keeps it.
 *                         Off-screen life (purses, shop tills, the fates of time jumps) runs on coin and never reads
 *                         what an NPC holds, so making the things at first meeting changes nothing that went before.
 */
import * as K from "./kit-rules.mjs";
import {MODULE_ID} from "./actor-data.mjs";

const LIB = "wodx-library";
const SOCKET = `module.${MODULE_ID}`;
const chron = () => (game.modules.get("wodx-chronicle")?.active ? game.modules.get("wodx-chronicle").api : null);
const st = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
const money = () => st()?.upkeep?.money ?? null;
const num = v => Number(v) || 0;

/** The Library's goods, ways, tags and gear, loaded once. */
let DATA = null, LOADED = null;
export function loadKit() {
  return DATA ??= Promise.all([
    import("../../wodx-library/data/goods.mjs"), import("../../wodx-library/data/goods-ways.mjs"), import("../../wodx-library/data/goods-tags.mjs"),
    import("../../wodx-library/scripts/gear-rules.mjs"),
    fetch(`modules/${LIB}/data/gear.json`).then(r => (r.ok ? r.json() : {items: []})).catch(() => ({items: []}))
  ]).then(([G, W, T, GR, gear]) => (LOADED = {goods: G.GOODS ?? [], ways: W, tags: T, gearRules: GR, gear: gear?.items ?? []}))
    .catch(e => { console.warn(`${MODULE_ID} | kit data`, e); DATA = null; return null; });
}
export const kitLoaded = () => LOADED;

const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const eraNow = () => { try { return chron()?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } };
/** Where the character comes from: the chronicle's homeland region, and that region's way of life this year. */
export function homePlace(year = yearNow()) {
  let region = "";
  try { region = chron()?.chronicle?.current?.()?.manifest?.homeland || chron()?.world?.homeland?.() || ""; } catch (e) { region = ""; }
  let way = null;
  try { way = region ? chron()?.world?.rules?.sphereFor?.(region, year) ?? null : null; } catch (e) { way = null; }
  return {region: region || null, way};
}
/** The Resources dots on a sheet, through WoDX Storyteller where it is on. */
const resourcesOf = a => { try { return num(money()?.of?.(a)?.dots); } catch (e) { return num(a?.system?.backgrounds?.resources?.value); } };
const abilitiesOf = a => {
  const out = {};
  for ( const [k, v] of Object.entries(a?.system?.abilities ?? {}) ) out[k] = num(v?.value ?? v);
  return out;
};

/** A price in the purse's smallest unit: goods through the market price, gear by a tier for its station (house rule). */
function priceFor(row, D) {
  const ms = money();
  if ( !ms?.priceSync ) return 0;
  if ( row?.type && D ) {
    const s = D.tags.gearStationOf?.(row.name) ?? null;
    const tier = s?.includes("n") || s?.includes("noble") ? 4 : s?.includes("w") || s?.includes("well-off") ? 3 : 2;
    return num(ms.priceSync({id: `gear-${row.name}`, name: row.name, kind: "arms", value: tier, values: {}})?.each);
  }
  return num(ms.priceSync(row)?.each);
}

/** The suggested kit for a sheet: {rows, budget, station, place, money}. Needs loadKit() first. */
export function kitFor(actor, {seed = null} = {}) {
  const D = LOADED;
  if ( !D || !actor ) return null;
  const year = yearNow(), place = homePlace(year);
  const dots = resourcesOf(actor), station = K.stationFor(dots);
  const inUse = g => D.ways.inUseAt(g, year, place);
  const eraGear = D.gearRules.forEra?.(D.gear, eraNow(), place.region ? {year, ...place} : null) ?? D.gear;
  const rows = K.suggestKit({goods: D.goods, gear: eraGear, inUse, price: r => priceFor(r, D), station, abilities: abilitiesOf(actor),
    gearStation: n => D.tags.gearStationOf?.(n) ?? null, seed: seed ?? actor.id ?? actor.name});
  let monthly = 0;
  try {
    const R = money()?.rules;
    monthly = R?.allowance ? R.allowance(dots, year, game.settings.get("wodx-storyteller", "moneyRegion") || "moravian") : 0;
  } catch (e) { monthly = 0; }
  return {rows, budget: K.budgetFrom(monthly), station, place, dots, year};
}

/** A price in words, in the money of the chronicle. */
export const priceText = amount => { try { return money()?.format?.(amount) ?? String(amount); } catch (e) { return String(amount); } };

/** Every good on sale there (for the "add something" list), cheapest first: [{key, name, kind, price, good}]. */
export function shopList(actor) {
  const D = LOADED;
  if ( !D ) return [];
  const year = yearNow(), place = homePlace(year), station = K.stationFor(resourcesOf(actor));
  const KINDS = new Set(["cloth", "tools", "light", "containers", "travel", "arms", "medicine", "faith", "papers", "hygiene", "kitchen", "food", "drink"]);
  return D.goods.filter(g => KINDS.has(g.kind) && D.ways.inUseAt(g, year, place) && K.suits(g.station, station === "p" ? "c" : station))
    .map(g => ({key: `good:${g.id}`, name: g.name, kind: g.kind, from: "good", good: g, price: priceFor(g, D), free: false, why: "bought"}))
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)).slice(0, 400);
}

/** Give the chosen rows to the character, and the leftover budget to the purse. Marks the kit taken. */
export async function takeKit(actor, rows, budget) {
  if ( !actor?.isOwner || actor.getFlag(MODULE_ID, "kit")?.taken ) return null;
  const t = K.tally(rows, budget);
  if ( t.over ) { ui.notifications.warn("That costs more than the budget. Take something back."); return null; }
  const data = rows.map(r => K.itemData(r, {LIB}));
  if ( data.length ) await actor.createEmbeddedDocuments("Item", data);
  if ( t.left > 0 ) await money()?.receive?.(actor, t.left, {note: "What was left of the starting budget"});
  await actor.setFlag(MODULE_ID, "kit", {taken: true, at: Date.now(), spent: t.spent, left: t.left, count: data.length});
  return {count: data.length, ...t};
}

/* ---------------------------------------------------------------- NPC things on first meeting (inv2) */

const carries = a => [...(a?.items ?? [])].some(i => ["Item", "Melee Weapon", "Ranged Weapon", "Armor"].includes(i.type) && !i.system?.isnatural);
const isNPC = a => !!a && !a.hasPlayerOwner;

/** Fill an NPC who carries nothing, once. On a player's computer the Storyteller's does it. */
export async function ensureKit(npc) {
  if ( !isNPC(npc) || npc.getFlag?.(MODULE_ID, "kit")?.taken || carries(npc) ) return false;
  if ( !game.user.isGM ) {
    if ( game.users.some(u => u.isGM && u.active) ) game.socket.emit(SOCKET, {type: "kit.npc", payload: {actor: npc.uuid}});
    return false;
  }
  if ( game.users.activeGM?.id !== game.user.id ) return false;
  await loadKit();
  const k = kitFor(npc);
  if ( !k ) return false;
  let purse = null, wage = 0;
  try {
    const p = money()?.purse?.(npc);
    if ( p ) purse = num(p.carried);
    wage = num(money()?.rules?.wageAt?.(k.year, game.settings.get("wodx-storyteller", "moneyRegion") || "moravian"));
  } catch (e) { purse = null; }
  const rows = K.npcKit(k.rows, {purse, wage});
  if ( rows.length ) await npc.createEmbeddedDocuments("Item", rows.map(r => K.itemData(r, {LIB, by: "first meeting"})));
  await npc.setFlag(MODULE_ID, "kit", {taken: true, at: Date.now(), count: rows.length, npc: true});
  return true;
}
export async function onKitRequest(payload) {
  if ( !game.user.isGM || game.users.activeGM?.id !== game.user.id ) return;
  const a = await fromUuid(payload?.actor ?? "").catch(() => null);
  const actor = a?.actor ?? a;
  if ( actor ) await ensureKit(actor);
}
