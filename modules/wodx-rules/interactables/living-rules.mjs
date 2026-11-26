/**
 * WoDX Interactables 0.15.0: living maps. A tile that follows the clock and the chronicle's events: snow on the
 * roofs in winter, plague crosses on the doors in the plague years, a burned mill after the fire, lanterns on a
 * night of revel. Pure rules, with no Foundry in them, so the harness can test every one.
 *
 * A tile's rule (flags.wodx-interactables.living):
 *   mode    "off", "show" (the tile shows only while the rule holds), "hide" (hidden while it holds) or
 *           "art" (its picture changes to art while it holds, and back to the usual one after)
 *   when    the conditions, all of which must hold (fixed list below); none at all means the rule never holds
 *   event   a dated event's id (WoDX Chronicle), with eventWhen "after" (it has happened) or "before"
 *   from/to years, both inclusive; either may be empty
 *   art     the picture for mode "art"
 * 0.33.0: the condition "a caravan in town" holds on the scenes of a market where a caravan stands (WoDX Storyteller
 * 0.49.0), so wagons in the square or lorries at the depot show only while one is there.
 */

/** The conditions a Storyteller can tick. Fixed list. */
export const CONDITIONS = {
  winter: "Winter (December to February)", spring: "Spring (March to May)", summer: "Summer (June to August)", autumn: "Autumn (September to November)",
  night: "At night", day: "By day",
  snow: "Snow on the ground", rain: "Rain falling", fog: "Fog or mist",
  feast: "A feast day", revel: "A night of revel", fast: "A fast day or Lent",
  caravan: "A caravan in town (WoDX Storyteller's markets)"
};
export const MODES = {off: "Off", show: "Shows only while it holds", hide: "Hidden while it holds", art: "Changes picture while it holds"};
/**
 * 0.38.0 (B2904): what else the rule switches inside the tile's own square, while it holds. "block": walls there
 * stop movement and sight (market stalls close a lane by day); "lock": doors there are locked (the church shut on a
 * fast day); "light": the lights there are on (lanterns on a night of revel). When the rule stops holding they open,
 * unlock or go out again; a door WoDX did not lock stays as it was.
 */
export const ALSO = {none: "Nothing else", block: "Walls inside it block the way", lock: "Doors inside it are locked", light: "Lights inside it are on"};

/** The season of a month, in the north. */
export function seasonOfMonth(month) {
  const m = Number(month) || 1;
  return m === 12 || m <= 2 ? "winter" : m <= 5 ? "spring" : m <= 8 ? "summer" : "autumn";
}

