/**
 * WoDX Actions 3.7 (Phase 6f): Dark Ages mages (Dark Ages: Mage), the pure rules. Mechanics in WoDX's own words with
 * page references (docs/research/6f-notes.md); no book text.
 *
 * A mage of the Dark Medieval works magic through a fellowship's Foundation (how) and four Pillars (what). WoDX keeps them
 * on the actor's flags (wodx-actions.daMage): {fellowship, foundation, pillars: {id: rating}, twilight: {temp, perm},
 * brandings: [{level, text, at}], lastCast (world time), sceneTries: {key, failures, botches}}.
 */

import { GRIMOIRE_ROTES } from "./mage-da-grimoire.js";

/* ------------------------------------------------------------------ */
/*  The fellowships (pp. 105–135)                                      */
/* ------------------------------------------------------------------ */

export const FELLOWSHIPS = {
    batini: { label: "Ahl-i-Batin", foundation: "Al-Ikhlas", gloss: "awareness of unity", page: 105,
        perks: { 4: "−1 to all Alertness difficulties", 5: "a further −1 to Alertness; Perception and Alertness rolls cannot botch (a botch is a failure)" },
        specialties: ["Communication", "Comprehension", "Movement", "Perception", "Stealth"],
        pillars: [["anbiya", "Al-Anbiya", "fate"], ["fatihah", "Al-Fatihah", "minds"], ["hajj", "Al-Hajj", "space"], ["layl", "Al-Layl", "secrecy"]],
        foci: "chants, prayer, the Qur'an, trance, incense, mantras, mirrors, sacred geometry, veils and darkness" },
    messianic: { label: "Messianic Voices", foundation: "Divinity", gloss: "relationship to the Divine", page: 110,
        perks: { 4: "−1 to all Expression difficulties", 5: "−1 permanently to all rolls with one Social Attribute of the player's choosing" },
        specialties: ["Communing with Angels", "Healing", "Obvious Intercessions", "Overcoming Dissonance"],
        pillars: [["gavriel", "Gavri-El", "fire, healing, motion, reason"], ["mikhael", "Mikha-El", "leadership, light, war"], ["raphael", "Repha-El", "creativity, peace, water"], ["uriel", "Uri-El", "darkness, death, fear, earth"]],
        foci: "holy symbols, prayer, scripture and song" },
    oldfaith: { label: "Old Faith", foundation: "Spontaneity", gloss: "sympathy with life's pulse", page: 115,
        perks: { 4: "hurried spells take effect as cast, not on the next turn", 5: "hurried castings count as normal spells" },
        specialties: ["Blessings", "Curses", "Living Creatures", "Weather"],
        pillars: [["autumn", "Autumn", "wisdom and fruition"], ["spring", "Spring", "life and creation"], ["summer", "Summer", "fire and passion"], ["winter", "Winter", "death and despair"]],
        foci: "blood, chanting, ordeals" },
    hermes: { label: "Order of Hermes", foundation: "Modus", gloss: "formidable discipline", page: 120,
        perks: { 5: "up to two Willpower may be spent in a turn" },
        specialties: ["Control", "Destruction", "Elements", "Transmutation"],
        pillars: [["anima", "Anima", "life"], ["corona", "Corona", "mind"], ["primus", "Primus", "Quintessence"], ["vires", "Vires", "forces"]],
        foci: "astrology, Enochian, numerology; wands, swords, chalices",
        bar: "the Order forbids raising the dead, making true life and travel beyond the Lunar Sphere (p. 120)" },
    spirit: { label: "Spirit-Talkers", foundation: "Sensitivity", gloss: "the call of the Invisible World", page: 125,
        perks: { 1: "sees into the Umbra wherever the Gauntlet is at or below the Sensitivity rating", 5: "regains Quintessence each day in the Umbra: 3 or the Fount rating, whichever is higher" },
        specialties: ["Awakening Spirits", "Dreams", "Shades of the Dead", "Summoning", "Travel"],
        pillars: [["chieftain", "Chieftain", "leadership"], ["trickster", "Trickster", "deception"], ["warrior", "Warrior", "fury"], ["wiseone", "Wise One", "ancient power"]],
        foci: "dance, drums, chants, prayers to a god or totem" },
    valdaermen: { label: "Valdaermen", foundation: "Blot", gloss: "depth of sacrifice", page: 130,
        perks: { 2: "damage taken from any source can serve as a focus for turns equal to the lower of Blot and the Health Levels taken", 5: "may take unsoakable lethal damage (healed only by mundane means) for +1 die per Health Level to one casting roll" },
        specialties: ["Blatant Magic", "Divination", "Empathy", "Physical Augmentation"],
        pillars: [["fara", "Fara", "travel"], ["forlog", "Forlog", "luck and fortune"], ["galdrar", "Galdrar", "magic and secrets"], ["hjaldar", "Hjaldar", "battle"]],
        foci: "blood, offerings, scarification" }
};
export const pillarsOf = id => (FELLOWSHIPS[id]?.pillars ?? []).map(([key, label, domain]) => ({ key, label, domain }));

