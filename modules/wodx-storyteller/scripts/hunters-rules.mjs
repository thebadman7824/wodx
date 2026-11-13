/**
 * Hunters across a region (B3300-B3305). Pure rules, no Foundry, so the harness can test them.
 *
 * Heat belongs to one place and the Veil track to the whole chronicle. This joins them into one pressure per world
 * region (WoDX Chronicle's WORLD_REGIONS): the hunters of that land and that year notice, watch, learn, send
 * someone, move against the culprit and, at the worst, purge. Pressure runs 0 to 10. It rises from what already
 * happens in WoDX (a hunting ground going hot, a breach with witnesses, a description going round, a failing Veil)
 * and cools when nothing new happens. Each region keeps a file on every culprit it has heard of; the file grows
 * while the hunters look, and when a culprit with a thick file moves to another region, word follows at the speed
 * of the year.
 *
 * Who hunts follows WoDX's hunter rules by era (WoDX Actions hunterLine, B42): inquisitors in the Dark Ages, The
 * Hunters Hunted II societies until 1998, the imbued of Hunter: The Reckoning from 1999 (on the Future Darkness
 * branch from 2023). Which bodies stand in a region follows the faith that region keeps (WoDX Chronicle faithFor).
 * The bodies and their dates are page-referenced below; the pressure figures, stages, file sizes and trail times are
 * house figures (docs/PENDING-REVIEW.md).
 */

export const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const DAY = 86400;
export const MAX = 10;
/** Days between the hunters' turns, and days without anything new before pressure falls by one. */
export const TURN_DAYS = 7, QUIET_DAYS = 14;
/** At most this many turns run at once after a long skip (the rest only cool). */
export const MAX_TURNS = 12;

/* ---------------- Stages ---------------- */

/** What the hunters of a region are doing at each pressure. diff: added to hunting difficulty in the region. */
export const STAGES = [
  {key: "quiet", min: 0, name: "Quiet", diff: 0, note: "Nobody who hunts the night is looking here."},
  {key: "rumours", min: 2, name: "Rumours", diff: 0, note: "Talk reaches those who listen for such things. Nobody has acted yet."},
  {key: "watching", min: 4, name: "Watching", diff: 0, note: "Someone keeps an eye on the worst places and writes down names. Descriptions here are taken seriously."},
  {key: "investigating", min: 6, name: "Investigating", diff: 0, note: "An investigator has come to this region. Questions are asked about the dead, the missing and the strangers."},
  {key: "hunting", min: 8, name: "Hunting", diff: 1, note: "The hunters move against whoever they know of. Hunting anywhere in the region is harder."},
  {key: "purge", min: 10, name: "Purge", diff: 1, note: "A crackdown: trials, raids, curfews. Every stranger is suspect, and the hunters accept losses."}
];
export const stageOf = p => [...STAGES].reverse().find(s => num(p) >= s.min) ?? STAGES[0];
export const stageIndex = p => STAGES.indexOf(stageOf(p));

/* ---------------- Who hunts, by faith, year and line ---------------- */

/**
 * The hunter rules of a year (the same split as WoDX Actions hunterLine, B42): "inquisitor" before 1500,
 * "hh2" from 1500 to 1998, "reckoning" from 1999. On the Future Darkness branch the imbued wake in 2023.
 */
export function lineOf(year, {futureBranch = false} = {}) {
  const y = num(year);
  if ( y < 1500 ) return "inquisitor";
  if ( y < (futureBranch ? 2023 : 1999) ) return "hh2";
  return "reckoning";
}

/**
 * The bodies that hunt. faiths: the faiths (WoDX Chronicle FAITHS ids) where the body stands; "*" everywhere.
 * learn: how fast its file grows; raid: it moves against culprits (false: it only watches and learns);
 * reach "world": from Investigating on it comes to any region. focus: what it hunts first.
 */
