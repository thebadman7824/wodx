/**
 * WoDX Actions 3.6 — the WoDX look (Phase 6e, B51): the pure parts. Which lines wear their own colours yet, how a
 * menu is grouped by intent, and the one card layout every action card shares (header, roll, result, what changed,
 * page reference). The colours and type live in WoDX Chronicle's styles/wodx-theme.css.
 * No Foundry calls here, so the harness can test it.
 */

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ------------------------------------------------------------------ */
/*  Line accents                                                       */
/* ------------------------------------------------------------------ */

/**
 * The lines in the WoDX look. Kindred, wraith and hunter came first (the 6e gate, approved by the owner on 8 November 2026);
 * the rest followed. A line with no accent in the stylesheet (mortals) wears the era's own.
 */
export const LINE_LOOK = ["kindred", "ghoul", "mortal", "hunter", "lupine", "mage", "fae", "wraith", "spirit", "beast", "demon", "mummy", "exalted"];
/** The class a window or card for this profile carries ("" for a line not rolled out yet). */
export const lineClass = kind => LINE_LOOK.includes(kind) ? `wodx-line-${kind}` : "";
/** The mark in a card's header: one glyph a line is known by (shown in the line's accent). */
export const LINE_MARK = { kindred: "✠", ghoul: "♦", mortal: "◇", hunter: "✶", lupine: "◐", mage: "✧", fae: "❀", wraith: "☾",
    spirit: "❂", beast: "✤", demon: "✹", mummy: "☥", exalted: "☀" };

/* ------------------------------------------------------------------ */
/*  Menus grouped by intent                                            */
/* ------------------------------------------------------------------ */

export const INTENTS = [
    { id: "act", label: "Act", hint: "Try something: rolls, powers, the line's own gifts" },
    { id: "resist", label: "Resist", hint: "When something pushes back: the inner voice, fear, harm, sin" },
    { id: "recover", label: "Recover", hint: "Heal, rest, regain, look after the soul" },
    { id: "st", label: "Storyteller tools", hint: "For the Storyteller only", gm: true }
];

