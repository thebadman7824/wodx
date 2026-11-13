/**
 * WoDX Creation: the drill-down lifepath's lists (Ben, 13 November 2026). Continent, region, origin, then childhood,
 * the teenage years and each chapter of adult life. WoDX's own words; the history is general knowledge, rounded for
 * play, and the future ages are a house reading. Nothing here comes from a book's text.
 *
 * Shapes (the rules are in scripts/lifepath-drill-rules.mjs):
 *   CONTINENTS [label, [region ids of Chronicle's WORLD_REGIONS]]
 *   ORIGINS    [base key, label, text, gives, from year, to year]
 *   the lists  [label, gives, {from, to, bases (only for these origins), not (never for these origins)}]
 *   LOCAL      region id -> era group (M to 1499, E to 1788, I to 1945, N to 2022, F after) ->
 *              [the age's name, origins [[label, gives, base key]], a teen path [label, gives], a calling [label, gives]]
 * gives: "bg Allies|ab Crafts|merit Name|flaw Name|note Free text", as in data/lifepaths.mjs.
 * Writing rule: second person or none, no gendered words.
 */

export const CONTINENTS = [
 ["Europe", ["moravia","german-lands","british-isles","france","iberia","italy","low-countries","scandinavia","poland-baltic","carpathians-balkans","russia","aegean"]],
 ["Asia", ["anatolia","levant","arabia","persia","central-asia","siberia","tibet-himalaya","india","china","japan","korea","southeast-asia","nusantara"]],
 ["Africa", ["egypt","maghreb","west-africa","east-africa","southern-africa","central-africa"]],
 ["North America", ["canada","north-america-east","north-america-west","mexico","caribbean"]],
 ["South America", ["andes","brazil","southern-cone"]],
 ["Oceania", ["australia","aotearoa","pacific-islands"]],
 ["The poles", ["arctic","antarctica"]]];

// [key, label, text, gives, from, to]
export const ORIGINS = [
 ["orphan","Orphan or foundling","No parents you can name. Someone took you in, or no one did.","ab Streetwise|ab Survival|merit Iron Will|flaw Nightmares"],
 ["land","Born to the land","Farmers, herders or fishers, living by the seasons.","ab Animal Ken|ab Survival|ab Athletics"],
 ["bound","Born unfree","Serfs, slaves, bonded or indentured people. Your labour belonged to someone else.","ab Survival|ab Subterfuge|flaw Illiterate|flaw Enemy"],
 ["trade","A craft or shop family","A workshop, a stall, a name known on one street.","ab Crafts|ab Streetwise|bg Contacts"],
 ["merchant","A trading house","Goods, ledgers and partners in other cities.","ab Finance|merit Language|bg Resources|bg Contacts"],
 ["noble","A ruling or noble house","Land, rank and a name that has to be defended.","bg Resources|bg Status|bg Retainers|ab Etiquette|ab Politics"],
 ["faith","Raised in a house of faith","A monastery, temple, mosque school or mission brought you up.","ab Academics|ab Occult|bg Mentor"],
 ["soldier","A fighting family","Arms were the family trade.","ab Melee|ab Brawl|ab Leadership|bg Allies"],
 ["scholar","Scholars, scribes or officials","Books and paperwork fed the household.","ab Academics|ab Law|ab Politics|bg Mentor"],
 ["wander","People of the road or the sea","Nomads, caravan folk, sailors, travelling players.","ab Survival|ab Performance|merit Language|bg Allies"],
 ["outsider","A people apart","A minority faith or people among neighbours who do not trust you.","ab Empathy|ab Subterfuge|bg Allies|flaw Enemy"],
 ["under","A family outside the law","Thieves, smugglers, fences.","ab Larceny|ab Streetwise|bg Contacts|flaw Dark Secret"],
 ["labour","Mill, mine or factory hands","Shifts, whistles and a wage packet.","ab Crafts|ab Athletics|bg Allies",1760],
 ["prof","A salaried or professional family","Doctors, clerks, teachers, engineers.","ab Academics|ab Science|bg Resources",1800],
 ["corp","A company family","The firm houses you, schools you and owns the clinic you were born in.","ab Computer|ab Etiquette|bg Resources|bg Influence",2023],
 ["strange","A family that knew too much","Your kin served, feared or were bred by something that is not human.","ab Occult|bg Mentor|flaw Dark Secret|note Opens the hidden-world scenes of your line"]];
