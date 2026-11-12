/**
 * WoDX Solo: the rules of The Lone Chronicle, with no Foundry in them (tools/harness/solo.test.mjs).
 *
 * WoDX works things out on the Storyteller's browser. For one person playing alone, a hidden browser holds that seat
 * and three things keep the night moving:
 *   the preset   every automation set to act by itself, with the old values kept for the way back
 *   the watcher  a card, window or queue entry that waits for a Storyteller is answered after a short wait, or logged
 *   the log      what the seat decided, kept from the player until asked for
 */
export const NAME = "The Lone Chronicle";
/** Worlds the mode never acts in, whatever the setting says. */
export const NEVER_WORLDS = ["rothenstein-live"];
export const LOG_CAP = 600;

/** What the one switch sets. A setting whose module is off or missing is skipped and named. */
export const PRESET = [
  {mod: "wodx-npc", key: "mode", to: "auto", what: "NPCs in combat act"},
  {mod: "wodx-npc", key: "routineMode", to: "auto", what: "routines and reactions run"},
  {mod: "wodx-npc", key: "factionMode", to: "auto", what: "factions take their turns"},
  {mod: "wodx-combat", key: "fightStart", to: "auto", what: "fights start by themselves"},
  {mod: "wodx-combat", key: "turnConductor", to: "everyone", what: "every turn ends itself"},
  {mod: "wodx-actions", key: "dawnDusk", to: "auto", what: "New Night runs at dusk"},
  {mod: "wodx-actions", key: "sunDamage", to: "apply", what: "sunlight is rolled and applied"},
  {mod: "wodx-storyteller", key: "nightDraw", to: true, what: "the night is drawn at dusk"},
  {mod: "wodx-chronicle", key: "rule.lightTouch", to: false, what: "light-touch mode is off"},
  {mod: "wodx-chronicle", key: "npcCap", to: 0, what: "no cap on NPC proposals"}
];

/**
 * The changes the switch makes. read(mod, key) gives the present value, or undefined when the setting is not there.
 * @returns {{changes: {mod, key, from, to, what}[], missing: {mod, key}[]}}
 */
export function planPreset(read, preset = PRESET) {
  const changes = [], missing = [];
  for ( const p of preset ) {
    const from = read(p.mod, p.key);
    if ( from === undefined ) { missing.push({mod: p.mod, key: p.key}); continue; }
    if ( from !== p.to ) changes.push({mod: p.mod, key: p.key, from, to: p.to, what: p.what});
  }
  return {changes, missing};
}

/** The way back: each change is undone only where the value is still the one the switch set. */
export function planRestore(changes = [], read) {
  const back = [], kept = [];
  for ( const c of changes ?? [] ) {
    const now = read(c.mod, c.key);
    if ( now === undefined ) continue;
    if ( now === c.to ) back.push({mod: c.mod, key: c.key, to: c.from});
    else if ( now !== c.from ) kept.push({mod: c.mod, key: c.key, now});
  }
  return {back, kept};
}

/** The queue types that get a standing approval: every known type not already on, less those that never may. */
export function autoPlan(types = [], current = {}, never = ["request"]) {
  return (types ?? []).map(t => (typeof t === "string" ? t : t?.type)).filter(t => t && !never.includes(t) && current?.[t] !== true);
}

/* ------------------------------ the watcher ------------------------------ */

