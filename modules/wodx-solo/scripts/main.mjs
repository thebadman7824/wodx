/**
 * WoDX Solo (the version is in module.json): The Lone Chronicle, for one person playing alone.
 *
 * WoDX works things out on the active Storyteller's browser, so somebody has to hold that seat. Here a hidden browser
 * does (tools/solo/seat.mjs signs it in), and the person playing logs in as a player, so Foundry itself keeps the
 * Storyteller's whispers, sheets and rolls from them. This module is what the seat runs:
 *   the switch   world setting "on": every automation is set to act by itself (solo-rules.mjs PRESET) and each kind of
 *                approval gets a standing rule; the old values are kept in "before" and put back when it goes off
 *   the watcher  a card whispered to the Storyteller, a window opened on the seat or an entry left in the approval
 *                queue is answered after "wait" seconds when the choice is plain, and logged either way
 *   the scene    the seat views the scene the player views (it looks every two seconds), since NPC sight and reach
 *                are read from the seat's map
 *
 *   setting wodx-solo.on      Boolean  the switch
 *   setting wodx-solo.before  {at, settings: [{mod, key, from, to}], auto: {type: true}}  the way back
 *   setting wodx-solo.log     {v, entries}  what the seat decided (solo-rules.mjs addEntry)
 *
 * It never acts in the Live world. Everything here runs on the active Storyteller's client, except the notice a
 * player gets when the seat is empty.
 */
import * as R from "./solo-rules.mjs";

const MOD = "wodx-solo";
const CHRON = "wodx-chronicle";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const chron = () => game.modules.get(CHRON)?.api ?? null;
const get = key => { try { return game.settings.get(MOD, key); } catch (e) { return undefined; } };
const blocked = () => R.NEVER_WORLDS.includes(game.world?.id) || !game.world?.flags?.wodx;
const isOn = () => get("on") === true && !blocked();
const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
const isSeat = () => isOn() && isActiveGM();
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const waitMs = () => Math.max(1, Number(get("wait")) || 4) * 1000;
const acts = () => get("act") !== false;

/** A setting's present value, or undefined when its module is off or the setting is not registered. */
function read(mod, key) {
  if ( !game.modules.get(mod)?.active || !game.settings.settings.has(`${mod}.${key}`) ) return undefined;
  try { return game.settings.get(mod, key); } catch (e) { return undefined; }
}

/* ------------------------------------------------------------------ */
/*  The log: one write at a time                                       */
/* ------------------------------------------------------------------ */

let writing = Promise.resolve();
function log(entry) {
  if ( !isActiveGM() ) return writing;
  const e = {at: Date.now(), wt: game.time.worldTime, ...entry};
  writing = writing.then(() => game.settings.set(MOD, "log", R.addEntry(get("log"), e))).catch(err => console.warn(`${MOD} | log`, err));
  return writing;
}
const entries = () => R.normLog(get("log")).entries;

/* ------------------------------------------------------------------ */
/*  The switch                                                         */
/* ------------------------------------------------------------------ */

/** Set everything for play alone. Run again it only tops up: the first values kept stay the way back. */
async function apply() {
  if ( !isActiveGM() || blocked() ) return null;
  const before = foundry.utils.deepClone(get("before") ?? {});
  const fresh = !before.at;
  const plan = R.planPreset(read);
  for ( const c of plan.changes ) await game.settings.set(c.mod, c.key, c.to);
  const ap = chron()?.approvals;
  const autoNow = foundry.utils.deepClone(read(CHRON, "autoApprove") ?? {});
  const turnOn = R.autoPlan(ap?.types?.() ?? [], autoNow);
  for ( const t of turnOn ) await ap.setAuto(t, true);
  if ( fresh ) {
    await game.settings.set(MOD, "before", {at: Date.now(), settings: plan.changes.map(({mod, key, from, to}) => ({mod, key, from, to})), auto: autoNow});
  } else if ( plan.changes.length ) {
    // A setting drifted back while the switch was on: remember it too, unless it is already on the list
    const known = new Set((before.settings ?? []).map(c => `${c.mod}.${c.key}`));
    before.settings = [...(before.settings ?? []), ...plan.changes.filter(c => !known.has(`${c.mod}.${c.key}`)).map(({mod, key, from, to}) => ({mod, key, from, to}))];
    await game.settings.set(MOD, "before", before);
  }
  if ( fresh || plan.changes.length || turnOn.length ) {
    await log({kind: "preset", source: MOD, title: fresh ? `${R.NAME} begins` : "The switch topped up",
      note: `${plan.changes.length} settings, ${turnOn.length} standing approvals${plan.missing.length ? `, ${plan.missing.length} not found` : ""}`});
  }
  if ( fresh ) {
    const rows = plan.changes.map(c => `<li>${esc(c.what)}</li>`).join("");
    await ChatMessage.create({whisper: gmIds(), speaker: {alias: R.NAME},
      content: `<p><b>${esc(R.NAME)} begins.</b> The game now acts by itself:</p><ul>${rows || "<li>everything was already set</li>"}</ul>`
        + `<p>${turnOn.length} kinds of approval are given on sight.${plan.missing.length ? ` Not found, so left alone: ${esc(plan.missing.map(m => `${m.mod} ${m.key}`).join(", "))}.` : ""} Turn the setting off to put it all back.</p>`});
  }
  return {changes: plan.changes, missing: plan.missing, approvals: turnOn};
}

