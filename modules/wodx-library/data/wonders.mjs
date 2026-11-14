/**
 * WoDX Library: supernatural items players can make, by line (B3630-B3636). Data only; the rules are in
 * scripts/wonder-rules.mjs and Storyteller's long tasks run the work.
 *
 * Every row is WoDX's own short summary with a page reference, never book text. `pdf` is the page-file number in the
 * book-text store; `page` a printed page where known. Werewolf first (Ben's Item Crafting Desk, 2026-11-13); the
 * other lines add rows here with their own `line` and `make` keys.
 *
 * Row: {key, name, line, kind, level, gnosis, spirit (what must be bound, in words), court (spirit court key in
 *   WoDX Otherworlds), does, book, pdf, page?, weapon?, silver?, breeds?, tribe?, onlyFemale?, house?}
 *   kind: "fetish" (lasting, attuned, activated at its Gnosis) or "talen" (one use; the binding makes several)
 *   weapon: {attr, bonus, type, diff, ability, hands, note}; silver: points off the carrier's effective Gnosis
 *   breeds: which Changing Breeds make it (default ["garou"]); a Fera breed's own fetishes name only that breed
 */

/** How each kind of item is made: the rite or power it needs, the roll, and what lowers it. */
export const MAKES = {
  fetish: {
    label: "Rite of the Fetish", rite: /rite of the fetish/i, riteLevel: 3, attr: "wits", ability: "rituals", diff: 10, goal: 1,
    cleanse: 3, interval: "day", gnosisCut: 2,
    ref: "W20 Rite of the Fetish (book p. 213, pdf 215): the vessel is cleansed for three nights in running water, pure earth, wind or above flame; then Wits + Rituals at difficulty 10, two lower for each permanent Gnosis spent, lower again for good persuasion of the spirit; a spirit forced in must first be beaten to 0 Essence."
  },
  talen: {
    label: "Rite of Binding", rite: /rite of binding/i, riteLevel: 1, attr: "", ability: "", pool: "willpower", diff: "gnosis", goal: 1,
    cleanse: 0, interval: "day", gnosisCut: 1, minSpend: 1,
    ref: "W20 Rite of Binding (book p. 210, pdf 212): only with the spirit present, its Gnosis lowered by one for each Gnosis the binder spends (at least one); then Willpower at the spirit's lowered Gnosis. A talen's Gnosis is the spirit's; one talen for each success, and a stronger spirit adds two or three more (talens, book p. 228, pdf 229)."
  }
};

/** Extra talens from a stronger spirit (W20 pdf 229 says two or three; which is which is a house reading, B3633). */
export const TALEN_EXTRA = {gaffling: 0, jaggling: 2, greater: 3};

/** Who may use these rites (W20 core; W20 Kinfolk is still to be read: the Kinfolk row is a house reading, B3634). */
export const MAKERS = {
  garou: {label: "Garou and the other Changing Breeds", needs: "the rite known, Rituals at least the rite's level"},
  kinfolk: {label: "Kinfolk with Gnosis", needs: "the rite known, at least 1 permanent Gnosis, Rituals at least the rite's level", house: true}
};

