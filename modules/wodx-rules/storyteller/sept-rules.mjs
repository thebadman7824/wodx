/**
 * A sept to live in (B7874-B7878): the daily work of a caern, the monthly moot and its business, rites taught by an
 * elder for tribute, and the news a Dark Ages sept talks about. Pure rules; sept.mjs keeps the record and the window.
 *
 *   Chores (Dark Ages: Werewolf p. 167): each Garou of the sept has a share of the caern's work. A month of it done wins
 *   a point of Honor; a month of it failed costs two (p. 99). WoDX reads "a month" as the days between two moots and
 *   counts a share kept on three days in four as done, and one kept on fewer than one day in four as failed (B7875).
 *   The moot (pp. 29-30): monthly, at the full moon. A Garou of the sept who stays away loses a point of Wisdom (p. 99).
 *   Rites (pp. 144-145): only taught, never bought with experience. A week per level under an elder who asks tribute;
 *   each week Intelligence + Rituals (WoDX reads the difficulty as 10 minus Intelligence, B7877); a failed week costs a
 *   Willpower point to go on, and a botch means waiting three full moons. No rite above the student's Rituals.
 *   News (pp. 35-36, 74): the ten prophecies that came about 1200, the fall of Constantinople in 1204 that fulfilled the
 *   Warders' own, and the concolation called after it (B7878).
 */
import {DAY, WEEK as WEEK_LEN, LUNAR_MONTH} from "../core/terms.mjs";

export const REF = "Dark Ages: Werewolf";
export const WEEK = WEEK_LEN;
export const MOON = LUNAR_MONTH;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const int = v => Math.trunc(num(v));
const str = (v, n = 200) => String(v ?? "").trim().slice(0, n);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// B8065: an id of 16 letters and digits, the shape Foundry's randomID gives, made here so the rules core needs no Foundry
const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const rid = () => Array.from({length: 16}, () => ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]).join("");

/** The caern's daily work (p. 167), each with what it keeps going. */
export const CHORES = {
  fields: {label: "Tending the Kinfolk's fields", does: "The kin's crops come in, and the lord's tax with them."},
  barns: {label: "Building shelters and barns", does: "The kin and their beasts are housed through the winter."},
  firewood: {label: "Gathering firewood", does: "The hearths in the Kinfolk quarters stay lit."},
  watch: {label: "Keeping watch on the bawn", does: "Nothing comes into the bawn unseen."},
  spirits: {label: "Keeping faith with the caern's spirits", does: "The spirits stay friendly to the sept."},
  song: {label: "Song and drumming for the caern", does: "The caern's heart is sung to and stays strong."}
};
export const CHORE_DONE = 0.75;
export const CHORE_FAILED = 0.25;

/** The record. members: [{id, name, chore}], days: {actorId: [day numbers worked]}. */
export function blank() {
  return {members: [], days: {}, since: null, lastMoot: null, lessons: [], challenges: [], news: [], moots: []};
}

