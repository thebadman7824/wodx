/**
 * The night's tables: encounters by era, kind of place, time of night and world layer, rumours by era, and the story
 * aids (dreams, visions, auguries, foreshadowings, relics, fetishes and talismans). Drafted once for the Storyteller to
 * read and edit; they install as Roll Tables in the folder "WoDX tables" and the world's own copies win.
 * Every line is a prompt for the Storyteller to play, never words for a character to speak.
 */
const T = (id, name, lines, era = null) => ({id, name, era, results: lines.map(l => (Array.isArray(l) ? {text: l[0], weight: l[1]} : {text: l, weight: 1}))});
const MED = ["medieval", "ancient"], EM = ["early-modern"], IND = ["industrial"], MOD = ["modern"];

/* ---- the time of night: how a draw opens ---- */
const hours = [
  T("night.hour.early", "Night: early", [
    "Lamps are still being lit.", "The last of the day's trade is packing up.", "Supper smoke hangs over the roofs.",
    "The bells have only just rung the hour.", "People are still about, hurrying home.", "Doors are being barred one by one."]),
  T("night.hour.deep", "Night: the dead hours", [
    "The streets are empty but for the wind.", "Even the dogs have gone quiet.", "Only the watch is awake, and not all of them.",
    "The moon is high and the town holds its breath.", "Every window is dark.", "Footsteps carry a long way at this hour."]),
  T("night.hour.late", "Night: before dawn", [
    "The sky in the east is not yet grey, but soon.", "Bakers' fires are being stoked.", "The first carts creak toward the market.",
    "Birds stir before the light.", "The cold is at its worst.", "Somewhere a cock crows too early."])
];

/* ---- encounters in town (streets, markets, gates, homes) ---- */
const town = [
  T("night.encounter.town", "Encounter in town (medieval)", [
    "The watch, two with lanterns and a pike, asks who goes there and why.",
    "A friar hurries past with the sacrament for someone dying; all are expected to kneel.",
    "A drunk tanner's apprentice picks a fight with the nearest stranger.",
    "A cart has lost a wheel across the lane; the carter begs for a strong back.",
    "A door stands open on a dark house, and nobody answers a call.",
    "A beggar by the church steps knows more than a beggar should, for a coin.",
    "Pigs loose in the street, and their owner chasing them with a stick.",
    "A woman of the town, or a man, offers company and has seen something odd tonight.",
    "A Jewish physician is being followed by three youths with stones.",
    "A merchant's guard swears blind they saw a man walk through the town wall.",
    "Fresh blood on the snow or the cobbles, leading to a cellar grate.",
    "A child alone and crying, who will not say where home is.",
    ["A Kindred of the city watches from a rooftop and lets themselves be seen.", 2],
    ["A ghoul on an errand, carrying a sealed letter and plainly afraid of being late.", 2]
  ], MED),
  T("night.encounter.town", "Encounter in town (early modern)", [
    "A night watchman with a lantern and a rattle calls the hour and eyes the strangers.",
    "A sedan chair halts; the passenger inside wants a word, through the curtain.",
    "A press gang or a recruiting party works the taverns for fresh bodies.",
    "Students from the university are singing, armed, and looking for trouble.",
    "A preacher on a barrel warns of the end of days to an audience of three.",
    "A coach rattles past too fast and someone falls from it, or is thrown.",
    "A house is shuttered for plague, a cross on the door, and someone inside is knocking.",
    "A pamphleteer is pasting up sheets that will hang them if the wrong person reads them.",
    "A duel at the end of the alley, by torchlight, with two seconds and no surgeon.",
    "A thief cutting purses at the playhouse door runs straight into the characters.",
    ["A Kindred's herald stops the characters with an invitation they would be wise to accept.", 2],
    ["A witch-finder's man is asking at doors about a woman who lives alone.", 2]
  ], EM),
  T("night.encounter.town", "Encounter in town (industrial)", [
    "A constable on the beat shines a bull's-eye lantern in every face.",
    "A cab horse has bolted and the cab is on its side, the fare inside hurt.",
    "Fog off the river swallows the gas lamps; someone is walking close behind.",
    "A match girl or a news boy is selling the last of the day and has heard something.",
    "A gin palace spills a brawl onto the pavement.",
    "A body-snatcher's cart, the shovels badly hidden under sacking.",
    "A spiritualist's lit window, and a séance in full swing inside.",
    "A factory whistle at the wrong hour, and men running toward the works.",
    "A respectable gentleman is coming out of a house no respectable gentleman visits.",
    "Two navvies are carrying a long bundle that drips.",
    ["A Kindred of the Camarilla is holding court in a private dining room upstairs, and has noticed the characters.", 2],
    ["A Pinkerton or a private enquiry agent is following someone the characters know.", 2]
  ], IND),
  T("night.encounter.town", "Encounter in town (modern)", [
    "A patrol car slows down alongside, window lowering.",
    "A club queue around the block; a bouncer waves the characters to the front for no clear reason.",
    "Someone is filming on a phone, and the characters are in the shot.",
    "A car alarm goes off down the street and nobody comes.",
    "A delivery rider has crashed and lies in the road, the bike's wheel still turning.",
    "A homeless camp under the overpass; one of them recognises a character.",
    "A late bus is empty but for one passenger who never looks up.",
    "Sirens, blue lights, and police tape around a building the characters know.",
    "A drunk hen or stag party adopts the characters as new friends.",
    "Someone is spray-painting a sign on a wall that a Kindred would recognise.",
    ["A Kindred's retainer pulls up in a dark car and asks the characters to get in.", 2],
    ["A hunter with a crossbow in a sports bag is asking the doorman about closing time.", 2]
  ], MOD)
];

