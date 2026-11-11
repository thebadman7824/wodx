/**
 * WoDX Senses: the rules. Pure: no Foundry calls, so the harness can test every part.
 *
 * An answer to "what do I see, hear, smell, feel" is a short stack of authored lines. Each line is
 *   {t: text, n: need (successes, 0 = anyone notices), e: [era bands], p: [parts of the day], sky: [skies],
 *    io: "in" | "out", w: weight}
 * and comes from one of four layers: the place (its kind, or the Storyteller's own lines), the hour, sky and calendar,
 * live sources on the map (lights, fire, doors, people, noise), and the senses of powers (channels). Reach and light
 * decide which sources this character could perceive at all; successes decide how many lines and which ones.
 * The draw is seeded, so the same question in the same hour and place gives the same answer.
 */
import {stream, shuffled, expand} from "../../wodx-chronicle/scripts/gen-core.mjs";

export const SENSES = {
  sight: {label: "Sight", verb: "Looking", cmd: "look"},
  sound: {label: "Hearing", verb: "Listening", cmd: "listen"},
  smell: {label: "Smell", verb: "Smelling", cmd: "smell"},
  touch: {label: "Touch and air", verb: "Feeling the air", cmd: "touch"}
};
export const SENSE_KEYS = Object.keys(SENSES);

/** Era bands for the place lines. The lines that carry no band fit every era. */
export const ERA_BANDS = {
  medieval: "Before 1450", early: "1450 to 1849", industrial: "1850 to 1949", modern: "1950 to 2009", future: "2010 on"
};
export function eraBand(year) {
  const y = Number(year) || 1197;
  return y < 1450 ? "medieval" : y < 1850 ? "early" : y < 1950 ? "industrial" : y < 2010 ? "modern" : "future";
}

/** Place kinds (as WoDX NPC tags them) that are indoors unless the Storyteller says otherwise. */
export const INDOOR_KINDS = ["home", "workplace", "church", "tavern", "haven", "castle"];
export function isIndoor(place = {}) {
  if ( place.io === "in" ) return true;
  if ( place.io === "out" ) return false;
  return INDOOR_KINDS.includes(place.kind);
}

/** Night, dawn, day or dusk from the hour and the sun's times (hours after midnight; null on polar days). */
export function partOfDay({hours, sunrise, sunset, isNight}) {
  const h = Number(hours) || 0;
  if ( typeof sunrise !== "number" || typeof sunset !== "number" ) return isNight ? "night" : "day";
  if ( Math.abs(h - sunrise) < 0.75 ) return "dawn";
  if ( Math.abs(h - sunset) < 0.75 ) return "dusk";
  return (h > sunrise && h < sunset) ? "day" : "night";
}

/** The moon as the lines name it: new, crescent, half, gibbous, full. */
export function moonWord(index) {
  return ["new", "crescent", "half", "gibbous", "full", "gibbous", "half", "crescent"][((Number(index) || 0) % 8 + 8) % 8];
}

/**
 * How much light there is where the character stands: bright, dim, dark or pitch.
 * daylight: the scene's own darkness is low; lit: inside one of the scene's lights; moon: illumination 0 to 1.
 */
export function lightLevel({daylight = false, lit = false, indoor = false, moon = 0, part = "night", sky = "clear", darkness = 0} = {}) {
  if ( lit ) return "bright";
  if ( daylight ) return indoor ? "dim" : (sky === "storm" ? "dim" : "bright");
  // A scene the Storyteller made fully dark stays dark at dawn and dusk too
  if ( (part === "dawn" || part === "dusk") && !(Number(darkness) >= 0.75) ) return indoor ? "dark" : "dim";
  if ( indoor ) return "pitch";
  const veiled = sky === "overcast" || sky === "storm";
  const m = veiled ? moon * 0.25 : moon;
  return m >= 0.6 ? "dim" : m >= 0.15 ? "dark" : "pitch";
}

/** Difficulty steps (house rules, shown on the card and changeable there). */
export const STEPS = {
  dim: 1, dark: 2, crowd: 1, storm: 1, door: 1, wind: 1, masked: 1, fog: 2, mist: 1
};
export const BASE_DIFFICULTY = 6;
export const FLOOR = 3;

/**
 * The difficulty for one sense, and why. ctx: {light, crowd, sky, indoor, door, masked, wx (weather tags), heavy}. powers: see powersFor().
 * blind: true when nothing can be seen at all (pitch dark with no power that sees in it).
 */
