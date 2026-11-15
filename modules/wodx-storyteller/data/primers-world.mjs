/**
 * What everyone knows, by the homeland's way of life (B5880 to B5882). WoDX's own words: plain history as an ordinary
 * person of the land and the time would know it, no metaplot of the game lines and no book text. The era primers in
 * setup-rules.mjs were written for Western Christendom; a chronicle whose homeland follows another way of life (WoDX
 * Chronicle's sphereFor) shows these lines on the players' page instead, with the era's own name kept.
 *
 * WORLD_PRIMERS: way of life -> period -> [paragraph, ...]. Periods: "1197" (to 1449), "1450" (to 1799), "1800" (to
 * 1913), "1914" (to 1999), "2000" (and the Future Darkness). A period a way of life never reaches in WoDX's history
 * (the Andes after the conquest follow Western Christendom) is left out, and the nearest earlier one is used.
 */
export const PERIODS = [[-9999, "1197"], [1450, "1450"], [1800, "1800"], [1914, "1914"], [2000, "2000"]];
export function periodFor(year) {
  let out = "1197";
  for ( const [from, p] of PERIODS ) if ( Number(year) >= from ) out = p;
  return out;
}

export const WORLD_PRIMERS = {
  orthodox: {
    "1197": ["The Eastern church holds the year together: long fasts, icons in every house, and the bells of the monasteries. Constantinople is the greatest city anyone has heard of, and its emperor is God's ruler on earth.",
      "Princes of the Rus quarrel over Kiev and the river trade, and steppe riders raid the borders. From 1240 the Mongols take tribute, and princes ride to the khan for leave to rule."],
    "1450": ["Constantinople fell to the Turks in 1453, and Moscow calls itself the heir of Rome. The tsar rules as master of all, and the church stands beside the throne.",
      "Most people are peasants bound to a lord's land. Cossacks and settlers push east across the forests toward Siberia, and Peter the Great drags the court toward the West after 1700."],
    "1800": ["Serfdom ends in Russia in 1861, but land stays short and hunger comes often. Railways cross the empire, and students, bombers and secret police watch one another.",
      "In the Balkans and Greece, peoples break away from the Ottomans one war at a time. Faith, language and the village still decide who a person is."],
    "1914": ["War, revolution and civil war tear the old empire down, and the Soviets build a state that answers to the Party. Churches are shut, neighbours inform, and the camps take the unlucky.",
      "After 1991 the Union breaks apart. Prices soar, factories close, and the old faith comes back into the open beside new money and new gangs."],
    "2000": ["Strong rulers promise order after the chaos of the nineties. The church is rich again, the oligarchs richer, and screens carry the news the state approves."]
  },
  islamic: {
    "1197": ["The call to prayer marks five hours of every day, and Friday is the day of the great mosque. Scholars, judges and merchants share one faith and one learned tongue from the Maghreb to the Silk Road.",
      "Crusaders hold parts of the coast of the Levant until 1291. From 1219 the Mongols lay waste to the east, and Baghdad falls in 1258; slave soldiers rule Egypt and turn the invaders back."],
    "1450": ["Three great empires hold the lands of Islam: the Ottomans from Istanbul, the Safavids in Persia, the Mughals in India. The sultan's law, the market and the mosque order daily life.",
      "Coffee houses open and argue. Caravans and pilgrim roads still run to Mecca each year, while European ships begin to take the trade of the sea."],
    "1800": ["European powers press in: the French in Algeria from 1830, the British in Egypt from 1882, Russians in Central Asia. Reformers build schools, armies and newspapers to keep up.",
      "The telegraph and the steamship reach the ports. In the bazaar the old guilds hold on, but foreign cloth and foreign debt change everything."],
    "1914": ["The Ottoman empire falls after the Great War, and new states rise under kings, colonels and mandates. Oil makes a few lands rich, and independence comes country by country.",
      "Radio carries the news and the Quran into every house. Wars over Palestine, revolution in Iran in 1979, and conflict in the Gulf mark the later years."],
    "2000": ["Satellite news and phones spread everywhere. Wars and uprisings shake the region after 2001 and 2011, and cities of towers rise on the Gulf beside old quarters that still keep the hours of prayer."]
  },
  indic: {
    "1197": ["Every person is born into a caste and a calling, and the temple, the river and the festival shape the year. Kings of many dynasties rule the south and the hills.",
      "Turkish sultans take Delhi from 1206 and raise mosques beside the temples. Trade with Arabia, Persia and the East brings spices, cloth and horses through the ports."],
    "1450": ["The Mughal emperors rule the north from 1526 with grand courts, tolerant at first and stricter later. In the south, the city of Vijayanagara is rich until 1565.",
      "Portuguese, Dutch, French and English traders build forts on the coasts. After 1757 the English company starts to rule whole provinces."],
    "1800": ["The British rule India directly after the great rising of 1857. Railways, the telegraph and English schools spread, and famine still kills millions in bad years.",
      "Reformers and nationalists meet in Congress from 1885. The old courts of the princes stay on under British watch."],
    "1914": ["Gandhi leads millions in refusing British rule, and independence comes in 1947 with partition. Riots and the flight of whole peoples across new borders follow.",
      "India grows into a republic of many tongues, with cinema, radio and the ballot box reaching every village by the end of the century."],
    "2000": ["Phones, call centres and software change the cities fast. Old temples, new towers and crowded trains stand side by side, and faith and caste still matter at every wedding."]
  },
  sinic: {
    "1197": ["The emperor rules by the Mandate of Heaven through scholars who pass the examinations. Families honour their ancestors, and order runs from father to son and ruler to subject.",
      "In the south the Song cities are the richest on earth, with paper money and printed books. The Mongols conquer the north and then all of China by 1279; Korea's kings must bow to them."],
    "1450": ["The Ming emperors rebuild the walls and close the sea; the Manchus take the throne in 1644 as the Qing. Korea's Joseon kings rule by the classics, and the yangban hold the land.",
      "Silver from the far side of the world pays for silk and porcelain in Canton. Village life follows the lunar months, the ancestors and the harvest."],
    "1800": ["Opium wars from 1839 force the ports open, and the Taiping war kills millions. Foreigners build concessions in the cities, and Japan takes Korea in 1910.",
      "The last dynasty falls in 1912. Telegraphs and steamers reach the river cities, while the countryside goes on much as before."],
    "1914": ["Warlords, invasion by Japan, and civil war fill the first half of the century. From 1949 the Communist Party rules the mainland, and Korea is split after 1945 and a war.",
      "Campaigns, famine and the Cultural Revolution shake every family. After 1978 the markets open again, and the coast fills with factories."],
    "2000": ["China becomes the workshop of the world and builds new cities in a decade. Phones carry payments, cameras watch the streets, and the old festivals still bring families home."]
  },
  japanese: {
    "1197": ["The emperor reigns in Kyoto, but warriors rule: the shogun's government sits at Kamakura from 1192. Samurai owe service to their lords, and Buddhist temples and Shinto shrines share the land.",
      "Mongol fleets come in 1274 and 1281 and are wrecked by storms. Later, the provinces fall into long wars between great houses."],
    "1450": ["After a century of war, Japan is united, and the Tokugawa shoguns rule from Edo from 1603. Christians are hunted after 1614, and the land is closed to most foreigners.",
      "Peace lets the towns grow: merchants, theatres, woodblock prints and pleasure quarters. Samurai keep their swords and their rank, though there are few battles."],
    "1800": ["American ships force the country open in 1853, and the emperor's restoration of 1868 sweeps the shogun away. Railways, conscript armies and Western dress arrive within a generation.",
      "Japan defeats China and then Russia, and rules Taiwan and Korea."],
    "1914": ["Empire, war in China and the Pacific, and the atom bombs of 1945 end in defeat. The country rebuilds under American occupation and grows rich on cars and electronics.",
      "By the eighties Tokyo is a city of neon, trains to the minute and salarymen who work late."],
    "2000": ["The towns age and the young move to the cities. Robots, games and old shrines share the streets, and earthquakes and the 2011 tsunami are remembered by everyone."]
  },
  theravada: {
    "1197": ["Monks in saffron walk the morning alms round, and every boy may spend a season in the monastery. Kings raise great temples at Angkor and Pagan.",
      "Rice, rivers and the monsoon set the year. Thai kingdoms grow strong from the thirteenth century as Angkor weakens."],
    "1450": ["Ayutthaya, Pegu and Ava trade with China, India and the European ships. Kings are patrons of the Buddha's teaching and wage wars for elephants and captives.",
      "Burmese armies sack Ayutthaya in 1767, and Bangkok becomes the new capital."],
    "1800": ["Britain takes Burma and France takes Indochina; only Siam stays free, by giving up land and modernising. Rice for export fills the deltas.",
      "Telegraphs and steamers reach the river towns, but the village, the temple and the headman still decide daily life."],
    "1914": ["Japan occupies the region in the Second World War. Independence follows, then long wars in Vietnam, Laos and Cambodia, and the killing fields of 1975 to 1979.",
      "Thailand grows rich on trade and tourism while its neighbours rebuild."],
    "2000": ["Phones and motorbikes fill every town, and tourists crowd the old temples. Monks still walk the alms round at dawn."]
  },
  tibetan: {
    "1197": ["Monasteries are the heart of the land, and the lamas teach, heal and judge. Herders drive yaks across the high plateau, and pilgrims walk around sacred mountains.",
      "Mongol khans become patrons of the great lamas from the thirteenth century."],
    "1450": ["The Dalai Lamas rise to rule from Lhasa from 1642, with the Potala above the city. Monk officials and noble families share the government.",
      "Traders cross the passes with salt, tea and wool. Few outsiders ever see the capital."],
    "1800": ["Tibet stays closed to Europeans, who are turned back at the passes. A British force reaches Lhasa in 1904, and after 1912 Tibet rules itself."],
    "1914": ["China's army arrives in 1950, and the Dalai Lama flees to India in 1959. Monasteries are emptied and many destroyed in the years that follow.",
      "From the eighties some temples reopen, and pilgrims return."],
    "2000": ["Roads and a railway reach Lhasa in 2006. Tourists, soldiers and pilgrims share the city, and exiles keep the old ways alive abroad."]
  },
  malay: {
    "1197": ["Kings of the islands rule from courts built on the spice and sea trade, and great Hindu and Buddhist temples stand on Java. Ships carry cloves, pepper and gold to China and India.",
      "Islam spreads along the trade routes, and Malacca becomes a great Muslim port by 1400."],
    "1450": ["Sultans rule the coasts, and the call to prayer is heard across the islands. Portuguese take Malacca in 1511, and the Dutch company rules Java's spice trade from Batavia.",
      "Village life follows the rice fields, the mosque or the old shrines, and the courts keep their dances and puppet plays."],
    "1800": ["The Dutch rule the Indies and the British rule Malaya, with plantations of sugar, coffee and rubber. Steamships bring pilgrims to Mecca and Chinese workers to the mines."],
    "1914": ["Japan occupies the islands in the Second World War; Indonesia fights for and wins independence by 1949, and Malaya by 1957. A bloody purge follows in Indonesia in 1965.",
      "Oil, palm plantations and new cities change the land in the later years."],
    "2000": ["Cities like Jakarta and Kuala Lumpur sprawl and grow tall. Phones, motorbikes and the mosque fill daily life, and tsunami and volcano are never far from mind."]
  },
  sahel: {
    "1197": ["Gold from the south and salt from the desert cross the Sahel by camel, and kings grow rich on the trade. Mali rises after 1235, and its ruler Mansa Musa's pilgrimage in 1324 dazzles Cairo.",
      "Timbuktu's scholars copy books, and the griots keep the history of every family in song."],
    "1450": ["Songhay rules the river after Mali, until Moroccan guns take Timbuktu in 1591. Along the coast, the trade in captives to the Americas grows and grows.",
      "Kingdoms of the forest, like Benin, Oyo and Asante, grow strong on that trade and on their own crafts."],
    "1800": ["Holy wars found new Muslim states in the Sahel. The slave trade ends at sea, and then European armies conquer nearly all of West Africa by 1900.",
      "Railways run from the mines and plantations to the ports, and mission schools open."],
    "1914": ["Colonial rule lasts until independence comes, country by country, from 1957. Coups, wars and droughts follow in many lands, and the cities grow fast.",
      "Radio, football and markets of every kind fill the towns."],
    "2000": ["Phones and money sent home from abroad change village life. Old trade towns, new cities and the desert edge all feel drought and war."]
  },
  swahili: {
    "1197": ["Stone towns of the Swahili coast trade gold, ivory and slaves for cloth and porcelain across the Indian Ocean, and their merchants are Muslim. Inland, Christian Ethiopia's kings carve churches from the rock.",
      "The monsoon winds set the sailing season, and ships from Arabia, India and China come and go."],
    "1450": ["Portuguese guns sack the coast towns after 1498, until Omani sultans drive them out. Ethiopia fights off a Muslim conquest with Portuguese help.",
      "Caravans go inland for ivory and captives."],
    "1800": ["Zanzibar's sultan rules the coast, and clove plantations are worked by slaves. Britain and Germany take the region in the scramble for Africa; Ethiopia beats the Italians in 1896."],
    "1914": ["Colonial rule, then independence from the sixties: Kenya, Tanzania, Uganda. Ethiopia's emperor falls in 1974 to a harsh military regime, and famine strikes in the eighties.",
      "Safari tourism, tea and coffee bring money, and the cities grow."],
    "2000": ["Mobile money and phones are everywhere. Nairobi and Addis Ababa grow fast, and the old coast towns still keep their mosques and dhows."]
  },
  bantu: {
    "1197": ["Kings and chiefs rule through their families, their cattle and their ancestors. Great Zimbabwe's stone walls stand over a trade in gold to the coast.",
      "The Kongo kingdom grows on the great river; villages farm, herd and forge iron, and the ancestors are honoured at every turn."],
    "1450": ["The Portuguese reach Kongo in 1483, and its kings take up Christianity. The trade in captives across the Atlantic drains whole regions.",
      "The Dutch settle the Cape from 1652, and farmers push north."],
    "1800": ["The Zulu kingdom rises, then falls to Britain in 1879. Diamonds and gold are found in the south, and European powers carve up the centre, Belgium's Congo most cruelly.",
      "Mines draw workers from far away, and mission schools spread."],
    "1914": ["Colonies give way to independence from 1960, but wars follow in the Congo, Angola and Mozambique. South Africa's apartheid ends with Mandela's election in 1994.",
      "Cities, mines and townships grow, and radio carries music across the continent."],
    "2000": ["Phones and new roads reach far villages. Cities grow fast, mines still matter, and the old chiefs keep a place beside elected leaders."]
  },
  mesoamerican: {
    "1197": ["City-states of many peoples trade, war and worship under the sun, the rain and the feathered serpent. Markets sell cacao, cotton, obsidian and jade.",
      "From 1428 the Mexica of Tenochtitlan lead a great alliance and take tribute from far and wide. Priests keep two calendars, and the gods demand blood."],
    "1450": ["Tenochtitlan is one of the largest cities on earth, built on a lake with causeways and canals. The Spanish arrive in 1519 and, with native allies and smallpox, take the city in 1521."]
  },
  andean: {
    "1197": ["Villages work the terraces and herd llamas, and every family owes labour to the lords. Kingdoms of the coast and the highlands rise and fall.",
      "From the fifteenth century the Inca of Cuzco build an empire bound by roads, runners and knotted cords that keep its accounts."],
    "1450": ["The Inca empire stretches the length of the mountains. Spaniards arrive in 1532, seize the emperor, and take the land amid civil war and plague."]
  },
  polynesian: {
    "1197": ["Island peoples sail by the stars between their islands, and chiefs trace their families back to the gods. Some things are sacred and must not be touched.",
      "Taro, breadfruit, pigs and the sea feed the villages, and the chiefs' feasts and wars mark the years."],
    "1450": ["Life on the islands follows the chiefs, the gods and the seasons of the sea. European ships come from the 1760s with iron, guns and sickness."],
    "1800": ["Missionaries, whalers and traders arrive, and kingdoms rise in Hawaii and Tonga. Sickness kills many, and Europeans take land; Hawaii falls to American planters in 1893."]
  },
  northern: {
    "1197": ["Peoples of the forest, the plains and the ice live by the hunt, the fishing and the seasons. Each knows its land, its spirits and its ancestors.",
      "Trade runs far along rivers and coasts, and stories carry the history of every people."],
    "1450": ["Fur traders and settlers come from the sea or from the west, bringing iron, guns, horses and new sickness. Some peoples grow strong on the trade, others lose their land.",
      "The old ways, the hunt and the spirits stay at the heart of life."],
    "1800": ["Settlers, railways and soldiers take more land, and treaties are broken. Many peoples are moved onto reserves, and children are taken to distant schools."],
    "1914": ["The old ways survive under pressure from schools, churches and governments. From the sixties, peoples organise to win back land and rights."],
    "2000": ["Peoples of the north and the plains keep their languages and ceremonies alive beside phones, trucks and new councils, and the ice is melting."]
  }
};

/** The players' lines for a way of life and year, or null for Western Christendom (the era primer covers it). */
export function worldPrimer(sphere, year) {
  const t = WORLD_PRIMERS[sphere];
  if ( !t ) return null;
  let p = periodFor(year);
  const order = PERIODS.map(x => x[1]);
  let i = order.indexOf(p);
  while ( i >= 0 && !t[order[i]] ) i--;
  return i >= 0 ? t[order[i]] : null;
}
