/**
 * WoDX NPC: where an NPC takes the fallen it carries (B5087 to B5089, Ben's choice on the Carry Bodies Desk follow-up,
 * 2026-11-15). Pure: no Foundry.
 *
 *   rescue   a living ally goes to the carrier's haven or home (a Cainite's haven first); a dead mortal ally to their
 *            own household's home for burial; a Cainite ally in torpor or slain to a haven to rest. With no such place,
 *            off the map's edge, to their own people beyond it.
 *   hide     a body goes into the nearest hiding spot with room (a wardrobe, a bed, a crawlspace...), where a search
 *            finds it; with none, away out of sight as before.
 *   capture  a captive goes to their faction's watch-house or barracks, else its keep, its haven or its cellars, else
 *            the captor's own post or haven, else off the map's edge; there they are tied and kept as a prisoner. A
 *            player's character is only taken once the Storyteller approves.
 *   proof    a body taken as proof or a specimen (hunters, WoDX NPC's motives): to the carrier's faction's place as a
 *            captive would be; arrival sends wodxBodyTaken for whoever wants it.
 */

/** Kinds of place (WoDX NPC's place tags) a faction keeps prisoners in, best first. */
export const PRISON_KINDS = ["gate", "castle", "haven", "sewer"];
/** What happens on arrival, by intent. */
export const AFTER = {
  safe: "laid down in safety", rest: "laid to rest", burial: "brought home for burial", hidden: "hidden away", prison: "tied and kept prisoner",
  proof: "taken as proof"
};

/** What the carrier does once there. */
export function afterFor({intent = "rescue", dead = false, kindred = false} = {}) {
  if ( intent === "hide" ) return "hidden";
  if ( intent === "capture" ) return "prison";
  if ( intent === "proof" ) return "proof";
  if ( dead ) return kindred ? "rest" : "burial";
  return "safe";
}

/**
 * The goal. places: [{id, kind, scene}] every tagged place; roles: the carrier's routine roles {home, haven, post}
 * (place ids); bodyRoles: the fallen one's own; factionPlaces: place ids the carrier's faction holds; hides:
 * [{id, distance, room}] hiding spots on this scene; here: this scene's id.
 * stayOnMap: the body is a player's character (rescued, they stay on this map).
 * -> {kind: "place"|"hide"|"edge"|"away", id, onScene, after}
 */
export function goalFor(o = {}) {
  const g = goalOn(o);
  // a player's character being rescued is never carried off the map: they go to a place on it, else away from danger
  if ( o.stayOnMap && o.intent !== "capture" && (g.kind === "edge" || (g.kind === "place" && !g.onScene)) ) return {kind: "away", id: null, onScene: true, after: g.after};
  return g;
}
function goalOn({intent = "rescue", dead = false, kindred = false, places = [], roles = {}, bodyRoles = {},
  factionPlaces = [], hides = [], here = ""} = {}) {
  const after = afterFor({intent, dead, kindred});
  const byId = new Map(places.map(p => [p.id, p]));
  const at = id => { const p = byId.get(id); return p ? {kind: "place", id: p.id, onScene: p.scene === here, after} : null; };
  const first = list => { for ( const id of list ) { const g = id ? at(id) : null; if ( g ) return g; } return null; };
  if ( intent === "hide" ) {
    const spot = [...hides].filter(h => h.room !== false).sort((a, b) => a.distance - b.distance)[0];
    return spot ? {kind: "hide", id: spot.id, onScene: true, after} : {kind: "away", id: null, onScene: true, after};
  }
  if ( intent === "capture" || intent === "proof" ) {
    const held = factionPlaces.map(id => byId.get(id)).filter(p => p && PRISON_KINDS.includes(p.kind))
      .sort((a, b) => (b.scene === here) - (a.scene === here) || PRISON_KINDS.indexOf(a.kind) - PRISON_KINDS.indexOf(b.kind));
    return (held[0] ? at(held[0].id) : null) ?? first([roles.post, roles.haven]) ?? {kind: "edge", id: null, onScene: true, after};
  }
  const order = after === "burial" ? [bodyRoles.home, bodyRoles.haven, roles.home, roles.haven]
    : kindred || after === "rest" ? [roles.haven, roles.home, bodyRoles.haven] : [roles.home, roles.haven, bodyRoles.home];
  return first(order) ?? {kind: "edge", id: null, onScene: true, after};
}

