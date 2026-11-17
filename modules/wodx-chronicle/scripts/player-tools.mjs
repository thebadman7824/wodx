/**
 * Player toolbar buttons (B60): the Storyteller chooses, for each player, which of the WoDX buttons in the Token
 * controls that player sees. Players can only lose buttons: a Storyteller-only button is never given to a player, and
 * the X-card can never be hidden (it is a safety tool). Foundry's own buttons and other modules' are not touched.
 *
 * World setting "playerTools": {<userId>: {<toolName>: false}}; a button not listed is shown.
 * B4120: the same window ("Player interface") also hides parts of Foundry's own screen per player (setting "playerUi").
 */
import {MODULE_ID, esc, emit, isActiveGM} from "./util.mjs";
import {searchBox} from "./search.mjs";
import {VIEWS} from "./player-view-rules.mjs";

/** The WoDX buttons a player sees by default, in toolbar order. */
export const PLAYER_TOOLS = [
  {name: "wodxClock", label: "Chronicle Clock", module: "WoDX Chronicle"},
  {name: "wodxXCard", label: "X-card", module: "WoDX Chronicle", locked: true},
  {name: "wodxStepSideways", label: "Step sideways", module: "WoDX Otherworlds"},
  {name: "wodxPeek", label: "Peek across the Gauntlet", module: "WoDX Otherworlds"},
  {name: "wodxSoul", label: "Read the Soul", module: "WoDX Otherworlds"},
  {name: "wodxSpirits", label: "Standing with the spirits", module: "WoDX Otherworlds"},
  {name: "wodxOtherRolls", label: "Otherworld rolls", module: "WoDX Otherworlds"},
  {name: "wodxJack", label: "Jack into the Net", module: "WoDX Otherworlds"},
  {name: "wodxNet", label: "The Net: data fortresses", module: "WoDX Otherworlds"},
  {name: "wodxCreation", label: "Spend experience", module: "WoDX Creation"},
  {name: "wodxFindMe", label: "Find my character", module: "WoDX Chronicle"},
  {name: "wodxLegends", label: "Legends of the Chronicle", module: "WoDX Chronicle"},
  {name: "wodxOnYourOwn", label: "Out on your own", module: "WoDX Storyteller"},
  {name: "wodxPassTime", label: "Let time pass", module: "WoDX Storyteller"},
  {name: "wodxLetters", label: "Send a letter", module: "WoDX Storyteller"},
  {name: "wodxDowntime", label: "Downtime request", module: "WoDX Storyteller"},
  {name: "wodxTasks", label: "Long tasks", module: "WoDX Storyteller"},
  {name: "wodxClocks", label: "Progress clocks", module: "WoDX Storyteller"},
  {name: "wodxProperty", label: "Property and building", module: "WoDX Storyteller"},
  {name: "wodxTales", label: "What they say about you", module: "WoDX Storyteller"},
  {name: "wodxInstitutions", label: "Institutions", module: "WoDX Storyteller"},
  // 0.52.0 (B2815): the player buttons this window did not list before
  {name: "wodxFind", label: "Find anything", module: "WoDX Chronicle", locked: true},
  {name: "wodxNow", label: "What can I do now?", module: "WoDX Chronicle", locked: true},
  {name: "wodxPrefs", label: "My WoDX preferences", module: "WoDX Chronicle"},
  {name: "wodxGlossary", label: "Glossary", module: "WoDX Chronicle"},
  {name: "wodxLaw", label: "Law here", module: "WoDX Chronicle"},
  {name: "wodxLibrary", label: "The Library", module: "WoDX Library"},
  {name: "wodxGear", label: "Gear by era", module: "WoDX Library"},
  {name: "wodxSenses", label: "What do I notice?", module: "WoDX Senses"},
  {name: "wodxSight", label: "My sight", module: "WoDX Senses"},
  {name: "wodxTalk", label: "Talk to someone", module: "WoDX NPC"},
  {name: "wodxOrders", label: "Give an order", module: "WoDX NPC"},
  {name: "wodxFollowers", label: "Followers", module: "WoDX NPC"},
  {name: "wodxCults", label: "Your following", module: "WoDX NPC"},
  {name: "wodxFactions", label: "Factions", module: "WoDX NPC"},
  {name: "wodxDress", label: "Dress for a part of the world", module: "WoDX NPC"},
  {name: "wodxRemembered", label: "Who remembers you", module: "WoDX NPC"},
  {name: "wodxCaseBoard", label: "Case board", module: "WoDX Interactables"},
  {name: "wodxSolo", label: "Solo panel", module: "WoDX Solo"}
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

/* -------------------------------------------- */
/*  Player interface: screen parts (B4120)      */
/* -------------------------------------------- */

/** The parts of Foundry's own screen the Storyteller may hide from a player, in screen order. tab: a sidebar tab. */
export const UI_PARTS = [
  {key: "nav", label: "Scene navigation", hint: "the row of scene names at the top", sel: ["#scene-navigation", "#navigation"]},
  {key: "players", label: "Player list", hint: "who is here, at the bottom left", sel: ["#players"]},
  {key: "hotbar", label: "Macro bar", hint: "the numbered slots at the bottom", sel: ["#hotbar"]},
  {key: "camera", label: "Camera and voice", hint: "the video and voice windows", sel: ["#camera-views"]},
  {key: "combat", label: "Sidebar: Combat", tab: "combat"},
  {key: "actors", label: "Sidebar: Actors", tab: "actors"},
  {key: "items", label: "Sidebar: Items", tab: "items"},
  {key: "journal", label: "Sidebar: Journal", tab: "journal"},
  {key: "tables", label: "Sidebar: Roll tables", tab: "tables"},
  {key: "cards", label: "Sidebar: Cards", tab: "cards"},
  {key: "playlists", label: "Sidebar: Playlists", tab: "playlists"},
  {key: "compendium", label: "Sidebar: Compendium packs", tab: "compendium"}
];
/** Never hidden: a player must always be able to talk, reach Settings, read warnings, use the controls and the X-card. */
export const UI_KEPT = "Chat, Settings, notifications, the scene controls and the X-card are always shown.";

/** The CSS selectors of one part. Pure. */
export function partSelectors(part) {
  if ( part.tab ) return [`#sidebar-tabs [data-tab="${part.tab}"]`, `#sidebar-content [data-tab="${part.tab}"]`, `#sidebar > nav [data-tab="${part.tab}"]`];
  return part.sel ?? [];
}

/** The body class that hides one part. Pure. */
export const uiClass = key => `wodx-ui-no-${key}`;

/** The style sheet: one rule per part, shown only while its body class is on. Pure. */
export function uiCss() {
  return UI_PARTS.map(p => `${partSelectors(p).map(s => `body.${uiClass(p.key)} ${s}`).join(", ")} { display: none !important; }`).join("\n");
}

/** The parts this player does not see. Pure. ui: the playerUi setting. The Storyteller never loses any. */
export function uiHidden(ui, userId, isGM = false) {
  if ( isGM ) return [];
  const row = ui?.[userId] ?? {};
  return UI_PARTS.filter(p => row[p.key] === false).map(p => p.key);
}

/** The setting from the window's ticks: only the hidden parts are kept. Pure. ticks: {userId: {key: bool}}. */
export function uiFromTicks(ticks) {
  const out = {};
  for ( const [u, row] of Object.entries(ticks ?? {}) ) {
    for ( const p of UI_PARTS ) if ( row?.[p.key] === false ) (out[u] ??= {})[p.key] = false;
  }
  return out;
}

const uiMap = () => { try { return game.settings.get(MODULE_ID, "playerUi") ?? {}; } catch { return {}; } };
let uiPreview = null;

/** Put this client's body classes in line with the setting (or the Storyteller's preview). */
export function applyUi() {
  if ( typeof document === "undefined" || !document.body ) return [];
  if ( !document.getElementById("wodx-player-ui") ) {
    const st = document.createElement("style");
    st.id = "wodx-player-ui";
    st.textContent = uiCss();
    document.head.append(st);
  }
  const hide = uiPreview ?? uiHidden(uiMap(), game.user.id, game.user.isGM);
  for ( const p of UI_PARTS ) document.body.classList.toggle(uiClass(p.key), hide.includes(p.key));
  // A hidden sidebar tab that was open: the sidebar goes back to chat
  const open = ui.sidebar?.tabGroups?.primary ?? ui.sidebar?.activeTab;
  if ( open && hide.includes(open) ) { try { ui.sidebar.changeTab("chat", "primary"); } catch (e) { /* the sidebar redraws on chat later */ } }
  return hide;
}

/** The Storyteller sees a player's screen parts on their own screen, this session only; null puts everything back. */
export function previewUi(keys = null) {
  uiPreview = Array.isArray(keys) ? keys.filter(k => UI_PARTS.some(p => p.key === k)) : null;
  return applyUi();
}

const map = () => { try { return game.settings.get(MODULE_ID, "playerTools") ?? {}; } catch { return {}; } };

export function registerPlayerToolSettings() {
  game.settings.register(MODULE_ID, "playerTools", {
    scope: "world", config: false, type: Object, default: {},
    onChange: () => { try { ui.controls?.render?.({reset: true}); } catch (e) { console.warn("WoDX | toolbar refresh", e); } }
  });
  // B4120: the parts of Foundry's own screen each player sees
  game.settings.register(MODULE_ID, "playerUi", {
    scope: "world", config: false, type: Object, default: {}, onChange: () => applyUi()
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
  const views = (() => { try { return game.settings.get(MODULE_ID, "playerViews") ?? {}; } catch { return {}; } })();
  const viewRow = `<tr class="wodx-view-row"><td><b>View</b><br><span class="wodx-quiet">Beginner puts the buttons in drawers; Full shows them all. The player can change it.</span></td>${
    players.map(u => `<td style="text-align:center"><select name="v.${u.id}" aria-label="${esc(`View for ${u.name}`)}"><option value="">World default</option>${
      Object.entries(VIEWS).map(([k, l]) => `<option value="${k}" ${views[u.id] === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></td>`).join("")}</tr>`;
  const head = `<tr><th>Button</th>${players.map(u => `<th title="${esc(u.name)}">${esc(u.name)}</th>`).join("")}</tr>`;
  const rows = PLAYER_TOOLS.map(t => `<tr data-search-text="${esc(`${t.label} ${t.module}`)}"><td><b>${esc(t.label)}</b><br><span class="wodx-quiet">${esc(t.module)}${t.locked ? " · always shown (safety)" : ""}</span></td>${
    players.map(u => `<td style="text-align:center"><input type="checkbox" name="t.${u.id}.${t.name}" ${toolShown(m, u.id, t.name) ? "checked" : ""} ${t.locked ? "disabled" : ""}
      aria-label="${esc(`${t.label} for ${u.name}`)}"></td>`).join("")}</tr>`).join("");
  const um = uiMap();
  const partHead = `<tr class="wodx-ui-head" data-search-text="screen parts"><td colspan="${players.length + 1}"><b>Screen parts</b><br><span class="wodx-quiet">${esc(UI_KEPT)}</span></td></tr>`;
  const partRows = UI_PARTS.map(p => `<tr data-search-text="${esc(`${p.label} ${p.hint ?? ""} screen`)}"><td><b>${esc(p.label)}</b>${p.hint ? `<br><span class="wodx-quiet">${esc(p.hint)}</span>` : ""}</td>${
    players.map(u => `<td style="text-align:center"><input type="checkbox" name="p.${u.id}.${p.key}" ${um?.[u.id]?.[p.key] === false ? "" : "checked"}
      aria-label="${esc(`${p.label} for ${u.name}`)}"></td>`).join("")}</tr>`).join("");
  const content = `<p class="wodx-prompt">Tick what each player sees: the WoDX buttons in the Token controls, then the parts of the screen. Storyteller-only buttons stay yours. This only tidies the screen; what a player may do is set by their role and by who owns what.</p>
    ${searchBox("table.wodx-player-tools", "Search buttons and screen parts…", "Search buttons and screen parts")}
    <div class="wodx-scroll" style="overflow:auto"><table class="wodx-player-tools" style="width:100%"><thead>${head}</thead><tbody>${viewRow}${rows}${partHead}${partRows}</tbody></table></div>`;
  const {DialogV2} = foundry.applications.api;
  const ticks = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Player interface"},
    position: {width: Math.min(900, 360 + 90 * players.length)},
    content,
    ok: {
      label: "Save", icon: "fa-solid fa-floppy-disk",
      callback: (event, button) => {
        const out = {__views: {}, __ui: {}};
        for ( const u of players ) {
          const v = button.form.querySelector(`[name="v.${u.id}"]`)?.value ?? "";
          if ( v ) out.__views[u.id] = v;
          out[u.id] = {};
          for ( const t of PLAYER_TOOLS ) out[u.id][t.name] = !!button.form.querySelector(`[name="t.${u.id}.${t.name}"]`)?.checked;
          out.__ui[u.id] = {};
          for ( const p of UI_PARTS ) out.__ui[u.id][p.key] = !!button.form.querySelector(`[name="p.${u.id}.${p.key}"]`)?.checked;
        }
        return out;
      }
    },
    rejectClose: false
  });
  if ( !ticks ) return;
  const {__views: chosen = {}, __ui: parts = {}, ...rest} = ticks;
  await game.settings.set(MODULE_ID, "playerViews", chosen);
  await game.settings.set(MODULE_ID, "playerTools", fromTicks(rest));
  await game.settings.set(MODULE_ID, "playerUi", uiFromTicks(parts));
  ui.notifications.info("Player interface saved; each player's screen changes now.");
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
