/**
 * WoDX Storyteller 0.11.0: letters and news that travel. Pure rules, harness-tested.
 *
 * A player sends a letter or message from their character, by a carrier the year allows, to another player character
 * or to someone the Storyteller plays. It arrives when the carrier would bring it, on the clock. The Storyteller sees
 * every letter when it is sent and can hold it back (it was lost, stopped or read on the way) or let it go; nothing is
 * intercepted by a roll. A reply to someone the Storyteller plays is the Storyteller's own to write.
 * House figures: the books give no delivery times. The telephone date matches WoDX NPC's alarm carriers.
 */

const H = 3600, D = 86400;

/** Distances a sender can pick. */
export const REACH = {
  near: "In the same town",
  region: "A day's ride or so away",
  far: "Another land"
};

/**
 * Carriers. from/to: the years they can be used. time(reach, year): seconds on the way, or null when it cannot reach
 * that far in that year. read: who may read it on the way, for the Storyteller's card.
 */
export const CARRIERS = {
  messenger: {label: "A messenger", from: 0, to: 9999, read: "the messenger",
    time: (r, y) => r === "near" ? H : r === "region" ? D : (y < 1500 ? 30 : 14) * D},
  post: {label: "The post", from: 1500, to: 9999, read: "anyone who opens the seal",
    time: (r, y) => y >= 1840 ? (r === "near" ? 4 * H : r === "region" ? D : 4 * D) : (r === "near" ? D : r === "region" ? 3 * D : 10 * D)},
  telegraph: {label: "A telegram", from: 1844, to: 1990, read: "the telegraph clerks",
    time: r => r === "near" ? H : r === "region" ? 2 * H : 4 * H},
  telephone: {label: "A telephone call", from: 1890, to: 9999, read: "an operator, or anyone on the line",
    time: (r, y) => (r === "far" && y < 1927) ? null : 0},
  email: {label: "An e-mail", from: 1995, to: 9999, read: "whoever holds the server",
    time: () => 60},
  net: {label: "A message over the Net", from: 2010, to: 9999, read: "whoever watches the Net", future: true,
    time: () => 0}
};

/** The carriers open in a year. future: the World of Future Darkness branch is on. */
export function carriersFor(year, {future = false} = {}) {
  const y = Number(year) || 0;
  return Object.entries(CARRIERS)
    .filter(([, c]) => (!y || (y >= c.from && y <= c.to)) && (!c.future || future) && (y || c.from === 0))
    .map(([id, c]) => ({id, label: c.label}));
}

/** When a letter arrives. Returns {ok, why, seconds}. */
export function plan(how, reach, year, {future = false} = {}) {
  const c = CARRIERS[how];
  if ( !c ) return {ok: false, why: "No such way to send it.", seconds: 0};
  if ( !carriersFor(year, {future}).some(x => x.id === how) ) return {ok: false, why: `${c.label} cannot be had in ${year}.`, seconds: 0};
  const r = REACH[reach] ? reach : "near";
  const s = c.time(r, Number(year) || 0);
  if ( s === null ) return {ok: false, why: `${c.label} cannot reach that far in ${year}.`, seconds: 0};
  return {ok: true, why: "", seconds: s};
}

/** Time on the way, in words. */
export function wayWords(seconds) {
  const s = Number(seconds) || 0;
  if ( s <= 60 ) return "at once";
  if ( s < H ) return "within the hour";
  if ( s < D ) return `in about ${Math.round(s / H)} hour${Math.round(s / H) === 1 ? "" : "s"}`;
  const d = Math.round(s / D);
  return `in about ${d} day${d === 1 ? "" : "s"}`;
}

const str = (v, max = 200) => String(v ?? "").slice(0, max);

/** Clean a letter for storage. */
export function normLetter(l = {}) {
  return {id: str(l.id, 40), from: str(l.from, 40), fromName: str(l.fromName, 120), to: str(l.to, 40), toName: str(l.toName, 120),
    how: CARRIERS[l.how] ? l.how : "messenger", reach: REACH[l.reach] ? l.reach : "near", text: str(l.text, 4000),
    sentAt: Number(l.sentAt) || 0, dueAt: Number(l.dueAt) || 0, sentLabel: str(l.sentLabel, 120),
    state: ["way", "held", "done"].includes(l.state) ? l.state : "way"};
}
export const normLetters = list => (Array.isArray(list) ? list : []).map(normLetter).filter(l => l.id);

/** Letters due by a time, still on the way. */
export const due = (list, now) => normLetters(list).filter(l => l.state === "way" && l.dueAt <= (Number(now) || 0));
/** Drop delivered letters older than a year of world time, so the setting stays small. */
export const prune = (list, now) => normLetters(list).filter(l => l.state !== "done" || (Number(now) || 0) - l.dueAt < 365 * D);
