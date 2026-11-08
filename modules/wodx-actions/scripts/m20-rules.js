/**
 * WoDX Actions — Mage: The Ascension 20th, the pure rules (Phase 6m, later eras). No Foundry here: the harness tests them.
 * Mechanics from Mage: The Ascension 20th Anniversary Edition, in WoDX's words, with the printed page numbers.
 */

export const REF = "Mage 20th";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const SPHERES = ["correspondence", "entropy", "forces", "life", "matter", "mind", "prime", "spirit", "time"];
export const KINDS = { coincidental: { label: "Coincidental", add: 3 }, vulgar: { label: "Vulgar, no witnesses", add: 4 }, witnessed: { label: "Vulgar, with witnesses", add: 5 } };

/** Arete and Willpower (p. 329): the casting roll and every Sphere are capped by the lower of Arete and permanent Willpower. */
export const castingDice = (arete, willpower) => Math.max(0, Math.min(n(arete), n(willpower) || n(arete)));

/** The difficulty modifiers chart (p. 503); the net is ±3 at most, and Quintessence counts toward it (−1 a point, −3 at most). */
export const MODIFIERS = {
    personal: { label: "A personalized instrument", mod: -1 }, unique: { label: "A unique instrument", mod: -1 }, specialized: { label: "A unique and specialized instrument (both)", mod: -2 },
    unfamiliar: { label: "Unfamiliar instruments", mod: 2 }, without: { label: "Without the usual instruments", mod: 3 }, needless: { label: "Instruments not needed, used anyway", mod: -1 },
    sympathy: { label: "A personal item of the target's (sympathy)", mod: -1 }, resonance: { label: "Fitting Resonance", mod: -1 }, opposed: { label: "Opposed Resonance", mod: 1 },
    mythic: { label: "Working mythic threads", mod: -1 }, fast: { label: "Fast-casting", mod: 1 }, backwards: { label: "Turning time backward", mod: 3 },
    research: { label: "Researched the subject (−1 to −3)", mod: -1 }, node: { label: "Near a Node (−1 to −3)", mod: -1 }, distant: { label: "A distant or hidden target", mod: 1 },
    juggling: { label: "Juggling Effects (+1 per two)", mod: 1 }, avatar: { label: "At odds with the Avatar (+1 to +3)", mod: 1 }, outlandish: { label: "An outlandish or godlike feat (+1 to +3)", mod: 1 }
};
/** The Magickal Feats chart (p. 502): suggested successes. */
export const FEATS = [
    { k: "simple", label: "Simple (one's own senses, a candle, shielding one's mind)", need: 1 },
    { k: "standard", label: "Standard (healing oneself, a small fire, shaping oneself, a mood)", need: 2 },
    { k: "difficult", label: "Difficult (aggravated healing, a fireball, reading another mind)", need: 3 },
    { k: "impressive", label: "Impressive (limbs regrown, a firestorm, another reshaped, mind control)", need: 4 },
    { k: "mighty", label: "Mighty (simple life, walls down, strange entities, a mob)", need: 5 },
    { k: "outlandish", label: "Outlandish (complex life, buildings, Otherworldly creatures)", need: 10 },
    { k: "godlike", label: "Godlike (a Pattern rewritten, cities, hordes)", need: 20 }
];

/**
 * A casting (pp. 501–503): Arete (capped by Willpower) against the highest Sphere + 3 (coincidental), + 4 (vulgar) or + 5 (vulgar,
 * witnessed); the modifiers net ±3 with Quintessence among them; 3 to 10; past 10, a success needed per point. Quintessence spent in a
 * turn is limited by the Avatar.
 */
