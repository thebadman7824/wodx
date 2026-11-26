/**
 * The night's work (B6220-B6229): the rules, kept apart from Foundry so the harness can test them.
 *
 * Everything the Storyteller's Hand does by itself (a proposal approved on its own or by the Storyteller and then
 * carried out, what the clock sets going when time passes, what the Lone Chronicle's seat presses) is written down as
 * one entry with each document change it made: what each changed field was before and after, each document made and
 * each document removed with its data. The Night's work window lists the entries since a chosen time, each with a tick
 * box, and one Undo takes back every ticked entry, newest change first. Before it does, each change is checked against
 * the world as it is now: a field that no longer holds what the Hand left there was changed since, by a player or by the
 * Storyteller, and the list warns of it. The Storyteller picks whether such changes are kept (the default) or put back too.
 *
 * An op is one change:
 *   {t, doc, uuid, name, act: "update", set: {path: before}, gone: [path], after: {path: value}}
 *   {t, doc, uuid, name, act: "create"}                    taken back by removing the document
 *   {t, doc, uuid, name, act: "delete", parent, embedded, data}  taken back by making it again with the same id
 *   {t, doc: "Setting", key, act: "setting", set, gone, after}  a world setting, by path inside its value
 *   {t, doc: "ChatMessage", uuid, act: "card"}             a card the Hand posted: its buttons are taken off on undo
 */

export const VERSION = 1;
/** The documents whose changes are written down. Users, folders, macros, playlists and the clock stay out. */
export const DOC_TYPES = ["Actor", "ActorDelta", "Item", "ActiveEffect", "Token", "Tile", "Drawing", "AmbientLight", "AmbientSound", "Note",
  "Region", "Wall", "MeasuredTemplate", "Scene", "JournalEntry", "JournalEntryPage", "RollTable", "Combat", "Combatant", "Setting"];
/** Settings that are never taken back: the clock and core, this list itself, the approval queue, the seat's own records. */
export const SKIP_SETTINGS = [/^core\./, /^wodx-chronicle\.nightWork$/, /^wodx-chronicle\.approvals$/, /^wodx-solo\.(log|st|before)$/,
  /^wodx-storyteller\.(timer|session)$/];
/** Fields that change by themselves and are never written down. */
export const SKIP_PATHS = [/^_id$/, /^_stats(\.|$)/, /^sort$/, /^folder$/,
  // Bookkeeping that follows every change by itself (WoDX Sheets' history strip and window state, the sheet's own flag)
  /^flags\.wodx-sheets\.(history|ui|snap|since)(\.|$)/, /^system\.settings\.isupdated$/];
export const CAPS = {entries: 300, opsPerEntry: 1000, bytes: 1500000, opBytes: 150000, days: 30};
export const SINCE = [
  {key: "session", label: "Since the last session ended"},
  {key: "hour", label: "The last hour"},
  {key: "six", label: "The last six hours"},
  {key: "day", label: "The last day"},
  {key: "all", label: "Everything kept (30 days)"},
  {key: "time", label: "Since a time I choose"}
];
export const KINDS = {auto: "Approved on its own", approved: "You approved it", clock: "Time passed", seat: "The seat chose", hand: "The Hand"};

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const has = (o, path) => {
  let cur = o;
  for ( const k of path.split(".") ) { if ( !isObj(cur) && !Array.isArray(cur) ) return false; if ( !(k in cur) ) return false; cur = cur[k]; }
  return true;
};
export const getPath = (o, path) => path.split(".").reduce((c, k) => (c === null || c === undefined ? undefined : c[k]), o);

/** Two values the same, whatever the order of their keys. */
export function same(a, b) {
  if ( a === b ) return true;
  if ( a === undefined || b === undefined || a === null || b === null ) return a === b;
  if ( Array.isArray(a) || Array.isArray(b) ) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]));
  if ( isObj(a) && isObj(b) ) {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => k in b && same(a[k], b[k]));
  }
  return false;
}