const W20 = "W20 core";
export const WONDERS = [
  // ---------------- Level One ----------------
  {key: "apeskin", name: "Apeskin", line: "garou", kind: "fetish", level: 1, gnosis: 6, spirit: "an ancestor-spirit of the homid line", court: "totem",
    does: "A tattooed scrap of skin that lets a lupus or metis pass among people without a hint of the wolf.", book: W20, pdf: 223},
  {key: "harmony-flute", name: "Harmony Flute", line: "garou", kind: "fetish", level: 1, gnosis: 5, spirit: "a bird-spirit, or a spirit of peace, calm or water", court: "bird",
    does: "Played with a Performance roll, its tune calms the angry and quiets a fight.", book: W20, pdf: 223},
  {key: "magpies-swag", name: "Magpie's Swag", line: "garou", kind: "fetish", level: 1, gnosis: 5, spirit: "a magpie- or marsupial-spirit", court: "bird",
    does: "A bag that holds three times what it should; dedicated, it counts as one item however much is in it.", book: W20, pdf: 223},
  {key: "mirrorshades", name: "Mirrorshades", line: "garou", kind: "fetish", level: 1, gnosis: 7, spirit: "a glass elemental", court: "elemental",
    does: "Sunglasses mirrored on the inside: stepping sideways through them treats the Gauntlet as 2 lower.", book: W20, pdf: 224},
  {key: "nyxs-bangle", name: "Nyx's Bangle", line: "garou", kind: "fetish", level: 1, gnosis: 6, spirit: "a spirit of night or darkness", court: "elemental",
    does: "A silver bracelet that hides the wearer in shadow at night; only the eyes still shine.", book: W20, pdf: 224},
  {key: "truth-earring", name: "Truth Earring", line: "garou", kind: "fetish", level: 1, gnosis: 6, spirit: "a servant of Falcon", court: "bird",
    does: "Hums when the wearer hears a lie; spoken or sound deceptions against them are at +3 difficulty.", book: W20, pdf: 224},
  // ---------------- Level Two ----------------
  {key: "cup-of-the-alicorn", name: "Cup of the Alicorn", line: "garou", kind: "fetish", level: 2, gnosis: 6, spirit: "a healing-spirit, or a snake- or bear-spirit", court: "beast",
    does: "Poison or any harmful thing poured into it is made harmless.", book: W20, pdf: 224},
  {key: "chameleon-skin", name: "Chameleon Skin", line: "garou", kind: "fetish", level: 2, gnosis: 7, spirit: "a chameleon-spirit", court: "beast",
    does: "A belt or headband that works as the Gift Camouflage in the place it is attuned to (wild, or city for some Glass Walkers).", book: W20, pdf: 225},
  {key: "dagger-of-retribution", name: "Dagger of Retribution", line: "garou", kind: "fetish", level: 2, gnosis: 5, spirit: "a vengeance-spirit", court: "totem",
    does: "An iron dagger that pulls toward a stolen thing and the thief who took it.", book: W20, pdf: 225},
  {key: "dream-stealer", name: "Dream Stealer (Chimera Gem)", line: "garou", kind: "fetish", level: 2, gnosis: 5, spirit: "a dream-spirit or one of Cuckoo's brood", court: "wyld",
    does: "A gem set near a sleeper that shows their dream playing inside the stone.", book: W20, pdf: 225},
  {key: "spirit-tracer", name: "Spirit Tracer", line: "garou", kind: "fetish", level: 2, gnosis: 5, spirit: "a predator-spirit, or any spirit with the Tracking Charm", court: "beast",
    does: "An iron ingot with a hair in it that pulls toward one chosen spirit.", book: W20, pdf: 225},
  // ---------------- Level Three ----------------
  {key: "baneskin", name: "Baneskin", line: "garou", kind: "fetish", level: 3, gnosis: 7, spirit: "a parrot- or mockingbird-spirit", court: "bird",
    does: "A wrapped scrap of Bane: malevolent spirits take the wearer for one of their own until the wearer turns on them.", book: W20, pdf: 225},
  {key: "beast-mask", name: "Beast Mask", line: "garou", kind: "fetish", level: 3, gnosis: 8, spirit: "the spirit of the animal carved on the mask", court: "beast",
    does: "Worn and woken, the wearer becomes that animal, with its flight, gills or senses, until the mask comes off.", book: W20, pdf: 225},
  {key: "dsiah", name: "D'siah", line: "garou", kind: "fetish", level: 3, gnosis: 6, spirit: "a war-spirit, usually one of Cobra's brood", court: "beast", tribe: "Silent Striders",
    does: "A crescent flint knife; it does aggravated damage only to the Wyrm-tainted and to spirits.", book: W20, pdf: 225,
    weapon: {attr: "strength", bonus: 0, type: "lethal", diff: 7, ability: "melee", hands: 1, note: "Aggravated against Wyrm-tainted creatures and any spirit."}},
  {key: "fang-dagger", name: "Fang Dagger", line: "garou", kind: "fetish", level: 3, gnosis: 6, spirit: "a snake-spirit, or a spirit of war, pain or death", court: "beast",
    does: "A blade of tooth or tusk; woken after a hit, it doubles the damage successes before soak, as aggravated damage.", book: W20, pdf: 226,
    weapon: {attr: "strength", bonus: 1, type: "lethal", diff: 6, ability: "melee", hands: 1, note: "Woken after a hit: damage successes doubled before soak, aggravated.", house: true}},
  {key: "partridge-wing", name: "Partridge Wing", line: "garou", kind: "fetish", level: 3, gnosis: 7, spirit: "a spirit of water or forgetting", court: "elemental",
    does: "Soothes the Delirium: frightened people calm down and forget more of what they saw.", book: W20, pdf: 226},
  {key: "phoebes-veil", name: "Phoebe's Veil", line: "garou", kind: "fetish", level: 3, gnosis: 7, spirit: "a Lune, a chameleon-spirit, or a spirit of illusion or shadow", court: "wyld",
    does: "A half-moon pendant: at night the wearer vanishes for a minute a success.", book: W20, pdf: 226},
  {key: "sanctuary-chimes", name: "Sanctuary Chimes", line: "garou", kind: "fetish", level: 3, gnosis: 6, spirit: "a protection-spirit or a turtle-spirit", court: "beast",
    does: "For a day no spirit can take form within 100 feet unless asked in.", book: W20, pdf: 226},
  {key: "sun-whip", name: "Sun Whip", line: "garou", kind: "fetish", level: 3, gnosis: 7, spirit: "a spirit of flame or sunlight", court: "elemental",
    does: "A gold-weighted whip that bursts into sun or flame on touching a vampire.", book: W20, pdf: 226,
    weapon: {attr: "strength", bonus: 1, type: "lethal", diff: 7, ability: "melee", hands: 1, note: "Strength + 4 aggravated against vampires."}},
  {key: "wind-whistle", name: "Wind Whistle", line: "garou", kind: "fetish", level: 3, gnosis: 5, spirit: "a wind elemental, in bone from a beast that died of cold", court: "elemental",
    does: "Calls a snowy wind for an hour that hides the pack's tracks and costs pursuers a die on every roll.", book: W20, pdf: 226},
  // ---------------- Level Four ----------------
  {key: "feathered-cloak", name: "Feathered Cloak", line: "garou", kind: "fetish", level: 4, gnosis: 8, spirit: "a bird-spirit (the book leaves the kind open)", court: "bird", house: true,
    does: "Thousands of feathers and years of work: the wearer flies at running pace, at a cost in Stamina.", book: W20, pdf: 226},
  {key: "ironhammer", name: "Ironhammer", line: "garou", kind: "fetish", level: 4, gnosis: 5, spirit: "a war-spirit, in a hammer of silver-laced iron", court: "totem", tribe: "Get of Fenris",
    does: "A one-handed war hammer that can be thrown 10 yards a dot of Strength and comes back to its owner.", book: W20, pdf: 227,
    weapon: {attr: "strength", bonus: 2, type: "aggravated", diff: 6, ability: "melee", hands: 1, note: "Garou may soak it: the iron outweighs the silver."}},
  {key: "klaive", name: "Klaive", line: "garou", kind: "fetish", level: 4, gnosis: 6, spirit: "a war-spirit", court: "totem", silver: 1,
    does: "The Garou Nation's silver fetish dagger, usable in Homid, Glabro or Crinos; its war-spirit lets it wound any foe with aggravated damage. Drawing one on another Garou is a challenge to the death.", book: W20, pdf: 227,
    weapon: {attr: "strength", bonus: 2, type: "aggravated", diff: 6, ability: "melee", hands: 1, note: "Werewolves can soak it only in their breed form."}},
  {key: "labrys-of-isthmene", name: "Labrys of Isthmene", line: "garou", kind: "fetish", level: 4, gnosis: 7, spirit: "a war-spirit", court: "totem", tribe: "Black Furies", onlyFemale: true,
    does: "A two-headed war axe; woken, it gives the Gift Spirit of the Fray for the scene. It will not work for a male Garou.", book: W20, pdf: 227,
    weapon: {attr: "strength", bonus: 4, type: "aggravated", diff: 7, ability: "melee", hands: 2, note: "One-handed with Strength 6 or more."}},
  {key: "monkey-puzzle", name: "Monkey Puzzle", line: "garou", kind: "fetish", level: 4, gnosis: 6, spirit: "a ghost, an illusion-spirit or a trickster-spirit", court: "wyld",
    does: "People who see the werewolf take them for an ordinary person in any form, though what they do still shows.", book: W20, pdf: 227},
  {key: "spirit-whistle", name: "Spirit Whistle", line: "garou", kind: "fetish", level: 4, gnosis: 8, spirit: "a screech-owl spirit, or a spirit of madness or discord", court: "bird",
    does: "Its scream hurts every spirit in sight; each must beat the activation with Gnosis or flee.", book: W20, pdf: 227},
  {key: "puda", name: "Personal Umbral Digital Application", line: "garou", kind: "fetish", level: 4, gnosis: 8, spirit: "a bee-spirit", court: "weaver", tribe: "Glass Walkers", from: 1985, house: true,
    does: "A handheld device whose bee-spirit keeps a hive of files in the Umbra around it.", book: W20, pdf: 228},
  {key: "unbroken-cord", name: "Unbroken Cord", line: "garou", kind: "fetish", level: 4, gnosis: 6, spirit: "a unity-spirit, such as a flock's", court: "bird",
    does: "Knotted cord worn by a whole pack: the leader spends 1 Gnosis to share one Ability with the others for a scene.", book: W20, pdf: 228},
  // ---------------- Level Five ----------------
  {key: "grand-klaive", name: "Grand Klaive", line: "garou", kind: "fetish", level: 5, gnosis: 7, spirit: "a war-spirit, and usually a second spirit (fire, an ancestor)", court: "totem", silver: 2,
    does: "A legendary silver sword, often tied to a lineage; a second spirit inside can add soak against fire or dots in an Ability.", book: W20, pdf: 228,
    weapon: {attr: "strength", bonus: 3, type: "aggravated", diff: 7, ability: "melee", hands: 2, note: "Werewolves can soak it only in their breed form."}},
  {key: "jarlhammer", name: "Jarlhammer", line: "garou", kind: "fetish", level: 5, gnosis: 6, spirit: "a war-spirit and a silver-spirit together", court: "totem", tribe: "Get of Fenris",
    does: "One of seven great two-handed hammers, each with a name and a power of its own; a killing blow rings like thunder.", book: W20, pdf: 228,
    weapon: {attr: "strength", bonus: 3, type: "aggravated", diff: 7, ability: "melee", hands: 2, note: "Counts as silver: Garou cannot soak it. Thrown 5 yards a dot of Strength."}},
  {key: "runestones", name: "Runestones (a divining fetish)", line: "garou", kind: "fetish", level: 5, gnosis: 7, spirit: "a spirit of time, dream, riddles or wisdom", court: "wyld",
    does: "Runes, cards, bones or a crystal that show what is coming; more successes, truer sight.", book: W20, pdf: 229},
  // ---------------- Talens ----------------
  {key: "bane-arrow", name: "Bane Arrow", line: "garou", kind: "talen", gnosis: 4, spirit: "a spirit of war, air or pain", court: "elemental",
    does: "An obsidian arrow that always finds a Bane for three dice of aggravated damage.", book: W20, pdf: 230},
  {key: "chiropteran-spy", name: "Chiropteran Spy", line: "garou", kind: "talen", gnosis: 6, spirit: "a bat-spirit", court: "beast",
    does: "A carved bat that lives for up to 12 hours to scout or distract, then falls to sawdust.", book: W20, pdf: 230},
  {key: "death-dust", name: "Death Dust", line: "garou", kind: "talen", gnosis: 6, spirit: "a spirit of death, speech or divining", court: "wyld",
    does: "Sprinkled on someone dead less than a day, lets the werewolf speak with their spirit.", book: W20, pdf: 230},
  {key: "gaias-breath", name: "Gaia's Breath", line: "garou", kind: "talen", gnosis: 5, spirit: "a healing-spirit, in a gourd marked with glyphs", court: "beast",
    does: "Crushed over a wound, heals up to four health levels, aggravated ones too.", book: W20, pdf: 231},
  {key: "moon-glow", name: "Moon Glow", line: "garou", kind: "talen", gnosis: 8, spirit: "a Lune (no other spirit will do)", court: "wyld",
    does: "A moonbeam in a crystal that keeps chance dangers away on one Umbral journey.", book: W20, pdf: 231},
  {key: "moon-sign", name: "Moon Sign", line: "garou", kind: "talen", gnosis: 5, spirit: "a Lune, a Wyld-spirit or a wolf-spirit", court: "wyld",
    does: "A wax seal thrown before a werewolf: Willpower (7) or they drop into Lupus form.", book: W20, pdf: 231},
  {key: "nightshade", name: "Nightshade", line: "garou", kind: "talen", gnosis: 5, spirit: "a spirit of night or darkness", court: "elemental",
    does: "Drunk, turns the body to shadow for an hour; only someone searching can spot the user.", book: W20, pdf: 231},
  {key: "wind-snorkel", name: "Wind Snorkel", line: "garou", kind: "talen", gnosis: 3, spirit: "an air elemental, in a hollow reed or antler", court: "elemental",
    does: "Lets the user breathe through it underwater, underground or anywhere without air.", book: W20, pdf: 231},
  {key: "wyrm-scale", name: "Wyrm Scale", line: "garou", kind: "talen", gnosis: 8, spirit: "a Wyrm-spirit", court: "wyrm",
    does: "A sigil that forces servants of the Wyrm nearby back into their true shapes, then burns away.", book: W20, pdf: 231},
  // ---------------- The other Changing Breeds (Revised breedbooks; no W20 Changing Breeds text yet) ----------------
  {key: "armoire-of-abiele", name: "Armoire of Abiele", line: "garou", kind: "fetish", level: 1, gnosis: 5, spirit: "spider-spirits", court: "beast", breeds: ["ananasi"],
    does: "Whisper into its keyhole and open it: the right silk clothes for the occasion are inside.", book: "Breedbook: Ananasi", pdf: 99},
  {key: "devils-deck", name: "Devil's Deck", line: "garou", kind: "fetish", level: 1, gnosis: 5, spirit: "a trickster-spirit (house reading)", court: "wyld", breeds: ["bastet"], house: true,
    does: "A deck of cards that deals its owner whatever card helps most; adds dice to gambling.", book: "Breedbook: Bastet", pdf: 157},
  {key: "grandmothers-stones", name: "Grandmother's Stones", line: "garou", kind: "fetish", level: 2, gnosis: 5, spirit: "a Lune (house reading)", court: "wyld", breeds: ["bastet"], house: true,
    does: "Blue stones that catch moonlight and raise the Gnosis of a female werecat who wears them.", book: "Breedbook: Bastet", pdf: 158},
  {key: "sliver-of-helios", name: "Sliver of Helios", line: "garou", kind: "fetish", level: 1, gnosis: 3, spirit: "a sun-spirit (house reading)", court: "elemental", breeds: ["corax"], house: true,
    does: "A dagger-shaped slice of sunlight kept wrapped; uncovered, it lights a 10-foot cube with true sunlight.", book: "Breedbook: Corax", pdf: 86},
  {key: "dragon-crystal", name: "Dragon Crystal", line: "garou", kind: "fetish", level: 1, gnosis: 6, spirit: "a sun-spirit, or an insect-spirit woken in amber", court: "elemental", breeds: ["mokole"],
    does: "A lens of stone or amber that shows a true Mokole in Archid form and shines when it touches one.", book: "Breedbook: Mokole", pdf: 52},
  {key: "spirit-jar", name: "Spirit Jar", line: "garou", kind: "fetish", level: 2, gnosis: 5, spirit: "almost any spirit strong enough to be useful", court: "wyld", breeds: ["mokole"],
    does: "A sealed clay jar with a spirit inside that the owner bargains with for its Charms; broken, the angry spirit goes free.", book: "Breedbook: Mokole", pdf: 53},
  {key: "blade-of-the-kings", name: "Blade of the Kings", line: "garou", kind: "fetish", level: 5, gnosis: 6, spirit: "a shapeshifting spirit such as Butterfly or Octopus", court: "beast", breeds: ["mokole"],
    does: "An old Mokole weapon that changes shape with its wielder, Archid form included.", book: "Breedbook: Mokole", pdf: 54,
    weapon: {attr: "strength", bonus: 2, type: "aggravated", diff: 6, ability: "melee", hands: 1, note: "Often silver-edged; the damage bonus is a house figure.", house: true}},
  {key: "yantra", name: "Yantra", line: "garou", kind: "fetish", level: 1, gnosis: 6, spirit: "a spirit of wisdom (house reading)", court: "wyld", breeds: ["nagah"], house: true,
    does: "A mandala to meditate on; after a few turns (more in the deep Umbra) the owner knows exactly where they are.", book: "Breedbook: Nagah", pdf: 100},
  {key: "pipes-of-kokopelli", name: "Pipes of Kokopelli", line: "garou", kind: "fetish", level: 4, gnosis: 6, spirit: "a trickster-spirit (house reading)", court: "wyld", breeds: ["nuwisha"], house: true,
    does: "Wooden pipes only a werecoyote can use, to lead Banes and spirits into or out of the Umbra.", book: "Breedbook: Nuwisha", pdf: 54},
  {key: "pipes-of-the-swarm", name: "Pipes of the Swarm", line: "garou", kind: "fetish", level: 1, gnosis: 4, spirit: "an angry young Rat-spirit", court: "beast", breeds: ["ratkin"],
    does: "Played with a Gnosis roll, calls a swarm of rats with a health level a success.", book: "Breedbook: Ratkin", pdf: 73},
  {key: "net-of-vengeance", name: "Net of Vengeance", line: "garou", kind: "fetish", level: 4, gnosis: 7, spirit: "a sea-spirit (house reading), in a net stolen from a fishing boat", court: "elemental", breeds: ["rokea"], house: true,
    does: "Anyone caught in it starts to drown, whatever they breathe, until they tear or work free.", book: "Breedbook: Rokea", pdf: 82}
];

export const byKey = Object.fromEntries(WONDERS.map(w => [w.key, w]));
