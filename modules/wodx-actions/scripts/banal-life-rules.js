/**
 * WoDX Actions (B3555): Banality from everyday life, the rules part (no Foundry). Changeling 20th p. 269: long
 * exposure to a strong source of Banality (a person or a thing) costs a temporary Banality point, usually after a scene
 * of uncomfortable contact; how much exposure is the Storyteller's, who should say when the point is close. Grumps
 * do not gain Banality this way.
 *
 * WoDX counts the exposure: a scene in a place tagged as an office, a court of law or a Technocracy site; a scene with
 * Autumn People present; a week of a long task worked in such a place. When enough has gathered, the Storyteller gets
 * a card suggesting the point. How much is enough grows with the era (a house rule, docs/PENDING-REVIEW.md): the world
 * grows more banal from 1450, and more again after 1700.
 */

export const REF = "Changeling 20th p. 269";

/** The place tags (WoDX NPC PLACE_KINDS) that count as banal. */
export const BANAL_KINDS = {
    office: "an office or counting house",
    courthouse: "a court of law or council chamber",
    technocracy: "a Technocracy site"
};
export const isBanalKind = kind => Object.hasOwn(BANAL_KINDS, String(kind ?? ""));

/** The weight of the age: 1 before 1450, 2 to 1699, 3 from 1700. No year (no chronicle): the modern weight. */
export function weightOf(year) {
    const y = Number(year);
    if (year === null || year === undefined || !Number.isFinite(y)) return 3;
    return y >= 1700 ? 3 : y >= 1450 ? 2 : 1;
}
/** Exposures that make one point, by weight: three in the medieval world, two from 1450, one from 1700. */
export const NEED = { 1: 3, 2: 2, 3: 1 };
export const needFor = year => NEED[weightOf(year)];
export const WEIGHT_WORDS = { 1: "the old world still dreams: three such scenes make a point",
    2: "the Age of Reason closes in: two such scenes make a point", 3: "the modern world is banal: every such scene can cost a point" };

/** How much exposure a scene gave: {count, why[]}. */
export function sceneExposure({ kind = "", autumn = [] } = {}) {
    const why = [];
    if (isBanalKind(kind)) why.push(`a scene in ${BANAL_KINDS[kind]}`);
    const names = (autumn ?? []).filter(Boolean);
    if (names.length) why.push(`time with ${names.length === 1 ? names[0] : `${names.length} of the Autumn People`}`);
    return { count: why.length, why };
}
/** A long task worked in a banal place: one exposure for each full week of it. */
export const taskExposure = ({ kind = "", days = 0 } = {}) => (isBanalKind(kind) ? Math.floor(Math.max(0, Number(days) || 0) / 7) : 0);

/** Grumps are spared (p. 269). */
export const spared = seeming => /grump/i.test(String(seeming ?? ""));

/**
 * Add exposure to a tally. Returns {tally (left over), points (suggested now), close (one short of the next point)}.
 */
export function add(tally, count, year) {
    const need = needFor(year);
    let t = Math.max(0, Math.round(Number(tally) || 0)) + Math.max(0, Math.round(Number(count) || 0));
    const points = Math.floor(t / need);
    t -= points * need;
    return { tally: t, points, need, close: need > 1 && t === need - 1 };
}
