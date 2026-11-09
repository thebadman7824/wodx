/**
 * WoDX Interactables: the rules for doors, locks, windows and walls that can be broken through. Pure functions, no
 * Foundry calls, so the harness can test every pool, grade, noise and outcome.
 *
 * The rolls are the dramatic systems WoDX Actions already uses (V20 Dark Ages pp. 322-339: intrusion, forcing a door,
 * the lifting chart, noticing). V20 core page refs: TODO, to be pinned from the book texts on the PC (rule 5).
 * Lock grades, the successes each needs, the time per roll and how far noise carries are house readings of those
 * systems; docs/DECISIONS.md records them.
 */

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
/** A short name for an interactable: "Locked iron-bound door", "Open window". */
export function nameOf(o) {
  if ( o.breakable && !o.door ) return `${WALLS[o.breakable].label} wall`;
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
    if ( o.jammed ) out.push({id: "jammed", label: "The lock is jammed", roll: null, disabled: true, note: "Nobody can pick it now; force it, or ask the Storyteller."});
    else if ( barredAgainst ) out.push({id: "barredNote", label: "Barred from the other side", roll: null, disabled: true, note: "Picking the lock will not lift the bar."});
    else {
      const L = LOCKS[o.lock], sk = lockSkill(ch.abilities, ch);
      const diff = Math.min(10, L.diff + (ch.hasTools ? 0 : NO_TOOLS_DIFF));
      out.push({id: "pick", label: `Pick the lock (${L.label.toLowerCase()})`, extended: true,
        roll: {attr: "dexterity", attrLabel: "Dexterity", ability: sk.key, abilityLabel: cap(sk.key), dice: (Number(ch.dexterity) || 0) + sk.value, diff, need: L.need, have: o.progress.pick ?? 0},
        seconds: L.seconds, noise: {success: "quiet", fail: "quiet", botch: "quiet"},
        note: `${ch.hasTools ? "" : `No picks or tools: +${NO_TOOLS_DIFF} difficulty. `}A botch jams the lock and loses the progress.`});
    }
  }
  if ( o.electronic !== "none" && isModern(ch) && !isOpen && !o.alarm && !o.beaten ) {
    const E = ELECTRONIC[o.electronic], sk = electronicSkill(ch.abilities);
    out.push({id: "hack", label: `Beat the keypad or alarm (${E.label.toLowerCase()})`, extended: true,
      roll: {attr: "intelligence", attrLabel: "Intelligence", ability: sk.key, abilityLabel: cap(sk.key), dice: (Number(ch.intelligence) || 0) + sk.value, diff: E.diff, need: E.need, have: o.progress.hack ?? 0},
      seconds: E.seconds, noise: {success: "silent", fail: "silent", botch: "loud"}, note: "A botch sets off the alarm."});
  }
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
