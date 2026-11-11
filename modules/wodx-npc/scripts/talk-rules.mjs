/**
 * WoDX NPC 0.10.0: the topic menu, the pure part. No Foundry here, so the harness can test it.
 *
 * A player walks up to someone the Storyteller plays and picks a topic from a list; the person answers with a line the
 * Storyteller wrote. WoDX writes none of the lines (standing rule 11): it only picks which one fits.
 *
 * The lines live on a talk sheet: the NPC's own (in the behaviour window), then shared sheets for the NPC's household,
 * each faction they belong to, the scene, and everyone. One line each:
 *
 *   [greet] Nods without looking up from the ledger.
 *   [none] Shrugs and goes back to work.
 *   [offer] the mill, the night porter
 *   [the abbot] kind kindred => Will not speak of the abbot to a Cainite.
 *   [the abbot] standing the abbey >= welcome => Says the abbot walks the cloister after Compline. | teach the cloister
 *   [work] year 1900-2025 => Mentions the night shift at the mill. | teach the mill; aloud
 *   Grumbles about the price of salt.
 *
 * In brackets: the topic, or greet (said when the window opens), none (said when nothing fits), offer (topics this
 * person brings up, listed even when the character has not heard of them). Before "=>": a WoDX Chronicle "Only when"
 * list about the character asking. After " | ": what follows, ";" between: teach <topic> (the character can now ask
 * anyone about it), codex <page> (an Encyclopaedia or journal page goes into the character's codex), aloud (said for
 * all to hear, not whispered), and any WoDX Chronicle "Then" outcome (tell, whisper, ledger, standing, ...).
 * A line with no brackets is the Storyteller's own note, as before, and is never shown to a player.
 */

/** Asked of anyone, always on the menu. */
export const LOCAL = {news: "News", rumours: "Rumours", work: "Work", directions: "Directions"};
const ALIAS = {rumors: "rumours", rumour: "rumours", rumor: "rumours", "the news": "news", direction: "directions", "the way": "directions"};
const SPECIAL = new Set(["greet", "none", "offer"]);

/** A topic as compared: lower case, single spaces, a few spellings joined. */
export function normTopic(t) {
  const s = String(t ?? "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60);
  return ALIAS[s] ?? s;
}

/** A topic as shown: the local four by their names, the rest as written. */
export const topicLabel = t => LOCAL[t] ?? (t ? t[0].toUpperCase() + t.slice(1) : "");

/** What follows a line: {teach: [], codex: [], aloud, run: "Then text for WoDX Chronicle"}. */
export function parseThen(text) {
  const out = {teach: [], codex: [], aloud: false, run: ""};
  const rest = [];
  for ( const raw of String(text ?? "").split(";") ) {
    const part = raw.trim();
    if ( !part ) continue;
    const m = /^(teach|codex)\s+(.+)$/i.exec(part);
    if ( m ) { const v = m[2].trim().slice(0, 100); if ( m[1].toLowerCase() === "teach" ) out.teach.push(normTopic(v)); else out.codex.push(v); continue; }
    if ( /^aloud$/i.test(part) ) { out.aloud = true; continue; }
    rest.push(part);
  }
  out.run = rest.join("\n");
  return out;
}

/** A talk sheet to {lines: [{kind, topic, when, say, then}], offers: [topics]}. kind: note, topic, greet or none. */
export function parseSheet(text) {
  const lines = [], offers = [];
  for ( const raw of String(text ?? "").split(/\r?\n/) ) {
    let line = raw.trim();
    if ( !line || line.startsWith("#") ) continue;
    let tag = null;
    const b = /^\[([^\]]{1,60})\]\s*(.*)$/.exec(line);
    if ( b ) { tag = normTopic(b[1]); line = b[2].trim(); }
    if ( tag === "offer" ) {
      for ( const t of line.split(/\s*,\s*/) ) if ( normTopic(t) && !SPECIAL.has(normTopic(t)) ) offers.push(normTopic(t));
      continue;
    }
    let then = parseThen("");
    if ( tag ) {
      const p = line.indexOf(" | ");
      if ( p >= 0 ) { then = parseThen(line.slice(p + 3)); line = line.slice(0, p).trim(); }
    }
    const k = line.indexOf("=>");
    const when = k >= 0 ? line.slice(0, k).trim() : "", say = (k >= 0 ? line.slice(k + 2) : line).trim();
    if ( !say ) continue;
    const kind = !tag ? "note" : tag === "greet" ? "greet" : tag === "none" ? "none" : "topic";
    lines.push({kind, topic: kind === "topic" ? tag : null, when, say: say.slice(0, 1000), then});
  }
  return {lines, offers: [...new Set(offers)]};
}

