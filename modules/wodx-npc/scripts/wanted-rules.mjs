/**
 * WoDX NPC 0.41.0: a description that spreads and fades (B1823-B1827). Pure rules, no Foundry.
 *
 * When a breach, a fight or a crime has witnesses, WoDX writes down what they saw of the culprit, from WoDX Library's
 * look (marks: station, sides, dress, condition, size, face). The description is heard at once where it happened, goes
 * on with the alarm carriers of that place's Alert zones, and reaches the rest of the town after a time that depends
 * on the year. NPCs who have heard it test it against the look when they see the culprit again; changing clothes or a
 * disguise breaks the match, except where cameras and face matching keep the face. It fades with time.
 *
 * Nothing here comes from the books: V20 has no rules for a description abroad. The roll to know someone from a
 * description is Perception + Alertness, the pool WoDX NPC already uses for noticing; the means of each age, the times, the fade
 * and the difficulties are house figures (docs/PENDING-REVIEW.md).
 * NPC 0.61.0 (B2914): someone dressed as a stranger to the part of the world they stand in is noticed. A
 * description of a foreigner fades half as slowly again, and a change of clothes does not break it while they still
 * dress as foreigners; blending into a crowd (Stealth or Subterfuge) is one harder for them. Dress of the place ends it.
 */

export const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const HOUR = 3600, DAY = 86400;

/**
 * How word of a culprit gets round, by year. town: hours until every place in town has heard; fade: days until it is
 * forgotten; face: what the means keeps of the face ("none": only what people say; "part": a photograph, so a change
 * of clothes no longer breaks the match outright; "full": face matching, which a held disguise only weakens).
 */
export const MEANS = [
  {key: "hue", from: -10000, to: 1499, label: "the hue and cry and the town crier", town: 24, fade: 14, face: "none"},
  {key: "notice", from: 1500, to: 1849, label: "a printed notice and the constable's word", town: 48, fade: 30, face: "none"},
  {key: "wire", from: 1850, to: 1979, label: "a police sketch and the telegraph wire", town: 12, fade: 60, face: "none"},
  {key: "news", from: 1980, to: 1999, label: "a police sketch on the evening news", town: 6, fade: 90, face: "none"},
  {key: "camera", from: 2000, to: 2022, label: "camera footage and phone photos", town: 3, fade: 180, face: "part"},
  {key: "facematch", from: 2023, to: 99999, label: "cameras and face matching", town: 1, fade: 365, face: "full"}
];
/** The means of a year (0 or unknown: the hue and cry). */
export const meansAt = year => MEANS.find(m => num(year) >= m.from && num(year) <= m.to) ?? MEANS[0];
export const meansOf = key => MEANS.find(m => m.key === key) ?? MEANS[0];

/** What started it, for the card and the Storyteller's list. */
export const CAUSES = {breach: "a breach", fight: "a fight", theft: "a theft", force: "a break-in", break: "a break-in", fire: "a fire", desecrate: "a desecration", crime: "a crime"};
/** Map events from WoDX Interactables that count as a crime when someone sees who did it. */
export const CRIME_EVENTS = new Set(["theft", "force", "break", "fire", "desecrate", "fight"]);

/** Seconds of world time within which a second description of one culprit at one place is the same one. */
export const MERGE_SECONDS = 10 * 60;
/** Most descriptions kept at once. */
export const KEEP = 40;

const str = (v, n = 120) => (v === undefined || v === null || v === "" ? null : String(v).slice(0, n));
const strs = (list, n = 80, max = 8) => (Array.isArray(list) ? list.map(v => str(v, n)).filter(Boolean).slice(0, max) : []);

/** Marks as stored, cleaned (the shape WoDX Library's marksOf gives). */
export function normMarks(m = {}) {
  const f = m ?? {};
  return {station: Math.max(0, Math.min(5, Math.round(num(f.station)))), sides: strs(f.sides, 40), dress: strs(f.dress, 80, 4), condition: strs(f.condition, 20),
    size: ["small", "big", "huge"].includes(f.size) ? f.size : null, face: ["monstrous", "striking", "ugly"].includes(f.face) ? f.face : null,
    monstrous: !!f.monstrous, disguised: !!f.disguised, foreign: !!f.foreign, uncanny: strs(f.uncanny, 80, 3)};
}

