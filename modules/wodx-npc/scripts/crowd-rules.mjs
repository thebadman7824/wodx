/**
 * WoDX NPC 0.40.0 (B2220 to B2226): the crowd as a resource. Pure rules, harness-tested.
 *
 * Passers-by (passerby-rules.mjs) carry two things the supernatural can use:
 *  - a feeling, the strongest thing they feel as they go by. A wraith whose Passion shares that feeling can draw
 *    Pathos from them at second hand (Wraith 20th p. 305, difficulty 8), once a scene for each wraith and passer-by.
 *  - a spark, how much creative dreaming they still have (0 to 3). A changeling can Ravage any mortal in the crowd,
 *    once a night each, and a Dreamer (spark 2 or more) is someone worth a Reverie (Changeling 20th pp. 259 to 264).
 * They can also come and go by doors the Storyteller marks on large maps (regions), not only by the edge of the map.
 *
 * House readings (docs/PENDING-REVIEW.md): the feelings each kind of place and person carries, the spark by age and
 * kind of person, the once-a-scene and once-a-night limits, and reading a Passion's feeling from its name.
 */

/** The feelings a crowd carries. The words a Passion's name may use for each are in FEELING_WORDS. */
export const FEELINGS = {
  love: "love", joy: "joy", lust: "desire", anger: "anger", fear: "fear", grief: "grief", greed: "greed", pride: "pride",
  envy: "envy", hope: "hope", despair: "despair", devotion: "devotion", longing: "longing", weariness: "weariness", curiosity: "curiosity"
};

/** Words in a Passion's name, mapped to a feeling. The first match wins, so the bracketed feeling W20 writes comes first. */
export const FEELING_WORDS = [
  ["love", /\b(love|loving|affection|compassion|tenderness|care|caring|protect\w*)\b/i],
  ["anger", /\b(anger|angry|hate|hatred|rage|fury|wrath|vengeance|revenge|spite|resentment)\b/i],
  ["fear", /\b(fear|terror|dread|horror|anxiety|panic|paranoia)\b/i],
  ["grief", /\b(grief|sorrow|sadness|mourning|regret|remorse|guilt|shame|loss)\b/i],
  ["joy", /\b(joy|happiness|delight|mirth|pleasure|glee|celebration)\b/i],
  ["lust", /\b(lust|desire|seduction)\b/i],
  ["greed", /\b(greed|avarice|wealth|money|gold)\b/i],
  ["pride", /\b(pride|vanity|honou?r|glory|ambition)\b/i],
  ["envy", /\b(envy|jealousy|covet\w*)\b/i],
  ["hope", /\b(hope|faith in|optimism|redemption)\b/i],
  ["despair", /\b(despair|hopelessness|apathy|melancholy)\b/i],
  ["devotion", /\b(devotion|piety|faith|worship|loyalty|duty|zeal)\b/i],
  ["longing", /\b(longing|yearning|nostalgia|homesick\w*|loneliness)\b/i],
  ["curiosity", /\b(curiosity|wonder|knowledge|truth|discovery)\b/i]
];

/** The feeling a Passion's name names, or null when the Storyteller must say. "Protect my daughter (Love)" is love. */
export function passionFeeling(name) {
  const s = String(name ?? "");
  const br = s.match(/\(([^)]+)\)\s*$/);
  for ( const part of br ? [br[1], s] : [s] ) {
    for ( const [k, re] of FEELING_WORDS ) if ( re.test(part) ) return k;
  }
  return null;
}

/**
 * What a crowd feels, by kind of place (passerby-rules.mjs PLACES keys). Weights; unlisted feelings count 0.2,
 * so anyone can feel anything now and then.
 */
