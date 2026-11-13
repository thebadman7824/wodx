/**
 * WoDX Chronicle: the law of the land (B3490-B3492). Pure rules, no Foundry.
 *
 * Every region belongs to a law family: a list of dated rows. A row changes only the parts of the record it names,
 * so the law of a year is every row from 1197 up to that year laid one on top of the other. A region can add its own
 * rows after its family's (Moravia has its own crown and town law). The record answers "who rules here, who judges,
 * how is guilt found, what is a crime, what is the punishment, who keeps order, what is owed": every other system
 * reads it through api.law.
 *
 * The content is legal history in WoDX's own words. Game figures (bribe, catch) are house figures (B3492). A family
 * whose rows are not written yet stands in with the general "custom" family, marked as a guess.
 */

/** Crimes a row can put on or take off the books. Evergreen ones are on every record from the first row. */
export const CRIMES = {
  murder: "Murder", theft: "Theft", arson: "Arson", treason: "Treason against the ruler", violence: "Wounding or beating",
  forgery: "Forgery and false coin", rebellion: "Rising against the lord",
  heresy: "Heresy", sorcery: "Sorcery and witchcraft", blasphemy: "Blasphemy", usury: "Lending at interest",
  poaching: "Hunting in the lord's forest", vagrancy: "Wandering without a master or work", dress: "Dressing above one's rank",
  "arms-night": "Bearing arms in town after dark", "wrong-faith": "Worship outside the established church",
  "pretend-powers": "Claiming magical powers (as fraud)", duelling: "Duelling", sedition: "Sedition against the state",
  "drug-trade": "Dealing in forbidden drugs", "computer-crime": "Breaking into computers", terrorism: "Terrorism",
  "anti-state": "Speaking or acting against the Party", apostasy: "Leaving the faith", wine: "Drinking or selling wine",
  unfilial: "Failing in duty to parents and elders"
};
export const EVERGREEN_CRIMES = ["murder", "theft", "arson", "treason", "violence", "forgery"];

/** Ways a court finds guilt. */
export const PROOF = {
  oath: "Oath, backed by oath-helpers who swear to the accused's good name",
  ordeal: "Ordeal by hot iron or water",
  combat: "Trial by combat",
  witnesses: "Witnesses",
  learned: "Learned procedure: two good witnesses or a confession, with torture allowed under rules to get one",
  jury: "A jury of townsfolk",
  evidence: "Evidence weighed by a trained judge, in public",
  forensic: "Forensic evidence: fingerprints, then blood, then DNA",
  party: "A court that follows the Party's line, with confessions for show",
  confession: "A confession, needed before sentence; beating to get one is allowed within limits"
};

/** Punishments. */
export const PUNISH = {
  fine: "A fine, or blood money to the victim's kin", penance: "Penance set by the church", pillory: "The pillory or the stocks",
  maiming: "Branding or maiming", banishment: "Banishment from the town or the land", outlawry: "Outlawry: the law no longer protects them",
  hanging: "Death by hanging, the sword or the wheel", burning: "Burning, for heresy and sorcery", galleys: "Rowing in the galleys",
  prison: "Prison", "hard-labour": "Hard labour", camp: "A labour camp", "death-state": "Death by the state's own method",
  confiscation: "Loss of land and goods", flogging: "Flogging", bamboo: "Beating with the light or the heavy bamboo"
};

/** Keepers of order. */
export const ORDER = {
  "hue-cry": "The hue and cry: everyone who hears it must chase", bailiff: "The lord's bailiff or reeve",
  "town-watch": "The town watch at the gates and on the walls", inquisitors: "Inquisitors hunting heresy",
  gendarmerie: "The gendarmerie on the roads and in the villages", police: "A state police force in uniform",
  detectives: "Detectives in plain clothes", "secret-police": "A secret police with informers everywhere",
  cameras: "Cameras on the streets and in shops", army: "Soldiers in the streets",
  muhtasib: "The muhtasib, inspector of markets and public conduct", shurta: "The shurta, the ruler's police", "religious-police": "Religious police who enforce dress, prayer and fasting",
  "yamen-runners": "The magistrate's runners and constables", baojia: "Neighbour groups that answer for one another"
};

/** A record with nothing in it. Lists hold ids; rule is words. */
export const blank = () => ({rule: {form: "", ruler: "", council: ""}, courts: [], proof: [], crimes: [...EVERGREEN_CRIMES],
  punish: [], order: [], taxes: [], warn: [], bribe: 2, catch: 0.3, guess: false});

/**
 * A row: {from, to?, note, set?: {...}, add?: {list: [ids]}, drop?: {list: [ids]}}.
 *   set replaces fields (rule is merged, so a row can change only the ruler); add and drop change list fields.
 *   to, when given, is the last year the row holds: after it the row has no effect at all (a law that lapsed).
 */
const ROW_LISTS = ["courts", "proof", "crimes", "punish", "order", "taxes", "warn"];

