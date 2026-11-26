/**
 * An inquisitor cell to live in (B7891-B7898): the daily round under the Marzonian Rule, chapter three times a week,
 * the rector and officers, the chapter-house with its rent and its pooled dots, a named Flock, confession at chapter,
 * and the household of the faithful before the Inquisition. Pure rules; cell.mjs keeps the record and the window.
 *
 *   The Rule (Dark Ages: Inquisitor Companion pp. 71-73): at least one service of the divine office a day together, a
 *   common meal, and chapter three times a week. WoDX reads a week of it as kept when a member keeps the office and the
 *   meal on four days of seven and the cell holds three chapters; a member who keeps fewer has disobeyed the Rule, a
 *   sin at 6 (Companion p. 73, B7891). Only from 1223: before it there is no Inquisition and no Rule (B7898).
 *   The rector (pp. 74-75): set by the Council of Faith; after a full year the cell may elect another. Officers are
 *   voted, the rector may veto; with the rector gone the sub-rector leads until a new one is chosen (B7892).
 *   The chapter-house (pp. 75-77; Dark Ages: Inquisitor pp. 155-156): rented or lent, never the cell's own; the rent
 *   is due on time, with the lands and servants kept. Each pooled dot of Chapter-House goes to size, security (+1 to
 *   break in), Holy Ground (+1) or cells for three prisoners (B7893).
 *   The Flock (DA:I p. 156; Companion p. 77): the cell's congregation, by name; joint prayer draws on it (B7894).
 *   Confession (Companion p. 80): a sin confessed at chapter is penanced, and the sinner stays (perhaps sent to
 *   another cell); one hidden and found out is judged harder: WoDX sends them back to the Council (B7897).
 *   Sanctification of the Homestead (Companion p. 116): a day's ward per success; a botch bars it three days (B7896).
 */
import {DAY, WEEK, MONTH as MONTH_LEN, YEAR as YEAR_LEN} from "../core/terms.mjs";

export const REF = "Dark Ages: Inquisitor Companion";
export const DAI = "Dark Ages: Inquisitor";
export const RULE_FROM = 1223;
export const YEAR = YEAR_LEN;
export const MONTH = MONTH_LEN;
export const ROUND = {office: "The divine office, together", meal: "The common meal"};
export const KEEP_DAYS = 4;
export const CHAPTERS_A_WEEK = 3;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const int = v => Math.trunc(num(v));
const str = (v, n = 200) => String(v ?? "").trim().slice(0, n);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const opt = v => (v === null || v === undefined || v === "" ? null : num(v));

/** The officers a cell votes in (p. 75). */
export const OFFICERS = {subrector: "Sub-rector", treasurer: "Treasurer", archivist: "Archivist", cellarer: "Cellarer"};

/** Kinds of chapter-house (pp. 75-77), with who owns it and what keeping it asks. */
export const HOUSES = {
  quartered: {label: "Quartered in another order's priory or abbey", owner: "the house's own order", keep: "Sleep and services there; lay members and women of the cell lodge elsewhere."},
  priory: {label: "A priory rented from another order", owner: "the order that rents it", keep: "Rent on time, the building kept in good order."},
  manor: {label: "A manor bequeathed to an order of the Inquisition", owner: "the order", keep: "Its lands and servants overseen, the house kept in good order."},
  townhouse: {label: "A town house of a Murnau or an Eye of God", owner: "the member who lends it", keep: "Its servants overseen, and its rent if it is let."},
  church: {label: "A small church in the care of the cell's priest", owner: "the diocese", keep: "The priest's duty to the parish as well as to the Inquisition."},
  presbytery: {label: "A priest's house (before the Inquisition)", owner: "the parish", keep: "The priest's own duties; no Rule binds the household."}
};
/** Size by dots (DA:I p. 155). */
export const SIZES = ["Rooms in someone else's house", "A small house or church building inside a larger community", "A small church or town building to work and sleep in",
  "A fortified building, a wing of a castle or monastery, or several houses on a street", "A small country estate, castle or several town houses, with staff", "A whole religious community ordered to support the cell"];

