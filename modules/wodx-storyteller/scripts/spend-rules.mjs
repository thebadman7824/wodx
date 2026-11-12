/**
 * WoDX Storyteller 0.38.0: time spent on long actions, the rules (no Foundry).
 *
 * One world clock serves every scene (B1600). Work done by characters who are apart from the main group goes on their
 * own personal time instead, and Convene lines everyone up later (B1601). The main group is the scene that holds more
 * than half of the player characters present tonight; with no such scene (a party split two and two), everyone is apart.
 */

export const MAX_ASK = 90 * 86400;
const DAY = 86400, HOUR = 3600;

/** Seconds kept whole and in range: 0 for nothing, at most MAX_ASK. */
export function cleanSeconds(s, max = MAX_ASK) {
  const n = Math.round(Number(s));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
}

/** Counts of present characters by scene. where: [{id, scene}] (scene null when the character has no token). */
export function sceneCounts(where = []) {
  const c = {};
  for ( const w of where ) if ( w?.scene ) c[w.scene] = (c[w.scene] ?? 0) + 1;
  return c;
}

/** The main group's scene: one holding more than half of the present characters with a token, or null. */
export function mainScene(where = []) {
  const c = sceneCounts(where);
  const total = Object.values(c).reduce((t, n) => t + n, 0);
  for ( const [s, n] of Object.entries(c) ) if ( n * 2 > total ) return s;
  return null;
}

/**
 * Are these characters apart from the main group? Only when every one of them has a token, they share one scene, some
 * other present character is on another scene, and their scene is not the main group's.
 */
export function groupApart(ids = [], where = []) {
  const mine = ids.map(id => where.find(w => w.id === id)).filter(Boolean);
  if ( !mine.length || mine.length !== ids.length || mine.some(w => !w.scene) ) return false;
  const scene = mine[0].scene;
  if ( mine.some(w => w.scene !== scene) ) return false;
  const others = where.filter(w => w.scene && !ids.includes(w.id));
  if ( !others.some(w => w.scene !== scene) ) return false;
  return mainScene(where) !== scene;
}

/** A span in words, minutes to weeks. */
export function spanWords(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if ( s < 60 ) return `${s} second${s === 1 ? "" : "s"}`;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if ( s >= 7 * DAY && s % (7 * DAY) === 0 ) return plural(s / (7 * DAY), "week");
  if ( s >= DAY ) { const d = Math.floor(s / DAY), h = Math.round((s % DAY) / HOUR); return h ? `${plural(d, "day")} ${plural(h, "hour")}` : plural(d, "day"); }
  if ( s >= HOUR ) { const h = Math.floor(s / HOUR), m = Math.round((s % HOUR) / 60); return m ? `${plural(h, "hour")} ${m} min` : plural(h, "hour"); }
  return plural(Math.round(s / 60), "minute");
}

/** The line a card shows for what happened to the time. r: {how: "clock"|"personal"|"asked"|"none", seconds}. */
export function noteFor(r, names = "") {
  const w = spanWords(r?.seconds);
  switch ( r?.how ) {
    case "clock": return `The clock moves on ${w}.`;
    case "personal": return `${w} pass for ${names || "them"} alone, apart from the group. Convene lines everyone up again.`;
    case "asked": return `Sent to the Storyteller: ${w} to pass.`;
    default: return "";
  }
}
