/**
 * WoDX Actions — Dark Ages fae, the pure rules (Phase 6g). No Foundry here: the harness tests every function.
 *
 * Mechanics from Dark Ages: Fae, in WoDX's words, with the printed page numbers. The sheet keeps its fae traits on the
 * actor's flags (wodx-actions.daFae): {origin, court, mists: {perm, temp}, weaving: {perm, temp}, dominions: {id: rating},
 * cantrips: [{name, dominion, level, trait, note}], lesser: [text], greater: [text], echoes: [{trigger, note}],
 * oaths: [{kind, rating, terms, active}], mien: bool, hiddenSince, weavingDay: {day, n}, system: "da"|"c20"|null}.
 */

export const REF = "Dark Ages: Fae";

/** Origins (pp. 59–63, 86): starting Mists, Weaving, Dominion dots; Unleashing dice; the Echo shift. */
export const ORIGINS = {
    changeling: { label: "Changeling", mists: 2, weaving: 4, dominions: 2, unleashDice: 5, echoShift: -1, page: 59,
        birthright: "Echoes count one level lower", frailty: "one fewer Dominion dot; cannot give a sprite faerie form", mienRoll: "Mists to take the mien, Weaving to return (difficulty 6)", unleashOnlyInMien: true },
    inanimae: { label: "Inanimae", mists: 3, weaving: 3, dominions: 3, unleashDice: 5, echoShift: 0, page: 63, extraEchoes: 1, greater: 1,
        birthright: "rebuilds the body into mien or human shape near the element (Weaving, difficulty 6)", frailty: "one more Echo; an element shown to mortals checks for a new Echo", mienRoll: "Weaving to change (difficulty 6)" },
    firstborn: { label: "Firstborn", mists: 4, weaving: 2, dominions: 3, unleashDice: 3, echoShift: 1, page: 61, alwaysMien: true,
        birthright: "three Unleashing dice, not five", frailty: "Echoes count one level higher", mienRoll: "always in mien; hides by the Day Dominion or the Mists" }
};

/** The Dominions (pp. 119–120, 123, 131): Court, element, prime hour and season. */
export const DOMINIONS = {
    day: { label: "Day", court: "summer", element: "fire", hour: "noon", season: "the summer solstice", gloss: "light, fire, faith, minds, leadership, a mortal guise", page: 131 },
    night: { label: "Night", court: "winter", element: "water", hour: "midnight", season: "the winter solstice", gloss: "darkness, fear, cold, misery", page: 139 },
    dawn: { label: "Dawn", court: "spring", element: "earth", hour: "sunrise", season: "the vernal equinox", gloss: "senses, body, time, healing, shielding the mind", page: 147 },
    dusk: { label: "Dusk", court: "autumn", element: "air", hour: "sunset", season: "the autumnal equinox", gloss: "spirits, travel, gateways, reading minds, the past", page: 155 }
};
export const DOMINION_IDS = Object.keys(DOMINIONS);

/** The Courts (p. 87): the favoured Dominion; Solstice has none and may not take Status. */
export const COURTS = {
    spring: { label: "Spring", favored: "dawn" }, summer: { label: "Summer", favored: "day" },
    autumn: { label: "Autumn", favored: "dusk" }, winter: { label: "Winter", favored: "night" },
    solstice: { label: "Solstice", favored: null }
};

/** How far each level reaches (the Day outline, pp. 132–133; the other Dominions follow the same steps). */
export const SCOPE = {
    1: "the caster or one touched target; minor or short-lived",
    2: "one or two others within about five feet; bashing or lethal harm",
    3: "a small group within about ten feet; aggravated harm possible",
    4: "a large group within sight; Saining into the Court",
    5: "any area the fae has seen and touched, and all within it"
};

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * The prime hour and the solstice or equinox (p. 120): the half hour either side of noon, midnight, sunrise or sunset;
 * the day itself for the season (astronomical day of year: vernal 80, summer 172, autumnal 266, winter 355).
 * @param {string} dominion
 * @param {{hour:number, sunrise:number|null, sunset:number|null, doy:number}} t  local solar hours, day of year
 */
