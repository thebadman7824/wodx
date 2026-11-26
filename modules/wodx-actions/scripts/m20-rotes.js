/**
 * WoDX Actions (B7836): ready-made Cast window presets for the M20 core book's sample rotes, with the Technocracy's
 * Adjustments and Procedures among them (Chapter Ten, Part VIII, pp. 601-611). Short summaries in our own words with the
 * page. Pure: no Foundry calls.
 *
 *   Each   id, name, kind (Adjustment, Procedure or rote), spheres (the least the Effect needs, on the nine Spheres:
 *          the Technocracy's Data is Correspondence and Dimensional Science is Spirit), options (Spheres a mage may
 *          add), page, cast (coincidental or vulgar, as the book usually rules), text, and keywords: what the Cast
 *          window ticks when the rote is picked.
 * House readings (B7836): a rote's keywords are the nearest of the Cast window's; what they cannot hold (the hacking
 * roll Black Card allows, Hot-Shotting's lowered difficulty, the Bullet-Catch's dodge against gunfire, the lawn chair's
 * many limits) stays in the rote's text for the Storyteller. A rote with no near keyword is a Free Effect.
 */
const n = v => Number(v) || 0;

export const REF = "M20";

const R = (id, name, kind, spheres, page, cast, keywords, text, options = "") => ({ id, name, kind, spheres, page, cast, keywords, text, options });