export function castPlan({ arete = 0, willpower = 0, used = [], known = {}, kind = "coincidental", mods = [], quint = 0, avatar = 0, need = 1, extra = 0, freeMod = 0 } = {}) {
    const cap = castingDice(arete, willpower);
    const u = used.filter(x => n(x.level) > 0);
    if (!u.length) return { ok: false, why: "choose the Spheres the Effect uses" };
    for (const x of u) {
        if (n(x.level) > n(known[x.sphere])) return { ok: false, why: `${x.sphere} ${x.level} is past the ${n(known[x.sphere])} on the sheet` };
        if (n(x.level) > cap) return { ok: false, why: `no Sphere above ${cap} works (Arete and permanent Willpower)` };
    }
    const q = Math.max(0, n(quint));
    if (n(avatar) && q > n(avatar)) return { ok: false, why: `the Avatar (${n(avatar)}) lets only that much Quintessence pass in a turn` };
    const highest = Math.max(...u.map(x => n(x.level)));
    const base = highest + (KINDS[kind]?.add ?? 3);
    const raw = mods.reduce((s, k) => s + (MODIFIERS[k]?.mod ?? 0), 0) + n(freeMod) - Math.min(3, q);
    const net = clamp(raw, -3, 3);
    let diff = base + net, over = 0;
    if (diff > 10) { over = diff - 10; diff = 10; }
    diff = Math.max(3, diff);
    return { ok: true, dice: cap, difficulty: diff, need: Math.max(1, n(need)) + Math.max(0, n(extra)) + over, highest, base, net, capped: raw !== net, quintUsed: q, over };
}

/** Degrees of success (p. 503). */
export function degree(r, need) {
    const s = n(r.successes), k = Math.max(1, n(need));
    if (r.botch) return { key: "botch", text: "a botch: the Effect is wasted, and Paradox comes" };
    if (!s) return { key: "failure", text: "it falls short; trying again is +1 difficulty" };
    if (s >= k + 3) return { key: "extraordinary", text: "an extraordinary success: some bonus, as the Storyteller decides" };
    if (s >= k) return { key: "success", text: "it goes as planned" };
    if (s >= Math.ceil(k / 2)) return { key: "partial", text: "a partial success: imperfect; going on is +1 difficulty" };
    return { key: "short", text: "too few successes for the feat" };
}
/** Paradox gained (p. 502): success or failure, vulgar 1; a botch, by the highest Sphere and the witnesses. */
export function paradoxGained(kind, highest, botched) {
    const h = n(highest);
    if (!botched) return kind === "coincidental" ? 0 : 1;
    return kind === "coincidental" ? h : kind === "vulgar" ? 1 + h : 2 + 2 * h;
}
/** Damage or duration by successes (p. 504): 0, 2, 6, 8, 10, then successes × 2; a turn, scene, day, story, six months. */
export function damage(successes, { forces = false, cap = 20 } = {}) {
    const s = n(successes) + (forces ? 1 : 0);
    const d = s <= 1 ? 0 : s === 2 ? 2 : s === 3 ? 6 : s === 4 ? 8 : s === 5 ? 10 : s * 2;
    return Math.min(n(cap) || 20, d);
}
export const DURATION = ["none", "one turn", "one scene", "one day", "one story", "six months", "the Storyteller's call"];
export const duration = successes => DURATION[clamp(n(successes), 0, 6)];
/** The kind of harm (p. 504): Mind bashing; most lethal; aggravated with Prime 2 and a Quintessence point, fire or lightning, or vulgar Pattern-breaking. */
export function damageType({ spheres = [], primeCharged = false, fire = false, patternBreak = false } = {}) {
    if (primeCharged || fire || patternBreak) return "aggravated";
    if (spheres.length && spheres.every(s => s === "mind")) return "bashing";
    if (spheres.length && spheres.every(s => s === "correspondence" || s === "time")) return "none";
    return "lethal";
}

