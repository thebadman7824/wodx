/**
 * WoDX Combat 3.12.0: ways of moving (flying, swimming, climbing, crawling, jumping, going into the ground, passing
 * through walls), deep water with held breath and drowning, falls when flight ends, and height in range and reach.
 * Pure, no Foundry calls; movement.js does the Foundry side.
 *
 * Book rules: falling damage (VtDA20 p. 355, rules.js fallingDamage in WoDX Actions), drowning at one lethal level a
 * turn (Hunter: The Reckoning pdf 208), swimming needs Athletics 1 (VtDA20 p. 100), a climb of 3 yards a success on
 * an average surface (the Climbing check), a jump of 1 yard across or 20 inches up a success (the Jumping check).
 * Everything else here is a house rule (B940-B945): the speeds of flying, swimming, climbing and crawling, how long
 * breath lasts, and which powers grant which way of moving.
 */

/** The ways a token moves. Foundry's own movement actions where they exist; "phase" is WoDX's. */
export const MODES = {
  walk:   {label: "Walk", icon: "fa-solid fa-person-walking"},
  fly:    {label: "Fly", icon: "fa-solid fa-dove"},
  swim:   {label: "Swim", icon: "fa-solid fa-person-swimming"},
  climb:  {label: "Climb", icon: "fa-solid fa-person-hiking"},
  crawl:  {label: "Crawl", icon: "fa-solid fa-person-praying"},
  jump:   {label: "Jump", icon: "fa-solid fa-person-running"},
  burrow: {label: "Into the ground", icon: "fa-solid fa-mound"},
  phase:  {label: "Through walls", icon: "fa-solid fa-ghost"}
};
export const modeOf = m => (MODES[m] ? m : "walk");

/**
 * Powers and forms that grant a way of moving, matched on the name and description of an active effect on the actor.
 * Rise (the effect keyword) and these names give flight; the rest give the named way. "Halt the Coward's Flight" and
 * "Soul's Flight" are not flight and are kept out.
 */
