/**
 * Ways in Foundry (B4780-B4783): the region behaviour "WoDX: Way to", the Storyteller's Ways window and the check of
 * the network. A character who walks into a Way goes to the place it leads to through core.mjs travel(): the time goes
 * on the travellers' own clocks, the road's encounters and the dark apply, a place that asks first goes to the approval
 * queue, and each player's screen follows. The company's tokens close by, and followers, go along (desk ow3).
 *
 * Moving a token to another scene needs the Storyteller's browser (the active Storyteller client). With the solo seat
 * that seat does it; with nobody in the chair the walker is told the Way waits.
 */
import * as C from "./core.mjs";
import * as WR from "./way-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = C.MOD;
export const TYPE = "way";
const T = `${MOD}.${TYPE}`;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const recent = new Map();
// Characters just carried through a Way land on its other end; that is not a walk back (B4782).
const arrived = new Map();

export function registerWaySettings() {
  game.settings.register(MOD, "waysConfirm", {name: "Ways ask before they move a character", hint: "Off: walking into a door, gate or road's end goes at once. On: the player clicks Go first.",
    scope: "world", config: true, type: Boolean, default: false});
}

/** The behaviour type. Registered at init. */
export function registerWayBehavior() {
  const Base = foundry.data?.regionBehaviors?.RegionBehaviorType, f = foundry.data?.fields;
  if ( !Base || !f || !CONFIG.RegionBehavior?.dataModels ) return false;
  const E = CONST.REGION_EVENTS ?? {TOKEN_ENTER: "tokenEnter"};
  class WayBehavior extends Base {
    static defineSchema() {
      return {
        to: new f.StringField({required: false, blank: true, initial: "", label: "Leads to (scene id)", hint: "The place the Way goes to. The Ways window on the Storyteller toolbar sets it for you."}),
        arrive: new f.StringField({required: false, blank: true, initial: "", label: "Arrive at (region id there)", hint: "The Way's other end on that scene. Blank: the place's landing spot."}),
        kind: new f.StringField({required: false, blank: false, initial: "door", choices: Object.fromEntries(WR.WAY_ORDER.map(k => [k, WR.WAY_KINDS[k].label])), label: "Kind"}),
        shut: new f.StringField({required: false, blank: true, initial: "", choices: Object.fromEntries(Object.entries(WR.SHUT_KINDS).map(([k, v]) => [k, v.label])), label: "When it is shut"}),
        locked: new f.BooleanField({required: false, initial: true, label: "Locked now", hint: "For a Way that locks: untick it when the lock is picked, forced or opened."}),
        minutes: new f.NumberField({required: false, nullable: true, initial: null, integer: true, min: 0, max: 600, label: "Minutes", hint: "Blank: the kind's own time, or the trip rules for a road."}),
        from: new f.NumberField({required: false, nullable: true, initial: null, integer: true, label: "There from the year", hint: "Blank: always. A wall gate built in 1199, a railway cutting in 1866."}),
        until: new f.NumberField({required: false, nullable: true, initial: null, integer: true, label: "Gone after the year"})
      };
    }
    static events = {[E.TOKEN_ENTER]: async function (event) { await onEnter(this, event); }};
  }
  CONFIG.RegionBehavior.dataModels[T] = WayBehavior;
  CONFIG.RegionBehavior.typeLabels[T] = "WoDX: Way to";
  if ( CONFIG.RegionBehavior.typeHints ) CONFIG.RegionBehavior.typeHints[T] = "A door, gate, stair or road's end: walk a token in and the company goes to the place it leads to, on their own time.";
  if ( CONFIG.RegionBehavior.typeIcons ) CONFIG.RegionBehavior.typeIcons[T] = "fa-solid fa-door-open";
  return true;
}

const wayOf = system => ({kind: system.kind, shut: system.shut, minutes: system.minutes, built: {from: system.from ?? null, to: system.until ?? null}});

/** On every client: the walker's own client confirms when the table wants it, then the Storyteller's client acts. */
async function onEnter(system, event) {
  const doc = event?.data?.token, behavior = system.parent, region = behavior?.parent ?? event?.region;
  if ( !doc || !region || behavior?.disabled || !system.to ) return;
  if ( !event.user?.isSelf ) return;
  const k = `${behavior.id}:${doc.id}`, t = Date.now();
  if ( recent.get(k) > t - 3000 || arrived.get(doc.actorId) > t - 5000 ) return;
  recent.set(k, t);
  const dest = game.scenes.get(system.to);
  if ( !dest ) return ui.notifications.warn("This way leads nowhere now.");
  const minutes = WR.wayMinutes(wayOf(system));
  if ( C.setting("waysConfirm") ) {
    const go = await foundry.applications.api.DialogV2.confirm({window: {title: C.sceneName(dest)}, content: `<p>${esc(WR.wayLine(wayOf(system), C.sceneName(dest), minutes))}</p>`,
      yes: {label: "Go"}, no: {label: "Stay"}, rejectClose: false});
    if ( !go ) return;
  }
  const payload = {regionUuid: region.uuid, behaviorId: behavior.id, tokenId: doc.id, sceneId: doc.parent?.id, userId: game.user.id};
  if ( C.isActiveGM() ) return answer(await walk(payload));
  if ( !game.users.activeGM ) return ui.notifications.warn("The way waits: moving to another place needs the Storyteller's table to be open.");
  game.socket.emit(C.SOCKET, {type: "req.way", payload});
}
function answer(r) {
  if ( !r ) return;
  if ( !r.ok ) ui.notifications.warn(r.why ?? "That way is shut.");
  else if ( r.waiting ) ui.notifications.info(`Waiting for the Storyteller: ${r.why}`);
}

