/**
 * WoDX Chronicle 0.36.0: the Legends book, the pure part. No Foundry calls here.
 *
 * The book lists what has really happened in this chronicle, gathered from records WoDX already keeps:
 *   event    a dated event that fired (Chronicle's dated events)
 *   death    a death on an actor's chronology, or in Creation's archive of the dead
 *   embrace  an Embrace or a ghouling on an actor's chronology, with the sire or domitor
 *   office   a seat in a faction's court won or lost (WoDX NPC politics), found by comparing with the last build
 *   holding  a haven, a holding or a domain that changed hands (WoDX Storyteller owners), found the same way
 *   ledger   a boon, an oath or a debt kept or broken (WoDX Storyteller Ledger)
 *
 * Each build adds what is new; nothing already in the book is rewritten except dated events, which follow the
 * clock (setting the clock back takes an event out, as the dated events do). The Storyteller can hide any line from
 * the players. Lines dated after today's date stay in the Storyteller's view only.
 *
 * Stored in the world setting wodx-chronicle.legends: {v, entries, snap: {offices, holdings} | null, built}.
 * An entry: {id, kind, at, year, month, day, text, people: [{id, name}], place, faction, shown}.
 */

export const LEGENDS_VERSION = 1;
export const LEGENDS_CAP = 5000;

/** What a line can be, in the order the window lists them. Fixed list. */
export const KINDS = {
  event: "The world turns",
  death: "The dead",
  embrace: "Embraces and ghouls",
  office: "Offices won and lost",
  holding: "Havens and holdings",
  ledger: "Boons, oaths and debts"
};

/**
 * Whether players see a new line of each kind (B1700, a house rule the Storyteller changes line by line). Boons
 * are public among Kindred, so they show; oaths and debts are often private, and so are Embraces, so they wait.
 * Seats in a secret faction wait too (see officeLines).
 */
export const SHOWN_BY_DEFAULT = {event: true, death: true, embrace: false, office: true, holding: true, ledger: true};

const str = (v, n = 200) => String(v ?? "").trim().slice(0, n);
const int = v => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Math.trunc(Number(v)) : null);
const person = p => (p && typeof p === "object" ? {id: str(p.id, 120) || null, name: str(p.name, 120)} : {id: null, name: str(p, 120)});

export const blankLegends = () => ({v: LEGENDS_VERSION, entries: [], snap: null, built: null});

/** A clean entry. */
export function normEntry(e = {}) {
  const kind = KINDS[e.kind] ? e.kind : "event";
  const month = int(e.month), day = int(e.day);
  return {
    id: str(e.id, 200), kind,
    at: int(e.at),
    year: int(e.year),
    month: month && month >= 1 && month <= 12 ? month : null,
    day: day && day >= 1 && day <= 31 ? day : null,
    text: str(e.text, 500),
    people: (Array.isArray(e.people) ? e.people : []).map(person).filter(p => p.name).slice(0, 8),
    place: str(e.place, 160),
    faction: str(e.faction, 120),
    shown: e.shown === undefined ? SHOWN_BY_DEFAULT[kind] !== false : !!e.shown
  };
}

export function normLegends(s) {
  const out = s && typeof s === "object" ? {...s} : blankLegends();
  out.v = LEGENDS_VERSION;
  out.entries = (Array.isArray(out.entries) ? out.entries : []).filter(e => e && typeof e === "object" && e.id).map(normEntry);
  out.snap = out.snap && typeof out.snap === "object"
    ? {offices: out.snap.offices && typeof out.snap.offices === "object" ? out.snap.offices : {}, holdings: out.snap.holdings && typeof out.snap.holdings === "object" ? out.snap.holdings : {}}
    : null;
  out.built = int(out.built);
  return out;
}

/** A sort key for a line: year, month, day, then world time. Lines with no year sort last. */
export const dateKey = e => (e.year === null ? Number.MAX_SAFE_INTEGER : e.year * 10000 + (e.month ?? 0) * 100 + (e.day ?? 0));
export const byDate = (a, b) => dateKey(a) - dateKey(b) || (a.at ?? 0) - (b.at ?? 0) || a.id.localeCompare(b.id);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "3 May 1450", "May 1450", "1450", or "Undated". */
export function dateLabel(e) {
  if ( e.year === null ) return "Undated";
  if ( !e.month ) return String(e.year);
  if ( !e.day ) return `${MONTHS[e.month - 1]} ${e.year}`;
  return `${e.day} ${MONTHS[e.month - 1]} ${e.year}`;
}

