/**
 * WoDX Chronicle 0.37.0: four ideas taken from the Princes of Darkness mod for Crusader Kings III (ideas only; no
 * text, art or code copied, and its 5th edition material left out). Rules in scripts/pod-rules.mjs, the Foundry side
 * in scripts/pod.mjs. Every date below is history; the Kindred side follows V20, V20 Dark Ages and Revised.
 */

/** City Masquerade exposure: the bands, lowest first. `court` marks the band where a strict court acts. */
export const EXPOSURE_BANDS = [
  {key: "quiet", label: "Quiet", min: 0, note: "Nothing anyone would repeat."},
  {key: "whispers", label: "Whispers", min: 3, note: "Odd stories in the taverns and the kitchens."},
  {key: "talk", label: "Talk", min: 6, note: "People name streets and nights. The careful Kindred stay in."},
  {key: "watched", label: "Watched", min: 10, note: "Hunters and the faithful ask questions. The court can't let this stand."},
  {key: "hunted", label: "Hunted", min: 15, note: "Searches, burnings and raids on havens. Every Kindred in the city is at risk."}
];
/** Each sect's law: the band at which the court of the city acts on its own. */
export const SECT_LAW = {
  camarilla: {label: "Camarilla", acts: "watched", note: "The Masquerade is the first law: the court acts early and hard."},
  sabbat: {label: "Sabbat", acts: "hunted", note: "The Sword cares for the Masquerade only when the kine come with torches."},
  anarch: {label: "Anarch", acts: "hunted", note: "A barony acts late, and argues first."},
  independent: {label: "No sect", acts: "hunted", note: "Nobody keeps the law here but the Kindred who would burn with the rest."},
  church: {label: "Church of Caine (before 1435)", acts: "watched", note: "The old princes of the Long Night guard the silence as the Camarilla will."}
};
/** Days of quiet that lower exposure by one. */
export const QUIET_DAYS = 7;
/** The first printed news sheets (Strasbourg, 1605) carry a breach further: one more point a breach from then on. */
export const PRINT_YEAR = 1605;
/** The court card's enforcement: what bringing a culprit to heel lowers the city's exposure by. */
export const HEEL_DROP = 3;