export function blank() {
  return {name: "", precursor: false, founded: null, rector: null, rectorSince: null, officers: {}, members: [], days: {}, chapters: [], lastReckon: null,
    house: normHouse({}), flock: {name: "", rating: 0, notes: ""}, sins: [], reckonings: []};
}
export function normHouse(h = {}) {
  const pts = k => clamp(int(h[k]), 0, 10);
  return {kind: HOUSES[h.kind] ? h.kind : "priory", name: str(h.name, 160), disguise: str(h.disguise, 200), rent: str(h.rent, 80),
    paidUntil: opt(h.paidUntil), servants: str(h.servants, 200), lands: str(h.lands, 200), pooled: pts("pooled"),
    size: pts("size"), security: pts("security"), holy: pts("holy"), prisons: pts("prisons"), wardUntil: opt(h.wardUntil), noWardUntil: opt(h.noWardUntil)};
}
export function normMember(m = {}) {
  return {id: str(m.id, 40) || null, name: str(m.name, 120), lay: !!m.lay};
}
export function normState(s = {}) {
  const b = {...blank(), ...(s ?? {})};
  const days = {};
  for ( const [k, v] of Object.entries(b.days ?? {}) ) {
    if ( !v || typeof v !== "object" ) continue;
    days[k] = Object.fromEntries(Object.keys(ROUND).map(r => [r, [...new Set((Array.isArray(v[r]) ? v[r] : []).map(int))].slice(-60)]));
  }
  const officers = Object.fromEntries(Object.entries(b.officers ?? {}).filter(([k, v]) => OFFICERS[k] && v).map(([k, v]) => [k, str(v, 40)]));
  const fl = b.flock ?? {};
  return {name: str(b.name, 160), precursor: !!b.precursor, founded: opt(b.founded), rector: b.rector ? str(b.rector, 40) : null, rectorSince: opt(b.rectorSince), officers,
    members: (Array.isArray(b.members) ? b.members : []).map(normMember).filter(m => m.id), days,
    chapters: (Array.isArray(b.chapters) ? b.chapters : []).map(num).slice(-30), lastReckon: opt(b.lastReckon), house: normHouse(b.house),
    flock: {name: str(fl.name, 160), rating: clamp(int(fl.rating), 0, 5), notes: str(fl.notes, 300)},
    sins: (Array.isArray(b.sins) ? b.sins : []).slice(-20), reckonings: (Array.isArray(b.reckonings) ? b.reckonings : []).slice(-12)};
}

/** Is the Rule in force in this year, for this cell? (No Inquisition before 1223, Companion p. 71.) */
export const ruleOn = (s, year) => !normState(s).precursor && int(year) >= RULE_FROM;

/* ---- The daily round and chapter ---- */

export const dayOf = t => Math.floor(num(t) / DAY);

export function markRound(s, actorId, kind, t) {
  const st = normState(s), d = dayOf(t);
  if ( !ROUND[kind] ) return {state: st, fresh: false};
  const cur = st.days[actorId] ?? {office: [], meal: []};
  if ( cur[kind].includes(d) ) return {state: st, fresh: false};
  return {state: {...st, days: {...st.days, [actorId]: {...cur, [kind]: [...cur[kind], d]}}}, fresh: true};
}
export function holdChapter(s, t) {
  const st = normState(s);
  if ( st.chapters.some(c => dayOf(c) === dayOf(t)) ) return {state: st, fresh: false};
  return {state: {...st, chapters: [...st.chapters, num(t)]}, fresh: true};
}

/**
 * The week's reckoning. from/to: the week. Who kept the Rule, who broke it, and whether the cell held its chapters.
 * pcs: ids of players' inquisitors (only they get the sin prompt).
 */
export function reckonWeek(s, from, to, {year = 0, pcs = []} = {}) {
  const st = normState(s), a = dayOf(from), b = dayOf(to), on = ruleOn(st, year), pc = new Set(pcs);
  const inWeek = list => (list ?? []).filter(d => d >= a && d < b).length;
  const chapters = st.chapters.filter(c => dayOf(c) >= a && dayOf(c) < b).length;
  const rows = st.members.map(m => {
    const d = st.days[m.id] ?? {};
    const office = inWeek(d.office), meal = inWeek(d.meal);
    return {...m, office, meal, kept: office >= KEEP_DAYS && meal >= KEEP_DAYS};
  });
  const sins = on ? rows.filter(r => !r.kept && pc.has(r.id)).map(r => ({id: r.id, name: r.name, event: "disobey",
    why: `kept the office on ${r.office} and the common meal on ${r.meal} of seven days, against the Rule`})) : [];
  return {on, rows, chapters, chaptersKept: chapters >= CHAPTERS_A_WEEK, sins};
}
export const reckonDue = (s, t) => { const st = normState(s); return st.lastReckon === null || num(t) - st.lastReckon >= WEEK; };

/* ---- The rector and officers ---- */

