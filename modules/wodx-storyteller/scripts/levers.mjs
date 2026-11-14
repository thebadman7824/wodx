/**
 * Crisis levers for a region (B3524 to B3527): the Storyteller's window. Pick a region; each running system shows its
 * reading and a slider. Saving writes into each system's own record (outbreaks, hunter pressure, the region's Wyrm
 * spread rate, drift at every place in the region), dated, noted in the chronicle log (and so the Legends book), and
 * undoable from the same window. Rules in levers-rules.mjs.
 */
import {MOD, esc, setting, chron, log} from "./core.mjs";
import * as L from "./levers-rules.mjs";
import * as Contagion from "./contagion.mjs";
import * as Hunters from "./hunters.mjs";
import * as CR from "./contagion-rules.mjs";
import * as HR from "./hunters-rules.mjs";
import {addTool} from "./hand.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const NOT_A_PLACE = /battle ?map|\bcombat\b|\btest\b|\(gate/i;
const ow = () => game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds")?.api ?? null : null;
const now = () => game.time?.worldTime ?? 0;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const regions = () => { try { return chron()?.world?.regions ?? {}; } catch (e) { return {}; } };
const regionLabel = id => regions()[id]?.label ?? id;
const regionOfScene = s => { try { return chron()?.world?.here?.(s)?.id ?? null; } catch (e) { return null; } };
const homeland = () => { try { return chron()?.world?.homeland?.() || "moravia"; } catch (e) { return "moravia"; } };

export const state = () => L.normState(setting("leverState"));
const save = st => game.settings.set(MOD, "leverState", L.normState(st));

export function registerLeverSettings() {
  game.settings.register(MOD, "leverState", {scope: "world", config: false, type: Object, default: {regions: {}, log: []}});
}

/** Which systems are running. */
function running() {
  const o = ow();
  let wyrm = false;
  try { wyrm = !!o?.corruption && game.settings.get("wodx-otherworlds", "wyrmCorruption") !== "off"; } catch (e) { wyrm = false; }
  return {plague: Contagion.on(), hunters: setting("hunterPressure") !== false, wyrm, drift: !!o?.drift?.lever};
}

const scenesIn = region => game.scenes.filter(s => !NOT_A_PLACE.test(s.name ?? "") && regionOfScene(s) === region);
const outbreaksIn = region => Object.values(Contagion.state().towns).filter(o => o.region === region);

/** Each lever's reading for a region now. */
export function readings(region) {
  const st = state(), o = ow();
  const hunt = Hunters.state().regions[region];
  return {
    plague: L.valueOf(st, region, "plague"),
    wyrm: o?.corruption?.rateOf ? o.corruption.rateOf(region) : 1,
    hunters: hunt ? HR.cooled(hunt, now()).pressure : 0,
    gauntlet: L.valueOf(st, region, "gauntlet"),
    shroud: L.valueOf(st, region, "shroud"),
    banality: L.valueOf(st, region, "banality")
  };
}

/** Move one system from one value to another for a region; returns what was done, for the undo. */
async function apply(region, key, from, to, why) {
  if ( key === "plague" ) {
    const raw = foundry.utils.deepClone(setting("contagionState") ?? {});
    const ids = [];
    for ( const o of outbreaksIn(region) ) {
      const rec = raw.towns?.[o.market];
      if ( !rec ) continue;
      rec.attack = L.scaleAttack(CR.normOutbreak(rec)?.attack ?? rec.attack, from, to);
      ids.push(o.market);
    }
    if ( ids.length ) await game.settings.set(MOD, "contagionState", CR.normState(raw));
    return {towns: ids};
  }
  if ( key === "hunters" ) {
    await Hunters.add(region, "manual", {n: to - from, why: `The Storyteller's lever${why ? `: ${why}` : ""}`});
    return {};
  }
  if ( key === "wyrm" ) { await ow()?.corruption?.setRate?.(region, to); return {}; }
  const track = L.LEVERS[key]?.track;
  const taken = {};
  for ( const s of scenesIn(region) ) {
    const t = await ow()?.drift?.lever?.(s, track, to - from, `The Storyteller's lever${why ? `: ${why}` : ""}`);
    if ( t ) taken[s.id] = t;
  }
  return {taken};
}

/** Save a set of lever changes for a region. */
export async function setLevers(region, asked = {}, why = "") {
  if ( !game.user.isGM || !region ) return [];
  const keys = L.available(running(), {year: yearNow()}).map(a => a.key);
  const list = L.changes(readings(region), asked, keys);
  let st = state();
  for ( const c of list ) {
    const applied = await apply(region, c.key, c.from, c.to, why);
    const id = foundry.utils.randomID();
    st = L.record(st, {...c, region, at: now(), why, id, applied});
    await log({kind: "note", text: `${regionLabel(region)}: ${L.words({...c}, yearNow())}${why ? ` (${why})` : ""}.`});
  }
  if ( list.length ) await save(st);
  return list;
}

