/**
 * Realm maps (WoDX Otherworlds 0.8.0), the pure part. Every kind of realm past the near worlds (the Penumbra, the
 * Shadowlands, the Near Dreaming) gets a map of its own, drawn from a seed: the Umbral Realms, the Deep Umbra and the
 * realms past the Horizon, the Underworld's Tempest, Labyrinth and Dark Kingdoms, the deeper Dreaming, Yomi, Duat and
 * the Abyss. Each realm has a shape (seven layouts below), colours, named landmarks and hazards, the ways in, and
 * what changes from era to era, 1197 to the World of Future Darkness. The map is a grid of cells; walls follow the
 * edges of solid ground, and an edge over the void or deep water stops movement but not sight.
 *
 * generate() gives the model (cells, walls, regions, labels); svg() draws it, top-down and at night. No Foundry here.
 */
import {stream, between, pick, shuffled} from "../../wodx-chronicle/scripts/gen-core.mjs";

export const VERSION = 1;
/** Cell kinds. Walkable: ground, path, growth, hazard, shallow. */
export const T = {void: 0, ground: 1, path: 2, solid: 3, water: 4, hazard: 5, growth: 6, shallow: 7};
const WALK = new Set([T.ground, T.path, T.hazard, T.growth, T.shallow]);
export const walkable = t => WALK.has(t);
/** Foundry's wall settings, as numbers (0 none, 20 normal), so the rules need no Foundry. */
export const WALL = {solid: {move: 20, sight: 20, light: 20, sound: 20}, edge: {move: 20, sight: 0, light: 0, sound: 0}};

export const SIZES = {small: {cols: 30, rows: 22}, medium: {cols: 40, rows: 30}, large: {cols: 56, rows: 40}};

/** The seven layouts. */
export const SHAPES = {
  wilds: "Open land: hills, water, growth, paths between landmarks",
  maze: "A maze of passages and chambers cut through solid dark",
  city: "A web-shaped city: rings and spokes round a heart, blocks between",
  islands: "Islands in a void or a storm sea, joined by narrow ways",
  trenches: "A field of war: trench lines, craters, two roads from the start",
  grid: "Square sectors in the dark, joined by straight lines of light",
  spiral: "Rings descending to a pit at the centre, each ring's gate offset from the last"
};

const P = (ground, path, solid, water, hazard, growth, glow, voidC, ink = "#e8e2d0") => ({ground, path, solid, water, hazard, growth, glow, void: voidC, ink});

/**
 * The realm catalogue. eras: spans in year order, the first whose `to` is at or after the year applies (no `to` means
 * to the end). mods change the map: ruin (share of blocks broken), blight (Wyrm rot), web (Weaver webbing), frost
 * (the Endless Winter), dense (more of everything), closed (no way in that year, the map is still drawn). Notes in
 * the eras are house rules unless a page is given.
 */