export const ROTES = [
    // Enlightened Adjustments (pp. 601-603)
    R("blackcard", "Black Card", "Adjustment", { correspondence: 2, forces: 2, mind: 2 }, "p. 601", "coincidental", ["work"],
        "a little black box hooked into a security system lets the mage hack controls out of reach, so long as they are networked to where the box is; the hacking rolls are still made (Hacking, p. 403); the box makes it coincidental"),
    R("hotshotting", "Hot-Shotting", "Adjustment", { forces: 2 }, "pp. 601-602", "coincidental", ["free"],
        "a Crafts roll tunes a weapon to sound fearsome and hit harder: each success is one less difficulty on the next attack and an automatic success, spent on damage, more targets or intimidation; with Mind 2 a target whose Willpower the successes reach gives up",
        "Mind 2"),
    R("handsofdeath", "Hands of Death", "Adjustment", { life: 3 }, "p. 602", "coincidental", ["harm"],
        "trained blows break walls and bones: damage by the Damage or Duration chart with an automatic success from Forces; not aggravated while coincidental; Entropy 2 finds weak points (one less armour or soak a success), Prime 2 charges the fists for aggravated harm (vulgar)",
        "Forces 2 in place of Life 3, or both; Entropy 2; Prime 2"),
    R("rightclick", "Right-Click", "Adjustment", { mind: 3, correspondence: 3 }, "pp. 602-603", "coincidental", ["know"],
        "through a phone or implant, a look at someone or something brings up what the databases hold: one success surface data, two simple, three uncommon, four hidden, five classified, six or more all there is; each kind of sight added is one harder on perception; the data may be wrong",
        "Data 3 is essential; Forces 1, Life 1, Matter 1, Prime 1, Spirit 1 for more kinds of sight"),
    R("hypernarrative", "Hypernarrative Influence", "Adjustment", { mind: 4 }, "p. 603", "coincidental", ["sway"],
        "a stock line or trope pushes the target to play a role from the media (Manipulation + Art or Expression), usually for the scene; a failure, a botch or a savvy target sees the cliché; with Entropy 2 chance bends toward a dramatic twist the Storyteller picks",
        "Entropy 2"),
    // Technocratic Procedures (pp. 603-605)
    R("sanitize", "Sanitize Evidence", "Procedure", { matter: 2, forces: 2 }, "pp. 603-604", "vulgar", ["work"],
        "an extended roll, an hour of work a roll: each success turns ten pounds of evidence to energy; a botch brings Paradox at once, often a blast",
        "Prime 4 in place of Forces"),
    R("securescene", "Secure the Scene", "Procedure", { mind: 2, forces: 1, matter: 1 }, "pp. 604-605", "coincidental", ["fear", "sense"],
        "three successes (five or more for a large area) seal a place: Mind 2 urges people away, Mind 3 drives them off, and entering needs more Willpower successes than the agent scored; the scanners make finding evidence one easier; Forces 3 adds a blackout of light and sound for three more successes (vulgar unless in the dark)",
        "Mind 3; Forces 3"),
    R("dimensionbomb", "Dimension Bomb", "Procedure", { spirit: 3 }, "p. 605", "vulgar", ["free"],
        "a small bomb phased through the Gauntlet (difficulty the Gauntlet) goes off on the far side; a failure leaves it between worlds, harming both; with Forces 3 and Prime 2 each success not spent getting through is a level of Forces damage",
        "Forces 3 and Prime 2"),
    R("goldengunman", "Golden Gunman", "Procedure", { time: 3, forces: 2 }, "p. 605", "coincidental", ["hasten"],
        "two guns or blades at once: more actions with both hands without the usual penalties, each attack rolled and aimed as wished, with flips and leaps and no recoil; a botch is a cinematic disaster"),
    // Mystic Spells and Traditional Rotes (pp. 607-611)
    R("bulletcatch", "The Bullet-Catch", "rote", { forces: 2, life: 2, time: 2 }, "p. 607", "vulgar", ["ward"],
        "added to Arrow Cutting (p. 428), focused through Do: Dexterity + Do as a dodge, and more successes than the shooter catch the bullets; coincidental only where superhuman martial arts are accepted"),
    R("awaken", "Awaken the Inanimate", "rote", { spirit: 3 }, "pp. 607-608", "coincidental", ["imbue"],
        "an extended ritual (about five successes for a small thing, twenty or more for a big place or machine) wakes an object's spirit: it works better, does small favours, exists in the Umbra too and can go there with the mage; asking it for the uncanny is vulgar"),
    R("chainwhispers", "Chain of Whispers", "rote", { mind: 3, correspondence: 2 }, "p. 608", "coincidental", ["sway"],
        "a scandal told to a friend compels its telling: each success makes two more people pass it on, and gossip keeps it going after; a Willpower roll resists the urge; coincidental unless plainly absurd"),
    R("brightpenny", "Penny Dreadful's Bright New Penny", "rote", { matter: 3, prime: 2, time: 2 }, "p. 608", "coincidental", ["make"],
        "rubbish restored to what it once was: Matter 3 repairs it, Matter 4 remakes it from nothing; simple things are easy, a fine restoration or a fresh conjuring needs three successes or more; vulgar if seen to appear",
        "Matter 4"),
    R("psychicinterface", "Psychic Interface", "rote", { mind: 3, correspondence: 2, forces: 2 }, "pp. 608-609", "coincidental", ["know", "work"],
        "the mind alone reaches computers: read and change data, run systems, surge or short them with Forces; Mind 4 enters the Digital Web without hardware (vulgar); needs Computer 4 with a Psychic Interface specialty and Meditation 3; quiet access is coincidental",
        "Mind 4; Spirit 2 in place of Data"),
    R("talons", "Talons", "rote", { life: 3 }, "pp. 609-610", "vulgar", ["shape"],
        "claws grown from the fingers: lethal harm and the Claw manoeuvre; Life 4 grows them on another, Matter 2 works in steel or bone, Prime 2 makes the harm aggravated",
        "Life 4; Matter 2; Prime 2"),
    R("witchsvengeance", "Witch's Vengeance", "rote", { entropy: 4 }, "p. 610", "vulgar", ["harm"],
        "a poppet or image torn, burned or melted: Entropy rots the victim, Life wrecks the body, Life with Time ages it (Feats of Time Magick); without a dot of Correspondence for every dot of the harming Sphere the mage must touch the victim",
        "Life 3 or Life 3 with Time 3 in place of Entropy; Correspondence (Data) for range"),
    R("lawnchair", "The Notorious Vampiric Lawn Chair", "rote", { life: 5, matter: 5 }, "pp. 610-611", "vulgar", ["shape"],
        "a vampire made into furniture: always vulgar, against Night-Folk countermagic (p. 546), with enough successes to take it to Incapacitated (four or more), more for it to last; the vampire stays aware, can undo it with a blood point a success, frenzies at 8, and its kind hunt the mage for ever")
];

/* B7837: How Do You DO That? (the M20 guide to Effects, 2015): its named feats and techniques, pp. 31-133. */
export const HDYDT = "HDYDT";
const H = (id, name, spheres, page, cast, keywords, text, options = "") => ({ id: `hd-${id}`, name, kind: "technique", spheres, page, cast, keywords, text, options, book: HDYDT });

