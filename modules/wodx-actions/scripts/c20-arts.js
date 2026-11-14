/**
 * WoDX Actions: the named cantrips of the eighteen Arts (Changeling 20th pp. 197-232), in WoDX's own words, five to an
 * Art. Each: art, level, fx (what it does), lasts, type (Chimerical or Wyrd as the book has it) and an effects-card spec
 * (mage-da-effects.js helpers). Duration "TABLE:a,b,c,d,e" picks by successes (1 to 5): t a turn, m a minute, 2m to 5m,
 * h an hour, s the scene, d a day, w a week, mo a month, y a year, yd a year and a day, dec a decade; g-codes scale by
 * the caster's permanent Glamour (gt turns, gm minutes, g5m five minutes, g30m half hours, gh hours, gd days).
 * dice: a function of {willpower, glamour} and successes for attacks that roll damage dice. Pure: no Foundry calls.
 */
import { H, T, C, N, S, MV, HL, outcomesOf } from "./mage-da-effects.js";
import * as PK from "./power-keywords.js";

const A = (art, level, fx, lasts, type, spec = null, extra = {}) => ({ art, level, fx, lasts, type, spec, ...extra });

export const CANTRIPS = {
  "creeping-shadows": A("autumn", 1, "Bend shadows cast by the Realm's subject. Subtly: Intimidation 1 easier a success. To hide someone in their shadow: Stealth 1 easier a success; a hidden object is 1 harder a success to find (9 at most). Overtly: it terrifies mortals and marks them as a sorcerer.", "the scene", "Chimerical or Wyrd", T("fear", "Creeping Shadows", "scene", "one")),
  "autumn-eyes": A("autumn", 2, "Eyes that see decay: a person's health (a diagnosis with Medicine), more with more successes; or a weak point, an extra damage die a success on their next attack on it. Three successes show a curse or doom on the subject. Astute mortals spot the eyes at 8.", "the next attack, or a look", "Chimerical", N("know")),
  "the-poisoned-apple": A("autumn", 3, "Poison someone or something within arm's reach: damage equal to the successes, resisted as a poison (category 5 for mortals, 3 for the supernatural). An object poisons whoever next uses it.", "until it strikes", "Wyrd", H("harm", 1, "lethal")),
  "the-withering": A("autumn", 4, "Steal a subject's years: split successes between age (a decade each; every two cost -1 to Physical pools) and duration (none: Glamour turns; 1 scene, 2 a day, 3 Glamour days, 4 twice that, 5 thrice). Never kills by age. Permanent on mundane objects.", "by successes", "Wyrd", T("boost", "The Withering", "scene", "one")),
  "shivers": A("autumn", 5, "Make a person, place or thing a beacon for ghosts: hauntings that can cost -1 to concentration or using the thing, or stop Willpower coming back in sleep. Successes times permanent Glamour in days.", "successes x Glamour days", "Chimerical", S("summon")),
  "trick-of-the-light": A("chicanery", 1, "Anyone perceiving the subject mistakes it for something it could plausibly be, a turn a success. A turn of close attention allows Perception + Occult (8) to see through.", "a turn a success", "Chimerical", T("illusion", "Trick of the Light", {turns: 1}, "one")),
  "veiled-eyes": A("chicanery", 2, "The subject goes unnoticed (not invisible, just not worth a look); more Realms make exceptions. 1 success a turn, 2 a minute, 3 an hour, 4 a scene, 5 a day. Seekers with fae or supernatural senses resist with Perception + Kenning (8).", "by successes", "Chimerical or Wyrd", T("veil", "Veiled Eyes", "TABLE:t,m,h,s,d", "one")),
  "dream-logic": A("chicanery", 3, "The subject turns confused and suggestible: Mental and Social rolls 3 harder, and they go along with the caster's odd ideas unless Willpower (8) matches the successes; a Willpower point refuses anything shocking or deadly. 1 success a turn, 2 a minute, 3 an hour, 4 a scene, 5 a day.", "by successes", "Chimerical", T("sway", "Dream Logic", "TABLE:t,m,h,s,d", "one")),
  "veiled-mind": A("chicanery", 4, "Everyone forgets the subject (more Realms make exceptions); the caster may end it early. 1 success an hour, 2 a scene, 3 a day, 4 a week, 5 a month.", "by successes", "Chimerical or Wyrd", T("veil", "Veiled Mind", "TABLE:h,s,d,w,mo", "one")),
  "lost-in-the-mists": A("chicanery", 5, "The subject forgets who they are and believes what the caster shapes (Scene or Time adds a place or era). Perception + Kenning (9) notices; then Willpower (8) each turn, or a point for the scene, resists. 1 success an hour, 2 a scene, 3 a day, 4 a week, 5 a month.", "by successes", "Chimerical or Wyrd", T("sway", "Lost in the Mists", "TABLE:h,s,d,w,mo", "one")),
  "backward-glance": A("chronos", 1, "See the subject's past: an hour back with 1 success, a day 2, a week 3, a month 4, a year 5. Asking beyond that reach fails.", "a vision", "Chimerical", N("know")),
  "effect-and-cause": A("chronos", 2, "Anyone perceiving the subject sees cause and effect out of order: -3 dice to deal with it. Wits + Gremayre (8) shrugs it off for the scene. 1 success a turn, 2 a minute, 3 an hour, 4 a scene, 5 a day.", "by successes", "Wyrd", T("boost", "Effect and Cause", "TABLE:t,m,h,s,d", "one")),
  "set-in-stone": A("chronos", 3, "The subject stops ageing, spoiling and changing (wounds stay unhealed too), though it can still be harmed. 1 success a day, 2 a week, 3 a month, 4 a year, 5 a decade.", "by successes", "Wyrd", T("ward", "Set in Stone", "TABLE:d,w,mo,y,dec", "one")),
  "deja-vu": A("chronos", 4, "Relive the last moments: the subject loses this turn reorienting, then all its rolls are 3 easier for a turn a success. Each further use this scene is 1 harder.", "a turn a success", "Wyrd", T("fortune", "Deja Vu", {turns: 1}, "one")),
  "time-dilation": A("chronos", 5, "Push the subject through time in a moment: a week with 1 success, a month 2, a year 3, a decade 4, a century 5. It ages and wears accordingly; the world barely moves.", "an instant", "Wyrd", S("time")),
  "done-deal": A("contract", 1, "Seal a formal oath with Glamour. Whoever breaks it suffers automatic botches equal to the successes, dealt out by the Storyteller; bound to a place, there 1s to 3s cancel successes for that many scenes; bound to an object, using it fails that way and it gains that many dice against the oathbreaker.", "until kept or broken", "Chimerical", S("bind")),
  "liars-bell": A("contract", 2, "Always on with Done Deal: the caster knows who broke their oath and when; cantrips to find or reach them cost a Glamour and a difficulty point less for Glamour days.", "permanent", "Chimerical", N("sense")),
  "castigate": A("contract", 3, "When their oath breaks the caster may at once aim any cantrip the caster knows at the oathbreaker through the oath's Realm, as if they stood before them.", "the moment it breaks", "Chimerical", S("bind")),
  "casual-contract": A("contract", 4, "Done Deal now binds careless promises, idle boasts and even sarcasm.", "permanent", "Chimerical", S("bind")),
  "sanctified-words": A("contract", 5, "Done Deal's successes also buy blessings for the oathbound while they serve the oath: bonus dice a scene (1 a die), Willpower (1 a point), a token (1), Glamour (2 a point), one inspiration (2), a Bestowment (3), or three Banality gone on success (3).", "the oath", "Chimerical", T("fortune", "Sanctified Words", "scene", "one")),
  "burning-thew": A("dragonsire", 1, "Split successes: each to power adds a Strength dot (or a damage die to an object's attacks), each to time adds a round past the first.", "1 round, +1 a success", "Chimerical", T("boost", "Burning Thew", "T1", "one")),
  "confounding-coils": A("dragonsire", 2, "Attacks on the subject are 2 harder (9 at most), a round a success. Cold iron ignores it.", "a round a success", "Chimerical", T("ward", "Confounding Coils", {turns: 1}, "one")),
  "dragonscales": A("dragonsire", 3, "Damage rolls against the subject are 2 harder (9 at most), a round a success. Cold iron ignores it.", "a round a success", "Chimerical", T("ward", "Dragonscales", {turns: 1}, "one")),
  "holly-strike": A("dragonsire", 4, "A blast of fae power out to Willpower x 10 yards: the roll is the attack, and it deals lethal dice equal to Willpower + Glamour + extra successes.", "instant", "Wyrd", H("harm", 1, "lethal")),
  "tripping-the-ire": A("dragonsire", 5, "A pool of dice equal to the successes to share among attack, damage, soak and combat cantrips each round; it shrinks by one each round until gone. Once a scene per subject.", "until the pool runs out", "Chimerical", T("boost", "Tripping the Ire", {turns: 1}, "one")),
  "ensnare": A("legerdemain", 1, "The world trips the subject up: half speed and physical actions 3 harder, a turn a success.", "a turn a success", "Chimerical or Wyrd", C("hold", "immobilized", "Ensnare", {turns: 1}, "one")),
  "mooch": A("legerdemain", 2, "One object the Realm's subject holds or contains jumps to their person, unseen if it need be; the owner notices with Perception + Alertness (8), resisted.", "instant", "Chimerical or Wyrd", S("work")),
  "effigy": A("legerdemain", 3, "A working copy of something in sight (a living copy repeats one action; food has no worth). 1 success a turn, 2 a minute, 3 ten minutes, 4 an hour, 5 a scene.", "by successes", "Chimerical or Wyrd", S("make")),
  "gimmix": A("legerdemain", 4, "Move what the caster sees: one hard shove with Legerdemain + Realm as Strength (an attack if aimed), or fine control with it as Dexterity for a turn a success. A living subject resists with Strength + Athletics (8).", "a turn, or a turn a success", "Wyrd", S("work")),
  "smoke-and-mirrors": A("legerdemain", 5, "A full illusion that looks, sounds and smells real but has no weight, needing every Realm it shows; can be an extended action (a Glamour a roll). 1 success a minute, 2 an hour, 3 a scene, 4 a day, 5 a week.", "by successes", "Chimerical or Wyrd", T("illusion", "Smoke and Mirrors", "TABLE:m,h,s,d,w", "all")),
  "sparrows-and-nightingales": A("metamorphosis", 1, "Change one plausible feature of the subject (hair, sex, wood, model year). 1 success a scene, 2 a day, 3 Glamour days, 4 a month, 5 a year and a day; the caster may name a condition that ends it.", "by successes", "Chimerical or Wyrd", T("shape", "Sparrows and Nightingales", "TABLE:s,d,gd,mo,yd", "one")),
  "worms-and-giants": A("metamorphosis", 2, "Shrink or grow the subject: 3/4 or 1.5 times with 1 success, 1/2 or 2 with 2, 1/4 or 2.5 with 3, 1/8 or 3 with 4, 1/16 or 3.5 with 5. Castings stack.", "the scene", "Wyrd", T("shape", "Worms and Giants", "scene", "one")),
  "thousandskins": A("metamorphosis", 3, "Turn the subject into an animal, keeping its own mind (speech only to those who see chimera). Split successes: time (none: Glamour turns; 1 a scene, 2 a day, 3 Glamour days, 4 twice, 5 thrice) and reach (same size and no gifts at none, up to any beast at 5).", "by successes", "Wyrd", T("shape", "Thousandskins", "scene", "one")),
  "beastskin": A("metamorphosis", 4, "Give the subject animal parts, one a success (claws, wings, a pig's face), or spend successes on time (none: Glamour turns; 1 a scene, 2 a day, 3 Glamour days, 4 twice, 5 thrice); a condition may end it.", "by successes", "Wyrd", T("shape", "Beastskin", "scene", "one")),
  "chimeric-exultation": A("metamorphosis", 5, "Turn the subject into a beast of legend, one fantastic ability a success (flight, great strength, fire breath). Lasts Glamour minutes, renewed for a Glamour point each time.", "Glamour minutes", "Wyrd", T("shape", "Chimeric Exultation", "TABLE:gm,gm,gm,gm,gm", "one")),
  "between-the-lines": A("naming", 1, "Understand any language, code or riddle from the Realm's source; each success is also a die for the scene on contested rolls to find the truth or see through lies.", "the scene", "Chimerical", T("boost", "Between the Lines", "scene", "self")),
  "nickname": A("naming", 2, "A name sticks: people call the subject by it and things live down to it (a clunker stalls). A person regains Willpower only by living up to it. 1 success a scene, 2 a day, 3 a week, 4 a month, 5 a year.", "by successes", "Wyrd", T("sway", "Nickname", "TABLE:s,d,w,mo,y", "one")),
  "saining": A("naming", 3, "An extended roll, with the subject or something of theirs at hand, to the subject's Willpower x 3 successes: their True Name. With it, their cantrips and magical contests against them are 5 easier.", "for good", "Wyrd", N("know")),
  "runic-imprint": A("naming", 4, "Draw a rune (an extended roll, a Glamour each roll): split successes between Attribute dots added or taken and time (1 a minute, 2 a scene, 3 a day, 4 a week, 5 a month).", "by successes", "Wyrd", T("boost", "Runic Imprint", "TABLE:m,s,d,w,mo", "one")),
  "reweaving": A("naming", 5, "Rewrite a True Name (an extended roll, a Glamour and a Willpower each roll): split successes between how deep the change goes (a habit at 1 up to the very traits at 5) and time (1 a day, 2 a week, 3 a month, 4 a year, 5 for good).", "by successes", "Wyrd", S("make")),
  "dream-walk": A("oneiromancy", 1, "Step bodily into a sleeper's dream (seen the first time; a Willpower point links them for later). Safe from physical harm there, not chimerical; the sleeper remembers. The other Oneiromancy cantrips start here.", "until the caster leaves or they wake", "Wyrd", S("sideways")),
  "dream-craft": A("oneiromancy", 2, "Inside a dream, shape it around a trigger: a good dream gives a Willpower point and two dice in scenes with the trigger; a nightmare takes a Willpower point and two dice. A day a success.", "a day a success", "Chimerical", T("fortune", "Dream Craft", {days: 1}, "one")),
  "dream-portal": A("oneiromancy", 3, "Use the dream as a doorway to the sleeper's place, carrying an adult's bulk a success (extended, a Glamour each extra roll).", "the crossing", "Wyrd", S("sideways")),
  "manifest": A("oneiromancy", 4, "Draw a thing from the dream into chimerical life: voile at 1 success up to a master chimera at 5. It fades when the dreamer sleeps again unless fed a Glamour a day; for a Willpower point it is real for a scene.", "until the dreamer sleeps", "Chimerical or Wyrd", S("manifest")),
  "dream-puppet": A("oneiromancy", 5, "For a Willpower point, wear a sleeper's body (their Physical traits, their mind and skills) while they dream it. They wake from strong stimulus at 1 success, bashing at 2, lethal at 3, aggravated at 4, only by resisting at 5 (Perception + Kenning 8, then Willpower 8).", "until they wake", "Wyrd", S("possess")),
  "willow-whisper": A("primal", 1, "Whisper with a plant, beast, stone or object and hear it whisper back; a question a success. Never cold iron.", "a question a success", "Chimerical", S("speak")),
  "eldritch-prime": A("primal", 2, "Call an element where the Realm points: a glass of water or a torch at 1 success, half an hour of rain or a bonfire at 3, car-flipping stones or a small inferno at 5. Set on a person, fire does damage equal to the successes.", "as it lasts", "Wyrd", S("weather")),
  "oakenshield": A("primal", 3, "A temporary extra Bruised health level a success, marked first and vanishing when struck, until the scene ends. A new casting replaces the old.", "the scene", "Wyrd", T("ward", "Oakenshield", "scene", "one")),
  "elder-form": A("primal", 4, "Make the subject an element: air (invisible, floats), earth (soaks lethal, +3 soak, half speed, dodge 1 harder), water (+1 Dexterity, slips bonds, breathes water), wood (rooted, Dexterity and Stamina rolls 1 easier, heals), fire (an aggravated level a turn to what it touches, immune to fire). 1 success Glamour turns, 2 Glamour minutes, 3 five minutes a Glamour, 4 half an hour a Glamour, 5 an hour a Glamour.", "by successes", "Wyrd", T("shape", "Elder-Form", "TABLE:gt,gm,g5m,g30m,gh", "one")),
  "dance-of-the-five-kings": A("primal", 5, "Command elements already present: against a person, a lethal or bashing level a success, or their next action 1 harder a success; or reshape them into things.", "instant", "Wyrd", H("harm", 1, "lethal")),
  "kindle": A("pyretics", 1, "Heat without harm: food cooks, metal gets too hot to hold, a person sweats; a person's rolls are 1 harder for a turn a success.", "a turn a success", "Wyrd", T("boost", "Kindle", {turns: 1}, "one")),
  "illuminate": A("pyretics", 2, "A revealing light: illusions and disguises weaker than the successes show through, and lies or hiding in it lose a die a success.", "the scene", "Wyrd or Chimerical", T("sight", "Illuminate", "scene", "self")),
  "purify": A("pyretics", 3, "Burn out poison, disease, rot or a curse (Fae Realm for cantrips); if the successes do not match its strength it comes back after the scene.", "for good, or the scene", "Wyrd", HL(1, {who: "one"})),
  "engulf": A("pyretics", 4, "Set the subject alight for a turn a success: an aggravated level a turn, or a protective wreath that burns whoever touches it. Fire it spreads burns on as normal fire.", "a turn a success", "Wyrd", H("harm", 1, "aggravated", {fixed: true})),
  "phoenix-song": A("pyretics", 5, "If the subject dies or is destroyed this scene, it burns and rises whole with everything restored: after a day at 1 success, a scene at 2, an hour at 3, a minute at 4, a turn at 5.", "the scene", "Wyrd", T("ward", "Phoenix Song", "scene", "one")),
  "howling-gale": A("skycraft", 1, "A wind at someone's back doubles their speed per two successes, or against them halves it, for Glamour minutes; or drives an object at Glamour miles an hour for five minutes a success; or blows as the caster wills.", "Glamour minutes", "Wyrd", T("hasten", "Howling Gale", "TABLE:gm,gm,gm,gm,gm", "one")),
  "electric-gremlins": A("skycraft", 2, "Gremlins wreck complex electronics around the subject. 1 success a scene, 2 a day, 3 Glamour days, 4 twice, 5 thrice.", "by successes", "Chimerical", S("work")),
  "hurricane-speed": A("skycraft", 3, "A person gains Initiative +1 a success and Dexterity +1 per two; an object halves its weight and doubles its throw a success. Glamour rounds.", "Glamour rounds", "Wyrd", T("hasten", "Hurricane Speed", "TABLE:gt,gt,gt,gt,gt", "one")),
  "storm-shroud": A("skycraft", 4, "A crackling aura: anyone touching or touched by the subject takes three bashing dice; the caster is immune. A round a success.", "a round a success", "Wyrd", T("ward", "Storm Shroud", {turns: 1}, "one")),
  "lord-of-levin": A("skycraft", 5, "Lightning from an open sky (or their fingers under Storm Shroud): the roll is the attack, five aggravated dice plus one an extra success, and -2 to the target's pools to the end of next turn.", "instant", "Wyrd", H("harm", 1, "aggravated", {also: null})),
  "omen": A("soothsay", 1, "A vague glimpse of the subject's thread: an immediate plan at 1 success, demeanour or Court at 2, a long goal at 3, inner nature at 4, a guarded secret at 5. Each recasting on them this story costs a Glamour more.", "a glimpse", "Chimerical", N("know")),
  "seers-wisp": A("soothsay", 2, "A light that leads them to a named person, place or thing; more successes, a straighter and safer road. Glamour hours; once a story for each quarry.", "Glamour hours", "Chimerical", N("sense")),
  "tattletale": A("soothsay", 3, "Make someone or something a focus the caster can scry through at will (a reflection shows its surroundings), and use sight cantrips through it. A day a success.", "a day a success", "Chimerical", T("sight", "Tattletale", {days: 1}, "self")),
  "augury": A("soothsay", 4, "One clue, sign or omen a success toward a wished-for future (a second Realm when it is for someone else). Once a story for each wish.", "a reading", "Chimerical", N("know")),
  "fate-fire": A("soothsay", 5, "Bless or curse with fate: at a telling moment this story the Storyteller adds (or takes) an automatic success for each success, and every roll for the rest of that scene gets +1 (or -1) success. One at a time on a subject.", "this story", "Chimerical", T("fortune", "Fate Fire", "scene", "one")),
  "protocol": A("sovereign", 1, "Those in the Realm are bound by fae etiquette: whoever breaks it loses a die a success for the scene. A changeling of higher rank ignores it for a Willpower point.", "the scene", "Wyrd", T("sway", "Protocol", "scene", "each")),
  "grandeur": A("sovereign", 2, "The caster seems a ruler: their social rolls with them gain automatic successes equal to theirs, and they must spend Willpower to defy or attack them. Ends if the caster is shamed in public.", "the scene", "Wyrd", T("sway", "Grandeur", "scene", "each")),
  "guest-list": A("sovereign", 3, "No one may enter, use or touch the subject without their leave or a password; a supernatural subject resists with Willpower (8), a point a roll. 1 success an hour, 2 a scene, 3 a day, 4 a week, 5 a month; a year unbroken makes it last.", "by successes", "Wyrd", T("ward", "Guest List", "TABLE:h,s,d,w,mo", "one")),
  "dictum": A("sovereign", 4, "A short spoken order the subject must carry out; Willpower (9) resists one that shocks the conscience or means harm, and the supernatural may delay a turn for a Willpower point.", "until done", "Wyrd", T("sway", "Dictum", "scene", "one")),
  "geas": A("sovereign", 5, "A spoken quest or ban with a curse for failing it, priced in extra Willpower or Glamour: 3 minor, 5 moderate, 7 severe, 10 daunting, a permanent dot legendary. It cannot demand the impossible, self-harm, or harm to loved ones.", "until fulfilled", "Wyrd", S("bind")),
  "awaken": A("spring", 1, "Rouse something dormant: a dead car turns over with 1 success, a barren field greens; five can break Winter's Stasis.", "as fits", "Chimerical or Wyrd", S("work")),
  "verdant-reclamation": A("spring", 2, "Plants burst over the subject for the scene: a machine is useless until cleared, and a living being cannot act physically until Strength + Athletics beats the successes.", "the scene", "Wyrd", C("hold", "immobilized", "Verdant Reclamation", "scene", "one")),
  "well-of-life": A("spring", 3, "The subject heals all near it: a bashing or lethal level a scene nearby, one a turn by touch, and eating it heals all bashing and lethal and an aggravated level. 1 success a minute, 2 an hour, 3 a scene, 4 a day, 5 a week.", "by successes", "Wyrd", HL(1, {who: "one"})),
  "faerie-ring": A("spring", 4, "A ring of natural things: those the caster lets in are hidden and harder to find or harm by 1 a success until sunrise; whoever breaks in is cursed until the full moon (a rash at 1 success up to losing all powers at 5).", "until sunrise", "Wyrd", T("ward", "Faerie Ring", "night", "self")),
  "renewal": A("spring", 5, "For a Willpower point, bring something dead or spent back in its prime, a scene a success but never past sunrise; once a lunar month for each subject.", "a scene a success", "Wyrd", S("rise")),
  "flicker-flies": A("summer", 1, "Motes of fae light, bright as a torch, that stir an emotion of their choosing: rolls that play on it are 1 easier. The scene.", "the scene", "Chimerical", T("light", "Flicker-Flies", "scene", "self")),
  "enkindle": A("summer", 2, "Whatever the subject feels flares to extremes (annoyance to fury, joy to rapture). A minute a success on the living, an hour a success on things.", "a minute a success", "Chimerical", T("sway", "Enkindle", "TABLE:m,2m,3m,4m,5m", "one")),
  "aphrodisia": A("summer", 3, "The subject becomes fascinating and desired by everyone whose Willpower is below the successes, though no one is forced against their nature. The scene.", "the scene", "Chimerical", T("sway", "Aphrodisia", "scene", "all")),
  "vestas-blessing": A("summer", 4, "Hallow a camp or shelter until sunrise: the caster knows when the uninvited come near, and guests who stay the night regain extra Glamour and Willpower (one Glamour at 1 success up to all of both at 5).", "until sunrise", "Wyrd", T("ward", "Vesta's Blessing", "night", "self")),
  "the-beltane-blade": A("summer", 5, "Banality inside the subject bursts into flame: lethal damage, rolled at the target's Banality as difficulty; with five successes it is aggravated and every two burn off a Banality point.", "instant", "Wyrd", H("harm", 1, "lethal")),
  "hopscotch": A("wayfare", 1, "A huge leap that always lands softly: a storey up or 30 feet at 1 success, two or 60 at 2, five or 150 at 3, ten or 300 at 4, as far as the eye sees at 5. Objects jump as the caster wills (Strength + Athletics 7 to hold them).", "one leap", "Wyrd", MV()),
  "quicksilver": A("wayfare", 2, "Each success is an extra action or doubled speed on the next turn; a hurled thing gets the successes as extra damage dice.", "the next turn", "Wyrd", T("hasten", "Quicksilver", "T1", "one")),
  "portal-passage": A("wayfare", 3, "A door through anything up to 10 feet thick, or into the Dreaming, for a minute a success; Actor or Fae doors open only for those named.", "a minute a success", "Wyrd", S("place")),
  "wind-runner": A("wayfare", 4, "The subject flies, passengers and all. 1 success Glamour turns, 2 Glamour minutes, 3 five minutes a Glamour, 4 half an hour a Glamour, 5 an hour a Glamour. No soft landing if it ends aloft.", "by successes", "Wyrd", T("rise", "Wind Runner", "TABLE:gt,gm,g5m,g30m,gh", "one")),
  "flicker-flash": A("wayfare", 5, "Vanish and reappear somewhere known, seen or held a piece of, in the same world, after (5 - successes) turns.", "5 - successes turns", "Wyrd", S("place")),
  "chill": A("winter", 1, "Deep cold without wounds: a warm-blooded subject's rolls are 1 harder for a turn a success; plants die, metal burns to touch.", "a turn a success", "Wyrd", T("boost", "Chill", {turns: 1}, "one")),
  "hardened-heart": A("winter", 2, "The subject feels nothing: immune to mundane and supernatural sway, but cannot spend Willpower. 1 success a scene, 2 a minute, 3 an hour, 4 a scene, 5 a day.", "by successes", "Chimerical", T("ward", "Hardened Heart", "TABLE:s,m,h,s,d", "one")),
  "terror-of-the-long-night": A("winter", 3, "Overwhelming dread for the scene: a Willpower point to do anything but flee, hide or cower. The supernatural may spend a point and roll Willpower (8) against the successes.", "the scene", "Chimerical", C("fear", "frenzy", "Terror of the Long Night", "scene", "one")),
  "sculpt": A("winter", 4, "Ice formed in sight, a cubic foot a turn, unmelting by mundane heat; works like the real thing if it has no moving parts. 1 success a turn, 2 a minute, 3 an hour, 4 a scene, 5 a day.", "by successes", "Wyrd", S("make")),
  "stasis": A("winter", 5, "Freeze the subject in time, inert and unharmed (the supernatural resist with a Willpower point and Stamina 9); thawing takes five successes for each of theirs. 1 success a scene, 2 a day, 3 a week, 4 a month, 5 a year.", "by successes", "Wyrd", C("hold", "immobilized", "Stasis", "TABLE:s,d,w,mo,y", "one")),
};
/** Names as the book prints them (the C20 keyword list, power-keywords.js), and the two it lacks. */
const NAMES = { ...Object.fromEntries(Object.entries(PK.LINE_KEYWORDS.c20).map(([k, v]) => [k, v.n])), "deja-vu": "Deja Vu", purify: "Purify" };
for ( const [id, c] of Object.entries(CANTRIPS) ) c.name = NAMES[id] ?? id;
// Holly-Strike and Lord of Levin roll damage dice (pp. 207, 221)
CANTRIPS["holly-strike"].dice = (c, s) => Math.max(0, (c.willpower || 0) + (c.glamour || 0) + Math.max(0, s - 1));
CANTRIPS["lord-of-levin"].dice = (c, s) => 5 + Math.max(0, s - 1);

