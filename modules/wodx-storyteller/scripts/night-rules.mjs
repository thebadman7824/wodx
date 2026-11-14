/**
 * WoDX Storyteller: the night's draw and the story aids, with no Foundry in them.
 *
 *   The night     One draw for a night: an encounter for each kind of place and world layer in play, opened by the
 *                 time of night, and a rumour. Seeded by the night's date, so the same chronicle gets the same night
 *                 again; a re-roll counts up a nonce.
 *   Story aids    Dreams, visions, auguries and foreshadowings built from the chronicle's own places and people (what
 *                 the log and the world hold), and relics, fetishes and talismans with a suggested rating.
 * Everything here is a prompt for the Storyteller. The tables are WoDX's, kept as Roll Tables the Storyteller edits.
 */
import * as G from "../../wodx-chronicle/scripts/gen-core.mjs";

/** The parts of the night, by the hour (0 to 24). */
export function partOfNight(hours) {
  const h = ((Number(hours) % 24) + 24) % 24;
  if ( h >= 3 && h < 12 ) return "late";
  if ( h >= 22 || h < 3 ) return "deep";
  return "early";
}
export const PARTS = {early: "Early in the night", deep: "The dead hours", late: "Before dawn"};

/** Kinds of place a night draws for. Fixed list. */
export const PLACES = {town: "In town", wilds: "On the roads and in the wilds"};
/** The world layers, and which lines at the table bring each into the draw. */
export const LAYERS = {physical: "The physical world", penumbra: "The Penumbra", shadowlands: "The Shadowlands"};
const LAYER_LINES = {penumbra: ["werewolf", "mage", "changeling"], shadowlands: ["wraith"]};

/** The layers in play for the chronicle's lines (from Start a chronicle). The physical world is always drawn. */
export function layersFor(lines = []) {
  const set = new Set(lines ?? []);
  return ["physical", ...Object.entries(LAYER_LINES).filter(([, ls]) => ls.some(l => set.has(l))).map(([k]) => k)];
}

/** A seeded pick from a list, or the fallback when it is empty. */
export const pickOr = (rand, list, fallback) => (list?.length ? G.pick(rand, list) : fallback);

/**
 * Compose a night. randFor(key) gives a seeded stream for one part, so each part keeps its result when another is
 * re-rolled. tables: (id) => table. vars: {place, person, places, people}.
 */
export function composeNight({randFor, tables, part = "early", places = ["town", "wilds"], layers = ["physical"], vars = {}} = {}) {
  const open = G.draw(`night.hour.${part}`, {rand: randFor(`hour:${part}`), tables})?.text ?? "";
  const encounters = [];
  for ( const p of places ) {
    const r = G.draw(`night.encounter.${p}`, {rand: randFor(`enc:${p}`), tables});
    if ( r ) encounters.push({layer: "physical", place: p, label: PLACES[p] ?? p, text: r.text});
  }
  for ( const l of layers.filter(x => x !== "physical") ) {
    const r = G.draw(`night.encounter.${l}`, {rand: randFor(`enc:${l}`), tables});
    if ( r ) encounters.push({layer: l, place: null, label: LAYERS[l], text: r.text});
  }
  const rr = randFor("rumour");
  const fill = {place: vars.place ?? pickOr(rr, vars.places, "the old mill"), person: vars.person ?? pickOr(rr, vars.people, "a neighbour")};
  const rumour = G.draw("night.rumour", {rand: rr, tables, vars: fill})?.text ?? "";
  return {part, partLabel: PARTS[part], opening: open, encounters, rumour};
}

/** The story aids. Fixed list. */
export const AIDS = {
  dream: {label: "A dream", table: "aid.dream", whisper: true},
  vision: {label: "A vision", table: "aid.vision", whisper: true},
  augury: {label: "An augury", table: "aid.augury", whisper: true},
  foreshadow: {label: "A foreshadowing", table: "aid.foreshadow", whisper: true},
  relic: {label: "A relic", table: "aid.relic", rating: "Faith potential"},
  fetish: {label: "A fetish", table: "aid.fetish", rating: "Level"},
  talisman: {label: "A talisman", table: "aid.talisman", rating: "Rating"}
};

/** A suggested rating, 1 to 5, low ones far more often (house rule). */
export function suggestRating(rand) {
  const r = G.drawResult(rand, [{v: 1, weight: 8}, {v: 2, weight: 6}, {v: 3, weight: 4}, {v: 4, weight: 2}, {v: 5, weight: 1}]);
  return r?.v ?? 1;
}

/** Compose one aid. vars: {actor, place, person, places, people}. */
export function composeAid({kind, rand, tables, vars = {}} = {}) {
  const a = AIDS[kind];
  if ( !a ) return null;
  const fill = {actor: vars.actor ?? "The character", place: vars.place ?? pickOr(rand, vars.places, "a place long gone"),
    person: vars.person ?? pickOr(rand, vars.people, "someone half remembered")};
  const r = G.draw(a.table, {rand, tables, vars: fill});
  if ( !r ) return null;
  const out = {kind, label: a.label, text: r.text, place: fill.place, person: fill.person};
  if ( a.rating ) {
    out.rating = suggestRating(rand);
    out.ratingLabel = a.rating;
    out.text = r.text.charAt(0).toUpperCase() + r.text.slice(1);
  }
  return out;
}