export const HD_ROTES = [
    // Elemental Mastery (pp. 31-41)
    H("blackout", "Blackout!", { forces: 2 }, "p. 31", "coincidental", ["work"], "a few successes black out a small area's power; a grid or a city wants more successes and up to Forces 5, and often Correspondence or Matter to reach the heart of the system", "Forces 5; Correspondence or Data; Matter"),
    H("chemicals", "Concocting Chemical Compounds", { matter: 2 }, "pp. 31-32", "coincidental", ["shape"], "one chemical turned into another, one to three successes for simple ones; complex ones need Matter 4 or 5, and the mage must know the chemistry (Science 3 or so)", "Matter 3 to 5"),
    H("nourishment", "Conjuring or Purifying Nourishment", { matter: 2 }, "p. 32", "coincidental", ["work"], "Matter 2 takes poisons out of food or water, Life 2 rids it of germs and early rot, and Life 3, Matter 3 and Prime 2 make food or water from nothing", "Life 2; Life 3, Matter 3 and Prime 2"),
    H("light", "Creating Light", { forces: 2 }, "pp. 32-33", "coincidental", ["light"], "Forces 2 brightens light already there; Forces 3 and Prime 2 make strong light in full dark; such light is not sunlight and does not harm vampires, though Correspondence 4 and Forces 4 can open a way to real sunlight", "Forces 3 and Prime 2; Correspondence 4 and Forces 4"),
    H("deflect", "Deflecting Missiles", { forces: 2 }, "p. 33", "coincidental", ["ward"], "the Arete roll works as a dodge against one shot, each success taking one from the attack; more successes send it astray, twice as many send it back at the shooter"),
    H("disrupt", "Disrupting Bodily Functions", { forces: 2, life: 3 }, "pp. 33-34", "vulgar", ["harm"], "electrical or chemical disruption of a body; it needs Life 3 to truly impair it and a mage who understands how bodies work", "Matter 2 in place of Forces 2"),
    H("invisible", "Invisibility or Silence", { forces: 2 }, "p. 34", "vulgar", ["free"], "light or sound bent around the mage: each success is one harder, up to three, on Perception + Alertness or Awareness to notice; Correspondence 1 lets the hidden one still find the way", "Correspondence 1"),
    H("shadowplay", "Shadowplay", { forces: 2 }, "p. 34", "coincidental", ["light", "illusion"], "light and shadow bent over about ten feet at Forces 2 and up to a mile or more at the highest Ranks; Manipulation + Expression shapes them into moving pictures that distract or frighten"),
    H("corners", "Shooting Around Corners", { correspondence: 2, matter: 2 }, "p. 34", "vulgar", ["free"], "a projectile goes in one place and comes out elsewhere, or curves round cover: the shot is three harder; projectiles only, not beams", "Forces 2 in place of the others"),
    H("synthesize", "Synthesizing Materials", { matter: 2 }, "pp. 34-35", "coincidental", ["shape"], "one material turned into another, sand to chips or light to steel; the harder the material the higher the Rank, and Crafts or Technology to make it useful"),
    H("temperature", "Temperature Fluctuations", { forces: 3 }, "p. 35", "coincidental", ["harm"], "Forces 2 shifts heat or cold within comfort; Forces 3 and up makes extremes that harm, usually bashing, lethal or aggravated from heated metal or deep freezing", "Forces 2 for comfort only"),
    H("telekinesis", "Telekinesis", { mind: 3, forces: 2 }, "pp. 35-36", "vulgar", ["hold"], "things moved by will alone, weight by the Forces Rank (Forces and Weight, p. 29); a Willpower roll as well as Arete, and a Willpower point for something very heavy"),
    H("pyrokinesis", "Pyrokinesis", { mind: 3, forces: 3, prime: 2 }, "p. 36", "vulgar", ["harm"], "fire willed into being, with a Willpower roll to hold it; Mind 3 and Forces 2 only command flames already there", "Mind 3 and Forces 2 to control existing fire"),
    H("stormcocoon", "The Storm-Cocoon", { forces: 3, entropy: 2, prime: 2 }, "p. 39", "vulgar", ["ward"], "a shield against the storm the mage raises: five successes guard about a ten-foot circle for the storm's length, one more success for every ten feet more"),
    H("summonstorm", "Summoning Storms", { forces: 5 }, "p. 40", "vulgar", ["weather"], "Forces 5 pulls the weather already there into a storm; Prime 3 and Matter 2 more make a far worse one; a Willpower roll as it gathers, or the storm goes its own way", "Prime 3 and Matter 2"),
    H("earthquake", "Shaking the Earth", { forces: 5, matter: 5, entropy: 3 }, "pp. 40-41", "vulgar", ["work"], "an earthquake whose damage, with the Forces success, falls on buildings and other structures in the area rather than on people"),
    // Energy-Work (pp. 45-49)
    H("aura", "Aura Alteration", { prime: 2 }, "p. 45", "coincidental", ["free"], "the mage's aura dimmed, brightened or recoloured: each success takes one from anyone reading it, or works to fool them", "Mind 1 in place of Prime 2"),
    H("primeweapon", "Quintessential Bolts and Weapons", { prime: 3 }, "pp. 46-47", "vulgar", ["free"], "a blade or bolt of raw Quintessence that does aggravated harm without heat (Forces 3 adds fire); a Quintessence point a turn in use", "Forces 3"),
    H("livingcharm", "Living Charms", { prime: 4 }, "p. 47", "vulgar", ["imbue"], "a living thing holds one stored Effect to release later, such as a tree that bursts into harmless flame (with Forces 3 and Life 3); Time 4 sets a trigger past the usual Duration", "the Spheres of the stored Effect; Time 4"),
    H("healthlevels", "Added Life-Force", { prime: 5, life: 3 }, "p. 49", "vulgar", ["boost"], "temporary health levels by the successes, as if they were damage, that take harm first; Life 4 gives them to another", "Life 4"),
    H("energyvamp", "Energy Vampirism", { prime: 3 }, "p. 49", "coincidental", ["charge"], "Quintessence drawn from companions, often unnoticed beyond tiredness; coincidental unless it kills"),
    H("disintegrate", "Disintegrating Things", { prime: 4 }, "p. 49", "vulgar", ["free"], "aggravated harm that pulls the Quintessence from an object (Prime 4) or a living thing (Prime 5) until it is gone", "Prime 5 for living things"),
    // Enhanced Perceptions (pp. 53-55)
    H("auras", "Perceiving Auras", { mind: 1 }, "pp. 53-54", "coincidental", ["sense"], "reading the aura of a living thing with Perception + Awareness; spirits and the undead one harder; Prime 1 reads Resonance", "Spirit 1; Life 1 and Prime 1; Prime 1"),
    H("project", "Projecting Images and Impressions", { forces: 3, mind: 2, prime: 2 }, "pp. 54-55", "coincidental", ["illusion"], "what the mage perceives shown to others on a screen, in smoke or a mirror; vulgar where it would startle"),
    H("scry", "Perceiving From a Distance", { correspondence: 2 }, "p. 55", "coincidental", ["know"], "a sensing Effect sent to a far place or person by the Correspondence ranges; a tie to the subject (hair, records, a bug) makes it easier"),
    // Martial Arts (pp. 60-69)
    H("calmingglance", "Calming Glance and the Predator's Eye", { mind: 2 }, "p. 60", "coincidental", ["sway", "fear"], "a calm look talks a foe out of fighting, or a predator's stare fills it with fear or reckless fury that hinders it"),
    H("victorymind", "Victory in the Mind", { mind: 2 }, "p. 60", "coincidental", ["fear"], "a war-cry or kata that unnerves the foe or steadies the fighter before the first blow", "Mind 3"),
    H("wardance", "The War Dance", { mind: 2 }, "p. 61", "coincidental", ["sway"], "a song or speech fills allies with courage and battle-lust: successes by the number of allies plus one a turn it lasts, difficulty 7 or the group's highest Willpower"),
    H("ghostdance", "Ghost-Dances", { life: 4 }, "pp. 61-62", "vulgar", ["boost"], "allies made hard to harm: three successes each to soak lethal, five to soak aggravated, two more each for a dot of Stamina; a Quintessence point each", "Spirit 2"),
    H("battlesense", "Battlefield Sense", { correspondence: 1 }, "p. 62", "coincidental", ["sense"], "the whole fight seen at once, its people, cover and weapons, by the successes"),
    H("readfoe", "Reading an Opponent", { correspondence: 1 }, "p. 62", "coincidental", ["sense"], "with Wits 2 and a fighting Ability 2, one sensing Sphere at a time (Correspondence, Mind or Time) reads the foe's next move", "Mind 1 or Time 1 in place of Correspondence"),
    H("mindpunch", "The Mind-Altering Punch", { mind: 2 }, "pp. 63-64", "coincidental", ["fear"], "a blow that carries a push of fear, fury or doubt; Willpower at 6 with more successes resists; Mind 3 makes it a Psychic Blast and Life 3 with Mind 3 a Psychic Shatter (vulgar)", "Mind 3; Life 3"),
    H("delayeddeath", "The Delayed-Death Touch", { time: 4, life: 3 }, "p. 64", "vulgar", ["harm"], "a touch whose aggravated harm lands later, at a trigger the mage sets: steps, heartbeats, an hour"),
    H("chipush", "The Chi-Field Push", { forces: 2, prime: 2 }, "pp. 64-65", "coincidental", ["trip"], "a wall of chi throws people and things back without a touch; a Quintessence point"),
    H("chifire", "The Chi-Fire Punch", { prime: 2 }, "p. 65", "coincidental", ["free"], "punches and kicks that do aggravated harm, a Quintessence point a blow; coincidental while nothing glows"),
    H("chiflight", "Chi Flight", { forces: 2, life: 2, prime: 2 }, "p. 65", "vulgar", ["rise"], "running over water, leaping into trees, short flights; a Quintessence point, for the rolled Duration"),
    H("chiheal", "Chi Healing", { life: 2, prime: 2 }, "p. 65", "coincidental", ["mend"], "healing through massage, needles or breath: Life 2 for oneself, Life 3 for another, with Prime 2 for the chi", "Life 3"),
    H("spiritstrike", "The Spirit-Strike", { spirit: 2, prime: 2 }, "p. 65", "vulgar", ["free"], "a blow that lands on a spirit; Spirit 3 harms it as Life magick harms the living, Entropy 3 with Prime 2 does so to ghosts", "Spirit 3; Entropy 3"),
    H("chishout", "The War-Power Chi Shout", { life: 3, mind: 2, prime: 2 }, "pp. 65-66", "coincidental", ["boost", "fear"], "a shout that raises the fighter's Traits a dot a success and frightens foes"),
    H("chivamp", "The Chi-Vampire Strike", { prime: 3 }, "p. 66", "coincidental", ["charge"], "a blow that drains Quintessence rather than doing harm; Prime 5 destroys the foe (vulgar)", "Prime 5"),
    H("elementalfury", "Elemental Fury Chi", { life: 3, prime: 3, forces: 3 }, "pp. 66-67", "vulgar", ["harm", "ward"], "flaming hands or stone skin: the fighter deals and resists aggravated harm; Matter 3 in place of Forces for wood, metal or stone", "Matter 3 in place of Forces 3"),
    H("slipstream", "Slipstream", { forces: 2 }, "p. 67", "coincidental", ["ward"], "the fighter seems a hair from where they stand: each success one harder to hit", "Correspondence 1 or 2, Entropy 2 or Time 1 in place of Forces"),
    H("painshrug", "The Pain-Shrug", { life: 3 }, "p. 67", "coincidental", ["boost"], "soak lethal or aggravated harm for the Duration; Mind 3 instead ignores wound penalties short of death", "Mind 3"),
    H("neo", "The Neo", { forces: 2 }, "pp. 67-68", "vulgar", ["ward"], "a hail of bullets or arrows stopped in the air, by the successes against the attacks"),
    H("velocity", "The Velocity Boost", { forces: 2 }, "p. 68", "coincidental", ["free"], "Arete at 5: each success one easier on a throw or shot, up to three, and the Forces success adds to its damage"),
    H("chowyunfat", "The Chow Yun Fat", { forces: 2 }, "p. 68", "coincidental", ["free"], "a leap with guns blazing: Dexterity + Firearms at 8, one foe hit a success at the gun's base damage; each Arete success one easier, up to three", "Entropy 2 in place of Forces 2"),
    H("bullettime", "Time Dilation", { time: 3 }, "p. 68", "vulgar", ["hasten"], "an extra action every two successes; tied to a foe with Correspondence 2 or Life 3 it takes actions away instead", "Correspondence 2 or Life 3"),
    H("battlefury", "Battle Fury", { life: 3, mind: 3 }, "pp. 68-69", "vulgar", ["boost"], "a ritual frenzy: Physical Attributes raised, no fear, and fighting until the magick ends or the warrior falls"),
    H("murdermachine", "The Shiva/Kali Murder Machine", { life: 4, spirit: 4, mind: 3, time: 3, matter: 2, prime: 2, entropy: 1 }, "p. 69", "vulgar", ["shape"], "the mage becomes a many-armed giant of war (Strength 8, Dexterity 5, Stamina 8); at least thirty successes, and as vulgar as magick gets"),
    // Mystic Travel (pp. 72-81)
    H("mindpush", "The Old Mind-Push", { mind: 2 }, "pp. 72-73", "coincidental", ["sway"], "a guard convinced the mage is not who they seek: Mind 2 discourages, Mind 3 steers the thought, more for the dedicated", "Mind 3 or 4"),
    H("fakeid", "Instant Fake IDs", { entropy: 2 }, "p. 73", "coincidental", ["fortune"], "an ID that fails to scan, or with more Spheres one that reads as the mage wants", "Forces 2 in place of Entropy 2"),
    H("scanners", "Tricking Those Damn Scanners", { entropy: 2 }, "pp. 74-75", "coincidental", ["fortune"], "body scanners and readers glitch; three successes or more give the reading the mage wants", "Forces 2"),
    H("allaccess", "The All-Access Pass", { entropy: 3, forces: 2, mind: 2 }, "p. 75", "coincidental", ["sway", "fortune"], "a prepared false credential and a strong push that the mage is too important to stop"),
    H("traffic", "Flipping Traffic Lights", { entropy: 2 }, "p. 75", "coincidental", ["work"], "a signal turned the mage's way; the other drivers may not react well", "Forces 2; Time 1"),
    H("crowds", "Clearing Crowds, and Getting Lost", { entropy: 3 }, "p. 75", "coincidental", ["fortune"], "the flow of people or traffic shifted to open a way or block pursuers, two to five successes by the crowd"),
    H("levitate", "Levitation", { forces: 2 }, "p. 75", "vulgar", ["rise"], "someone or something lifted and moved, weight by Rank (p. 29); living things are harder", "Mind 3; Life 2 and Prime 2"),
    H("flyobject", "Objects in Flight", { forces: 2, matter: 2 }, "pp. 75-76", "vulgar", ["rise"], "a broom, carpet or car made to fly on its own, at the Storyteller's speed"),
    H("wings", "Fly Like an Eagle", { life: 3, forces: 2 }, "p. 76", "vulgar", ["rise", "shape"], "grown wings (Life 4 on another), or mechanical ones with Matter 2; muscle wings go up to twenty yards an action", "Life 4; Matter 2 in place of Life 3; Prime 2"),
    H("blink", "The Blink", { correspondence: 3 }, "p. 77", "vulgar", ["move"], "a skip through several places in a row: the Teleport Locations successes plus one for each blink"),
    H("batman", "The Batman", { forces: 2, correspondence: 3 }, "p. 77", "vulgar", ["light", "move"], "a cloak of smoke or shadow, and when it lifts the mage is gone; Mind 2 adds a chill", "Mind 2"),
    H("everywhere", "Everywhere at Once", { correspondence: 4 }, "p. 79", "vulgar", ["move"], "the mage in several places at once, each self one success more than the hardest place on the chart"),
    H("warpgate", "The Warp-Gate", { correspondence: 3 }, "p. 80", "vulgar", ["move"], "an opening through space, held for one or two turns so the mage can pass; where it reaches follows the successes on the Teleportation Locations chart", "Correspondence 4"),
    // Necromancy (pp. 86-89)
    H("songofflies", "The Song of Flies", { mind: 2, prime: 1 }, "p. 86", "coincidental", ["know"], "the Resonance of a death site read for its cause, the people there and how it happened"),
    H("animatedead", "Animating the Dead", { life: 2, prime: 2 }, "pp. 87-88", "vulgar", ["make"], "dead flesh moved (Matter 2 and Prime 2 for bones); Spirit 2 invites or Spirit 4 locks a ghost in; Entropy 3 or Time 3 slows the rot", "Matter 2; Spirit 2 or 4; Entropy 3 or Time 3"),
    H("zombies", "Zombies!", { spirit: 4, matter: 2, prime: 2 }, "p. 88", "vulgar", ["possess"], "a corpse made a fetish driven by a ghost; the book gives three other, crueller ways"),
    H("necrosynthesis", "Necrosynthesis", { entropy: 4, life: 3 }, "p. 89", "vulgar", ["harm"], "aggravated harm that rots the living body; Prime 2 adds worse; a sure road to Jhor", "Prime 2"),
    // Warding (pp. 98-105)
    H("minorward", "Minor Wards", { correspondence: 2, prime: 2, life: 2 }, "pp. 98-99", "coincidental", ["ward"], "a simple ward that hinders living things (or spirits with Spirit 2); a Quintessence point to set", "Spirit 2 in place of Life 2"),
    H("ban", "The Ban", { correspondence: 4, life: 3, prime: 2 }, "p. 100", "vulgar", ["banish"], "a major ward that bans a kind of being: at least five successes; a True Name or token to ban one entity", "Life 4; Prime 4; Spirit 4"),
    H("gauntletcage", "Binding and the Gauntlet Cage", { prime: 4, spirit: 4 }, "p. 100", "vulgar", ["banish"], "the Gauntlet in the space raised to 10, or a spirit locked in or out; each success takes one from its tries to cross"),
    H("luckward", "The Luck Ward", { entropy: 2 }, "pp. 100-101", "coincidental", ["fortune"], "misfortune kept out: the mage rolls Arete when luck could turn in the warded place, and it counters hostile Entropy"),
    H("paradigmward", "The Paradigm Ward", { correspondence: 5, entropy: 5, life: 4, mind: 4, prime: 4 }, "pp. 102-103", "vulgar", ["ward"], "magick of a forbidden paradigm counts as vulgar with witnesses inside; three more successes and three more Quintessence"),
    H("timeward", "The Time Ward", { correspondence: 5, time: 5 }, "p. 103", "vulgar", ["time"], "time held still on one side of a threshold until the traveller steps back across"),
    H("psychicagony", "Psychic Agony", { mind: 3, spirit: 3, prime: 2 }, "p. 104", "vulgar", ["harm"], "a spirit's mind torn with agony that does not unmake its form"),
    H("entropicdispersal", "Entropic Dispersal", { entropy: 5, spirit: 5 }, "p. 105", "vulgar", ["banish"], "a spirit's idea of itself scattered, usually for months; a very minor spirit may not come back"),
    H("spiritprison", "Spiritual Imprisonment", { correspondence: 5, prime: 5, spirit: 5 }, "p. 105", "vulgar", ["banish"], "a spirit bound in a Realm made as its prison until it breaks free or is let go"),
    // Time Distortion (pp. 109-113)
    H("perfectmoment", "The Perfect Moment", { time: 1 }, "p. 109", "coincidental", ["free"], "the best moment to act: each success one easier on an Attribute + Ability roll, up to three"),
    H("totalrecall", "Total Recall", { time: 2, mind: 3 }, "pp. 109-110", "coincidental", ["know"], "a past moment remembered perfectly; Mind 4 for another's memory", "Mind 4"),
    H("thickentime", "Thickening the Walls of Time", { time: 2 }, "p. 110", "coincidental", ["free"], "each success takes one from other mages' Time Effects nearby; past five successes time starts to stutter"),
    H("timeloop", "Time Loop", { time: 3 }, "p. 111", "vulgar", ["time"], "time in an area rewound while the mage acts again; bigger loops are bigger feats"),
    H("reboot", "Reboot", { time: 3, life: 3, mind: 1 }, "p. 111", "vulgar", ["time"], "the mage goes back a few turns remembering all; others need Life 5 and Mind 4"),
    H("aging", "Accelerated Youth or Decay", { time: 3, life: 3 }, "pp. 111-112", "vulgar", ["harm"], "fast ageing or its reverse, successes by the years; Matter 3 or Entropy 3 for objects, Entropy 4 for living things", "Matter 3 or Entropy 3 or 4 in place of Life 3"),
    H("freezetime", "Freezing Time", { time: 4 }, "p. 112", "vulgar", ["hasten"], "one moment held for some turns, a falling glass or a shot; it ends if another touches it"),
    H("suspension", "Temporal Suspension", { time: 4, life: 4 }, "p. 113", "vulgar", ["hold"], "one subject stopped in time, body and all (Life 3 for the mage); Matter, Forces or Correspondence 4 for things, energy or places", "Life 3 for oneself; Matter 4, Forces 4, Correspondence 4"),
    H("contingency", "Contingency Trigger Effects", { time: 4, entropy: 3 }, "p. 113", "coincidental", ["time"], "an Effect hung until an event comes to pass; Entropy 4 for living things, 5 for ideas", "Entropy 4 or 5"),
    H("timebubble", "Time Bubble", { time: 4, correspondence: 4 }, "p. 113", "vulgar", ["time"], "a bubble outside time and space that can hold a creature, energy, object or spirit; a Godlike feat of twenty successes or more"),
    H("sidestep", "Sidestepping Time", { time: 5 }, "p. 113", "vulgar", ["time"], "the mage steps outside the flow of time: the world cannot touch them, and their touch lands only when it ends"),
    // Uncanny Influence (pp. 121-133)
    H("emotionsurge", "Emotional Surge", { mind: 2 }, "p. 121", "coincidental", ["fear"], "a flood of feeling: each success takes a temporary Willpower point, and more than the target holds breaks it down"),
    H("overload", "Overload", { mind: 3 }, "pp. 121-122", "coincidental", ["hold"], "senses overloaded at the target's Willpower: successes at or over it stun, a turn for each one over"),
    H("madness", "Instant Madness", { mind: 4 }, "p. 122", "vulgar", ["sway"], "a sudden madness of visions and impulses; reversed, it restores sanity for a time"),
    H("psychicblast", "Psychic Blast", { mind: 3 }, "p. 122", "vulgar", ["harm"], "bashing harm at the target's Willpower (Night-Folk and mages +3, vampires with Dominate +5)"),
    H("psychicshatter", "The Psychic Shatter", { life: 3, mind: 3 }, "p. 122", "vulgar", ["harm"], "aggravated harm to the brain, at the target's Willpower, that armour cannot soak", "Mind 3 and Prime 2"),
    H("puppetry", "Puppetry", { mind: 4 }, "pp. 122-123", "vulgar", ["bind"], "control of another, at their current Willpower if willing and Willpower + 3 if not; Mind 5 rewrites them", "Mind 5"),
    H("memories", "Forging Memories", { mind: 4 }, "p. 123", "coincidental", ["sway"], "memories changed or erased; Mind 5 for great changes; Willpower, or Willpower + 3 if unwilling", "Mind 5"),
    H("sleepsoft", "Sleep Spells: the Subtle Approach", { mind: 2 }, "p. 128", "coincidental", ["sway"], "a pull toward sleep the target can resist for a while; Mind 3 a strong suggestion, Life 3 a bodily drowsiness", "Mind 3; Life 3"),
    H("sleepsudden", "Sleep Spells: the Sudden Approach", { life: 4 }, "p. 128", "vulgar", ["hold"], "the target drops asleep at once for the Duration; Mind 4 does it with a command that can be resisted", "Mind 4 in place of Life 4"),
    H("blessing", "Blessings and Curses", { entropy: 3 }, "p. 133", "coincidental", ["fortune"], "events tilted toward good or ill for a person or place, within what could happen; the Storyteller shapes it")
];

