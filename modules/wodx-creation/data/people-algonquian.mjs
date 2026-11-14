/**
 * The Algonquian peoples of the east coast for the People generator (Creation, B3510 to B3512). WoDX's own lists of
 * recorded names; no book text. Ben's desk picks, 2026-11-13: three peoples (the Lenape, the New England Algonquian,
 * the Powhatan towns), recorded names with the famous included, the Lenape clan from the mother and nothing for the
 * others, names staged by age as for the Haudenosaunee, women as for the Haudenosaunee, and eastern North America
 * shared with the Haudenosaunee before contact.
 *
 * Sources (spellings as printed, hyphens dropped): Lenape signers of the Greenville (1795), Vincennes (1804),
 * Grouseland (1805), Fort Wayne (1809), St. Mary's (1818), 1829 and 1860 treaties and the Fort McIntosh (1785) and
 * Fort Meigs (1817) articles in Kappler, Indian Affairs: Laws and Treaties, vol. II, and the Pennsylvania deeds and
 * councils (the Walking Purchase, Sassoonan, Shingas); New England names from the Plymouth, Massachusetts, Rhode
 * Island and Connecticut records of sachems, deed signers and praying towns; Powhatan names from John Smith, William
 * Strachey and the 1677 Articles of Peace. The records hold fewer than 300 names for each (house reading B3511).
 */
import {stagedTables} from "./people-haudenosaunee.mjs";

/** Lenape (Delaware, Unami and Munsee) men's own names. */
export const LENAPE_MEN = `
  Tetabokshke, Lemantanquis, Wabatthoe, Maghpiway, Kikthawenund, Bukongehelas, Peekeelund, Wellebawkeelund,
  Peekeetelemund, Kishkopekund, Amenahehan, Queshawksey, Weywinquis, Hawkinpumiska, Peyamawksey, Hocking Pomskan,
  Kecklawhenund, Allime, Tomague, Missenewand, Jeta Buxika, Petchekekapon, Kithteeleland, Lapahnihe, Apacahund,
  Netahopuna, Petchenanalas, Quenaghtoothmait, Caghkoo, Pooshies, Suwaunock, Naunotetauxien, Nauochecaupauc,
  Nungailautone, Aupaneek, Outhteekawshaweat, Sarcoxie, Neconhecon, Rockatowha, Ahlaachick, Kithtuwheland,
  Punchhuck, Kelelamand, Hengue Pushees, Wicocalind, Lappawinsoe, Manawkyhickon, Sassoonan, Nenatcheehunt,
  Netawatwees, Bemino, Gelelemend, Buckongahelas, Pachgantschihilas, Shingas, Tamaqua, Pisquetomen,
  Munhuttakiswilluxissohpon, Miuskillamize, Keekyuscung, Lappapitton, Allumapees, Skalitchy, Passakassy,
  Owechela, Opekasset, Shakatawlin, Mussemeelin, Quenameckquid, Yaqueekhon, Tamanend, Teedyuscung, Wingenum,
  Hobocan, Packelant, Talapoxic, Gingewanno, Konalawassee, Walendightun, Custaloga, Neolin, Oratam, Sagundai,
  Koquethagechton, Hopocan, Tishcohan, Nutimus, Welapachtshechen, Micty, Skekit, Quaquiuse`;
/** Lenape women's own names in the records. */
export const LENAPE_WOMEN = "Tishatahoones";
/** The three Lenape clans; a child is of the mother's clan. */
export const LENAPE_CLANS = "Turtle, Turkey, Wolf";
/** Family names on the Delaware rolls in Kansas, Oklahoma and Ontario. */
export const LENAPE_FAMILY = "Anderson, Killbuck, Journeycake, Sarcoxie, Secondine, Ketchum, Bullette, Elkhair, Falleaf, Swannock, Wilson, Thompson, Pooler, Exendine, Webber, Armstrong, Frenchman, Young, Marshall, Grinter, Wolfe, Wahpepah, Moses, Jacobs, Stonefish, Snake, Peters, Logan, Fox, Halfmoon";

