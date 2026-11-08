/**
 * WoDX Actions 3.4 — the pure rules of Hunter: The Reckoning (1999 on, B42). Pages are the HtR core's (printed).
 * The edges are mechanics codes and one-line summaries in WoDX's own words; read the book for the full rules.
 */

const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };

export const VIRTUES = ["mercy", "vision", "zeal"];
/** The creeds (pp. 64–77): primary Virtue and starting Conviction. */
export const CREEDS = {
    defender: { label: "Defender", virtue: "zeal", conviction: 3, p: 64 },
    innocent: { label: "Innocent", virtue: "mercy", conviction: 3, p: 66 },
    judge: { label: "Judge", virtue: "zeal", conviction: 3, p: 68 },
    martyr: { label: "Martyr", virtue: "mercy", conviction: 4, p: 70 },
    redeemer: { label: "Redeemer", virtue: "mercy", conviction: 3, p: 72 },
    avenger: { label: "Avenger", virtue: "zeal", conviction: 4, p: 74 },
    visionary: { label: "Visionary", virtue: "vision", conviction: 3, p: 76 }
};
export const PATHS = {
    innocence: { label: "Innocence", virtue: "mercy", creed: "innocent" },
    martyrdom: { label: "Martyrdom", virtue: "mercy", creed: "martyr" },
    redemption: { label: "Redemption", virtue: "mercy", creed: "redeemer" },
    visionary: { label: "Visionary", virtue: "vision", creed: "visionary" },
    defense: { label: "Defense", virtue: "zeal", creed: "defender" },
    judgment: { label: "Judgment", virtue: "zeal", creed: "judge" },
    vengeance: { label: "Vengeance", virtue: "zeal", creed: "avenger" }
};

/**
 * The edges (Chapter Five, pp. 147–163): id, path, level, roll [Attribute, Virtue] ("" = no Attribute: the Virtue
 * alone; null = no roll), difficulty (number, "t:stamina+3", "var"), Conviction to activate, page, summary.
 */
export const EDGES = [
    ["hide", "innocence", 1, ["wits", "mercy"], 6, 0, 148, "Unnoticed by monsters: each rolls Perception + Alertness at 6 to see the hunter."],
    ["illuminate", "innocence", 2, ["perception", "mercy"], 6, 0, 148, "Any success: every hunter present sees the supernatural creatures in the area for what they are."],
    ["radiate", "innocence", 3, ["stamina", "mercy"], 6, 0, 149, "Each success adds 1 to the difficulty of supernatural attacks on the hunter."],
    ["confront", "innocence", 4, ["manipulation", "mercy"], 5, 1, 149, "Each success: an attacker spends a Willpower point to act against the hunter, and again for each later action."],
    ["blaze", "innocence", 5, ["strength", "mercy"], 8, 2, 149, "A light source becomes a weapon: one success deals its lethal dice (see the page's chart)."],
    ["demand", "martyrdom", 1, null, null, 0, 150, "Take a bashing level that can't be soaked: add Mercy to Strength for the turn."],
    ["witness", "martyrdom", 2, null, null, 0, 150, "Second sight deepened: the creature's true nature, and a glimpse of its dealings with humanity (the roll is on the page)."],
    ["ravage", "martyrdom", 3, ["manipulation", "mercy"], 7, 0, 150, "Range Mercy yards: a human is stunned with horror a turn per success; a creature is hurt (see the page)."],
    ["donate", "martyrdom", 4, ["", "mercy"], 7, 2, 151, "Mercy + the Attribute lent: give up to that many points of it to another for a time."],
    ["payback", "martyrdom", 5, ["manipulation", "mercy"], "t:stamina+4", 5, 151, "Impose a human limitation on a supernatural being (to breathe, to be solid)."],
    ["bluster", "redemption", 1, ["wits", "mercy"], 6, 0, 152, "Interrupt an action in sight, resisted by its attack roll; usable at any time in the turn."],
    ["insinuate", "redemption", 2, ["manipulation", "mercy"], 6, 0, 152, "Each success adds 1 to the difficulty of the creature's next action, as forgotten feelings stir."],
    ["respire", "redemption", 3, ["stamina", "mercy"], 6, 0, 153, "Heal a bashing or lethal level a success, each paid for (see the page); dangerous to intangible foes too."],
    ["becalm", "redemption", 4, ["manipulation", "mercy"], 7, 1, 154, "Minutes equal to successes: anyone attempting violence or sudden movement rolls Stamina, Strength or Dexterity at 8 a turn."],
    ["suspend", "redemption", 5, ["charisma", "mercy"], 8, 2, 154, "Seal the material world from every other realm for the scene: no creature escapes it."],
    ["foresee", "visionary", 1, ["intelligence", "vision"], 7, 0, 155, "Each success: an extra roll for a named action, keeping the best."],
    ["pinpoint", "visionary", 2, ["perception", "vision"], 6, 0, 155, "A success reveals one weakness of the creature observed."],
    ["delve", "visionary", 3, ["perception", "vision"], 6, 0, 156, "Five minutes of the place's past a success; +2 difficulty if over a year ago."],
    ["restore", "visionary", 4, ["stamina", "vision"], "restore", 3, 157, "Lethal damage becomes bashing; difficulty 6 + 1 a lethal level (at most 10); once a scene."],
    ["augur", "visionary", 5, ["intelligence", "vision"], 8, 3, 157, "The Storyteller rolls in secret: a minute of a possible future a success; once a scene."],
    ["ward", "defense", 1, ["stamina", "zeal"], 6, 0, 157, "A Zeal-yard barrier: each monster must beat the successes on a Stamina roll to come closer."],
    ["rejuvenate", "defense", 2, null, null, 0, 158, "Bashing heals a level every 10 minutes, lethal much faster (the page's chart)."],
    ["brand", "defense", 3, ["", "zeal"], 6, 0, 158, "A touch (Dexterity + Brawl against a resisting target), then Zeal: a mark only hunters see."],
    ["champion", "defense", 4, ["appearance", "zeal"], 6, 1, 159, "Resisted by the monster's Wits at 6: its attention is drawn to the hunter alone."],
    ["burn", "defense", 5, ["stamina", "zeal"], 6, 2, 159, "A turn a success: whoever touches or is touched by the hunter takes lethal dice."],
    ["discern", "judgment", 1, ["perception", "zeal"], "var", 0, 160, "Identify a supernatural creature, or see in the dark or blind."],
    ["burden", "judgment", 2, ["stamina", "zeal"], "t:stamina+3", 0, 161, "A glare: the creature is held a turn a success."],
    ["balance", "judgment", 3, ["wits", "zeal"], "t:stamina+2", 0, 161, "The creature can't use powers that need supernatural energy."],
    ["pierce", "judgment", 4, ["perception", "zeal"], 6, 1, 161, "For the scene, the Storyteller rolls for each lie told in the hunter's presence."],
    ["expose", "judgment", 5, ["", "zeal"], 8, 2, 162, "Every creature near is revealed to all: 15 feet at one success, up to a city or more."],
    ["cleave", "vengeance", 1, ["dexterity", "melee"], 6, 0, 162, "A held or conjured weapon: +2 damage, all lethal, harms the immaterial."],
    ["trail", "vengeance", 2, ["perception", "zeal"], 6, 0, 163, "A touch leaves a trail only hunters see: six hours a success."],
    ["smolder", "vengeance", 3, ["manipulation", "zeal"], 7, 0, 163, "A cloud of black smoke that blinds all senses but the hunter's; +10 cubic feet a Conviction spent."],
    ["surge", "vengeance", 4, null, null, 1, 163, "A pool of Zeal points to add to Strength, Dexterity and Stamina for the scene (at most 6); Conviction can't be risked on it."],
    ["smite", "vengeance", 5, ["dexterity", "zeal"], 6, 1, 163, "Lightning: successes after the first add to Strength in a lethal pool; range Zeal yards."]
].map(([id, path, level, roll, diff, conviction, p, e]) => ({ id, path, level, roll, diff, conviction, p, e, virtue: PATHS[path].virtue, name: id.replace(/^./, c => c.toUpperCase()) }));