/** Blending into a crowd while dressed as a stranger to these parts: this much more difficulty. */
export const FOREIGN_BLEND_DIFF = 1;
/** A description of a foreigner lasts this much longer. */
export const FOREIGN_FADE = 1.5;
/** Is someone dressed for one part of the world a stranger in another? Parts are WoDX Chronicle region parts. */
export const isForeign = (dressPart, herePart) => !!dressPart && !!herePart && dressPart !== herePart;

/** A description as stored, cleaned. */
export function normDesc(d = {}) {
  const f = d ?? {};
  const heard = {};
  for ( const [k, v] of Object.entries(f.heard ?? {}) ) if ( k && Number.isFinite(Number(v)) ) heard[String(k).slice(0, 120)] = Number(v);
  const means = meansOf(f.means).key;
  return {id: str(f.id, 40) ?? "", of: str(f.of, 40), ofName: str(f.ofName, 80) ?? "someone", named: !!f.named, cause: CAUSES[f.cause] ? f.cause : "crime",
    what: str(f.what, 160) ?? "", text: str(f.text, 400) ?? "", marks: normMarks(f.marks), at: num(f.at), scene: str(f.scene), sceneName: str(f.sceneName, 80) ?? "",
    means, heard, townAt: f.townAt === null || f.townAt === undefined ? null : num(f.townAt), witnesses: strs(f.witnesses, 80, 12), dropped: !!f.dropped};
}

/**
 * Write a description. marks: from WoDX Library; text: its words. named: a witness knows them by name. year: the
 * chronicle's. Returns the stored description, heard where it happened at once and in town after the means' hours.
 */
export function writeDesc({id = "", of = null, ofName = "", named = false, cause = "crime", what = "", marks = {}, text = "", at = 0, scene = null, sceneName = "", year = 0, witnesses = []} = {}) {
  const m = meansAt(year);
  return normDesc({id, of, ofName, named, cause, what, marks, text, at, scene, sceneName, means: m.key, heard: scene ? {[scene]: num(at)} : {}, townAt: num(at) + m.town * HOUR, witnesses});
}

/** A second sighting of the same culprit at the same place soon after: the same description, freshened. */
export function sameAs(list = [], {of = null, scene = null, at = 0} = {}) {
  return (list ?? []).map(normDesc).find(d => !d.dropped && d.of === of && d.scene === scene && Math.abs(num(at) - d.at) <= MERGE_SECONDS) ?? null;
}
export function merge(old, fresh) {
  const o = normDesc(old), f = normDesc(fresh);
  return normDesc({...o, marks: f.marks, text: f.text || o.text, named: o.named || f.named, what: o.what || f.what, at: Math.max(o.at, f.at),
    witnesses: [...new Set([...o.witnesses, ...f.witnesses])], heard: {...o.heard, ...f.heard, ...(o.scene ? {[o.scene]: Math.min(o.heard[o.scene] ?? f.at, f.at)} : {})}});
}

/** Add carried word: where an Alert zone's carrier takes it, and when. arrivals: [{scene, at}]. Earlier wins. */
export function carried(desc, arrivals = []) {
  const d = normDesc(desc);
  for ( const a of arrivals ?? [] ) {
    if ( !a?.scene ) continue;
    const t = num(a.at);
    if ( d.heard[a.scene] === undefined || t < d.heard[a.scene] ) d.heard[a.scene] = t;
  }
  return d;
}

/** How strong the description still is, 1 when new to 0 when forgotten. */
export function strength(desc, now = 0) {
  const d = normDesc(desc);
  if ( d.dropped ) return 0;
  const span = meansOf(d.means).fade * DAY * (d.marks.foreign ? FOREIGN_FADE : 1);
  return Math.max(0, Math.min(1, 1 - (num(now) - d.at) / span));
}
export const faded = (desc, now = 0) => strength(desc, now) <= 0;

/**
 * Has word reached a place? sceneId: the place's uuid; realm: true for an Umbral or Underworld map (word of a crime
 * among the living stops at the Shroud and the Gauntlet). Returns the world time it arrived, or null.
 */
export function heardAt(desc, sceneId, now = 0, {realm = false} = {}) {
  const d = normDesc(desc);
  if ( d.dropped || faded(d, now) ) return null;
  const own = d.heard[sceneId];
  if ( own !== undefined && own <= num(now) ) return own;
  if ( !realm && d.townAt !== null && d.townAt <= num(now) ) return d.townAt;
  return null;
}

