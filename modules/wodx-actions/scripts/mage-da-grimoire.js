/**
 * WoDX Actions 3.14 (Phase 6, the last part): the Dark Ages: Mage Grimoire, the pure rules. Mechanics in WoDX's own
 * words with page references (research/book-checks/da-grimoire-rotes.md); no book text. Pages are the Grimoire's
 * printed pages (pdf page = printed + 2).
 *
 * The Grimoire adds rotes for every fellowship, a few wonders, and some rules on top of Dark Ages: Mage: the turning of
 * the seasons, Sunday for the Messianic Voices, Quintessence offered by the Moon, specialties in the Foundation and the
 * Pillars, magic of another fellowship bought with experience, countermagic for each fellowship, a guide to which Pillar
 * level each fellowship needs for common effects, and Certámen, the duel arcane.
 */

export const GRIMOIRE = "Dark Ages: Mage Grimoire";

/* ------------------------------------------------------------------ */
/*  Rotes (pp. 20–101)                                                 */
/* ------------------------------------------------------------------ */

/** Each: {id, f (fellowship), name, levels {pillar: level}, page (printed), system}. book "G" marks the Grimoire. */
const R = (id, f, name, levels, page, system) => ({ id: `g-${id}`, f, name, levels, page, system, book: "G" });

export const GRIMOIRE_ROTES = [
    // Ahl-i-Batin (pp. 20–24)
    R("dhikr", "batini", "Dhikr", { fatihah: 1 }, 20, "Recalls a memory. Passive: each success answers one question about what is recalled, or brings back one forgotten detail. Active, with a mantra or amulet: each success fixes about a quarter hour of events, fifty pages, one view, one long speech or song, or everything about one person; five fix a whole scene. A botch blocks the memory until a full night's sleep."),
    R("closetdance", "batini", "Closet Dance", { hajj: 3, layl: 3 }, 21, "Each success is one jump to the nearest like space (same size, shape, build and purpose, in one structure unless the far one is memorised); extra successes add range, five cross a large building, market or forest. Slips unseen and untraceable through repeating spaces. A botch lands the mage in the nearest large open area. An occupied space needs Hajj 4 to swap its contents back."),
    R("tearsallah", "batini", "Tears of Allah", { hajj: 4, anbiya: 1 }, 21, "Opens a prepared conduit to a raw elemental place the mage has been to or seen (one place per element). Each success does 1 bashing and 1 lethal level of heat, cold, pressure or debris; the matter stays. The caster is still exposed to the heat or cold. A botch strikes the caster or allies, or the conduit will not close for a time the Storyteller sets."),
    R("summoning", "batini", "Solomonic Summoning", { fatihah: 2, hajj: 4 }, 22, "Advanced murshids only, after a week of purification; most of a day. Extended, difficulty 10, needing the djinn's Gnosis + 1 successes; −1 difficulty per major component (spoken name, written name, sigil, true image), −1 per two lesser ones, −2 for knowing its lord. The djinn comes in its natural form for an hour per extra success and cannot resist in the material world."),
    R("binding", "batini", "Solomonic Binding", { fatihah: 4, hajj: 2 }, 23, "Extended, difficulty 10 cut as for the Summoning, needing the djinn's Rage + 2 successes; the first success must come within 3 turns of the Summoning. The djinn is held in the vessel until released; extra successes raise the difficulty to free it. Once released, no other mage can Summon it."),
    R("commanding", "batini", "Solomonic Commanding", { anbiya: 5, fatihah: 3, layl: 5 }, 23, "Difficulty 10 cut as for the Summoning, needing the djinn's Willpower + 3 successes. One task, and one more per extra success; it lasts until done, each extra success holding it one step longer (hour, day, week, month, year, decade, century). Ends at the caster's death unless prolonged. A Commanded djinn cannot be Bound by another."),
    // Messianic Voices (pp. 42–43)
    R("comeforsouls", "messianic", "I Am Come for Your Souls", { gavriel: 3, uriel: 3 }, 42, "One target in range per success, and one more per Quintessence spent. Each rolls Willpower at difficulty 6 + 1 per caster success (at most 9) and must match the caster's successes or flee in terror for a minute per caster success, perhaps dropping what it holds."),
    R("plowshares", "messianic", "Swords into Plowshares", { gavriel: 2, raphael: 3 }, 43, "Everyone in sight who means violence makes a contested Willpower roll with the mage, each at the other's permanent Willpower as difficulty; each success past the first gives the mage +1 die. Mage wins by 1 or 2: no attack without new provocation; by 3 or more: the anger is gone. A crowd rolls one average Willpower."),
    // Order of Hermes (pp. 57–58)
    R("revokeadam", "hermes", "Revoking the Gift of Adam", { corona: 3 }, 57, "The subject cannot voice a thought clearly for a time set by the successes: each try needs Willpower at difficulty 6 + 1 per caster success (at most 10), or it comes out as babble. Telepathy still works. With Corona 5 it blocks telepathy too, and cast as an Ongoing spell it takes language away for good, until magic undoes it."),
    R("72names", "hermes", "Utterance of the 72 Names", { anima: 5, corona: 5, primus: 4, vires: 3 }, 58, "Makes a golem of clean earth and water, best as an Ongoing spell. Strength 10, Dexterity 2, Stamina 8, Social 1 (Appearance 0), Mental 2; ten Health Levels (−0 four times, −1 twice, −2 twice, −5, Incapacitated); 4 armour dice soak anything; Willpower 3. It eats 1 Quintessence a day or sleeps, refuses cruel orders, and heals 1 level per success of Anima 4, Primus 4. A botch brings Scourging or a hostile spirit inside it."),
    // Old Faith (pp. 69–75)
    R("glamour", "oldfaith", "Bewitching Glamour", { spring: 3, summer: 2 }, 69, "An infusion of roses or jasmine. Until the next sunrise: +1 Appearance per success and +1 die per success on Subterfuge to seduce or sway. Each viewer sees an ideal."),
    R("bitterfruit", "oldfaith", "Bitter Fruit", { winter: 3 }, 69, "Poisons a ripe fruit, which rots within a day. Whoever eats it rolls Stamina at difficulty 7 each turn for as many turns as the successes, taking 1 unsoakable lethal level on each failure, until magic cures it."),
    R("circe", "oldfaith", "Circe's Enchantment", { spring: 4, summer: 2 }, 69, "One success and 1 Quintessence turn the subject into the animal its nature fits at that moment, with only a beast's instincts; its gear falls away. More subjects need Summer 3 and one more success and Quintessence each. Lasts the spell's duration unless made Ongoing."),
    R("dowsing", "oldfaith", "Dowsing", { spring: 1 }, 70, "With a forked yew or ash rod, one success finds the best place for a well if there is water. Autumn 3 digs the well; Winter 3 raises a lasting spring."),
    R("slumber", "oldfaith", "Eternal Slumber", { winter: 3 }, 70, "A potion in food, drink, a blade, a needle or candle wax. Extended: 20 successes, 35 Quintessence and 4 temporary Willpower. The victim needs 2 successes on Willpower (difficulty 7) or falls into a deathlike sleep, ageing not at all, until the one waking condition the caster set is met. Medicine at 8 tells the sleeper lives."),
    R("eyehunter", "oldfaith", "Eye of the Hunter", { summer: 1 }, 70, "+1 die per success on Survival to hunt, and the sense of every beast (not people or unnatural beings) within the hurried-spell distance. A shapeshifter in beast form reads as a beast; Perception + Awareness at 6 to notice more."),
    R("faeriegate", "oldfaith", "Faerie Gateway", { spring: 4 }, 70, "At an in-between place (mound, ring, glade, shore, cave mouth, hilltop); −1 difficulty at dusk, +1 by day. One success lets about six through; each extra success doubles it. Coming back needs another casting, and time may run oddly."),
    R("giantsdance", "oldfaith", "The Giant's Dance", { autumn: 3, spring: 5 }, 71, "Raises a stone giant from open ground or loose stones: Strength 8, Dexterity 1, Stamina 8, Wits 1, Brawl 1; Health Levels −0 eight times, −1, −2, −5; soaks anything that does not strike at its pattern. Every three successes: one Attribute dot or one more −0 level. It follows simple orders and crumbles at Incapacitated."),
    R("healsight-s", "oldfaith", "Healer's Sight (Spring)", { spring: 1 }, 71, "Senses well-being and works out the subject's condition; more successes, more detail. +1 die per success on Herbalism, Hearth Wisdom or Medicine to treat that subject."),
    R("healsight-w", "oldfaith", "Healer's Sight (Winter)", { winter: 1 }, 71, "Senses the malady, where it is and how bad; more successes, more detail. +1 die per success on Herbalism, Hearth Wisdom or Medicine to treat that subject."),
    R("hollowhill", "oldfaith", "The Hollow Hill", { spring: 5 }, 72, "Ongoing and extended, one roll a day: 10 successes double the size inside, and each further 10 add as much again. Sealing it costs 5 Quintessence + 1 per success and 1 temporary Willpower per 10 successes. A house rule may tie it to the Chantry Background."),
    R("magicmirror", "oldfaith", "Magic Mirror", { autumn: 2 }, 72, "Scries through a pool, cauldron or mirror: 3 successes reach miles, 4 a countryside, 5 a distant land. Others may sense it. A spell sent through it needs a normal casting with successes for the distance and the effect."),
    R("merlinsride", "oldfaith", "Merlin's Ride", { spring: 4, summer: 2 }, 72, "A day's travel is multiplied by the successes; renewed each day. A long talk with outsiders or more than a brief stop breaks it."),
    R("bounty", "oldfaith", "Mother's Bounty", { autumn: 2 }, 72, "A simple spell needing the right sacrifice for the land's need. The crops and stock of the area thrive; each extra success adds about a tenth to the yield or widens the area a step (town, county, barony, nation). The wrong sacrifice fails without Backlash."),
    R("oracularhead", "oldfaith", "Oracular Head", { winter: 3 }, 73, "Ongoing and extended: 10 successes, one roll a day, then 13 Quintessence and 2 Willpower to fix it. The head answers as best it knows and must obey."),
    R("stormbrew", "oldfaith", "Storm Brewing", { summer: 4 }, 73, "Extended, one roll an hour over a simmering cauldron: 20 successes bring a storm over a village, 30 a country, 40 a region a hundred miles each way. The caster cannot leave for more than about an hour; emptying the cauldron or dousing the fire breaks it."),
    R("straysod", "oldfaith", "Stray Sod", { autumn: 3 }, 73, "Each success adds +1 difficulty to the victims' Survival rolls to keep their way; they roll at once. Above 9 the difficulty stays 9 and each point over needs a success more. Failure: lost; a botch: hopelessly lost, perhaps into danger."),
    R("witchwind", "oldfaith", "Witch's Wind", { spring: 3 }, 74, "The successes are the wind's Strength, blowing any way up to a hundred yards off (the Feats of Strength table). Strength + Athletics to move against it."),
    R("withering", "oldfaith", "Withering Curse", { winter: 3 }, 74, "Burns a piece of the victim with bitter herbs. Each success is 1 lethal level, soaked with Willpower, dealt one a day. The caster can lift it, and the caster's death ends it. With Winter 5 the levels are aggravated."),
    R("flyingoint", "oldfaith", "Flying Ointment (elixir)", { autumn: 3 }, 74, "One dose per success. The user falls into a trance and the spirit roams for a night with all its powers, invisible and ghostly to the material world, able to deal with the Umbra."),
    R("fourthieves", "oldfaith", "Four Thieves Vinegar (elixir)", { summer: 2 }, 74, "One dose per success; drunk and rubbed on, it keeps disease away for some hours."),
    R("lovephilter", "oldfaith", "Love Philter (elixir)", { spring: 2, summer: 2 }, 75, "Brewed to 10 successes. The drinker rolls Willpower at the lower of the caster's Spring or Summer + 4, or desires the next suitable person seen. Fleeting unless fed."),
    // Spirit-Talkers (pp. 83–89; they roll Sensitivity + a Pillar)
    R("animalspeech", "spirit", "Animal Speech", { wiseone: 2 }, 83, "Each success lets the mage talk with one animal for the scene. In a dream beside the animal, Wise One 1 is enough."),
    R("animalorders", "spirit", "Animal Speech, with orders", { wiseone: 2, chieftain: 2 }, 83, "As Animal Speech, and the animals obey: 1 success for a simple order, 5 for a very complex one. (The rote's header asks Chieftain 2, its system Chieftain 1.)"),
    R("banishwar", "spirit", "Banish the Spirits of War", { chieftain: 3, warrior: 2, wiseone: 3 }, 84, "Clears war spirits from sight for the scene. Everyone there rolls Willpower at 7, +1 per success, to stay aggressive (above 9, extra successes); defending needs no roll. Changing Breeds there cannot regain Rage this scene."),
    R("bindspirit", "spirit", "Bind Spirit", { chieftain: 3, wiseone: 3 }, 84, "Makes a fetish from a fine vessel suited to a spirit already found. Extended, one roll an hour of fasting and chanting, one success per point of the spirit's Essence. After a day, a Stamina roll at 5 (+1 every 6 hours) before each roll."),
    R("curseshift", "spirit", "Curse Shifting", { wiseone: 4 }, 84, "Moves a curse to another person, beast, plant or place. A small curse needs 1 success, most about 5, an ancient strong one 20 or more."),
    R("deadwords", "spirit", "Dead Words", { wiseone: 2 }, 84, "Each success is one turn of talk with a ghost in sight, at its grave or a place it cared for; only the mage perceives it. Wise One 3 calls the shade from anywhere; Wise One 4 makes it manifest. Extended for a long talk; in a dream on the grave, Wise One 1."),
    R("denycharm", "spirit", "Deny the Charm of Death", { chieftain: 2 }, 85, "Immune to as many uses of Dominate or Presence by the dead or undead as the successes."),
    R("exorcism-w", "spirit", "Exorcism (Wise One)", { wiseone: 3 }, 85, "A contested Willpower roll with the spirit, with +1 die to the mage per success. Works on a person, place or thing."),
    R("exorcism-c", "spirit", "Exorcism (Chieftain)", { chieftain: 4 }, 85, "The spirit gets no roll, but the mage needs one success per 10 points of its Essence. Works on a person, place or thing."),
    R("horsebringer", "spirit", "Horse Bringer", { chieftain: 2 }, 86, "One wild horse (or other beast, such as deer for food) per success comes within a day and obeys. With Chieftain 3 and Wise One 3 it calls rare beasts (best at a shallowing); those obey a day per success."),
    R("ironglare", "spirit", "Iron Glare", { chieftain: 1, warrior: 1 }, 86, "The successes add to Intimidation for the scene. The one the mage is angry with: 1 success makes most foes back down, 2 even the strong-willed, 3 apologise, 4 flee, 5 or more collapse."),
    R("summons", "spirit", "Irresistible Summons", { chieftain: 4 }, 86, "Calls one person the mage has met: for a day per success the target does its best to come, and the spell ends on greeting. Within a mile there is no resisting; beyond, contested Willpower at 6."),
    R("lordsbane", "spirit", "Lords' Bane", { trickster: 2 }, 86, "Each success cancels one success of the target's Charisma rolls; if the mage has more successes, the speaker botches and looks a fool."),
    R("otherskin", "spirit", "Otherskin", { trickster: 3 }, 87, "Two successes change the mage's sex until the next dawn; each extra adds one to Charisma, Appearance, Leadership or Subterfuge for that time."),
    R("antics", "spirit", "Sacred Antics", { trickster: 3 }, 87, "Two turns per success: Athletics for outrageous stunts is at 5 (4 if playful), and cannot botch. Not for combat."),
    R("selfpossess", "spirit", "Self Possession", { chieftain: 1 }, 87, "For the scene, the successes come off every attempt to possess or control the mage's mind."),
    R("shelterwinds", "spirit", "Sheltering Winds", { chieftain: 2, warrior: 2 }, 87, "For the scene, each success takes one success off every missile attack at the mage."),
    R("slipshadow", "spirit", "Slip the Shadow", { trickster: 3 }, 87, "The shadow roams free and obedient a scene per success; with Wise One 3 it reports what it sees and hears. A botch: it rebels, and the mage loses half the permanent Willpower (back a point a day) until a new shadow grows."),
    R("slowdream", "spirit", "Slow Dream Curse", { trickster: 3, warrior: 2 }, 87, "Each success slows one target for the scene: Initiative 1, −1 difficulty to hit it, a quarter of its movement. Against Celerity each success takes away one extra action first."),
    R("spiritarmy", "spirit", "Spirit Army", { chieftain: 2, warrior: 5, wiseone: 3 }, 88, "Sensitivity + Warrior: two soldiers per success from like vessels (corpses, trees, armour, stones). Mental and Social 1. Skeletons Str 2 Dex 3 Sta 2, Brawl 2 Melee 4; stone 5/2/6, Brawl 4 Melee 1; oak 4/2/5, Brawl 3 Melee 2; willow 3/5/3, Brawl 3 Melee 3; armour 3/3/6, Brawl 2 Melee 4. Best extended."),
    R("guidedarrow", "spirit", "Spirit-Guided Arrow", { warrior: 2 }, 88, "Each success adds a success to the next Archery roll; extra successes go to damage."),
    R("welcomewaters", "spirit", "Welcoming Waters", { chieftain: 3, warrior: 3, wiseone: 3 }, 88, "Sensitivity + Wise One, at water bigger than a pond: one arm of water per success, each with Strength and Dexterity equal to the successes. Blades, even magical ones, do not harm them; five or more can take a small boat."),
    R("dreamblade2", "spirit", "Wield the Dreamblade", { warrior: 4 }, 88, "After three turns of waking dream, an unseen weapon on the fourth: Strength + the successes, aggravated; +1 difficulty to dodge it. Lasts a turn per permanent Willpower dot and can be called back in a turn later in the scene."),
    R("willowbody", "spirit", "Willow Body", { trickster: 3 }, 89, "A turn per success: bones bend, limbs stretch six inches per success, and the mage fits a hole three inches square. If it lapses mid-squeeze, up to 4 aggravated dice."),
    // Valdaermen (pp. 96–101; they roll Blot + a Pillar)
    R("baldur", "valdaermen", "Baldur's Blessing", { forlog: 4, hjaldar: 4 }, 96, "Nearly a day writing the names of all things on the target's skin. For the scene each success takes a success off every roll to harm the target. Mistletoe is not stopped."),
    R("directstrike", "valdaermen", "Direct Strike", { fara: 4, hjaldar: 3 }, 96, "The foe's name on the weapon strikes at any distance (one out of sight must be found first): two attacks per success, one a turn, rolled as usual and impossible to dodge. Overuse brands the caster a coward."),
    R("battlesmite", "valdaermen", "Battle Smite", { forlog: 4, hjaldar: 3 }, 96, "A rune-carved spear set in the field, which must be seen (Fara 4 if unseen). One enemy blinded and deafened per success: Perception 0, Dexterity 1, −5 dice to hit, no dodging. In a great battle, extended, a roll a turn."),
    R("berserk", "valdaermen", "Berserkgangr", { hjaldar: 2 }, 96, "A turn per success, on the mage or an eager target: Dexterity −1, Strength +2, Charisma, Manipulation and Intelligence 1, no wound penalties. Damage is held back and taken at the end, less one level per success."),
    R("gungnir", "valdaermen", "Borrowing Gungnir", { hjaldar: 3 }, 97, "For the scene, every hit with the named spear adds the successes as aggravated dice; the spear cannot break, and splinters at the scene's end."),
    R("bridgewill", "valdaermen", "Bridge of Will", { fara: 3 }, 97, "Blood runes on feet, shoes or wheels: one success per walker (2 for a horse or wagon) to cross up to a mile of water. Extended, ten minutes a roll."),
    R("cunningsight", "valdaermen", "Cunning Sight", { forlog: 1, galdrar: 1 }, 97, "Each success answers one yes-or-no question about a stranger in view (a mage? beyond human? friendly? dangerous? rich? local?)."),
    R("firekiller", "valdaermen", "Fire Killer", { forlog: 2, hjaldar: 2 }, 98, "Puts out a fire at once: 1 success a fist-sized flame, 2 a campfire, 4 a forge or bonfire, 5 a burning house, 6 or more a forest fire. Extended while the mage traces the rune-poem; out of sight needs Fara."),
    R("findinghere", "valdaermen", "Finding Here", { fara: 1 }, 98, "1 success: has the mage been here before; 2: where it lies on the mage's own map of the world; 3: the way to where the mage wants to go."),
    R("tracking", "valdaermen", "Flawless Tracking", { fara: 1 }, 98, "Each success tracks one target for a day over natural ground; +1 difficulty per week since it passed."),
    R("frostbite", "valdaermen", "Frostbite", { hjaldar: 3 }, 98, "Each success is −1 Dexterity; past 0 the rest are bashing levels. If hurt, Stamina at the caster's successes: success heals at half speed, failure is gangrene (lose the part or die within days), a botch loses a Stamina dot."),
    R("fylgja", "valdaermen", "Fylgja", { forlog: 4, galdrar: 3 }, 98, "Binds a guardian spirit to the soul, best as an Ongoing spell: it warns of danger, guides, and steps in front of a blow that would leave the mage Wounded. Strength by successes: 1–2 none, 3–5 weak, 6–8 moderate, 9 strong, 10 or more very strong; ten times that for a lifelong companion."),
    R("lovemagic", "valdaermen", "Love Magic", { forlog: 2, galdrar: 2 }, 99, "Each success raises the feeling a step, from liking the mage's company (1) to burning longing (5 or more)."),
    R("mimir", "valdaermen", "Mimir's Head", { galdrar: 3 }, 99, "A head taken within a day of death, runes on tongue and brow: one question per success, answered from all the person knew, secrets too. With Forlog 3 and a week in mead and herbs, it speaks for Fate instead, truthfully and often in riddles."),
    R("hlidskialf", "valdaermen", "Perching atop Hlidskialf", { fara: 3, galdrar: 2 }, 99, "From a chair carved with the seat's name: a turn of searching per success, each with a Perception roll at 3 (outdoors, unhidden), 5 (indoors), 7 (far or hard to find) or 9 (carefully hidden)."),
    R("scornpole", "valdaermen", "Scorn Pole", { forlog: 3, galdrar: 3 }, 100, "A day per success (never Ongoing; it ends when the horse head rots): the target is +2 difficulty on everything, its wonders fail, familiars leave and guardian spirits are warded off. Only its maker can take it down."),
    R("skald", "valdaermen", "Skald's Curse or Blessing", { forlog: 4 }, 100, "A poem on a stone in the town's centre: ±1 to the chosen Attribute per three successes. Suits an Ongoing spell; smashing the stone lets it fade as people forget."),
    R("skogarmathur", "valdaermen", "Skogarmathur (Banishment)", { forlog: 3, hjaldar: 2 }, 100, "Three hours of carving a roll: outlawed a week per success. The outlaw counts as Appearance and Charisma 1, all social rolls +3 difficulty, and no one gives food, money or shelter."),
    R("snowglide", "valdaermen", "Snow Glide", { fara: 2 }, 101, "Runes on skis or bone skates; needs Dexterity 3. Speed over snow or ice is multiplied by the successes."),
    R("summonpack", "valdaermen", "Summon the Pack", { hjaldar: 3 }, 101, "Wild places only: one wolf per success. Wolf: Str 4 Dex 3 Sta 4, Per 6 Wits 5; Alertness 2, Athletics 2, Brawl 3, Dodge 2, Stealth 3, Survival 5; Willpower 3; Health OK, −1, −1, −3, −5, Incapacitated; bite or claw 4 lethal dice."),
    R("switch", "valdaermen", "Switch", { fara: 3, forlog: 3 }, 101, "A rune swallowed beforehand, with successes at least the jailer's Willpower (extended, an hour of carving a roll). The next time the mage is imprisoned, mage and jailer change places."),
    R("wavecalmer", "valdaermen", "Wave Calmer", { fara: 3 }, 101, "A rune hung from the prow: 2 or more successes calm the sea within thirty feet for an hour per success.")
];

