/**
 * WoDX NPC: cults and congregations that gather around a character (B3240-B3249). The pure part; no Foundry calls,
 * so the harness can test it. cults.mjs reads the world and hands the results here.
 *
 * Ben asked on 13 November 2026 for a way that players and certain NPCs grow cults around themselves in play, from
 * their words and their deeds, each line with a cult of its own kind (blood cults for vampires, the Netaru for
 * mummies), with the Princes of Darkness mod for Crusader Kings III as a source of ideas. Ideas taken from it, rebuilt
 * on WoDX's own systems: a bound follower of a kind that suits the line (herd member, dreamer, thrall), initiation and
 * ordination into an inner circle, suspicion that grows until someone acts, and a cost to keep it.
 *
 *   Awe        what the people of a place feel for a character, from what they heard and saw there: words spoken
 *              in character where someone could hear (chat), a sermon or gathering (a roll), a power worked in
 *              sight, a breach seen, a willing feeding, a social win. Each adds points and themes. It fades: half
 *              after 30 days with nothing new (B3241).
 *   Doctrine   the themes the awe carried (salvation, blood, power, doom...), counted. The strongest three become
 *              what the cult believes about its founder.
 *   Forming    awe of 10 or more in one place, heard by at least 3 people, puts "a following gathers" in the
 *              approval queue; the founder may also ask for it at 5 (B3242).
 *   The turn   once a week of world time a cult grows by its devotion and its founder's attention, loses heart when
 *              neglected, draws notice by its size and openness, and may split when its faith fails (B3243).
 *   The line   each line's kind of cult, its words, and what it gives: the book Background it stands for (Herd,
 *              Cult, Dreamers, Memoriam, Followers), sized from the cult's members (B3244).
 *
 * Book basis (mechanics in WoDX's own words; printed pages):
 *   V20 p. 114: Herd may be a cult built around the vampire; 3, 7, 15, 30 and 60 vessels; a die a dot on hunting.
 *   M20 p. 310: the Cult Background; 3-7, 8-12, 13-17, 18-22 and 23-30 believers add 1 to 5 dice to a ritual cast
 *     with the gathered cult; their faith must be kept or the benefit is lost.
 *   C20 p. 169: Dreamers; 1, 2, 4, 6 and 8 Dreamers; a success a dot on the Reverie roll, or a pool for Ravaging.
 *   Wraith 20th p. 144 (Memoriam): the living who remember the wraith; roll Memoriam at 8 once a session
 *     for Pathos.
 *   Demon: The Fallen p. 155 (Followers: worshippers, often a source of faith, who leave when ignored); the Devils'
 *     cult of personality that recruits like a pyramid scheme (p. 156 area, the house of Devils), Faith is reaped from
 *     awe or fear, or offered daily through a pact (p. 251).
 * The rest is house reading (PENDING-REVIEW): the awe figures, the weekly turn, growth, notice and schism, and the
 * Netaru, Garou, Kuei-jin, hunter and mortal kinds, whose books give no cult rules held in WoDX's book store.
 */

export const VERSION = 1;
export const DAY = 86400;
export const WEEK = 7 * DAY;
/** Awe needed in one place before a following can gather, and the lower mark at which the founder may ask (B3242). */
export const FORM_AT = 10;
export const ASK_AT = 5;
/** People who must have heard or seen it. */
export const TOUCHED_AT = 3;
/** Days of quiet after which awe halves (B3241). */
export const FADE_DAYS = 30;
/** Weekly turns run at most this many in one go; the rest of a long skip are quiet years (as faction turns, B99). */
export const TURN_CAP = 12;
export const MAX_DEVOTION = 5;
export const MAX_EXPOSURE = 10;
/** Exposure bands: talk starts a rumour, watched tells the Storyteller (and anyone listening for hunters), moved = a raid is proposed. */
export const EXPOSURE_BANDS = [
  {key: "hidden", min: 0, label: "Hidden"},
  {key: "talk", min: 4, label: "People talk"},
  {key: "watched", min: 7, label: "Watched"},
  {key: "moved", min: 10, label: "Someone moves against it"}
];

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, n(v)));
const str = (v, max = 200) => String(v ?? "").slice(0, max);

/* ------------------------------------------------------------------ */
/*  Doctrine: the themes words and deeds carry                        */
/* ------------------------------------------------------------------ */

