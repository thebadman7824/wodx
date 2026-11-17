/**
 * WoDX Solo: Report a problem, the rules (B7160 to B7163). Pure functions, tested in tools/harness/solo-report.test.mjs.
 *
 * A report is one fault met in play, written down where it happened: what went wrong, what was expected, the build,
 * the scene, the character, the game date and the last console errors. report.mjs saves it as a journal entry in the
 * "Reported problems" folder; tools/solo/reports.mjs exports the entries and files them in the feature registry.
 */

export const FOLDER = "Reported problems";
export const ERRORS_KEPT = 20;
export const CARDS_KEPT = 5;
export const WHAT_MAX = 2000;
export const EXPECTED_MAX = 1000;

/** The kinds of fault, in the order the form shows them. */
export const KINDS = [
  {id: "broken", label: "Something broke or did nothing", hint: "an error, a button that does nothing, a window that never opens"},
  {id: "rule", label: "A rule worked out wrong", hint: "the dice, a difficulty, a cost or a result is not what the book says"},
  {id: "looks", label: "Something looks wrong", hint: "the map, a token, a sheet or a window"},
  {id: "missing", label: "Something is missing", hint: "a choice, a place, a person or a rule that should be there"},
  {id: "other", label: "Something else", hint: ""}
];
export const kindOf = id => KINDS.find(k => k.id === id) ?? KINDS[KINDS.length - 1];

const clip = (s, n) => String(s ?? "").replace(/\r\n?/g, "\n").trim().slice(0, n);

/** A report id: rp-<world>-<time in base 36>. The world part keeps reports from two worlds apart. */
export function reportId(world = "", at = Date.now()) {
  const w = String(world || "world").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "world";
  return `rp-${w}-${Math.max(0, Math.floor(Number(at) || 0)).toString(36)}`;
}

