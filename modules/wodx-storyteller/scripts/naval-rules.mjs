/**
 * WoDX Storyteller 0.51.0: ships at sea, the pure part. No Foundry calls here (B2480-B2487).
 *
 * Two ships, or a ship and its quarry, at sea: a chase, the turn for position, shooting, ramming, boarding, the
 * damage that slows a ship and floods it, and the crew patching it up. Book basis, read on the PC on 12 November
 * 2026 (/mnt/project-files/ship-table-book-check-2026-11-12-answers.md and battle-book-check.md):
 *
 * - Dark Ages: Vampire, Spoils of War (printed; pdf = printed + 1): the ships of the Dark Medieval with Speed,
 *   Maneuverability, crew, arms, soak and health levels (p. 40); navigation on Intelligence + Seamanship at 6 in
 *   sight of land, 9 with nothing to steer by, 1 less each for a compass and a pilot's book; the pursuit roll of Wits
 *   + Seamanship at 7 every 4 hours added to Speed, each point of difference 500 yards; the manoeuvre as resisted
 *   Intelligence + Seamanship at 8 less Maneuverability, the net added to initiative; boarding by the usual combat,
 *   the defenders yielding once half are down and they are outnumbered two to one; ship-to-ship fire with Dexterity
 *   + Archery and the engines of p. 33; each health level lost costing 1 Speed and 1 Maneuverability, the ship
 *   flooding a level every 15 minutes below 0 Speed and sinking at 0 health levels; repair as an extended roll every
 *   15 minutes, up to 6 helping, the successes needed equal to the damage (pp. 42-43); oars rowed at most 12 hours
 *   a day, each point of extra oar Speed costing 3 of them (p. 40). The galley's beak is a boarding hook (p. 38).
 * - Wraith: The Great War pp. 74-80 (printed = pdf), the only naval rules for the gun ages in the books: gun crews
 *   of 2 to 7 dice of Heavy Weaponry at 6, 7 or 8 for short, medium and long range, a roll per barrel on a modern
 *   ship and per bank of guns on a sailing ship, central fire direction 1 easier; torpedoes hitting at 7, dodged
 *   with Wits and the helm at 8, their damage always rolled at 4; ramming from 0 yards after opposed Wits + the
 *   helm at 6, 3 dice a net success to each ship, 5 from a ship with a ram, damage at 5; staying alongside or
 *   breaking away as the first to 5 successes.
 *
 * WoDX's own readings (house rules): the ships after the book's (carrack to the Future Darkness drone corvette) and
 * their guns; the Great War's helm rolls made with Seamanship for ships of the living world; soak rolled at 6 as
 * for a character; a ship not built to ram taking 3 dice a net success and one built for it 1; a quarry lost from
 * sight at 5,000 yards; repair rolled at 6 with each helper a die; the contest to break away at 6.
 */

import {ENGINES} from "./siege-works-rules.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const int = (v, lo, hi, d) => clamp(Math.round(v === undefined || v === null || v === "" ? d : n(v)), lo, hi);
const str = (v, max = 120) => String(v ?? "").trim().slice(0, max);

export const NAVAL_VERSION = 1;
export const NAVAL_CAP = 60;
export const PURSUIT_YARDS = 500;
export const LOST_AT = 5000;
export const QUARTER = 15 * 60, WATCH = 4 * 3600;

/** Count faces at a difficulty: successes less ones; a botch on no success and a one. */
export function count(faces, diff) {
  let raw = 0, ones = 0;
  for ( const f of faces ) { if ( f === 1 ) ones++; if ( f >= diff ) raw++; }
  return {successes: Math.max(0, raw - ones), botch: raw === 0 && ones > 0};
}
const roll = (draw, dice, diff) => { const faces = draw(Math.max(1, Math.round(dice))); return {...count(faces, diff), faces, dice: Math.max(1, Math.round(dice)), diff}; };