export const BODIES = [
  {key: "church-courts", label: "the bishops' courts and wandering friars", faiths: ["western", "orthodox"], from: -9999, to: 1230, line: "inquisitor", learn: 1, raid: true,
    ref: "V20 Dark Ages pp. 392-395 (True Faith); house reading before the Inquisition"},
  {key: "inquisition", label: "the Inquisition", faiths: ["western"], from: 1231, to: 1833, learn: 1, raid: true, zealous: true,
    ref: "V20 p. 370 (the Church's Inquisition, 1231 to 1834); Dark Ages: Inquisitor"},
  {key: "leopold", label: "the Society of Leopold", faiths: ["western"], from: 1834, to: 99999, learn: 1, raid: true, reach: "world",
    ref: "V20 p. 370; The Hunters Hunted II pp. 117-127"},
  {key: "sayyadin", label: "the sayyadin, tribesmen who hunt the night", faiths: ["islamic"], from: -9999, to: 1452, learn: 1, raid: true,
    ref: "The Hunters Hunted II p. 152"},
  {key: "ikhwan", label: "the Ikhwan al-Safa", faiths: ["islamic"], from: 1453, to: 99999, learn: 2, raid: true,
    ref: "The Hunters Hunted II pp. 152-153 (sayyadin and Sipahis joined under Mehmet II)"},
  {key: "judges", label: "the Judges", faiths: ["*"], from: -9999, to: 99999, learn: 2, raid: true, focus: "infernal", minor: true,
    ref: "The Hunters Hunted II pp. 154-155 (Jewish hunters who put infernalists first)"},
  {key: "arcanum", label: "the Arcanum", faiths: ["*"], from: 1885, to: 99999, learn: 2, raid: false, reach: "world",
    ref: "V20 p. 375; The Hunters Hunted II pp. 133-141 (chapter houses across the world). Founding year a house reading"},
  {key: "agency", label: "a state security service", faiths: ["*"], from: 1947, to: 99999, learn: 1, raid: true,
    ref: "V20 p. 375 (government agents); The Hunters Hunted II pp. 128-131. Outside North America a house reading"},
  {key: "imbued", label: "the imbued", faiths: ["*"], from: 1999, to: 99999, learn: 1, raid: true, line: "reckoning",
    ref: "Hunter: The Reckoning (imbued from 1999; Future Darkness branch from 2023)"},
  {key: "local", label: "local hunters: the bereaved, the devout and the stubborn", faiths: ["*"], from: -9999, to: 99999, learn: 1, raid: true, fallback: true,
    ref: "V20 pp. 370-377 (witch-hunters); The Hunters Hunted II (mortal hunters). House reading for lands without a named body"}
];
/** Region ids where the security service has the American name. */
export const AGENCY_NAMES = {"north-america": "the FBI's Special Affairs Division and Project Twilight"};
/** The witch trials: in lands of the Western church, pressure rises half as fast again (house reading). */
export const WITCH_TRIALS = {from: 1450, to: 1650, faith: "western", factor: 1.5};

/**
 * Who hunts in a region in a year. faith: the region's faith that year; region: its id; stage: the region's stage
 * index (bodies with world reach come from Investigating on). Returns the bodies, the leading one first.
 */
export function bodiesFor({faith = "western", region = null, year = 1197, futureBranch = false, stage = 0} = {}) {
  const y = num(year), line = lineOf(y, {futureBranch});
  const out = [];
  for ( const b of BODIES ) {
    if ( b.fallback ) continue;
    if ( y < b.from || y > b.to ) continue;
    if ( b.key === "imbued" && line !== "reckoning" ) continue;
    const home = b.faiths.includes("*") || b.faiths.includes(faith);
    if ( !home && !(b.reach === "world" && stage >= 3) ) continue;
    const label = b.key === "agency" && AGENCY_NAMES[region] ? AGENCY_NAMES[region] : b.label;
    out.push({...b, label, home});
  }
  // The leading body: a home body that raids, the imbued in their years, else whatever stands, else the local hunters
  const lead = out.find(b => b.key === "imbued") ?? out.find(b => b.home && b.raid && !b.minor && b.faiths[0] !== "*") ?? out.find(b => b.home && !b.minor && b.key !== "arcanum");
  const rest = out.filter(b => b !== lead);
  const local = {...BODIES.find(b => b.fallback), home: true};
  return lead ? [lead, ...rest] : [local, ...rest];
}
export const leadOf = opts => bodiesFor(opts)[0];
/** How fast the leading bodies learn: the best of them. */
export const learnRate = bodies => Math.max(1, ...bodies.map(b => num(b.learn)));
/** Can anyone here raid? */
export const canRaid = bodies => bodies.some(b => b.raid);

