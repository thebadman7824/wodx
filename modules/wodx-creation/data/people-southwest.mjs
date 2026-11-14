/**
 * The peoples of the Southwest for the People generator (Creation, B3930 to B3934): the Pueblos (the Hopi mesas,
 * Zuni and the Rio Grande towns), the Diné and the Apache. WoDX's own lists of recorded names; no book text. Picks
 * logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings as printed, hyphens dropped): the leaders of the Pueblo Revolt of 1680 in the Spanish
 * depositions; the Hopi and Zuni leaders in the agency and Bureau of Ethnology records; the Diné signers of the
 * treaties of 1849 and 1868 (Kappler, vol. II) and the headmen of the Long Walk; the Chiricahua, Mescalero, Western
 * and Jicarilla Apache leaders in the army and agency records; and the family names of the Hopi, Zuni, Rio Grande,
 * Navajo and Apache rolls since. Clans pass from the mother for the Hopi and the Diné. The records hold fewer than 300
 * names for each people (house reading B3931).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Pueblo own names: the Hopi, Zuni and Rio Grande leaders in the records. */
export const PU_MEN = `
  Popay, Tupatu, Catua, Omtua, Jaca, Catiti, Saca, Lololma, Tewaquaptewa, Yukioma, Lomahongyoma, Talayesva,
  Honanie, Masayesva, Palowahtiwa, Nayuchi, Laiiuahtsailunk, Sekaquaptewa`;
export const PU_WOMEN = "Nampeyo, Polingaysi, Weʼwha, Poveka, Povi";
/** The Hopi clans, from the mother. */
export const PU_CLANS = "Bear, Badger, Spider, Snake, Sun, Water, Corn, Parrot, Tobacco, Bow, Eagle, Coyote, Reed, Sand, Fire, Greasewood";
/** Family names of the Hopi, Zuni and Rio Grande pueblos since the 19th century. */
export const PU_FAMILY = `
  Kabotie, Sekaquaptewa, Masayesva, Honanie, Nuvamsa, Talayumptewa, Lomayestewa, Qoyawayma, Kuwanwisiwma, Namingha,
  Lomahaftewa, Poleyestewa, Honyaktewa, Cheama, Lahaleon, Quam, Laate, Sheyka, Tsethlikai, Naranjo, Tafoya,
  Gutierrez, Martinez, Romero, Lujan, Concha, Suazo, Trujillo, Chavarria, Aguilar, Lovato, Calabaza, Tenorio, Toledo,
  Shije, Chinana, Herrera, Atencio, Archuleta, Garcia, Sando, Velarde`;
/** Church given names on the mission rolls from 1598. */
const PU_CHURCH = {male: "Juan, Pedro, Francisco, Diego, Antonio, José, Domingo, Luis, Alonso, Bartolomé, Cristóbal, Esteban",
  female: "María, Juana, Ana, Catalina, Josefa, Manuela, Rosa, Lucía, Inés, Francisca, Teresa, Isabel"};
const PU_MODERN = {male: "Juan, José, Joseph, Fred, Charles, Leonard, Robert, Peter, Thomas, Michael, Raymond, Daniel",
  female: "Maria, Mary, Rose, Helen, Dextra, Lucy, Margaret, Josephine, Elizabeth, Ruth, Grace, Linda"};

/** Diné own names: the headmen of 1849 to 1868, as the clerks wrote them (most were Spanish bynames). */
export const DI_MEN = `
  Barboncito, Manuelito, Armijo, Ganado Mucho, Delgadito, Largo, Herrera, Torivio, Narbona, Zarcillos Largos,
  Cayetanito, Muerto de Hombre, Hombro, Narbona Segundo, Chiquito, Sandoval, Cabras Blancas, Aguila Negra,
  Hastiin Chil Haajini, Hashke Naabah, Hastiin Daghaa, Totsohnii Hastiin, Hoskininni,
  Peshlakai, Tsinajinnie, Atsidi Sani, Hosteen Klah`;
export const DI_WOMEN = "Juanita, Asdzaan Tlogi, Asdzaan Naakaii, Asdzaan Lichii, Asdzaan Tsosie, Asdzaan Yazhi";
/** Diné clans, from the mother, in English as they are often given. */
export const DI_CLANS = `
  Towering House, Bitter Water, Red Running into the Water, Water Flows Together, One Walks Around, Many Goats,
  Black Streaked Wood, Coyote Pass, Mexican People, Water's Edge, Salt, Honeycombed Rock, Mud, Start of the Red Streak,
  Sleeping Rock, Red House, Red Bottom, Deer Spring, Meadow, Tobacco People`;
export const DI_FAMILY = `
  Begay, Yazzie, Benally, Tsosie, Nez, Begaye, Bitsui, Etsitty, Manygoats, Tso, Harvey, Chee, Shorty, Atcitty,
  Yellowhorse, Largo, Peshlakai, Tsinajinnie, Skeet, Kinlicheenie, Bedonie, Lee, Long, Silversmith, Claw, Deschenie,
  Hosteen, Joe, Sandoval, Platero, Gorman, Nakai, Dodge, Begody, Watchman, Zah, Whitehorse, Yazhe, Manuelito, Charley`;

/** Apache own names: the Chiricahua, Mescalero, Western and Jicarilla leaders in the records. */
export const AP_MEN = `
  Mangas Coloradas, Cochise, Victorio, Goyaale, Geronimo, Juh, Naiche, Chihuahua, Nana, Loco, Mangas, Taza, Chatto,
  Alchesay, Eskiminzin, Diablo, Pedro, Nolgee, Cuchillo Negro, Ponce, Baishan, Bonito, Ulzana, Massai, Kaytennae,
  Mahko, Santana, Cadete, Magoosh, Gordo, Chacon, Lobo Blanco, Huero, San Juan`;
export const AP_WOMEN = "Lozen, Dahteste, Ishton, Alope, Siki, Gouyen";
/** The Apache bands. */
export const AP_BANDS = "the Chihenne, the Chokonen, the Bedonkohe, the Nednhi, the Mescalero, the Jicarilla, the White Mountain, the Cibecue, the San Carlos, the Tonto, the Lipan";
export const AP_FAMILY = `
  Kaywaykla, Naiche, Geronimo, Kenoi, Kayitah, Martine, Gooday, Enjady, Klinekole, Magoosh, Tortilla, Chino, Baca,
  Lupe, Altaha, Endfield, Dosela, Declay, Kitcheyan, Nosie, Hinton, Eskiminzin, Chee, Velarde, Vigil, Kozine, Kazhe`;

/** The three peoples' tables: Pueblos with church names from 1598, the Diné and Apache from 1800 (B3932). */
export const southwestTables = () => [
  ...stagedTables("pueblo", {men: PU_MEN, women: PU_WOMEN, clans: PU_CLANS, church: PU_CHURCH, modern: PU_MODERN, family: PU_FAMILY}),
  ...stagedTables("dine", {men: DI_MEN, women: DI_WOMEN, clans: DI_CLANS, family: DI_FAMILY, earlyChurch: false}),
  ...stagedTables("apache", {men: AP_MEN, women: AP_WOMEN, towns: AP_BANDS, family: AP_FAMILY, earlyChurch: false})
];
export const SOUTHWEST_LABELS = {pueblo: "Pueblo (the Hopi, Zuni and the Rio Grande)", dine: "Diné (Navajo)", apache: "Apache"};
