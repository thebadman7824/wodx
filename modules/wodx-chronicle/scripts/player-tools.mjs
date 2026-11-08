/**
 * Player toolbar buttons (B60): the Storyteller chooses, for each player, which of the WoDX buttons in the Token
 * controls that player sees. Players can only lose buttons: a Storyteller-only button is never given to a player, and
 * the X-card can never be hidden (it is a safety tool). Foundry's own buttons and other modules' are not touched.
 *
 * World setting "playerTools": {<userId>: {<toolName>: false}}; a button not listed is shown.
 */
import {MODULE_ID, esc, emit, isActiveGM} from "./util.mjs";
import {searchBox} from "./search.mjs";

/** The WoDX buttons a player sees by default, in toolbar order. */
export const PLAYER_TOOLS = [
  {name: "wodxClock", label: "Chronicle Clock", module: "WoDX Chronicle"},
  {name: "wodxXCard", label: "X-card", module: "WoDX Chronicle", locked: true},
  {name: "wodxStepSideways", label: "Step sideways", module: "WoDX Otherworlds"},
  {name: "wodxPeek", label: "Peek across the Gauntlet", module: "WoDX Otherworlds"},
  {name: "wodxSoul", label: "Read the Soul", module: "WoDX Otherworlds"},
  {name: "wodxCreation", label: "Spend experience", module: "WoDX Creation"},
  {name: "wodxFindMe", label: "Find my character", module: "WoDX Chronicle"}
];

/** Does this player see this button? Pure. map: the playerTools setting. */
export function toolShown(map, userId, name) {
  const t = PLAYER_TOOLS.find(x => x.name === name);
  if ( !t ) return true; // not a player button (Storyteller-only, or not WoDX): left as it is
  if ( t.locked ) return true;
  return map?.[userId]?.[name] !== false;
}

/** The setting from the window's ticks: only the hidden buttons are kept. Pure. ticks: {userId: {name: bool}}. */
export function fromTicks(ticks) {
  const out = {};
  for ( const [u, row] of Object.entries(ticks ?? {}) ) {
    for ( const t of PLAYER_TOOLS ) {
      if ( t.locked ) continue;
      if ( row?.[t.name] === false ) (out[u] ??= {})[t.name] = false;
    }
  }
  return out;
}

const map = () => { try { return game.settings.get(MODULE_ID, "playerTools") ?? {}; } catch { return {}; } };

export function registerPlayerToolSettings() {
  game.settings.register(MODULE_ID, "playerTools", {
    scope: "world", config: false, type: Object, default: {},
    onChange: () => { try { ui.controls?.render?.({reset: true}); } catch (e) { console.warn("WoDX | toolbar refresh", e); } }
  });
}

/**
 * Hide the buttons this player shouldn't see. Registered at ready, so it runs after every module's own
 * getSceneControlButtons hook has added its buttons.
 */
export function installToolFilter() {
  Hooks.on("getSceneControlButtons", controls => {
    if ( game.user.isGM ) return;
    const tools = (controls.tokens ?? controls.token)?.tools;
    if ( !tools ) return;
    const m = map();
    for ( const t of PLAYER_TOOLS ) {
      if ( tools[t.name] && !toolShown(m, game.user.id, t.name) ) tools[t.name].visible = false;
    }
  });
  try { ui.controls?.render?.({reset: true}); } catch (e) { /* drawn again at the next render */ }
}

