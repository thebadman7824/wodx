/**
 * WoDX Otherworlds 0.23.0 (B2631): further named places of each realm past the near worlds, with what the books say
 * of how each realm lies and how it changes. From the book lookup of 13 November 2026 on the Storyteller's own
 * books: every line is in WoDX's own words with its page (pdf page, then the printed page where it differs).
 * PLACES: realm id, then [name, what it is, where the book has it]. LAYOUT and CHANGE: [note, where].
 * Left out on purpose: beings, weather, roads the map already has, and places that lie outside the realm.
 */
export const PLACES = {
  "aetherial": [
    ["Sokhta's sphere", "Phoebe's own domain, a globe of moonsilver the travellers can stand on; the Incarna hands out the pathstones that open moon bridges", "Rage Across the Heavens pdf 25-26 / p. 24-25"],
    ["The cloud mountains", "high cloud peaks crowded with the eyries of star spirits", "Rage Across the Heavens pdf 24 / p. 23"],
    ["The star roads", "moon paths running outward through the vault as far as the Membrane", "Rage Across the Heavens pdf 24 / p. 23"],
    ["Katanka-Sonnak's domain", "the realm of the Wind Rider, Incarna of Helios, whose light drowns all others; hard on most Garou", "Rage Across the Heavens pdf 27 / p. 26"],
    ["The Dark Roads", "false moon paths that seem to go the right way, then lead into Bane country and vanish behind the traveller", "Rage Across the Heavens pdf 27 / p. 26"],
    ["Anthelios, the Red Star", "the anti-sun, a foul, discordant presence moving through the realm", "Rage Across the Heavens pdf 24-25 / p. 23-24"],
    ["Garou sky-territories", "sept-held lands on the cloud ground, guarded like caerns, used as staging points for raids", "Umbra: The Velvet Shadow pdf 47 / p. 46"],
    ["The sun's fire citadel", "on the sun's liquid-fire surface, a burning citadel (Hyperion) or a tipi of white light (Katanka-Sonnak), past a gauntlet of fire elementals", "Umbra: The Velvet Shadow pdf 48 / p. 47"]
  ],
  "arcadia-gateway": [
    ["The Palace of Summer", "Seelie seat on the eastern edge, on the coast of the Ocean of Dreams", "Umbra: The Velvet Shadow pdf 52 / p. 51"],
    ["The Ocean of Dreams", "the sea off the realm's eastern coast", "Umbra: The Velvet Shadow pdf 52 / p. 51"],
    ["The Fortress of Winter", "Unseelie stronghold of Queen Marianna marking the western edge", "Umbra: The Velvet Shadow pdf 52 / p. 51"],
    ["The Autumn Country", "the northern quarter between summer and winter", "Umbra: The Velvet Shadow pdf 52 / p. 51"],
    ["The Springlands", "the southern quarter between summer and winter", "Umbra: The Velvet Shadow pdf 52 / p. 51"],
    ["The Summer Fiefs", "the lands of the Landed Summer Gentry, losing ground; the door to Arcadia is rumoured hidden in them", "Umbra: The Velvet Shadow pdf 52 / p. 51"]
  ],
  "atrocity": [
    ["The corpse mountains", "ridges of piled dead that split the realm into an endless maze, a fresh scene of cruelty round each corner", "Umbra: The Velvet Shadow pdf 53 / p. 52"],
    ["Corpse-built walls", "the realm's few buildings, walls of mummified victims mortared with the ash of the burned", "Umbra: The Velvet Shadow pdf 53 / p. 52"],
    ["The Breeding Pits", "pits of writhing bodies where Bane larvae spawn, guarded by Scrags and other Banes", "Umbra: The Velvet Shadow pdf 54-55 / p. 53-54"],
    ["The Atrocity Library", "a black-stone mausoleum the size of a small town holding one flesh-bound book per perpetrator; Banes will not enter, so trapped Garou shelter there", "Umbra: The Velvet Shadow pdf 55 / p. 54"]
  ],
  "battleground": [
    ["The Signpost", "the fixed starting point of every visit, in a form that varies (signpost, obelisk, terminal, talking gargoyles), listing the battles down each of two roads", "Umbra: The Velvet Shadow pdf 56 / p. 55"],
    ["Retreat", "a second signpost far along the road; mist-shrouded way out (helipad, lifeboat, quiet wood) that returns outsiders to the Near Umbra", "Umbra: The Velvet Shadow pdf 56-57 / p. 55-56"],
    ["The Plain of the Apocalypse", "a silent alkali flat where the Last Battle is to be fought", "Umbra: The Velvet Shadow pdf 58 / p. 57"],
    ["The Triat war camps", "at the plain's edge, the Weaver's silk-spun bunkers, the Wyrm's Bane host under Maeljin reflections, and the Wyld's chimerical mob, fighting for position", "Umbra: The Velvet Shadow pdf 58 / p. 57"]
  ],
  "cyberrealm": [
    ["Spider City", "the central city, a web-shaped maze of concrete, plastic and glass with miles-high towers, hovercars and maglev trains", "Umbra: The Velvet Shadow pdf 59 / p. 58"],
    ["Uptown", "top tier of penthouses linked by data-stuffed webs, home of the ruling Weaver-spirits, guarded by the Spider Patrol", "Umbra: The Velvet Shadow pdf 59-60 / p. 58-59"],
    ["Downtown", "middle tier, a bright bazaar of malls, pubs, offices, kiosks and talking vending machines run by Weaver Constructs", "Umbra: The Velvet Shadow pdf 60 / p. 59"],
    ["Old Town", "bottom tier, a rusting junkyard city lit by burning garbage, where the Cyber Dogs lead a revolt", "Umbra: The Velvet Shadow pdf 60-61 / p. 59-60"],
    ["The Pit", "tunnels of obsolete tech of every age under Old Town, where broken spirits and trapped travellers are dumped; hybrid junk-creatures crawl out", "Umbra: The Velvet Shadow pdf 61 / p. 60"],
    ["The Computer Web", "a glowing web high over the city, the Internet's reflection; its Macro Level of strands and its Micro Level nodes, each a little world of files", "Umbra: The Velvet Shadow pdf 61 / p. 60"],
    ["Secret labs", "labs all over the city turning out gadgets that work better here than on Earth", "Umbra: The Velvet Shadow pdf 59 / p. 58"]
  ],
  "dream-zone": [
    ["The dreamer's own dream", "the first layer, shaped by the sleeper", "Umbra: The Velvet Shadow pdf 43 / p. 42"],
    ["Other sleepers' dreams", "deeper layer; packmates can walk each other's dreams", "Umbra: The Velvet Shadow pdf 43 / p. 42"],
    ["The primal archetypes", "the deepest layer: love, death, flight, falling, drowning, blood and fire", "Umbra: The Velvet Shadow pdf 43 / p. 42"],
    ["Mokole Mnesis depths", "reaches of dream only Mokole (and the wisest mages) get to, memories of ages before the Garou", "Umbra: The Velvet Shadow pdf 44 / p. 43"]
  ],
  "erebus": [
    ["Cerberus at the border", "three-headed black-and-silver wolf who questions every arrival and lets the sincere onto the silver path", "Umbra: The Velvet Shadow pdf 62 / p. 61"],
    ["The plain of black rock", "jagged black stone almost to the horizon, broken by glowing pools of molten silver where the Brood wait", "Umbra: The Velvet Shadow pdf 62 / p. 61"],
    ["The shale tunnels", "slick black caves through endless shale where the silver rivers drag penitents down", "Umbra: The Velvet Shadow pdf 63 / p. 62"],
    ["The great silver waterfall", "a dizzyingly high fall where the rivers pour out into the lake", "Umbra: The Velvet Shadow pdf 63 / p. 62"],
    ["The lake of silver", "vast lake at the bottom of the realm where penitents thrash until clean; currents carry them toward the island", "Umbra: The Velvet Shadow pdf 63 / p. 62"],
    ["Charyss' fortress", "black shale fortress on the central island, lit by silver-flamed braziers; the Incarna lives deep inside", "Umbra: The Velvet Shadow pdf 63 / p. 62"],
    ["Halls of the Harrowers and Castigators", "hidden halls in the fortress lined with silver mirrors through which robed Brood enter penitents' minds", "Umbra: The Velvet Shadow pdf 63 / p. 62"],
    ["Cliff stairs and Brood rafts", "rough stairs down the cliff for envoys, and rafts that ferry them dry across the lake", "Umbra: The Velvet Shadow pdf 63 / p. 62"]
  ],
  "flux": [
    ["Instant cities", "great cities that appear and vanish in a blink", "Umbra: The Velvet Shadow pdf 65 / p. 64"],
    ["The Weaver's shell", "an eggshell-thin layer of order spun round the realm by Weaver minions over centuries", "Umbra: The Velvet Shadow pdf 65 / p. 64"],
    ["The Cocoon", "a 3-D Pattern Web labyrinth round the realm, guarded by Pattern Spiders; its form changes each visit (Greek maze, jungle, endless museum, crypt)", "Umbra: The Velvet Shadow pdf 66 / p. 65"],
    ["The Coil's maelstroms", "the wildest storms, where the Wyld Incarna called the Coil plays and rules", "Umbra: The Velvet Shadow pdf 66 / p. 65"],
    ["Bubbles of false calm", "pockets of order the Coil seals visitors in, made to look like home", "Umbra: The Velvet Shadow pdf 66 / p. 65"]
  ],
  "legendary": [
    ["The Kingdoms", "many realms each ruled by a hero of the Silver Record crowned by Gaia; land and people mirror the ruler (stone castle and moat, moon-song palace)", "Umbra: The Velvet Shadow pdf 67 / p. 66"],
    ["The Wylderness", "shifting land between the kingdoms full of legendary monsters, enchanted places and treasure, with allegorical trials", "Umbra: The Velvet Shadow pdf 67 / p. 66"],
    ["The Midnight Land", "a once-fertile kingdom now stony desert under ash-black sky, dead trees and skeletons", "Umbra: The Velvet Shadow pdf 68 / p. 67"],
    ["The obsidian castle", "spiked black fortress at the Midnight Land's centre, a projection of Malfeas ruled by Maeljin avatars", "Umbra: The Velvet Shadow pdf 68 / p. 67"],
    ["The Third City", "crumbling undead-haunted city round the obsidian castle, gargoyle wall with Bane roost towers", "Umbra: The Velvet Shadow pdf 68 / p. 67"],
    ["The Fimbulwinter kingdoms", "kingdoms frozen under glaciers, with ice castles and frost and snow giants", "Umbra: The Velvet Shadow pdf 68 / p. 67"],
    ["The Hungry Dust", "locust-blighted wasteland that began in the warm southern veldts and keeps spreading", "Umbra: The Velvet Shadow pdf 68-69 / p. 67-68"],
    ["The Great Miasma", "bogs and moors swelling into the kingdoms, giving off a sickening Wyrm stench", "Umbra: The Velvet Shadow pdf 69 / p. 68"]
  ],
  "malfeas": [
    ["The Central Duchy courtyard", "a vast, irregular courtyard with a raised spiral-carved stone at its middle, where most Moon Bridges into Malfeas come down", "Book of the Wyrm (W20) pdf 25 / p. 24"],
    ["The Grand Cathedral", "mile-high cathedral to all the Hydra's heads, the one place open to followers of any head; captives hang in iron cages halfway up its walls", "Book of the Wyrm (W20) pdf 25 / p. 24"],
    ["The courtyard factories", "the other giant buildings round the courtyard, factories loud with machines and screams", "Book of the Wyrm (W20) pdf 25 / p. 24"],
    ["Castle Cthonus dungeons", "the torture levels under Number Two's tower; the lowest is said to be a pit toward the Eater of Souls, with caverns out to the Abyss", "Book of the Wyrm (W20) pdf 25 / p. 24"],
    ["The Temple Obscura", "green-veined dark marble temple, the Black Spiral Dancers' holiest site, nine rooms in a row for the Labyrinth's nine circles", "Book of the Wyrm (W20) pdf 26 / p. 25"],
    ["The Room of Mystery", "the last, blank-walled room of the temple with a bloodied black altar, built round the mouth of the Black Spiral Labyrinth", "Book of the Wyrm (W20) pdf 26 / p. 25"],
    ["The Wyld Founts", "captive Wyld springs; the largest lies just off the courtyard by the Grand Cathedral", "Book of the Wyrm (W20) pdf 26 / p. 25"],
    ["The Duchy of the Hellbringer", "the duchy that the Far Calumn from the Atrocity Realm opens into", "Book of the Wyrm (W20) pdf 23 / p. 22"]
  ],
  "pangaea": [
    ["The Elder Serpent's volcanoes", "the tallest mile-high volcanic crags, too dense for the quakes to topple, lair of the dragon-like king of Pangaea; no shapeshifter has climbed them", "Umbra: The Velvet Shadow pdf 71 / p. 70"],
    ["The Graveyard of the Lost", "a mound of bones of every extinct species, lost Changing Breeds among them, hidden in a dense forest; a Level 5 caern", "Umbra: The Velvet Shadow pdf 71 / p. 70"],
    ["The Glens", "gateways to forgotten wild places on Earth; the simple way out", "Umbra: The Velvet Shadow pdf 71 / p. 70"],
    ["The tar pits", "black pits of molten tar that swallow careless predators", "Umbra: The Velvet Shadow pdf 70 / p. 69"],
    ["The northern glaciers", "spiked glaciers that creep like ships over land and sea in the north", "Umbra: The Velvet Shadow pdf 70 / p. 69"],
    ["The scorched volcanic wastes", "miles of searing land where only tough reptiles live", "Umbra: The Velvet Shadow pdf 70 / p. 69"],
    ["The desert of the barbarians", "vast sandstone deserts of scaled-hide nomads with black-glass axes, living off the xixa cactus", "Umbra: The Velvet Shadow pdf 72 / p. 71"],
    ["The mountain people's caves", "hollows inside the mountains, home of blind cave-dwellers whose moaning song warns others off", "Umbra: The Velvet Shadow pdf 72-73 / p. 71-72"]
  ],
  "scar": [
    ["Black glass towers", "faceless towers of black glass and steel above refuse-covered parking lots", "Umbra: The Velvet Shadow pdf 73 / p. 72"],
    ["The factory complexes", "soot-caked mills that pour smoke into the sky and sludge into oily rivers, worked in sixteen-hour shifts", "Umbra: The Velvet Shadow pdf 73 / p. 72"],
    ["The Gnosis Batteries", "vats under every factory floor holding Gnosis drained from worker spirits, guarded by Banes and pattern spiders", "Umbra: The Velvet Shadow pdf 73 / p. 72"],
    ["The old way in", "a disused railway line or a gas-lit cobbled road past brick buildings, thick with pattern-spider webs near the realm", "Umbra: The Velvet Shadow pdf 73 / p. 72"],
    ["The gridlocked streets", "traffic-jammed roads and alleys full of worn-out spirits cast off by the mills; corporate Bane police", "Umbra: The Velvet Shadow pdf 73 / p. 72"],
    ["The tunnel to Malfeas", "a huge lightless tunnel mouth leaving the Last Junction; tracks lead only away, and only to Malfeas", "Umbra: The Velvet Shadow pdf 74 / p. 73"],
    ["The barons' business kingdoms", "holdings of the Barons of Industry, corporate Wyrm and Weaver spirit-amalgams, policed by sponsor-branded Scrags", "Umbra: The Velvet Shadow pdf 74 / p. 73"]
  ],
  "summer-country": [
    ["The Isle of Self", "the largest island in the lagoon; a woven-grass shrine to Gaia stands among its growth", "Umbra: The Velvet Shadow pdf 76 / p. 75"],
    ["The Well of Life", "a bubbling spring ringed by sparkling limestone pillars inside the shrine; its water heals body, mind and soul", "Umbra: The Velvet Shadow pdf 76 / p. 75"],
    ["The Mountains of the Moon", "rugged peaks on the mainland full of predators and prey", "Umbra: The Velvet Shadow pdf 76 / p. 75"],
    ["Mount Peace", "the highest point of the Mountains of the Moon", "Umbra: The Velvet Shadow pdf 76 / p. 75"],
    ["The Forest of Longing", "ancient, bittersweet wood at the far western curve; where those who find the realm arrive", "Umbra: The Velvet Shadow pdf 76-77 / p. 75-76"],
    ["The Forest of Promise", "wood at the far eastern curve", "Umbra: The Velvet Shadow pdf 76 / p. 75"],
    ["The Enchanted Glade", "at the heart of the Forest of Promise, a huge granite amphitheatre where the realm's folk gather", "Umbra: The Velvet Shadow pdf 76 / p. 75"],
    ["Cloudtop High", "a floating island over the lagoon, roots hanging beneath full of bats, with a spired castle of living vines for communing with Gaia", "Umbra: The Velvet Shadow pdf 76 / p. 75"]
  ],
  "wolfhome": [
    ["The Shelters", "filthy cage-houses run by uniformed humans", "Umbra: The Velvet Shadow pdf 79-80 / p. 78-79"],
    ["The Sewers", "tunnels under the Town with feral dogs, rats and alligators", "Umbra: The Velvet Shadow pdf 80 / p. 79"],
    ["The Zoo and aquarium", "barred concrete dens for big or dangerous animals; the aquarium for Rokea", "Umbra: The Velvet Shadow pdf 80 / p. 79"],
    ["The Camps", "labs and testing centres where captured animals suffer and die", "Umbra: The Velvet Shadow pdf 80 / p. 79"],
    ["The ringed lakes and rivers", "fresh waters that circle and feed each other without reaching a sea", "Umbra: The Velvet Shadow pdf 79 / p. 78"]
  ],
  "umbral-abyss": [
    ["The cliff face", "the endless crag round the chasm, full of caves and cracks where lost things and stranded spirits end up", "Umbra: The Velvet Shadow pdf 44 / p. 43"],
    ["The Iron Path", "descent lined with iron ore, past many caves of mad dwellers; the easiest of the three", "Umbra: The Velvet Shadow pdf 46 / p. 45"],
    ["The Gold Path", "descent strewn with gold nuggets and lost riches (taking the gold curses the taker); the deadliest drops", "Umbra: The Velvet Shadow pdf 46 / p. 45"],
    ["The Silver Path", "descent with shifting silver veins and great totem carvings that judge the traveller; a trial of the soul", "Umbra: The Velvet Shadow pdf 46 / p. 45"],
    ["The Hive of the Jagged Maw", "Black Spiral Dancers who worship Eater-of-Souls, now under Nightmaster", "Umbra: The Velvet Shadow pdf 47 / p. 46"],
    ["Slumbering spirit caves", "crevasses where forgotten and long-defeated spirits lie inert", "Umbra: The Velvet Shadow pdf 47 / p. 46"]
  ],
  "horizon-realm": [
    ["Concordia", "the 15-mile-wide City of Harmony round Horizon Chantry, home of about half the realm's 30,000 people", "Horizon: Stronghold of Hope pdf 55 / p. 54"],
    ["The Horizon Range", "great mountains walling Orbis Finiens on every side", "Horizon: Stronghold of Hope pdf 55 / p. 54"],
    ["Pax and Robur", "the Arm of Peace and the Arm of Strength, land bridges running due west and east to the far continent", "Horizon: Stronghold of Hope pdf 55 / p. 54"],
    ["The Glacial Pools", "Tass-laden snowfields north of Concordia where yeti hunt; source of the Essonne (frigid), Qi-Nagi (tepid) and Msangesi (boiling) rivers", "Horizon: Stronghold of Hope pdf 55 / p. 54"],
    ["The Cascades Region", "porous southern mountains where the rivers sink into caves and fall as waterfalls into Triton's Deep", "Horizon: Stronghold of Hope pdf 55-56 / p. 54-55"],
    ["Mt. Apollo", "7,333-foot extinct volcano at the centre of Posht, ringed by active cones and gravity bands; the Sons of Ether's Mudroom of anti-grav boots", "Horizon: Stronghold of Hope pdf 56 / p. 55"],
    ["The Depthless Labyrinth", "caves under the Council Chambers, older than the founders; one passage ran through the core to Mt. Apollo, others to Triton's Deep isles and the ice of Daroum", "Horizon: Stronghold of Hope pdf 56 / p. 55"],
    ["Triton's Necklace", "54 magical isles in the southern ocean forming the Spheres' symbols: Liathghorm Isle and Ancient's Cave, Kurukulai with the obsidian Talisman Caveat, Saelie's Island, Gravsten Isle", "Horizon: Stronghold of Hope pdf 56 / p. 55"]
  ],
  "shade-realm": [
    ["The Verbena Seasonal Realms", "overlap realms made where Venus' spirit realm meets the Shade Realm of Life", "Beyond the Barriers: The Book of Worlds pdf 20 / p. 19"],
    ["City of Brass doorways", "rooms of Mercury's City of Brass can surface in a Shade Realm, since the palace sits at the correspondence point", "The Infinite Tapestry pdf 121 / p. 120"]
  ],
  "shard-realm": [
    ["The City of Brass", "Mercury's maze-palace of impossible passages; doors and windows change which rooms they join; Batini ghosts and mathematical spirits wander it", "The Infinite Tapestry pdf 121 / p. 120"],
    ["Mus", "Mercury's spirit moon, site of the Batini-Hermetic university-fortress (a mosque, two chapels, a vast library), wrecked by the Technocracy in 1995", "The Infinite Tapestry pdf 121 / p. 120"],
    ["The dark side of Mus", "the moon's Dark Umbra shadow where Nephandi built a twisted copy of the chantry", "The Infinite Tapestry pdf 121 / p. 120"],
    ["Doissetep's ruins", "tumbled slag of the great Hermetic chantry in the Realm of Forces, scene of the War in Ruins; scavengers still clash there", "Tradition Book: Order of Hermes (Revised) pdf 35 / p. 33"],
    ["Lost Victorian colonies", "faded remnants of realms the 19th-century Void expeditions built (five on Venus alone, a planned chantry on Ganymede)", "The Infinite Tapestry pdf 120 / p. 119"]
  ],
  "paradox-realm": [
    ["The Radiance", "a nearby realm of pure possibility where magic runs wild; usually rolling pastoral hills, sometimes a void of magic streams or a wire technotopia", "Masters of the Art pdf 50 / p. 49"],
    ["The Pulse", "at the Radiance's heart nine streams of magic meet; nearness burns Paradox out of a mage at great pain, deadly to old archmages", "Masters of the Art pdf 50 / p. 49"],
    ["Steadings", "small pocket realms archmages wall off and shape (fairy-glade cottage, black cathedral, techno-fantasy world), powered by a Node", "Masters of the Art pdf 49 / p. 48"]
  ],
  "deep-umbra": [
    ["Luna's moonlit expanses", "beyond the Anchorheads near Luna's domain, moonlit lands of Lune Incarnae, friendly at full moon, tricky on the wane", "Umbra: The Velvet Shadow pdf 105 / p. 104"],
    ["Helios' realm", "white heat and light, bridges of red flare-light over chasms of burning matter; fire Incarnae drive off werewolves; only flyers survive", "Umbra: The Velvet Shadow pdf 105 / p. 104"],
    ["The Wyld's maelstrom", "chaos reached through the Flux Realm, guarded by violent Wyld Incarnae", "Umbra: The Velvet Shadow pdf 105 / p. 104"],
    ["The heart of the Pattern Web", "where the Weaver sits, reached along the Web from the CyberRealm; Weaver Incarnae reweave paths to trap visitors", "Umbra: The Velvet Shadow pdf 105 / p. 104"],
    ["The Wyrm's lair", "the Wyrm in its web prison, reached only down the black spiral through Malfeas", "Umbra: The Velvet Shadow pdf 105-106 / p. 104-105"],
    ["The Bunyip refuge", "a corner like their lost Australian home where the last Bunyip settled, now half spirits", "Umbra: The Velvet Shadow pdf 106 / p. 105"],
    ["Alien Celestine realms", "cracked mirror-lands of five or more dimensions, abysses of living shadow, home of Celestines with no body in our sky", "Umbra: The Velvet Shadow pdf 105, 107 / p. 104, 106"]
  ],
  "digital-web": [
    ["Virgin Web", "unformatted crystal landscape a mage can shape by will into a sector", "Digital Web pdf 34 / p. 33"],
    ["Grid sectors", "monochrome plains where Sleepers' icons appear as geometric shapes", "Digital Web pdf 34 / p. 33"],
    ["The Junklands", "wrecks of old fights and botched formatting, a nightmare swirl of images; some hold a mage's mind (Stacked Files, such as the Crater)", "Digital Web pdf 34 / p. 33"],
    ["The Trash Sector", "rumoured dump of every lost program, said to breed Nephandi and open on the Deep Umbra", "Digital Web pdf 34 / p. 33"],
    ["Techno Turf", "sharp pixelated solids round Technocracy sectors, sterile and patrolled by killer programs", "Digital Web pdf 35 / p. 34"],
    ["Conduits", "the data highways, tubes of light or electronics linking sectors at great speed", "Digital Web pdf 35 / p. 34"],
    ["The Spy's Demise", "a famous virtual hangout and nerve-centre club", "Digital Web pdf 11 / p. 10"],
    ["Mage-built sectors", "libraries, schools, aviaries, gardens, observatories, prisons and torture halls patterned by mages", "Digital Web pdf 12 / p. 11"]
  ],
  "autochthonia": [
    ["The resident sleeping halls", "rearranged quarters where every resident sleeps linked to the Computer", "Technocracy: Iteration X (Revised) pdf 69 / p. 67"],
    ["The damaged outer reaches", "edges of the realm torn by the Dimension Storm", "Technocracy: Iteration X (Revised) pdf 69 / p. 67"],
    ["The wrecked Digital Image Chambers", "the old chambers Iteration X used to visit, mostly destroyed", "Technocracy: Iteration X (Revised) pdf 69 / p. 67"],
    ["Sealed Web access points", "all ways into Autochthonia from the Digital Web, restricted by Iteration X", "Digital Web pdf 35 / p. 34"]
  ],
  "tempest": [
    ["The Sunless Sea", "once a calm ocean at the river's delta, now wild with odd currents, strange beasts, island havens, Renegade enclaves and soul pirates", "The Sea of Shadows pdf 24 / p. 23"],
    ["The Sea of Souls", "bound thralls chained in the waters round Stygia's sea-wall, a moaning barrier of belief against Oblivion", "The Sea of Shadows pdf 24 / p. 23"],
    ["The Sea of Shadows", "the ocean of Spectres right round the Labyrinth", "The Sea of Shadows pdf 24 / p. 23"],
    ["Necropolis ports", "guarded oval mirrors hanging over the byways that open into the Shadowlands' cities; can be sealed", "The Sea of Shadows pdf 30-31 / p. 29-30"],
    ["Renegade river outposts", "Ferryman enclaves and Renegade posts along the river, each about an hour apart from Stygia outward", "The Sea of Shadows pdf 21, 27 / p. 20, 26"]
  ],
  "stygia": [
    ["The Isle of Sorrows", "the rocky island at the River of Death's delta on which Charon built Stygia", "Wraith 20th pdf 94; The Sea of Shadows pdf 28 / p. 27"],
    ["The sea-wall", "wall of melted-down wraith plasm, later bound with Stygian steel, built round the isle after the First Great Maelstrom", "The Sea of Shadows pdf 24 / p. 23"],
    ["The Shining Ones' temples", "temples on land the Senate granted near the docks of the Sunless Sea, refuges for souls bound for the Far Shores", "Wraith 20th pdf 95"],
    ["The water clocks", "Stygia's timekeeping, counting the Sunless Sea's two daily tides", "The Sea of Shadows pdf 24 / p. 23"],
    ["The barrack towers", "huge towers raised to house the flood of new dead in the world wars", "Wraith 20th pdf 104"]
  ],
  "labyrinth": [
    ["The Venous Stair", "an opening into the Labyrinth where Stygia mines the stuff of Stygian steel; pink marble veined black", "The Sea of Shadows pdf 29 / p. 28"],
    ["Labyrinth sentry posts", "gong-posts at every opening, warning of Spectre raids and Maelstroms", "The Sea of Shadows pdf 29 / p. 28"],
    ["Realms in the tunnels", "whole dark realms of Spectres and Malfeans inside the caverns, staging grounds for raids on Stygia and the Far Shores", "The Sea of Shadows pdf 29 / p. 28"],
    ["The maw at the centre", "the great opening on Oblivion that no wraith has gone down and returned from", "The Sea of Shadows pdf 29 / p. 28"],
    ["The Great Maze", "the part of the Labyrinth lying beneath Stygia", "Doomslayers: Into the Labyrinth pdf 140 / p. 139"],
    ["Industrion", "the City of Perpetual Industry, a graveyard of two centuries of reformers' dreams, begun with the death of Benjamin Rush", "Doomslayers: Into the Labyrinth pdf 139 / p. 138"],
    ["The Pit of Salt and Iron", "domain of the Yama King Wu Hua, a lord of tyranny and deceit", "Doomslayers: Into the Labyrinth pdf 143 / p. 142"]
  ],
  "far-shores": [
    ["The milk and honey shore", "a paradise where the storm falls as milk and honey into a sea of the same", "The Sea of Shadows pdf 30 / p. 29"],
    ["The wall of flame", "a hell ringed by fire fed by a sea of burning oil", "The Sea of Shadows pdf 30 / p. 29"],
    ["The sea of blood", "a realm held in blood and rotting flesh, freezing bile for rain", "The Sea of Shadows pdf 30 / p. 29"],
    ["The waiting crowds", "seas of wraiths spreading from each shore, waiting to be taken in; proselytizers and slavers work them", "The Sea of Shadows pdf 30 / p. 29"]
  ],
  "dark-kingdom": [
  ],
  "enoch": [
    ["Soulsteel chains", "huge chains of soulsteel from the spire tops to the outer walls, still murmuring in old Enochian", "The Black Hand: A Guide to the Tal'Mahe'Ra pdf 121 / p. 120"],
    ["The Doomsday Clock", "thousands of bloated, glowing slave ghosts circling the inner spires on the storm winds as false stars; no fire is allowed in the city", "The Black Hand: A Guide to the Tal'Mahe'Ra pdf 121 / p. 120"],
    ["The Black Citadel", "the rebuilt First City inside the walls, nearly 10 square miles, early Mesopotamian in look, mostly empty, with quarters for far more than ever come", "Dirty Secrets of the Black Hand pdf 92 / p. 93"],
    ["Dread Palace Ghemal, the High House of Caine", "the great palace at the centre, five levels: meeting hall and museum with Caine's Ivory Throne; Hall of Havens; festival and feeding halls; the Del'Roh's floor; the closed fifth level with the Black Throne of Basalt", "Dirty Secrets of the Black Hand pdf 92-93 / p. 93-94"],
    ["The library", "the old library raised by Brujah near the town centre, the sect's great store of lore", "Dirty Secrets of the Black Hand pdf 92 / p. 93"],
    ["Hanging gardens and statues", "gardens laid out by Malkav, still in bloom, and statues said to be Arikel's work; Ventrue streets kept perfect", "Dirty Secrets of the Black Hand pdf 92 / p. 93"]
  ],
  "far-dreaming": [
    ["The Vale of Mists", "the way in from the Near Dreaming: wide foggy forests, still lakes and small farming hamlets, once a peaceful reminder of Arcadia, now with dark corners where Banality-scared chimera and fae rule", "Changeling: The Dreaming 20th pdf 307 / p. 306"],
    ["Inns and workshops of the Vale", "taverns, inns and workshops Kithain built for changeling and chimera visitors seeking rest", "Changeling: The Dreaming 20th pdf 307 / p. 306"],
    ["The thirteen gates", "magical gates to the Deep Dreaming guarded by traps, beasts, riddles and memory-knights of old sidhe; a fourteenth vanished during the Evanescence and its ruins are lost", "Changeling: The Dreaming 20th pdf 307 / p. 306"],
    ["Halostian's Laboratory", "the trap-filled domain of a War of Trees alchemist and schemer, reached only by leaving the Silver Path for the cursed Dusk Road and the Pale Swamps", "Changeling: The Dreaming 20th pdf 307 / p. 306"],
    ["The Mistweir and Fin Bheara", "the cloud wall at the far edge (a foot to over a mile deep) with commoner hamlets along it; the great city of Fin Bheara, ruled half the year by a dark-haired sidhe queen and half by its boggan founder, is the usual starting point for crossing", "Changeling: The Dreaming 20th pdf 308 / p. 307"],
    ["Hermit homes", "dwellings of powerful changelings who left the Autumn world for good to live out their time here, drawing sentient chimera around them", "Changeling: The Dreaming 20th pdf 307 / p. 306"]
  ],
  "deep-dreaming": [
    ["The Mistweir", "the final trial: inside the cloud there is no way back, only forward through trials aimed at each traveller's mundane weakness", "Changeling: The Dreaming 20th pdf 308 / p. 307"],
    ["Sunken Atlantis", "Atlantis lies at the bottom of the deepest, darkest sea the realm can dream", "Changeling: The Dreaming 20th pdf 308 / p. 307"],
    ["Ruins of the First Empire", "a huge floating island once above the High Court of Arcadia, a meeting place for nature faeries: mountains, singing caverns, magma pools, rivers and forests; now nightmare chimera roam it and its music only mourns", "Changeling: The Dreaming 20th pdf 308 / p. 307"],
    ["Nightmare realms", "realms of pure dread that only the bravest enter", "Changeling: The Dreaming 20th pdf 308 / p. 307"],
    ["Gold Paths of Balor", "the rarest dark-fae roads, found only in the darkest parts; said to lead to the Fomorians, the Tuatha or older gods; no one has come back", "Changeling: The Dreaming 20th pdf 311 / p. 310"],
    ["Arcadia's gates", "somewhere beyond the furthest reaches; no trod to Arcadia stays open long enough to use", "Changeling: The Dreaming 20th pdf 301 / p. 300; pdf 308 / p. 307"]
  ],
  "yomi": [
    ["Scarlet Path", "Borderland bridge from Yomi to the Yang World; the Yama Kings hold less sway there", "The Thousand Hells pdf 18"],
    ["Goblin Jungle", "Wild stretch of the Scarlet Path full of goblins, Kumo breeding grounds and tempting yangstones", "The Thousand Hells pdf 19-20"],
    ["Ebon Road", "Flickering bridge from Yomi to the Yin World and the Underworld; appears only at auspicious times and places", "The Thousand Hells pdf 18, 21"],
    ["Wu Hua's towers", "Spires along a fork of the Ebon Road where captives are impaled", "The Thousand Hells pdf 22"],
    ["Kakuri", "Emma-o's hell of black-blade fields and life-draining crystal; holds the Cave of Maidens", "The Thousand Hells pdf 25-27"],
    ["Lanka and the Demon Keep of Ravana", "Dormant raksha city in a blood sea; the keep is being rebuilt under the regent Thratri", "The Thousand Hells pdf 28-29"],
    ["Hell of Being Skinned Alive and the Sinister Fortress", "Tou Mu's lightning plain; the iron palace has the tormented lashed to its walls", "The Thousand Hells pdf 29-31"],
    ["Wicked City", "Mikaboshi's endless polluted city; roads lead to the Cyber-Realm and other places of urban rot", "The Thousand Hells pdf 32-33"]
  ],
  "yellow-springs": [
    ["Jade Palace", "Seat of the Emperor Yu Huang, linked to the Yellow Springs by the Imperial Highway", "Dark Kingdom of Jade pdf 45"],
    ["Necropolis Xi'an", "Imperial city of the dead with official buildings", "Dark Kingdom of Jade pdf 45"]
  ],
  "duat": [
    ["Amenti, the Dark Kingdom of Sand", "Hidden land in the Tempest shaped like Egypt in small: fields, cities of the dead, deserts and mountains, ringed by a sandstorm", "Mummy (Second Edition) pdf 111-112"],
    ["River of Life", "Spectral Nile through the middle of Amenti; follow it too far either way and it leads into the Tempest", "Mummy (Second Edition) pdf 112"],
    ["Palace of Osiris", "The largest and oldest building in Amenti, where Osiris sits silent on the throne", "Mummy (Second Edition) pdf 112"],
    ["Blessed Fields of A'aru and the Lake of Flowers", "The paradise the Egyptian dead seek; those who leave to find it are not seen again", "Mummy (Second Edition) pdf 109, 111"]
  ],
  "demon-abyss": [
    ["Gate of Hell", "Threshold on the plain of judgment through which the fallen were cast into the Pit", "Demon: The Fallen pdf 58 (printed 57)"],
    ["Seals and outer boundary of the Abyss", "The walls between Hell and the realm of the dead, cracked by the Maelstrom so the lesser fallen could slip through", "Demon: The Fallen pdf 66-67 (printed 65-66)"]
  ],
};

