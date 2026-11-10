/**
 * WoDX Actions 3.4 — the pure rules of hunters and the faithful (B42, B45):
 *   Dark Ages: Inquisitor (pages are that book's), True Faith (V20 Dark Ages pp. 392–395 in the Dark Ages,
 *   The Hunters Hunted II pp. 83–85 later), the mortal Numina of The Hunters Hunted II (pp. 70–85).
 * Hunter: The Reckoning (1999 on) lives in reckoning-rules.js. No Foundry calls here, so the harness can test it.
 */

const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ------------------------------------------------------------------ */
/*  Which hunter rules an era uses (B42)                               */
/* ------------------------------------------------------------------ */

/**
 * "inquisitor" (the Dark Ages and before), "hh2" (the Renaissance to 1998), "reckoning" (1999 on, the imbued).
 * era: a WoDX Chronicle era id (dark-ages, long-night, renaissance, victorian, wild-west, great-war, modern,
 * time-of-judgment, future-darkness, time-of-future-judgement, classical, living-gods); year: the in-world year, which
 * decides inside "modern". On the Future Darkness branch the first imbued wake in 2023, so mortal hunters (with
 * chrome) keep The Hunters Hunted II rules from 1999 to 2022.
 */
export function hunterLine(era, year = null, {futureBranch = false} = {}) {
    const e = String(era ?? "").toLowerCase();
    const y = year === null || year === undefined || year === "" ? null : Number(year);
    if (["dark-ages", "long-night", "classical", "living-gods"].includes(e)) return "inquisitor";
    if (["renaissance", "age-of-reason", "victorian", "wild-west", "great-war", "mid-century"].includes(e)) return "hh2";
    if (futureBranch && Number.isFinite(y) && y >= 1500 && y < 2023 && ["modern", "future-darkness", ""].includes(e)) return "hh2";
    if (["time-of-judgment", "future-darkness", "time-of-future-judgement"].includes(e)) return "reckoning";
    if (Number.isFinite(y)) return y < 1500 ? "inquisitor" : y < 1999 ? "hh2" : "reckoning";
    return /dark|medieval/.test(e) ? "inquisitor" : "reckoning";
}
/** Which True Faith rules: the Dark Ages book's or The Hunters Hunted II's. */
export const faithRules = era => (hunterLine(era) === "inquisitor" ? "da20" : "hh2");

/* ------------------------------------------------------------------ */
/*  Dark Ages: Inquisitor                                              */
/* ------------------------------------------------------------------ */

export const SUPERIOR = { faith: "conscience", wisdom: "selfcontrol", zeal: "courage" };
export const SUPERIOR_LABEL = { faith: "Faith", wisdom: "Wisdom", zeal: "Zeal" };
export const ORDERS = {
    acre: { label: "Knights of Acre", primary: "zeal", path: "Sedulitas Filius" },
    john: { label: "Sisters of St John", primary: "faith", path: "Boni Spiritus" },
    red: { label: "The Red Order", primary: "wisdom", path: "" },
    oculi: { label: "Oculi Dei", primary: "wisdom", path: "Sophia Patris" },
    murnau: { label: "The House of Murnau", primary: "faith", path: "Sophia Patris" }
};
export const ENDOWMENT_KINDS = ["Benediction", "Investiture", "Legacy", "Psalm", "Orison", "Holy Art"];
export const HOLY_PATHS = ["Sophia Patris", "Sedulitas Filius", "Boni Spiritus"];

/** Starting traits (pp. 147, 150): Conviction = primary Superior Virtue + its Virtue; Piety = Conscience + Self-Control; Willpower = Courage + Zeal. */
export function inquisitorStart(v, sv, primary = "faith") {
    return {
        conviction: n(sv[primary]) + n(v[SUPERIOR[primary]]),
        piety: n(v.conscience) + n(v.selfcontrol),
        willpower: n(v.courage) + n(sv.zeal)
    };
}
/** The stage by the Superior Virtues' total (p. 151). */
export function stageOf(sv) {
    const t = n(sv.faith) + n(sv.wisdom) + n(sv.zeal);
    return t >= 10 ? "judge" : t >= 5 ? "advocate" : t >= 1 ? "acolyte" : "servant";
}
export const STAGE_LABEL = { servant: "Servant", acolyte: "Acolyte", advocate: "Advocate", judge: "Judge" };
/** True Faith that a stage counts as (p. 158). */
export const STAGE_FAITH = { servant: 1, acolyte: 2, advocate: 3, judge: 4 };
/** Conviction to cash in (p. 173). */
export const CASH_IN = { superior: 10, orison: 10, acolyte: 15, advocate: 25, judge: 35 };
export const callous = (conviction, piety) => n(conviction) > n(piety);

