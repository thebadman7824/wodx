/**
 * WoDX Interactables: the rules for doors, locks, windows and walls that can be broken through. Pure functions, no
 * Foundry calls, so the harness can test every pool, grade, noise and outcome.
 *
 * The rolls are the dramatic systems WoDX Actions already uses (V20 Dark Ages pp. 322-339: intrusion, forcing a door,
 * the lifting chart, noticing). V20 core (printed pages; pdf page = printed + 8): opening and closing with the Strength
 * Feats chart p. 261, intrusion p. 260, spotting alarms p. 255, retrying p. 251, climbing p. 258, falling p. 296.
 * Lock grades, the successes each needs, the time per roll and how far noise carries are house readings of those
 * systems; docs/DECISIONS.md records them.
 */
import {FIRE_HEAT as ACTIONS_FIRE_HEAT} from "../../wodx-actions/scripts/rules.js";
import {holy as demonHoly} from "../../wodx-actions/scripts/demon-rules.js";

export const TURN = 3; // seconds in a turn (V20 Dark Ages printed p. 324)
export const MINUTE = 60;

export const KINDS = {door: "Door", gate: "Gate", window: "Window", shutter: "Shutter", hatch: "Hatch"};

/** What a door or window is made of, and the strength of build that follows from it unless one is set. */
export const MATERIALS = {
  wood: {label: "Wood", build: "interior"},
  heavy: {label: "Heavy timber", build: "sturdy"},
  ironbound: {label: "Iron-bound", build: "reinforced"},
  steel: {label: "Iron or steel", build: "vault"},
  glass: {label: "Glass", build: "pane"},
  horn: {label: "Horn, oiled cloth or paper", build: "pane"}
};

/**
 * How hard a door is to force. feat: the level on the lifting chart that breaks it with no roll (V20 Dark Ages p. 335:
 * 3 breaks down a wooden door, 10 rips open a reinforced door, 11 punches through a heavily reinforced one).
 * need and diff: the extended Strength roll for a character short of the feat (V20 Dark Ages pp. 332-339: an interior
 * door needs 1 success, a reinforced door 5, a vault 10 or more; difficulty 6 to 8 by material).
 */
export const BUILDS = {
  pane: {label: "A pane (glass, horn, cloth)", feat: 1, need: 1, diff: 4},
  interior: {label: "Interior door", feat: 3, need: 1, diff: 6},
  sturdy: {label: "Sturdy outer door", feat: 5, need: 3, diff: 7},
  reinforced: {label: "Reinforced door", feat: 10, need: 5, diff: 8},
  vault: {label: "Vault or strongroom", feat: 11, need: 10, diff: 8}
};

/** Four named lock grades. diff: V20 Dark Ages intrusion, 5 for a common lock up to 9 for the best in the land. */
export const LOCKS = {
  none: {label: "No lock"},
  cheap: {label: "Cheap", diff: 5, need: 2, seconds: TURN},
  good: {label: "Good", diff: 6, need: 3, seconds: TURN},
  excellent: {label: "Excellent", diff: 8, need: 5, seconds: MINUTE},
  masterwork: {label: "Masterwork", diff: 9, need: 8, seconds: 5 * MINUTE}
};
/** The same four grades for a keypad, card reader or alarm (modern eras only). */
export const ELECTRONIC = {
  none: {label: "None"},
  cheap: {label: "Cheap", diff: 6, need: 2, seconds: TURN},
  good: {label: "Good", diff: 7, need: 3, seconds: MINUTE},
  excellent: {label: "Excellent", diff: 8, need: 5, seconds: MINUTE},
  masterwork: {label: "Masterwork", diff: 9, need: 8, seconds: 5 * MINUTE}
};
/** Picking a lock with no picks or tools: harder (most attempts need tools, V20 Dark Ages p. 333). */
export const NO_TOOLS_DIFF = 2;

/** A wall the Storyteller has marked as one that can be broken through. */
export const WALLS = {
  wattle: {label: "Wattle, lath or plaster", feat: 4, need: 3, diff: 6},
  timber: {label: "Timber or brick", feat: 7, need: 6, diff: 7},
  stone: {label: "Stone", feat: 9, need: 10, diff: 8}
};

/** Containers on tiles: what each is, and what it is made of unless the Storyteller says otherwise. */
export const CONTAINERS = {
  chest: {label: "Chest", material: "wood"},
  box: {label: "Box or casket", material: "wood"},
  cabinet: {label: "Cabinet or wardrobe", material: "wood"},
  drawers: {label: "Desk or filing drawers", material: "wood"},
  strongbox: {label: "Strongbox", material: "ironbound"},
  safe: {label: "Safe", material: "steel"}
};
/** At most this many things in one container. */
export const MAX_ITEMS = 50;

/**
 * Traps on tiles. dice and type: the damage when it springs, unless the Storyteller sets others (a pit is a fall; spikes
 * make it lethal). reflex: whether the victim gets a Dexterity roll to get clear. holds: a snare catches and holds.
 * Finding, disarming and the reflex roll are house readings of the noticing and intrusion systems (V20 Dark Ages
 * pp. 322-339); a pit's 2 dice are a house figure under the core falling rule (one die of bashing per 10 feet, soakable:
 * V20 core printed p. 296, pdf p. 304).
 */
export const TRAPS = {
  snare: {label: "Snare", dice: 0, type: "bashing", reflex: true, holds: true, noise: "quiet"},
  pit: {label: "Pit", dice: 2, type: "bashing", reflex: true, noise: "quiet"},
  tripwire: {label: "Tripwire", dice: 0, type: "bashing", reflex: false, noise: "loud"},
  blade: {label: "Spring blade", dice: 5, type: "lethal", reflex: true, noise: "quiet"}
};
/** Four named trap grades. hide: the search successes it takes to find it; diff: to disarm it, and to get clear of it. */
export const TRAP_GRADES = {
  crude: {label: "Crude", hide: 1, diff: 5, seconds: TURN},
  good: {label: "Good", hide: 2, diff: 6, seconds: TURN},
  excellent: {label: "Excellent", hide: 3, diff: 7, seconds: MINUTE},
  masterwork: {label: "Masterwork", hide: 4, diff: 8, seconds: MINUTE}
};
/**
 * Clues on tiles: letters, ledgers, bloodstains, writing on walls, tracks. The Storyteller writes what each shows:
 * one text anyone gets on a look, and up to three more for 1, 2 and 3 or more successes on examining it.
 * Examining: Perception + Investigation (a document: Intelligence + Investigation), difficulty 6.
 */
export const CLUES = {
  document: {label: "Letter, ledger or document", attr: "intelligence", verb: "Read"},
  mark: {label: "Bloodstain or mark", attr: "perception", verb: "Examine"},
  writing: {label: "Writing or graffiti", attr: "intelligence", verb: "Read"},
  trail: {label: "Tracks or a trail", attr: "perception", verb: "Study"},
  object: {label: "Something out of place", attr: "perception", verb: "Examine"}
};
export const CLUE_TIERS = 3;

/**
 * Light sources on tiles, each tied to one or more of the scene's own lights. Lighting or putting one out takes a
 * turn and no roll; a lantern, lamp or electric light can be broken (loud, and it stays dark).
 */
export const LIGHTS = {
  torch: {label: "Torch or brazier", on: "Light it", off: "Put it out", breaks: false},
  candle: {label: "Candles", on: "Light them", off: "Put them out", breaks: false},
  lantern: {label: "Lantern", on: "Light it", off: "Put it out", breaks: true},
  lamp: {label: "Oil or gas lamp", on: "Light it", off: "Turn it down", breaks: true},
  switch: {label: "Electric light switch", on: "Switch it on", off: "Switch it off", breaks: true}
};
/**
 * Hiding places on tiles. need: the search successes it takes to find someone hidden there, before their own Stealth;
 * room: how many fit unless the Storyteller says otherwise. Hiding is Dexterity + Stealth, difficulty 6 (the Stealth
 * contest, Dexterity + Stealth against Perception + Alertness at 6, V20 core printed p. 262 (pdf 270), read as a roll now and a search later: a house rule); every two successes add one to the
 * successes a searcher needs.
 */
export const HIDES = {
  wardrobe: {label: "Wardrobe or cupboard", need: 1, room: 1},
  bed: {label: "Under a bed or table", need: 1, room: 1},
  curtain: {label: "Behind a curtain or tapestry", need: 1, room: 2},
  shadows: {label: "Deep shadows or a dark corner", need: 2, room: 3},
  crawl: {label: "Crawlspace or loft", need: 2, room: 2},
  priesthole: {label: "Priest hole or hidden room", need: 3, room: 4}
};
/**
 * Fire and other hazards on tiles. A live hazard hurts whoever walks into it, and (in combat) whoever starts a turn in it.
 * Fire follows the fire rules WoDX Actions uses (V20 Dark Ages pp. 355-360): its size sets the health levels it does each
 * turn, its heat the soak difficulty; it is lethal to mortals and ghouls and aggravated to everyone else, and a vampire
 * soaks it only with Fortitude. A brazier,
 * lamp or candle stand is harmless until knocked over, and then burns where it falls. Electricity follows the core
 * electrocution rules: lethal each turn in contact, by the strength of the current; a vampire soaks it, and a botched soak makes it aggravated (V20 core printed p. 295, pdf 303). Broken glass, caltrops and thorns are a house rule: dice of lethal damage,
 * less a die for each success on stepping carefully.
 */
export const HAZARDS = {
  fire: {label: "Fire", hurtsInTurn: true},
  brazier: {label: "Brazier, lamp or candle stand", hurtsInTurn: true},
  sharp: {label: "Broken glass, caltrops or thorns", hurtsInTurn: false},
  shock: {label: "Live wire or electrified metal", hurtsInTurn: true}
};
export const FIRE_SIZES = {
  small: {label: "Torch-sized: part of the body", levels: 1},
  large: {label: "Bonfire: half the body", levels: 2},
  inferno: {label: "Inferno: the whole body", levels: 3}
};
/** The heat of a fire and its soak difficulty: the same table as WoDX Actions' fire check. */
export const FIRE_HEAT = Object.fromEntries(Object.entries(ACTIONS_FIRE_HEAT).map(([k, v]) => [k, {label: v.label, diff: v.diff}]));
export const SHOCKS = {
  minor: {label: "Wall socket", levels: 2},
  major: {label: "Fuse box", levels: 4},
  severe: {label: "Industrial line", levels: 6},
  fatal: {label: "Main line or third rail", levels: 8}
};
/**
 * Altars, relics and fetishes on tiles. An altar or shrine is holy ground with a rating (1 to 5): praying there uses
 * WoDX Actions' prayer, and a demon who walks onto it is seared as WoDX Actions' "The holy" reads Demon: The Fallen
 * (pp. 254-255), until it is desecrated. A relic or a fetish rests on its tile until someone takes it; a fetish is then
 * attuned and used from the WoDX actions menu (W20 p. 221; DA:W p. 92). A caern stone, a wraith's fetter or a node is
 * marked with its rating, and using it opens the WoDX actions menu, where that line's own rolls live.
 */
export const SACRED = {
  altar: {label: "Church altar or chapel", ground: true, carry: false},
  shrine: {label: "Wayside shrine or holy well", ground: true, carry: false},
  relic: {label: "Holy relic", ground: false, carry: true},
  fetish: {label: "Fetish or talen in its resting place", ground: false, carry: true},
  caern: {label: "Caern stone", ground: false, carry: false, use: "menu", note: r => `A caern of level ${r}: the Gauntlet is low here. Step sideways, meditate or hold a rite from the WoDX actions menu.`},
  fetter: {label: "A wraith's fetter", ground: false, carry: false, use: "fetter", note: r => `A fetter of rating ${r}. A wraith tied to it works it from the WoDX Fetter window.`},
  node: {label: "Node", ground: false, carry: false, use: "menu", note: r => `A node of rating ${r}: Quintessence can be drawn here from the WoDX actions menu.`}
};
/**
 * Watch points on tiles. A window on the street or a mirror shows who is in the area it is tied to (another tile):
 * Perception + Alertness, difficulty 6; any success names them, none gives only a count, a botch shows nothing. A mirror
 * holds no Lasombra (their clan weakness, V20 core printed p. 59, pdf 67; the Cast No Reflection Flaw, printed p. 494, pdf 502). A telephone or a radio,
 * in its era, calls the phone it is tied to or calls for help; a bell, horn or alarm raises the alarm, loud.
 */
export const WATCHES = {
  window: {label: "Window on the street", verb: "Look out", sees: true},
  mirror: {label: "Mirror", verb: "Look in it", sees: true, mirror: true},
  phone: {label: "Telephone", calls: true, from: 1890},
  radio: {label: "Radio or walkie-talkie", calls: true, from: 1930},
  bell: {label: "Bell, horn or alarm", alarm: true}
};
/**
 * Mounts and vehicles on tiles. Getting on and riding or driving at an ordinary pace needs no roll with a dot in the
 * skill (V20 p. 258 for driving); with none, the Attribute alone at +1 difficulty, as for any untrained Skill (WoDX
 * Actions' pool adds it when the card is rolled; V20 core printed p. 257, pdf 265; a Talent has no penalty). Keeping control is Dexterity + the skill at 6; flat out is +3, as the riding and driving presets in
 * WoDX Actions have it. A botch throws a rider or crashes a vehicle: the Storyteller rolls the damage.
 * skill: the Ability; attr: the Attribute for keeping control; seats: with the one at the reins; from: the year it
 * appears (the Chronicle year); thrown: a botch puts the one at the reins on the ground.
 */