export function difficulty(sense, ctx = {}, powers = {}) {
  let diff = BASE_DIFFICULTY;
  const parts = [];
  const add = (label, n) => { if ( n ) { diff += n; parts.push(`${label} ${n > 0 ? "+" : ""}${n}`); } };
  let blind = false;
  const wx = Array.isArray(ctx.wx) ? ctx.wx : null;
  const out = !ctx.indoor;
  if ( sense === "sight" ) {
    if ( powers.darkSight ) { if ( ctx.light !== "bright" ) parts.push(`${powers.darkSight}: no darkness step`); }
    else if ( ctx.light === "pitch" ) blind = true;
    else if ( ctx.light === "dark" ) add("Darkness", STEPS.dark);
    else if ( ctx.light === "dim" ) add("Dim light", STEPS.dim);
    if ( wx && out ) {
      if ( wx.includes("fog") ) add("Thick fog", STEPS.fog);
      else if ( wx.includes("mist") ) add("Mist", STEPS.mist);
      else if ( wx.includes("downpour") || (wx.includes("snow") && ctx.heavy) ) add("Heavy rain or snow", STEPS.storm);
    }
  }
  if ( sense === "sound" ) {
    if ( ctx.crowd ) add("A noisy place", STEPS.crowd);
    if ( wx ) { if ( out && (wx.includes("gale") || wx.includes("thunder") || wx.includes("downpour") || wx.includes("hail")) ) add("Storm noise", STEPS.storm); }
    else if ( out && (ctx.sky === "storm" || ctx.sky === "overcast") ) add("Rain or storm", STEPS.storm);
  }
  if ( sense === "smell" ) {
    if ( wx ) { if ( out && wx.includes("rain") ) add(wx.includes("downpour") ? "Heavy rain washes scent away" : "Rain masks scent", wx.includes("downpour") ? STEPS.wind + 1 : STEPS.wind); }
    else if ( out && ctx.sky === "storm" ) add("Wind and rain", STEPS.wind);
    if ( ctx.masked ) add("A stronger smell", STEPS.masked);
  }
  for ( const m of powers.mods ?? [] ) if ( !m.senses || m.senses.includes(sense) ) add(m.label, -Math.abs(m.n));
  // merits and flaws keep their own sign: Acute Sense -2, Bad Sight +2
  for ( const m of powers.traitMods ?? [] ) if ( !m.senses || m.senses.includes(sense) ) add(m.label, Number(m.n) || 0);
  const lost = (powers.cannot ?? []).find(c => c.sense === sense);
  if ( lost ) return {diff: BASE_DIFFICULTY, parts: [], blind: true, lost: lost.label};
  const floored = Math.max(FLOOR, Math.min(10, diff));
  if ( floored !== diff ) parts.push(`no lower than ${FLOOR}`);
  return {diff: floored, parts, blind};
}

/**
 * What a character's powers do to the senses. traits: {auspex, heightened (Gift), form, eyesOfCat, senseWyrm,
 * senseUnnatural, trueForm, awareness, kenning, primalUrge, spheres: {life, spirit, entropy, prime}, kind, layer,
 * secondSight, fae}. Returns {mods: [{label, n, senses?}], darkSight, channels: [ids], smellFirst, reach: {sound, smell}}.
 */
export function powersFor(t = {}) {
  const mods = [], channels = [];
  let darkSight = null, smellFirst = false;
  const reach = {sound: 0, smell: 0};
  const auspex = Number(t.auspex) || 0;
  if ( auspex > 0 && t.useAuspex !== false ) { mods.push({label: "Heightened Senses (Auspex)", n: auspex}); reach.sound += 1; reach.smell += 1; }
  const wolf = ["hispo", "lupus"].includes(t.form), wolfish = wolf || t.form === "crinos";
  if ( t.heightened ) mods.push({label: "Heightened Senses (Gift)", n: wolf ? 3 : 2});
  if ( t.eyesOfCat ) darkSight = "Eyes of the Cat";
  if ( wolfish ) { smellFirst = true; reach.smell += 1; }
  if ( t.senseWyrm ) channels.push("taint");
  if ( t.senseUnnatural || t.secondSight ) channels.push("unnatural");
  if ( t.trueForm ) channels.push("trueform");
  if ( (Number(t.awareness) || 0) > 0 || (Number(t.kenning) || 0) > 0 || (Number(t.primalUrge) || 0) > 0 ) channels.push("uncanny");
  const sp = t.spheres ?? {};
  for ( const k of ["life", "spirit", "entropy", "prime"] ) if ( (Number(sp[k]) || 0) >= 1 ) channels.push(`sphere-${k}`);
  if ( t.fae ) channels.push("chimerical");
  if ( t.kind === "wraith" && t.layer === "shadowlands" ) channels.push("lifesight");
  // merits and flaws (WoDX Chronicle's trait table): signed difficulty changes, senses lost, channels opened
  const ts = t.traitSenses ?? {};
  const traitMods = (ts.mods ?? []).map(m => ({label: m.label, n: Number(m.n) || 0, senses: m.senses}));
  const cannot = (ts.cannot ?? []).map(sense => ({sense, label: sense === "sight" ? "Blind" : sense === "sound" ? "Deaf" : "Lost"}));
  for ( const c of ts.channels ?? [] ) channels.push(c);
  return {mods, traitMods, cannot, darkSight, channels: [...new Set(channels)], smellFirst, reach};
}

