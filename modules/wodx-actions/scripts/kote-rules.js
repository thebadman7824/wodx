/**
 * WoDX Actions — Kindred of the East, the pure rules (Phase 6j, later eras). No Foundry here: the harness tests them.
 * Mechanics from Kindred of the East (the 1998 sourcebook), in WoDX's words, with the printed page numbers.
 */

export const REF = "Kindred of the East";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** The five Dharmas (p. 54): the Virtue each is rolled with, its direction, element, and the lucky number for Horoscope (p. 86). */
export const DHARMAS = {
    devilTiger: { label: "the Howl of the Devil-Tiger", virtue: "po", direction: "South", element: "Fire and Ghost-flame", lucky: 2 },
    crane: { label: "the Way of the Resplendent Crane", virtue: "hun", direction: "North", element: "Water and Blood", lucky: 1 },
    shadow: { label: "the Song of the Shadow", virtue: "yin", direction: "West", element: "Metal and Bone", lucky: 4 },
    whispers: { label: "the Path of a Thousand Whispers", virtue: "balance", direction: "Center", element: "Earth and Jade", lucky: 0 },
    dragon: { label: "the Dance of the Thrashing Dragon", virtue: "yang", direction: "East", element: "Wood and Flesh", lucky: 3 }
};
/** The direction's own lucky number (p. 86). */
export const DIRECTION_LUCKY = { North: 6, West: 9, Center: 5, East: 8, South: 7 };
export function dharmaOf(v) {
    const s = String(v ?? "").toLowerCase();
    if (/tiger/.test(s)) return "devilTiger";
    if (/crane/.test(s)) return "crane";
    if (/shadow/.test(s)) return "shadow";
    if (/whisper/.test(s)) return "whispers";
    if (/dragon/.test(s)) return "dragon";
    return "";
}

/** Dharma levels (p. 54): Social bonus, Virtue pair maximum, Trait maximum, Chi a turn, status. Level 10 is unknowable. */
export const DHARMA_LEVELS = [
    { social: -4, pair: 10, trait: 5, chi: 1, status: "chih-mei or hin" }, { social: 0, pair: 10, trait: 5, chi: 1, status: "disciple" },
    { social: 0, pair: 10, trait: 5, chi: 1, status: "disciple" }, { social: 0, pair: 10, trait: 5, chi: 1, status: "disciple" },
    { social: 0, pair: 10, trait: 5, chi: 2, status: "jina" }, { social: 0, pair: 10, trait: 5, chi: 2, status: "jina" },
    { social: 1, pair: 12, trait: 6, chi: 3, status: "jina or mandarin" }, { social: 2, pair: 14, trait: 7, chi: 4, status: "mandarin or ancestor" },
    { social: 3, pair: 16, trait: 8, chi: 6, status: "ancestor" }, { social: 5, pair: 18, trait: 9, chi: 8, status: "bodhisattva" },
    { social: 5, pair: 20, trait: 10, chi: 10, status: "bodhisattva or arhat" }
];
export const dharmaLevel = d => DHARMA_LEVELS[clamp(n(d), 0, 10)];
export const chiPerTurn = d => dharmaLevel(d).chi;

/** The Virtue a Dharma roll uses (p. 53). Balance: the average of the highest and lowest of the four Virtues (rounded down). */
export function dharmaVirtue(dharma, v = {}) {
    const k = DHARMAS[dharma]?.virtue;
    if (!k) return 0;
    if (k !== "balance") return n(v[k]);
    const all = [n(v.yin), n(v.yang), n(v.hun), n(v.po)];
    return Math.floor((Math.max(...all) + Math.min(...all)) / 2);
}
/**
 * A Dharma roll (pp. 53–54): the Dharma's Virtue resisted by the P'o, both at the permanent Willpower; no Willpower spent.
 * An auspicious occasion: Virtue wins, +1 Dharma; P'o wins, it takes the body for a scene. An act of blindness: P'o wins, −1 Dharma.
 */
export function dharmaOutcome(kind, virtueSucc, poSucc) {
    const v = n(virtueSucc), p = n(poSucc);
    if (kind === "auspicious") return v > p ? { dharma: 1, text: "a burst of insight" } : p > v ? { dharma: 0, poTakes: true, text: "the Demon rebels: the P'o takes the body for a scene" } : { dharma: 0, text: "discouraged: no change" };
    return p > v ? { dharma: -1, text: "a flash of blindness: the Dharma falls a level" } : v > p ? { dharma: 0, text: "the purpose holds" } : { dharma: 0, text: "remorse, or none: no change" };
}

