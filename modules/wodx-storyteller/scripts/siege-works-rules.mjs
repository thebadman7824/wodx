/**
 * WoDX Storyteller 0.50.0: the campaign around a siege, the pure part. No Foundry calls here (B2450-B2457).
 *
 * Battles and sieges (battle-rules.mjs) fights a siege week by week: the besiegers' works fill a breach clock, the
 * garrison eats its stores, disease wears both camps. This file adds what Spoils of War pp. 40-42 (printed; pdf =
 * printed + 1) sets out for a campaign, and the siege tables of pp. 33-34 (printed; pdf = printed + 1), read on the
 * PC on 12 November 2026 (/mnt/project-files/battle-book-check.md and book-checks-2026-11-12b.md):
 *
 * - Foraging (p. 40): each foraging team's leader rolls Perception + Survival twice a day at 4 (rich farmland at
 *   harvest) to 9 (stripped desert), 6 in summer country; successes times foragers are man-days of food.
 * - Keeping order (p. 40): once a week the commander rolls Charisma + Leadership, or Manipulation + Intimidation, at
 *   6. It needs 1 success if the army is well paid and supplied, 2 if normal, 4 if poorly; each success short adds
 *   1 to the difficulty of every army action for the next week.
 * - Sapping (pp. 41-42): plan with Intelligence + Leadership at 6 (7 or 8 for bad ground), at least 1 success; dig
 *   with Strength + Crafts each week, extended, 50 yards a success in packed earth, 25 in fair ground, 10 in rock; a
 *   botch brings part of the tunnel down. Fired under the walls it rolls Intelligence + Leadership plus a die for
 *   each planning success, and each success is 3 health levels of damage to the walls that cannot be soaked.
 * - Countermining (p. 42): the garrison rolls Perception + Alertness each day at 2 for every 10 yards the mine is
 *   from the wall (30 yards is 6, 50 is 10), and digs as for sapping, twice as fast without shoring, when any failure
 *   collapses it.
 * - Siege engines (p. 41): materials are found with Perception + Crafts at 7 each day until the successes match the
 *   engine's damage, then it is put together with Intelligence + Crafts at 7 each week until they match again; a
 *   botch wrecks the engine and its progress. An engine shoots with Intelligence + Leadership in place of Dexterity
 *   + Archery, at the engine's difficulty step (p. 33).
 * - Walls (p. 34): each structure has a soak and health levels; each soak success counts as 2 against a siege engine.
 *
 * WoDX's own readings (house rules, B2450-B2457): a week's foraging is 14 rolls (twice a day for seven days) by one
 * leader for all the foragers; an engine makes one telling attack a day; the mine's dig roll is at 6 (the book
 * gives no difficulty); a botch in the tunnel loses a quarter of it; a mine fires by itself when it reaches the
 * walls; the walls' damage fills the breach clock in proportion to their health levels; a ditch or moat takes the
 * first 4 successes of the works before the breach moves; supply lines carry part of an army's food by the year;
 * powder and then high explosive add dice to a mine; and the guns, rams and works of the ages after the book's
 * engines (from the bombard to guided missiles and the Future Darkness branch's railguns) and the forts after its
 * walls (the bastion trace, earth ramparts, concrete) are WoDX figures.
 *
 * Stored on the battle as `campaign` (normCampaign); battle-rules.mjs keeps it through normBattle, applyStep and Undo.
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const int = (v, lo, hi, d) => clamp(Math.round(v === undefined || v === null || v === "" ? d : n(v)), lo, hi);
const str = (v, max = 80) => String(v ?? "").trim().slice(0, max);

/** Count a roll's faces at a difficulty: successes less ones, a botch on no success and a one. */
export function count(faces, diff) {
  let raw = 0, ones = 0;
  for ( const f of faces ) { if ( f === 1 ) ones++; if ( f >= diff ) raw++; }
  return {successes: Math.max(0, raw - ones), botch: raw === 0 && ones > 0};
}

/* ---- Tables ---- */