export const MOUNTS = {
  horse: {label: "Riding horse", verb: "Mount it", reins: "in the saddle", skill: "ride", attr: "dexterity", seats: 2, thrown: true, noise: "quiet"},
  mule: {label: "Mule or donkey", verb: "Mount it", reins: "in the saddle", skill: "ride", attr: "dexterity", seats: 1, thrown: true, noise: "quiet"},
  cart: {label: "Cart or wagon", verb: "Take the reins", reins: "at the reins", skill: "ride", attr: "dexterity", seats: 4, noise: "quiet"},
  carriage: {label: "Carriage or coach", verb: "Take the reins", reins: "at the reins", skill: "ride", attr: "dexterity", seats: 6, noise: "quiet"},
  boat: {label: "Rowing boat", verb: "Take the oars", reins: "at the oars", skill: "athletics", attr: "stamina", seats: 4, noise: "quiet"},
  car: {label: "Motor car", verb: "Drive it", reins: "at the wheel", skill: "drive", attr: "dexterity", seats: 5, from: 1900, noise: "loud"},
  motorbike: {label: "Motorcycle", verb: "Ride it", reins: "on it", skill: "drive", attr: "dexterity", seats: 2, from: 1910, thrown: true, noise: "loud"},
  motorboat: {label: "Motorboat", verb: "Take the helm", reins: "at the helm", skill: "drive", attr: "dexterity", seats: 6, from: 1910, noise: "loud"}
};
export const FLAT_OUT = 3;

/**
 * Climbing and jumping on tiles. Climbing is Dexterity + Athletics at 6, extended: each success climbs 5 yards of an
 * easy climb (a rope, a tree), 3 of an average one (a rough wall, rocks), 2 of a hard one (a cliff); a ladder or stairs
 * need no roll. A botch slips and falls from as high as the climber got (V20 Dark Ages p. 332; V20 core printed p. 258).
 * Jumping a gap is Strength + Athletics at 3 with a run-up, a yard across a success; short of it, Dexterity +
 * Athletics at 6 catches the ledge (V20 Dark Ages p. 333). Falling is one die of bashing a 10 feet, soakable, at
 * least one die (V20 core printed p. 296). per: yards a success; jump: a gap rather than a climb.
 */
export const CLIMBS = {
  ladder: {label: "Ladder or stairs", per: 0},
  rope: {label: "Rope or knotted sheets", per: 5},
  tree: {label: "Tree, trellis or drainpipe", per: 5},
  wall: {label: "Rough wall or rocks", per: 3},
  cliff: {label: "Cliff or sheer wall", per: 2},
  gap: {label: "Gap or ledge to jump", jump: true}
};
/** Bashing dice for a fall: one a 10 feet, at least one. */
export const fallDice = feet => Math.max(1, Math.floor((Math.max(0, Number(feet) || 0)) / 10));

/**
 * Targets on tiles. Shooting is the weapon's own Attribute and Ability (Dexterity + Firearms, or Archery before guns) at
 * the weapon's difficulty, with WoDX Combat's range bands: within the weapon's range +0, up to twice +1, up to three
 * times +2, and no further (VtDA20 p. 347). Aiming adds a die a turn, up to Perception, through Bonus dice: one shot,
 * Firearms 1 or more, a scope +2 on the first turn, not at a target moving faster than a walk (V20 core printed p. 277, pdf 285). Throwing something with no thrown weapon on the sheet is Dexterity + Athletics at 6 with a range of
 * THROW_YARDS (house rule). Striking a dummy is Dexterity + Melee with a hand weapon on the sheet, or Brawl, at 6.
 * A target with rings scores by successes (house rule): 1 the outer ring, 2 the inner ring, 3 or more the centre.
 * Something to break: a fragile thing breaks on any hit; anything else breaks the way a door does, by the lifting chart
 * or an extended Strength roll (V20 Dark Ages p. 335). shoot, throw, strike: what can be done to it.
 */
export const TARGETS = {
  mark: {label: "Target with rings", rings: true},
  bottles: {label: "Bottles or cans in a row", row: true},
  dummy: {label: "Practice dummy, pell or quintain", strike: true},
  object: {label: "Something to break", strike: true, breaks: true}
};
/** How hard something is to break: the lifting chart level that breaks it outright, and the extended roll short of it. */
export const OBJECT_BUILDS = {
  fragile: {label: "Fragile: glass, pottery, a lamp", feat: 1, need: 1, diff: 4, fragile: true},
  light: {label: "Light wood: a crate, a chair", feat: 2, need: 1, diff: 6},
  heavy: {label: "Heavy wood: a barrel, a cart wheel", feat: 4, need: 3, diff: 7},
  stone: {label: "Stone: a statue, a gravestone", feat: 6, need: 5, diff: 8},
  iron: {label: "Iron: a grille, a stove", feat: 10, need: 8, diff: 8}
};
export const THROW_YARDS = 10;
/** The ring a shot hits on a target with rings, by successes, and its points. */
export const RINGS = [null, {label: "outer ring", pts: 1}, {label: "inner ring", pts: 2}, {label: "centre", pts: 3}];
export const ringFor = successes => (successes <= 0 ? null : RINGS[Math.min(3, successes)]);
/** The range band for a distance and a weapon's range, in yards: 0, 1 or 2 more difficulty, or null when out of range. */
export function rangeBand(yards, range) {
  const y = Math.max(0, Number(yards) || 0), r = Math.max(1, Number(range) || 0);
  return y <= r ? 0 : y <= r * 2 ? 1 : y <= r * 3 ? 2 : null;
}

export const DAMAGE_TYPES = {bashing: "Bashing", lethal: "Lethal", aggravated: "Aggravated"};

export const NOISES = {silent: "Silent", quiet: "Quiet", loud: "Loud"};
/** How far a sound carries, in yards: in the open, and through one wall that stops sound. */
export const EARSHOT = {silent: {open: 0, wall: 0}, quiet: {open: 5, wall: 0}, loud: {open: 30, wall: 10}};

/** Eras with keypads, card readers and alarms. */
const MODERN_ERAS = new Set(["modern", "time-of-judgment", "future-darkness"]);
export function isModern({eraId = "", year = 0} = {}) { return MODERN_ERAS.has(eraId) || year >= 1970; }
const DARK_AGE_ERAS = new Set(["dark-ages", "long-night", "classical", "living-gods"]);
export function isDarkAge({eraId = "", year = 0} = {}) { return DARK_AGE_ERAS.has(eraId) || (year > 0 && year < 1450); }

/**
 * The Ability a character picks a lock with. The name differs by line and era: Larceny (V20, W20, C20), Legerdemain
 * (the Dark Ages lines), Security (the hunters). The best rated of the candidates wins; on a tie, the first.
 * abilities: {key: dots}; only keys the sheet has are listed. Returns {key, value}.
 */
export function lockSkill(abilities = {}, {kind = "mortal", eraId = "", year = 0} = {}) {
  const order = isDarkAge({eraId, year}) ? ["legerdemain", "larceny", "security"]
    : kind === "hunter" ? ["security", "larceny", "legerdemain"] : ["larceny", "security", "legerdemain"];
  return bestOf(abilities, order);
}
/** The Ability for an electronic lock or alarm: Security, Technology or Computer, whichever is best. */
export function electronicSkill(abilities = {}) { return bestOf(abilities, ["security", "technology", "computer", "larceny"]); }
function bestOf(abilities, order) {
  let best = null;
  for ( const key of order ) {
    if ( !(key in abilities) ) continue;
    const value = Number(abilities[key]) || 0;
    if ( !best || value > best.value ) best = {key, value};
  }
  return best ?? {key: order[0], value: 0};
}

/* ------------------------------------------------------------------ */
/*  Geometry                                                           */
/* ------------------------------------------------------------------ */

/** Which side of a wall [x0, y0, x1, y1] a point is on: "a" or "b" (or null on the line). */
export function sideOf(c, p) {
  const cross = (c[2] - c[0]) * (p.y - c[1]) - (c[3] - c[1]) * (p.x - c[0]);
  return cross > 0 ? "a" : cross < 0 ? "b" : null;
}
/** A compass word for a side of a wall, with north at the top of the map. */
export function sideLabel(c, side) {
  const dx = c[2] - c[0], dy = c[3] - c[1];
  // The normal toward side "a" (screen y grows downward)
  let nx = -dy, ny = dx;
  if ( side === "b" ) { nx = -nx; ny = -ny; }
  if ( Math.abs(nx) >= Math.abs(ny) ) return nx > 0 ? "east" : "west";
  return ny > 0 ? "south" : "north";
}
/** Distance from a point to a wall segment, in the same units as the coordinates. */
export function distanceToWall(c, p) {
  const [x0, y0, x1, y1] = c, dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - x0) * dx + (p.y - y0) * dy) / len2)) : 0;
  return Math.hypot(p.x - (x0 + t * dx), p.y - (y0 + t * dy));
}
/** A point just off a wall's midpoint, on the given side. */
export function besideWall(c, side, by = 4) {
  const mx = (c[0] + c[2]) / 2, my = (c[1] + c[3]) / 2, dx = c[2] - c[0], dy = c[3] - c[1];
  const len = Math.hypot(dx, dy) || 1;
  const s = side === "b" ? -1 : 1;
  return {x: mx + s * (-dy / len) * by, y: my + s * (dx / len) * by};
}

/* ------------------------------------------------------------------ */
/*  The object, read from a wall                                       */
/* ------------------------------------------------------------------ */

/**
 * Fill in what a wall's WoDX settings leave out, so a plain door needs no setup.
 * w: {door: bool, secret: bool, ds: "open"|"closed"|"locked", flags: {...}}
 */
export function describe(w) {
  const f = w.flags ?? {};
  const kind = KINDS[f.kind] ? f.kind : "door";
  const glassy = kind === "window";
  const material = MATERIALS[f.material] ? f.material : glassy ? "glass" : "wood";
  const build = BUILDS[f.build] ? f.build : MATERIALS[material].build;
  // A locked door with no grade set has a good lock; an unlocked one with none set has none
  const lock = LOCKS[f.lock] ? f.lock : w.ds === "locked" ? "good" : "none";
  return {
    door: !!w.door, secret: !!w.secret, found: !!f.found, ds: w.ds, kind, material, build, lock,
    electronic: ELECTRONIC[f.electronic] ? f.electronic : "none",
    barSide: f.barSide === "a" || f.barSide === "b" ? f.barSide : null, barred: !!f.barred,
    stuck: !!f.stuck, broken: !!f.broken, jammed: !!f.jammed, alarm: !!f.alarm, beaten: !!f.beaten, keyName: String(f.keyName ?? "").trim(),
    breakable: WALLS[f.wall] ? f.wall : null, breached: !!f.breached,
    progress: {pick: 0, force: 0, hack: 0, ...(f.progress ?? {})}, tries: f.tries ?? {}
  };
}
/**
 * A container on a tile, read from its WoDX settings. f: the tile's flags.wodx-interactables, with container: true.
 * Its state lives in f.ds ("open", "closed", "locked"); a container with a lock set and no state is locked.
 */
export function describeContainer(f = {}) {
  const kind = CONTAINERS[f.kind] ? f.kind : "chest";
  const material = MATERIALS[f.material] && !["glass", "horn"].includes(f.material) ? f.material : CONTAINERS[kind].material;
  const build = BUILDS[f.build] && f.build !== "pane" ? f.build : MATERIALS[material].build;
  const lock = LOCKS[f.lock] ? f.lock : "none";
  const ds = ["open", "closed", "locked"].includes(f.ds) ? f.ds : lock !== "none" ? "locked" : "closed";
  const items = parseItems(f.items);
  return {
    container: true, door: false, secret: false, found: true, ds, kind, material, build, lock,
    electronic: ELECTRONIC[f.electronic] ? f.electronic : "none",
    barSide: null, barred: false, stuck: false, broken: false, jammed: !!f.jammed, alarm: !!f.alarm, beaten: !!f.beaten,
    keyName: String(f.keyName ?? "").trim(), breakable: null, breached: false,
    items, taken: !!f.taken,
    progress: {pick: 0, force: 0, hack: 0, ...(f.progress ?? {})}, tries: f.tries ?? {}
  };
}
/**
 * A trap on a tile, read from its WoDX settings. f: the tile's flags.wodx-interactables, with trap: true.
 * armed: it springs when someone walks into it (default true); sprung: it has gone off; holding: the actor id a snare holds.
 */
export function describeTrap(f = {}) {
  const kind = TRAPS[f.trapKind] ? f.trapKind : "snare";
  const T = TRAPS[kind];
  const grade = TRAP_GRADES[f.grade] ? f.grade : "good";
  const dice = f.dice === null || f.dice === undefined || f.dice === "" ? T.dice : Math.max(0, Math.min(20, Math.round(Number(f.dice) || 0)));
  return {
    trap: true, container: false, door: false, secret: false, ds: "closed", kind, grade, dice,
    type: DAMAGE_TYPES[f.damageType] ? f.damageType : T.type,
    found: !!f.found, armed: f.armed !== false && !f.sprung, sprung: !!f.sprung, holding: String(f.holding ?? ""), npcs: !!f.npcs,
    electronic: "none", lock: "none", items: [], progress: {}, tries: f.tries ?? {}
  };
}
/**
 * A clue on a tile. f: the tile's flags.wodx-interactables, with clue: true. texts[0]: what anyone sees; texts[k]:
 * what k successes add. need: the search successes it takes to notice a hidden one. seen: {actorId: best successes}.
 */
export function describeClue(f = {}) {
  const kind = CLUES[f.clueKind] ? f.clueKind : "document";
  const texts = [f.text0, f.text1, f.text2, f.text3].map(t => String(t ?? "").trim().slice(0, 4000));
  return {
    clue: true, trap: false, container: false, door: false, secret: false, ds: "closed", kind, texts,
    title: String(f.title ?? "").trim().slice(0, 80), need: Math.max(1, Math.min(5, Math.round(Number(f.need) || 1))),
    found: !!f.found, seen: f.seen && typeof f.seen === "object" ? f.seen : {},
    electronic: "none", lock: "none", items: [], progress: {}, tries: f.tries ?? {}
  };
}
/**
 * A light source on a tile. f: the tile's flags.wodx-interactables, with light: true. on: whether its lights are lit now
 * (read from the scene's lights by the runtime); count: how many lights it is tied to.
 */
