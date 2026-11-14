/**
 * WoDX Actions: what each Demon evocation does (Demon: The Fallen pp. 172-216), in WoDX's own words, with the page in the
 * lore table (demon-rules.js LORES). Each entry: fx (the usual effect), lasts and range as the book sets them, high (the
 * high-Torment effect), and an effects-card spec for each (mage-da-effects.js helpers). A spec of null shows the card only.
 * Durations "FT" and "FD" run the demon's permanent Faith in turns or days; "T1" is a single turn.
 * Pure: no Foundry calls. Also the apocalyptic form's powers by name (FORM_POWERS).
 */
import { H, T, C, N, S, MV, HL, outcomesOf } from "./mage-da-effects.js";

const E = (fx, lasts, range, high, spec = null, highSpec = null) => ({ fx, lasts, range, high, spec, highSpec });

export const EVOCATIONS = {
    "fundament:1": E("Leap or climb 20 yards a success, or drop that far unhurt; successes equal to Stamina cancel gravity outright.", "one turn", "self",
      "Gravity lurches at random for people and things within Torment yards as the demon passes.", T("rise", "Manipulate Gravity", "T1", "self")),
    "fundament:2": E("Cling to slopes, walls and ceilings: 3 yards of travel a success (slope 6, wall 7, ceiling 8).", "one turn", "self",
      "Surfaces touched are seared: anyone touching them that turn takes 1 lethal.", T("rise", "Manipulate Adhesion", "T1", "self")),
    "fundament:3": E("Throw anything 30 yards a success whatever the Strength; catch a seen missile with successes at least its damage dice; on a thrown hit each extra success is a damage level.", "one turn", "touch",
      "The item botches on any 1, 2 or 3 for Torment turns.", null),
    "fundament:4": E("Supernatural speed: walk 10, jog 20 or run 40 yards a success; in a fight the successes become extra damage levels on close or thrown attacks, split as wished.", "one turn", "self",
      "A heat aura: every living being within Torment yards takes 1 bashing.", T("hasten", "Manipulate Acceleration", "T1", "self")),
    "fundament:5": E("Change touched matter's state, a cubic foot a success: water to ice or steam (6), water or air firm enough to stand on (7), vaporise cloth or wood (8), stone or metal (9). A living target takes a lethal level a success.", "one turn", "touch",
      "Changed matter keeps shifting state at random for Torment turns.", H("harm", 1, "lethal", {soak: false})),
    "humanity:1": E("Understand and be understood by one person a success, whatever language each speaks.", "the scene", "one a success",
      "A hidden Willpower roll at Torment difficulty; on a failure what the demon hears is twisted by hatred.", T("speak", "Translate", "scene", "self")),
    "humanity:2": E("One mortal a success sees the demon as a likely friend (Willpower resists): they talk openly and the demon's Manipulation rolls are 1 easier with them.", "the scene", "one a success",
      "They recoil in loathing and fear instead (Willpower at Torment difficulty); Intimidation against them is 2 easier.", T("sway", "Insinuate", "scene", "each")),
    "humanity:3": E("Mortals' eyes slide past the demon (Willpower 8 resists) until she touches or speaks to someone.", "the scene", "self",
      "Hidden from ordinary mortals, but blazing to anyone full of rage or bloodlust.", T("veil", "Fade", "scene", "self")),
    "humanity:4": E("A mortal in conversation answers every question truthfully (Willpower 7 resists) and later forgets the details unless asked directly.", "Faith turns", "one in conversation",
      "Draws out only the target's dark side: hidden hatreds, lusts and ambitions.", T("sway", "Confess", "FT", "one")),
    "humanity:5": E("Edit, erase (7) or plant (8) a mortal's memories, resisted by Willpower 7; a brief meeting needs one net success, days or weeks need two or more. Permanent.", "permanent", "one mortal",
      "Torment nights of nightmares: each night Willpower at Torment or lose a Willpower point; at none, a derangement.", null),
    "celestials:1": E("Every living being within Faith yards glows with its Faith; extra successes see through doors (1), brick (2), vault metal (3+). Aware demons resist with Willpower 8.", "one turn", "Faith yards",
      "Sees only the hollow souls: those with no Faith or Willpower left, and demons of Torment 9 or more.", T("sight", "Lamp of Faith", "T1", "self")),
    "celestials:2": E("Plant a vision in the minds of up to Faith people in sight: one turn of instructions or scene a success.", "instant", "Faith people in sight",
      "Terrifying visions: a bashing level a success, not soaked, to up to Faith people in sight; more than Wits levels means Willpower 8 or a derangement.", null, H("harm", 1, "bashing", {soak: false, who: "each"})),
    "celestials:3": E("Lend Faith to a demon whose name is known and who is in sight: a bonus die a success (up to permanent Faith) on that demon's next evocation. Repeats do not stack.", "next evocation", "one demon in sight",
      "Only blocks: the Devil's successes cancel the named demon's on a resisted roll.", T("boost", "Pillar of Faith", "T1", "one")),
    "celestials:4": E("A bolt of white fire at a target within Faith yards: an aggravated level a success (lethal against those who do not deal aggravated).", "instant", "Faith yards",
      "The fire bursts out in every direction: an aggravated level a success to everything within permanent Faith yards.", H("harm", 1, "aggravated"), H("harm", 1, "aggravated", {who: "all"})),
    "celestials:5": E("Seize another demon's evocation as it is used (more successes than its user, its name known, higher initiative): the Devil picks its target and effect.", "that evocation", "one demon",
      "Cannot steer others' evocations, but can throw one aimed at the Devil back at its user.", null),
    "flame:1": E("Feed a fire within Faith yards: a square foot larger a success.", "instant", "Faith yards",
      "The fire grows fiercer instead: +1 to its lethal damage a success.", null),
    "flame:2": E("Set alight anything burnable within Faith yards: successes must beat its resistance (fuel 1, dry wood or paper 2, inert metal 5). Water cannot burn.", "instant", "Faith yards",
      "Everything flammable within Faith yards may catch, from one roll.", null),
    "flame:3": E("Successes make a pool (no more than permanent Faith) spent over later turns at difficulty 8 to grow or shrink a fire a square foot, or move it a yard, a success. No successes: it burns wild that turn; a botch loses it.", "while the pool lasts", "a fire in sight",
      "The control pool is halved; the rest is added to the fire's damage.", null),
    "flame:4": E("Touch to burn with holy fire: an aggravated level and a point of the target's Faith a success (pool capped at the target's Faith). Objects burn to ash when their Faith is gone.", "instant", "touch",
      "Roll the full pool; damage past the target's Faith is paid from the Devil's own, and damage beyond what the target can take burns the Devil.", H("harm", 1, "aggravated")),
    "flame:5": E("Become living fire, or merge with a blaze; each turn a Willpower success must feed it or it shrinks a square foot. Below a square foot, or on a botch, the body returns.", "while fed", "self",
      "A burning skeleton that moves as normal but takes a lethal level each turn it neither hurts nor burns something.", T("shape", "Ride the Flames", "scene", "self")),
    "radiance:1": E("A voice heard over any noise: one command to a single person (6) or everyone within 10 yards x Faith (8); fewer Willpower successes than the Devil's means they obey. No effect on demons.", "one command", "one, or 10 x Faith yards",
      "A blast of blasphemy: a bashing level a success, resisted by Willpower at Torment; demons too, and a hurt demon makes a Courage roll or gains Torment.", T("sway", "Voice of Heaven", "T1", "one"), H("harm", 1, "bashing", {soak: false, who: "all"})),
    "radiance:2": E("Up to Faith mortals each gain a bonus die a success to one pool this turn. Not demons.", "one turn", "Faith mortals",
      "Each success is a die taken from their pools this turn; at zero they cannot act.", T("boost", "Exalt", "T1", "each")),
    "radiance:3": E("Up to Faith mortals in sight and hearing: successes above a target's Wits make them loyal (they defend the Devil and follow reasonable orders); otherwise Willpower 8 resists. Once a scene a person.", "the scene", "Faith mortals",
      "Victims fall into murderous frenzy and attack whoever is nearest.", T("sway", "Aura of Legend", "scene", "each"), C("fear", "frenzy", "Murderous frenzy", "scene", "each")),
    "radiance:4": E("A spoken mark on someone touched and named: lasts a day (1), week (2), month (3) or year (4+). Anyone meeting the bearer with Wits below the successes acts as the mark says; others resist with Willpower 7.", "a day to a year", "touch",
      "Marks can only bring violence and bad luck; resisting is at the Devil's Torment.", null),
    "radiance:5": E("Resisted against Willpower: the Devil sees the target's true Nature and beliefs and the target cannot lie or evade. At scene's end Willpower 7: success +1 permanent Willpower, failure -1, botch -3 and a derangement. Not demons.", "the scene", "one being",
      "The target's worst impulses take over for the scene if they fail to resist.", T("know", "Revelation", "scene", "one")),
    "awakening:1": E("Home in on a named person within permanent Faith miles (mundane name 8, Celestial 7, True Name 6). A demon who senses the search may slip it with Willpower 8.", "instant", "Faith miles",
      "Finds only the spiritually rotten: those with no Faith or Willpower left.", T("know", "Find the Faithful", "T1", "self")),
    "awakening:2": E("Touch to purge poison, drink or disease (alcohol 6, grave disease 8+): all or nothing, one try per ailment.", "instant", "touch",
      "Spreads sickness: a bashing level a success, then a bashing level and a Willpower point each day for Faith days. Medicine cannot cure it.", null, H("harm", 1, "bashing")),
    "awakening:3": E("Touch to heal all bashing damage, or one lethal or aggravated level a success.", "instant", "touch",
      "Poisons: each success takes a Stamina dot for Faith days; at zero Stamina a coma and an aggravated level an hour.", HL(1, {aggravated: true})),
    "awakening:4": E("Touched objects come alive as extensions of the demon's will, up to permanent Faith at once; the successes are their dice pool each turn. Controlled at a distance while seen.", "the scene", "touch, then sight",
      "Each object needs a Willpower roll at Torment each turn or it attacks the nearest living thing.", S("summon")),
    "awakening:5": E("Bring a corpse dead up to about a week back to life within Faith yards (fresh 6, older 7+); without a soul it is a mindless zombie the demon controls. Up to Faith bodies. A Willpower point makes it lasting.", "the scene, or for good", "Faith yards",
      "Each raised body needs a Willpower roll at Torment each turn or it attacks the nearest living thing.", S("summon")),
    "firmament:1": E("See through a thrall's eyes, a turn a success, at any distance. Watching only.", "a turn a success", "a thrall",
      "The thrall's eyes bleed: Stamina at her Torment when contact ends or blind for as many days as the turns watched (for good on a botch).", T("sight", "Remote Viewing", {turns: 1}, "self")),
    "firmament:2": E("Watch a subject anywhere by a name or a thing of theirs (mundane name or item 8, Celestial 7, True Name 6): 1 success a picture of their spot, 2 out to Faith yards, 3 their voice, 4+ all sound.", "permanent Faith turns", "any distance",
      "The watched subject gets headaches and paranoia: each turn Willpower 6 or a bashing level and Social rolls 2 harder for the scene; a botch, a derangement.", T("sight", "Scry", "FT", "self")),
    "firmament:3": E("Act and speak through a thrall at any distance: successes are the dice used for the thrall's actions (no more than the thrall's own pool).", "permanent Faith turns", "a thrall",
      "Each action through the thrall risks a permanent Attribute dot (Stamina roll); evocations through them risk a lethal level.", S("possess")),
    "firmament:4": E("Aim another evocation at someone out of sight within 10 miles x current Faith, by name or a keepsake (9 mundane, 8 Celestial, 7 True Name, 6 own thrall). Area effects centre on them.", "that evocation", "10 miles x Faith",
      "The target also rolls Willpower at Torment or gains a derangement (permanent on a botch).", null),
    "firmament:5": E("Control up to Wits thralls at once (the body sleeps unless fewer are used); successes are each thrall's pool, and one evocation a turn can go through one of them.", "permanent Faith turns", "thralls",
      "Thralls roll Stamina at Torment when released or go blind for days, or for good on a botch.", S("possess")),
    "winds:1": E("A sudden wind: its successes add to a leap, raise the difficulty of shots at the demon, or push as a dice pool against a door or a person, anywhere in sight.", "one turn", "sight",
      "A charnel stench: Stamina 7 or an unsoakable bashing level; a botch loses the turn to nausea.", T("ward", "Summon Wind", "T1", "self")),
    "winds:2": E("Crushing air pressure on a target in sight: a bashing level a success, or the successes as Strength on the Feats of Strength chart against an object.", "one turn", "sight",
      "The blow does lethal damage.", H("harm", 1, "bashing"), H("harm", 1, "lethal")),
    "winds:3": E("Swirling winds act as hands: the successes are a pool for moving or handling things within Faith yards (fine work 9).", "the scene", "Faith yards",
      "A choking miasma: every living being in range takes an unsoakable bashing level each turn unless masked.", T("work", "Command the Wind", "scene", "self")),
    "winds:4": E("A wall of hard air up to 10 square feet x Faith, placed within Faith yards: its successes soak shots like armour and resist close attacks; pushing through is Strength + Athletics 7 against it.", "the scene", "Faith yards",
      "The wall burns like acid: Torment lethal dice to anyone forcing through.", T("ward", "Wall of Air", "scene", "self")),
    "winds:5": E("A whirlwind out to current Faith yards (difficulty 7): successes are its Strength on the Feats chart; each turn roll that Strength as bashing damage on those inside or on one target (Willpower at its Strength to aim). It weakens by 1 a turn unless fed.", "turns, weakening", "current Faith yards",
      "Also a lethal level a turn to every living being inside; if its Strength passes the demon's Willpower it turns on her too.", H("harm", 1, "bashing", {who: "all"}), H("harm", 1, "lethal", {who: "all"})),
    "earth:1": E("Bind the body to the ground: nothing can move, lift or knock the demon down unless she allows it.", "the scene", "self",
      "Sink into the soil and travel beneath it a yard a success, with a Strength + Athletics roll each turn.", T("ward", "Earth Meld", "scene", "self")),
    "earth:2": E("Name a thing (gold, iron, bones): anything of that kind within a yard a success, depth included, is pushed to the surface.", "instant", "a yard a success",
      "Swallows a person: buried a foot a success (they may dodge), digging out is extended Strength + Athletics 8 a minute, drowning meanwhile.", N("know"), C("hold", "immobilized", "Buried", "scene", "one")),
    "earth:3": E("Shape earth or stone within Faith yards, a square foot a success (loose earth 5, granite 6, concrete 7), into any form. Permanent.", "permanent", "Faith yards",
      "The shaped earth is toxic: a lethal level a turn to anything living touching it.", T("work", "Mold Earth", "scene", "self")),
    "earth:4": E("A storm of earth and stone around the demon out to Faith yards: its successes are armour dice; spend a die to hurl a stone (Dexterity + Athletics, Faith bashing dice). Everyone inside acts at +1 difficulty.", "the scene", "Faith yards around her",
      "A flaying sandstorm instead: Torment lethal dice to everything inside but her, and shots at her are 1 harder.", T("ward", "Earth Storm", "scene", "self"), H("harm", 1, "lethal", {who: "all"})),
    "earth:5": E("A tremor: split successes between intensity (added to every difficulty inside, and a damage pool at 6 against buildings) and reach (1 Faith square feet, 2 square yards, 3 square miles). Lasts a turn per intensity.", "a turn per intensity", "as allotted",
      "Also brimstone fumes: Perception 2 harder and a bashing level a turn while they last.", S("weather")),
    "paths:1": E("Find a route that meets set terms (through a swamp 1 success, unseen across open ground 2, unharmed through a burning house 3+), shown as a faint silver line to the demon and those she touches.", "instant", "self and those touched",
      "The difficulty is her Torment.", N("know")),
    "paths:2": E("Lay a hidden path to set terms: successes equal to its length in hundreds of yards, over successive turns, difficulty by complexity up to 9-10. Lasts Faith days, or for good for a Willpower point.", "Faith days", "the path",
      "Travel rolls on it botch on 1 or 2, dropping the traveller out somewhere along it.", null),
    "paths:3": E("Hide a path: a searcher needs more successes than the demon rolled. Faith days, or for good for a Willpower point.", "Faith days", "a path",
      "A trap instead: its successes are bashing levels on anyone else who steps on it, for Torment days.", null),
    "paths:4": E("Seal a path at both ends (successes equal to its length in hundreds of yards); travellers on it are trapped. A Willpower point sets a keyword that opens it for chosen people.", "until opened", "a path",
      "Collapses the path; anyone on it rolls Dexterity + Survival 8 or is lost between worlds and suffocates.", null),
    "paths:5": E("Change a path: travel time multiplied or divided by the successes, or a new destination or an endless loop (successes equal to its length in hundreds of yards). Faith days, or for good for a Willpower point.", "Faith days", "a path",
      "Travellers also roll Willpower on arrival or gain a derangement.", null),
    "forge:1": E("Understand, repair or improve a handled object (hammer 5, car 8, computer 10): each success lowers the difficulty of using it, once an item, for the scene or for good for a Willpower point.", "the scene", "touch",
      "The item botches on a 1 or 2, and a weapon then strikes its user or someone near.", T("boost", "Enhance Object", "scene", "self")),
    "forge:2": E("Work a simple mechanism by will within Faith yards: open a door (5), fire a pistol (8).", "instant", "Faith yards",
      "The machine is damaged by a level a success as it runs wild.", T("work", "Activate Object", "T1", "self")),
    "forge:3": E("Shape materials by hand into an item: a hammer 1 success, a clock 5+, engines 9 difficulty and 10+ successes, high technology 10 and 15+. Extended; permanent.", "permanent", "touch",
      "What she makes botches on a 1 or 2, harming its user or someone near.", S("make")),
    "forge:4": E("Enchant an object with an effect from a lore the demon knows (her own make 6, existing item 8; extended, a Faith point; 1 success a blade that stays keen, 5 a key to any lock, 10 a mirror of desire). Users roll Willpower 8 or Faith 6, or attune for a permanent dot.", "permanent", "touch",
      "Cursed: botches on 1 or 2 against the user's circle; each use costs a mortal Willpower or gives a demon Torment.", S("imbue")),
    "forge:5": E("Bind a bodiless spirit within Faith yards into a hand-made vessel (her own 6, else 8), resisted by its Willpower. Freed only by breaking the vessel.", "until the vessel breaks", "Faith yards",
      "The bound soul is twisted: a mortal gains a derangement, a demon gains Torment equal to the successes.", S("bind")),
    "patterns:1": E("Sense where a named kind of event will happen up to Faith days ahead: 1 success the place, 2 roughly when, 3 who is there.", "instant", "Faith days ahead",
      "Finds only coming violence and ruin.", N("know")),
    "patterns:2": E("At the place an event happened, see what led to it: 1 success the moment, 2 minutes before, 3 a quarter hour before.", "instant", "the place",
      "Sees only the violence and harm in it.", N("know")),
    "patterns:3": E("Foresight: for a turn a success the Fiend cannot be surprised and may act at any point in the turn, outside the initiative order.", "a turn a success", "self",
      "Lasts one turn, but each success is a free dodge against any attack.", T("hasten", "Foresee", "T1", "self")),
    "patterns:4": E("See the likely fate of a person (6), place (7) or event (9) a day ahead a success, and ask the Storyteller one question a success about why it unfolds so.", "instant", "one subject",
      "Shows where the subject is open to accident or harm, and how to bring it about.", N("know")),
    "patterns:5": E("A bubble of altered time, Faith yards across, around the Fiend: faster (7), slower (8) or stopped outside (9), up to Faith to one; a turn a success. Nothing inside touches the outside. It collapses if she leaves.", "a turn a success", "Faith yards",
      "Throws everyone within Faith yards out of time (demons resist with Willpower at Torment); on return they lose a Willpower a turn missed, at none a permanent derangement.", S("time")),
    "portals:1": E("Doors and windows unlock, open, close or lock at a touch: a house 1 success, a cell door 3.", "instant", "touch",
      "Smashes or jams the portal: the successes also count as Strength against it.", T("work", "Open/Close Portals", "T1", "self")),
    "portals:2": E("From inside, seal every way into an area for the scene; an intruder must beat the successes at a difficulty of the Fiend's Willpower. Other lores cannot get in either.", "the scene", "the area she is in",
      "Intruders pass but take bashing levels equal to the successes, soaked at Torment difficulty.", T("ward", "Create Ward", "scene", "self")),
    "portals:3": E("Step through a portal and out of a matching one up to 100 miles x Faith away, somewhere visited before (home 1 success, often 2, once 3).", "instant", "100 miles x Faith",
      "Willpower at Torment or she arrives at a random familiar place.", S("move")),
    "portals:4": E("Join two portals up to 100 miles x Faith apart for a turn a success (known well 6, often 7, once 8, never 9); anyone may cross.", "a turn a success", "100 miles x Faith",
      "Each person crossing rolls Willpower at Torment or gains a derangement.", S("move")),
    "portals:5": E("Open a doorway for one turn into the dark realm between worlds. Mortals there lose a Willpower a turn, then take unsoakable bashing; demons last Faith turns unharmed. Returning needs another doorway.", "one turn to open", "a portal",
      "Willpower at Torment or the storm leaks out: nearby mortals roll Willpower 8 or flee in terror.", S("sideways")),
    "light:1": E("Soft moonlight fills a cubic yard a success around the Fiend for Faith turns; or a blinding flash in one direction, a bashing level a success to all looking that way.", "Faith turns", "around her, or one direction",
      "Smothering darkness instead: others inside are blind; she moves freely.", T("light", "Light", "FT", "self"), C("hold", "blinded", "Blinded by darkness", "FT", "each")),
    "light:2": E("Bend light around the body: each success adds to the difficulty of Perception rolls and shots against her for the scene.", "the scene", "self",
      "Shimmering patterns: each success adds to all attacks against her, close ones too, but not to others' Perception.", T("veil", "Bend Light", "scene", "self")),
    "light:3": E("A ghostly image (one figure 6, a busy scene 8+) programmed with an action a success, replayed at will for Faith days.", "Faith days", "the place",
      "Watchers roll Willpower 8 or flee; a botch adds a derangement.", T("illusion", "Phantasm", "scene", "self")),
    "light:4": E("A convincing illusion until touched (still thing 6, moving 7, living 8+): its successes are a pool to direct or change it; silent, must stay in sight; up to Faith at once, 1 die less each after the first.", "the scene", "sight",
      "Witnesses roll Willpower 9 or flee; a botch adds a derangement.", T("illusion", "Illusion", "scene", "self")),
    "light:5": E("Solid light constructs (table 6, dog 7, person 8+) that act on the successes as a pool; one health level of harm dispels one; up to Faith at once.", "Faith turns", "sight",
      "Each construct needs a Willpower roll at Torment each turn or it attacks the nearest living thing with its full pool.", S("manifest")),
    "longing:1": E("Read one mortal's hidden feelings unnoticed: each success is a bonus die on Social rolls against them for the scene.", "the scene", "one mortal",
      "Stirs the target's darkest wishes (Willpower at Torment resists) and drives them to act on them for Faith days.", T("boost", "Read Emotion", "scene", "self")),
    "longing:2": E("Become everything one mortal hopes to see: with successes at least their Wits they trust the demon fully and grant any reasonable request.", "the scene", "one mortal",
      "Becomes what they dread most instead: with successes at least their Wits they keep away and leave if they can; Intimidation on them is difficulty 4.", T("sway", "Empathetic Response", "scene", "one"), C("fear", "frenzy", "Dread", "scene", "one")),
    "longing:3": E("A touch heightens the senses: +1 Perception die a success, but wound penalties rise as much, for Faith turns; afterwards Willpower or the dice become a penalty for the scene (a botch: for good, and an addiction).", "Faith turns", "touch",
      "Searing pain or warped senses: the successes come off the victim's Perception pools for Faith turns.", T("boost", "Manipulate Senses", "FT", "one")),
    "longing:4": E("Within Faith yards, a known desire of a mortal becomes an obsession (Willpower 8 resists): Willpower 7 to do anything else, no food or sleep until it is pursued. Faith days or until sated.", "Faith days", "Faith yards",
      "A destructive, painful compulsion: all pools -1 until the victim works toward it.", T("sway", "Obsession", "FD", "one")),
    "longing:5": E("A mortal gains a point a success to Mental or Social Traits (five at most) for Faith days; when it fades, Willpower 7 or lose a permanent Willpower.", "Faith days", "one mortal",
      "Genius tips into madness: the same bonus plus a temporary derangement, permanent if the closing roll fails.", T("boost", "Inspire", "FD", "one")),
    "storms:1": E("Draw water from a source within Faith yards: fog 1 success (Perception 2 harder), a shower 2, a torrent 3, a flood 4+ (Dexterity + Athletics 8 or start drowning). Faith turns.", "Faith turns", "Faith yards",
      "The water is foul: more than a turn in it means Stamina at Torment or a disease, worse the higher her Torment.", S("weather")),
    "storms:2": E("Become water or mist, leaving clothes behind: go wherever water or air can and take no damage, for Faith turns.", "Faith turns", "self",
      "Contact with her body burns: a lethal level a turn.", T("shape", "Water Form", "FT", "self")),
    "storms:3": E("Steer existing weather within Faith miles (light rain 1, thunderstorm 2, big storm 3, tornado or hurricane 4+), or move the temperature a degree a success. Cannot make weather from nothing.", "as the weather runs", "Faith miles",
      "Strengthens the weather rather than steering it.", S("weather")),
    "storms:4": E("Make or banish weather within Faith miles (thunderstorm by the sea 6, in a desert 9, banishing 7; a shower 1 success, a tornado 4+). It then runs its course.", "its natural course", "Faith miles",
      "Whatever she calls is harmful: hail, lightning, killing heat or cold.", S("weather")),
    "storms:5": E("A storm around the demon, Faith yards wide, for Faith turns (outdoors under cloud 6, an office 9): its successes are a pool for wind feats in place of Strength, or lightning at 9 (each success a bolt of Torment lethal dice).", "Faith turns", "Faith yards around her",
      "It strikes at random: each turn a die at 9 per person in it for a bolt, and everyone's actions are 2 harder.", T("ward", "Invoke the Storm", "FT", "self"), H("harm", 1, "lethal", {who: "all"})),
    "transfiguration:1": E("After an hour in someone's company, copy their voice and manners well enough to pass at a distance: resisted by the watcher's Perception + Alertness (sure against strangers to them). Faith turns.", "Faith turns", "self",
      "Watchers roll Willpower at Torment or are unsettled and leave.", T("illusion", "Mimic", "FT", "self")),
    "transfiguration:2": E("Change a cosmetic feature a success (eyes, hair, skin, scars) on herself or someone touched, for Faith turns or for good for a Willpower point. A real change, so demons are fooled.", "Faith turns", "self or touch",
      "Willpower at Torment or a subtle deformity: Social rolls 2 harder.", T("illusion", "Alter Appearance", "FT", "self")),
    "transfiguration:3": E("Change a physical feature a success (height, weight, build), for Faith turns or for good for a Willpower point.", "Faith turns", "self",
      "Willpower at Torment or a crippling deformity costs a Physical dot while it lasts.", T("shape", "Alter Shape", "FT", "self")),
    "transfiguration:4": E("Take the shape, voice and manner of whoever the target expects to see (Willpower 8 resists; a person they feel strongly about 8, a group 9). Faith turns.", "Faith turns", "self",
      "A darker version of what they expect: Social rolls to sway them are 2 easier.", T("illusion", "Doppelganger", "FT", "self")),
    "transfiguration:5": E("Remake herself or someone touched (an unwilling target resists with Willpower 8): Appearance up or down a dot a success (0 to 5 for mortals); other traits unchanged. Faith turns, or for good for a Willpower point.", "Faith turns", "touch",
      "Willpower at Torment or the subject becomes a monster; mortal onlookers roll Willpower 8 or flee.", T("shape", "Shapechange", "FT", "one")),
    "beast:1": E("Sense all animal life within Faith miles and call animals of one kind (a beast a success, or a swarm a square yard a success); they guard the demon.", "the scene", "Faith miles",
      "Only predators come, maddened: Willpower at Torment each turn or they turn on the nearest human or demon, her included.", S("summon")),
    "beast:2": E("Command animals already present, one a success, by thought; they gain Intelligence 1.", "a day", "animals present",
      "Only predators, and away from her they attack anyone they meet unless they pass Intelligence 7.", S("summon")),
    "beast:3": E("Possess one animal a success within Faith miles; more than Wits leaves her body comatose, otherwise her own pools are halved.", "Faith turns", "Faith miles",
      "Only predators; Willpower at Torment each turn or the Storyteller takes her over until it ends.", S("possess")),
    "beast:4": E("Take the shape of any animal whose blood or flesh she has tasted, any size.", "the scene", "self",
      "Willpower at Torment each turn or the beast takes over (Storyteller controls her).", T("shape", "Animal Form", "scene", "self")),
    "beast:5": E("Remake an animal: a trait point or a new feature a success, mass no object. Then Willpower: more successes than changes or the beast turns unstable (the Storyteller may roll in secret). Faith days, or for good for a Willpower point.", "Faith days", "touch",
      "No roll: the creature is always a rabid killer.", S("make")),
    "wild:1": E("A mental map of the land within Faith miles: terrain, plants, animals, and where the locals sense intruders (demons resist with Willpower 7). Towns at difficulty 8.", "the scene", "Faith miles",
      "The land turns on trespassers: animals attack, and Athletics or Survival at her Torment avoids harm.", N("sense")),
    "wild:2": E("One plant grows a cubic yard a success in a turn; roots and vines strike structures as Strength equal to the successes and swallow what they surround, for that many turns.", "successes in turns", "one plant",
      "The growth grabs the living: her Willpower in dice as a grapple on each being in reach, then Torment dice of lethal.", S("work"), H("harm", 1, "lethal", {who: "each"})),
    "wild:3": E("Steer up to Faith plants: each grows a cubic yard a success in the shape and direction she wills, striking structures by the Feats of Strength chart.", "as grown", "Faith plants",
      "Thorns and poison sap: Dexterity + Athletics to pass or take Torment dice of lethal.", S("work")),
    "wild:4": E("Take over a plant a success: rooted, but they move and strike with her Willpower as Strength and as attack and bashing damage dice.", "the scene", "plants in sight",
      "Each possessed plant withers a level a turn until it dies.", S("possess")),
    "wild:5": E("Breed a new plant trait a success (fast growth, bark, thorns); can be an extended roll a day at a time. Faith days, or for good for a Willpower point.", "Faith days", "touch",
      "Willpower at Torment or the plant turns carnivorous: Torment dice to attack and lethal damage, against her too.", S("make")),
    "flesh:1": E("Purge or change body chemistry: shed fatigue 6, alcohol 7+, a deathlike coma 9+. Others by touch (Willpower 8 resists). The scene, or a Willpower point ends one poisoning for good.", "the scene", "self or touch",
      "Brute force: successes past the subject's Stamina are unsoakable bashing.", MV()),
    "flesh:2": E("Tune nerves by touch (Willpower 8 resists): dull pain 6, quicken reflexes 7-8, sharpen or dull senses 9+. Each success moves a Physical trait or a wound penalty a point.", "the scene", "self or touch",
      "Successes past the subject's Stamina are lethal damage.", T("boost", "Manipulate Nerves", "scene", "one")),
    "flesh:3": E("Add a point a success to any Physical or Mental Attribute; successes past the subject's Stamina are unsoakable bashing from the shock. Others by touch (Willpower 8 resists).", "the scene", "self or touch",
      "On another: Willpower at her Torment or a temporary derangement (paranoid, violent); a botch makes it permanent.", T("boost", "Manipulate Flesh", "scene", "one")),
    "flesh:4": E("By touch, heal a lethal level a success, or all bashing; restore limbs and organs and purge poison and disease. Not aggravated harm, not the dead.", "instant", "touch",
      "The subject rolls Willpower 7: a temporary derangement on success, permanent on failure, a mindless killer on a botch.", HL(1, {who: "one"})),
    "flesh:5": E("Reshape a body by touch, resisted by Willpower 7: about a Physical dot or feature a success, the Storyteller sets the total; can be extended a day at a time. Faith days, or for good for a Willpower point.", "Faith days", "touch",
      "Monstrous results: a temporary derangement and a lethal level a day; mortals who see it suffer Revelation.", T("shape", "Shape Flesh", "FD", "one")),
    "death:1": E("Look into a corpse's eyes and see its death: the moment itself, then minutes, hours and days before with more successes.", "instant", "a corpse",
      "Only a violent death shows.", N("know")),
    "death:2": E("A touch rots: an aggravated level a success (lethal on mortals). On a corpse, each removes a Stamina dot; at zero it is dust. Objects a cubic foot a success: wood or cloth 7, plastic 8, metal 9, stone 10.", "instant", "touch",
      "Everything within Faith yards decays.", H("harm", 1, "aggravated", {who: "one"}), H("harm", 1, "aggravated", {who: "all"})),
    "death:3": E("Show a target their death, within Faith yards: Willpower at her Faith or drop the action and flee; a botch adds a derangement. A target who resists is safe for the scene.", "the scene", "Faith yards",
      "Every living being within Faith yards rolls.", C("fear", "frenzy", "Vision of Mortality", "scene", "one"), C("fear", "frenzy", "Vision of Mortality", "scene", "all")),
    "death:4": E("A hand on a living body: successes over its Stamina kill a mortal outright (on a demon, aggravated levels); fewer do bashing.", "instant", "touch",
      "No touch needed: every living being within Faith yards.", H("harm", 1, "bashing", {who: "one", soak: false}), H("harm", 1, "bashing", {who: "all", soak: false})),
    "death:5": E("Raise up to Faith bodies within Faith yards as mindless servants (Physical 1 each, extra successes add dots, no wound penalties, 10 levels to destroy). Willpower 7 a command, or a Willpower point sets a script of Wits orders. The scene, or for good at a Willpower point a body.", "the scene", "Faith yards",
      "Flesh-eaters: unscripted ones frenzy unless she makes Willpower 8 each turn.", S("rise")),
    "spirit:1": E("Any ghost in earshot must answer her questions truly (Willpower 9 resists).", "Faith turns", "voice range",
      "The ghost turns hostile to the living for Torment days if it fails Willpower 9.", S("speak")),
    "spirit:2": E("Call a ghost a success from 10 square yards times Faith; they stay until dismissed or the scene ends. A strong ghost may resist with Willpower at her Faith.", "the scene", "10 x Faith square yards",
      "The ghosts turn hostile to the living for Torment days if they fail Willpower 9.", S("summon")),
    "spirit:3": E("One ghost that hears her must obey (Willpower 8 resists).", "Faith turns", "voice range",
      "Afterwards the ghost rolls Willpower 8, needing successes for each turn obeyed, or turns malevolent for Torment days (for good on a botch).", S("bind")),
    "spirit:4": E("Bind a soul within Faith yards into an object she holds (Willpower 8 resists): something dear to it 6, precious 7, natural 8, synthetic 9. Faith days, or for good for a Willpower point; breaking it frees the soul.", "Faith days", "Faith yards",
      "The prison spreads ill luck: whoever touches or carries it botches on 1 or 2.", S("bind")),
    "spirit:5": E("Put a soul into a body dead under 48 hours, healing it: body's Physical traits, soul's mind and skills. Faith days, or for good for a permanent Willpower point. Works for disembodied demons too.", "Faith days", "touch",
      "Willpower at her Torment for the soul: temporary derangement, permanent on failure, a frenzied monster on a botch.", S("rise")),
    "realms:1": E("Read how thick the wall between the living and the dead is across 10 square yards times Faith.", "instant", "10 x Faith square yards",
      "Only weak places register.", N("sense")),
    "realms:2": E("Step bodily into the shadow lands (church or graveyard 6, old house 7, mall 8) and fly a mile a turn per Dexterity + Athletics 8 success, returning at the matching spot. Rolls there are 8 or worse; a botch costs Willpower, and at zero her host is lost. No passengers.", "until she returns", "self",
      "She leaves a seam that draws hauntings for Torment days.", S("sideways")),
    "realms:3": E("Stand in both worlds: insubstantial and seen on both sides; Willpower 8 lets her act fully in one realm for a turn.", "Faith turns", "self",
      "Storm energies leak out: wild hauntings around her.", T("veil", "Ghostwalk", "FT", "self")),
    "realms:4": E("Reach across the wall to place or take an item that fits one or two hands (church 6 to mall 8). People cannot be pulled through.", "instant", "arm's reach",
      "Willpower at her Torment or the storm seeps through: mortals nearby roll Willpower 8 or flee (a botch adds a derangement).", S("place")),
    "realms:5": E("Open a one-turn, one-way door into the shadow lands for as many demons as successes; mortals and thralls cannot pass. Non-Slayers there have halved pools and lose a Willpower a day.", "one turn", "a doorway",
      "The spirit storm rages around the door for Torment days, drawing ghosts.", S("sideways"))
};