/**
 * Guns of the ages after the book's engines (house rules, sized to the Great War's guns): `damage` dice, `per`
 * what one roll stands for.
 */
export const GUNS = {
  culverin: {label: "Culverins and sakers", damage: 10, per: "bank"},
  broadside: {label: "A broadside of cannon", damage: 12, per: "bank"},
  carronade: {label: "Carronades", damage: 14, per: "bank"},
  shellgun: {label: "Shell guns", damage: 15, per: "barrel"},
  turret: {label: "Turret guns", damage: 18, per: "barrel"},
  quickfirer: {label: "Quick-firing guns", damage: 10, per: "barrel"},
  torpedo: {label: "Torpedoes", damage: 16, per: "torpedo", torpedo: true},
  missile: {label: "Ship missiles", damage: 22, per: "missile", missile: true},
  railgun: {label: "A railgun", damage: 24, per: "barrel"}
};

/**
 * Ships. `speed` the sailing (or engine) Speed, `oars` the rowing Speed, `maneuver` the Maneuverability, `arms`
 * [[id, how many]] from ENGINES (the book's engines) or GUNS, `ram` built to ram, `fire` central fire direction.
 * The first seven are the book's (Spoils of War p. 40); the rest are WoDX figures.
 */
export const SHIPS = {
  longship: {label: "Longship", speed: 4, oars: 4, maneuver: 2, crew: 65, arms: [], soak: 4, health: 6, from: 1197, to: 1350, shallow: true},
  smallCog: {label: "Cog, small", speed: 3, maneuver: 1, crew: 30, arms: [["espringal", 1]], soak: 8, health: 10, from: 1197, to: 1450},
  largeCog: {label: "Cog, large", speed: 3, maneuver: 0, crew: 70, arms: [["mangonel", 1]], soak: 10, health: 14, from: 1197, to: 1450},
  dromon: {label: "Dromon (a war galley)", speed: 3, oars: 3, maneuver: 1, crew: 180, soldiers: 50, arms: [["mangonel", 1], ["espringal", 2]], soak: 9, health: 10, from: 1197, to: 1300},
  sagitta: {label: "Sagitta (a small war galley)", speed: 5, oars: 4, maneuver: 2, crew: 80, soldiers: 20, arms: [["espringal", 2]], soak: 7, health: 6, from: 1197, to: 1400},
  tarida: {label: "Tarida (a cargo galley)", speed: 3, oars: 3, maneuver: 1, crew: 120, soldiers: 300, arms: [], soak: 8, health: 8, from: 1197, to: 1450, shallow: true},
  qayiq: {label: "Qayiq", speed: 3, maneuver: 2, crew: 30, soldiers: 30, arms: [["espringal", 2]], soak: 7, health: 8, from: 1197, to: 1450},
  galley: {label: "War galley with a gun in the bow", speed: 3, oars: 4, maneuver: 2, crew: 200, soldiers: 100, arms: [["culverin", 1]], soak: 9, health: 10, ram: true, from: 1450, to: 1720, house: true},
  carrack: {label: "Carrack", speed: 3, maneuver: 0, crew: 100, arms: [["culverin", 2]], soak: 10, health: 16, from: 1400, to: 1600, house: true},
  galleon: {label: "Galleon", speed: 4, maneuver: 1, crew: 200, soldiers: 50, arms: [["broadside", 2]], soak: 11, health: 18, from: 1530, to: 1700, house: true},
  lineShip: {label: "Ship of the line", speed: 4, maneuver: 0, crew: 600, soldiers: 100, arms: [["broadside", 6], ["carronade", 1]], soak: 13, health: 26, from: 1650, to: 1860, house: true},
  frigate: {label: "Frigate", speed: 5, maneuver: 2, crew: 250, arms: [["broadside", 3]], soak: 11, health: 16, from: 1650, to: 1860, house: true},
  ironclad: {label: "Steam ironclad", speed: 4, maneuver: 1, crew: 300, arms: [["shellgun", 4]], soak: 16, health: 20, ram: true, from: 1860, to: 1905, house: true},
  torpedoBoat: {label: "Torpedo boat", speed: 7, maneuver: 3, crew: 25, arms: [["torpedo", 2], ["quickfirer", 1]], soak: 6, health: 6, from: 1880, to: 1918, house: true},
  destroyer: {label: "Destroyer", speed: 7, maneuver: 3, crew: 120, arms: [["quickfirer", 4], ["torpedo", 4]], soak: 10, health: 12, fire: true, from: 1900, to: 1960, house: true},
  dreadnought: {label: "Dreadnought battleship", speed: 5, maneuver: 0, crew: 900, arms: [["turret", 10], ["quickfirer", 6]], soak: 20, health: 36, fire: true, from: 1906, to: 1960, house: true},
  cruiser: {label: "Cruiser", speed: 6, maneuver: 1, crew: 500, arms: [["turret", 6], ["torpedo", 2]], soak: 15, health: 24, fire: true, from: 1905, to: 1990, house: true},
  patrolBoat: {label: "Motor torpedo or patrol boat", speed: 8, maneuver: 4, crew: 15, arms: [["torpedo", 2], ["quickfirer", 1]], soak: 4, health: 5, fire: true, from: 1915, to: 9999, house: true},
  missileFrigate: {label: "Missile frigate", speed: 6, maneuver: 2, crew: 180, arms: [["missile", 4], ["quickfirer", 1], ["torpedo", 2]], soak: 12, health: 18, fire: true, from: 1970, to: 9999, house: true},
  smallBoat: {label: "Fishing boat, launch or yacht", speed: 3, maneuver: 2, crew: 4, arms: [], soak: 3, health: 4, from: 1197, to: 9999, house: true},
  droneCorvette: {label: "Drone corvette", speed: 8, maneuver: 4, crew: 12, arms: [["missile", 4], ["railgun", 1]], soak: 14, health: 16, fire: true, from: 2030, to: 9999, branch: "future", house: true}
};