export function describeLight(f = {}, {on = false, count = 0} = {}) {
  const kind = LIGHTS[f.lightKind] ? f.lightKind : "torch";
  return {
    light: true, clue: false, trap: false, container: false, door: false, secret: false, ds: "closed", kind,
    title: String(f.title ?? "").trim().slice(0, 80), on: !!on && !f.broken, count: Number(count) || 0, broken: !!f.broken,
    electronic: "none", lock: "none", items: [], progress: {}, tries: {}
  };
}
/**
 * A hiding place on a tile. f: the tile's flags.wodx-interactables, with hide: true.
 * occupants: [{a: actorId, t: token uuid, n: name, s: hiding successes}].
 */
export function describeHide(f = {}) {
  const kind = HIDES[f.hideKind] ? f.hideKind : "wardrobe";
  const room = Math.max(1, Math.min(12, Math.round(Number(f.room) || HIDES[kind].room)));
  const occupants = (Array.isArray(f.occupants) ? f.occupants : []).filter(x => x && x.a).slice(0, 12);
  return {
    hide: true, light: false, clue: false, trap: false, container: false, door: false, secret: false, ds: "closed", kind, room, occupants,
    title: String(f.title ?? "").trim().slice(0, 80), electronic: "none", lock: "none", items: [], progress: {}, tries: f.tries ?? {}
  };
}
/**
 * A hazard on a tile. f: the tile's flags.wodx-interactables, with hazard: true.
 * live: it hurts now (a fire burning, a brazier knocked over and burning, glass not cleared, power on).
 */
export function describeHazard(f = {}) {
  const kind = HAZARDS[f.hazardKind] ? f.hazardKind : "fire";
  const size = FIRE_SIZES[f.size] ? f.size : "small", heat = FIRE_HEAT[f.heat] ? f.heat : "torch", shock = SHOCKS[f.shock] ? f.shock : "minor";
  const dice = f.hazDice === null || f.hazDice === undefined || f.hazDice === "" ? 2 : Math.max(0, Math.min(20, Math.round(Number(f.hazDice) || 0)));
  const spilled = kind === "brazier" ? !!f.spilled : false;
  const burning = kind === "fire" ? f.burning !== false : kind === "brazier" ? spilled && f.burning !== false : false;
  const live = kind === "sharp" ? !f.cleared : kind === "shock" ? f.live !== false : burning;
  return {
    hazard: true, hide: false, light: false, clue: false, trap: false, container: false, door: false, secret: false, ds: "closed",
    kind, size, heat, shock, dice, spilled, burning, live, cleared: !!f.cleared, pcsOnly: !!f.pcsOnly,
    caught: kind === "shock" && f.caught && typeof f.caught === "object" && !Array.isArray(f.caught) ? f.caught : {},
    type: DAMAGE_TYPES[f.hazType] ? f.hazType : kind === "sharp" || kind === "shock" ? "lethal" : null,
    title: String(f.title ?? "").trim().slice(0, 80), electronic: "none", lock: "none", items: [], progress: {}, tries: f.tries ?? {}
  };
}
/**
 * What a live hazard does to one character. ch.profile: the WoDX Combat soak profile ("vampire", "mortal" ...).
 * careful: {successes, botch} on stepping through glass carefully, or null.
 * Returns {mode: "levels"|"pool", amount, type, fireSun, soakDiff, text, notes} or null when it does nothing.
 */
export function hazardHit(o, ch = {}, careful = null) {
  if ( !o?.live ) return null;
  if ( o.kind === "fire" || o.kind === "brazier" ) {
    const vampire = ch.profile === "vampire";
    const notes = vampire ? ["Fire: the Storyteller may call for a Courage roll to resist the Red Fear."] : [];
    const type = vampire ? "aggravated" : o.type ?? (["mortal", "ghoul"].includes(ch.profile) ? "lethal" : "aggravated");
    return {mode: "levels", amount: FIRE_SIZES[o.size].levels, type, fireSun: vampire, soakDiff: FIRE_HEAT[o.heat].diff,
      text: `is burned (${FIRE_SIZES[o.size].levels} level${FIRE_SIZES[o.size].levels === 1 ? "" : "s"}, soaked at ${FIRE_HEAT[o.heat].diff}).`, notes};
  }
  if ( o.kind === "shock" ) {
    const L = SHOCKS[o.shock].levels;
    // A vampire soaks it as usual, but a botched soak makes it aggravated (V20 core printed p. 295, pdf 303)
    const vampire = ch.profile === "vampire";
    return {mode: "levels", amount: L, type: o.type, fireSun: false, soakDiff: 6, botchAggravated: vampire, text: `is jolted by the current (${L} levels).`,
      notes: [vampire ? "A botched soak makes it aggravated." : ""].filter(Boolean)};
  }
  const hits = careful && !careful.botch ? Math.max(0, Number(careful.successes) || 0) : 0;
  const dice = Math.max(0, o.dice - hits);
  if ( !dice ) return {mode: "pool", amount: 0, type: o.type, fireSun: false, soakDiff: 6, text: "picks a way through without a cut.", notes: []};
  return {mode: "pool", amount: dice, type: o.type, fireSun: false, soakDiff: 6, text: `is cut on the way through${hits ? ` (${hits} ${hits === 1 ? "die" : "dice"} fewer for care)` : ""}.`, notes: []};
}
/** The roll to step through sharp ground carefully: Dexterity + Athletics, difficulty 6. Null for other hazards. */
export function carefulRoll(o, ch = {}) {
  if ( o?.kind !== "sharp" ) return null;
  const sk = bestOf(ch.abilities ?? {}, ["athletics"]);
  return {attr: "dexterity", ability: sk.key, dice: (Number(ch.dexterity) || 0) + sk.value, diff: 6};
}
/**
 * An altar, shrine, relic or fetish on a tile. f: the tile's flags.wodx-interactables, with sacred: true.
 * rating: holy ground's rating or a relic's Faith potential (1 to 5); a fetish's Gnosis (1 to 10).
 */
export function describeSacred(f = {}) {
  const kind = SACRED[f.sacredKind] ? f.sacredKind : "altar";
  const top = kind === "fetish" ? 10 : 5;
  const rating = Math.max(1, Math.min(top, Math.round(Number(f.rating) || (kind === "fetish" ? 5 : 1))));
  return {
    sacred: true, hazard: false, hide: false, light: false, clue: false, trap: false, container: false, door: false, secret: false, ds: "open",
    kind, rating, desecrated: !!f.desecrated, items: parseItems(f.sacredItems), taken: !!f.taken,
    title: String(f.title ?? "").trim().slice(0, 80), electronic: "none", lock: "none", progress: {}, tries: f.tries ?? {}
  };
}
/** Whether a sacred tile is holy ground now. */
export const holyGround = o => !!o?.sacred && SACRED[o.kind].ground && !o.desecrated;
/**
 * What holy ground does to a demon (WoDX Actions' reading of Demon: The Fallen pp. 254-255): torment 3 or less, nothing;
 * otherwise lethal levels equal to the rating, and a Willpower roll each turn to stay. Null for anyone else.
 */
export function holyHarm(o, {kind = "", torment = 0} = {}) {
  if ( !holyGround(o) || kind !== "demon" ) return null;
  return demonHoly(torment, o.rating, {ground: true});
}

/** A watch point on a tile. f: the tile's flags.wodx-interactables, with watch: true. target: the tile it is tied to. */
export function describeWatch(f = {}) {
  const kind = WATCHES[f.watchKind] ? f.watchKind : "window";
  return {
    watch: true, sacred: false, hazard: false, hide: false, light: false, clue: false, trap: false, container: false, door: false, secret: false, ds: "open",
    kind, target: String(f.target ?? "").trim().slice(0, 200), title: String(f.title ?? "").trim().slice(0, 80),
    electronic: "none", lock: "none", items: [], progress: {}, tries: f.tries ?? {}
  };
}
/** A mount or vehicle on a tile. driver and riders: {a: actor id, t: token UUID, n: name}. */
export function describeMount(f = {}) {
  const kind = MOUNTS[f.mountKind] ? f.mountKind : "horse";
  const seats = f.seats === "" || f.seats === null || f.seats === undefined ? MOUNTS[kind].seats : Math.max(1, Math.min(40, Math.round(Number(f.seats) || 1)));
  const person = x => (x && typeof x === "object" && x.a ? {a: String(x.a), t: String(x.t ?? ""), n: String(x.n ?? "Someone")} : null);
  return {
    mount: true, watch: false, sacred: false, hazard: false, hide: false, light: false, clue: false, trap: false, container: false, door: false, secret: false, ds: "open",
    kind, seats, driver: person(f.driver), riders: (Array.isArray(f.riders) ? f.riders : []).map(person).filter(Boolean).slice(0, 40),
    title: String(f.title ?? "").trim().slice(0, 80), electronic: "none", lock: "none", items: [], progress: {}, tries: f.tries ?? {}
  };
}
/** A climb or a gap on a tile. height and depth in feet, gap in yards; climbTo: the tile at the top or the far side. */
export function describeClimb(f = {}) {
  const kind = CLIMBS[f.climbKind] ? f.climbKind : "wall";
  const n = (v, d, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));
  return {
    climb: true, mount: false, watch: false, sacred: false, hazard: false, hide: false, light: false, clue: false, trap: false, container: false, door: false, secret: false, ds: "open",
    kind, height: n(f.height, 10, 1, 1000), gap: n(f.gap, 2, 1, 20), depth: n(f.depth, 10, 0, 1000),
    climbTo: /^[A-Za-z0-9.]{1,200}$/.test(String(f.climbTo ?? "").trim()) ? String(f.climbTo).trim() : "",
    hanging: f.hanging && typeof f.hanging === "object" ? f.hanging : {}, title: String(f.title ?? "").trim().slice(0, 80),
    electronic: "none", lock: "none", items: [], progress: f.progress ?? {}, tries: f.tries ?? {}
  };
}
/** The successes a climb takes: its height in yards over the yards a success. */
export const climbNeed = o => (CLIMBS[o.kind].per ? Math.max(1, Math.ceil(o.height / 3 / CLIMBS[o.kind].per)) : 0);

/** A target on a tile. count: bottles in the row; left: still standing; scores: {actorId: {n, shots, hits, pts, best}}. */
export function describeTarget(f = {}) {
  const kind = TARGETS[f.targetKind] ? f.targetKind : "mark";
  const count = Math.max(1, Math.min(24, Math.round(Number(f.bottles) || 6)));
  const left = f.left === undefined || f.left === null || f.left === "" ? count : Math.max(0, Math.min(count, Math.round(Number(f.left) || 0)));
  const scores = f.scores && typeof f.scores === "object" && !Array.isArray(f.scores) ? f.scores : {};
  return {
    isTarget: true, climb: false, mount: false, watch: false, sacred: false, hazard: false, hide: false, light: false, clue: false, trap: false, container: false, door: false, secret: false, ds: "open",
    kind, build: OBJECT_BUILDS[f.objBuild] ? f.objBuild : "light", count, left, broken: !!f.smashed, hits: Math.max(0, Math.round(Number(f.hits) || 0)), scores,
    title: String(f.title ?? "").trim().slice(0, 80), electronic: "none", lock: "none", items: [], progress: f.progress ?? {}, tries: f.tries ?? {}
  };
}
/** The scoreboard of a target, best first: [{a, n, shots, hits, pts, best}]. */
export function standings(o) {
  return Object.entries(o?.scores ?? {}).map(([a, x]) => ({a, n: String(x?.n ?? "Someone"), shots: Number(x?.shots) || 0, hits: Number(x?.hits) || 0, pts: Number(x?.pts) || 0, best: Number(x?.best) || 0}))
    .sort((p, q) => q.pts - p.pts || q.hits - p.hits || p.shots - q.shots || p.n.localeCompare(q.n));
}
export function scoreLines(o) {
  const st = standings(o);
  if ( !st.length ) return ["Nobody has a score yet."];
  return st.map((x, k) => `${k + 1}. ${x.n}: ${TARGETS[o.kind]?.rings ? `${x.pts} point${x.pts === 1 ? "" : "s"}, ` : ""}${x.hits} hit${x.hits === 1 ? "" : "s"} in ${x.shots} ${x.shots === 1 ? "try" : "tries"}`);
}

/** Everyone aboard a mount or vehicle, the one at the reins first. */
export const aboard = o => [o.driver, ...o.riders].filter(Boolean);

/**
 * What a look out of a window or into a mirror shows. people: [{name, lasombra}] in the watched area (the runtime
 * leaves out the hidden). roll: {successes, botch}. Returns {count, names, unreflected}.
 */
export function watchSees(o, people = [], roll = {successes: 0, botch: false}) {
  if ( roll.botch ) return {count: 0, names: [], unreflected: []};
  const mirror = !!WATCHES[o.kind].mirror;
  const shown = people.filter(p => !(mirror && p.lasombra));
  return {count: shown.length, names: roll.successes > 0 ? shown.map(p => p.name) : [], unreflected: mirror ? people.filter(p => p.lasombra).map(p => p.name) : []};
}