/** The line for a sense a character does not have. */
export const lostLine = sense => sense === "sight" ? "Blind: nothing can be seen." : sense === "sound" ? "Deaf: nothing can be heard." : "Nothing comes through this sense.";

/** Does a line fit the moment? ctx: {era, part, sky, indoor, moon, wx (the weather's tags, when WoDX Atmosphere is on)} */
export function fits(line, ctx = {}) {
  if ( !line || !line.t ) return false;
  if ( line.e && !line.e.includes(ctx.era) ) return false;
  if ( line.p && !line.p.includes(ctx.part) ) return false;
  if ( line.sky && !line.sky.includes(ctx.sky) ) return false;
  if ( line.io === "in" && !ctx.indoor ) return false;
  if ( line.io === "out" && ctx.indoor ) return false;
  if ( line.moon && !line.moon.includes(ctx.moon) ) return false;
  // Weather tags (WoDX Atmosphere): a line that names weather shows only when that weather is here
  if ( line.wx && Array.isArray(ctx.wx) && !line.wx.some(t => ctx.wx.includes(t)) ) return false;
  return true;
}

/** The Storyteller's own lines for a place: one a line of text. A leading number and colon sets the need ("2: ..."). */
export function parseOwnLines(text) {
  return String(text ?? "").split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 30).map(s => {
    const m = s.match(/^([0-5])\s*:\s*(.+)$/);
    return m ? {t: m[2], n: Number(m[1]), own: true} : {t: s, n: 0, own: true};
  });
}

/**
 * The place layer for one sense: the Storyteller's own lines first; the kind's base lines too unless replaced.
 * tables: {places: {kinds: {<kind>: {<sense>: [lines]}}}}, place: {kind, own: {<sense>: text}, replace}
 */
export function placeLines(tables, place = {}, sense, ctx) {
  const own = parseOwnLines(place.own?.[sense]);
  if ( place.replace && own.length ) return own;
  const kinds = tables?.places?.kinds ?? {};
  const base = (kinds[place.kind]?.[sense] ?? kinds.other?.[sense] ?? []).filter(l => fits(l, ctx));
  return [...own, ...base];
}

/** The hour, sky, moon and calendar layer for one sense. cal: {feast, curfew} */
export function conditionLines(tables, sense, ctx, cal = {}) {
  const c = tables?.conditions ?? {};
  const pick = node => (node?.[sense] ?? []).filter(l => fits(l, ctx));
  const out = [...pick(c.part?.[ctx.part]), ...pick(c.sky?.[ctx.sky])];
  for ( const tag of Array.isArray(ctx.wx) ? ctx.wx : [] ) out.push(...pick(c.weather?.[tag]));
  if ( !ctx.indoor && ctx.part === "night" ) out.push(...pick(c.moon?.[ctx.moon]));
  if ( cal.feast ) out.push(...pick(c.feast).map(l => ({...l, vars: {feast: cal.feast}})));
  if ( cal.curfew ) out.push(...pick(c.curfew));
  return out;
}

/** The Penumbra or Shadowlands lines in place of the physical ones. place.resonance: wyld, weaver, wyrm, quiet. */
export function layerLines(tables, layer, place = {}, sense, ctx) {
  const L = tables?.otherworlds?.[layer];
  if ( !L ) return [];
  const pick = node => (node?.[sense] ?? []).filter(l => fits(l, ctx));
  return [...pick(L.kinds?.[place.kind]), ...pick(place.resonance ? L.resonance?.[place.resonance] : null), ...pick(L.any)];
}

