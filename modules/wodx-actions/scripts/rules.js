/**
 * WoDX Actions — pure rules for non-combat systems (no Foundry calls).
 * Page references are to Vampire: The Dark Ages 20th Anniversary Edition.
 */
export * from "./core-rules.js";

/* ---------------- Basic dice rules (p. 322-324) ---------------- */

/** Degrees of success (p. 323). */
export function degree(successes) {
    if (successes <= 0) return "";
    return ["", "Marginal", "Moderate", "Complete", "Exceptional", "Phenomenal"][Math.min(5, successes)];
}

export const DIFFICULTIES = {
    3: "Trivial", 4: "Easy", 5: "Straightforward", 6: "Standard",
    7: "Challenging", 8: "Difficult", 9: "Extremely difficult", 10: "Nearly impossible"
};

/**
 * Build a dice pool and difficulty for an ordinary action.
 * p: { attribute, ability, abilityType ("talent"|"skill"|"knowledge"|""), abilityKey,
 *      bonusDice, extraDiff, baseDifficulty, woundPenalty, ignoreWounds,
 *      multiIndex, retries, aura, daytimeCap (Road rating or null), teamworkDice, teamworkOverflow }
 * Returns { dice, difficulty, parts[], blocked: string|null, autoSuccessAllowed }
 */
export function actionPool(p) {
    const parts = [];
    let dice = 0, diff = p.baseDifficulty ?? 6, blocked = null;
    const add = (l, n) => { if (n) { dice += n; parts.push(`${l} ${n > 0 ? "+" : ""}${n}`); } };
    const addD = (l, n) => { if (n) { diff += n; parts.push(`${l} ${n > 0 ? "+" : ""}${n} diff`); } };
    add(p.attributeLabel || "Attribute", p.attribute || 0);
    if (p.abilityKey) {
        if ((p.ability || 0) > 0) add(p.abilityLabel || "Ability", p.ability);
        else if (p.abilityType === "skill") addD("Untrained Skill", 1);
        else if (p.abilityType === "knowledge") blocked = "An untrained Knowledge cannot be attempted: the character simply doesn't know.";
    }
    add("Bonus", p.bonusDice || 0);
    add("Teamwork", p.teamworkDice || 0);
    if (p.woundPenalty && !p.ignoreWounds) add("Wounds", p.woundPenalty);
    if (p.multiIndex > 0) { add("Multiple actions", -p.multiIndex); addD("Multiple actions", p.multiIndex); }
    addD("Retry", p.retries || 0);
    addD("Aura", p.aura || 0);
    addD("Too many helpers", p.teamworkOverflow || 0);
    addD("Other", p.extraDiff || 0);
    if (p.daytimeCap !== null && p.daytimeCap !== undefined && dice > p.daytimeCap) {
        parts.push(`Daytime: pool capped at Road ${p.daytimeCap}`);
        dice = p.daytimeCap;
    }
    if (diff >= 10 && (p.multiIndex > 0 || p.retries > 0))
        blocked = blocked || "Difficulty reaches 10 from multiple actions or retries: the action cannot be attempted (p. 322-323).";
    dice = Math.max(0, dice);
    return { dice, difficulty: diff, parts, blocked, autoSuccessAllowed: dice >= diff };
}

/** Resisted action (p. 324): the margin is the degree of success; ties mean nobody succeeds. */
export function resisted(a, b) {
    if (a.botch && !b.botch) return { winner: "b", margin: b.successes, tie: false, botch: "a" };
    if (b.botch && !a.botch) return { winner: "a", margin: a.successes, tie: false, botch: "b" };
    const m = a.successes - b.successes;
    if (m === 0) return { winner: null, margin: 0, tie: true };
    return m > 0 ? { winner: "a", margin: m, tie: false } : { winner: "b", margin: -m, tie: false };
}

/**
 * Extended action step (p. 324). A botch wipes the accumulated successes (start over).
 * Returns the new state.
 */
export function extendedStep(state, roll) {
    const s = { total: state.total || 0, target: state.target, rolls: (state.rolls || 0) + 1, done: false, failed: false };
    if (roll.botch) { s.total = 0; s.failed = true; s.note = "Botch: accumulated successes are lost; start over or the task is ruined."; return s; }
    s.total += roll.successes;
    if (s.target && s.total >= s.target) s.done = true;
    return s;
}