/** The search successes it takes to find one person hiding. */
export const hideNeed = (o, occ) => HIDES[o.kind].need + Math.floor(Math.max(0, Number(occ?.s) || 0) / 2);
/** Who a search finds in a hiding place. bonus: a search of that very place counts one more success. */
export function findHidden(o, roll = {successes: 0, botch: false}, {bonus = 0} = {}) {
  if ( roll.botch ) return [];
  return o.occupants.filter(occ => Math.max(0, Number(roll.successes) || 0) + bonus >= hideNeed(o, occ));
}
/** The texts a character has learned from a clue, by their best successes (a botch or none: only the first). */
export function clueTexts(o, successes = 0) {
  const n = Math.max(0, Math.min(CLUE_TIERS, Number(successes) || 0));
  return o.texts.slice(0, n + 1).filter(Boolean);
}
/** What a container holds: one item a line (a UUID, or the name of an item in the world), at most MAX_ITEMS. */
export function parseItems(text) {
  const lines = Array.isArray(text) ? text : String(text ?? "").split(/\r?\n/);
  return lines.map(l => String(l ?? "").trim()).filter(Boolean).slice(0, MAX_ITEMS);
}

/** A short name for an interactable: "Locked iron-bound door", "Open window". */
export function nameOf(o, era = {}) {
  if ( o.isTarget ) {
    const T = TARGETS[o.kind];
    let t = o.title || T.label;
    // In the early eras a target with rings is an archery butt
    if ( !o.title && o.kind === "mark" && (isDarkAge(era) || ((Number(era.year) || 0) > 0 && era.year < 1600)) ) t = "Archery butt";
    if ( o.kind === "bottles" ) return `${t}${o.left ? `, ${o.left} standing` : ", all knocked down"}`;
    if ( o.kind === "object" ) return `${t}${o.broken ? ", broken" : ""}`;
    return t;
  }
  if ( o.climb ) {
    const C = CLIMBS[o.kind];
    return `${o.title || C.label}${C.jump ? ` (${o.gap} yard${o.gap === 1 ? "" : "s"} across)` : ` (${o.height} feet)`}`;
  }
  if ( o.mount ) {
    const M = MOUNTS[o.kind], n = aboard(o).length;
    return `${o.title || M.label}${o.driver ? `, ${o.driver.n} ${M.reins}` : ""}${n > (o.driver ? 1 : 0) ? `, ${n} aboard` : ""}`;
  }
  if ( o.watch ) return o.title || WATCHES[o.kind].label;
  if ( o.sacred ) {
    const S = SACRED[o.kind], t = o.title || S.label;
    if ( S.ground ) return `${t}${o.desecrated ? ", desecrated" : ""}`;
    return `${t}${o.taken || !o.items.length ? ", taken" : ""}`;
  }
  if ( o.hazard ) {
    const H = HAZARDS[o.kind], t = o.title || H.label;
    if ( o.kind === "fire" ) return `${t}${o.burning ? `, burning (${FIRE_SIZES[o.size].label.split(":")[0].toLowerCase()})` : ", out"}`;
    if ( o.kind === "brazier" ) return `${t}${o.spilled ? (o.burning ? ", knocked over and burning" : ", knocked over") : ""}`;
    if ( o.kind === "shock" ) return `${t}${o.live ? ", live" : ", power off"}`;
    return `${t}${o.cleared ? ", swept aside" : ""}`;
  }
  if ( o.clue ) return o.title || CLUES[o.kind].label;
  if ( o.hide ) return `${o.title || HIDES[o.kind].label}${o.occupants.length >= o.room ? ", full" : ""}`;
  if ( o.light ) return `${o.title || LIGHTS[o.kind].label}${o.broken ? ", broken" : o.on ? ", lit" : ", dark"}`;
  if ( o.trap ) {
    const T = TRAPS[o.kind], g = TRAP_GRADES[o.grade].label.toLowerCase();
    if ( o.holding ) return `${T.label}, holding someone`;
    if ( o.sprung ) return o.kind === "pit" ? `Open pit (${g})` : `Sprung ${T.label.toLowerCase()} (${g})`;
    return o.armed ? `${T.label} (${g})` : `Disarmed ${T.label.toLowerCase()} (${g})`;
  }
  if ( o.breakable && !o.door ) return `${WALLS[o.breakable].label} wall`;
  if ( o.container ) {
    const st = o.ds === "open" ? (o.items.length && !o.taken ? "Open" : "Open, empty") : o.ds === "locked" ? "Locked" : "Closed";
    const m = ["wood", "steel"].includes(o.material) || (o.kind === "strongbox" && o.material === "ironbound") ? "" : ` ${MATERIALS[o.material].label.toLowerCase()}`;
    return `${st}${m} ${CONTAINERS[o.kind].label.toLowerCase()}`.replace(/^Open, empty (.*)$/, "Open $1, empty");
  }
  const state = o.broken ? "Broken" : o.ds === "open" ? "Open" : o.ds === "locked" ? "Locked" : o.stuck ? "Stuck" : "Closed";
  const mat = o.material === "wood" || o.material === "glass" ? "" : ` ${MATERIALS[o.material].label.toLowerCase()}`;
  return `${state}${mat} ${KINDS[o.kind].toLowerCase()}`;
}

/* ------------------------------------------------------------------ */
/*  What a character can try                                           */
/* ------------------------------------------------------------------ */

/**
 * The options for one object and one character.
 * ch: {strength, potence, dexterity, perception, intelligence, abilities: {key: dots}, kind, eraId, year,
 *      side ("a"|"b"), hasKey, hasTools, actorId, powers: [names]}
 * Each option: {id, label, roll: null | {attr, attrLabel, ability, abilityLabel, dice, diff, need (extended) | null},
 *               seconds, noise: {success, fail, botch}, note, waits (true: the Storyteller decides)}
 */
export function optionsFor(o, ch = {}) {
  if ( o.container ) return containerOptions(o, ch);
  if ( o.trap ) return trapOptions(o, ch);
  if ( o.clue ) return clueOptions(o, ch);
  if ( o.light ) return lightOptions(o);
  if ( o.hide ) return hideOptions(o, ch);
  if ( o.hazard ) return hazardOptions(o, ch);
  if ( o.sacred ) return sacredOptions(o, ch);
  if ( o.watch ) return watchOptions(o, ch);
  if ( o.mount ) return mountOptions(o, ch);
  if ( o.climb ) return climbOptions(o, ch);
  if ( o.isTarget ) return targetOptions(o, ch);
  const out = [];
  const ab = k => Number(ch.abilities?.[k]) || 0;
  const tries = id => Number(o.tries?.[`${ch.actorId ?? ""}:${id}`]) || 0;
  const strength = (Number(ch.strength) || 0) + (Number(ch.potence) || 0);
  const barredAgainst = o.barred && o.barSide && ch.side && ch.side !== o.barSide;
  const barredHere = o.barred && o.barSide && ch.side === o.barSide;
  const pane = o.kind === "window" && (o.material === "glass" || o.material === "horn");
  const single = (id, label, attr, attrLabel, key, abilityLabel, diff, seconds, noise, note) => {
    const t = tries(id);
    out.push({id, label, roll: {attr, attrLabel, ability: key, abilityLabel, dice: (Number(ch[attr]) || 0) + (key ? ab(key) : 0), diff: Math.min(10, diff + t), need: null, retries: t},
      seconds, noise, note: t ? `${note ? `${note} ` : ""}Tried before: +${t} difficulty.` : note});
  };

  if ( o.breakable && !o.door ) {
    if ( o.breached ) return out;
    const w = WALLS[o.breakable];
    out.push(forceOption("breach", "Break through the wall", strength, ch, w, o.progress.breach ?? 0, {waits: true,
      note: `Strength ${w.feat} on the lifting chart goes straight through. The Storyteller decides what the hole looks like.`}));
    return out;
  }
  if ( o.broken ) return out;
  const isOpen = o.ds === "open", locked = o.ds === "locked";

  if ( isOpen ) out.push({id: "close", label: `Close the ${KINDS[o.kind].toLowerCase()}`, roll: null, seconds: TURN, noise: {success: "quiet"}});
  if ( !isOpen && !locked && !barredAgainst ) {
    if ( o.stuck ) single("unstick", "Heave it open (stuck)", "strength", "Strength", null, "", 6, TURN,
      {success: "quiet", fail: "quiet", botch: "loud"}, pane ? "A botch breaks the pane." : "A botch makes a racket.");
    else {
      out.push({id: "open", label: `Open the ${KINDS[o.kind].toLowerCase()}`, roll: null, seconds: TURN, noise: {success: "quiet"}});
      single("openQuiet", "Open it quietly", "dexterity", "Dexterity", "stealth", "Stealth", 6, TURN,
        {success: "silent", fail: "quiet", botch: "loud"}, "Failure still opens it, with the usual noise.");
    }
  }
  if ( barredHere && !isOpen ) out.push({id: "unbar", label: "Lift the bar", roll: null, seconds: TURN, noise: {success: "quiet"}});
  if ( !barredHere && o.barred && !o.barSide && !isOpen ) out.push({id: "unbar", label: "Lift the bar", roll: null, seconds: TURN, noise: {success: "quiet"}});
  if ( ch.hasKey && o.keyName && !isOpen ) out.push({id: locked ? "unlock" : "lock", label: locked ? "Unlock it with the key" : "Lock it with the key", roll: null, seconds: TURN, noise: {success: "quiet"}});

  if ( locked && o.lock !== "none" ) {
    if ( o.jammed ) out.push(jammedNote());
    else if ( barredAgainst ) out.push({id: "barredNote", label: "Barred from the other side", roll: null, disabled: true, note: "Picking the lock will not lift the bar."});
    else out.push(pickOption(o, ch));
  }
  if ( o.electronic !== "none" && isModern(ch) && !isOpen && !o.alarm && !o.beaten ) out.push(hackOption(o, ch));
  if ( !isOpen ) {
    if ( pane ) out.push({id: "smash", label: "Break the pane", roll: null, seconds: TURN, noise: {success: "loud"}, note: "Loud. The window stays open and can't be closed."});
    else out.push(forceOption("force", `Force the ${KINDS[o.kind].toLowerCase()}`, strength, ch, BUILDS[o.build], o.progress.force ?? 0,
      {extra: barredAgainst ? 2 : 0, note: barredAgainst ? "Barred from the other side: 2 more successes." : ""}));
    if ( o.kind !== "window" ) {
      const thick = {pane: 0, interior: 0, sturdy: 1, reinforced: 2, vault: 3}[o.build] ?? 0;
      single("listen", "Listen at it", "perception", "Perception", "alertness", "Alertness", 6 + thick, TURN, {success: "silent", fail: "silent", botch: "silent"},
        thick ? `A thick ${KINDS[o.kind].toLowerCase()}: +${thick} difficulty.` : "");
      out.push({id: "knock", label: "Knock", roll: null, seconds: TURN, noise: {success: "loud"}});
    }
  }
  if ( (ch.powers ?? []).length ) out.push({id: "power", label: "Use a power", roll: null, power: true, note: `${ch.powers.join(", ")}: opens the WoDX actions menu.`});
  return out;
}
const jammedNote = () => ({id: "jammed", label: "The lock is jammed", roll: null, disabled: true, note: "Nobody can pick it now; force it, or ask the Storyteller."});
function pickOption(o, ch) {
  const L = LOCKS[o.lock], sk = lockSkill(ch.abilities, ch);
  const diff = Math.min(10, L.diff + (ch.hasTools ? 0 : NO_TOOLS_DIFF));
  return {id: "pick", label: `Pick the lock (${L.label.toLowerCase()})`, extended: true,
    roll: {attr: "dexterity", attrLabel: "Dexterity", ability: sk.key, abilityLabel: cap(sk.key), dice: (Number(ch.dexterity) || 0) + sk.value, diff, need: L.need, have: o.progress.pick ?? 0},
    seconds: L.seconds, noise: {success: "quiet", fail: "quiet", botch: "quiet"},
    note: `${ch.hasTools ? "" : `No picks or tools: +${NO_TOOLS_DIFF} difficulty. `}A botch jams the lock and loses the progress.`};
}
function hackOption(o, ch) {
  const E = ELECTRONIC[o.electronic], sk = electronicSkill(ch.abilities);
  return {id: "hack", label: `Beat the keypad or alarm (${E.label.toLowerCase()})`, extended: true,
    roll: {attr: "intelligence", attrLabel: "Intelligence", ability: sk.key, abilityLabel: cap(sk.key), dice: (Number(ch.intelligence) || 0) + sk.value, diff: E.diff, need: E.need, have: o.progress.hack ?? 0},
    seconds: E.seconds, noise: {success: "silent", fail: "silent", botch: "loud"}, note: "A botch sets off the alarm."};
}
/** A chest, cabinet, strongbox or safe: open it, take what is inside, pick or force its lock, beat its keypad. */
function containerOptions(o, ch) {
  const out = [];
  const name = CONTAINERS[o.kind].label.toLowerCase().split(" ")[0];
  const isOpen = o.ds === "open", locked = o.ds === "locked";
  const strength = (Number(ch.strength) || 0) + (Number(ch.potence) || 0);
  if ( isOpen ) {
    if ( o.items.length && !o.taken ) out.push({id: "take", label: `Take what is inside (${o.items.length === 1 ? "one thing" : `${o.items.length} things`})`, roll: null, seconds: TURN, noise: {success: "silent"}});
    out.push({id: "close", label: `Close the ${name}`, roll: null, seconds: TURN, noise: {success: "quiet"}});
  } else if ( !locked ) out.push({id: "open", label: `Open the ${name}`, roll: null, seconds: TURN, noise: {success: "quiet"}});
  if ( ch.hasKey && o.keyName && !isOpen ) out.push({id: locked ? "unlock" : "lock", label: locked ? "Unlock it with the key" : "Lock it with the key", roll: null, seconds: TURN, noise: {success: "quiet"}});
  if ( locked && o.lock !== "none" ) out.push(o.jammed ? jammedNote() : pickOption(o, ch));
  if ( o.electronic !== "none" && isModern(ch) && !isOpen && !o.alarm && !o.beaten ) out.push(hackOption(o, ch));
  if ( !isOpen ) out.push(forceOption("force", `Force the ${name}`, strength, ch, BUILDS[o.build], o.progress.force ?? 0));
  if ( (ch.powers ?? []).length ) out.push({id: "power", label: "Use a power", roll: null, power: true, note: `${ch.powers.join(", ")}: opens the WoDX actions menu.`});
  return out;
}
/** A trap someone has found: disarm it, set it off from a safe distance, set it again; a snare: get free. */
function trapOptions(o, ch) {
  const out = [], T = TRAPS[o.kind], G = TRAP_GRADES[o.grade];
  const tries = id => Number(o.tries?.[`${ch.actorId ?? ""}:${id}`]) || 0;
  const roll = (id, attr, attrLabel, ability, diff) => {
    const t = tries(id);
    return {attr, attrLabel, ability: ability.key, abilityLabel: ability.key ? cap(ability.key) : "", dice: (Number(ch[attr]) || 0) + (ability.value || 0), diff: Math.min(10, diff + t), need: null, retries: t};
  };
  const triedNote = (id, note = "") => (tries(id) ? `${note ? `${note} ` : ""}Tried before: +${tries(id)} difficulty.` : note);
  if ( o.holding ) {
    if ( o.holding === ch.actorId ) out.push({id: "breakFree", label: "Break free of the snare", roll: roll("breakFree", "strength", "Strength", {key: null, value: Number(ch.potence) || 0}, 7),
      seconds: TURN, noise: {success: "quiet", fail: "quiet", botch: "quiet"}, note: triedNote("breakFree", "Potence adds its dots.")});
    else out.push({id: "cutFree", label: "Cut them free", roll: null, seconds: TURN, noise: {success: "quiet"}});
    return out;
  }
  const skill = lockSkill(ch.abilities, ch);
  if ( o.armed ) {
    out.push({id: "disarm", label: `Disarm the ${T.label.toLowerCase()} (${G.label.toLowerCase()})`, roll: roll("disarm", "wits", "Wits", skill, G.diff),
      seconds: G.seconds, noise: {success: "silent", fail: "silent", botch: T.noise}, note: triedNote("disarm", "A botch sets it off on the one disarming it.")});
    out.push({id: "trigger", label: "Set it off from a safe distance", roll: null, seconds: TURN, noise: {success: T.noise},
      note: o.kind === "tripwire" ? "It still makes its noise." : "With a pole or a thrown stone: it is spent, and nobody is hurt."});
  } else if ( o.kind !== "pit" || !o.sprung ) {
    out.push({id: "rearm", label: `Set the ${T.label.toLowerCase()} again`, roll: roll("rearm", "wits", "Wits", skill, 6), seconds: G.seconds,
      noise: {success: "silent", fail: "silent", botch: T.noise}, note: triedNote("rearm", "A botch sets it off on the one setting it.")});
  }
  return out;
}

