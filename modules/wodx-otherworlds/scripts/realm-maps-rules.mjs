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
  aetherial: {label: "The Aetherial Realm", line: "werewolf", world: "umbra", shape: "islands", keys: ["stars:2", "crystal"], palette: P("#28304a", "#c9d4ff", "#141a30", "#0a0e1c", "#7a5a9a", "#3c4a78", "#e8eeff", "#05070f"),
    landmarks: ["Phoebe's light", "a star spirit's perch", "the Wyrm Reaches' edge", "an observatory of the Stargazers"], hazards: ["Wyrm Reaches rot", "a falling star"], map: {reaches: "Wyrm Reaches rot", sky: "moon", on: "A Moon Bridge to Malfeas, sold by Banes in the Wyrm Reaches"},
    ways: ["A Moon Path or Moon Bridge upward", "Gifts and rites that reach the sky (Storyteller's call)"], refs: ["Rage Across the Heavens pdf 25 / p. 24", "Book of the Wyrm (W20) pdf 23 / p. 22"],
    eras: [{note: "Phoebe fills half the sky; the Wyrm Reaches lie above Malfeas."}]},
  "arcadia-gateway": {label: "Arcadia Gateway", line: "werewolf", world: "umbra", shape: "wilds", keys: ["forest", "ruins", "gardens"], palette: P("#1f3324", "#e6d9a0", "#0f1c12", "#203a50", "#6a3a6a", "#2f5a3a", "#ffe9b0", "#050a07"),
    landmarks: ["a fae palace, empty", "a door with no house", "the silver road", "a ring of standing stones"], hazards: ["a glamour that turns the way round"],
    ways: ["A Moon Path from a Glen", "A trod, for changelings"], refs: ["Umbra: The Velvet Shadow pdf 50 / p. 49"],
    eras: [{to: 1348, note: "Fae still walk here openly.", mods: {dense: 1}}, {to: 1968, note: "Since the Shattering the fae who lived here are gone; the palaces stand empty (house rule).", mods: {ruin: 0.3}}, {note: "Some fae have come back since 1969 (house rule)."}]},
  atrocity: {label: "The Atrocity Realm", line: "werewolf", world: "umbra", shape: "maze", keys: ["bones:2", "rot"], palette: P("#2a1a1a", "#7a5a50", "#120a0a", "#2a1010", "#a02a20", "#3a2420", "#ff6040", "#050202"),
    landmarks: ["the gibbet trees", "a replayed massacre", "a prison yard"], hazards: ["a replayed horror", "a Bane drawn by cruelty"], map: {on: "The gateway among the gibbet trees, into the Hellbringer's domain"},
    ways: ["Following signs of cruelty from the Penumbra"], refs: ["Umbra: The Velvet Shadow pdf 53 / p. 52", "Book of the Wyrm (W20) pdf 23 / p. 22"],
    eras: [{to: 1500, note: "The horrors replayed are those of the age so far: sieges, crusades, burnings (house rule)."}, {to: 1914, note: "The replays now hold the Thirty Years War, the slave ships and the colonies' massacres (house rule).", mods: {dense: 1}}, {to: 2025, note: "The twentieth century's camps and wars fill new wings (house rule).", mods: {dense: 2}}, {note: "In the World of Future Darkness the realm keeps growing with every corporate war (house rule).", mods: {dense: 2, blight: 0.2}}]},
  battleground: {label: "The Battleground", line: "werewolf", world: "umbra", shape: "trenches", keys: ["ash", "bones", "ruins"], palette: P("#3a3428", "#b0a080", "#1a1812", "#2a3038", "#8a3020", "#4a4430", "#ffd080", "#080806"),
    landmarks: ["an abandoned camp", "a war spirit's banner", "the far hill"], hazards: ["a battle in full cry", "a crater field"], map: {back: "The Signpost's first path", on: "The Signpost's second path"},
    ways: ["Following signs of war and bloodshed from the Penumbra"], refs: ["Umbra: The Velvet Shadow pdf 56 / p. 55", "Umbra: The Velvet Shadow pdf 40 / p. 39"],
    eras: [{to: 1500, note: "The wars fought here are with swords, bows and siege engines, round palisaded camps; the Signpost is wooden (house rule).", mods: {works: "camps", craters: 0}, hazards: ["a battle in full cry", "a charge of knights"]},
      {to: 1913, note: "Pike, musket and cannon, with earthwork redoubts; the Signpost is a milestone (house rule).", mods: {works: "redoubts", craters: 3}, hazards: ["a battle in full cry", "a cannonade"]},
      {to: 2025, note: "Trenches, wire and armour; the Signpost is a road sign (house rule).", mods: {dense: 1, craters: 8}}, {note: "Drones and powered armour; the Signpost is a touch screen (house rule).", mods: {dense: 2, craters: 10}, keys: ["machines"]}]},
  cyberrealm: {label: "The CyberRealm", line: "werewolf", world: "umbra", shape: "city", keys: ["towers:2", "web", "machines"], palette: P("#1a2430", "#6ad0ff", "#0e141c", "#0a1a24", "#40ffa0", "#203040", "#a0f0ff", "#030508"),
    landmarks: ["a tower of glass", "a Pattern Spider nest", "the road to the Scar", "a Glass Walker refuge"], hazards: ["Pattern Spiders", "a Net-spider's web"],
    ways: ["Following webs of the Weaver from a city's Penumbra"], refs: ["Umbra: The Velvet Shadow pdf 59 / p. 58", "Book of the Weaver pdf 33 / p. 32"],
    eras: [{to: 1700, note: "Before the machine age the realm is a small walled city of stone and clockwork (house rule).", mods: {small: 1}}, {to: 1899, note: "Mills and railways: brick and iron towers (house rule)."}, {to: 2025, note: "One huge web-shaped city of glass, plastic and concrete.", mods: {dense: 1, web: 0.3}}, {note: "In the World of Future Darkness the city has swallowed most of the realm (house rule).", mods: {dense: 2, web: 0.5}}]},
  "dream-zone": {label: "The Dream Zone", line: "werewolf", world: "umbra", shape: "islands", keys: ["shifting", "stars"], palette: P("#2a2440", "#f0c8ff", "#1a1430", "#1a2048", "#a04080", "#403a60", "#ffd8ff", "#06040c"),
    landmarks: ["a childhood house", "a falling staircase", "a school that is also a sea", "a door from a dream"], hazards: ["a nightmare given body"],
    ways: ["Only through dreams; the old Spirit Gates are lost"], refs: ["Umbra: The Velvet Shadow pdf 43 / p. 42"],
    eras: [{note: "Built from shared dreams, so its islands look like the dreams of the age."}]},
  erebus: {label: "Erebus", line: "werewolf", world: "umbra", shape: "maze", keys: ["fire", "caves"], palette: P("#2a1e18", "#d8d8e8", "#140c08", "#c8c8e0", "#ff7030", "#3a2a20", "#f0f0ff", "#060302"),
    landmarks: ["the Crucible", "a chamber of atonement", "the silver ford"], hazards: ["molten silver", "a purifying fire"], map: {river: {hazard: "molten silver"}},
    ways: ["Drawn there by guilt nothing else can clear"], refs: ["Umbra: The Velvet Shadow pdf 62 / p. 61"],
    eras: [{note: "Gaia's wrath and the Garou Nation's purgatory, in every age."}]},
  flux: {label: "The Flux Realm", line: "werewolf", world: "umbra", shape: "islands", keys: ["shifting:2", "marsh"], palette: P("#302a20", "#ffb060", "#181410", "#203040", "#c040c0", "#3a4a2a", "#ffe0a0", "#0a0806"),
    landmarks: ["a shape that will not stay", "a Wyld well", "a road that unmakes itself"], hazards: ["the ground changing underfoot"],
    ways: ["Not by the usual routes: the realm's own rules stop ordinary arrivals"], refs: ["Umbra: The Velvet Shadow pdf 65 / p. 64", "Umbra: The Velvet Shadow pdf 48 / p. 47"],
    eras: [{note: "Endless change in a thin Weaver shell, with no fixed landmarks: draw it again with a new seed every visit (house rule)."}]},
  legendary: {label: "The Legendary Realm", line: "werewolf", world: "umbra", shape: "wilds", keys: ["forest", "tombs", "ruins"], palette: P("#2a3020", "#e0c890", "#141810", "#203048", "#702a2a", "#3a4a28", "#ffe8a0", "#060804"),
    landmarks: ["a hero's barrow", "the hall of past glories", "a battlefield of legend", "a crack where Malfeas leaks"], hazards: ["a shard of Malfeas"],
    ways: ["A Moon Path, or a tale told at a moot (Storyteller's call)"], refs: ["Umbra: The Velvet Shadow pdf 68 / p. 67"],
    eras: [{to: 1500, note: "Bright with tales of the Impergium's end and the old wars (house rule)."}, {to: 1950, note: "The tales darken as the Garou lose ground (house rule).", mods: {blight: 0.1}}, {to: 2025, note: "With the Apocalypse near, Wyrm victories let a shard of Malfeas leak through.", mods: {blight: 0.25}, keys: ["rot"]}, {note: "In the World of Future Darkness the realm is half dark (house rule).", mods: {blight: 0.4}, keys: ["rot:2"]}]},
  malfeas: {label: "Malfeas", line: "werewolf", world: "umbra", shape: "spiral", keys: ["rot:2", "fire", "machines"], palette: P("#2a2018", "#a08040", "#140c06", "#3a3010", "#80ff20", "#3a2a10", "#c0ff40", "#040200"),
    landmarks: ["the castle over the Black Spiral's pit", "a Maeljin's court", "the black train's far station", "Ananasa's opal"], hazards: ["acid fog", "Banes in thousands"],
    map: {centre: "the castle over the Black Spiral's pit", rail: "the black train's far station", on: "A Hellhole up to the Penumbra"},
    ways: ["The black train from the Scar", "The caverns at the Abyss's edge", "A Moon Bridge sold by Banes in the Wyrm Reaches"], refs: ["Book of the Wyrm (W20) pdf 23 / p. 22", "Book of the Wyrm (W20) pdf 15 / p. 14"],
    eras: [{to: 1800, note: "Pits, fumes and the Maeljin's courts (house rule)."}, {note: "Factories and pipelines join the pits as industry grows (house rule).", mods: {dense: 1}}]},
  pangaea: {label: "Pangaea", line: "werewolf", world: "umbra", shape: "wilds", keys: ["forest:2", "marsh", "peaks"], palette: P("#24341c", "#d8c890", "#121a0e", "#1a3a48", "#8a4020", "#2e5a22", "#f0ffb0", "#060a04"),
    landmarks: ["a sauropod's trail", "the troglodyte caves", "a healing spring", "a Moon Bridge's end"], hazards: ["a Bane waiting at the entrance", "a great beast"],
    ways: ["A Moon Bridge (dangerous)", "A powerful Glen that opens straight onto it"], refs: ["Umbra: The Velvet Shadow pdf 71 / p. 70", "Umbra: The Velvet Shadow pdf 73 / p. 72"],
    eras: [{note: "The primordial world, the same in every age."}]},
  scar: {label: "The Scar", line: "werewolf", world: "umbra", shape: "city", keys: ["machines:2", "ash", "rot"], palette: P("#2a2622", "#a09080", "#14120e", "#2a2418", "#c06020", "#302a20", "#ffb060", "#060504"),
    landmarks: ["the Last Junction", "a slag mountain", "a sweatshop of spirits"], hazards: ["smog", "the black train's guards"], map: {centre: "a slag mountain", rail: "the Last Junction", back: "The road from the CyberRealm"},
    ways: ["Routes from the CyberRealm", "Following industrial ruin from the Penumbra"], refs: ["Book of the Wyrm (W20) pdf 23 / p. 22", "Umbra: The Velvet Shadow pdf 59 / p. 58"],
    eras: [{to: 1750, note: "A few smoking forges and mine heads (house rule).", mods: {small: 1}}, {to: 2025, note: "Rust, smog and the Last Junction."}, {note: "In the World of Future Darkness it reaches the horizon (house rule).", mods: {dense: 2}, keys: ["towers"]}]},
  "summer-country": {label: "Summer Country", line: "werewolf", world: "umbra", shape: "wilds", keys: ["forest:2", "gardens", "marsh"], palette: P("#2a3a1c", "#f0e0a0", "#16200e", "#2a4a40", "#9a5020", "#3a7a2a", "#ffffb0", "#080c04"),
    landmarks: ["the Garden of Delight", "a swamp nursery", "a new creature's first den"], hazards: ["fierce competition"],
    ways: ["No path reaches it: it takes rare strength of being, respect for all things and love of one's enemy"], refs: ["Umbra: The Velvet Shadow pdf 77 / p. 76"],
    eras: [{note: "Life arises unbidden here in every age."}]},
  wolfhome: {label: "Wolfhome", line: "werewolf", world: "umbra", shape: "wilds", keys: ["forest", "gardens"], palette: P("#28301e", "#d0c0a0", "#141810", "#203848", "#6a4030", "#34502a", "#f0e8c0", "#060804"),
    landmarks: ["the Town", "a farm", "a hidden laboratory", "the Countryside's wood"], hazards: ["a Fera hunted near the Town"], map: {town: "the Town"},
    ways: ["Sent there for neglecting duty or the beast within, or by elders or spirits; the way starts from a forest or park in the Penumbra"], refs: ["Umbra: The Velvet Shadow pdf 80 / p. 79", "Umbra: The Velvet Shadow pdf 40 / p. 39"],
    eras: [{to: 1800, note: "Mostly countryside, with a market town (house rule)."}, {to: 2025, note: "A blend of rustic countryside and generic suburbia.", mods: {dense: 1}}, {note: "Suburbs and laboratories spread (house rule).", mods: {dense: 2, web: 0.2}, keys: ["towers"]}]},
  "umbral-abyss": {label: "The Abyss (Umbral)", line: "werewolf", world: "umbra", shape: "islands", keys: ["chasm", "caves", "stars"], palette: P("#1a1a1e", "#808090", "#0a0a0e", "#000000", "#5a2a6a", "#202028", "#b0b0d0", "#000000"),
    landmarks: ["a ledge over nothing", "a lost human's camp", "a spirit's last perch"], hazards: ["the fall", "a spirit forced to Slumber"], map: {on: "The caverns of Black Spiral runes, whose path leads to a pit under a castle of Malfeas"},
    ways: ["Lost or thrown there; few go on purpose"], refs: ["Umbra: The Velvet Shadow pdf 47 / p. 46", "Book of the Wyrm (W20) pdf 23 / p. 22"],
    eras: [{note: "Spirits here must take bodies and can be hurt as flesh is."}]},

  // ---------------------------------------------------------------- Mage: past the Membrane and the Horizon
  "horizon-realm": {label: "A Horizon Realm", line: "mage", world: "deep", shape: "islands", keys: ["gardens", "towers", "stars"], palette: P("#24283a", "#e0d0a0", "#121420", "#1a2440", "#7a4a90", "#344060", "#fff0c0", "#04050c"),
    landmarks: ["the Chantry house", "a library tower", "a garden of the Spheres"], hazards: ["a ward against spirits"], map: {compound: "the Chantry house", arrival: "The portal"},
    ways: ["A portal from a Node or Chantry", "Spirit 4 or more (book check queued)"], refs: ["Horizon: Stronghold of Hope pdf 55 / p. 54"],
    eras: [{to: 1998, note: "Open to mages who know the portal."}, {to: 2025, note: "Since the Avatar Storm, every crossing of Earth's Gauntlet tears at a mage.", mods: {ruin: 0.2}, keys: ["ruins"]}, {note: "In the World of Future Darkness few Horizon Realms still answer (house rule).", mods: {ruin: 0.4}}]},
  "shade-realm": {label: "A Shade Realm", line: "mage", world: "deep", shape: "islands", keys: ["shifting", "chasm", "stars"], palette: P("#2a2430", "#d8b0e0", "#141018", "#201830", "#a04060", "#3a3048", "#ffd0f0", "#06040a"),
    landmarks: ["the planet's shadow", "an overlap zone", "the way to the Shard"], hazards: ["a misleading portal"],
    ways: ["Spirit magic past the Horizon"], refs: ["Beyond the Barriers: The Book of Worlds pdf 21 / p. 20", "The Infinite Tapestry pdf 118 / p. 117"],
    eras: [{to: 1998, note: "Each Shard's shadow on the Horizon, the way on to the Shard."}, {note: "Since the Storm the portals on to the Shards are treacherous.", mods: {ruin: 0.2}}]},
  "shard-realm": {label: "A Shard Realm", line: "mage", world: "deep", shape: "wilds", keys: ["crystal:2", "peaks"], palette: P("#302418", "#ffd080", "#181008", "#1a2a40", "#ff6020", "#4a3a20", "#ffffa0", "#080400"),
    landmarks: ["the Sphere's heart", "a Chantry behind black walls", "a wrecked Umbral ship", "a glassy scar"], hazards: ["raw magic of the ruling Sphere"], map: {compound: "a Chantry behind black walls"},
    ways: ["Spirit 5 to cross the First Horizon (The Infinite Tapestry pdf 110 / p. 109)"], refs: ["The Infinite Tapestry pdf 118 / p. 117", "Tradition Book: Order of Hermes (Revised) pdf 35 / p. 33"],
    eras: [{to: 1998, note: "A body of the solar system, ruled by one Sphere."}, {note: "Since the Storm the way in is treacherous; Doissetep lies in ruins in the Realm of Forces.", mods: {ruin: 0.3}, keys: ["ruins"]}]},
  "paradox-realm": {label: "A Paradox Realm", line: "mage", world: "deep", shape: "maze", keys: ["shifting", "crystal"], palette: P("#2a2a2a", "#ffffff", "#101010", "#202030", "#ff40ff", "#3a3a3a", "#ffffff", "#000000"),
    landmarks: ["the riddle's heart", "the way out, if solved"], hazards: ["the Effect turned back"],
    ways: ["Thrown there by Paradox"], refs: ["Masters of the Art pdf 50 / p. 49"],
    eras: [{note: "A new bubble each time: draw it with a new seed (house rule)."}]},
  "deep-umbra": {label: "The Deep Umbra", line: "mage", world: "deep", shape: "islands", keys: ["stars:3", "chasm", "crystal"], palette: P("#1a1c28", "#a0b0ff", "#0a0c14", "#000000", "#6020a0", "#202438", "#c0d0ff", "#000004"),
    landmarks: ["a drifting rock", "a Nephandi Labyrinth", "an ethership's wreck", "a star in its body"], hazards: ["the Void", "time that runs strangely"],
    ways: ["Past the Membrane (werewolves) or the Far Horizon (mages)"], refs: ["Umbra: The Velvet Shadow pdf 93 / p. 92", "Umbra: The Velvet Shadow pdf 105 / p. 104", "The Infinite Tapestry pdf 12 / p. 11"],
    eras: [{to: 1998, note: "Etherspace, the Deep Umbra or the Void: alien and vast."}, {note: "The Avatar Storm rages between Earth and here.", mods: {blight: 0.1}}]},
  "digital-web": {label: "The Digital Web", line: "mage", world: "net", shape: "grid", keys: ["web:2", "crystal"], palette: P("#0c1a14", "#40ffa0", "#06100a", "#001008", "#ff4040", "#103020", "#a0ffd0", "#000402"),
    landmarks: ["a private sector", "a data highway", "a restricted Technocracy zone", "a Virtual Adept chantry"], hazards: ["a killer program", "a restricted sector"],
    ways: ["Jacking in through a computer"], refs: ["Digital Web pdf 12 / p. 11", "Digital Web pdf 35 / p. 34"],
    eras: [{to: 1989, note: "No Net yet: the Digital Web is not open in this year.", mods: {closed: 1, small: 1}}, {to: 2025, note: "Strands of unformed Pattern, shaped by mages into sectors.", mods: {dense: 1}}, {note: "In the World of Future Darkness the Net is everywhere and its Penumbra is the Umbra's last warm place (house rule).", mods: {dense: 2}}]},
  autochthonia: {label: "Autochthonia", line: "mage", world: "deep", shape: "grid", keys: ["machines:3", "towers"], palette: P("#202428", "#ffa040", "#0c0e10", "#101418", "#ff2020", "#283038", "#ffd0a0", "#030304"),
    landmarks: ["the great computer", "a machine-spirit's hall", "the sealed way to Earth"], hazards: ["a guardian engine"],
    ways: ["Iteration X's sealed routes only"], refs: ["Technocracy: Iteration X (Revised) pdf 69 / p. 67", "Digital Web pdf 35 / p. 34"],
    eras: [{to: 1894, note: "Not yet found by the Convention (house rule): the map is drawn but no way leads in.", mods: {closed: 1}}, {note: "The ordered machine world, home of the great computer since 1895."}]},

  // ---------------------------------------------------------------- Wraith: the Dark Umbra past the Shadowlands
  tempest: {label: "The Tempest", line: "wraith", world: "underworld", shape: "islands", keys: ["storm:2", "sea"], palette: P("#1a2228", "#a0b0b8", "#0c1014", "#0a1418", "#5a80a0", "#24303a", "#d0e8ff", "#040608"),
    landmarks: ["a Byway's marker", "the River of Death", "a Ferryman's reed boat", "a relic wreck", "a Renegade cove"], hazards: ["the Maelstrom", "a Nihil"], map: {sea: true, islands: 8, back: "The Byway from the Anchorhead", on: "A Byway on"},
    ways: ["An Anchorhead, then a Byway", "Argos (Wraith 20th)"], refs: ["The Sea of Shadows pdf 20 / p. 19", "The Sea of Shadows pdf 21 / p. 20", "The Sea of Shadows pdf 28 / p. 27"],
    eras: [{note: "The storm-ocean between the realms of the dead; ways only where everyone agrees on them."}]},
  stygia: {label: "Stygia", line: "wraith", world: "underworld", shape: "city", keys: ["towers", "tombs"], palette: P("#1e1e24", "#b0a890", "#0e0e12", "#0c1018", "#8a2a2a", "#2a2a30", "#e0d8b0", "#040406"),
    landmarks: ["the Onyx Tower", "Nhudri's forges", "a Legion's citadel", "the Senate"], hazards: ["a thrall gang", "the forges' hunger"], map: {walled: true, centre: "the Onyx Tower", arrival: "The harbour on the Sea of Shadows"},
    ways: ["A Byway across the Tempest", "The Midnight Express"], refs: ["Handbook for the Recently Deceased pdf 15 / p. 14", "Wraith 20th pdf 95 / p. 30", "Wraith 20th pdf 86 / p. 93", "Wraith 20th pdf 105 / p. 112"],
    eras: [{to: 1944, note: "Charon's Stygia, walled against Maelstroms on its islands.", mods: {dense: 1}}, {to: 1998, note: "The Deathlords rule since Charon vanished fighting Gorool in the Fifth Great Maelstrom of 1945.", mods: {dense: 1}}, {to: 2025, note: "Broken by the Sixth Great Maelstrom: whole quarters lie flooded (house rule: Wraith 20th is set before it).", mods: {ruin: 0.35}}, {note: "In the World of Future Darkness Stygia survives, broken in places.", mods: {ruin: 0.2}}]},
  labyrinth: {label: "The Labyrinth", line: "wraith", world: "underworld", shape: "maze", keys: ["caves", "nihil", "machines"], palette: P("#16121a", "#706878", "#08060a", "#0a0610", "#8020a0", "#201a24", "#c080ff", "#000000"),
    landmarks: ["a Zone, untouched by time", "Industrion's waste shaft", "a Spectre hive"], hazards: ["Spectres", "a Nihil's pull"], map: {debris: {at: "Industrion's waste shaft", label: "broken machinery and plasm pipes"}, on: "The way down to the Void"},
    ways: ["A Nihil from the Tempest", "Enoch's lower gate"], refs: ["Book of Oblivion pdf 70 / p. 69", "Doomslayers: Into the Labyrinth pdf 140 / p. 139"],
    eras: [{note: "Oblivion's maze, worse in the years of a Great Maelstrom."}]},
  "far-shores": {label: "The Far Shores", line: "wraith", world: "underworld", shape: "islands", keys: ["storm", "sea", "ruins"], palette: P("#243026", "#e0d8b0", "#121812", "#1a2a36", "#6a3a3a", "#345a3a", "#fff0c0", "#060806"),
    landmarks: ["an island paradise", "an island Hell", "a would-be god's throne", "the landing"], hazards: ["a paradise that will not let go", "the empire's patrols"], map: {sea: true, islands: 11},
    ways: ["A long voyage across the Tempest from Stygia; the empire forbids it"], refs: ["Wraith 20th pdf 84 / p. 91", "Wraith 20th pdf 87 / p. 94"],
    eras: [{to: 1998, note: "An endless archipelago, rumoured to hold paradise or Hell, some islands ruled by would-be gods."}, {note: "After the Sixth Great Maelstrom many islands lie wrecked (house rule: Wraith 20th gives no fate).", mods: {ruin: 0.4}}]},
  "dark-kingdom": {label: "Another Dark Kingdom", line: "wraith", world: "underworld", shape: "city", keys: ["towers", "tombs:2"], palette: P("#24201a", "#d0b080", "#120e0a", "#101a20", "#8a4020", "#30281e", "#ffe0a0", "#060504"),
    landmarks: ["the throne of the Kingdom", "a market of the dead", "a Necropolis gate"], hazards: ["a foreign wraith's suspicion"], map: {walled: true, centre: "the throne of the Kingdom", arrival: "The landing from the storm"},
    ways: ["A long voyage across the Tempest", "The Midnight Express to an outpost"], refs: ["Handbook for the Recently Deceased pdf 15 / p. 14", "Wraith: The Great War pdf 16 / p. 16"],
    eras: [{note: "Each Dark Kingdom keeps its own island in the storm: Jade, Ivory, Obsidian and others."}]},
  enoch: {label: "Enoch", line: "vampire", world: "underworld", shape: "city", keys: ["towers", "ruins", "tombs"], palette: P("#1a1618", "#a09080", "#0a0808", "#0c0a10", "#a02020", "#241e20", "#e0c0a0", "#020102"),
    landmarks: ["the first spire", "the second spire", "the third spire", "the fourth spire", "the fifth spire", "the bronze gate", "the re-made First City", "the Aralu tombs"], hazards: ["enslaved ghost stars", "no fire allowed"],
    map: {centre: "the re-made First City", arc: ["the first spire", "the second spire", "the third spire", "the fourth spire", "the fifth spire"], on: "The gate straight down to the Labyrinth"},
    ways: ["The Tal'Mahe'Ra's own routes"], refs: ["The Black Hand: A Guide to the Tal'Mahe'Ra pdf 121 / p. 120", "Dirty Secrets of the Black Hand pdf 92 / p. 93", "Sins of the Blood pdf 181 / p. 180"],
    eras: [{note: "In the Tempest, opening straight onto the Labyrinth."}]},

  // ---------------------------------------------------------------- Changeling: past the Near Dreaming
  "far-dreaming": {label: "The Far Dreaming", line: "changeling", world: "dreaming", shape: "wilds", keys: ["shifting", "forest", "stars"], palette: P("#2a2440", "#ffd8a0", "#160f24", "#1a2850", "#a03070", "#3a3a70", "#ffe8ff", "#06040c"),
    landmarks: ["a chimerical castle", "a road of moonlight", "a sea of dreams' shore", "a lost freehold"], hazards: ["a Nightmare", "Bedlam's pull"],
    ways: ["A trod", "A gateway at the right time"], refs: ["Changeling: The Dreaming 20th pdf 29 / p. 28"],
    eras: [{to: 1348, note: "Open and bright (house rule)."}, {to: 1968, note: "Since the Shattering the trods to it are mostly closed (house rule).", mods: {closed: 1, ruin: 0.2}}, {to: 2025, note: "Reopened since the Resurgence of 1969."}, {note: "In the World of Future Darkness Banality floods it and the Endless Winter closes in (house rule).", mods: {frost: 0.5, ruin: 0.3}}]},
  "deep-dreaming": {label: "The Deep Dreaming", line: "changeling", world: "dreaming", shape: "islands", keys: ["shifting:2", "stars", "chasm"], palette: P("#2a2048", "#ffe8b0", "#140c28", "#120c30", "#c040a0", "#40306a", "#fff0ff", "#04020a"),
    landmarks: ["the last gate", "a dream older than people", "a road toward Arcadia"], hazards: ["Bedlam", "losing the way back"],
    ways: ["Only past the Far Dreaming"], refs: ["Changeling: The Dreaming 20th pdf 29 / p. 28", "Changeling: The Dreaming 20th pdf 37 / p. 36"],
    eras: [{to: 1348, note: "Arcadia lies somewhere within (house rule for the openness)."}, {to: 1968, note: "The gates to Arcadia are shut; the sidhe are gone into it.", mods: {closed: 1}}, {to: 2025, note: "The gates opened again in 1969."}, {note: "In the World of Future Darkness the Dreaming is all but gone (house rule).", mods: {frost: 0.7, ruin: 0.4}}]},

  // ---------------------------------------------------------------- Kuei-jin, Mummy, Demon
  yomi: {label: "Yomi, the Thousand Hells", line: "kuei-jin", world: "underworld", shape: "spiral", keys: ["fire:2", "bones"], palette: P("#2a1818", "#d0a070", "#140808", "#200a0a", "#ff3010", "#301a14", "#ffb080", "#060202"),
    landmarks: ["Ti Yu, the Earth Prison", "a Yama King's court", "a hell of the wicked", "the gate the Second Breath returns by"], hazards: ["a demon of the court", "endless punishment"], map: {heart: true, centre: "Ti Yu, the Earth Prison", compound: "Ti Yu, the Earth Prison"},
    ways: ["Every Kuei-jin passed through it before the Second Breath", "A Yomi gate"], refs: ["The Thousand Hells pdf 7 / p. 9", "Dark Kingdom of Jade pdf 90 / p. 89"],
    eras: [{note: "The hells ring Ti Yu, the Earth Prison, a walled city with broad streets and a Hall of Justice; the Yama Kings wait here in every age."}]},
  "yellow-springs": {label: "The Yellow Springs", line: "kuei-jin", world: "underworld", shape: "city", keys: ["towers", "gardens"], palette: P("#2a2418", "#e0c060", "#14100a", "#1a1a10", "#a04020", "#302a18", "#fff0a0", "#060502"),
    landmarks: ["the Jade Emperor's court", "a magistrate's hall", "a Chinatown trading hall", "the Kowloon station's twin"], map: {centre: "the Jade Emperor's court", on: "The Imperial Highway to the Jade Palace"}, hazards: ["loss of face", "a Castigator's notice"],
    ways: ["Death in the Middle Kingdom", "A long, dangerous voyage through the Tempest", "The Midnight Express to Hong Kong"], refs: ["Wraith 20th pdf 498 / p. 433", "Wraith: The Great War pdf 16 / p. 16", "World of Darkness: Hong Kong pdf 33 / p. 31", "Dark Kingdom of Jade pdf 45 / p. 44"],
    eras: [{note: "China's Deadlands under the Emperor Yu Huang: stable, crowded and rich, trading with Stygia through the Chinatowns of many Necropoli."}]},
  duat: {label: "Duat", line: "mummy", world: "underworld", shape: "wilds", keys: ["ash:2", "tombs"], palette: P("#2a2418", "#e0c890", "#16120a", "#14283a", "#8a3020", "#3a3420", "#fff0b0", "#060402"),
    landmarks: ["Amenti's hidden fortress", "the hall of judgement", "a ferry over the river of the dead"], hazards: ["the Devourer's servants"], map: {river: {}, compound: "Amenti's hidden fortress"},
    ways: ["A mummy's death: the soul goes there between lives"], refs: ["Mummy (Second Edition) pdf 14 / p. 13", "Mummy (Second Edition) pdf 109 / p. 108"],
    eras: [{note: "The Egyptian Underworld, home of the Restless Dead."}]},
  "demon-abyss": {label: "The Abyss (the Pit)", line: "demon", world: "abyss", shape: "spiral", keys: ["chasm:2", "nihil", "ruins"], palette: P("#1c1414", "#c09070", "#0c0606", "#0a0404", "#ff4020", "#241818", "#ffc0a0", "#020000"),
    landmarks: ["a broken gate", "a House's chained elders", "the Creator's wall"], hazards: ["the prison's pull"], map: {centre: "a House's chained elders"},
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
  return {year: y, notes, mods, closed: !!mods.closed, hazards: span.hazards ?? R.hazards ?? [], keys: span.keys ?? []};
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

/** More sites where a layout made too few: walkable cells as far as can be from the ones there (seeded). */
function addSites(m, sites, need, rand) {
  const cols = m[0].length, rows = m.length, cand = [];
  for ( let y = 2; y < rows - 2; y++ ) for ( let x = 2; x < cols - 2; x++ ) if ( walkable(m[y][x]) ) cand.push({x, y});
  for ( const c of shuffled(rand, cand) ) c.r = rand();
  while ( sites.length < need && cand.length ) {
    let best = null, bd = -1;
    for ( const c of cand ) {
      const d = Math.min(...sites.map(s => Math.abs(s.x - c.x) + Math.abs(s.y - c.y))) + c.r;
      if ( d > bd ) { bd = d; best = c; }
    }
    sites.push({x: best.x, y: best.y});
    cand.splice(cand.indexOf(best), 1);
  }
  while ( sites.length < need ) sites.push({...sites[sites.length - 1]});
}

/** A river across the map from west to east, wandering with the noise, two cells wide. */
function river(m, rand) {
  const cols = m[0].length, rows = m.length, n = noise(rand, cols, rows, 9);
  let y = between(rand, Math.floor(rows * 0.3), Math.floor(rows * 0.7));
  const cells = [];
  for ( let x = 0; x < cols; x++ ) {
    y += n(x, y) > 0.62 ? 1 : n(x, y) < 0.38 ? -1 : 0;
    y = Math.max(3, Math.min(rows - 4, y));
    for ( const yy of [y, y + 1] ) { m[yy][x] = T.water; cells.push({x, y: yy}); }
  }
  return cells;
}

/** A walled compound round a site: a ring of wall w across with one gate, the inside cleared. */
function compound(m, s, w = 7, gateSide = "s") {
  const h = Math.floor(w / 2);
  for ( let dy = -h; dy <= h; dy++ ) for ( let dx = -h; dx <= h; dx++ ) {
    const X = s.x + dx, Y = s.y + dy;
    if ( !inB(m, X, Y) ) continue;
    const edge = Math.abs(dx) === h || Math.abs(dy) === h;
    const gate = (gateSide === "s" && dy === h && dx === 0) || (gateSide === "n" && dy === -h && dx === 0);
    m[Y][X] = edge && !gate ? T.solid : (dx === 0 && dy >= 0 ? T.path : T.ground);
  }
  // The way out of the gate
  const gy = s.y + (gateSide === "s" ? h + 1 : -h - 1);
  if ( inB(m, s.x, gy) && !walkable(m[gy][s.x]) ) m[gy][s.x] = T.path;
}

/** Little blocks of building round a site, with lanes between: a town in the wilds. */
function hamlet(m, s, r = 5) {
  for ( let dy = -r; dy <= r; dy++ ) for ( let dx = -r; dx <= r; dx++ ) {
    const X = s.x + dx, Y = s.y + dy;
    if ( !inB(m, X, Y) || Math.hypot(dx, dy) > r + 0.3 ) continue;
    const lane = ((dx + 30) % 3 === 0) || ((dy + 30) % 3 === 0);
    m[Y][X] = lane ? T.path : T.solid;
  }
  m[s.y][s.x] = T.path;
}

/** A straight line of track from a site to the nearest edge of the map: the black train's line. */
function rail(m, s) {
  const cols = m[0].length, rows = m.length;
  const d = [[0, -1], [-1, 0], [1, 0], [0, 1]][[s.y, s.x, cols - 1 - s.x, rows - 1 - s.y].indexOf(Math.min(s.y, s.x, cols - 1 - s.x, rows - 1 - s.y))];
  let x = s.x, y = s.y;
  while ( inB(m, x + d[0], y + d[1]) ) { x += d[0]; y += d[1]; m[y][x] = T.path; }
  return {x, y};
}

/* ------------------------------------------------------------------ map keywords
 * Each keyword is one kind of feature, with its own step on the cells and its own marks in the art. A realm takes a
 * few (its `keys`, plus any its era adds or the Storyteller asks for), so realms that share features share the look,
 * while the seed sets how much of each and where. "forest:2" is a heavier forest (1 to 3). */
const r2 = v => Math.round(v * 100) / 100;
function kwCells(m, kinds) { const out = []; m.forEach((row, y) => row.forEach((t, x) => { if ( kinds.includes(t) ) out.push({x, y}); })); return out; }
const nextTo = (m, x, y, t) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inB(m, x + dx, y + dy) && m[y + dy][x + dx] === t);
/** A wandering line of cells from one point, heading one way. */
function wander(rand, m, x, y, dir, len, fn) {
  for ( let i = 0; i < len && inB(m, x, y); i++ ) {
    fn(x, y);
    if ( rand() < 0.35 ) { if ( dir[0] ) y += rand() < 0.5 ? -1 : 1; else x += rand() < 0.5 ? -1 : 1; }
    else { x += dir[0]; y += dir[1]; }
  }
}
export const KEYWORDS = {
  // The land
  forest: {label: "Forest", group: "land", about: "Woods: growth in clumps, drawn as tree crowns",
    step({m, rand, cols, rows, n, put, mark}) {
      const f = noise(rand, cols, rows, 4 + between(rand, 0, 2)), thr = 0.64 - 0.07 * n - rand() * 0.05;
      for ( const c of kwCells(m, [T.ground]) ) if ( f(c.x, c.y) > thr ) put(c.x, c.y, T.growth);
      for ( const c of kwCells(m, [T.growth]) ) if ( rand() < 0.45 + 0.12 * n ) mark("tree", c.x + 0.2 + rand() * 0.6, c.y + 0.2 + rand() * 0.6, 0.35 + rand() * 0.3);
    }},
  marsh: {label: "Marsh", group: "land", about: "Fen and bog: shallow pools ringed with reeds",
    step({m, rand, cols, rows, n, put, mark}) {
      const f = noise(rand, cols, rows, 4);
      for ( const c of kwCells(m, [T.ground, T.path]) ) { const v = f(c.x, c.y), g = m[c.y][c.x] === T.ground; if ( v < 0.2 + 0.06 * n ) put(c.x, c.y, T.shallow); else if ( g && v < 0.28 + 0.06 * n ) put(c.x, c.y, T.growth); }
      for ( const c of kwCells(m, [T.shallow]) ) if ( rand() < 0.3 ) mark("reed", c.x + rand(), c.y + rand(), 0.4);
    }},
  peaks: {label: "Peaks", group: "land", about: "Ridges of rock that bar the way, drawn with ridge lines",
    step({m, rand, cols, rows, n, put, mark}) {
      const f = noise(rand, cols, rows, 6 + between(rand, 0, 3)), w = 0.03 + 0.015 * n;
      for ( const c of kwCells(m, [T.ground, T.growth]) ) if ( Math.abs(f(c.x, c.y) - 0.5) < w && rand() < 0.9 ) put(c.x, c.y, T.solid);
      for ( const c of kwCells(m, [T.solid]) ) if ( rand() < 0.25 && [T.ground, T.growth, T.path].some(t => nextTo(m, c.x, c.y, t)) ) mark("ridge", c.x + 0.5, c.y + 0.5, 0.5);
    }},
  caves: {label: "Caves", group: "land", about: "Rock closing in: rounded cave walls and fallen stone",
    step({m, rand, cols, rows, n, put, mark}) {
      const f = noise(rand, cols, rows, 3 + between(rand, 0, 2));
      for ( const c of kwCells(m, [T.ground, T.growth]) ) if ( f(c.x, c.y) > 0.68 - 0.04 * n ) put(c.x, c.y, T.solid);
      for ( const c of kwCells(m, [T.ground, T.growth]) ) {
        let s = 0; for ( let dy = -1; dy <= 1; dy++ ) for ( let dx = -1; dx <= 1; dx++ ) if ( (dx || dy) && (!inB(m, c.x + dx, c.y + dy) || m[c.y + dy][c.x + dx] === T.solid) ) s++;
        if ( s >= 6 ) put(c.x, c.y, T.solid);
      }
      for ( const c of kwCells(m, [T.ground]) ) if ( rand() < 0.14 && nextTo(m, c.x, c.y, T.solid) ) mark("rock", c.x + rand(), c.y + rand(), 0.15 + rand() * 0.15);
    }},
  sea: {label: "Sea", group: "land", about: "Open water round the land; waves on it",
    step({m, rand, cols, rows, n, put, mark}) {
      const f = noise(rand, cols, rows, 5);
      for ( const c of kwCells(m, [T.void]) ) put(c.x, c.y, T.water);
      for ( const c of kwCells(m, [T.ground, T.growth]) ) { const e = Math.min(c.x, c.y, cols - 1 - c.x, rows - 1 - c.y); if ( e < 1 + n && f(c.x, c.y) < 0.55 ) put(c.x, c.y, T.water); }
      for ( const c of kwCells(m, [T.water]) ) if ( rand() < 0.1 ) mark("wave", c.x + rand(), c.y + rand(), 0.5);
    }},
  ash: {label: "Ash and sand", group: "land", about: "Barren ground: no growth, dried pools, drifts",
    step({m, rand, n, put, mark}) {
      for ( const c of kwCells(m, [T.growth]) ) if ( rand() < 0.6 + 0.15 * n ) put(c.x, c.y, T.ground);
      for ( const c of kwCells(m, [T.water]) ) if ( rand() < 0.25 ) put(c.x, c.y, T.shallow);
      for ( const c of kwCells(m, [T.ground]) ) if ( rand() < 0.08 + 0.03 * n ) mark("drift", c.x + rand(), c.y + rand(), 0.6, rand() * 180);
    }},
  ice: {label: "Ice", group: "land", about: "Frozen water and frost: cracked ice, snow",
    step({m, rand, n, put, mark}) {
      for ( const c of kwCells(m, [T.water]) ) if ( rand() < 0.4 + 0.15 * n ) put(c.x, c.y, T.shallow);
      for ( const c of kwCells(m, [T.growth]) ) if ( rand() < 0.5 ) put(c.x, c.y, T.ground);
      for ( const c of kwCells(m, [T.shallow]) ) if ( rand() < 0.3 ) mark("crack", c.x + rand(), c.y + rand(), 0.5, rand() * 180);
      for ( const c of kwCells(m, [T.ground]) ) if ( rand() < 0.15 ) mark("snow", c.x + rand(), c.y + rand(), 0.08);
    }},
  chasm: {label: "Chasms", group: "land", about: "Rifts of nothing across the ground; bridges only where the paths are",
    step({m, rand, cols, rows, n, put}) {
      for ( let i = 0; i < n + between(rand, 0, 1); i++ ) {
        const across = rand() < 0.5, w = n > 1 ? 2 : 1;
        const [x, y, dir] = across ? [0, between(rand, 4, rows - 5), [1, 0]] : [between(rand, 4, cols - 5), 0, [0, 1]];
        wander(rand, m, x, y, dir, across ? cols : rows, (X, Y) => { for ( let k = 0; k < w; k++ ) { const a = across ? X : X + k, b = across ? Y + k : Y; if ( inB(m, a, b) && m[b][a] !== T.path ) put(a, b, T.void); } });
      }
    }},
  stars: {label: "Stars", group: "land", about: "The open sky: stars in the dark between the ground",
    step({m, rand, n, mark}) {
      let dark = kwCells(m, [T.void]);
      if ( dark.length < 60 ) dark = dark.concat(kwCells(m, [T.solid]));
      if ( dark.length < 60 ) dark = dark.concat(kwCells(m, [T.water]));
      for ( const c of dark ) if ( rand() < 0.07 + 0.04 * n ) mark("star", c.x + rand(), c.y + rand(), 0.05 + rand() * 0.1);
    }},
  // What was built
  ruins: {label: "Ruins", group: "built", about: "Broken walls and rubble standing in the open",
    step({m, rand, n, put, mark}) {
      const open = shuffled(rand, kwCells(m, [T.ground, T.growth, T.solid]));
      for ( const c of open.slice(0, 5 + 3 * n) ) {
        const dir = rand() < 0.5 ? [1, 0] : [0, 1], len = between(rand, 2, 4);
        for ( let i = 0; i < len; i++ ) { const X = c.x + dir[0] * i, Y = c.y + dir[1] * i; if ( inB(m, X, Y) && m[Y][X] !== T.path && rand() < 0.8 ) put(X, Y, T.solid); }
        if ( rand() < 0.5 ) { const X = c.x + dir[1] * 2, Y = c.y + dir[0] * 2; if ( inB(m, X, Y) && m[Y][X] !== T.path ) put(X, Y, T.solid); }
        for ( let k = 0; k < 3; k++ ) mark("rubble", c.x + rand() * 3 - 0.5, c.y + rand() * 3 - 0.5, 0.12 + rand() * 0.1);
      }
    }},
  towers: {label: "Towers", group: "built", about: "Tall square blocks with lit windows, set back from the ways",
    step({m, rand, n, put, mark}) {
      let made = 0;
      for ( const c of shuffled(rand, kwCells(m, [T.ground, T.solid])) ) {
        if ( made >= 3 + 2 * n ) break;
        const s = between(rand, 2, 3);
        let ok = true;
        // On open ground a tower keeps a cell clear of the ways; in a city it may fill a block to its edge
        const pad = m[c.y][c.x] === T.solid ? 0 : 1;
        for ( let dy = -pad; dy < s + pad && ok; dy++ ) for ( let dx = -pad; dx < s + pad && ok; dx++ ) if ( !inB(m, c.x + dx, c.y + dy) || ![T.ground, T.solid, T.growth].includes(m[c.y + dy][c.x + dx]) ) ok = false;
        if ( !ok ) continue;
        for ( let dy = 0; dy < s; dy++ ) for ( let dx = 0; dx < s; dx++ ) put(c.x + dx, c.y + dy, T.solid);
        mark("tower", c.x, c.y, s); made++;
      }
    }},
  machines: {label: "Machines", group: "built", about: "Pipes, gears and vents of hot fumes",
    step({m, rand, cols, rows, n, put, mark}) {
      for ( const c of shuffled(rand, kwCells(m, [T.ground, T.path])).slice(0, 2 + n) ) {
        const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][between(rand, 0, 3)], len = between(rand, 6, 12);
        const x2 = Math.max(0, Math.min(cols - 1, c.x + dx * len)), y2 = Math.max(0, Math.min(rows - 1, c.y + dy * len));
        mark("pipe", c.x + 0.5, c.y + 0.5, 0.18, 0, x2 + 0.5, y2 + 0.5);
        if ( m[y2][x2] === T.ground ) put(x2, y2, T.hazard);
      }
      for ( const c of kwCells(m, [T.solid]) ) if ( rand() < 0.03 + 0.01 * n && [T.ground, T.path].some(t => nextTo(m, c.x, c.y, t)) ) mark("gear", c.x + 0.5, c.y + 0.5, 0.35 + rand() * 0.25);
    }},
  web: {label: "Webbing", group: "built", about: "The Weaver's strands strung between points, sticky underfoot",
    step({m, rand, n, put, mark}) {
      const open = kwCells(m, [T.ground, T.path, T.growth]);
      const pts = shuffled(rand, open).slice(0, 6 + 3 * n);
      for ( const p of pts ) {
        const near = pts.filter(q => q !== p).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 2);
        for ( const q of near ) mark("strand", p.x + 0.5, p.y + 0.5, 0.05, 0, q.x + 0.5, q.y + 0.5);
      }
      for ( const c of kwCells(m, [T.ground]) ) if ( rand() < 0.03 * n ) put(c.x, c.y, T.shallow);
    }},
  tombs: {label: "Tombs", group: "built", about: "Rows of graves and sealed tombs",
    step({m, rand, n, put, mark}) {
      for ( const c of shuffled(rand, kwCells(m, [T.ground, T.solid])).slice(0, 2 + n) ) {
        const w = between(rand, 3, 4), h = between(rand, 2, 3);
        for ( let j = 0; j < h; j++ ) for ( let i = 0; i < w; i++ ) {
          const X = c.x + i * 2, Y = c.y + j * 2;
          if ( !inB(m, X, Y) || ![T.ground, T.solid].includes(m[Y][X]) ) continue;
          if ( rand() < 0.25 ) put(X, Y, T.solid);
          mark("grave", X + 0.5, Y + 0.5, 0.3);
        }
      }
    }},
  gardens: {label: "Gardens and fields", group: "built", about: "Tended beds or fields in rows, paths between",
    step({m, rand, n, put}) {
      for ( const c of shuffled(rand, kwCells(m, [T.ground])).slice(0, 2 + n) ) {
        const w = between(rand, 4, 6), h = between(rand, 3, 5), rows2 = rand() < 0.5;
        for ( let dy = 0; dy < h; dy++ ) for ( let dx = 0; dx < w; dx++ ) {
          const X = c.x + dx, Y = c.y + dy;
          if ( !inB(m, X, Y) || ![T.ground, T.growth].includes(m[Y][X]) ) continue;
          put(X, Y, ((rows2 ? dy : dx) % 2) ? T.path : T.growth);
        }
      }
    }},
  // What burns, rots or moves
  fire: {label: "Fire", group: "force", about: "Streams and pools of fire, glowing embers",
    step({m, rand, cols, rows, n, put, mark}) {
      for ( let i = 0; i < n; i++ ) {
        const c = {x: between(rand, 2, cols - 3), y: between(rand, 2, rows - 3)};
        wander(rand, m, c.x, c.y, [[1, 0], [0, 1], [-1, 0], [0, -1]][between(rand, 0, 3)], 12 + 5 * n, (X, Y) => { if ( [T.ground, T.growth, T.path].includes(m[Y][X]) ) put(X, Y, T.hazard); });
      }
      blot(m, rand, [T.ground], T.hazard, 0.01 * n, 1);
      for ( const c of kwCells(m, [T.hazard]) ) if ( rand() < 0.5 ) mark("ember", c.x + rand(), c.y + rand(), 0.08 + rand() * 0.1);
    }},
  rot: {label: "Rot", group: "force", about: "The Wyrm's rot: sick blotches that ooze",
    step({m, rand, n, mark}) {
      blot(m, rand, [T.ground, T.growth, T.path], T.hazard, 0.025 * n, 1);
      for ( const c of kwCells(m, [T.hazard])) if ( rand() < 0.35 ) mark("ooze", c.x + rand(), c.y + rand(), 0.2 + rand() * 0.2);
      for ( const c of kwCells(m, [T.ground])) if ( rand() < 0.02 ) mark("ooze", c.x + rand(), c.y + rand(), 0.15);
    }},
  storm: {label: "Storm", group: "force", about: "Wind and lightning: swirls over the water and the dark",
    step({m, rand, n, put, mark}) {
      for ( const c of kwCells(m, [T.ground])) if ( rand() < 0.006 * n ) put(c.x, c.y, T.hazard);
      for ( const c of kwCells(m, [T.water, T.void, T.shallow])) { if ( rand() < 0.012 + 0.008 * n ) mark("swirl", c.x + 0.5, c.y + 0.5, 1 + rand() * 1.5, rand() * 360); else if ( rand() < 0.004 ) mark("bolt", c.x + 0.5, c.y + 0.5, 1); }
    }},
  shifting: {label: "Shifting", group: "force", about: "Ground that will not keep its place: pieces moved, drifting bits",
    step({m, rand, cols, rows, n, put, mark}) {
      for ( let i = 0; i < 3 + 2 * n; i++ ) {
        const w = between(rand, 3, 5), h = between(rand, 3, 4), x = between(rand, 1, cols - w - 3), y = between(rand, 1, rows - h - 3);
        const dx = between(rand, -2, 2), dy = between(rand, -2, 2), copy = [];
        for ( let j = 0; j < h; j++ ) for ( let k = 0; k < w; k++ ) copy.push([x + k, y + j, m[y + j][x + k]]);
        for ( const [X, Y, t] of copy ) if ( inB(m, X + dx, Y + dy) ) put(X + dx, Y + dy, t);
      }
      for ( const c of kwCells(m, [T.void])) if ( rand() < 0.01 * n ) put(c.x, c.y, T.ground);
      for ( const c of kwCells(m, [T.ground, T.growth])) if ( rand() < 0.012 ) mark("swirl", c.x + 0.5, c.y + 0.5, 0.6 + rand() * 0.6, rand() * 360);
    }},
  nihil: {label: "Holes into nothing", group: "force", about: "Round pits that open on Oblivion (or plain nothing)",
    step({m, rand, n, put, mark}) {
      for ( const c of shuffled(rand, kwCells(m, [T.ground])).slice(0, 1 + n) ) {
        const r = between(rand, 1, 2);
        for ( let dy = -r; dy <= r; dy++ ) for ( let dx = -r; dx <= r; dx++ ) if ( Math.hypot(dx, dy) <= r + 0.2 && inB(m, c.x + dx, c.y + dy) && m[c.y + dy][c.x + dx] !== T.path ) put(c.x + dx, c.y + dy, T.void);
        mark("hole", c.x + 0.5, c.y + 0.5, r + 0.6);
      }
    }},
  bones: {label: "Bones", group: "force", about: "The remains of the dead, scattered and heaped",
    step({m, rand, n, put, mark}) {
      for ( const c of kwCells(m, [T.ground, T.hazard, T.path])) if ( rand() < 0.03 + 0.025 * n ) mark("bone", c.x + rand(), c.y + rand(), 0.3, rand() * 180);
      for ( const c of shuffled(rand, kwCells(m, [T.ground])).slice(0, n * 2) ) { put(c.x, c.y, T.solid); mark("heap", c.x + 0.5, c.y + 0.5, 0.5); }
    }},
  crystal: {label: "Crystal", group: "force", about: "Clusters of glassy shards that catch the light",
    step({m, rand, n, put, mark}) {
      for ( const c of shuffled(rand, kwCells(m, [T.ground, T.growth])).slice(0, 3 + 2 * n) ) {
        for ( const [dx, dy] of shuffled(rand, [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]).slice(0, between(rand, 2, 4)) ) {
          const X = c.x + dx, Y = c.y + dy;
          if ( inB(m, X, Y) && m[Y][X] !== T.path ) { put(X, Y, T.solid); mark("shard", X + 0.5, Y + 0.5, 0.45, rand() * 180); }
        }
      }
    }}
};
/** "forest:2" or "forest" → {key, n}; unknown words are dropped. */
export function parseKeys(list) {
  const out = new Map();
  for ( const raw of [list ?? []].flat().flatMap(v => String(v).split(/[,\s]+/)) ) {
    const [k, v] = raw.trim().toLowerCase().split(":");
    if ( !KEYWORDS[k] ) continue;
    out.set(k, Math.max(out.get(k) ?? 0, Math.max(1, Math.min(3, Number(v) || 1))));
  }
  return [...out].map(([key, n]) => ({key, n}));
}
/** The keywords a realm's map is drawn with in a year: the realm's own, its era's, the age's, and any asked for. */
export function realmKeys(id, year, {future = false, extra = []} = {}) {
  const R = REALMS[id], era = realmEra(id, year, {future});
  if ( !R ) return [];
  const add = [];
  if ( era.mods.storm ) add.push("storm");
  if ( era.mods.frost ) add.push("ice:2");
  return parseKeys([...(R.keys ?? []), ...(era.keys ?? []), ...add, ...[extra].flat()]);
}
/** What the keywords change in the layout itself: the islands' form, caverns for a maze. The first keyword that says wins. */
const ISLE = {crystal: "angular", towers: "square", gardens: "square", shifting: "scatter", chasm: "broken", caves: "rocky"};
function layoutFrom(keys) {
  const k = keys.map(x => x.key);
  return {isle: ISLE[k.find(x => ISLE[x])], caverns: k.includes("caves"), city: k.some(x => x === "gardens" || x === "crystal") ? "square" : "web"};
}
/** Run the keywords' steps over the cells. keep: cells no step may change. Returns the art marks. */
function applyKeys(m, rand, keys, keep) {
  const cols = m[0].length, rows = m.length, decor = [];
  const put = (x, y, t) => { if ( inB(m, x, y) && !keep(x, y) ) m[y][x] = t; };
  for ( const {key, n} of keys ) {
    const mark = (k, x, y, s, a = 0, x2, y2) => decor.push(x2 === undefined ? {k, key, x: r2(x), y: r2(y), s: r2(s), a: Math.round(a)} : {k, key, x: r2(x), y: r2(y), s: r2(s), a: 0, x2: r2(x2), y2: r2(y2)});
    KEYWORDS[key].step({m, rand, cols, rows, n, put, mark});
  }
  return decor;
}

