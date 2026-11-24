/**
 * What belongs to one chronicle's own place (Chronicle Packs Desk d1, B7610-B7616). Pure, so the harness can test it.
 *
 * Shared systems hold no town of their own. A chronicle pack can name what is local to its people in
 * manifest.local, and the shared systems read it through these helpers. Every field is optional; a chronicle with no
 * local block changes nothing.
 *
 *   feasts     [{month, day, name, custom, revel}]  the town's own holy days. custom: a local custom kept on the day
 *              (named on the Clock, no day off work); revel: a night of revel (busy streets, the late curfew).
 *              They are kept where the chronicle's homeland keeps its year (WoDX Chronicle church.mjs).
 *   titles     [{kind, rank, title, from, to}]  a seat of a town institution called by another name in the
 *              chronicle's town (manifest.town): kind is a WoDX Storyteller institution kind, rank 0 (lowest) to 4
 *              (the top seat), from and to the years it holds (either may be left out).
 *   languages  [{name, closedIn, intent, sounds}]  tongues of the chronicle. closedIn: the book keys during which no
 *              one can learn it (a player cannot list it; the Storyteller still can); intent: a hearer who lacks it
 *              gets the sense without a roll; sounds: syllables for its words in chat.
 *   caerns     [{key, name, scene, level, type, totem, sept, tribes}]  caerns to put on WoDX Storyteller's register of
 *              places of power, once, when a scene whose name matches scene (a pattern) is in the world.
 *   hunters    {stage, region}  the stage the hunters of the region (else the homeland) start at in a new world
 *              (WoDX Storyteller hunters-rules STAGES key).
 *   taints     [{clock, scene, per, max}]  a place whose Wyrm corruption follows one of the saga's long clocks (B7807):
 *              each segment of the clock adds per levels (default 1) to the place whose scene name matches scene (a
 *              pattern), up to max (default 9, so a clock alone never makes a Hellhole). WoDX Otherworlds applies it.
 */

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v, n = 120) => String(v ?? "").trim().slice(0, n);
const list = v => (Array.isArray(v) ? v : []);
const year = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Math.trunc(Number(v)));
const slug = s => str(s, 60).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const norm = s => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const EMPTY = Object.freeze({feasts: [], titles: [], languages: [], caerns: [], hunters: null, taints: []});

/** A chronicle pack's local block, cleaned: bad rows are dropped, never thrown on. */
export function localOf(pack) {
  const l = pack?.manifest?.local;
  if ( !l || typeof l !== "object" ) return EMPTY;
  const feasts = list(l.feasts).map(f => ({month: Math.trunc(num(f?.month)), day: Math.trunc(num(f?.day)), name: str(f?.name), custom: !!f?.custom, revel: !!f?.revel}))
    .filter(f => f.name && f.month >= 1 && f.month <= 12 && f.day >= 1 && f.day <= 31);
  const titles = list(l.titles).map(t => ({kind: str(t?.kind, 40), rank: Math.trunc(num(t?.rank)), title: str(t?.title), from: year(t?.from), to: year(t?.to)}))
    .filter(t => t.kind && t.title && t.rank >= 0 && t.rank <= 4);
  const languages = list(l.languages).map(x => ({name: str(x?.name, 80), closedIn: list(x?.closedIn).map(k => str(k, 60)).filter(Boolean), intent: !!x?.intent,
    sounds: list(x?.sounds).map(s => str(s, 8)).filter(Boolean).slice(0, 30)})).filter(x => x.name);
  const caerns = list(l.caerns).map(c => ({key: slug(c?.key || c?.name), name: str(c?.name), scene: str(c?.scene, 200), level: Math.max(1, Math.min(5, Math.trunc(num(c?.level)) || 1)),
    type: str(c?.type, 40), totem: str(c?.totem, 80), sept: str(c?.sept, 120), tribes: str(c?.tribes, 200)})).filter(c => c.key && c.name && c.scene);
  const h = l.hunters && typeof l.hunters === "object" ? {stage: str(l.hunters.stage, 40), region: str(l.hunters.region, 60)} : null;
  const taints = list(l.taints).map(t => ({clock: str(t?.clock, 40), scene: str(t?.scene, 200),
    per: Math.max(1, Math.min(10, Math.trunc(num(t?.per)) || 1)), max: Math.max(1, Math.min(10, Math.trunc(num(t?.max)) || 9))})).filter(t => t.clock && t.scene);
  return {feasts, titles, languages, caerns, hunters: h?.stage ? h : null, taints};
}

/* ---- Feasts (B7611) ---- */

/**
 * The church-day options a chronicle's feasts add: extra (church-rules feastOn rows: holy days), customs (named days
 * that are no holy day) and revels (names that make a night of revel).
 */
export function feastOptions(local = EMPTY) {
  const rows = local?.feasts ?? [];
  return {extra: rows.filter(f => !f.custom).map(f => [f.month, f.day, f.name]),
    customs: rows.filter(f => f.custom).map(f => [f.month, f.day, f.name]),
    revels: rows.filter(f => f.revel).map(f => f.name)};
}

/* ---- Seat titles (B7612) ---- */

/** The seat names a chronicle gives an institution kind in a year: {rank: title}. */
export function titlesFor(local = EMPTY, kind = "", y = 0) {
  const out = {};
  for ( const t of local?.titles ?? [] ) {
    if ( t.kind !== kind ) continue;
    if ( t.from !== null && y < t.from ) continue;
    if ( t.to !== null && y > t.to ) continue;
    out[t.rank] = t.title;
  }
  return out;
}