/** Teamwork (p. 324): helpers' successes become dice; each helper beyond the limit adds +1 difficulty to everyone. */
export function teamwork(helperSuccesses, limit = Infinity) {
    const dice = helperSuccesses.reduce((s, n) => s + Math.max(0, n), 0);
    const overflow = Math.max(0, helperSuccesses.length - limit);
    return { dice, overflow };
}

/* ---------------- Roads (p. 112-114) ---------------- */

export function auraModifier(road) {
    if (road >= 10) return -2;
    if (road >= 8) return -1;
    if (road >= 4) return 0;
    if (road >= 2) return 1;
    return 2;
}

/** Sin against the Road. Only sins at or below the Road rating are rolled. Difficulty 6 + (Road - sin level). */
export function sinCheck(road, sinLevel) {
    if (sinLevel > road) return { roll: false, reason: `A level ${sinLevel} sin is beyond a Road rating of ${road}; no roll is needed.` };
    const raw = 6 + (road - sinLevel);
    return { roll: true, difficulty: Math.min(10, raw), rawDifficulty: raw, momentOfTruth: sinLevel <= 3 };
}

/** Virtue dice are capped by the Road rating; Self-Control/Instinct also by the blood pool (p. 183, 340, 357). */
export function virtuePool(virtue, { road = 10, blood = null, bloodLimited = false } = {}) {
    let dice = virtue, caps = [];
    if (road < dice) { dice = road; caps.push(`Road ${road}`); }
    if (bloodLimited && blood !== null && blood < dice) { dice = blood; caps.push(`blood pool ${blood}`); }
    return { dice: Math.max(0, dice), caps };
}

export const TORPOR = { 10: "One day", 9: "Three days", 8: "One week", 7: "Two weeks", 6: "One month", 5: "One year",
    4: "One decade", 3: "Five decades", 2: "One century", 1: "Five centuries", 0: "A millennium or more" };
export const TORPOR_DAYS = { 10: 1, 9: 3, 8: 7, 7: 14, 6: 30, 5: 365, 4: 3650, 3: 18250, 2: 36500, 1: 182500, 0: 365000 };
export function torporLength(road) { const r = Math.max(0, Math.min(10, road)); return { text: TORPOR[r], days: TORPOR_DAYS[r] }; }

/* ---------------- Frenzy & Rötschreck (p. 357-358) ---------------- */

export const FRENZY_PROVOCATIONS = {
    smellblood: { label: "Smell of blood when hungry", diff: 3 },
    sightblood: { label: "Sight of blood when hungry", diff: 4 },
    harassed: { label: "Being harassed", diff: 4 },
    lifethreat: { label: "Life-threatening situation", diff: 4 },
    taunts: { label: "Malicious taunts", diff: 4 },
    physical: { label: "Physical provocation", diff: 6 },
    tasteblood: { label: "Taste of blood when hungry", diff: 6 },
    loved: { label: "Loved one in danger", diff: 7 },
    humiliation: { label: "Outright public humiliation", diff: 8 },
    hunger: { label: "Hunger on catching prey (p. 334)", diff: 6 },
    atrocity: { label: "Urge to commit an atrocity (9 – Conscience/Conviction)", diff: null },
    custom: { label: "Other (set difficulty)", diff: 6 }
};

export const ROTSCHRECK_PROVOCATIONS = {
    lamp: { label: "Lighting a lamp", diff: 3 },
    torch: { label: "Sight of a torch", diff: 5 },
    bonfire: { label: "Bonfire", diff: 6 },
    obscuredsun: { label: "Obscured sunlight", diff: 7 },
    burned: { label: "Being burned", diff: 7 },
    directsun: { label: "Direct sunlight", diff: 8 },
    trapped: { label: "Trapped in a burning building", diff: 9 },
    faith: { label: "True Faith (Storyteller sets)", diff: 7 },
    custom: { label: "Other (set difficulty)", diff: 6 }
};

/**
 * Resisting the Beast: five accumulated successes overcome it; fewer hold it off one turn per success;
 * failure means frenzy; a botch means frenzy until the Storyteller says otherwise.
 */
export function beastStep(state, roll) {
    const total = (state.total || 0) + (roll.botch ? 0 : roll.successes);
    if (roll.botch) return { total, outcome: "botch", turns: 0 };
    if (roll.successes === 0) return { total, outcome: "fail", turns: 0 };
    if (total >= 5) return { total, outcome: "resisted", turns: Infinity };
    return { total, outcome: "holding", turns: roll.successes };
}

