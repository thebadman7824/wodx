/**
 * Central Africa for the People generator (Creation, B4690 to B4693): the Bakongo of the Kongo kingdom on the lower
 * Congo, the Luba and Lunda of the Katanga and Kasai savanna, and the Baganda of the kingdom of Buganda on Lake
 * Victoria. WoDX's own lists of recorded names; no book text. Picks logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings as the modern Kikongo, Kiluba and Luganda alphabets write them): the kings, nobles and letters of
 * the Kongo court in the Portuguese and Capuchin records from 1483; the king lists and praise histories of the Luba
 * and Lunda; the kabakas, chiefs and martyrs of Buganda in the court histories and the mission records from 1877; and
 * the family names of the Congos, Angola and Uganda since. Kongo clans (kanda) pass from the mother, Ganda clans
 * (ebika) from the father. Kongo nobles took Portuguese church names from the baptism of 1491. The records hold fewer
 * than 300 names for each people (house reading B4691).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Kongo own names: the kings, nobles and commoners of the kingdom. */
export const KO_MEN = `
  Nimi, Nkuwu, Mvemba, Mpanzu, Nkanga, Nlaza, Mbala, Nsaku, Lukeni, Mbemba, Nlandu, Ndombasi, Lutete, Nsimba,
  Mavungu, Kiala, Lukombo, Makiadi, Nzuzi, Masamba, Mabiala, Ngoma, Mpemba, Nsonde, Mbuta, Kinkela, Ngimbi, Vuvu`;
export const KO_WOMEN = "Nzinga, Nkenge, Vita, Luzolo, Nsona, Kiese, Ngudi, Lusala, Mafuta, Nlenvo";
/** The Kongo kanda, from the mother. */
export const KO_CLANS = "Nsaku, Mpanzu, Nzinga, Kimpanzu, Kinlaza, Kinkanga, Kimbala, Nanga";
/** Church given names: Portuguese from the baptism of 1491, French and Portuguese in the 20th century. */
const KO_CHURCH = {male: "Afonso, Pedro, Álvaro, Garcia, Diogo, António, Henrique, Bernardo, Manuel, Francisco, João, Sebastião",
  female: "Ana, Beatriz, Isabel, Leonor, Maria, Catarina, Luísa, Joana, Teresa, Madalena, Inês, Antónia"};
const KO_MODERN = {male: "Joseph, Jean, Pierre, Paul, André, Simon, Antoine, Patrice, Jacques, Albert, Fidèle, Désiré",
  female: "Marie, Thérèse, Joséphine, Bernadette, Pauline, Anne, Jeanne, Béatrice, Monique, Madeleine, Christine, Odette"};
export const KO_FAMILY = `
  Nzuzi, Makiadi, Lutete, Mbemba, Matondo, Nsimba, Mavungu, Luzolo, Kiala, Mpanzu, Ngoma, Malanda, Massamba, Mabiala,
  Nkounkou, Bakala, Tchicaya, Loemba, Mavoungou, Kimbangu, Diangienda, Ntoto, Nlandu, Ndombasi, Kasavubu, Lukombo,
  Nsonde, Mpemba, Mbuta, Nkanga, Zola, Kinkela, Mayala, Ngimbi, Vuvu`;

/** Luba and Lunda own names: the kings of the king lists and the names of the savanna. */
export const LU_MEN = `
  Kongolo, Kalala Ilunga, Ilunga Sungu, Kadilo, Kumwimba Ngombe, Ilunga Kabale, Kasongo Kalombo, Kasongo Nyembo,
  Kabongo, Ilunga Tshibinda, Kanyembo, Kazembe, Mbidi Kiluwe, Kibinda, Kabamba, Kalonji, Mulumba, Ngoie, Kasongo,
  Mukendi, Kazadi, Banza, Numbi, Tshibangu`;
export const LU_WOMEN = "Rweej, Bulanda, Mabela, Ntumba, Mbuyi, Kapinga, Ngalula, Mujinga, Biuma";
/** The Luba and Lunda chiefdoms and courts. */
export const LU_TOWNS = "Kalundwe, Kikondja, Kabongo, Kasongo, Munza, the Upemba, Musumba, the Kasai";
const LU_CHURCH = {male: "Joseph, Jean, Pierre, Paul, Albert, Léon, Victor, Henri, Louis, François, Jacques, Augustin",
  female: "Marie, Thérèse, Anne, Joséphine, Élisabeth, Jeanne, Agnès, Louise, Hélène, Madeleine, Cécile, Monique"};