/** The ships of a year (and branch). */
export function shipsFor(year, branch = "classic") {
  const y = n(year) || 1197;
  return Object.entries(SHIPS).filter(([, s]) => y >= s.from && y <= s.to && (!s.branch || s.branch === branch)).map(([id, s]) => ({id, ...s}));
}
/** What one of a ship's arms is: a book engine (shot with Dexterity + Archery) or a gun (Heavy Weaponry). */
export function armOf(id) {
  if ( GUNS[id] ) return {id, gun: true, ...GUNS[id], diff: 0};
  const e = ENGINES[id];
  return e ? {id, gun: false, label: e.label, damage: e.damage, diff: e.diff, aggravated: !!e.aggravated, per: "engine"} : null;
}

/* ---- The stored fight ---- */

export function normShip(s = {}, fallback = "A ship") {
  const type = SHIPS[s.type] ? s.type : "smallCog", T = SHIPS[type];
  return {
    name: str(s.name) || fallback, type,
    damage: int(s.damage, 0, T.health, 0),
    seamanship: int(s.seamanship, 1, 15, 5),   // the captain's Intelligence + Seamanship
    helm: int(s.helm, 1, 15, 5),               // the captain's Wits + Seamanship
    gunners: int(s.gunners, 1, 15, 4),         // Dexterity + Archery for engines, Heavy Weaponry for guns
    crew: int(s.crew, 0, 5000, T.crew), soldiers: int(s.soldiers, 0, 5000, T.soldiers ?? 0),
    down: int(s.down, 0, 10000, 0),            // crew and soldiers out of the fight
    rowed: int(s.rowed, 0, 24, 0), push: int(s.push, 0, 3, 0), rowing: !!s.rowing && !!T.oars,
    repair: int(s.repair, 0, 100, 0), helpers: int(s.helpers, 0, 6, 0),
    sunk: !!s.sunk, struck: !!s.struck
  };
}
export function normFight(f = {}) {
  return {
    id: str(f.id, 40) || Math.random().toString(36).slice(2, 12),
    name: str(f.name) || "A fight at sea", place: str(f.place),
    year: Math.round(n(f.year)) || null, branch: f.branch === "future" ? "future" : "classic",
    ships: [normShip(f.ships?.[0], "The first ship"), normShip(f.ships?.[1], "The second ship")],
    gap: int(f.gap, 0, 50000, 2000),
    initiative: f.initiative === 0 || f.initiative === 1 ? f.initiative : null, edge: int(f.edge, 0, 20, 0),
    elapsed: Math.max(0, Math.round(n(f.elapsed))), timePassed: Math.max(0, Math.round(n(f.timePassed))),
    log: (Array.isArray(f.log) ? f.log : []).slice(-80).map(l => ({words: str(l?.words, 400), dice: str(l?.dice, 600)})),
    history: (Array.isArray(f.history) ? f.history : []).slice(-20),
    over: f.over ? {text: str(f.over.text, 300)} : null
  };
}
export const blankNaval = () => ({v: NAVAL_VERSION, list: []});
export const normNaval = s => ({v: NAVAL_VERSION, list: (Array.isArray(s?.list) ? s.list : []).filter(f => f && typeof f === "object").map(normFight).slice(-NAVAL_CAP)});

