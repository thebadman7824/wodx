/**
 * WoDX Library 0.9.0: what a thing can be used for, and what using it does to each kind of character (B907-B910).
 * No Foundry calls here; use.mjs does the Foundry side.
 *
 * Every good gets a list of abilities from its category and its name (abilitiesOf). An ability does one of a few
 * things: feeds or waters the living (Storyteller hardship, M20 pp. 435-436), puts a drug or drink in the body
 * (V20 printed pp. 301-302, the same states a feeding vampire meets), gives first aid supplies (Common checks, First
 * aid), lights a carried light (Interactables), keeps pages written or drawn in it, rolls a common check, is put on,
 * or tells the table what the character does. What a substance does to each line is in EFFECTS; a cell marked
 * sure: false waits for Ben on the Item Uses desk and asks the Storyteller until then.
 */

/** The lines, in the chronicle's order. */
export const LINES = ["mortal", "ghoul", "vampire", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "revenant"];
export const LINE_LABELS = {mortal: "Mortal", ghoul: "Ghoul", vampire: "Vampire", werewolf: "Werewolf", mage: "Mage", changeling: "Changeling",
  wraith: "Wraith", hunter: "Hunter", mummy: "Mummy", demon: "Demon", revenant: "Revenant"};

/** A character's line from its sheet type and variant (as Storyteller's prelude-rules lineFor). */
export function lineOf(type, variant = "") {
  const t = String(type ?? "").toLowerCase(), v = String(variant ?? "").toLowerCase();
  if ( t === "mortal" && v === "ghoul" ) return "ghoul";
  if ( t === "mortal" && v === "revenant" ) return "revenant";
  if ( LINES.includes(t) ) return t;
  if ( t === "changing breed" || t === "changingbreed" ) return "werewolf";
  if ( t === "pc" ) return "vampire";
  return "mortal";
}

/** The abilities a thing can have. effect says what the Foundry side does. */
export const ABILITIES = {
  eat: {label: "Eat", effect: "take", verb: "eats"},
  drink: {label: "Drink", effect: "take", verb: "drinks"},
  take: {label: "Take", effect: "take", verb: "takes"},
  smoke: {label: "Smoke", effect: "take", verb: "smokes"},
  treat: {label: "Treat someone", effect: "treat", verb: "treats a wound with"},
  light: {label: "Light it", effect: "light", verb: "lights"},
  refuel: {label: "Refill a light", effect: "refuel", verb: "refills a light with"},
  strike: {label: "Strike a light", effect: "note", verb: "strikes a light with", uses: true},
  write: {label: "Write in it", effect: "pages", page: "writing", verb: "writes in"},
  draw: {label: "Draw in it", effect: "pages", page: "drawing", verb: "draws in"},
  mark: {label: "Mark it", effect: "pages", page: "mark", verb: "marks"},
  record: {label: "Record", effect: "pages", page: "recording", verb: "records with"},
  photograph: {label: "Take a picture", effect: "pages", page: "picture", verb: "takes a picture with"},
  read: {label: "Read it", effect: "read", verb: "reads"},
  wear: {label: "Put on or take off", effect: "wear", verb: "puts on"},
  play: {label: "Play it", effect: "system", preset: "performance", verb: "plays"},
  game: {label: "Play a game", effect: "note", verb: "plays a game with"},
  gamble: {label: "Gamble", effect: "note", verb: "gambles with"},
  sleep: {label: "Sleep in it", effect: "sleep", verb: "sleeps in"},
  search: {label: "Look through it", effect: "check", check: "search", verb: "looks through"},
  fix: {label: "Make or fix", effect: "check", check: "buildfix", verb: "works with"},
  pray: {label: "Pray with it", effect: "note", verb: "prays with"},
  ward: {label: "Set it as a ward", effect: "note", verb: "sets up"},
  divine: {label: "Divine with it", effect: "note", verb: "reads the signs with"},
  wash: {label: "Wash or groom", effect: "note", verb: "uses", uses: true},
  disguise: {label: "Change the look", effect: "note", verb: "changes the look with", uses: true},
  cook: {label: "Cook with it", effect: "cook", verb: "cooks with"},
  plant: {label: "Plant it", effect: "note", verb: "plants", uses: true},
  call: {label: "Call someone", effect: "note", verb: "makes a call on"},
  switchon: {label: "Switch on or off", effect: "note", verb: "switches on"},
  burn: {label: "Burn it", effect: "note", verb: "burns", uses: true},
  throw: {label: "Throw or sprinkle it", effect: "take", verb: "throws"},
  letter: {label: "Write a letter or note", effect: "letter", verb: "writes a letter with"},
  seal: {label: "Seal a letter", effect: "note", verb: "seals a letter with", uses: true}
};

