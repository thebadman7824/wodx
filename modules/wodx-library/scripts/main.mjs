import * as G from "./gear-rules.mjs";
import * as Sh from "./shelves.mjs";
import * as SR from "./shelf-rules.mjs";
import {setupExamine, examineApi} from "./examine.mjs";
import {setupUse, useApi} from "./use.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import * as Reg from "./wonder-registry.mjs";
import "./wonder-lines.mjs";

/**
 * WoDX Library: gear by era. The weapons, armor and cyberware of each era's books (with their pages), in a world
 * compendium "WoDX · Gear by era" and in the Gear window, which shows what fits the chronicle's era and hands
 * it to the selected characters.
 */

const MOD = G.MOD;
const PACK_NAME = "wodx-gear";
const PACK_LABEL = "WoDX · Gear by era";
export const VERSION = "0.27.0";
const ApplicationV2 = foundry.applications.api.ApplicationV2;
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

let DATA = null;
/** The data, given directly (the tests and the UI fit check). */
export function setGear(d) { DATA = d; }
export async function gear() {
  if ( DATA ) return DATA;
  const r = await fetch(`modules/${MOD}/data/gear.json`);
  DATA = r.ok ? await r.json() : {version: 0, items: []};
  return DATA;
}

const eraNow = () => game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null;
/**
 * 0.21.0 (B3073): where the scene stands, as WoDX Chronicle has it: {year, region, regionLabel, way, wayLabel}, or
 * null when Chronicle is off or names no region.
 */
export function whereNow(scene = globalThis.canvas?.scene) {
  try {
    const chron = game.modules.get("wodx-chronicle")?.api;
    const year = Number(chron?.eras?.currentYear?.()) || null;
    const r = chron?.world?.here?.(scene);
    const rules = chron?.world?.rules;
    if ( !r?.id || year === null || typeof rules?.sphereFor !== "function" ) return null;
    const way = rules.sphereFor(r.id, year);
    return {year, region: r.id, regionLabel: r.label ?? r.id, way, wayLabel: rules.SPHERES?.[way] ?? way};
  } catch (e) { return null; }
}
const eraName = id => game.modules.get("wodx-chronicle")?.api?.eras?.getProfile?.(id)?.name ?? id;

/** Fill or refresh the compendium from the data: items are matched by name and source, never deleted. */
export async function installPack() {
  if ( !game.user.isGM ) return null;
  const data = await gear();
  const CC = foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
  // Made once: found by its name in the world's packs, so a second start never tries to make it again
  const find = () => game.packs.get(`world.${PACK_NAME}`) ?? game.packs.find(p => p.metadata?.name === PACK_NAME && p.metadata?.packageType === "world");
  let pack = find();
  if ( !pack ) {
    try { pack = await CC.createCompendium({type: "Item", label: PACK_LABEL, name: PACK_NAME}); }
    catch (err) { pack = find(); if ( !pack ) throw err; }
  }
  const docs = await pack.getDocuments();
  const keyOf = d => `${d.flags?.[MOD]?.source}|${d.name}`;
  const have = new Map(docs.map(d => [keyOf(d), d]));
  const create = [], update = [];
  for ( const it of data.items ) {
    const d = have.get(keyOf(it));
    if ( !d ) create.push(it);
    else update.push({_id: d.id, system: it.system, flags: it.flags});
  }
  if ( create.length ) await Item.createDocuments(create, {pack: pack.collection});
  if ( update.length ) await Item.updateDocuments(update, {pack: pack.collection});
  await game.settings.set(MOD, "installed", data.version);
  return {pack, created: create.length, updated: update.length};
}

/** Give gear to actors: a copy of each item, as the book has it. */
export async function give(actors, names) {
  const data = await gear();
  const picks = names.map(n => data.items.find(i => `${i.flags[MOD].source}|${i.name}` === n)).filter(Boolean);
  const out = [];
  for ( const a of actors ) {
    if ( !a?.isOwner ) continue;
    out.push(...await a.createEmbeddedDocuments("Item", picks.map(p => foundry.utils.deepClone(p))));
  }
  return out;
}