/**
 * The fields a document update touches, as dotted paths. Foundry's "-=key" (remove) and "==key" (replace) marks are
 * read as the plain key. Plain objects are opened down to their leaves; arrays count as one value.
 */
export function pathsOf(changes, prefix = "") {
  const out = [];
  for ( const [k0, v] of Object.entries(changes ?? {}) ) {
    const segs = String(k0).split(".");
    const marked = segs.some(x => x.startsWith("-=") || x.startsWith("=="));
    const p = [prefix, ...segs.map(x => x.replace(/^(-=|==)/, ""))].filter(Boolean).join(".");
    if ( !marked && isObj(v) && Object.keys(v).length ) out.push(...pathsOf(v, p));
    else out.push(p);
  }
  return [...new Set(out)].filter(p => !SKIP_PATHS.some(r => r.test(p)));
}

/**
 * What each touched field held before the change. A field that was not there at all is put in gone, at the shallowest
 * part of its path that was missing, so taking it back removes it whole.
 */
export function beforeOf(source, paths) {
  const set = {}, gone = new Set();
  for ( const p of paths ) {
    if ( has(source, p) ) { set[p] = clone(getPath(source, p)); continue; }
    const keys = p.split(".");
    let i = 1;
    while ( i < keys.length && has(source, keys.slice(0, i).join(".")) ) i++;
    gone.add(keys.slice(0, i).join("."));
  }
  // A path under a gone one is gone with it
  const g = [...gone].filter(p => ![...gone].some(q => q !== p && p.startsWith(`${q}.`)));
  for ( const p of Object.keys(set) ) if ( g.some(q => p.startsWith(`${q}.`)) ) delete set[p];
  return {set, gone: g};
}

/** What each touched field holds after the change (undefined where it was removed). */
export function afterOf(source, paths) {
  const after = {};
  for ( const p of paths ) after[p] = has(source, p) ? clone(getPath(source, p)) : null;
  return after;
}

/** The update that puts a document back: each field to its old value, each new one removed with Foundry's "-=" mark. */
export function revertUpdate(op, {skip = []} = {}) {
  const out = {};
  for ( const [p, v] of Object.entries(op.set ?? {}) ) if ( !skip.includes(p) ) out[p] = clone(v);
  for ( const p of op.gone ?? [] ) {
    if ( skip.some(s => s === p || s.startsWith(`${p}.`)) ) continue;
    const keys = p.split(".");
    out[[...keys.slice(0, -1), `-=${keys.at(-1)}`].join(".")] = null;
  }
  return out;
}

/**
 * Every place where two plain values differ, for a world setting's value (arrays count as one value). A setting's keys
 * can hold dots (a map keyed by "Actor.abc"), so these places are lists of keys, kept as JSON text in an op.
 */
export function diffKeys(a, b, at = []) {
  if ( isObj(a) && isObj(b) ) {
    const out = [];
    for ( const k of new Set([...Object.keys(a), ...Object.keys(b)]) ) out.push(...diffKeys(a[k], b[k], [...at, k]));
    return out;
  }
  return same(a, b) ? [] : [at];
}
const kGet = (o, keys) => keys.reduce((c, k) => (c === null || c === undefined ? undefined : c[k]), o);
const kHas = (o, keys) => { let c = o; for ( const k of keys ) { if ( !isObj(c) || !(k in c) ) return false; c = c[k]; } return true; };
function kSet(o, keys, v) { let c = o; for ( const k of keys.slice(0, -1) ) { if ( !isObj(c[k]) ) c[k] = {}; c = c[k]; } c[keys.at(-1)] = clone(v); }
function kDel(o, keys) { let c = o; for ( const k of keys.slice(0, -1) ) { if ( !isObj(c?.[k]) ) return; c = c[k]; } if ( c ) delete c[keys.at(-1)]; }
const kParse = p => { try { const v = JSON.parse(p); return Array.isArray(v) ? v.map(String) : []; } catch (e) { return []; } };

