/**
 * WoDX Interactables: the rules for doors, locks, windows and walls that can be broken through. Pure functions, no
 * Foundry calls, so the harness can test every pool, grade, noise and outcome.
 *
 * The rolls are the dramatic systems WoDX Actions already uses (V20 Dark Ages pp. 322-339: intrusion, forcing a door,
 * the lifting chart, noticing). V20 core page refs: TODO, to be pinned from the book texts on the PC (rule 5).
 * Lock grades, the successes each needs, the time per roll and how far noise carries are house readings of those
 * systems; docs/DECISIONS.md records them.
 */
import {FIRE_HEAT as ACTIONS_FIRE_HEAT} from "../../wodx-actions/scripts/rules.js";
import {holy as demonHoly} from "../../wodx-actions/scripts/demon-rules.js";

export const TURN = 3; // seconds in a turn (V20 Dark Ages p. 322)
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
 * pp. 322-339); falling damage follows the core falling rules (V20 core page ref: TODO, rule 5).
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
 * contest, read as a roll now and a search later: a house rule; V20 page ref to pin, rule 5); every two successes add one to the
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
 * electrocution levels (page ref to pin). Broken glass, caltrops and thorns are a house rule: dice of lethal damage,
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
    return {mode: "levels", amount: L, type: o.type, fireSun: false, soakDiff: 6, text: `is jolted by the current (${L} levels).`, notes: []};
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
export function nameOf(o) {
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
    out.push(o.live ? {id: "powerOff", label: "Cut the power", roll: null, seconds: TURN, noise: {success: "silent"}, note: "At the switch, the fuse box or the breaker."}
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
function resolveCore(o, option, rolls, {actorId = ""} = {}) {
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
      case "desecrate": flags.desecrated = true; return done("desecrates it.");
      case "powerOff": flags.live = false; return done("cuts the power.");
      case "powerOn": flags.live = true; return done("turns the power back on.");
      case "cutFree": flags.holding = null; return done("cuts the snare and frees whoever it held.");
      case "smash": flags.broken = true; return done("breaks the pane.", {ds: "open"});
      case "force": flags.progress = {...o.progress, force: 0}; return done("forces it open.", {ds: "open"});
      case "breach": return done("breaks through the wall.");
      default: return done("");
    }
  }
  const r = option.roll;
  if ( !option.extended ) {
    const roll = rolls[0] ?? {successes: 0, botch: false};
    out.seconds = option.seconds ?? 0;
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
  const slot = id === "pick" ? "pick" : id === "hack" ? "hack" : id === "breach" ? "breach" : "force";
  let have = Number(r.have) || 0, botched = false;
  for ( const roll of rolls ) {
    out.seconds += option.seconds ?? 0;
    if ( roll.botch ) { have = 0; botched = true; break; }
    have += Math.max(0, roll.successes);
    if ( have >= r.need ) break;
  }
  const finished = !botched && have >= r.need;
  flags.progress = {...o.progress, [slot]: finished ? 0 : have};
  if ( botched ) {
    out.result = "botch"; out.noise = noise.botch ?? "silent";
    if ( slot === "pick" ) { flags.jammed = true; out.text = "botches: the pick snaps in the lock and jams it."; }
    else if ( slot === "hack" ) { flags.alarm = true; out.text = "botches: the alarm goes off."; }
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
    else { out.text = "forces it open."; out.patch.ds = "open"; if ( o.barred ) flags.barred = false; if ( o.ds === "locked" && o.lock !== "none" ) flags.lockBroken = true; }
    return out;
  }
  out.result = have > (Number(r.have) || 0) ? "progress" : "fail";
  out.noise = (out.result === "progress" ? noise.success : noise.fail) ?? "silent";
  out.text = `${out.result === "progress" ? "makes headway" : "gets nowhere"}: ${have} of ${r.need} successes.`;
  return out;
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
