/**
 * WoDX Actions: the fomor powers of Werewolf 20th (pp. 430-439), the pure rules (B5610-B5619). Each power is in
 * WoDX's own words with its page, and says what it does on the table:
 *
 *   always   on while the Power is on the sheet: the system's own bonus rows (soak, Attributes, dice, health,
 *            movement), a natural weapon on the sheet, dark sight on the token, lethal soak, Rage, Gnosis, no Delirium,
 *            regeneration or an extra action each turn
 *   roll     used from the Fomor power window: a cost, a roll, then the same kinds of change for a time on the fomor
 *            (bonus rows, a condition, a weapon, flight) and/or results on the targets through the effects card
 *            (harm, conditions, fear, a summoning), resisted where the book says
 *   free     used from the window with no roll (Gaseous Form, Darksight's rival Eyes of the Wyrm)
 *
 * cost: {wp, rage}; Rage comes from Berserker's pool and, as the book allows for Gifts (p. 434), Willpower stands in.
 * bonus rows: [type, setting, value] as wodx-library gear-rules.mjs writes them (attr, dice, fixed, ab, abd, soak,
 * health, move, init). spec: an effects result (mage-da-effects.js helpers). once: per "scene" or "day".
 */
import { H, T, C, N, S, MV, outcomesOf } from "./mage-da-effects.js";

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
export const BOOK = "W20";
const W = p => `${BOOK} p. ${p}`;

const P = (key, name, p, kind, fx, o = {}) => ({ key, name, p, kind, fx, cost: {}, bonus: [], keywords: [], ...o });