/**
 * The chronicle's own places and people, for a character first: those in its log entries, then the rest.
 * entries: the tracker's log; scenes: [{name}]; actors: [{id, name, pc}].
 */
export function fragments({entries = [], scenes = [], actors = [], actor = null, notAPlace = /battle ?map|\bcombat\b|\btest\b|\(gate|^WoDX gate/i} = {}) {
  const mine = actor ? entries.filter(e => e.actor === actor) : entries;
  const seen = new Set();
  const uniq = list => list.filter(x => x && !seen.has(x) && seen.add(x));
  const places = uniq([...mine.map(e => e.place), ...scenes.map(s => s.name)].filter(p => p && !notAPlace.test(p)));
  seen.clear();
  const known = new Set(mine.flatMap(e => [e.with, e.npc].flat()).filter(Boolean));
  const people = uniq([...actors.filter(a => !a.pc && known.has(a.name)).map(a => a.name), ...actors.filter(a => !a.pc && !/^WoDX gate/i.test(a.name)).map(a => a.name)]);
  return {places: places.slice(0, 40), people: people.slice(0, 40)};
}

/** A plain-text summary of a night, for the queue's detail and the log. */
export function nightText(n) {
  const enc = n.encounters.map(e => `${e.label}: ${e.text}`).join(" ");
  const pulls = (n.pulls ?? []).filter(p => p.text).map(p => ` ${p.name} (${p.actorName}): ${p.text}`).join("");
  return `${n.opening} ${enc}${n.rumour ? ` Rumour: ${n.rumour}` : ""}${pulls}`.trim();
}

/* ---- B3924 (no-effect audit w2): story-aid things made real, and the night's people put on a scene ---- */

const cap1 = s => String(s ?? "").charAt(0).toUpperCase() + String(s ?? "").slice(1);
const esc1 = s => String(s ?? "").replace(/[<>&"]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;"})[c]);
/** A short item name from an aid's text: the words before "that", "with", "from", "of a" or a comma, at most six. */
export function thingName(text = "") {
  const s = String(text ?? "").trim().replace(/^(a|an|the)\s+/i, "");
  const head = s.split(/\s+(?:that|which|with|whose|from|carved|bound|holding|home to)\b|,/i)[0] ?? s;
  return cap1(head.split(/\s+/).slice(0, 6).join(" ")) || "A strange thing";
}

/**
 * The item a relic, fetish or talisman aid becomes, built by WoDX Library's crafting kits so it has the same powers and
 * Use buttons as a made one. kits: {kitFor, rowOf, rows(line)}; rand: a seeded stream for the fetish pick.
 * Returns item data, or null (a dream or vision, or the kit is missing).
 *   relic     the inquisitors' enshrined relic: True Faith = the rating (1 to 3), a prayer once a story
 *   talisman  a hedge magic talisman of the rating's level: dice to one roll, the rating in charges
 *   fetish    a Werewolf fetish of the rating's level, its spirit the aid's own, attuned and woken in WoDX Actions
 */
export function aidItem(a = {}, {kitFor = () => null, rowOf = () => null, rows = () => [], rand = Math.random} = {}) {
  const r = Math.max(1, Math.min(5, Math.round(Number(a.rating) || 1)));
  const name = thingName(a.text);
  const why = `<p>${esc1(cap1(a.text))}.</p><p>A story aid (WoDX Storyteller): the Storyteller decides where it is found.</p>`;
  const tag = item => ({...item, name, flags: {...item.flags, "wodx-storyteller": {aid: {kind: a.kind, count: a.count ?? 0, nonce: a.nonce ?? 0}}},
    system: {...item.system, description: why + (item.system?.description ?? "")}});
  if ( a.kind === "relic" ) {
    const kit = kitFor("hunter"), row = rowOf("hunter", "enshrine-relic");
    if ( !kit?.flagFor || !row ) return null;
    const rating = Math.min(3, r);
    const flag = kit.flagFor(row, {successes: rating * 5, task: {opts: {}}});
    return tag({type: "Item", img: "icons/svg/holy-shield.svg", system: {description: `<p>${esc1(row.does)}</p><p>${esc1(flag.ref)}.</p>`, reference: flag.ref},
      flags: {"wodx-library": {wonder: flag}}});
  }
  if ( a.kind === "talisman" ) {
    const kit = kitFor("hedge"), row = rowOf("hedge", `enchant-${r}`);
    if ( !kit || !row ) return null;
    const [item] = kit.itemsFor(row, {successes: r, task: {opts: {power: "dice", amount: Math.min(r, row.most ?? r), uses: "charges"}}});
    return item ? tag(item) : null;
  }
  if ( a.kind === "fetish" ) {
    const kit = kitFor("garou");
    const list = (rows("garou") ?? []).filter(w => w.kind === "fetish");
    const at = list.filter(w => Number(w.level) === r);
    const pool = at.length ? at : list;
    if ( !kit || !pool.length ) return null;
    const row = pool[Math.floor(rand() * pool.length) % pool.length];
    const sm = String(a.text).match(/([\w-]+\s+)?spirit(\s+of\s+(?:the\s+)?[\w-]+)?/i);
    const spirit = sm ? `${sm[1] && !/^(an?|the|with|to)\s/i.test(sm[1]) ? sm[1] : ""}spirit${sm[2] ?? ""}`.trim() : row.spirit;
    const [item] = kit.itemsFor(row, {successes: 1, task: {spirit}});
    return item ? tag({...item, system: {...item.system, description: `<p>It works as a ${esc1(row.name)}.</p>${item.system?.description ?? ""}`}}) : null;
  }
  return null;
}

