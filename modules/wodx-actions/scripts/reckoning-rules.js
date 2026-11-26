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
    vengeance: { label: "Vengeance", virtue: "zeal", creed: "avenger" },
    // B7834: the two Vision creeds of the later creed books: their own paths (other creeds need Vision 4 and take a derangement for each)
    hermit: { label: "Hermit", virtue: "vision", creed: "hermit", book: "hermit" },
    deviance: { label: "Deviance", virtue: "vision", creed: "wayward", book: "wayward" }
};
/** B7834: the creed books whose new edges are listed (printed pages; the Wayward scan has none, so its PDF pages). */
/** B7834: a no-roll edge whose strength on the effects card is a Virtue, not one success (Protect: Zeal soak dice). */
export const EDGE_STRENGTH = { protect: "zeal" };

export const EDGE_BOOKS = {
    avenger: "Hunter Book: Avenger", defender: "Hunter Book: Defender", hermit: "Hunter Book: Hermit", innocent: "Hunter Book: Innocent",
    judge: "Hunter Book: Judge", martyr: "Hunter Book: Martyr", redeemer: "Hunter Book: Redeemer", wayward: "Hunter Book: Wayward"
};

/**
 * The edges (Chapter Five, pp. 147–163): id, path, level, roll [Attribute, Virtue] ("" = no Attribute: the Virtue
 * alone; null = no roll), difficulty (number, "t:stamina+3", "var"), Conviction to activate, page, summary.
 */