/**
 * Siege engines and guns. `damage` is lethal dice (A for aggravated), `diff` the step added to 6 (Spoils of War
 * p. 33), `contact` engines that must reach the wall (stopped by a ditch until it is filled), `from`/`to` the years
 * an army can field them. The book's engines are Dark Ages figures; everything marked `house` is WoDX's.
 */
export const ENGINES = {
  ram: {label: "Battering ram", damage: 10, diff: 0, contact: true, from: 1197, to: 1650},
  mouse: {label: "Mouse (a small ram)", damage: 7, diff: 0, contact: true, from: 1197, to: 1650},
  crow: {label: "Crow (a hooked beam)", damage: 8, diff: 0, contact: true, from: 1197, to: 1500},
  mangonel: {label: "Mangonel", damage: 14, diff: 2, from: 1197, to: 1500},
  ballista: {label: "Ballista", damage: 12, diff: 2, from: 1197, to: 1450},
  espringal: {label: "Espringal", damage: 10, diff: 1, from: 1197, to: 1450},
  trebuchet: {label: "Counterweight trebuchet", damage: 15, diff: 1, from: 1197, to: 1500},
  pulled: {label: "Pulled trebuchet", damage: 13, diff: 3, from: 1197, to: 1450},
  perrier: {label: "Perrier", damage: 8, diff: 1, from: 1197, to: 1450},
  potdefer: {label: "Pot-de-fer", damage: 10, diff: 2, from: 1320, to: 1450},
  qawa: {label: "Qawa al-ziyar", damage: 12, diff: 1, from: 1197, to: 1450},
  greekfire: {label: "Greek fire spigot", damage: 10, diff: 2, aggravated: true, from: 1197, to: 1453},
  bombard: {label: "Bombard", damage: 18, diff: 3, from: 1380, to: 1550, house: true},
  cannon: {label: "Siege cannon", damage: 16, diff: 1, from: 1500, to: 1860, house: true},
  mortar: {label: "Siege mortar", damage: 15, diff: 2, from: 1550, to: 1913, house: true},
  rifled: {label: "Rifled siege gun", damage: 18, diff: 1, from: 1860, to: 1945, house: true},
  howitzer: {label: "Heavy howitzer", damage: 22, diff: 1, from: 1914, to: 9999, house: true},
  bomber: {label: "Bombers", damage: 24, diff: 2, from: 1936, to: 9999, house: true},
  missile: {label: "Guided missiles", damage: 24, diff: 0, from: 1990, to: 9999, house: true},
  railgun: {label: "Railgun battery", damage: 28, diff: 0, from: 2030, to: 9999, branch: "future", house: true}
};

/** The engines an army of a year can build (and the branch for the Future Darkness ones). */
export function enginesFor(year, branch = "classic") {
  const y = n(year) || 1197;
  return Object.entries(ENGINES).filter(([, e]) => y >= e.from && y <= e.to && (!e.branch || e.branch === branch)).map(([id, e]) => ({id, ...e}));
}

/**
 * Walls and works (Spoils of War p. 34): soak, health levels, `cover` if foot soldiers on it add its soak against
 * missiles, `wood` if it burns (half soak against fire). The forts after the book are WoDX's.
 */
