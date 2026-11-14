/**
 * WoDX Solo 0.2.0: the player's panel, step 2 of The Lone Chronicle (B2640 to B2644).
 *
 * The person playing alone is a real player, so nothing here shows them a Storyteller's secret. The panel sends each
 * ask to the seat over the module's socket, and the seat does it:
 *   Let time pass     wait ten minutes, an hour, until dusk or dawn, or sleep the day; the clock moves in steps of ten
 *                     minutes and stops early when something happens (solo-rules.mjs WAITS)
 *   Travel            WoDX Storyteller's Out on your own window, whose requests the standing approvals let through
 *   Pause or go on    the seat pauses the game or starts it again
 *   I am stuck        bring me a lead, free my token, end a hung fight or window (solo-rules.mjs STUCK)
 *   Lift the curtain  asks first, then shows what the seat decided tonight; the night is marked as seen
 *
 *   setting wodx-solo.seen   [night start, ...]  nights the player looked behind the curtain
 *
 * The Storyteller's own client runs the asks; a player's client only draws the panel and the answers.
 */
import * as R from "./solo-rules.mjs";

const MOD = "wodx-solo";
const SOCKET = `module.${MOD}`;
const ST = "wodx-storyteller";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const {ApplicationV2, DialogV2} = foundry.applications.api;

let H = null; // what main.mjs lends: {isOn, isSeat, log, entries, get}

/* ------------------------------------------------------------------ */
/*  Who and where                                                      */
/* ------------------------------------------------------------------ */

/**
 * The character a player plays (0.2.1): the one assigned to them; else one they own with a token on the scene they
 * view, one they own alone before one they share; else the first they own alone, then the first they own at all.
 */
const ownable = a => a?.hasPlayerOwner && !/group/i.test(String(a.type ?? ""));
const ownsAlone = (a, user) => !all(game.users).some(u => u.id !== user.id && !u.isGM && a.testUserPermission?.(u, "OWNER"));
function characterOf(user) {
  if ( !user ) return null;
  if ( user.character ) return user.character;
  const mine = all(game.actors).filter(a => ownable(a) && a.testUserPermission?.(user, "OWNER"));
  const viewed = game.scenes?.get?.(user.viewedScene) ?? all(game.scenes).find(s => s.id === user.viewedScene);
  const onView = viewed ? mine.filter(a => all(viewed.tokens).some(t => t.actorId === a.id)) : [];
  const alone = list => list.find(a => ownsAlone(a, user));
  return alone(onView) ?? onView[0] ?? alone(mine) ?? mine[0] ?? null;
}
/** The scene and token where the character is: the one the player views first, else any that holds a token. */
function placeOf(user) {
  const actor = characterOf(user);
  if ( !actor ) return {actor: null, scene: null, token: null};
  const scenes = all(game.scenes);
  const holds = s => all(s.tokens).find(t => t.actorId === actor.id) ?? null;
  const viewed = scenes.find(s => s.id === user.viewedScene && holds(s));
  const scene = viewed ?? scenes.find(s => s.active && holds(s)) ?? scenes.find(holds) ?? null;
  return {actor, scene, token: scene ? holds(scene) : null};
}
const fightOn = sceneId => all(game.combats).filter(c => c.started && c.scene?.id === sceneId);

async function latitudeAt(scene) {
  try { return game.modules.get("wodx-chronicle")?.api?.place?.latitudeFor?.(scene) ?? game.settings.get("wodx-chronicle", "latitude"); }
  catch (e) { return 50; }
}
async function sunFrom(scene) {
  const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
  const lat = await latitudeAt(scene), now = game.time.worldTime;
  return {toDusk: cal.secondsToNextDusk(now, lat), toDawn: cal.secondsToNextDawn(now, lat)};
}

/** A whisper to the player and the seat from The Lone Chronicle. */
async function tell(userId, html) {
  const ids = [...new Set([userId, ...game.users.filter(u => u.isGM).map(u => u.id)].filter(Boolean))];
  return ChatMessage.create({whisper: ids, speaker: {alias: R.NAME}, flags: {[MOD]: {panel: true}}, content: `<div class="wodx-card">${html}</div>`});
}

/* ------------------------------------------------------------------ */
/*  The seat's side                                                    */
/* ------------------------------------------------------------------ */

let waiting = null; // the wait running now: {userId, choice}