/** By key. Pages are the printed pages of Werewolf: The Apocalypse 20th Anniversary Edition. */
export const POWERS = [
    P("animalcontrol", "Animal Control", 430, "roll", "A wail only beasts hear brings the weakest animals near; each obeys a short order for the scene.",
        { cost: { wp: 1 }, roll: "manipulation+animalken", diff: 6, spec: S("summon"), keywords: ["summon"] }),
    P("armoredhide", "Armored Hide", 430, "always", "Hide, scales or slime: three more soak dice against bashing and lethal harm.",
        { bonus: [["soak", "bashing", 3], ["soak", "lethal", 3]] }),
    P("armoredskin", "Armored Skin", 430, "always", "Lethal harm is soaked as if it were bashing.", { lethalSoak: true }),
    P("berserker", "Berserker", 430, "always", "Five Rage, spent as a Garou spends it (extra actions); the fomor can frenzy.", { rage: 5 }),
    P("bestialmutation", "Bestial Mutation", 430, "roll", "A beast shape for the scene: two more dice on Strength, Dexterity and Stamina, but Appearance 0.",
        { roll: "dexterity+primalurge", diff: 6, lasts: "scene", self: { bonus: [["dice", "strength", 2], ["dice", "dexterity", 2], ["dice", "stamina", 2], ["fixed", "appearance", 0]] }, keywords: ["boost"] }),
    P("bodybarbs", "Body-Barbs", 431, "always", "Barbs on arms and legs: punches and kicks do two more dice.",
        { weapon: { name: "Body-barbs", bonus: 2, type: "lethal", diff: 6 } }),
    P("bodyexpansion", "Body Expansion", 431, "roll", "The body swells: close blows do Strength + 4 and the fomor runs 10 yards further a turn, for the scene.",
        { cost: { wp: 1 }, roll: "strength+athletics", diff: 6, lasts: "scene", self: { weapon: { name: "Swollen fists", bonus: 4, type: "bashing", diff: 6 }, bonus: [["move", "run", 1.5]] }, keywords: ["boost"] }),
    P("braineating", "Brain Eating", 431, "roll", "A touch and Intelligence + Occult take a point from the victim's Intelligence for the scene.",
        { cost: { wp: 1 }, touch: true, roll: "intelligence+occult", diff: 6, resist: { pool: "willpower", diff: 6 },
            spec: T("sway", "Brain eaten", "scene"), drain: { attr: "intelligence", by: 1 }, keywords: ["harm"] }),
    P("cancerouscarapace", "Cancerous Carapace", 431, "roll", "Rage hardens the skin into scaly growths: two more soak dice for the scene.",
        { cost: { rage: 1 }, lasts: "scene", self: { bonus: [["soak", "", 2]] }, keywords: ["ward"] }),
    P("causeinsanity", "Cause Insanity", 431, "roll", "Willpower at 8 plants a phobia (one or two successes, a scene) or a delusion (more, longer) in someone the fomor engages.",
        { cost: { wp: 1 }, roll: "willpower", diff: 8, spec: T("sway", "Touched by madness", { turns: 10 }), keywords: ["sway"] }),
    P("chameleoncoloration", "Chameleon Coloration", 431, "roll", "The skin takes the colours around it: spotting the fomor takes Wits + Alertness at 7, for the scene.",
        { lasts: "scene", spec: T("veil", "Chameleon skin", "scene", "self"), keywords: ["veil"] }),
    P("clawsandfangs", "Claws and Fangs", 431, "always", "Claws and teeth that cannot be hidden: Strength + 1 aggravated.",
        { weapon: { name: "Claws and fangs", bonus: 1, type: "aggravated", diff: 6 } }),
    P("darksight", "Darksight", 432, "always", "Sees in utter darkness; a sudden bright light blinds for a turn per Perception dot.", { vision: true }),
    P("deception", "Deception", 432, "roll", "A touch and Wits + Subterfuge at 7 mask the Wyrm's taint (one success for the fomor's own, three for another's, five to fake it).",
        { cost: { wp: 1 }, touch: true, roll: "wits+subterfuge", diff: 7, lasts: "scene", self: { flag: "masked" }, spec: T("veil", "Taint masked", "scene", "self"), keywords: ["veil"] }),
    P("dentataorifice", "Dentata Orifice", 432, "always", "A second mouth bites anyone the fomor holds, each turn of the hold.",
        { weapon: { name: "Second mouth (bite in a hold)", bonus: 1, type: "lethal", diff: 6 } }),
    P("echoesofwrath", "Echoes of Wrath", 432, "roll", "Once a scene, Presence + Intimidation against Willpower: the foe acts out a twisted feeling, a turn for each success over.",
        { roll: "charisma+intimidation", diff: 6, once: "scene", resist: { pool: "willpower", diff: 6 }, spec: C("hold", "dazed", "Echoes of Wrath", { turns: 1 }), keywords: ["hold"] }),
    P("ectoplasmicextrusion", "Ectoplasmic Extrusion", 432, "roll", "Tentacles of ectoplasm: Strength + 3 to lift, and a Dexterity + Brawl (8) lash for Strength + 2, for the scene.",
        { cost: { wp: 1 }, roll: "stamina+occult", diff: 6, lasts: "scene", self: { weapon: { name: "Ectoplasm tentacles", bonus: 2, type: "bashing", diff: 8 } }, keywords: ["boost"] }),
    P("exoskeleton", "Exoskeleton", 432, "always", "A shell of plates: Strength and Stamina three higher.", { bonus: [["attr", "strength", 3], ["attr", "stamina", 3]] }),
    P("extralimbs", "Extra Limbs", 432, "always", "More arms or tentacles: three more dice on Brawl, where the grapples are.", { bonus: [["ab", "brawl", 3]], note: "WoDX reading: the three grapple dice ride on Brawl (PENDING-REVIEW)." }),
    P("extraspeed", "Extra Speed", 432, "always", "One extra action each turn with no split pool, and half again the speed.", { bonus: [["move", "walk", 1.5], ["move", "jog", 1.5], ["move", "run", 1.5]], extraAction: 1 }),
    P("eyesofthewyrm", "Eyes of the Wyrm", 432, "free", "Anyone meeting the fomor's gaze makes Willpower at 8 or stands frozen in horror (five turns less Wits, at least one).",
        { resist: { pool: "willpower", diff: 8 }, spec: C("hold", "immobilized", "Frozen by the Wyrm's eyes", { turns: 3 }), keywords: ["hold", "fear"] }),
    P("fierydischarge", "Fiery Discharge", 433, "roll", "Wits + Athletics hurls fire, a yard of range a success: aggravated, every other turn.",
        { roll: "wits+athletics", diff: 6, once: "round2", spec: H("harm", 1, "aggravated"), keywords: ["harm"] }),
    P("footpads", "Footpads", 433, "always", "Soft, sure feet: Stealth rolls two easier.", { bonus: [["abd", "stealth", -2]] }),
    P("frogtongue", "Frog Tongue", 433, "always", "A tongue that strikes two yards with Dexterity + Athletics for Strength, and grapples.",
        { weapon: { name: "Frog tongue", bonus: 0, type: "bashing", diff: 6, ability: "athletics" } }),
    P("fungaltouch", "Fungal Touch", 433, "roll", "A touch spreads rot: Stamina at 7 or a dot less in each Physical Attribute and Appearance for a day.",
        { touch: true, roll: "dexterity+brawl", diff: 6, resist: { pool: "stamina", diff: 7 }, spec: T("harm", "Fungal rot", { days: 1 }), drain: { attr: "physical", by: 1, appearance: true, days: 1 }, keywords: ["harm"] }),
    P("fungaludder", "Fungal Udder", 433, "roll", "Once a day, food for one Wyrm-tainted creature a success; another fomor who suckles gains a Physical dot for the scene.",
        { once: "day", roll: "stamina+survival", diff: 6, lasts: "scene", spec: T("boost", "Fed from the udder", "scene"), feed: true, keywords: ["boost", "mend"] }),
    P("gaseousform", "Gaseous Form", 434, "free", "Willpower turns the fomor to drifting gas for up to a scene; harm cannot reach it and it cannot attack.",
        { cost: { wp: 1 }, lasts: "scene", self: { cond: "fomor-gas" }, keywords: ["veil", "move"] }),
    P("giftedfomor", "Gifted Fomor", 434, "always", "A Gift on the sheet works as a power; Willpower pays its Rage or Gnosis.", { gifts: true }),
    P("hazardousbreath", "Hazardous Breath", 434, "roll", "A foul cloud within reach: Dexterity + Brawl (7) for a level of harm; uses a scene equal to Stamina.",
        { roll: "dexterity+brawl", diff: 7, once: "stamina", spec: H("harm", 1, "lethal", { fixed: true }), keywords: ["harm"] }),
    P("hazardousheave", "Hazardous Heave", 434, "roll", "Caustic spew: two levels of harm each turn until it is washed off.",
        { roll: "dexterity+brawl", diff: 7, once: "stamina", spec: H("harm", 2, "lethal", { fixed: true }), lasting: 2, keywords: ["harm"] }),
    P("hellshide", "Hell's Hide", 434, "always", "Three soak dice against fire, heat and radiation, which can usually not be soaked.", { bonus: [["soak", "fire", 3]] }),
    P("homogeneity", "Homogeneity", 434, "roll", "Manipulation + Intimidation (7) against Willpower (7): each success takes a die from the target's next supernatural power.",
        { cost: { wp: 1 }, roll: "manipulation+intimidation", diff: 7, resist: { pool: "willpower", diff: 7 }, spec: T("sway", "Dulled power", "scene"), dull: true, keywords: ["sway"] }),
    P("immunitytothedelirium", "Immunity to the Delirium", 434, "always", "The Delirium does not touch the fomor, as with Kinfolk.", { immune: true }),
    P("infectioustouch", "Infectious Touch", 434, "roll", "A touch (dodged, not parried) carries disease: Stamina + 3 at 8 against six aggravated levels less the successes.",
        { cost: { wp: 1 }, touch: true, roll: "dexterity+melee", diff: 6, resist: { pool: "stamina", diff: 8 }, spec: H("harm", 6, "aggravated", { fixed: true, soak: false }), sick: true, keywords: ["harm"] }),
    P("invisibility", "Invisibility", 434, "roll", "Wits + Stealth (7): unseen for the scene; a searcher contests with Perception + Alertness at 8.",
        { cost: { wp: 1 }, roll: "wits+stealth", diff: 7, lasts: "scene", self: { hidden: true }, spec: T("veil", "Invisible", "scene", "self"), keywords: ["veil"] }),
    P("lashingtail", "Lashing Tail", 435, "always", "A tail with six feet of reach: Dexterity + Melee (8), Strength + 2.",
        { weapon: { name: "Lashing tail", bonus: 2, type: "bashing", diff: 8, ability: "melee" } }),
    P("malleate", "Malleate", 435, "roll", "A piercing bite and Willpower: venom does an unsoakable aggravated level each turn a success, softening the flesh.",
        { cost: { wp: 1 }, roll: "dexterity+brawl", diff: 5, spec: H("harm", 1, "aggravated", { soak: false }), lasting: 1, keywords: ["harm"] }),
    P("mawofthewyrm", "Maw of the Wyrm", 435, "roll", "After a hold, Dexterity + Melee against Dexterity + Athletics each turn; three turns held and the victim is swallowed whole.",
        { roll: "dexterity+melee", diff: 6, resist: { pool: "dexterity+athletics", diff: 6 }, spec: C("hold", "held", "In the maw", { turns: 3 }), keywords: ["hold"] }),
    P("megaattribute", "Mega-Attribute", 435, "always", "One Attribute three higher (name it on the Power's description, Strength by default).", { mega: 3 }),
    P("mindblast", "Mind Blast", 435, "roll", "Wits + Alertness (8) against Willpower: the victim is wracked with pain, a lost turn for each success.",
        { cost: { wp: 1 }, roll: "wits+alertness", diff: 8, resist: { pool: "willpower", diff: 6 }, spec: C("hold", "dazed", "Mind Blast", { turns: 1 }), keywords: ["hold", "harm"] }),
    P("molecularweakening", "Molecular Weakening", 435, "roll", "After a touch, Perception + Medicine (8): the next blow's harm is doubled.",
        { cost: { wp: 1 }, touch: true, roll: "perception+medicine", diff: 8, spec: C("harm", "fomor-weakened", "Weakened", { turns: 1 }), keywords: ["harm"] }),
    P("nimbleness", "Nimbleness", 435, "always", "Two more dice to climb, jump and balance.", { bonus: [["ab", "athletics", 2]] }),
    P("noxiousbreath", "Noxious Breath", 435, "roll", "Stamina + Medicine (6): within 20 yards, Willpower at 8 or a craving for drink or smoke takes over.",
        { roll: "stamina+medicine", diff: 6, resist: { pool: "willpower", diff: 8 }, spec: T("sway", "Craving", "scene", "all"), keywords: ["sway"] }),
    P("noxiousmiasma", "Noxious Miasma", 435, "roll", "Once a scene, Presence + Subterfuge (8) against Stamina + Primal-Urge (8): a turn helpless for each success over.",
        { roll: "charisma+subterfuge", diff: 8, once: "scene", resist: { pool: "stamina+primalurge", diff: 8 }, spec: C("hold", "immobilized", "Choking miasma", { turns: 1 }, "all"), keywords: ["hold"] }),
    P("numbing", "Numbing", 436, "roll", "Willpower and Stamina + Medicine (6): no wound penalties and three more health levels for the scene.",
        { cost: { wp: 1 }, roll: "stamina+medicine", diff: 6, numbing: true, keywords: ["ward", "boost"] }),
    P("phoenixform", "Phoenix Form", 436, "roll", "Stamina + Occult (7): wreathed in chemical fire for a turn a success; three levels to anyone touched, soaked at 9.",
        { cost: { wp: 1 }, roll: "stamina+occult", diff: 7, lasts: { turns: 1 }, self: { touch: { levels: 3, type: "aggravated" }, light: true }, spec: T("ward", "Phoenix Form", { turns: 1 }, "self"), keywords: ["harm", "ward"] }),
    P("poisontumors", "Poison Tumors", 436, "always", "Struck, the tumors burst: everyone within a yard soaks three lethal dice.", { burst: { dice: 3, type: "lethal" } }),
    P("rathead", "Rat Head", 436, "roll", "Dexterity + Athletics (6) squeezes the body through any hole the head fits, at half running speed.",
        { roll: "dexterity+athletics", diff: 6, spec: MV(), keywords: ["move"] }),
    P("regeneration", "Regeneration", 436, "always", "Heals a bashing or lethal level each turn.", { regen: true }),
    P("roarofthewyrm", "Roar of the Wyrm", 436, "roll", "Charisma + Intimidation: foes within thirty feet flee in a fox frenzy for two turns a success, unless they make a Willpower success.",
        { cost: { wp: 1 }, roll: "charisma+intimidation", diff: 6, resist: { pool: "willpower", diff: 6 }, spec: T("fear", "Fox frenzy", { turns: 2 }, "all"), keywords: ["fear"] }),
    P("sensegaia", "Sense Gaia", 436, "roll", "Perception + Occult smells Gaia's servants within 20 yards; three successes name the tribe.",
        { cost: { wp: 1 }, roll: "perception+occult", diff: 6, spec: N("sense"), sense: "gaia", keywords: ["sense"] }),
    P("sensetheunnatural", "Sense the Unnatural", 436, "roll", "Perception + Occult senses the supernatural within 20 yards.",
        { roll: "perception+occult", diff: 6, spec: N("sense"), sense: "unnatural", keywords: ["sense"] }),
    P("shadowplay", "Shadowplay", 436, "roll", "Wits + Stealth (6) spreads a veil of shadow 30 yards across: a turn a success, or the scene for Willpower.",
        { roll: "wits+stealth", diff: 6, lasts: { turns: 1 }, spec: T("veil", "Shadowplay", { turns: 1 }, "self"), dark: true, keywords: ["veil"] }),
    P("sizeshift", "Size Shift", 437, "roll", "Willpower or Rage: the fomor grows for the scene, a health level and a point of Strength a level of the power.",
        { cost: { rage: 1 }, lasts: "scene", self: { bonus: [["attr", "strength", 1], ["health", "bruised", 1]], grow: 1 }, keywords: ["boost"] }),
    P("skittersight", "Skittersight", 437, "roll", "Willpower at 8 sends the eyes rolling up to a block away; the fomor sees what they see for an hour.",
        { roll: "willpower", diff: 8, spec: N("sense"), eyes: true, keywords: ["sense"] }),
    P("slitherskin", "Slither Skin", 437, "roll", "Dexterity + Athletics: the skin walks off on its own for the scene (one dot in each Physical Attribute, one health level).",
        { cost: { wp: 1 }, roll: "dexterity+athletics", diff: 6, spec: S("summon"), keywords: ["summon"] }),
    P("slobbersnot", "Slobbersnot", 437, "roll", "Willpower: slick slime for the scene; grabs at the fomor are harder and it soaks a die more against blunt blows.",
        { cost: { wp: 1 }, lasts: "scene", self: { bonus: [["soak", "bashing", 1]] }, keywords: ["ward"] }),
    P("spiritties", "Spirit Ties", 437, "always", "A point of Gnosis a purchase, for Bane fetishes and Umbral Passage.", { gnosis: 1 }),
    P("stomachpumper", "Stomach Pumper", 437, "roll", "Spew at a foe 25 feet off, three times a day: Dexterity + Athletics (7), two dice of harm and a round of retching.",
        { roll: "dexterity+athletics", diff: 7, once: "day3", spec: H("harm", 1, "bashing"), keywords: ["harm"] }),
    P("tarskin", "Tar Skin", 437, "always", "Weapons stick fast and bare hands are glued until a contested Dexterity roll frees them.", { tar: true }),
    P("toxicsecretions", "Toxic Secretions", 437, "always", "Blood and sweat burn whoever bites, claws or holds the fomor: a die of harm a level.", { burst: { dice: 1, type: "lethal", close: true } }),
    P("triaticsense", "Triatic Sense", 437, "always", "Sense Wyrm finds the fomor only at difficulty 9.", { hidesTaint: true }),
    P("twistedsenses", "Twisted Senses", 438, "roll", "Perception + Occult against the Gauntlet peeks into the Umbra and shows every Garou's war form.",
        { roll: "perception+occult", diff: 7, spec: T("sight", "Twisted Senses", "scene", "self"), keywords: ["sight"] }),
    P("umbralpassage", "Umbral Passage", 438, "roll", "Steps sideways as a Garou does, with Willpower in place of Gnosis, alone.",
        { roll: "willpower", diff: 7, spec: S("sideways"), keywords: ["sideways"] }),
    P("unnaturalstrength", "Unnatural Strength", 439, "always", "Strength four higher.", { bonus: [["attr", "strength", 4]] }),
    P("venomousbite", "Venomous Bite", 439, "always", "A bite that wounds carries venom: Strength + 2 aggravated that cannot be soaked.",
        { weapon: { name: "Venomous bite", bonus: 2, type: "aggravated", diff: 6, noSoak: true } }),
    P("viscousform", "Viscous Form", 439, "free", "Willpower melts the fomor to liquid for up to a scene: claws and bullets pass through, and it cannot attack.",
        { cost: { wp: 1 }, lasts: "scene", self: { cond: "fomor-liquid" }, keywords: ["ward", "move"] }),
    P("voiceofthewyrm", "Voice of the Wyrm", 439, "roll", "Its voice drains: everyone hearing makes Willpower at 8 or loses half their Gnosis.",
        { roll: "charisma+expression", diff: 6, resist: { pool: "willpower", diff: 8 }, spec: T("harm", "Voice of the Wyrm", "scene", "all"), gnosisDrain: 0.5, keywords: ["harm"] }),
    P("wallwalking", "Wall Walking", 439, "always", "Walks up walls and across ceilings.", { climb: true }),
    P("waterbreathing", "Water Breathing", 439, "always", "Breathes underwater.", { water: true }),
    P("webbing", "Webbing", 439, "roll", "Webs within reach: a victim breaks free with Strength against the web's Strength 8.",
        { roll: "dexterity+brawl", diff: 6, resist: { pool: "strength", diff: 8 }, spec: C("hold", "held", "Webbed", "scene"), keywords: ["hold"] }),
    P("wings", "Wings", 439, "roll", "Flies at 13 yards a turn; Willpower or Rage pushes a burst faster.",
        { lasts: "scene", self: { feet: 30, bonus: [["move", "jog", 1]] }, spec: T("move", "Flying", "scene", "self"), keywords: ["move"] }),
    P("wrathfulinvective", "Wrathful Invective", 439, "roll", "Presence + Intimidation (6): for the scene the foe takes two dice off attacks on anyone but the fomor.",
        { roll: "charisma+intimidation", diff: 6, spec: T("sway", "Wrathful Invective", "scene"), keywords: ["sway"] })
];

