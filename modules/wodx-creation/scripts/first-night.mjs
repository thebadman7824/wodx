/**
 * WoDX Creation 0.12.0: Before the First Night, the window (Chronicle Start Desk). One hub per player character with
 * a card for each step, and for the Storyteller a troupe view of every character's progress. The pure rules are in
 * first-night-rules.mjs.
 *
 * A player marks a step done and the Storyteller approves it through the approval queue; the Storyteller ticks steps
 * directly. Some steps tick themselves when the sheet shows they are done (concept, lifepath, build, Merits and
 * Flaws). The trouble forecast is read from the other WoDX modules; each one that is off is skipped. World setting
 * "Before the First Night": automatic (on, except in the Live world), on, or off.
 *
 * Opened from a character sheet's header, the Creation window, the Chronicle Clock, the end of the Storyteller's
 * setup wizard, or game.wodx.creation.firstNight(actor).
 */
import {MODULE_ID, esc, generationOf} from "./actor-data.mjs";
import * as R from "./first-night-rules.mjs";
import * as LP from "./lifepath-rules.mjs";
import {lifepathOf, splatText, LifepathApp} from "./lifepath.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import {postSeedCards, registerSeedCards} from "./first-night-seed.mjs";
import {WizardApp, ledgerFor} from "./wizard.mjs";
import {PreludeRunApp, writtenPrelude, sendTies, meetingJournal, registerTies} from "./first-night-prelude.mjs";
import {underWay} from "./first-night-prelude-rules.mjs";

const {ApplicationV2} = foundry.applications.api;
const FLAG = "firstNight";
const STEP_APPROVAL = "wodx-first-night-step";
const HOOK_APPROVAL = "wodx-first-night-hook";
const LIVE_WORLDS = ["rothenstein-live"];
const api = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;
const chron = () => api("wodx-chronicle");
const yearNow = () => { try { return getEngine().timeToDate(game.time?.worldTime ?? 0).year; } catch { return null; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = actor => game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id);
const isLive = () => LIVE_WORLDS.includes(game.world?.id) || !!game.world?.flags?.wodx?.liveWorld;
const pcs = () => [...(game.actors ?? [])].filter(a => a.hasPlayerOwner && !/group|spirit|creature/i.test(String(a.type))).sort((a, b) => a.name.localeCompare(b.name));

export const recordOf = actor => R.normRecord(actor?.flags?.[MODULE_ID]?.[FLAG] ?? {});
const saveRecord = (actor, rec) => actor.update({[`flags.${MODULE_ID}.${FLAG}`]: R.normRecord(rec)});

/** Is the hub on in this world? */
export function isOn() {
  let mode = "auto";
  try { mode = game.settings.get(MODULE_ID, "firstNight"); } catch (e) { /* not registered yet */ }
  return mode === "on" || (mode !== "off" && !isLive());
}

export function registerFirstNightSettings() {
  game.settings.register(MODULE_ID, "firstNight", {
    name: "Before the First Night", scope: "world", config: true, type: String, default: "auto",
    hint: "The guided start for player characters: steps, the trouble forecast and sign-off. Automatic is on everywhere except the Live world.",
    choices: {auto: "Automatic", on: "On", off: "Off"}
  });
}

/** At start: the approval handlers (a player's step, a player's story hook). */
export function registerFirstNight() {
  registerSeedCards();
  registerTies();
  const C = chron();
  C?.registerApprovalHandler?.(STEP_APPROVAL, {label: "A step before the first night", approve: e => tick(e.data?.actorId, e.data?.step, e.from)});
  C?.registerApprovalHandler?.(HOOK_APPROVAL, {label: "A story hook", approve: e => agreeHook(e.data?.actorId)});
  // A story hook not brought in after four sessions reminds the Storyteller (desk b3); counted when the Storyteller ends a session
  Hooks.on("wodxSessionEnded", () => countSessions().catch(e => console.error(`${MODULE_ID} | story hooks`, e)));
}

/** GM: tick a step. */
export async function tick(actorId, step, by = null) {
  const actor = game.actors.get(actorId);
  if ( !game.user.isGM || !actor || !R.stepByKey(step) ) return null;
  const rec = recordOf(actor);
  rec.steps[step] = {done: true, at: game.time?.worldTime ?? 0, by: by ?? game.user.id};
  await saveRecord(actor, rec);
  FirstNightApp.refresh();
  return rec;
}

/** GM: take a tick off again. */
export async function untick(actorId, step) {
  const actor = game.actors.get(actorId);
  if ( !game.user.isGM || !actor ) return null;
  const rec = recordOf(actor);
  delete rec.steps[step];
  if ( step === "signoff" ) rec.signed = false;
  await saveRecord(actor, rec);
  FirstNightApp.refresh();
  return rec;
}

async function agreeHook(actorId) {
  const actor = game.actors.get(actorId);
  if ( !game.user.isGM || !actor ) return null;
  const rec = recordOf(actor);
  if ( !rec.hook ) return null;
  rec.hook = {...rec.hook, agreed: true, since: game.time?.worldTime ?? 0, sessions: 0};
  await saveRecord(actor, rec);
  FirstNightApp.refresh();
  return rec;
}

async function countSessions() {
  if ( !game.user.isGM ) return;
  for ( const a of pcs() ) {
    const rec = recordOf(a);
    if ( !rec.hook?.agreed || rec.hook.used ) continue;
    rec.hook.sessions += 1;
    await saveRecord(a, rec);
    if ( R.hookDue(rec.hook) && rec.hook.sessions === R.HOOK_SESSIONS ) {
      await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Before the First Night"},
        content: `<div class="wodx-card"><h3>A story hook waits</h3><p>${esc(a.name)}'s hook has not come into play after ${R.HOOK_SESSIONS} sessions: <em>${esc(rec.hook.text)}</em></p></div>`});
    }
  }
}