/** Put back what the switch changed, where nobody has changed it since. */
async function restore() {
  if ( !isActiveGM() ) return null;
  const before = get("before") ?? {};
  if ( !before.at ) return {back: [], kept: []};
  const plan = R.planRestore(before.settings, read);
  for ( const c of plan.back ) await game.settings.set(c.mod, c.key, c.to);
  if ( read(CHRON, "autoApprove") !== undefined ) await game.settings.set(CHRON, "autoApprove", before.auto ?? {});
  await game.settings.set(MOD, "before", {});
  await log({kind: "preset", source: MOD, title: `${R.NAME} ends`, note: `${plan.back.length} settings put back${plan.kept.length ? `, ${plan.kept.length} left as changed by hand` : ""}`});
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: R.NAME},
    content: `<p><b>${esc(R.NAME)} ends.</b> ${plan.back.length} settings and the standing approvals are back as they were.</p>`});
  return plan;
}

function onSwitch() {
  if ( !isActiveGM() ) return;
  if ( blocked() ) { if ( get("on") ) ui.notifications.warn(`${R.NAME} does nothing in this world.`); return; }
  (get("on") ? apply() : restore()).catch(e => console.error(`${MOD} | switch`, e));
}

/* ------------------------------------------------------------------ */
/*  The watcher                                                        */
/* ------------------------------------------------------------------ */

/** The live button on a rendered card that matches a button read from its text. */
function findButton(messageId, pick) {
  const roots = [...document.querySelectorAll(`[data-message-id="${messageId}"]`)];
  for ( const root of roots ) {
    const live = [...root.querySelectorAll("button, a[data-action]")].filter(b => !b.disabled && !b.hasAttribute("disabled"));
    const el = live[pick.n];
    if ( el && R.plain(el.innerHTML) === pick.label ) return el;
    const byLabel = live.find(b => R.plain(b.innerHTML) === pick.label);
    if ( byLabel ) return byLabel;
  }
  return null;
}

function onMessage(msg) {
  if ( !isSeat() || !R.forStoryteller(msg.whisper, gmIds()) ) return;
  const buttons = R.buttonsOf(msg.content);
  if ( !R.waits(buttons) ) return;
  const was = msg.content;
  setTimeout(async () => {
    try {
      if ( !isSeat() ) return;
      const now = game.messages.get(msg.id);
      const base = {kind: "card", source: R.sourceOf(msg.flags), title: R.titleOf(msg), buttons: buttons.map(b => b.label)};
      // A card that is gone or rewritten was answered by its own module in the meantime
      if ( !now || now.content !== was ) return;
      const pick = R.pickButton(buttons);
      if ( !pick ) return log({...base, note: "no plain choice"});
      if ( !acts() ) return log({...base, choice: pick.label, note: "the seat only watches"});
      const el = findButton(msg.id, pick);
      if ( el ) el.click();
      return log({...base, choice: pick.label, acted: !!el, note: el ? pick.why : "button not found on the seat's screen"});
    } catch (e) { console.warn(`${MOD} | card`, e); }
  }, waitMs());
}

const seenWindows = new WeakSet();
function onDialog(app, element) {
  if ( !isSeat() || seenWindows.has(app) ) return;
  seenWindows.add(app);
  const root = element instanceof HTMLElement ? element : app.element;
  const title = app.title ?? app.options?.window?.title ?? "A window";
  setTimeout(async () => {
    try {
      if ( !isSeat() || !app.rendered ) return;
      const live = [...(root?.querySelectorAll?.("footer button, .form-footer button, .dialog-buttons button") ?? [])].filter(b => !b.disabled);
      const labels = live.map(b => R.plain(b.innerHTML));
      const def = live.find(b => b.autofocus || b.hasAttribute("autofocus") || b.classList.contains("default"));
      const pick = def ? {label: R.plain(def.innerHTML), why: "the window's own first choice"}
        : R.pickButton(labels.map((label, n) => ({label, n, action: ""})));
      const el = def ?? (pick ? live[pick.n] : null);
      const base = {kind: "window", source: app.constructor?.name ?? "window", title: String(title), buttons: labels};
      if ( !pick || !el || R.AVOID.test(pick.label) ) return log({...base, note: "no plain choice"});
      if ( !acts() ) return log({...base, choice: pick.label, note: "the seat only watches"});
      el.click();
      return log({...base, choice: pick.label, acted: true, note: pick.why});
    } catch (e) { console.warn(`${MOD} | window`, e); }
  }, waitMs());
}