const TAGS = /<[^>]+>/g;
export const plain = html => String(html ?? "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(TAGS, " ").replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

/** The buttons on a card: every <button>, and every <a> that carries a data-action. */
export function buttonsOf(html) {
  const out = [];
  const re = /<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ( (m = re.exec(String(html ?? ""))) ) {
    const attrs = m[2] ?? "";
    const action = /data-action\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? "";
    if ( m[1].toLowerCase() === "a" && !action ) continue;
    if ( /\bdisabled\b/i.test(attrs) ) continue;
    out.push({action, label: plain(m[3]), n: out.length});
  }
  return out;
}

/** Labels the seat never presses: ways back, refusals, deletions and anything that asks for a hand-made answer. */
export const AVOID = /\b(undo|reject|refuse|deny|delete|remove|cancel|dismiss|instead|behaviou?r|put (it|them) back|take (it|them) back|edit|open|show|details?)\b|^no\b/i;
/** Labels that mean "go ahead", in the order the seat prefers them. */
export const PREFER = [/^accept\b/i, /^approve\b/i, /^start the fight\b/i, /^apply\b/i, /^let\b.*\bpass\b/i, /^new night\b/i, /^yes\b/i,
  /^continue\b/i, /^go on\b/i, /^roll\b/i, /^ok(ay)?$/i, /^done$/i];

/** Does a card wait for an answer? Only when it has a button that is not a way back. */
export const waits = buttons => (buttons ?? []).some(b => b.label && !AVOID.test(b.label));

/**
 * The seat's choice on a card: the first "go ahead" button by PREFER, else the only button that is not a way back.
 * With several such buttons and none preferred it does not guess.
 * @returns {{n: number, label: string, why: string}|null}
 */
export function pickButton(buttons) {
  const open = (buttons ?? []).filter(b => b.label && !AVOID.test(b.label));
  for ( const p of PREFER ) {
    const b = open.find(x => p.test(x.label));
    if ( b ) return {n: b.n, label: b.label, why: "goes ahead"};
  }
  if ( open.length === 1 ) return {n: open[0].n, label: open[0].label, why: "the only choice"};
  return null;
}

/** Is a message whispered to Storytellers only? */
export function forStoryteller(whisper = [], gmIds = []) {
  const w = [...(whisper ?? [])];
  return w.length > 0 && w.every(id => gmIds.includes(id));
}

/** A short name for a card: its flavour, its first heading or bold line, else its first words. */
export function titleOf({flavor = "", content = ""} = {}) {
  const f = plain(flavor);
  if ( f ) return f.slice(0, 90);
  const h = /<(h[1-6]|strong|b)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(String(content ?? ""));
  const t = plain(h ? h[2] : content);
  return t.slice(0, 90) || "A card";
}

/** Which module posted a message, from its flags. */
export const sourceOf = (flags = {}) => Object.keys(flags ?? {}).find(k => /^wodx/.test(k)) ?? Object.keys(flags ?? {}).find(k => k !== "core") ?? "unknown";

/* ------------------------------ the log ------------------------------ */

export const KINDS = {card: "A card", window: "A window", queue: "The approval queue", preset: "The switch", scene: "A scene", note: "A note"};
export const blankLog = () => ({v: 1, entries: []});
export function normLog(l) {
  return {v: 1, entries: Array.isArray(l?.entries) ? l.entries.filter(e => e && typeof e === "object") : []};
}
export function addEntry(log, e, {cap = LOG_CAP} = {}) {
  const l = normLog(log);
  l.entries.push({at: Number(e.at) || 0, wt: Number(e.wt) || 0, kind: KINDS[e.kind] ? e.kind : "note", source: String(e.source ?? ""),
    title: String(e.title ?? "").slice(0, 120), buttons: (e.buttons ?? []).map(String).slice(0, 12),
    choice: e.choice == null ? null : String(e.choice), acted: !!e.acted, note: String(e.note ?? "").slice(0, 200)});
  if ( l.entries.length > cap ) l.entries.splice(0, l.entries.length - cap);
  return l;
}

/** The places play waited on a Storyteller since a time: cards, windows and queue entries. */
export const stalls = (entries = [], since = 0) => (entries ?? []).filter(e => ["card", "window", "queue"].includes(e.kind) && e.at >= since);

/** Stalls gathered by where they came from and how they ended, most frequent first. */
export function stallReport(entries = [], since = 0) {
  const by = new Map();
  for ( const e of stalls(entries, since) ) {
    const end = e.acted ? "answered by the seat" : e.choice ? "choice found, not pressed" : "left waiting";
    const key = `${e.kind}|${e.source}|${e.title}|${end}`;
    const r = by.get(key) ?? {kind: e.kind, source: e.source, title: e.title, end, choice: e.choice, count: 0};
    r.count++;
    by.set(key, r);
  }
  const rows = [...by.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  return {total: rows.reduce((n, r) => n + r.count, 0), waiting: rows.filter(r => r.end === "left waiting").reduce((n, r) => n + r.count, 0), rows};
}
