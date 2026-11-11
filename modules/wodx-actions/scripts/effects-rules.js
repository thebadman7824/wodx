/**
 * WoDX Actions 3.22.0 and 3.23.0: magic that applies itself, the pure rules. Effect keywords turn a Mage 20th casting's successes
 * into changes on the table. No Foundry here: the harness tests it. The Foundry side is effects.js.
 *
 *   KEYWORDS        each keyword's lowest Spheres (M20 pp. 513-523), its feat size (p. 502), what its successes buy,
 *                   and whether it applies on its own, goes to the approval queue, or stays with the Storyteller
 *   spheresFor      the Sphere levels a set of keywords needs, from what the caster knows
 *   needFor         the successes needed: the largest feat, +1 for each keyword past the first (house rule), at least
 *                   2 on someone else (p. 502), + the extras planned before the roll
 *   spend           the successes rolled, spent in the planned order: extra targets, duration steps, then strength
 *                   (dividing successes, p. 504); if the roll comes up short, the plan drops from the end
 *   outcome         what each keyword does with what it got: damage or healing by the p. 504 chart, a timed effect,
 *                   light, height, a condition
 *   route           auto (applies with Undo), queue (the approval queue) or st (the Storyteller's call)
 *   durationFor     the p. 504 ladder as a WoDX Chronicle timed-effect duration
 *   AREA, inArea    an area Effect (3.23.0): a circle on the scene that works on whoever enters it, for its duration
 *   roteFrom, keepRote  saved keyword sets, a caster's own rotes (3.23.0)
 *
 * Mechanics from Mage: The Ascension 20th Anniversary Edition, in WoDX's words, with printed pages. House rules are
 * marked and logged in DECISIONS (B763).
 */
import * as M from "./m20-rules.js";

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/**
 * opts: the Sphere levels that can carry the keyword, best first ({sphere: level}; "any" for any Sphere).
 * feat: successes needed by the Magickal Feats chart (p. 502). strength: false when spare successes go to duration.
 * tier: auto | queue | st. lean: the default kind (coincidental or vulgar). mind: a mind effect (routed by target).
 */
