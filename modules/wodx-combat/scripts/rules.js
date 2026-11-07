/**
 * WoDX Combat — pure rules logic (no Foundry calls).
 * Everything here works on plain numbers so it can be unit-tested outside Foundry.
 * Rules references are to Vampire: The Dark Ages 20th Anniversary Edition (VtDA20).
 */

export const WOUND_LEVELS = ["bruised", "hurt", "injured", "wounded", "mauled", "crippled", "incapacitated"];

/**
 * Count a Storyteller-system roll (VtDA20 p. 322-323).
 * - Each die >= difficulty is a success; with a specialty a 10 counts twice.
 * - Each 1 cancels one success.
 * - A botch is a roll with no successes at all and at least one 1.
 * - A Willpower point adds one automatic success that 1s cannot cancel.
 * - autoSuccesses (e.g. Potence blood) are added after cancellation.
 * - canBotch=false for damage and soak rolls, which never botch (VtDA20 p. 344-345).
 */
export function countSuccesses(faces, difficulty, opts = {}) {
    const { specialty = false, willpower = false, autoSuccesses = 0, canBotch = true } = opts;
    let raw = 0, ones = 0;
    for (const f of faces) {
        if (f === 1) ones++;
        if (f >= difficulty) raw += (specialty && f === 10) ? 2 : 1;
    }
    const net = Math.max(0, raw - ones);
    const botch = canBotch && raw === 0 && ones > 0 && !willpower && autoSuccesses === 0;
    const successes = net + (willpower ? 1 : 0) + autoSuccesses;
    return { raw, ones, successes, botch };
}

/** Clamp a difficulty into the 2-10 range used by the Storyteller System. */
export function clampDifficulty(d) {
    return Math.max(2, Math.min(10, d));
}

/**
 * Build the soak pool for one hit (VtDA20 p. 345 and Fortitude p. 218; W20, C20, Mage 20, Ghouls & Revenants).
 * profile = soak model:
 *   vampire  – Stamina + Fortitude + armor vs bashing/lethal; Fortitude + armor vs aggravated.
 *   ghoul    – Stamina + Fortitude vs bashing and lethal (revenants, and ghouls after the third sip);
 *              aggravated: armor only, as a mortal (Ghouls & Revenants p. 262).
 *   mortal   – Stamina + armor vs bashing; armor only vs lethal/aggravated (mortals treat aggravated as lethal).
 *              Also used for mages, hunters and animals (Mage 20 p. 334: mages cannot soak lethal without protection).
 *   lupine   – Stamina vs everything, silver ("bane") leaves no natural soak (W20 p. 148). Also the generic
 *              supernatural model for demons, mummies and Exalted.
 *   fae      – mortal soak; cold iron ("bane") is aggravated with only a difficulty-10 slim chance (Balor), so no natural soak.
 *   wraith   – Stamina vs bashing and lethal, armor only vs aggravated (Spectre/Oblivion damage). House adaptation.
 *   spirit   – Stamina vs everything (ephemera; Essence is the health track). House adaptation.
 *   supernatural – legacy v1 name for lupine.
 * fireOrSun: armor never helps, and the Fortitude blood auto-soak may not be used.
 * bane: the target's bane (silver, cold iron): natural soak (Stamina, Fortitude) is lost; armor still counts.
 * fortitudeBlood: spend a blood point to soak Fortitude automatically instead of rolling it (once per turn).
 * armorPiercing: dice of armor ignored; bypassArmor: attacker took +2 difficulty to ignore armor.
 */