/** The Hierarchy of Sins against God (p. 159): Piety 10 to 1. */
export const PIETY_SINS = [
    [10, "Impure or angry thoughts about another Christian"],
    [9, "Any sexual act"],
    [8, "Lying or breaking one's word"],
    [7, "Accepting money as a reward"],
    [6, "Acting from anger, gluttony, lust or another sinful impulse"],
    [5, "Not trying to teach a heretic or a pagan"],
    [4, "Not trying to redeem a sinner"],
    [3, "Harming a Christian"],
    [2, "Aiding or allying with a demon in any way"],
    [1, "Killing a Christian"]
];
/** A sin at or below Piety calls the roll (p. 159). */
export const pietyAt = (piety, level) => n(level) <= n(piety);
/** Conscience + Faith at 6, 7 when Callous; success: −1 Conviction; failure: −1 Piety; botch: a Curse roll. */
export function pietyRoll({ callous: c = false } = {}) { return { difficulty: c ? 7 : 6 }; }
export function pietyResult(roll) {
    if (roll.botch) return { conviction: 0, piety: -1, curse: true };
    if (roll.successes > 0) return { conviction: -1, piety: 0, curse: false };
    return { conviction: 0, piety: -1, curse: false };
}

/** Risking Conviction (p. 160): once a scene, 1–3 invested, a die each; success: back +1; failure: lost; botch: all lost. */
export function riskConviction(invested, roll, current) {
    const k = clamp(n(invested), 0, 3);
    if (!k) return { dice: 0, after: n(current) };
    if (roll.botch) return { dice: k, after: 0, lostAll: true };
    if (roll.successes > 0) return { dice: k, after: n(current) + 1 };
    return { dice: k, after: Math.max(0, n(current) - k) };
}
/** Victory (p. 160): primary Superior Virtue + its Virtue at 7; success +1, botch −1. */
export const victoryDelta = roll => (roll.botch ? -1 : roll.successes > 0 ? 1 : 0);
/** Prayer (p. 160): the rating at 7, −1 an extra hour (min 3), +1 for each day in a row (max 10); never above Piety. */
export function prayerDifficulty(hours = 1, daysInRow = 0) {
    return clamp(7 - Math.max(0, n(hours) - 1) + Math.max(0, n(daysInRow)), 3, 10);
}
export function convictionGain(current, successes, piety, max = 10) {
    const cap = Math.min(n(max) || 10, Math.max(n(current), n(piety)));
    return Math.min(cap, n(current) + Math.max(0, n(successes)));
}
/** A new story (p. 160): up to Conscience + Faith. */
export const newStoryConviction = (current, conscience, faith) => Math.max(n(current), n(conscience) + n(faith));

/** Terror (p. 163): Courage + Zeal at 6 (into danger) or 8 − Exposure (facing the overtly supernatural). */
export function terrorDifficulty(kind, exposure = 0) {
    return kind === "supernatural" ? clamp(8 - n(exposure), 2, 10) : 6;
}
export function terrorResult(kind, roll) {
    if (roll.botch) return { flee: true, penalty: 0 };
    if (roll.successes > 0) return { flee: false, penalty: 0 };
    return { flee: false, penalty: kind === "supernatural" ? 2 : 1 };
}
/** A resisting roll needs Conviction when the Superior Virtue is 0 (pp. 162–163). */
export const needsConviction = sv => n(sv) < 1;

/* ------------------------------------------------------------------ */
/*  True Faith                                                         */
/* ------------------------------------------------------------------ */