/** Per line: each intent's buttons, most used first; "scene" is the strip at the foot of the menu. */
export const MENU_PLAN = {
    kindred: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:useDiscipline", "api:feed", "api:giveBlood", "api:spendBlood", "api:hunt", "api:seduction", "api:bloodOath", "api:diablerie", "api:malkRite", "api:exorcise", "api:infernalFlame"],
        resist: ["api:frenzy", "api:rotschreck", "api:endFrenzy", "api:hazard", "api:daytime", "api:sin", "api:glyconCheck"],
        recover: ["uses:willpower", "api:torpor", "api:sunAndHaven", "api:downtime", "api:setRoad", "api:roadFaith", "api:domainDA", "api:maturation"],
        st: ["api:newNight", "api:boons", "api:bloodHunt", "api:masquerade", "api:skyAndSun", "api:endStory", "api:sampleDemon", "api:sampleGhost", "api:sampleSwarm", "api:spiderOn", "api:fealty", "api:domainEvent", "api:infernal"],
        scene: ["api:endScene", "api:innerVoice", "api:voices"]
    },
    wraith: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:useArcanos", "uses:pathos", "api:passion", "api:fetter", "api:memoriam", "api:caul", "api:soulforge"],
        resist: ["api:shadow", "api:shadowWhisper", "api:harrowing", "api:hazard"],
        recover: ["api:healCorpus", "uses:willpower"],
        st: ["api:shadowguide", "api:hysteria", "api:maelstrom", "api:haunt", "api:hauntNight", "api:hauntEnter"],
        scene: ["api:endScene", "api:innerVoice", "api:voices", "rules:wraith"]
    },
    hunter: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:hunterPower", "api:hunterVirtue", "api:trueFaith", "api:prayer", "uses:conviction", "api:numina", "api:hedgeMagic", "api:relic", "api:seduction", "api:exorcise"],
        resist: ["api:sinGod", "api:hazard"],
        recover: ["api:healing", "uses:willpower", "api:bankConviction"],
        st: ["api:imbue", "api:holyArtifact"],
        scene: ["api:hunterSheet", "api:endScene", "api:innerVoice", "api:voices", "rules:mortal"]
    },
    ghoul: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:useDiscipline", "uses:blood", "api:ghoulBlood", "api:seduction", "api:bloodOath", "api:exorcise"],
        resist: ["api:frenzy", "api:hazard"],
        recover: ["api:healing", "uses:willpower"],
        scene: ["api:endScene", "api:innerVoice", "api:voices", "rules:ghoul"]
    },
    mortal: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:seduction", "api:trueFaith", "api:numina", "api:hedgeMagic", "api:fomorPower", "api:kinfolk", "api:exorcise", "api:thrall"],
        resist: ["api:hazard"],
        recover: ["api:healing", "uses:willpower", "api:domainDA"],
        st: ["api:imbue", "api:holyArtifact", "api:fealty", "api:domainEvent"],
        scene: ["api:endScene", "api:voices", "rules:mortal"]
    },
    lupine: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:useGift", "api:shiftForm", "api:spendRage", "preset:primalurge", "preset:trackscent", "api:useFetish", "api:performRite",
            "api:summonSpirit", "api:curse", "api:learnGift", "api:chiminage", "api:packTotem", "api:accomplishment"],
        resist: ["api:rageRoll", "api:garouEndFrenzy", "api:hazard", "api:battleScar"],
        recover: ["regen", "api:healing", "api:remainActive", "api:meditate", "uses:willpower"],
        st: ["api:awardRenown", "api:delirium"],
        scene: ["api:endScene", "api:innerVoice", "api:voices"]
    },
    mage: {
        act: ["action", "api:quickCheck", "api:withPerson", "cast", "uses:quintessence", "preset:researchmage", "api:hedgeMagic", "api:numina", "api:trueFaith"],
        resist: ["api:m20Counter", "uses:paradox", "api:hazard"],
        st: ["api:m20Backlash", "api:m20Place", "api:m20Quiet"],
        recover: ["api:healing", "uses:willpower", "api:m20Purify"],
        scene: ["api:endScene", "api:voices", "rules:mage"]
    },
    /** Dark Ages: Mage (3.7.0): the same bands, Foundation and Pillars in place of Arete. */
    mageDA: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:daCast", "api:daMage", "api:daQuintessence", "uses:quintessence", "api:daGuide", "api:daHousehold", "preset:researchmage", "api:numina", "api:trueFaith"],
        resist: ["api:daCountermagic", "api:hazard"],
        st: ["api:daCertamen"],
        recover: ["api:healing", "uses:willpower"],
        scene: ["api:endScene", "api:voices", "rules:mage"]
    },
    /** Dark Ages: Fae (3.8.0): the Dominions, the Mists and Weaving in place of Glamour. */
    ghostDA: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:useDiscipline", "api:ghostManifest", "api:ghostSight", "uses:pathos"],
        resist: ["api:hazard"],
        recover: ["uses:willpower"],
        scene: ["api:endScene", "api:voices", "rules:ghostDA"]
    },
    faeDA: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:daCantrip", "api:daUnleash", "api:daCounter", "api:daMists", "api:daMien", "api:daFae", "api:treasureUse", "api:seduction"],
        resist: ["api:daEcho", "api:daColdIron", "api:hazard"],
        recover: ["api:daOath", "api:daRest", "api:treasureOath", "uses:willpower"],
        st: ["api:treasureGive"],
        scene: ["api:endScene", "api:voices", "rules:faeDA"]
    },
    fae: {
        act: ["action", "api:quickCheck", "api:withPerson", "cantrip", "api:c20Unleash", "api:c20Invoke", "uses:glamour", "api:treasureUse", "api:seduction"],
        resist: ["api:c20Trigger", "api:c20Bedlam", "api:c20ColdIron", "uses:banality", "api:hazard"],
        recover: ["api:c20Epiphany", "api:treasureOath", "uses:willpower"],
        st: ["api:c20Mists", "api:c20Everyday", "api:treasureGive"],
        scene: ["api:endScene", "api:voices", "rules:fae"]
    },
    spirit: { act: ["action", "api:quickCheck", "api:withPerson", "api:spiritCharm", "uses:essence"], recover: ["uses:willpower"], scene: ["api:endScene", "api:voices"] },
    beast: { act: ["action", "api:quickCheck", "api:withPerson", "preset:trackscent", "preset:sneaking"], resist: ["api:hazard"], recover: ["uses:willpower"], scene: ["api:endScene", "api:voices", "rules:beast"] },
    /** Kindred of the East (3.10.0). */
    kote: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:kotSpend", "api:kotFeed", "api:hunt", "api:kotSight", "api:seduction", "api:kotDemon"],
        resist: ["api:kotNature", "api:kotSun", "api:hazard"],
        recover: ["api:kotHeal", "api:kotRise", "api:kotDharma", "uses:willpower"],
        st: ["api:kotSetup"],
        scene: ["api:endScene", "api:voices", "rules:kote"]
    },
    /** Demon: The Fallen (3.10.0). */
    demon: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:demonEvoke", "api:demonForm", "api:demonReap", "api:demonThralls", "api:seduction"],
        resist: ["api:demonSin", "api:demonHoly", "api:demonIllusion", "uses:torment", "api:hazard"],
        recover: ["api:demonHeal", "api:demonKindness", "uses:willpower"],
        st: ["api:demonRevelation", "api:demonName"],
        scene: ["api:endScene", "api:voices", "rules:demon"]
    },
    /** Orpheus (3.10.0). */
    orpheus: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:orphHorror", "api:seduction"],
        resist: ["api:orphHarm", "api:orphSpite", "api:hazard"],
        recover: ["api:orphVitality", "api:orphProject", "uses:willpower"],
        st: ["api:orphSetup"],
        scene: ["api:endScene", "api:voices", "rules:orpheus"]
    },
    /** Mummy: The Resurrection (3.10.0). */
    mummy: {
        act: ["action", "api:quickCheck", "api:withPerson", "api:mummyCast", "uses:sekhem", "api:seduction"],
        resist: ["api:mummyBalance", "api:hazard"],
        recover: ["api:mummySekhem", "api:mummyResurrect", "uses:willpower"],
        st: ["api:mummyOffense", "api:mummyVeil", "api:mummySetup"],
        scene: ["api:endScene", "api:voices", "rules:mummy"]
    },
    exalted: { act: ["action", "api:quickCheck", "api:withPerson", "uses:essence"], resist: ["api:hazard"], recover: ["uses:willpower"], scene: ["api:endScene", "api:voices"] }
};

