/**
 * The Plains peoples for the People generator (Creation, B3820 to B3824): the Oceti Sakowin (Lakota, Dakota and
 * Nakota), the Cheyenne, the Comanche and the Kiowa. WoDX's own lists of recorded names; no book text. Built to the
 * same plan Ben picked for the Haudenosaunee and the Algonquian coast (B3120, B3510): recorded names with the famous
 * included, names staged by age, women named by band where the records give no name, and the American West held by
 * these peoples before the Spanish and as a share after. Picks logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings as the agency clerks and treaty commissioners printed them, hyphens dropped): the signers of the
 * Fort Laramie (1851, 1868), Fort Sully (1865), Medicine Lodge (1867), Little Arkansas (1865) and Traverse des Sioux
 * (1851) treaties in Kappler, Indian Affairs: Laws and Treaties, vol. II; the Pine Ridge, Rosebud, Standing Rock,
 * Cheyenne River, Tongue River and Kiowa-Comanche-Apache agency rolls; the Fort Marion prisoners of 1875; and leaders
 * known from army and agency records. The Lakota names are given as the clerks translated them, with some of the
 * best known also in Lakota. Only the Oceti Sakowin reach 300 names; the records hold fewer for the others (house
 * reading B3821).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Oceti Sakowin men's own names, every age before family names. */
export const OS_MEN = `
  Red Cloud, Spotted Tail, Sitting Bull, Crazy Horse, Gall, Rain in the Face, Crow King, Hump, Kicking Bear, Short Bull,
  Spotted Elk, Big Foot, Black Elk, Lone Horn, Touch the Clouds, Little Big Man, American Horse, Iron Shell, Swift Bear,
  Red Leaf, Big Mouth, Two Strike, Crow Dog, Hollow Horn Bear, Little Wound, Low Dog, Iron Hawk, Black Moon, Four Horns,
  Running Antelope, Bear's Rib, Long Mandan, Iron Nation, Big Road, Red Dog, Blue Horse, Little Hawk, Black Twin,
  No Water, Black Fox, Yellow Bear, Sword, Fast Thunder, Red Shirt, Lone Man, Jumping Bull, One Bull, White Bull,
  Bull Head, Shave Head, Red Tomahawk, Catch the Bear, Strikes the Kettle, Black Bird, Iron Thunder, Grass, Mad Bear,
  Big Head, Gray Eagle, Fire Thunder, Kills Enemy, Standing Bear, Plenty Horses, Good Thunder, Kicking Horse,
  Turning Hawk, Big Turkey, Black Crow, Crow Eagle, Spotted Horse, Little Thunder, Conquering Bear, Iron Horn,
  Red Horse, Flying Hawk, Kills Two, Bad Heart Bull, White Swan, White Thunder, Hollow Horn, Big Crow, Charging Bear,
  Lame Deer, Brave Bear, Black Shield, Long Dog, Running Hawk, Red Bear, Yellow Hair, Iron Crow, Black Hawk,
  Little Bear, Big Ribs, Lone Dog, Brown Hat, Long Soldier, Kills Above, High Hawk, Black Thunder, No Flesh, Red Owl,
  Bear Robe, Many Horses, Calico, Afraid of Bear, Big Bear, Iron Bull, Elk Head, Thunder Hawk, Spotted Eagle,
  Bull Eagle, Stands First, Looking Horse, Kills Plenty, Brings Plenty, Bear Shield, Spotted Bear, Eagle Elk,
  Iron Tail, Iron Hail, Horn Cloud, Kills Crow, Crow Foot, Black Wolf, Kills Thunder, Hard Heart, Sorrel Horse,
  Long Bull, White Hawk, Black Coyote, Yellow Bird, Big Owl, Little Soldier, Two Elk, Hairy Bear, Long Fox,
  Spotted Owl, Has No Horses, Iron Cloud, Two Bulls, Brave Heart, Yellow Hawk, Bear Runner, Poor Bear, Two Crow,
  Fast Horse, White Plume, Ten Fingers, Bull Bear, Black Feather, Eagle Bull, Running Horse, Holy Eagle, One Feather,
  Iron Lightning, Swift Hawk, Swift Bird, Lone Hill, Charging Crow, Ghost Bear, Plenty Wolf, Pretty Bird, Comes Last,
  Good Shield, Last Horse, Jumping Eagle, Blue Bird, Lone Eagle, Thin Elk, Under Baggage, Whirlwind Horse,
  Shot With Two Arrows, Pumpkin Seed, Kills Small, Ghost Dog, Bad Wound, Long Wolf, Two Lance, Little Crow, Wabasha,
  Shakopee, Red Wing, Big Eagle, Mankato, Inkpaduta, Cut Nose, Wakute, Red Iron, Standing Buffalo, Sleepy Eye,
  Other Day, Medicine Bottle, Little Six, Traveling Hail, Red Legs, White Dog, Cloud Man, Big Thunder, Good Road,
  Rattling Runner, Struck by the Ree, Smutty Bear, War Eagle, Mahpiya Luta, Tatanka Iyotake, Tasunke Witko,
  Sinte Gleska, Pizi, Hehaka Sapa, Wanbli Gleska, Tatanka Ska, Mato Nupa, Ite Omagaju, Sunka Bloka, Wakinyan Cikala,
  Mato Wayuhi, Ohiyesa, Taoyateduta, Wapahasha, Red Feather, Worm, Black Buffalo, Crow Feather, Black Bull, Long Holy,
  Red Hawk, Good Weasel, Holy Rock, White Lance, Horned Horse, Rocky Bear, Blue Cloud, Iron Wing`;