/** The powers by dot, for each rule set (V20 Dark Ages p. 394; The Hunters Hunted II pp. 83–85). */
export const FAITH_POWERS = {
    da20: [
        [0, "Spend 1 Willpower to resist a power that would hurt or coerce them: their Faith comes off its successes (doubled against Daimoinon)."],
        [1, "Repel the dark: 1 Willpower, Faith at the creature's current Willpower; it can't come at them with ill intent; each success, a turn of flight; touched, the successes are aggravated."],
        [2, "Unease near the unnatural."],
        [3, "Immune to Chimerstry, Dementation, Dominate, Obfuscate and other mind-clouding powers."],
        [4, "Immune to the Blood Oath and ghouling; can't rise as a ghost or a walking corpse; immune to Presence and emotion powers."],
        [5, "Their prayer or kind words: vampires resist Rötschreck at 9 or flee the scene."]
    ],
    hh2: [
        [0, "Spend 1 Willpower and roll Faith at 7 to resist a power: their successes cancel its successes."],
        [1, "Repel: 1 Willpower, Faith against the creature's permanent Willpower; it may not come nearer."],
        [2, "Senses vampires nearby when quiet."],
        [3, "Immune to mind powers."],
        [4, "Can't be ghouled, blood bound or raised."],
        [5, "Vampires who hear them or are touched resist Rötschreck at 9 or flee the scene."]
    ]
};
export const faithPowers = (rules, rating) => (FAITH_POWERS[rules] ?? FAITH_POWERS.hh2).filter(([k]) => k <= n(rating));
/** Repelling (both books): the creature's Willpower is the difficulty; no successes, it may not advance; each success a turn of flight (Dark Ages). */
export function repelDifficulty(rules, creatureWillpower) { return clamp(n(creatureWillpower) || 6, 2, 10); }
export function repelResult(rules, roll) {
    if (roll.botch) return { held: false, flee: 0, text: "The faith falters: the creature is not held back." };
    if (roll.successes <= 0) return { held: true, flee: 0, text: "It can't come at them with ill intent." };
    return { held: true, flee: rules === "da20" ? roll.successes : 0, text: rules === "da20" ? `It flees for ${roll.successes} turn${roll.successes === 1 ? "" : "s"}; touched, ${roll.successes} aggravated.` : "It can't come nearer and must keep away." };
}
/** Resisting a power: Dark Ages, the Faith comes off its successes (doubled against Daimoinon); HH2, roll Faith at 7 and cancel. */
export function faithResist(rules, rating, powerSuccesses, { daimoinon = false, faithSuccesses = 0 } = {}) {
    const cut = rules === "da20" ? n(rating) * (daimoinon ? 2 : 1) : n(faithSuccesses);
    return Math.max(0, n(powerSuccesses) - cut);
}
/** Each dot of True Faith is an extra Willpower dot (both books). */
export const faithWillpower = rating => n(rating);
/** Losing it: Conscience at 9; failure costs a dot (V20 DA p. 393; HH2 p. 85). */
export const FAITH_LOSS_DIFFICULTY = 9;

/* ------------------------------------------------------------------ */
/*  Numina (The Hunters Hunted II pp. 70–83)                           */
/* ------------------------------------------------------------------ */

