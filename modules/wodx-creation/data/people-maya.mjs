/**
 * The Maya for the People generator (Creation, B3830 to B3833): the Yucatec lowlands, the Itza of the Petén and the
 * K'iche' and Kaqchikel highlands. WoDX's own lists of recorded names; no book text. Picks logged in
 * docs/PENDING-REVIEW.md for Ben.
 *
 * Sources (spellings in the modern alphabets where they are settled, apostrophes kept): the ruling lines of Mayapan,
 * Mani and Sotuta in the Yucatec chronicles and the Relaciones de Yucatán (1579 to 1581); the lords of the K'iche' and
 * Kaqchikel in the Popol Wuj, the Título de Totonicapán and the Annals of the Kaqchikels; the Itza lords of Nojpetén;
 * a few Classic lords and ladies of the inscriptions whose names lived on; and the patronyms of the colonial
 * Yucatec and highland parish and tribute rolls, which stand to this day. Before the conquest a man bears a lineage
 * name after the own name, as Napot Xiu did; highland commoners bear the day of birth as a name. After the conquest a
 * church given name comes before the patronym. The records hold fewer than 300 names (house reading B3831).
 */

/** Men's own names before the conquest: lords of Mayapan, Mani, Sotuta, Nojpetén and the highlands, and day names. */
const MEN_OLD = `
  Napot, Nachi, Ah Xupan, Ah Kin, Nachan, Tutul, Ah Dzun, Ah Mochan, Hunac Ceel, Ah Ulil, Kinich Kakmo, Ah Kukum,
  Ah Tok, Ah Nacom, Chilam, Nakuk, Kan Ek', Aj Chan, Aj K'in, Q'ukumatz, K'iq'ab, Tecun Uman, Oxib' Kej, B'eleje' Tz'i',
  B'eleje' Kat, Kaji' Imox, Tepepul, Kotuja, Iztayul, B'alam Kitze, B'alam Aq'ab, Majukutaj, Ik'i B'alam, Q'oq'aib,
  Q'oqawib, Tz'ikin, Oxlajuj Tz'i', Kablajuj Tijax, Lajuj No'j, Jun Iq', Wuqub' Kame, Jun Toj, Kaji' Aq'ab'al,
  Wajxaqib' B'atz', Ob'ox Ajmaq, Waqib' Kawoq, Jun Ajpu, Kab'lajuj Kan, Beleheb' E, Oxlajuj Aj, Jun No'j, Wuqub' Kej,
  Kaji' Tz'ikin, Lajuj Q'anil, Oxib' Iq', Yuknoom, K'inich, Jasaw, K'ak' Tiliw, Yax Pasaj, Itzamnaaj B'alam,
  Yaxuun B'alam, K'an Joy Chitam, Chan B'alam, Siyaj Chan, Yax Nuun Ayiin, Janaab Pakal, Ajaw K'uk', Kawiil,
  Itzam K'an Ahk, K'inich Muwaan Jol, Tajal Chan Ahk, Yajaw Te' K'inich, Tan Te' K'inich, Yat Ahk, Ukit Took, Wamaw K'awiil, Chanal Balam, Kaloomte' Bahlam, Muyal Jol, Sak Muwaan, Wak Chan K'awiil, Ete, Tabscoob, Napuc Chi, Ah Mekat, Ah Suytok, Apoxpalon, Kayb'il B'alam, Oxlahuh Tz'i', Wuqu Batz', B'alam Nehn, K'ak'upakal, Tutuum Yohl K'inich, Nuun Ujol Chaak, Bolon K'awiil, Lachan K'awiil, Chak Tok Ich'aak, Ahkal Mo' Nahb, Yo'nal Ahk, Sihyaj Chan K'awiil, Yik'in Chan K'awiil, Uaxaclajuun Ub'aah K'awiil, K'inich Yax K'uk' Mo', Yax Ehb Xook, K'an Chitam, Kan Bahlam, K'ak' Chan Yopaat, Yax Yopaat, K'awiil Chan K'inich, Itzamnaaj K'awiil, Yuknoom Yich'aak K'ahk', Yuknoom Ti' Chan, Yuknoom Took' K'awiil, Sak Tahn Waax, Wil Ohl K'inich, Te' K'ab Chaak, Tuun K'ab' Hix, Bajlaj Chan K'awiil, Ha' K'in Xook, Wat'ul Chatel, Yax Mayuy Chan Chaak, Ajen Yohl Mat, Aj Yaxjal B'aak, Jewel K'awiil, K'inich Waaw, Lamaw Ek', Nuun Ujol K'inich, Tzi B'alam, Ucha'an K'an B'alam, Yax Ahau Xoc, Chirakan, Hun Toh, Balam Ajpu`;