/* ------------------------------------------------------------------ */
/*  The calendar (pp. 110–111)                                         */
/* ------------------------------------------------------------------ */

/** The first day of each season, with the magic it favours (p. 110). */
export const SEASON_DAYS = [
    { month: 3, day: 21, id: "spring", label: "the Spring Equinox", suits: "creating, nurturing and growing (destruction is harder)" },
    { month: 6, day: 21, id: "summer", label: "the Summer Solstice", suits: "aggressive, overt magic (subtle and passive magic is harder)" },
    { month: 9, day: 21, id: "autumn", label: "the Autumn Equinox", suits: "earth and possessions" },
    { month: 12, day: 21, id: "winter", label: "the Winter Solstice", suits: "introspective and spiritual magic (direct physical effects are harder)" }
];
export const seasonDay = (month, day) => SEASON_DAYS.find(s => s.month === Number(month) && s.day === Number(day)) ?? null;

/** Quintessence from the Moon (p. 111): an offering in a night casting, used at once, fading a point per five minutes. */
export const MOON_OFFERINGS = { prayer: { label: "A prayer written in the caster's own blood", gain: 1 }, calf: { label: "A calf", gain: 3 },
    greater: { label: "A greater sacrifice (the Storyteller sets the points)", gain: null } };
export function moonOffering(kind, phaseIndex, setPoints = 0) {
    const base = MOON_OFFERINGS[kind] ?? MOON_OFFERINGS.prayer;
    const o = { gain: base.gain ?? Math.max(1, Number(setPoints) || 1) };
    const i = Number(phaseIndex);
    const phase = i === 0 ? "new" : i === 4 ? "full" : i < 4 ? "waxing" : "waning";
    const fits = { new: "beginnings and blessings", waxing: "health and growth", full: "any magic", waning: "banishing" }[phase];
    return { gain: o.gain + (phase === "full" ? 1 : 0), phase, fits, fades: "use it at once: unused, it fades a point every five minutes" };
}