/* ---- encounters in the wilds and on the roads ---- */
const wilds = [
  T("night.encounter.wilds", "Encounter in the wilds (medieval)", [
    "Wolves howl close, then closer. Real wolves, or not.",
    "Pilgrims at a roadside shrine share their fire and their fears.",
    "Outlaws in the trees ask a toll for the road.",
    "A charcoal burner's hut, the burner long dead and the fire still warm.",
    "A knight's party rides hard past, one rider wounded and slumped.",
    "A gallows at the crossroads with a fresh body, and something feeding on it.",
    "A shepherd counts the flock again and comes up two short.",
    "A ford that was shallow yesterday is running high and black.",
    "Lights in the marsh that move against the wind.",
    "A standing stone that was not on this hill last time.",
    ["A Garou in wolf shape trots beside the road, keeping pace, watching.", 2],
    ["A fae revel in a ring of mushrooms; music no ear should hear.", 2]
  ], MED),
  T("night.encounter.wilds", "Encounter in the wilds (early modern)", [
    "A highwayman, masked and polite, wants the purse and the watch.",
    "A coaching inn with every window lit and no ostler in the yard.",
    "Soldiers deserting from a lost campaign, hungry and armed.",
    "A gibbet on the heath, and a crow that speaks a word.",
    "A woodcutter's family begging shelter from something in the forest.",
    "A burnt farmhouse, and a cradle rocking in the ashes.",
    "Gypsies or travellers camped by the river warn the characters off the road ahead.",
    "A post rider's horse wanders up riderless, saddle bags full of letters.",
    ["A werewolf hunter's dogs bay in the hills, and the hunters are coming this way.", 2],
    ["A Lupine's mark is cut into an oak at the edge of its territory.", 2]
  ], EM),
  T("night.encounter.wilds", "Encounter in the wilds (industrial)", [
    "A train stops in open country for no reason, and the guard walks the track with a lamp.",
    "A tinker's wagon with the horse unharnessed and gone.",
    "Gamekeepers with shotguns looking for a poacher, and not fussy about whom they find.",
    "A railway cutting where a navvy gang was buried by a fall last spring.",
    "A lighthouse keeper's lamp is out, and a ship's bell rings offshore.",
    "A mine shaft fenced off with new timber and old warnings.",
    "Hop pickers or harvest hands singing round a fire, a stranger among them.",
    "A posse riding out after someone, rifles across their saddles.",
    ["A Garou caern's guardian blocks the path and asks the characters' business.", 2],
    ["A Pentex survey team's camp, the generator humming in the dark.", 2]
  ], IND),
  T("night.encounter.wilds", "Encounter in the wilds (modern)", [
    "A car broken down on the hard shoulder, hazards blinking, driver nowhere.",
    "Headlights in the mirror that keep the same distance, mile after mile.",
    "A petrol station open all night, the attendant very glad of company.",
    "Hunters' trail cameras strapped to the trees, red lights blinking.",
    "A rave in a quarry, bass carrying for miles.",
    "A deer in the road, frozen in the lights; something larger behind it.",
    "Police roadblock, torches, and questions about where the characters were last night.",
    "A wind farm's blades turning slow and silent with every red light out.",
    ["A Garou pack on the move, in human shape, in a battered van.", 2],
    ["A logging company's fresh clear-cut, and the spirits of the place are furious.", 2]
  ], MOD)
];