/** What each button does, shown on hover, on keyboard focus and in the menu's hint line. Line overrides first. */
export const DESC = {
    "action": "Roll any trait at any difficulty, or run a contested, extended or group roll",
    "api:quickCheck": "Pick an everyday roll from one list, such as noticing something or reading a person",
    "api:withPerson": "Talk to, persuade, trick, scare, bribe or use a power on the person you target",
    "api:seduction": "Try to seduce or charm someone, one step at a time",
    "api:hunt": "Look for someone to feed on here; the place and your method set the roll",
    "api:feed": "Drink from the token you target: you gain blood and the vessel may be hurt",
    "api:giveBlood": "Give a point of your vitae to the mortal, ghoul or animal you target beside you",
    "api:spendBlood": "Spend blood to heal, raise an Attribute or stay awake by day",
    "api:bloodOath": "Take a step of the blood oath, binding someone or being bound",
    "api:diablerie": "Drink another Cainite's soul, step by step",
    "api:useDiscipline": "Use one of your Discipline powers: it shows the roll, the cost and what happens",
    "api:setRoad": "See your Road and its sins, or change your Road or Path",
    "api:roadFaith": "See your rank on the Road, your Mentor and your Moments of Truth, or leave for another Road",
    "api:exorcise": "Drive a demon or spirit off with a rite of exorcism, roll by roll",
    "api:sampleDemon": "Make one of the sample demons, ready to play",
    "api:maturation": "Spend the points the years gave you on traits and Backgrounds",
    "api:thrall": "Keep track of a thrall of Hell: Vice, Torment, sins, pacts and rites",
    "api:infernal": "Keep track of demonic pacts and investments, and the price each one brings",
    "api:infernalFlame": "Breathe the flame a demonic pact gave you, burning a target badly",
    "api:domainDA": "Run your manor and its lands: the people, settlements and staff",
    "api:domainEvent": "Bring an event to a domain for a season, such as famine, war or pilgrims",
    "api:fealty": "Swear, end or break an oath of fealty between a lord and a vassal",
    "api:holyArtifact": "Give the chosen sheet a Holy Artifact that adds to its True Faith",
    "api:malkRite": "Hold a Malkavian Order's rite for the night: study the Enigmas or seek Ecstasy",
    "api:glyconCheck": "Resist an offer of power, or a convert, with Willpower, or chase it above all else",
    "api:downtime": "Spend the time between stories on your domain, havens and projects",
    "api:frenzy": "Roll to keep the Beast down when anger or hunger rises",
    "api:rotschreck": "Roll to keep from fleeing in terror from fire or sunlight",
    "api:endFrenzy": "Roll Self-Control to come out of a frenzy",
    "api:sin": "Roll for a sin against your Road; failing lowers it",
    "api:daytime": "Try to stay awake, or rise, while the sun is up",
    "api:hazard": "Take harm from fire, a fall or other dangers of the world",
    "api:sunAndHaven": "Check whether your haven will keep out the coming sun",
    "api:torpor": "Sink into torpor, or try to rise from it",
    "api:boons": "Record the boons owed to and by your character",
    "api:bloodHunt": "Call or lift a Blood Hunt on someone (Storyteller)",
    "api:diablerieMarks": "See the marks diablerie leaves on you, and who can sense them",
    "api:oaths": "Swear an oath, or break one and pay its price",
    "api:masquerade": "Record who saw a breach of the Masquerade, the Veil or the Delirium",
    "api:skyAndSun": "Set the sky and the light for this scene: cloud, shade or indoors",
    "api:m20Draw": "Have the mage meditate each day to draw Quintessence by itself",
    "api:c20Place": "Mark this scene as a freehold, a glade or the Dreaming (Storyteller)",
    "api:conditioning": "Roll Dominate Conditioning on a mortal and grow the hold it gives you",
    "api:enchant": "Spend Glamour so a mortal can see and touch the Dreaming for a while",
    "api:partedMists": "Part the Mists for one mortal with other changelings, so the Enchantment lasts",
    "api:chainThrall": "Bind a wraith as a Thrall that must obey you",
    "api:demonPact": "Strike a pact with the mortal you target: they feed you Faith, you grant gifts",
    "api:pactGift": "Use a gift a demon's pact gave you, and see what it costs",
    "api:knownNames": "See the demons' names you know",
    "api:pressName": "Speak a demon's True Name to call it and make it obey",
    "api:endStory": "End the story: things that last a story reset for every character",
    "api:newNight": "Start a new night for everyone: Willpower back, rest healed, frenzies over",
    "api:endScene": "End the scene: once-a-scene powers and limits reset",
    "api:clearTries": "Forget this scene's failed tries, so the next attempt has no penalty",
    "api:innerVoice": "Let the character's inner voice whisper, suggest a check, or choose who plays it",
    "api:voices": "See the inner voices you play for other characters",
    "uses:willpower": "Spend Willpower for a sure success or to resist, or get it back",
    "api:useArcanos": "Use an Arcanos: it shows the Pathos cost and the roll",
    "uses:pathos": "Spend Pathos, or get it back",
    "api:passion": "Feed on a Passion to get Pathos back, once a scene",
    "api:fetter": "Visit or defend one of your Fetters",
    "api:memoriam": "Relive a Fetter or a memory",
    "api:caul": "Handle a newly dead soul, and those who come to reap it",
    "api:shadow": "Let the Shadow speak: its Dark Passions, Thorns and Catharsis",
    "api:shadowWhisper": "Whisper to the wraith as its Shadow",
    "api:harrowing": "Face the Shadow's nightmare when your Corpus fails",
    "api:healCorpus": "Mend your Corpus with rest or Pathos",
    "api:shadowguide": "Choose the player who voices this wraith's Shadow (Storyteller)",
    "api:hysteria": "See how the living react when they see a ghost (Storyteller)",
    "api:maelstrom": "Set the storm's force on this scene, and roll its harm (Storyteller)",
    "api:haunt": "Set this scene's Haunt and its rating (Storyteller)",
    "api:hauntNight": "Mortals sleep in a frightening Haunt: Willpower, or a day of harder rolls",
    "api:hauntEnter": "Mortals go into a forbidding Haunt: Willpower, or they flee",
    "api:soulforge": "Forge oboli, soulsteel or an Artifact, as a long task",
    "rules:wraith": "Show the wraith rules on one card",
    "api:hunterSheet": "See the hunter's Conviction, faith and stage of the hunt",
    "api:hunterPower": "Use a Blessing or an Edge, whichever the era gives",
    "api:hunterVirtue": "Roll a Virtue, or look with the second sight of the imbued",
    "api:trueFaith": "Use True Faith to drive back or resist the supernatural",
    "api:prayer": "Pray, and see whether the prayer is answered",
    "uses:conviction": "Spend Conviction, or get it back",
    "api:numina": "Use a psychic power: it shows the roll",
    "api:hedgeMagic": "Cast a spell or a ritual of a sorcerer's path",
    "api:fomorPower": "Use a fomor power, such as armored hide, claws or the Wyrm's gaze",
    "api:spiritCharm": "Use a spirit Charm, such as Blast, Armor or Possession",
    "api:relic": "Call on the power of a holy relic",
    "api:sinGod": "Roll Piety for a sin against God",
    "api:healing": "Heal wounds with time, care or medicine",
    "api:bankConviction": "Save Conviction to cash in at the next stage",
    "api:imbue": "Make this mortal one of the imbued hunters (Storyteller)",
    "rules:mortal": "Show the mortal rules on one card",
    // Ghouls
    "uses:blood": "Spend blood to heal or to raise a Physical Attribute",
    "api:ghoulBlood": "Drink vitae, or face withdrawal and the day without it",
    "rules:ghoul": "Show the ghoul rules on one card",
    // Mortals
    "api:kinfolk": "See what being kin to a werewolf tribe gives you, such as no fear of the Delirium",
    // Garou and Fera
    "preset:primalurge": "Roll your heightened senses: Perception + Primal-Urge",
    "preset:trackscent": "Follow a trail by scent: Perception + Survival",
    "api:rageRoll": "Roll Rage to see whether you frenzy",
    "api:spendRage": "Spend Rage for extra actions, or get it back",
    "api:garouEndFrenzy": "Come back out of a frenzy",
    "api:remainActive": "Keep fighting on Rage when badly hurt, once a scene",
    "api:useGift": "Use a Gift: it shows the roll, the cost and what happens",
    "api:learnGift": "Learn a Gift from a spirit or a teacher",
    "api:useFetish": "Use a fetish or a talen",
    "api:meditate": "Meditate to get Gnosis back, once a day",
    "api:performRite": "Perform a rite: it shows the roll and how long it takes",
    "api:summonSpirit": "Call a spirit out of the Umbra",
    "api:chiminage": "Record a debt owed to a spirit or a caern, or one paid",
    "api:packTotem": "Draw on the pack's totem: its gifts, its Willpower and its ban",
    "api:shiftForm": "Change form: your Attributes and difficulties change with it",
    "regen": "Heal one level of damage this turn",
    "api:battleScar": "Take a Battle Scar from a terrible wound, and the Glory it brings",
    "api:accomplishment": "Turn ten temporary Renown into one permanent point",
    "api:awardRenown": "Give Renown for deeds that others heard of (Storyteller)",
    "api:curse": "See how the human you target reacts to you",
    "api:delirium": "See how witnesses react to a werewolf's war form, and what they remember",
    // Mages
    "preset:researchmage": "Look into a subject: Intelligence + Occult or Enigmas",
    "cast": "Cast an effect: roll Arete, with the difficulty set by your highest Sphere",
    "api:m20Counter": "Cancel another's magick, resist mind magick, or break free of the Quiet",
    "api:m20Backlash": "Roll the Paradox Backlash, or hold it off with Willpower (Storyteller)",
    "api:m20Purify": "Clear the Scourge with a day alone in meditation for each point",
    "api:m20Place": "Set which styles of magick this place accepts (Storyteller)",
    "api:m20Quiet": "Track a mage's Quiet: its form, its level and the way out",
    "api:daCast": "Cast a spell through your fellowship's Foundation and Pillars",
    "api:daMage": "See your fellowship, its Foundation and Pillars, and your Twilight",
    "api:daHousehold": "Run the chantry, the familiar, the servants and the library",
    "api:treasureUse": "Use a faerie Treasure",
    "api:treasureOath": "Keep a Treasure's bargain so its power stays",
    "api:treasureGive": "Hand out a Treasure from the books (Storyteller)",
    "api:daCantrip": "Cast a cantrip: roll a Dominion and the trait it names",
    "api:daUnleash": "Unleash the raw power of a Dominion; Weaving can tame it",
    "api:daCounter": "Absorb or scatter a cantrip, or undo an Unleashing",
    "api:daFae": "See your Origin, Court, Mists, Dominions and Oaths",
    "api:daMists": "Use the Mists to hide from mortals, cloak a cantrip or grant Kenning",
    "api:daMien": "Take your fae look, or a human shape",
    "api:daOath": "Keep an oath to regain Weaving, swear a new one, or lose oaths to baptism",
    "api:daRest": "Rest in a faerie realm to get Mists and Weaving back",
    "api:daEcho": "Face an Echo: roll against your oaths to see how far it goes",
    "api:daColdIron": "Take a wound from cold iron, and the Mists it costs",
    "rules:faeDA": "Show the fae rules on one card",
    "rules:ghostDA": "Show the ghost rules on one card",
    "api:ghostManifest": "Spend a point of Passion to touch the living world for one turn",
    "api:ghostSight": "See the hand of death on someone, or the souls of the living",
    "api:sampleSwarm": "Make a swarm of animals that bites everyone inside it on its turn",
    "api:spiderOn": "Put a spider on the chosen token: they may notice it, or it bites",
    "api:sampleGhost": "Make the sample ghost, or mark the chosen Wraith sheet as a ghost of this era",
    "api:c20Unleash": "Unleash an Art for 2 Glamour and a point of Nightmare",
    "api:c20Invoke": "Call on the Wyrd to make the chimerical real, or the Autumn to ward it off",
    "api:c20Epiphany": "Gather Glamour from a person's dreams or a night by a balefire",
    "api:c20Trigger": "Roll Glamour against something that brings on Banality",
    "api:c20Everyday": "Count the Banality that everyday places wear on the faerie soul (Storyteller)",
    "api:c20Mists": "See how much a mortal remembers of the Dreaming",
    "api:demonEvoke": "Use an evocation of a lore you know; Torment may twist it",
    "api:demonForm": "Take your apocalyptic form and its powers",
    "api:demonRevelation": "See whether a witness can face your true self",
    "api:demonReap": "Reap Faith from one mortal",
    "api:demonThralls": "Keep track of your thralls and the Faith they offer at dawn",
    "api:demonHeal": "Heal with Faith",
    "api:demonSin": "Roll for a sin: your Virtue, or a point of Torment",
    "api:demonKindness": "Do an act of kindness that may take a point of Torment away",
    "api:demonHoly": "Take harm from holy ground or a sacred object",
    "api:demonName": "Hear your name spoken, and try to see who said it",
    "api:demonIllusion": "Try to see through an illusion",
    "api:c20Bedlam": "Track Nightmare, Imbalance and Bedlam",
    "api:c20ColdIron": "Take a wound from cold iron, and the Glamour it costs",
    "api:daQuintessence": "Gather Quintessence from a cray, Tass, the Fount or the Moon",
    "api:daCountermagic": "Cancel another's spell with your fellowship's countermagic, for 1 Quintessence",
    "api:daGuide": "See which Pillar level each common effect needs",
    "api:daCertamen": "Run a duel of wills between mages (Storyteller)",
    "uses:quintessence": "Spend Quintessence, or get it back",
    "uses:paradox": "Gain Paradox, or shed it after a Backlash",
    "rules:mage": "Show the mage rules on one card",
    // Changelings
    "cantrip": "Weave a cantrip from an Art, a Realm and a Bunk",
    "uses:glamour": "Spend Glamour, or get it back",
    "uses:banality": "Gain Banality, or roll against it",
    "rules:fae": "Show the changeling rules on one card",
    "rules:orpheus": "Show the Orpheus rules on one card",
    "api:orphHorror": "Use a Horror: it shows the roll and the Vitality it takes",
    "api:orphStain": "Call up a Stain with Spite",
    "api:orphSpectre": "Use a Spectre's Horror or Thorn",
    "api:orphVitality": "Get Vitality back by rest, Willpower, sharing or Spite",
    "api:orphProject": "Leave the body as a skimmer, and track the hours outside it",
    "api:orphSetup": "Set the spook's Shade, Lament and starting Horrors",
    "api:orphHarm": "Take wounds to Vitality, or to a skimmer's body",
    "api:orphSpite": "Gain Spite, or face a Spectre's call",
    "rules:mummy": "Show the mummy rules on one card",
    "api:mummyCast": "Work Hekau: a spell, or a longer ritual",
    "api:mummySekhem": "Get Sekhem back by the ways the mummy knows",
    "api:mummySetup": "Set the mummy's Amenti and path, and whether it is within the Web of Faith",
    "api:mummyBalance": "Roll Balance to resist a temptation, counter magic or forbid an evil being",
    "api:mummyOffense": "Record an offense against Ma'at for the judges",
    "api:mummyResurrect": "Roll the mummy's return to life",
    "api:mummyVeil": "See how a mortal witness reacts to a mummy",
    "rules:kote": "Show the Kuei-jin rules on one card",
    "api:kotFeed": "Feed on flesh, blood or breath for Chi",
    "api:kotSpend": "Spend Chi on a Discipline",
    "api:kotHeal": "Heal with Chi",
    "api:kotSight": "Use Ghostsight, Lifesight or your Hun's senses",
    "api:kotSetup": "Set your Dharma, direction and P'o",
    "api:kotNature": "Roll your Virtue against the P'o to keep your soul in balance",
    "api:kotDemon": "Call up Demon Chi and its rage for the scene",
    "api:kotDharma": "Roll your Dharma on a fitting occasion",
    "api:kotRise": "Rise at dusk on Yin or Yang Chi",
    "api:kotSun": "See how long you can stand the sun before it burns",
    "rules:demon": "Show the demon rules on one card",
    // Spirits, creatures and the lines still to come
    "uses:essence": "Spend Essence, or get it back",
    "preset:sneaking": "Sneak or stalk: Dexterity + Stealth",
    "rules:beast": "Show the creature rules on one card",
    "uses:faith": "Spend Faith, or get it back",
    "uses:torment": "Gain Torment, or let it surge",
    "uses:sekhem": "Spend Sekhem, or get it back",
    "uses:balance": "Roll Balance, or shift it"
};