/**
 * Reach of one source for one sense. s: {walls (sound walls between), yards, sightBlocked, loud: quiet|normal|loud}.
 * Returns the extra need (0 clear, 1 muffled) or null when it can't be perceived from here.
 */
export function reachOf(sense, s = {}, {light = "bright", darkSight = false, extra = {sound: 0, smell: 0}} = {}) {
  const walls = Number(s.walls) || 0, yards = Number(s.yards) || 0;
  if ( sense === "sight" ) {
    if ( s.sightBlocked ) return null;
    if ( light === "pitch" && !darkSight && !s.glows ) return null;
    const far = light === "bright" || s.glows ? 60 : light === "dim" ? 20 : 8;
    return yards <= far ? 0 : null;
  }
  if ( sense === "sound" ) {
    const far = (s.loud === "loud" ? 100 : s.loud === "quiet" ? 8 : 30) * (1 + (extra.sound || 0));
    if ( yards > far ) return null;
    const allowed = 1 + (extra.sound || 0);
    return walls === 0 ? 0 : walls <= allowed ? walls : null;
  }
  if ( sense === "smell" ) {
    const far = (s.strong ? 20 : 8) * (1 + (extra.smell || 0));
    if ( yards > far || walls > (extra.smell || 0) ) return null;
    return walls;
  }
  if ( sense === "touch" ) return (walls === 0 && yards <= (s.strong ? 12 : 4)) ? 0 : null;
  return null;
}

/**
 * Put an answer together. All lines carry {t, n}; sources also {id, held?, from}.
 *   place, cond: lines of those layers that fit; sources: [{lines: [line], need, extra}] already reached
 *   successes: 0 for a free look; botch: true gives only the free lines
 * Free look: one place line and one hour or sky line, and any source anyone would notice (up to two).
 * Each success adds a line, sources first (the rarest first), then the place's finer lines. Capped at 4 + successes, 6 at most.
 */
export function compose({place = [], cond = [], sources = [], channel = [], successes = 0, botch = false, rand = Math.random} = {}) {
  const s = botch ? 0 : Math.max(0, Number(successes) || 0);
  const cap = Math.min(6, 4 + s);
  const sh = list => shuffled(rand, list);
  const free = l => (Number(l.n) || 0) === 0;
  const earned = l => (Number(l.n) || 0) <= s;
  const out = [], held = [];
  const take = l => { if ( out.length < cap && !out.includes(l) ) out.push(l); };
  // the Storyteller's own lines with no need always lead
  place.filter(l => l.own && free(l)).slice(0, 2).forEach(take);
  const basePlace = sh(place.filter(l => !l.own));
  if ( !out.length ) { const f = basePlace.find(free); if ( f ) take(f); }
  sh(sources.filter(free)).slice(0, 2).forEach(take);
  sh(channel.filter(free)).slice(0, 1).forEach(take);
  const c = sh(cond).find(free);
  if ( c ) take(c);
  if ( s > 0 ) {
    const rest = [...sources, ...channel].filter(l => !free(l) && earned(l)).sort((a, b) => (Number(b.n) || 0) - (Number(a.n) || 0));
    rest.forEach(take);
    sh(channel.filter(free)).forEach(take);
    place.filter(l => l.own && !free(l) && earned(l)).forEach(take);
    basePlace.filter(l => earned(l)).forEach(take);
    sh(cond).filter(earned).forEach(take);
  }
  for ( const l of [...sources, ...channel] ) if ( !out.includes(l) && !earned(l) ) held.push(l);
  return {lines: out, held};
}