/** A rule as stored, cleaned: unknown conditions dropped, years whole numbers or null, mode known. */
export function cleanRule(r = {}) {
  const yr = v => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)));
  const raw = Array.isArray(r.when) ? r.when : r.when && typeof r.when === "object" ? Object.keys(r.when).filter(k => r.when[k] === true || r.when[k] === "on")
    : String(r.when ?? "").split(/[\s,]+/);
  const when = raw.filter(k => CONDITIONS[k]);
  return {mode: MODES[r.mode] ? r.mode : "off", when: [...new Set(when)], event: r.event ? String(r.event).replace(/[^a-z0-9-]/gi, "").slice(0, 60) || null : null,
    eventWhen: r.eventWhen === "before" ? "before" : "after", from: yr(r.from), to: yr(r.to), art: String(r.art ?? "").trim().replace(/["'<>]/g, "").slice(0, 400) || null,
    also: ALSO[r.also] ? r.also : "none"};
}
/** Whether the rule asks anything at all. */
export const hasTest = r => !!(r.when.length || r.event || r.from !== null || r.to !== null);

/**
 * Whether a rule holds now. ctx: {month, year, isNight, church: {feast, revel, fast, season}, weather: [tags], fired: Set or [ids],
 * caravan: a caravan stands in this tile's scene (0.33.0)}
 * A rule that asks nothing never holds.
 */
export function holds(rule, ctx = {}) {
  const r = cleanRule(rule);
  if ( r.mode === "off" || !hasTest(r) ) return false;
  const season = seasonOfMonth(ctx.month);
  const tags = new Set(ctx.weather ?? []);
  const ch = ctx.church ?? {};
  const test = {
    winter: season === "winter", spring: season === "spring", summer: season === "summer", autumn: season === "autumn",
    night: !!ctx.isNight, day: !ctx.isNight,
    snow: tags.has("snow-lying") || tags.has("snow"), rain: tags.has("rain"), fog: tags.has("fog") || tags.has("mist"),
    feast: !!ch.feast, revel: !!ch.revel, fast: !!ch.fast && !String(ch.fast).startsWith("Friday"),
    caravan: !!ctx.caravan
  };
  if ( !r.when.every(k => test[k]) ) return false;
  if ( r.event ) {
    const fired = ctx.fired instanceof Set ? ctx.fired : new Set(ctx.fired ?? []);
    if ( (r.eventWhen === "after") !== fired.has(r.event) ) return false;
  }
  const y = Number(ctx.year);
  if ( r.from !== null && !(y >= r.from) ) return false;
  if ( r.to !== null && !(y <= r.to) ) return false;
  return true;
}

/**
 * The change a tile needs for its rule now. tile: {hidden, src, base (the picture before WoDX first changed it)}.
 * Returns {hidden?, src?, base?} with only what must change; {} when nothing does.
 */
export function changeFor(rule, on, tile = {}) {
  const r = cleanRule(rule);
  const out = {};
  if ( r.mode === "show" && !!tile.hidden !== !on ) out.hidden = !on;
  if ( r.mode === "hide" && !!tile.hidden !== on ) out.hidden = on;
  if ( r.mode === "art" && r.art ) {
    const base = tile.base || tile.src || null;
    const want = on ? r.art : base;
    if ( want && want !== tile.src ) { out.src = want; if ( !tile.base && tile.src && on ) out.base = tile.src; }
  }
  return out;
}

/** 0.38.0: is a point inside a tile's square? rect {x, y, width, height}. */
export const inside = (pt, rect) => !!pt && !!rect && pt.x >= rect.x && pt.x <= rect.x + rect.width && pt.y >= rect.y && pt.y <= rect.y + rect.height;
/** 0.38.0: a wall lies in the square when both its ends do. c: [x0, y0, x1, y1]. */
export const wallInside = (c, rect) => Array.isArray(c) && inside({x: c[0], y: c[1]}, rect) && inside({x: c[2], y: c[3]}, rect);
/**
 * 0.38.0: what the "also" switch asks of each thing in the square. Returns null when nothing.
 *   wall {door, move, sight}, light {hidden}, wodx {locked: WoDX locked this door}; senses NORMAL = 20, NONE = 0;
 *   door states CLOSED 0, LOCKED 2 (Foundry's numbers, passed in so no Foundry is needed here).
 */
export function linkedChange(also, on, kind, doc = {}, {NORMAL = 20, NONE = 0, CLOSED = 0, LOCKED = 2} = {}) {
  if ( also === "block" && kind === "wall" && !doc.door ) {
    const want = on ? NORMAL : NONE;
    return doc.move === want && doc.sight === want ? null : {move: want, sight: want};
  }
  if ( also === "lock" && kind === "wall" && doc.door ) {
    if ( on && doc.ds !== LOCKED ) return {ds: LOCKED, wodxLocked: true};
    if ( !on && doc.ds === LOCKED && doc.wodxLocked ) return {ds: CLOSED, wodxLocked: false};
    return null;
  }
  if ( also === "light" && kind === "light" ) return !!doc.hidden === !on ? null : {hidden: !on};
  return null;
}

/** One line for the tile config and the Storyteller's card: what the rule says, in words. */
export function ruleWords(rule, eventName = id => id) {
  const r = cleanRule(rule);
  if ( r.mode === "off" ) return "Off";
  const parts = r.when.map(k => CONDITIONS[k].replace(/ \(.*\)$/, "").toLowerCase());
  if ( r.event ) parts.push(`${r.eventWhen} ${eventName(r.event)}`);
  if ( r.from !== null && r.to !== null ) parts.push(`from ${r.from} to ${r.to}`);
  else if ( r.from !== null ) parts.push(`from ${r.from}`);
  else if ( r.to !== null ) parts.push(`until ${r.to}`);
  return `${MODES[r.mode]}: ${parts.length ? parts.join(", ") : "nothing set"}${r.also !== "none" ? `; ${ALSO[r.also].toLowerCase()} while it holds` : ""}`;
}

/** The key of the moment: a tile needs a fresh look only when this changes. */
export const momentKey = ctx => [ctx.year, ctx.month, ctx.day, ctx.isNight ? 1 : 0, (ctx.weather ?? []).slice().sort().join("+"),
  ctx.church?.feast ?? "", ctx.church?.revel ? 1 : 0, ctx.church?.fast ?? "", [...(ctx.fired ?? [])].sort().join("+"), [...(ctx.caravans ?? [])].sort().join("+")].join("|");