export const FAMILIES = {
  // A stand-in for a land whose family is not written yet: a general picture, marked as a guess (B3492)
  custom: {label: "The custom of the land", guess: true, rows: [
    {from: 0, note: "Custom kept by the ruler and the elders", set: {rule: {form: "The ruler of the land and the ruler's men", ruler: "The ruler", council: "The elders and the great families"},
      courts: ["The ruler's court", "The elders of each village or quarter"], proof: ["oath", "witnesses"], punish: ["fine", "banishment", "maiming", "hanging"],
      order: ["hue-cry", "bailiff"], taxes: ["Dues to the ruler in goods and labour"], bribe: 2, catch: 0.3}},
    {from: 1850, note: "A modern state, or a colonial one, with written law", set: {courts: ["The state's courts", "Local courts for custom and family matters"],
      proof: ["witnesses", "evidence"], punish: ["fine", "prison", "hard-labour", "death-state"], order: ["police"], taxes: ["Taxes to the state"], catch: 0.4}},
    {from: 1950, note: "The courts of an independent state", add: {proof: ["forensic"], order: ["detectives"]}},
    {from: 1995, note: "Cameras and computer records", add: {order: ["cameras"], crimes: ["computer-crime", "drug-trade"]}}
  ]},

  // Latin Christendom: custom, the lord's court and the church's, then Roman law revived, then codes (B3491)
  latin: {label: "Latin Christendom and its heirs", rows: [
    {from: 0, note: "Custom, the lord's court and the church's", set: {
      rule: {form: "A crowned lord over vassals who owe service", ruler: "The king or prince", council: "The great lords and bishops"},
      courts: ["The lord's manor court for the lord's people", "The count's or king's court for the free and the great",
        "The bishop's court for clergy, marriage, wills, oaths and heresy", "A town court where the town has a charter"],
      proof: ["oath", "ordeal", "combat", "witnesses"], punish: ["fine", "penance", "pillory", "maiming", "banishment", "outlawry", "hanging", "burning", "confiscation"],
      order: ["hue-cry", "bailiff", "town-watch"], taxes: ["The tithe to the church", "Labour and dues to the lord", "Tolls at bridges, gates and markets"],
      bribe: 2, catch: 0.25},
      add: {crimes: ["heresy", "sorcery", "blasphemy", "usury", "poaching", "rebellion", "arms-night"],
        warn: ["Christians may not lend at interest; Jewish lenders do, under the ruler's protection", "Game in the forest belongs to the lord"]}},
    {from: 1216, note: "The Church forbids its priests to bless ordeals (1215); the ordeal fades", drop: {proof: ["ordeal"]}},
    {from: 1232, note: "Papal inquisitors are sent against heresy", add: {courts: ["Papal inquisitors for heresy"], order: ["inquisitors"]}},
    {from: 1260, note: "Learned law from the universities: written procedure, and torture under rules", add: {proof: ["learned"]}, drop: {proof: ["combat"]}},
    {from: 1300, note: "Sumptuary laws set who may wear what", add: {crimes: ["dress"], warn: ["Furs, silk and colours are kept for those of rank"]}},
    {from: 1350, note: "After the plague, laws bind labourers to work and wages", add: {crimes: ["vagrancy"]}},
    {from: 1520, note: "Reformation: each land's church is the one the ruler keeps", add: {crimes: ["wrong-faith"]}},
    {from: 1560, to: 1680, note: "The great witch trials", add: {warn: ["Witch trials burn across this land: an accusation is deadly"]}},
    {from: 1650, note: "Princes rule without their estates; standing armies", set: {rule: {form: "An absolute monarch; the estates meet seldom or never", council: "The monarch's privy council and ministers"}},
      add: {crimes: ["duelling"], punish: ["galleys"]}},
    {from: 1780, note: "The Enlightenment: torture is abolished, the witch laws end", drop: {proof: ["learned"], crimes: ["sorcery", "heresy"], punish: ["burning", "maiming"]},
      add: {proof: ["evidence"], punish: ["prison"]}},
    {from: 1800, note: "Written codes, state courts, a police; the church keeps only its own", set: {
      courts: ["The state's courts of first instance", "Courts of appeal", "A supreme court", "Church courts for the church's own affairs only"],
      taxes: ["Taxes on land, trade and later income", "Customs at the border"], bribe: 3, catch: 0.4},
      add: {order: ["gendarmerie", "police", "detectives"], crimes: ["sedition"], punish: ["hard-labour"]}, drop: {crimes: ["usury", "dress", "arms-night", "poaching"], punish: ["penance", "pillory", "outlawry", "galleys"], order: ["hue-cry", "bailiff", "town-watch", "inquisitors"],
        warn: ["Christians may not lend at interest; Jewish lenders do, under the ruler's protection", "Game in the forest belongs to the lord", "Furs, silk and colours are kept for those of rank"]}},
    {from: 1850, note: "The estates are gone: the law is the same law for every citizen", set: {rule: {form: "A constitutional monarchy or a republic with a parliament"}}, drop: {crimes: ["vagrancy", "wrong-faith"]}},
    {from: 1900, note: "Fingerprints and the first drug laws", add: {proof: ["forensic"], crimes: ["drug-trade"]}, drop: {crimes: ["duelling"]}},
    {from: 1950, note: "Human rights law after the war; each land ends the death penalty on its own date", set: {catch: 0.45}},
    {from: 1990, note: "Cameras on the streets, computer crime on the books", add: {order: ["cameras"], crimes: ["computer-crime"]}, set: {catch: 0.55}},
    {from: 2001, note: "Terrorism laws after the attacks of 2001", add: {crimes: ["terrorism"]}}
  ]},

  // The lands of Islam: sharia judged by the qadi beside the ruler's own justice, Ottoman kanun, reform, mixed codes (B3493)
  islamic: {label: "The lands of Islam", rows: [
    {from: 0, note: "Sharia judged by the qadi; the ruler's own justice beside it", set: {
      rule: {form: "A sultan or emir who rules in the name of the faith", ruler: "The sultan or emir", council: "The vizier, the divan and the learned men of the faith"},
      courts: ["The qadi's court, judging by sharia and the school of law the land follows", "The ruler's court of complaints, where anyone may petition against an official",
        "Each protected faith's own court for its own people: church courts, rabbinic courts"],
      proof: ["witnesses", "oath"], punish: ["fine", "flogging", "maiming", "banishment", "hanging", "confiscation"],
      order: ["muhtasib", "shurta", "town-watch"], taxes: ["Alms owed by Muslims", "The poll tax on Christians and Jews", "The land tax", "Tolls and market dues"],
      bribe: 2, catch: 0.3},
      add: {crimes: ["blasphemy", "apostasy", "wine", "sorcery", "rebellion"],
        warn: ["Wine is forbidden to Muslims; Christians and Jews may make it for their own", "Christians and Jews pay the poll tax, and in many towns may not bear arms or build new houses of worship",
          "The market inspector checks weights, prices and public conduct"]}},
    {from: 1800, note: "Police and prisons on European lines", add: {order: ["police"], punish: ["prison", "hard-labour"]}, drop: {order: ["shurta"]}, set: {bribe: 3, catch: 0.35}},
    {from: 1900, note: "Written codes beside sharia; fingerprints", add: {courts: ["State courts under written codes, with sharia kept for marriage, divorce and inheritance"], proof: ["evidence", "forensic"], crimes: ["sedition", "drug-trade"]}},
    {from: 1950, note: "Independent states: courts on European models, a secret police in many", set: {rule: {form: "An independent state: a monarchy, a republic or a military government"}, catch: 0.45},
      add: {order: ["detectives", "secret-police"]}, drop: {order: ["muhtasib", "town-watch"]}},
    {from: 1990, note: "Cameras and computer crime", add: {order: ["cameras"], crimes: ["computer-crime"]}, set: {catch: 0.5}},
    {from: 2001, note: "Terrorism laws", add: {crimes: ["terrorism"]}}
  ]},

  // Chinese imperial law and the lands that borrowed it: the written code, the magistrate, confession (B3494)
  chinese: {label: "Chinese imperial law and its neighbours", rows: [
    {from: 0, note: "The emperor's written code, judged by the county magistrate", set: {
      rule: {form: "An empire under a Son of Heaven, ruled through officials chosen by examination", ruler: "The Emperor", council: "The Grand Secretariat and the Six Ministries"},
      courts: ["The county magistrate's yamen: judge, tax collector and keeper of the peace in one", "Appeal up through prefecture and province; every death sentence goes to the throne",
        "Clan elders, guilds and village heads, who settle quarrels before they reach the yamen"],
      proof: ["confession", "witnesses"], punish: ["fine", "bamboo", "hard-labour", "banishment", "hanging"],
      order: ["yamen-runners", "baojia", "town-watch"], taxes: ["Land tax in grain, later in silver", "Labour service on roads, walls and canals", "The salt monopoly"],
      bribe: 3, catch: 0.35},
      add: {crimes: ["sorcery", "rebellion", "unfilial", "wrong-faith"],
        warn: ["Striking or cursing a parent or elder is among the gravest crimes", "A family answers for its members, and neighbours are grouped to watch one another",
          "Secret societies and forbidden sects are treated as rebellion"]}},
    {from: 1900, note: "Police, prisons and fingerprints on foreign models", add: {order: ["police"], punish: ["prison"], proof: ["evidence", "forensic"], crimes: ["drug-trade", "sedition"]}},
    {from: 1950, note: "Modern states: written codes on European or Soviet lines", drop: {order: ["yamen-runners", "town-watch"], punish: ["bamboo"]}, add: {order: ["detectives"]}, set: {catch: 0.45}},
    {from: 1990, note: "Cameras and computer crime", add: {order: ["cameras"], crimes: ["computer-crime"]}, set: {catch: 0.55}}
  ]}
};

