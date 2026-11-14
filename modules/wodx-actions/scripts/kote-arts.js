/**
 * WoDX Actions: the Kuei-jin Disciplines power by power (Kindred of the East, Revised, pp. 101-126), as short
 * summaries with the page. Each: art (a kote-rules ARTS key, or cultivation, dragontear, hun), level, name, the roll
 * (Attribute or Chi Virtue + Ability; "" for none), difficulty ("wall" for the local Wall, "t" for the target's
 * Willpower, or a number), cost ({yin, yang, chi (either kind), demon, wp}), the effect, and an effects-card spec
 * (mage-da-effects.js helpers). chk: the scan of that heading is damaged, so the name is the power's use; check the
 * page. Pure: no Foundry calls.
 */
import { H, T, C, N, S, MV, HL, outcomesOf } from "./mage-da-effects.js";

const P = (art, l, name, p, roll, diff, cost, fx, spec, o = {}) => ({ art, l, name, p, roll, diff, cost, fx, spec, ...o });
const sc = "scene";

export const ART_LABEL = {
    equilibrium: "Equilibrium", tapestry: "Tapestry", yangprana: "Yang Prana", yinprana: "Yin Prana", blackwind: "Black Wind", demonshintai: "Demon Shintai",
    bloodshintai: "Blood Shintai", boneshintai: "Bone Shintai", jadeshintai: "Jade Shintai", fleshshintai: "Flesh Shintai", ghostflameshintai: "Ghost-Flame Shintai",
    cultivation: "Cultivation", dragontear: "Dragon's Tear", hun: "Hun", obligation: "Obligation"
};

