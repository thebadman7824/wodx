/**
 * WoDX Creation 0.14.0: lifepath threads, the pure part (Improvement Desk 2026-11-12b cr2, approved by Ben). No
 * Foundry here.
 *
 * A lifepath scene can leave something open: a rival, a debt, someone lost, a promise, a secret someone else knows,
 * an enemy (a sire's rival among them). This reads a kept lifepath record and lists those open threads, so WoDX
 * Chronicle can deal them out later in play as story chains (B2300). The people the lifepath made as NPCs are
 * named in the thread, so the chain brings back the same person.
 *
 * A thread comes from a person from the past (their role and note are read for what is open), or from a Flaw the
 * player kept (Enemy, Clan Enmity, Hunted, Dark Secret) when no person already carries it.
 */
import {LINES, summary, PEOPLE_ALIVE_SPAN} from "./lifepath-rules.mjs";

/** The kinds of open thread, in the order they are dealt (the sharper ones first). */
export const THREAD_KINDS = {
  enemy: {label: "An old enemy"},
  rival: {label: "An old rival"},
  debt: {label: "A debt called in"},
  owed: {label: "A debt owed to them"},
  secret: {label: "Someone who knows"},
  lost: {label: "Someone lost"},
  promise: {label: "An old promise"},
  hunted: {label: "The hunter from the past"}
};
export const KIND_ORDER = Object.keys(THREAD_KINDS);
/** At most this many threads per character, so the past does not crowd out the chronicle. */
export const THREADS_MAX = 4;

/** What a person's role and note leave open. First match wins. */
const PERSON_RULES = [
  ["enemy", /destroyed|hunting you|murderer|glad to see you gone|caged you|sentenced|informed on|because of you|never forgave|sire's rival/i],
  ["rival", /rival|wants your place|took your place|wants to lead|denounced/i],
  ["owed", /owes you/i],
  ["debt", /owed|creditor|indenture|contract|for a price|for a favour|remembered|owns you|what it cost|plans for you/i],
  ["secret", /secret|confession|suspects|saw too much|watches you|knows what you are|real face|saw your first|saw it too/i],
  ["lost", /looking for|does not know you|without you|waiting for you|vanished|stayed behind|still writes|new country|never met|still thinks of you|survived|thinks you are ill/i],
  ["promise", /swore|promise|vow|would die for/i]
];
/** Kept Flaws that leave a thread open. */
const FLAW_KINDS = {"enemy": "enemy", "enemy (spirit)": "enemy", "clan enmity": "enemy", "hunted": "hunted", "dark secret": "secret"};

/** People who do not die of old age: the Kindred, the dead, spirits. Others die in a lifetime (PEOPLE_ALIVE_SPAN). */
const UNDYING = /sire|vampire|kindred|prince|harpy|domitor|anarch|of the dead|among the dead|spirit|not quite human|monster|clawed out of the earth/i;

export function kindOf(role = "", note = "") {
  const t = `${role} ${note}`;
  return PERSON_RULES.find(([, re]) => re.test(t))?.[0] ?? null;
}

export function undying(role = "", note = "", line = "mortal") {
  const t = `${role} ${note}`;
  return UNDYING.test(t) || (line === "vampire" && /elder|court/i.test(t));
}

/**
 * The open threads of a kept lifepath record ({path, kept, people}). Each: {id, kind, label, role, note, year,
 * scene, actorId, name, undying, line, turning}. Sorted by KIND_ORDER, then year; at most THREADS_MAX.
 */
export function threadsOf(rec) {
  const path = rec?.path;
  if ( !path?.steps?.length ) return [];
  let sum;
  try { sum = summary(path); } catch (e) { return []; }
  const line = path.line ?? "mortal", turning = LINES[line]?.turning ?? "";
  const kept = rec.kept ? new Set(rec.kept) : null;
  const linked = rec.people ?? [];
  const out = [];
  for ( const p of sum.people ) {
    const kind = kindOf(p.role, p.note);
    if ( !kind ) continue;
    const link = linked.find(q => q.role === p.role && q.year === p.year) ?? {};
    out.push({id: `p${p.idx}:${kind}`, kind, label: THREAD_KINDS[kind].label, role: p.role, note: p.note, year: p.year, scene: p.scene,
      actorId: link.actorId ?? null, name: link.name ?? null, undying: undying(p.role, p.note, line), line, turning});
  }
  for ( const g of sum.gives ) {
    const kind = g.kind === "flaw" ? FLAW_KINDS[g.name.toLowerCase()] : null;
    if ( !kind || (kept && !kept.has(g.key)) || out.some(t => t.kind === kind) ) continue;
    const scene = g.from[0] ?? "", st = sum.story.find(s => s.title === scene);
    const role = kind === "hunted" ? "someone who saw what happened" : kind === "secret" ? "someone who was there" : "someone wronged";
    out.push({id: `f:${g.key}`, kind, label: THREAD_KINDS[kind].label, role, note: `from ${scene}`, year: st?.year ?? path.birthYear, scene,
      actorId: null, name: null, undying: false, line, turning});
  }
  return out.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.year - b.year).slice(0, THREADS_MAX);
}

/** Is a mortal from the past still alive in a year of play? Otherwise an heir carries the thread. */
export const stillAlive = (t, year) => !!t?.undying || !Number.isFinite(Number(year)) || (Number(year) - Number(t?.year)) <= PEOPLE_ALIVE_SPAN;