export const edgeFor = name => EDGES.find(e => e.id === String(name ?? "").toLowerCase().replace(/[^a-z]/g, "")) ?? null;
/** An edge's level can't pass its Virtue (p. 146: edges follow the Virtue points). */
export const edgeAllowed = (edge, virtues) => !!edge && n(virtues[edge.virtue]) >= edge.level;
export function edgeDifficulty(edge, { t = null, lethal = 0 } = {}) {
    if (!edge || edge.diff === null) return null;
    if (typeof edge.diff === "number") return edge.diff;
    if (edge.diff === "restore") return Math.min(10, 6 + n(lethal));
    const m = String(edge.diff).match(/^t:([a-z]+)\+(\d+)$/);
    if (m) return t ? Math.min(10, n(t[m[1]]) + n(m[2])) : null;
    return null;
}

/** Risking Conviction (pp. 136–137): once a scene, any or all of it into one edge roll; success keeps it +1 (the Storyteller may give up to 3); failure loses what was risked; a botch loses it all. */
export function risk(current, invested, roll, { bonus = 1 } = {}) {
    const k = Math.max(0, Math.min(n(current), n(invested)));
    if (!k) return { dice: 0, after: n(current) };
    if (roll.botch) return { dice: k, after: 0, lostAll: true };
    if (roll.successes > 0) return { dice: k, after: Math.min(10, n(current) + Math.max(1, Math.min(3, n(bonus)))) };
    return { dice: k, after: n(current) - k };
}
/** Reacting with Conviction (p. 133): Intelligence, Perception or Wits + the primary Virtue at 6. */
export const REACT = { difficulty: 6, attrs: ["intelligence", "perception", "wits"] };
/** The Storyteller's prerogative (p. 135): the primary Virtue at 6 (a powerful foe) to 8 (a titanic one). */
export const PREROGATIVE = { powerful: 6, mighty: 7, titanic: 8 };
/** At 10 Conviction, cash it in for a Virtue point; no Virtue above the primary one (p. 139). */
export function maxOut(virtues, primary, pick) {
    const cap = n(virtues[primary]);
    if (pick !== primary && n(virtues[pick]) + 1 > cap) return null;
    return { ...virtues, [pick]: n(virtues[pick]) + 1 };
}
/** Derangements come at 7 in a Virtue and with each point after (p. 131). */
export const derangementsDue = (before, after) => Math.max(0, n(after) - Math.max(6, n(before)));
/** The Imbuing (p. 84): Virtues 3 points by creed, Willpower 3, Backgrounds 5, Conviction by creed (at most 8 with freebies). */
export const IMBUE = { virtues: 3, willpower: 3, backgrounds: 5, freebies: 21, convictionCap: 8, p: 84 };
export function imbueCheck(creed, virtues) {
    const c = CREEDS[creed]; if (!c) return "Pick a creed.";
    const total = VIRTUES.reduce((s, k) => s + n(virtues[k]), 0);
    if (total !== IMBUE.virtues) return `The Virtues take ${IMBUE.virtues} points (${total} given).`;
    if (VIRTUES.some(k => n(virtues[k]) > n(virtues[c.virtue]))) return `No Virtue may pass the primary one (${c.virtue}).`;
    if (n(virtues[c.virtue]) < 1) return `The ${c.label}'s primary Virtue is ${c.virtue}: it needs a point.`;
    return null;
}