const R = (...parts) => new RegExp(`\\b(?:${parts.join("|")})(?:e?s)?\\b`, "i");

/* What is in a thing that is eaten, drunk or taken. */
const ALCOHOL = R("ale", "beer", "cider", "wine", "mead", "claret", "port\\b", "champagne", "brandy", "vodka", "gin\\b", "rum\\b", "whiskey", "liquor",
  "absinthe", "riesling", "chardonnay", "pinot", "marsala", "vermouth", "tequila", "triple sec", "sake", "irish coffee", "karsk", "grog", "piña",
  "moonshine", "pilsner", "stout", "sherry", "kalimotxo", "bee's knees", "martini", "hard seltzer", "spiked", "kvass", "schnapps", "slivovice",
  "mulled", "punch", "cocktail", "liqueur", "spirits?\\b", "hooch", "rakia", "becherovka", "lager");
const CAFFEINE = R("coffee", "tea\\b", "cola", "energy drink", "espresso", "cocoa", "chocolate drink", "mate\\b");
const SUBSTANCES = [
  ["opiate", R("opium", "poppy", "laudanum", "soothing syrup", "morphine", "heroin", "fentanyl", "oxycodone", "codeine", "tramadol")],
  ["stimulant", R("coca", "cocaine", "crack", "amphetamine", "meth", "methamphetamine", "khat", "betel", "ecstasy", "neurostim", "prescription stimulants", "speed(?! loader)")],
  ["cannabis", R("hashish", "marijuana", "joint", "cannabis")],
  ["hallucinogen", R("mushroom", "henbane", "peyote", "lsd", "belladonna", "dream gas", "ketamine")],
  ["sedative", R("chloral", "ether for", "sleeping pill", "sedatives", "chloroform", "anesthetic", "rocuronium")],
  ["tobacco", R("tobacco", "cigar", "cigarette", "snuff")],
  ["remedy", R("aspirin", "ibuprofen", "naproxen", "acetaminophen", "penicillin", "antibiotics", "deworming", "quinine", "patent medicine",
    "prescription pill", "antidepressants", "antipsychotics", "metoprolol", "vitamins", "flu shot", "antivenom", "insulin", "asthma inhaler",
    "adrenaline", "epinephrine", "eyedrops", "smelling salts", "theriac", "dried herbs", "multivitamins", "gummy vitamins")],
  ["blood", /^(a bag of )?blood$/i],
  ["holywater", R("holy water")]
];
const PARAPHERNALIA = R("syringe", "bent spoon", "opium pipe", "hookah", "clay pipe", "dermal patch", "lighter");

/** What is in a thing: food, water, alcohol, caffeine, a drug class, a remedy, blood, holy water, or null. */
export function substanceOf(good) {
  if ( !good ) return null;
  const n = good.name;
  if ( /cream\b/i.test(n) && good.kind === "drugs" ) return null;
  if ( /canteen|waterskin/i.test(n) ) return "water";
  for ( const [k, re] of SUBSTANCES ) if ( re.test(n) ) return k;
  if ( good.kind === "food" ) return INGREDIENT.test(n) ? null : "food";
  if ( good.kind === "drink" ) return ALCOHOL.test(n) ? "alcohol" : CAFFEINE.test(n) ? "caffeine" : "water";
  if ( good.kind === "drugs" && !PARAPHERNALIA.test(n) ) return "unknown";
  return null;
}

