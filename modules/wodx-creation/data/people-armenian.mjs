/**
 * The Armenians for the People generator (Creation, B3940 to B3943): Greater Armenia, Cilicia (1198 to 1375), the
 * cities of the Ottoman and Safavid lands, New Julfa and Constantinople. WoDX's own lists of names as Armenians bore
 * them; no book text. Before 1800 a byname of the home town (Narekatsi, "of Narek"), as the chroniclers and scribes
 * signed; from 1800 a family name in -ian or -yan. Picks logged in docs/PENDING-REVIEW.md for Ben.
 */
const MEN_OLD = `
  Grigor, Hovhannes, Smbat, Ashot, Gagik, Vardan, Levon, Hetum, Toros, Oshin, Kostandin, Mkhitar, Vahram, Tigran,
  Aram, Sargis, Nerses, Mesrop, Sahak, Arshak, Khachatur, Karapet, Hakob, Movses, Davit, Stepanos, Zakare, Ivane,
  Shahinshah, Abas, Bagrat, Vasak, Gevorg, Petros, Poghos, Simeon, Tadevos, Martiros, Arakel, Avetik, Mikayel,
  Garegin, Hayk, Artashes, Artavazd, Babken, Vache, Ruben, Mleh, Vahan, Gurgen, Khosrov, Atom, Hamazasp, Mushegh,
  Varazdat, Hrahat, Trdat, Shapuh, Vasil, Aplgharib, Grigoris, Anania, Hovsep, Barsegh, Kirakos, Vardges, Zaven,
  Yeghishe, Koriun, Ghazar, Aristakes, Matteos, Samvel, Hovhan, Nshan, Karen, Abgar, Armenak, Sukias, Mamikon,
  Hmayak, Hovnan, Israel, Minas, Murad, Safar, Aghazar, Melkon, Manuk, Margar, Khoja, Nazar, Avag, Sadun, Prosh`;
const MEN_NEW = `
  Hovhannes, Grigor, Karapet, Hakob, Mkrtich, Sarkis, Arakel, Avetis, Bedros, Boghos, Garabed, Haroutiun, Hagop,
  Krikor, Mihran, Nshan, Ohannes, Sahak, Toros, Vartan, Zareh, Aram, Armen, Arshag, Ara, Hrant, Raffi, Vahan, Levon,
  Gevorg, Ashot, Tigran, Samvel, Karen, Artur, Suren, Rafael, Ruben, Davit, Vardan, Arsen, Hayk, Gagik, Narek,
  Ararat, Vazgen, Hamlet, Anushavan, Andranik, Shahen, Setrak, Kevork, Movses, Manuk, Minas, Margar, Arshile, Calouste,
  Nubar, Komitas, Siamanto, Daniel, Rouben, Zaven, Vrej, Hovsep`;
const WOMEN_OLD = `
  Zabel, Rita, Keran, Mariam, Anna, Shushan, Tamar, Gohar, Anahit, Astghik, Nvard, Hripsime, Gayane, Satenik,
  Varduhi, Khatun, Zarmandukht, Ani, Takuhi, Heghine, Margarit, Anush, Hasmik, Arshakuhi, Zaruhi, Parandzem,
  Sandukht, Vardanush, Dzovinar, Khosrovanuysh, Mamakhatun, Tamta, Shushanik, Yeghisabet, Hranush, Sahakanuysh,
  Katranide, Mlkeh, Goharine, Akhtamar, Ashkhen, Khosrovidukht, Almast, Nazik, Sofia, Marta, Elisabet, Yeghsa, Sirun,
  Khanum`;
const WOMEN_NEW = `
  Mariam, Anna, Shushan, Gohar, Anahit, Astghik, Nvard, Arpine, Siranush, Hripsime, Gayane, Satenik, Varduhi,
  Lusine, Araksi, Takuhi, Nazeli, Sona, Anush, Hasmik, Armine, Knarik, Shoghik, Haykanush, Zaruhi, Seda, Lilit,
  Tatevik, Mane, Nune, Karine, Ruzanna, Marine, Anahid, Arshaluys, Zepyur, Sirvard, Aghavni, Yeranuhi, Srbuhi,
  Zabel, Diana, Silva, Alis, Hermine, Rosa, Ani, Elen, Nairi, Hrachuhi, Ovsanna`;
/** Bynames of the home town, before family names were fixed. */
const TOWNS = `
  Anetsi, Sebastatsi, Vanetsi, Karnetsi, Erznkatsi, Tarsetsi, Sisetsi, Yerevantsi, Tbilisetsi, Kesaratsi,
  Melitinetsi, Edesatsi, Hromklayetsi, Taronetsi, Syunetsi, Narekatsi, Dvinetsi, Bitlisetsi, Mshetsi, Vaspurakantsi,
  Artsakhtsi, Gandzaketsi, Loretsi, Kapanetsi, Haghpatetsi, Sanahnetsi, Tatevatsi, Goghtnetsi, Mokatsi, Kilikiatsi,
  Nakhijevantsi, Jughayetsi, Tokhatetsi, Amidtsi, Arapkirtsi, Kharbertsi, Malatiatsi, Kostandnupolsetsi, Ayntaptsi`;
const FAMILY = `
  Abrahamian, Hovhannisyan, Grigoryan, Sargsyan, Petrosyan, Hakobyan, Harutyunyan, Khachatryan, Karapetyan,
  Gevorgyan, Mkrtchyan, Vardanyan, Avetisyan, Ghazaryan, Martirosyan, Poghosyan, Margaryan, Stepanyan, Simonyan,
  Arakelyan, Davtyan, Sahakyan, Galstyan, Manukyan, Baghdasaryan, Hambardzumyan, Melkonian, Kazarian, Boyajian,
  Terzian, Dervishian, Kalustian, Balian, Gulbenkian, Dadian, Nubarian, Ohanian, Garabedian, Kevorkian,
  Kouyoumdjian, Demirjian, Arzumanian, Saroyan, Tashjian, Haroutunian, Kalfayan, Panossian, Bedrossian, Krikorian,
  Kazanjian, Najarian, Chakmakjian, Papazian, Mardirossian, Babayan, Aivazian, Minasian, Avakian, Shahinian, Topalian,
  Zakarian, Sevadjian, Orbelian, Ter-Petrosyan, Mamikonian, Aznavourian, Khachaturian, Sarafian, Yeghiayan`;

export const ARMENIAN = {
  m: {old: MEN_OLD, new: MEN_NEW},
  f: {old: WOMEN_OLD, new: WOMEN_NEW},
  fam: {old: TOWNS, new: FAMILY}
};
export const ARMENIAN_LISTS = {MEN_OLD, MEN_NEW, WOMEN_OLD, WOMEN_NEW, TOWNS, FAMILY};
