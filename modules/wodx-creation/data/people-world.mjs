/**
 * The People generator's tables for the rest of the world (Creation 0.16.0, B2531). WoDX's own data: given and family
 * names as each people used them, and who lives in each of the world's regions in each age (the mixes in WoDX
 * Chronicle's world-rules.mjs). No book text.
 *
 * Name tables here carry no culture, so any region whose mix names a people can draw them. Where names changed much
 * over the centuries a people has an older list (medieval and early modern) and a newer one (industrial and modern);
 * the ages in between borrow as gen-core's groups do. Peoples who used no family name have none here, and the name
 * is the given name alone. House readings (docs/PENDING-REVIEW.md): the lists are short and common names stand for
 * whole peoples; medieval Europe outside Bohemia gets later family names as bynames; Japanese and Korean commoners
 * get family names before they bore them by law.
 */
import {WORLD_REGIONS, ERA_GROUPS, mixFor, cultureOf} from "../../wodx-chronicle/scripts/world-rules.mjs";
import {haudenosauneeTables} from "./people-haudenosaunee.mjs";
import {algonquianTables} from "./people-algonquian.mjs";
import {plainsTables} from "./people-plains.mjs";
import {MAYA} from "./people-maya.mjs";
import {southwestTables} from "./people-southwest.mjs";
import {missouriTables} from "./people-missouri.mjs";
import {plainsNorthTables} from "./people-plains-north.mjs";
import {basinTables} from "./people-basin.mjs";
import {canadaTables} from "./people-canada.mjs";
import {inuitTables} from "./people-inuit.mjs";
import {tainoTables} from "./people-taino.mjs";
import {aboriginalTables} from "./people-aboriginal.mjs";
import {centralAfricaTables} from "./people-central-africa.mjs";
import {filipinoTables} from "./people-filipino.mjs";
import {ARMENIAN} from "./people-armenian.mjs";

const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const OLD = ["medieval", "early-modern"], NEW = ["industrial", "modern"], MOD = ["modern"], PRE = ["medieval", "early-modern", "industrial"];
const tbl = (id, name, list, era) => ({id, name, results: list.map(x => (typeof x === "string" ? {text: x} : x)), ...(era ? {era} : {})});
const tag = era => era ? ` (${era[0]})` : "";

/** Peoples whose family name comes before the given name. */
export const FAMILY_FIRST = new Set(["chinese", "japanese", "korean", "vietnamese", "hungarian", "khmer"]);

/**
 * Each people: m and f given names, fam family names ("male/female" where the form follows sex). A value is one list
 * for every age, or {old, new} (or explicit era keys) where the names changed.
 */
