/**
 * WoDX NPC 0.53.0 (B2700 to B2703): NPCs who talk to each other where a character can overhear. The pure part: no
 * Foundry here, so the harness can test it. scripts/overheard.mjs runs it on the active Storyteller's client.
 *
 * Two NPCs standing together on a scene make a short exchange: one opens on a topic, the other answers. The words come
 * from the talk generator (talk-grammar.mjs) with the grammar in data/grammar/overheard.mjs; what they talk about comes
 * from the scene: a rumour one of them has heard, the talk of the times in that place and year
 * (data/grammar/overheard-times.mjs), a price at the market, who keeps order, a faction, a feast, the weather, work.
 * Every topic reads the region the scene stands in and its way of life that year, so the same pair of townsfolk talk of
 * the Hussites in Brno in 1420, of the French in Cairo in 1798 and of the arcologies in the World of Future Darkness.
 *
 * A character within earshot of either speaker hears it as a whisper; the Storyteller sees everything that was heard.
 * Passers-by keep to the generic topics (no rumours from the network, no factions: B975). A secret faction (Kindred,
 * Garou, a Tradition and their like) comes up only between two of its own members, voices lowered (B2702).
 */
import {squaresBetween} from "./talk-rules.mjs";
import {generate, mix, bandOf} from "./talk-grammar.mjs";
import {sphereFor, regionOf, DEFAULT_REGION} from "../../wodx-chronicle/scripts/world-rules.mjs";
import {mediaFor} from "../../wodx-chronicle/scripts/media-rules.mjs";
import {TIMES} from "../data/grammar/overheard-times.mjs";
import {TOPICS} from "../data/grammar/overheard.mjs";

export {TOPICS};
/** Defaults the world settings start from: squares between the two speakers, squares a listener may stand off. */
export const DEFAULTS = {reach: 2, earshot: 4, pairGap: 5 * 60 * 1000, sceneGap: 45 * 1000, chance: 0.35, logMax: 30};
/** Topics a passer-by may talk about: generic street talk only (NPC 0.27.0, B975). */
export const PASSERBY_TOPICS = ["times", "price", "watch", "feast", "weather", "work"];
/** How often each topic comes up when its subject is there to talk about. */
export const WEIGHTS = {secret: 5, rumour: 4, times: 3, price: 2, faction: 2, feast: 2, weather: 1, watch: 1, work: 1};

const lc = v => String(v ?? "").trim().toLowerCase();

/* ------------------------------------------------------------------ */
/*  Who stands together, and who hears them                            */
/* ------------------------------------------------------------------ */

const boxOf = (t, grid) => ({x: Number(t.x) || 0, y: Number(t.y) || 0, w: (Number(t.w) || 1) * grid, h: (Number(t.h) || 1) * grid});

/**
 * Pairs of NPCs close enough to talk, nearest first; each NPC is in one pair at most.
 * npcs: [{id, x, y, w, h}] (x, y in pixels; w, h in squares). Returns [[a, b, squares]].
 */
export function pairsOf(npcs = [], {reach = DEFAULTS.reach, grid = 100} = {}) {
  const all = [];
  for ( let i = 0; i < npcs.length; i++ ) for ( let j = i + 1; j < npcs.length; j++ ) {
    const d = squaresBetween(boxOf(npcs[i], grid), boxOf(npcs[j], grid), grid);
    if ( d <= reach ) all.push([npcs[i], npcs[j], d]);
  }
  all.sort((p, q) => p[2] - q[2] || String(p[0].id).localeCompare(String(q[0].id)));
  const used = new Set(), out = [];
  for ( const p of all ) {
    if ( used.has(p[0].id) || used.has(p[1].id) ) continue;
    used.add(p[0].id); used.add(p[1].id); out.push(p);
  }
  return out;
}

/** The characters within earshot of either speaker: pcs [{id, x, y, w, h}]. */
export function earshotOf(pair, pcs = [], {earshot = DEFAULTS.earshot, grid = 100} = {}) {
  const [a, b] = pair ?? [];
  if ( !a || !b ) return [];
  return pcs.filter(p => Math.min(squaresBetween(boxOf(p, grid), boxOf(a, grid), grid), squaresBetween(boxOf(p, grid), boxOf(b, grid), grid)) <= earshot);
}

/** Whether a pair talks now: not too soon after their last exchange, nor after the scene's last one, and the dice. */
export function mayChat({now = 0, lastPair = null, lastScene = null, pairGap = DEFAULTS.pairGap, sceneGap = DEFAULTS.sceneGap, chance = DEFAULTS.chance, roll = 0, force = false} = {}) {
  if ( force ) return true;
  if ( lastPair !== null && now - lastPair < pairGap ) return false;
  if ( lastScene !== null && now - lastScene < sceneGap ) return false;
  return roll < chance;
}

/* ------------------------------------------------------------------ */
/*  What there is to talk about                                        */
/* ------------------------------------------------------------------ */

