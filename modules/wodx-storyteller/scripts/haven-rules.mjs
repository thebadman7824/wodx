/**
 * WoDX Storyteller 0.15.0: havens with security. No Foundry calls here.
 *
 * A haven is a scene (scene flag wodx-storyteller.haven) that belongs to one or more characters: a vampire's haven,
 * a chantry or sanctum, a freehold, a haunt, a hunter's safe house. Most lines rate it as a Background: Domain in
 * V20 and V20 Dark Ages (each dot buys size or security; security adds 1 to intruders' difficulty and takes 1 from
 * tracking them), Chantry and Sanctum in M20, Holdings in C20, a Haunt in Wraith 20th. The Storyteller sets how many
 * dots go to security. Who knows where it is is kept as a list, so a rumour or a faction can expose it.
 */

/** Backgrounds that rate a home, by line, with the page that says what they do. */
export const BACKGROUNDS = [
  {re: /^domain\b/i, name: "Domain", line: "V20, V20 Dark Ages", ref: "V20 pp. 112-113; V20 Dark Ages p. 180", security: true},
  {re: /^(chantry|construct)\b/i, name: "Chantry", line: "M20", ref: "M20 pp. 308-309", security: false},
  {re: /^(sanctum|laboratory)\b/i, name: "Sanctum", line: "M20", ref: "M20 pp. 323-324", security: false},
  {re: /^holdings?\b/i, name: "Holdings", line: "C20", ref: "C20 pdf pp. 170-171", security: false},
  {re: /^haunt\b/i, name: "Haunt", line: "Wraith 20th", ref: "Wraith 20th pdf p. 208", security: false},
  {re: /^haven\b/i, name: "Haven", line: "house rule", ref: "", security: true}
];

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const ids = v => (Array.isArray(v) ? [...new Set(v.map(String).filter(Boolean))] : []);

export function normHaven(h = {}) {
  if ( !h || typeof h !== "object" ) return null;
  return {
    name: String(h.name ?? "").trim().slice(0, 80), owners: ids(h.owners), guests: ids(h.guests),
    security: Math.max(0, Math.min(5, Math.round(n(h.security)))),
    known: (Array.isArray(h.known) ? h.known : []).map(k => ({who: String(k?.who ?? "").slice(0, 80), how: String(k?.how ?? "").slice(0, 200), at: n(k?.at)})).filter(k => k.who).slice(-30),
    note: String(h.note ?? "").slice(0, 500)
  };
}

/** The best home Background among a character's backgrounds [{name, value}]. */
export function ratingFrom(backgrounds = []) {
  let best = null;
  for ( const b of backgrounds ) {
    const kind = BACKGROUNDS.find(k => k.re.test(String(b?.name ?? "").trim()));
    if ( !kind ) continue;
    const v = n(b.value);
    if ( !best || v > best.value ) best = {kind: kind.name, value: v, ref: kind.ref, line: kind.line, security: kind.security};
  }
  return best;
}

/** Security dots can't be more than the Domain behind them (when the haven rests on a Domain). */
export function capSecurity(security, rating) {
  const s = Math.max(0, Math.min(5, Math.round(n(security))));
  if ( rating?.kind === "Domain" ) return Math.min(s, n(rating.value));
  return s;
}

/** Add someone to the list of those who know where it is (once). */
export function addKnown(haven, who, how, at) {
  const h = normHaven(haven) ?? normHaven({});
  const w = String(who ?? "").trim();
  if ( !w ) return h;
  if ( !h.known.some(k => k.who.toLowerCase() === w.toLowerCase()) ) h.known.push({who: w.slice(0, 80), how: String(how ?? "").slice(0, 200), at: n(at)});
  return h;
}

export function forget(haven, who) {
  const h = normHaven(haven);
  if ( !h ) return h;
  h.known = h.known.filter(k => k.who.toLowerCase() !== String(who ?? "").toLowerCase());
  return h;
}

/** What the scene's walls and tiles hold for defence: locks and traps of WoDX Interactables. */
export function defences({walls = [], tiles = []} = {}) {
  let locks = 0, traps = 0;
  for ( const w of walls ) { const f = w?.flags?.["wodx-interactables"] ?? {}; if ( (f.lock && f.lock !== "none") || w?.ds === 2 ) locks++; }
  for ( const t of tiles ) { const f = t?.flags?.["wodx-interactables"] ?? {}; if ( f.trap ) traps++; if ( f.container && f.lock && f.lock !== "none" ) locks++; }
  return {locks, traps};
}