/* ---- What a ship can do now ---- */

/** Speed and Maneuverability after damage (each health level costs one of each), rowing as the oars allow. */
export function stateOf(ship) {
  const T = SHIPS[ship.type];
  const oarSpeed = T.oars ? T.oars + ship.push : 0;
  const base = ship.rowing && ship.rowed < 12 ? Math.max(oarSpeed, 0) : T.speed;
  const speed = base - ship.damage, maneuver = T.maneuver - ship.damage;
  return {speed, maneuver, health: T.health - ship.damage, flooding: speed < 0 && !ship.sunk, sinking: T.health - ship.damage <= 0};
}
const apply = (ship, levels) => {
  const T = SHIPS[ship.type], s = {...ship, damage: clamp(ship.damage + Math.max(0, levels), 0, T.health)};
  if ( s.damage >= T.health ) s.sunk = true;
  return s;
};
/** Keep a step's snapshot for Undo, add its log line, end the fight when a ship sinks or is lost. */
function step(fight, next, words, dice, secs = 0) {
  const f = {...next, history: [...fight.history, {...fight, history: [], log: []}].slice(-20), log: [...fight.log, {words, dice}].slice(-80),
    elapsed: fight.elapsed + secs};
  const sunk = f.ships.findIndex(s => s.sunk);
  if ( !f.over && sunk >= 0 ) f.over = {text: `${f.ships[sunk].name} goes down.`};
  return f;
}
/** Undo: the fight as it stood before the last step. */
export function undo(fight) {
  const prev = fight.history.at(-1);
  if ( !prev ) return fight;
  return normFight({...prev, history: fight.history.slice(0, -1), log: fight.log.slice(0, -1)});
}

/** Navigation (Spoils of War p. 42): Intelligence + Seamanship, 6 in sight of land, 9 with nothing to steer by. */
export function navigate(fight, i, {land = true, compass = false, pilot = false} = {}, draw) {
  const s = fight.ships[i], diff = clamp((land ? 6 : 9) - (compass ? 1 : 0) - (pilot ? 1 : 0), 3, 10);
  const r = roll(draw, s.seamanship, diff);
  const words = r.botch ? `${s.name} is badly off course.` : r.successes ? `${s.name} holds its course.` : `${s.name} has lost its bearings.`;
  return step(fight, fight, words, `${s.name}: navigation ${r.dice} dice at ${diff}, ${r.successes}${r.botch ? " (a botch)" : ""} [${r.faces.join(", ")}]`);
}

