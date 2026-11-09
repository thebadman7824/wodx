/**
 * Dreams and visions you write (WoDX Storyteller 0.6.0), the pure rules. The Storyteller writes a dream for a
 * character between sessions and sets when it comes; the clock releases it then, as a journal only that character's
 * players can open. No Foundry here.
 */

/** The hour a dream comes by default: in the day's sleep (the Kindred sleep by day; others are abed by then too). */
export const DEFAULT_HOUR = 8;

/** A dream kept clean. */
export function normDream(d = {}) {
  const blank = v => v === null || v === undefined || v === "";
  const at = blank(d.at) ? NaN : Number(d.at);
  return {
    id: String(d.id ?? ""),
    actorId: d.actorId ? String(d.actorId) : null,
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