/* ------------------------------------------------------------------ */
/*  Specialties and experience (pp. 112, 118)                          */
/* ------------------------------------------------------------------ */

/** A Foundation specialty gives +1 die on castings within it; a Pillar specialty re-rolls 10s. Both need the trait at 4
 *  or more, within the mage's own fellowship. */
export const SPECIALTY = { minRating: 4, xp: { foundation: 5, pillar: 3 } };
export const specialtyAllowed = rating => Number(rating) >= SPECIALTY.minRating;
/** Re-rolling 10s: how many dice to roll again. faces from one roll. */
export const tensIn = faces => (faces ?? []).filter(f => f === 10).length;

/** Experience for another fellowship's magic (p. 118). */
export const XP_FOREIGN = { newFoundation: 25, foundation: c => 10 * c, newPillar: 15, pillar: c => 8 * c };

/* ------------------------------------------------------------------ */
/*  Countermagic (pp. 122–123)                                         */
/* ------------------------------------------------------------------ */

/** Unless noted: a reflexive casting, 1 Quintessence, its successes cancel the spell's one for one. */
export const COUNTERMAGIC = {
    batini: [["hajj", 4, "scatter the spell"], ["layl", 5, "go unnoticed by others' spells (a personal bank of successes)"], ["anbiya", 5, "falsely fulfil the condition of a conditional enchantment"]],
    messianic: [["uriel", 4, "counter the spell"]],
    oldfaith: [["winter", 4, "suppress ongoing magic for a time"], ["winter", 5, "dissolve any spell"]],
    hermes: [["primus", 3, "ordinary countermagic (Aegis Magicus)"], ["primus", 5, "destroy even a permanent enchantment"]],
    spirit: [["trickster", 5, "evade the spell"], ["wiseone", 5, "unmake any enchantment"]],
    valdaermen: [["galdrar", 4, "counter the spell"]]
};
export const counterOptions = (fellowship, ratings = {}) => (COUNTERMAGIC[fellowship] ?? [])
    .map(([key, level, what]) => ({ key, level, what, ok: (Number(ratings[key]) || 0) >= level }));
