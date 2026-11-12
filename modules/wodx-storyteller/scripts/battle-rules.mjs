/**
 * WoDX Storyteller 0.44.0: battles and sieges, the pure part. No Foundry calls here (B2200-B2210).
 *
 * A battle is fought between two abstract forces, not token by token. Each force has a size, a quality, the
 * supernatural help in its ranks, a position and a commander. Each phase of the battle both commanders roll; the
 * side with more successes takes the difference from the other side's resolve, and men fall in proportion. The
 * characters' deeds (any roll the Storyteller asks for: cutting down a standard bearer, a Discipline on the
 * enemy captain, a Gift on the cannon) add their successes to their side for that phase. A side whose resolve
 * reaches 0 breaks. A siege runs by the week: the besiegers work at the walls (a progress clock), the defenders eat
 * their stores, and hunger wears the garrison's resolve once the stores are gone. When the walls give way, the
 * assault is fought as a battle with the walls counting for less.
 *
 * The way war is fought changes with the year (AGES): from knights and levies in 1197 through the Hussite wagon
 * forts, pike and shot, the musket line, Napoleon's columns, rifles and rail, the trenches, tanks and aircraft and
 * the Cold War, to drones and the network, and on the Future Darkness branch powered armour and orbital eyes. Wars
 * in the Umbra and the Underworld have ages of their own.
 *
 * Book basis (the book search of 12 November 2026, /mnt/project-files/battle-book-check.md): the only war rules in
 * the oWoD books are two Dark Ages: Vampire books. From Spoils of War pp. 40-45 (printed; pdf = printed + 1): the
 * commanders' opposed Perception + Leadership at difficulty 6 each hour-long turn, a botch giving the other side 2
 * net successes, wavering (a side that loses 3 or more in a turn rolls Charisma + Leadership at that difficulty;
 * a failure costs 2 dice next turn, a botch breaks it), being demoralised (losses past the commander's Charisma +
 * Leadership cost a die each), siege works on Intelligence + Leadership, and disease in camp (Wits + Medicine each
 * week at troops / 1,000, 4 to 10; each failure adds 1 to the difficulty of every army roll, and a success as big
 * as the penalty takes one off). From the Dark Ages Companion pp. 42-48 (printed; pdf = printed - 25): each success
 * of a character's attack takes one foe out of the fight, killing more than 10 in a turn shakes the enemy (Spoils
 * p. 44), and the battle's counterattack on a character is 5 dice at 6, double the successes as damage, not
 * dodged, aggravated every third turn, five successes a stake through a Cainite's heart. WoDX's own readings (house
 * rules): resolve as the point a side breaks, the breach clock, the ages after 1500 and the Umbra and Underworld.
 * When both sides list the book's units (Right of Command, Spoils of War p. 44, read from the page images), the
 * battle is fought with the book's army pools and actions (B2210); otherwise each force is a size step, quality and
 * supernatural weight (B2200), which is also how the ages after the book's troop types are fought.
 *
 * Stored in the world setting wodx-storyteller.battles: {v, list: [battle]}.
 */

import {normOffers, POSTS as DEED_POSTS} from "./battle-deeds.mjs";
import {normAftermath} from "./battle-aftermath.mjs";

export const BATTLES_VERSION = 1;
export const BATTLES_CAP = 200;

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v, max = 120) => String(v ?? "").trim().slice(0, max);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const HOUR = 3600, DAY = 86400;

/**
 * How war is fought in each age. `phase` is the game time one phase of a battle takes; `kill` the share of the
 * losing side's men who fall for each net success; `guns` whether cannon or bombs can bring walls down; `hazard`
 * the dice of the battle's counterattack on a character in the thick of it (5 in the Dark Ages Companion; more as
 * weapons grow deadlier, a house rule).
 */
export const AGES = [
  {id: "feudal", from: 1197, to: 1418, label: "Knights, levies and crossbows", phase: HOUR, kill: 0.03, guns: false, hazard: 5,
    note: "Battles are short and bloody at the moment one side breaks; most of the dying comes in the rout. Castles fall to hunger, mines and treachery more than to stones."},
  {id: "hussite", from: 1419, to: 1499, label: "Wagon forts, handguns and the first cannon", phase: HOUR, kill: 0.035, guns: true, hazard: 5,
    note: "Peasant armies behind chained wagons beat knights in the open. Bombards can now break old walls, slowly."},
  {id: "pike", from: 1500, to: 1649, label: "Pike and shot", phase: 2 * HOUR, kill: 0.03, guns: true, hazard: 6,
    note: "Squares of pikes and musketeers, hired regiments that plunder the land they cross. Angled bastion walls answer the cannon."},
  {id: "musket", from: 1650, to: 1789, label: "The musket line and the star fort", phase: 2 * HOUR, kill: 0.025, guns: true, hazard: 6,
    note: "Drilled lines trade volleys; sieges follow the engineers' book, trench by trench toward the bastions."},
  {id: "columns", from: 1790, to: 1859, label: "Columns, cannon and cavalry", phase: 3 * HOUR, kill: 0.03, guns: true, hazard: 6,
    note: "Mass armies of conscripts, massed batteries, a day decides a campaign."},
  {id: "rifle", from: 1860, to: 1913, label: "Rifles, rail and the telegraph", phase: 4 * HOUR, kill: 0.035, guns: true, hazard: 7,
    note: "Breech-loaders and railways; armies dig in wherever they stop."},
  {id: "trench", from: 1914, to: 1918, label: "Trenches, machine guns and gas", phase: DAY, kill: 0.02, guns: true, hazard: 8,
    note: "A battle lasts weeks and moves a few hundred yards. Shelling, gas and the wire do most of the killing."},
  {id: "armour", from: 1919, to: 1945, label: "Tanks, aircraft and radio", phase: 6 * HOUR, kill: 0.03, guns: true, hazard: 8,
    note: "Armour and aircraft break fronts; cities are bombed from the air."},
  {id: "cold", from: 1946, to: 1999, label: "Helicopters, rockets and the bomb", phase: 6 * HOUR, kill: 0.025, guns: true, hazard: 8,
    note: "Small wars fought by proxies and special forces under the shadow of the bomb."},
  {id: "network", from: 2000, to: 9999, label: "Drones, satellites and the network", phase: 6 * HOUR, kill: 0.02, guns: true, hazard: 9,
    note: "Precision strikes, drones overhead, every move filmed. Hard to fight unseen."},
  {id: "future", from: 2026, to: 9999, branch: "future", label: "Powered armour, swarms and orbital eyes", phase: 4 * HOUR, kill: 0.025, guns: true, hazard: 9,
    note: "Future Darkness: corporate and state forces with drone swarms and armoured troopers; nothing on the ground goes unseen from orbit."}
];

