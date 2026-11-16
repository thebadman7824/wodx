/**
 * WoDX Chronicle 0.25.0: the signature features of each clan, bloodline, tribe and the like (the Splat Features Desk,
 * approved by the owner 2026-11-12). One table per line; the rules that read it are in scripts/signature-rules.mjs.
 *
 * Mechanics only, in our own words. Page refs: "pdf" pages unless marked printed. V20 first, then V20 Dark Ages.
 * Rows marked house: true go past what the books say (the owner's notes on the desk, or a gap the book check found).
 */
import {DAY, LUNAR_MONTH_DAYS, WEEK} from "../scripts/terms.mjs";
export {DAY, WEEK};

/**
 * Bloodlines, castes and Laibon legacies (Chronicle 0.29.0). They come before the clans so that "True Brujah" or
 * "Old Clan Tzimisce" finds its own row first. feature "line": a text feature with roll effects (effects), a Masquerade
 * sign card when a mortal deals with them (face, faceText), and engines borrowed from a clan (also: muse, soil,
 * contracts, family, vice). grace: nights without soil before pools halve.
 */
export const BLOODLINES = [
  {key:  "truebrujah", label:  "True Brujah", match:  ["true brujah"], feature:  "line", title:  "Passion fades, time bends", page:  "V20 pdf 421 (p. 413)", text:  "Emotion fades with the years: Empathy and rolls that need warmth are one die worse. Temporis bends time: a True Brujah who slows the world takes extra actions in fights and on the move.", effects:  [{tags:  ["empathy"], dice:  -1}]},
  {key:  "salubriat", label:  "Salubri antitribu", match:  ["salubri antitribu"], feature:  "line", title:  "Righteous fury", page:  "V20 pdf 439 (p. 431)", text:  "The warrior Salubri hunt the wicked: against a foe they know is wicked (Auspex or a codex page), fight rolls gain a die. Harming an innocent costs a Willpower point. The third eye opening is a Masquerade sign.", face:  true, faceText:  "saw the third eye open"},
  {key:  "salubri", label:  "Salubri", match:  ["salubri"], feature:  "line", title:  "The healer's burden", page:  "V20 pdf 417 (p. 409)", text:  "Feeding on an unwilling vessel costs a Willpower point. The third eye opening is a Masquerade sign. Tremere NPCs treat a Salubri as prey.", face:  true, faceText:  "saw the third eye open"},
  {key:  "koldun", label:  "Old Clan Tzimisce", match:  ["old clan", "koldun", "koldunic"], feature:  "line", title:  "Earth, wind, fire and water", page:  "Koldunic sorcery book pdf 2; Lore of the Clans pdf 6", text:  "No Vicissitude; Koldunic sorcery works the elements of the domain. Native soil matters as for any Tzimisce, but the old blood holds out one night longer before pools halve (house reading).", also:  ["soil"], grace:  1, house:  true},
  {key:  "vizier", label:  "Assamite viziers", match:  ["vizier", "viziers"], feature:  "line", title:  "The vizier's obsession", page:  "V20 Dark Ages pdf 44 (p. 43); Lore of the Clans pdf 14-15", text:  "A vizier is obsessed with their best mental or creative field. It works as a Muse: a work, a study or a place of learning whose Obsession rises a point a week away from it.", also:  ["muse"]},
  {key:  "assamitesorcerer", label:  "Assamite sorcerers", match:  ["assamite sorcerer", "assamite sorcerers"], feature:  "line", title:  "Contracts of the mind", page:  "Lore of the Clans pdf 14-15", text:  "Sorcerers keep the clan's contracts (as the warrior caste) and their rituals as long tasks.", also:  ["contracts"]},
  {key:  "baali", label:  "Baali", match:  ["baali"], feature:  "line", title:  "The pact", page:  "V20 pdf 403 (p. 395)", text:  "Objects of faith burn a Baali to look at or touch. The pact with the patron is kept as contracts: each promise has a payment due on the clock, and missing one lowers the patron's favour. From 1999 a Baali can meet the Earthbound and the Fallen through the crossover referee.", also:  ["contracts"]},
  {key:  "daughters", label:  "Daughters of Cacophony", match:  ["daughters of cacophony", "daughter of cacophony", "cacophony"], feature:  "line", title:  "The endless music", page:  "V20 pdf 406 (p. 398)", text:  "They hear music all the time: Perception rolls are one harder. A song can carry Melpominee over a crowd of passers-by.", effects:  [{tags:  ["perception"], difficulty:  1}]},
  {key:  "gargoyle", label:  "Gargoyles", match:  ["gargoyle", "gargoyles"], feature:  "line", title:  "Stone and the master's voice", page:  "V20 pdf 409 (p. 401)", text:  "Appearance 0, so a mortal who sees one sees a monster: a breach. Highly open to mind control: rolls to resist Dominate are two harder. They fly and roost on high places.", face:  true, faceText:  "saw a Gargoyle", effects:  [{tags:  ["resist-dominate"], difficulty:  2}]},
  {key:  "kiasyd", label:  "Kiasyd", match:  ["kiasyd"], feature:  "line", title:  "Cold iron", page:  "V20 pdf 413 (p. 405)", text:  "Touching iron calls for a frenzy roll, and cold iron does aggravated harm. They hoard knowledge: books from the Library are their trade goods, and they meet changelings easily."},
  {key:  "samedi", label:  "Samedi", match:  ["samedi"], feature:  "line", title:  "The rotting dead", page:  "V20 pdf 419 (p. 411)", text:  "Putrid: Appearance 0, and a mortal who sees one sees a corpse that walks, a breach. They trade in bodies and the goods of death.", face:  true, faceText:  "saw a Samedi's rotting face"},
  {key:  "harbingers", label:  "Harbingers of Skulls", match:  ["harbingers of skulls", "harbinger of skulls", "harbingers"], feature:  "line", title:  "Skull faces", page:  "V20 pdf 411 (p. 403)", text:  "Deathly pale and shrivelled, Appearance 0: a breach to mortal eyes. The Shadowlands are home ground, and like the Giovanni they keep a ledger of the dead they bind.", face:  true, faceText:  "saw a Harbinger's skull face", also:  ["family"]},
  {key:  "ahrimanes", label:  "Ahrimanes", match:  ["ahrimanes", "ahrimane"], feature:  "line", title:  "Spirit pacts on the land", page:  "V20 pdf 422 (p. 414)", text:  "An Ahrimane can strike a pact with a spirit of a place on the Umbra realm map. The spirit warns of intruders, and the pact costs a blood point a month, kept as a contract with a due date.", also:  ["contracts"]},
  {key:  "anda", label:  "Anda", match:  ["anda"], feature:  "line", title:  "The horde's road", page:  "V20 pdf 424 (p. 416)", text:  "Mounted, an Anda and their mount travel one step faster, and riding rolls gain a die. Frenzy leaves animal marks as it does on any Gangrel, and they heal in a month the same way. Dark Ages only.", also: ["marks"], effects:  [{tags:  ["ride"], dice:  1}]},
  {key:  "lhiannan", label:  "Lhiannan", match:  ["lhiannan"], feature:  "line", title:  "The grove's blood", page:  "V20 Dark Ages pdf 94 (p. 93)", text:  "Few can pass on the Curse. Feeding on a worshipper at a sacred grove counts double. Their wild, blood-stained look and skull masks are a Masquerade sign in towns.", face:  true, faceText:  "saw a Lhiannan in the wild garb"},
  {key:  "noiad", label:  "Noiad", match:  ["noiad"], feature:  "line", title:  "The Northern Lights", page:  "V20 pdf 434 (p. 426); V20 Dark Ages Low Clans pdf 133-134", text:  "Gangrel of the far north who guard a Sami people, an NPC household in their care. A drum lets the spirit walk in the Umbra while the body sleeps (house reading). Survival in the far north is one easier.", effects:  [{tags:  ["survival"], dice:  1}], house:  true},
  {key:  "bloodbrothers", label:  "Blood Brothers", match:  ["blood brothers", "blood brother"], feature:  "line", title:  "One mind, many bodies", page:  "V20 pdf 404 (p. 396)", text:  "Made in circles of 3 to 10 that share one mind: what one sees, all know. With Sanguinus they pass wounds and limbs between them on the body plan. A circle fights as one formation."},
  {key:  "lamia", label:  "Lamia", match:  ["lamia"], feature:  "line", title:  "The kiss that sickens", page:  "V20 Dark Ages pdf 92 (p. 91)", text:  "The bite passes a wasting plague, one lethal level a night, unless the Lamia holds it back. A town where they feed can start a plague house event. They guard the Path of Four Humors."},
  {key:  "nagaraja", label:  "Nagaraja", match:  ["nagaraja"], feature:  "line", title:  "Eaters of flesh, seers of ghosts", page:  "V20 pdf 414 (p. 406)", text:  "They must eat flesh as well as drink blood. They always see wraiths nearby, and keep a ledger of the dead they bind, as the Giovanni do.", also:  ["family"]},
  {key:  "cyberpunks", label:  "Cyberpunks", match:  ["cyberpunks", "cyberpunk"], feature:  "line", title:  "Machines over blood", page:  "World of Future Darkness p. 19 (pdf 6)", text:  "Future Darkness branch, from 2016. Celerity, Potence and Technica, the Discipline of machines: it lets them jack in by touch, wake dead decks and walk a system as a ghost. A night when they lean on other Disciplines more than on machines costs Willpower (the Net window and a chat card show it)."},
  {key:  "akunanse", label:  "Akunanse", match:  ["akunanse"], feature:  "line", title:  "The Weavers", page:  "Kindred of the Ebony Kingdom pdf 48-64", text:  "Closer to the Beast as they learn: each Abombwe dot makes frenzy one easier to fall into. Their woven stories are lore pages among the Laibon.", effects:  [{tags:  ["resist-frenzy"], difficulty:  1}]},
  {key:  "guruhi", label:  "Guruhi", match:  ["guruhi"], feature:  "line", title:  "The Kings", page:  "Kindred of the Ebony Kingdom pdf 48-64", text:  "Their looks change with their mood, so their lies are harder to sell: deceit is one harder.", effects:  [{tags:  ["subterfuge", "deceit"], difficulty:  1}]},
  {key:  "ishtarri", label:  "Ishtarri", match:  ["ishtarri"], feature:  "line", title:  "The Gluttons", page:  "Kindred of the Ebony Kingdom pdf 48-64", text:  "Easily addicted to excess: their own vice works as a Ravnos vice, with a Self-Control prompt a night when a chance comes up in talk or trade.", also:  ["vice"]},
  {key:  "kinyonyi", label:  "Kinyonyi", match:  ["kinyonyi"], feature:  "line", title:  "The Nomads", page:  "Kindred of the Ebony Kingdom pdf 48-64", text:  "Always moving: travel is cheaper, and a long stay in one place pulls at them as a Ravnos vice of the road would."},
  {key:  "naglopers", label:  "Naglopers", match:  ["naglopers", "nagloper"], feature:  "line", title:  "The Horrors", page:  "Kindred of the Ebony Kingdom pdf 48-64", text:  "They must bury themselves before sleep: a day's rest needs a grave or an earth floor, or there is no healing that day. Earth carried with them counts, as native soil does.", also:  ["soil"]},
  {key:  "osebo", label:  "Osebo", match:  ["osebo"], feature:  "line", title:  "The Pride", page:  "Kindred of the Ebony Kingdom pdf 48-64", text:  "Frenzy comes easily: rolls to resist it are one harder. A pride of Osebo hunts as one formation.", effects:  [{tags:  ["resist-frenzy"], difficulty:  1}]},
  {key:  "shango", label:  "Shango", match:  ["shango"], feature:  "line", title:  "The Judges", page:  "Kindred of the Ebony Kingdom pdf 48-64", text:  "A Shango can call a judgement among the Laibon, a faction politics card whose verdict moves standing."},
  {key:  "xidundu", label:  "Xi Dundu", match:  ["xi dundu"], feature:  "line", title:  "The Shadows", page:  "Kindred of the Ebony Kingdom pdf 48-64", text:  "They cast no shadow under any light: a mortal who notices it in a bright place has seen a breach.", face:  true, faceText:  "saw that a Xi Dundu casts no shadow"}
];

/** Vampire clans and bloodlines. match: words that name the clan in a sheet's clan field or the bloodline flag. */
export const VAMPIRE = [
  ...BLOODLINES,
  {key: "toreador", label: "Toreador", match: ["toreador"], feature: "muse",
    title: "Muse and Obsession", page: "V20 pdf 75 (p. 67); V20 Dark Ages pdf 62 (p. 61)",
    text: "A person, work or place that entranced the Toreador can become a Muse. Each week away from it the Obsession track rises by one, and the Toreador's Self-Control roll against the next beautiful thing gets harder by the same amount. Seeing the Muse lowers it; owning it or making something for it lowers it more. Harm to a Muse who is a person raises it at once and calls for a frenzy check."},
  {key: "setite", label: "Followers of Set", match: ["setite", "followers of set", "follower of set", "set"], feature: "corruption",
    title: "Corruption ledger", page: "V20 pdf 61 (p. 53); V20 Dark Ages pdf 60 (p. 59); Path of Typhon V20 pdf 346 (p. 338)",
    text: "Each mortal or NPC the Setite works on gets a hidden Corruption track (0 to 5) with one named vice. A won seduction, persuasion, deceit or bribe raises it, and so does a gift of something that feeds the vice. Each step makes the victim's own resistance to the vice harder. At 3 the victim does small wrongs for the Setite; at 5 they belong to the Setite, ready to be taken as a retainer or ghoul, or used as leverage. Someone else (a priest, a hunter, a friend) can work the track down."},
  {key: "brujah", label: "Brujah", match: ["brujah"], feature: "cause",
    title: "The Cause and the Rant", page: "V20 pdf 59 (p. 51); V20 Dark Ages pdf 46 (p. 45)",
    text: "The Brujah holds a Cause, picked from the list or written by the player and approved by the Storyteller. When a scene goes against it, the Brujah rolls to keep their temper with the clan's +2 frenzy difficulty. Each success adds a point toward a Rant (three points): a gathering the Brujah can call that can turn a crowd into a mob."},
  {key: "malkavian", label: "Malkavian", match: ["malkavian", "malkavians"], feature: "glimpse",
    title: "Glimpses through the Cobweb", page: "V20 pdf 69 (p. 61); V20 Dark Ages pdf 54 (p. 53)", house: true,
    text: "Once a night the Malkavian may ask for a glimpse: a riddle about the next dated event, for that player only. If it comes true, a Willpower point comes back. Their derangement colours what they hear when NPCs answer them, with the true reply always shown beneath."},
  {key: "gangrel", label: "Gangrel", match: ["gangrel"], feature: "marks",
    title: "Marks of the Beast", page: "V20 pdf 63 (p. 55); V20 Dark Ages pdf 50 (p. 49)", house: true,
    text: "Each frenzy leaves an animal mark with an edge and a cost. House rule: a mark lasts a month and then heals as a wound would. Wild animals treat a Gangrel as one of their own, and out of town Survival rolls to find earth to sleep in or to read tracks are one easier."},
  {key: "tzimisce", label: "Tzimisce", match: ["tzimisce"], feature: "soil",
    title: "Native soil", page: "V20 pdf 79 (p. 71), halving pdf 447; V20 Dark Ages pdf 66 (p. 65)",
    text: "Two handfuls of earth from the place the Tzimisce was born or Embraced. A night's rest without it halves every dice pool until the vampire rests on it again. Carrying the soil as an item counts as resting on it; lose it to a thief or leave it behind and the next night is hard. A Tzimisce's domain is a holding whose tenants answer to the lord."},
  {key: "lasombra", label: "Lasombra", match: ["lasombra"], feature: "camera",
    title: "No image, living darkness", page: "V20 pdf 67 (p. 59); V20 Dark Ages pdf 52 (p. 51)", house: true,
    text: "A Lasombra casts no reflection. House rule: no photograph, film or camera holds their image either. Where a scene is marked as watched by a camera of the era, an empty frame where a person stood is a breach of the Masquerade found later by whoever studies the picture. From the World of Future Darkness every scene counts as watched unless the Storyteller says otherwise."},
  {key: "ravnos", label: "Ravnos", match: ["ravnos"], feature: "vice",
    title: "The vice that calls", page: "V20 pdf 73 (p. 65); V20 Dark Ages pdf 58 (p. 57)",
    text: "The Ravnos holds one vice: lying, theft, cheating or a dare. When a chance for it comes up in talk or trade, the player rolls Self-Control; failing means the act happens. The pull grows with each week the vice goes unfed and with a long stay in one domain. Moving on resets the stay."},
  {key: "caitiff", label: "Caitiff", match: ["caitiff", "clanless"], feature: "oddity", house: true,
    title: "Nobody's child", page: "V20 pdf 40; Thin Blood V20 pdf 491 (p. 483)",
    text: "No clan weakness and no clan to speak for them: in a Camarilla court their Status needs a sponsor, while Anarch and Sabbat company takes them as they are. House rule: a thin-blooded Caitiff has a one in ten chance each year to wake with an odd gift (walking at dusk, keeping down a little food, passing for mortal at a glance), offered to the Storyteller as a card."},
  {key: "nosferatu", label: "Nosferatu", match: ["nosferatu"], feature: "secrets",
    title: "The trade in secrets", page: "V20 pdf 71 (p. 63), secrets pdf 28 (p. 20); V20 Dark Ages pdf 56 (p. 55)",
    text: "A Nosferatu's true face is a breach of the Masquerade to any mortal who sees it, unless Obfuscate holds, and the breach goes on the record. What the Nosferatu learns can be written down as a page of secrets, an item that can be kept, sold or traded. A fresh secret buys a minor boon; a stale one only a trivial boon. A secret goes stale as fast as word travels in the age: slowly by word of mouth, overnight once the internet is here."},
  {key: "tremere", label: "Tremere", match: ["tremere"], feature: "pyramid",
    title: "Rank in the Pyramid", page: "V20 pdf 77 (p. 69); V20 Dark Ages pdf 64 (p. 63); the ranks are a house reading", house: true,
    text: "Every Tremere holds a rank in the Pyramid, from an apprentice of the first circle up to the Inner Council. An order from someone of higher rank arrives as a card: obey it, or refuse at the cost of a Willpower point. The order stands in the Ledger as an oath until it is done. The clan's first-drink bond to the elders is built already."},
  {key: "ventrue", label: "Ventrue", match: ["ventrue"], feature: "domain",
    title: "Domain and duty", page: "V20 pdf 81 (p. 73); V20 Dark Ages pdf 68 (p. 67)",
    text: "Once a month a Ventrue may turn their holdings' income into influence instead: a minor boon owed by a mortal institution of the age (a bishop's court, a guild, a bank, a ministry, a corporation), kept in the Ledger. Losing a holding means answering to the clan, which thinks less of them. The palate is built already."},
  {key: "assamite", label: "Assamite", match: ["assamite", "assamites", "banu haqim"], feature: "contracts",
    title: "Contracts and the tithe", page: "V20 pdf 57 (p. 49); V20 Dark Ages pdf 42 (p. 41)",
    text: "A contract names a target, a price and a deadline on the clock. Finishing it raises the Assamite's standing at Alamut and sends a tenth of the fee to the clan as a tithe; missing the deadline lowers that standing."},
  {key: "giovanni", label: "Giovanni", match: ["giovanni", "cappadocian", "cappadocians"], feature: "family",
    title: "The Family and its dead", page: "V20 pdf 65 (p. 57); V20 Dark Ages pdf 48 (p. 47); 1444 is a house reading", house: true,
    text: "The Giovanni keep a ledger of the wraiths they have bound, each held by a fetter item. Calling one brings it to stand, unseen, beside them. Before 1444 (a house reading of the date) the line is the Cappadocians, whose deathly look is a Masquerade sign up close. The double-damage Kiss is built already."},
];