/** Each region's family. Families not written yet fall back to custom (lawOf marks the record a guess). */
export const REGION_FAMILY = {
  moravia: "latin", "german-lands": "latin", "british-isles": "common", france: "latin", iberia: "latin", italy: "latin",
  "low-countries": "latin", scandinavia: "latin", "poland-baltic": "latin", "carpathians-balkans": "latin",
  russia: "orthodox", aegean: "orthodox", anatolia: "islamic", levant: "islamic", egypt: "islamic", arabia: "islamic",
  maghreb: "islamic", persia: "islamic", "central-asia": "steppe", siberia: "steppe", "tibet-himalaya": "south-asia",
  india: "south-asia", china: "chinese", japan: "japanese", korea: "chinese", "southeast-asia": "chinese", nusantara: "islamic",
  "west-africa": "african", "east-africa": "african", "southern-africa": "african", "central-africa": "african",
  canada: "americas", "north-america-east": "americas", "north-america-west": "americas", mexico: "americas", caribbean: "americas",
  andes: "americas", brazil: "americas", "southern-cone": "americas", australia: "pacific", aotearoa: "pacific",
  "pacific-islands": "pacific", arctic: "north", antarctica: "custom"
};

/** A region's own rows, laid after its family's for the same year. Moravia and Bohemia first (B3491). */
export const REGION_ROWS = {
  china: [
    {from: 0, note: "The Southern Song in the south; the Jurchen Jin hold the north", set: {rule: {ruler: "The Song Emperor in Hangzhou, and the Jin Emperor in the north"}}},
    {from: 1279, note: "The Mongol Yuan: the conquerors above the conquered; the examinations stop until 1315", set: {rule: {ruler: "The Great Khan, Emperor of the Yuan", council: "The Central Secretariat, led by Mongols"}},
      add: {warn: ["The law ranks people by origin: Mongols first, southern Chinese last"]}},
    {from: 1368, note: "The Ming: the Great Ming Code (1397)", set: {rule: {ruler: "The Ming Emperor"}}, drop: {warn: ["The law ranks people by origin: Mongols first, southern Chinese last"]}},
    {from: 1644, note: "The Qing conquest: the Manchu queue is ordered for every man", set: {rule: {ruler: "The Qing Emperor", council: "The Grand Secretariat, later the Grand Council"}},
      add: {warn: ["Every man must shave the forehead and wear the queue, on pain of death"]}},
    {from: 1842, note: "The treaty ports: foreigners are tried by their own consuls", add: {courts: ["Foreign consular courts in the treaty ports"], warn: ["A foreigner in a treaty port answers only to a consul"]}},
    {from: 1905, note: "The examinations are abolished", set: {rule: {form: "An empire in its last years, with new ministries"}}},
    {from: 1912, note: "The Republic of China", set: {rule: {form: "A republic, soon split among warlords", ruler: "The President, or the warlord who holds the province", council: "Parliament, when it sits"}},
      drop: {warn: ["Every man must shave the forehead and wear the queue, on pain of death"], crimes: ["unfilial"]}},
    {from: 1928, note: "The Nationalist government in Nanjing", set: {rule: {form: "A one-party Nationalist state", ruler: "The Nationalist leader", council: "The Nationalist Party"}}, add: {order: ["secret-police"]}},
    {from: 1943, note: "The foreign concessions end", drop: {courts: ["Foreign consular courts in the treaty ports"], warn: ["A foreigner in a treaty port answers only to a consul"]}},
    {from: 1949, note: "The People's Republic: the Party rules; public security and labour reform camps",
      set: {rule: {form: "A one-party state", ruler: "The Chairman of the Party", council: "The Politburo of the Communist Party"}, catch: 0.55},
      add: {proof: ["party"], crimes: ["anti-state"], punish: ["camp"], order: ["secret-police"]}},
    {from: 1966, to: 1976, note: "The Cultural Revolution", add: {warn: ["Red Guards hold struggle sessions; any old book, temple or title can be a crime"]}},
    {from: 1979, note: "The first criminal law of the People's Republic", set: {rule: {ruler: "The General Secretary of the Party, and the President"}}},
    {from: 2014, note: "Social credit records and face matching on the streets", set: {catch: 0.7}}
  ],
  korea: [
    {from: 0, note: "Goryeo under its military rulers", set: {rule: {form: "A kingdom ruled in fact by military strongmen", ruler: "The King of Goryeo, and the military dictator", council: "The military council"}}},
    {from: 1259, note: "Mongol overlordship", set: {rule: {council: "The court under Mongol overseers"}}},
    {from: 1392, note: "Joseon: Neo-Confucian rule; the great code of 1485", set: {rule: {form: "A Neo-Confucian kingdom", ruler: "The King of Joseon", council: "The State Council and the six boards"}}},
    {from: 1910, note: "Japanese rule", set: {rule: {form: "A colony of Japan", ruler: "The Governor-General", council: "None for Koreans"}, catch: 0.6}, add: {order: ["police", "secret-police"]}},
    {from: 1945, note: "Liberation and division: the south a republic (1948), the north a one-party state", set: {rule: {form: "A divided land: a republic in the south, a one-party state in the north", ruler: "The President in Seoul; the Leader in Pyongyang", council: "The National Assembly in the south"}},
      add: {warn: ["North of the line, a word against the Leader sends whole families to the camps"]}},
    {from: 1988, note: "Democracy in the south", set: {catch: 0.55}}
  ],
  "southeast-asia": [
    {from: 0, note: "Buddhist and Hindu kings in Angkor and Pagan; the Đại Việt emperor on the Chinese model", set: {rule: {form: "Kingdoms of god-kings and Buddhist kings, and an empire on the Chinese model in Đại Việt",
      ruler: "The King of Angkor, of Pagan, or the Emperor of Đại Việt", council: "The court and the monks or the mandarins"}},
      add: {courts: ["Royal courts following the dharma law books, in the Buddhist kingdoms"]}},
    {from: 1483, note: "The Lê Code in Đại Việt", add: {courts: ["Đại Việt's courts under the Lê Code"]}},
    {from: 1887, note: "French Indochina; British Burma (1885); Siam stays its own", set: {rule: {form: "Colonies of France and Britain; the Kingdom of Siam", ruler: "The Governor-General, or the King of Siam"}},
      add: {courts: ["Colonial courts for Europeans"], warn: ["Europeans and natives do not stand under the same law"]}},
    {from: 1954, note: "Independence; Vietnam divided until 1975", set: {rule: {form: "Independent kingdoms, republics and one-party states", ruler: "Each state's head"}},
      drop: {courts: ["Colonial courts for Europeans"], warn: ["Europeans and natives do not stand under the same law"]}},
    {from: 1975, to: 1979, note: "The Khmer Rouge in Cambodia", add: {warn: ["In Cambodia, money, books, glasses or a soft hand can mark someone for death"]}}
  ],
  anatolia: [
    {from: 0, note: "The Seljuk sultanate of Rum", set: {rule: {ruler: "The Seljuk Sultan of Rum"}}},
    {from: 1300, note: "The Ottoman house rises", set: {rule: {ruler: "The Ottoman Sultan"}}},
    {from: 1450, note: "The sultan's own law, the kanun, beside sharia", add: {courts: ["The sultan's kanun, laid down in law books, for taxes, land and public order"]}},
    {from: 1839, note: "The Tanzimat reforms: new courts and codes on French lines", add: {courts: ["The new state courts of the Tanzimat"]}},
    {from: 1857, note: "Equal subjects (1856): the poll tax ends", drop: {taxes: ["The poll tax on Christians and Jews"], warn: ["Christians and Jews pay the poll tax, and in many towns may not bear arms or build new houses of worship"]}},
    {from: 1923, note: "The Turkish Republic: sharia courts closed (1924), Swiss civil and Italian penal codes (1926)",
      set: {rule: {form: "A secular republic", ruler: "The President of the Republic", council: "The Grand National Assembly"}},
      drop: {courts: ["The qadi's court, judging by sharia and the school of law the land follows", "State courts under written codes, with sharia kept for marriage, divorce and inheritance", "The sultan's kanun, laid down in law books, for taxes, land and public order"], crimes: ["apostasy", "wine"],
        warn: ["Wine is forbidden to Muslims; Christians and Jews may make it for their own", "The market inspector checks weights, prices and public conduct"]},
      add: {courts: ["The republic's courts under codes taken from Switzerland and Italy"]}},
    {from: 2004, note: "The death penalty is abolished", drop: {punish: ["hanging"]}}
  ],
  levant: [
    {from: 0, note: "Saladin's heirs, the Ayyubids, and the crusader states on the coast", set: {rule: {ruler: "The Ayyubid sultan in Damascus", council: "The emirs and the learned men"}},
      add: {warn: ["On the coast the crusaders' own law holds until 1291"]}},
    {from: 1260, note: "The Mamluk sultanate", set: {rule: {ruler: "The Mamluk Sultan in Cairo, through governors"}}},
    {from: 1292, note: "The last crusader city falls (1291)", drop: {warn: ["On the coast the crusaders' own law holds until 1291"]}},
    {from: 1516, note: "Ottoman rule", set: {rule: {ruler: "The Ottoman Sultan, through governors"}}, add: {courts: ["The sultan's kanun, laid down in law books, for taxes, land and public order"]}},
    {from: 1857, note: "Ottoman equal subjects: the poll tax ends", drop: {taxes: ["The poll tax on Christians and Jews"]}},
    {from: 1920, note: "British and French mandates", set: {rule: {form: "A mandate under a European power", ruler: "The British or French High Commissioner"}}},
    {from: 1946, note: "Independent states; Israel from 1948 with its own law and faith courts for family matters", set: {rule: {form: "Independent states: republics and kingdoms", ruler: "Each state's head"}}}
  ],
  egypt: [
    {from: 0, note: "The Ayyubid sultanate", set: {rule: {ruler: "The Ayyubid Sultan in Cairo"}}},
    {from: 1250, note: "The Mamluk sultanate", set: {rule: {ruler: "The Mamluk Sultan", council: "The Mamluk emirs and the shadow caliph"}}},
    {from: 1517, note: "Ottoman conquest", set: {rule: {ruler: "The Ottoman governor, with the Mamluk beys"}}},
    {from: 1805, note: "Muhammad Ali and the house that followed", set: {rule: {ruler: "The Pasha, later Khedive, of Egypt"}}},
    {from: 1876, note: "The Mixed Courts for cases with foreigners", add: {courts: ["The Mixed Courts, for any case touching a foreigner"]}},
    {from: 1882, note: "British occupation", set: {rule: {council: "The British Agent's advice, which is an order"}}},
    {from: 1922, note: "The Kingdom of Egypt", set: {rule: {form: "A constitutional monarchy", ruler: "The King of Egypt"}}},
    {from: 1953, note: "The republic; sharia courts merged into the state courts (1955)", set: {rule: {form: "A republic under military men", ruler: "The President"}},
      drop: {courts: ["The qadi's court, judging by sharia and the school of law the land follows", "The Mixed Courts, for any case touching a foreigner"]}}
  ],
  arabia: [
    {from: 0, note: "The holy cities under the Sharif of Mecca; tribes and imams beyond", set: {rule: {ruler: "The Sharif of Mecca, the imams of Yemen and the tribal shaykhs"}},
      add: {courts: ["Tribal custom and arbiters among the Bedouin"], warn: ["Only Muslims may enter Mecca and Medina"]}},
    {from: 1517, note: "Ottoman overlordship of the Hejaz", set: {rule: {council: "The sharif under an Ottoman governor"}}},
    {from: 1932, note: "The Kingdom of Saudi Arabia: sharia as the law of the state", set: {rule: {form: "An absolute monarchy under sharia", ruler: "The King", council: "The royal family and the senior scholars"}},
      add: {order: ["religious-police"]}},
    {from: 1950, note: "Sharia stays the law here; the courts keep flogging and the sword", add: {courts: ["The kingdom's sharia courts"], punish: ["flogging"]}}
  ],
  maghreb: [
    {from: 0, note: "The Almohad caliphate", set: {rule: {ruler: "The Almohad Caliph"}}},
    {from: 1270, note: "The Marinid, Zayyanid and Hafsid kingdoms", set: {rule: {ruler: "The Sultan in Fez, Tlemcen or Tunis"}}},
    {from: 1550, note: "Ottoman regencies in Algiers, Tunis and Tripoli; Morocco stays its own", set: {rule: {ruler: "The Dey, Bey or Pasha under the Ottomans; the Sultan in Morocco"}}},
    {from: 1830, note: "French conquest of Algeria; Tunisia (1881), Morocco (1912) and Libya (1911, Italy) follow", set: {rule: {form: "Colonies and protectorates of France, Spain and Italy", ruler: "The Governor-General or Resident-General"}},
      add: {courts: ["French courts for settlers, and for natives in grave matters"], warn: ["Settlers and natives do not stand under the same law"]}},
    {from: 1956, note: "Independence (Libya 1951, Morocco and Tunisia 1956, Algeria 1962)", set: {rule: {form: "Independent kingdoms and republics", ruler: "Each state's head"}},
      drop: {courts: ["French courts for settlers, and for natives in grave matters"], warn: ["Settlers and natives do not stand under the same law"]}}
  ],
  persia: [
    {from: 0, note: "The Khwarazmian shahs", set: {rule: {ruler: "The Shah of Khwarazm"}}},
    {from: 1256, note: "The Mongol Ilkhanate: the Yassa of Genghis Khan beside sharia", set: {rule: {ruler: "The Ilkhan"}}, add: {courts: ["The Mongol Yassa for the conquerors and the state"]}},
    {from: 1336, note: "The Ilkhanate breaks up; then Timur and the Timurids", drop: {courts: ["The Mongol Yassa for the conquerors and the state"]}},
    {from: 1501, note: "The Safavid shahs: Twelver Shi'a Islam the faith of the state", set: {rule: {ruler: "The Safavid Shah", council: "The shah's ministers and the Shi'a scholars"}}},
    {from: 1789, note: "The Qajar shahs", set: {rule: {ruler: "The Qajar Shah"}}},
    {from: 1906, note: "The Constitutional Revolution: a parliament", set: {rule: {form: "A constitutional monarchy", council: "The Majlis"}}},
    {from: 1925, note: "The Pahlavi shahs: codes on European lines; SAVAK from 1957", set: {rule: {ruler: "The Pahlavi Shah"}}, add: {order: ["secret-police"]}},
    {from: 1979, note: "The Islamic Republic: revolutionary courts and the Supreme Leader", set: {rule: {form: "An Islamic republic", ruler: "The Supreme Leader, and the President", council: "The Guardian Council and the Majlis"}},
      add: {courts: ["Islamic revolutionary courts"], order: ["religious-police"], punish: ["flogging"]}}
  ],
  nusantara: [
    {from: 0, note: "Hindu and Buddhist kingdoms: Srivijaya, then Majapahit (1293)", set: {rule: {form: "A Hindu-Buddhist kingdom of the islands", ruler: "The king of Srivijaya or Majapahit", council: "The court and the priests"},
      courts: ["The king's court under the law books of the realm", "Village custom (adat) and its elders"], taxes: ["Dues in rice and goods to the court"], order: ["bailiff", "town-watch"]},
      drop: {crimes: ["apostasy", "wine"], order: ["muhtasib"], warn: ["Wine is forbidden to Muslims; Christians and Jews may make it for their own", "Christians and Jews pay the poll tax, and in many towns may not bear arms or build new houses of worship", "The market inspector checks weights, prices and public conduct"]}},
    {from: 1400, note: "The sultanate of Malacca; Islam spreads through the ports", set: {rule: {form: "Sultanates of the ports and kingdoms inland", ruler: "The Sultan of Malacca, Aceh, Demak or Mataram"},
      courts: ["The qadi's court in the sultanates", "Village custom (adat) and its elders"]}, add: {crimes: ["apostasy"], order: ["shurta"]}},
    {from: 1619, note: "The Dutch East India Company at Batavia; Spain in the Philippines (1565), Britain in Malaya (1824)", set: {rule: {form: "Colonies and their client sultans", ruler: "The Governor-General"}},
      add: {courts: ["Colonial courts for Europeans", "Custom courts for natives"], warn: ["Europeans and natives do not stand under the same law"]}},
    {from: 1949, note: "Independent Indonesia (1945 to 1949), Malaysia (1957), the Philippines (1946)", set: {rule: {form: "Independent republics and a federation of sultans", ruler: "Each state's head"}},
      drop: {courts: ["Colonial courts for Europeans", "Custom courts for natives"], warn: ["Europeans and natives do not stand under the same law"]}}
  ],
  moravia: [
    {from: 0, note: "The Přemyslid crown: the duke, from 1198 king, with the margrave of Moravia below the crown",
      set: {rule: {form: "A kingdom of the Bohemian crown, with Moravia a margraviate under it", ruler: "The King of Bohemia, and the Margrave of Moravia", council: "The lords of the land and the bishop of Olomouc"}},
      add: {courts: ["The land court of the lords, which keeps the land tables of who owns what"]}},
    {from: 1243, note: "Brno receives its town law; German town law spreads to the royal towns", add: {courts: ["Town courts under Brno or Magdeburg law, with appeal to the mother town"]}},
    {from: 1249, note: "The Jihlava mining law: the mines keep their own court", add: {courts: ["The mining court, under the Jihlava mining law, for miners and their quarrels"]}},
    {from: 1420, to: 1436, note: "The Hussite wars: the Chalice against the crusaders", add: {warn: ["Hussite and Catholic each call the other a heretic: which side holds this town matters"]}},
    {from: 1500, note: "The land ordinance of 1500: the lords and knights rule the land beside the king", set: {rule: {council: "The estates: lords, knights and the royal towns"}}},
    {from: 1526, note: "The Habsburgs take the crown", set: {rule: {ruler: "The Habsburg King of Bohemia"}}},
    {from: 1628, note: "After the White Mountain: the Renewed Land Ordinance makes the crown hereditary and the land Catholic only",
      set: {rule: {form: "A hereditary Habsburg kingdom; the estates are tamed", council: "The king's lieutenants and the royal offices"}},
      add: {warn: ["Only the Catholic faith may be kept openly; Protestants hide their books or leave"]}},
    {from: 1768, note: "The Theresian criminal code", add: {courts: ["Royal criminal courts under the Theresian code"]}},
    {from: 1781, note: "Joseph II: the serfdom patent and the patent of toleration", drop: {crimes: ["wrong-faith"], warn: ["Only the Catholic faith may be kept openly; Protestants hide their books or leave"]}},
    {from: 1811, note: "The Austrian civil code", add: {courts: ["District courts under the Austrian codes"]}},
    {from: 1849, note: "The gendarmerie; the end of labour owed to lords (1848)", add: {order: ["gendarmerie"]}},
    {from: 1867, note: "The December constitution: a parliament in Vienna and the land diet in Brno", set: {rule: {form: "A crown land of the Austrian empire, with a constitution", ruler: "The Emperor of Austria, King of Bohemia", council: "The Moravian diet in Brno and the parliament in Vienna"}}},
    {from: 1918, note: "The Czechoslovak Republic", set: {rule: {form: "A parliamentary republic", ruler: "The President of the Republic", council: "The National Assembly and the government in Prague"}}},
    {from: 1939, to: 1945, note: "The Protectorate of Bohemia and Moravia under German occupation",
      set: {rule: {form: "An occupied protectorate", ruler: "The Reich Protector", council: "A puppet government under German orders"}, bribe: 5, catch: 0.6},
      add: {order: ["secret-police", "army"], punish: ["camp", "hanging"], warn: ["The Gestapo arrests on suspicion; courts under martial law shoot"]}},
    {from: 1945, note: "The republic restored", set: {rule: {form: "A parliamentary republic", ruler: "The President of the Republic", council: "The National Assembly"}, bribe: 3, catch: 0.45}},
    {from: 1948, to: 1989, note: "The Communist coup: one Party rules, the StB watches",
      set: {rule: {form: "A one-party state", ruler: "The First Secretary of the Party, and the President", council: "The Party's Central Committee"}, bribe: 3, catch: 0.6},
      add: {proof: ["party"], crimes: ["anti-state"], order: ["secret-police"], punish: ["camp", "hanging"], warn: ["Informers are everywhere: a careless word is a crime", "Leaving the country without leave is a crime"]}},
    {from: 1990, note: "After the Velvet Revolution: the death penalty is abolished (1990)", drop: {punish: ["hanging", "camp"], order: ["secret-police"]}, set: {catch: 0.55}},
    {from: 1993, note: "The Czech Republic", set: {rule: {form: "A parliamentary republic", ruler: "The President, and the Prime Minister", council: "The Parliament in Prague and the regional councils"}}},
    {from: 2004, note: "The Czech Republic joins the European Union", add: {courts: ["The courts of the European Union for European law"]}}
  ]
};

