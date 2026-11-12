/**
 * WoDX Creation 0.11.0: lifepaths, the era bands, the lines and the mortal scenes (birth, youth, adult life, later
 * life). WoDX's own words; history is general knowledge of the Bohemian crown lands and Europe (Rothenstein is in
 * Moravia), with a choice in most scenes for a character from elsewhere. Nothing here comes from a book's text.
 *
 * Shapes (the rules are in scripts/lifepath-rules.mjs):
 *   event  {id, stage, title, text, w (weight, default 10), when {lines, notLines, splats, spans [[from, to]], flags,
 *           any, not}, more {flag: factor}, options [option]}
 *   option {label, text, g "bg Allies|ab Crafts|merit Name|flaw Name|note Free text", p "role|what they were to you",
 *           f flag or [flags], n {eventId: weight} (the next scene, as Princes of Darkness chains its events)}
 * Station flags start "st:"; they shape the later scenes. Writing rule: second person, no gendered words.
 */

/** Era bands, 1197 to the World of Future Darkness. */
export const BANDS = [
  {key: "high-medieval", from: 1100, to: 1347, label: "the high Middle Ages"},
  {key: "plague", from: 1348, to: 1352, label: "the Black Death"},
  {key: "late-medieval", from: 1353, to: 1499, label: "the late Middle Ages"},
  {key: "renaissance", from: 1500, to: 1617, label: "the Renaissance and Reformation"},
  {key: "thirty-years", from: 1618, to: 1648, label: "the Thirty Years' War"},
  {key: "baroque", from: 1649, to: 1788, label: "the Baroque and the Enlightenment"},
  {key: "revolutions", from: 1789, to: 1848, label: "the age of revolutions"},
  {key: "industrial", from: 1849, to: 1913, label: "the industrial age"},
  {key: "great-war", from: 1914, to: 1918, label: "the Great War"},
  {key: "between-wars", from: 1919, to: 1938, label: "the years between the wars"},
  {key: "second-war", from: 1939, to: 1945, label: "the Second World War"},
  {key: "cold-war", from: 1946, to: 1989, label: "the Cold War"},
  {key: "modern", from: 1990, to: 2022, label: "the modern nights"},
  {key: "future", from: 2023, to: 2300, label: "the World of Future Darkness"}
];

const FULL = ["birth", "youth", "adult", "turning", "splat", "after", "after2"];

/**
 * The lines. turning: what the turn is called; splatLabel: what the splat list is called; from: the first year the
 * line can be taken up (earlier years get the note in early).
 */
export const LINES = {
  mortal: {label: "Mortal", turning: "", splatLabel: "Kind of mortal", stages: ["birth", "youth", "adult", "splat", "later"]},
  vampire: {label: "Vampire", turning: "the Embrace", splatLabel: "Clan or bloodline", stages: FULL},
  ghoul: {label: "Ghoul", turning: "the first draught", splatLabel: "Kind of ghoul", stages: FULL},
  revenant: {label: "Revenant", turning: "the blood wakes", splatLabel: "Family", stages: ["birth", "youth", "turning", "splat", "after", "after2"]},
  werewolf: {label: "Werewolf or other Changing Breed", turning: "the First Change", splatLabel: "Tribe, auspice or Breed", stages: FULL},
  mage: {label: "Mage", turning: "the Awakening", splatLabel: "Tradition, Convention, House or Fellowship", stages: FULL},
  changeling: {label: "Changeling", turning: "the Chrysalis", splatLabel: "Kith, House or court", stages: FULL},
  wraith: {label: "Wraith", turning: "death", splatLabel: "Guild, Legion or faction", stages: FULL},
  hunter: {label: "Hunter", turning: "the calling", splatLabel: "Creed, order or group", stages: FULL},
  mummy: {label: "Mummy", turning: "the first resurrection", splatLabel: "Amenti or lineage", stages: FULL},
  demon: {label: "Demon", turning: "the Fall into a host", splatLabel: "House or faction", stages: FULL, from: 1999,
    early: "The Fallen escape the Abyss in 1999. An earlier lifepath is the host's life: run it as a mortal and take the Fall later."},
  kueijin: {label: "Kuei-jin", turning: "the Second Breath", splatLabel: "Dharma", stages: FULL},
  orpheus: {label: "Orpheus projector", turning: "the first projection", splatLabel: "Shade or Lament", stages: FULL, from: 1848,
    early: "Projectors in WoDX begin with the spiritualist mediums of 1848. Before that, run a mortal or a wraith."}
};