/**
 * #2504: actions that fit only some characters, as tests on what the sheet holds (facts: {text}, the clan, bloodline,
 * variant and every item name, in lower case). An action not listed fits everyone of its line. A player sees only
 * what fits, with a button to show the rest; the Storyteller sees all.
 */
export const FITS = {
    "api:malkRite": f => /malkav/.test(f.text),
    "api:glyconCheck": f => /glycon/.test(f.text),
    "api:conditioning": f => /\bdominate\b/.test(f.text),
    "api:infernal": f => /infernal|\bpact\b|investment/.test(f.text),
    "api:infernalFlame": f => /infernal|investment|flame/.test(f.text),
    "api:trueFaith": f => /true ?faith/.test(f.text),
    "api:numina": f => /numin|psychic|telepath|psychokines|clairvoy/.test(f.text),
    "api:hedgeMagic": f => /hedge|sorcer|\bpath of\b|ritual/.test(f.text),
    "api:pactGift": f => /\bpact\b|infernal|investment/.test(f.text),
    "api:thrall": f => /thrall|\bpact\b|infernal/.test(f.text),
    "api:fomorPower": f => /fomor|taint|bane/.test(f.text),
    "api:kinfolk": f => /kinfolk|kin-fetch|\bgnosis\b/.test(f.text),
    // Exorcism is a rite a character has to learn (V20 Dark Ages); the manor needs a Domain or holdings on the sheet
    "api:exorcise": f => /exorcis/.test(f.text),
    "api:domainDA": f => /\bdomain\b|\bmanor\b|holdings/.test(f.text)
};
/** Does an action fit a character (facts as above)? */
export const fits = (spec, facts = {}) => { const t = FITS[spec]; return !t || !!t({ text: String(facts.text ?? "").toLowerCase() }); };

