/**
 * WoDX Actions 3.20.0: "With this person", dealing with one NPC face to face. The pure parts, so the harness can test them.
 *
 * Each act is a resisted roll from V20's social systems (V20 pp. 265-266, V20 Dark Ages pp. 338-339, printed pages; checked against both,
 * notes in docs/research/social-book-checks.md). The character's pool takes the first pair the sheet has dots in, so a
 * Dark Ages character rolls Commerce or Hearth Wisdom where a modern one rolls Finance or Streetwise. The NPC's
 * resisting roll is the Storyteller's to see; the player sees the outcome.
 *
 * House rules (no book gives them; logged in docs/PENDING-REVIEW.md):
 *  - Persuade: neither book has a Persuasion system; V20's sample pool (p. 255) set against the NPC's Willpower, as Fast-Talk is.
 *  - Bribe: no rule in V20 or V20 Dark Ages; Manipulation + Streetwise against Willpower, bonus dice for a rich offer.
 *  - The NPC's attitude moves the difficulty (WoDX NPC's attitude track), and each outcome may move the attitude.
 *  - A won roll leaves a note on the character for an hour of game time ("persuaded", "fooled"...), which talk lines
 *    and "Only when" lists can test.
 */

/** The acts, in menu order. preset: the dramatic system in main.js the roll uses; alts: the pools, best first. */
export const ACTS = [
    { key: "persuade", label: "Persuade", icon: "fa-comments", preset: "persuadeNpc", sway: "persuaded",
        note: "Make a case they accept. They resist with Willpower.", ref: "V20 p. 255, house rule",
        moves: { win: 0, lose: 0, botch: -1 } },
    { key: "fasttalk", label: "Fast-talk", icon: "fa-comment-dots", preset: "fasttalk", sway: "fooled",
        note: "Talk fast enough that they go along before they think. They resist with Willpower; a tie needs more talk.", ref: "V20 pp. 265-266",
        moves: { win: 0, lose: -1, botch: -2 } },
    { key: "con", label: "Deceive (a lie or a scam)", icon: "fa-mask", preset: "credibility", sway: "fooled",
        note: "A lie that has to hold up. They see through it only by beating the liar's successes.", ref: "V20 pp. 265-266",
        moves: { win: 0, lose: -1, botch: -2 } },
    { key: "intimidate", label: "Intimidate, quietly", icon: "fa-user-secret", preset: "intimidate", sway: "intimidated", noShift: true,
        note: "A look, a word about what could happen. They resist with Willpower. Their goodwill does not help.", ref: "V20 p. 266",
        moves: { win: -1, lose: -1, botch: -1 } },
    { key: "threaten", label: "Threaten openly", icon: "fa-fist-raised", preset: "threaten", sway: "intimidated", noShift: true,
        note: "Open menace. They resist with Willpower or Strength + Intimidation, whichever is higher.", ref: "V20 p. 266",
        moves: { win: -1, lose: -1, botch: -2 } },
    { key: "question", label: "Question them", icon: "fa-question", preset: "interrogate",
        note: "Patient questions. Each extra success brings out more; beating their Willpower rating, everything.", ref: "V20 pp. 265-266",
        moves: { win: 0, lose: 0, botch: -1 } },
    { key: "bribe", label: "Bribe", icon: "fa-coins", preset: "bribeNpc", sway: "bribed", offer: true,
        note: "Offer something for a favour. They resist with Willpower; a rich offer adds dice. Pay with Trade or by hand.", ref: "house rule",
        moves: { win: 1, lose: 0, botch: -1 } }
];
export const actByKey = key => ACTS.find(a => a.key === key) ?? null;

/** The presets this file adds to main.js's dramatic systems. */
/** Which of WoDX NPC's stock social lines fits each act (3.35.0): social:<kind>:<win|lose>. */
export const STOCK_KIND = { persuade: "persuade", fasttalk: "deceive", con: "deceive", intimidate: "intimidate", threaten: "intimidate", question: "persuade", bribe: "bribe", charm: "charm" };