/** The Storyteller's window: a row for each WoDX player button, a column for each player. */
export async function openPlayerTools() {
  if ( !game.user.isGM ) return ui.notifications.warn("The Storyteller sets the players' buttons.");
  const players = game.users.filter(u => !u.isGM);
  if ( !players.length ) return ui.notifications.info("There are no players in this world yet.");
  const m = map();
  const head = `<tr><th>Button</th>${players.map(u => `<th title="${esc(u.name)}">${esc(u.name)}</th>`).join("")}</tr>`;
  const rows = PLAYER_TOOLS.map(t => `<tr data-search-text="${esc(`${t.label} ${t.module}`)}"><td><b>${esc(t.label)}</b><br><span class="wodx-quiet">${esc(t.module)}${t.locked ? " · always shown (safety)" : ""}</span></td>${
    players.map(u => `<td style="text-align:center"><input type="checkbox" name="t.${u.id}.${t.name}" ${toolShown(m, u.id, t.name) ? "checked" : ""} ${t.locked ? "disabled" : ""}
      aria-label="${esc(`${t.label} for ${u.name}`)}"></td>`).join("")}</tr>`).join("");
  const content = `<p class="wodx-prompt">Tick the WoDX buttons each player sees in the Token controls. Storyteller-only buttons stay yours; Foundry's own buttons are not changed.</p>
    ${searchBox("table.wodx-player-tools", "Search buttons…", "Search buttons")}
    <div class="wodx-scroll" style="overflow:auto"><table class="wodx-player-tools" style="width:100%"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  const {DialogV2} = foundry.applications.api;
  const ticks = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Player toolbar buttons"},
    position: {width: Math.min(900, 360 + 90 * players.length)},
    content,
    ok: {
      label: "Save", icon: "fa-solid fa-floppy-disk",
      callback: (event, button) => {
        const out = {};
        for ( const u of players ) {
          out[u.id] = {};
          for ( const t of PLAYER_TOOLS ) out[u.id][t.name] = !!button.form.querySelector(`[name="t.${u.id}.${t.name}"]`)?.checked;
        }
        return out;
      }
    },
    rejectClose: false
  });
  if ( !ticks ) return;
  await game.settings.set(MODULE_ID, "playerTools", fromTicks(ticks));
  ui.notifications.info("Player toolbar buttons saved; each player's toolbar changes now.");
}

/* -------------------------------------------- */
/*  Find my character (B61)                     */
/* -------------------------------------------- */

/**
 * Which of a player's tokens to go to. Pure. tokens: [{id, sceneId, actorId, x, y, hidden}] the player owns, across
 * every scene; here: {sceneId, x, y} the view now; activeSceneId: the scene the game is on; characterId: the player's
 * assigned character. Hidden tokens are never chosen (the Storyteller hid them).
 * Returns {token} on the scene in view (the nearest one), {token} on one other scene, {choices} when the player's
 * tokens sit on several other scenes (the assigned character's and the active scene's first), or {none, hidden}.
 */
export function pickToken({tokens = [], here = {}, activeSceneId = null, characterId = null}) {
  const open = tokens.filter(t => !t.hidden);
  const hidden = tokens.length - open.length;
  if ( !open.length ) return {none: true, hidden};
  const dist = t => Math.hypot((t.x ?? 0) - (here.x ?? 0), (t.y ?? 0) - (here.y ?? 0));
  const mine = t => (characterId && t.actorId === characterId ? 0 : 1);
  const onHere = open.filter(t => t.sceneId === here.sceneId).sort((a, b) => mine(a) - mine(b) || dist(a) - dist(b));
  if ( onHere.length ) return {token: onHere[0], sameScene: true};
  const rank = t => mine(t) * 2 + (t.sceneId === activeSceneId ? 0 : 1);
  const elsewhere = [...open].sort((a, b) => rank(a) - rank(b));
  const scenesOf = list => [...new Set(list.map(t => t.sceneId))];
  if ( scenesOf(elsewhere).length === 1 ) return {token: elsewhere[0], sameScene: false};
  // The assigned character, if it stands on only one scene
  const char = elsewhere.filter(t => characterId && t.actorId === characterId);
  if ( char.length && scenesOf(char).length === 1 ) return {token: char[0], sameScene: false};
  return {choices: scenesOf(elsewhere).map(id => elsewhere.find(t => t.sceneId === id))};
}

/** A user's tokens on every scene this client knows (a player's client may not hold every scene). */
function tokensOf(user = game.user) {
  const out = [];
  for ( const scene of game.scenes ?? [] ) {
    for ( const t of scene.tokens ?? [] ) {
      const owns = user === game.user ? (t.isOwner ?? t.actor?.isOwner) : t.actor?.testUserPermission?.(user, "OWNER");
      if ( !owns || !t.actor ) continue;
      out.push({id: t.id, sceneId: scene.id, actorId: t.actor.id, x: t.x + ((t.width ?? 1) * (scene.grid?.size ?? 100)) / 2,
        y: t.y + ((t.height ?? 1) * (scene.grid?.size ?? 100)) / 2, hidden: !!t.hidden, level: t.level ?? null, name: t.name});
    }
  }
  return out;
}

async function goTo(tok) {
  const scene = game.scenes.get(tok.sceneId);
  if ( !scene ) return;
  if ( canvas.scene?.id !== scene.id ) {
    if ( canvas.loading ) return ui.notifications.warn("The scene is still loading; try again in a moment.");
    await scene.view(tok.level ? {level: tok.level} : {});
  }
  await canvas.animatePan?.({x: tok.x, y: tok.y, duration: 400});
  canvas.tokens?.get(tok.id)?.control?.({releaseOthers: true});
}

/** The button: go to the player's own token, on this scene or on another. */
export async function findMyCharacter() {
  if ( !canvas?.ready && !game.scenes?.size ) return;
  const view = canvas.scene ? {sceneId: canvas.scene.id, x: canvas.stage?.pivot?.x ?? 0, y: canvas.stage?.pivot?.y ?? 0} : {};
  const mine = tokensOf();
  // Nothing on the scenes this client holds: the Storyteller's client looks on every scene and brings the player there
  if ( !mine.length && game.users.activeGM && !game.user.isGM ) {
    if ( emit("player.findMe", {userId: game.user.id}, {needsGM: true}) ) ui.notifications.info("Looking for your character on every scene…");
    return;
  }
  const pick = pickToken({tokens: mine, here: view, activeSceneId: game.scenes.active?.id ?? null, characterId: game.user.character?.id ?? null});
  if ( pick.none ) {
    return ui.notifications.info(pick.hidden ? "Your character's token is hidden by the Storyteller for now." : "None of your characters has a token on any scene.");
  }
  if ( pick.token ) return goTo(pick.token);
  const {DialogV2} = foundry.applications.api;
  const id = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"], window: {title: "Find my character"},
    content: `<p>Your characters are on more than one scene. Go to:</p>
      <div class="form-group"><label>Where</label><select name="tok" data-fixed>${pick.choices.map(t =>
        `<option value="${esc(t.id)}">${esc(t.name)}: ${esc(game.scenes.get(t.sceneId)?.navName || game.scenes.get(t.sceneId)?.name || "a scene")}</option>`).join("")}</select></div>`,
    ok: {label: "Go", icon: "fa-solid fa-location-crosshairs", callback: (event, button) => button.form.elements.tok.value},
    rejectClose: false
  });
  const tok = pick.choices.find(t => t.id === id);
  if ( tok ) return goTo(tok);
}

/** Pan to a token once its scene is drawn, and select it. */
function panTo({sceneId, tokenId, x, y}) {
  const go = () => { canvas.animatePan?.({x, y, duration: 400}); canvas.tokens?.get(tokenId)?.control?.({releaseOthers: true}); };
  if ( canvas.scene?.id === sceneId ) go();
  else Hooks.once("canvasReady", () => setTimeout(go, 200));
}

/** Socket: the active Storyteller finds a player's token on any scene and pulls the player to it; the player pans. */
export async function onFindMeSocket(type, payload) {
  if ( type === "player.findMe" ) {
    if ( !isActiveGM() ) return;
    const user = game.users.get(payload?.userId);
    if ( !user || user.isGM ) return;
    const pick = pickToken({tokens: tokensOf(user), here: {sceneId: user.viewedScene}, activeSceneId: game.scenes.active?.id ?? null, characterId: user.character?.id ?? null});
    const tok = pick.token ?? pick.choices?.[0];
    if ( !tok ) { emit("player.findMeNone", {userId: user.id, hidden: pick.hidden ?? 0}); return; }
    const scene = game.scenes.get(tok.sceneId);
    if ( scene && user.viewedScene !== scene.id ) scene.pullUsers([user], tok.level ? {level: tok.level} : {});
    emit("player.panTo", {userId: user.id, sceneId: tok.sceneId, tokenId: tok.id, x: tok.x, y: tok.y});
    return;
  }
  if ( payload?.userId !== game.user.id ) return;
  if ( type === "player.panTo" ) panTo(payload);
  if ( type === "player.findMeNone" ) ui.notifications.info(payload.hidden ? "Your character's token is hidden by the Storyteller for now." : "None of your characters has a token on any scene.");
}
