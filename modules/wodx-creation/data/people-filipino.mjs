/**
 * Filipinos for the People generator (Creation, B4750 to B4753): the Tagalog, Visayan and Ilocano peoples of the
 * islands, from the barangays of Tondo, Maynila and Sugbu to the Spanish towns and the Republic. WoDX's own lists of
 * recorded names; no book text. Picks logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings as the Spanish chroniclers and the modern records write them): the datus, rajahs and their
 * households in Pigafetta's account of 1521, Legazpi's letters and the chronicles of the conquest of Manila (1570 to
 * 1571), and the baptism records after; the Spanish family names of the Clavería catalogue of 1849 and the native
 * names kept since. Before the Spanish a person is known by the barangay or the domain; the records hold fewer than
 * 300 names (house reading B4751).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Own names: the datus and rajahs of the islands and their people in the chronicles. */
export const FI_MEN = `
  Lapulapu, Humabon, Sulayman, Lakandula, Tupas, Sikatuna, Dagami, Bankaw, Ache, Tarik, Pagbuaya, Lumay, Batumbakal,
  Matanda, Kolambu, Siaui, Zula, Kalang, Magat, Salamat, Dula, Tamblot, Sumuroy, Dagohoy, Kudarat, Dimasangcay,
  Mangubat`;
export const FI_WOMEN = "Humamay, Kalangitan, Urduja, Sima, Ningning, Mutya, Amihan, Tala, Dalisay, Liwayway";
/** The barangays and domains of the islands. */
export const FI_TOWNS = "Tondo, Maynila, Sugbu, Butuan, Mactan, Panay, Bohol, Sulu, Maguindanao, Ilocos, Pangasinan, Samar";
/** Church given names at baptism from 1565, then the Spanish and American given names. */
const FI_CHURCH = {male: "Juan, Pedro, Francisco, Agustín, Andrés, Domingo, Felipe, Diego, Martín, Gaspar, Nicolás, Tomás",
  female: "María, Juana, Catalina, Ana, Isabel, Magdalena, Inés, Luisa, Agustina, Francisca, Gregoria, Melchora"};
const FI_MODERN = {male: "José, Juan, Antonio, Manuel, Ramon, Ricardo, Eduardo, Rodrigo, Benigno, Ferdinand, Jose Maria, Emilio",
  female: "Maria, Rosario, Teresita, Corazon, Imelda, Leonor, Lourdes, Gloria, Remedios, Josefina, Luzviminda, Marites"};
/** Family names: the Clavería catalogue and the native names kept. */
export const FI_FAMILY = `
  Santos, Reyes, Cruz, Bautista, Garcia, Mendoza, Torres, Flores, Villanueva, Ramos, Aquino, Castillo, Rivera,
  Navarro, Dela Cruz, Del Rosario, Mercado, Salazar, Pascual, Domingo, Soriano, Magsaysay, Macapagal, Dimaculangan,
  Mabini, Lacson, Tolentino, Panganiban, Agoncillo, Malvar, Silang, Bonifacio, Lumbera, Makalintal, Dimaano, Manalo,
  Dumalagan, Lacuna`;

/** The tables: own names before 1565, church names after, family names from 1800 (B4752). */
export const filipinoTables = () => stagedTables("filipino", {men: FI_MEN, women: FI_WOMEN, towns: FI_TOWNS, church: FI_CHURCH, modern: FI_MODERN, family: FI_FAMILY});
export const FILIPINO_LABELS = {filipino: "Filipinos (Tagalog, Visayan, Ilocano)"};