/**
 * A pursuit roll (Spoils of War p. 42): every 4 hours both captains roll Wits + Seamanship at 7 and add their Speed;
 * each point the chaser (`chaser`) beats the quarry by closes 500 yards. Rowing tires the oarsmen: 4 hours a watch,
 * 3 more for each point the oars are pushed, to 12 a day (p. 40).
 */
export function pursue(fight, chaser, draw) {
  const q = 1 - chaser;
  const ships = fight.ships.map(s => ({...s}));
  const rolls = ships.map(s => roll(draw, s.helm, 7));
  const totals = ships.map((s, k) => Math.max(0, stateOf(s).speed) + rolls[k].successes);
  for ( const s of ships ) if ( s.rowing ) s.rowed = Math.min(24, s.rowed + 4 + 3 * s.push);
  const closed = (totals[chaser] - totals[q]) * PURSUIT_YARDS;
  const gap = clamp(fight.gap - closed, 0, 50000);
  let words = closed > 0 ? `${ships[chaser].name} gains on ${ships[q].name}.` : closed < 0 ? `${ships[q].name} draws away.` : "Neither ship gains.";
  let over = fight.over;
  if ( gap === 0 ) words += ` ${ships[chaser].name} comes alongside.`;
  else if ( gap >= LOST_AT ) { words += ` ${ships[q].name} is lost from sight.`; over = {text: `${ships[q].name} gets away.`}; }
  const dice = ships.map((s, k) => `${s.name}: ${rolls[k].dice} dice at 7, ${rolls[k].successes} + Speed ${Math.max(0, stateOf(s).speed)} = ${totals[k]}`).join("; ") + `; the gap ${fight.gap} to ${gap} yards`;
  return step(fight, {...fight, ships, gap, over}, words, dice, WATCH);
}

/** The turn for position (Spoils of War p. 42): resisted Intelligence + Seamanship at 8 less Maneuverability. */
export function manoeuvre(fight, draw) {
  const diffs = fight.ships.map(s => clamp(8 - stateOf(s).maneuver, 3, 10));
  const rolls = fight.ships.map((s, k) => roll(draw, s.seamanship, diffs[k]));
  const net = rolls[0].successes - rolls[1].successes;
  const initiative = net > 0 ? 0 : net < 0 ? 1 : null;
  const words = initiative === null ? "Neither ship wins the wind." : `${fight.ships[initiative].name} wins the wind and the initiative (+${Math.abs(net)}).`;
  const dice = fight.ships.map((s, k) => `${s.name}: ${rolls[k].dice} dice at ${diffs[k]}, ${rolls[k].successes}`).join("; ");
  return step(fight, {...fight, initiative, edge: Math.abs(net)}, words, dice);
}

/**
 * Ship `i` shoots at the other with its arms. A book engine: Dexterity + Archery at 6 plus its step (Spoils of War
 * pp. 33, 43). A gun: Heavy Weaponry at 6, 7 or 8 by range, a roll per bank or barrel, 1 easier with central fire
 * direction (Wraith: The Great War p. 77). Torpedoes hit at 7, are dodged with the target's Wits + Seamanship at 8,
 * and roll damage at 4 (p. 78). Damage is the weapon's dice plus the extra successes, soaked by the ship at 6.
 * `range`: short, medium or long; `only`: one arm id.
 */