/** Women's own names: the first mothers of the K'iche', the ladies of the inscriptions, and Ix with a mother's name. */
const WOMEN_OLD = `
  Kaqa Palo Ja', Chomi Ja', Tz'ununi Ja', Kaqixa Ja', Ix K'ab'al Xook, Ix Tz'akb'u Ajaw, Ix Yohl Ik'nal, Ix Sak K'uk',
  Ix Wak Chan, Ix Kan, Ix Pech, Ix May, Ix Cupul, Ix Chel, Ix Ek', Ix Tun, Ix Chan, Ix Kauil, Ix Balam,
  Ix Canul, Ix Puc, Ix Noh, Ix Moo,
  Ix Ch'ak Ch'een, Ix Ek' Naah, K'abel, Xoc, Ik', Bulu', K'awiil Yopaat, Lahan Unen Mo', K'atun Ajaw, Sak Ch'een, Xquic, Ixmucane, Xbaquiyalo`;
/** Church given names from the conquest on, as the parish rolls give them. */
const MEN_NEW = "Juan, Pedro, Francisco, Diego, Gaspar, Andrés, Pablo, Martín, Antonio, Gregorio, Baltasar, Melchor, Lorenzo, Domingo, José, Manuel, Miguel, Marcos, Felipe, Santiago, Tomás, Sebastián, Jacinto, Luis, Bernardo, Cecilio, Cándido, Crescencio, Edgar, Elijio, Evelio, Hilario, Humberto, Jesús, Ramiro, Román, Marcial, Alberto, Nicolás, Mikel, Aníbal, Marcelo, Víctor, Carlos, Armando";
const WOMEN_NEW = "María, Ana, Catalina, Juana, Francisca, Inés, Magdalena, Isabel, Lucía, Beatriz, Petrona, Manuela, Josefa, Micaela, Teresa, Candelaria, Rosa, Guadalupe, Pascuala, Marta, Anastasia, Andrea, Aura, Catarina, Concepción, Cristina, Felipa, Froyla, Gladys, Irma, Jakelin, Leticia, Margarita, Marisol, Rigoberta, Rosalina, Sara, Sonia, Thelma, Vicenta, Paula, Ruperta, Claudia, Susana, Adriana, Cielo, Mercedes, Jacinta, Elena";
/** Patronyms: the old lineage names of Yucatán and the highlands, carried on as family names after the conquest. */
const FAMILY = `
  Cocom, Xiu, Chel, Pech, Cupul, Canul, Chan, Ek', May, Ku, Tun, Uc, Can, Che, Dzib, Euan, Itza, Balam, Cauich, Cen,
  Chi, Couoh, Dzul, Hau, Kantun, Kumul, Mis, Moo, Noh, Pat, Poot, Puc, Tec, Tuz, Uicab, Uitz, Yam, Yah, Xool, Ake, Ay,
  Batun, Cab, Caamal, Canche, Chable, Chale, Chuc, Cime, Huchim, Hoil, Keb, Matu, Mex, Nah, Tzuc, Tamay, Ucan, Uh,
  Tzul, Cumes, Chumil, Tuyuc, Xinico, Ixcot, Tum, Batz, Coc, Quiej, Xicay, Yax, Chiyal, Tzunun, Cawek, Nijaib,
  Curruchich, Xiloj, Caal, Xol, Ixcaquic, Canek, Tzeek, Naal, Tzalam, Ak'abal, Nimatuj, Tecú, Calí Tzay, Coy, Sam Colop, Ixquiac, Xicara, Mes, Ceh, Xón, Riquiac, Coroy, Telón, Nicho, Cumez, Choc, Teleguario, Raguay, Kan, Ixchíu, Calel, Santiz, Toxcón, Pale, Luna Kan, Chi Canul, Pat Chablé, Tzay, Tzul Tzul`;

/** The Maya as a people of people-world.mjs: own names before the conquest, church names after; patronyms throughout. */
export const MAYA = {
  m: {medieval: MEN_OLD, "early-modern,industrial,modern": MEN_NEW},
  f: {medieval: WOMEN_OLD, "early-modern,industrial,modern": WOMEN_NEW},
  fam: FAMILY
};
export const MAYA_LISTS = {MEN_OLD, WOMEN_OLD, MEN_NEW, WOMEN_NEW, FAMILY};
