/**
 * WoDX Chronicle 0.25.0: the pure rules of signature features (Splat Features Desk). No Foundry calls, so the harness
 * can test them. The table is data/signatures.mjs; the Foundry side is signatures.mjs.
 *
 * Records (all plain objects kept in flags):
 *   muse {id, name, kind (person|work|place), uuid, obsession 0..5, since, seen (world time), owned}
 *   corruption {by (actor id), byName, vice, step 0..5, log: [{at, delta, why}]}
 *   cause {key, label, custom, approved, rant 0..3}
 *   mark {key, at, until}
 *   soil {where, restedAt, short (nights in a row without it)}
 *   ravnos {vice, fedAt, arrivedAt, askedAt}
 *   odd {year (last year checked), gifts: [key]}
 */
import {mediaFor} from "./media-rules.mjs";
import {SMALL_LINES, GUILDS, LEGIONS, WRAITH_FACTIONS, LUCK_DAYS, KITHS, SEEMINGS, COURTS, FAE_HOUSES, UNSEELIE_MONTHS, MAGE, HOUSES, RECORDS, TRIBES, AUSPICES, BREEDS, FERA, DEFORMITIES, KINFOLK, COURTS_TEXT, WYRM_WORDS, LUNAR_MONTH, BLOODLINES, VAMPIRE, CAUSES, VICES, CORRUPTION_STEPS, MARKS, DAY, WEEK, MARK_LASTS, RANT_POINTS, OBSESSION_MAX, CORRUPTION_MAX, DERANGEMENTS, GLIMPSE_THEMES,
  RAVNOS_VICES, CAMERAS, CAMERAS_EVERYWHERE, ODD_GIFTS, ODD_GIFT_CHANCE, TREMERE_RANKS, INSTITUTIONS, SECRET_FRESH, STANDING_MAX, TITHE, GHOUL, FAMILY_TRAITS, REVENANT_FAMILIES} from "../data/signatures.mjs";

export {SMALL_LINES, GUILDS, LEGIONS, WRAITH_FACTIONS, LUCK_DAYS, KITHS, SEEMINGS, COURTS, FAE_HOUSES, UNSEELIE_MONTHS, MAGE, HOUSES, RECORDS, TRIBES, AUSPICES, BREEDS, FERA, DEFORMITIES, KINFOLK, COURTS_TEXT, WYRM_WORDS, LUNAR_MONTH, BLOODLINES, VAMPIRE, CAUSES, VICES, CORRUPTION_STEPS, MARKS, DAY, WEEK, MARK_LASTS, RANT_POINTS, OBSESSION_MAX, CORRUPTION_MAX, DERANGEMENTS, GLIMPSE_THEMES,
  RAVNOS_VICES, CAMERAS, CAMERAS_EVERYWHERE, ODD_GIFTS, ODD_GIFT_CHANCE, TREMERE_RANKS, INSTITUTIONS, SECRET_FRESH, STANDING_MAX, TITHE, GHOUL, FAMILY_TRAITS, REVENANT_FAMILIES};

const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const words = s => String(s ?? "").toLowerCase().replace(/^wod\.bio\.[a-z]+\./, "").replace(/[_-]+/g, " ").replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);

/** The signature row for a clan or bloodline name, or null. Whole words only, so "Settler" is not a Setite. */
export function vampireRow(...names) { return rowIn(VAMPIRE, ...names); }
/** The first row of a table whose match words name one of the names (whole words). */
export function rowIn(table, ...names) {
  for ( const name of names.flat() ) {
    const w = words(name), text = ` ${w.join(" ")} `;
    if ( !w.length ) continue;
    for ( const row of table ) if ( row.match.some(m => text.includes(` ${m} `)) ) return row;
  }
  return null;
}

/* ---------------- Toreador: Muse and Obsession ---------------- */

export const MUSE_KINDS = {person: "a person", work: "a work of art", place: "a place"};

/** A new Muse record. */
export function newMuse({id, name, kind = "person", uuid = null, now = 0} = {}) {
  return {id: id || `muse-${Math.floor(n(now))}`, name: String(name ?? "a Muse"), kind: MUSE_KINDS[kind] ? kind : "person", uuid, obsession: 0, since: n(now), seen: n(now), owned: false};
}