const P = {
  english: {
    m: {old: "William, Robert, Richard, John, Thomas, Henry, Walter, Hugh, Roger, Geoffrey, Ralph, Simon, Adam, Nicholas, Gilbert, Stephen, Edmund, Peter",
      new: "John, William, Thomas, George, James, Henry, Charles, Edward, Arthur, Albert, Frederick, Harry, Alfred, David, Peter, Michael, Paul, Andrew, Mark, Simon"},
    f: {old: "Alice, Matilda, Agnes, Joan, Margery, Isabel, Emma, Cecily, Beatrice, Juliana, Edith, Avice, Margaret, Elizabeth, Katherine, Anne, Mary, Jane",
      new: "Mary, Elizabeth, Sarah, Ann, Jane, Emily, Alice, Florence, Edith, Margaret, Dorothy, Susan, Karen, Helen, Emma, Claire, Rachel, Laura"},
    fam: "Smith, Jones, Taylor, Brown, Wright, Walker, Wood, Clarke, Cooper, Ward, Baker, Turner, Hill, Carter, Fletcher, Chapman, Thatcher, Mason, Shepherd, Green"},
  irish: {
    m: "Aodh, Brian, Cormac, Domhnall, Eoin, Fearghal, Niall, Ruaidhrí, Seán, Tadhg, Conchobhar, Diarmaid, Pádraig, Muiris, Donnchadh, Cathal",
    f: "Aoife, Bríd, Gráinne, Mór, Sadhbh, Úna, Siobhán, Máire, Fionnuala, Dearbhail, Caitlín, Nuala, Róisín, Eithne, Órlaith",
    fam: "Ó Briain/Ní Bhriain, Ó Néill/Ní Néill, Ó Conchobhair/Ní Chonchobhair, Mac Cárthaigh/Nic Cárthaigh, Ó Domhnaill/Ní Dhomhnaill, Ó Ceallaigh/Ní Cheallaigh, Mac Murchadha/Nic Mhurchadha, Ó Ruairc/Ní Ruairc, Ó Súilleabháin/Ní Shúilleabháin, Mac Diarmada/Nic Dhiarmada, Ó Raghallaigh/Ní Raghallaigh, Ó Dochartaigh/Ní Dhochartaigh"},
  french: {
    m: {old: "Guillaume, Jean, Pierre, Robert, Hugues, Raoul, Thibaut, Étienne, Gautier, Renaud, Philippe, Louis, Henri, Jacques, Nicolas, Geoffroy, Bertrand, Arnaud",
      new: "Jean, Pierre, Louis, Jacques, François, Henri, Charles, Joseph, Marcel, André, René, Paul, Michel, Philippe, Alain, Nicolas, Julien, Thierry"},
    f: {old: "Jeanne, Marie, Agnès, Marguerite, Isabelle, Alix, Béatrice, Aliénor, Mahaut, Perrette, Catherine, Blanche, Yolande, Guillemette, Héloïse, Ermengarde",
      new: "Marie, Jeanne, Marguerite, Louise, Anne, Madeleine, Suzanne, Yvonne, Germaine, Hélène, Monique, Françoise, Catherine, Nathalie, Isabelle, Sophie, Céline, Aurélie"},
    fam: "Martin, Bernard, Dubois, Durand, Moreau, Laurent, Lefèvre, Leroy, Roux, Fournier, Girard, Mercier, Boucher, Chevalier, Lambert, Marchand, Meunier, Charpentier, Barbier, Blanc"},
  italian: {
    m: {old: "Giovanni, Francesco, Pietro, Antonio, Jacopo, Niccolò, Lorenzo, Bartolomeo, Matteo, Guido, Ugo, Bernardo, Filippo, Tommaso, Andrea, Domenico, Marco, Luca",
      new: "Giuseppe, Giovanni, Antonio, Luigi, Francesco, Angelo, Vincenzo, Pietro, Salvatore, Carlo, Mario, Paolo, Marco, Andrea, Stefano, Roberto, Luca, Alessandro"},
    f: {old: "Caterina, Margherita, Giovanna, Francesca, Lucia, Beatrice, Agnese, Bartolomea, Lisa, Ginevra, Maddalena, Antonia, Chiara, Isabella, Costanza, Simonetta",
      new: "Maria, Anna, Rosa, Giuseppina, Teresa, Angela, Lucia, Caterina, Carmela, Giovanna, Francesca, Paola, Laura, Elena, Chiara, Silvia, Giulia, Valentina"},
    fam: "Rossi, Russo, Ferrari, Esposito, Bianchi, Romano, Colombo, Ricci, Marino, Greco, Bruno, Gallo, Conti, De Luca, Costa, Giordano, Mancini, Rizzo, Lombardi, Moretti"},
  spanish: {
    m: {old: "Alfonso, Fernando, Sancho, Rodrigo, Pedro, Juan, Diego, García, Álvaro, Gonzalo, Martín, Nuño, Ramiro, Enrique, Lope, Íñigo, Domingo, Gil",
      new: "José, Manuel, Francisco, Antonio, Juan, Pedro, Luis, Miguel, Rafael, Ángel, Carlos, Javier, Fernando, Jesús, Pablo, Sergio, Alberto, Enrique"},
    f: {old: "María, Urraca, Sancha, Elvira, Teresa, Constanza, Leonor, Isabel, Juana, Catalina, Mencía, Inés, Beatriz, Blanca, Aldonza, Jimena",
      new: "María, Carmen, Josefa, Dolores, Pilar, Teresa, Ana, Isabel, Concepción, Rosario, Mercedes, Cristina, Marta, Laura, Elena, Lucía, Raquel, Silvia"},
    fam: "García, Fernández, González, Rodríguez, López, Martínez, Sánchez, Pérez, Gómez, Díaz, Ruiz, Hernández, Jiménez, Álvarez, Moreno, Muñoz, Romero, Navarro, Torres, Domínguez"},
  portuguese: {
    m: "João, Pedro, Afonso, Fernando, Duarte, Henrique, Manuel, António, Francisco, Diogo, Rui, Nuno, Vasco, Gonçalo, Luís, José, Miguel, Tiago",
    f: "Maria, Isabel, Beatriz, Leonor, Catarina, Inês, Ana, Joana, Filipa, Teresa, Constança, Francisca, Luísa, Margarida, Helena, Mariana",
    fam: "Silva, Santos, Ferreira, Pereira, Oliveira, Costa, Rodrigues, Martins, Sousa, Fernandes, Gonçalves, Gomes, Lopes, Marques, Alves, Almeida, Ribeiro, Pinto, Carvalho, Teixeira"},
  dutch: {
    m: "Jan, Pieter, Willem, Dirk, Hendrik, Cornelis, Gerrit, Jacob, Klaas, Adriaan, Floris, Arnout, Johannes, Maarten, Bram, Joost, Ruben, Thijs",
    f: "Maria, Anna, Johanna, Cornelia, Elisabeth, Geertruida, Margaretha, Aleid, Machteld, Katrijn, Neeltje, Trijntje, Hendrika, Wilhelmina, Sanne, Lotte",
    fam: "de Jong, Jansen, de Vries, van den Berg, van Dijk, Bakker, Janssen, Visser, Smit, Meijer, de Boer, Mulder, de Groot, Bos, Vos, Peters, Hendriks, van Leeuwen, Dekker, Brouwer"},
  // The Sami of Sápmi, the north of Norway, Sweden and Finland and the Kola (B4900): Sami forms of the church names the
  // missions and the tax rolls recorded from the 16th century, then the given and family names of the 19th and 20th
  sami: {
    m: {old: "Ánde, Ánte, Áslat, Biehtar, Máhtte, Niillas, Jovnna, Heaika, Mihkkal, Ovllá, Isak, Piera, Juhán, Lásse, Sámmol, Jon, Ole, Mihkkel, Ivvár, Ádjá, Oula",
      new: "Nils, Per, Aslak, Johan, Mikkel, Anders, Isak, Ole, Lars, Jon, Mattis, Ante, Niillas, Áilu, Sven, Mons, Nils-Aslak, Hans, Thomas, Jovnna, Máhtte, Ánde"},
    f: {old: "Elle, Biret, Risten, Ingá, Máret, Gáren, Ánne, Sára, Márjá, Káddja, Siri, Ellen, Kirsten, Elsá, Bigge, Gunnel",
      new: "Elle, Sara, Inga, Karen, Maret, Biret, Ellen, Anna, Kristina, Elsa, Ristin, Ánná, Sofia, Marja, Máret, Risten, Mari, Áile"},
    fam: {new: "Somby, Hætta, Gaup, Eira, Sara, Utsi, Valkeapää, Kuoljok, Labba, Turi, Bals, Buljo, Bongo, Kemi, Mienna, Partapuoli, Sarri, Siri, Skum, Tuolja, Aikio, Magga, Oskal, Balto, Logje, Marainen, Nutti, Pittja, Kitti, Lukkari, Näkkäläjärvi, Länsman, Persen, Gaino, Triumf, Renberg, Laula, Bær"}},
  norse: {
    m: {old: "Erik, Olaf, Harald, Sigurd, Knut, Magnus, Håkon, Sven, Gunnar, Bjørn, Ragnvald, Torstein, Eystein, Ivar, Halvdan, Arne, Leif, Ulf",
      new: "Erik, Karl, Lars, Anders, Johan, Nils, Per, Olof, Gustav, Sven, Axel, Oskar, Henrik, Mikael, Stefan, Jonas, Magnus, Fredrik"},
    f: {old: "Ingrid, Astrid, Sigrid, Gudrun, Ragnhild, Thora, Gunnhild, Helga, Ingeborg, Solveig, Åsa, Bergljot, Margrete, Kristin, Birgitta, Estrid",
      new: "Anna, Maria, Kristina, Margareta, Karin, Ingrid, Elisabet, Brita, Sofia, Emma, Astrid, Birgit, Eva, Lena, Annika, Sara, Linnea, Elin"},
    fam: {old: "Eriksson/Eriksdotter, Olofsson/Olofsdotter, Larsson/Larsdotter, Andersson/Andersdotter, Johansson/Johansdotter, Nilsson/Nilsdotter, Persson/Persdotter, Karlsson/Karlsdotter, Svensson/Svensdotter, Gustafsson/Gustafsdotter, Magnusson/Magnusdotter, Knutsson/Knutsdotter",
      new: "Eriksson, Olofsson, Larsson, Andersson, Johansson, Nilsson, Persson, Karlsson, Svensson, Gustafsson, Lindberg, Lindström, Bergström, Holm, Nyström, Lund"}},
  german: {
    m: {modern: "Thomas, Michael, Andreas, Stefan, Christian, Martin, Peter, Klaus, Jürgen, Wolfgang, Frank, Uwe, Markus, Jan, Sven, Tobias, Florian, Daniel"},
    f: {modern: "Sabine, Petra, Monika, Andrea, Claudia, Susanne, Birgit, Karin, Stefanie, Nicole, Julia, Katrin, Anja, Heike, Martina, Christina, Ursula, Renate"},
    fam: {modern: "Müller, Schmidt, Schneider, Fischer, Weber, Meyer, Wagner, Becker, Schulz, Hoffmann, Koch, Bauer, Richter, Klein, Wolf, Schröder, Neumann, Schwarz, Zimmermann, Braun"}},
  polish: {
    m: "Bolesław, Kazimierz, Władysław, Mieszko, Stanisław, Jan, Piotr, Mikołaj, Wojciech, Zbigniew, Henryk, Andrzej, Jakub, Tomasz, Józef, Krzysztof, Marek, Paweł",
    f: "Jadwiga, Elżbieta, Anna, Katarzyna, Małgorzata, Zofia, Agnieszka, Dorota, Barbara, Kinga, Salomea, Helena, Maria, Ewa, Magdalena, Joanna",
    fam: "Nowak, Kowalski/Kowalska, Wiśniewski/Wiśniewska, Wójcik, Kowalczyk, Kamiński/Kamińska, Lewandowski/Lewandowska, Zieliński/Zielińska, Szymański/Szymańska, Woźniak, Dąbrowski/Dąbrowska, Kozłowski/Kozłowska, Jankowski/Jankowska, Mazur, Krawczyk"},
  hungarian: {
    m: "István, László, Béla, András, Géza, Imre, Károly, Mátyás, János, Miklós, Péter, Pál, György, Ferenc, Mihály, Sándor, Zoltán, Attila",
    f: "Erzsébet, Margit, Anna, Katalin, Ilona, Mária, Zsófia, Borbála, Piroska, Sarolta, Judit, Klára, Dorottya, Ágnes, Éva, Zsuzsanna",
    fam: "Nagy, Kovács, Tóth, Szabó, Horváth, Varga, Kiss, Molnár, Németh, Farkas, Balogh, Papp, Takács, Juhász, Lakatos, Mészáros"},
  romanian: {
    m: "Ion, Vlad, Mircea, Radu, Ștefan, Mihai, Gheorghe, Nicolae, Dumitru, Vasile, Petru, Bogdan, Dan, Alexandru, Constantin, Andrei",
    f: "Maria, Ana, Elena, Ioana, Ecaterina, Ilinca, Ruxandra, Stanca, Smaranda, Florica, Anca, Doina, Mihaela, Cristina, Daniela, Gabriela",
    fam: "Popescu, Ionescu, Popa, Stan, Dumitru, Stoica, Gheorghe, Rusu, Munteanu, Matei, Constantin, Moldovan, Ardelean, Dragomir, Lupu, Ungureanu"},
  serbian: {
    m: "Stefan, Lazar, Marko, Miloš, Vuk, Dušan, Nikola, Jovan, Đorđe, Petar, Bogdan, Radoslav, Uroš, Dragan, Milan, Zoran",
    f: "Jelena, Milica, Mara, Anđelija, Jefimija, Dragana, Ljubica, Olivera, Teodora, Vukosava, Ana, Marija, Jovana, Snežana, Vesna, Mirjana",
    fam: "Jovanović, Petrović, Nikolić, Marković, Đorđević, Stojanović, Ilić, Stanković, Pavlović, Milošević, Popović, Lazarević, Kovačević, Obradović, Vuković"},
  russian: {
    m: {old: "Ivan, Vasily, Dmitry, Yaroslav, Vladimir, Mstislav, Sviatoslav, Fyodor, Boris, Gleb, Yuri, Mikhail, Andrei, Aleksandr, Semyon, Grigory, Nikita, Pyotr",
      new: "Ivan, Aleksandr, Nikolai, Sergei, Vladimir, Dmitry, Aleksei, Mikhail, Andrei, Pavel, Yuri, Viktor, Oleg, Igor, Maksim, Yevgeny, Anatoly, Boris"},
    f: {old: "Olga, Anna, Maria, Evdokia, Feodosia, Marfa, Praskovia, Agafia, Xenia, Anastasia, Yelena, Sofia, Vasilisa, Ulyana, Irina, Natalia",
      new: "Maria, Anna, Yelena, Olga, Tatiana, Natalia, Irina, Svetlana, Yekaterina, Lyudmila, Galina, Nina, Vera, Nadezhda, Anastasia, Oksana, Yulia, Darya"},
    fam: "Ivanov/Ivanova, Smirnov/Smirnova, Kuznetsov/Kuznetsova, Popov/Popova, Vasiliev/Vasilieva, Petrov/Petrova, Sokolov/Sokolova, Mikhailov/Mikhailova, Novikov/Novikova, Fyodorov/Fyodorova, Morozov/Morozova, Volkov/Volkova, Alekseev/Alekseeva, Lebedev/Lebedeva, Semyonov/Semyonova, Yegorov/Yegorova, Pavlov/Pavlova, Kozlov/Kozlova"},
  // Armenians of Greater Armenia, Cilicia and the cities of the Ottoman and Safavid lands (B3940)
  armenian: ARMENIAN,
  greek: {
    m: "Ioannes, Georgios, Konstantinos, Michael, Nikolaos, Demetrios, Theodoros, Andronikos, Manuel, Alexios, Basileios, Leon, Nikephoros, Petros, Stephanos, Christos, Panagiotis, Vasilis",
    f: "Maria, Eirene, Anna, Theodora, Helene, Zoe, Eudokia, Sophia, Euphrosyne, Katerina, Kalliope, Vasiliki, Georgia, Despina, Angeliki, Kyriaki",
    fam: "Papadopoulos/Papadopoulou, Georgiou, Nikolaidis/Nikolaidou, Dimitriou, Konstantinou, Ioannidis/Ioannidou, Makris/Makri, Doukas/Doukaina, Komnenos/Komnene, Palaiologos/Palaiologina, Vlachos/Vlachou, Karagiannis/Karagianni, Economou"},
  // Raised to 300 names (B3312): older and newer given names; nisbas of city, tribe and trade before family names
  arabic: {
    m: {old: "Muhammad, Ahmad, Ali, Hasan, Husayn, Umar, Uthman, Ibrahim, Yusuf, Khalid, Abd Allah, Abd al-Rahman, Mahmud, Sulayman, Ismail, Mustafa, Salih, Hamza, Tariq, Zayd, Abd al-Aziz, Abd al-Malik, Abd al-Qadir, Abd al-Karim, Abd al-Latif, Abd al-Hamid, Abd al-Wahhab, Abd al-Majid, Abd al-Ghani, Abd al-Salam, Jafar, Musa, Isa, Harun, Yahya, Zakariyya, Dawud, Idris, Ayyub, Yaqub, Ishaq, Nuh, Yunus, Bilal, Ammar, Miqdad, Ubayda, Saad, Said, Talha, Zubayr, Muawiya, Walid, Hisham, Marwan, Mansur, Mahdi, Rashid, Mamun, Mutasim, Nasir, Qasim, Hashim, Abbas, Fadl, Rabi, Shams al-Din, Nur al-Din, Salah al-Din, Imad al-Din, Fakhr al-Din, Jamal al-Din, Kamal al-Din, Badr al-Din, Taqi al-Din, Izz al-Din, Sayf al-Din, Ziyad, Abu Bakr, Usama, Anas, Habib",
      new: "Muhammad, Ahmad, Ali, Hasan, Husayn, Umar, Ibrahim, Yusuf, Khalid, Abdullah, Abdulrahman, Mahmud, Mustafa, Hamza, Tariq, Karim, Samir, Nabil, Walid, Faisal, Fahd, Sultan, Saud, Nasser, Jamal, Adel, Amr, Ayman, Bassam, Fadi, Ghassan, Hani, Hisham, Ihab, Imad, Issam, Kamal, Majid, Marwan, Mazen, Munir, Nadim, Omar, Osama, Rami, Riyad, Sami, Sharif, Tamer, Wael, Yasser, Ziad, Zaki, Amin, Anwar, Fuad, Hafez, Husni, Jalal, Latif, Mounir, Nizar, Qais, Raed, Saleh, Talal, Tawfiq, Younes, Hassan, Mohamed"},
    f: {old: "Fatima, Aisha, Khadija, Zaynab, Maryam, Layla, Amina, Safiyya, Ruqayya, Hafsa, Sumayya, Asma, Halima, Salma, Nur, Yasmin, Huda, Rabia, Umm Kulthum, Sawda, Juwayriya, Maymuna, Ramla, Hind, Khawla, Nusayba, Barira, Sukayna, Ulayya, Zubayda, Buran, Qatr al-Nada, Shajar al-Durr, Dayfa, Karima, Sitt al-Mulk, Sitt al-Sham, Shuhda, Tajal, Jamila, Labiba, Nafisa, Wallada, Hamda, Mahbuba, Arwa, Lubna, Muna, Suad, Aziza, Badia, Dalal, Ghaliya, Hanan, Jumana, Lamya, Naila, Rahma, Sakina, Wafa, Zahra, Bushra, Thurayya, Malak, Yamina, Zulaykha, Sara, Hajar, Hawwa, Raihana",
      new: "Fatima, Aisha, Khadija, Zaynab, Maryam, Layla, Amina, Salma, Nour, Yasmin, Huda, Rania, Dina, Hala, Hiba, Lina, Maha, Mona, Nadia, Noha, Reem, Rasha, Samar, Sana, Sawsan, Suha, Wafaa, Ghada, Hanan, Iman, Jamila, Laila, Lamia, Majida, Manal, Mariam, Najla, Nawal, Rana, Randa, Rima, Sabah, Safa, Sahar, Samira, Shereen, Souad, Wedad, Fairuz, Asmahan, Umayma, Basma, Doaa, Farah, Ghalia, Hayat, Ibtisam, Inas, Jana, Lujain, Malak, Nada, Ruba, Sarah, Tala, Zeina, Haya, Shahd, Joud, Leen"},
    child: ["ibn", "bint", 6],
    fam: {old: "al-Baghdadi, al-Dimashqi, al-Misri, al-Halabi, al-Maghribi, al-Andalusi, al-Basri, al-Makki, al-Yamani, al-Tunisi, al-Mawsili, al-Qurashi, al-Haddad, al-Najjar, al-Khayyat, al-Attar, al-Hakim, al-Tajir, al-Kufi, al-Madani, al-Iskandarani, al-Qudsi, al-Hijazi, al-Shami, al-Hamawi, al-Himsi, al-Tarabulsi, al-Sayyid, al-Hashimi, al-Tamimi, al-Kindi, al-Azdi, al-Ansari, al-Zahrani, al-Shammari, al-Harbi, al-Utaybi, al-Qahtani, al-Dosari, al-Ghamdi",
      new: "Haddad, Najjar, Khoury, Saad, Mansour, Nasser, Hijazi, Shami, Masri, Halabi, Darwish, Khalil, Hamdan, Jaber, Saleh, Qasim, Abbas, Ibrahim, Hussein, Hassan, Bakr, Rashid, Aziz, Fakhoury, Sabbagh, Tahhan, Lahham, Zayyat, Bitar, Hallaq, Shaheen, Barakat, Sharif, Farouk, Kassab, Sabbah, Ayoub, Yassin, Khatib, Imam, Qadi, Mufti, Hakim, Tannous, Sarraf, Jazairi, Tunsi, Fassi, Marrakchi, Oudghiri, Benjelloun, Bennani, Boukhari, al-Sayyid, al-Hashimi, al-Tamimi, al-Ansari, al-Zahrani, al-Shammari, al-Harbi, al-Utaybi, al-Qahtani, al-Dosari, al-Ghamdi"}},
  persian: {
    m: "Rostam, Bahram, Farhad, Dariush, Khosrow, Jamshid, Kaveh, Siavash, Ardeshir, Hossein, Reza, Mahmud, Ali, Hasan, Mehdi, Abbas, Karim, Jafar",
    f: "Shirin, Roxana, Parisa, Golnar, Mahin, Soraya, Laleh, Nasrin, Farah, Zahra, Fatemeh, Maryam, Leila, Simin, Homa, Azar, Mina, Shahrzad",
    fam: "Isfahani, Shirazi, Tabrizi, Khorasani, Kermani, Hamadani, Qazvini, Yazdi, Tusi, Nishapuri, Razi, Gilani, Tehrani, Kashani"},
  turkish: {
    m: "Mehmed, Ahmed, Mustafa, Ali, Hasan, Hüseyin, Osman, Orhan, Murad, Bayezid, Selim, Süleyman, İbrahim, Yusuf, Halil, İsmail, Kemal, Emre",
    f: "Ayşe, Fatma, Hatice, Emine, Zeynep, Hafsa, Gülbahar, Nilüfer, Mihrimah, Esma, Rabia, Safiye, Elif, Meryem, Leyla, Selma",
    // No family names before the law of 1934: "son of" a father's name until then
    fam: {[PRE.join()]: "{names.male.turkish}oğlu", modern: "Yılmaz, Kaya, Demir, Şahin, Çelik, Yıldız, Öztürk, Aydın, Arslan, Doğan, Kılıç, Aslan"}},
  // Raised to 300 names (B5220): the khans, queens and captains of the Mongol and Kipchak steppe in the old ages, then
  // the names of Mongolia and the Kazakh steppe; given alone throughout
  steppe: {
    m: {old: "Temür, Batu, Berke, Möngke, Chagatai, Jochi, Qaidu, Toghrul, Arslan, Bayan, Nogai, Subutai, Ögedei, Tolui, Qutlugh, Ulugh, Temüjin, Yesügei, Jamukha, Jebe, Muqali, Bo'orchu, Chilaun, Jelme, Qasar, Belgutei, Temüge, Kököchü, Güyük, Hülegü, Kublai, Ariq Böke, Abaqa, Arghun, Ghazan, Öljeitü, Toqta, Özbeg, Janibeg, Tokhtamysh, Edigu, Mamai, Urus, Esen, Dayan, Altan, Ligdan, Galdan, Amursana, Tsewang, Abatai, Toghon Temür, Ayurbarwada, Qaishan, Tegüder, Kitbuqa, Baiju, Sartaq, Orda, Shiban, Boroqul, Naya, Köten, Konchak, Bonyak, Sharukan, Tugorkan, Baybars, Qalawun, Aybak, Tarmashirin, Kebek, Buzun, Kuchum, Bars, Böri, Tengiz, Qara, Aq Buqa, Buqa, Qutula, Ambaghai, Qabul, Bartan, Tumbinai, Tayang, Kuchlug, Inanch, Buyruq, Qorchi, Sorqan Shira, Toqtoa, Dei Sechen, Munglik, Sebe, Qadan, Qunan",
      new: "Ganbaatar, Bat-Erdene, Batbayar, Enkhbayar, Sükhbaatar, Choibalsan, Tsedenbal, Ochirbat, Bagabandi, Elbegdorj, Battulga, Khürelsükh, Oyun-Erdene, Tömörbaatar, Gantulga, Erdenebat, Munkhbat, Batjargal, Davaadorj, Dorjsuren, Byambasuren, Altankhuyag, Purevdorj, Tögsjargal, Ganzorig, Sansar, Temuulen, Bilguun, Mönkh-Ochir, Lkhagvasuren, Dashdorj, Tsogtbaatar, Nyamdorj, Chinbat, Otgonbayar, Zorig, Javkhlan, Ankhbayar, Gantömör, Baatar, Bold, Chuluun, Delger, Ganbold, Sükh, Tsogt, Zolbayar, Ariunbold, Bayarsaikhan, Dagvadorj, Enkhtaivan, Galbadrakh, Jargalsaikhan, Mönkhbayar, Naranbaatar, Sodnom, Tserendorj, Uuganbayar, Yondon, Abai, Abylai, Kenesary, Nursultan, Kassym, Dauren, Serik, Yerlan, Askar, Bauyrzhan, Mukhtar, Nurlan, Talgat, Yerzhan, Arman, Daniyar, Marat, Kairat, Almas, Nurbol, Zhandos, Abylkhair"},
    f: {old: "Börte, Sorghaghtani, Töregene, Khutulun, Chabi, Oghul, Alaqai, Checheyigen, Mandukhai, Altani, Bayalun, Orghana, Hö'elün, Yisui, Yisügen, Khulan, Doquz, Oghul Qaimish, Qutui, Bulughan, Kököchin, Nambui, Ebegei, Qojin, Tolun, Tümelün, Taydula, Tomyris, Ay Khatun, Sati Beg, Baghdad Khatun, Dilshad, Qutlugh Terken, Terken, Padishah Khatun, Kurdujin, El Qutlugh, Abish, Nomolun, Samur, Ibaqa, Begtütmish, Kelmish, Altalun, Saran, Naran, Tsetseg, Sarnai, Odval, Gerel, Ariun, Aysulu, Altynay, Ay, Qadaqai, Sorqan, Alan Qo'a, Qorijin, Tegüs, Ergene, Qadagan, Ibaqa Beki, Chaka, Kelemish",
      new: "Narantsetseg, Khongorzul, Battsetseg, Erdenechimeg, Oyunchimeg, Enkhtuya, Sarangerel, Altantsetseg, Tsetsegmaa, Bolormaa, Gerelmaa, Odgerel, Uranchimeg, Munkhtsetseg, Nomin, Ariuna, Anu, Bayarmaa, Dulmaa, Enkhjargal, Ganchimeg, Mönkhzul, Naranchimeg, Oyuntsetseg, Purevsuren, Solongo, Tsolmon, Undrakh, Uyanga, Yanjmaa, Zolzaya, Delgermaa, Altanzul, Amarzaya, Badamkhand, Chimeg, Davaasuren, Erdenetsetseg, Gantsetseg, Indra, Jargalmaa, Khaliun, Lkhamsuren, Maral, Nyamaa, Otgontsetseg, Saruul, Sodgerel, Tuul, Unurjargal, Zaya, Aigerim, Dinara, Gulnara, Zhanar, Saule, Madina, Aliya, Ainur, Asel, Gaukhar, Zarina, Akmaral, Botagoz, Zhuldyz, Kamila, Meruyert, Togzhan, Zhibek"}},
  // Raised to 300 names (B3311): older names (epics, kings, saints, poets) and newer ones, and 70 family names
  hindi: {
    m: {old: "Arjun, Krishna, Ram, Vikram, Hari, Gopal, Govind, Shankar, Bhim, Prithvi, Jai, Pratap, Man, Udai, Narayan, Madhav, Keshav, Damodar, Raghunath, Mukund, Balram, Lakshman, Bharat, Shatrughan, Devdatta, Harsha, Chandragupta, Ashok, Samudra, Vishnudatta, Somnath, Bhoja, Hammir, Rana, Sangram, Kumbha, Jaswant, Ajit, Durgadas, Shivaji, Sambhaji, Baji, Tukaram, Eknath, Tulsidas, Surdas, Kabir, Raidas, Nanak, Gangadhar, Raghav, Murari, Mohan, Kishan, Shyam, Ghanshyam, Girdhar, Brijlal, Kanhaiya, Vasudev, Sadashiv, Trimbak, Mahadev, Rudra, Bholanath, Shivdas, Ramdas, Haridas, Gokul, Mathura, Jagannath, Jagat, Kunwar, Bhupat, Jodha, Rao, Dalpat, Indrajit, Kalyan, Chandra",
      new: "Mohan, Ravi, Suresh, Anil, Prakash, Deepak, Mahesh, Rajesh, Sanjay, Amit, Vijay, Ashok, Sunil, Rahul, Rohit, Arun, Manoj, Vikram, Rakesh, Ramesh, Dinesh, Naresh, Mukesh, Ajay, Vinod, Pradeep, Sandeep, Rajiv, Sachin, Saurabh, Gaurav, Nitin, Vivek, Abhishek, Ankit, Aditya, Akash, Varun, Karan, Kunal, Nikhil, Pankaj, Pawan, Alok, Ashish, Hemant, Jitendra, Kamal, Lalit, Mayank, Narendra, Pramod, Rajendra, Satish, Shailesh, Subhash, Tarun, Umesh, Yogesh, Aarav, Vihaan, Ishaan, Reyansh, Ayaan, Dhruv, Kabir, Arnav, Shaurya, Atharv, Harsh"},
    f: {old: "Sita, Lakshmi, Parvati, Radha, Padmini, Mira, Durga, Savitri, Ganga, Kamala, Rukmini, Yashoda, Tara, Uma, Gauri, Champa, Damayanti, Shakuntala, Draupadi, Kunti, Gandhari, Sulochana, Urmila, Mandavi, Ahilya, Jijabai, Tarabai, Lakshmibai, Rupmati, Jodhabai, Karnavati, Durgavati, Chand, Ratnavati, Sarasvati, Annapurna, Bhagirathi, Godavari, Narmada, Jamuna, Kaushalya, Sumitra, Kaikeyi, Mandodari, Anasuya, Arundhati, Lopamudra, Gargi, Maitreyi, Malati, Madhavi, Vasantasena, Chitralekha, Mrinalini, Vimala, Kusum, Phoolmati, Rajkumari, Sundari, Bhavani, Jamna, Kesar, Gulab, Chameli, Bela, Basanti, Sonbai, Hirabai, Ramabai, Anandibai",
      new: "Sunita, Anita, Kavita, Priya, Pooja, Neha, Rekha, Meena, Lata, Asha, Usha, Geeta, Shanti, Indira, Deepa, Anjali, Suman, Seema, Nisha, Rita, Mamta, Archana, Vandana, Manju, Sarita, Sushma, Kiran, Poonam, Sapna, Shilpa, Swati, Preeti, Ritu, Jyoti, Rashmi, Shweta, Sonia, Divya, Nidhi, Ruchi, Komal, Megha, Payal, Pallavi, Shalini, Madhuri, Smita, Aarti, Bhavna, Garima, Monika, Radhika, Renu, Shobha, Vidya, Aadhya, Ananya, Diya, Ishita, Kavya, Myra, Saanvi, Tanvi, Riya, Aditi, Kriti, Sneha, Tanya, Isha, Pari"},
    fam: "Sharma, Verma, Gupta, Singh, Kumar, Mishra, Pandey, Yadav, Chauhan, Rathore, Agarwal, Joshi, Tiwari, Srivastava, Mehta, Kapoor, Shukla, Dubey, Tripathi, Chaturvedi, Dwivedi, Upadhyay, Bajpai, Awasthi, Dixit, Saxena, Mathur, Bhatnagar, Nigam, Khanna, Malhotra, Chopra, Arora, Bhatia, Sethi, Tandon, Kohli, Ahuja, Jain, Bansal, Goyal, Mittal, Jindal, Garg, Singhal, Maheshwari, Thakur, Rawat, Negi, Bisht, Rajput, Sisodia, Bhati, Shekhawat, Solanki, Parmar, Jadeja, Chandel, Tomar, Bundela, Sinha, Prasad, Rai, Chaudhary, Patel, Desai, Shah, Trivedi, Vyas, Bhatt"},
  // Raised to 300 names (B5240): the Chola, Pandya and Pallava kings and queens, the Sangam poets and saints and the
  // village names of the old Tamil country, then the names of modern Tamil Nadu and Sri Lanka; given alone, as Tamils
  // write the father's initial rather than a family name
  tamil: {
    m: {old: "Rajaraja, Rajendra, Kulothunga, Vikrama, Parantaka, Aditya, Sundara, Uttama, Gandaraditya, Arinjaya, Vijayalaya, Karikalan, Nedunchezhiyan, Maravarman, Jatavarman, Sundarapandya, Kulasekara, Narasimha, Mahendra, Nandivarman, Kopperunchinga, Thiruvalluvar, Kambar, Ottakoothar, Sekkizhar, Appar, Sundarar, Manikkavasagar, Nammalvar, Ramanuja, Thirumangai, Periyalvar, Kapilar, Paranar, Ilango, Sathanar, Nakkeerar, Perunchithiranar, Ponmudiyar, Arumugam, Murugan, Kumaran, Velu, Perumal, Sundaram, Kannan, Raman, Mani, Rajan, Ganesan, Selvam, Ponnusamy, Muthu, Karuppan, Ayyanar, Madasamy, Sudalai, Veerapandian, Kattabomman, Marudhu, Puli Thevar, Ondiveeran, Muthuvaduganatha, Thirumalai, Chokkanatha, Vijayaranga, Nagama, Viswanatha, Achyuta, Krishnappa, Venkata, Sevappa, Raghunatha, Ekoji, Serfoji, Tulaja",
      new: "Senthil, Karthik, Anand, Suresh, Ramesh, Rajesh, Saravanan, Prakash, Vijay, Ajith, Suriya, Dhanush, Vikram, Kamal, Rajinikanth, Annadurai, Karunanidhi, Kamaraj, Periyar, Bharathi, Subramania, Chidambaram, Venkatesan, Balasubramanian, Krishnamurthy, Ramasamy, Natarajan, Shanmugam, Sivakumar, Elango, Arun, Bala, Dinesh, Ganesh, Gopi, Hari, Ilaiyaraaja, Jayakumar, Kumar, Logesh, Manikandan, Mohan, Nandha, Parthiban, Raja, Rajkumar, Sasikumar, Selvaraj, Sundar, Thangaraj, Thirunavukkarasu, Udhayanidhi, Vadivelu, Vasanth, Velmurugan, Vignesh, Yuvan, Anbu, Arivu, Ezhil, Kathir, Maran, Nedumaran, Pugazh, Tamilselvan, Thamizharasan, Valavan, Kalaiselvan, Muthukumar, Pandian, Arjun, Ashwin, Balaji, Bharath, Chandran, Durai, Jagan, Kathiresan, Kavin, Madhavan, Murali, Narayanan, Palani, Raghavan, Sekar, Siva, Srinivasan, Thiru, Vel, Vetri, Yogesh, Iniyan"},
    f: {old: "Avvaiyar, Andal, Karaikkal Ammaiyar, Kundavai, Sembiyan Mahadevi, Lokamahadevi, Vanavan Mahadevi, Panchavan Mahadevi, Madhuravalli, Mangai, Kannagi, Madhavi, Manimekalai, Sundari, Valli, Meenakshi, Kamakshi, Parvathi, Thilagavathi, Mangayarkarasi, Velu Nachiyar, Rani Mangammal, Meenakshi Ammal, Kuyili, Nallathangal, Ponni, Vaigai, Kaveri, Sivakami, Thayammal, Muthammal, Karuppayi, Ponnammal, Chellammal, Pechiyammal, Muniyammal, Sellayi, Rasathi, Azhagammai, Valliammai, Aiyai, Nachiyar, Kokilam, Kanagam, Thangam, Muthulakshmi, Annammal, Lakshmi, Veeramma, Kali, Mariyamma, Sornam, Malliga, Senbagam, Thamarai, Alli, Kuvalai",
      new: "Selvi, Devi, Kala, Malar, Revathi, Saraswathi, Vasanthi, Kavitha, Priya, Thenmozhi, Jayalalithaa, Kanimozhi, Sasikala, Vijayalakshmi, Bhuvaneswari, Chitra, Deepa, Divya, Gayathri, Geetha, Hema, Indira, Jothi, Kalaiselvi, Kamala, Kanaka, Lalitha, Mahalakshmi, Mallika, Nandhini, Nirmala, Padma, Pavithra, Ramya, Rani, Sangeetha, Santhi, Sathya, Shanthi, Sudha, Sumathi, Tamilselvi, Uma, Usha, Vaishnavi, Vanitha, Yamuna, Anitha, Bharathi, Dhivya, Ezhilarasi, Iniya, Kayal, Mathi, Nila, Oviya, Poongodi, Poornima, Pooja, Ranjani, Sowmya, Swathi, Thamizhini, Valarmathi, Yazhini, Janaki, Aishwarya, Abirami, Keerthana, Akila, Brinda, Chandra, Gomathi, Kousalya, Mythili, Nithya, Parimala, Rukmini, Thara, Vimala, Kasthuri, Pushpa, Saroja, Amudha"}},
  // Two given names and no family name
  tibetan: {
    m: "Tenzin, Dorje, Tashi, Sonam, Lobsang, Karma, Ngawang, Jigme, Thubten, Dawa, Nyima, Pasang, Tsering, Phuntsok, Namgyal, Rinchen, Wangchuk, Gyaltsen, Kelsang, Jamyang",
    f: "Dolma, Lhamo, Yangchen, Dekyi, Choden, Drolkar, Tsomo, Pema, Diki, Yeshe, Lhakpa, Dechen, Yangzom, Tseten, Kunsang, Palmo, Chime, Sangmo"},
  // Raised to 300 names (Ben 2026-11-13, B3310): given names old (with famous courtesy names) and new, a hundred surnames
  chinese: {
    m: {old: "Wei, Ming, Jun, Jian, Hao, Qiang, Tao, Yong, Guang, Ping, Zhong, De, Wen, Shan, Long, Bo, Feng, Boyan, Zhongda, Mengde, Kongming, Yunchang, Yide, Zilong, Bowen, Zijing, Shiyuan, Wenruo, Gongjin, Xuande, Zhongmou, Youlin, Jingsheng, Shouren, Tingyu, Yuanzhang, Zhengyi, Shanchang, Guofan, Hongzhang, Zongtang, Tongshu, Yanwu, Xiaoru, Jiguang, Chenggong, Sanzhong, Shijie, Youwei, Qichao, Sitong, Daoyuan, Yuanming, Taibai, Zimei, Dongpo, Anshi, Xiyan, Zhuxi, Yangming, Wenzheng, Shaoqing, Mengfu, Shengtan, Xueqin, Banqiao, Ziang, Hanqing, Shixiang, Zhiyuan, Tianyou, Dewei, Wenming, Qingyun, Shouyi, Jinghong, Chongguang, Fuxing, Guoliang, Yaozu, Bangyan, Rulin, Yanshou, Zhaoji",
      new: "Wei, Ming, Jun, Jian, Hao, Qiang, Tao, Yong, Ping, Lei, Bin, Gang, Peng, Bo, Chao, Hui, Kai, Xin, Yu, Hua, Jianguo, Jianhua, Guoqiang, Zhiqiang, Weidong, Hongwei, Haitao, Xiaodong, Xiaoming, Zhiwei, Jianjun, Yongqiang, Dongmei, Wenbin, Jianping, Xiaojun, Haibo, Zhihua, Guoming, Yuxuan, Zihao, Haoran, Yichen, Junjie, Zixuan, Yuhang, Jiahao, Mingyuan, Tianyi, Ruiqi, Shuai, Liang, Feng, Rui, Long, Kun, Fei, Jie, Xiang, Dong"},
    f: {old: "Mei, Lan, Fang, Ying, Xiu, Juan, Hua, Yan, Jing, Xia, Yun, Qing, Lian, Zhen, Yue, Hui, Xiulan, Meiling, Yufen, Shuzhen, Guiying, Zhaojun, Diaochan, Xishi, Wenji, Qingzhao, Daiyu, Baochai, Xiangyun, Yuanchun, Tanchun, Xifeng, Qingwen, Xiren, Yingying, Hongniang, Liniang, Baiyu, Ruolan, Wanru, Yuzhen, Suzhen, Xiaoqing, Jinlian, Pinger, Cuiyun, Lihua, Yulan, Guilan, Shufen, Yuehua, Huifang, Lianyi, Yinping, Zhiruo, Mingyue, Ziyan, Yuyan, Ruyi, Jinzhi, Fengxian, Xiuying, Guizhi, Suyun",
      new: "Mei, Lan, Fang, Ying, Juan, Hua, Yan, Na, Jing, Xia, Yun, Li, Min, Ping, Hong, Jie, Ling, Qian, Wei, Lei, Xiuying, Guilan, Yumei, Xiumei, Lihua, Shulan, Guizhen, Fengying, Haiyan, Xiaoyan, Hongmei, Lili, Yanping, Xiaohong, Jingjing, Tingting, Lina, Yanyan, Xue, Qiong, Rong, Dan, Ting, Yu, Xin, Shan, Yingying, Zihan, Yutong, Xinyi, Ruoxi, Yuxin, Siqi, Jiayi, Yiran, Mengyao, Shiyu, Xiaoyu, Yaxuan, Huimin, Lijuan, Hongyan, Yanhong"},
    fam: "Wang, Li, Zhang, Liu, Chen, Yang, Huang, Zhao, Wu, Zhou, Xu, Sun, Ma, Zhu, Hu, Guo, Lin, Gao, Luo, Zheng, Liang, Xie, Song, Tang, Han, Feng, Deng, Cao, Peng, Zeng, Xiao, Tian, Dong, Pan, Yuan, Cai, Jiang, Yu, Du, Ye, Cheng, Wei, Su, Lu, Ding, Ren, Shen, Yao, Jin, Fu, Zhong, Cui, Tan, Lü, Fan, Wan, Liao, Shi, Jia, Xia, Fang, Bai, Zou, Meng, Xiong, Qin, Qiu, Hou, Yin, Xue, Yan, Duan, Lei, Long, Tao, Mao, Hao, Gu, Gong, Shao, Qian, Kong, Mo, Chang, Kang, Hong, Wen, Niu, Zhuang, Ouyang, Sima, Zhuge, Shangguan, Ge, Lai, Mu, Qi, Ruan, Zuo, Bao"},
  japanese: {
    m: {old: "Tarō, Jirō, Saburō, Shirō, Gorō, Heizō, Genta, Kichibei, Jinbei, Sukezaemon, Tokubei, Yasuke, Matsukichi, Kanbei, Shinsuke, Gonbei",
      new: "Hiroshi, Takeshi, Kenji, Akira, Minoru, Shigeru, Isamu, Kiyoshi, Tadashi, Makoto, Satoshi, Daisuke, Kazuo, Yutaka, Noboru, Ichirō, Takashi, Tsuyoshi"},
    f: {old: "Haru, Natsu, Aki, Fuyu, Hana, Kiku, Ume, Matsu, Take, Tsuru, Kame, Yuki, Ito, Sen, Tomi, Kiyo",
      new: "Yoshiko, Kazuko, Sachiko, Hanako, Fumiko, Kiyoko, Keiko, Michiko, Yōko, Emiko, Akiko, Yumi, Mayumi, Naomi, Tomoko, Megumi, Ayumi, Kaori"},
    fam: "Satō, Suzuki, Takahashi, Tanaka, Watanabe, Itō, Yamamoto, Nakamura, Kobayashi, Katō, Yoshida, Yamada, Sasaki, Yamaguchi, Matsumoto, Inoue, Kimura, Hayashi, Shimizu, Mori"},
  korean: {
    m: "Seong-min, Ji-hun, Hyeon-u, Min-su, Yeong-ho, Jae-seok, Dong-hyeon, Sang-cheol, Cheol-su, Yeong-su, Jong-su, Gwang-su, Tae-yang, Jun-ho, Byeong-cheol, Gi-hun",
    f: "Yeong-hui, Sun-ja, Mi-gyeong, Ji-yeong, Eun-ju, Su-jin, Hye-jin, Min-ji, Yeong-ja, Jeong-suk, Ok-sun, Mal-sun, Bok-sun, Gyeong-hui, Seo-yeon, Ha-eun",
    fam: "Kim, Yi, Pak, Choe, Jeong, Kang, Jo, Yun, Jang, Im, Han, O, Seo, Sin, Gwon, Hwang"},
  vietnamese: {
    m: "Minh, Hùng, Dũng, Tuấn, Long, Quang, Sơn, Hải, Thành, Đức, Bình, Khoa, Phúc, Tâm, Trung, Nam",
    f: "Lan, Hoa, Mai, Hương, Thu, Hà, Linh, Ngọc, Trang, Yến, Thảo, Hồng, Cúc, Liên, Phương, Nga",
    fam: "Nguyễn, Trần, Lê, Phạm, Hoàng, Phan, Vũ, Đặng, Bùi, Đỗ, Hồ, Ngô, Dương, Lý"},
  // Raised to 300 names (B5180): the kings and commoners of Sukhothai and Ayutthaya alone before the surname act of
  // 1913, then modern given names and the family names chosen since
  thai: {
    m: {old: "Ramkhamhaeng, Si Inthrathit, Lithai, Ban Mueang, Lo Thai, Ngua Nam Thom, U Thong, Ramesuan, Borommaracha, Intharacha, Trailok, Chairacha, Chakkraphat, Mahinthrathirat, Thammaracha, Naresuan, Ekathotsarot, Songtham, Prasat Thong, Narai, Phetracha, Thai Sa, Borommakot, Uthumphon, Ekkathat, Taksin, Kosa Pan, Pan, Pin, Mi, Khong, Thong, Duang, Bun, Chan, Kaeo, Mak, In, Phum, Rot, Sing, Saeng, Kham, Ngoen, Lek, Yai, Noi, Mun, Phrom, Thap, Choei, Phet, Dam, Daeng, Chuang, Phlai Kaeo, Rit, Ruang, Sorasak, Chui, Thongdi, Thongduang, Bunma, Bunrot, Thongin, Bunnak, Chuen, Prom, Kong, Sut, Rak, Mueang, Thongkham, Inthon, Kaeo Fa",
      new: "Somchai, Somsak, Prasert, Sombat, Boonmee, Wichai, Suchart, Chaiya, Thongchai, Anan, Kiet, Niran, Prayut, Thaksin, Chuan, Abhisit, Surayud, Sarit, Thanom, Plaek, Pridi, Kukrit, Seni, Prem, Chatichai, Anand, Banharn, Chavalit, Samak, Prawit, Anupong, Apichatpong, Paradorn, Kittisak, Natthawut, Wirat, Chalerm, Suthep, Korn, Pongsak, Surasak, Weerachai, Narong, Thawatchai, Supachai, Thanakorn, Nattapong, Pichai, Sakchai, Santi, Sakda, Udom, Wanchai, Wattana, Yuthana, Chatchai, Apirak, Kraisak, Montri, Pairoj, Praphas, Sanya, Thanin, Kriangsak, Suchinda, Teerapat, Siriwat, Worawit, Kasem, Sunthorn, Boonsong, Charoen, Chamlong, Ekkachai, Jakkrit, Kittipong, Pakorn, Panya, Rangsan, Sompong, Sukit, Tawan, Teerawat, Wiroj"},
    f: {old: "Suriyothai, Si Sudachan, Thepkasattri, Si Sunthon, Chamadevi, Kaeo, Phim, Wanthong, Mo, Chan, Muk, Bua, Duangchan, Kham, Thongkham, Thongyip, Thongyot, Thongsuk, Saisuni, Kesara, Lamduan, Champa, Mali, Kulap, Phikun, Busaba, Prik, Klin, Im, Am, Pheng, Phuang, Ngoen, Yen, Hom, Sombun, Yim, Choi, Iam, Plaeng, Si, Thim, Sai, Nuan, Phloi, Phet, Khaem, Kaeokhao, Duang, Noi, Lamyai, Chaba, Ubon, Rampoei, Sukhon, Kanha, Waen",
      new: "Somying, Malee, Siriporn, Ratana, Kanya, Pensri, Sunee, Wanida, Nok, Dao, Yingluck, Paetongtarn, Sirikit, Sirindhorn, Ubolratana, Chulabhorn, Kanokwan, Kannika, Kultida, Lalita, Nantana, Napaporn, Nittaya, Orapin, Pattama, Pornthip, Pranee, Saowapa, Sasithorn, Siriwan, Somsri, Sudarat, Supaporn, Suwanna, Thida, Tipawan, Usa, Waraporn, Wilai, Yupin, Ampai, Anong, Benjamas, Chalida, Chanida, Duangjai, Jintana, Kanchana, Kesinee, Khanittha, Lamai, Mayuree, Naruemon, Nongnuch, Oranong, Panida, Pimchanok, Ploy, Rungnapa, Sukanya, Thanaporn, Wassana, Yaowalak, Achara, Chomphu, Darunee, Jariya, Kamonwan, Nisa, Pornpimol, Siriluck, Sopha, Wipawee"},
    fam: {new: "Shinawatra, Chan-o-cha, Wongsuwan, Vejjajiva, Leekpai, Panyarachun, Tinsulanonda, Pramoj, Banomyong, Kittikachorn, Thanarat, Choonhavan, Silpa-archa, Yongchaiyudh, Sundaravej, Wongsawat, Thaugsuban, Sirivadhanabhakdi, Chearavanont, Chirathivat, Srivaddhanaprabha, Juangroongruangkit, Paribatra, Kraivixien, Tantiwong, Saetang, Saelim, Saeheng, Saelee, Saeung, Wongsakul, Srisuk, Boonyaratglin, Charoensuk, Rattanakul, Suwannarat, Thongdee, Kaewkla, Phromma, Sombatsiri, Somboon, Chaisiri, Ruangsri, Sukjai, Kongkaew, Phanthong, Bunnag, Amatyakul, Snidvongs, Isarangkun, Kunjara, Sukprasert, Jaidee, Inthasorn, Rattanapong, Suriyawong, Wattanakul, Sriprasert, Ketsuwan, Nilsuwan, Pongsiri, Kaewmanee, Sangsuwan, Chotpradit, Nakhonthap, Wongpanya, Srisawat, Phongphaew, Nimmanhaemin, Chutima, Rojanasakul, Siriwong, Kittiwong, Manotham, Boonchoo, Sirisombat, Thongprasert, Chaiyasit, Buranasiri, Mahasarakham"}},
  // The Khmer of Kambuja (B4740): the kings, queens, priests and officials of the Angkor inscriptions and the
  // chronicles of Longvek and Oudong, then the given and family names of modern Cambodia (family name first)
  khmer: {
    m: {old: "Jayavarman, Suryavarman, Yasovarman, Indravarman, Rajendravarman, Udayadityavarman, Harshavarman, Dharanindravarman, Srindravarman, Jayaviravarman, Narapatindra, Divakara, Yogisvara, Kavindrarimathana, Sangrama, Prithivindra, Kirtipandita, Bhupatindra, Sivacarya, Ponhea Yat, Ang Chan, Ang Duong, Ang Eng, Chey Chettha, Barom Reachea, Satha, Soryopor, Thommo Reachea, Ponhea Nou, Srei Saukonthor",
      new: "Sophal, Sokha, Vannak, Rithy, Sovann, Dara, Vuthy, Kosal, Sambath, Visal, Piseth, Bunthoeun, Sokun, Samnang, Chhay, Narith, Vibol, Rathanak, Sarin, Veasna, Chantha, Ponleu, Vireak, Sothy"},
    f: {old: "Indradevi, Jayarajadevi, Rajendradevi, Kambujalakshmi, Vijayendralakshmi, Tribhuvanadevi, Prana, Narendralakshmi, Jayadevi, Kulaprabhavati, Chakravartirajadevi, Ang Mey, Ang Pen, Ang Snguon, Ang Em, Tep, Pou, Pen, Mau, Neang Kong Rei",
      new: "Sreymom, Sophea, Chanthy, Bopha, Sokunthea, Srey Pov, Channary, Kunthea, Sothea, Davy, Leakhena, Malis, Sopheap, Rachana, Pisey, Thida, Phalla, Chenda, Kolab, Neary"},
    fam: {new: "Sok, Chea, Kim, Heng, Ly, Lim, Seng, Keo, Chan, Pich, Meas, Ouk, Prak, Sam, Sun, Mao, Nhem, Yim, Tep, Long, Chhim, Khiev, Nuon, Ieng, Vann, Hang, Touch, Chhun, Pen, Nou, Om, Sar, Ros, Thach, Phan"}},
  // Raised to 300 names (B5250): the kings, queens, saints and poets of Singhasari, Majapahit, Demak and Mataram, the
  // wayang heroines and the village names of old Java, then the names of modern Java; one name, no family name
  javanese: {
    m: {old: "Raden Wijaya, Jayanegara, Hayam Wuruk, Gajah Mada, Wikramawardhana, Kertanegara, Ken Arok, Anusapati, Tohjaya, Ranggawuni, Airlangga, Jayabaya, Kertarajasa, Nambi, Lembu Sora, Ranggalawe, Kebo Anabrang, Mpu Prapanca, Mpu Tantular, Mpu Sedah, Mpu Panuluh, Sunan Kalijaga, Sunan Ampel, Sunan Bonang, Sunan Giri, Sunan Kudus, Sunan Muria, Raden Patah, Trenggana, Hadiwijaya, Jaka Tingkir, Senopati, Sutawijaya, Agung, Amangkurat, Pakubuwana, Hamengkubuwana, Mangkunegara, Diponegoro, Sentot, Kyai Maja, Trunajaya, Untung Surapati, Arya Penangsang, Ki Ageng Pemanahan, Juru Martani, Sastro, Darmo, Harjo, Kromo, Wongso, Karto, Prawiro, Suto, Joyo, Wiryo, Atmo, Reso, Dipo, Mangun, Tirto, Ronggo, Setro, Sedayu, Sumo, Puspo, Noto, Kerto, Pono, Wiro, Bagus, Jaka, Kebo, Gagak, Lembu",
      new: "Slamet, Joko, Bambang, Agus, Sutrisno, Wahyu, Budi, Hadi, Sugeng, Teguh, Wiranto, Purnomo, Suparman, Harjo, Darmo, Kusno, Sukarno, Suharto, Sudirman, Soepomo, Tjokroaminoto, Ki Hajar Dewantara, Soetomo, Wahidin, Bung Tomo, Pramoedya, Rendra, Sapardi, Gesang, Didi, Sujiwo, Ganjar, Jokowi, Prabowo, Gibran, Kaesang, Bambang Pamungkas, Susilo, Gatot, Hartono, Heru, Iwan, Joko Widodo, Kuncoro, Mulyono, Nugroho, Pratama, Priyanto, Raharjo, Santoso, Setiawan, Sigit, Sriyono, Subagyo, Sudarsono, Sugiharto, Sukardi, Sulistyo, Sumarno, Sunaryo, Supriyadi, Surono, Suryadi, Susanto, Sutarno, Tri, Untung, Wibowo, Widodo, Wijaya, Yanto, Yudi, Dwi, Eko, Adi, Arif, Bayu, Dimas, Fajar, Galih, Hendra, Indra, Rizky, Bejo, Paiman, Sarmin, Tukiman, Ngadiman, Wagino, Suparno, Sukirno, Paimin, Karjo, Jumadi, Sardi, Darsono, Gito, Tarno"},
    f: {old: "Gayatri, Tribhuwana, Dyah Gitarja, Sri Sudewi, Kusumawardhani, Suhita, Ken Dedes, Ken Umang, Dara Petak, Dara Jingga, Rajapatni, Pramodawardhani, Kalinyamat, Ratu Shima, Sekar Kedaton, Nyai Ageng, Roro Jonggrang, Roro Mendut, Dewi Sri, Sumbadra, Srikandi, Sembadra, Banowati, Anjani, Kunti, Drupadi, Larasati, Kenanga, Melati, Sekar, Rara, Endang, Sri, Siti, Wati, Sulastri, Ningsih, Lestari, Dewi, Kartini, Rukmini, Sumiati, Tuti, Yanti, Ratna, Wulan, Ayu, Tumirah, Sainem, Painem, Ngatinah, Sukinah, Wagiyem, Tukiyem, Paijem, Marsinah, Saminah, Kasinem, Legiyem, Tumini, Suminah, Kasih, Ngatiyem, Sutini, Parmi, Warsini, Sumirah, Tarmini, Darsih, Jumiati, Ponirah",
      new: "Megawati, Kartika, Retno, Sri Mulyani, Puan, Ani, Iriana, Ainun, Fatmawati, Sulastri, Endah, Fitri, Indah, Kurniasih, Nur, Nurul, Puji, Purwati, Rahayu, Rini, Setyowati, Sri Wahyuni, Sumarni, Suparmi, Susilowati, Tri Wahyuni, Wahyuningsih, Widyastuti, Winarsih, Yuliana, Yuni, Ambar, Anggun, Anjani, Arum, Asih, Astuti, Ayuningtyas, Dyah, Endang Sri, Handayani, Hartini, Kusuma, Lastri, Murni, Ningrum, Pratiwi, Putri, Ratih, Rina, Sekar Arum, Setyaningsih, Sumarsih, Sundari, Utami, Wening, Widuri, Yuniarti, Anisa, Bunga, Citra, Dian, Galuh, Intan, Laras, Maya, Novi, Siska"}},
  // Raised to 300 names (B5190): the Malacca court, the Hikayat heroes and the village names of the old Malay world,
  // then the names of modern Malaysia and Brunei; bin or binti the father throughout
  malay: {
    m: {old: "Parameswara, Iskandar, Muzaffar, Mansur, Alauddin, Mahmud, Ahmad, Muhammad, Sulaiman, Tuah, Jebat, Kasturi, Lekir, Lekiu, Perak, Mutahir, Badang, Nila Utama, Lebar Daun, Abdul Jalil, Abdul Jamil, Ibrahim, Ismail, Hassan, Husain, Ali, Umar, Usman, Yusuf, Daud, Musa, Isa, Yaakub, Harun, Ishak, Idris, Ilyas, Yunus, Zakaria, Salleh, Hamid, Kassim, Hamzah, Abdullah, Abu Bakar, Jaafar, Talib, Zainal Abidin, Mat, Awang, Lela, Kudin, Lambak, Leman, Jusoh, Ngah, Hitam, Putih, Mamat, Seman, Senik, Bakar, Lazim, Sulong, Kulup, Busu, Uda, Ujang, Bujang, Yahya, Bahaman, Mat Kilau, Said, Mat Salleh, Kadir, Latif, Wahab, Majid, Rahim, Karim, Ghani, Halim",
      new: "Ahmad, Ismail, Hassan, Ibrahim, Osman, Yusof, Abdullah, Rahman, Hamzah, Zainal, Razak, Kassim, Mahathir, Anwar, Najib, Muhyiddin, Ismail Sabri, Abdul Rahman, Hussein, Abdul Razak, Muhammad Hafiz, Mohd Faizal, Azman, Azhar, Aziz, Fauzi, Firdaus, Hafiz, Hakim, Hairul, Hisham, Idham, Izwan, Jamal, Kamal, Khairul, Mazlan, Mohd Nor, Nazri, Noor Azman, Rizal, Rosli, Roslan, Rashid, Shahrul, Shafie, Sufian, Syafiq, Syahmi, Taufik, Zaki, Zulkifli, Zulkarnain, Amir, Aiman, Danial, Farid, Faris, Haziq, Irfan, Imran, Luqman, Naim, Nasir, Rafiq, Ridhwan, Saiful, Shahrizal, Shamsul, Hafizuddin, Azlan, Adnan, Fadzil, Mokhtar, Nizam, Kamaruddin, Ramli, Sabri, Johari, Jamaluddin, Effendi, Fuad, Hanafi, Helmi, Lokman, Marzuki, Nordin, Rosmadi, Saari, Shukri, Yazid, Zahid"},
    f: {old: "Fatimah, Teja, Li Po, Sri Beni, Mahsuri, Kembang, Kudu, Anum, Melor, Melati, Mawar, Cempaka, Kenanga, Seroja, Kemboja, Delima, Embun, Bulan, Bintang, Intan, Mas, Mayang, Dara, Dayang, Esah, Minah, Timah, Jah, Som, Yam, Senah, Tijah, Khatijah, Maimunah, Aminah, Zainab, Halimah, Salmah, Mariam, Aishah, Rahmah, Hasnah, Kalsom, Ramlah, Saodah, Rugayah, Safiah, Habibah, Hawa, Hajar, Sarah, Asiah, Zubaidah, Rabiah, Hamidah, Jamilah, Khadijah, Rubiah, Nafisah, Puteh, Bongsu, Mek",
      new: "Aminah, Fatimah, Zainab, Halimah, Salmah, Rokiah, Noraini, Siti, Aishah, Mariam, Rohani, Zaleha, Nurul Aina, Nur Aisyah, Nurul Izzah, Siti Nurhaliza, Azizah, Rosmah, Nor Hayati, Norliza, Norhaslinda, Nurul Huda, Nur Syafiqah, Nur Atiqah, Nur Fatihah, Nurin, Aina, Alya, Aqilah, Amira, Anis, Aisyah, Balqis, Damia, Dhia, Farah, Fatin, Hana, Haslina, Hasliza, Ilyana, Izzati, Liyana, Maisarah, Marlina, Mazlina, Nabila, Nadia, Najwa, Natasha, Norashikin, Norazlina, Rafidah, Raihana, Rosnah, Rozita, Ruzana, Safura, Shahirah, Suhaila, Suraya, Syahirah, Syazwani, Wardah, Yasmin, Zahirah, Zarina, Zulaikha, Zuraida, Ainul, Hidayah, Faridah, Azura, Fauziah, Hartini, Juliana, Kartika, Maznah, Noriah, Puspa, Rahimah, Salina, Sabariah, Umi Kalthum"},
    child: ["bin", "binti", 1]},
  // The Moro of Mindanao and Sulu: the Maguindanao, Maranao, Tausug and their sultanates (B5000), from the court
  // genealogies (tarsila) and the Spanish and American records, then the family names of the Bangsamoro since
  moro: {
    m: {old: "Kudarat, Kabungsuwan, Dipatuan, Bayan, Barahaman, Jamalul, Azim ud-Din, Badar ud-Din, Muizz ud-Din, Israel, Alimud Din, Bantilan, Pulalun, Mahakuttah, Uto, Piang, Ali, Amai Pakpak, Kalun, Abu Bakr, Makaalang, Malinug, Ampuan, Raja Bongsu, Salibad, Tambilawan",
      new: "Hashim, Nur, Salamat, Abdulmari, Ahmad, Ibrahim, Murad, Ghazali, Jaafar, Mohagher, Esmael, Zaldy, Andal, Abdullah, Khalid, Nurhan, Sharif, Mujiv, Ismael"},
    f: {old: "Tarhata, Piandao, Inda, Sitti, Nur, Fatima, Salima, Mayang, Bolawan, Sakinah, Jamila",
      new: "Tarhata, Sitti, Nur, Fatima, Salima, Amina, Bainon, Johaira, Sittie, Noraida, Jalilah, Rohaida, Samira, Normina"},
    child: ["bin", "binti", 1],
    fam: {new: "Kiram, Piang, Alonto, Lucman, Dimaporo, Misuari, Ampatuan, Mangudadatu, Sinsuat, Pendatun, Abubakar, Sema, Jaafar, Lidasan, Matalam, Tan, Adiong, Macarambon, Dimakuta, Pangarungan, Dumarpa, Balindong, Sangki, Paglas, Masturah, Arbison, Jikiri, Tulawie, Sahali, Hataman, Ututalum"}},
  // The Banyarwanda and Barundi of the kingdoms of Rwanda and Burundi (B5030): the mwami king lists and the court
  // histories, then a church name with an own name of Kinyarwanda or Kirundi, which is not passed to the children
  banyarwanda: {
    m: {old: "Ruganzu, Cyilima, Kigeli, Mibambwe, Yuhi, Mutara, Rwabugiri, Musinga, Ntare, Mwezi, Mutaga, Mwambutsa, Gihanga, Rudahigwa, Ndori, Rwogera, Gahindiro, Mazimpaka, Ruhinankiko, Rwakagara, Kabare, Ntwari, Habimana, Mugabo, Ndayisaba, Bizimana, Nkurunziza, Hakizimana, Nsengiyumva, Ndikumana",
      new: "Jean, Pierre, Emmanuel, Jean-Baptiste, Joseph, Innocent, Théogène, Alphonse, Déogratias, Félicien, Pascal, Eric, Patrick, Olivier, Fabrice, Claude, Aimable, Célestin"},
    f: {old: "Kanjogera, Nyiramavugo, Nyirarumaga, Uwimana, Mukamana, Uwase, Ingabire, Umutoni, Mutesi, Uwera, Mukeshimana, Nyiramana, Kankindi, Kayitesi, Murekatete, Mukandoli, Nyirabukara",
      new: "Marie, Jeanne, Claudine, Immaculée, Speciose, Béatrice, Chantal, Josiane, Diane, Aline, Solange, Grâce, Clarisse, Espérance, Vestine, Pélagie"},
    fam: {new: "Habimana, Uwimana, Mugabo, Ndayisaba, Bizimana, Nkurunziza, Hakizimana, Nsengiyumva, Ndikumana, Niyonzima, Uwase, Ingabire, Mukamana, Mutesi, Uwera, Mukeshimana, Niyonsaba, Nshimiyimana, Twagiramungu, Munyaneza, Nzeyimana, Ntirenganya, Nizeyimana, Irakoze, Ndayishimiye, Bigirimana, Ntakirutimana, Kwizera, Iradukunda, Manirakiza, Nduwimana, Havyarimana"}},
  mande: {
    m: "Sundiata, Mamadou, Moussa, Bakary, Seydou, Modibo, Amadou, Ibrahima, Lassana, Boubacar, Souleymane, Fodé, Sékou, Tiémoko, Drissa, Oumar",
    f: "Fatoumata, Aminata, Mariam, Kadiatou, Oumou, Awa, Sogolon, Djénéba, Rokia, Bintou, Salimata, Nana, Assetou, Korotoumou, Hawa, Ramata",
    fam: "Keita, Traoré, Koné, Diarra, Coulibaly, Touré, Cissé, Kouyaté, Diabaté, Konaté, Sissoko, Camara, Doumbia, Sangaré, Dembélé, Fofana"},
  yoruba: {
    m: "Adebayo, Oluwaseun, Babatunde, Olumide, Ayodele, Kayode, Femi, Segun, Tunde, Kunle, Gbenga, Adewale, Akin, Dele, Jide, Rotimi, Tayo, Wale",
    f: "Yetunde, Folake, Funmilayo, Bisi, Ronke, Titilayo, Abimbola, Omolara, Adunni, Morenike, Bukola, Sade, Yewande, Toyin, Kemi, Iyabo, Remi, Bola",
    fam: "Adeyemi, Ogunleye, Oyelaran, Afolabi, Akinola, Olatunji, Fashola, Ogunbanjo, Balogun, Adekunle, Okunola, Odukoya, Ajayi, Alabi, Bello"},
  akan: {
    m: "Kwasi, Kwadwo, Kwabena, Kwaku, Yaw, Kofi, Kwame, Osei, Opoku, Boakye, Owusu, Agyeman, Antwi, Addo, Badu",
    f: "Akosua, Adwoa, Abena, Akua, Yaa, Afua, Ama, Serwaa, Pokuaa, Nyarko, Konadu, Boatemaa, Dufie, Asantewaa, Oforiwaa, Frema",
    fam: "Mensah, Owusu, Osei, Boateng, Asante, Appiah, Agyei, Amoako, Ofori, Ansah, Darko, Acheampong, Bonsu, Gyamfi, Sarpong, Yeboah"},
  // Raised to 300 names (B5260): the sultans, poets and traders of Kilwa, Mombasa, Lamu and Zanzibar and the Mwana
  // names of the coast's women, then the names of modern Tanzania and Kenya; bin or binti the father throughout
  swahili: {
    m: {old: "Juma, Hamisi, Bakari, Salim, Rashidi, Omari, Athumani, Mwinyi, Khamis, Abdallah, Hassani, Said, Mohamedi, Shabani, Ramadhani, Makame, Sulaimani, Daudi, Fumo, Fumo Liongo, Mwinyi Mkuu, Mwana Mkisi, Shaka, Mkama, Abubakari, Ahmadi, Barghash, Majid, Hamoud, Mbaruk, Ali, Muhammadi, Mwenye, Hamadi, Kassimu, Musa, Isa, Yusufu, Haruna, Ishaka, Ibrahimu, Ismaili, Yakubu, Zakaria, Idrisa, Iddi, Saleh, Selemani, Hamza, Mussa, Issa, Kombo, Mzee, Chande, Rajabu, Shaibu, Sefu, Uledi, Tippu Tip, Rumaliza, Bushiri, Abushiri, Hemedi, Mwalimu, Mbwana, Nassoro, Faki, Abdurahmani, Hamidu, Harithi, Kibwana, Mwichande, Mbarouk, Mwinyikheri, Nasoro, Salimu, Shee, Swaleh, Tamimu, Twaha, Wazir, Zahoro, Zubeiri, Athman, Fakihi, Hija, Jabu, Jongo, Kitwana, Machano, Mataka, Mzale, Pandu, Simba, Sharifu, Bwanaheri, Mselem",
      new: "Julius, Jakaya, Benjamin, Ali Hassan, John, Abeid, Amani, Baraka, Daudi, Emmanuel, Frank, Godfrey, Hamisi, Ibrahim, Joseph, Kassim, Khalid, Mohamed, Mussa, Nassor, Omar, Peter, Rashid, Salum, Seif, Suleiman, Yahya, Zuberi, Jabiri, Juma, Haji, Abdulrahman, Abdulla, Hassan, Hussein, Idrissa, Ismail, Jumanne, Kheri, Makame, Masoud, Mbaraka, Mwinyi, Nuhu, Othman, Ramadhani, Rajab, Saidi, Shaban, Shomari, Sudi, Tumaini, Uhuru, Ussi, Wambura, Zahor, Ahmed, Bakari, Faraji, Hemed, Jumaa, Khamis, Mahmoud, Mansour, Selemani, Ahmada, Aboud, Bilal, Fadhili, Gharib, Hilal, Jaffar, Karim, Kombo, Mohammed, Muhidin, Ameir, Ally, Bashir, Daniel, Elias, Felix, George, Gerald, Isaya, James, Kelvin, Lameck, Michael, Nelson, Patrick, Paul, Richard, Samuel, Stephen, Thomas, Wilson, Yusuph"},
    f: {old: "Mwanaisha, Zuhura, Mwanajuma, Asha, Fatuma, Halima, Zainabu, Rehema, Amina, Saida, Mwanaidi, Khadija, Riziki, Subira, Neema, Tatu, Mwana Mkisi, Mwana Kupona, Mwanasha, Mwanahawa, Mwanamisi, Mwanatumu, Mwanaharusi, Mwanahamisi, Mwanaarafa, Mwamvita, Mwanakombo, Salme, Khole, Chole, Mwanamwema, Mwanatabu, Mwajuma, Mwasiti, Mwanaheri, Mwanabaraka, Mwanaime, Mwanakhamis, Mwanaasha, Mwanamkuu, Mwanaisa, Mwanabibi, Bibi, Somoe, Mwatime, Mwanaidi Shaha, Kibibi, Mwanamani, Mwanaali, Mwanajaha, Mwanaikiza, Mwanahija, Mwanamvua, Mwanapili, Mwanawetu, Siti, Arafa, Bahiya, Kijakazi, Mboni, Mwanamtama, Shani, Tabia, Ukuu, Wanu, Zuwena, Mwanakhamisi",
      new: "Samia, Asha, Fatma, Hadija, Mariamu, Rukia, Salma, Shamsa, Tabu, Upendo, Zawadi, Zuhura, Aisha, Amina, Anna, Esther, Grace, Happiness, Imani, Jamila, Joyce, Lucy, Mwanaisha, Nasra, Nuru, Rahma, Rehema, Saada, Sabra, Safia, Saida, Sharifa, Siti, Sophia, Tatu, Wema, Zainab, Zaituni, Zakia, Zena, Ashura, Bahati, Dafrosa, Eliza, Faraja, Furaha, Halima, Hawa, Hidaya, Husna, Jesca, Mwajuma, Mwanaidi, Mwanahawa, Neema, Pendo, Riziki, Saumu, Sikudhani, Subira, Tumaini, Mwanahamisi, Asina, Fatuma, Khadija, Mwanakheri, Mwasiti, Agnes, Anastasia, Beatrice, Catherine, Dorah, Editha, Florence, Gloria, Irene, Josephine, Mercy, Rose, Stella, Veronica"},
    child: ["bin", "binti", 1]},
  // Raised to 300 names (B5280): the Zagwe and Solomonic kings and queens, the saints and the court of Gondar in the
  // old ages, then the names of modern Ethiopia
  amharic: {
    m: {old: "Yekuno Amlak, Amda Seyon, Sayfa Arad, Dawit, Tewodros, Yeshaq, Zara Yaqob, Baeda Maryam, Eskender, Naod, Lebna Dengel, Gelawdewos, Minas, Sarsa Dengel, Yaqob, Za Dengel, Susenyos, Fasilides, Yohannes, Iyasu, Bakaffa, Iyoas, Tekle Haymanot, Tekle Giyorgis, Lalibela, Yemrehana Krestos, Naakueto Laab, Harbe, Gebre Meskel, Abba Giyorgis, Ewostatewos, Filipos, Zara Buruk, Takla Hawaryat, Abuna Selama, Mikael Sehul, Ali, Wube, Kassa, Sahle Selassie, Haile Melekot, Menelik, Abraham, Gebre, Wolde, Habte, Hailu, Mekonnen, Mengesha, Desta, Asfaw, Gebre Egziabher, Tekle, Yohannes Kidane, Wolde Mikael, Gebre Selassie, Haile Mariam, Kidane Mariam, Walda Giyorgis, Tesfa Seyon, Gebre Krestos, Fikre Selassie, Atnatewos, Marqos, Esayas, Henok, Dawit Kassa, Ezana, Kaleb, Gebre Medhin, Gebre Hanna, Wolde Gabriel, Gebre Tsadik, Tekle Mariam, Wolde Yohannes, Haile Giyorgis, Gebre Iyesus, Kinfe, Asrat, Bezabih, Mamo, Tessema, Gugsa, Imru",
      new: "Haile, Tesfaye, Girma, Bekele, Abebe, Kebede, Tadesse, Mulugeta, Dawit, Solomon, Getachew, Alemayehu, Worku, Zewde, Lemma, Haile Selassie, Mengistu, Meles, Abiy, Hailemariam, Tewodros, Yohannes, Menelik, Afewerk, Tilahun, Teddy, Mahmoud, Berhanu, Birhane, Biniam, Daniel, Dereje, Elias, Ermias, Eyob, Fasil, Fikru, Gashaw, Getahun, Habtamu, Henok, Kassahun, Kidus, Melaku, Mesfin, Mintesinot, Nahom, Negash, Robel, Samuel, Seifu, Seyoum, Shiferaw, Sileshi, Tamrat, Tekalign, Temesgen, Tsegaye, Wondimu, Yared, Yonas, Zelalem, Abel, Abraham, Amanuel, Ashenafi, Bereket, Dagim, Ephrem, Fitsum, Gizachew, Kaleb, Mekonnen, Mulatu, Natnael, Sisay, Tariku, Wubshet, Abebaw, Adane, Alemu, Ayele, Belay, Demeke, Endalkachew, Gedion, Mesay, Wondwossen"},
    f: {old: "Taytu, Zewditu, Mentewab, Eleni, Seble Wongel, Walatta Petros, Krestos Samra, Mumet, Wubit, Menen, Tewabech, Tiruwork, Yewubdar, Walatta Giyorgis, Walatta Maryam, Seyon Mogesa, Zan Hayla, Fre Seyon, Amata Giyorgis, Sabla Wangel, Romana Werq, Bihonegn, Workit, Dinkinesh, Desta, Gudit, Mesker, Tsige, Laqech, Fantaye, Bezunesh, Tsehaytu, Wubalem, Woyzaro, Askale, Zenebech, Tewabe, Yeshimebet, Wolete Iyesus, Mazegaby, Mestawot, Hirut, Ayalnesh, Tiruye, Leteberhan, Belaynesh, Mulunesh, Atsede, Zewdie, Abeba, Tenagne, Walatta Krestos, Etege, Seble, Wossen, Tsehai, Yetemegnu, Altash, Shewaye",
      new: "Aster, Almaz, Tigist, Genet, Meseret, Selamawit, Tsehay, Worknesh, Abebech, Bethlehem, Marta, Saba, Tirunesh, Derartu, Fatuma, Genzebe, Sahle-Work, Birtukan, Mulu, Senait, Tsion, Hana, Liya, Meron, Rahel, Ruth, Sara, Selam, Yordanos, Bezawit, Eden, Feven, Helen, Kidist, Lidya, Mahlet, Mekdes, Mihret, Netsanet, Rediet, Simret, Tsedey, Yeshi, Alem, Asnaket, Azeb, Banchi, Etenesh, Fikirte, Hiwot, Konjit, Lemlem, Meaza, Medhanit, Nardos, Rakeb, Saron, Tigest, Tirhas, Wagaye, Yewbdar, Zebiba, Elsabet, Emebet, Firehiwot, Gelila, Haregewoin, Kokeb, Martha, Aynalem, Bethel, Mekdelawit, Rahwa, Samrawit, Tsigereda, Yamrot, Yodit, Mestawet, Tsehaynesh"},
    // The second name is the father's given name
    child: ["", "", 1]},
  // The Amazigh (Berbers) of the Kabylie, the Rif, the Atlas and the Sous (B4710): the dynasts and saints of the
  // Almoravid, Almohad, Zirid and Marinid records, then the Kabyle and Moroccan given and family names since
  amazigh: {
    m: {old: "Yusuf, Tashfin, Ali, Ibrahim, Yahya, Abu Bakr, Tumart, Abd al-Mumin, Yaqub, Muhammad, Idris, Ziri, Buluggin, Hammad, Badis, Yaghmurasan, Abd al-Haqq, Abu Yusuf, Tariq, Kusayla, Hassan, Umar, Musa, Isa, Daud, Mansur, Wattas, Zayyan, Tamim, Muizz, Mazigh, Yidir, Mennad, Amghar, Ishaq, Abd Allah, Uthman, Ismail",
      new: "Idir, Massinissa, Yuba, Aksil, Amastan, Mouloud, Lounes, Arezki, Ferhat, Saïd, Mokrane, Ameziane, Hocine, Mohand, Akli, Ali, Ahmed, Moha, Brahim, Lahcen, Hammou, Mbark, Lhoussaine, Omar, Youssef, Mustapha, Rachid, Kamel, Slimane, Belaïd, Mehdi, Karim"},
    f: {old: "Zaynab, Tinhinan, Dihya, Fatima, Aisha, Kanza, Khadija, Tamima, Hawwa, Mariam, Tanina, Tafsut, Taous, Zahra, Safiyya, Mimuna, Itto, Yamina, Fadhma",
      new: "Tiziri, Tanina, Dihya, Tafsut, Taous, Fadhma, Tassadit, Ouardia, Djamila, Tinhinane, Kahina, Itto, Tamazight, Lynda, Nadia, Fatima, Zahra, Aïcha, Malika, Yamina, Ouiza, Dahbia, Tounsia, Fadma, Khadija, Hayat, Amina"},
    child: ["ibn", "bint", 3],
    fam: {old: "al-Lamtuni, al-Masmudi, al-Sanhaji, al-Zanati, al-Kutami, al-Hawwari, al-Nafusi, al-Ghumari, al-Hintati, al-Jazuli, al-Lamti, al-Miknasi, al-Awrabi, al-Maghrawi, al-Ifrani, al-Matghari, al-Kumi, al-Masufi, al-Guddali, al-Tinmalli, al-Zayyani, al-Wattasi, al-Marini",
      new: "Aït Ahmed, Feraoun, Mammeri, Amrouche, Matoub, Aït Menguellet, Ouyahia, Aït Ali, Amellal, Belaïd, Haddadi, Aït Hamouda, Ouali, Mokrani, Sadi, Mehenni, Lounès, Tighilt, Akhannouch, Oufkir, Aherdane, Oubaha, Chafik, Azaykou, Boukous, Ouzzine, Aït Baha, Ouhadi, Aït Lahcen, Bouzid, Ihaddaden, Oussedik, Aït Saada"}},
  // Sephardi Jews of Sefarad (Castile, Aragon, Portugal) to 1492, then of Thessaloniki, Constantinople, the Maghreb and
  // Amsterdam (B4730): names from the aljama and notarial records, the Ladino communities and the Portuguese Nation
  sephardi: {
    m: {old: "Yehuda, Shelomo, Mosse, Yuçaf, Yuçe, Abraham, Isaac, Samuel, Jacob, David, Hasdai, Bahya, Todros, Meir, Vidal, Bonafos, Astruc, Profet, Zerahiah, Menahem, Hayyim, Crescas, Joseph, Ezra, Mair, Bonjuha, Abram",
      new: "Avram, Ishak, Moshe, Yaakov, Yosef, Haim, Shabetay, Eliyahu, Menahem, Daniel, Raphael, David, Samuel, Isaac, Salomon, Benjamin, Elias, Alberto, Leon, Jacques, Maurice, Victor, Moïse, Joseph, Baruch, Manuel, Duarte, Uriel"},
    f: {old: "Jamila, Oro, Bellida, Dona, Reina, Sol, Esther, Mira, Clara, Bienvenida, Estrella, Luna, Duenya, Preciosa, Velida, Sara, Rica, Bonadona, Astruga, Gracia",
      new: "Rebeka, Sarina, Reyna, Sultana, Djoya, Allegra, Bulisa, Rachel, Esther, Fortunée, Matilde, Rosa, Luna, Estrella, Sol, Vida, Mazaltov, Gracia, Bienvenida, Clara, Ines, Rica, Simha, Perla"},
    fam: {old: "Abravanel, Benveniste, Ibn Ezra, Ibn Tibbon, Halevi, Abulafia, Crescas, Albalag, Alfakhar, Ibn Shushan, Ibn Nahmias, Ibn Verga, Sasportas, Caballería, Senior, Ibn Zadok, Alconstantini, Ravaya, Bonafed, Gerondi, Saporta, Toledano, Carcassona, Najara",
      new: "Toledano, Saporta, Benveniste, Carasso, Modiano, Alhadeff, Angel, Benaroya, Covo, Pardo, Franco, Gattegno, Matalon, Navarro, Nahmias, Saltiel, Cohen, Levi, Halfon, Benbassat, Abolafio, Molho, Recanati, Mallah, de Pinto, Mendes, Lopes Suasso, Curiel, Belmonte, Teixeira, Henriques, da Costa, Castro, Pereira"}},
  // Mizrahi Jews of Baghdad, Persia, Yemen, Egypt and the Maghreb (B4731): names from the Cairo Geniza, the Baghdad and
  // Persian communities and the Yemenite and Maghrebi families since
  mizrahi: {
    m: {old: "Saadia, Sherira, Hai, Natan, Yosef, Daniel, Shemuel, Yehuda, Avraham, Yishaq, Halfon, Nissim, Sason, Ezra, Yaish, Mevorakh, Netanel, Hizkiyahu, Yefet, Faraj, Khalaf, Mukhtar, Abu Imran, Maimun, Musa, Harun, Yahya, Yeshua",
      new: "Ezra, Sasson, Nissim, Saleh, Menashe, Yosef, Eliyahu, Shaul, Naim, David, Yehezkel, Shlomo, Haron, Moshe, Yaakov, Shalom, Yihya, Avraham, Mordechai, Ovadia, Rahamim, Selim, Yitzhak, Khedouri, Meir, Hai"},
    f: {old: "Sitt al-Dar, Sitt al-Husn, Karima, Wuhsha, Sitt al-Ahl, Mulk, Ghaliya, Sara, Rivka, Esther, Mazal, Hanna, Simha, Sitt al-Sada, Nasiba, Thamar, Bahja, Sultana",
      new: "Farha, Masuda, Naima, Marcelle, Regina, Simha, Mazal, Tova, Rachel, Habiba, Salha, Louise, Aziza, Hanna, Shoshana, Ruth, Miriam, Esther, Rivka, Yona, Batya, Malka, Bracha, Sultana, Ziva"},
    child: ["ben", "bat", 3],
    fam: {old: "ha-Kohen, ha-Levi, al-Baghdadi, al-Fasi, al-Tustari, al-Maghribi, al-Halabi, al-Ammani, al-Iskandarani, ha-Bavli, al-Sanaani, al-Dimashqi, al-Qabisi, al-Tahiri",
      new: "Sassoon, Kadoorie, Shasha, Somekh, Shamash, Dangoor, Twena, Basri, Moallem, Shohet, Elias, Gabbay, Zilkha, Hakim, Sehayek, Kohen, Levi, Mizrahi, Hakimian, Elghanayan, Nazarian, Kashani, Sharabi, Tzadok, Damari, Nahari, Kafih, Hamami, Abergel, Ohayon, Azoulay, Bitton, Elbaz, Dahan, Amsalem, Benchetrit, Ohana, Assaraf"}},
  // The Tuareg (Kel Tamasheq) of the Ahaggar, the Aïr and the Niger bend (B4950): the amenokals and chiefs of the
  // French and Arabic records and the given names since, with "ag" (son of) and "welet" (daughter of) the father
  tuareg: {
    m: "Moussa, Amastan, Attici, Ahitaghel, Akhamouk, Kaocen, Firhoun, Mano, Intalla, Iyad, Alla, Bay, Hama, Mohammed, Ibrahim, Aghali, Ahmed, Abdallah, Ghali, Rissa, Alhassane, Amoumine, Elmehdi, Ilyas, Mohamed Ali, Effad, Assalat, Koudede, Abdoulahi, Ousmane",
    f: "Tin Hinan, Dassine, Fadimata, Takamat, Tahenkot, Aïchatou, Mariama, Tamou, Fatimata, Khadija, Zeinabou, Aminatou, Raichatou, Tina, Assia, Hadiza, Mina, Tanina",
    child: ["ag", "welet", 1]},
  zulu: {
    m: "Sipho, Themba, Bongani, Mandla, Sibusiso, Nkosana, Mthunzi, Dumisani, Jabulani, Vusumuzi, Zwelakhe, Mzwandile, Lungile, Siyabonga, Senzo, Bheki",
    f: "Nomvula, Thandiwe, Nomsa, Zanele, Lindiwe, Busisiwe, Nokuthula, Sibongile, Ntombi, Thandeka, Nonhlanhla, Zodwa, Khanyisile, Nomusa, Ayanda, Hlengiwe",
    fam: "Zulu, Khumalo, Dlamini, Ndlovu, Mkhize, Ngcobo, Buthelezi, Mthembu, Nxumalo, Cele, Shezi, Zungu, Gumede, Mthethwa, Ntuli, Sithole"},
  // Raised to 300 names (B5230): the tlatoque, captains and calendar names of the Mexica, Acolhua and Tlaxcalteca
  // before the conquest; a church name and a Nahuatl or Spanish family name from the records of New Spain and since
  nahua: {
    m: {medieval: "Cuauhtli, Ocelotl, Coatl, Tochtli, Mazatl, Cipactli, Ehecatl, Tecpatl, Itzcoatl, Chimalli, Yaotl, Tlacaelel, Cuauhtemoc, Acamapichtli, Xolotl, Tezozomoc, Huitzilihuitl, Chimalpopoca, Moctezuma, Axayacatl, Tizoc, Ahuitzotl, Cuitlahuac, Nezahualcoyotl, Nezahualpilli, Cacamatzin, Ixtlilxochitl, Totoquihuaztli, Maxtla, Xicotencatl, Tlahuicole, Tenoch, Huemac, Topiltzin, Mixcoatl, Quinatzin, Techotlala, Coanacoch, Tetlepanquetzal, Tlilpotonqui, Ce Acatl, Ome Tochtli, Tochtzin, Cuetlachtli, Itztli, Ozomatli, Cuauhtlatoa, Tlacotzin, Motelchiuh, Atlixcatl, Temilotzin, Ecatzin, Coyohuehuetzin, Opochtli, Huitzilin, Quauhpopoca, Pinotl, Cuauhcoatl, Quauhtlequetzqui, Tenancacaltzin, Moquihuix, Tlacahuepan, Macuilmalinal, Chalchiuhtlatonac, Ixtlilcuechahuac, Cuacuauhpitzahuac, Tozcuecuex, Chicome Ehecatl, Macuil Tochtli, Matlactli Cuauhtli, Ce Ocelotl, Nauhyotl, Ilhuicamina",
      "early-modern,industrial,modern": "Juan, Pedro, Francisco, Diego, Martín, Andrés, Pablo, Miguel, Gabriel, Antonio, Domingo, Bartolomé, Baltasar, Gaspar, Melchor, Lucas, Mateo, Marcos, Felipe, Agustín, Toribio, Bernardino, Hernando, Lorenzo, Cristóbal, Sebastián, Tomás, Juan Bautista, Juan Diego, Fernando, Alonso, Esteban, José, Nicolás, Matías, Simón, Jacinto, Isidro, Ignacio, Ambrosio, Pascual, Cirilo, Anselmo, Atanasio, Benito, Crispín, Eleuterio, Eusebio, Fidencio, Gerardo, Hilario, Inocencio, Leobardo, Macario, Nazario, Odilón, Porfirio, Refugio, Rutilio, Silvestre, Teodoro, Timoteo, Valentín, Zeferino, Emiliano, Florencio, Jesús, Margarito, Reyes, Tranquilino"},
    f: {medieval: "Xochitl, Citlalli, Papalotl, Teicuih, Tlaco, Xoco, Teyacapan, Atototl, Chalchiuhnenetzin, Malinalli, Quetzalli, Tecuichpo, Ilancueitl, Matlalxochitl, Azcalxochitl, Huitzilxochitl, Atotoztli, Tlapalizquixochtzin, Miahuaxihuitl, Xiuhcanahualtzin, Papantzin, Ayauhcihuatl, Necahual, Mocel, Tiacapan, Yohualtzin, Tepin, Xiuhtzin, Chimalxochitl, Cozcatl, Quetzalxochitl, Eztli, Ameyalli, Izel, Nochtli, Tozquentzin, Chipahua, Cuicatl, Tonalxochitl, Mazaxochitl, Tlazohtzin, Atzin, Citlalxochitl, Yolotl, Yoloxochitl, Quiauhxochitl, Citlalmina, Teucxoch, Cihuaxoch, Ce Malinalli, Ome Xochitl, Macuilxoch, Tlacoehuatzin, Xilotzin, Ayotzin",
      "early-modern,industrial,modern": "María, Juana, Ana, Catalina, Magdalena, Isabel, Francisca, Inés, Luisa, Marta, Elena, Lucía, Clara, Agustina, Bárbara, Petronila, Úrsula, Melchora, Gerónima, Antonia, Beatriz, Cecilia, Leonor, Mónica, Paula, Tomasa, Josefa, Manuela, Micaela, Rosa, Guadalupe, Dolores, Refugio, Soledad, Socorro, Candelaria, Concepción, Encarnación, Felícitas, Herminia, Inocencia, Leocadia, Macaria, Natividad, Petra, Rufina, Silveria, Teófila, Victoriana, Zenaida, Asunción, Celerina, Delfina, Eulalia, Florentina, Hermelinda, Juliana, Martina, Ofelia, Reyna, Virginia, Yolanda, Esperanza, Eufemia"},
    fam: {"early-modern,industrial,modern": "Moctezuma, Ixtlilxóchitl, Xicoténcatl, Cuautle, Tecuatl, Tecanhuey, Cuapio, Xochihua, Tepoz, Cocotle, Tlapale, Xicale, Coatl, Tecpanecatl, Cuaxiloa, Tlatelpa, Chimal, Tlacuilo, Coyotl, Ocotl, Cuatecontzi, Tecuapacho, Xochicale, Tlaseca, Tzompantzi, Hernández, Martínez, Cruz, Santiago, de la Cruz, Bautista, Ramírez, Flores, Reyes, Sánchez, Pérez, Ramos, García, Domínguez, Rosas, Morales, Castillo, Mendoza, Torres, Galicia, Tapia, Sandoval, Ortiz, Vázquez, Gaspar, Antonio, Francisco, Alvarado, Velasco, Guzmán, Aquino, Zárate, de los Santos, de la Rosa, Rosales, Salvador, Tolentino, Bernabé, Lucas, Marcial, Clemente, Simón, Mateo"}},
  // the Maya of Yucatán, the Petén and the highlands (B3830)
  maya: MAYA,
  // Raised to 300 names (B5200): the Inca kings, queens and captains and the Quechua names of the Tawantinsuyu
  // before the conquest; a church name and a Quechua family name from the records of the viceroyalty and since
  quechua: {
    m: {medieval: "Manco Cápac, Sinchi Roca, Lloque Yupanqui, Mayta Cápac, Cápac Yupanqui, Inca Roca, Yáhuar Huácac, Viracocha, Pachacútec, Túpac Yupanqui, Huayna Cápac, Huáscar, Atahualpa, Manco, Sayri Túpac, Titu Cusi, Túpac Amaru, Paullu, Quizquiz, Rumiñahui, Chalcuchímac, Ollantay, Apu Mayta, Vicaquirao, Cusi Yupanqui, Amaru, Huallpa, Rumi, Quispe, Inti, Kuntur, Wayra, Titu, Cusi, Sinchi, Yupanqui, Túpac, Ninan Cuyochi, Huanca Auqui, Quilaco, Atoc, Uturunku, Puma, Waman, Anka, Hatun, Illapa, Pacha, Sayri, Mayta, Huaman, Rimachi, Apu, Yawar, Chuqui, Huaraca, Ayar Manco, Ayar Cachi, Ayar Uchu, Ayar Auca, Tocay Cápac, Challco, Antay, Achachi, Urco, Willka, Tito Atauchi, Mayta Yupanqui, Hualpa Túpac, Cusi Huallpa, Inca Urcon, Pumacahua",
      "early-modern,industrial,modern": "Felipe, Diego, Juan, Mateo, Pablo, Francisco, Pedro, Martín, Cristóbal, Bartolomé, Sebastián, Andrés, Gaspar, Melchor, Baltasar, Tomás, Lorenzo, Domingo, Alonso, Gabriel, José, Mariano, Gregorio, Agustín, Santiago, Esteban, Ignacio, Fermín, Faustino, Celestino, Eusebio, Florencio, Hilario, Leandro, Marcelino, Nicanor, Teodoro, Valentín, Zacarías, Cirilo, Damián, Evaristo, Gumersindo, Hipólito, Justo, Leoncio, Modesto, Nemesio, Pascual, Rufino, Saturnino, Severino, Tiburcio, Víctor, Wilfredo, Edwin, Wilber, Percy, Yuri, Elmer, Nilo, Hugo, Raúl, Jaime, Freddy, Walter, Rolando, Teófilo, Isidro, Lucio, Rubén"},
    f: {medieval: "Mama Ocllo, Mama Huaco, Chimpu Ocllo, Cusi Rimay, Mama Anahuarque, Rahua Ocllo, Cura Ocllo, Quispe Sisa, Asarpay, Chuqui Huipa, Cusi Coyllur, Mama Cori, Ipa Huaco, Micay, Tocto Coca, Curi Ocllo, Inquill, Cori, Killa, Urpi, Chaska, Sumaq, T'ika, Illari, Asiri, Anahuarque, Ocllo, Chimpu, Phuyu, Kantu, Mayu, Paqari, Nina, Wayta, Sisa, Pillpintu, Yuraq, Killari, Rimay, Suyay, Kusi, Nayra, Qhantu, Allpa, Coyllur, Huaco, Rahua, Cura, Mama Rahua, Mama Micay, Chuqui Llantu, Tocto Ocllo, Cusi Chimpu, Inti Illapa, Qori Ñawi, Ch'aska Qoyllur",
      "early-modern,industrial,modern": "María, Juana, Catalina, Isabel, Francisca, Inés, Ana, Magdalena, Beatriz, Petrona, Tomasa, Micaela, Gregoria, Asunción, Natividad, Concepción, Dominga, Justina, Sebastiana, Santusa, Felipa, Paulina, Rosa, Martina, Leonarda, Melchora, Basilia, Victoria, Eusebia, Gumercinda, Florencia, Hilaria, Celestina, Teodora, Jacinta, Marcelina, Valentina, Benedicta, Lucía, Antonia, Agustina, Nicolasa, Andrea, Candelaria, Rufina, Saturnina, Clotilde, Epifanía, Modesta, Flora, Yolanda, Nélida, Elena, Lourdes, Yesenia, Maribel, Roxana, Luz Marina, Ruth, Gladys, Delia, Hilda, Norma, Marleni, Edith, Sonia, Rocío, Vilma, Silvia"},
    fam: {"early-modern,industrial,modern": "Quispe, Huamán, Condori, Ccori, Huallpa, Yupanqui, Cusi, Inca, Túpac, Ticona, Choque, Chambi, Apaza, Huanca, Cutipa, Ccahua, Huaraca, Pumacahua, Poma, Sinchi, Rimachi, Puma, Chalco, Atoc, Ccallo, Ccasa, Ccopa, Cjuno, Huillca, Huarcaya, Illa, Llamocca, Machaca, Mayta, Ninancuro, Pacco, Paucar, Pillco, Quilla, Quilca, Sallo, Soncco, Sutta, Taipe, Tito, Ttito, Usca, Vilca, Yauri, Yucra, Achahui, Allcca, Anccasi, Auccapuri, Cahuana, Cayllahua, Challco, Chura, Coaquira, Colque, Huaylla, Huayhua, Inquilla, Layme, Lloclla, Ñaupa, Pari, Quico, Saico, Sencia, Supo, Tacuri, Ttupa, Uchuri, Mamani, Cama, Huacho, Tintaya, Huisa, Ayme"}},
  maori: {
    m: {old: "Tāne, Rangi, Tama, Kupe, Rua, Tū, Kahu, Manaia, Whetū, Hotu, Toa, Te Ariki, Māui, Tiki, Rongo, Pōtiki",
      new: "Wiremu, Hōne, Hēmi, Pita, Rāwiri, Mikaere, Tipene, Hoani, Tāne, Rangi, Tama, Manu, Nikau, Ariki, Tāmati, Paora"},
    f: {old: "Hine, Aroha, Ngaio, Kiri, Huia, Marama, Whetū, Moana, Tui, Awhina, Pania, Wairaka, Hinemoa, Kahurangi, Rongomai, Te Ao",
      new: "Mere, Aroha, Hine, Ngaio, Kiri, Huia, Marama, Moana, Tui, Awhina, Ani, Rāhera, Mākere, Kahurangi, Anahera, Ataahua"},
    fam: {new: "Ngata, Parata, Tamihana, Pōmare, Hēnare, Kereama, Paewai, Wihongi, Tūrei, Harawira, Horomona, Karaka, Tīpene, Wētere"}},
  // Raised to 300 names (B5270): the aliʻi of the island kingdoms and the gods and heroines of the chants in the old
  // ages, then Hawaiian church and modern names and the family names taken from a father's name after the 1860 law
  hawaiian: {
    m: {old: "Kamehameha, Kalaniʻōpuʻu, Kīwalaʻō, Keōua, Kahekili, Liholiho, Kauikeaouli, Kalanikupule, Kaumualiʻi, Kaʻeokulani, Keawe, Umi, Līloa, Hākau, Kealiʻiokaloa, Keawenuiaʻumi, Lonoikamakahiki, Alapaʻinui, Kalaniʻōpuʻu-a-Kaiamamao, Kekuaokalani, Kalanimoku, Boki, Kekūanāoʻa, Kanaʻina, Kaleiopapa, Kahahana, Peleioholani, Kamakau, Kepelino, Malo, ʻĪʻī, Hewahewa, Kaʻōpūlupulu, Kamapuaʻa, Kaha, Kalani, Kekoa, Kai, Makoa, Keanu, Kaleo, Ikaika, Nāinoa, Kamaka, Lono, Kaʻimi, Kapono, Kainoa, Kahiko, Kanoa, Kealoha, Keola, Koa, Makana, Manu, Nohea, Pono, Uluwehi, Kekaulike, Kamehamehanui, Kahikona, Kalaʻimoku, Kameʻeiamoku, Kamanawa, Keaweaheulu, Kalaimamahu, Kahalaiʻa, Kuakini, Hoapili, Nāmakehā",
      new: "Keoni, Kawika, Pita, Kimo, Ioane, Iosepa, Kale, Lopaka, Makana, Kaleo, Kanoa, Keola, Kekoa, Kalei, Kaʻimi, Kapena, Kealiʻi, Kainoa, Kaipo, Kaholo, Kamuela, Keaka, Keli, Kiliona, Konani, Mikala, Noa, Palakiko, Pekelo, Pila, Pōhaku, Wiliama, Ikaika, Kahekili, Keawe, Kekumu, Kalākaua, Lunalilo, Leleiōhoku, Kūhiō, Kawānanakoa, Duke, Eddie, Israel, Gabby, Kalani, Kalepa, Kamaka, Kapono, Keanu, Keahi, Kekai, Mana, Mekia, Ola, Oliwa, Puhi, Ākoni, Alika, Analu, Elikai, Eleu, Hiapo, Hoku, Iokepa, Kahiau, Kona, Lanakila, Keoki, Kioni, Kekaʻa"},
    f: {old: "Kaʻahumanu, Keōpūolani, Kalākua, Kapiʻolani, Kīnaʻu, Kekāuluohi, Kalama, Kamāmalu, Kekūpuohi, Kaneikapolei, Kalola, Namahana, Kaheiheimālie, Kekauʻōnohi, Kapule, Kahakuhaʻakoi, Kalanikauleleiaiwi, Keakealani, Akahi, Haʻaheo, Leilani, Kalena, Noelani, Kailani, Pua, Mahina, Nani, Lokelani, Kiana, Haunani, Keala, Iolana, Moana, Kanoe, Alamea, Malia, Hiʻiaka, Laka, Hina, Poliʻahu, Lāʻieikawai, Kapo, Kaiona, Hōkū, Lani, Lehua, Mamo, Nalani, Noe, Ulu, Kaui, ʻIlima, Pualani, Kaleilani, Kalanikauika, Kahananui, Keahiloa",
      new: "Liliʻuokalani, Emma, Pauahi, Ruth Keʻelikōlani, Kaʻiulani, Likelike, Miriam, Victoria, Lydia, Bernice, Elizabeth, Malia, Mele, Lilia, Ana, Elena, Kanani, Kaʻōnohi, Kauʻi, Keʻala, Lani, Lehua, Leinani, Leilani, Luana, Makana, Malu, Mililani, Nāpua, Noelani, Pikake, Pualani, Ululani, Wailani, Aolani, Hokulani, Iwalani, Kahala, Kailana, Kaimana, Kalea, Kalei, Kanoelani, Keilani, Kiele, Kiani, Koana, Lahela, Laʻakea, Maile, Malie, Melia, Nohea, Olina, Palila, Puanani, Roselani, Ualani, Ulani, Wehilani, Haliaka, Healani, Kamalei"},
    fam: {new: "Kahananui, Kealoha, Kahale, Kaleikini, Kahanamoku, Kaʻaihue, Kamakau, Kanahele, Kanoho, Kapaona, Kauhane, Kaʻuhane, Kaupu, Keakealani, Keawe, Kekumu, Kalama, Kamakana, Kanakanui, Kaniho, Kapule, Kaʻiama, Kahele, Kahalewai, Kahakalau, Kaholokula, Kahoʻokele, Kaiwi, Kalua, Kaluhiwa, Kamaka, Kamakea, Kamakele, Kamakawiwoʻole, Kanaʻe, Kanakaole, Kapahu, Kapaku, Kauahi, Kauwila, Kawaʻa, Kawaihae, Keahi, Kealamakia, Kealiʻinohomoku, Keawekane, Kekahuna, Kekona, Keliʻihoʻomalu, Keliʻipaʻakaua, Kimokeo, Kuahiwinui, Kualiʻi, Kūkahiko, Lono, Mahoe, Makaʻike, Makekau, Naone, Paʻakaula, Pai, Palakiko, Puaa, Puʻuohau, Kaleo, Kaleikilo, Akana, Aiona, Ahuna, Apaka, Aki, Kahaʻi, Kaleohano, Kamai, Kanaele, Kauhini, Keomaka, Kuamoʻo, Makua, Nāwahī, Pukui, Kaeo, Kalanui"}}
};

