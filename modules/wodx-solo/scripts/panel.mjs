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
/** What st-tools.mjs draws on the panel and opens from it (B4800): {toggleHtml, toolsHtml, open, toggle}. */
const ST_UI = {};
export const setStUi = ui => Object.assign(ST_UI, ui);
/** What arrival.mjs draws on the panel for a player with no character (B5143): {html, open}. */
const ARRIVE_UI = {};
export const setArriveUi = ui => Object.assign(ARRIVE_UI, ui);
/** What fate.mjs draws at the top of the panel when frenzy, torpor or death has the character (B6530): {html}. */
const FATE_UI = {};
export const setFateUi = ui => Object.assign(FATE_UI, ui);

/* ------------------------------------------------------------------ */
/*  Who and where                                                      */
/* ------------------------------------------------------------------ */

/**
 * The character a player plays (0.2.1): the one assigned to them; else one arrival made for them (B8031) with a token
 * on the scene they view, one they own alone before one they share; else the first they own alone, then any.
 */
const ownable = a => a?.hasPlayerOwner && !/group/i.test(String(a.type ?? "")) && !/\(deprecated\)/i.test(String(a.name ?? ""));
/** B8031 (#2471): only a sheet arrival made counts as a player's own when none is assigned; stray owned actors do not. */
const madeFor = (a, user) => String(a?.flags?.[MOD]?.arrival?.userId ?? "") === String(user?.id ?? "");
const ownsAlone = (a, user) => !all(game.users).some(u => u.id !== user.id && !u.isGM && a.testUserPermission?.(u, "OWNER"));
export function characterOf(user) {
  if ( !user ) return null;
  // An actor every player owns by default is nobody's own character (B5146)
  const named = a => (a?.ownership ? R.ownsByName(a.ownership, user.id) : !!a?.testUserPermission?.(user, "OWNER"));
  const byDefault = a => Number(a?.ownership?.default) >= 3 && !named(a);
  if ( user.character && !byDefault(user.character) ) return user.character;
  const mine = all(game.actors).filter(a => ownable(a) && named(a) && madeFor(a, user));
  const viewed = game.scenes?.get?.(user.viewedScene) ?? all(game.scenes).find(s => s.id === user.viewedScene);
  const onView = viewed ? mine.filter(a => all(viewed.tokens).some(t => t.actorId === a.id)) : [];
  const alone = list => list.find(a => ownsAlone(a, user));
  return alone(onView) ?? onView[0] ?? alone(mine) ?? mine[0] ?? null;
}
/** The scene and token where the character is: the one the player views first, else any that holds a token. */
export function placeOf(user) {
  const actor = characterOf(user);
  if ( !actor ) return {actor: null, scene: null, token: null};
  const scenes = all(game.scenes);
  const holds = s => all(s.tokens).find(t => t.actorId === actor.id) ?? null;
  const viewed = scenes.find(s => s.id === user.viewedScene && holds(s));
  const scene = viewed ?? scenes.find(s => s.active && holds(s)) ?? scenes.find(holds) ?? null;
  return {actor, scene, token: scene ? holds(scene) : null};
}
/** B8038 (#2501): the player's character is still being made (WoDX Creation's unfinished). */
export const making = user => { try { return !!game.modules.get("wodx-creation")?.api?.unfinished?.(characterOf(user)); } catch (e) { return false; } };
const FREE_WHILE_MAKING = new Set(["report", "pause", "stuck"]);
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
export async function tell(userId, html) {
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
  if ( making(user) ) { await tell(userId, "<p>Finish your character first. Time starts once you press This character is ready in the wizard.</p>"); return null; }
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

/**
 * B8045 (#2477): time spent on something the player did (a hunt's hours). The clock moves at once, in the usual steps
 * so the world answers between them, and nothing stops it: the time was already used.
 */
export async function spendTime(userId, seconds, label = "Time spent", {maxHours = R.HUNT_MAX_HOURS, step = R.STEP, busy = "Time is already passing, so the hunt's hours were not added. Let time pass again once it stops."} = {}) {
  if ( !H.isSeat() ) return null;
  const total = R.spendSeconds(seconds, maxHours);
  if ( !total ) return null;
  // The same guards as a wait: a character on a scene, made, out of a fight, the game running
  const user = game.users.get(userId);
  const {actor, scene} = placeOf(user);
  if ( !actor || !scene ) { await tell(userId, "<p>Your character is on no scene, so time cannot pass for them.</p>"); return null; }
  if ( making(user) ) { await tell(userId, "<p>Finish your character first. Time starts once you press This character is ready in the wizard.</p>"); return null; }
  if ( fightOn(scene.id).length ) { await tell(userId, "<p>Not while a fight is running: the clock stays where it is.</p>"); return null; }
  if ( game.paused ) { await tell(userId, "<p>The game is paused, so the clock stays where it is.</p>"); return null; }
  if ( waiting ) { await tell(userId, `<p>${esc(busy)}</p>`); return null; }
  const what = String(label ?? "Time spent").slice(0, 80);
  waiting = {userId, choice: "spend"};
  let passed = 0;
  try {
    for ( const n of R.chunks(total, step) ) {
      await game.time.advance(n);
      passed += n;
      await sleep(400);
      if ( !H.isSeat() ) break;
    }
  } finally { waiting = null; }
  await tell(userId, `<p>${esc(what)}: ${esc(R.span(passed))} passed.</p>`);
  await H.log({kind: "note", source: MOD, title: what, note: `${R.span(passed)} passed`});
  return {passed};
}

/**
 * #2490: a trip by the travel window or a Way puts its time on the traveller's own clock (WoDX Storyteller). With one
 * person playing there is one clock, so the seat moves the world clock on by the trip's time, with a wait's guards.
 */
export async function onTravelled({userId, seconds, place} = {}) {
  if ( !H.isSeat() || !userId || game.users.get(userId)?.isGM ) return null;
  const total = R.spendSeconds(seconds, R.TRIP_MAX_HOURS);
  // A door or a stair (a few minutes) passes on the character's own clock only; the world clock moves for a trip
  if ( total < R.TRIP_MIN_SECONDS ) return null;
  return spendTime(userId, total, `The way to ${place || "there"}`, {maxHours: R.TRIP_MAX_HOURS, step: R.tripStep(total),
    busy: "Time is already passing, so the trip's time was not added. Let time pass again once it stops."});
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
  // B6046: a lead is the director's, one light thing from what is live for the character now
  const director = game.modules.get(MOD)?.api?.director;
  if ( actor && director?.direct ) {
    const r = await director.direct({actorId: actor.id, force: true, count: 1, light: true}).catch(() => null);
    if ( r?.brought?.length ) {
      await H.log({kind: "note", source: MOD, title: "I am stuck: a lead was brought", note: r.brought.map(b => b.title).join("; ")});
      return r.brought[0];
    }
  }
  // else a foreshadowing for the character, through the approval queue (the standing approvals let it through)
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

/**
 * B6757: the lone player sets one of the chronicle's options (solo-rules OPTIONS). Only a listed option, only while the
 * mode is on; the seat writes the world setting and says so.
 */
export async function setOption(userId, key, value) {
  const c = R.optionChange(key, value);
  if ( !c || !H.isOn() ) return null;
  if ( game.settings.get(c.mod, c.key) === c.to ) return c;
  await game.settings.set(c.mod, c.key, c.to);
  await H.log({kind: "note", source: MOD, title: `${c.label}: ${c.word}`, note: game.users.get(userId)?.name ?? ""});
  await tell(userId, `<p><b>${esc(c.label)}</b>: ${esc(c.word)}.</p>`);
  return c;
}

const SEAT = {
  "ask.options": async p => { for ( const [k, v] of Object.entries(p.values ?? {}) ) await setOption(p.userId, k, v); },
  "ask.time": p => passTime(p.userId, p.choice),
  "ask.spend": p => spendTime(p.userId, p.seconds, p.label),
  "ask.pause": p => togglePause(p.userId),
  "ask.stuck": p => unstick(p.userId, p.fix),
  "ask.curtain": p => curtain(p.userId)
};

/** Answers the seat sends back to one player, by type (the curtain here, Storyteller tools in st-tools.mjs). */
const CLIENT = {"curtain.rows": showCurtain};
/** Other parts of the module add their asks and answers here (B4800). */
export function addAsks(seat = {}, client = {}) { Object.assign(SEAT, seat); Object.assign(CLIENT, client); }
/** ... and the panel buttons that open them (B5980): {id: () => ...} for a PANEL entry's id. */
export function addActions(actions = {}) { Object.assign(ACTIONS, actions); }

/**
 * Foundry hands a module's socket listener the sending user's id after the data. An ask whose payload names another
 * user than the one who sent it is dropped (B4801).
 */
function onSocket(msg, senderId) {
  const {type, payload} = msg ?? {};
  if ( CLIENT[type] ) {
    if ( payload?.userId === game.user.id ) CLIENT[type](payload);
    return;
  }
  const run = SEAT[type];
  if ( !run || !H.isSeat() || !game.users.get(payload?.userId) ) return;
  if ( typeof senderId === "string" && senderId && senderId !== payload.userId ) return;
  run(payload).catch(e => console.error(`${MOD} | ${type}`, e));
}

/** Any client: send an ask to the seat, or do it here when this client is the seat. */
function ask(type, payload = {}) {
  const p = {...payload, userId: game.user.id};
  if ( H.isSeat() ) return SEAT[type](p).catch(e => console.error(`${MOD} | ${type}`, e));
  if ( !game.users.activeGM ) { ui.notifications.warn(`${R.NAME}: the Storyteller's seat is not running, so nothing can be done. Start solo play with Play-Solo.`); return null; }
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
    // B8045 (#2477): a vampire can spend the night hunting, which moves the clock by the hours the hunt takes
    const me = characterOf(game.user), wa = game.wodxActions;
    const hunts = !!(me && wa?.hunt && wa.isVampire?.(me));
    const choices = hunts ? {...R.WAITS, hunt: R.HUNT_CHOICE} : R.WAITS;
    const pick = await choose("Let time pass", choices, "The clock moves ten minutes at a time and stops if something happens.");
    if ( pick === "hunt" ) {
      const {scene} = placeOf(game.user);
      let hours = 3;
      try {
        const sun = await sunFrom(scene);
        // by day (dawn comes before dusk) a vampire does not hunt
        if ( sun.toDusk < sun.toDawn ) return ui.notifications.warn("It is day. Hunting waits for dusk.");
        hours = R.huntHours(sun.toDawn);
      } catch (e) { /* no calendar: three hours */ }
      return wa.hunt({actor: me, hours});
    }
    if ( pick ) { ask("ask.time", {choice: pick}); ui.notifications.info(`${R.WAITS[pick].label}.`); }
  },
  travel() {
    const open = game.modules.get(ST)?.api?.openOnYourOwn;
    if ( open ) return open();
    ui.notifications.warn("Travel needs WoDX Storyteller.");
  },
  pause() { ask("ask.pause"); },
  /** B6757: the chronicle's options that only a Storyteller could set, for the one person playing. */
  async options() {
    const read = o => { try { return String(game.settings.get(o.mod, o.key)); } catch (e) { return null; } };
    const rows = R.OPTIONS.filter(o => read(o) !== null).map(o => `<div class="form-group"><label>${esc(o.label)}</label><select name="${o.key}" data-fixed>${
      Object.entries(o.choices).map(([v, l]) => `<option value="${v}"${read(o) === v || (v === "auto" && read(o) === "suggest") ? " selected" : ""}>${esc(l)}</option>`).join("")}</select><p class="hint">${esc(o.hint)}</p></div>`).join("");
    if ( !rows ) { ui.notifications.warn("These options need WoDX Storyteller."); return; }
    const got = await DialogV2.prompt({classes: ["wodx", "wodx-dialog", "wsolo-dialog"], window: {title: "Chronicle options"}, rejectClose: false,
      content: `<p>Parts of the chronicle that are off until you turn them on.</p>${rows}`,
      ok: {label: "Save", callback: (ev, b) => Object.fromEntries(R.OPTIONS.filter(o => b.form.elements[o.key]).map(o => [o.key, b.form.elements[o.key].value]))}});
    if ( got ) ask("ask.options", {values: got});
  },
  async stuck() {
    const pick = await choose("I am stuck", R.STUCK);
    if ( pick ) ask("ask.stuck", {fix: pick});
  },
  /** B5079: someone near the character is down; a companion carries them. */
  async carry() {
    const me = placeOf(game.user).token;
    const scene = canvas?.scene;
    const haul = game.modules.get("wodx-interactables")?.active ? game.modules.get("wodx-interactables").api?.haul : null;
    if ( !haul || !scene ) { ui.notifications.warn("Carrying needs WoDX Interactables."); return; }
    const down = all(scene.tokens).filter(t => t.actor && !t.hidden && haul.fallenOf(t)?.down && !(t.flags?.["wodx-interactables"]?.haul?.by ?? []).length);
    if ( !down.length ) { ui.notifications.info("Nobody here is down."); return; }
    const pick = await choose("Carry the fallen", Object.fromEntries(down.map(t => [t.id, {label: t.name, hint: t.id === me?.id ? "(your character)" : ""}])),
      "Your character lifts or drags them, within their Strength. When your character is the one down, a companion comes for them.");
    if ( !pick ) return;
    // B8051 (#2488): a body is the character's own to lift; a companion only when the character is down or cannot
    const body = scene.tokens.get(pick);
    if ( me && pick !== me.id && !haul.fallenOf(me)?.down ) {
      // The options are read here, where reach, weight and free hands are known; the take itself goes to the seat
      let ops = [];
      try { ops = (haul.optionsFor?.(me) ?? []).filter(o => o.op === "take" && o.what === body?.uuid); } catch (e) { ops = []; }
      const op = ops.find(o => o.want === "carry" && !o.disabled) ?? ops.find(o => !o.disabled);
      if ( op ) { await haul.take(me, body, op.want); return; }
      const why = ops[0]?.note || (haul.optionsFor?.(me) ?? []).find(o => o.op === "none")?.label || `${body?.name ?? "They"} is out of reach`;
      ui.notifications.warn(`${me.name}: ${why}. A companion is asked instead.`);
    }
    ask("ask.carry", {tokenId: pick, sceneId: scene.id});
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
    actions: {act: SoloPanel.#onAct, st: (ev, t) => ST_UI.open?.(t.dataset.id), sttoggle: () => ST_UI.toggle?.(), arrive: () => ARRIVE_UI.open?.(), arrivenew: () => ARRIVE_UI.open?.(true)}
  };
  static open() {
    const app = foundry.applications.instances?.get?.("wodx-solo-panel") ?? new SoloPanel();
    return app.render({force: true});
  }
  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wsolo-buttons";
    const paused = !!game.paused;
    // B8030 (#2467): Report a problem stays in reach, outside the folded part
    const shown = b => `<button type="button" data-action="act" data-id="${b.id}"><i class="${b.icon}"></i> ${esc(b.label)}</button>`;
    const reportBtn = R.PANEL.find(b => b.id === "report");
    const rest = R.PANEL.filter(b => b.id !== "report").map(b => {
      const icon = b.id === "pause" && paused ? "fa-solid fa-play" : b.icon;
      const label = b.id === "pause" ? (paused ? "Go on" : "Pause") : b.label;
      return `<button type="button" data-action="act" data-id="${b.id}"><i class="${icon}"></i> ${esc(label)}</button>`;
    }).join("");
    // One main button; the rest under More, open once the player has opened it (B2831)
    div.innerHTML = `${ARRIVE_UI.html?.() ?? ""}${FATE_UI.html?.() ?? ""}<button type="button" class="wsolo-next" data-action="act" data-id="${R.NEXT.id}" title="${esc(R.NEXT.hint)}"><i class="${R.NEXT.icon}"></i> ${esc(R.NEXT.label)}</button>
      <p class="wodx-quiet wsolo-next-hint">${esc(R.NEXT.hint)}</p>
      ${reportBtn ? `<div class="wsolo-buttons wsolo-report">${shown(reportBtn)}</div>` : ""}
      <details class="wsolo-more"${SoloPanel.moreOpen ? " open" : ""}><summary>More: the oracle, leads, time, travel, places with no map, sleep through the years, pause, I am stuck, the curtain, carry the fallen, chronicle options</summary><div class="wsolo-buttons">${rest}${ST_UI.toggleHtml?.() ?? ""}</div></details>${ST_UI.toolsHtml?.() ?? ""}`;
    div.querySelector("details.wsolo-more")?.addEventListener("toggle", ev => { SoloPanel.moreOpen = ev.target.open; });
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  static #onAct(event, target) {
    // B8038 (#2501): while the character is still being made, only these stay open; the rest wait for the wizard
    const id = target.dataset.id;
    if ( !FREE_WHILE_MAKING.has(id) && making(game.user) ) {
      ui.notifications.info("Finish your character first: on the wizard's last page, press This character is ready.");
      game.modules.get("wodx-creation")?.api?.wizard?.(characterOf(game.user));
      return;
    }
    const run = ACTIONS[id];
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
  Hooks.on("wodxTravelled", p => { onTravelled(p).catch(e => console.error(`${MOD} | trip time`, e)); });
  Hooks.on("pauseGame", () => { if ( foundry.applications.instances?.get?.("wodx-solo-panel")?.rendered ) SoloPanel.open(); });
  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens ?? controls.token;
    if ( !tokens?.tools || !H.isOn() ) return;
    tokens.tools.wodxSolo = {name: "wodxSolo", title: `${R.NAME}: your panel (time, travel, pause, I am stuck, the curtain)`, icon: "fa-solid fa-moon", order: 105,
      button: true, visible: !game.user.isGM, onChange: () => SoloPanel.open()};
  });
  if ( !game.user.isGM && H.isOn() && H.get("panel") !== false ) setTimeout(() => SoloPanel.open(), 1000);
}

export const panelApi = {open: () => SoloPanel.open(), ask, passTime, spend: (seconds, label) => ask("ask.spend", {seconds, label}), togglePause, unstick, curtain, setOption, busy: () => waiting};
export {ask, SOCKET};