/** Words that name who an encounter brings, with the trade WoDX Creation's people tables know them by. */
export const WHO = [
  [/\bwatch(man|men)?\b|\bguards?\b|\bsentr(y|ies)\b|\bpolice\b|\bofficers?\b|\bcops?\b/i, "watch"],
  [/\bfriars?\b|\bpriests?\b|\bmonks?\b|\bnuns?\b|\bpilgrims?\b/i, "priest"],
  [/\bmerchants?\b|\bpedlars?\b|\bpeddlers?\b|\btraders?\b|\bhawkers?\b/i, "merchant"],
  [/\bbeggars?\b|\bvagrants?\b|\bhomeless\b/i, "beggar"],
  [/\bcarters?\b|\bcarriers?\b|\bdrivers?\b|\bcoachm[ae]n\b/i, "carter"],
  [/\bsoldiers?\b|\bmen-at-arms\b|\bmercenar(y|ies)\b|\btroops?\b/i, "soldier"],
  [/\bthieves\b|\bthief\b|\bcutpurses?\b|\bbandits?\b|\brobbers?\b|\bthugs?\b|\bgang\b|\bmuggers?\b/i, "thief"],
  [/\bdrunks?\b|\bdrinkers?\b|\brevell?ers\b/i, "drinker"],
  [/\bchild(ren)?\b|\bboy\b|\bgirl\b|\burchins?\b/i, null] // children are never made here (age floor): the Storyteller plays them
];
const COUNT = {a: 1, an: 1, one: 1, two: 2, pair: 2, couple: 2, three: 3, four: 4, five: 5, six: 6, several: 3, few: 3, some: 2};

/**
 * Who an encounter line brings onto a scene: [{role, count}] with role a key of WHO's roles ("watch", "priest", ...) or
 * "someone". Counts come from the number word just before the noun (a, two, a pair of ...), held to 1..6. A line that
 * names nobody brings one "someone". Children are left out.
 */
export function peopleIn(text = "") {
  const s = String(text ?? "");
  const out = [];
  let kids = false;
  for ( const [re, role] of WHO ) {
    const m = s.match(re);
    if ( !m ) continue;
    if ( !role ) { kids = true; continue; }
    const before = s.slice(0, m.index).toLowerCase().split(/[^a-z-]+/).filter(Boolean).slice(-3);
    // "The watch, two with lanterns": a number word just after the noun counts too
    const after = s.slice(m.index + m[0].length).toLowerCase().split(/[^a-z-]+/).filter(Boolean).slice(0, 1).filter(w => COUNT[w] > 1);
    const word = [...before].reverse().find(w => COUNT[w]) ?? after[0];
    const plural = /s$|men$|ies$|ves$/i.test(m[0]);
    const count = Math.max(1, Math.min(6, word ? COUNT[word] : (plural ? 2 : 1)));
    out.push({role, count});
  }
  if ( !out.length && !kids ) out.push({role: "someone", count: 1});
  return out;
}

/** The trades in WoDX Creation's people tables that fit each role, as words in the trade's name. */
export const ROLE_TRADE = {
  watch: /watch|guard|constable|police|security|bouncer|sergeant|retainer/i,
  priest: /priest|friar|monk|nun|imam|lama|dervish|ascetic|temple|pilgrim|clergy/i,
  merchant: /merchant|trader|shop|pedlar|stall/i,
  beggar: /beggar|vagrant/i,
  carter: /carter|driver|coachman|courier|rider|porter|bearer|boatman|ferryman/i,
  soldier: /soldier|man-at-arms|mercenar|mamluk|warrior|garrison|knight/i,
  thief: /thief|gang|fixer|informer|smuggl|gambler/i,
  drinker: /innkeeper|publican|bartender|brewer|tanner|labour|factory|apprentice|weaver/i
};
/** A trade for a role from the era's own trade list, seeded; "any" when none fits (Creation then picks). */
export function tradeFor(role, trades = [], rand = Math.random) {
  const re = ROLE_TRADE[role];
  const fit = re ? trades.filter(t => re.test(String(t))) : [];
  return fit.length ? fit[Math.floor(rand() * fit.length) % fit.length] : "any";
}
