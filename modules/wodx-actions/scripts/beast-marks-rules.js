/**
 * WoDX Actions (B3562 to B3565): the Beast at the wheel, low Humanity on the body, waking from a long torpor and the
 * marks of diablerie. The pure parts, so the harness can test them. Everything here is V20 (and V20 Dark Ages for the
 * Roads); nothing comes from the fifth edition.
 *
 *   The Beast takes the token  a vampire in frenzy or Rötschreck is driven by the Beast (V20 pp. 297-299): the nearest
 *                    foe or blood in frenzy, away from fire or sun in Rötschreck. A Willpower point holds the Beast
 *                    back for a turn (V20 p. 310). WoDX hands the token to the NPC fight planner for those turns.
 *   Low Humanity     Bearing (V20 p. 310): Humanity 10 −2, 9-8 −1, 7-4 none, 3-2 +1, 1 +2 to Social rolls to seem
 *                    normal. Low Humanity shows in sunken eyes and a beast's look (V20 p. 311). Seeming alive for a
 *                    scene costs 8 − Humanity blood (V20 p. 269). Higher Humanity rises earlier (V20 p. 311); Road 7
 *                    and up just before sunset, 4 or less up to an hour after (V20 Dark Ages p. 113). Roads and Paths
 *                    use their own rating for the hour of rising; looks and bearing follow Humanity only.
 *   A long torpor    torpor's length by rating (V20 p. 283). WoDX's reading for a sleep longer than a lifetime: a card of
 *                    what changed, tongues kept as old forms, Abilities of the age behind until caught up (house).
 *   Diablerie        black veins in the aura for as many years as the victim's Generation stood below the
 *                    diablerist's first one, at least one (V20 p. 294); a taint felt for a month per Generation
 *                    removed, Perception at 12 − the sensing vampire's Humanity; Paths seldom notice (V20 p. 295).
 *                    The victim pushing through (optional, off by default): V20 p. 295 and V20 Dark Ages p. 356 speak
 *                    of diablerists taking on a victim's mannerisms when the victim had Willpower 10 and much stronger
 *                    blood. The book gives it as a rumour with no system: the trigger is the book's, the effect a house
 *                    rule (docs/PENDING-REVIEW.md).
 */

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const YEAR = 365.25 * 86400, MONTH = YEAR / 12;

/* ------------------------------------------------------------------ */
/*  The Beast takes the token                                          */
/* ------------------------------------------------------------------ */

/** How the Beast is handled in a fight: off, a card each turn, or the planner moves the token. */
export const BEAST_MODES = { off: "Off", card: "A card each turn of what the Beast wants", take: "The Beast takes the token (the NPC planner moves it)" };

/**
 * What the Beast wants this turn. state: "frenzy" | "rotschreck"; near: [{name, yards, kind: foe|friend|vessel|fire|sun}].
 * Frenzy goes for the nearest foe, else the nearest blood (anyone living); Rötschreck runs from the nearest fire or sun.
 */
export function beastWants(state, near = []) {
    const by = k => near.filter(x => k.includes(x.kind)).sort((a, b) => n(a.yards) - n(b.yards))[0] ?? null;
    if (state === "rotschreck") {
        const f = by(["fire", "sun"]);
        return { action: "flee", from: f?.name ?? "the fire", text: `The Red Fear: run from ${f?.name ?? "the fire"}, by any way out, over anyone in the way.` };
    }
    const foe = by(["foe"]);
    if (foe) return { action: "attack", target: foe.name, text: `Tear into ${foe.name}, the nearest foe${n(foe.yards) ? ` (${Math.round(n(foe.yards))} yards)` : ""}.` };
    const food = by(["vessel", "friend"]);
    if (food) return { action: "feed", target: food.name, text: `Blood: fall on ${food.name} and drink, friend or not.` };
    return { action: "rage", text: "No one in reach: the Beast smashes what is near and hunts for blood." };
}

