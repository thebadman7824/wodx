/**
 * WoDX Sheets 0.7.0, the pure part of the sheet extras: possessions (containers, stacks, concealment, era checks),
 * money by era, the in-play strip, ties to other characters, and the change history. No Foundry in here, so the
 * tests use it too. main.mjs and extras.mjs draw it.
 *
 * Data on an item: flags.wodx-sheets.in (the id of the container it sits in), qty (how many, 1 when unset),
 * holds (the largest concealment step a container takes), coin ({currency, denom}), eras and first/last year when
 * the item carries them (else they come from the gear and goods lists by name). A container is an item with the
 * system's own system.iscontainer switch on.
 */

export const MOD = "wodx-sheets";

/* -------------------------------------------------------------- */
/*  Concealment                                                    */
/* -------------------------------------------------------------- */

/**
 * V20's concealment steps for what a character carries: P a pocket, J a jacket, T a trench coat (a cloak, C, in the
 * Dark Ages gear tables), N cannot be hidden. A container takes things up to its own step.
 */
export const CONCEAL = [
  {id: "P", label: "Pocket"},
  {id: "J", label: "Jacket"},
  {id: "T", label: "Trench coat or cloak"},
  {id: "N", label: "Cannot be hidden"}
];
const STEP = {P: 0, J: 1, T: 2, C: 2, N: 3};
/** The step of a concealment letter, or null when unknown. */
export function concealStep(v) {
  const k = String(v ?? "").trim().toUpperCase().charAt(0);
  return k in STEP ? STEP[k] : null;
}

/* -------------------------------------------------------------- */
/*  Item helpers                                                   */
/* -------------------------------------------------------------- */

const f = it => it?.flags?.[MOD] ?? {};
export const qtyOf = it => Math.max(1, Math.floor(Number(f(it).qty) || 1));
export const isContainer = it => !!it?.system?.iscontainer;
export const parentOf = it => f(it).in || null;
/** The Storyteller kept this item although it is out of its time (an heirloom, a relic, a traveller's kit). */
export const isKept = it => !!f(it).keepOutOfEra;
/** The concealment step an item needs: its own flag, the weapon's conceal letter, small goods a jacket, else null. */
export function needOf(it, good = null) {
  const own = concealStep(f(it).conceal ?? it?.system?.conceal);
  if ( own !== null ) return own;
  if ( good?.conceal ) return concealStep(good.conceal);
  if ( good ) return good.small ? STEP.J : STEP.N;
  return null;
}
/** The largest step a container takes (N when unset: it takes anything). */
export const holdsOf = it => concealStep(f(it).holds) ?? STEP.N;

/** What kind of possession it is, for the groups on the Possessions tab. */
export function groupOf(it) {
  if ( isContainer(it) ) return "containers";
  if ( it.type === "Melee Weapon" || it.type === "Ranged Weapon" ) return "weapons";
  if ( it.type === "Armor" ) return "armor";
  if ( it.type === "Fetish" ) return "fetishes";
  if ( f(it).coin ) return "money";
  return "goods";
}
export const GROUPS = {
  containers: "Carried in", weapons: "Weapons", armor: "Armor", fetishes: "Fetishes and talens", money: "Money", goods: "Goods and gear"
};
/** The possession item types the tab lists. */
export const POSSESSION_TYPES = ["Item", "Melee Weapon", "Ranged Weapon", "Armor", "Fetish"];

/** Whether two items can merge into one stack: same name and type, not containers, and nothing inside either. */
export function canStack(a, b, items = []) {
  if ( !a || !b || a.id === b.id || a.name !== b.name || a.type !== b.type ) return false;
  if ( isContainer(a) || isContainer(b) || f(a).stacks === false || f(b).stacks === false ) return false;
  if ( items.some(i => parentOf(i) === a.id || parentOf(i) === b.id) ) return false;
  return parentOf(a) === parentOf(b);
}