export const BY_KEY = Object.fromEntries(POWERS.map(p => [p.key, p]));
export const slug = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");
/** The power a sheet item names, by its name ("Claws and Fangs", "Claws & Fangs (fomor)"). */
export function powerOf(name) {
    const s = slug(String(name ?? "").replace(/\(.*?\)/g, "").replace(/&/g, "and"));
    return BY_KEY[s] ?? POWERS.find(p => s.startsWith(p.key)) ?? null;
}

/** The dice pool of a roll: get(kind, key) gives "attr", "ability" or "willpower". */
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
export function poolOf(roll, get) {
    if (!roll) return 0;
    return String(roll).split("+").reduce((sum, k) => sum + n(get(k === "willpower" ? "willpower" : ATTRS.includes(k) ? "attr" : "ability", k)), 0);
}
/** A roll's label: "Manipulation + Animal Ken". */
const LABEL = { animalken: "Animal Ken", primalurge: "Primal-Urge" };
export const rollLabel = roll => String(roll ?? "").split("+").map(k => LABEL[k] ?? k.replace(/^\w/, c => c.toUpperCase())).join(" + ");

/** The system's bonus rows for a set of [type, setting, value] (tagged wodxFomor so they can be found again). */
const TYPE = { attr: "attribute_buff", fixed: "attribute_fixed_value", dice: "attribute_dice_buff", ab: "ability_buff", abd: "ability_diff",
    soak: "soak_buff", health: "health_buff", move: "movement_buff", init: "initiative_buff" };