export const KEYWORDS = {
  sense:   {label: "Sense", opts: [{any: 1}], feat: 1, strength: false, tier: "auto", lean: "coincidental",
    does: "A whisper to the caster with what the sheet knows: health (Life), Quintessence (Prime), the Gauntlet (Spirit), lights and sound (Forces)."},
  harm:    {label: "Harm", opts: [{forces: 3}, {life: 3}, {matter: 3}, {entropy: 4}, {mind: 3}], feat: 3, strength: true, tier: "auto", lean: "vulgar",
    does: "Damage by the p. 504 chart (Forces adds one), soaked as the target's book allows; Mind does bashing."},
  mend:    {label: "Mend", opts: [{life: 2, self: true}, {life: 3}], feat: 2, strength: true, tier: "auto", lean: "coincidental", ally: true,
    does: "Heals health levels by the p. 504 chart; an aggravated level needs Prime 2 and a Quintessence point."},
  ward:    {label: "Ward", opts: [{forces: 2}, {matter: 2}, {mind: 1}, {prime: 1}], feat: 1, strength: true, tier: "auto", lean: "coincidental", ally: true, timed: true,
    does: "Armour against one kind of harm: a die for each success of strength (house rule). The stronger of two Wards counts."},
  fortune: {label: "Fortune", opts: [{entropy: 2}], feat: 2, strength: true, tier: "auto", lean: "coincidental", timed: true,
    does: "The target's next roll at a difficulty 1 higher or lower for each success of strength, 3 at most (house rule)."},
  hasten:  {label: "Hasten or Slow", opts: [{time: 3}], feat: 3, strength: true, tier: "auto", lean: "vulgar", timed: true,
    does: "An extra action for every two successes of strength, or a lost action each turn when slowed (p. 523)."},
  light:   {label: "Light or Dark", opts: [{forces: 2}], feat: 1, strength: false, tier: "auto", lean: "coincidental",
    does: "Light or darkness on the caster's token; spare successes go to how long it lasts."},
  move:    {label: "Move", opts: [{correspondence: 3}], feat: 2, strength: false, tier: "auto", lean: "vulgar",
    does: "A step through space inside this scene: the Storyteller clicks where the caster means to go. Another scene is the Storyteller's call."},
  charge:  {label: "Charge or Drain", opts: [{prime: 3}], feat: 2, strength: true, tier: "auto", lean: "coincidental",
    does: "Quintessence moved into or out of a Pattern by the p. 504 chart."},
  veil:    {label: "Veil", opts: [{mind: 1}, {forces: 3}], feat: 2, strength: true, tier: "auto", lean: "coincidental", timed: true, mind: true,
    resist: {pool: "perception", diff: 6},
    does: "Unnoticed (Mind) or unseen (Forces): noticing the target is at difficulty 6 + strength, 9 at most (house rule)."},
  sight:   {label: "Night Sight", opts: [{forces: 1}, {life: 2}], feat: 1, strength: false, tier: "auto", lean: "coincidental", timed: true,
    does: "The token sees in the dark for as long as the successes last."},
  rise:    {label: "Rise", opts: [{forces: 2, self: true}, {forces: 3}], feat: 2, strength: true, tier: "auto", lean: "vulgar", timed: true,
    does: "The token rises 5 feet for each success of strength (house rule)."},
  trip:    {label: "Disarm or Trip", opts: [{forces: 2}, {matter: 2}], feat: 2, strength: true, tier: "auto", lean: "coincidental",
    resist: {pool: "dexterity", diff: 6},
    does: "The target is knocked down; resisting is Dexterity + Athletics at 6 + strength, 9 at most (house rule)."},
  hold:    {label: "Hold", opts: [{forces: 2}, {matter: 2}, {life: 3}, {mind: 3}], feat: 3, strength: true, tier: "auto", lean: "vulgar", timed: true,
    resist: {pool: "strength", diff: 6},
    does: "Held: breaking free is Strength at 6 + strength, 9 at most (house rule)."},
  fear:    {label: "Fear", opts: [{mind: 2}], feat: 2, strength: true, tier: "queue", lean: "coincidental", timed: true, mind: true,
    resist: {pool: "willpower", diff: 6},
    does: "Afraid: the target keeps away from the caster or flees, as an NPC behaviour."},
  sway:    {label: "Sway", opts: [{mind: 2}], feat: 2, strength: true, tier: "queue", lean: "coincidental", mind: true,
    resist: {pool: "willpower", diff: 6},
    does: "An impulse or a mood planted; control of the mind needs Mind 4 and is an impressive feat (p. 502). The Storyteller plays it out."},
  shape:   {label: "Shape", opts: [{life: 3}, {matter: 2}], feat: 4, strength: true, tier: "queue", lean: "vulgar",
    does: "A change of form, for the Storyteller to approve and describe."},
  sideways:{label: "Step Sideways or Cross", opts: [{spirit: 3}], feat: 2, strength: false, tier: "queue", lean: "vulgar",
    does: "A crossing through WoDX Otherworlds: into the Umbra against the Gauntlet, or across the Shroud, into the Dreaming or a dream."},
  // 3.30.0: the shared roster for every line's powers (B781). The Sphere options let a Mage cast them too; they are
  // house readings of the Sphere lists (M20 pp. 513-523) until the page check, logged in PENDING-REVIEW.
  know:    {label: "Know", opts: [{mind: 1}, {time: 2}, {correspondence: 2}, {entropy: 1}], feat: 1, strength: false, tier: "auto", lean: "coincidental", mind: true,
    resist: {pool: "willpower", diff: 6},
    does: "Answers one question: a thought, an aura, an object's past, a lie told. The Storyteller gives the answer."},
  speak:   {label: "Speak", opts: [{mind: 1}, {spirit: 2}, {life: 2}], feat: 1, strength: false, tier: "auto", lean: "coincidental", timed: true,
    does: "Talk with animals, spirits, ghosts, the dead or machines for as long as the successes last."},
  boost:   {label: "Boost or Sap", opts: [{life: 3}, {mind: 3}], feat: 3, strength: true, tier: "auto", lean: "coincidental", ally: true, timed: true,
    resist: {pool: "stamina", diff: 6},
    does: "A die for each success of strength, 5 at most, added to (or taken from) one kind of roll: Physical, Social, Mental, soak or Initiative (house rule)."},
  summon:  {label: "Summon", opts: [{spirit: 3}, {life: 3}, {correspondence: 3}], feat: 3, strength: true, tier: "queue", lean: "vulgar",
    does: "Calls a creature, spirit or ghost; more successes bring more or stronger. The Storyteller places and plays them."},
  make:    {label: "Make", opts: [{matter: 2, prime: 2}, {forces: 2, prime: 2}, {life: 2, prime: 2}], feat: 3, strength: true, tier: "queue", lean: "vulgar",
    does: "Creates an object, a weapon, food or a chimera; it goes to the target's inventory once the Storyteller approves."},
  work:    {label: "Work or Break", opts: [{forces: 2}, {matter: 2}, {entropy: 2}], feat: 2, strength: true, tier: "auto", lean: "coincidental",
    does: "Works a door, lock or mechanism from afar, throws a thing by will, or breaks, rots or ages an object (WoDX Interactables)."},
  illusion:{label: "Illusion", opts: [{forces: 2}, {mind: 2}], feat: 2, strength: true, tier: "auto", lean: "coincidental", timed: true, mind: true,
    resist: {pool: "perception", diff: 6},
    does: "Shows something that is not there: a sight, a sound, a figure. Seeing through it is Perception + Awareness at 6 + strength, 9 at most (house rule)."},
  possess: {label: "Possess", opts: [{mind: 5}, {spirit: 4}], feat: 5, strength: true, tier: "queue", lean: "vulgar", mind: true, timed: true,
    resist: {pool: "willpower", diff: 7},
    does: "Takes over a body or an object: the possessor plays the target while their own body lies empty."},
  bind:    {label: "Bind", opts: [{mind: 4}, {life: 3, mind: 2}], feat: 4, strength: true, tier: "queue", lean: "coincidental", mind: true, timed: true,
    resist: {pool: "willpower", diff: 7},
    does: "A lasting change of mind or loyalty: a memory taken or rewritten, a derangement, conditioning, a bond, an oath. Written on the sheet with what ends it."},
  banish:  {label: "Banish or Bar", opts: [{spirit: 2}, {prime: 2}, {entropy: 3}], feat: 2, strength: true, tier: "queue", lean: "vulgar",
    resist: {pool: "willpower", diff: 6},
    does: "Ends another power, drives a being out or away, or keeps one kind of being out of a place."},
  manifest:{label: "Manifest", opts: [{spirit: 3}, {entropy: 4}], feat: 3, strength: true, tier: "queue", lean: "vulgar", timed: true,
    does: "A being in another realm shows itself or acts on this side without crossing: seen, heard, or solid enough to touch."},
  imbue:   {label: "Imbue", opts: [{prime: 3}, {spirit: 3}, {prime: 2, matter: 2}], feat: 4, strength: true, tier: "queue", lean: "vulgar",
    does: "Puts a lasting power into a thing or a person: a fetish, a talisman, a reliquary, a charm."},
  place:   {label: "Place", opts: [{spirit: 4}, {prime: 4}, {entropy: 4}], feat: 4, strength: true, tier: "queue", lean: "vulgar",
    does: "Changes a place: its Gauntlet, its Shroud, a caern, node, haunt or freehold, a consecrated ground, a ley line."},
  weather: {label: "Weather", opts: [{forces: 3}], feat: 4, strength: true, tier: "queue", lean: "vulgar", timed: true,
    does: "Changes the scene's weather: wind, rain, fog, snow, storm, calm (WoDX Senses weather)."},
  time:    {label: "Time", opts: [{time: 2}], feat: 3, strength: true, tier: "st", lean: "vulgar",
    does: "Sees the past or the future, or works on time beyond Hasten or Slow. The Storyteller says what happens."},
  free:    {label: "Free Effect", opts: [{any: 1}], feat: 1, strength: true, tier: "st", lean: "coincidental",
    does: "Anything else (the Story keyword): the roll and its costs are tracked, the Storyteller says what happens."}
};