export function timeBonus(dominion, t = {}) {
    const h = n(t.hour);
    const near = (c) => c !== null && c !== undefined && Math.min(Math.abs(h - c), 24 - Math.abs(h - c)) <= 0.5;
    const centre = { day: 12, night: 0, dawn: t.sunrise ?? null, dusk: t.sunset ?? null }[dominion];
    const hour = near(centre);
    const SEASON_DAYS = { dawn: 80, day: 172, dusk: 266, night: 355 };
    const sd = SEASON_DAYS[dominion];
    const season = !!sd && Math.abs(n(t.doy) - sd) <= 0;
    return { hour, season };
}

/** Mists or Weaving 3 or more above the other (p. 102): "mists", "weaving" or null. */
export function imbalance(mists, weaving) {
    const m = n(mists), w = n(weaving);
    if (m - w >= 3) return "mists";
    if (w - m >= 3) return "weaving";
    return null;
}

/** Cantrips allowed per Dominion: one per permanent Weaving dot, each at most the Dominion's rating (pp. 89, 120). */
export function cantripCap(weaving, rating) { return { count: Math.max(0, n(weaving)), maxLevel: clamp(n(rating), 0, 5) }; }

/** Check a cantrip list against the caps: [{dominion, problem}]. */
export function cantripProblems(cantrips = [], { weaving = 0, dominions = {} } = {}) {
    const out = [];
    for (const d of DOMINION_IDS) {
        const mine = cantrips.filter(c => c.dominion === d);
        const r = n(dominions[d]);
        if (mine.length && !r) out.push({ dominion: d, problem: `no ${DOMINIONS[d].label} dots` });
        if (mine.length > n(weaving)) out.push({ dominion: d, problem: `${mine.length} cantrips; Weaving ${n(weaving)} allows ${n(weaving)}` });
        for (const c of mine) if (n(c.level) > r) out.push({ dominion: d, problem: `${c.name} is level ${c.level}; ${DOMINIONS[d].label} is ${r}` });
    }
    return out;
}

/** The difficulty modifiers shared by cantrips and the Unleashing's base pool (pp. 89, 93, 102, 120). */
function lowering({ dominion, court, time = {}, holding = 0 }) {
    const notes = [];
    let down = 0;
    if (court && COURTS[court]?.favored === dominion) { down += 1; notes.push(`−1 the ${COURTS[court].label} Court's Dominion`); }
    if (time.hour) { down += 1; notes.push(`−1 at ${DOMINIONS[dominion].hour}`); }
    if (time.season) { down += 1; notes.push(`−1 on ${DOMINIONS[dominion].season}`); }
    if (holding) { down += 1; notes.push("−1 in a holding of this Dominion"); }
    return { down, notes };
}

/**
 * A cantrip (pp. 120–121): Dominion + the trait it names, difficulty 6 (or its own), lowered by Court, hour, season and
 * a holding; +1 in Mists imbalance; floor 4.
 * @returns {{ok, dice, difficulty, notes, why?}}
 */
export function castPlan({ dominion, rating = 0, trait = 0, traitLabel = "the trait", level = 1, court = null, mists = 0, weaving = 0 },
    { time = {}, holding = 0, base = 6, mod = 0 } = {}) {
    if (!DOMINIONS[dominion]) return { ok: false, why: "choose a Dominion" };
    if (n(rating) < 1) return { ok: false, why: `no dots in ${DOMINIONS[dominion].label}` };
    if (n(level) > n(rating)) return { ok: false, why: `a level-${level} cantrip needs ${DOMINIONS[dominion].label} ${level}` };
    const low = lowering({ dominion, court, time, holding });
    const notes = [`${DOMINIONS[dominion].label} ${rating} + ${traitLabel} ${n(trait)}`, ...low.notes];
    let diff = n(base) - low.down + n(mod);
    if (n(mod)) notes.push(`${n(mod) > 0 ? "+" : "−"}${Math.abs(n(mod))} the Storyteller's modifier`);
    if (imbalance(mists, weaving) === "mists") { diff += 1; notes.push("+1 in Mists imbalance"); }
    const difficulty = clamp(diff, 4, 10);
    if (diff < 4) notes.push("difficulty never below 4");
    return { ok: true, dice: n(rating) + n(trait), difficulty, notes };
}