/* ------------------------------------------------------------------ */
/*  What the sheet and the other modules say                            */
/* ------------------------------------------------------------------ */

function features(actor) {
  const T = chron()?.traits;
  try { return T?.view?.(actor)?.features ?? []; } catch (e) { return []; }
}

function buildState(actor) {
  // The wizard's ledger (0.24.0): the player's priorities, Merits at cost, Flaws to the cap, the prelude's gains paid
  try {
    const L = ledgerFor(actor);
    return L ? {ok: !!L.ok, left: L.left, line: L.line, unspent: L.unspent.length} : null;
  } catch (e) { return null; }
}

function sessionZeroOpened() {
  return !!game.journal?.find(j => j.getFlag?.("wodx-chronicle", "kind") === "session-zero");
}

/** The sheet's view for the auto steps. */
export function sheetView(actor) {
  const s = actor.system ?? {};
  const feats = features(actor);
  const flaws = feats.filter(f => f.kind === "flaw");
  const rec = recordOf(actor);
  const build = buildState(actor);
  return {concept: s.concept, nature: s.nature, demeanor: s.demeanor, lifepath: !!lifepathOf(actor)?.path,
    build, flawPoints: R.flawPoints(flaws), flawsApproved: !!rec.steps.meritsFlaws?.done || (!flaws.length && !!build?.ok),
    sessionZero: sessionZeroOpened(), recheck: rec.steps.prelude?.done ? {ok: !!build?.ok} : null};
}

function lineKey(actor) {
  const v = actor.system?.settings?.variant ?? "";
  try { return LP.lineFor(actor.type, v); } catch (e) { return "mortal"; }
}

function languagesCheck(actor) {
  const L = chron()?.languages;
  if ( !L?.of ) return null;
  const mine = L.of(actor);
  const others = pcs().filter(a => a.id !== actor.id).map(a => L.of(a));
  return {mine, shared: R.sharesLanguage(mine, others)};
}

async function gearCheck(actor) {
  const A = api("wodx-sheets")?.anachronism;
  if ( !A?.scan ) return [];
  try {
    const C = chron();
    const after = {era: C?.eras?.activeEra?.()?.profile?.id ?? null, year: Number(C?.eras?.currentYear?.()) || 0};
    const rows = await A.scan({era: "__creation__", year: -100000}, after, [actor]);
    return (rows[0]?.items ?? []).map(i => ({name: i.name, note: i.note}));
  } catch (e) { return []; }
}

