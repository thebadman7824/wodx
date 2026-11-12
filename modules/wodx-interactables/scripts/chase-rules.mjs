/**
 * WoDX Interactables 0.26.0: chases and pursuit. Pure rules, no Foundry, so the harness can test them.
 *
 * A chase is the books' pursuit (V20 core printed pp. 261-262; V20 Dark Ages printed p. 335): an extended roll each
 * turn, the totals racing. The quarry starts with one free success for every 2 yards of lead on foot, or every 10 yards
 * on horseback or in a vehicle. A pursuer whose total passes the quarry's has caught up. To keep the quarry in sight,
 * the Storyteller may call a Perception roll (at most once a turn), +1 difficulty for every success the quarry leads
 * by; a failure, or a botch on the chase roll, and that pursuer has lost the quarry. A quarry's botch is a stumble or a
 * dead end. Driving: going fast to lose pursuers is +3, and a driver's pool cannot exceed the vehicle's Maneuver
 * (V20 core printed pp. 258-259); riding fast is +3, rough ground +1 (V20 Dark Ages printed p. 335). The rest are house
 * rules (B911 to B915), kept plain:
 *
 *   speed edge   the faster racer gains free successes each turn, one per 10 yards a turn faster, three at most; the
 *                book would skip the roll when one side is plainly faster (B911);
 *   ground       each kind of ground adds difficulty, caps the speed of hooves and wheels, and shuts some ways out (B912);
 *   flat out     +3 difficulty; a motor vehicle goes 30 mph past its safe speed (the book's +1 a 10 mph over it, not
 *                stacked on the +3), anything else half as fast again; a botch on a mount or in a vehicle is a fall or a
 *                crash, rolled as falling damage (V20 core printed p. 296): a die of bashing a 10 mph, ten at most,
 *                lethal at ten (B913);
 *   away         with no Perception roll called, a lead of 10 successes over everyone, or no pursuer left (B915).
 *
 * Speeds are yards in a three-second turn (1 mph is about 1.47 yards a turn). Running comes from WoDX Combat
 * (20 + 3 x Dexterity, V20 core printed p. 258, with Celerity and wounds), times the Garou form (W20 printed p. 269).
 * Cars and motorcycles have a safe and a top speed and a Maneuver by year, from the V20 vehicle chart for the modern
 * years and house figures before; the rest are house figures by year, kept to Moravia's dates as the travel rules are:
 * bicycles from 1885, motor cars from 1900, motorcycles and motorboats from 1910, faster ones on the Future Darkness branch.
 */

export const TURN_SECONDS = 3;
export const FLAT_OUT = 3;
export const EDGE_PER = 10;
export const EDGE_MAX = 3;
export const AWAY_LEAD = 10;
export const YD_PER_MPH = 1.47;
/** Motor vehicles flat out: this many mph past the safe speed (the book's +1 difficulty a 10 mph, kept within the +3). */
export const OVER_SAFE = 30;

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
    // [from year, safe mph, top mph, Maneuver]: the V20 chart's sedan and luxury sedan from 1990 and 2040, house figures before
    chart: [[1900, 20, 30, 3], [1920, 35, 55, 4], [1940, 50, 80, 4], [1960, 60, 100, 5], [1990, 70, 120, 5], [2040, 85, 155, 7]]},
  motorbike: {label: "By motorcycle", pool: ["dexterity", "drive"], wheels: true, light: true, motor: true, mounted: true, mount: "motorbike", from: 1910, thrown: true,
    chart: [[1910, 25, 45, 5], [1930, 45, 80, 6], [1960, 65, 110, 7], [1990, 75, 130, 7], [2040, 90, 160, 8]]},
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
/** A motor vehicle's chart row in a year: {safe, top (mph), maneuver}, or null for a way without one. */
export function chartOf(way, year) {
  const c = WAYS[way]?.chart;
  if ( !c ) return null;
  const y = Number(year) || 2000;
  let row = c[0];
  for ( const r of c ) if ( y >= r[0] ) row = r;
  return {safe: row[1], top: row[2], maneuver: row[3]};
}