export const EDGES = [
    ["hide", "innocence", 1, ["wits", "mercy"], 6, 0, 148, "Unnoticed by monsters: each rolls Perception + Alertness at 6 to see the hunter."],
    ["illuminate", "innocence", 2, ["perception", "mercy"], 6, 0, 148, "Any success: every hunter present sees the supernatural creatures in the area for what they are."],
    ["radiate", "innocence", 3, ["stamina", "mercy"], 6, 0, 149, "Supernatural attacks on the hunter are 1 harder per success."],
    ["confront", "innocence", 4, ["manipulation", "mercy"], 5, 1, 149, "Each success: an attacker spends a Willpower point to act against the hunter, and again for each later action."],
    ["blaze", "innocence", 5, ["strength", "mercy"], 8, 2, 149, "A light source becomes a weapon: one success deals its lethal dice (see the page's chart)."],
    ["demand", "martyrdom", 1, null, null, 0, 150, "Take a bashing level that can't be soaked: add Mercy to Strength for the turn."],
    ["witness", "martyrdom", 2, null, null, 0, 150, "Second sight deepened: the creature's true nature, and a glimpse of its dealings with humanity (the roll is on the page)."],
    ["ravage", "martyrdom", 3, ["manipulation", "mercy"], 7, 0, 150, "Range Mercy yards: a human is stunned with horror a turn per success; a creature is hurt (see the page)."],
    ["donate", "martyrdom", 4, ["", "mercy"], 7, 2, 151, "Mercy + the Attribute lent: give up to that many points of it to another for a time."],
    ["payback", "martyrdom", 5, ["manipulation", "mercy"], "t:stamina+4", 5, 151, "Impose a human limitation on a supernatural being (to breathe, to be solid)."],
    ["bluster", "redemption", 1, ["wits", "mercy"], 6, 0, 152, "Interrupt an action in sight, resisted by its attack roll; usable at any time in the turn."],
    ["insinuate", "redemption", 2, ["manipulation", "mercy"], 6, 0, 152, "The creature's next action is 1 harder per success, as forgotten feelings stir."],
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
    ["smite", "vengeance", 5, ["dexterity", "zeal"], 6, 1, 163, "Lightning: successes after the first add to Strength in a lethal pool; range Zeal yards."],
    /* B7834: the creed books' new edges, read from the page images (summaries in WoDX's own words); a ninth field names the book, a tenth the edge when two words */
    ["impact", "vengeance", 1, ["dexterity", "athletics"], 6, 0, 71, "A thrown thing that can hurt (Strength + 1 or more) does +2, all lethal, and harms the immaterial; not bullets or arrows.", "avenger"],
    ["museofflame", "vengeance", 2, ["perception", "zeal"], 5, 0, 71, "Looking into an open flame: it bends toward the nearest supernatural being within ten miles, ten minutes a success; 7 when it stirs by itself; once a scene.", "avenger", "Muse of Flame"],
    ["fuel", "vengeance", 3, null, null, 0, 72, "Under real danger or duress, once a scene, trade a Willpower point for a Conviction point or back; reflexive.", "avenger"],
    ["firewalk", "vengeance", 4, null, null, 1, 72, "An action: for the scene, the hunter's Stamina comes off whatever harm fire does to them.", "avenger"],
    ["harpoon", "vengeance", 5, ["dexterity", "athletics"], 6, 2, 72, "A burning spear to Zeal yards: Strength + 2 lethal, and a tie for Zeal turns; breaking free is a Willpower contest at 6, and the prey rolls its own Strength as lethal on itself.", "avenger"],
    ["alarm", "defense", 1, ["perception", "zeal"], 6, 0, 74, "Walk a perimeter (a room at 1-2 successes up to a city block at 9-10): monsters crossing it are felt, with their direction, for a day; +1 Conviction a day more, or to wake to it.", "defender"],
    ["lock", "defense", 2, ["stamina", "zeal"], 6, 0, 75, "A touched door, window, safe or file is sealed to monsters for a day: they must beat the successes to break in.", "defender"],
    ["guard", "defense", 3, ["perception", "zeal"], 6, 0, 75, "A touched person: the hunter feels when anything supernatural acts on them, and where they are; a day at 1-2 successes up to a month at 9-10.", "defender"],
    ["protect", "defense", 4, null, null, 1, 76, "The hunter's Zeal becomes a pool of soak dice against bashing and lethal for the scene, spent as wished; once a scene.", "defender"],
    ["blast", "defense", 5, null, null, 2, 76, "A ring of lightning to Zeal yards: a monster crossing it takes Zeal + Stamina lethal dice at 6, no attack roll; a turn and one a Conviction spent; nothing else that long; once a scene.", "defender"],
    ["reach", "hermit", 1, ["perception", "vision"], 6, 0, 87, "The senses leave the body, ten minutes a success, within 30 yards a Vision point; the body is helpless meanwhile.", "hermit"],
    ["send", "hermit", 2, ["intelligence", "vision"], "var", 0, 88, "A five-word message or a picture into a hunter's mind in sight: 7 for one with second sight on, 8 without, 9 a bystander; four successes, half a minute of talk.", "hermit"],
    ["edict", "hermit", 3, ["manipulation", "vision"], 6, 0, 89, "Eyes meet: a supernatural being loses a Willpower point a success; a servant of monsters loses one, a worthy soul gains one; a hunter gains or loses a Conviction.", "hermit"],
    ["transcend", "hermit", 4, ["stamina", "vision"], 8, 1, 90, "The spirit leaves the body, 15 minutes a success, travelling up to 1,000 miles an hour; Wits, Intelligence and Manipulation stand for Dexterity, Stamina and Strength.", "hermit"],
    ["proclaim", "hermit", 5, ["", "vision"], "var", 2, 91, "Speaking in tongues to those in sight (6 for hunters and people, the highest Willpower among creatures): successes laid on creatures give a derangement for the scene, a day, or for good; once a day.", "hermit"],
    ["foolsluck", "innocence", 1, ["wits", "mercy"], 8, 0, 78, "When life or the mission is truly at risk, a small lucky turn opens a way out (a roll it brings is at 10 less the successes); once a scene, the hunter only.", "innocent", "Fool's Luck"],
    ["ease", "innocence", 2, ["manipulation", "mercy"], 6, 0, 79, "Three turns of talk, resisted by the subject's primary Virtue + 1 for each other Virtue of 5 or more: each success holds a derangement off for a scene; imbued only, once a day each.", "innocent"],
    ["inspire", "innocence", 3, null, null, 0, 80, "A touch: spend the hunter's own Conviction for others (their second sight, their edges, a risk on their roll); for people, shelter from supernatural fear and control while touching; up to Mercy people.", "innocent"],
    ["bond", "innocence", 4, ["charisma", "mercy"], 6, 0, 80, "With an imbued known a month, a touch and a turn: the hunter can sense how they fare; a day at 1-2 successes up to a month at 9-10.", "innocent"],
    ["vigilance", "judgment", 1, null, null, 0, 76, "Less sleep by Zeal (six hours at 1-2 down to minutes at 10), a Willpower point a day used; failed rolls to react with Conviction may be rolled again.", "judge"],
    ["anathema", "judgment", 2, ["strength", "zeal"], 6, 0, 77, "The Judgment sign on a person or place: a monster feeding there takes a bashing level a success; Zeal days, up to Zeal at once.", "judge"],
    ["vow", "judgment", 3, ["charisma", "zeal"], "t:stamina+3", 1, 78, "A sworn pact sealed with the sign: if broken, the hunter knows and it burns a lethal level a success; a month a Zeal point.", "judge"],
    ["confession", "judgment", 4, ["manipulation", "zeal"], "var", 1, 79, "Touch and one question (difficulty its Willpower, at most 9): the hunter speaks one sentence of the true answer as it knows it; once a scene each.", "judge"],
    ["imprison", "judgment", 5, ["stamina", "zeal"], "t:stamina+3", 2, 79, "A gaze holds a creature in place an hour a success; attacked, it may break out with more successes on Willpower at 8.", "judge"],
    ["project", "martyrdom", 1, ["appearance", "mercy"], 6, 0, 75, "A display of resolve: for the scene no monster in sight may attack or deal with the hunter unless it beats the successes on Willpower at 6.", "martyr"],
    ["revelation", "martyrdom", 2, ["wits", "mercy"], 6, 1, 76, "Eye contact: a monster's feeling (1), intent (2), its reasons (3) or its plans (4+) at that moment; it may read the hunter back; once a scene each.", "martyr"],
    ["inflict", "martyrdom", 3, null, null, 1, 77, "An action: for the scene, close and Melee harm done to the hunter is done to the attacker too, each soaking apart.", "martyr"],
    ["ordeal", "martyrdom", 4, ["stamina", "mercy"], 6, 2, 77, "A touch: all of a person's or hunter's wounds pass to the hunter (too many kill the hunter); derangements too.", "martyr"],
    ["expiate", "martyrdom", 5, null, null, 0, 77, "With 10 Conviction, three turns of touch and a Willpower contest at 6: won, Conviction falls to 4 and the monster loses its nature for good (not ghosts); then a die: 1-5 a derangement and +1 to all, 6-10 death.", "martyr"],
    ["outreach", "redemption", 1, ["manipulation", "mercy"], 6, 0, 74, "Unarmed and calm, to one named monster: the hunter seems harmless for the scene (pleasant at 3); a weapon or aggression ends it.", "redeemer"],
    ["insight", "redemption", 2, ["wits", "mercy"], 6, 0, 75, "An hour watching a creature: what it misses of being human, deeper with each success.", "redeemer"],
    ["punish", "redemption", 3, ["wits", "mercy"], 6, 0, 75, "A touch: for hours equal to the successes the monster must beat them on Willpower at 8 to attack a person, or lose the action; up to Mercy at once.", "redeemer"],
    ["abjure", "redemption", 4, ["appearance", "mercy"], 6, 1, 76, "For the scene each hostile monster in sight resists on Willpower at 6 or flees; once a scene.", "redeemer"],
    ["shame", "redemption", 5, ["manipulation", "mercy"], 8, 2, 76, "Each hostile monster hearing resists on Willpower at 6: each success over it is a level it does to itself; once a scene.", "redeemer"],
    ["impart", "deviance", 1, ["perception", "vision"], 6, 0, 84, "Each success opens another hunter's second sight for the scene, within five yards a Vision point; once a scene.", "wayward"],
    ["forewarn", "deviance", 2, null, null, 0, 85, "A danger sense the Storyteller rolls (Wits + Vision at 7): a turn's warning a success, or the successes on the next initiative or defence roll.", "wayward"],
    ["enrage", "deviance", 3, ["manipulation", "vision"], 6, 0, 86, "A hunter a success within Vision yards goes berserk unless they beat it on Willpower at 7: they attack the foe for that many turns with that many extra dice, then take unsoakable bashing.", "wayward"],
    ["reap", "deviance", 4, ["perception", "vision"], 8, 1, 86, "Staring into a dead or undead subject's eyes: a question a success, answered truly as it knows; once a scene each.", "wayward"],
    ["spiral", "deviance", 5, ["strength", "vision"], 8, 2, 87, "A whirlwind three yards across a success for the scene: lethal levels equal to the successes each turn to all in it, attacks on the hunter a die harder a success; once a scene.", "wayward"]
].map(([id, path, level, roll, diff, conviction, p, e, book = "", label = ""]) => ({ id, path, level, roll, diff, conviction, p, e, book, virtue: PATHS[path].virtue,
    name: label || id.replace(/^./, c => c.toUpperCase()), ref: book ? `${EDGE_BOOKS[book]} ${book === "wayward" ? "PDF p." : "p."} ${p}` : `Hunter: The Reckoning p. ${p}` }));

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