/** The Sphere levels a set of keywords needs: for each keyword the first option the caster can work, merged by highest. */
export function spheresFor(keywords = [], known = {}, {self = true} = {}) {
  const need = {}, missing = [];
  for ( const k of keywords ) {
    const K = KEYWORDS[k];
    if ( !K ) continue;
    const opts = K.opts.filter(o => self || !o.self);
    const pick = opts.find(o => Object.entries(o).every(([s, l]) => s === "self" || (s === "any" ? Object.values(known).some(v => n(v) >= l) : n(known[s]) >= l)));
    if ( !pick ) { missing.push(k); continue; }
    for ( const [s, l] of Object.entries(pick) ) {
      if ( s === "self" ) continue;
      const sphere = s === "any" ? Object.keys(known).sort((a, b) => n(known[b]) - n(known[a]))[0] : s;
      need[sphere] = Math.max(n(need[sphere]), l);
    }
  }
  return {used: Object.entries(need).map(([sphere, level]) => ({sphere, level})), missing};
}

/**
 * The successes needed (p. 502 and house rules). plan: {targets: extra targets, duration: duration steps}.
 * self: the Effect is on the caster alone.
 */
export function needFor(keywords = [], {self = true, plan = {}, feat = 0} = {}) {
  const ks = keywords.filter(k => KEYWORDS[k]);
  if ( !ks.length ) return 0;
  let base = Math.max(n(feat), ...ks.map(k => KEYWORDS[k].feat));
  if ( !self ) base = Math.max(2, base);
  return base + (ks.length - 1) + (plan.area && ks.some(k => AREA.keys.includes(k)) ? AREA.cost : 0) + Math.max(0, n(plan.targets)) + Math.max(0, n(plan.duration));
}

/**
 * An area Effect (house rule: Mage 20th has no area chart, book check of 9 November 2026): two more successes make a
 * circle with a 15-foot radius on the scene, that works on each token as it enters, once, for the Effect's duration.
 */
export const AREA = {cost: 2, feet: 15, keys: ["harm", "ward", "fortune", "veil", "hold", "fear", "trip"]};

/** Is a point inside an area? area: {x, y, radius} in scene pixels. */
export const inArea = (p, a) => !!p && !!a && Math.hypot(n(p.x) - n(a.x), n(p.y) - n(a.y)) <= n(a.radius);

/** The radius of an area in scene pixels: feet over the grid's distance per square. */
export const areaRadius = ({size = 100, distance = 5} = {}) => Math.round(AREA.feet / (n(distance) || 5) * (n(size) || 100));