/** A world setting's change as an op: only the parts of its value that moved. */
export function settingOp(key, before, after, t = Date.now()) {
  const b = before === undefined ? undefined : clone(before), a = after === undefined ? undefined : clone(after);
  if ( !isObj(b) || !isObj(a) ) {
    if ( same(b, a) ) return null;
    return {t, doc: "Setting", key, act: "setting", whole: true, set: {"": b === undefined ? null : b}, had: b !== undefined, after: {"": a ?? null}};
  }
  const places = diffKeys(b, a);
  if ( !places.length ) return null;
  const set = {}, gone = [], aft = {};
  for ( const keys of places ) {
    const p = JSON.stringify(keys);
    if ( kHas(b, keys) ) set[p] = clone(kGet(b, keys)); else gone.push(p);
    aft[p] = kHas(a, keys) ? clone(kGet(a, keys)) : null;
  }
  return {t, doc: "Setting", key, act: "setting", set, gone, after: aft};
}

/** What one place in a setting's value holds now (null when it is not there). */
export function settingAt(value, p) {
  if ( p === "" ) return value ?? null;
  const keys = kParse(p);
  return kHas(value, keys) ? kGet(value, keys) : null;
}

/** A setting's value with the op's parts put back (the parts in skip left as they are now). */
export function revertSetting(op, current, {skip = []} = {}) {
  if ( op.whole ) return {value: clone(op.set[""]), had: op.had};
  const v = isObj(current) ? clone(current) : {};
  for ( const [p, old] of Object.entries(op.set ?? {}) ) if ( !skip.includes(p) ) kSet(v, kParse(p), old);
  for ( const p of op.gone ?? [] ) if ( !skip.includes(p) ) kDel(v, kParse(p));
  return {value: v, had: true};
}

export const skipSetting = key => SKIP_SETTINGS.some(r => r.test(String(key ?? "")));
export const bytes = v => { try { return JSON.stringify(v)?.length ?? 0; } catch (e) { return Infinity; } };

/**
 * What changed since the Hand did it, for one op, read from the world now.
 * @param {object} op
 * @param {object|null} now   {exists, source, value (settings), lastBy, lastAt} as the world holds it, or null when gone
 * @returns {{paths: string[], gone: boolean, back: boolean, by: string|null}}
 */
export function changedSince(op, now) {
  const by = now?.lastBy ?? null;
  if ( op.act === "create" ) {
    if ( !now?.exists ) return {paths: [], gone: true, back: false, by: null};
    // Changed after it was made, by someone other than the one whose client made it
    const other = now.lastBy && now.lastBy !== op.by && Number(now.lastAt) > Number(op.t) + 2000;
    return {paths: other ? ["(the whole thing)"] : [], gone: false, back: false, by: other ? by : null};
  }
  if ( op.act === "delete" ) return {paths: [], gone: false, back: !!now?.exists, by: now?.exists ? by : null};
  if ( op.act === "card" ) return {paths: [], gone: !now?.exists, back: false, by: null};
  if ( op.act === "setting" ) {
    const paths = Object.entries(op.after ?? {}).filter(([p, v]) => !same(settingAt(now?.value, p), v)).map(([p]) => p || "(the whole setting)");
    return {paths, gone: false, back: false, by: paths.length ? by : null};
  }
  if ( !now?.exists ) return {paths: [], gone: true, back: false, by: null};
  const src = now.source ?? {};
  const paths = Object.entries(op.after ?? {}).filter(([p, v]) => !same(has(src, p) ? getPath(src, p) : null, v)).map(([p]) => p);
  return {paths, gone: false, back: false, by: paths.length ? by : null};
}

