/**
 * WoDX Targeting: the pure rules. No Foundry here, so the harness can test every choice.
 *
 * A power's tag is an intent and a range band, written "intent.range":
 *   intents: h hostile, p helpful, x healing (helpful, ranked by need), s self, a area, e either
 *   ranges:  t touch, r melee reach, v voice (30 yards), s line of sight, u unlimited (a target known by name)
 * A tag comes from the reviewed table (data/tags.json) when the power is in it, else from seedTag(), which reads
 * the power's own data: a difficulty set by the target, "passive", and words in its summary.
 */

export const INTENTS = {
  h: {key: "hostile", label: "a foe"},
  p: {key: "helpful", label: "a friend"},
  x: {key: "heal", label: "a friend in need"},
  s: {key: "self", label: "the character"},
  a: {key: "area", label: "everyone in the area"},
  e: {key: "either", label: "anyone"}
};
export const RANGES = {
  t: {key: "touch", label: "touch"},
  r: {key: "reach", label: "melee reach"},
  v: {key: "voice", label: "voice"},
  s: {key: "sight", label: "line of sight"},
  u: {key: "unlimited", label: "any distance"}
};
/** Voice range in yards (house rule, Ben 2026-11-08). */
export const VOICE_YARDS = 30;
export const MODES = ["off", "suggest", "auto"];
/** How many other candidates the window lists. */
export const OTHERS = 3;

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export function parseTag(code) {
  const [i, r] = String(code ?? "").split(".");
  if ( !INTENTS[i] || !RANGES[r] ) return null;
  return {i, r, intent: INTENTS[i].key, range: RANGES[r].key};
}
export const tagCode = t => `${t.i}.${t.r}`;
export const validTag = code => parseTag(code) !== null;

/* ------------------------------------------------------------------ */
/*  Seeding a tag from a power's own data                              */
/* ------------------------------------------------------------------ */

