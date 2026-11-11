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
    does: "Unnoticed (Mind) or unseen (Forces): noticing the target is at difficulty 6 + strength, 9 at most (house rule)."},
  sight:   {label: "Night Sight", opts: [{forces: 1}, {life: 2}], feat: 1, strength: false, tier: "auto", lean: "coincidental", timed: true,
    does: "The token sees in the dark for as long as the successes last."},
  rise:    {label: "Rise", opts: [{forces: 2, self: true}, {forces: 3}], feat: 2, strength: true, tier: "auto", lean: "vulgar", timed: true,
    does: "The token rises 5 feet for each success of strength (house rule)."},
  trip:    {label: "Disarm or Trip", opts: [{forces: 2}, {matter: 2}], feat: 2, strength: true, tier: "auto", lean: "coincidental",
    does: "The target is knocked down; resisting is Dexterity + Athletics at 6 + strength, 9 at most (house rule)."},
  hold:    {label: "Hold", opts: [{forces: 2}, {matter: 2}, {life: 3}, {mind: 3}], feat: 3, strength: true, tier: "auto", lean: "vulgar", timed: true,
    does: "Held: breaking free is Strength at 6 + strength, 9 at most (house rule)."},
  fear:    {label: "Fear", opts: [{mind: 2}], feat: 2, strength: true, tier: "queue", lean: "coincidental", timed: true, mind: true,
    does: "Afraid: the target keeps away from the caster or flees, as an NPC behaviour."},
  sway:    {label: "Sway", opts: [{mind: 2}], feat: 2, strength: true, tier: "queue", lean: "coincidental", mind: true,
    does: "An impulse or a mood planted; control of the mind needs Mind 4 and is an impressive feat (p. 502). The Storyteller plays it out."},
  shape:   {label: "Shape", opts: [{life: 3}, {matter: 2}], feat: 4, strength: true, tier: "queue", lean: "vulgar",
    does: "A change of form, for the Storyteller to approve and describe."},
  sideways:{label: "Step Sideways", opts: [{spirit: 3}], feat: 2, strength: false, tier: "queue", lean: "vulgar",
    does: "A crossing into the Umbra through WoDX Otherworlds, against the scene's Gauntlet."},
  free:    {label: "Free Effect", opts: [{any: 1}], feat: 1, strength: true, tier: "st", lean: "coincidental",
    does: "Anything else: the roll and its costs are tracked, the Storyteller says what happens."}
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
 * Returns {key, label, kind, ...}: kind is damage | heal | timed | light | quint | condition | note.
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
      return {...base, kind: "damage", levels, type: type === "none" ? "lethal" : type, soak: !spheres.every(s => s === "mind"),
        text: `${levels} ${type} level${levels === 1 ? "" : "s"}`};
    }
    case "mend": {
      const levels = eraRules(ctx.age).levels(str);
      return {...base, kind: "heal", levels, aggravated: !!ctx.aggravated, text: `${levels} health level${levels === 1 ? "" : "s"} healed${ctx.aggravated ? ", aggravated at a Quintessence point each" : ""}`};
    }
    case "charge": {
      const points = eraRules(ctx.age).levels(str);
      return {...base, kind: "quint", points: ctx.drain ? -points : points, text: `${points} Quintessence ${ctx.drain ? "drawn out" : "given"}`};
    }
    case "ward":
      return {...base, kind: "timed", name: "Warded", dice: str, text: `${str} armour dice for ${dur.label}`};
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
      return {...base, kind: "timed", name: "Afraid", text: `afraid of the caster for ${dur.label}`};
    case "sense":
      return {...base, kind: "note", text: `the caster senses it for ${dur.label}`};
    case "move":
      return {...base, kind: "move", text: "moves to where the caster means to go, in this scene"};
    default:
      return {...base, kind: "note", text: `${K.does} (strength ${str}, ${dur.label})`};
  }
}

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
    ctx: Object.fromEntries(Object.entries(ctx).filter(([, v]) => v === true)), kind: String(kind), feat: Math.max(0, n(feat))};
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