export const POWERS = [
    P("equilibrium", 1, "Master Flow", 102, "intelligence+meditation", 8, { wp: 1 }, "Three turns of contemplation: each success turns one Chi into its opposite, and both kinds may flow in one turn.", N("charge")),
    P("equilibrium", 2, "Adjust Balance", 102, "perception+medicine", 8, {}, "A touch shifts a victim's Chi: one point per success to its opposite (Kuei-jin), or a mortal or Kindred tilted to Yang (manic, +1 to resist frenzy), Yin (gloom, Willpower rolls +1) or Balance.", T("sway", "Chi adjusted", "night", "one")),
    P("equilibrium", 3, "Shift the Balance", 102, "stamina+meditation", 8, { wp: 1 }, "Each success raises a Chi Virtue by one and lowers the other, for the scene.", T("boost", "Shifted balance", sc, "self")),
    P("equilibrium", 4, "Chi Interrupt", 103, "dexterity+medicine", "var", {}, "A touch: −1 die per success for as many turns; four successes paralyse for the scene; mortals also take a level (difficulty is the foe's Stamina + 3).", C("hold", "immobilized", "Chi interrupted", { turns: 1 })),
    P("equilibrium", 5, "Chi Mastery", 103, "dexterity+equilibrium", 6, {}, "A touch bleeds one Chi a success out of the victim (Kindred lose as much blood).", T("charge", "Chi bled away", sc, "one")),
    P("tapestry", 1, "Spirit Caul", 103, "intelligence+yang", "wall", {}, "Draws a Yin- or Yang-spirit to come and see; three successes call one by name.", N("summon")),
    P("tapestry", 2, "Chi Ward", 103, "willpower", "wall", {}, "Raises or lowers the local Wall by one for the scene; at 10, no Chi powers work and spirits flee.", T("ward", "Chi Ward", sc, "self")),
    P("tapestry", 3, "Chi-shaping", 103, "perception+crafts", "wall", { chi: 1 }, "Three turns: weaves the area's dragon lines into nets, walls, traps or bad joss for the scene.", T("place", "Chi-shaping", sc, "self"), { chk: true }),
    P("tapestry", 4, "Riding the dragon lines", 104, "", 6, { chi: 1 }, "Taps a dragon line and rides its flow from place to place along it.", MV(), { chk: true }),
    P("tapestry", 5, "Opening a spirit gate", 105, "intelligence+rituals", "wall", { chi: 3 }, "Three turns and three Chi tear open a way to the Yang World (a typhoon of spirits) or the Yin World.", N("sideways"), { chk: true }),
    P("yangprana", 1, "Yang's quickening", 105, "", 6, { yang: 1 }, "Each Yang spent gives three initiative dice or an extra action next turn, up to the Discipline's dots.", T("hasten", "Yang quickening", { turns: 1 }, "self"), { chk: true }),
    P("yangprana", 2, "Yang Mantle", 105, "", 6, { yang: 1 }, "A scarlet aura: mortals and animals warm to the vampire, and a wooden weapon channels it in a fight.", T("boost", "Yang Mantle", sc, "self")),
    P("yangprana", 3, "Dragon Dance", 105, "", 6, { yang: 1 }, "A battle trance: no wound penalties, mind control +1 difficulty, attack successes add to damage.", T("boost", "Dragon Dance", sc, "self")),
    P("yangprana", 4, "Eightfold Yang Mantle", 106, "", 6, { yang: 1 }, "Two turns: the aura, drawn in, gives a soak die a Yang point against Yang, wood and fire; spread out, it touches all nearby.", T("ward", "Eightfold Yang Mantle", sc, "self")),
    P("yangprana", 5, "Semblance of the Scarlet Queen", 106, "yang+rituals", "wall", { yang: 3 }, "The body becomes Yang-spirit and passes into the Yang World, unseen and untouchable by the material.", N("sideways")),
    P("yinprana", 1, "Shrouded Moon", 106, "", 6, { yin: 1 }, "Still or slow in shadow, the vampire is unseen and unheard; only supernatural senses at the vampire's Stealth + 4 find it.", T("veil", "Shrouded Moon", sc, "self")),
    P("yinprana", 2, "Yin Mantle", 106, "", 6, { yin: 1 }, "A dark aura: ghosts warm to the vampire, and a metal weapon channels it in a fight.", T("boost", "Yin Mantle", sc, "self")),
    P("yinprana", 3, "Bone Dance", 107, "stamina+athletics", 7, { yin: 1 }, "Slow dance, a Yin a turn: all around grow sluggish, then open to suggestion.", T("sway", "Bone Dance", sc, "each")),
    P("yinprana", 4, "Eightfold Yin Mantle", 107, "", 6, { yin: 1 }, "Black ice made solid: tools for one Yin, weapons of Strength aggravated (+1 damage a Yin more).", T("make", "Eightfold Yin Mantle", sc, "self")),
    P("yinprana", 5, "Semblance of the Ebon Dragon", 107, "yin+rituals", "wall", { yin: 3 }, "The body becomes Yin and walks the roads of the dead into the Yin World.", N("sideways")),
    ...[1, 2, 3, 4, 5].map(l => P("blackwind", l, `Black Wind ${"•".repeat(l)}`, 107, "", 6, { demon: 1 }, `A Demon Chi a turn: up to ${l} extra action${l === 1 ? "" : "s"}, more speed or automatic Brawl and Melee successes, in any mix.`, T("hasten", "Black Wind", { turns: 1 }, "self"))),
    ...[1, 2, 3, 4, 5].map(l => P("demonshintai", l, `Demon form ${"•".repeat(l)}`, 108, "", 6, { demon: 3 }, `Three turns and three Demon Chi: a demon shape. Charisma and Appearance fall to 0; Physical gains build by level (${["+1 Strength, Dexterity and Stamina", "+1 Strength more", "+1 Stamina more", "+1 Strength more", "+1 Dexterity more"].slice(0, l).join("; ")}).`, T("shape", "Demon form", sc, "self"), { chk: l > 1 })),
    P("bloodshintai", 1, "Permeate", 110, "", 6, { chi: 1 }, "Swells or shrinks the body: soak at difficulty 5, slips through cracks and out of bonds.", T("shape", "Permeate", sc, "self")),
    P("bloodshintai", 2, "Blood Atemi", 110, "dexterity+brawl", 6, { chi: 1 }, "A strike that drives the vampire's Chi-laden blood into the foe.", H("harm", 1, "lethal"), { chk: true }),
    P("bloodshintai", 3, "Flowing like blood", 111, "", 6, { yang: 1 }, "For three turns every attack may be dodged with the full pool, alongside any other action.", T("ward", "Flowing like blood", { turns: 3 }, "self"), { chk: true }),
    P("bloodshintai", 4, "Bloodlash", 111, "dexterity+melee", 6, { chi: 1 }, "A whip of blood, four feet of reach a Chi dot: Strength + 2 aggravated, or a constricting hold.", H("harm", 2, "aggravated", { fixed: true })),
    P("bloodshintai", 5, "Blood that wakes the image", 111, "", 6, { yang: 1 }, "Spat blood wakes a well-made statue (two health levels and a die of each Physical a Yang) or freezes a spirit into jade.", T("summon", "Wakened image", sc, "self"), { chk: true }),
    P("boneshintai", 1, "Corpse Skin", 112, "", 6, { yin: 1 }, "Pallid flesh: two Bruised levels a Yin spent; Social rolls +1 difficulty.", T("ward", "Corpse Skin", sc, "self"), { chk: true }),
    P("boneshintai", 2, "Ghost corpse", 112, "", 6, { yin: 1 }, "Turns invisible for the scene; a Chi more and three turns hides the vampire's things too.", T("veil", "Ghost corpse", sc, "self"), { chk: true }),
    P("boneshintai", 3, "Bone Obedience", 112, "", 6, { yin: 1 }, "Grows bone tools and weapons over three turns: talons of Strength + 2 aggravated for one Yin, blades for two.", T("make", "Bone Obedience", sc, "self")),
    P("boneshintai", 4, "Five Poison Cloud", 112, "", 6, { yin: 2 }, "A ten-foot cloud of freezing black vapour: six dice of aggravated damage to all inside but the vampire.", H("harm", 6, "aggravated", { fixed: true, who: "all" })),
    P("boneshintai", 5, "The ch'ing shih form", 113, "", 6, { yin: 5 }, "Five turns and five Yin: a glowing bone horror for the scene, spikes and blades at will; Appearance 0.", T("shape", "Ch'ing shih form", sc, "self"), { chk: true }),
    P("jadeshintai", 1, "Stand Upon the Dragon's Back", 113, "", 6, {}, "Rooted to the earth: cannot be knocked back, down or thrown.", T("ward", "Rooted", sc, "self"), { chk: true }),
    P("jadeshintai", 2, "Tread the Thrashing Dragon's Tail", 113, "", 6, {}, "Walks on water, walls and ceilings, leaves no tracks; Stealth one easier, falls do half, leaps doubled.", T("move", "Light step", sc, "self")),
    P("jadeshintai", 3, "Placate the Earth Dragon", 113, "manipulation+etiquette", "wall", { chi: 1 }, "Three turns: sinks into the earth, or passes through a wall or floor.", MV()),
    P("jadeshintai", 4, "Harnessing the Dragon's Breath", 113, "dexterity+yang", "wall", {}, "Rides a Chi line through the air at (12 − Wall) × 5 miles an hour.", MV()),
    P("jadeshintai", 5, "Jade Servant of the August Personage", 114, "", 6, { wp: 1, chi: 1 }, "Takes on the mantle of an element touched: armour like heavy body armour plus the element's gifts.", T("ward", "Elemental mantle", sc, "self")),
    P("fleshshintai", 1, "Stretching the flesh", 115, "", 6, {}, "Neck or limbs reach five feet a Stamina dot to bite, strike or grapple.", T("shape", "Stretched limbs", sc, "self"), { chk: true }),
    P("fleshshintai", 2, "Detach Limb", 115, "", 6, { yang: 1 }, "Sends off the head or a hand as a small target (7 to hit in close combat).", T("shape", "Detached limb", sc, "self")),
    P("fleshshintai", 3, "Lotus Cloud", 116, "", 6, { yang: 1 }, "A euphoric breath: mortals in it are giddy, suggestible and take no aggressive action (shen resist with Willpower at 6).", T("sway", "Lotus Cloud", sc, "each")),
    P("fleshshintai", 4, "Pelesit", 117, "", 6, { yang: 1 }, "Tears off a familiar of the vampire's flesh: two health levels and Strength and Stamina 1 for each level given.", T("summon", "Pelesit", sc, "self"), { chk: true }),
    P("fleshshintai", 5, "Ten Thousand Forms", 117, "perception+athletics", 7, { yang: 2 }, "Any human shape, or an animal of like mass; a Yang more for extra arms or wings.", T("shape", "Ten Thousand Forms", sc, "self")),
    P("ghostflameshintai", 1, "Goblin Face", 118, "", 6, {}, "A turn of focus: eyes burn with Chi-flame; sees in the dark and the bite does a die more.", T("sight", "Goblin Face", sc, "self")),
    P("ghostflameshintai", 2, "Goblin Lantern", 118, "", 6, { chi: 1 }, "Floating lights of Ghost-flame under the vampire's control.", T("light", "Goblin Lantern", sc, "self"), { chk: true }),
    P("ghostflameshintai", 3, "Goblin Shapes", 118, "dexterity+crafts", "var", { chi: 1 }, "A human-sized mass of Ghost-flame shaped into forms or illusions anywhere within 500 feet.", T("illusion", "Goblin Shapes", sc, "self")),
    P("ghostflameshintai", 4, "Goblin Scorch", 118, "dexterity+athletics", 6, { chi: 1 }, "A breath of flame: three dice of aggravated damage a Chi spent (Yin-flame burns the soul).", H("harm", 3, "aggravated", { fixed: true })),
    P("ghostflameshintai", 5, "The burning sphere", 118, "", 6, { chi: 3, wp: 1 }, "Three turns: the body becomes a ball of Chi-fire; blows are aggravated and touching it burns.", T("harm", "Chi-fire aura", sc, "self"), { chk: true }),
    P("cultivation", 1, "Sensing the P'o", 119, "perception+hun", 7, {}, "Three turns: reads the dark urges in someone, or quiets one's own P'o (the next soul roll is a point harder for it).", N("know"), { chk: true }),
    P("cultivation", 2, "Cleave the Demon", 120, "willpower", 8, { chi: 1 }, "Hun and P'o separate and act side by side; the P'o works against the vampire.", S("free"), { chk: true }),
    P("cultivation", 3, "Lash the Demon", 120, "manipulation+hun", 6, { wp: 1 }, "Eye contact splits a victim's Hun and P'o; the stronger soul takes over.", T("sway", "Souls split", sc, "one")),
    P("cultivation", 4, "Yoke the Demon", 120, "dexterity+empathy", 8, { wp: 1 }, "Two turns: binds the P'o to serve, watching and frightening lesser things.", S("free"), { chk: true }),
    P("cultivation", 5, "Become One", 121, "charisma+empathy", 8, { wp: 1 }, "Hun and P'o merge for the scene: no fire, wave or shadow soul; Demon Arts with no backlash; mind powers must beat both minds.", T("ward", "Become One", sc, "self")),
    P("dragontear", 1, "Prophetic dreams", 122, "intelligence+portents", "var", {}, "Dreams of what is to come most days; senses those who matter to the Great Cycle.", N("know"), { chk: true }),
    P("dragontear", 2, "Chi Sight", 122, "", 6, { yin: 1, yang: 1 }, "The Dragon Tear opens: Ghostsight, Lifesight and sharpened senses at once, and every spirit near is plain.", T("sight", "Chi Sight", sc, "self")),
    P("dragontear", 3, "Dragon Ward", 122, "willpower", "wall", { wp: 1 }, "No one beyond ten feet may come closer without beating the vampire in a contest of Willpower.", T("ward", "Dragon Ward", sc, "self")),
    P("hun", 2, "Meditation of the still blood", 124, "perception+hun", 6, { chi: 1 }, "An hour or more of meditation regains a Willpower, two on three successes.", N("charge"), { chk: true }),
    P("hun", 3, "Distant Death Kata", 124, "dexterity+martialarts", 6, { wp: 1 }, "A perfect strike at empty air lands on a foe far away; it needs three successes.", H("harm", 1, "bashing"), { chk: true }),
    P("hun", 4, "Iron Soul", 124, "hun", 9, {}, "Three turns: each success makes the next Willpower spent give one more automatic success.", T("boost", "Iron Soul", { turns: 1 }, "self")),
    P("hun", 5, "Beyond the Middle Kingdom", 124, "dharma", 8, { wp: 2 }, "Attuned to the Great Cycle for the scene: no botches and no situational penalties; a weapon in each hand.", T("fortune", "Attuned to the Cycle", sc, "self"), { chk: true }),
    P("obligation", 1, "Evaluate", 124, "perception+empathy", "t", {}, "Reads the state of someone's Hun; more successes, more insight.", N("know")),
    P("obligation", 2, "Soul link", 125, "manipulation+empathy", 6, {}, "A psychic link: a Social die a success on the next roll against them, or one surface thought a success.", N("know"), { chk: true }),
    P("obligation", 3, "Authority", 125, "hun+etiquette", 5, { wp: 1 }, "Lesser souls obey as if to an emperor (difficulty 8 against shen).", T("sway", "Authority", sc, "one")),
    P("obligation", 4, "Thousand Hell Stare", 125, "hun+intimidation", 6, { wp: 1 }, "A stare that judges the soul: an extended contest; the victim falls to terror or despair.", T("fear", "Thousand Hell Stare", sc, "one")),
    P("obligation", 5, "Soul Shackles", 126, "hun+empathy", "t", { wp: 1 }, "A bond of friendship like a Vinculum of 3, and more as the bond is fed.", T("bind", "Soul Shackles", { days: 30 }, "one"))
].map(p => ({ ...p, id: `${p.art}-${p.l}-${p.name.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` }));

