/**
 * The People generator's tables (Phase 7a, B52). WoDX's own data: historical given names and bynames as they were
 * used, Natures and Demeanors by their game names, and motives, secrets, looks and trades in WoDX's own words. No book
 * text. Each table becomes a Foundry Roll Table in "WoDX tables" that the Storyteller can edit.
 *
 * Writing rule (B48): text about a generated person is gender-neutral; only a name and its grammatical form follow the
 * person's sex, which the generator records.
 */

import {WORLD_PEOPLE_TABLES} from "./people-world.mjs";
import {worldTradeTables} from "./people-trades-world.mjs";

const t = (id, name, list, opts = {}) => ({id, name, results: list.map(x => (typeof x === "string" ? {text: x} : x)), ...opts});
const w = (text, weight) => ({text, weight});
const MED = ["medieval"], EM = ["early-modern"], IND = ["industrial"], MOD = ["modern"];
const BOH = ["bohemia"], AM = ["american"];
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);

/* ---------------- Bohemia: who people are by origin ---------------- */
const origins = [
  t("people.origin", "People: origin (Bohemia, medieval)", [w("czech", 62), w("german", 30), w("jewish", 8)], {era: MED, culture: BOH}),
  t("people.origin", "People: origin (Bohemia, early modern)", [w("czech", 60), w("german", 32), w("jewish", 8)], {era: EM, culture: BOH}),
  t("people.origin", "People: origin (Bohemia, industrial)", [w("czech", 63), w("german", 31), w("jewish", 6)], {era: IND, culture: BOH}),
  t("people.origin", "People: origin (Czechia, modern)", [w("czech", 88), w("slovak", 12)], {era: MOD, culture: BOH}),
  t("people.origin", "People: origin (the Americas, 19th century)", [w("anglo", 80), w("hispanic", 20)], {era: IND, culture: AM}),
  t("people.origin", "People: origin (the Americas, modern)", [w("anglo", 78), w("hispanic", 22)], {era: MOD, culture: AM})
];

