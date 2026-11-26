/**
 * WoDX Actions (B7832): the Stains of Orpheus (pp. 194-199), the marks Spite leaves on a spook's gauze, and calling
 * one up at will. Short summaries in our own words with the page. Pure: no Foundry calls.
 *
 *   Calling a Stain up   a spook with Spite 4 or more taps Spite points; the Stain shows for one turn a point. Each
 *                        point tapped rolls one die at difficulty 7: a failure adds a Spite point, a botch two. Spite
 *                        ratings cannot be tapped for it (p. 195).
 *   Each Stain           label, page, look (what shows), gain and cost (the advantage and the drawback, in short), and
 *                        fx: what goes on the effects card while it lasts (a Ward, a Boost on its rolls, a Blessing or
 *                        a Curse on some rolls, night sight, harm to whoever strikes it) and weapon: a natural weapon
 *                        on the sheet while it lasts. A Stain with neither is the Storyteller's to run from the card.
 * House readings (B7832): "one die of lethal" from Bristling Hide is one lethal level, soaked as usual; Carapace's soak
 * die from behind, Man-o'-War's halved bashing and Withered's extra bashing dice stay on the card, since no roll knows
 * which way a blow came from or halves it; Dagger Tongue is a thrown-range Brawl attack.
 */
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";

const n = v => Number(v) || 0;

export const REF = "Orpheus";
export const TAP_DIFF = 7;
export const MIN_SPITE = 4;

/** fx helpers: the out a power-mods.js reader finds (ward: armour dice; boost: dice on tagged rolls; fortune: difficulty on tagged rolls). */
const ward = dice => ({ key: "ward", dice });
const boost = (dice, tags) => ({ key: "boost", dice, on: "tags", tags });
const shift = (by, tags) => ({ key: "fortune", shift: by, once: false, tags });

export const STAINS = {
    addersscales: { label: "Adder's Scales", page: "p. 195", look: "skin of green-gold or black snake scales",
        gain: "one easier to slip bonds or make an agile move; one extra soak die", cost: "one harder on everything in freezing cold or great heat",
        fx: [ward(1), shift(-1, ["athletics"])] },
    batears: { label: "Bat Ears", page: "p. 195", look: "tall black bat's ears",
        gain: "sees by echo in the dark, even what hides or has no body", cost: "the other senses dull: two harder on Perception not by echo",
        fx: [{ key: "sight", vision: true }, shift(2, ["sight"])] },
    bristlinghide: { label: "Bristling Hide", page: "p. 195", look: "a rough hide of barbed bristles",
        gain: "one die of armour; a bare-handed blow on it takes a lethal level back", cost: "the crucible risk a lethal level brushing against it each day",
        fx: [{ ...ward(1), touch: { levels: 1, type: "lethal" } }] },
    carapace: { label: "Carapace", page: "p. 195", look: "a beetle's shell down the back, wings beneath",
        gain: "an extra soak die against blows from behind; short winged hops of twice Strength in metres", cost: "bulky: one harder on Dexterity rolls",
        fx: [shift(1, ["dexterity"])] },
    chameleonskin: { label: "Chameleon Skin", page: "pp. 195-196", look: "gauze that takes the colour of whatever is behind it",
        gain: "three extra dice on Stealth", cost: "no say over it; Social pools are halved among other spooks",
        fx: [boost(3, ["stealth"])] },
    claws: { label: "Claws", page: "p. 196", look: "talons or bone blades for hands",
        gain: "claws for Strength + 2 lethal", cost: "two harder on fine work (a lock, a repair)",
        weapon: { name: "Claws (Stain)", bonus: 2, type: "lethal" } },
    compoundeye: { label: "Compound Eye", page: "p. 196", look: "a fly's red domed eyes",
        gain: "sees above and behind", cost: "no far sight: two harder on ranged attacks",
        fx: [shift(2, ["firearms", "archery", "ranged", "thrown"])] },
    daggertongue: { label: "Dagger Tongue", page: "p. 196", look: "a blade of a tongue that lashes out seven feet",
        gain: "a reaching Brawl attack for Strength + 1 lethal", cost: "cannot speak without spite unless a Willpower roll (7) holds it back for the scene",
        weapon: { name: "Dagger Tongue (Stain)", bonus: 1, type: "lethal", reach: true } },
    gauzequills: { label: "Gauze Quills", page: "pp. 196-197", look: "razor quills over arms and face",
        gain: "one easier on Perception; nothing blinds it within 30 feet", cost: "a sixth sense that confuses: one harder on Wits rolls",
        fx: [shift(-1, ["perception"]), shift(1, ["wits"])] },
    gossamerwebs: { label: "Gossamer Webs", page: "p. 197", look: "sticky gauze shed in web-thin sheets",
        gain: "a Brawl hit leaves webbing, two Strength of hold per Vitality spent, on the eyes, the legs or an arm", cost: "loses Vitality passing through large things" },
    hawksbeak: { label: "Hawk's Beak", page: "p. 197", look: "a hard hooked beak for a face",
        gain: "a bite for Strength + 1 lethal", cost: "no lips: speech fails unless a Willpower roll (7) holds for the scene",
        weapon: { name: "Hawk's Beak (Stain)", bonus: 1, type: "lethal" } },
    leper: { label: "Leper", page: "pp. 197-198", look: "gauze dropping away in leprous chunks",
        gain: "a dropped piece sees, hears and speaks for the spook for a day, wherever it is", cost: "a new part falls each day: two dice off a pair of Attributes" },
    manowar: { label: "Man-o'-War", page: "p. 198", look: "a vast jellyfish's body",
        gain: "half damage from bashing, rounded down", cost: "one harder on Dexterity rolls",
        fx: [shift(1, ["dexterity"])] },
    martyred: { label: "Martyred", page: "p. 198", look: "every old wound open and bleeding",
        gain: "a touch hands the last wound it took to the one touched", cost: "a botch while it shows makes it live that wound again" },
    pseudopods: { label: "Pseudopods", page: "p. 198", look: "putty-like limbs that stretch ten feet",
        gain: "fights and handles simple things at ten feet", cost: "a Willpower roll (7) each scene or a limb acts on its own, two harder or two dice off" },
    sharksappetite: { label: "Shark's Appetite", page: "p. 198", look: "a maw of jagged teeth, rows deep",
        gain: "a clinch bites for Strength + 2 lethal each turn held; chews artefacts (Strength + Spite, 7)", cost: "a Vitality point each scene it does not feed" },
    shiftingidentity: { label: "Shifting Identity", page: "pp. 198-199", look: "a face that drifts toward someone else's",
        gain: "moves a dot among Charisma, Manipulation and Appearance for the scene", cost: "two harder on Social rolls with spooks who knew the old face" },
    skeletalform: { label: "Skeletal Form", page: "p. 199", look: "a walking skeleton",
        gain: "frightens onlookers, the living sensitive too (Manipulation + Intimidation against their Willpower)", cost: "Social rolls fail or go at the hardest" },
    spidersbristles: { label: "Spider's Bristles", page: "p. 199", look: "wiry bristles on hands, arms and legs",
        gain: "climbs walls like a spider, unless carrying another spook", cost: "fine work needs a Willpower roll (7), or its pools are halved" },
    withered: { label: "Withered", page: "p. 199", look: "dry as months dead, whatever its Vitality",
        gain: "shows as a ghost with no Vitality: spends any amount in a turn unseen by Spectres and spooks out of sight", cost: "two extra dice on bashing blows against it" }
};

