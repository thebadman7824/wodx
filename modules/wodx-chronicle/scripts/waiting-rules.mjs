/**
 * Cards that wait for the Storyteller, the pure rules (WoDX Chronicle 0.46.0, B2452): which buttons a card has, whether
 * it waits for an answer, and the safe choice to take on it. Moved here from WoDX Solo, whose hidden seat makes the
 * same choice; the Waiting tray (waiting.mjs) offers it to a Storyteller at the table. No Foundry here.
 */

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
