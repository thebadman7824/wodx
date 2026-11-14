/**
 * WoDX Senses (B3540-B3547): the sights that open another world on the player's own map, the pure part. No Foundry.
 *
 *   penumbra       A werewolf (or anyone) who peeks across the Gauntlet sees the Penumbra laid over the scene: the
 *                  Weaver's webs on banks, offices and mills, Banes where the Wyrm's taint lies, Wyld growth, and the
 *                  spirits there, marked by how they stand toward the peeker (W20 pdf 313 / p. 311 for peeking;
 *                  W20 pdf 314-317 for what the Penumbra holds). Webs thicken with the era (Otherworlds' webbing chart).
 *   prime, time,   A mage's sensing Effects at the first rank of a Sphere (M20 pdf 514 Correspondence, pdf 516 Entropy,
 *   entropy,       pdf 521 Prime, pdf 523 Time). Each costs the casting roll: Arete against the highest Sphere + 3,
 *   correspondence coincidental (M20 pdf 502). Successes buy the duration (M20 pdf 504). A Dark Ages mage casts through
 *                  the Pillar that fits (Dark Ages: Mage, castPlan in WoDX Actions).
 *   chimerical     A changeling, or a mortal the fae have enchanted, sees the fae mien of other changelings and the
 *                  dressing of freeholds and the Dreaming; Banality greys a dull place and a dull person
 *                  (C20 pdf 46-47 the Mists and enchantment; pdf 33 chimerical qualities).
 *   shroud         A wraith sees the living scene from the Shadowlands: worn and greyed, Fetters lit, other wraiths
 *                  plain to see (Wraith 20th pdf 84-85). In 1914 to 1918 the Great War's dead see it heavier.
 */

/** The sights this file adds, in the order the sight button steps through them. */
export const OTHER = {
  penumbra: {label: "The Penumbra (peeking)", auto: true},
  prime: {label: "Prime sight", sphere: "prime", ref: "M20 pdf 521 (Etheric Senses)", roll: true},
  time: {label: "Time sight", sphere: "time", ref: "M20 pdf 523 (Time Sense; Postcognition at Time 2)", roll: true},
  entropy: {label: "Entropy sight", sphere: "entropy", ref: "M20 pdf 516 (Sense Fate and Fortune)", roll: true},
  correspondence: {label: "Correspondence sight", sphere: "correspondence", ref: "M20 pdf 514 (Immediate Spatial Perceptions)", roll: true},
  chimerical: {label: "Chimerical sight", auto: true},
  shroud: {label: "The view from the Shadowlands", auto: true}
};
export const OTHER_ORDER = ["penumbra", "prime", "time", "entropy", "correspondence", "chimerical", "shroud"];
export const MAGE_SIGHTS = ["prime", "time", "entropy", "correspondence"];

/** How long a peek holds when nobody turns it off: one scene, read as ten minutes of game time (house rule). */
export const PEEK_SECONDS = 600;

/**
 * Dark Ages mages see through the Pillar whose domain fits (house reading of the Pillar domains in Dark Ages: Mage
 * pp. 105-130). key: Pillar key in WoDX Actions' FELLOWSHIPS.
 */
export const DA_PILLARS = {
  prime: ["primus", "galdrar", "wiseone"],
  time: ["anbiya", "autumn"],
  entropy: ["forlog", "uriel", "winter", "anbiya"],
  correspondence: ["hajj", "fara"]
};

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * The other-world sights a character has. t: {profile, spheres {prime, time, entropy, correspondence}, da {fellowship,
 * foundation, pillars {key: dots}}, peeking (bool), enchanted (bool)}.
 */
export function otherSightsFor(t = {}) {
  const out = [];
  if ( t.peeking ) out.push("penumbra");
  for ( const s of MAGE_SIGHTS ) if ( num(t.spheres?.[s]) >= 1 || daPillarFor(t.da, s) ) out.push(s);
  if ( t.profile === "fae" || t.enchanted ) out.push("chimerical");
  if ( t.profile === "wraith" ) out.push("shroud");
  return out;
}