export const LAYOUT = {
  "aetherial": [
    ["Phoebe is the nearest body and fills half the sky; the sun shines bright but far off", "Rage Across the Heavens pdf 25 / p. 24"],
    ["The star roads reach outward to the Membrane before the Deep Umbra; the Incarnae's domains lie along them, Sokhta's first, Helios's in the farther reaches", "Rage Across the Heavens pdf 24, 27 / p. 23, 26"],
    ["Travellers are weightless and must keep to the clouds or the paths; any path can reach every domain, but a guide's route is shorter and safer; journeys take weeks or months", "Rage Across the Heavens pdf 24 / p. 23"],
    ["Off the path, the laws of whichever Incarna's domain one stands in apply", "Rage Across the Heavens pdf 24 / p. 23"],
    ["The realm spans from over the Penumbra up to the Membrane; its ground is spongy cloud forming plains, hills and mountains; all Moon Bridges pass through it at their peak", "Umbra: The Velvet Shadow pdf 47 / p. 46"],
    ["Luna hangs huge at one end of a near-black blue sky, Helios small and faint at the other, planets and stars between; the sun is reached in about a day, the moon only past the Lunes", "Umbra: The Velvet Shadow pdf 48 / p. 47"],
    ["Gaps between drifting clouds drop the traveller safely to a random spot in the Near Umbra", "Umbra: The Velvet Shadow pdf 47-48 / p. 46-47"],
    ["The planetary domains lie in the Reaches between and beyond the moon and sun; past them, at the Membrane, are the Weaver, Wyld and Wyrm Reaches", "Umbra: The Velvet Shadow pdf 49 / p. 48"]
  ],
  "arcadia-gateway": [
    ["Seasons lie by compass: Summer east on the coast, Winter west, Autumn north, Spring south", "Umbra: The Velvet Shadow pdf 52 / p. 51"],
    ["Cannot be mapped by dead reckoning: landmarks move and change shape", "Umbra: The Velvet Shadow pdf 52 / p. 51"],
    ["Some say a walkway paved with nightmares and lined with topiaries leads to Arcadia itself, if the door can be found", "Umbra: The Velvet Shadow pdf 50 / p. 49"]
  ],
  "atrocity": [
    ["A stinking waste of corpses and blood; every footprint fills with maggots and flies swarm outsiders", "Umbra: The Velvet Shadow pdf 53 / p. 52"],
    ["The library stands in one part of the realm, apart from the scenes; the Far Calumn sits in the middle of the gibbet grove", "Umbra: The Velvet Shadow pdf 55 / p. 54; Book of the Wyrm (W20) pdf 23 / p. 22"],
    ["Entry is easy and often by accident (a wrong branch of a moon path, a gate in another realm); the only way out is to die willingly as a victim in a scene", "Umbra: The Velvet Shadow pdf 54 / p. 53"]
  ],
  "battleground": [
    ["Every visit starts at the Signpost; one road leads each way; along a road the traveller meets all its listed battles and more, then the Retreat signpost", "Umbra: The Velvet Shadow pdf 56 / p. 55"],
    ["The Plain of the Apocalypse is reached in the end by those who keep going, ringed by the Triat armies' battlefields", "Umbra: The Velvet Shadow pdf 58 / p. 57"]
  ],
  "cyberrealm": [
    ["Three layers: the Pit beneath, Spider City in the middle (Uptown over Downtown over Old Town), the Computer Web far above under a flat grey sky", "Umbra: The Velvet Shadow pdf 58-59 / p. 57-58"],
    ["Old Town and Downtown are walled off by web-sealed shafts and stairs; moving between districts means climbing webs on the towers", "Umbra: The Velvet Shadow pdf 60-61 / p. 59-60"],
    ["Entry by moonlit airts past Weaver guardians; exits from Micro Level terminals, rumoured paths through the Pit", "Umbra: The Velvet Shadow pdf 59 / p. 58"]
  ],
  "dream-zone": [
    ["Lies on the edge between Near and Deep Umbra, beyond moon bridges and the Pattern Web; entered by sleeping in the Penumbra", "Umbra: The Velvet Shadow pdf 43 / p. 42"],
    ["Travel is a descent: own dream, then others' dreams, then the primal archetypes; each facet leads into the next", "Umbra: The Velvet Shadow pdf 43 / p. 42"]
  ],
  "erebus": [
    ["In order: Cerberus at the border, the silver path, the black plain with pools, tunnels in the rock, the waterfall, the lake at the realm's lowest point, the island fortress at its centre", "Umbra: The Velvet Shadow pdf 62-63 / p. 61-62"],
    ["Anyone who gets past Cerberus without leave finds the way back shut; the only exit is then on the central island", "Umbra: The Velvet Shadow pdf 62 / p. 61"]
  ],
  "flux": [
    ["No fixed landmarks at all: mountains, deserts, jungles and seas rise and vanish in hours or seconds; a thin Weaver-made crust surrounds the raging core", "Umbra: The Velvet Shadow pdf 65 / p. 64"],
    ["Every Moon Path can reach it, but one must cross the Cocoon to its inner edge first; Weaver spirits will not follow past that edge", "Umbra: The Velvet Shadow pdf 66 / p. 65"]
  ],
  "legendary": [
    ["Kingdoms with Wylderness filling the spaces between; the Third City and its wall ring the obsidian castle at the Midnight Land's centre; veldts lie far to the south", "Umbra: The Velvet Shadow pdf 67-69 / p. 66-68"]
  ],
  "malfeas": [
    ["Malfeas is a heap of half-realms joined by impossible geometry; it cannot be mapped, and staring at an attempt drives one mad", "Book of the Wyrm (W20) pdf 23-24 / p. 22-23"],
    ["Arrival is in the Central Duchy courtyard; Castle Cthonus stands across it from the Grand Cathedral; the Temple Obscura is on the Duchy's outskirts in sight of the castle; the largest Wyld Fount is off the courtyard near the cathedral", "Book of the Wyrm (W20) pdf 25-26 / p. 24-25"],
    ["Castle Cthonus is the tallest building (several miles) and also the deepest; its base has only a spiral stair and three old lifts as ways in", "Book of the Wyrm (W20) pdf 25 / p. 24"],
    ["The Wyrm Reaches' dying stars hang in Malfeas' sky; it lies in the Deep Umbra yet is easy to reach", "Book of the Wyrm (W20) pdf 23-24 / p. 22-23"],
    ["Ways in: Far Calumns (most in the Wyrm Reaches), the Atrocity gibbet grove, the Scar's Last Junction train, the Abyss cliff caves that come out under Castle Cthonus", "Book of the Wyrm (W20) pdf 22-23 / p. 21-22"]
  ],
  "pangaea": [
    ["One unbroken landmass ringed by a dark, restless ocean; jungle, mountain, tundra and taiga lie close together; glaciers in the north", "Umbra: The Velvet Shadow pdf 70 / p. 69"],
    ["Peoples: the Thulan (a trading league), the cannibal Zarak-Ur, desert barbarians, mountain cave folk", "Umbra: The Velvet Shadow pdf 72 / p. 71"]
  ],
  "scar": [
    ["A crowded city of towers, lots, factories and oily rivers under a fluorescent green-grey sky where day and night look alike", "Umbra: The Velvet Shadow pdf 73 / p. 72"],
    ["Easy to enter, hard to leave: the membrane is a thick rusty web; ways out are dreaming free or the train", "Umbra: The Velvet Shadow pdf 73 / p. 72"],
    ["Bane Spiders plan and build the city; the station sits at the edge of the cityscape with the tunnel leading out", "Umbra: The Velvet Shadow pdf 74-75 / p. 73-74"]
  ],
  "summer-country": [
    ["A leafy island in a blue sea; the main land is a curved arm enclosing a lagoon the size of a small sea, with smaller islands in it (the Isle of Self the largest, Cloudtop High floating above)", "Umbra: The Velvet Shadow pdf 76 / p. 75"],
    ["Forest of Longing at the west end, Forest of Promise at the east end, mountains between; no path leads there; arrival is in the Forest of Longing", "Umbra: The Velvet Shadow pdf 76-77 / p. 75-76"],
    ["Also the Garden of Delight, a swampy nursery where new life is born and tested", "Umbra: The Velvet Shadow pdf 77 / p. 76"]
  ],
  "wolfhome": [
    ["Deep countryside farthest from the Town; labs and ranger posts scattered through it; the sewers under the Town", "Umbra: The Velvet Shadow pdf 79-80 / p. 78-79"],
    ["Rarely entered on purpose (sent by elders, or fleeing the Dream Zone); the only exit is learning the lesson of one's animal side", "Umbra: The Velvet Shadow pdf 80 / p. 79"]
  ],
  "umbral-abyss": [
    ["A chasm too deep to find a bottom and too wide to cross, even flying; ringed by a vast cliff", "Umbra: The Velvet Shadow pdf 44 / p. 43"],
    ["Three paths (iron, gold, silver) wind from the clifftop to the bottom, crossing back and forth but rarely meeting", "Umbra: The Velvet Shadow pdf 46 / p. 45"],
    ["Exits are mostly deep down, nearer oblivion; winds get stronger and rock worse the lower one goes", "Umbra: The Velvet Shadow pdf 45 / p. 44"]
  ],
  "horizon-realm": [
    ["A world the size of a small moon; Horizon Chantry and Concordia at the centre of Orbis Finiens, a round continent about 1,200 miles across; Posht ('back') the same size on the far side", "Horizon: Stronghold of Hope pdf 55-56 / p. 54-55"],
    ["Around Concordia: Glacial Pools north, then timber forests and hills; champagne country west then desert by the Pax bridge; colder hill country east to Robur; the Cascades in the far south", "Horizon: Stronghold of Hope pdf 55 / p. 54"],
    ["Two oceans, mild Triton's Deep (south) and arctic Arcturis; Posht is cut into pie slices, one per Tradition, with Mt. Apollo shared at the centre; map pages pdf 57-58 also name Daroum, the Sleeping Giant and the moors", "Horizon: Stronghold of Hope pdf 55-58 / p. 54-57"],
    ["No Gauntlet and no stepping sideways; leave only by portals or backdoors through the dreamshell", "Horizon: Stronghold of Hope pdf 55 / p. 54"]
  ],
  "shade-realm": [
    ["Each Shade Realm is the shadow a Shard (sun, moon or planet) casts on the Horizon, and was the portal on to it; each planet has at least one, some more", "Beyond the Barriers: The Book of Worlds pdf 21 / p. 20; The Infinite Tapestry pdf 118 / p. 117"],
    ["Hermetic pairing: Mercury Correspondence, Venus Life, Earth Prime, Mars Forces, Jupiter Matter, Saturn Time, Uranus Spirit, Neptune Mind, Pluto Entropy (other lists exist)", "The Infinite Tapestry pdf 120 / p. 119"],
    ["Overlap zones form where two realms press on each other", "Beyond the Barriers: The Book of Worlds pdf 20 / p. 19"]
  ],
  "shard-realm": [
    ["Nine Shards: sun, moon and planets, each ruled by one Sphere; magic of that Sphere is easier there", "The Infinite Tapestry pdf 118 / p. 117"],
    ["Mercury: the old Batini colony lay on the far side near the light side, where it was near freezing", "The Infinite Tapestry pdf 120 / p. 119"]
  ],
  "paradox-realm": [
    ["Each Paradox Realm may be a bubble in one greater Realm of Paradox; none has found a single stable one, and no one lands in the same one twice", "Masters of the Art pdf 50 / p. 49"]
  ],
  "deep-umbra": [
    ["Beyond the Membrane, outside the shell of Near, Astral and Dark Umbrae; realms run into each other with no clear borders; no trods or paths", "Umbra: The Velvet Shadow pdf 104, 106 / p. 103, 105"],
    ["Ways in: Anchorheads (most in the Aetherial Realm), or through the Triat's Near Realms (Flux, CyberRealm, Malfeas); getting too near a Celestine's realm anchors one to it", "Umbra: The Velvet Shadow pdf 105, 107 / p. 104, 106"],
    ["Mage view: the First Horizon at the edge of the atmosphere, the True Horizon (Etherspace, a sea of luminiferous ether) out to the asteroid belt, the Far Horizon (an asteroid-like barrier), then the Void or Deep Umbra", "The Infinite Tapestry pdf 11-12 / p. 10-11"]
  ],
  "digital-web": [
    ["Sectors are open spaces where conduits meet, like files and folders; free sectors rarely move, restricted ones (corporate, government, Technocracy, Adept chantries, the ways to Autochthonia) are sealed and slower to move through", "Digital Web pdf 34-35 / p. 33-34"],
    ["Formatting reaches 100 feet in a half-dome per success", "Digital Web pdf 34 / p. 33"]
  ],
  "autochthonia": [
    ["A Horizon Realm found in 1893 by the Void Engineer Tychoides; the Computer sits at its heart", "Technocracy: Iteration X (Revised) pdf 68, 70 / p. 66, 68"]
  ],
  "tempest": [
    ["The Tempest lies between the Shadowlands and the inner realms and wraps them all; the Labyrinth sits at its centre ringed by the Sea of Shadows; the Sunless Sea lies between Stygia and the Far Shores; vast oceans separate the Dark Kingdoms", "The Sea of Shadows pdf 24, 28, 31 / p. 23, 27, 30"],
    ["Direction is subjective; by major byway: Stygia to nearest Necropolis port 2 hours, to the Labyrinth 1 week, to the Far Shores 2 weeks; one Far Shore to the next 1 hour; vehicles halve it; minor byways triple, no byway times ten", "The Sea of Shadows pdf 21-22 / p. 20-21"],
    ["In places the Tempest is land-like, with stinging winds and black, sometimes acid rain", "The Sea of Shadows pdf 23 / p. 22"]
  ],
  "stygia": [
    ["An island city at the delta where the River of Death meets the Sunless Sea; docks on the sea side; walled; ringed by the Sea of Souls; iron rails and deep channels lead out", "The Sea of Shadows pdf 24, 28 / p. 23, 27; Wraith 20th pdf 95"],
    ["Nearest Necropolis port about 2 hours away by byway, the Labyrinth a week, the Far Shores two weeks", "The Sea of Shadows pdf 21 / p. 20"]
  ],
  "labyrinth": [
    ["A spiralling maze of tunnels, caverns and endless stairs at the Tempest's heart that also underlies the whole Underworld and comes out in dozens of realms; dug by the Malfeans", "The Sea of Shadows pdf 28-29 / p. 27-28"],
    ["About a week from Stygia by major byway", "The Sea of Shadows pdf 21 / p. 20"]
  ],
  "far-shores": [
    ["Byways made by the Shining Ones lead to each afterlife; the part of the Tempest round each realm takes its own form; the shores lie about an hour apart from one another, two weeks from Stygia", "The Sea of Shadows pdf 21, 30 / p. 20, 29"]
  ],
  "dark-kingdom": [
    ["Far from Stygia and the Far Shores across vast oceans", "The Sea of Shadows pdf 31 / p. 30"]
  ],
  "enoch": [
    ["Enoch sits inside the Tempest and touches the Labyrinth directly; no light but sheet lightning and the Doomsday Clock. Streets shift with the Labyrinth's pull and hide in incense; the palace skyline and the circling ghost-stars are the only landmarks", "The Black Hand: A Guide to the Tal'Mahe'Ra pdf 121, 123 / p. 120, 122"],
    ["Spatial anomalies and wrong angles in the streets turn the unwary inside out; Spectres and hekatonkhires climb out of the catacombs", "The Black Hand: A Guide to the Tal'Mahe'Ra pdf 123-124 / p. 122-123"],
    ["Living mortals die within hours so near the Labyrinth unless protected; the storm rain is toxic, food and blood must be brought in, and the water cannot be made clean. About a hundred thousand ghosts live in fear in the streets", "The Black Hand: A Guide to the Tal'Mahe'Ra pdf 124 / p. 123"],
    ["Below the Shadowlands vampires need no sleep but still spend blood daily; long wakefulness wears the mind down", "The Black Hand: A Guide to the Tal'Mahe'Ra pdf 120 / p. 119"],
    ["Feasts kept in the city: thanksgiving after an eclipse, Midsummer's Eve and All Hallows' Eve, plus days the Del'Roh declares", "Dirty Secrets of the Black Hand pdf 94 / p. 95"]
  ],
  "far-dreaming": [
    ["Second of three layers, beyond the reliable trods: the Silver Path thins or ends mid-road, the Firchlis keeps moving the links between realms, so no map holds. It reflects myths centuries or millennia old, with a few places from before the Shattering", "Changeling: The Dreaming 20th pdf 55 / p. 54; pdf 307 / p. 306"],
    ["Everything is stronger: a breeze becomes a flesh-tearing gale, mountains grander, streams clear and touched with Glamour. Riddles are answered by feelings and deeds, not sums", "Changeling: The Dreaming 20th pdf 307 / p. 306"],
    ["Time warps on the road: a trip that seems years may return the traveller the same instant. Dragons or rocs sometimes carry prey here from the Near Dreaming", "Changeling: The Dreaming 20th pdf 55 / p. 54; pdf 301, 307 / p. 300, 306"],
    ["Entering brings a second Chrysalis: past-life memories flood in and body and clothes reshape to the kith's dream", "Changeling: The Dreaming 20th pdf 302 / p. 301"]
  ],
  "deep-dreaming": [
    ["Reached only through one of the thirteen gates and the Mistweir; anyone heavy with Banality is rejected like an infection, and unenchanted mortals and Prodigals are thrown back to the nearest Far Dreaming trod", "Changeling: The Dreaming 20th pdf 303 / p. 302; pdf 307 / p. 306"],
    ["Pure dream logic: landscapes and places shift constantly yet mostly endure; the realm keeps its own roads, so the Silver Path is not needed. It shows travellers their deepest wishes and fears, which take on minds of their own", "Changeling: The Dreaming 20th pdf 55 / p. 54; pdf 308 / p. 307"],
    ["Changelings swell toward their mythic, pre-Shattering selves: trolls become giants, sidhe blaze; Glamour is plentiful and faerie food makes enchanted mortals forget their lives", "Changeling: The Dreaming 20th pdf 303 / p. 302"],
    ["Kept alive by mortals who still believe the old legends in their hearts", "Changeling: The Dreaming 20th pdf 308 / p. 307"]
  ],
  "yomi": [
    ["The bridges to Yin and to Yang sit at opposite ends of Yomi, so the realm is stretched between the two worlds", "The Thousand Hells pdf 18"],
    ["Each hell has its own Yama King or Queen; the book's entries give the name, the hellscape, places of note and denizens", "The Thousand Hells pdf 23-24"],
    ["Hells connect: escapees from the Seven Burning Seas surface near Lanka or the Wicked City", "The Thousand Hells pdf 39"],
    ["Ti Yu in the Yellow Springs is a made copy; Yomi is the real thing", "The Thousand Hells pdf 6-10"]
  ],
  "yellow-springs": [
    ["Souls are hun and p'o rather than Psyche and Shadow; society is built of extended families, natural and adopted", "Wraith 20th pdf 499-500"],
    ["Run by an Imperial bureaucracy, a volunteer Imperial Army (the only ones allowed weapons) and the Jade Censors who reap, catalogue and tax", "Wraith 20th pdf 501"],
    ["Ti Yu is a made copy of the hells; Yomi is the real thing", "The Thousand Hells pdf 6-10"]
  ],
  "duat": [
    ["Duat is the Egyptian name for the whole Underworld; Anubis ferries the Reborn's ba to the place it chooses", "Mummy (Second Edition) pdf 109, 112"],
    ["Amenti looks endless but is not; it is hidden so only those who already know the way, or are led by its dwellers or Anubis, can find it", "Mummy (Second Edition) pdf 112"],
    ["Amenti is ruled by a council of priests and generals while Osiris stays silent; the Shemsu-heru live there when in the Underworld", "Mummy (Second Edition) pdf 112"]
  ],
  "demon-abyss": [
    ["No geography at all: a featureless prison of memory and regret; the princes of Hell keep warring for rank inside it", "Demon: The Fallen pdf 62, 64 (printed 61, 63)"],
    ["It borders the realm of the dead; the escaped fallen still feel the Abyss pulling them back unless anchored in a host body", "Demon: The Fallen pdf 67-68 (printed 66-67)"],
    ["Factions formed in the prison: Faustians, Cryptics, Reconcilers and others; human magi could summon single fallen out and send them back", "Demon: The Fallen pdf 63-66 (printed 62-65)"]
  ],
};

