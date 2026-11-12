/**
 * WoDX Creation 0.11.0: lifepaths, one scene for every splat (clan, bloodline, tribe, auspice, Breed, Tradition,
 * Convention, House, Fellowship, kith, court, guild, Legion, creed, Amenti, House of the Fallen, Dharma, Shade...).
 * The keys follow the Splat Features Desk so the two can be read together. WoDX's own words.
 *
 * spans: the turning years the splat can be taken in ([[from, to]]; none means every era). Rows with house: true
 * use a WoDX reading where the books give no clear year; each is listed in docs/PENDING-REVIEW.md (B1312).
 * Options: [label, gives, person] where gives is "bg Name|ab Name|merit Name|flaw Name|note Text" and person is
 * "role|what they were to you".
 */
const opt = ([label, g = "", p = null, text = ""]) => ({label, g, ...(p ? {p} : {}), ...(text ? {text} : {})});
const sp = (key, label, title, text, options, x = {}) => ({key, label, ...x, beat: {title, text, options: options.map(opt)}});
const ALL = undefined;
const DA = [[1100, 1499]];
const SABBAT = [[1493, 2300]];
const TRAD = [[1466, 2300]];
const REASON = [[1325, 1896]];
const TECH = [[1897, 2300]];
const SIDHE = [[1100, 1400], [1969, 2300]];
const IMBUED = [[1999, 2300]];
const FALLEN = [[1999, 2300]];

/* ------------------------------------------------------------------ */
/*  Vampire                                                            */
/* ------------------------------------------------------------------ */
const vampire = [
  sp("toreador", "Toreador", "A Muse", "Your sire loved beauty and thought you were part of it.", [
    ["Your art made you immortal", "ab Expression|bg Fame", "a patron|who bought your early work"],
    ["Your face did", "ab Etiquette|bg Herd", "an admirer|who still keeps your portrait"]]),
  sp("setite", "Followers of Set", "The temple", "Your sire spoke of a god in the dark, and offered you every pleasure on the way to Set.", [
    ["You took the offer", "ab Occult|bg Herd", "a cultist|who brought you to the temple"],
    ["You wanted the secrets more than the pleasures", "ab Subterfuge|ab Occult"]], {match: ["setite", "set", "followers of set", "follower of set"]}),
  sp("brujah", "Brujah", "A cause", "Your sire was an idealist, a brawler, or both, and wanted someone who would argue back.", [
    ["You argued", "ab Expression|ab Politics", "a sparring partner|from the old debates"],
    ["You fought", "ab Brawl|merit Tough"]]),
  sp("gangrel", "Gangrel", "Out on the road", "Your sire found you far from town walls and never brought you back to them.", [
    ["You learned the wild", "ab Survival|ab Animal Ken", "an animal|that has followed you since"],
    ["You kept moving", "ab Athletics|flaw Hunted"]]),
  sp("malkavian", "Malkavian", "What you saw", "Your sire heard you talking to someone who was not there, and smiled.", [
    ["You were mad before", "ab Awareness|note A derangement you brought with you"],
    ["The blood made you so", "ab Occult|note A derangement the blood gave you", "the doctor|who treated you in life"]]),
  sp("nosferatu", "Nosferatu", "The mirror", "On the first night you saw what the blood had done to your face.", [
    ["You went below", "ab Stealth|bg Contacts", "a sewer rat|who guided you through the warrens"],
    ["You raged at it", "flaw Nightmares|merit Iron Will"]]),
  sp("tremere", "Tremere", "The chantry", "You were chosen for your mind and tested in a cold stone room.", [
    ["You passed high", "ab Occult|bg Mentor", "your regent|who is watching you rise"],
    ["You passed, barely", "ab Academics|flaw Enemy", "a rival apprentice|who wanted your place"]]),
  sp("tzimisce", "Tzimisce", "The voivode's hall", "Your sire took you into an old house in the east and showed you how flesh may be shaped.", [
    ["You took to it", "ab Medicine|note Soil from your birthplace", "a ghoul servant|of the old house"],
    ["You were shaped first", "flaw Nightmares|merit Tough"]]),
  sp("ventrue", "Ventrue", "Worthy", "Your sire weighed your blood, your name and your money, and found them adequate.", [
    ["You brought wealth", "bg Resources|bg Influence"],
    ["You brought a title", "bg Status|ab Etiquette", "a family steward|who still manages the estate"]]),
  sp("lasombra", "Lasombra", "The abyss", "Your sire spoke of the darkness under everything and dared you to look.", [
    ["You looked", "ab Occult|merit Iron Will"],
    ["You served the Church first", "ab Theology|bg Contacts", "a bishop|you once served"]]),
  sp("assamite", "Assamite", "Alamut", "You were taken east to a fortress in the mountains and taught three things: judge, kill, learn.", [
    ["A warrior", "ab Melee|ab Stealth"],
    ["A vizier", "ab Academics|ab Crafts"],
    ["A sorcerer", "ab Occult"]], {match: ["assamite", "banu haqim", "children of haqim"]}),
  sp("ravnos", "Ravnos", "On the road", "Your sire was a traveller with quick hands and quicker lies.", [
    ["You learned to lie", "ab Subterfuge|ab Performance", "a travelling companion|from the caravan"],
    ["You learned to steal", "ab Larceny|ab Stealth"]]),
  sp("cappadocian", "Cappadocian", "The question of death", "Your sire wanted to know what death is, and thought you might help find out.", [
    ["You studied the dead", "ab Medicine|ab Occult", "a gravedigger|who sold you bodies"],
    ["You were a scholar of the soul", "ab Theology|ab Academics"]], {spans: [[1100, 1444]]}),
  sp("giovanni", "Giovanni", "The family", "You were born into the family, or married into it, and the Embrace was a reward for decades of service.", [
    ["A family banker", "bg Resources|ab Finance", "a cousin|who handles the family accounts"],
    ["A family necromancer", "ab Occult|note A ghost bound to you"]], {spans: [[1444, 2300]]}),
  sp("caitiff", "Caitiff", "Nobody's child", "No sire stayed, and no clan claimed you.", [
    ["You found others like you", "bg Allies", "another clanless|who shared a haven"],
    ["You made your own way", "ab Survival|ab Streetwise"]], {match: ["caitiff", "clanless"]}),
  sp("baali", "Baali", "The pact", "Your sire made you the price of a bargain with something under the world.", [
    ["You serve it gladly", "ab Occult|flaw Dark Secret"],
    ["You want out", "flaw Hunted|flaw Nightmares"]]),
  sp("salubri", "Salubri", "The third eye", "Your sire was a healer, and Embraced you to carry on the work.", [
    ["A healer", "ab Medicine|ab Empathy"],
    ["A warrior", "ab Melee|merit Iron Will"]], {match: ["salubri", "salubri healer", "salubri warrior"]}),
  sp("daughters", "Daughters of Cacophony", "The song", "Your sire heard your voice and could not let it end.", [
    ["You sing for the city", "ab Performance|bg Fame"],
    ["You sing for your sire", "ab Performance|flaw Obsession"]], {spans: [[1550, 2300]], house: true, match: ["daughters of cacophony"]}),
  sp("gargoyle", "Gargoyle", "Made in stone", "You were made by Tremere hands from more than one clan's blood.", [
    ["You serve the chantry", "ab Alertness|flaw Enemy", "a Tremere master|who made you"],
    ["You are free", "ab Athletics|flaw Hunted"]]),
  sp("kiasyd", "Kiasyd", "Under the glass", "Your sire was tall, pale and fond of books, and something fae ran in the blood.", [
    ["A librarian", "bg Library|ab Academics"],
    ["A wanderer in the Dreaming", "ab Occult|ab Enigmas"]]),
  sp("samedi", "Samedi", "The Baron's laugh", "You died and rotted, and a laughing corpse taught you to like it.", [
    ["An assassin", "ab Stealth|ab Melee"],
    ["A houngan of the dead", "ab Occult|ab Theology"]], {spans: [[1700, 2300]], house: true}),
  sp("truebrujah", "True Brujah", "Without passion", "Your sire felt nothing and taught you to feel nothing.", [
    ["You study time", "ab Academics|ab Occult"],
    ["You hunt the false clan", "ab Melee|flaw Enemy"]], {match: ["true brujah"]}),
  sp("harbingers", "Harbingers of Skulls", "Back from the dark", "Your sire came up from the Underworld with bone masks and old grudges.", [
    ["You serve their return", "ab Occult|ab Intimidation"],
    ["You were a ghost first", "note Memories of the Shadowlands|ab Awareness"]], {spans: [[1990, 2300]], house: true}),
  sp("ahrimanes", "Ahrimanes", "The land's spirits", "Your sire made pacts with the spirits of the land and wanted another to keep them.", [
    ["You keep the pacts", "ab Occult|bg Allies"],
    ["You break one", "flaw Enemy (spirit)"]], {spans: SABBAT, house: true}),
  sp("anda", "Anda", "The horde", "You rode with the warband and were Embraced at its fire.", [
    ["You ride still", "ab Ride|ab Survival", "a horse|that knew you before and after"],
    ["You were left behind", "flaw Hunted|ab Survival"]], {spans: DA}),
  sp("lhiannan", "Lhiannan", "The grove", "Your sire kept the old Celtic rites at a grove that few remember.", [
    ["A priest of the grove", "ab Occult|bg Herd"],
    ["The last of the rite", "flaw Hunted|ab Survival"]], {spans: [[1100, 1600]], house: true}),
  sp("noiad", "Noiad", "Under the water", "Your sire lived by the sea and fed on sailors.", [
    ["You learned the tides", "ab Athletics|ab Survival"],
    ["You learned the ships", "ab Streetwise|bg Contacts"]]),
  sp("bloodbrothers", "Blood Brothers", "Made in a vat", "You do not remember your face before. You share it with your circle now.", [
    ["You serve the Sabbat", "ab Brawl|bg Allies"],
    ["You want to remember", "flaw Amnesia|merit Iron Will"]], {spans: [[1500, 2300]], house: true}),
  sp("salubriat", "Salubri antitribu", "The rage of the eye", "Your sire fought for the Sabbat and against the Tremere.", [
    ["A warrior", "ab Melee|flaw Enemy"],
    ["A spy", "ab Stealth|ab Subterfuge"]], {spans: SABBAT, match: ["salubri antitribu"]}),
  sp("koldun", "Koldun", "Of the earth", "Your sire spoke to the spirits of fire and frost in the old way.", [
    ["You learned the elements", "ab Occult|ab Survival"],
    ["You learned the boyars' politics", "ab Politics|bg Status"]], {match: ["koldun", "koldunic"]}),
  sp("assamitecastes", "Assamite caste", "Your caste", "At Alamut you were sorted into a caste before your first sunset.", [
    ["Vizier", "ab Academics|ab Crafts"],
    ["Sorcerer", "ab Occult|bg Mentor"]], {match: ["vizier", "assamite sorcerer"]}),
  sp("lamia", "Lamia", "The goddess", "Your sire was a priest who guarded the Cappadocians and served a dark goddess.", [
    ["A guardian", "ab Melee|ab Alertness"],
    ["A temple servant", "ab Occult|ab Theology"]], {spans: [[1100, 1450]], house: true}),
  sp("nagaraja", "Nagaraja", "Flesh-eaters", "Your sire fed on flesh as well as blood and knew the dead.", [
    ["A scholar of the dead", "ab Occult|ab Academics"],
    ["A hungry thing", "flaw Dark Secret|ab Survival"]]),
  sp("smallothers", "A small bloodline", "A rare blood", "Your sire's blood is rare. Few Kindred have heard of it.", [
    ["You keep the secret", "ab Subterfuge|flaw Dark Secret"],
    ["You use the mystery", "bg Status"]], {match: ["bloodline"]}),
  sp("smalllines", "Another bloodline", "An odd blood", "A lesser line of Kindred took you in.", [
    ["Proud of it", "bg Status"],
    ["Hiding it", "ab Subterfuge"]]),
  sp("akunanse", "Akunanse", "The storytellers", "Your sire carried the stories of the Laibon.", [
    ["You keep the stories", "ab Expression|ab Academics"],
    ["You walk with the beasts", "ab Animal Ken|ab Survival"]]),
  sp("guruhi", "Guruhi", "Ruled by the old", "Your sire served an old Laibon lord.", [
    ["A courtier", "ab Politics|bg Status"],
    ["A soldier", "ab Melee|ab Brawl"]]),
  sp("ishtarri", "Ishtarri", "The feast", "Your sire loved pleasure and spent it freely.", [
    ["A host", "ab Etiquette|bg Herd"],
    ["A wanderer", "ab Streetwise|ab Performance"]]),
  sp("kinyonyi", "Kinyonyi", "The birds", "Your sire kept the shapes of birds and the silence of hunters.", [
    ["A scout", "ab Alertness|ab Stealth"],
    ["A messenger", "ab Athletics|bg Contacts"]]),
  sp("naglopers", "Naglopers", "The sickness", "Your sire was a creature of rot that the other Laibon fear.", [
    ["You embrace it", "ab Occult|flaw Enemy"],
    ["You hide it", "ab Subterfuge|flaw Dark Secret"]]),
  sp("osebo", "Osebo", "The leopard", "Your sire was a warlord who wore a leopard's shape.", [
    ["A soldier", "ab Brawl|ab Intimidation"],
    ["An heir", "bg Status|ab Leadership"]]),
  sp("shango", "Shango", "The storm", "Your sire called the lightning.", [
    ["A priest of thunder", "ab Occult|ab Theology"],
    ["A soldier of the storm", "ab Melee|merit Tough"]]),
  sp("xidundu", "Xi Dundu", "The shadow", "Your sire spoke from shadows, and the shadows answered.", [
    ["A schemer", "ab Subterfuge|ab Politics"],
    ["A sorcerer", "ab Occult"]]),
  sp("vipers", "Vipers", "Snakes in the grass", "A sect of Setite renegades took you in.", [
    ["You hunt for them", "ab Stealth|ab Investigation"],
    ["You hide from Set", "flaw Hunted|ab Subterfuge"]], {house: true})
];