/** Food that is cooked with rather than eaten as it is. */
const INGREDIENT = /^(an? )?(grain|barley|dried peas|oats|rice|salt|pepper|whole nutmeg|saffron threads|stick of cinnamon|sugarloaf in blue paper|vinegar|yeast|cornmeal|flour|bread flour|maize meal|mustard|tomato sauce|mayonnaise|ketchup|barbecue sauce|hot sauce|buffalo sauce|italian seasoning|soy sauce|mushroom ketchup|raw soybeans|sugar beet|lard|suet|cooking oil|olive oil|honeycomb|rennet|malt|sugar|juniper berries|wash|a cut of raw meat|a plucked fowl|a bunch of grapes|baking soda|baking powder|dry spicebush berries)$/i;

/* Which carried light a thing is (Interactables carry-rules CARRIED). */
const LIGHTS = [
  ["electric", R("flashlight", "headlamp", "led lantern", "reading light", "electric torch")],
  ["candle", R("candle", "rushlight")],
  ["torch", R("pitch torch", "torch\\b")],
  ["lantern", R("lantern", "oil lamp", "whale-oil", "argand", "paraffin lamp", "carbide lamp")]
];
export function lightOf(good) {
  if ( !good || !["light", "faith"].includes(good.kind) ) return null;
  if ( /battery/i.test(good.name) ) return null;
  for ( const [k, re] of LIGHTS ) if ( re.test(good.name) ) return k;
  return null;
}
/** Fuel that refills a carried light: oil for lanterns, a battery or cell for electric light. */
export function refuelOf(good) {
  if ( !good ) return null;
  if ( R("lamp oil", "kerosene", "paraffin\\b", "whale oil", "camphine").test(good.name) ) return "lantern";
  if ( R("torch battery", "9-volt", "battery pack", "power cell", "power bank", "rechargeable").test(good.name) && !/spent/i.test(good.name) ) return "electric";
  return null;
}

const WRITABLE = R("wax tablet", "quire", "sheet of", "slate", "sticky notes", "ledger", "journal", "diary", "notebook", "sketchbook", "envelope",
  "blank", "parchment", "vellum", "writing paper", "postcard", "notepad", "logbook", "exercise book", "jotter", "scroll", "tally stick", "napkin",
  "chalk-marked oilcloth");
const DRAWABLE = R("wax tablet", "quire", "sheet of", "slate", "sticky notes", "journal", "diary", "notebook", "sketchbook", "parchment", "vellum",
  "napkin", "sketch\\b", "oilcloth");
const READABLE = R("book", "letter", "report", "file\\b", "psalter", "broadsheet", "chapbook", "almanac", "newspaper", "dreadful", "novel",
  "guidebook", "encyclopaedia", "timetable", "magazine", "directory", "charter", "deed", "indulgence", "playbill", "poster", "telegram", "will\\b",
  "ticket", "licence", "papers\\b", "passport", "bible", "testament", "hymnal", "quran", "tract", "grimoire", "manual", "grammar", "herbal",
  "treatise", "handbook", "course", "flyer", "page\\b", "sheet music", "ration book", "postcard", "tarot", "itinerary", "racing form", "slip\\b",
  "card\\b", "guide\\b", "sheet music", "token\\b", "pass\\b");
const BEDS = R("mattress", "feather bed", "hammock", "bedroll", "rollmat", "cot\\b", "sleeping bag", "cradle", "bunk");
const INSTRUMENTS = R("flute", "hurdy-gurdy", "lute", "fiddle", "guitar", "harmonica", "concertina", "banjo", "clarinet", "kantele", "ukulele",
  "violin", "krar", "bagpipes", "tuba", "saxophone", "drum\\b", "trumpet", "horn\\b", "whistle", "recorder\\b", "accordion", "piano", "harp");
const GAMES = R("knucklebones", "dice", "die\\b", "nine men", "tables and counters", "chess", "cards", "jigsaw", "board game", "checker", "checkerboard", "tangram",
  "mancala", "rummy", "reversi", "senet", "mahjong", "backgammon", "latrunculi", "go set", "shogi", "hnefatafl", "alquerque", "dominoes",
  "jackstraws", "ludo", "tic-tac-toe", "video game", "game console", "game system", "virtual reality", "ball\\b", "football", "basketball",
  "volleyball", "puck", "shuttlecock", "spinning top", "yo-?yo", "marble", "skateboard", "fidget", "kickboard", "golf");
const PLAYERS = R("cassette player", "mp3", "phonograph", "gramophone", "music box", "record\\b", "music cd", "radio", "television", "earbuds",
  "headphones", "wireless set");
