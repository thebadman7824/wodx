/**
 * WoDX Interactables 0.17.0 (0.20.0: a first guess of place from where it sits): fill a container by place and era. The rules are in fill-rules.mjs.
 *
 * Storyteller only, and only when asked: a button in the tile's config window ("Fill by place and era…") reads the
 * index of WoDX Library's compendium "WoDX · Gear by era", draws for the chronicle's era, and shows the draw to keep,
 * drop or draw again. What is kept is added to the container's "Inside" list as compendium links; nothing is saved
 * until the config window is saved. Nothing runs on players' machines.
 * 0.21.0: everyday goods by era (WoDX Library's data/goods.mjs: food, tools, cloth, coin, papers and the like) join the
 * draw as plain lines of text. The Storyteller picks gear, goods or both; goods alone work without Gear by era.
 * 0.36.0: goods follow the scene's region and way of life in the chronicle's year (WoDX Chronicle and Library), and
 * the coin of the place is named in the local money (WoDX Storyteller). Each module stays optional.
 */
import * as F from "./fill-rules.mjs";

const MOD = "wodx-interactables";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const eraNow = () => game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null;
const eraName = id => game.modules.get("wodx-chronicle")?.api?.eras?.getProfile?.(id)?.name ?? id ?? "any era";
const opt = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v.label ?? v)}</option>`).join("");

const NPC = "wodx-npc";
const regionEl = r => { const e = r?.elevation?.bottom; return Number.isFinite(e) ? e : 0; };
const inRegion = (r, p) => { try { return !!r.testPoint({x: p.x, y: p.y, elevation: regionEl(r)}, regionEl(r)); } catch (e) { return false; } };
const areaOf = r => (r?.shapes ?? []).reduce((s, sh) => s + (Number(sh.width) || Number(sh.radiusX) * 2 || 1) * (Number(sh.height) || Number(sh.radiusY) * 2 || 1), 0) || Infinity;

/**
 * Where a container sits, as the fill's first guess: {place, from, name}. Reads WoDX NPC's place tags straight from
 * the flags, so it works with WoDX NPC off.
 */
export function guessFor(tile, own = undefined) {
  const scene = tile?.parent ?? canvas?.scene;
  const c = {x: (Number(tile?.x) || 0) + (Number(tile?.width) || 0) / 2, y: (Number(tile?.y) || 0) + (Number(tile?.height) || 0) / 2};
  const regions = [...(scene?.regions?.contents ?? [])].filter(r => r.flags?.[NPC]?.place?.kind && inRegion(r, c)).sort((a, b) => areaOf(a) - areaOf(b));
  const g = F.placeGuess({own: own === undefined ? tile?.flags?.[MOD]?.fillPlace : own, regions: regions.map(r => r.flags[NPC].place.kind), scene: scene?.flags?.[NPC]?.place?.kind});
  const name = g.from === "region" ? regions.find(r => F.FROM_NPC_PLACE[r.flags[NPC].place.kind])?.name : g.from === "scene" ? scene?.name : null;
  return {...g, name: name ?? null};
}

/** The gear compendium's index, as plain items with their links. Empty when WoDX Library has not made it. */
export async function gearIndex() {
  const pack = game.packs.get("world.wodx-gear") ?? game.packs.find(p => p.metadata?.name === "wodx-gear");
  if ( !pack ) return [];
  const idx = await pack.getIndex({fields: ["flags.wodx-library", "system.conceal", "type"]});
  return [...idx].map(e => ({name: e.name, type: e.type, uuid: e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}`, flags: e.flags ?? {}, system: e.system ?? {}}));
}

/** Everyday goods from WoDX Library: {goods, weights, inUse}, empty when WoDX Library is off or too old. */
export async function goodsData() {
  if ( !game.modules.get("wodx-library")?.active ) return {goods: [], weights: null, inUse: null};
  try {
    const m = await import("../../wodx-library/data/goods.mjs");
    return {goods: m.GOODS ?? [], weights: m.PLACE_WEIGHTS ?? null, inUse: typeof m.inUseAt === "function" ? m.inUseAt : null};
  } catch (e) { return {goods: [], weights: null, inUse: null}; }
}

/**
 * 0.36.0: where a scene stands. {year, region, regionLabel, way, wayLabel, money} from WoDX Chronicle (its region, or
 * the homeland), or nulls when Chronicle is off; the fill then draws by era alone, as before.
 */
export function whereFor(scene = canvas?.scene) {
  const chron = game.modules.get("wodx-chronicle")?.api;
  const out = {year: null, region: null, regionLabel: null, way: null, wayLabel: null, money: null};
  try {
    out.year = Number(chron?.eras?.currentYear?.()) || null;
    const r = chron?.world?.here?.(scene);
    if ( r?.id ) Object.assign(out, {region: r.id, regionLabel: r.label ?? r.id, money: r.money ?? null});
    const rules = chron?.world?.rules;
    if ( out.region && out.year !== null && typeof rules?.sphereFor === "function" ) {
      out.way = rules.sphereFor(out.region, out.year);
      out.wayLabel = rules.SPHERES?.[out.way] ?? out.way;
    }
  } catch (e) { /* Chronicle too old: by era alone */ }
  return out;
}

