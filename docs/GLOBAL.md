# A global World of Darkness

Ben, 2026-11-12: the whole world is within WoDX's scope. No built, in-development or planned work may look only at Moravia, Germany or Europe. Rothenstein in Moravia is where the first chronicle starts and nothing more.

## The rule for new work

1. Anything that depends on where the chronicle is (names, money, weather, faith, travel, news, clothes, buildings, events) reads the place from the world's regions in `modules/wodx-chronicle/scripts/world-rules.mjs`. It does not assume Moravia.
2. Each such feature covers every region in that file, or says in its notes which regions it leaves for later and lists them here under Open.
3. Research for a feature looks at the books for the whole world first (V20 and the other 20th Anniversary books, then Revised and 2nd edition), for example Kindred of the East, Kindred of the Ebony Kingdom, A World of Darkness, Veil of Night, Wind from the East, Rage Across the World, Dragons of the East and the Year of the Lotus books, and at history beyond Europe.
4. Timelines carry events for every continent in every era.
5. The Every era rule still holds: a region is covered from 1197 to the World of Future Darkness, and where WoDX has no names for a region's people in an age it says from which year it has.

## The world's regions

44 regions (Chronicle 0.48.0). Each has a typical city for the sun, a climate, a money region, and the peoples who live there by age. The Homeland setting picks the chronicle's own; a scene far from home can be given a region from the Clock (Where this scene stands), and the people generator and the weather follow it on that scene.

Europe: Moravia and Bohemia, the German lands, the British Isles, France, Iberia, Italy, the Low Countries, Scandinavia, Poland and the Baltic, Hungary with Transylvania and the Balkans, the Rus and Russia, Greece and Constantinople.
The Middle East and inner Asia: Anatolia, the Levant and Mesopotamia, Egypt, Arabia, the Maghreb, Persia, the steppe and the Silk Road, Siberia.
South and East Asia: India, China, Japan, Korea, mainland Southeast Asia, the Malay world, Tibet and the Himalaya.
Africa south of the Sahara: West Africa, Central Africa, East Africa, Southern Africa.
The Americas: Canada, eastern North America, the American West, Mexico and Central America, the Caribbean, the Andes, Brazil, the southern cone.
Oceania: Australia, Aotearoa New Zealand, the Pacific islands.
The poles: the Arctic, Antarctica.

Where a finer place has no region of its own, use the one around it: Central America under Mexico, Indochina under mainland Southeast Asia, the Philippines under the Malay world, Madagascar and the Horn under East Africa, the Sahara under the Maghreb (north) and West Africa (the Sahel), Mongolia under the steppe, the Caucasus under Anatolia, Ireland under the British Isles, Iceland under Scandinavia, Alaska under the American West. The world map (maps thread) assigns its squares to these ids and keeps the borders; the regions carry one typical city each and no borders.

## Audit of 2026-11-12: what looked only at Europe