/** Tremere ranks, lowest first (house reading: V20 core gives no ladder). */
export const TREMERE_RANKS = ["Apprentice of the first circle", "Apprentice of the second circle", "Apprentice of the third circle",
  "Apprentice of the fourth circle", "Apprentice of the fifth circle", "Apprentice of the sixth circle", "Apprentice of the seventh circle",
  "Regent", "Lord", "Pontifex", "Inner Council"];

/** Mortal institutions a Ventrue can draw a boon from, by the year they first make sense. */
export const INSTITUTIONS = [
  {from: 0, label: "the bishop's court"}, {from: 0, label: "the town council"}, {from: 0, label: "a craft guild"}, {from: 0, label: "the royal court"},
  {from: 1400, label: "a merchant house"}, {from: 1400, label: "a bank"},
  {from: 1800, label: "a ministry"}, {from: 1830, label: "a factory owners' association"}, {from: 1848, label: "a newspaper"},
  {from: 1900, label: "the police"}, {from: 1950, label: "a corporation"}, {from: 2023, label: "an arcology board"},
];

/** How many days a secret stays fresh, by the way word travels in the age (media-rules ids). */
export const SECRET_FRESH = {word: 60, print: 30, papers: 14, radio: 7, television: 3, internet: 1, net: 1};

/** Assamite standing at Alamut. */
export const STANDING_MAX = 5;
export const TITHE = 0.1;

/** Ghouls (V20 Dark Ages ghoul rules in every era, the owner's standing rule). */
export const GHOUL = {key: "ghoul", label: "Ghoul", match: [], feature: "ghoul", title: "The fix", page: "V20 Dark Ages pdf 38",
  text: "A ghoul lives on a domitor's vitae. A month without a drink drains a blood point; with none left, the years they have held off begin to come back. The craving pulls at them when Kindred blood is spilled close by: a Self-Control roll, made for them, or a Willpower point goes."};

/** Revenant family traits (the owner 2026-11-12: new families pick one). effects: roll effects; also: a borrowed engine. */
export const FAMILY_TRAITS = {
  beasts: {label: "Beasts and kennels", effects: [{tags: ["animal ken"], dice: 1}]},
  money: {label: "Money, banks and courts", effects: [{tags: ["finance"], dice: 1}]},
  learning: {label: "Faith or learning", effects: [{tags: ["academics", "occult"], dice: 1}]},
  vice: {label: "Vice", effects: [], also: ["vice"]},
  war: {label: "War", effects: [{tags: ["melee", "brawl"], dice: 1}]},
  craft: {label: "A craft", effects: [{tags: ["crafts"], dice: 1}]},
};

/** The revenant families of the books (Guide to the Sabbat pdf 219; V20 Dark Ages pdf 454). */
export const REVENANT_FAMILIES = [
  {key: "bratovitch", label: "Bratovitch", trait: "beasts", text: "Hunters and kennel-keepers with their hounds."},
  {key: "grimaldi", label: "Grimaldi", trait: "money", text: "In banks, courts and counting houses."},
  {key: "obertus", label: "Obertus", trait: "learning", text: "In monasteries and libraries."},
  {key: "zantosa", label: "Zantosa", trait: "vice", text: "Given over to vice and pleasure."},
];

/** Ravnos vices (V20 Ravnos weakness, own words). acts: social or trade acts that feed it. */
export const RAVNOS_VICES = [
  {key: "lying", label: "Lying", acts: ["con", "fasttalk"]},
  {key: "theft", label: "Theft", acts: ["lift"]},
  {key: "cheating", label: "Cheating", acts: ["barter", "buy", "sell"]},
  {key: "dare", label: "A dare taken", acts: []},
];

/** Camera kinds by year (house rule: the books name mirrors only). */
export const CAMERAS = [
  {from: 1839, label: "a photograph"},
  {from: 1895, label: "a film camera"},
  {from: 1970, label: "a video camera or closed-circuit television"},
  {from: 2000, label: "a digital camera"},
];
/** From this year every scene counts as watched unless marked otherwise (house rule, World of Future Darkness). */
export const CAMERAS_EVERYWHERE = 2023;

/** Odd gifts a thin-blooded Caitiff may wake with (house rule). */
export const ODD_GIFTS = [
  {key: "dusk", label: "Walks at dusk and dawn", text: "The half-light no longer burns; full sun still does."},
  {key: "food", label: "Keeps down a little food", text: "Can eat a small meal without vomiting it up, enough to pass at a table."},
  {key: "mortal", label: "Passes for mortal at a glance", text: "Warm skin and a heartbeat when spending a blood point, for a scene."},
  {key: "sun", label: "Shrugs off a little sun", text: "One less die of damage from sunlight."},
];
export const ODD_GIFT_CHANCE = 0.1;

/** Brujah causes (the owner 2026-11-12: a list to pick from, NPCs draw from it too). from/to: years the cause makes sense. */
export const CAUSES = [
  {key: "city", label: "The freedom of a city from its lord or Prince"},
  {key: "faith", label: "A faith, or a fight against one"},
  {key: "philosophy", label: "A philosophy of the Kindred (the old dream of Carthage, the Road of Humanity)"},
  {key: "people", label: "A people, a trade or a class held down by others"},
  {key: "grudge", label: "A grudge against a named elder"},
  {key: "learning", label: "Learning and its schools against those who would burn the books"},
  {key: "anarch", label: "The Anarch cause (house reading: from 1400)", from: 1400},
  {key: "nation", label: "A nation's freedom", from: 1776},
  {key: "workers", label: "The workers against their masters", from: 1830},
  {key: "equality", label: "Equal rights for all", from: 1848},
  {key: "counter", label: "Against the system: counterculture, punk, the street", from: 1955},
  {key: "net", label: "Free data and free nets against the corporations", from: 1985},
];

/** Setite vices: what feeds each one as a gift. Matched against a Library good's kind, its substance and the words of its name. */
export const VICES = [
  {key: "greed", label: "Greed", feeds: ["coin", "valuables", "money", "gold", "silver", "jewel"]},
  {key: "lust", label: "Lust", feeds: ["vice", "perfume", "silk"]},
  {key: "drink", label: "Drink", feeds: ["alcohol", "brandy", "wine", "ale", "beer", "mead", "vodka", "whisk", "gin", "rum", "slivovitz", "absinthe"]},
  {key: "drug", label: "A drug", feeds: ["drugs", "opium", "opiate", "laudanum", "stimulant", "cannabis", "hashish"]},
  {key: "pride", label: "Pride", feeds: ["cloth", "valuables", "keepsake", "fine", "portrait"]},
  {key: "revenge", label: "Revenge", feeds: ["arms", "poison", "knife", "dagger"]},
  {key: "gluttony", label: "Gluttony", feeds: ["food", "delicacy", "sweet"]},
  {key: "gambling", label: "Gambling", feeds: ["dice", "cards", "toys", "lottery"]},
];

/** What each step of the Corruption track means. */
export const CORRUPTION_STEPS = [
  "untouched",
  "tempted: the victim thinks of the vice more often",
  "indulging: the victim seeks it out",
  "compromised: the victim will do small wrongs for the Setite",
  "bound: the victim hides the Setite's secrets and lies for them",
  "owned: the victim belongs to the Setite (a retainer or ghoul, or leverage)",
];

/** Gangrel marks: edge and cost. Effects use the trait effect shapes other modules already read. */
export const MARKS = [
  {key: "ears", label: "Pointed, furred ears", edge: "+1 die to hearing rolls", cost: "-1 Appearance", effects: [{tags: ["hearing"], dice: 1}, {tags: ["appearance"], dice: -1}], sense: "sound"},
  {key: "eyes", label: "Animal eyes that shine", edge: "sees in near darkness (half the darkness penalty)", cost: "a Masquerade sign to mortals", effects: [{tags: ["sight"], dice: 1}], sense: "sight", sign: true},
  {key: "nose", label: "A muzzle or wet nose", edge: "+1 die to smell and tracking", cost: "-1 Appearance", effects: [{tags: ["smell", "tracking"], dice: 1}, {tags: ["appearance"], dice: -1}], sense: "smell"},
  {key: "fur", label: "Fur along the arms and back", edge: "no penalty from cold weather", cost: "-1 Appearance", effects: [{tags: ["cold"], dice: 1}, {tags: ["appearance"], dice: -1}]},
  {key: "claws", label: "Claws that don't retract", edge: "claws as natural weapons (Strength + 1 lethal, house rule)", cost: "-1 die to fine handwork", effects: [{tags: ["crafts", "larceny"], dice: -1}], weapon: true},
  {key: "tail", label: "A tail", edge: "+1 die to balance and climbing", cost: "a Masquerade sign to mortals", effects: [{tags: ["climb", "athletics"], dice: 1}], sign: true},
  {key: "teeth", label: "A mouth of animal teeth", edge: "+1 die to Intimidation", cost: "-1 Appearance, slurred speech", effects: [{tags: ["intimidation"], dice: 1}, {tags: ["appearance"], dice: -1}]},
];

export const MARK_LASTS = 30 * DAY;
export const RANT_POINTS = 3;
export const OBSESSION_MAX = 5;
export const CORRUPTION_MAX = 5;

/* ---------------- Malkavian (Chronicle 0.26.0) ---------------- */

/**
 * How a Malkavian hears what NPCs tell them, by derangement (V20 pdf 69: one derangement that never goes away). The
 * true reply always shows too. match: words in the sheet's derangement field. The owner asked for many varied lines for
 * each kind (2026-11-12). {name} is who spoke, {topic} what was asked about.
 */
export const DERANGEMENTS = [
  {key: "paranoia", label: "Paranoia", match: ["paranoia", "paranoid"], lines: [
    "{name} glanced at the door before answering. Someone is listening.",
    "The answer came too fast, as if {name} had rehearsed it.",
    "{name} is lying about {topic}. Not all of it, but enough.",
    "There was a second voice under {name}'s words, telling someone else where you are.",
    "{name} smiled at the wrong moment. They know what you are.",
    "Every word about {topic} is a hook baited for you.",
    "{name} keeps their hands where you can't see them.",
    "They've been paid to tell you exactly this.",
    "The pause before {name} spoke was the length of a signal.",
    "{name} repeats a word you said last night, to someone else. How do they know it?",
  ]},
  {key: "megalomania", label: "Megalomania", match: ["megalomania", "megalomaniac"], lines: [
    "{name} is clearly awed to be speaking with you, and hides it badly.",
    "What {name} means is that {topic} only matters because you have taken an interest.",
    "{name} would kneel, if they dared.",
    "They tell you this because they hope you'll remember them when you rule.",
    "{name} knows less than you about {topic}, and the shame of it shows.",
    "Every answer is a small offering laid at your feet.",
    "{name} is waiting for your permission to go on.",
    "Somewhere in this reply is a plea for your favour.",
  ]},
  {key: "schizophrenia", label: "Schizophrenia", match: ["schizophrenia", "schizophrenic", "voices"], lines: [
    "Behind {name}'s words, the voices laugh at a joke about {topic}.",
    "The candle flame says the opposite of what {name} said.",
    "A voice from the wall corrects {name}, gently.",
    "{name}'s shadow mouths a different answer.",
    "The voices agree with {name}. That is new, and frightening.",
    "Someone in the next room answers the question before {name} does.",
    "Every third word {name} speaks is in a voice from your childhood.",
    "The voices say {topic} is a door. They won't say where it opens.",
    "{name} is not alone in their own head either. You can hear the other one.",
  ]},
  {key: "obsession", label: "Obsession", match: ["obsession", "obsessive", "obsessed", "fixation"], lines: [
    "None of it matters, except the part that touches your fixation, and there was such a part.",
    "{name} said one word that belongs to your fixation. You missed the rest.",
    "You hear only the shape of {topic}, and it is the shape of what you seek.",
    "{name} is hiding something about the thing you want. You can tell from the way they breathe.",
    "Everything {name} says can be bent toward it. You bend it.",
    "It is a clue. Everything is a clue, if you look hard enough.",
    "{name} talks about {topic}, and you count the words, and the number means something.",
    "The answer is useless, so you ask yourself the real question instead.",
  ]},
  {key: "multiple", label: "Multiple personalities", match: ["multiple personalit", "split personalit", "dissociative"], lines: [
    "One of you liked that answer. Another wants {name} dead.",
    "You hear it twice, once for each of you, and the two don't match.",
    "Someone else in your head knows {name}. They don't say from where.",
    "The other one takes notes while you listen.",
    "You weren't the one who asked about {topic}. Who was?",
    "{name} looks at you as if you'd said something you don't remember saying.",
    "One of you heard a threat. One of you heard a promise.",
    "The quiet one inside you says this is the most important thing you will hear tonight.",
  ]},
  {key: "regression", label: "Regression", match: ["regression", "childish", "infantile"], lines: [
    "{name} sounds like a grown-up who wants you to go to bed.",
    "You want {name} to say it again, slower, with the scary part left out.",
    "It is a story, and you want to know how it ends.",
    "{name} is cross with you. You can tell. You didn't do it.",
    "You'd like a present for listening so well.",
    "Grown-ups always talk about {topic} when they think you're asleep.",
    "{name} smells like someone from before, someone who was kind.",
    "If you are very good, {name} might like you.",
  ]},
  {key: "hysteria", label: "Hysteria", match: ["hysteria", "hysterical"], lines: [
    "Every word about {topic} lands like a slap.",
    "{name} is shouting. No, they aren't. They are.",
    "It is too much, all of it, all at once.",
    "Your skin crawls at {name}'s tone, and you can't say why.",
    "You hear the worst version of it, and it stays with you.",
    "{name} has no idea how close you are to screaming.",
    "The room is too small for this conversation.",
    "Something in the answer is a spark near dry straw.",
  ]},
  {key: "manic", label: "Manic-depression", match: ["manic", "depress", "melancholia", "melancholy"], lines: [
    "It is the most wonderful news, or the worst. It changes as you listen.",
    "Nothing {name} says can matter, in the end.",
    "{topic}! Of course. Everything is connected, and it is glorious.",
    "You hear it from far away, through grey water.",
    "You want to act on it now, tonight, at once.",
    "What's the use? {name} will be dust, and so will this.",
    "{name} is brilliant. You love {name}. For now.",
    "It is all so heavy that you can barely lift the words.",
  ]},
  {key: "animism", label: "Sanguinary animism", match: ["sanguinary animism", "animism"], lines: [
    "The last one you fed on whispers along with {name}.",
    "Someone's blood in you remembers {name}.",
    "A dead mortal's voice inside you says {name} can be trusted. You don't know whose voice.",
    "The blood you drank tonight wants to answer for you.",
    "You taste {topic} in the back of your throat, like someone else's memory.",
    "A stranger in your veins is afraid of {name}.",
    "The voices you swallowed argue about what {name} meant.",
    "Your last vessel would have liked {name}. The thought is not yours.",
  ]},
  {key: "fugue", label: "Fugue", match: ["fugue", "amnesia", "blackout"], lines: [
    "You've heard this before. You're sure of it. You can't remember where.",
    "Half the answer slips away as {name} says it.",
    "You come back to yourself mid-sentence. What did you ask?",
    "{name} is waiting for you to answer something. Did they ask you a question?",
    "The words about {topic} fall into a hole in your night.",
    "There is a gap where the middle of the answer should be.",
    "{name} knows you from somewhere. You don't know them at all.",
    "It will matter later, but by then you won't remember it.",
  ]},
  {key: "synesthesia", label: "Synesthesia", match: ["synesthesia", "synaesthesia"], lines: [
    "{name}'s answer is the colour of old rust.",
    "The word {topic} tastes of copper and wet stone.",
    "Their voice is a cold blue line, and it bends when they lie.",
    "You can smell how true it is: not very.",
    "Each word is a note, and the tune is out of key.",
    "The answer has sharp corners. Be careful with it.",
    "{name} speaks in green, and green is safe.",
    "It sounds warm, but it feels like frost on the tongue.",
  ]},
];