/** The Stain a name points to ("Claws", "Hawk's Beak (Stain)"), or "". */
export const stainOf = v => {
    const s = String(v ?? "").toLowerCase().replace(/[^a-z]/g, "");
    return Object.keys(STAINS).find(k => s.includes(k)) ?? Object.keys(STAINS).find(k => s.includes(STAINS[k].label.toLowerCase().replace(/[^a-z]/g, ""))) ?? "";
};

/** Can this spook call a Stain up now? Spite rating 4 or more, and points to tap. */
export function canCall(spite = {}, points = 1) {
    if (n(spite.rating) < MIN_SPITE) return { ok: false, why: `Stains are called up at will from Spite ${MIN_SPITE}` };
    if (n(points) < 1) return { ok: false, why: "tap at least one Spite point" };
    return { ok: true };
}

/**
 * The tap: one die a point at difficulty 7 (p. 195). dice: the faces rolled. Returns {turns, failed, botched, spite}:
 * the turns it shows, and the Spite points it adds.
 */
export function tapResult(dice = []) {
    const faces = dice.map(n);
    // each die alone: a one is a botch (two points), any other miss one point
    const { raw, ones: botched } = TERMS.successes(faces, TAP_DIFF, { onesCancel: false });
    const failed = faces.length - raw - botched;
    return { turns: faces.length, failed, botched, spite: failed + 2 * botched };
}

/** The effects-card items while a Stain shows for `turns` turns. */
export function stainResults(key, turns, { name = "", source = "" } = {}) {
    const s = STAINS[key];
    if (!s || n(turns) < 1) return [];
    const timed = { kind: "rounds", rounds: n(turns) }, duration = `${n(turns)} turn${n(turns) === 1 ? "" : "s"}`;
    const base = { key, label: name || s.label, source: source || `${REF} ${s.page}` };
    return (s.fx ?? []).map(f => ({ key: f.key, who: "self", out: { ...base, ...f, kind: "timed", name: s.label, timed, duration, text: `${s.gain} (${duration})` } }));
}

/** A Stain's natural weapon, as Weapon item data for the sheet while it shows, or null. */
export function stainWeapon(key) {
    const w = STAINS[key]?.weapon;
    if (!w) return null;
    return { name: w.name, type: w.reach ? "Ranged Weapon" : "Melee Weapon", img: "icons/svg/claw.svg",
        system: { difficulty: 6, damage: { attribute: "strength", bonus: w.bonus, type: w.type, isrollable: true },
            attack: { attribute: "dexterity", ability: "brawl", accuracy: 0, isrollable: true }, description: `<p>${STAINS[key].gain}. ${REF} ${STAINS[key].page}.</p>` },
        flags: { "wodx-library": { implant: true }, "wodx-actions": { stainWeapon: key } } };
}

/** Does calling this Stain change anything a roll or the map reads, or is it the Storyteller's from the card? */
export const applies = key => !!(STAINS[key]?.fx?.length || STAINS[key]?.weapon);