const o = (label, g = "", x = {}) => ({label, g, ...x});
const ev = (id, stage, title, text, options, x = {}) => ({id, stage, title, text, options, ...x});
const span = (a, b) => ({spans: [[a, b]]});
const FAR = o("From far away", "ab Linguistics|merit Language", {f: "st:foreign", text: "Your family came from another land, and you grew up between two tongues."});

/* ------------------------------------------------------------------ */
/*  Birth: the station, by era                                         */
/* ------------------------------------------------------------------ */
const BIRTH = [
  ev("birth.highmed", "birth", "Born under the Přemyslid kings", "The land is cleared, towns are founded by charter, and German settlers come in to dig silver and build walls.", [
    o("A serf's child", "ab Animal Ken|ab Survival|flaw Illiterate", {f: "st:serf", text: "Your family owed days of labour to a lord and paid in grain and eggs."}),
    o("A townsman's child", "ab Crafts|ab Streetwise", {f: "st:town", text: "Your parents held a plot inside the new walls and a share in a guild."}),
    o("Born to a knightly house", "bg Resources|ab Melee|ab Ride|bg Status", {f: "st:noble", text: "A tower, a few villages, and a name that had to be defended."}),
    o("Given to the Church", "ab Academics|ab Theology|bg Mentor", {f: "st:church", text: "An oblate at a monastery, taught letters and the hours."}),
    o("A Jewish family of the town", "ab Academics|ab Finance|bg Contacts", {f: "st:jewish", text: "Your family lived by the king's protection and paid well for it."}),
    o("A miner's child", "ab Crafts|ab Athletics|merit Tough", {f: "st:labour", text: "You grew up by the shafts, where silver made a few families rich and broke the rest."}),
    FAR
  ], {when: span(1100, 1347)}),
  ev("birth.plague", "birth", "Born in the plague years", "The great mortality crosses Europe. Bohemia is spared the worst, but no one knows that yet.", [
    o("One of the few children who lived", "merit Iron Will|flaw Nightmares", {f: "st:serf", text: "Half the village died the summer you were born."}),
    o("A burgher's child behind closed gates", "bg Resources|ab Medicine", {f: "st:town"}),
    o("Born on the road among flagellants", "ab Theology|ab Survival|note Fanatical family", {f: "st:poor", text: "Your parents walked with the penitents from town to town."}),
    o("A noble child sent to the country", "bg Resources|bg Status", {f: "st:noble"}),
    FAR
  ], {when: span(1348, 1352)}),
  ev("birth.latemed", "birth", "Born in the age of Hus", "Prague has its university, the Church is split, and soon the whole kingdom will take sides.", [
    o("A Utraquist peasant's child", "ab Survival|ab Theology|ab Melee", {f: "st:serf", text: "Your family took the cup in both kinds and kept a flail by the door."}),
    o("A guild child in a royal town", "ab Crafts|bg Contacts", {f: "st:town"}),
    o("Born to a lord of the estates", "bg Resources|bg Status|ab Politics", {f: "st:noble"}),
    o("A Catholic family loyal to the king", "bg Allies|ab Theology", {f: "st:church"}),
    o("A student's child in Prague", "ab Academics|ab Linguistics", {f: "st:scholar"}),
    FAR
  ], {when: span(1353, 1499)}),
  ev("birth.renaissance", "birth", "Born under the Habsburgs", "The crown passes to Vienna. Lutherans, Brethren and Catholics share a land that does not agree on God.", [
    o("A serf bound to the estate", "ab Animal Ken|ab Survival", {f: "st:serf"}),
    o("A printer's or merchant's child", "ab Academics|ab Finance|bg Contacts", {f: "st:town"}),
    o("Born to a Protestant noble house", "bg Resources|bg Status|ab Politics", {f: "st:noble"}),
    o("Raised among the Anabaptist brethren of Moravia", "ab Crafts|ab Theology|note Refuses violence", {f: "st:brethren", text: "Your community shared its goods and refused the sword."}),
    o("Born at Rudolf's Prague", "ab Occult|ab Academics", {f: "st:scholar", text: "The emperor's court drew astrologers, alchemists and charlatans, and your family served them."}),
    FAR
  ], {when: span(1500, 1617)}),
  ev("birth.thirty", "birth", "Born into the long war", "After the defenestration and the White Mountain, armies cross Bohemia and Moravia for thirty years.", [
    o("A camp follower's child", "ab Streetwise|ab Survival|flaw Enemy", {f: "st:poor", text: "You were born in the baggage train of a regiment."}),
    o("A town burgher's child in a siege", "ab Crafts|merit Light Sleeper", {f: "st:town"}),
    o("Born to a Catholic house that rose", "bg Resources|bg Status", {f: "st:noble", text: "Your family took the lands of the rebels."}),
    o("Born to exiles", "ab Linguistics|ab Academics|note Exiled", {f: "st:exile", text: "Your family left for Saxony or Poland rather than convert."}),
    o("A peasant's child on a burned estate", "ab Survival|merit Tough", {f: "st:serf"}),
    FAR
  ], {when: span(1618, 1648)}),
  ev("birth.baroque", "birth", "Born in the Baroque", "Churches rise in gold and white, serfs owe their labour, and the empress reforms the schools.", [
    o("A serf owing robota", "ab Animal Ken|ab Survival|flaw Illiterate", {f: "st:serf"}),
    o("A guild master's child", "ab Crafts|bg Resources", {f: "st:town"}),
    o("Born to the court nobility", "bg Resources|bg Status|ab Etiquette", {f: "st:noble"}),
    o("A secret Protestant household", "ab Subterfuge|ab Theology|flaw Dark Secret", {f: "st:hidden", text: "Your family read a forbidden Bible behind the stove."}),
    o("Raised in a garrison town", "ab Firearms|ab Melee", {f: "st:soldier"}),
    FAR
  ], {when: span(1649, 1788)}),
  ev("birth.revolutions", "birth", "Born in the age of revolutions", "Napoleon fights at Austerlitz, mills start turning in Brno, and scholars write grammars of the Czech tongue.", [
    o("A peasant's child still bound to the lord", "ab Survival|ab Animal Ken", {f: "st:serf"}),
    o("A weaver's child in the mills", "ab Crafts|flaw Sickly", {f: "st:labour"}),
    o("Born to a patriot's family", "ab Academics|ab Expression|bg Contacts", {f: "st:scholar", text: "Your parents spoke Czech at table when it was not polite."}),
    o("Born to an officer's family", "ab Firearms|ab Ride|bg Status", {f: "st:soldier"}),
    o("A merchant's child", "ab Finance|bg Resources", {f: "st:town"}),
    FAR
  ], {when: span(1789, 1848)}),
  ev("birth.industrial", "birth", "Born under smoke", "Railways cross the empire, coal comes out of Ostrava, and those who can, emigrate to America.", [
    o("A miner's or factory child", "ab Athletics|ab Streetwise|flaw Sickly", {f: "st:labour"}),
    o("A shopkeeper's child", "ab Finance|bg Contacts", {f: "st:town"}),
    o("Born to new money", "bg Resources|ab Etiquette", {f: "st:rich"}),
    o("Born to old nobility in decline", "bg Status|ab Etiquette|flaw Dark Secret", {f: "st:noble"}),
    o("A village child who left for the city", "ab Survival|ab Streetwise", {f: "st:serf"}),
    o("Born to emigrants in a new land", "ab Linguistics|merit Language", {f: "st:foreign"})
  ], {when: span(1849, 1913)}),
  ev("birth.greatwar", "birth", "Born during the Great War", "Half the grown-ups you know are at the front. Bread is short, and then the influenza comes.", [
    o("A child of the bread lines", "ab Streetwise|merit Tough", {f: "st:poor"}),
    o("A soldier's orphan", "flaw Nightmares|ab Survival", {f: "st:poor", p: "a grandparent|who raised you after the telegram came"}),
    o("Born to a comfortable family", "bg Resources", {f: "st:rich"}),
    o("Born in a village far from the war", "ab Animal Ken|ab Survival", {f: "st:serf"}),
    FAR
  ], {when: span(1914, 1918)}),
  ev("birth.between", "birth", "Born in the new republic", "Czechoslovakia is young and proud. Then the Depression comes, and the Sudeten crisis.", [
    o("A worker's child", "ab Streetwise|ab Crafts", {f: "st:labour"}),
    o("A clerk's or teacher's child", "ab Academics|ab Bureaucracy", {f: "st:town"}),
    o("A German-speaking family in the borderlands", "ab Linguistics|flaw Enemy", {f: "st:foreign"}),
    o("A Jewish family of Brno or Prague", "ab Academics|bg Contacts", {f: "st:jewish"}),
    o("A farm child", "ab Animal Ken|ab Drive", {f: "st:serf"}),
    o("A factory owner's child", "bg Resources|ab Finance", {f: "st:rich"})
  ], {when: span(1919, 1938)}),
  ev("birth.secondwar", "birth", "Born under the occupation", "The Protectorate. Curfews, informers, transports to the east.", [
    o("Hidden as a baby", "ab Stealth|flaw Nightmares", {f: "st:hidden", p: "the person who hid you|and whose name you were never told", lasting: true}),
    o("A collaborator's child", "bg Resources|flaw Dark Secret", {f: "st:rich"}),
    o("A resistance family", "ab Subterfuge|bg Allies", {f: "st:labour"}),
    o("A farm child in the hills", "ab Survival|ab Animal Ken", {f: "st:serf"}),
    FAR
  ], {when: span(1939, 1945)}),
  ev("birth.coldwar", "birth", "Born behind the Iron Curtain", "The Party plans everything. Some believe, most keep their heads down, a few sign petitions.", [
    o("A Party official's child", "bg Contacts|bg Influence|ab Bureaucracy", {f: "st:rich"}),
    o("A worker's child in a housing estate", "ab Streetwise|ab Crafts", {f: "st:labour"}),
    o("A dissident's child", "ab Expression|flaw Hunted", {f: "st:scholar", text: "The secret police opened your post before you could read."}),
    o("A collective farm child", "ab Animal Ken|ab Drive", {f: "st:serf"}),
    o("A Roma family", "ab Streetwise|ab Performance|flaw Enemy", {f: "st:poor"}),
    o("Born in the West", "bg Resources|ab Computer", {f: "st:foreign"})
  ], {when: span(1946, 1989)}),
  ev("birth.modern", "birth", "Born after the Velvet Revolution", "The borders open, factories close, and everyone is suddenly online.", [
    o("A child of the housing estates", "ab Streetwise|ab Computer", {f: "st:labour"}),
    o("A child of new money", "bg Resources|ab Finance", {f: "st:rich"}),
    o("A village child who moved to the city", "ab Survival|ab Drive", {f: "st:serf"}),
    o("A student family", "ab Academics|ab Computer", {f: "st:scholar"}),
    o("A child in care", "ab Streetwise|flaw Nightmares", {f: "st:poor"}),
    FAR
  ], {when: span(1990, 2022)}),
  ev("birth.future", "birth", "Born under the arcologies", "The corporations own the towers, the Net and most of the law. The streets get what falls off the edge.", [
    o("A corporate child", "bg Resources|ab Computer|ab Etiquette", {f: "st:rich", text: "Born in a company clinic, with a company number before a name."}),
    o("A street kid", "ab Streetwise|ab Brawl|merit Tough", {f: "st:poor"}),
    o("Raised by nomads on the highways", "ab Drive|ab Survival|bg Allies", {f: "st:nomad"}),
    o("A wage slave's child in a stack", "ab Technology|ab Streetwise", {f: "st:labour"}),
    o("A netrunner's child", "ab Computer|ab Technology", {f: "st:scholar"}),
    FAR
  ], {when: span(2023, 2300)})
];

