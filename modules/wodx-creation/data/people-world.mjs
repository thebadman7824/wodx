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

const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const OLD = ["medieval", "early-modern"], NEW = ["industrial", "modern"], MOD = ["modern"], PRE = ["medieval", "early-modern", "industrial"];
const tbl = (id, name, list, era) => ({id, name, results: list.map(x => (typeof x === "string" ? {text: x} : x)), ...(era ? {era} : {})});
const tag = era => era ? ` (${era[0]})` : "";

/** Peoples whose family name comes before the given name. */
export const FAMILY_FIRST = new Set(["chinese", "japanese", "korean", "vietnamese", "hungarian"]);

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
  greek: {
    m: "Ioannes, Georgios, Konstantinos, Michael, Nikolaos, Demetrios, Theodoros, Andronikos, Manuel, Alexios, Basileios, Leon, Nikephoros, Petros, Stephanos, Christos, Panagiotis, Vasilis",
    f: "Maria, Eirene, Anna, Theodora, Helene, Zoe, Eudokia, Sophia, Euphrosyne, Katerina, Kalliope, Vasiliki, Georgia, Despina, Angeliki, Kyriaki",
    fam: "Papadopoulos/Papadopoulou, Georgiou, Nikolaidis/Nikolaidou, Dimitriou, Konstantinou, Ioannidis/Ioannidou, Makris/Makri, Doukas/Doukaina, Komnenos/Komnene, Palaiologos/Palaiologina, Vlachos/Vlachou, Karagiannis/Karagianni, Economou"},
  arabic: {
    m: "Muhammad, Ahmad, Ali, Hasan, Husayn, Umar, Uthman, Ibrahim, Yusuf, Khalid, Abd Allah, Abd al-Rahman, Mahmud, Sulayman, Ismail, Mustafa, Salih, Hamza, Tariq, Zayd",
    f: "Fatima, Aisha, Khadija, Zaynab, Maryam, Layla, Amina, Safiyya, Ruqayya, Hafsa, Sumayya, Asma, Halima, Salma, Nur, Yasmin, Huda, Rabia",
    child: ["ibn", "bint", 6],
    fam: "al-Baghdadi, al-Dimashqi, al-Misri, al-Halabi, al-Maghribi, al-Andalusi, al-Basri, al-Makki, al-Yamani, al-Tunisi, al-Mawsili, al-Qurashi, al-Haddad, al-Najjar, al-Khayyat, al-Attar, al-Hakim, al-Tajir"},
  persian: {
    m: "Rostam, Bahram, Farhad, Dariush, Khosrow, Jamshid, Kaveh, Siavash, Ardeshir, Hossein, Reza, Mahmud, Ali, Hasan, Mehdi, Abbas, Karim, Jafar",
    f: "Shirin, Roxana, Parisa, Golnar, Mahin, Soraya, Laleh, Nasrin, Farah, Zahra, Fatemeh, Maryam, Leila, Simin, Homa, Azar, Mina, Shahrzad",
    fam: "Isfahani, Shirazi, Tabrizi, Khorasani, Kermani, Hamadani, Qazvini, Yazdi, Tusi, Nishapuri, Razi, Gilani, Tehrani, Kashani"},
  turkish: {
    m: "Mehmed, Ahmed, Mustafa, Ali, Hasan, Hüseyin, Osman, Orhan, Murad, Bayezid, Selim, Süleyman, İbrahim, Yusuf, Halil, İsmail, Kemal, Emre",
    f: "Ayşe, Fatma, Hatice, Emine, Zeynep, Hafsa, Gülbahar, Nilüfer, Mihrimah, Esma, Rabia, Safiye, Elif, Meryem, Leyla, Selma",
    // No family names before the law of 1934: "son of" a father's name until then
    fam: {[PRE.join()]: "{names.male.turkish}oğlu", modern: "Yılmaz, Kaya, Demir, Şahin, Çelik, Yıldız, Öztürk, Aydın, Arslan, Doğan, Kılıç, Aslan"}},
  steppe: {
    m: "Temür, Batu, Berke, Möngke, Chagatai, Jochi, Qaidu, Toghrul, Arslan, Bayan, Nogai, Subutai, Ögedei, Tolui, Qutlugh, Ulugh",
    f: "Börte, Sorghaghtani, Töregene, Khutulun, Chabi, Oghul, Alaqai, Checheyigen, Mandukhai, Altani, Bayalun, Orghana"},
  hindi: {
    m: {old: "Arjun, Krishna, Ram, Vikram, Hari, Gopal, Govind, Shankar, Bhim, Prithvi, Jai, Pratap, Man, Udai, Narayan, Madhav, Keshav, Damodar",
      new: "Mohan, Ravi, Suresh, Anil, Prakash, Deepak, Mahesh, Rajesh, Sanjay, Amit, Vijay, Ashok, Sunil, Rahul, Rohit, Arun, Manoj, Vikram"},
    f: {old: "Sita, Lakshmi, Parvati, Radha, Padmini, Mira, Durga, Savitri, Ganga, Kamala, Rukmini, Yashoda, Tara, Uma, Gauri, Champa",
      new: "Sunita, Anita, Kavita, Priya, Pooja, Neha, Rekha, Meena, Lata, Asha, Usha, Geeta, Shanti, Indira, Deepa, Anjali"},
    fam: "Sharma, Verma, Gupta, Singh, Kumar, Mishra, Pandey, Yadav, Chauhan, Rathore, Agarwal, Joshi, Tiwari, Srivastava, Mehta, Kapoor"},
  tamil: {
    m: "Murugan, Kumaran, Senthil, Arumugam, Raman, Selvam, Karthik, Ganesan, Velu, Rajan, Mani, Kannan, Sundaram, Perumal, Anand, Suresh",
    f: "Meenakshi, Lakshmi, Valli, Kamakshi, Parvathi, Selvi, Devi, Kala, Malar, Revathi, Saraswathi, Vasanthi, Kavitha, Priya, Andal, Thenmozhi"},
  // Two given names and no family name
  tibetan: {
    m: "Tenzin, Dorje, Tashi, Sonam, Lobsang, Karma, Ngawang, Jigme, Thubten, Dawa, Nyima, Pasang, Tsering, Phuntsok, Namgyal, Rinchen, Wangchuk, Gyaltsen, Kelsang, Jamyang",
    f: "Dolma, Lhamo, Yangchen, Dekyi, Choden, Drolkar, Tsomo, Pema, Diki, Yeshe, Lhakpa, Dechen, Yangzom, Tseten, Kunsang, Palmo, Chime, Sangmo"},
  chinese: {
    m: "Wei, Ming, Jun, Jian, Hao, Qiang, Tao, Yong, Guang, Ping, Zhong, De, Wen, Shan, Long, Bo, Feng, Wenming, Zhiyuan, Dewei, Tianyou, Yongkang",
    f: "Mei, Lan, Fang, Ying, Xiu, Juan, Hua, Yan, Na, Jing, Xia, Yun, Qing, Lian, Zhen, Yue, Hui, Xiulan, Meiling, Yufen, Shuzhen, Guiying",
    fam: "Wang, Li, Zhang, Liu, Chen, Yang, Huang, Zhao, Wu, Zhou, Xu, Sun, Ma, Zhu, Hu, Guo, Deng, Lin, Gao, Luo"},
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
  thai: {
    m: "Somchai, Somsak, Prasert, Sombat, Boonmee, Wichai, Suchart, Chaiya, Thongchai, Anan, Kiet, Niran",
    f: "Somying, Malee, Siriporn, Ratana, Kanya, Pensri, Sunee, Wanida, Nok, Dao, Mali, Busaba"},
  javanese: {
    m: "Slamet, Joko, Bambang, Agus, Sutrisno, Wahyu, Budi, Hadi, Sugeng, Teguh, Wiranto, Purnomo, Suparman, Harjo, Darmo, Kusno",
    f: "Sri, Siti, Wati, Endang, Sulastri, Ningsih, Lestari, Dewi, Kartini, Rukmini, Sumiati, Tuti, Yanti, Ratna, Wulan, Ayu"},
  malay: {
    m: "Ahmad, Ismail, Hassan, Ibrahim, Osman, Yusof, Abdullah, Rahman, Hamzah, Zainal, Razak, Kassim",
    f: "Aminah, Fatimah, Zainab, Halimah, Salmah, Rokiah, Noraini, Siti, Aishah, Mariam, Rohani, Zaleha",
    child: ["bin", "binti", 1]},
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
  swahili: {
    m: "Juma, Hamisi, Bakari, Salim, Rashidi, Omari, Athumani, Mwinyi, Khamis, Abdallah, Hassani, Said, Mohamedi, Shabani, Ramadhani, Makame",
    f: "Mwanaisha, Zuhura, Mwanajuma, Asha, Fatuma, Halima, Zainabu, Rehema, Amina, Saida, Mwanaidi, Khadija, Riziki, Subira, Neema, Tatu",
    child: ["bin", "binti", 1]},
  amharic: {
    m: "Tewodros, Yohannes, Menelik, Haile, Tesfaye, Girma, Bekele, Abebe, Kebede, Tadesse, Mulugeta, Dawit, Solomon, Getachew, Alemayehu, Worku, Zewde, Lemma",
    f: "Taytu, Zewditu, Mentewab, Aster, Almaz, Tigist, Genet, Hirut, Meseret, Selamawit, Tsehay, Worknesh, Abebech, Bethlehem, Marta, Saba",
    // The second name is the father's given name
    child: ["", "", 1]},
  zulu: {
    m: "Sipho, Themba, Bongani, Mandla, Sibusiso, Nkosana, Mthunzi, Dumisani, Jabulani, Vusumuzi, Zwelakhe, Mzwandile, Lungile, Siyabonga, Senzo, Bheki",
    f: "Nomvula, Thandiwe, Nomsa, Zanele, Lindiwe, Busisiwe, Nokuthula, Sibongile, Ntombi, Thandeka, Nonhlanhla, Zodwa, Khanyisile, Nomusa, Ayanda, Hlengiwe",
    fam: "Zulu, Khumalo, Dlamini, Ndlovu, Mkhize, Ngcobo, Buthelezi, Mthembu, Nxumalo, Cele, Shezi, Zungu, Gumede, Mthethwa, Ntuli, Sithole"},
  nahua: {
    m: "Cuauhtli, Ocelotl, Coatl, Tochtli, Mazatl, Cipactli, Ehecatl, Tecpatl, Itzcoatl, Chimalli, Yaotl, Tlacaelel, Cuauhtemoc, Acamapichtli, Xolotl, Tezozomoc",
    f: "Xochitl, Citlalli, Papalotl, Teicuih, Tlaco, Xoco, Teyacapan, Atototl, Chalchiuhnenetzin, Malinalli, Quetzalli, Tecuichpo"},
  quechua: {
    m: "Manco, Túpac, Amaru, Yupanqui, Titu, Cusi, Sayri, Huallpa, Sinchi, Rumi, Quispe, Inti, Kuntur, Wayra",
    f: "Ocllo, Chimpu, Cori, Cusi, Killa, Urpi, Chaska, Sumaq, T'ika, Illari, Asiri, Anahuarque"},
  maori: {
    m: {old: "Tāne, Rangi, Tama, Kupe, Rua, Tū, Kahu, Manaia, Whetū, Hotu, Toa, Te Ariki, Māui, Tiki, Rongo, Pōtiki",
      new: "Wiremu, Hōne, Hēmi, Pita, Rāwiri, Mikaere, Tipene, Hoani, Tāne, Rangi, Tama, Manu, Nikau, Ariki, Tāmati, Paora"},
    f: {old: "Hine, Aroha, Ngaio, Kiri, Huia, Marama, Whetū, Moana, Tui, Awhina, Pania, Wairaka, Hinemoa, Kahurangi, Rongomai, Te Ao",
      new: "Mere, Aroha, Hine, Ngaio, Kiri, Huia, Marama, Moana, Tui, Awhina, Ani, Rāhera, Mākere, Kahurangi, Anahera, Ataahua"},
    fam: {new: "Ngata, Parata, Tamihana, Pōmare, Hēnare, Kereama, Paewai, Wihongi, Tūrei, Harawira, Horomona, Karaka, Tīpene, Wētere"}},
  hawaiian: {
    m: "Kalani, Kekoa, Kai, Makoa, Keanu, Kaleo, Ikaika, Nāinoa, Kamaka, Lono, Keawe, Kaʻimi, Kapono, Keoni, Kawika, Kainoa",
    f: "Leilani, Kalena, Noelani, Kailani, Pua, Mahina, Nani, Lokelani, Kiana, Haunani, Keala, Iolana, Moana, Kanoe, Alamea, Malia"}
};