/** Glimpses for Malkavians: riddles by what a coming event is about. {when} says roughly how far off it is. */
export const GLIMPSE_THEMES = [
  {key: "plague", match: /plague|pestilence|sickness|epidemic|pox|black death|influenza|cholera/i, lines: [
    "The rats are packing their bags. {when}, the bells ring for every house.",
    "Coughing behind the walls, {when}. Count the doors with crosses.",
    "{when}, the blood will taste of sickness. Feed carefully.",
    "A sweet smell is coming, {when}. It isn't flowers.",
  ]},
  {key: "war", match: /war|battle|siege|invasion|army|crusade|raid|revolt|rising/i, lines: [
    "Iron is coming down the road, {when}. Count the horses.",
    "{when}, the fields grow helmets instead of wheat.",
    "Drums under the floor, {when}. Somebody is marching toward you.",
    "Smoke on the horizon, {when}. The banners are a colour you know.",
  ]},
  {key: "fire", match: /fire|burn|flame|blaze/i, lines: [
    "The city wants to be warm, {when}. Too warm.",
    "{when}, the sky will glow orange at midnight.",
    "Keep your haven far from the timber yards, {when}.",
    "Ash falls like snow, {when}. Taste it and remember.",
  ]},
  {key: "death", match: /death|dies|killed|murder|executed|assassin|fall of|torpor|destroyed/i, lines: [
    "A crown slips, {when}. Someone important stops breathing, or stops pretending to.",
    "{when}, a chair at the high table stays empty.",
    "Someone is already dead and doesn't know it yet. {when}, they will.",
    "The black cloth is being cut, {when}.",
  ]},
  {key: "faith", match: /church|pope|bishop|faith|inquisition|heresy|monaster|crusade|council|reform|saint/i, lines: [
    "{when}, the bells argue with each other.",
    "The priests will change their song, {when}. Listen to the new words.",
    "Holy men are sharpening something, {when}.",
    "{when}, someone burns for believing the wrong thing.",
  ]},
  {key: "kindred", match: /prince|camarilla|sabbat|anarch|kindred|cainite|clan|antediluvian|gehenna|tremere|tzimisce|vampire/i, lines: [
    "The old ones are moving their pieces, {when}. You are on the board.",
    "{when}, a new name sits on the throne of night.",
    "The Children of Caine will gather and lie to each other, {when}.",
    "Something very old turns over in its sleep, {when}.",
  ]},
  {key: "spirit", match: /umbra|maelstrom|shroud|spirit|ghost|wyrm|garou|fae|dreaming|magick|mage|demon|ghost/i, lines: [
    "The thin places get thinner, {when}.",
    "{when}, the dead will knock louder than usual.",
    "A storm on the other side of the wall, {when}. You'll feel it in your teeth.",
    "The moon has a secret for {when}. It isn't telling the wolves first.",
  ]},
  {key: "other", match: /./, lines: [
    "Something changes, {when}. You'll know it when the dogs stop barking.",
    "{when}, the world tilts a little. Hold on to something.",
    "Mark this night. {when}, you'll wish you had.",
    "The spiders are weaving a different pattern, {when}.",
  ]},
];

/* ================= Werewolf (Chronicle 0.31.0) ================= */

/**
 * Garou tribes, the lost tribes, the Black Spiral Dancers and Kinfolk. Same row shape as the bloodlines (feature "line"),
 * plus: until (the last year the tribe is played; later years show it as gone), wyrm (counts as a Wyrm foe for the
 * Ahroun), and engines of their own (guard, truce, leverage, hear, sky, renown). match: words of the sheet's tribe field.
 * Page refs are to W20 (pdf pages unless marked printed); Dark Ages names from Werewolf: the Dark Ages.
 */
export const TRIBES = [
  {key: "blackfuries", label: "Black Furies", match: ["black furies", "black fury", "furies"], feature: "guard", title: "Sacred places remember", page: "W20, the tribe's pages",
    text: "A Fury can take a place into their care (a grove, a spring, a shrine, a women's house): the scene they stand in. When a fight breaks out there or something is taken from it, the Fury hears of it wherever they are, with the hour. They gain a Rage point for the hunt."},
  {key: "bonegnawers", label: "Bone Gnawers", match: ["bone gnawers", "bone gnawer", "gnawers"], feature: "line", title: "The Grapevine and the trash heap", page: "W20, the tribe's pages",
    text: "The poor talk freely to a Bone Gnawer: beggars, tramps and street children give real rumours when asked for news or directions. Scavenging an alley or a yard turns up something cheap from the era's goods. Streetwise and Survival in towns gain a die.", effects: [{tags: ["streetwise"], dice: 1}]},
  {key: "childrengaia", label: "Children of Gaia", match: ["children of gaia", "child of gaia"], feature: "truce", title: "Calling a truce", page: "W20, the tribe's pages",
    text: "In a fight, a Child of Gaia can spend a turn to offer a truce. The Storyteller hears the offer on a card; the NPCs who take it leave the fight. In sept politics they can broker a month's peace between two rivals."},
  {key: "fianna", label: "Fianna", match: ["fianna"], feature: "renown", title: "Tales and drink", page: "W20, the tribe's pages",
    text: "A tale told at a moot can earn Renown: the Fianna tells it, and its hero gains Glory. They hold their drink longer than most, and meetings with the fae come easier. Performance gains a die.", effects: [{tags: ["performance"], dice: 1}]},
  {key: "fenris", label: "Get of Fenris", match: ["get of fenris", "fenrir", "fenris"], feature: "renown", title: "Trials and scars", page: "W20, the tribe's pages",
    text: "A challenge in the sept is settled as a duel, through the fight starter. A lasting scar won in battle counts as a trophy and earns Glory."},
  {key: "glasswalkers", label: "Glass Walkers", match: ["glass walkers", "glass walker", "warders of men", "warder of men", "iron riders"], feature: "line", title: "City spirits and holdings", page: "W20, the tribe's pages; Werewolf: the Dark Ages pdf 75 for the old name",
    text: "Glass Walkers own holdings and businesses that pay a monthly income. Machines they carry keep working in the Umbra. In the Dark Ages they are the Warders of Men; in the World of Future Darkness the net and the arcologies are their home ground. Computer and Finance gain a die.", effects: [{tags: ["computer", "finance"], dice: 1}]},
  {key: "redtalons", label: "Red Talons", match: ["red talons", "red talon"], feature: "line", title: "Wolf ways", page: "W20, the tribe's pages",
    text: "Lupus only. Most human goods are no use to them. In towns, passers-by feel fear around them; in the wild they read tracks with ease. Survival gains a die and Etiquette among humans is one harder.", effects: [{tags: ["survival"], dice: 1}, {tags: ["etiquette"], difficulty: 1}]},
  {key: "shadowlords", label: "Shadow Lords", match: ["shadow lords", "shadow lord"], feature: "leverage", title: "Leverage and storms", page: "W20, the tribe's pages",
    text: "Each failure of another Garou the Shadow Lord learns of becomes a point of leverage, spent as a favour owed in the Ledger. Grandfather Thunder favours them: in a thunderstorm Intimidation gains a die.", effects: [{tags: ["intimidation"], dice: 1, when: "thunder"}]},
  {key: "silentstriders", label: "Silent Striders", match: ["silent striders", "silent strider"], feature: "line", title: "Roads and ghosts", page: "W20, the tribe's pages",
    text: "Overland travel is quicker for them and moon bridges cost them less. Ghosts seek them out: the Shadowlands lie close, and a careful look can show a ghost nearby. They can never go home to the spirit lands of Egypt. Athletics for running gains a die.", effects: [{tags: ["athletics"], dice: 1}]},
  {key: "silverfangs", label: "Silver Fangs", match: ["silver fangs", "silver fang"], feature: "hear", title: "Blood of kings", page: "W20 pdf 115 (p. 113)",
    text: "Every Silver Fang carries Pure Breed and the madness of the old blood: a derangement that colours what they hear when NPCs answer them, with the true reply beneath. Their Kinfolk are noble houses of Bohemia, Poland and Russia. In sept politics their bid for office counts one higher."},
  {key: "stargazers", label: "Stargazers", match: ["stargazers", "stargazer"], feature: "sky", title: "Stars and stillness", page: "W20 pdf 42, 49",
    text: "Under a clear night sky, once a lunar month, a Stargazer can read a riddle about what comes next from the stars. Kailindo lets them change form mid-fight without the usual cost once a scene. They stand with the Garou Nation and with the Beast Courts of the East."},
  {key: "uktena", label: "Uktena", match: ["uktena"], feature: "line", title: "Bound banes", page: "W20, the tribe's pages",
    text: "Fetishes and talens are made as recipes with a spirit among the ingredients. A bane bound in an item can get loose on a botched use, as an NPC. Occult gains a die.", effects: [{tags: ["occult"], dice: 1}]},
  {key: "wendigo", label: "Wendigo", match: ["wendigo"], feature: "line", title: "The cold wind", page: "W20, the tribe's pages",
    text: "Cold weather never troubles a Wendigo, and in it their Survival and their attacks gain a die. In the Americas their feud with the newcomer tribes starts in 1492 and grows with each dated colonial event.", effects: [{tags: ["survival", "brawl", "melee"], dice: 1, when: "cold"}]},
  {key: "croatan", label: "Croatan", match: ["croatan"], feature: "line", until: 1589, house: true, title: "The last sacrifice", page: "W20, the lost tribes; the year is a house reading",
    text: "For stories in the Americas before the tribe gave itself up (1590 here). Their rites strengthen a caern. After that year the tribe is gone and lives only in Galliard tales."},
  {key: "bunyip", label: "Bunyip", match: ["bunyip"], feature: "line", until: 1937, house: true, title: "The War of Tears", page: "W20, the lost tribes; the year is a house reading",
    text: "For stories in Australia before the tribe's last stand in 1937; after the War of Tears (1899) only a few are left. A Garou who meets a Bunyip spirit or relic feels the old shame: a Willpower roll is made for them, and a failure costs a point."},
  {key: "whitehowlers", label: "White Howlers", match: ["white howlers", "white howler"], feature: "line", until: 0, title: "Fallen kin", page: "W20, the fall of the White Howlers",
    text: "Gone long before 1197: they walked the Spiral and became the Black Spiral Dancers. They appear only in old stories and dreams. A Garou who learns the story gains a lore page that opens Spiral lore."},
  {key: "bsd", label: "Black Spiral Dancers", match: ["black spiral dancers", "black spiral dancer", "black spiral", "spiral dancer", "spiral dancers"], feature: "line", wyrm: true, title: "Hive and taint", page: "W20 pdf 42",
    text: "NPCs of the Wyrm. A Hive taints the land around it, and those with the senses for it smell the Wyrm there. A Garou who walks the Spiral in a dream rite risks a derangement. An Ahroun goes first against them."},
];

/** The Kinfolk row (flag world.wodx.kinfolk, set from WoDX Actions' Kinfolk button). */
export const KINFOLK = {key: "kinfolk", label: "Kinfolk", match: [], feature: "kin", title: "Blood that hides the Veil", page: "W20, Kinfolk and the Delirium",
  text: "Kinfolk do not suffer the Delirium. Harm done to them reaches the tribe: each player's Garou of that tribe hears of it on a card. A match between families is a matter for sept politics."};

/** Auspices. moon: the auspice's own phase (Rage at moonrise is built in WoDX Actions). */
export const AUSPICES = [
  {key: "ragabash", label: "Ragabash", match: ["ragabash"], feature: "line", title: "Pranks without shame", page: "W20, the auspices",
    text: "A trick played to test an elder costs no Honour, and a prank that shows up a real fault earns Wisdom. Lifting and planting gain a die.", effects: [{tags: ["lift"], dice: 1}]},
  {key: "theurge", label: "Theurge", match: ["theurge"], feature: "line", title: "Spirit sight", page: "W20, the auspices",
    text: "Where the Gauntlet is low (a caern, the deep wild), a Theurge sees the spirits in a scene without a roll. Rites are made as recipes: ingredients, hours on the clock and a place. Occult gains a die.", effects: [{tags: ["occult"], dice: 1}]},
  {key: "philodox", label: "Philodox", match: ["philodox"], feature: "ruling", title: "The judge's word", page: "W20, the auspices",
    text: "A Philodox can settle a challenge or an accusation with a ruling, posted for all to see. Both sides abide by it or lose Honour, and the loser cannot raise the matter again for a month."},
  {key: "galliard", label: "Galliard", match: ["galliard"], feature: "renown", title: "Telling the tale", page: "W20, the auspices",
    text: "A tale at a moot earns Renown for its hero and Wisdom for the teller. The form follows the age: chant and saga, songbook, radio and the recorded song. Performance gains a die.", effects: [{tags: ["performance"], dice: 1}]},
  {key: "ahroun", label: "Ahroun", match: ["ahroun"], feature: "first", title: "First into battle", page: "W20, the auspices; the soak die is a house reading", house: true,
    text: "When a fight starts against a creature of the Wyrm, the Ahroun goes first in the first turn. In Crinos against the Wyrm the Ahroun soaks with one more die."},
];

/** Breeds. A breed row stacks with the tribe and auspice rows. */
export const BREEDS = [
  {key: "homid", label: "Homid", match: ["homid"], feature: "line", title: "Born human", page: "W20, the breeds",
    text: "Full use of human goods and human ways. Etiquette and Computer come as easily as to any human."},
  {key: "lupus", label: "Lupus", match: ["lupus"], feature: "line", title: "Born wolf", page: "W20, the breeds",
    text: "Many human goods answer cannot when used, and city ways are strange. Wolf senses: Perception by smell and hearing is one easier.", effects: [{tags: ["smell", "hearing"], difficulty: -1}]},
  {key: "metis", label: "Metis", match: ["metis"], feature: "deformity", title: "Born wrong", page: "W20, the breeds",
    text: "Born of two Garou, sterile, and marked by one deformity, picked from the list. Metis start a step lower in sept politics."},
];

/** Metis deformities (own words, a short list from the W20 breed pages). effects: what it does on rolls. */
export const DEFORMITIES = [
  {key: "hairless", label: "No fur or hair", effects: [{tags: ["social"], difficulty: 1}]},
  {key: "eyes", label: "Weak eyes", effects: [{tags: ["sight"], difficulty: 1}]},
  {key: "lame", label: "A twisted leg", effects: [{tags: ["athletics"], dice: -1}]},
  {key: "hunch", label: "A hunched back", effects: [{tags: ["dexterity"], difficulty: 1}]},
  {key: "voice", label: "A broken voice", effects: [{tags: ["voice"], difficulty: 1}]},
  {key: "smell", label: "No sense of smell", effects: [{tags: ["smell"], difficulty: 2}]},
];

/**
 * The other Changing Breeds, the lost ones and the Hengeyokai of the Beast Courts. match: the sheet's changing breed field.
 * courts: a Hengeyokai breed (the Beast Courts are a faction for them). until 0: gone before 1197, met only as relics.
 */
export const FERA = [
  {key: "ajaba", label: "Ajaba", match: ["ajaba"], feature: "line", title: "Pack scavenging", page: "W20 Changing Breeds",
    text: "Ajaba hunt as a pack: each other Ajaba beside them adds a die to attack, three at most. They find food on the plains and in towns as Bone Gnawers do. Survival gains a die.", effects: [{tags: ["survival"], dice: 1}]},
  {key: "ananasi", label: "Ananasi", match: ["ananasi"], feature: "line", title: "Webs and blood", page: "W20 Changing Breeds",
    text: "Ananasi live on blood, so the feeding rules apply to them. Their webs make a place slow or closed to movement, and they can break into a swarm of spiders."},
  {key: "bastet", label: "Bastet", match: ["bastet"], feature: "line", also: ["secrets"], title: "Curiosity and secrets", page: "W20 Changing Breeds",
    text: "When a secret is near, a Willpower roll keeps a Bastet from looking into it. What they learn they can write down as a page of secrets and trade, as the Nosferatu do. Each cat tribe keeps its own land."},
  {key: "corax", label: "Corax", match: ["corax"], feature: "line", title: "Eyes in the sky", page: "W20 Changing Breeds",
    text: "They fly. News a Corax carries spreads to every faction they visit. Eating the eye of the dead shows its last sight. Alertness and Perception by sight gain a die.", effects: [{tags: ["sight"], dice: 1}]},
  {key: "gurahl", label: "Gurahl", match: ["gurahl"], feature: "line", title: "Healing and the long sleep", page: "W20 Changing Breeds",
    text: "Their care heals better: Medicine gains a die. A winter sleep heals all harm, but the season is lost to it.", effects: [{tags: ["medicine"], dice: 1}]},
  {key: "kitsune", label: "Kitsune", match: ["kitsune"], feature: "line", courts: true, title: "Tails with age", page: "W20 Changing Breeds",
    text: "A Kitsune grows a tail with each Rank, each a mark of power on the body. Fox-fire lights a scene as a carried light."},
  {key: "mokole", label: "Mokole", match: ["mokole"], feature: "line", title: "Mnesis", page: "W20 Changing Breeds",
    text: "Mnesis reads the memory of the line: a roll gives a hint from history, and the Storyteller can show the house cards of earlier years in that land."},
  {key: "nagah", label: "Nagah", match: ["nagah"], feature: "ruling", courts: true, title: "The hidden judges", page: "W20 Changing Breeds",
    text: "They swim with ease. A Nagah can pass a verdict on a Garou who broke the Litany, carried out in secret: the ruling goes to the Storyteller alone."},
  {key: "nuwisha", label: "Nuwisha", match: ["nuwisha"], feature: "line", title: "Tricks", page: "W20 Changing Breeds",
    text: "Lifting and planting are one easier. A prank that teaches a lesson gives its target a Willpower point once they learn it.", effects: [{tags: ["lift"], difficulty: -1}]},
  {key: "ratkin", label: "Ratkin", match: ["ratkin"], feature: "line", title: "Swarm and plague", page: "W20 Changing Breeds",
    text: "Sewers, drains and walls are their roads. The plague years are their years of strength. Stealth in towns gains a die.", effects: [{tags: ["stealth"], dice: 1}]},
  {key: "rokea", label: "Rokea", match: ["rokea"], feature: "line", title: "Deep water", page: "W20 Changing Breeds",
    text: "In deep water they move and breathe without limit. On land they are slow and wary: Etiquette among humans is one harder.", effects: [{tags: ["etiquette"], difficulty: 1}]},
  {key: "hakken", label: "Hakken", match: ["hakken"], feature: "line", courts: true, title: "Honour and the master", page: "Hengeyokai pdf 8-11, 32",
    text: "A Hakken who serves a lord gains a die on loyal deeds, and the lord thinking less of them costs a Willpower point."},
  {key: "khan", label: "Khan", match: ["khan"], feature: "line", courts: true, title: "The tiger's hunt", page: "Hengeyokai pdf 8-11, 32",
    text: "A die on an ambush. A Khan alone in its own land is never lost. Stealth gains a die.", effects: [{tags: ["stealth"], dice: 1}]},
  {key: "nezumi", label: "Nezumi", match: ["nezumi"], feature: "line", courts: true, title: "The city's underside", page: "Hengeyokai pdf 8-11, 32",
    text: "Plague and the under-town are home: the hidden ways beneath a city open to them as to the Nosferatu."},
  {key: "samebito", label: "Same-Bito", match: ["same bito", "samebito"], feature: "line", courts: true, title: "Sea and blood", page: "Hengeyokai pdf 8-11, 32",
    text: "Swimming costs them nothing, and the smell of blood in water carries far to them.", effects: [{tags: ["smell"], difficulty: -1}]},
  {key: "zhonglung", label: "Zhong Lung", match: ["zhong lung"], feature: "line", courts: true, title: "Old memory", page: "Hengeyokai pdf 8-11, 32",
    text: "Like the Mokole, they can ask the memory of old events: a hint from history in that land."},
  {key: "tengu", label: "Tengu", match: ["tengu"], feature: "line", courts: true, title: "Messengers of the Courts", page: "Hengeyokai pdf 8-11, 32",
    text: "News travels faster through them: a rumour a Tengu carries reaches every Court they visit."},
  {key: "kumo", label: "Kumo", match: ["kumo"], feature: "line", courts: true, title: "Webs and plots", page: "Hengeyokai pdf 8-11, 32",
    text: "A Kumo can lay a trap that holds whoever walks into it, and plots as patiently as it spins."},
  {key: "okuma", label: "Okuma", match: ["okuma"], feature: "line", courts: true, title: "Healers of the Courts", page: "Hengeyokai pdf 8-11, 32",
    text: "As the Gurahl: Medicine gains a die.", effects: [{tags: ["medicine"], dice: 1}]},
  {key: "apis", label: "Apis", match: ["apis"], feature: "line", until: 0, house: true, title: "Memory only", page: "not in the books in the store; a house reading",
    text: "Gone before 1197. Their ghosts and relics turn up in Umbra stories; a relic of theirs is a fetish that holds one Gift."},
  {key: "camazotz", label: "Camazotz", match: ["camazotz"], feature: "line", until: 0, house: true, title: "Memory only", page: "not in the books in the store; a house reading",
    text: "Gone before 1197. Only relics and spirits of theirs remain, in the Umbra."},
  {key: "grondr", label: "Grondr", match: ["grondr"], feature: "line", until: 0, house: true, title: "Memory only", page: "not in the books in the store; a house reading",
    text: "Gone before 1197. Only relics and spirits of theirs remain, in the Umbra."},
];