/* ---- the Penumbra and the Shadowlands (era-free; the place's own past shows through) ---- */
const other = [
  T("night.encounter.penumbra", "Encounter in the Penumbra", [
    "A Gafling of the local Wyld spirit asks what the characters are doing in its place.",
    "A Pattern Spider is spinning over the main street; the Weaver's webs are thicker than last time.",
    "A Bane coils in the shadow of a slaughterhouse or a factory, fat and sleepy.",
    "Lunes drift past toward the moon's light, chiming.",
    "A spirit of the river is sick and asks for a cleansing.",
    "Another pack's moon bridge flares and closes nearby.",
    "The Gauntlet here has thinned since last month, and something is pressing through.",
    "An Epiphling of fear clings to a house where a murder happened.",
    "A Glade child-spirit plays in the ruins of an old shrine and wants a game.",
    "A spirit of the city's walls or streets offers a trade: a favour for a secret.",
    ["Wyrm-tainted spirits are gathering at a crossroads, as if waiting for a summons.", 2]
  ]),
  T("night.encounter.shadowlands", "Encounter in the Shadowlands", [
    "A Hierarchy patrol of legionnaires asks for the characters' marks and their reasons.",
    "A newly dead soul wanders, still trying to open doors, and does not know.",
    "Renegades are cutting a Spectre's chains from a fetter to free it, or to use it.",
    "A Haunter in the attic of an old house is playing with the living below.",
    "The Shroud thins over the hospital or the battlefield; the Tempest howls close.",
    "A Doomed soul is fading at their fetter and asks for one last message carried.",
    "Spectres circle a fresh grave like crows.",
    "A Heretic preacher of the Far Shores gathers a small crowd.",
    "Reapers argue over a dying soul still hours from death.",
    "A Nephwrack's laughter echoes from a well, and every wraith nearby moves away.",
    "A Ferryman's lantern on the river; the boat waits for someone.",
    ["A Maelstrom's edge brushes the Shadowlands: a cold wind that tears at Corpus.", 1]
  ])
];