export class GearApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-gear",
    classes: ["wodx", "wodx-gear"],
    window: {title: "Gear by era", icon: "fa-solid fa-khanda", resizable: true},
    position: {width: 640, height: 640},
    actions: {give: GearApp.#onGive, install: GearApp.#onInstall}
  };

  static #instance;
  era = null;
  /** 0.21.0: "here" (where the scene stands, the default) or "all" (every land) */
  lands = "here";
  static open(era) {
    this.#instance ??= new GearApp();
    if ( era !== undefined ) this.#instance.era = era;
    return this.#instance.render({force: true});
  }

  async _renderHTML() {
    const data = await gear();
    const era = this.era ?? eraNow() ?? "dark-ages";
    const here = whereNow();
    const local = this.lands !== "all" && here;
    const list = G.forEra(data.items, era, local ? here : null);
    const kind = {"Melee Weapon": "Melee", "Ranged Weapon": "Ranged", Armor: "Armor", Item: "Other"};
    const rows = list.map(i => {
      const f = i.flags[MOD], k = `${f.source}|${i.name}`;
      const extra = [f.surgery ? `surgery ${f.surgery}` : "", f.humanity ? `Humanity cost ${f.humanity}` : ""].filter(Boolean).join(", ");
      return `<li class="wodx-gear-row" data-search-text="${esc(`${i.name} ${kind[i.type]} ${G.SOURCES[f.source].short}${f.like ? ` ${f.like}` : ""}`)}">
        <label><input type="checkbox" name="pick" value="${esc(k)}"> <b>${esc(i.name)}</b></label>
        <span class="wodx-gear-kind">${kind[i.type]}</span> <span>${esc(G.summary(i))}${extra ? ` ${esc(extra)}` : ""}</span>
        <span class="wodx-quiet">${f.like ? `as the ${esc(f.like.replace(/, thrown$/, ""))}, ` : ""}${esc(G.SOURCES[f.source].short)}, ${esc(f.page)}</span></li>`;
    }).join("");
    const eras = G.ERA_ORDER.map(id => `<option value="${id}" ${id === era ? "selected" : ""}>${esc(eraName(id))}</option>`).join("");
    const sel = globalThis.canvas?.tokens?.controlled?.filter(t => t.actor?.isOwner).map(t => t.actor.name) ?? [];
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<div class="wodx-top">
        <div class="form-group"><label>Era</label><div class="form-fields"><select name="era" data-fixed aria-label="Era">${eras}</select></div></div>
        ${here ? `<div class="form-group"><label>Lands</label><div class="form-fields"><select name="lands" data-fixed aria-label="Lands">
          <option value="here" ${local ? "selected" : ""}>${esc(here.regionLabel)} in ${here.year}</option>
          <option value="all" ${local ? "" : "selected"}>Every land</option></select></div></div>` : ""}
        ${searchBox("ul.wodx-gear-list", "Search gear…", "Search gear")}
        <p class="hint">${list.length} items for this era${local ? `, as found in ${esc(here.regionLabel)}` : ""}, from its books. Tick what to give, select the characters' tokens, then press Give.</p></div>
      <ul class="wodx-scroll wodx-gear-list">${rows || `<li class="wodx-quiet">Nothing for this era yet.</li>`}</ul>
      <footer class="form-footer wodx-footer">
        <button type="button" data-action="give"><i class="fa-solid fa-hand-holding"></i> Give to ${sel.length ? esc(sel.join(", ")) : "the selected tokens"}</button>
        ${game.user.isGM ? `<button type="button" data-action="install"><i class="fa-solid fa-book"></i> Refresh the compendium</button>` : ""}</footer>`;
    div.querySelector("select[name=era]").addEventListener("change", ev => { this.era = ev.target.value; this.render(); });
    div.querySelector("select[name=lands]")?.addEventListener("change", ev => { this.lands = ev.target.value; this.render(); });
    return div;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onGive() {
    const names = [...this.element.querySelectorAll("input[name=pick]:checked")].map(x => x.value);
    const actors = (globalThis.canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(a => a?.isOwner);
    if ( !names.length ) return ui.notifications.warn("Tick the gear to give first.");
    if ( !actors.length ) return ui.notifications.warn("Select the tokens of the characters to give it to.");
    const made = await give(actors, names);
    ui.notifications.info(`Gave ${names.length} item(s) to ${actors.map(a => a.name).join(", ")}.`);
    return made;
  }

  static async #onInstall() {
    const r = await installPack();
    if ( r ) ui.notifications.info(`${PACK_LABEL}: ${r.created} added, ${r.updated} brought up to date.`);
  }
}

Hooks.once("init", () => {
  game.settings.register(MOD, "installed", {scope: "world", config: false, type: Number, default: 0});
  game.settings.register(MOD, "shelves", {scope: "world", config: false, type: Number, default: 0});
  // B3635: making each line's supernatural items, one switch per line (on in the testbed; Live waits for Ben)
  // B3683: each registered line's kit names its own switch (wonder-lines.mjs)
  for ( const k of Reg.lines() ) if ( k.setting ) game.settings.register(MOD, k.setting, {name: k.settingName || `Making items (${k.title})`,
    hint: k.settingHint || "", scope: "world", config: true, type: Boolean, default: k.settingDefault !== false});
  game.settings.register(MOD, "craftKinfolk", {name: "Kinfolk with Gnosis may make fetishes and talens (house rule)",
    hint: "The books say Kinfolk cannot make fetishes (W20 Kinfolk; Hammer and Klaive). Turn this on to let Kinfolk with Gnosis who know the rite make them anyway.",
    scope: "world", config: true, type: Boolean, default: false});
  game.settings.registerMenu(MOD, "gearMenu", {
    name: "Gear by era", label: "Open gear by era",
    hint: "Weapons, armor and cyberware from each era's books, with their pages. Give them to characters, or browse the compendium.",
    icon: "fa-solid fa-khanda", type: GearApp, restricted: false
  });
});

Hooks.once("ready", async () => {
  game.modules.get(MOD).api = {version: VERSION, rules: G, gear, installPack, give, open: era => GearApp.open(era),
    library: {open: () => Sh.LibraryApp.open(), install: Sh.installShelves, catalogue: Sh.catalogue, rules: SR},
    manual: {open: Sh.openManual, ensure: Sh.ensureManual, page: Sh.openManualPage}, glossary: {open: Sh.openGlossary, ensure: Sh.ensureGlossary}, changelog: {open: Sh.openChangelog, ensure: Sh.ensureChangelog}};
  try { await setupExamine(); game.modules.get(MOD).api.examine = examineApi(); } catch (err) { console.warn("WoDX Library | Examine could not start", err); }
  try { await setupUse(); game.modules.get(MOD).api.use = useApi(); } catch (err) { console.warn("WoDX Library | Use could not start", err); }
  // B3690: powers, pools and worn bonuses of made supernatural items (wonder-use.mjs)
  try { const Wu = await import("./wonder-use.mjs"); Wu.setupWonderUse(); game.modules.get(MOD).api.wonderUse = Wu.wonderUseApi(); } catch (err) { console.warn("WoDX Library | item powers could not start", err); }
  // 0.14.0: the look of a character, for NPC first meetings, talk lines and guards
  try { const Lk = await import("./look.mjs"); await Lk.setupLook(); game.modules.get(MOD).api.look = Lk.api(); } catch (err) { console.warn("WoDX Library | the look could not start", err); }
  // 0.10.0: recipes for food, drink, medicine and drugs (the window is Storyteller's Cook, brew or mix)
  try { const Kn = await import("./know.mjs"); game.modules.get(MOD).api.know = Kn.setupKnow(); } catch (err) { console.warn("WoDX Library | What they could know could not start", err); }
  // B3630: the supernatural items each line can make (Storyteller's long tasks run the work)
  try { const Wr = await import("./wonder-rules.mjs"); game.modules.get(MOD).api.wonders = {...Wr, registerLine: Reg.registerLine, kitFor: Reg.kitFor, lines: Reg.lines, rowOf: Reg.rowOf, applyCosts: Reg.applyCosts,
    settingOf: key => { try { return game.settings.get(MOD, key); } catch (e) { return undefined; } }, kinfolkMay: () => { try { return !!game.settings.get(MOD, "craftKinfolk"); } catch (e) { return false; } }, enabled: line => { const k = Reg.kitFor(line)?.setting ?? Wr.LINES[line]?.setting; try { return !!k && !!game.settings.get(MOD, k); } catch (e) { return false; } }}; } catch (err) { console.warn("WoDX Library | supernatural items could not load", err); }
  try { game.modules.get(MOD).api.recipes = await import("./recipe-rules.mjs"); } catch (err) { console.warn("WoDX Library | recipes could not load", err); }
  if ( game.user.isGM && game.users.activeGM?.isSelf ) {
    const data = await gear();
    const have = game.packs.get(`world.${PACK_NAME}`) ?? game.packs.find(p => p.metadata?.name === PACK_NAME && p.metadata?.packageType === "world");
    if ( game.settings.get(MOD, "installed") < data.version || !have ) {
      try { await installPack(); } catch (err) { console.warn("WoDX Library | The gear compendium could not be made", err); }
    }
    if ( game.settings.get(MOD, "shelves") < Sh.SHELF_VERSION ) {
      try { await Sh.installShelves(); } catch (err) { console.warn("WoDX Library | The shelves could not be made", err); }
    }
    try { await Sh.ensureManual(); await Sh.ensureChangelog(); await Sh.ensureGlossary(); } catch (err) { console.warn("WoDX Library | The manual could not be made", err); }
  }
});

Hooks.on("getSceneControlButtons", controls => {
  const tokens = controls.tokens ?? controls.find?.(c => c.name === "token");
  if ( !tokens?.tools ) return;
  tokens.tools.wodxLibrary = {name: "wodxLibrary", title: "The Library (how to use WoDX, what's new, powers, rules and eras)", icon: "fa-solid fa-book-atlas", order: 116, button: true, visible: true, onChange: () => Sh.LibraryApp.open()};
  tokens.tools.wodxGear = {name: "wodxGear", title: "Gear by era", icon: "fa-solid fa-khanda", order: 115, button: true, visible: true, onChange: () => GearApp.open()};
});