/**
 * Bring a Muse up to date: one point of Obsession for each full week since it was last seen (V20 weakness stretched over
 * time, house rule). Returns {muse, rose}.
 */
export function museTick(muse, now) {
  if ( !muse ) return {muse, rose: 0};
  const weeks = Math.floor((n(now) - n(muse.seen)) / WEEK);
  const counted = Math.floor((n(muse.counted ?? muse.seen) - n(muse.seen)) / WEEK);
  const rose = Math.max(0, Math.min(OBSESSION_MAX - n(muse.obsession), weeks - counted));
  if ( weeks <= counted ) return {muse, rose: 0};
  return {muse: {...muse, obsession: clamp(n(muse.obsession) + rose, 0, OBSESSION_MAX), counted: n(muse.seen) + weeks * WEEK}, rose};
}

/** Seeing the Muse (how: "see" -1, "own" or "made" -2). */
export function museSeen(muse, now, how = "see") {
  const drop = how === "own" || how === "made" ? 2 : 1;
  return {...muse, obsession: clamp(n(muse.obsession) - drop, 0, OBSESSION_MAX), seen: n(now), counted: n(now), owned: muse.owned || how === "own"};
}

/** Harm to a Muse who is a person: +2 at once and a frenzy check. */
export function museHarmed(muse) {
  return {muse: {...muse, obsession: clamp(n(muse.obsession) + 2, 0, OBSESSION_MAX)}, frenzy: muse.kind === "person"};
}

/** The extra difficulty on the Toreador's Self-Control roll against beauty: the highest Obsession among their Muses. */
export function beautyPenalty(muses = []) {
  return muses.reduce((m, x) => Math.max(m, n(x?.obsession)), 0);
}

/* ---------------- Followers of Set: the Corruption ledger ---------------- */

/** Social acts that work on a victim, and how far a win moves the track. */
export const CORRUPTING_ACTS = {charm: 1, persuade: 1, con: 1, fasttalk: 1, bribe: 1};

export const viceByKey = key => VICES.find(v => v.key === key) ?? null;

/** Does a good (its name, category or substance) feed this vice? */
export function feedsVice(vice, good = {}) {
  const v = viceByKey(vice);
  if ( !v ) return false;
  const hay = [good.category, good.substance, good.kind, good.name].flat().filter(Boolean).map(x => String(x).toLowerCase()).join(" ");
  return v.feeds.some(f => hay.includes(f));
}

export function newCorruption({by, byName = "", vice = "", now = 0} = {}) {
  return {by: String(by ?? ""), byName: String(byName ?? ""), vice: viceByKey(vice) ? vice : "", step: 0, since: n(now), log: []};
}

/** Move a track by delta, with a reason. Keeps the last 20 log lines. */
export function corrupt(rec, delta, why = "", now = 0) {
  const before = n(rec?.step);
  const step = clamp(before + n(delta), 0, CORRUPTION_MAX);
  const log = [...(rec?.log ?? []), {at: n(now), delta: step - before, why: String(why)}].slice(-20);
  return {rec: {...rec, step, log}, before, after: step, crossed: crossed(before, step)};
}

/** The thresholds a move crossed upward (3 and 5 matter in play). */
export function crossed(before, after) {
  return [3, 5].filter(t => before < t && after >= t);
}

/** The step a social act moves the track: wins push it, a botch pushes it back, a tie or loss does nothing. */
export function stepFromSocial(act, result) {
  const base = CORRUPTING_ACTS[act];
  if ( !base ) return 0;
  if ( result === "win" ) return base;
  if ( result === "botch" ) return -1;
  return 0;
}

/** The step a trade moves the track: a gift (mode give, or nothing asked back) of a good that feeds the vice. */
export function stepFromTrade(rec, {mode, give, want} = {}) {
  if ( !rec?.vice || !give ) return 0;
  const gift = mode === "give" || mode === "gift" || !want;
  return gift && feedsVice(rec.vice, typeof give === "string" ? {name: give} : give) ? 1 : 0;
}