/** Everything the forecast reads, gathered from the modules that are on. */
export async function gather(actor) {
  const C = chron(), T = C?.traits, S = C?.signatures, NPC = api("wodx-npc");
  const year = yearNow();
  const src = {name: actor.name, line: lineKey(actor), year, dial: recordOf(actor).dial};
  try { const era = C?.eras?.activeEra?.()?.profile; src.nowEra = era ? {id: era.id, end: era.end} : null; } catch (e) { src.nowEra = null; }
  try {
    const t = T?.of?.(actor);
    src.traits = (t?.matched ?? []).map(m => ({key: m.key, name: m.name, kind: m.kind, value: m.value}));
  } catch (e) { src.traits = []; }
  try {
    const TR = await import("../../wodx-chronicle/scripts/trait-rules.mjs");
    src.tables = {PULLS: TR.PULLS, LEDGER: TR.LEDGER, PROMPTS: TR.PROMPTS, TRIGGERS: TR.TRIGGERS, BG_WORLD: TR.BG_WORLD};
  } catch (e) { src.tables = {}; }
  try { src.plan = (T?.worldPlan?.(actor) ?? []).map(b => ({key: b.key, label: b.name, count: b.people ? b.count : 1, made: b.have})); } catch (e) { src.plan = []; }
  try {
    // The clan or splat row, whether or not that line's features are switched on yet
    let rows = S?.rowsOf?.(actor) ?? [];
    if ( !rows.length && S?.rules?.vampireRow && actor.type === "Vampire" ) {
      const s = actor.system ?? {};
      const r = S.rules.vampireRow(...[actor.flags?.["wodx-actions"]?.bloodline, s.clan === "custom" ? s.custom?.clan : s.clan, s.custom?.clan].filter(Boolean));
      rows = r ? [r] : [];
    }
    src.splat = rows.map(r => ({title: r.title, text: r.text, label: r.label}));
  } catch (e) { src.splat = []; }
  src.generation = actor.type === "Vampire" ? (generationOf(actor) || 0) : 0;
  try {
    const h = actor.system?.advantages?.path ?? null;
    if ( h && typeof h === "object" && Number(h.permanent) > 0 ) {
      const label = h.label === "custom" ? (h.custom || "Road") : /^wod\./.test(String(h.label ?? "")) ? "Humanity" : (h.label || "Humanity");
      src.road = {name: label, value: Number(h.permanent)};
    }
  } catch (e) { /* none */ }
  const lp = lifepathOf(actor);
  if ( lp?.path ) {
    let people = lp.people ?? [];
    try { if ( !people.length ) people = LP.summary(lp.path, {nowYear: year}).people; } catch (e) { /* none */ }
    src.lifepath = {people, kept: lp.kept ?? []};
  }
  try {
    const st = NPC?.factions?.state?.() ?? null;
    src.standing = (st?.factions ?? []).filter(f => !f.dormant).map(f => ({faction: f.name, step: Number(f.people?.[actor.id]) || 0, word: NPC?.factions?.rules?.peopleWord?.(f.people?.[actor.id])?.toLowerCase()}));
  } catch (e) { src.standing = []; }
  try {
    const RV = NPC?.rivalry;
    const mine = RV?.sidesOf?.(actor)?.own ?? [];
    src.rivals = mine.length ? R.enemiesOf(mine, year, RV.rules?.RIVALRIES ?? [], RV.rules) : [];
  } catch (e) { src.rivals = []; }
  try { src.events = (C?.events?.list?.() ?? []).map(e => ({id: e.id, name: e.name, year: e.year, lines: e.lines, summary: e.summary, on: e.live !== false})); } catch (e) { src.events = []; }
  src.troupeLanguages = languagesCheck(actor);
  src.gear = await gearCheck(actor);
  return src;
}

export async function forecastFor(actor) { return R.forecast(await gather(actor)); }