/* ------------------------------------------------------------------ the seven layouts. Each returns {m, sites}. */
const LAYOUT = {
  wilds(rand, cols, rows, mods, spec = {}) {
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
  maze(rand, cols, rows, mods, spec = {}) {
    if ( spec.caverns ) return LAYOUT.caverns(rand, cols, rows, mods, spec);
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
  caverns(rand, cols, rows, mods, spec = {}) {
    // Caves grown, not cut: open rock settles into rounded caverns (a maze realm with the caves keyword)
    let m = grid(cols, rows, T.solid);
    for ( let y = 1; y < rows - 1; y++ ) for ( let x = 1; x < cols - 1; x++ ) if ( rand() < 0.53 ) m[y][x] = T.ground;
    for ( let pass = 0; pass < 4; pass++ ) {
      const nm = m.map(r => [...r]);
      for ( let y = 1; y < rows - 1; y++ ) for ( let x = 1; x < cols - 1; x++ ) {
        let s = 0; for ( let dy = -1; dy <= 1; dy++ ) for ( let dx = -1; dx <= 1; dx++ ) if ( (dx || dy) && m[y + dy][x + dx] === T.solid ) s++;
        nm[y][x] = s >= 5 ? T.solid : s <= 3 ? T.ground : m[y][x];
      }
      m = nm;
    }
    const sites = spread(rand, cols, rows, 4 + (mods.dense ?? 0), 3);
    return {m, sites, roads: "path"};
  },
  city(rand, cols, rows, mods, spec = {}) {
    const m = grid(cols, rows, T.solid);
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    const maxR = Math.min(cx, cy) - (spec.walled ? 3 : 1); // a walled city leaves room for its wall and the sea
    const rings = Math.max(2, Math.floor(maxR / 4) + (mods.dense ?? 0) - (mods.small ? 1 : 0));
    const spokes = 6 + 2 * (mods.dense ?? 0);
    const rr = Array.from({length: rings}, (_, i) => Math.round(2 + (maxR - 2) * (i + 1) / rings));
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      // A square city (gardens, crystal) has square walls and a grid of streets; the others a web of rings and spokes
      const sq = spec.city === "square";
      const d = sq ? Math.max(Math.abs(x - cx), Math.abs(y - cy)) : Math.hypot(x - cx, y - cy);
      const a = (Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI) * spokes;
      const offSpoke = sq ? Math.min(Math.abs(x - cx) % 5, Math.abs(y - cy) % 5) : Math.abs(a - Math.round(a)) * 2 * Math.PI * d / spokes;
      if ( d < 2.2 || (d <= maxR + 0.5 && (rr.some(r => Math.abs(d - r) < 0.75) || offSpoke < 0.75)) ) m[y][x] = T.path;
      else if ( d > maxR + 0.5 ) m[y][x] = d > maxR + 2 ? T.water : T.shallow;
      else if ( rand() < 0.08 ) m[y][x] = T.ground;
    }
    const sites = [{x: cx, y: cy}];
    if ( spec.walled ) {
      // A wall round the city against the Maelstroms, the sea beyond, and one harbour gate where travellers land
      const wr = maxR + 1;
      for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
        const d = Math.hypot(x - cx, y - cy);
        if ( Math.abs(d - wr) < 0.6 ) m[y][x] = T.solid;
        else if ( d > wr + 0.6 ) m[y][x] = T.water;
      }
      // The harbour: a gate through the wall and a quay just inside it, the sea at its foot
      const hy = Math.round(cy + wr);
      for ( let y = cy; y <= hy; y++ ) m[y][cx] = T.path;
      if ( inB(m, cx, hy + 1) ) m[hy + 1][cx] = T.shallow;
      sites.unshift({x: cx, y: hy}); // the arrival
    }
    for ( let i = 0; i < 3 + (mods.dense ?? 0); i++ ) {
      const a = rand() * Math.PI * 2, r = rr[between(rand, 0, rr.length - 1)];
      sites.push({x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r)});
    }
    return {m, sites, roads: "path", heart: spec.walled ? 1 : 0};
  },
  islands(rand, cols, rows, mods, spec = {}) {
    // In the Underworld the islands stand in the Tempest's storm sea; elsewhere in the void
    const m = grid(cols, rows, spec.sea ? T.water : T.void);
    const n = noise(rand, cols, rows, 3);
    const count = (spec.islands ?? 5) + (mods.dense ?? 0);
    // The keywords set the islands' form: round, angular (crystal), square (built), scattered bits (shifting),
    // broken by cracks (chasms) or ringed with rock (caves)
    const form = spec.isle ?? "round";
    const sites = spread(rand, cols, rows, count, 4);
    const rmax = count > 7 ? 4 : 5;
    for ( const s of sites ) {
      const r = between(rand, 3, rmax);
      for ( let y = s.y - r - 1; y <= s.y + r + 1; y++ ) for ( let x = s.x - r - 1; x <= s.x + r + 1; x++ ) {
        if ( !inB(m, x, y) ) continue;
        const dx = Math.abs(x - s.x), dy = Math.abs(y - s.y);
        const d = (form === "angular" ? (dx + dy) * 0.8 : form === "square" ? Math.max(dx, dy) * 1.05 : Math.hypot(dx, dy)) / r;
        const edge = form === "square" ? 0.95 : 0.7 + n(x, y) * 0.5;
        if ( d < edge ) m[y][x] = form === "rocky" && d > edge - 0.25 && n(x, y) > 0.4 ? T.solid : d < 0.45 && n(x, y) > 0.7 ? T.growth : T.ground;
      }
      if ( form === "broken" ) for ( let k = 0; k < 2; k++ ) {
        const horiz = rand() < 0.5, off = between(rand, -r + 1, r - 1);
        for ( let i = -r - 1; i <= r + 1; i++ ) { const X = horiz ? s.x + i : s.x + off, Y = horiz ? s.y + off : s.y + i; if ( inB(m, X, Y) && Math.abs(i) > 1 && rand() < 0.85 ) m[Y][X] = spec.sea ? T.water : T.void; }
      }
    }
    if ( form === "scatter" ) for ( const c of spread(rand, cols, rows, count * 3, 2) ) {
      const r = between(rand, 1, 2);
      for ( let dy = -r; dy <= r; dy++ ) for ( let dx = -r; dx <= r; dx++ ) if ( inB(m, c.x + dx, c.y + dy) && Math.hypot(dx, dy) <= r && rand() < 0.85 ) m[c.y + dy][c.x + dx] = T.ground;
    }
    return {m, sites, roads: "bridge"};
  },
  trenches(rand, cols, rows, mods, spec = {}) {
    const m = grid(cols, rows, T.ground);
    // The field's works follow the age of war: palisaded camps (before 1500), earthwork redoubts (to 1913),
    // continuous trench lines (from 1914). Without an era's works the lines are the trenches.
    const works = mods.works ?? "trenches";
    if ( works === "trenches" ) {
      const lines = 3 + (mods.dense ?? 0);
      for ( let i = 0; i < lines; i++ ) {
        let x = Math.round((i + 1) * cols / (lines + 1));
        for ( let y = 1; y < rows - 1; y++ ) {
          if ( rand() < 0.3 ) x += rand() < 0.5 ? -1 : 1;
          x = Math.max(4, Math.min(cols - 4, x));
          if ( y % 7 !== 3 ) m[y][x] = T.solid; // the parapet, with gaps every few cells
          m[y][x + 1] = T.path;
        }
      }
    } else {
      // Camps (a square of palisade) or redoubts (a short bank with a ditch behind), scattered over the field
      const n = works === "camps" ? 4 : 6;
      for ( const c of spread(rand, cols, rows, n, 5) ) {
        if ( c.x < 6 ) continue;
        if ( works === "camps" ) compound(m, c, 5, rand() < 0.5 ? "n" : "s");
        else for ( let dy = -2; dy <= 2; dy++ ) { if ( inB(m, c.x, c.y + dy) ) m[c.y + dy][c.x] = T.solid; if ( inB(m, c.x + 1, c.y + dy) ) m[c.y + dy][c.x + 1] = T.path; }
      }
    }
    const craters = mods.craters ?? 6;
    for ( let i = 0; i < craters + 2 * (mods.dense ?? 0); i++ ) {
      const x = between(rand, 2, cols - 3), y = between(rand, 2, rows - 3), r = between(rand, 1, 2);
      for ( let dy = -r; dy <= r; dy++ ) for ( let dx = -r; dx <= r; dx++ ) if ( inB(m, x + dx, y + dy) && m[y + dy][x + dx] === T.ground && Math.hypot(dx, dy) <= r ) m[y + dy][x + dx] = T.hazard;
    }
    // Every visit starts at the Signpost, which points down two paths into the realm (Umbra: The Velvet Shadow pdf 56 / p. 55)
    const post = {x: 2, y: Math.floor(rows / 2)}, a = {x: cols - 4, y: 3}, b = {x: cols - 4, y: rows - 4};
    for ( const end of [a, b] ) {
      let x = post.x, y = post.y;
      x++; m[y][x] = T.path;
      while ( x !== end.x || y !== end.y ) {
        // The two paths part at once: one up, one down, then on across the field
        if ( Math.abs(y - post.y) < 3 && y !== end.y ) y += Math.sign(end.y - y); else if ( y !== end.y && (x === end.x || rand() < 0.45) ) y += Math.sign(end.y - y); else x += Math.sign(end.x - x);
        if ( m[y][x] !== T.path ) m[y][x] = T.path;
      }
    }
    // Around the Signpost only the two paths lead on: rough ground bars the rest
    for ( let dy = -4; dy <= 4; dy++ ) for ( let dx = -2; dx <= 4; dx++ ) { const X = post.x + dx, Y = post.y + dy; if ( inB(m, X, Y) && m[Y][X] !== T.path ) m[Y][X] = T.solid; }
    m[post.y][post.x] = T.path;
    const sites = [post, a, b, {x: Math.floor(cols / 2), y: Math.floor(rows / 2)}];
    return {m, sites, roads: "path"};
  },
  grid(rand, cols, rows, mods, spec = {}) {
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
    // Every sector joined to its neighbours by a straight line of light (the data highways)
    const at = new Map(sites.filter(q => q.w).map(q => [`${q.x0},${q.y0}`, q]));
    for ( const q of at.values() ) for ( const [ox, oy] of [[step, 0], [0, step]] ) {
      const n = at.get(`${q.x0 + ox},${q.y0 + oy}`);
      if ( !n ) continue;
      if ( ox ) { const y = Math.min(q.y, n.y); for ( let x = q.x; x <= n.x; x++ ) if ( m[y][x] === T.void ) m[y][x] = T.path; }
      else { const x = Math.min(q.x, n.x); for ( let y = q.y; y <= n.y; y++ ) if ( m[y][x] === T.void ) m[y][x] = T.path; }
    }
    // Restricted sectors: walled hazard boxes
    for ( const s of sites.slice(1) ) if ( rand() < 0.25 && s.w ) for ( let dy = 0; dy < s.h; dy++ ) for ( let dx = 0; dx < s.w; dx++ ) m[s.y0 + dy][s.x0 + dx] = T.hazard;
    return {m, sites, roads: "line"};
  },
  spiral(rand, cols, rows, mods, spec = {}) {
    const m = grid(cols, rows, T.ground);
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2), maxR = Math.min(cx, cy) - 1;
    const rings = Math.max(3, Math.floor(maxR / 3));
    const gates = Array.from({length: rings}, (_, i) => (i * 0.37 + rand()) % 1);
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const d = Math.hypot(x - cx, y - cy);
      if ( d > maxR + 0.5 ) { m[y][x] = T.solid; continue; }
      if ( d < 2 ) { m[y][x] = spec.heart ? T.ground : T.hazard; continue; }
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
    sites.push({x: cx, y: cy - (spec.heart ? 0 : 2)}); // the pit's lip (or the heart's city), last: the deepest place
    return {m, sites, heart: sites.length - 1};
  }
};