/** Every id inside a container, all the way down (a purse in a satchel). */
export function contentsOf(id, items) {
  const out = [], seen = new Set([id]);
  const walk = pid => { for ( const i of items ) if ( parentOf(i) === pid && !seen.has(i.id) ) { seen.add(i.id); out.push(i); walk(i.id); } };
  walk(id);
  return out;
}

/**
 * Whether an item may go into a container: not into itself or its own contents, only into a container, and only when
 * its concealment step fits. Returns {ok, why}.
 */
export function canPut(item, box, items = [], good = null) {
  if ( !box ) return {ok: true, why: ""};
  if ( !isContainer(box) ) return {ok: false, why: `${box.name} is not a container.`};
  if ( item.id === box.id || contentsOf(item.id, items).some(i => i.id === box.id) ) return {ok: false, why: "A thing cannot go inside itself."};
  const need = needOf(item, good), holds = holdsOf(box);
  if ( need !== null && need > holds ) return {ok: false, why: `${item.name} is too big for ${box.name} (it takes ${CONCEAL[holds].label.toLowerCase()} size at most).`};
  return {ok: true, why: ""};
}

/* -------------------------------------------------------------- */
/*  Eras                                                           */
/* -------------------------------------------------------------- */

/** Eras that carry another's goods (as Library's ERA_LIKE). */
export const ERA_LIKE = {"time-of-future-judgement": "future-darkness", "age-of-reason": "renaissance", "mid-century": "great-war"};

/**
 * Where an item stands in the chronicle's time: "ok", "early" (not made yet), "late" (no longer in use) or null when
 * nothing says. info: {eras?, firstYear?, lastYear?}. era: the active era id; year: the year now (0 when unknown).
 */
export function eraStatus(info, era, year = 0) {
  if ( !info ) return null;
  const y = Number(year) || 0;
  if ( y && (Number.isFinite(info.firstYear) || Number.isFinite(info.lastYear)) ) {
    if ( Number.isFinite(info.firstYear) && y < info.firstYear ) return "early";
    if ( Number.isFinite(info.lastYear) && y > info.lastYear ) return "late";
    return "ok";
  }
  const eras = Array.isArray(info.eras) ? info.eras : [];
  if ( !eras.length || !era ) return null;
  if ( eras.includes(era) || (ERA_LIKE[era] && eras.includes(ERA_LIKE[era])) ) return "ok";
  return info.order && info.order.indexOf(era) >= 0 && info.order.indexOf(eras[0]) > info.order.indexOf(era) ? "early" : "late";
}
export const ERA_NOTE = {early: "Not made yet in this year", late: "No longer in use in this year", kept: "Out of its time, kept by the Storyteller"};

/** Value tiers (as the goods list): a working wage of the time is the measure. */
export const TIERS = ["Trifle", "Cheap", "Modest", "Costly", "Dear", "Treasure"];
/** A value given as a tier with later changes, "4>1600:2>1850:1", read at a year. */
export function tierAt(value, year = 0) {
  if ( value === null || value === undefined || value === "" ) return null;
  if ( typeof value === "number" ) return value;
  const parts = String(value).split(">");
  let t = Number(parts[0]);
  for ( const p of parts.slice(1) ) { const [yy, tt] = p.split(":").map(Number); if ( year && year >= yy ) t = tt; }
  return Number.isFinite(t) ? t : null;
}

/* -------------------------------------------------------------- */
/*  Money by era                                                   */
/* -------------------------------------------------------------- */

/**
 * The coin in use, by year, for the places a WoDX chronicle is likely to be: the German lands (the default, for
 * Rothenstein), England and the United States. denoms run smallest first. Coins of account (never struck) are marked.
 * A house list from general history; the Storyteller renames coins freely.
 */