/**
 * Spend the successes rolled (dividing successes, p. 504). base: the successes needed before extras.
 * Extra targets come first, then duration steps; what is left over is strength (or more duration for a keyword
 * with no strength). If the roll is short, the extras drop from the end of the plan.
 * Returns {ok, targets, duration, strength, dropped}.
 */
export function spend(successes, base, plan = {}) {
  const s = n(successes), b = Math.max(1, n(base));
  if ( s < b ) return {ok: false, area: false, targets: 0, duration: 0, strength: 0, dropped: ["the Effect"]};
  let left = s - b;
  const dropped = [];
  const area = !!plan.area && left >= AREA.cost;
  if ( area ) left -= AREA.cost; else if ( plan.area ) dropped.push("the area");
  const targets = Math.min(left, Math.max(0, n(plan.targets))); left -= targets;
  if ( targets < n(plan.targets) ) dropped.push(`${n(plan.targets) - targets} extra target${n(plan.targets) - targets === 1 ? "" : "s"}`);
  const duration = Math.min(left, Math.max(0, n(plan.duration))); left -= duration;
  if ( duration < n(plan.duration) ) dropped.push(`${n(plan.duration) - duration} duration step${n(plan.duration) - duration === 1 ? "" : "s"}`);
  // Strength reads the chart from the base successes plus what is left over
  return {ok: true, area, targets, duration, strength: b + left, dropped};
}

/** The p. 504 duration ladder as a Chronicle timed-effect duration. step 1 is a turn, 2 a scene, 3 a day, 4 a story, 5 six months. */
export function durationFor(step) {
  const s = Math.max(1, Math.min(6, n(step)));
  const label = M.DURATION[s];
  if ( s === 1 ) return {label, timed: {kind: "rounds", rounds: 1}};
  if ( s === 2 ) return {label, timed: {kind: "scene"}};
  if ( s === 3 ) return {label, timed: {kind: "time", seconds: 86400}};
  if ( s === 4 ) return {label, timed: {kind: "time", seconds: 30 * 86400}}; // a story: a month of game time (house rule)
  if ( s === 5 ) return {label, timed: {kind: "time", seconds: 182 * 86400}};
  return {label, timed: null}; // the Storyteller's call
}

const clampDiff = d => Math.max(2, Math.min(9, d));

/**
 * What one keyword does. got: from spend(). ctx: {spheres: [names used], primeCharged, fire, aggravated, slow, dark}.
 * Returns {key, label, kind, ...}: kind is damage | heal | timed | light | quint | pool | condition | note | move.
 * 3.30.0 ctx adds: pool (a POOLS key), damageKind, lasting, against, reflect, calm, frenzy, awe, boost, sap, derangement.
 */
/**
 * The era's magic charts: how successes turn into damage, healing and Quintessence, and the countermagick difficulty.
 * The Ascension uses Mage 20th (p. 504's 2/6/8/10 chart; Forces adds a success). The Sorcerers Crusade multiplies the
 * successes by its Damage and Duration chart (pr 230 and 240): x1 for one, x2 for two to four, x3 for five; Forces adds
 * a success and Mind takes one away (pr 230). The x3 for six and more is a house reading: that chart cell is unreadable.
 */
export const CRUSADE_MULT = [0, 1, 2, 2, 2, 3];
export function crusadeLevels(successes, {forces = false, mind = false} = {}) {
  const s = Math.max(0, n(successes) + (forces ? 1 : 0) - (mind ? 1 : 0));
  return Math.min(20, s * (CRUSADE_MULT[s] ?? 3));
}
export const ERA_RULES = {
  ascension: {label: "Mage 20th", levels: (s, {forces = false} = {}) => M.damage(s, {forces}), counterDiff: 7, reflect: true, ref: "Mage 20th pp. 502-504"},
  crusade: {label: "Sorcerers Crusade", levels: crusadeLevels, counterDiff: 7, reflect: false, ref: "Sorcerers Crusade pr 230-231, 240"}
};
export const eraRules = age => ERA_RULES[age] ?? ERA_RULES.ascension;

/**
 * The pools a Charge or Drain (or a Mend of a pool) can move, by line (3.30.0). path: the temporary value; cap: the
 * permanent rating it cannot pass (none for Quintessence, which the Avatar caps elsewhere).
 */
export const POOLS = {
  quintessence: {label: "Quintessence", path: "system.quintessence.temporary"},
  blood:     {label: "blood", path: "system.advantages.bloodpool.temporary"},
  willpower: {label: "Willpower", path: "system.advantages.willpower.temporary", cap: "system.advantages.willpower.permanent"},
  gnosis:    {label: "Gnosis", path: "system.advantages.gnosis.temporary", cap: "system.advantages.gnosis.permanent"},
  rage:      {label: "Rage", path: "system.advantages.rage.temporary", cap: "system.advantages.rage.permanent"},
  glamour:   {label: "Glamour", path: "system.advantages.glamour.temporary", cap: "system.advantages.glamour.permanent"},
  pathos:    {label: "Pathos", path: "system.advantages.pathos.temporary"},
  faith:     {label: "Faith", path: "system.advantages.faith.temporary", cap: "system.advantages.faith.permanent"},
  sekhem:    {label: "Sekhem", path: "system.advantages.sekhem.temporary", cap: "system.advantages.sekhem.permanent"},
  yinchi:    {label: "Yin Chi", path: "system.advantages.yinchi.temporary"},
  yangchi:   {label: "Yang Chi", path: "system.advantages.yangchi.temporary"},
  conviction:{label: "Conviction", path: "system.advantages.conviction.temporary", cap: "system.advantages.conviction.permanent"}
};
export const poolOf = k => POOLS[k] ?? POOLS.quintessence;

