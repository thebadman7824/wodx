/**
 * Ways (B4780-B4783): the open world's doorways. A Way is a region on a map with the behaviour "WoDX: Way to": a door,
 * a gate, a stair, a road's end, a ferry landing or the valley's edge. A character who walks into it goes to the place
 * it leads to, with the company close by, on the travellers' own time, through the trip rules of core.mjs. Pure, so the
 * harness can test it; ways.mjs is the Foundry side.
 */

/** The kinds of Way: the minutes a step takes (null: the trip rules work it out) and the words on the way in. */
export const WAY_KINDS = {
  door: {label: "Door", minutes: 1, words: "through the door"},
  stair: {label: "Stair or ladder", minutes: 1, words: "by the stair"},
  gate: {label: "Gate", minutes: 3, words: "through the gate"},
  street: {label: "Street or lane", minutes: 5, words: "along the street"},
  road: {label: "Road's end", minutes: null, words: "by the road"},
  ferry: {label: "Ferry or ford", minutes: 15, words: "over the water"},
  edge: {label: "The edge of the land", minutes: null, words: "out of the valley"}
};
export const WAY_ORDER = Object.keys(WAY_KINDS);

/** When a Way is shut. */
export const SHUT_KINDS = {
  "": {label: "Never shut"},
  night: {label: "Shut from dusk to dawn (a town gate)"},
  locked: {label: "Locked (the lock rules decide)"},
  asks: {label: "Asks the Storyteller first (a guarded place)"},
  closed: {label: "Shut for now (the Storyteller opens it)"}
};

/** The squares around the walker a companion may stand in to go along (desk ow3: within a few squares). */
export const NEAR_SQUARES = 3;

/**
 * Why the Way will not let the character through, with what can be done, or null when it is open.
 * ctx: {night, locked, closed, year, built: {from, to}}.
 */
export function wayBlocked(way = {}, ctx = {}) {
  const y = Number(ctx.year);
  const b = way.built ?? {};
  if ( Number.isFinite(y) && Number.isFinite(Number(b.from)) && b.from !== null && y < Number(b.from) ) return {why: "There is nothing there yet in this year.", can: []};
  if ( Number.isFinite(y) && Number.isFinite(Number(b.to)) && b.to !== null && y > Number(b.to) ) return {why: "That way is gone in this year.", can: []};
  const shut = way.shut ?? "";
  if ( shut === "closed" || ctx.closed ) return {why: "The way is shut.", can: ["Ask the Storyteller"]};
  if ( shut === "night" && ctx.night ) return {why: "The gate is shut for the night.", can: ["Knock and talk to the watch", "Bribe the watch", "Climb the wall", "Wait for dawn"]};
  if ( shut === "locked" && ctx.locked !== false ) return {why: "It is locked.", can: ["Pick the lock", "Force it", "Find the key", "Knock"]};
  return null;
}
/** Does this Way go to the Storyteller first? */
export const wayAsks = (way = {}) => (way.shut ?? "") === "asks";

/** The minutes a step through the Way takes: its own, else its kind's, else null for the trip rules. */
export function wayMinutes(way = {}) {
  const own = Number(way.minutes);
  if ( Number.isFinite(own) && own > 0 ) return Math.round(own);
  const k = WAY_KINDS[way.kind];
  return k?.minutes ?? null;
}

/**
 * Who goes along: the walker, then every token near it that the company owns (desk ow3). tokens: [{id, x, y, w, h,
 * pc, follows}] in pixels; grid: the size of a square. A follower set to follow its leader goes wherever it stands.
 */
export function companions(walker, tokens = [], grid = 100, squares = NEAR_SQUARES) {
  if ( !walker ) return [];
  const cx = t => t.x + (t.w ?? grid) / 2, cy = t => t.y + (t.h ?? grid) / 2;
  const reach = squares * grid + 1;
  const near = tokens.filter(t => t.id !== walker.id && ((t.follows && (t.follows === walker.actorId || t.follows === walker.id))
    || (t.pc && Math.hypot(cx(t) - cx(walker), cy(t) - cy(walker)) <= reach)));
  return [walker, ...near];
}

/**
 * The valley as a network: problems in plain words. scenes: [{id, name, ways: [{to}]}] for the scenes that are places.
 * A scene with no Way out or no Way in is named, and so is a Way to a scene that is gone (desk ow6).
 */
export function checkNetwork(scenes = []) {
  const ids = new Set(scenes.map(s => s.id)), into = new Map(scenes.map(s => [s.id, 0])), out = [];
  for ( const s of scenes ) {
    for ( const w of s.ways ?? [] ) {
      if ( !ids.has(w.to) ) out.push(`${s.name} has a way to a place that is not there.`);
      else into.set(w.to, (into.get(w.to) ?? 0) + 1);
    }
  }
  if ( scenes.length > 1 ) for ( const s of scenes ) {
    if ( !(s.ways ?? []).some(w => ids.has(w.to)) ) out.push(`${s.name} has no way out.`);
    if ( !into.get(s.id) ) out.push(`${s.name} has no way in.`);
  }
  // Every place reachable from the first one
  if ( scenes.length > 1 ) {
    const seen = new Set([scenes[0].id]), queue = [scenes[0].id], by = new Map(scenes.map(s => [s.id, s]));
    while ( queue.length ) for ( const w of by.get(queue.shift())?.ways ?? [] ) if ( ids.has(w.to) && !seen.has(w.to) ) { seen.add(w.to); queue.push(w.to); }
    for ( const s of scenes ) if ( !seen.has(s.id) ) out.push(`${s.name} cannot be reached from ${scenes[0].name}.`);
  }
  return out;
}

/** The line the walker's players see on the way in. */
export function wayLine(way = {}, destName = "", minutes = null) {
  const k = WAY_KINDS[way.kind] ?? WAY_KINDS.door;
  const time = minutes === null ? "" : minutes < 1 ? ", a moment" : `, ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  return `${destName}, ${k.words}${time}.`;
}