export const PRESETS = {
    persuadeNpc: { label: "Persuade someone (Man + Expression vs Willpower)", attr: "manipulation", ability: "expression", diff: 6, mode: "resisted",
        alts: [["manipulation", "expression"], ["manipulation", "persuasion"], ["charisma", "expression"]], opp: { pool: "willpower", diff: 6 }, aura: true,
        note: "House rule: V20's Persuasion pool against the listener's Willpower." },
    bribeNpc: { label: "Bribe someone (Man + Streetwise vs Willpower)", attr: "manipulation", ability: "streetwise", diff: 6, mode: "resisted",
        alts: [["manipulation", "streetwise"], ["manipulation", "finance"], ["manipulation", "commerce"], ["manipulation", "hearth wisdom"]], opp: { pool: "willpower", diff: 6 }, aura: true,
        note: "House rule: no book gives bribery a roll. A rich offer adds dice." }
};

/** How much the offer adds: "small" 0, "fair" 1, "generous" 2, "lavish" 3 dice (house rule). */
export const OFFERS = [["small", "A small sum", 0], ["fair", "A fair price for the favour", 1], ["generous", "Generous", 2], ["lavish", "More than they could refuse lightly", 3]];
export const offerDice = k => OFFERS.find(o => o[0] === k)?.[2] ?? 0;

/**
 * The outcome of a resisted social roll. me, them: {successes, botch}; needMore: they must score more to resist.
 * Returns {result: "win"|"lose"|"tie"|"botch", margin}.
 */
export function outcome(me, them, { needMore = false } = {}) {
    if (me.botch) return { result: "botch", margin: 0 };
    const a = me.successes || 0, b = them.botch ? 0 : (them.successes || 0);
    if (needMore) return b > a ? { result: "lose", margin: b - a } : (a > 0 ? { result: "win", margin: a - b } : { result: "lose", margin: 0 });
    if (a > b) return { result: "win", margin: a - b };
    if (a === b) return { result: "tie", margin: 0 };
    return { result: "lose", margin: b - a };
}

/** How the attitude moves after an act (a tie moves nothing). */
export function attitudeMove(act, result) {
    const m = act?.moves ?? {};
    return result === "tie" ? 0 : Number(m[result] ?? 0) || 0;
}

/** What the player is told, in words. name: the NPC as the player knows them. */
export function outcomeText(act, res, name = "They") {
    const n = name || "They";
    switch (res.result) {
        case "botch": return act.key === "threaten" || act.key === "intimidate" ? `It goes badly wrong: ${n} is not cowed, and will remember this.` : `It goes badly wrong, and ${n} will remember it.`;
        case "tie": return act.key === "fasttalk" ? "Neither side gives way: it needs more talk." : "Neither side gives way.";
        case "lose": return act.key === "con" ? `${n} sees through it.` : `${n} does not give way.`;
        default: return res.margin >= 3 ? `${n} gives way completely.` : `${n} gives way.`;
    }
}

/** How long a won roll's note lasts on the character: one hour of game time (house rule). */
export const SWAY_SECONDS = 3600;
export const SWAY_LIMIT = 20;

/** The character's sway notes after a new one: expired ones pruned, the same kind by the same NPC replaced. */
export function addSway(list, sway, now) {
    const live = (Array.isArray(list) ? list : []).filter(x => x && Number(x.until) >= now && !(x.kind === sway.kind && x.npc === sway.npc));
    return [...live, { kind: sway.kind, npc: sway.npc, npcName: sway.npcName ?? "", at: now, until: now + SWAY_SECONDS }].slice(-SWAY_LIMIT);
}

/* ------------------------------------------------------------------ */
/*  Lift and plant (3.21.0)                                            */
/* ------------------------------------------------------------------ */

/**
 * Picking a pocket, or slipping something into one. Neither V20 nor V20 Dark Ages writes a system: Larceny lists
 * pickpocketing as a specialty (V20 p. 105) and Legerdemain covers it in the Dark Ages (V20 Dark Ages p. 165, with
 * Dexterity + Legerdemain at 8 for a key off a guard's belt, p. 328). House rules: the hand is Dexterity + Larceny
 * (Legerdemain, else Subterfuge) at 6, and the mark notices only by beating it with Perception + Alertness, as with
 * sneaking. Only what fits a pocket or a jacket (concealment P or J) can be lifted from the person.
 */
