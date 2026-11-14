/**
 * WoDX Otherworlds: what Wyrm corruption looks like on a place's scene (B4621, show-don't-tell desk v2). Pure rules,
 * no Foundry; the Foundry side is corruption-looks.mjs.
 *
 * A place set up for Wyrm corruption shows its state: a sickly green-grey cast over the whole scene that deepens with
 * the band, a patch of sludge and dead growth at each thing that feeds it, and a murky haze for its Banes. The marks
 * follow the place's state, not the clock: when the level, the sources or the Banes change, the marks are drawn again;
 * a cleansed place loses them. Spots are seeded by the scene, so the same state always draws the same marks. Strengths
 * and sizes are house rules.
 */
import {bandOf} from "./corruption-rules.mjs";

/** By band: how strong the cast over the whole scene is (0 none, 1 the worst). */
export const CAST = {clean: 0, tainted: 0.25, blighted: 0.5, foul: 0.75, hellhole: 1};
/** At most this many haze spots for Banes, however many breed. */
export const MAX_HAZE = 6;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** A seeded number stream (mulberry32 over a string hash). */
export function seeded(seed) {
  let h = 2166136261;
  for ( const c of String(seed) ) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  let a = (h >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** What the marks stand for: when this changes, the marks are drawn again. */
export function signature(place = {}) {
  const band = bandOf(place.level).id;
  if ( band === "clean" ) return "clean";
  const src = (place.sources ?? []).map(s => s.kind).join(",");
  return `${band}|${src}|${Math.min(MAX_HAZE, Math.max(0, Math.round(num(place.banes))))}`;
}

/**
 * The marks for a place's corruption on one scene. place: the normalised corruption flag; rect: the scene's playable
 * rectangle; grid: pixels a square; seed: the scene id. Returns [{kind, at: {x, y, radius} | null, intensity, note}].
 * A clean place has none.
 */
export function looksFor(place = {}, {rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, seed = ""} = {}) {
  const band = bandOf(place.level).id;
  const cast = CAST[band] ?? 0;
  if ( !cast ) return [];
  const rand = seeded(`${seed}:wyrm`);
  const spot = r => {
    const radius = Math.round(r * grid), pad = Math.min(radius, rect.width / 4, rect.height / 4);
    return {x: Math.round(rect.x + pad + rand() * Math.max(1, rect.width - 2 * pad)), y: Math.round(rect.y + pad + rand() * Math.max(1, rect.height - 2 * pad)), radius};
  };
  const out = [{kind: "taint", at: null, intensity: cast, note: `a ${band} place`}];
  for ( const s of place.sources ?? [] ) out.push({kind: "taint", at: spot(1.5 + cast * 1.5), intensity: Math.min(1, 0.5 + cast / 2), note: `sludge and dead growth: ${s.name || s.kind}`});
  const haze = Math.min(MAX_HAZE, Math.max(0, Math.round(num(place.banes))));
  for ( let i = 0; i < haze; i++ ) out.push({kind: "smoke", at: spot(2), intensity: 0.5, note: "a murky haze where Banes gather"});
  return out;
}

/** The colour a fallback drawing takes (without WoDX Chronicle's looks layer); alpha scales with intensity. */
export const FALLBACK = {taint: {color: "#4d5a2a", alpha: 0.35}, smoke: {color: "#33381f", alpha: 0.3}};
export const fallbackAlpha = look => Math.round((FALLBACK[look.kind]?.alpha ?? 0.3) * (look.at ? 1 : 0.6) * Math.max(0.2, num(look.intensity) || 1) * 100) / 100;