const eraOf = k => k === "old" ? OLD : k === "new" ? NEW : k === "modern" ? MOD : k.split(",");
const lists = v => typeof v === "string" ? [[null, v]] : Object.entries(v).map(([k, s]) => [eraOf(k), s]);

const names = [], FEM = {};
for ( const [origin, p] of Object.entries(P) ) {
  for ( const [sex, key] of [["male", "m"], ["female", "f"]] ) {
    for ( const [era, s] of lists(p[key] ?? {}) ) names.push(tbl(`names.${sex}.${origin}`, `Names: ${origin}, ${sex}${tag(era)}`, split(s), era));
  }
  // "son of" and "daughter of" the father's name, weighted against the family names
  const child = (sex, n = typeof p.fam === "string" ? split(p.fam).length : 0) => p.child ? [{text: `${p.child[sex === "male" ? 0 : 1]} {names.male.${origin}}`.trim(), weight: p.child[2] * Math.max(1, n)}] : [];
  if ( !p.fam && p.child ) for ( const sex of ["male", "female"] ) names.push(tbl(`names.family.${sex}.${origin}`, `Family names: ${origin}, ${sex}`, child(sex), null));
  for ( const [era, s] of lists(p.fam ?? {}) ) {
    const pairs = split(s).map(x => x.split("/"));
    for ( const [m, f] of pairs ) if ( f ) (FEM[origin] ??= {})[m] = f;
    names.push(tbl(`names.family.male.${origin}`, `Family names: ${origin}, male${tag(era)}`, [...child("male", pairs.length), ...pairs.map(x => x[0])], era));
    names.push(tbl(`names.family.female.${origin}`, `Family names: ${origin}, female${tag(era)}`, [...child("female", pairs.length), ...pairs.map(x => x[1] ?? x[0])], era));
  }
}
/** The feminine form of a family name, by people: {russian: {Ivanov: "Ivanova"}}. */
export const FEMININE = FEM;