/**
 * The sheets an NPC answers from, in order. info: {own, household, factions: [keys], sceneId}; shared: the world's
 * shared sheets by key. Each: {from, label, ...parseSheet}.
 */
export function sheetKeys({household = null, factions = [], sceneId = null} = {}) {
  const keys = [];
  if ( household ) keys.push(`household:${String(household).trim().toLowerCase()}`);
  for ( const f of factions ?? [] ) if ( f ) keys.push(`faction:${String(f).trim().toLowerCase()}`);
  if ( sceneId ) keys.push(`scene:${sceneId}`);
  keys.push("everyone");
  return keys;
}
export function chainFor({own = "", household = null, factions = [], sceneId = null} = {}, shared = {}) {
  const out = [{from: "own", ...parseSheet(own)}];
  for ( const key of sheetKeys({household, factions, sceneId}) ) if ( String(shared?.[key] ?? "").trim() ) out.push({from: key, ...parseSheet(shared[key])});
  return out;
}

/** Does the character know a topic? learned: topics taught; codex: page names in the character's codex. */
export function knowsTopic(topic, {learned = [], codex = []} = {}) {
  const t = normTopic(topic);
  if ( !t ) return false;
  if ( (learned ?? []).some(x => normTopic(x) === t) ) return true;
  return (codex ?? []).some(n => { const c = normTopic(n); return c === t || (t.length >= 4 && c.includes(t)); });
}

/**
 * The menu. Ask about: topics some sheet in the chain has a line for that the character knows, plus the topics the
 * sheets offer. A topic no sheet mentions is left off, so the list holds only what this person can be asked.
 */
export function menuFor(chain = [], known = {}) {
  const mentioned = new Set(), offered = new Set();
  for ( const s of chain ?? [] ) {
    for ( const l of s.lines ?? [] ) if ( l.kind === "topic" && !LOCAL[l.topic] ) mentioned.add(l.topic);
    for ( const o of s.offers ?? [] ) if ( !LOCAL[o] ) offered.add(o);
  }
  const ask = [...new Set([...[...mentioned].filter(t => knowsTopic(t, known)), ...offered])].sort((a, b) => a.localeCompare(b));
  return {ask, local: Object.keys(LOCAL)};
}

/** May this topic be asked now? */
export const canAsk = (topic, menu) => { const t = normTopic(topic); return !!t && (menu.local.includes(t) || menu.ask.includes(t)); };

const fitting = (lines, check) => (lines ?? []).filter(l => !l.when || (check ? !!check(l.when) : false));

/**
 * The answer to a topic: the first line that fits, the NPC's own sheet first. Then the first "none" line that fits.
 * Returns {line, from, none} or null (nothing at all: the window says they have nothing to say).
 */
export function answerFor(topic, chain = [], check = null) {
  const t = normTopic(topic);
  for ( const s of chain ?? [] ) {
    const hit = fitting((s.lines ?? []).filter(l => l.kind === "topic" && l.topic === t), check)[0];
    if ( hit ) return {line: hit, from: s.from, none: false};
  }
  for ( const s of chain ?? [] ) {
    const hit = fitting((s.lines ?? []).filter(l => l.kind === "none"), check)[0];
    if ( hit ) return {line: hit, from: s.from, none: true};
  }
  return null;
}

/** Every line that fits a topic, for the Storyteller's "ask me first" card. */
export function answersFor(topic, chain = [], check = null) {
  const t = normTopic(topic);
  return (chain ?? []).flatMap(s => fitting((s.lines ?? []).filter(l => l.kind === "topic" && l.topic === t), check).map(line => ({line, from: s.from})));
}

/** The greeting: the first "greet" line that fits, or null. */
export function greetFor(chain = [], check = null) {
  for ( const s of chain ?? [] ) { const hit = fitting((s.lines ?? []).filter(l => l.kind === "greet"), check)[0]; if ( hit ) return hit; }
  return null;
}

/**
 * Squares between two tokens, edge to edge, counted the way a person paces it: 1 when they stand side by side,
 * 0 when they overlap. a, b: {x, y, w, h} in pixels (w, h the token's size); size: the grid's square in pixels.
 */