/**
 * Talk of the times for a place and year: the most specific entries that fit (the region named outright, then its way
 * of life, then everywhere), one phrase picked by the seed. Returns the phrase or null.
 */
export function timesFor({region = DEFAULT_REGION, sphere = null, year = null, seed = 0} = {}) {
  const y = Number(year);
  if ( !Number.isFinite(y) ) return null;
  const sp = sphere ?? sphereFor(region, y);
  let best = 0, pool = [];
  for ( const t of TIMES ) {
    if ( y < t.from || y > t.to ) continue;
    const s = t.where === "*" ? 1 : t.where.includes(region) ? 3 : t.where.includes(sp) ? 2 : 0;
    if ( !s ) continue;
    if ( s > best ) { best = s; pool = [...t.phrases]; }
    else if ( s === best ) pool.push(...t.phrases);
  }
  return pool.length ? pool[mix(seed, `times|${region}|${y}`) % pool.length] : null;
}

/** The everyday word for a kind of goods at the market (WoDX Library goods kinds), by way of life and era. */
const STAPLE = {latin: "bread", orthodox: "bread", islamic: "bread", sahel: "millet", swahili: "rice", bantu: "maize", indic: "rice", sinic: "rice",
  japanese: "rice", theravada: "rice", tibetan: "barley", malay: "rice", mesoamerican: "maize", andean: "potatoes", polynesian: "taro", northern: "meat"};
export function goodWord(kind, {sphere = "latin", year = 2000} = {}) {
  const band = bandOf(year), old = band === "medieval" || band === "earlymodern";
  switch ( kind ) {
    case "food": return STAPLE[sphere] ?? "bread";
    case "drink":
      if ( ["islamic", "sahel", "swahili"].includes(sphere) ) return Number(year) >= 1550 ? "coffee" : "sherbet";
      if ( ["sinic", "japanese", "tibetan"].includes(sphere) ) return "tea";
      if ( sphere === "indic" ) return Number(year) >= 1850 ? "tea" : "toddy";
      if ( ["theravada", "malay", "polynesian", "bantu"].includes(sphere) ) return old ? "palm wine" : "beer";
      return old && ["latin", "orthodox"].includes(sphere) ? "ale" : "beer";
    case "fuel": return old ? "firewood" : band === "nineteenth" ? "coal" : band === "future" ? "fuel cells" : "petrol";
    case "light": return old ? "candles" : band === "nineteenth" ? "lamp oil" : band === "future" ? "power" : "batteries";
    case "cloth": return "cloth";
    case "medicine": return "medicine";
    case "tools": return "tools";
    case "papers": return old ? "paper" : "newspapers";
    case "power": return band === "future" ? "power cells" : "batteries";
    case "drugs": return band === "future" ? "street chems" : band === "modern" ? "pills" : old ? "poppy juice" : "laudanum";
    default: return null;
  }
}

/** A market's goods kind out of the ordinary (short, none or plenty), picked by the seed: {kind, supply} or null. */
export function oddSupply(market, seed = 0) {
  const s = Object.entries(market?.supply ?? {}).filter(([, v]) => ["short", "none", "plenty"].includes(v));
  if ( !s.length ) return null;
  const [kind, supply] = s[mix(seed, "supply") % s.length];
  return {kind, supply};
}

/** A faction's name as it reads in the middle of a line ("The Weavers' Guild" becomes "the Weavers' Guild"). */
export const midName = name => String(name ?? "").trim().replace(/^The\s/, "the ");

/**
 * The faction the two would talk about. factions: [{id, name, secret, members, leader, places}]. A public faction
 * holding this scene comes first, then any public one; a secret faction only when both speakers belong to it.
 * Returns {name, secret} or null.
 */
export function factionTopic(factions = [], {sceneId = null, a = null, b = null, seed = 0} = {}) {
  const inIt = (f, id) => !!id && ((f.members ?? []).includes(id) || f.leader === id);
  const named = (factions ?? []).filter(f => String(f?.name ?? "").trim() && !f.dormant);
  const shared = named.filter(f => f.secret && inIt(f, a) && inIt(f, b));
  if ( shared.length ) return {name: midName(shared[mix(seed, "secret") % shared.length].name), secret: true};
  const open = named.filter(f => !f.secret);
  const here = open.filter(f => sceneId && (f.places ?? []).includes(sceneId));
  const pool = here.length ? here : open;
  return pool.length ? {name: midName(pool[mix(seed, "faction") % pool.length].name), secret: false} : null;
}

/**
 * Small change as people say it: units are WoDX Storyteller's money units for the place and year ([name, plural,
 * worth], largest first). Before 1900 the small coin; after it the main one.
 */
export function moneyWord(units = [], year = 2000) {
  const u = (units ?? []).filter(x => Array.isArray(x) && x[1]);
  if ( !u.length ) return null;
  if ( u.length === 1 ) return u[0][1];
  const old = Number(year) < 1900;
  return old ? u[u.length === 2 ? 1 : u.length - 2][1] : u[0][1];
}