/**
 * Group a menu's buttons by intent. sections: the profile's [title, [[spec, label, icon], ...]] list (all its buttons).
 * Returns {bands: [{id, label, hint, buttons}], scene: buttons} with buttons as {spec, label, icon, desc}; a button the
 * plan does not list goes by its section's title (Scene → the strip; "(GM)" → Storyteller; danger words → Resist).
 * Storyteller tools are left out for players.
 */
export function groupMenu(kind, sections, { isGM = false } = {}) {
    const plan = MENU_PLAN[kind] ?? {};
    const all = [];
    for (const [title, btns] of sections ?? []) for (const [spec, label, icon] of btns) {
        if (!all.some(b => b.spec === spec)) all.push({ spec, label, icon, section: title, desc: DESC[spec] ?? "" });
    }
    const where = b => {
        for (const id of ["act", "resist", "recover", "st", "scene"]) if ((plan[id] ?? []).includes(b.spec)) return id;
        if (/\(GM\)/.test(b.label)) return "st";
        if (b.section === "Scene") return "scene";
        if (b.section === "Between stories") return "recover"; // B6300: the shared tools (profile-menus SHARED_TOOLS)
        if (/Danger|Beast|Shadow|Rage|Frenzy/i.test(b.section)) return "resist";
        if (/heal|rest|regain/i.test(b.label)) return "recover";
        return "act";
    };
    const pos = (id, b) => { const i = (plan[id] ?? []).indexOf(b.spec); return i < 0 ? 999 : i; };
    const of = id => all.filter(b => where(b) === id).sort((a, b) => pos(id, a) - pos(id, b));
    // Inside "Storyteller tools" the "(GM)" in a label says nothing new
    const bands = INTENTS.filter(i => !i.gm || isGM).map(i => ({ id: i.id, label: i.label, hint: i.hint,
        buttons: of(i.id).map(b => i.gm ? { ...b, label: b.label.replace(/\s*\(GM\)/, "").replace("(GM, ", "(") } : b) })).filter(b => b.buttons.length);
    return { bands, scene: of("scene") };
}