/** Rotes: ready spells (pp. 108–135). levels: Pillar levels the spell needs. */
export const ROTES = [
    { id: "swiftroad", f: "batini", name: "Swift Road of the Faithful", levels: { hajj: 2, layl: 1 }, page: 108,
        system: "Each success cuts an overland journey by a fifth (worked out success by success) and adds +1 to the difficulty for anyone passed on the way to notice the traveller, starting at 5. One more traveller per success (and per Quintessence) for +1 to both Pillars." },
    { id: "gazesuleiman", f: "batini", name: "Gaze of Suleiman", levels: { anbiya: 3, fatihah: 2, layl: 2 }, page: 108,
        system: "Each success takes one success off any roll to deceive, disguise or misdirect the mage; a deception cut to zero is seen through, and the excess goes against the deceiver's mental defences." },
    { id: "onefights", f: "batini", name: "One Fights as Many", levels: { fatihah: 3, hajj: 4 }, page: 109,
        system: "One Quintessence per duplicate, up to the successes. Only one self casts or spends Willpower each turn; all share one store. The mage takes only the highest damage dealt to any self in a turn." },
    { id: "theword", f: "messianic", name: "The Word", levels: { mikhael: 2 }, page: 113,
        system: "Each success adds +1 to the difficulty to resist the next short, direct command. Authority, not mind control: what is immune to such things is immune." },
    { id: "shatteringvoid", f: "messianic", name: "Shattering the Void", levels: { gavriel: 3, mikhael: 3 }, page: 114,
        system: "Two aggravated levels per success to beings of the Void, soaked as usual; half (rounded up) to beings with some spirit left, such as vampires; nothing to humans however wicked. Against Willpower above 9 the difficulty stays 9 with extra successes needed." },
    { id: "mortalclay", f: "messianic", name: "Mortal Clay", levels: { raphael: 3, uriel: 4 }, page: 114,
        system: "A body of clay for a dead soul: one day per success, and more likeness per success. The ghost resists with Willpower unless it chooses to go in." },
    { id: "nightdaughter", f: "oldfaith", name: "Donning the Night-Daughter's Skin", levels: { spring: 2, summer: 2, winter: 1 }, page: 118,
        system: "Each two successes: −1 difficulty on balance, reaction and night-sight rolls (floor 4), +1 Dexterity for Stealth and +1 Strength for leaping. Barefoot only; seduction attempts against the caster are −1 difficulty." },
    { id: "verdantslumber", f: "oldfaith", name: "Verdant Slumber", levels: { autumn: 4, spring: 2 }, page: 119,
        system: "One aggravated level per success, growing as plants from the wounds; a victim slain by it becomes a plant." },
    { id: "ancientwarder", f: "oldfaith", name: "Ancient Warder of the Land", levels: { spring: 5, summer: 2 }, page: 119,
        system: "Wakes an ancient tree: Strength 8, Dexterity 1, Stamina 8, Wits 1, Brawl 1; Health Levels eight −0, one −1, one −2, one −5; soaks anything that does not strike at its pattern. Every three successes: one Attribute dot or one more −0 level. It dies if it cannot root again." },
    { id: "aegis", f: "hermes", name: "Aegis Magicus", levels: { primus: 3 }, page: 123,
        system: "A normal simple casting only, lasting half a day. Its successes cancel an incoming spell's one for one; each block costs 1 Quintessence (up to three invested at casting, or the wearer's own if a mage). A non-mage cannot let a spell through." },
    { id: "hermesbrand", f: "hermes", name: "Hermes' Brand", levels: { anima: 2, primus: 2, vires: 1 }, page: 124,
        system: "Each success charges one blood point. A vampire who drinks it takes two unsoakable aggravated levels per charged point drunk. It lasts its duration even if the mage dies." },
    { id: "incorruptible", f: "hermes", name: "The Incorruptible Water", levels: { anima: 4, corona: 4, primus: 3 }, page: 124,
        system: "Ten years without ageing per success, for one Quintessence per year of the mage's age from a source of longevity or health. Every 1 rolled goes on a lifelong tally that counts on every later casting; a permanent Willpower point clears the tally by the previous permanent Willpower." },
    { id: "wrathapollo", f: "hermes", name: "Wrath of Apollo", levels: { primus: 5, vires: 4 }, page: 124,
        system: "Three aggravated levels per success to everything within fifty feet per success, centred up to 100 yards per success away; the caster is caught unless the centre is over 200 yards off. It leaves a rift in the flow of Quintessence." },
    { id: "heartvoice", f: "spirit", name: "Listening to the Heart-Voice", levels: { trickster: 2 }, page: 129,
        system: "Sensitivity + Trickster: one more subject in earshot per success past the first. Hears what they believe, not the literal truth. Wards against scrying or mind-reading stop it." },
    { id: "dreamblade", f: "spirit", name: "The Dream Within the Blade", levels: { warrior: 3, wiseone: 3 }, page: 130,
        system: "The weapon does aggravated damage, harms what mundane weapons cannot, and strikes into the Penumbra and the Dark Umbra." },
    { id: "rightfulking", f: "spirit", name: "The Rightful King", levels: { chieftain: 4, wiseone: 1 }, page: 130,
        system: "The successes go against the Willpower of everyone in the area: the ablest leader for the matter at hand is heeded, more strongly with more successes." },
    { id: "dwarfhoard", f: "valdaermen", name: "Revealing the Dwarf-Hoard", levels: { forlog: 1, galdrar: 2 }, page: 134,
        system: "Finds valuables by what they mean to their owner. Each success cancels one success of a magical concealment; with all cancelled, the thing is found." },
    { id: "unsleeping", f: "valdaermen", name: "Unsleeping Swords", levels: { fara: 3, galdrar: 2 }, page: 135,
        system: "One Quintessence per corpse raised, up to the successes. A corpse: Strength and Stamina 4, Dexterity and Wits 1, Brawl and Melee 2; Healthy, Healthy, −1, −1, −2, −5. Two more successes and Quintessence on one body: an Attribute dot or a −1 level; one: an Ability dot." },
    { id: "emptyroads", f: "valdaermen", name: "Curse of Empty and Endless Roads", levels: { fara: 4, galdrar: 4 }, page: 135,
        system: "For the duration (often made lasting), no home, kin or welcome: the victim wanders, forgotten or despised." },
    // The Grimoire's rotes (book "G": Dark Ages: Mage Grimoire, printed pages)
    ...GRIMOIRE_ROTES
];