/** A hiding place: hide in it, come out, or search it (one success better than searching the whole area). */
function hideOptions(o, ch) {
  const me = o.occupants.some(x => x.a === ch.actorId);
  if ( me ) return [{id: "comeOut", label: "Come out of hiding", roll: null, seconds: TURN, noise: {success: "quiet"}}];
  const out = [];
  if ( o.occupants.length < o.room ) {
    const st = bestOf(ch.abilities ?? {}, ["stealth"]);
    const t = Number(o.tries?.[`${ch.actorId ?? ""}:hide`]) || 0;
    out.push({id: "hide", label: "Hide here", roll: {attr: "dexterity", attrLabel: "Dexterity", ability: "stealth", abilityLabel: "Stealth",
      dice: (Number(ch.dexterity) || 0) + st.value, diff: Math.min(10, 6 + t), need: null, retries: t}, seconds: TURN,
      noise: {success: "silent", fail: "quiet", botch: "loud"},
      note: `Hidden even on a failure, but easier to find; every two successes make it harder (${HIDES[o.kind].need} search success${HIDES[o.kind].need === 1 ? "" : "es"} at least). A botch makes a noise.`});
  } else out.push({id: "fullNote", label: "No room to hide", roll: null, disabled: true, note: `It holds ${o.room}.`});
  const sk = bestOf(ch.abilities ?? {}, ["alertness", "investigation"]);
  out.push({id: "searchHide", label: "Search it", roll: {attr: "perception", attrLabel: "Perception", ability: sk.key, abilityLabel: cap(sk.key),
    dice: (Number(ch.perception) || 0) + sk.value, diff: 6, need: null}, seconds: TURN, noise: {success: "quiet", fail: "quiet", botch: "quiet"},
    note: "Looking right in it counts one success more than searching the area."});
  return out;
}

/**
 * A hazard: put a fire out (a small one with no roll, a bonfire with Dexterity + Athletics at 7, an inferno not by hand),
 * set something alight, knock a brazier over, sweep glass aside, cut the power or turn it back on.
 */
function hazardOptions(o, ch) {
  const out = [];
  if ( o.kind === "fire" || o.kind === "brazier" ) {
    if ( o.kind === "brazier" && !o.spilled ) out.push({id: "knockOver", label: "Knock it over", roll: null, seconds: TURN, noise: {success: "loud"},
      note: "Starts a fire where it falls."});
    if ( o.burning ) {
      if ( o.size === "small" ) out.push({id: "putOut", label: "Put it out", roll: null, seconds: TURN, noise: {success: "quiet"}, note: "Smothered or stamped out."});
      else if ( o.size === "large" ) {
        const sk = bestOf(ch.abilities ?? {}, ["athletics"]);
        const t = Number(o.tries?.[`${ch.actorId ?? ""}:putOut`]) || 0;
        out.push({id: "putOut", label: "Beat the fire out", roll: {attr: "dexterity", attrLabel: "Dexterity", ability: sk.key, abilityLabel: cap(sk.key),
          dice: (Number(ch.dexterity) || 0) + sk.value, diff: Math.min(10, 7 + t), need: null, retries: t}, seconds: TURN,
          noise: {success: "quiet", fail: "quiet", botch: "quiet"}, note: `With a blanket, sand or water.${t ? ` Tried before: +${t} difficulty.` : ""} A botch: the one fighting it is burned.`});
      } else out.push({id: "noPutOut", label: "Too big to put out by hand", roll: null, disabled: true, note: "It needs a bucket chain, a fire crew, or time."});
    } else if ( o.kind === "fire" ) out.push({id: "alight", label: "Set it alight", roll: null, seconds: TURN, noise: {success: "quiet"}, note: "With a torch, a lamp, a match or a lighter."});
  } else if ( o.kind === "sharp" ) {
    if ( !o.cleared ) out.push({id: "sweep", label: "Sweep a path clear", roll: null, seconds: MINUTE, noise: {success: "quiet"}, note: "Takes a minute; after that it is safe to cross."});
  } else if ( o.kind === "shock" ) {
    // Held by the current: Strength to pull free, 5 for a vampire, 9 for anyone else (V20 core printed p. 295, pdf 303)
    if ( o.live && o.caught?.[ch.actorId ?? ""] ) {
      const diff = ch.kind === "vampire" ? 5 : 9;
      out.push({id: "pullFree", label: "Pull free of the current", roll: {attr: "strength", attrLabel: "Strength", ability: null, abilityLabel: "", dice: Number(ch.strength) || 0, diff, need: null},
        seconds: TURN, noise: {success: "quiet", fail: "quiet", botch: "quiet"}, note: `Strength at ${diff}${ch.kind === "vampire" ? " (a vampire)" : ""}. Until then the current hurts again each turn.`});
    }
    out.push(o.live ? {id: "powerOff", label: "Cut the power", roll: null, seconds: TURN, noise: {success: "silent"}, note: "At the switch, the fuse box or the breaker. Frees anyone held."}
      : {id: "powerOn", label: "Turn the power back on", roll: null, seconds: TURN, noise: {success: "silent"}});
  }
  return out;
}

/** An altar or shrine: pray there, or desecrate it. A relic or fetish: take it. */
function sacredOptions(o) {
  const S = SACRED[o.kind], out = [];
  if ( S.ground ) {
    if ( o.desecrated ) return [{id: "desecratedNote", label: "Desecrated", roll: null, disabled: true, note: "It is not holy ground until the Storyteller consecrates it again."}];
    out.push({id: "pray", label: "Pray here", roll: null, opens: "prayer", seconds: 3600, noise: {success: "quiet"},
      note: `Holy ground, rating ${o.rating}: in the prayer window, pick Holy Ground and set the rating to ${o.rating}.`});
    out.push({id: "desecrate", label: "Desecrate it", roll: null, seconds: MINUTE, noise: {success: "loud"}, note: "It stops being holy ground until it is consecrated again."});
  }
  if ( S.use ) out.push({id: "useSacred", label: "Use it", roll: null, opens: S.use, seconds: TURN, noise: {success: "silent"}, note: S.note(o.rating)});
  if ( S.carry ) {
    if ( o.items.length && !o.taken ) out.push({id: "take", label: "Take it", roll: null, seconds: TURN, noise: {success: "silent"},
      note: o.kind === "fetish" ? `Gnosis ${o.rating}. Attune and use it from the WoDX actions menu (Fetish or talen).` : `Faith potential ${o.rating}.`});
    else out.push({id: "goneNote", label: "Nothing left to take", roll: null, disabled: true, note: o.items.length ? "Someone has taken it." : "The Storyteller has not named the item on the tile."});
  }
  return out;
}

/** A watch point: look out or in, call or call for help, raise the alarm. */
function watchOptions(o, ch) {
  const W = WATCHES[o.kind], out = [];
  if ( W.sees ) {
    const sk = bestOf(ch.abilities ?? {}, ["alertness"]);
    const t = Number(o.tries?.[`${ch.actorId ?? ""}:watch`]) || 0;
    out.push({id: "watch", label: W.verb, roll: {attr: "perception", attrLabel: "Perception", ability: sk.key, abilityLabel: cap(sk.key),
      dice: (Number(ch.perception) || 0) + sk.value, diff: Math.min(10, 6 + t), need: null, retries: t}, seconds: TURN, noise: {success: "silent", fail: "silent", botch: "silent"},
      note: o.target ? "Any success names who is there; none gives only how many." : "Not tied to an area: the Storyteller describes the view."});
  }
  if ( W.calls ) {
    const year = Number(ch.year) || 0;
    if ( year && year < W.from ) return [{id: "eraNote", label: `No ${W.label.toLowerCase()} yet`, roll: null, disabled: true, note: `Not before about ${W.from}.`}];
    out.push(o.target ? {id: "call", label: o.kind === "radio" ? "Call on the radio" : "Make a call", roll: null, seconds: TURN, noise: {success: "quiet"}, note: "Reaches the one it is tied to; the Storyteller plays the other end."}
      : {id: "callNote", label: "Not tied to another phone", roll: null, disabled: true, note: "The Storyteller ties it to another tile in its config."});
    out.push({id: "callHelp", label: "Call for help", roll: null, seconds: TURN, noise: {success: "quiet"}, note: "The police, the watch or the household: the Storyteller decides who comes."});
  }
  if ( W.alarm ) out.push({id: "ringAlarm", label: "Raise the alarm", roll: null, seconds: TURN, noise: {success: "loud"}, note: "Loud: everyone in earshot hears it."});
  return out;
}

/** A light source: light it or put it out; break it if it can break. */
function lightOptions(o) {
  const L = LIGHTS[o.kind], out = [];
  if ( o.broken ) return out;
  if ( !o.count ) return [{id: "noLight", label: "Not tied to any light", roll: null, disabled: true, note: "The Storyteller has not tied this to a light on the scene."}];
  out.push(o.on ? {id: "lightOff", label: L.off, roll: null, seconds: TURN, noise: {success: "silent"}}
    : {id: "lightOn", label: L.on, roll: null, seconds: TURN, noise: {success: "silent"}});
  if ( L.breaks ) out.push({id: "breakLight", label: "Break it", roll: null, seconds: TURN, noise: {success: "loud"}, note: "Loud, and it stays dark until the Storyteller mends it."});
  return out;
}

/** A clue: look at it (no roll, when there is nothing deeper to find), or examine it for what successes add. */
function clueOptions(o, ch) {
  const C = CLUES[o.kind];
  const deeper = o.texts.slice(1).some(Boolean);
  const best = Number(o.seen?.[ch.actorId ?? ""]);
  const label = `${C.verb} it`;
  const look = {id: "look", label: deeper ? "Look at it" : label, roll: null, seconds: TURN, noise: {success: "silent"}};
  if ( !deeper ) return [look];
  const sk = bestOf(ch.abilities ?? {}, ["investigation"]);
  const t = Number(o.tries?.[`${ch.actorId ?? ""}:examine`]) || 0;
  // Investigation is a Knowledge, and an untrained Knowledge is not rolled (as in WoDX Actions): with none, only a look
  if ( !(sk.value > 0) ) return [look, {id: "examineNote", label: `${label} closely`, roll: null, disabled: true, note: "Needs Investigation: without it there is only a look."}];
  return [look, {id: "examine", label: `${label} closely`, roll: {attr: C.attr, attrLabel: cap(C.attr), ability: sk.key, abilityLabel: cap(sk.key),
    dice: (Number(ch[C.attr]) || 0) + sk.value, diff: Math.min(10, 6 + t), need: null, retries: t}, seconds: MINUTE,
    noise: {success: "silent", fail: "silent", botch: "silent"},
    note: `More successes show more.${best > 0 ? ` Seen before with ${best} success${best === 1 ? "" : "es"}: a new roll only adds.` : ""}${t ? ` Tried before: +${t} difficulty.` : ""}`}];
}