/** The incoming spell's successes left after countermagic. */
export const countered = (incoming, counterSuccesses) => Math.max(0, Number(incoming) - Math.max(0, Number(counterSuccesses) || 0));

/* ------------------------------------------------------------------ */
/*  Using the Art (pp. 113–117, 153): which Pillar levels each         */
/*  fellowship needs for common effects                                */
/* ------------------------------------------------------------------ */

/** [effect, {fellowship: text}, page]. A reference for the Storyteller and players, searchable in the guide. */
export const ART_GUIDE = [
    ["Detect magic", { batini: "Al-Layl 1 (now or recent), Al-Anbiya 2 (long ago)", messianic: "Repha-El 1, Uri-El 3 (old)", oldfaith: "Autumn 1, Autumn 3 (ancient)", hermes: "Primus 1 (any age)", spirit: "Wise One 1 (new), 2 (older)", valdaermen: "Galdrar 1" }, 113],
    ["Sense supernatural beings", { batini: "Al-Layl 2 (+ Al-Hajj 2 far away; Al-Layl 4 the rough kind)", messianic: "Gavri-El 2 (+ Uri-El 1 the walking dead)", oldfaith: "Autumn 1 mages, Spring 1 fae, Summer 1 shapechangers, Winter 1 vampires and the dead", hermes: "Primus 2", spirit: "Wise One 2 (+ Trickster 5 the exact kind)", valdaermen: "Galdrar 2, Galdrar 4 for specifics" }, 113],
    ["Convince", { batini: "Al-Layl 1 (believable), 4 (outrageous)", messianic: "Mikha-El 4 (almost anything), 5 (the rest)", oldfaith: "Autumn 4 (a wise course), Summer 4 (a rash one)", hermes: "Corona 2 (small lies), 3 (against belief, briefly), 4 (lasting)", spirit: "Trickster 2 and up", valdaermen: "Forlog 3 (reasonable), 4 (unreasonable)" }, 114],
    ["Speak other languages", { batini: "Al-Fatihah 2", messianic: "Gavri-El 3", oldfaith: "Autumn 3 + Spring 1", hermes: "Corona 3", spirit: "Wise One 3", valdaermen: "Galdrar 3" }, 114],
    ["Friendship or respect", { batini: "Al-Fatihah 4", messianic: "Mikha-El 3 (respect), Repha-El 3 (friendship)", oldfaith: "Spring 3", hermes: "Corona 2 (kept up by deeds), 3 (forced)", spirit: "Trickster 2 or 3", valdaermen: "Forlog 2 (kept up), 3 (compelled)" }, 114],
    ["Harm directly", { batini: "Al-Hajj 3: weapon damage ignoring armour at casting range, +1 level per success; Al-Hajj 4: one blade in several places, cancelling parries and dodges", messianic: "as the core book", oldfaith: "as the core book", hermes: "as the core book", spirit: "as the core book", valdaermen: "as the core book" }, 114],
    ["Heal", { batini: "Al-Hajj 3 + Al-Layl 4 (bashing and lethal); Al-Layl 5 for aggravated", messianic: "as the core book", oldfaith: "as the core book", hermes: "as the core book", spirit: "as the core book", valdaermen: "as the core book" }, 115],
    ["Soak aggravated damage (successes soak for a scene; 1 Quintessence)", { batini: "Al-Hajj 4 (Al-Hajj 3 for bashing and lethal)", messianic: "Gavri-El 3 + Repha-El 3", oldfaith: "Autumn 4", hermes: "Primus 2 on clothes or armour (its own soak, no Quintessence), or Anima 3 + Primus 3", spirit: "Warrior 3", valdaermen: "Hjaldar 4" }, 115],
    ["Command animals", { batini: "Al-Fatihah 3 (a common beast), 4 (one trained to be hostile)", messianic: "Mikha-El 3 (authority) or Repha-El 3 (loyalty); both for an obedient pet", oldfaith: "Spring 3", hermes: "Corona 2 (docile), 4 (hostile)", spirit: "Chieftain 3", valdaermen: "Fara 4 (wild), Forlog 3 (trained)" }, 115],
    ["Endure harsh conditions", { batini: "Al-Fatihah 5 + Al-Layl 4", messianic: "Gavri-El 2 warmth, Repha-El 2 water, Mikha-El 4 (+ Repha-El 4 stills a blizzard nearby)", oldfaith: "Spring 3; Autumn 4 needs no food", hermes: "Anima 4; Corona 4 for animals", spirit: "Wise One 2", valdaermen: "Fara 5; Forlog 3 for luck on a long road" }, 115],
    ["Make a spirit half-solid", { batini: "Al-Fatihah 2 + Al-Hajj 4 (djinn)", messianic: "", oldfaith: "", hermes: "Corona 4 + Primus 2", spirit: "", valdaermen: "" }, 116],
    ["Enter the Umbra", { batini: "", messianic: "", oldfaith: "", hermes: "Primus 4 tears the Gauntlet briefly", spirit: "", valdaermen: "" }, 116],
    ["Enter Arcadia", { batini: "Al-Hajj 5, or Al-Layl 5 at a crossing", messianic: "Gavri-El 5 at a crossroads or mound", oldfaith: "Spring 4", hermes: "Corona 4 + Primus 4, or Primus 5 at a crossing", spirit: "Trickster 5 or Wise One 5", valdaermen: "Galdrar 5, or Fara 4 at a crossing" }, 116],
    ["Summon a ghost", { batini: "never (blasphemy)", messianic: "Uri-El 4 (willing), + Mikha-El 2 (unwilling)", oldfaith: "Winter 3", hermes: "only Primus 5 (messy; works on demons too)", spirit: "Wise One 3; Wise One 4 to give it a body", valdaermen: "Fara 2 + Galdrar 4" }, 116],
    ["Animate a corpse", { batini: "never", messianic: "Gavri-El 3 + Uri-El 4 (a corpse per success, 1 Quintessence each), + Mikha-El 3 to fight", oldfaith: "Spring 4 + Winter 3 (the same), + Summer 3 to fight", hermes: "Anima 5 + Primus 3 (the same), or Vires 3 (one body) or 4 (one per success) with full concentration; Anima 5 + Corona 5 + Primus 4 for a thinking servant", spirit: "Chieftain 4 + Wise One 3, + Warrior 3 to fight; Chieftain 4 + Wise One 4 to put spirits in them", valdaermen: "Fara 3 + Galdrar 4, or Unsleeping Swords" }, 117],
    ["Create fog", { batini: "Al-Layl 3", messianic: "Repha-El 2 + Uri-El 2", oldfaith: "Winter 2", hermes: "Vires 3", spirit: "Trickster 3 (fog in the mind) or Wise One 3 (fog spirits)", valdaermen: "Fara 3 + Forlog 3" }, 153],
    ["Summon a storm", { batini: "Al-Anbiya 4", messianic: "Mikha-El 4", oldfaith: "Winter 3", hermes: "Vires 4", spirit: "Chieftain 3 + Wise One 3 (storm spirits harry one enemy ship)", valdaermen: "Hjaldar 3 (a storm as a weapon) or Fara 5" }, 153],
    ["Call a wind or speed a ship", { batini: "Al-Anbiya 4 (fair wind and calm sea)", messianic: "Gavri-El", oldfaith: "Spring 3, + Winter 2 to calm the waves", hermes: "Vires 3", spirit: "Wise One 3 with friendly wind spirits, else Chieftain 3 + Wise One 3", valdaermen: "Fara 2" }, 153]
];
export const artFor = (fellowship) => ART_GUIDE.map(([effect, by, page]) => ({ effect, text: by[fellowship] ?? "", page })).filter(x => x.text);

