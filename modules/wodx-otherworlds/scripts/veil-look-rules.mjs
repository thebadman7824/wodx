/**
 * WoDX Otherworlds: what only the right eyes see (B4634, show-don't-tell desk v14 and c4, the smaller fix). Pure
 * rules, no Foundry; the Foundry side is veil-looks.mjs.
 *
 * Where the Gauntlet wears thin (3 or less where a character stands), a faint shimmer lies over the scene for those
 * whose sight reaches the spirit world: werebeasts and mages. Where the Shroud wears thin (5 or less), a faint grey
 * mist lies over it for the dead and those who see through their eyes. A person with Wyrm taint carries a faint dark
 * haze, seen only by those who sense the Wyrm: werebeasts, and anyone with a Sense Wyrm power. The Storyteller sees
 * them all. Everyone else sees nothing. Thresholds and strengths are house rules.
 */
export const THIN = {gauntlet: 3, shroud: 5};
export const SHIMMER = {color: 0x9fd0ff, alpha: 0.07};
export const MIST = {color: 0x9a9a9a, alpha: 0.12};
export const HAZE = {aura: {color: 0x2a3318, alpha: 0.45, radius: 0.8}};

/** Who can see across: by the viewer's nature (Otherworlds senses), and their own sight picks. */
export const SEES_GAUNTLET = new Set(["werebeast", "witch"]);
export const SEES_SHROUD = new Set(["ghost"]);
export const SEES_WYRM = new Set(["werebeast"]);
export const SENSE_WYRM = /\bsense (the )?wyrm\b|\bsense wyrm\b/i;

/** What the viewer sees over the scene where they stand: {shimmer, mist}. ratings: {gauntlet, shroud} there. */
export function veilFor(ratings = {}, {nature = "human", gm = false, sights = []} = {}) {
  const g = Number(ratings.gauntlet), s = Number(ratings.shroud);
  const gThin = Number.isFinite(g) && g > 0 && g <= THIN.gauntlet;
  const sThin = Number.isFinite(s) && s > 0 && s <= THIN.shroud;
  return {
    shimmer: gThin && (gm || SEES_GAUNTLET.has(nature) || sights.includes("penumbra")),
    mist: sThin && (gm || SEES_SHROUD.has(nature) || sights.includes("shroud"))
  };
}

/** Can this viewer sense the Wyrm? nature, the names of their powers, and whether they are the Storyteller. */
export const sensesWyrm = ({nature = "human", powers = [], gm = false} = {}) => gm || SEES_WYRM.has(nature) || powers.some(p => SENSE_WYRM.test(String(p)));
