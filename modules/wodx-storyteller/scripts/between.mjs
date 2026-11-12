/**
 * Between sessions and at the edges of play: the next session sheet, scene kits, quick extras, the hooks board,
 * absent players, "Last time" for the players and downtime requests. The rules are in prep-rules.mjs and kits-rules.mjs.
 *
 *   World settings: kits [kit], absent {userId: {at, runBy}} (cleared when the session ends).
 *   Approval type wodx-storyteller.downtime: a player's request, approved or rejected in the queue.
 *   Everything but the downtime form is the Storyteller's; the scene preload is the one step that makes players'
 *   computers load anything early, and only when pressed.
 */
import * as P from "./prep-rules.mjs";
import * as K from "./kits-rules.mjs";
import * as C from "./core.mjs";
import * as Dash from "./dashboard.mjs";
import * as Tasks from "./tasks.mjs";
import {normLetters} from "./letters-rules.mjs";
import {addTool} from "./hand.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const {MOD, esc} = C;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const DIALOG = ["wodx-dialog", "wstory-dialog", "wst-hand"];
const wait = cfg => foundry.applications.api.DialogV2.wait({rejectClose: false, ...cfg, classes: [...DIALOG, ...(cfg.classes ?? [])]});
const formData = (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object;
const api = name => (game.modules?.get?.(name)?.active ? game.modules.get(name).api ?? null : null);
const opts = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(cur ?? "") ? " selected" : ""}>${esc(v)}</option>`).join("");
export const T_DOWNTIME = `${MOD}.downtime`;
const PREP_JOURNAL = "WoDX · Next session";
const RECAP_JOURNAL = "WoDX · Last time";
const EXTRAS_FOLDER = "WoDX · Extras";

export function registerBetweenSettings() {
  game.settings.register(MOD, "kits", {scope: "world", config: false, type: Array, default: []});
  game.settings.register(MOD, "absent", {scope: "world", config: false, type: Object, default: {}, onChange: () => C.changed()});
}

export function registerBetweenTools() {
  addTool({key: "prep", label: "Next session sheet", icon: "fa-clipboard-list", run: () => prepDialog()});
  addTool({key: "kits", label: "Scene kits", icon: "fa-clapperboard", run: () => kitsDialog()});
  addTool({key: "extras", label: "Quick extras", icon: "fa-people-group", run: () => extrasDialog()});
  addTool({key: "hooks", label: "Character hooks", icon: "fa-fish-fins", run: () => hooksDialog()});
  addTool({key: "absent", label: "Absent tonight", icon: "fa-user-slash", run: () => absentDialog()});
  addTool({key: "recap", label: "Last time, for the players", icon: "fa-scroll", run: () => recapDialog()});
}

export function registerBetweenHandlers() {
  // Small (B2453): one of the listed kinds of downtime, a week or less
  C.chron()?.approvals?.registerHandler?.(T_DOWNTIME, {label: "A downtime request", small: e => K.smallDowntime(e.data), approve: approveDowntime, reject: rejectDowntime});
}

async function journal(name, {players = false} = {}) {
  const found = game.journal.find(j => j.name === name && j.flags?.[MOD]?.made);
  if ( found ) return found;
  const ownership = {default: players ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER : CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE};
  return JournalEntry.create({name, ownership, flags: {[MOD]: {made: true}}});
}
const dateWords = () => { try { return C.timeLabel(game.time.worldTime); } catch (e) { return ""; } };

/* ------------------------------------------------------------------ */
/*  The next session sheet                                             */
/* ------------------------------------------------------------------ */

export function prepSections() {
  const g = Dash.gather();
  const tasks = [];
  for ( const a of all(game.actors) ) for ( const t of Tasks.tasksOf(a) ) tasks.push({actor: a.name, ...t});
  const ahead = g.party.map(r => ({name: r.name, ahead: r.ahead}));
  return P.nextSession({now: g.now, clocks: g.clocks, threads: g.threads, consequences: g.consequences,
    letters: normLetters(C.setting("letters") ?? []), tasks, ahead});
}

export async function writePrep({notes = ""} = {}) {
  if ( !game.user.isGM ) return null;
  const secs = prepSections();
  const html = `<p class="wodx-quiet">Made ${esc(new Date().toLocaleDateString())}, in game ${esc(dateWords())}.</p>
    ${secs.map(s => `<h2>${esc(s.title)}</h2><ul>${s.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>`).join("") || "<p>Nothing is coming due.</p>"}
    <h2>Scenes and people to have ready</h2>${notes ? `<p>${esc(notes).replace(/\n/g, "<br>")}</p>` : "<p></p>"}`;
  const j = await journal(PREP_JOURNAL);
  const page = await j.createEmbeddedDocuments("JournalEntryPage", [{name: `For ${new Date().toLocaleDateString()}`, type: "text", text: {content: html}}]);
  j.sheet?.render?.(true, {pageId: page?.[0]?.id});
  return page?.[0] ?? null;
}

/** Preload scenes on every computer, so maps open at once later. Players' computers do the loading, now. */
export async function preload(ids = []) {
  if ( !game.user.isGM ) return 0;
  let n = 0;
  for ( const id of ids ) { if ( game.scenes.get(id) ) { await game.scenes.preload(id, true); n++; } }
  return n;
}

export async function prepDialog() {
  if ( !game.user.isGM ) return null;
  const secs = prepSections();
  const scenes = all(game.scenes).filter(s => !s.active);
  const content = `<form><p>What the sheet will hold now:</p>
    <div class="wst-scroll">${secs.map(s => `<h3>${esc(s.title)} (${s.lines.length})</h3><ul>${s.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>`).join("") || "<p>Nothing is coming due.</p>"}</div>
    <div class="form-group"><label for="wst-prep-notes">Scenes and people to have ready</label><textarea id="wst-prep-notes" name="notes" rows="3"></textarea></div>
    <fieldset><legend>Load these maps on every computer now (optional)</legend>${scenes.length > 6 ? searchBox(".wst-prep-scenes", "Find a scene…", "Search scenes") : ""}
      <div class="wst-prep-scenes wst-scroll">${scenes.map(s => `<label data-search-item data-search-text="${esc(s.name)}"><input type="checkbox" name="pre.${s.id}"> ${esc(s.navName || s.name)}</label>`).join("<br>")}</div>
      <p class="wodx-quiet">Players' computers fetch these maps as soon as you press Write; do it before play, not during.</p></fieldset></form>`;
  const data = await wait({window: {title: "Next session sheet"}, position: {width: 600}, content,
    buttons: [{action: "go", label: "Write the sheet", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  const ids = Object.entries(foundry.utils.expandObject(data).pre ?? {}).filter(([, v]) => v).map(([k]) => k);
  const page = await writePrep({notes: data.notes});
  if ( ids.length ) ui.notifications.info(`Loading ${await preload(ids)} map${ids.length === 1 ? "" : "s"} on every computer.`);
  return page;
}

/* ------------------------------------------------------------------ */
/*  Scene kits                                                         */
/* ------------------------------------------------------------------ */

export const kits = () => K.normKits(C.setting("kits"));
export async function saveKit(kit) {
  const k = K.normKit({...kit, id: kit.id || foundry.utils.randomID()});
  await game.settings.set(MOD, "kits", [...kits().filter(x => x.id !== k.id), k]);
  return k;
}
export const removeKit = id => game.settings.set(MOD, "kits", kits().filter(k => k.id !== id));

export async function runKit(id) {
  if ( !game.user.isGM ) return null;
  const kit = kits().find(k => k.id === id);
  const scene = kit ? game.scenes.get(kit.sceneId) : null;
  if ( !kit || !scene ) { ui.notifications.warn("That kit's scene is gone."); return null; }
  const atm = api("wodx-atmosphere");
  const done = [];
  for ( const step of K.kitSteps(kit, {atmosphere: !!atm}) ) {
    try {
      if ( step.key === "clock" ) await game.time.advance(kit.minutes * 60);
      else if ( step.key === "activate" ) await scene.activate();
      else if ( step.key === "view" ) await scene.view();
      else if ( step.key === "convene" ) await C.convene({actorIds: kit.actorIds, sceneId: scene.id, reason: kit.reason});
      else if ( step.key === "mood" ) await atm.kit.play(kit.mood);
      else if ( step.key === "opening" ) atm.opening.show(scene);
      else if ( step.key === "note" ) ui.notifications.info(`${kit.name}: ${kit.note}`, {permanent: true});
      done.push(step.label);
    } catch (e) { console.error(`${MOD} | kit step ${step.key}`, e); }
  }
  await C.log({kind: "note", text: `Scene kit: ${kit.name}.`});
  return done;
}

async function editKit(kit = {}) {
  const k = K.normKit(kit);
  const scenes = all(game.scenes);
  const content = `<form>
    <div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(k.name)}" maxlength="80"></div>
    <div class="form-group"><label>Scene</label>${searchBox("select[name=sceneId]", "Find a scene…", "Search scenes")}<select name="sceneId">${opts(Object.fromEntries(scenes.map(s => [s.id, s.navName || s.name])), k.sceneId || canvas?.scene?.id)}</select></div>
    <div class="form-group"><label>Minutes that pass first</label><input type="number" name="minutes" value="${k.minutes}" min="0" max="10080"></div>
    <div class="form-group"><label>Who goes</label><select name="pull" data-fixed>${opts(K.PULL, k.pull)}</select></div>
    <div class="form-group"><label>Music mood</label><select name="mood" data-fixed>${opts(Object.fromEntries(K.MOODS.map(m => [m, m ? m[0].toUpperCase() + m.slice(1) : "Leave the music"])), k.mood)}</select></div>
    <div class="form-group"><label><input type="checkbox" name="opening"${k.opening ? " checked" : ""}> Show the opening card</label></div>
    <fieldset><legend>Called characters (for "Only the characters called")</legend>${C.pcs().map(a => `<label><input type="checkbox" name="who.${a.id}"${k.actorIds.includes(a.id) ? " checked" : ""}> ${esc(a.name)}</label>`).join("<br>")}</fieldset>
    <div class="form-group"><label>Why (shown to those called)</label><input type="text" name="reason" value="${esc(k.reason)}" maxlength="300"></div>
    <div class="form-group"><label>A note for you</label><input type="text" name="note" value="${esc(k.note)}" maxlength="500"></div></form>`;
  const data = await wait({window: {title: k.id ? `Scene kit: ${k.name}` : "A new scene kit"}, position: {width: 560}, content,
    buttons: [{action: "save", label: "Save", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  const d = foundry.utils.expandObject(data);
  return saveKit({...k, ...d, opening: !!d.opening, actorIds: Object.entries(d.who ?? {}).filter(([, v]) => v).map(([id]) => id)});
}

export async function kitsDialog() {
  if ( !game.user.isGM ) return null;
  const list = kits();
  const rows = list.map(k => `<li data-search-item data-search-text="${esc(k.name)}"><b>${esc(k.name)}</b> <span class="wodx-quiet">${esc(game.scenes.get(k.sceneId)?.name ?? "scene gone")}</span>
    <button type="button" data-kit="run" data-id="${k.id}">Run</button> <button type="button" data-kit="edit" data-id="${k.id}">Edit</button> <button type="button" data-kit="remove" data-id="${k.id}">Remove</button></li>`).join("");
  const wire = (ev, dlg) => {
    for ( const b of dlg?.element?.querySelectorAll?.("[data-kit]") ?? [] ) b.addEventListener("click", async () => {
      dlg.close();
      const id = b.dataset.id;
      if ( b.dataset.kit === "run" ) return runKit(id);
      if ( b.dataset.kit === "edit" ) await editKit(kits().find(k => k.id === id));
      if ( b.dataset.kit === "remove" ) await removeKit(id);
      if ( b.dataset.kit === "new" ) await editKit({});
      return kitsDialog();
    });
  };
  return wait({window: {title: "Scene kits"}, position: {width: 560}, render: wire,
    content: `<p>A kit starts a scene in one press: the clock, who goes, the music and the opening card.</p>
      ${list.length > 6 ? searchBox("ul.wst-kits", "Find a kit…", "Search kits") : ""}<ul class="wst-kits">${rows || "<li>No kits yet.</li>"}</ul>
      <div class="wodx-buttons"><button type="button" data-kit="new">New kit</button></div>`,
    buttons: [{action: "close", label: "Close"}]});
}

/* ------------------------------------------------------------------ */
/*  Quick extras                                                       */
/* ------------------------------------------------------------------ */

const yearNow = () => { try { return C.chron()?.eras?.currentYear?.(); } catch (e) { return null; } };

/** Make n extras of a template and place them at the middle of the view (or the given point) on the current scene. */
export async function makeExtras(key, {n = 1, x = null, y = null} = {}) {
  if ( !game.user.isGM ) return [];
  const tpl = K.EXTRAS.find(e => e.key === key);
  if ( !tpl ) return [];
  const folder = game.folders.find(f => f.type === "Actor" && f.name === EXTRAS_FOLDER) ?? await Folder.create({name: EXTRAS_FOLDER, type: "Actor"});
  const data = K.extraActorData(tpl, {folder: folder.id});
  let actor = game.actors.find(a => a.flags?.[MOD]?.extra?.key === key && a.folder?.id === folder.id);
  if ( !actor ) {
    const {system, ...rest} = data;
    actor = await Actor.create(rest);
    // Only the traits the sheet has in this era: an Ability the era's sheet lacks is left out
    const upd = {};
    for ( const [k, v] of Object.entries(system.attributes) ) if ( actor.system?.attributes?.[k] ) { upd[`system.attributes.${k}.value`] = v.value; if ( "total" in actor.system.attributes[k] ) upd[`system.attributes.${k}.total`] = v.value; }
    for ( const [k, v] of Object.entries(system.abilities) ) if ( actor.system?.abilities?.[k] ) { upd[`system.abilities.${k}.value`] = v.value; upd[`system.abilities.${k}.isvisible`] = true; }
    if ( actor.system?.advantages?.willpower ) { upd["system.advantages.willpower.permanent"] = system.advantages.willpower.permanent; upd["system.advantages.willpower.temporary"] = system.advantages.willpower.temporary; }
    if ( system.advantages.bloodpool && actor.system?.advantages?.bloodpool ) { upd["system.advantages.bloodpool.temporary"] = system.advantages.bloodpool.temporary; upd["system.advantages.bloodpool.max"] = system.advantages.bloodpool.max; }
    await actor.update(upd);
  }
  const scene = canvas?.scene;
  if ( !scene ) return [actor];
  const size = scene.grid?.size ?? 100;
  const cx = x ?? (canvas.stage?.pivot?.x ?? 0), cy = y ?? (canvas.stage?.pivot?.y ?? 0);
  const count = Math.max(1, Math.min(20, Math.round(num(n))));
  const tokens = [];
  for ( let i = 0; i < count; i++ ) {
    const t = await actor.getTokenDocument({x: cx + (i % 5) * size, y: cy + Math.floor(i / 5) * size, actorLink: false, name: count > 1 ? `${tpl.label} ${i + 1}` : tpl.label, hidden: true});
    tokens.push(t.toObject());
  }
  const made = await scene.createEmbeddedDocuments("Token", tokens);
  await ChatMessage.create({whisper: C.gmIds(), speaker: {alias: "Storyteller"},
    content: `<div class="wodx-card"><h3>${esc(tpl.label)}${count > 1 ? ` ×${count}` : ""}</h3><p>${esc(K.extraSummary(tpl))}</p><p class="wodx-quiet">Placed hidden; reveal them when they enter. ${esc(tpl.ref ?? "")}</p></div>`});
  return made;
}

export async function extrasDialog() {
  if ( !game.user.isGM ) return null;
  const list = K.extrasFor(yearNow());
  const content = `<form><div class="form-group"><label>Who</label><select name="key" data-fixed>${list.map(e => `<option value="${e.key}">${esc(e.label)}</option>`).join("")}</select></div>
    <div class="form-group"><label>How many</label><input type="number" name="n" value="1" min="1" max="20"></div>
    <ul class="wodx-quiet">${list.map(e => `<li><b>${esc(e.label)}</b>: ${esc(K.extraSummary(e))}</li>`).join("")}</ul>
    <p class="wodx-quiet">They go on the scene you are looking at, at the middle of the view, hidden. Each kind is one actor in the folder ${esc(EXTRAS_FOLDER)}; the tokens are unlinked, so each one takes its own wounds.</p></form>`;
  const data = await wait({window: {title: "Quick extras"}, position: {width: 560}, content,
    buttons: [{action: "go", label: "Place them", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  return makeExtras(data.key, {n: data.n});
}

/* ------------------------------------------------------------------ */
/*  The hooks board                                                    */
/* ------------------------------------------------------------------ */

export function hooksFor(a) {
  const s = a?.system ?? {};
  const features = all(a?.items).filter(i => i.type === "Feature").map(i => ({name: i.name, kind: i.system?.type ?? "", value: i.system?.value}));
  const road = s.advantages?.path ?? s.advantages?.road ?? s.advantages?.humanity ?? null;
  return P.hooksOf({name: a?.name, nature: s.nature, demeanor: s.demeanor, derangement: s.derangement, features,
    morality: road && Number.isFinite(Number(road.permanent ?? road.value)) ? {name: road.label || road.name || "Morality", value: road.permanent ?? road.value} : null});
}

/** One Willpower point back for acting by Nature, on the sheet and in the log. */
export async function willpowerForNature(actorId) {
  const a = game.actors.get(actorId);
  const wp = a?.system?.advantages?.willpower;
  if ( !game.user.isGM || !wp ) return null;
  const now = num(wp.temporary), of = num(wp.permanent);
  if ( now >= of ) { ui.notifications.info(`${a.name}'s Willpower is already full.`); return null; }
  await a.update({"system.advantages.willpower.temporary": now + 1});
  await C.log({kind: "note", actor: a.id, name: a.name, text: `${a.name} regained a Willpower point by acting by their Nature (${a.system?.nature || "Nature"}).`});
  ChatMessage.create({speaker: {alias: "Storyteller"}, content: `<div class="wodx-card"><p>${esc(a.name)} regains a point of Willpower for acting by their Nature.</p></div>`});
  return now + 1;
}

export async function hooksDialog() {
  if ( !game.user.isGM ) return null;
  const board = C.pcs().map(a => ({id: a.id, ...hooksFor(a)}));
  const li = (label, list) => (list.length ? `<div><b>${label}:</b> ${esc(list.join(", "))}</div>` : "");
  const rows = board.map(h => `<section data-search-item data-search-text="${esc(P.hooksText(h))}"><h3>${esc(h.name)}</h3>
    <div><b>Nature</b> ${esc(h.nature || "not set")}; <b>Demeanor</b> ${esc(h.demeanor || "not set")}${h.morality ? `; ${esc(h.morality)}` : ""}</div>
    ${li("Flaws", h.flaws)}${li("Derangements", h.derangements)}${li("People they have", h.people)}${li("Merits", h.merits)}
    <button type="button" data-hook="wp" data-id="${h.id}">Willpower for acting by Nature</button></section>`).join("");
  const wire = (ev, dlg) => {
    for ( const b of dlg?.element?.querySelectorAll?.("[data-hook]") ?? [] ) b.addEventListener("click", () => willpowerForNature(b.dataset.id));
  };
  return wait({window: {title: "Character hooks", resizable: true}, position: {width: 620}, render: wire,
    content: `<p class="wodx-quiet">What each character brings to pull on: the Nature that gives Willpower back (V20 p. 267, pdf 275; the Archetypes are on pp. 87-96), Flaws, Derangements and the people their Backgrounds name. Read from the sheets.</p>
      ${searchBox(".wst-hooks", "Search hooks…", "Search hooks")}<div class="wst-hooks wst-scroll">${rows || "<p>No players' characters yet.</p>"}</div>`,
    buttons: [{action: "close", label: "Close"}]});
}

/* ------------------------------------------------------------------ */
/*  Absent players                                                     */
/* ------------------------------------------------------------------ */

export const absentMap = () => P.normAbsent(C.setting("absent"));
export const isAbsent = userId => !!absentMap()[userId];

export async function setAbsent(userId, absent, {runBy = "none"} = {}) {
  if ( !game.user.isGM ) return null;
  const m = absentMap(), u = game.users.get(userId);
  if ( absent ) m[userId] = {at: game.time.worldTime, runBy}; else delete m[userId];
  await game.settings.set(MOD, "absent", m);
  if ( u ) await C.log({kind: "note", user: userId, text: absent ? `${u.name} is away tonight${runBy === "st" ? `; the Storyteller plays ${u.character?.name ?? "their character"}` : ""}.` : `${u.name} is back.`});
  return m;
}
export const clearAbsent = () => (game.user.isGM ? game.settings.set(MOD, "absent", {}) : null);

export async function absentDialog() {
  if ( !game.user.isGM ) return null;
  const m = absentMap();
  const players = all(game.users).filter(u => !u.isGM);
  const content = `<form><p>Mark who is away for this session. Their characters leave the spotlight count and are left unticked when you convene; long tasks go on. It clears when the session ends.</p>
    <table class="wst-absent"><thead><tr><th>Player</th><th>Away</th><th>You play their character</th></tr></thead><tbody>${players.map(u => `<tr><td>${esc(u.name)}${u.character ? ` <span class="wodx-quiet">(${esc(u.character.name)})</span>` : ""}</td>
      <td><input type="checkbox" name="away.${u.id}"${m[u.id] ? " checked" : ""} aria-label="${esc(u.name)} away"></td><td><input type="checkbox" name="st.${u.id}"${m[u.id]?.runBy === "st" ? " checked" : ""} aria-label="${esc(u.name)}: the Storyteller plays the character"></td></tr>`).join("")}</tbody></table></form>`;
  const data = await wait({window: {title: "Absent tonight"}, position: {width: 520}, content,
    buttons: [{action: "save", label: "Save", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  const d = foundry.utils.expandObject(data);
  for ( const u of players ) {
    const away = !!d.away?.[u.id], was = m[u.id];
    const runBy = d.st?.[u.id] ? "st" : "none";
    if ( away !== !!was || (away && was?.runBy !== runBy) ) await setAbsent(u.id, away, {runBy});
  }
  return absentMap();
}

/* ------------------------------------------------------------------ */
/*  Last time, for the players                                         */
/* ------------------------------------------------------------------ */

export function recapDraft() {
  const label = n => { try { return n ? C.timeLabel(n).replace(/^[^,]*, /, "") : "Earlier"; } catch (e) { return "Earlier"; } };
  return P.recapLines(P.lastSession(C.entries()), {nightLabel: label}).join("\n");
}

export async function postRecap(text) {
  if ( !game.user.isGM || !String(text ?? "").trim() ) return null;
  const html = String(text).split(/\n+/).filter(Boolean).map(l => `<p>${esc(l)}</p>`).join("");
  const j = await journal(RECAP_JOURNAL, {players: true});
  await j.createEmbeddedDocuments("JournalEntryPage", [{name: `Before ${dateWords() || "tonight"}`, type: "text", text: {content: html}}]);
  return ChatMessage.create({speaker: {alias: "Storyteller"}, content: `<div class="wodx-card wst-recap"><h3>Last time</h3>${html}</div>`});
}

export async function recapDialog() {
  if ( !game.user.isGM ) return null;
  const draft = recapDraft();
  const content = `<form><p>Drawn from the log of the last session: only what the players saw at the table (arrivals, called scenes, crossings, dawn, encounters, rolls you called). Solo acts and anything secret stay out. Change it as you like.</p>
    <textarea name="text" rows="12" aria-label="The recap">${esc(draft)}</textarea>
    <p class="wodx-quiet">Show it posts it in chat and keeps a copy in the players' journal ${esc(RECAP_JOURNAL)}.</p></form>`;
  const data = await wait({window: {title: "Last time, for the players", resizable: true}, position: {width: 620}, content,
    buttons: [{action: "go", label: "Show the players", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  return postRecap(data.text);
}

/* ------------------------------------------------------------------ */
/*  Downtime requests                                                  */
/* ------------------------------------------------------------------ */

export async function requestDowntime(req) {
  const d = K.normDowntime({...req, userId: game.user.id});
  const a = game.actors.get(d.actorId);
  if ( !a || !(game.user.isGM || a.isOwner) || !d.what ) { ui.notifications.warn("Pick your character and say what they do."); return null; }
  await C.chron()?.approvals?.propose?.({type: T_DOWNTIME, title: K.downtimeTitle(d, a.name), detail: d.what, data: d});
  ui.notifications.info("Sent to the Storyteller. You'll hear back when it's read.");
  return d;
}

async function approveDowntime(entry) {
  const d = K.normDowntime(entry?.data), a = game.actors.get(d.actorId);
  if ( !a ) return;
  await C.log({kind: "solo", actor: a.id, name: a.name, user: d.userId, hours: d.nights * 8, text: `Downtime, ${K.DOWNTIME_KINDS[d.kind].toLowerCase()}: ${d.what.slice(0, 300)}`});
  await tellDowntime(a, d, true);
}
async function rejectDowntime(entry) {
  const d = K.normDowntime(entry?.data), a = game.actors.get(d.actorId);
  if ( a ) await tellDowntime(a, d, false);
}
async function tellDowntime(a, d, ok) {
  const owners = all(game.users).filter(u => !u.isGM && a.testUserPermission?.(u, "OWNER")).map(u => u.id);
  await ChatMessage.create({speaker: {alias: "Storyteller"}, whisper: [...owners, ...C.gmIds()],
    content: `<div class="wodx-card"><p>${esc(a.name)}'s downtime (${esc(K.DOWNTIME_KINDS[d.kind].toLowerCase())}) is ${ok ? "accepted. The Storyteller tells you what came of it" : "not taken this time. The Storyteller will say why"}.</p></div>`});
}

export async function downtimeDialog() {
  const mine = C.pcs().filter(a => game.user.isGM || a.isOwner);
  if ( !mine.length ) { ui.notifications.warn("You need a character of your own to ask for downtime."); return null; }
  const content = `<form><p>Between sessions: say what your character does with their nights. The Storyteller reads it and answers.</p>
    <div class="form-group"><label>Character</label><select name="actorId">${mine.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>
    <div class="form-group"><label>What kind</label><select name="kind" data-fixed>${opts(K.DOWNTIME_KINDS, "other")}</select></div>
    <div class="form-group"><label>Nights</label><input type="number" name="nights" value="1" min="1" max="60"></div>
    <div class="form-group"><label for="wst-dt-what">What they do</label><textarea id="wst-dt-what" name="what" rows="5" maxlength="1000"></textarea></div>
    <p class="wodx-quiet">For work that takes rolls over days or weeks, the Long tasks window (the hourglass) rolls it for you.</p></form>`;
  const data = await wait({window: {title: "Downtime request"}, position: {width: 520}, content,
    buttons: [{action: "go", label: "Send", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  return requestDowntime(data);
}