/** The kinds of roll a Boost or Sap works on (house rule, B781). */
export const BOOSTS = {physical: "Physical rolls", social: "Social rolls", mental: "Mental rolls", soak: "soak", initiative: "Initiative"};

/** The kinds of damage Harm can carry and a Ward can stand against (3.30.0). */
export const KINDS = ["any", "fire", "sunlight", "silver", "faith", "spirits", "mind"];

/**
 * What resists a keyword: {pool, diff, text}, or null. power: a power's own entry from a book check, which wins
 * ({resist: {pool, diff}} or {resist: null} for none). The difficulties on the roster are house rules (B781).
 */
export function resistOf(key, power = null) {
  const r = power && "resist" in power ? power.resist : KEYWORDS[key]?.resist;
  if ( !r ) return null;
  const pool = String(r.pool ?? "willpower"), diff = clampDiff(n(r.diff) || 6);
  return {pool, diff, text: `resisted by ${pool[0].toUpperCase()}${pool.slice(1)} at ${diff}`};
}

/**
 * An always-on power (3.30.0): no Cast window and no roll; its rating stands in for strength and it lasts as long as
 * the power does. Returns the outcome with passive: true and no end, or null for a keyword that cannot be passive.
 */
export const PASSIVE_KEYS = ["boost", "ward", "sense", "sight", "hasten", "veil"];
export function passive(key, rating, ctx = {}) {
  if ( !PASSIVE_KEYS.includes(key) || n(rating) <= 0 ) return null;
  const out = outcome(key, {ok: true, strength: n(rating), duration: 0, targets: 0}, ctx);
  return out ? {...out, passive: true, duration: "while the power lasts", timed: {kind: "passive"}, text: `${out.text.replace(/ (for|within) .*$/, "")}, always on`} : null;
}

