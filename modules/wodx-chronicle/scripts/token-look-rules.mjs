/**
 * WoDX Chronicle: how a token shows what grips it (B4632, show-don't-tell desk c1 and c3). Pure rules, no Foundry; the
 * Foundry side is token-looks.mjs.
 *
 * Frenzy: the Beast shows to everyone as a red glow round the token and a slight shake. Rotschreck: a cold, flickering
 * glow as the Red Fear takes them. A derangement bout happens inside the head, so only the character's own player
 * sees it: the edges of their screen darken, swim, burn red or go grey for the bout, by the derangement. Other modules
 * add their own token looks (a sick pallor, a Wyrm haze seen only by those who sense it) through registerTokenLook.
 */

/** Token looks by condition: tint (a colour the token is washed with), aura {color, alpha, radius in token widths}, shake, flicker. */
export const CONDITION_LOOKS = {
  frenzy: {aura: {color: 0xc0221b, alpha: 0.35, radius: 0.75}, tint: 0xffb0a8, shake: 2},
  rotschreck: {aura: {color: 0x6fa8dc, alpha: 0.3, radius: 0.7}, tint: 0xc8dcff, flicker: true}
};

/** The screen edge a derangement bout brings its own player: dark, swim, red, grey, bright or green. */
export const DERANGEMENT_EDGE = {
  paranoia: "dark", schizophrenia: "swim", synesthesia: "swim", hysteria: "swim", multiple: "swim", manic: "bright", phobia: "dark",
  fugue: "grey", regression: "grey", perfection: "grey", megalomania: "red", obsession: "red", bulimia: "red", animism: "green"
};
export const edgeOf = keys => {
  const k = (keys ?? []).find(x => DERANGEMENT_EDGE[x]);
  return k ? DERANGEMENT_EDGE[k] : (keys?.length ? "dark" : null);
};

/** The CSS for each screen edge (a fixed layer over the canvas, under the windows; pointer events pass through). */
export const EDGE_CSS = {
  dark: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)",
  swim: "radial-gradient(ellipse at center, transparent 50%, rgba(40,60,90,0.55) 100%)",
  red: "radial-gradient(ellipse at center, transparent 55%, rgba(120,0,0,0.6) 100%)",
  grey: "radial-gradient(ellipse at center, transparent 45%, rgba(110,110,110,0.65) 100%)",
  bright: "radial-gradient(ellipse at center, transparent 55%, rgba(255,240,190,0.5) 100%)",
  green: "radial-gradient(ellipse at center, transparent 55%, rgba(30,80,30,0.55) 100%)"
};

/**
 * Put several looks together (a frenzied, sick character): the strongest aura wins, tints multiply, shake and flicker
 * hold if any asks. fx: the player's effects level ("full", "light" or "off"): light drops the shake and the flicker,
 * off shows nothing.
 */
export function combine(looks = [], fx = "full") {
  const live = looks.filter(Boolean);
  if ( fx === "off" || !live.length ) return null;
  const out = {tint: null, aura: null, shake: 0, flicker: false};
  for ( const l of live ) {
    if ( Number.isFinite(l.tint) ) out.tint = out.tint === null ? l.tint : mulTint(out.tint, l.tint);
    if ( l.aura && (!out.aura || l.aura.alpha > out.aura.alpha) ) out.aura = {...l.aura};
    if ( l.shake ) out.shake = Math.max(out.shake, l.shake);
    if ( l.flicker ) out.flicker = true;
  }
  if ( fx === "light" ) { out.shake = 0; out.flicker = false; }
  return out;
}
export function mulTint(a, b) {
  const ch = (x, s) => (x >> s) & 0xff;
  return [16, 8, 0].reduce((acc, s) => acc | (Math.round(ch(a, s) * ch(b, s) / 255) << s), 0);
}