export function squaresBetween(a, b, size = 100) {
  const s = Number(size) > 0 ? Number(size) : 100;
  const gap = (p, q, wp, wq) => Math.abs((p + wp / 2) - (q + wq / 2)) - (wp + wq) / 2;
  const g = Math.max(gap(a.x, b.x, a.w ?? s, b.w ?? s), gap(a.y, b.y, a.h ?? s, b.h ?? s));
  return Math.max(0, Math.round(g / s) + 1);
}

/**
 * With nobody targeted, the person to talk to: the nearest one within reach. me: {x, y, w, h}; others:
 * [{id, x, y, w, h}] already limited to people the Storyteller plays that the player can see. Ties go to the first.
 */
export function nearestFor(me, others = [], size = 100, reach = 2) {
  let best = null, bestD = Infinity;
  for ( const o of others ?? [] ) {
    const d = squaresBetween(me, o, size);
    if ( d <= reach && d < bestD ) { best = o; bestD = d; }
  }
  return best;
}

/** The character's taught topics after adding some (kept to 300, newest last). */
export function addLearned(learned = [], add = []) {
  const out = [...new Set([...(learned ?? []).map(normTopic), ...(add ?? []).map(normTopic)].filter(Boolean))];
  return out.slice(-300);
}
export const dropLearned = (learned = [], drop = []) => { const d = new Set((drop ?? []).map(normTopic)); return (learned ?? []).map(normTopic).filter(t => t && !d.has(t)); };

/* ------------------------------------------------------------------ */
/*  Stock talk (NPC 0.11.0): what anyone says before the Storyteller has written a line                     */
/* ------------------------------------------------------------------ */

/** The span of years stock talk speaks for. branch: "future" on the Future Darkness branch. */
export function eraBand(year, branch = "") {
  const y = Number(year);
  if ( branch === "future" && y >= 2026 ) return "future";
  if ( !Number.isFinite(y) ) return "modern";
  if ( y < 1500 ) return "medieval";
  if ( y < 1800 ) return "earlymodern";
  if ( y < 1900 ) return "nineteenth";
  if ( y < 1980 ) return "twentieth";
  if ( y < 2026 ) return "modern";
  return "future";
}

/** How the NPC regards the character, from a step of -3 to +3. */
export function regardOf(step) {
  const n = Math.round(Number(step) || 0);
  return n <= -3 ? "hate" : n <= -1 ? "dislike" : n <= 1 ? "neutral" : n === 2 ? "like" : "love";
}

/**
 * The step to use: the NPC's own attitude toward the character when it is set, else the standing of the NPC's
 * factions toward them (the mean, rounded toward zero), else 0.
 */
export function stepFor({attitude = null, standings = []} = {}) {
  if ( Number.isFinite(Number(attitude)) && attitude !== null && attitude !== "" ) return Math.max(-3, Math.min(3, Math.round(Number(attitude))));
  const v = (standings ?? []).map(Number).filter(Number.isFinite);
  if ( !v.length ) return 0;
  return Math.max(-3, Math.min(3, Math.trunc(v.reduce((a, b) => a + b, 0) / v.length)));
}