/* ------------------------------------------------------------------ */
/*  Youth                                                              */
/* ------------------------------------------------------------------ */
const YOUTH = [
  ev("youth.mentor", "youth", "Someone took an interest", "An adult outside your family saw something in you.", [
    o("Learn a trade from them", "ab Crafts|bg Mentor", {p: "a master|who taught you a trade and a temper"}),
    o("Learn letters from them", "ab Academics", {p: "a teacher|who lent you books you were too young for"}),
    o("Learn to fight from them", "ab Brawl|ab Melee", {p: "an old soldier|who taught you to hit first"})
  ]),
  ev("youth.sibling", "youth", "A sibling", "There were two of you against the world.", [
    o("Stay close", "bg Allies", {p: "a sibling|who still knows your real face"}),
    o("Fall out for good", "flaw Enemy", {p: "a sibling|who blames you for what happened to your parents"}),
    o("Lose them young", "flaw Nightmares|merit Iron Will")
  ]),
  ev("youth.firstlove", "youth", "A first love", "It was everything, and then it was over.", [
    o("It ended kindly", "ab Empathy", {p: "a first love|who still thinks of you"}),
    o("It ended badly", "flaw Enemy", {p: "a first love|who never forgave you"}),
    o("It never ended, only paused", "flaw Obsession", {p: "a first love|you have never stopped looking for"})
  ]),
  ev("youth.fire", "youth", "The fire", "Your home burned when you were a child.", [
    o("You pulled someone out", "note Brave|ab Athletics", {p: "the one you saved|who owes you a life"}),
    o("You ran", "flaw Phobia (fire)|ab Alertness"),
    o("You started it", "flaw Dark Secret|ab Subterfuge")
  ]),
  ev("youth.hunger", "youth", "A hungry winter", "The harvest failed, or the work stopped, and there was nothing.", [
    o("You stole to eat", "ab Larceny|ab Stealth", {f: "youth:thief"}),
    o("You begged", "ab Streetwise|ab Empathy"),
    o("Someone fed you", "bg Allies", {p: "a neighbour|who shared bread when they had little"})
  ], {more: {"st:poor": 2, "st:serf": 2, "st:labour": 2, "st:rich": 0, "st:noble": 0}}),
  ev("youth.church", "youth", "A calling to faith", "A priest, a rabbi, a preacher or a quiet saint made God feel close.", [
    o("Faith stuck", "ab Theology|merit True Faith", {f: "youth:faith"}),
    o("Faith broke", "ab Academics|note Lost your faith"),
    o("You served at the altar", "ab Etiquette|bg Contacts", {p: "a priest|who knows your confession"})
  ], {when: {spans: [[1100, 1960]]}}),
  ev("youth.page", "youth", "Sent away to serve", "Children of good family were sent to a greater house to learn manners and arms.", [
    o("Squire to a knight", "ab Melee|ab Ride|bg Allies", {p: "the knight|you served and once saw weep"}),
    o("Page at court", "ab Etiquette|ab Politics", {f: "youth:court"}),
    o("Sent to a convent school", "ab Academics|ab Theology")
  ], {when: {spans: [[1100, 1790]], any: ["st:noble", "st:rich"]}, w: 20}),
  ev("youth.apprentice", "youth", "Apprenticed", "Seven years of sweeping floors before you were allowed to touch the work.", [
    o("Learn the trade well", "ab Crafts|bg Resources"),
    o("Learn the guild's secrets", "ab Crafts|ab Subterfuge|bg Contacts"),
    o("Run away from the master", "ab Streetwise|flaw Enemy", {p: "the master|you ran from, still owed for your indenture"})
  ], {when: {spans: [[1100, 1870]], any: ["st:town", "st:labour", "st:serf"]}}),
  ev("youth.school", "youth", "School", "The empress, then the republic, then the Party, all wanted you to read.", [
    o("Top of the class", "ab Academics|ab Science"),
    o("The class clown", "ab Performance|ab Expression"),
    o("Fights in the yard", "ab Brawl", {p: "a schoolyard rival|who grew up to be a policeman"})
  ], {when: {spans: [[1774, 2300]]}}),
  ev("youth.factory", "youth", "Child labour", "You were small enough to crawl under the looms.", [
    o("You learned the machines", "ab Technology|ab Crafts"),
    o("You were hurt", "flaw Lame|merit Iron Will"),
    o("You organised the other children", "ab Leadership|bg Allies")
  ], {when: {spans: [[1800, 1914]], any: ["st:labour", "st:poor"]}, w: 20}),
  ev("youth.war", "youth", "War came through", "Soldiers in the village, then fire, then hunger.", [
    o("You hid and watched", "ab Stealth|ab Alertness|flaw Nightmares"),
    o("You ran messages", "ab Athletics|ab Streetwise", {p: "a soldier|who gave you a coin and did not come back"}),
    o("You lost your family", "flaw Nightmares|merit Iron Will")
  ], {when: {spans: [[1419, 1434], [1618, 1648], [1740, 1763], [1805, 1813], [1866, 1866], [1914, 1918], [1938, 1945], [1968, 1968]]}, w: 25}),
  ev("youth.plague", "youth", "Plague in the town", "The cart came every morning.", [
    o("You nursed the sick", "ab Medicine|note Hardy against disease", {p: "a healer|you helped, who later vanished"}),
    o("You fled to the woods", "ab Survival"),
    o("You buried your parents", "flaw Nightmares|merit Iron Will")
  ], {when: {spans: [[1348, 1352], [1380, 1381], [1679, 1681], [1713, 1715], [1831, 1832], [1918, 1919], [2020, 2021]]}, w: 25}),
  ev("youth.street", "youth", "The gang", "Every street had its gang, and you had to belong to one.", [
    o("You ran with them", "ab Streetwise|ab Brawl|bg Allies", {p: "a gang friend|who went further into crime than you"}),
    o("You led them", "ab Leadership|ab Intimidation"),
    o("You stayed out", "ab Stealth|flaw Enemy")
  ], {when: {spans: [[1850, 2300]]}, more: {"st:poor": 2, "st:labour": 2}}),
  ev("youth.net", "youth", "Online", "You found people like you, a long way off.", [
    o("A gamer", "ab Computer|ab Wits"),
    o("A hacker", "ab Computer|merit Computer Aptitude", {p: "an online friend|you have never met in person"}),
    o("A troll", "ab Subterfuge|flaw Enemy")
  ], {when: {spans: [[1995, 2300]]}}),
  ev("youth.chrome", "youth", "First chrome", "Everyone on the block had something fitted. You wanted it too.", [
    o("Fitted cheap", "ab Technology|flaw Addiction", {p: "a ripperdoc|who fitted you for a favour"}),
    o("Refused it", "ab Survival|merit Iron Will"),
    o("Stole the money for it", "ab Larceny|flaw Enemy")
  ], {when: {spans: [[2023, 2300]]}, w: 20}),
  ev("youth.strange", "youth", "Something you saw", "Once, in the dark, you saw something that should not be.", [
    o("You told no one", "ab Awareness|flaw Nightmares", {f: "youth:seen"}),
    o("You told and were punished", "note Thought a liar", {f: "youth:seen"}),
    o("You went looking for it", "ab Occult|ab Investigation", {f: ["youth:seen", "youth:seeker"]})
  ], {w: 8})
];