// [label, gives, {from,to,bases}]
export const HOME = [
 ["A house of faith took you in","ab Academics|bg Mentor",{bases:["orphan"]}],
 ["Kin who did not want you","ab Subterfuge|flaw Enemy",{bases:["orphan"]}],
 ["The streets raised you","ab Streetwise|ab Larceny|bg Contacts",{bases:["orphan","under"]}],
 ["A stranger with reasons of their own","bg Mentor|flaw Dark Secret",{bases:["orphan","strange"]}],
 ["An orphanage or poorhouse","ab Brawl|merit Iron Will",{bases:["orphan"],from:1600}],
 ["Nurses, tutors and servants more than parents","ab Etiquette|bg Retainers",{bases:["noble","corp","merchant"]}],
 ["Both parents and a full house","bg Allies|ab Empathy",{not:["orphan"]}],
 ["One parent, and work from the day you could walk","ab Crafts|merit Light Sleeper",{not:["orphan"]}],
 ["Grandparents and their stories","ab Occult|ab Expression",{not:["orphan"]}],
 ["Fostered or sent to another household","ab Etiquette|bg Contacts"],
 ["Always moving","ab Survival|merit Language"]];
export const CMARK = [
 ["A hungry year","merit Iron Will|ab Survival"],["A sickness that nearly took you","flaw Nightmares|ab Medicine"],["A death in the house","ab Empathy|flaw Nightmares"],
 ["A friend from the other side of things","bg Contacts|ab Empathy"],["Soldiers came through","ab Stealth|flaw Phobia"],["You saw something no one believed","ab Occult|ab Awareness|flaw Nightmares"],
 ["A gift everyone noticed","ab Performance|bg Fame"],["A secret you were told to keep","ab Subterfuge|flaw Dark Secret"],["Lessons, when others had none","ab Academics"],["A screen raised you","ab Computer",{from:1985}]];
export const TPATH = [
 ["Apprenticed to a trade","ab Crafts|bg Mentor",{to:1950}],["School, and more school","ab Academics|ab Science",{from:1850}],["Worked the land or the boats","ab Survival|ab Athletics|ab Animal Ken"],
 ["Took vows or studied for the faith","ab Academics|ab Occult|bg Mentor"],["Carried arms too young","ab Melee|ab Brawl|flaw Nightmares"],["Ran with a gang","ab Streetwise|ab Brawl|bg Allies"],
 ["Served in a great household","ab Etiquette|ab Subterfuge|bg Contacts",{to:1945}],["Married or promised early","bg Allies|ab Empathy",{to:1920}],["Went on the road","ab Survival|merit Language"],
 ["Factory, mine or mill shifts","ab Crafts|merit Iron Will",{from:1760,to:1950}],["Trained to rule","ab Leadership|ab Politics|bg Status",{bases:["noble","corp"]}],["Lived online","ab Computer|bg Contacts",{from:1995}],
 ["Sold what you could steal","ab Larceny|ab Streetwise"]];
export const TMARK = [
 ["A first love","ab Empathy"],["A rival who has not forgotten","flaw Enemy"],["Someone took an interest in you","bg Mentor"],["You ran away","ab Survival|ab Stealth"],
 ["You hurt someone badly","flaw Dark Secret|ab Intimidation"],["A war, a rising or a purge","ab Stealth|flaw Nightmares|bg Allies"],["A calling you could not explain","ab Occult|ab Awareness"],
 ["You were caught","flaw Enemy|ab Subterfuge"],["A debt was made in your name","flaw Enemy|bg Contacts"],["Someone powerful noticed you","bg Influence|bg Mentor"]];
