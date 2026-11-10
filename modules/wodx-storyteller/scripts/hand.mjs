/**
 * The Storyteller's hand: the conveniences around play. Rules at a glance, Call for a roll, Before the players
 * arrive, the end-of-night wrap-up, the session timer, keys and a macro folder. The rules are in glance-rules.mjs,
 * callroll-rules.mjs, preflight-rules.mjs and wrapup-rules.mjs.
 *
 * Everything runs on the Storyteller's computer. Players see only a chat card (Call for a roll), and a button on it
 * when the Storyteller asks them to roll; the Storyteller's client rolls for them, so a player's computer does no work.
 */
import * as G from "./glance-rules.mjs";
import * as CR from "./callroll-rules.mjs";
import * as PF from "./preflight-rules.mjs";
import * as WR from "./wrapup-rules.mjs";
import * as C from "./core.mjs";
import {lineFor} from "./prelude-rules.mjs";
import {CHECKS, GROUPS} from "../../wodx-actions/scripts/checks-rules.js";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const {MOD, esc} = C;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
const api = name => game.modules?.get?.(name)?.active ? game.modules.get(name).api ?? null : null;
const DIALOG = ["wodx-dialog", "wstory-dialog", "wst-hand"];
const wait = cfg => foundry.applications.api.DialogV2.wait({rejectClose: false, ...cfg, classes: [...DIALOG, ...(cfg.classes ?? [])]});
const formData = (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object;
const variantOf = a => a?.system?.settings?.variant ?? "";
const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};
const LIVE_WORLDS = ["rothenstein-live"];
export const isLive = () => LIVE_WORLDS.includes(game.world?.id) || !!game.world?.flags?.wodx?.liveWorld;

export function registerHandSettings() {
  game.settings.register(MOD, "timer", {scope: "world", config: false, type: Object, default: WR.blankTimer(), onChange: () => TimerApp.refresh()});
  game.settings.register(MOD, "timerWarn", {name: "Session timer warning (minutes)", hint: "How long before the session's planned end the Storyteller is warned.",
    scope: "world", config: true, type: Number, default: 30, range: {min: 0, max: 120, step: 5}});
}

/* ------------------------------------------------------------------ */
/*  The lines at the table                                             */
/* ------------------------------------------------------------------ */

export const linesInPlay = () => [...new Set(C.pcs().map(a => lineFor(a.type, variantOf(a))))];
const profileNow = () => { try { return C.chron()?.eras?.activeEra?.()?.profile ?? null; } catch (e) { return null; } };

/* ------------------------------------------------------------------ */
/*  Rules at a glance                                                  */
/* ------------------------------------------------------------------ */