/* ------------------------------------------------------------------ */
/*  Casting (pp. 97–105)                                               */
/* ------------------------------------------------------------------ */

/**
 * The casting roll. levels: {pillar: level the effect needs}; ratings: {pillar: the mage's dots}; foundation.
 * opts: {quintessence (spent to lower the difficulty), hurried, freeFocus (a focus no longer needed, −1), sanctum (rating),
 *        failures, botches (earlier tries this scene), willpower}.
 * Returns {ok, why?, dice, difficulty, extra (successes needed above 9), steady (Quintessence a too-high Pillar needs),
 *          complex, highest, pillarsUsed, notes}.
 */
export function castPlan({ levels = {}, ratings = {}, foundation = 1, fellowship = null }, opts = {}) {
    const used = Object.entries(levels).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)]);
    if (!used.length) return { ok: false, why: "choose the Pillar level the effect needs" };
    const short = used.find(([k, v]) => (Number(ratings[k]) || 0) < v);
    if (short) return { ok: false, why: `${labelOf(fellowship, short[0])} ${short[1]} is needed; the mage has ${Number(ratings[short[0]]) || 0}` };
    const notes = [];
    const highest = Math.max(...used.map(([, v]) => v));
    const top = used.find(([, v]) => v === highest)[0];
    const complex = used.length > 1;
    // Pool: Foundation + the Pillar (simple), or + the highest Pillar involved and a die per other Pillar (complex)
    let dice = Number(foundation) + (Number(ratings[top]) || 0) + (complex ? used.length - 1 : 0);
    if (opts.sanctum >= 5) { dice += 1; notes.push("sanctum: +1 die to the Foundation (p. 87)"); }
    if (opts.blotDice) { dice += Number(opts.blotDice); notes.push(`Blot: ${opts.blotDice} lethal level(s) given for as many dice (p. 131)`); }
    if (opts.specialty) { dice += 1; notes.push("within the Foundation's specialty: +1 die (Grimoire p. 112)"); }
    // Difficulty: 4 + level (simple); 5 + highest + 1 per other Pillar (complex)
    let diff = complex ? 5 + highest + (used.length - 1) : 4 + highest;
    notes.push(complex ? `complex: 5 + ${highest} + ${used.length - 1}` : `simple: 4 + ${highest}`);
    if (opts.failures) { diff += Number(opts.failures); notes.push(`+${opts.failures} for earlier failures this scene`); }
    if (opts.botches) { diff += 2 * Number(opts.botches); notes.push(`+${2 * opts.botches} for earlier Backlash this scene`); }
    // The first day of a season: suited magic −3, all other magic +3 (Grimoire pp. 110–111)
    if (opts.season === "against") { diff += 3; notes.push("+3: against the season on its first day (Grimoire p. 110)"); }
    // Lowering: each point first removes an extra success needed above 9, then lowers from 9 (floor 4)
    let lower = 0;
    const q = Math.min(3, Math.max(0, Number(opts.quintessence) || 0));
    if (q) { lower += q; notes.push(`−${q} for Quintessence`); }
    if (opts.freeFocus) { lower += 1; notes.push("−1 for a focus no longer needed"); }
    if (opts.season === "suits") { lower += 3; notes.push("−3: suits the season on its first day (Grimoire p. 110)"); }
    if (opts.sunday && fellowship === "messianic") { lower += 1; notes.push("−1: an instantaneous spell on a Sunday (Grimoire p. 111)"); }
    const sanctumLower = opts.sanctum >= 3 ? 2 : opts.sanctum >= 2 ? 1 : 0;
    if (sanctumLower) { lower += sanctumLower; notes.push(`−${sanctumLower} in the sanctum`); }
    let extra = Math.max(0, diff - 9);
    diff = Math.min(9, diff);
    const takeExtra = Math.min(extra, lower); extra -= takeExtra; lower -= takeExtra;
    diff = Math.max(4, diff - lower);
    if (extra) notes.push(`${extra} extra success(es) needed above difficulty 9`);
    // A Pillar rated above the Foundation needs a Quintessence to steady the spell (p. 99)
    const steady = used.some(([k]) => (Number(ratings[k]) || 0) > Number(foundation)) ? 1 : 0;
    if (steady) notes.push("1 Quintessence steadies a Pillar rated above the Foundation");
    return { ok: true, dice, difficulty: diff, extra, steady, complex, highest, pillarsUsed: used.length, notes };
}
const labelOf = (f, key) => pillarsOf(f).find(p => p.key === key)?.label ?? key;

