/**
 * Dreams and visions you write (WoDX Storyteller 0.6.0), the pure rules. The Storyteller writes a dream for a
 * character between sessions and sets when it comes; the clock releases it then, as a journal only that character's
 * players can open. No Foundry here.
 * Storyteller 0.64.0 (B2911): a dream can be tied to a power, a Merit or a Flaw. A tied dream with no time of its own
 * comes at the dreamer's next day's sleep, and only while the dreamer still has what it is tied to. The Nightmares
 * Flaw (V20 p. 485) works by itself: after each day's sleep a Willpower roll, and a failure costs a die on every roll
 * until the next sleep.
 */

/** The hour a dream comes by default: in the day's sleep (the Kindred sleep by day; others are abed by then too). */
export const DEFAULT_HOUR = 8;

/** What a dream can be tied to. kind: power (a Power item's name) or trait (a Merit or Flaw by table key). */
export const SOURCES = {
  "": {label: "Nothing: the Storyteller's own dream"},
  auspex: {label: "Auspex: a vision", kind: "power", re: /^auspex$/i},
  oneiromancy: {label: "Oneiromancy (Dark Thaumaturgy)", kind: "power", re: /oneiromancy/i},
  dreamspeaking: {label: "Gift or Arcanos read through dreams", kind: "power", re: /dream/i},
  oracular: {label: "Oracular Ability (Merit)", kind: "trait", key: "oracular-ability"},
  nightmares: {label: "Nightmares (Flaw)", kind: "trait", key: "nightmares"}
};
export const cleanSource = v => (Object.hasOwn(SOURCES, String(v ?? "")) ? String(v ?? "") : "");

/** The Nightmares Flaw on waking: a Willpower roll at this difficulty; a failure costs this many dice until the next sleep. */
export const NIGHTMARES = {difficulty: 7, dice: 1};
/** A Nightmares roll read: {lose, words}. A botch counts as a failure. */
export function nightmareResult(successes, botch = false) {
  const lose = botch || !(Number(successes) > 0) ? NIGHTMARES.dice : 0;
  return {lose, words: lose ? "The dreams cling: one die less on every roll until the next sleep." : "Shaken, but the dreams let go at waking."};
}

/** The next day's sleep after now, given the time today's sleep hour falls at. */
export function nextSleep(todayAt, now, day = 86400) {
  const t = Number(todayAt), n = Number(now);
  if ( !Number.isFinite(t) || !Number.isFinite(n) ) return null;
  return t > n ? t : t + Math.ceil((n - t + 1) / day) * day;
}

/** A dream kept clean. */
export function normDream(d = {}) {
  const blank = v => v === null || v === undefined || v === "";
  const at = blank(d.at) ? NaN : Number(d.at);
  return {
    id: String(d.id ?? ""),
    actorId: d.actorId ? String(d.actorId) : null,
    source: cleanSource(d.source),
    title: String(d.title ?? "").trim().slice(0, 200) || "A dream",
    text: String(d.text ?? "").slice(0, 20000),
    at: Number.isFinite(at) ? at : null,
    released: !!d.released,
    releasedAt: !blank(d.releasedAt) && Number.isFinite(Number(d.releasedAt)) ? Number(d.releasedAt) : null,
    journalId: d.journalId ? String(d.journalId) : null
  };
}
export const normDreams = list => (Array.isArray(list) ? list : []).map(normDream).filter(d => d.id && d.actorId);

/** The dreams whose time has come, in the order they come. A dream with no time waits for the Release button. */
export function dueDreams(list, now) {
  const t = now === null || now === undefined || now === "" ? NaN : Number(now);
  return normDreams(list).filter(d => !d.released && d.at !== null && Number.isFinite(t) && d.at <= t).sort((a, b) => a.at - b.at);
}

/** A tied dream with no time of its own takes the next sleep. holds(dream) says whether the dreamer still has its source. */
export function tiedDue(list, now, sleepAt, holds = () => true) {
  const t = Number(now);
  return normDreams(list).filter(d => !d.released && d.at === null && d.source && Number.isFinite(t) && Number(sleepAt) <= t && holds(d));
}

/** Waiting first (soonest first, untimed last), then released (latest first). */
export function sortDreams(list) {
  const ds = normDreams(list);
  const waiting = ds.filter(d => !d.released).sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));
  const done = ds.filter(d => d.released).sort((a, b) => (b.releasedAt ?? 0) - (a.releasedAt ?? 0));
  return {waiting, done};
}

/** The journal's text: the Storyteller's words, paragraph by paragraph, escaped. */
export function dreamHtml(text) {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  return String(text ?? "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("") || "<p></p>";
}
