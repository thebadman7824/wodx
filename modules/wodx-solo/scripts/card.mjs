/**
 * WoDX Solo: card scenes for places with no map, the rest of step 3 of The Lone Chronicle (B6040 to B6044).
 * card-rules.mjs holds the rules; this file does the Foundry side.
 *
 *   Places with no map  on the panel: the seat sends the towns of the country map that stand in the character's year
 *                       and have no scene of their own; the player picks one and the seat makes its card scene (once),
 *                       then sends the character there by the Travel window's own trip (time, fares, road encounters)
 *   The card            a drawing in the middle of the card scene: the town, the year and hour, the weather, the land,
 *                       the river and the road, written again each time the character arrives
 *   Look around         on a card scene: half an hour on the character's own clock, and the town's people may come
 *                       onto the scene, a few squares off and in plain sight, as a night encounter does
 *
 *   scene flag wodx-solo.card      the country map town id the card scene stands for
 *   drawing flag wodx-solo.card    true on the card drawing
 */
import * as K from "./card-rules.mjs";
import {addAsks, addActions, placeOf, tell, ask} from "./panel.mjs";
import {nightTick} from "./world.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-solo";
const ST = "wodx-storyteller";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const stApi = () => (game.modules.get(ST)?.active ? game.modules.get(ST).api ?? null : null);
const {DialogV2} = foundry.applications.api;

let H = null; // from main.mjs: {isOn, isSeat, log, get}

function actorFor(userId, actorId = null) {
  const user = game.users.get(userId);
  const named = actorId ? game.actors.get(actorId) : null;
  if ( named && user && (user.isGM || named.testUserPermission?.(user, "OWNER")) ) return named;
  return placeOf(user).actor;
}

/** The year on a character's own clock. */
async function yearOf(actor) {
  const st = stApi();
  const t = st?.personalTime?.(actor.id) ?? game.time.worldTime;
  return st?.tripContext?.(t, null)?.year ?? 0;
}

/** The country map's towns, with whether each stands in the year (a town founded later has since past it). */
function countryTowns(year) {
  const C = stApi()?.country;
  if ( !C?.towns ) return [];
  return C.towns().map(t => ({...t, since: C.townStands(t.id, year) ? 0 : Infinity}));
}

/** The towns that have a scene of their own (a map set at the town on the country map), and the card scenes. */
function mappedTowns() {
  const out = new Map();
  for ( const s of all(game.scenes) ) {
    const card = s.flags?.[MOD]?.card;
    const town = K.sceneTown(s.flags?.[ST]?.travel);
    if ( town && !card ) out.set(town, s);
  }
  return out;
}
/** Where a character stands: the scene the user views if the character is on it, else the active one, else any. */
function whereIs(actor, user) {
  if ( !actor ) return {scene: null, token: null};
  const holds = s => all(s.tokens).find(t => t.actorId === actor.id) ?? null;
  const scenes = all(game.scenes);
  const scene = scenes.find(s => s.id === user?.viewedScene && holds(s)) ?? scenes.find(s => s.active && holds(s)) ?? scenes.find(holds) ?? null;
  return {scene, token: scene ? holds(scene) : null};
}
const cardSceneOf = town => all(game.scenes).find(s => s.flags?.[MOD]?.card === town) ?? null;

/** The card's words for a town, now, on the character's clock. */
async function cardFor(town, actor, scene) {
  const st = stApi();
  const name = st?.country?.townName?.(town) ?? town;
  const t = st?.personalTime?.(actor.id) ?? game.time.worldTime;
  const year = await yearOf(actor);
  let time = "", weather = null;
  try {
    const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
    let lat = 50;
    try { lat = game.settings.get("wodx-chronicle", "latitude") ?? 50; } catch (e) { lat = 50; }
    const d = cal.describeTime(t, lat);
    time = `${d.weekday}, ${d.day} ${d.monthName}, ${d.timeLabel} ${d.isNight ? "by night" : "by day"}`;
  } catch (e) { time = ""; }
  try {
    const A = game.modules.get("wodx-atmosphere");
    const now = A?.active ? A.api?.weather?.now?.(scene) : null;
    if ( now ) weather = (await import("../../wodx-atmosphere/scripts/weather-rules.mjs")).describe(now);
  } catch (e) { weather = null; }
  let land = null;
  try { land = st?.country?.landAt?.({town, km: 0, dir: "N"}, year) ?? null; } catch (e) { land = null; }
  return K.cardLines({name, year, time, weather, land});
}

