/**
 * WoDX Paperdoll 0.26.0 (B3443): the marks on a Kindred's face that a mortal who sees it cannot explain away. Pure
 * rules, no Foundry.
 *
 * The talking faces draw clan marks, but the art changed nothing. Now the marks a mortal can see, and that no
 * living face has, go into what a witness remembers (WoDX Library's look) and count as a Masquerade breach (WoDX
 * Actions): the Nosferatu's whole face, a Gargoyle's stone, a Samedi's rot, a Gangrel's beast eyes and whiskers, a
 * Tzimisce's shaped bone and so on. Pallor, scars, paint, jewellery and the glow of a mood pass for mortal. A mask
 * over the face, or Obfuscate, hides them all. Which marks count is WoDX's reading of each clan's look.
 */

/** Groups whose every mark betrays them: a Nosferatu, a Gargoyle, a Samedi. */
export const UNCANNY_GROUPS = new Set(["nosferatu/Nosferatu", "kindred/Gargoyle", "kindred/Samedi"]);
/** The marks of other Kindred that no mortal face has. */
export const UNCANNY_IDS = new Set([
  "v-long-fangs", "v-black-eyes", "v-hunger-glow", "v-bloodtears", "v-beast-eyes",
  "v-gangrel-fur", "vc-gan-amber", "vc-gan-whiskers", "vc-gan-glow", "vc-gan-beast-brow",
  "vc-tzi-ridges", "vc-tzi-extra-eye", "vc-tzi-scales", "vc-tzi-spikes", "vc-tzi-gills", "vc-tzi-bone-ear",
  "v-setite-eyes", "vc-set-forked", "vc-set-scales-cheek", "vc-set-yellow",
  "vc-baa-horn-buds", "vc-baa-forked", "vc-baa-veins-red", "vc-baa-infernal", "vc-baa-goat-eyes",
  "vc-lam-scales", "vc-lam-tongue", "vc-lam-gold-eyes",
  "vc-noi-fish", "v-salubri-eye", "vc-kia-black-eyes", "vc-kia-blue-skin",
  "v-harbinger", "vc-har-bone-mask", "vc-har-hollow-eyes", "vc-har-nose", "vc-har-cracks",
  "v-cappadocian", "vc-cap-skull-cheek", "vc-cap-dead-eyes",
  "vc-nag-teeth", "vc-nag-wide-mouth", "vc-nag-dead-flesh"
]);
/** Lines whose faces the Masquerade guards. */
export const MASQUERADE_LINES = new Set(["kindred", "nosferatu"]);

/** Is this feature one a mortal cannot explain away? f: {id, line, group}. */
export const isUncanny = f => !!f && MASQUERADE_LINES.has(f.line) && (UNCANNY_GROUPS.has(`${f.line}/${f.group}`) || UNCANNY_IDS.has(f.id));

/** Worn over the face, a figure piece hides the marks (WoDX Paperdoll's figure menu, by name). */
export const MASK_RE = /balaclava|ninja hood|niqab|gas mask|filter mask|face veil|wedding veil|beekeeping hood|bone mask|domino/i;
export function masked(slots = {}) {
  return ["face", "head"].some(k => MASK_RE.test(String(slots?.[k]?.n ?? "")));
}

/**
 * The marks a mortal sees on this face: their labels, at most max. S: {line, features}; FEATURES: the feature table;
 * state: the states now on (a form feature shows only while its state is on); hidden: masked or Obfuscated.
 */
export function uncannyMarks(S, FEATURES, {state = {}, hidden = false, max = 3} = {}) {
  if ( hidden || !S || !MASQUERADE_LINES.has(S.line) ) return [];
  const out = [];
  for ( const id of S.features ?? [] ) {
    const f = FEATURES?.[id];
    if ( !f || (f.state && !state?.[f.state]) || !isUncanny(f) ) continue;
    out.push(f.label);
    if ( out.length >= max ) break;
  }
  return out;
}
