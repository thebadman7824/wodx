/**
 * WoDX Creation 0.24.0: the step-by-step character wizard's pure part (B2760 to B2766). No Foundry here.
 *
 * The wizard walks a player through the book's creation order one page at a time: the book, Attributes, Abilities,
 * the line's powers, Backgrounds, Virtues, Merits and Flaws, freebies, then a last look. The player picks the
 * priorities (primary, secondary, tertiary); the count is the creation check's (totals-rules.mjs) with that order.
 * On the early pages a dot can only be spent inside the book's allotment; on the freebie page every dot past it is
 * charged at the book's cost. Merits cost their points, Flaws give theirs up to the book's cap, and the prelude's
 * gains are paid from the prelude's own 3 points. Traits the creation check does not count (Willpower, Humanity or a
 * Road, Rage, Gnosis, Arete, Glamour) are bought on the freebie page and kept in the wizard's ledger.
 */
import {TOTALS, checkCreation} from "./totals-rules.mjs";
import {CLANS} from "../data/vampire.mjs";

const n = v => Math.max(0, Math.trunc(Number(v) || 0));
export const ATTR_GROUPS = ["physical", "social", "mental"];
export const ABIL_GROUPS = ["talent", "skill", "knowledge"];
export const GROUP_LABEL = {physical: "Physical", social: "Social", mental: "Mental", talent: "Talents", skill: "Skills", knowledge: "Knowledges"};
export const RANK = ["Primary", "Secondary", "Tertiary"];

/** The pages, in the book's order. A line without powers or Virtues skips that page. */
export function pagesFor(lineId) {
  const L = TOTALS[lineId];
  if ( !L ) return [];
  const out = [{key: "book", label: "The book"}, {key: "attributes", label: "Attributes"}, {key: "abilities", label: "Abilities"}];
  if ( (L.powers ?? []).length ) out.push({key: "powers", label: L.powers.map(p => p.label).join(" and ")});
  out.push({key: "backgrounds", label: "Backgrounds"});
  if ( L.virtues !== undefined ) out.push({key: "virtues", label: "Virtues"});
  out.push({key: "meritsFlaws", label: "Merits and Flaws"}, {key: "freebies", label: "Freebie points"}, {key: "review", label: "Last look"});
  return out;
}

/** A priority order is good when it names each of the groups once. */
export const goodOrder = (order, groups) => Array.isArray(order) && order.length === groups.length && groups.every(g => order.includes(g));

/** The order the sheet's dots already suggest: the group with most dots first, ties in the book's order. */
export function suggestedOrder(have = {}, groups = ATTR_GROUPS) {
  return [...groups].sort((a, b) => (n(have[b]) - n(have[a])) || groups.indexOf(a) - groups.indexOf(b));
}

/** Swap a group to a rank; the group there takes the moved one's old rank. */
export function setRank(order, group, rank) {
  const o = [...order], from = o.indexOf(group), r = Math.max(0, Math.min(o.length - 1, Math.trunc(Number(rank) || 0)));
  if ( from < 0 || from === r ) return o;
  [o[from], o[r]] = [o[r], o[from]];
  return o;
}

/* ------------------------------------------------------------------ */
/*  Freebie extras: Traits the creation check does not count           */
/* ------------------------------------------------------------------ */

/** Paths on the system's sheet. cost: the key of the line's costs; max at creation. */
export const EXTRAS = {
  willpower: {label: "Willpower", path: "system.advantages.willpower", max: 10},
  road: {label: "Humanity or Road", path: "system.advantages.path", max: 10, value: true},
  rage: {label: "Rage", path: "system.advantages.rage", max: 10},
  gnosis: {label: "Gnosis", path: "system.advantages.gnosis", max: 10},
  arete: {label: "Arete", path: "system.advantages.arete", max: 3},
  glamour: {label: "Glamour", path: "system.advantages.glamour", max: 10}
};

/** The extras a line can buy with freebies: [{key, label, cost, path, max, value}]. */
export function extrasFor(lineId) {
  const c = TOTALS[lineId]?.costs ?? {};
  return Object.entries(EXTRAS).filter(([k]) => Number(c[k]) > 0).map(([key, e]) => ({key, ...e, cost: Number(c[key])}));
}