/** A ladder of ranks with some renamed: {rank: title} or the stored rows [{rank, title, from, to}] for a year. */
export function withTitles(ranks = [], over = null, y = 0) {
  if ( !over ) return ranks;
  const map = Array.isArray(over) ? titlesFor({titles: over.map(t => ({...t, kind: "*"}))}, "*", y) : over;
  if ( !Object.keys(map).length ) return ranks;
  return ranks.map((r, i) => map[i] ?? r);
}

/** Is this the chronicle's own town? By name, as the town's market is called (manifest.town). */
export const isHomeTown = (name, manifest) => !!manifest?.town && norm(name) === norm(manifest.town);

/** The title rows to keep on an institution of a town: those of its kind, or none when it is not the chronicle's town. */
export function townTitles(local = EMPTY, kind = "", townName = "", manifest = null) {
  if ( !isHomeTown(townName, manifest) ) return [];
  return (local?.titles ?? []).filter(t => t.kind === kind).map(({rank, title, from, to}) => ({rank, title, from, to}));
}

/* ---- Languages (B7613, B7614) ---- */

/** The chronicle's languages by name. */
export const languageNames = (local = EMPTY) => (local?.languages ?? []).map(l => l.name);
/** A chronicle language by name, or null. */
export const languageOf = (local = EMPTY, name = "") => (local?.languages ?? []).find(l => norm(l.name) === norm(name)) ?? null;

/** The saga book whose years hold a year: its key, or "". books: [{key, from, to}] (WoDX Chronicle SAGA.books). */
export function bookAt(books = [], y = 0) {
  const b = list(books).find(x => num(x?.from) <= y && y <= num(x?.to));
  return b?.key ?? "";
}

/** May a player list this language now? False only for a chronicle language closed in the book of this year. */
export function canLearn(local = EMPTY, name = "", {y = 0, books = []} = {}) {
  const l = languageOf(local, name);
  if ( !l || !l.closedIn.length ) return true;
  return !l.closedIn.includes(bookAt(books, y));
}

/** The languages in a new list that a player may not add now (those already on the sheet stay). */
export function closedAdded(local = EMPTY, before = [], after = [], opts = {}) {
  const had = new Set(list(before).map(norm));
  return list(after).filter(n => !had.has(norm(n)) && !canLearn(local, n, opts));
}

/** Does a hearer who lacks this language get its sense without a roll? */
export const givesIntent = (local = EMPTY, name = "") => !!languageOf(local, name)?.intent;

/* ---- Caerns (B7615) ---- */

/** The register id of a chronicle caern: stable, so it is put on the register once. */
export const caernId = (chronicleId, key) => `chr:${slug(chronicleId)}:${key}`.slice(0, 40);

/**
 * The caerns to put on the register now: each one whose id is not on the register and was not put there before
 * (seeded, so one the Storyteller removes stays removed), with the scene that matches its pattern.
 * scenes: [{id, name}]. Returns [{id, scene, place}], place ready for power-rules normPlace.
 */
export function caernSeeds(local = EMPTY, chronicleId = "", {scenes = [], have = [], seeded = []} = {}) {
  const out = [], taken = new Set([...list(have), ...list(seeded)]);
  for ( const c of local?.caerns ?? [] ) {
    const id = caernId(chronicleId, c.key);
    if ( taken.has(id) ) continue;
    let re = null;
    try { re = new RegExp(c.scene, "i"); } catch (e) { re = null; }
    const scene = re ? list(scenes).find(s => re.test(String(s?.name ?? ""))) : null;
    if ( !scene ) continue;
    out.push({id, scene: scene.id, place: {id, kind: "caern", name: c.name, scene: scene.id, level: c.level,
      ...(c.type ? {type: c.type} : {}), totem: c.totem, sept: c.sept, tribes: c.tribes, status: "held"}});
  }
  return out;
}

/* ---- Hunters (B7616) ---- */

/** Where and at what stage the chronicle's hunters start: {region, stage} or null. */
export function hunterStart(local = EMPTY, homeland = "") {
  const h = local?.hunters;
  if ( !h?.stage ) return null;
  const region = h.region || homeland;
  return region ? {region, stage: h.stage} : null;
}

/* ---- A place's taint on a saga clock (B7807) ---- */

/** The corruption level a clock's segments ask of its place: 0 up to the row's max. */
export const clockTaint = (t, clocks = {}) => Math.max(0, Math.min(t?.max ?? 9, Math.round(num(clocks?.[t?.clock]) * (t?.per ?? 1))));

/**
 * The places whose corruption follows a clock now: [{scene, clock, target}], one for each taints row whose pattern
 * matches a scene. scenes: [{id, name}]. The first matching scene takes it, so one clock taints one place.
 */
export function taintPlans(local = EMPTY, clocks = {}, {scenes = []} = {}) {
  const out = [];
  for ( const t of local?.taints ?? [] ) {
    let re = null;
    try { re = new RegExp(t.scene, "i"); } catch (e) { re = null; }
    const scene = re ? list(scenes).find(s => re.test(String(s?.name ?? ""))) : null;
    if ( scene ) out.push({scene: scene.id, clock: t.clock, target: clockTaint(t, clocks)});
  }
  return out;
}