/* ------------------------------------------------------------------ */
/*  Ghoul                                                              */
/* ------------------------------------------------------------------ */
const ghoul = [
  sp("retainer", "A household retainer", "The house", "You serve one master in one house.", [
    ["You run the house", "ab Bureaucracy|bg Resources"],
    ["You guard it", "ab Melee|ab Alertness"]], {match: ["retainer"]}),
  sp("independent", "An independent ghoul", "No master", "Your domitor died, or you ran. Now you take blood where you can.", [
    ["You steal it", "ab Larceny|flaw Hunted"],
    ["You trade for it", "ab Streetwise|bg Contacts", "a vampire|who sells you blood"]], {match: ["independent"]}),
  sp("sabbatghoul", "A Sabbat ghoul", "The pack's dog", "A pack keeps you to guard its haven by day.", [
    ["Loyal", "ab Brawl|merit Tough"],
    ["Waiting for a chance", "ab Subterfuge|flaw Dark Secret"]], {spans: SABBAT}),
  sp("corpghoul", "A corporate asset", "Company blood", "A corporation pays you in vitae and ownership.", [
    ["Security", "ab Firearms|note Someone owns your contract"],
    ["Executive", "bg Resources|ab Finance"]], {spans: [[2023, 2300]]})
];

/* ------------------------------------------------------------------ */
/*  Revenant families                                                  */
/* ------------------------------------------------------------------ */
const rev = (key, label, place) => sp(key, label, "The family", `You were born into ${label}. ${place}`, [
  ["The family's pride", "bg Status|bg Resources", "the family's eldest|who decides your tasks"],
  ["The family's shame", "flaw Enemy|ab Subterfuge", "a cousin|who reports on you"]]);
const revenant = [
  rev("bratovich", "the Bratovich", "Hunters, dog-breeders and killers in the Carpathian hills."),
  rev("dhabi", "the D'Habi", "Scholars who hold their master's secrets and their own."),
  rev("ducheski", "the Ducheski", "Keepers of an old Tzimisce sorcery."),
  rev("enrathi", "the Enrathi", "A family who serves the Ravnos on the road."),
  rev("grimaldi", "the Grimaldi", "Bankers and diplomats of the Mediterranean."),
  rev("kairouan", "the Kairouan Brotherhood", "Hidden servants of an old North African master."),
  rev("obertus", "the Obertus", "Monks and scholars in quiet houses."),
  rev("oprichniki", "the Oprichniki", "Hunters of heretics with the tsars' old cruelty."),
  rev("rafastio", "the Rafastio", "Sorcerers bound to the moon."),
  rev("rossellini", "the Rossellini", "Necromancers in service to the dead."),
  rev("anushin", "the Servants of Anushin-Rawan", "Servants of a Persian founder."),
  sp("newfamily", "A family made in play", "The founder", "The family is new, founded by a master the chronicle knows.", [
    ["The first of the line", "bg Status|note The founding year and trait", "the founder|who began the family"],
    ["One of the first children", "bg Allies"]], {house: true})
];