export const WALLS = {
  palisade: {label: "Wooden palisade, 50 ft", soak: 5, health: 9, cover: true, wood: true},
  lightWall: {label: "Light wall, 50 ft", soak: 7, health: 14, cover: true},
  mediumWall: {label: "Medium wall, 50 ft", soak: 10, health: 20, cover: true},
  heavyWall: {label: "Heavy wall, 50 ft", soak: 12, health: 30, cover: true},
  smallTower: {label: "Small tower", soak: 8, health: 12, cover: true},
  mediumTower: {label: "Medium tower", soak: 10, health: 24, cover: true},
  largeTower: {label: "Large tower", soak: 12, health: 36, cover: true},
  woodTower: {label: "Large wooden tower", soak: 9, health: 20, cover: true, wood: true},
  smallKeep: {label: "Small keep", soak: 10, health: 30, cover: true},
  largeKeep: {label: "Large keep", soak: 15, health: 50, cover: true},
  smallGatehouse: {label: "Small gatehouse", soak: 8, health: 15, cover: true},
  largeGatehouse: {label: "Large gatehouse", soak: 12, health: 35, cover: true},
  largeGate: {label: "Large gate", soak: 7, health: 10},
  smallChurch: {label: "Small church", soak: 8, health: 15},
  largeChurch: {label: "Large church", soak: 12, health: 30},
  bastion: {label: "Bastion and curtain of a star fort", soak: 13, health: 45, cover: true, from: 1530, house: true},
  rampart: {label: "Earth rampart and ditch", soak: 11, health: 50, cover: true, from: 1600, house: true},
  bunker: {label: "Concrete bunker line", soak: 15, health: 45, cover: true, from: 1914, house: true},
  ferro: {label: "Reinforced concrete and steel", soak: 18, health: 60, cover: true, from: 1940, house: true}
};
export const wallsFor = year => Object.entries(WALLS).filter(([, w]) => !w.from || (n(year) || 1197) >= w.from).map(([id, w]) => ({id, ...w}));
/** The walls a siege starts with by where the garrison stands (battle-rules.mjs POSITIONS). */
export const WALL_OF_POSITION = {works: "palisade", town: "mediumWall", castle: "heavyWall", starfort: "bastion", bunker: "bunker"};

/** Yards a success (Spoils of War p. 41). */
export const GROUND = {packed: {label: "Packed earth", yards: 50}, fair: {label: "Fair ground", yards: 25}, rock: {label: "Rock", yards: 10}};

/** How an army is fed besides foraging, as a share of a week's need, by year (house rules). */
export const SUPPLY_LINES = {
  none: {label: "Nothing: they live off the land", share: 0},
  wagons: {label: "Wagon trains", share: 0.5},
  boats: {label: "Boats on a river or the sea", share: 0.75},
  rail: {label: "The railway", share: 1, from: 1840},
  lorries: {label: "Lorries", share: 1, from: 1915},
  air: {label: "Airlift", share: 1, from: 1940},
  drones: {label: "Drone convoys", share: 1, from: 2030, branch: "future"}
};
export const supplyLinesFor = (year, branch = "classic") => Object.entries(SUPPLY_LINES)
  .filter(([, s]) => (!s.from || (n(year) || 1197) >= s.from) && (!s.branch || s.branch === branch)).map(([id, s]) => ({id, ...s}));

/** Foraging difficulty (Spoils of War p. 40). */
export const FORAGE_LAND = {4: "Rich farmland at harvest", 5: "Good farmland", 6: "Summer country", 7: "Poor or winter country", 8: "Land already stripped", 9: "A stripped desert"};
/** Successes needed to keep order (p. 40). */
export const ORDER_NEED = {well: 1, normal: 2, poor: 4};
export const SUPPLY_WORDS = {auto: "By how they are fed", well: "Well paid and supplied", normal: "Normal", poor: "Poorly paid or supplied"};
/** A ditch or moat takes this many successes of the works before the breach moves (house rule). */
export const MOAT_FILL = 4;

/** Extra dice for a mine's charge by the age of war (house rule): powder from the first guns, high explosive later. */
export function chargeDice(ageId) {
  if ( ["feudal", "umbra", "underworld"].includes(ageId) ) return 0;
  if ( ["hussite", "pike", "musket", "columns"].includes(ageId) ) return 2;
  return 4;
}

/* ---- The stored campaign ---- */