/** A date from a world time, through the Chronicle calendar the caller passes ({year, month, day}). */
const dated = (at, dateOf) => {
  if ( at === null || at === undefined || !Number.isFinite(Number(at)) ) return {at: null, year: null, month: null, day: null};
  try {
    const d = dateOf(Number(at)) ?? {};
    return {at: Math.trunc(Number(at)), year: int(d.year), month: int(d.month), day: int(d.day)};
  } catch (e) {
    return {at: Math.trunc(Number(at)), year: null, month: null, day: null};
  }
};

/* ------------------------------------------------------------------ */
/*  Gathering lines from each record                                  */
/* ------------------------------------------------------------------ */

/** Dated events that fired: `events` is the fired events in full ({id, name, summary, year, month, day, place?}). */
export function eventLines(events = []) {
  return events.filter(ev => ev?.id).map(ev => normEntry({
    id: `event:${ev.id}`, kind: "event", year: ev.year, month: ev.month, day: ev.day,
    text: `${str(ev.name, 200)}. ${str(ev.summary, 280)}`.trim(), place: ev.place ?? ""
  }));
}

/**
 * Deaths and Embraces from actors. `actors`: [{id, name, line, chronology: {embraced, ghouled, died, cause},
 * lineage: {sire: {id, name}, domitor: {id, name}}, place}] (WoDX Creation's flags), plus Creation's archive {<id>: {name, line, died, cause, kind}}.
 * Copies made before Pass the Years are not deaths and are left out.
 */
export function actorLines(actors = [], archived = {}, dateOf = () => ({})) {
  const out = [];
  const seen = new Set();
  for ( const a of actors ) {
    if ( !a?.id ) continue;
    const c = a.chronology ?? {};
    const who = {id: a.id, name: a.name};
    if ( c.died !== undefined && c.died !== null ) {
      seen.add(a.id);
      out.push(normEntry({id: `death:${a.id}`, kind: "death", ...dated(c.died, dateOf), people: [who], place: a.place ?? "",
        text: `${str(a.name, 120)} died${c.cause ? `: ${str(c.cause, 200)}` : ""}.`}));
    }
    if ( c.embraced !== undefined && c.embraced !== null ) {
      const sire = a.lineage?.sire?.name ? person(a.lineage.sire) : null;
      out.push(normEntry({id: `embrace:${a.id}`, kind: "embrace", ...dated(c.embraced, dateOf), people: sire ? [who, sire] : [who], place: a.place ?? "",
        text: sire ? `${str(sire.name, 120)} Embraced ${str(a.name, 120)}.` : `${str(a.name, 120)} was Embraced; the sire is not known.`}));
    }
    if ( c.ghouled !== undefined && c.ghouled !== null ) {
      const dom = a.lineage?.domitor?.name ? person(a.lineage.domitor) : null;
      out.push(normEntry({id: `ghoul:${a.id}`, kind: "embrace", ...dated(c.ghouled, dateOf), people: dom ? [who, dom] : [who], place: a.place ?? "",
        text: dom ? `${str(a.name, 120)} became the ghoul of ${str(dom.name, 120)}.` : `${str(a.name, 120)} became a ghoul.`}));
    }
  }
  for ( const [id, r] of Object.entries(archived ?? {}) ) {
    if ( seen.has(id) || !r || r.kind === "copy" || r.died === null || r.died === undefined ) continue;
    out.push(normEntry({id: `death:${id}`, kind: "death", ...dated(r.died, dateOf), people: [{id, name: r.name}],
      text: `${str(r.name, 120)} died${r.cause ? `: ${str(r.cause, 200)}` : ""}.`}));
  }
  return out;
}

const LEDGER_WORDS = {boon: "boon", oath: "oath", debt: "debt", consequence: "consequence", objective: "objective"};
const BOON_SIZE = {trivial: "a trivial", minor: "a minor", major: "a major", blood: "a blood", life: "a life"};
/**
 * Ledger entries kept or broken. The date is the time the Ledger marked it (the last "Marked" line of its history),
 * else when it was made. Consequences and objectives are left out: they are the Storyteller's plans, not deeds.
 */
