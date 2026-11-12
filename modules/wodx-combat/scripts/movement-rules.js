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
 *
 * 3.20.0: riding and driving in a fight (the mount's own speed for the one at the reins, the saddle and the vehicle
 * as stances, the mounted charge of V20 Dark Ages p. 398 read for a map), and a load that slows a swimmer (worn
 * armor and what is carried; house rules B2440-B2444).
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
  fly: [/\bphantom wings\b/, /\bwings of pegasus\b/, /\bspirit of the bird\b/, /\bsky running\b/, /\bwind runner\b/,
    /\bcloud[- ]walking\b/, /\bchiropteran marauder\b/, /\b(bat|bats|raven|owl|hawk|crow|bird)\b/, /\bwings\b/, /\bflight\b/, /\bflying\b/, /\blevitat/],
  wallwalk: [/\bsurface attunement\b/, /\bmanipulate adhesion\b/, /\bmonkey tail\b/, /\bspider/, /\bwall[- ]walk/],
  waterwalk: [/\bsurface attunement\b/, /\bgrip the water\b/, /\bwater[- ]walk/],
  swimfast: [/\bsalmon swim\b/, /\b(fish|seal|otter|eel|shark)\b/, /\bgills\b/],
  waterbreath: [/\bgills\b/, /\bwater[- ]breath/, /\bbreathe water\b/],
  leap: [/\bhare'?s leap\b/, /\bgreat leap\b/, /\bleap of rage\b/],
  phase: [/\btenebrous (form|avatar)\b/, /\bmist form\b/, /\blurking mists\b/, /\bspectral body\b/, /\bincorporeal passage\b/, /\bshape of mist\b/],
  meld: [/\bearth meld\b/, /\bmeld with the earth\b/]
};
// Wings of Rage adds Outrage to Athletics and running; it is not flight (Wraith 20th pdf 266)
const NOT_FLIGHT = /\b(coward'?s flight|soul'?s flight|flight from|in flight from|flight of the|wings of rage)\b/;

/**
 * Flying speeds from the books, in yards a turn (a turn of about 3 seconds: 20 mph is about 29 yards), and what
 * attacks against the flier change. First match wins.
 *   bat form (Shape of the Beast): 20 mph, attacks against it +2 (V20 pdf 208)
 *   Chiropteran Marauder: 25 mph (V20 pdf 250); the Dark Ages wings: 25 mph (V20 Dark Ages pdf 271)
 *   Wings of Pegasus: 50 mph (W20 pdf 176); Spirit of the Bird: 20 mph, hovers, its own maneuvers +1 (W20 pdf 200)
 *   Phantom Wings: up to jogging speed, double in the Tempest (Wraith 20th pdf 217)
 *   Demon wings: a glide at up to three times the running speed (Demon: The Fallen pdf 177-195)
 *   anything else: 10 to 20 yards a turn (M20 pdf 402), taken as 15
 */
export const FLY_SPEEDS = [
  {re: /\bchiropteran marauder\b/, yards: 37, ref: "V20 pdf 250"},
  {re: /\bwings of pegasus\b/, yards: 73, ref: "W20 pdf 176"},
  {re: /\bspirit of the bird\b/, yards: 29, ownDiff: 1, ref: "W20 pdf 200"},
  {re: /\bphantom wings\b/, pace: "jog", ref: "Wraith 20th pdf 217"},
  {re: /\bshape of the beast\b.*\bbats?\b|\bbats?\b.*\bshape of the beast\b|\bbat form\b|\bshape of a bat\b/, yards: 29, vsDiff: 2, ref: "V20 pdf 208"},
  {re: /\b(apocalyptic|demon(ic)?) (form|wings)\b|\bglid/, pace: "glide", ref: "Demon: The Fallen pdf 177-195"},
  {re: /\bwings\b/, yards: 37, ref: "V20 Dark Ages pdf 271"}
];
const flyOf = text => FLY_SPEEDS.find(f => f.re.test(text)) ?? null;