/* ---------------- What raises pressure ---------------- */

/**
 * Points each kind of event adds to a region (house figures). heatWatched/heatHunted: a hunting ground in the region
 * goes Watched or Hunted; breach: a breach with witnesses; description: a new description of a culprit; veil: each
 * turn while the Veil track stands at Hunted or worse; carried: word arrives from another region; response: the
 * Storyteller approves an era response to a hot place.
 */
export const POINTS = {heatWatched: 1, heatHunted: 2, breach: 1, description: 1, veil: 1, carried: 1, response: 1, cultWatched: 1, cultMoved: 2, manual: 0}; // cult*: WoDX NPC cults, B3306

/** A file the hunters keep on one culprit. level 0-4 (LEVELS); progress toward the next level. */
export const LEVELS = [
  {level: 0, name: "Nothing", note: "Only that something is wrong."},
  {level: 1, name: "A killer", note: "They know someone is behind the deaths and the talk."},
  {level: 2, name: "What it is", note: "They know what kind of creature this is."},
  {level: 3, name: "Who and where", note: "They know a face, a name and where it rests."},
  {level: 4, name: "How to end it", note: "They know its weaknesses and have the means."}
];
export const PER_LEVEL = 4;
export const levelOf = l => LEVELS[clamp(Math.round(num(l)), 0, 4)];

/* ---------------- State ---------------- */

const str = (v, n = 120) => (v === undefined || v === null || v === "" ? null : String(v).slice(0, n));
const KEEP_LOG = 30, KEEP_FILES = 40;

export function normFile(f = {}) {
  const x = f ?? {};
  return {id: str(x.id, 60) ?? "", name: str(x.name, 80) ?? "someone", kind: str(x.kind, 40), level: clamp(Math.round(num(x.level)), 0, 4),
    progress: clamp(Math.round(num(x.progress)), 0, PER_LEVEL - 1), since: num(x.since), seen: num(x.seen), from: str(x.from, 60)};
}

export function normRegion(r = {}) {
  const x = r ?? {};
  const files = {};
  for ( const [k, v] of Object.entries(x.files ?? {}) ) { const f = normFile({...v, id: v?.id ?? k}); if ( f.id ) files[f.id] = f; }
  const acted = {};
  for ( const [k, v] of Object.entries(x.acted ?? {}) ) if ( k && Number.isFinite(Number(v)) ) acted[String(k).slice(0, 120)] = Number(v);
  return {pressure: clamp(Math.round(num(x.pressure)), 0, MAX), since: num(x.since), last: num(x.last), stage: STAGES.some(s => s.key === x.stage) ? x.stage : "quiet",
    files, acted, log: (Array.isArray(x.log) ? x.log : []).slice(-KEEP_LOG).map(e => ({at: num(e?.at), text: str(e?.text, 240) ?? ""}))};
}

/** The world setting: {regions: {id: region}, lastTurn, trail: [{file, to, at, from}]}. */
export function normState(s = {}) {
  const x = s ?? {};
  const regions = {};
  for ( const [k, v] of Object.entries(x.regions ?? {}) ) if ( k ) regions[String(k).slice(0, 60)] = normRegion(v);
  const trail = (Array.isArray(x.trail) ? x.trail : []).map(t => ({file: normFile(t?.file), to: str(t?.to, 60), from: str(t?.from, 60), at: num(t?.at)})).filter(t => t.to && t.file.id).slice(-60);
  return {regions, lastTurn: x.lastTurn === null || x.lastTurn === undefined ? null : num(x.lastTurn), trail};
}

const note = (r, at, text) => ({...r, log: [...r.log, {at, text}].slice(-KEEP_LOG)});

