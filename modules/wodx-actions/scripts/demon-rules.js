/**
 * WoDX Actions — Demon: The Fallen, the pure rules (Phase 6i, later eras). No Foundry here: the harness tests them.
 * Mechanics from Demon: The Fallen (the core book), in WoDX's words, with the printed page numbers.
 */

export const REF = "Demon: The Fallen";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const key = s => String(s ?? "").toLowerCase().replace(/^wod\.bio\.demon\./, "").replace(/^(the )?lore of (the )?/, "").replace(/[^a-z]/g, "");

/** The seven Houses (pp. 99–112): starting Torment and the three House lores. Keys match the system's Bio list. */
export const HOUSES = {
    devil:      { label: "Devils", celestial: "Namaru", torment: 4, lores: ["celestials", "flame", "radiance"], page: 101 },
    scourge:    { label: "Scourges", celestial: "Asharu", torment: 3, lores: ["awakening", "firmament", "winds"], page: 109 },
    malefactor: { label: "Malefactors", celestial: "Annunaki", torment: 3, lores: ["earth", "forge", "paths"], page: 107 },
    fiend:      { label: "Fiends", celestial: "Neberu", torment: 3, lores: ["light", "patterns", "portals"], page: 105 },
    defiler:    { label: "Defilers", celestial: "Lammasu", torment: 3, lores: ["longing", "storms", "transfiguration"], page: 99 },
    devourer:   { label: "Devourers", celestial: "Rabisu", torment: 4, lores: ["beast", "flesh", "wild"], page: 103 },
    slayer:     { label: "Slayers", celestial: "Halaku", torment: 4, lores: ["death", "realms", "spirit"], page: 111 }
};
const HOUSE_ALIAS = { devils: "devil", namaru: "devil", heralds: "devil", scourges: "scourge", asharu: "scourge", malefactors: "malefactor", annunaki: "malefactor",
    fiends: "fiend", neberu: "fiend", defilers: "defiler", lammasu: "defiler", devourers: "devourer", rabisu: "devourer", slayers: "slayer", halaku: "slayer", reapers: "slayer" };
export function houseOf(v) { const k = key(v); return HOUSES[k] ? k : HOUSE_ALIAS[k] ?? ""; }

/** The factions (Chapter Five); none is "unaligned". */
export const FACTIONS = { luciferan: "Luciferans", faustian: "Faustians", cryptic: "Cryptics", reconciler: "Reconcilers", ravener: "Raveners" };

const E = (name, attr, ability, faith = 0) => ({ name, attr, ability, faith });
/**
 * The lore paths (pp. 171–215): five evocations each (the traits rolled, and whether a Faith point is spent), and for the
 * House lores the apocalyptic form the path gives as the primary lore — four powers, then four high-Torment powers.
 * A pool marked null names no clear traits in the book: the dialog asks.
 */