/** Chi: no more than 10 of each kind (p. 134). Permanent imbalance: three or more dots between Yin and Yang (p. 139). */
export const CHI_CAP = 10;
export function permImbalance(yin, yang) {
    const d = n(yin) - n(yang);
    return d >= 3 ? "yin" : d <= -3 ? "yang" : "";
}
/** Temporary imbalance (p. 140): more of a kind than its Virtue, or none of one kind while holding the other. */
export function tempImbalance({ yin = 0, yang = 0, yinChi = 0, yangChi = 0 } = {}) {
    const out = [];
    if (n(yinChi) > n(yin) || (!n(yinChi) && n(yangChi))) out.push(!n(yinChi) ? "yang" : "yin");
    if (n(yangChi) > n(yang) || (!n(yangChi) && n(yinChi))) out.push(!n(yangChi) ? "yin" : "yang");
    return [...new Set(out)];
}
/** A botched roll that spends Chi while temporarily imbalanced (p. 140): every point above the Virtues explodes. */
export function chiExplosion({ yin = 0, yang = 0, yinChi = 0, yangChi = 0 } = {}) {
    const exY = Math.max(0, n(yinChi) - n(yin)), exG = Math.max(0, n(yangChi) - n(yang));
    return { yinLost: exY, yangLost: exG, aggravated: exY + exG, soak: "Stamina at 8", waveSoul: exY + exG > 0 };
}
/** Hunger (p. 136): five or less in the body, hungry; two or less, ravenous (the P'o needs one success); Yang imbalance one step worse. */
export function hunger(chi, yangImbalanced = false) {
    const c = n(chi);
    if (yangImbalanced) return c <= 2 ? "uncontrollable" : c <= 5 ? "ravenous" : "fed";
    return c <= 2 ? "ravenous" : c <= 5 ? "hungry" : "fed";
}

/**
 * Feeding on blood (p. 137): a point of blood is a point of Chi, the kind the vampire holds less of first, then alternating;
 * a mood set beforehand (Manipulation + the Virtue wanted, at 6) gives one kind only.
 */
export function feedBlood({ yinChi = 0, yangChi = 0 } = {}, points = 1, attuned = "") {
    let y = n(yinChi), g = n(yangChi), lost = 0, last = "";
    for (let k = 0; k < n(points); k++) {
        // the lesser kind first; level, the kind not taken last (the book's example, p. 137)
        const pick = attuned || (y < g ? "yin" : g < y ? "yang" : last === "yin" ? "yang" : last === "yang" ? "yin" : "yang");
        last = pick;
        if (pick === "yin") { if (y < CHI_CAP) y++; else lost++; }
        else { if (g < CHI_CAP) g++; else lost++; }
    }
    return { yinChi: y, yangChi: g, wasted: lost };
}
/** Flesh (p. 137): fresh (within four hours) gives both evenly, a cold corpse mostly Yin (8:2), the living mostly Yang (2:8). */
export const FLESH = { fresh: [5, 5], cold: [8, 2], living: [2, 8] };
/** The other ways to feed, by the Dharma needed (pp. 137–138). */
export const FEEDING = {
    flesh: { dharma: 0, label: "Flesh (a level a turn; each is a Health Level)" },
    blood: { dharma: 1, label: "Blood (a point a turn)" },
    breath: { dharma: 5, label: "Breath (the Chi Virtue at 6 against Stamina; a point a success, each a Health Level)" },
    osmosis: { dharma: 6, label: "Osmosis (Yin or Yang against the Wall; 10 − Wall Chi; once a month a site)" }
};

/**
 * The soul's states (pp. 150–151): fire soul (Yin against the P'o), wave soul (Yang against the P'o), shadow soul (Hun against
 * the P'o). Extended over up to five turns, both at 6; the first to two successes wins; ravenous lowers the P'o's need to one;
 * a Yin imbalance raises it for fire soul, a Yang imbalance lowers it.
 */