/* ------------------------------------------------------------------ */
/*  Werewolf: tribes, auspices, Breeds, Fera and Hengeyokai            */
/* ------------------------------------------------------------------ */
const tribe = (key, label, title, text, a, b, x = {}) => sp(key, label, title, text, [a, b], x);
const werewolf = [
  tribe("blackfuries", "Black Furies", "The grove", "The Furies took you to a grove that has never let a lord's law in.", ["You guard it", "ab Survival|bg Rites"], ["You avenge wrongs", "ab Brawl|flaw Enemy", "someone you avenged|who owes you"]),
  tribe("bonegnawers", "Bone Gnawers", "The heap", "The poor took you in and fed you scraps.", ["You live among them", "ab Streetwise|bg Allies", "a beggar|who knows all the news"], ["You scavenge", "ab Survival|ab Larceny"]),
  tribe("childrengaia", "Children of Gaia", "The peacemakers", "The Children taught you to heal before you learned to kill.", ["A healer", "ab Medicine|ab Empathy"], ["A mediator", "ab Etiquette|bg Contacts"]),
  tribe("fianna", "Fianna", "The songs", "You were raised on the old songs and the old ale.", ["A singer", "ab Performance|bg Fame"], ["A fighter", "ab Brawl|ab Melee"]),
  tribe("fenris", "Get of Fenris", "Proven", "Your tribe fought you before they welcomed you.", ["You won", "ab Brawl|merit Tough"], ["You lost, and rose again", "merit Iron Will|flaw Enemy"], {match: ["get of fenris", "fenrir"]}),
  tribe("glasswalkers", "Glass Walkers", "The city", "Your tribe lives in the towns and loves what humans make.", ["The machines", "ab Technology|ab Computer"], ["The money", "bg Resources|ab Finance"], {match: ["glass walkers", "iron riders"]}),
  tribe("redtalons", "Red Talons", "The wild pack", "Wolves who hate what humans did to the world.", ["You hunt humans", "ab Brawl|flaw Hunted"], ["You guard the wild", "ab Survival|ab Animal Ken"]),
  tribe("shadowlords", "Shadow Lords", "Thunder and ambition", "Your tribe wants to rule, and you were raised to help.", ["A schemer", "ab Politics|ab Subterfuge"], ["A storm-caller", "ab Occult|bg Totem"]),
  tribe("silentstriders", "Silent Striders", "The road", "Your tribe has no home and walks the roads of the dead.", ["A messenger", "ab Athletics|bg Contacts"], ["A seer of ghosts", "ab Occult|flaw Haunted"]),
  tribe("silverfangs", "Silver Fangs", "Royal blood", "Your blood is pure and your sept expects you to rule.", ["Proud", "bg Pure Breed|ab Leadership"], ["Mad", "bg Pure Breed|note A derangement in the line"]),
  tribe("stargazers", "Stargazers", "The stars", "Your tribe sits still and looks at the sky.", ["A mystic", "ab Enigmas|ab Occult"], ["A martial artist", "ab Martial Arts|ab Brawl"]),
  tribe("uktena", "Uktena", "Secrets", "Your tribe keeps buried things buried.", ["A keeper of banes", "ab Occult|bg Fetish"], ["A seeker of lore", "ab Enigmas|ab Investigation"]),
  tribe("wendigo", "Wendigo", "The cold north", "Your tribe guards the peoples of the north of the Americas.", ["A warrior", "ab Survival|ab Brawl"], ["A spirit-talker", "ab Occult|bg Totem"]),
  tribe("croatan", "Croatan", "The east coast", "Your tribe guards the people of the eastern woods of the Americas.", ["A guardian", "ab Survival|bg Rites"], ["A spirit-talker", "ab Occult|bg Totem"], {spans: [[1100, 1590]], house: true}),
  tribe("bunyip", "Bunyip", "The Dreamtime", "Your tribe guards the waters of the southern land.", ["A singer of the land", "ab Survival|ab Occult"], ["The last of them", "flaw Hunted|merit Iron Will"], {spans: [[1100, 1920]], house: true}),
  tribe("bsd", "Black Spiral Dancers", "The Labyrinth", "You danced the spiral and came out the other side changed.", ["Faithful to the Wyrm", "ab Occult|flaw Dark Secret"], ["Lost in it", "note A derangement from the Labyrinth"], {match: ["black spiral", "black spiral dancers"]}),
  tribe("lost", "Ronin (lost cub)", "No tribe", "No tribe would have you, or you would have none of them.", ["Alone", "ab Survival|flaw Hunted"], ["With other outcasts", "bg Allies"], {match: ["ronin", "lost cub"]}),
  tribe("ragabash", "Ragabash", "The new moon", "Born under the new moon, you question everything.", ["A trickster", "ab Subterfuge|ab Stealth"], ["A scout", "ab Alertness|ab Larceny"]),
  tribe("theurge", "Theurge", "The crescent moon", "Born under the crescent moon, you talk to spirits.", ["A mystic", "ab Enigmas|bg Rites"], ["A healer", "ab Medicine|ab Occult"]),
  tribe("philodox", "Philodox", "The half moon", "Born under the half moon, you judge.", ["A judge", "ab Law|ab Etiquette"], ["A mediator", "ab Empathy|bg Contacts"]),
  tribe("galliard", "Galliard", "The gibbous moon", "Born under the gibbous moon, you sing the deeds.", ["A singer", "ab Performance|bg Fame"], ["A keeper of lore", "ab Expression|ab Academics"]),
  tribe("ahroun", "Ahroun", "The full moon", "Born under the full moon, you fight.", ["A warrior", "ab Brawl|ab Melee"], ["A leader", "ab Leadership|merit Tough"]),
  tribe("breeds", "Breed (homid, metis, lupus)", "Your Breed", "How you were born shapes how the Garou see you.", ["Homid", "ab Streetwise|bg Contacts"], ["Lupus", "ab Survival|ab Animal Ken"], {match: ["homid", "lupus", "metis"]}),
  tribe("ajaba", "Ajaba", "The hyena", "You were born among the hyena-folk of Africa.", ["A hunter", "ab Survival|ab Brawl"], ["A survivor of the war", "flaw Enemy|merit Iron Will"]),
  tribe("ananasi", "Ananasi", "The spider", "You were spun from silk and blood.", ["A weaver of plans", "ab Subterfuge|ab Investigation"], ["A servant of the Queen", "bg Mentor"]),
  tribe("bastet", "Bastet", "The cat", "You were born among the werecats and their secrets.", ["A keeper of secrets", "ab Stealth|ab Investigation"], ["A wanderer", "ab Survival|ab Streetwise"]),
  tribe("corax", "Corax", "The raven", "You were hatched among the wereravens, who carry news.", ["A messenger", "bg Contacts|ab Alertness"], ["A spy", "ab Investigation|ab Stealth"]),
  tribe("gurahl", "Gurahl", "The bear", "You were born among the werebears, who heal.", ["A healer", "ab Medicine|bg Rites"], ["A sleeper in caves", "ab Survival"]),
  tribe("kitsune", "Kitsune", "The fox", "You were born a fox, or to a fox's line, in the East.", ["A trickster", "ab Subterfuge|ab Performance"], ["A courtier", "ab Etiquette|bg Status"]),
  tribe("mokole", "Mokolé", "The memory", "You carry the memories of the great reptiles.", ["A rememberer", "ab Academics|ab Occult"], ["A guardian of the rivers", "ab Survival|ab Brawl"], {match: ["mokole"]}),
  tribe("nagah", "Nagah", "The serpent", "You were born among the hidden were-serpents.", ["A judge", "ab Law|ab Stealth"], ["An assassin", "ab Melee|ab Stealth"]),
  tribe("nuwisha", "Nuwisha", "The coyote", "You were born laughing.", ["A trickster", "ab Subterfuge|ab Performance"], ["A wanderer", "ab Survival|ab Streetwise"]),
  tribe("ratkin", "Ratkin", "The rat", "You were born among the wererats in the walls of the town.", ["A scavenger", "ab Larceny|ab Stealth"], ["A plague-bringer", "ab Occult|flaw Enemy"]),
  tribe("rokea", "Rokea", "The shark", "You were born in the sea.", ["A hunter", "ab Brawl|ab Athletics"], ["One who walks on land", "ab Streetwise"]),
  tribe("apis", "Apis", "The bull", "You were born among the were-aurochs, the last of their kind.", ["A guardian of the herd", "ab Survival|ab Animal Ken"], ["The last", "flaw Hunted|merit Iron Will"], {spans: [[1100, 1400]], house: true}),
  tribe("camazotz", "Camazotz", "The bat", "You were born among the were-bats of the southern lands.", ["A scout of the night", "ab Alertness|ab Stealth"], ["The last", "flaw Hunted"], {spans: [[1100, 1600]], house: true}),
  tribe("grondr", "Grondr", "The boar", "You were born among the were-boars of the forests.", ["A cleanser", "ab Survival|ab Brawl"], ["The last", "flaw Hunted"], {spans: [[1100, 1300]], house: true}),
  tribe("hakken", "Hakken", "The dog", "You were born among the were-dogs of Japan, loyal to the courts.", ["A guard", "ab Alertness|ab Melee"], ["A hunter", "ab Survival|ab Brawl"]),
  tribe("khan", "Khan", "The tiger", "You were born among the were-tigers of the East.", ["A warrior", "ab Brawl|merit Tough"], ["A guardian", "ab Survival|ab Alertness"]),
  tribe("nezumi", "Nezumi", "The rat of the East", "You were born among the wererats of the East, who see the end coming.", ["A seer", "ab Enigmas|ab Occult"], ["A survivor", "ab Survival|ab Stealth"]),
  tribe("samebito", "Same-Bito", "The shark of the East", "You were born among the sharks of the eastern seas.", ["A warrior", "ab Brawl|ab Athletics"], ["An outcast", "flaw Enemy"]),
  tribe("zhonglung", "Zhong Lung", "The dragon", "You were born among the dragon-kin of the East.", ["A sage", "ab Academics|ab Enigmas"], ["A sleeper", "flaw Amnesia"]),
  tribe("tengu", "Tengu", "The crow of the East", "You were born among the crow-folk of Japan.", ["A messenger", "ab Athletics|bg Contacts"], ["A teacher of swords", "ab Melee|ab Martial Arts"]),
  tribe("kumo", "Kumo", "The spider of the East", "You were born to spiders that serve something dark.", ["Faithful", "ab Subterfuge|flaw Dark Secret"], ["Fleeing it", "flaw Hunted"]),
  tribe("okuma", "Okuma", "The bear of the East", "You were born among the bears of the eastern mountains.", ["A healer", "ab Medicine|ab Survival"], ["A guardian", "ab Brawl|merit Tough"]),
  tribe("beastcourts", "A Beast Court", "The court", "You were raised at a court of the shapechangers of the East.", ["A courtier", "ab Etiquette|bg Status"], ["A warrior", "ab Martial Arts|ab Brawl"])
];

