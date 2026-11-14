/**
 * The Inuit for the People generator (Creation, B4650 to B4653): the Kalaallit and Inughuit of Greenland and the Inuit
 * of the Canadian Arctic, from the Thule crossing of the 13th century on. WoDX's own lists of recorded names; no book
 * text. Picks logged in docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings in the modern Greenlandic and Inuktitut alphabets where they are settled): the Greenlanders in the
 * Danish mission and trade records from 1721 and the accounts of the Thule expeditions; the Inuit of Baffin Island,
 * Nunavik and the Kivalliq in the whaling, Hudson's Bay and mission records; and the artists, hunters and elders of
 * the 20th-century co-operatives. Inuit names carry no sex, so the men's and women's lists are one; family names came
 * with the Danish church in Greenland and with Project Surname (1968 to 1971) in Canada. The records hold fewer than
 * 300 names (house reading B4651).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Inuit own names, borne by anyone. */
export const IN_NAMES = `
  Kenojuak, Pitseolak, Oonark, Parr, Kiakshuk, Niviaksiak, Ashoona, Kananginak, Pudlo, Tudlik, Napachie, Qiatsuk,
  Ulayu, Sheouak, Lukta, Kingmeata, Iyola, Qavavau, Mayoreak, Qitdlarssuaq, Minik, Uisaakassak, Aviaq, Navarana,
  Arnarulunguaq, Ataguttaaluk, Alariaq, Ittukusuk, Aapilaq, Uutaaq, Kalluk, Nanook, Inukpuk,
  Pauta, Osuitok, Tiktak, Karoo, Kavik, Qumaq, Tookoome, Kudluk, Ningeeuga`;
/** The Inuit lands. */
export const IN_LANDS = "Avanersuaq, Kitaa, Tunu, Nunavik, Qikiqtaaluk, Kivalliq, Kitikmeot, Nunatsiavut";
/** Church given names: the Danish mission in Greenland, the Anglican and Moravian missions in Canada. */
const IN_CHURCH = {male: "Hans, Peter, Jens, Niels, Karl, Johannes, Lucassie, Joanasie, Pauloosie, Mosesie, Jaco, Davidee, Simeonie, Elijah",
  female: "Maria, Sara, Ane, Karen, Bolette, Elisapee, Annie, Lizzie, Leah, Martha, Eva, Jeannie, Mary, Kristiane"};
const IN_MODERN = {male: "Hans, Aqqaluk, Kuupik, Kim, Malik, Jakob, Peter, Joe, Johnny, Simon, Paul, Jimmy, Lucassie, Tagak",
  female: "Aaja, Naja, Ivalo, Aviaja, Pipaluk, Nivi, Susan, Mary, Annie, Lizzie, Eva, Leetia, Sheila, Aluki"};
/** Family names: Greenland's from the Danish church, Canada's from Project Surname. */
export const IN_FAMILY = `
  Kleist, Lynge, Petersen, Olsen, Motzfeldt, Kristiansen, Kreutzmann, Heilmann, Rosing, Chemnitz, Berthelsen, Egede,
  Lyberth, Frederiksen, Kuitse, Sandgreen, Enoksen, Kielsen, Hammeken, Siegstad, Abelsen, Broberg, Jeremiassen,
  Josefsen, Nathanielsen, Thorleifsen, Storch, Zeeb, Kusugak, Arnatsiaq, Aglukark, Amagoalik, Ipellie, Ashevak,
  Pootoogook, Pitseolak, Akeeagok, Nungak, Kunuk, Arnaquq, Etidloie, Kilabuk, Alainga, Ootova, Akesuk, Tunnillie,
  Qumak, Tagalik, Karetak, Okalik`;

/** The Inuit tables: own names alone before the church, church names and family names after (B4652). */
export const inuitTables = () => stagedTables("inuit", {men: IN_NAMES, women: IN_NAMES, towns: IN_LANDS, church: IN_CHURCH, modern: IN_MODERN, family: IN_FAMILY, earlyChurch: false});
export const INUIT_LABELS = {inuit: "Inuit (Kalaallit and the Canadian Arctic)"};
