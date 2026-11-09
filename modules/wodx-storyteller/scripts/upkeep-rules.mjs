/**
 * Between nights and the ties that need tending, the pure part. No Foundry in here.
 *
 * Between nights: when the clock skips days, what those nights cost and give back. Rising costs a vampire one blood
 * a night (VtDA20 p. 340), Willpower comes back one a night under that house rule (VtDA20 p. 309). Healing over the
 * skip is WoDX Actions' own (it heals with the clock), so it is only noted here.
 *
 * Ties: what a character has to keep up. A ghoul's drink from the domitor (V20 Dark Ages p. 399), a wraith's Fetters
 * and Passions (neglect checks, Wraith 20th pp. 306, 309), and backgrounds that are people or places (Herd, Domain,
 * Retainers, Allies, Contacts, Kinfolk, Mentor). How often each needs tending is a house rule; the Storyteller can
 * change it per tie.
 */

export const DAY = 86400;

/** Kinds of tie: label, default days between tendings, and what happens when it goes untended. */
export const TIE_KINDS = {
  vitae: {label: "Vitae from the domitor", days: 30, lapse: "Without a drink the ghoul's blood runs low, the Disciplines fade and the years come back (V20 Dark Ages p. 399).", act: "Drink, withdrawal, day (WoDX Actions ghoul menu)"},
  fetter: {label: "Fetter", days: 30, lapse: "A neglect check for this Fetter: its rating at difficulty 9; failure costs a dot, a botch two (Wraith 20th p. 309).", act: "Fetters: neglect check (WoDX Actions wraith menu)"},
  passion: {label: "Passion", days: 30, lapse: "A neglect check for this Passion: its rating at difficulty 9 (Wraith 20th p. 306).", act: "Passions: neglect check (WoDX Actions wraith menu)"},
  herd: {label: "Herd", days: 30, lapse: "The herd thins if nobody keeps it: an upkeep roll, or the Storyteller lowers it a dot.", act: "Feed from the herd (WoDX Actions backgrounds)"},
  domain: {label: "Domain", days: 7, lapse: "An untended domain slips: a rival hunts there, the herd thins.", act: "Domain upkeep (WoDX Actions backgrounds)"},
  people: {label: "Allies, contacts, retainers", days: 30, lapse: "People who are not seen to drift away: a scene with them, or the Storyteller lowers the background a dot.", act: "A scene or a message"},
  kinfolk: {label: "Kinfolk", days: 30, lapse: "Kin who are not visited forget, or fall to the Wyrm's servants.", act: "A visit"},
  mentor: {label: "Mentor", days: 60, lapse: "A mentor who is not visited stops answering.", act: "A visit"},
  custom: {label: "Other", days: 30, lapse: "The Storyteller decides.", act: ""}
};

/** Background names that make a tie, lower case, to the kind of tie. */
export const BACKGROUND_TIES = [
  [/^herd/, "herd"], [/^domain|^hunting grounds/, "domain"], [/^retainer/, "people"], [/^allies|^ally/, "people"],
  [/^contacts?/, "people"], [/^kinfolk/, "kinfolk"], [/^mentor/, "mentor"], [/^dependents?/, "people"]
];

export function tieKindOfBackground(name) {
  const s = String(name ?? "").trim().toLowerCase();
  for ( const [re, kind] of BACKGROUND_TIES ) if ( re.test(s) ) return kind;
  return null;
}

/** A flag key with no dots (Foundry splits flag keys on dots). */
export const tieKey = (kind, id) => `${kind}-${String(id ?? "").replace(/[^A-Za-z0-9_-]/g, "_")}`;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** A clean stored tie. */
export function normTie(t = {}, key = "") {
  const kind = TIE_KINDS[t.kind] ? t.kind : "custom";
  const every = Math.max(1, Math.min(3650, Math.round(num(t.every) || TIE_KINDS[kind].days)));
  return {key: String(t.key ?? key), kind, name: String(t.name ?? TIE_KINDS[kind].label).slice(0, 120), every,
    last: Number.isFinite(Number(t.last)) && t.last !== null && t.last !== "" ? Number(t.last) : null,
    note: String(t.note ?? "").slice(0, 300), custom: !!t.custom, off: !!t.off, warned: Number.isFinite(Number(t.warned)) && t.warned !== null ? Number(t.warned) : null};
}