/** Oceti Sakowin women's own names in the records. */
export const OS_WOMEN = `
  Black Shawl, Rattling Blanket Woman, Moving Robe Woman, Pretty Owl, Four Robes, Seen by the Nation, Good Feather,
  Twin Woman, Red Bird, Zitkala Sa, Walks First, Corn Woman, White Cow Woman, Red Hawk Woman, Holy Woman,
  Pretty Feather, Comes Out Holy, Elk Woman, Black Buffalo Woman`;
/** The bands of the Seven Council Fires, for a woman whose name was not written down. */
export const OS_BANDS = "the Oglala, the Sicangu, the Hunkpapa, the Mnicoujou, the Itazipco, the Oohenunpa, the Sihasapa, the Mdewakanton, the Wahpeton, the Wahpekute, the Sisseton, the Yankton, the Yanktonai";
/** Family names on the Pine Ridge, Rosebud, Standing Rock and Cheyenne River rolls and since. */
export const OS_FAMILY = `
  Red Cloud, American Horse, Spotted Tail, Iron Cloud, Two Bulls, Brave Heart, Black Bear, Yellow Hawk, Kills Crow,
  Bear Runner, Red Owl, Poor Bear, Little Thunder, Iron Shell, Two Crow, Black Elk, Standing Bear, Looking Horse,
  Fast Horse, Long Soldier, Means, Two Two, White Plume, Yellow Bird, High Hawk, Kills Enemy, Little Hawk, White Face,
  Ten Fingers, Bad Heart Bull, Bull Bear, Thunder Hawk, Fire Thunder, Black Feather, Big Crow, Eagle Bull, Crow Dog,
  Two Strike, Hollow Horn, Running Horse, Afraid of Bear, Holy Eagle, Little Wound, White Bull, One Feather, Grass,
  Brings Plenty, Kills Plenty, Iron Lightning, Swift Hawk, Swift Bird, Lone Hill, Red Bear, Charging Crow, Ghost Bear,
  Plenty Wolf, Pretty Bird, Comes Last, Good Shield, Last Horse, Jumping Eagle, Blue Bird, Lone Eagle, Thin Elk,
  Under Baggage, Whirlwind Horse, Has No Horses, Pumpkin Seed, Kills Small, Ghost Dog, Bad Wound, Spotted Bear,
  Gray Eagle, Long Wolf, Two Lance, Clifford, Janis, Pourier, Richard, Mousseau, Bordeaux, Cuny, Twiss, Ecoffey,
  Giago, DeCory, Roubideaux, Bissonette, Mesteth, Rouillard, Garnier, Renville, Deloria, Eastman, Frazier, LaPointe`;

/** Cheyenne men. */
export const CH_MEN = `
  Black Kettle, Dull Knife, Morning Star, Little Wolf, Roman Nose, Tall Bull, Two Moons, White Antelope, Lean Bear,
  Yellow Wolf, Bull Bear, Little Robe, Wolf Robe, Stone Calf, Lame White Man, Ice, Little Chief, Whirlwind,
  Old Whirlwind, Big Jake, Starving Elk, Sand Hill, Spotted Wolf, Crazy Mule, Brave Wolf, White Shield, Tangle Hair,
  Wild Hog, Wooden Leg, High Backed Wolf, Yellow Nose, Last Bull, Box Elder, Black Moccasin, Bull Hump, White Horse,
  Gray Beard, Medicine Arrows, War Bonnet, One Eye, Standing in the Water, Little Rock, Black Wolf, Old Bear,
  Lone Bear, Big Wolf, Little Coyote, Bobtail, Big Horse, Red Moon, Medicine Water, Porcupine, Howling Wolf,
  Making Medicine, Bear's Heart, Cohoe, Little Finger Nail, Buffalo Meat, Elk River, American Horse, Big Beaver,
  Medicine Bear, Leg in the Water, Minimic, Heap of Birds, Whistling Elk, Little Shield, Iron Shirt, Motavato,
  Vooheheve, Ohcumgache, Woquini`;