/** Great cities and the Moravian towns, each with dated states. `tags` feed Senses and map generation. */
const st = (from, label, text, tags = [], smell = "", sound = "") => ({from, label, text, tags, smell, sound});
export const CITIES = [
  {key: "constantinople", label: "Constantinople", also: ["istanbul", "byzantium"], states: [
    st(0, "The Queen of Cities", "The Greek empire's capital, whole and rich, the greatest city of Christendom.", ["rich", "crowded"], "incense and the fish market", "bells and the harbour"),
    st(1204, "Sacked and held by the Latins", "The Fourth Crusade has looted the city. Latin lords hold a hollowed capital; whole quarters stand burned.", ["ruin", "occupied", "poor"], "old burning and damp stone", "too few voices for so many streets"),
    st(1261, "Retaken by the Greeks", "Michael VIII is back in the city. It is Greek again, but smaller and poorer than before the sack.", ["poor", "mending"], "lime mortar and the harbour", "masons at work"),
    st(1453, "Taken by the Ottomans", "Mehmed II has stormed the walls. The city becomes the Ottoman capital and fills again.", ["occupied", "rising", "crowded"], "spice and woodsmoke", "the call to prayer"),
    st(1923, "No longer a capital", "The new republic rules from Ankara. Istanbul stays the largest city, but the court is gone.", ["modern", "crowded"], "exhaust and the Bosphorus", "ferries and traffic")]},
  {key: "rome", label: "Rome", states: [
    st(0, "The Pope's city", "Ruins of the ancients stand among churches and towers of quarrelling families.", ["ruin", "holy"], "incense and the Tiber", "church bells"),
    st(1309, "Without its Pope", "The papacy sits at Avignon. Rome shrinks; the noble families fight in its empty quarters.", ["poor", "lawless", "ruin"], "mud and neglect", "dogs and quarrels"),
    st(1377, "The Pope returns", "Gregory XI brings the papacy home. Building and pilgrims return slowly.", ["holy", "mending"], "incense and mortar", "pilgrims' hymns"),
    st(1527, "Sacked by the Emperor's army", "Unpaid imperial troops loot the city for months. Thousands die.", ["ruin", "occupied", "plague"], "smoke and the dead", "soldiers' songs"),
    st(1528, "Rebuilt by the popes", "The great age of papal building: domes, squares and fountains.", ["holy", "rich", "rising"], "fresh stone and fountains", "fountains and carriages"),
    st(1870, "Capital of Italy", "The Kingdom of Italy takes the city and makes it its capital.", ["modern", "rising"], "coal smoke", "trams"),
    st(1943, "Under German occupation", "The German army holds Rome until the Allies arrive on 4 June 1944.", ["occupied", "war"], "fear and diesel", "boots and curfew silence"),
    st(1944, "The Eternal City", "A modern capital over its ruins.", ["modern", "crowded"], "exhaust and espresso", "scooters")]},
  {key: "paris", label: "Paris", states: [
    st(0, "Philip Augustus's city", "The king walls the city and paves its streets; the university grows on the left bank.", ["rising", "crowded"], "the Seine and tanneries", "students and carts"),
    st(1420, "Held by the English", "English and Burgundian rule after Troyes; the king is elsewhere.", ["occupied", "poor"], "hunger", "patrols"),
    st(1436, "French again", "Charles VII's men retake the city.", ["mending"], "the Seine and tanneries", "markets"),
    st(1789, "Revolution", "The Bastille falls. Clubs, mobs and the guillotine rule the streets until 1795.", ["lawless", "war"], "blood on cobbles", "crowds and drums"),
    st(1795, "The capital of an empire", "The Directory, then Napoleon. Old streets and new monuments.", ["rising", "crowded"], "horses and coal", "carriages"),
    st(1853, "Haussmann's Paris", "The prefect tears down the old quarters for boulevards, sewers and parks.", ["modern", "rising"], "gaslight and plaster dust", "demolition and omnibuses"),
    st(1870, "Siege and Commune", "The Prussian siege, then the Commune and its bloody end in May 1871.", ["war", "ruin", "lawless"], "smoke and hunger", "cannon"),
    st(1871, "The city of light", "The Third Republic's Paris: cafés, exhibitions, the Métro from 1900.", ["modern", "rich", "crowded"], "coffee and coal", "the Métro"),
    st(1940, "Under German occupation", "The German army enters on 14 June 1940 and leaves on 25 August 1944.", ["occupied", "war"], "rationed bread", "curfew silence"),
    st(1944, "Paris", "A modern capital.", ["modern", "crowded", "rich"], "exhaust and bakeries", "traffic")]},
  {key: "baghdad", label: "Baghdad", states: [
    st(0, "City of the Caliphs", "The Abbasid caliph's seat, smaller than in its golden age but still a great city of learning.", ["rich", "holy", "crowded"], "dates, ink and the river", "the call to prayer"),
    st(1258, "Sacked by the Mongols", "Hülegü's army destroys the city and kills the last caliph. The libraries burn.", ["ruin", "occupied", "poor"], "river mud and ash", "silence over rubble"),
    st(1401, "Sacked again by Timur", "Timur's army returns the city to ruin.", ["ruin", "poor"], "ash", "wind"),
    st(1534, "An Ottoman city", "Suleiman takes Baghdad; it becomes a frontier province.", ["occupied", "mending"], "the river and spice", "garrison drums"),
    st(1917, "Taken by the British", "British troops enter in March 1917; Iraq is made a kingdom under them.", ["occupied", "modern"], "oil and dust", "motor lorries"),
    st(2003, "Invaded", "The American invasion takes the city in April 2003; years of fighting follow.", ["war", "occupied", "lawless"], "smoke and diesel", "helicopters")]},
  {key: "cairo", label: "Cairo", states: [
    st(0, "Saladin's city", "The Ayyubid sultans rule from the Citadel.", ["rich", "crowded", "holy"], "the Nile and spice", "markets"),
    st(1250, "The Mamluk capital", "The slave soldiers take the throne. Cairo is the greatest city of Islam.", ["rich", "crowded", "rising"], "spice and smoke", "the call to prayer"),
    st(1348, "The plague", "The Black Death kills a third of the city.", ["plague", "poor"], "the dead", "funeral cries"),
    st(1349, "The Mamluk capital", "The city recovers slowly under the sultans.", ["crowded", "mending"], "the Nile and spice", "markets"),
    st(1517, "An Ottoman province", "Selim I takes Egypt; Cairo rules for Istanbul.", ["occupied"], "the Nile", "markets"),
    st(1798, "The French", "Bonaparte's army holds the city until 1801.", ["occupied", "war"], "gunpowder and the Nile", "drums"),
    st(1801, "Cairo", "Ottoman, then the khedives' city, then a modern capital.", ["crowded", "modern"], "the Nile and exhaust", "traffic and calls to prayer")]},
  {key: "jerusalem", label: "Jerusalem", states: [
    st(0, "Saladin's Jerusalem", "Taken from the crusaders in 1187; Muslim rule, pilgrims of every faith.", ["holy", "occupied"], "incense and dust", "pilgrims and bells"),
    st(1229, "Christian again by treaty", "Frederick II gets the city back without a battle; its walls stay down.", ["holy", "poor"], "dust", "uneasy markets"),
    st(1244, "Sacked by the Khwarazmians", "Horsemen sack the city; it falls back to Muslim rule for good.", ["ruin", "holy"], "smoke", "lament"),
    st(1260, "A Mamluk city", "Quiet, holy and poor.", ["holy", "poor"], "olive wood and dust", "prayer"),
    st(1517, "An Ottoman city", "Suleiman builds the walls that still stand (1537 to 1541).", ["holy", "mending"], "stone dust", "masons"),
    st(1917, "British rule", "General Allenby enters in December 1917.", ["holy", "occupied", "modern"], "dust and motor oil", "lorries"),
    st(1948, "Divided", "War splits the city between two states until 1967.", ["war", "holy"], "dust", "sniper fire"),
    st(1967, "Jerusalem", "One city under Israel after the Six-Day War.", ["holy", "modern", "crowded"], "spice and exhaust", "traffic and bells")]},
  {key: "prague", label: "Prague", also: ["praha"], states: [
    st(0, "The Přemyslid seat", "Castle, bridge and market town of the Bohemian dukes and kings.", ["rising"], "the Vltava and woodsmoke", "the market"),
    st(1348, "Charles IV's capital", "The emperor founds the New Town and the university; the city becomes the heart of the Empire.", ["rich", "rising", "crowded"], "fresh stone and beer", "students and masons"),
    st(1419, "The Hussite wars", "The first Defenestration starts years of religious war.", ["war", "lawless"], "smoke", "chorales and drums"),
    st(1436, "A Bohemian city", "The wars end; the city rebuilds.", ["mending"], "the Vltava", "markets"),
    st(1583, "Rudolf II's court", "The emperor's city of alchemists, astronomers and painters.", ["rich", "rising"], "sulphur and incense", "court music"),
    st(1618, "War again", "The second Defenestration, the White Mountain (1620) and thirty years of war.", ["war", "occupied", "poor"], "smoke and the dead", "drums"),
    st(1648, "A Habsburg city", "Baroque churches over a Catholic, German-speaking capital.", ["holy", "mending"], "incense", "bells"),
    st(1918, "Capital of Czechoslovakia", "The new republic is proclaimed on 28 October 1918.", ["modern", "rising"], "coal and beer", "trams"),
    st(1939, "Under German occupation", "The Wehrmacht enters on 15 March 1939 and leaves in May 1945.", ["occupied", "war"], "fear", "boots"),
    st(1945, "A communist capital", "The party takes power in 1948; tanks return in August 1968.", ["occupied", "poor"], "brown coal", "quiet streets"),
    st(1989, "The free city", "The Velvet Revolution, then tourists by the million.", ["modern", "crowded", "rich"], "beer and exhaust", "crowds and trams")]},
  {key: "brno", label: "Brno", also: ["brünn"], states: [
    st(0, "A castle and its market", "Spilberk above a growing market town of the Moravian margraves.", ["rising"], "woodsmoke and the river", "the market"),
    st(1243, "A royal town", "Wenceslas I grants the town its charter.", ["rising", "crowded"], "beer and tanneries", "the market"),
    st(1645, "Besieged by the Swedes", "Torstenson's army fails before the walls from May to August 1645.", ["war"], "powder smoke", "cannon"),
    st(1646, "A fortress town", "Spilberk becomes a fortress, then a prison.", ["mending"], "woodsmoke", "the garrison"),
    st(1839, "The Moravian Manchester", "The railway to Vienna opens; cloth mills fill the town.", ["modern", "rising", "crowded"], "coal and wet wool", "looms and trains"),
    st(1939, "Under German occupation", "Occupied with Bohemia and Moravia until April 1945.", ["occupied", "war"], "fear", "boots"),
    st(1945, "After the war", "The German citizens are driven out in May 1945; the city is Czech.", ["poor", "mending"], "brown coal", "quiet streets"),
    st(1989, "Brno", "A modern university city.", ["modern", "crowded"], "exhaust and coffee", "trams")]},
  {key: "olomouc", label: "Olomouc", also: ["olmütz"], states: [
    st(0, "The bishop's city", "The old Moravian capital, seat of a bishop since 1063.", ["holy", "rising"], "incense and woodsmoke", "bells"),
    st(1642, "Held by the Swedes", "Swedish troops hold the city from 1642 to 1650 and leave it half empty.", ["occupied", "war", "ruin"], "smoke", "patrols"),
    st(1650, "A fortress city", "Rebuilt, walled, and baroque.", ["mending", "holy"], "mortar and incense", "bells"),
    st(1758, "Besieged by Prussia", "Frederick II fails to take the fortress.", ["war"], "powder smoke", "cannon"),
    st(1759, "The fortress", "A garrison and cathedral city; an archbishop from 1777.", ["holy"], "incense", "bells"),
    st(1848, "The emperor's refuge", "The court flees Vienna to the city; Franz Joseph takes the throne here in December 1848.", ["rich"], "horses and incense", "carriages and cheering"),
    st(1849, "Olomouc", "A quiet cathedral and university town.", ["holy"], "incense and beer", "bells")]}
];