/* ---------------- Given names ---------------- */
const given = [
  // Medieval Bohemia
  ["czech", "male", MED, BOH, "Bořivoj, Břetislav, Vratislav, Soběslav, Václav, Jaromír, Oldřich, Spytihněv, Vladislav, Přemysl, Ota, Jindřich, Konrád, Děpolt, Hroznata, Kojata, Mstiš, Slavibor, Načerat, Bohuslav, Budivoj, Bušek, Domaslav, Drslav, Hrabiše, Hron, Kuna, Lutobor, Milhost, Mutina, Ratibor, Sezema, Smil, Střezimír, Sulislav, Svatobor, Vít, Vojslav, Záviš, Zbraslav, Zdeslav, Zdík, Jan, Petr, Pavel, Martin, Mikuláš, Jakub, Ondřej, Matěj, Šimon, Havel, Prokop, Štěpán, Vavřinec, Lukáš"],
  ["czech", "female", MED, BOH, "Ludmila, Drahomíra, Dobrava, Judita, Božena, Jitka, Svatava, Přibyslava, Mlada, Doubravka, Kunhuta, Anežka, Eliška, Markéta, Dorota, Kateřina, Ofka, Alžběta, Vratislava, Bohuslava, Zdislava, Hodava, Bolemila, Dobroslava, Milada, Radka, Slavěna, Stanislava, Vojslava, Juta, Hedvika, Johana, Marie, Anna, Bětka, Mandalena"],
  ["german", "male", MED, BOH, "Heinrich, Konrad, Otto, Dietrich, Friedrich, Ulrich, Hermann, Albrecht, Berthold, Gottfried, Hartmann, Rudolf, Siegfried, Walther, Wolfram, Eberhard, Arnold, Bernhard, Gerhard, Hugo, Johann, Nikolaus, Peter, Lambert, Reinhard, Werner, Ludwig, Hartwig"],
  ["german", "female", MED, BOH, "Adelheid, Agnes, Bertha, Gertrud, Hedwig, Irmgard, Kunigunde, Mechthild, Richenza, Gisela, Elisabeth, Margarete, Jutta, Sophia, Mathilde, Hildegard, Liutgard, Ida, Kathrein, Uta, Petrissa, Gerburg"],
  ["jewish", "male", MED, BOH, "Avraham, Yitzhak, Yaakov, Moshe, Shlomo, David, Yosef, Eliezer, Meir, Yehuda, Shemaryah, Menahem, Hayyim, Shmuel, Natan, Baruch, Asher, Ephraim, Gershom, Peretz"],
  ["jewish", "female", MED, BOH, "Sarah, Rivka, Rachel, Leah, Hannah, Esther, Miriam, Dina, Bella, Gutel, Zipporah, Yocheved, Avigail, Gitl, Perl"],
  // Early modern Bohemia
  ["czech", "male", EM, BOH, "Jan, Jiří, Václav, Jindřich, Petr, Adam, Vilém, Zdeněk, Jaroslav, Bohuslav, Kryštof, Mikuláš, Matyáš, Ondřej, Šimon, Daniel, Vavřinec, Tadeáš, Burian, Diviš, Kašpar, Řehoř"],
  ["czech", "female", EM, BOH, "Kateřina, Anna, Dorota, Johanka, Ludmila, Magdalena, Alžběta, Marie, Polyxena, Eliška, Salomena, Voršila, Lidmila, Barbora, Markéta, Benigna, Zuzana"],
  ["german", "male", EM, BOH, "Hans, Jakob, Georg, Christoph, Michael, Paul, Lorenz, Wolf, Kaspar, Matthias, Sebastian, Valentin, Andreas, Bartholomäus, Melchior, Leonhard"],
  ["german", "female", EM, BOH, "Anna, Barbara, Margaretha, Katharina, Ursula, Dorothea, Magdalena, Apollonia, Regina, Sabina, Susanna, Elisabeth"],
  ["jewish", "male", EM, BOH, "Yehuda, Mordechai, Avraham, Yitzhak, Yaakov, Moshe, Shlomo, David, Yosef, Eliezer, Zalman, Yom Tov, Gedalyah, Shimon"],
  ["jewish", "female", EM, BOH, "Perl, Sarah, Rivka, Hendl, Frumet, Gitl, Rachel, Esther, Reyzl, Freydl, Hanna"],
  // Industrial Bohemia (Austria-Hungary)
  ["czech", "male", IND, BOH, "Josef, Jan, František, Václav, Karel, Antonín, Jaroslav, Vojtěch, Ladislav, Bohumil, Jindřich, Emanuel, Alois, Rudolf, Stanislav, Vladimír, Ferdinand, Matěj, Tomáš, Eduard, Otakar, Bedřich"],
  ["czech", "female", IND, BOH, "Marie, Anna, Božena, Františka, Josefa, Ludmila, Kateřina, Barbora, Terezie, Johana, Rozálie, Anežka, Milada, Emilie, Hedvika, Antonie, Karolína, Zdeňka, Jarmila, Vilemína"],
  ["german", "male", IND, BOH, "Johann, Josef, Franz, Karl, Anton, Wenzel, Heinrich, Friedrich, Wilhelm, Ludwig, Ernst, Rudolf, Adolf, Hermann, Otto, Emil, Alois, Ferdinand, Gustav, Julius"],
  ["german", "female", IND, BOH, "Maria, Anna, Theresia, Josefa, Katharina, Elisabeth, Johanna, Franziska, Rosa, Hermine, Leopoldine, Berta, Emma, Wilhelmine, Karoline, Aloisia"],
  ["jewish", "male", IND, BOH, "Moritz, Samuel, Salomon, Leopold, Adolf, Siegmund, Isidor, Jakob, Max, Hugo, Ignaz, Emanuel, Hermann, Arnošt, Leo"],
  ["jewish", "female", IND, BOH, "Rosa, Sophie, Ida, Hermine, Regina, Rosalie, Johanna, Ottilie, Julie, Elsa, Klara"],
  // Modern Czechia
  ["czech", "male", MOD, BOH, "Jan, Jakub, Tomáš, Petr, Martin, Lukáš, Ondřej, David, Michal, Pavel, Jiří, Filip, Vojtěch, Adam, Matěj, Marek, Radek, Daniel, Roman, Josef, Štěpán, Dominik"],
  ["czech", "female", MOD, BOH, "Tereza, Eliška, Anna, Lucie, Kateřina, Veronika, Petra, Lenka, Jana, Martina, Barbora, Klára, Adéla, Natálie, Kristýna, Markéta, Zuzana, Hana, Monika, Simona"],
  ["slovak", "male", MOD, BOH, "Ján, Peter, Martin, Juraj, Michal, Marek, Tomáš, Lukáš, Matúš, Patrik, Jakub, Samuel"],
  ["slovak", "female", MOD, BOH, "Zuzana, Katarína, Lucia, Mária, Jana, Martina, Simona, Veronika, Ivana, Andrea, Michaela"],
  // The Americas
  ["anglo", "male", IND, AM, "John, William, James, George, Charles, Thomas, Henry, Joseph, Samuel, Frank, Robert, Edward, Daniel, Jacob, Isaac, Benjamin, Elijah, Jesse, Wyatt, Virgil, Amos, Silas, Ezra, Levi, Abel, Caleb, Luther, Walter"],
  ["anglo", "female", IND, AM, "Mary, Sarah, Elizabeth, Martha, Margaret, Anna, Emma, Ella, Alice, Clara, Minnie, Ida, Lucy, Hattie, Nancy, Josephine, Eliza, Rebecca, Abigail, Harriet"],
  ["hispanic", "male", IND, AM, "José, Juan, Francisco, Antonio, Manuel, Pedro, Jesús, Ramón, Miguel, Rafael, Tomás, Santiago"],
  ["hispanic", "female", IND, AM, "María, Juana, Josefa, Guadalupe, Rosa, Carmen, Dolores, Refugio, Francisca, Teresa, Ignacia"],
  ["anglo", "male", MOD, AM, "Michael, David, James, Chris, Matthew, Joshua, Daniel, Andrew, Ryan, Brian, Kevin, Jason, Justin, Tyler, Brandon, Eric, Steven, Anthony, Kyle, Marcus"],
  ["anglo", "female", MOD, AM, "Jessica, Ashley, Jennifer, Amanda, Sarah, Emily, Megan, Lauren, Rachel, Nicole, Stephanie, Brittany, Samantha, Hannah, Taylor, Kayla, Danielle, Amber, Alicia, Courtney"],
  ["hispanic", "male", MOD, AM, "José, Luis, Carlos, Juan, Jorge, Miguel, Alejandro, Diego, Javier, Daniel, Adrián, Gabriel"],
  ["hispanic", "female", MOD, AM, "María, Ana, Sofía, Isabella, Gabriela, Daniela, Valeria, Camila, Lucía, Alejandra, Mariana, Paola"]
].map(([origin, sex, era, culture, names]) => t(`names.${sex}.${origin}`, `Names: ${origin}, ${sex} (${era[0]})`, split(names), {era, culture}));