/** Let time pass for a lone player, in steps, stopping when something happens. */
export async function passTime(userId, choice) {
  if ( !H.isSeat() || !R.WAITS[choice] ) return null;
  const user = game.users.get(userId);
  const {actor, scene} = placeOf(user);
  if ( !actor || !scene ) { await tell(userId, "<p>Your character is on no scene, so time cannot pass for them.</p>"); return null; }
  if ( waiting ) { await tell(userId, "<p>Time is already passing.</p>"); return null; }
  if ( fightOn(scene.id).length ) { await tell(userId, "<p>Not while a fight is running.</p>"); return null; }
  if ( game.paused ) { await tell(userId, "<p>The game is paused. Go on first, then let time pass.</p>"); return null; }
  const w = R.WAITS[choice];
  const total = R.secondsFor(choice, w.to ? await sunFrom(scene) : {});
  if ( !total ) { await tell(userId, "<p>No time needs to pass for that.</p>"); return null; }
  const seen = {fight: false, paused: false, word: false, newcomer: false};
  const onMsg = m => {
    if ( m.flags?.[MOD] ) return;
    const w = m.whisper ?? [];
    if ( w.length && w.includes(userId) ) seen.word = true;
  };
  const onToken = (t) => {
    if ( t.parent?.id !== scene.id || t.actorId === actor.id || t.hidden ) return;
    if ( t.flags?.["wodx-npc"]?.passerby ) return;
    seen.newcomer = true;
  };
  const hooks = [["createChatMessage", Hooks.on("createChatMessage", onMsg)], ["createToken", Hooks.on("createToken", onToken)]];
  waiting = {userId, choice};
  let passed = 0, why = null;
  try {
    for ( const step of R.chunks(total) ) {
      await game.time.advance(step);
      passed += step;
      await sleep(400); // the world answers: routines, the fight starter, dawn and dusk
      seen.fight = fightOn(scene.id).length > 0;
      seen.paused = !!game.paused;
      why = R.stopFor(choice, seen);
      if ( why || !H.isSeat() ) break;
    }
  } finally {
    for ( const [name, id] of hooks ) Hooks.off(name, id);
    waiting = null;
  }
  const text = why ? `${esc(w.label)}: stopped after ${esc(R.span(passed))}, because ${esc(R.STOP_WORDS[why])}.` : `${esc(w.label)}: ${esc(R.span(passed))} passed.`;
  await tell(userId, `<p>${text}</p>`);
  await H.log({kind: "note", source: MOD, title: w.label, note: why ? `stopped after ${R.span(passed)}: ${R.STOP_WORDS[why]}` : `${R.span(passed)} passed`});
  return {passed, why};
}

/** Pause the game, or start it again. */
export async function togglePause(userId) {
  if ( !H.isSeat() ) return null;
  const to = !game.paused;
  await game.togglePause(to, {broadcast: true});
  await H.log({kind: "note", source: MOD, title: to ? "The player paused the game" : "The player started the game again", note: game.users.get(userId)?.name ?? ""});
  return to;
}

/** The fixes behind I am stuck. */
export async function unstick(userId, fix) {
  if ( !H.isSeat() || !R.STUCK[fix] ) return null;
  const user = game.users.get(userId);
  const {actor, scene, token} = placeOf(user);
  if ( fix === "token" ) {
    if ( !token || !scene ) { await tell(userId, "<p>Your character has no token on a scene.</p>"); return null; }
    const to = R.wayIn({initial: scene.initial, width: scene.width, height: scene.height, padding: scene.padding, grid: {size: scene.grid?.size}}, token.width ?? 1);
    await token.update({x: to.x, y: to.y}, {animate: false, teleport: true});
    await H.log({kind: "note", source: MOD, title: "I am stuck: the token was freed", note: `${actor.name} back at the way in on ${scene.name}`});
    await tell(userId, "<p>Your character is back at the way in.</p>");
    return to;
  }
  if ( fix === "fight" ) {
    let fights = 0, windows = 0;
    for ( const c of scene ? fightOn(scene.id) : [] ) { await c.delete(); fights++; }
    for ( const app of [...(foundry.applications.instances?.values?.() ?? [])] ) {
      if ( !(app instanceof DialogV2) || !app.rendered ) continue;
      await app.close();
      windows++;
    }
    await H.log({kind: "note", source: MOD, title: "I am stuck: a hung fight or window", note: `${fights} fights ended, ${windows} windows closed`});
    await tell(userId, `<p>${fights ? `${fights === 1 ? "The fight" : `${fights} fights`} ended.` : "No fight was running on your scene."} ${windows ? `${windows} waiting ${windows === 1 ? "window was" : "windows were"} closed.` : ""}</p>`);
    return {fights, windows};
  }
  // A lead: a foreshadowing for the character, through the approval queue (the standing approvals let it through)
  const night = game.modules.get(ST)?.api?.aid;
  const aid = actor && night?.draw ? await night.draw({kind: "foreshadow", actorId: actor.id, nonce: Date.now() % 997}).catch(() => null) : null;
  if ( !aid ) { await tell(userId, "<p>No lead could be found just now.</p>"); return null; }
  await night.propose(aid);
  await H.log({kind: "note", source: MOD, title: "I am stuck: a lead was drawn", note: String(aid.label ?? "a foreshadowing")});
  return aid;
}

