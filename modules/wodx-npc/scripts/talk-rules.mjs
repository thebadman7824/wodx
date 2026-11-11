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