const PHONES = R("phone", "telephone", "walkie-talkie", "pager", "commlink", "telegraph key", "field radio");
const RECORDERS = R("camcorder", "video cassette recorder", "body camera", "tape recorder", "dictaphone", "smart glasses");
const CAMERAS = R("camera", "smartphone", "drone", "instant photo");
const LOOKERS = R("spyglass", "magnifying glass", "microscope", "binoculars", "night-vision", "infrared", "sextant", "compass", "telescope",
  "goggles");
const WEARABLE_AIDS = R("spectacles", "contact lenses", "hearing aid", "ear trumpet", "glass eye", "crutch", "eyeglasses", "monocle",
  "dentures", "false teeth", "wig");
const SUPPLIES = R("bandage", "linen", "dressing", "gauze", "first aid", "doctor's bag", "trauma patch", "wound gel", "splint", "tourniquet",
  "antiseptic", "iodine", "carbolic", "hydrogen peroxide", "alcohol wipe", "saline", "salve", "ointment", "leech", "cupping", "lancet", "bone saw",
  "scalpel", "stethoscope", "thermometer", "medical scissors", "dental tool", "med scanner", "cocaine cream", "urine flask", "medical guide");
/** Supplies that are used up (one per treatment); the rest are instruments that last. */
const SPENT = R("bandage", "linen", "dressing", "gauze", "trauma patch", "wound gel", "antiseptic", "iodine", "carbolic", "hydrogen peroxide",
  "alcohol wipe", "saline", "salve", "ointment", "leech", "cocaine cream", "tourniquet", "splint");
const DISGUISE = R("face paint", "rouge", "lipstick", "face powder", "hair dye", "wig", "pomade");
const FIRE = R("flint and steel", "\\bmatch", "lighter", "fire piston", "matchbook", "matchbox", "ember carrier");

/**
 * The abilities of a good, in the order the Use window shows them. Category defaults first, then what the name
 * says (a journal can be written and drawn in, a fiddle played, a mattress slept in).
 */