const uniq = a => [...new Set(a)];
function apply(rec, row, year) {
  // A law that lapsed (year past its to) leaves no trace: the rows on either side of it say what holds
  if ( row.to != null && year > row.to ) return;
  if ( row.set ) for ( const [k, v] of Object.entries(row.set) ) rec[k] = k === "rule" ? {...rec.rule, ...v} : (Array.isArray(v) ? [...v] : v);
  for ( const [k, ids] of Object.entries(row.add ?? {}) ) rec[k] = uniq([...(rec[k] ?? []), ...ids]);
  for ( const [k, ids] of Object.entries(row.drop ?? {}) ) rec[k] = (rec[k] ?? []).filter(x => !ids.includes(x));
}

/** The family a region uses now, and whether it is the stand-in. */
export function familyOf(region) {
  const id = REGION_FAMILY[region] ?? "custom";
  return FAMILIES[id] ? {id, family: FAMILIES[id], guess: !!FAMILIES[id].guess} : {id: "custom", family: FAMILIES.custom, guess: true, planned: id};
}

/** Every row that applies to a region, in year order (family rows before the region's own for the same year). */
export function rowsFor(region) {
  const fam = familyOf(region).family.rows.map(r => ({...r, own: false}));
  const own = (REGION_ROWS[region] ?? []).map(r => ({...r, own: true}));
  return [...fam, ...own].sort((a, b) => a.from - b.from || (a.own - b.own));
}

