/**
 * WoDX Actions (B6000-B6004): the effects a power or ritual leaves on a character reach the dice. Before this, a Ward,
 * a Boost, a Blessing or a Curse, a Calm or a Rousing went on the sheet as a named effect that no roll read. Now:
 *   ward      armour dice on every soak (or only against its kind of harm: fire, sunlight, silver...)
 *   boost     dice on Physical, Social or Mental rolls, on soak or on Initiative (a Sap takes them away)
 *   fortune   the next roll's difficulty, up or down; the Blessing or Curse is spent on that roll
 *   calm      resisting frenzy is easier (the Beast or Rage soothed); rouse: harder
 * Pure: modsFrom reads plain effects [{id, name, key, data, disabled}]; the Foundry side is effectsOf and consumeOnce.
 * The numbers ride in the effect's WoDX Chronicle timed data (effects.js timedData), so an old effect without them
 * counts nothing, as before.
 */
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/** The keys, as WoDX Chronicle's timed effects carry them. */
export const KEYS = {ward: "wodx-effect-ward", boost: "wodx-effect-boost", fortune: "wodx-effect-fortune", calm: "wodx-effect-calm", hasten: "wodx-effect-hasten",
  penalty: "wodx-effect-penalty"};

/**
 * B6370: a penalty on every roll for a while (a clan's feeding law broken: -2 dice until dawn, V20 p. 395 and the
 * clan pages). It reaches every action roll: Attribute and Ability pools, Virtue checks, attacks, powers. Soak,
 * damage and Initiative are not actions, so they keep their dice.
 */
export const penaltyHits = (ctx = {}) => !ctx.soak && !ctx.initiative && !ctx.actions && !ctx.damage
  && (ctx.frenzy || (ctx.tags ?? []).length > 0 || !!ctx.any);
/** The dice the penalties on a character take from one action roll (a negative number), with their parts. */
export function penaltyFrom(effects = [], ctx = {any: true}) {
  let dice = 0;
  const parts = [];
  if ( !penaltyHits(ctx) ) return {dice, parts};
  for ( const e of effects ) {
    if ( !e || e.disabled || e.key !== KEYS.penalty || !n(e.data?.dice) ) continue;
    dice += n(e.data.dice);
    parts.push(`${e.name} ${n(e.data.dice) > 0 ? "+" : ""}${n(e.data.dice)}`);
  }
  return {dice, parts};
}

/** The roll tags each kind of Boost reaches (WoDX Chronicle rollTags words). */
export const BOOST_TAGS = {
  physical: ["physical", "strength", "dexterity", "stamina", "athletics", "brawl", "melee", "dodge", "ranged", "firearms", "archery", "lift", "balance"],
  social: ["social", "charisma", "manipulation", "appearance", "intimidation", "leadership", "voice", "seduce", "con", "fasttalk", "empathy", "etiquette", "subterfuge", "performance"],
  mental: ["mental", "perception", "intelligence", "wits", "awareness", "occult", "investigation", "academics", "science", "medicine", "computer", "linguistics", "sight", "hearing"]
};

/** What a timed result keeps for the dice: only the numbers its key reads. out: an effects-rules outcome. */
export function timedData(out = {}) {
  const d = {};
  if ( out.difficulty ) d.difficulty = n(out.difficulty);
  if ( out.key === "ward" ) { d.dice = n(out.dice); if ( out.against ) d.against = String(out.against); }
  if ( out.key === "boost" ) { d.dice = n(out.dice); d.on = String(out.on ?? "physical"); }
  if ( out.key === "fortune" ) { d.shift = n(out.shift); d.once = true; }
  if ( out.key === "fear" && Number.isFinite(out.shift) ) d.shift = n(out.shift);
  if ( out.key === "hasten" ) { d.actions = n(out.actions); if ( out.name === "Slowed" ) d.slow = true; }
  return Object.keys(d).length ? d : null;
}

/** The timed key a result goes under: a Calm or a Rousing is not a Fear, so it never holds the token away (binds.js). */
export function keyFor(out = {}) {
  if ( out.key === "fear" && (out.name === "Calmed" || out.name === "Roused") ) return KEYS.calm;
  return `wodx-effect-${out.key}`;
}

/** Does a Ward stand against this harm? A Ward with no kind stands against all of it. */
export function wardHolds(against, {type = "", of = "", fireSun = false, bane = false} = {}) {
  if ( !against || against === "any" ) return true;
  if ( against === of ) return true;
  if ( against === "fire" && (of === "fire" || fireSun) ) return true;
  if ( against === "sunlight" && (of === "sunlight" || fireSun) ) return true;
  if ( against === "silver" && (of === "silver" || bane) ) return true;
  return against === type;
}

/**
 * What the effects do to one roll. ctx: {tags: [], soak: bool, initiative: bool, frenzy: bool, harm: {type, of, fireSun, bane}}.
 * Returns {dice, diff, parts, once: [effect ids spent by this roll]}.
 */