export function abilitiesOf(good) {
  if ( !good ) return [];
  const n = good.name, k = good.kind, out = new Set();
  const sub = substanceOf(good);
  if ( k === "food" ) out.add(sub ? "eat" : "cook");
  if ( k === "drink" ) out.add(sub === "water" && /coffee beans/i.test(n) ? "cook" : "drink");
  if ( sub === "blood" ) out.add("drink");
  if ( sub === "holywater" ) { out.add("drink"); out.add("throw"); }
  if ( k === "drugs" ) {
    if ( sub === "tobacco" || sub === "cannabis" || /opium(?! pipe)|crack|hookah|pipe/i.test(n) ) out.add(sub && sub !== "unknown" ? "smoke" : "smoke");
    else if ( sub ) out.add("take");
  }
  if ( sub === "remedy" || sub === "sedative" || sub === "opiate" || sub === "stimulant" ) if ( k === "medicine" ) out.add("take");
  if ( (k === "medicine" || (k === "drugs" && /cream\b/i.test(n)) || (k === "manuals" && /medical/i.test(n))) && SUPPLIES.test(n) ) out.add("treat");
  if ( (k === "medicine" || k === "hygiene") && WEARABLE_AIDS.test(n) ) out.add("wear");
  if ( lightOf(good) ) out.add("light");
  if ( k === "light" && FIRE.test(n) ) out.add("strike");
  if ( refuelOf(good) ) out.add("refuel");
  const sealed = /sealed letter|blank cds/i.test(n);
  if ( !sealed && WRITABLE.test(n) && ["papers", "occult", "keepsake", "house", "maps"].includes(k) ) out.add("write");
  if ( !sealed && DRAWABLE.test(n) && ["papers", "occult", "house"].includes(k) ) out.add("draw");
  if ( k === "maps" ) { out.add("read"); out.add("mark"); }
  if ( ["papers", "manuals", "faith", "occult", "keepsake", "vice", "toys", "travel"].includes(k) && READABLE.test(n) ) out.add("read");
  if ( (k === "papers" || k === "manuals") && !out.has("read") && !out.has("write") && /\b(book|letter|novel)\b/i.test(n) ) out.add("read");
  if ( out.has("write") || out.has("draw") ) out.add("read");
  if ( k === "cloth" && /needle case|hank of thread/i.test(n) ) out.add("fix");
  else if ( ["cloth", "valuables"].includes(k) || (k === "accessories" && /holster|sling/i.test(n)) ) out.add("wear");
  if ( (k === "toys" || k === "faith") && INSTRUMENTS.test(n) ) out.add("play");
  if ( k === "toys" && PLAYERS.test(n) ) out.add("switchon");
  if ( (k === "toys" || k === "vice") && GAMES.test(n) && !out.has("play") ) out.add(k === "vice" ? "gamble" : "game");
  if ( k === "vice" ) out.add("gamble");
  if ( k === "tech" ) {
    if ( PHONES.test(n) ) out.add("call");
    if ( RECORDERS.test(n) ) out.add("record");
    if ( CAMERAS.test(n) ) out.add("photograph");
    if ( LOOKERS.test(n) ) out.add("search");
    if ( PLAYERS.test(n) || /laptop|tablet|computer|deck|calculator|typewriter|projector|lantern and slides|gps|pin\b|drive|fitness/i.test(n) ) out.add("switchon");
    if ( /typewriter/i.test(n) ) out.add("write");
    if ( !out.size ) out.add("switchon");
  }
  if ( (k === "house" || k === "travel") && BEDS.test(n) ) out.add("sleep");
  if ( k === "tools" ) out.add(LOOKERS.test(n) ? "search" : "fix");
  if ( k === "faith" && !out.has("play") ) out.add("pray");
  if ( k === "occult" ) out.add(/tarot|crystal ball|planchette|talking board|mirror|astrolabe|trumpet|ghost-finding|hag stone/i.test(n) ? "divine" : "ward");
  if ( k === "hygiene" ) { if ( DISGUISE.test(n) ) out.add("disguise"); else if ( !WEARABLE_AIDS.test(n) ) out.add("wash"); }
  if ( k === "kitchen" ) out.add("cook");
  if ( k === "seeds" ) out.add("plant");
  if ( k === "fuel" && !refuelOf(good) ) out.add("burn");
  if ( k === "keepsake" && !out.size ) out.add("read");
  if ( k === "travel" && /canteen|waterskin/i.test(n) ) out.add("drink");
  if ( k === "papers" && /quill|fountain pen|pencil|typewriter/i.test(n) ) out.add("letter");
  if ( k === "papers" && /sealing wax/i.test(n) ) out.add("seal");
  if ( /floppy|usb stick|data chip|hard drive|blank cds/i.test(n) ) out.add("record");
  if ( k === "toys" && !out.size && /doll|horse|soldier|bear|figure|plush|figurine|balloon|pom poms|toy/i.test(n) ) out.add("game");
  if ( k === "light" && /glow ?stick/i.test(n) ) out.add("switchon");
  if ( k === "accessories" && /scope|laser sight|flashlight/i.test(n) ) out.add("search");
  if ( k === "medicine" && /sunscreen/i.test(n) ) out.add("wash");
  if ( k === "house" && /tin bath|washboard/i.test(n) ) out.add("wash");
  if ( k === "house" && /mirror/i.test(n) ) out.add("disguise");
  return [...out].filter(a => ABILITIES[a]);
}

/**
 * What a substance does to each line. does: feeds | waters | takes (the state goes in the body) | treats | blood |
 * sleeps | none | cannot | storyteller. sure: false waits for Ben. text: what the card says. The intoxication
 * effects on the living are house rules built on V20's notes for drugged blood (printed pp. 301-302).
 */
const living = ["mortal", "ghoul", "werewolf", "mage", "changeling", "hunter", "mummy", "demon", "revenant"];
const asMortal = ["mortal", "ghoul", "mage", "hunter", "revenant"];
function row(cells) { return Object.fromEntries(LINES.map(l => [l, cells[l] ?? {does: "storyteller", sure: false}])); }
const ST = {does: "storyteller", sure: false};
const NOBODY = {does: "cannot", sure: true, text: "A wraith has no body to take it into."};
const DEADMEAT = {does: "none", sure: true, text: "A vampire's dead body takes nothing from it; drugs reach the Kindred only through a vessel's blood (V20 printed pp. 301-302)."};

