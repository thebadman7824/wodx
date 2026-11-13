/**
 * WoDX Otherworlds 0.21.0 (B2556 to B2559): the realm world maps window. The Storyteller picks a realm past the
 * near worlds and reads its coarse map: the places found so far, a journey between two of them with its time, and
 * a closer look at one square. "Found places" marks what the chronicle has found; "A new visit" makes the map anew
 * for the realms that change on every visit. It reads and draws only, but for the world setting "realmWorlds" (the
 * found places and the visit counts). The rules are in realm-worlds-rules.mjs.
 */
import * as RW from "./realm-worlds-rules.mjs";
import {REALMS, LINES} from "./realm-maps-rules.mjs";
import {MODULE_ID} from "./ratings.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1999; } catch (e) { return 1999; } };
const future = () => { try { return !!chron()?.rule?.("futureBranch"); } catch (e) { return false; } };
const img = (svg, alt) => `<img class="wow-realm-world" alt="${esc(alt)}" style="display:block;width:100%;height:auto;border:0" src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}">`;
const LINE_WORDS = {werewolf: "Werewolf", mage: "Mage", wraith: "Wraith", vampire: "Vampire", changeling: "Changeling", "kuei-jin": "Kuei-jin", mummy: "Mummy", demon: "Demon"};

export function registerRealmWorldSettings() {
  game.settings.register(MODULE_ID, "realmWorlds", {scope: "world", config: false, type: Object, default: {found: {}, visits: {}}});
}
const store = () => { const s = game.settings.get(MODULE_ID, "realmWorlds") ?? {}; return {found: {...(s.found ?? {})}, visits: {...(s.visits ?? {})}}; };
/** How many times the chronicle has made a new visit to a realm whose map changes on every visit. */
export const visits = id => Math.max(0, Math.round(Number(store().visits[id])) || 0);

/** The map a state {realm, year, season, which} asks for. */
export function mapOf(state = {}) {
  const id = RW.REALM_IDS.includes(state.realm) ? state.realm : RW.REALM_IDS[0];
  return RW.build(id, {year: Math.round(Number(state.year)) || yearNow(), season: state.season, which: state.which, visit: visits(id)});
}
const foundKey = map => (map.kind === "each" ? `${map.id}:${map.turn}` : map.id);
/** The places the chronicle has found on a map. A map made anew starts with nothing found. */
export function found(map) {
  const f = store().found[foundKey(map)];
  return f && f.seed === map.seed ? RW.normFound(map, f.list) : [];
}
/** GM: set the found places of a map. Returns the new list. */
export async function setFound(map, list) {
  if ( !game.user.isGM ) return found(map);
  const s = store(), clean = RW.normFound(map, list);
  s.found[foundKey(map)] = {seed: map.seed, list: clean};
  await game.settings.set(MODULE_ID, "realmWorlds", s);
  return clean;
}
/** GM: a new visit to a realm whose map changes on every visit. Returns the new count. */
export async function newVisit(id) {
  if ( !game.user.isGM || RW.kindOf(id) !== "visit" ) return visits(id);
  const s = store();
  s.visits[id] = visits(id) + 1;
  await game.settings.set(MODULE_ID, "realmWorlds", s);
  return s.visits[id];
}

/** What the window shows for a state {realm, from, to, year, season, which, eyes}: {map, picture, lines, note, known}. */
export function view(state = {}) {
  const map = mapOf(state), year = Math.round(Number(state.year)) || yearNow();
  const known = state.eyes === "all" ? null : RW.knownPlaces(map, found(map));
  const pick = (v, d) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n < map.places.length ? n : d; };
  const from = pick(state.from, map.gate), to = pick(state.to, map.places.find(p => p.i !== from)?.i ?? from);
  const j = from !== to ? RW.journey(map, from, to, {known}) : null;
  const lines = RW.lines(map, j, {year, future: future()});
  if ( known ) { const n = map.places.length - known.size; lines.push(n ? `${n} of the ${map.places.length} places here are not yet found.` : "Every place here is found."); }
  const title = `${map.label}, ${year}${state.which && map.kind === "each" ? `: ${state.which}` : ""}`;
  return {map, from, to, known, journey: j, picture: RW.svg(map, {known, path: j?.path ?? null, title}), lines,
    note: `The places are the realm's own, from the books. Where they lie and how long the way takes are not: ${map.ours[0].toLowerCase()}${map.ours.slice(1)}`};
}

const realmOptions = cur => LINES.map(line => { const ids = RW.REALM_IDS.filter(id => REALMS[id].line === line);
  return ids.length ? `<optgroup label="${esc(LINE_WORDS[line] ?? line)}">${ids.map(id => `<option value="${esc(id)}"${id === cur ? " selected" : ""}>${esc(REALMS[id].label)}</option>`).join("")}</optgroup>` : ""; }).join("");