/** Quintessence a turn: 2 without Fount, then 2, 3, 4, 5, 6 by Fount; held 10, then 12–20 (pp. 86–87). */
export const fountLimits = fount => ({ hold: fount > 0 ? 10 + 2 * Math.min(5, fount) : 10, perTurn: fount > 0 ? Math.min(6, 1 + Math.min(5, fount)) : 2 });

/**
 * The outcome. roll: {raw, ones, successes} (successes already net of 1s, with Willpower); extra: successes needed above 9.
 * Backlash comes when the spell falls short and any 1 was rolled; each Quintessence spent counts as one more 1 (p. 136).
 * In a sanctum there is no Backlash (p. 87).
 */
export function castOutcome(roll, { extra = 0, quintessenceSpent = 0, sanctum = 0 } = {}) {
    const net = Math.max(0, (roll.successes ?? 0) - extra);
    if (net > 0) return { result: "success", successes: net };
    if (roll.ones > 0 && !(sanctum > 0)) return { result: "backlash", successes: 0, ones: roll.ones + Number(quintessenceSpent || 0) };
    return { result: "failure", successes: 0 };
}

/** Duration (p. 103) and distance (p. 105) by successes: [normal, hurried]. */
export const DURATION = [[1, "one turn", "one turn"], [2, "a scene", "three turns"], [3, "a day", "five turns"], [4, "a month", "ten turns"], [5, "six months", "twenty turns"]];
export const DISTANCE = [[1, "the self, or 20 feet", "3 feet"], [2, "100 yards", "20 feet"], [3, "10 miles", "100 feet"], [4, "500 miles", "200 yards"], [5, "across Christendom", "a mile"]];
export function reach(successes, hurried = false) {
    const k = hurried ? 2 : 1, s = Math.max(1, successes);
    const pick = (t, more) => s <= 5 ? t[s - 1][k] : more;
    return {
        duration: pick(DURATION, hurried ? `${20 + 20 * (s - 5)} turns` : "as the Storyteller sets (six successes or more)"),
        distance: pick(DISTANCE, hurried ? `${5 ** (s - 5)} miles` : "as the Storyteller sets (six successes or more)"),
        note: "one extra success per extra target (p. 105)"
    };
}