/**
 * The facts both speakers share: where and when, and what there is to talk about.
 *   {year, region, future, rumour, market, factions, sceneId, a, b, feast, weather, units, seed}
 * Returns {year, era, region, sphere, media, times, good, supply, faction, secret, feast, weather, money, rumour}.
 */
export function sharedFacts({year = null, region = DEFAULT_REGION, future = false, rumour = null, market = null, factions = [], sceneId = null, a = null, b = null,
  feast = "", weather = null, units = null, seed = 0} = {}) {
  const y = Number.isFinite(Number(year)) && year !== null ? Number(year) : 2000;
  const reg = regionOf(region) ? region : DEFAULT_REGION;
  const sphere = sphereFor(reg, y);
  const out = {year: y, era: bandOf(y), region: reg, sphere, media: mediaFor(y, {future: future || y >= 2026, region: reg}).id};
  const times = timesFor({region: reg, sphere, year: y, seed});
  if ( times ) out.times = times;
  const odd = oddSupply(market, seed);
  const good = odd ? goodWord(odd.kind, {sphere, year: y}) : null;
  if ( good ) { out.good = good; out.supply = odd.supply; }
  const f = factionTopic(factions, {sceneId, a, b, seed});
  if ( f ) { out.faction = f.name; if ( f.secret ) out.secret = true; }
  if ( String(feast ?? "").trim() ) out.feast = String(feast).trim();
  if ( weather ) out.weather = weather;
  const money = moneyWord(units, y);
  if ( money ) out.money = money;
  if ( String(rumour ?? "").trim() ) out.rumour = String(rumour).trim();
  return out;
}

/** The topics there is something to say about, by weight. passerby: either speaker is a passer-by. */
export function topicsFor(shared = {}, {passerby = false} = {}) {
  const has = {secret: !!shared.secret && !!shared.faction, rumour: !!shared.rumour, times: !!shared.times, price: !!shared.good, faction: !!shared.faction && !shared.secret,
    feast: !!shared.feast, weather: !!shared.weather, watch: true, work: true};
  return TOPICS.filter(t => has[t] && (!passerby || PASSERBY_TOPICS.includes(t))).map(t => [t, WEIGHTS[t] ?? 1]);
}

/** Topics in the order to try them: a weighted draw by the seed, then the rest by weight. */
export function topicOrder(weighted = [], seed = 0) {
  const total = weighted.reduce((n, [, w]) => n + w, 0);
  if ( !total ) return [];
  let r = mix(seed, "topic") % total, first = weighted[0][0];
  for ( const [t, w] of weighted ) { if ( r < w ) { first = t; break; } r -= w; }
  return [first, ...weighted.filter(([t]) => t !== first).sort((p, q) => q[1] - p[1]).map(([t]) => t)];
}

/**
 * Make the exchange. a, b: {id, facts} (each speaker's own talk facts: mood, clan, voice and the like). shared: from
 * sharedFacts. topic: one to force, else drawn. recent: lines said lately on the scene, avoided when others fit.
 * Returns {topic, lines: [{who: "a"|"b", say, rule}, ...]} or null when nothing fits.
 */
export function exchange({a, b, shared = {}, grammar, seed = 0, recent = [], topic = null, passerby = false} = {}) {
  if ( !grammar?.rules ) return null;
  const order = topic ? [topic] : topicOrder(topicsFor(shared, {passerby}), seed);
  for ( const t of order ) {
    const fa = {...(a?.facts ?? {}), ...shared}, fb = {...(b?.facts ?? {}), ...shared};
    const open = generate(`overheard:${t}`, fa, {grammar, seed: mix(seed, `a|${t}`), recent});
    if ( !open?.say ) continue;
    const reply = generate(`overheard:reply:${t}`, fb, {grammar, seed: mix(seed, `b|${t}`), recent})
      ?? generate("overheard:reply", fb, {grammar, seed: mix(seed, "b"), recent});
    const lines = [{who: "a", say: open.say, rule: open.rule}];
    if ( reply?.say ) lines.push({who: "b", say: reply.say, rule: reply.rule});
    return {topic: t, lines};
  }
  return null;
}

/** Keep the scene's record of what was heard short: the newest last. */
export function addToLog(log = [], entry, max = DEFAULTS.logMax) {
  return [...(Array.isArray(log) ? log : []), entry].slice(-Math.max(1, Number(max) || DEFAULTS.logMax));
}

/** Is a word still a symbol the grammar could not fill (for the tests and the lint)? */
export const unfilled = text => /#[a-zA-Z]\w*(?:\.\w+)*#|\{\w+\}/.test(String(text ?? ""));
export const cleanTopic = t => (TOPICS.includes(lc(t)) ? lc(t) : null);
