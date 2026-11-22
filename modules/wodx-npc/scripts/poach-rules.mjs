/**
 * WoDX NPC (Dark Ages depth desk item 6, B7638-B7640): a domain someone else wants. The pure part; factions.mjs rolls
 * the hunt, posts the signs and the tracking roll.
 *
 * Book basis (in WoDX's own words; printed pages):
 *   Domain is feeding ground the Prince or another Cainite authority upholds. A dot may go to security instead of size;
 *   each dot of security adds 1 to the difficulty of intruding and takes 1 from the holder's difficulty to find and track
 *   an intruder (V20 Dark Ages p. 180; V20 p. 113). Hunting in another's fief without leave breaks the Tradition of
 *   Domain, and the court is where it is answered (V20 Dark Ages p. 28; the court's laws in politics-rules.mjs).
 * WoDX readings (B7638-B7640): an NPC who feeds in a player's domain leaves signs there, and takes one from the
 * district's herd; the holder may track the poacher with Perception + Investigation (Survival in the wilds) at 6, less
 * a dot of security each, to no less than 3; a success names the poacher and the court's law it broke.
 */

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** The base difficulty to track a poacher (WoDX reading: the books' usual difficulty of 6). */
export const TRACK_BASE = 6;

/**
 * Is this hunt a poach of a player's domain? h: faction-rules huntingAt's result; holder: the faction that holds the
 * place; pcIds: the ids of player-owned characters; hunterId: the one who hunted. A player's own hunt is never a poach.
 */
export function isPoach(h, holder, pcIds = new Set(), hunterId = null) {
  if ( !h?.trespass || !holder || h.trespass.faction !== holder.id ) return false;
  if ( hunterId && pcIds.has(hunterId) ) return false;
  return [...(holder.members ?? []), holder.leader].some(id => id && pcIds.has(id));
}

/** The player-owned holders of the domain: the members (and leader) of the holding faction who are player characters. */
export const holdersOf = (holder, pcIds = new Set()) => [...new Set([holder?.leader, ...(holder?.members ?? [])].filter(id => id && pcIds.has(id)))];

/**
 * What the holder finds in the domain after a poach (WoDX reading, B7638). feeds: "blood" or "chi"; wild: the place is
 * in the wilds. Three signs, the first always the vessel.
 */
export function poachSigns({feeds = "blood", wild = false} = {}) {
  const vessel = feeds === "chi" ? "One of your herd is found grey and short of breath, as if something drew the life out of them."
    : "One of your herd is found pale and faint, with two small marks already closing at the throat.";
  const thin = "There are fewer of the herd about than there should be, and those left keep to their doors after dark.";
  const trail = wild ? "Broken bracken and a track that does not belong to any beast you know." : "Someone who is not one of yours was seen where the herd gathers, and gone before anyone could say who.";
  return [vessel, thin, trail];
}

/** The tracking roll's difficulty: 6, less a dot of the domain's security each, to no less than 3 (V20 Dark Ages p. 180). */
export const trackDiff = security => Math.max(3, TRACK_BASE - Math.max(0, Math.min(5, Math.round(num(security)))));

/** The tracking pool: Perception + Investigation in town, Perception + Survival in the wilds (WoDX reading, B7639). */
export function trackPool(traits = {}, wild = false) {
  const skill = wild ? "survival" : "investigation";
  return {attr: "perception", skill, dice: Math.max(1, num(traits.perception) + num(traits[skill]))};
}

/**
 * The court's law a poacher broke: the first law of the holder's polity about hunting where one has no right, or the
 * Tradition of Domain when the polity has none (B7640). laws: the polity's law list.
 */
export function brokenLaw(laws = []) {
  return (laws ?? []).find(l => /hunting (in|on) another/i.test(String(l))) ?? "the Tradition of Domain";
}

/** The verdict of the tracking roll. res: {net, botch}. */
export function trackVerdict(res = {}) {
  if ( res.botch ) return "lost";
  return num(res.net) > 0 ? "found" : "cold";
}