export const LORES = {
    fundament: { label: "the Fundament", house: null, page: 172, evo: [E("Manipulate Gravity", "strength", "athletics"), E("Manipulate Adhesion", "dexterity", "athletics"),
        E("Manipulate Inertia", "dexterity", "athletics"), E("Manipulate Acceleration", "dexterity", "athletics", 1), E("Manipulate Cohesion", "stamina", "science", 1)] },
    humanity: { label: "Humanity", house: null, page: 173, evo: [E("Translate", "manipulation", "empathy"), E("Insinuate", "manipulation", "empathy"), E("Fade", "manipulation", null),
        E("Confess", "manipulation", "subterfuge", 1), E("Alter Memory", "manipulation", "subterfuge", 1)] },
    celestials: { label: "the Celestials", house: "devil", page: 175, evo: [E("Lamp of Faith", "perception", "alertness"), E("Send Vision", "manipulation", "expression"),
        E("Pillar of Faith", "manipulation", "leadership"), E("The Fire of Heaven", "dexterity", "athletics", 1), E("Hand of Faith", "manipulation", "leadership", 1)],
        visage: "Bel", form: ["Wings", "Lordly Mien", "Enhanced Senses", "Increased Awareness"], high: ["Claws/Teeth", "Scales", "Increased Size", "Dread Gaze"], formPage: 176 },
    flame: { label: "Flame", house: "devil", page: 176, evo: [E("Fuel", "stamina", "survival"), E("Ignite", "stamina", "survival"), E("Command the Flame", "wits", "survival"),
        E("Holocaust", "stamina", "survival", 1), E("Ride the Flames", "stamina", "survival", 1)],
        visage: "Nusku", form: ["Shroud of Flames", "Immunity to Fire", "Extra Actions", "Improved Initiative"], high: ["Claws/Teeth", "Lashing Tail", "Increased Size", "Fiery Blood"], formPage: 178 },
    radiance: { label: "Radiance", house: "devil", page: 179, evo: [E("Voice of Heaven", "manipulation", "leadership"), E("Exalt", "manipulation", "leadership"),
        E("Aura of Legend", "manipulation", "leadership"), E("The Mark of the Celestials", "manipulation", "expression", 1), E("Revelation", "perception", "intuition", 1)],
        visage: "Qingu", form: ["Wings", "Inhuman Allure", "Radiant Aura", "Sense the Hidden"], high: ["Voice of the Damned", "Casts No Reflection", "Corrosive Spit", "Horns"], formPage: 180 },
    awakening: { label: "Awakening", house: "scourge", page: 181, evo: [E("Find the Faithful", "perception", "awareness"), E("Cleanse", "stamina", "medicine"),
        E("Heal", "stamina", "medicine"), E("Animate", "intelligence", "craft", 1), E("Restore Life", "stamina", "medicine", 1)],
        visage: "Dagan", form: ["Aura of Vitality", "Pass Without Trace", "Improved Physical Capabilities", "Wings"], high: ["Miasma", "Extra Health Levels", "Viscous Flesh", "Extra Limbs"], formPage: 182 },
    firmament: { label: "the Firmament", house: "scourge", page: 182, evo: [E("Remote Viewing", "perception", "empathy"), E("Scry", "perception", "empathy"),
        E("Mouth of the Damned", "manipulation", "leadership"), E("Touch from Afar", "manipulation", "awareness", 1), E("Many Places at Once", "manipulation", "leadership", 1)],
        visage: "Anshar", form: ["Enhanced Senses", "Wings", "Enhanced Intuition", "Enhanced Dodge"], high: ["Cloak of Shadows", "Multiple Eyes", "Improved Initiative", "Claws"], formPage: 184 },
    winds: { label: "the Winds", house: "scourge", page: 184, evo: [E("Summon Wind", "stamina", "survival"), E("Fist of Air", "stamina", "survival"),
        E("Command the Wind", "dexterity", "survival"), E("Wall of Air", "stamina", "survival", 1), E("Cyclone", "stamina", "survival", 1)],
        visage: "Ellil", form: ["Supernatural Vision", "Wings", "Perfect Balance", "Immune to Falling Damage"], high: ["Claws", "Extra Actions", "Quills", "Caustic Bile"], formPage: 185 },
    earth: { label: "the Earth", house: "malefactor", page: 186, evo: [E("Earth Meld", "strength", "survival"), E("Roil the Earth", "strength", "survival"),
        E("Mold Earth", "strength", "craft"), E("Earth Storm", "strength", "survival", 1), E("Earthquake", "strength", "survival", 1)],
        visage: "Kishar", form: ["Increased Size", "Immune to Bashing Damage", "Irresistible Force", "Night Vision"], high: ["Extra Limbs", "Gaping Maw", "Spikes", "Ichor"], formPage: 188 },
    paths: { label: "Paths", house: "malefactor", page: 188, evo: [E("Find Path", "perception", "survival"), E("Lay Path", "dexterity", "survival"),
        E("Conceal Path", "perception", "survival"), E("Close Path", "dexterity", "survival", 1), E("Warp Path", "dexterity", "survival", 1)],
        visage: "Antu", form: ["Dead Reckoning", "Enhanced Perception", "Improved Initiative", "Flashing Fingers"], high: ["Pass Without Trace", "Alter Size", "Mirage", "Relentless"], formPage: 189 },
    forge: { label: "the Forge", house: "malefactor", page: 190, evo: [E("Enhance Object", "perception", "craft"), E("Activate Object", "intelligence", "craft"),
        E("Shape Object", "dexterity", "craft"), E("Enchant Object", "intelligence", null), E("Imbue Object", "stamina", "craft")],
        visage: "Mummu", form: ["Master Artisan", "Increased Size", "Thunderous Voice", "Immune to Fire"], high: ["Blades", "Extra Limbs", "Magnetic Field", "Iron Skin"], formPage: 192 },
    patterns: { label: "Patterns", house: "fiend", page: 192, evo: [E("Sense Congruence", "perception", "intuition"), E("Trace Pattern", "perception", "intuition"),
        E("Foresee", "wits", "intuition"), E("Causal Influence", "perception", "intuition", 1), E("Twist Time", "stamina", "intuition", 1)],
        visage: "Ninsun", form: ["Wings", "Improved Initiative", "Enhanced Intuition", "Enhanced Mental Acuity"], high: ["Aura of Misfortune", "Extra Actions", "Extra Limbs", "Sibilant Whispers"], formPage: 194 },
    portals: { label: "Portals", house: "fiend", page: 194, evo: [E("Open/Close Portals", "manipulation", "intuition"), E("Create Ward", "charisma", "intuition"),
        E("Teleport", "intelligence", "intuition"), E("Co-locate", "stamina", "intuition", 1), E("Doorway into Darkness", "stamina", "awareness", 1)],
        visage: "Nedu", form: ["Pass Without Trace", "Enhanced Perception", "Increased Awareness", "Wings"], high: ["Cloak of Shadows", "Improved Initiative", "Enhanced Dodge", "Casts No Reflection"], formPage: 195 },
    light: { label: "Light", house: "fiend", page: 196, evo: [E("Light", "stamina", "science"), E("Bend Light", "stamina", "science"),
        E("Phantasm", "intelligence", "performance"), E("Illusion", "intelligence", "expression", 1), E("Coherent Light", "intelligence", "expression", 1)],
        visage: "Shamash", form: ["Enhanced Mental Acuity", "Night Sight", "Chimerical Aura", "Unearthly Glamour"], high: ["Hypnotic Visions", "Dread Mien", "Chimerical Attack", "Casts No Reflection"], formPage: 198 },
    longing: { label: "Longing", house: "defiler", page: 198, evo: [E("Read Emotion", "perception", "empathy"), E("Empathetic Response", "manipulation", "empathy"),
        E("Manipulate Senses", "intelligence", "intuition"), E("Obsession", "manipulation", "empathy", 1), E("Inspire", "intelligence", "medicine", 1)],
        visage: "Ishhara", form: ["Enhanced Social Traits", "Lyrical Voice", "Enhanced Senses", "Enhanced Intuition"], high: ["Claws", "Venom", "Extra Limbs", "Casts No Reflection"], formPage: 200 },
    storms: { label: "Storms", house: "defiler", page: 200, evo: [E("Summon Water", "stamina", "survival"), E("Water Form", "stamina", "medicine"),
        E("Manipulate Weather", "intelligence", "science"), E("Command the Storm", "intelligence", "science", 1), E("Invoke the Storm", "stamina", "survival", 1)],
        visage: "Adad", form: ["Weather Sense", "Immune to Electricity", "Improved Initiative", "Shocking Touch"], high: ["Teeth", "Spines", "Shark Hide", "Ink Cloud"], formPage: 202 },
    transfiguration: { label: "Transfiguration", house: "defiler", page: 202, evo: [E("Mimic", "manipulation", "performance"), E("Alter Appearance", "charisma", "subterfuge"),
        E("Alter Shape", "charisma", "subterfuge"), E("Doppelganger", "manipulation", "empathy", 1), E("Shapechange", "intelligence", "medicine", 1)],
        visage: "Mammetum", form: ["Enhanced Empathy", "Casts No Reflection", "Pass Without Trace", "Improved Dexterity"], high: ["Claws/Teeth", "Improved Initiative", "Venom", "Extra Actions"], formPage: 203 },
    beast: { label: "the Beast", house: "devourer", page: 204, evo: [E("Summon Animals", "perception", "animalken"), E("Command Animals", "manipulation", "animalken"),
        E("Possess Animals", "intelligence", "animalken"), E("Animal Form", "stamina", "animalken", 1), E("Create Chimera", "intelligence", "animalken", 1)],
        visage: "Zaltu", form: ["Increased Size", "Enhanced Senses", "Claws/Teeth", "Extra Actions"], high: ["Thick Hide", "Gaping Maw", "Extra Limbs", "Chameleon Skin"], formPage: 205 },
    wild: { label: "the Wild", house: "devourer", page: 206, evo: [E("Wilderness Sense", "perception", "survival"), E("Quicken Growth", "stamina", "survival"),
        E("Command the Wild", "intelligence", "survival"), E("Possess Plant", "stamina", "survival", 1), E("Mutate Plant", "intelligence", "survival", 1)],
        visage: "Ninurtu", form: ["Enhanced Senses", "Chameleon Skin", "Pass Without Trace", "Extra Health Levels"], high: ["Thorns", "Increased Size", "Extra Limbs", "Venom"], formPage: 207 },
    flesh: { label: "the Flesh", house: "devourer", page: 207, evo: [E("Body Control", "intelligence", "medicine"), E("Manipulate Nerves", "intelligence", "medicine"),
        E("Manipulate Flesh", "intelligence", "medicine"), E("Restore Flesh", "perception", "medicine", 1), E("Shape Flesh", "dexterity", "medicine", 1)],
        visage: "Aruru", form: ["Enhanced Social Traits", "Immune to Poisons", "Improved Initiative", "Casts No Reflection"], high: ["Extra Health Levels", "Armor", "Gaping Maw", "Regeneration"], formPage: 209 },
    death: { label: "Death", house: "slayer", page: 209, evo: [E("Read Fate", "perception", "awareness"), E("Decay", "stamina", "medicine"),
        E("Vision of Mortality", "manipulation", "intuition"), E("Extinguish Life", "strength", "awareness", 1), E("Unlife", "stamina", "medicine", 1)],
        visage: "Namtar", form: ["Wings", "Improved Initiative", "Pass Without Trace", "Casts No Reflection"], high: ["Cloak of Shadows", "Deathgrip", "Aura of Entropy", "Damage Resistance"], formPage: 211 },
    spirit: { label: "the Spirit", house: "slayer", page: 211, evo: [E("Speak with the Dead", "manipulation", "awareness"), E("Summon the Dead", "manipulation", "leadership"),
        E("Command the Dead", "manipulation", "leadership"), E("Anchor the Soul", "stamina", "awareness", 1), E("Restore the Dead", "stamina", "awareness", 1)],
        visage: "Nergal", form: ["Ghost Sight", "Enhanced Social Traits", "Pass Without Trace", "Wings"], high: ["Cloak of Shadows", "Howl of the Damned", "Aura of Dread", "Damage Resistance"], formPage: 213 },
    realms: { label: "the Realms", house: "slayer", page: 213, evo: [E("Sense the Barrier", "perception", "awareness"), E("Step Beyond the Veil", "dexterity", "awareness"),
        E("Ghostwalk", "stamina", "awareness"), E("Reach Across the Barrier", "dexterity", "awareness", 1), E("Pierce the Barrier", "stamina", "awareness", 1)],
        visage: "Ereshkigal", form: ["Dead Reckoning", "Pass Without Trace", "Increased Awareness", "Conjure from Nothing"], high: ["Cloak of Shadows", "Relentless", "Voice of the Grave", "Dread Gaze"], formPage: 215 }
};
const LORE_ALIAS = { awakenings: "awakening", celestial: "celestials", flames: "flame", wind: "winds", storm: "storms", pattern: "patterns", portal: "portals",
    path: "paths", realm: "realms", beasts: "beast", spirits: "spirit", dead: "spirit", flesh: "flesh" };