/* ------------------------------------------------------------------ */
/*  Backlash (pp. 136–141)                                             */
/* ------------------------------------------------------------------ */

/** Quintessence to cancel k 1s: 1, then doubling (3 for two, 7 for three…) (p. 140). */
export const cancelCost = k => (2 ** Math.max(0, k)) - 1;
/** How many 1s a store of Quintessence can cancel. */
export function canCancel(quintessence, ones) { let k = 0; while ( k < ones && cancelCost(k + 1) <= quintessence ) k++; return k; }

export const BACKLASH = { branding: "Branding (a mark on the body or the world around)", manifestation: "Manifestation (something answers)",
    scourging: "Scourging (raw harm)", twilight: "Twilight (the world bends toward the mage's own)" };

/** Branding: severity = the 1s × the highest Pillar; its level 1–5 by bands (p. 137). */
export function branding(ones, highest) {
    const severity = ones * highest;
    const level = severity >= 31 ? 5 : severity >= 21 ? 4 : severity >= 13 ? 3 : severity >= 6 ? 2 : severity >= 1 ? 1 : 0;
    const effect = ["", "a small sign: a glint in the eye, a pallor, a warmth", "a clear mark: +1 or +2 difficulty to Appearance or Charisma rolls (rarely a Physical Attribute)",
        "a serious change: +2 or +3 to Social difficulties and some physical hindrance, perhaps a small benefit", "a monstrous change: Appearance near zero and heavy Social penalties, except to intimidate",
        "utterly inhuman: Social rolls all but impossible except for terror"][level];
    return { severity, level, effect };
}
/** Add a mark; every third mark at one level merges into one of the next (p. 138). */
export function addBranding(marks, mark) {
    const out = [...marks, mark];
    for ( let lv = 1; lv < 5; lv++ ) {
        const at = out.filter(m => m.level === lv);
        if ( at.length >= 3 ) {
            const three = at.slice(0, 3);
            const rest = out.filter(m => !three.includes(m));
            return addBranding(rest, { level: lv + 1, text: `merged from three marks: ${three.map(m => m.text).filter(Boolean).join("; ")}`, at: mark.at });
        }
    }
    return out;
}

/** Manifestation: (highest Pillar + 1 per other Pillar) × the 1s; each point buys 3 Attribute dots, or 2 of Willpower,
 *  Quintessence or a Pillar, or 1 Foundation dot, for whatever answers (pp. 138–139). */
export const manifestation = (ones, highest, pillarsUsed = 1) => ({ points: (highest + Math.max(0, pillarsUsed - 1)) * ones,
    buys: "per point: 3 Attribute dots, or 2 dots of Willpower, Quintessence or a Pillar, or 1 Foundation dot" });

/** Scourging: per 1, by the highest Pillar: 1–2 one lethal; 3 two lethal; 4 one aggravated; 5 two aggravated (p. 139). */
export function scourging(ones, highest) {
    const [type, per] = highest >= 5 ? ["aggravated", 2] : highest === 4 ? ["aggravated", 1] : highest === 3 ? ["lethal", 2] : ["lethal", 1];
    return { type, levels: ones * per, soak: "only the caster's own body soaks it (Fortitude and armour that is part of the body)" };
}