export async function fitFor(actor) {
  const year = yearNow(), line = lineKey(actor);
  const src = {lineOpen: LP.lineOpen(line, year), troupeLanguages: languagesCheck(actor), gear: await gearCheck(actor)};
  try {
    const key = LP.guessSplat(line, splatText(actor));
    const sp = key ? LP.splatByKey(line, key) : null;
    if ( sp ) src.splatOpen = {ok: LP.inSpans(sp.spans, year), note: `${sp.label} is not found in ${year}.`};
  } catch (e) { /* no splat */ }
  return R.fitWarnings(src);
}

/** Sign-off: tick it and send the forecast, the player's view to the owners and the whole one to the Storyteller, then the seed cards. */
export async function signOff(actor) {
  if ( !game.user.isGM ) return null;
  const src = await gather(actor);
  const items = R.forecast(src);
  const rec = recordOf(actor);
  rec.steps.signoff = {done: true, at: game.time?.worldTime ?? 0, by: game.user.id};
  rec.signed = true;
  rec.at = game.time?.worldTime ?? 0;
  await saveRecord(actor, rec);
  const players = ownerIds(actor).filter(id => !game.users.get(id)?.isGM);
  if ( players.length ) await ChatMessage.create({whisper: players, speaker: {alias: "Before the First Night"},
    content: `<div class="wodx-card wodx-fn-card"><h3>${esc(actor.name)} is ready for the first night</h3>${R.forecastHtml(R.playerView(items), {esc})}</div>`});
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Before the First Night"},
    content: `<div class="wodx-card wodx-fn-card"><h3>${esc(actor.name)}: trouble ahead</h3>${R.forecastHtml(items, {gm: true, esc})}</div>`});
  // Then one card per thing the world can be given: enemies, Ledger entries, Backgrounds, dated hooks, standing
  try { await postSeedCards(actor, items, src.rivals ?? []); } catch (e) { console.error(`${MODULE_ID} | seed cards`, e); }
  Hooks.callAll("wodxFirstNightSigned", actor, items);
  FirstNightApp.refresh();
  return items;
}

/* ------------------------------------------------------------------ */
/*  The window                                                         */
/* ------------------------------------------------------------------ */