/** What the Beast Courts add to each Hengeyokai row (Hengeyokai pdf 8-11). */
export const COURTS_TEXT = "A Hengeyokai of the Beast Courts: rank in the Courts is a faction standing of its own.";
/** Words that make an NPC a creature of the Wyrm for the Ahroun. */
export const WYRM_WORDS = ["wyrm", "spiral", "fomor", "fomori", "bane", "banes", "pentex"];
/** Days in a lunar month, for the Stargazer's sky reading. */
export const LUNAR_MONTH = LUNAR_MONTH_DAYS;

/* ================= Mage (Chronicle 0.33.0) ================= */

/**
 * Traditions, Crafts, Conventions, the Order of Reason and the mad and fallen. match: words of the sheet's sect field
 * (the system's keys: akashic, speakers, ether, adepts, batin, iterationx, engineers and the rest) or its custom sect.
 * names: older names by year ({until, label}); from and until: the years the group is played. servant: what a borrowed
 * "family" engine binds. Dates the books do not pin are house readings (house: true). Dark Ages fellowships from
 * Dark Ages Mage pdf 15-36; the Order of Reason from Sorcerers Crusade pdf 29, 63.
 */
export const MAGE = [
  {key: "akashic", label: "Akashic Brotherhood", match: ["akashic", "akashic brotherhood", "akashayana"], feature: "dawn", title: "Do and the still mind", page: "M20, the Tradition's pages",
    text: "Meditation at dawn gives back a Willpower point once a day. Do lets an Akashic trade soak for dice or defence each turn when fighting unarmed, and body magick that looks like skill passes as coincidence. Brawl gains a die.", effects: [{tags: ["brawl"], dice: 1}]},
  {key: "chorus", label: "Celestial Chorus", match: ["chorus", "celestial chorus", "messianic voices"], feature: "line", names: [{until: 1465, label: "Messianic Voices"}], title: "The choir", page: "M20, the Tradition's pages; Dark Ages Mage pdf 15-36",
    text: "When three or more of the faithful sing together in a church, magick there is one easier. Faithful passers-by notice the Chorus and help. Churches and monasteries are their sites."},
  {key: "ecstasy", label: "Cult of Ecstasy", match: ["ecstasy", "cult of ecstasy", "ecstatics", "ecstatic"], feature: "line", names: [{until: 1465, label: "the Ecstatics"}], title: "Sacred highs", page: "M20, the Tradition's pages",
    text: "Drink and drugs made as recipes or used from the pack can be foci: the substance works as it always does, and its strength makes the effect one easier. Time magick lets them glimpse a few minutes ahead."},
  {key: "dreamspeakers", label: "Dreamspeakers", match: ["speakers", "dreamspeakers", "dreamspeaker", "spirit talkers"], feature: "line", names: [{until: 1465, label: "Spirit-Talkers"}], title: "Spirit allies", page: "M20, the Tradition's pages; Dark Ages Mage pdf 15-36",
    text: "Animals are spirit messengers: an animal in the scene can carry a message. Stepping into the Umbra is one easier for them.", effects: [{tags: ["animalken"], dice: 1}]},
  {key: "euthanatos", label: "Euthanatos", match: ["euthanatos", "chakravanti"], feature: "mercy", title: "Seeing death", page: "M20, the Tradition's pages",
    text: "They see who is dying and how long is left. A death given in mercy, a Good Death, gives back a Willpower point; a death given in anger adds a point of Jhor, the stain of death, kept on the sheet's feature window."},
  {key: "hermes", label: "Order of Hermes", match: ["hermes", "order of hermes", "hermetic"], feature: "certamen", title: "Certámen and Tribunal", page: "M20 and Dark Ages Mage, the Order's pages",
    text: "A Hermetic can call a certámen: a magical duel, not to the death, fought for a stake that the loser owes as a favour in the Ledger. Rotes are made as recipes with time and kit. The Houses each add a feature of their own."},
  {key: "sonsofether", label: "Sons of Ether", match: ["ether", "sons of ether", "electrodyne engineers", "natural philosophers"], feature: "line", from: 1904, names: [{until: 1903, label: "the Electrodyne Engineers of the Order of Reason"}], title: "Inventions", page: "M20; Sorcerers Crusade pdf 29, 63",
    text: "Devices are built with the crafting rules, each with a quality and a quirk. They run on Ether, so before believers in the old science a vulgar effect passes as coincidence. Science gains a die.", effects: [{tags: ["science"], dice: 1}]},
  {key: "verbena", label: "Verbena", match: ["verbena", "old faith"], feature: "line", names: [{until: 1465, label: "the Old Faith"}], title: "Herb lore", page: "M20, the Tradition's pages; Dark Ages Mage pdf 15-36",
    text: "Remedies, poisons and medicines are made as recipes with an herbalist's kit, stronger in their right season. Their own blood is a focus: a health level spent makes an effect one easier. Medicine gains a die.", effects: [{tags: ["medicine"], dice: 1}]},
  {key: "va", label: "Virtual Adepts", match: ["adepts", "virtual adepts", "virtual adept", "difference engineers"], feature: "line", from: 1961, house: true, names: [{until: 1960, label: "the Difference Engineers"}], title: "The Digital Web", page: "M20; the 1961 date is a house reading",
    text: "The Digital Web is a realm of their own, where avatars take the shape of the old screen portraits. Before 1961 their forerunners are the Difference Engineers. Computer gains a die.", effects: [{tags: ["computer"], dice: 1}]},
  {key: "hollow", label: "Hollow Ones", match: ["hollow", "hollow ones", "hollow one"], feature: "line", from: 1890, house: true, title: "Among the lost", page: "M20, the Crafts; the 1890 date is a house reading",
    text: "They move in the same clubs, salons and squats as the Kindred and the fae. Meeting another line there starts no suspicion, and a Hollow One can vouch for a stranger."},
  {key: "ahl", label: "Ahl-i-Batin", match: ["batin", "ahl i batin", "batini", "subtle ones"], feature: "line", names: [{until: 1465, label: "the Batini"}], title: "Hidden hands", page: "M20 and Dark Ages Mage",
    text: "In faction politics they may act without a name on it: the move works, and no rival can answer it. Effects to find a person are one easier in a place they have worked."},
  {key: "bataa", label: "Bata'a", match: ["bataa", "bata a"], feature: "line", title: "The loa ride them", page: "M20 pdf 5, 25; Book of Crafts pdf 4, 12",
    text: "A loa can ride a Bata'a: for the scene the spirit gives a die to its own field and asks a price, which the Storyteller names."},
  {key: "childrenKnowledge", label: "Children of Knowledge", match: ["children", "children of knowledge", "solificati"], feature: "line", title: "The great work", page: "M20 pdf 5, 25; Book of Crafts pdf 4, 12",
    text: "Alchemy: their rotes are recipes with real ingredients and hours of work. Their dual nature lets one of them hold two minds about any matter."},
  {key: "kopaLoei", label: "Kopa Loei", match: ["kopa", "kopa loei"], feature: "line", title: "The islands", page: "M20 pdf 5, 25; Book of Crafts pdf 4, 12",
    text: "Magick is easier on their own islands and in the sea: one easier there (the Storyteller says where)."},
  {key: "ngoma", label: "Ngoma", match: ["ngoma"], feature: "line", title: "Ancestors and the high ways", page: "M20 pdf 5, 25; Book of Crafts pdf 4, 12",
    text: "Ancestor spirits answer them in the Umbra, and the old ways of the high courts open to them."},
  {key: "orphans", label: "Orphans", match: ["orphans", "orphan"], feature: "line", house: true, title: "Self-taught", page: "M20, Orphans; the Paradox change is a house reading",
    text: "No Tradition taught them: an Orphan writes their own focus list. With no rote to forget, a botch gives one point less Paradox."},
  {key: "hippolyta", label: "Sisters of Hippolyta", match: ["hippolyta", "sisters of hippolyta"], feature: "oath", title: "The sisterhood", page: "M20 pdf 5, 25; Book of Crafts pdf 4, 12",
    text: "A sister's oath is kept as a promise in the Ledger; breaking it costs a Willpower point."},
  {key: "taftani", label: "Taftani", match: ["taftani"], feature: "line", also: ["family"], servant: "a djinn", title: "Bargains with djinn", page: "M20 pdf 5, 25; Book of Crafts pdf 4, 12",
    text: "A djinn they bind is kept in a ledger of servants, each held by a vessel. Their magick is always vulgar, and they take pride in it."},
  {key: "templar", label: "Templar Knights", match: ["templar", "templar knights", "templars"], feature: "line", title: "Faith and the sword", page: "M20 pdf 5, 25; Book of Crafts pdf 4, 12",
    text: "Fighting for the Order's cause, their faith guards them as True Faith would. Melee gains a die.", effects: [{tags: ["melee"], dice: 1}]},
  {key: "wulung", label: "Wu Lung", match: ["wulung", "wu lung"], feature: "line", title: "The dragon court", page: "M20 pdf 5, 25; Book of Crafts pdf 4, 12",
    text: "Rank in the dragon court is a faction standing of its own, and weather magick comes easier to them."},
  {key: "hemKaSobk", label: "Hem-Ka Sobk", match: ["hem ka sobk", "sobk"], feature: "line", title: "The crocodile cult", page: "M20 pdf 5, 25; Book of Crafts pdf 4, 12",
    text: "Guardians of the Nile who ward mummies and tombs: they meet the Undying as old allies through the crossover referee."},
  {key: "wuKeng", label: "Wu-Keng", match: ["wu keng"], feature: "line", title: "The spirit courts", page: "M20 pdf 5, 25; Book of Crafts pdf 4, 12",
    text: "Shamans of the old spirit courts: bargains with spirits are struck on the Umbra realm map."},
  {key: "valdaermen", label: "Valdaermen", match: ["valdaermen"], feature: "line", title: "Runes carved", page: "Dark Ages Mage pdf 15-36",
    text: "A rune carved on an item is a talisman with one effect; carving is a recipe. Crafts gains a die.", effects: [{tags: ["crafts"], dice: 1}]},
  {key: "itx", label: "Iteration X", match: ["iterationx", "iteration x", "artificers", "artificer"], feature: "line", names: [{until: 1896, label: "the Artificers of the Order of Reason"}], title: "Cybernetics", page: "M20, the Convention's pages; Sorcerers Crusade pdf 29, 63",
    text: "Cybernetic parts go on the body plan as prosthetics do: an arm with a weapon, eyes that see heat, legs for running. Used where people would see them as impossible, they risk Paradox. Before 1897 they are the Artificers, whose inventions use workshops and recipes."},
  {key: "nwo", label: "New World Order", match: ["nwo", "new world order", "cabal of pure thought"], feature: "watchers", names: [{until: 1896, label: "the Cabal of Pure Thought"}], title: "The Watchers", page: "M20, the Convention's pages; Sorcerers Crusade pdf 29, 63",
    text: "Every record of the age reports to them: parish books and tax rolls, then police files, cameras and the net. A breach of the Masquerade reaches the Watchers first, and their agents press the hunters in the region. Before 1897 the Cabal of Pure Thought speaks for the Order's reason."},
  {key: "progenitors", label: "Progenitors", match: ["progenitors", "progenitor", "hippocratic circle"], feature: "line", names: [{until: 1896, label: "the Hippocratic Circle"}], title: "The lab", page: "M20, the Convention's pages; Sorcerers Crusade pdf 29, 63",
    text: "Medicines and drugs from the laboratory kits come out a quality step better. Clones and vat-grown servants are NPCs; surgery changes the body plan. Medicine gains a die.", effects: [{tags: ["medicine"], dice: 1}]},
  {key: "syndicate", label: "Syndicate", match: ["syndicate", "high guild"], feature: "line", also: ["leverage"], names: [{until: 1896, label: "the High Guild"}], title: "Moving the market", page: "M20, the Convention's pages; Sorcerers Crusade pdf 29, 63",
    text: "A debt they learn of becomes leverage, spent as a favour owed in the Ledger. They can push a town's prices for a month, and their money counts double for bribes. Finance gains a die.", effects: [{tags: ["finance"], dice: 1}]},
  {key: "void", label: "Void Engineers", match: ["engineers", "void engineers", "void seekers"], feature: "line", names: [{until: 1896, label: "the Void Seekers"}], title: "Navigators", page: "M20, the Convention's pages; Sorcerers Crusade pdf 29, 63",
    text: "Travel between realms is cheaper and safer: they keep the charts. They hunt what comes from beyond the Gauntlet. Before 1897, as the Void Seekers, they make sea voyages faster."},
  {key: "celestialMasters", label: "Celestial Masters", match: ["celestial masters"], feature: "line", also: ["sky"], from: 1325, until: 1896, house: true, title: "Masters of the heavens", page: "Sorcerers Crusade pdf 29, 63; the end date is not pinned",
    text: "Their charts of the heavens give a riddle about the next dated event, once a lunar month under a clear sky."},
  {key: "craftmasons", label: "Craftmasons", match: ["craftmasons", "craftmason"], feature: "line", from: 1325, until: 1896, house: true, title: "Builders", page: "Sorcerers Crusade pdf 29, 63; the end date is not pinned",
    text: "A building they raise goes up a stage faster. Crafts gains a die.", effects: [{tags: ["crafts"], dice: 1}]},
  {key: "ksirafai", label: "Ksirafai", match: ["ksirafai", "ksirafa"], feature: "line", title: "Spies", page: "Sorcerers Crusade pdf 29",
    text: "NPC agents of the Order: what they learn reaches the Order at the speed news travels in the age."},
  {key: "nephandi", label: "Nephandi", match: ["nephandi", "nephandus"], feature: "line", also: ["corruption"], title: "The inverted Avatar", page: "M20, the Nephandi",
    text: "NPCs. A Nephandus corrupts as a Follower of Set does, with the same hidden ledger on the victim. Their magick is not vulgar to their own kind; a lore page reveals the cabal."},
  {key: "marauder", label: "Marauders", match: ["marauder", "marauders"], feature: "line", title: "Living madness", page: "M20, the Marauders",
    text: "NPCs. Paradox spirits shy from a Marauder, so its magick draws no Paradox, and the world bends around it: its token shimmers and flickers."},
  {key: "sorcerer", label: "Sorcerers and psychics", match: ["sorcerer", "sorcerers", "psychic", "psychics", "hedge"], feature: "line", title: "The path and its cost", page: "Sorcerer (Revised); M20, the sorcerer rules",
    text: "A sorcerer's path (Alchemy, Conjuration, Divination and the rest) works as recipes with hours and components. A psychic's numina cost Willpower."},
];