/** Wars outside the living world keep their own ways. */
export const REALM_AGES = {
  umbra: {id: "umbra", label: "A war in the Umbra", phase: HOUR, kill: 0.04, guns: false, hazard: 5,
    note: "Garou, Fera and spirits against the Wyrm's hosts. Spirits that lose discorporate rather than die; the land itself takes sides."},
  underworld: {id: "underworld", label: "Legions of the dead", phase: HOUR, kill: 0.04, guns: false, hazard: 5,
    note: "Legionnaires against Spectres or Renegades. Wraiths that fall are dragged into the Tempest or forged into soulsteel."}
};
export const REALMS = {world: "The living world", umbra: "The Umbra", underworld: "The Underworld"};

/** The age of war for a year, a branch ("classic" or "future") and a realm. */
export function ageFor(year, {branch = "classic", realm = "world"} = {}) {
  if ( REALM_AGES[realm] ) return REALM_AGES[realm];
  const y = n(year) || 1197;
  const fits = AGES.filter(a => y >= a.from && y <= a.to && (!a.branch || a.branch === branch));
  if ( !fits.length ) return y < AGES[0].from ? AGES[0] : AGES.find(a => a.id === "network");
  return fits.find(a => a.branch) ?? fits[0];
}

/** How many fight: a step for each tenfold. */
export const SIZES = [
  {step: 1, label: "A handful (up to 10)", max: 10},
  {step: 2, label: "A band (up to 100)", max: 100},
  {step: 3, label: "A company (up to 1,000)", max: 1000},
  {step: 4, label: "An army (up to 10,000)", max: 10000},
  {step: 5, label: "A great host (up to 100,000)", max: 100000},
  {step: 6, label: "A mass of nations (more)", max: Infinity}
];
export const sizeStep = men => (SIZES.find(s => Math.max(1, n(men)) <= s.max) ?? SIZES.at(-1)).step;

export const QUALITY = {1: "Levies, a mob", 2: "Militia, armed townsfolk", 3: "Trained soldiers", 4: "Veterans", 5: "The best of the age"};
export const SUPERNATURAL = {0: "None", 1: "A ghoul or two, a hedge witch", 2: "A few Kindred, a mage, a Garou", 3: "A coterie, a pack or a cabal", 4: "Many: a war party, a sect's army", 5: "A host of them"};

/**
 * Where a side stands. `bonus` is added to its weight when it defends there; `resolve` to its resolve. Old walls
 * count for less once guns can breach them (`old`), and works of the gun age only exist from their year.
 */
export const POSITIONS = {
  open: {label: "Open ground", bonus: 0, resolve: 0},
  high: {label: "High ground, a river line, a wood", bonus: 1, resolve: 0},
  works: {label: "Field works: wagons, ditches, trenches", bonus: 1, resolve: 1},
  town: {label: "A walled town", bonus: 2, resolve: 1, old: true},
  castle: {label: "A castle", bonus: 3, resolve: 2, old: true},
  starfort: {label: "A bastion fort", bonus: 3, resolve: 2, from: 1530},
  bunker: {label: "Concrete bunkers", bonus: 3, resolve: 2, from: 1914}
};

/** The positions a year allows. */
export const positionsFor = year => Object.entries(POSITIONS).filter(([, p]) => !p.from || n(year) >= p.from).map(([id, p]) => ({id, ...p}));

/** A position's bonus in an age: old stone walls lose a point once guns can breach them. Walls down halve it. */
export function positionBonus(posId, age, {breached = false} = {}) {
  const p = POSITIONS[posId] ?? POSITIONS.open;
  let b = p.bonus;
  if ( p.old && age?.guns ) b -= 1;
  if ( breached ) b = Math.floor(b / 2);
  return Math.max(0, b);
}

/**
 * Right of Command, the book's army (Spoils of War p. 44 printed, pdf 45; read from the page images 12 November
 * 2026, /mnt/project-files/book-checks-2026-11-12b.md): each unit adds its dice to the army's Maneuver, Melee,
 * Ranged and Defense pools. `troops` is the men in one unit. `sup` marks the units with the supernatural in them,
 * which are the last to be lost (a WoDX reading: the book leaves the choice to the Storyteller).
 */