/** Where an error came from: the first module or system path in its stack or source, as a repo path. */
export function sourceOf(text = "") {
  const s = String(text ?? "");
  const m = /\/(modules\/[\w-]+\/[^\s:)?#]+|systems\/worldofdarkness\/[^\s:)?#]+)/.exec(s);
  if ( !m ) return "";
  return m[1].replace(/^systems\/worldofdarkness\//, "system/worldofdarkness/");
}

/** One captured console error, cut to size. */
export function errorEntry({at = Date.now(), msg = "", stack = "", src = ""} = {}) {
  return {at: new Date(Number(at) || Date.now()).toISOString(), msg: clip(msg, 400), src: src || sourceOf(stack) || sourceOf(msg)};
}

/** Keep the last n errors (oldest first), dropping a repeat of the one before. */
export function pushError(list = [], entry, n = ERRORS_KEPT) {
  const last = list[list.length - 1];
  if ( last && last.msg === entry.msg && last.src === entry.src ) return list;
  const out = [...list, entry];
  return out.length > n ? out.slice(out.length - n) : out;
}

/** The module a report most likely belongs to: the errors' sources first, then the open windows, else "". */
export function guessModule({errors = [], windows = []} = {}) {
  const count = new Map();
  const add = (id, w) => { if ( id ) count.set(id, (count.get(id) ?? 0) + w); };
  for ( const e of errors ) {
    const m = /^modules\/(wodx-[\w-]+)\//.exec(e?.src ?? "") ?? (/^system\/worldofdarkness\//.test(e?.src ?? "") ? [null, "worldofdarkness"] : null);
    add(m?.[1], 2);
  }
  for ( const w of windows ) {
    const m = /^(wodx-[a-z]+)/.exec(String(w ?? ""));
    if ( m ) add(m[1] === "wodx-wizard" ? "wodx-creation" : m[1], 1);
  }
  let best = "", n = 0;
  for ( const [id, c] of count ) if ( c > n ) { best = id; n = c; }
  return best;
}

/** The build from a package's release.json: {label, commit, mixed}. An unstamped file gives empty strings. */
export function buildOf(data) {
  const commit = typeof data?.commit === "string" && /^[0-9a-f]{7,40}$/i.test(data.commit.trim()) ? data.commit.trim().toLowerCase() : "";
  const label = commit && typeof data?.label === "string" && /^[\w.-]{1,40}$/.test(data.label.trim()) ? data.label.trim() : "";
  return {label, commit, mixed: false};
}

/** Check what the person typed. Returns {ok, why}. */
export function checkInput({what = "", kind = "other"} = {}) {
  if ( clip(what, WHAT_MAX).length < 3 ) return {ok: false, why: "Say in a few words what happened."};
  if ( !KINDS.some(k => k.id === kind) ) return {ok: false, why: "Pick what kind of problem it is."};
  return {ok: true, why: ""};
}

/** The whole report from what was typed and what the client saw. */
export function buildReport(input = {}, ctx = {}) {
  const at = Number(ctx.at) || Date.now();
  const errors = (ctx.errors ?? []).slice(-ERRORS_KEPT);
  const windows = (ctx.windows ?? []).map(String).slice(0, 20);
  return {
    id: reportId(ctx.world, at),
    at: new Date(at).toISOString(),
    by: String(ctx.by ?? ""),
    role: ctx.isGM ? "storyteller" : "player",
    kind: kindOf(input.kind).id,
    what: clip(input.what, WHAT_MAX),
    expected: clip(input.expected, EXPECTED_MAX),
    build: {label: String(ctx.build?.label ?? ""), commit: String(ctx.build?.commit ?? ""), mixed: !!ctx.build?.mixed},
    world: String(ctx.world ?? ""),
    scene: ctx.scene ? {id: String(ctx.scene.id ?? ""), name: String(ctx.scene.name ?? "")} : null,
    actor: ctx.actor ? {id: String(ctx.actor.id ?? ""), name: String(ctx.actor.name ?? ""), type: String(ctx.actor.type ?? "")} : null,
    gameDate: String(ctx.gameDate ?? ""),
    worldTime: Number(ctx.worldTime) || 0,
    errors,
    cards: (ctx.cards ?? []).map(String).slice(-CARDS_KEPT),
    windows,
    modules: {...(ctx.modules ?? {})},
    guess: guessModule({errors, windows})
  };
}

/** The journal entry's name: the date and the first words of what happened. */
export function entryName(r) {
  const words = String(r?.what ?? "").replace(/\s+/g, " ").trim();
  const head = words.length > 60 ? `${words.slice(0, 57).trim()}...` : words;
  return `${String(r?.at ?? "").slice(0, 16).replace("T", " ")} ${head}`.trim();
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

/** The page people read in the journal. The full report rides on the entry's flag. */
export function reportHtml(r) {
  const row = (k, v) => (v ? `<tr><th>${esc(k)}</th><td>${v}</td></tr>` : "");
  const errs = (r.errors ?? []).length
    ? `<h3>Last console errors</h3><ol>${r.errors.map(e => `<li><code>${esc(e.at.slice(11, 19))}</code> ${esc(e.msg)}${e.src ? ` <span class="wodx-quiet">(${esc(e.src)})</span>` : ""}</li>`).join("")}</ol>`
    : "<p>No console errors were caught before the report.</p>";
  return `<h2>${esc(kindOf(r.kind).label)}</h2>
<p><b>What happened:</b> ${esc(r.what).replace(/\n/g, "<br>")}</p>
${r.expected ? `<p><b>What was expected:</b> ${esc(r.expected).replace(/\n/g, "<br>")}</p>` : ""}
<table>${row("Reported by", `${esc(r.by)} (${esc(r.role)})`)}${row("When", esc(r.at.replace("T", " ").slice(0, 19)) + " UTC")}${row("Build", esc([r.build.label, r.build.commit.slice(0, 7)].filter(Boolean).join(", ") || "not stamped") + (r.build.mixed ? " (mixed packages)" : ""))}${row("Scene", esc(r.scene?.name))}${row("Character", r.actor ? `${esc(r.actor.name)} (${esc(r.actor.type)})` : "")}${row("Game date", esc(r.gameDate))}${row("Recent cards", esc((r.cards ?? []).join("; ")))}${row("Open windows", esc((r.windows ?? []).join(", ")))}</table>
${errs}`;
}

/** Reports still waiting on a player's own user flag (no Storyteller was there to save them). */
export function addPending(list = [], report, max = 50) {
  if ( !report?.id || (list ?? []).some(r => r?.id === report.id) ) return [...(list ?? [])];
  return [...(list ?? []), report].slice(-max);
}