export function loreOf(v) { const k = key(v); return LORES[k] ? k : LORE_ALIAS[k] ?? ""; }
/** The lore paths a House may start with: its three and the two common paths (p. 170). */
export const startingLores = house => [...(HOUSES[house]?.lores ?? []), "fundament", "humanity"];
/** A visage is named for the primary lore (p. 170). */
export const visageOf = lore => LORES[lore]?.visage ? `${LORES[lore].visage}, the Visage of ${LORES[lore].label.replace(/^the /, "")}` : "";

/** Every evocation a character can perform, from {lore: rating} (p. 171: a rating opens that level and the ones below). */
export function evocationsKnown(lores = {}) {
    const out = [];
    for (const [k, r] of Object.entries(lores)) {
        const L = LORES[k]; if (!L) continue;
        L.evo.slice(0, clamp(n(r), 0, 5)).forEach((e, i) => out.push({ lore: k, level: i + 1, ...e, page: L.page }));
    }
    return out;
}

/**
 * An evocation roll (pp. 171, 251–252): Attribute + Ability at 6. Faith points spent add automatic successes; ravaged thralls
 * add dice up to the permanent Faith; each success of unbelieving witnesses (Willpower at 8) adds 1 to the difficulty.
 * Faith: the evocation's own cost, plus the points spent for successes. Only one evocation a turn.
 */