/** The cantrips of an Art at or below a level, in order. */
export const cantripsOf = (art, upTo = 5) => Object.entries(CANTRIPS).filter(([, c]) => c.art === art && c.level <= upTo).map(([id, c]) => ({ id, ...c }));

const CODE = { t: { rounds: 1 }, m: 60, "2m": 120, "3m": 180, "4m": 240, "5m": 300, "10m": 600, h: 3600, s: "scene", d: 86400, w: 7 * 86400, mo: 30 * 86400, "6mo": 182 * 86400,
    y: 365 * 86400, yd: 366 * 86400, dec: 3650 * 86400 };
const LABEL = { t: "a turn", m: "a minute", "2m": "two minutes", "3m": "three minutes", "4m": "four minutes", "5m": "five minutes", "10m": "ten minutes", h: "an hour",
    s: "the scene", d: "a day", w: "a week", mo: "a month", "6mo": "six months", y: "a year", yd: "a year and a day", dec: "a decade" };
/** A table duration for these successes and this Glamour: {label, timed}. */
export function tableLasts(lasts, successes, glamour = 1) {
    const codes = String(lasts).replace(/^TABLE:/, "").split(",");
    const c = codes[Math.max(1, Math.min(5, successes)) - 1];
    const g = Math.max(1, Number(glamour) || 1);
    const G = { gt: [g, "turn", 0], gm: [g * 60, "minute", 60], g5m: [g * 300, "minute", 60], g30m: [g * 1800, "minute", 60], gh: [g * 3600, "hour", 3600], gd: [g * 86400, "day", 86400] }[c];
    if (G) {
        if (c === "gt") return { label: `${g} turn${g === 1 ? "" : "s"}`, timed: { kind: "rounds", rounds: g } };
        const k = G[0] / G[2];
        return { label: `${k} ${G[1]}${k === 1 ? "" : "s"}`, timed: { kind: "time", seconds: G[0] } };
    }
    const v = CODE[c];
    if (v === "scene" || v === undefined) return { label: "the scene", timed: { kind: "scene" } };
    if (v.rounds) return { label: "a turn", timed: { kind: "rounds", rounds: 1 } };
    return { label: LABEL[c], timed: { kind: "time", seconds: v } };
}