/** Write the card on the scene: make the drawing, or write it again. */
async function writeCard(scene, card) {
  const pad = scene.dimensions ? {x: scene.dimensions.sceneX, y: scene.dimensions.sceneY} : {x: 0, y: 0};
  const text = K.cardText(card);
  const old = all(scene.drawings).find(d => d.flags?.[MOD]?.card);
  if ( old ) { if ( old.text !== text ) await old.update({text}); return old; }
  const [d] = await scene.createEmbeddedDocuments("Drawing", [{
    x: pad.x + K.CARD_BOX.x, y: pad.y + K.CARD_BOX.y, shape: {type: "r", width: K.CARD_BOX.width, height: K.CARD_BOX.height},
    fillType: 1, fillColor: "#2b2319", fillAlpha: 0.92, strokeColor: "#9a8058", strokeWidth: 6, strokeAlpha: 1,
    text, fontFamily: "Signika", fontSize: 34, textColor: "#efe4cc", textAlpha: 1, locked: true,
    flags: {[MOD]: {card: true}}
  }]);
  return d;
}

/** Find or make the town's card scene. -> Scene or null */
export async function cardScene(town) {
  if ( !game.user.isGM ) return null;
  const st = stApi();
  const name = st?.country?.townName?.(town);
  if ( !name ) return null;
  const have = cardSceneOf(town);
  if ( have ) return have;
  const scene = await Scene.create({...foundry.utils.deepClone(K.CARD_SCENE), name, navName: name, navigation: false,
    flags: {[MOD]: {card: town, encounters: "town"}, [ST]: {travel: {on: true, at: {town, km: 0, dir: "N"}}}}});
  await H.log({kind: "scene", source: MOD, title: name, note: "a card scene was made for a place with no map"});
  return scene;
}

/** The seat sends the player the towns with no map, and whether the character stands on a card scene. */
export async function placesOf(userId, {actorId = null, send = true} = {}) {
  if ( !game.user.isGM ) return null;
  const actor = actorFor(userId, actorId);
  if ( !actor ) { await tell(userId, "<p>You have no character to send.</p>"); return null; }
  const year = await yearOf(actor);
  const mapped = mappedTowns();
  const rows = K.cardTowns({towns: countryTowns(year), year, mapped: [...mapped.keys()]});
  const here = whereIs(actor, game.users.get(userId)).scene;
  const onCard = here?.flags?.[MOD]?.card ? {sceneId: here.id, name: here.navName || here.name} : null;
  const payload = {userId, actorId: actor.id, actorName: actor.name, rows, onCard};
  if ( send ) {
    if ( userId === game.user.id ) showPlaces(payload);
    else game.socket.emit(`module.${MOD}`, {type: "places.rows", payload});
  }
  return payload;
}