export const NATURES = {
    fire: { label: "fire soul", resist: "yin", fails: "frenzy, as the Kindred know it", triggers: ["failure before others", "humiliation", "hunger", "insult", "intense passion", "a threat to the wu"] },
    wave: { label: "wave soul", resist: "yang", fails: "terror, as Rötschreck", triggers: ["fire", "sunlight", "a mighty demon, a Yama King"] },
    shadow: { label: "shadow soul", resist: "hun", fails: "the P'o's Archetype takes the body for a scene", triggers: ["breaking the Dharma or honor", "a botched Willpower roll", "coming out of fire or wave soul", "a Demon Art gone wrong", "great stress, trauma or shame", "the P'o Archetype's own condition"] }
};
export function natureNeed(kind, { ravenous = false, imbalance = "" } = {}) {
    let po = 2;
    if (ravenous) po = 1;
    if (kind === "fire" && imbalance === "yin") po += 1;
    if (kind === "fire" && imbalance === "yang") po = Math.max(1, po - 1);
    return { po, virtue: 2 };
}
/** One turn of the contest: add each side's successes; resolved when either reaches its need, or lapses after five turns. */
export function natureStep(state = { virtue: 0, po: 0, turn: 0 }, vSucc, pSucc, need = { po: 2, virtue: 2 }) {
    const s = { virtue: n(state.virtue) + Math.max(0, n(vSucc)), po: n(state.po) + Math.max(0, n(pSucc)), turn: n(state.turn) + 1 };
    if (s.po >= need.po && s.po >= s.virtue) return { ...s, done: true, result: "lapses" };
    if (s.virtue >= need.virtue) return { ...s, done: true, result: "resists" };
    if (s.turn >= 5) return { ...s, done: true, result: "passes" };
    return { ...s, done: false };
}

/**
 * Demon Chi (p. 91): as many points as the permanent P'o; evoking it for a scene is P'o against Hun + 3 (most 10): one success
 * opens it, four or more bring fire soul too. At most Stamina points a turn; spent until the next evening, when P'o at 6 returns a
 * point a success. Each point: an extra action, or an automatic damage or Strength success. Fangs 1, a fanged maw (Str + 2 aggravated) 2.
 */
export const demonDiff = hun => clamp(n(hun) + 3, 2, 10);
export function demonEvoke(r) {
    if (r.botch) return { open: false, fire: false, text: "the Demon will not answer" };
    if (!r.successes) return { open: false, fire: false, text: "nothing stirs" };
    return { open: true, fire: r.successes >= 4, text: r.successes >= 4 ? "Demon Chi flows, and the fire soul with it" : "Demon Chi flows for the scene" };
}
export const demonRefresh = (current, po, successes) => Math.min(n(po), n(current) + Math.max(0, n(successes)));

/** Each evening (p. 139): a point of Chi to rise. Yin: no more for ten nights, the pallor of the dead (+1 Social difficulty with mortals); Yang: each night. */
export function awaken({ yinChi = 0, yangChi = 0, permImb = "" } = {}, aspect = "yang") {
    const a = permImb === "yin" ? "yin" : aspect;
    if (a === "yin" && n(yinChi) > 0) return { aspect: "yin", yinChi: n(yinChi) - 1, yangChi: n(yangChi), nights: permImb === "yin" ? 1 : 10, socialPenalty: 1 };
    if (a === "yang" && n(yangChi) > 0) return { aspect: "yang", yinChi: n(yinChi), yangChi: n(yangChi) - 1, nights: 1, socialPenalty: 0 };
    if (n(yinChi) + n(yangChi) === 0) return { aspect: "", yinChi: 0, yangChi: 0, nights: 1, rot: 1 };
    return awaken({ yinChi, yangChi, permImb }, a === "yin" ? "yang" : "yin");
}

/**
 * Sunlight (p. 151): (Stamina − temporary Yin) minutes in a day, nine at most, before the rot; a Yang imbalance bears indirect sun
 * an hour and direct sun Stamina × 5 minutes. Each turn of rot: a Health Level (healed as aggravated), −1 to each Physical Attribute,
 * −1 Appearance, −1 temporary Yin. No Yin can be spent in the sun; each Yang point spent ignores a turn.
 */