export function evocationPlan({ attr = 0, ability = 0, level = 1, loreRating = 0, faithCost = 0, faithSpent = 0, ravage = 0, permFaith = 0, faithPool = 0,
    unbelievers = 0, mod = 0, active = 0 } = {}) {
    if (n(level) > n(loreRating)) return { ok: false, why: `that evocation needs the lore at ${level}` };
    const rav = clamp(n(ravage), 0, n(permFaith));
    const cost = n(faithCost) + Math.max(0, n(faithSpent));
    if (cost > n(faithPool) && !rav) return { ok: false, why: `it needs ${cost} Faith and the pool holds ${n(faithPool)}` };
    const notes = [];
    if (rav) notes.push(`+${rav} ${rav === 1 ? "die" : "dice"} ravaged from thralls`);
    if (n(ravage) > rav) notes.push(`ravaging is capped at the permanent Faith (${n(permFaith)})`);
    if (n(unbelievers)) notes.push(`+${n(unbelievers)} difficulty from unbelievers`);
    if (n(mod)) notes.push(`${n(mod) > 0 ? "+" : "−"}${Math.abs(n(mod))} the Storyteller's modifier`);
    if (n(faithSpent)) notes.push(`${n(faithSpent)} Faith for ${n(faithSpent) === 1 ? "a success" : "successes"}`);
    if (n(active) >= n(permFaith) && n(permFaith)) notes.push(`already ${n(active)} evocations running: the permanent Faith (${n(permFaith)}) is the limit`);
    return { ok: true, dice: n(attr) + n(ability) + rav, difficulty: clamp(6 + n(unbelievers) + n(mod), 2, 10), autoSuccesses: Math.max(0, n(faithSpent)), cost, ravaged: rav, notes };
}

