/**
 * WoDX Storyteller 0.16.0: bodies that change. No Foundry calls here.
 *
 * A record of lasting changes to a character's body: flesh reshaped by Vicissitude, a metis deformity, a wraith's
 * Corpus Moliated, a demon's visage breaking through, Wyrm taint, a scar that never healed. The books say what each
 * change does; the record keeps what was done, where, whether it shows, and any change to Appearance, so the sheet
 * and the token can show it and the Storyteller can undo it.
 */

/** Where a change comes from, with the pages that cover it. */
export const SOURCES = {
  vicissitude: {label: "Vicissitude", line: "Vampire", ref: "V20 p. 241 on; V20 Dark Ages p. 268"},
  metis: {label: "Metis deformity", line: "Werewolf", ref: "W20 p. 74; Dark Ages: Werewolf p. 80"},
  moliate: {label: "Moliate", line: "Wraith", ref: "Wraith 20th pp. 195-198"},
  visage: {label: "A demon's visage", line: "Demon", ref: "Demon: The Fallen pp. 170-171"},
  taint: {label: "Taint or corruption", line: "any", ref: ""},
  scar: {label: "A lasting wound or scar", line: "any", ref: ""},
  other: {label: "Something else", line: "any", ref: ""}
};

/** Where on the body. The paperdoll reads these keys. */
export const PARTS = {
  face: "Face", head: "Head and hair", eyes: "Eyes", mouth: "Mouth and teeth", skin: "Skin", arms: "Arms",
  hands: "Hands and claws", torso: "Chest and back", legs: "Legs", voice: "Voice", whole: "The whole body"
};

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n(v))));

export function newId() { return Math.random().toString(36).slice(2, 10); }

/** Normalise one change. */
export function normChange(c = {}) {
  if ( !c || typeof c !== "object" ) return null;
  const what = String(c.what ?? "").trim().slice(0, 200);
  if ( !what ) return null;
  return {
    id: String(c.id || newId()), source: SOURCES[c.source] ? c.source : "other", part: PARTS[c.part] ? c.part : "whole",
    what, appearance: clampInt(c.appearance, -5, 5), shows: c.shows !== false, by: String(c.by ?? "").slice(0, 80),
    at: n(c.at), note: String(c.note ?? "").slice(0, 300)
  };
}

export const normBody = list => (Array.isArray(list) ? list.map(normChange).filter(Boolean).slice(-40) : []);

/**
 * The Appearance after a change. Appearance stays between 0 and the sheet's maximum; a character the line holds at
 * 0 (a Nosferatu, the Samedi) stays at 0, so the change is kept in the record only.
 */
export function appearanceAfter(current, delta, {max = 5, locked = false} = {}) {
  const cur = clampInt(current, 0, Math.max(5, n(max)));
  if ( locked ) return cur;
  return clampInt(cur + n(delta), 0, Math.max(5, n(max)));
}

/** The changes that show, grouped by part, for the sheet or the token. */
export function shownByPart(list) {
  const out = {};
  for ( const c of normBody(list) ) if ( c.shows ) (out[c.part] ??= []).push(c);
  return out;
}

/** One line for a change. */
export function describeChange(c) {
  const x = normChange(c);
  if ( !x ) return "";
  const ap = x.appearance ? ` (Appearance ${x.appearance > 0 ? "+" : ""}${x.appearance})` : "";
  return `${PARTS[x.part]}: ${x.what}${ap}${x.shows ? "" : ", hidden"}`;
}

/** Clans and kinds held at Appearance 0 by their books, matched on the sheet's clan or bloodline. */
export const ZERO_APPEARANCE = /\b(nosferatu|samedi)\b/i;