/** Every op of the ticked entries, newest first: the order one Undo takes them back in. */
export function orderOps(entries, ids) {
  const want = new Set(ids);
  const ops = [];
  for ( const e of entries ?? [] ) {
    if ( !want.has(e.id) || e.undone || e.tooBig ) continue;
    (e.ops ?? []).forEach((op, i) => ops.push({entry: e.id, i, op}));
  }
  return ops.sort((a, b) => (b.op.t - a.op.t) || (b.i - a.i));
}

/**
 * What to do with one op, read against the world at the moment it is taken back (so a newer op taken back first
 * already shows its old value).
 * @returns {{action: "revert"|"kept"|"none", skip: string[], changed: object}}
 */
export function stepAction(op, now, {keep = true} = {}) {
  const c = changedSince(op, now);
  if ( c.gone || c.back ) return {action: "none", skip: [], changed: c};
  if ( !c.paths.length || !keep ) return {action: "revert", skip: [], changed: c};
  const whole = op.act === "create" || op.whole || c.paths.includes("(the whole setting)");
  const fields = Object.keys(op.after ?? {}).length;
  if ( whole || c.paths.length >= fields ) return {action: "kept", skip: c.paths, changed: c};
  return {action: "revert", skip: c.paths, changed: c};
}

/** The same thing, as one plan (the world read once): the window's preview of an Undo. */
export function undoPlan(entries, ids, look, {keep = true} = {}) {
  return orderOps(entries, ids).map(s => ({...s, ...stepAction(s.op, look(s.op), {keep})}));
}

/** Whether a later op that is still standing touches the same thing as this one (its change is the Hand's own). */
export function laterHand(entries, op) {
  const fields = new Set([...Object.keys(op.after ?? {}), ...(op.gone ?? [])]);
  return (entries ?? []).some(e => !e.undone && (e.ops ?? []).some(o => o !== op && o.t > op.t && (o.uuid ?? o.key) === (op.uuid ?? op.key)
    && (op.act !== "update" && op.act !== "setting" || [...Object.keys(o.set ?? {}), ...(o.gone ?? [])].some(p => [...fields].some(f => f === p || f.startsWith(`${p}.`) || p.startsWith(`${f}.`))))));
}

/** The start of "since" in real milliseconds. */
export function sinceMs(key, {now = Date.now(), session = null, time = null} = {}) {
  if ( key === "hour" ) return now - 3600e3;
  if ( key === "six" ) return now - 6 * 3600e3;
  if ( key === "day" ) return now - 24 * 3600e3;
  if ( key === "session" ) return Number.isFinite(Number(session)) && Number(session) > 0 ? Number(session) : now - 24 * 3600e3;
  if ( key === "time" ) { const t = Number(time); return Number.isFinite(t) && t > 0 ? t : now - 3600e3; }
  return 0;
}

/** One line for each op, plain words, for the list. */
export function opLine(op) {
  const n = op.name ? `${op.name}` : (op.key ?? op.doc);
  if ( op.act === "create" ) return `${op.doc} made: ${n}`;
  if ( op.act === "delete" ) return `${op.doc} removed: ${n}`;
  if ( op.act === "card" ) return `Card: ${n}`;
  const fields = [...Object.keys(op.set ?? {}), ...(op.gone ?? [])].filter(p => p !== "");
  const words = f => (f.startsWith("[") ? kParse(f) : f.split(".")).slice(-2).join(" ");
  const shown = fields.slice(0, 3).map(words).join(", ");
  return `${op.act === "setting" ? "Setting" : op.doc} changed: ${n}${shown ? ` (${shown}${fields.length > 3 ? `, ${fields.length - 3} more` : ""})` : ""}`;
}

/**
 * The rows the window shows, newest first, each with its changes and what was changed since.
 * @param {object} journal
 * @param {{since: number, look: Function, names?: Function}} o   names(userId) -> {name, isGM}
 */