/** May the player take a turn back? A Willpower point holds the Beast off for one turn (V20 p. 310). */
export function canHold(willpowerTemp, held = null, key = null) {
    if (n(willpowerTemp) < 1) return { ok: false, why: "no Willpower left" };
    if (held && key && held === key) return { ok: false, why: "already held this turn" };
    return { ok: true, cost: 1 };
}

/* ------------------------------------------------------------------ */
/*  Low Humanity                                                       */
/* ------------------------------------------------------------------ */

/** Bearing modifier to Social rolls (V20 p. 310): + makes the roll harder. */
export function bearing(rating) {
    const r = n(rating);
    if (r >= 10) return -2;
    if (r >= 8) return -1;
    if (r >= 4) return 0;
    if (r >= 2) return 1;
    return 2;
}

/** How far the face has gone: 0 none, 1 (Humanity 3-2) pale and sunken, 2 (1-0) a beast's look. Humanity only. */
export function lookOf(rating, { humanity = true } = {}) {
    if (!humanity) return 0;
    const r = n(rating);
    return r <= 1 ? 2 : r <= 3 ? 1 : 0;
}

/** Blood to seem alive for a scene: 8 − Humanity, none at 8 and up (V20 p. 269). */
export const seemAliveCost = rating => Math.max(0, 8 - n(rating));

/**
 * Minutes after sunset a vampire rises, by Humanity, Road or Path. V20 p. 311: higher rises earlier; V20 Dark Ages
 * p. 113: 7 and up just before sunset, 4 or less up to an hour after. The steps between are WoDX's.
 */
export function riseOffset(rating) {
    const r = n(rating);
    if (r >= 7) return -10;
    if (r >= 5) return 0;
    if (r === 4) return 20;
    if (r === 3) return 35;
    if (r === 2) return 50;
    return 60;
}
/** The rising time as seconds of the clock, from sunset's. */
export const riseAt = (sunsetSeconds, rating) => n(sunsetSeconds) + riseOffset(rating) * 60;
/** "just before sunset", "at sunset", "35 minutes after sunset". */
export function riseText(rating) {
    const m = riseOffset(rating);
    return m < 0 ? "just before sunset" : m === 0 ? "at sunset" : m >= 60 ? "an hour after sunset" : `${m} minutes after sunset`;
}

/* ------------------------------------------------------------------ */
/*  Waking from a long torpor                                          */
/* ------------------------------------------------------------------ */

/** A sleep longer than this many years is "longer than a lifetime" (the mortal lifespan WoDX uses for a time skip). */
export const LIFETIME = 70;
/** Tongues kept from before a sleep this long are old forms. */
export const OLD_TONGUE_YEARS = 100;
/** Abilities whose matter changes with the age. Each is behind after a long sleep until caught up. */
export const AGE_BOUND = ["firearms", "drive", "computer", "technology", "science", "medicine", "finance", "law", "politics",
    "streetwise", "etiquette", "academics", "investigation", "security", "crafts", "commerce", "seneschal", "melee", "archery", "ride"];

export const sleptYears = (since, until) => Math.max(0, (n(until) - n(since)) / YEAR);

/**
 * What a sleep leaves behind. since, until: world seconds; startYear, endYear: calendar years; langs: [names];
 * abilities: [{key, value}]; events: [{year, name, lines}] from the dated events; line: "vampire".
 * Returns null if the sleep was not longer than a lifetime.
 */