/** Extra difficulty on the victim's own Self-Control or Willpower rolls against the vice. */
export const resistPenalty = rec => n(rec?.step);
export const stepText = s => CORRUPTION_STEPS[clamp(n(s), 0, CORRUPTION_MAX)];

/* ---------------- Brujah: the Cause ---------------- */

/** The causes open in a year (a cause with from: later than the year is not yet thought of). */
export const causesAt = year => CAUSES.filter(c => !c.from || n(year) >= c.from);

export function newCause({key = "", custom = "", year = 1197} = {}) {
  const c = causesAt(year).find(x => x.key === key);
  if ( c ) return {key: c.key, label: c.label, custom: false, approved: true, rant: 0};
  const text = String(custom ?? "").trim();
  return text ? {key: "custom", label: text, custom: true, approved: false, rant: 0} : null;
}

/** A temper roll kept against the Cause: one Rant point; at RANT_POINTS the Rant is ready. */
export function causeKept(cause) {
  const rant = clamp(n(cause?.rant) + 1, 0, RANT_POINTS);
  return {cause: {...cause, rant}, ready: rant >= RANT_POINTS};
}
export const rantSpent = cause => ({...cause, rant: 0});

/** The Brujah temper roll: the frenzy difficulty with the clan's +2 (V20 pdf 59). */
export const temperDifficulty = (base = 6) => clamp(n(base) + 2, 3, 10);

/* ---------------- Gangrel: Marks of the Beast ---------------- */

export const markByKey = key => MARKS.find(m => m.key === key) ?? null;