/** The book costs the check does not price and the wizard cannot reach on the sheet: these go in "Other". */
export function otherCosts(lineId) {
  const L = TOTALS[lineId];
  if ( !L ) return [];
  const counted = new Set(["attribute", "ability", "background", "virtue", ...(L.powers ?? []).map(p => p.key), ...extrasFor(lineId).map(e => e.key)]);
  return Object.entries(L.costs).filter(([k]) => !counted.has(k)).map(([k, v]) => ({key: k, cost: v}));
}

/* ------------------------------------------------------------------ */
/*  The ledger                                                         */
/* ------------------------------------------------------------------ */

/** The wizard's record, cleaned: {line, order: {attributes, abilities}, bought: {key: dots}, other, page}. */
export function normWizard(w = {}) {
  const out = {line: TOTALS[w?.line] ? w.line : null, order: {}, bought: {}, other: n(w?.other), page: String(w?.page ?? "book")};
  if ( goodOrder(w?.order?.attributes, ATTR_GROUPS) ) out.order.attributes = [...w.order.attributes];
  if ( goodOrder(w?.order?.abilities, ABIL_GROUPS) ) out.order.abilities = [...w.order.abilities];
  for ( const [k, v] of Object.entries(w?.bought ?? {}) ) if ( EXTRAS[k] && n(v) ) out.bought[k] = n(v);
  return out;
}

/** Freebie points the prelude gave for Abilities and Backgrounds (its Willpower is not in the totals). */
export function preludeAllowance(log = []) {
  return (Array.isArray(log) ? log : []).filter(e => e?.kind === "reward" && !e.undone && e.undo?.kind !== "willpower")
    .reduce((t, e) => t + n(e.cost), 0);
}

/**
 * The whole count.
 *   view      totalsView's shape
 *   wizard    normWizard's shape (order, bought, other)
 *   merits    Merit points on the sheet; flaws: Flaw points on the sheet; prelude: preludeAllowance
 * Returns {check, budget, spent, left, flawsCounted, flawsOver, extras, unspent, ok}.
 */
export function ledger(view, lineId, {wizard = {}, merits = 0, flaws = 0, prelude = 0} = {}) {
  const L = TOTALS[lineId];
  if ( !L ) throw new Error(`No creation totals for ${lineId}`);
  const w = normWizard(wizard);
  const check = checkCreation(view, lineId, {order: w.order});
  const cap = L.flaws ?? 7;
  const flawsCounted = Math.min(n(flaws), cap);
  const extras = extrasFor(lineId).map(e => ({...e, bought: n(w.bought[e.key]), spent: n(w.bought[e.key]) * e.cost}));
  const extraCost = extras.reduce((t, e) => t + e.spent, 0);
  const budget = check.freebies.allowed + flawsCounted + n(prelude);
  const spent = check.freebies.used + n(merits) + extraCost + w.other;
  const unspent = check.rows.filter(r => r.have !== null && r.under > 0).map(r => ({label: r.label, dots: r.under}));
  return {check, budget, spent, left: budget - spent, flawsCounted, flawsOver: Math.max(0, n(flaws) - cap), merits: n(merits), extras, other: w.other,
    prelude: n(prelude), unspent, ok: budget - spent >= 0 && n(flaws) <= cap};
}

/**
 * What one more dot would cost in freebies (0 inside the allotment). change: {kind: "attribute"|"ability"|"background"|
 * "power"|"virtue", group, key, above (the Ability is already at the cap)}.
 */
export function stepCost(view, lineId, change, opts = {}) {
  const before = ledger(view, lineId, opts).spent;
  return ledger(bump(view, change, 1), lineId, opts).spent - before;
}

/** The view with one dot more (d = 1) or less (d = -1). */
export function bump(view, change = {}, d = 1) {
  const v = structuredClone(view ?? {});
  const add = (x) => Math.max(0, n(x) + d);
  if ( change.kind === "attribute" ) { v.attributes ??= {}; v.attributes[change.group] = add(v.attributes[change.group]); }
  else if ( change.kind === "ability" ) {
    v.abilities ??= {};
    const g = (v.abilities[change.group] ??= {dots: 0, aboveCap: 0});
    if ( change.above ) g.aboveCap = add(g.aboveCap); else g.dots = add(g.dots);
  } else if ( change.kind === "background" ) v.backgrounds = add(v.backgrounds);
  else if ( change.kind === "power" ) { v.powers ??= {}; if ( v.powers[change.key] !== null ) v.powers[change.key] = add(v.powers[change.key]); }
  else if ( change.kind === "virtue" ) v.virtues = add(v.virtues);
  return v;
}

