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