export function ledgerLines(entries = [], dateOf = () => ({})) {
  const out = [];
  for ( const e of entries ) {
    if ( !e?.id || !["kept", "broken"].includes(e.status) || !["boon", "oath", "debt"].includes(e.kind) ) continue;
    const mark = [...(e.history ?? [])].reverse().find(h => /^Marked /.test(String(h?.what ?? "")));
    const at = mark?.at ?? e.made ?? null;
    const from = person(e.from), to = person(e.to);
    const thing = e.kind === "boon" ? `${BOON_SIZE[e.size] ?? "a"} boon` : `${e.kind === "oath" ? "an" : "a"} ${LEDGER_WORDS[e.kind]}`;
    const who = from.name && to.name ? ` owed by ${from.name} to ${to.name}` : from.name ? ` of ${from.name}` : "";
    const what = str(e.what, 200).replace(/[.\s]+$/, "");
    out.push(normEntry({id: `ledger:${e.id}:${e.status}`, kind: "ledger", ...dated(at, dateOf), people: [from, to].filter(p => p.name),
      shown: e.kind === "boon",
      text: `${e.status === "kept" ? "Kept" : "Broken"}: ${thing}${who}${what ? ` (${what})` : ""}.`}));
  }
  return out;
}

/**
 * Seats as they stand now: {"<faction id>:<office key>": {faction, title, secret, holders: [{id, name}]}}. `factions`
 * are WoDX NPC factions with `titleOf(f, officeKey)` from the caller; `nameOf(id)` names an actor.
 */
export function officeSnapshot(factions = [], titleOf = (f, k) => k, nameOf = id => id) {
  const out = {};
  for ( const f of factions ) {
    for ( const [key, ids] of Object.entries(f?.politics?.offices ?? {}) ) {
      if ( !Array.isArray(ids) || !ids.length ) continue;
      out[`${f.id}:${key}`] = {faction: str(f.name, 120), title: str(titleOf(f, key), 80), secret: !!f.secret,
        holders: ids.map(id => ({id: String(id), name: str(nameOf(id), 120) || "Someone"}))};
    }
  }
  return out;
}

/**
 * Lines for seats won and lost between two snapshots. With no earlier snapshot, the seats held now go in as held
 * when the book began, so the first build is not empty.
 */
export function officeLines(prev, now, when = {}) {
  const out = [];
  const stamp = when.at ?? 0;
  const line = (key, s, h, verb) => normEntry({
    id: `office:${key}:${h.id}:${verb}:${stamp}`, kind: "office", ...when, people: [h], faction: s.faction, shown: !s.secret,
    text: verb === "held" ? `${h.name} held the seat of ${s.title} in ${s.faction} when this book began.`
      : verb === "won" ? `${h.name} took the seat of ${s.title} in ${s.faction}.` : `${h.name} lost the seat of ${s.title} in ${s.faction}.`
  });
  for ( const [key, s] of Object.entries(now ?? {}) ) {
    const before = new Set((prev?.[key]?.holders ?? []).map(h => h.id));
    for ( const h of s.holders ) if ( !before.has(h.id) ) out.push(line(key, s, h, prev ? "won" : "held"));
  }
  if ( prev ) for ( const [key, s] of Object.entries(prev) ) {
    const after = new Set((now?.[key]?.holders ?? []).map(h => h.id));
    for ( const h of s.holders ?? [] ) if ( !after.has(h.id) ) out.push(line(key, s, h, "lost"));
  }
  return out;
}

/**
 * Who holds each owned place now: {"<place uuid>": {place, owner: {id, name}, since}}. `places`: [{uuid, name,
 * owner: {id, name, since} | null}], the owner record from WoDX Storyteller (or an older place tag's name).
 */
export function holdingSnapshot(places = []) {
  const out = {};
  for ( const p of places ) {
    const o = p?.owner;
    if ( !p?.uuid || !o || !(o.id || o.name) ) continue;
    out[p.uuid] = {place: str(p.name, 160), owner: {id: str(o.id, 120) || null, name: str(o.name, 120) || "Someone"}, since: int(o.since)};
  }
  return out;
}

/**
 * Lines for places that changed hands. A place's record may say since when it is held; on the first build that
 * year dates the line, so a haven held since 1450 shows in 1450.
 */
