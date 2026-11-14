/**
 * The Great Basin and the Rockies for the People generator (Creation, B4150 to B4153): the Shoshone (Newe), from the
 * Wind River to the Snake and the Nevada basin, and the Ute (Nuche) of the Colorado and Utah mountains. WoDX's own
 * lists of recorded names; no book text. Picks logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings as the clerks wrote them in English, hyphens dropped): the signers of the Fort Bridger treaties of
 * 1863 and 1868, the Box Elder and Ruby Valley treaties of 1863, the Ute treaties of 1849, 1863 and 1868 and the Brunot
 * agreement of 1873 (Kappler, vol. II); the chiefs in the journals of Lewis and Clark, the Mormon and army records and
 * the Uintah, Ouray, Southern Ute, Wind River and Fort Hall agency records; and the family names of the Shoshone and
 * Ute rolls since. The records hold fewer than 300 names for each people (house reading B4151).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Shoshone own names: the chiefs of the Eastern, Lemhi, Northwestern and Western Shoshone in the records. */
export const SH_MEN = `
  Washakie, Pocatello, Bear Hunter, Sagwitch, Tendoy, Snag, Cameahwait, Pashego, Tahgee, Buffalo Horn, Tyhee,
  Little Soldier, Bazil, Temoak, Black Beard, Wanship, Big Man, Grey Head, Appah`;
export const SH_WOMEN = "Sacagawea";
/** The Shoshone divisions. */
export const SH_BANDS = "the Eastern Shoshone, the Lemhi, the Northwestern Shoshone, the Western Shoshone, the Bannock";
export const SH_FAMILY = `
  Washakie, Tendoy, Timbimboo, Edmo, Teton, St. Clair, Shoyo, Trehero, Enos, Wagon, Wesaw, Large, Bonatsie, Norman,
  Harney, Moose, Appah, Pope, Hill, Brown, Dick, Ottogary, Broncho, Jim, Hanson, Seeley`;

/** Ute own names: the chiefs of the bands from the Uintah basin to the San Juan. */
export const UT_MEN = `
  Ouray, Colorow, Buckskin Charlie, Ignacio, Shavano, Nicaagat, Quinkent, Wakara, Sowiette, Kanosh, Arapeen,
  Antonga, Tabby, Sanpitch, Severo, Kaniache, Guero, Sapinero, Canalla, Antero, Blanco`;
export const UT_WOMEN = "Chipeta";
/** The Ute bands. */
export const UT_BANDS = `
  the Tabeguache, the Uncompahgre, the Weeminuche, the Moache, the Capote, the Yampa, the Parianuche, the Uintah,
  the Timpanogos, the Pahvant, the Sanpete`;
export const UT_FAMILY = `
  Buck, Cuthair, Box, Frost, Baker, Cloud, Atwine, Heart, Wopsock, Cesspooch, Chapoose, Arrowchis, Duncan, Taveapont,
  Mountain, Pinnecoose, Burch, Howe, Knight, Root, Cantsee, Whyte, Santistevan, Watts`;

/** The two peoples' tables: own names and a division or band before 1800, family names after (B4152). */
export const basinTables = () => [
  ...stagedTables("shoshone", {men: SH_MEN, women: SH_WOMEN, towns: SH_BANDS, family: SH_FAMILY, earlyChurch: false}),
  ...stagedTables("ute", {men: UT_MEN, women: UT_WOMEN, towns: UT_BANDS, family: UT_FAMILY, earlyChurch: false})
];
export const BASIN_LABELS = {shoshone: "Shoshone (Newe)", ute: "Ute (Nuche)"};
