/**
 * Holy ground shared by several claims, the pure part (B3580-B3586). No Foundry in here.
 *
 * One place can be a caern, a Node, a freehold and an Elysium at once. Each role stays a place of its own on the
 * places of power register (power-rules.mjs, caern-rules.mjs), and the site ties them together with one strength
 * they all share. Drawing Gnosis at the Opened Caern, Quintessence or Tass at the Node, or Glamour by the balefire
 * lowers it; it wells up again week by week. Below half, every role weakens together: each draw gives half. Spent,
 * the site gives nothing until it fills. Every holder hears when another draws, and a quarrel builds between the
 * claims that draw while the site is weak.
 *
 * Book basis: a Node's rating matches a caern level the way the places of power register already reads it
 * (power-rules NODE_CAERN); W20 caerns and M20 Nodes both weaken as the Gauntlet thickens. The shared strength, its
 * size, its refill, the half yield and the quarrel are house rules (B3581-B3585): no book has one pool that several
 * lines draw on at once.
 */

export const DAY = 86400;
export const WEEK = 7 * DAY;
export const LOG_CAP = 30;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const int = v => Math.round(num(v));
const str = (v, n = 120) => String(v ?? "").slice(0, n);

/** The roles a site can hold. The first four are places on the register; Elysium is the site's own. */
export const ROLES = {caern: "Caern", node: "Node", freehold: "Freehold", chantry: "Chantry", elysium: "Elysium"};
/** What each role draws, in the words of its line. */
export const DRAWS = {caern: "Gnosis", node: "Quintessence", freehold: "Glamour", chantry: "Quintessence", elysium: ""};

/**
 * How strong holy ground is by age (house rule B3581): the Dark Ages caerns and the Mythic age's Nodes are stronger,
 * and sites thin as the Gauntlet rises. The Gauntlet drift of the scene moves it a tenth a step.
 */
export const ERA_STRENGTH = [
  {to: 1450, k: 1.5, label: "the Dark Ages and the Mythic age"},
  {to: 1700, k: 1.25, label: "the Renaissance"},
  {to: 1900, k: 1, label: "the age of reason and industry"},
  {to: 2022, k: 0.8, label: "the modern nights"},
  {to: Infinity, k: 0.6, label: "the Future Darkness"}
];
export const eraOf = year => ERA_STRENGTH.find(e => num(year) <= e.to) ?? ERA_STRENGTH[ERA_STRENGTH.length - 1];
export const strengthFactor = (year, drift = 0) => clamp(eraOf(year).k * (1 - 0.1 * int(drift)), 0.2, 2);

/** A site's level (1 to 5): the highest of its places (a caern's level, a Node's caern level, a freehold's rank). */
const NODE_CAERN = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
export function levelOf(places = []) {
  let lvl = 1;
  for ( const p of places ) {
    if ( !p ) continue;
    const l = p.kind === "caern" ? int(p.level) : p.kind === "node" ? NODE_CAERN[clamp(int(p.rating), 0, 10)] : p.kind === "freehold" ? int(p.rating) : 0;
    lvl = Math.max(lvl, clamp(l, 0, 5));
  }
  return lvl;
}
/** The most the site can hold, and what wells up in a week. */
export const maxFor = (level, year, drift = 0) => Math.max(5, Math.round(10 * clamp(int(level), 1, 5) * strengthFactor(year, drift)));
export const weeklyFor = (level, year, drift = 0) => Math.max(1, Math.round(2 * clamp(int(level), 1, 5) * strengthFactor(year, drift)));
/** Below this share the site is weak and each role gives half. */
export const WEAK = 0.5;
/** Draws by other claims while the site is weak before the quarrel goes to the Storyteller. */
export const QUARREL_AT = 3;

export function blankSite() {
  return {id: "", name: "Holy ground", scene: null, places: [], elysium: null, claims: {}, strength: null, last: null, quarrel: {}, log: []};
}
export function normElysium(e) {
  if ( !e ) return null;
  return {keeper: e.keeper ? str(e.keeper, 64) : null, court: str(e.court, 120), note: str(e.note, 300)};
}
export function normSite(s = {}) {
  const b = blankSite();
  const claims = {};
  for ( const [role, c] of Object.entries(s?.claims ?? {}) ) if ( ROLES[role] ) claims[role] = {faction: str(c?.faction, 120), holders: (Array.isArray(c?.holders) ? c.holders : []).map(h => str(h, 64)).filter(Boolean).slice(0, 20)};
  const quarrel = {};
  for ( const [k, v] of Object.entries(s?.quarrel ?? {}) ) if ( int(v) > 0 ) quarrel[str(k, 40)] = int(v);
  return {id: str(s?.id, 40), name: str(s?.name || b.name, 120), scene: s?.scene ? str(s.scene, 64) : null,
    places: [...new Set((Array.isArray(s?.places) ? s.places : []).map(p => str(p, 40)).filter(Boolean))].slice(0, 8),
    elysium: normElysium(s?.elysium), claims,
    strength: s?.strength === null || s?.strength === undefined || s?.strength === "" ? null : Math.max(0, int(s.strength)),
    last: s?.last === null || s?.last === undefined || s?.last === "" ? null : num(s.last), quarrel,
    log: (Array.isArray(s?.log) ? s.log : []).slice(-LOG_CAP).map(l => ({t: num(l?.t), text: str(l?.text, 300)}))};
}
export function blankState() { return {v: 1, list: []}; }
export function normState(st = {}) { return {v: 1, list: (Array.isArray(st?.list) ? st.list : []).map(normSite).filter(s => s.id)}; }
export const siteById = (st, id) => normState(st).list.find(s => s.id === id) ?? null;
export const siteOfPlace = (st, placeId) => normState(st).list.find(s => s.places.includes(placeId)) ?? null;
export const logLine = (s, t, text) => ({...s, log: [...(s.log ?? []), {t: num(t), text: str(text, 300)}].slice(-LOG_CAP)});