const overlap = (a = [], b = []) => { const B = new Set(b.map(x => String(x).toLowerCase())); return a.filter(x => B.has(String(x).toLowerCase())).length; };

/**
 * Does someone now match a description? now: their marks as a stranger sees them now (a held disguise already
 * applied). held: a disguise held against this NPC. Returns {level: "strong" | "partial" | "none", why}.
 */
export function matchOf(desc, now = {}, {held = false} = {}) {
  const d = normDesc(desc), was = d.marks, is = normMarks(now);
  const face = meansOf(d.means).face;
  const dressSame = was.dress.length ? overlap(was.dress, is.dress) > 0 : was.station === is.station;
  const sidesSame = !was.sides.length || overlap(was.sides, is.sides) > 0;
  const changed = !dressSame || !sidesSame || Math.abs(was.station - is.station) >= 2 || (is.disguised && !was.disguised);
  const body = (was.size && was.size === is.size) || (was.face && was.face === is.face);
  if ( face === "full" ) return held ? {level: "partial", why: "the disguise holds, but face matching still flags the face"} : {level: "strong", why: "face matching knows the face whatever the clothes"};
  if ( held ) return body || was.monstrous ? {level: "partial", why: "the disguise holds, but their size or face is hard to hide"} : {level: "none", why: "the disguise holds"};
  if ( changed ) {
    if ( was.foreign && is.foreign ) return {level: "partial", why: "new clothes, but still dressed as a stranger to these parts"};
    if ( face === "part" ) return {level: "partial", why: "new clothes, but the photographs show the face"};
    return body || was.monstrous ? {level: "partial", why: "new clothes, but their size or face still fits the description"} : {level: "none", why: "they have changed their clothes"};
  }
  const still = was.condition.filter(c => is.condition.includes(c));
  return {level: "strong", why: still.length ? `the same clothes, and still ${still.length > 1 ? "with the same marks on them" : `with ${{bloody: "blood on them", wounded: "the wounds", weapon: "a weapon drawn", torn: "torn clothes", filthy: "the filth", soaked: "wet clothes"}[still[0]] ?? "the same mark"}`}` : "the same clothes and looks"};
}

/**
 * The roll the Storyteller makes for an NPC who may know the culprit: Perception + Alertness, difficulty 6 for a
 * strong match, 8 for a partial one, 1 harder once the description is half forgotten (house figures). Null for none.
 */
export function recogniseRoll(level, str = 1) {
  if ( level !== "strong" && level !== "partial" ) return null;
  const difficulty = Math.min(10, (level === "strong" ? 6 : 8) + (num(str) < 0.5 ? 1 : 0));
  return {pool: "Perception + Alertness", difficulty, text: `Perception + Alertness, difficulty ${difficulty}`};
}

/**
 * Who tests a description they have heard: anyone who would hear the talk of the town, so every person, mortal or
 * not, of every era's templates (the watch, soldiers, knights, servants, gossips, hunters, Kindred). Animals, spirits,
 * ghosts and spectres do not (NPC 0.41.1: the first list named a few templates and left out the era ones).
 */
export const NON_TESTERS = new Set(["beast", "spirit", "ghost", "spectre"]);
export const tests = (template, {animal = false} = {}) => !animal && !NON_TESTERS.has(template);

/** The descriptions worth keeping: not dropped, not forgotten, newest last, at most KEEP. */
export function prune(list = [], now = 0) {
  return (list ?? []).map(normDesc).filter(d => d.id && !d.dropped && !faded(d, now)).sort((a, b) => a.at - b.at).slice(-KEEP);
}

/** The descriptions of someone now abroad. */
export const of = (list = [], actorId, now = 0) => (list ?? []).map(normDesc).filter(d => d.of === actorId && !d.dropped && !faded(d, now));

/** A one-line summary for the Storyteller: "after a theft at The Old Square, by the hue and cry; 3 days ago, fading". */
export function summary(desc, now = 0) {
  const d = normDesc(desc), s = strength(d, now);
  const age = Math.max(0, num(now) - d.at);
  const ago = age < HOUR ? "just now" : age < DAY ? `${Math.round(age / HOUR)} hours ago` : `${Math.round(age / DAY)} days ago`;
  return `after ${CAUSES[d.cause]}${d.sceneName ? ` at ${d.sceneName}` : ""}, by ${meansOf(d.means).label}; ${ago}${s < 0.5 ? ", fading" : ""}`;
}