/* ---------------- Family names and bynames ---------------- */
// "male/female" pairs for languages whose family names change with sex
const pairs = s => split(s).map(p => p.split("/"));
const familyTables = (origin, era, culture, list) => [
  t(`names.family.male.${origin}`, `Family names: ${origin}, male (${era[0]})`, list.map(p => p[0]), {era, culture}),
  t(`names.family.female.${origin}`, `Family names: ${origin}, female (${era[0]})`, list.map(p => p[1] ?? p[0]), {era, culture})
];
const CZ_MODERN = pairs("Novák/Nováková, Svoboda/Svobodová, Novotný/Novotná, Dvořák/Dvořáková, Černý/Černá, Procházka/Procházková, Kučera/Kučerová, Veselý/Veselá, Horák/Horáková, Němec/Němcová, Pokorný/Pokorná, Marek/Marková, Pospíšil/Pospíšilová, Hájek/Hájková, Jelínek/Jelínková, Král/Králová, Růžička/Růžičková, Beneš/Benešová, Fiala/Fialová, Sedláček/Sedláčková, Doležal/Doležalová, Zeman/Zemanová, Kolář/Kolářová, Navrátil/Navrátilová, Čermák/Čermáková, Urban/Urbanová, Vaněk/Vaňková, Blažek/Blažková, Kříž/Křížová, Kovář/Kovářová");
const DE_FAMILY = split("Müller, Schmidt, Schneider, Fischer, Weber, Wagner, Becker, Hoffmann, Schubert, Richter, Neumann, Zimmermann, Krause, Hartmann, Lang, Huber, Bauer, Mayer, Fuchs, Wolf, Hofmann, Schwarz, Kraus, Pohl, Seidl, Peschel, Riedel, Kohl, Hübner, Lorenz").map(x => [x]);
const JW_IND = split("Kafka, Kohn, Löwy, Pollak, Brod, Fischl, Taussig, Glaser, Bondy, Freund, Steiner, Weiss, Popper, Kraus, Neumann, Stein, Schwarz, Lederer, Pick, Bloch").map(x => [x]);
const SK_MODERN = pairs("Horváth/Horváthová, Kováč/Kováčová, Varga/Vargová, Tóth/Tóthová, Nagy/Nagyová, Baláž/Balážová, Szabó/Szabóová, Molnár/Molnárová, Lukáč/Lukáčová, Kollár/Kollárová, Novák/Nováková, Oravec/Oravcová");
const ANGLO = split("Smith, Johnson, Brown, Jones, Miller, Davis, Wilson, Anderson, Taylor, Thomas, Moore, Martin, Jackson, Thompson, White, Clark, Lewis, Walker, Hall, Young, Allen, King, Wright, Scott, Green, Baker, Adams, Nelson, Hill, Campbell, Mitchell, Roberts, Carter, Phillips, Evans, Turner, Parker, Collins, Edwards, Stewart").map(x => [x]);
const HISP = split("García, Martínez, López, Hernández, González, Sánchez, Romero, Chávez, Ortiz, Montoya, Baca, Lucero, Sandoval, Trujillo, Archuleta, Vigil, Gallegos, Padilla").map(x => [x]);
const CZ_EM = pairs("Kovář/Kovářka, Mlynář/Mlynářka, Novák/Nováková, Dvořák/Dvořáková, Svoboda/Svobodová, Černý/Černá, Sedlák/Sedláková, Bednář/Bednářka, Krejčí/Krejčová, Kolář/Kolářka, Rybář/Rybářka, Šafránek/Šafránková, Vodička/Vodičková, Hromádka/Hromádková, Kubíček/Kubíčková");
const family = [
  ...familyTables("czech", IND, BOH, CZ_MODERN), ...familyTables("czech", MOD, BOH, CZ_MODERN), ...familyTables("czech", EM, BOH, CZ_EM),
  ...familyTables("german", IND, BOH, DE_FAMILY), ...familyTables("german", EM, BOH, DE_FAMILY),
  ...familyTables("jewish", IND, BOH, JW_IND), ...familyTables("slovak", MOD, BOH, SK_MODERN),
  ...familyTables("anglo", IND, AM, ANGLO), ...familyTables("anglo", MOD, AM, ANGLO),
  ...familyTables("hispanic", IND, AM, HISP), ...familyTables("hispanic", MOD, AM, HISP)
];
// Medieval Bohemia had bynames, not family names: a place, a trade or a nickname
const PLACES_CZ = "Dolan, Kouřimi, Žatce, Litoměřic, Mělníka, Plzně, Chrudimi, Čáslavi, Hradce, Boleslavi, Rokycan, Klatov, Domažlic, Prachně, Bechyně, Loun, Slaného, Berouna, Kladrub, Sedlce, Strakonic, Písku, Prahy";
const PLACES_DE = "Eger, Prag, Brünn, Meißen, Passau, Regensburg, Bamberg, Freiberg, Nürnberg, Iglau, Zittau, Pilsen";
const bynames = [
  t("names.byname.male.czech", "Bynames: czech, male (medieval)", [
    ...split(PLACES_CZ).map(p => w(`z ${p}`, 2)),
    ...split("Kovář, Mlynář, Švec, Rybář, Tesař, Pekař, Řezník, Kolář, Hrnčíř, Krejčí, Sladovník, Koželuh, Bednář, Tkadlec, Pastýř").map(x => w(x, 3)),
    ...split("Černý, Bílý, Malý, Velký, Starý, Mladý, Ryšavý, Holý, Kulhavý, Dlouhý, Hrbatý, Veselý, Tichý, Lysý").map(x => w(x, 2))], {era: MED, culture: BOH}),
  t("names.byname.female.czech", "Bynames: czech, female (medieval)", [
    ...split(PLACES_CZ).map(p => w(`z ${p}`, 2)),
    ...split("Kovářka, Mlynářka, Ševcová, Rybářka, Tesařka, Pekařka, Řeznice, Kolářka, Hrnčířka, Krejčová, Sladovnice, Bednářka, Tkadlena, Pastýřka").map(x => w(x, 3)),
    ...split("Černá, Bílá, Malá, Velká, Stará, Mladá, Ryšavá, Holá, Kulhavá, Dlouhá, Veselá, Tichá").map(x => w(x, 2))], {era: MED, culture: BOH}),
  ...["male", "female"].map(sex => t(`names.byname.${sex}.german`, `Bynames: german, ${sex} (medieval)`, [
    ...split(PLACES_DE).map(p => w(`von ${p}`, 2)),
    ...split(sex === "male" ? "der Schmied, Müller, Weber, Fischer, Becker, Schuster, Zimmermann, Färber, Brauer, Gerber, Kürschner" : "die Weberin, die Müllerin, die Fischerin, die Beckerin, die Färberin, die Brauerin, die Schusterin").map(x => w(x, 3)),
    ...split(sex === "male" ? "der Lange, der Rote, der Alte, der Junge, der Kleine, der Schwarze" : "die Lange, die Rote, die Alte, die Junge, die Kleine, die Schwarze").map(x => w(x, 2))], {era: MED, culture: BOH})),
  // "son of" or "daughter of", then the father's name; {{child}} is ben or bat
  ...["male", "female"].map(sex => t(`names.byname.${sex}.jewish`, `Bynames: jewish, ${sex} (medieval)`, [w("{{child}} {names.male.jewish}", 1)], {era: MED, culture: BOH})),
  ...["male", "female"].map(sex => t(`names.family.${sex}.jewish`, `Family names: jewish, ${sex} (early modern)`, [
    w("{{child}} {names.male.jewish}", 4), ...split("Horowitz, Gans, Lipmann, Maisel, Bassevi, Wedeles, Teomim, Spira, Jaffe, Katz").map(x => w(x, 1))], {era: EM, culture: BOH}))
];