/** What the seat decided tonight, for the player who asked. The night is marked as seen. */
export async function curtain(userId) {
  if ( !H.isSeat() ) return null;
  const {scene} = placeOf(game.users.get(userId));
  const since = R.nightStart(game.time.worldTime, (await sunFrom(scene ?? canvas?.scene)).toDusk);
  const rows = R.curtainRows(H.entries(), since);
  await game.settings.set(MOD, "seen", R.markSeen(H.get("seen"), since));
  await H.log({kind: "note", source: MOD, title: "The player lifted the curtain", note: `${rows.length} entries shown`});
  game.socket.emit(SOCKET, {type: "curtain.rows", payload: {userId, since, rows}});
  return rows;
}

/* ------------------------------------------------------------------ */
/*  The socket                                                         */
/* ------------------------------------------------------------------ */

const SEAT = {
  "ask.time": p => passTime(p.userId, p.choice),
  "ask.pause": p => togglePause(p.userId),
  "ask.stuck": p => unstick(p.userId, p.fix),
  "ask.curtain": p => curtain(p.userId)
};

function onSocket(msg) {
  const {type, payload} = msg ?? {};
  if ( type === "curtain.rows" ) {
    if ( payload?.userId === game.user.id ) showCurtain(payload);
    return;
  }
  const run = SEAT[type];
  if ( !run || !H.isSeat() || !game.users.get(payload?.userId) ) return;
  run(payload).catch(e => console.error(`${MOD} | ${type}`, e));
}

/** Any client: send an ask to the seat, or do it here when this client is the seat. */
function ask(type, payload = {}) {
  const p = {...payload, userId: game.user.id};
  if ( H.isSeat() ) return SEAT[type](p).catch(e => console.error(`${MOD} | ${type}`, e));
  if ( !game.users.activeGM ) { ui.notifications.warn(`${R.NAME}: the Storyteller's seat is empty, so nothing can be done.`); return null; }
  game.socket.emit(SOCKET, {type, payload: p});
  return null;
}

/* ------------------------------------------------------------------ */
/*  The player's side                                                  */
/* ------------------------------------------------------------------ */

async function choose(title, choices, intro = "") {
  const opts = Object.entries(choices).map(([k, c], i) => `<label class="wsolo-choice"><input type="radio" name="pick" value="${k}"${i === 0 ? " checked" : ""}> ${esc(c.label)}${c.hint ? `<span class="wodx-quiet"> ${esc(c.hint)}</span>` : ""}</label>`).join("");
  return DialogV2.prompt({classes: ["wodx", "wodx-dialog", "wsolo-dialog"], window: {title},
    content: `${intro ? `<p>${esc(intro)}</p>` : ""}<fieldset class="wsolo-choices" data-fixed>${opts}</fieldset>`,
    ok: {label: "Go", callback: (ev, b) => b.form.querySelector("input[name=pick]:checked")?.value ?? null}, rejectClose: false});
}

const ACTIONS = {
  next() { ask("ask.time", {choice: R.NEXT.wait}); ui.notifications.info(`${R.NEXT.label} ${R.NEXT.hint}`); },
  async time() {
    const pick = await choose("Let time pass", R.WAITS, "The clock moves ten minutes at a time and stops if something happens.");
    if ( pick ) { ask("ask.time", {choice: pick}); ui.notifications.info(`${R.WAITS[pick].label}.`); }
  },
  travel() {
    const open = game.modules.get(ST)?.api?.openOnYourOwn;
    if ( open ) return open();
    ui.notifications.warn("Travel needs WoDX Storyteller.");
  },
  pause() { ask("ask.pause"); },
  async stuck() {
    const pick = await choose("I am stuck", R.STUCK);
    if ( pick ) ask("ask.stuck", {fix: pick});
  },
  async curtain() {
    const yes = await DialogV2.confirm({classes: ["wodx", "wodx-dialog"], window: {title: "Lift the curtain"}, rejectClose: false,
      content: "<p>This shows what the Storyteller's seat decided tonight, secrets and all. Tonight is then marked as seen. Look?</p>"});
    if ( yes ) ask("ask.curtain");
  }
};