export const UNIT_TYPES = {
  peasants: {label: "Peasants", troops: 1000, maneuver: 1, melee: 1, ranged: 1, defense: 1},
  swordsmen: {label: "Swordsmen", troops: 1000, maneuver: 1, melee: 2, ranged: 0, defense: 2},
  spearmen: {label: "Spearmen", troops: 1000, maneuver: 1, melee: 2, ranged: 0, defense: 3},
  archers: {label: "Archers", troops: 500, maneuver: 1, melee: 1, ranged: 2, defense: 1},
  crossbowmen: {label: "Crossbowmen", troops: 500, maneuver: 1, melee: 1, ranged: 2, defense: 1},
  skirmishers: {label: "Skirmishers", troops: 500, maneuver: 2, melee: 1, ranged: 2, defense: 1},
  lightCavalry: {label: "Light cavalry", troops: 100, maneuver: 3, melee: 2, ranged: 0, defense: 2},
  heavyCavalry: {label: "Heavy cavalry", troops: 100, maneuver: 2, melee: 3, ranged: 0, defense: 3},
  horseArchers: {label: "Horse archers", troops: 100, maneuver: 2, melee: 2, ranged: 3, defense: 2},
  siegeEngines: {label: "Siege engines", troops: 10, maneuver: 0, melee: 0, ranged: 5, defense: 1},
  cainiteCavalry: {label: "Cainite cavalry", troops: 10, maneuver: 3, melee: 4, ranged: 1, defense: 3, sup: true},
  cainiteSkirmishers: {label: "Cainite skirmishers", troops: 10, maneuver: 2, melee: 3, ranged: 1, defense: 3, sup: true},
  ghoulKnights: {label: "Ghoul knights", troops: 50, maneuver: 2, melee: 3, ranged: 0, defense: 2, sup: true},
  kinfolkWolves: {label: "Kinfolk wolves", troops: 10, maneuver: 4, melee: 2, ranged: 0, defense: 2, sup: true},
  garouPack: {label: "Garou pack", troops: 5, maneuver: 3, melee: 5, ranged: 1, defense: 3, sup: true},
  knightsOfAcre: {label: "Knights of Acre", troops: 25, maneuver: 2, melee: 3, ranged: 1, defense: 4}
};
export const POOLS = ["maneuver", "melee", "ranged", "defense"];
/** The actions an army can take in a turn (Spoils of War p. 45). Flanking needs wings, which WoDX's one-line army does not have. */
export const ACTIONS = {melee: "Close and fight", ranged: "Shoot", withdraw: "Withdraw"};
/** A clean unit list: {type: count} for the known types, counts 0 to 999. */
export function normUnits(u) {
  const out = {};
  for ( const k of Object.keys(UNIT_TYPES) ) { const c = Math.round(n(u?.[k])); if ( c > 0 ) out[k] = Math.min(999, c); }
  return out;
}
const normUnitsMax = (a, b) => { const o = {}; for ( const k of Object.keys(UNIT_TYPES) ) { const v = Math.max(n(a?.[k]), n(b?.[k])); if ( v > 0 ) o[k] = v; } return o; };
export const unitCount = units => Object.values(units ?? {}).reduce((t, c) => t + n(c), 0);
export const menOfUnits = units => Math.max(1, Object.entries(units ?? {}).reduce((t, [k, c]) => t + (UNIT_TYPES[k]?.troops ?? 0) * n(c), 0));
/** The army's four pools from its units, before any penalty. */
export function unitPools(units) {
  const p = {maneuver: 0, melee: 0, ranged: 0, defense: 0};
  for ( const [k, c] of Object.entries(units ?? {}) ) for ( const x of POOLS ) p[x] += (UNIT_TYPES[k]?.[x] ?? 0) * n(c);
  return p;
}
/**
 * Take `k` units off an army: from the type with the most units first (mortal troops before the supernatural),
 * ties in the table's order. Returns {units, lost: {type: count}}.
 */
export function loseUnits(units, k) {
  const u = {...units}, lost = {};
  const order = Object.keys(UNIT_TYPES);
  for ( let i = 0; i < k; i++ ) {
    const live = order.filter(t => n(u[t]) > 0);
    if ( !live.length ) break;
    const mortal = live.filter(t => !UNIT_TYPES[t].sup);
    const pick = (mortal.length ? mortal : live).reduce((a, b) => (n(u[b]) > n(u[a]) ? b : a));
    u[pick] -= 1; lost[pick] = (lost[pick] ?? 0) + 1;
    if ( !u[pick] ) delete u[pick];
  }
  return {units: u, lost};
}
/** Both sides fight with the book's units (the side form's troop table is filled in for both). */
export const isBook = battle => !!battle?.book;

const pool = (v, d = 4) => clamp(Math.round(n(v) || d), 1, 15);
/** A clean side. Commander pools: pool Perception + Leadership, morale Charisma + Leadership, works Intelligence + Leadership, medicine Wits + Medicine. */
export function normSide(s = {}, fallbackName = "A side") {
  const units = normUnits(s.units);
  // a book army is as many men as its units; one with no units left has none in the fight
  const men = unitCount(units) ? menOfUnits(units) : s.men === 0 ? 0 : Math.max(1, Math.round(n(s.men) || 100));
  return {
    name: str(s.name) || fallbackName,
    faction: str(s.faction, 80),
    men,
    start: Math.max(men, Math.round(n(s.start) || men)),
    units,
    startUnits: unitCount(units) ? normUnits({...units, ...normUnitsMax(s.startUnits, units)}) : {},
    quality: clamp(Math.round(n(s.quality) || 3), 1, 5),
    supernatural: clamp(Math.round(n(s.supernatural)), 0, 5),
    position: POSITIONS[s.position] ? s.position : "open",
    commander: {name: str(s.commander?.name) || "", actorId: str(s.commander?.actorId, 40), pool: pool(s.commander?.pool),
      morale: pool(s.commander?.morale), works: pool(s.commander?.works), medicine: pool(s.commander?.medicine, 3)},
    lostUnits: Math.max(0, Math.round(n(s.lostUnits))),
    penalty: clamp(Math.round(n(s.penalty)), 0, 10),
    sick: clamp(Math.round(n(s.sick)), 0, 6),
    resolve: s.resolve === undefined || s.resolve === null ? null : clamp(Math.round(n(s.resolve)), 0, 20),
    stores: Math.max(0, Math.round(n(s.stores))),
    defends: !!s.defends
  };
}

/** A side's weight: its size step, quality and the supernatural in its ranks, and its position if it defends. */
export function weightOf(side, age, {breached = false} = {}) {
  return sizeStep(side.men) + side.quality + side.supernatural + (side.defends ? positionBonus(side.position, age, {breached}) : 0);
}

/** A side's resolve when the fighting starts: 3, its quality, and its position's steadiness if it defends there. */
export function startResolve(side) {
  return 3 + side.quality + (side.defends ? (POSITIONS[side.position]?.resolve ?? 0) : 0);
}

