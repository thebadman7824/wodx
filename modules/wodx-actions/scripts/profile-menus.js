/**
 * WoDX Actions — profile menus (v2.0).
 *
 * The launcher shows a different set of buttons for each actor profile (see profiles.js). Menu entries are data:
 *   "api:<name>"     call a function of game.wodxActions (hunt, feed, frenzy...)
 *   "preset:<key>"   open the Action dialog with a dramatic-system preset
 *   "uses:<res>"     spend a resource for one of its listed uses (optionally rolling a pool)
 *   "cantrip"        Changeling cantrip (Changeling 20th, Cantrips)
 *   "cast"           Mage effect (Arete roll; difficulty from the highest Sphere)
 *   "shift"          Werewolf shapeshifting (form table of the W20 sheet)
 *   "regen"          Werewolf regeneration (DA:W p. 102; W20 p. 256)
 *   "rules:<key>"    post a rules reminder card
 * Anything marked [house] is a Storyteller convenience, not printed rules.
 */

import * as P from "./profiles.js";
import * as GX from "./garou.js";
import * as GR from "./garou-rules.js";
import * as TR from "./theme-rules.js";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const WILL = ["uses:willpower", "Willpower", "fa-brain"];

export const MENUS = {
    kindred: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:seduction", "Seduction", "fa-heart"], ["api:hunt", "Hunt", "fa-paw"]]],
            ["Blood", [["api:feed", "Feed on target", "fa-tint"], ["api:spendBlood", "Spend blood", "fa-heartbeat"], ["api:bloodOath", "Blood Oath", "fa-link"]]],
            ["Disciplines and Road", [["api:useDiscipline", "Use a Discipline", "fa-hand-sparkles"], ["api:setRoad", "Road and Path", "fa-road"], ["api:downtime", "Downtime and domain", "fa-hourglass-half"]]],
            ["The Beast", [["api:frenzy", "Frenzy", "fa-fire-alt"], ["api:rotschreck", "Rötschreck", "fa-running"], ["api:endFrenzy", "End frenzy", "fa-hand-paper"], ["api:sin", "Sin / degeneration", "fa-balance-scale"]]],
            ["Night and day", [["api:daytime", "Awaken by day", "fa-sun"], ["api:hazard", "Sun / fire / fall", "fa-burn"], ["api:sunAndHaven", "Sun and haven", "fa-house-user"], ["api:torpor", "Torpor", "fa-bed"], ["api:diablerie", "Diablerie", "fa-skull"]]],
            ["Court and chronicle (GM)", [["api:boons", "Prestation (boons)", "fa-handshake"], ["api:masquerade", "Masquerade and witnesses", "fa-mask"], ["api:skyAndSun", "Sky and sun", "fa-cloud-sun"], ["api:endStory", "End of story", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], ["api:newNight", "New night (GM)", "fa-moon"], WILL]]
        ]
    },
    ghoul: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:seduction", "Seduction", "fa-heart"]]],
            ["Vitae", [["uses:blood", "Spend vitae", "fa-tint"], ["api:useDiscipline", "Use a Discipline", "fa-hand-sparkles"], ["rules:ghoul", "Ghoul rules", "fa-book"], ["api:bloodOath", "Blood Oath / bond", "fa-link"], ["api:ghoulBlood", "Drink, withdrawal, day (V20)", "fa-wine-glass"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["api:frenzy", "Fear / frenzy check", "fa-fire-alt"], ["api:healing", "Healing", "fa-band-aid"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    mortal: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:seduction", "Seduction", "fa-heart"], ["api:kinfolk", "Kinfolk", "fa-users"]]],
            ["Faith and the uncanny", [["api:imbue", "The Imbuing (GM, 1999 on)", "fa-bolt"], ["api:trueFaith", "True Faith", "fa-cross"], ["api:numina", "Psychic Numina", "fa-eye"], ["api:hedgeMagic", "Hedge magic (Sorcerer)", "fa-book-open"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["api:healing", "Healing", "fa-band-aid"], ["rules:mortal", "Mortal rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    hunter: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:seduction", "Seduction", "fa-heart"]]],
            ["The hunter", [["api:hunterSheet", "Hunter traits", "fa-id-card"], ["api:hunterPower", "Blessing / Edge", "fa-hand-sparkles"], ["api:hunterVirtue", "Virtue roll / second sight", "fa-shield-alt"], ["api:imbue", "The Imbuing (GM, 1999 on)", "fa-bolt"]]],
            ["Faith and conviction", [["api:trueFaith", "True Faith", "fa-cross"], ["api:prayer", "Prayer", "fa-praying-hands"], ["api:sinGod", "A sin (Piety)", "fa-balance-scale"], ["api:relic", "Holy relic", "fa-gem"], ["api:bankConviction", "Bank Conviction", "fa-piggy-bank"], ["uses:conviction", "Conviction", "fa-fist-raised"]]],
            ["Numina", [["api:numina", "Psychic Numina", "fa-eye"], ["api:hedgeMagic", "Hedge magic (Sorcerer)", "fa-book-open"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["api:healing", "Healing", "fa-band-aid"], ["rules:mortal", "Mortal rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    lupine: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["preset:primalurge", "Primal-Urge (senses)", "fa-nose"], ["preset:trackscent", "Track by scent", "fa-paw"]]],
            ["Rage", [["api:rageRoll", "Rage roll (frenzy test)", "fa-fire-alt"], ["api:spendRage", "Spend or regain Rage", "fa-bolt"],
                ["api:garouEndFrenzy", "End frenzy", "fa-hand-paper"], ["api:remainActive", "Rise on Rage (below Incapacitated)", "fa-heart-broken"]]],
            ["Gifts and Gnosis", [["api:useGift", "Use a Gift", "fa-star"], ["api:learnGift", "Learn a Gift", "fa-book-open"],
                ["api:useFetish", "Fetish or talen", "fa-gem"], ["api:meditate", "Meditate (regain Gnosis)", "fa-moon"]]],
            ["Rites and spirits", [["api:performRite", "Perform a rite", "fa-circle-notch"], ["api:summonSpirit", "Summon a spirit", "fa-ghost"],
                ["api:chiminage", "Chiminage (spirit debts)", "fa-handshake"]]],
            ["Body", [["api:shiftForm", "Change form", "fa-dog"], ["regen", "Regenerate", "fa-heartbeat"], ["api:hazard", "Fire / fall / silver", "fa-burn"],
                ["api:battleScar", "Battle Scar", "fa-band-aid"], ["api:healing", "Healing with time", "fa-clock"]]],
            ["Renown and witnesses", [["api:accomplishment", "Rite of Accomplishment", "fa-medal"], ["api:awardRenown", "Award Renown (GM)", "fa-award"],
                ["api:curse", "The Curse (target a human)", "fa-user-slash"], ["api:delirium", "The Delirium (GM, witnesses)", "fa-eye"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    mage: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["preset:researchmage", "Research / lore", "fa-book-open"]]],
            ["Magick", [["cast", "Cast an effect (Arete)", "fa-hat-wizard"], ["api:m20Counter", "Countermagick / resist", "fa-shield-alt"], ["uses:quintessence", "Quintessence", "fa-gem"], ["uses:paradox", "Paradox", "fa-bolt"], ["api:m20Backlash", "Paradox backlash (GM)", "fa-meteor"]]],
            ["Sorcery and Numina", [["api:hedgeMagic", "Hedge magic (Sorcerer)", "fa-book-open"], ["api:numina", "Psychic Numina", "fa-eye"], ["api:trueFaith", "True Faith", "fa-cross"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["api:healing", "Healing", "fa-band-aid"], ["rules:mage", "Mage rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    /** Dark Ages: Mage (3.7.0): Foundation and Pillars instead of Arete and Spheres. */
    mageDA: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["preset:researchmage", "Research / lore", "fa-book-open"]]],
            ["Magic", [["api:daCast", "Cast a spell (Foundation + Pillar)", "fa-hat-wizard"], ["api:daMage", "Fellowship and Pillars", "fa-scroll"],
                ["api:daQuintessence", "Gather Quintessence (cray, Fount)", "fa-gem"], ["uses:quintessence", "Quintessence", "fa-coins"]]],
            ["Sorcery and Numina", [["api:numina", "Psychic Numina", "fa-eye"], ["api:trueFaith", "True Faith", "fa-cross"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["api:healing", "Healing", "fa-band-aid"], ["rules:mage", "Mage rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    /** Dark Ages: Fae (3.8.0): Mists, Weaving and the Dominions instead of Glamour and the Arts. */
    faeDA: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:seduction", "Seduction / glamour", "fa-heart"]]],
            ["Dominions", [["api:daCantrip", "Cast a cantrip (Dominion + trait)", "fa-wand-magic-sparkles"], ["api:daUnleash", "Unleash a Dominion", "fa-bolt"],
                ["api:daCounter", "Counter a cantrip or Unleashing", "fa-shield-alt"], ["api:daFae", "Origin and Court", "fa-scroll"]]],
            ["The Mists", [["api:daMists", "The Mists (hide, cloak, Kenning)", "fa-smog"], ["api:daMien", "Take or drop the mien", "fa-mask"],
                ["api:daOath", "Keep an oath (Weaving)", "fa-handshake"], ["api:daRest", "Rest in a faerie realm", "fa-tree"]]],
            ["Danger", [["api:daEcho", "Face an Echo", "fa-bell"], ["api:daColdIron", "Struck by cold iron", "fa-burn"], ["api:hazard", "Fire / fall", "fa-fire"], ["rules:faeDA", "Fae rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    fae: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:seduction", "Seduction / glamour", "fa-heart"]]],
            ["Glamour", [["cantrip", "Weave a cantrip", "fa-wand-magic-sparkles"], ["api:c20Unleash", "Unleash an Art", "fa-bolt"], ["api:c20Invoke", "Invoke the Wyrd or the Autumn", "fa-mask"],
                ["api:c20Epiphany", "Epiphany (gather Glamour)", "fa-star"], ["uses:glamour", "Glamour", "fa-coins"]]],
            ["Banality", [["api:c20Trigger", "A Banality trigger", "fa-cloud"], ["api:c20Mists", "The Mists (memory)", "fa-smog"], ["uses:banality", "Banality", "fa-cloud-rain"]]],
            ["Danger", [["api:c20Bedlam", "Nightmare and Bedlam", "fa-dizzy"], ["api:c20ColdIron", "Struck by cold iron", "fa-burn"], ["api:hazard", "Fire / fall", "fa-fire"], ["rules:fae", "Changeling rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    wraith: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:useArcanos", "Use an Arcanos", "fa-ghost"]]],
            ["Passions and Fetters", [["api:passion", "Passion", "fa-heart"], ["api:fetter", "Fetter", "fa-link"], ["api:memoriam", "Memoriam", "fa-book-dead"], ["uses:pathos", "Pathos", "fa-fire-alt"]]],
            ["Corpus", [["api:healCorpus", "Heal Corpus", "fa-band-aid"], ["api:caul", "The Caul", "fa-baby"]]],
            ["The Shadow", [["api:shadow", "The Shadow (Shadowguide)", "fa-mask"], ["api:shadowWhisper", "Whisper", "fa-comment-dots"], ["api:harrowing", "Harrowing", "fa-skull"], ["api:shadowguide", "Assign the Shadowguide (GM)", "fa-user-secret"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["api:hysteria", "Hysteria (GM)", "fa-exclamation-triangle"], ["api:maelstrom", "The Maelstrom (GM)", "fa-wind"], ["rules:wraith", "Wraith rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    spirit: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"]]],
            ["Essence", [["uses:essence", "Essence", "fa-sparkles"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    beast: {
        sections: [
            ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["preset:trackscent", "Track by scent", "fa-paw"], ["preset:sneaking", "Sneak / stalk", "fa-user-secret"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["rules:beast", "Creature rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    }
};

/** Demon: The Fallen (3.10.0, Phase 6i). */
MENUS.demon = {
    sections: [
        ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:seduction", "Seduction", "fa-heart"]]],
        ["Faith", [["api:demonEvoke", "Evoke (a lore)", "fa-hand-sparkles"], ["api:demonForm", "The apocalyptic form", "fa-dragon"], ["api:demonRevelation", "Revelation (a witness)", "fa-eye"],
            ["api:demonReap", "Reap Faith", "fa-hand-holding"], ["api:demonThralls", "Thralls and pacts", "fa-users"], ["api:demonHeal", "Heal with Faith", "fa-band-aid"]]],
        ["Torment", [["api:demonSin", "A sin (Virtue at 8)", "fa-balance-scale"], ["api:demonKindness", "An act of kindness", "fa-dove"], ["uses:torment", "Torment", "fa-fire"]]],
        ["Danger", [["api:demonHoly", "Holy ground / sacred object", "fa-cross"], ["api:demonName", "A name is spoken", "fa-comment"], ["api:demonIllusion", "See through illusion", "fa-low-vision"],
            ["api:hazard", "Fire / fall", "fa-burn"], ["rules:demon", "Demon rules", "fa-book"]]],
        ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
    ]
};

/** Kindred of the East (3.10.0, Phase 6j): the Kuei-jin, on the system's vampire sheet set to Kindred of the East. */
MENUS.kote = {
    sections: [
        ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:seduction", "Seduction", "fa-heart"], ["api:hunt", "Hunt", "fa-paw"]]],
        ["Chi", [["api:kotFeed", "Feed (flesh, blood, breath)", "fa-tint"], ["api:kotSpend", "Spend Chi / a Discipline", "fa-yin-yang"], ["api:kotHeal", "Heal with Chi", "fa-band-aid"],
            ["api:kotSight", "Ghostsight, Lifesight, Hun", "fa-eye"], ["api:kotSetup", "Dharma, direction, P'o", "fa-scroll"]]],
        ["The Demon", [["api:kotNature", "Fire, wave or shadow soul", "fa-fire-alt"], ["api:kotDemon", "Demon Chi and the rage", "fa-dragon"], ["api:kotDharma", "A Dharma roll", "fa-balance-scale"]]],
        ["Night and day", [["api:kotRise", "Rise at dusk", "fa-moon"], ["api:kotSun", "Sunlight", "fa-sun"], ["api:hazard", "Fire / fall", "fa-burn"], ["rules:kote", "Kuei-jin rules", "fa-book"]]],
        ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
    ]
};

/** Mummy: The Resurrection (3.10.0, Phase 6k). */
MENUS.mummy = {
    sections: [
        ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:seduction", "Seduction", "fa-heart"]]],
        ["Hekau", [["api:mummyCast", "Work Hekau (spell or ritual)", "fa-ankh"], ["api:mummySekhem", "Regain Sekhem", "fa-sun"], ["uses:sekhem", "Sekhem", "fa-coins"], ["api:mummySetup", "Amenti and the Web", "fa-scroll"]]],
        ["Ma'at", [["api:mummyBalance", "Balance (conviction, counter, forbid)", "fa-balance-scale"], ["api:mummyOffense", "An offense against Ma'at", "fa-gavel"]]],
        ["Death and life", [["api:mummyResurrect", "The resurrection", "fa-redo"], ["api:mummyVeil", "The Veil (a witness)", "fa-eye-slash"], ["api:hazard", "Fire / fall", "fa-burn"], ["rules:mummy", "Mummy rules", "fa-book"]]],
        ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
    ]
};

/** Orpheus (3.10.0, Phase 6l): the crucible, on the system's mortal sheet set to Orpheus. */
MENUS.orpheus = {
    sections: [
        ["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"], ["api:seduction", "Seduction", "fa-heart"]]],
        ["The spook", [["api:orphHorror", "Use a Horror", "fa-ghost"], ["api:orphVitality", "Vitality (rest, share, tap)", "fa-heartbeat"], ["api:orphProject", "Projection (skimmers)", "fa-bed"], ["api:orphSetup", "Shade, Lament, Horrors", "fa-id-card"]]],
        ["Danger", [["api:orphHarm", "Harm to the spook", "fa-skull"], ["api:orphSpite", "Spite", "fa-angry"], ["api:hazard", "Fire / fall", "fa-burn"], ["rules:orpheus", "Orpheus rules", "fa-book"]]],
        ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
    ]
};

// Generic menus for the profiles without a sourcebook in the library: roll, their own traits, scene.
for (const [k, res] of [
    ["exalted", [["uses:essence", "Essence", "fa-sun"]]]]) {
    MENUS[k] = { sections: [["Roll", [["action", "Any roll / dramatic system", "fa-dice-d10"], ["api:quickCheck", "Common checks", "fa-search"]]], ["Traits", res],
        ["Danger", [["api:hazard", "Fire / fall", "fa-burn"]]], ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]] };
}

/* The inner voice (Phase 6d): the voiced lines get its panel; everyone gets the list of voices they play. */
for (const [k, m] of Object.entries(MENUS)) {
    const scene = m.sections.find(([t]) => t === "Scene");
    if (!scene) continue;
    if (["kindred", "ghoul", "lupine", "wraith", "hunter"].includes(k)) scene[1].unshift(["api:innerVoice", "The inner voice", "fa-comment-dots"]);
    scene[1].push(["api:voices", "Voices I play", "fa-theater-masks"]);
}

/** Pool presets added to the Action dialog by the profile menus. */
export const EXTRA_PRESETS = {
    primalurge: { label: "Primal-Urge senses (Per + Primal-Urge)", attr: "perception", ability: "primalurge", diff: 6, note: "Heightened senses, spotting spirits, and the like (W20)." },
    trackscent: { label: "Track by scent (Per + Survival)", attr: "perception", ability: "survival", diff: 6, note: "Lupus, Hispo and Crinos senses: -1 difficulty at the Storyteller's discretion." },
    researchmage: { label: "Research (Int + Occult / Enigmas)", attr: "intelligence", ability: "occult", diff: 6 },
    arcanos: { label: "Arcanos (Attribute + Arcanos)", attr: "manipulation", ability: "", diff: 6, note: "Pick the Arcanos as the ability if it is on the sheet; Pathos cost per Art is on the Pathos button." }
};

/** Resource uses: [label, cost, roll?, note]. roll = { pool: resource id | "attr+ability", diff }. */
export const USES = {
    willpower: { title: "Willpower", uses: [
        ["Automatic success on a roll", 1, null, "One Willpower point = one automatic success (cannot be canceled by 1s). One per turn."],
        ["Ignore wound penalties for the scene", 1, null, "VtDA20 p. 321."],
        ["Resist Dominate / compulsion", 1, null, "Per the power; roll Willpower if the rule asks."],
        ["Regain Willpower (rest / ST award)", -1, null, "Cost -1 adds a point."]
    ] },
    blood: { title: "Vitae", uses: [
        ["Heal bashing or lethal damage (1 vitae per level)", 1, null, "Ghouls and revenants heal as the Storyteller allows (G&R)."],
        ["Increase a Physical Attribute (+1 die)", 1, null, "For one action or turn."]
    ] },
    rage: { title: "Rage", uses: [
        ["Extra action (declare at the start of the turn)", 1, null, "Max Rage spent for actions per turn = half permanent Rage. Rage and Gnosis cannot both be used in one turn. (W20 p. 144, 266)"],
        ["Change form instantly (no Stamina + Primal-Urge roll)", 1, null, "W20 p. 144, 285."],
        ["Ignore being stunned", 1, null, "Lost more health levels than Stamina in one turn: W20 p. 144."],
        ["Remain active below Incapacitated (Rage roll, diff 8)", 0, { pool: "rage", diff: 8 }, "Each success heals a health level of any type; once per scene; leaves a Battle Scar; frenzy risk. (W20 p. 144)"],
        ["Rage roll (frenzy test)", 0, { pool: "rage", diff: 6 }, "4 or more successes: the Garou enters frenzy (W20 p. 144, 261). Difficulty depends on provocation."],
        ["Regain Rage (provocation / the moon)", -1, null, "Cost -1 adds a point."]
    ] },
    gnosis: { title: "Gnosis", uses: [
        ["Activate a Gift or fetish", 1, null, "Spend 1 Gnosis (some Gifts ask for none). Not in the same turn as Rage."],
        ["Step sideways (Gnosis roll, diff = Gauntlet)", 0, { pool: "gnosis", diff: 6 }, "Difficulty = local Gauntlet (caern 3, city up to 8)."],
        ["Spirit bargain: gain Gnosis", -1, null, "Cost -1 adds a point."]
    ] },
    glamour: { title: "Glamour", uses: [
        ["Wyrd cantrip (use the cantrip button)", 1, null, "Chimerical cantrips cost nothing; Wyrd cantrips cost 1 Glamour (Changeling 20th)."],
        ["Heal a health level [house]", 1, null, "Storyteller's option."],
        ["Reap Glamour (Rapture / dreamers)", -1, null, "Cost -1 adds a point."]
    ] },
    banality: { title: "Banality", uses: [
        ["Banality check (Banality roll)", 0, { pool: "banality", diff: 6 }, "Roll the permanent Banality rating; the Storyteller sets the consequence."],
        ["Gain a Banality point", -1, null, ""]
    ] },
    quintessence: { title: "Quintessence", uses: [
        ["Pay for an effect (Quintessence)", 1, null, "Spend what the effect asks; extra points add dice only as a [house] option."],
        ["Gain Quintessence (node, Prime channel)", -1, null, "Cost -1 adds a point (over the Pattern's limit it becomes Paradox)."]
    ] },
    paradox: { title: "Paradox", uses: [
        ["Gain Paradox points (vulgar magick, ST ruling)", -1, null, "Adds to Paradox (cost -1 = +1). Release a Backlash when the Storyteller says so."],
        ["Shed Paradox (Backlash resolved, Seeking)", 1, null, ""]
    ] },
    pathos: { title: "Pathos", uses: [
        ["Pay for an Arcanos (cost per Art)", 1, null, "Arcanoi cost the Pathos listed in the Art."],
        ["Manifest / Embody [house cost]", 1, null, ""],
        ["Gain Pathos (Passion / Fetter)", -1, null, "Cost -1 adds a point."]
    ] },
    corpus: { title: "Corpus", uses: [
        ["Lose a Corpus point (ST ruling)", 1, null, "Combat damage uses the health track; use this for Harrowing and other ST-ruled losses."],
        ["Regain Corpus", -1, null, "Cost -1 adds a point."]
    ] },
    angst: { title: "Angst", uses: [
        ["Shadow tempts (Angst roll)", 0, { pool: "angst", diff: 6 }, "The Shadow's player rolls permanent Angst; the Storyteller sets the temptation."],
        ["Gain Angst", -1, null, ""]
    ] },
    essence: { title: "Essence", uses: [
        ["Spend Essence (power or Charm)", 1, null, ""],
        ["Regain Essence", -1, null, "Cost -1 adds a point."]
    ] },
    faith: { title: "Faith", uses: [
        ["Spend Faith (hand of God / Edge)", 1, null, ""],
        ["Regain Faith", -1, null, ""]
    ] },
    conviction: { title: "Conviction", uses: [
        ["Spend Conviction (Edge)", 1, null, ""],
        ["Regain Conviction", -1, null, ""]
    ] },
    torment: { title: "Torment", uses: [["Torment surge (ST ruling)", 0, { pool: "torment", diff: 6 }, ""], ["Gain Torment", -1, null, ""]] },
    sekhem: { title: "Sekhem", uses: [["Spend Sekhem", 1, null, ""], ["Regain Sekhem", -1, null, ""]] },
    balance: { title: "Balance", uses: [["Balance check", 0, { pool: "balance", diff: 6 }, ""], ["Shift Balance", -1, null, ""]] }
};

/** W20 character-sheet form table. */
export const FORMS = {
    homid:  { label: "Homid",  mods: "No change", diff: 6 },
    glabro: { label: "Glabro", mods: "Strength +2, Stamina +2, Appearance -1, Manipulation -2", diff: 7 },
    crinos: { label: "Crinos", mods: "Strength +4, Dexterity +1, Stamina +3, Manipulation -3 (Appearance 0)", diff: 6 },
    hispo:  { label: "Hispo",  mods: "Strength +3, Dexterity +2, Stamina +3, Manipulation -3, +1 die to bite damage", diff: 7 },
    lupus:  { label: "Lupus",  mods: "Strength +1, Dexterity +2, Stamina +2, Manipulation -3, -2 Perception difficulty", diff: 6 }
};

export const RULES = {
    ghoul: "<b>Ghouls and revenants</b> soak bashing and lethal damage with Stamina (+ Fortitude); ghouls gain this after the third sip of Blood. Aggravated damage affects them as a mortal. Elder ghouls and old revenants may soak bashing as a vampire does (halved): mark the actor with the <i>elder</i> flag. A ghoul without a regular sip of vitae loses its powers and ages. (Ghouls &amp; Revenants p. 262)",
    mortal: "<b>Mortals</b> soak bashing with Stamina; lethal and aggravated damage only with armor, and aggravated damage counts as lethal. (VtDA20 p. 345)",
    beast: "<b>Creatures</b> use the mortal soak rules. Natural weapons (claws, bite, horns) are listed on the sheet as <i>natural</i> weapons; set the Creature profile on any animal for the animal menu.",
    mage: "<b>Mages</b> cannot soak lethal or aggravated damage without armor, protection or magick (Mage 20 p. 334). Coincidental magick: difficulty = highest Sphere + 3. Vulgar without witnesses: +4. Vulgar with witnesses: +5. Use the <i>Cast</i> button; Paradox for vulgar effects is set by the Storyteller.",
    faeDA: "<b>Dark Ages fae</b> soak lethal damage only in the fae mien. Cold iron does aggravated damage (soakable) and costs a Mists point per wound. A cantrip: Dominion + the trait it names, difficulty 6; −1 each for the Court's Dominion, its hour and its season; never below 4. Unleashing: Mists + Dominion against 5 Unleashing dice (3 for firstborn), Weaving removes them. Echoes: the mortal's Willpower (7) or 5 dice, less oath successes (Dark Ages: Fae pp. 88, 104, 110–122).",
    orpheus: "<b>Spooks</b> (ghosts and projected souls) have no health levels: wounds come off Vitality; a skimmer's come out in the body as bashing. At zero Vitality a Willpower point is spent at once for three; at zero of both the spook dissipates. Three Vitality spent in a turn is felt three blocks off, five draws Spectres from five. Spite at or above the starting Vitality: +1 difficulty (Orpheus pp. 190–193).",
    mummy: "<b>The Reborn</b> soak bashing and lethal with Stamina, never aggravated (save by Hekau); fire is aggravated, no worse. Lethal heals one level faster than a mortal's. Past Incapacitated the khat has five more levels; the resurrection is Willpower + Ba (a permanent Sekhem) or Sekhem + Ba (a permanent Willpower) at 8. A spell: the path + its Trait; Sekhem spent either way (Mummy: The Resurrection pp. 78, 136–138).",
    kote: "<b>Kuei-jin</b> take aggravated damage from fire, most Chi-based attacks and the claws and fangs of shen; they heal as Kindred with Chi for blood. The sun allows (Stamina − Yin Chi) minutes a day, then rots. Chi a turn follows the Dharma (1 to Dharma 3, 2 at 4–5, 3 at 6). Fire soul: Yin against the P'o; wave soul: Yang; shadow soul: Hun (Kindred of the East pp. 54, 134–151).",
    demon: "<b>The fallen</b> soak bashing with Stamina; in the apocalyptic form, lethal too; never aggravated (without a power for it). Faith heals all bashing or one lethal level a point, never aggravated. An evocation: its Attribute + Ability at 6; Faith spent buys successes; a success die showing the permanent Torment or less brings the high-Torment effect. Torment 4 or more burns on holy ground (Demon: The Fallen pp. 161, 170–171, 248, 254).",
    fae: "<b>Changelings</b> soak as mortals (bashing only). Cold iron inflicts aggravated damage and a changeling has no natural defense against it (a Balor has only a difficulty-10 chance). Chimerical damage affects only chimerical beings; Banality eats Glamour. Cantrip: Art + lowest primary Realm, difficulty 8 before modifiers (Changeling 20th).",
    wraith: "<b>Wraiths</b> are immune to Stun damage; a corporeal wraith suffers lethal damage only through Corpus. Corpus loss ends in a Harrowing or Oblivion. House soak in this module: Stamina against bashing and lethal, armor only against aggravated damage."
};

/* ------------------------------------------------------------------ */
/*  Engine                                                             */
/* ------------------------------------------------------------------ */

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num = v => { const n = parseInt(v); return Number.isFinite(n) ? n : 0; };

export function build(ctx) {
    const { post, rollPool, rollBlock, resultLine, diceHtml, API, action, updateActor, willpower, attr, findAbility, setting } = ctx;

    async function pay(actor, resId, cost) {
        if (!cost) return null;
        if (resId === "willpower") {
            if (cost > 0) { if (!(await ctx.spendWillpower(actor, cost))) return false; return `${actor.name} spends ${cost} Willpower.`; }
            const w = willpower(actor);
            if (setting("spendResources")) await updateActor(actor, { "system.advantages.willpower.temporary": Math.min(w.perm, w.temp - cost) });
            return `${actor.name} regains ${-cost} Willpower.`;
        }
        const r = P.resource(actor, resId);
        if (!r.ok) { ctx.notify(`${actor.name} has no ${r.label} trait on the sheet: change it by hand.`); return null; }
        if (cost > 0 && r.value < cost) { ctx.notify(`${actor.name} has only ${r.value} ${r.label}.`); return false; }
        if (!setting("spendResources")) return `${r.label}: ${cost > 0 ? "spend" : "gain"} ${Math.abs(cost)} (not deducted: setting off)`;
        return await P.adjust(actor, resId, -cost);
    }

    function poolDice(actor, spec) {
        if (spec.pool === "willpower") return { dice: willpower(actor).perm, label: "Willpower" };
        const r = P.resource(actor, spec.pool);
        return { dice: r.perm || r.max || r.value, label: r.label };
    }

    /** "Use a resource" dialog. */
    async function uses(actor, resId) {
        const def = USES[resId];
        if (!def) return;
        const r = resId === "willpower" ? { ok: true, value: willpower(actor).temp, max: willpower(actor).perm, label: "Willpower" } : P.resource(actor, resId);
        const options = def.uses.map((u, i) => `<option value="${i}">${esc(u[0])}</option>`).join("");
        const content = `<form class="vta-uses"><p><b>${esc(actor.name)}</b>: ${esc(def.title)}: ${r.ok ? `${r.value}${r.max ? ` / ${r.max}` : ""}` : "<i>not on the sheet</i>"}</p>
          <div class="form-group"><label>Use</label><select name="use" data-fixed>${options}</select></div>
          <div class="form-group"><label>Points (negative gains)</label><input type="number" name="cost" value="${def.uses[0][1]}"/></div>
          <div class="form-group"><label>Roll difficulty / bonus dice</label><input type="number" name="diff" value="${def.uses.find(u => u[2])?.[2]?.diff ?? 6}" style="width:4em"/> <input type="number" name="bonus" value="0" style="width:4em"/></div>
          <p class="vta-note vta-use-note">${esc(def.uses[0][3] ?? "")}</p></form>`;
        return ctx.dialog(`${def.title}: ${actor.name}`, content, "Use", async fd => {
            const u = def.uses[num(fd.use)];
            const note = await pay(actor, resId, fd.cost);
            if (note === false) return null;
            let body = note ? `<div class="vta-parts">${esc(note)}</div>` : "";
            const rolls = [];
            if (u[2]) {
                const pool = poolDice(actor, u[2]);
                const rr = await rollPool(Math.max(0, pool.dice + fd.bonus), fd.diff);
                if (rr.roll) rolls.push(rr.roll);
                body += rollBlock(`${pool.label} roll`, rr, [`${pool.label} ${pool.dice}`, fd.bonus ? `bonus ${fd.bonus}` : ""].filter(Boolean));
            }
            if (u[3]) body += `<div class="vta-note">${esc(u[3])}</div>`;
            return post(actor, `${actor.name}: ${esc(u[0])}`, body, rolls);
        }, {
            render: root => {
                const sel = root.querySelector("[name=use]"), cost = root.querySelector("[name=cost]"), note = root.querySelector(".vta-use-note");
                sel?.addEventListener("change", () => { const u = def.uses[num(sel.value)]; cost.value = u[1]; note.textContent = u[3] ?? ""; });
            }
        });
    }

    /** Changeling cantrip: Art + lowest primary Realm, base difficulty 8 (Changeling 20th). */
    async function cantrip(actor) {
        const g = P.resource(actor, "glamour");
        const content = `<form><p><b>${esc(actor.name)}</b>: Glamour ${g.ok ? `${g.value}/${g.max}` : "—"}, Nightmare ${P.resource(actor, "nightmare").value}</p>
          <div class="form-group"><label>Art rating (level used)</label><input type="number" name="art" value="1" min="0" max="5"/></div>
          <div class="form-group"><label>Lowest primary Realm used</label><input type="number" name="realm" value="1" min="0" max="5"/></div>
          <div class="form-group"><label>Realms or levels not possessed ("cheated")</label><input type="number" name="cheat" value="0" min="0"/></div>
          <div class="form-group"><label>Cantrip type</label><select name="type"><option value="chimerical">Chimerical (free)</option><option value="wyrd">Wyrd (1 Glamour)</option></select></div>
          <fieldset><legend>Difficulty (base 8)</legend>
          <div class="form-group"><label><input type="checkbox" name="tBan"/> Target's Banality above 7 (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="lBan"/> Location Banality above 7 (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="scene"/> Scene Realm used (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="time"/> Time Realm used (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="title"/> Targets a changeling of higher Title without consent (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="nm"/> Replace at least 3 dice with Nightmare dice (-1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="freehold"/> Cast in a freehold (-1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="kinain"/> Cast on an enchanted mortal or Kinain (-1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="affinity"/> Kith's affinity Realm (-1)</label></div>
          <div class="form-group"><label>Bunk (-1 to -5, enter 0-5)</label><input type="number" name="bunk" value="0" min="0" max="5"/></div>
          </fieldset>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div></form>`;
        return ctx.dialog(`Cantrip: ${actor.name}`, content, "Weave", async fd => {
            let diff = 8 + (fd.tBan ? 1 : 0) + (fd.lBan ? 1 : 0) + (fd.scene ? 1 : 0) + (fd.time ? 1 : 0) + (fd.title ? 1 : 0)
                - (fd.nm ? 1 : 0) - (fd.freehold ? 1 : 0) - (fd.kinain ? 1 : 0) - (fd.affinity ? 1 : 0) - Math.min(5, Math.max(0, fd.bunk));
            const cost = (fd.type === "wyrd" ? 1 : 0) + fd.cheat;
            const note = await pay(actor, "glamour", cost);
            if (note === false) return null;
            if (fd.wp && !(await ctx.spendWillpower(actor, 1))) return null;
            const dice = fd.art + fd.realm;
            const rr = await rollPool(dice, diff, { willpower: !!fd.wp });
            const body = (note ? `<div class="vta-parts">${esc(note)}</div>` : "")
                + rollBlock(`Cantrip: Art ${fd.art} + Realm ${fd.realm}`, rr, [`${fd.type === "wyrd" ? "Wyrd" : "chimerical"} cantrip`, `difficulty ${diff} (base 8)`, cost ? `${cost} Glamour` : "no Glamour"])
                + `<div class="vta-note">Replace dice with Nightmare dice equal to the Nightmare rating if it is above 0. Each success sets the strength of the Art's effect; Unleashing ignores Realms. A botch is a Banality backlash.</div>`;
            return post(actor, `${actor.name} weaves a cantrip`, body, [rr.roll].filter(Boolean));
        });
    }

    /** Mage effect: Arete roll, difficulty from the highest Sphere used (Mage 20 p. 3xx). */
    async function cast(actor) {
        const arete = P.resource(actor, "arete");
        const q = P.resource(actor, "quintessence");
        const content = `<form><p><b>${esc(actor.name)}</b>: Arete ${arete.value || arete.perm || 0}, Quintessence ${q.ok ? q.value : "—"}</p>
          <div class="form-group"><label>Highest Sphere used</label><input type="number" name="sphere" value="2" min="1" max="5"/></div>
          <div class="form-group"><label>Kind of effect</label><select name="kind">
            <option value="3">Coincidental (Sphere + 3)</option><option value="4">Vulgar, no witnesses (Sphere + 4)</option><option value="5">Vulgar, with witnesses (Sphere + 5)</option></select></div>
          <div class="form-group"><label>Difficulty modifier (focus, tools, ritual...)</label><input type="number" name="mod" value="0"/></div>
          <div class="form-group"><label>Bonus dice (instruments, assistance)</label><input type="number" name="bonus" value="0"/></div>
          <div class="form-group"><label>Quintessence spent</label><input type="number" name="quint" value="0" min="0"/></div>
          <div class="form-group"><label>Paradox gained (Storyteller)</label><input type="number" name="paradox" value="0" min="0"/></div>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div></form>`;
        return ctx.dialog(`Cast an effect: ${actor.name}`, content, "Cast", async fd => {
            const diff = Math.min(10, Math.max(2, fd.sphere + num(fd.kind) + fd.mod));
            if (fd.quint) { const n = await pay(actor, "quintessence", fd.quint); if (n === false) return null; }
            if (fd.wp && !(await ctx.spendWillpower(actor, 1))) return null;
            const aret = arete.perm || arete.value || 0;
            const rr = await rollPool(Math.max(0, aret + fd.bonus), diff, { willpower: !!fd.wp });
            let body = rollBlock(`Arete ${aret}`, rr, [`difficulty ${diff} (Sphere ${fd.sphere} + ${fd.kind})`, fd.bonus ? `bonus ${fd.bonus}` : ""].filter(Boolean));
            if (fd.paradox) { const p = await P.adjust(actor, "paradox", fd.paradox); if (p) body += `<div class="vta-parts">${esc(p)}</div>`; }
            if (rr.botch) body += `<div class="vta-warn">Botch: the Storyteller adds Paradox and a Backlash.</div>`;
            else if (!rr.successes) body += `<div class="vta-note">The effect fails. The Storyteller may add Paradox for a failed vulgar effect.</div>`;
            return post(actor, `${actor.name} works magick`, body, [rr.roll].filter(Boolean));
        });
    }

    /** Werewolf shapeshifting. */
    async function shift(actor) {
        const cur = P.worldFlag(actor, "form") || "homid";
        const rage = P.resource(actor, "rage");
        const content = `<form><p><b>${esc(actor.name)}</b> is in <b>${FORMS[cur]?.label ?? cur}</b> form. Rage ${rage.ok ? rage.value : "—"}.</p>
          <div class="form-group"><label>Change to</label><select name="form" data-fixed>${Object.entries(FORMS).map(([k, f]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${f.label} (diff ${f.diff})</option>`).join("")}</select></div>
          <div class="form-group"><label>Method</label><select name="how"><option value="roll">Stamina + Primal-Urge roll</option><option value="rage">Spend 1 Rage (instant)</option></select></div>
          <div class="form-group"><label>Difficulty modifier</label><input type="number" name="mod" value="0"/></div></form>`;
        return ctx.dialog(`Change form: ${actor.name}`, content, "Change", async fd => {
            const f = FORMS[fd.form];
            let body = "", rolls = [];
            if (fd.how === "rage") {
                const n = await pay(actor, "rage", 1); if (n === false) return null;
                body += `<div class="vta-parts">${esc(n ?? "")}</div><div class="vta-big good">The change is instant.</div>`;
            } else {
                const pu = findAbility(actor, "primalurge");
                const dice = attr(actor, "stamina") + (pu?.value ?? 0);
                const rr = await rollPool(dice, Math.min(10, f.diff + fd.mod));
                rolls.push(rr.roll);
                body += rollBlock("Stamina + Primal-Urge", rr, [`to ${f.label}: difficulty ${f.diff}`]);
                if (!rr.successes) body += `<div class="vta-note">Failure: the change does not happen this turn.</div>`;
                if (!rr.successes) return post(actor, `${actor.name} struggles to change`, body, rolls.filter(Boolean));
            }
            if (actor.isOwner) await P.setWorldFlag(actor, "form", fd.form);
            body += `<div class="vta-note"><b>${f.label}:</b> ${esc(f.mods)}. Apply these to the sheet (the module does not edit attributes). Claws and bite: +1 damage in Glabro, +2 in Crinos (W20).</div>`;
            return post(actor, `${actor.name} changes to ${f.label}`, body, rolls.filter(Boolean));
        });
    }

    /** Werewolf regeneration: one bashing level per turn; lethal needs Stamina (diff 8) under stress. */
    async function regen(actor) {
        const gi = GX.isShifter(actor) ? GX.info(actor) : null;
        const can = gi ? GR.regeneration({ breed: gi.breed, form: gi.form, fera: gi.fera }) : { regen: true, why: "" };
        if (!can.regen) ctx.notify(`${actor.name}: ${can.why}`);
        const h = actor.system?.health?.damage ?? {};
        const dmg = { bashing: num(h.bashing), lethal: num(h.lethal), aggravated: num(h.aggravated) };
        const content = `<form><p><b>${esc(actor.name)}</b>: ${dmg.bashing}B / ${dmg.lethal}L / ${dmg.aggravated}A</p>
          <div class="form-group"><label>Heal</label><select name="type"><option value="bashing">1 bashing level (automatic)</option><option value="lethal">1 lethal level (Stamina roll diff 8 in stress)</option></select></div>
          <div class="form-group"><label><input type="checkbox" name="stress" checked/> In a strenuous or stressful situation (roll required)</label></div></form>`;
        return ctx.dialog(`Regenerate: ${actor.name}`, content, "Regenerate", async fd => {
            let body = "", rolls = [], ok = true;
            if (fd.type === "lethal" && fd.stress) {
                const rr = await rollPool(attr(actor, "stamina"), 8); rolls.push(rr.roll);
                body += rollBlock("Stamina (regeneration)", rr, ["difficulty 8"]);
                ok = rr.successes > 0;
            }
            if (ok && dmg[fd.type] > 0) {
                const api = game.wodxCombat;
                if (api?.healDamage) await api.healDamage(actor, fd.type, 1);
                else await updateActor(actor, { [`system.health.damage.${fd.type}`]: dmg[fd.type] - 1 });
                body += `<div class="vta-big good">One ${fd.type} level regenerates.</div>`;
            } else if (ok) body += `<div class="vta-note">No ${fd.type} damage to heal.</div>`;
            else body += `<div class="vta-note">The lethal wound does not close this turn.</div>`;
            if (!can.regen) body += `<div class="vta-note bad">${esc(can.why)} (healed anyway at the player's choice).</div>`;
            body += `<div class="vta-note">Aggravated damage and silver wounds don't regenerate; they heal at one level a day of rest (DA:W p. 102; W20 p. 256).</div>`;
            return post(actor, `${actor.name} regenerates`, body, rolls.filter(Boolean));
        });
    }

    function rules(actor, key) { return post(actor, "Rules reminder", `<div class="vta-note">${RULES[key] ?? ""}</div>`); }

    /** Launcher: sections for the actor's profile, the profile toggle and an Auto/override selector. */
    async function menuFor(actor, { recent = [], isGM = !!globalThis.game?.user?.isGM } = {}) {
        const kind = P.detectProfile(actor);
        const def = (kind === "mage" && ctx.isDA?.(actor)) ? MENUS.mageDA : (kind === "fae" && ctx.isDAFae?.(actor)) ? MENUS.faeDA : (kind === "kindred" && ctx.isKotE?.(actor)) ? MENUS.kote : (kind === "mortal" && ctx.isOrpheus?.(actor)) ? MENUS.orpheus : (MENUS[kind] ?? MENUS.mortal);
        const auto = P.detectProfile(actor, { ignoreFlag: true });
        const overridden = kind !== auto;
        const kindBtn = `<button type="button" class="vta-kind" title="Change the actor type"><i class="fas fa-exchange-alt" aria-hidden="true"></i> Type</button>`;
        // 6e: the restyled lines group their buttons by intent, with search, recent uses, hints and keys
        if (TR.LINE_LOOK.includes(kind)) {
            const g = TR.groupMenu(def === MENUS.mageDA ? "mageDA" : def === MENUS.faeDA ? "faeDA" : def === MENUS.kote ? "kote" : def === MENUS.orpheus ? "orpheus" : kind, def.sections, { isGM });
            const all = [...g.bands.flatMap(b => b.buttons), ...g.scene];
            const btn = (x, item = true) => `<button type="button" data-k="${esc(x.spec)}"${item ? ` data-search-item data-search-text="${esc(`${x.label} ${x.desc}`)}"` : ""} title="${esc(x.desc || x.label)}" data-hint="${esc(x.desc)}"><i class="fas ${x.icon}" aria-hidden="true"></i><span>${esc(x.label)}</span></button>`;
            const rec = recent.map(s => all.find(x => x.spec === s)).filter(Boolean);
            const mine = new Set(all.map(x => x.spec));
            const extras = (ctx.searchExtras?.() ?? []).filter(x => !mine.has(x.spec));
            const html = `<div class="vta-grp-wrap wodx-menu2" data-line="${esc(kind)}">
              <div class="vta-menu-head"><span><span class="vta-who">${esc(actor.name)}</span><span class="vta-kindlabel">${esc(def === MENUS.kote ? "Kuei-jin (Kindred of the East)" : def === MENUS.orpheus ? "Orpheus (a spook)" : P.profileLabel(kind))}${overridden ? " (override)" : ""}</span></span>${kindBtn}</div>
              <input type="search" class="wodx-search vta-menu-find" data-search=".vta-intents" placeholder="Find an action…" aria-label="Find an action" autocomplete="off" spellcheck="false">
              ${rec.length ? `<div class="vta-recent" role="group" aria-label="Used lately"><span>Lately</span>${rec.map(x => btn(x, false)).join("")}</div>` : ""}
              <div class="vta-intents">
              ${g.bands.map(b => `<fieldset class="vta-grp vta-band vta-band-${b.id}"><legend>${esc(b.label)} <small>${esc(b.hint)}</small></legend><div class="vta-grp-btns">${b.buttons.map(x => btn(x)).join("")}</div></fieldset>`).join("")}
              ${g.scene.length ? `<div class="vta-scene" role="group" aria-label="The scene">${g.scene.map(x => btn(x)).join("")}</div>` : ""}
              ${extras.length ? `<fieldset class="vta-grp vta-elsewhere"><legend>Also found <small>common checks and dramatic systems</small></legend><div class="vta-grp-btns">${extras.map(x => btn(x)).join("")}</div></fieldset>` : ""}
              </div>
              <p class="vta-hintbar" aria-live="polite" data-default="Type to find an action · arrow keys move · Enter uses it">Type to find an action · arrow keys move · Enter uses it</p>
            </div>`;
            return { kind, html };
        }
        const html = `<div class="vta-grp-wrap">
          <p class="vta-menu-head"><span><b>${esc(actor.name)}</b>: ${esc(P.profileLabel(kind))}${overridden ? " <i>(override)</i>" : " <i>(auto)</i>"}</span>
             ${kindBtn}</p>
          ${def.sections.map(([title, btns]) => `<fieldset class="vta-grp"><legend>${esc(title)}</legend><div class="vta-grp-btns">${btns.map(([k, l, i]) =>
              `<button type="button" data-k="${esc(k)}" title="${esc(TR.DESC[k] ?? l)}"><i class="fas ${i}"></i> ${esc(l)}</button>`).join("")}</div></fieldset>`).join("")}
        </div>`;
        return { kind, html };
    }

    async function run(spec, actor) {
        const [type, arg] = spec.includes(":") ? [spec.slice(0, spec.indexOf(":")), spec.slice(spec.indexOf(":") + 1)] : [spec, ""];
        switch (type) {
            case "action": return action({ actor });
            case "api": return API[arg]?.({ actor });
            case "preset": return action({ actor, preset: arg });
            case "uses": return uses(actor, arg);
            case "cantrip": return cantrip(actor);
            case "cast": return cast(actor);
            case "shift": return shift(actor);
            case "regen": return regen(actor);
            case "rules": return rules(actor, arg);
            case "check": return API.quickCheck?.({ actor, check: arg });
        }
    }

    return { menuFor, run, uses, cantrip, cast, shift, regen, rules };
}