/** Golconda as a long road: steps from setting out to the threshold. */
export const GOLCONDA_STEPS = 10;
export const GOLCONDA_SETBACKS = {
  kill: {steps: 2, label: "took a life"},
  frenzy: {steps: 1, label: "gave in to the Beast"},
  theft: {steps: 1, label: "stole"},
  harm: {steps: 1, label: "fed until the vessel was hurt, or by force"}
};
/** Days of a mentor's teaching on the clock for one step. */
export const MENTOR_DAYS = 30;

/** Story chains: dated runs of scenes. `from`/`to` limit the years a chain can start; `days` is the gap before a step. */
const step = (key, title, text, days = 7) => ({key, title, text, days});
export const CHAINS = [
  {key: "serpent-faith", label: "A Setite corrupts a faith", lines: ["vampire"], from: 1197, to: 2100, page: "V20 p. 53 (pdf 61)", steps: [
    step("arrive", "A new preacher", "A Follower of Set settles near a shrine, church or meeting house and starts to help its poor.", 0),
    step("vice", "The first sins", "Members of the faithful start to meet the newcomer at night. A pious leader takes a vice.", 14),
    step("schism", "The split", "The congregation divides over a new teaching. Pick the side the Setite feeds.", 21),
    step("temple", "A hidden temple", "The Setite's followers dig or buy a cellar under the faith's own house.", 30),
    step("fall", "The faith turns", "The faith now serves the Setite, or the characters have broken it. The Corruption ledger shows who fell.", 30)]},
  {key: "anarch-revolt", label: "The Anarch Revolt", lines: ["vampire"], from: 1381, to: 1493, page: "V20 p. 45 (pdf 53)", steps: [
    step("murmurs", "Murmurs of the young", "Neonates talk in the dark about killing their sires.", 0),
    step("first-blood", "An elder dies", "A local elder is found destroyed, the work of a childe and friends.", 14),
    step("take-sides", "Sides", "The court demands that every Kindred in the city declare.", 14),
    step("siege", "The haven burns", "Anarchs and their ghouls storm an elder's haven.", 21),
    step("terms", "Terms", "A truce, a purge, or the city falls to the anarchs. Thorns is near (1493).", 30)]},
  {key: "black-death", label: "The Black Death comes", lines: ["all"], from: 1347, to: 1353, page: "Wraith 20th p. 34 (pdf 99)", steps: [
    step("ships", "News of ships", "Merchants speak of a sickness in the southern ports.", 0),
    step("first", "The first dead", "Swellings, fever and death in three days. The vessels are dying.", 14),
    step("flight", "Flight and blame", "The rich flee; the poor blame strangers and Jews. Mobs gather.", 14),
    step("silence", "Empty streets", "Half the city is gone. Feeding is hard and the Shroud is thin.", 30),
    step("after", "After", "The survivors are fewer and bolder; wages rise; the dead walk the Shadowlands in crowds.", 60)]},
  {key: "inquisition", label: "The Inquisition comes to town", lines: ["all"], from: 1231, to: 1834, page: "Hunter Hunted 2nd p. 117 (pdf 118)", steps: [
    step("friar", "A friar asks questions", "A preaching friar arrives and asks after night-walkers and witches.", 0),
    step("grace", "The time of grace", "Citizens are invited to confess and to name others.", 14),
    step("arrests", "Arrests", "A herbalist, a widow and a servant of a Kindred are taken.", 14),
    step("trial", "The trial", "Under question, a servant names a master.", 14),
    step("fire", "The fire", "Someone burns, guilty or not. The court must decide how to answer.", 7)]},
  {key: "antediluvian", label: "Hunt for an Antediluvian", lines: ["vampire"], from: 1493, to: 1999, page: "V20 pp. 30, 34 (pdf 38, 42)", steps: [
    step("rumour", "A sign", "A Sabbat priest says a sleeping elder of the Third Generation lies nearby.", 0),
    step("lore", "Old writings", "Records, Noddist fragments or a ghost point to a place.", 21),
    step("rivals", "Rivals", "Others want the sleeper too: a Methuselah's pawns, a Tremere, a hunter.", 14),
    step("crypt", "The crypt", "The way in is found. Something guards it.", 21),
    step("waking", "What wakes", "The Storyteller decides what lies there, if anything.", 7)]},
  {key: "week-nightmares", label: "The Week of Nightmares", lines: ["vampire", "werewolf", "mage", "changeling", "wraith"], from: 1999, to: 1999, page: "Clanbook: Ravnos (Revised) p. 45 (pdf 41)", steps: [
    step("dreams", "Dreams", "Kindred, Garou and sensitives share dreams of a red star and a waking giant.", 0),
    step("news", "News from India", "Something has risen in the east. Kindred elders go silent.", 2),
    step("red-star", "The red star", "Anyone who looks up sees the red star.", 2),
    step("after", "After", "The world has changed for the Ravnos. The Storyteller says what else did.", 3)]}
];