/** The difficulty of a commander's roll: 6 (Spoils of War p. 44), plus the side's disease penalty (p. 41), to 10. */
export function difficultyFor(side) {
  return clamp(6 + n(side?.sick), 3, 10);
}
/** Demoralised (Spoils of War p. 45): a die less for each unit lost past the commander's Charisma + Leadership. */
export const demoralised = side => Math.max(0, n(side?.lostUnits) - n(side?.commander?.morale));

/** A clean battle. */
export function normBattle(b = {}) {
  const kind = b.kind === "siege" ? "siege" : "field";
  const out = {
    id: str(b.id, 40) || Math.random().toString(36).slice(2, 12),
    kind,
    name: str(b.name) || (kind === "siege" ? "A siege" : "A battle"),
    place: str(b.place),
    realm: REALMS[b.realm] ? b.realm : "world",
    year: Math.round(n(b.year)) || null,
    branch: b.branch === "future" ? "future" : "classic",
    eventId: str(b.eventId, 80),
    sides: [normSide(b.sides?.[0], "The attackers"), normSide(b.sides?.[1], "The defenders")],
    chars: (Array.isArray(b.chars) ? b.chars : []).filter(c => c?.actorId).map(c => ({
      actorId: str(c.actorId, 40), name: str(c.name), side: c.side === 1 ? 1 : 0, stance: ["thick", "rear", "command"].includes(c.stance) ? c.stance : "thick",
      ...(DEED_POSTS[c.post] ? {post: c.post} : {})
    })).slice(0, 20),
    phases: (Array.isArray(b.phases) ? b.phases : []).slice(-200),
    weeks: Math.max(0, Math.round(n(b.weeks))),
    breach: clamp(Math.round(n(b.breach)), 0, 8),
    breached: !!b.breached,
    over: b.over ? {winner: b.over.winner === 1 ? 1 : b.over.winner === 0 ? 0 : null, how: str(b.over.how, 40), at: Math.round(n(b.over.at)) || null, text: str(b.over.text, 400)} : null,
    started: Math.round(n(b.started)) || null,
    timePassed: Math.max(0, Math.round(n(b.timePassed))),
    legend: b.legend !== false,
    // a war between factions fought off the screen (WoDX NPC, B2211): who, for what place, and whether it runs by itself
    war: b.war && typeof b.war === "object" ? {attacker: str(b.war.attacker, 40), defender: str(b.war.defender, 40), place: str(b.war.place, 200),
      kind: b.war.kind === "supernatural" ? "supernatural" : "mortal", auto: !!b.war.auto, turn: Math.round(n(b.war.turn)) || null} : null,
    // Storyteller 0.47.0: the deeds offered for the next phase (battle-deeds.mjs) and what the field left behind (battle-aftermath.mjs)
    offers: normOffers(b.offers),
    aftermath: normAftermath(b.aftermath)
  };
  out.book = b.book === undefined || b.book === null ? out.sides.every(x => unitCount(x.units) > 0) : !!b.book;
  // Field battles: the defender is side 1. A siege: side 1 holds the walls.
  if ( out.sides.every(s => !s.defends) ) out.sides[1].defends = true;
  for ( const s of out.sides ) if ( s.resolve === null ) s.resolve = startResolve(s);
  return out;
}

export const blankBattles = () => ({v: BATTLES_VERSION, list: []});
export function normBattles(s) {
  const list = Array.isArray(s?.list) ? s.list : [];
  return {v: BATTLES_VERSION, list: list.filter(b => b && typeof b === "object").map(normBattle).slice(-BATTLES_CAP)};
}

/**
 * What both commanders roll this phase: {pool, difficulty, weight} for each side. The heavier side adds a die for
 * each point it outweighs the other (WoDX's stand-in for the book's troop dice); wavering costs its 2 dice; being
 * demoralised costs its dice; at least 1 die. `extra` adds dice to a side (the Storyteller's call).
 */
export function phaseSetup(battle, age, {extra = [0, 0]} = {}) {
  const w = battle.sides.map(s => weightOf(s, age, {breached: battle.breached}));
  return battle.sides.map((s, i) => ({
    pool: Math.max(1, s.commander.pool + Math.max(0, w[i] - w[1 - i]) + n(extra[i]) - s.penalty - demoralised(s)),
    difficulty: difficultyFor(s), weight: w[i]
  }));
}

/**
 * Settle one phase. `rolls` = [{successes, botch}] for each side; `deeds` = [[{name, successes}], [...]] the
 * characters' deeds for each side. A botch gives the other side 2 net successes (Spoils of War p. 44). The side
 * with more successes, deeds included, takes the difference from the other's resolve, and the loser counts that
 * many units lost (for being demoralised). Each deed success also takes one foe out of the fight (Dark Ages
 * Companion p. 45). The losing side loses its age's share of its men for each net success (at least one man), the
 * winner a third of that. Returns {phase, sides, over, waver}: `waver` names a side that must roll Charisma +
 * Leadership (wavering, Spoils of War p. 45: it lost 3 or more this phase, or a character killed more than 10 of
 * it, p. 44), with the difficulty.
 */