export const REALMS = {
  // ---------------------------------------------------------------- Werewolf: the Umbral Realms of the Near Umbra
  aetherial: {label: "The Aetherial Realm", line: "werewolf", world: "umbra", shape: "islands", palette: P("#28304a", "#c9d4ff", "#141a30", "#0a0e1c", "#7a5a9a", "#3c4a78", "#e8eeff", "#05070f"),
    landmarks: ["Phoebe's light", "a star spirit's perch", "the Wyrm Reaches' edge", "an observatory of the Stargazers"], hazards: ["Wyrm Reaches rot", "a falling star"],
    ways: ["A Moon Path or Moon Bridge upward", "Gifts and rites that reach the sky (Storyteller's call)"], refs: ["Rage Across the Heavens pdf 25 / p. 24", "Book of the Wyrm (W20) pdf 23 / p. 22"],
    eras: [{note: "Phoebe fills half the sky; the Wyrm Reaches lie above Malfeas."}]},
  "arcadia-gateway": {label: "Arcadia Gateway", line: "werewolf", world: "umbra", shape: "wilds", palette: P("#1f3324", "#e6d9a0", "#0f1c12", "#203a50", "#6a3a6a", "#2f5a3a", "#ffe9b0", "#050a07"),
    landmarks: ["a fae palace, empty", "a door with no house", "the silver road", "a ring of standing stones"], hazards: ["a glamour that turns the way round"],
    ways: ["A Moon Path from a Glen", "A trod, for changelings"], refs: ["Umbra: The Velvet Shadow pdf 50 / p. 49"],
    eras: [{to: 1348, note: "Fae still walk here openly.", mods: {dense: 1}}, {to: 1968, note: "Since the Shattering the fae who lived here are gone; the palaces stand empty (house rule).", mods: {ruin: 0.3}}, {note: "Some fae have come back since 1969 (house rule)."}]},
  atrocity: {label: "The Atrocity Realm", line: "werewolf", world: "umbra", shape: "maze", palette: P("#2a1a1a", "#7a5a50", "#120a0a", "#2a1010", "#a02a20", "#3a2420", "#ff6040", "#050202"),
    landmarks: ["the gibbet trees", "a replayed massacre", "a prison yard", "the gate to the Hellbringer's domain"], hazards: ["a replayed horror", "a Bane drawn by cruelty"],
    ways: ["Following signs of cruelty from the Penumbra"], refs: ["Umbra: The Velvet Shadow pdf 53 / p. 52", "Book of the Wyrm (W20) pdf 23 / p. 22"],
    eras: [{to: 1500, note: "The horrors replayed are those of the age so far: sieges, crusades, burnings (house rule)."}, {to: 1914, note: "The replays now hold the Thirty Years War, the slave ships and the colonies' massacres (house rule).", mods: {dense: 1}}, {to: 2025, note: "The twentieth century's camps and wars fill new wings (house rule).", mods: {dense: 2}}, {note: "In the World of Future Darkness the realm keeps growing with every corporate war (house rule).", mods: {dense: 2, blight: 0.2}}]},
  battleground: {label: "The Battleground", line: "werewolf", world: "umbra", shape: "trenches", palette: P("#3a3428", "#b0a080", "#1a1812", "#2a3038", "#8a3020", "#4a4430", "#ffd080", "#080806"),
    landmarks: ["the Signpost", "an abandoned camp", "a war spirit's banner", "the far hill"], hazards: ["a battle in full cry", "a crater field"],
    ways: ["Following signs of war and bloodshed from the Penumbra"], refs: ["Umbra: The Velvet Shadow pdf 56 / p. 55", "Umbra: The Velvet Shadow pdf 40 / p. 39"],
    eras: [{to: 1500, note: "The wars fought here are with swords, bows and siege engines; the Signpost is wooden (house rule)."}, {to: 1913, note: "Pike, musket and cannon; the Signpost is a milestone (house rule)."}, {to: 2025, note: "Trenches, wire and armour; the Signpost is a road sign (house rule).", mods: {dense: 1}}, {note: "Drones and powered armour; the Signpost is a touch screen (house rule).", mods: {dense: 2}}]},
  cyberrealm: {label: "The CyberRealm", line: "werewolf", world: "umbra", shape: "city", palette: P("#1a2430", "#6ad0ff", "#0e141c", "#0a1a24", "#40ffa0", "#203040", "#a0f0ff", "#030508"),
    landmarks: ["a tower of glass", "a Pattern Spider nest", "the road to the Scar", "a Glass Walker refuge"], hazards: ["Pattern Spiders", "a Net-spider's web"],
    ways: ["Following webs of the Weaver from a city's Penumbra"], refs: ["Umbra: The Velvet Shadow pdf 59 / p. 58", "Book of the Weaver pdf 33 / p. 32"],
    eras: [{to: 1700, note: "Before the machine age the realm is a small walled city of stone and clockwork (house rule).", mods: {small: 1}}, {to: 1899, note: "Mills and railways: brick and iron towers (house rule)."}, {to: 2025, note: "One huge web-shaped city of glass, plastic and concrete.", mods: {dense: 1, web: 0.3}}, {note: "In the World of Future Darkness the city has swallowed most of the realm (house rule).", mods: {dense: 2, web: 0.5}}]},
  "dream-zone": {label: "The Dream Zone", line: "werewolf", world: "umbra", shape: "islands", palette: P("#2a2440", "#f0c8ff", "#1a1430", "#1a2048", "#a04080", "#403a60", "#ffd8ff", "#06040c"),
    landmarks: ["a childhood house", "a falling staircase", "a school that is also a sea", "a door from a dream"], hazards: ["a nightmare given body"],
    ways: ["Only through dreams; the old Spirit Gates are lost"], refs: ["Umbra: The Velvet Shadow pdf 43 / p. 42"],
    eras: [{note: "Built from shared dreams, so its islands look like the dreams of the age."}]},
  erebus: {label: "Erebus", line: "werewolf", world: "umbra", shape: "maze", palette: P("#2a1e18", "#d8d8e8", "#140c08", "#c8c8e0", "#ff7030", "#3a2a20", "#f0f0ff", "#060302"),
    landmarks: ["a river of molten silver", "the Crucible", "a chamber of atonement"], hazards: ["molten silver", "a purifying fire"],
    ways: ["Drawn there by guilt nothing else can clear"], refs: ["Umbra: The Velvet Shadow pdf 62 / p. 61"],
    eras: [{note: "Gaia's wrath and the Garou Nation's purgatory, in every age."}]},
  flux: {label: "The Flux Realm", line: "werewolf", world: "umbra", shape: "islands", palette: P("#302a20", "#ffb060", "#181410", "#203040", "#c040c0", "#3a4a2a", "#ffe0a0", "#0a0806"),
    landmarks: ["a shape that will not stay", "a Wyld well", "a road that unmakes itself"], hazards: ["the ground changing underfoot"],
    ways: ["An airt into the Wyld (book check queued)"], refs: ["W20 core (book check queued)"],
    eras: [{note: "Pure change: draw it again with a new seed every visit (house rule)."}]},
  legendary: {label: "The Legendary Realm", line: "werewolf", world: "umbra", shape: "wilds", palette: P("#2a3020", "#e0c890", "#141810", "#203048", "#702a2a", "#3a4a28", "#ffe8a0", "#060804"),
    landmarks: ["a hero's barrow", "the hall of past glories", "a battlefield of legend", "a crack where Malfeas leaks"], hazards: ["a shard of Malfeas"],
    ways: ["A Moon Path, or a tale told at a moot (Storyteller's call)"], refs: ["Umbra: The Velvet Shadow pdf 68 / p. 67"],
    eras: [{to: 1500, note: "Bright with tales of the Impergium's end and the old wars (house rule)."}, {to: 1950, note: "The tales darken as the Garou lose ground (house rule).", mods: {blight: 0.1}}, {to: 2025, note: "With the Apocalypse near, Wyrm victories let a shard of Malfeas leak through.", mods: {blight: 0.25}}, {note: "In the World of Future Darkness the realm is half dark (house rule).", mods: {blight: 0.4}}]},
  malfeas: {label: "Malfeas", line: "werewolf", world: "umbra", shape: "spiral", palette: P("#2a2018", "#a08040", "#140c06", "#3a3010", "#80ff20", "#3a2a10", "#c0ff40", "#040200"),
    landmarks: ["the Black Spiral's pit", "a Maeljin's court", "the Last Junction's far station", "Ananasa's opal"], hazards: ["acid fog", "Banes in thousands"],
    ways: ["The black train from the Scar", "The caverns at the Abyss's edge", "A Moon Bridge sold by Banes in the Wyrm Reaches"], refs: ["Book of the Wyrm (W20) pdf 23 / p. 22", "Book of the Wyrm (W20) pdf 15 / p. 14"],
    eras: [{to: 1800, note: "Pits, fumes and the Maeljin's courts (house rule)."}, {note: "Factories and pipelines join the pits as industry grows (house rule).", mods: {dense: 1}}]},
  pangaea: {label: "Pangaea", line: "werewolf", world: "umbra", shape: "wilds", palette: P("#24341c", "#d8c890", "#121a0e", "#1a3a48", "#8a4020", "#2e5a22", "#f0ffb0", "#060a04"),
    landmarks: ["a sauropod's trail", "the troglodyte caves", "a healing spring", "a Moon Bridge's end"], hazards: ["a Bane waiting at the entrance", "a great beast"],
    ways: ["A Moon Bridge (dangerous)", "A powerful Glen that opens straight onto it"], refs: ["Umbra: The Velvet Shadow pdf 71 / p. 70", "Umbra: The Velvet Shadow pdf 73 / p. 72"],
    eras: [{note: "The primordial world, the same in every age."}]},
  scar: {label: "The Scar", line: "werewolf", world: "umbra", shape: "city", palette: P("#2a2622", "#a09080", "#14120e", "#2a2418", "#c06020", "#302a20", "#ffb060", "#060504"),
    landmarks: ["the Last Junction", "a slag mountain", "a sweatshop of spirits", "the road from the CyberRealm"], hazards: ["smog", "the black train's guards"],
    ways: ["Routes from the CyberRealm", "Following industrial ruin from the Penumbra"], refs: ["Book of the Wyrm (W20) pdf 23 / p. 22", "Umbra: The Velvet Shadow pdf 59 / p. 58"],
    eras: [{to: 1750, note: "A few smoking forges and mine heads (house rule).", mods: {small: 1}}, {to: 2025, note: "Rust, smog and the Last Junction."}, {note: "In the World of Future Darkness it reaches the horizon (house rule).", mods: {dense: 2}}]},
  "summer-country": {label: "Summer Country", line: "werewolf", world: "umbra", shape: "wilds", palette: P("#2a3a1c", "#f0e0a0", "#16200e", "#2a4a40", "#9a5020", "#3a7a2a", "#ffffb0", "#080c04"),
    landmarks: ["the Garden of Delight", "a swamp nursery", "a new creature's first den"], hazards: ["fierce competition"],
    ways: ["A Moon Path (book check queued)"], refs: ["Umbra: The Velvet Shadow pdf 77 / p. 76"],
    eras: [{note: "Life arises unbidden here in every age."}]},
  wolfhome: {label: "Wolfhome", line: "werewolf", world: "umbra", shape: "wilds", palette: P("#28301e", "#d0c0a0", "#141810", "#203848", "#6a4030", "#34502a", "#f0e8c0", "#060804"),
    landmarks: ["the Town", "a farm", "a hidden laboratory", "the Countryside's wood"], hazards: ["a Fera hunted near the Town"],
    ways: ["A Moon Path (book check queued)"], refs: ["Umbra: The Velvet Shadow pdf 79 / p. 78"],
    eras: [{to: 1800, note: "Mostly countryside, with a market town (house rule)."}, {to: 2025, note: "A blend of rustic countryside and generic suburbia.", mods: {dense: 1}}, {note: "Suburbs and laboratories spread (house rule).", mods: {dense: 2, web: 0.2}}]},
  "umbral-abyss": {label: "The Abyss (Umbral)", line: "werewolf", world: "umbra", shape: "islands", palette: P("#1a1a1e", "#808090", "#0a0a0e", "#000000", "#5a2a6a", "#202028", "#b0b0d0", "#000000"),
    landmarks: ["a ledge over nothing", "Black Spiral runes", "a lost human's camp"], hazards: ["the fall", "a spirit forced to Slumber"],
    ways: ["Lost or thrown there; few go on purpose"], refs: ["Umbra: The Velvet Shadow pdf 47 / p. 46", "Book of the Wyrm (W20) pdf 23 / p. 22"],
    eras: [{note: "Spirits here must take bodies and can be hurt as flesh is."}]},

  // ---------------------------------------------------------------- Mage: past the Membrane and the Horizon
  "horizon-realm": {label: "A Horizon Realm", line: "mage", world: "deep", shape: "islands", palette: P("#24283a", "#e0d0a0", "#121420", "#1a2440", "#7a4a90", "#344060", "#fff0c0", "#04050c"),
    landmarks: ["the Chantry house", "a library tower", "the portal", "a garden of the Spheres"], hazards: ["a ward against spirits"],
    ways: ["A portal from a Node or Chantry", "Spirit 4 or more (book check queued)"], refs: ["Horizon: Stronghold of Hope pdf 55 / p. 54"],
    eras: [{to: 1998, note: "Open to mages who know the portal."}, {to: 2025, note: "Since the Avatar Storm, every crossing of Earth's Gauntlet tears at a mage.", mods: {ruin: 0.2}}, {note: "In the World of Future Darkness few Horizon Realms still answer (house rule).", mods: {ruin: 0.4}}]},
  "shade-realm": {label: "A Shade Realm", line: "mage", world: "deep", shape: "islands", palette: P("#2a2430", "#d8b0e0", "#141018", "#201830", "#a04060", "#3a3048", "#ffd0f0", "#06040a"),
    landmarks: ["the planet's shadow", "an overlap zone", "the way to the Shard"], hazards: ["a misleading portal"],
    ways: ["Spirit magic past the Horizon"], refs: ["Beyond the Barriers: The Book of Worlds pdf 21 / p. 20", "The Infinite Tapestry pdf 118 / p. 117"],
    eras: [{to: 1998, note: "Each Shard's shadow on the Horizon, the way on to the Shard."}, {note: "Since the Storm the portals on to the Shards are treacherous.", mods: {ruin: 0.2}}]},
  "shard-realm": {label: "A Shard Realm", line: "mage", world: "deep", shape: "wilds", palette: P("#302418", "#ffd080", "#181008", "#1a2a40", "#ff6020", "#4a3a20", "#ffffa0", "#080400"),
    landmarks: ["the Sphere's heart", "a ruined Chantry", "a wrecked Umbral ship", "a glassy scar"], hazards: ["raw magic of the ruling Sphere"],
    ways: ["Spirit 5 to cross the First Horizon (The Infinite Tapestry pdf 110 / p. 109)"], refs: ["The Infinite Tapestry pdf 118 / p. 117", "Tradition Book: Order of Hermes (Revised) pdf 35 / p. 33"],
    eras: [{to: 1998, note: "A body of the solar system, ruled by one Sphere."}, {note: "Since the Storm the way in is treacherous; Doissetep lies in ruins in the Realm of Forces.", mods: {ruin: 0.3}}]},
  "paradox-realm": {label: "A Paradox Realm", line: "mage", world: "deep", shape: "maze", palette: P("#2a2a2a", "#ffffff", "#101010", "#202030", "#ff40ff", "#3a3a3a", "#ffffff", "#000000"),
    landmarks: ["the riddle's heart", "the way out, if solved"], hazards: ["the Effect turned back"],
    ways: ["Thrown there by Paradox"], refs: ["Masters of the Art pdf 50 / p. 49"],
    eras: [{note: "A new bubble each time: draw it with a new seed (house rule)."}]},
  "deep-umbra": {label: "The Deep Umbra", line: "mage", world: "deep", shape: "islands", palette: P("#1a1c28", "#a0b0ff", "#0a0c14", "#000000", "#6020a0", "#202438", "#c0d0ff", "#000004"),
    landmarks: ["a drifting rock", "a Nephandi Labyrinth", "an ethership's wreck", "a star in its body"], hazards: ["the Void", "time that runs strangely"],
    ways: ["Past the Membrane (werewolves) or the Far Horizon (mages)"], refs: ["Umbra: The Velvet Shadow pdf 93 / p. 92", "Umbra: The Velvet Shadow pdf 105 / p. 104", "The Infinite Tapestry pdf 12 / p. 11"],
    eras: [{to: 1998, note: "Etherspace, the Deep Umbra or the Void: alien and vast."}, {note: "The Avatar Storm rages between Earth and here.", mods: {blight: 0.1}}]},
  "digital-web": {label: "The Digital Web", line: "mage", world: "net", shape: "grid", palette: P("#0c1a14", "#40ffa0", "#06100a", "#001008", "#ff4040", "#103020", "#a0ffd0", "#000402"),
    landmarks: ["a private sector", "a data highway", "a restricted Technocracy zone", "a Virtual Adept chantry"], hazards: ["a killer program", "a restricted sector"],
    ways: ["Jacking in through a computer"], refs: ["Digital Web pdf 12 / p. 11", "Digital Web pdf 35 / p. 34"],
    eras: [{to: 1989, note: "No Net yet: the Digital Web is not open in this year.", mods: {closed: 1, small: 1}}, {to: 2025, note: "Strands of unformed Pattern, shaped by mages into sectors.", mods: {dense: 1}}, {note: "In the World of Future Darkness the Net is everywhere and its Penumbra is the Umbra's last warm place (house rule).", mods: {dense: 2}}]},
  autochthonia: {label: "Autochthonia", line: "mage", world: "deep", shape: "grid", palette: P("#202428", "#ffa040", "#0c0e10", "#101418", "#ff2020", "#283038", "#ffd0a0", "#030304"),
    landmarks: ["the great computer", "a machine-spirit's hall", "the sealed way to Earth"], hazards: ["a guardian engine"],
    ways: ["Iteration X's sealed routes only"], refs: ["Technocracy: Iteration X (Revised) p. 67 (pdf page check queued)", "Digital Web pdf 35 / p. 34"],
    eras: [{to: 1894, note: "Not yet found by the Convention (house rule): the map is drawn but no way leads in.", mods: {closed: 1}}, {note: "The ordered machine world, home of the great computer since 1895."}]},

  // ---------------------------------------------------------------- Wraith: the Dark Umbra past the Shadowlands
  tempest: {label: "The Tempest", line: "wraith", world: "underworld", shape: "islands", palette: P("#1a2228", "#a0b0b8", "#0c1014", "#0a1418", "#5a80a0", "#24303a", "#d0e8ff", "#040608"),
    landmarks: ["a Byway's marker", "the River of Death", "a Ferryman's reed boat", "a relic wreck"], hazards: ["the Maelstrom", "a Nihil"],
    ways: ["An Anchorhead, then a Byway", "Argos (Wraith 20th)"], refs: ["The Sea of Shadows pdf 20 / p. 19", "The Sea of Shadows pdf 21 / p. 20", "The Sea of Shadows pdf 28 / p. 27"],
    eras: [{note: "The storm-ocean between the realms of the dead; ways only where everyone agrees on them."}]},
  stygia: {label: "Stygia", line: "wraith", world: "underworld", shape: "city", palette: P("#1e1e24", "#b0a890", "#0e0e12", "#0c1018", "#8a2a2a", "#2a2a30", "#e0d8b0", "#040406"),
    landmarks: ["the Onyx Tower", "Nhudri's forges", "the harbour of the Sea of Shadows", "a Legion's citadel"], hazards: ["a thrall gang", "the forges' hunger"],
    ways: ["A Byway across the Tempest", "The Midnight Express"], refs: ["Handbook for the Recently Deceased pdf 15 / p. 14", "Wraith 20th pdf 95 / p. 30", "The Hierarchy pdf 14 / p. 13"],
    eras: [{to: 1452, note: "Charon's Stygia, walled against Maelstroms on its islands (house rule for the date).", mods: {dense: 1}}, {to: 1998, note: "The Deathlords rule after Charon (house rule for the date).", mods: {dense: 1}}, {to: 2025, note: "Broken by the Sixth Great Maelstrom: whole quarters lie flooded (house rule).", mods: {ruin: 0.35}}, {note: "In the World of Future Darkness Stygia survives, broken in places.", mods: {ruin: 0.2}}]},
  labyrinth: {label: "The Labyrinth", line: "wraith", world: "underworld", shape: "maze", palette: P("#16121a", "#706878", "#08060a", "#0a0610", "#8020a0", "#201a24", "#c080ff", "#000000"),
    landmarks: ["a Zone", "Industrion's waste shaft", "a Spectre hive", "the way down to the Void"], hazards: ["Spectres", "a Nihil's pull"],
    ways: ["A Nihil from the Tempest", "Enoch's lower gate"], refs: ["Book of Oblivion pdf 70 / p. 69", "Doomslayers: Into the Labyrinth pdf 140 / p. 139"],
    eras: [{note: "Oblivion's maze, worse in the years of a Great Maelstrom."}]},
  "far-shores": {label: "A Far Shore", line: "wraith", world: "underworld", shape: "wilds", palette: P("#243026", "#e0d8b0", "#121812", "#1a2a36", "#6a3a3a", "#345a3a", "#fff0c0", "#060806"),
    landmarks: ["the promised paradise", "a hall of judgement", "the landing"], hazards: ["a paradise that will not let go"],
    ways: ["A long voyage across the Tempest"], refs: ["Wraith 20th (book check queued)"],
    eras: [{to: 1998, note: "Afterlives built to match a faith's hopes (book check queued)."}, {note: "Many shores were wrecked by the Sixth Great Maelstrom (house rule).", mods: {ruin: 0.4}}]},
  "dark-kingdom": {label: "Another Dark Kingdom", line: "wraith", world: "underworld", shape: "city", palette: P("#24201a", "#d0b080", "#120e0a", "#101a20", "#8a4020", "#30281e", "#ffe0a0", "#060504"),
    landmarks: ["the throne of the Kingdom", "a market of the dead", "the shore to the storm"], hazards: ["a foreign wraith's suspicion"],
    ways: ["A long voyage across the Tempest", "The Midnight Express to an outpost"], refs: ["Handbook for the Recently Deceased pdf 15 / p. 14", "Wraith: The Great War pdf 16 / p. 16"],
    eras: [{note: "Each Dark Kingdom keeps its own island in the storm: Jade, Ivory, Obsidian and others."}]},
  enoch: {label: "Enoch", line: "vampire", world: "underworld", shape: "city", palette: P("#1a1618", "#a09080", "#0a0808", "#0c0a10", "#a02020", "#241e20", "#e0c0a0", "#020102"),
    landmarks: ["the five spires", "the bronze gate", "the re-made First City", "the way to the Labyrinth"], hazards: ["enslaved ghost stars", "no fire allowed"],
    ways: ["The Tal'Mahe'Ra's own routes"], refs: ["The Black Hand: A Guide to the Tal'Mahe'Ra pdf 121 / p. 120", "Dirty Secrets of the Black Hand pdf 92 / p. 93"],
    eras: [{note: "In the Tempest, opening straight onto the Labyrinth."}]},

  // ---------------------------------------------------------------- Changeling: past the Near Dreaming
  "far-dreaming": {label: "The Far Dreaming", line: "changeling", world: "dreaming", shape: "wilds", palette: P("#2a2440", "#ffd8a0", "#160f24", "#1a2850", "#a03070", "#3a3a70", "#ffe8ff", "#06040c"),
    landmarks: ["a chimerical castle", "a road of moonlight", "a sea of dreams' shore", "a lost freehold"], hazards: ["a Nightmare", "Bedlam's pull"],
    ways: ["A trod", "A gateway at the right time"], refs: ["Changeling: The Dreaming 20th pdf 29 / p. 28"],
    eras: [{to: 1348, note: "Open and bright (house rule)."}, {to: 1968, note: "Since the Shattering the trods to it are mostly closed (house rule).", mods: {closed: 1, ruin: 0.2}}, {to: 2025, note: "Reopened since the Resurgence of 1969."}, {note: "In the World of Future Darkness Banality floods it and the Endless Winter closes in (house rule).", mods: {frost: 0.5, ruin: 0.3}}]},
  "deep-dreaming": {label: "The Deep Dreaming", line: "changeling", world: "dreaming", shape: "islands", palette: P("#2a2048", "#ffe8b0", "#140c28", "#120c30", "#c040a0", "#40306a", "#fff0ff", "#04020a"),
    landmarks: ["the last gate", "a dream older than people", "a road toward Arcadia"], hazards: ["Bedlam", "losing the way back"],
    ways: ["Only past the Far Dreaming"], refs: ["Changeling: The Dreaming 20th pdf 29 / p. 28", "Changeling: The Dreaming 20th pdf 37 / p. 36"],
    eras: [{to: 1348, note: "Arcadia lies somewhere within (house rule for the openness)."}, {to: 1968, note: "The gates to Arcadia are shut; the sidhe are gone into it.", mods: {closed: 1}}, {to: 2025, note: "The gates opened again in 1969."}, {note: "In the World of Future Darkness the Dreaming is all but gone (house rule).", mods: {frost: 0.7, ruin: 0.4}}]},

  // ---------------------------------------------------------------- Kuei-jin, Mummy, Demon
  yomi: {label: "Yomi, the Thousand Hells", line: "kuei-jin", world: "underworld", shape: "spiral", palette: P("#2a1818", "#d0a070", "#140808", "#200a0a", "#ff3010", "#301a14", "#ffb080", "#060202"),
    landmarks: ["a Yama King's court", "a hell of the wicked", "the gate the Second Breath returns by"], hazards: ["a demon of the court", "endless punishment"],
    ways: ["Every Kuei-jin passed through it before the Second Breath", "A Yomi gate"], refs: ["The Thousand Hells pdf 7 / p. 9"],
    eras: [{note: "The Yama Kings wait here in every age."}]},
  "yellow-springs": {label: "The Yellow Springs", line: "kuei-jin", world: "underworld", shape: "city", palette: P("#2a2418", "#e0c060", "#14100a", "#1a1a10", "#a04020", "#302a18", "#fff0a0", "#060502"),
    landmarks: ["the Jade court", "a magistrate's hall", "the Kowloon station's twin"], hazards: ["loss of face", "a Castigator's notice"],
    ways: ["Death in the Middle Kingdom", "The Midnight Express to Hong Kong"], refs: ["Wraith: The Great War pdf 16 / p. 16", "Necropolis Hong Kong (book check queued)"],
    eras: [{note: "China's Deadlands, under the Jade Emperor."}]},
  duat: {label: "Duat", line: "mummy", world: "underworld", shape: "wilds", palette: P("#2a2418", "#e0c890", "#16120a", "#14283a", "#8a3020", "#3a3420", "#fff0b0", "#060402"),
    landmarks: ["Amenti's hidden fortress", "the hall of judgement", "the river of the dead"], hazards: ["the Devourer's servants"],
    ways: ["A mummy's death: the soul goes there between lives"], refs: ["Mummy (Second Edition) pdf 14 / p. 13", "Mummy (Second Edition) pdf 109 / p. 108"],
    eras: [{note: "The Egyptian Underworld, home of the Restless Dead."}]},
  "demon-abyss": {label: "The Abyss (the Pit)", line: "demon", world: "abyss", shape: "spiral", palette: P("#1c1414", "#c09070", "#0c0606", "#0a0404", "#ff4020", "#241818", "#ffc0a0", "#020000"),
    landmarks: ["a broken gate", "a House's chained elders", "the Creator's wall"], hazards: ["the prison's pull"],
    ways: ["Only by being sent back"], refs: ["Demon: The Fallen pdf 14 / p. 13", "Demon: The Fallen pdf 99 / p. 98"],
    eras: [{to: 1998, note: "Sealed: its gates hold (house rule for the date).", mods: {closed: 1}}, {note: "Its gates are broken and the fallen walk free."}]}
};
export const REALM_ORDER = Object.keys(REALMS);
export const LINES = ["werewolf", "mage", "wraith", "vampire", "changeling", "kuei-jin", "mummy", "demon"];