export const powersOf = (art, rating) => POWERS.filter(p => p.art === art && p.l <= Number(rating || 0));
export const powerById = id => POWERS.find(p => p.id === id) ?? null;
/** The kote-rules key of a sheet Discipline name (the system's names, or the headings in the book). */
export const artKeyOf = name => {
    const s = String(name ?? "").toLowerCase().replace(/[^a-z]/g, "");
    return Object.keys(ART_LABEL).find(k => s === k || s.startsWith(k) || s.includes(k)) ?? (s.includes("ghostflame") ? "ghostflameshintai" : s.includes("dragonstear") ? "dragontear" : null);
};
/** The cost as text. */
export const costText = c => [c.yin && `${c.yin} Yin`, c.yang && `${c.yang} Yang`, c.chi && `${c.chi} Chi of either kind`, c.demon && `${c.demon} Demon Chi`, c.wp && `${c.wp} Willpower`].filter(Boolean).join(", ") || "nothing";
/** The effects-card items for a power with these successes (one when it needs no roll). */
export function artResults(id, successes, { source = "" } = {}) {
    const p = powerById(id);
    if (!p?.spec) return [];
    const s = p.roll ? Number(successes) || 0 : Math.max(1, Number(successes) || 0);
    if (s < 1) return [];
    return outcomesOf(p.spec, { key: p.spec.kw, label: p.name, source: source || `Kindred of the East p. ${p.p}` }, s, p.fx);
}

const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
/** The dice for a power's roll: get(kind, key) gives a trait ("attr", "virtue" for yin/yang/hun/po/dharma/willpower, "art", "ability"). */
export function poolOf(roll, get) {
    if (!roll) return 0;
    return String(roll).split("+").reduce((sum, k) => {
        const kind = ATTRS.includes(k) ? "attr" : ["yin", "yang", "hun", "po", "dharma", "willpower"].includes(k) ? "virtue" : ART_LABEL[k] ? "art" : "ability";
        return sum + (Number(get(kind, k)) || 0);
    }, 0);
}
/** The difficulty: a number, the local Wall, or 6 where the target's Willpower or the scene sets it. */
export const diffOf = (p, wall = 6) => p.diff === "wall" ? Number(wall) || 6 : typeof p.diff === "number" ? p.diff : 6;
/** The Chi kind and points a power's cost asks of the spend form ("" for either kind). */
export const chiOf = c => c.yin ? { kind: "yin", k: c.yin } : c.yang ? { kind: "yang", k: c.yang } : c.demon ? { kind: "demon", k: c.demon } : c.chi ? { kind: "", k: c.chi } : { kind: "", k: 0 };