/** Each theme, the words that call it up in speech (whole words, lower case), and how the faithful put it. */
export const THEMES = {
  salvation: {label: "Salvation", creed: "they will be saved through the founder", words: ["save", "saved", "salvation", "redeem", "redeemed", "redemption", "heaven", "paradise", "sin", "sins", "forgive", "forgiven", "mercy", "grace", "pray", "prayer", "soul", "souls"]},
  blood: {label: "The Blood", creed: "the blood is holy and the founder its vessel", words: ["blood", "drink", "vein", "veins", "vitae", "feast", "sacrament", "communion", "bleed"]},
  power: {label: "Power", creed: "the founder's strength will raise them above others", words: ["power", "strength", "strong", "rule", "obey", "kneel", "mighty", "command", "chosen", "master", "lord", "crown"]},
  doom: {label: "The end of days", creed: "the end is near and only the founder knows the way through", words: ["end", "doom", "apocalypse", "judgement", "judgment", "reckoning", "gehenna", "last", "fire", "storm", "ruin", "darkness"]},
  freedom: {label: "Freedom", creed: "the founder will break their chains", words: ["free", "freedom", "chains", "liberty", "break", "rise", "slaves", "tyrant", "tyrants"]},
  beauty: {label: "Beauty and dreams", creed: "the founder shows them a beauty the world has lost", words: ["beauty", "beautiful", "art", "music", "song", "dream", "dreams", "inspire", "wonder", "love", "poem", "glory"]},
  wealth: {label: "Wealth", creed: "following the founder brings prosperity", words: ["gold", "wealth", "rich", "riches", "money", "prosper", "fortune", "coin", "silver"]},
  healing: {label: "Healing", creed: "the founder heals what no doctor can", words: ["heal", "healed", "healing", "cure", "cured", "sick", "sickness", "plague", "health", "whole"]},
  vengeance: {label: "Vengeance", creed: "the founder will punish those who wronged them", words: ["revenge", "vengeance", "punish", "enemies", "wrath", "justice", "avenge", "pay"]},
  secrets: {label: "Hidden truths", creed: "the founder alone tells them the truth behind the world", words: ["secret", "secrets", "hidden", "mystery", "mysteries", "truth", "know", "knowledge", "lies", "veil", "reveal"]},
  wild: {label: "The wild", creed: "the old powers of earth and moon speak through the founder", words: ["wild", "forest", "earth", "moon", "beast", "wolf", "wolves", "spirits", "river", "mountain", "hunt"]},
  dead: {label: "The dead", creed: "the dead speak, and the founder is their voice", words: ["dead", "ghost", "ghosts", "ancestor", "ancestors", "grave", "graves", "remember", "remembered", "tomb", "beyond"]},
  undying: {label: "Life without end", creed: "the founder holds the secret of life that never ends", words: ["forever", "eternal", "eternity", "immortal", "undying", "youth", "everlasting", "reborn", "rebirth"]}
};
const WORD_THEME = new Map();
for ( const [k, t] of Object.entries(THEMES) ) for ( const w of t.words ) if ( !WORD_THEME.has(w) ) WORD_THEME.set(w, k);