/**
 * Can a dot go up on this page? Early pages: only inside the allotment. The freebie page: if the points left cover it.
 * Returns {ok, cost, why}.
 */
export function canRaise(view, lineId, change, {page = "attributes", value = 0, max = 5, ...opts} = {}) {
  if ( n(value) >= max ) return {ok: false, cost: 0, why: `${max} is the most at creation.`};
  const cost = stepCost(view, lineId, change, opts);
  if ( page !== "freebies" ) return cost > 0 ? {ok: false, cost, why: "The allotment is spent. More dots come from freebie points."} : {ok: true, cost: 0};
  const left = ledger(view, lineId, opts).left;
  return cost > left ? {ok: false, cost, why: `Costs ${cost}, and ${Math.max(0, left)} ${left === 1 ? "point is" : "points are"} left.`} : {ok: true, cost};
}

/* ------------------------------------------------------------------ */
/*  What to pick from                                                  */
/* ------------------------------------------------------------------ */

/** The kind a line's Merits and Flaws are held by (the trait table's holders). */
export const LINE_KIND = {v20: "kindred", vtda20: "kindred", kote: "kindred", ghoul: "ghoul", revenant: "ghoul", w20: "lupine", daw: "lupine",
  m20: "mage", dam: "mage", wr20: "wraith", c20: "fae", dafae: "fae", inquisitor: "hunter", htr: "hunter", demon: "demon", mummy: "mummy", orpheus: "mortal"};
const KIND_ALSO = {ghoul: ["mortal"], hunter: ["mortal"], kinfolk: ["mortal"]};
export const kindFits = (holders = [], kind) => !holders.length || holders.includes("any") || [kind, ...(KIND_ALSO[kind] ?? [])].some(k => holders.includes(k));

/** A Merit or Flaw's cost as the choices it allows: "2" [2], "1/3" [1, 3], "1-5" [1..5]. */
export function costChoices(cost) {
  const s = String(cost ?? "").trim();
  let m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if ( m ) { const a = Number(m[1]), b = Number(m[2]); return a <= b && b - a < 10 ? Array.from({length: b - a + 1}, (_, i) => a + i) : []; }
  if ( /^\d+(\s*\/\s*\d+)+$/.test(s) ) return [...new Set(s.split("/").map(x => Number(x.trim())))].sort((a, b) => a - b);
  m = s.match(/^\d+$/);
  return m ? [Number(s)] : [];
}