export const CALL = [
 ["Worked a craft or kept a shop","ab Crafts|bg Resources"],["Farmed, herded or fished","ab Survival|ab Animal Ken"],["Soldiered","ab Melee|ab Leadership|bg Allies"],
 ["Traded far from home","ab Finance|merit Language|bg Contacts"],["Served the faith","ab Academics|ab Empathy|bg Status"],["Studied, taught or wrote","ab Academics|ab Expression|bg Mentor"],
 ["Healed the sick","ab Medicine|ab Empathy"],["Held office or kept the law","ab Law|ab Politics|bg Influence"],["Lived by crime","ab Larceny|ab Streetwise|bg Contacts"],
 ["Performed for a living","ab Performance|ab Expression|bg Fame"],["Went to sea","ab Survival|ab Athletics|merit Language"],["Kept a house and raised a family","ab Empathy|bg Allies"],
 ["Ruled land and people","ab Leadership|bg Retainers|bg Status"],["Wandered with no trade","ab Survival|ab Streetwise"],["Factory, railway or dock work","ab Crafts|ab Brawl|bg Allies",{from:1760}],
 ["Police, detective or agent work","ab Investigation|ab Firearms|bg Contacts",{from:1800}],["Engineer or scientist","ab Science|ab Technology",{from:1800}],["Journalist or broadcaster","ab Expression|ab Investigation|bg Contacts",{from:1850}],
 ["Office and company work","ab Finance|ab Computer|bg Resources",{from:1900}],["Net and data work","ab Computer|ab Technology",{from:1990}],["Hired gun on the streets","ab Firearms|ab Streetwise|bg Contacts",{from:2023}]];
export const AMARK = [
 ["Married, or as good as","bg Allies"],["A child of your own","note A child"],["Came into money","bg Resources"],["Lost everything","merit Iron Will|flaw Enemy"],["Made a powerful friend","bg Allies|bg Influence"],
 ["Made an enemy for life","flaw Enemy"],["Went to war","ab Melee|flaw Nightmares|bg Allies"],["Crossed the world","merit Language|ab Survival"],["Did something that cannot come out","flaw Dark Secret"],
 ["Buried someone you loved","flaw Nightmares|ab Empathy"],["Brushed against the hidden world","ab Occult|ab Awareness|flaw Hunted"],["Became known","bg Fame|bg Status"],["Prison, exile or flight","ab Streetwise|flaw Hunted"],["A quiet stretch","ab Crafts"]];