/* ---------------- Natures and Demeanors (the archetypes' game names) ---------------- */
const archetypes = t("people.archetype", "People: Nature and Demeanor", split("Architect, Autocrat, Bon Vivant, Bravo, Caregiver, Celebrant, Child, Competitor, Conformist, Conniver, Curmudgeon, Deviant, Director, Fanatic, Gallant, Judge, Loner, Martyr, Masochist, Monster, Pedagogue, Penitent, Perfectionist, Rebel, Rogue, Survivor, Thrill-Seeker, Traditionalist, Trickster, Visionary"));

/* ---------------- Motives, secrets, looks (WoDX's words; gender-neutral) ---------------- */
const motives = t("people.motive", "People: what they want", split(`
  to pay off a debt before winter comes, to see a child settled well, to win back an inheritance taken by a relative,
  to get out of this place for good, to be thought pious by the neighbours, to avenge a sibling, to keep an old crime buried,
  to rise in a patron's favour, to learn the truth about a death in the family, to protect the household from a rival,
  to find a cure for a sick parent, to be forgiven for an old wrong, to make a name in the town, to keep the land the family has always held,
  to see the world beyond the next valley, to get rich whatever it costs, to win the heart of someone above their station,
  to keep the peace between two quarrelling kin, to find a missing friend, to prove a rival a liar, to hold on to the work they have,
  to keep faith when faith is hard, to buy free of an obligation, to be left alone, to bury the dead properly,
  to find out what really walks the night, to repay a kindness no one remembers, to take revenge on a former master`));
