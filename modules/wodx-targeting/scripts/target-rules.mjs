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
  const [base, sh] = String(code ?? "").split(":");
  const [i, r] = base.split(".");
  if ( !INTENTS[i] || !RANGES[r] ) return null;
  const out = {i, r, intent: INTENTS[i].key, range: RANGES[r].key};
  const shape = sh ? parseShape(sh) : null;
  if ( shape ) out.shape = shape;
  return out;
}
export const tagCode = t => `${t.i}.${t.r}${t.shape ? `:${shapeCode(t.shape)}` : ""}`;
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
  const out = t ? {...t, by: "table"} : seedTag(power);
  // An area power with no shape in its tag: a size its own text names (0.2.0)
  if ( out?.intent === "area" && !out.shape ) { const sh = shapeFromText(power.text ?? ""); if ( sh ) out.shape = sh; }
  return out;
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

/* ------------------------------------------------------------------ */
/*  Area shapes (0.2.0)                                                */
/* ------------------------------------------------------------------ */

/**
 * An area power's shape, written after the tag: "a.v:b10" (a.intent.range:shape). Sizes are in yards.
 *   b  burst: everyone within N yards of the user (the user is not in it)
 *   c  circle of radius N yards, centred where the user points, within the power's range
 *   k  cone N yards long from the user, CONE_DEGREES wide
 *   l  line N yards long and LINE_WIDTH wide from the user
 * The books give few sizes: where a power names one ("everyone within ten yards") the seed reads it; otherwise the
 * size follows the range band (house rule, B1300): touch a 1-yard burst, reach 2, voice the voice range, sight a
 * 5-yard circle where it lands, any distance no shape at all.
 */
export const SHAPES = {
  b: {key: "burst", label: "a burst round the user", origin: "self"},
  c: {key: "circle", label: "a circle where it is aimed", origin: "point"},
  k: {key: "cone", label: "a cone from the user", origin: "self", aimed: true},
  l: {key: "line", label: "a line from the user", origin: "self", aimed: true}
};
export const CONE_DEGREES = 60;
export const LINE_WIDTH = 1;
export const SIGHT_CIRCLE = 5;
export const MAX_SIZE = 200;

export function parseShape(code) {
  const m = /^([bckl])(\d+(?:\.\d+)?)$/.exec(String(code ?? "").trim());
  if ( !m ) return null;
  const size = Math.min(MAX_SIZE, Number(m[2]));
  if ( !(size > 0) ) return null;
  return {s: m[1], ...SHAPES[m[1]], size};
}
export const shapeCode = sh => `${sh.s}${sh.size}`;

const WORDN = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, fifty: 50, hundred: 100};
const toYards = (n, unit) => (/^(foot|feet|ft)/i.test(unit) ? n / 3 : /^(met|metr)/i.test(unit) ? n * 1.09361 : n);

/** A size and shape named in a power's text, or null. "within ten yards", "a 20-foot radius", "a cone ...". */
export function shapeFromText(text = "") {
  const t = String(text);
  const m = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|fifty|hundred)[- ](yards?|feet|foot|ft|met(?:er|re)s?)\b/i.exec(t);
  if ( !m ) return null;
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : WORDN[m[1].toLowerCase()];
  const size = Math.max(1, Math.round(toYards(n, m[2])));
  const s = /\bcone\b/i.test(t) ? "k" : /\b(line|beam|ray|bolt)\b/i.test(t) ? "l" : /\b(of|around|round|about) (the|her|his|their|its) (user|vampire|caster|garou|wraith|self|body)|\bwithin\b/i.test(t) ? "b" : "c";
  return parseShape(`${s}${Math.min(MAX_SIZE, size)}`);
}

/** The shape an area power uses: the tag's own, then one named in the power's text, then the range band's. */
export function areaShape(tag, power = {}, {voiceYards = VOICE_YARDS} = {}) {
  const t = typeof tag === "string" ? parseTag(tag) : tag;
  if ( !t || t.intent !== "area" ) return null;
  if ( t.shape ) return {...t.shape, by: "tag"};
  const fromText = shapeFromText(power.text ?? "");
  if ( fromText ) return {...fromText, by: "text"};
  const def = {touch: "b1", reach: "b2", voice: `b${voiceYards}`, sight: `c${SIGHT_CIRCLE}`}[t.range];
  return def ? {...parseShape(def), by: "range"} : null;
}