/**
 * Whether Torment perverts an evocation (p. 161; p. 169 words it differently). rule "faces" (WoDX default, p. 161): if any die
 * that scored a success shows a number at or below the permanent Torment, the high-Torment effect occurs. rule "count" (p. 169):
 * it occurs when the successes are not more than the Torment.
 */
export function tormentBites({ faces = [], difficulty = 6, successes = 0, torment = 0, rule = "faces" } = {}) {
    if (n(successes) < 1) return false;
    if (rule === "count") return n(successes) <= n(torment);
    return faces.some(f => f >= difficulty && f <= n(torment));
}
/** The result of an evocation: none, normal, high (perverted or chosen), and what it costs (pp. 161, 169, 171). */
export function evocationOutcome(r, { torment = 0, chooseHigh = false, rule = "faces" } = {}) {
    if (r.botch) return { effect: "botch", faithLoss: 1, tormentGain: 0 };
    if (!r.successes) return { effect: "none", faithLoss: 0, tormentGain: 0 };
    if (chooseHigh) return { effect: "high", chosen: true, faithLoss: 0, tormentGain: 1 };
    return { effect: tormentBites({ ...r, torment, rule }) ? "high" : "normal", faithLoss: 0, tormentGain: 0 };
}

/**
 * The apocalyptic form (p. 170): roll the current Faith pool at 6, or spend a Faith point for the change. Botch: −1 Faith.
 * Four powers always; a high-Torment power for each permanent Torment point from 7 (the last gained goes first). One more can
 * be called up for a scene at the price of a temporary Torment point. The form lasts the scene; with it, Stamina soaks lethal.
 */