export function settlePhase(battle, age, rolls, deeds = [[], []]) {
  const deedSum = [0, 1].map(i => (deeds[i] ?? []).reduce((t, d) => t + Math.max(0, n(d.successes)), 0));
  const bigDeed = [0, 1].map(i => (deeds[i] ?? []).some(d => n(d.successes) > 10));
  const total = [0, 1].map(i => Math.max(0, n(rolls[i]?.successes)) + deedSum[i] + (rolls[1 - i]?.botch ? 2 : 0));
  const net = total[0] - total[1];
  const winner = net > 0 ? 0 : net < 0 ? 1 : null, by = Math.abs(net);
  const sides = battle.sides.map(s => ({...s, commander: {...s.commander}, penalty: 0}));
  const lost = [0, 0], resolveLost = [0, 0];
  if ( winner !== null ) {
    const loser = 1 - winner;
    resolveLost[loser] += by;
    sides[loser].lostUnits += by;
    lost[loser] = Math.max(1, Math.round(sides[loser].men * age.kill * by));
    lost[winner] = Math.round(sides[winner].men * age.kill * by / 3);
  } else {
    // A drawn phase: both sides bleed a little.
    for ( const i of [0, 1] ) lost[i] = Math.round(sides[i].men * age.kill / 2);
  }
  // the foes the characters' deeds took out of the fight
  for ( const i of [0, 1] ) lost[1 - i] += deedSum[i];
  for ( const i of [0, 1] ) {
    lost[i] = Math.min(lost[i], sides[i].men - 1);
    sides[i].men -= lost[i];
    sides[i].resolve = Math.max(0, sides[i].resolve - resolveLost[i]);
  }
  const broken = [0, 1].filter(i => sides[i].resolve <= 0);
  const phase = {
    n: battle.phases.length + 1, kind: "phase", total, net, winner, lost, resolveLost,
    rolls: rolls.map(r => ({successes: Math.max(0, n(r?.successes)), botch: !!r?.botch, faces: Array.isArray(r?.faces) ? r.faces.slice(0, 30) : []})),
    deeds: [0, 1].map(i => (deeds[i] ?? []).map(d => ({name: str(d.name), successes: Math.max(0, n(d.successes)), ...(d.seen ? {seen: true} : {})}))),
    before: battle.sides.map(s => ({men: s.men, resolve: s.resolve, lostUnits: s.lostUnits, penalty: s.penalty, sick: s.sick}))
  };
  let over = null;
  if ( broken.length === 2 ) over = {winner: null, how: "both"};
  else if ( broken.length === 1 ) over = {winner: 1 - broken[0], how: "rout"};
  let waver = null;
  if ( !over ) {
    const loser = winner === null ? null : 1 - winner;
    if ( loser !== null && by >= 3 ) waver = {side: loser, difficulty: clamp(by, 3, 10)};
    else { const shaken = [0, 1].find(i => bigDeed[1 - i]); if ( shaken !== undefined ) waver = {side: shaken, difficulty: 6}; }
  }
  return {phase, sides, over, waver};
}

/**
 * A wavering side's commander rolled Charisma + Leadership: a failure costs it 2 dice next phase, a botch breaks it
 * (Spoils of War p. 45). Returns the new battle (pure).
 */
export function applyWaver(battle, sideIdx, roll, at = null) {
  const i = sideIdx === 1 ? 1 : 0;
  const sides = battle.sides.map(s => ({...s, commander: {...s.commander}}));
  const last = battle.phases.at(-1);
  const note = roll?.botch ? "breaks" : n(roll?.successes) > 0 ? "holds" : "wavers";
  if ( note === "wavers" ) sides[i].penalty = 2;
  if ( note === "breaks" ) sides[i].resolve = 0;
  const phases = last ? [...battle.phases.slice(0, -1), {...last, waver: {side: i, result: note, successes: Math.max(0, n(roll?.successes))}}] : battle.phases;
  const b = {...battle, sides, phases};
  if ( note === "breaks" ) { const over = {winner: 1 - i, how: "rout"}; b.over = {...over, at, text: outcomeText({...b, over})}; }
  return b;
}

/* ---- Right of Command: the book's battle turn (Spoils of War pp. 44-45) ---- */

/**
 * The commanders' roll at the start of a book turn: Perception + Leadership, opposed, at 6 plus disease. `extra`
 * adds dice (the Storyteller's call).
 */
export function bookSetup(battle, age, {extra = [0, 0]} = {}) {
  return battle.sides.map((s, i) => ({pool: Math.max(1, s.commander.pool + n(extra[i])), difficulty: difficultyFor(s)}));
}

/**
 * Each army's pools this turn: its units' dice, plus the commanders' net successes for the winner and minus them for
 * the loser (a botch gives the other side 2 more), less 2 while wavering and a die a unit while demoralised, at
 * least 1 while it has any units. A side that defends adds its position's bonus to Defense (a WoDX reading: the
 * book's army has no terrain).
 */
export function bookPools(battle, age, commandRolls = [null, null]) {
  const total = [0, 1].map(i => Math.max(0, n(commandRolls[i]?.successes)) + (commandRolls[1 - i]?.botch ? 2 : 0));
  const net = total[0] - total[1];
  const pools = battle.sides.map((s, i) => {
    const base = unitPools(s.units);
    const mod = (i === 0 ? net : -net) - s.penalty - demoralised(s);
    const out = {};
    for ( const x of POOLS ) out[x] = unitCount(s.units) && base[x] > 0 ? Math.max(1, base[x] + mod) : 0;
    if ( s.defends && out.defense ) out.defense += positionBonus(s.position, age, {breached: battle.breached});
    return out;
  });
  return {total, net, pools};
}

/**
 * The rolls a book turn needs, once the commanders have rolled. `actions` = ["melee" | "ranged" | "withdraw", ...].
 * Close and fight: Melee against the foe's Defense. Shoot: Ranged against half the foe's Defense. Withdraw:
 * Maneuver against the foe's Maneuver. Returns [{side, action, attack: {pool, difficulty}, resist: {pool, difficulty}}].
 */
export function bookContests(battle, age, pools, actions = ["melee", "melee"]) {
  const act = [0, 1].map(i => (ACTIONS[actions?.[i]] ? actions[i] : "melee"));
  return [0, 1].map(i => {
    const me = pools[i], foe = pools[1 - i], a = act[i];
    const attack = a === "withdraw" ? me.maneuver : a === "ranged" ? me.ranged : me.melee;
    const resist = a === "withdraw" ? foe.maneuver : a === "ranged" ? Math.ceil(foe.defense / 2) : foe.defense;
    return {side: i, action: a, attack: {pool: Math.max(0, attack), difficulty: difficultyFor(battle.sides[i])},
      resist: {pool: Math.max(0, resist), difficulty: difficultyFor(battle.sides[1 - i])}};
  });
}