/** Undo the last open change for a region. */
export async function undoLast(region = null) {
  if ( !game.user.isGM ) return null;
  const e = L.lastOpen(state(), region);
  if ( !e ) return null;
  if ( e.key === "plague" ) {
    const raw = foundry.utils.deepClone(setting("contagionState") ?? {});
    for ( const m of e.applied?.towns ?? [] ) if ( raw.towns?.[m] ) raw.towns[m].attack = L.scaleAttack(raw.towns[m].attack, e.to, e.from);
    await game.settings.set(MOD, "contagionState", CR.normState(raw));
  } else if ( e.key === "hunters" ) await Hunters.add(e.region, "manual", {n: e.from - e.to, why: "The Storyteller's lever taken back"});
  else if ( e.key === "wyrm" ) await ow()?.corruption?.setRate?.(e.region, e.from);
  else {
    const track = L.LEVERS[e.key]?.track;
    for ( const [id, step] of Object.entries(e.applied?.taken ?? {}) ) { const s = game.scenes.get(id); if ( s ) await ow()?.drift?.lever?.(s, track, -step, "The Storyteller's lever taken back"); }
  }
  await save(L.markUndone(state(), e.id));
  await log({kind: "note", text: `${regionLabel(e.region)}: taken back, ${L.words(e, yearNow())}.`});
  return e;
}

/** The Levers window. */
export async function leversDialog(region = null) {
  if ( !game.user.isGM ) return;
  region ??= regionOfScene(canvas?.scene) ?? homeland();
  const rs = Object.entries(regions()).sort((a, b) => String(a[1]?.label ?? a[0]).localeCompare(String(b[1]?.label ?? b[0])));
  const avail = L.available(running(), {year: yearNow()});
  const cur = readings(region);
  const opts = rs.map(([id, r]) => `<option value="${esc(id)}"${id === region ? " selected" : ""}>${esc(r?.label ?? id)}</option>`).join("");
  const fmt = (a, v) => (a.unit === "shift" ? `${v > 0 ? "+" : ""}${v}` : a.unit === "times" ? `${v} times` : `${v}`);
  const extra = {plague: `${outbreaksIn(region).length} town${outbreaksIn(region).length === 1 ? "" : "s"} sick now`,
    hunters: (() => { try { return HR.stageOf(cur.hunters).name; } catch (e) { return ""; } })(),
    gauntlet: `${scenesIn(region).length} place${scenesIn(region).length === 1 ? "" : "s"} in the region`};
  const rows = avail.map(a => `<div class="form-group"><label for="wst-lever-${a.key}">${esc(a.label)}</label><div class="form-fields">
      <input type="range" id="wst-lever-${a.key}" name="${a.key}" min="${a.min}" max="${a.max}" step="${a.step}" value="${cur[a.key]}" oninput="this.nextElementSibling.textContent=this.value">
      <span class="wst-lever-v">${cur[a.key]}</span></div>
      <p class="hint">Now ${esc(fmt(a, cur[a.key]))}${extra[a.key] ? `; ${esc(extra[a.key])}` : ""}.</p></div>`).join("");
  const past = state().log.filter(e => e.region === region).slice(-8).reverse()
    .map(e => `<li${e.undone ? " class=\"wodx-quiet\"" : ""}>${esc(L.words(e, yearNow()))}${e.why ? ` (${esc(e.why)})` : ""}${e.undone ? ", taken back" : ""}</li>`).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 520}, window: {title: `Crisis levers: ${regionLabel(region)}`},
    classes: ["wodx-dialog", "wst-levers"],
    content: `<div class="form-group"><label>Region</label><select name="region" data-fixed>${opts}</select></div>
      ${rows || `<p class="wodx-quiet">No system that has a lever is running. Turn on sickness, hunters, Wyrm corruption or WoDX Otherworlds.</p>`}
      <div class="form-group"><label>Why</label><input type="text" name="why" maxlength="200" placeholder="Optional, for the log"></div>
      <p class="hint">Each slider writes into that system's own record for this region; nothing new runs. Every change goes in the chronicle log and can be taken back here.</p>
      ${past ? `<details><summary>Changes here</summary><ul class="wodx-list">${past}</ul></details>` : ""}`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => ({act: "save", ...Object.fromEntries(new FormData(b.form))})},
      {action: "region", label: "Show the chosen region", callback: (ev, b) => ({act: "region", region: b.form.elements.region.value})},
      {action: "undo", label: "Take back the last change", callback: () => ({act: "undo"})},
      {action: "cancel", label: "Close"}]});
  if ( !res || typeof res !== "object" ) return;
  if ( res.act === "region" ) return leversDialog(res.region);
  if ( res.act === "undo" ) { const e = await undoLast(region); ui.notifications.info(e ? "The last change is taken back." : "Nothing to take back here."); return leversDialog(region); }
  if ( res.region && res.region !== region ) return leversDialog(res.region);
  const asked = Object.fromEntries(avail.map(a => [a.key, res[a.key]]));
  const done = await setLevers(region, asked, String(res.why ?? "").trim());
  ui.notifications.info(done.length ? `${done.length} lever${done.length === 1 ? "" : "s"} moved in ${regionLabel(region)}.` : "Nothing changed.");
}

export function registerLeverTools() {
  addTool({key: "levers", label: "Crisis levers for a region", icon: "fa-sliders", run: () => leversDialog()});
}

export const api = () => ({open: leversDialog, readings, set: setLevers, undo: undoLast, state, rules: L});