const secrets = t("people.secret", "People: what they hide", split(`
  owes money to someone dangerous, saw something at night that cannot be explained and tells no one, is not who they claim to be,
  steals from their employer, had a hand in a death that was called an accident, loves someone forbidden to them,
  keeps a charm they believe holds off the dead, shelters a relative the law is looking for, is paid to watch a neighbour,
  fears they are losing their mind, has an illness no one knows of, forged a document that matters, knows where something valuable is buried,
  once served a monster without knowing it, dreams of the same stranger every night, has a child no one knows about,
  keeps a faith in secret, informs for the authorities, lost a fortune at dice and cards, cheats with weights and measures,
  witnessed a crime by someone powerful, was bitten one night and remembers nothing of it, drinks heavily in secret,
  is planning to run away, wrote an anonymous accusation, keeps a dead lover's letters, is blackmailing someone,
  deserted from an army, came back from the woods changed, recognises one of the player characters from somewhere`));
const looks = t("people.look", "People: how they come across", split(`
  a laugh too loud for the room, a scar through one eyebrow, never meets anyone's eye, hums the same tune over and over,
  missing two fingers, smells of woodsmoke, fine clothes worn threadbare, talks with their hands, unusually tall,
  a pockmarked face, speaks very softly, always eating something, uneasy in the dark, a heavy limp, prays under their breath,
  quick to offer help, counts coins without thinking, very old for their work, very young for their work, wears a charm on a cord,
  stutters when lying, a streak of white hair, freckled and sunburnt, ink-stained fingers, a booming voice, chews on a straw,
  a hacking cough, immaculately clean, a nervous smile, old burns on both hands`));

/* ---------------- Trades, with the sheet that goes with each ----------------
 * a: attribute priority (p physical, s social, m mental); k: Abilities (sheet keys, or Dark Ages Secondary Abilities
 * marked +, such as +hearthwisdom); any Ability the era's sheet lacks is skipped when the sheet is made. */
