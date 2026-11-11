/**
 * WoDX Interactables 0.26.0: chases and pursuit. Pure rules, no Foundry, so the harness can test them.
 *
 * A chase is an extended, resisted roll (V20 Dark Ages pursuit, the dramatic systems of pp. 332-339; V20 core runs it
 * the same way). The quarry starts with one free success for every 2 yards of lead on foot, or every 10 yards mounted
 * or in a vehicle. Each turn every racer rolls and adds the successes to a running total. A pursuer whose total passes
 * the quarry's has caught up. The rest are house rules (B910 to B915), kept plain:
 *
 *   speed edge   the faster racer gains free successes each turn, one per 10 yards a turn faster, three at most (B911);
 *   ground       each kind of ground adds difficulty, caps the speed of hooves and wheels, and shuts some ways out (B912);
 *   flat out     +3 difficulty (the books' "fast while losing pursuers"), half as fast again for the edge; a botch flat
 *                out on a mount or in a vehicle throws the rider or crashes (B913);
 *   out of sight with a lead of 3 or more and cover about, the quarry may try Dexterity + Stealth against each pursuer's
 *                Perception + Alertness; a pursuer must score more to keep sight (B914);
 *   away         a lead of 10 successes, or no pursuer left, and the quarry is away (B915).
 *
 * Speeds are yards in a three-second turn. Running comes from WoDX Combat (20 + 3 x Dexterity, with Celerity and
 * wounds); the rest are house figures by year, kept to Moravia's dates as the travel rules are: bicycles from 1885,
 * motor cars from 1900, motorcycles and motorboats from 1910, and faster ones on the Future Darkness branch.
 */

export const TURN_SECONDS = 3;
export const FLAT_OUT = 3;
export const EDGE_PER = 10;
export const EDGE_MAX = 3;
export const SIGHT_LEAD = 3;
export const AWAY_LEAD = 10;

const band = (y, steps) => { let v = steps[0][1]; for ( const [from, s] of steps ) if ( y >= from ) v = s; return v; };

/**
 * Ways to run. pool: [attribute, ability]; hooves/wheels: for the ground caps; mounted: lead counts at 10 yards a
 * success; speed(year): yards a turn at full pace (foot: from the runner's own movement); from/to: the years.
 * mount: the Interactables mount kind it matches, so a token at the reins is guessed right.
 */
export const WAYS = {
  foot:      {label: "On foot", pool: ["dexterity", "athletics"], speed: null},
  horse:     {label: "On horseback", pool: ["dexterity", "ride"], hooves: true, mounted: true, mount: "horse", thrown: true, speed: () => 50},
  mule:      {label: "On a mule or donkey", pool: ["dexterity", "ride"], hooves: true, mounted: true, mount: "mule", thrown: true, speed: () => 30},
  cart:      {label: "By cart or wagon", pool: ["dexterity", "ride"], wheels: true, mounted: true, mount: "cart", to: 1960, speed: () => 15},
  carriage:  {label: "By carriage or coach", pool: ["dexterity", "ride"], wheels: true, mounted: true, mount: "carriage", to: 1945, speed: () => 25},
  boat:      {label: "By rowing boat", pool: ["stamina", "athletics"], water: true, mounted: true, mount: "boat", speed: () => 6},
  bicycle:   {label: "By bicycle", pool: ["dexterity", "athletics"], wheels: true, light: true, mounted: true, from: 1885, thrown: true,
    speed: y => band(y, [[1885, 20], [1950, 25]])},
  car:       {label: "By car", pool: ["dexterity", "drive"], wheels: true, motor: true, mounted: true, mount: "car", from: 1900,
    speed: y => band(y, [[1900, 30], [1920, 50], [1940, 70], [1960, 90], [1990, 110], [2040, 130]])},
  motorbike: {label: "By motorcycle", pool: ["dexterity", "drive"], wheels: true, light: true, motor: true, mounted: true, mount: "motorbike", from: 1910, thrown: true,
    speed: y => band(y, [[1910, 40], [1930, 70], [1960, 100], [2040, 130]])},
  motorboat: {label: "By motorboat", pool: ["dexterity", "drive"], water: true, motor: true, mounted: true, mount: "motorboat", from: 1910,
    speed: y => band(y, [[1910, 20], [1950, 35], [2040, 45]])}
};

/**
 * Kinds of ground. diff: added to every roll (vehicles take wheelDiff instead when set); cap: the most yards a turn for
 * hooves and wheels (light: bicycles and motorcycles); shuts: ways that cannot go there at all; cover: somewhere to
 * break sight.
 */
