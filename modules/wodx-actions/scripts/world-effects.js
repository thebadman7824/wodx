/**
 * Powers that reach the world (B3757). A power whose own words say it floods, burns or shakes a
 * town, sickens or taints a place, turns a whole town's mood, or fills a spot with water, fire or rubble gets a world
 * result on its effects card, next to whatever it does to the people it touches. No Foundry here: the harness tests it,
 * and tools/powers/world-sweep.mjs lists every power it matches. The Foundry side is effects.js (case "world").
 *
 *   WORLD           the world kinds: town news (WoDX Storyteller towns), sickness (contagion), Wyrm taint and its
 *                   cleansing (WoDX Otherworlds corruption), and ground on the scene (a Combat region: deep water,
 *                   fire, broken ground)
 *   WORLD_POWERS    the powers that reach the world, by name, read one by one from the sweep
 *   worldOf         which kinds a power's words name (the sweep's finder; play reads WORLD_POWERS only)
 *   worldResults    the results for the effects card from a power's name (or kinds) and its successes
 *   townScale       how hard a town effect lands: 1, 2 or 3 by successes
 *
 * Town-wide results always go to the approval queue: the Storyteller says yes before a town floods or burns.
 * Ground results wait for the Storyteller to place them on the map, like any area. Thresholds are house rules: a town
 * result needs 3 successes, ground 1 (deep water 3, the torrent or flood of most water powers).
 */

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/** A town or wider reach in a power's words. */
export const TOWN_REACH = /\b(miles?|kilomet(er|re)s?|towns?|city|cities|villages?|neighbou?rhoods?|district|county|province|region|valley|countryside|the land\b|whole area|acres?|city blocks?|square miles?|the domain|the caern's bawn|for leagues|leagues)\b/;

/**
 * The world kinds. scope "town": a town event, a sickness or a taint, queued for the Storyteller. scope "ground": an
 * area on the scene. re: the words that name it; not: words that rule it out (a "flood of memories" is not a flood).
 * need: successes before it happens. town: the WoDX Storyteller town event key (town-rules.mjs POWER_TOWN).
 */
export const WORLD = {
  flood: {label: "Flood", scope: "town", town: "flood", need: 3,
    re: /\b(flood(s|ed|ing)?|deluge|tidal wave|tsunami|the river (rises|bursts)|burst (its|their) banks)\b/, not: /flood(s|ed|ing)? (of|with) (memor|emotion|feeling|images|light|sound|thought|rage|fear|glamour)|floods? (the|their|its) (mind|senses|veins)/,
    text: "the low streets flood: houses and stores are wrecked, some drown and some leave"},
  fire: {label: "Town fire", scope: "town", town: "fire", need: 3,
    re: /\b(firestorm|wildfire|conflagration|inferno|(set|sets|setting) .{0,30}(ablaze|alight|on fire)|burn(s|ing)? (down )?(the |a |whole )?(towns?|city|village|buildings?|houses?|forests?|fields?|streets?)|rain of fire|fire (spreads|sweeps)|engulf(s|ed)? .{0,20}in flames?)\b/,
    text: "fire runs through the streets: homes and workshops burn"},
  quake: {label: "Earthquake", scope: "town", town: "quake", need: 3,
    re: /\b(earthquakes?|quakes?|tremors?|the (ground|earth) (shakes|heaves|splits|cracks|opens|ruptures|buckles)|the earth (to )?(shake|heave|split)|landslides?|avalanches?|eruptions?|volcan(o|ic))\b/,
    text: "the ground shakes: walls crack, roofs fall, roads break"},
  storm: {label: "Storm damage", scope: "town", town: "storm", need: 4,
    re: /\b(hurricanes?|tornado(e)?s?|typhoons?|cyclones?|blizzards?|hailstorms?|tempests?|gales?|killing (heat|cold)|lightning storm)\b/,
    text: "the storm tears roofs off and floods the cellars"},
  blight: {label: "Blight", scope: "town", town: "blight", need: 3,
    re: /\b(blight(s|ed)?|crops? (wither|fail|die|rot|spoil)|famine|wither(s|ing)? (the )?(fields|crops|plants|vegetation|grain|harvest)|(kill|kills|killing) (all )?(the )?(plants|crops|vegetation|livestock|herds)|barren|the harvest fails|sour(s)? the (milk|grain|wells))\b/,
    text: "fields and stores spoil: food grows short and dear"},
  boon: {label: "Good harvest", scope: "town", town: "boon", need: 3,
    re: /\b(crops? (grow|flourish|thrive|ripen)|bountiful|bumper (crop|harvest)|bless(es|ing)? (the )?(land|fields|harvest|crops|herds)|fertil(e|ity) (to|of|for) the (land|fields|soil)|plants (grow|bloom|flourish)|the land (heals|flourishes))\b/,
    text: "the fields and herds do well: the town eats better and trades more"},
  riot: {label: "Riot", scope: "town", town: "riot", need: 3, reach: true,
    re: /\b(riots?|mobs?|uprising|the crowd (turns|rises|attacks)|mass (hysteria|violence)|rage spreads|turn (on|against) each other|violence spreads|everyone (in|within) .{0,20}(fights|attacks))\b/,
    text: "the town's temper breaks: fights in the streets, shutters smashed"},
  dread: {label: "Dread", scope: "town", town: "dread", need: 3, reach: true,
    re: /\b(panic|terror|dread|nightmares?|mass fear|fear spreads|(everyone|all) .{0,30}(afraid|flee|terrified)|flee(s)? in terror|haunt(s|ed|ing)? the (town|city|village))\b/,
    text: "fear settles on the town: people stay in, and some leave"},
  calm: {label: "Calm", scope: "town", town: "calm", need: 3, reach: true,
    re: /\b(calm(s|ed)?|peace|soothe(s)?|tranquil(ity)?|serenity|quell(s)? (the )?(riot|crowd|mob|unrest)|ease(s)? (tempers|tension|unrest))\b/,
    text: "tempers cool: the town settles"},
  plague: {label: "Sickness", scope: "town", need: 3,
    re: /\b(plagues?|pestilence|epidemics?|contagio(n|us)|spread(s|ing)? (a |the )?(disease|sickness|illness|infection)|(disease|sickness|illness) (spreads|sweeps)|outbreak|infect(s)? (a |the )?(town|city|village|crowd|everyone))\b/,
    text: "a sickness takes hold in the town and spreads with each week of the markets"},
  taint: {label: "Wyrm taint", scope: "taint", need: 2,
    re: /\b(wyrm[- ]taint(ed)?|taint(s|ed)? (the )?(land|place|area|ground|caern|water|soil|river|site)|corrupt(s|ed|ing)? (the )?(land|area|place|ground|caern|soil|site)|balefire|desecrat(e|es|ed|ion)|defile(s|d)? (the )?(land|ground|place|area|caern|holy|site)|befoul(s|ed)?|pollut(e|es|ed|ion)|toxic (waste|sludge)|spiritual pollution)\b/,
    text: "the place is fouled: its Wyrm taint rises"},
  cleanse: {label: "Cleansing", scope: "taint", need: 2,
    re: /\b(cleans(e|es|ing) (the )?(land|area|place|ground|site|caern|taint|corruption|water)|purif(y|ies|ying) (the )?(land|area|place|ground|site|caern|water)|consecrat(e|es|ed|ion)|remov(e|es) (the )?(wyrm[- ])?taint|heal(s)? the land|sanctif(y|ies))\b/,
    text: "the place is cleansed: its Wyrm taint falls"},
  water: {label: "Deep water", scope: "ground", need: 3,
    re: /\b(flood(s|ed|ing)?|torrent|deluge|drown(s|ing)?|waist[- ]deep|neck[- ]deep|deep water|fill(s)? (the )?(room|area|space|street) with water|tidal wave|wave of water|summon(s)? water|water (rises|pours|floods))\b/, not: /flood(s|ed|ing)? (of|with) (memor|emotion|feeling|images|light|sound|thought|rage|fear|glamour)|floods? (the|their|its) (mind|senses|veins)|drown(s|ing)? (out|in (sorrow|grief|despair|guilt))/,
    text: "the spot is under deep water: WoDX Combat's swimming and drowning rules hold there"},
  blaze: {label: "Fire", scope: "ground", need: 1,
    re: /\b(wall of (fire|flame)|ring of (fire|flame)|sheet of (fire|flame)|pillar of (fire|flame)|column of (fire|flame)|firestorm|inferno|rain of fire|sets? .{0,30}(ablaze|alight|on fire)|bursts? into flames?|engulf(s|ed)? .{0,20}in flames?|fire (spreads|sweeps|fills)|flames? (fill|engulf|sweep))\b/,
    text: "fire burns there: two dice of lethal damage to whoever stands in it or walks in"},
  rubble: {label: "Broken ground", scope: "ground", need: 1,
    re: /\b(earthquakes?|quakes?|tremors?|the (ground|earth|floor) (shakes|heaves|splits|cracks|opens|ruptures|buckles)|fissures?|chasms?|rockslides?|landslides?|avalanches?|rubble|sinkholes?|the earth (to )?(shake|heave|split))\b/,
    text: "the ground heaves: whoever is in it or walks in is knocked down unless Dexterity + Athletics succeeds"}
};

const fold = s => String(s ?? "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ");
/** A power's name as the table keys it: no level dots, no case, plain quotes. */
export const nameKey = s => fold(s).replace(/^[•\s]+/, "").trim();

/**
 * The powers that reach the world, by name (B3757), from the sweep (tools/powers/world-sweep.mjs) read power by power
 * against each book's own text. A name here gets these kinds whichever window uses it; "Line|name" keys one line only
 * (Wraith Intimation's Ignite stirs a passion, the Demon's sets things alight). The words alone never add one.
 */
export const WORLD_POWERS = {
  // Demon: the Fallen (Lores of Storms, the Earth and Flame)
  "summon water": ["water"], "manipulate weather": ["storm"], "command the storm": ["storm"], "earthquake": ["quake", "rubble"],
  "roil the earth": ["rubble"], "Demon (DtF)|ignite": ["blaze"], "Demon (DtF)|fuel": ["blaze"], "command the flame": ["blaze"],
  // Werewolf (Dark Ages, W20 and the Changing Breeds)
  "command the blaze": ["fire", "blaze"], "blaze of glory": ["blaze"], "gaia's vengeance": ["cleanse"], "riot": ["riot"],
  "divine wind": ["storm"], "invoke the spirits of the storm": ["storm"], "quell mob rage": ["calm"], "epidemic contagion": ["plague"],
  "cleansing tusks": ["cleanse"], "firebug": ["blaze"], "rain of doom": ["rubble"],
  // Wraith, Vampire, Mage, Changeling, Hunter
  "tesseract bomb": ["rubble"], "breath of thanatos": ["plague"], "bring the plague": ["plague"], "pillar of osiris": ["calm"],
  "mother's bounty": ["boon"], "storm brewing": ["storm"], "eldritch prime": ["blaze"], "pyrokinesis 4": ["blaze"], "pyrokinesis 5": ["blaze"],
  "weather control": ["storm"],
  // Mummy: the Resurrection (Hekau and its rituals)
  "spark of ra": ["blaze"], "grip the water": ["flood"], "call the stars": ["fire"], "greater weather magic": ["storm"],
  "potent weather magic": ["storm", "flood"], "sandstorm": ["storm"], "plague of ma'at": ["plague"], "rousing apophis": ["quake", "rubble"],
  // Werewolf rites
  "rite of cleansing": ["cleanse"], "rite of the opened sky": ["cleanse"], "enchant the forest": ["dread"], "rite of the wilderness": ["dread"]
};
/**
 * How far a ground result reaches, for powers whose book gives it (in feet): faith (the user's permanent Faith) yards,
 * or a yard a success. Others are WoDX's usual 15-foot area. Kept between 5 and 300 feet.
 */
export const REACH = {"summon water": ({faith}) => 3 * n(faith), "roil the earth": ({successes}) => 3 * n(successes),
  "earthquake": ({successes}) => (n(successes) >= 3 ? 90 : 3 * n(successes))};
export function reachFeet(name, ctx = {}) {
  const f = REACH[nameKey(name)];
  const v = f ? f(ctx) : 0;
  return v > 0 ? Math.max(5, Math.min(300, Math.round(v))) : 15;
}
/** The world kinds a power has by name and line (the inventory's line label; [] for none). */
export const worldKinds = (name, line = "") => WORLD_POWERS[`${line}|${nameKey(name)}`] ?? WORLD_POWERS[nameKey(name)] ?? [];

/**
 * Which world kinds a power's words name: [{kind, scope}]. A town kind needs town reach in the words; with no town
 * reach its ground twin stands in (a flood in a room is deep water, a quake in a hall is broken ground). Mood kinds
 * (riot, dread, calm) need town reach and are skipped without it: one crowd in a scene is the power's own keywords.
 */
export function worldOf(text = "", {only = null} = {}) {
  const t = fold(text);
  if ( !t ) return [];
  const town = TOWN_REACH.test(t);
  const out = [];
  // Words a "not" pattern covers do not count ("a flood of memories")
  const hit = k => WORLD[k].re.test(WORLD[k].not ? t.replace(new RegExp(WORLD[k].not.source, "g"), " ") : t);
  for ( const [k, W] of Object.entries(WORLD) ) {
    if ( only && !only.includes(k) ) continue;
    if ( !hit(k) ) continue;
    if ( W.scope === "town" && !town ) continue;
    if ( W.scope === "ground" && town ) {
      // Town reach: the town kind carries it (a flood over miles is a town flood, not one pool of deep water)
      const twin = {water: "flood", blaze: "fire", rubble: "quake"}[k];
      if ( twin && hit(twin) ) continue;
    }
    out.push({kind: k, scope: W.scope});
  }
  // Calm beside riot or dread in the same words is a power that can do either: keep both, the Storyteller picks
  return out;
}

/** How hard a town result lands from its successes: 1 (3-4), 2 (5-6), 3 (7 or more). */
export const townScale = s => (n(s) >= 7 ? 3 : n(s) >= 5 ? 2 : 1);

/**
 * The effects card's world results for a power: [{key: "world", who: "self", out}]. power: {name, line, source, world}
 * (world: a list of kinds in place of the name's own, [] for none). out.kind "world" with world, scope, scale.
 */
export function worldResults(power = {}, successes = 0) {
  const s = n(successes);
  if ( s < 1 ) return [];
  const kinds = (Array.isArray(power.world) ? power.world : worldKinds(power.name, power.line)).map(k => ({kind: k, scope: WORLD[k]?.scope})).filter(x => x.scope);
  const out = [];
  for ( const {kind, scope} of kinds ) {
    const W = WORLD[kind];
    if ( s < W.need ) continue;
    const scale = townScale(s);
    const label = `${W.label}${power.name ? ` (${power.name})` : ""}`;
    const base = {key: "world", kind: "world", label, world: kind, scope, scale, source: power.source ?? "", power: power.name ?? ""};
    if ( scope === "ground" ) {
      const feet = reachFeet(power.name, {faith: power.faith, successes: s});
      out.push({key: "world", who: "self", area: true, out: {...base, area: feet, text: `${W.text}; ${feet} feet out from the spot`,
        ...(kind === "blaze" ? {dice: 2 + (scale - 1)} : {})}});
    } else {
      const size = ["", "on a small scale", "hard", "at full force"][scale];
      out.push({key: "world", who: "self", out: {...base, text: `${W.text} (${size}); the Storyteller approves it first`}});
    }
  }
  return out;
}

/** Where a world result goes: town, sickness and taint to the approval queue, ground to the Storyteller's click. */
export const worldRoute = out => (out?.scope === "ground" ? "area" : "queue");

/** The town event a world result lands as (WoDX Storyteller towns api.power takes {kind, scale, label}). */
export const townKindOf = out => WORLD[out?.world]?.town ?? null;
