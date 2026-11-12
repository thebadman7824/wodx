/**
 * WoDX NPC 0.48.0 (B2510 to B2519): settlements, the pure part. No Foundry here, so the harness can test it.
 *
 * The town generator (tools/mapgen/ddtown.py --settle) writes one record of a whole place beside its maps:
 * <name>.settlement.json, format "wodx-settlement". It holds every household with its trade, standing and people
 * as roles, the offices of the age, and the ties between households (kin, friends, rivals, debts, and the place a
 * trade goes out to work). The Storyteller reviews the record in the Settlements window before the place enters
 * the world: strikes households, chooses which hidden folk live there, and keeps or drops the ties. Entering it
 * makes a journal for the place. When a map of the place is adopted and its residents are seeded, WoDX NPC reads
 * the review: struck households stay empty, the hidden folk are marked on their sheets and buildings, the ties go
 * on the sheets' relationships, and those who go out to work walk to their workplace.
 *
 * The hidden folk and their numbers are house rules (PENDING-REVIEW); the Storyteller's ticks decide.
 */
import {fits} from "./supernatural-rules.mjs";

export const FORMAT = "wodx-settlement";
const NPC = "wodx-npc";
const str = (v, n = 80) => String(v ?? "").trim().slice(0, n);
const plain = v => !!v && typeof v === "object" && !Array.isArray(v);
const WEALTH = new Set(["rich", "middling", "poor"]);
/** The ties a record may carry: what the second household is to the first, or "works-at" a building. */
export const TIE_KINDS = {sibling: "Kin in another house", child: "A grown child's house", friend: "Friends", rival: "Rivals and quarrels", owes: "Debts",
  "works-at": "Where they go to work"};
export const MAX_HOUSEHOLDS = 3000, MAX_TIES = 6000;

/* ------------------------------------------------------------------ */
/*  Reading the record                                                 */
/* ------------------------------------------------------------------ */

/**
 * Check and tidy a settlement record (text or object). Returns {ok, errors, data}; data keeps only what WoDX uses,
 * in a compact form: households [{id, building, label, trade, wealth, people: [roles], map}].
 */
export function readRecord(raw) {
  let d = raw;
  if ( typeof raw === "string" ) { try { d = JSON.parse(raw); } catch (e) { return {ok: false, errors: ["That file is not a settlement record: it is not JSON."], data: null}; } }
  if ( !plain(d) || d.format !== FORMAT ) return {ok: false, errors: ["That file is not a settlement record (it should come from the town generator's --settle)."], data: null};
  if ( Number(d.version) !== 1 ) return {ok: false, errors: [`This settlement record is version ${d.version}; WoDX NPC reads version 1.`], data: null};
  const errors = [];
  const id = str(d.id, 120);
  if ( !id ) return {ok: false, errors: ["The settlement record has no id."], data: null};
  const seen = new Set(), households = [];
  for ( const h of Array.isArray(d.households) ? d.households.slice(0, MAX_HOUSEHOLDS) : [] ) {
    if ( !plain(h) || !str(h.id, 200) || seen.has(h.id) ) continue;
    const people = (Array.isArray(h.people) ? h.people : []).map(p => str(plain(p) ? p.role : p, 40)).filter(Boolean).slice(0, 20);
    if ( !people.length ) continue;
    seen.add(h.id);
    households.push({id: str(h.id, 200), building: str(h.building), label: str(h.label || h.id), trade: str(h.trade || people[0], 40),
      wealth: WEALTH.has(h.wealth) ? h.wealth : "middling", people, map: str(h.map, 12)});
  }
  if ( Array.isArray(d.households) && d.households.length > MAX_HOUSEHOLDS ) errors.push(`Only the first ${MAX_HOUSEHOLDS} households were read.`);
  if ( !households.length ) return {ok: false, errors: ["The settlement record has no households."], data: null};
  const ties = [];
  for ( const t of Array.isArray(d.ties) ? d.ties.slice(0, MAX_TIES) : [] ) {
    if ( !plain(t) || !TIE_KINDS[t.kind] || !seen.has(t.a) ) continue;
    if ( t.kind === "works-at" ) { if ( str(t.place) ) ties.push({a: t.a, place: str(t.place), kind: t.kind, note: str(t.note, 120)}); }
    else if ( seen.has(t.b) && t.a !== t.b ) ties.push({a: t.a, b: t.b, kind: t.kind, note: str(t.note, 120)});
  }
  const notables = (Array.isArray(d.notables) ? d.notables : []).filter(n => plain(n) && seen.has(n.household)).map(n => ({role: str(n.role, 60), household: n.household})).slice(0, 40);
  const maps = (Array.isArray(d.maps) ? d.maps : []).filter(plain).map(m => ({id: str(m.id, 12), name: str(m.name, 120), sidecar: str(m.sidecar, 160), households: Number(m.households) || 0})).slice(0, 200);
  const count = o => Object.fromEntries(Object.entries(plain(o) ? o : {}).slice(0, 200).map(([k, v]) => [str(k, 60), Number(v) || 0]));
  const year = Math.round(Number(d.year)) || 0;
  return {ok: true, errors, data: {format: FORMAT, version: 1, id, name: str(d.name || id, 120), seed: Number(d.seed) || 0, kind: str(d.kind, 20) || "village", label: str(d.label, 40),
    year, era: str(d.era, 40), age: str(d.age, 20), region: str(d.region, 40) || "moravia", walled: !!d.walled, country: plain(d.country) ? {at: str(d.country.at, 60), town: str(d.country.town, 60), land: str(d.country.land, 40)} : null,
    population: households.reduce((s, h) => s + h.people.length, 0), maps, layers: (Array.isArray(d.layers) ? d.layers : []).map(l => str(l, 40)).slice(0, 60),
    buildings: count(d.buildings), notables, households, ties}};
}