/**
 * An Unleashing (pp. 121–122): Mists + Dominion (lowered as a cantrip) against an Unleashing pool of 5 dice (3 for the
 * firstborn), less one in a holding with that effect, less one per Weaving point spent; +1 in Weaving imbalance (to the
 * base pool). Changelings Unleash only in their mien.
 */
export function unleashPlan({ dominion, rating = 0, origin = "changeling", court = null, mists = 0, weaving = 0, mien = true },
    { time = {}, holding = 0, holdingCalm = false, weavingSpent = 0, base = 6, mod = 0 } = {}) {
    const O = ORIGINS[origin] ?? ORIGINS.changeling;
    if (!DOMINIONS[dominion]) return { ok: false, why: "choose a Dominion" };
    if (n(rating) < 1) return { ok: false, why: `no dots in ${DOMINIONS[dominion].label}` };
    if (O.unleashOnlyInMien && !mien) return { ok: false, why: "a changeling Unleashes only in the fae mien" };
    const low = lowering({ dominion, court, time, holding });
    const notes = [`Mists ${n(mists)} + ${DOMINIONS[dominion].label} ${n(rating)}`, ...low.notes];
    let diff = n(base) - low.down + n(mod);
    if (imbalance(mists, weaving) === "weaving") { diff += 1; notes.push("+1 in Weaving imbalance"); }
    const difficulty = clamp(diff, 4, 10);
    let wild = O.unleashDice - (holdingCalm ? 1 : 0);
    if (holdingCalm) notes.push("−1 Unleashing die in the holding");
    const spent = clamp(n(weavingSpent), 0, wild);
    wild -= spent;
    if (spent) notes.push(`${spent} Weaving spent: −${spent} Unleashing ${spent === 1 ? "die" : "dice"}${wild === 0 ? " (no danger left)" : ""}`);
    return { ok: true, dice: n(mists) + n(rating), wildDice: wild, difficulty, wildDifficulty: clamp(n(base) + n(mod), 4, 10), weavingSpent: spent, notes };
}

/**
 * Read an Unleashing (pp. 121–122). base and wild are {successes, botch}.
 * controlled: the effect happens and obeys; wild: it happens, out of control; signs: only the visible signs; havoc: a botch.
 * The fae regains 1 Mists per two successes on the base pool, whatever happened (p. 102).
 */
export function unleashOutcome(base, wild = { successes: 0, botch: false }) {
    const bs = n(base?.successes), ws = n(wild?.successes);
    const mistsBack = Math.floor(bs / 2);
    if (base?.botch || wild?.botch) return { result: "havoc", mistsBack };
    if (bs < 1) return { result: "signs", mistsBack };
    if (bs >= ws) return { result: "controlled", successes: bs, mistsBack };
    return { result: "wild", successes: bs, mistsBack };
}

/** After a havoc, 2 Weaving lower the havoc one step, never below the first (p. 102). */
export function havocStep(step, weaving) { const k = Math.floor(n(weaving) / 2); return { step: Math.max(1, n(step) - k), cost: Math.min(k, Math.max(0, n(step) - 1)) * 2 }; }

/**
 * Counter a cantrip or an Unleashing (pp. 130–131).
 *   absorb:  Dominion + Weaving at 7 against the cantrip roll; needs that Dominion and to act first; a Weaving point is an
 *            automatic success; winning by 3 or more gains a Mists point.
 *   scatter: Mists at 5 + the cantrip's level against the cantrip roll; a Mists point is an automatic success.
 *   unravel: against an Unleashing, Mists at 8; each success removes one of the caster's base successes; all of them and
 *            the Unleashing becomes a botch; a Mists point is an automatic success.
 */