export const CURRENCIES = {
  german: {label: "German lands", spans: [
    {from: -10000, to: 1299, denoms: ["Pfennig", "Schilling (of account)", "Mark of silver (of account)"]},
    {from: 1300, to: 1499, denoms: ["Heller", "Pfennig", "Groschen", "Gulden"]},
    {from: 1500, to: 1872, denoms: ["Pfennig", "Kreuzer", "Groschen", "Gulden", "Thaler"]},
    {from: 1873, to: 1923, denoms: ["Pfennig", "Mark"]},
    {from: 1924, to: 1947, denoms: ["Reichspfennig", "Reichsmark"]},
    {from: 1948, to: 2001, denoms: ["Pfennig", "Deutsche Mark"]},
    {from: 2002, to: 2049, denoms: ["Cent", "Euro"]},
    {from: 2050, to: 99999, denoms: ["Eurodollar"]}
  ]},
  english: {label: "England", spans: [
    {from: -10000, to: 1503, denoms: ["Farthing", "Halfpenny", "Penny", "Shilling (of account)", "Pound (of account)"]},
    {from: 1504, to: 1662, denoms: ["Farthing", "Penny", "Shilling", "Crown", "Pound"]},
    {from: 1663, to: 1813, denoms: ["Farthing", "Penny", "Shilling", "Crown", "Guinea"]},
    {from: 1814, to: 1970, denoms: ["Farthing", "Penny", "Shilling", "Crown", "Pound"]},
    {from: 1971, to: 2049, denoms: ["Penny", "Pound"]},
    {from: 2050, to: 99999, denoms: ["Eurodollar"]}
  ]},
  american: {label: "United States", spans: [
    {from: -10000, to: 1791, denoms: ["Shilling", "Spanish dollar"]},
    {from: 1792, to: 2049, denoms: ["Cent", "Dime", "Dollar"]},
    {from: 2050, to: 99999, denoms: ["Eurodollar"]}
  ]}
};
/** The coins in use in a year for a place. */
export function coinsAt(place = "german", year = 0) {
  const c = CURRENCIES[place] ?? CURRENCIES.german, y = Number(year) || 1197;
  return (c.spans.find(s => y >= s.from && y <= s.to) ?? c.spans[0]).denoms;
}
/** What a character carries in coin: [{denom, count, where}] from the coin stacks, biggest count first. */
export function moneyOf(items) {
  const by = new Map();
  for ( const it of items ) {
    const c = f(it).coin;
    if ( !c ) continue;
    const key = String(c.denom ?? it.name);
    const row = by.get(key) ?? {denom: key, count: 0};
    row.count += qtyOf(it);
    by.set(key, row);
  }
  return [...by.values()].sort((a, b) => b.count - a.count);
}

/* -------------------------------------------------------------- */
/*  The Possessions view                                           */
/* -------------------------------------------------------------- */

/**
 * The tree the Possessions tab draws. items: the actor's items (only the possession types are kept). look(item):
 * {eraInfo, good, value} for an item, from the gear and goods lists; era, year: now. Returns {groups, loose, count}.
 * Each row: {id, name, qty, kind, depth, isContainer, holds, era, eraNote, value, contents: [rows]}.
 */