export function bonusRows(name, rows = [], on = true, tag = "always") {
    return rows.map(([t, setting, value]) => ({ name: `${name}: ${setting || t}`, type: TYPE[t] ?? t, settingtype: String(setting ?? ""), value: n(value), isactive: !!on, wodxFomor: tag }));
}
/** An item's bonus list with this power's rows of one tag put in (or switched), the rest kept. */
export function withRows(list = [], rows = [], tag = "always") {
    return [...(Array.isArray(list) ? list : []).filter(b => b?.wodxFomor !== tag), ...rows];
}
/** Mega-Attribute: the Attribute named on the item (Strength when none is). */
export function megaAttr(text = "") {
    const t = String(text).toLowerCase();
    return ATTRS.find(a => t.includes(a)) ?? "strength";
}

/** How long a power lasts, as a Chronicle timed duration and a label. */
export function lastsOf(lasts, successes = 1) {
    const s = Math.max(1, n(successes));
    if (!lasts || lasts === "scene") return { timed: { kind: "scene" }, label: "the scene" };
    if (lasts.turns) { const t = lasts.turns * s; return { timed: { kind: "rounds", rounds: t }, label: `${t} turn${t === 1 ? "" : "s"}` }; }
    if (lasts.days) { const d = lasts.days * s; return { timed: { kind: "time", seconds: d * 86400 }, label: `${d} day${d === 1 ? "" : "s"}` }; }
    return { timed: { kind: "scene" }, label: "the scene" };
}