export function soakPool({ profile, damageType, stamina, fortitude = 0, armor = 0, armorPiercing = 0,
                           bypassArmor = false, fireOrSun = false, fortitudeBlood = false, bane = false, bonus = 0, aggSoak = true }) {
    const notes = [];
    let effArmor = armor;
    if (fireOrSun && effArmor) { effArmor = 0; notes.push("armor does not protect against fire or sunlight"); }
    if (bypassArmor && effArmor) { effArmor = 0; notes.push("attack bypassed armor"); }
    if (armorPiercing && effArmor) {
        const cut = Math.min(effArmor, armorPiercing);
        effArmor -= cut; notes.push(`armor piercing removes ${cut} armor dice`);
    }
    let sta = 0, fort = 0;
    const t = damageType;
    switch (profile === "supernatural" ? "lupine" : profile) {
        case "vampire":
            if (t === "bashing" || t === "lethal") sta = stamina;
            fort = fortitude;
            if (t === "aggravated" && !fortitude) notes.push("no Fortitude: aggravated damage can only be soaked by armor");
            break;
        case "ghoul":
            if (t !== "aggravated") { sta = stamina; fort = fortitude; }
            else notes.push("ghouls and revenants soak aggravated damage only with armor");
            break;
        case "lupine":
        case "spirit":
            sta = stamina; fort = fortitude;
            if (t === "aggravated" && !aggSoak) { sta = 0; fort = 0; notes.push("Dark Ages: no aggravated soak in Homid form (DA:W p. 102)"); }
            break;
        case "wraith":
            if (t !== "aggravated") sta = stamina;
            else notes.push("wraiths soak aggravated damage only with armor");
            break;
        default: // mortal, fae
            if (t === "bashing") sta = stamina;
            else notes.push("lethal and aggravated damage can only be soaked by armor");
            break;
    }
    if (bane && (sta || fort)) { sta = 0; fort = 0; notes.push("bane: Stamina and Fortitude cannot soak this damage"); }
    let autoSoak = 0;
    if (fortitudeBlood && fort > 0) {
        if (fireOrSun) notes.push("Fortitude blood auto-soak cannot be used against fire or sunlight");
        else { autoSoak = fort; fort = 0; notes.push(`blood point spent: Fortitude ${autoSoak} soaks automatically`); }
    }
    const dice = Math.max(0, sta + fort + effArmor + bonus);
    return { dice, autoSoak, stamina: sta, fortitude: fort, armor: effArmor, notes };
}

/**
 * Damage remaining after soak. Vampires halve bashing damage after soaking, rounding down (VtDA20 p. 345).
 */
export function damageAfterSoak(damage, soaked, damageType, profile, { elder = false } = {}) {
    let left = Math.max(0, damage - soaked);
    let halved = false;
    if (damageType === "bashing" && (profile === "vampire" || (profile === "ghoul" && elder)) && left > 0) {
        left = Math.floor(left / 2); halved = true;
    }
    return { levels: left, halved };
}

/**
 * Add damage to a health track and resolve overflow (VtDA20 p. 345):
 * bashing beyond the track becomes lethal, lethal beyond the track becomes aggravated.
 * Implemented as: new damage fills empty boxes; each level that does not fit upgrades
 * the least severe existing box (bashing -> lethal, else lethal -> aggravated).
 */
export function addDamage(current, damageType, levels, maxLevels) {
    let { bashing: b = 0, lethal: l = 0, aggravated: a = 0 } = current;
    for (let i = 0; i < levels; i++) {
        const total = b + l + a;
        if (total < maxLevels) {
            if (damageType === "bashing") b++;
            else if (damageType === "lethal") l++;
            else a++;
            continue;
        }
        // Track full: the incoming level upgrades an existing box.
        if (damageType === "aggravated") {
            if (b > 0) { b--; a++; } else if (l > 0) { l--; a++; }
        } else if (damageType === "lethal") {
            if (b > 0) { b--; l++; } else if (l > 0) { l--; a++; }
        } else {
            if (b > 0) { b--; l++; } else if (l > 0) { l--; a++; }
        }
    }
    return { bashing: b, lethal: l, aggravated: a };
}

/** Remove (heal) levels of one damage type. */
export function removeDamage(current, damageType, levels) {
    const out = { bashing: current.bashing || 0, lethal: current.lethal || 0, aggravated: current.aggravated || 0 };
    out[damageType] = Math.max(0, out[damageType] - levels);
    return out;
}

/**
 * Wound level and dice penalty for a damage total, the same way the WoD20 system computes it.
 * levelTotals: { bruised: n, hurt: n, ... } (number of boxes per level), penalties likewise.
 */
export function woundState(damage, levelTotals, levelPenalties, levelLabels = {}) {
    let remaining = (damage.bashing || 0) + (damage.lethal || 0) + (damage.aggravated || 0);
    const max = WOUND_LEVELS.reduce((s, k) => s + (levelTotals[k] || 0), 0);
    if (remaining <= 0) return { key: "", label: "", penalty: 0, max, filled: 0 };
    const filled = remaining;
    for (const k of WOUND_LEVELS) {
        remaining -= (levelTotals[k] || 0);
        if (remaining <= 0) return { key: k, label: levelLabels[k] || k, penalty: levelPenalties[k] ?? 0, max, filled };
    }
    const k = "incapacitated";
    return { key: k, label: levelLabels[k] || k, penalty: levelPenalties[k] ?? -99, max, filled };
}