export const CHANGE = {
  "aetherial": [
    ["By the moon's phase: at moondark even a guide cannot find the way; in the waning phases moon paths grow unstable and Dark Roads appear", "Rage Across the Heavens pdf 24, 27 / p. 23, 26"],
    ["Sokhta shows a different face at each phase (riddler at new moon, prophet at crescent, counsellor at half, warlike at full)", "Rage Across the Heavens pdf 25 / p. 24"],
    ["Time runs oddly; a cold new presence (Anthelios) has entered the vault", "Rage Across the Heavens pdf 24 / p. 23"],
    ["The cloud landscape drifts and reshapes to its own rhythm", "Umbra: The Velvet Shadow pdf 47 / p. 46"],
    ["Star spiders move frozen stars to new places in the web, making new constellations; Wyld passages last hours or days", "Umbra: The Velvet Shadow pdf 49 / p. 48"]
  ],
  "arcadia-gateway": [
    ["Since Lord Lysander vanished a few years ago, Winter and Autumn have grown and Spring and Summer shrunk; land follows its people", "Umbra: The Velvet Shadow pdf 52 / p. 51"],
    ["The realm is collapsing as human dreams of the fae fade; its emanations know it", "Umbra: The Velvet Shadow pdf 50 / p. 49"]
  ],
  "atrocity": [
    ["Each scene resets once visitors leave; new atrocities in the world add scenes faster than any can be purged by justice done in the flesh", "Umbra: The Velvet Shadow pdf 53-54 / p. 52-53"],
    ["The realm reads each visitor and picks scenes for that visitor's weak points, ending with the visitor's own deed if there is one", "Umbra: The Velvet Shadow pdf 54 / p. 53"]
  ],
  "battleground": [
    ["The list of battles and which road they are on change each visit; high-Rage visitors often find their own past fights listed", "Umbra: The Velvet Shadow pdf 56 / p. 55"],
    ["The fields round the Plain of the Apocalypse were quiet until lately; now the three armies fight there and spill onto the roads", "Umbra: The Velvet Shadow pdf 58 / p. 57"]
  ],
  "cyberrealm": [
    ["Young realm that surged in the Industrial Revolution with the Scar; it keeps building shiny new structures over obsolete junk", "Umbra: The Velvet Shadow pdf 59 / p. 58"],
    ["Glass Walkers once had free run of Uptown; that is no longer so", "Umbra: The Velvet Shadow pdf 60 / p. 59"]
  ],
  "dream-zone": [
    ["Shaped by every dream since the first breathing creature; reshapes to whoever dreams it", "Umbra: The Velvet Shadow pdf 43 / p. 42"]
  ],
  "erebus": [
    ["A Black Spiral Dancer has been in the lake over a decade and is drifting nearer the shore", "Umbra: The Velvet Shadow pdf 63-64 / p. 62-63"]
  ],
  "flux": [
    ["Time is loose: a day may last weeks, and a traveller can come home before leaving", "Umbra: The Velvet Shadow pdf 65 / p. 64"],
    ["Diminished since ancient times as the Weaver's threads close round it", "Umbra: The Velvet Shadow pdf 65 / p. 64"]
  ],
  "legendary": [
    ["A kingdom blooms when its ruler is crowned and sickens with its ruler", "Umbra: The Velvet Shadow pdf 67, 69 / p. 66, 68"],
    ["Garou defeats in the world let Malfeas in (the Midnight Land); kingdoms fall to Fimbulwinter as heroes' tales are forgotten; Dust and Miasma spread year by year", "Umbra: The Velvet Shadow pdf 68-69 / p. 67-68"]
  ],
  "malfeas": [
    ["The Duchies war and plot without end, so borders shift as Dark Lords take ground and Banes", "Book of the Wyrm (W20) pdf 24 / p. 23"],
    ["Visitors change: grey skin and whispers after a day, lasting taint after three months", "Book of the Wyrm (W20) pdf 24 / p. 23"],
    ["If Number Two died, civil war; if killed in the Room of Mystery, no successor for a century; wrecking the Temple Obscura could seal the Labyrinth", "Book of the Wyrm (W20) pdf 26 / p. 25"]
  ],
  "pangaea": [
    ["Ages of geology pass in hours: savannah becomes desert or mountains overnight; quakes and eruptions remake the land", "Umbra: The Velvet Shadow pdf 70 / p. 69"],
    ["The Zarak-Ur have lately taken to fire raids that may burn wide tracts of the realm", "Umbra: The Velvet Shadow pdf 72 / p. 71"]
  ],
  "scar": [
    ["By era: seen as a limestone quarry, then a plantation, then a coal-mining town, then the chemical city of the Industrial Revolution (some date its start to Rome's aqueducts)", "Umbra: The Velvet Shadow pdf 73 / p. 72"],
    ["In the last decade old barons fled to the CyberRealm and came back to find their holdings gone; much of the Scar is now a subsidiary of CyberRealm start-ups, and conditions worsen daily", "Umbra: The Velvet Shadow pdf 75 / p. 74"]
  ],
  "summer-country": [
    ["Endless spring and gentle warm rain; the dead wake whole at the next dawn", "Umbra: The Velvet Shadow pdf 76-77 / p. 75-76"],
    ["Untouched by the Wyrm so far; its folk split between sealing it off and opening its gates to refugees", "Umbra: The Velvet Shadow pdf 77-78 / p. 76-77"]
  ],
  "wolfhome": [
  ],
  "umbral-abyss": [
    ["The Abyss eats its own structure, so more cracks and caves open toward the Near Umbra in its depths over time", "Umbra: The Velvet Shadow pdf 45 / p. 44"],
    ["Arrival is often unnoticed, for the lost and for those who fall from a Moon Bridge", "Umbra: The Velvet Shadow pdf 45 / p. 44"]
  ],
  "horizon-realm": [
    ["Grew in the Inquisition; Earth-like seasons with hard storms in the rainy spring and deep winter", "Horizon: Stronghold of Hope pdf 54 / p. 53"],
    ["A recent quake opened a vast rift in southern Posht between the Virtual Adepts' and Sons of Ether's slices, linked to the sigil on the Council's Tenth Seat (1990s)", "Horizon: Stronghold of Hope pdf 56 / p. 55"],
    ["The Syndicate's grip on US national parks has cut much of Horizon's Quintessence (1990s)", "Horizon: Stronghold of Hope pdf 54 / p. 53"]
  ],
  "shade-realm": [
    ["Since the Avatar Storm the Shade Realm portals have become treacherous, far or misleading, reshaped by the Umbral winds; strong spirits are needed to find them", "The Infinite Tapestry pdf 118 / p. 117"],
    ["Its look bends to the traveller's expectations (pulp Barsoom for an Etherite, barren rock for a Technocrat)", "The Infinite Tapestry pdf 119 / p. 118"]
  ],
  "shard-realm": [
    ["Realms planted by colonists fade when their people lose touch with Earth, leaving fragments", "The Infinite Tapestry pdf 120 / p. 119"],
    ["Doissetep fell in the Conflagration, was looted in the War in Ruins until the Avatar Storm (1998-99); now quiet storms over the ruins", "Tradition Book: Order of Hermes (Revised) pdf 35 / p. 33"],
    ["Mus chantry sacked in 1995", "The Infinite Tapestry pdf 121 / p. 120"]
  ],
  "paradox-realm": [
    ["A Paradox Realm reshapes to suit the Effect that went wrong", "Masters of the Art pdf 50 / p. 49"],
    ["A Steading whose Node is lost slowly reverts to featureless Umbral matter", "Masters of the Art pdf 49 / p. 48"]
  ],
  "deep-umbra": [
    ["Realms form as need arises and fade after; the same Anchorhead never leads to the same place twice; only Celestine realms stay fixed", "Umbra: The Velvet Shadow pdf 104, 107 / p. 103, 106"],
    ["Time stretches, slows or runs back; a week outside may be a moment inside", "Umbra: The Velvet Shadow pdf 104-105 / p. 103-104"],
    ["Since 2006 Pluto's Celestine has declined and Meros left the post (story seed)", "Umbra: The Velvet Shadow pdf 108 / p. 107"],
    ["Since the Reckoning (late 1990s) old portals closed, Horizon Realms drift loose from Earth, and three moons in the spirit worlds Disembodies a mage", "The Infinite Tapestry pdf 11-13 / p. 10-12"]
  ],
  "digital-web": [
    ["Born from the Batini's Mount Qaf after the Technocracy broke it; grows as people format new web, even Sleepers by accident; the Web seems to be waking up", "Digital Web pdf 12-13, 34 / p. 11-12, 33"],
    ["Paradox causes whiteouts that crash a sector for a turn to a month or more", "Digital Web pdf 38 / p. 37"]
  ],
  "autochthonia": [
    ["1895 the great engine moved there; 1897 it 'woke' (really an ancient spirit of the realm possessed it); its old servants died in a cataclysm ages ago", "Technocracy: Iteration X (Revised) pdf 68-69 / p. 66-67"],
    ["Since the Dimension Storm (1999) cut off from Earth; the Computer is rebuilding it as its own world, strengthening its walls and thinking of closing it entirely", "Technocracy: Iteration X (Revised) pdf 69-70 / p. 67-68"]
  ],
  "tempest": [
    ["Once a placid sea crossed by Ferrymen; the Second Great Maelstrom made the Sunless Sea wild; the Third filled the Darkness with storm", "The Sea of Shadows pdf 20, 24 / p. 19, 23"],
    ["In a Maelstrom byways are cut or blocked and the Shadowlands can scarcely be reached; the open sea is safest", "The Sea of Shadows pdf 22-23 / p. 21-22"],
    ["The Sunless Sea has two tides a day, which Stygia's water clocks count", "The Sea of Shadows pdf 24 / p. 23"]
  ],
  "stygia": [
    ["From outpost to Republic in step with Rome (the Golden Age), then Empire under Charon; Equitaes created to patrol the roads against Renegades", "Wraith 20th pdf 95-96"],
    ["Each Great Maelstrom wrecked it in turn; the Fourth (the First World War's flood of dead) sent Deathlords into their Citadels; in 1945 Charon vanished fighting Gorool", "Wraith 20th pdf 86, 97, 104-105"],
    ["In the Fifth Great Maelstrom (the 1940s, ending with Charon's fall in 1945) the Labyrinth shook loose and Citadels became besieged islands", "Wraith 20th pdf 105"]
  ],
  "labyrinth": [
    ["Harrowings shape its stuff into nightmare scenes fitted to each wraith", "The Sea of Shadows pdf 29 / p. 28"]
  ],
  "far-shores": [
    ["The crowds of waiting souls are growing", "The Sea of Shadows pdf 30 / p. 29"]
  ],
  "dark-kingdom": [
    ["Ivory is now overcrowded and breaking down as war, famine and AIDS fill it; its Maelstroms come as locust clouds (1990s)", "The Sea of Shadows pdf 31 / p. 30"],
    ["In the Great War era the dead of Jade, the Bush of Ghosts and India all mixed in the fighting; travellers braved the Fourth Great Maelstrom to get home", "Wraith: The Great War pdf 15-16"]
  ],
  "enoch": [
    ["Before the Flood: Ubar, a river-delta city of incense, is taken by a stranger king and darkened over centuries into Enoch; it falls with its gods and comes to rest in the Underworld. Whether the Ghemal palace came only after the Flood is argued", "The Black Hand: A Guide to the Tal'Mahe'Ra pdf 120, 122 / p. 119, 121"],
    ["Dark Ages: the Idran and Nagaraja learn to pull dead cities and landmarks into Enoch; they keep doing it, more quietly, in modern nights", "The Black Hand: A Guide to the Tal'Mahe'Ra pdf 121-122 / p. 120-121"],
    ["Time of the Inquisition: a host of Spectres and Doomshades from the Tempest takes Enoch in a terrible Maelstrom; the Del'Roh and the strongest flee to Earth for centuries", "Dirty Secrets of the Black Hand pdf 91 / p. 92"],
    ["Before the 17th century the Tempest was the calmer Sea of Shadows; afterwards it storms (date fits the Wraith Maelstrom timeline)", "The Black Hand: A Guide to the Tal'Mahe'Ra pdf 120-121 / p. 119-120"],
    ["After the Eastern and Western Hands reunite, the first force sent back finds Enoch empty with signs of battle; the walls are rebuilt and the city restored. The scars of ghost-cannon and pyre-fire remain", "Dirty Secrets of the Black Hand pdf 91-92 / p. 92-93; The Black Hand: A Guide to the Tal'Mahe'Ra pdf 123 / p. 122"],
    ["20th century: Hand members Embraced then name the ghost-stars the Doomsday Clock", "The Black Hand: A Guide to the Tal'Mahe'Ra pdf 121 / p. 120"]
  ],
  "far-dreaming": [
    ["After the Shattering (about 600 years before the Resurgence) the deeper Dreaming is out of reach; Renaissance Glamour starts to steady the roads, and by the mid-19th century a few Far and Deep trods reopen into new realms born of the Industrial Revolution and its novels", "Changeling: The Dreaming 20th pdf 301 / p. 300; pdf 308 / p. 307"],
    ["1969 Resurgence: all three layers can be explored again; before it the Vale of Mists was one of the few stable places", "Changeling: The Dreaming 20th pdf 307-308 / p. 306-307"],
    ["2001 Evanescence: one of the fourteen gates collapses and vanishes; dark fae and monstrous chimera attack along trods afterwards", "Changeling: The Dreaming 20th pdf 307, 309 / p. 306, 308"]
  ],
  "deep-dreaming": [
    ["In ancient days it was the outer realm of Arcadia; the Shattering turned it into the turmoil it is now", "Changeling: The Dreaming 20th pdf 307 / p. 306"],
    ["Reopened by trods from the mid-19th century and fully after the 1969 Resurgence", "Changeling: The Dreaming 20th pdf 308 / p. 307"]
  ],
  "yomi": [
    ["August 1945: the atomic bombs send souls straight to Yomi and the Yama King Pika Don enters the Yin World", "The Thousand Hells pdf 15-16"],
    ["12 May 1998: India's first nuclear test is marked as a Yomi event", "The Thousand Hells pdf 50"],
    ["Ravana's palace in Lanka, burned long ago, is being rebuilt in the present", "The Thousand Hells pdf 28-29"]
  ],
  "yellow-springs": [
    ["1914-1918: Jade souls are caught up in the Great War of the dead", "Wraith: The Great War pdf 15"],
    ["August 1945: the Hiroshima and Nagasaki Maelstrom wrecks the Imperial Highway and most Imperial buildings, including Xi'an; rebellions grow", "Dark Kingdom of Jade pdf 45"],
    ["After 1945: Japan breaks away; Mongolia, Tibet and Southeast Asia (all but Bangkok) are retaken soon, Korea only after the Korean War", "Dark Kingdom of Jade pdf 46"],
    ["From 1949: dead Communists form Communist families that take magistracies in the great cities; Yu Huang declares a Thousand Years of Peace", "Dark Kingdom of Jade pdf 47-48"],
    ["1997: Hong Kong returns to China and the Stygian outpost's future is in doubt", "World of Darkness: Hong Kong pdf 33"]
  ],
  "duat": [
    ["Ancient times: Osiris rules Neter-khertet for a century, then leads the exodus that finds Amenti", "Mummy (Second Edition) pdf 110-111"],
    ["Hyksos, Persian and Greek eras: foreign wraiths try to take the Egyptian Shadowlands and are driven out", "Mummy (Second Edition) pdf 111"],
    ["Later: Stygia takes Neter-khertet and Egypt becomes a Stygian outpost; with the old funeral rites gone, Amenti fades to a near ruin", "Mummy (Second Edition) pdf 111-112"]
  ],
  "demon-abyss": [
    ["Ancient times: after the war in Heaven the rebels are sealed in the Abyss; Lucifer is not among them", "Demon: The Fallen pdf 58, 62 (printed 57, 61)"],
    ["Over millennia: summonings by human magi grow, then dwindle as the old secrets are lost", "Demon: The Fallen pdf 66 (printed 65)"],
    ["Five great storms batter the seals; the fifth opens cracks wide enough for the lesser fallen, and the princes send them out (the modern era)", "Demon: The Fallen pdf 66-67 (printed 65-66)"]
  ],
};