export const CH_WOMEN = "Buffalo Calf Road Woman, Antelope Woman, Medicine Woman Later, Mochi, Iron Teeth, Monahsetah, Yellow Woman";
/** The Cheyenne bands and the Dog Soldiers. */
export const CH_BANDS = "the Omisis, the Hevhaitaneo, the Wotapio, the Oivimana, the Hisiometaneo, the Heviqsnipahis, the Suhtai, the Masikota, the Dog Soldiers";
/** Family names of the Northern Cheyenne at Lame Deer and the Southern Cheyenne in Oklahoma. */
export const CH_FAMILY = `
  Little Wolf, Two Moons, Wooden Legs, Spotted Wolf, Tall Bull, Whiteman, Bearchum, Fisher, Spang, Littlebear, Limpy,
  Rockroads, Small, Killsnight, Old Mouse, Shoulderblade, Hollowbreast, Roundstone, Elkshoulder, Strangeowl, Sooktis,
  Stands In Timber, Bearquiver, Highwalker, Wolfblack, Redbird, Bigback, Red Hat, Bull Coming, Whitebird, Black Owl,
  Bighorse, Hart, Little Chief, Youngbear, Starr, Wilson`;

/** Comanche men. */
export const CO_MEN = `
  Quanah, Ten Bears, Paruasemena, Iron Jacket, Buffalo Hump, Potsanaquahip, Peta Nocona, Isatai, Mowway, Tosawi,
  Horseback, Tabananica, Wild Horse, Big Red Meat, White Wolf, Mopechucope, Old Owl, Pahayuco, Santa Anna, Ketumsee,
  Sanaco, Yellow Wolf, Esihabit, Asa Havey, Cuerno Verde, Ecueracapa, Toroblanco, Pisinampe, Mukwooru, Black Horse,
  Cheevers, Tabequena`;
export const CO_WOMEN = "Naudah, Topsannah, Weckeah, Tonarcy, Chony";
/** The Comanche divisions. */
export const CO_BANDS = "the Penateka, the Nokoni, the Kotsoteka, the Yamparika, the Quahada, the Tenawa, the Jupe";
/** Comanche family names in Oklahoma since allotment. */
export const CO_FAMILY = `
  Parker, Tahmahkera, Tabbytite, Mahsetky, Wermy, Nahwooksy, Tosee, Pohocsucut, Kassanavoid, Chibitty, Atchavit,
  Pewewardy, Tabbytosavit, Kerchee, Wahnee, Saupitty, Niyah, Wockmetooah, Paddyaker, Poafpybitty, Monetatchi,
  Tahdooahnippah, Yackeyonny, Mihecoby, Komahcheet, Asenap, Ototivo, Weryackwe, Codopony, Tooahnippah`;

/** Kiowa men. */
export const KI_MEN = `
  Satanta, White Bear, Satank, Sitting Bear, Lone Wolf, Guipago, Kicking Bird, Big Bow, Big Tree, Stumbling Bear,
  Dohasan, Little Mountain, White Horse, Woman's Heart, Mamanti, Sky Walker, Heap of Bears, Poor Buffalo, Sun Boy,
  Silver Horn, Haungooah, Ohettoint, Etahdleuh, Zotom, Wohaw, Tohausen, Settan, Anko, Eagle Heart, Black Eagle,
  Frizzlehead, Hunting Horse, Gotebo, Apiatan, Wooden Lance`;
/** The Kiowa bands. */
export const KI_BANDS = "the Kata, the Kogui, the Kaigwu, the Kingep, the Kongtalyui, the Semat";
/** Kiowa family names in Oklahoma since allotment. */
export const KI_FAMILY = `
  Tsatoke, Hokeah, Asah, Mopope, Auchiah, Palmer, Momaday, Poolaw, Ahtone, Tointigh, Zotigh, Cozad, Toyebo, Keahbone,
  Big Bow, Lonewolf, Silverhorn, Tsoodle, Kaulaity, Quoetone, Paddlety, Domebo, Botone, Haumpy, Tahbone, Saunkeah,
  Bointy, Geimausaddle, Satepauhoodle, Chaletsin`;

/** The four peoples' tables: own names and band bynames until 1800, church given names and family names after (B3822). */
export const plainsTables = () => [
  ...stagedTables("lakota", {men: OS_MEN, women: OS_WOMEN, towns: OS_BANDS, family: OS_FAMILY, earlyChurch: false}),
  ...stagedTables("cheyenne", {men: CH_MEN, women: CH_WOMEN, towns: CH_BANDS, family: CH_FAMILY, earlyChurch: false}),
  ...stagedTables("comanche", {men: CO_MEN, women: CO_WOMEN, towns: CO_BANDS, family: CO_FAMILY, earlyChurch: false}),
  ...stagedTables("kiowa", {men: KI_MEN, women: "", towns: KI_BANDS, family: KI_FAMILY, earlyChurch: false})
];
/** The players' words for each people (lifepath drill-down). */
export const PLAINS_LABELS = {lakota: "Lakota, Dakota and Nakota", cheyenne: "Cheyenne", comanche: "Comanche", kiowa: "Kiowa"};