/** Expand {a|b} and {{name}} in each chosen line. */
export function render(lines, rand, vars = {}) {
  return lines.map(l => expand(l.t, {rand, vars: {...vars, ...(l.vars ?? {})}}).replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** The seeded stream for one answer. */
export function seedFor(seed, {scene = "", place = "", hour = 0, sense = "", actor = ""} = {}) {
  return stream(seed || "wodx", `senses:${scene}:${place}:${hour}:${sense}:${actor}`);
}

/** The key an answer is remembered under, and a fingerprint of what was there. */
export function memoryKey({scene = "", place = "", hour = 0, sense = ""} = {}) {
  // No dots: Foundry reads a dot in a flag key as a path and would split the entry apart
  return [scene, place, hour, sense].map(x => String(x).replace(/\./g, "_")).join("|");
}
export function fingerprint(sourceIds = []) {
  return [...new Set(sourceIds.map(String))].sort().join(",");
}
/**
 * May this character roll again? memo: the remembered entry {fp, best, closer} or undefined.
 * A new roll is allowed when nothing was remembered, the place changed (another fingerprint), or only a free look was had.
 */
export function canRoll(memo, fp) {
  return !memo || memo.fp !== fp || !memo.closer;
}
/** Keep the newest few remembered answers. */
export function trimMemory(mem = {}, keep = 24) {
  const entries = Object.entries(mem).sort((a, b) => (b[1]?.at ?? 0) - (a[1]?.at ?? 0)).slice(0, keep);
  return Object.fromEntries(entries);
}

/* ---------------- asking ---------------- */

const CMD = {look: "sight", see: "sight", listen: "sound", hear: "sound", smell: "smell", sniff: "smell", touch: "touch", feel: "touch", sense: "all", senses: "all"};
/** "/look door" -> {sense: "sight", focus: "door"}; "/sense" -> {sense: "all"}. null if not a senses command. */
export function parseCommand(text) {
  const m = String(text ?? "").trim().match(/^\/(look|see|listen|hear|smell|sniff|touch|feel|senses?)\b\s*(.*)$/i);
  if ( !m ) return null;
  return {sense: CMD[m[1].toLowerCase()], focus: m[2].trim().slice(0, 60)};
}

/** A question in plain chat that asks what the character senses. Returns the sense, "all", or null. */
export function questionSense(text) {
  const s = String(text ?? "").toLowerCase();
  if ( s.length > 160 ) return null;
  if ( !/\b(what|can|could|do|does|is there|anything)\b/.test(s) || !/\?\s*$|\banything\b/.test(s) ) return null;
  if ( /\b(i|we|my character)\b[^?]*\b(see|spot|notice)\b|\bwhat does it look like\b/.test(s) ) return "sight";
  if ( /\b(i|we)\b[^?]*\b(hear|listen)\b/.test(s) ) return "sound";
  if ( /\b(i|we)\b[^?]*\b(smell|sniff|scent)\b|\bwhat does it smell\b/.test(s) ) return "smell";
  if ( /\b(i|we)\b[^?]*\b(feel|touch)\b/.test(s) ) return "touch";
  if ( /\b(i|we)\b[^?]*\b(sense|perceive|notice)\b/.test(s) ) return "all";
  return null;
}

/** Lines whose text names the focus word come first; the rest keep their order. */
export function byFocus(lines, focus) {
  const f = String(focus ?? "").trim().toLowerCase();
  if ( !f ) return lines;
  const hit = l => String(l.t ?? "").toLowerCase().includes(f) || String(l.name ?? "").toLowerCase().includes(f);
  return [...lines.filter(hit), ...lines.filter(l => !hit(l))];
}

/** How many people, as a line's {{people}} says it. */
export function peopleWord(n) {
  n = Number(n) || 0;
  return n <= 0 ? "nobody" : n === 1 ? "one person" : n === 2 ? "two people" : n <= 4 ? "a few people" : n <= 9 ? "several people" : "a crowd";
}

/** Direction from a to b in words: north, south-east... (canvas y grows downward). */
export function directionWord(a, b) {
  const dx = (b?.x ?? 0) - (a?.x ?? 0), dy = (b?.y ?? 0) - (a?.y ?? 0);
  if ( Math.hypot(dx, dy) < 1 ) return "right here";
  const ang = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  return ["to the north", "to the north-east", "to the east", "to the south-east", "to the south", "to the south-west", "to the west", "to the north-west"][Math.round(ang / 45) % 8];
}

/**
 * Seeing through Obfuscate (V20 Dark Ages pp. 195, 224-226, as WoDX NPC reads it): only Auspex at least equal to the
 * Obfuscate can try, with Perception + Awareness at 8, less 1 for each Auspex dot above. Hunter second sight sees
 * them as inhuman without a roll.
 */
export function obfuscateCheck(auspex, obfuscate, {secondSight = false} = {}) {
  if ( secondSight ) return {canTry: true, auto: true, diff: null};
  const a = Number(auspex) || 0, o = Math.max(1, Number(obfuscate) || 1);
  if ( a < o ) return {canTry: false, auto: false, diff: null};
  return {canTry: true, auto: false, diff: Math.max(FLOOR, 8 - (a - o))};
}
