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
  unfilial: "Failing in duty to parents and elders",
  "caste-breach": "Breaking the rules of caste in food, touch or marriage", "cow-killing": "Killing a cow",
  "pass-law": "Being found without a pass where the pass laws apply",
  "commoner-arms": "A commoner carrying a sword", "leaving-country": "Leaving the country, or coming back from abroad",
  "alcohol": "Making or selling alcohol"
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
  confiscation: "Loss of land and goods", flogging: "Flogging", bamboo: "Beating with the light or the heavy bamboo",
  "outcaste": "Being put out of one's caste", "transportation": "Transportation to a penal colony overseas",
  "enslave": "Being sold into slavery"
};

/** Keepers of order. */
export const ORDER = {
  "hue-cry": "The hue and cry: everyone who hears it must chase", bailiff: "The lord's bailiff or reeve",
  "town-watch": "The town watch at the gates and on the walls", inquisitors: "Inquisitors hunting heresy",
  gendarmerie: "The gendarmerie on the roads and in the villages", police: "A state police force in uniform",
  detectives: "Detectives in plain clothes", "secret-police": "A secret police with informers everywhere",
  cameras: "Cameras on the streets and in shops", army: "Soldiers in the streets",
  muhtasib: "The muhtasib, inspector of markets and public conduct", shurta: "The shurta, the ruler's police", "religious-police": "Religious police who enforce dress, prayer and fasting",
  "yamen-runners": "The magistrate's runners and constables", baojia: "Neighbour groups that answer for one another",
  "headman": "The village headman and the watchmen",
  "societies": "Masked societies and age sets that keep order",
  "sheriff": "The sheriff of the shire, who can raise the posse",
  "jito": "The shogun's land stewards and constables",
  "clan-elders": "The elders and fighters of each clan",
  "marshals": "Federal marshals and town marshals"
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
  ]},

  // South Asia: dharma, caste councils, the sultans' and Mughals' qadis, Company and Crown, the 1950 constitution (B3495)
  "south-asia": {label: "South Asia", rows: [
    {from: 0, note: "Kings who rule by dharma, with learned Brahmins as their judges' counsel", set: {
      rule: {form: "Kingdoms whose kings uphold dharma", ruler: "The raja", council: "The ministers and the royal priests"},
      courts: ["The king's court, advised by Brahmins who read the dharma texts", "Caste councils that judge their own members", "The village assembly"],
      proof: ["witnesses", "oath", "ordeal"], punish: ["fine", "maiming", "banishment", "hanging", "outcaste"],
      order: ["headman", "town-watch"], taxes: ["The king's share of the harvest", "Tolls and market dues"], bribe: 2, catch: 0.3},
      add: {crimes: ["caste-breach", "cow-killing", "rebellion"], warn: ["Caste rules who may eat, marry, worship or draw water with whom"]}},
    {from: 1950, note: "The constitution of 1950: one law for every citizen; untouchability abolished",
      set: {rule: {form: "A federal parliamentary republic", ruler: "The Prime Minister, and the President", council: "Parliament and the state assemblies"},
        courts: ["District and high courts under the codes", "The Supreme Court", "The village council for small matters"], catch: 0.4},
      add: {order: ["police", "detectives"], proof: ["evidence", "forensic"], punish: ["prison"]},
      drop: {crimes: ["caste-breach"], proof: ["ordeal"], punish: ["outcaste", "maiming"], order: ["headman"]}},
    {from: 1995, note: "Cameras and computer crime", add: {order: ["cameras"], crimes: ["computer-crime", "terrorism"]}}
  ]},

  // Africa south of the Sahara: elders and kin, royal courts, colonial indirect rule, independence (B3496)
  african: {label: "Africa south of the Sahara", rows: [
    {from: 0, note: "Kings, chiefs and councils of elders keep the custom of the land", set: {
      rule: {form: "Kingdoms and chiefdoms ruled by custom", ruler: "The king or the chief", council: "The council of elders and the great lineages"},
      courts: ["The king's or chief's court, with elders sitting beside the judge", "Lineage and village elders, who settle most quarrels", "Masked societies and age sets that judge their own members"],
      proof: ["witnesses", "oath", "ordeal"], punish: ["fine", "banishment", "enslave", "hanging"],
      order: ["headman", "societies"], taxes: ["Tribute to the king in goods, cattle or labour", "Tolls on the trade routes"], bribe: 2, catch: 0.3},
      add: {crimes: ["sorcery", "rebellion"], warn: ["A charge of witchcraft can bring the poison ordeal", "Wrongs are often paid for in cattle or goods to the victim's kin"]}},
    {from: 1885, note: "Colonial rule: European courts above, native courts under the chiefs below",
      set: {rule: {form: "A colony of a European power", ruler: "The colonial governor", council: "The governor's council of officials"}, catch: 0.4},
      add: {courts: ["Colonial courts for Europeans and for grave crimes", "Native courts under the chiefs, watched by district officers"], order: ["police"], punish: ["prison", "hard-labour"], taxes: ["The hut tax or poll tax, paid in coin"],
        warn: ["Europeans and Africans do not stand under the same law"]},
      drop: {punish: ["enslave"], proof: ["ordeal"], warn: ["A charge of witchcraft can bring the poison ordeal"]}},
    {from: 1960, note: "Independence: new states, often under one party or the army",
      set: {rule: {form: "An independent state: a republic, often under one party or the army", ruler: "The President", council: "The ruling party or the military council"}, catch: 0.4},
      add: {order: ["detectives", "secret-police"], proof: ["evidence"]},
      drop: {courts: ["Colonial courts for Europeans and for grave crimes"], warn: ["Europeans and Africans do not stand under the same law"], taxes: ["The hut tax or poll tax, paid in coin"]}},
    {from: 1995, note: "Cameras and computer crime in the cities", add: {order: ["cameras"], crimes: ["computer-crime"]}}
  ]},

  // English common law: the king's justices, the jury, the sheriff, then Parliament, police and the empire (B3497)
  common: {label: "English common law", rows: [
    {from: 0, note: "The king's justices on circuit, the shire and manor courts, the church's courts", set: {
      rule: {form: "A crowned king over barons who owe service", ruler: "The King of England", council: "The great council of barons and bishops"},
      courts: ["The king's justices on circuit and the royal courts at Westminster", "Shire, hundred and manor courts", "The bishop's court for clergy, marriage, wills and heresy", "Borough courts under a town's charter"],
      proof: ["oath", "ordeal", "combat", "witnesses"], punish: ["fine", "penance", "pillory", "maiming", "outlawry", "hanging", "confiscation"],
      order: ["hue-cry", "sheriff", "bailiff", "town-watch"], taxes: ["The tithe to the church", "Feudal aids and scutage to the king", "Tolls at bridges and markets"], bribe: 2, catch: 0.25},
      add: {crimes: ["heresy", "sorcery", "poaching", "rebellion"], warn: ["The deer of the royal forests are the king's, and forest law is harsh"]}},
    {from: 1220, note: "After Magna Carta (1215) and the end of the ordeal, the jury decides guilt", add: {proof: ["jury"]}, drop: {proof: ["ordeal"]}},
    {from: 1285, note: "The Statute of Winchester: watch and ward in every town", set: {rule: {council: "Parliament, of lords and commons"}}},
    {from: 1351, note: "The Statute of Labourers and the Treason Act", add: {crimes: ["vagrancy"]}},
    {from: 1361, note: "Justices of the peace in every county", add: {courts: ["Justices of the peace at quarter sessions"]}},
    {from: 1401, to: 1676, note: "Heretics may be burned (repealed 1677)", add: {punish: ["burning"]}},
    {from: 1534, note: "The Church of England, with the monarch at its head", add: {crimes: ["wrong-faith"], warn: ["Refusing the established church brings fines, and worse"]}},
    {from: 1563, to: 1684, note: "The witchcraft acts and their trials", add: {warn: ["Witch trials hang the accused at the assizes"]}},
    {from: 1649, to: 1659, note: "The Commonwealth: no king", set: {rule: {form: "A commonwealth without a king", ruler: "The Lord Protector"}}},
    {from: 1689, note: "The Bill of Rights: the monarch rules with Parliament", set: {rule: {form: "A constitutional monarchy", ruler: "The King or Queen in Parliament", council: "Parliament and the cabinet"}}, drop: {crimes: ["heresy"]}},
    {from: 1718, to: 1868, note: "Transportation: to America until 1776, to Australia from 1788", add: {punish: ["transportation"]}},
    {from: 1736, note: "The Witchcraft Act of 1735: no more witches, only frauds who claim the power", add: {crimes: ["pretend-powers"]}, drop: {crimes: ["sorcery"]}},
    {from: 1749, note: "The Bow Street Runners", add: {order: ["detectives"]}},
    {from: 1752, to: 1832, note: "The bodies of hanged murderers go to the anatomists", add: {warn: ["A hanged murderer's body goes to the surgeons for dissection"]}},
    {from: 1829, note: "London's police; Catholic emancipation", add: {order: ["police"], punish: ["prison"]}, drop: {crimes: ["wrong-faith"], warn: ["Refusing the established church brings fines, and worse"], order: ["hue-cry", "bailiff", "town-watch"]},
      set: {bribe: 3, catch: 0.4}},
    {from: 1860, note: "Police in every county; the pillory and penance gone", drop: {punish: ["pillory", "penance", "maiming", "outlawry"], crimes: ["poaching"], warn: ["The deer of the royal forests are the king's, and forest law is harsh"]}, add: {proof: ["evidence"], punish: ["hard-labour"]}},
    {from: 1901, note: "Fingerprints at Scotland Yard; drug laws from 1920", add: {proof: ["forensic"], crimes: ["drug-trade", "sedition"]}},
    {from: 1951, note: "The Witchcraft Act repealed", drop: {crimes: ["pretend-powers"]}, set: {catch: 0.45}},
    {from: 1965, note: "Hanging for murder ends (for good in 1969)", drop: {punish: ["hanging"]}},
    {from: 1990, note: "Cameras on every high street; the Computer Misuse Act", add: {order: ["cameras"], crimes: ["computer-crime"]}, set: {catch: 0.6}},
    {from: 2000, note: "The Terrorism Act", add: {crimes: ["terrorism"]}}
  ]},

  // Orthodox and Russian law: the prince's law beside the church's canons, then codes, the tsars, the Party (B3498)
  orthodox: {label: "Orthodox and Russian law", rows: [
    {from: 0, note: "The prince's law beside the church's canons", set: {
      rule: {form: "A principality or empire whose ruler stands beside the Orthodox church", ruler: "The grand prince or the emperor", council: "The boyars or the great officials, and the bishops"},
      courts: ["The prince's court and the prince's officials", "Church courts under the canons for clergy, marriage and morals", "Village communes and their elders"],
      proof: ["witnesses", "oath", "ordeal", "combat"], punish: ["fine", "flogging", "banishment", "maiming", "hanging", "confiscation"],
      order: ["bailiff", "town-watch"], taxes: ["Tribute and dues to the prince", "Tolls on the rivers and at markets"], bribe: 3, catch: 0.3},
      add: {crimes: ["heresy", "sorcery", "blasphemy", "rebellion"], warn: ["Blood money is owed for a killing, by the victim's rank"]}},
    {from: 1800, note: "Ministries, police and prisons", add: {order: ["police"], punish: ["prison", "hard-labour"]}, drop: {proof: ["ordeal", "combat"], warn: ["Blood money is owed for a killing, by the victim's rank"]}, set: {catch: 0.4}},
    {from: 1900, note: "Fingerprints and the new codes", add: {proof: ["evidence", "forensic"], crimes: ["sedition", "drug-trade"]}, drop: {crimes: ["heresy", "sorcery"]}},
    {from: 1990, note: "Cameras and computer crime", add: {order: ["cameras"], crimes: ["computer-crime", "terrorism"]}, set: {catch: 0.5}}
  ]},

  // Japan: the shogun's law beside the court's, warrior house law, the Tokugawa order, the Meiji codes (B3499)
  japanese: {label: "Japan", rows: [
    {from: 0, note: "The emperor reigns in Kyoto; the shogun's government in Kamakura rules", set: {
      rule: {form: "An empire in name, ruled by the shogun's warrior government", ruler: "The Shogun, in the Emperor's name", council: "The shogunate's regents and council"},
      courts: ["The shogunate's courts for warriors and their lands", "The imperial court's old codes for the court nobles", "Temples and shrines judging the people of their own estates", "Village elders"],
      proof: ["witnesses", "oath"], punish: ["fine", "banishment", "hanging", "confiscation"],
      order: ["jito", "town-watch"], taxes: ["Rice tax to the lord of the land", "Labour for the lord"], bribe: 2, catch: 0.3},
      add: {crimes: ["rebellion"], warn: ["A warrior may answer an insult from a commoner with the sword"]}},
    {from: 1232, note: "The Goseibai Shikimoku, the warriors' own code", add: {courts: ["Shogunal judges under the Goseibai Shikimoku"]}},
    {from: 1338, note: "The Ashikaga shoguns in Kyoto", set: {rule: {ruler: "The Ashikaga Shogun"}}},
    {from: 1467, to: 1587, note: "The age of warring states: each warlord's house law rules the domain", add: {warn: ["Each warlord's house law rules the domain; the shogun's word reaches nowhere"]}},
    {from: 1588, note: "The sword hunt: weapons taken from commoners", add: {crimes: ["commoner-arms"]}},
    {from: 1603, note: "The Tokugawa order: shogun in Edo, daimyo in their domains, groups of five households", set: {rule: {ruler: "The Tokugawa Shogun in Edo", council: "The senior councillors and the daimyo"}},
      add: {courts: ["The shogunate's magistrates in Edo, Osaka and Kyoto", "Each daimyo's own court in the domain"], order: ["baojia"], punish: ["flogging"]}},
    {from: 1614, to: 1872, note: "Christianity forbidden", add: {crimes: ["wrong-faith"], warn: ["Christians are hunted; villagers must tread on a holy image to prove they are not"]}},
    {from: 1639, to: 1853, note: "The closed country", add: {crimes: ["leaving-country"]}},
    {from: 1868, note: "The Meiji restoration: the emperor rules; codes on French then German lines", set: {rule: {form: "An empire under the Meiji constitution (1889)", ruler: "The Emperor", council: "The cabinet and the Imperial Diet"}, bribe: 3, catch: 0.45},
      add: {courts: ["The new courts of the empire"], order: ["police", "detectives"], punish: ["prison", "hard-labour"], proof: ["evidence"]},
      drop: {courts: ["The shogunate's courts for warriors and their lands", "Shogunal judges under the Goseibai Shikimoku", "The shogunate's magistrates in Edo, Osaka and Kyoto", "Each daimyo's own court in the domain"], order: ["jito", "baojia", "town-watch"], warn: ["A warrior may answer an insult from a commoner with the sword"]}},
    {from: 1876, note: "Swords banned in public", drop: {crimes: ["commoner-arms"]}, add: {warn: ["Only soldiers and police may wear a sword in public"]}},
    {from: 1925, to: 1945, note: "The Peace Preservation Law and the thought police", add: {crimes: ["anti-state"], order: ["secret-police"], warn: ["The thought police arrest people for their opinions"]}},
    {from: 1947, note: "The postwar constitution", set: {rule: {form: "A constitutional monarchy with a parliament", ruler: "The Prime Minister; the Emperor as symbol", council: "The National Diet"}, catch: 0.55},
      add: {proof: ["forensic"], crimes: ["drug-trade"]}, drop: {punish: ["hard-labour"]}},
    {from: 1990, note: "Cameras and computer crime", add: {order: ["cameras"], crimes: ["computer-crime"]}, set: {catch: 0.65}}
  ]},

  // The steppe and the north of Asia: clan custom, the Yassa of the khans, then khanates, Russia, the Soviets (B3600)
  steppe: {label: "The steppe and northern Asia", rows: [
    {from: 0, note: "Clan custom; khans raised by the assembly of the clans", set: {
      rule: {form: "Khans and clan chiefs, raised by the assembly of the great clans", ruler: "The khan", council: "The assembly of the clans"},
      courts: ["The khan's court", "Clan elders judging by custom"], proof: ["oath", "witnesses"], punish: ["fine", "banishment", "hanging"],
      order: ["clan-elders"], taxes: ["Tribute in horses, livestock and furs"], bribe: 2, catch: 0.3},
      add: {crimes: ["rebellion"], warn: ["Horse theft is paid back many times over, or with death"]}},
    {from: 1206, note: "The Great Yassa of Genghis Khan", add: {courts: ["The khan's judges under the Great Yassa"], warn: ["The law of the khans forbids fouling running water"]}},
    {from: 1900, note: "Russian, Chinese and later Soviet courts and police", set: {rule: {form: "Provinces of an empire, later Soviet republics"}, catch: 0.45},
      add: {order: ["police", "secret-police"], punish: ["prison", "camp"], proof: ["evidence"], courts: ["The state's courts"]},
      drop: {courts: ["The khan's judges under the Great Yassa", "The khan's court"], warn: ["The law of the khans forbids fouling running water"]}},
    {from: 1992, note: "Independent republics and the Russian Federation", drop: {punish: ["camp"]}, add: {order: ["cameras"], crimes: ["computer-crime", "drug-trade"]}}
  ]},

  // The Americas: the peoples' own councils and empires, then Spanish, Portuguese, French and English colonial law, then the republics (B3601)
  americas: {label: "The Americas", rows: [
    {from: 0, note: "The peoples of the land under their own councils and custom", set: {
      rule: {form: "Nations, chiefdoms and city-states under their own councils", ruler: "The chiefs and councils of each nation", council: "The councils of elders and clans"},
      courts: ["The council of the nation, town or clan", "Elders who settle quarrels by custom"], proof: ["witnesses", "oath"], punish: ["fine", "banishment", "hanging"],
      order: ["clan-elders"], taxes: ["Gifts and shares to the chiefs, or tribute where an empire rules"], bribe: 2, catch: 0.3},
      add: {warn: ["Kin answer for kin: a killing is covered by gifts to the dead one's family, or by revenge"]}},
    {from: 1900, note: "Modern courts, police and prisons", add: {order: ["police", "detectives"], punish: ["prison"], proof: ["evidence", "forensic"], crimes: ["drug-trade", "sedition"]}, drop: {order: ["clan-elders"]}, set: {catch: 0.45}},
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
  mexico: [
    {from: 1428, note: "The Triple Alliance of the Mexica: the tlatoani's judges and strict sentences", set: {rule: {form: "An empire of tribute", ruler: "The Huey Tlatoani of Tenochtitlan", council: "The council of nobles"}},
      add: {courts: ["The tlatoani's judges in Tenochtitlan"], warn: ["Drunkenness in public is punished by death, save for the old"]}},
    {from: 1521, note: "New Spain: the Audiencia, a viceroy from 1535, the Holy Office from 1571", set: {rule: {form: "A viceroyalty of the Spanish crown", ruler: "The Viceroy of New Spain", council: "The Audiencia of Mexico"}, bribe: 3},
      add: {courts: ["The Audiencia of Mexico", "The Holy Office of the Inquisition, for heresy and sorcery", "The General Court of the Indians"], crimes: ["heresy", "sorcery", "wrong-faith", "blasphemy"], punish: ["burning", "galleys", "flogging"], order: ["bailiff", "inquisitors"], taxes: ["The tribute of the Indian towns", "The tithe"]},
      drop: {order: ["clan-elders"], courts: ["The tlatoani's judges in Tenochtitlan"], warn: ["Kin answer for kin: a killing is covered by gifts to the dead one's family, or by revenge", "Drunkenness in public is punished by death, save for the old"]}},
    {from: 1821, note: "Independent Mexico; the Inquisition ended (1820)", set: {rule: {form: "An independent republic, often under strongmen", ruler: "The President", council: "Congress"}},
      drop: {courts: ["The Audiencia of Mexico", "The Holy Office of the Inquisition, for heresy and sorcery", "The General Court of the Indians"], crimes: ["heresy", "sorcery", "wrong-faith"], punish: ["burning", "galleys"], order: ["inquisitors"], taxes: ["The tribute of the Indian towns", "The tithe"]}, add: {courts: ["The republic's courts"]}},
    {from: 1910, to: 1920, note: "The Revolution", add: {warn: ["Revolutionary armies are the only law in much of the land"]}},
    {from: 1929, to: 1999, note: "One party holds power", add: {warn: ["The ruling party decides who wins and who is charged"]}, set: {bribe: 4}},
    {from: 2000, note: "Contested elections; the drug wars", set: {bribe: 4}}
  ],
  andes: [
    {from: 1438, note: "Tawantinsuyu, the Inca state: labour owed to the state, harsh law for idleness and theft", set: {rule: {form: "An empire of labour service", ruler: "The Sapa Inca", council: "The Inca nobility"}},
      add: {courts: ["The Inca's governors and inspectors"], taxes: ["The mit'a, labour owed to the state"], warn: ["Theft, lies and idleness are crimes against the Inca"]}},
    {from: 1533, note: "Spanish Peru: the viceroy (1542), the Audiencia of Lima, the Holy Office (1570), the silver mines", set: {rule: {form: "A viceroyalty of the Spanish crown", ruler: "The Viceroy of Peru", council: "The Audiencia of Lima"}, bribe: 3},
      add: {courts: ["The Audiencia of Lima", "The Holy Office of the Inquisition, for heresy and sorcery"], crimes: ["heresy", "sorcery", "wrong-faith", "blasphemy"], punish: ["burning", "flogging"], order: ["bailiff", "inquisitors"], warn: ["Indian towns must send their share of men to the silver mines of Potosí"]},
      drop: {order: ["clan-elders"], courts: ["The Inca's governors and inspectors"], warn: ["Kin answer for kin: a killing is covered by gifts to the dead one's family, or by revenge", "Theft, lies and idleness are crimes against the Inca"]}},
    {from: 1825, note: "Independent republics", set: {rule: {form: "Independent republics", ruler: "The President", council: "Congress"}},
      drop: {courts: ["The Audiencia of Lima", "The Holy Office of the Inquisition, for heresy and sorcery"], crimes: ["heresy", "sorcery", "wrong-faith"], punish: ["burning"], order: ["inquisitors"], taxes: ["The mit'a, labour owed to the state"], warn: ["Indian towns must send their share of men to the silver mines of Potosí"]},
      add: {courts: ["The republics' courts"]}}
  ],
  caribbean: [
    {from: 0, note: "The Taíno and Kalinago under their caciques", set: {rule: {ruler: "The caciques"}}},
    {from: 1492, note: "Spanish rule, then English, French and Dutch colonies", set: {rule: {form: "Colonies of European crowns", ruler: "The colonial governor", council: "The governor's council and the planters' assembly"}},
      add: {courts: ["Colonial courts under each crown's law"], crimes: ["heresy", "wrong-faith"], order: ["bailiff"], punish: ["flogging"]}, drop: {order: ["clan-elders"], warn: ["Kin answer for kin: a killing is covered by gifts to the dead one's family, or by revenge"]}},
    {from: 1520, to: 1885, note: "Plantation slavery and the slave codes (the French Code Noir of 1685)", add: {warn: ["The enslaved are property in law, and a master's punishment is lawful"]}},
    {from: 1804, note: "Haiti, the first free republic of the region", add: {courts: ["Haiti's own courts"]}},
    {from: 1898, note: "Cuba free of Spain; later independence for many islands (Jamaica 1962)", set: {rule: {form: "Independent republics and remaining colonies", ruler: "Each state's head or governor"}}, drop: {crimes: ["heresy", "wrong-faith"]}},
    {from: 1959, note: "Revolutionary Cuba: one Party", add: {warn: ["In Cuba, the Committees for the Defence of the Revolution watch every street"]}}
  ],
  brazil: [
    {from: 0, note: "The Tupi and other peoples of the forest", set: {rule: {ruler: "The chiefs of each people"}}},
    {from: 1532, note: "Portuguese captaincies, a governor-general from 1549, the Ordinances of the Philippine kings (1603)", set: {rule: {form: "A colony of the Portuguese crown", ruler: "The governor-general, later the viceroy", council: "The Relação, the high court of Bahia"}},
      add: {courts: ["The Relação of Bahia, and the captains' own justice"], crimes: ["heresy", "wrong-faith"], order: ["bailiff"], punish: ["flogging", "galleys"]}, drop: {order: ["clan-elders"], warn: ["Kin answer for kin: a killing is covered by gifts to the dead one's family, or by revenge"]}},
    {from: 1550, to: 1887, note: "Slavery, until the Golden Law of 1888", add: {warn: ["The enslaved are property in law, and a master's punishment is lawful"]}},
    {from: 1822, note: "The Empire of Brazil", set: {rule: {form: "A constitutional empire", ruler: "The Emperor of Brazil", council: "The General Assembly"}}, drop: {crimes: ["heresy", "wrong-faith"], punish: ["galleys"]}},
    {from: 1889, note: "The Republic", set: {rule: {form: "A federal republic", ruler: "The President", council: "Congress"}}},
    {from: 1964, to: 1984, note: "The military dictatorship", add: {order: ["secret-police"], warn: ["The military regime tortures and disappears its opponents"]}}
  ],
  "southern-cone": [
    {from: 0, note: "The Mapuche and the peoples of the pampas", set: {rule: {ruler: "The lonkos and chiefs"}}},
    {from: 1541, note: "Spanish Santiago (1541) and Buenos Aires (1580); the Mapuche stay free south of the Biobío", set: {rule: {form: "Spanish provinces, and free Mapuche lands to the south", ruler: "The Spanish governor", council: "The Audiencia"}},
      add: {courts: ["The Audiencia and the colonial courts"], crimes: ["heresy", "wrong-faith"], order: ["bailiff"], punish: ["flogging"]}, drop: {order: ["clan-elders"], warn: ["Kin answer for kin: a killing is covered by gifts to the dead one's family, or by revenge"]}},
    {from: 1818, note: "Independent Chile and Argentina", set: {rule: {form: "Independent republics", ruler: "The President", council: "Congress"}}, drop: {crimes: ["heresy", "wrong-faith"], courts: ["The Audiencia and the colonial courts"]}, add: {courts: ["The republics' courts"]}},
    {from: 1973, to: 1990, note: "Military juntas in Chile (1973 to 1990) and Argentina (1976 to 1983)", add: {order: ["secret-police"], warn: ["The junta's men take people in the night, and many are never seen again"]}}
  ],
  "north-america-east": [
    {from: 0, note: "The nations of the eastern woodlands; the Great Law of the Haudenosaunee", add: {courts: ["The Haudenosaunee Grand Council under the Great Law, and the clan mothers"]}},
    {from: 1607, note: "English colonies under the common law", set: {rule: {form: "English colonies with their own assemblies", ruler: "The royal governor", council: "The colonial assembly"}},
      add: {courts: ["County courts under the common law", "The colony's general court"], crimes: ["heresy", "sorcery", "blasphemy", "wrong-faith"], proof: ["jury"], order: ["sheriff", "town-watch"], punish: ["pillory", "flogging"]}, drop: {order: ["clan-elders"], warn: ["Kin answer for kin: a killing is covered by gifts to the dead one's family, or by revenge"]}},
    {from: 1692, to: 1692, note: "The Salem witch trials", add: {warn: ["Witch trials hang the accused at Salem"]}},
    {from: 1700, to: 1864, note: "Slavery, in the south until 1865", add: {warn: ["The enslaved are property in law, and a master's punishment is lawful"]}},
    {from: 1776, note: "The United States; the Constitution and the Bill of Rights (1789 to 1791)", set: {rule: {form: "A federal republic", ruler: "The President", council: "Congress, and the state legislatures"}},
      drop: {crimes: ["heresy", "sorcery", "blasphemy", "wrong-faith"], punish: ["pillory"]}, add: {courts: ["State and federal courts", "The Supreme Court"]}},
    {from: 1920, to: 1933, note: "Prohibition", add: {crimes: ["alcohol"], warn: ["Making or selling liquor is a federal crime"]}},
    {from: 1935, note: "The FBI", add: {warn: ["Federal agents chase kidnappers, bank robbers and spies across state lines"]}},
    {from: 1966, note: "Civil rights law (1964) and the Miranda warning (1966)", add: {warn: ["The police must tell the arrested of their rights"]}}
  ],
  "north-america-west": [
    {from: 0, note: "The Plains, Pueblo and Pacific nations"},
    {from: 1598, note: "Spanish New Mexico and later California", set: {rule: {form: "Spanish, later Mexican, frontier provinces", ruler: "The governor in Santa Fe or Monterey"}}, add: {courts: ["The governor's and the missions' justice"], crimes: ["heresy", "wrong-faith"]}},
    {from: 1848, note: "The United States takes the West", set: {rule: {form: "Territories and states of the United States", ruler: "The territorial governor, later the state governor", council: "Congress, and the territorial or state legislature"}},
      drop: {courts: ["The governor's and the missions' justice"], crimes: ["heresy", "wrong-faith"]}, add: {courts: ["Territorial and federal courts"], order: ["sheriff", "marshals"]}},
    {from: 1850, to: 1899, note: "The Wild West: marshals, posses, vigilance committees", add: {warn: ["Out past the railhead, the marshal's gun and the posse are the law; vigilance committees hang without trial"]}, set: {catch: 0.25}},
    {from: 1920, to: 1933, note: "Prohibition", add: {crimes: ["alcohol"]}}
  ],
  canada: [
    {from: 0, note: "The nations of the north woods and the plains"},
    {from: 1608, note: "New France under the Custom of Paris", set: {rule: {form: "A colony of the French crown", ruler: "The Governor of New France", council: "The Sovereign Council"}}, add: {courts: ["The courts of New France under the Custom of Paris"], crimes: ["heresy", "wrong-faith"], order: ["bailiff"]}, drop: {order: ["clan-elders"], warn: ["Kin answer for kin: a killing is covered by gifts to the dead one's family, or by revenge"]}},
    {from: 1763, note: "British rule; Quebec keeps French civil law (1774)", set: {rule: {ruler: "The British governor"}}, add: {courts: ["British criminal courts, with French civil law in Quebec"], proof: ["jury"]}, drop: {crimes: ["heresy", "wrong-faith"]}},
    {from: 1867, note: "Confederation; the North-West Mounted Police from 1873", set: {rule: {form: "A federal dominion under the crown", ruler: "The Prime Minister, and the Governor General", council: "Parliament in Ottawa"}}, add: {order: ["police"]}},
    {from: 1883, to: 1996, note: "The residential schools", add: {warn: ["Children of the First Nations are taken from their families to residential schools"]}},
    {from: 1976, note: "The death penalty abolished", drop: {punish: ["hanging"]}},
    {from: 1982, note: "The Charter of Rights and Freedoms", add: {courts: ["Courts under the Charter of Rights and Freedoms"]}}
  ],
  "central-asia": [
    {from: 0, note: "The Qara Khitai and the Khwarazmian shahs", set: {rule: {ruler: "The Gurkhan of the Qara Khitai and the Shah of Khwarazm"}}, add: {courts: ["The qadi's court in Samarkand, Bukhara and the oasis towns"]}},
    {from: 1219, note: "The Mongol conquest; the Chagatai khans", set: {rule: {ruler: "The Chagatai Khan"}}},
    {from: 1370, note: "Timur and the Timurids", set: {rule: {ruler: "Timur, later the Timurid princes"}}},
    {from: 1500, note: "The Uzbek khanates of Bukhara, Khiva and Kokand", set: {rule: {ruler: "The Khan of Bukhara, Khiva or Kokand"}}},
    {from: 1865, note: "Russian conquest (Tashkent 1865, Bukhara a protectorate 1868)", set: {rule: {ruler: "The Russian Governor-General of Turkestan"}}},
    {from: 1924, note: "Soviet republics", set: {rule: {form: "Soviet republics under one Party", ruler: "The Party's First Secretary"}}, add: {proof: ["party"], crimes: ["anti-state"]},
      drop: {courts: ["The qadi's court in Samarkand, Bukhara and the oasis towns"]}},
    {from: 1991, note: "Independent republics, most under strong presidents", set: {rule: {form: "Independent republics", ruler: "The President"}}, drop: {proof: ["party"], crimes: ["anti-state"]}}
  ],
  siberia: [
    {from: 0, note: "The peoples of the taiga and the tundra keep their own custom", set: {rule: {form: "Peoples of the forest and the tundra under their own elders and shamans", ruler: "The clan elders", council: "The clan gatherings"}}},
    {from: 1582, note: "Russian conquest: fur tribute and forts", set: {rule: {form: "A Russian frontier of forts", ruler: "The tsar's governors in the forts"}}, add: {taxes: ["The fur tribute to the tsar"], order: ["bailiff"]}},
    {from: 1650, note: "Siberia becomes the empire's place of exile", add: {warn: ["Convicts and exiles from all Russia serve out their sentences here"]}},
    {from: 1930, to: 1960, note: "The Gulag camps", add: {warn: ["The camps of the Gulag lie across the land"]}},
    {from: 1961, note: "The camps close", drop: {warn: ["Convicts and exiles from all Russia serve out their sentences here"], taxes: ["The fur tribute to the tsar"]}}
  ],
  russia: [
    {from: 0, note: "The princes of the Rus under the Russkaya Pravda; Novgorod ruled by its assembly", set: {rule: {ruler: "The princes of the Rus, and Novgorod's assembly", council: "The boyars and the town assemblies"}}},
    {from: 1240, to: 1479, note: "The Mongol yoke: the princes rule by the khan's patent and pay tribute", add: {warn: ["The princes rule only with the Golden Horde's patent, and tribute goes to the khan"], taxes: ["Tribute to the Golden Horde"]}},
    {from: 1497, note: "The Sudebnik of Ivan III: a law code for Muscovy", set: {rule: {ruler: "The Grand Prince of Moscow"}}, add: {courts: ["The grand prince's governors under the Sudebnik"]}},
    {from: 1547, note: "The tsar", set: {rule: {form: "An autocracy", ruler: "The Tsar", council: "The boyar council and the Assembly of the Land"}}},
    {from: 1565, to: 1572, note: "The oprichnina: the tsar's private terror", add: {warn: ["The oprichniki in black ride with dog's heads at the saddle and kill as they please"]}},
    {from: 1649, note: "The Ulozhenie: serfs bound to the land for good", add: {warn: ["A runaway serf is hunted and returned to the lord"]}},
    {from: 1711, note: "Peter's Senate, the Holy Synod (1721) and the Table of Ranks", set: {rule: {form: "An autocratic empire", ruler: "The Emperor of All Russia", council: "The Senate and the Holy Synod"}}},
    {from: 1826, to: 1880, note: "The Third Section, the tsar's political police", add: {order: ["secret-police"]}},
    {from: 1861, note: "The serfs freed", drop: {warn: ["A runaway serf is hunted and returned to the lord"]}},
    {from: 1864, note: "Court reform: public trials, lawyers, juries", add: {proof: ["jury"], courts: ["Circuit courts with juries, after the reform of 1864"]}},
    {from: 1881, note: "The Okhrana; exile to Siberia", add: {order: ["secret-police"], punish: ["transportation"]}},
    {from: 1906, note: "The Duma", set: {rule: {council: "The State Duma and the State Council"}}},
    {from: 1917, note: "The Bolsheviks: the Cheka, revolutionary tribunals, the Party over all",
      set: {rule: {form: "A one-party Soviet state", ruler: "The leader of the Communist Party", council: "The Politburo"}, catch: 0.55},
      add: {courts: ["People's courts and revolutionary tribunals"], proof: ["party"], crimes: ["anti-state"], order: ["secret-police"]},
      drop: {courts: ["Church courts under the canons for clergy, marriage and morals", "Circuit courts with juries, after the reform of 1864"], proof: ["jury"], crimes: ["blasphemy", "heresy"]}},
    {from: 1930, to: 1960, note: "The Gulag", add: {punish: ["camp"]}},
    {from: 1936, to: 1938, note: "The Great Terror", add: {warn: ["Neighbours denounce neighbours; arrests come at night and few come back"]}},
    {from: 1991, note: "The Russian Federation", set: {rule: {form: "A federal republic with a strong president", ruler: "The President", council: "The Federal Assembly"}}, drop: {proof: ["party"], crimes: ["anti-state"]}},
    {from: 1996, note: "A moratorium on the death penalty", drop: {punish: ["hanging"]}}
  ],
  aegean: [
    {from: 0, note: "The Byzantine empire under Roman law", set: {rule: {form: "The Roman empire of the east", ruler: "The Emperor in Constantinople", council: "The imperial court and the Patriarch"}},
      add: {courts: ["Imperial judges under the Basilika, the Roman law in Greek"]}, drop: {proof: ["ordeal", "combat"]}},
    {from: 1204, to: 1260, note: "The Latin Empire after the Fourth Crusade", add: {warn: ["Frankish lords rule Constantinople and many islands by their own feudal law"]}},
    {from: 1453, note: "The Ottoman conquest: the Patriarch judges Orthodox Christians in family matters", set: {rule: {form: "A province of the Ottoman empire", ruler: "The Ottoman Sultan", council: "The sultan's governors; the Patriarch for the Orthodox"}},
      add: {courts: ["The qadi's court", "The Patriarch's court for Orthodox Christians"], taxes: ["The poll tax on Christians and Jews"]},
      drop: {courts: ["Imperial judges under the Basilika, the Roman law in Greek"]}},
    {from: 1830, note: "The Kingdom of Greece, with codes on Bavarian and French lines", set: {rule: {form: "A kingdom, later a republic", ruler: "The King of the Hellenes"}},
      drop: {courts: ["The qadi's court"], taxes: ["The poll tax on Christians and Jews"]}, add: {courts: ["The Greek state's courts"]}},
    {from: 1967, to: 1974, note: "The colonels' junta", add: {warn: ["The junta's military police torture suspects"], order: ["secret-police"]}},
    {from: 1975, note: "The Third Republic; the EEC in 1981", set: {rule: {form: "A parliamentary republic", ruler: "The Prime Minister, and the President"}}}
  ],
  "british-isles": [
    {from: 0, note: "England's Angevin kings; Scotland's own crown and law; Welsh princes; Irish kings and the English lordship of Ireland",
      add: {courts: ["Scotland's own courts and law, Welsh law in the princes' lands, Irish Brehon law beyond the Pale"]}},
    {from: 1284, note: "Wales under the English crown", set: {rule: {ruler: "The King of England, and the King of Scots"}}},
    {from: 1707, note: "Union with Scotland: Great Britain, Scots law kept", set: {rule: {ruler: "The monarch of Great Britain"}}},
    {from: 1922, note: "The Irish Free State leaves the United Kingdom", set: {rule: {ruler: "The monarch of the United Kingdom; Ireland's own government in Dublin"}}}
  ],
  "west-africa": [
    {from: 0, note: "Kingdoms of the savanna and forest, Ghana's heirs", set: {rule: {ruler: "The kings of the savanna and the forest"}}},
    {from: 1235, note: "The Mali empire under the mansa; qadis in the trading towns", set: {rule: {ruler: "The Mansa of Mali", council: "The mansa's council of clan heads"}},
      add: {courts: ["The qadi's court in Timbuktu, Djenné and the trading towns"]}},
    {from: 1464, note: "The Songhai empire", set: {rule: {ruler: "The Askia of Songhai"}}},
    {from: 1520, to: 1867, note: "The Atlantic slave trade", add: {warn: ["Raiders and kings sell captives to the slave ships on the coast"]}},
    {from: 1804, note: "The Sokoto caliphate in the north", add: {courts: ["Sharia courts of the Sokoto caliphate"]}},
    {from: 1957, note: "Independence, Ghana first", set: {rule: {ruler: "Each state's president"}}}
  ],
  "east-africa": [
    {from: 0, note: "The Zagwe kings in Ethiopia; Swahili sultans on the coast", set: {rule: {ruler: "The Zagwe King of Ethiopia, and the Swahili sultans", council: "The court, the church and the coast's merchant families"}},
      add: {courts: ["The qadi's court in Kilwa, Mombasa and the coast towns", "The Ethiopian church's courts"]}},
    {from: 1270, note: "The Solomonic emperors of Ethiopia", set: {rule: {ruler: "The Solomonic Emperor of Ethiopia, and the Swahili sultans"}}},
    {from: 1450, note: "The Fetha Nagast, the law of the kings, in Ethiopia", add: {courts: ["The emperor's judges under the Fetha Nagast"]}},
    {from: 1698, note: "Oman holds the coast from Zanzibar", set: {rule: {ruler: "The Ethiopian Emperor, and the Sultan of Zanzibar on the coast"}}},
    {from: 1936, to: 1941, note: "Italian occupation of Ethiopia", add: {warn: ["Italian occupiers rule Ethiopia by force"]}},
    {from: 1974, to: 1991, note: "The Derg in Ethiopia: the Red Terror", add: {warn: ["In Ethiopia the Derg kills its opponents in the streets"]}}
  ],
  "southern-africa": [
    {from: 0, note: "Mapungubwe and Great Zimbabwe, then the Mutapa kings", set: {rule: {ruler: "The kings of Great Zimbabwe, later the Mwene Mutapa"}}},
    {from: 1652, note: "The Dutch at the Cape, under Roman-Dutch law", add: {courts: ["The Cape's courts under Roman-Dutch law"]}},
    {from: 1816, to: 1879, note: "The Zulu kingdom", add: {warn: ["The Zulu king's regiments enforce the king's word"]}},
    {from: 1948, to: 1993, note: "Apartheid: race decides where one may live, work, marry and walk", add: {crimes: ["pass-law"], warn: ["Black South Africans must carry a pass and may be arrested without one"], order: ["secret-police"]}},
    {from: 1994, note: "Democratic South Africa; the death penalty abolished (1995) and a new constitution (1996)", drop: {punish: ["hanging"]}}
  ],
  "central-africa": [
    {from: 0, note: "The Kongo kingdom and the kingdoms of the great lakes", set: {rule: {ruler: "The Manikongo, and the kings of the lakes"}}},
    {from: 1491, note: "Kongo's kings take the Christian faith", add: {courts: ["Church courts at the Kongo royal capital"]}},
    {from: 1885, to: 1908, note: "The Congo Free State: rubber quotas, hostages and severed hands", add: {warn: ["The Free State's soldiers maim those who fall short of the rubber quota"]}},
    {from: 1965, to: 1997, note: "Mobutu's rule in Zaire", add: {warn: ["In Zaire every official must be bought, and the President's men can do anything"]}, set: {bribe: 4}},
    {from: 1998, note: "War in the Congo", set: {bribe: 3}}
  ],
  india: [
    {from: 0, note: "Rajput and southern kingdoms; Ghurid armies in the north", set: {rule: {ruler: "The Rajput kings in the north, the Chola and Hoysala kings in the south"}}},
    {from: 1206, note: "The Delhi Sultanate in the north; Hindu kingdoms in the south (Vijayanagara from 1336)", set: {rule: {ruler: "The Sultan of Delhi in the north; Hindu kings in the south", council: "The sultan's nobles and the qadis"}},
      add: {courts: ["The qadi's court for Muslims and for crimes in the sultan's cities"], taxes: ["The poll tax on non-Muslims, where the sultan levies it"]}},
    {from: 1526, note: "The Mughal empire", set: {rule: {ruler: "The Mughal Emperor", council: "The emperor's ministers and mansabdars"}}},
    {from: 1564, note: "Akbar lifts the poll tax on non-Muslims", drop: {taxes: ["The poll tax on non-Muslims, where the sultan levies it"]}},
    {from: 1679, note: "Aurangzeb brings the poll tax back", add: {taxes: ["The poll tax on non-Muslims, where the sultan levies it"]}},
    {from: 1720, note: "The poll tax lapses as Mughal power fades", drop: {taxes: ["The poll tax on non-Muslims, where the sultan levies it"]}},
    {from: 1765, note: "The East India Company rules Bengal and spreads; Company courts from 1772", set: {rule: {form: "Company rule beside princely states", ruler: "The Governor-General of the Company, and the princes"}},
      add: {courts: ["Company courts, with Hindu and Muslim law officers for family matters"], order: ["police"]}},
    {from: 1829, note: "Widow burning is banned", add: {warn: ["Widow burning is a crime under Company law"]}},
    {from: 1858, note: "Crown rule: the Indian Penal Code (1860) and the police acts", set: {rule: {form: "Crown rule beside princely states", ruler: "The Viceroy of India", council: "The Viceroy's council"}},
      add: {courts: ["High courts under the Indian Penal Code"], punish: ["prison", "transportation"], proof: ["evidence"], crimes: ["sedition"]}},
    {from: 1947, note: "Independence and partition: India and Pakistan (and Bangladesh from 1971)", drop: {courts: ["Company courts, with Hindu and Muslim law officers for family matters"], punish: ["transportation"], warn: ["Widow burning is a crime under Company law"]}},
    {from: 1975, to: 1977, note: "The Emergency: rights suspended, opponents jailed", add: {warn: ["Under the Emergency, arrest without trial is the law"]}}
  ],
  "tibet-himalaya": [
    {from: 0, note: "Monastic lords and princes", set: {rule: {form: "Princes and great monasteries, each with its own domain", ruler: "The abbots of the great monasteries and the local princes", council: "The monastic assemblies"},
      courts: ["The lord's court, under the old law codes of the Tibetan kings", "The monastery's discipline master for monks and its own people", "Village heads and elders"], proof: ["oath", "witnesses", "ordeal"]},
      drop: {crimes: ["caste-breach"], warn: ["Caste rules who may eat, marry, worship or draw water with whom"]}},
    {from: 1247, note: "The Sakya lamas rule for the Mongol khans", set: {rule: {ruler: "The Sakya lama, for the Mongol Khan"}}},
    {from: 1642, note: "The Dalai Lama's government at Lhasa", set: {rule: {form: "A government of lamas and lay nobles", ruler: "The Dalai Lama", council: "The Kashag, the council of ministers"}}},
    {from: 1768, note: "In Nepal, the Gorkha kingdom; its caste-based legal code of 1854", add: {courts: ["Nepal's royal courts under the code of 1854"]}},
    {from: 1950, note: "Tibet under the People's Republic of China", set: {rule: {form: "A region of the People's Republic", ruler: "The Party Secretary of the region", council: "The Communist Party"}, catch: 0.6},
      add: {proof: ["party"], crimes: ["anti-state"], order: ["secret-police", "police"], punish: ["camp"], warn: ["A picture of the Dalai Lama can be a crime"]},
      drop: {courts: ["The lord's court, under the old law codes of the Tibetan kings", "The monastery's discipline master for monks and its own people"]}}
  ],
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