/** Houses of the Order of Hermes (the custom sect field or the house flag). Stack with the Order's row. */
export const HOUSES = [
  {key: "bonisagus", label: "House Bonisagus", match: ["bonisagus"], feature: "line", title: "Keepers of research", page: "M20 pdf 127",
    text: "A research ledger: new rotes are made as recipes over weeks. Occult gains a die.", effects: [{tags: ["occult"], dice: 1}]},
  {key: "flambeau", label: "House Flambeau", match: ["flambeau"], feature: "certamen", title: "Fire and honour", page: "Book of Secrets pdf 65-66",
    text: "A die on Forces magick that burns. An insult to the House calls for a certámen.", effects: [{tags: ["fire"], dice: 1}]},
  {key: "quaesitor", label: "House Quaesitor", match: ["quaesitor"], feature: "ruling", title: "Judges of the Order", page: "Book of Secrets pdf 65-66",
    text: "A Quaesitor can call a Tribunal and post its ruling for all to see."},
  {key: "shaea", label: "House Shaea", match: ["shaea"], feature: "line", title: "The House of the far lands", page: "M20 pdf 160",
    text: "Its own temper from the book: travellers who bring foreign lore into the Order. Linguistics gains a die.", effects: [{tags: ["linguistics"], dice: 1}]},
  {key: "exmisc", label: "House Ex Miscellanea", match: ["ex miscellanea", "miscellanea"], feature: "line", title: "A home for strange traditions", page: "M20 pdf 160",
    text: "A member takes one feature from any other House, as the Storyteller agrees."},
  {key: "janissary", label: "House Janissary", match: ["janissary"], feature: "line", until: 1700, house: true, title: "The Order's soldiers", page: "M20 pdf 160; the end year is a house reading",
    text: "The Order's soldiers, gone after the purge (1700 here). Melee gains a die.", effects: [{tags: ["melee"], dice: 1}]},
  {key: "diedne", label: "House Diedne", match: ["diedne"], feature: "line", until: 0, title: "The lost House", page: "M20 pdf 127",
    text: "Destroyed in the Schism War long before 1197: only ghosts, relics and rumours remain. A Diedne relic is a talisman."},
  {key: "housetremere", label: "House Tremere", match: ["house tremere"], feature: "line", until: 1199, house: true, title: "The House that turned", page: "M20 pdf 127; the year is a house reading",
    text: "The House that turned to vampires. Its old chantries are Tremere clan chantries, and Hermetic NPCs hate its name on sight."},
  {key: "hOthers", label: "The other Houses", match: ["tytalus", "verditius", "criamon", "merinita", "jerbiton", "bjornaer", "guernicus", "mercere", "fortunae", "solificati house"], feature: "line", title: "The other Houses", page: "Houses of Hermes is not in the store",
    text: "Each takes a row of its own once Houses of Hermes is in the store; until then, the Order's row."},
];

/** What the Watchers read in each age (New World Order), by year. */
export const RECORDS = [{from: 1197, label: "parish books and tax rolls"}, {from: 1800, label: "police files and the census"},
  {from: 1895, label: "photographs and newspapers"}, {from: 1970, label: "cameras and computer files"}, {from: 1995, label: "the net"}];

/* ================= Changeling (Chronicle 0.34.0) ================= */

/**
 * Kiths (the sheet's kith field: the system keys, or the custom kith), then the seeming, the court and a sidhe House,
 * stacked. B6729: one row per C20 kith (the core kiths, Thallain, adhene, Nunnehi, Menehune callings, Inanimae and the
 * other kiths), birthrights and frailty in our own words; group rows follow for a custom name that only gives the group.
 * Page refs: C20 printed pages (pdf page less one); the Hsien from Land of Eight Million Dreams.
 */