/** A steady pick: the same seed gives the same line, so a person does not change their greeting on every click. */
export function hashSeed(...parts) {
  let h = 2166136261;
  for ( const ch of parts.join("|") ) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export const pickLine = (list, seed = 0) => ((list ?? []).length ? list[seed % list.length] : null);

/**
 * A stock line. kind: greet, none, rumours, news, work, directions. stock: the data (data/stock-talk.mjs).
 * rumour: the text of a rumour the NPC has heard (for rumours). Returns {say, rumour} or null.
 */
export function stockLine(kind, {stock, era = "modern", regard = "neutral", seed = 0, rumour = null, voice = null} = {}) {
  if ( !stock ) return null;
  const say = text => (text ? {say: text, rumour: null} : null);
  // voice (0.14.0): {greet, none, gossip} lines of the kind of person they are, mixed with the era's own
  // voice.only: children, beggars and drunks keep to their own lines
  const mix = (v, list) => (voice?.only && (v ?? []).length ? v : [...(v ?? []), ...(list ?? [])]);
  if ( kind === "greet" ) return say(pickLine(mix(voice?.greet?.[warmthOf(regard)], stock.GREET?.[era]?.[regard]), seed));
  if ( kind === "none" ) return say(pickLine(mix(voice?.none, stock.NONE?.[regard]), seed));
  if ( kind === "work" ) return regard === "hate" ? say(pickLine(stock.NONE?.hate, seed)) : say(pickLine(stock.WORK?.[era], seed));
  if ( kind === "directions" ) return say(pickLine(stock.DIRECTIONS?.[regard], seed));
  if ( kind === "news" ) return regard === "hate" ? say(pickLine(stock.NONE?.hate, seed)) : say(pickLine(stock.NEWS?.[era], seed));
  if ( kind === "rumours" ) {
    if ( regard === "hate" || (regard === "dislike" && !rumour) ) return say(pickLine(stock.RUMOUR_REFUSE?.[regard], seed));
    if ( rumour ) {
      const lead = pickLine(stock.RUMOUR_LEAD?.[regard], seed) ?? "\"{rumour}\"";
      const words = String(rumour).trim().replace(/^"|"$/g, "");
      return {say: lead.replace("{rumour}", words), rumour};
    }
    return say(pickLine(mix(voice?.gossip, stock.GOSSIP?.[era]), seed));
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  More stock talk (NPC 0.14.0): what a person notices, voices, small talk, memory, farewells, barks            */
/* ------------------------------------------------------------------ */

/** Hate and dislike are cold; like and love are warm. */
export const warmthOf = regard => (regard === "hate" || regard === "dislike" ? "cold" : regard === "like" || regard === "love" ? "warm" : "neutral");

/** Words in a faction's key or a household's name that give a voice when the Storyteller has not chosen one. */
export const VOICE_WORDS = {
  clergy: ["church", "abbey", "priest", "monastery", "convent", "parish", "clergy", "chapter", "friars", "nuns", "monks", "temple", "cathedral", "bishop"],
  noble: ["noble", "court", "baron", "count", "duke", "lord", "lady", "margrave", "castle"],
  merchant: ["guild", "merchant", "trade", "market", "shop", "traders", "bank"],
  soldier: ["watch", "guard", "army", "garrison", "police", "militia", "soldier", "knights", "regiment", "security"],
  criminal: ["thieves", "gang", "mob", "smuggler", "smugglers", "crime", "cartel", "brigands", "bandits", "fences"],
  scholar: ["university", "college", "library", "academy", "scholars", "school", "institute"],
  servant: ["servants", "staff", "kitchen", "stable"],
  peasant: ["farm", "farmers", "village", "villagers", "peasants", "mill", "steading"],
  corporate: ["corp", "corporation", "company", "inc", "ltd", "holdings", "pentex", "industries"],
  street: ["street", "crew", "block", "corner"],
  beggar: ["beggars", "poor", "almshouse"]
};
/**
 * The voice an NPC speaks in: the one the Storyteller chose, else the first fitting word in their factions or
 * household. A voice with a "from" year only speaks from that year. Returns a key of voices, or null.
 */
export function voiceFor({voice = null, factions = [], household = null, year = null} = {}, voices = {}) {
  const fits = k => k && voices[k] && !(voices[k].from && Number.isFinite(Number(year)) && Number(year) < voices[k].from);
  if ( voice ) return fits(voice) ? voice : null;
  const words = [...(factions ?? []), household ?? ""].join(" ").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for ( const [k, list] of Object.entries(VOICE_WORDS) ) if ( list.some(w => words.includes(w)) && fits(k) ) return k;
  return null;
}

/** What a mortal notices first about a character, from "Only when" tests (check(text) -> true or false). */
export const NOTICE_ORDER = ["frenzy", "wounded", "kindred", "ghoul", "lupine", "mage", "fae", "wraith", "hunter", "demon", "mummy"];
export function noticeFor(check) {
  if ( typeof check !== "function" ) return null;
  for ( const k of NOTICE_ORDER ) { try { if ( check(k === "frenzy" || k === "wounded" ? k : `kind ${k}`) ) return k; } catch (e) { /* a test it cannot read */ } }
  return null;
}

/** The month (1 to 12) of a Julian day number, in the Gregorian reckoning the weather uses. */
export function monthOfJdn(jdn) {
  const a = Math.floor(Number(jdn)) + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
  return m + 3 - 12 * Math.floor(m / 10);
}
export const seasonOfMonth = m => (m === 12 || m <= 2 ? "winter" : m <= 5 ? "spring" : m <= 8 ? "summer" : "autumn");

/** What small talk could be about today, most pressing first: {feast, fast, night}, weather tags, the month. */
export function smallTalkKeys({feast = "", fast = "", night = false} = {}, tags = [], month = null) {
  const t = new Set(tags ?? []), out = [];
  if ( feast ) out.push("feast");
  if ( fast ) out.push("fast");
  for ( const k of ["thunder", "snow", "rain", "fog", "wind", "cold", "hot"] ) if ( t.has(k) || (k === "fog" && t.has("mist")) || (k === "wind" && t.has("gale")) ) out.push(k);
  if ( night ) out.push("night");
  if ( Number(month) >= 1 ) out.push(seasonOfMonth(Number(month)));
  return out;
}
/** A small-talk line for today, or null. feast: its name for {feast}. */
export function smallTalk(small, keys = [], {seed = 0, feast = ""} = {}) {
  for ( const k of keys ) { const l = pickLine(small?.[k], seed); if ( l ) return l.replaceAll("{feast}", feast || "feast day"); }
  return null;
}

/** soon: within 30 days of the last talk; long: more than a year; else null. Times in seconds. */
export function rememberOf(last, now) {
  const l = Number(last), n = Number(now);
  if ( !Number.isFinite(l) || !Number.isFinite(n) || n < l ) return null;
  const days = (n - l) / 86400;
  return days <= 30 ? "soon" : days > 365 ? "long" : null;
}

/** A rumour whose text names the character (their whole name or a word of it of 3 letters or more). */
export function rumourAbout(rumours = [], name = "") {
  const words = String(name ?? "").toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(w => w.length >= 3);
  if ( !words.length ) return null;
  const has = text => { const t = ` ${String(text ?? "").toLowerCase().replace(/[^\p{L}\p{N}']+/gu, " ")} `; return words.some(w => t.includes(` ${w} `)); };
  return [...(rumours ?? [])].reverse().find(r => r && !r.ended && has(r.text)) ?? null;
}

/** Open Ledger entries between two people ("from" owes or swore to "to"): youOwe (the character owes the NPC), iOwe, else null. */
export function ledgerBetween(entries = [], npcId, pcId) {
  const open = (entries ?? []).filter(e => e && (e.status ?? "open") === "open" && (e.kind === "debt" || e.kind === "boon" || e.kind === "oath"));
  const id = x => (typeof x === "object" ? x?.id : x) ?? null;
  if ( open.some(e => id(e.from) === pcId && id(e.to) === npcId) ) return "youOwe";
  if ( open.some(e => id(e.from) === npcId && id(e.to) === pcId) ) return "iOwe";
  return null;
}

/**
 * The greeting with what comes after it: the opening (a remembered visit replaces a plain hello), then at most one
 * aside, most pressing first: what they notice about the character, a debt, a rumour about the character, small talk.
 */
export function composeGreet({greet = "", remember = "", notice = "", ledger = "", about = "", small = ""} = {}) {
  const open = remember || greet;
  const aside = notice || ledger || about || small;
  return [open, aside].filter(Boolean).join(" ");
}

/**
 * The rest of the stock kinds. kind: farewell, cry:alarm, cry:hurt, bark:<activity>, trade:<part>, social:<act>:<win|lose>.
 * more: data/stock-talk-more.mjs. Returns a line or null.
 */
export function moreLine(kind, {more, era = "modern", regard = "neutral", seed = 0} = {}) {
  if ( !more ) return null;
  const w = warmthOf(regard), [k, a, b] = String(kind).split(":");
  if ( k === "farewell" ) return pickLine(more.FAREWELL?.[era]?.[w], seed);
  if ( k === "cry" ) return a === "hurt" ? pickLine(more.CRY_HURT, seed) : pickLine(more.CRY_ALARM?.[era], seed);
  if ( k === "bark" ) return pickLine([...(more.BARK_ERA?.[era]?.[a] ?? []), ...(more.BARK?.[a] ?? [])], seed);
  if ( k === "trade" ) {
    if ( a === "open" ) return pickLine(more.TRADE?.open?.[w], seed);
    if ( a === "refuse" && regard !== "hate" && regard !== "dislike" ) return pickLine(more.TRADE?.haggleLose, seed);
    return pickLine(more.TRADE?.[a], seed);
  }
  if ( k === "social" ) return pickLine(more.SOCIAL?.[a]?.[b === "win" ? "win" : "lose"], seed);
  return null;
}

/** A voice's greeting, brush-off or gossip. part: greet, none, gossip. */
export function voiceLine(voices, voice, part, {regard = "neutral", seed = 0} = {}) {
  const v = voices?.[voice];
  if ( !v ) return null;
  if ( part === "greet" ) return pickLine(v.greet?.[warmthOf(regard)], seed);
  return pickLine(v[part], seed);
}
