/**
 * Between sessions: the next session sheet, "Last time" for the players, absent players and the hooks board.
 * No Foundry in this file.
 */
import {whenLabel} from "./dashboard-rules.mjs";

const str = (v, n = 300) => String(v ?? "").trim().slice(0, n);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ---- The next session sheet ---- */

/**
 * The sheet's sections from what the dashboard and the other windows hold. Every input is plain data:
 *   clocks [{at, what}], threads [{what, why}], consequences [{due, kind, what, from, to, overdue}],
 *   letters [{fromName, toName, dueAt, state}], tasks [{actor, name, total, goal, next, status}], ahead [{name, ahead}].
 * Returns [{key, title, lines: [string]}]; empty sections are left out.
 */
export function nextSession({now = 0, clocks = [], threads = [], consequences = [], letters = [], tasks = [], ahead = [], cap = 25} = {}) {
  const when = at => (at === null || at === undefined ? "no date" : whenLabel(at - now));
  const out = [
    {key: "due", title: "Coming due", lines: [...clocks.map(c => `${when(c.at)}: ${c.what}`),
      ...consequences.map(e => `${e.due === null || e.due === undefined ? "No date" : e.overdue ? "Overdue" : `Due ${when(e.due)}`}: ${e.kind}, ${e.from?.name || "someone"} to ${e.to?.name || "someone"}${e.what ? `, ${e.what}` : ""}`)]},
    {key: "letters", title: "Letters on the way", lines: letters.filter(l => l.state === "way").sort((a, b) => num(a.dueAt) - num(b.dueAt))
      .map(l => `${l.fromName || "someone"} to ${l.toName || "someone"}: arrives ${when(l.dueAt)}`)},
    {key: "tasks", title: "Long tasks", lines: tasks.filter(t => t.status === "open").sort((a, b) => num(a.next) - num(b.next))
      .map(t => `${t.actor}: ${t.name}, ${t.total} of ${t.goal}; next roll ${when(t.next)}`)},
    {key: "threads", title: "Open threads", lines: threads.map(t => `${t.what} (${t.why})`)},
    {key: "ahead", title: "Personal time", lines: ahead.filter(a => Math.abs(num(a.ahead)) >= 3600).map(a => `${a.name} is ${num(a.ahead) > 0 ? "ahead" : "behind"} by ${whenLabel(Math.abs(num(a.ahead))).replace(/^in /, "")}`)}
  ];
  return out.map(s => ({...s, lines: s.lines.slice(0, cap)})).filter(s => s.lines.length);
}

/* ---- Last time, for the players ---- */

/** Log entries a player saw at the table. Solo acts, waiting requests, breaches, beats and notes stay the Storyteller's. */
export const SEEN = new Set(["arrive", "travel", "convene", "release", "cross", "dawn", "encounter", "roll"]);

/** The entries of the last session: between the newest session line and the one before it (newest first in, oldest first out). */
export function lastSession(entries = []) {
  const idx = entries.map((e, i) => (e.kind === "session" ? i : -1)).filter(i => i >= 0);
  const end = idx.length ? idx[0] : -1;
  const start = idx.length > 1 ? idx[1] : entries.length;
  const slice = end < 0 ? entries.slice(0, start) : entries.slice(end + 1, start);
  return slice.reverse();
}

/** The recap lines, one a night, from what the players saw: "night label: what happened; what happened". */
export function recapLines(entries = [], {nightLabel = n => `Night ${n}`, cap = 12} = {}) {
  const nights = new Map();
  for ( const e of entries ) {
    if ( !SEEN.has(e.kind) || !e.text ) continue;
    if ( e.kind === "roll" && !/^Called for a roll/.test(e.text) && !e.attention ) continue;
    const k = e.night ?? 0;
    if ( !nights.has(k) ) nights.set(k, []);
    const list = nights.get(k);
    const t = str(e.text, 200).replace(/\.$/, "");
    if ( !list.includes(t) ) list.push(t);
  }
  return [...nights.entries()].slice(-cap).map(([n, list]) => `${nightLabel(n)}: ${list.slice(0, 8).join("; ")}.`);
}

/* ---- Absent players ---- */

export const normAbsent = m => Object.fromEntries(Object.entries(m && typeof m === "object" ? m : {}).filter(([k, v]) => k && v).map(([k, v]) => [k, {at: num(v.at), runBy: v.runBy === "st" ? "st" : "none"}]));

/* ---- The hooks board ---- */

/**
 * What the Storyteller can pull on for one character, from a plain copy of the sheet:
 *   {name, nature, demeanor, derangement, morality: {name, value}, features: [{name, kind, value}]}
 * Returns {nature, demeanor, flaws, merits, derangements, people, morality}.
 */
export const PEOPLE_BACKGROUNDS = /^(allies|contacts|mentor|herd|retainers?|kinfolk|influence|status|patron|familiar|ancestors|cult|followers|mob)/i;

export function hooksOf(c = {}) {
  const feats = (c.features ?? []).map(f => ({name: str(f.name, 80), kind: String(f.kind ?? "").toLowerCase(), value: num(f.value)}));
  const der = [str(c.derangement, 300), ...feats.filter(f => /derange/.test(f.kind) || /^derangement/i.test(f.name)).map(f => f.name)]
    .flatMap(s => s.split(/[,;\n]/)).map(s => s.trim()).filter(Boolean);
  return {
    name: str(c.name, 120), nature: str(c.nature, 60), demeanor: str(c.demeanor, 60),
    flaws: feats.filter(f => /flaw/.test(f.kind)).map(f => f.value ? `${f.name} (${f.value})` : f.name),
    merits: feats.filter(f => /merit/.test(f.kind)).map(f => f.value ? `${f.name} (${f.value})` : f.name),
    derangements: [...new Set(der)],
    people: feats.filter(f => /background/.test(f.kind) && PEOPLE_BACKGROUNDS.test(f.name)).map(f => `${f.name} ${f.value}`),
    morality: c.morality?.name ? `${c.morality.name} ${num(c.morality.value)}` : ""
  };
}

/** Lines for the board's search. */
export const hooksText = h => [h.name, h.nature, h.demeanor, ...h.flaws, ...h.merits, ...h.derangements, ...h.people, h.morality].join(" ").toLowerCase();