/** The sight a character sees by without choosing one: a peek first, then a wraith's or a changeling's own eyes. */
export function autoSight(t = {}) {
  if ( t.peeking ) return "penumbra";
  if ( t.profile === "wraith" ) return "shroud";
  if ( t.profile === "fae" || t.enchanted ) return "chimerical";
  return null;
}

/** A Dark Ages mage's best Pillar for a sight: {key, rating} or null. */
export function daPillarFor(da, sight) {
  if ( !da?.fellowship ) return null;
  let best = null;
  for ( const k of DA_PILLARS[sight] ?? [] ) {
    const r = num(da.pillars?.[k]);
    if ( r >= 1 && (!best || r > best.rating) ) best = {key: k, rating: r};
  }
  return best;
}

/**
 * The casting roll for a mage's sight. t as above plus arete. castPlan: WoDX Actions' Dark Ages castPlan, passed in.
 * M20 wins when the sheet has the Sphere; a Dark Ages mage rolls Foundation + Pillar at 4 + 1.
 */
export function mageRoll(t = {}, sight, {castPlan = null} = {}) {
  const S = OTHER[sight];
  if ( !S?.sphere ) return null;
  if ( num(t.spheres?.[S.sphere]) >= 1 ) {
    return {system: "m20", dice: Math.max(0, num(t.arete)), difficulty: Math.max(3, 1 + 3), ref: `${S.ref}; difficulty M20 pdf 502`, label: `Arete ${num(t.arete)}, difficulty 4 (coincidental, ${S.sphere} 1 + 3)`};
  }
  const p = daPillarFor(t.da, sight);
  if ( !p ) return null;
  const plan = castPlan ? castPlan({levels: {[p.key]: 1}, ratings: t.da.pillars ?? {}, foundation: num(t.da.foundation) || 1, fellowship: t.da.fellowship}) : null;
  const dice = plan?.ok ? plan.dice : (num(t.da.foundation) || 1) + p.rating;
  const difficulty = plan?.ok ? plan.difficulty : 5;
  return {system: "da", pillar: p.key, dice, difficulty, ref: "Dark Ages: Mage p. 99-103", label: `Foundation + Pillar, ${dice} dice at difficulty ${difficulty} (a simple spell at the first level)`};
}

/**
 * How long the sight holds for so many successes, in seconds of game time. M20 pdf 504: a turn, a scene, a day, a
 * story, six months. Dark Ages: Mage p. 103: a turn, a scene, a day, a month, six months. House readings: a turn holds
 * for one game minute so the player can take one look; a scene is an hour; a story is a week.
 */
export const HOLD = {
  m20: [0, 60, 3600, 86400, 7 * 86400, 182 * 86400],
  da: [0, 60, 3600, 86400, 30 * 86400, 182 * 86400]
};
export const HOLD_WORDS = {m20: ["none", "one turn", "one scene", "one day", "one story", "six months"], da: ["none", "one turn", "a scene", "a day", "a month", "six months"]};
export function holdFor(successes, system = "m20") {
  const n = clamp(Math.round(num(successes)), 0, 5), T = HOLD[system] ?? HOLD.m20;
  return {seconds: T[n], words: (HOLD_WORDS[system] ?? HOLD_WORDS.m20)[n]};
}
/** Is a held sight still up? hold {sight, until} at game time now. */
export const holding = (hold, sight, now) => !!hold && hold.sight === sight && num(hold.until) >= num(now);

/* ---------------- the Penumbra ---------------- */

/** Which spirit court a spirit actor belongs to: its own flag, else a guess from its name. */
export function courtOf(name = "", flag = null) {
  if ( flag ) return String(flag);
  const n = String(name).toLowerCase();
  if ( /\b(bane|wyrm|scrag|psychomachiae|kalus|blight)/.test(n) ) return "wyrm";
  if ( /\b(weaver|pattern|net-spider|glass|gear|data|wire)/.test(n) ) return "weaver";
  if ( /\b(wyld|glade|lune|wyldling|dream)/.test(n) ) return "wyld";
  if ( /\b(raven|crow|owl|hawk|eagle|bird|falcon|sparrow)/.test(n) ) return "bird";
  if ( /\b(wolf|bear|stag|boar|fox|rat|cat|serpent|snake|beast)/.test(n) ) return "beast";
  if ( /\b(fire|water|stone|earth|wind|air|storm|river|elemental|lightning)/.test(n) ) return "elemental";
  return null;
}
/** How spirits there stand toward the peeker, from WoDX Otherworlds' standing effect {diff, refuses}. */
export function spiritWord(effect = {}) {
  if ( effect.refuses ) return "hostile";
  const d = num(effect.diff);
  return d < 0 ? "friendly" : d > 0 ? "wary" : "watching";
}
export const SPIRIT_COLOUR = {friendly: 0x8fe3b0, watching: 0xcfe3ff, wary: 0xffd27a, hostile: 0xff6a5a};