export const KITHS = [
  {key: "boggan", label: "Boggans", match: ["boggan", "boggans"], feature: "line", title: "Many hands", page: "C20 p. 89",
    text: "Birthrights. Craftwork: unwatched, a boggan does physical labour or craftwork in a third of the time, and a Crafts roll never botches. Social Dynamics: Perception + Empathy (or Subterfuge), difficulty 5 for a small gathering up to 9 for a great court, reads who stands where in a group, which can ease later Social rolls there. Frailty. Call of the Needy: faced with someone who truly needs help (a sworn foe aside), the player rolls Willpower (8) to walk away."},
  {key: "clurichaun", label: "Clurichaun", match: ["clurichaun", "clurichauns"], feature: "revel", title: "Spirits in the cellar", page: "C20 p. 91",
    text: "Birthrights. Twinkling of an Eye: unless bound with iron, a clurichaun can vanish from sight in a blink and turn up nearby, out of view; slipping a hold or bonds costs a Glamour point. Fighting Words: a few moments of study and the right taunt goads someone into throwing the first punch, at the clurichaun or someone else; the target resists with Willpower (8). Frailty. Hoard: a clurichaun keeps a collection and must spend time with it; more than a week away from it is a Banality trigger."},
  {key: "eshu", label: "Eshu", match: ["eshu"], feature: "line", title: "The road provides", page: "C20 p. 93",
    text: "Birthrights. Serendipity: an eshu never gets lost by ordinary means and always knows which fork to take; lost by magic, a Glamour point sets them right. Talecraft: an adventure that yields a tale worth telling gives one more experience point, and Empathy and Performance rolls never botch. Frailty. Recklessness: turning down a bet, a dare or a call to adventure is a Banality trigger."},
  {key: "nocker", label: "Nockers", match: ["nocker", "nockers"], feature: "line", title: "The flaw in every work", page: "C20 p. 95",
    text: "Birthrights. Make It Work: from odds and ends and one to three Glamour points, a nocker rigs a short-lived chimerical device (Intelligence + Crafts), in privacy and never in front of mortals. Fix-It: Intelligence + Crafts or Manipulation + Intimidation, difficulty 5 to 9, gets almost any machine working. Frailty. Perfect is the Enemy of Done: everything a nocker makes carries a small flaw that cannot be fixed; used under stress, the Storyteller may ask for one die, and a 1 means it fails, loudly."},
  {key: "piskies", label: "Piskies", match: ["piskie", "piskies", "pixie", "pixies", "piskey"], feature: "line", title: "Light fingers", page: "C20 p. 97",
    text: "Birthrights. Nimble: one more dot of Dexterity, even past 5 (WoDX counts it as a die on every Dexterity roll). Blending In: a piskie always looks as if they belong to the group they travel with; a changeling or other supernatural onlooker sees through it with Perception + Kenning (8). Frailty. Light-Fingers: something valuable they want tends to end up in their pocket; to keep their hands still the player rolls Willpower (8).", effects: [{tags: ["dexterity"], dice: 1}]},
  {key: "pooka", label: "Pooka", match: ["pooka", "pookas"], feature: "truth", title: "The liar's tongue", page: "C20 p. 99",
    text: "Birthrights. Shapechanging: each pooka has a natural animal and takes its shape at will: free when alone, a Glamour point with changelings or enchanted mortals about, never under mundane eyes; turning back is free. Confidante: once in a conversation, Perception + Empathy (or Subterfuge) against the target's Willpower; each success is a question answered, and the target may spend Willpower against it. Frailty. Untruths: asked a direct question, a pooka answers with a lie; telling the truth takes a Willpower roll (8). (WoDX's button for the plain truth spends a Willpower point.)"},
  {key: "redcap", label: "Redcaps", match: ["redcap", "redcaps"], feature: "line", title: "Dark appetite", page: "C20 p. 101",
    text: "Birthrights. Dark Appetite: a redcap can eat anything that fits in the mouth (tough or toxic stuff costs a Glamour point to keep down); biting in a fight costs a Glamour point and does Strength + 2 at difficulty 5, and five successes on Dexterity + Brawl (8), three on a grappled foe, take a limb for at least three extra levels. Bully Browbeat: Intimidation works on anything, at two less difficulty, and never botches. Frailty. Bad Attitude: nobody trusts a redcap; every Social roll but Intimidation is two harder.", effects: [{tags: ["intimidation"], difficulty: -2}, {tags: ["social"], difficulty: 2, not: ["intimidation"]}]},
  {key: "satyr", label: "Satyrs", match: ["satyr", "satyrs"], feature: "revel", title: "The revel", page: "C20 p. 103",
    text: "Birthrights. Gift of Pan: when a satyr throws themself into a passion, the people around lose their inhibitions and join in unless they pass a Banality or Willpower roll (8); no one is forced into anything. Physical Prowess: one more dot of Stamina, even past 5 (a die on every Stamina roll), and Athletics never botches. Frailty. Passion's Curse: moods swing wildly, worst when drunk, and holding back from a temptation is a Banality trigger.", effects: [{tags: ["stamina"], dice: 1}]},
  {key: "selkie", label: "Selkies", match: ["selkie", "selkies"], feature: "coat", title: "The coat", page: "C20 p. 105",
    text: "Birthrights. Seal Form: wrapped in the seal coat and touching sea water, a selkie becomes a seal or sea lion at will. Ocean's Grace: in water, in either shape, every Dexterity roll is two easier and swimming never botches; they hold their breath for hours, in water or out. Frailty. Seal Coat: if the coat is destroyed, so is the selkie's fae self; it resists fire and takes a Strength roll (9) to damage."},
  {key: "arcadiansidhe", label: "Arcadian sidhe", match: ["arcadian sidhe", "arcadian"], feature: "oath", title: "Lords of Arcadia", page: "C20 p. 107",
    text: "Birthrights. Unearthly Beauty: two more dots of Appearance, even past 5 (two dice on every Appearance roll); invoking the Wyrd, the sidhe's beauty overwhelms: a Willpower roll (8) or the onlooker stares, a turn per Appearance dot. Noble Bearing: cantrips meant to humiliate them fail, and Etiquette and Politics never botch. Frailty. Curse of Banality: their hearts still live in the Dreaming; every point of Banality they would gain counts double.", effects: [{tags: ["appearance"], dice: 2}]},
  {key: "sidhe", label: "Sidhe (Autumn)", match: ["sidhe", "autumn sidhe"], feature: "oath", title: "Oaths and Houses", page: "C20 p. 109",
    text: "Birthrights. Unearthly Beauty: two more dots of Appearance, even past 5 (two dice on every Appearance roll); invoking the Wyrd, the sidhe's beauty overwhelms: a Willpower roll (8) or the onlooker stares, a turn per Appearance dot. Noble Bearing: cantrips meant to humiliate them fail, and Etiquette and Politics never botch. Frailty. Adoration: when an Autumn sidhe enchants or deals with a mortal in earnest, the Storyteller rolls the mortal's Willpower against the sidhe's Glamour; on a failure the mortal grows fixated, with favours, questions and unwanted confidences.", effects: [{tags: ["appearance"], dice: 2}]},
  {key: "sluagh", label: "Sluagh", match: ["sluagh"], feature: "line", title: "In the cracks", page: "C20 p. 111",
    text: "Birthrights. Squirm: they contort through almost anything (Dexterity + Athletics, 6 for ropes to 9 for cell bars), but not cold iron. Sharpened Senses: every Perception roll is one easier; a Willpower point and Perception + Alertness (7) see through illusion, and Perception + Kenning (7) spots lurking ghosts (a Glamour point to speak with them). Frailty. Curse of Silence: a sluagh can only whisper; every Social roll with anyone but another sluagh is two harder.", effects: [{tags: ["perception"], difficulty: -1}, {tags: ["social"], difficulty: 2}]},
  {key: "troll", label: "Trolls", match: ["troll", "trolls"], feature: "oath", title: "Bound by their word", page: "C20 p. 113",
    text: "Birthrights. Titan's Power: the first oath brings one more dot of Strength and one more Bruised level, the second two of each (nine health levels at most). Strong of Will and Body: two more dice to resist being seduced, talked or magically turned from their duty, and Athletics and Alertness never botch. Frailty. Bond of Duty: breaking an oath or contract takes Titan's Power away and the troll sickens until amends are made; betrayed, a Willpower roll (8) holds back the rage."},
  {key: "aithu", label: "Aithu (Thallain)", match: ["aithu"], feature: "line", title: "Stories that bind", page: "C20 p. 371",
    text: "Birthrights. Beguile: a told story, a Glamour point and Persuasion + Manipulation against Willpower leave the listener haunted by its visions for an hour per success (eshu and oba are immune). Pitiful Visage: a Glamour point and Appearance + Subterfuge (7) give the look of a kindly crone or a lovely youth for an hour per success; Perception + Kenning beating those successes sees through it. Frailty. Spellbound: an aithu falls into any story told well; lulled, they hand the teller a token that buys a favour."},
  {key: "beasties", label: "Beasties (Thallain)", match: ["beastie", "beasties"], feature: "line", title: "The thing in the dark", page: "C20 p. 372",
    text: "Birthrights. Beastie Form: unseen, a Glamour point turns them into their true monstrous shape; turning back is free but also done alone. Gaia's Mercy: within an hour the Mists hide what they looked like and did. Frailty. The Hunt: once a month something calls every beastie out to hunt; to sit it out the Storyteller rolls Willpower (9), and even then the night is spent in a foul temper."},
  {key: "bodachs", label: "Bodachs (Thallain)", match: ["bodach", "bodachs"], feature: "line", title: "Under the bed", page: "C20 p. 373",
    text: "Birthrights. Boneless: any hole will do as a way in, and no grapple holds them more than a turn. Insight: Charisma + Empathy against the victim's Willpower shows what frightens them, and Ravaging that victim is two easier. Frailty. Deadly Exposure: two fewer health levels on both tracks; cats see them and drive them off."},
  {key: "boggarts", label: "Boggarts (Thallain)", match: ["boggart", "boggarts"], feature: "line", title: "A hundred more", page: "C20 p. 374",
    text: "Birthrights. Industrial Malice: physical work in a third of the time, and their chosen trade is one easier. Pack Mentality: each knows where two fellows are and can rope them in (Intelligence + Politics, 7); Perception + Kenning sniffs out boggans. Frailty. Magpie's Greed: an unguarded trinket that catches the eye must be stolen."},
  {key: "bogies", label: "Bogies (Thallain)", match: ["bogie", "bogies"], feature: "line", title: "Darkness spewed", page: "C20 p. 374",
    text: "Birthrights. Darkspawn: once a day they spew a darkness that makes seeing through it two harder. Hatred of the Weaver: a Glamour point hides them from machines for an hour; cameras show static and lights flicker. Frailty. Curse of the Weaver: bonds hurt them, a bashing level an hour; a cell, a lethal level a day."},
  {key: "ghasts", label: "Ghasts (Thallain)", match: ["ghast", "ghasts"], feature: "line", title: "The surgeon's hands", page: "C20 p. 375",
    text: "Birthrights. Natural Surgeon: their talon strikes gain two dice to hit and always do lethal harm. Malevolent Mists: victims forget the attack; fae remember only with Intelligence + Kenning. Frailty. Silence of Flesh: once a week they must eat the organs of a Dreamer or changeling; each day late, louder sounds hurt them a cumulative bashing die.", effects: [{tags: ["brawl"], dice: 2}]},
  {key: "goblins", label: "Goblins (Thallain)", match: ["goblin", "goblins"], feature: "line", title: "Masters of disaster", page: "C20 p. 376",
    text: "Birthrights. Mayhem: they knock together havoc machines that the Mists pass off as toys, which soon blow up for lethal levels equal to the goblin's Glamour. Gremlin Instinct: a Glamour point and a touch make any device fail in the worst way. Frailty. Temperamental Spite: an offended goblin plays vicious pranks on whoever is nearest until soothed."},
  {key: "huakai", label: "Huaka'i Po (Thallain)", match: ["huakai", "huaka i po", "night marcher", "night marchers"], feature: "line", title: "The night marchers", page: "C20 p. 376",
    text: "Birthrights. Chosen Ones: once a scene, one more success on any roll. Fearsome: on the march, Physical rolls against anyone not Thallain gain one; anyone who looks at the procession provokes them. Frailty. Call of the Fomorian: coarse habits make them stand out, in towns above all."},
  {key: "kelpies", label: "Kelpies (Thallain)", match: ["kelpie", "kelpies"], feature: "line", title: "The water horse", page: "C20 p. 377",
    text: "Birthrights. Equine Form: a Glamour point gives the shape of any horse or pony, for as long as they like. Otherworldly Allure: Charisma + Empathy against Willpower and the victim climbs on or follows them into the water to drown; after a turn under, the victim sees the trap. Frailty. Tack: bridled with enchanted tack (jewellery in human shape), a kelpie is bound to serve until released."},
  {key: "lurks", label: "Lurks (Thallain)", match: ["lurk", "lurks"], feature: "line", title: "At home in the wild", page: "C20 p. 377",
    text: "Birthrights. Landscape Stride: in their home terrain, Athletics, Stealth and Survival gain automatic successes equal to their Glamour, and they move twice as fast. Omnivorous Hunger: they eat anything that fits in the mouth. Frailty. Involuntary Signs: they always leave a trail to follow."},
  {key: "mandragoras", label: "Mandragoras (Thallain)", match: ["mandragora", "mandragoras"], feature: "line", title: "The tree fiend", page: "C20 p. 378",
    text: "Birthrights. Infestation: they pass into a tree and, for a Glamour dot, make it their own freehold, safe from harm, earning a Glamour point a week. Phantasm and Feast: a Glamour point baits the tree's pitchers; whatever falls in is digested, and its death refills their Glamour and Willpower. Frailty. Nature's Curse: harm to their tree comes to them as Banality, and its loss costs a Banality dot."},
  {key: "merrow", label: "Merrow (Thallain)", match: ["merrow", "merrows"], feature: "line", title: "The ocean's horrors", page: "C20 p. 379",
    text: "Birthrights. Gift of Dagon: a sea creature's weapon (sting, tentacles, shock or lure) and one more dot of Strength or Dexterity. Pelagic Nightmare: seeing one for the first time takes a Willpower roll against its Glamour or the onlooker freezes for a turn. Frailty. The Coldness: as Banality grows, they lose the power to breathe water."},
  {key: "nasties", label: "Nasties (Thallain)", match: ["nasty", "nasties"], feature: "line", title: "Fever and stench", page: "C20 p. 379",
    text: "Birthrights. Maenad's Fever: mortals near them for a few minutes roll Willpower against their Glamour or give in to their darkest wants (changelings once an hour). Harpy's Stench: an attacker rolls Stamina against their Glamour; a failure costs dice equal to it, a botch leaves them retching (satyrs do not mind). Frailty. Limos' Hunger: breaking off from a chance at their vice takes Willpower (9)."},
  {key: "nighthags", label: "Night Hags (Thallain)", match: ["night hag", "night hags", "nighthag", "nighthags"], feature: "line", title: "The weight on the chest", page: "C20 p. 380",
    text: "Birthrights. Paralytic Touch: a sleeper they touch wakes unable to move for twice their Glamour in turns (Willpower against their Glamour to resist). Shadowslide: a Glamour point wraps them in shadow, unseen; three take them home through shadow. Frailty. Photophobe: light brighter than the moon does an unsoakable aggravated level each minute."},
  {key: "ogres", label: "Ogres (Thallain)", match: ["ogre", "ogres"], feature: "line", title: "Strength of oaks", page: "C20 p. 380",
    text: "Birthrights. The Nose Knows: they smell who is Thallain, and Perception + Kenning (6) reads a person's mood for an easier social roll. Strength of Oaks: two more dots of Strength, even past 5 (two dice on every Strength roll), Strength never botches, and grapples gain dice equal to their Glamour. Frailty. Dumb as Rocks: noticing a lie, an ambush or sarcasm is two harder.", effects: [{tags: ["strength"], dice: 2}]},
  {key: "sevartal", label: "Sevartal (Thallain)", match: ["sevartal"], feature: "line", title: "Born to lead", page: "C20 p. 381",
    text: "Birthrights. Charismatic Presence: one more dot in a Social Attribute at creation, whose rolls never botch. Force Heritage: a changeling they wake is born sevartal and leans Unseelie even if they escape. Frailty. Aloof: a former servant gains an automatic success on Social and Mental rolls against them."},
  {key: "skinwalkers", label: "Skinwalkers (Thallain)", match: ["skinwalker", "skinwalkers"], feature: "line", title: "Tokens of the kill", page: "C20 p. 381",
    text: "Birthrights. Token: a piece of an animal they killed (feather, claw or hide) carried gives them that beast's touches. Frailty. Dependent: with no token on them, their Endowments are gone."},
  {key: "spriggan", label: "Spriggans (Thallain)", match: ["spriggan", "spriggans"], feature: "line", title: "Storm and snatch", page: "C20 p. 382",
    text: "Birthrights. Miser's Gift: the Storyteller rolls Wits + Kenning (6) and their favourite small thing appears in hand for a turn per success. Stormcallers: Manipulation + Kenning calls weather, a shower at one success, a storm of hurricane force at five. Frailty. Snatchers: they steal children, mostly for the parents' terror."},
  {key: "weepingwights", label: "Weeping Wights (Thallain)", match: ["weeping wight", "weeping wights", "weepingwights"], feature: "line", title: "Places of grief", page: "C20 p. 383",
    text: "Birthrights. Living Legends: Manipulation + Empathy against Willpower makes the target play out the scene of the wight's chosen tragedy, and Manipulation never botches. Ghostly Visage: a Glamour point per half hour makes them a translucent victim of that tragedy, untouchable but by cold iron. Frailty. Creatures of Habit: kept from replaying their tragedy, they think of nothing else."},
  {key: "acheri", label: "Acheri (adhene)", match: ["acheri"], feature: "line", title: "Shadow plague", page: "C20 p. 387",
    text: "Birthrights. Plague Nervosa: a Glamour point per victim sends their shadow to infect people with chimerical sickness. Enticement: tempting someone from a virtuous path, Charisma and Manipulation pools gain one. Frailty. Carriers: each has a vice; confronted with it, the Storyteller rolls Willpower (7) or they indulge. The Scarlet Ban: no Endowment works on someone dressed mostly in red."},
  {key: "aonides", label: "Aonides (adhene)", match: ["aonide", "aonides"], feature: "line", title: "The muses", page: "C20 p. 387",
    text: "Birthrights. Grace of Calliope: two more dots of Charisma or Manipulation, even past 5 (WoDX gives the dice to Charisma), Expression and Performance never botch, and the Silver Ban does not bind them. Adonis' Ravaging: a seduction and Manipulation + Subterfuge against Willpower take a Glamour point per success. Frailty. Arachne's Folly: told of a greater talent, they must challenge it, and a loss turns into years of revenge.", effects: [{tags: ["charisma"], dice: 2}]},
  {key: "firbholg", label: "Fir-bholg (adhene)", match: ["fir bholg", "firbholg"], feature: "line", title: "Chaos where they walk", page: "C20 p. 388",
    text: "Birthrights. Breath of Firchlis: a Glamour point and a Glamour roll (8) bend the chaos around them for a minute per success, never quite as meant. Frailty. Eochaid's Hunger: a week without their chosen food costs a Stamina dot a day, then health. Sacrifice: without offerings, regaining Glamour is three harder."},
  {key: "fuath", label: "Fuath (adhene)", match: ["fuath"], feature: "line", title: "Kin of beasts", page: "C20 p. 388",
    text: "Birthrights. Animal Nature: one more dot of Stamina (a die on every Stamina roll), a beast's speed in their home ground, and claws or fangs for Strength + 1 aggravated. Nature's Kin: no animal or feral chimera attacks them unprovoked; ordering one to takes Manipulation + Kenning against their Willpower. Frailty. Maenad's Madness: in a fight for life they fall into a blood trance that may not tell friend from foe (Willpower 8 each turn to end it).", effects: [{tags: ["stamina"], dice: 1}]},
  {key: "keremet", label: "Keremet (adhene)", match: ["keremet"], feature: "line", title: "Will over death", page: "C20 p. 389",
    text: "Birthrights. The Shadowed Way: free of the Silver Ban, they walk the trods and can sometimes reach the Underworld. Will to Power: no need to eat or breathe, immune to most chimerical sickness, Iron Will while they hold three Willpower, and a wound penalty one less for each two unspent Willpower. Frailty. Pact of Dagda: a pact sworn this way must be kept before all else. Melancholia: every Social roll is one harder, Empathy two.", effects: [{tags: ["social"], difficulty: 1}, {tags: ["empathy"], difficulty: 1}]},
  {key: "moire", label: "Moirae (adhene)", match: ["moire", "moirae", "moirai"], feature: "line", title: "Readers of fate", page: "C20 p. 390",
    text: "Birthrights. Aural Perception: a Glamour point and a Glamour roll (8) read a clue per success from the fate around a person (three harder for their own); Soothsay cantrips gain a die. Fata: the Dreaming punishes anyone who hinders them on the Silver Path. Frailty. Superstition: bad luck (a black cat, a broken mirror) curses them with Nightmares until put right, and a broken oath or ban bites a die harder."},
  {key: "naraka", label: "Naraka (adhene)", match: ["naraka"], feature: "line", title: "Fire and many arms", page: "C20 p. 391",
    text: "Birthrights. Wrath of Kali Ma: a Glamour point breathes fire, Glamour dice at 7, a lethal level per success at a metre; fire hurts them only as bashing and is one easier to soak. Arms of Ravana: a Glamour point and a Glamour roll (7) grow arms, each success a die to Melee or Brawl or a pair an extra physical action, a turn per success. Frailty. Curse of Shiva: live music makes them dance unless they pass a Willpower roll or spend a point. Selective Possession: custom limits whom they may possess."},
  {key: "canotili", label: "Canotili (Nunnehi)", match: ["canotili"], feature: "line", title: "Earth blend", page: "C20 p. 398",
    text: "Birthrights. Earth Blend: standing still outdoors they take the colours around them, an automatic success on Stealth. Physical Enhancement: one more dot of Strength or Dexterity. Frailty. Terror: startled, they give off a scent that sends anyone else within ten feet fleeing or lashing out (Willpower 8, or a Willpower point)."},
  {key: "inuas", label: "Inuas (Nunnehi)", match: ["inua", "inuas"], feature: "line", title: "Amulets and shapes", page: "C20 p. 398",
    text: "Birthrights. Imbue Amulet: a cantrip and a Medicine dot set one power into an amulet anyone may use once. Change Form: the shape of a wild animal of their land, more learned with experience. Frailty. Susceptibility: within five yards of a pollutant they lose a die from every pool, two when touching it (smog, a fouled river)."},
  {key: "kachinas", label: "Kachinas (Nunnehi)", match: ["kachina", "kachinas"], feature: "line", title: "Rain and cloud", page: "C20 p. 399",
    text: "Birthrights. Prayer of Plenty: Wits + Gremayre (7) brings rain and harvest. Cloud Form: a Medicine point makes them a drifting cloud, untouchable, a minute per Medicine dot. Frailty. Single Mind: one chosen Ability (Crafts, Etiquette, Leadership, Performance or Survival) gains a die; every other Ability loses one."},
  {key: "maymaygwyashi", label: "May-may-gwya-shi (Nunnehi)", match: ["may may gwya shi", "maymaygwyashi"], feature: "line", title: "Doors in the rock", page: "C20 p. 399",
    text: "Birthrights. Door in the Rock: Stamina + Athletics (7) passes through natural rock, with a Medicine point even a small vehicle. Call of the Swimmers: Manipulation brings fish to the water. Frailty. Weakness of Will: an untended catch of fish or a seafood feast cannot be refused without a Banality trigger."},
  {key: "nanehi", label: "Nanehi (Nunnehi)", match: ["nanehi"], feature: "line", title: "Shape and song", page: "C20 p. 400",
    text: "Birthrights. Shape the Body: size, age and face change at will, Appearance up or down one, and Appearance + Subterfuge (7) copies someone. Perfect Form: every performance roll gains a die, and a traditional song, dance or tale gains an automatic success. Frailty. Face in the Water: with their looks spoiled (mud, mussed hair, a scar) every roll loses a die.", effects: [{tags: ["performance"], dice: 1}]},
  {key: "numuzoho", label: "Nümüzo'ho (Nunnehi)", match: ["numuzoho", "n m zo ho"], feature: "line", title: "The giants", page: "C20 p. 400",
    text: "Birthrights. Extraordinary Size: two dots between Strength and Stamina, even past 5 (WoDX gives one to each), and Athletics never botches. Rouse the Elements: a Willpower and a Medicine point, once a lunar month, raise wind, avalanche or tremor over five miles. Frailty. Disfigurement: Appearance never above 1.", effects: [{tags: ["strength"], dice: 1}, {tags: ["stamina"], dice: 1}]},
  {key: "pugwis", label: "Pu'gwis (Nunnehi)", match: ["pugwis", "pu gwis"], feature: "line", title: "The songs", page: "C20 p. 401",
    text: "Birthrights. Song of Beckoning: Charisma + Performance against Willpower (7) draws listeners to sit with them until a Willpower roll a minute breaks it. Song of Dismissal: the same roll wipes them from the listener's memory. Frailty. Decay: Appearance 0 in mien and 1 in seeming, and Strength never above 3."},
  {key: "rockgiants", label: "Rock Giants (Nunnehi)", match: ["rock giant", "rock giants", "rockgiants"], feature: "line", title: "Flint skin", page: "C20 p. 402", bruised: 1,
    text: "Birthrights. Flint Coat: stone weapons cannot hurt them, and they have one more Bruised level. Prowess: one more dot of Strength, even past 5 (a die on every Strength roll), and Brawl and Intimidation never botch. Frailty. Fury: doubt their courage or might and they spend a Willpower point or turn to their Winter aspect and hunt the offender until a blow lands.", effects: [{tags: ["strength"], dice: 1}]},
  {key: "surems", label: "Surems (Nunnehi)", match: ["surem", "surems"], feature: "line", title: "The peacemakers", page: "C20 p. 402",
    text: "Birthrights. Serenity: anyone near them needs Willpower (8) to speak in anger or act violently. Congeniality: a Charisma roll that succeeds gains a success, and Empathy and Leadership never botch. Frailty. Plowshares: violence or a harsh word is a Banality trigger, and every violent act is one harder.", effects: [{tags: ["brawl", "melee", "ranged"], difficulty: 1}]},
  {key: "tunghat", label: "Tunghat (Nunnehi)", match: ["tunghat"], feature: "line", title: "Animal guise", page: "C20 p. 403",
    text: "Birthrights. Animal Illusion: at will they seem their bonded animal, never quite right (Perception + Alertness, or Kenning, at 8 to see through). Summon Herd: animals of that kind within half a day come, and Manipulation + Empathy (7) wins their help. Frailty. Animal Mind: past the first hour in the guise, Willpower (7) each hour or they become the animal."},
  {key: "waterbabies", label: "Water Babies (Nunnehi)", match: ["water baby", "water babies", "waterbabies"], feature: "line", title: "Beneath the waters", page: "C20 p. 403",
    text: "Birthrights. Air Bubbles: they breathe water and share it by touch. Strength of the Wave: avenging fouled water or a harmed child, Strength rises by two (it fails to come against the innocent). Frailty. Water Dependency: without immersion every 48 hours they lose an Attribute dot a day, then fade."},
  {key: "yunwiamaiyinehi", label: "Yunwi Amai'yine'hi (Nunnehi)", match: ["yunwi amai yine hi", "yunwiamaiyinehi"], feature: "line", title: "The water dwellers", page: "C20 p. 404",
    text: "Birthrights. Shape of the Swimmer: the pooka's shapechanging, into water creatures. Stir the Waters: Manipulation + Gremayre and a Medicine point calm or churn water. Frailty. Water Dependency: without immersion every 48 hours they lose a Medicine dot a day, then forget they are Nunnehi."},
  {key: "yunwitsunsdi", label: "Yunwi Tsunsdi (Nunnehi)", match: ["yunwi tsunsdi", "yunwitsunsdi", "little people"], feature: "line", title: "The Little People", page: "C20 p. 405",
    text: "Birthrights. Out of Sight: two more dice on every Stealth roll, and a Willpower point turns mortal eyes elsewhere. Clever Hands: Crafts is one easier and never botches. Frailty. Flame of Anger: rebuffed or insulted, Willpower (9) or they pay it back with pranks, and will not help that person for a moon.", effects: [{tags: ["stealth"], dice: 2}, {tags: ["crafts"], difficulty: -1}]},
  {key: "menehune", label: "Menehune", match: ["menehune"], feature: "line", title: "The calling", page: "C20 p. 415",
    text: "Birthrights. A Menehune's calling takes the place of a kith: ali'i, kahuna, hana or kokua (write the calling as the kith for its own row). All begin with an extra point of Mana and take Feast or War as their camp. Frailty. Each calling has its own frailty (see its row)."},
  {key: "alii", label: "Ali'i (Menehune)", match: ["ali i", "alii"], feature: "line", title: "Bearers of Mana", page: "C20 p. 416",
    text: "Birthrights. Unearthly Beauty, as the sidhe (two dice on every Appearance roll). Glamour Vessel: holds four times their Mana in stored points that other Menehune give at the Makahiki and draw on within 50 feet. Frailty. Sacrosanct: Banality destroys five stored points per point gained; stepping on their shadow, or a commoner not bowing to the village's ali'i, costs a Mana point.", effects: [{tags: ["appearance"], dice: 2}]},
  {key: "kahuna", label: "Kahuna (Menehune)", match: ["kahuna"], feature: "line", title: "Speakers to spirits", page: "C20 p. 416",
    text: "Birthrights. Break Taboo: once a lunar month, with respect and a Mana point, a taboo is broken without cost. Spirit Speech: they speak with every spirit. Frailty. Omens: once a session the Storyteller may drop them into a trance of spirit whispers."},
  {key: "hana", label: "Hana (Menehune)", match: ["hana"], feature: "line", title: "The makers", page: "C20 p. 417",
    text: "Birthrights. Craftwork: together they raise a traditional building in a night; alone, anything is made in half the time, unseen by mortals. Song: once a chapter, Charisma + Expression (7) gives every listener a Willpower point. Frailty. Abandonment: a task not done in the time they declared must be left forever, or they gain a Banality dot."},
  {key: "kokua", label: "Kokua (Menehune)", match: ["kokua"], feature: "line", title: "The swift", page: "C20 p. 417",
    text: "Birthrights. Nimble: one more dot of Dexterity (a die on every Dexterity roll). Swift: unseen by the banal, up to 200 miles a night on foot or by boat. Frailty. Cruel: entering battle, Willpower (7) or they fight to kill every foe.", effects: [{tags: ["dexterity"], dice: 1}]},
  {key: "glomes", label: "Glomes (Inanimae)", match: ["glome", "glomes"], feature: "line", title: "Strength of the stone", page: "C20 p. 440", bruised: 2,
    text: "Birthrights. Strength of the Stone: two more Bruised levels and two more dots of Strength, even past 5 (two dice on every Strength roll). Eidetic Memory, as the Merit. Frailty. Weight of the Stone: whatever their size they are immensely heavy, often over 500 pounds.", effects: [{tags: ["strength"], dice: 2}]},
  {key: "kuberas", label: "Kuberas (Inanimae)", match: ["kubera", "kuberas"], feature: "line", title: "Everything turns to gold", page: "C20 p. 441",
    text: "Birthrights. Fertile Mind: a Glamour roll (7) makes any venture of someone else's flourish, crops, children or shares. The Glow, as the Merit Sex Appeal. Frailty. Shining Beacon: when they draw the Mists' attention, witnesses' Banality counts two steps lower on the chart."},
  {key: "ondines", label: "Ondines (Inanimae)", match: ["ondine", "ondines"], feature: "line", title: "Nimble as water", page: "C20 p. 442",
    text: "Birthrights. Watery Form: the sluagh's Squirm, and in a fight a Glamour point a turn makes the Husk unharmable (no physical attacks meanwhile). Poetic Heart, as the Merit. Frailty. Wounds: each bears a lasting, often painful, disability from walking on land."},
  {key: "parosemes", label: "Parosemes (Inanimae)", match: ["paroseme", "parosemes"], feature: "line", title: "Vapour and flight", page: "C20 p. 442",
    text: "Birthrights. Vaporous Husks: a Glamour point (and one each later turn) turns them to vapour, through any crack and untouchable by mundane blows. Flight: a Glamour point a scene to fly five times their running speed. Frailty. Chatterbox: they cannot stop talking (or tapping); every Stealth roll is two harder.", effects: [{tags: ["stealth"], difficulty: 2}]},
  {key: "solimonds", label: "Solimonds (Inanimae)", match: ["solimond", "solimonds"], feature: "line", title: "Fiery souls", page: "C20 p. 443",
    text: "Birthrights. Fiery Souls: a Glamour point looses chimerical flame (Perception + Firearms; real through the Wyrd), and mundane fire cannot hurt them. Strong of Will and Body, as the troll's (two dice to resist being turned from duty), without the botch immunity. Frailty. Honesty at Heart: a broken word takes Strong of Will and Body and halves their fire; lying takes Willpower (8)."},
  {key: "mannikins", label: "Mannikins (Inanimae)", match: ["mannikin", "mannikins"], feature: "line", title: "Between two worlds", page: "C20 p. 443",
    text: "Birthrights. Living on the Edge: they learn Kithain Arts (buying Realms) but never a fifth dot of a Sliver or Art. Mimicry: two more dice on Husk rolls to avoid mortal notice. Frailty. Alien Soul: as the Arcadian sidhe, every Banality point gained counts double."},
  {key: "ghilledhu", label: "Ghille Dhu", match: ["ghille dhu", "ghilledhu"], feature: "line", title: "Rooted in the green", page: "C20 p. 447",
    text: "Birthrights. Nature's Bounty: they harvest Glamour from nature as the Nunnehi do. By seeming: Spin the Wheel (spring) rerolls one roll a story; Rose and Oak (summer) one more dot each of Appearance and Strength; Wisdom of the Ages (old) a question to the Dreaming once a lunar cycle (Willpower, 7 for yes or no). Frailty. The Kiss of Death: a chimerical death ages them to the next seeming, and each Banality dot gained takes a Glamour roll against their Banality or they age on; past Autumn the body dies."},
  {key: "korred", label: "Korred", match: ["korred", "korreds"], feature: "line", title: "Keepers of secrets", page: "C20 p. 447",
    text: "Birthrights. Testament: at their Chrysalis the Dreaming gives them one great secret, and once a scene among the Dreaming's places Intelligence + Gremayre (8) recalls a relevant one. Balance: a Willpower point once a story undoes an Imbalance. Frailty. Truth: they may never knowingly lie, though they may mislead."},
  {key: "merfolk", label: "Merfolk", match: ["merfolk"], feature: "line", title: "The sea's call", page: "C20 p. 448",
    text: "Birthrights. Apsara of Vatea: a bonded fish spirit gives one more dot in a fitting Attribute and that creature's gifts. Gills: they breathe under water (blowholes, about six hours). Ocean's Beauty: one more dot of Appearance (a die on every Appearance roll), and Appearance never botches. Frailty. The Coldness: as Banality rises they lose the power to breathe water, and with no Glamour left they drown. Out of Touch: Streetwise, Drive, Firearms and Computer only with freebie points at creation.", effects: [{tags: ["appearance"], dice: 1}]},
  {key: "morganed", label: "Morganed", match: ["morganed"], feature: "line", title: "The sirens", page: "C20 p. 449",
    text: "Birthrights. Born of the Sea: in water their legs become a tail and every Dexterity roll is two easier, depth does not trouble them, and they hold their breath five minutes per Stamina dot. Song of the Sea: mortals within 50 metres per Manipulation dot who hear it roll Willpower (7) or seek the singer, docile. Frailty. Bound to the Sea: a day without an hour in salt water costs a Glamour point."},
  {key: "oba", label: "Oba", match: ["oba"], feature: "line", title: "Rulers of the eshu", page: "C20 p. 450",
    text: "Birthrights. Mantle of the Orishas: crowned and bound to their land (Africa, India or the Middle East), they gain the sidhe's Unearthly Beauty (two dice on every Appearance roll), and Leadership and Empathy never botch. Tale Craft, as the eshu. Frailty. Native Soil: away from their land more than a full moon cycle, they lose a health level a day.", effects: [{tags: ["appearance"], dice: 2}]},
  {key: "riverhags", label: "River Hags", match: ["river hag", "river hags", "riverhags"], feature: "line", title: "Under the river", page: "C20 p. 450",
    text: "Birthrights. Dark Appetite, as the redcap. Into the Depths: they breathe under water without end. Frailty. Tied to the River: more than a week away from their river, an aggravated level a day that heals only in it."},
  {key: "wichtel", label: "Wichtel", match: ["wichtel"], feature: "line", title: "The miners", page: "C20 p. 451",
    text: "Birthrights. Dowsing: Perception + Kenning (6) finds where to dig for stone, metal, oil or water. Industrious: one more dot of Stamina (a die on every Stamina roll), and manual labour never botches. Frailty. Vengeful: wronged, every roll but those to pay it back is two harder until amends.", effects: [{tags: ["stamina"], dice: 1}]},
  {key: "wolpertinger", label: "Wolpertinger", match: ["wolpertinger", "wolpertingers"], feature: "line", title: "Once prey", page: "C20 p. 452",
    text: "Birthrights. Voracious Grazing: Glamour from a freehold comes with one more point. Prey Alertness: mundane attempts to surprise them fail, and seeing through magical deception is two easier. Frailty. Unquenchable Appetite: each week in a freehold lowers its rating a dot, which returns a dot a week after they leave."},
  // B6729: group rows, for a custom kith name that only gives the group
  {key: "thallain", label: "Thallain", match: ["thallain"], feature: "line", title: "Born of fear", page: "C20 pp. 370-383",
    text: "Nightmare fae, NPCs as a rule. Each Thallain kith has Endowments in place of birthrights and a Vulnerability in place of a frailty: write the kith's own name for its row."},
  {key: "inanimae", label: "Inanimae", match: ["inanimae"], feature: "line", title: "Bound to a thing", page: "C20 pp. 438-443",
    text: "An Inanimae's anchor is a thing or a place: harm to it harms them, and they rest best beside it. Write the kith's own name (glome, kubera, ondine, paroseme, solimond, mannikin) for its row."},
  {key: "nunnehi", label: "Nunnehi", match: ["nunnehi"], feature: "line", title: "The tribes of the Nunnehi", page: "C20 pp. 394-405",
    text: "Each Nunnehi tribe keeps its own land in the Americas; a holding there needs their leave. Write the tribe's own name for its row."},
  {key: "darkkin", label: "Dark-Kin", match: ["darkkin", "dark kin", "adhene"], feature: "line", house: true, title: "The shadow kin", page: "C20 pp. 384-391",
    text: "The adhene, fae of the old shadow courts. Seelie fae treat them warily at first meeting. Write the kith's own name for its row."},
  {key: "dauntain", label: "Dauntain", match: ["dauntain"], feature: "line", title: "The fae who hunt their own", page: "C20, the Dauntain",
    text: "NPCs. Changelings in the grip of Banality who hunt the fae. Near one, other changelings feel their Glamour thin."},
  {key: "kamuii", label: "Hsien nobles", match: ["kamuii"], feature: "line", title: "Rank in heaven", page: "Land of Eight Million Dreams pdf 13",
    text: "A seat in the politics of the Shinma court, a faction standing of its own."},
  {key: "komuko", label: "Komuko", match: ["komuko"], feature: "line", title: "The hearth", page: "Land of Eight Million Dreams pdf 55-65",
    text: "A house with a komuko in it is a safer haven: those who break in face one harder rolls."},
  {key: "suijen", label: "Suijen", match: ["suijen"], feature: "line", title: "Water", page: "Land of Eight Million Dreams pdf 55-65",
    text: "They swim freely, and rain brings back their Glamour."},
  {key: "hanumen", label: "Hanumen", match: ["hanumen"], feature: "line", title: "The monkey's tricks", page: "Land of Eight Million Dreams pdf 55-65",
    text: "Tricks and climbing are one easier.", effects: [{tags: ["athletics", "lift"], difficulty: -1}]},
  {key: "nyan", label: "Nyan", match: ["nyan"], feature: "line", title: "The cat's ease", page: "Land of Eight Million Dreams pdf 55-65",
    text: "They see at night and sleep anywhere. Sight in the dark is one easier.", effects: [{tags: ["sight"], difficulty: -1, when: "dark"}]},
  {key: "chuihyu", label: "Chu-ih-yu", match: ["chu ih yu", "chuihyu"], feature: "line", title: "War", page: "Land of Eight Million Dreams pdf 55-65",
    text: "Fight rolls are one easier; peace scenes one harder.", effects: [{tags: ["brawl", "melee"], difficulty: -1}, {tags: ["etiquette"], difficulty: 1}]},
  {key: "tanuki", label: "Tanuki", match: ["tanuki"], feature: "line", title: "The shape of a thing", page: "Land of Eight Million Dreams pdf 55-65",
    text: "Shapeshifting tricksters: a Tanuki can pass as a thing in the scene, a jar, a lantern or a stone."},
  {key: "hirayanu", label: "Hsien commoners", match: ["hirayanu", "hsien"], feature: "line", title: "Animal nature", page: "Land of Eight Million Dreams pdf 13, 55-65",
    text: "Animals answer them as kin. Animal Ken gains a die.", effects: [{tags: ["animalken"], dice: 1}]},
];