/** The themes a piece of speech touches: {theme: hits}. Whole words only, so "endless" is not "end". */
export function themesOf(text) {
  const out = {};
  const words = String(text ?? "").toLowerCase().replace(/<[^>]*>/g, " ").match(/[a-z']+/g) ?? [];
  for ( const w of words ) { const k = WORD_THEME.get(w.replace(/'s$/, "")); if ( k ) out[k] = (out[k] ?? 0) + 1; }
  return out;
}

/** Deeds and the themes they carry. A power's theme is read from its name and group (power keywords). */
export const DEEDS = {
  words: {label: "Words heard", points: 1},
  sermon: {label: "A sermon or a gathering", points: 0},
  power: {label: "A power worked where people saw it", points: 3},
  breach: {label: "Something no one could explain, seen", points: 2},
  fed: {label: "A willing feeding", points: 1, themes: {blood: 2}},
  social: {label: "Won someone over", points: 1},
  gift: {label: "A gift or a cure given", points: 2, themes: {healing: 1}}
};
const POWER_THEMES = [
  [/heal|mend|cure|restor|blessing|bless|purif/i, "healing"],
  [/presence|majesty|awe|dread|entranc|dominat|command|mesmer|summon/i, "power"],
  [/blood|vitae|thaumaturg|quietus|vicissitude/i, "blood"],
  [/obfusc|vanish|mask|secret|auspex|aura|insight|scry|prophe|vision|oracle/i, "secrets"],
  [/fire|storm|lightning|thunder|earthquake|plague|curse|wither/i, "doom"],
  [/beast|animal|wolf|moon|nature|spirit|gaia|garou|gift/i, "wild"],
  [/ghost|wraith|necroman|corpse|dead|arcan|shroud/i, "dead"],
  [/glamour|dream|chimer|beauty|wonder|art/i, "beauty"]
];
export function powerTheme(name = "", group = "") {
  const s = `${name} ${group}`;
  for ( const [re, k] of POWER_THEMES ) if ( re.test(s) ) return k;
  return "power";
}
/** The social acts of WoDX Actions and the theme a win carries. */
export const SOCIAL_THEMES = {persuade: "salvation", fasttalk: "wealth", con: "secrets", intimidate: "power", threaten: "power", seduce: "beauty", charm: "beauty", bribe: "wealth", inspire: "freedom", rally: "freedom", preach: "salvation"};

/* ------------------------------------------------------------------ */
/*  Awe, kept on the character for each place                          */
/* ------------------------------------------------------------------ */

export function normPlace(p = {}) {
  const themes = {};
  for ( const [k, v] of Object.entries(p.themes ?? {}) ) if ( THEMES[k] && n(v) > 0 ) themes[k] = Math.round(n(v) * 10) / 10;
  return {key: str(p.key, 120), name: str(p.name, 120), pts: Math.max(0, Math.round(n(p.pts) * 10) / 10), themes,
    touched: Math.max(0, Math.round(n(p.touched))), last: n(p.last), asked: n(p.asked),
    log: (Array.isArray(p.log) ? p.log : []).slice(-20).map(e => ({at: n(e.at), kind: DEEDS[e.kind] ? e.kind : "words", pts: n(e.pts), text: str(e.text, 160)}))};
}
export function normAwe(a = {}) {
  const places = {};
  for ( const [k, v] of Object.entries(a?.places ?? {}) ) { const p = normPlace({...v, key: v?.key ?? k}); if ( p.key ) places[p.key] = p; }
  return {v: VERSION, places};
}

/** Awe after fading to now: half for each full FADE_DAYS since the last addition. Returns a new place. */
export function faded(place, now) {
  const p = normPlace(place);
  const halves = p.last ? Math.floor(Math.max(0, n(now) - p.last) / (FADE_DAYS * DAY)) : 0;
  if ( !halves ) return p;
  const f = Math.pow(0.5, halves);
  const themes = {};
  for ( const [k, v] of Object.entries(p.themes) ) { const t = Math.round(v * f * 10) / 10; if ( t >= 0.5 ) themes[k] = t; }
  return {...p, pts: Math.round(p.pts * f * 10) / 10, themes, touched: Math.round(p.touched * f), last: p.last + halves * FADE_DAYS * DAY};
}

/**
 * Add a deed to a character's awe in one place. deed: {kind, place: {key, name}, pts?, themes?, heard (people who
 * heard or saw), text, at}. Words with no audience count for nothing. Returns {awe, place, added}.
 */
export function addAwe(awe, deed, now) {
  const a = normAwe(awe);
  const kind = DEEDS[deed?.kind] ? deed.kind : "words";
  const key = str(deed?.place?.key, 120);
  if ( !key ) return {awe: a, place: null, added: 0};
  const heard = Math.max(0, Math.round(n(deed.heard)));
  if ( heard < 1 && kind !== "sermon" ) return {awe: a, place: a.places[key] ?? null, added: 0};
  const before = faded(a.places[key] ?? {key, name: deed.place.name}, now);
  const pts = Math.max(0, deed.pts !== undefined ? n(deed.pts) : DEEDS[kind].points);
  const themes = {...before.themes};
  for ( const [k, v] of Object.entries({...(DEEDS[kind].themes ?? {}), ...(deed.themes ?? {})}) ) if ( THEMES[k] && n(v) > 0 ) themes[k] = Math.round(((themes[k] ?? 0) + n(v)) * 10) / 10;
  const place = normPlace({...before, name: deed.place.name || before.name, pts: before.pts + pts, themes,
    touched: Math.max(before.touched, 0) + Math.min(heard, 12), last: now,
    log: [...before.log, {at: now, kind, pts, text: str(deed.text, 160)}]});
  return {awe: {...a, places: {...a.places, [key]: place}}, place, added: pts};
}

/** May a following gather here now: "form" (queue it by itself), "ask" (the founder may ask), or "" (not yet). */
export function readiness(place, now) {
  const p = faded(place, now);
  if ( p.touched < TOUCHED_AT ) return "";
  if ( p.pts >= FORM_AT ) return "form";
  if ( p.pts >= ASK_AT ) return "ask";
  return "";
}

/** The doctrine: the strongest themes, at most three, strongest first, with the line's own favourites breaking ties. */
export function doctrineOf(themes = {}, kind = null) {
  const fav = new Set(CULT_KINDS[kind]?.favours ?? []);
  return Object.entries(themes).filter(([k, v]) => THEMES[k] && n(v) > 0)
    .sort((x, y) => (n(y[1]) + (fav.has(y[0]) ? 0.5 : 0)) - (n(x[1]) + (fav.has(x[0]) ? 0.5 : 0)) || x[0].localeCompare(y[0]))
    .slice(0, 3).map(([k]) => k);
}
export function creedText(doctrine = [], founderName = "the founder") {
  const parts = doctrine.filter(k => THEMES[k]).map(k => THEMES[k].creed.replace(/the founder/g, founderName));
  if ( !parts.length ) return `They believe ${founderName} is more than a person.`;
  return `They believe ${parts.map((x, i) => (i ? `that ${x}` : x)).join("; ")}.`;
}

/* ------------------------------------------------------------------ */
/*  Each line's kind of cult                                           */
/* ------------------------------------------------------------------ */

/** Sizes by dot, the lowest member count for each dot from 1 to 5. */
const HERD = [3, 7, 15, 30, 60];         // V20 p. 114
const CULT = [3, 8, 13, 18, 23];         // M20 p. 310
const DREAMERS = [1, 2, 4, 6, 8];        // C20 p. 169
const MEMORIAM = [1, 4, 30, 200, 2000];  // Wraith 20th p. 144: one person to a nation; the counts are a house reading
const FOLLOWERS = [1, 2, 3, 4, 5];       // Demon p. 155, counted as the inner circle, see below

/**
 * The kinds of cult. favours: themes the line's cults lean to. sized: the Background and the member counts for its
 * dots; inner: dots count only the inner circle (ordained members), as the Demon's Followers are each a person.
 * word(year): what outsiders call it in the year. member: one of the faithful. gives: what it does, in the book's terms.
 */
export const CULT_KINDS = {
  blood: {line: "vampire", label: "Blood cult", member: "one of the faithful", members: "the faithful", favours: ["blood", "undying", "power"],
    word: y => (n(y) < 1500 ? "a cult of the Blood" : "a blood cult"), bg: "Herd", sizes: HERD, ref: "V20 p. 114",
    gives: dots => `Feeds like Herd ${dots}: ${dots} ${dots === 1 ? "die" : "dice"} on hunting rolls among the faithful. Those who drink of the founder may become ghouls or bound.`},
  netaru: {line: "mummy", label: "Netaru", member: "one of the Netaru", members: "the Netaru", favours: ["undying", "dead", "secrets"],
    word: () => "the Netaru", bg: "Cult (as M20)", sizes: CULT, ref: "house reading; Cult of Isis as the model (Mummy 2nd ed.)",
    gives: dots => `Keeps the tomb, the body and the old rites. Adds ${dots} ${dots === 1 ? "die" : "dice"} to a rite worked with the gathered Netaru (as M20's Cult).`},
  thralls: {line: "demon", label: "Cult of personality", member: "a devotee", members: "the devotees", favours: ["power", "salvation", "freedom"],
    word: () => "a cult", bg: "Followers", sizes: FOLLOWERS, inner: true, ref: "Demon: The Fallen pp. 155, 251",
    gives: dots => `Followers ${dots} among the inner circle. Their awe can be reaped for Faith at a gathering; a thrall's pact offers Faith each dawn.`},
  dreamers: {line: "changeling", label: "Circle of Dreamers", member: "a Dreamer", members: "the Dreamers", favours: ["beauty", "freedom", "wild"],
    word: y => (n(y) < 1600 ? "a fellowship" : n(y) < 1900 ? "a salon" : "a scene"), bg: "Dreamers", sizes: DREAMERS, ref: "C20 p. 169",
    gives: dots => `Dreamers ${dots}: ${dots} automatic ${dots === 1 ? "success" : "successes"} on the Reverie roll, or a pool to Ravage.`},
  remembrance: {line: "wraith", label: "Circle of remembrance", member: "one who remembers", members: "those who remember", favours: ["dead", "vengeance", "salvation"],
    word: y => (n(y) < 1840 ? "a saint's cult" : n(y) < 1930 ? "a spiritualist circle" : "a memorial circle"), bg: "Memoriam", sizes: MEMORIAM, ref: "Wraith 20th p. 144",
    gives: dots => `Counts as Memoriam ${dots}: once a session roll ${dots} at difficulty 8 for Pathos.`},
  cult: {line: "mage", label: "Cult", member: "a believer", members: "the believers", favours: ["secrets", "power", "beauty"],
    word: () => "a cult", bg: "Cult", sizes: CULT, ref: "M20 p. 310",
    gives: dots => `Cult ${dots}: ${dots} ${dots === 1 ? "die" : "dice"} on a ritual cast with the whole cult gathered. Their faith must be kept.`},
  oldfaith: {line: "werewolf", label: "The old faith", member: "one of the old faith", members: "the old faith", favours: ["wild", "dead", "vengeance"],
    word: y => (n(y) < 1700 ? "the old ways" : "a pagan circle"), bg: "Kinfolk (as help)", sizes: CULT, ref: "house reading",
    gives: dots => `Mortals who keep the old rites near the caern: ${dots} ${dots === 1 ? "die" : "dice"} to tend or hide a caern, and Kinfolk may come from them.`},
  wyrm: {line: "werewolf", label: "Wyrm cult", member: "a cultist", members: "the cultists", favours: ["doom", "power", "wealth"], npcOnly: true,
    word: () => "a Wyrm cult", bg: "Cult (as M20)", sizes: CULT, ref: "W20 (Wyrm cults); house reading",
    gives: dots => `Taint spreads where they meet; ${dots} ${dots === 1 ? "die" : "dice"} to the rites of their master.`},
  kuei: {line: "kuei-jin", label: "Blood cult", member: "a servant", members: "the servants", favours: ["dead", "blood", "undying"],
    word: () => "a death cult", bg: "Herd", sizes: HERD, ref: "Kindred of the East (mortal blood and death cults)",
    gives: dots => `Feeds like Herd ${dots} (breath or blood), and hides the court behind mortal faces.`},
  flock: {line: "hunter", label: "Flock", member: "one of the flock", members: "the flock", favours: ["salvation", "vengeance", "doom"],
    word: y => (n(y) < 1500 ? "a confraternity" : n(y) < 1999 ? "a society" : "a flock"), bg: "Contacts (as help)", sizes: CULT, ref: "house reading",
    gives: dots => `${dots} ${dots === 1 ? "die" : "dice"} to watch, ask and hide; the flock hears what the town hears.`},
  sect: {line: "mortal", label: "Sect", member: "a follower", members: "the followers", favours: ["salvation", "doom", "healing"],
    word: y => (n(y) < 1600 ? "a heresy" : n(y) < 1900 ? "a sect" : "a cult"), bg: "Influence (as help)", sizes: CULT, ref: "house reading",
    gives: dots => `${dots} ${dots === 1 ? "die" : "dice"} to sway the town where the followers live.`}
};
/** The kind of cult for a line: vampire, mummy, demon, changeling, wraith, mage, werewolf, kuei-jin, hunter, mortal. */
export function kindForLine(line, {wyrm = false} = {}) {
  if ( line === "werewolf" && wyrm ) return "wyrm";
  return Object.entries(CULT_KINDS).find(([, k]) => k.line === line && !k.npcOnly)?.[0] ?? "sect";
}

/** Background dots from members (0 to 5). Kinds counted by the inner circle use the ordained count. */
export function dotsFor(kind, members, ordained = 0) {
  const k = CULT_KINDS[kind] ?? CULT_KINDS.sect;
  const count = k.inner ? n(ordained) : n(members);
  let d = 0;
  for ( let i = 0; i < 5; i++ ) if ( count >= k.sizes[i] ) d = i + 1;
  return d;
}
/** The inner circle a cult can hold: one ordained for every ten members, at least one once there are three. */
export const innerRoom = members => (n(members) >= 3 ? Math.max(1, Math.floor(n(members) / 10)) : 0);

/** How big the place lets a cult grow, by the year (a medieval town is small) unless the place gives its people. */
export function capFor(year, population = 0) {
  if ( n(population) > 0 ) return Math.max(12, Math.round(n(population) * 0.05));
  const y = n(year);
  return y < 1500 ? 40 : y < 1850 ? 120 : y < 1950 ? 300 : 600;
}
export const sizeWord = m => (n(m) < 13 ? "a circle" : n(m) < 51 ? "a congregation" : n(m) < 201 ? "a movement" : "a church of its own");

/* ------------------------------------------------------------------ */
/*  The cult itself                                                    */
/* ------------------------------------------------------------------ */

export function normCult(c = {}) {
  const themes = {};
  for ( const [k, v] of Object.entries(c.themes ?? {}) ) if ( THEMES[k] && n(v) > 0 ) themes[k] = Math.round(n(v) * 10) / 10;
  const kind = CULT_KINDS[c.kind] ? c.kind : "sect";
  const members = Math.max(0, Math.round(n(c.members)));
  return {
    id: str(c.id, 40), name: str(c.name || "A following", 120), kind,
    founder: c.founder?.id ? {id: str(c.founder.id, 40), name: str(c.founder.name, 120), npc: !!c.founder.npc} : null,
    place: c.place?.key ? {key: str(c.place.key, 120), name: str(c.place.name, 120)} : null,
    region: str(c.region, 40), founded: n(c.founded), year: Math.round(n(c.year)),
    members, devotion: clamp(Math.round(n(c.devotion)), 0, MAX_DEVOTION), exposure: clamp(Math.round(n(c.exposure)), 0, MAX_EXPOSURE),
    secret: c.secret === undefined ? true : !!c.secret, themes,
    named: (Array.isArray(c.named) ? c.named : []).filter(m => m?.id).slice(0, 60).map(m => ({id: str(m.id, 40), name: str(m.name, 120), rank: m.rank === "ordained" ? "ordained" : "initiate"})),
    ordained: Math.max(0, Math.round(n(c.ordained))),
    attention: Math.max(0, n(c.attention)), quiet: Math.max(0, Math.round(n(c.quiet))), lastTurn: n(c.lastTurn), band: EXPOSURE_BANDS.some(b => b.key === c.band) ? c.band : "hidden",
    ended: c.ended ? {at: n(c.ended.at), why: str(c.ended.why, 200)} : null, parent: c.parent ? str(c.parent, 40) : null,
    faction: c.faction ? str(c.faction, 40) : null,
    log: (Array.isArray(c.log) ? c.log : []).slice(-40).map(e => ({at: n(e.at), text: str(e.text, 240)}))
  };
}

/** A new cult from a founder's awe in a place. */
export function newCult({id, founder, kind, place, awePlace, now = 0, year = 0, region = "", name = ""} = {}) {
  const k = CULT_KINDS[kind] ? kind : "sect";
  const p = normPlace(awePlace ?? {});
  const doctrine = doctrineOf(p.themes, k);
  const touched = Math.max(TOUCHED_AT, Math.min(p.touched, 12));
  return normCult({id, name: name || defaultName(k, founder?.name, doctrine, year), kind: k, founder, place, region, founded: now, year,
    members: touched, devotion: p.pts >= FORM_AT ? 2 : 1, exposure: 0, secret: true, themes: p.themes, lastTurn: now,
    log: [{at: now, text: `${CULT_KINDS[k].word(year)} gathers around ${founder?.name ?? "someone"} at ${place?.name ?? "this place"}. ${creedText(doctrine, founder?.name)}`}]});
}
export function defaultName(kind, founderName = "", doctrine = [], year = 0) {
  const k = CULT_KINDS[kind] ?? CULT_KINDS.sect;
  const who = String(founderName || "").split(/\s+/)[0] || "the Stranger";
  if ( kind === "netaru" ) return `The Netaru of ${who}`;
  return `${k.label} of ${who}`;
}

export const bandOf = exposure => [...EXPOSURE_BANDS].reverse().find(b => n(exposure) >= b.min) ?? EXPOSURE_BANDS[0];

/**
 * One weekly turn for a cult. ctx: {now, year, rand, population, founderGone, attention (awe the founder added in the
 * cult's place since the last turn), gathered (gatherings held)}. Returns {cult, events: [{kind, text, big}]}.
 * events kinds: grew, shrank, devotion, band (exposure crossed a band), split (a schism is proposed), ended.
 * Big events go to the approval queue; the rest are applied with a card.
 */
export function cultTurn(cult, {now = 0, year = 0, rand = Math.random, population = 0, founderGone = false, attention = 0, gathered = 0} = {}) {
  const c = normCult(cult);
  const events = [];
  if ( c.ended ) return {cult: c, events};
  const k = CULT_KINDS[c.kind];
  const care = n(attention) + n(gathered) * 2;
  // Devotion: tended faith rises; neglect wears it down (four quiet weeks a step); a founder gone wears it faster.
  let quiet = care > 0 ? 0 : c.quiet + 1;
  let devotion = c.devotion;
  if ( care >= 3 && devotion < MAX_DEVOTION ) { devotion += 1; events.push({kind: "devotion", text: `Their faith grows (devotion ${devotion}).`}); }
  else if ( (founderGone && quiet >= 2) || quiet >= 4 ) { devotion = Math.max(0, devotion - 1); quiet = 0; events.push({kind: "devotion", text: founderGone ? `With ${c.founder?.name ?? "the founder"} gone, their faith weakens (devotion ${devotion}).` : `Neglected, their faith weakens (devotion ${devotion}).`}); }
  // Growth: by devotion, and faster for Devils' pyramid of recruits (Demon) and for a tended cult; capped by the place.
  const cap = capFor(year, population);
  let members = c.members;
  const rate = 0.04 * devotion + (c.kind === "thralls" ? 0.04 : 0) + (care > 0 ? 0.03 : 0);
  if ( devotion >= 2 && members < cap ) {
    const add = Math.min(cap - members, Math.max(care > 0 ? 1 : 0, Math.floor(members * rate + rand())));
    if ( add > 0 ) { members += add; events.push({kind: "grew", text: `${add} more join (${members}).`}); }
  } else if ( devotion <= 1 && members > 0 ) {
    const lose = Math.max(1, Math.ceil(members * (devotion === 0 ? 0.25 : 0.1)));
    members = Math.max(0, members - lose); events.push({kind: "shrank", text: `${lose} drift away (${members}).`});
  }
  // Notice: an open cult or a big one draws eyes; a secret one less so; quiet devotion keeps it hidden.
  let exposure = c.exposure;
  const sizeStep = members >= 200 ? 3 : members >= 50 ? 2 : members >= 13 ? 1 : 0;
  const chance = (c.secret ? 0.15 : 0.45) + 0.1 * sizeStep;
  if ( rand() < chance ) exposure = Math.min(MAX_EXPOSURE, exposure + 1 + (c.secret ? 0 : Math.floor(sizeStep / 2)));
  else if ( exposure > 0 && c.secret && devotion >= 3 && rand() < 0.25 ) exposure -= 1;
  const band = bandOf(exposure);
  if ( band.key !== c.band && band.min > bandOf(c.exposure).min ) events.push({kind: "band", band: band.key, text: `Exposure: ${band.label.toLowerCase()} (${exposure}).`, big: band.key === "moved"});
  // Schism: a large cult whose faith has failed may split behind a rival voice.
  if ( devotion <= 1 && members >= 13 && rand() < 1 / 6 ) events.push({kind: "split", text: "A rival voice rises among them; half may follow it.", big: true});
  let ended = null;
  if ( members <= 0 ) { ended = {at: now, why: "No one is left"}; events.push({kind: "ended", text: "The last of them is gone.", big: false}); }
  const log = [...c.log, ...events.filter(e => e.text).map(e => ({at: now, text: e.text}))];
  const ordained = Math.min(c.ordained, innerRoom(members));
  return {cult: normCult({...c, members, devotion, exposure, band: band.key, quiet, attention: 0, lastTurn: now, ordained, ended, log}), events, dots: dotsFor(c.kind, members, ordained), cap, gives: k.gives};
}

/** Turns due since the last one, at most TURN_CAP; quiet: the weeks beyond the cap (a long skip). */
export function turnsDue(last, now) {
  if ( !n(last) || n(now) <= n(last) ) return {due: 0, quiet: 0};
  const weeks = Math.floor((n(now) - n(last)) / WEEK);
  return {due: Math.min(weeks, TURN_CAP), quiet: Math.max(0, weeks - TURN_CAP)};
}

/**
 * The quiet years of a long skip, in one step: a founder who lives on and is remembered keeps a cult (the undying
 * lines), others fade. Devotion falls one a year untended, members by a tenth a year at devotion 1 or less; a cult
 * whose founder is mortal and gone, and that nobody tends, ends after about a generation (25 years, house).
 */
export function quietYears(cult, weeks, {undying = false, founderGone = false, now = 0} = {}) {
  const c = normCult(cult);
  if ( c.ended || weeks <= 0 ) return c;
  const years = Math.floor(weeks / 52);
  if ( !years ) return c;
  const devotion = undying && !founderGone ? Math.max(1, c.devotion - Math.floor(years / 10)) : Math.max(0, c.devotion - years);
  let members = c.members;
  const fadeYears = Math.max(0, years - (c.devotion - devotion === 0 ? 0 : c.devotion - 1));
  if ( devotion <= 1 ) members = Math.round(members * Math.pow(0.9, fadeYears));
  const gone = (founderGone && !undying && years >= 25) || members <= 0;
  return normCult({...c, devotion, members: Math.max(0, members), ended: gone ? {at: now, why: `Faded over ${years} years`} : null,
    log: [...c.log, {at: now, text: gone ? `Over ${years} quiet years the following faded away.` : `${years} years pass: devotion ${devotion}, ${members} remain.`}]});
}

/** Split a cult in two (an approved schism): the rival takes half, a named voice or none; the old cult loses heart. */
export function split(cult, {id, now = 0, rivalName = ""} = {}) {
  const c = normCult(cult);
  const half = Math.floor(c.members / 2);
  const rival = normCult({...c, id, name: rivalName || `${c.name}, the breakaway`, founder: null, members: half, devotion: 2, exposure: Math.max(0, c.exposure - 2),
    named: [], ordained: 0, parent: c.id, founded: now, lastTurn: now, log: [{at: now, text: `Broke away from ${c.name}.`}]});
  const rest = normCult({...c, members: c.members - half, devotion: Math.max(0, c.devotion - 1), log: [...c.log, {at: now, text: `${half} left for ${rival.name}.`}]});
  return {rest, rival};
}
/** An approved raid: members scatter, faith shaken, the eyes stay a while. */
export function raided(cult, {now = 0, lost = 0.5} = {}) {
  const c = normCult(cult);
  const gone = Math.ceil(c.members * lost);
  return normCult({...c, members: c.members - gone, devotion: Math.max(0, c.devotion - 1), exposure: 5, band: "talk",
    ordained: Math.min(c.ordained, innerRoom(c.members - gone)), log: [...c.log, {at: now, text: `Raided: ${gone} taken, scattered or dead.`}]});
}

/** Raise a named member to the inner circle (ordination) or make them an initiate. Returns the cult, or null if no room. */
export function ordain(cult, member, rank = "ordained") {
  const c = normCult(cult);
  if ( !member?.id ) return null;
  const named = c.named.filter(m => m.id !== member.id);
  if ( rank === "ordained" ) {
    const ord = named.filter(m => m.rank === "ordained").length;
    if ( ord + 1 > Math.max(innerRoom(c.members), c.ordained) && ord + 1 > innerRoom(c.members) ) return null;
  }
  named.push({id: member.id, name: member.name ?? "", rank: rank === "ordained" ? "ordained" : "initiate"});
  const ordained = Math.max(c.ordained, named.filter(m => m.rank === "ordained").length);
  return normCult({...c, named, ordained});
}

/**
 * NPC founders (B3245): which NPCs gather cults by themselves. Read from what the NPC is (its type and its clan,
 * tribe, Tradition, house or kith, as text). The list follows the books' own cult-makers; the chance is house.
 */
export const NPC_CULTISH = [
  {re: /setite|follower(s)? of set|ministry/i, kind: "blood", why: "Setites raise cults wherever they settle"},
  {re: /malkavian/i, kind: "blood", why: "a Malkavian's visions draw the lost"},
  {re: /baali/i, kind: "blood", why: "the Baali hide in cults"},
  {re: /tzimisce|koldun/i, kind: "blood", why: "the Fiends keep their serfs as a faith", before: 1500},
  {re: /devil|namaru|defiler|lammasu|fiend|malefactor|scourge|slayer|demon/i, kind: "thralls", why: "the fallen hunger for worship"},
  {re: /ecstasy|ecstatic|sahajiya|chorus|celestial chorus|nephand/i, kind: "cult", why: "a mage who gathers believers"},
  {re: /black spiral|fomor|pentex|wyrm/i, kind: "wyrm", why: "the Wyrm's servants breed cults"},
  {re: /mummy|amenti|reborn|shemsu|undying/i, kind: "netaru", why: "the Reborn are served by the Netaru"},
  {re: /kuei-?jin|cathayan|akuma/i, kind: "kuei", why: "a Cathayan court hides behind blood cults"},
  {re: /preacher|prophet|heretic|friar|hermit|flagellant|mystic|cult leader|evangelist|medium|spiritualist/i, kind: "sect", why: "a mortal who preaches"}
];
export function npcCultKind(text = "", year = 0) {
  for ( const r of NPC_CULTISH ) if ( r.re.test(String(text)) && (!r.before || n(year) < r.before) ) return r;
  return null;
}
/** A month's chance that a cultish NPC with a home place and no cult of its own gathers one (house: 1 in 10). */
export const NPC_FOUND_CHANCE = 0.1;

/** Short status for windows and cards. */
export function summary(cult, year = 0) {
  const c = normCult(cult);
  const k = CULT_KINDS[c.kind];
  const dots = dotsFor(c.kind, c.members, c.ordained);
  return {name: c.name, kind: k.label, word: k.word(year), size: sizeWord(c.members), members: c.members, devotion: c.devotion,
    exposure: c.exposure, band: bandOf(c.exposure).label, dots, bg: k.bg, gives: dots ? k.gives(dots) : "Too few yet to give anything.",
    doctrine: doctrineOf(c.themes, c.kind).map(t => THEMES[t].label), creed: creedText(doctrineOf(c.themes, c.kind), c.founder?.name), ref: k.ref,
    inner: c.named.filter(m => m.rank === "ordained").map(m => m.name), initiates: c.named.filter(m => m.rank === "initiate").map(m => m.name), room: innerRoom(c.members)};
}
