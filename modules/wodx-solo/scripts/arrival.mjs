/**
 * WoDX Solo: arrival, the lone player's first login (B5140 to B5145).
 *
 * Foundry lets no player make an Actor, and a world can open with no scene active, so a lone player could log in to
 * an empty screen with nothing to move. Arrival fixes that from the seat:
 *   the landing  the scene the player lands on (solo-rules.mjs pickLanding): one flagged wodx-solo.landing, the one
 *                the "landing" setting names, a Rothenstein scene with a map (the market first), the active one, or
 *                any with a map. A world with no map at all gets a plain night scene (LANDING_BLANK). The landing is
 *                made active when no scene with a map is.
 *   the character  a player with no character picks a name and a line; the seat makes the sheet (the player owns
 *                it, its token is linked) and assigns it to them. The character wizard then opens on it.
 *   the token    a character with no token on any scene gets one at the landing's way in; the seat brings the player
 *                to the token's scene, and the player's screen centres on it.
 * Once the token is there, Hooks "wodxSoloArrived" fires on the player's client; Chronicle's first-night tour waits
 * for it in solo play, so its steps (move, roll and the rest) have a token to work on.
 *
 *   setting wodx-solo.landing  String   the scene chosen as the landing
 *   setting wodx-solo.arrive   Boolean  bring the player in (default on)
 */
import * as R from "./solo-rules.mjs";
import {addAsks, setArriveUi, ask, SOCKET, characterOf, placeOf, tell, SoloPanel} from "./panel.mjs";

const MOD = "wodx-solo";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const {DialogV2} = foundry.applications.api;

let H = null; // from main.mjs: {isOn, isSeat, log, get}
const reply = (userId, type, data = {}) => game.socket.emit(SOCKET, {type, payload: {userId, ...data}});
const on = () => H.isOn() && H.get("arrive") !== false;

/* ------------------------------------------------------------------ */
/*  The seat's side                                                    */
/* ------------------------------------------------------------------ */

const sceneRow = s => ({id: s.id, name: s.name, active: !!s.active, landing: !!s.getFlag?.(MOD, "landing"), img: s.background?.src ?? s.img ?? ""});

/** The landing scene, made when the world has none with a map. The seat only. */
export async function landing() {
  if ( !H.isSeat() ) return null;
  const id = R.pickLanding(all(game.scenes).map(sceneRow), H.get("landing") ?? "");
  let scene = id ? game.scenes.get(id) : null;
  if ( !scene ) {
    scene = await Scene.create({...R.LANDING_BLANK, flags: {[MOD]: {landing: true, made: true}}});
    await H.log({kind: "scene", source: MOD, title: scene.name, note: "the world had no map, so a plain night scene was made to land on"});
  }
  if ( H.get("landing") !== scene.id ) await game.settings.set(MOD, "landing", scene.id);
  const active = game.scenes.active;
  // Foundry's welcome scene, a scene with no map or one where no player's character stands gives way (B5147)
  const playerTokens = active ? all(active.tokens).filter(t => t.actor && all(game.users).some(u => !u.isGM && R.ownsByName(t.actor.ownership, u.id))).length : 0;
  if ( R.mayReplaceActive(active ? sceneRow(active) : null, {playerTokens}) ) {
    if ( active?.id !== scene.id ) {
      await scene.activate();
      await H.log({kind: "scene", source: MOD, title: scene.name, note: "made the active scene, to land on"});
    }
  }
  return scene;
}

/** Take a player to a scene, at the token's level where the scene has levels (Foundry 14). */
function pull(scene, user, token) {
  const lv = token?.level ?? null;
  if ( typeof scene.pullUsers === "function" ) return scene.pullUsers([user], lv ? {level: lv} : {});
  return game.socket.emit("pullToScene", scene.id, user.id);
}

/** Put a token for the actor at the landing's way in. */
async function placeToken(actor, scene) {
  const size = Number(actor.prototypeToken?.width) || 1;
  const to = R.wayIn({initial: scene.initial, width: scene.width, height: scene.height, padding: scene.padding, grid: {size: scene.grid?.size}}, size);
  const td = await actor.getTokenDocument({x: to.x, y: to.y, flags: {[MOD]: {arrival: true}}});
  const [made] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  await H.log({kind: "scene", source: MOD, title: scene.name, note: `${actor.name} placed at the way in`});
  return made;
}

const arriving = new Set();
/**
 * Bring one player in: make the character, place the token, or take them to it. Returns the step taken. The player's
 * client asks on login; the seat also runs it for players already in when it sits down. One at a time per player.
 */
export async function arrive(userId) {
  if ( !H.isSeat() || !on() || arriving.has(userId) ) return null;
  const user = game.users.get(userId);
  if ( !user || user.isGM ) return null;
  arriving.add(userId);
  try { return await bringIn(user); } finally { arriving.delete(userId); }
}
async function bringIn(user) {
  const userId = user.id;
  const scene = await landing();
  let {actor, scene: at, token} = placeOf(user);
  const step = R.arrivalStep({character: !!actor, token: !!token, viewing: !!at && user.viewedScene === at.id});
  if ( step === "make" ) { reply(userId, "arrive.pick", {lines: R.ARRIVAL_LINES}); return step; }
  if ( step === "place" ) { token = await placeToken(actor, scene); at = scene; }
  if ( !user.character && actor ) await user.update({character: actor.id});
  if ( user.viewedScene !== at.id ) pull(at, user, token);
  reply(userId, "arrive.ready", {actorId: actor.id, sceneId: at.id, tokenId: token.id});
  return step;
}