/**
 * Settle a book turn. `plan` = {total, net, pools, contests} with each contest's `rolls` = {attack, resist}; `deeds`
 * as for settlePhase. A character's deed adds its successes to its side's attack this turn (a WoDX reading of the
 * Dark Ages Companion's one foe a success, in the book army's units).
 *   Close and fight: the winner takes a unit off the other for each net success, either way; when both armies
 *   close, each counts only the units its own blow takes (a WoDX reading: otherwise each clash is counted twice).
 *   Shoot: only the shooters do harm.
 *   Withdraw: a win keeps the foe's Close and fight off it this turn and takes the army off the field; a loss gives
 *   the foe's attack on it the net successes (the book: they count against its Defense and Maneuver).
 * Wavering: an army that loses 3 or more units in a turn rolls Charisma + Leadership at that many (3 to 10).
 * An army with no units left is beaten. Returns {phase, sides, over, waver} like settlePhase.
 */
export function settleBookTurn(battle, age, plan, deeds = [[], []]) {
  const deedSum = [0, 1].map(i => (deeds[i] ?? []).reduce((t, d) => t + Math.max(0, n(d.successes)), 0));
  const bigDeed = [0, 1].map(i => (deeds[i] ?? []).some(d => n(d.successes) > 10));
  const c = plan.contests;
  const net = c.map(x => Math.max(0, n(x.rolls?.attack?.successes)) - Math.max(0, n(x.rolls?.resist?.successes)));
  const loss = [0, 0];
  const away = [0, 1].map(i => c[i].action === "withdraw" && net[i] > 0);
  for ( const i of [0, 1] ) {
    if ( c[i].action === "withdraw" ) continue;
    let k = net[i] + deedSum[i];
    // a failed withdrawal leaves the army open to the blow
    if ( c[1 - i].action === "withdraw" && net[1 - i] < 0 ) k += -net[1 - i];
    if ( c[i].action === "melee" && away[1 - i] ) continue;
    if ( k > 0 ) loss[1 - i] += k;
    // a beaten attack costs the attackers only when the foe stood to receive it; when both close, each side's blow is its own count
    else if ( k < 0 && c[i].action === "melee" && c[1 - i].action !== "melee" ) loss[i] += -k;
  }
  const sides = battle.sides.map(s => ({...s, commander: {...s.commander}, units: {...s.units}, penalty: 0}));
  const lostUnits = [{}, {}];
  for ( const i of [0, 1] ) {
    const r = loseUnits(sides[i].units, loss[i]);
    sides[i].units = r.units; lostUnits[i] = r.lost;
    const before = sides[i].men;
    sides[i].men = unitCount(r.units) ? menOfUnits(r.units) : 0;
    sides[i].lostUnits += unitCount(r.lost);
    loss[i] = unitCount(r.lost);
    lostUnits[i].men = before - sides[i].men;
  }
  const winner = loss[0] < loss[1] ? 0 : loss[1] < loss[0] ? 1 : null;
  const phase = {
    n: battle.phases.length + 1, kind: "phase", book: true, total: plan.total, net: loss[1] - loss[0], winner,
    lost: lostUnits.map(x => x.men), units: loss, resolveLost: [0, 0], pools: plan.pools,
    contests: c.map((x, i) => ({action: x.action, attack: x.attack, resist: x.resist, net: net[i],
      rolls: {attack: rollOut(x.rolls?.attack), resist: rollOut(x.rolls?.resist)}})),
    rolls: (plan.commandRolls ?? [null, null]).map(rollOut),
    deeds: [0, 1].map(i => (deeds[i] ?? []).map(d => ({name: str(d.name), successes: Math.max(0, n(d.successes)), ...(d.seen ? {seen: true} : {})}))),
    before: battle.sides.map(s => ({men: s.men, resolve: s.resolve, lostUnits: s.lostUnits, penalty: s.penalty, sick: s.sick, units: {...s.units}}))
  };
  const gone = [0, 1].filter(i => !unitCount(sides[i].units));
  let over = null;
  if ( gone.length === 2 ) over = {winner: null, how: "both"};
  else if ( gone.length === 1 ) over = {winner: 1 - gone[0], how: "rout"};
  else if ( away[0] && away[1] ) over = {winner: null, how: "stalemate"};
  else if ( away[0] || away[1] ) over = {winner: away[0] ? 1 : 0, how: battle.kind === "siege" ? "lifted" : "withdraw"};
  let waver = null;
  if ( !over ) {
    const hit = [0, 1].filter(i => loss[i] >= 3).sort((a, b) => loss[b] - loss[a]);
    if ( hit.length ) waver = {side: hit[0], difficulty: clamp(loss[hit[0]], 3, 10)};
    else { const shaken = [0, 1].find(i => bigDeed[1 - i]); if ( shaken !== undefined ) waver = {side: shaken, difficulty: 6}; }
  }
  // the men a broken army still has are no longer in the fight
  for ( const i of [0, 1] ) if ( !sides[i].men ) sides[i].men = 0;
  return {phase, sides, over, waver};
}
/**
 * What an army fought off the screen does this turn (a WoDX reading, B2210): it closes when its Melee outweighs the
 * foe's Defense, shoots when its Ranged does better against half that Defense, and otherwise closes anyway, unless it
 * has lost half its units, when it withdraws in what order it can. Returns ["melee" | "ranged" | "withdraw", ...].
 */
export function chooseActions(battle, age) {
  const {pools} = bookPools(battle, age);
  return [0, 1].map(i => {
    const me = pools[i], foe = pools[1 - i], s = battle.sides[i];
    const melee = me.melee - foe.defense, ranged = me.ranged - Math.ceil(foe.defense / 2);
    const start = unitCount(s.startUnits) || unitCount(s.units);
    if ( melee < 0 && ranged < 0 && unitCount(s.units) * 2 <= start ) return "withdraw";
    return ranged > melee && ranged > 0 ? "ranged" : "melee";
  });
}
const rollOut = r => ({successes: Math.max(0, n(r?.successes)), botch: !!r?.botch, faces: Array.isArray(r?.faces) ? r.faces.slice(0, 40) : []});