/** What holds for a realm in a year. future: the World of Future Darkness branch is on. */
export function realmEra(id, year, {future = false} = {}) {
  const R = REALMS[id];
  if ( !R ) return null;
  const y = Number.isFinite(Number(year)) ? Number(year) : 1999;
  const spans = R.eras ?? [{note: ""}];
  let span = spans.find(s => s.to === undefined || y <= s.to) ?? spans[spans.length - 1];
  // A span past 2025 is the World of Future Darkness's: on the classic timeline, keep the last span before it
  if ( !future && y > 2025 && span === spans[spans.length - 1] && spans.length > 1 && spans[spans.length - 2].to === 2025 ) span = spans[spans.length - 2];
  const mods = {...(span.mods ?? {})};
  const notes = [span.note].filter(Boolean);
  if ( R.world === "deep" && y >= 1999 ) notes.push("The Avatar Storm: every mage crossing Earth's Gauntlet risks it.");
  if ( R.world === "underworld" ) {
    const g = [[1347, 1352, "the Second"], [1600, 1601, "the Third"], [1916, 1918, "the Fourth"], [1945, 1945, "the Fifth"], [1999, 2000, "the Sixth"]].find(([a, b]) => y >= a && y <= b);
    if ( g ) { notes.push(`${g[2]} Great Maelstrom rages this year: more hazards.`); mods.storm = 1; }
  }
  if ( future && y >= 2090 && ["umbra", "dreaming"].includes(R.world) ) { mods.frost = Math.max(mods.frost ?? 0, 0.6); notes.push("The Endless Winter has frozen this part of the Otherworld (house rule)."); }
  return {year: y, notes, mods, closed: !!mods.closed};
}