export class FirstNightApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["wodx", "wodx-first-night"],
    window: {title: "Before the First Night", icon: "fa-solid fa-moon", resizable: true},
    position: {width: 680, height: "auto"},
    actions: {
      open: FirstNightApp.#onOpen, done: FirstNightApp.#onDone, undo: FirstNightApp.#onUndo, actor: FirstNightApp.#onActor,
      troupe: FirstNightApp.#onTroupe, ties: () => sendTies(), meeting: () => meetingJournal(), signoff: FirstNightApp.#onSignOff, hook: FirstNightApp.#onHook, hookUsed: FirstNightApp.#onHookUsed
    }
  };

  static open(actor = null) {
    if ( !isOn() ) return ui.notifications.info("Before the First Night is off in this world (Configure Settings, WoDX Creation).");
    if ( !actor && !game.user.isGM ) actor = game.user.character ?? pcs().find(a => a.isOwner) ?? null;
    if ( !actor && !game.user.isGM ) return ui.notifications.warn("You have no character yet. Ask the Storyteller to make one for you.");
    if ( actor && !actor.isOwner ) return ui.notifications.warn("You can only open your own character's steps.");
    const height = Math.max(440, Math.min(820, window.innerHeight - 80));
    const app = new FirstNightApp({actor, id: "wodx-first-night", position: {height}});
    return app.render({force: true});
  }

  static refresh() { foundry.applications.instances?.get?.("wodx-first-night")?.render(); }

  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null;
    this.forecast = null;
  }

  get title() { return this.actor ? `Before the First Night: ${this.actor.name}` : "Before the First Night"; }

  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = this.actor ? await this.#actorHTML() : this.#troupeHTML();
    div.querySelector("select[name=dial]")?.addEventListener("change", ev => this.#setDial(ev.target.value));
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  #troupeHTML() {
    const rows = pcs().map(a => {
      const st = R.stepStates(recordOf(a), sheetView(a));
      const done = st.filter(s => s.state === "done").length;
      const rec = recordOf(a);
      return `<tr><td>${esc(a.name)}</td><td>${done} of ${st.length}</td><td>${rec.signed ? "Signed off" : ""}${R.hookDue(rec.hook) ? " · hook waits" : ""}</td>
        <td><button type="button" data-action="actor" data-id="${a.id}">Open</button></td></tr>`;
    }).join("");
    return `<div class="wodx-top"><p class="wodx-prompt">Each player character's steps before the first night. Players work through their own; you approve and sign off.</p>
      <div class="wodx-buttons"><button type="button" data-action="ties"><i class="fa-solid fa-link"></i> Send the tie questions</button>
      <button type="button" data-action="meeting"><i class="fa-solid fa-people-group"></i> How they met</button></div></div>
      <div class="wodx-scroll">${rows ? `<table class="wodx-table"><thead><tr><th>Character</th><th>Steps</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table>`
        : `<p class="wodx-quiet">No player characters yet. Make a character and give a player ownership of it.</p>`}</div>`;
  }

  async #actorHTML() {
    const a = this.actor, gm = game.user.isGM, rec = recordOf(a), view = sheetView(a);
    const waiting = (chron()?.approvals?.pending?.() ?? []).filter(e => e.type === STEP_APPROVAL && e.data?.actorId === a.id).map(e => e.data.step);
    const states = R.stepStates(rec, view, waiting);
    this.forecast ??= await forecastFor(a);
    const fit = await fitFor(a);
    const tables = (await import("../../wodx-chronicle/scripts/trait-rules.mjs").catch(() => ({})));
    const flaws = features(a).filter(f => f.kind === "flaw");
    const extra = {
      build: view.build ? (!view.build.ok ? `${-view.build.left} freebie points too many.` : view.build.unspent ? `Points still to spend in ${view.build.unspent} ${view.build.unspent === 1 ? "step" : "steps"}; ${view.build.left} freebie points left.` : `Matches the book's totals; ${view.build.left} freebie points left.`) : "",
      recheck: view.recheck ? (view.recheck.ok ? "Still matches the book after the prelude." : "The prelude left the build over the book's totals. Take a dot back in the wizard.") : "After the prelude is done.",
      meritsFlaws: `${view.flawPoints} of ${R.FLAW_CAP} flaw points.${view.flawPoints > R.FLAW_CAP ? " Over the cap." : ""}${flaws.length ? `<ul class="wodx-fn-costs">${flaws.map(f => {
        const m = chron()?.traits?.of?.(a)?.matched?.find(x => x.id === f.id);
        const cost = m ? R.costLine(m.key, tables) : "";
        return `<li>${esc(f.name)}${cost ? `: <span class="wodx-quiet">${esc(cost)}</span>` : ""}</li>`;
      }).join("")}</ul>` : ""}`,
      fit: fit.length ? `<ul>${fit.map(w => `<li>${esc(w.text)}</li>`).join("")}</ul>` : "Nothing out of place for this year.",
      forecast: `${this.forecast.length} item${this.forecast.length === 1 ? "" : "s"} below.`
    };
    const sign = R.canSignOff(states);
    const card = s => {
      const ticked = !!rec.steps[s.key]?.done;
      const btns = [
        OPENS[s.key] && (!OPENS[s.key].gm || gm) ? `<button type="button" data-action="open" data-step="${s.key}">${esc(typeof OPENS[s.key].label === "function" ? OPENS[s.key].label() : OPENS[s.key].label)}</button>` : "",
        s.state !== "done" && !s.last ? `<button type="button" data-action="done" data-step="${s.key}">${gm ? "Tick" : "Mark done"}</button>` : "",
        s.last && gm && s.state !== "done" ? `<button type="button" data-action="signoff" ${sign.ok ? "" : "disabled"} title="${sign.ok ? "" : esc(`Still open: ${sign.missing.join(", ")}`)}">Sign off</button>` : "",
        gm && ticked ? `<button type="button" data-action="undo" data-step="${s.key}">Undo</button>` : ""
      ].join("");
      const state = s.state === "done" ? `<i class="fa-solid fa-check"></i> Done${s.byAuto ? " (the sheet shows it)" : ""}` : s.state === "waiting" ? "Waiting for the Storyteller" : s.optional ? "Optional" : "Open";
      const isNext = s.key === list.next;
      const inner = `<div class="wodx-quiet">${esc(s.hint)}</div>${extra[s.key] ? `<div>${extra[s.key]}</div>` : ""}<div class="wodx-buttons">${btns}</div>`;
      // Done steps fold to one line; the next step is marked (B2829)
      if ( s.state === "done" ) return `<li class="wodx-fn-step wodx-fn-done"><details><summary><b>${esc(s.label)}</b> <span class="wodx-quiet">${state}</span></summary>${inner}</details></li>`;
      return `<li class="wodx-fn-step wodx-fn-${s.state}${isNext ? " wodx-fn-next" : ""}"${isNext ? ' aria-current="step"' : ""}><div><b>${esc(s.label)}</b> <span class="wodx-quiet">${state}</span>${isNext ? ' <span class="wodx-tag">Next</span>' : ""}</div>
        ${inner}</li>`;
    };
    const list = R.checklist(states, {gm});
    const dial = Object.entries(R.DIAL).map(([k, v]) => `<option value="${k}" ${k === rec.dial ? "selected" : ""}>${esc(v.label)}</option>`).join("");
    const hook = rec.hook ? `<p><b>Story hook:</b> ${esc(rec.hook.text)} <span class="wodx-quiet">${rec.hook.used ? "brought in" : rec.hook.agreed ? `agreed, ${rec.hook.sessions} session${rec.hook.sessions === 1 ? "" : "s"} so far` : "waiting for the Storyteller"}</span>
      ${gm && rec.hook.agreed && !rec.hook.used ? `<button type="button" data-action="hookUsed">It came into play</button>` : ""}</p>` : "";
    const shown = gm ? this.forecast : R.playerView(this.forecast);
    const late = !rec.signed && underWay(pcs().filter(x => x.id !== a.id).map(x => x.flags?.[MODULE_ID]?.[FLAG]));
    return `<div class="wodx-top"><p class="wodx-prompt">The steps before ${esc(a.name)}'s first night, in any order. Sign-off comes last. <b>${list.left ? `${list.left} of ${list.total} left.` : "Every step is done."}</b>${list.next ? ` Next: ${esc(R.stepByKey(list.next)?.label ?? "")}.` : ""}${late ? " The chronicle is already under way: the forecast reads the current year, and the prelude can be short." : ""}</p>
        ${gm ? `<button type="button" data-action="troupe"><i class="fa-solid fa-users"></i> The whole troupe</button>` : ""}</div>
      <div class="wodx-scroll">
        <ol class="wodx-fn-steps">${states.map(card).join("")}</ol>
        <h3>Trouble ahead</h3>
        <p class="wodx-quiet">${gm ? "Everything WoDX can see. Lines marked Storyteller only are hidden from the player." : "What your character would know of. The Storyteller may know more."}</p>
        ${R.forecastHtml(shown, {gm, esc})}
        <h3>How much trouble</h3>
        <div class="form-group"><label>Trouble from this character's own flaws and ties</label><select name="dial" data-fixed>${dial}</select></div>
        ${hook}
        <p><button type="button" data-action="hook"><i class="fa-solid fa-feather"></i> ${rec.hook ? "Change the story hook" : "Name a story hook"}</button>
        <span class="wodx-quiet">One flaw or tie the Storyteller agrees to bring into the story.</span></p>
      </div>`;
  }

  async #setDial(value) {
    if ( !this.actor || !R.DIAL[value] ) return;
    const rec = recordOf(this.actor);
    rec.dial = value;
    await saveRecord(this.actor, rec);
    this.forecast = null;
    this.render();
  }

  static async #onOpen(ev, el) {
    const fn = OPENS[el.dataset.step]?.run;
    if ( fn ) await fn(this.actor);
  }

  static async #onDone(ev, el) {
    const step = el.dataset.step, a = this.actor;
    if ( game.user.isGM ) return tick(a.id, step);
    const s = R.stepByKey(step);
    await chron()?.propose?.({type: STEP_APPROVAL, key: `firstnight:${a.id}:${step}`, title: `${a.name}: ${s.label} done`,
      detail: `${a.name}'s player marks "${s.label}" done before the first night.`, data: {actorId: a.id, step}});
    ui.notifications.info("Sent to the Storyteller.");
    this.render();
  }

  static async #onUndo(ev, el) { await untick(this.actor.id, el.dataset.step); }
  static #onActor(ev, el) { this.actor = game.actors.get(el.dataset.id) ?? null; this.forecast = null; this.render(); }
  static #onTroupe() { this.actor = null; this.forecast = null; this.render(); }
  static async #onSignOff() { await signOff(this.actor); ui.notifications.info(`${this.actor.name} is signed off. The forecast went to chat.`); }

  static async #onHook() {
    const a = this.actor, rec = recordOf(a);
    const {DialogV2} = foundry.applications.api;
    const text = await DialogV2.prompt({window: {title: "A story hook"}, rejectClose: false,
      content: `<p class="wodx-quiet">Name one flaw, enemy or tie from the past that you want the story to come back to. The Storyteller agrees to bring it in.</p>
        <div class="form-group"><input type="text" name="hook" maxlength="200" value="${esc(rec.hook?.text ?? "")}"></div>`,
      ok: {label: "Send", callback: (e, b) => b.form.elements.hook.value.trim()}});
    if ( !text ) return;
    rec.hook = {text, agreed: game.user.isGM, since: game.time?.worldTime ?? 0, sessions: 0, used: false};
    await saveRecord(a, rec);
    if ( !game.user.isGM ) await chron()?.propose?.({type: HOOK_APPROVAL, key: `firstnight-hook:${a.id}`, title: `${a.name}'s story hook`, detail: text, data: {actorId: a.id}});
    this.render();
  }

  static async #onHookUsed() {
    const rec = recordOf(this.actor);
    if ( !rec.hook ) return;
    rec.hook.used = true;
    await saveRecord(this.actor, rec);
    this.render();
  }
}