/** "a burst of 10 yd round the user" and the like. */
export function shapeLabel(sh) {
  if ( !sh ) return "anyone the user names";
  const yd = `${Math.round(sh.size * 10) / 10} yd`;
  if ( sh.s === "b" ) return `everyone within ${yd} of the user`;
  if ( sh.s === "c" ) return `a circle of ${yd} radius where it is aimed`;
  if ( sh.s === "k" ) return `a cone ${yd} long from the user`;
  return `a line ${yd} long from the user`;
}

/**
 * Is a point inside the shape? Positions in yards. at: {origin: {x, y}, dir (radians, for cones and lines)}.
 * A token counts when its centre is inside, or its edge for a token wider than a yard (radius: half its width).
 */
export function inShape(sh, at, p, radius = 0) {
  if ( !sh || !at?.origin || !p ) return false;
  const dx = p.x - at.origin.x, dy = p.y - at.origin.y;
  const d = Math.hypot(dx, dy);
  const r = Math.max(0, Number(radius) || 0);
  if ( sh.s === "b" || sh.s === "c" ) return d <= sh.size + r + 1e-9;
  const dir = Number(at.dir) || 0;
  const ux = Math.cos(dir), uy = Math.sin(dir);
  const along = dx * ux + dy * uy, across = Math.abs(-dx * uy + dy * ux);
  if ( sh.s === "l" ) return along >= -r && along <= sh.size + r && across <= LINE_WIDTH / 2 + r;
  if ( d <= r ) return true;
  if ( d > sh.size + r ) return false;
  const ang = Math.acos(Math.max(-1, Math.min(1, along / d)));
  return ang <= (CONE_DEGREES / 2) * Math.PI / 180 + Math.atan2(r, d);
}

/** The outline of a shape as points in yards (for drawing on the map): a circle as 32 points, a cone as a fan. */
export function outline(sh, at) {
  if ( !sh || !at?.origin ) return [];
  const {x, y} = at.origin, dir = Number(at.dir) || 0, pts = [];
  if ( sh.s === "b" || sh.s === "c" ) {
    for ( let k = 0; k < 32; k++ ) { const a = (k / 32) * 2 * Math.PI; pts.push({x: x + sh.size * Math.cos(a), y: y + sh.size * Math.sin(a)}); }
    return pts;
  }
  if ( sh.s === "l" ) {
    const ux = Math.cos(dir), uy = Math.sin(dir), nx = -uy * LINE_WIDTH / 2, ny = ux * LINE_WIDTH / 2;
    return [{x: x + nx, y: y + ny}, {x: x + ux * sh.size + nx, y: y + uy * sh.size + ny}, {x: x + ux * sh.size - nx, y: y + uy * sh.size - ny}, {x: x - nx, y: y - ny}];
  }
  const half = (CONE_DEGREES / 2) * Math.PI / 180;
  pts.push({x, y});
  for ( let k = 0; k <= 12; k++ ) { const a = dir - half + (k / 12) * 2 * half; pts.push({x: x + sh.size * Math.cos(a), y: y + sh.size * Math.sin(a)}); }
  return pts;
}

/**
 * The area list for a placed shape. tokens: as rank()'s state, each with pos {x, y} in yards and radius (yards).
 * The user's own token is never in it. Allies come unticked, as for any area power.
 */
export function inArea(sh, at, tokens = [], {selfId = null} = {}) {
  return tokens.filter(c => c.visible !== false && c.id !== selfId && c.pos && inShape(sh, at, c.pos, c.radius))
    .map(c => ({id: c.id, name: c.name, side: c.side, distance: num(c.distance), why: c.side, tick: c.side !== "friend"}))
    .sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9) || String(a.name).localeCompare(String(b.name)));
}
