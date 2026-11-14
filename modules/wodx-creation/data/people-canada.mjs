/**
 * Canada's first nations for the People generator (Creation, B4160 to B4163): the Cree (Nehiyawak) of the plains,
 * woods and bay, the Anishinaabe (Ojibwe and Odawa) of the Great Lakes, and the Haida and Tlingit of the Northwest
 * coast. WoDX's own lists of recorded names; no book text. Picks logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings as the clerks and missions wrote them in English, hyphens dropped): the signers of Treaties 1 to
 * 9 (1871 to 1906), the Robinson treaties of 1850 and the Great Lakes treaties in Kappler, vol. II; the chiefs of the
 * 1885 resistance and of the fur-trade journals of the Hudson's Bay Company; the Haida and Tlingit chiefs in the
 * Russian, Hudson's Bay and mission records; and the family names of the band lists and the Haida and Tlingit rolls
 * since. Haida and Tlingit clans pass from the mother. The records hold fewer than 300 names for each people (house
 * reading B4161).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Cree own names: the chiefs of the numbered treaties and of 1885, in their English forms. */
export const CE_MEN = `
  Big Bear, Poundmaker, One Arrow, Little Pine, Wandering Spirit, Piapot, Maskepetoon, Sweetgrass, Beardy,
  Mistawasis, Ahtahkakoop, Fine Day, Imasees, Lucky Man, Little Poplar, Thunderchild, Red Pheasant, Moosomin,
  Kehiwin, Pakan, Bobtail, Ermineskin, Samson, Broken Arm, Okemasis, Muskowekwan, Kahkewistahaw, Cowessess`;
/** The Cree divisions. */
export const CE_BANDS = "the Plains Cree, the Woods Cree, the Swampy Cree, the Moose Cree, the James Bay Cree, the Rocky Cree";
export const CE_FAMILY = `
  Cardinal, Ahenakew, Bear, Daniels, Starblanket, Ermineskin, Thunderchild, Littlechild, Sinclair, Moosomin, Okemasis,
  Wolfe, Morin, Bighead, Linklater, McKay, Cheecham, Kakum, Littlepine, Poundmaker, Sutherland, Spence, Flett,
  Muskego, Moose, Hunter, Dreaver, Greyeyes, Lightning, Paul, Kennedy`;

/** Anishinaabe own names: Ojibwe and Odawa chiefs and speakers of the Great Lakes and the Red River. */
export const AN_MEN = `
  Pontiac, Shingwauk, Peguis, Hole in the Day, Flat Mouth, Curly Head, Waubojeeg, Kechewaishke, Keeshkemun, Wawatam,
  Minavavana, Madjeckewiss, Nissowaquet, Assikinack, Mukatapenaise, Kahkewaquonaby, Kahgegagahbowh, Maungwudaus,
  Sowengisik, Musquakie, Wabanosa`;
export const AN_WOMEN = "Ozhaguscodaywayquay, Bamewawagezhikaquay";
/** Anishinaabe towns and gathering places. */
export const AN_TOWNS = "Bawating, Michilimackinac, Mooningwanekaaning, Leech Lake, Red Lake, Rainy Lake, Walpole Island, Manitoulin, the Red River";
export const AN_FAMILY = `
  Jones, Johnston, Keeshig, Nahwegahbow, Commanda, Pelletier, Wabegijig, Morrisseau, Beaulieu, Kingbird, Fairbanks,
  Copway, Kakegamic, Jourdain, Bressette, Nanibush, Peltier, Chosa, Kegg, Mandamin, Debassige, Odjig, Big Canoe,
  Roy, Mitchell, Thompson, Assinewe, Shawanda, Manitowabi, Corbiere, Trudeau, Wemigwans`;

/** Haida own names: the town chiefs of Haida Gwaii in the trading and mission records. */
export const HA_MEN = "Edenshaw, Tahaygen, Koyah, Cunneah, Skidegate, Ninstints, Klue, Weah, Gitkun";
/** The Haida lineages under the Raven and Eagle sides, from the mother. */
export const HA_CLANS = "Raven, Eagle";
export const HA_FAMILY = `
  Edenshaw, Davidson, Wilson, Collinson, Bell, Yeltatzie, White, Williams, Russ, Brown, Hans, Young, Reid, Pearson,
  Stevens, Moody, Jones, Marks`;

/** Tlingit own names: the chiefs of Sitka, Chilkat, Wrangell and Taku in the Russian and American records. */
export const TL_MEN = "Kadashan, Shakes, Kotlean, Katlian, Chartrich, Kowee, Annahootz, Shotridge, Klanot, Sitka Jack";
/** Tlingit clans, from the mother. */
export const TL_CLANS = "Kiks.ádi, Gaanaxteidí, Lukaax.ádi, Deisheetaan, Kaagwaantaan, Teikweidí, Naanyaa.aayí, Kaach.ádi, Wooshkeetaan, Dakl'aweidí";
export const TL_FAMILY = `
  Shotridge, Peratrovich, Paul, Kadashan, Jackson, Johnson, Dick, James, Nelson, Willard, Bremner, Kookesh, Kito,
  Hope, Dalton, Worl, Jim, Nyman, Austin, Marks, Soboleff, Sheakley`;

/** The four peoples' tables: Cree and Anishinaabe by division and town, Haida and Tlingit clans; family names from 1800 (B4162). */
export const canadaTables = () => [
  ...stagedTables("cree", {men: CE_MEN, women: "", towns: CE_BANDS, family: CE_FAMILY, earlyChurch: false}),
  ...stagedTables("anishinaabe", {men: AN_MEN, women: AN_WOMEN, towns: AN_TOWNS, family: AN_FAMILY, earlyChurch: false}),
  ...stagedTables("haida", {men: HA_MEN, women: "", clans: HA_CLANS, family: HA_FAMILY, earlyChurch: false}),
  ...stagedTables("tlingit", {men: TL_MEN, women: "", clans: TL_CLANS, family: TL_FAMILY, earlyChurch: false})
];
export const CANADA_LABELS = {cree: "Cree (Nehiyawak)", anishinaabe: "Anishinaabe (Ojibwe and Odawa)", haida: "Haida", tlingit: "Tlingit"};