/** Seemings: the mortal age the clock moves through. */
export const SEEMINGS = [
  {key: "childling", label: "Childling", match: ["childling", "childlings"], feature: "line", title: "The child's wonder", page: "C20, the seemings",
    text: "Banality touches them least. As the years on the clock pass, a childling grows into a wilder. Rolls to resist Banality are one easier.", effects: [{tags: ["banality"], difficulty: -1}]},
  {key: "wilder", label: "Wilder", match: ["wilder", "wilders"], feature: "line", title: "The fire of youth", page: "C20, the seemings",
    text: "Passion runs hot: Glamour comes and goes fast. With the years, a wilder grows into a grump."},
  {key: "grump", label: "Grump", match: ["grump", "grumps"], feature: "line", title: "The weight of years", page: "C20, the seemings",
    text: "Wisdom and the long view, and Banality closer: rolls to resist it are one harder. Lore of the fae gains a die.", effects: [{tags: ["banality"], difficulty: 1}, {tags: ["occult"], dice: 1}]},
];

/** Courts. season: which half of the year the court holds power (Samhain to Beltaine is the Unseelie half). */
export const COURTS = [
  {key: "seelie", label: "Seelie Court", match: ["seelie"], feature: "court", season: "summer", title: "Season of the court", page: "C20, the courts; Dark Ages Fae pdf 19-20, 25-26",
    text: "From Beltaine to Samhain the Seelie hold power: in that half of the year their Etiquette and Leadership gain a die. In the Dark Ages the courts are the seasonal Courts, and the season on the clock favours its own.", effects: [{tags: ["etiquette", "leadership"], dice: 1, when: "court"}]},
  {key: "unseelie", label: "Unseelie Court", match: ["unseelie"], feature: "court", season: "winter", title: "Season of the court", page: "C20, the courts; Dark Ages Fae pdf 19-20, 25-26",
    text: "From Samhain to Beltaine the Unseelie hold power: in that half of the year their Intimidation and Subterfuge gain a die. In the Dark Ages the courts are the seasonal Courts, and the season on the clock favours its own.", effects: [{tags: ["intimidation", "subterfuge"], dice: 1, when: "court"}]},
];

/** Sidhe Houses (C20 pdf 10, 51): a seat in the courts; boon and flaw as the book gives them, applied by the Storyteller. */
const house = (key, label, theme, effects = []) => ({key, label: `House ${label}`, match: [key, `house ${key}`], feature: "line", title: "The House's seat", page: "C20 pdf 10, 51",
  text: `${theme} The House holds a seat in the fae courts; its boon and flaw are applied from the book.`, ...(effects.length ? {effects} : {})});
export const FAE_HOUSES = [
  house("aesin", "Aesin", "A House of the Courts."), house("ailil", "Ailil", "Masters of intrigue.", [{tags: ["subterfuge"], dice: 1}]),
  house("balor", "Balor", "A House marked by the old Fomorian blood."), house("beaumayn", "Beaumayn", "Seers of dreams."),
  house("danaan", "Danaan", "A House of the old Tuatha."), house("daireann", "Daireann", "A House of the Courts."),
  house("dougal", "Dougal", "Smiths and makers.", [{tags: ["crafts"], dice: 1}]), house("eiluned", "Eiluned", "Sorcerers and keepers of secrets.", [{tags: ["occult"], dice: 1}]),
  house("fiona", "Fiona", "Passion and love, and courage to match."), house("gwydion", "Gwydion", "Judges who seek the truth.", [{tags: ["empathy"], dice: 1}]),
  house("leanhaun", "Leanhaun", "Muses who feed on those they inspire."), house("liam", "Liam", "The disgraced House, kind to commoners."),
  house("scathach", "Scathach", "Warriors who take commoners in.", [{tags: ["melee", "brawl"], dice: 1}]), house("varich", "Varich", "The House of the far east of Europe."),
];

/** The court that holds power by month: Samhain (1 November) to Beltaine (1 May) is the Unseelie half. */
export const UNSEELIE_MONTHS = [11, 12, 1, 2, 3, 4];

/* ================= Wraith (Chronicle 0.35.0) ================= */

/**
 * Guilds, legions and the factions of the dead. The wraith sheet has no guild or legion field, so they are kept in the
 * actor flag wodx-chronicle.wraith = {guild, legion, faction}, picked in the feature window. A legion is suggested from
 * the sheet's death field by the manner of death (death: words). Page refs: Wraith 20th.
 */
const guild = (key, label, art, title, text, effects = [], also = []) => ({key, label, match: [key, label.toLowerCase(), art.toLowerCase()], feature: "line", title,
  page: "Wraith 20th, the Guild's pages", text, ...(effects.length ? {effects} : {}), ...(also.length ? {also} : {})});
export const GUILDS = [
  guild("alchemists", "Alchemists", "Flux", "The soulforge", "Flux works the decay of things: relics and soulsteel are made as recipes at a forge. Crafts gains a die.", [{tags: ["crafts"], dice: 1}]),
  guild("artificers", "Artificers", "Inhabit", "Inside the thing", "An Artificer can inhabit a door, a lock, a lamp or a machine of the age and work it from inside. Living witnesses see it move by itself."),
  guild("chanteurs", "Chanteurs", "Keening", "Songs that cross the Shroud", "Keening sways the feelings of a scene, heard by the living as a sound with no source. Performance gains a die.", [{tags: ["performance"], dice: 1}]),
  guild("harbingers", "Harbingers", "Argos", "Tempest roads", "Argos carries them across the Tempest quickly, and others with them for a fee in oboli."),
  guild("haunters", "Haunters", "Pandemonium", "Strange happenings", "Pandemonium brings cold spots, failing lights and blood on the walls; mortals who see it may flee. Intimidation gains a die.", [{tags: ["intimidation"], dice: 1}]),
  guild("masquers", "Masquers", "Moliate", "Shaped corpus", "Moliate reshapes a wraith's body (claws, wings, a new face), their own or another's, and a disguise made with it is a false face to the crossover referee."),
  guild("mnemoi", "Mnemoi", "Mnemosynis", "Written in the mind", "A Mnemoi can add, take or change a memory: a witness to a breach can be made to forget it before the rumour spreads."),
  guild("monitors", "Monitors", "Lifeweb", "The web of ties", "A Monitor knows when a Fetter they watch is touched or harmed, and senses the ties of other wraiths. Awareness gains a die.", [{tags: ["awareness"], dice: 1}]),
  guild("oracles", "Oracles", "Fatalism", "Strands of fate", "Once a night an Oracle can read a riddle about the next dated event, and can tell when a living person will die.", [], ["glimpse"]),
  guild("pardoners", "Pardoners", "Castigate", "Castigate", "A Pardoner can ease another wraith's Angst and the Shadow's hold. Confessions heard become leverage, spent as favours in the Ledger.", [], ["leverage"]),
  guild("proctors", "Proctors", "Embody", "Seen by the living", "Embody makes a wraith visible and solid: a mortal who sees it has seen a ghost, a breach, and animals shy."),
  guild("puppeteers", "Puppeteers", "Puppetry", "Skinriding", "A Puppeteer rides a living body for the scene, with its own traits; those who know the person may notice the change in manner."),
  guild("sandmen", "Sandmen", "Phantasm", "Dream work", "Phantasm shapes the dreams of sleepers, which sets their mood toward a person the next day."),
  guild("solicitors", "Solicitors", "Intimation", "Whispered wants", "Intimation reads and pushes desires: the next social roll against that person is easier, and they learn what someone would trade. Subterfuge gains a die.", [{tags: ["subterfuge"], dice: 1}]),
  guild("spooks", "Spooks", "Outrage", "Outrage", "Outrage moves and breaks things: doors burst, glass breaks, and thrown things hit as attacks."),
  guild("usurers", "Usurers", "Usury", "The soul's bank", "Usury moves Corpus and Pathos between wraiths; it is bought and sold for oboli and kept as debts in the Ledger. Finance gains a die.", [{tags: ["finance"], dice: 1}]),
];

/** The legions (Wraith 20th pdf 136-137) and the manner of death each claims. */
const legion = (key, label, lord, death, title, text, effects = [], also = []) => ({key, label, match: [key, label.toLowerCase()], death, feature: "line", title,
  page: "Wraith 20th pdf 136-137; joining by the manner of death is a house reading", house: true, text: `Ruled by ${lord}. ${text}`, ...(effects.length ? {effects} : {}), ...(also.length ? {also} : {})});