/* ------------------------------------------------------------------ */
/*  Adult life                                                         */
/* ------------------------------------------------------------------ */
const ADULT = [
  ev("adult.marriage", "adult", "Marriage", "Your family arranged a match, or you made one yourself.", [
    o("A good marriage", "bg Allies|bg Resources", {p: "your spouse|who may still be waiting for you"}),
    o("A cold marriage", "flaw Dark Secret", {p: "your spouse|who would be glad to see you gone"}),
    o("You refused", "flaw Enemy", {p: "the one you would not marry|and their family"})
  ]),
  ev("adult.child", "adult", "A child", "There was a child.", [
    o("You raised them", "bg Allies|note Someone depends on you", {p: "your child|who is grown, or growing, without you"}),
    o("You gave them away", "flaw Dark Secret", {p: "your child|who does not know you"}),
    o("You lost them", "flaw Nightmares")
  ], {w: 8}),
  ev("adult.trade", "adult", "Your work", "What you did for bread.", [
    o("Good at it, and known for it", "bg Fame|ab Crafts"),
    o("Rose in the trade", "bg Resources|bg Contacts", {p: "a business partner|who still has the key to your shop"}),
    o("Ruined in it", "note In debt|ab Finance", {p: "a creditor|who is still owed"})
  ]),
  ev("adult.crusade", "adult", "The cross", "Preachers called for a crusade: to the Holy Land, to the pagan north, or against heretics at home.", [
    o("Took the cross", "ab Melee|ab Ride|ab Theology", {p: "a comrade-in-arms|from the campaign"}),
    o("Paid someone to go for you", "bg Resources|flaw Dark Secret"),
    o("Preached against it", "ab Expression|flaw Enemy")
  ], {when: {spans: [[1197, 1300]]}, w: 15}),
  ev("adult.hussite", "adult", "Hussite wars", "Žižka's wagon forts beat crusade after crusade.", [
    o("Fought with the Hussites", "ab Firearms|ab Melee|ab Leadership", {p: "a Taborite captain|you served under"}),
    o("Fought for the king and the Church", "ab Melee|ab Ride"),
    o("Hid the family's goods and waited", "ab Subterfuge|bg Resources")
  ], {when: span(1419, 1436), w: 30}),
  ev("adult.white", "adult", "After the White Mountain", "The rebels lost. The executions in Old Town Square were a warning to everyone.", [
    o("Converted", "bg Resources|flaw Dark Secret"),
    o("Went into exile", "ab Linguistics|note Exiled", {p: "a fellow exile|who still writes"}),
    o("Joined an army", "ab Firearms|ab Melee", {p: "a sergeant|who saved your life at least once"})
  ], {when: span(1620, 1648), w: 30}),
  ev("adult.revolt", "adult", "The peasants rise", "The lords asked too much labour. The villages took up scythes.", [
    o("Marched with them", "ab Melee|ab Leadership|flaw Hunted"),
    o("Betrayed them", "bg Resources|flaw Dark Secret", {p: "a rebel|who hanged because of you"}),
    o("Stayed home", "ab Survival")
  ], {when: {spans: [[1680, 1680], [1775, 1775], [1847, 1848]], any: ["st:serf", "st:poor", "st:labour"]}, w: 30}),
  ev("adult.austerlitz", "adult", "The Battle of the Three Emperors", "Napoleon's armies meet the Russians and Austrians outside Brno.", [
    o("In the ranks", "ab Firearms|merit Tough", {p: "a comrade|from the Pratzen heights"}),
    o("Looting the dead after", "ab Larceny|flaw Nightmares"),
    o("Nursing the wounded", "ab Medicine", {p: "a French officer|you hid in a barn"})
  ], {when: span(1805, 1806), w: 40}),
  ev("adult.1848", "adult", "1848", "Barricades in Prague and Vienna; the robota is abolished; the soldiers come back.", [
    o("On the barricades", "ab Firearms|ab Expression|flaw Hunted"),
    o("For order and the emperor", "bg Status|ab Bureaucracy"),
    o("Printed pamphlets", "ab Expression|bg Contacts")
  ], {when: span(1848, 1849), w: 30}),
  ev("adult.america", "adult", "America", "A ship's ticket and a cousin in Chicago.", [
    o("Went", "ab Linguistics|ab Streetwise", {p: "a cousin|in the new country"}),
    o("Stayed and saw others go", "bg Contacts"),
    o("Went and came back", "bg Resources|ab Linguistics")
  ], {when: span(1850, 1914), w: 15}),
  ev("adult.front", "adult", "Called up", "The war needs everyone the empire can find, at the front or in the factories.", [
    o("At the front", "ab Firearms|flaw Nightmares", {p: "a comrade|from the trenches"}),
    o("Went over to the Legion", "ab Firearms|bg Allies", {p: "a legionnaire|you crossed Siberia with"}),
    o("In the munitions works", "ab Technology|flaw Sickly")
  ], {when: span(1914, 1918), w: 40}),
  ev("adult.depression", "adult", "The crash", "The factory closed. The bank failed.", [
    o("Lost everything", "note In debt|merit Iron Will"),
    o("Did well out of it", "bg Resources|flaw Enemy"),
    o("Joined a party with answers", "bg Allies|ab Politics", {p: "a party comrade|who denounced others later"})
  ], {when: span(1929, 1937), w: 20}),
  ev("adult.occupation", "adult", "The occupation", "The Germans march in. Everyone has to decide what they will do.", [
    o("Resisted", "ab Subterfuge|ab Firearms|flaw Hunted", {p: "a resistance contact|you only knew by a code name"}),
    o("Kept your head down", "ab Bureaucracy"),
    o("Collaborated", "bg Resources|flaw Dark Secret"),
    o("Were deported and survived", "flaw Nightmares|merit Iron Will", {p: "a fellow prisoner|who survived with you"})
  ], {when: span(1939, 1945), w: 40}),
  ev("adult.1948", "adult", "February 1948", "The Communists take power. Then the trials.", [
    o("Joined the Party", "bg Influence|ab Bureaucracy"),
    o("Lost your property", "note In debt|ab Survival"),
    o("Informed on a neighbour", "bg Contacts|flaw Dark Secret", {p: "a neighbour|you informed on"})
  ], {when: span(1948, 1953), w: 30}),
  ev("adult.1968", "adult", "August 1968", "Tanks in the streets. The Prague Spring is over.", [
    o("Stood in front of the tanks", "ab Expression|flaw Hunted"),
    o("Emigrated", "ab Linguistics|note Exiled", {p: "a friend|who stayed behind"}),
    o("Signed what you were told to sign", "bg Contacts|flaw Dark Secret")
  ], {when: span(1968, 1975), w: 30}),
  ev("adult.1989", "adult", "November 1989", "Keys jingling on Wenceslas Square.", [
    o("In the crowd", "bg Allies", {p: "a student organiser|you met on the square"}),
    o("Shredding files", "ab Bureaucracy|flaw Dark Secret"),
    o("Made a fortune in privatisation", "bg Resources|flaw Enemy")
  ], {when: span(1989, 1995), w: 30}),
  ev("adult.flood", "adult", "The flood", "The rivers came up over Moravia in a summer of rain.", [
    o("On the sandbags", "ab Athletics|bg Allies"),
    o("Lost the house", "note In debt"),
    o("Looted", "ab Larceny|flaw Dark Secret")
  ], {when: {spans: [[1997, 1997], [2002, 2002]]}, w: 25}),
  ev("adult.corp", "adult", "The contract", "A corporation offered a job, a bunk and a lifetime of debt.", [
    o("Signed", "bg Resources|note Someone owns your contract", {p: "a corp supervisor|who still holds your contract"}),
    o("Went freelance", "ab Streetwise|bg Contacts", {p: "a fixer|who found you work"}),
    o("Burned them", "ab Computer|flaw Hunted")
  ], {when: span(2023, 2300), w: 30}),
  ev("adult.crime", "adult", "On the wrong side of the law", "Times were bad, or you were good at it.", [
    o("Smuggling", "ab Streetwise|bg Contacts", {p: "a smuggler|who taught you the routes"}),
    o("Caught and jailed", "note A criminal record|ab Brawl"),
    o("Never caught", "ab Larceny|ab Stealth")
  ], {more: {"youth:thief": 3, "st:poor": 2}}),
  ev("adult.study", "adult", "University", "Prague, Olomouc, Vienna or further.", [
    o("Studied law", "ab Law|bg Contacts"),
    o("Studied medicine", "ab Medicine|ab Science"),
    o("Studied the occult on the side", "ab Occult|ab Academics", {f: "adult:occult", p: "a professor|who knew more than lectures allowed"})
  ], {when: {spans: [[1348, 2300]], any: ["st:scholar", "st:rich", "st:noble", "st:church", "st:jewish"]}, w: 15}),
  ev("adult.travel", "adult", "The road", "A pilgrimage, a trading trip, a tour of duty, a year abroad.", [
    o("To Rome or Compostela", "ab Theology|ab Linguistics"),
    o("East, as far as the Turks", "ab Linguistics|ab Survival", {p: "a guide|who saved your life on the road"}),
    o("West, to the great cities", "ab Etiquette|bg Contacts")
  ], {when: {spans: [[1100, 1900]]}}),
  ev("adult.brush", "adult", "The night", "You met one of them, and lived.", [
    o("Fed on and forgotten", "flaw Nightmares", {f: "adult:seen"}),
    o("Saved by another", "bg Allies", {f: "adult:seen", p: "a stranger|who was not quite human and saved you"}),
    o("Fought it off", "note Brave|flaw Hunted", {f: "adult:seen"})
  ], {w: 8, more: {"youth:seen": 2}})
];