/** Pressure after quiet time: one less for every QUIET_DAYS since anything new happened. */
export function cooled(r, now) {
  const x = normRegion(r);
  const steps = Math.floor(Math.max(0, num(now) - x.last) / (QUIET_DAYS * DAY));
  if ( steps <= 0 || x.pressure <= 0 ) return x;
  return {...x, pressure: Math.max(0, x.pressure - steps), last: x.last + steps * QUIET_DAYS * DAY};
}

/**
 * Add pressure to a region. kind: a POINTS key (or n given). faith/year: for the witch trials. Returns {region,
 * before, after, crossed: the new stage when it changed}.
 */
export function addPressure(r, kind, now, {n = null, faith = null, year = 0, why = ""} = {}) {
  const x = cooled(r, now);
  let pts = n === null ? num(POINTS[kind]) : num(n);
  const wt = WITCH_TRIALS;
  if ( pts > 0 && faith === wt.faith && num(year) >= wt.from && num(year) <= wt.to ) pts = Math.ceil(pts * wt.factor);
  const before = x.pressure, after = clamp(before + pts, 0, MAX);
  let out = {...x, pressure: after, last: pts > 0 ? num(now) : x.last, since: x.since || num(now)};
  if ( why && after !== before ) out = note(out, num(now), `${why} (${before} to ${after})`);
  const s0 = stageOf(before), s1 = stageOf(after);
  out.stage = s1.key;
  return {region: out, before, after, crossed: s0.key !== s1.key ? s1 : null, rising: after > before};
}

/** Open or update a file on a culprit in a region. gain: progress points. */
export function noteCulprit(r, who, now, {gain = 0, kind = null, from = null} = {}) {
  const x = normRegion(r);
  if ( !who?.id ) return {region: x, file: null, levelled: false};
  const cur = x.files[who.id] ?? normFile({id: who.id, name: who.name, kind, since: now, from});
  let level = cur.level, progress = cur.progress + Math.max(0, Math.round(num(gain)));
  if ( level === 0 ) level = 1; // a culprit someone describes is at least "a killer"
  let levelled = level !== cur.level;
  while ( progress >= PER_LEVEL && level < 4 ) { level += 1; progress -= PER_LEVEL; levelled = true; }
  if ( level >= 4 ) progress = 0;
  const file = normFile({...cur, name: who.name ?? cur.name, kind: kind ?? cur.kind, level, progress, seen: now});
  let files = {...x.files, [file.id]: file};
  const ids = Object.values(files).sort((a, b) => b.seen - a.seen).slice(0, KEEP_FILES).map(f => f.id);
  files = Object.fromEntries(ids.map(id => [id, files[id]]));
  return {region: {...x, files}, file, levelled};
}

/** Progress the hunters of a region add to each file in one turn: by stage and how fast the bodies learn. */
export function turnGain(stageIdx, rate = 1) {
  if ( stageIdx < 2 ) return 0; // Quiet and Rumours: nobody is working the case
  return Math.min(3, stageIdx - 1) * Math.max(1, num(rate));
}

/** Days word of a culprit takes to reach another region, by year (house figures, after the description means). */
export const TRAIL = [
  {to: 1499, days: 60, label: "letters carried by friars and merchants"},
  {to: 1849, days: 30, label: "letters and the post"},
  {to: 1979, days: 7, label: "the telegraph and the telephone"},
  {to: 1999, days: 2, label: "fax and the telephone"},
  {to: 99999, days: 0, label: "the internet and shared databases"}
];
export const trailOf = year => TRAIL.find(t => num(year) <= t.to) ?? TRAIL.at(-1);

/**
 * Word follows a culprit who has moved region. files: the files a region holds; whereNow: {fileId: regionId} for
 * those who stand somewhere now; known: (regionId, fileId) => bool, files already held there. Only a file of level 2
 * or more is carried; it arrives one level lower. Returns the new trail entries.
 */