export async function realmWorldsDialog(start = {}) {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  let state = {realm: RW.REALM_IDS[0], from: null, to: null, year: yearNow(), season: 0, which: "", eyes: "home", ...start};
  for ( let guard = 0; guard < 100; guard++ ) {
    const v = view(state), map = v.map;
    const places = cur => map.places.map(p => `<option value="${p.i}"${p.i === cur ? " selected" : ""}>${esc(p.label)}${v.known && !v.known.has(p.i) ? " (not yet found)" : ""}</option>`).join("");
    const content = `<div class="wow-realm-worlds" style="max-height:74vh;overflow-y:auto">
      ${img(v.picture, map.label)}
      <p class="wodx-quiet">${esc(v.note)}</p>
      ${v.lines.map(l => `<p style="margin:0.15rem 0">${esc(l)}</p>`).join("")}
      ${map.layout.length || map.change.length ? `<details class="wow-realm-books"><summary>What the books say of how it lies and how it changes</summary>
        ${[...map.layout, ...map.change].map(([note, ref]) => `<p style="margin:0.15rem 0">${esc(note)}. <span class="wodx-quiet">${esc(ref)}</span></p>`).join("")}
        <p class="wodx-quiet">The map does not yet follow these notes place by place.</p></details>` : ""}
      <div class="form-group"><label>Realm</label>${searchBox("select[name=realm]", "Find a realm…", "Search realms")}<select name="realm">${realmOptions(map.id)}</select></div>
      <div class="form-group"><label>Shown</label><select name="eyes" data-fixed><option value="home"${state.eyes === "all" ? "" : " selected"}>What the chronicle has found</option><option value="all"${state.eyes === "all" ? " selected" : ""}>The whole realm</option></select></div>
      <div class="form-group"><label>From</label><select name="from" data-fixed>${places(v.from)}</select></div>
      <div class="form-group"><label>To</label><select name="to" data-fixed>${places(v.to)}</select></div>
      <div class="form-group"><label>Year</label><input type="number" name="year" value="${Number(state.year) || yearNow()}" min="-10000" max="2200" step="1"></div>
      ${map.kind === "season" ? `<div class="form-group"><label>Season</label><select name="season" data-fixed>${RW.SEASONS.map((s, i) => `<option value="${i}"${i === Number(state.season) ? " selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select></div>` : ""}
      ${map.kind === "each" ? `<div class="form-group"><label>Which one</label><input type="text" name="which" value="${esc(state.which)}" placeholder="its name: each has its own map" aria-label="The name of this realm: each has its own map"></div>` : ""}
      ${map.kind === "visit" ? `<p class="wodx-quiet">Visit ${visits(map.id) + 1}. This realm is not the same twice: A new visit makes its map anew.</p>` : ""}</div>`;
    const read = (ev, b) => { const o = new foundry.applications.ux.FormDataExtended(b.form).object; const same = o.realm === map.id;
      return {realm: o.realm, from: same ? Number(o.from) : null, to: same ? Number(o.to) : null, year: Math.round(Number(o.year)) || yearNow(), season: Number(o.season ?? state.season) || 0, which: same ? String(o.which ?? state.which ?? "") : "", eyes: o.eyes === "all" ? "all" : "home"}; };
    const res = await DialogV2.wait({window: {title: "Realm world maps", resizable: true}, classes: ["wodx-dialog"], position: {width: 900, height: "auto"}, content, rejectClose: false,
      buttons: [{action: "show", label: "Show", default: true, callback: (ev, b) => ({go: "show", state: read(ev, b)})},
        {action: "closer", label: "Look closer at From", callback: (ev, b) => ({go: "closer", state: read(ev, b)})},
        {action: "found", label: "Found places", callback: (ev, b) => ({go: "found", state: read(ev, b)})},
        ...(map.kind === "visit" ? [{action: "visit", label: "A new visit", callback: (ev, b) => ({go: "visit", state: read(ev, b)})}] : []),
        {action: "close", label: "Close"}]});
    if ( !res || res === "close" ) return null;
    state = res.state;
    if ( res.go === "closer" ) await closerDialog(state);
    if ( res.go === "found" ) await foundDialog(state);
    if ( res.go === "visit" && state.realm === map.id ) { await newVisit(map.id); state.from = state.to = null; }
  }
  return null;
}

/** One square of a realm's map and the squares round it, closer. */
export async function closerDialog(state = {}) {
  const v = view(state), map = v.map, p = map.places[v.from];
  if ( !p ) return null;
  const c = RW.closer(map, p.x, p.y);
  return foundry.applications.api.DialogV2.wait({window: {title: `A closer look: ${p.label}`, resizable: true}, classes: ["wodx-dialog"], position: {width: 480, height: "auto"}, rejectClose: false,
    content: `<div style="max-height:74vh;overflow-y:auto">${img(RW.closerSvg(map, c), "One square of the realm's map, closer")}
      <p>${esc(p.label)}, ${esc(map.label)}.</p>
      <p class="wodx-quiet">The square with the place is in the middle, its neighbours round it. ${esc(c.lands.map(([w, n]) => `${w} ${n}%`).join(", "))}. This view is made from the realm's map and is the same every time, until the map is made anew.</p></div>`,
    buttons: [{action: "close", label: "Close", default: true}]});
}

/** The places of a realm's map, each with a tick: ticked places are found by the chronicle. */
export async function foundDialog(state = {}) {
  if ( !game.user.isGM ) return null;
  const map = mapOf(state), mine = found(map);
  const content = `<div style="max-height:70vh;overflow-y:auto"><p>Travellers who reach ${esc(map.label)} know ${esc(map.places[map.gate]?.name ?? "where they stand")}. Tick each other place the chronicle has found: by going there, by a guide, a map or a spirit's word. A journey can end only at a found place.</p>
    <ul class="wow-found" data-fixed style="list-style:none;padding:0;margin:0">${map.places.filter(p => p.i !== map.gate).map(p => `<li><label><input type="checkbox" name="found.${p.i}"${mine.includes(p.i) ? " checked" : ""}> ${esc(p.label)}${p.what ? ` <span class="wodx-quiet">${esc(p.what)} (${esc(p.ref)})</span>` : ""}</label></li>`).join("")}</ul></div>`;
  const res = await foundry.applications.api.DialogV2.wait({window: {title: `Found places: ${map.label}`, resizable: true}, classes: ["wodx-dialog"], position: {width: 480, height: "auto"}, content, rejectClose: false,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.entries(foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(b.form).object).found ?? {}).filter(([, v]) => v).map(([k]) => Number(k))},
      {action: "close", label: "Close"}]});
  if ( !Array.isArray(res) ) return null;
  return setFound(map, res);
}