export const STATES = {
  drunk: {label: "Drunk", text: "−1 die to Dexterity and Intelligence pools for every two drinks, fading by one die an hour (house rule after V20 printed p. 301)."},
  stimulant: {label: "Wired", text: "Wide awake: tiredness from lost sleep is set aside for the scene, then a crash: −1 die to all pools until the character sleeps (house rule)."},
  opiate: {label: "Dulled", text: "−2 dice to Dexterity and Ability pools for the scene, and pain feels far off (house rule after V20 printed p. 302)."},
  sedative: {label: "Drowsy", text: "−2 dice to all pools; a Stamina roll (difficulty 7) or asleep within the hour (house rule)."},
  hallucinogen: {label: "Seeing things", text: "Pools drop by 1 to 3 as the Storyteller decides, with visions that seem real (house rule after V20 printed p. 301)."},
  cannabis: {label: "Mellow", text: "−1 die to Perception and Wits pools for the scene (house rule)."},
  tobacco: {label: "A smoke", text: "A calming smoke; no game effect."},
  caffeine: {label: "Alert", text: "A warm drink that keeps the eyes open; no game effect beyond the drink."},
  remedy: {label: "Medicine", text: "It does for the ailment what it does for anyone; the Storyteller says what that is."}
};
/** The state a feeding vampire finds in the blood afterwards (wodx-actions vesselState, V20 printed pp. 301-302). */
export const VESSEL_STATE = {drunk: "drunk", stimulant: "stimulant", opiate: "opiate", sedative: "opiate", hallucinogen: "hallucinogen"};

function drugRow(state, {changeling = true} = {}) {
  const takes = {does: "takes", state, sure: true};
  const cells = {vampire: DEADMEAT, wraith: NOBODY};
  for ( const l of asMortal ) cells[l] = takes;
  if ( changeling ) cells.changeling = {...takes, text: "As for anyone: the changeling's mortal seeming feels it."};
  return row(cells);
}

export const EFFECTS = {
  food: row({...Object.fromEntries(["mortal", "ghoul", "werewolf", "mage", "changeling", "hunter", "revenant"].map(l => [l, {does: "feeds", sure: true}])),
    vampire: {does: "none", sure: true, text: "The dead stomach cannot keep it down; it comes back up within the hour unless the vampire has the Eat Food merit, and it never nourishes (V20, Merits and Flaws, Eat Food)."},
    wraith: NOBODY}),
  water: row({...Object.fromEntries(["mortal", "ghoul", "werewolf", "mage", "changeling", "hunter", "revenant"].map(l => [l, {does: "waters", sure: true}])),
    vampire: {does: "none", sure: true, text: "The dead stomach cannot keep it down; it comes back up within the hour unless the vampire has the Eat Food merit (V20, Merits and Flaws, Eat Food)."},
    wraith: NOBODY}),
  caffeine: row({...Object.fromEntries(["mortal", "ghoul", "werewolf", "mage", "changeling", "hunter", "revenant"].map(l => [l, {does: "waters", state: "caffeine", sure: true}])),
    vampire: DEADMEAT, wraith: NOBODY}),
  alcohol: (() => { const r = drugRow("drunk"); for ( const l of LINES ) if ( r[l].does === "takes" ) r[l] = {...r[l], waters: true}; return r; })(),
  stimulant: drugRow("stimulant"),
  opiate: drugRow("opiate"),
  sedative: drugRow("sedative"),
  hallucinogen: drugRow("hallucinogen", {changeling: false}),
  cannabis: drugRow("cannabis"),
  tobacco: drugRow("tobacco"),
  remedy: row({...Object.fromEntries(["mortal", "ghoul", "mage", "changeling", "hunter", "revenant"].map(l => [l, {does: "takes", state: "remedy", sure: true}])),
    vampire: DEADMEAT, wraith: NOBODY}),
  unknown: row({}),
  blood: row({vampire: {does: "blood", sure: true, text: "A pint of cold blood: one blood point. Bagged blood feeds like any other (house rule: a pint is a point, as a body of ten pints holds ten)."},
    ghoul: {does: "none", sure: true, text: "Only a vampire's blood keeps a ghoul; mortal blood does nothing for it."},
    ...Object.fromEntries(["mortal", "mage", "changeling", "hunter", "revenant"].map(l => [l, {does: "none", sure: true, text: "A mouthful of cold blood: nothing but nausea."}])),
    wraith: NOBODY}),
  holywater: row({...Object.fromEntries(["mortal", "ghoul", "mage", "changeling", "hunter", "revenant", "werewolf"].map(l => [l, {does: "none", sure: true, text: "Water, and a comfort to the faithful."}])),
    wraith: NOBODY}),
  care: row({...Object.fromEntries(living.filter(l => !["mummy", "demon", "werewolf"].includes(l)).map(l => [l, {does: "treats", sure: true}])),
    wraith: NOBODY}),
  bed: row({...Object.fromEntries(["mortal", "ghoul", "werewolf", "mage", "changeling", "hunter", "revenant"].map(l => [l, {does: "sleeps", sure: true}])),
    vampire: {does: "none", sure: true, text: "A vampire's day sleep is its own; a bed is only a place to lie (WoDX Actions, Daytime)."},
    wraith: NOBODY})
};
export const EFFECT_LABELS = {food: "Food", water: "Water and soft drinks", caffeine: "Coffee and tea", alcohol: "Alcohol", stimulant: "Stimulants",
  opiate: "Opiates", sedative: "Sedatives", hallucinogen: "Hallucinogens", cannabis: "Cannabis", tobacco: "Tobacco", remedy: "Medicines and pills",
  unknown: "An unknown drug", blood: "Bagged blood", holywater: "Holy water", care: "First aid supplies (the patient)", bed: "A bed"};