/**
 * Marks the Penumbra adds beyond the map's own reflection. place: WoDX Otherworlds' corruption record for the scene
 * {level 0-10, banes}; gauntlet: the rating at the viewer; web: the era's webbing 0-1; hasMap: whether the map's own
 * reflection marks are drawn. Returns {veil (0-1 haze over all), webVeil (0-1, only when there is no map file),
 * banes: n, taint (0-1), lines: [text]}.
 */
export function penumbraLayer({place = null, gauntlet = null, web = 0.2, hasMap = false} = {}) {
  const level = clamp(num(place?.level), 0, 10), banes = clamp(Math.round(num(place?.banes)), 0, 30);
  const taint = level / 10;
  const g = gauntlet === null || gauntlet === undefined ? 6 : clamp(num(gauntlet), 1, 10);
  const lines = [];
  if ( !hasMap ) lines.push(web >= 0.7 ? "Weaver webbing lies thick over everything built." : web >= 0.4 ? "Weaver webbing runs along the walls and streets." : "Thin strands of webbing cling to the worked stone.");
  if ( banes ) lines.push(`${banes === 1 ? "A Bane lurks" : `${banes} Banes lurk`} where the Wyrm's taint gathers.`);
  else if ( taint >= 0.3 ) lines.push("The place is soured; something Wyrm-bound has been here.");
  if ( g <= 3 ) lines.push("The Gauntlet is thin: the spirit world is bright and close.");
  if ( g >= 8 ) lines.push("The Gauntlet is thick: the Penumbra is dim and hard to hold in view.");
  return {veil: clamp(0.15 + (10 - g) * 0.03, 0.15, 0.45), webVeil: hasMap ? 0 : clamp(web, 0, 1), banes, taint, lines};
}
/** While peeking the viewer cannot perceive their own side (W20 pdf 313): the physical map is dimmed and tinted. */
export const PEEK_FILTER = "grayscale(0.55) brightness(0.62) contrast(1.15) hue-rotate(185deg) saturate(0.7)";

/* ---------------- a mage's sights ---------------- */

/** How long vulgar magick strains a place (house rule): 30 days, 60 when witnessed, a botch doubles it. */
export function strainDays(kind, botch = false) {
  const d = kind === "witnessed" ? 60 : kind === "vulgar" ? 30 : 0;
  return botch ? d * 2 : d;
}
/** Add a strain mark. list [{x, y, at, until, by, kind, highest}]; keeps the newest 40 that still hold. */
export function addStrain(list = [], m = {}, now = 0) {
  const days = strainDays(m.kind, m.botch);
  if ( !days ) return pruneStrain(list, now);
  const mark = {x: Math.round(num(m.x)), y: Math.round(num(m.y)), at: num(m.at ?? now), until: num(m.at ?? now) + days * 86400, by: String(m.by ?? "").slice(0, 80), kind: m.kind, highest: clamp(Math.round(num(m.highest)), 1, 5)};
  return pruneStrain([...list, mark], now);
}
export const pruneStrain = (list = [], now = 0) => (Array.isArray(list) ? list : []).filter(m => num(m?.until) >= num(now)).slice(-40);
/** How strong a strain mark looks now, 0-1: fresh and high-ranked marks show most. */
export function strainStrength(m, now) {
  const span = Math.max(1, num(m.until) - num(m.at)), left = clamp((num(m.until) - num(now)) / span, 0, 1);
  return clamp(left * (0.4 + 0.12 * num(m.highest)), 0, 1);
}