export function normMember(m = {}) {
  return {id: str(m.id, 40) || null, name: str(m.name, 120), chore: CHORES[m.chore] ? m.chore : "fields"};
}
export function normLesson(l = {}) {
  const level = clamp(int(l.level) || 1, 1, 5);
  return {id: str(l.id, 40) || rid(), student: str(l.student, 40), studentName: str(l.studentName, 120), teacher: str(l.teacher, 120),
    rite: str(l.rite, 120), level, tribute: str(l.tribute, 300), weeks: clamp(int(l.weeks), 0, level), lastWeek: l.lastWeek === null || l.lastWeek === undefined ? null : num(l.lastWeek),
    waitUntil: l.waitUntil === null || l.waitUntil === undefined ? null : num(l.waitUntil), stalled: !!l.stalled,
    state: ["learning", "learned", "waiting", "given-up"].includes(l.state) ? l.state : "learning", log: Array.isArray(l.log) ? l.log.slice(-12).map(x => str(x, 200)) : []};
}
export function normChallenge(c = {}) {
  return {id: str(c.id, 40) || rid(), actorId: str(c.actorId, 40), name: str(c.name, 120), rank: clamp(int(c.rank), 1, 5),
    task: str(c.task, 300), benefactor: str(c.benefactor, 120), state: ["waiting", "set", "passed", "failed"].includes(c.state) ? c.state : "waiting", at: num(c.at)};
}
export function normState(s = {}) {
  const b = {...blank(), ...(s ?? {})};
  const days = {};
  for ( const [k, v] of Object.entries(b.days ?? {}) ) if ( Array.isArray(v) ) days[k] = [...new Set(v.map(int))].slice(-90);
  return {members: (Array.isArray(b.members) ? b.members : []).map(normMember).filter(m => m.id),
    days, since: b.since === null || b.since === undefined ? null : num(b.since), lastMoot: b.lastMoot === null || b.lastMoot === undefined ? null : num(b.lastMoot),
    lessons: (Array.isArray(b.lessons) ? b.lessons : []).map(normLesson), challenges: (Array.isArray(b.challenges) ? b.challenges : []).map(normChallenge),
    news: (Array.isArray(b.news) ? b.news : []).map(x => str(x, 40)), moots: (Array.isArray(b.moots) ? b.moots : []).slice(-12)};
}

/* ---- Chores ---- */

export const dayOf = t => Math.floor(num(t) / DAY);

/** Mark a member's share done for the day of `t`. */
export function markChore(s, actorId, t) {
  const st = normState(s), d = dayOf(t);
  const list = st.days[actorId] ?? [];
  if ( list.includes(d) ) return {state: st, fresh: false};
  return {state: {...st, days: {...st.days, [actorId]: [...list, d]}, since: st.since ?? num(t)}, fresh: true};
}

/**
 * The month's reckoning for one member: days worked of the days between `from` and `to`.
 * @returns {{worked, of, share, deed: "chores-month"|"chores-failed"|null}}
 */
export function reckonChores(days = [], from, to) {
  const a = dayOf(from), b = dayOf(to);
  const of = Math.max(1, b - a);
  const worked = (days ?? []).filter(d => d >= a && d < b).length;
  const share = worked / of;
  return {worked, of, share, deed: share >= CHORE_DONE ? "chores-month" : share < CHORE_FAILED ? "chores-failed" : null};
}

/* ---- The moot ---- */

/** Is the moon full enough for the sept moot? Moon index 4 of 0-7 (the moon's eight phases, full at 4). */
export const mootMoon = index => int(index) === 4;

/**
 * The moot's business: who stayed away, the month's chores, the rank challenges waiting, the lessons, and the news.
 * members: [{id, name, pc}], present: [ids], days: the record's days, from/to: the month; date: [y, m, d] now.
 */
export function mootBusiness(s, {present = [], pcs = [], from = 0, to = 0, date = null} = {}) {
  const st = normState(s), here = new Set(present), pcSet = new Set(pcs);
  const absent = st.members.filter(m => !here.has(m.id));
  const chores = st.members.map(m => ({...m, ...reckonChores(st.days[m.id], from, to)}));
  const deeds = [];
  for ( const m of absent ) if ( pcSet.has(m.id) ) deeds.push({id: m.id, name: m.name, deed: "missed-moot", why: "stayed away from the moot"});
  for ( const c of chores ) if ( c.deed && pcSet.has(c.id) ) deeds.push({id: c.id, name: c.name, deed: c.deed, why: `${c.worked} of ${c.of} days of ${CHORES[c.chore].label.toLowerCase()}`});
  const news = date ? newsDue(st.news, date) : [];
  return {absent, chores, deeds, challenges: st.challenges.filter(c => c.state === "waiting" || c.state === "set"),
    lessons: st.lessons.filter(l => l.state === "learning" || l.state === "waiting"), news};
}

/* ---- Rites taught by an elder ---- */

export const lessonDiff = intelligence => clamp(10 - int(intelligence), 3, 9);
export const WAIT_MOONS = 3;

