/**
 * A player codex (WoDX Storyteller 0.7.0), the pure rules: each player character's own journal of what they know,
 * filled when the Storyteller reveals a page to them. No Foundry here.
 */

export const CODEX_FOLDER = "WoDX codices";
export const codexName = name => `Codex: ${String(name ?? "").trim() || "someone"}`;

/**
 * The page to write into a codex from a revealed page. src: {uuid, name, type, text, img, sort}; when: a date label.
 * Text pages carry a line saying when it was learned; image pages keep their picture; others become a link.
 */
export function codexPage(src = {}, when = "") {
  const learned = when ? `<p class="wodx-quiet wodx-codex-when">Learned ${esc(when)}.</p>` : "";
  const base = {name: String(src.name ?? "A page"), sort: Number(src.sort) || 0, flags: {from: String(src.uuid ?? "")}};
  if ( src.type === "image" && src.img ) return {...base, type: "image", src: String(src.img), caption: when ? `Learned ${when}` : ""};
  if ( src.type === "text" ) return {...base, type: "text", text: `${String(src.text ?? "")}${learned}`};
  return {...base, type: "text", text: `<p>@UUID[${String(src.uuid ?? "")}]{${esc(src.name ?? "A page")}}</p>${learned}`};
}

/** For each revealed page: add it, or change the copy already there (matched by where it came from). */
export function planReveal(existing = [], pages = []) {
  const byFrom = new Map((existing ?? []).filter(p => p?.from).map(p => [p.from, p.id]));
  const add = [], change = [];
  for ( const p of pages ?? [] ) {
    const id = byFrom.get(p.flags?.from);
    if ( id ) change.push({id, ...p}); else add.push(p);
  }
  return {add, change};
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

/**
 * Storyteller 0.30.0 (Traits With Teeth step 9): what a character must know to learn a page. A page or journal named
 * with a tag in square brackets, as "The Tremere Pyramid [Occult 5]", needs Intelligence + Occult of 5 or more; several
 * tags separated by "or" each do ("[Occult 5 or Academics 6]"). Returns [{ability, need}] or [] for a page anyone learns.
 */
export function needsOf(name = "") {
  const tag = String(name ?? "").match(/\[([^\]]+)\]/)?.[1] ?? "";
  return tag.split(/\s+or\s+|,/i).map(s => s.trim().match(/^([a-z][a-z -]*?)\s+(\d{1,2})$/i)).filter(Boolean)
    .map(m => ({ability: m[1].toLowerCase().replace(/[^a-z]/g, ""), need: Number(m[2])}));
}
/** Whether a character knows enough: dots = {intelligence, abilities: {key: dots}}. True when nothing is needed. */
export function knowsEnough(needs = [], dots = {}) {
  if ( !needs.length ) return true;
  const int = Number(dots.intelligence) || 0;
  return needs.some(n => int + (Number(dots.abilities?.[n.ability]) || 0) >= n.need);
}
/** The page's name without its tag, for the copy in the codex. */
export const bareName = name => String(name ?? "").replace(/\s*\[[^\]]*\]\s*/g, " ").trim() || String(name ?? "");