function showCurtain({rows = []} = {}) {
  const fmt = wt => { try { return game.time.calendar?.format?.(wt, "timestamp") ?? ""; } catch (e) { return ""; } };
  const body = rows.length ? `<table class="wsolo-curtain"><thead><tr><th>When</th><th>What</th><th>Which</th><th>How it went</th></tr></thead><tbody>${
    rows.map(r => `<tr><td>${esc(fmt(r.wt))}</td><td>${esc(r.kind)}</td><td>${esc(r.title)}</td><td>${esc(r.what)}${r.note ? `<br><span class="wodx-quiet">${esc(r.note)}</span>` : ""}</td></tr>`).join("")}</tbody></table>`
    : "<p>The seat decided nothing tonight.</p>";
  new DialogV2({classes: ["wodx", "wodx-dialog", "wsolo-dialog"], window: {title: "Behind the curtain", resizable: true}, position: {width: 620},
    content: body, buttons: [{action: "ok", label: "Close", default: true}]}).render({force: true});
}

/** The panel: a small window of buttons for the one person playing. */
export class SoloPanel extends ApplicationV2 {
  static moreOpen = false;
  static DEFAULT_OPTIONS = {
    id: "wodx-solo-panel",
    classes: ["wodx", "wsolo-panel"],
    window: {title: R.NAME, icon: "fa-solid fa-moon", resizable: false},
    position: {width: 340, height: "auto", top: 80, left: 120},
    actions: {act: SoloPanel.#onAct}
  };
  static open() {
    const app = foundry.applications.instances?.get?.("wodx-solo-panel") ?? new SoloPanel();
    return app.render({force: true});
  }
  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wsolo-buttons";
    const paused = !!game.paused;
    const rest = R.PANEL.map(b => {
      const icon = b.id === "pause" && paused ? "fa-solid fa-play" : b.icon;
      const label = b.id === "pause" ? (paused ? "Go on" : "Pause") : b.label;
      return `<button type="button" data-action="act" data-id="${b.id}"><i class="${icon}"></i> ${esc(label)}</button>`;
    }).join("");
    // One main button; the rest under More, open once the player has opened it (B2831)
    div.innerHTML = `<button type="button" class="wsolo-next" data-action="act" data-id="${R.NEXT.id}" title="${esc(R.NEXT.hint)}"><i class="${R.NEXT.icon}"></i> ${esc(R.NEXT.label)}</button>
      <p class="wodx-quiet wsolo-next-hint">${esc(R.NEXT.hint)}</p>
      <details class="wsolo-more"${SoloPanel.moreOpen ? " open" : ""}><summary>More: time, travel, pause, I am stuck, the curtain</summary><div class="wsolo-buttons">${rest}</div></details>`;
    div.querySelector("details.wsolo-more")?.addEventListener("toggle", ev => { SoloPanel.moreOpen = ev.target.open; });
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  static #onAct(event, target) {
    const run = ACTIONS[target.dataset.id];
    if ( run ) Promise.resolve(run()).catch(e => console.error(`${MOD} | panel`, e));
  }
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

export function registerPanelSettings() {
  game.settings.register(MOD, "seen", {scope: "world", config: false, type: Array, default: []});
  game.settings.register(MOD, "panel", {name: "Open the panel when the player arrives",
    hint: "The Lone Chronicle's panel opens by itself on the player's screen when they log in.",
    scope: "world", config: true, type: Boolean, default: true});
}

export function installPanel(helpers) {
  H = helpers;
  game.socket.on(SOCKET, onSocket);
  Hooks.on("pauseGame", () => { if ( foundry.applications.instances?.get?.("wodx-solo-panel")?.rendered ) SoloPanel.open(); });
  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens ?? controls.token;
    if ( !tokens?.tools || !H.isOn() ) return;
    tokens.tools.wodxSolo = {name: "wodxSolo", title: `${R.NAME}: your panel (time, travel, pause, I am stuck, the curtain)`, icon: "fa-solid fa-moon", order: 105,
      button: true, visible: !game.user.isGM, onChange: () => SoloPanel.open()};
  });
  if ( !game.user.isGM && H.isOn() && H.get("panel") !== false ) setTimeout(() => SoloPanel.open(), 1000);
}

export const panelApi = {open: () => SoloPanel.open(), ask, passTime, togglePause, unstick, curtain, busy: () => waiting};