/** What Prime shows of a place of power (WoDX Storyteller's register entry, normalised). */
export function primeWords(p = {}) {
  if ( p.kind === "node" ) return `Node ${p.rating}${p.resonance ? `, resonant with ${p.resonance}` : ""}; ${num(p.store?.quint)} Quintessence pooled and ${num(p.store?.tass)} Tass${p.tassForm ? ` (${p.tassForm})` : ""}`;
  if ( p.kind === "chantry" ) return "The wards and workings of a chantry hum in the walls";
  if ( p.kind === "caern" ) return `A caern, level ${num(p.level) || num(p.rating) || 1}: the land's power wells up here`;
  if ( p.kind === "freehold" ) return p.destroyed ? "A freehold's hearth, cold now" : "A freehold's balefire: Glamour, not Quintessence, but it shines";
  return "Quintessence gathers here";
}

/** Echoes of what happened at a place. list [{x, y, at, text, kind}]; keeps the newest 80. */
export function addEcho(list = [], e = {}) {
  if ( !e?.text ) return Array.isArray(list) ? list.slice(-80) : [];
  const echo = {x: Math.round(num(e.x)), y: Math.round(num(e.y)), at: num(e.at), text: String(e.text).slice(0, 160), kind: String(e.kind ?? "event").slice(0, 30)};
  return [...(Array.isArray(list) ? list : []), echo].slice(-80);
}
/** How long ago, in words. */
export function ago(seconds) {
  const s = Math.max(0, num(seconds));
  if ( s < 120 ) return "moments ago";
  if ( s < 7200 ) return `${Math.round(s / 60)} minutes ago`;
  if ( s < 172800 ) return `${Math.round(s / 3600)} hours ago`;
  if ( s < 60 * 86400 ) return `${Math.round(s / 86400)} days ago`;
  if ( s < 730 * 86400 ) return `${Math.round(s / (30 * 86400))} months ago`;
  return `${Math.round(s / (365 * 86400))} years ago`;
}
/**
 * The echoes Time shows. Time 1 senses the place's recent flow, read as the last day (house reading of Time Sense);
 * Time 2 or more looks back over all that is logged (Postcognition, M20 pdf 523-524). A Dark Ages mage sees as Time 1.
 */
export function echoesSeen(list = [], now = 0, timeDots = 1) {
  const reach = num(timeDots) >= 2 ? Infinity : 86400;
  return (Array.isArray(list) ? list : []).filter(e => num(now) - num(e.at) <= reach && num(e.at) <= num(now)).sort((a, b) => num(b.at) - num(a.at));
}
/** A map event (WoDX Interactables' wodxMapEvent) as an echo, or null for the ones too small to leave one. */
export function echoOfMapEvent(ev = {}) {
  if ( !ev || ev.undone || !ev.scene ) return null;
  const who = ev.whoName ? String(ev.whoName) : "someone";
  const what = ev.objectName ? String(ev.objectName) : "something";
  const K = String(ev.kind ?? "");
  let text = null;
  if ( /break|smash|force|crash/.test(K) ) text = `${who} broke ${what}`;
  else if ( /fight|attack/.test(K) ) text = `A fight: ${who}`;
  else if ( /open|unlock/.test(K) && ev.noise === "loud" ) text = `${who} forced ${what}`;
  else if ( ev.supernatural ) text = `${who}: something uncanny (${K.replace(/[-_]/g, " ") || "a working"})`;
  else if ( ev.noise === "loud" ) text = `A loud noise: ${who} and ${what}`;
  if ( !text ) return null;
  return {x: ev.x, y: ev.y, at: ev.at, text, kind: K || "event"};
}

/** What Entropy shows of a creature by how much of its Health is gone (frac 0-1), or null for the hale. */
export function frailWord(frac) {
  const f = clamp(num(frac), 0, 1);
  if ( f >= 0.85 ) return {words: "near death", alpha: 0.9};
  if ( f >= 0.5 ) return {words: "badly hurt: it would not take much", alpha: 0.7};
  if ( f > 0 ) return {words: "a weakness here", alpha: 0.45};
  return null;
}
export const ENTROPY_COLOUR = 0xb48cff;