export function counterPlan(kind, { mists = 0, weaving = 0, rating = 0, level = 1 } = {}) {
    if (kind === "absorb") {
        if (n(rating) < 1) return { ok: false, why: "absorbing needs a dot in the cantrip's Dominion" };
        return { ok: true, dice: n(rating) + n(weaving), difficulty: 7, spend: "weaving", needsFirst: true };
    }
    if (kind === "scatter") return { ok: true, dice: n(mists), difficulty: clamp(5 + n(level), 4, 10), spend: "mists" };
    if (kind === "unravel") return { ok: true, dice: n(mists), difficulty: 8, spend: "mists" };
    return { ok: false, why: "choose a way to counter" };
}
export function counterOutcome(kind, mine, theirs) {
    const m = n(mine), t = n(theirs);
    if (kind === "unravel") { const left = Math.max(0, t - m); return { result: left === 0 && t > 0 ? "botched" : left < t ? "weakened" : "holds", left }; }
    if (m > t) return { result: "countered", mistsGain: kind === "absorb" && m - t >= 3 ? 1 : 0 };
    return { result: "holds", mistsGain: 0 };
}

/**
 * Face an Echo (pp. 110–112): the mortal's Willpower at 7, or 5 dice when no one wields it. The Origin shifts the
 * successes (firstborn +1, changelings −1); each oath roll (its rating at 7) and 2 Weaving per success take them away.
 * A true name is an automatic 5 before oaths. The result is the effect level 0–5; 0 frees the fae of that Echo for the scene.
 */
export function echoLevel({ successes = 0, origin = "changeling", oathSuccesses = 0, weavingSpent = 0, trueName = false } = {}) {
    const O = ORIGINS[origin] ?? ORIGINS.changeling;
    let s = trueName ? 5 : n(successes);
    if (!trueName && s > 0) s += O.echoShift;
    s -= n(oathSuccesses);
    s -= Math.floor(n(weavingSpent) / 2);
    return clamp(s, 0, 5);
}
/** What each level does (p. 111), in WoDX's words. */
export const ECHO_LEVELS = {
    0: "The Echo fails; the fae is free of it for the scene.",
    1: "Discomfort: the fae keeps clear of the source while it lasts; perhaps −1 or −2 dice.",
    2: "Powers come hard: difficulty penalties on Dominions, Mists and Weaving.",
    3: "The mien partly shows (the Mists can cover it); up to three bashing levels.",
    4: "No Dominions on that mortal and no Unleashing while it lasts; up to four lethal levels.",
    5: "Banished from the place for a day and night, and terribly harmed."
};
/** The harm at level 5 (p. 111): {aggravated, lethalPerTwoTurns, newEchoes, note}. */
export function echoFive(origin) {
    if (origin === "inanimae") return { aggravated: 0, lethalPerTwoTurns: 0, newEchoes: 0, note: "falls apart into the element until enough of it gathers to rebuild" };
    return { aggravated: 3, lethalPerTwoTurns: 1, newEchoes: origin === "changeling" ? 2 : 0, note: origin === "changeling" ? "and two new permanent Echoes, the Storyteller's choice" : "" };
}
/** A short pick list per level, in WoDX's words (the book's 25 examples, pp. 112–113, are its own). */
export const ECHO_PICKS = {
    1: ["cannot bring itself to strike the bearer without a Willpower roll (6)", "+1 to every difficulty while it lasts", "must stay twenty feet from the source"],
    2: ["+2 to Dominion, Mists and Weaving rolls", "Mists powers cost double", "pain as if Mauled for half Mists turns"],
    3: ["three bashing levels, soakable", "frozen in place for Mists turns", "the mien glows into view"],
    4: ["the fae's active magic within fifty yards fails", "blinded while near it", "thrown into imbalance for some hours"],
    5: ["three aggravated levels, then a lethal level per two turns near it", "turned to stone (Dawn 5 Unleashed to restore)"]
};