export function fire(fight, i, {range = "medium", only = null} = {}, draw) {
  const t = 1 - i, ships = fight.ships.map(s => ({...s}));
  const S = ships[i], T = SHIPS[ships[t].type], fireDir = SHIPS[S.type].fire ? 1 : 0;
  const rDiff = {short: 6, medium: 7, long: 8}[range] ?? 7;
  let levels = 0;
  const lines = [];
  for ( const [id, howMany] of SHIPS[S.type].arms ) {
    if ( only && id !== only ) continue;
    const A = armOf(id);
    if ( !A ) continue;
    let hit = 0, got = 0;
    for ( let k = 0; k < howMany; k++ ) {
      const diff = A.torpedo ? 7 : A.gun ? clamp(rDiff - fireDir, 3, 10) : clamp(6 + A.diff, 3, 10);
      const a = roll(draw, S.gunners, diff);
      let succ = a.successes;
      if ( A.torpedo && succ ) succ = Math.max(0, succ - roll(draw, ships[t].helm, 8).successes);
      if ( !succ ) continue;
      hit++;
      const dmg = roll(draw, A.damage + succ - 1, A.torpedo ? 4 : 6).successes;
      const soak = A.aggravated ? 0 : roll(draw, T.soak, 6).successes;
      got += Math.max(0, dmg - soak);
    }
    levels += got;
    lines.push(`${A.label} x${howMany}: ${hit} hit, ${got} level${got === 1 ? "" : "s"}`);
  }
  if ( !lines.length ) return step(fight, fight, `${S.name} has nothing to shoot with.`, "");
  ships[t] = apply(ships[t], levels);
  const st = stateOf(ships[t]);
  const words = levels ? `${S.name} strikes ${ships[t].name}${st.flooding ? ", and it starts to flood" : ""}.` : `${S.name}'s shots go wide or glance off.`;
  return step(fight, {...fight, ships}, words, `${S.name}: ${lines.join("; ")}; ${ships[t].name} has ${Math.max(0, st.health)} health levels left, Speed ${st.speed}, Maneuverability ${st.maneuver}`);
}

/**
 * Ramming (Wraith: The Great War p. 79), from 0 yards: opposed Wits + Seamanship at 6; the winner rams. The ship
 * struck takes 3 dice a net success, 5 from a ship built to ram; the rammer takes 3, or 1 when built for it (a
 * house rule). Damage is rolled at 5 and soaked at 6.
 */
export function ram(fight, i, draw) {
  if ( fight.gap > 0 ) return step(fight, fight, "The ships are too far apart to ram.", `the gap is ${fight.gap} yards`);
  const ships = fight.ships.map(s => ({...s}));
  const rolls = ships.map(s => roll(draw, s.helm, 6));
  const net = rolls[i].successes - rolls[1 - i].successes;
  const dice0 = ships.map((s, k) => `${s.name}: ${rolls[k].dice} dice at 6, ${rolls[k].successes}`).join("; ");
  if ( net <= 0 ) return step(fight, fight, `${ships[1 - i].name} turns aside from the blow.`, dice0);
  const hurt = (victim, d) => Math.max(0, roll(draw, d, 5).successes - roll(draw, SHIPS[ships[victim].type].soak, 6).successes);
  const rammer = SHIPS[ships[i].type].ram;
  const toT = hurt(1 - i, net * (rammer ? 5 : 3)), toR = hurt(i, net * (rammer ? 1 : 3));
  ships[1 - i] = apply(ships[1 - i], toT);
  ships[i] = apply(ships[i], toR);
  return step(fight, {...fight, ships}, `${ships[i].name} rams ${ships[1 - i].name}.`, `${dice0}; net ${net}: ${toT} levels to ${ships[1 - i].name}, ${toR} to ${ships[i].name}`);
}

/** Staying alongside or breaking away (Wraith: The Great War p. 80): the first to 5 successes, Wits + Seamanship at 6. */
export function breakAway(fight, i, draw) {
  if ( fight.gap > 0 ) return step(fight, fight, "The ships are not alongside.", "");
  const got = [0, 0];
  let rounds = 0;
  while ( got[0] < 5 && got[1] < 5 && rounds < 30 ) { rounds++; for ( const k of [0, 1] ) got[k] += roll(draw, fight.ships[k].helm, 6).successes; }
  const wins = got[i] >= 5 && got[i] >= got[1 - i];
  const words = wins ? `${fight.ships[i].name} breaks away.` : `${fight.ships[1 - i].name} holds it alongside.`;
  return step(fight, {...fight, gap: wins ? 200 : 0}, words, `${rounds} rounds: ${got[0]} to ${got[1]}`, rounds * 3);
}