const trade = (text, weight, a, k) => ({text, weight, a, k});
const TRADES = {
  medieval: [
    trade("farmer", 10, "pms", {athletics: 1, animalken: 1, survival: 1, craft: 1, brawl: 1, "+hearthwisdom": 2}),
    trade("miller", 2, "pms", {craft: 3, alertness: 1, athletics: 1, "+commerce": 2}),
    trade("smith", 2, "pms", {craft: 3, brawl: 1, melee: 2, intimidation: 1}),
    trade("village priest", 1, "msp", {academics: 2, empathy: 2, expression: 1, leadership: 1, occult: 1, "+theology": 3}),
    trade("member of a religious house", 1, "msp", {academics: 2, medicine: 2, craft: 1, "+theology": 2}),
    trade("reeve", 1, "smp", {leadership: 2, intimidation: 1, law: 1, empathy: 1, "+seneschal": 2}),
    trade("man-at-arms", 3, "psm", {melee: 3, brawl: 2, alertness: 2, athletics: 1, intimidation: 1, "+ride": 1}),
    trade("merchant", 2, "smp", {persuasion: 2, subterfuge: 1, etiquette: 1, linguistics: 1, "+commerce": 3, "+ride": 1}),
    trade("innkeeper", 2, "smp", {empathy: 2, alertness: 1, brawl: 1, streetwise: 1, "+commerce": 2}),
    trade("healer and midwife", 2, "msp", {medicine: 3, empathy: 2, occult: 1, "+hearthwisdom": 2}),
    trade("huntsman", 2, "pms", {survival: 3, stealth: 2, animalken: 2, alertness: 1, "+archery": 2}),
    trade("woodcutter", 2, "pms", {athletics: 2, survival: 2, melee: 1, craft: 1}),
    trade("charcoal burner", 1, "pms", {survival: 2, craft: 2, athletics: 1, alertness: 1}),
    trade("shepherd", 2, "pms", {animalken: 3, survival: 2, alertness: 1, brawl: 1}),
    trade("beggar", 1, "smp", {streetwise: 2, subterfuge: 2, awareness: 1, "+legerdemain": 1}),
    trade("pilgrim", 1, "msp", {survival: 1, linguistics: 1, expression: 1, "+theology": 1}),
    trade("minstrel", 1, "spm", {performance: 3, expression: 2, etiquette: 1, subterfuge: 1, empathy: 1}),
    trade("scribe", 1, "msp", {academics: 2, linguistics: 2, law: 1, investigation: 1, "+seneschal": 1}),
    trade("tanner", 1, "pms", {craft: 3, "+commerce": 1}),
    trade("weaver", 2, "pms", {craft: 3, "+commerce": 1}),
    trade("brewer", 1, "pms", {craft: 3, "+commerce": 1}),
    trade("servant in the lord's house", 3, "spm", {etiquette: 2, alertness: 2, subterfuge: 1, "+seneschal": 1}),
    trade("cook", 1, "pms", {craft: 2, alertness: 1, "+hearthwisdom": 1}),
    trade("carter", 1, "pms", {animalken: 2, athletics: 2, survival: 1, brawl: 1, "+ride": 1}),
    trade("ferryman", 1, "pms", {athletics: 2, survival: 1, brawl: 1, craft: 1}),
    trade("fisher", 1, "pms", {survival: 2, athletics: 2, craft: 1}),
    trade("toll-keeper", 1, "smp", {law: 2, intimidation: 2, alertness: 1, melee: 1, "+commerce": 1}),
    trade("knight", 1, "psm", {melee: 3, etiquette: 2, leadership: 2, athletics: 2, "+ride": 3, "+archery": 1}),
    trade("steward", 1, "msp", {leadership: 2, etiquette: 2, law: 1, "+seneschal": 3, "+commerce": 1})
  ],
  "early-modern": [
    trade("farmer", 8, "pms", {athletics: 1, animalken: 1, survival: 1, craft: 1, brawl: 1}),
    trade("printer", 1, "msp", {craft: 3, academics: 1, linguistics: 1}),
    trade("apothecary", 1, "msp", {medicine: 2, craft: 2, occult: 1, academics: 1}),
    trade("mercenary", 2, "psm", {melee: 3, firearms: 1, brawl: 2, athletics: 1, intimidation: 1}),
    trade("university student", 1, "msp", {academics: 2, linguistics: 2, expression: 1, occult: 1}),
    trade("alchemist's assistant", 1, "mps", {occult: 2, craft: 2, academics: 1, investigation: 1}),
    trade("merchant", 2, "smp", {persuasion: 2, subterfuge: 1, etiquette: 1, linguistics: 1, finance: 2}),
    trade("innkeeper", 2, "smp", {empathy: 2, alertness: 1, brawl: 1, streetwise: 1}),
    trade("priest", 1, "msp", {academics: 2, empathy: 2, expression: 1, religion: 2}),
    trade("town guard", 2, "psm", {melee: 2, brawl: 2, alertness: 2, intimidation: 1}),
    trade("servant", 3, "spm", {etiquette: 2, alertness: 2, subterfuge: 1}),
    trade("miner", 2, "pms", {athletics: 2, craft: 2, survival: 1, demolitions: 1})
  ],
  industrial: [
    trade("factory hand", 6, "pms", {athletics: 1, craft: 2, brawl: 1, streetwise: 1}),
    trade("clerk", 3, "msp", {academics: 1, bureaucracy: 2, finance: 1, investigation: 1}),
    trade("police constable", 2, "psm", {brawl: 2, alertness: 2, intimidation: 1, law: 1, firearms: 1}),
    trade("priest", 1, "msp", {academics: 2, empathy: 2, expression: 1, religion: 2}),
    trade("physician", 1, "msp", {medicine: 3, science: 2, empathy: 1, academics: 1}),
    trade("nurse", 2, "msp", {medicine: 2, empathy: 2, alertness: 1}),
    trade("schoolteacher", 1, "msp", {academics: 2, expression: 2, leadership: 1}),
    trade("shopkeeper", 3, "smp", {persuasion: 1, finance: 2, alertness: 1, empathy: 1}),
    trade("publican", 2, "smp", {empathy: 2, brawl: 1, streetwise: 2, finance: 1}),
    trade("coachman", 1, "pms", {animalken: 2, drive: 2, alertness: 1}),
    trade("soldier", 3, "psm", {firearms: 2, melee: 1, athletics: 2, brawl: 1, survival: 1}),
    trade("domestic servant", 3, "spm", {etiquette: 2, alertness: 2, subterfuge: 1}),
    trade("journalist", 1, "msp", {investigation: 2, expression: 2, persuasion: 1, streetwise: 1}),
    trade("railwayman", 1, "pms", {craft: 2, technology: 1, athletics: 1}),
    trade("miner", 2, "pms", {athletics: 2, craft: 1, survival: 1, demolitions: 1}),
    trade("dressmaker", 2, "msp", {craft: 3, etiquette: 1}),
    trade("lawyer", 1, "smp", {law: 3, persuasion: 2, bureaucracy: 1}),
    trade("cowhand", 2, "pms", {animalken: 3, survival: 2, firearms: 1, athletics: 1}, ),
    trade("prospector", 1, "pms", {survival: 2, craft: 1, science: 1, firearms: 1}),
    trade("gambler", 1, "smp", {subterfuge: 2, larceny: 1, alertness: 1, firearms: 1, streetwise: 1})
  ],
  modern: [
    trade("office worker", 6, "msp", {computer: 2, bureaucracy: 1, finance: 1, academics: 1}),
    trade("police officer", 2, "psm", {firearms: 2, brawl: 2, drive: 1, law: 1, alertness: 1, intimidation: 1}),
    trade("nurse", 2, "msp", {medicine: 3, empathy: 2, alertness: 1}),
    trade("doctor", 1, "msp", {medicine: 4, science: 2, empathy: 1}),
    trade("student", 4, "msp", {academics: 2, computer: 1, technology: 1, expression: 1}),
    trade("bartender", 2, "smp", {empathy: 2, streetwise: 2, brawl: 1}),
    trade("taxi driver", 2, "pms", {drive: 3, streetwise: 2, alertness: 1}),
    trade("mechanic", 2, "pms", {technology: 3, drive: 1, craft: 1}),
    trade("shop assistant", 3, "smp", {persuasion: 1, alertness: 1, empathy: 1, computer: 1}),
    trade("programmer", 2, "msp", {computer: 4, technology: 2, science: 1}),
    trade("journalist", 1, "msp", {investigation: 2, expression: 2, computer: 1, persuasion: 1}),
    trade("security guard", 2, "psm", {brawl: 2, alertness: 2, firearms: 1, intimidation: 1, security: 1}),
    trade("teacher", 1, "msp", {academics: 2, expression: 2, leadership: 1}),
    trade("priest", 1, "msp", {academics: 2, empathy: 2, religion: 2, expression: 1}),
    trade("musician", 1, "spm", {performance: 3, expression: 1, streetwise: 1}),
    trade("lawyer", 1, "smp", {law: 3, persuasion: 2, bureaucracy: 1}),
    trade("builder", 2, "pms", {craft: 2, athletics: 2, technology: 1}),
    trade("courier", 2, "pms", {drive: 2, athletics: 1, streetwise: 2}),
    trade("social worker", 1, "smp", {empathy: 3, bureaucracy: 1, streetwise: 1}),
    trade("paramedic", 1, "pms", {medicine: 2, drive: 2, alertness: 1}),
    trade("club bouncer", 1, "psm", {brawl: 3, intimidation: 2, alertness: 1}),
    trade("private investigator", 1, "msp", {investigation: 3, streetwise: 1, firearms: 1, subterfuge: 1})
  ],
  // 1919 to 1989, between the Great War and the modern era (house list)
  "mid-century": [
    trade("factory worker", 6, "pms", {craft: 2, athletics: 1, brawl: 1, technology: 1}),
    trade("clerk", 4, "msp", {bureaucracy: 2, academics: 1, finance: 1}),
    trade("police officer", 2, "psm", {brawl: 2, firearms: 1, drive: 1, law: 1, alertness: 1}),
    trade("soldier", 2, "psm", {firearms: 2, athletics: 2, brawl: 1, survival: 1}),
    trade("nurse", 2, "msp", {medicine: 2, empathy: 2, alertness: 1}),
    trade("doctor", 1, "msp", {medicine: 3, science: 2, empathy: 1}),
    trade("teacher", 1, "msp", {academics: 2, expression: 2, leadership: 1}),
    trade("shop assistant", 3, "smp", {persuasion: 1, finance: 1, alertness: 1, empathy: 1}),
    trade("lorry driver", 2, "pms", {drive: 3, streetwise: 1, technology: 1}),
    trade("mechanic", 2, "pms", {technology: 3, drive: 1, craft: 1}),
    trade("miner", 2, "pms", {athletics: 2, craft: 1, survival: 1, brawl: 1}),
    trade("farm worker", 3, "pms", {animalken: 1, craft: 2, survival: 1, drive: 1}),
    trade("railway worker", 2, "pms", {technology: 1, athletics: 1, craft: 2, alertness: 1}),
    trade("telephone operator", 1, "msp", {technology: 1, alertness: 2, bureaucracy: 1}),
    trade("waiter", 2, "smp", {etiquette: 1, empathy: 2, alertness: 1}),
    trade("journalist", 1, "msp", {investigation: 2, expression: 2, persuasion: 1}),
    trade("priest", 1, "msp", {academics: 2, empathy: 2, religion: 2}),
    trade("musician", 1, "spm", {performance: 3, expression: 1, streetwise: 1}),
    trade("informer", 1, "smp", {subterfuge: 2, streetwise: 2, investigation: 1})
  ],
  // The World of Future Darkness, 2010 on (house list, after the Cyberpunk 2020 roles the branch borrows)
  future: [
    trade("corp office worker", 5, "msp", {computer: 2, bureaucracy: 2, finance: 1}),
    trade("corporate security", 2, "psm", {firearms: 2, brawl: 1, alertness: 2, security: 1}),
    trade("street doctor", 1, "msp", {medicine: 3, technology: 2, streetwise: 1}),
    trade("techie", 2, "msp", {technology: 3, computer: 2, craft: 1}),
    trade("netrunner", 1, "msp", {computer: 4, technology: 1, investigation: 1}),
    trade("media reporter", 1, "msp", {expression: 2, investigation: 2, computer: 1, persuasion: 1}),
    trade("nomad", 2, "pms", {drive: 3, survival: 2, technology: 1, firearms: 1}),
    trade("fixer", 1, "smp", {streetwise: 3, persuasion: 2, finance: 1}),
    trade("gang member", 2, "psm", {brawl: 2, streetwise: 2, firearms: 1, intimidation: 1}),
    trade("police officer", 2, "psm", {firearms: 2, drive: 1, law: 1, alertness: 1, computer: 1}),
    trade("nurse", 2, "msp", {medicine: 2, empathy: 2, computer: 1}),
    trade("delivery rider", 3, "pms", {drive: 2, athletics: 1, streetwise: 2}),
    trade("food stall cook", 2, "pms", {craft: 2, streetwise: 1, empathy: 1}),
    trade("teacher", 1, "msp", {academics: 2, expression: 2, computer: 1}),
    trade("priest", 1, "msp", {academics: 2, empathy: 2, religion: 2}),
    trade("musician", 1, "spm", {performance: 3, expression: 1, streetwise: 1}),
    trade("farm technician", 2, "pms", {technology: 2, craft: 1, survival: 1, drive: 1})
  ]
};
// Cowhands, prospectors and gamblers are the American West's; Bohemia's industrial towns have none
const AM_ONLY = new Set(["cowhand", "prospector", "gambler"]);
const trades = [
  ...Object.entries(TRADES).filter(([g]) => g !== "industrial").map(([g, list]) => t("people.trade", `People: trades (${g})`, list, {era: [g]})),
  // Written for no one land, so every region of the world draws them (0.16.0); the Americas keep their own below
  t("people.trade", "People: trades (industrial)", TRADES.industrial.filter(x => !AM_ONLY.has(x.text)), {era: IND}),
  t("people.trade", "People: trades (industrial, the Americas)", TRADES.industrial, {era: IND, culture: AM}),
  // 0.23.0 (B2673): lands that follow another way of life have their own trades (people-trades-world.mjs)
  ...worldTradeTables(TRADES, t)
];
/** The sheet for a trade (looked up by its name, so a Storyteller's new trade gets a plain sheet). */
export const TRADE_SHEETS = Object.fromEntries([...Object.values(TRADES).flat(), ...trades.flatMap(tb => tb.results)].filter(x => x.a).map(x => [x.text, {a: x.a, k: x.k}]));

/** Every table, as the generator core takes them. */
export const PEOPLE_TABLES = [...origins, ...given, ...family, ...bynames, archetypes, motives, secrets, looks,
  ...trades.map(tb => ({...tb, results: tb.results.map(({text, weight}) => ({text, weight}))})), ...WORLD_PEOPLE_TABLES];
