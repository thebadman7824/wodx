/**
 * WoDX Creation 0.19.0: dated local content. The four ages of lifepath-local-*.mjs are broad; this file holds what
 * belongs to exact years in one region: origins open only in a span of birth years, and things that marked a life
 * stage lived there while they happened. The first region is Moravia and Bohemia, sorted from the older lifepath
 * scenes of data/lifepaths.mjs (which stay as they are for older records). The other 43 regions are in lifepath-events-europe.mjs, -asia.mjs and -world.mjs (0.21.0).
 *
 *   region: {origins: [[label, gives, base, from, to]],
 *            marks:   [[label, gives, spans [[from, to]], tone "+", "-" or "0", person "role|note" or null]]}
 * A mark is offered when the stage's years overlap one of its spans. All text is WoDX's own.
 */
import {EVENTS_EUROPE} from "./lifepath-events-europe.mjs";
import {EVENTS_ASIA} from "./lifepath-events-asia.mjs";
import {EVENTS_WORLD} from "./lifepath-events-world.mjs";

export const LOCAL_EVENTS = {
"moravia": {
 origins: [
  ["One of the few children who lived through the pestilence","merit Iron Will|flaw Nightmares","trade",1348,1352],
  ["A peasant family of the chalice","ab Survival|ab Melee|ab Academics","land",1415,1499],
  ["A student's household at the Prague university","ab Academics|merit Language","scholar",1348,1499],
  ["Raised among the Anabaptist brethren of Moravia","ab Crafts|ab Academics|note Refuses violence","faith",1526,1622],
  ["Born at the court of the alchemist emperor in Prague","ab Occult|ab Academics|bg Contacts","scholar",1576,1612],
  ["A camp follower's child in the long war","ab Streetwise|ab Survival|flaw Enemy","wander",1618,1648],
  ["Born to exiles after the White Mountain","merit Language|ab Academics|note Exiled","wander",1621,1660],
  ["A secret Protestant household","ab Subterfuge|ab Academics|flaw Dark Secret","faith",1627,1781],
  ["A patriot's family of the national revival","ab Academics|ab Expression|bg Contacts","scholar",1789,1848],
  ["A soldier's orphan of the Great War","flaw Nightmares|ab Survival","orphan",1914,1918],
  ["A German-speaking family of the borderlands","merit Language|flaw Enemy","outsider",1919,1938],
  ["A Jewish family of Brno or Prague between the wars","ab Academics|bg Contacts|merit Language","outsider",1919,1938],
  ["Hidden as a baby under the occupation","ab Stealth|flaw Nightmares","orphan",1939,1945],
  ["A resistance family","ab Subterfuge|bg Allies","trade",1939,1945],
  ["A Party official's child","bg Contacts|bg Influence|ab Politics","prof",1948,1989],
  ["A dissident's child","ab Expression|ab Subterfuge|flaw Enemy","prof",1969,1989],
  ["A child of the concrete housing estates","ab Streetwise|ab Computer","labour",1960,2022]],
 marks: [
  ["Took the cross","ab Melee|ab Ride|bg Allies",[[1197,1300]],"0","a comrade-in-arms|from the campaign"],
  ["Preached against the crusade","ab Expression|flaw Enemy",[[1197,1300]],"-",null],
  ["Nursed the sick in a plague year","ab Medicine|note Hardy against disease",[[1348,1352],[1380,1381],[1679,1681],[1713,1715],[1831,1832],[1918,1919],[2020,2021]],"0","a healer|you helped, who later vanished"],
  ["Buried your own in a plague year","flaw Nightmares|merit Iron Will",[[1348,1352],[1380,1381],[1679,1681],[1713,1715],[1831,1832],[1918,1919]],"-",null],
  ["Fought with the Hussite field armies","ab Firearms|ab Melee|ab Leadership",[[1419,1436]],"0","a Taborite captain|you served under"],
  ["Fought for the king and the Church against the chalice","ab Melee|ab Ride",[[1419,1436]],"0",null],
  ["Hid the family's goods and waited out the Hussite wars","ab Subterfuge|bg Resources",[[1419,1436]],"+",null],
  ["Changed faith to keep what you had after the White Mountain","bg Resources|flaw Dark Secret",[[1620,1648]],"+",null],
  ["Went into exile after the White Mountain","merit Language|note Exiled",[[1620,1648]],"-","a fellow exile|who still writes"],
  ["Joined an army of the long war","ab Firearms|ab Melee",[[1618,1648]],"-","a sergeant|who saved your life at least once"],
  ["Marched with the risen peasants","ab Melee|ab Leadership|flaw Enemy",[[1680,1680],[1775,1775],[1847,1848]],"-",null],
  ["Gave the risen peasants away","bg Resources|flaw Dark Secret",[[1680,1680],[1775,1775],[1847,1848]],"0","a rebel|who hanged because of you"],
  ["Stood in the ranks at the battle of the three emperors","ab Firearms|merit Iron Will",[[1805,1806]],"-","a comrade|from the Pratzen heights"],
  ["Nursed the wounded of three emperors","ab Medicine|ab Empathy",[[1805,1806]],"+","a French officer|you hid in a barn"],
  ["Stood on the Prague barricades","ab Firearms|ab Expression|flaw Enemy",[[1848,1849]],"-",null],
  ["Printed pamphlets in the year of revolutions","ab Expression|bg Contacts",[[1848,1849]],"+",null],
  ["Went to America and came back with money","bg Resources|merit Language",[[1850,1914]],"+","a cousin|in the new country"],
  ["Saw half the village leave for America","bg Contacts|ab Empathy",[[1850,1914]],"0",null],
  ["Went to the front for the emperor","ab Firearms|flaw Nightmares",[[1914,1918]],"-","a comrade|from the trenches"],
  ["Went over to the Legion","ab Firearms|bg Allies",[[1914,1920]],"+","a legionary|you crossed Siberia with"],
  ["Lost everything in the crash","note In debt|merit Iron Will",[[1929,1937]],"-","a creditor|who is still owed"],
  ["Did well out of the crash","bg Resources|flaw Enemy",[[1929,1937]],"+",null],
  ["Resisted the occupation","ab Subterfuge|ab Firearms|flaw Enemy",[[1939,1945]],"0","a resistance contact|you only knew by a code name"],
  ["Kept your head down through the occupation","ab Subterfuge|ab Alertness",[[1939,1945]],"0",null],
  ["Did well under the occupier","bg Resources|flaw Dark Secret",[[1939,1945]],"+",null],
  ["Deported, and came back","flaw Nightmares|merit Iron Will",[[1939,1945]],"-","a fellow prisoner|who survived with you"],
  ["Joined the Party after February","bg Influence|ab Politics",[[1948,1953]],"+",null],
  ["Lost your property after February","note In debt|ab Survival",[[1948,1953]],"-",null],
  ["Informed on a neighbour","bg Contacts|flaw Dark Secret",[[1948,1989]],"0","a neighbour|you informed on"],
  ["Stood in front of the tanks","ab Expression|flaw Enemy",[[1968,1969]],"-",null],
  ["Left the country after the tanks came","merit Language|note Exiled",[[1968,1975]],"0","a friend|who stayed behind"],
  ["Signed what you were told to sign","bg Contacts|flaw Dark Secret",[[1969,1975]],"+",null],
  ["Stood in the crowd on the square in November","bg Allies|ab Politics",[[1989,1989]],"+","a student organiser|you met on the square"],
  ["Shredded files in the last weeks","ab Subterfuge|flaw Dark Secret",[[1989,1990]],"0",null],
  ["Made a fortune in the privatisation","bg Resources|flaw Enemy",[[1990,1995]],"+",null],
  ["Stood on the sandbags in the flood","ab Athletics|bg Allies",[[1997,1997],[2002,2002]],"+",null],
  ["Lost the house to the flood","note In debt|ab Survival",[[1997,1997],[2002,2002]],"-",null]]}
};
Object.assign(LOCAL_EVENTS, EVENTS_EUROPE, EVENTS_ASIA, EVENTS_WORLD);