/* ------------------------------------------------------------------ */
/*  Mage                                                               */
/* ------------------------------------------------------------------ */
const mage = [
  sp("akashic", "Akashic Brotherhood", "The monastery", "You were taught that the body and the mind are one road.", [["Do", "ab Martial Arts|ab Athletics"], ["Meditation", "ab Meditation|merit Iron Will"]], {spans: TRAD, match: ["akashic", "akashayana"]}),
  sp("chorus", "Celestial Chorus", "The Song", "You heard the One sing, and joined the choir.", [["A priest", "ab Theology|merit True Faith"], ["A singer", "ab Performance|ab Expression"]], {spans: TRAD, match: ["celestial chorus", "chorus", "messianic voices"]}),
  sp("ecstasy", "Cult of Ecstasy", "Beyond the limits", "You found the truth in rapture: music, dance, drugs, love.", [["A musician", "ab Performance|bg Fame"], ["A seer", "ab Awareness|flaw Addiction"]], {spans: TRAD, match: ["cult of ecstasy", "ecstasy"]}),
  sp("dreamspeakers", "Dreamspeakers", "The spirits", "The spirits spoke to you, and the Dreamspeakers taught you to answer.", [["A shaman", "ab Occult|bg Totem"], ["A wanderer", "ab Survival|bg Allies"]], {spans: TRAD}),
  sp("euthanatos", "Euthanatos", "The wheel", "You learned that death is a door, and someone must hold it.", [["A healer", "ab Medicine|ab Empathy"], ["A killer", "ab Melee|ab Stealth"]], {spans: TRAD}),
  sp("hermes", "Order of Hermes", "The Order", "You were taken into a House and taught the great Art.", [["A scholar", "ab Academics|ab Occult|bg Library"], ["A politician", "ab Politics|bg Status"]], {match: ["order of hermes", "hermetic"]}),
  sp("sonsofether", "Sons of Ether", "The aether", "You built a machine that should not work. It worked.", [["An inventor", "ab Science|ab Technology"], ["An adventurer", "ab Firearms|ab Drive"]], {spans: [[1904, 2300]], match: ["sons of ether", "society of ether"]}),
  sp("verbena", "Verbena", "The old ways", "You learned the herbs, the blood and the turning of the year.", [["A healer", "ab Medicine|ab Survival"], ["A witch", "ab Occult|bg Familiar"]], {match: ["verbena", "old faith"]}),
  sp("va", "Virtual Adepts", "The code", "You found reality in the Net and hacked it.", [["A hacker", "ab Computer|merit Computer Aptitude"], ["A dreamer", "ab Technology|ab Enigmas"]], {spans: [[1961, 2300]], match: ["virtual adepts", "virtual adept"]}),
  sp("hollow", "Hollow Ones", "The scene", "You found other lost souls in velvet and ruin.", [["A poet", "ab Expression|bg Allies"], ["A thief", "ab Larceny|ab Streetwise"]], {spans: [[1920, 2300]], house: true}),
  sp("ahl", "Ahl-i-Batin", "The Subtle Ones", "You were taken into a secret brotherhood of the mind.", [["A mystic", "ab Meditation|ab Enigmas"], ["A spy", "ab Subterfuge|ab Linguistics"]], {house: true, match: ["ahl-i-batin", "ahl i batin"]}),
  sp("itx", "Iteration X", "The Machine", "You were recruited by those who perfect the world through machines.", [["An engineer", "ab Technology|ab Science"], ["A cyborg", "merit Tough|note Implants"]], {spans: TECH, match: ["iteration x"]}),
  sp("nwo", "New World Order", "The Truth", "You were recruited by those who decide what is true.", [["An agent", "ab Subterfuge|bg Contacts"], ["A teacher", "ab Academics|ab Expression"]], {spans: TECH, match: ["new world order", "nwo"]}),
  sp("progenitors", "Progenitors", "The flesh", "You were recruited by those who perfect the body.", [["A doctor", "ab Medicine|ab Science"], ["A clone", "flaw Dark Secret|merit Tough"]], {spans: TECH}),
  sp("syndicate", "Syndicate", "The market", "You were recruited by those who rule through money.", [["A banker", "ab Finance|bg Resources"], ["An enforcer", "ab Intimidation|ab Streetwise"]], {spans: TECH}),
  sp("void", "Void Engineers", "The frontier", "You were recruited by those who explore the unknown.", [["An explorer", "ab Survival|ab Technology"], ["A border guard", "ab Firearms|ab Alertness"]], {spans: TECH, match: ["void engineers"]}),
  sp("marauders", "Marauders", "Madness", "Your Awakening went too far and took the world with it.", [["Mad and joyous", "note A Quiet that never ends|ab Enigmas"], ["Mad and afraid", "flaw Nightmares|flaw Hunted"]], {match: ["marauder", "marauders"]}),
  sp("orphans", "Orphan", "Self-taught", "No one taught you. You worked it out alone.", [["Alone", "ab Survival|ab Enigmas"], ["With a few friends", "bg Allies"]], {match: ["orphan", "orphans"]}),
  sp("nephandi", "Nephandi", "The Cauls", "You were reborn in a Caul and your Avatar turned inside out.", [["Faithful to the Abyss", "ab Occult|flaw Dark Secret"], ["Regretful", "flaw Nightmares|flaw Hunted"]]),
  sp("daFellowships", "A Dark Ages Fellowship", "Before the Council", "Before the Traditions there were Fellowships: the Messianic Voices, the Old Faith, the Spirit-Talkers and others.", [["A Messianic Voice", "ab Theology|merit True Faith"], ["Of the Old Faith", "ab Occult|ab Survival"], ["A Spirit-Talker", "ab Occult|bg Totem"]], {spans: [[1100, 1465]], match: ["messianic voices", "spirit-talkers", "spirit talkers"]}),
  sp("hBonisagus", "House Bonisagus", "The founders", "Your House holds the Order's oldest learning.", [["A researcher", "ab Academics|bg Library"], ["A teacher", "bg Allies|ab Expression"]], {match: ["bonisagus"]}),
  sp("hFlambeau", "House Flambeau", "The fire", "Your House fights with fire.", [["A warrior", "ab Melee|ab Occult"], ["A duellist", "ab Alertness|merit Iron Will"]], {match: ["flambeau"]}),
  sp("hQuaesitor", "House Quaesitor", "The judges", "Your House judges the Order.", [["A judge", "ab Law|ab Investigation"], ["An inquirer", "ab Investigation|bg Contacts"]], {match: ["quaesitor"]}),
  sp("hShaea", "House Shaea", "The world's sorcery", "Your House studies the magic of other peoples.", [["A traveller", "ab Linguistics|ab Occult"], ["A collector", "bg Library"]], {match: ["shaea"]}),
  sp("hExMisc", "House Ex Miscellanea", "The odd ones", "Your House takes in those no other House wants.", [["A hedge-witch", "ab Occult|ab Survival"], ["An outsider", "flaw Enemy|bg Allies"]], {match: ["ex miscellanea"]}),
  sp("hJanissary", "House Janissary", "The soldiers", "Your House serves as the Order's soldiers.", [["A soldier", "ab Melee|ab Leadership"], ["A guard", "ab Alertness|ab Firearms"]], {spans: [[1450, 2300]], house: true, match: ["janissary"]}),
  sp("hDiedne", "House Diedne", "The hidden house", "Your House was destroyed long ago, and yet you were taught by it.", [["A secret keeper", "ab Subterfuge|flaw Hunted"], ["A druid", "ab Occult|ab Survival"]], {house: true, match: ["diedne"]}),
  sp("hTremere", "House Tremere", "The fallen house", "Your House has taken the blood of the dead, and the Order is casting it out.", [["Loyal", "flaw Enemy|ab Occult"], ["Fleeing", "flaw Hunted"]], {spans: [[1100, 1199]], house: true}),
  sp("hOthers", "Another Hermetic House", "Another House", "A smaller House of the Order took you in.", [["A scholar", "ab Academics|ab Occult"], ["A politician", "ab Politics"]], {match: ["house"]}),
  sp("batAa", "Bata'a", "The loa", "The loa rode you and you learned their ways.", [["A houngan or mambo", "ab Occult|ab Theology"], ["A healer", "ab Medicine|bg Allies"]], {spans: [[1700, 2300]], house: true, match: ["bata'a", "bataa"]}),
  sp("childrenKnowledge", "Children of Knowledge", "The great work", "You learned alchemy from a secret fellowship.", [["An alchemist", "ab Science|ab Occult"], ["An astrologer", "ab Academics|ab Enigmas"]], {spans: [[1100, 1490]], house: true, match: ["solificati"]}),
  sp("kopaLoei", "Kopa Loei", "The islands", "The spirits of the Pacific islands took you.", [["A priest", "ab Occult|ab Theology"], ["A navigator", "ab Survival|ab Athletics"]]),
  sp("ngoma", "Ngoma", "The drum", "The ancestors of Africa spoke to you through the drum.", [["A healer", "ab Medicine|ab Occult"], ["A judge", "ab Law|bg Status"]]),
  sp("hippolyta", "Sisters of Hippolyta", "The island", "You were taken in by a sisterhood that keeps its own island.", [["A warrior", "ab Melee|ab Athletics"], ["A healer", "ab Medicine|ab Occult"]]),
  sp("taftani", "Taftani", "The weavers", "You learned to weave the world from the djinn.", [["A weaver", "ab Crafts|ab Occult"], ["A djinn-binder", "ab Occult|flaw Enemy (spirit)"]]),
  sp("templarKnights", "Knights Templar", "The Temple", "You served in the Order of the Temple and learned its secrets.", [["A knight", "ab Melee|ab Ride|merit True Faith"], ["A banker", "ab Finance|bg Resources"]], {spans: [[1100, 1312]], match: ["templar"]}),
  sp("wuLung", "Wu Lung", "The dragon court", "You served the dragons and the emperor.", [["A court sorcerer", "ab Etiquette|ab Occult"], ["A geomancer", "ab Occult|ab Science"]]),
  sp("hemKaSobk", "Hem-Ka Sobk", "The crocodile", "You served the crocodile god on the Nile.", [["A priest", "ab Theology|ab Occult"], ["A guardian", "ab Melee|ab Alertness"]]),
  sp("wuKeng", "Wu Keng", "The shadow court", "You learned magic from the dark spirits of the East.", [["A sorcerer", "ab Occult|flaw Dark Secret"], ["A spy", "ab Stealth|ab Subterfuge"]]),
  sp("valdaermen", "Valdaermen", "The runes", "You learned the runes of the north.", [["A rune-carver", "ab Crafts|ab Occult"], ["A skald", "ab Performance|bg Fame"]], {spans: [[1100, 1500]], house: true}),
  sp("orArtificers", "Artificers (Order of Reason)", "The workshop", "You joined the craftspeople of Reason.", [["An engineer", "ab Crafts|ab Technology"], ["A clockmaker", "ab Crafts|ab Science"]], {spans: REASON, match: ["artificers"]}),
  sp("cabalPure", "Cabal of Pure Thought", "The faith of Reason", "You joined those who serve Reason with faith.", [["A preacher", "ab Theology|ab Expression"], ["A knight", "ab Melee|merit True Faith"]], {spans: REASON}),
  sp("celestialMasters", "Celestial Masters", "The heavens", "You studied the heavens with Reason's astronomers.", [["An astronomer", "ab Science|ab Academics"], ["A mathematician", "ab Science|ab Enigmas"]], {spans: REASON}),
  sp("craftmasons", "Craftmasons", "The lodge", "You joined the builders.", [["A builder", "ab Crafts|bg Allies"], ["A lodge master", "ab Leadership|bg Contacts"]], {spans: REASON}),
  sp("highGuild", "High Guild", "The guild", "You joined the merchants of Reason.", [["A merchant", "ab Finance|bg Resources"], ["A banker", "ab Finance|bg Contacts"]], {spans: REASON}),
  sp("hippocratic", "Hippocratic Circle", "The physicians", "You joined the physicians of Reason.", [["A surgeon", "ab Medicine|ab Science"], ["An anatomist", "ab Medicine|flaw Dark Secret"]], {spans: REASON}),
  sp("voidSeekers", "Void Seekers", "The sea", "You sailed with Reason's explorers.", [["A navigator", "ab Survival|ab Science"], ["A cartographer", "ab Academics|ab Crafts"]], {spans: [[1450, 1896]]}),
  sp("ksirafai", "Ksirafai", "The knife", "You joined Reason's hidden killers.", [["An assassin", "ab Stealth|ab Melee"], ["A spy", "ab Subterfuge|ab Investigation"]], {spans: REASON, house: true})
];