export function possessions(items, {look = () => ({}), era = null, year = 0} = {}) {
  const list = items.filter(i => POSSESSION_TYPES.includes(i.type));
  const ids = new Set(list.map(i => i.id));
  const row = (it, depth) => {
    const L = look(it) ?? {};
    const st0 = eraStatus(L.eraInfo ?? null, era, year);
    const st = st0 && st0 !== "ok" && isKept(it) ? "kept" : st0;
    const tier = tierAt(L.value, year);
    const kids = depth < 6 ? list.filter(c => parentOf(c) === it.id).sort(byName).map(c => row(c, depth + 1)) : [];
    return {
      id: it.id, name: it.name, qty: qtyOf(it), kind: groupOf(it), depth, isContainer: isContainer(it),
      holds: isContainer(it) ? CONCEAL[holdsOf(it)].label : "", era: st, eraNote: st && st !== "ok" ? ERA_NOTE[st] : "",
      value: tier === null ? "" : TIERS[Math.max(0, Math.min(5, tier))], equipped: !!(it.system?.isequipped || it.system?.isactive),
      desc: plainDesc(it.system?.description), usable: !!L.usable, contents: kids, count: kids.reduce((n, k) => n + 1 + k.count, 0)
    };
  };
  // Anything whose container is gone is loose again
  const top = list.filter(i => !parentOf(i) || !ids.has(parentOf(i)));
  const groups = Object.keys(GROUPS).map(g => ({id: g, label: GROUPS[g], rows: top.filter(i => groupOf(i) === g).sort(byName).map(i => row(i, 0))}))
    .filter(g => g.rows.length);
  return {groups, count: list.length, outOfEra: list.filter(i => { const s = eraStatus(look(i)?.eraInfo ?? null, era, year); return s && s !== "ok" && !isKept(i); }).length};
}
const byName = (a, b) => a.name.localeCompare(b.name);
/** An item's description as plain text for the Possessions fold (0.8.2), cut at 600 characters. */
export function plainDesc(html) {
  const t = String(html ?? "").replace(/<br\s*\/?>|<\/p>/gi, " ").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  return t.length > 600 ? `${t.slice(0, 597)}...` : t;
}

/* -------------------------------------------------------------- */
/*  The in-play strip                                              */
/* -------------------------------------------------------------- */

/** The line's own pools, in the order the strip shows them: [settings switch, label, path under advantages]. */
export const POOLS = [
  ["hasbloodpool", "Blood", "bloodpool"], ["hasrage", "Rage", "rage"], ["hasgnosis", "Gnosis", "gnosis"],
  ["hasglamour", "Glamour", "glamour"], ["hasbanality", "Banality", "banality"], ["hasquintessence", "Quintessence", "quintessence"],
  ["hasfaith", "Faith", "faith"], ["hasconviction", "Conviction", "conviction"], ["haspathos", "Pathos", "pathos"],
  ["hascorpus", "Corpus", "corpus"], ["hasvitality", "Vitality", "vitality"], ["hasspite", "Spite", "spite"]
];
const num = v => Number(v) || 0;
/** The strip's cells: health, Willpower, each pool the line has, soak and initiative, then conditions. */
export function strip(sys = {}, {healthLabel = "", conditions = []} = {}) {
  const adv = sys.advantages ?? {}, set = sys.settings ?? {}, cells = [];
  const d = sys.health?.damage ?? {};
  const hurt = num(d.bashing) + num(d.lethal) + num(d.aggravated);
  cells.push({key: "health", label: "Health", text: hurt ? (healthLabel || `${hurt} levels`) : "Unhurt", warn: hurt > 0});
  if ( set.haswillpower !== false && adv.willpower ) cells.push({key: "willpower", label: "Willpower", text: `${num(adv.willpower.temporary)} / ${num(adv.willpower.permanent)}`});
  for ( const [sw, label, path] of POOLS ) {
    const p = adv[path];
    if ( !set[sw] || !p ) continue;
    const max = p.permanent ?? p.max;
    cells.push({key: path, label, text: max !== undefined ? `${num(p.temporary)} / ${num(max)}` : String(num(p.temporary))});
  }
  const s = sys.soak ?? {};
  cells.push({key: "soak", label: "Soak", text: `${num(s.bashing)} B, ${num(s.lethal)} L, ${num(s.aggravated)} A`});
  cells.push({key: "initiative", label: "Initiative", text: String(num(sys.initiative?.total))});
  return {cells, conditions: conditions.filter(Boolean)};
}

/* -------------------------------------------------------------- */
/*  Ties                                                           */
/* -------------------------------------------------------------- */