export function modsFrom(effects = [], ctx = {}) {
  const tags = new Set((ctx.tags ?? []).map(t => String(t).toLowerCase()));
  const roll = tags.size > 0 || ctx.soak || ctx.initiative || ctx.frenzy;
  let dice = 0, diff = 0;
  const parts = [], once = [];
  let ward = 0, wardName = "";
  for ( const e of effects ) {
    if ( !e || e.disabled ) continue;
    const d = e.data ?? {};
    if ( e.key === KEYS.ward && ctx.soak && wardHolds(d.against, ctx.harm ?? {}) ) {
      // The stronger of two Wards counts (effects-rules KEYWORDS.ward)
      if ( n(d.dice) > ward ) { ward = n(d.dice); wardName = e.name; }
    } else if ( e.key === KEYS.boost && n(d.dice) ) {
      const on = d.on ?? "physical";
      const hit = (on === "soak" && ctx.soak) || (on === "initiative" && ctx.initiative)
        || ((BOOST_TAGS[on] ?? []).some(t => tags.has(t)) && !ctx.soak && !ctx.initiative);
      if ( hit ) { dice += n(d.dice); parts.push(`${e.name} ${n(d.dice) > 0 ? "+" : ""}${n(d.dice)}`); }
    } else if ( e.key === KEYS.fortune && n(d.shift) && roll && !ctx.soak && !ctx.initiative ) {
      diff += n(d.shift);
      parts.push(`${e.name} ${n(d.shift) > 0 ? "+" : ""}${n(d.shift)} diff`);
      if ( d.once && e.id ) once.push(e.id);
    } else if ( e.key === KEYS.hasten && n(d.actions) && (ctx.actions || ctx.initiative) ) {
      // B6012: Hastened: extra actions each turn (WoDX Combat's conductor); Slowed: 2 Initiative off for each step (house rule)
      if ( ctx.actions && !d.slow ) { dice += n(d.actions); parts.push(`${e.name} +${n(d.actions)} action${n(d.actions) === 1 ? "" : "s"}`); }
      if ( ctx.initiative && d.slow ) { dice -= 2 * n(d.actions); parts.push(`${e.name} -${2 * n(d.actions)} Initiative`); }
    } else if ( e.key === KEYS.calm && n(d.shift) && ctx.frenzy ) {
      diff += n(d.shift);
      parts.push(`${e.name} ${n(d.shift) > 0 ? "+" : ""}${n(d.shift)} diff`);
    }
  }
  if ( ward ) { dice += ward; parts.push(`${wardName} +${ward} armour`); }
  const pen = penaltyFrom(effects, ctx);
  if ( pen.dice ) { dice += pen.dice; parts.push(...pen.parts); }
  return {dice, diff, parts, once};
}

/** The token looks (WoDX Chronicle token looks): what a power on a character shows on the map. */
export const LOOKS = {
  Warded: {aura: {color: 0x7fb8ff, alpha: 0.28, radius: 0.72}},
  Boosted: {aura: {color: 0xffc94a, alpha: 0.26, radius: 0.68}},
  Sapped: {tint: 0xb8b8b8},
  Blessed: {aura: {color: 0xfff1b0, alpha: 0.24, radius: 0.7}},
  Cursed: {aura: {color: 0x5a2a6e, alpha: 0.32, radius: 0.72}, flicker: true},
  Calmed: {aura: {color: 0xa8d8ff, alpha: 0.22, radius: 0.66}},
  Roused: {aura: {color: 0xd04020, alpha: 0.26, radius: 0.7}, flicker: true},
  Manifest: {tint: 0xd8f0ff, aura: {color: 0xcfe8ff, alpha: 0.3, radius: 0.7}, flicker: true},
  Swayed: {aura: {color: 0xf0a0d0, alpha: 0.2, radius: 0.64}},
  Bound: {aura: {color: 0xa08060, alpha: 0.24, radius: 0.66}}
};
/** The look for one effect's name (a ritual's own label comes first: "Wood Ward: Warded" reads as Warded). */
export function lookFor(name = "") {
  const s = String(name);
  for ( const [k, v] of Object.entries(LOOKS) ) if ( s === k || s.endsWith(`: ${k}`) ) return v;
  return null;
}
/** The looks a character's plain effects give, by key: one for each kind of power on them. */
export function looksFrom(effects = []) {
  const BY_KEY = {[KEYS.ward]: "Warded", [KEYS.calm]: null, "wodx-effect-manifest": "Manifest", "wodx-effect-sway": "Swayed", "wodx-effect-bind": "Bound"};
  const out = [];
  for ( const e of effects ) {
    if ( !e || e.disabled || !String(e.key ?? "").startsWith("wodx-effect-") ) continue;
    const named = lookFor(e.name);
    const byKey = BY_KEY[e.key] ? LOOKS[BY_KEY[e.key]] : null;
    const l = named ?? byKey ?? (e.key === KEYS.boost ? LOOKS[n(e.data?.dice) < 0 ? "Sapped" : "Boosted"] : null)
      ?? (e.key === KEYS.fortune ? LOOKS[n(e.data?.shift) > 0 ? "Cursed" : "Blessed"] : null);
    if ( l ) out.push(l);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Foundry side                                                       */
/* ------------------------------------------------------------------ */

/** A character's live effects in the shape modsFrom reads. */
export function effectsOf(actor) {
  return [...(actor?.effects ?? [])].map(e => {
    const t = e.flags?.["wodx-chronicle"]?.timed ?? null;
    return {id: e.id, name: e.name ?? "", key: t?.key ?? null, data: t?.data ?? null, disabled: !!e.disabled};
  });
}
/** What the powers on a character do to one roll (see modsFrom). */
export const powerMods = (actor, ctx = {}) => modsFrom(effectsOf(actor), ctx);
/** B6370: the penalty dice alone (for a roll that reads no other power effect: a power window, a sin). */
export const penaltyOf = (actor, ctx = {any: true}) => penaltyFrom(effectsOf(actor), ctx);
/** After a roll: the Blessings and Curses it used are spent. Owners and the Storyteller only; others leave it to them. */
export async function consumeOnce(actor, ids = []) {
  if ( !actor || !ids?.length ) return 0;
  const have = ids.filter(id => actor.effects?.get?.(id));
  if ( !have.length ) return 0;
  if ( !(actor.isOwner || game.user?.isGM) ) return 0;
  try { await actor.deleteEmbeddedDocuments("ActiveEffect", have); } catch (e) { console.warn("WoDX | spend a blessing", e); return 0; }
  return have.length;
}