/* ------------------------------------------------------------------ helpers */
function grid(cols, rows, fill) { return Array.from({length: rows}, () => new Array(cols).fill(fill)); }
const inB = (m, x, y) => y >= 0 && y < m.length && x >= 0 && x < m[0].length;

/** Smooth value noise in [0,1], seeded. */
function noise(rand, cols, rows, scale = 6) {
  const gw = Math.ceil(cols / scale) + 2, gh = Math.ceil(rows / scale) + 2;
  const g = Array.from({length: gh}, () => Array.from({length: gw}, () => rand()));
  const s = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy), tx = s(fx - ix), ty = s(fy - iy);
    const a = g[iy][ix], b = g[iy][ix + 1], c = g[iy + 1][ix], d = g[iy + 1][ix + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

/** Carve a straight-ish path between two cells (L-shaped with a seeded bend), width w. */
function carve(m, a, b, kind, rand, w = 1, keep = null) {
  let {x, y} = a;
  const set = (cx, cy) => {
    for ( let dy = 0; dy < w; dy++ ) for ( let dx = 0; dx < w; dx++ ) {
      const X = cx + dx, Y = cy + dy;
      if ( inB(m, X, Y) && !(keep && keep.has(m[Y][X])) ) m[Y][X] = kind;
    }
  };
  set(x, y);
  while ( x !== b.x || y !== b.y ) {
    const goX = x !== b.x && (y === b.y || rand() < 0.5);
    if ( goX ) x += Math.sign(b.x - x); else y += Math.sign(b.y - y);
    set(x, y);
  }
}

/** Every walkable cell reachable from a start. */
export function reach(m, start) {
  const seen = new Set();
  if ( !start || !inB(m, start.x, start.y) || !walkable(m[start.y][start.x]) ) return seen;
  const q = [[start.x, start.y]];
  seen.add(`${start.x},${start.y}`);
  while ( q.length ) {
    const [x, y] = q.pop();
    for ( const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] ) {
      const X = x + dx, Y = y + dy, k = `${X},${Y}`;
      if ( inB(m, X, Y) && !seen.has(k) && walkable(m[Y][X]) ) { seen.add(k); q.push([X, Y]); }
    }
  }
  return seen;
}