export const GRANTS = {
  fly: [/\bphantom wings\b/, /\bwings of (rage|pegasus)\b/, /\bspirit of the bird\b/, /\bsky running\b/, /\bwind runner\b/,
    /\bcloud[- ]walking\b/, /\bchiropteran marauder\b/, /\b(bat|bats|raven|owl|hawk|crow|bird)\b/, /\bwings\b/, /\bflight\b/, /\bflying\b/, /\blevitat/],
  wallwalk: [/\bsurface attunement\b/, /\bmanipulate adhesion\b/, /\bmonkey tail\b/, /\bspider/, /\bwall[- ]walk/],
  waterwalk: [/\bsurface attunement\b/, /\bgrip the water\b/, /\bwater[- ]walk/],
  swimfast: [/\bsalmon swim\b/, /\b(fish|seal|otter|eel|shark)\b/, /\bgills\b/],
  waterbreath: [/\bgills\b/, /\bwater[- ]breath/, /\bbreathe water\b/],
  leap: [/\bhare'?s leap\b/, /\bgreat leap\b/, /\bleap of rage\b/],
  phase: [/\btenebrous (form|avatar)\b/, /\bmist form\b/, /\blurking mists\b/, /\bspectral body\b/, /\bincorporeal passage\b/, /\bshape of mist\b/],
  meld: [/\bearth meld\b/, /\bmeld with the earth\b/]
};
const NOT_FLIGHT = /\b(coward'?s flight|soul'?s flight|flight from|in flight from|flight of the)\b/;

/**
 * What an actor's effects and flags let it do. effects: [{name, description, key}] of the actor's live effects
 * (key: the WoDX Chronicle timed key, "wodx-effect-rise" for Rise). flags: the actor's wodx-combat "moves" flag,
 * {fly, swim, wallwalk, waterwalk, waterbreath, phase, burrow, flySpeed} set by the Storyteller for creatures that
 * always have them (a gargoyle, a spirit, a fish).
 */
export function abilities(effects = [], flags = {}) {
  const got = {fly: !!flags.fly, wallwalk: !!flags.wallwalk, waterwalk: !!flags.waterwalk, swimfast: !!flags.swim,
    waterbreath: !!flags.waterbreath, leap: false, phase: !!flags.phase, meld: false, burrow: !!flags.burrow,
    flySpeed: Number(flags.flySpeed) || null, why: {}};
  const notFlight = [...GRANTS.wallwalk, ...GRANTS.waterwalk, ...GRANTS.leap];
  for ( const e of effects ) {
    const text = `${e?.name ?? ""} ${e?.description ?? ""}`.toLowerCase();
    for ( const [k, pats] of Object.entries(GRANTS) ) {
      if ( k !== "fly" && pats.some(p => p.test(text)) ) { got[k] = true; got.why[k] ??= e?.name ?? ""; }
    }
    // Rise flies, unless it came from a leap or a wall or water walk (those powers carry the Rise keyword too)
    const rise = e?.key === "wodx-effect-rise" && !notFlight.some(p => p.test(text));
    const named = GRANTS.fly.some(p => p.test(text)) && !NOT_FLIGHT.test(text) && !notFlight.some(p => p.test(text));
    if ( rise || named ) { got.fly = true; got.why.fly ??= e?.name || "Rise"; }
  }
  return got;
}

/** Profiles (wodx-combat profiles.js) that never breathe: the dead and spirits. Kuei-jin are caught by variant. */
export const NO_BREATH = ["kindred", "wraith", "spirit"];
export const breathes = (profile, variant = "") => !NO_BREATH.includes(profile) && !/kuei-?jin|hsien-?gui|gargoyle|revenant ghost/i.test(String(variant));

/**
 * Who can use a way of moving (house rule B940). ab: abilities(); athletics: dots; gm: the Storyteller (always may).
 * {ok, why}
 */
export function canUse(mode, ab = {}, {athletics = 0, gm = false} = {}) {
  const m = modeOf(mode);
  if ( gm ) return {ok: true, why: ""};
  switch ( m ) {
    case "fly": return ab.fly ? {ok: true, why: ""} : {ok: false, why: "flying needs a power, form or wings that grant it"};
    case "phase": return ab.phase ? {ok: true, why: ""} : {ok: false, why: "passing through walls needs a power or form that grants it"};
    case "burrow": return ab.burrow || ab.meld ? {ok: true, why: ""} : {ok: false, why: "going into the ground needs Earth Meld or a power like it"};
    case "swim": return {ok: true, why: athletics < 1 && !ab.swimfast ? "no Athletics: the swimmer struggles and sinks" : ""};
    default: return {ok: true, why: ""};
  }
}

/**
 * Yards a turn for a way of moving. base: movement() in auto.js ({walk, jog, run}). The walk mode keeps the walk,
 * jog and run paces; the others have one limit.
 *   fly:    the run, or the power's own speed (house rule)
 *   swim:   half the jog; jog with a swimming power; 1 yard with no Athletics (house rule)
 *   climb:  3 yards, an average climb's success; walking pace for wall-walkers (house rule)
 *   crawl:  3 yards, or the walk if less (house rule)
 *   jump:   the yards the last Jumping roll gave (1 a success)
 *   burrow: none: Earth Meld does not move through the ground
 *   phase:  the walk (house rule)
 */
export function speedFor(mode, base = {walk: 7, jog: 14, run: 26}, ab = {}, {athletics = 0, jumpYards = 0} = {}) {
  const m = modeOf(mode), walk = Math.max(0, Number(base.walk) || 0), jog = Math.max(0, Number(base.jog) || 0), run = Math.max(0, Number(base.run) || 0);
  if ( run === 0 ) return 0;
  switch ( m ) {
    case "fly": return ab.flySpeed ? Math.max(1, ab.flySpeed) : run;
    case "swim": return ab.swimfast ? jog : athletics < 1 ? 1 : Math.max(1, Math.floor(jog / 2));
    case "climb": return ab.wallwalk ? walk : Math.min(3, walk || 3);
    case "crawl": return Math.min(3, walk);
    case "jump": return Math.max(0, Number(jumpYards) || 0) * (ab.leap ? 2 : 1);
    case "burrow": return ab.burrow ? Math.min(3, walk) : 0;
    case "phase": return walk;
    default: return run;
  }
}

/* ------------------------------------------------------------------ */
/*  Height                                                             */
/* ------------------------------------------------------------------ */

/** Scene distance units → feet (elevation is in the scene's units). */
export function toFeet(distance, units = "ft") {
  const u = String(units ?? "").toLowerCase().trim(), d = Number(distance) || 0;
  if ( ["ft", "feet", "foot", "'"].includes(u) ) return d;
  if ( ["yd", "yard", "yards", "m", "meter", "meters", "metre", "metres", ""].includes(u) ) return d * 3;
  if ( ["mi", "mile", "miles"].includes(u) ) return d * 5280;
  if ( u === "km" ) return d * 3280;
  return d;
}
/** Falling (VtDA20 p. 355, as WoDX Actions rules.js): 1 die of bashing per 10 feet; 100 feet or more is 10 dice lethal, armor half. */
export function fallingDamage(feet) {
  const terminal = feet >= 100;
  return {dice: Math.min(10, Math.floor((Number(feet) || 0) / 10)), type: terminal ? "lethal" : "bashing", halfArmor: terminal};
}
/** Straight-line distance with height: flat distance and the height between, both in scene units. */
export const withHeight = (flat, dz = 0) => (flat === null || flat === undefined ? null : Math.hypot(Number(flat) || 0, Number(dz) || 0));

/** The ground under a token: the highest floor (a region's bottom) among the regions it stands in, else 0. */
export function groundOf(bottoms = []) {
  const ok = bottoms.map(Number).filter(Number.isFinite).filter(b => b > -1e6);
  return ok.length ? Math.max(0, ...ok) : 0;
}

/**
 * Does flight ending drop the token? elevation, ground: scene units; ab: abilities() after the effect went.
 * {falls, feet} with feet the drop in feet.
 */
export function fallOnLanding(elevation, ground, ab = {}, units = "ft") {
  const drop = (Number(elevation) || 0) - (Number(ground) || 0);
  if ( ab.fly || drop <= 0 ) return {falls: false, feet: 0};
  return {falls: true, feet: Math.round(toFeet(drop, units))};
}

/* ------------------------------------------------------------------ */
/*  Water                                                              */
/* ------------------------------------------------------------------ */

/**
 * The water a region holds: "deep", "shallow" or null. A flag (wodx-combat water) wins; otherwise the region's name,
 * the way other WoDX regions are named ("WoDX: Deep water", or plain words: a river, a lake, the sea).
 */
export function waterOf(name = "", flag = null) {
  if ( flag === "deep" || flag === "shallow" ) return flag;
  if ( flag === "none" ) return null;
  const n = String(name).toLowerCase();
  if ( /\b(shallow|ford|wading|puddle|marsh|bog|swamp)\b/.test(n) ) return "shallow";
  if ( /\b(deep water|water|river|lake|sea|ocean|pond|canal|moat|harbou?r|flood|pool|cistern|well)\b/.test(n) ) return "deep";
  return null;
}

/**
 * How long a held breath lasts, in turns (house rule B942): Stamina × 10 turns at rest (a turn is about 3 seconds,
 * so a Stamina 2 mortal holds for about a minute), halved while swimming hard or fighting. Willpower adds one more
 * stretch of Stamina turns, once. Supernatural Stamina counts.
 */
export function breathTurns(stamina = 2, {exerting = false} = {}) {
  const t = Math.max(1, Number(stamina) || 1) * 10;
  return exerting ? Math.max(1, Math.floor(t / 2)) : t;
}

/**
 * Who is under the water this turn: a swimmer with Athletics stays up unless they dive (below the surface); with no
 * Athletics, they go under (house rule: a Stamina + Athletics roll at 8 brings their head up for the turn, the
 * Storyteller's call). Water-walkers stand on it, water-breathers never run short.
 */
export function underWater({athletics = 0, dived = false, ab = {}} = {}) {
  if ( ab.waterwalk && !dived ) return false;
  return dived || (athletics < 1 && !ab.swimfast);
}

/**
 * One turn in deep water. state: {breath, max} (breath left in turns). Returns the next state and the damage: none
 * while breath lasts, then one lethal level a turn (Hunter: The Reckoning pdf 208). Coming up for air fills it again.
 */
export function waterTurn(state = {}, {under = false, breathes: br = true, waterbreath = false, max = 20} = {}) {
  const full = Math.max(1, Number(state.max ?? max) || max);
  if ( !br || waterbreath ) return {breath: full, max: full, damage: 0, drowning: false, note: ""};
  if ( !under ) return {breath: full, max: full, damage: 0, drowning: false, note: ""};
  const left = Math.max(0, (Number.isFinite(Number(state.breath)) ? Number(state.breath) : full) - 1);
  if ( left > 0 ) return {breath: left, max: full, damage: 0, drowning: false, note: `holding their breath: ${left} turn${left === 1 ? "" : "s"} left`};
  return {breath: 0, max: full, damage: 1, drowning: true, note: "drowning: one lethal level this turn"};
}

/** Shallow water costs double movement (house rule B943). */
export const SHALLOW_COST = 2;

/* ------------------------------------------------------------------ */
/*  What each way of moving does to rolls (3.12.0, house rules B946)   */
/* ------------------------------------------------------------------ */

/**
 * Where a character is, from how it moves: one stance a roll reads. {mode, knockedDown, water ("deep"|"shallow"|
 * null), under, aloft (above the ground), ab, melded, jumped (a Jump move this turn)}
 */
export function stanceOf({mode = "walk", knockedDown = false, water = null, under = false, aloft = false, ab = {}, jumped = false} = {}) {
  const m = modeOf(mode);
  if ( ab.meld ) return "melded";
  if ( m === "phase" ) return "phasing";
  if ( knockedDown || m === "crawl" ) return "prone";
  if ( aloft && (ab.fly || m === "fly") ) return "flying";
  if ( m === "climb" || (aloft && !ab.fly) ) return "climbing";
  if ( water === "deep" && !ab.waterwalk ) return under ? "under" : "swimming";
  if ( water === "shallow" ) return "wading";
  if ( jumped ) return "jumped";
  return "standing";
}

/**
 * Difficulty changes for each stance (minus is easier). own: on the character's own rolls; vs: on rolls aimed at
 * them. close: melee and brawl (in reach); ranged: shots and throws; dodge; stealth; perception (sight); dexterity
 * (footing, Athletics); spot: noticing them. cannot: what the stance rules out, said on the card.
 */
export const STANCES = {
  standing: {label: "Standing", own: {}, vs: {}},
  prone:    {label: "Prone or crawling", own: {close: 2, ranged: -1, dodge: 2, stealth: -2, dexterity: 1}, vs: {close: -2, ranged: 2, spot: 1},
    note: "low to the ground: hard to see and to shoot from afar, easy to strike up close; a braced shot is steadier"},
  flying:   {label: "Flying", own: {ranged: 1, dodge: -1, perception: -1, stealth: 1}, vs: {close: 1, ranged: 1},
    note: "a wide view from above and room to dodge; unsteady shots, and a shape against the sky"},
  swimming: {label: "Swimming", own: {close: 2, ranged: 2, dodge: 2, dexterity: 1}, vs: {ranged: 1},
    note: "only the head shows; the water drags at every blow and step"},
  under:    {label: "Under the water", own: {close: 2, ranged: 3, dodge: 2, perception: 2, stealth: -2}, vs: {ranged: 2, spot: 2},
    note: "firearms do not fire under water and bows are useless; the water slows blows and shots from above",
    cannot: "fire a gun or a bow"},
  wading:   {label: "In shallow water", own: {close: 1, dodge: 1, dexterity: 1, stealth: 1}, vs: {},
    note: "poor footing and splashing"},
  climbing: {label: "Climbing", own: {close: 2, ranged: 2, dodge: 3, dexterity: 1}, vs: {close: -1, ranged: -1},
    note: "one hand for the climb, no room to dodge (block and parry only); a botched action means a fall",
    cannot: "dodge"},
  jumped:   {label: "After a jump", own: {close: -1, dodge: 1}, vs: {},
    note: "a leaping strike lands harder, but the landing leaves them off balance"},
  melded:   {label: "In the earth", own: {}, vs: {}, note: "inside the ground: they cannot act on the world, and no physical attack or ordinary sense reaches them",
    cannot: "act physically, or be struck or seen without the right power"},
  phasing:  {label: "Passing through walls", own: {}, vs: {}, note: "the power's own rules say what can touch them",
    cannot: "strike physically while passing through a wall"}
};

/**
 * An attack's changes from both stances. close: the target is in reach. higher: the attacker stands higher by a few
 * feet or more (high ground: -1 to close attacks, house rule). {diff, notes[], blocked (why or "")}
 */
export function attackStance(attacker = "standing", target = "standing", {close = true, higher = false, sameStance = false} = {}) {
  const A = STANCES[attacker] ?? STANCES.standing, T = STANCES[target] ?? STANCES.standing;
  const key = close ? "close" : "ranged", notes = [];
  let diff = 0, blocked = "";
  const add = (v, why) => { if ( v ) { diff += v; notes.push(`${why}: ${v > 0 ? "+" : ""}${v} difficulty`); } };
  add(A.own[key] ?? 0, A.label);
  // Two fliers, or two in the water, meet on even terms
  if ( !(sameStance && ["flying", "swimming", "under"].includes(target)) ) add(T.vs[key] ?? 0, `Target ${T.label.toLowerCase()}`);
  if ( close && higher && !["flying", "melded"].includes(attacker) ) add(-1, "Higher ground");
  if ( attacker === "melded" || attacker === "phasing" ) blocked = A.cannot;
  else if ( target === "melded" ) blocked = "the target is inside the earth";
  else if ( attacker === "under" && !close ) notes.push("Under the water: firearms do not fire and bows are useless");
  return {diff, notes, blocked};
}

/** A plain roll's change from a stance. kinds: any of close, ranged, dodge, stealth, perception, dexterity. {diff, parts[]} */
export function rollStance(stance = "standing", kinds = []) {
  const S = STANCES[stance] ?? STANCES.standing, parts = [];
  let diff = 0;
  for ( const k of new Set(kinds) ) {
    const v = S.own[k] ?? 0;
    if ( v ) { diff += v; parts.push(`${S.label} ${v > 0 ? "+" : ""}${v} (${k})`); }
  }
  return {diff, parts};
}
/** Noticing someone in this stance: the observer's difficulty change. */
export const spotStance = stance => (STANCES[stance] ?? STANCES.standing).vs.spot ?? 0;