/** May this student begin this rite? (No rite above the student's Rituals, p. 145.) */
export function canLearn(level, rituals) {
  if ( int(level) > int(rituals) ) return {ok: false, why: `A rite of level ${int(level)} needs Rituals ${int(level)}; the student has ${int(rituals)} (${REF} p. 145).`};
  return {ok: true};
}

/** Is a week's lesson due? (A week since the last.) A botched student waits three full moons. */
export function lessonDue(l, t) {
  const x = normLesson(l);
  if ( x.state === "learned" || x.state === "given-up" ) return false;
  if ( x.waitUntil !== null && num(t) < x.waitUntil ) return false;
  return x.lastWeek === null || num(t) - x.lastWeek >= WEEK;
}

/**
 * A week of teaching. roll: {successes, botch}; willpower: does the student spend a point to go on after a failure.
 * @returns {{lesson, line, learned, spend}}
 */
export function lessonWeek(l, {successes = 0, botch = false} = {}, t = 0, {willpower = true} = {}) {
  const x = normLesson(l);
  if ( botch ) {
    const out = {...x, state: "waiting", waitUntil: num(t) + WAIT_MOONS * MOON, lastWeek: num(t), stalled: false};
    const line = `A botch: not yet worthy of the ${x.rite}. Three full moons before trying again (${REF} p. 145).`;
    return {lesson: {...out, log: [...x.log, line]}, line, learned: false, spend: 0};
  }
  if ( successes <= 0 ) {
    if ( !willpower ) {
      const line = "The week is lost, and without Willpower to go on the lessons stop.";
      return {lesson: {...x, state: "given-up", lastWeek: num(t), log: [...x.log, line]}, line, learned: false, spend: 0};
    }
    const line = "A hard week: a point of Willpower to go on with the lessons.";
    return {lesson: {...x, state: "learning", waitUntil: null, lastWeek: num(t), log: [...x.log, line]}, line, learned: false, spend: 1};
  }
  const weeks = x.weeks + 1, learned = weeks >= x.level;
  const line = learned ? `The last week: the ${x.rite} is learned.` : `Week ${weeks} of ${x.level}.`;
  return {lesson: {...x, weeks, state: learned ? "learned" : "learning", waitUntil: null, lastWeek: num(t), log: [...x.log, line]}, line, learned, spend: 0};
}

/* ---- The news the sept talks about (DA:W pp. 35-36, 74) ---- */

/** Dated news. at: [y, m, d]. Constantinople fell on 13 April 1204; the concolation's date is WoDX's reading. */
export const NEWS = [
  {id: "songs", at: [1200, 1, 1], title: "The ten prophecies", text: "Word goes from sept to sept of ten prophecies about the years to come. Most tribes laugh at them, and mock the Red Talons with them.", page: "pp. 35-36"},
  {id: "sack", at: [1204, 4, 13], title: "Constantinople falls", text: "The crusaders take and sack Constantinople. The Warders' own prophecy has come true, and the Warders of Men are shamed by it. The moot stops laughing at the prophecies.", page: "pp. 35-36, 74"},
  {id: "concolation", at: [1204, 9, 1], title: "A concolation is called", text: "The Silver Fangs, Black Furies, Children of Gaia, Shadow Lords and Warders call elders of many tribes to a concolation. Messengers ride for months, and every sept must say whom it sends.", page: "pp. 35-36"}
];
const ymd = at => int(at?.[0]) * 10000 + int(at?.[1]) * 100 + int(at?.[2]);

/** The news whose day has come and the sept has not heard. */
export function newsDue(seen = [], date) {
  const d = ymd(date);
  return NEWS.filter(n => ymd(n.at) <= d && !seen.includes(n.id));
}

/* ---- Rank challenges as sept events (p. 101) ---- */

export function addChallenge(s, {actorId, name, rank}, t = 0) {
  const st = normState(s);
  if ( st.challenges.some(c => c.actorId === actorId && c.rank === int(rank) && ["waiting", "set"].includes(c.state)) ) return {state: st, added: null};
  const c = normChallenge({actorId, name, rank, at: t});
  return {state: {...st, challenges: [...st.challenges, c]}, added: c};
}