export const GROUNDS = {
  open:    {label: "Open country or fields", diff: 0, cap: {}, shuts: ["boat", "motorboat"], cover: false},
  road:    {label: "A road", diff: 0, cap: {}, shuts: ["boat", "motorboat"], cover: false},
  streets: {label: "Town streets", diff: 0, cap: {hooves: 30, wheels: 40}, shuts: ["boat", "motorboat"], cover: true},
  crowd:   {label: "A crowd or a market", diff: 1, wheelDiff: 2, cap: {hooves: 10, wheels: 10}, shuts: ["boat", "motorboat"], cover: true},
  rough:   {label: "Rough ground or woods", diff: 1, cap: {hooves: 25, light: 15}, shuts: ["cart", "carriage", "car", "boat", "motorboat"], cover: true},
  indoors: {label: "Indoors, alleys or rooftops", diff: 1, cap: {}, shuts: ["horse", "mule", "cart", "carriage", "car", "boat", "motorboat", "bicycle", "motorbike"], cover: true},
  water:   {label: "A river or a lake", diff: 0, cap: {}, shuts: ["foot", "horse", "mule", "cart", "carriage", "bicycle", "car", "motorbike"], cover: false}
};
export const groundKind = k => (GROUNDS[k] ? k : "streets");

/** Before street lamps and headlights (1900, as the travel rules), a chase at night is +1 for hooves and wheels. */
export const LIT_FROM = 1900;

/** Whether a way exists in a year. */
export function wayOpen(way, year) {
  const W = WAYS[way], y = Number(year) || 0;
  if ( !W ) return false;
  if ( !y ) return true;
  return (!W.from || y >= W.from) && (!W.to || y <= W.to);
}
/** The ways open in a year, [{id, label}], foot first. */
export function waysIn(year) {
  return Object.entries(WAYS).filter(([id]) => wayOpen(id, year)).map(([id, W]) => ({id, label: W.label}));
}
/** The way a token starts on: the mount it holds the reins of, if any and if open in the year; else on foot. */
export function wayFromMount(kind, year) {
  const id = Object.keys(WAYS).find(k => WAYS[k].mount && WAYS[k].mount === kind);
  return id && wayOpen(id, year) ? id : "foot";
}

/**
 * A racer's top speed this turn, in yards. r: {way, run (yards running, from WoDX Combat), flatOut}. ground: a GROUNDS key.
 * Returns {yards, capped} (capped: the ground held it down).
 */
export function speedOf(r, ground, year) {
  const W = WAYS[r.way] ?? WAYS.foot, G = GROUNDS[groundKind(ground)];
  let yards = W.speed ? W.speed(Number(year) || 2000) : Math.max(0, Number(r.run) || 0);
  if ( r.flatOut ) yards = Math.round(yards * 1.5);
  let cap = null;
  if ( W.hooves && G.cap.hooves ) cap = G.cap.hooves;
  if ( W.wheels && W.light && (G.cap.light ?? G.cap.wheels) ) cap = G.cap.light ?? G.cap.wheels;
  else if ( W.wheels && G.cap.wheels ) cap = G.cap.wheels;
  if ( cap !== null && yards > cap ) return {yards: cap, capped: true};
  return {yards, capped: false};
}

/** Whether a way can go on that ground. */
export const canGo = (way, ground) => !GROUNDS[groundKind(ground)].shuts.includes(way);

/** Free successes for the faster of two racers: one per 10 yards a turn, three at most. Returns {to: "a"|"b"|null, n}. */
export function edge(aYards, bYards) {
  const d = (Number(aYards) || 0) - (Number(bYards) || 0);
  const n = Math.min(EDGE_MAX, Math.floor(Math.abs(d) / EDGE_PER));
  return n ? {to: d > 0 ? "a" : "b", n} : {to: null, n: 0};
}

/** Free successes from a head start: one per 2 yards on foot, one per 10 mounted or in a vehicle (the way of the quarry). */
export function headStart(yards, way = "foot") {
  const per = WAYS[way]?.mounted ? 10 : 2;
  return Math.max(0, Math.floor((Number(yards) || 0) / per));
}

/**
 * The roll a racer makes this turn. r: {way, flatOut, dice: {attr dots, ability dots by key}}. Returns
 * {attr, ability, diff, parts}. night: a dark night; year: for the lamps.
 */