const HEAL = /\b(heals?|healing|mend(s|ing)?|restores? (health|corpus|vitality)|cures?|closes? wounds|soothes? wounds)\b/i;
const AREA = /\b(everyone|everybody|all (who|in|within|nearby|around|present|those)|each (person|creature|one|foe|enemy) (in|within|nearby|around)|anyone (in|within|nearby|who (hears|sees))|a crowd|the crowd|the room|the area|an area|radius|all around|whole (room|scene|area|building)|every (foe|enemy|creature|one|person) (in|within|nearby|around))\b/i;
const HELP = /\b(an? (ally|companion|packmate|friend|comrade)|allies|packmates|another('s)? (wounds|wraith's|garou|vampire's)|gives? (another|a companion|an ally)|grants? (another|a companion|an ally)|bless(es|ing)?|protects? (another|an ally|a companion|others))\b/i;
const HOSTILE = /\b(victim|victims|enemy|enemies|foe|foes|opponent|attacks?|damage|wounds? (a|the|an)|harms?|burns? (a|the|an)|terrif(y|ies)|frighten|paraly[sz]|blinds?|curses?|drains?|steals?|strikes?|commands? (a|the|an)|compels?|enslaves?|torment|agony|pain|sickens?|weakens?|tears|rends|crushes|knocks?|lethal|aggravated|bashing)\b/i;
const OTHER = /\b(target|targets|subject|someone|a person|another|a mortal|a creature|a vampire|a wraith|a spirit|a ghost|one person|whoever|his|her)\b/i;
const SELF_START = /^(always )?(senses?|sees?|hears?|smells?|tastes?|feels?|gains?|becomes?|grows?|turns? (into|to)|takes? (the )?(form|shape)|moves?|runs?|leaps?|hides?|vanishes|walks?|climbs?|ignores?|resists?|shrugs|knows?|learns?|reads? the (land|area|place|weather)|finds? (a|the|their|its) way|travels?|steps?|flies|swims|melds?|sinks?|fades?|blends?|shifts?|stays?|can|may|adds?|soaks?|halves?|spends?)\b/i;
const SELF_WORD = /\b(the (vampire|user|wraith|garou|werewolf|hunter|demon|mage|changeling|mummy|cainite|ghoul)('s)? (own )?(body|senses|form|corpus|blood|flesh|skin|eyes|mind)|itself|themselves|herself|himself|their own|own (body|form|senses|corpus|blood|flesh|wounds))\b/i;

const TOUCH = /\b(touch|touches|touching|by touch|a bite|bites|fed|feeds?|blood (fed|given)|drinks?|lay(s|ing)? hands|embrace|kiss)\b/i;
const REACH = /\b(claws?|bite|fangs|in reach|grapple|melee|strikes? with)\b/i;
const VOICE = /\b(voice|speaks?|spoken|words?|commands?|calls?|shouts?|howls?|sings?|song|whispers?|says|order)\b/i;
const SIGHT = /\b(eye contact|gaze|in sight|line of sight|sees|looks? (at|into)|meets? (the|their) eyes|stares?|glance)\b/i;
const FAR = /\b(anywhere|any distance|at a distance|far away|across (the|a)|miles|known by name|true name|by name|ritual|wherever|whoever .* (is|are))\b/i;

/**
 * A first guess at a power's tag from its data. p: {name, text, diff, passive, duration}.
 * diffFromTarget: the difficulty is set by the target's traits (a Willpower, Perception, Stamina...).
 */
export function seedTag(p = {}) {
  const text = `${p.text ?? ""}`;
  const both = `${p.name ?? ""}. ${text}`;
  const diff = String(p.diff ?? "");
  const fromTarget = /(^|\|)t[:A-Z]|opposed|resisted/.test(diff) || p.diffFromTarget === true;
  let i;
  if ( p.passive ) i = "s";
  else if ( HEAL.test(both) && !HOSTILE.test(text) ) i = "x";
  else if ( AREA.test(text) ) i = "a";
  else if ( fromTarget ) i = HELP.test(text) ? "e" : "h";
  else if ( HOSTILE.test(text) ) i = "h";
  else if ( HELP.test(text) ) i = "p";
  else if ( SELF_WORD.test(text) || (SELF_START.test(text.trim()) && !OTHER.test(text)) ) i = "s";
  else if ( OTHER.test(text) ) i = "e";
  else i = "s";
  let r;
  if ( i === "s" ) r = "t";
  else if ( FAR.test(text) ) r = "u";
  else if ( TOUCH.test(text) ) r = "t";
  else if ( REACH.test(text) && i === "h" ) r = "r";
  else if ( SIGHT.test(text) ) r = "s";
  else if ( VOICE.test(text) ) r = "v";
  else r = i === "x" ? "t" : i === "a" ? "v" : "s";
  return {...parseTag(`${i}.${r}`), by: "seed"};
}

/** The tag for a power: the reviewed table first, then the seed. table: {lib: {id: "h.v"}}. */
export function tagFor(table, lib, id, power = {}) {
  const code = table?.[lib]?.[id];
  const t = code ? parseTag(code) : null;
  if ( t ) return {...t, by: "table"};
  return seedTag(power);
}

/**
 * Casting windows with no power list (M20 Effects, Dark Ages mages and fae, C20 cantrips): a default intent from
 * what the casting uses. spheres: {life: 2, forces: 0, ...}; aimed: the caster means it for someone else.
 */
export function castIntent({spheres = {}, arts = [], realms = [], aimed = true} = {}) {
  const used = Object.entries(spheres).filter(([, v]) => Number(v) > 0).map(([k]) => k.toLowerCase());
  if ( used.length ) {
    if ( used.length === 1 && used[0] === "life" ) return "x";
    if ( aimed && used.some(k => k === "forces" || k === "entropy") ) return "h";
    if ( used.every(k => ["correspondence", "time", "mind", "spirit", "prime", "matter"].includes(k)) && !aimed ) return "s";
    return "e";
  }
  const a = arts.map(x => String(x).toLowerCase());
  if ( a.some(x => /pyretics|dragon'?s ?ire|dragonsire|autumn|winter/.test(x)) ) return "h";
  if ( a.some(x => /spring/.test(x)) ) return "x";
  if ( a.some(x => /wayfare|metamorphosis/.test(x)) && !realms.includes("actor") && !realms.includes("fae") ) return "s";
  return "e";
}

/* ------------------------------------------------------------------ */
/*  Sides, range and the ranking                                       */
/* ------------------------------------------------------------------ */

/** Foundry token dispositions. */
export const DISP = {SECRET: -2, HOSTILE: -1, NEUTRAL: 0, FRIENDLY: 1};

/**
 * Which side another token is on, seen from the acting token (WoDX NPC's rule): the other side by disposition;
 * a neutral or secret token is a foe only of someone it hurt, or who it hurt.
 */
export function sideOf(meDisp, otherDisp, hurtEither = false) {
  const odd = d => d === DISP.NEUTRAL || d === DISP.SECRET;
  if ( odd(meDisp) || odd(otherDisp) ) return hurtEither ? "foe" : "neutral";
  return meDisp === otherDisp ? "friend" : "foe";
}

/** Within the range band? c: {distance (yards or null), reach (bool), los (bool or null)}. */
export function inRange(range, c, {voiceYards = VOICE_YARDS} = {}) {
  const d = num(c.distance);
  switch ( range ) {
    case "touch": case "reach": return c.reach === true || (c.reach == null && d !== null && d <= 2);
    case "voice": return d === null ? true : d <= voiceYards && c.los !== false;
    case "sight": return c.los !== false;
    default: return true;
  }
}

const yd = d => (num(d) === null ? "" : `${Math.round(num(d))} yd`);

/**
 * Rank the candidates for one power. state:
 *   self: {id, name, wounds, max} or null (no token on the scene)
 *   tokens: [{id, name, side ("foe" | "friend" | "neutral"), disposition, visible, distance, reach, los, wounds, max,
 *             lastHitMe (a number, larger is later; null if never)}]
 *   lastTargetId: the user's last target, if any
 * Returns {pick, others, area, why, warn}. pick and the others are {id, name, side, why}; area lists every
 * token in range with its side, for the user to untick.
 */
export function rank(tag, state, {voiceYards = VOICE_YARDS, others = OTHERS} = {}) {
  const t = typeof tag === "string" ? parseTag(tag) : tag;
  const out = {pick: null, others: [], area: [], warn: null, intent: t?.intent ?? "either"};
  if ( !t ) return out;
  const self = state.self ?? null;
  const all = (state.tokens ?? []).filter(c => c.visible !== false && c.id !== self?.id);
  const near = (a, b) => (num(a.distance) ?? 1e9) - (num(b.distance) ?? 1e9) || String(a.name).localeCompare(String(b.name));
  const ok = c => inRange(t.range, c, {voiceYards});
  const entry = (c, why) => ({id: c.id, name: c.name, side: c.side, distance: num(c.distance), why});
  const selfEntry = why => (self ? {id: self.id, name: self.name, side: "self", distance: 0, why, self: true} : null);

  switch ( t.intent ) {
    case "self": {
      out.pick = selfEntry("the power works on its user");
      return out;
    }
    case "hostile": {
      const foes = all.filter(c => c.side === "foe" && ok(c));
      const hit = foes.filter(c => num(c.lastHitMe) !== null).sort((a, b) => num(b.lastHitMe) - num(a.lastHitMe));
      const engaged = foes.filter(c => c.reach === true && !hit.includes(c)).sort(near);
      const rest = foes.filter(c => !hit.includes(c) && !engaged.includes(c)).sort(near);
      const ordered = [
        ...hit.map((c, k) => entry(c, k === 0 ? `attacked ${self?.name ?? "them"} last` : `attacked ${self?.name ?? "them"} earlier`)),
        ...engaged.map(c => entry(c, "engaged in melee")),
        ...rest.map(c => entry(c, `nearest foe${yd(c.distance) ? `, ${yd(c.distance)}` : ""}`))
      ];
      out.pick = ordered[0] ?? null;
      out.others = ordered.slice(1, 1 + others);
      if ( out.pick && all.find(c => c.id === out.pick.id)?.disposition === DISP.NEUTRAL ) out.warn = "neutral";
      if ( !out.pick ) out.why = "no foe in range";
      return out;
    }
    case "heal": {
      const pool = all.filter(c => c.side === "friend" && ok(c));
      if ( self ) pool.push({...self, side: "self", distance: 0, reach: true, self: true});
      const hurt = pool.filter(c => num(c.wounds) > 0).sort((a, b) => num(b.wounds) - num(a.wounds) || near(a, b));
      const ordered = hurt.map(c => (c.self ? selfEntry(`most hurt (${c.wounds} level${c.wounds === 1 ? "" : "s"})`)
        : entry(c, `most hurt (${c.wounds} level${c.wounds === 1 ? "" : "s"})`)));
      ordered.slice(1).forEach(e => { e.why = `hurt (${pool.find(c => c.id === e.id)?.wounds} levels)`; });
      out.pick = ordered[0] ?? null;
      out.others = ordered.slice(1, 1 + others);
      if ( !out.pick ) { out.pick = selfEntry("no one in range is hurt"); }
      return out;
    }
    case "helpful": {
      const friends = all.filter(c => c.side === "friend" && ok(c)).sort(near);
      const ordered = friends.map(c => entry(c, `nearest ally${yd(c.distance) ? `, ${yd(c.distance)}` : ""}`));
      out.pick = ordered[0] ?? selfEntry("no ally in range");
      out.others = [...ordered.slice(1, others), ...(ordered.length ? [selfEntry("the character")] : [])].filter(Boolean).slice(0, others);
      return out;
    }
    case "area": {
      out.area = all.filter(ok).sort(near).map(c => ({...entry(c, c.side), tick: c.side !== "friend"}));
      out.why = out.area.length ? `${out.area.length} in range` : "no one in range";
      return out;
    }
    default: {
      const pool = all.filter(ok);
      const last = pool.find(c => c.id === state.lastTargetId);
      const foes = pool.filter(c => c.side === "foe" && c !== last).sort(near);
      const rest = pool.filter(c => c.side !== "foe" && c !== last).sort(near);
      const ordered = [...(last ? [entry(last, "the last target")] : []),
        ...foes.map(c => entry(c, `nearest foe${yd(c.distance) ? `, ${yd(c.distance)}` : ""}`)),
        ...rest.map(c => entry(c, c.side === "friend" ? "an ally" : "neutral"))];
      out.pick = last ? ordered[0] : (foes.length ? ordered[0] : null);
      out.others = (out.pick ? ordered.slice(1) : ordered).slice(0, others);
      if ( !out.pick ) out.why = "no clear target: choose one or leave it";
      return out;
    }
  }
}

/** The mode in force for this user. Automatic is for the Storyteller and NPCs only (house rule, Ben 2026-11-08). */
export function modeFor(setting, {isGM = false} = {}) {
  const m = MODES.includes(setting) ? setting : "suggest";
  if ( m === "auto" && !isGM ) return "suggest";
  return m;
}

/** Who attacked whom last, from WoDX Combat's attack cards in chat order. Returns Map(targetUuid → Map(attackerUuid → order)). */
export function lastHits(cards = []) {
  const out = new Map();
  cards.forEach((d, k) => {
    if ( !d?.attacker || !d?.target ) return;
    const m = out.get(d.target) ?? new Map();
    m.set(d.attacker, k + 1);
    out.set(d.target, m);
  });
  return out;
}

/** Should a hand-set target be kept? ids the user has now; ids the picker last set. */
export function handSet(current = [], lastSet = []) {
  if ( !current.length ) return false;
  if ( current.length !== lastSet.length ) return true;
  const s = new Set(lastSet);
  return !current.every(id => s.has(id));
}