/**
 * What an actor's effects and flags let it do. effects: [{name, description, key}] of the actor's live effects
 * (key: the WoDX Chronicle timed key, "wodx-effect-rise" for Rise). flags: the actor's wodx-combat "moves" flag,
 * {fly, swim, wallwalk, waterwalk, waterbreath, phase, burrow, flySpeed} set by the Storyteller for creatures that
 * always have them (a gargoyle, a spirit, a fish).
 */
export function abilities(effects = [], flags = {}) {
  const got = {fly: !!flags.fly, wallwalk: !!flags.wallwalk, waterwalk: !!flags.waterwalk, swimfast: !!flags.swim,
    waterbreath: !!flags.waterbreath, leap: false, phase: !!flags.phase, meld: false, burrow: !!flags.burrow,
    flySpeed: Number(flags.flySpeed) || null, flyBook: null, why: {}};
  const notFlight = [...GRANTS.wallwalk, ...GRANTS.waterwalk, ...GRANTS.leap];
  for ( const e of effects ) {
    const text = `${e?.name ?? ""} ${e?.description ?? ""}`.toLowerCase();
    for ( const [k, pats] of Object.entries(GRANTS) ) {
      if ( k !== "fly" && pats.some(p => p.test(text)) ) { got[k] = true; got.why[k] ??= e?.name ?? ""; }
    }
    // Rise flies, unless it came from a leap or a wall or water walk (those powers carry the Rise keyword too)
    const rise = e?.key === "wodx-effect-rise" && !notFlight.some(p => p.test(text));
    const named = GRANTS.fly.some(p => p.test(text)) && !NOT_FLIGHT.test(text) && !notFlight.some(p => p.test(text));
    if ( rise || named ) {
      got.fly = true; got.why.fly ??= e?.name || "Rise";
      const f = flyOf(text);
      if ( f && !got.flyBook ) got.flyBook = f;
    }
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
 *   swim:   the jog; the run with a swimming power; 1 yard with no Athletics (house rule); less under a load
 *   climb:  3 yards, an average climb's success; walking pace for wall-walkers (house rule)
 *   crawl:  3 yards, or the walk if less (house rule)
 *   jump:   the yards the last Jumping roll gave (1 a success)
 *   burrow: none: Earth Meld does not move through the ground
 *   phase:  the walk (house rule)
 */
export function speedFor(mode, base = {walk: 7, jog: 14, run: 26}, ab = {}, {athletics = 0, jumpYards = 0, load = null} = {}) {
  const m = modeOf(mode), walk = Math.max(0, Number(base.walk) || 0), jog = Math.max(0, Number(base.jog) || 0), run = Math.max(0, Number(base.run) || 0);
  if ( run === 0 ) return 0;
  switch ( m ) {
    case "fly": {
      if ( ab.flySpeed ) return Math.max(1, ab.flySpeed);
      const f = ab.flyBook;
      if ( f?.pace === "jog" ) return jog;
      if ( f?.pace === "glide" ) return run * 3;
      return f?.yards ?? 15;
    }
    // M20 pdf 402: 12 + Dexterity yards a turn for a trained swimmer, the same as the jog; no Athletics, no swimming
    // 3.20.0: a load slows the swimmer by quarters, and past three steps there is no swimming at all
    case "swim": {
      const free = ab.swimfast ? run : athletics < 1 ? 1 : jog;
      if ( !load?.steps ) return free;
      return load.sinks ? 0 : Math.max(1, Math.floor(free * load.factor));
    }
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
 * How long a held breath lasts, in turns of about 3 seconds (W20 pdf 261, M20 pdf 441-442): by Stamina at rest
 * 30 seconds, 1, 2, 4, 8, 12, 20, 30, 45 minutes, an hour; in a fight or other hard effort, 2 x Stamina turns. Each
 * Willpower point spent adds 30 seconds at rest, one turn in a fight.
 */
export const BREATH_SECONDS = [30, 30, 60, 120, 240, 480, 720, 1200, 1800, 2700, 3600];
export function breathTurns(stamina = 2, {exerting = false, willpower = 0} = {}) {
  const st = Math.max(1, Math.min(10, Number(stamina) || 1)), wp = Math.max(0, Number(willpower) || 0);
  return exerting ? 2 * st + wp : Math.round((BREATH_SECONDS[st] + 30 * wp) / 3);
}
/** Out of breath: one level a turn, not rolled and not soaked; lethal (W20 pdf 261, M20 pdf 441), bashing for the fae (C20 pdf 294). */
export const drownType = profile => (profile === "fae" ? "bashing" : "lethal");

/**
 * Who is under the water this turn: a swimmer with Athletics stays up unless they dive (below the surface); with no
 * Athletics, they go under (house rule: a Stamina + Athletics roll at 8 brings their head up for the turn, the
 * Storyteller's call). Water-walkers stand on it, water-breathers never run short.
 */
export function underWater({athletics = 0, dived = false, ab = {}, load = null} = {}) {
  if ( ab.waterwalk && !dived ) return false;
  // 3.20.0: more weight than they can swim with drags them under, power or no power
  if ( load?.sinks ) return true;
  return dived || (athletics < 1 && !ab.swimfast);
}

/**
 * One turn in deep water. state: {breath, max} (breath left in turns). Returns the next state and the damage: none
 * while breath lasts, then one level a turn (W20 pdf 261, M20 pdf 441). Coming up for air fills it again.
 */
export function waterTurn(state = {}, {under = false, breathes: br = true, waterbreath = false, max = 20} = {}) {
  const full = Math.max(1, Number(state.max ?? max) || max);
  if ( !br || waterbreath ) return {breath: full, max: full, damage: 0, drowning: false, note: ""};
  if ( !under ) return {breath: full, max: full, damage: 0, drowning: false, note: ""};
  const left = Math.max(0, (Number.isFinite(Number(state.breath)) ? Number(state.breath) : full) - 1);
  if ( left > 0 ) return {breath: left, max: full, damage: 0, drowning: false, note: `holding their breath: ${left} turn${left === 1 ? "" : "s"} left`};
  return {breath: 0, max: full, damage: 1, drowning: true, note: "drowning: one lethal level this turn"};
}

/**
 * What a swimmer carries (3.20.0, house rule B2443). The books give Strength a carrying limit and nothing on swimming
 * under a load, so WoDX counts steps: one for each point of Dexterity penalty on worn armor, plus the burden the player
 * or the Storyteller sets on the character (BURDENS). Strength and Potence together of 4 or more shrug off one step,
 * 7 or more two. Each step takes a quarter off the swimming speed and adds 1 to the difficulty of rolls made in the
 * water (3 at most); at four steps there is no swimming: the character goes under and stays there until they drop
 * something. Those who walk on water are not swimming, and a body that floats by itself (mist, a spirit) carries
 * nothing.
 */
export const BURDENS = [
  {id: 0, label: "Nothing that matters", hint: "clothes, a knife, a purse"},
  {id: 1, label: "A pack or a long weapon", hint: "a full satchel, a sword and shield, a rifle, a small child"},
  {id: 2, label: "A heavy load", hint: "a strongbox, a loaded pack, a wounded friend held up"},
  {id: 3, label: "All they can lift", hint: "a body over the shoulder, a chest of coin"}
];
export const burdenOf = v => BURDENS[Math.max(0, Math.min(BURDENS.length - 1, Math.round(Number(v) || 0)))];
export const LOAD_SINKS = 4;
export function swimLoad({armorPenalty = 0, burden = 0, strength = 2, potence = 0} = {}) {
  const armor = Math.max(0, Math.round(Number(armorPenalty) || 0)), carried = burdenOf(burden).id;
  const might = (Number(strength) || 0) + (Number(potence) || 0);
  const off = might >= 7 ? 2 : might >= 4 ? 1 : 0;
  const steps = Math.max(0, armor + carried - off);
  const parts = [];
  if ( armor ) parts.push(`armor ${armor}`);
  if ( carried ) parts.push(burdenOf(carried).label.toLowerCase());
  if ( off && (armor || carried) ) parts.push(`strength takes off ${Math.min(off, armor + carried)}`);
  const sinks = steps >= LOAD_SINKS;
  return {steps, armor, burden: carried, sinks, factor: sinks ? 0 : 1 - steps * 0.25, diff: Math.min(3, steps), parts,
    note: !steps ? "" : sinks ? "too much weight to swim with: they go under until they let something go"
      : `weighed down (${parts.join(", ")}): swimming at ${["", "three quarters", "half", "a quarter"][steps]} speed, +${Math.min(3, steps)} difficulty in the water`};
}

/* ------------------------------------------------------------------ */
/*  Riding and driving in a fight (3.20.0, house rules B2440-B2442)    */
/* ------------------------------------------------------------------ */

/**
 * A fight turn at the reins. ride: what WoDX Interactables says of the mount or vehicle a token is on, {kind, label,
 * role ("reins" or "passenger"), yards (its full pace this year on this ground, a turn), saddle (a horse, a mule, a
 * motorcycle: something sat astride), hooves, motor, water (a boat), skill ("ride", "drive" or "athletics")}.
 * The one at the reins moves at the mount's pace, not their own, and their wounds do not slow it. With no dot in the
 * skill they keep to half of it (the books ask a roll for anything faster: Keep control, on the mount's own menu).
 * A passenger is carried and spends none of their own movement; moving on their own is getting off.
 * {limit (yards a turn, or null: the token's own paces), carried, note}
 */
export function rideMove(ride, {skill = 0} = {}) {
  if ( !ride ) return {limit: null, carried: false, note: ""};
  if ( ride.role !== "reins" ) return {limit: null, carried: true, note: `carried by the ${String(ride.label ?? "mount").toLowerCase()}`};
  const full = Math.max(0, Math.round(Number(ride.yards) || 0));
  const trained = (Number(skill) || 0) > 0;
  return {limit: trained ? full : Math.floor(full / 2), carried: false,
    note: trained ? `${ride.label ?? "the mount"}'s pace` : `${ride.label ?? "the mount"} at half pace: no ${ride.skill === "drive" ? "Drive" : ride.skill === "athletics" ? "Athletics" : "Ride"}`};
}

/**
 * The mounted charge. V20 Dark Ages p. 398 gives a rider who catches someone at speed +1 damage die for each turn spent
 * building speed, five at most. On a map there are no turns of building speed to count, so WoDX reads it by ground
 * covered (house rule B2442): a rider on hooves, at the reins, gets +1 die on a hand-to-hand blow for each full
 * 10 yards ridden this turn before it, five at most. A passenger, a cart and a motor car give none.
 */
export const CHARGE_PER = 10;
export const CHARGE_MAX = 5;
export function chargeDice(ride, yardsThisTurn = 0, {ranged = false} = {}) {
  if ( !ride || ranged || ride.role !== "reins" || !ride.hooves || !ride.saddle ) return 0;
  return Math.max(0, Math.min(CHARGE_MAX, Math.floor((Number(yardsThisTurn) || 0) / CHARGE_PER)));
}

/** Shallow water costs double movement (house rule B943). */
export const SHALLOW_COST = 2;

/* ------------------------------------------------------------------ */
/*  What each way of moving does to rolls (3.12.0, house rules B946)   */
/* ------------------------------------------------------------------ */

/**
 * Where a character is, from how it moves: one stance a roll reads. {mode, knockedDown, water ("deep"|"shallow"|
 * null), under, aloft (above the ground), ab, melded, jumped (a Jump move this turn), ride (rideOf(): the mount or
 * vehicle the character is on)}
 */
export function stanceOf({mode = "walk", knockedDown = false, water = null, under = false, aloft = false, ab = {}, jumped = false, ride = null} = {}) {
  const m = modeOf(mode);
  if ( ab.meld ) return "melded";
  if ( m === "phase" ) return "phasing";
  if ( knockedDown ) return "prone";
  // In the saddle or aboard a vehicle (3.20.0): the mount's place, not the rider's own way of moving
  if ( ride ) return ride.saddle ? "mounted" : "aboard";
  if ( m === "crawl" ) return "prone";
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
  prone:    {label: "Prone or crawling", own: {close: 2, dodge: 2, stealth: -2, dexterity: 1}, vs: {close: -2, ranged: 1, spot: 1},
    note: "low to the ground: light cover against shots (V20 pdf 286), hard to see, easy to strike up close"},
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
  mounted:  {label: "In the saddle", own: {ranged: 1, stealth: 2}, vs: {},
    note: "height and weight over anyone on foot; a moving saddle spoils the aim, and nothing about it is quiet"},
  aboard:   {label: "Aboard a vehicle", own: {close: 1, ranged: 1, dodge: 2, stealth: 2}, vs: {ranged: 1},
    note: "cramped and shaken about; the sides give a little cover from shots"},
  melded:   {label: "In the earth", own: {}, vs: {}, note: "inside the ground: they cannot act on the world, and no physical attack or ordinary sense reaches them",
    cannot: "act physically, or be struck or seen without the right power"},
  phasing:  {label: "Passing through walls", own: {}, vs: {}, note: "the power's own rules say what can touch them",
    cannot: "strike physically while passing through a wall"}
};

/**
 * An attack's changes from both stances. close: the target is in reach. higher: the attacker stands higher by a few
 * feet or more (high ground: -1 to close attacks, house rule). {diff, notes[], blocked (why or "")}
 */
export function attackStance(attacker = "standing", target = "standing", {close = true, higher = false, sameStance = false, attackerFly = null, targetFly = null} = {}) {
  const A = STANCES[attacker] ?? STANCES.standing, T = STANCES[target] ?? STANCES.standing;
  const key = close ? "close" : "ranged", notes = [];
  let diff = 0, blocked = "";
  const add = (v, why) => { if ( v ) { diff += v; notes.push(`${why}: ${v > 0 ? "+" : ""}${v} difficulty`); } };
  add(A.own[key] ?? 0, A.label);
  // Two fliers, or two in the water, meet on even terms
  // A bat is small and quick: +2 to hit it (V20 pdf 208) in place of the flier's +1
  const vsFly = target === "flying" && targetFly?.vsDiff ? targetFly.vsDiff : null;
  if ( !(sameStance && ["flying", "swimming", "under", "aboard"].includes(target)) ) add(vsFly ?? T.vs[key] ?? 0, `Target ${T.label.toLowerCase()}${vsFly ? ` (${targetFly.ref})` : ""}`);
  if ( attacker === "flying" && attackerFly?.ownDiff ) add(attackerFly.ownDiff, `Flying maneuvers (${attackerFly.ref})`);
  // From the saddle down at someone on foot, and up at a rider from the ground (house rule B2441); never on top of
  // higher ground, which is the same advantage
  const afoot = st => !["mounted", "aboard", "flying", "melded", "phasing"].includes(st);
  const saddle = close && attacker === "mounted" && afoot(target);
  if ( saddle ) add(-1, "From the saddle");
  if ( close && target === "mounted" && afoot(attacker) && attacker !== "climbing" ) add(1, "Reaching up at a rider");
  if ( close && higher && !saddle && !["flying", "melded"].includes(attacker) ) add(-1, "Higher ground");
  if ( attacker === "melded" || attacker === "phasing" ) blocked = A.cannot;
  else if ( target === "melded" ) blocked = "the target is inside the earth";
  else if ( attacker === "under" && !close ) notes.push("Under the water: firearms do not fire and bows are useless");
  return {diff, notes, blocked};
}

/** A plain roll's change from a stance. kinds: any of close, ranged, dodge, stealth, perception, dexterity; load:
 *  swimLoad() for someone in the water. {diff, parts[]} */
export function rollStance(stance = "standing", kinds = [], {load = null} = {}) {
  const S = STANCES[stance] ?? STANCES.standing, parts = [];
  let diff = 0;
  for ( const k of new Set(kinds) ) {
    const v = S.own[k] ?? 0;
    if ( v ) { diff += v; parts.push(`${S.label} ${v > 0 ? "+" : ""}${v} (${k})`); }
  }
  // 3.20.0: a load in the water spoils footing, blows and dodges alike, once
  if ( load?.diff && ["swimming", "under"].includes(stance) && [...kinds].some(k => ["close", "dodge", "dexterity"].includes(k)) ) {
    diff += load.diff; parts.push(`Weighed down in the water +${load.diff}`);
  }
  return {diff, parts};
}
/** Noticing someone in this stance: the observer's difficulty change. */
export const spotStance = stance => (STANCES[stance] ?? STANCES.standing).vs.spot ?? 0;