export function rollFor(r, ground, {night = false, year = 0} = {}) {
  const W = WAYS[r.way] ?? WAYS.foot, G = GROUNDS[groundKind(ground)];
  const parts = [];
  let diff = 6;
  const g = (W.wheels || W.motor) && G.wheelDiff !== undefined ? G.wheelDiff : G.diff;
  if ( g ) { diff += g; parts.push(`${G.label.toLowerCase()} +${g}`); }
  if ( r.flatOut ) { diff += FLAT_OUT; parts.push(`flat out +${FLAT_OUT}`); }
  const dark = night && (W.hooves || W.wheels) && (Number(year) || 0) < LIT_FROM;
  if ( dark ) { diff += 1; parts.push("unlit at night +1"); }
  return {attr: W.pool[0], ability: W.pool[1], diff: Math.min(10, diff), parts};
}

/**
 * A new chase. quarry: {id, name, way, run, lead (yards)}; pursuers: [{id, name, way, run}]. Each racer keeps a total.
 * The quarry's head start goes into its total.
 */
export function newChase({quarry, pursuers = [], ground = "streets", night = false, year = 0}) {
  const q = {...quarry, way: WAYS[quarry.way] ? quarry.way : "foot", flatOut: false, hide: false, total: headStart(quarry.lead, quarry.way)};
  const ps = pursuers.map(p => ({...p, way: WAYS[p.way] ? p.way : "foot", flatOut: false, total: 0, out: null}));
  return {v: 1, turn: 0, ground: groundKind(ground), night: !!night, year: Number(year) || 0, quarry: q, pursuers: ps, status: "running", log: []};
}

/** The quarry's lead over one pursuer, in successes (negative: caught up). */
export const leadOver = (st, p) => st.quarry.total - p.total;
const live = st => st.pursuers.filter(p => !p.out);

/**
 * One turn. rolls: {[racerId]: {successes, botch}} for the quarry and every pursuer still in it; sight: {[pursuerId]:
 * {successes, botch}} for the pursuers' Perception + Alertness when the quarry tries to break sight, plus
 * rolls[quarryId].stealth: {successes, botch} for the quarry's Dexterity + Stealth.
 * Returns {state (a new copy), events: [{kind, who, text}]}. kinds: edge, stuck, botch, thrown, crash, caught, lost, away, hidden.
 */
