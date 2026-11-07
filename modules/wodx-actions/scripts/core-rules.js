/**
 * VtDA20 Actions — shared dice and health rules (no Foundry calls).
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
 * Build the soak pool for one hit (VtDA20 p. 345 and Fortitude p. 218).
 * profile: "vampire" | "ghoul" | "mortal" | "supernatural"
 *   vampire       – Stamina + Fortitude + armor vs bashing/lethal; Fortitude + armor vs aggravated.
 *   ghoul         – as mortal, but Fortitude also soaks lethal and aggravated.
 *   mortal        – Stamina + armor vs bashing; armor only vs lethal/aggravated (mortals treat aggravated as lethal).
 *   supernatural  – lupines, spirits etc.: Stamina + armor vs everything.
 * fireOrSun: the Cainite banes; armor never helps, and the Fortitude blood auto-soak may not be used.
 * fortitudeBlood: spend a blood point to soak Fortitude automatically instead of rolling it (once per turn).
 * armorPiercing: dice of armor ignored; bypassArmor: attacker took +2 difficulty to ignore armor.
 */
export function soakPool({ profile, damageType, stamina, fortitude = 0, armor = 0, armorPiercing = 0,
                           bypassArmor = false, fireOrSun = false, fortitudeBlood = false, bonus = 0 }) {
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
    switch (profile) {
        case "vampire":
            if (t === "bashing" || t === "lethal") sta = stamina;
            fort = fortitude;
            if (t === "aggravated" && !fortitude) notes.push("no Fortitude: aggravated damage can only be soaked by armor");
            break;
        case "ghoul":
            if (t === "bashing") sta = stamina;
            fort = fortitude;
            if (t !== "bashing" && !fortitude) notes.push("mortals soak lethal and aggravated damage only with armor");
            break;
        case "supernatural":
            sta = stamina; fort = fortitude;
            break;
        default: // mortal
            if (t === "bashing") sta = stamina;
            else notes.push("mortals soak lethal and aggravated damage only with armor");
            break;
    }
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
export function damageAfterSoak(damage, soaked, damageType, profile) {
    let left = Math.max(0, damage - soaked);
    let halved = false;
    if (damageType === "bashing" && profile === "vampire" && left > 0) {
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
 * Narrative condition after damage (VtDA20 p. 345, 351).
 */
export function condition(damage, maxLevels, profile) {
    const b = damage.bashing || 0, l = damage.lethal || 0, a = damage.aggravated || 0;
    const total = b + l + a;
    if (total < maxLevels) return { key: "ok", text: "" };
    if (profile === "vampire") {
        if (a >= maxLevels) return { key: "finaldeath", text: "Final Death: the health track is full of aggravated damage." };
        if (l + a >= maxLevels) return { key: "torpor", text: "Torpor: the health track is full of lethal or worse damage." };
        return { key: "crippled", text: "Track full of bashing damage: the Cainite keeps moving as if Crippled (-5)." };
    }
    if (l + a >= maxLevels) return { key: "dead", text: "Dead: the health track is full of lethal damage." };
    return { key: "unconscious", text: "Unconscious: the health track is full of bashing damage." };
}