export const PLACE_FEELINGS = {
  street: {weariness: 2, curiosity: 1, greed: 1, joy: 1, fear: 0.6, longing: 0.6},
  alley: {fear: 2.5, lust: 1.5, despair: 1.5, anger: 1, greed: 0.8},
  square: {greed: 3, joy: 1.5, curiosity: 1.5, envy: 1, pride: 1},
  yard: {weariness: 2.5, hope: 1, anger: 0.6, joy: 0.6},
  road: {weariness: 2, longing: 2, fear: 1.2, hope: 1},
  docks: {weariness: 2.5, greed: 1.5, longing: 1.5, anger: 1},
  park: {love: 2.5, joy: 1.5, grief: 1.5, longing: 1},
  tavern: {joy: 3, lust: 2, anger: 1.5, despair: 1, envy: 0.6},
  church: {devotion: 3, grief: 2, hope: 2, fear: 1},
  interior: {pride: 2.5, envy: 2, weariness: 1.5, fear: 1, lust: 0.8},
  home: {love: 2.5, weariness: 1.5, anger: 1, grief: 0.8},
  workplace: {weariness: 2.5, greed: 2, anger: 1, pride: 0.6},
  sewer: {despair: 2.5, fear: 2.5, anger: 1},
  hospital: {fear: 3, grief: 2.5, hope: 2, despair: 1.5},
  station: {longing: 2.5, weariness: 2, hope: 1, fear: 0.6, joy: 0.6},
  elysium: {pride: 3, envy: 2.5, lust: 1.5, fear: 1, curiosity: 0.8},
  none: {}
};
/** What each kind of person brings to it (passerby-rules.mjs PERSON_CAT), multiplied in. */
export const CAT_FEELINGS = {
  trade: {greed: 2, weariness: 1.2}, local: {weariness: 1.2, curiosity: 1.2}, gentry: {pride: 2, envy: 1.5, greed: 1.2},
  worker: {weariness: 2.5, anger: 1.5}, street: {weariness: 2, despair: 1.2}, young: {joy: 1.8, love: 1.8, curiosity: 1.8, lust: 1.3},
  servant: {weariness: 2, fear: 1.5}, religious: {devotion: 3, hope: 1.5}, poor: {despair: 2.5, hope: 1.3, longing: 1.5},
  drinker: {joy: 2.5, anger: 1.8, lust: 1.5, despair: 1.3}
};
/** By part of the day (passerby-rules.mjs bandOf). */
export const BAND_FEELINGS = {
  day: {weariness: 1.2, greed: 1.3, curiosity: 1.2}, evening: {joy: 1.3, love: 1.2, lust: 1.2},
  night: {lust: 1.5, fear: 1.4, anger: 1.3, despair: 1.2}, late: {despair: 1.6, fear: 1.5, longing: 1.4, weariness: 1.3}
};
/**
 * By age (passerby-rules.mjs AGES): faith fills the street of the Middle Ages and thins after; the Future Darkness
 * street is warier and lonelier.
 */
export const AGE_FEELINGS = {
  medieval: {devotion: 1.8, fear: 1.2}, early: {devotion: 1.5, fear: 1.1}, industrial: {weariness: 1.3, devotion: 1.1},
  c20: {fear: 1.2, weariness: 1.2, devotion: 0.8}, modern: {devotion: 0.6, curiosity: 1.2, longing: 1.1}, future: {devotion: 0.4, fear: 1.5, despair: 1.4, longing: 1.3}
};

function pick(weights, rng) {
  const rows = Object.entries(weights).filter(([, w]) => w > 0);
  const sum = rows.reduce((a, [, w]) => a + w, 0);
  let r = rng() * sum;
  for ( const [k, w] of rows ) { r -= w; if ( r <= 0 ) return k; }
  return rows.at(-1)?.[0] ?? "weariness";
}

/** The feeling a passer-by carries. place: a PLACES key (passerby-rules.mjs placeOf already resolved), cat: PERSON_CAT. */
export function feelingFor({place = "street", cat = "local", band = "day", age = "medieval", vesselState = "clean", rng = Math.random} = {}) {
  const w = {};
  const base = PLACE_FEELINGS[place] ?? PLACE_FEELINGS.street;
  for ( const k of Object.keys(FEELINGS) ) {
    w[k] = (base[k] ?? 0.2) * (CAT_FEELINGS[cat]?.[k] ?? 1) * (BAND_FEELINGS[band]?.[k] ?? 1) * (AGE_FEELINGS[age]?.[k] ?? 1);
  }
  if ( vesselState === "drunk" ) { w.joy *= 1.5; w.anger *= 1.5; w.despair *= 1.3; }
  if ( vesselState === "disease" ) { w.fear *= 2; w.despair *= 1.5; }
  return pick(w, rng);
}

/**
 * The spark of a passer-by, 0 to 3: how much creative dreaming is left in them. Banality grows with the ages, so the
 * chance falls from 1197 to the Future Darkness; the young, drinkers, the poor and the devout keep more of it.
 */
export const AGE_SPARK = {medieval: 1, early: 0.9, industrial: 0.7, c20: 0.6, modern: 0.5, future: 0.4};
export const CAT_SPARK = {young: 1.6, drinker: 1.3, poor: 1.2, religious: 1.2, street: 1, local: 0.9, trade: 0.8, servant: 0.8, worker: 0.7, gentry: 0.6};
export const DREAMER = 2;
export function sparkFor({age = "medieval", cat = "local", rng = Math.random} = {}) {
  const k = (AGE_SPARK[age] ?? 0.6) * (CAT_SPARK[cat] ?? 1);
  let s = 0;
  for ( const step of [0.7, 0.35, 0.12] ) if ( rng() < step * k ) s++; else break;
  return s;
}
export const SPARK_LABEL = ["no spark left", "a dull ember", "a Dreamer", "a bright Dreamer"];

/* ------------------------------------------------------------------ */
/*  Using the crowd                                                    */
/* ------------------------------------------------------------------ */

/** The night a world time falls in: noon to noon, so a night is not split at midnight. */
export const nightOf = worldTime => Math.floor(((Number(worldTime) || 0) - 12 * 3600) / 86400);

/**
 * Mortals in sight a wraith's Passion can draw on. mortals: [{id, name, feeling, used}] where used is the
 * passer-by's crowdUse flag ({pathos: {sceneKey: [wraithIds]}}); feeling null means the Storyteller says.
 * Returns {match, other}: those who feel what the Passion feels, and the rest.
 */