/** The card for lore:level, or null. */
export const evocationCard = (lore, level) => EVOCATIONS[`${lore}:${level}`] ?? null;

/** How long a "FT", "FD" or "T1" duration runs for a demon of this permanent Faith: {label, timed}. */
export function faithLasts(lasts, faith) {
    const f = Math.max(1, Number(faith) || 1);
    if (lasts === "FT") return { label: `${f} turn${f === 1 ? "" : "s"}`, timed: { kind: "rounds", rounds: f } };
    if (lasts === "FD") return { label: `${f} day${f === 1 ? "" : "s"}`, timed: { kind: "time", seconds: f * 86400 } };
    if (lasts === "T1") return { label: "1 turn", timed: { kind: "rounds", rounds: 1 } };
    return null;
}

/**
 * The effects-card results of an evocation: the high-Torment spec when Torment twists it (or the usual one when the book
 * gives the high effect no spec of its own), each in the [{key, who, ask?, st?, out}] shape, Faith durations resolved.
 */
export function evocationResults(lore, level, successes, { high = false, faith = 1, name = "", source = "" } = {}) {
    const c = evocationCard(lore, level);
    if (!c) return [];
    const spec = high && c.highSpec ? c.highSpec : c.spec;
    if (!spec) return [];
    const text = high ? c.high : c.fx;
    const base = { key: spec.kw, label: name, source };
    const fl = faithLasts(spec.lasts, faith);
    const fixed = fl ? { ...spec, lasts: "scene" } : spec;
    return outcomesOf(fixed, base, successes, text).map(r => {
        if (!fl || !r.out?.timed) return r;
        const t = r.out.kind === "timed" ? `${successes} success${successes === 1 ? "" : "es"} for ${fl.label}: ${text}` : `${r.out.name}, for ${fl.label}: ${text}`;
        return { ...r, out: { ...r.out, timed: fl.timed, duration: fl.label, text: t } };
    });
}

