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
import {EVENTS_PROLOGUE} from "./lifepath-events-prologue.mjs";

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
Object.assign(LOCAL_EVENTS, EVENTS_EUROPE, EVENTS_ASIA, EVENTS_WORLD, {
"orbit": {
 origins: [
  ["A child of the first hired townships aloft","ab Crafts|ab Athletics|merit Language","labour",1999,2019],
  ["Born free in a high colony after the rising","ab Politics|ab Technology|merit Iron Will","labour",2019,2099],
  ["A family owing a firm for the lift and the air","note In debt|ab Technology|ab Subterfuge","bound",2030,2099]],
 marks: [
  ["Came through the war in orbit","flaw Nightmares|flaw Phobia",[[2008,2008]],"-","a crew mate|from the broken station"],
  ["Salvaged the wrecks after the war in orbit","bg Resources|ab Technology",[[2008,2012]],"+","a salvage partner|with a claim of their own"],
  ["Worked on the city in the sky as it was finished","ab Crafts|bg Contacts",[[2009,2011]],"+",null],
  ["Stood with the high colony when it broke free","ab Firearms|bg Allies|flaw Enemy",[[2019,2019]],"+","a comrade|of the rising"],
  ["Lived under martial law in the sister colony","ab Subterfuge|flaw Vengeful",[[2019,2022]],"-","an informer|on your ring"],
  ["Sat out the war of seven hours in a sealed section","ab Alertness|merit Iron Will",[[2022,2022]],"0",null],
  ["Took a night-shift contract in the docks","bg Resources|note In debt",[[2048,2099]],"0","a shift boss|who never comes out by day"],
  ["Lost air in a section that was sealed too late","flaw Nightmares|flaw Phobia",[[1999,2099]],"-",null],
  ["Carried something down the well without asking what","bg Resources|flaw Dark Secret",[[2011,2099]],"+","a broker|at the foot of the mountain track"],
  ["Went down to Earth once and could barely stand","ab Empathy|ab Athletics",[[2011,2099]],"0","kin|on the ground"]]},
"luna": {
 origins: [
  ["A family of the crews that threw the rock","flaw Dark Secret|ab Technology|merit Iron Will","labour",2009,2030],
  ["Born at the ice base of the southern pole","ab Survival|ab Science|bg Allies","labour",2050,2099]],
 marks: [
  ["Knew what the launch track did in the war","flaw Dark Secret|flaw Nightmares",[[2008,2010]],"-","a track officer|who gave the order"],
  ["Opened the ice base at the pole","ab Crafts|bg Status",[[2050,2052]],"+","a foreign partner|from the other half of the base"],
  ["Struck for air and water rights","bg Allies|flaw Enemy",[[2050,2099]],"0","an organiser|shipped back to Earth"],
  ["Was caught outside in a solar storm","flaw Short|merit Iron Will",[[2009,2099]],"-",null],
  ["Found a seam of clean ice and sold the claim","bg Resources|ab Finance",[[2050,2099]],"+",null],
  ["Walked alone on the far side","ab Awareness|ab Survival",[[2009,2099]],"0",null],
  ["Lost a crew to a blown seal","flaw Nightmares|flaw Vengeful",[[2009,2099]],"-","a survivor|who blames the company"]]},
"mars": {
 origins: [
  ["Born on the colony ship or just after landfall","ab Survival|ab Crafts|merit Language","land",2059,2075]],
 marks: [
  ["Watched the colony ship come down beside the old base","ab Politics|merit Language",[[2059,2059]],"0","a newcomer|you showed around"],
  ["Came through a dust season on short rations","merit Iron Will|flaw Short",[[2022,2099]],"-",null],
  ["Traded between the bases when the flags would not","bg Resources|bg Contacts",[[2059,2099]],"+","a go-between|trusted by all three"],
  ["Lost someone on a long drive","flaw Nightmares|ab Survival",[[2022,2099]],"-",null],
  ["Found something under the ice and reported it, or did not","ab Science|ab Occult|flaw Dark Secret",[[2022,2099]],"0","a geologist|who saw it too"],
  ["Kept the air plant running through a failure","bg Status|ab Technology",[[2022,2099]],"+",null],
  ["Waited two years for a ship that was late","flaw Short Fuse|ab Empathy",[[2022,2099]],"-",null]]}});
// B3180: the marks before 1197, for elders (lifepath-events-prologue.mjs)
for ( const [id, marks] of Object.entries(EVENTS_PROLOGUE) ) {
  LOCAL_EVENTS[id] ??= {origins: [], marks: []};
  LOCAL_EVENTS[id].marks = [...(LOCAL_EVENTS[id].marks ?? []), ...marks];
}