/** Spread n points over the map, at least gap cells apart where possible. */
function spread(rand, cols, rows, n, margin = 3) {
  const pts = [];
  let gap = Math.max(4, Math.floor(Math.sqrt(cols * rows / Math.max(1, n)) * 0.8));
  for ( let tries = 0; pts.length < n && tries < 4000; tries++ ) {
    if ( tries && tries % 600 === 0 ) gap = Math.max(2, gap - 1);
    const p = {x: between(rand, margin, cols - 1 - margin), y: between(rand, margin, rows - 1 - margin)};
    if ( pts.every(q => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) >= gap) ) pts.push(p);
  }
  return pts;
}

/** Turn a share of one kind of cell into another, in seeded blotches. */
function blot(m, rand, from, to, share, size = 2) {
  if ( !share ) return;
  const cells = [];
  m.forEach((row, y) => row.forEach((t, x) => { if ( from.includes(t) ) cells.push({x, y}); }));
  let left = Math.round(cells.length * share);
  for ( const c of shuffled(rand, cells) ) {
    if ( left <= 0 ) break;
    for ( let dy = -size; dy <= size; dy++ ) for ( let dx = -size; dx <= size; dx++ ) {
      const X = c.x + dx, Y = c.y + dy;
      if ( inB(m, X, Y) && from.includes(m[Y][X]) && rand() < 0.6 && left > 0 ) { m[Y][X] = to; left--; }
    }
  }
}