export class GlanceApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-glance", classes: ["wodx", "wst-glance"],
    window: {title: "Rules at a glance", icon: "fa-solid fa-book-bookmark", resizable: true},
    position: {width: 560, height: 640},
    actions: {every: GlanceApp.#onEvery, rules: () => C.chron()?.openClock?.()}
  };
  static #instance;
  #every = false;
  static open() { if ( !game.user.isGM ) return null; this.#instance ??= new GlanceApp(); return this.#instance.render({force: true}); }
  static #onEvery() { this.#every = !this.#every; this.render(); }

  async _renderHTML() {
    const lines = linesInPlay(), profile = profileNow();
    const secs = G.sections({lines, profile, every: this.#every});
    const row = (s, l) => `<li data-search-item data-search-text="${esc(G.searchText(s, l))}"><b>${esc(l.label)}</b>${l.value ? `: ${esc(l.value)}` : ""}${l.ref ? ` <span class="wodx-quiet">(${esc(l.ref)})</span>` : ""}</li>`;
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `<p class="wodx-quiet">${esc(profile?.name ?? "No era yet")}; lines at the table: ${esc(lines.map(cap).join(", ") || "none yet")}.</p>
      ${searchBox(".wst-glance-list", "Search the rules…", "Search the rules")}
      <div class="wst-glance-list">${secs.map(s => `<section><h3>${esc(s.title)}</h3><ul>${s.lines.map(l => row(s, l)).join("")}</ul>
        <p class="wodx-quiet">${esc(s.ref)}</p></section>`).join("")}</div>
      <div class="wodx-buttons"><button type="button" data-action="every">${this.#every ? "Only the lines at the table" : "Every line"}</button>
      <button type="button" data-action="rules">House rules (the Clock)</button></div>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
}

/* ------------------------------------------------------------------ */
/*  Call for a roll                                                    */
/* ------------------------------------------------------------------ */

/** A plain copy of the sheet for the pool: Attributes, Abilities and the wound penalty. */
export function sheetOf(a) {
  const s = a?.system ?? {};
  const attributes = {};
  for ( const k of CR.ATTRS ) attributes[k] = num(s.attributes?.[k]?.total ?? s.attributes?.[k]?.value);
  const abilities = {};
  for ( const [k, v] of Object.entries(s.abilities ?? {}) ) if ( v && typeof v === "object" ) abilities[k.toLowerCase()] = {value: num(v.value), shown: !!v.isvisible};
  const ignore = s.conditions?.isignoringpain || s.conditions?.isfrenzy;
  return {attributes, abilities, wounds: ignore ? 0 : Math.min(0, num(s.health?.damage?.woundpenalty))};
}

async function rollFaces(n) {
  if ( n <= 0 ) return [];
  const r = new Roll(`${Math.min(60, n)}d10`);
  await r.evaluate();
  return r.dice[0]?.results?.map(x => x.result) ?? [];
}

async function answerFor(req, a, contest) {
  const pool = CR.poolOf(req, sheetOf(a));
  if ( pool.blocked ) return {actorId: a.id, name: a.name, blocked: pool.blocked, text: pool.text};
  const faces = await rollFaces(pool.dice);
  return {actorId: a.id, name: a.name, dice: pool.dice, diff: pool.diff, text: pool.text, faces, ...CR.resultOf(faces, pool.diff, {contest})};
}

function cardHtml(state) {
  const {req, answers, contest} = state;
  const line = x => x.pending ? `<li><b>${esc(x.name)}</b>: still to roll</li>`
    : x.blocked ? `<li><b>${esc(x.name)}</b>: ${esc(x.blocked)}</li>`
    : `<li><b>${esc(x.name)}</b>: ${x.botch ? "<b>botch</b>" : `${x.successes} success${x.successes === 1 ? "" : "es"}${contest ? `, ${x.net} net` : ""}`}
       <span class="wodx-quiet">(${x.dice} dice at ${x.diff}: ${esc(x.text)}; ${esc((x.faces ?? []).join(" "))})</span></li>`;
  return `<div class="wodx-card wst-call"><h3>${esc(req.label)}</h3>
    ${contest ? `<p>Against ${esc(contest.label || "the Storyteller's roll")}: ${contest.successes} success${contest.successes === 1 ? "" : "es"} (${contest.dice} dice at ${contest.diff}).</p>` : ""}
    <ul data-fixed>${CR.sortAnswers(answers).map(line).join("")}</ul><p><b>${esc(CR.summary(answers, {contest}))}</b></p>
    <p class="wodx-quiet">${req.mode === "secret" ? "Only the Storyteller sees this card. " : ""}Successes at or over the difficulty, less each 1; no successes with a 1 is a botch (V20 p. 249 printed). Wound penalties count.</p></div>`;
}

/** Run a call. Returns the card message. */
export async function callRoll(request) {
  if ( !game.user.isGM ) return null;
  const req = CR.normRequest(request);
  const actors = req.actorIds.map(id => game.actors.get(id)).filter(Boolean);
  if ( !actors.length ) { ui.notifications.warn("Pick at least one character."); return null; }
  let contest = null;
  if ( req.contest ) {
    const faces = await rollFaces(req.contest.dice);
    contest = {...req.contest, faces, successes: CR.resultOf(faces, req.contest.diff).successes};
  }
  const answers = [];
  if ( req.mode === "ask" ) for ( const a of actors ) answers.push({actorId: a.id, name: a.name, pending: true});
  else for ( const a of actors ) answers.push(await answerFor(req, a, contest));
  const state = {req, answers, contest};
  const gms = C.gmIds();
  const msg = await ChatMessage.create({content: cardHtml(state), speaker: {alias: "Storyteller"}, flags: {[MOD]: {call: state}},
    ...(req.mode === "open" ? {} : {whisper: gms})});
  if ( req.mode === "ask" ) {
    for ( const a of actors ) {
      const owners = all(game.users).filter(u => !u.isGM && a.testUserPermission?.(u, "OWNER")).map(u => u.id);
      await ChatMessage.create({speaker: {alias: "Storyteller"}, whisper: owners.length ? [...owners, ...gms] : gms,
        flags: {[MOD]: {callAsk: {msgId: msg.id, actorId: a.id}}},
        content: `<div class="wodx-card wst-call"><h3>${esc(req.label)}</h3><p>The Storyteller asks ${esc(a.name)} to roll.</p>
          <button type="button" data-action="wst-call-roll">Roll for ${esc(a.name)}</button></div>`});
    }
  }
  await C.log({kind: "roll", text: `Called for a roll: ${req.label} (${actors.length} character${actors.length === 1 ? "" : "s"}).`});
  return msg;
}

/** The active Storyteller rolls one asked character, updates the gathered card and the player's card. */
export async function answerAsk({askId, userId}) {
  if ( !C.isActiveGM() ) return null;
  const ask = game.messages.get(askId), info = ask?.flags?.[MOD]?.callAsk;
  const card = info ? game.messages.get(info.msgId) : null;
  const state = card?.flags?.[MOD]?.call;
  const a = game.actors.get(info?.actorId);
  const user = game.users.get(userId);
  if ( !state || !a || !user || !(user.isGM || a.testUserPermission?.(user, "OWNER")) ) return null;
  const i = state.answers.findIndex(x => x.actorId === a.id);
  if ( i < 0 || !state.answers[i].pending ) return null;
  const ans = await answerFor(state.req, a, state.contest);
  state.answers[i] = ans;
  await card.update({content: cardHtml(state), [`flags.${MOD}.call`]: state});
  await ask.update({content: `<div class="wodx-card wst-call"><h3>${esc(state.req.label)}</h3><p>${esc(a.name)} rolled: ${ans.blocked ? esc(ans.blocked)
    : ans.botch ? "a botch" : `${ans.successes} success${ans.successes === 1 ? "" : "es"}`}${!ans.blocked ? ` <span class="wodx-quiet">(${esc(ans.faces.join(" "))})</span>` : ""}.</p></div>`,
    [`flags.${MOD}.callAsk.done`]: true});
  return ans;
}

function onAskClick(message) {
  if ( message.flags?.[MOD]?.callAsk?.done ) return;
  const payload = {askId: message.id, userId: game.user.id};
  if ( C.isActiveGM() ) return answerAsk(payload);
  game.socket.emit(C.SOCKET, {type: "req.call", payload});
}

const pcAndSelected = () => {
  const out = new Map(C.pcs().map(a => [a.id, a]));
  // Selected tokens join the list; an unlinked token's actor is a copy, so its base actor is used
  for ( const t of canvas?.tokens?.controlled ?? [] ) { const a = t.document?.actorId ? game.actors.get(t.document.actorId) : null; if ( a ) out.set(a.id, a); }
  return [...out.values()];
};

export async function callRollDialog({actorIds = null, check = "notice"} = {}) {
  if ( !game.user.isGM ) return null;
  const chars = pcAndSelected();
  const chosen = new Set(actorIds ?? C.pcs().map(a => a.id));
  const groups = GROUPS.map(([g, label]) => `<optgroup label="${esc(label)}">${CHECKS.filter(c => c.group === g).map(c =>
    `<option value="${esc(c.key)}"${c.key === check ? " selected" : ""}>${esc(c.label)}</option>`).join("")}</optgroup>`).join("");
  const attrs = CR.ATTRS.map(k => `<option value="${k}">${cap(k)}</option>`).join("");
  const abil = [...new Set(chars.flatMap(a => Object.keys(a.system?.abilities ?? {})))].sort();
  const content = `<form>
    <div class="form-group"><label>Roll</label>${searchBox("select[name=check]", "Search checks…", "Search checks")}<select name="check"><option value="">My own: the Attribute and Ability below</option>${groups}</select></div>
    <div class="form-group"><label>Or: Attribute + Ability</label><select name="attr" data-fixed>${attrs}</select>
      <select name="ability"><option value="">None</option>${abil.map(k => `<option value="${esc(k)}">${esc(cap(k))}</option>`).join("")}</select></div>
    <div class="form-group"><label>Difficulty, bonus dice</label><input type="number" name="diff" value="" placeholder="the check's" min="2" max="10" style="width:5em"> <input type="number" name="bonus" value="0" style="width:4em"></div>
    <div class="form-group"><label>How</label><select name="mode" data-fixed>${Object.entries(CR.MODES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
    <div class="form-group"><label>Against a roll of (dice, difficulty)</label><input type="number" name="cdice" value="0" min="0" max="30" style="width:4em"> <input type="number" name="cdiff" value="6" min="2" max="10" style="width:4em"> <input type="text" name="clabel" placeholder="whose, or what" style="width:12em"></div>
    <fieldset><legend>Who rolls</legend>${chars.length > 6 ? searchBox(".wst-call-who", "Find a character…", "Search characters") : ""}
      <div class="wst-call-who">${chars.map(a => `<label data-search-item data-search-text="${esc(a.name)}"><input type="checkbox" name="who.${a.id}"${chosen.has(a.id) ? " checked" : ""}> ${esc(a.name)}</label>`).join("<br>")}</div></fieldset>
    <p class="wodx-quiet">The Storyteller's computer rolls every pool from the sheet, wound penalties included. With 0 dice against, it is a plain roll at the difficulty.</p></form>`;
  const data = await wait({window: {title: "Call for a roll"}, position: {width: 560}, content,
    buttons: [{action: "go", label: "Call for it", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  const c = CHECKS.find(x => x.key === data.check);
  const ids = Object.entries(foundry.utils.expandObject(data).who ?? {}).filter(([, v]) => v).map(([k]) => k);
  return callRoll({label: c ? c.label : `${cap(data.attr)}${data.ability ? ` + ${cap(data.ability)}` : ""}`,
    pools: c ? c.pools : [[data.attr, data.ability]], diff: data.diff === "" || data.diff === null ? (c?.diff ?? 6) : data.diff,
    bonus: data.bonus, mode: data.mode, actorIds: ids,
    contest: num(data.cdice) > 0 ? {dice: data.cdice, diff: data.cdiff, label: data.clabel} : null});
}

/* ------------------------------------------------------------------ */
/*  Before the players arrive                                          */
/* ------------------------------------------------------------------ */

export function snapshot() {
  const modules = {};
  for ( const m of all(game.modules) ) if ( m.id.startsWith("wodx-") || PF.CLASH.includes(m.id) ) modules[m.id] = !!m.active;
  const ch = C.chron();
  let era = {year: null};
  try {
    const eras = ch?.eras, act = eras?.activeEra?.(), year = eras?.currentYear?.(), tgt = eras?.targetEra?.(year);
    era = {year, name: act?.profile?.name, locked: !!act?.locked, label: C.timeLabel(game.time.worldTime) + (Number.isFinite(year) ? ` ${year}` : ""),
      mismatch: !!(act?.profile?.id && tgt?.profile?.id && act.profile.id !== tgt.profile.id)};
    if ( !ch?.eras ) era = {year: null};
  } catch (e) { era = {year: null}; }
  const players = all(game.users).filter(u => !u.isGM);
  const testWorld = game.world?.id === "wodx-template" || !!game.world?.flags?.wodx?.testWorld || /^rothenstein-wodx$/.test(game.world?.id ?? "");
  let xcard;
  try { xcard = ch?.rule ? !!ch.rule("xcardPauses") : undefined; } catch (e) { xcard = undefined; }
  return {
    modules, era, live: isLive(), testWorld,
    held: (() => { try { return !!ch?.isHeld?.(); } catch (e) { return false; } })(),
    queue: ch?.approvals?.pending?.()?.length ?? 0,
    players: players.length, playersWithout: players.filter(u => !u.character).map(u => u.name),
    testActors: all(game.actors).filter(a => PF.TEST_NAME.test(a.name ?? "") || a.flags?.wodx?.test || a.flags?.["wodx-creation"]?.skipTest).map(a => a.name),
    scene: game.scenes?.active?.name ?? null, xcard, beats: C.setting("beatsOn") ?? undefined
  };
}

const FIX = {
  modules: () => { try { new foundry.applications.sidebar.apps.ModuleManagement().render({force: true}); } catch (e) { ui.notifications.info("Open Game Settings, Manage Modules."); } },
  clock: () => C.chron()?.openClock?.(),
  queue: () => C.chron()?.approvals?.ApprovalsApp?.open?.(),
  users: () => ui.notifications.info("Right-click a player in the Players list (bottom left), User Configuration, and pick a character."),
  actors: () => { try { ui.sidebar.changeTab("actors", "primary"); } catch (e) { /* older sidebar */ } },
  scenes: () => { try { ui.sidebar.changeTab("scenes", "primary"); } catch (e) { /* older sidebar */ } },
  rules: () => C.chron()?.openClock?.(),
  settings: () => game.settings.sheet?.render?.(true)
};

export class PreflightApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-preflight", classes: ["wodx", "wst-preflight"],
    window: {title: "Before the players arrive", icon: "fa-solid fa-list-check", resizable: true},
    position: {width: 560, height: "auto"},
    actions: {fix: (ev, t) => FIX[t.dataset.fix]?.(), again: () => PreflightApp.#instance?.render()}
  };
  static #instance;
  static open() { if ( !game.user.isGM ) return null; this.#instance ??= new PreflightApp(); return this.#instance.render({force: true}); }
  async _renderHTML() {
    const list = PF.checks(snapshot());
    const mark = {ok: "fa-circle-check", warn: "fa-triangle-exclamation", fail: "fa-circle-xmark"};
    const word = {ok: "Ready", warn: "Worth a look", fail: "Fix before play"}[PF.worst(list)];
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `<p><b>${esc(word)}.</b> <span class="wodx-quiet">Checks only: nothing changes until you press a button.</span></p>
      <ul class="wst-preflight-list" data-fixed>${list.map(c => `<li class="wst-pf-${c.state}"><i class="fa-solid ${mark[c.state]}"></i> <b>${esc(c.label)}</b>: ${esc(c.detail)}
        ${c.fix ? ` <button type="button" data-action="fix" data-fix="${esc(c.fix)}">Open</button>` : ""}</li>`).join("")}</ul>
      <div class="wodx-buttons"><button type="button" data-action="again">Check again</button></div>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
}

/* ------------------------------------------------------------------ */
/*  The end of the night                                               */
/* ------------------------------------------------------------------ */

export async function wrapUpDialog() {
  if ( !game.user.isGM ) return null;
  const have = {chronicle: !!C.chron()?.endScene, npc: !!C.npc()?.endSession, creation: !!api("wodx-creation")?.award};
  const steps = WR.steps(have);
  const pcs = C.pcs();
  const reasons = WR.reasonsFor(null, {story: true});
  const head = reasons.map(r => `<th title="${esc(r.label)}">${esc(r.label.split(/[:,]/)[0])} (${r.xp})</th>`).join("");
  const rows = pcs.map(a => `<tr data-search-item data-search-text="${esc(a.name)}"><td>${esc(a.name)}</td>${reasons.map(r =>
    `<td><input type="checkbox" name="xp.${a.id}.${r.key}"${r.auto ? " checked" : ""} aria-label="${esc(`${a.name}: ${r.label}`)}"></td>`).join("")}
    <td><input type="number" name="extra.${a.id}" value="0" style="width:4em" aria-label="${esc(`${a.name}: extra points`)}"></td></tr>`).join("");
  const content = `<form><p>The steps run in this order. Untick any you want to skip.</p>
    <ul data-fixed>${steps.map(s => `<li><label><input type="checkbox" name="step.${s.key}" checked> ${esc(s.label)}</label></li>`).join("")}</ul>
    ${have.creation && pcs.length ? `<h3>Experience</h3><p class="wodx-quiet">Tick what each character earned; the story-end columns are for the last session of a story. Nothing is given unless the experience step is ticked.</p>
      ${pcs.length > 6 ? searchBox(".wst-wrap-xp tbody", "Find a character…", "Search characters") : ""}
      <div class="wst-scroll"><table class="wst-wrap-xp"><thead><tr><th>Character</th>${head}<th>Extra</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
    <p class="wodx-quiet">Afterwards: back up the world from Foundry's Setup screen (Worlds, the world's menu, Back up), or on the server's own schedule.</p></form>`;
  const data = await wait({window: {title: "End of the night"}, position: {width: 720}, content,
    buttons: [{action: "go", label: "Wrap up", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  const d = foundry.utils.expandObject(data);
  const done = [];
  if ( d.step?.scene && have.chronicle ) { try { await C.chron().endScene(); done.push("the scene ended"); } catch (e) { console.error(`${MOD} |`, e); } }
  if ( d.step?.xp && have.creation ) {
    let given = 0;
    for ( const a of pcs ) {
      const ticked = Object.entries(d.xp?.[a.id] ?? {}).filter(([, v]) => v).map(([k]) => k);
      const amount = WR.totalFor(ticked, reasons, d.extra?.[a.id]);
      if ( !amount ) continue;
      await api("wodx-creation").award([a], amount, WR.noteFor(ticked, reasons, num(d.extra?.[a.id])));
      given++;
    }
    done.push(`experience for ${given} character${given === 1 ? "" : "s"}`);
  }
  if ( d.step?.session || d.step?.factions ) {
    if ( d.step?.session ) { await C.endSession({factions: !!d.step?.factions}); done.push("the session marked as ended"); }
    else if ( d.step?.factions ) { try { await C.npc()?.endSession?.(); done.push("the factions' turn"); } catch (e) { console.error(`${MOD} |`, e); } }
  }
  if ( d.step?.timer ) { await stopTimer(); }
  ui.notifications.info(`Wrapped up: ${done.join(", ") || "nothing to do"}.`);
  return done;
}

/* ------------------------------------------------------------------ */
/*  The session timer                                                  */
/* ------------------------------------------------------------------ */

const timer = () => WR.normTimer(C.setting("timer") ?? {});
const setTimer = t => game.user.isGM ? game.settings.set(MOD, "timer", WR.normTimer(t)) : null;
export const startTimer = (minutes = 240) => setTimer(WR.startTimer(Date.now(), minutes, C.setting("timerWarn") ?? 30));
export const pauseTimer = () => setTimer(WR.pauseTimer(timer(), Date.now()));
export const resumeTimer = () => setTimer(WR.resumeTimer(timer(), Date.now()));
export const stopTimer = () => setTimer(WR.blankTimer());
export const readTimer = () => WR.readTimer(timer(), Date.now());

let ticker = null;
/** One light check every 30 seconds, on the active Storyteller's computer only, while a timer runs. */
export function watchTimer() {
  if ( ticker ) clearInterval(ticker);
  ticker = null;
  if ( !C.isActiveGM() || timer().start === null ) return;
  ticker = setInterval(async () => {
    const r = readTimer();
    if ( !r.running ) { clearInterval(ticker); ticker = null; return; }
    TimerApp.refresh();
    if ( r.warn ) {
      await setTimer({...timer(), warned: true});
      ui.notifications.warn(`WoDX: ${WR.clockWords(r.left)} left in the session. Time to close the scene and give experience.`);
    }
  }, 30000);
}

export class TimerApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-timer", classes: ["wodx", "wst-timer"],
    window: {title: "Session timer", icon: "fa-solid fa-stopwatch", resizable: false},
    position: {width: 340, height: "auto"},
    actions: {start: TimerApp.#onStart, pause: () => pauseTimer(), resume: () => resumeTimer(), stop: () => stopTimer()}
  };
  static #instance;
  static open() { if ( !game.user.isGM ) return null; this.#instance ??= new TimerApp(); return this.#instance.render({force: true}); }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); watchTimer(); }
  static #onStart(ev, t) {
    const h = num(this.element?.querySelector?.("[name=hours]")?.value) || 4;
    return startTimer(Math.round(h * 60));
  }
  async _renderHTML() {
    const r = readTimer();
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = r.running
      ? `<p><b>${esc(WR.clockWords(r.left))}${r.over ? "" : " left"}</b>${r.paused ? " (on a break)" : ""}. <span class="wodx-quiet">Played ${esc(WR.clockWords(r.played))}.</span></p>
         <div class="wodx-buttons">${r.paused ? `<button type="button" data-action="resume">Back from the break</button>` : `<button type="button" data-action="pause">Take a break</button>`}
         <button type="button" data-action="stop">Stop</button></div>`
      : `<div class="form-group"><label for="wst-timer-hours">Hours tonight</label><input id="wst-timer-hours" type="number" name="hours" value="4" min="0.5" max="12" step="0.5" style="width:5em"></div>
         <p class="wodx-quiet">Real time, not the game's. A break moves the end later. You are warned ${esc(String(C.setting("timerWarn") ?? 30))} minutes before the end.</p>
         <div class="wodx-buttons"><button type="button" data-action="start">Start</button></div>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
}

/* ------------------------------------------------------------------ */
/*  The hand: one window for all of it, keys and macros                */
/* ------------------------------------------------------------------ */

export const TOOLS = [
  {key: "preflight", label: "Before the players arrive", icon: "fa-list-check", run: () => PreflightApp.open()},
  {key: "glance", label: "Rules at a glance", icon: "fa-book-bookmark", run: () => GlanceApp.open()},
  {key: "call", label: "Call for a roll", icon: "fa-dice", run: () => callRollDialog()},
  {key: "timer", label: "Session timer", icon: "fa-stopwatch", run: () => TimerApp.open()},
  {key: "wrap", label: "End of the night", icon: "fa-moon", run: () => wrapUpDialog()}
];
/** Later tools add themselves here (the next-session sheet, scene kits and the rest). */
export const addTool = t => { if ( !TOOLS.some(x => x.key === t.key) ) TOOLS.push(t); };

export async function handDialog() {
  if ( !game.user.isGM ) return null;
  const content = `${TOOLS.length > 8 ? searchBox(".wst-hand-list", "Find a tool…", "Search tools") : ""}<div class="wst-hand-list">${TOOLS.map(t =>
    `<button type="button" data-search-item data-search-text="${esc(t.label)}" data-tool="${esc(t.key)}"><i class="fa-solid ${esc(t.icon)}"></i> ${esc(t.label)}</button>`).join("")}</div>
    <div class="wodx-buttons"><button type="button" data-tool="macros"><i class="fa-solid fa-scroll"></i> Make these into macros</button></div>`;
  const wire = (ev, dlg) => {
    for ( const b of dlg?.element?.querySelectorAll?.("[data-tool]") ?? [] ) b.addEventListener("click", () => {
      dlg.close();
      if ( b.dataset.tool === "macros" ) return makeMacros();
      return TOOLS.find(t => t.key === b.dataset.tool)?.run?.();
    });
  };
  return wait({window: {title: "The Storyteller's hand", icon: "fa-solid fa-hand-sparkles"}, position: {width: 380}, render: wire, content,
    buttons: [{action: "close", label: "Close"}]});
}

export const MACRO_FOLDER = "WoDX · Storyteller";
/** A macro for each tool, in one folder; made again only where missing. */
export async function makeMacros() {
  if ( !game.user.isGM ) return [];
  const folder = game.folders.find(f => f.type === "Macro" && f.name === MACRO_FOLDER) ?? await Folder.create({name: MACRO_FOLDER, type: "Macro"});
  const made = [];
  const list = [...TOOLS.map(t => ({name: t.label, command: `game.wodx?.storyteller?.hand?.run?.("${t.key}");`, img: "icons/svg/book.svg"})),
    {name: "Clock: +10 minutes", command: "game.time.advance(600);", img: "icons/svg/clockwork.svg"},
    {name: "Clock: +1 hour", command: "game.time.advance(3600);", img: "icons/svg/clockwork.svg"},
    {name: "End the scene", command: "game.wodx?.chronicle?.endScene?.();", img: "icons/svg/door-exit.svg"},
    {name: "The approval queue", command: "game.wodx?.chronicle?.approvals?.ApprovalsApp?.open?.();", img: "icons/svg/book.svg"}];
  for ( const m of list ) {
    if ( game.macros.find(x => x.name === m.name && x.folder?.id === folder.id) ) continue;
    made.push(await Macro.create({...m, type: "script", folder: folder.id, flags: {[MOD]: {hand: true}}}));
  }
  ui.notifications.info(made.length ? `Made ${made.length} macro${made.length === 1 ? "" : "s"} in the folder ${MACRO_FOLDER}.` : `The macros are already in ${MACRO_FOLDER}.`);
  return made;
}

export const runTool = key => TOOLS.find(t => t.key === key)?.run?.();

export function registerHandKeys() {
  const key = (id, name, run, keys = []) => game.keybindings?.register?.(MOD, id, {name, editable: keys, restricted: true, onDown: () => { if ( game.user.isGM ) run(); return true; }});
  const ks = k => [{key: k, modifiers: ["Alt", "Shift"]}];
  key("hand", "The Storyteller's hand", () => handDialog(), ks("KeyH"));
  key("glance", "Rules at a glance", () => GlanceApp.open(), ks("KeyG"));
  key("call", "Call for a roll", () => callRollDialog(), ks("KeyR"));
  key("preflight", "Before the players arrive", () => PreflightApp.open());
  key("wrap", "End of the night", () => wrapUpDialog());
  key("timer", "Session timer", () => TimerApp.open());
  key("plus10", "Clock: +10 minutes", () => game.time.advance(600), ks("KeyT"));
  key("plus60", "Clock: +1 hour", () => game.time.advance(3600));
  key("endScene", "End the scene", () => C.chron()?.endScene?.(), ks("KeyE"));
  key("queue", "The approval queue", () => C.chron()?.approvals?.ApprovalsApp?.open?.(), ks("KeyQ"));
}

export function registerHandHooks() {
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    if ( !html || !message.flags?.[MOD]?.callAsk ) return;
    html.querySelector?.("[data-action=wst-call-roll]")?.addEventListener("click", ev => { ev.currentTarget.disabled = true; onAskClick(message); });
  });
}