/** May the cell elect its own rector? A full year after the rector was set (p. 74); never for a precursor household. */
export function electionOpen(s, t) {
  const st = normState(s);
  if ( st.precursor ) return {ok: false, why: "A household of the faithful has no Council of Faith to set or confirm a rector."};
  if ( !st.rector ) return {ok: true, why: "The cell has no rector: the sub-rector leads until one is chosen."};
  const since = st.rectorSince ?? st.founded ?? num(t);
  if ( num(t) - since < YEAR ) return {ok: false, why: `The cell may elect its own rector after a full year in the field (${REF} p. 74); ${Math.ceil((YEAR - (num(t) - since)) / DAY)} days to go.`};
  return {ok: true, why: `A year in the field: the cell may hold an election (${REF} p. 74).`};
}
/** Vote in an officer; the rector's veto stops it (p. 75). */
export function setOfficer(s, office, actorId, {veto = false} = {}) {
  const st = normState(s);
  if ( !OFFICERS[office] ) return {state: st, ok: false, why: "No such office."};
  if ( veto ) return {state: st, ok: false, why: `The rector vetoes it (${REF} p. 75).`};
  return {state: {...st, officers: {...st.officers, [office]: actorId}}, ok: true};
}
/** The rector is gone: the sub-rector leads for now (p. 75). */
export function rectorGone(s) {
  const st = normState(s);
  const sub = st.officers.subrector ?? null;
  return {state: {...st, rector: null, rectorSince: null}, acting: sub};
}
/** Who leads now: the rector, or the sub-rector while there is none. */
export const leader = s => { const st = normState(s); return st.rector ?? st.officers.subrector ?? null; };

/* ---- The chapter-house ---- */

/** The pooled dots, spent: size, security, Holy Ground and prisons may not pass what was pooled (DA:I p. 155). */
export function houseSpend(h) {
  const x = normHouse(h);
  const spent = x.size + x.security + x.holy + x.prisons;
  if ( spent > x.pooled ) return {ok: false, why: `${spent} dots spent of ${x.pooled} pooled.`};
  return {ok: true, left: x.pooled - spent, sizeLabel: SIZES[Math.min(5, x.size)], breakIn: x.security, holy: x.holy, prisoners: 3 * x.prisons};
}
/** Is the rent owed? WoDX counts it monthly from the day it was last paid up to (B7893). */
export const rentOwed = (h, t) => { const x = normHouse(h); return !!x.rent && (x.paidUntil === null || num(t) >= x.paidUntil); };
export const payRent = (h, t) => { const x = normHouse(h); return {...x, paidUntil: Math.max(num(t), x.paidUntil ?? 0) + MONTH}; };
/** Sanctification of the Homestead: a day's ward per success; a botch bars it for three days (Companion p. 116). */
export function homestead(h, {successes = 0, botch = false} = {}, t = 0) {
  const x = normHouse(h);
  if ( x.noWardUntil !== null && num(t) < x.noWardUntil ) return {house: x, ok: false, line: `Not again on this house for ${Math.ceil((x.noWardUntil - num(t)) / DAY)} more days (${REF} p. 116).`};
  if ( botch ) return {house: {...x, noWardUntil: num(t) + 3 * DAY}, ok: true, line: `A botch: the rite may not be tried on this house for three days (${REF} p. 116).`};
  if ( successes <= 0 ) return {house: x, ok: true, line: "The rite takes no hold."};
  return {house: {...x, wardUntil: Math.max(num(t), x.wardUntil ?? 0) + successes * DAY}, ok: true,
    line: `No demon-ridden or inhuman thing enters for ${successes} day${successes === 1 ? "" : "s"} unless someone inside invites it. Walls can still be broken from outside (${REF} p. 116).`};
}
export const warded = (h, t) => { const x = normHouse(h); return x.wardUntil !== null && num(t) < x.wardUntil; };

/** What a member's sheet carries of the cell: read by WoDX Actions in prayer and on waking (B7893-B7894). */
export function sheetLink(s, key) {
  const st = normState(s);
  return {key, name: st.name, house: st.house.name, holy: st.house.holy, flock: st.flock.rating, flockName: st.flock.name};
}

/* ---- Confession at chapter (Companion p. 80) ---- */

export function sinAtChapter(s, {id, name, what = "", confessed = true}, t = 0) {
  const st = normState(s);
  const row = {id, name: str(name, 120), what: str(what, 200), confessed: !!confessed, at: num(t)};
  if ( confessed ) return {state: {...st, sins: [...st.sins, row]}, leaves: false,
    line: `${row.name} confesses at chapter${row.what ? ` (${row.what})` : ""}: penance from the rector, and they stay in the Inquisition, perhaps sent to another cell (${REF} p. 80).`};
  return {state: {...st, sins: [...st.sins, row], members: st.members.filter(m => m.id !== id), rector: st.rector === id ? null : st.rector,
    officers: Object.fromEntries(Object.entries(st.officers).filter(([, v]) => v !== id))}, leaves: true,
    line: `${row.name} hid a sin${row.what ? ` (${row.what})` : ""} and it came out. One who hides one sin may hide worse: they are sent to the Council of Faith for judgment and leave the cell (${REF} p. 80).`};
}