/** Keep the most recent uses first, at most n, without repeats. */
export function pushRecent(list, spec, n = 4) {
    return [spec, ...(list ?? []).filter(s => s !== spec)].slice(0, n);
}

/** 3.43.0: a character's own quick row: the last five actions used and up to eight pinned (stored on the character). */
export const QUICK_RECENT = 5;
export const QUICK_PINS = 8;
/** The quick row as stored on the character, cleaned: {recent: [spec], pinned: [spec]}. */
export function quickOf(flag) {
    const list = (a, n) => [...new Set((Array.isArray(a) ? a : []).filter(x => typeof x === "string" && x))].slice(0, n);
    return { recent: list(flag?.recent, QUICK_RECENT), pinned: list(flag?.pinned, QUICK_PINS) };
}
/** Pin or unpin an action. Returns {pinned, added, full}; full: there are already eight and nothing changed. */
export function togglePin(pinned, spec, max = QUICK_PINS) {
    const cur = (pinned ?? []).filter(Boolean);
    if (cur.includes(spec)) return { pinned: cur.filter(s => s !== spec), added: false, full: false };
    if (cur.length >= max) return { pinned: cur, added: false, full: true };
    return { pinned: [...cur, spec], added: true, full: false };
}
/** The recent row without what is pinned (a pinned action shows once). */
export const recentShown = (recent, pinned) => (recent ?? []).filter(s => !(pinned ?? []).includes(s));

