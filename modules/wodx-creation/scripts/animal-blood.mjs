/**
 * Ghouled animals, step four (B5130, B5131): what shows on the beast's token.
 *   - B5130 with five or more points of its domitor's blood, the domitor's clan weakness shows as a mark on the token
 *     (an effect with the clan's text), and a Brujah or Gangrel beast's frenzy is one harder to resist (WoDX NPC).
 *   - B5131 the beast's blood shows as the token's second bar, and its eyes catch the light red at night (a faint red
 *     light that shows only when the scene is dark).
 */
import {MODULE_ID, isAnimalGhoul, clanOf, domitorOf} from "./actor-data.mjs";
import * as AG from "./animal-ghoul-rules.mjs";

/** The mark has no duration, so its icon is set to show on the token always (Foundry 13 and later). */
const SHOW_ALWAYS = (() => { try { return CONST.ACTIVE_EFFECT_SHOW_ICON?.ALWAYS ?? null; } catch (e) { return null; } })();

const MARK = "wodx-clan-mark";
const isActiveGM = () => game.user?.isGM && game.users?.activeGM?.id === game.user.id;
/** The red eyes: a small dim light that shows only in the dark. */
export const EYES = {dim: 1, bright: 0, color: "#ff2a2a", alpha: 0.35, angle: 360, darkness: {min: 0.55, max: 1}, animation: {type: null}};

/** Put on or take off the clan mark to match the beast's blood now. */
export async function syncMark(actor) {
  if ( !actor || !isAnimalGhoul(actor) ) return null;
  const dom = domitorOf(actor);
  const clan = dom ? clanOf(dom)?.id ?? null : null;
  const mark = AG.clanMark(clan, Number(actor.system?.advantages?.bloodpool?.temporary) || 0);
  const have = [...(actor.effects ?? [])].find(e => e.getFlag?.(MODULE_ID, "clanMark"));
  if ( mark && have?.getFlag(MODULE_ID, "clanMark") === clan ) {
    // a mark made before the icon was forced on gets it now
    if ( SHOW_ALWAYS !== null && have.showIcon !== SHOW_ALWAYS ) await have.update({showIcon: SHOW_ALWAYS});
    return have;
  }
  if ( have ) await have.delete();
  if ( !mark ) {
    if ( actor.getFlag(MODULE_ID, "clanMark") ) await actor.unsetFlag(MODULE_ID, "clanMark");
    return null;
  }
  await actor.setFlag(MODULE_ID, "clanMark", {clan, frenzy: mark.frenzy ?? 0});
  const [e] = await actor.createEmbeddedDocuments("ActiveEffect", [{name: `${dom.name}'s blood: ${mark.label}`, img: "icons/svg/blood.svg",
    description: `${mark.text} (V20 Dark Ages p. 401: five or more points of the domitor's blood bring the clan's weakness.)`,
    statuses: [MARK], ...(SHOW_ALWAYS !== null ? {showIcon: SHOW_ALWAYS} : {}), flags: {[MODULE_ID]: {clanMark: clan}}}]);
  return e;
}

/** The blood bar and the red eyes on the beast's own token and its tokens on every scene. */
export async function showBlood(actor) {
  if ( !actor || !isAnimalGhoul(actor) ) return;
  // An animal ghoul is one beast, not a herd: its tokens are linked to its sheet, so the blood, the bond and the
  // clan's mark on the sheet are the ones its token shows
  const patch = {actorLink: true, "bar2.attribute": "advantages.bloodpool", "displayBars": CONST.TOKEN_DISPLAY_MODES?.OWNER_HOVER ?? 20, light: EYES};
  try { await actor.update({prototypeToken: foundry.utils.expandObject(patch)}); } catch (e) { /* older data */ }
  for ( const s of game.scenes ?? [] ) {
    const list = [...(s.tokens ?? [])].filter(t => t.actorId === actor.id && !t.flags?.[MODULE_ID]?.eyes);
    if ( list.length ) await s.updateEmbeddedDocuments("Token", list.map(t => ({_id: t.id, ...patch, [`flags.${MODULE_ID}.eyes`]: true})));
  }
}

export function registerAnimalBlood() {
  Hooks.on("updateActor", (actor, change) => {
    if ( !isActiveGM() ) return;
    const blood = foundry.utils.hasProperty(change, "system.advantages.bloodpool");
    const ghouled = foundry.utils.hasProperty(change, `flags.${MODULE_ID}.animalGhoul`) || foundry.utils.hasProperty(change, `flags.${MODULE_ID}.lineage`);
    if ( !blood && !ghouled ) return;
    if ( !isAnimalGhoul(actor) ) return;
    syncMark(actor).catch(e => console.error(`${MODULE_ID} | clan mark`, e));
    if ( ghouled ) showBlood(actor).catch(e => console.error(`${MODULE_ID} | blood bar`, e));
  });
}