| Part | What was found | State |
| --- | --- | --- |
| People generator (Creation) | Two cultures only: Bohemia (Czech, German, Jewish names) and the English-speaking Americas | Widened: 44 cultures, 39 peoples with their own names and name order |
| Money (Storyteller) | Moravia, the German lands, England and the United States; France borrowed German money | Widened: 24 money regions, France with its own |
| Weather (Atmosphere) | Seven climates, four European and three North American | Widened: 29 climates, both sides of the equator |
| A scene far from home (Chronicle) | Latitude and hour only | Widened: the scene's region too |
| Languages (Chronicle), voices | 30 tongues, few from outside Europe and the Near East; made-up speech had five sound sets | Widened: 71 tongues, 21 sound sets, 37 voice languages |
| Households (NPC) | Feminine family names for Czech and German only; "son of" names for Hebrew only | Widened: any people's listed feminine form; ibn and bint, bin and binti |
| Era timelines, 1197 to 2099 | 2,859 events: Europe 2,089, Middle East 571, Asia 561, Moravia 238; the Americas 8 and Africa 88, all in the prologues; Oceania none | Widened for 1197 to 2009: 519 more events (the Americas 235, Africa 177, Oceania 107, a new region), waiting for review. Open: Future Darkness, to be written against the Cyberpunk 2020 timeline |
| Prologue timelines | Being widened in the prologue thread | In hand elsewhere |
| Country map and town generator (Storyteller, tools/mapgen) | The country map's bounds are 12 to 20 east and 47.4 to 51.2 north; towns, roads, rails and airfields are Moravia's | In hand in the maps thread, with a rough world map asked for by Ben |
| Settlement generator (NPC settlement, tools/mapgen ddsettle) | Towns, buildings and street names follow Moravia only | Open in the maps thread: other regions are listed in its decision B2529 |
| Church year (Chronicle church-rules) | The Western church year only: feasts, fasts and nights of revel | Open: other calendars of faith by region |
| How fast word travels (Chronicle media-rules) | Printing, papers, radio, television and the internet dated for the Czech lands | Widened: years for all 44 regions (Chronicle 0.50.0, B2570) |
| Travel (Storyteller road-rules) | Railway, tram and motorway years follow Moravia | Widened: railway, tram, motorway, car, lit and paved road years for all 44 regions (Storyteller 0.57.0, B2571); the Moravian country map is the maps thread's |
| Passers-by (NPC passerby-rules) | Faith and origin follow Moravia's history; clothes are central European | Widened: every way of life by region and year (NPC 0.51.0, B2671) |
| Residents and clergy (NPC resident-rules) | Roles and clergy follow the church in Moravia | Widened: clergy named and chosen by the faith of the place (NPC 0.51.0, B2672); the town generator's households stay Moravian, in the maps thread |
| Trades (Creation people.mjs) | One list of trades for each age, written with Europe in mind (village priest, man-at-arms) | Widened: trades by way of life in every era group (Creation 0.23.0, B2673) |
| Start a chronicle (Storyteller setup) | Asked for Europe, the Americas or Elsewhere; the players' era primers describe Europe | Widened: asks for the homeland. Open: primers by region |
| Lifepaths and Prelude (Creation, Chronicle pod) | Creation 0.21.0: the mortal years drill down from continent and region over all 44 world regions in every age, every region has its own ages, origins, teenage paths and callings, and a region can carry dated origins and marks; since Creation 0.21.0 every one of the 44 regions has dated ones, 1197 to 2022 | Done (Creation 0.22.0 adds orbit, the Moon and Mars for the future age) |
| Factions and politics (NPC) | Sect and faction names are the books' Western ones; no Wan Kuei courts, Laibon, Ashirra or Bastet-held lands as factions | Widened: a faction stands in a world region, and a Kindred faction keeps the court of its land by default: the Laibon in Africa south of the Sahara, the Ashirra in the lands of Islam, the Kuei-jin in East and Southeast Asia (NPC 0.62.0, B2960 to B2962; titles wait on a book check). NPC 0.63.0 (B2963 to B2968) adds a court of the Ravnos in India until 1999, the Ashirra in Central Asia and the Kuei-jin in Tibet; Beast Courts of the Hengeyokai for Garou factions in Asia and lands held by the Bastet in Africa south of the Sahara; and the Wu Lung, the Akashic Brotherhood and the Ahl-i-Batin for mages by region (titles wait on a book check). NPC 0.64.0 (B2970 to B2974): no Kindred court before the settlers in the Americas, the Pacific and the far north, the Nunnehi for fae in the Americas and the Arctic, the Mokolé in Australia and the Bastet in Mesoamerica before the settlers, and Mokolé gatherings and Nagah nests by name. Open: fae of Polynesia and Siberia; the Hsien of East Asia; the Ananasi, Corax, Gurahl, Ratkin and Rokea as bodies of their own |
| Goods and gear (Library) | Mostly European and North American goods | Widened: everyday goods know where they are at home, with goods of every way of life and the coin of the place, and containers fill by region (Library 0.19.0, Interactables 0.36.0, B2680 to B2682). Open: Gear by era, crafting and cookery lists by region |
| Calendar (Chronicle) | Julian and Gregorian, with reform dates for a few lands; no Islamic, Hebrew, Chinese or other reckonings shown | Open: review desk |
| Weather history (Atmosphere eraShift) | The Little Ice Age and 1816 as Europe and North America felt them, applied everywhere | Open, minor |
| Encyclopaedia (Library) | Follows the books read so far; the Year of the Lotus, Ebony Kingdom and other world books are thin | Open: reading list on the review desk |
| Markets, battles, sieges and ships (Storyteller) | Rules are placeless; the armies, ships and market goods named are European | Open: review desk |
| NPC look and sprites (Paperdoll) | On hold with Ben; body and dress should cover every region when it resumes | Noted for that thread |