/** Disease in a camp (Spoils of War p. 41): the difficulty of the week's Wits + Medicine roll for a side. */
export const diseaseDifficulty = side => clamp(Math.ceil(Math.max(1, n(side?.men)) / 1000), 4, 10);
/** The new disease penalty after a week's roll: a failure adds 1; a success as big as the penalty takes 1 off. */
export function diseaseAfter(sick, roll) {
  const s = Math.max(0, n(sick)), k = Math.max(0, n(roll?.successes));
  if ( !k ) return Math.min(6, s + 1);
  return s > 0 && k >= s ? s - 1 : s;
}

/** One week of a siege. The besiegers (side 0) work at the walls; their successes fill the breach clock (8). */
export const BREACH_SEGMENTS = 8;
/**
 * The besieging commander's Intelligence + Leadership for the siege works (Spoils of War p. 41, the roll for
 * planning a mine and for siege engines), at 6 plus the walls' bonus (a house rule), less 1 with a strong
 * supernatural force, plus the camp's disease penalty; 3 to 10.
 */
export function siegeSetup(battle, age) {
  const walls = positionBonus(battle.sides[1].position, age);
  const s0 = battle.sides[0];
  return {pool: Math.max(1, s0.commander.works - demoralised(s0)), difficulty: clamp(6 + walls - (s0.supernatural >= 3 ? 1 : 0) + s0.sick, 3, 10), walls};
}
/**
 * `roll` = the works roll; `sickRolls` = the week's Wits + Medicine roll for each side (disease). Guns breach twice
 * as fast. The garrison eats a week of its stores; once they are gone, hunger costs it a point of resolve a week. A
 * side whose disease penalty has reached 3 loses a point of resolve that week too (a house rule).
 */
export function settleWeek(battle, age, roll, sickRolls = [null, null]) {
  const sides = battle.sides.map(s => ({...s, commander: {...s.commander}}));
  const weeks = battle.weeks + 1;
  const work = Math.max(0, n(roll?.successes)) * (age.guns ? 2 : 1);
  const breach = clamp(battle.breach + work - (roll?.botch ? 1 : 0), 0, BREACH_SEGMENTS);
  const lost = [0, 0], resolveLost = [0, 0];
  const garrison = sides[1];
  let hungry = false;
  // a book army's men are its units, so the week's hunger and sickness wear its resolve, not its numbers
  const thin = side => (battle.book ? 0 : Math.round(side.men * 0.02));
  if ( garrison.stores > 0 ) garrison.stores = Math.max(0, garrison.stores - 7);
  else { hungry = true; resolveLost[1] += 1; lost[1] = thin(garrison); }
  for ( const i of [0, 1] ) {
    if ( sickRolls[i] ) sides[i].sick = diseaseAfter(sides[i].sick, sickRolls[i]);
    if ( sides[i].sick >= 3 ) { resolveLost[i] += 1; lost[i] += thin(sides[i]); }
  }
  for ( const i of [0, 1] ) {
    lost[i] = Math.min(lost[i], sides[i].men - 1);
    sides[i].men -= lost[i];
    sides[i].resolve = Math.max(0, sides[i].resolve - resolveLost[i]);
  }
  const phase = {n: battle.phases.length + 1, kind: "week", week: weeks, work, breach, hungry, lost, resolveLost, sick: sides.map(s => s.sick),
    rolls: [{successes: Math.max(0, n(roll?.successes)), botch: !!roll?.botch, faces: Array.isArray(roll?.faces) ? roll.faces.slice(0, 30) : []}],
    before: battle.sides.map(s => ({men: s.men, resolve: s.resolve, stores: s.stores, sick: s.sick})), breachBefore: battle.breach, breachedBefore: battle.breached};
  let over = null;
  if ( sides[1].resolve <= 0 ) over = {winner: 0, how: "surrender"};
  else if ( sides[0].resolve <= 0 ) over = {winner: 1, how: "lifted"};
  return {phase, sides, weeks, breach, breached: battle.breached || breach >= BREACH_SEGMENTS, over};
}

/** Apply a settled phase or week to the battle (pure: returns a new battle). */
export function applyStep(battle, step, at = null) {
  const b = {...battle, sides: step.sides, phases: [...battle.phases, step.phase]};
  if ( step.weeks !== undefined ) { b.weeks = step.weeks; b.breach = step.breach; b.breached = step.breached; }
  if ( step.over ) b.over = {...step.over, at, text: outcomeText({...b, over: step.over})};
  return b;
}

/** Take back the last phase or week. */
export function undoStep(battle) {
  const last = battle.phases.at(-1);
  if ( !last ) return battle;
  const sides = battle.sides.map((s, i) => {
    const o = {...s, commander: {...s.commander}};
    for ( const k of ["men", "resolve", "stores", "lostUnits", "penalty", "sick", "units"] ) if ( last.before[i][k] !== undefined ) o[k] = last.before[i][k];
    return o;
  });
  const b = {...battle, sides, phases: battle.phases.slice(0, -1), over: null};
  if ( last.kind === "week" ) { b.weeks = Math.max(0, battle.weeks - 1); b.breach = last.breachBefore; b.breached = last.breachedBefore; }
  return b;
}