/** Every book rote: the core book's, then How Do You DO That?'s. */
export const ALL_ROTES = [...ROTES, ...HD_ROTES];

/** Why a rote with no near keyword only shows its card (the powers inventory's story reason). */
export const STORY = {
    hotshotting: "M20 pp. 601-602: a lower difficulty on the next attack and successes split as the player likes; WoDX keeps no next-attack bonus",
    dimensionbomb: "M20 p. 605: a bomb sent through the Gauntlet goes off on the far side; WoDX does not track the Umbra's side of a fight"
};

/** A book rote as the Cast window's rote (the shape effects-rules.js roteFrom makes), with its page in the name. */
export function presetOf(r) {
    if (!r) return null;
    return { name: `${r.name} (${r.book ?? REF} ${r.page})`, keywords: [...r.keywords], spheres: { ...r.spheres }, plan: { targets: 0, duration: 0, area: false }, ctx: {},
        kind: r.cast === "vulgar" ? "vulgar" : "coincidental", feat: 0, book: r.id, text: `${r.text}.${r.options ? ` Options: ${r.options}.` : ""}` };
}

/** Can a mage with these Spheres cast it? Every Sphere it needs at that level or more. */
export const castable = (r, known = {}) => !!r && Object.entries(r.spheres).every(([s, v]) => n(known[s]) >= n(v));

/** The book rotes a mage with these Spheres can cast, as Cast window presets. */
export const bookRotes = (known = {}) => ALL_ROTES.filter(r => castable(r, known)).map(presetOf);

/** The book rote a name points to ("Talons", "Talons (M20 pp. 609-610)"), or null. */
export function roteOf(v) {
    const s = String(v ?? "").toLowerCase().replace(/\(.*\)/, "").replace(/[^a-z]/g, "");
    return ALL_ROTES.find(r => r.name.toLowerCase().replace(/[^a-z]/g, "") === s) ?? null;
}
