/**
 * WoDX Chronicle 0.18.0: the trait effect table's rules. Pure, no Foundry calls, so the harness can test them.
 *
 * A character's merits, flaws and backgrounds are the system's Feature items (system.type "wod.types.merit",
 * "wod.types.flaw" or "wod.types.background"), typed by hand. Each is matched to an entry of data/trait-effects.mjs by
 * its name or an alias, without case, spaces or punctuation; the item flag wodx-chronicle.trait = {key} overrides the
 * match (set from the "Trait effects" window), and {key: "none"} marks a home-made trait the table should leave alone.
 *
 * Kinds come from WoDX Combat's detection (the same words as Chronicle's "Only when" kind test). A trait held by a
 * kind that cannot hold it is matched but marked wrongKind: it does nothing until fixed. Mixed kinds count as both
 * where the books say so: a ghoul is also a mortal, a revenant is a ghoul, a Kinfolk is a mortal.
 */
import {MERITS_FLAWS, BACKGROUNDS, PATTERNS, BOOKS_DONE, SHOWS, SENSE_LOSS, SENSE_CHANNELS, ATTITUDE, HANDLED} from "../data/trait-effects.mjs";

export {PATTERNS, BOOKS_DONE, SHOWS, SENSE_LOSS, SENSE_CHANNELS, ATTITUDE, HANDLED};

