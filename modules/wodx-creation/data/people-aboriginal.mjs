/**
 * Aboriginal Australians for the People generator (Creation, B4680 to B4683): the many nations of the continent and
 * of Lutruwita (Tasmania), on their country long before 1197. WoDX's own lists of recorded names; no book text. Picks
 * logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings as the colonial journals wrote them): the people of Sydney Cove and the Hawkesbury in the
 * journals of Phillip, Tench, Collins and Dawes (1788 to 1792); the leaders of the frontier wars and of the
 * Kulin, Noongar, Palawa and Wiradjuri in the colonial and protectorate records; and the family names of the
 * missions, the stations and the central desert since. A person before the colonies is known by the nation; the
 * records hold fewer than 300 names (house reading B4681).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Own names of men in the colonial journals and records. */
export const AB_MEN = `
  Bennelong, Pemulwuy, Yagan, Windradyne, Arabanoo, Colebee, Tedbury, Musquito, Jandamarra, Multuggerah, Dundalli,
  Calyute, Midgegooroo, Weeip, Yemmerrawanne, Bungaree, Mannalargenna, Woorady, Tongerlongeter, Barak, Wonga,
  Derrimut, Billibellary, Bungaleen, Nanbaree, Wileemarin, Carradah, Moowattin, Yarramundi, Gogy`;
/** Own names of women in the colonial journals and records. */
export const AB_WOMEN = "Barangaroo, Truganini, Patyegarang, Boorong, Daringa, Tarenorerer, Kurubarabula";
/** Nations, for a woman not named in the records. */
export const AB_NATIONS = `
  the Eora, the Dharug, the Wiradjuri, the Kulin, the Noongar, the Yolngu, the Arrernte, the Kaurna, the Palawa,
  the Gamilaraay, the Anangu, the Yuin, the Gundungurra, the Bundjalung, the Wurundjeri`;
/** Family names of the missions, stations and the desert since. */
export const AB_FAMILY = `
  Mundine, Goodes, Perkins, Pearson, Freeman, Namatjira, Yunupingu, Marika, Gurruwiwi, Wanganeen, Bonner, Nicholls,
  Cooper, Briggs, Thorpe, Watson, Mansell, Roberts, Saunders, Graham, Dodson, Langton, Coe, Williams, Simpson,
  Bropho, Narkle, Hayward, Clarke, Rigney, Lovett, Onus, Tjapaltjarri, Tjungurrayi, Kngwarreye, Napaltjarri`;

/** The tables: own names alone before the colonies, church and family names from 1800 (B4682). */
export const aboriginalTables = () => stagedTables("aboriginal", {men: AB_MEN, women: AB_WOMEN, towns: AB_NATIONS, family: AB_FAMILY, earlyChurch: false});
export const ABORIGINAL_LABELS = {aboriginal: "Aboriginal Australians"};