export function wakeReport({ startYear = 0, endYear = 0, langs = [], abilities = [], events = [], line = "vampire" } = {}) {
    const years = n(endYear) - n(startYear);
    if (years <= LIFETIME) return null;
    const lines = ["all", line];
    const happened = (events ?? []).filter(e => n(e.year) > n(startYear) && n(e.year) <= n(endYear) && (!e.lines?.length || e.lines.some(l => lines.includes(l))))
        .sort((a, b) => n(a.year) - n(b.year));
    const oldTongues = years >= OLD_TONGUE_YEARS ? [...new Set((langs ?? []).map(String).filter(Boolean))] : [];
    const behind = (abilities ?? []).filter(a => n(a.value) > 0 && AGE_BOUND.includes(String(a.key).toLowerCase().replace(/\s+/g, "")))
        .map(a => ({ key: a.key, label: a.label ?? a.key, value: n(a.value), xp: catchUpXp(a.value), months: catchUpMonths(years) }));
    return { years: Math.round(years), centuries: Math.floor(years / 100), events: happened, oldTongues, behind,
        topics: ["who rules the domain and the city", "the tongues spoken in the street", "the money and what it buys", "the weapons and the watch"] };
}

/** House: catching an Ability up costs XP equal to its dots and a month of study per century slept (at least one). */
export const catchUpXp = dots => Math.max(1, n(dots));
export const catchUpMonths = years => Math.max(1, Math.ceil(n(years) / 100));
/** House: while behind, rolls with the Ability are one harder; an old tongue is understood only for the gist (Intelligence + Linguistics, 7). */
export const BEHIND_DIFFICULTY = 1;
export const OLD_TONGUE_GIST = { attr: "intelligence", ability: "linguistics", difficulty: 7 };

/* ------------------------------------------------------------------ */
/*  The marks of diablerie                                             */
/* ------------------------------------------------------------------ */

/**
 * The marks a diablerie leaves. victimGen, diablerist's original Generation (before the drink), at: world seconds.
 * Veins: years = original − victim, at least one (V20 p. 294). Taint: a month per Generation removed (V20 p. 295).
 */
export function diablerieMarks({ victimGen = 13, originalGen = 13, at = 0, victim = "", victimWillpower = 0 } = {}) {
    const diff = n(originalGen) - n(victimGen);
    const years = Math.max(1, diff);
    const months = Math.max(1, Math.abs(diff));
    return { at: n(at), victim: String(victim || ""), victimGen: n(victimGen), originalGen: n(originalGen), years, months,
        veinsUntil: n(at) + years * YEAR, taintUntil: n(at) + months * MONTH, soul: soulMayPush({ victimGen, originalGen, victimWillpower }) };
}
/** The marks still showing at a time. */
export function marksNow(marks = [], now = 0) {
    const list = (marks ?? []).filter(Boolean);
    return { veins: list.filter(m => n(now) < n(m.veinsUntil)), taint: list.filter(m => n(now) < n(m.taintUntil)) };
}
/** The Perception roll to feel the taint (V20 p. 295): difficulty 12 − the sensing vampire's Humanity; Paths seldom notice. */
export function taintDifficulty(humanity, { onPath = false } = {}) {
    if (onPath) return null;
    return Math.max(2, Math.min(10, 12 - n(humanity)));
}

/** "Much stronger blood": two Generations or more below the diablerist's first one (house reading of V20 p. 295). */
export const MUCH_STRONGER = 2;
/** The book's trigger: Willpower 10 and much stronger blood. */
export function soulMayPush({ victimGen = 13, originalGen = 13, victimWillpower = 0 } = {}) {
    return n(victimWillpower) >= 10 && n(originalGen) - n(victimGen) >= MUCH_STRONGER;
}
/**
 * The house effect, once a night while the veins show: the diablerist rolls Willpower against 6 + the Generations
 * between them (most 9). A failure: for the scene the victim's habits and wants push through, an urge like a
 * derangement the Storyteller plays; a botch: for the night.
 */
export const soulDifficulty = (victimGen, originalGen) => Math.max(6, Math.min(9, 6 + n(originalGen) - n(victimGen)));
export function soulResult(roll = {}) {
    if (roll.botch) return { pushes: true, length: "night", text: "The victim's soul rises for the whole night." };
    if (!n(roll.successes)) return { pushes: true, length: "scene", text: "The victim's habits and wants push through for the scene." };
    return { pushes: false, length: null, text: "The diablerist holds their own soul tonight." };
}