/** Twilight: points per 1 by the highest Pillar (1–2: 1, 3–4: 2, 5: 3); ten temporary make one permanent (p. 140). */
export const twilightPoints = (ones, highest) => ones * (highest >= 5 ? 3 : highest >= 3 ? 2 : 1);
export function addTwilight({ temp = 0, perm = 0 } = {}, points) {
    let t = temp + points, p = perm;
    while ( t >= 10 && p < 10 ) { t -= 10; p += 1; }
    return { temp: t, perm: p };
}
export function twilightStage(perm) {
    return perm >= 9 ? "Final Twilight" : perm >= 7 ? "Deep Twilight" : perm >= 4 ? "Median Twilight" : perm >= 2 ? "Shallow Twilight" : "no symptoms yet";
}

/* ------------------------------------------------------------------ */
/*  Fading by abstinence (pp. 140–141)                                 */
/* ------------------------------------------------------------------ */

/** Days for one temporary point of Twilight to fade while it belongs to permanent point k + 1. */
export const twilightRate = perm => { const point = perm + 1; return point <= 2 ? 1 : point <= 4 ? 3 : point <= 6 ? 7 : point === 7 ? 30 : point === 8 ? 120 : 365; };
/** Fade Twilight over `days` without magic. A spent permanent point breaks down into nine temporary ones. */
export function fadeTwilight({ temp = 0, perm = 0 } = {}, days, carry = 0) {
    let t = temp, p = perm, left = days + carry;
    while ( left > 0 && (t > 0 || p > 0) ) {
        if ( t === 0 ) { p -= 1; t = 10; }
        const rate = twilightRate(p);
        if ( left < rate ) break;
        left -= rate; t -= 1;
    }
    if ( t >= 10 ) { t -= 10; p += 1; }
    return { temp: t, perm: p, carry: (t > 0 || p > 0) ? left : 0 };
}
/** Days for a Branding of each level to break down: 1 vanishes in a week; 2 in two weeks into two 1s; 3 a month into two
 *  2s; 4 four months into two 3s; 5 is permanent. The highest marks break down first. */
export const BRANDING_DAYS = { 1: 7, 2: 14, 3: 30, 4: 120 };
export function fadeBrandings(marks, days, carry = 0) {
    let list = marks.map(m => ({ ...m })), left = days + carry;
    for (;;) {
        const fading = list.filter(m => m.level < 5).sort((a, b) => b.level - a.level)[0];
        if ( !fading ) return { marks: list, carry: 0 };
        const need = BRANDING_DAYS[fading.level];
        if ( left < need ) return { marks: list, carry: left };
        left -= need;
        list = list.filter(m => m !== fading);
        if ( fading.level > 1 ) list.push({ level: fading.level - 1, text: fading.text, at: fading.at }, { level: fading.level - 1, text: fading.text, at: fading.at });
    }
}

/* ------------------------------------------------------------------ */
/*  The rest of the sheet                                              */
/* ------------------------------------------------------------------ */

/** Aura by Foundation (p. 89): a modifier to Social rolls with those who feel it. 3 reads ±2 (the scan is unclear). */
export const auraOf = foundation => [0, 1, 1, 2, 2, 3][Math.max(0, Math.min(5, Number(foundation) || 0))];

/** Cray (pp. 84–85): holds 5 × rating; regains 1 a day it is left untapped; absorbing directly is Wits + Foundation at
 *  10 − rating, 1 Quintessence per success. Overdrawing past empty: −1 rating, then the new rating at 8: success refills
 *  as normal, failure goes dormant (1 a year), a botch kills it. */
export const crayHolds = rating => 5 * Math.max(0, rating);
export const crayAbsorbDifficulty = rating => Math.max(2, 10 - rating);

/** Experience (p. 89) and creation (pp. 79–81). */
export const XP = { attribute: c => 4 * c, ability: c => 2 * c, newAbility: 3, specialty: c => c, foundation: c => 8 * c, newPillar: 10, pillar: c => 6 * c, willpower: c => c };
export const CREATION = { attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5, foundation: 1, pillarDots: 3, startCap: 3, willpower: 5, bonus: 15,
    bonusCosts: { attribute: 5, ability: 2, specialty: 1, background: 1, foundation: 5, pillar: 3, willpower: 1 },
    quintessence: (fount, cray) => Math.max(5, fount + cray) };

/** Is this a Dark Ages mage chronicle? The era profile, unless the actor says otherwise. */
export const isDarkAgesEra = eraId => eraId === "dark-ages";
