/**
 * The Taíno for the People generator (Creation, B4660 to B4663): the island Arawak people of Quisqueya (Hispaniola),
 * Borikén (Puerto Rico), Cuba and Xaymaca (Jamaica), the people Columbus met in 1492. WoDX's own lists of recorded
 * names; no book text. Picks logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings as the Spanish chroniclers wrote them, accents kept): the caciques and cacicas in Columbus's
 * journal, Pané's account of the Taíno beliefs (1498), Las Casas, Oviedo and Peter Martyr; the encomienda and
 * baptism records of Hispaniola and Puerto Rico; and the Spanish family names the baptised Taíno took. Before the
 * conquest a person is known by the cacicazgo, the chiefdom; the records hold fewer than 300 names (house reading
 * B4661).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Taíno own names: the caciques of the islands in the chronicles. */
export const TA_MEN = `
  Guacanagarí, Caonabo, Bohechío, Guarionex, Mayobanex, Cotubanamá, Hatuey, Agüeybaná, Guaybaná, Urayoán, Hayuya,
  Mabodomaca, Jumacao, Daguao, Guarocuya, Tamayo, Cayacoa, Manicaotex, Guamá, Habaguanex, Orocobix, Caguax,
  Canóbana, Comerío, Abacoa`;
/** Taíno own names of women: the cacicas in the chronicles. */
export const TA_WOMEN = "Anacaona, Yuisa, Higüamota, Casiguaya, Onaney, Guanina";
/** The cacicazgos, the chiefdoms of the islands. */
export const TA_TOWNS = "Marién, Maguá, Maguana, Jaragua, Higüey, Borikén, Cubanacán, Xaymaca, Baracoa, Bayamo";
/** Church given names at baptism from 1493. */
const TA_CHURCH = {male: "Juan, Pedro, Francisco, Diego, Alonso, Hernando, Cristóbal, Andrés, Enrique, Gonzalo, Luis, Martín",
  female: "María, Juana, Isabel, Catalina, Ana, Inés, Luisa, Mencía, Leonor, Beatriz, Francisca, Elvira"};
const TA_MODERN = {male: "José, Juan, Luis, Carlos, Miguel, Ángel, Jorge, Manuel, Rafael, Ramón, Pedro, Antonio",
  female: "María, Carmen, Ana, Rosa, Luz, Isabel, Milagros, Nilda, Gloria, Juana, Teresa, Ivelisse"};
/** Family names: the Spanish names of the baptised and their heirs in the hill towns. */
export const TA_FAMILY = `
  Rojas, Rodríguez, Martín, Hernández, Ramos, Colón, Velázquez, Ponce, Guzmán, Mercado, Rivera, Ortiz, Torres,
  Vázquez, Sánchez, Rosario, Cruz, Santiago, Pérez, Flores, Medina, Díaz, Morales, Reyes, Matos, Borrero,
  Jiménez, Peña`;

/** The Taíno tables: own names before 1492, church names at baptism from 1493, family names after (B4662). */
export const tainoTables = () => stagedTables("taino", {men: TA_MEN, women: TA_WOMEN, towns: TA_TOWNS, church: TA_CHURCH, modern: TA_MODERN, family: TA_FAMILY});
export const TAINO_LABELS = {taino: "Taíno"};