/** Garou forms on foot (W20 printed p. 269): Hispo half as fast again, Lupus twice as fast, Crinos +2 yards on all fours. */
export function formRun(run, form) {
  const r = Math.max(0, Number(run) || 0);
  if ( form === "lupus" ) return r * 2;
  if ( form === "hispo" ) return Math.round(r * 1.5);
  if ( form === "crinos" ) return r + 2;
  return r;
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
  const ch = chartOf(r.way, year);
  let yards;
  if ( ch ) yards = Math.round(Math.min(ch.top, ch.safe + (r.flatOut ? OVER_SAFE : 0)) * YD_PER_MPH);
  else {
    yards = W.speed ? W.speed(Number(year) || 2000) : Math.max(0, Number(r.run) || 0);
    if ( r.flatOut ) yards = Math.round(yards * 1.5);
  }
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
 * The roll a racer makes this turn. r: {way, flatOut}. Returns {attr, ability, diff, parts, cap} (cap: the most dice, a
 * motor vehicle's Maneuver; null for none). night: a dark night; year: for the lamps and the chart.
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
  const ch = chartOf(r.way, year);
  return {attr: W.pool[0], ability: W.pool[1], diff: Math.min(10, diff), parts, cap: ch ? ch.maneuver : null};
}

/**
 * A new chase. quarry: {id, name, way, run, lead (yards)}; pursuers: [{id, name, way, run}]. Each racer keeps a total.
 * The quarry's head start goes into its total.
 */
export function newChase({quarry, pursuers = [], ground = "streets", night = false, year = 0}) {
  const q = {...quarry, way: WAYS[quarry.way] ? quarry.way : "foot", flatOut: false, total: headStart(quarry.lead, quarry.way)};
  const ps = pursuers.map(p => ({...p, way: WAYS[p.way] ? p.way : "foot", flatOut: false, total: 0, out: null}));
  return {v: 2, turn: 0, ground: groundKind(ground), night: !!night, year: Number(year) || 0, quarry: q, pursuers: ps, status: "running", sight: false, log: []};
}

/**
 * 0.28.0 (B1614): one more pursuer joins a running chase (a follower with its master). It starts level with the
 * slowest pursuer still in it, so it neither gains nor loses by coming late. Returns a new state; a racer already
 * in the chase, or a chase that has ended, is left as it is.
 */
export function joinChase(st, racer) {
  if ( !st || st.status !== "running" || !racer?.id || st.quarry?.id === racer.id || st.pursuers.some(p => p.id === racer.id) ) return st;
  const inIt = live(st);
  const total = inIt.length ? Math.min(...inIt.map(p => p.total)) : 0;
  return {...st, pursuers: [...st.pursuers, {...racer, way: WAYS[racer.way] ? racer.way : "foot", flatOut: false, total, out: null}]};
}

/** The quarry's lead over one pursuer, in successes (negative: caught up). */
export const leadOver = (st, p) => st.quarry.total - p.total;
/** The difficulty of a pursuer's Perception roll to keep sight, from the lead as the turn starts: 6, +1 for each success
 *  the quarry leads by (V20 core printed p. 262), +1 more where there is cover about (house rule, B914); 10 at most. */
export const sightDiff = (st, p) => Math.min(10, 6 + Math.max(0, leadOver(st, p)) + (GROUNDS[groundKind(st.ground)].cover ? 1 : 0));
const live = st => st.pursuers.filter(p => !p.out);

/**
 * One turn. rolls: {[racerId]: {successes, botch}} for the quarry and every pursuer still in it. When the Storyteller
 * calls for sight (st.sight), rolls[pursuerId].sight: {successes, botch} is each pursuer's Perception roll at
 * sightDiff, rolled after the chase roll; no success, and that pursuer has lost the quarry.
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
    ev.push(botchEvent(q, qSpeed, year, true));
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
      // A pursuer's botch loses the quarry at once (V20 core printed p. 262); on a mount or in a vehicle, a fall or a crash
      const b = botchEvent(p, pSpeed, year);
      ev.push(b.kind === "botch" ? {...b, kind: "lost", text: `${p.name} stumbles and loses ${q.name}.`} : b);
      p.out = b.kind === "botch" ? "lost" : "botch";
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
  // Keeping sight: the Storyteller called a Perception roll this turn; a pursuer who scores nothing has lost the quarry
  if ( st.sight && chasers.length ) {
    for ( const p of chasers ) {
      const r = rolls[p.id]?.sight ?? {successes: 0, botch: false};
      if ( r.botch || !(Number(r.successes) > 0) ) { p.out = "lost"; ev.push({kind: "lost", who: p.id, text: `${p.name} loses sight of ${q.name}.`}); }
    }
    if ( !live(st).length ) ev.push({kind: "hidden", who: q.id, text: `${q.name} slips out of sight.`});
  }
  st.sight = false;
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

/** A botch: on foot a stumble or a dead end; thrown from a mount or a bicycle; a crash in a vehicle. */
function botchEvent(r, yards, year, quarry = false) {
  const W = WAYS[r.way] ?? WAYS.foot, d = crashDice(yards), type = crashType(yards);
  const dice = `${d} ${d === 1 ? "die" : "dice"} of ${type} damage, rolled as a fall`;
  if ( W.motor && !W.thrown ) return {kind: "crash", who: r.id, dice: d, type, text: `${r.name} crashes ${W.label.toLowerCase()}: ${dice}, and the chase ends for them.`};
  if ( W.thrown || W.hooves ) return {kind: "thrown", who: r.id, dice: d, type, text: `${r.name} is thrown: ${dice}, and the chase ends for them.`};
  if ( r.way !== "foot" ) return {kind: "botch", who: r.id, text: `${r.name} loses control ${W.label.toLowerCase()} and comes to a stop.`};
  return {kind: "botch", who: r.id, text: quarry ? `${r.name} stumbles, or runs into a dead end.` : `${r.name} stumbles and falls.`};
}
/** A crash or a fall from the saddle, as falling (V20 core printed p. 296): a die of bashing for each 10 mph, one to ten;
 *  ten dice are lethal, as a fall of 100 feet. House reading of the book (B913). */
export const crashDice = yards => Math.max(1, Math.min(10, Math.floor((Number(yards) || 0) / YD_PER_MPH / 10)));
export const crashType = yards => (crashDice(yards) >= 10 ? "lethal" : "bashing");

/** A rider who catches someone at speed: +1 damage die for each turn spent building speed, five at most (V20 Dark Ages
 *  printed p. 398). For the first blow of the fight. */
export const chargeDice = (st, p) => (WAYS[p?.way]?.hooves ? Math.min(5, Math.max(0, Number(st?.turn) || 0)) : 0);

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