export function trailFrom(regionId, files, whereNow, now, year, known = () => false, pending = []) {
  const out = [], t = trailOf(year);
  for ( const f of Object.values(files ?? {}) ) {
    const to = whereNow?.[f.id];
    if ( !to || to === regionId || f.level < 2 || known(to, f.id) ) continue;
    if ( pending.some(p => p.to === to && p.file.id === f.id) ) continue;
    out.push({file: normFile({...f, level: f.level - 1, progress: 0, from: regionId}), to, from: regionId, at: num(now) + t.days * DAY});
  }
  return out;
}

/** How many turns are due since the last one (null: none ran yet, so one is due, starting the count). */
export function turnsDue(last, now, days = TURN_DAYS) {
  if ( last === null || last === undefined ) return 1;
  return Math.max(0, Math.floor((num(now) - num(last)) / (Math.max(1, num(days)) * DAY)));
}

/**
 * One turn for one region. Returns {region, events}: events are {kind, ...} for the Storyteller's cards and the
 * approval queue: "stage" (the stage changed), "level" (a file reached a new level), "investigator" (an
 * investigator comes, at Investigating), "raid" (the hunters move, at Hunting or Purge, against the file with the
 * highest level of 2 or more), "purge" (at Purge).
 */
export function regionTurn(r, now, {bodies = [], veilLow = false, faith = null, year = 0} = {}) {
  let x = cooled(r, now);
  // The stage last announced (add() keeps it current), so a card goes out only for a change made by this turn
  const events = [], before = STAGES.find(s => s.key === normRegion(r).stage) ?? stageOf(x.pressure);
  if ( veilLow && x.pressure >= 2 ) x = addPressure(x, "veil", now, {faith, year, why: "The Veil is failing"}).region;
  const idx = stageIndex(x.pressure), gain = turnGain(idx, learnRate(bodies));
  if ( gain ) {
    for ( const f of Object.values(x.files) ) {
      if ( f.level >= 4 ) continue;
      const res = noteCulprit(x, f, now, {gain});
      x = res.region;
      if ( res.levelled ) events.push({kind: "level", file: res.file, level: levelOf(res.file.level)});
    }
  }
  const after = stageOf(x.pressure);
  x.stage = after.key;
  if ( after.key !== before.key ) events.push({kind: "stage", stage: after, before});
  const top = Object.values(x.files).sort((a, b) => b.level - a.level || b.seen - a.seen)[0] ?? null;
  // The moves of each stage; the Storyteller's side skips one made in the last ACT_AGAIN_DAYS (actedLately)
  const ai = STAGES.indexOf(after);
  if ( ai === 3 ) events.push({kind: "investigator", file: top});
  if ( ai >= 4 && canRaid(bodies) && top && top.level >= 2 ) events.push({kind: "raid", file: top});
  if ( ai === 5 ) events.push({kind: "purge", file: top});
  return {region: x, events};
}

/** Days before the hunters of a region repeat the same move (an investigator, a raid on one culprit, a purge). */
export const ACT_AGAIN_DAYS = 28;
/** Has this move been made lately? key: "investigator", "raid:<file id>", "purge". */
export const actedLately = (r, key, now) => { const t = normRegion(r).acted[key]; return Number.isFinite(t) && num(now) - t < ACT_AGAIN_DAYS * DAY; };
export const markActed = (r, key, now) => { const x = normRegion(r); return {...x, acted: {...x.acted, [key]: num(now)}}; };
export const actKey = e => (e.kind === "raid" ? `raid:${e.file?.id ?? ""}` : e.kind);

/** The words for a card about a region. */
export function summary(r, bodies, now) {
  const x = cooled(r, now), s = stageOf(x.pressure);
  const who = bodies.map(b => b.label);
  const files = Object.values(x.files).filter(f => f.level > 0);
  return `${s.name} (pressure ${x.pressure} of ${MAX}). ${who.length ? `Who hunts here: ${who.join("; ")}.` : ""} ${files.length ? `They keep a file on ${files.length} ${files.length === 1 ? "culprit" : "culprits"}.` : "They know of nobody yet."}`.trim();
}

/** The extra hunting difficulty a region adds, beside a place's own heat; the total is capped at +3. */
export const huntExtra = (heatDiff, pressure) => Math.min(3, num(heatDiff) + stageOf(pressure).diff);