/* ------------------------------------------------------------------ */
/*  The one card layout                                                */
/* ------------------------------------------------------------------ */

const REF = /\b(?:pp?\.|pages?)\s?\d/;
/**
 * Take the page references out of a card body so they sit in the card's footer: a quiet line that is only a reference
 * ("The Hunters Hunted II p. 74"), and a reference in brackets at the end of a note ("... (V20 Dark Ages p. 345)").
 * Returns {body, refs}.
 */
export function extractRefs(body) {
    const refs = [];
    let out = String(body ?? "");
    out = out.replace(/<(div|span|p) class="wodx-quiet">([^<>]{1,90})<\/\1>/g, (m, tag, text) => {
        if (!REF.test(text)) return m;
        refs.push(text.trim().replace(/^\(|\)$/g, ""));
        return "";
    });
    out = out.replace(/\s*\(([^()<>]{0,80}\b(?:pp?\.|pages?)\s?\d[^()<>]{0,30})\)(\.?)(?=\s*<\/div>)/g, (m, ref, dot) => {
        refs.push(ref.trim());
        return dot;
    });
    return { body: out, refs: [...new Set(refs)] };
}

/** The card's verdict for its header: the one result on the card, if there is exactly one. {text, tone} or null. */
export function verdictOf(body) {
    const pick = cls => [...String(body ?? "").matchAll(new RegExp(`<div class="(${cls}(?: (?:good|bad))?)">([\\s\\S]*?)</div>`, "g"))];
    let hits = pick("vta-big");
    if (!hits.length) hits = pick("vta-res");
    if (hits.length !== 1) return null;
    const text = hits[0][2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text || text.length > 48) return null;
    const tone = /\bbad\b/.test(hits[0][1]) || /botch/i.test(text) ? "bad" : /\bgood\b/.test(hits[0][1]) ? "good" : "plain";
    return { text, tone };
}

/**
 * Resource pips for a change: max dots, the value now filled, the dots just lost or gained marked.
 * Only for tracks of ten or fewer; returns "" otherwise.
 */
export function pips(before, after, max) {
    const b = Number(before), a = Number(after), m = Number(max);
    if (!Number.isFinite(b) || !Number.isFinite(a) || !Number.isFinite(m) || m < 1 || m > 10 || a > m || b > m || a < 0 || b < 0) return "";
    let s = "";
    for (let i = 1; i <= m; i++) {
        const cls = i <= Math.min(a, b) ? "on" : i <= a ? "on gain" : i <= b ? "lost" : "off";
        s += `<i class="vta-pip ${cls}"></i>`;
    }
    return `<span class="vta-pips" aria-hidden="true">${s}</span>`;
}

/** "What changed" strip. changes: [{label, before, after, max}] (the same label twice: first before, last after). */
export function changeStrip(changes) {
    const merged = [];
    for (const c of changes ?? []) {
        const m = merged.find(x => x.label === c.label);
        if (m) { m.after = c.after; m.max = c.max ?? m.max; } else merged.push({ ...c });
    }
    const real = merged.filter(c => String(c.before) !== String(c.after));
    if (!real.length) return "";
    return `<div class="vta-change"><span class="vta-change-label">What changed</span>${real.map(c =>
        `<span class="vta-chg ${Number(c.after) < Number(c.before) ? "down" : "up"}"><b>${esc(c.label)}</b> ${pips(c.before, c.after, c.max)}<span class="vta-chg-n">${esc(c.before)} → ${esc(c.after)}</span></span>`).join("")}</div>`;
}

/** The worldofdarkness system paints every chat h3 with layered !important rules; only a style on the element itself
 * outranks them, so the header's h3 carries one. */
const H3 = "background:none!important;border:0!important;box-shadow:none!important;color:inherit!important";

/**
 * The card: a header band (line mark, title, verdict), the body as the builder wrote it, what changed, the footer with
 * the page references. Keeps the h3 and the "vta-card" class every script and test looks for.
 */
export function cardLayout({ title, body, line = "", changes = [] }) {
    const { body: b, refs } = extractRefs(body);
    const v = verdictOf(b);
    const mark = LINE_MARK[line] && LINE_LOOK.includes(line) ? `<span class="vta-mark" aria-hidden="true">${LINE_MARK[line]}</span>` : "";
    const cls = lineClass(line);
    return `<div class="vta-card wodx-x${cls ? ` ${cls}` : ""}"${line ? ` data-line="${esc(line)}"` : ""}>`
        + `<header class="vta-head">${mark}<h3 style="${H3}">${title}</h3>${v ? `<span class="vta-verdict ${v.tone}">${esc(v.text)}</span>` : ""}</header>`
        + `<div class="vta-body">${b}</div>`
        + changeStrip(changes)
        + (refs.length ? `<footer class="vta-ref">${refs.map(esc).join(" · ")}</footer>` : "")
        + `</div>`;
}