/** Make sure every site sits on walkable ground and joins the start, carving the way where it must. */
function join(m, sites, rand, roads, only = false) {
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
    if ( roads && !(only && reach(m, best.j).has(`${best.r.x},${best.r.y}`)) ) carve(m, best.j, best.r, kind, rand, 1, roads === "path" ? new Set([T.water]) : null);
    joined.push(best.r);
    rest.splice(rest.indexOf(best.r), 1);
  }
  for ( let pass = 0; pass < 3; pass++ ) {
    const seen = reach(m, sites[0]);
    const cut = sites.filter(s => !seen.has(`${s.x},${s.y}`));
    if ( !cut.length ) break;
    for ( const s of cut ) carve(m, only ? sites[1] ?? sites[0] : sites[0], s, T.path, rand, 1);
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
export function generate({realm = "tempest", seed = 1197, year = 1999, size = "medium", future = false, keys: extra = []} = {}) {
  const R = REALMS[realm];
  if ( !R ) throw new Error(`No such realm: ${realm}`);
  const era = realmEra(realm, year, {future});
  const {cols, rows} = SIZES[size] ?? SIZES.medium;
  const rand = stream(seed, `realm:${realm}:${era.year}:${size}`);
  const mods = era.mods, spec = R.map ?? {};
  const keys = realmKeys(realm, era.year, {future, extra});
  const lay = LAYOUT[R.shape](rand, cols, rows, mods, {...layoutFrom(keys), ...spec});
  const {m, roads} = lay;
  let sites = lay.sites.map(p => ({x: p.x, y: p.y}));
  // The realm's keywords change the ground before the landmarks are placed; the start and the layout's own places are kept
  const guard = sites.map((p, i) => ({...p, r: i === 0 ? (R.shape === "trenches" ? 5 : 3) : 2}));
  const decor = applyKeys(m, stream(seed, `realm-keys:${realm}:${era.year}:${size}`), keys, (x, y) => guard.some(g => Math.max(Math.abs(g.x - x), Math.abs(g.y - y)) <= g.r));
  // Every named landmark gets a place: the arrival, the way back, the landmarks, a way on
  const marks = R.landmarks ?? [];
  const need = 3 + marks.length;
  addSites(m, sites, need, rand);
  sites = sites.slice(0, Math.max(need, lay.heart !== undefined ? lay.heart + 1 : 0));
  const heart = lay.heart;
  const order = sites.map((_, i) => i).filter(i => i !== 0 && i !== heart);
  const role = new Map([[0, {kind: "arrival"}]]);
  role.set(order[0], {kind: "back"});
  role.set(order[order.length - 1], {kind: "on"});
  const left = [...marks];
  if ( heart !== undefined && heart !== 0 ) {
    const c = spec.centre && left.includes(spec.centre) ? spec.centre : left[0];
    role.set(heart, {kind: "landmark", label: c});
    left.splice(left.indexOf(c), 1);
  }
  for ( const i of order.slice(1, -1) ) if ( left.length ) role.set(i, {kind: "landmark", label: left.shift()});
  const placed = [...role.entries()].filter(([i]) => sites[i]).sort((a, b) => a[0] - b[0]);
  const siteOf = label => { const e = placed.find(([, r]) => r.label === label); return e ? sites[e[0]] : null; };
  // A row of landmarks in an arc (Enoch's five spires, curved like a hand)
  if ( spec.arc ) {
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2), r = Math.min(cx, cy) * 0.55;
    spec.arc.forEach((label, k) => {
      const s = siteOf(label); if ( !s ) return;
      const a = Math.PI * (1.15 + 0.7 * k / Math.max(1, spec.arc.length - 1));
      s.x = Math.round(cx + Math.cos(a) * r); s.y = Math.round(cy + Math.sin(a) * r);
      if ( inB(m, s.x, s.y - 1) ) m[s.y - 1][s.x] = T.solid; // the spire itself
    });
  }
  // Era changes: ruin floods or breaks, blight rots, frost freezes water to ground, the storm adds hazards
  if ( mods.ruin ) blot(m, rand, [T.solid], R.world === "underworld" ? T.shallow : T.hazard, mods.ruin * 0.25, 1);
  if ( mods.blight ) blot(m, rand, [T.ground, T.growth], T.hazard, mods.blight * 0.2, 1);
  if ( mods.web ) blot(m, rand, [T.ground, T.growth], T.shallow, mods.web * 0.15, 1);
  if ( mods.frost ) for ( const row of m ) for ( let x = 0; x < row.length; x++ ) if ( row[x] === T.water && rand() < mods.frost ) row[x] = T.shallow; else if ( row[x] === T.growth && rand() < mods.frost ) row[x] = T.ground;
  if ( mods.storm ) blot(m, rand, [T.ground], T.hazard, 0.04, 1);
  // What the realm's own descriptions call for
  const fixedHz = [];
  if ( spec.river ) {
    const cells = river(m, rand);
    if ( spec.river.hazard ) fixedHz.push({label: spec.river.hazard, cells});
  }
  if ( spec.reaches ) {
    // A decayed band along the top of the map (the Wyrm Reaches over the Aetherial Realm)
    const band = [];
    for ( let y = 0; y < Math.floor(rows * 0.22); y++ ) for ( let x = 0; x < cols; x++ ) if ( walkable(m[y][x]) && m[y][x] !== T.path && rand() < 0.35 ) { m[y][x] = T.hazard; band.push({x, y}); }
    fixedHz.push({label: spec.reaches, cells: band});
  }
  for ( const label of [spec.compound ?? []].flat() ) { const s = siteOf(label); if ( s ) compound(m, s, 7, s.y > rows / 2 ? "n" : "s"); }
  if ( spec.town ) { const s = siteOf(spec.town); if ( s ) hamlet(m, s, 4); }
  if ( spec.debris ) {
    const s = siteOf(spec.debris.at), cells = [];
    if ( s ) for ( let dy = -4; dy <= 4; dy++ ) for ( let dx = -4; dx <= 4; dx++ ) {
      const X = s.x + dx, Y = s.y + dy, d = Math.abs(dx) + Math.abs(dy);
      if ( d >= 2 && inB(m, X, Y) && walkable(m[Y][X]) && rand() < 0.4 ) { m[Y][X] = T.hazard; cells.push({x: X, y: Y}); }
    }
    // Shut in by rock: the debris spills into the cells round the place itself
    if ( s && !cells.length ) for ( const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]] ) if ( inB(m, s.x + dx, s.y + dy) ) { m[s.y + dy][s.x + dx] = T.hazard; m[s.y + dy / 2][s.x + dx / 2] = T.hazard; cells.push({x: s.x + dx, y: s.y + dy}); }
    fixedHz.push({label: spec.debris.label, cells});
  }
  const named = placed.map(([i]) => sites[i]);
  join(m, named, rand, roads, R.shape === "trenches");
  if ( spec.rail ) { const s = siteOf(spec.rail); if ( s ) rail(m, s); }
  for ( const s of named ) if ( !walkable(m[s.y][s.x]) ) m[s.y][s.x] = T.path;
  // The regions
  const regions = [];
  const clampRect = (s, w = 2, h = 2) => [Math.max(0, Math.min(cols - w, s.x - Math.floor(w / 2))), Math.max(0, Math.min(rows - h, s.y - Math.floor(h / 2))), w, h];
  for ( const [i, r] of placed ) {
    const s = sites[i];
    if ( r.kind === "arrival" ) regions.push({id: "arrival", kind: "arrival", label: spec.arrival ?? (R.shape === "trenches" ? "The Signpost" : "Arrival"), rect: clampRect(s), at: {x: s.x, y: s.y}, note: "Travellers sent here arrive in this square."});
    else if ( r.kind === "back" ) regions.push({id: "exit-back", kind: "exit", label: spec.back ?? "The way back", rect: clampRect(s), at: {x: s.x, y: s.y}, note: "Leads back the way the travellers came."});
    else if ( r.kind === "on" ) regions.push({id: "exit-on", kind: "exit", label: spec.on ?? "A way on", rect: clampRect(s), at: {x: s.x, y: s.y}, note: "Leads on to another realm (link it in Ways and realms)."});
    else regions.push({id: `landmark-${regions.filter(x => x.kind === "landmark").length}`, kind: "landmark", label: r.label ?? "A landmark", rect: clampRect(s, 3, 3), at: {x: s.x, y: s.y}, note: ""});
  }
  // Hazards: each of the realm's dangers once, apart from each other and from the named places
  const near = reach(m, named[0]);
  const used = [];
  const far = (c, d) => named.every(s => Math.abs(s.x - c.x) + Math.abs(s.y - c.y) >= 3) && used.every(u => Math.abs(u.x - c.x) + Math.abs(u.y - c.y) >= d);
  const addHz = (label, c) => { used.push(c); regions.push({id: `hazard-${used.length - 1}`, kind: "hazard", label, rect: clampRect(c, 2, 2), note: ""}); };
  for ( const f of fixedHz ) { const c = shuffled(rand, f.cells).find(c => far(c, 4)) ?? f.cells[0]; if ( c ) addHz(f.label, c); }
  const hzCells = [];
  m.forEach((row, y) => row.forEach((t, x) => { if ( t === T.hazard && near.has(`${x},${y}`) ) hzCells.push({x, y}); }));
  const pool = shuffled(rand, hzCells), ground = shuffled(rand, [...near].map(k => { const [x, y] = k.split(",").map(Number); return {x, y}; }).filter(c => m[c.y][c.x] === T.ground));
  for ( const label of era.hazards.filter(h => !fixedHz.some(f => f.label === h)) ) {
    let c = pool.find(c => far(c, 5)) ?? pool.find(c => far(c, 3));
    if ( !c ) { c = ground.find(c => far(c, 5)) ?? ground.find(c => far(c, 2)); if ( c ) for ( const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] ) if ( inB(m, c.x + dx, c.y + dy) && m[c.y + dy][c.x + dx] === T.ground ) m[c.y + dy][c.x + dx] = T.hazard; }
    if ( c ) addHz(label, c);
  }
  return {version: VERSION, realm, label: R.label, line: R.line, world: R.world, shape: R.shape, seed, year: era.year, size, cols, rows,
    cells: m, walls: wallsOf(m), regions, notes: era.notes, closed: era.closed, palette: R.palette, ways: R.ways ?? [], refs: R.refs ?? [], sky: spec.sky ?? null,
    keys: keys.map(k => k.n > 1 ? `${k.key}:${k.n}` : k.key), decor};
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