/**
 * Every tie a character has: derived from the sheet, with what is stored (last tended, period, off) laid over it.
 * @param {object} view  {line, ghoul: {domitor: {id, name}|null, lastDrink: number|null}, items: [{id, name, type, value}], stored: {key: tie}}
 * @param {number} now
 * @returns {{ties: object[], fresh: string[]}}  fresh = keys seen for the first time (their clock starts now)
 */
export function deriveTies(view = {}, now = 0) {
  const stored = view.stored ?? {};
  const out = [], fresh = [];
  const put = (key, base) => {
    const s = stored[key];
    const t = normTie({...(s ?? {}), kind: base.kind, name: base.name, custom: false, last: Number.isFinite(base.last) ? base.last : (s?.last ?? null)}, key);
    if ( t.last === null ) {
      t.last = Number.isFinite(base.last) ? base.last : now;
      if ( !s ) fresh.push(key);
    }
    out.push(t);
  };
  const g = view.ghoul;
  if ( g?.domitor ) {
    // The drink the lineage records is the last tending, unless the Storyteller marked a later one
    const s = stored[tieKey("vitae", g.domitor.id)];
    const last = Math.max(num(s?.last ?? -Infinity), Number.isFinite(g.lastDrink) ? g.lastDrink : -Infinity);
    put(tieKey("vitae", g.domitor.id), {kind: "vitae", name: `Vitae from ${g.domitor.name}`, last: Number.isFinite(last) ? last : undefined});
  }
  for ( const it of view.items ?? [] ) {
    if ( it.type === "fetter" ) put(tieKey("fetter", it.id), {kind: "fetter", name: `Fetter: ${it.name}`});
    else if ( it.type === "passion" ) put(tieKey("passion", it.id), {kind: "passion", name: `Passion: ${it.name}`});
    else if ( it.type === "background" && num(it.value) > 0 ) {
      const kind = tieKindOfBackground(it.name);
      if ( kind ) put(tieKey(kind, it.id), {kind, name: `${it.name} ${num(it.value)}`});
    }
  }
  for ( const [key, s] of Object.entries(stored) ) {
    if ( !s?.custom ) continue;
    out.push(normTie({...s, custom: true}, key));
  }
  return {ties: out, fresh};
}

/** When a tie next needs tending, and whether it is due now. */
export function tieStatus(tie, now) {
  const t = normTie(tie, tie?.key);
  const next = num(t.last) + t.every * DAY;
  const due = !t.off && now >= next;
  const over = due ? Math.floor((now - next) / DAY) : 0;
  return {...t, next, due, overdueDays: over, lapses: due ? 1 + Math.floor(over / t.every) : 0};
}

/** The ties that have come due and have not been warned about since they came due. */
export function newlyDue(ties, now) {
  return ties.map(t => tieStatus(t, now)).filter(t => t.due && !(t.warned !== null && t.warned >= t.next));
}

/** Whole nights the clock passed over. */
export function nightsBetween(from, to) {
  const d = num(to) - num(from);
  return d > 0 ? Math.floor(d / DAY) : 0;
}

/**
 * What the skipped nights do to one character. Pure: returns lines to show and the changes as amounts to add
 * ({blood: -3, willpower: 2}), so they still make sense if the sheet moved before the Storyteller approved.
 * @param {object} c  {name, vampire, torpor, golconda, blood: {value, max}, willpower: {temp, perm}, wounded}
 * @param {object} o  {nights, willpowerMode: "night"|"story"|"off", nightlyBlood, lastNightHandled}
 *   lastNightHandled: the nightfall card's New Night will settle the last night, so count one fewer
 */
export function betweenPlan(c = {}, {nights = 0, willpowerMode = "night", nightlyBlood = true, lastNightHandled = false} = {}) {
  const lines = [], delta = {};
  const n = Math.max(0, Math.floor(num(nights)) - (lastNightHandled ? 1 : 0));
  if ( n <= 0 ) return {nights: 0, lines, delta};
  if ( c.vampire && !c.torpor && nightlyBlood ) {
    const cost = c.golconda ? Math.floor(n / 7) : n;
    const b = num(c.blood?.value), after = Math.max(0, b - cost);
    if ( cost > 0 ) {
      delta.blood = after - b;
      lines.push({key: "blood", text: `Rising costs ${cost} blood over ${n} ${n === 1 ? "night" : "nights"}${c.golconda ? " (Golconda: one a week)" : ""}: ${b} to ${after}.`,
        warn: after <= 0 ? "No blood left: ravenous, frenzy likely. Feed with the Hunt button." : (cost > b ? "It would have cost more than the pool holds: the Storyteller decides whether they fed." : null)});
    }
  }
  if ( !c.torpor && willpowerMode === "night" ) {
    const t = num(c.willpower?.temp), p = num(c.willpower?.perm), to = Math.min(p, t + n);
    if ( to > t ) { delta.willpower = to - t; lines.push({key: "willpower", text: `Willpower comes back one a night: ${t} to ${to}.`}); }
  }
  if ( c.torpor ) lines.push({key: "torpor", text: "In torpor: no blood spent, no Willpower back."});
  if ( c.wounded ) lines.push({key: "wounds", text: "Wounds heal with the clock (WoDX Actions has already worked out the healing for the skip)."});
  return {nights: n, lines, delta};
}