/* ------------------------------------------------------------------ */
/*  Changeling                                                         */
/* ------------------------------------------------------------------ */
const kith = (key, label, title, text, a, b, x = {}) => sp(key, label, title, text, [a, b], x);
const house = (key, label, text) => sp(key, label, "The House", text, [
  ["Proud of the House", "bg Title|ab Etiquette", "a House elder|who fostered you"],
  ["Uneasy in it", "flaw Enemy|ab Subterfuge"]], {spans: SIDHE, house: true, match: [label.replace(/^House /, "")]});
const changeling = [
  kith("boggan", "Boggan", "Work", "You always liked to be useful.", ["A craftsperson", "ab Crafts|bg Contacts"], ["A gossip", "ab Empathy|bg Contacts"]),
  kith("clurichaun", "Clurichaun", "The party", "You always liked a drink and a fight.", ["A fighter", "ab Brawl|bg Allies"], ["A storyteller", "ab Performance"]),
  kith("eshu", "Eshu", "The road", "You always wanted to see what was over the hill.", ["A traveller", "ab Survival|ab Linguistics"], ["A storyteller", "ab Performance|ab Expression"]),
  kith("nocker", "Nocker", "The machine", "You always took things apart.", ["An inventor", "ab Technology|ab Crafts"], ["A critic", "ab Expression|flaw Enemy"]),
  kith("pooka", "Pooka", "The animal", "You always felt like something with fur or feathers.", ["A trickster", "ab Subterfuge|ab Animal Ken"], ["A friend", "ab Empathy|bg Allies"]),
  kith("redcap", "Redcap", "The hunger", "You always had a mean streak and a big appetite.", ["A bully", "ab Intimidation|ab Brawl"], ["A loyal brute", "bg Allies"]),
  kith("satyr", "Satyr", "Passion", "You always loved too much.", ["A lover", "ab Empathy|ab Performance"], ["A reveller", "ab Performance|flaw Addiction"]),
  kith("selkie", "Selkie", "The sea", "You always longed for the sea.", ["A sailor", "ab Athletics|ab Survival"], ["A guardian of the coast", "ab Animal Ken"]),
  kith("sidhe", "Sidhe", "Nobility", "You always knew you were born to rule.", ["A lord", "bg Title|ab Etiquette"], ["A knight", "ab Melee|bg Title"], {spans: SIDHE}),
  kith("sluagh", "Sluagh", "Whispers", "You always liked dark corners and secrets.", ["A collector of secrets", "ab Investigation|ab Stealth"], ["A messenger of the dead", "ab Occult"]),
  kith("troll", "Troll", "Duty", "You always kept your word.", ["A guard", "ab Melee|merit Tough"], ["A worker", "ab Crafts|ab Athletics"]),
  kith("seemings", "Seeming (childling, wilder, grump)", "Your age", "The age you were at the Chrysalis shapes the fae you are.", ["A childling", "ab Empathy|ab Athletics"], ["A grump", "ab Academics|ab Kenning"], {match: ["childling", "wilder", "grump"]}),
  kith("courts", "Seelie or Unseelie Court", "Your court", "The fae are split between the bright court and the dark.", ["Seelie", "ab Etiquette|bg Allies"], ["Unseelie", "ab Subterfuge|bg Contacts"], {match: ["seelie", "unseelie"]}),
  kith("ghilledhu", "Ghille Dhu", "The green", "You always loved the woods.", ["A guardian of a grove", "ab Survival|ab Animal Ken"], ["A gardener", "ab Crafts"]),
  kith("piskies", "Piskie", "Mischief", "You always took small things.", ["A thief", "ab Larceny|ab Stealth"], ["A helper", "ab Empathy"]),
  kith("nunnehi", "Nunnehi", "The land", "You belong to the fae of the first peoples of the Americas.", ["A guardian", "ab Survival|bg Allies"], ["A storyteller", "ab Expression|ab Occult"]),
  kith("inanimae", "Inanima", "Stone and stream", "You were a fae of a rock, a stream or a flame before you were a person.", ["Close to your element", "note An anchor in the world"], ["Far from it", "flaw Nightmares"]),
  kith("merfolk", "Merfolk", "The deep", "You came up from the sea.", ["A wanderer", "ab Athletics|ab Survival"], ["An exile", "flaw Enemy"]),
  kith("thallain", "Thallain", "Nightmare", "You are a fae of fear, not dream.", ["Hungry", "ab Intimidation|flaw Dark Secret"], ["Wanting better", "merit Iron Will|flaw Hunted"]),
  kith("daFae", "Dark Ages fae", "The old fae", "In the Dark Ages the fae were not yet hidden in mortal bodies. You walk between the courts and the mortals.", ["A courtier", "ab Etiquette|bg Title"], ["A wanderer", "ab Survival|ab Kenning"], {spans: DA, match: ["fae"]}),
  house("hAesin", "House Aesin", "A northern House of fierce honour."),
  house("hAilil", "House Ailil", "A House of schemes and the dark court."),
  house("hBalor", "House Balor", "A House of the dark, close to the Fomorians."),
  house("hBeaumayn", "House Beaumayn", "A House of seers and prophecy."),
  house("hDanaan", "House Danaan", "A House of mystics from the old tales."),
  house("hDaireann", "House Daireann", "A House of warriors and of passion."),
  house("hDougal", "House Dougal", "A House of craftspeople."),
  house("hEiluned", "House Eiluned", "A House of sorcerers and secrets."),
  house("hFiona", "House Fiona", "A House of passion and courage."),
  house("hGwydion", "House Gwydion", "A House of proud rulers."),
  house("hLeanhaun", "House Leanhaun", "A House of the dark and of the Muses."),
  house("hLiam", "House Liam", "A House in disgrace, kind to commoners."),
  sp("hScathach", "House Scathach", "The House", "A House of warriors where commoners and nobles mix.", [["A warrior", "ab Melee|ab Brawl"], ["A protector", "ab Alertness|bg Allies"]], {match: ["scathach"]}),
  house("hVarich", "House Varich", "A House of ambition from the East."),
  kith("hirayanu", "Hirayanu", "The flowers", "You are a hsien of the flowers and the earth.", ["A gardener", "ab Survival|ab Crafts"], ["A poet", "ab Expression"]),
  kith("kamuii", "Kamuii", "The spirit", "You are a hsien who serves the spirits.", ["A priest", "ab Occult|ab Theology"], ["A warrior", "ab Melee|ab Martial Arts"]),
  kith("hskomuko", "Komuko", "The home", "You are a hsien of the home and the hearth.", ["A guardian of the home", "ab Alertness|ab Empathy"], ["A servant", "ab Etiquette"]),
  kith("hssuijen", "Suijen", "The water", "You are a hsien of the waters.", ["A sailor", "ab Athletics|ab Survival"], ["A dreamer", "ab Expression"]),
  kith("hshanumen", "Hanumen", "The monkey", "You are a monkey hsien, quick and curious.", ["A trickster", "ab Subterfuge|ab Athletics"], ["A scholar", "ab Academics"]),
  kith("hsnyan", "Nyan", "The cat", "You are a cat hsien.", ["A thief", "ab Larceny|ab Stealth"], ["A companion", "ab Empathy"]),
  kith("hschuihyu", "Chu Ih Yu", "The fish", "You are a fish hsien.", ["A sailor", "ab Survival|ab Athletics"], ["A merchant", "ab Finance"]),
  kith("hstanuki", "Tanuki", "The raccoon dog", "You are a tanuki hsien, fond of food and drink.", ["A reveller", "ab Performance|ab Streetwise"], ["A shapechanger", "ab Subterfuge"])
];