/**
 * The law of a region in a year.
 * @returns {{region, year, family, familyLabel, guess, planned?, rule, courts, proof, crimes, punish, order, taxes, warn, bribe, catch, since}}
 *   since: the year and note of the newest row in force
 */
export function lawOf(region = "moravia", year = 1197) {
  const y = Math.round(Number(year) || 0);
  const f = familyOf(region);
  const rec = blank(); let since = null;
  for ( const row of rowsFor(region) ) {
    if ( row.from > y ) break;
    apply(rec, row, y);
    if ( !(row.to != null && y > row.to) ) since = {year: row.from, note: row.note};
  }
  for ( const k of ROW_LISTS ) rec[k] = uniq(rec[k]);
  return {region, year: y, family: f.id, familyLabel: f.family.label, ...rec, guess: f.guess, ...(f.planned ? {planned: f.planned} : {}), since};
}

/** The rows crossed going from one year to another (either way), for the Storyteller's note when the clock jumps. */
export function changesBetween(region, from, to) {
  const a = Math.min(from, to), b = Math.max(from, to);
  const out = [];
  for ( const row of rowsFor(region) ) {
    if ( row.from > a && row.from <= b ) out.push({year: row.from, note: row.note});
    if ( row.to != null && row.to + 1 > a && row.to + 1 <= b ) out.push({year: row.to + 1, note: `No longer: ${row.note.charAt(0).toLowerCase()}${row.note.slice(1)}`});
  }
  return out.filter(r => r.year > 0).sort((x, y) => x.year - y.year);
}