/** Instinct: the vampire frenzies regardless; the roll decides whether she rides the wave. */
export function instinctResult(roll) {
    if (roll.botch) return "botch";
    return roll.successes > 0 ? "ride" : "fail";
}

/* ---------------- Blood (p. 332, 340-341) ---------------- */

export const GENERATIONS = {
    3: { maxTrait: 10, pool: null, perTurn: null }, 4: { maxTrait: 9, pool: 50, perTurn: 10 },
    5: { maxTrait: 8, pool: 40, perTurn: 8 }, 6: { maxTrait: 7, pool: 30, perTurn: 6 },
    7: { maxTrait: 6, pool: 20, perTurn: 4 }, 8: { maxTrait: 5, pool: 15, perTurn: 3 },
    9: { maxTrait: 5, pool: 14, perTurn: 2 }, 10: { maxTrait: 5, pool: 13, perTurn: 1 },
    11: { maxTrait: 5, pool: 12, perTurn: 1 }, 12: { maxTrait: 5, pool: 11, perTurn: 1 },
    13: { maxTrait: 5, pool: 10, perTurn: 1 }
};
export function generation(gen) { return GENERATIONS[Math.max(3, Math.min(13, gen || 13))]; }

export const VESSELS = {
    human: { label: "Average human", pool: 10 }, child: { label: "Child", pool: 5 },
    vampire: { label: "Cainite (10+)", pool: 10 }, werewolf: { label: "Lupine", pool: 20 },
    cow: { label: "Cow / horse", pool: 5 }, dog: { label: "Dog", pool: 2 }, cat: { label: "Cat", pool: 1 },
    bird: { label: "Bird", pool: 0.5 }, rat: { label: "Bat / rat", pool: 0.25 }
};

export const HUNTING_GROUNDS = {
    slums: { label: "Slums / the Circus", diff: 4 }, lower: { label: "Lower-class neighborhood", diff: 5 },
    market: { label: "Market district", diff: 6 }, merchant: { label: "Merchant-class neighborhood", diff: 7 },
    patrolled: { label: "Heavily patrolled area", diff: 8 }
};

/** Hunting roll (p. 334): Fame and Domain lower difficulty (min 3); Herd adds dice. */
export function huntingPool({ area = "market", fame = 0, domain = 0, herd = 0, inhuman = 0 }) {
    const base = HUNTING_GROUNDS[area]?.diff ?? 6;
    const diff = Math.max(3, base - fame - domain) + inhuman;
    return { difficulty: diff, bonusDice: herd };
}

/** A vampire with fewer than (7 – Self-Control/Instinct) blood points is hungry when she catches prey. */
export function isHungry(blood, virtue) { return blood < 7 - virtue; }

/** Mortal vessel: Stamina – 1 per point taken after the second, or pass out (p. 341). */
export function vesselRisk(stamina, taken) {
    if (taken <= 2) return null;
    return { dice: Math.max(0, stamina - (taken - 2)), difficulty: 6 };
}

/** Blood gained from a vessel; animal blood counts for less, cold blood halves per 10 minutes. */
export function bloodGained(points, { minutesDead = 0 } = {}) {
    let p = points;
    for (let m = 10; m <= minutesDead; m += 10) p = Math.floor(p / 2);
    return Math.max(0, p);
}

/** Cost to imitate life: one blood per Road dot below 8 (p. 340). */
export function imitateLifeCost(road) { return Math.max(0, 8 - road); }

/**
 * Plan healing with blood (p. 340, 345): one blood per bashing or lethal level (lethal first, worst first),
 * aggravated levels cost five blood and a day's rest each.
 */
export function planHealing(damage, blood, { includeAggravated = false, maxSpend = Infinity } = {}) {
    let b = damage.bashing || 0, l = damage.lethal || 0, a = damage.aggravated || 0;
    let spent = 0, healed = { bashing: 0, lethal: 0, aggravated: 0 };
    const budget = Math.min(blood, maxSpend);
    while (spent < budget && l > 0) { l--; spent++; healed.lethal++; }
    while (spent < budget && b > 0) { b--; spent++; healed.bashing++; }
    if (includeAggravated) while (budget - spent >= 5 && a > 0) { a--; spent += 5; healed.aggravated++; }
    return { spent, healed, after: { bashing: b, lethal: l, aggravated: a } };
}