export function playTurn(st0, rolls = {}) {
  const st = structuredClone(st0), ev = [], q = st.quarry, year = st.year;
  if ( st.status !== "running" ) return {state: st, events: ev};
  st.turn += 1;
  const qSpeed = speedOf(q, st.ground, year).yards;
  const qGo = canGo(q.way, st.ground);
  // The quarry's roll
  const qr = rolls[q.id] ?? {successes: 0, botch: false};
  let qBotch = false;
  if ( !qGo ) ev.push({kind: "stuck", who: q.id, text: `${q.name} cannot go on ${GROUNDS[st.ground].label.toLowerCase()} ${WAYS[q.way].label.toLowerCase()}.`});
  else if ( qr.botch ) {
    qBotch = true;
    ev.push(botchEvent(q, qSpeed));
    q.total = 0;
  } else q.total += Number(qr.successes) || 0;
  // Each pursuer
  for ( const p of live(st) ) {
    const pr = rolls[p.id] ?? {successes: 0, botch: false};
    if ( !canGo(p.way, st.ground) ) {
      p.out = "stuck";
      ev.push({kind: "stuck", who: p.id, text: `${p.name} cannot follow ${WAYS[p.way].label.toLowerCase()} onto ${GROUNDS[st.ground].label.toLowerCase()}.`});
      continue;
    }
    const pSpeed = speedOf(p, st.ground, year).yards;
    if ( pr.botch ) {
      ev.push(botchEvent(p, pSpeed));
      p.out = "botch";
      continue;
    }
    p.total += Number(pr.successes) || 0;
    // The speed edge, between the quarry and this pursuer
    // (the quarry's own edge is counted once below, against the fastest pursuer)
    const e = qGo && !qBotch ? edge(qSpeed, pSpeed) : edge(0, pSpeed);
    if ( e.n && e.to === "b" ) { p.total += e.n; ev.push({kind: "edge", who: p.id, text: `${p.name} is faster: ${e.n} free success${e.n === 1 ? "" : "es"}.`}); }
  }
  // The quarry's edge: against the fastest pursuer still in it, so a slow one does not hand the quarry extra successes
  const chasers = live(st);
  if ( qGo && !qBotch && chasers.length ) {
    const fastest = Math.max(...chasers.map(p => speedOf(p, st.ground, year).yards));
    const e = edge(qSpeed, fastest);
    if ( e.n && e.to === "a" ) { q.total += e.n; ev.push({kind: "edge", who: q.id, text: `${q.name} is faster: ${e.n} free success${e.n === 1 ? "" : "es"}.`}); }
  }
  // Caught: a pursuer's total passes the quarry's
  const caughtBy = chasers.filter(p => p.total > q.total).sort((a, b) => b.total - a.total);
  if ( caughtBy.length ) {
    st.status = "caught";
    st.caughtBy = caughtBy.map(p => p.id);
    ev.push({kind: "caught", who: caughtBy[0].id, text: `${caughtBy.map(p => p.name).join(" and ")} ${caughtBy.length === 1 ? "catches" : "catch"} up with ${q.name}.`});
    st.log.push({turn: st.turn, events: ev});
    return {state: st, events: ev};
  }
  // Breaking sight
  if ( q.hide && qGo && !qBotch && GROUNDS[st.ground].cover ) {
    const minLead = Math.min(...chasers.map(p => leadOver(st, p)));
    if ( chasers.length && minLead >= SIGHT_LEAD ) {
      const s = rolls[q.id]?.stealth ?? {successes: 0, botch: false};
      const keep = chasers.filter(p => { const r = rolls[p.id]?.sight ?? {successes: 0}; return !s.botch && !r.botch ? r.successes > s.successes : !!s.botch; });
      for ( const p of chasers ) if ( !keep.includes(p) ) { p.out = "lost"; ev.push({kind: "lost", who: p.id, text: `${p.name} loses sight of ${q.name}.`}); }
      if ( !keep.length ) ev.push({kind: "hidden", who: q.id, text: `${q.name} slips out of sight.`});
    }
  }
  const still = live(st);
  if ( !still.length ) {
    st.status = "away";
    ev.push({kind: "away", who: q.id, text: `${q.name} gets away.`});
  } else if ( Math.min(...still.map(p => leadOver(st, p))) >= AWAY_LEAD ) {
    st.status = "away";
    for ( const p of still ) p.out = "behind";
    ev.push({kind: "away", who: q.id, text: `${q.name} leaves the pursuit behind.`});
  }
  st.log.push({turn: st.turn, events: ev});
  return {state: st, events: ev};
}

/** A botch: on foot a stumble that loses the ground made; on a mount thrown, in a vehicle a crash. */
function botchEvent(r, yards) {
  const W = WAYS[r.way] ?? WAYS.foot;
  if ( W.motor && !W.thrown ) return {kind: "crash", who: r.id, dice: crashDice(yards), text: `${r.name} crashes ${W.label.toLowerCase()}: ${crashDice(yards)} dice of lethal damage, soaked as usual, and the chase ends for them.`};
  if ( W.thrown ) return {kind: "thrown", who: r.id, dice: thrownDice(yards), text: `${r.name} is thrown: ${thrownDice(yards)} ${thrownDice(yards) === 1 ? "die" : "dice"} of bashing damage, and the chase ends for them.`};
  if ( r.way !== "foot" ) return {kind: "botch", who: r.id, text: `${r.name} loses control ${W.label.toLowerCase()} and comes to a stop.`};
  return {kind: "botch", who: r.id, text: `${r.name} stumbles and falls.`};
}
/** House figures (B913): a crash is a die of lethal for each 15 yards a turn, ten at most; thrown, one die for each 20 yards, at least one. */
export const crashDice = yards => Math.max(1, Math.min(10, Math.floor((Number(yards) || 0) / 15)));
export const thrownDice = yards => Math.max(1, Math.min(6, Math.floor((Number(yards) || 0) / 20)));

/** How it stands, in words for the players: no numbers. */
export function standing(st, p) {
  const l = leadOver(st, p);
  if ( p.out === "lost" ) return "has lost sight";
  if ( p.out ) return "is out of the chase";
  if ( l < 0 ) return "has caught up";
  if ( l === 0 ) return "is right behind";
  if ( l <= 2 ) return "is close behind";
  if ( l <= 5 ) return "is falling back";
  return "is far behind";
}

/** Rough yards between the quarry and a pursuer, from the lead in successes (2 a success on foot, 10 mounted). */
export const yardsBehind = (st, p) => Math.max(0, leadOver(st, p)) * (WAYS[st.quarry.way]?.mounted ? 10 : 2);