/** The roll to escape a new Echo when mortals see the mien (p. 114): 10 dice at 7 with these losses. */
export function newEchoPool({ lesser = 0, greater = 0, origin = "changeling", mortals = 1, cantrip = false, unleash = false, awry = false } = {}) {
    if (n(lesser) < 5 && n(greater) < 1) return { atRisk: false, dice: 0, difficulty: 7 };
    let dice = 10 - Math.floor(n(lesser) / 5) - n(greater) - (origin === "inanimae" ? 1 : 0) - Math.floor(n(mortals) / 3) - (cantrip ? 1 : 0) - (unleash ? (awry ? 3 : 2) : 0);
    return { atRisk: true, dice: Math.max(0, dice), difficulty: 7 };
}
/** Any success is safe; a failure gives one Echo; a botch or no dice, two. */
export function newEchoOutcome(r, dice) { if (n(dice) <= 0 || r?.botch) return 2; return n(r?.successes) > 0 ? 0 : 1; }

/** The Mists' uses (pp. 101–102): their costs and rolls. */
export const MISTS_USES = {
    kenning: { label: "Bestow Kenning for a day", cost: 1, costSupernatural: 2, resist: "an unwilling target rolls Willpower (6) against Mists (6)", page: 101 },
    cloak: { label: "Cloak a cantrip", cost: 1, note: "onlookers with Kenning need Perception + Kenning (8); Unleashings cannot be cloaked", page: 101 },
    enhance: { label: "Enhance the mien for the scene", cost: 2, note: "a Lesser Feature works as a Greater one; mortals who see it risk an Echo", page: 101 },
    hide: { label: "Hide from mortals", cost: 0, roll: { difficulty: 7 }, note: "the mien is hidden until the fae uses a Dominion uncloaked or ends it; more days hidden than Willpower and the fae is Lost", page: 101 }
};
/** Bestow Kenning's price: 1 for a mortal, 2 for a supernatural being, 1 for a Kindred on the Road of Humanity or a homid Garou (pp. 101, 181–182). */
export function kenningCost(target = "mortal") { return target === "mortal" || target === "humane-kindred" || target === "homid" ? 1 : 2; }

/** Suppressing the Mists (p. 102): Weaving spent more times a day than Mists gives +2 to Mists rolls; after more such days than Willpower, Locked. */
export function suppression({ spendsToday = 0, mists = 0, streak = 0, willpower = 0 } = {}) {
    const over = n(spendsToday) > n(mists);
    return { over, mistsPenalty: over ? 2 : 0, lockedRisk: over && n(streak) > n(willpower) };
}
/** Hidden by the Mists more days than Willpower: Lost (p. 101). */
export function hiddenRisk(days, willpower) { return n(days) > n(willpower); }

/** The warning signs (p. 103): more than two and the fae is close to Lost or Locked. */
export function driftSigns({ mists = 0, weaving = 0, spoiledCasts = 0, changedNature = false, echoesWorse = false } = {}) {
    const imb = imbalance(mists, weaving);
    const signs = [imb && `${imb === "mists" ? "Mists" : "Weaving"} imbalance`, spoiledCasts > 0 && "spoiled magic", changedNature && "an overnight change of nature", echoesWorse && "Echoes bite differently"].filter(Boolean);
    return { signs, toward: imb === "mists" ? "Lost" : imb === "weaving" ? "Locked" : null, near: signs.length > 2 };
}

/** Regaining (pp. 102): Mists 1 a day in a faerie realm (an hour with that holding effect), 1 per two Unleashing successes;
 * Weaving 1 a day in a faerie realm, and one per success rolling an oath's rating (6) when keeping it. */
export function realmRest({ days = 0, hours = 0, holdingRestores = false } = {}, f = {}) {
    const gain = n(days) + (holdingRestores ? n(hours) : 0);
    const mists = { ...f.mists }, weaving = { ...f.weaving };
    mists.temp = Math.min(n(mists.perm), n(mists.temp) + gain);
    weaving.temp = Math.min(n(weaving.perm), n(weaving.temp) + gain);
    return { mists, weaving };
}