/* ---------------- Environment (p. 355-360) ---------------- */

export const SUNLIGHT_INTENSITY = {
    faint: { label: "Faint light through a closed curtain, heavy cloud, twilight", diff: 3 },
    covered: { label: "Fully protected by heavy clothes, gloves, wide hat", diff: 5 },
    indirect: { label: "Indirect light through a window or light curtains", diff: 7 },
    cloudy: { label: "Outside on a cloudy day / one ray / reflection", diff: 9 },
    direct: { label: "Direct rays from the sun", diff: 10 }
};
export const SUNLIGHT_EXPOSURE = {
    1: "Small part of body (a hand, part of the face)",
    2: "Large part (a leg, an arm, the whole head)",
    3: "Half or more of the body (thin clothing)"
};
export const FIRE_HEAT = {
    candle: { label: "Heat of a candle", diff: 3 }, torch: { label: "Heat of a torch", diff: 5 },
    bonfire: { label: "Heat of a bonfire", diff: 7 }, forest: { label: "Forest fire", diff: 8 },
    forge: { label: "Heat of a forge", diff: 9 }, molten: { label: "Molten metal", diff: 10 }
};
export const FIRE_SIZE = {
    1: "Torch; part of the body exposed", 2: "Bonfire; half the body exposed", 3: "Raging inferno; whole body engulfed"
};

/** Falling (p. 355): 1 die of bashing per 10 ft; 100 ft+ is 10 dice lethal and armor counts half. */
export function fallingDamage(feet) {
    const terminal = feet >= 100;
    return { dice: Math.min(10, Math.floor(feet / 10)), type: terminal ? "lethal" : "bashing", halfArmor: terminal };
}

/* ---------------- Day, torpor, rising (p. 336, 340, 351) ---------------- */

/** Awakening during the day: Road roll, diff 8. Each success = one turn awake, five = the whole scene. */
export function awakeningResult(roll) {
    if (roll.botch) return { awake: false, text: "Botch: deep sleep until sundown." };
    if (roll.successes === 0) return { awake: false, text: "Slips back into slumber (may roll Perception again to notice further disturbance)." };
    if (roll.successes >= 5) return { awake: true, turns: Infinity, text: "Fully awake for the scene." };
    return { awake: true, turns: roll.successes, text: `Awake for ${roll.successes} turn${roll.successes === 1 ? "" : "s"}.` };
}

/* ---------------- Lifting chart (p. 335) ---------------- */

export const LIFTING = [
    [1, "Throw a rock", 20], [2, "Break a wooden chair", 45], [3, "Break down a wooden door", 115],
    [4, "Break a wooden plank", 180], [5, "Bend a sword", 295], [6, "Throw a small pony", 360],
    [7, "Throw a riding horse", 410], [8, "Throw a warhorse", 455], [9, "Punch through a simple stone wall", 545],
    [10, "Rip open a reinforced door", 680], [11, "Punch through a heavily reinforced door", 910],
    [12, "Lift a small portcullis", 1360], [13, "Throw a fully loaded wagon", 1815],
    [14, "Throw a small boat", 2265], [15, "Lift a large portcullis", 2720]
];
export function liftingFeat(level) {
    const l = Math.max(0, Math.min(15, level));
    return l === 0 ? null : { level: l, feat: LIFTING[l - 1][1], kg: LIFTING[l - 1][2] };
}

/* ---------------- Blood Oath (p. 342) ---------------- */

export const OATH_STAGES = {
    0: "No bond",
    1: "First drink: intermittent preoccupation; no mechanics.",
    2: "Second drink: Willpower roll needed to harm the regnant; regnant's Social rolls against the thrall –1 difficulty.",
    3: "Full Blood Oath: regnant may Dominate without eye contact; regnant's Social rolls –2 difficulty; thrall resists the regnant's mental control at +2 difficulty. All lesser bonds vanish."
};
export function oathResistDifficulty({ timesFed = 0, natureMod = 0, treatmentMod = 0 }) {
    const raw = 8 + natureMod + treatmentMod + timesFed;
    return { difficulty: Math.min(10, Math.max(2, raw)), raw };
}
export function oathDecayMonths(willpower) { return Math.max(1, 12 - willpower); }

/* ---------------- Diablerie (p. 354-355) ---------------- */
export function diablerieControlDifficulty(road) { return Math.max(2, Math.min(10, 10 - road)); }