/**
 * Narrative condition after damage (VtDA20 p. 345, 351). kind = actor profile key (see profiles.js).
 */
export function condition(damage, maxLevels, kind) {
    const b = damage.bashing || 0, l = damage.lethal || 0, a = damage.aggravated || 0;
    const total = b + l + a;
    if (total < maxLevels) return { key: "ok", text: "" };
    if (kind === "vampire" || kind === "kindred") {
        if (a >= maxLevels) return { key: "finaldeath", text: "Final Death: the health track is full of aggravated damage." };
        if (l + a >= maxLevels) return { key: "torpor", text: "Torpor: the health track is full of lethal or worse damage." };
        return { key: "crippled", text: "Track full of bashing damage: the Cainite keeps moving as if Crippled (-5)." };
    }
    if (kind === "lupine") {
        if (l + a >= maxLevels) return { key: "dead", text: "Dead: a Garou regenerates only until lethal or aggravated damage fills the track (W20 p. 148). Rage (diff 8) can keep a Garou on their feet once per scene." };
        return { key: "unconscious", text: "Incapacitated: a Garou regenerates 1 bashing level per turn, and lethal with Stamina (diff 8) under stress." };
    }
    if (kind === "wraith") {
        if (l + a >= maxLevels) return { key: "dead", text: "Corpus destroyed: the wraith dissolves into the Tempest (Harrowing / Oblivion)." };
        return { key: "unconscious", text: "Incapacitated: the wraith's Corpus is battered but holds." };
    }
    if (kind === "spirit") return { key: "dead", text: "The spirit is dissipated (Essence spent / banished)." };
    if (kind === "fae") {
        if (l + a >= maxLevels) return { key: "dead", text: "Dead: a changeling's soul may reincarnate, but cold iron destroys it for good." };
        return { key: "unconscious", text: "Unconscious: the changeling collapses (chimerical damage: the body is unharmed)." };
    }
    if (kind === "ghoul") {
        if (l + a >= maxLevels) return { key: "dead", text: "Dead: the health track is full of lethal damage." };
        return { key: "unconscious", text: "Unconscious: the health track is full of bashing damage." };
    }
    if (l + a >= maxLevels) return { key: "dead", text: "Dead: the health track is full of lethal damage." };
    return { key: "unconscious", text: "Unconscious: the health track is full of bashing damage." };
}

/** Targeting modifiers (VtDA20 p. 346). */
export const TARGETING = {
    none: { label: "No specific target", diff: 0, dmg: 0 },
    medium: { label: "Medium (limb, shield, sword) +1 diff", diff: 1, dmg: 0 },
    small: { label: "Small (head, hand, knife) +2 diff, +1 dmg", diff: 2, dmg: 1 },
    precise: { label: "Precise (eye, heart, ring) +3 diff, +2 dmg", diff: 3, dmg: 2 }
};

