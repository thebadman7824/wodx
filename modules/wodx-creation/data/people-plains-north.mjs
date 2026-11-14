/**
 * The northern Plains for the People generator (Creation, B4140 to B4143): the Crow (Apsáalooke) of the Yellowstone,
 * the Blackfoot (Niitsitapi: the Siksika, the Kainai and the Piikani) of the northern plains and the foothills, and
 * the Arapaho (Hinono'eino) between the Platte and the Arkansas. WoDX's own lists of recorded names; no book text.
 * Picks logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings as the clerks wrote them in English, hyphens dropped): the signers of the Fort Laramie treaties
 * of 1851 and 1868, the Lame Bull treaty of 1855, Treaty 7 of 1877 and the Medicine Lodge treaty of 1867 (Kappler,
 * vol. II, and the Canadian treaty texts); the chiefs, scouts and elders in the army and agency records of the Crow,
 * Blackfeet, Blood, Siksika, Wind River and Cheyenne and Arapaho agencies; and the family names of the Crow,
 * Blackfeet, Kainai, Siksika and Arapaho rolls since. Crow clans pass from the mother. The records hold fewer than
 * 300 names for each people (house reading B4141).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Crow own names: the chiefs, scouts and elders of the Mountain and River Crow in the records. */
export const CR_MEN = `
  Plenty Coups, Medicine Crow, Two Leggings, Pretty Eagle, Spotted Horse, Iron Bull, Sits in the Middle of the Land,
  Curley, Hairy Moccasin, Goes Ahead, White Swan, Half Yellow Face, Bear Wolf, Long Hair,
  Rotten Belly, Grandmother's Knife, Bell Rock, Two Belly, Crazy Head, Old Crow, Deaf Bull, Bull Goes Hunting,
  Big Shadow, Young White Buffalo, Bull Nose, Spotted Rabbit, Sees the Living Bull`;
export const CR_WOMEN = "Pretty Shield, Woman Chief, Other Magpie, Kills Good, Pretty Coyote";
/** The Crow clans, from the mother. */
export const CR_CLANS = "Newly Made Lodge, Greasy Mouth, Sore Lip, Big Lodge, Whistling Water, Ties in a Bundle, Bad War Deeds, Piegan Lodge, Thick Lodge";
export const CR_FAMILY = `
  Yellowtail, Real Bird, Old Elk, Medicine Crow, Not Afraid, Bird in Ground, Pretty on Top, Big Day, Takes the Gun,
  Old Coyote, Little Light, Three Irons, Bad Bear, Spotted Horse, Bulltail, Goes Ahead, White Clay, Stops,
  Other Medicine, Stewart, Hogan, Plain Feather, Plenty Hawk, Bends, Morning Gun, Plenty Coups, Half, Deernose`;

/** Blackfoot own names: the chiefs of the Siksika, the Kainai and the Piikani in the treaties and records. */
export const BF_MEN = `
  Crowfoot, Red Crow, Mountain Chief, Heavy Runner, Little Dog, White Calf, Lame Bull, Running Rabbit, Old Sun,
  Bull Head, Eagle Ribs, Many Swans, Big Snake, Three Suns, Big Plume, Little Plume, Running Crane, Wolf Calf,
  Bull Back Fat, Shot on Both Sides, Medicine Calf, Rainy Chief, Bull Turn Round, Calf Shirt, Big Swan, Eagle Tail`;
export const BF_WOMEN = "Running Eagle, Elk Yells in the Water, Calf Robe Woman";
/** The divisions of the Blackfoot Confederacy. */
export const BF_BANDS = "the Siksika, the Kainai, the Piikani, the Amskapi Piikani";
export const BF_FAMILY = `
  Crowfoot, Heavy Runner, Little Dog, Mountain Chief, Running Rabbit, Old Sun, Bull Shields, Many Guns, Wells, Kipp,
  Old Person, Spotted Eagle, Tailfeathers, Weasel Head, Day Chief, Red Crow, Eagle Plume, Healy, Racine,
  Running Crane, Calf Robe, Black Plume, Big Plume, Bear Child, Yellow Horn, Fox, Low Horn, Many Fingers, Wolf Child`;

/** Arapaho own names: the chiefs of the Northern and Southern Arapaho in the treaties and records. */
export const AH_MEN = `
  Little Raven, Left Hand, Black Coal, Sharp Nose, Friday, Medicine Man, Powder Face, Yellow Bear, Big Mouth, Storm,
  Sorrel Horse, Six Feathers, Black Bear, Plenty Bear, White Horse, Spotted Wolf, Heap of Bears, Row of Lodges,
  Lone Bear, Yellow Calf, Scabby Bull, Little Shield, Sitting Bull, Big Head, Crazy Bull, Many Beaver`;
/** The two Arapaho divisions after the 1850s. */
export const AH_BANDS = "the Northern Arapaho, the Southern Arapaho";
export const AH_FAMILY = `
  Black Coal, Sharp Nose, Friday, Spoonhunter, Goggles, Oldman, Shakespeare, Brown, Moss, Wallowing Bull, Lone Bear,
  Yellow Calf, Big Mouth, Hanway, Whiteman, Ridgely, Antelope, Willow, Little Raven, Hail, Bell, Behan, Duran,
  Lonebear, Bearing, Tyler, Littleshield`;

/** The three peoples' tables: Crow clans before 1800, the Blackfoot and Arapaho by division; family names from 1800 (B4142). */
export const plainsNorthTables = () => [
  ...stagedTables("crow", {men: CR_MEN, women: CR_WOMEN, clans: CR_CLANS, family: CR_FAMILY, earlyChurch: false}),
  ...stagedTables("blackfoot", {men: BF_MEN, women: BF_WOMEN, towns: BF_BANDS, family: BF_FAMILY, earlyChurch: false}),
  ...stagedTables("arapaho", {men: AH_MEN, women: "", towns: AH_BANDS, family: AH_FAMILY, earlyChurch: false})
];
export const PLAINS_NORTH_LABELS = {crow: "Crow (Apsáalooke)", blackfoot: "Blackfoot (Niitsitapi)", arapaho: "Arapaho"};