/* ------------------------------------------------------------------ */
/*  Later life (mortals only)                                          */
/* ------------------------------------------------------------------ */
const LATER = [
  ev("later.settled", "later", "Settling", "Most people find a place and keep it.", [
    o("A house of your own", "bg Resources"),
    o("A place in the town council", "bg Influence|ab Politics"),
    o("Restless still", "ab Survival|ab Streetwise")
  ]),
  ev("later.secret", "later", "What you know", "You have seen enough to know the world is not what it says.", [
    o("Keep a journal of it", "ab Investigation|ab Occult", {p: "someone who read the journal|and now watches you"}),
    o("Find others who know", "bg Allies", {p: "a fellow witness|you meet once a month"}),
    o("Try to forget", "merit Iron Will")
  ], {when: {any: ["youth:seen", "adult:seen", "adult:occult"]}, w: 30}),
  ev("later.loss", "later", "A loss", "Someone you loved died before their time.", [
    o("You want to know why", "ab Investigation|flaw Obsession"),
    o("You want revenge", "ab Brawl|flaw Enemy"),
    o("You let them go", "ab Empathy")
  ]),
  ev("later.served", "later", "In someone's service", "A rich family, a lord, a corporation or a mob boss pays you well and asks odd things at night.", [
    o("You never ask questions", "bg Resources|bg Mentor", {p: "your employer|who only sees you after dark"}),
    o("You asked, once", "ab Investigation|flaw Dark Secret"),
    o("You quit", "flaw Enemy")
  ], {w: 8})
];

export const MORTAL_EVENTS = [...BIRTH, ...YOUTH, ...ADULT, ...LATER];