/* ---- rumours by era ({{place}} and {{person}} are filled from the chronicle) ---- */
const rumours = [
  T("night.rumour", "Rumours (medieval)", [
    "The miller at {{place}} sold flour to a stranger who paid in coin no one recognises.",
    "{{person}} was seen at the church door at midnight, and the priest has not been seen since.",
    "Cattle near {{place}} are found drained and pale each morning.",
    "The bishop's men are asking about witches, and someone gave them {{person}}'s name.",
    "A pedlar swears {{place}} had a fire in the night, but there is no ash.",
    "{{person}} has come into money, and no one knows how.",
    "There will be a feast at the castle, and the lord has invited people no one knows.",
    "Wolves were heard inside the walls at {{place}}.",
    "A grave at {{place}} has been dug up and filled again.",
    "{{person}} is sick and will not let the physician in."
  ], MED),
  T("night.rumour", "Rumours (early modern)", [
    "A pamphlet names {{person}} as a sorcerer and the magistrate has read it.",
    "The plague is back at {{place}}, they say, but the council keeps it quiet.",
    "{{person}} owes money to someone who does not lend to the living.",
    "There is a room at {{place}} where the candles burn blue.",
    "A ship came in without its crew and the harbour master burned the log.",
    "{{person}} has been seen on two sides of town at the same hour.",
    "The new governor keeps strange hours and stranger guests.",
    "Something was walled up in the cellar at {{place}} when it was rebuilt.",
    "The witch-finder is coming, and someone sent for them by name.",
    "A duel at dawn at {{place}}, and one of the duellists is not what they seem."
  ], EM),
  T("night.rumour", "Rumours (industrial)", [
    "The newspapers say a beast is loose near {{place}}, and the police deny it.",
    "{{person}} has joined a society that meets at {{place}} after midnight.",
    "Workers at the mill are going missing on the night shift.",
    "A medium at {{place}} gives messages from the dead that come true.",
    "{{person}} is selling a house cheap, and no one will say why.",
    "The new railway line was rerouted around a churchyard, and the engineer resigned.",
    "Body-snatchers have been busy at {{place}}, and the doctors pay well.",
    "{{person}} has been seen at the opera with someone dead these ten years.",
    "A strike is coming, and someone powerful wants it to turn bloody.",
    "The fog at {{place}} has a smell no one can place."
  ], IND),
  T("night.rumour", "Rumours (modern)", [
    "A video from {{place}} went viral and then vanished from every site.",
    "{{person}} has been posting things at four in the morning that make no sense.",
    "Police are keeping quiet about three bodies found near {{place}}.",
    "A developer bought {{place}} for cash and fenced it off overnight.",
    "{{person}} has a new friend who never shows up in photographs.",
    "There is a club that only opens on nights with no moon.",
    "The blood bank at the hospital keeps coming up short.",
    "{{person}} was seen getting into a car with diplomatic plates.",
    "Something is living in the tunnels under {{place}}, the urban explorers say.",
    "A protest at {{place}} turned violent and no one can say who started it."
  ], MOD)
];