/** The plain words for a length of days. */
export function daysWords(days) {
  const d = Math.max(0, Math.round(num(days)));
  if ( d >= 60 ) return `${Math.round(d / 30)} months`;
  if ( d >= 14 ) return `${Math.round(d / 7)} weeks`;
  return `${d} ${d === 1 ? "day" : "days"}`;
}

/* ---------------- Hunting grounds and heat ---------------- */

/** Heat on a place, house rule: each hunt there adds 1, a botch or a feeding seen adds 2, it cools 1 a week. */
export const HEAT = {hunt: 1, botch: 2, seen: 2, coolDays: 7, max: 10};

export const HEAT_BANDS = [
  {min: 7, name: "Hunted", diff: 2, note: "The authorities of the era are looking for whoever does this. A response is ready for the approval queue."},
  {min: 5, name: "Watched", diff: 2, note: "People here lock doors and walk in pairs; someone is asking questions."},
  {min: 3, name: "Uneasy", diff: 1, note: "Talk of the attacks; the prey is wary."},
  {min: 0, name: "Quiet", diff: 0, note: "Nobody has noticed anything."}
];

export function heatBand(heat) {
  const h = Math.max(0, Math.min(HEAT.max, num(heat)));
  return HEAT_BANDS.find(b => h >= b.min) ?? HEAT_BANDS[HEAT_BANDS.length - 1];
}

/** Heat after time has passed: one less for every full week since it last changed. */
export function cooled(heat, since, now) {
  const weeks = Math.floor(Math.max(0, num(now) - num(since)) / (HEAT.coolDays * DAY));
  return Math.max(0, num(heat) - weeks);
}

/** A clean place record (scene flag). */
export function normHunt(h = {}) {
  return {area: typeof h.area === "string" && h.area ? h.area : null, heat: Math.max(0, Math.min(HEAT.max, Math.round(num(h.heat)))),
    since: num(h.since), responded: Number.isFinite(Number(h.responded)) && h.responded !== null ? Number(h.responded) : null};
}

/** Add heat from an event ("hunt", "botch", "seen") at time `now`, cooling first. */
export function addHeat(h, kind, now) {
  const cur = normHunt(h);
  const base = cooled(cur.heat, cur.since, now);
  const heat = Math.min(HEAT.max, base + (HEAT[kind] ?? 0));
  return {...cur, heat, since: now, before: base, crossed: heatBand(heat).name !== heatBand(base).name};
}

/**
 * Who answers when a place gets hot, by the year. Hunters follow the era's line: inquisitors in the Dark Ages,
 * Hunters Hunted II until 1998, Hunter: The Reckoning from 1999.
 */
export const RESPONSES = [
  {to: 1499, who: "The Church and the Inquisition", text: "Priests preach against the night-walker; a friar with letters from the bishop asks after the dead. Inquisitors may follow (Dark Ages: Inquisitor)."},
  {to: 1799, who: "Witch-finders and the parish watch", text: "The watch doubles its rounds after dark, and a witch-finder comes to hear the gossip. The hunted are named in sermons."},
  {to: 1889, who: "The constables", text: "Constables walk the streets in pairs and the coroner asks questions. Broadsheets print the worst of it."},
  {to: 1998, who: "The police and the press", text: "Detectives work the case and a reporter smells a story. Mortal hunters take notice (Hunters Hunted II)."},
  {to: 9999, who: "Cameras, police and the imbued", text: "Cameras catch a face, the police link the cases, and the imbued begin to gather (Hunter: The Reckoning)."}
];

export function responseFor(year) {
  const y = num(year);
  return RESPONSES.find(r => y <= r.to) ?? RESPONSES[RESPONSES.length - 1];
}

/** Hunting difficulty in a place: the ground's own, plus the heat's. */
export function heatDifficulty(heat) { return heatBand(heat).diff; }