/** A side withdraws in good order: the battle ends, the side leaving loses a tenth of its men to the pursuit. */
export function withdraw(battle, sideIdx, at = null) {
  const i = sideIdx === 1 ? 1 : 0;
  const sides = battle.sides.map(s => ({...s, commander: {...s.commander}}));
  const before = battle.sides.map(s => ({men: s.men, resolve: s.resolve, stores: s.stores, units: {...(s.units ?? {})}, lostUnits: s.lostUnits}));
  let lost;
  if ( battle.book && unitCount(sides[i].units) > 1 ) {
    // a book army leaves a tenth of its units (at least one) to the pursuit
    const r = loseUnits(sides[i].units, Math.max(1, Math.round(unitCount(sides[i].units) / 10)));
    lost = sides[i].men - menOfUnits(r.units);
    sides[i].units = r.units; sides[i].lostUnits += unitCount(r.lost);
  } else lost = Math.min(sides[i].men - 1, Math.round(sides[i].men * 0.1));
  sides[i].men -= lost;
  const phase = {n: battle.phases.length + 1, kind: "withdraw", side: i, lost: i === 0 ? [lost, 0] : [0, lost], resolveLost: [0, 0], before,
    breachBefore: battle.breach, breachedBefore: battle.breached};
  const over = {winner: 1 - i, how: battle.kind === "siege" && i === 0 ? "lifted" : "withdraw"};
  const b = {...battle, sides, phases: [...battle.phases, phase]};
  return {...b, over: {...over, at, text: outcomeText({...b, over})}};
}

/** The siege's walls come down by assault: the rest is fought as a field battle with the walls halved. */
export const assault = battle => ({...battle, kind: "field", breached: true, phases: [...battle.phases, {n: battle.phases.length + 1, kind: "assault",
  before: battle.sides.map(s => ({men: s.men, resolve: s.resolve, stores: s.stores})), lost: [0, 0], resolveLost: [0, 0], breachBefore: battle.breach, breachedBefore: battle.breached, wasSiege: true}]});
/** Undo of an assault turns it back into a siege. */
export function undoAny(battle) {
  const last = battle.phases.at(-1);
  if ( last?.kind === "assault" ) return {...battle, kind: "siege", breached: last.breachedBefore, phases: battle.phases.slice(0, -1), over: null};
  return undoStep(battle);
}

/** Game time the battle has taken: phases times the age's phase, weeks of siege. */
export function timeTaken(battle, age) {
  const phases = battle.phases.filter(p => p.kind === "phase").length;
  const weeks = battle.phases.filter(p => p.kind === "week").length;
  return phases * age.phase + weeks * 7 * DAY;
}
export function timeWords(seconds) {
  const s = Math.max(0, n(seconds));
  if ( s >= 14 * DAY ) return `${Math.round(s / (7 * DAY))} weeks`;
  if ( s >= 2 * DAY ) return `${Math.round(s / DAY)} days`;
  if ( s >= 2 * HOUR ) return `${Math.round(s / HOUR)} hours`;
  if ( s >= HOUR ) return "an hour";
  return `${Math.round(s / 60)} minutes`;
}

const HOW = {
  rout: (w, l) => `${w} won the day; ${l} broke and fled`,
  both: () => "Both sides broke and the field was left to the dead",
  withdraw: (w, l) => `${l} drew off in good order and left the field to ${w}`,
  surrender: (w, l) => `${l} gave up the walls to ${w}`,
  lifted: (w, l) => `${l} lifted the siege; ${w} held`,
  stalemate: () => "Neither side could break the other, and the fighting stopped"
};
/** The outcome in a sentence, with the losses. */
export function outcomeText(battle) {
  const o = battle.over;
  if ( !o ) return "";
  const [a, b] = battle.sides;
  const w = o.winner === null ? null : battle.sides[o.winner], l = o.winner === null ? null : battle.sides[1 - o.winner];
  const head = (HOW[o.how] ?? HOW.stalemate)(w?.name ?? a.name, l?.name ?? b.name);
  const dead = battle.sides.map(s => `${s.name} lost ${(s.start - s.men).toLocaleString("en")} of ${s.start.toLocaleString("en")}`).join("; ");
  return `${head}. ${dead}.`;
}

/** Stop the fighting with no winner (the Storyteller's call: night falls, a truce, a storm). */
export function stalemate(battle, at = null) {
  const over = {winner: null, how: "stalemate"};
  return {...battle, over: {...over, at, text: outcomeText({...battle, over})}};
}

/**
 * The battle's counterattack on a character this phase (Dark Ages Companion pp. 46-47): the age's dice (5 in the
 * Dark Ages, as the book; more in later ages, a house rule) at difficulty 6, 2 more when the character drew the
 * enemy's attention, 2 fewer at the rear or in command. Not dodged.
 */
export function hazardFor(age, stance, attention = false) {
  const base = n(age?.hazard) || 5;
  const d = stance === "thick" ? base : base - 2;
  return Math.max(0, d + (attention ? 2 : 0));
}
/**
 * What a counterattack roll does: damage dice twice its successes, aggravated every third phase (fire, oil, blessed
 * weapons), and five or more successes a stake through a Cainite's heart (others take the damage, Spoils of War p. 44).
 */
export function counterResult(successes, phaseNo, {cainite = false} = {}) {
  const k = Math.max(0, n(successes));
  return {dice: 2 * k, type: n(phaseNo) > 0 && n(phaseNo) % 3 === 0 ? "aggravated" : "lethal", staked: cainite && k >= 5};
}

/** Dated events in the chronicle that look like wars, within `span` years of the year (for a quick start). */
const WARLIKE = /\b(war|wars|battle|siege|besieg\w*|crusade|uprising|revolt|rebellion|invasion|invades?|sack(ed)?|campaign)\b/i;
export function warEvents(events = [], year, span = 5) {
  const y = n(year);
  return events.filter(ev => ev && WARLIKE.test(`${ev.name ?? ""}`) && Math.abs(n(ev.year) - y) <= span)
    .sort((a, b) => Math.abs(n(a.year) - y) - Math.abs(n(b.year) - y) || n(a.year) - n(b.year)).slice(0, 12);
}

/** The progress clock that mirrors a siege's breach (for WoDX Storyteller's clocks). */
export const clockFor = battle => ({id: `siege-${battle.id}`.slice(0, 40), name: `The walls of ${battle.place || battle.name}`, segments: BREACH_SEGMENTS,
  filled: battle.breach, tick: "none", note: `${battle.sides[0].name} at the walls of ${battle.sides[1].name}.`});