/* ------------------------------------------------------------------ the seven layouts. Each returns {m, sites}. */
const LAYOUT = {
  wilds(rand, cols, rows, mods) {
    const h = noise(rand, cols, rows, 7), g = noise(rand, cols, rows, 4);
    const m = grid(cols, rows, T.ground);
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const v = h(x, y), e = Math.min(x, y, cols - 1 - x, rows - 1 - y);
      if ( v < 0.22 ) m[y][x] = T.water; else if ( v < 0.28 ) m[y][x] = T.shallow;
      else if ( v > 0.8 || e === 0 ) m[y][x] = T.solid; else if ( g(x, y) > 0.6 ) m[y][x] = T.growth;
    }
    const sites = spread(rand, cols, rows, 5 + (mods.dense ?? 0));
    return {m, sites, roads: "path"};
  },
  maze(rand, cols, rows, mods) {
    const m = grid(cols, rows, T.solid);
    const cw = Math.floor((cols - 1) / 3), ch = Math.floor((rows - 1) / 3);
    const seen = grid(cw, ch, false);
    const stack = [{x: between(rand, 0, cw - 1), y: between(rand, 0, ch - 1)}];
    seen[stack[0].y][stack[0].x] = true;
    const open = (cx, cy) => { for ( let dy = 0; dy < 2; dy++ ) for ( let dx = 0; dx < 2; dx++ ) m[1 + cy * 3 + dy][1 + cx * 3 + dx] = T.ground; };
    open(stack[0].x, stack[0].y);
    while ( stack.length ) {
      const c = stack[stack.length - 1];
      const next = shuffled(rand, [[1, 0], [-1, 0], [0, 1], [0, -1]]).map(([dx, dy]) => ({x: c.x + dx, y: c.y + dy, dx, dy})).find(n => n.x >= 0 && n.y >= 0 && n.x < cw && n.y < ch && !seen[n.y][n.x]);
      if ( !next ) { stack.pop(); continue; }
      seen[next.y][next.x] = true;
      open(next.x, next.y);
      // Knock through the wall between the two cells
      const wx = 1 + Math.min(c.x, next.x) * 3 + (next.dx ? 2 : 0), wy = 1 + Math.min(c.y, next.y) * 3 + (next.dy ? 2 : 0);
      for ( let i = 0; i < 2; i++ ) m[wy + (next.dx ? i : 0)][wx + (next.dy ? i : 0)] = T.ground;
      stack.push({x: next.x, y: next.y});
    }
    // A few loops, and chambers
    for ( let i = 0; i < Math.floor(cw * ch / 8); i++ ) {
      const x = between(rand, 2, cols - 3), y = between(rand, 2, rows - 3);
      if ( m[y][x] === T.solid && ((walkable(m[y][x - 1]) && walkable(m[y][x + 1])) || (walkable(m[y - 1][x]) && walkable(m[y + 1][x]))) ) m[y][x] = T.ground;
    }
    const sites = [];
    for ( let i = 0; i < 4 + (mods.dense ?? 0); i++ ) {
      const w = between(rand, 3, 5), hh = between(rand, 3, 4), x = between(rand, 1, cols - w - 2), y = between(rand, 1, rows - hh - 2);
      for ( let dy = 0; dy < hh; dy++ ) for ( let dx = 0; dx < w; dx++ ) m[y + dy][x + dx] = T.ground;
      sites.push({x: x + Math.floor(w / 2), y: y + Math.floor(hh / 2)});
    }
    return {m, sites};
  },
  city(rand, cols, rows, mods) {
    const m = grid(cols, rows, T.solid);
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    const maxR = Math.min(cx, cy) - 1;
    const rings = Math.max(2, Math.floor(maxR / 4) + (mods.dense ?? 0) - (mods.small ? 1 : 0));
    const spokes = 6 + 2 * (mods.dense ?? 0);
    const rr = Array.from({length: rings}, (_, i) => Math.round(2 + (maxR - 2) * (i + 1) / rings));
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const d = Math.hypot(x - cx, y - cy);
      const a = (Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI) * spokes;
      const offSpoke = Math.abs(a - Math.round(a)) * 2 * Math.PI * d / spokes;
      if ( d < 2.2 || (d <= maxR + 0.5 && (rr.some(r => Math.abs(d - r) < 0.75) || offSpoke < 0.75)) ) m[y][x] = T.path;
      else if ( d > maxR + 0.5 ) m[y][x] = d > maxR + 2 ? T.water : T.shallow;
      else if ( rand() < 0.08 ) m[y][x] = T.ground;
    }
    const sites = [{x: cx, y: cy}];
    for ( let i = 0; i < 3 + (mods.dense ?? 0); i++ ) {
      const a = rand() * Math.PI * 2, r = rr[between(rand, 0, rr.length - 1)];
      sites.push({x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r)});
    }
    return {m, sites, roads: "path"};
  },
  islands(rand, cols, rows, mods) {
    const m = grid(cols, rows, T.void);
    const n = noise(rand, cols, rows, 3);
    const sites = spread(rand, cols, rows, 5 + (mods.dense ?? 0), 4);
    for ( const s of sites ) {
      const r = between(rand, 3, 5);
      for ( let y = s.y - r - 1; y <= s.y + r + 1; y++ ) for ( let x = s.x - r - 1; x <= s.x + r + 1; x++ ) {
        if ( !inB(m, x, y) ) continue;
        const d = Math.hypot(x - s.x, y - s.y) / r;
        if ( d < 0.7 + n(x, y) * 0.5 ) m[y][x] = d < 0.45 && n(x, y) > 0.7 ? T.growth : T.ground;
      }
    }
    return {m, sites, roads: "bridge"};
  },
  trenches(rand, cols, rows, mods) {
    const m = grid(cols, rows, T.ground);
    const lines = 3 + (mods.dense ?? 0);
    for ( let i = 0; i < lines; i++ ) {
      const x0 = Math.round((i + 1) * cols / (lines + 1));
      let x = x0;
      for ( let y = 1; y < rows - 1; y++ ) {
        if ( rand() < 0.3 ) x += rand() < 0.5 ? -1 : 1;
        x = Math.max(2, Math.min(cols - 3, x));
        if ( y % 7 !== 3 ) m[y][x] = T.solid; // the parapet, with gaps every few cells
        m[y][x + 1] = T.path;
      }
    }
    for ( let i = 0; i < 6 + 2 * (mods.dense ?? 0); i++ ) {
      const x = between(rand, 2, cols - 3), y = between(rand, 2, rows - 3), r = between(rand, 1, 2);
      for ( let dy = -r; dy <= r; dy++ ) for ( let dx = -r; dx <= r; dx++ ) if ( inB(m, x + dx, y + dy) && m[y + dy][x + dx] === T.ground && Math.hypot(dx, dy) <= r ) m[y + dy][x + dx] = T.hazard;
    }
    const sites = [{x: 1, y: Math.floor(rows / 2)}, {x: cols - 3, y: 3}, {x: cols - 3, y: rows - 4}, {x: Math.floor(cols / 2), y: Math.floor(rows / 2)}];
    return {m, sites, roads: "path"};
  },
  grid(rand, cols, rows, mods) {
    const m = grid(cols, rows, T.void);
    const step = mods.small ? 8 : 6;
    const sites = [];
    for ( let y = 2; y < rows - 4; y += step ) for ( let x = 2; x < cols - 4; x += step ) {
      if ( rand() < 0.2 ) continue;
      const w = between(rand, 3, step - 2), h = between(rand, 3, step - 2);
      for ( let dy = 0; dy < h; dy++ ) for ( let dx = 0; dx < w; dx++ ) m[y + dy][x + dx] = T.ground;
      sites.push({x: x + Math.floor(w / 2), y: y + Math.floor(h / 2), w, h, x0: x, y0: y});
    }
    if ( sites.length < 2 ) {
      for ( const p of [{x: 4, y: 4}, {x: cols - 6, y: rows - 6}] ) { for ( let dy = -1; dy <= 1; dy++ ) for ( let dx = -1; dx <= 1; dx++ ) m[p.y + dy][p.x + dx] = T.ground; sites.push(p); }
    }
    // Restricted sectors: walled hazard boxes
    for ( const s of sites.slice(1) ) if ( rand() < 0.25 && s.w ) for ( let dy = 0; dy < s.h; dy++ ) for ( let dx = 0; dx < s.w; dx++ ) m[s.y0 + dy][s.x0 + dx] = T.hazard;
    return {m, sites, roads: "line"};
  },
  spiral(rand, cols, rows, mods) {
    const m = grid(cols, rows, T.ground);
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2), maxR = Math.min(cx, cy) - 1;
    const rings = Math.max(3, Math.floor(maxR / 3));
    const gates = Array.from({length: rings}, (_, i) => (i * 0.37 + rand()) % 1);
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const d = Math.hypot(x - cx, y - cy);
      if ( d > maxR + 0.5 ) { m[y][x] = T.solid; continue; }
      if ( d < 2 ) { m[y][x] = T.hazard; continue; }
      const a = (Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI);
      for ( let i = 0; i < rings; i++ ) {
        const r = 2.5 + (maxR - 2.5) * (i + 1) / rings;
        if ( Math.abs(d - r) < 0.55 ) {
          const off = Math.abs(((a - gates[i] + 1.5) % 1) - 0.5);
          if ( off * 2 * Math.PI * r > 1.3 ) m[y][x] = T.solid;
        }
      }
    }
    const sites = [{x: cx, y: cy + Math.floor(maxR) - 1}];
    for ( let i = 0; i < 3 + (mods.dense ?? 0); i++ ) {
      const a = rand() * Math.PI * 2, r = 3.5 + rand() * (maxR - 4);
      sites.push({x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r)});
    }
    sites.push({x: cx, y: cy - 2}); // the pit's lip, last: the deepest place
    return {m, sites};
  }
};