export function holdingLines(prev, now, when = {}) {
  const out = [];
  const stamp = when.at ?? 0;
  const same = (a, b) => (a?.id && b?.id ? a.id === b.id : a?.name === b?.name);
  for ( const [uuid, s] of Object.entries(now ?? {}) ) {
    const was = prev?.[uuid];
    if ( !prev ) {
      const date = s.since !== null ? {at: null, year: s.since, month: null, day: null} : when;
      out.push(normEntry({id: `holding:${uuid}:held:${s.owner.id ?? s.owner.name}`, kind: "holding", ...date, people: [s.owner], place: s.place,
        text: s.since !== null ? `${s.place} came to ${s.owner.name}.` : `${s.owner.name} held ${s.place} when this book began.`}));
      continue;
    }
    if ( was && same(was.owner, s.owner) ) continue;
    out.push(normEntry({id: `holding:${uuid}:${s.owner.id ?? s.owner.name}:${stamp}`, kind: "holding", ...when,
      people: was ? [was.owner, s.owner] : [s.owner], place: s.place,
      text: was ? `${s.place} passed from ${was.owner.name} to ${s.owner.name}.` : `${s.place} came to ${s.owner.name}.`}));
  }
  if ( prev ) for ( const [uuid, s] of Object.entries(prev) ) {
    if ( now?.[uuid] ) continue;
    out.push(normEntry({id: `holding:${uuid}:none:${stamp}`, kind: "holding", ...when, people: [s.owner], place: s.place,
      text: `${s.owner.name} no longer holds ${s.place}.`}));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Building the book                                                  */
/* ------------------------------------------------------------------ */

/**
 * Add the gathered lines to the book. A line already in the book keeps its text and its shown switch. Event lines
 * follow `firedIds` (an event the clock took back leaves the book). Returns {legends, added}.
 */
export function merge(state, gathered, {firedIds = null, snap = null, built = null, cap = LEGENDS_CAP} = {}) {
  const s = normLegends(state);
  const have = new Map(s.entries.map(e => [e.id, e]));
  const added = [];
  for ( const e of gathered.map(normEntry) ) {
    if ( !e.id || have.has(e.id) ) continue;
    have.set(e.id, e); added.push(e);
  }
  let entries = [...have.values()];
  if ( firedIds ) {
    const live = new Set(firedIds.map(id => `event:${id}`));
    entries = entries.filter(e => e.kind !== "event" || live.has(e.id));
  }
  entries.sort(byDate);
  if ( entries.length > cap ) entries = entries.slice(entries.length - cap);
  return {legends: {...s, entries, snap: snap ?? s.snap, built: built ?? s.built}, added};
}

/** Is a line dated after today? `today` is {year, month, day}. */
export const ahead = (e, today) => !!today && e.year !== null && dateKey(e) > dateKey({year: today.year, month: today.month ?? 0, day: today.day ?? 0});

/**
 * The lines a filter keeps. All fields optional: kind, person (a name or id), place, faction (words in either),
 * from and to (years), text (words anywhere). `players: true` keeps only shown lines that are not ahead of today.
 */
export function filterEntries(entries = [], {kind = "", person = "", place = "", faction = "", from = null, to = null, text = "", players = false, today = null} = {}) {
  const low = v => String(v ?? "").trim().toLowerCase();
  const p = low(person), pl = low(place), fa = low(faction), q = low(text);
  const f = int(from), t = int(to);
  return entries.filter(e => (!kind || e.kind === kind)
    && (!p || e.people.some(x => x.id === person || low(x.name).includes(p)))
    && (!pl || low(e.place).includes(pl))
    && (!fa || low(e.faction).includes(fa))
    && (f === null || (e.year !== null && e.year >= f))
    && (t === null || (e.year !== null && e.year <= t))
    && (!q || low(`${e.text} ${e.place} ${e.faction} ${e.people.map(x => x.name).join(" ")}`).includes(q))
    && (!players || (e.shown && !ahead(e, today))));
}

/** The book's chapters: one per century that has lines, oldest first, with undated lines last. */
export function chapters(entries = []) {
  const map = new Map();
  for ( const e of [...entries].sort(byDate) ) {
    const c = e.year === null ? null : Math.floor(e.year / 100) * 100;
    if ( !map.has(c) ) map.set(c, []);
    map.get(c).push(e);
  }
  return [...map.entries()].sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
    .map(([c, list]) => ({century: c, name: c === null ? "Undated" : `${c} to ${c + 99}`, entries: list}));
}

/** The names, places and factions in the book, for the window's pick lists. */
export function indexOf(entries = []) {
  const people = new Set(), places = new Set(), factions = new Set();
  for ( const e of entries ) {
    for ( const p of e.people ) if ( p.name ) people.add(p.name);
    if ( e.place ) places.add(e.place);
    if ( e.faction ) factions.add(e.faction);
  }
  const sort = s => [...s].sort((a, b) => a.localeCompare(b));
  return {people: sort(people), places: sort(places), factions: sort(factions)};
}