/* ------------------------------------------------------------------ */
/*  Wraith                                                             */
/* ------------------------------------------------------------------ */
const guild = (key, label, text, a, b, x = {}) => sp(key, label, "The guild", text, [a, b], {house: false, ...x});
const legion = (key, label, death) => sp(key, label, "The Legion", `Those who die ${death} belong to this Legion.`, [
  ["You serve proudly", "bg Status", "a centurion|of your Legion"],
  ["You serve because you must", "flaw Enemy|ab Subterfuge"]]);
const wraith = [
  guild("alchemists", "Alchemists", "The guild works the stuff of souls.", ["An apprentice", "ab Crafts|ab Occult"], ["A master's servant", "bg Mentor"]),
  guild("artificers", "Artificers", "The guild forges relics from the dead.", ["A smith", "ab Crafts|bg Contacts"], ["A soulforger", "ab Crafts|flaw Dark Secret"]),
  guild("chanteurs", "Chanteurs", "The guild sings.", ["A singer", "ab Performance|bg Fame"], ["A choir member", "ab Performance|bg Allies"]),
  guild("harbingers-w", "Harbingers", "The guild walks the Tempest.", ["A messenger", "ab Survival|bg Contacts"], ["A guide", "ab Survival|ab Alertness"]),
  guild("haunters", "Haunters", "The guild frightens the living.", ["A ghost in a house", "ab Intimidation|note A place you haunt"], ["A poltergeist", "ab Athletics"]),
  guild("masquers", "Masquers", "The guild shapes the faces of the dead.", ["A face-changer", "ab Performance|ab Subterfuge"], ["An artist", "ab Crafts|ab Expression"]),
  guild("mnemoi", "Mnemoi", "The guild shapes memories.", ["A rememberer", "ab Academics|ab Empathy"], ["A thief of memories", "ab Subterfuge|flaw Dark Secret"]),
  guild("monitors", "Monitors", "The guild watches the threads of life.", ["A watcher", "ab Alertness|ab Investigation"], ["A cutter", "ab Melee|flaw Enemy"]),
  guild("oracles", "Oracles", "The guild sees what will be.", ["A seer", "ab Awareness|ab Enigmas"], ["A prophet", "ab Expression|bg Fame"]),
  guild("pardoners", "Pardoners", "The guild fights the Shadow.", ["A confessor", "ab Empathy|ab Theology"], ["An exorcist", "ab Occult|merit Iron Will"]),
  guild("proctors", "Proctors", "The guild keeps the walls between worlds.", ["A builder", "ab Crafts|ab Alertness"], ["A guard", "ab Melee"]),
  guild("puppeteers", "Puppeteers", "The guild rides the living.", ["A rider", "ab Subterfuge|bg Contacts"], ["A guardian of a host", "ab Empathy"]),
  guild("sandmen", "Sandmen", "The guild walks in dreams.", ["A dream-weaver", "ab Expression|ab Empathy"], ["A nightmare", "ab Intimidation"]),
  guild("solicitors", "Solicitors", "The guild handles debts and deals.", ["A lawyer", "ab Law|bg Contacts"], ["A dealer", "ab Finance"]),
  guild("spooks", "Spooks", "The guild talks through machines.", ["A voice in the wires", "ab Technology|ab Computer"], ["A trickster", "ab Subterfuge"], {spans: [[1840, 2300]], house: true}),
  guild("usurers", "Usurers", "The guild trades in Pathos.", ["A lender", "ab Finance|bg Resources"], ["A healer", "ab Medicine"]),
  guild("legions", "A Legion", "Every wraith of the Hierarchy belongs to a Legion by the way they died.", ["Loyal", "bg Status"], ["Doubtful", "flaw Enemy"]),
  guild("spectres", "Spectre", "Your Shadow won. You serve Oblivion now.", ["Gladly", "ab Occult|flaw Dark Secret"], ["Fighting it", "flaw Nightmares|merit Iron Will"]),
  guild("heretics", "Heretic", "You follow a faith of the dead outside the Hierarchy.", ["A believer", "ab Theology|bg Allies"], ["A preacher", "ab Expression|flaw Hunted"]),
  guild("renegades", "Renegade", "You fight against the Hierarchy.", ["A rebel", "ab Brawl|bg Allies"], ["A thief", "ab Larceny|flaw Hunted"]),
  guild("risen", "Risen", "You came back into your own corpse.", ["To finish something", "note A purpose|merit Tough"], ["By accident", "flaw Nightmares"]),
  legion("legEmerald", "Emerald Legion", "by chance or accident"),
  legion("legFate", "Legion of Fate", "by what seems a fate or a mystery"),
  legion("legGrim", "Grim Legion", "by violence"),
  legion("legIron", "Iron Legion", "of old age"),
  legion("legPaupers", "Legion of Paupers", "of illness"),
  legion("legPenitent", "Penitent Legion", "by their own hand or in madness"),
  legion("legSilent", "Silent Legion", "in despair"),
  legion("legSkeletal", "Skeletal Legion", "of disease and plague"),
  guild("ferrymen", "Ferryman", "You serve the oldest boatmen of the dead.", ["A pilot", "ab Survival|ab Enigmas"], ["A seeker", "ab Occult"])
];