/** Make sure every site sits on walkable ground and joins the start, carving the way where it must. */
function join(m, sites, rand, roads) {
  const kind = T.path;
  for ( const s of sites ) if ( !walkable(m[s.y][s.x]) ) m[s.y][s.x] = T.ground;
  // A road along a minimum tree of the sites (nearest joined first), then any site still cut off is carved to
  const joined = [sites[0]];
  const rest = sites.slice(1);
  while ( rest.length ) {
    let best = null;
    for ( const r of rest ) for ( const j of joined ) {
      const d = Math.abs(r.x - j.x) + Math.abs(r.y - j.y);
      if ( !best || d < best.d ) best = {r, j, d};
    }
    if ( roads ) carve(m, best.j, best.r, kind, rand, 1, roads === "path" ? new Set([T.water]) : null);
    joined.push(best.r);
    rest.splice(rest.indexOf(best.r), 1);
  }
  for ( let pass = 0; pass < 3; pass++ ) {
    const seen = reach(m, sites[0]);
    const cut = sites.filter(s => !seen.has(`${s.x},${s.y}`));
    if ( !cut.length ) break;
    for ( const s of cut ) carve(m, sites[0], s, T.path, rand, 1);
  }
}

/** Walls along every edge between a walkable cell and solid ground (solid wall), or the void and deep water (edge). */
export function wallsOf(m) {
  const rows = m.length, cols = m[0].length, segs = [];
  const kindAt = (x, y) => !inB(m, x, y) ? "solid" : m[y][x] === T.solid ? "solid" : (m[y][x] === T.void || m[y][x] === T.water) ? "edge" : null;
  // Horizontal edges (between y-1 and y), then vertical (between x-1 and x); runs of the same kind are merged
  for ( let y = 0; y <= rows; y++ ) {
    let run = null;
    for ( let x = 0; x <= cols; x++ ) {
      let k = null;
      if ( x < cols ) {
        const a = y > 0 ? m[y - 1][x] : null, b = y < rows ? m[y][x] : null;
        const wa = a !== null && walkable(a), wb = b !== null && walkable(b);
        if ( wa !== wb ) k = wa ? kindAt(x, y) : kindAt(x, y - 1);
      }
      if ( run && run.k !== k ) { segs.push({c: [run.x, y, x, y], kind: run.k}); run = null; }
      if ( k && !run ) run = {x, k};
    }
  }
  for ( let x = 0; x <= cols; x++ ) {
    let run = null;
    for ( let y = 0; y <= rows; y++ ) {
      let k = null;
      if ( y < rows ) {
        const a = x > 0 ? m[y][x - 1] : null, b = x < cols ? m[y][x] : null;
        const wa = a !== null && walkable(a), wb = b !== null && walkable(b);
        if ( wa !== wb ) k = wa ? kindAt(x, y) : kindAt(x - 1, y);
      }
      if ( run && run.k !== k ) { segs.push({c: [x, run.y, x, y], kind: run.k}); run = null; }
      if ( k && !run ) run = {y, k};
    }
  }
  return segs;
}

/**
 * The map for one realm. Returns {realm, label, seed, year, cols, rows, cells, walls, regions, notes, palette, shape}.
 * regions: {id, kind: arrival|exit|landmark|hazard, label, rect: [x, y, w, h] in cells, note}.
 */
export function generate({realm = "tempest", seed = 1197, year = 1999, size = "medium", future = false} = {}) {
  const R = REALMS[realm];
  if ( !R ) throw new Error(`No such realm: ${realm}`);
  const era = realmEra(realm, year, {future});
  const {cols, rows} = SIZES[size] ?? SIZES.medium;
  const rand = stream(seed, `realm:${realm}:${era.year}:${size}`);
  const mods = era.mods;
  const {m, sites, roads} = LAYOUT[R.shape](rand, cols, rows, mods);
  // Era changes: ruin floods or breaks, blight rots, frost freezes water to ground, the storm adds hazards
  if ( mods.ruin ) blot(m, rand, [T.solid], R.world === "underworld" ? T.shallow : T.hazard, mods.ruin * 0.25, 1);
  if ( mods.blight ) blot(m, rand, [T.ground, T.growth], T.hazard, mods.blight * 0.2, 1);
  if ( mods.web ) blot(m, rand, [T.ground, T.growth], T.shallow, mods.web * 0.15, 1);
  if ( mods.frost ) for ( const row of m ) for ( let x = 0; x < row.length; x++ ) if ( row[x] === T.water && rand() < mods.frost ) row[x] = T.shallow; else if ( row[x] === T.growth && rand() < mods.frost ) row[x] = T.ground;
  if ( mods.storm ) blot(m, rand, [T.ground], T.hazard, 0.04, 1);
  join(m, sites, rand, roads);
  // Sites: the first is where travellers arrive; one or two ways out; the rest take the realm's landmarks
  const regions = [];
  const clampRect = (s, w = 2, h = 2) => [Math.max(0, Math.min(cols - w, s.x - Math.floor(w / 2))), Math.max(0, Math.min(rows - h, s.y - Math.floor(h / 2))), w, h];
  regions.push({id: "arrival", kind: "arrival", label: R.shape === "trenches" ? "The Signpost" : "Arrival", rect: clampRect(sites[0]), at: {x: sites[0].x, y: sites[0].y}, note: "Travellers sent here arrive in this square."});
  const marks = shuffled(rand, R.landmarks ?? []);
  const named = sites.slice(0, 7);
  named.slice(1).forEach((s, i) => {
    if ( i === 0 || (i === named.length - 2 && named.length > 4) ) regions.push({id: `exit-${i}`, kind: "exit", label: i === 0 ? "The way back" : "A way on", rect: clampRect(s), note: i === 0 ? "Leads back the way the travellers came." : "Leads on to another realm (link it in Ways and realms)."});
    else regions.push({id: `landmark-${i}`, kind: "landmark", label: marks[(i - 1) % Math.max(1, marks.length)] ?? "A landmark", rect: clampRect(s, 3, 3), note: ""});
  });
  // Hazards: on hazard cells, a region on each of a few of them
  const hz = [], near = reach(m, sites[0]);
  m.forEach((row, y) => row.forEach((t, x) => { if ( t === T.hazard && near.has(`${x},${y}`) ) hz.push({x, y}); }));
  shuffled(rand, hz).slice(0, Math.min(4, hz.length)).forEach((c, i) => regions.push({id: `hazard-${i}`, kind: "hazard", label: pick(rand, R.hazards ?? ["Danger"]) ?? "Danger", rect: clampRect(c, 2, 2), note: ""}));
  return {version: VERSION, realm, label: R.label, line: R.line, world: R.world, shape: R.shape, seed, year: era.year, size, cols, rows,
    cells: m, walls: wallsOf(m), regions, notes: era.notes, closed: era.closed, palette: R.palette, ways: R.ways ?? [], refs: R.refs ?? []};
}