/** A name with case, accents, quotes, spaces and punctuation taken out: "Can’t Cross Running Water" -> "cantcrossrunningwater". */
export const normName = s => String(s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");

/** The system's Feature type to "merit", "flaw" or "background" (null for anything else). */
export function featureKind(type) {
  const t = String(type ?? "").toLowerCase();
  if ( /merit/.test(t) ) return "merit";
  if ( /flaw/.test(t) ) return "flaw";
  if ( /background/.test(t) ) return "background";
  return null;
}

/** Kinds that also count as another kind for a trait's holders and against lists. */
export const ALSO = {ghoul: ["mortal"], revenant: ["ghoul", "mortal"], kinfolk: ["mortal"], hunter: ["mortal"], sorcerer: ["mortal"],
  psychic: ["mortal"], kinain: ["mortal"]};
export const kindsOf = kind => {
  const k = String(kind ?? "mortal").toLowerCase();
  return [k, ...(ALSO[k] ?? [])];
};
/** Does a holders or against list take this kind? */
export const kindFits = (list, kind) => !list?.length || list.includes("any") || kindsOf(kind).some(k => list.includes(k));

/** The table as one lookup: normalised name or alias -> entry. Entries keep their kind (merit, flaw, background). */
export function buildIndex(merits = MERITS_FLAWS, backgrounds = BACKGROUNDS) {
  const byName = new Map(), byKey = new Map();
  for ( const e of [...merits, ...backgrounds] ) {
    byKey.set(e.key, e);
    for ( const n of [e.name, ...(e.aliases ?? [])] ) {
      const k = normName(n);
      if ( !k ) continue;
      // A merit and a background may share a name (Status); keep both, keyed by kind
      const list = byName.get(k) ?? [];
      if ( !list.includes(e) ) list.push(e);
      byName.set(k, list);
    }
  }
  return {byName, byKey};
}
let INDEX = null;
const index = () => (INDEX ??= buildIndex());

/** The entry for one feature: {name, kind, flagKey}. The flag wins; then the name within its kind; then any kind. */
export function matchFeature({name, kind = null, flagKey = null} = {}, idx = index()) {
  if ( flagKey === "none" ) return null;
  if ( flagKey && idx.byKey.has(flagKey) ) return idx.byKey.get(flagKey);
  const list = idx.byName.get(normName(name)) ?? [];
  return list.find(e => !kind || e.kind === kind || (kind !== "background" && e.kind !== "background")) ?? null;
}

/**
 * A character's traits. view = {kind, features: [{id, name, kind, value, flagKey}]}.
 * Returns {matched: [{id, name, kind, value, key, entry, wrongKind, why}], unmatched: [{id, name, kind, value, skipped}]}.
 */
export function traitsOf(view = {}, idx = index()) {
  const matched = [], unmatched = [];
  for ( const f of view.features ?? [] ) {
    const kind = f.kind ?? null;
    if ( !kind ) continue;
    const entry = matchFeature(f, idx);
    if ( !entry ) { unmatched.push({id: f.id, name: f.name, kind, value: f.value ?? 0, skipped: f.flagKey === "none"}); continue; }
    const wrongKind = !kindFits(entry.holders, view.kind);
    matched.push({id: f.id, name: f.name, kind: entry.kind, value: Number(f.value) || 0, key: entry.key, entry, wrongKind,
      why: wrongKind ? `${entry.name} is held by ${entry.holders.join(" or ")}, not ${view.kind ?? "this kind"}` : ""});
  }
  return {matched, unmatched};
}

/** Does the character hold a trait? key or name; for a background, the rating (0 when not held). */
export function has(view, keyOrName, idx = index()) {
  const t = traitsOf(view, idx).matched.filter(m => !m.wrongKind);
  const want = normName(keyOrName);
  const hit = t.find(m => m.key === keyOrName || normName(m.entry.name) === want || (m.entry.aliases ?? []).some(a => normName(a) === want) || normName(m.name) === want);
  return hit ? (hit.kind === "background" ? Math.max(1, hit.value) : (hit.value || 1)) : 0;
}

/**
 * The effects of a character's traits on one channel. ctx = {channel, tags: [], against: kind of the other side}.
 * Each entry's effects: [{ch, tags?: [], dice?, diff?, againstKinds?: [], note}]. An effect with tags applies when any
 * of them is in ctx.tags. Returns [{key, name, dice, diff, note}].
 */
export function effectsFor(view, ctx = {}, idx = index()) {
  const out = [];
  const tags = (ctx.tags ?? []).map(t => String(t).toLowerCase());
  for ( const m of traitsOf(view, idx).matched ) {
    if ( m.wrongKind ) continue;
    if ( ctx.against && !kindFits(m.entry.against, ctx.against) ) continue;
    for ( const e of m.entry.effects ?? [] ) {
      if ( e.ch !== ctx.channel ) continue;
      // nameTags: only the tags named on the item count ("Acute Sense (hearing)"); none named, no effect
      const own = e.nameTags ? (e.tags ?? []).filter(t => String(m.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").includes(t)) : (e.tags ?? []);
      if ( e.tags?.length && !own.some(t => tags.includes(t)) ) continue;
      // againstKinds needs the other side's kind: an effect only on mortals does nothing when it is not known
      if ( e.againstKinds?.length && !(ctx.against && kindFits(e.againstKinds, ctx.against)) ) continue;
      let diff = Number(e.diff) || 0;
      if ( e.moon ) {
        const mo = normName(ctx.moon);
        const hit = Object.keys(e.moon).find(k => mo.includes(k));
        if ( !hit ) continue;
        diff = Number(e.moon[hit]) || 0;
      }
      out.push({key: m.key, name: m.entry.name, dice: Number(e.dice) || 0, diff, note: e.note ?? ""});
    }
  }
  return out;
}

/** The sum of some effects, with one part per trait for the roll card: {dice, diff, parts: ["Iron Will +3 diff"]}. */
export function sumEffects(list = []) {
  let dice = 0, diff = 0;
  const parts = [];
  for ( const e of list ) {
    dice += e.dice; diff += e.diff;
    if ( e.dice ) parts.push(`${e.name} ${e.dice > 0 ? "+" : ""}${e.dice}`);
    if ( e.diff ) parts.push(`${e.name} ${e.diff > 0 ? "+" : ""}${e.diff} diff`);
  }
  return {dice, diff, parts};
}

/**
 * Tags for a roll, from what it is made of: the Attribute and Ability keys, a WoDX Actions preset or quick check,
 * and the social action. Lower case words; the trait table's effects name the same words.
 */
const TAG_MAP = {
  perception: ["perception"], charisma: ["social"], manipulation: ["social"], appearance: ["social"], dexterity: ["dexterity"],
  intimidation: ["intimidation", "social"], leadership: ["leadership", "social"], expression: ["social"], etiquette: ["social"], subterfuge: ["social"],
  empathy: ["social"], streetwise: ["social"], persuasion: ["social", "voice"], performance: ["voice"], computer: ["computer"], linguistics: ["linguistics"],
  stealth: ["stealth"], firearms: ["ranged"], archery: ["ranged"], awareness: ["awareness"], alertness: ["perception"],
  "check-notice": ["perception", "sight"], "check-search": ["perception", "sight"], "check-cow": ["intimidation", "social"], "check-lead": ["leadership", "social"],
  "check-persuade": ["social", "voice"], "check-etiquette": ["social"], "check-computer": ["computer"], "check-hide": ["stealth"], "check-agility": ["balance", "dexterity"],
  "check-staycalm": ["frenzy"], "check-selfcontrol": ["frenzy"], "check-readperson": ["perception"], "check-uncanny": ["awareness"],
  "social-persuade": ["social", "voice"], "social-fasttalk": ["social", "voice"], "social-con": ["social", "voice"], "social-intimidate": ["intimidation", "social"],
  "social-threaten": ["intimidation", "social"], "social-question": ["social"], "social-bribe": ["social"], "social-charm": ["social", "voice"], "social-seduce": ["social", "voice"],
  "social-lift": ["dexterity"], "social-plant": ["dexterity"],
  frenzy: ["frenzy"], instinct: ["frenzy"]
};
export function rollTags(...keys) {
  const out = new Set();
  for ( const k of keys.flat() ) {
    if ( !k ) continue;
    const s = String(k);
    for ( const t of TAG_MAP[s] ?? TAG_MAP[s.toLowerCase()] ?? [] ) out.add(t);
  }
  return [...out];
}

/** WoDX Senses' sense names to the trait table's roll tags. */
export const SENSE_TAGS = {sight: ["sight", "perception"], sound: ["hearing", "perception"], smell: ["smell", "taste", "perception"], touch: ["touch", "perception"]};

/**
 * What a character's traits do to their own senses, for WoDX Senses: {mods: [{label, n, senses}], cannot: [sense], channels: []}.
 * n is a difficulty change (Acute Sense -2, Bad Sight +2). A perception-wide effect counts once, on every sense.
 */
export function senseEffects(view, idx = index()) {
  const mods = [], cannot = [], channels = [];
  for ( const sense of Object.keys(SENSE_TAGS) ) {
    const own = SENSE_TAGS[sense].filter(t => t !== "perception");
    for ( const e of effectsFor(view, {channel: "roll", tags: own}, idx) ) if ( e.diff ) mods.push({label: e.name, n: e.diff, senses: [sense]});
  }
  for ( const e of effectsFor(view, {channel: "roll", tags: ["perception"]}, idx) ) {
    if ( !e.diff || mods.some(m => m.label === e.name) ) continue;
    mods.push({label: e.name, n: e.diff, senses: Object.keys(SENSE_TAGS)});
  }
  for ( const m of traitsOf(view, idx).matched ) {
    if ( m.wrongKind ) continue;
    if ( SENSE_LOSS[m.key] ) cannot.push(SENSE_LOSS[m.key]);
    if ( SENSE_CHANNELS[m.key] ) channels.push(SENSE_CHANNELS[m.key]);
  }
  return {mods, cannot: [...new Set(cannot)], channels: [...new Set(channels)]};
}

/** What others can sense about a character (P15): [{key, name, lines: {sense: [{t, n}]}, glows, strong, indoor}]. */
export function showsOf(view, idx = index()) {
  const out = [];
  for ( const m of traitsOf(view, idx).matched ) {
    const S = SHOWS[m.key];
    if ( !S || m.wrongKind ) continue;
    const lines = {};
    for ( const k of ["sight", "sound", "smell", "touch"] ) if ( S[k] ) lines[k] = S[k];
    out.push({key: m.key, name: m.entry.name, lines, glows: !!S.glows, strong: !!S.strong, indoor: !!S.indoor});
  }
  return out;
}

/**
 * How a character's traits move an NPC's first regard (P7): {delta, names}. npcKind: the NPC's kind (an effect with
 * againstKinds needs it). The sum is held to two steps either way, so traits never make a first meeting hunted on sight.
 */
export function attitudeSeed(view, npcKind = null, idx = index()) {
  let delta = 0;
  const names = [];
  for ( const m of traitsOf(view, idx).matched ) {
    const A = ATTITUDE[m.key];
    if ( !A || m.wrongKind ) continue;
    if ( A.againstKinds?.length && !(npcKind && kindFits(A.againstKinds, npcKind)) ) continue;
    delta += A.delta;
    names.push(m.entry.name);
  }
  return {delta: Math.max(-2, Math.min(2, delta)), names};
}

/** Book names with no entry, for the coverage test: names = [{name, kind, book}]. Only books in BOOKS_DONE count. */
export function missing(names = [], idx = index()) {
  return names.filter(n => BOOKS_DONE.includes(n.book) && !matchFeature({name: n.name, kind: n.kind}, idx));
}

/** Entries that break the table's own rules (the coverage test runs this). */
export function problems(merits = MERITS_FLAWS, backgrounds = BACKGROUNDS) {
  const out = [], keys = new Set();
  for ( const e of [...merits, ...backgrounds] ) {
    if ( keys.has(`${e.kind}:${e.key}`) ) out.push(`${e.key}: listed twice`);
    keys.add(`${e.kind}:${e.key}`);
    if ( e.kind === "background" ) { if ( !e.hook ) out.push(`${e.key}: no hook`); continue; }
    if ( !e.holders?.length || !e.against?.length ) out.push(`${e.key}: needs holders and against`);
    if ( !e.patterns?.length ) out.push(`${e.key}: no pattern`);
    for ( const p of e.patterns ?? [] ) if ( !PATTERNS[p] ) out.push(`${e.key}: no pattern ${p}`);
    if ( !Number.isFinite(e.page) ) out.push(`${e.key}: no page`);
  }
  return out;
}

/** One line for a matched trait, for the Trait effects window. */
export function describe(m) {
  const e = m.entry;
  if ( e.kind === "background" ) return `Background: ${e.hook}`;
  const pats = (e.patterns ?? []).map(p => PATTERNS[p]).filter(Boolean).join(", ");
  // every way WoDX carries the trait out: roll effects, senses, signs, first meetings, the Actions windows
  const k = e.key;
  const ways = [...(e.effects ?? []).map(x => x.note).filter(Boolean),
    ...(SENSE_LOSS[k] ? [`no ${SENSE_LOSS[k]} in WoDX Senses`] : []), ...(SENSE_CHANNELS[k] ? ["a channel of its own in WoDX Senses"] : []),
    ...(SHOWS[k] ? ["others nearby can sense it (WoDX Senses)"] : []),
    ...(ATTITUDE[k] ? [`a first meeting with an NPC ${ATTITUDE[k].delta > 0 ? "warmer" : "colder"}${ATTITUDE[k].againstKinds ? ` (${ATTITUDE[k].againstKinds.join(", ")} only)` : ""}`] : []),
    ...(HANDLED[k] ? [HANDLED[k]] : [])];
  const live = ways.length ? ways.join("; ") : "no automatic effect yet";
  return `${pats}. ${live}. ${e.book} p. ${e.page}`;
}