/** Pillar levels as a guide for new Pillars or untested effects (p. 117). */
export const PILLAR_LEVELS = ["", "perceive it, ward against it, +1 die per success to one Ability", "shape it a little: small changes, a few dice, a difficulty or two, 1–2 levels of harm, small amounts",
    "the fellowship's signature feats, small creations", "great transformations, unravelling enchantments, decent amounts of a substance", "vast creation; effects that last without an Ongoing spell"];

/* ------------------------------------------------------------------ */
/*  Certámen, the duel arcane (pp. 119–122)                            */
/* ------------------------------------------------------------------ */

/** Stances: difficulty to attack and to deflect (p. 120). */
export const STANCES = { balanced: { label: "Balanced", attack: 7, deflect: 7 }, offensive: { label: "Offensive", attack: 6, deflect: 8 }, defensive: { label: "Defensive", attack: 8, deflect: 6 } };

/** +1 to all of a duellist's rolls for each extra use of one Pillar across locus, aegis and gladius. */
export function samePillarPenalty(locus, aegis, gladius) {
    const counts = {};
    for (const p of [locus, aegis, gladius]) if (p) counts[p] = (counts[p] ?? 0) + 1;
    return Object.values(counts).reduce((s, c) => s + Math.max(0, c - 1), 0);
}