/** Hedge paths and psychic phenomena: the pool, the difficulty, the cost, and what each level does. */
export const NUMINA = {
    curses: { label: "Curses", kind: "hedge", pool: ["manipulation", "intimidation"], diff: 7, wp: 1, p: "72–73",
        levels: [1, 2, 3, 4, 5].map(l => `+${l} difficulty to the cursed situation (see the page for its reach)`),
        note: "Breaking a curse: Wits + Subterfuge at 9 and 1 Willpower (a botch, suffer it). Frequent cursing calls for Humanity rolls." },
    divination: { label: "Divination", kind: "hedge", pool: ["perception", "occult"], diff: 7, wp: 0, p: "74–75",
        levels: ["−1 initiative lost an hour per success (forewarned)", "Warnings of danger", "Short-term outcomes", "Likely events (1 Willpower, difficulty 8; −1 to −3 with a personal link)", "Concrete futures"],
        note: "+1 difficulty reading for someone else." },
    healing: { label: "Healing", kind: "hedge", pool: ["manipulation", "medicine"], diff: 7, wp: 0, p: "75–77",
        levels: ["Diagnosis", "Ignore wound penalties 10 minutes a success; minor ailments", "Broken bones and chronic illness", "1 Willpower: a bashing or lethal level, +1 a success", "1 Willpower, difficulty 8: aggravated levels, a success each; grave illness"],
        note: "+1 difficulty on oneself, +1 on the unwilling, +2 under stress." },
    astral: { label: "Astral Projection", kind: "psychic", pool: ["perception", "awareness"], diff: 8, wp: 1, p: "77–78",
        levels: ["Astral sight", "Travel a minute a success", "Manifest", "Travel an hour a success", "Hide in the astral (Manipulation + Awareness at 8)"] },
    cyberkinesis: { label: "Cyberkinesis", kind: "psychic", pool: ["manipulation", "technology"], diff: 7, wp: 1, p: "78–79",
        levels: ["Understand a device", "A surge or damage by touch", "Read, encrypt or decrypt data (successes as others' penalty)", "Control devices in sight, 10 minutes a success", "Operate any device touched"] },
    psychometry: { label: "Psychometry", kind: "psychic", pool: ["perception", "empathy"], diff: 7, wp: 1, p: "80–81",
        levels: ["The owner or main visitor", "The last 24 hours", "The whole history", "Watch the owner 10 minutes a success", "Track the owner's direction and distance"] },
    pyrokinesis: { label: "Pyrokinesis", kind: "psychic", pool: ["manipulation", "awareness"], diff: 7, wp: 1, p: "81–82",
        levels: ["A candle flame (soak at 3, 1 aggravated a turn)", "A palm of flame (soak at 4, 1)", "A torch (soak at 5, 1)", "A bonfire (soak at 7, 2)", "An inferno (soak at 9, 3)"],
        note: "The target dodges with Dexterity + Athletics against the successes." },
    telekinesis: { label: "Telekinesis", kind: "psychic", pool: ["wits", "awareness"], diff: 7, wp: 1, p: "82–83",
        levels: ["1 lb", "20 lb", "200 lb", "500 lb", "1,000 lb"],
        note: "A turn a success, five successes the scene; a living target resists with Willpower each turn; wresting an object is a contest with Strength." }
};
/** Match a sheet's Numina item to a known path by name. */
export function numinaFor(name) {
    const s = String(name ?? "").toLowerCase().replace(/[^a-z]/g, "");
    return Object.entries(NUMINA).find(([k, v]) => s.startsWith(k) || s.startsWith(v.label.toLowerCase().replace(/[^a-z]/g, "")))?.[0] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Hedge magic: Sorcerer (Revised) paths (pages are that book's)      */
/* ------------------------------------------------------------------ */

/**
 * The paths: roll (Attribute + Ability; "willpower" is the trait), Willpower cost, aspects named on the page, and
 * whether it works only as rituals. Pool "" = the page sets it (Fascination: a Social Attribute per use).
 */
export const SORCERY = {
    alchemy: { label: "Alchemy", pool: ["intelligence", "occult"], wp: 0, ritualOnly: true, p: 64, note: "Herbalism or Science for those styles." },
    conjuration: { label: "Conjuration", pool: ["dexterity", "occult"], wp: 0, p: 66, aspects: ["Weight"], note: "+1 against an object someone holds, +2 against a resisting living target, −1 for a well-known object; 1 Willpower for an unprepared object, 1 a turn for lasting effects." },
    conveyance: { label: "Conveyance", pool: ["stamina", "occult"], wp: 1, p: 68, note: "+2 against a resisting target, −1 to a well-known place, +1–2 if watched; a place never seen +1 success, teleporting +2 successes." },
    divination: { label: "Divination", pool: ["perception", "occult"], wp: 0, p: 70, aspects: ["Time period", "Accuracy"], note: "The Storyteller rolls; the diviner rarely knows how accurate it is. +1 for extraordinary science (but more precise)." },
    enchantment: { label: "Enchantment", pool: ["intelligence", "occult"], wp: 1, ritualOnly: true, p: 72, note: "1–3 days a level plus crafting time; −1 for a mastered enchantment." },
    fascination: { label: "Fascination", pool: ["", "occult"], wp: 1, p: 74, note: "Enhances a Social Attribute; see the page for the roll." },
    fortune: { label: "Fortune", pool: ["manipulation", "intimidation"], wp: 1, p: 76, aspects: ["Target", "Effect", "Duration"], note: "Blessings and curses; −1 with an item closely linked to the target." },
    healing: { label: "Healing", pool: ["manipulation", "intuition"], wp: 1, p: 78, aspects: ["Pain", "Toxins and diseases", "Bashing", "Lethal"], note: "1 Willpower per injury or disease; −1 if Medicine (or a fitting Lore) is at least the Path rating; permanent." },
    hellfire: { label: "Hellfire", pool: ["manipulation", "occult"], wp: 1, p: 80, aspects: ["Damage", "Range"], note: "2 dice of lethal a success spent; 2 more successes for aggravated; damage successes can't pass the Hellfire rating. A dark path." },
    mana: { label: "Mana Manipulation", pool: ["manipulation", "occult"], wp: 1, p: 81 },
    oneiromancy: { label: "Oneiromancy", pool: ["wits", "occult"], wp: 0, p: 82 },
    shadowcasting: { label: "Shadowcasting", pool: ["manipulation", "occult"], wp: 1, p: 83, noAspects: true, note: "No aspects: the effect is set by the level." },
    shapeshifting: { label: "Shapeshifting", pool: ["stamina", "animalken"], wp: 1, p: 84, noRituals: true, aspects: ["Shift"], note: "Intelligence + Science for extraordinary science; lasts a scene." },
    binding: { label: "Binding and Warding", pool: ["intelligence", "occult"], wp: 1, ritualOnly: true, p: 85 },
    weather: { label: "Weather Control", pool: ["manipulation", "willpower"], wp: 1, p: 86, note: "1 Willpower per 2 dots of Intensity, plus one (see the page)." }
};
/** Match a sheet's Numen to a Sorcerer path. */
export function sorceryFor(name) {
    const s = String(name ?? "").toLowerCase().replace(/[^a-z]/g, "").replace(/^pathof/, "");
    return Object.entries(SORCERY).find(([k, v]) => s.startsWith(k) || s.startsWith(v.label.toLowerCase().replace(/[^a-z]/g, "")))?.[0] ?? null;
}
/**
 * A spell (Sorcerer pp. 60–63): difficulty 4 + the highest aspect level; each aspect level above the first costs a
 * success beyond the first; a turn per level. Fast casting: each turn saved +1 difficulty (at most 9) and 1 Willpower.
 * Trading skill for power: two dots above the highest aspect, cast at the difficulty of the Path rating, 1 Willpower less.
 */
export function spell({ rating = 1, aspects = [1], fast = 0, trade = false, wpBase = 0 } = {}) {
    const levels = (aspects.length ? aspects : [1]).map(a => Math.max(1, n(a)));
    const top = Math.max(...levels);
    const canTrade = trade && n(rating) >= top + 2;
    let difficulty = 4 + (canTrade ? n(rating) : top);
    const f = Math.max(0, Math.min(n(fast), top - 1));
    difficulty = f ? Math.min(9, difficulty + f) : difficulty;
    const need = 1 + levels.reduce((s, l) => s + (l - 1), 0);
    const wp = Math.max(0, n(wpBase) - (canTrade ? 1 : 0)) + (f ? 1 : 0);
    return { difficulty: clamp(difficulty, 2, 10), need, turns: Math.max(1, top - f), willpower: wp, overLimit: top > n(rating), traded: canTrade };
}
/** Doubling the successes needed lets one aspect go a level above the rating (p. 60). */
export const pushAspect = (successes, need) => n(successes) >= 2 * n(need);
/** A counterspell (p. 63): Wits + Occult at 8, each success cancels one of the spell's. */
export const COUNTERSPELL = { pool: ["wits", "occult"], difficulty: 8 };
/** Creating a ritual (p. 61): Intelligence + Occult at 9, three successes, after months of work; rituals cost 3 experience. */
export const RITUAL_CREATE = { pool: ["intelligence", "occult"], difficulty: 9, need: 3, xp: 3 };

/* ------------------------------------------------------------------ */
/*  Ghouls outside the Dark Ages (V20 Ghouls and Revenants)           */
/* ------------------------------------------------------------------ */

/** Overfeeding (p. 43): Stamina extra points fit; beyond that a Stamina roll at 8, failure a lethal level a point over. */
export function overfeed(pool, max, stamina, drink) {
    const cap = n(max) + n(stamina), after = n(pool) + n(drink);
    if (after <= n(max)) return { after, excess: 0, crammed: 0, check: false };
    if (after <= cap) return { after, excess: 0, crammed: after - n(max), check: false };
    return { after, excess: after - cap, crammed: n(stamina), check: true, difficulty: 8 };
}
export const WITHDRAWAL = { difficulty: 7, weeks: stamina => Math.max(1, 6 - n(stamina)) };