/** Arrived: within a square of the spot (squares between centres). */
export const arrived = squares => Number.isFinite(squares) && squares <= 1.01;

/** The cell of a reachable map nearest the goal cell (ties: the cheaper walk). map: reachable()'s Map of {c, g}. */
export function towardCell(map, goal, dist = (a, b) => Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j))) {
  let best = null;
  for ( const n of map.values() ) {
    const d = dist(n.c, goal);
    if ( !best || d < best.d || (d === best.d && n.g < best.n.g) ) best = {n, d};
  }
  return best ? {node: best.n, left: best.d} : null;
}

/** The nearest point on the scene's edge, inside it by half a square. rect {x, y, w, h}; p {x, y}; size: a square. */
export function edgePoint(rect, p, size = 100) {
  const h = size / 2;
  const d = [{k: "w", v: p.x - rect.x}, {k: "e", v: rect.x + rect.w - p.x}, {k: "n", v: p.y - rect.y}, {k: "s", v: rect.y + rect.h - p.y}]
    .sort((a, b) => a.v - b.v)[0].k;
  if ( d === "w" ) return {x: rect.x + h, y: p.y};
  if ( d === "e" ) return {x: rect.x + rect.w - h, y: p.y};
  if ( d === "n" ) return {x: p.x, y: rect.y + h};
  return {x: p.x, y: rect.y + rect.h - h};
}

/** A prisoner's record (kept in the world setting wodx-npc.prisoners). */
export function prisonerEntry({captive, name, captor = null, captorName = "", faction = null, factionName = "", place = null, placeName = "", pc = false, since = 0} = {}) {
  return {captive, name: String(name ?? ""), captor, captorName: String(captorName ?? ""), faction, factionName: String(factionName ?? ""),
    place, placeName: String(placeName ?? "somewhere off the map"), pc: !!pc, since: Number(since) || 0, freed: null};
}
/** The rumour players can hear of a prisoner. */
export const prisonerRumour = e => `${e.name} is held prisoner${e.factionName ? ` by ${e.factionName}` : e.captorName ? ` by ${e.captorName}` : ""}${e.placeName ? ` at ${e.placeName}` : ""}`;
/** Add or replace one record; set free keeps the record with the time. */
export function addPrisoner(list = [], e) { return [...(list ?? []).filter(x => x.captive !== e.captive || x.freed), e]; }
export function freePrisoner(list = [], captive, at = 0) {
  return (list ?? []).map(x => (x.captive === captive && !x.freed ? {...x, freed: Number(at) || 1} : x));
}
export const heldNow = (list = []) => (list ?? []).filter(x => !x.freed);

/**
 * The walk to a place on another map, carrying someone (Ben's pick 2026-11-15: travel time, then arrive). There is no
 * map of how far one scene lies from another, so: within the same region (the same town and its lands) an hour on foot
 * with a body carried, three hours to another region; dragging doubles it, a wheeled load (a cart) halves it. House
 * figures. -> seconds of game time
 */
export const TRIP_HOURS = {sameRegion: 1, otherRegion: 3};
export function tripSeconds({sameRegion = true, mode = "carry"} = {}) {
  const h = sameRegion ? TRIP_HOURS.sameRegion : TRIP_HOURS.otherRegion;
  const f = mode === "drag" ? 2 : mode === "cart" ? 0.5 : 1;
  return Math.round(h * f * 3600);
}
/** Trips due now (arrived) and trips the clock has gone back before (to take back). trips: [{id, due, left, arrived}] */
export function tripsAt(trips = [], now = 0) {
  const due = [], back = [];
  for ( const t of trips ?? [] ) {
    if ( !t.arrived && now >= t.due ) due.push(t);
    else if ( t.arrived && now < t.due ) back.push(t);
  }
  return {due, back};
}