/** Close the range by hand (the Storyteller's call, or after a manoeuvre): the gap in yards. */
export const setGap = (fight, yards) => step(fight, {...fight, gap: int(yards, 0, 50000, fight.gap)}, yards <= 0 ? "The ships come alongside." : `The ships are ${yards} yards apart.`, "");

/**
 * A quarter of an hour passes (Spoils of War p. 43): a ship below 0 Speed floods a level; a crew at the pumps and
 * the carpenters roll to repair, an extended roll needing successes equal to the damage, one level fixed when they
 * reach it, with up to 6 helping (each a die, a house rule).
 */
export function quarter(fight, draw, {repair = [false, false], pool = [3, 3], helpers = null} = {}) {
  const ships = fight.ships.map(s => ({...s}));
  const lines = [], words = [];
  ships.forEach((s, k) => {
    if ( s.sunk ) return;
    if ( stateOf(s).flooding ) { ships[k] = apply(s, 1); words.push(`${s.name} takes on water.`); lines.push(`${s.name}: floods a level`); }
    if ( repair[k] && ships[k].damage > 0 && !ships[k].sunk ) {
      const help = int(helpers?.[k] ?? ships[k].helpers, 0, 6, 0);
      ships[k].helpers = help;
      const r = roll(draw, int(pool[k], 1, 15, 3) + help, 6);
      const got = r.botch ? 0 : ships[k].repair + r.successes;
      if ( got >= ships[k].damage ) { ships[k] = {...ships[k], damage: ships[k].damage - 1, repair: 0}; words.push(`The crew of ${s.name} patch it up.`); }
      else ships[k] = {...ships[k], repair: got};
      lines.push(`${s.name}: repair ${r.dice} dice at 6, ${r.successes}${r.botch ? " (a botch, the work is lost)" : ""}; ${ships[k].repair} of ${ships[k].damage || 0}`);
    }
  });
  return step(fight, {...fight, ships}, words.join(" ") || "A quarter of an hour passes.", lines.join("; "), QUARTER);
}

/**
 * Boarding is fought with the usual combat; the Storyteller enters who is down. The defenders yield once half of
 * them are out of the fight and they are outnumbered two to one (Spoils of War pp. 42-43).
 */
export function yields(fight, defender) {
  const d = fight.ships[defender], a = fight.ships[1 - defender];
  const dAll = d.crew + d.soldiers, dUp = Math.max(0, dAll - d.down), aUp = Math.max(0, a.crew + a.soldiers - a.down);
  return dAll > 0 && dUp * 2 <= dAll && aUp >= dUp * 2;
}
export function boarding(fight, down = [0, 0]) {
  const ships = fight.ships.map((s, k) => ({...s, down: int(s.down + n(down[k]), 0, s.crew + s.soldiers, s.down)}));
  let f = {...fight, ships}, words = "The fighting goes on across the decks.";
  for ( const k of [0, 1] ) if ( yields(f, k) ) { f = {...f, ships: f.ships.map((s, j) => (j === k ? {...s, struck: true} : s)), over: {text: `${ships[k].name} strikes its colours.`}}; words = f.over.text; }
  return step(fight, f, words, ships.map(s => `${s.name}: ${Math.max(0, s.crew + s.soldiers - s.down)} of ${s.crew + s.soldiers} still fighting`).join("; "), 3 * 60);
}

/** Words for the time a fight at sea has taken. */
export function timeWords(seconds) {
  const h = Math.floor(seconds / 3600), m = Math.round((seconds % 3600) / 60);
  return [h ? `${h} hour${h === 1 ? "" : "s"}` : "", m ? `${m} minute${m === 1 ? "" : "s"}` : ""].filter(Boolean).join(" and ") || "no time";
}