/** Contest of wills: the side with more successes gets +1 die in the next stage; a botch is −1 die (p. 120). */
export function willsBonus(a, b) {
    if (a.botch && b.botch) return { a: 0, b: 0 };
    return { a: a.botch ? -1 : a.successes > b.successes ? 1 : 0, b: b.botch ? -1 : b.successes > a.successes ? 1 : 0 };
}

/** The locus: each success puts 1 Quintessence in (from what is at hand, past the channel limit). A side that fails loses;
 *  both failing roll again at 7, then 8, then the duel is off (p. 120). */
export function locusOutcome(a, b, attempt = 1) {
    const fa = !(a.successes > 0), fb = !(b.successes > 0);
    if (fa && fb) return attempt >= 3 ? { result: "off" } : { result: "again", difficulty: 6 + attempt };
    if (fa) return { result: "b-wins" };
    if (fb) return { result: "a-wins" };
    return { result: "duel", a: a.successes, b: b.successes };
}

/** One strike: if the attack's successes beat the deflection's, the damage dice are the attacker's Foundation + 1 per
 *  success past the deflection; the defender soaks with Foundation dice (p. 121). */
export function strikeDamage(attackSuccesses, deflectSuccesses, foundation) {
    const over = Number(attackSuccesses) - Number(deflectSuccesses);
    if (over <= 0) return { hits: false, dice: 0 };
    return { hits: true, dice: Number(foundation) + (over - 1) };
}
/** Each unsoaked success knocks a Quintessence out of the locus; an empty locus loses. */
export function knock(locus, damageSuccesses, soakSuccesses) {
    const lost = Math.max(0, Number(damageSuccesses) - Number(soakSuccesses));
    const left = Math.max(0, Number(locus) - lost);
    return { lost: Math.min(lost, Number(locus)), left, out: left <= 0 };
}
/** Resolution: the winner takes the stake and gets back its own locus plus half (down) the loser's at the start; the
 *  loser keeps the rest. No rematch for a year and a day (p. 122). */