function normMine(m) {
  if ( !m || typeof m !== "object" ) return null;
  const state = ["planning", "digging", "fired", "broken"].includes(m.state) ? m.state : "planning";
  return {distance: int(m.distance, 10, 2000, 100), ground: GROUND[m.ground] ? m.ground : "fair", badGround: int(m.badGround, 0, 2, 0),
    pool: int(m.pool, 1, 15, 5), state, plan: m.plan === null || m.plan === undefined ? null : int(m.plan, 0, 20, 0),
    dug: int(m.dug, 0, 2000, 0), detected: !!m.detected, damage: int(m.damage, 0, 200, 0)};
}
function normCounter(c) {
  if ( !c || typeof c !== "object" ) return null;
  return {watch: c.watch !== false, watchPool: int(c.watchPool, 1, 15, 5), pool: int(c.pool, 1, 15, 5), fast: !!c.fast, dug: int(c.dug, 0, 2000, 0)};
}
function normEngine(e) {
  if ( !e || !ENGINES[e.type] ) return null;
  const stage = ["materials", "assemble", "ready"].includes(e.stage) ? e.stage : "materials";
  return {id: str(e.id, 20) || Math.random().toString(36).slice(2, 10), type: e.type, stage, got: int(e.got, 0, 60, 0)};
}

/** A clean campaign, or null when the siege has none of it set up. */
export function normCampaign(c) {
  if ( !c || typeof c !== "object" ) return null;
  const sup = v => (SUPPLY_WORDS[v] ? v : "auto");
  return {
    order: {on: !!c.order?.on, supply: [sup(c.order?.supply?.[0]), sup(c.order?.supply?.[1])],
      pools: [0, 1].map(i => (c.order?.pools?.[i] ? int(c.order.pools[i], 1, 15, 4) : 0)), paid: [!!c.order?.paid?.[0], !!c.order?.paid?.[1]]},
    forage: {on: !!c.forage?.on, foragers: int(c.forage?.foragers, 0, 100000, 100), pool: int(c.forage?.pool, 1, 15, 5), difficulty: int(c.forage?.difficulty, 4, 9, 6)},
    supplyLine: SUPPLY_LINES[c.supplyLine] ? c.supplyLine : "none",
    stores0: int(c.stores0, 0, 365, 14),
    wall: {type: WALLS[c.wall?.type] ? c.wall.type : "", damage: int(c.wall?.damage, 0, 500, 0), moat: !!c.wall?.moat, moatFill: int(c.wall?.moatFill, 0, MOAT_FILL, 0)},
    mine: normMine(c.mine),
    counter: normCounter(c.counter),
    craftPool: int(c.craftPool, 1, 15, 5),
    engines: (Array.isArray(c.engines) ? c.engines : []).map(normEngine).filter(Boolean).slice(0, 20),
    gunnerPool: c.gunnerPool ? int(c.gunnerPool, 1, 15, 4) : 0
  };
}
/** A fresh campaign for a siege, its walls from where the garrison stands. */
export function blankCampaign(battle) {
  return normCampaign({wall: {type: WALL_OF_POSITION[battle?.sides?.[1]?.position] ?? ""}, stores0: 14});
}

/** The walls under siege: their table row, damage and how much of the breach clock that damage fills. */
export function wallsOf(c) {
  const w = WALLS[c?.wall?.type];
  if ( !w ) return null;
  return {...w, id: c.wall.type, damage: c.wall.damage, left: Math.max(0, w.health - c.wall.damage)};
}
export const segmentsFor = (damage, health, segments = 8) => (health > 0 ? Math.min(segments, Math.floor(segments * Math.max(0, damage) / health)) : 0);

/* ---- One week ---- */

/** The supply a side keeps order with: set by hand, or from how it was fed this week. */
function supplyOf(c, i, fed) {
  const set = c.order.supply[i];
  if ( set !== "auto" ) return set;
  if ( !fed ) return "poor";
  return c.order.paid[i] ? "well" : "normal";
}

/**
 * One week of the campaign around a siege. `draw(k)` gives k ten-sided faces (the Foundry side uses the world's
 * dice; the tests a seeded one). `ctx` = {ageId, men: [n, n], works: [n, n], morale: [n, n], storesLeft (the
 * garrison's days after this week), worksSuccesses (the week's works roll)}. Returns the new campaign and what it
 * does to the siege: {campaign, unrest, resolveLost, stores0, breachAdd, worksToMoat, report: [{who, text, dice}]}.
 */
