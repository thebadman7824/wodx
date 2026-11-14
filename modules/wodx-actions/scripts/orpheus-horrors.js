/**
 * WoDX Actions: what each Orpheus Horror does at each level of Vitality put in (Orpheus pp. 99-115), as short
 * summaries with the page. Each: page, the usual pool (attribute and ability keys), difficulty ("t" for the target's
 * Willpower), how long it runs, one line per Vitality level (0 to 5), and results(): the effects-card items for a use.
 * Pure: no Foundry calls.
 */
const n = v => Number(v) || 0;
const turns = k => ({ label: `${k + 1} turn${k ? "s" : ""}`, timed: { kind: "rounds", rounds: k + 1 } });
const scene = () => ({ label: "the scene", timed: { kind: "scene" } });

export const HORROR_FX = {
    wail: {
        page: "pp. 99-101", attr: "manipulation", ability: "empathy", diff: "t", lasts: turns,
        levels: [
            "A soft croon soothes or needles one listener: −1 die to Physical (soothed) or Mental and Social (needled) pools.",
            "Calms or riles up to five people; at most three successes count.",
            "Terror that sends people fleeing, or a shriek that wounds everyone within ten yards in front; at most five successes count.",
            "The scream ignores armour of 1 and wounds with lethal damage.",
            "Tears apart wood (difficulty 4), stone (6) or steel (8), a cubic foot per success, or wounds living targets through armour of 2.",
            "As four Vitality, through armour of 3."
        ],
        results(k, s, base) {
            if (k < 2) return [{ key: "sway", who: k ? "each" : "one", out: { ...base, kind: "timed", name: "Wail", timed: turns(k).timed, duration: turns(k).label,
                successes: Math.min(s, 2 * k + 1), text: `−${Math.min(s, 2 * k + 1)} dice from the soothed or needled pools for ${turns(k).label}` } }];
            return [{ key: "harm", who: "each", ask: true, out: { ...base, kind: "damage", levels: s, type: "lethal", soak: true, text: `${s} lethal level${s === 1 ? "" : "s"} to each in front within ten yards (armour up to ${Math.max(0, k - 2)} ignored)` } }];
        }
    },
    forebode: {
        page: "pp. 101-102", attr: "perception", ability: "empathy", diff: 6, lasts: turns,
        levels: ["Sees up to an hour into the past or future of this place, for one turn.", "Up to a day either way, for two turns.", "Up to a week either way, for three turns.",
            "Up to a month either way, for four turns.", "Up to a year either way, for five turns.", "Up to ten years either way, for six turns."],
        results(k, s, base) { return [{ key: "know", who: "self", out: { ...base, kind: "note", text: `${s} success${s === 1 ? "" : "es"}: the clearer the vision (${["an hour", "a day", "a week", "a month", "a year", "ten years"][k]} either way)` } }]; }
    },
    inhabit: {
        page: "pp. 103-104", attr: "", ability: "", diff: 6, lasts: scene,
        levels: ["Enters a small hand-held thing such as a phone or a pistol.", "Anything up to two feet across, such as a microwave or computer.", "Anything about human size, from a motorbike to a bookcase.",
            "Anything up to a large car or a generator.", "A tank or a small house.", "A mansion or an airliner."],
        results(k, s, base) { return [{ key: "possess", who: "self", out: { ...base, kind: "note", text: `Inside and working a thing up to ${["hand size", "two feet across", "human size", "car size", "house size", "airliner size"][k]}; another spook takes it only with a resisted Willpower roll` } }]; }
    },
    witchsnimbus: {
        page: "pp. 104-105", attr: "dexterity", ability: "athletics", diff: 6, lasts: scene,
        levels: ["A candle-sized flame or spark: light to read by or set things alight.", "A sheath of fire or sparks: a lethal level to whatever touches it, +1 lethal on blows; Stealth +1 difficulty.",
            "Two lethal levels on contact; Stealth +2 difficulty.", "Three lethal levels by touch, all close blows lethal, and a bolt to ten yards every other turn (Dexterity + Athletics).",
            "Four levels by touch, a bolt every turn; Stealth +4 difficulty and attacks aimed by sight +1 difficulty.", "Two lethal levels to all within ten feet, five by touch, two bolts a turn; it melts steel; attacks aimed by sight +2 difficulty."],
        results(k, s, base) {
            const out = [{ key: "light", who: "self", out: { ...base, kind: "timed", name: "Witch's Nimbus", timed: { kind: "scene" }, duration: "the scene", successes: k, text: `A burning or crackling aura at ${k} Vitality for the scene` } }];
            if (k >= 3 && s > 0) out.push({ key: "harm", who: "one", ask: true, out: { ...base, kind: "damage", levels: k + s - 1, type: "lethal", soak: true, text: `A bolt: ${k + s - 1} lethal levels, soaked as usual` } });
            return out;
        }
    },
    helterskelter: {
        page: "pp. 105-107", attr: "dexterity", ability: "melee", diff: 6, lasts: turns,
        levels: ["Moves things within 30 yards with one die each of Strength and Dexterity, for one turn.", "Adds a die of Strength or Dexterity, for two turns.", "Adds two, for three turns.",
            "Adds three, for four turns.", "Adds four, for five turns.", "Adds five, for six turns."],
        results(k, s, base) {
            const str = 1 + k;
            return [{ key: "harm", who: "one", ask: true, out: { ...base, kind: "damage", pool: str + Math.max(0, s - 1), levels: str + Math.max(0, s - 1), type: "bashing", soak: true,
                text: `A thrown object: ${str + Math.max(0, s - 1)} damage dice (lethal for blades), hurled up to ${str * 5} yards` } }];
        }
    },
    congeal: {
        page: "pp. 107-109", attr: "manipulation", ability: "melee", diff: 7, lasts: scene,
        levels: ["Hardened hands: Strength + 1 bashing.", "A small tool or weapon (knife, club, lockpick): Strength + 1 lethal or + 2 bashing.", "A medium weapon or darts and arrows: Strength + 2 lethal or + 3 bashing.",
            "A large weapon or a pistol: Strength + 3 lethal, + 4 bashing or a five-die gun.", "A rifle, shotgun or warhammer: Strength + 4 lethal or an eight-die gun with bursts.", "An assault rifle or great sword: Strength + 5 lethal or eight dice on full auto."],
        results(k, s, base) { return [{ key: "make", who: "self", out: { ...base, kind: "timed", name: "Congealed weapon", timed: { kind: "scene" }, duration: "the scene", successes: k,
            text: `A weapon of gauze for the scene: Strength + ${Math.max(1, k)} ${k ? "lethal" : "bashing"}; range ${k * 5} yards when fired or thrown` } }]; }
    },
    puppetry: {
        page: "pp. 109-111", attr: "charisma", ability: "leadership", diff: "t", lasts: null,
        levels: ["One brief act from someone not paying attention.", "Works one limb or rides along as a clumsy passenger (Dexterity 1).", "Full control while concentrating, clumsy (Dexterity 1).",
            "The host blacks out and the rider moves with the host's own skill.", "Deep possession: the host remembers nothing.", "Complete control; knocking the host out does not end it."],
        results(k, s, base) {
            const cap = Math.min(s, k + 1), lab = ["one turn", "one minute", "the scene", "a day", "as long as wanted"][Math.min(4, cap - 1)];
            const timed = [{ kind: "rounds", rounds: 1 }, { kind: "time", seconds: 60 }, { kind: "scene" }, { kind: "time", seconds: 86400 }, { kind: "time", seconds: 7 * 86400 }][Math.min(4, cap - 1)];
            return [{ key: "possess", who: "one", out: { ...base, kind: "timed", name: "Possessed", timed, duration: lab, text: `Possessed for ${lab}${cap >= 5 ? " (shown on the token for a week)" : ""} (${cap} success${cap === 1 ? "" : "es"} count at ${k} Vitality)` } }];
        }
    },
    juggernaut: {
        page: "pp. 111-113", attr: "", ability: "", diff: 6, lasts: turns,
        levels: ["One dot of Strength, armour or an extra action, for one turn.", "Two dots, for two turns.", "Three dots, for three turns.", "Four dots, for four turns.", "Five dots, for five turns.", "Six dots, for six turns."],
        results(k, s, base) { return [{ key: "boost", who: "self", out: { ...base, kind: "timed", name: "Juggernaut", timed: turns(k).timed, duration: turns(k).label, successes: k + 1,
            text: `${k + 1} dot${k ? "s" : ""} to split among Strength, armour and extra actions, for ${turns(k).label}` } }]; }
    },
    unearthlyrepose: {
        page: "pp. 113-114", attr: "charisma", ability: "", diff: "t", lasts: scene,
        levels: ["Those who see the glow take a step toward it.", "They follow slowly, stopping at any distraction.", "They follow, deaf to noise, stopping if touched.",
            "They follow, stopping only if struck.", "They follow and fight anyone holding them back; losing sight allows a Willpower roll.", "They follow heedless of their own safety."],
        results(k, s, base) { return [{ key: "sway", who: "each", out: { ...base, kind: "timed", name: "Entranced", timed: { kind: "scene" }, duration: "the scene",
            text: `Entranced by the glow (${k} Vitality); +${k} dice to friendly Social rolls this scene` } }]; }
    },
    stormwending: {
        page: "pp. 114-115", attr: "", ability: "", diff: 6, lasts: null,
        levels: ["A few feet: doubles Dexterity for a dodge.", "Up to ten yards.", "Up to 100 feet.", "Up to 100 yards (out of sight only to a known place).", "Anywhere within 1,000 feet already seen.", "Anywhere within half a mile already seen."],
        results(k, s, base) { return [{ key: "move", who: "self", out: { ...base, kind: "move", text: `Steps through the storm up to ${["a few feet", "10 yards", "100 feet", "100 yards", "1,000 feet", "half a mile"][k]}` } }]; }
    }
};

/** The effects-card items for a Horror used at k Vitality with s successes (s is ignored where no roll is needed). */
export function horrorResults(key, k, s, { name = "", source = "" } = {}) {
    const h = HORROR_FX[key];
    if (!h) return [];
    const kk = Math.max(0, Math.min(5, n(k)));
    const rolled = !!(h.attr || h.ability);
    const ss = rolled ? n(s) : Math.max(1, n(s));
    if (rolled && ss < 1) return [];
    return h.results(kk, ss, { key, label: name, source: source || `Orpheus ${h.page}` });
}

/** The line a card shows for a Horror at k Vitality. */
export const horrorLevel = (key, k) => HORROR_FX[key]?.levels[Math.max(0, Math.min(5, n(k)))] ?? "";