/** The roles a site holds now, from its places and its Elysium. */
export function rolesOf(site, places = []) {
  const s = normSite(site), out = [];
  for ( const p of places ) if ( p && s.places.includes(p.id) && ROLES[p.kind] ) out.push({role: p.kind, placeId: p.id, name: p.name, keepers: p.keepers ?? []});
  if ( s.elysium ) out.push({role: "elysium", placeId: null, name: "Elysium", keepers: s.elysium.keeper ? [s.elysium.keeper] : []});
  return out;
}

/** The site with its strength brought up to now. Returns {site, weeks, max}. */
export function accrue(site, t, {level = 1, year = 2000, drift = 0} = {}) {
  const s = normSite(site), max = maxFor(level, year, drift);
  if ( s.strength === null || s.last === null ) return {site: {...s, strength: s.strength === null ? max : Math.min(max, s.strength), last: num(t)}, weeks: 0, max};
  const weeks = Math.max(0, Math.floor((num(t) - s.last) / WEEK));
  const strength = Math.min(max, s.strength + weeks * weeklyFor(level, year, drift));
  return {site: {...s, strength, last: s.last + weeks * WEEK}, weeks, max};
}

/** The state of the site: {key, name, factor}. */
export function stateOf(strength, max) {
  const x = num(strength), m = Math.max(1, num(max));
  if ( x <= 0 ) return {key: "spent", name: "Spent", factor: 0, note: "The site gives nothing until it fills again."};
  if ( x < m * WEAK ) return {key: "weak", name: "Weakened", factor: 0.5, note: "Every role here gives half."};
  return {key: "strong", name: "Strong", factor: 1, note: "Every role draws in full."};
}

/**
 * How much a draw may take: the yield the role's own rules allow, cut to half when the site is weak, and never more
 * than the site holds. Returns {take, factor, state}.
 */
export function allow(site, max, want) {
  const s = normSite(site), st = stateOf(s.strength ?? max, max);
  const w = Math.max(0, int(want));
  const take = Math.min(Math.floor(w * st.factor), Math.max(0, s.strength ?? max));
  return {take, factor: st.factor, state: st};
}

/**
 * A draw on the site by one role. Returns {site, before, after, crossed, quarrel} where crossed is the new state when
 * the draw moves it (strong to weak, or to spent) and quarrel lists the pairs of claims that reached QUARREL_AT.
 */
export function draw(site, max, {role, points = 0, t = 0, who = "", rolesHere = []} = {}) {
  const s = normSite(site), pts = Math.max(0, int(points));
  const cur = s.strength ?? max, before = stateOf(cur, max);
  const strength = Math.max(0, cur - pts), after = stateOf(strength, max);
  let out = logLine({...s, strength}, t, `${who ? `${str(who, 60)} drew` : "Drawn:"} ${pts} ${DRAWS[role] || "power"} as the ${ROLES[role] ?? role} (${strength} of ${max} left).`);
  const quarrel = [];
  // A draw while the site is weak sets the other claims against this one
  if ( pts && before.key !== "strong" ) {
    const q = {...out.quarrel};
    for ( const other of new Set(rolesHere.filter(r => r !== role)) ) {
      const k = pairKey(role, other);
      q[k] = (q[k] ?? 0) + 1;
      if ( q[k] === QUARREL_AT ) quarrel.push(k);
    }
    out = {...out, quarrel: q};
  }
  return {site: out, before, after, crossed: after.key !== before.key ? after : null, quarrel};
}
export const pairKey = (a, b) => [a, b].sort().join("+");
export const pairRoles = k => String(k).split("+");
/** A quarrel settled (by treaty or by force): its count starts again. */
export const settle = (site, key) => { const s = normSite(site), q = {...s.quarrel}; delete q[key]; return {...s, quarrel: q}; };

/** A moot fills the site a little: half the Gnosis the sept gave (house rule B3584). */
export const mootGift = given => Math.floor(Math.max(0, int(given)) / 2);
export function restore(site, max, points, t = 0, why = "") {
  const s = normSite(site), cur = s.strength ?? max, strength = Math.min(max, cur + Math.max(0, int(points)));
  return {site: strength !== cur ? logLine({...s, strength}, t, `${why || "Restored"}: +${strength - cur} (${strength} of ${max}).`) : s, before: stateOf(cur, max), after: stateOf(strength, max)};
}

/** Who the claims are, for faction politics: [{role, faction, holders}]. */
export function claimsOf(site, roles = []) {
  const s = normSite(site);
  return roles.map(r => ({role: r.role, faction: s.claims[r.role]?.faction || "", holders: [...new Set([...(s.claims[r.role]?.holders ?? []), ...(r.keepers ?? [])])]}));
}

/** The holders to tell of a draw: everyone holding another role. */
export function toTell(site, roles = [], role) {
  return [...new Set(claimsOf(site, roles).filter(c => c.role !== role).flatMap(c => c.holders))];
}

/** One line for the site. */
export function describe(site, max, roles = [], year = 2000) {
  const s = normSite(site), st = stateOf(s.strength ?? max, max);
  return `${s.name}: ${roles.map(r => ROLES[r.role]).join(", ") || "no roles yet"}; strength ${s.strength ?? max} of ${max} (${st.name.toLowerCase()}), in ${eraOf(year).label}.`;
}