export function outcome(key, got, ctx = {}) {
  const K = KEYWORDS[key];
  if ( !K || !got?.ok ) return null;
  const str = n(got.strength);
  // No strength: every success past the first goes to how long it lasts
  const step = K.strength ? 1 + n(got.duration) : Math.min(6, str + n(got.duration));
  const dur = durationFor(step);
  const base = {key, label: K.label, duration: dur.label, timed: dur.timed, ...(got.area && AREA.keys.includes(key) ? {area: AREA.feet} : {})};
  const spheres = ctx.spheres ?? [];
  switch ( key ) {
    case "harm": {
      const type = M.damageType({spheres, primeCharged: !!ctx.primeCharged, fire: !!ctx.fire});
      const levels = eraRules(ctx.age).levels(str, {forces: spheres.includes("forces"), mind: spheres.includes("mind")});
      const of = KINDS.includes(ctx.damageKind) && ctx.damageKind !== "any" ? ctx.damageKind : (ctx.fire ? "fire" : null);
      const turns = ctx.lasting ? Math.max(2, Math.min(10, str)) : 0;
      return {...base, kind: "damage", levels, type: type === "none" ? "lethal" : type, soak: !spheres.every(s => s === "mind"), of, lasting: turns,
        text: `${levels} ${type} level${levels === 1 ? "" : "s"}${of ? ` (${of})` : ""}${turns ? `, then one more each turn for ${turns - 1} turn${turns === 2 ? "" : "s"} unless stopped` : ""}`};
    }
    case "mend": {
      if ( ctx.pool && POOLS[ctx.pool] ) {
        const points = eraRules(ctx.age).levels(str);
        return {...base, kind: "pool", pool: ctx.pool, points, text: `${points} ${POOLS[ctx.pool].label} restored`};
      }
      if ( ctx.derangement ) return {...base, kind: "note", text: "one derangement, Paradox flaw or Banality scar eased; the Storyteller strikes it"};
      const levels = eraRules(ctx.age).levels(str);
      return {...base, kind: "heal", levels, aggravated: !!ctx.aggravated, text: `${levels} health level${levels === 1 ? "" : "s"} healed${ctx.aggravated ? ", aggravated at a Quintessence point each" : ""}`};
    }
    case "charge": {
      const points = eraRules(ctx.age).levels(str);
      if ( ctx.pool && ctx.pool !== "quintessence" && POOLS[ctx.pool] )
        return {...base, kind: "pool", pool: ctx.pool, points: ctx.drain ? -points : points, text: `${points} ${POOLS[ctx.pool].label} ${ctx.drain ? "drawn out" : "given"}`};
      return {...base, kind: "quint", points: ctx.drain ? -points : points, text: `${points} Quintessence ${ctx.drain ? "drawn out" : "given"}`};
    }
    case "ward":
      return {...base, kind: "timed", name: "Warded", dice: str, against: KINDS.includes(ctx.against) && ctx.against !== "any" ? ctx.against : null, reflect: !!ctx.reflect,
        text: `${str} armour dice${KINDS.includes(ctx.against) && ctx.against !== "any" ? ` against ${ctx.against}` : ""}${ctx.reflect ? ", turning blows back on their source" : ""} for ${dur.label}`};
    case "fortune": {
      const shift = Math.min(3, str);
      return {...base, kind: "timed", name: ctx.curse ? "Cursed" : "Blessed", shift: ctx.curse ? shift : -shift,
        text: `the next roll at ${ctx.curse ? "+" : "-"}${shift} difficulty, within ${dur.label}`};
    }
    case "hasten": {
      const actions = ctx.slow ? str : Math.floor(str / 2);
      return {...base, kind: "timed", name: ctx.slow ? "Slowed" : "Hastened", actions, text: ctx.slow ? `${actions} increment${actions === 1 ? "" : "s"} slower for ${dur.label}` : `${actions} extra action${actions === 1 ? "" : "s"} a turn for ${dur.label}`};
    }
    case "light":
      return {...base, kind: "light", dark: !!ctx.dark, text: `${ctx.dark ? "darkness" : "light"} for ${dur.label}`};
    case "sight":
      return {...base, kind: "timed", name: "Night sight", vision: true, text: `sight in the dark for ${dur.label}`};
    case "veil":
      return {...base, kind: "timed", name: "Veiled", difficulty: clampDiff(6 + str), text: `noticed only at difficulty ${clampDiff(6 + str)}, for ${dur.label}`};
    case "rise":
      return {...base, kind: "timed", name: "Risen", feet: 5 * str, text: `${5 * str} feet up, for ${dur.label}`};
    case "trip":
      return {...base, kind: "condition", condition: "knockdown", difficulty: clampDiff(6 + str), timed: {kind: "rounds", rounds: 1}, duration: M.DURATION[1],
        text: `knocked down unless Dexterity + Athletics succeeds at ${clampDiff(6 + str)}`};
    case "hold":
      return {...base, kind: "condition", condition: "held", difficulty: clampDiff(6 + str), text: `held for ${dur.label}; Strength at ${clampDiff(6 + str)} breaks free`};
    case "fear":
      if ( ctx.calm ) return {...base, kind: "timed", name: "Calmed", difficulty: clampDiff(6 + str), text: `the Beast or Rage calmed for ${dur.label}; frenzy rolls at +${Math.min(3, str)} difficulty`};
      if ( ctx.frenzy ) return {...base, kind: "timed", name: "Roused", difficulty: clampDiff(6 + str), text: `a frenzy roll at ${clampDiff(6 + str)} now (Self-Control or Instinct, or Rage), roused for ${dur.label}`};
      return {...base, kind: "timed", name: "Afraid", text: `afraid of the caster for ${dur.label}`};
    case "sense":
      return {...base, kind: "note", text: `the caster senses it for ${dur.label}`};
    case "move":
      return {...base, kind: "move", text: "moves to where the caster means to go, in this scene"};
    case "sway":
      if ( ctx.awe ) return {...base, kind: "timed", name: "In awe", awe: true, difficulty: clampDiff(6 + str),
        text: `in awe for ${dur.label}: acting against the caster needs Courage (or Willpower) at ${clampDiff(6 + str)}`};
      return {...base, kind: "note", text: `${K.does} (strength ${str}, ${dur.label})`};
    case "boost": {
      const dice = Math.min(5, str), on = BOOSTS[ctx.boost] ? ctx.boost : "physical";
      return {...base, kind: "timed", name: ctx.sap ? "Sapped" : "Boosted", dice: ctx.sap ? -dice : dice, on,
        text: `${ctx.sap ? "-" : "+"}${dice} ${dice === 1 ? "die" : "dice"} to ${BOOSTS[on]} for ${dur.label}`};
    }
    case "illusion":
      return {...base, kind: "timed", name: "Illusion", difficulty: clampDiff(6 + str), text: `an illusion for ${dur.label}; Perception + Awareness at ${clampDiff(6 + str)} sees through it`};
    case "speak":
      return {...base, kind: "timed", name: "Speaks with", text: `can talk with animals, spirits, ghosts or machines for ${dur.label}`};
    case "know":
      return {...base, kind: "note", text: "the Storyteller answers one question"};
    case "possess":
      return {...base, kind: "timed", name: "Possessed", text: `possessed for ${dur.label}; the possessor plays this body and their own lies empty`};
    case "bind":
      return {...base, kind: "timed", name: "Bound", text: `bound (a memory, a derangement, a bond or an oath) for ${dur.label}; the Storyteller writes it on the sheet`};
    case "manifest":
      return {...base, kind: "timed", name: "Manifest", text: `seen and able to touch on this side for ${dur.label}`};
    /* Traits With Teeth step 10 (Actions 3.38.0): queued keywords that change the world once the Storyteller approves */
    case "shape":
      return {...base, kind: "timed", name: "Shaped", form: String(ctx.form ?? "").slice(0, 60),
        text: `${ctx.form ? `takes the shape of ${String(ctx.form).slice(0, 60)}` : "takes a new shape"} for ${dur.label}`};
    case "sideways":
      return {...base, kind: "cross", to: ctx.shroud ? "shadowlands" : null, text: ctx.shroud ? "crosses the Shroud, or back" : "crosses the Gauntlet, or back"};
    case "summon":
      return {...base, kind: "summon", count: Math.max(1, Math.min(5, Math.ceil(str / 2))), actor: ctx.actor ?? null,
        text: `${Math.max(1, Math.min(5, Math.ceil(str / 2)))} called to the caster; the Storyteller picks who and where`};
    case "make":
      return {...base, kind: "give", item: ctx.item ?? null, thing: String(ctx.thing ?? "").slice(0, 80),
        text: `${ctx.thing ? String(ctx.thing).slice(0, 80) : "a thing"} made, into the target's things`};
    case "weather": {
      const w = WEATHER_SET[ctx.weather] ? ctx.weather : null;
      return {...base, kind: "weather", weather: w, text: `${w ? WEATHER_SET[w].label.toLowerCase() : "the weather changed"} tonight`};
    }
    default:
      return {...base, kind: "note", text: `${K.does} (strength ${str}, ${dur.label})`};
  }
}