/** Correspondence: the ways out of a scene to other places. links [{x, y, to}] -> [{x, y, words}]. */
export function linkWords(links = []) {
  const seen = new Set();
  return (Array.isArray(links) ? links : []).filter(l => l && l.to && Number.isFinite(Number(l.x)) && Number.isFinite(Number(l.y)))
    .filter(l => { const k = `${Math.round(l.x / 50)}:${Math.round(l.y / 50)}:${l.to}`; if ( seen.has(k) ) return false; seen.add(k); return true; })
    .slice(0, 30).map(l => ({x: num(l.x), y: num(l.y), words: `bound to ${String(l.to).slice(0, 60)}`}));
}
export const CORR_COLOUR = 0x7fd8ff;

/* ---------------- chimerical sight ---------------- */

/**
 * Banality greys what the fae see. b: Banality 0-10 of the place or the person. A grey wash grows past 4 (house
 * reading of C20 pdf 46: Banality dulls the chimerical). Returns a CSS grayscale amount 0-0.85.
 */
export const banalityGrey = b => clamp((num(b) - 4) / 6, 0, 1) * 0.85;
/** A person dull enough that the fae see them grey (Banality 8 or more; house rule). */
export const dullPerson = b => num(b) >= 8;
/** The fae see a freehold or a Dreaming place dressed: a warm, bright, shifting look (house rule). */
export const CHIMERICAL_FILTER = "saturate(1.35) brightness(1.06) contrast(1.04)";
export function chimericalFilter({banality = 5, dressed = false} = {}) {
  const g = dressed ? 0 : banalityGrey(banality);
  return `${dressed ? CHIMERICAL_FILTER : "saturate(1.12)"}${g ? ` grayscale(${g.toFixed(2)})` : ""}`;
}
/** Enchantment lasts while the Glamour holds: one day for each point spent (C20 pdf 47; house reading of the duration). */
export const ENCHANT_DAY = 86400;
export const enchantUntil = (points, now) => num(now) + Math.max(1, Math.round(num(points))) * ENCHANT_DAY;
export const isEnchanted = (flag, now) => !!flag && (flag.kinain === true || num(flag.until) >= num(now));

/* ---------------- the view from the Shadowlands ---------------- */

/**
 * The decay a wraith sees over the living world (Wraith 20th pdf 85: the Shadowlands are the living world worn
 * down). shroud: the Shroud rating there (higher keeps the living world further off). During 1914-1918 the Great
 * War's dead see it heavier (house rule). off: the player's decay setting is off.
 */
export function shroudFilter({shroud = 7, year = 2000, off = false} = {}) {
  if ( off ) return "grayscale(0.5)";
  const s = clamp(num(shroud) || 7, 1, 10), war = num(year) >= 1914 && num(year) <= 1918 ? 0.12 : 0;
  const grey = clamp(0.55 + s * 0.03 + war, 0, 0.95), dark = clamp(0.92 - s * 0.02 - war / 2, 0.55, 1);
  return `grayscale(${grey.toFixed(2)}) sepia(${(0.25 + war).toFixed(2)}) contrast(1.12) brightness(${dark.toFixed(2)})`;
}
export const FETTER_COLOUR = 0x9ff5ff;
export const WRAITH_COLOUR = 0xc8d6e5;

/**
 * Which things on the map are a wraith's Fetters. fetters [{id, name, link}] (link: a document UUID the player or
 * Storyteller tied it to); things [{uuid, name}]. A tie wins; else a thing whose name is the Fetter's name, word for
 * word, with "my", "the", "a" left off.
 */
export function fetterMatches(fetters = [], things = []) {
  const clean = s => String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\b(my|the|a|an|her|his|their)\b/g, " ").replace(/\s+/g, " ").trim();
  const out = [];
  for ( const f of fetters ) {
    let hit = f.link ? things.find(t => t.uuid === f.link) : null;
    if ( !hit ) { const n = clean(f.name); if ( n.length >= 3 ) hit = things.find(t => clean(t.name) === n); }
    if ( hit ) out.push({fetter: f.id, name: f.name, uuid: hit.uuid});
  }
  return out;
}