/** A power's uses left: once a scene, a day, every other turn, three a day, Stamina a scene. used: {key: {at, n}}. */
export function usesLeft(p, used = {}, { scene = 0, day = 0, round = 0, stamina = 0 } = {}) {
    const u = used?.[p.key];
    if (!p.once) return { ok: true };
    if (p.once === "scene") return u?.scene === scene ? { ok: false, why: "once a scene" } : { ok: true };
    if (p.once === "day") return u?.day === day ? { ok: false, why: "once a day" } : { ok: true };
    if (p.once === "day3") return u?.day === day && n(u?.n) >= 3 ? { ok: false, why: "three times a day" } : { ok: true };
    if (p.once === "stamina") return u?.scene === scene && n(u?.n) >= Math.max(1, n(stamina)) ? { ok: false, why: `${Math.max(1, n(stamina))} a scene (Stamina)` } : { ok: true };
    if (p.once === "round2") return u?.round !== undefined && round - n(u.round) < 2 && round >= n(u.round) ? { ok: false, why: "every other turn" } : { ok: true };
    return { ok: true };
}
/** The record after a use. */
export function usedAfter(p, used = {}, { scene = 0, day = 0, round = 0 } = {}) {
    const u = used?.[p.key] ?? {};
    const same = (p.once === "day" || p.once === "day3") ? u.day === day : u.scene === scene;
    return { ...used, [p.key]: { scene, day, round, n: (same ? n(u.n) : 0) + 1 } };
}