/** Opening goals for a new character, by line and two ages (before 1800, then from 1800). */
const g = (key, label) => ({key, label});
export const GOALS = {
  vampire: [[g("domain", "Win a domain of your own from the Prince"), g("sire", "Learn why your sire chose you"), g("boon", "Free yourself of a boon owed to an elder")],
    [g("domain", "Claim a hunting ground in the new city"), g("elder", "Find out what an elder hides"), g("status", "Win Status in the court")]],
  werewolf: [[g("renown", "Earn your first Renown by deed"), g("caern", "Protect a caern from the woodcutters and the Wyrm"), g("pack", "Find a pack and a totem")],
    [g("renown", "Earn your first Renown by deed"), g("caern", "Stop a company from poisoning a caern"), g("kin", "Keep your Kinfolk safe")]],
  mage: [[g("mentor", "Find a mentor who will teach the next Sphere"), g("node", "Claim a node or a library"), g("order", "Learn what the Order of Reason plans")],
    [g("mentor", "Find a mentor who will teach the next Sphere"), g("chantry", "Earn a place in a chantry"), g("enemy", "Learn which Convention watches you")]],
  changeling: [[g("freehold", "Win a place in a freehold"), g("oath", "Swear a first oath to a noble"), g("dream", "Find a dreamer to feed your Glamour")],
    [g("freehold", "Win a place in a freehold"), g("dream", "Save an artist from Banality"), g("chimera", "Learn what a lost chimera wants")]],
  wraith: [[g("fetter", "Save a fetter from destruction"), g("guild", "Find a Guild to teach you"), g("passion", "Settle a Passion left undone")],
    [g("fetter", "Save a fetter from destruction"), g("legion", "Earn a place in the legion"), g("passion", "Settle a Passion left undone")]],
  hunter: [[g("proof", "Prove to others what you saw"), g("ally", "Find another who knows the truth"), g("kill", "Destroy the thing that killed someone you loved")],
    [g("proof", "Get proof that will stand up"), g("cell", "Find others who hunt"), g("kill", "Destroy the thing that killed someone you loved")]],
  mortal: [[g("living", "Make a living in hard times"), g("secret", "Learn what walks at night"), g("family", "Keep your family fed and safe")],
    [g("living", "Make a living in the new city"), g("secret", "Learn what walks at night"), g("family", "Keep your family safe")]]
};