const making = new Set();
/** Make the player's character from the name and line they picked, then bring them in. */
export async function make(userId, {name, line} = {}) {
  if ( !H.isSeat() || !on() ) return null;
  const user = game.users.get(userId);
  if ( !user || user.isGM || making.has(userId) ) return null;
  // One character each: a player who already has one is brought to it instead
  if ( characterOf(user) ) return arrive(userId);
  making.add(userId);
  try {
    const actor = await Actor.create(R.newCharacterData({name, line, userId, at: Date.now()}));
    await user.update({character: actor.id});
    await H.log({kind: "note", source: MOD, title: "A character was made for the player", note: `${actor.name}, ${R.arrivalLine(line)?.label ?? "Mortal"}, for ${user.name}`});
    const scene = await landing();
    const token = await placeToken(actor, scene);
    if ( user.viewedScene !== scene.id ) pull(scene, user, token);
    reply(userId, "arrive.ready", {actorId: actor.id, sceneId: scene.id, tokenId: token.id, made: true});
    await tell(userId, `<p><b>${esc(actor.name)}</b> stands at the way in. The character wizard is open to build the sheet; drag the token to move.</p>`);
    return actor;
  } finally { making.delete(userId); }
}

/* ------------------------------------------------------------------ */
/*  The player's side                                                  */
/* ------------------------------------------------------------------ */

let picking = false;
/** Ask for a name and a line; the seat makes the character. */
export async function pick() {
  if ( picking || game.user.isGM ) return null;
  picking = true;
  try {
    const opts = R.ARRIVAL_LINES.map((l, i) => `<label class="wsolo-choice"><input type="radio" name="line" value="${l.id}"${i === 0 ? " checked" : ""}> ${esc(l.label)}<span class="wodx-quiet"> ${esc(l.hint)}</span></label>`).join("");
    const got = await DialogV2.prompt({classes: ["wodx", "wodx-dialog", "wsolo-dialog", "wsolo-arrive"], window: {title: "Who comes to Rothenstein?"},
      content: `<p>You have no character yet. Give a name and pick what they are. The character wizard opens next to build the sheet.</p>
        <div class="form-group"><label>Name</label><input type="text" name="name" maxlength="${R.NAME_MAX}" placeholder="${esc(R.DEFAULT_NAME)}" autofocus></div>
        <fieldset class="wsolo-choices" data-fixed><legend>What they are</legend>${opts}</fieldset>`,
      ok: {label: "Arrive", callback: (ev, b) => ({name: b.form.elements.name?.value ?? "", line: b.form.querySelector("input[name=line]:checked")?.value ?? "mortal"})},
      rejectClose: false});
    if ( !got ) { ui.notifications.info("When you are ready, open your panel (the moon button) and press Make my character."); return null; }
    ask("ask.arrive.make", got);
    return got;
  } finally { picking = false; }
}

/** The seat says the token is there: centre on it, take control, open the wizard for a new character. */
async function ready({actorId, sceneId, tokenId, made} = {}) {
  if ( canvas?.scene?.id !== sceneId ) {
    await new Promise(res => { const t = setTimeout(res, 15000); Hooks.once("canvasReady", () => { clearTimeout(t); res(); }); });
  }
  const token = canvas?.tokens?.get?.(tokenId);
  if ( token ) {
    token.control({releaseOthers: true});
    await canvas.animatePan({x: token.center.x, y: token.center.y, scale: Math.max(canvas.stage?.scale?.x ?? 1, 1), duration: 600});
  }
  const actor = game.actors.get(actorId);
  if ( made && actor ) game.modules.get("wodx-creation")?.api?.wizard?.(actor);
  if ( SoloPanel && foundry.applications.instances?.get?.("wodx-solo-panel")?.rendered ) SoloPanel.open();
  Hooks.callAll("wodxSoloArrived", {actor, sceneId, tokenId, made: !!made});
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

export function registerArrivalSettings() {
  game.settings.register(MOD, "landing", {scope: "world", config: false, type: String, default: ""});
  game.settings.register(MOD, "arrive", {name: "Bring the player in",
    hint: "When the lone player logs in, the seat makes sure there is a scene to land on, makes a character for a player who has none and puts its token at the way in.",
    scope: "world", config: true, type: Boolean, default: true});
}

export function installArrival(helpers) {
  H = helpers;
  addAsks({"ask.arrive": p => arrive(p.userId), "ask.arrive.make": p => make(p.userId, p)},
    {"arrive.pick": () => pick(), "arrive.ready": p => ready(p).catch(e => console.warn(`${MOD} | arrive`, e))});
  setArriveUi({
    html: () => (!game.user.isGM && on() && !characterOf(game.user)
      ? `<button type="button" class="wsolo-arrive-btn" data-action="arrive"><i class="fa-solid fa-user-plus"></i> Make my character</button>` : ""),
    open: () => pick()
  });
  // The panel's Make my character button goes once the player has one
  Hooks.on("updateUser", (u, ch) => {
    if ( u.id === game.user.id && "character" in (ch ?? {}) && foundry.applications.instances?.get?.("wodx-solo-panel")?.rendered ) SoloPanel.open();
  });
  if ( H.isSeat() ) {
    setTimeout(async () => {
      try { await landing(); for ( const u of all(game.users).filter(x => x.active && !x.isGM) ) await arrive(u.id); }
      catch (e) { console.warn(`${MOD} | arrival`, e); }
    }, 3500);
  } else if ( !game.user.isGM && on() ) {
    setTimeout(() => ask("ask.arrive"), 2000);
  }
}

export const arrivalApi = {landing, arrive, make, pick};