export const LEGIONS = [
  legion("emerald", "Emerald Legion", "the Emerald Lord", ["accident", "chance", "drowned", "fell", "happenstance"], "Luck", "Once a week (a house reading of once a story), a reroll on a roll of chance.", [], ["luck"]),
  legion("fate", "Fate Legion", "the Ladies of Fate", ["fate", "marked", "unknown cause", "destined"], "Outside politics", "They hear the riddle of the next dated event, as the Oracles do.", [], ["glimpse"]),
  legion("grim", "Grim Legion", "the Smiling Lord", ["violence", "murder", "murdered", "killed", "war", "battle", "stabbed", "shot", "hanged", "executed"], "A die in fights", "Brawl and Melee gain a die.", [{tags: ["brawl", "melee"], dice: 1}]),
  legion("iron", "Iron Legion", "the Ashen Lady", ["old age", "age", "natural", "in sleep", "peacefully"], "Patience", "Long tasks over the clock gain a success on every roll that is not a botch.", [{tags: ["crafts", "academics"], dice: 1}]),
  legion("paupers", "Paupers Legion", "the Beggar Lord", ["mystery", "vanished", "lost", "never found"], "Hidden ways", "Stealth and the search for secrets gain a die.", [{tags: ["stealth", "investigation"], dice: 1}]),
  legion("penitent", "Penitent Legion", "the Laughing Lady", ["madness", "insane", "mad", "asylum"], "The mad ear", "They hear the living through a derangement, as the Malkavians do.", [], ["hear"]),
  legion("silent", "Silent Legion", "the Quiet Lord", ["despair", "suicide", "grief", "hopeless"], "Quiet against the Shadow", "Rolls against Angst and the Harrowing are one easier.", [{tags: ["angst", "harrowing"], difficulty: -1}]),
  legion("skeletal", "Skeletal Legion", "the Skeletal Lord", ["disease", "plague", "illness", "sickness", "fever", "consumption", "cancer"], "Proof against decay", "Rolls against disease and the Withering are one easier.", [{tags: ["disease", "withering"], difficulty: -1}]),
];

/** Factions of the dead outside the Hierarchy, and what a wraith can become. */
export const WRAITH_FACTIONS = [
  {key: "heretics", label: "Heretics", match: ["heretic", "heretics", "fishers"], feature: "line", title: "The heretic cult", page: "Wraith 20th pdf 68",
    text: "A faction of their own seeking Transcendence outside Stygia: Hierarchy NPCs hunt them, and their rites can restore Pathos."},
  {key: "renegades", label: "Renegades", match: ["renegade", "renegades"], feature: "line", title: "Outlaws of the Shadowlands", page: "Wraith 20th, the Renegades",
    text: "At war with the Hierarchy: its patrols attack on sight, and Renegade traders sell relics cheaper."},
  {key: "ferrymen", label: "Ferrymen", match: ["ferryman", "ferrymen"], feature: "line", title: "The Tempest crossing", page: "Wraith 20th pdf 68",
    text: "Boatmen of the Tempest who answer to no one: a crossing with them is safe and fast, for a price in oboli."},
  {key: "spectres", label: "Spectres", match: ["spectre", "spectres", "doppelganger"], feature: "line", wyrm: false, title: "Shadow risen", page: "Wraith 20th, the Spectres",
    text: "NPCs. A wraith whose Shadow wins too often becomes one; doppelgangers walk among wraiths wearing a friend's face."},
  {key: "risen", label: "The Risen", match: ["risen"], feature: "line", title: "Walking dead", page: "Wraith 20th, the Risen",
    text: "A Risen walks in their own body, which rots by the clock unless they spend Pathos on it."},
];
/** Days between uses of the Emerald luck (a house reading of "once a story"). */
export const LUCK_DAYS = 7;

/* ================= Hunter, Mummy, Demon, Kuei-jin and Orpheus (Chronicle 0.36.0) ================= */

/**
 * The smaller lines, one table each. match: words of the sheet's own field (a Hunter's creed, a Mummy's Amenti, a Demon's
 * house and faction) or of the pick kept in the actor flag wodx-chronicle.splat (Kuei-jin and Orpheus, whose sheets have
 * no field for it). The years follow standing rule 12: inquisitors in the Dark Ages, mortal hunters to 1998, the imbued
 * from 1999 (from 2023 in the World of Future Darkness).
 */
const row = (key, label, match, title, page, text, more = {}) => ({key, label, match, feature: "line", title, page, text, ...more});
export const HUNTER = [
  row("avenger", "Avengers", ["avenger", "avengers"], "The righteous blow", "Hunter: the Reckoning, the creeds", "Against a monster, fight rolls gain a die. Walking away from one costs Conviction.", {from: 1999, effects: [{tags: ["brawl", "melee", "ranged"], dice: 1, when: "monster"}]}),
  row("defender", "Defenders", ["defender", "defenders"], "The shield", "Hunter: the Reckoning, the creeds", "A Defender guards a place: harm or theft there reaches them wherever they are. Standing beside someone a monster attacks gives a soak die.", {from: 1999, feature: "guard"}),
  row("judge", "Judges", ["judge", "judges"], "The verdict", "Hunter: the Reckoning, the creeds", "A Judge may give a verdict on a monster, and learns whether it has harmed the innocent.", {from: 1999, feature: "ruling", secret: true}),
  row("innocent", "Innocents", ["innocent", "innocents"], "Open eyes", "Hunter: the Reckoning, the creeds", "A monster spoken to kindly by an Innocent thinks better of them. Empathy gains a die.", {from: 1999, effects: [{tags: ["empathy"], dice: 1}]}),
  row("martyr", "Martyrs", ["martyr", "martyrs"], "Taking the wound", "Hunter: the Reckoning, the creeds", "A Martyr can take harm meant for someone else beside them: when someone next to a Martyr is hurt, the Martyr's player gets a button to take the wound instead.", {from: 1999}),
  row("redeemer", "Redeemers", ["redeemer", "redeemers"], "The second chance", "Hunter: the Reckoning, the creeds", "A Redeemer's long work with a monster can help its Humanity or Path, a task over weeks on the clock.", {from: 1999}),
  row("visionary", "Visionaries", ["visionary", "visionaries"], "The bigger picture", "Hunter: the Reckoning, the creeds", "Lore pages open for them sooner. Occult and Investigation gain a die.", {from: 1999, effects: [{tags: ["occult", "investigation"], dice: 1}]}),
  row("hermit", "Hermits", ["hermit", "hermits"], "The messages", "Hunter: the Reckoning, the creeds", "Once a night a Hermit can hear the Messengers: a riddle about the next dated event.", {from: 1999, also: ["glimpse"]}),
  row("wayward", "Waywards", ["wayward", "waywards"], "Single minded", "Hunter: the Reckoning, the creeds", "Fight rolls to destroy monsters gain a die; a Wayward never takes a monster's side, even when it is right.", {from: 1999, effects: [{tags: ["brawl", "melee", "ranged"], dice: 1, when: "monster"}]}),
  row("hh2", "Mortal hunters", ["hunters hunted", "mortal hunter", "mortal hunters", "hunter"], "Faith and preparation", "Hunters Hunted II", "A hunter's kit (stakes, holy water, a crucifix carried with True Faith) is used from the pack, and preparing a hunt is a recipe. Investigation gains a die.", {from: 1500, until: 1998, effects: [{tags: ["investigation"], dice: 1}]}),
  row("inquisition", "Inquisitors", ["inquisitor", "inquisitors", "inquisition", "society of leopold", "leopold"], "Faith and the files", "V20 Dark Ages, the Inquisition; Hunters Hunted II", "True Faith wards make monsters recoil and burn the wicked, and the faithful help them. Every breach of the Masquerade reaches the Inquisition, and its agents press the hunters in the region.", {feature: "watchers"}),
  row("arcanum", "Arcanum", ["arcanum"], "The library", "Hunters Hunted II, the Arcanum", "Research on any monster with the Library's files gains a die, and a breach of the Masquerade becomes a file they can read.", {effects: [{tags: ["academics", "occult"], dice: 1}]}),
  row("agencies", "Government hunters", ["project twilight", "twilight", "agency", "agencies", "fbi", "nsa"], "Case files", "Hunters Hunted II; Project Twilight", "They read police files and camera records as the New World Order does: a breach reaches them, and they send a team.", {from: 1900, house: true, feature: "watchers"}),
  row("faithful", "Mortals with True Faith", ["true faith", "faithful"], "Faith that burns", "V20, True Faith", "On holy ground (a sacred place on the map that is not desecrated) their Faith counts one higher."),
];
export const MUMMY = [
  row("kherminu", "Kher-minu", ["kher minu", "tomb watchers"], "The guarded place", "Mummy: the Resurrection, the Amenti", "Amulets made as charms are used from the pack. A place a Kher-minu takes as a charge (a tomb, a museum wing, a temple) is guarded: harm or theft there reaches them.", {feature: "guard"}),
  row("khrihabi", "Khri-habi", ["khri habi", "scroll bearers"], "Alchemy", "Mummy: the Resurrection, the Amenti", "Elixirs that heal, poison or change are recipes at a laboratory kit, a quality step stronger. Old texts in the Library read easier for them. Science gains a die.", {effects: [{tags: ["science"], dice: 1}]}),
  row("mesektet", "Mesektet", ["mesektet", "night suns"], "Celestial", "Mummy: the Resurrection, the Amenti", "Once a lunar month, under a clear sky, the stars give a riddle about the next dated event.", {also: ["sky"]}),
  row("sakhmu", "Sakhmu", ["sakhmu", "spirit scepters"], "Effigy", "Mummy: the Resurrection, the Amenti", "Effigies are crafted items that hold a spirit, a curse or a likeness, used from the pack. Crafts gains a die.", {effects: [{tags: ["crafts"], dice: 1}]}),
  row("sefekhi", "Sefekhi", ["sefekhi", "unbandaged"], "Necromancy", "Mummy: the Resurrection, the Amenti", "Their hekau reach the Shadowlands; the dead of Egypt answer them, kept in a ledger of the bound.", {also: ["family"], servant: "one of the dead"}),
  row("udjasen", "Udja-sen", ["udja sen", "judged ones"], "The judged", "Mummy: the Resurrection, the Amenti", "One feature of another Amenti, picked by the Storyteller, and a mark of the judgement on the body."),
  row("ishmaelites", "Ishmaelites", ["ishmaelite", "ishmaelites"], "Outcasts of the Amenti", "Mummy: the Resurrection", "The Amenti hunt them; an Ishmaelite trades secrets for safety, written as pages of secrets.", {also: ["secrets"]}),
  row("cabiri", "Cabiri", ["cabiri"], "The last ones", "Mummy: the Resurrection pdf 13, 29", "Few remain: one is met once in a chronicle, and a lore page opens with them."),
  row("banemummy", "Bane mummies", ["bane mummy", "bane mummies"], "The cursed spell", "Mummy: the Resurrection", "NPCs. They curse as they die, and rise again."),
];
export const DEMON = [
  row("devils", "Devils", ["devil", "devils", "namaru"], "A following", "Demon: the Fallen, the Houses", "The demon draws passers-by into a following that grows with each scene of worship. Leadership gains a die.", {effects: [{tags: ["leadership"], dice: 1}]}),
  row("scourges", "Scourges", ["scourge", "scourges", "asharu"], "The breath of the world", "Demon: the Fallen, the Houses", "The Lore of the Winds at three dots or more raises a gale over the place for the night, a storm at five; the Lore of Awakening heals or sickens. Medicine gains a die.", {effects: [{tags: ["medicine"], dice: 1}]}),
  row("malefactors", "Malefactors", ["malefactor", "malefactors", "annunaki"], "The Forge", "Demon: the Fallen, the Houses", "The Lore of the Forge enchants things they craft; the Lore of Paths finds the way through any place. Crafts gains a die.", {effects: [{tags: ["crafts"], dice: 1}]}),
  row("fiends", "Fiends", ["fiend", "fiends", "neberu"], "Patterns and portals", "Demon: the Fallen, the Houses", "The Lore of Patterns gives a riddle about the next dated event once a night; the Lore of Portals opens a door between two places.", {also: ["glimpse"]}),
  row("defilers", "Defilers", ["defiler", "defilers", "lammasu"], "Longing", "Demon: the Fallen, the Houses", "The Lore of Longing works on desire with the hidden Corruption ledger the Followers of Set use; the Lore of Storms works sea and rain.", {also: ["corruption"]}),
  row("devourers", "Devourers", ["devourer", "devourers", "rabisu"], "Flesh and beast", "Demon: the Fallen, the Houses", "The Lore of Flesh changes the body; the Lore of the Beast commands animals. Animal Ken gains a die.", {effects: [{tags: ["animalken"], dice: 1}]}),
  row("slayers", "Slayers", ["slayer", "slayers", "halaku"], "Death and realms", "Demon: the Fallen, the Houses", "They see who is dying and how long is left, and cross into the Shadowlands."),
  row("luciferans", "Luciferans", ["luciferan", "luciferans"], "The army of Lucifer", "Demon: the Fallen, the factions", "A faction that builds a following for the war to come."),
  row("faustians", "Faustians", ["faustian", "faustians"], "The pact", "Demon: the Fallen, the factions", "They trade in pacts: what a mortal owes is leverage, spent as a favour in the Ledger.", {also: ["leverage"]}),
  row("cryptics", "Cryptics", ["cryptic", "cryptics"], "The question", "Demon: the Fallen, the factions", "They search old records for why the Fall happened. Investigation gains a die.", {effects: [{tags: ["investigation"], dice: 1}]}),
  row("reconcilers", "Reconcilers", ["reconciler", "reconcilers"], "The way home", "Demon: the Fallen, the factions", "They seek to mend the world and find a way home; they deal gently with mortals."),
  row("raveners", "Raveners", ["ravener", "raveners"], "Ruin", "Demon: the Fallen, the factions", "They want an end to everything; other factions treat them as foes on sight."),
  row("earthbound", "Earthbound", ["earthbound"], "The idol", "Demon: the Fallen, the Earthbound", "NPCs. An Earthbound's reliquary is a thing or a building, and its cult is a faction with an income of faith."),
];
export const KUEIJIN = [
  row("devilTiger", "Howl of the Devil-Tiger", ["devil tiger", "devil-tiger"], "Hunting the servants of the Yama Kings", "Kindred of the East, the Dharmas", "They track demons and corrupt spirits, and a fight against one restores a point of Yang Chi. Their P'o is stronger: rolls to resist it are one harder.", {effects: [{tags: ["frenzy"], difficulty: 1}]}),
  row("crane", "Way of the Resplendent Crane", ["crane", "resplendent crane"], "Duty", "Kindred of the East, the Dharmas", "A Crane may rule on a matter of law, posted for all; upholding the law earns face, breaking it costs face. Etiquette gains a die.", {feature: "ruling", effects: [{tags: ["etiquette"], dice: 1}]}),
  row("shadow", "Song of the Shadow", ["song of the shadow", "shadow"], "Shadow and death", "Kindred of the East, the Dharmas", "Yin Chi from graves and the Yin realms; ghosts come to them."),
  row("whispers", "Path of a Thousand Whispers", ["thousand whispers", "whispers"], "Many lives", "Kindred of the East, the Dharmas", "They hold several lives at once, each known to NPCs by its own name. Subterfuge gains a die.", {effects: [{tags: ["subterfuge"], dice: 1}]}),
  row("dragon", "Dance of the Thrashing Dragon", ["thrashing dragon", "dragon"], "Joy and life", "Kindred of the East, the Dharmas", "They feed on the yang Chi of life and passion (revels, crowds), and plants grow where they linger. Performance gains a die.", {effects: [{tags: ["performance"], dice: 1}]}),
  row("wanxian", "Wan Xian", ["wan xian", "fallen"], "The fallen line", "Land of Eight Million Dreams pdf 6", "NPCs in stories of the East: meeting one opens a lore page and sends the Storyteller a card."),
];
export const ORPHEUS = [
  row("skimmer", "Skimmers", ["skimmer", "skimmers"], "The breath held", "Orpheus core", "A Skimmer goes out by holding the breath: the body left behind is defenceless while they are out.", {from: 2023}),
  row("sleeper", "Sleepers", ["sleeper", "sleepers"], "The long sleep", "Orpheus core", "A Sleeper goes out in drugged sleep: a dose is an item used from the pack, and too many is an overdose.", {from: 2023}),
  row("spirit", "Spirits", ["spirit", "spirits"], "Bound to the work", "Orpheus pdf 20, 36", "A ghost in Orpheus' service: the tie to the living world is a Fetter-like item.", {from: 2023}),
  row("hue", "Hues", ["hue", "hues"], "The stain of the pigment", "Orpheus pdf 20, 36", "Ghosts made by the spectral drug, free of any body: near the pigment a hue loses a die.", {from: 2023}),
  row("banshee", "Banshee", ["banshee"], "The wail", "Orpheus, the Shades", "The wail is a scream the living hear with no source, and the Banshee hears riddles about deaths to come, once a night.", {from: 2023, also: ["glimpse"]}),
  row("haunter", "Haunter", ["haunter"], "Inhabit", "Orpheus, the Shades", "They live inside things (doors, lamps, machines) and work them from inside, as the Artificers do.", {from: 2023}),
  row("poltergeist", "Poltergeist", ["poltergeist"], "Helter-skelter", "Orpheus, the Shades", "They throw and break things; thrown things hit as attacks.", {from: 2023}),
  row("skinrider", "Skinrider", ["skinrider"], "Puppetry", "Orpheus, the Shades", "They ride living bodies for the scene, as the Puppeteers do.", {from: 2023}),
  row("wisp", "Wisp", ["wisp"], "Unearthly repose", "Orpheus, the Shades", "Calm and charm: social rolls gain a die.", {from: 2023, effects: [{tags: ["social"], dice: 1}]}),
  row("phantasm", "Phantasm", ["phantasm"], "Seeming real", "Shadows of the Grave pdf 16, 26", "Their illusions answer as real until touched.", {from: 2023}),
];
/** Which table a line uses, and the world setting that turns it on. */
export const SMALL_LINES = {hunter: {table: HUNTER, setting: "sigHunter", label: "Hunter"}, mummy: {table: MUMMY, setting: "sigMummy", label: "Mummy"},
  demon: {table: DEMON, setting: "sigDemon", label: "Demon"}, kueijin: {table: KUEIJIN, setting: "sigKueijin", label: "Kuei-jin"}, orpheus: {table: ORPHEUS, setting: "sigOrpheus", label: "Orpheus"}};
