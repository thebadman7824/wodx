/**
 * WoDX Storyteller 0.1.0: the windows. The Storyteller's tracker (the feed, every character's place and time, the
 * spotlight), the players' "Out on your own" window (travel and solo play), and the dialogs for convening, beats,
 * travel places, the night's summary and the report between sessions.
 */
import * as W from "./world-rules.mjs";
import * as Road from "./road-rules.mjs";
import * as C from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const {esc} = C;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const opt = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(cur ?? "") ? " selected" : ""}>${esc(v)}</option>`).join("");
const DIALOG = ["wodx-dialog", "wstory-dialog"];
const formData = (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object;
const wait = cfg => foundry.applications.api.DialogV2.wait({rejectClose: false, ...cfg, classes: [...DIALOG, ...(cfg.classes ?? [])]});
const sceneOptions = (cur, {blank = null} = {}) => (blank ? `<option value="">${esc(blank)}</option>` : "")
  + all(game.scenes).slice().sort((a, b) => C.sceneName(a).localeCompare(C.sceneName(b))).map(s => `<option value="${esc(s.id)}"${s.id === cur ? " selected" : ""}>${esc(C.sceneName(s))}</option>`).join("");

/* ------------------------------------------------------------------ */
/*  The tracker                                                        */
/* ------------------------------------------------------------------ */

let trackerClass = null;
export function TrackerClass() {
  if ( trackerClass ) return trackerClass;
  const {ApplicationV2} = foundry.applications.api;
  class TrackerApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: "wodx-storyteller-tracker", classes: ["wodx", "wstory-tracker"],
      window: {title: "The Storyteller's tracker", icon: "fa-solid fa-binoculars", resizable: true},
      position: {width: 900, height: 700},
      actions: {
        convene: () => conveneDialog(), beats: () => beatsDialog(), places: () => placesDialog(), summary: () => summaryDialog(),
        report: () => reportDialog(), session: () => endSessionDialog(), release: (ev, t) => C.release([t.dataset.id]),
        releaseAll: () => C.release(), filter: TrackerApp.#onFilter, clear: TrackerApp.#onClear, own: () => openOnYourOwn()
      }
    };
    static #instance;
    static filters = {actor: "", place: "", kind: "", attention: false};
    static open() {
      if ( !game.user.isGM ) return null;
      const height = Math.max(360, Math.min(760, window.innerHeight - 120)), width = Math.max(480, Math.min(940, window.innerWidth - 40));
      this.#instance ??= new TrackerApp({position: {width, height}});
      return this.#instance.render({force: true});
    }
    static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }
    async _renderHTML() {
      const f = TrackerApp.filters, world = game.time.worldTime;
      const log = C.entries(), map = C.personalMap(), conv = C.convenedMap();
      const people = C.pcs();
      const night = C.nightOf(world);
      const rows = people.map(a => {
        const where = C.whereIs(a), t = W.personalOf(map[a.id], world), u = C.ownerOf(a);
        const solo = W.soloCount(log, a.id, C.nightOf(t));
        const limit = Number(C.setting("soloLimit")) || 0;
        return `<tr data-search-text="${esc(`${a.name} ${u?.name ?? ""} ${where ? C.sceneName(where) : ""}`)}">
          <td><b>${esc(a.name)}</b><br><span class="wodx-quiet">${esc(u?.name ?? "No player")}</span></td>
          <td>${esc(where ? C.sceneName(where) : "Not on a scene")}</td>
          <td>${esc(C.timeLabel(t))}<br><span class="wodx-quiet">${esc(W.aheadLabel(t - world))}</span></td>
          <td>${solo}${limit ? ` of ${limit}` : ""}</td>
          <td>${conv[a.id] ? `<span class="wodx-tag">in a called scene</span> <button type="button" data-action="release" data-id="${a.id}">Release</button>` : "Free"}</td></tr>`;
      }).join("");
      const away = new Set(C.absentIds());
      const players = all(game.users).filter(u => !u.isGM && !away.has(u.id)).map(u => ({id: u.id, name: u.name}));
      const mark = C.setting("session") ?? {};
      const spot = W.spotlight(log, players, {since: Number.isFinite(mark.at) ? mark.at : null});
      const spotRows = spot.map(r => `<li><span class="wstory-spot-name">${esc(r.name)}</span>
        <span class="wstory-bar" title="${r.acts} acts"><span style="width:${r.share}%"></span></span>
        <span class="wodx-quiet">${r.acts} ${r.acts === 1 ? "act" : "acts"}, ${r.hours} h alone, ${r.scenes} called ${r.scenes === 1 ? "scene" : "scenes"}</span></li>`).join("");
      const shown = W.filterEntries(log, {actor: f.actor || null, place: f.place || null, kind: f.kind || null, attention: f.attention}).slice(0, 300);
      const places = [...new Set(log.map(e => e.place).filter(Boolean))].sort();
      const feed = shown.map(e => `<li class="${e.attention ? "wstory-attn" : ""}">
        <span class="wodx-tag">${esc(W.KINDS[e.kind] ?? e.kind)}</span> <b>${esc(e.name ?? "The world")}</b>${e.place ? ` <span class="wodx-quiet">at ${esc(e.place)}</span>` : ""}
        <span class="wodx-quiet">· ${esc(C.timeLabel(e.personal ?? e.at))}</span>
        ${e.attention ? `<span class="wodx-tag wstory-look">${esc(e.attention)}</span>` : ""}<br>${esc(e.text)}</li>`).join("");
      const div = document.createElement("div");
      div.className = "wodx-body";
      div.innerHTML = `<div class="wodx-top">
          <p>Every character's place and time, and what they did. The world clock says ${esc(C.timeLabel(world))}; tonight began at dusk, ${esc(C.timeLabel(night))}.</p>
          <div class="wodx-buttons">
            <button type="button" data-action="convene"><i class="fa-solid fa-people-group"></i> Convene…</button>
            <button type="button" data-action="beats">Beats…</button>
            <button type="button" data-action="places">Travel places…</button>
            <button type="button" data-action="summary">Tonight's summary</button>
            <button type="button" data-action="report">Between sessions</button>
            <button type="button" data-action="session" title="Mark the end of the session">End the session…</button>
            <button type="button" data-action="own" title="Travel or act for a character">Out on their own…</button>
          </div></div>
        <div class="wodx-scroll wodx-table-wrap">
          <h3>Characters</h3>
          ${people.length ? `${searchBox("table.wstory-people", "Search characters…", "Search characters")}<table class="wodx-table wstory-people"><thead><tr><th>Character</th><th>Where</th><th>Their time</th><th>Solo tonight</th><th>State</th></tr></thead><tbody>${rows}</tbody></table>
            ${Object.keys(conv).length ? `<p><button type="button" data-action="releaseAll">Release everyone from called scenes</button></p>` : ""}` : `<p class="wodx-quiet">No player characters yet.</p>`}
          <h3>Spotlight since the session ended</h3>
          ${spotRows ? `${searchBox("ul.wstory-spot", "Search players…", "Search players")}<ul class="wodx-list wstory-spot">${spotRows}</ul><p class="wodx-quiet">The quietest player is at the top.</p>` : `<p class="wodx-quiet">No players yet.</p>`}
          <h3>The feed</h3>
          <form class="wstory-filters">
            <label>Character ${searchBox("select[name=actor]", "Search…", "Search characters")}<select name="actor"><option value="">Everyone</option>${opt(Object.fromEntries(people.map(a => [a.id, a.name])), f.actor)}</select></label>
            <label>Place ${searchBox("select[name=place]", "Search…", "Search places")}<select name="place"><option value="">Everywhere</option>${opt(Object.fromEntries(places.map(p => [p, p])), f.place)}</select></label>
            <label>Kind ${searchBox("select[name=kind]", "Search…", "Search kinds")}<select name="kind"><option value="">Every kind</option>${opt(W.KINDS, f.kind)}</select></label>
            <label class="wstory-check"><input type="checkbox" name="attention"${f.attention ? " checked" : ""}> Only what needs a look</label>
            <button type="button" data-action="filter">Show</button> <button type="button" data-action="clear" title="Delete the feed">Clear the feed…</button>
          </form>
          ${feed ? `${searchBox("ul.wstory-feed", "Search the feed…", "Search the feed")}<ul class="wodx-list wstory-feed">${feed}</ul>` : `<p class="wodx-quiet">Nothing logged${f.actor || f.place || f.kind || f.attention ? " for this filter" : " yet"}.</p>`}
        </div>`;
      return div;
    }
    _replaceHTML(result, content) { content.replaceChildren(result); }
    static #onFilter(ev, target) {
      const form = target.closest("form");
      TrackerApp.filters = {actor: form.elements.actor.value, place: form.elements.place.value, kind: form.elements.kind.value, attention: form.elements.attention.checked};
      TrackerApp.refresh();
    }
    static async #onClear() {
      const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Clear the feed"}, classes: DIALOG,
        content: "<p>Delete every line in the feed? The characters' times, the beats and the queue are kept.</p>"});
      if ( ok ) await game.settings.set(C.MOD, "log", W.blankLog());
    }
  }
  return (trackerClass = TrackerApp);
}
export const openTracker = () => TrackerClass().open();

/* ------------------------------------------------------------------ */
/*  Out on your own (players, and the Storyteller for anyone)          */
/* ------------------------------------------------------------------ */

const mine = () => C.pcs().filter(a => game.user.isGM || a.isOwner || a.testUserPermission?.(game.user, "OWNER"));

/** What a player sees before choosing: their time, dawn, solo acts left, and whether they are in a called scene. */
function statusLine(actor) {
  const t = C.personalTime(actor.id), dawnAt = C.dawnAfter(t);
  const limit = Number(C.setting("soloLimit")) || 0;
  const used = W.soloCount(C.entries(), actor.id, C.nightOf(t));
  const conv = C.convenedMap()[actor.id];
  return `<p class="wstory-status">${esc(actor.name)}: ${esc(C.timeLabel(t))} (${esc(W.aheadLabel(t - game.time.worldTime))}); dawn in ${esc(W.spanLabel(dawnAt - t))}.
    ${limit ? `Solo actions tonight: ${used} of ${limit}.` : ""} ${conv ? "<strong>In a scene the Storyteller called; travel and solo play wait.</strong>" : ""}</p>`;
}

export async function openOnYourOwn(actorId = null) {
  const list = mine();
  if ( !list.length ) return ui.notifications.warn("You have no character to act for.");
  const actor = game.actors.get(actorId) ?? (list.includes(game.user.character) ? game.user.character : list[0]);
  const places = C.travelPlaces();
  const plan = id => { const p = C.planTrip(actor, id); return p ? `${C.tripWords(p)}${p.ask ? ", asks first" : ""}` : ""; };
  const at = C.tripContext(C.personalTime(actor.id));
  const ways = new Map();
  for ( const k of Object.keys(Road.ROADS) ) for ( const m of Road.modesFor(k, at.year, {future: at.future}) ) ways.set(m.id, m.label);
  const content = `<form class="wstory-own">
    <div class="wodx-field"><label>Character</label><span>${list.length > 5 ? searchBox("select[name=actor]", "Search…", "Search characters") : ""}<select name="actor" ${list.length > 5 ? "" : "data-fixed"}>${opt(Object.fromEntries(list.map(a => [a.id, a.name])), actor.id)}</select></span></div>
    ${statusLine(actor)}
    <fieldset><legend>Travel</legend>
      <div class="wodx-field"><label>Go to</label><span>${searchBox("select[name=dest]", "Search places…", "Search places")}<select name="dest"><option value="">Stay here</option>${places.map(p => `<option value="${esc(p.id)}">${esc(p.name)} (${esc(plan(p.id))})</option>`).join("")}</select></span></div>
      <div class="wodx-field"><label>How</label><select name="mode" data-fixed><option value="">The fastest way open</option>${[...ways].map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}</select></div>
      <p class="wodx-quiet">A place marked "asks first" waits for the Storyteller. Each hour on the road may turn up an encounter. A way the road cannot take (a train with no line) goes by the fastest way open instead.</p>
    </fieldset>
    <fieldset><legend>Act on your own</legend>
      <div class="wodx-field"><label>What</label><select name="kind" data-fixed><option value="">Nothing now</option>${opt(Object.fromEntries(Object.entries(W.SOLO_KINDS).map(([k, v]) => [k, v.label])), "")}</select></div>
      <div class="wodx-field"><label>Hours</label><input type="number" name="hours" min="0.25" max="12" step="0.25" placeholder="usual"></div>
      <div class="wodx-field"><label>What happens</label><textarea name="note" rows="3" maxlength="300" placeholder="Who, where, and what you are after"></textarea></div>
      <label class="wstory-check"><input type="checkbox" name="world"> This changes the world (a death, a breach, a new ally): ask the Storyteller</label>
      <p class="wodx-quiet">Hunting rolls go through the Hunting window of WoDX NPC, or the Storyteller. Lines and veils, and the X-card, hold here as at the table.</p>
    </fieldset></form>`;
  const data = await wait({window: {title: "Out on your own", resizable: true}, position: {width: 600, height: "auto"}, content,
    buttons: [{action: "go", label: "Go", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  const who = game.actors.get(data.actor) ?? actor;
  const out = {};
  if ( data.dest ) out.travel = await request("travel", {actorId: who.id, destId: data.dest, mode: data.mode || null});
  if ( data.kind ) out.solo = await request("solo", {actorId: who.id, kind: data.kind, hours: Number(data.hours) || null, note: data.note ?? "", changesWorld: !!data.world});
  return out;
}

/** Ask the active Storyteller's client to do something: at once on that client, else by socket. */
export async function request(type, payload) {
  const body = {...payload, userId: game.user.id};
  if ( C.isActiveGM() ) {
    const r = type === "travel" ? await C.travel(body) : await C.solo(body);
    answer(r, type);
    return r;
  }
  if ( !game.users.activeGM ) { ui.notifications.warn("No Storyteller is connected, so this could not be sent."); return {ok: false}; }
  game.socket.emit(C.SOCKET, {type: `req.${type}`, payload: body});
  ui.notifications.info("Sent to the Storyteller's table.");
  return {ok: true, sent: true};
}
/** Say how a request went. */
export function answer(r, type) {
  if ( !r ) return;
  if ( !r.ok ) return ui.notifications.warn(r.why ?? "That could not be done.");
  if ( r.waiting ) return ui.notifications.info(type === "travel" ? `Waiting for the Storyteller: ${r.why}` : "Recorded; the Storyteller will decide what it changes.");
  if ( type === "solo" && r.pastDawn ) return ui.notifications.warn("That runs past dawn.");
  ui.notifications.info(type === "travel" ? "On your way." : "Recorded.");
}

/* ------------------------------------------------------------------ */
/*  Convening                                                          */
/* ------------------------------------------------------------------ */

export async function conveneDialog({actorIds = [], sceneId = null, reason = ""} = {}) {
  if ( !game.user.isGM ) return null;
  const people = C.pcs(), map = C.personalMap(), world = game.time.worldTime;
  // A character whose player is away tonight starts unticked
  const away = new Set(C.absentIds());
  if ( away.size ) actorIds = actorIds.filter(id => { const a = game.actors.get(id); return !game.users.some(u => away.has(u.id) && a?.testUserPermission?.(u, "OWNER")); });
  const checks = people.map(a => `<li data-search-text="${esc(a.name)}"><label class="wstory-check"><input type="checkbox" name="a.${esc(a.id)}"${actorIds.includes(a.id) ? " checked" : ""}> ${esc(a.name)}</label>
    <span class="wodx-quiet">${esc(W.aheadLabel(W.personalOf(map[a.id], world) - world))}</span></li>`).join("");
  const content = `<form>
    <p>The scene starts at the latest of the chosen characters' times. Whoever is ahead waits; whoever is behind sums up the gap. Solo play pauses for them until you release them, or the scene ends.</p>
    ${searchBox("ul.wstory-who", "Search characters…", "Search characters")}<ul class="wodx-list wstory-who">${checks || "<li>No player characters.</li>"}</ul>
    <div class="wodx-field"><label>Scene</label><span>${searchBox("select[name=scene]", "Search scenes…", "Search scenes")}<select name="scene">${sceneOptions(sceneId ?? canvas?.scene?.id)}</select></span></div>
    <div class="wodx-field"><label>Why (shown to them)</label><textarea name="reason" rows="2" maxlength="300">${esc(reason)}</textarea></div></form>`;
  const data = await wait({window: {title: "Convene", resizable: true}, position: {width: 560, height: "auto"}, content,
    buttons: [{action: "go", label: "Call them", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  const ids = Object.keys(data).filter(k => k.startsWith("a.") && data[k]).map(k => k.slice(2));
  const r = await C.convene({actorIds: ids, sceneId: data.scene, reason: data.reason ?? ""});
  if ( !r.ok ) ui.notifications.warn(r.why);
  return r;
}

/* ------------------------------------------------------------------ */
/*  Beats                                                              */
/* ------------------------------------------------------------------ */

export async function beatsDialog() {
  if ( !game.user.isGM ) return null;
  const list = C.beats();
  const desc = b => b.on === "time" ? `at ${C.timeLabel(b.time ?? 0)}${b.actor ? ` by ${game.actors.get(b.actor)?.name ?? "someone"}'s time` : ""}`
    : b.on === "place" ? `when ${b.actor ? game.actors.get(b.actor)?.name ?? "someone" : "anyone"} reaches ${C.sceneName(fromUuidSyncSafe(b.place)) }`
    : b.on === "map" ? `when ${b.actor ? game.actors.get(b.actor)?.name ?? "someone" : "anyone"} changes something${b.place ? ` at ${C.sceneName(fromUuidSyncSafe(b.place))}` : ""}${b.value !== null ? ` (${b.value})` : ""}`
    : `when ${b.actor ? game.actors.get(b.actor)?.name ?? "someone" : "a character"} has the flag ${b.flag}${b.value !== null ? ` = ${b.value}` : ""}`;
  const rows = list.map(b => `<tr data-search-text="${esc(b.name)}"><td><b>${esc(b.name)}</b>${b.fired ? ' <span class="wodx-tag">fired</span>' : ""}<br><span class="wodx-quiet">${esc(desc(b))}</span></td></tr>`).join("");
  const pick = list.length ? `<div class="wodx-field"><label>Beat</label><span>${list.length > 5 ? searchBox("select[name=pick]", "Search beats…", "Search beats") : ""}<select name="pick"${list.length > 5 ? "" : " data-fixed"}>${opt(Object.fromEntries(list.map(b => [b.id, b.name])), list[0].id)}</select></span></div>` : "";
  const content = `<form><p>A beat fires on a time, a place, a flag or a change on the map. One that calls characters to a scene waits in the approval queue; one that only reminds is a card for you.${C.setting("beatsOn") === false ? " <strong>Beats are switched off in the settings.</strong>" : ""}</p>
    ${rows ? `${searchBox("table.wstory-beats", "Search beats…", "Search beats")}<table class="wodx-table wstory-beats"><tbody>${rows}</tbody></table>${pick}` : `<p class="wodx-quiet">No beats yet.</p>`}</form>`;
  const act = name => ({action: name, label: {add: "New beat", edit: "Edit", del: "Delete", rearm: "Fire again later"}[name], callback: (ev, btn) => ({act: name, id: btn.form?.elements?.pick?.value ?? null})});
  const result = await wait({window: {title: "Beats", resizable: true}, position: {width: 620, height: "auto"}, content,
    buttons: [act("add"), ...(list.length ? [act("edit"), act("rearm"), act("del")] : []), {action: "close", label: "Close", default: true}]});
  if ( !result || result === "close" || !result.act ) return null;
  if ( result.act === "add" ) { await editBeat(); return beatsDialog(); }
  const b = list.find(x => x.id === result.id);
  if ( result.act === "edit" && b ) await editBeat(b);
  if ( result.act === "rearm" && b ) await C.saveBeat({...b, fired: false, firedAt: null});
  if ( result.act === "del" && b ) {
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Delete a beat"}, classes: DIALOG, content: `<p>Delete the beat "${esc(b.name)}"?</p>`});
    if ( ok ) await C.deleteBeat(b.id);
  }
  return beatsDialog();
}
function fromUuidSyncSafe(id) { try { return id ? fromUuidSync(id) : null; } catch (e) { return null; } }

export async function editBeat(beat = {}) {
  const b = W.normBeat(beat);
  const people = C.pcs();
  const who = Object.fromEntries(people.map(a => [a.id, a.name]));
  const sceneUuid = id => game.scenes.get(id)?.uuid ?? id;
  const placeSel = all(game.scenes).find(s => s.uuid === b.place)?.id ?? "";
  const content = `<form>
    <div class="wodx-field"><label>Name</label><input type="text" name="name" maxlength="120" value="${esc(b.name)}"></div>
    <div class="wodx-field"><label>Fires on</label><select name="on" data-fixed>${opt(W.BEAT_ON, b.on)}</select></div>
    <div class="wodx-field"><label>Time (hours from now)</label><input type="number" name="hours" step="0.25" value="${b.time === null ? 1 : Math.round(((b.time - game.time.worldTime) / 3600) * 4) / 4}"></div>
    <div class="wodx-field"><label>Place</label><span>${searchBox("select[name=place]", "Search scenes…", "Search scenes")}<select name="place">${sceneOptions(placeSel, {blank: "None"})}</select></span></div>
    <div class="wodx-field"><label>Flag (scope.key)</label><input type="text" name="flag" maxlength="120" value="${esc(b.flag ?? "")}" placeholder="world.metTheBishop"></div>
    <div class="wodx-field"><label>Flag value, or for a change on the map its kind or state such as forced, theft or broken (blank: any)</label><input type="text" name="value" maxlength="120" value="${esc(b.value ?? "")}"></div>
    <div class="wodx-field"><label>Whose (blank: anyone)</label><span>${people.length > 5 ? searchBox("select[name=actor]", "Search…", "Search characters") : ""}<select name="actor"${people.length > 5 ? "" : " data-fixed"}><option value="">Anyone</option>${opt(who, b.actor)}</select></span></div>
    <fieldset><legend>Then call to a scene (optional)</legend>
      ${searchBox("ul.wstory-who", "Search characters…", "Search characters")}<ul class="wodx-list wstory-who">${people.map(a => `<li data-search-text="${esc(a.name)}"><label class="wstory-check"><input type="checkbox" name="c.${esc(a.id)}"${b.convene.includes(a.id) ? " checked" : ""}> ${esc(a.name)}</label></li>`).join("")}</ul>
      <div class="wodx-field"><label>Scene</label><span>${searchBox("select[name=scene]", "Search scenes…", "Search scenes")}<select name="scene">${sceneOptions(b.scene, {blank: "None"})}</select></span></div>
    </fieldset>
    <div class="wodx-field"><label>Why</label><textarea name="reason" rows="2" maxlength="400">${esc(b.reason)}</textarea></div></form>`;
  const data = await wait({window: {title: beat.id ? `Beat: ${b.name}` : "New beat", resizable: true}, position: {width: 600, height: "auto"}, content,
    buttons: [{action: "save", label: "Save", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  return C.saveBeat({id: b.id, name: String(data.name || "A beat").trim(), on: data.on, time: game.time.worldTime + Math.round((Number(data.hours) || 0) * 3600),
    place: data.place ? sceneUuid(data.place) : null, flag: data.flag || null, value: data.value ?? null, actor: data.actor || null,
    convene: Object.keys(data).filter(k => k.startsWith("c.") && data[k]).map(k => k.slice(2)), scene: data.scene || null, reason: data.reason ?? "", fired: false});
}

/* ------------------------------------------------------------------ */
/*  Travel places                                                      */
/* ------------------------------------------------------------------ */

export async function placesDialog() {
  if ( !game.user.isGM ) return null;
  const scenes = all(game.scenes).slice().sort((a, b) => C.sceneName(a).localeCompare(C.sceneName(b)));
  const anyMarked = scenes.some(s => s.flags?.[C.MOD]?.travel);
  const rows = scenes.map(s => {
    const t = C.travelOf(s), marked = !!s.flags?.[C.MOD]?.travel;
    const on = marked ? t.on : (!anyMarked && !W.NOT_A_PLACE.test(s.name ?? ""));
    return `<tr data-search-text="${esc(C.sceneName(s))}"><td>${esc(C.sceneName(s))}</td>
      <td><input type="checkbox" name="on.${esc(s.id)}"${on ? " checked" : ""} aria-label="Open for travel"></td>
      <td><input type="checkbox" name="ask.${esc(s.id)}"${t.ask ? " checked" : ""} aria-label="Asks first"></td>
      <td><input type="number" name="min.${esc(s.id)}" min="0" max="1440" value="${t.minutes ?? ""}" placeholder="${C.setting("travelMinutes") ?? 30}" aria-label="Minutes"></td>
      <td><input type="number" name="km.${esc(s.id)}" min="0" max="2000" step="0.1" value="${t.km ?? ""}" aria-label="Distance in km"></td>
      <td><select name="road.${esc(s.id)}" data-fixed aria-label="Road"><option value="">Country road</option>${Object.entries(Road.ROADS).filter(([k]) => k !== "road").map(([k, v]) => `<option value="${k}"${t.road === k ? " selected" : ""}>${esc(v.label)}</option>`).join("")}</select></td>
      <td><input type="text" name="tab.${esc(s.id)}" maxlength="120" value="${esc(t.table ?? "")}" placeholder="world's table" aria-label="Encounter table"></td></tr>`;
  }).join("");
  const content = `<p>Where players may travel. While no place is marked here, every scene that is not a battle map or a test is open. "Asks first" sends the trip to the approval queue. Minutes: how long it takes to get there; filled in, they win. Left blank with a distance, the time comes from the distance, the road and the way of travelling the year allows, slowed by the weather and the dark (blank with no distance: ${C.setting("travelMinutes") ?? 30}). The table is a roll table's name for encounters on the way.</p>
    ${searchBox("table.wstory-places", "Search scenes…", "Search scenes")}
    <div class="wodx-table-wrap wstory-places-wrap"><table class="wodx-table wstory-places"><thead><tr><th>Scene</th><th>Open</th><th>Asks first</th><th>Minutes</th><th>Km</th><th>Road</th><th>Encounter table</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  const data = await wait({window: {title: "Travel places", resizable: true}, position: {width: 960, height: "auto"}, content,
    buttons: [{action: "save", label: "Save", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  for ( const s of scenes ) {
    const next = {on: !!data[`on.${s.id}`], ask: !!data[`ask.${s.id}`], minutes: Number(data[`min.${s.id}`]) || null, table: String(data[`tab.${s.id}`] ?? "").trim() || null,
      km: Number(data[`km.${s.id}`]) || null, road: data[`road.${s.id}`] || null};
    const was = s.flags?.[C.MOD]?.travel;
    const plainDefault = !was && next.on === (!anyMarked && !W.NOT_A_PLACE.test(s.name ?? "")) && !next.ask && !next.minutes && !next.table && !next.km && !next.road;
    if ( plainDefault ) continue;
    const cur = W.normPlace(was ?? {});
    const fresh = W.normPlace({...cur, ...next});
    if ( was && cur.on === fresh.on && cur.ask === fresh.ask && cur.minutes === fresh.minutes && cur.table === fresh.table && cur.km === fresh.km && cur.road === fresh.road ) continue;
    await C.setTravel(s, {...cur, ...next});
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  Tonight's summary, the report between sessions, ending a session   */
/* ------------------------------------------------------------------ */

const linesHtml = lines => lines.length ? `<ul class="wodx-list">${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : `<p class="wodx-quiet">Nothing.</p>`;

export async function summaryDialog() {
  const world = game.time.worldTime, since = C.nightOf(world);
  const lines = W.nightSummary(C.entries(), {since});
  const content = `<p>Since dusk (${esc(C.timeLabel(since))}).</p>${lines.length > 5 ? searchBox("ul.wstory-sum", "Search…", "Search the summary") : ""}<ul class="wodx-list wstory-sum">${lines.map(l => `<li>${esc(l)}</li>`).join("") || "<li>Nothing logged tonight.</li>"}</ul>`;
  const r = await wait({window: {title: "Tonight's summary", resizable: true}, position: {width: 600, height: "auto"}, content,
    buttons: [{action: "chat", label: "Whisper it to me"}, {action: "close", label: "Close", default: true}]});
  if ( r === "chat" ) await ChatMessage.create({content: `<div class="wodx-card wstory"><p><strong>Tonight so far</strong></p>${linesHtml(lines)}</div>`, whisper: C.gmIds(), speaker: {alias: "WoDX Storyteller"}, flags: {[C.MOD]: {summary: true}}});
  return lines;
}

export async function reportDialog() {
  const rep = C.report();
  const body = rep.sections.map(s => `<h3>${esc(s.title)}</h3>${linesHtml(s.lines)}`).join("");
  const content = `<p>${rep.since === null ? "Everything logged so far (no session has ended yet)." : `Since the session ended at ${esc(C.timeLabel(rep.since))}.`}</p><div class="wodx-scroll wstory-report">${body}</div>`;
  const r = await wait({window: {title: "Between sessions", resizable: true}, position: {width: 640, height: "auto"}, content,
    buttons: [{action: "chat", label: "Whisper it to me"}, {action: "close", label: "Close", default: true}]});
  if ( r === "chat" ) await ChatMessage.create({content: `<div class="wodx-card wstory"><p><strong>Between sessions</strong></p>${body}</div>`, whisper: C.gmIds(), speaker: {alias: "WoDX Storyteller"}, flags: {[C.MOD]: {report: true}}});
  return rep;
}

export async function endSessionDialog() {
  const hasNpc = !!C.npc()?.endSession;
  const content = `<p>Mark the end of the session. The report between sessions starts from here, everyone in a called scene is released, and the spotlight starts again.</p>
    ${hasNpc ? `<label class="wstory-check"><input type="checkbox" name="factions" checked> Every faction takes a turn, as the Factions window's End the session does</label>` : ""}`;
  const data = await wait({window: {title: "End the session"}, position: {width: 520, height: "auto"}, content: `<form>${content}</form>`,
    buttons: [{action: "end", label: "End the session", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  await C.endSession({factions: !!data.factions});
  ui.notifications.info("The session is marked as ended.");
  return true;
}