export function certamenSpoils(winnerStart, loserStart) {
    const half = Math.floor(Number(loserStart) / 2);
    return { winner: Number(winnerStart) + half, loser: Number(loserStart) - half, rematch: "a year and a day" };
}
/** Who accepts a challenge (p. 121). */
export const DUELLISTS = { hermes: "almost always", valdaermen: "usually", oldfaith: "usually", spirit: "sometimes", messianic: "sometimes", batini: "almost never" };

/* ------------------------------------------------------------------ */
/*  Wonders (pp. 140–141)                                              */
/* ------------------------------------------------------------------ */

/** The Grimoire's wonders have no dot ratings or Quintessence pools; only what the text sets is given. */
export const WONDERS = [
    { id: "apples", name: "Red and White Apples of Avalon", page: 140, effect: "One apple for each visitor, ever. The red brings pain and visions (not deadly in itself); the white heals the mind (night terrors, madness, lost speech), not the body." },
    { id: "chalice", name: "Chalice of Rain", page: 140, effect: "Filled and poured out as an offering to the fae: rain falls before the next moonrise." },
    { id: "brooch", name: "Brooch of Scrying", page: 140, effect: "Ask one yes-or-no question and smash it: the stone stays white for yes, turns black for no. One use." },
    { id: "brazier", name: "Brazier of Summoning", page: 140, effect: "For Batini, Messianic and Hermetic mages who read Sanskrit. Extended Foundation + Al-Hajj, Uri-El or Primus, 10 successes; the brazier gives the power, so 1 dot in that Pillar is enough. Calls a random spirit of the chosen kind (demon, elemental, djinn), of any temper, with no protection." },
    { id: "dowsingrod", name: "Dowsing Rod", page: 141, effect: "Yew. Spend a Willpower and concentrate: it leads to anything sought within 200 yards, and wanders if the focus slips." }
];