/** The record's numbers for the review: people, households, their mean size, by standing, and the trades by count. */
export function summary(rec, struck = []) {
  const out = new Set(struck);
  const hs = rec.households.filter(h => !out.has(h.id));
  const people = hs.reduce((s, h) => s + h.people.length, 0);
  const trades = {};
  for ( const h of hs ) trades[h.trade] = (trades[h.trade] ?? 0) + 1;
  const wealth = {rich: 0, middling: 0, poor: 0};
  for ( const h of hs ) wealth[h.wealth]++;
  return {people, households: hs.length, mean: hs.length ? Math.round(people / hs.length * 10) / 10 : 0, wealth,
    trades: Object.entries(trades).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), alone: hs.filter(h => h.people.length === 1).length};
}

/* ------------------------------------------------------------------ */
/*  The hidden folk                                                    */
/* ------------------------------------------------------------------ */

const hashOf = s => { let h = 2166136261; for ( const c of String(s) ) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
/** A small seeded number source (mulberry32), so a review draws the same folk until the Storyteller draws again. */
export function seeded(seed) {
  let a = hashOf(seed) || 1;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * The hidden folk a settlement may hold, by game line. per: one for so many people (a house rule; the Storyteller's
 * ticks decide); unit: a whole household, one person (the head of a household) or a building; likes: the trades or
 * buildings the draw leans to; label(year, era): what they are called in that year.
 */
export const FOLK = {
  ghoul: {line: "Vampire", unit: "household", per: 300, most: 3, likes: /innkeeper|publican|alehouse|sexton|gravedigger|watchman|physician|doctor|gaoler|caretaker|undertaker|porter|servant/,
    label: () => "A household of ghouls", note: "They serve a vampire. Choose the domitor when the residents are seeded."},
  vampire: {line: "Vampire", unit: "building", per: 800, most: 2, least: 150, likes: /charnel|cemetery|granary|storehouse|warehouse|mill|palace|mansion|hotel|sewer|gaol|library|data hall/i,
    label: y => (y && y < 1500 ? "A Cainite's haven" : "A Kindred's haven"), note: "A cellar or a walled-off room; those above may not know."},
  kinfolk: {line: "Werewolf", unit: "household", per: 200, most: 3, country: 2, likes: /farmer|herder|cottager|farm|forester|carter|miller|labourer/,
    label: () => "A Kinfolk household", note: "Kin to the Garou. The tribe is the Storyteller's to choose."},
  hunter: {line: "Hunter", unit: "person", per: 600, most: 2, likes: /priest|physician|doctor|police|gendarme|journalist|teacher|schoolmaster|librarian|pastor|security/,
    label: (y, era) => (y && y < 1500 ? "An inquisitor" : fits("imbued", {year: y, era}) ? "One of the imbued" : "A hunter of the night-folk"),
    note: "Knows that something walks at night, and acts on it."},
  mage: {line: "Mage", unit: "person", per: 1000, most: 1, least: 150, likes: /physician|doctor|apothecary|pharmacist|librarian|teacher|schoolmaster|clockmaker|programmer|technician|priest|curator|engineer|printer/,
    label: () => "A mage", note: "Awakened, and keeping it quiet. The Tradition, Fellowship or Convention is the Storyteller's to choose."},
  wraith: {line: "Wraith", unit: "building", per: 250, most: 3, likes: /gaol|charnel|lazar|hospital|cemetery|almshouse|chapel|church|mill|tenement|bomb/i,
    label: () => "A haunted building", note: "One of the Restless Dead is fettered here."},
  changeling: {line: "Changeling", unit: "person", per: 700, most: 2, likes: /innkeeper|publican|weaver|potter|carpenter|joiner|tailor|shoemaker|confectioner|photographer|printer|student|herder|bartender/,
    label: y => (y && y < 1400 ? "One of the fae" : "A changeling"), note: "The kith and court are the Storyteller's to choose."},
  demon: {line: "Demon", unit: "person", per: 1500, most: 1, least: 300, test: "fallen", likes: /priest|pastor|physician|doctor|manager|lawyer|police|landlord/,
    label: () => "One of the Fallen", note: "A demon wearing a townsperson's life."}
};
/** The lines that can have hidden folk in a year and era (the Fallen from 1999). */
export const linesFor = ({year = 0, era = ""} = {}) => Object.keys(FOLK).filter(k => !FOLK[k].test || fits(FOLK[k].test, {year, era}));

/**
 * Draw the hidden folk for a record. opts: {nonce (how many times the Storyteller drew again), lines (keys to draw,
 * default every line the year allows), struck (household ids left out)}. Returns [{id, key, line, label, unit,
 * household, building, where, note, on}] in line order; the same record and nonce always give the same list.
 */
export function proposeFolk(rec, {nonce = 0, lines = null, struck = []} = {}) {
  const out = [], gone = new Set(struck);
  const hs = rec.households.filter(h => !gone.has(h.id));
  const people = hs.reduce((s, h) => s + h.people.length, 0);
  const country = rec.kind === "village";
  const taken = new Set();
  for ( const key of lines ?? linesFor({year: rec.year, era: rec.era}) ) {
    const f = FOLK[key];
    if ( !f || (f.test && !fits(f.test, {year: rec.year, era: rec.era})) ) continue;
    const rand = seeded(`${rec.id}:${key}:${nonce}`);
    if ( people < (f.least ?? 0) ) continue;
    const want = people / f.per * (country && f.country ? f.country : 1);
    const n = Math.min(f.most, Math.floor(want) + (rand() < want % 1 ? 1 : 0));
    for ( let i = 0; i < n; i++ ) {
      const pool = hs.filter(h => !taken.has(h.id) && (f.unit !== "household" || h.people.length >= 2));
      if ( !pool.length ) break;
      const liked = pool.filter(h => f.likes.test(h.trade) || f.likes.test(h.label) || h.people.some(r => f.likes.test(r)));
      const from = liked.length && rand() < 0.7 ? liked : pool;
      const h = from[Math.floor(rand() * from.length)];
      taken.add(h.id);
      out.push({id: `${key}-${i + 1}`, key, line: f.line, label: f.label(rec.year, rec.era), unit: f.unit, household: h.id, building: h.building,
        where: f.unit === "building" ? h.label.replace(/ household$/, "") : `${h.label.replace(/ household$/, "")} (the ${h.trade})`, note: f.note, on: true});
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  The review                                                         */
/* ------------------------------------------------------------------ */

/** A clean review: {struck: [household ids], folk: [...], ties: {kind: boolean}, nonce}. Unknown ids are dropped. */
export function normReview(rec, r = {}) {
  const ids = new Set(rec.households.map(h => h.id));
  const ties = Object.fromEntries(Object.keys(TIE_KINDS).map(k => [k, r.ties?.[k] !== false]));
  const folk = (Array.isArray(r.folk) ? r.folk : []).filter(f => plain(f) && FOLK[f.key] && ids.has(f.household)).map(f => ({id: str(f.id, 40), key: f.key, line: FOLK[f.key].line,
    label: str(f.label, 80), unit: FOLK[f.key].unit, household: f.household, building: str(f.building), where: str(f.where, 160), note: str(f.note, 200), on: f.on !== false,
    domitor: str(f.domitor, 40) || null}));
  return {struck: [...new Set((Array.isArray(r.struck) ? r.struck : []).filter(id => ids.has(id)))], folk, ties, nonce: Math.max(0, Math.round(Number(r.nonce) || 0))};
}

/** The ties that stand after the review: their kind kept, and neither household struck. */
export function tiesKept(rec, review) {
  const gone = new Set(review.struck);
  return rec.ties.filter(t => review.ties[t.kind] !== false && !gone.has(t.a) && (t.kind === "works-at" || !gone.has(t.b)));
}

/** The settlement a household id belongs to: the part before the full stop ("linberg-1880-7.cottage-3-household"). */
export const settlementOf = householdId => { const i = String(householdId ?? "").indexOf("."); return i > 0 ? String(householdId).slice(0, i) : null; };

/**
 * What the review says about one household, for the residents window. entry: {record, review}. Returns null when
 * the household is not in the record, else {settlement, name, struck, folk: [the ticked folk on it], office}.
 */
export function infoFor(entry, householdId) {
  const h = entry?.record?.households?.find(x => x.id === householdId);
  if ( !h ) return null;
  const review = entry.review ?? {struck: [], folk: []};
  return {settlement: entry.record.id, name: entry.record.name, struck: review.struck.includes(householdId),
    folk: review.folk.filter(f => f.on && f.household === householdId), office: entry.record.notables.find(n => n.household === householdId)?.role ?? null};
}

/** How a tie reads on the first household head's sheet: the hand-made relationship's role and note. */
export function tieRole(t) {
  if ( t.kind === "owes" ) return {role: "other", note: `In debt to them: ${t.note || "a loan"}`.slice(0, 120)};
  if ( t.kind === "child" ) return {role: "child", note: t.note || "A grown child with a house of their own"};
  return {role: t.kind, note: t.note};
}

/**
 * The relationships to write once residents exist. heads: {household id: actor id} for every household head seeded
 * so far (any scene); have: (actorId) => that sheet's hand-made ties [{uuid, role, note}]. Returns [{actor, tie:
 * {uuid, role, note, hidden: false}}] for the ties whose two heads both exist and are not yet tied that way.
 */
export function tieWrites(rec, review, heads = {}, have = () => []) {
  const out = [];
  for ( const t of tiesKept(rec, review) ) {
    if ( t.kind === "works-at" ) continue;
    const a = heads[t.a], b = heads[t.b];
    if ( !a || !b || a === b ) continue;
    const {role, note} = tieRole(t), uuid = `Actor.${b}`;
    if ( have(a).some(x => x.uuid === uuid && x.role === role) || out.some(w => w.actor === a && w.tie.uuid === uuid && w.tie.role === role) ) continue;
    out.push({actor: a, tie: {uuid, role, note, hidden: false}});
  }
  return out;
}

/** Where each household that goes out to work does so: {household id: building key}, after the review. */
export function workplaces(rec, review) {
  const out = {};
  for ( const t of tiesKept(rec, review) ) if ( t.kind === "works-at" ) out[t.a] = t.place;
  return out;
}

/** The flag a hidden one's sheet (or a hidden building's region) carries: the Storyteller's note of what is there. */
export const hiddenFlag = f => ({key: f.key, line: f.line, label: f.label, note: f.note, settlement: settlementOf(f.household)});

/* ------------------------------------------------------------------ */
/*  The journal                                                        */
/* ------------------------------------------------------------------ */

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
/** The words for a household's people: "the smith, a partner, 2 children and an apprentice". */
export function peopleWords(h) {
  const rest = {};
  for ( const r of h.people.slice(1) ) rest[r] = (rest[r] ?? 0) + 1;
  const plural = r => (r === "child" ? "children" : r === "staff" ? "staff" : /s$/.test(r) ? r : `${r}s`);
  const parts = Object.entries(rest).map(([r, k]) => (k === 1 ? (r === "staff" ? "one of the staff" : `${/^[aeiou]/.test(r) ? "an" : "a"} ${r}`) : `${k} ${plural(r)}`));
  const all = [`the ${h.people[0]}`, ...parts];
  return all.length > 1 ? `${all.slice(0, -1).join(", ")} and ${all.at(-1)}` : all[0];
}

/**
 * The journal pages for an entered settlement, as [{name, html}]: the place, its households by map, its ties, and
 * the hidden folk. All of it is for the Storyteller; the journal is made with no player access.
 */
export function journalPages(rec, review) {
  const s = summary(rec, review.struck), gone = new Set(review.struck);
  const where = rec.country?.town ? ` It stands ${rec.country.at && /:/.test(rec.country.at) ? "near" : "at"} ${esc(cap(rec.country.town))}.` : "";
  const offices = rec.notables.filter(x => !gone.has(x.household)).map(x => `<li>${esc(cap(x.role))}: ${esc(rec.households.find(h => h.id === x.household)?.label.replace(/ household$/, "") ?? "")}</li>`).join("");
  const top = s.trades.slice(0, 24).map(([t, k]) => `${esc(t)} ${k}`).join(", ");
  const place = `<p><strong>${esc(rec.name)}</strong> is a ${rec.walled ? "walled " : ""}${esc(rec.label || rec.kind)} of ${n(s.people, "person", "people")} in ${n(s.households, "household", "households")}, as it stands in ${rec.year}.${where}</p>
    <p>Standing: ${s.wealth.rich} well-off, ${s.wealth.middling} middling and ${s.wealth.poor} poor households; ${s.alone} people live alone. A household is ${s.mean} people on average.</p>
    <p>Trades: ${top}${s.trades.length > 24 ? ", and others" : ""}.</p>
    ${offices ? `<h3>Offices</h3><ul>${offices}</ul>` : ""}
    ${rec.maps.length ? `<h3>Maps</h3><p>${rec.maps.map(m => esc(m.name || m.id)).join(", ")}.</p>` : ""}`;
  const byMap = {};
  for ( const h of rec.households ) if ( !gone.has(h.id) ) (byMap[h.map || ""] ??= []).push(h);
  const houses = Object.entries(byMap).sort((a, b) => a[0].localeCompare(b[0])).map(([m, hs]) => `${m ? `<h3>Map ${esc(m)}</h3>` : ""}<ul>${hs.map(h =>
    `<li><strong>${esc(h.label.replace(/ household$/, ""))}</strong> (${esc(h.wealth)}): ${esc(peopleWords(h))}</li>`).join("")}</ul>`).join("");
  const label = id => esc(rec.households.find(h => h.id === id)?.label.replace(/ household$/, "") ?? id);
  const trade = id => esc(rec.households.find(h => h.id === id)?.trade ?? "");
  const kept = tiesKept(rec, review);
  const tieLine = t => (t.kind === "works-at" ? `The ${trade(t.a)} of ${label(t.a)} works at ${esc(t.note || t.place)}.`
    : t.kind === "owes" ? `The ${trade(t.a)} of ${label(t.a)} owes the ${trade(t.b)} of ${label(t.b)}: ${esc(t.note)}.`
      : t.kind === "child" ? `The ${trade(t.b)} of ${label(t.b)} is a grown child of the ${trade(t.a)} of ${label(t.a)}.`
        : t.kind === "sibling" ? `The ${trade(t.a)} of ${label(t.a)} and the ${trade(t.b)} of ${label(t.b)} are siblings.`
          : t.kind === "friend" ? `The households of ${label(t.a)} and ${label(t.b)} are friends: ${esc(t.note)}.`
            : `The households of ${label(t.a)} and ${label(t.b)} are at odds: ${esc(t.note)}.`);
  const ties = Object.keys(TIE_KINDS).map(k => { const list = kept.filter(t => t.kind === k); return list.length ? `<h3>${esc(TIE_KINDS[k])}</h3><ul>${list.map(t => `<li>${tieLine(t)}</li>`).join("")}</ul>` : ""; }).join("");
  const folk = review.folk.filter(f => f.on && !gone.has(f.household));
  const hidden = folk.length ? `<ul>${folk.map(f => `<li><strong>${esc(f.label)}</strong> (${esc(f.line)}): ${esc(f.where)}. ${esc(f.note)}</li>`).join("")}</ul>`
    : "<p>Nobody but mortals, as far as this record says.</p>";
  return [{name: "The place", html: place}, {name: "Households", html: houses || "<p>No households.</p>"}, {name: "Ties", html: ties || "<p>No ties were kept.</p>"},
    {name: "Hidden folk", html: hidden}];
}

/** The entry kept on the journal: the record, the review, and when it was entered. */
export const entryOf = flags => (plain(flags?.[NPC]?.settlement) && plain(flags[NPC].settlement.record) ? flags[NPC].settlement : null);