/** New England Algonquian (Wampanoag, Massachusett, Nipmuc, Narragansett, Niantic, Mohegan, Pequot, Montaukett) men. */
export const NE_MEN = `
  Massasoit, Ousamequin, Metacom, Wamsutta, Corbitant, Cheeshahteaumuck, Sassamon, Wepquish, Tookenchosin,
  Quatchatisset, Canonchet, Canonicus, Wessoum, Miantonomi, Pessicus, Mixanno, Ninigret, Pumham, Anawan,
  Muttawmp, Matoonas, Mammanuah, Tatobem, Sassacus, Uncas, Waban, Cutshamekin, Wenepoykin, Nanepashemet,
  Chickatawbut, Wompatuck, Winnepurkit, Wonohaquaham, Montowampate, Manatahqua, Nahaton, Pecksuot, Wituwamat,
  Obbatinewat, Tisquantum, Obtakiest, Wullumahchein, Acquittamaug, Wompas, Wawaus, Weyonomon, Quinnapin,
  Cockenoe, Owaneco, Wawequa, Sassious, Wequash, Sequin, Sequassen, Audsah, Wyandanch, Mecumeh, Mascus, Yotaash,
  Cojonoquant, Tashtassuck, Sacononoco, Tantaquidgeon, Wepitamock, Paupauquivwut, Wonnumentonomey, Juanemo,
  Wampapaquan, Mattashunnamo, Wussausmon, Patuckson, Epenow, Pechmo, Monopet, Pekenimne, Sakaweston, Assacumet,
  Wanape, Samoset, Hobbamock, Tokamaham, Quadequina, Coneconam, Tawanquatuck, Wanackmamack, Nickanoose, Aspinet,
  Takawambait, Ponquanum, Passaconaway, Wompachowet, Quonopohit, Quequequanachet, Petonowit, Tatoson, Wawayeenit,
  Samponack, Cakawehunt, Osohmehun, Popsitigo, Quanawin, Totatomet, Somagaonet, Tattacommett, Samponcut,
  Tamoueesam, Tunuokum, Cassacinamon, Tispaquin, Sonkanuchoo, Annawon, Iyanough, Totoson, Mriksah`;
export const NE_WOMEN = "Weetamoo, Awashonks, Askamaboo, Quaiapen, Wawaloam, Sebequanash, Wootonekanuske, Namumpum, Tatapanunum, Wenunchus, Weethao, Ahawayet, Pentagunsk, Wattaquattinusk, Pentagoonaquah, Yawate, Wanapanquin";
/** Where a woman whose name was not written down came from. */
export const NE_TOWNS = "Pokanoket, Mashpee, Nauset, Natick, Narragansett, Niantic, Mohegan, Pequot, Pocasset, Sakonnet, Nemasket, Agawam, Nashaway, Pawtucket, Montauk, Aquinnah";
/** Family names of Mashpee, Aquinnah, Brothertown, Mohegan and the Narragansett since the 18th century. */
export const NE_FAMILY = "Occom, Peters, Simons, Hammond, Wapock, Fielding, Tantaquidgeon, Quippish, Pells, Attaquin, Mingo, Amos, Ahhaton, Wamsley, Skeesuck, Ashbow, Fowler, Cooper, Vanderhoop, Belain, Madison, Manning, Jeffers, Diamond, Noka, Hazard, Babcock, Champlin, Peckham, Oakley, Hicks, Coombs, Paul, Charles, Johnson";

/** Powhatan (Virginia Algonquian) men. */
export const PO_MEN = `
  Wahunsenacawh, Opechancanough, Mangopeesomon, Opitchapam, Sasawpen, Otiotan, Necotowance, Totopotomoy,
  Catataugh, Pochins, Parahunt, Pepiscumah, Chopoke, Tatahcoope, Coquonasum, Ashuaquid, Wowinchopunck, Weyhohomo,
  Tackonekintaco, Sasenticum, Kaquothocun, Ottahotin, Ohonnamo, Weyamat, Attasquintan, Nansuapunck, Essenataught,
  Attossomunck, Pomiscatuck, Opopohcumunck, Werowough, Ottondeacommoc, Vropaack, Taweeren, Mosco, Machywap,
  Keyghanghton, Debedeavon, Kiptoteke, Chauco, Japazaws, Kocoum, Pericuhtah, Peracuta, Pattanochus, Shurenough,
  Mastegonoe, Tachapoake, Vnuntsquero, Horehonnah, Suubaah, Tomocomo, Nemattanew, Uttamatomakkin`;
export const PO_WOMEN = "Amonute, Matoaka, Cockacoeske, Opossunoquonuske, Oholasc, Mattachanna";
export const PO_TOWNS = "Werowocomoco, Pamunkey, Mattaponi, Chickahominy, Appomattoc, Nansemond, Kecoughtan, Paspahegh, Rappahannock, Accomac, Weyanock, Arrohateck, Quiyoughcohannock, Patawomeck";
/** Family names of the Pamunkey, Mattaponi, Chickahominy, Nansemond and Rappahannock since the 18th century. */
export const PO_FAMILY = "Bradby, Collins, Cook, Dennis, Langston, Miles, Sampson, Page, Custalow, Major, Tupponce, Allmond, Adkins, Stewart, Holmes, Jones, Wynn, Bass, Weaver, Nelson, Fortune, Richardson, Adams, Brown";

export const algonquianTables = () => [
  ...stagedTables("lenape", {men: LENAPE_MEN, women: LENAPE_WOMEN, clans: LENAPE_CLANS, family: LENAPE_FAMILY}),
  ...stagedTables("new-england-algonquian", {men: NE_MEN, women: NE_WOMEN, towns: NE_TOWNS, family: NE_FAMILY}),
  ...stagedTables("powhatan", {men: PO_MEN, women: PO_WOMEN, towns: PO_TOWNS, family: PO_FAMILY})
];
