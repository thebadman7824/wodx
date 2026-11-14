/**
 * Crisis levers for a region (B3524 to B3527), the pure part. One window per region holds a slider for each running
 * system; each slider writes into that system's own record, so nothing new is simulated:
 *   plague    the strength of the region's outbreaks (WoDX Storyteller contagion: each outbreak's weekly attack rate)
 *   wyrm      how fast Wyrm corruption deepens and spreads (WoDX Otherworlds: the region's spread rate)
 *   hunters   hunter pressure (WoDX Storyteller hunters: the region's pressure, 0 to 10)
 *   gauntlet, shroud, banality   a shift of up to 2 either way at every place in the region (WoDX Otherworlds drift)
 * Every change is dated and kept in the log with what it was before, so it can be undone.
 */

export const LEVERS = {
  plague: {label: "Plague strength", min: 0.5, max: 2, step: 0.25, neutral: 1, unit: "times"},
  wyrm: {label: "Wyrm corruption spreads", min: 0, max: 3, step: 0.5, neutral: 1, unit: "times"},
  hunters: {label: "Hunter pressure", min: 0, max: 10, step: 1, neutral: null, unit: "points"},
  gauntlet: {label: "Gauntlet", min: -2, max: 2, step: 1, neutral: 0, unit: "shift", track: "value"},
  shroud: {label: "Shroud", min: -2, max: 2, step: 1, neutral: 0, unit: "shift", track: "shroud"},
  banality: {label: "Banality", min: -2, max: 2, step: 1, neutral: 0, unit: "shift", track: "banality"}
};
export const KEYS = Object.keys(LEVERS);
export const KEEP_LOG = 60;

const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/** A lever's value kept to its range and step. */
export function clampLever(key, v) {
  const L = LEVERS[key];
  if ( !L ) return 0;
  const x = Number.isFinite(Number(v)) ? Number(v) : (L.neutral ?? L.min);
  const stepped = Math.round((x - L.min) / L.step) * L.step + L.min;
  return Math.max(L.min, Math.min(L.max, Math.round(stepped * 100) / 100));
}

/**
 * What hunts in the region, in the era's words: the Inquisition from its founding in 1231 to the end of the witch
 * trials, the age's hunters otherwise (house wording; the hunters system's own stages are unchanged).
 */
export function huntersLabel(year = 1197) {
  const y = num(year);
  if ( y < 1231 ) return "Hunter pressure (zealots and witch-finders)";
  if ( y <= 1750 ) return "Hunter pressure (the Inquisition and the witch-hunters)";
  return "Hunter pressure";
}

/** The sliders this region can show: only the systems that are running. on: {plague, wyrm, hunters, drift}. */
export function available(on = {}, {year = 1197} = {}) {
  return KEYS.filter(k => (k === "plague" ? !!on.plague : k === "wyrm" ? !!on.wyrm : k === "hunters" ? !!on.hunters : !!on.drift))
    .map(k => ({key: k, ...LEVERS[k], label: k === "hunters" ? huntersLabel(year) : LEVERS[k].label}));
}

export function blankState() { return {regions: {}, log: []}; }

export function normState(s = {}) {
  const out = blankState();
  for ( const [id, r] of Object.entries(s?.regions ?? {}) ) {
    if ( !id ) continue;
    const keep = {};
    for ( const k of ["plague", "gauntlet", "shroud", "banality"] ) if ( r && r[k] !== undefined && r[k] !== null ) keep[k] = clampLever(k, r[k]);
    if ( Object.keys(keep).length ) out.regions[String(id).slice(0, 60)] = keep;
  }
  out.log = (Array.isArray(s?.log) ? s.log : []).filter(e => e && LEVERS[e.key] && e.region).slice(-KEEP_LOG)
    .map(e => ({id: String(e.id ?? ""), at: num(e.at), region: String(e.region).slice(0, 60), key: e.key, from: num(e.from), to: num(e.to),
      why: String(e.why ?? "").slice(0, 200), undone: !!e.undone, applied: e.applied && typeof e.applied === "object" ? e.applied : null}));
  return out;
}

/** The lever's reading as the region stands: the stored value, else the neutral one. */
export function valueOf(st, region, key) {
  const r = st?.regions?.[region] ?? {};
  if ( r[key] !== undefined ) return clampLever(key, r[key]);
  return LEVERS[key]?.neutral ?? 0;
}

/**
 * The changes a form asks for: [{key, from, to}] where the new value differs. current: {key: value}; asked: {key: value}.
 */
export function changes(current = {}, asked = {}, keys = KEYS) {
  const out = [];
  for ( const k of keys ) {
    if ( !(k in asked) || asked[k] === "" || asked[k] === null ) continue;
    const from = clampLever(k, current[k]), to = clampLever(k, asked[k]);
    if ( Math.abs(from - to) > 1e-9 ) out.push({key: k, from, to});
  }
  return out;
}

/** A plague factor change as a multiplier on the weekly attack rate, the attack kept between 0.001 and 0.9. */
export function scaleAttack(attack, from, to) {
  const f = num(from) || 1;
  return Math.max(0.001, Math.min(0.9, num(attack) * (num(to) / f)));
}

/** Record a change (stored values for the levers kept here; hunters and wyrm live in their own systems). */
export function record(st, {region, key, from, to, at = 0, why = "", id = "", applied = null}) {
  const s = normState(st);
  if ( ["plague", "gauntlet", "shroud", "banality"].includes(key) ) {
    const r = {...(s.regions[region] ?? {})};
    if ( Math.abs(to - (LEVERS[key].neutral ?? 0)) < 1e-9 ) delete r[key]; else r[key] = clampLever(key, to);
    if ( Object.keys(r).length ) s.regions[region] = r; else delete s.regions[region];
  }
  s.log = [...s.log, {id, at, region, key, from, to, why: String(why).slice(0, 200), undone: false, applied}].slice(-KEEP_LOG);
  return s;
}

/** The last change in the log that is not undone yet, for a region (or any). */
export function lastOpen(st, region = null) {
  const log = normState(st).log;
  for ( let i = log.length - 1; i >= 0; i-- ) if ( !log[i].undone && (!region || log[i].region === region) ) return log[i];
  return null;
}

/** Mark a change undone and put the stored value back. */
export function markUndone(st, id) {
  const s = normState(st);
  const e = s.log.find(x => x.id === id);
  if ( !e || e.undone ) return s;
  e.undone = true;
  if ( ["plague", "gauntlet", "shroud", "banality"].includes(e.key) ) {
    const r = {...(s.regions[e.region] ?? {})};
    if ( Math.abs(e.from - (LEVERS[e.key].neutral ?? 0)) < 1e-9 ) delete r[e.key]; else r[e.key] = e.from;
    if ( Object.keys(r).length ) s.regions[e.region] = r; else delete s.regions[e.region];
  }
  return s;
}

/** The log line in words: "Plague strength 1 to 1.5 times". */
export function words(e, year = 1197) {
  const L = LEVERS[e.key];
  if ( !L ) return "";
  const lab = e.key === "hunters" ? huntersLabel(year) : L.label;
  const f = v => (L.unit === "shift" ? `${v > 0 ? "+" : ""}${v}` : String(v));
  return `${lab}: ${f(e.from)} to ${f(e.to)}${L.unit === "times" ? " times" : ""}`;
}