export function sunGrace({ stamina = 1, yinChi = 0, yangImbalanced = false, direct = true } = {}) {
    if (yangImbalanced) return direct ? n(stamina) * 5 : 60;
    return clamp(n(stamina) - n(yinChi), 0, 9);
}
export function sunTurn(state = {}, { yangSpent = false } = {}) {
    if (yangSpent) return { ...state, ignored: true };
    return { ...state, health: 1, physical: -1, appearance: -1, yinChi: Math.max(0, n(state.yinChi) - 1) };
}

/** Healing (p. 145): as the Kindred, Chi for blood: a point a level; aggravated, five points and a day's rest (as V20). */
export const healCost = type => (type === "aggravated" ? 5 : 1);
/** Slumber (p. 151): the higher of Hun and Dharma stands for Humanity to stay awake by day. */
export const slumberPool = (hun, dharma) => Math.max(n(hun), n(dharma));
/** Willpower (p. 91): starts equal to Hun; at most Hun + 5 (10). */
export const willpowerMax = hun => Math.min(10, n(hun) + 5);
/** Horoscope (p. 86): roll the dots; each die on the Dharma's or the direction's lucky number is an automatic success next turn. */
export const horoscopeHits = (faces, dharma, direction) => faces.filter(f => f % 10 === DHARMAS[dharma]?.lucky || f % 10 === (DIRECTION_LUCKY[direction] ?? -1)).length;

/** The four kinds of Discipline (p. 100) and the Chi each burns by default; a Demon Art is harnessed with Hun against the P'o (p. 90). */
export const ARTS = {
    equilibrium: { kind: "chi", chi: "either" }, tapestry: { kind: "chi", chi: "either" }, yinprana: { kind: "chi", chi: "yin" }, yangprana: { kind: "chi", chi: "yang" },
    boneshintai: { kind: "shintai", chi: "yin" }, fleshshintai: { kind: "shintai", chi: "yang" }, bloodshintai: { kind: "shintai", chi: "either" },
    jadeshintai: { kind: "shintai", chi: "either" }, ghostflameshintai: { kind: "shintai", chi: "either" },
    blackwind: { kind: "demon", chi: "demon" }, obligation: { kind: "demon", chi: "demon" }, demonshintai: { kind: "demon", chi: "demon" }
};
export const artOf = name => ARTS[String(name ?? "").toLowerCase().replace(/[^a-z]/g, "")] ?? null;
/** Spending (p. 139): the Dharma's Chi a turn, one kind a turn (Equilibrium excepted); three or more show as an aura. */
export function spendPlan({ dharma = 0, yinChi = 0, yangChi = 0, demonChi = 0, stamina = 1 } = {}, kind = "yang", amount = 1, { equilibrium = false } = {}) {
    const k = n(amount);
    const cap = kind === "demon" ? n(stamina) : chiPerTurn(dharma);
    const have = kind === "yin" ? n(yinChi) : kind === "yang" ? n(yangChi) : n(demonChi);
    if (k > have) return { ok: false, why: `only ${have} ${kind === "demon" ? "Demon Chi" : `${kind === "yin" ? "Yin" : "Yang"} Chi`} in the body` };
    if (k > cap) return { ok: false, why: kind === "demon" ? `Demon Chi is limited to Stamina (${cap}) a turn` : `Dharma ${n(dharma)} allows ${cap} Chi a turn` };
    return { ok: true, aura: k >= 3, note: equilibrium ? "Equilibrium lets both kinds flow in one turn" : "" };
}
/** Experience (p. 142). Dharma is not bought: it rises and falls by Dharma rolls. */
export function xpCost(trait, current = 0, { martialArts = false, imbalancedToward = false } = {}) {
    const c = n(current);
    switch (trait) {
        case "attribute": return c * 4;
        case "ability": return c ? c * (martialArts ? 3 : 2) : 3;
        case "discipline": return c ? c * 8 : 10;
        case "virtue": return c * (imbalancedToward ? 2 : 3);   // Yin, Yang, Hun
        case "po": return c;
        case "willpower": return c;
        default: return 0;
    }
}
/** Character creation (p. 78): 7/5/3, 13/9/5 (3 at most), Disciplines 3 (one a Demon Art), Backgrounds 5, Chi Virtues 4, Hun 1, P'o 3, Dharma 1. */
export const STARTING = { attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, disciplines: 3, demonArts: 1, backgrounds: 5, chiVirtues: 4, hun: 1, po: 3, dharma: 1, willpowerMin: 5, freebies: 15 };