/** The seat sends the character to a town with no map. -> the trip's result */
export async function goToCard(userId, {town = null, actorId = null} = {}) {
  if ( !game.user.isGM ) return null;
  const st = stApi();
  const actor = actorFor(userId, actorId);
  if ( !actor || !st?.travel ) return null;
  // a town that has a map after all is gone to on that map
  const mapped = mappedTowns().get(town);
  const scene = mapped ?? await cardScene(town);
  if ( !scene ) { await tell(userId, "<p>That place is not on the country map.</p>"); return null; }
  const r = await st.travel({actorId: actor.id, destId: scene.id, userId});
  if ( !r?.ok ) { await tell(userId, `<p>${esc(r?.why ?? "That trip could not be made.")}</p>`); return r; }
  if ( r.waiting ) { await tell(userId, `<p>The trip to ${esc(scene.name)} waits for the Storyteller: ${esc(r.why ?? "")}</p>`); return r; }
  if ( mapped ) return r;
  // the character stands below the card, not on it
  const tok = all(game.scenes.get(scene.id)?.tokens).find(t => t.actorId === actor.id);
  const pad = scene.dimensions ? {x: scene.dimensions.sceneX, y: scene.dimensions.sceneY} : {x: 0, y: 0};
  if ( tok ) await tok.update({x: pad.x + K.CARD_ARRIVE.x, y: pad.y + K.CARD_ARRIVE.y}, {animate: false});
  const card = await cardFor(town, actor, scene);
  await writeCard(scene, card);
  await tell(userId, `<h3>${esc(card.title)}</h3>${card.lines.map(l => `<p>${esc(l)}</p>`).join("")}`);
  return {...r, sceneId: scene.id, card};
}

/** The seat: the character looks around a card scene. -> {minutes, came} */
export async function lookAround(userId, {actorId = null} = {}) {
  if ( !game.user.isGM ) return null;
  const st = stApi();
  const actor = actorFor(userId, actorId);
  const {scene, token} = whereIs(actor, game.users.get(userId));
  if ( !actor || !scene?.flags?.[MOD]?.card || !token ) { await tell(userId, "<p>There is nothing to look around here.</p>"); return null; }
  await st?.advancePersonal?.(actor.id, K.LOOK_MINUTES * 60);
  const out = await nightTick({force: true, actorId: actor.id, sceneId: scene.id, kind: "town", title: "Looking around brought someone", salt: `:look:${Date.now() % 100000}`});
  const card = await cardFor(scene.flags[MOD].card, actor, scene);
  await writeCard(scene, card);
  await tell(userId, out?.text ? `<p>Half an hour of looking about. ${esc(out.text)}</p>` : "<p>Half an hour of looking about. Nobody comes near.</p>");
  return {minutes: K.LOOK_MINUTES, came: out?.tokens ?? []};
}

/** The player's choice of where to go. */
async function showPlaces({actorId = null, actorName = "", rows = [], onCard = null} = {}) {
  if ( !rows.length && !onCard ) { ui.notifications.info("Every town on the country map has a map of its own."); return; }
  const look = onCard ? `<label class="wsolo-pick"><input type="radio" name="pick" value="look" checked> Look around ${esc(onCard.name)} (half an hour)</label>` : "";
  const opts = rows.map((r, i) => `<li><label class="wsolo-pick"><input type="radio" name="pick" value="town:${esc(r.id)}"${!onCard && !i ? " checked" : ""}> ${esc(r.name)}</label></li>`).join("");
  const pick = await DialogV2.prompt({classes: ["wodx", "wodx-dialog", "wsolo-dialog"], window: {title: "Places with no map"}, position: {width: 420},
    content: `<p>${esc(actorName)} can go to a town no map is drawn for. The trip is a Travel trip, with its hours and fares; the place is a card that says what is there.</p>
      ${look}${searchBox("ul.wsolo-places", "Search towns…", "Search towns")}<ul class="wsolo-places">${opts}</ul>`,
    ok: {label: "Go", callback: (ev, b) => b.form.querySelector("input[name=pick]:checked")?.value ?? null}, rejectClose: false});
  if ( !pick ) return;
  if ( pick === "look" ) ask("ask.look", {actorId});
  else ask("ask.card", {actorId, town: pick.slice(5)});
}

const ACTIONS = {
  places() { ask("ask.places"); }
};

export function installCard(helpers) {
  H = helpers;
  addAsks({
    "ask.places": p => placesOf(p.userId, p),
    "ask.card": p => goToCard(p.userId, p),
    "ask.look": p => lookAround(p.userId, p)
  }, {"places.rows": showPlaces});
  addActions(ACTIONS);
}

export const cardApi = {rules: K, scene: cardScene, places: placesOf, go: goToCard, look: lookAround, show: showPlaces};
