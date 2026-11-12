/**
 * WoDX Chronicle 0.25.0: the signature features of each clan, bloodline, tribe and the like (the Splat Features Desk,
 * approved by Ben 2026-11-12). One table per line; the rules that read it are in scripts/signature-rules.mjs.
 *
 * Mechanics only, in our own words. Page refs: "pdf" pages unless marked printed. V20 first, then V20 Dark Ages.
 * Rows marked house: true go past what the books say (Ben's notes on the desk, or a gap the book check found).
 */

/** Vampire clans and bloodlines. match: words that name the clan in a sheet's clan field or the bloodline flag. */
export const VAMPIRE = [
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
    text: "Once a night the Malkavian may ask for a glimpse: a riddle about the next dated event, for that player only. If it comes true and they acted on it, the Storyteller may give back a Willpower point. Their derangement colours what they hear when NPCs answer them, with the true reply always shown beneath."},
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

/** Brujah causes (Ben 2026-11-12: a list to pick from, NPCs draw from it too). from/to: years the cause makes sense. */
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

export const DAY = 86400;
export const WEEK = 7 * DAY;
export const MARK_LASTS = 30 * DAY;
export const RANT_POINTS = 3;
export const OBSESSION_MAX = 5;
export const CORRUPTION_MAX = 5;

/* ---------------- Malkavian (Chronicle 0.26.0) ---------------- */

/**
 * How a Malkavian hears what NPCs tell them, by derangement (V20 pdf 69: one derangement that never goes away). The
 * true reply always shows too. match: words in the sheet's derangement field. Ben asked for many varied lines for
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