/** The weathers a Weather keyword can call (Atmosphere's hand-set day fields), step 10. */
export const WEATHER_SET = {
  calm: {label: "Calm and clear", day: {sky: "clear", precip: "none", fog: "none", wind: "calm"}},
  wind: {label: "A gale", day: {wind: "gale"}},
  rain: {label: "Heavy rain", day: {sky: "overcast", precip: "rain", intensity: "heavy"}},
  fog: {label: "Thick fog", day: {fog: "thick", wind: "calm"}},
  snow: {label: "Snow", day: {sky: "overcast", precip: "snow", intensity: "moderate"}},
  storm: {label: "A storm", day: {sky: "storm", precip: "rain", wind: "gale", intensity: "heavy"}}
};

/**
 * Where a keyword's result goes. t: {self, playerCharacter, count, witnessed, need}.
 * The Storyteller: Free Effects, outlandish or bigger feats (10+), mind effects on player characters, a duration past
 * six months. The queue: the keyword's own tier, another player's character (a Mend or Ward is welcome), mind effects
 * on NPCs, more than three tokens, vulgar magic with witnesses. Everything else applies with Undo.
 */
export function route(key, t = {}, out = null) {
  const K = KEYWORDS[key];
  if ( !K ) return "st";
  if ( K.tier === "st" || n(t.need) >= 10 || (out && out.timed === null) ) return "st";
  if ( K.mind && t.playerCharacter && !t.self ) return "st";
  if ( out?.awe && !t.playerCharacter && !t.witnessed && n(t.count) <= 3 ) return "auto"; // Awe is a plain condition on NPCs (3.30.0)
  if ( K.tier === "queue" ) return "queue";
  if ( n(t.count) > 3 || t.witnessed ) return "queue";
  if ( K.mind && !t.self ) return "queue";
  if ( t.playerCharacter && !t.self && !K.ally ) return "queue";
  return "auto";
}

/** The kind a set of keywords leans to: vulgar if any of them does. */
export const leanOf = (keywords = []) => (keywords.some(k => KEYWORDS[k]?.lean === "vulgar") ? "vulgar" : "coincidental");

/** Of two Wards of the same kind the stronger counts (house rule): returns the dice that stand. */
export const wardStands = (old, fresh) => Math.max(n(old), n(fresh));

/* Saved rotes (3.23.0): a caster keeps keyword sets with their Spheres and plan, by name. */
export const ROTES_MAX = 40;

/** A rote from the Cast window's choices. */
export function roteFrom(name, {keywords = [], used = [], plan = {}, ctx = {}, kind = "coincidental", feat = 0} = {}) {
  const nm = String(name ?? "").trim().slice(0, 60);
  if ( !nm ) return null;
  return {name: nm, keywords: keywords.filter(k => KEYWORDS[k]), spheres: Object.fromEntries(used.filter(u => n(u.level) > 0).map(u => [u.sphere, n(u.level)])),
    plan: {targets: Math.max(0, n(plan.targets)), duration: Math.max(0, n(plan.duration)), area: !!plan.area},
    ctx: Object.fromEntries(Object.entries(ctx).filter(([, v]) => v === true || (typeof v === "string" && v && v.length <= 20))), kind: String(kind), feat: Math.max(0, n(feat))};
}