/** Merits and Flaws a line can take: [{key, name, kind, choices, book, page, pdf}], by name. */
export function meritOptions(lineId, table = []) {
  const kind = LINE_KIND[lineId] ?? "mortal";
  return table.filter(t => (t.kind === "merit" || t.kind === "flaw") && kindFits(t.holders ?? [], kind))
    .map(t => ({key: t.key, name: t.name, kind: t.kind, choices: costChoices(t.cost), book: t.book ?? "", page: t.page ?? null, pdf: t.pdf ?? null}))
    .filter(t => t.choices.length)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The books whose Background lists a line draws on (the trait table's book names). WoDX choice for the Dark Ages lines without one. */
export const BG_BOOKS = {v20: ["V20 core"], vtda20: ["V20 Dark Ages"], ghoul: ["V20 core"], revenant: ["V20 core"], kote: ["Kindred of the East"],
  w20: ["W20 core", "W20 Changing Breeds"], daw: ["W20 core"], m20: ["M20 core", "M20 Book of Secrets"], dam: ["M20 core"], wr20: ["Wraith 20"],
  c20: ["C20"], dafae: ["C20"], inquisitor: ["Hunters Hunted II"], htr: ["Hunters Hunted II"], demon: ["Demon: The Fallen"],
  mummy: ["Mummy: The Resurrection", "Mummy 2nd"], orpheus: ["Orpheus"]};

/** Backgrounds a line can take: [{key, name, book, page}], by name. */
export function backgroundOptions(lineId, list = []) {
  const books = BG_BOOKS[lineId] ?? [];
  return list.filter(b => (b.books ?? []).some(x => books.includes(x)))
    .map(b => { const book = books.find(x => b.books.includes(x)); return {key: b.key, name: b.name, book, page: b.page?.[book] ?? null}; })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** How the wizard puts each power on the sheet. item: an Item; sphere: the sheet's own Sphere dots. */
export const POWER_KIND = {
  discipline: {store: "item", type: "Power", sub: "wod.types.discipline", dots: true, max: 5},
  gift: {store: "item", type: "Power", sub: "wod.types.gift", dots: false, max: 1},
  sphere: {store: "sphere", max: 5},
  arcanoi: {store: "item", type: "Power", sub: "wod.types.arcanoi", dots: true, max: 3},
  passion: {store: "item", type: "Trait", sub: "wod.types.passion", dots: true, max: 5},
  fetter: {store: "item", type: "Trait", sub: "wod.types.fetter", dots: true, max: 5},
  art: {store: "item", type: "Power", sub: "wod.types.art", dots: true, max: 5},
  realm: {store: "item", type: "Realm", sub: "", dots: true, max: 5},
  lore: {store: "item", type: "Power", sub: "wod.types.lore", dots: true, max: 5},
  hekau: {store: "item", type: "Power", sub: "wod.types.hekau", dots: true, max: 5},
  pillar: {store: "hand"}, dominion: {store: "hand"}, edge: {store: "hand"}
};

/** Names the books give (names only; the PC book check confirms the lists). A player can always write another. */
export const POWER_NAMES = {
  sphere: ["Correspondence", "Entropy", "Forces", "Life", "Matter", "Mind", "Prime", "Spirit", "Time"],
  arcanoi: ["Argos", "Castigate", "Embody", "Fatalism", "Flux", "Inhabit", "Intimation", "Keening", "Lifeweb", "Mnemosynis", "Moliate", "Outrage", "Pandemonium", "Phantasm", "Puppetry", "Usury"],
  art: ["Autumn", "Chicanery", "Chronos", "Contract", "Dragon's Ire", "Legerdemain", "Metamorphosis", "Naming", "Oneiromancy", "Primal", "Pyretics", "Skycraft", "Soothsay", "Sovereign", "Wayfaring"],
  realm: ["Actor", "Fae", "Nature", "Prop", "Scene", "Time"],
  hekau: ["Alchemy", "Celestial", "Effigy", "Necromancy", "Nomenclature"]
};

const clanKey = s => String(s ?? "").toLowerCase().replace(/^clan\s+/, "").trim();
/** The clan's three Disciplines for the era (dark: before the modern lists), or [] when the clan is not known. */
export function clanDisciplines(clan, {dark = true} = {}) {
  const k = clanKey(clan);
  if ( !k ) return [];
  const c = CLANS.find(x => x.id === k || clanKey(x.name) === k || (x.aliases ?? []).includes(k));
  if ( !c ) return [];
  return [...(!dark && c.modern ? c.modern : c.disciplines)];
}

/** Every Discipline the clan table names, for one bought with freebies. */
export const allDisciplines = () => [...new Set(CLANS.flatMap(c => [...c.disciplines, ...(c.modern ?? [])]))].sort();

/** Suggested names for a power on a line: {first: [...], more: [...]} (first: the clan's, the ghoul's Potence ...). */
export function powerSuggestions(key, lineId, {clan = "", dark = true} = {}) {
  if ( key === "discipline" ) {
    if ( lineId === "ghoul" || lineId === "revenant" ) return {first: ["Potence"], more: allDisciplines().filter(d => d !== "Potence")};
    if ( lineId === "kote" ) return {first: [], more: []};
    const first = clanDisciplines(clan, {dark});
    return {first, more: allDisciplines().filter(d => !first.includes(d))};
  }
  return {first: POWER_NAMES[key] ?? [], more: []};
}

/** The page after or before this one. */
export function nextPage(pages, key, d = 1) {
  const i = pages.findIndex(p => p.key === key);
  const j = Math.max(0, Math.min(pages.length - 1, (i < 0 ? 0 : i) + d));
  return pages[j]?.key ?? "book";
}