/** Searching an area for traps: Perception + Alertness or Investigation, whichever is better, difficulty 6, a minute. */
export function searchOption(ch = {}) {
  const sk = bestOf(ch.abilities ?? {}, ["alertness", "investigation"]);
  return {id: "search", label: "Search the area", roll: {attr: "perception", attrLabel: "Perception", ability: sk.key, abilityLabel: cap(sk.key),
    dice: (Number(ch.perception) || 0) + sk.value, diff: 6, need: null}, seconds: MINUTE, noise: {success: "silent", fail: "silent", botch: "silent"},
    note: "Looks for traps and hidden things close by. The better hidden, the more successes it takes."};
}
/** Which hidden traps a search finds: those whose grade needs no more successes than were rolled. A botch finds none. */
export function searchFinds(traps = [], roll = {successes: 0, botch: false}) {
  if ( roll.botch ) return [];
  return traps.filter(t => !t.found && Number(roll.successes) >= (t.clue ? t.need : TRAP_GRADES[t.grade].hide));
}
/** The roll to get clear of a springing trap: Dexterity + Athletics or Dodge, at the trap's grade. Null: no roll. */
export function reflexRoll(o, ch = {}) {
  if ( !TRAPS[o.kind].reflex ) return null;
  const sk = bestOf(ch.abilities ?? {}, ["dodge", "athletics"]);
  return {attr: "dexterity", ability: sk.key, dice: (Number(ch.dexterity) || 0) + sk.value, diff: TRAP_GRADES[o.grade].diff};
}
/**
 * A trap springs on someone. reflex: {successes, botch} from reflexRoll, or null. Returns {flags, dice, type, noise, text, caught}.
 * Each reflex success takes a die off a blade; any success clears a snare or catches the edge of a pit.
 */
export function springTrap(o, reflex = null, actorId = "") {
  const T = TRAPS[o.kind];
  const flags = {armed: false, sprung: true, found: true};
  const hits = reflex && !reflex.botch ? Math.max(0, Number(reflex.successes) || 0) : 0;
  let dice = o.dice, text = "", caught = false;
  if ( o.kind === "snare" ) {
    if ( hits ) { dice = 0; text = "jumps clear as the snare snaps shut."; }
    else { flags.holding = actorId; caught = true; text = "is caught in the snare."; }
  } else if ( o.kind === "pit" ) {
    if ( hits ) { dice = 0; text = "catches the edge as the floor gives way."; }
    else text = "falls into the pit.";
  } else if ( o.kind === "blade" ) {
    dice = Math.max(0, o.dice - hits);
    text = dice ? `is struck by a spring blade${hits ? `, twisting away from part of it (${hits} ${hits === 1 ? "die" : "dice"} fewer)` : ""}.` : "twists clear of the spring blade.";
  } else text = "sets off a tripwire.";
  return {flags, dice, type: o.type, noise: T.noise, text, caught};
}

/** A climb: up (or down) it; a gap: jump it, and catch the ledge or let go if the jump falls short. */
function climbOptions(o, ch) {
  const C = CLIMBS[o.kind], me = ch.actorId ?? "", ath = bestOf(ch.abilities ?? {}, ["athletics"]);
  const dex = Number(ch.dexterity) || 0, str = Number(ch.strength) || 0;
  const pool = (attr, dots, diff, extra = {}) => ({attr, attrLabel: cap(attr), ability: "athletics", abilityLabel: "Athletics", dice: dots + ath.value, diff, need: null, ...extra});
  if ( C.jump ) {
    if ( o.hanging[me] ) return [
      {id: "catchLedge", label: "Catch the ledge", roll: pool("dexterity", dex, 6), seconds: TURN, noise: {success: "quiet", fail: "loud", botch: "loud"},
        note: `Hanging from the edge. A failure: a fall of ${o.depth} feet (${fallDice(o.depth)} bashing ${fallDice(o.depth) === 1 ? "die" : "dice"}).`},
      {id: "letGo", label: "Let go", roll: null, seconds: TURN, noise: {success: "loud"}, note: `A fall of ${o.depth} feet.`}];
    return [{id: "jump", label: "Jump it", roll: pool("strength", str, 3), seconds: TURN, noise: {success: "quiet", fail: "quiet", botch: "loud"},
      note: `With a run-up: ${o.gap} success${o.gap === 1 ? "" : "es"} to clear ${o.gap} yard${o.gap === 1 ? "" : "s"}. Short of it: Dexterity + Athletics to catch the ledge. A botch: straight down, ${o.depth} feet.`}];
  }
  if ( !C.per ) return [{id: "climbEasy", label: "Climb it", roll: null, seconds: TURN, noise: {success: "quiet"}, note: "No roll."}];
  const need = climbNeed(o), have = Number(o.progress?.[`climb:${me}`]) || 0;
  return [{id: "climb", label: "Climb it", extended: true, roll: pool("dexterity", dex, 6, {need, have}), seconds: TURN, noise: {success: "quiet", fail: "quiet", botch: "loud"},
    note: `${C.per} yards a success: ${need} in all for ${o.height} feet. Claws or bone spurs: the Storyteller may take 2 off the difficulty. A botch: a fall from as high as the climb got.`}];
}

/**
 * A target: shoot it with each ranged weapon on the sheet, throw something at it, strike or break it within reach.
 * ch.yards: how far it is; ch.inReach: within reach; ch.weapons: [{id, name, ranged, attr, ability, range, diff, accuracy}].
 */
function targetOptions(o, ch) {
  const T = TARGETS[o.kind], out = [], yards = Math.round(Number(ch.yards) || 0);
  const ab = k => Number(ch.abilities?.[k]) || 0;
  const down = (o.kind === "bottles" && !o.left) || (o.kind === "object" && o.broken);
  if ( o.kind === "bottles" && !o.left ) out.push({id: "setUp", label: "Set them up again", roll: null, seconds: TURN * 10, noise: {success: "quiet"}, note: "Within reach.", disabled: !ch.inReach});
  if ( o.kind === "object" && o.broken ) out.push({id: "brokenNote", label: "Already broken", roll: null, disabled: true, note: "Undo the card, or untick Broken in the tile's settings."});
  if ( !down ) {
    const bandWords = b => (b ? `, +${b} difficulty for the range` : "");
    for ( const w of (ch.weapons ?? []).filter(x => x.ranged).slice(0, 4) ) {
      const b = rangeBand(yards, w.range), key = String(w.ability || "firearms").toLowerCase(), dots = Number(ch[w.attr || "dexterity"]) || 0;
      const label = `${key === "athletics" ? "Throw" : "Shoot"} it with the ${w.name}`;
      if ( b === null ) { out.push({id: `shoot:${w.id}`, label, roll: null, disabled: true, note: `Out of range: ${yards} yards, and the ${w.name} reaches ${w.range * 3} at most.`}); continue; }
      out.push({id: `shoot:${w.id}`, label, shot: key === "firearms" ? "gun" : key === "athletics" ? "throw" : "bow",
        roll: {attr: w.attr || "dexterity", attrLabel: cap(w.attr || "dexterity"), ability: key, abilityLabel: cap(key), dice: dots + ab(key) + (Number(w.accuracy) || 0),
          diff: Math.min(10, (Number(w.diff) || 6) + b), need: null, skill: key !== "athletics"},
        seconds: TURN, noise: key === "firearms" ? {success: "loud", fail: "loud", botch: "loud"} : {success: "quiet", fail: "quiet", botch: "quiet"},
        note: `${yards} yards: range ${w.range}${bandWords(b)}.${Number(w.accuracy) ? ` Accuracy ${w.accuracy > 0 ? "+" : ""}${w.accuracy}.` : ""} ${key === "firearms" ? "Aiming (Firearms 1 or more, one shot): a die a turn, up to Perception, as Bonus dice; a scope adds 2 the first turn. " : ""}A botch: ${key === "firearms" ? "it jams" : "a wild shot"}.`});
    }
    const tb = rangeBand(yards, THROW_YARDS);
    if ( tb !== null ) out.push({id: "throw", label: "Throw something at it", shot: "throw",
      roll: {attr: "dexterity", attrLabel: "Dexterity", ability: "athletics", abilityLabel: "Athletics", dice: (Number(ch.dexterity) || 0) + ab("athletics"), diff: 6 + tb, need: null},
      seconds: TURN, noise: {success: "quiet", fail: "quiet", botch: "quiet"},
      note: `A stone, a knife, a bottle: ${yards} yards, range ${THROW_YARDS}${bandWords(tb)}. A botch: a wild throw.`});
    if ( ch.inReach && T.strike && o.kind === "dummy" ) {
      const blade = (ch.weapons ?? []).find(x => !x.ranged), key = blade ? "melee" : "brawl";
      out.push({id: "strike", label: blade ? `Strike it with the ${blade.name}` : "Strike it", shot: "strike",
        roll: {attr: "dexterity", attrLabel: "Dexterity", ability: key, abilityLabel: cap(key), dice: (Number(ch.dexterity) || 0) + ab(key) + (blade ? Number(blade.accuracy) || 0 : 0),
          diff: blade ? Number(blade.diff) || 6 : 6, need: null},
        seconds: TURN, noise: {success: "quiet", fail: "quiet", botch: "quiet"}, note: "Each hit counts on the scoreboard. A botch: a stumble."});
    }
    if ( ch.inReach && T.breaks ) {
      const B = OBJECT_BUILDS[o.build], strength = (Number(ch.strength) || 0) + (Number(ch.potence) || 0);
      out.push(forceOption("breakIt", "Break it", strength, ch, B, o.progress.breakIt ?? 0, {note: B.fragile ? "Fragile: any hit from a shot or a throw breaks it too." : ""}));
    }
  }
  if ( Object.keys(o.scores).length ) out.push({id: "scores", label: "Read the scoreboard", roll: null, seconds: 0, noise: {success: "silent"}});
  if ( !out.length ) out.push({id: "rangeNote", label: "Too far away", roll: null, disabled: true, note: `${yards} yards: out of range of anything on the sheet.`});
  return out;
}

/**
 * A mount or vehicle: get on at the reins or as a passenger, get off; at the reins, keep control or go flat out.
 * Not in its era: nothing but a note.
 */
function mountOptions(o, ch) {
  const M = MOUNTS[o.kind], me = ch.actorId ?? "", year = Number(ch.year) || 0;
  if ( M.from && year && year < M.from ) return [{id: "eraNote", label: `No ${M.label.toLowerCase()} yet`, roll: null, disabled: true, note: `Not before about ${M.from}.`}];
  const sk = bestOf(ch.abilities ?? {}, [M.skill]), trained = sk.value > 0;
  const attrDots = Number(ch[M.attr]) || 0, attrLabel = cap(M.attr), skillLabel = cap(M.skill);
  const pool = (base, extra = 0) => ({attr: M.attr, attrLabel, ability: M.skill, abilityLabel: skillLabel, dice: attrDots + sk.value,
    diff: Math.min(10, base + extra), need: null, skill: !!plus});
  const plus = M.skill === "athletics" ? "" : ", +1 difficulty";
  const untrained = trained ? "" : ` No ${skillLabel}: ${attrLabel} alone${plus}.`;
  if ( o.driver?.a === me ) {
    return [
      {id: "control", label: "Keep control", roll: pool(6), seconds: TURN, noise: {success: M.noise, fail: M.noise, botch: "loud"},
        note: `An obstacle, a shy, a skid. Rough ground, rain or crowds: the Storyteller may add to it.${untrained} A botch: ${M.thrown ? "thrown" : "a crash"}.`},
      {id: "flatOut", label: "Go flat out", roll: pool(6, FLAT_OUT), seconds: TURN, noise: {success: "loud", fail: "loud", botch: "loud"},
        note: `At full speed: +${FLAT_OUT} difficulty. A failure: roll Keep control at once.${untrained} A botch: ${M.thrown ? "thrown" : "a crash"}.`},
      {id: "dismount", label: "Get off", roll: null, seconds: TURN, noise: {success: "quiet"}, note: "Whoever else is aboard stays aboard."}
    ];
  }
  if ( o.riders.some(r => r.a === me) ) return [{id: "dismount", label: "Get off", roll: null, seconds: TURN, noise: {success: "quiet"}}];
  const out = [], n = aboard(o).length, full = n >= o.seats;
  if ( !o.driver && !full ) {
    out.push(trained ? {id: "mount", label: M.verb, roll: null, seconds: TURN, noise: {success: M.noise}, note: `${skillLabel} ${sk.value}: no roll at an ordinary pace. Whoever is at the reins moves it by moving their token.`}
      : {id: "mount", label: M.verb, roll: pool(6), seconds: TURN, noise: {success: M.noise, fail: "quiet", botch: "loud"},
        note: `No ${skillLabel}: ${attrLabel} alone${plus} to get it going. A failure: it won't go. A botch: ${M.thrown ? "thrown" : "a scrape or a stall"}.`});
  }
  // A seat is kept for the one at the reins while nobody holds them
  if ( n + (o.driver ? 0 : 1) < o.seats ) out.push({id: "board", label: "Get on as a passenger", roll: null, seconds: TURN, noise: {success: "silent"},
    note: "Carried along when the one at the reins moves. Moving the token away gets off."});
  if ( full ) out.push({id: "fullNote", label: "No room aboard", roll: null, disabled: true, note: `It holds ${o.seats}.`});
  return out;
}