export const highSlots = torment => clamp(n(torment) - 6, 0, 4);
export function formOutcome(r, spent = false) {
    if (spent) return { ok: true, faithLoss: 1 };
    return { ok: r.successes > 0, faithLoss: r.botch ? 1 : 0 };
}
/** How mortals see the true form (pp. 162, 254): glorious, either, or nightmarish, from Torment against Willpower. */
export function visageLook(torment, willpower) {
    if (n(torment) <= n(willpower) / 2) return "glorious";
    if (n(torment) > n(willpower)) return "nightmarish";
    return "either";
}

/** Revelation (p. 253): mortals roll Perception + Awareness at 10 less the Faith used in the scene; at 0, all see. */
export const revelationDifficulty = spentInScene => Math.max(0, 10 - n(spentInScene));
/** A mortal's Revelation (p. 254): Willpower against the demon's permanent Faith. */
export function mortalReaction(r) {
    if (r.botch) return { key: "collapse", text: "collapses (faints or babbles); remembers nothing, but the aftereffects stay" };
    if (!r.successes) return { key: "rapt", text: "stands rapt; flees if threatened, and later explains it away" };
    return { key: "copes", text: ["", "acts, and remembers that something extraordinary happened", "acts, and remembers the basic details", "acts, and remembers exactly what happened"][Math.min(3, r.successes)] };
}

