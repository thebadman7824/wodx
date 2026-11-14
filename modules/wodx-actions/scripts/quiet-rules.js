/**
 * WoDX Actions (B3550): the Quiet as a state a mage is in, the rules part (no Foundry). Mage 20th pp. 555-559.
 *
 * A mage falls into Quiet after a strong backlash (10 or more points discharged), a trauma, or (optional rule) a
 * Resonance or Synergy trait reaching five dots. The level follows the mage's current Paradox pool, and the M20 forms
 * are Denial, Madness and Morbidity. The state ends by the book's means: Paradox worked off by rising out of it (a
 * Willpower point and three successes in one roll, scene by scene), a mindscape that clears the pool, another mage's
 * Mind 4 / Prime 4 cure, or the Storyteller.
 *
 * Eras: from 1450 (the Sorcerers Crusade and after). Dark Ages mages follow Dark Ages: Mage, so the state is not
 * offered before then. All wording here is WoDX's own.
 */

import { quietLevel } from "./m20-rules.js";

export const REF = "Mage 20th pp. 555-559";
export const FROM = 1450;

/** Does the Quiet state apply in this year? No year (no chronicle) means the M20 rules. */
export const applies = year => year === null || year === undefined || !Number.isFinite(Number(year)) || Number(year) >= FROM;

const n = v => { const x = Math.round(Number(v)); return Number.isFinite(x) ? x : 0; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** The forms of Quiet (p. 556 chart, pp. 557-559), each with what it does at levels 1-2, 3-4 and 5-6. */
export const TYPES = {
    denial: { label: "Denial", gloss: "refuses to see what is there and insists on what is not",
        bands: ["stubborn refusals and small projections: the obvious is simply not there",
            "blind or deaf to the denied thing, or hears a twisted version of it; the quirks turn dangerous",
            "the denial leaks into the world nearby: voices fail, people blurt things out or seem to vanish while the mage is there"] },
    madness: { label: "Madness", gloss: "mood swings, obsessions and hallucinations",
        bands: ["small ripples: a phone that did not ring, a name nobody called, a smell from nowhere, sudden moods",
            "vivid hallucinations and erratic acts; at level 3 only the mage sees them, from level 4 others start to see them too",
            "wild visions, violence or catatonia; the mage may fall into a mindscape or rave with a god's power"] },
    morbidity: { label: "Morbidity", gloss: "fixed on death, decay and pain",
        bands: ["flashes of anger and despair, a pull toward ruin and decay",
            "a corpse-like pallor, macabre acts and a growing bloodlust",
            "cruelty without limit; at the top a sadistic killer one step from the Cauls"] }
};
export const TYPE_KEYS = Object.keys(TYPES);

/** What brought it on (p. 555). */
export const CAUSES = {
    backlash: "a strong backlash (10 or more Paradox discharged)",
    trauma: "a trauma: a botched Mind Effect of rank 3 or more, torture, conditioning, a great loss, a mind or head wound",
    resonance: "Resonance or Synergy at five dots (optional rule; Arete at 8 failed)",
    storyteller: "the Storyteller's call"
};

/** The level now: 0 with an empty pool, else by the chart (p. 556). */
export function levelOf(paradox) {
    const p = n(paradox);
    if (p <= 0) return { level: 0, text: "no Quiet" };
    return quietLevel(p);
}
const band = level => (level <= 2 ? 0 : level <= 4 ? 1 : 2);
/** What the form does at a level. */
export function effectOf(type, level) {
    const t = TYPES[type] ?? TYPES.madness;
    const l = n(level);
    if (l <= 0) return "";
    if (l >= 6) return "the mage goes Marauder and passes to the Storyteller";
    return t.bands[band(l)];
}
/** Do other people see the visions? Madness from level 4 (p. 558); a hobgoblin always can. */
export const othersSee = (type, level) => (type === "madness" && n(level) >= 4);
/** Level 6 takes the character from the player (pp. 555-556). */
export const marauder = level => n(level) >= 6;

/** A trauma roll to keep the Quiet away (p. 555): Willpower for the mind, Stamina for the body, the Paradox pool as difficulty. */
export function traumaRoll(paradox, { physical = false } = {}) {
    return { pool: physical ? "stamina" : "willpower", difficulty: clamp(n(paradox) || 2, 2, 10) };
}

/** Rising out of it (p. 556): a Willpower point, a turn doing nothing else, three successes in one roll. */
export function riseDifficulty(level, { optional = false } = {}) {
    return optional ? clamp(n(level) + 5, 6, 10) : 7;
}
export function rise({ successes = 0, botch = false } = {}) {
    if (botch) return { cleared: false, hobgoblin: true, worse: false, text: "the delusion takes shape as a hobgoblin" };
    const s = n(successes);
    if (s >= 3) return { cleared: true, hobgoblin: false, worse: false, text: "a clear head for the rest of the scene, and a Paradox point gone" };
    if (s >= 1) return { cleared: false, hobgoblin: false, worse: true, text: "one or two successes only make the delusion seem more real" };
    return { cleared: false, hobgoblin: false, worse: false, text: "nothing changes" };
}

/** A hobgoblin lasts a day for each dot of the mage's Arete (p. 559). */
export const hobgoblinDays = arete => Math.max(1, n(arete));

/** A mindscape (pp. 558-559): a day a Paradox point, a week a point over 10; it clears the pool when the mage comes out. */
export function mindscapeTime(paradox) {
    const p = Math.max(0, n(paradox));
    return p > 10 ? { count: p, unit: "week", days: p * 7 } : { count: p, unit: "day", days: p };
}
/** The mindscape rolls (p. 557 chart): difficulty is the Quiet level + 3. */
export const MINDSCAPE_ROLLS = [
    ["Meditate into a mindscape", "Perception + Meditation"],
    ["Retreat into a Demesne", "Perception + Demesne (or Willpower at 9)"],
    ["Shorten the time inside", "Wits + Enigmas, or Perception + Demesne"],
    ["Reach the world outside", "Willpower"]
];
export const mindscapeDifficulty = level => clamp(n(level) + 3, 4, 10);

/** Another mage's cure (p. 557): Mind 4 and Prime 4, two or three of the healer's Quintessence for each Paradox point. */
export function cureCost(points) {
    const p = Math.max(0, n(points));
    return { min: p * 2, max: p * 3, needs: { mind: 4, prime: 4 } };
}
export function canCure({ mind = 0, prime = 0 } = {}) { return n(mind) >= 4 && n(prime) >= 4; }

/** The flag kept on the mage: wodx-actions.quiet. */
export function cleanQuiet(q) {
    if (!q || typeof q !== "object" || !TYPES[q.type]) return null;
    return {
        type: q.type, cause: CAUSES[q.cause] ? q.cause : "storyteller", since: Number(q.since) || 0,
        seen: Array.isArray(q.seen) ? q.seen.map(String).filter(Boolean).slice(0, 40) : [],
        mindscape: q.mindscape && typeof q.mindscape === "object" ? { from: Number(q.mindscape.from) || 0, days: Math.max(0, n(q.mindscape.days)) } : null,
        clearScene: String(q.clearScene ?? "")
    };
}
/** Is the Quiet over? Only an empty pool ends it by itself; permanent Paradox keeps it (p. 559). */
export const over = paradox => n(paradox) <= 0;

/** A token only the mage's players see: the ids kept on the token flag wodx-actions.quietSeen. */
export function hiddenFrom(seenIds, userId, isGM) {
    if (isGM || !Array.isArray(seenIds) || !seenIds.length) return false;
    return !seenIds.includes(String(userId));
}