export function campaignWeek(campaign, ctx, draw) {
  const c = normCampaign(campaign);
  if ( !c ) return null;
  const report = [];
  const resolveLost = [0, 0];
  const say = (who, text, dice = "") => report.push({who, text, dice});
  const faces = k => draw(Math.max(1, Math.round(k)));
  const men0 = Math.max(1, n(ctx?.men?.[0]));

  // 1. The ditch takes the first successes of the works.
  let worksToMoat = 0;
  if ( c.wall.moat && c.wall.moatFill < MOAT_FILL && n(ctx?.worksSuccesses) > 0 ) {
    worksToMoat = Math.min(n(ctx.worksSuccesses), MOAT_FILL - c.wall.moatFill);
    c.wall.moatFill += worksToMoat;
    say(0, c.wall.moatFill >= MOAT_FILL ? "The ditch before the walls is filled." : "They fill the ditch before the walls.", `${worksToMoat} of the works' successes to the ditch (${c.wall.moatFill} of ${MOAT_FILL})`);
  }

  // 2. Feeding the besiegers: what the supply line carries, foraging, their own stores.
  const need = men0 * 7, line = SUPPLY_LINES[c.supplyLine]?.share ?? 0;
  let food = Math.round(need * line), forageDice = "";
  if ( c.forage.on && c.forage.foragers > 0 ) {
    let got = 0, botches = 0;
    for ( let k = 0; k < 14; k++ ) { const r = count(faces(c.forage.pool), c.forage.difficulty); got += r.successes; if ( r.botch ) botches++; }
    food += got * c.forage.foragers;
    forageDice = `foraging: 14 rolls of ${c.forage.pool} dice at ${c.forage.difficulty}, ${got} successes${botches ? `, ${botches} botched` : ""}, ${(got * c.forage.foragers).toLocaleString("en")} man-days`;
  }
  let fed0 = true;
  if ( line > 0 || c.forage.on ) {
    if ( food >= need ) c.stores0 = Math.min(365, c.stores0 + Math.floor((food - need) / men0));
    else {
      const short = Math.ceil((need - food) / men0);
      if ( c.stores0 >= short ) c.stores0 -= short;
      else { c.stores0 = 0; fed0 = false; resolveLost[0] += 1; }
    }
    say(0, fed0 ? (food >= need ? "The camp is fed." : "The camp eats into its stores.") : "Hunger in the camp.",
      `need ${need.toLocaleString("en")} man-days, got ${food.toLocaleString("en")}${forageDice ? ` (${forageDice})` : ""}; camp stores ${c.stores0} days`);
  } else {
    // no supply set up: the camp eats its stores, a week at a time
    if ( c.stores0 >= 7 ) c.stores0 -= 7; else { c.stores0 = 0; fed0 = false; resolveLost[0] += 1; }
    say(0, fed0 ? "The camp eats from its stores." : "Hunger in the camp.", `camp stores ${c.stores0} days`);
  }
  const fed1 = n(ctx?.storesLeft) > 0;

  // 3. Mines and countermines.
  const m = c.mine;
  if ( m && m.state === "planning" ) {
    const diff = 6 + m.badGround, r = count(faces(n(ctx?.works?.[0]) || 4), diff);
    if ( r.successes > 0 ) { m.plan = r.successes; m.state = "digging"; say(0, "Engineers mark out a mine toward the walls.", `planning: ${r.successes} successes at ${diff}`); }
    else say(0, "The engineers cannot settle where to dig.", `planning: no success at ${diff}${r.botch ? " (a botch)" : ""}`);
  } else if ( m && m.state === "digging" ) {
    const rate = GROUND[m.ground].yards, before = m.dug, r = count(faces(m.pool), 6);
    if ( r.botch ) { m.dug = Math.max(0, m.dug - Math.max(rate, Math.round(m.dug / 4))); say(0, "Part of the mine falls in.", `digging: a botch, ${before - m.dug} yards lost`); }
    else { m.dug = Math.min(m.distance, m.dug + r.successes * rate); say(0, r.successes ? "The mine creeps toward the walls." : "No yard gained in the mine this week.", `digging: ${r.successes} successes, ${m.dug} of ${m.distance} yards`); }
    // the garrison listens each day; the head of the mine draws nearer through the week
    const ctr = c.counter;
    if ( ctr?.watch && !m.detected ) {
      for ( let d = 1; d <= 7 && !m.detected; d++ ) {
        const head = m.distance - (before + (m.dug - before) * d / 7);
        const diff = Math.max(2, Math.ceil(head / 5));
        if ( diff > 10 ) continue;
        const rr = count(faces(ctr.watchPool), diff);
        if ( rr.successes > 0 ) { m.detected = true; say(1, "The garrison hears digging under the walls.", `listening: day ${d}, ${Math.round(head)} yards out, difficulty ${diff}, ${rr.successes} successes`); }
      }
    } else if ( ctr && m.detected ) {
      const rate = GROUND[m.ground].yards * (ctr.fast ? 2 : 1), r = count(faces(ctr.pool), 6);
      if ( r.botch || (ctr.fast && r.successes === 0) ) { ctr.dug = 0; say(1, "The countermine falls in.", `countermining: ${r.botch ? "a botch" : "a failure without shoring"}`); }
      else {
        ctr.dug += r.successes * rate;
        const gap = m.distance - m.dug;
        if ( ctr.dug >= gap ) { m.state = "broken"; say(1, "The defenders break into the mine and bring it down.", `countermining: ${ctr.dug} yards met the mine ${gap} yards out`); }
        else say(1, "The defenders dig to meet the mine.", `countermining: ${r.successes} successes, ${ctr.dug} of ${gap} yards`);
      }
    }
    if ( m.state === "digging" && m.dug >= m.distance ) {
      const dice = Math.max(1, n(ctx?.works?.[0]) + n(m.plan) + chargeDice(ctx?.ageId)), r = count(faces(dice), 6);
      m.damage = r.successes * 3; m.state = "fired";
      c.wall.damage += m.damage;
      say(0, m.damage ? "The mine is fired under the walls." : "The mine is fired, and the walls stand.", `the mine: ${dice} dice at 6, ${r.successes} successes, ${m.damage} health levels to the walls, not soaked`);
    }
  }

  // 4. Building engines.
  const craft = c.craftPool;
  c.engines = c.engines.flatMap(e => {
    if ( e.stage === "ready" ) return [e];
    const need = ENGINES[e.type].damage, label = ENGINES[e.type].label;
    if ( e.stage === "materials" ) {
      for ( let d = 0; d < 7; d++ ) {
        const r = count(faces(craft), 7);
        if ( r.botch ) { say(0, `The ${label.toLowerCase()} is wrecked.`, `materials: a botch on day ${d + 1}`); return []; }
        e.got += r.successes;
        if ( e.got >= need ) { e.stage = "assemble"; e.got = 0; break; }
      }
      say(0, e.stage === "assemble" ? `Timber and iron for a ${label.toLowerCase()} are gathered.` : `They gather timber and iron for a ${label.toLowerCase()}.`, e.stage === "assemble" ? `materials: ${need} successes found` : `materials: ${e.got} of ${need}`);
      return [e];
    }
    const r = count(faces(n(ctx?.works?.[0]) || craft), 7);
    if ( r.botch ) { say(0, `The ${label.toLowerCase()} is wrecked.`, "assembly: a botch"); return []; }
    e.got += r.successes;
    if ( e.got >= need ) { e.stage = "ready"; e.got = 0; }
    say(0, e.stage === "ready" ? `A ${label.toLowerCase()} stands ready.` : `They put a ${label.toLowerCase()} together.`, e.stage === "ready" ? "assembly done" : `assembly: ${e.got} of ${need}`);
    return [e];
  });

  // 5. The engines shoot, once a day each; the walls soak, 2 for each soak success.
  const w = wallsOf(c);
  const ready = c.engines.filter(e => e.stage === "ready");
  if ( w && ready.length ) {
    let total = 0;
    const lines = [];
    for ( const e of ready ) {
      const E = ENGINES[e.type];
      if ( E.contact && c.wall.moat && c.wall.moatFill < MOAT_FILL ) { lines.push(`${E.label}: the ditch keeps it from the walls`); continue; }
      let hits = 0;
      for ( let d = 0; d < 7; d++ ) {
        const a = count(faces(c.gunnerPool || n(ctx?.works?.[0]) || 4), 6 + E.diff);
        if ( !a.successes ) continue;
        const dmg = count(faces(E.damage + a.successes - 1), 6).successes;
        const soakDice = E.aggravated && w.wood ? Math.floor(w.soak / 2) : w.soak;
        const soak = count(faces(soakDice), 6).successes * 2;
        hits += Math.max(0, dmg - soak);
      }
      total += hits;
      lines.push(`${E.label}: ${hits} health level${hits === 1 ? "" : "s"}`);
    }
    c.wall.damage += total;
    say(0, total ? "Stones and shot strike the walls." : "The walls shrug off the bombardment.", `${lines.join("; ")}; the walls have taken ${c.wall.damage} of ${w.health}`);
  }

  // 6. Keeping order, rolled at the week's end for the week to come.
  const unrest = [0, 0];
  if ( c.order.on ) {
    for ( const i of [0, 1] ) {
      const supply = supplyOf(c, i, i === 0 ? fed0 : fed1), needed = ORDER_NEED[supply];
      const dice = c.order.pools[i] || n(ctx?.morale?.[i]) || 3, r = count(faces(dice), 6);
      unrest[i] = r.botch ? needed : Math.max(0, needed - r.successes);
      say(i, unrest[i] ? (unrest[i] >= 3 ? "The ranks are close to mutiny." : "Grumbling in the ranks.") : "The ranks hold together.",
        `order (${SUPPLY_WORDS[supply].toLowerCase()}, ${needed} needed): ${dice} dice at 6, ${r.successes} successes${r.botch ? " (a botch)" : ""}${unrest[i] ? `; +${unrest[i]} to every army roll next week` : ""}`);
    }
  }

  // The breach the walls' damage opens, against what it was before this week.
  const before = wallsOf(normCampaign(campaign));
  const breachAdd = w ? segmentsFor(c.wall.damage, w.health) - segmentsFor(before?.damage ?? 0, w.health) : 0;
  return {campaign: c, unrest, resolveLost, stores0: c.stores0, breachAdd, worksToMoat, fed: [fed0, fed1], report};
}