/* ------------------------------------------------------------------ drawing */
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
/** Two colours mixed, t of the second. */
export function mix(a, b, t) {
  const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [h(a), h(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const KEY = {[T.void]: "void", [T.ground]: "ground", [T.path]: "path", [T.solid]: "solid", [T.water]: "water", [T.hazard]: "hazard", [T.growth]: "growth", [T.shallow]: "water"};

/**
 * The map as an SVG, top-down and at night. cell: pixels per cell in the drawing (the scene stretches it to its grid).
 * Labels are left off by default: region names show to the Storyteller in Foundry.
 */
export function svg(model, {cell = 50, labels = false} = {}) {
  const {cols, rows, cells, palette: C, seed, realm} = model;
  const W = cols * cell, H = rows * cell;
  const rand = stream(seed, `realm-art:${realm}`);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<defs><radialGradient id="glow"><stop offset="0" stop-color="${C.glow}" stop-opacity="0.55"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="dim" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></radialGradient></defs>`,
    `<rect width="${W}" height="${H}" fill="${C.void}"/>`];
  // Runs of one kind along each row
  const by = {};
  for ( let y = 0; y < rows; y++ ) {
    let x0 = 0;
    for ( let x = 1; x <= cols; x++ ) {
      if ( x === cols || KEY[cells[y][x]] !== KEY[cells[y][x0]] ) {
        const k = KEY[cells[y][x0]];
        if ( k !== "void" ) (by[k] ??= []).push(`M${x0 * cell} ${y * cell}h${(x - x0) * cell}v${cell}h${-(x - x0) * cell}z`);
        x0 = x;
      }
    }
  }
  for ( const k of ["water", "ground", "growth", "path", "hazard", "solid"] ) if ( by[k] ) out.push(`<path d="${by[k].join("")}" fill="${k === "ground" || k === "growth" ? mix(C[k], C.glow, 0.14) : C[k]}"${k === "path" ? ` fill-opacity="0.55"` : ""}/>`);
  // Texture: speckle on ground, tufts on growth, ripples on water, cracks on solid, embers on hazards
  const dots = {ground: [], growth: [], water: [], solid: [], hazard: []};
  for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
    const k = KEY[cells[y][x]];
    if ( !dots[k] || rand() > 0.55 ) continue;
    const px = (x + 0.15 + rand() * 0.7) * cell, py = (y + 0.15 + rand() * 0.7) * cell;
    dots[k].push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(cell * (k === "growth" ? 0.22 : k === "hazard" ? 0.12 : 0.05) * (0.6 + rand())).toFixed(1)}"/>`);
  }
  const tint = {ground: C.path, growth: C.glow, water: C.glow, solid: C.void, hazard: C.glow};
  const op = {ground: 0.12, growth: 0.18, water: 0.1, solid: 0.35, hazard: 0.5};
  for ( const [k, list] of Object.entries(dots) ) if ( list.length ) out.push(`<g fill="${tint[k]}" fill-opacity="${op[k]}">${list.join("")}</g>`);
  // Shores and cliff lines: the walls, drawn
  const line = k => model.walls.filter(w => w.kind === k).map(w => `M${w.c[0] * cell} ${w.c[1] * cell}L${w.c[2] * cell} ${w.c[3] * cell}`).join("");
  out.push(`<path d="${line("edge")}" stroke="${C.glow}" stroke-opacity="0.45" stroke-width="${(cell * 0.08).toFixed(1)}" fill="none"/>`);
  out.push(`<path d="${line("solid")}" stroke="${C.ink}" stroke-opacity="0.22" stroke-width="${(cell * 0.06).toFixed(1)}" fill="none"/>`);
  // A glow on each landmark and on the arrival
  for ( const r of model.regions.filter(r => r.kind !== "hazard") ) {
    const [x, y, w, h] = r.rect;
    out.push(`<circle cx="${(x + w / 2) * cell}" cy="${(y + h / 2) * cell}" r="${cell * 2.5}" fill="url(#glow)"/>`);
  }
  out.push(`<rect width="${W}" height="${H}" fill="url(#dim)"/>`);
  if ( labels ) for ( const r of model.regions ) {
    const [x, y, w] = r.rect;
    out.push(`<text x="${(x + w / 2) * cell}" y="${(y - 0.3) * cell}" fill="${C.ink}" font-family="EB Garamond, Georgia, serif" font-size="${cell * 0.6}" text-anchor="middle">${esc(r.label)}</text>`);
  }
  out.push("</svg>");
  return out.join("");
}

/** The Foundry data for the scene's walls and regions, in pixels for a grid of the given size. */
export function sceneParts(model, gridSize = 100) {
  const g = Number(gridSize) || 100;
  const walls = model.walls.map(w => ({c: w.c.map(v => v * g), ...WALL[w.kind], flags: {"wodx-otherworlds": {realmWall: w.kind}}}));
  const COL = {arrival: "#ffe08a", exit: "#8ad0ff", landmark: "#c8b0ff", hazard: "#ff7a5a"};
  const regions = model.regions.map(r => ({name: r.label, color: COL[r.kind] ?? "#ffffff",
    shapes: [{type: "rectangle", x: r.rect[0] * g, y: r.rect[1] * g, width: r.rect[2] * g, height: r.rect[3] * g, rotation: 0}],
    elevation: {bottom: null, top: null}, flags: {"wodx-otherworlds": {realmRegion: r.kind, realmRegionId: r.id, note: r.note}}}));
  return {walls, regions};
}

/** The text for the scene's note: the realm, the year's notes, the ways in and the sources. */
export function realmNote(model) {
  const lines = [`${model.label}, as it stands in ${model.year}.`, ...model.notes];
  if ( model.closed ) lines.push("No way leads in this year; the map is ready for when one does.");
  if ( model.ways.length ) lines.push(`Ways in: ${model.ways.join("; ")}.`);
  if ( model.refs.length ) lines.push(`Sources: ${model.refs.join("; ")}.`);
  return lines.join(" ");
}

/** Where a token lands among others sent at once: spread over the arrival square and round it, in cells. */
export function arrivalSpots(model, n) {
  const a = model.regions.find(r => r.kind === "arrival");
  const {x: x0, y: y0} = a.at;
  const seen = reach(model.cells, {x: x0, y: y0});
  const cells = [...seen].map(k => k.split(",").map(Number)).sort((p, q) => (Math.abs(p[0] - x0) + Math.abs(p[1] - y0)) - (Math.abs(q[0] - x0) + Math.abs(q[1] - y0)));
  return cells.slice(0, Math.max(0, n)).map(([x, y]) => ({x, y}));
}