/** Keep a rote: one per name (a new one with the same name replaces it), the list sorted by name, at most ROTES_MAX. */
export function keepRote(list = [], rote) {
  if ( !rote ) return list;
  const key = rote.name.toLowerCase();
  const out = [...list.filter(r => String(r?.name ?? "").toLowerCase() !== key), rote].sort((a, b) => a.name.localeCompare(b.name));
  return out.slice(0, ROTES_MAX);
}

const SPHERE_KEYS = ["correspondence", "entropy", "forces", "life", "matter", "mind", "prime", "spirit", "time"];

/**
 * A rote from one of the system's Rote items: WoDX's own keyword set when the item carries one (flags), else the
 * item's Spheres and kind. data: {name, system, flags}.
 */
export function roteOfItem(data) {
  if ( !data ) return null;
  const kept = data.flags?.["wodx-actions"]?.rote;
  const spheres = Object.fromEntries(SPHERE_KEYS.filter(k => n(data.system?.[k]) > 0).map(k => [k, n(data.system[k])]));
  const kind = data.system?.spelltype === "vulgar" ? "vulgar" : "coincidental";
  const base = {name: String(data.name ?? "").slice(0, 60), keywords: [], spheres, plan: {targets: 0, duration: 0, area: false}, ctx: {}, kind, feat: 0};
  if ( !kept ) return base;
  return {...base, ...kept, name: base.name, spheres: Object.keys(spheres).length ? spheres : (kept.spheres ?? {}), keywords: (kept.keywords ?? []).filter(k => KEYWORDS[k])};
}

/** The system Rote item that holds a rote: its Spheres, its kind, and the whole keyword set on its flags. */
export function itemOfRote(rote) {
  const system = {spelltype: rote.kind === "coincidental" ? "coincidental" : "vulgar"};
  for ( const k of SPHERE_KEYS ) system[k] = n(rote.spheres?.[k]);
  return {name: rote.name, type: "Rote", system, flags: {"wodx-actions": {rote}}};
}

/**
 * Countermagick on a card (Mage 20th p. 545): each success cancels one of the caster's. Reflected, any beyond the
 * caster's turn the Effect back on its caster with that many successes. Returns {left, reflected}.
 */
export function countered(successes, counter, mode = "self") {
  const s = Math.max(0, n(successes)), c = Math.max(0, n(counter));
  return {left: Math.max(0, s - c), reflected: mode === "reflect" ? Math.max(0, c - s) : 0};
}

/** Is a target a mage who could counter (Arete 1 or more)? data: the actor's system data. */
export const canCounter = system => n(system?.advantages?.arete?.permanent) > 0;

/* ------------------------------------------------------------------ */
/*  The Storyteller's effect (3.31.0): any keyword, for any line       */
/* ------------------------------------------------------------------ */

/**
 * The Storyteller applies keywords straight, with no roll: for a ritual or rite of the players' own making, a power
 * not on any list yet, or a documented ritual before its page check. strength: 1 to 10. step: the p. 504 ladder,
 * 1 a turn, 2 a scene, 3 a day, 4 a story, 5 six months. Returns [{key, out}].
 */
export const ST_STRENGTH_MAX = 10;
export function stOutcomes(keywords = [], {strength = 1, step = 2, ctx = {}, area = false} = {}) {
  const str = Math.max(1, Math.min(ST_STRENGTH_MAX, n(strength) || 1));
  const st = Math.max(1, Math.min(5, n(step) || 2));
  const out = [];
  for ( const key of keywords ) {
    const K = KEYWORDS[key];
    if ( !K ) continue;
    // Strength keywords take the step as duration; the others read duration from strength, so it is set to 1
    const got = K.strength ? {ok: true, strength: str, duration: st - 1, targets: 0, area}
      : {ok: true, strength: 1, duration: st - 1, targets: 0, area};
    const o = outcome(key, got, ctx);
    if ( o ) out.push({key, out: {...o, source: "the Storyteller"}});
  }
  return out;
}

/** A ritual of the Storyteller's own: a named keyword set, kept in the world (B782). */
export const RITUALS_MAX = 60;
export function ritualFrom(name, {keywords = [], strength = 1, step = 2, ctx = {}, area = false, note = "", takes = ""} = {}) {
  const nm = String(name ?? "").trim().slice(0, 60);
  const ks = keywords.filter(k => KEYWORDS[k]);
  if ( !nm || !ks.length ) return null;
  return {name: nm, keywords: ks, strength: Math.max(1, Math.min(ST_STRENGTH_MAX, n(strength) || 1)), step: Math.max(1, Math.min(5, n(step) || 2)),
    ctx: Object.fromEntries(Object.entries(ctx).filter(([, v]) => v === true || (typeof v === "string" && v && v.length <= 80))),
    area: !!area, note: String(note ?? "").trim().slice(0, 300), takes: String(takes ?? "").trim().slice(0, 60)};
}
/** Keep a ritual: one per name, sorted, at most RITUALS_MAX. */
export const keepRitual = (list = [], r) => (r ? keepRote(list, r).slice(0, RITUALS_MAX) : list);
