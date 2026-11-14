/**
 * The village peoples of the Missouri for the People generator (Creation, B4130 to B4133): the Mandan, the Hidatsa
 * and the Arikara of the upper Missouri, and the Pawnee of the Platte and the Loup. Earth-lodge farmers of corn,
 * beans and squash who hunted the buffalo each winter. WoDX's own lists of recorded names; no book text. The WoD
 * books hold no names for these peoples (one Mandan chief, Four Bears), so the lists come from the historical
 * record. Picks logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings as the clerks and painters wrote them in English, hyphens dropped): the signers of the treaties
 * of 1825 with the Mandan, the Minitari (Hidatsa) and the Arikara and of 1833, 1848 and 1857 with the Pawnee (Kappler,
 * vol. II); the sitters painted by Catlin (1832) and Bodmer (1833 and 1834); the chiefs and scouts in the journals of
 * Lewis and Clark and the agency and army records of Fort Berthold and the Pawnee agency; and the family names of
 * the Fort Berthold (Three Affiliated Tribes) and Pawnee rolls since. Women are seldom named in the records, so the
 * lists are short and a woman is often named by her village. The records hold fewer than 300 names for each people
 * (house reading B4131).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Mandan own names: Four Bears, Big White, Black Cat and the chiefs and elders of the records. */
export const MA_MEN = `
  Four Bears, Big White, Black Cat, Little Raven, Red Shield, Wolf Chief, Crow's Heart, Bad Gun, Red Cow, Big Man,
  Coal, Raven Chief, Black Bear, Running Face, Bear on the Flat, White Buffalo, Old Bear, Mouse Colored Feather,
  Red Buffalo, Two Ravens, Buffalo Bull, Yellow Bear`;
export const MA_WOMEN = "Scattered Corn, Yellow Corn, Calf Woman, Brown Woman, Mink Woman";
/** The Mandan villages on the Heart River and the Knife, then Like-a-Fishhook. */
export const MA_VILLAGES = "On-a-Slant, Double Ditch, Mitutanka, Ruptare, Nuptadi, Like-a-Fishhook";
export const MA_FAMILY = `
  Fox, Baker, Crows Heart, Young Bird, Bird Bear, Wolf, Little Owl, Bears Arm, Mandan, Good Bird, White Calf,
  Spotted Bear, Sitting Crow, Bearstail, Red Fox, Chase, Hall, Wells, Bell, Four Bears, Driver, Black Hawk, Brady,
  Young Bear, Running Face`;

/** Hidatsa own names: the Minitari of the Knife River villages and Fort Berthold. */
export const HI_MEN = `
  Le Borgne, Road Maker, Two Crows, Crow Flies High, Poor Wolf, Small Ankle, Big Cloud, Hairy Coat, Goodbird, Old Dog,
  Wolf Chief, Son of a Star, Big Bird, Bears Arm, Lean Bear, Crow's Paunch, Red Kettle, White Duck, Young Wolf,
  Many Growths, Butterfly, Black Moccasin, Yellow Shirt, Blackfoot Bull`;
export const HI_WOMEN = "Buffalo Bird Woman, Red Blossom, Otter Woman, Turtle Woman, Owl Woman";
/** The Hidatsa villages on the Knife River, then Like-a-Fishhook and the Crow Flies High village. */
export const HI_VILLAGES = "Big Hidatsa, Awatixa, Awaxawi, Like-a-Fishhook, the Crow Flies High village";
export const HI_FAMILY = `
  Goodbird, Wolf Chief, Two Crows, Lone Fight, Old Dog, Bears Arm, Fredericks, Packineau, Danks, Hale, Morsette,
  Driver, Hall, Baker, Fox, Poitra, Mason, Grinnell, Crows Breast, Sitting Bear, Small Ankle, Young Wolf, Johnson,
  Wilkinson, Smith`;

/** Arikara own names: the chiefs of the Grand River villages and the scouts of Fort Berthold. */
export const AR_MEN = `
  Bloody Hand, White Shield, Son of the Star, Star, Bloody Knife, Bobtailed Bull, Young Hawk, Red Bear, Forked Horn,
  Little Brave, Soldier, Goose, Red Star, Strikes Two, Bear's Belly, Enemy Heart, Black Fox, Running Wolf, Grey Eagle,
  Lone Chief, Two Bears, Crow Bull`;
/** The Arikara villages: on the Grand River, then Star Village at Fort Berthold. */
export const AR_VILLAGES = "the Grand River villages, the Cheyenne River villages, the Leavenworth villages, Like-a-Fishhook, Star Village";
export const AR_FAMILY = `
  Plenty Chief, Red Star, Yellow Bird, Bears Tail, Young Hawk, Strikes Enemy, White Bear, Bear Chief, Howard, Walker,
  Chase, Gillette, Black Hawk, Sage, Reed, Cross, Hopkins, Bears Belly, Little Soldier, Paint, Young Bear, Dancing Bull`;

/** Pawnee own names: the chiefs of the four bands in the treaties and records. */
export const PA_MEN = `
  Petalesharo, Sharitarish, Knife Chief, Man Chief, Lone Chief, Sky Chief, Big Spotted Horse, Eagle Chief,
  White Eagle, Curly Chief, Brave Chief, Big Axe, Spotted Horse, Good Chief, Fighting Bear, Night Chief, Big Bear,
  Sun Chief, Young Eagle, Little Hawk, Crooked Hand, Big Elk, Antelope, Rattlesnake`;
/** The four Pawnee bands. */
export const PA_BANDS = "the Chawi, the Kitkahahki, the Pitahawirata, the Skidi";
export const PA_FAMILY = `
  Echohawk, Pratt, Chapman, Riding In, Moore, Rice, Roberts, Eppler, Horsechief, Shields, Knife Chief, Leading Fox,
  Howell, Murie, Esau, Peters, Gover, Taylor, Goodfox, Sun Eagle, Little Sun, Washington, Jake, Morris, Blaine,
  White Horse, Matlock, Mathews, Spotted Horse, Box, Adson`;

/** The four peoples' tables: own names and a village or band before 1800, church given names and family names after (B4132). */
export const missouriTables = () => [
  ...stagedTables("mandan", {men: MA_MEN, women: MA_WOMEN, towns: MA_VILLAGES, family: MA_FAMILY, earlyChurch: false}),
  ...stagedTables("hidatsa", {men: HI_MEN, women: HI_WOMEN, towns: HI_VILLAGES, family: HI_FAMILY, earlyChurch: false}),
  ...stagedTables("arikara", {men: AR_MEN, women: "", towns: AR_VILLAGES, family: AR_FAMILY, earlyChurch: false}),
  ...stagedTables("pawnee", {men: PA_MEN, women: "", towns: PA_BANDS, family: PA_FAMILY, earlyChurch: false})
];
export const MISSOURI_LABELS = {mandan: "Mandan", hidatsa: "Hidatsa", arikara: "Arikara", pawnee: "Pawnee"};