/** The backlash roll (p. 506): one die a Paradox point at 6; what each band of successes brings. */
export function backlash(r) {
    if (r.botch) return { discharge: "all", band: "botch", text: "every point discharges harmlessly" };
    const s = n(r.successes);
    if (!s) return { discharge: 0, band: "none", text: "nothing happens, and nothing discharges" };
    const bands = [[5, "one die of bashing a success, and a trivial Paradox Flaw"], [10, "a Burn of one die of bashing a success, or a minor Paradox Flaw"],
        [15, "a lethal Burn, or a significant Flaw, a Paradox spirit, or a mild Quiet"], [20, "a lethal Burn and a permanent Paradox point, or two of: a severe Flaw, a Paradox spirit, a moderate Quiet, a Paradox Realm"],
        [Infinity, "an aggravated Burn, and two permanent points, a drastic Flaw, a Paradox spirit, a severe Quiet, or a Paradox Realm"]];
    const b = bands.find(([top]) => s <= top);
    return { discharge: s, band: b[0] === Infinity ? "21+" : `≤${b[0]}`, text: b[1] };
}
/** The Quiet by the Paradox discharged (p. 506). */
export const QUIET = [[3, "minor quirks or delusions"], [6, "worse delusions; sees what no one else does"], [10, "senses backfire; hallucinations, perhaps hobgoblins"],
    [15, "trapped in a mindscape, or a danger to all near"], [20, "catatonia, or a Marauder's ways without its immunity"], [Infinity, "a Marauder: out of play"]];
export const quietLevel = discharged => { const k = QUIET.findIndex(([top]) => n(discharged) <= top); return { level: k + 1, text: QUIET[k][1] }; };
/** Shedding Paradox (p. 549): under five points, one a week without overt magick. Twenty or more without a backlash: disaster (p. 333). */
export const shed = (pool, weeks) => (n(pool) < 5 ? Math.max(0, n(pool) - Math.max(0, n(weeks))) : n(pool));
export const overload = pool => n(pool) >= 20;
/** Staving off a backlash (p. 549): a Willpower point; the Effect fails and the backlash waits for the scene's end, growing. */
export const STAVE = "a Willpower point: the Effect fails, and the backlash waits for the end of the scene, a die more for every Paradox point gathered meanwhile";
/** The wheel (p. 331): Quintessence and Paradox share twenty boxes; Paradox cancels Quintessence where they meet. */
export function wheel(quint, paradox) {
    const p = clamp(n(paradox), 0, 20);
    return { quintessence: Math.min(n(quint), 20 - p), paradox: p };
}
/** Countermagick (p. 545): a full action; a dot in an attacking Sphere; Arete at 7; each success takes one away. Protective +1 (Prime 1, a Quintessence), reflective +2. */
export function counterPlan({ arete = 0, willpower = 0, sharesSphere = true, mode = "self", prime = 0, quint = 0 } = {}) {
    if (!sharesSphere) return { ok: false, why: "countermagick needs a dot in one of the attacking Spheres" };
    if (mode !== "self" && (n(prime) < 1 || n(quint) < 1)) return { ok: false, why: "protecting another or reflecting needs Prime 1 and a Quintessence point" };
    return { ok: true, dice: castingDice(arete, willpower), difficulty: 7 + (mode === "dispel" ? 1 : mode === "reflect" ? 2 : 0), quint: mode === "self" ? 0 : 1 };
}
/** Resisting Mind magick (p. 330): Willpower at 6; each success takes one away. Sleepers must spend a Willpower point to try. */
export const resistMind = { difficulty: 6 };

/** Experience (p. 336). */
export function xpCost(trait, current = 0, { affinity = false } = {}) {
    const c = n(current);
    switch (trait) {
        case "attribute": return c * 4;
        case "ability": return c ? c * 2 : 3;
        case "sphere": return c ? c * (affinity ? 7 : 8) : 10;
        case "arete": return c * 8;
        case "background": return c * 3;
        case "willpower": return c;
        default: return 0;
    }
}
/** Character creation (p. 250). */
export const STARTING = { attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 7, spheres: 6, arete: 1, willpower: 5, freebies: 15 };