/** 0.36.0: names n coins of the local money (WoDX Storyteller), or null when Storyteller is off. */
export async function coinNamer(where) {
  if ( !game.modules.get("wodx-storyteller")?.active || !where?.money || where.year === null ) return null;
  try {
    const M = await import("../../wodx-storyteller/scripts/money-rules.mjs");
    const L = await import("../../wodx-library/data/goods-ways.mjs");
    const m = M.moneyFor(where.year, where.money);
    // A land that trades without coin has no coin of the place to find
    if ( m?.id === "barter" ) return () => null;
    return n => L.localCoinLine(m?.units, n);
  } catch (e) { return null; }
}

/**
 * Draw for a container. opts: {place, count, era, container, items, rng, scene, where}. Returns the drawn items.
 * 0.40.0: gear follows the scene's region and way of life in the chronicle's year (where, or whereFor(scene)).
 */
export async function drawFor(opts = {}) {
  const items = opts.items ?? await gearIndex();
  const where = opts.where ?? whereFor(opts.scene ?? globalThis.canvas?.scene);
  return F.draw(items, {era: opts.era === undefined ? eraNow() : opts.era, place: opts.place, container: opts.container, count: opts.count, rng: opts.rng,
    year: where?.year ?? null, way: where?.way ?? null, region: where?.region ?? null});
}

/**
 * The Storyteller's window. tile: the TileDocument; field: the "Inside" textarea of an open config window, which
 * gets the kept lines (else they go straight on the tile). Returns the links kept, or null.
 */
export async function fillDialog(tile, field = null) {
  if ( !game.user.isGM ) return null;
  const items = await gearIndex();
  let {goods, weights, inUse} = await goodsData();
  const where = whereFor(tile?.parent ?? canvas?.scene);
  const coin = await coinNamer(where);
  const barter = coin && coin(3) === null;
  if ( barter ) goods = goods.filter(g => !g.localCoin);
  if ( !items.length && !goods.length ) { ui.notifications.warn("Gear by era isn't installed yet. Open Gear by era once (WoDX Library) and try again."); return null; }
  const whatSel = !items.length ? "goods" : !goods.length ? "gear" : "both";
  const container = field?.form?.querySelector?.(`[name="flags.${MOD}.kind"]`)?.value ?? tile?.flags?.[MOD]?.kind ?? "chest";
  const era = eraNow();
  const formPlace = field?.form?.querySelector?.(`[name="flags.${MOD}.fillPlace"]`)?.value;
  const guess = guessFor(tile, formPlace === undefined ? undefined : formPlace || null);
  const ask = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 460}, window: {title: "Fill by place and era"}, classes: ["wodx-dialog", "wix-fill"],
    content: `<p>Draws for ${esc(eraName(era))}${where.way ? `, ${esc(where.regionLabel)} (${esc(where.wayLabel)})` : ""}. You see the draw before anything goes in.</p>
      <div class="form-group"><label>Draw from</label><select name="what" data-fixed>${opt(whatSel === "both" ? F.WHAT : {[whatSel]: F.WHAT[whatSel]}, whatSel)}</select></div>
      <div class="form-group"><label>The place</label><select name="place" data-fixed>${opt(F.PLACES, guess.place)}</select></div>
      ${guess.from ? `<p class="hint">${esc(guess.from === "own" ? "Set for this container." : `From where it sits: ${guess.name ?? "this scene"}.`)} Change it if it doesn't fit.</p>` : ""}
      <div class="form-group"><label>How many things</label><input type="number" name="count" value="3" min="1" max="12"></div>
      ${F.SMALL.has(container) ? "<p class=\"hint\">A small container: only what hides in a coat or smaller.</p>" : ""}`,
    buttons: [{action: "draw", label: "Draw", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !ask || ask === "cancel" ) return null;
  for ( let tries = 0; tries < 20; tries++ ) {
    const got = F.drawMixed({items, goods, weights, what: ask.what ?? whatSel, era, place: ask.place, container, count: Number(ask.count) || 3,
      year: where.year, way: where.way, region: where.region, inUse, coin});
    if ( !got.length ) { ui.notifications.info("Nothing fits that place and era."); return null; }
    const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 520}, window: {title: "The draw"}, classes: ["wodx-dialog", "wix-fill-review"],
      content: `<p>Untick what doesn't belong here.</p><ul class="wix-fill-list" data-fixed>${got.map((g, i) => `<li><label><input type="checkbox" name="k${i}" checked> ${esc(g.name)}${g.goods ? "" : " <span class=\"hint\">(gear)</span>"}</label></li>`).join("")}</ul>`,
      buttons: [{action: "keep", label: "Put these in", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "again", label: "Draw again"}, {action: "cancel", label: "Cancel"}]});
    if ( res === "again" ) continue;
    if ( !res || res === "cancel" ) return null;
    const kept = got.filter((g, i) => res[`k${i}`]).map(g => g.line);
    if ( !kept.length ) return [];
    if ( field ) field.value = F.mergeLines(field.value, kept);
    else if ( tile ) await tile.update({[`flags.${MOD}.items`]: F.mergeLines(tile.flags?.[MOD]?.items, kept)});
    return kept;
  }
  return null;
}