/**
 * Fold a week of the campaign into a settled siege week (battle-rules.mjs settleWeek): the works that went to the
 * ditch come off the breach, the walls' damage adds to it, unrest and hunger change the sides, and the phase keeps
 * what Undo needs (campBefore, and each side's unrest before).
 */
export function mergeWeek(battle, step, camp, segments = 8) {
  if ( !camp ) return step;
  const breachBefore = n(battle.breach);
  // the works' successes that went into the ditch fill no breach (guns count each success twice, as in settleWeek)
  const succ = n(step.phase?.rolls?.[0]?.successes), moatShare = succ ? Math.round(n(step.phase.work) * camp.worksToMoat / succ) : 0;
  const fromWorks = Math.max(Math.min(n(step.breach), breachBefore), n(step.breach) - moatShare);
  const breach = clamp(fromWorks + camp.breachAdd, 0, segments);
  const sides = step.sides.map((s, i) => ({...s, unrest: camp.unrest[i], resolve: Math.max(0, n(s.resolve) - camp.resolveLost[i])}));
  const phase = {...step.phase, breach, camp: camp.report, campBefore: battle.campaign ?? null,
    before: step.phase.before.map((b, i) => ({...b, unrest: n(battle.sides[i]?.unrest)})),
    resolveLost: step.phase.resolveLost.map((v, i) => v + camp.resolveLost[i])};
  let over = step.over;
  if ( !over && sides[1].resolve <= 0 ) over = {winner: 0, how: "surrender"};
  else if ( !over && sides[0].resolve <= 0 ) over = {winner: 1, how: "lifted"};
  return {...step, sides, breach, breached: !!battle.breached || breach >= segments, phase, campaign: camp.campaign, over};
}