export const BRIBE_WORDS = ["", "Cheap: a coin or a drink", "A small gift will do", "It will cost real money", "Dear, and only the right person will take it", "Dangerous even to try"];
export const label = (table, id) => table[id] ?? id;

/**
 * What a character sees on the Law here card. Everyone gets the ruler, the keepers of order and the warnings; each dot
 * of the best of Law, Politics or Streetwise opens one more section (B3492), and the Storyteller sees all of it.
 */
export function cardSections(rec, {dots = 0, full = false} = {}) {
  const s = [];
  s.push({key: "rule", title: "Who rules", lines: [rec.rule.ruler, rec.rule.form, rec.rule.council].filter(Boolean)});
  s.push({key: "order", title: "Who keeps order", lines: rec.order.map(id => label(ORDER, id))});
  if ( rec.warn.length ) s.push({key: "warn", title: "What a stranger should know", lines: [...rec.warn]});
  const more = [
    {key: "crimes", title: "Crimes on the books", lines: rec.crimes.map(id => label(CRIMES, id))},
    {key: "courts", title: "Who judges", lines: [...rec.courts]},
    {key: "proof", title: "How guilt is found", lines: rec.proof.map(id => label(PROOF, id))},
    {key: "punish", title: "Punishments", lines: rec.punish.map(id => label(PUNISH, id))},
    {key: "taxes", title: "What is owed", lines: [...rec.taxes]},
    {key: "bribe", title: "Bending the law", lines: [BRIBE_WORDS[Math.max(1, Math.min(5, rec.bribe))]]}
  ];
  const open = full ? more.length : Math.max(0, Math.min(more.length, Math.round(Number(dots) || 0)));
  return [...s, ...more.slice(0, open)].filter(x => x.lines.length);
}