/* ------------------------------------------------------------------ */
/*  Hunter                                                             */
/* ------------------------------------------------------------------ */
const creed = (key, label, text, a, b) => sp(key, label, "The creed", text, [a, b], {spans: IMBUED});
const hunter = [
  creed("avenger", "Avenger", "You want them gone.", ["With fire", "ab Firearms|ab Brawl"], ["With a plan", "ab Investigation|ab Firearms"]),
  creed("defender", "Defender", "You protect what is yours.", ["Your family", "ab Alertness|bg Allies"], ["Your street", "ab Streetwise|bg Contacts"]),
  creed("judge", "Judge", "You decide which of them must die.", ["By law", "ab Law|ab Investigation"], ["By your own sense", "ab Empathy"]),
  creed("innocent", "Innocent", "You want to understand them.", ["You asked questions", "ab Empathy|ab Investigation"], ["You made a friend", "bg Allies"]),
  creed("martyr", "Martyr", "You will give anything to stop them.", ["Your body", "merit Tough|ab Brawl"], ["Your life", "merit Iron Will"]),
  creed("redeemer", "Redeemer", "You believe they can be saved.", ["One was", "bg Allies", "a creature|you helped back from the edge"], ["None so far", "flaw Nightmares"]),
  creed("visionary", "Visionary", "You want to know what the imbued are for.", ["A leader", "ab Leadership|bg Allies"], ["A seeker", "ab Enigmas|ab Occult"]),
  creed("hermit", "Hermit", "The messages come to you clearest.", ["You listen", "ab Awareness|ab Computer"], ["You hide", "ab Stealth|flaw Hunted"]),
  creed("wayward", "Wayward", "You kill them all, whatever it takes.", ["Ruthless", "ab Firearms|flaw Enemy"], ["Unhinged", "note A derangement from the hunt"]),
  sp("hh2", "A mortal hunter", "The work", "No powers, no messengers: only what you know and what you carry.", [["A witch-hunter", "ab Occult|ab Melee"], ["A detective", "ab Investigation|ab Firearms"], ["A priest", "ab Theology|merit True Faith"]], {spans: [[1500, 1998]], match: ["hunters hunted"]}),
  sp("hunters", "Imbued", "The messengers", "Since the Imbuing the messages come at odd times.", [["You trust them", "merit Iron Will"], ["You doubt them", "ab Investigation"]], {spans: IMBUED, match: ["imbued"]}),
  sp("inquisition", "The Inquisition", "The office", "The Church set you to find the devil's children.", [["A Dominican", "ab Theology|ab Investigation"], ["A knight", "ab Melee|merit True Faith"]], {match: ["inquisition", "inquisitor", "society of leopold"]}),
  sp("arcanum", "The Arcanum", "The foundation", "A learned society studies the unseen.", [["A scholar", "ab Academics|ab Occult|bg Library"], ["A field agent", "ab Investigation|ab Firearms"]], {spans: [[1885, 2300]]}),
  sp("agencies", "A government agency", "The office", "A government office with a dull name hunts monsters.", [["An agent", "ab Firearms|bg Contacts"], ["An analyst", "ab Computer|ab Investigation"]], {spans: [[1900, 2300]], house: true})
];

/* ------------------------------------------------------------------ */
/*  Mummy                                                              */
/* ------------------------------------------------------------------ */
const amenti = (key, label, text, a, b) => sp(key, label, "The Amenti", text, [a, b], {spans: [[1999, 2300]]});
const mummy = [
  amenti("kherminu", "Kher-minu", "You guard what must be kept.", ["A tomb watcher", "ab Alertness|ab Occult"], ["A keeper of a place", "note A charge to keep"]),
  amenti("khrihabi", "Khri-habi", "You read the old scrolls.", ["A scholar", "ab Academics|ab Occult"], ["An alchemist", "ab Science|ab Occult"]),
  amenti("mesektet", "Mesektet", "You walk under the night sun.", ["A watcher of stars", "ab Academics|ab Enigmas"], ["A hunter of the dark", "ab Investigation"]),
  amenti("sakhmu", "Sakhmu", "You carry the shining self.", ["A leader", "ab Leadership|bg Allies"], ["A maker of images", "ab Crafts|ab Occult"]),
  amenti("sefekhi", "Sefekhi", "You know the shadow self.", ["A necromancer", "ab Occult|flaw Haunted"], ["A spy", "ab Stealth|ab Subterfuge"]),
  amenti("udjasen", "Udja-sen", "You were judged and given another chance.", ["Grateful", "merit Iron Will"], ["Doubtful", "flaw Nightmares"]),
  sp("bane", "A Bane mummy", "Set's spell", "Set's priests made you immortal to serve Set.", [["Faithful", "ab Occult|flaw Dark Secret"], ["Rebel", "flaw Hunted|flaw Enemy"]]),
  sp("cabiri", "Cabiri", "The Greek spell", "You were made immortal by a spell of the Greek world.", [["A scholar", "ab Academics|ab Occult"], ["A wanderer", "ab Survival|ab Linguistics"]], {house: true}),
  sp("ishmaelites", "An old Immortal", "The old spell", "You are one of the first Immortals, made by Isis's spell long ago.", [["A keeper of Egypt", "ab Occult|bg Resources"], ["A wanderer of the world", "ab Linguistics|bg Contacts"]], {spans: [[1100, 1998]], house: true, match: ["immortal"]})
];