/** Torment points (p. 161): ten temporary points become a permanent point; permanent 10 takes the character out of play. */
export function addTorment({ perm = 0, temp = 0 } = {}, k = 1) {
    let p = n(perm), t = Math.max(0, n(temp) + n(k));
    let gained = 0;
    while (t >= 10) { t -= 10; p += 1; gained += 1; }
    p = Math.min(10, p);
    return { perm: p, temp: t, gained, lost: p >= 10 };
}
/** The Hierarchy of Sins (p. 159): the row is the permanent Torment at which the act still risks Torment. */
export const SINS = [
    [1, "Any cruel, selfish or thoughtless act; letting one happen in your presence; refusing to sacrifice for the greater good"],
    [2, "Harming any mortal creature beyond self-defense or the greater good; letting a lesser sin happen unopposed"],
    [3, "Harming a mortal (body, heart or soul) beyond self-defense or the greater good"],
    [4, "Theft or deception without just cause; breaking your sworn word"],
    [5, "Harm through carelessness or neglect; neglecting duties; betraying a trust"],
    [6, "Destroying others' works; deliberate emotional cruelty or neglect"],
    [7, "Sins of passion: killing in rage, giving in to hate or prejudice or stoking it; self-destruction"],
    [8, "Premeditated violation: planned murder, systematic ruin, long-sought revenge"],
    [9, "Casual violation: murder for no reason, thoughtless torture, near-mindless savagery"]
];
/** A sin counts while it sits at or above the character's permanent Torment row (below 10, there is no sin). */
export const sinCounts = (torment, row) => n(torment) < 10 && n(row) >= n(torment);
/** The Virtue for a sin (p. 161): Conscience for ethics, Conviction for beliefs, Courage for fear at others' cost. */
export const SIN_VIRTUE = { conscience: "own needs at the cost of ethics", conviction: "against personal beliefs", courage: "out of fear, at others' expense" };
/** A sin's Virtue roll is at 8; no Willpower and no botch; failure adds a temporary Torment point (p. 161). */
export const sinOutcome = r => (r.successes > 0 ? { torment: 0 } : { torment: 1 });
/** An act of kindness (p. 161): Virtue resisted by Torment; the Virtue winning removes a temporary point; no Willpower. */
export const kindnessOutcome = (virtueSucc, tormentSucc) => (n(virtueSucc) > n(tormentSucc) ? { torment: -1 } : { torment: 0, tie: n(virtueSucc) === n(tormentSucc) });

/** Reaping (p. 250): Willpower at 7 against the mortal's Willpower at 7; a win takes a Faith point, two if the act resonates. */
export function reapOutcome(demonSucc, mortalSucc, { resonant = false } = {}) {
    if (n(demonSucc) <= n(mortalSucc)) return { faith: 0 };
    return { faith: resonant ? 2 : 1 };
}
/** Faith potential (p. 252): 0 none, 1 weak, 2 most people, 3 the devout, 4 the fanatical, 5 a living saint. */
export const POTENTIAL = ["spiritually dead: no pact is possible", "weak belief", "most people", "a devout believer", "the fanatically devout", "a living saint"];
/** A thrall may offer up to half the potential (round up) as Faith each dawn; the rest buys the thrall's gifts (pp. 251–253). */
export const offerCap = potential => Math.ceil(clamp(n(potential), 0, 5) / 2);
export function dawnOffering(thralls = []) {
    return thralls.filter(t => !t.broken && n(t.potential) > 0).reduce((s, t) => s + clamp(n(t.offered), 0, offerCap(t.potential)), 0);
}
/** Gifts bought with a thrall's potential (p. 253). */
export const GIFTS = [
    { k: "heal", label: "Mend a chronic injury or impairment", cost: 1 },
    { k: "freebies", label: "Ten freebie points (not Backgrounds)", cost: 1 },
    { k: "innate", label: "One of the demon's innate powers (Willpower at 7 to use)", cost: 1 },
    { k: "enhancement", label: "One apocalyptic enhancement (Willpower at 6, a scene)", cost: 1 },
    { k: "evocation", label: "A lesser evocation (its level in points; Willpower at 8)", cost: "level" },
    { k: "offering", label: "A daily Faith offering (up to half the potential)", cost: "half" }
];
export function giftsCost(potential, picks = []) {
    let spent = 0;
    for (const p of picks) spent += p.k === "evocation" ? clamp(n(p.level), 1, 5) : p.k === "offering" ? Math.min(n(p.points), offerCap(potential)) : 1;
    return { spent, left: n(potential) - spent, ok: spent <= n(potential) };
}
/**
 * Ravaging thralls (p. 251): each bonus die costs a thrall a Willpower point (the evocation succeeding or not); past the thrall's
 * Willpower each die is an unsoakable lethal level; emptied Willpower brings a derangement.
 */