/** On the Storyteller's client: through the Way, for the walker and the company close by. */
export async function walk({regionUuid, behaviorId, tokenId, sceneId, userId} = {}) {
  if ( !C.isActiveGM() ) return {ok: false, why: "Only the Storyteller's client moves tokens."};
  const region = await fromUuid(regionUuid), behavior = region?.behaviors?.get(behaviorId), scene = game.scenes.get(sceneId);
  const doc = scene?.tokens?.get(tokenId), user = game.users.get(userId);
  if ( !region || behavior?.type !== T || !doc?.actor || !user ) return {ok: false, why: "That way is gone."};
  if ( !user.isGM && !doc.actor.testUserPermission?.(user, "OWNER") ) return {ok: false, why: "That is not your character."};
  const s = behavior.system, dest = game.scenes.get(s.to);
  if ( !dest ) return {ok: false, why: "This way leads nowhere now."};
  const ctx = C.tripContext(C.personalTime(doc.actor.id), scene);
  const shut = WR.wayBlocked(wayOf(s), {night: ctx.night, locked: s.locked, year: ctx.year});
  if ( shut ) {
    await C.tell(user.id, `<p><b>${esc(region.name || "The way")}</b>: ${esc(shut.why)}${shut.can.length ? ` ${esc(shut.can.join(", "))}.` : ""}</p>`, {alsoGM: true});
    return {ok: false, why: shut.why};
  }
  const grid = scene.grid?.size ?? 100;
  const list = all(scene.tokens).map(t => ({id: t.id, actorId: t.actorId, x: t.x, y: t.y, w: (t.width ?? 1) * grid, h: (t.height ?? 1) * grid,
    pc: !!t.actor?.hasPlayerOwner, follows: (o => o?.kind === "follow" ? o.leader || null : null)(t.actor?.flags?.["wodx-npc"]?.order)}));
  const walker = list.find(t => t.id === doc.id);
  const going = WR.companions(walker, list, grid);
  const minutes = WR.wayMinutes(wayOf(s));
  const end = s.arrive ? dest.regions?.get(s.arrive) : null;
  const at = end ? centreOf(end) : null;
  const ask = WR.wayAsks(wayOf(s)) ? `${region.name || "This way"} asks the Storyteller first.` : null;
  const out = [];
  for ( const [i, t] of going.entries() ) {
    const a = game.actors.get(t.actorId);
    if ( !a ) continue;
    const owner = i === 0 ? user.id : (C.ownerOf(a)?.id ?? null);
    arrived.set(a.id, Date.now());
    out.push(await C.travel({actorId: a.id, destId: dest.id, userId: owner, way: {minutes, at: at ? {x: at.x + ((i % 3) - 1) * grid, y: at.y + Math.floor(i / 3) * grid} : null, ask}}));
  }
  Hooks.callAll("wodxWay", {from: scene.id, to: dest.id, kind: s.kind, actors: going.map(t => t.actorId), minutes});
  return out[0] ?? {ok: false};
}
function centreOf(region) {
  const sh = region.shapes?.[0];
  if ( !sh ) return null;
  if ( sh.type === "rectangle" ) return {x: sh.x + sh.width / 2, y: sh.y + sh.height / 2};
  if ( sh.type === "ellipse" || sh.type === "circle" ) return {x: sh.x, y: sh.y};
  if ( Array.isArray(sh.points) && sh.points.length >= 2 ) { const xs = sh.points.filter((_, i) => !(i % 2)), ys = sh.points.filter((_, i) => i % 2); return {x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length}; }
  return null;
}

/** A region with a Way behaviour, as data (pure enough to test the shape). rect in pixels. */
export function wayRegion({name, rect, to, arrive = "", kind = "door", shut = "", levelId = null}) {
  return {name, color: "#c9a227", shapes: [{type: "rectangle", x: rect.x, y: rect.y, width: rect.w, height: rect.h, rotation: 0, hole: false}],
    ...(levelId ? {levels: [levelId]} : {}), flags: {[MOD]: {way: {kind, to}}},
    behaviors: [{type: T, name: `Way to ${name}`, system: {to, arrive, kind, shut, locked: shut === "locked"}}]};
}
/** The edge square a Way sits on when no spot is given: the middle of the scene's side nearest the other place. */
function edgeRect(scene, side = "south") {
  const d = scene.dimensions ?? {}, g = d.size ?? scene.grid?.size ?? 100;
  const x0 = d.sceneX ?? 0, y0 = d.sceneY ?? 0, w = d.sceneWidth ?? scene.width ?? 2000, h = d.sceneHeight ?? scene.height ?? 2000;
  const mid = {x: x0 + w / 2 - g, y: y0 + h / 2 - g};
  return {north: {x: mid.x, y: y0, w: 2 * g, h: g}, south: {x: mid.x, y: y0 + h - g, w: 2 * g, h: g}, west: {x: x0, y: mid.y, w: g, h: 2 * g}, east: {x: x0 + w - g, y: mid.y, w: g, h: 2 * g}}[side];
}
const OPPOSITE = {north: "south", south: "north", east: "west", west: "east"};