/**
 * What a cast cantrip puts on the effects card: [{key, who, ask?, st?, out}]. ctx: {willpower, glamour} of the caster.
 */
export function cantripResults(id, successes, ctx = {}, { name = "", source = "" } = {}) {
    const c = CANTRIPS[id];
    const s = Number(successes) || 0;
    if (!c || s < 1) return [];
    if (c.dice) {
        const dice = c.dice(ctx, s), type = c.spec?.type ?? "lethal";
        return [{ key: "harm", who: "one", ask: false, out: { key: "harm", label: name, source, kind: "damage", levels: dice, pool: dice, type, soak: true,
            text: `${dice} ${type} damage dice, soaked as usual` } }];
    }
    if (!c.spec) return [];
    const base = { key: c.spec.kw, label: name, source };
    const table = typeof c.spec.lasts === "string" && c.spec.lasts.startsWith("TABLE:");
    const fixed = c.spec.lasts === "T1" ? { ...c.spec, lasts: "scene" } : table ? { ...c.spec, lasts: "scene" } : c.spec;
    const res = outcomesOf(fixed, base, s, c.fx);
    if (!table && c.spec.lasts !== "T1") return res;
    const d = table ? tableLasts(c.spec.lasts, s, ctx.glamour) : { label: "a turn", timed: { kind: "rounds", rounds: 1 } };
    return res.map(r => r.out?.timed ? { ...r, out: { ...r.out, timed: d.timed, duration: d.label, text: r.out.kind === "timed" ? `${s} success${s === 1 ? "" : "es"} for ${d.label}: ${c.fx}` : `${r.out.name}, for ${d.label}: ${c.fx}` } } : r);
}