/** Put a change strip into a card already posted (changes that landed just after the card). */
export function withChanges(content, changes) {
    const strip = changeStrip(changes);
    if (!strip) return content;
    const s = String(content).replace(/<div class="vta-change">[\s\S]*?<\/span><\/span><\/div>/, "");
    return s.includes('<footer class="vta-ref">') ? s.replace('<footer class="vta-ref">', `${strip}<footer class="vta-ref">`) : s.replace(/<\/div>$/, `${strip}</div>`);
}

/* ------------------------------------------------------------------ */
/*  What changed: read from an actor update                            */
/* ------------------------------------------------------------------ */

const get = (o, path) => path.split(".").reduce((x, k) => x?.[k], o);
const DAMAGE = { bashing: "Bashing", lethal: "Lethal", aggravated: "Aggravated" };
/**
 * The tracked numbers an update changes. system: the actor's system data before; flat: the update flattened
 * ({"system.advantages.willpower.temporary": 4}); res: {key: {label, path}} (profiles.js RES).
 * Returns [{label, before, after, max}].
 */
export function diffResources(system, flat, res) {
    const out = [];
    for (const [key, after] of Object.entries(flat ?? {})) {
        const m = /^system\.(.+)\.(temporary|permanent|value|max)$/.exec(key);
        if (m) {
            const r = Object.values(res ?? {}).find(x => x.path === m[1]);
            if (!r) continue;
            const before = get(system, `${m[1]}.${m[2]}`);
            if (before === undefined || Number(before) === Number(after)) continue;
            const node = get(system, m[1]) ?? {};
            const max = m[2] === "temporary" ? (flat[`system.${m[1]}.max`] ?? node.max ?? flat[`system.${m[1]}.permanent`] ?? node.permanent) : null;
            out.push({ label: m[2] === "permanent" ? `${r.label} (permanent)` : m[2] === "max" ? `${r.label} (maximum)` : r.label, before: Number(before), after: Number(after), max: max == null ? null : Number(max) });
            continue;
        }
        const d = /^system\.health\.damage\.(bashing|lethal|aggravated|corpus\.(bashing|lethal|aggravated))$/.exec(key);
        if (d) {
            const kind = d[2] ?? d[1];
            const before = get(system, key.slice(7));
            if (Number(before) === Number(after) || !Number.isFinite(Number(after))) continue;
            out.push({ label: `${d[2] ? "Corpus: " : ""}${DAMAGE[kind]} damage`, before: Number(before) || 0, after: Number(after), max: null });
        }
    }
    return out;
}

/* ------------------------------------------------------------------ */
/*  Beginner view (3.62.0, B2817 to B2821)                             */
/* ------------------------------------------------------------------ */

/** How many actions the front row holds. */
export const FRONT_N = 5;
/** The front row: the first actions of the Act band, in the line's own order (MENU_PLAN), at most n. */
export function frontRow(g, n = FRONT_N) {
    const act = g?.bands?.find(b => b.id === "act")?.buttons ?? g?.bands?.[0]?.buttons ?? [];
    return act.slice(0, n);
}

/**
 * What an action costs, in a few words, for the line under its button. Only actions whose cost is fixed are listed;
 * the rest say nothing rather than guess (a power's own window shows its cost before the roll).
 */
export const COST = {
    "action": "Costs nothing, unless you spend Willpower.",
    "api:quickCheck": "Costs nothing.",
    "api:withPerson": "Costs nothing, unless you use a power.",
    "api:useDiscipline": "Blood or Willpower when the power asks for it.",
    "api:feed": "Gains blood. The vessel may be hurt.",
    "api:giveBlood": "Spends a blood point. The drinker takes a step toward the Blood Oath.",
    "api:hunt": "Takes time in the night.",
    "api:spendBlood": "Spends blood.",
    "uses:willpower": "Spends Willpower.",
    "api:frenzy": "Costs nothing. Willpower can hold the Beast back for a turn.",
    "api:rotschreck": "Costs nothing. Willpower can hold the fear back for a turn.",
    "api:seduction": "Costs nothing.",
    "api:torpor": "Blood to rise early.",
    "api:downtime": "Takes nights between stories."
};
/** The line shown under an action's button in Beginner view: what it does, then its cost when fixed. */
export function actionLine(spec, desc = "") {
    const d = String(desc ?? "").trim();
    const c = COST[spec] ?? "";
    return [d ? (/[.!?]$/.test(d) ? d : `${d}.`) : "", c].filter(Boolean).join(" ");
}

/**
 * The plain first line of a roll card in Beginner view. verdict: {text, tone} from verdictOf. Says what the result
 * means in a sentence; the dice and modifiers fold below it.
 */
export function plainLine(verdict) {
    const t = String(verdict?.text ?? "").trim();
    if (!t) return "";
    if (/botch/i.test(t)) return "Botch: it goes wrong, worse than a plain failure.";
    if (/^failure/i.test(t)) return "Failure: it does not work this time.";
    const n = Number.parseInt(t, 10);
    if (Number.isFinite(n) && n > 0) {
        const how = n === 1 ? "barely" : n === 2 ? "well enough" : n === 3 ? "well" : n === 4 ? "very well" : "brilliantly";
        return `Success: it works, ${how} (${n} success${n === 1 ? "" : "es"}).`;
    }
    return "";
}