/** A Way between two scenes, both ends, each arriving at the other. Returns {from, to} regions. */
export async function makeWay(from, to, {kind = "door", shut = "", side = "south", fromRect = null, toRect = null} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !from || !to || from.id === to.id ) throw new Error("A way needs two different places.");
  if ( !WR.WAY_KINDS[kind] ) throw new Error(`No such kind of way: ${kind}`);
  const [ra] = await from.createEmbeddedDocuments("Region", [{...wayRegion({name: C.sceneName(to), rect: fromRect ?? edgeRect(from, side), to: to.id, kind, shut}), behaviors: []}]);
  const [rb] = await to.createEmbeddedDocuments("Region", [{...wayRegion({name: C.sceneName(from), rect: toRect ?? edgeRect(to, OPPOSITE[side]), to: from.id, kind, shut}), behaviors: []}]);
  const beh = (other, otherEnd) => [{type: T, name: `Way to ${C.sceneName(other)}`, system: {to: other.id, arrive: otherEnd.id, kind, shut, locked: shut === "locked"}}];
  await ra.createEmbeddedDocuments("RegionBehavior", beh(to, rb));
  await rb.createEmbeddedDocuments("RegionBehavior", beh(from, ra));
  return {from: ra, to: rb};
}

/** Every place's Ways, for the network check. Only scenes that are places count. */
export function network() {
  return C.travelPlaces().map(p => ({id: p.id, name: p.name,
    ways: all(p.scene.regions).flatMap(r => [...(r.behaviors ?? [])].filter(b => b.type === T && !b.disabled).map(b => ({to: b.system.to, region: r.id})))}));
}
export const check = () => WR.checkNetwork(network().filter(s => s.ways.length || network().some(o => o.ways.some(w => w.to === s.id))));

/** The Storyteller's Ways window: make a Way between two places, and check that every place can be reached and left. */
export async function waysDialog() {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  const scenes = [...game.scenes].sort((a, b) => a.name.localeCompare(b.name));
  const opts = scenes.map(s => `<option value="${s.id}">${esc(C.sceneName(s))}</option>`).join("");
  const problems = check();
  const pick = await DialogV2.wait({classes: ["wodx-dialog"], window: {title: "Ways"}, rejectClose: false, position: {width: 540},
    content: `<p class="wodx-quiet">A Way is a door, gate, stair or road's end on a map. A character who walks into it goes to the place it leads to, with the company close by, on their own time. Each end is a region with the behaviour WoDX: Way to; move or reshape it like any region.</p>
      <div class="form-group"><label>From</label>${searchBox("select[name=from]", "Find a place…", "Search places to start from")}<select name="from">${opts}</select></div>
      <div class="form-group"><label>To</label>${searchBox("select[name=to]", "Find a place…", "Search places to go to")}<select name="to">${opts}</select></div>
      <div class="form-group"><label>Kind</label><select name="kind" data-fixed>${WR.WAY_ORDER.map(k => `<option value="${k}">${esc(WR.WAY_KINDS[k].label)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Shut</label><select name="shut" data-fixed>${Object.entries(WR.SHUT_KINDS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select></div>
      <div class="form-group"><label>On the side</label><select name="side" data-fixed>${["north", "south", "east", "west"].map(k => `<option value="${k}" ${k === "south" ? "selected" : ""}>${k[0].toUpperCase()}${k.slice(1)}</option>`).join("")}</select></div>
      <h3>The network</h3><p>${problems.length ? problems.slice(0, 12).map(esc).join("<br>") + (problems.length > 12 ? `<br>and ${problems.length - 12} more.` : "") : "Every place with a Way can be reached and left."}</p>`,
    buttons: [{action: "make", label: "Make the Way", default: true, callback: (e, b) => ({kind: b.form.elements.kind.value, shut: b.form.elements.shut.value, side: b.form.elements.side.value, from: b.form.elements.from.value, to: b.form.elements.to.value})},
      {action: "close", label: "Close"}]});
  if ( !pick || pick === "close" ) return null;
  try {
    const r = await makeWay(game.scenes.get(pick.from), game.scenes.get(pick.to), pick);
    ui.notifications.info(`The Way is made: ${r.from.name} and back.`);
    return r;
  } catch (err) { ui.notifications.warn(err.message); return null; }
}

/** A player's request, by socket. */
export async function onRequest(payload) {
  const r = await walk(payload);
  game.socket.emit(C.SOCKET, {type: "answer", payload: {userId: payload.userId, kind: "travel", result: {ok: !!r?.ok, why: r?.why ?? null, waiting: !!r?.waiting}}});
}