/** Close combat maneuvers that modify a weapon attack (VtDA20 p. 346-347). */
export const MANEUVERS = {
    normal: { label: "Normal attack", diff: 0, dmg: 0, dice: 0 },
    greatblow: { label: "Great Blow (+1 diff, +2 dmg, no defense this turn)", diff: 1, dmg: 2, dice: 0 },
    riposte: { label: "Riposte (+1 diff, +1 dmg, defender +2 diff; needs a successful defense this turn)", diff: 1, dmg: 1, dice: 0, defDiff: 2 },
    // ---- VtDA20 p. 346-348 (maneuvers that change the roll; unarmed forms are in UNARMED)
    disarm: { label: "Disarm (+1 diff, no damage)", diff: 1, dmg: 0, dice: 0, noDamage: true, note: "Disarm: roll damage normally; if it beats the victim's Strength dots, the weapon flies a number of yards equal to the extra successes (VtDA20 p. 346)." },
    sweep: { label: "Sweep (+1 diff, knockdown)", diff: 1, dmg: 0, dice: 0, note: "Sweep: the victim is knocked down. Standing needs Dexterity + Athletics diff 6; failing loses the action, success costs -2 Initiative (p. 348)." },
    tackle: { label: "Tackle (+1 diff, +1 dmg, knockdown)", diff: 1, dmg: 1, dice: 0, note: "Tackle: both fighters roll Dexterity + Athletics diff 7 or fall; all actions next turn are at +1 difficulty (p. 347)." },
    hold: { label: "Hold (+1 diff, no damage)", diff: 1, dmg: 0, dice: 0, noDamage: true, note: "Hold: the victim is immobilized until their next action, when both roll resisted Strength + Brawl (p. 346)." },
    stake: { label: "Stake (+3 diff)", diff: 3, dmg: 0, dice: 0, note: "Stake: three damage successes pierce the heart: vampires are immobilized (torpid-like) and mortals die (p. 347)." },
    impale: { label: "Impale (+3 diff, archery)", diff: 3, dmg: 0, dice: 0, note: "Impale: as a stake, with a shaft through the heart (p. 349)." },
    suppress: { label: "Suppressive fire (-2 diff, defender +2)", diff: -2, dmg: 0, dice: 0, defDiff: 2, note: "Suppressive Fire (3+ Archery): a target who advances defends at +2 difficulty (p. 349)." },
    // ---- House maneuvers (not from the book): Storyteller's option, added in v1.1.0 for the Rothenstein armory.
    lunge: { label: "Lunge [house] (+1 diff, +1 dmg, defender +1 diff; you are overextended)", diff: 1, dmg: 1, dice: 0, defDiff: 1, note: "Lunge: {name} is overextended and suffers +1 difficulty on defense until the next turn." },
    cleave: { label: "Overhead Cleave [house] (+2 diff, +3 dmg, no defense this turn)", diff: 2, dmg: 3, dice: 0, noDefense: true, note: "Overhead Cleave: {name} may not defend for the rest of the turn." },
    hurried: { label: "Hurried Strike [house] (-1 diff, -1 dmg)", diff: -1, dmg: -1, dice: 0 },
    hook: { label: "Hook and Pull [house] (+2 diff, +1 dmg, defender +1 diff; target is dragged off balance)", diff: 2, dmg: 1, dice: 0, defDiff: 1, note: "Hook and Pull: if damage is dealt, the target is dragged off balance and loses their next move or suffers +1 difficulty on their next action (Storyteller's choice)." }
};

/** Built-in unarmed attacks (VtDA20 p. 346-347). */
export const UNARMED = {
    punch: { name: "Punch", attribute: "dexterity", ability: "brawl", accuracy: 0, dmgAttr: "strength", dmgBonus: 0, type: "bashing", diff: 6 },
    kick: { name: "Kick", attribute: "dexterity", ability: "brawl", accuracy: 0, dmgAttr: "strength", dmgBonus: 1, type: "bashing", diff: 7 },
    bite: { name: "Bite (after a successful clinch/hold/tackle)", attribute: "dexterity", ability: "brawl", accuracy: 1, dmgAttr: "strength", dmgBonus: 1, type: "aggravated", diff: 6 },
    claw: { name: "Claw (Protean/Vicissitude/natural)", attribute: "dexterity", ability: "brawl", accuracy: 0, dmgAttr: "strength", dmgBonus: 1, type: "aggravated", diff: 6 },
    clinch: { name: "Clinch (Strength damage)", attribute: "strength", ability: "brawl", accuracy: 0, dmgAttr: "strength", dmgBonus: 0, type: "bashing", diff: 6 }
};

/** Range bands for ranged weapons (VtDA20 p. 347 weapon traits). */
export const RANGE = {
    short: { label: "Within listed range", diff: 0 },
    double: { label: "Up to twice range (+1 diff)", diff: 1 },
    triple: { label: "Up to three times range (+2 diff)", diff: 2 }
};

/**
 * Assemble the attack roll. Returns { dice, difficulty, parts[] } describing every modifier.
 */