/** Who lives where: one origin table for each region and era group that has a mix. */
const origins = [];
for ( const id of Object.keys(WORLD_REGIONS) ) {
  for ( const g of ERA_GROUPS ) {
    const mix = WORLD_REGIONS[id].mix?.[g] ? mixFor(id, g) : null;
    if ( !mix ) continue;
    // A mix stands for its own era group and the later ones until the next mix is given
    const until = ERA_GROUPS.slice(ERA_GROUPS.indexOf(g) + 1).findIndex(x => WORLD_REGIONS[id].mix[x]);
    const era = ERA_GROUPS.slice(ERA_GROUPS.indexOf(g), until < 0 ? undefined : ERA_GROUPS.indexOf(g) + 1 + until);
    origins.push({id: "people.origin", name: `People: origin (${WORLD_REGIONS[id].label.replace(/ \(.*$/, "")}, ${g})`,
      results: mix.map(([text, weight]) => ({text, weight})), era, culture: [cultureOf(id)], ...(WORLD_REGIONS[id].lend === false ? {lend: false} : {})});
  }
}

// Peoples with hand-built tables of their own (clans, names staged by age): the Haudenosaunee (B3120), the Algonquian
// coast (B3510), the Plains (B3820) and the Southwest (B3930)
const BUILT = {haudenosaunee: haudenosauneeTables(), ...Object.groupBy([...algonquianTables(), ...plainsTables(), ...southwestTables(), ...missouriTables(), ...plainsNorthTables(), ...basinTables(), ...canadaTables(), ...inuitTables(), ...tainoTables(), ...aboriginalTables(), ...centralAfricaTables(), ...filipinoTables()], t => t.id.split(".").at(-1))};
export const WORLD_PEOPLE_TABLES = [...origins, ...names, ...Object.values(BUILT).flat()];
/** Peoples who bear a given name alone in some or all ages. */
export const GIVEN_ONLY = new Set(["new-england-algonquian", "powhatan", "lakota", "cheyenne", "comanche", "kiowa", "apache", "arikara", "pawnee", "mandan", "hidatsa", "blackfoot", "arapaho", "shoshone", "ute", "cree", "anishinaabe", "inuit", "taino", "aboriginal", "luba", "filipino", "moro", "banyarwanda", ...Object.entries(P).filter(([, p]) => !p.child && (!p.fam || (typeof p.fam !== "string" && !Object.keys(p.fam).some(k => k === "old" || k.includes("medieval"))))).map(([o]) => o)]);
/** Every people named here. */
export const WORLD_PEOPLES = [...Object.keys(P), ...Object.keys(BUILT)];
/** Peoples raised to at least 300 distinct names (Ben 2026-11-13, B3310 on): one at a time, the biggest homelands first. */
export const RAISED = ["chinese", "hindi", "arabic", "armenian", "thai", "malay", "quechua", "steppe", "nahua", "tamil", "javanese", "swahili", "hawaiian", "amharic"];
/** Every distinct name a people of P has, given and family, all ages. */
export const namesOf = origin => new Set(["m", "f", "fam"].flatMap(k => lists(P[origin]?.[k] ?? {}).flatMap(([, s]) => split(s).flatMap(x => x.split("/")))));