export function pathosCandidates(passionName, mortals = [], {wraithId, scene} = {}) {
  const want = passionFeeling(passionName);
  const free = (mortals ?? []).filter(m => !(m.used?.pathos?.[scene] ?? []).includes(wraithId));
  return {feeling: want, match: want ? free.filter(m => m.feeling === want) : [], other: free.filter(m => !want || m.feeling !== want)};
}
/** The crowdUse flag after a wraith drew on a mortal this scene. Only this scene's list is kept. */
export function markPathos(used = {}, {wraithId, scene} = {}) {
  const list = used?.pathos?.[scene] ?? [];
  return {...used, pathos: {[scene]: [...new Set([...list, wraithId])]}};
}

/** Can a changeling Ravage this mortal tonight? Once a night each (house rule): there is nothing left to take. */
export const ravagedTonight = (used, night) => used?.ravaged !== undefined && used?.ravaged !== null && Number(used.ravaged) === Number(night);
export const markRavaged = (used = {}, night = 0) => ({...used, ravaged: night});
export const markReverie = (used = {}, by = "") => ({...used, reverie: by});

/** What the Storyteller's card says about a mortal a changeling or wraith picks from the crowd. */
export function crowdLine(m) {
  if ( !m ) return "";
  const bits = [];
  if ( m.feeling ) bits.push(`feels ${FEELINGS[m.feeling]}`);
  if ( Number.isFinite(m.spark) ) bits.push(SPARK_LABEL[Math.max(0, Math.min(3, m.spark))]);
  return bits.join(", ");
}

/* ------------------------------------------------------------------ */
/*  Doors on large maps                                                */
/* ------------------------------------------------------------------ */

/** A region's name that makes it a door for passers-by without ticking it. */
export const DOOR_NAME = /\b(passers?-?by|crowd door|crowd)\b/i;

/** Bounds {x, y, width, height} of a region's shapes (Foundry RegionDocument shapes data), holes left out. */
export function shapeBounds(s) {
  if ( !s || s.hole ) return null;
  if ( s.type === "rectangle" ) return {x: s.x, y: s.y, width: s.width, height: s.height};
  if ( s.type === "circle" ) return {x: s.x - s.radius, y: s.y - s.radius, width: 2 * s.radius, height: 2 * s.radius};
  if ( s.type === "ellipse" ) return {x: s.x - s.radiusX, y: s.y - s.radiusY, width: 2 * s.radiusX, height: 2 * s.radiusY};
  if ( s.type === "polygon" && Array.isArray(s.points) && s.points.length >= 6 ) {
    const xs = s.points.filter((_, i) => i % 2 === 0), ys = s.points.filter((_, i) => i % 2 === 1);
    const x = Math.min(...xs), y = Math.min(...ys);
    return {x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y};
  }
  return null;
}
/**
 * A point inside one of the doors. doors: [{id, rects: [bounds], test?: point => boolean}]. The test (the region's
 * own testPoint) is tried up to eight times; past that the middle of a rect is used.
 */
export function pointInDoor(door, rng = Math.random) {
  const rects = (door?.rects ?? []).filter(r => r && r.width > 0 && r.height > 0);
  if ( !rects.length ) return null;
  for ( let i = 0; i < 8; i++ ) {
    const r = rects[Math.floor(rng() * rects.length)];
    const p = {x: r.x + rng() * r.width, y: r.y + rng() * r.height};
    if ( !door.test || door.test(p) ) return p;
  }
  const r = rects[0];
  return {x: r.x + r.width / 2, y: r.y + r.height / 2};
}
/**
 * A walk from one door to another (the same one when there is only one), maybe stopping a while on the way, as
 * passerby-rules.mjs planWalk does from edge to edge. rect: the scene's rect, for the stop.
 */
export function planDoorWalk(rect, doors = [], {rng = Math.random} = {}) {
  const ok = (doors ?? []).filter(d => d?.rects?.length);
  if ( !ok.length ) return null;
  const a = Math.floor(rng() * ok.length);
  const b = ok.length > 1 ? (a + 1 + Math.floor(rng() * (ok.length - 1))) % ok.length : a;
  const start = pointInDoor(ok[a], rng);
  const end = pointInDoor(ok[b], rng);
  if ( !start || !end ) return null;
  const waypoints = [];
  if ( rng() < 0.3 ) waypoints.push({x: rect.x + rect.width * (0.2 + 0.6 * rng()), y: rect.y + rect.height * (0.2 + 0.6 * rng()), wait: 10 + Math.floor(rng() * 40)});
  waypoints.push({...end, wait: 0, exit: true});
  return {start, waypoints, from: ok[a].id, to: ok[b].id};
}
/** The nearest door to p, for someone running away (a fight, a breach). */
export function nearestDoor(doors = [], p) {
  let best = null, bd = Infinity;
  for ( const d of doors ?? [] ) for ( const r of d?.rects ?? [] ) {
    if ( !r ) continue;
    const c = {x: r.x + r.width / 2, y: r.y + r.height / 2};
    const dist = Math.hypot(c.x - p.x, c.y - p.y);
    if ( dist < bd ) { bd = dist; best = {...c, exit: true, wait: 0}; }
  }
  return best;
}