/** What each step's button opens. */
const OPENS = {
  sessionZero: {label: "Session Zero", run: () => chron()?.safety?.openSessionZero?.()},
  concept: {label: "The sheet", run: a => a.sheet?.render(true)},
  lifepath: {label: "Lifepath", run: a => LifepathApp.openFor(a)},
  build: {label: "Wizard", run: a => WizardApp.openFor(a)},
  meritsFlaws: {label: "Merits and Flaws", run: a => WizardApp.openFor(a, "meritsFlaws")},
  recheck: {label: "Last look", run: a => WizardApp.openFor(a, "review")},
  prelude: {label: () => (game.user.isGM ? "Run the prelude" : "Write my prelude"), run: a => (game.user.isGM ? PreludeRunApp.openFor(a) : writtenPrelude(a))},
  ties: {label: () => (game.user.isGM ? "Send the tie questions" : "The group"), run: () => (game.user.isGM ? sendTies() : game.actors.find(x => /group/i.test(String(x.type)))?.sheet?.render(true))}
};

/** A "Before the First Night" button on the header of an owned character sheet, beside Lifepath. */
export function registerSheetButton() {
  const usable = actor => isOn() && actor?.isOwner && actor.hasPlayerOwner && !/group|spirit|creature/i.test(String(actor.type));
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    if ( !usable(sheet.actor) ) return;
    buttons.unshift({label: "First Night", class: "wodx-first-night", icon: "fa-solid fa-moon", onclick: () => FirstNightApp.open(sheet.actor)});
  });
  Hooks.on("getHeaderControlsActorSheetV2", (sheet, controls) => {
    if ( !usable(sheet.actor) ) return;
    controls.push({label: "Before the First Night", icon: "fa-solid fa-moon", action: "wodxFirstNight", onClick: () => FirstNightApp.open(sheet.actor)});
  });
}