/** Does this evocation keep running after the turn it is evoked (and so count toward the permanent Faith limit, p. 171)? */
export function lingers(lore, level) {
    const c = evocationCard(lore, level);
    return !!c && !/^(instant|one turn|a turn a success)$/i.test(c.lasts);
}
/** How long it lingers, in seconds of game time for the running list (a scene counts as an hour). */
export function lingerSeconds(lore, level, faith = 1) {
    const c = evocationCard(lore, level);
    if (!c) return 0;
    const f = Math.max(1, Number(faith) || 1);
    if (/Faith turns/i.test(c.lasts)) return f * 6;
    if (/Faith days/i.test(c.lasts)) return f * 86400;
    if (/day/i.test(c.lasts)) return 86400;
    return 3600;
}

/**
 * The apocalyptic form's powers (DtF pp. 175-216), in WoDX's own words. Keyed by the power's name, with "Name@Visage" where a
 * visage gives the same name different numbers. attrs: Attribute bonuses; init: initiative; armor: soak dice from a hide;
 * diff: {trait: -2} easier rolls (shown on the card, the dialog picks them up by hand).
 */
const P = (fx, o = {}) => ({ fx, ...o });
export const FORM_POWERS = {
    "Wings": P("Wings a third longer than she is tall: she glides three times her running speed a turn."),
    "Lordly Mien": P("Charisma and Manipulation rolls are 2 easier."),
    "Enhanced Senses": P("All Perception rolls are 2 easier."),
    "Increased Awareness": P("Awareness rolls are 2 easier."),
    "Claws/Teeth": P("Claws and fangs: Strength +2 aggravated."),
    "Claws": P("Claws: Strength +2 aggravated."),
    "Teeth": P("Teeth: Strength +2 aggravated."),
    "Blades": P("Blades grow from the arms: Strength +2 aggravated."),
    "Scales": P("Scales: four more soak dice against bashing, lethal and aggravated.", { armor: 4 }),
    "Shark Hide": P("A rough hide: four more soak dice against everything.", { armor: 4 }),
    "Iron Skin": P("Iron skin: four more soak dice against everything.", { armor: 4 }),
    "Thick Hide": P("A gristle hide: four more soak dice against everything.", { armor: 4 }),
    "Armor": P("A heaving mass of flesh: four more soak dice against everything.", { armor: 4 }),
    "Increased Size": P("A third taller: Strength +2, Dexterity +1, Stamina +1.", { attrs: { strength: 2, dexterity: 1, stamina: 1 } }),
    "Increased Size@Bel": P("A third taller: Strength +1, Dexterity +2, Stamina +1.", { attrs: { strength: 1, dexterity: 2, stamina: 1 } }),
    "Increased Size@Zaltu": P("A third taller: Strength +2, Dexterity +2, Stamina +1.", { attrs: { strength: 2, dexterity: 2, stamina: 1 } }),
    "Increased Size@Ninurtu": P("A third taller: Strength +1, Dexterity +2, Stamina +1.", { attrs: { strength: 1, dexterity: 2, stamina: 1 } }),
    "Dread Gaze": P("Whoever meets her eyes rolls Willpower 7 or loses the turn's action."),
    "Shroud of Flames": P("Wreathed in fire: attacks against her are 1 harder."),
    "Immunity to Fire": P("Fire does her no harm."),
    "Immune to Fire": P("Fire does her no harm."),
    "Extra Actions": P("A Faith point an extra action in a turn, bought at the start of the turn; each goes one initiative lower."),
    "Improved Initiative": P("Initiative +2.", { init: 2 }),
    "Lashing Tail": P("A spiked tail: Strength -1 aggravated."),
    "Fiery Blood": P("Whoever hurts her in close combat takes a lethal level from her burning blood."),
    "Inhuman Allure": P("Charisma +2, Manipulation +1, Appearance +1.", { attrs: { charisma: 2, manipulation: 1, appearance: 1 } }),
    "Radiant Aura": P("A blinding glow: ranged attacks against her are 1 harder."),
    "Sense the Hidden": P("Perception rolls to find hidden people near her are 2 easier."),
    "Voice of the Damned": P("Intimidation rolls are 2 easier."),
    "Casts No Reflection": P("No mirror, photograph or camera shows her."),
    "Corrosive Spit": P("A bite does an extra aggravated level, or she spits acid ten feet."),
    "Horns": P("Horns: a free counterattack at Strength -1 aggravated on whoever closes with her."),
    "Aura of Vitality": P("Living beings within Faith yards heal a bashing level a turn."),
    "Pass Without Trace": P("Stealth rolls are 2 easier, and she leaves no tracks."),
    "Improved Physical Capabilities": P("Strength +1, Dexterity +1, Stamina +1.", { attrs: { strength: 1, dexterity: 1, stamina: 1 } }),
    "Miasma": P("Rotten breath: within Faith feet, Stamina 7 or lose the turn."),
    "Extra Health Levels": P("Three more Bruised health levels."),
    "Viscous Flesh": P("Grappling her is 2 harder, and a Dexterity roll slips bonds."),
    "Extra Limbs": P("More arms or a tail: block and attack in one turn, or up to two extra attacks (as multiple actions)."),
    "Extra Limbs@Ninurtu": P("A prehensile tail half her height (half Strength to lift), strong enough to hang from."),
    "Enhanced Intuition": P("Intuition rolls are 2 easier."),
    "Enhanced Dodge": P("Dodge rolls are 2 easier."),
    "Cloak of Shadows": P("In shadow, Stealth is 2 easier and attackers fight her as if blind."),
    "Multiple Eyes": P("Eyes all over: Perception rolls are 2 easier."),
    "Supernatural Vision": P("Sees five times as far in any light at all; sight-based Perception is 2 easier."),
    "Perfect Balance": P("Athletics rolls are 2 easier."),
    "Immune to Falling Damage": P("Falls do her no harm."),
    "Quills": P("Whoever hits her in close combat takes a lethal level unless they make Dexterity 7."),
    "Caustic Bile": P("Spits bile out to Faith feet: Strength -1 aggravated."),
    "Immune to Bashing Damage": P("Bashing damage does her no harm."),
    "Irresistible Force": P("Feats of Strength are 2 easier."),
    "Night Vision": P("Sees in the dark as by day."),
    "Night Sight": P("Sees clearly in utter darkness."),
    "Gaping Maw": P("A maw that eats anything: bites are 2 easier and do Strength +4 aggravated."),
    "Spikes": P("Spikes: unarmed blows do two more aggravated dice."),
    "Ichor": P("Slick black ichor: grappling her is 2 harder."),
    "Dead Reckoning": P("She always knows where she is and never loses her bearings."),
    "Enhanced Perception": P("Perception rolls are 2 easier."),
    "Flashing Fingers": P("Draws or hides an item unseen on Dexterity + Athletics."),
    "Conjure from Nothing": P("Draws or hides an item unseen on Dexterity + Athletics (6)."),
    "Alter Size": P("Her size flickers: attacks against her are 2 harder."),
    "Mirage": P("Her place blurs: ranged attacks on her are 2 harder, close attacks 1."),
    "Relentless": P("While she keeps moving she needs no rest, food or sleep."),
    "Master Artisan": P("Crafts rolls are 2 easier."),
    "Thunderous Voice": P("Once a scene, a roar: four bashing dice to everyone within Faith yards."),
    "Magnetic Field": P("A field that wrecks electronics within Faith yards."),
    "Enhanced Mental Acuity": P("Intelligence +1, Wits +1, Perception +2.", { attrs: { intelligence: 1, wits: 1, perception: 2 } }),
    "Enhanced Mental Acuity@Shamash": P("Intelligence +2, Wits +1, Perception +1.", { attrs: { intelligence: 2, wits: 1, perception: 1 } }),
    "Aura of Misfortune": P("Within Torment yards, other people botch on a 1 or 2."),
    "Sibilant Whispers": P("Subterfuge rolls are 2 easier."),
    "Chimerical Aura": P("A shifting glamour: Dodge rolls are 2 easier."),
    "Unearthly Glamour": P("Manipulation rolls are 2 easier."),
    "Hypnotic Visions": P("Attackers roll Wits at her Torment or cannot act against her."),
    "Dread Mien": P("Leadership and Intimidation rolls are 2 easier."),
    "Chimerical Attack": P("Her Torment as an attack pool; four aggravated dice of nightmare."),
    "Enhanced Social Traits": P("Charisma +2, Manipulation +1, Appearance +2.", { attrs: { charisma: 2, manipulation: 1, appearance: 2 } }),
    "Enhanced Social Traits@Aruru": P("Charisma +1, Manipulation +1, Appearance +2.", { attrs: { charisma: 1, manipulation: 1, appearance: 2 } }),
    "Enhanced Social Traits@Nergal": P("Charisma +2, Manipulation +1, Appearance +1.", { attrs: { charisma: 2, manipulation: 1, appearance: 1 } }),
    "Lyrical Voice": P("Leadership and Subterfuge rolls are 2 easier."),
    "Venom": P("A bite carries venom: her Torment in bashing dice, soaked as usual."),
    "Venom@Mammetum": P("Venom: the victim rolls Stamina 7 each turn for Torment turns or takes a lethal level."),
    "Venom@Ninurtu": P("Saliva that saps the will: Stamina 7 or lose Willpower equal to her Torment; at zero, a deathlike coma for Torment days."),
    "Weather Sense": P("Feels the weather coming within ten times Faith miles."),
    "Immune to Electricity": P("Electricity does her no harm."),
    "Shocking Touch": P("Once a scene, a touch of Faith bashing dice."),
    "Spines": P("Spines: unarmed blows do an extra aggravated level."),
    "Ink Cloud": P("A cloud of ink out to Faith feet: Stamina or blinded for Torment turns."),
    "Enhanced Empathy": P("Empathy rolls are 2 easier."),
    "Improved Dexterity": P("Dexterity +2.", { attrs: { dexterity: 2 } }),
    "Chameleon Skin": P("Blends in: Stealth 1 easier moving, 2 standing still."),
    "Thorns": P("Thorns: whoever strikes or grapples her bare-handed takes an aggravated level."),
    "Immune to Poisons": P("No poison, drug or drink affects her."),
    "Regeneration": P("Heals a bashing or lethal level each turn, reflexively."),
    "Deathgrip": P("At eight lethal or aggravated levels, Willpower keeps her alive in a coma until dawn; she wakes with one level and a Faith point less."),
    "Aura of Entropy": P("Within Faith yards, everyone loses a die from their pools unless they make Stamina 6, for the scene."),
    "Damage Resistance": P("Ignores wound penalties while in the form."),
    "Ghost Sight": P("Sees ghosts on a Perception roll (6), whether they will it or not."),
    "Howl of the Damned": P("Intimidation rolls are 2 easier."),
    "Aura of Dread": P("Within Faith yards, Willpower at her Torment each turn or act last."),
    "Voice of the Grave": P("Intimidation rolls are 2 easier."),
};
/** The entry for a form power, by visage name ("Bel", or "Bel, the Visage of..."). */
export function formPower(name, visage = "") {
    const v = String(visage).split(",")[0].trim();
    return FORM_POWERS[`${name}@${v}`] ?? FORM_POWERS[name] ?? null;
}
/** Everything the chosen powers add up to: {attrs, init, armor, lines}. */
export function formTotals(names = [], visage = "") {
    const attrs = {}; let init = 0, armor = 0; const lines = [];
    for (const nm of names) {
        const p = formPower(nm, visage);
        lines.push({ name: nm, fx: p?.fx ?? "The Storyteller rules what it does." });
        for (const [k, v] of Object.entries(p?.attrs ?? {})) attrs[k] = (attrs[k] ?? 0) + v;
        init += p?.init ?? 0; armor = Math.max(armor, p?.armor ?? 0);
    }
    return { attrs, init, armor, lines };
}