export const TIE_ROLES = {
  domitor: "Domitor", ghoul: "Ghoul", retainer: "Retainer", ally: "Ally", mentor: "Mentor", contact: "Contact", kin: "Kin", rival: "Rival", haven: "Haven", other: "Other"
};
/**
 * The Ties tab's rows. ties: the actor's own list [{uuid, role, note}]; resolve(uuid): {name, kind, xpSpent?} or null;
 * linked: ties that come from elsewhere (ghouls naming this character as domitor) [{uuid, role, note, auto: true}].
 */
export function tieRows(ties = [], linked = [], resolve = () => null) {
  const seen = new Set();
  const out = [];
  for ( const t of [...(Array.isArray(ties) ? ties : []), ...linked] ) {
    if ( !t?.uuid || seen.has(t.uuid) ) continue;
    seen.add(t.uuid);
    const r = resolve(t.uuid);
    out.push({uuid: t.uuid, role: TIE_ROLES[t.role] ? t.role : "other", roleLabel: TIE_ROLES[t.role] ?? TIE_ROLES.other,
      note: String(t.note ?? ""), name: r?.name ?? "(gone)", gone: !r, kind: r?.kind ?? "", xpSpent: r?.xpSpent ?? null, auto: !!t.auto});
  }
  const order = Object.keys(TIE_ROLES);
  return out.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.name.localeCompare(b.name));
}
/** XP spent, from a character's Experience items. */
export const xpSpent = items => items.filter(i => i.type === "Experience" && i.system?.isspent).reduce((n, i) => n + num(i.system?.amount), 0);

/* -------------------------------------------------------------- */
/*  Change history                                                 */
/* -------------------------------------------------------------- */

/** Keys a recompute or WoDX itself writes; a change made only of these is not an edit to keep. */
const QUIET = [/^system\.settings\.isupdated$/, /^flags\.wodx-sheets\.(history|ui)/, /^_stats/, /^system\.(attributes\.\w+\.total|abilities\.\w+\.total|movement|health\.damage\.(woundlevel|woundpenalty)|initiative|soak)/];
/** Flatten an update into dotted keys. */
export function flat(obj, prefix = "", out = {}) {
  for ( const [k, v] of Object.entries(obj ?? {}) ) {
    if ( k === "_id" ) continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if ( v && typeof v === "object" && !Array.isArray(v) ) flat(v, p, out);
    else out[p] = v;
  }
  return out;
}
const getPath = (o, p) => p.split(".").reduce((x, k) => (x === null || x === undefined ? undefined : x[k]), o);
/**
 * One history entry for an actor update: the keys that changed, with the old values to put back. Null when the
 * change holds nothing a person typed or clicked.
 */
export function entryFor(before, changes, {label = "", at = 0, user = ""} = {}) {
  const keys = Object.keys(flat(changes)).filter(k => !QUIET.some(q => q.test(k)));
  if ( !keys.length ) return null;
  const undo = {};
  for ( const k of keys ) undo[k] = getPath(before, k) ?? null;
  return {at, user, label: label || keys.map(niceKey).slice(0, 3).join(", "), undo, kind: "actor"};
}
/** A readable name for a data path: "system.attributes.strength.value" is "Strength". */
export function niceKey(k) {
  const parts = k.split(".").filter(p => !["system", "value", "temporary", "permanent", "flags"].includes(p));
  const last = parts[parts.length - 1] ?? k;
  const NAMES = { qty: "How many", in: "Where carried", holds: "Container size", iscontainer: "Container", ties: "Ties", isequipped: "In hand" };
  if ( NAMES[last] ) return NAMES[last];
  return last.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
}
/** Keep at most this many entries per character. */
export const HISTORY_MAX = 30;
export function pushEntry(list, e) {
  if ( !e ) return list;
  return [e, ...list].slice(0, HISTORY_MAX);
}

/** Sheets 0.10.1: a ghoul's domitor id from its lineage. WoDX Creation stores {id, name}; an older sheet may hold the bare id. */
export function domitorId(lineage) {
  const d = lineage?.domitor;
  const id = d && typeof d === "object" ? d.id : d;
  return id ? String(id) : null;
}