// region: group: [age, origins [[label, gives, base]], teen [label, gives], adult [label, gives]]
export const LOCAL = {
"france": {
 M: ["France of cathedrals and crusades", [["A Languedoc family watched by the Inquisition","ab Subterfuge|ab Academics|flaw Dark Secret","outsider"],["A child of the Paris schools quarter","ab Academics|ab Streetwise|bg Contacts","scholar"],["Vine-growers of Burgundy","ab Crafts|ab Survival|bg Allies","land"]], ["Page in a baron's hall","ab Etiquette|ab Melee"], ["Took the cross for Outremer or the south","ab Melee|ab Survival|bg Allies"]],
 E: ["France of the Wars of Religion and the Sun King", [["A Huguenot household","ab Academics|ab Subterfuge|flaw Enemy","outsider"],["A family of the law courts","ab Law|ab Politics|bg Status","scholar"],["An Atlantic port family in the colonial trade","ab Finance|merit Language|bg Resources","merchant"]], ["Sent to the Jesuit college","ab Academics|ab Expression"], ["Sailed for New France or the islands","ab Survival|merit Language|bg Contacts"]],
 I: ["France of revolution, empire and republic", [["A family marked by the Terror","flaw Dark Secret|ab Politics|bg Contacts","noble"],["Coal miners of the north","ab Athletics|ab Crafts|bg Allies","labour"],["A colonial family home from Algiers or Saigon","merit Language|bg Resources|ab Etiquette","prof"]], ["Barricade runner in Paris","ab Streetwise|ab Brawl|bg Allies"], ["The trenches, or the Resistance","ab Firearms|ab Stealth|flaw Nightmares"]],
 N: ["France of the thirty good years and after", [["A child of the tower estates outside the city","ab Streetwise|merit Language|bg Allies","outsider"],["A settler family resettled from Algeria","flaw Enemy|ab Politics|bg Contacts","prof"],["Farmers leaving the land","ab Drive|ab Survival","land"]], ["Student in the streets of 1968 or its echoes","ab Expression|ab Politics"], ["Aid work in the former colonies","ab Medicine|merit Language|bg Contacts"]],
 F: ["France of the walled districts", [["A child of a company enclave on the Seine","ab Computer|ab Etiquette|bg Resources","corp"],["A family of the flooded Atlantic coast","ab Survival|ab Streetwise|bg Allies","land"]], ["Courier between the districts","ab Drive|ab Streetwise"], ["Fixer on the Marseille docks","ab Subterfuge|bg Contacts|ab Finance"]]},
"japan": {
 M: ["Japan of the Kamakura and Ashikaga shoguns", [["A provincial warrior house","ab Melee|ab Ride|bg Status","soldier"],["Given young to a mountain temple","ab Academics|ab Occult|bg Mentor","faith"],["Riverbank people, shunned for their work","ab Crafts|ab Streetwise|flaw Enemy","outsider"]], ["Acolyte among warrior monks","ab Melee|ab Academics"], ["Fought in a lord's levy","ab Melee|ab Survival|bg Allies"]],
 E: ["Japan of the warring provinces and the Tokugawa peace", [["A samurai household without a stipend","ab Melee|ab Etiquette|flaw Enemy","soldier"],["An Osaka merchant house","ab Finance|bg Resources|bg Contacts","merchant"],["Hidden Christians of Kyushu","ab Subterfuge|flaw Dark Secret|bg Allies","outsider"]], ["Apprentice in the trades of the pleasure quarter","ab Performance|ab Etiquette|ab Empathy"], ["Masterless, selling your sword","ab Melee|ab Streetwise"]],
 I: ["Japan of Meiji and empire", [["A samurai family fallen in the new order","ab Etiquette|ab Academics|flaw Enemy","noble"],["Silk-mill hands","ab Crafts|merit Iron Will","labour"],["Settlers in Manchuria or Hawaiʻi","merit Language|ab Survival|bg Allies","land"]], ["Cadet in the new army or navy","ab Firearms|ab Leadership"], ["Clerk of a trading combine abroad","ab Finance|merit Language|bg Contacts"]],
 N: ["Japan after the surrender", [["A commuter-suburb family","ab Academics|bg Resources","prof"],["A Korean family born in Japan","merit Language|flaw Enemy|bg Allies","outsider"],["Survivors of the bombs","flaw Nightmares|merit Iron Will|ab Medicine","trade"]], ["Cram school by day, biker gang by night","ab Drive|ab Brawl|bg Allies"], ["Company lifer","ab Finance|ab Etiquette|bg Resources"]],
 F: ["Japan of the combine towers", [["Born in a combine's tower","ab Computer|ab Etiquette|bg Resources","corp"],["A family of the drowned wards","ab Streetwise|ab Survival","under"]], ["Arcade and net prodigy","ab Computer|bg Fame"], ["Deniable hand for a combine","ab Stealth|ab Firearms|bg Contacts"]]},
"west-africa": {
 M: ["West Africa of the Mali empire", [["A griot lineage, keepers of praise and memory","ab Performance|ab Expression|bg Contacts","scholar"],["A family of the gold and salt caravans","ab Finance|ab Survival|merit Language","merchant"],["Blacksmiths, feared and needed","ab Crafts|ab Occult|bg Status","trade"]], ["Student at a Timbuktu mosque school","ab Academics|merit Language"], ["Rode in the emperor's cavalry","ab Melee|ab Ride|bg Status"]],
 E: ["West Africa of Songhai, Oyo and Asante", [["A royal lineage of Oyo or Asante","bg Status|bg Retainers|ab Politics","noble"],["Coast traders dealing with the forts","ab Finance|merit Language|flaw Dark Secret","merchant"],["Taken in a raid as a child","ab Survival|flaw Nightmares|merit Iron Will","bound"]], ["Initiated into a masked society","ab Occult|ab Subterfuge|bg Allies"], ["Carried across the ocean in chains (the path goes on in the Caribbean, Brazil or North America)","ab Survival|flaw Nightmares|merit Iron Will"]],
 I: ["West Africa of the caliphates and colonial rule", [["Scholars of the Sokoto caliphate","ab Academics|ab Law|bg Status","scholar"],["A mission-school child","ab Academics|merit Language|bg Mentor","faith"],["Cocoa farmers under the colonial tax","ab Survival|ab Finance","land"]], ["Clerk in training for a trading company","ab Finance|merit Language"], ["Soldier in a colonial regiment overseas","ab Firearms|ab Survival|bg Allies"]],
 N: ["West Africa of independence", [["A civil servant's family in the new capital","ab Academics|ab Politics|bg Influence","prof"],["Market traders of Lagos or Accra","ab Finance|ab Streetwise|bg Contacts","trade"],["A family of the oil delta","ab Survival|flaw Enemy|bg Allies","land"]], ["Student on a scholarship abroad","ab Academics|merit Language"], ["Officer through the coups","ab Leadership|ab Firearms|flaw Enemy"]],
 F: ["West Africa of the lagoon megacity", [["A family of the stilt districts","ab Streetwise|ab Technology|bg Allies","under"],["A solar cooperative of the Sahel","ab Technology|ab Survival|bg Allies","land"]], ["Salvage tech in the device markets","ab Technology|ab Finance"], ["Broker between the city and the foreign firms","ab Finance|merit Language|bg Influence"]]},
"andes": {
 M: ["The Andes of the valley kingdoms and the rising Inca", [["An ayllu of herders and terrace farmers","ab Survival|ab Animal Ken|bg Allies","land"],["Weavers of fine cloth for the lords","ab Crafts|ab Etiquette","trade"],["Chosen as a child for the house of the Sun","ab Occult|ab Etiquette|bg Status","faith"]], ["Runner on the royal roads","ab Athletics|ab Survival"], ["Resettled by the Inca in a conquered valley","merit Language|ab Survival|bg Allies"]],
 E: ["The Andes of the conquest and the viceroyalty", [["A family owing labour to the Potosí mines","ab Athletics|ab Survival|flaw Enemy","bound"],["A headman's child between two worlds","merit Language|ab Politics|bg Status","noble"],["A Spanish grant-holder's house","bg Resources|bg Retainers|ab Ride","noble"]], ["Taught letters by friars","ab Academics|merit Language"], ["Kept the old rites in secret","ab Occult|ab Subterfuge|flaw Dark Secret"]],
 I: ["The Andes of the republics, guano and tin", [["Peons on a great estate","ab Survival|ab Animal Ken|flaw Illiterate","bound"],["Shopkeepers of Lima","ab Finance|bg Contacts","trade"],["Tin miners of the high plateau","ab Athletics|ab Crafts|bg Allies","labour"]], ["Conscripted for a border war","ab Firearms|flaw Nightmares"], ["Organised the miners","ab Leadership|ab Politics|flaw Enemy"]],
 N: ["The Andes of reform, coups and insurgency", [["Highlanders come down to the shanty towns","ab Streetwise|merit Language|bg Allies","outsider"],["An officer's family","ab Leadership|bg Influence|ab Firearms","soldier"],["Coca growers","ab Survival|ab Subterfuge|bg Contacts","land"]], ["Recruited at school by the insurgents","ab Politics|ab Stealth|flaw Dark Secret"], ["Village patrol against the guerrillas","ab Firearms|ab Leadership|flaw Nightmares"]],
 F: ["The Andes of the lithium companies", [["A family of the lithium flats","ab Technology|ab Survival|flaw Enemy","labour"],["A water-holding clan of the high valleys","bg Resources|bg Allies|ab Politics","land"]], ["Guide for smugglers over the passes","ab Survival|ab Drive"], ["Company security, or the people it fights","ab Firearms|ab Stealth"]]},
"levant": {
 M: ["The Levant of Ayyubids, crusaders, Mongols and Mamluks", [["A merchant family of the Damascus souk","ab Finance|ab Crafts|bg Contacts","merchant"],["Frankish settlers of the coast","ab Melee|merit Language|flaw Enemy","soldier"],["A Bedouin clan of the desert edge","ab Survival|ab Ride|bg Allies","wander"]], ["Bought and trained as a slave soldier","ab Melee|ab Ride|bg Mentor"], ["Guide and guard for the pilgrim caravans","ab Survival|merit Language|bg Contacts"]],
 E: ["The Levant under the Ottoman sultans", [["An Ottoman official's household","ab Law|ab Etiquette|bg Influence","scholar"],["A Maronite or Druze mountain village","ab Survival|ab Melee|bg Allies","outsider"],["A Jewish family of Safed or Baghdad","ab Academics|ab Occult|bg Contacts","outsider"]], ["Student at a great mosque school","ab Academics|ab Law"], ["Agent for a European consul","merit Language|ab Subterfuge|bg Contacts"]],
 I: ["The Levant of reform, railways and the mandates", [["Silk growers of Mount Lebanon with kin in the Americas","ab Crafts|merit Language|bg Contacts","land"],["A notable family of Jerusalem","bg Status|bg Influence|ab Politics","noble"],["Railway and oilfield hands","ab Crafts|ab Technology|bg Allies","labour"]], ["Pupil of a foreign mission college","ab Academics|merit Language"], ["Rode with the revolt in the desert","ab Firearms|ab Ride|bg Allies"]],
 N: ["The Levant of wars, coups and oil", [["A refugee camp family","ab Streetwise|ab Survival|flaw Enemy","outsider"],["An officer's family of the ruling party","bg Influence|ab Politics|flaw Dark Secret","soldier"],["A Beirut family through the civil war","ab Stealth|merit Language|flaw Nightmares","trade"]], ["Carried a rifle for a militia","ab Firearms|ab Streetwise|flaw Nightmares"], ["Worked the Gulf oil towns and sent money home","ab Technology|bg Resources"]],
 F: ["The Levant of the water wars", [["A family of a desalination city","ab Technology|bg Resources","corp"],["Herders of the dry interior","ab Survival|ab Drive|bg Allies","wander"]], ["Drone spotter for a neighbourhood guard","ab Technology|ab Stealth"], ["Water broker","ab Finance|ab Politics|bg Influence"]]},
"north-america-west": {
 M: ["The West before the ships", [["A pueblo farming clan","ab Crafts|ab Survival|bg Allies","land"],["A people of the buffalo plains","ab Survival|ab Athletics|ab Stealth","wander"],["A coast people of salmon and cedar","ab Crafts|ab Survival|bg Status","land"]], ["Sought a vision alone","ab Occult|ab Survival|merit Iron Will"], ["Traded shell, turquoise and hides across the mountains","merit Language|ab Finance|bg Contacts"]],
 E: ["The West of New Spain's far north and the horse nations", [["A mission child","ab Academics|merit Language|flaw Enemy","faith"],["A family of a horse nation","ab Ride|ab Survival|ab Melee","wander"],["A ranch family of the Rio Grande","ab Ride|ab Animal Ken|bg Resources","land"]], ["Captive raised by another people","merit Language|ab Survival|flaw Nightmares"], ["Fought in the pueblo rising, or against it","ab Melee|ab Leadership|flaw Enemy"]],
 I: ["The West of wagon trails, railways and reservations", [["Homesteaders","ab Survival|ab Firearms|ab Animal Ken","land"],["A Chinese railway worker's family","ab Crafts|merit Language|flaw Enemy","outsider"],["A reservation child sent to a boarding school","ab Academics|merit Language|flaw Nightmares","outsider"],["A cattle-town family","ab Ride|ab Streetwise|bg Contacts","trade"]], ["Rode herd","ab Ride|ab Animal Ken|ab Firearms"], ["Wore a badge, or ran from one","ab Firearms|ab Investigation|flaw Enemy"]],
 N: ["The West of highways, studios and silicon", [["A defence-plant suburb family","ab Technology|bg Resources","prof"],["Farm workers following the harvests","ab Survival|merit Language|bg Allies","wander"],["A reservation family","ab Survival|ab Occult|bg Allies","outsider"],["A studio-town family","ab Performance|ab Expression|bg Contacts","trade"]], ["Garage tinkerer","ab Technology|ab Computer"], ["Start-up founder, rich or ruined","ab Computer|ab Finance|bg Resources"]],
 F: ["The West of the free cities and dead highways", [["A nomad pack on the old interstates","ab Drive|ab Survival|bg Allies","wander"],["A free-city tower family","ab Computer|bg Resources|ab Etiquette","corp"]], ["Scavenger in the dust towns","ab Survival|ab Technology"], ["Convoy guard","ab Drive|ab Firearms|bg Allies"]]}
};

/** The chapters of adult life: [first year of age, label]. */
export const CHAPTERS = [[18, "18 to 29"], [30, "30 to 44"], [45, "45 to 59"], [60, "60 and after"]];

/** What brought a character from elsewhere to the chronicle's homeland. */
export const ARRIVALS = ["Work, trade or study", "Flight from something at home", "Sent by someone you answer to", "Following a person", "Something called you here"];