/** Oaths (pp. 94, 107–110): kinds, the Gramarye they need to forge and their rating range. */
export const OATHS = {
    iron: { label: "Iron Oath", gramarye: 1, min: 1, max: 3, note: "one lifetime; one human and one fae (up to four humans and five fae); inactive, not broken, while a side cannot keep it" },
    stone: { label: "Stone Oath", gramarye: 4, min: 3, max: 5, note: "a household and its heirs" },
    gold: { label: "Gold Oath", gramarye: 5, min: 4, max: 5, note: "a whole people; the way to forge one is lost; survives baptism" }
};
/** Forging costs Weaving equal to the rating from each fae in the oath; no roll (p. 109). */
export function forgeCheck({ kind = "iron", rating = 1, gramarye = 0, weaving = 0 } = {}) {
    const K = OATHS[kind];
    if (!K) return { ok: false, why: "choose a kind of oath" };
    if (n(rating) < K.min || n(rating) > K.max) return { ok: false, why: `${K.label}s run ${K.min}–${K.max}` };
    if (n(gramarye) < K.gramarye) return { ok: false, why: `forging a ${K.label} needs Gramarye ${K.gramarye}` };
    if (n(weaving) < n(rating)) return { ok: false, why: `needs ${rating} Weaving; has ${n(weaving)}` };
    return { ok: true, cost: n(rating) };
}
/** Baptism washes away Iron and Stone Oaths (p. 108). */
export const baptismClears = oaths => (oaths ?? []).filter(o => o.kind === "gold");

/** Cold iron (p. 88): aggravated to fae in every form (soakable), and a temporary Mists point lost per wound. */
export const COLD_IRON = { type: "aggravated", soakable: true, mistsPerWound: 1, page: 88 };
/** In the mien all fae soak lethal damage (p. 104). */
export const soaksLethal = (f) => !!(f?.mien || ORIGINS[f?.origin]?.alwaysMien);

/** Experience (p. 115). */
export function xpCost(trait, current = 0, { favored = false } = {}) {
    const c = n(current);
    switch (trait) {
        case "attribute": return c * 4;
        case "ability": return c ? c * 2 : 3;
        case "mists": case "weaving": return c * 3;
        case "dominion": return c ? c * (favored ? 5 : 6) : 10;
        case "greater": return 5;
        case "willpower": return c;
        default: return null;
    }
}
/** Bonus points at creation (p. 87). */
export const BONUS = { attribute: 5, ability: 2, specialty: 1, background: 1, dominion: 7, willpower: 2, mists: 4, weaving: 4 };

/** The starting sheet for an Origin (pp. 86–90). */
export function startingTraits(origin) {
    const O = ORIGINS[origin] ?? ORIGINS.changeling;
    return { mists: { perm: O.mists, temp: O.mists }, weaving: { perm: O.weaving, temp: O.weaving }, dominionDots: O.dominions, willpower: 4,
        lesserFeatures: O.mists, greaterFeatures: O.greater ?? 0, echoes: 1 + (O.extraEchoes ?? 0), maxDominion: 3 };
}

/** Fae blood for Kindred (p. 181): per Court; the firstborn's counts twice; inanimae have none. */
export const FAE_BLOOD = {
    summer: "+2 soak dice against sunlight and fire, but a false sunlight from the skin does 1 lethal a turn to other vampires",
    spring: "+1 Charisma in good spirits, but +1 to the difficulty to resist frenzy",
    autumn: "reads surface thoughts (as Auspex 4), but every mind within fifteen feet intrudes",
    winter: "+1 to one Physical Attribute, but drunk blood gives half the usual points",
    solstice: "nothing special"
};
export function faeBlood(origin, court) {
    if (origin === "inanimae") return { none: true, text: "Inanimae have no blood: a mouthful of their element and nothing more." };
    return { none: false, double: origin === "firstborn", text: `${FAE_BLOOD[court] ?? FAE_BLOOD.solstice}${origin === "firstborn" ? " (twice over: firstborn blood)" : ""}; it lasts until the fae blood is spent.` };
}
/** Mind powers (p. 181): Dominate (and like powers) fail on a fae with Day or Night at least the vampire's rating. */
export const mindShield = (dominions = {}, power = 0) => Math.max(n(dominions.day), n(dominions.night)) >= n(power) && n(power) > 0;

/** True in a Dark Ages chronicle (the era profile's id): the Dark Ages and the Long Night, which keeps its books. */
export const isDarkAgesEra = id => id === "dark-ages" || id === "long-night";