const seenQueue = new Set();
function onQueue() {
  if ( !isSeat() ) return;
  const pending = chron()?.approvals?.pending?.() ?? [];
  for ( const p of pending ) {
    if ( !p?.id || seenQueue.has(p.id) ) continue;
    seenQueue.add(p.id);
    setTimeout(() => {
      if ( !isSeat() ) return;
      const still = (chron()?.approvals?.pending?.() ?? []).some(x => x.id === p.id);
      if ( still ) log({kind: "queue", source: String(p.type ?? ""), title: String(p.title ?? p.type ?? "An entry"), note: "waits in the approval queue"});
    }, waitMs());
  }
}

/* ------------------------------------------------------------------ */
/*  The scene                                                          */
/* ------------------------------------------------------------------ */

/** The seat views what the player views. */
async function follow(user) {
  if ( !isSeat() || !user || user.isGM || !user.active ) return;
  const scene = game.scenes.get(user.viewedScene);
  if ( !scene || canvas.scene?.id === scene.id ) return;
  try {
    await scene.view();
    await log({kind: "scene", source: MOD, title: scene.name, note: `following ${user.name}`});
  } catch (e) { console.warn(`${MOD} | follow`, e); }
}
const player = () => game.users.find(u => !u.isGM && u.active) ?? null;
/**
 * Foundry tells other clients which scene a user views as passing activity, not as a change to the user, so no hook
 * fires for it (0.1.1). The seat looks every two seconds instead; follow() does nothing when the scene is the same.
 */
let watching = null;
function watchPlayer() {
  if ( watching ) return;
  watching = setInterval(() => { if ( isSeat() ) follow(player()); }, 2000);
  watching?.unref?.();
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

Hooks.once("init", () => {
  game.settings.register(MOD, "on", {name: R.NAME,
    hint: "For one person playing alone, with a hidden browser in the Storyteller's seat. On: NPCs, routines, factions, fights, turns, dawn and dusk and the night's draw all act by themselves, every kind of approval is given on sight, and the seat answers or records whatever still waits for a Storyteller. Off puts back every value this changed. Never turn it on at a shared table.",
    scope: "world", config: true, type: Boolean, default: false, onChange: onSwitch});
  game.settings.register(MOD, "wait", {name: "The seat waits this long (seconds)",
    hint: "How long a card or window may wait for a Storyteller before the seat takes the choice that goes ahead.",
    scope: "world", config: true, type: Number, default: 4, range: {min: 1, max: 30, step: 1}});
  game.settings.register(MOD, "act", {name: "The seat makes the choice",
    hint: "Off: the seat only writes down what waited and what it would have chosen.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "before", {scope: "world", config: false, type: Object, default: {}});
  game.settings.register(MOD, "log", {scope: "world", config: false, type: Object, default: R.blankLog()});
});

Hooks.once("ready", () => {
  const api = {
    rules: R, isOn, isSeat, apply, restore,
    log: {entries: () => (game.user.isGM ? entries() : []), add: log,
      stalls: (since = 0) => (game.user.isGM ? R.stallReport(entries(), since) : R.stallReport([], since)),
      clear: () => (game.user.isGM ? game.settings.set(MOD, "log", R.blankLog()) : null)}
  };
  game.modules.get(MOD).api = api;
  game.wodx = Object.assign(game.wodx ?? {}, {solo: api});

  Hooks.on("createChatMessage", onMessage);
  Hooks.on("renderDialogV2", onDialog);
  Hooks.on("updateSetting", s => { if ( s?.key === `${CHRON}.approvals` ) onQueue(); });
  Hooks.on("createSetting", s => { if ( s?.key === `${CHRON}.approvals` ) onQueue(); });
  Hooks.on("updateUser", (u, ch) => { if ( "viewedScene" in (ch ?? {}) || ch?.active ) follow(u); });
  Hooks.on("userConnected", (u, on) => { if ( on ) setTimeout(() => follow(u), 1500); });

  if ( game.user.isGM ) watchPlayer();
  if ( !isOn() ) return;
  if ( isActiveGM() ) {
    // Other modules register their approval types in their own ready hooks: top up once they have
    setTimeout(() => { apply().catch(e => console.error(`${MOD} | top up`, e)); onQueue(); follow(player()); }, 3000);
  } else if ( !game.user.isGM && !game.users.activeGM ) {
    ui.notifications.warn(`${R.NAME}: the Storyteller's seat is empty, so the world stands still. Start the seat and it will carry on.`, {permanent: true});
  }
});