export function rows(journal, {since = 0, look, names = () => null} = {}) {
  return (journal?.entries ?? []).filter(e => e.at >= since).sort((a, b) => b.at - a.at).map(e => {
    const lines = (e.ops ?? []).map(op => {
      const c = e.undone ? {paths: [], by: null} : changedSince(op, look(op));
      const hand = !!c.paths?.length && laterHand(journal.entries, op);
      const who = c.by && !hand ? names(c.by) : null;
      return {text: opLine(op), changed: c.paths ?? [], hand, gone: !!c.gone, back: !!c.back, by: hand ? "later work of the Hand" : who?.name ?? null, player: !!who && !who.isGM};
    });
    const warn = lines.filter(l => l.changed.length && !l.hand);
    return {id: e.id, at: e.at, label: e.label, kind: e.kind, kindLabel: KINDS[e.kind] ?? e.kind, source: e.source ?? "", undone: !!e.undone,
      tooBig: !!e.tooBig, left: Number(e.left) || 0, count: (e.ops ?? []).length, canUndo: !e.undone && !e.tooBig && ((e.ops ?? []).length > 0 || !!e.handlerUndo),
      lines, warn: warn.length, playerWarn: warn.filter(l => l.player).length,
      warnBy: [...new Set(warn.map(l => l.by).filter(Boolean))]};
  });
}

/** Put a new entry into the journal, keeping it inside its caps (oldest go first). */
export function addEntry(journal, entry, {now = Date.now(), caps = CAPS} = {}) {
  const j = normJournal(journal);
  const e = {...entry};
  if ( (e.ops ?? []).length > caps.opsPerEntry ) { e.ops = e.ops.slice(0, caps.opsPerEntry); e.tooBig = true; }
  // B6224: a single change too large to keep is left out and counted; the rest of the piece can still be taken back
  e.ops = (e.ops ?? []).filter(op => {
    if ( bytes(op) <= caps.opBytes ) return true;
    e.left = (e.left ?? 0) + 1;
    return false;
  });
  j.entries.push(e);
  return trim(j, {now, caps});
}

export function trim(journal, {now = Date.now(), caps = CAPS} = {}) {
  const j = normJournal(journal);
  const oldest = now - caps.days * 24 * 3600e3;
  j.entries = j.entries.filter(e => e.at >= oldest).sort((a, b) => a.at - b.at).slice(-caps.entries);
  while ( j.entries.length > 1 && bytes(j) > caps.bytes ) j.entries.shift();
  return j;
}

export function normJournal(j) {
  return {v: VERSION, entries: Array.isArray(j?.entries) ? j.entries.filter(e => e && e.id).map(e => ({...e, ops: Array.isArray(e.ops) ? e.ops : []})) : []};
}

/** The entries taken back, marked so, with how many of their changes were kept as they are now. */
export function markUndone(journal, ids, {at = Date.now(), kept = {}} = {}) {
  const j = normJournal(journal);
  for ( const e of j.entries ) if ( ids.includes(e.id) ) { e.undone = true; e.undoneAt = at; e.kept = kept[e.id] ?? 0; }
  return j;
}

/** A card's text with its buttons taken off and a line saying it was taken back. */
export function takenBackCard(content) {
  const without = String(content ?? "").replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, "");
  return `${without}<p class="wodx-quiet wodx-night-undone"><i class="fa-solid fa-rotate-left"></i> Taken back with the night's work.</p>`;
}

/** What one Undo did, in words, for the Storyteller's card. */
export function summary(plan) {
  const entries = new Set(plan.map(s => s.entry));
  const done = plan.filter(s => s.action === "revert").length;
  const kept = plan.filter(s => s.action === "kept" || s.skip.length).length;
  const none = plan.filter(s => s.action === "none").length;
  const parts = [`${entries.size} piece${entries.size === 1 ? "" : "s"} of the Hand's work taken back`, `${done} change${done === 1 ? "" : "s"} put back`];
  if ( kept ) parts.push(`${kept} left as they are now because someone changed them since`);
  if ( none ) parts.push(`${none} already gone or back`);
  return parts.join("; ");
}