function forceOption(id, label, strength, ch, b, have, {extra = 0, note = "", waits = false} = {}) {
  const need = b.need + extra;
  if ( strength >= b.feat + extra ) return {id, label, roll: null, auto: true, seconds: TURN, noise: {success: "loud"}, waits,
    note: `Strength ${strength} is enough: no roll (lifting chart ${b.feat}). ${note}`.trim()};
  const potence = Number(ch.potence) || 0;
  return {id, label, extended: true, waits, roll: {attr: "strength", attrLabel: "Strength", ability: null, abilityLabel: "", dice: Number(ch.strength) || 0, diff: b.diff, need, have, auto: potence},
    seconds: TURN, noise: {success: "loud", fail: "loud", botch: "loud"}, botchHurts: true,
    note: `${note ? `${note} ` : ""}${potence ? `Potence: ${potence} automatic success${potence === 1 ? "" : "es"} a roll. ` : ""}A botch: one level of lethal damage to the shoulder.`.trim()};
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";

/* ------------------------------------------------------------------ */
/*  What happens                                                       */
/* ------------------------------------------------------------------ */

/**
 * The outcome of an option. rolls: [{successes, botch}] (one per roll; none for an option with no roll).
 * Returns {result: "done"|"progress"|"fail"|"botch", patch: {ds?, flags: {...}}, noise, seconds, text, hurt (lethal levels),
 *          waits (the Storyteller decides), listen (successes, for listening)}.
 * patch.flags holds only the keys that change.
 */
export function resolve(o, option, rolls = [], ctx = {}) {
  const out = resolveCore(o, option, rolls, ctx);
  // A live alarm goes off when the door opens or breaks (modern eras)
  const opens = out.patch.ds === "open" || out.patch.flags?.broken;
  if ( opens && o.electronic !== "none" && !o.beaten && !o.alarm && option.id !== "hack" && isModern(ctx) ) {
    out.patch.flags.alarm = true;
    out.noise = "loud";
    out.text = `${out.text} The alarm goes off.`.trim();
    out.alarm = true;
  }
  return out;
}
function resolveCore(o, option, rolls, {actorId = "", actorName = ""} = {}) {
  const id = option.id, flags = {}, out = {patch: {flags}, hurt: 0, waits: !!option.waits, seconds: 0};
  const noise = option.noise ?? {};
  const done = (text, patch = {}) => Object.assign(out, {result: "done", noise: noise.success ?? "silent", text}, {patch: {...patch, flags}});
  if ( !option.roll ) {
    out.seconds = option.seconds ?? 0;
    switch ( id ) {
      case "open": return done("opens it.", {ds: "open"});
      case "close": return done("closes it.", {ds: "closed"});
      case "unlock": return done("unlocks it with the key.", {ds: "closed"});
      case "lock": return done("locks it with the key.", {ds: "locked"});
      case "unbar": flags.barred = false; return done("lifts the bar.");
      case "knock": return done("knocks.");
      case "take": flags.taken = true; return done("takes what is inside.");
      case "trigger": Object.assign(flags, {armed: false, sprung: true}); return done("sets it off from a safe distance.");
      case "look": return done("looks it over.");
      case "comeOut": out.comesOut = true; return done("comes out of hiding.");
      case "lightOn": out.lights = true; return done(o.kind === "switch" ? "switches the light on." : "lights it.");
      case "lightOff": out.lights = false; return done(o.kind === "switch" ? "switches the light off." : "puts it out.");
      case "breakLight": out.lights = false; flags.broken = true; return done("breaks it, and it goes dark.");
      case "knockOver": Object.assign(flags, {spilled: true, burning: true}); return done("knocks it over, and the fire spreads where it falls.");
      case "putOut": flags.burning = false; return done("puts the fire out.");
      case "alight": flags.burning = true; return done("sets it alight.");
      case "sweep": flags.cleared = true; return done("sweeps a path clear.");
      case "call": out.calls = true; return done("makes a call.");
      case "callHelp": out.raises = "help"; return done("calls for help.");
      case "ringAlarm": out.raises = "alarm"; return done("raises the alarm.");
      case "mount": out.boards = "driver"; return done(o.mount && MOUNTS[o.kind].skill === "drive" ? "gets in and starts it." : "gets on.");
      case "board": out.boards = "rider"; return done("climbs aboard.");
      case "dismount": out.leaves = true; return done("gets off.");
      case "climbEasy": out.arrives = true; return done("climbs it.");
      case "letGo": out.falls = o.depth; flags.hanging = {...o.hanging, [actorId]: false}; return done("lets go, and falls.");
      case "desecrate": flags.desecrated = true; return done("desecrates it.");
      case "powerOff": flags.live = false; if ( o.caught && Object.keys(o.caught).length ) flags.caught = Object.fromEntries(Object.keys(o.caught).map(k => [k, false])); return done("cuts the power.");
      case "powerOn": flags.live = true; return done("turns the power back on.");
      case "cutFree": flags.holding = null; return done("cuts the snare and frees whoever it held.");
      case "smash": flags.broken = true; return done("breaks the pane.", {ds: "open"});
      case "force": flags.progress = {...o.progress, force: 0}; return done("forces it open.", {ds: "open"});
      case "breach": return done("breaks through the wall.");
      case "breakIt": flags.smashed = true; flags.progress = {...o.progress, breakIt: 0}; return done("breaks it.");
      case "setUp": flags.left = o.count; return done("sets them up again.");
      case "scores": out.scores = true; return done("reads the scoreboard.");
      default: return done("");
    }
  }
  const r = option.roll;
  if ( !option.extended ) {
    const roll = rolls[0] ?? {successes: 0, botch: false};
    out.seconds = option.seconds ?? 0;
    if ( option.shot ) return Object.assign(out, shotOutcome(o, option, roll, flags, {actorId, actorName}));
    const key = `${actorId}:${id}`;
    if ( roll.botch || roll.successes <= 0 ) flags.tries = {...o.tries, [key]: (Number(o.tries?.[key]) || 0) + 1};
    if ( id === "examine" ) {
      const got = roll.botch ? 0 : Math.max(0, roll.successes);
      const key = actorId || "?";
      flags.seen = {...o.seen, [key]: Math.max(Number(o.seen?.[key]) || 0, got)};
      if ( roll.botch || got <= 0 ) flags.tries = {...o.tries, [`${actorId}:examine`]: (Number(o.tries?.[`${actorId}:examine`]) || 0) + 1};
      return Object.assign(out, {result: roll.botch ? "botch" : got > 0 ? "done" : "fail", noise: "silent", examine: roll.botch ? -1 : flags.seen[key],
        text: roll.botch ? "examines it, and is sure of what it means." : got > 0 ? "examines it closely." : "examines it, and finds nothing more."});
    }
    if ( id === "hide" ) {
      const got = roll.botch ? 0 : Math.max(0, roll.successes);
      if ( got <= 0 ) flags.tries = {...o.tries, [`${actorId}:hide`]: (Number(o.tries?.[`${actorId}:hide`]) || 0) + 1};
      return Object.assign(out, {result: roll.botch ? "botch" : got > 0 ? "done" : "fail", hides: got, noise: roll.botch ? noise.botch : got > 0 ? noise.success : noise.fail,
        text: roll.botch ? "hides, knocking something over." : got > 0 ? "hides." : "hides, but not well."});
    }
    if ( id === "watch" ) {
      return Object.assign(out, {result: roll.botch ? "botch" : roll.successes > 0 ? "done" : "fail", noise: "silent", watch: roll,
        text: roll.botch ? "looks, and is sure of something." : roll.successes > 0 ? "keeps watch." : "keeps watch, but makes out little."});
    }
    if ( id === "mount" || id === "control" || id === "flatOut" ) {
      const M = MOUNTS[o.kind] ?? MOUNTS.horse, ok = roll.successes > 0 && !roll.botch;
      if ( roll.botch ) {
        if ( id === "mount" ) return Object.assign(out, {result: "botch", noise: noise.botch, mishap: M.thrown ? "thrown" : "stall",
          text: M.thrown ? "tries to get on, and is thrown." : "tries to get it going, and stalls it or scrapes something."});
        if ( M.thrown ) { out.leaves = true; return Object.assign(out, {result: "botch", noise: noise.botch, mishap: "thrown", text: "loses control, and is thrown."}); }
        return Object.assign(out, {result: "botch", noise: noise.botch, mishap: "crash", text: "loses control, and crashes."});
      }
      if ( id === "mount" ) {
        if ( ok ) out.boards = "driver";
        return Object.assign(out, {result: ok ? "done" : "fail", noise: ok ? noise.success : noise.fail, text: ok ? "gets it going." : "can't get it to go."});
      }
      if ( ok ) return Object.assign(out, {result: "done", noise: noise.success, text: id === "flatOut" ? "goes flat out, and keeps control." : "keeps control."});
      return Object.assign(out, {result: "fail", noise: noise.fail, slips: true,
        text: id === "flatOut" ? "goes flat out, and starts to lose control: roll Keep control." : "starts to lose control: roll again."});
    }
    if ( id === "jump" ) {
      if ( roll.botch ) return Object.assign(out, {result: "botch", noise: noise.botch, falls: o.depth, text: "jumps, and goes straight down."});
      if ( roll.successes >= o.gap ) return Object.assign(out, {result: "done", noise: noise.success, arrives: true, text: "jumps it, and lands on the far side."});
      flags.hanging = {...o.hanging, [actorId]: true};
      return Object.assign(out, {result: "fail", noise: noise.fail, text: `falls short (${Math.max(0, roll.successes)} of ${o.gap}) and grabs for the edge: roll Catch the ledge.`});
    }
    if ( id === "catchLedge" ) {
      flags.hanging = {...o.hanging, [actorId]: false};
      if ( roll.successes > 0 && !roll.botch ) return Object.assign(out, {result: "done", noise: noise.success, arrives: true, text: "catches the ledge and pulls up."});
      return Object.assign(out, {result: roll.botch ? "botch" : "fail", noise: noise.fail, falls: o.depth, text: "loses the grip, and falls."});
    }
    if ( id === "searchHide" ) {
      return Object.assign(out, {result: roll.botch ? "botch" : roll.successes > 0 ? "done" : "fail", noise: noise.success, searchHide: roll,
        text: roll.successes > 0 && !roll.botch ? "searches it." : "searches it, and finds nobody."});
    }
    if ( id === "search" ) {
      return Object.assign(out, {result: roll.botch ? "botch" : roll.successes > 0 ? "done" : "fail", noise: "silent", search: roll,
        text: roll.successes > 0 && !roll.botch ? "searches the area." : "searches the area, and finds nothing."});
    }
    if ( id === "disarm" || id === "rearm" ) {
      if ( roll.botch ) { out.springs = true; return Object.assign(out, {result: "botch", noise: noise.botch, text: "botches, and sets it off."}); }
      if ( roll.successes > 0 ) {
        if ( id === "disarm" ) flags.armed = false; else Object.assign(flags, {armed: true, sprung: false, holding: null});
        return Object.assign(out, {result: "done", noise: "silent", text: id === "disarm" ? "disarms it." : "sets it again."});
      }
      return Object.assign(out, {result: "fail", noise: "silent", text: id === "disarm" ? "can't work out how to make it safe." : "can't get it to set."});
    }
    if ( id === "putOut" ) {
      if ( roll.botch ) return Object.assign(out, {result: "botch", noise: noise.botch, burns: true, text: "fights the fire, and is burned."});
      if ( roll.successes > 0 ) { flags.burning = false; return Object.assign(out, {result: "done", noise: noise.success, text: "beats the fire out."}); }
      return Object.assign(out, {result: "fail", noise: noise.fail, text: "fights the fire, and it keeps burning."});
    }
    if ( id === "pullFree" ) {
      if ( roll.successes > 0 && !roll.botch ) { flags.caught = {...o.caught, [actorId]: false}; return Object.assign(out, {result: "done", noise: noise.success, text: "pulls free of the current."}); }
      return Object.assign(out, {result: roll.botch ? "botch" : "fail", noise: noise.fail, text: "can't let go of it."});
    }
    if ( id === "breakFree" ) {
      if ( roll.successes > 0 && !roll.botch ) { flags.holding = null; return Object.assign(out, {result: "done", noise: noise.success, text: "breaks free of the snare."}); }
      return Object.assign(out, {result: roll.botch ? "botch" : "fail", noise: noise.fail, text: "struggles, and stays caught."});
    }
    if ( id === "listen" ) {
      Object.assign(out, {result: roll.botch ? "botch" : roll.successes > 0 ? "done" : "fail", noise: "silent", listen: roll.botch ? -1 : roll.successes,
        text: roll.botch ? "listens, and is sure of something." : roll.successes > 0 ? "listens at it." : "listens, but makes out nothing."});
      return out;
    }
    if ( id === "openQuiet" ) {
      if ( roll.botch ) return Object.assign(out, {result: "botch", noise: noise.botch, text: "opens it, loudly.", patch: {ds: "open", flags}});
      if ( roll.successes > 0 ) return Object.assign(out, {result: "done", noise: noise.success, text: "opens it without a sound.", patch: {ds: "open", flags}});
      return Object.assign(out, {result: "fail", noise: noise.fail, text: "opens it, but not quietly.", patch: {ds: "open", flags}});
    }
    if ( id === "unstick" ) {
      const pane = o.material === "glass" || o.material === "horn";
      if ( roll.botch ) {
        if ( pane && o.kind === "window" ) { flags.broken = true; flags.stuck = false; return Object.assign(out, {result: "botch", noise: "loud", text: "heaves, and the pane breaks.", patch: {ds: "open", flags}}); }
        return Object.assign(out, {result: "botch", noise: "loud", text: "heaves at it with a crash, and it stays shut.", patch: {flags}});
      }
      if ( roll.successes > 0 ) { flags.stuck = false; return Object.assign(out, {result: "done", noise: noise.success, text: "heaves it open.", patch: {ds: "open", flags}}); }
      return Object.assign(out, {result: "fail", noise: noise.fail, text: "heaves at it, and it stays stuck.", patch: {flags}});
    }
    return Object.assign(out, {result: roll.successes > 0 ? "done" : "fail", noise: noise.success, text: ""});
  }
  // Extended: successes add up on the object until enough are in; a botch loses them all (V20 Dark Ages p. 324)
  const slot = id === "pick" ? "pick" : id === "hack" ? "hack" : id === "breach" ? "breach" : id === "climb" ? `climb:${actorId}` : id === "breakIt" ? "breakIt" : "force";
  let have = Number(r.have) || 0, botched = false;
  for ( const roll of rolls ) {
    out.seconds += option.seconds ?? 0;
    if ( roll.botch ) { out.climbed = have; have = 0; botched = true; break; }
    have += Math.max(0, roll.successes);
    if ( have >= r.need ) break;
  }
  const finished = !botched && have >= r.need;
  flags.progress = {...o.progress, [slot]: finished ? 0 : have};
  if ( botched ) {
    out.result = "botch"; out.noise = noise.botch ?? "silent";
    if ( slot === "pick" ) { flags.jammed = true; out.text = "botches: the pick snaps in the lock and jams it."; }
    else if ( slot === "hack" ) { flags.alarm = true; out.text = "botches: the alarm goes off."; }
    else if ( id === "climb" ) {
      const per = CLIMBS[o.kind]?.per ?? 3;
      out.falls = Math.min(o.height, Math.max(3, Math.round(out.climbed * per * 3)));
      out.text = `slips, and falls ${out.falls} feet.`;
    }
    else { out.hurt = option.botchHurts ? 1 : 0; out.text = "botches, and is hurt (one lethal level)."; }
    return out;
  }
  if ( finished ) {
    out.result = "done"; out.noise = noise.success ?? "silent";
    if ( slot === "pick" ) { out.text = "picks the lock."; out.patch.ds = "closed"; }
    else if ( slot === "hack" ) { flags.beaten = true;
      const opens = o.ds === "locked" && o.lock === "none";
      out.text = opens ? "beats the keypad: the lock clicks open." : "beats the alarm: it stays quiet.";
      if ( opens ) out.patch.ds = "closed";
    }
    else if ( slot === "breach" ) out.text = "breaks through the wall.";
    else if ( id === "climb" ) { out.text = "climbs it."; out.arrives = true; }
    else if ( slot === "breakIt" ) { flags.smashed = true; out.text = "breaks it."; }
    else { out.text = "forces it open."; out.patch.ds = "open"; if ( o.barred ) flags.barred = false; if ( o.ds === "locked" && o.lock !== "none" ) flags.lockBroken = true; }
    return out;
  }
  out.result = have > (Number(r.have) || 0) ? "progress" : "fail";
  out.noise = (out.result === "progress" ? noise.success : noise.fail) ?? "silent";
  out.text = `${out.result === "progress" ? "makes headway" : "gets nowhere"}: ${have} of ${r.need} successes.`;
  return out;
}

/** A shot, a throw or a blow at a target: the result, the text and the scoreboard. */
function shotOutcome(o, option, roll, flags, {actorId = "", actorName = ""} = {}) {
  const noise = option.noise ?? {}, s = roll.botch ? 0 : Math.max(0, Number(roll.successes) || 0);
  const prev = o.scores?.[actorId] ?? {};
  const score = {n: actorName || prev.n || "Someone", shots: (Number(prev.shots) || 0) + 1, hits: Number(prev.hits) || 0, pts: Number(prev.pts) || 0, best: Number(prev.best) || 0};
  const res = {noise: roll.botch ? noise.botch : s ? noise.success : noise.fail};
  const verb = option.shot === "strike" ? "strikes at it" : option.shot === "throw" ? "throws" : "shoots";
  if ( roll.botch ) {
    res.result = "botch";
    if ( option.shot === "gun" ) { res.text = "botches: the gun jams."; res.mishap = "jam"; }
    else if ( option.shot === "strike" ) res.text = "botches, and stumbles.";
    else { res.text = option.shot === "throw" ? "botches: a wild throw." : "botches: a wild shot."; res.wild = true; }
  } else if ( !s ) { res.result = "fail"; res.text = `${verb}, and misses.`; }
  else {
    res.result = "done"; score.hits += 1;
    if ( o.kind === "mark" ) {
      const ring = ringFor(s);
      score.pts += ring.pts; score.best = Math.max(score.best, ring.pts);
      res.text = `${verb}, and hits the ${ring.label} (${ring.pts} point${ring.pts === 1 ? "" : "s"}).`;
      res.ring = ring.label;
    } else if ( o.kind === "bottles" ) {
      flags.left = Math.max(0, o.left - 1);
      res.text = flags.left ? `${verb}, and knocks one down: ${flags.left} left.` : `${verb}, and knocks the last one down.`;
      if ( res.noise === "silent" ) res.noise = "quiet";
    } else if ( o.kind === "object" ) {
      if ( OBJECT_BUILDS[o.build]?.fragile && option.shot !== "strike" ) { flags.smashed = true; res.text = `${verb}, and it shatters.`; if ( res.noise === "silent" ) res.noise = "quiet"; }
      else res.text = `${verb}, and hits it: it holds. Breaking it takes Break it, up close.`;
    } else {
      flags.hits = o.hits + 1;
      res.text = option.shot === "strike" ? `lands a blow (${s} success${s === 1 ? "" : "es"}).` : `${verb}, and hits it.`;
    }
  }
  flags.scores = {...o.scores, [actorId || "?"]: score};
  return res;
}

/** What a listener at a door makes out. beyond: [{moving: bool}] the people within hearing on the far side. */
export function listenText(successes, beyond = []) {
  if ( successes < 0 ) return "You hear nothing you can be sure of.";
  if ( successes === 0 ) return "You make out nothing through it.";
  const n = beyond.length;
  if ( successes === 1 ) return n ? "Someone is on the other side." : "You hear nobody on the other side.";
  if ( !n ) return "It is quiet on the other side: nobody there, or nobody moving.";
  const count = n === 1 ? "One person" : n <= 3 ? `${["", "", "Two", "Three"][n]} people` : "Several people";
  if ( successes === 2 ) return `${count} on the other side.`;
  const moving = beyond.filter(b => b.moving).length;
  return `${count} on the other side, ${moving ? `${moving === n ? "all" : "some"} moving about` : "keeping still"}${beyond.some(b => b.talking) ? ", and voices" : ""}.`;
}

/**
 * Whether someone hears a noise. yards: the distance; walls: how many sound-stopping walls are between; asleep.
 * Loud within earshot is heard by anyone awake. A quiet noise, or a loud one heard in sleep, needs Perception +
 * Alertness (difficulty 7 quiet, 8 asleep). Returns {inRange, hears, roll}.
 */
export function hears(noise, {yards = 0, walls = 0, asleep = false, perception = 2, alertness = 0} = {}, rng = Math.random) {
  const e = EARSHOT[noise] ?? EARSHOT.silent;
  const range = walls === 0 ? e.open : walls === 1 ? e.wall : 0;
  if ( range <= 0 || yards > range ) return {inRange: false, hears: false};
  if ( noise === "loud" && !asleep ) return {inRange: true, hears: true};
  const diff = asleep ? 8 : 7;
  const dice = Math.max(1, perception + alertness);
  let hits = 0, ones = 0;
  for ( let k = 0; k < dice; k++ ) { const f = 1 + Math.floor(rng() * 10); if ( f >= diff ) hits++; if ( f === 1 ) ones++; }
  return {inRange: true, hears: hits - ones > 0, roll: {dice, diff, successes: Math.max(0, hits - ones)}};
}

/** Clean a wall's WoDX settings from the config form. */
export function cleanSettings(s = {}) {
  const out = {};
  out.kind = KINDS[s.kind] ? s.kind : "door";
  out.material = MATERIALS[s.material] ? s.material : "";
  out.build = BUILDS[s.build] ? s.build : "";
  out.lock = LOCKS[s.lock] ? s.lock : "";
  out.electronic = ELECTRONIC[s.electronic] ? s.electronic : "none";
  out.barSide = s.barSide === "a" || s.barSide === "b" ? s.barSide : "";
  out.barred = !!s.barred;
  out.stuck = !!s.stuck;
  out.found = !!s.found;
  out.keyName = String(s.keyName ?? "").slice(0, 80).trim();
  out.wall = WALLS[s.wall] ? s.wall : "";
  return out;
}

/** Clean a tile's container settings from the config form. */
export function cleanContainer(s = {}) {
  return {
    container: !!s.container,
    kind: CONTAINERS[s.kind] ? s.kind : "chest",
    material: MATERIALS[s.material] && !["glass", "horn"].includes(s.material) ? s.material : "",
    lock: LOCKS[s.lock] ? s.lock : "",
    electronic: ELECTRONIC[s.electronic] ? s.electronic : "none",
    keyName: String(s.keyName ?? "").slice(0, 80).trim(),
    items: parseItems(s.items).join("\n")
  };
}

/** Clean a tile's trap settings from the config form. */
export function cleanTrap(s = {}) {
  const dice = s.dice === "" || s.dice === null || s.dice === undefined ? "" : Math.max(0, Math.min(20, Math.round(Number(s.dice) || 0)));
  return {
    trap: !!s.trap,
    trapKind: TRAPS[s.trapKind] ? s.trapKind : "snare",
    grade: TRAP_GRADES[s.grade] ? s.grade : "good",
    dice, damageType: DAMAGE_TYPES[s.damageType] ? s.damageType : "",
    armed: s.armed !== false && !s.sprung, found: !!s.found, npcs: !!s.npcs
  };
}

/** Clean a tile's clue settings from the config form. */
export function cleanClue(s = {}) {
  const t = k => String(s[k] ?? "").slice(0, 4000);
  return {clue: !!s.clue, clueKind: CLUES[s.clueKind] ? s.clueKind : "document", title: String(s.title ?? "").slice(0, 80).trim(),
    need: Math.max(1, Math.min(5, Math.round(Number(s.need) || 1))), found: !!s.found, text0: t("text0"), text1: t("text1"), text2: t("text2"), text3: t("text3")};
}

/** Clean a tile's light settings from the config form. lightIds: the ids of the scene lights it works, comma separated. */
export function cleanLight(s = {}) {
  const ids = String(s.lightIds ?? "").split(/[\s,;]+/).map(x => x.trim()).filter(x => /^[A-Za-z0-9]{1,32}$/.test(x)).slice(0, 20);
  return {light: !!s.light, lightKind: LIGHTS[s.lightKind] ? s.lightKind : "torch", lightIds: ids.join(", "), broken: !!s.broken};
}

/** Clean a tile's hiding-place settings from the config form. */
export function cleanHide(s = {}) {
  const kind = HIDES[s.hideKind] ? s.hideKind : "wardrobe";
  const room = s.room === "" || s.room === null || s.room === undefined ? "" : Math.max(1, Math.min(12, Math.round(Number(s.room) || 1)));
  return {hide: !!s.hide, hideKind: kind, room};
}

/** Clean a tile's hazard settings from the config form. */
export function cleanHazard(s = {}) {
  const dice = s.hazDice === "" || s.hazDice === null || s.hazDice === undefined ? "" : Math.max(0, Math.min(20, Math.round(Number(s.hazDice) || 0)));
  return {hazard: !!s.hazard, hazardKind: HAZARDS[s.hazardKind] ? s.hazardKind : "fire", size: FIRE_SIZES[s.size] ? s.size : "small",
    heat: FIRE_HEAT[s.heat] ? s.heat : "torch", shock: SHOCKS[s.shock] ? s.shock : "minor", hazDice: dice, hazType: DAMAGE_TYPES[s.hazType] ? s.hazType : "",
    burning: s.burning !== false, spilled: !!s.spilled, cleared: !!s.cleared, live: s.live !== false, pcsOnly: !!s.pcsOnly};
}

/** Clean a tile's altar, relic or fetish settings from the config form. */
export function cleanSacred(s = {}) {
  const kind = SACRED[s.sacredKind] ? s.sacredKind : "altar";
  const top = kind === "fetish" ? 10 : 5;
  return {sacred: !!s.sacred, sacredKind: kind, rating: Math.max(1, Math.min(top, Math.round(Number(s.rating) || (kind === "fetish" ? 5 : 1)))),
    desecrated: !!s.desecrated, sacredItems: parseItems(s.sacredItems).join("\n")};
}

/** Clean a tile's mount or vehicle settings from the config form. */
export function cleanMount(s = {}) {
  const seats = s.seats === "" || s.seats === null || s.seats === undefined ? "" : Math.max(1, Math.min(40, Math.round(Number(s.seats) || 1)));
  return {mount: !!s.mount, mountKind: MOUNTS[s.mountKind] ? s.mountKind : "horse", seats};
}

/** Clean a tile's climb or gap settings from the config form. */
export function cleanClimb(s = {}) {
  const o = describeClimb({...s, climbKind: s.climbKind});
  const blank = v => v === "" || v === null || v === undefined;
  return {climb: !!s.climb, climbKind: o.kind, height: blank(s.height) ? "" : o.height, gap: blank(s.gap) ? "" : o.gap, depth: blank(s.depth) ? "" : o.depth, climbTo: o.climbTo};
}

/** Clean a tile's watch point settings from the config form. target: the id of the tile it looks at or calls. */
export function cleanWatch(s = {}) {
  const target = String(s.target ?? "").trim();
  return {watch: !!s.watch, watchKind: WATCHES[s.watchKind] ? s.watchKind : "window", target: /^[A-Za-z0-9.]{1,200}$/.test(target) ? target : ""};
}

/** Clean a tile's target settings from the config form. */
export function cleanTarget(s = {}) {
  const o = describeTarget(s);
  const blank = v => v === "" || v === null || v === undefined;
  return {isTarget: !!s.isTarget, targetKind: o.kind, objBuild: o.build, bottles: blank(s.bottles) ? "" : o.count, smashed: o.broken};
}

/**
 * A haven's security (WoDX Storyteller's haven record on the scene): each dot of security adds 1 to the difficulty
 * of anyone who is not its owner or a guest breaking in (V20 pp. 112-113, Domain). Only breaking-in rolls count.
 */
export const INTRUDING = new Set(["pick", "smash", "hack", "disarm", "climb", "climbEasy"]);
export function havenSecurity(haven, actorId, opId) {
  if ( !haven || !INTRUDING.has(opId) ) return 0;
  const inside = [...(haven.owners ?? []), ...(haven.guests ?? [])];
  if ( actorId && inside.includes(actorId) ) return 0;
  return Math.max(0, Math.min(5, Math.round(Number(haven.security) || 0)));
}