/** The keywords' marks: each kind drawn the same way in every realm, in that realm's colours. */
function decorArt(decor, C, cell) {
  const f = v => (v * cell).toFixed(1);
  const by = {};
  for ( const d of decor ) (by[d.k] ??= []).push(d);
  const rot = d => d.a ? ` transform="rotate(${d.a} ${f(d.x)} ${f(d.y)})"` : "";
  const draw = {
    tree: d => `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.s)}"/>`,
    reed: d => `<path d="M${f(d.x)} ${f(d.y)}v${f(-d.s)}M${f(d.x - 0.12)} ${f(d.y)}l${f(-0.08)} ${f(-d.s * 0.8)}M${f(d.x + 0.12)} ${f(d.y)}l${f(0.08)} ${f(-d.s * 0.8)}"/>`,
    ridge: d => `<path d="M${f(d.x - d.s)} ${f(d.y + d.s / 2)}L${f(d.x)} ${f(d.y - d.s / 2)}L${f(d.x + d.s)} ${f(d.y + d.s / 2)}"/>`,
    rock: d => `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.s)}"/>`,
    wave: d => `<path d="M${f(d.x - d.s)} ${f(d.y)}q${f(d.s / 2)} ${f(-d.s / 2)} ${f(d.s)} 0t${f(d.s)} 0"/>`,
    drift: d => `<path d="M${f(d.x - d.s)} ${f(d.y)}q${f(d.s)} ${f(-d.s * 0.6)} ${f(d.s * 2)} 0"${rot(d)}/>`,
    crack: d => `<path d="M${f(d.x - d.s)} ${f(d.y)}l${f(d.s * 0.6)} ${f(-0.15)}l${f(d.s * 0.5)} ${f(0.25)}l${f(d.s * 0.9)} ${f(-0.2)}"${rot(d)}/>`,
    snow: d => `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.s)}"/>`,
    star: d => `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.s)}"/>`,
    rubble: d => `<rect x="${f(d.x)}" y="${f(d.y)}" width="${f(d.s)}" height="${f(d.s * 0.8)}"/>`,
    tower: d => `<rect x="${f(d.x + 0.15)}" y="${f(d.y + 0.15)}" width="${f(d.s - 0.3)}" height="${f(d.s - 0.3)}"/>`,
    pipe: d => `<path d="M${f(d.x)} ${f(d.y)}L${f(d.x2)} ${f(d.y2)}"/>`,
    gear: d => `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.s)}"/>`,
    strand: d => `<path d="M${f(d.x)} ${f(d.y)}L${f(d.x2)} ${f(d.y2)}"/>`,
    grave: d => `<rect x="${f(d.x - 0.13)}" y="${f(d.y - 0.22)}" width="${f(0.26)}" height="${f(0.44)}" rx="${f(0.1)}"/>`,
    ember: d => `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.s)}"/>`,
    ooze: d => `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.s)}"/>`,
    swirl: d => `<path d="M${f(d.x + d.s)} ${f(d.y)}a${f(d.s)} ${f(d.s)} 0 1 1 ${f(-d.s)} ${f(-d.s)}a${f(d.s * 0.6)} ${f(d.s * 0.6)} 0 1 1 ${f(-d.s * 0.3)} ${f(d.s * 0.7)}"${rot(d)}/>`,
    bolt: d => `<path d="M${f(d.x)} ${f(d.y - d.s)}l${f(-0.3)} ${f(d.s * 0.9)}h${f(0.4)}l${f(-0.3)} ${f(d.s * 1.1)}"/>`,
    hole: d => `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.s)}"/>`,
    bone: d => `<path d="M${f(d.x - d.s / 2)} ${f(d.y)}h${f(d.s)}"${rot(d)}/>`,
    heap: d => `<circle cx="${f(d.x - 0.15)}" cy="${f(d.y)}" r="${f(0.22)}"/><circle cx="${f(d.x + 0.18)}" cy="${f(d.y + 0.08)}" r="${f(0.18)}"/><circle cx="${f(d.x)}" cy="${f(d.y - 0.18)}" r="${f(0.16)}"/>`,
    shard: d => `<path d="M${f(d.x)} ${f(d.y - d.s)}L${f(d.x + d.s * 0.35)} ${f(d.y)}L${f(d.x)} ${f(d.y + d.s * 0.6)}L${f(d.x - d.s * 0.35)} ${f(d.y)}z"${rot(d)}/>`
  };
  const sw = v => (cell * v).toFixed(1);
  const style = {
    tree: `fill="${mix(C.growth, C.glow, 0.22)}" fill-opacity="0.75" stroke="${C.void}" stroke-opacity="0.5" stroke-width="${sw(0.05)}"`,
    reed: `fill="none" stroke="${mix(C.growth, C.glow, 0.4)}" stroke-opacity="0.6" stroke-width="${sw(0.04)}"`,
    ridge: `fill="none" stroke="${C.ink}" stroke-opacity="0.35" stroke-width="${sw(0.06)}"`,
    rock: `fill="${C.solid}" stroke="${C.ink}" stroke-opacity="0.25" stroke-width="${sw(0.04)}"`,
    wave: `fill="none" stroke="${C.glow}" stroke-opacity="0.28" stroke-width="${sw(0.04)}"`,
    drift: `fill="none" stroke="${C.path}" stroke-opacity="0.3" stroke-width="${sw(0.05)}"`,
    crack: `fill="none" stroke="#f4f8ff" stroke-opacity="0.4" stroke-width="${sw(0.035)}"`,
    snow: `fill="#f4f8ff" fill-opacity="0.45"`,
    star: `fill="#fbf6ff" fill-opacity="0.85"`,
    rubble: `fill="${C.ink}" fill-opacity="0.28"`,
    tower: `fill="${mix(C.solid, C.ink, 0.12)}" stroke="${C.glow}" stroke-opacity="0.55" stroke-width="${sw(0.05)}" stroke-dasharray="${sw(0.08)} ${sw(0.22)}"`,
    pipe: `fill="none" stroke="${mix(C.solid, C.ink, 0.35)}" stroke-opacity="0.7" stroke-width="${sw(0.18)}" stroke-linecap="round"`,
    gear: `fill="none" stroke="${C.ink}" stroke-opacity="0.4" stroke-width="${sw(0.1)}" stroke-dasharray="${sw(0.1)} ${sw(0.1)}"`,
    strand: `fill="none" stroke="#f0f4ff" stroke-opacity="0.22" stroke-width="${sw(0.03)}"`,
    grave: `fill="${C.ink}" fill-opacity="0.32"`,
    ember: `fill="${mix(C.hazard, "#ffd070", 0.5)}" fill-opacity="0.85"`,
    ooze: `fill="${mix(C.hazard, C.void, 0.3)}" fill-opacity="0.55"`,
    swirl: `fill="none" stroke="${C.glow}" stroke-opacity="0.25" stroke-width="${sw(0.05)}"`,
    bolt: `fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="${sw(0.06)}"`,
    hole: `fill="#000000" stroke="${C.hazard}" stroke-opacity="0.6" stroke-width="${sw(0.1)}"`,
    bone: `fill="none" stroke="#e8e0cc" stroke-opacity="0.5" stroke-width="${sw(0.07)}" stroke-linecap="round"`,
    heap: `fill="#d8d0bc" fill-opacity="0.35"`,
    shard: `fill="${C.glow}" fill-opacity="0.45" stroke="${C.ink}" stroke-opacity="0.35" stroke-width="${sw(0.03)}"`
  };
  return Object.entries(by).filter(([k]) => draw[k]).map(([k, list]) => `<g ${style[k]}>${list.map(draw[k]).join("")}</g>`);
}

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
  // Phoebe fills half the Aetherial sky (Rage Across the Heavens pdf 25 / p. 24)
  if ( model.sky === "moon" ) out.push(`<radialGradient id="moon" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#f4f6ff" stop-opacity="0.5"/><stop offset="0.7" stop-color="#c9d4ff" stop-opacity="0.22"/><stop offset="1" stop-color="#c9d4ff" stop-opacity="0"/></radialGradient>`);
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
  out.push(...decorArt(model.decor ?? [], C, cell));
  if ( model.sky === "moon" ) out.push(`<circle cx="${W * 0.72}" cy="${H * 0.62}" r="${Math.max(W, H) * 0.55}" fill="url(#moon)"/>`);
  // A glow on each landmark and on the arrival
  for ( const r of model.regions.filter(r => r.kind !== "hazard") ) {
    const [x, y, w, h] = r.rect;
    out.push(`<circle cx="${(x + w / 2) * cell}" cy="${(y + h / 2) * cell}" r="${cell * 2.5}" fill="url(#glow)"/>`);
  }
  out.push(`<rect width="${W}" height="${H}" fill="url(#dim)"/>`);
  if ( labels ) for ( const r of model.regions ) {
    const [x, y, w] = r.rect;
    const tx = Math.max(cell * 4, Math.min(W - cell * 4, (x + w / 2) * cell)), ty = r.kind === "hazard" ? (y + r.rect[3] + 0.9) * cell : Math.max(cell, (y - 0.3) * cell);
    out.push(`<text x="${tx}" y="${ty}" fill="${C.ink}" font-family="EB Garamond, Georgia, serif" font-size="${cell * 0.6}" text-anchor="middle">${esc(r.label)}</text>`);
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
  if ( model.keys?.length ) lines.push(`Drawn with: ${model.keys.map(k => { const [w, n] = k.split(":"); return `${KEYWORDS[w]?.label ?? w}${n ? (n === "2" ? " (heavy)" : " (very heavy)") : ""}`; }).join(", ")}.`);
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