export function ravageThrall({ willpower = 0 } = {}, dice = 0) {
    const wpLoss = Math.min(n(willpower), n(dice));
    const lethal = Math.max(0, n(dice) - n(willpower));
    return { willpower: n(willpower) - wpLoss, wpLoss, lethal, derangement: n(dice) > 0 && n(willpower) - wpLoss <= 0 };
}

/** Faith heals (pp. 171, 248): a turn's stillness and a point heal all bashing or one lethal level; never aggravated. */
export function faithHeal(damage = {}, what = "bashing") {
    const d = { bashing: n(damage.bashing), lethal: n(damage.lethal), aggravated: n(damage.aggravated) };
    if (what === "bashing" && d.bashing) return { ok: true, damage: { ...d, bashing: 0 }, healed: d.bashing };
    if (what === "lethal" && d.lethal) return { ok: true, damage: { ...d, lethal: d.lethal - 1 }, healed: 1 };
    return { ok: false, why: what === "aggravated" ? "Faith cannot heal aggravated wounds" : `there is no ${what} damage to heal` };
}
/** Holy ground and sacred objects (pp. 254–255): Torment 4 or more burns, lethal levels equal to the potential each turn. */
export function holy(torment, potential, { ground = true } = {}) {
    if (n(torment) <= 3) return { harmed: false, why: "Torment 3 or less: the holy does not burn" };
    return { harmed: true, lethal: clamp(n(potential), 0, 5), stayRoll: ground, why: ground ? "a Willpower roll each turn to stay; failing, the demon flees" : "each turn it touches the skin" };
}
/** Prayers against the fallen (p. 255): the mortal's Faith potential against the demon's Willpower. */
export const PRAYERS = {
    banishment: { label: "Banishment", text: "the demon flees and cannot return for hours equal to its Torment" },
    abjuration: { label: "Abjuration", text: "an area (yards equal to the potential) is barred for hours equal to its Torment" },
    binding: { label: "Binding", text: "rooted to the spot while the prayer lasts; it can still act" },
    exorcism: { label: "Exorcism", text: "an hour a roll; win more rolls than its permanent Faith and it is cast out of the host" }
};
/** Unbelievers (p. 253): their Willpower at 8 (+1 die for every five in a crowd); each success adds 1 to the demon's difficulty. */
export const unbelieverDice = (willpower, crowd = 1) => n(willpower) + Math.floor(Math.max(0, n(crowd) - 1) / 5);
/** A True Name (p. 256): successes needed to piece it together. */
export const TRUE_NAME = { fallen: 10, lord: 15, overlord: 20, baron: 30 };
/** Hearing one's name spoken (p. 171): Faith at 7 (Celestial Name) or 6 (True Name). */
export const INVOKED = ["", "a picture of the speaker", "the speaker and the people around", "a turn of what is said"];
/** Seeing through illusion (p. 171): Perception + Alertness at 7, or at another demon's higher of Faith and Torment. */
export const illusionDifficulty = (otherFaith = 0, otherTorment = 0) => (n(otherFaith) || n(otherTorment) ? clamp(Math.max(n(otherFaith), n(otherTorment)), 2, 10) : 7);

/** Experience (p. 164). */
export function xpCost(trait, current = 0, { otherHouse = false } = {}) {
    const c = n(current);
    switch (trait) {
        case "attribute": return c * 4;
        case "ability": return c ? c * 2 : 3;
        case "lore": return c ? c * 5 : (otherHouse ? 10 : 7);
        case "background": return c * 3;
        case "virtue": return c * 2;
        case "willpower": return c;
        case "faith": return c * 7;
        case "torment": return 10;
        default: return 0;
    }
}
/** Character creation (p. 123). */
export function startingTraits(house) {
    return { attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5, lore: 3, virtues: 3, faith: 3, torment: HOUSES[house]?.torment ?? 3,
        willpower: "the two highest Virtues", freebies: 15 };
}
export const FREEBIES = { attribute: 5, ability: 2, lore: 7, background: 1, faith: 6, virtue: 2, willpower: 1 };