export const LIFT = {
    lift: { key: "lift", label: "Lift something", icon: "fa-hand-holding", preset: "liftNpc",
        note: "Take something small off them unseen. They notice only by beating your successes with Perception + Alertness.", ref: "V20 p. 105, V20 Dark Ages pp. 165, 328, house rule",
        moves: { noticed: -2, botch: -2 } },
    plant: { key: "plant", label: "Plant something", icon: "fa-hand-holding-heart", preset: "liftNpc",
        note: "Slip something small into their pocket or bag unseen. They notice only by beating your successes.", ref: "house rule",
        moves: { noticed: -1, botch: -1 } }
};
export const LIFT_PRESET = {
    liftNpc: { label: "Pick a pocket (Dex + Larceny vs Per + Alertness)", attr: "dexterity", ability: "larceny", diff: 6, mode: "resisted",
        alts: [["dexterity", "larceny"], ["dexterity", "legerdemain"], ["dexterity", "subterfuge"]], opp: { attr: "perception", ability: "alertness", diff: 6, needMore: true },
        note: "House rule: no book writes a pickpocketing system; the mark notices only by beating the thief's successes." }
};
Object.assign(PRESETS, LIFT_PRESET);

const STEP = { P: 0, J: 1, T: 2, C: 2, N: 3 };
/** An item's concealment step: WoDX Sheets' flag, the weapon's letter, else a guess by type (null: unknown). */
export function concealOf(item) {
    const v = item?.flags?.["wodx-sheets"]?.conceal ?? item?.system?.conceal;
    const k = String(v ?? "").trim().toUpperCase().charAt(0);
    if (k in STEP) return STEP[k];
    if (item?.flags?.["wodx-sheets"]?.coin) return STEP.P;
    return null;
}
/** What can be taken from someone's person: pocket or jacket sized, not a container, not armour. Unknown sizes count when the type is small. */
export function liftable(items = []) {
    return (items ?? []).filter(it => {
        if (!it || it.system?.iscontainer || it.type === "Armor") return false;
        const s = concealOf(it);
        if (s !== null) return s <= STEP.J;
        return !["Melee Weapon", "Ranged Weapon", "Feature", "Power", "Trait"].includes(it.type) && /item|gear|equipment|treasure|loot|misc/i.test(String(it.type ?? "item"));
    });
}

/**
 * The outcome of a lift or a plant. me, them: {successes, botch}. Returns {done, noticed, net}: done, the hand worked;
 * noticed, the mark saw it (a botch is always seen; a fumble the mark misses is neither).
 */
export function liftOutcome(me, them) {
    if (me.botch) return { done: false, noticed: true, net: 0 };
    const a = me.successes || 0, b = them.botch ? 0 : (them.successes || 0);
    if (b > a) return { done: false, noticed: true, net: a - b };
    return { done: a > 0, noticed: false, net: a - b };
}
/** With two or more net successes the thief picks; with one, the hand closes on whatever comes first (rand in [0, 1)). */
export function liftPick(items, net, chosenId, rand = 0) {
    if (!items?.length) return null;
    if (net >= 2 && chosenId) return items.find(i => i.id === chosenId) ?? items[0];
    return items[Math.min(items.length - 1, Math.floor(rand * items.length))];
}
/** Coins off the purse: 1 net success a tenth of what they carry, 2 a quarter, 3 or more half (house rule). */
export function coinShare(carried, net) {
    const c = Math.max(0, Math.floor(Number(carried) || 0));
    if (net <= 0 || !c) return 0;
    return Math.max(1, Math.floor(c * (net >= 3 ? 0.5 : net === 2 ? 0.25 : 0.1)));
}
/** Where people keep what is worth stealing, by year (for the card): a belt purse to a cred chip. */
export function pocketsIn(year) {
    const y = Number(year);
    if (!Number.isFinite(y)) return "their purse and pockets";
    if (y < 1600) return "the purse on their belt";
    if (y < 1900) return "their coat pockets";
    if (y < 2020) return "their pockets, wallet or phone";
    return "their pockets, cred chip or phone";
}