/** A random mark not already held (rand: () => 0..1). */
export function pickMark(held = [], rand = Math.random) {
  const have = new Set(held.map(m => m.key));
  const open = MARKS.filter(m => !have.has(m.key));
  const pool = open.length ? open : MARKS;
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

export function newMark(key, now) {
  return markByKey(key) ? {key, at: n(now), until: n(now) + MARK_LASTS} : null;
}

/** Marks still showing at a time; the others have healed (house rule, Ben 2026-11-12). */
export const activeMarks = (list = [], now = 0) => list.filter(m => markByKey(m.key) && n(m.until) > n(now));

/** The roll effects the showing marks give, in the trait effect shape {tags, dice, why}. */
export function markEffects(list = [], now = 0) {
  return activeMarks(list, now).flatMap(m => markByKey(m.key).effects.map(e => ({...e, why: markByKey(m.key).label})));
}

/** Healing a mark early: as an aggravated wound, five blood points (house reading of V20 healing) or a month. */
export const HEAL_EARLY_BLOOD = 5;

/** Do any showing marks break the Masquerade to a mortal eye? */
export const marksShow = (list = [], now = 0) => activeMarks(list, now).some(m => markByKey(m.key).sign || markByKey(m.key).key === "claws");

/* ---------------- Malkavian: glimpses and the derangement's ear ---------------- */

/** A small stable hash, so the same question on the same night gets the same line. */
export function seedOf(...parts) {
  let h = 2166136261;
  for ( const ch of parts.join("|") ) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (m, k) => vals[k] ?? "");
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/** The derangements a sheet's derangement text names (V20 sheet field system.derangement). */
export function derangementsOf(text) {
  const t = String(text ?? "").toLowerCase();
  return DERANGEMENTS.filter(d => d.match.some(m => t.includes(m))).map(d => d.key);
}

/**
 * What a deranged character hears beyond an NPC's true reply: one line, picked by seed from every derangement they
 * hold, or null. {name, topic}: who spoke and what about.
 */
export function hearLine(keys = [], {name = "they", topic = "it", seed = 0} = {}) {
  const pool = keys.flatMap(k => DERANGEMENTS.find(d => d.key === k)?.lines ?? []);
  if ( !pool.length ) return null;
  const line = pool[seed % pool.length];
  return cap(fill(line, {name, topic: String(topic).toLowerCase()}));
}

/** Roughly how far off an event is, in words. */
export function whenWords(days) {
  const d = n(days);
  if ( d <= 7 ) return "within the week";
  if ( d <= 31 ) return "before the moon is old";
  if ( d <= 120 ) return "before the season turns";
  if ( d <= 400 ) return "within the year";
  if ( d <= 3650 ) return "in a handful of years";
  return "long after tonight";
}

/** A riddle for an event ({name, summary}) days away. The event's own words are never shown. */
export function glimpseFor(ev, days, seed = 0) {
  if ( !ev ) return null;
  const hay = `${ev.name ?? ""} ${ev.summary ?? ""}`;
  const theme = GLIMPSE_THEMES.find(t => t.match.test(hay)) ?? GLIMPSE_THEMES.at(-1);
  return {theme: theme.key, text: cap(fill(theme.lines[seed % theme.lines.length], {when: whenWords(days)}))};
}

/** One glimpse a night: true if the last one was taken on an earlier night (night = whole days of world time, at noon). */
export const mayGlimpse = (last, now) => last == null || Math.floor((n(now) - 43200) / 86400) > Math.floor((n(last) - 43200) / 86400);

/* ---------------- Tzimisce: native soil ---------------- */

const night = t => Math.floor((n(t) - 43200) / DAY);
/** Is an item native soil? Its flag, or a name that says so. */
export const isSoil = item => !!item && (item.soil === true || /\b(native|grave|home)?\s*(soil|earth)\b/i.test(String(item.name ?? "")));

/**
 * The night's rest: carrying soil counts as resting on it. Returns {soil, halved, changed}; halved: dice pools are halved
 * tonight (V20 pdf 447), until a rest on the soil.
 */
export function soilNight(soil = {}, now, carrying, grace = 0) {
  const s = {where: "", restedAt: null, short: 0, checked: null, ...soil};
  const tonight = night(now);
  if ( s.checked != null && night(s.checked) >= tonight ) return {soil: s, halved: s.short > n(grace), changed: false};
  if ( carrying ) return {soil: {...s, restedAt: n(now), short: 0, checked: n(now)}, halved: false, changed: s.short > 0 || s.checked == null};
  return {soil: {...s, short: s.short + 1, checked: n(now)}, halved: s.short + 1 > n(grace), changed: true};
}

/* ---------------- Lasombra: cameras ---------------- */

/** The camera of a year, or null before 1839. */
export const cameraAt = year => [...CAMERAS].reverse().find(c => n(year) >= c.from) ?? null;
/** Is a scene watched? mark: the scene's own setting (true, false or unset). */
export function watched(year, mark) {
  if ( !cameraAt(year) ) return false;
  if ( mark === true || mark === false ) return mark;
  return n(year) >= CAMERAS_EVERYWHERE;
}

/* ---------------- Ravnos: the vice that calls ---------------- */

export const ravnosVice = key => RAVNOS_VICES.find(v => v.key === key) ?? null;
/** Does an act (a social act key or a trade mode) feed the vice? */
export const feedsRavnos = (vice, act) => !!ravnosVice(vice)?.acts.includes(act);

/**
 * The Self-Control difficulty to resist (house reading of V20: base 6, +1 a week unfed, up to +2, and +1 after a month
 * in one domain; never above 9).
 */
export function ravnosDifficulty(r = {}, now = 0) {
  const unfed = Math.min(2, Math.floor((n(now) - n(r.fedAt ?? now)) / WEEK));
  const stay = n(now) - n(r.arrivedAt ?? now) >= 30 * DAY ? 1 : 0;
  return clamp(6 + Math.max(0, unfed) + stay, 6, 9);
}
/** One prompt a night at most. */
export const mayAskRavnos = (r = {}, now = 0) => r.askedAt == null || night(r.askedAt) < night(now);

/* ---------------- Caitiff: odd gifts ---------------- */

/** The yearly roll: rand 0..1 under the chance gives a gift not yet held, or null. Once a year. */
export function oddGift(odd = {}, year, rand = Math.random) {
  if ( n(odd.year) >= n(year) ) return {odd, gift: null, checked: false};
  const next = {gifts: [], ...odd, year: n(year)};
  const open = ODD_GIFTS.filter(g => !(next.gifts ?? []).includes(g.key));
  if ( !open.length || rand() >= ODD_GIFT_CHANCE ) return {odd: next, gift: null, checked: true};
  const gift = open[Math.floor(rand() * open.length) % open.length];
  return {odd: next, gift, checked: true};
}
/** Does an actor's trait list name the Thin Blood flaw? */
export const thinBlooded = names => names.some(x => /thin[- ]?blood/i.test(String(x)));

/* ---------------- Nosferatu: secrets ---------------- */

/** Days a secret learned in a year stays fresh. */
export const freshDays = (year, future = false) => SECRET_FRESH[mediaFor(year, {future}).id] ?? 60;
/** Is a secret still fresh? at: when it was learned. */
export const secretFresh = (at, now, year, future = false) => n(now) - n(at) < freshDays(year, future) * DAY;
/** The boon a secret buys: minor while fresh, trivial once stale. */
export const secretPrice = (at, now, year, future = false) => secretFresh(at, now, year, future) ? "minor" : "trivial";
export const isSecretPage = name => /^a page of secrets\b/i.test(String(name ?? ""));

/* ---------------- Tremere: the Pyramid ---------------- */

export const rankLabel = r => TREMERE_RANKS[clamp(n(r), 0, TREMERE_RANKS.length - 1)];
/** May one rank give an order to another? Only from above. */
export const mayOrder = (from, to) => n(from) > n(to);
/** Willpower to refuse an order (house reading: 1, 2 when it comes from three or more ranks above). */
export const refuseCost = (from, to) => n(from) - n(to) >= 3 ? 2 : 1;

/* ---------------- Ventrue: domain to influence ---------------- */

export const institutionsAt = year => INSTITUTIONS.filter(i => n(year) >= i.from).map(i => i.label);
/** Once a month: month keys are year * 12 + month. */
export const mayInfluence = (lastKey, key) => lastKey == null || n(key) > n(lastKey);

/* ---------------- Assamite: contracts ---------------- */

export function newContract({id, target = "", price = 0, days = 30, now = 0} = {}) {
  return {id: id || `c-${Math.floor(n(now))}`, target: String(target), price: Math.max(0, n(price)), at: n(now), due: n(now) + Math.max(1, n(days)) * DAY, status: "open"};
}
/** Settle a contract: done raises standing by one and pays the tithe; failed or overdue lowers it. */
export function settleContract(c, standing, done) {
  const st = clamp(n(standing ?? 1) + (done ? 1 : -1), 0, STANDING_MAX);
  return {contract: {...c, status: done ? "done" : "failed"}, standing: st, tithe: done ? Math.round(n(c.price) * TITHE * 100) / 100 : 0};
}
export const overdue = (list = [], now = 0) => list.filter(c => c.status === "open" && n(c.due) <= n(now));

/* ---------------- Giovanni: the bound dead ---------------- */

export const newServant = ({id, name = "a wraith", fetter = "", now = 0} = {}) => ({id: id || `w-${Math.floor(n(now))}`, name: String(name), fetter: String(fetter), at: n(now)});
/** The line's name in a year: Cappadocian before 1444 (house reading of the date). */
export const giovanniName = year => n(year) < 1444 ? "Cappadocian" : "Giovanni";

/* ---------------- Ghouls and revenant families ---------------- */

/** A family as a feature row: the ghoul engine, the family trait's effects and borrowed engine. */
export function familyAsRow(f) {
  const t = FAMILY_TRAITS[f.trait] ?? FAMILY_TRAITS.craft;
  return {key: `family-${f.key}`, label: `${f.label} (revenant family)`, feature: "ghoul", also: [...(t.also ?? [])], effects: t.effects,
    title: `The ${f.label} family`, page: f.page ?? "Guide to the Sabbat pdf 219; V20 Dark Ages pdf 454",
    text: `${f.text ?? ""} Family trait: ${t.label.toLowerCase()}.${f.disciplines?.length ? ` Family Disciplines: ${f.disciplines.join(", ")}.` : ""}${f.flaw ? ` Family flaw: ${f.flaw}.` : ""} Revenants are born ghouls and need no domitor's drink to stay as they are.`.trim(), revenant: true};
}
/** The family a ghoul's names point at (the books' families first, then those founded in play), or null. */
export function familyRow(names = [], founded = []) {
  const all = [...REVENANT_FAMILIES, ...founded.filter(f => f.approved !== false)];
  for ( const name of names.flat() ) {
    const t = ` ${words(name).join(" ")} `;
    const f = all.find(x => t.includes(` ${words(x.label).join(" ")} `));
    if ( f ) return familyAsRow(f);
  }
  return null;
}
/** A family founded in play (Ben's answer on the desk): a founder, one trait, two or three Disciplines, a flaw, a year. */
export function newFamily({name = "", founder = "", trait = "craft", disciplines = [], flaw = "", year = 1197, text = ""} = {}) {
  const label = String(name).trim();
  if ( !label || !FAMILY_TRAITS[trait] ) return null;
  const ds = (Array.isArray(disciplines) ? disciplines : String(disciplines).split(",")).map(x => String(x).trim()).filter(Boolean).slice(0, 3);
  return {key: words(label).join("-"), label, founder: String(founder), trait, disciplines: ds, flaw: String(flaw), founded: n(year), text: String(text), approved: false};
}
/** Whole months a ghoul has gone without vitae (30-day months). */
export const monthsUnfed = (fedAt, now) => Math.max(0, Math.floor((n(now) - n(fedAt ?? now)) / (30 * DAY)));

/* ---------------- Werewolf (Chronicle 0.31.0) ---------------- */

/** A shapechanger's rows, stacked: tribe, auspice and breed for a Garou; the breed's own row first for the other Fera. */
export function garouRows({tribe = "", auspice = "", breed = "", fera = ""} = {}) {
  const f = fera && !/^garou$/i.test(String(fera)) ? rowIn(FERA, fera) : null;
  const out = f ? [f, rowIn(BREEDS, breed)] : [rowIn(TRIBES, tribe), rowIn(AUSPICES, auspice), rowIn(BREEDS, breed)];
  if ( f?.courts && !f.text.includes(COURTS_TEXT) ) out[0] = {...f, text: `${f.text} ${COURTS_TEXT}`};
  return out.filter(Boolean);
}
/** Is the tribe or breed gone by this year (a lost tribe after its end, a lost Fera always)? */
export const goneBy = (row, year) => row?.until != null && n(year) > n(row.until);
/** Does a name or kind mark a creature of the Wyrm? */
export const isWyrm = (...names) => names.flat().some(x => { const w = words(x); return w.some(t => WYRM_WORDS.includes(t)) || !!rowIn(TRIBES, x)?.wyrm; });
/** The initiative that puts someone ahead of everyone else in the fight. */
export const firstInit = (inits = []) => Math.max(0, ...inits.map(n)) + 1;
/** The Stargazer's reading: once a lunar month, under a sky without cloud or rain. */
export const mayReadSky = (last, now) => last == null || n(now) - n(last) >= LUNAR_MONTH * DAY;
export const skyClear = wx => !wx || (!["overcast", "storm"].includes(wx.sky) && (!wx.precip || wx.precip === "none") && wx.fog !== "thick");
/** A metis deformity's effects. */
export const deformityByKey = key => DEFORMITIES.find(d => d.key === key) ?? null;

/** Signature effects in the trait-effect shape for one roll: {key, name, dice, diff}. "all" fits every roll; halving is a note only. */
const tagKey = t => String(t ?? "").toLowerCase().replace(/[^a-z]/g, "");
const ALIAS = {resistfrenzy: {ch: "roll", tags: ["frenzy"]}, resistdominate: {ch: "resist", tags: ["mind"]}, deceit: {ch: "roll", tags: ["subterfuge", "con", "fasttalk"]}};
export function sigRollEffects(list = [], ctx = {}) {
  const want = new Set((ctx.tags ?? []).map(tagKey)), ch = ctx.channel ?? "roll", out = [];
  for ( const e of list ) {
    if ( e.halve ) continue;
    // "monster": only against a target that is not mortal (the roll's other side, when Actions knows it)
    if ( e.when === "monster" && !(ctx.against && !/mortal|human|kinfolk|ghoul/.test(String(ctx.against))) ) continue;
    let hit = false;
    for ( const t of e.tags ?? [] ) {
      const a = ALIAS[tagKey(t)], tc = a?.ch ?? "roll", tt = (a?.tags ?? [t]).map(tagKey);
      if ( tc === ch && (tt.includes("all") || tt.some(x => want.has(x))) ) hit = true;
    }
    if ( hit ) out.push({key: "signature", name: e.why ?? "Signature", dice: n(e.dice), diff: n(e.difficulty), note: ""});
  }
  return out;
}

/* ---------------- Mage (Chronicle 0.33.0) ---------------- */

/** A mage's rows: the Tradition, Craft or Convention, then a Hermetic House when one is named. */
export const mageRows = ({sect = [], house = []} = {}) => [rowIn(MAGE, sect), rowIn(HOUSES, house)].filter(Boolean);
/** The name a group goes by in a year (the Dark Ages fellowships, the Order of Reason's conventions). */
export const nameAt = (row, year) => (row?.names ?? []).find(x => n(year) <= n(x.until))?.label ?? row?.label ?? "";
/** Is the group not founded yet in this year? */
export const notYet = (row, year) => row?.from != null && n(year) < n(row.from);
/** What records the Watchers read in a year. */
export const recordsAt = year => [...RECORDS].reverse().find(r => n(year) >= r.from)?.label ?? RECORDS[0].label;
/** A once-a-day Willpower point (the Akashic dawn): a day is counted from dawn, 06:00. */
export const mayMeditate = (last, now) => last == null || Math.floor((n(now) - 21600) / DAY) > Math.floor((n(last) - 21600) / DAY);
/** Willpower plus or minus one, kept between 0 and the permanent rating. */
export const willpowerStep = (wp = {}, d = 1) => clamp(n(wp.temporary) + d, 0, Math.max(0, n(wp.permanent) || 10));

/* ---------------- Changeling (Chronicle 0.34.0) ---------------- */

/** A changeling's rows, stacked: kith, seeming, court and a sidhe House. */
export const faeRows = ({kith = [], seeming = [], court = [], house = []} = {}) =>
  [rowIn(KITHS, kith), rowIn(SEEMINGS, seeming), rowIn(COURTS, court), rowIn(FAE_HOUSES, house)].filter(Boolean);
/** Which court holds power in a month (1 to 12). */
export const courtInPower = month => UNSEELIE_MONTHS.includes(n(month)) ? "unseelie" : "seelie";
/** Glamour from a revel: one for each changeling there, one more for a Satyr. */
export const revelGlamour = (row, glamour = {}) => clamp(n(glamour.temporary) + (row?.key === "satyr" ? 2 : 1), 0, Math.max(n(glamour.permanent) || 10, 10));
export const isCoat = item => !!item && (item.coat === true || /\bseal\s*(skin|coat)\b/i.test(String(item.name ?? "")));

/* ---------------- Wraith (Chronicle 0.35.0) ---------------- */

/** A wraith's rows from the picks kept on the actor: guild, legion and faction. */
export const wraithRows = ({guild = "", legion = "", faction = ""} = {}) =>
  [rowIn(GUILDS, guild), rowIn(LEGIONS, legion), rowIn(WRAITH_FACTIONS, faction)].filter(Boolean);
/** The legion the manner of death points to (the sheet's death field), or null. */
export function legionFor(death = "") {
  const text = ` ${words(death).join(" ")} `;
  if ( text.trim() === "" ) return null;
  return LEGIONS.find(l => l.death.some(w => text.includes(` ${w} `))) ?? null;
}
export const mayLuck = (last, now) => last == null || n(now) - n(last) >= LUCK_DAYS * DAY;

/* ---------------- Hunter, Mummy, Demon, Kuei-jin, Orpheus (Chronicle 0.36.0) ---------------- */

/** A small line's rows: each name (field or pick) finds its own row, so a Demon's House and faction stack. */
export function smallRows(line, names = []) {
  const t = SMALL_LINES[line]?.table ?? [];
  const out = [];
  for ( const nm of names.flat() ) { const r = rowIn(t, nm); if ( r && !out.includes(r) ) out.push(r); }
  return out;
}