const escH = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const when = ms => { try { return new Date(ms).toLocaleString([], {weekday: "short", hour: "2-digit", minute: "2-digit"}); } catch (e) { return ""; } };

/** The list as HTML, shared by the Storyteller's window and the lone player's (WoDX Solo). */
export function listHTML(list, {since = "session", time = "", keep = true} = {}) {
  const opts = SINCE.map(s => `<option value="${s.key}"${s.key === since ? " selected" : ""}>${escH(s.label)}</option>`).join("");
  const items = list.map(r => {
    const warn = r.warn ? `<p class="wodx-night-warn"><i class="fa-solid fa-triangle-exclamation"></i> ${r.playerWarn
      ? `${escH(r.warnBy.join(", ") || "A player")} changed ${r.playerWarn === 1 ? "one of these" : `${r.playerWarn} of these`} since.`
      : `${r.warn === 1 ? "One of these was" : `${r.warn} of these were`} changed since${r.warnBy.length ? ` by ${escH(r.warnBy.join(", "))}` : ""}.`}</p>` : "";
    const lines = r.lines.slice(0, 40).map(l => `<li${l.changed.length ? " class=\"wodx-night-changed\"" : ""}>${escH(l.text)}${l.changed.length
      ? ` <span class="wodx-night-who">changed since${l.by ? ` by ${escH(l.by)}` : ""}</span>` : ""}${l.gone ? " <span class=\"wodx-quiet\">(gone now)</span>" : ""}</li>`).join("");
    const state = r.undone ? "<span class=\"wodx-tag\">Taken back</span>" : r.tooBig ? "<span class=\"wodx-tag\">Too much to keep</span>" : "";
    return `<li class="wodx-night-row${r.undone ? " undone" : ""}" data-search-item data-search-text="${escH(`${r.label} ${r.source} ${r.kindLabel}`)}">
      <header><input type="checkbox" class="wodx-night-tick" data-id="${escH(r.id)}"${r.canUndo ? "" : " disabled"} aria-label="Take this back">
        <span class="wodx-tag">${escH(r.kindLabel)}</span> <strong>${escH(r.label)}</strong> ${state}</header>
      <p class="wodx-quiet">${escH(when(r.at))}${r.source ? ` · ${escH(r.source)}` : ""} · ${r.count} change${r.count === 1 ? "" : "s"}${r.left ? ` (${r.left} too large to keep, left as they are)` : ""}</p>${warn}
      ${lines ? `<details><summary>What it changed</summary><ul class="wodx-night-ops">${lines}</ul></details>` : `<p class="wodx-quiet">It changed nothing that can be taken back here.</p>`}</li>`;
  }).join("");
  return `<div class="wodx-night-since"><label>Show <select name="since" class="wodx-night-sel" data-fixed>${opts}</select></label>
      <input type="datetime-local" name="time" class="wodx-night-time" value="${escH(time)}"${since === "time" ? "" : " hidden"} aria-label="Since this time"></div>
    ${list.length ? `<ul class="wodx-list wodx-night-list">${items}</ul>` : "<p class=\"wodx-quiet\">The Hand has done nothing in that time.</p>"}
    <fieldset class="wodx-night-keep"><legend>Where something was changed since</legend>
      <label><input type="radio" name="keep" value="1"${keep ? " checked" : ""}> Keep the later change (recommended)</label>
      <label><input type="radio" name="keep" value="0"${keep ? "" : " checked"}> Put it back as it was before the Hand anyway</label></fieldset>
    <div class="wodx-buttons"><button type="button" data-action="tickAll">Tick all or none</button>
      <button type="button" data-action="undo"><i class="fa-solid fa-rotate-left"></i> Undo the ticked</button></div>`;
}