/** Ben's rulings from the desk: {[substance]: {[line]: {does, state?, text?}}}. Laid over EFFECTS. */
export const RULINGS = {};

/** What a substance does to a line: {does, state, text, sure}. */
export function effectFor(sub, line) {
  const base = EFFECTS[sub]?.[line] ?? ST, ruled = RULINGS[sub]?.[line];
  return ruled ? {...base, ...ruled, sure: true} : base;
}

/** Which effects row an ability on a good uses. */
export function effectKeyOf(good, ability) {
  if ( ability === "treat" ) return "care";
  if ( ability === "sleep" ) return "bed";
  return substanceOf(good);
}

/** Pages kept in a thing: [{kind, text, img, by, at}]. Clean the list as stored. */
export function normPages(list) {
  return (Array.isArray(list) ? list : []).filter(p => p && (String(p.text ?? "").trim() || p.img)).map(p => ({
    kind: ["writing", "drawing", "mark", "recording", "picture"].includes(p.kind) ? p.kind : "writing",
    text: String(p.text ?? "").slice(0, 4000), img: String(p.img ?? "").slice(0, 400), by: String(p.by ?? ""), at: Number(p.at) || 0
  }));
}
export const PAGE_LABELS = {writing: "Writing", drawing: "A drawing", mark: "A mark", recording: "A recording", picture: "A picture"};

/** Whether using the ability spends one of the stack. */
export function spends(good, ability) {
  const a = ABILITIES[ability];
  if ( !a ) return false;
  if ( a.uses ) return true;
  if ( ["eat", "drink", "take", "smoke", "refuel", "throw"].includes(ability) ) return !/glass syringe|hookah|clay pipe|opium pipe|electronic cigarette|canteen|waterskin/i.test(good?.name ?? "");
  if ( ability === "treat" ) return SPENT.test(good?.name ?? "");
  return false;
}

/**
 * Library 0.10.0: how strong a made drug or medicine is (Storyteller's recipes set flags.wodx-storyteller.strength
 * from the successes past the goal; house rule, B950). Impure is told to the Storyteller only.
 */
export const STRENGTH_TEXT = {
  weak: "Weaker than usual: it does less and wears off sooner (house rule).",
  strong: "Stronger than usual: one more difficulty on any roll to resist it, and it lasts longer (house rule).",
  impure: "Impure: it was botched in the making. The Storyteller decides what that does, from nothing to sickness or poisoning."
};

/** Common check difficulty change for first aid with supplies: −1 with something to treat with (house rule). */
export const CARE_DIFF = -1;

/** The line for the table: "Ana drinks claret." */
export function useLine(who, ability, thing) {
  const a = ABILITIES[ability];
  return `${who} ${a?.verb ?? "uses"} ${thing}.`;
}
