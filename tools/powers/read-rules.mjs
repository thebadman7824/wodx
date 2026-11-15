/**
 * Is a power's effect READ by the game? (B6015, Ben 2026-11-15: rituals that only said they worked.)
 *
 * The powers inventory counted a power as applying when its effect landed on the effects card. A Ward or a Curse did
 * land: it put an effect named "Warded" or "Cursed" on the sheet. But no roll, soak, token or map system read it, so
 * in play it did nothing. This file says, for each kind of result, which system reads it, and READERS names the
 * file and the words in it that do the reading, so the guard test fails when a reader goes away.
 *
 *   read    some system changes the game from it (dice, soak, a token, the map, an NPC, a sheet pool, an item)
 *   told    a line of text for the Storyteller (a Free Effect, Time, a note): nothing changes by itself
 *   unread  it puts something on the sheet that nothing reads: a marker, the failure this guard is for
 */

/** Result kinds that change the game wherever they land (effects.js applyCore and acts.js). */
export const READ_KINDS = new Set(["damage", "heal", "quint", "pool", "light", "move", "cross", "weather", "summon", "give", "condition", "world",
  "banish", "place", "work", "memory", "vision", "seize", "mark", "cleanse", "remote", "path", "detect", "question"]);
/** Timed effects, by keyword: the system that reads each one. */
export const READ_TIMED = {
  ward: "soak (WoDX Combat soakAndApply, power-mods)", boost: "rolls, soak and Initiative (power-mods)", fortune: "the next roll (power-mods)",
  hasten: "extra actions and Initiative (WoDX Combat conductor, power-mods)", fear: "NPC behaviour and the token's moves (wodx-npc, binds.js); a Calm reaches the frenzy roll",
  veil: "noticing (WoDX Senses)", speak: "talk with beasts and ghosts (WoDX NPC)", shape: "the body plan (WoDX Combat body-rules)",
  rise: "flight and height (WoDX Combat movement)", sight: "the token's vision", possess: "the token's moves and the NPC's owners",
  bind: "the token's moves; an NPC's regard", sway: "the token's moves; an NPC's regard", manifest: "the token shows on this side",
  illusion: "a figure on the map", hold: "the Held condition"
};
/** The file and words that do the reading, checked by the guard test. */
export const READERS = [
  ["modules/wodx-combat/scripts/main.js", "powerModsOf(actor, { soak: true"],
  ["modules/wodx-combat/scripts/main.js", "powerModsOf(attacker, { tags:"],
  ["modules/wodx-combat/scripts/main.js", "powerModsOf(a, { initiative: true })"],
  ["modules/wodx-combat/scripts/conductor.js", "hastenExtra(c.actor)"],
  ["modules/wodx-actions/scripts/trait-hooks.js", "powerPart(actor, tags)"],
  ["modules/wodx-actions/scripts/main.js", "TH.spendOnce(actor, built)"],
  ["modules/wodx-actions/scripts/power-mods.js", "e.key === KEYS.ward && ctx.soak"],
  ["modules/wodx-actions/scripts/power-mods.js", "e.key === KEYS.fortune"],
  ["modules/wodx-actions/scripts/power-mods.js", "e.key === KEYS.calm"],
  ["modules/wodx-actions/scripts/power-mods.js", "e.key === KEYS.hasten"],
  ["modules/wodx-npc/scripts/main.mjs", "\"wodx-effect-fear\""],
  ["modules/wodx-senses/scripts/main.mjs", "\"wodx-effect-veil\""],
  ["modules/wodx-npc/scripts/talk-rules.mjs", "wodx-effect-speak"],
  ["modules/wodx-combat/scripts/body-rules.js", "wodx-effect-shape"],
  ["modules/wodx-combat/scripts/movement-rules.js", "wodx-effect-rise"],
  ["modules/wodx-actions/scripts/effects.js", "o.vision"],
  ["modules/wodx-actions/scripts/binds.js", "wodx-effect-(hold|possess|fear|sway|bind)"],
  ["modules/wodx-actions/scripts/effects.js", "possessFor(item, a, o)"],
  ["modules/wodx-actions/scripts/effects.js", "manifestOf(tok)"],
  ["modules/wodx-actions/scripts/effects.js", "illusionTile(item, tok, casterName)"],
  ["modules/wodx-actions/scripts/effects.js", "case \"banish\": return banishCore"],
  ["modules/wodx-actions/scripts/effects.js", "case \"place\": {"],
  ["modules/wodx-actions/scripts/effects.js", "case \"work\": return workCore"]
];

/** One result {key, out}: read, told or unread. */
export function readOf(key, out = {}) {
  const k = out.kind;
  // A summoning of any kind becomes a summoning on the effects card (effects.js planOf, summonResult, B4820)
  if ( key === "summon" ) return "read";
  if ( READ_KINDS.has(k) ) return "read";
  if ( k === "timed" ) {
    if ( key === "sight" ) return out.vision ? "read" : "unread";
    if ( key === "rise" ) return "read";
    return READ_TIMED[key] ? "read" : "unread";
  }
  return "told";
}

/** The specs (mage-da-effects helpers) inside a power's data: {kw, kind}, at any depth. */
export function specsIn(src, depth = 0, out = []) {
  if ( !src || depth > 4 || typeof src !== "object" ) return out;
  if ( Array.isArray(src) ) { for ( const x of src ) specsIn(x, depth + 1, out); return out; }
  if ( typeof src.kw === "string" && typeof src.kind === "string" ) out.push(src);
  for ( const [k, v] of Object.entries(src) ) if ( k !== "kw" && v && typeof v === "object" ) specsIn(v, depth + 1, out);
  return out;
}

/**
 * A whole power: read when every part is read, partly when some are, unread when it applies only markers, told when
 * it has only text. kwOutcome(base, flavours) gives the effects-rules outcome of a keyword.
 */
export function powerRead(row, kwOutcome, specOutcomes = null) {
  const parts = [];
  const specs = specsIn(row.src);
  if ( specs.length ) {
    for ( const s of specs ) {
      // The spec's real results, worked out as the effects card does (mage-da-effects outcomesOf), when given
      const got = specOutcomes ? specOutcomes(s) : null;
      if ( got?.length ) { for ( const r of got ) parts.push(r.st && r.key !== "summon" ? "told" : readOf(r.key, r.out)); continue; }
      if ( s.kind === "timed" ) parts.push(readOf(s.kw, {kind: "timed", vision: s.kw === "sight" ? true : undefined}));
      else if ( s.kind === "kw" ) parts.push(readOf(s.kw, kwOutcome(s.kw, s.ctx ?? {}) ?? {}));
      else if ( ["note", "st"].includes(s.kind) ) parts.push("told");
      else parts.push("read");
    }
  } else {
    for ( const raw of row.kw ?? [] ) {
      const [base, fl = ""] = String(raw).split(":");
      const o = kwOutcome(base, Object.fromEntries(fl.split("+").filter(Boolean).map(f => [f, true])));
      if ( o ) parts.push(readOf(base, o));
    }
  }
  // No keyword and no spec: the line's own system works it (a Sphere cast, a maneuver, the apocalyptic form)
  if ( !parts.length ) return "direct";
  if ( parts.every(p => p === "read") ) return "read";
  if ( parts.some(p => p === "read") ) return "partly";
  return parts.some(p => p === "unread") ? "unread" : "told";
}