/* ---- story aids: dreams, visions, auguries, foreshadowings ---- */
const symbols = [
  T("aid.symbol", "Symbols (medieval)", ["a crow with a silver ring", "a broken bell", "a wolf at a chapel door", "a key made of bone", "a well full of stars",
    "a crown of thorns on a child", "a spindle that spins blood", "a ship on dry land", "a candle that burns downward", "a mirror with no reflection",
    "a lamb with two heads", "a field of red wheat"], MED),
  T("aid.symbol", "Symbols (early modern)", ["a clock with no hands", "a printed page that writes itself", "a masked dancer", "a ship's figurehead weeping",
    "a gallows hung with ribbons", "an hourglass full of ash", "a letter sealed in black wax", "a cracked portrait", "a horse with no rider",
    "a garden of glass flowers"], EM),
  T("aid.symbol", "Symbols (industrial)", ["a locomotive with no driver", "a telegram from the dead", "a gas lamp guttering green", "a factory chimney breathing",
    "a photograph that changes", "a music box playing backward", "a top hat full of water", "a crowd of umbrellas", "a doll with a key in its back",
    "a lighthouse in a city street"], IND),
  T("aid.symbol", "Symbols (modern)", ["a phone ringing in an empty room", "a screen of static that shows a face", "a car with no headlights", "a lift that only goes down",
    "a security camera turning to follow", "a neon sign spelling a name", "a subway map with one stop too many", "a glass of milk turning red",
    "a power line humming a tune", "a child's drawing of the characters"], MOD)
];
const frames = [
  T("aid.dream", "Dreams", [
    "{{actor}} dreams of {{place}}, but older and empty, and {aid.symbol} waits at the centre of it.",
    "In the dream {{person}} is calling from far off, and every step toward them brings {aid.symbol} closer.",
    "{{actor}} dreams of a meal at a long table; {{person}} sits at the head, and in front of every guest lies {aid.symbol}.",
    "A dream of falling into {{place}}, and landing softly among {aid.symbol}.",
    "{{actor}} is a child again in the dream, hiding from {{person}}, holding {aid.symbol}.",
    "The dream is only a sound: bells, then silence, then {aid.symbol} spoken aloud."]),
  T("aid.vision", "Visions", [
    "The world tilts and {{actor}} sees {{place}} as the spirits do: {aid.symbol} burns there like a beacon.",
    "For a heartbeat {{actor}} sees through other eyes: {{person}}'s, looking at {aid.symbol}.",
    "Moonlight shows a path from where {{actor}} stands to {{place}}, and {aid.symbol} lies across it.",
    "Gaia's voice is a weight, not words; the image left behind is {aid.symbol} over {{place}}.",
    "A totem's shape stands in the smoke and turns its head toward {{person}}."]),
  T("aid.augury", "Auguries", [
    "The signs say: what was lost at {{place}} will be found, and it will cost {aid.symbol}.",
    "Birds fly the wrong way over {{place}}: a bad omen for {{person}}.",
    "The entrails, the cards or the stars agree on one thing: {aid.symbol}.",
    "The omen is plain: three nights from now, {{person}} and {aid.symbol}.",
    "Water in a bowl clouds and clears to show {{place}} at dawn."]),
  T("aid.foreshadow", "Foreshadowings", [
    "The threads of fate around {{person}} are fraying; {aid.symbol} is where they part.",
    "{{actor}} feels the Fate of {{place}}: something there will end soon, by fire or by rot.",
    "Death's shadow lies on {{person}}, faint, but closer than it was.",
    "The Shadow whispers that {aid.symbol} is the key, and for once it may be telling the truth.",
    "A Fatalism glimpse: {{actor}} at {{place}}, older, alone, holding {aid.symbol}."])
];

/* ---- relics, fetishes and talismans (names and hooks; the rating is set by the Storyteller) ---- */
const things = [
  T("aid.relic", "Relics", [
    "a finger bone of a local saint in a silver reliquary", "a strip of cloth from a martyr's shroud", "a pilgrim's badge from a shrine that burned",
    "a wooden cross carved by a hermit who never ate meat", "a cup a holy woman drank from on the last day of a long life", "a rosary of olive stones from the Holy Land",
    "a hymnal its owner held while the house burned around them", "a bell that rang on its own the night the plague broke"]),
  T("aid.fetish", "Fetishes", [
    "a wolf's tooth bound with red thread, home to a spirit of the hunt", "a river stone that holds a spirit of the current",
    "a carved staff with a crow spirit in its knots", "a drum with a thunder spirit in the skin", "a knife of black glass holding a spirit of the night",
    "a necklace of finger bones with an ancestor spirit bound inside", "a mirror shard that carries a spirit of the moon", "a feather cloak with a wind spirit in its seams"]),
  T("aid.talisman", "Talismans", [
    "a ring engraved with the names of the seven planets", "a brass astrolabe that sometimes turns by itself", "a book whose ink never dries",
    "a deck of cards that deals the same hand to liars", "a pocket watch that runs a minute ahead of fate", "a wand of rowan wound with copper wire",
    "a phial of quicksilver that will not spill", "an old photograph that shows the room as it will be"])
];

export const NIGHT_TABLES = [...hours, ...town, ...wilds, ...other, ...rumours, ...symbols, ...frames, ...things];