/** What a power does to its targets with these successes, in the effects card's shape. */
export function resultsOf(p, successes, { source = "" } = {}) {
    if (!p?.spec) return [];
    const s = p.kind === "free" ? Math.max(1, n(successes)) : n(successes);
    if (s < 1) return [];
    const list = outcomesOf(p.spec, { key: p.spec.kw, label: p.name, source: source || W(p.p) }, s, p.fx);
    return list.map(r => {
        const out = { ...r.out };
        if (p.resist) out.resist = { pool: p.resist.pool, diff: p.resist.diff };
        // B5613: harm that lasts goes on each turn (Hazardous Heave, Malleate)
        if (p.lasting) out.everyTurn = { on: "target", levels: p.lasting * (p.key === "malleate" ? s : 1), type: out.type, soak: !!out.soak, text: `${p.lasting * (p.key === "malleate" ? s : 1)} ${out.type} each turn until it is stopped` };
        return { ...r, out };
    });
}

/** NPC choice: the powers an NPC fomor may use now (always-on ones need no choosing). */
export function choosable(list = []) {
    return list.filter(p => p.kind !== "always" && (p.keywords ?? []).length);
}

/** A rule's dice for a fomor's damage from Poison Tumors or Toxic Secretions (per level of Toxic Secretions bought). */
export function burstDice(p, levels = 1) {
    if (!p?.burst) return 0;
    return p.burst.dice * (p.key === "toxicsecretions" ? Math.max(1, Math.min(5, n(levels))) : 1);
}

/** The page line for a card. */
export const pageOf = p => W(p.p);