const LU_MODERN = {male: "Jean, Joseph, Félix, Moïse, Laurent, Étienne, Patrice, Christian, Olivier, Didier, Serge, Fabrice",
  female: "Marie, Chantal, Nathalie, Sylvie, Béatrice, Clarisse, Esther, Grâce, Mireille, Ruth, Sandrine, Jolie"};
export const LU_FAMILY = `
  Ilunga, Kabila, Tshisekedi, Kalonji, Mulumba, Kabongo, Ngoie, Kasongo, Mukendi, Tshibangu, Kanku, Kazadi, Mbuyi,
  Ntumba, Mutombo, Kabeya, Banza, Kalala, Numbi, Kayembe, Lukusa, Mbaya, Mpoyi, Tshimanga, Kabamba, Kalombo,
  Kitenge, Mwamba, Kyungu`;

/** Ganda own names: the kabakas, chiefs and commoners of Buganda. */
export const GA_MEN = `
  Kintu, Chwa, Kimera, Mutesa, Mwanga, Suuna, Kamaanya, Mutebi, Juuko, Kayemba, Tebandeke, Ndawula, Kagulu, Kikulwe,
  Mawanda, Namugala, Kyabaggu, Junju, Semakookiro, Mukasa, Kato, Wasswa, Kizito, Lwanga, Mugerwa, Ssali, Kasozi,
  Kibuuka, Musoke, Kiwanuka`;
export const GA_WOMEN = `
  Nakato, Babirye, Nanteza, Namirembe, Nabukeera, Nakku, Nansubuga, Nalwoga, Nakimuli, Nalubega, Namugga, Nassolo,
  Nakibuuka, Nakayiza`;
/** The Ganda ebika, from the father. */
export const GA_CLANS = "Ngabi, Nkima, Mamba, Ffumbe, Lugave, Nseenene, Mbogo, Ngeye, Nnyonyi, Nkerebwe, Nvubu, Kkobe";
/** Church given names from the missions of 1877, in their Luganda forms, then English. */
const GA_CHURCH = {male: "Daudi, Yosiya, Apolo, Matia, Yakobo, Yowana, Petero, Paulo, Andereya, Kalooli, Yusufu, Nuwa",
  female: "Maliya, Saala, Damali, Esiteri, Yudesi, Luusi, Agnes, Elizabeth, Teresa, Lebeeka, Lidiya, Malyamu"};
const GA_MODERN = {male: "Joseph, Charles, David, Robert, Moses, Samuel, John, Henry, Patrick, Ronald, Ivan, Brian",
  female: "Grace, Sarah, Florence, Margaret, Rose, Juliet, Esther, Harriet, Annet, Prossy, Agnes, Joan"};
export const GA_FAMILY = `
  Mukasa, Ssemakula, Kiwanuka, Kato, Kizito, Lwanga, Mugerwa, Nsubuga, Ssali, Kasozi, Mulumba, Kibuuka, Sekabira,
  Wasswa, Musoke, Ssekandi, Kagwa, Nsibambi, Mpanga, Kawalya, Ssebunya, Lule, Kintu, Mutebi, Ssempala, Kabuye, Mayanja`;

/** The three peoples' tables: Kongo church names from 1491, Luba and Ganda after 1800; family names from 1800 (B4692). */
export const centralAfricaTables = () => [
  ...stagedTables("kongo", {men: KO_MEN, women: KO_WOMEN, clans: KO_CLANS, church: KO_CHURCH, modern: KO_MODERN, family: KO_FAMILY}),
  ...stagedTables("luba", {men: LU_MEN, women: LU_WOMEN, towns: LU_TOWNS, church: LU_CHURCH, modern: LU_MODERN, family: LU_FAMILY, earlyChurch: false}),
  ...stagedTables("ganda", {men: GA_MEN, women: GA_WOMEN, clans: GA_CLANS, church: GA_CHURCH, modern: GA_MODERN, family: GA_FAMILY, earlyChurch: false})
];
export const CENTRAL_AFRICA_LABELS = {kongo: "Bakongo (the Kongo kingdom)", luba: "Luba and Lunda", ganda: "Baganda (Buganda)"};