/* ------------------------------------------------------------------ */
/*  Demon                                                              */
/* ------------------------------------------------------------------ */
const dhouse = (key, label, text, a, b) => sp(key, label, "The House", text, [a, b], {spans: FALLEN, match: [label.replace(/ \(.*\)/, ""), label.replace(/.*\((.*)\)/, "$1")]});
const demon = [
  dhouse("devils", "Devils (Namaru)", "You were a herald of the heavens.", ["A leader", "ab Leadership|bg Followers"], ["A tyrant", "ab Intimidation|flaw Enemy"]),
  dhouse("scourges", "Scourges (Asharu)", "You were a bringer of wind and plague.", ["A healer", "ab Medicine|ab Empathy"], ["A bringer of plague", "ab Occult|flaw Dark Secret"]),
  dhouse("malefactors", "Malefactors (Annunaki)", "You were a maker of the earth.", ["A craftsperson", "ab Crafts|ab Technology"], ["A miner of secrets", "ab Investigation"]),
  dhouse("fiends", "Fiends (Neberu)", "You were a reader of patterns.", ["A seer", "ab Enigmas|ab Awareness"], ["A deal-maker", "ab Subterfuge|bg Contacts"]),
  dhouse("defilers", "Defilers (Lammasu)", "You were a muse of longing.", ["A lover", "ab Empathy|ab Performance"], ["A manipulator", "ab Subterfuge|flaw Enemy"]),
  dhouse("devourers", "Devourers (Rabisu)", "You were a master of beasts.", ["A hunter", "ab Animal Ken|ab Survival"], ["A beast", "ab Brawl|note Torment runs high"]),
  dhouse("slayers", "Slayers (Halaku)", "You were an angel of death.", ["A gentle death", "ab Empathy|ab Medicine"], ["A killer", "ab Melee|ab Stealth"]),
  sp("dfactions", "A faction of the Fallen", "Why you came back", "The Fallen split over what to do now that they are free.", [["Luciferan", "bg Allies|ab Leadership"], ["Faustian", "bg Followers|ab Subterfuge"], ["Reconciler", "ab Theology|ab Empathy"]], {spans: FALLEN, match: ["luciferan", "faustian", "cryptic", "reconciler", "ravener"]}),
  sp("earthbound", "Bound once", "The reliquary", "A sorcerer once bound you into an object. You broke free when the Abyss opened.", [["You remember the binding", "flaw Nightmares|note Torment runs high"], ["You hunt the binder's heirs", "ab Investigation|flaw Enemy"]], {spans: FALLEN, house: true, match: ["earthbound"]})
];

/* ------------------------------------------------------------------ */
/*  Kuei-jin                                                           */
/* ------------------------------------------------------------------ */
const dharma = (key, label, text, a, b) => sp(key, label, "The Dharma", text, [a, b]);
const kueijin = [
  dharma("devilTiger", "Howl of the Devil-Tiger", "You serve the demon in you to fulfil your role in the cosmos.", ["A punisher", "ab Intimidation|ab Brawl"], ["A tempter", "ab Subterfuge|flaw Dark Secret"]),
  dharma("crane", "Way of the Resplendent Crane", "You serve order and the right way of things.", ["A judge", "ab Law|ab Etiquette"], ["A scholar", "ab Academics|ab Meditation"]),
  dharma("shadow", "Song of the Shadow", "You serve the dead and the dark.", ["A necromancer", "ab Occult|flaw Haunted"], ["An ascetic", "ab Meditation|merit Iron Will"]),
  dharma("whispers", "Path of a Thousand Whispers", "You seek balance in many ways.", ["A wanderer", "ab Survival|bg Contacts"], ["A sage", "ab Enigmas|ab Academics"]),
  dharma("dragon", "Way of the Thrashing Dragon", "You seek balance in the flow of life.", ["A reveller", "ab Performance|ab Empathy"], ["A warrior", "ab Martial Arts|ab Brawl"]),
  sp("jiang", "Jiang Shi", "The old dead", "You rose in the old way, stiff and hungry.", [["A servant of a court", "bg Status"], ["A wanderer of graveyards", "ab Survival|ab Stealth"]], {house: true})
];

/* ------------------------------------------------------------------ */
/*  Orpheus                                                            */
/* ------------------------------------------------------------------ */
const shade = (key, label, text, a, b, x = {}) => sp(key, label, "The Shade", text, [a, b], x);
const orpheus = [
  shade("banshee", "Banshee", "You hear death coming.", ["An oracle", "ab Awareness|ab Enigmas"], ["A mourner", "ab Empathy"]),
  shade("haunter-o", "Haunter", "You are at home in places and things.", ["A guardian of a place", "note A place you haunt|ab Alertness"], ["A trickster", "ab Subterfuge"], {match: ["haunter"]}),
  shade("poltergeist", "Poltergeist", "You move the world from outside it.", ["A force", "ab Athletics|ab Brawl"], ["A protector", "ab Alertness"]),
  shade("skinrider", "Skinrider", "You ride the living.", ["A spy", "ab Subterfuge|ab Investigation"], ["A guardian angel", "ab Empathy"]),
  shade("wisp", "Wisp", "You are light and air.", ["A scout", "ab Alertness|ab Athletics"], ["A trickster", "ab Subterfuge"]),
  shade("laments", "A Lament", "How you leave your body.", ["Skimmer (by trance)", "ab Meditation"], ["Sleeper (by cold sleep)", "note Someone owns your contract"]),
  shade("skimmer", "Skimmer", "You leave your body by trance.", ["Practised", "ab Meditation|merit Iron Will"], ["Clumsy", "flaw Nightmares"]),
  shade("sleeper", "Sleeper", "You leave your body in a cold box.", ["For a company", "bg Resources|note Someone owns your contract"], ["For a cause", "bg Allies"], {spans: [[1990, 2300]]}),
  shade("spirits", "Spirit", "Your body is dead. You remain.", ["You haunt your killer", "flaw Obsession"], ["You work for the living", "bg Contacts"]),
  shade("hues", "Hue", "The colours of your soul show what you are.", ["Bright", "ab Empathy"], ["Dark", "flaw Dark Secret"]),
  shade("phantasm", "Phantasm", "You made yourself in the dark.", ["A creator", "ab Crafts|ab Expression"], ["A deceiver", "ab Subterfuge"])
];

/* ------------------------------------------------------------------ */
/*  Mortals, Kinfolk and sorcerers                                     */
/* ------------------------------------------------------------------ */
const mortal = [
  sp("ordinary", "An ordinary mortal", "An ordinary life", "Nothing marked you out. You hope it stays that way.", [["You keep it so", "merit Iron Will"], ["You know better now", "ab Awareness"]]),
  sp("kinfolk", "Kinfolk", "The family secret", "Your family has Garou blood and keeps faith with them.", [["You serve the sept", "bg Allies|ab Survival", "a Garou cousin|who visits at the full moon"], ["You resent it", "flaw Enemy"]], {match: ["kinfolk", "kin"]}),
  sp("sorcerers", "Sorcerer or hedge magician", "The art", "You learned a few spells from a book, a teacher or a family.", [["From a book", "ab Occult|bg Library"], ["From a teacher", "ab Occult|bg Mentor", "your teacher|in the old ways"], ["From your family", "ab Occult|bg Allies"]], {match: ["sorcerer", "hedge"]}),
  sp("psychic", "Psychic", "The gift", "You were born able to do one strange thing.", [["You hide it", "ab Subterfuge|flaw Dark Secret"], ["You use it", "ab Awareness|bg Contacts"]]),
  sp("faithful", "One of the faithful", "Faith", "Your faith is strong enough to burn monsters.", [["A priest", "ab Theology|merit True Faith"], ["A lay believer", "merit True Faith|bg Allies"]], {match: ["true faith"]}),
  sp("ghouls", "One who knows vampires", "A brush with the blood", "You served a vampire once, or were fed on, and know what is out there.", [["You want more", "flaw Addiction"], ["You want out", "flaw Hunted|merit Iron Will"]])
];

export const SPLATS = {mortal, vampire, ghoul, revenant, werewolf, mage, changeling, wraith, hunter, mummy, demon, kueijin, orpheus};