## Open, not built yet

Review desk for the scope calls below (eight questions, picks saved in its `verdicts` collection, one doc per question id): https://claude.ai/artifact/HoDkSxow9oYA5GttPzn1Nn

- Timeline events for the Americas, Africa and Oceania in the Future Darkness branch (1990 to 2099), and a book check of the eight new cards that carry a World of Darkness reading.
- Built 13 November 2026: the spread of news and travel dates by region, and NPC routines by faith (Friday prayer, the Sabbath, temple days; Chronicle 0.50.0, Storyteller 0.57.0, NPC 0.49.0, B2570 to B2573). Built the same day: the five daily prayers by the sun for every Muslim NPC on a ready routine, Ramadan's nights, and mosques, synagogues and temples as kinds of place of their own, with lines in WoDX Senses (NPC 0.50.0, Senses 0.9.0, B2660 to B2662). Still open: the daily services of the synagogue and the temple's hours of worship in lay routines; the town generator tagging its houses of worship by the faith of the place.
- Built 13 November 2026: passers-by, clergy and trades by region, through a way of life for each region and year (Chronicle 0.51.0, NPC 0.51.0, Creation 0.23.0, B2670 to B2673). Still open: the town generator writing households for other regions (maps thread); local looks for passers-by within one way of life. Built the same day: 33 regions dress, carry and sell their own wares within their way of life, with a few kinds of their own (NPC 0.52.0, B2674); lands with a way of life to themselves (India, Japan, Tibet and others) keep theirs.
- Built 13 November 2026: money of their own for Korea, mainland Southeast Asia, the Malay world, Hungary and the Balkans, Greece, the Caribbean, the Andes, the River Plate and Chile, Kongo, Tibet and Canada, and coin of the place in the purse, changed in Money by era (Storyteller 0.58.0, Chronicle 0.50.1, B2650 to B2652). Still open: the Philippines, Indochina and the rest of the Balkans pay as their wider region does; The sheet's coin names follow the chronicle's money for every region when Coin of which land is set to The chronicle's money (Sheets 0.15.2, B2653).
- Peoples WoDX has no names for yet: the first nations of North America and the Caribbean, Aboriginal Australians, the peoples of central Africa, the Maya, the Berbers, Armenians, Sephardi and Mizrahi Jews, Khmer, Filipinos, and the Inuit and other peoples of the far north.
- Places that stand under a wider region for now and may want their own: the Philippines, Indochina, Central America, the Caucasus, Mongolia, Madagascar, the Horn of Africa, the Sahara, Ireland, Iceland, Alaska.

## Ben's picks, 13 November 2026

All eight scope calls on the Global World Desk took the recommended option (B2535).

- Built: money changers abroad (Storyteller 0.56.0, B2536), the holy days of the great faiths by region (Chronicle 0.49.0, B2537), weather by region (Atmosphere 0.15.0, B2538).
- Approved as they stand: the 511 plain-history timeline events for the Americas, Africa and Oceania.
- Built from the PC's book check: 56 Future Darkness events for the Americas, Africa and Oceania, 1990 to 2023, from the Cyberpunk 2020 books (Deep Space for orbit).
- Waiting on the PC's book check (job global-world-book-check-2026-11-13): the eight timeline cards with a World of Darkness reading (first pass in, the scan-only books in OCR); the hidden world of East Asia and Africa by the book.
- Standing: peoples without names are added one at a time with source notes and a desk; finer regions only when a chronicle goes there.