export function attackPool(p) {
    const parts = [];
    let dice = 0, diff = p.baseDifficulty ?? 6;
    const add = (label, n) => { if (n) { dice += n; parts.push(`${label} ${n >= 0 ? "+" : ""}${n}`); } };
    const addD = (label, n) => { if (n) { diff += n; parts.push(`${label} ${n >= 0 ? "+" : ""}${n} diff`); } };
    add(p.attributeLabel || "Attribute", p.attribute);
    add(p.abilityLabel || "Ability", p.ability);
    add("Accuracy", p.accuracy || 0);
    add("Maneuver", p.maneuverDice || 0);
    if (p.celerityDice) add("Celerity", p.celerityDice);
    if (p.flank === "flank") add("Flank", 1);
    if (p.flank === "rear") add("Rear", 2);
    add("Extra dice", p.extraDice || 0);
    if (p.woundPenalty) add("Wounds", p.woundPenalty); // negative number
    if (p.multiIndex > 0) {
        add("Multiple actions", -p.multiIndex);
        if (!p.celerityIgnoresMulti) addD("Multiple actions", p.multiIndex);
        else parts.push("Celerity ignores the multiple-action difficulty");
    }
    addD("Maneuver", p.maneuverDiff || 0);
    addD("Targeting", p.targetingDiff || 0);
    addD("Range", p.rangeDiff || 0);
    addD("Below minimum Strength", p.minStrDiff || 0);
    if (p.bypassArmor) addD("Bypass armor", 2);
    if (p.opponents > 1) addD("Multiple opponents", Math.min(4, p.opponents - 1));
    if (p.blind) addD("Blind", 2);
    addD("Other", p.extraDiff || 0);
    return { dice: Math.max(0, dice), difficulty: diff, parts };
}

/**
 * World of Darkness: Combat (White Wolf 1996) basic maneuvers, as an optional rules layer.
 * Accuracy modifiers are dice added to the attack pool; Damage modifiers are dice; Initiative and Move are reminders.
 * (Book p. 33-35: Block, Dodge, Grapple, Heavy Kick/Strike, Quick Kick/Strike, Sprint.)
 */
export const CLASSIC = {
    c_heavystrike: { label: "[Combat] Heavy Strike (+1 dmg, Init +0)", diff: 0, dmg: 1, dice: 0 },
    c_quickstrike: { label: "[Combat] Quick Strike (Init +3, Move +1)", diff: 0, dmg: 0, dice: 0, note: "Quick Strike: +3 Initiative, +1 Move this action." },
    c_heavykick: { label: "[Combat] Heavy Kick (-1 die, +2 dmg, Init -1)", diff: 0, dmg: 2, dice: -1, note: "Heavy Kick: -1 Initiative, -1 Move." },
    c_quickkick: { label: "[Combat] Quick Kick (+1 dmg, Init +1)", diff: 0, dmg: 1, dice: 0 },
    c_grapple: { label: "[Combat] Grapple (Init -1, sustained hold)", diff: 0, dmg: 0, dice: 0, note: "Grapple: a sustained hold. Following turns the grappler may squeeze for Strength damage or the victim breaks free with a resisted Strength roll." }
};

/**
 * Per-profile attack options: resources the attacker may spend for a bonus on the attack.
 * kinds: profile keys this option appears for (see profiles.js). eff: dice (attack), extraAction (no multi-action penalty).
 * `house` marks options that are Storyteller conveniences rather than printed rules.
 */
export const BOOSTS = [
    { id: "blood", res: "blood", kinds: ["kindred"], label: "Spend blood: +1 die per point (Physical Attribute)", eff: "dice", max: 3, house: false },
    { id: "rageAction", res: "rage", kinds: ["lupine"], label: "Spend Rage: extra action (no multiple-action penalty; max half permanent Rage)", eff: "extraAction", max: 1, house: false },
    { id: "glamour", res: "glamour", kinds: ["fae"], label: "Spend Glamour: +1 die per point [house]", eff: "dice", max: 2, house: true },
    { id: "pathos", res: "pathos", kinds: ["wraith"], label: "Spend Pathos: +1 die per point [house]", eff: "dice", max: 2, house: true },
    { id: "essence", res: "essence", kinds: ["spirit", "exalted"], label: "Spend Essence: +1 die per point [house]", eff: "dice", max: 3, house: true },
    { id: "quint", res: "quintessence", kinds: ["mage"], label: "Spend Quintessence: +1 die per point [house]", eff: "dice", max: 2, house: true },
    { id: "conviction", res: "conviction", kinds: ["hunter"], label: "Spend Conviction: +1 die per point [house]", eff: "dice", max: 2, house: true },
    { id: "torment", res: "faith", kinds: ["demon"], label: "Spend Faith: +1 die per point [house]", eff: "dice", max: 2, house: true },
    { id: "sekhem", res: "sekhem", kinds: ["mummy"], label: "Spend Sekhem: +1 die per point [house]", eff: "dice", max: 2, house: true }
];

/** Banes by profile: what ignores natural soak. */
export const BANES = { lupine: "Silver", fae: "Cold iron" };