const eraOf = k => k === "old" ? OLD : k === "new" ? NEW : k === "modern" ? MOD : k.split(",");
const lists = v => typeof v === "string" ? [[null, v]] : Object.entries(v).map(([k, s]) => [eraOf(k), s]);

const names = [], FEM = {};
for ( const [origin, p] of Object.entries(P) ) {
  for ( const [sex, key] of [["male", "m"], ["female", "f"]] ) {
    for ( const [era, s] of lists(p[key] ?? {}) ) names.push(tbl(`names.${sex}.${origin}`, `Names: ${origin}, ${sex}${tag(era)}`, split(s), era));
  }
  // "son of" and "daughter of" the father's name, weighted against the family names
  const child = sex => p.child ? [{text: `${p.child[sex === "male" ? 0 : 1]} {names.male.${origin}}`.trim(), weight: p.child[2] * Math.max(1, split(typeof p.fam === "string" ? p.fam : "").length)}] : [];
  if ( !p.fam && p.child ) for ( const sex of ["male", "female"] ) names.push(tbl(`names.family.${sex}.${origin}`, `Family names: ${origin}, ${sex}`, child(sex), null));
  for ( const [era, s] of lists(p.fam ?? {}) ) {
    const pairs = split(s).map(x => x.split("/"));
    for ( const [m, f] of pairs ) if ( f ) (FEM[origin] ??= {})[m] = f;
    names.push(tbl(`names.family.male.${origin}`, `Family names: ${origin}, male${tag(era)}`, [...child("male"), ...pairs.map(x => x[0])], era));
    names.push(tbl(`names.family.female.${origin}`, `Family names: ${origin}, female${tag(era)}`, [...child("female"), ...pairs.map(x => x[1] ?? x[0])], era));
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
      results: mix.map(([text, weight]) => ({text, weight})), era, culture: [cultureOf(id)]});
  }
}

export const WORLD_PEOPLE_TABLES = [...origins, ...names];
/** Peoples who bear a given name alone in some or all ages. */
export const GIVEN_ONLY = new Set(Object.entries(P).filter(([, p]) => !p.child && (!p.fam || (typeof p.fam !== "string" && !Object.keys(p.fam).some(k => k === "old" || k.includes("medieval"))))).map(([o]) => o));
/** Every people named here. */
export const WORLD_PEOPLES = Object.keys(P);
