/**
 * WoDX Creation 0.11.0: lifepaths, the turn into each line and the first years after. WoDX's own words.
 *
 * Each line has three pools. "turning": how it happened (some only in certain years). "after": the first teacher or
 * keeper, whose choice sets a flag (strict, kind, alone and so on). "after2": what followed, drawn with weights that
 * those flags raise or rule out. This is the shape of Princes of Darkness's education chain: a style chosen first,
 * then scenes that grow out of it.
 *
 * Era rules followed: Sabbat and Camarilla from 1493 (the Convention of Thorns), the Anarch Revolt before it; the
 * Council of Nine from 1466 and the Technocratic Union from 1897 (the Order of Reason before); hunters are
 * inquisitors before 1500, Hunters Hunted to 1998, imbued from 1999; the Fallen from 1999; Amenti from 1999 (older
 * mummies before); the Sidhe gone from about 1400 to the Resurgence of 1969. See docs/PENDING-REVIEW.md.
 */
const o = (label, g = "", x = {}) => ({label, g, ...x});
const ev = (id, stage, title, text, options, x = {}) => ({id, stage, title, text, options, ...x});
const L = (lines, x = {}) => ({...x, lines: [].concat(lines)});
const S = (...spans) => spans;

/* ------------------------------------------------------------------ */
/*  Vampire                                                            */
/* ------------------------------------------------------------------ */
const VAMPIRE = [
  ev("v.turn.talent", "turning", "Chosen", "A Kindred watched you for months and wanted what you could do.", [
    o("For your art or beauty", "bg Fame|ab Expression", {f: "emb:chosen", p: "your sire|who chose you for a gift"}),
    o("For your mind", "ab Academics|ab Investigation", {f: "emb:chosen", p: "your sire|who wanted a clever servant"}),
    o("For your strength or skill at arms", "ab Melee|ab Brawl", {f: "emb:chosen", p: "your sire|who needed a soldier"})
  ], {when: L("vampire")}),
  ev("v.turn.hunger", "turning", "An accident of hunger", "A vampire fed too long, and then panicked, and gave you blood.", [
    o("Your sire stayed", "flaw Clan Enmity|bg Mentor", {f: "emb:accident", p: "your sire|who never wanted a childe"}),
    o("Your sire fled", "ab Survival|flaw Hunted", {f: ["emb:accident", "emb:abandoned"], text: "You woke alone, starving, in a cellar."}),
    o("Another vampire found you first", "bg Allies", {f: "emb:accident", p: "the vampire who found you|and kept the secret"})
  ], {when: L("vampire")}),
  ev("v.turn.pawn", "turning", "A move in someone else's game", "Your sire needed another vote, another blade, or another insult to a rival.", [
    o("You were the insult", "flaw Enemy", {f: "emb:pawn", p: "your sire's rival|who would see you destroyed"}),
    o("You were the vote", "bg Status|flaw Dark Secret", {f: "emb:pawn"}),
    o("You were the blade", "ab Melee|ab Stealth", {f: "emb:pawn"})
  ], {when: L("vampire")}),
  ev("v.turn.secret", "turning", "Without leave", "Your sire Embraced you without the prince's leave, or the lord's.", [
    o("Hidden for years", "ab Stealth|flaw Hunted", {f: "emb:secret"}),
    o("Confessed and pardoned, at a price", "note A boon owed", {f: "emb:secret", p: "the prince|who pardoned you and wants it remembered"}),
    o("Your sire was punished for it", "flaw Enemy", {f: ["emb:secret", "emb:abandoned"]})
  ], {when: L("vampire")}),
  ev("v.turn.plague", "turning", "In the plague cart", "Among the dying no one counts the bodies. One of them was you.", [
    o("Pulled out by a Kindred", "note Hardy against disease|ab Medicine", {f: "emb:accident"}),
    o("Chosen as the last of a family", "flaw Nightmares", {f: "emb:chosen"})
  ], {when: L("vampire", {spans: S([1348, 1352], [1380, 1381], [1679, 1681], [1713, 1715])}), w: 30}),
  ev("v.turn.battle", "turning", "On the battlefield", "You lay dying in the mud and something knelt beside you.", [
    o("A warlord's childe", "ab Melee|ab Leadership|bg Allies", {f: "emb:chosen", p: "your sire|a captain among the dead"}),
    o("Taken as a meal and kept", "ab Survival|flaw Nightmares", {f: "emb:accident"})
  ], {when: L("vampire", {spans: S([1241, 1241], [1278, 1278], [1419, 1434], [1618, 1648], [1805, 1805], [1866, 1866], [1914, 1918], [1939, 1945])}), w: 30}),
  ev("v.turn.mass", "turning", "A shovelhead", "Struck on the head, drained, buried in a pit with a dozen others, and told to dig.", [
    o("You dug", "ab Brawl|merit Tough", {f: "emb:sabbat", p: "a packmate|who clawed out of the earth beside you"}),
    o("You helped others dig", "ab Leadership|bg Allies", {f: "emb:sabbat"})
  ], {when: L("vampire", {spans: S([1500, 2300])}), w: 6}),
  ev("v.turn.anarch", "turning", "For the revolt", "The young were rising against their elders, and needed numbers.", [
    o("Made to fight", "ab Brawl|ab Melee", {f: "emb:anarch", p: "an anarch leader|who Embraced you for the cause"}),
    o("Made to spy", "ab Subterfuge|ab Stealth", {f: "emb:anarch"})
  ], {when: L("vampire", {spans: S([1381, 1493], [1944, 1944], [1990, 2300])}), w: 15}),
  ev("v.turn.data", "turning", "For your access", "A Kindred wanted your passwords, your clearances and your face on the corporate cameras.", [
    o("Embraced for a corp", "ab Computer|bg Resources", {f: "emb:pawn", p: "your sire|a corporate fixer with a blood habit"}),
    o("Embraced in a stack", "ab Streetwise|ab Technology", {f: "emb:accident"})
  ], {when: L("vampire", {spans: S([2023, 2300])}), w: 25}),
  ev("v.after.teach", "after", "The first lessons", "Your sire decides how you will learn the Requiem's rules: feeding, hiding, the clans, the Beast.", [
    o("A hard schooling", "ab Etiquette|merit Iron Will", {f: "ed:strict", text: "Obedience first, and the stick for mistakes."}),
    o("Kept close, with some liberty", "ab Empathy|bg Mentor", {f: "ed:kind"}),
    o("Left to learn alone", "ab Survival|ab Streetwise", {f: "ed:alone"})
  ], {when: L("vampire", {not: ["emb:abandoned"]})}),
  ev("v.after.alone", "after", "Alone in the dark", "No one comes to teach you. You learn by hunger and luck.", [
    o("Another clan takes you in", "bg Mentor|flaw Clan Enmity", {f: "ed:kind", p: "a Kindred of another clan|who taught you the basics for a price"}),
    o("You teach yourself", "ab Survival|merit Iron Will", {f: "ed:alone"}),
    o("Kine notice", "flaw Hunted", {f: "ed:alone"})
  ], {when: L("vampire", {flags: ["emb:abandoned"]}), w: 50}),
  ev("v.after2.stick", "after2", "The stick", "You complained once about how your sire treats you. You learned not to.", [
    o("Endure", "merit Iron Will|note Blood bound", {f: "out:obedient"}),
    o("Defy, and pay", "flaw Enemy", {f: "out:rebel"})
  ], {when: L("vampire"), more: {"ed:strict": 4, "ed:kind": 0.5, "ed:alone": 0}}),
  ev("v.after2.ties", "after2", "Mortal ties", "Your family, your friends, your lover. You cannot let them go.", [
    o("Your sire covers for you", "bg Allies", {p: "a mortal you still visit|who thinks you are ill"}),
    o("You end it yourself", "merit Iron Will|flaw Nightmares"),
    o("Your sire ends it", "flaw Enemy", {f: "out:rebel"})
  ], {when: L("vampire")}),
  ev("v.after2.court", "after2", "Presented at court", "Your sire brings you before the prince, the lord or the bishop of the city's dead.", [
    o("A good impression", "bg Status|ab Etiquette", {f: "out:courtier"}),
    o("A gaffe", "flaw Enemy", {p: "a harpy|who still tells the story"}),
    o("You catch an elder's eye", "bg Mentor", {p: "an elder|who has plans for you"})
  ], {when: L("vampire", {not: ["emb:sabbat"]}), more: {"ed:kind": 2, "ed:strict": 1.5, "ed:alone": 0.3}}),
  ev("v.after2.rebels", "after2", "Tempted by the rebels", "The young who hate their elders want you to join them.", [
    o("Join them", "bg Allies|flaw Hunted", {f: "out:rebel", p: "an anarch|who swore you in"}),
    o("Report them", "bg Status|flaw Enemy"),
    o("Listen, and wait", "ab Politics")
  ], {when: L("vampire", {spans: S([1381, 1493], [1700, 2300])}), more: {"ed:alone": 3, "ed:strict": 1.5, "emb:anarch": 3}}),
  ev("v.after2.pack", "after2", "The pack", "Your packmates are all the family you have now.", [
    o("The Vaulderie binds you", "bg Allies|note Vinculum ties to the pack", {f: "out:sabbat"}),
    o("You lead the war party", "ab Leadership|ab Brawl"),
    o("You want out", "flaw Hunted", {f: "out:rebel"})
  ], {when: L("vampire", {flags: ["emb:sabbat"]}), w: 50}),
  ev("v.after2.road", "after2", "The Road or the Path", "Your sire speaks of how a Kindred keeps the Beast at bay.", [
    o("Humanity, held close", "note Road or Path: Humanity|ab Empathy"),
    o("Your sire's own Road", "note Road or Path: your sire's", {f: "out:obedient"}),
    o("You find another way", "note Road or Path: one you choose|ab Occult", {f: "out:rebel"})
  ], {when: L("vampire")}),
  ev("v.after2.gold", "after2", "Tempted by gold", "Eternity is a long time to be poor.", [
    o("Investments", "bg Resources|ab Finance"),
    o("A herd that pays", "bg Herd|bg Resources"),
    o("You lose it all", "note In debt")
  ], {when: L("vampire")}),
  ev("v.after2.hunter", "after2", "Someone noticed", "A priest, a policeman or a corporate security officer found a body you left.", [
    o("You fixed it", "ab Subterfuge|bg Contacts"),
    o("You ran", "flaw Hunted", {p: "the one hunting you|who has not stopped"})
  ], {when: L("vampire"), more: {"ed:alone": 2}}),
  ev("v.after2.done", "after2", "Released", "Your sire says the teaching is over. You are no longer a fledgling, but still a childe.", [
    o("Gratitude", "bg Mentor"),
    o("Resentment", "flaw Enemy"),
    o("Indifference", "merit Iron Will")
  ], {when: L("vampire"), w: 6})
];

/* ------------------------------------------------------------------ */
/*  Ghoul                                                              */
/* ------------------------------------------------------------------ */
const GHOUL = [
  ev("g.turn.servant", "turning", "Taken into service", "A household of the night needed a pair of hands by day.", [
    o("A steward of the house", "ab Bureaucracy|bg Resources", {p: "your domitor|who trusts you with the keys"}),
    o("A bodyguard", "ab Brawl|ab Melee", {p: "your domitor|who sleeps behind your door"}),
    o("A spy", "ab Subterfuge|ab Stealth", {p: "your domitor|who never asks where you heard it"})
  ], {when: L("ghoul")}),
  ev("g.turn.bargain", "turning", "A bargain", "You were dying, or someone you loved was, and the blood was offered.", [
    o("For your own life", "merit Tough|flaw Addiction", {p: "your domitor|who saved you and owns you"}),
    o("For a loved one's", "note Someone depends on you", {p: "the one you bargained for|who does not know what it cost"})
  ], {when: L("ghoul")}),
  ev("g.turn.family", "turning", "The family's trade", "Your parents served the same master, and theirs before them.", [
    o("Proud of it", "bg Status|ab Etiquette"),
    o("Ashamed of it", "flaw Dark Secret")
  ], {when: L("ghoul")}),
  ev("g.after.keeper", "after", "The domitor's hand", "How your master keeps you.", [
    o("Kindly, as a pet", "bg Mentor", {f: "gk:kind"}),
    o("Coldly, as a tool", "merit Iron Will", {f: "gk:cold"}),
    o("Barely at all", "ab Survival", {f: "gk:distant"})
  ], {when: L("ghoul")}),
  ev("g.after2.craving", "after2", "Going without", "The master was away three weeks. You learned what the craving is.", [
    o("You held on", "merit Iron Will"),
    o("You found another vampire", "flaw Enemy", {p: "a second vampire|who fed you once"})
  ], {when: L("ghoul"), more: {"gk:distant": 4}}),
  ev("g.after2.bond", "after2", "The third drink", "On the third night, you loved your master. You still do.", [
    o("Bound fully", "note Blood bound|bg Mentor"),
    o("You resisted", "merit Iron Will|flaw Hunted")
  ], {when: L("ghoul"), more: {"gk:kind": 2, "gk:cold": 2, "gk:distant": 0.3}}),
  ev("g.after2.notice", "after2", "Your family notices", "You stopped ageing, and you are strong in ways you were not.", [
    o("You lie to them", "ab Subterfuge", {p: "a relative|who suspects"}),
    o("You leave them", "merit Iron Will"),
    o("You bring one into service", "bg Retainers")
  ], {when: L("ghoul")}),
  ev("g.after2.rival", "after2", "Another master's interest", "A rival of your domitor offers more.", [
    o("Refuse", "bg Status"),
    o("Spy for them", "flaw Dark Secret|bg Contacts", {p: "the rival|who pays you for secrets"})
  ], {when: L("ghoul"), more: {"gk:cold": 3}})
];

/* ------------------------------------------------------------------ */
/*  Revenant                                                           */
/* ------------------------------------------------------------------ */
const REVENANT = [
  ev("r.turn.shows", "turning", "The blood wakes", "In your teens the family's blood showed itself: a strength, a sight, a stillness of age.", [
    o("Proud of it", "bg Status|ab Occult", {f: "rv:proud"}),
    o("Horrified", "flaw Nightmares", {f: "rv:horror"}),
    o("Hungry for more", "flaw Addiction", {f: "rv:hungry"})
  ], {when: L("revenant")}),
  ev("r.turn.task", "turning", "The first task", "The family's elders set a task to see what you are worth.", [
    o("Fetch a vessel for the master", "ab Stealth|flaw Dark Secret"),
    o("Guard the house through winter", "ab Alertness|merit Tough"),
    o("Bring back a debt", "ab Intimidation|bg Contacts")
  ], {when: L("revenant")}),
  ev("r.after.raised", "after", "Raised by the family", "Who shaped you.", [
    o("A grandparent of the old blood", "bg Mentor", {f: "rv:kind", p: "a grandparent|centuries old and sharp still"}),
    o("Cousins who were rivals", "flaw Enemy", {f: "rv:rival", p: "a cousin|who wants your place"}),
    o("The master itself", "note Blood bound", {f: "rv:master"})
  ], {when: L("revenant")}),
  ev("r.after2.outsider", "after2", "An outsider learns", "Someone outside the family saw what you are.", [
    o("You silenced them", "flaw Dark Secret"),
    o("You befriended them", "bg Allies", {p: "the outsider|who keeps your secret"})
  ], {when: L("revenant")}),
  ev("r.after2.flee", "after2", "The way out", "You thought about running from the family.", [
    o("You ran", "flaw Hunted", {f: "out:rebel"}),
    o("You stayed", "bg Status")
  ], {when: L("revenant"), more: {"rv:horror": 3, "rv:rival": 2}})
];

/* ------------------------------------------------------------------ */
/*  Werewolf and the other Changing Breeds                             */
/* ------------------------------------------------------------------ */
const WEREWOLF = [
  ev("w.turn.fight", "turning", "In a fight", "Someone hurt you once too often, and your body answered.", [
    o("You killed them", "flaw Nightmares|ab Brawl", {f: "fc:blood"}),
    o("You fled into the woods", "ab Survival|ab Athletics"),
    o("A Garou pulled you off them", "bg Mentor", {p: "the Garou who found you|and pulled you off your tormentor"})
  ], {when: L("werewolf")}),
  ev("w.turn.moon", "turning", "Under the moon", "You had dreamed of running for years. One night you did.", [
    o("You woke among wolves", "ab Animal Ken|ab Survival"),
    o("You woke in a cage", "flaw Hunted", {p: "the one who caged you|and wanted to study you"}),
    o("You woke at a caern", "bg Rites", {p: "a Theurge|who had seen you coming in a dream"})
  ], {when: L("werewolf")}),
  ev("w.turn.kin", "turning", "Raised as Kin", "Your family knew what you might be and watched you.", [
    o("They were proud", "bg Kinfolk|bg Pure Breed", {p: "a Kinfolk parent|who had prayed for this"}),
    o("They were afraid", "bg Kinfolk|flaw Dark Secret")
  ], {when: L("werewolf")}),
  ev("w.turn.lupus", "turning", "Born a wolf", "You were born in a pack in the hills. One winter you stood up on two legs.", [
    o("Your pack drove you out", "ab Survival|flaw Nightmares", {f: "br:lupus"}),
    o("Your pack followed you", "bg Allies|ab Animal Ken", {f: "br:lupus"})
  ], {when: L("werewolf", {spans: S([1100, 1900])}), w: 8}),
  ev("w.turn.metis", "turning", "Born in the sept", "Two Garou broke the Litany, and you were the result: born in war form, raised among the Garou.", [
    o("Hated for it", "flaw Enemy|ab Rituals", {f: "br:metis"}),
    o("Protected by an elder", "bg Mentor", {f: "br:metis", p: "an elder|who stood between you and the sept"})
  ], {when: L("werewolf"), w: 5}),
  ev("w.turn.city", "turning", "In the city", "Concrete, sirens, and something tearing out of you in an alley.", [
    o("The Veil hid it", "ab Streetwise"),
    o("It made the news", "flaw Hunted")
  ], {when: L("werewolf", {spans: S([1850, 2300])}), w: 12}),
  ev("w.turn.arco", "turning", "In the arcology", "Corporate security filmed the whole thing.", [
    o("They want you as an asset", "note Someone owns your contract|bg Resources", {p: "a corporate handler|who knows what you are"}),
    o("You broke out", "flaw Hunted|ab Athletics")
  ], {when: L("werewolf", {spans: S([2023, 2300])}), w: 25}),
  ev("w.after.rite", "after", "The Rite of Passage", "The sept sets you a test before you are counted among them.", [
    o("A hunt for something Wyrm-tainted", "ab Brawl|ab Primal-Urge", {f: "rp:hunt"}),
    o("A journey into the Umbra", "ab Enigmas|bg Totem", {f: "rp:umbra"}),
    o("A riddle, a debt or a theft", "ab Subterfuge|ab Enigmas", {f: "rp:wits"})
  ], {when: L("werewolf")}),
  ev("w.after2.pack", "after2", "The pack", "The cubs who passed with you became your pack.", [
    o("Close as blood", "bg Allies", {p: "a packmate|you would die for"}),
    o("A rival among them", "flaw Enemy", {p: "a packmate|who wants to lead"})
  ], {when: L("werewolf")}),
  ev("w.after2.totem", "after2", "The totem", "A spirit came to the pack and asked what you would give.", [
    o("A ban kept", "bg Totem"),
    o("A ban broken", "flaw Enemy (spirit)")
  ], {when: L("werewolf"), more: {"rp:umbra": 3}}),
  ev("w.after2.taint", "after2", "The first taint", "You fought something of the Wyrm and it left a mark.", [
    o("It left a scar", "merit Tough|flaw Nightmares"),
    o("It left a whisper", "flaw Dark Secret")
  ], {when: L("werewolf"), more: {"rp:hunt": 3}}),
  ev("w.after2.life", "after2", "The life before", "Your human family, or your wolf pack, still waits.", [
    o("You go back sometimes", "bg Kinfolk", {p: "a human relative|who never asks"}),
    o("You never go back", "merit Iron Will")
  ], {when: L("werewolf", {not: ["br:metis"]})}),
  ev("w.after2.elder", "after2", "An elder's grudge", "Something you did at the rite offended a powerful Garou.", [
    o("Make amends", "ab Etiquette"),
    o("Spit in their eye", "flaw Enemy", {p: "an elder of the sept|who remembers"})
  ], {when: L("werewolf"), more: {"rp:wits": 3}})
];

/* ------------------------------------------------------------------ */
/*  Mage                                                               */
/* ------------------------------------------------------------------ */
const MAGE = [
  ev("m.turn.slow", "turning", "A slow dawning", "Coincidences grew too many. One day you knew they were yours.", [
    o("You kept it quiet", "bg Avatar|ab Awareness", {f: "aw:slow"}),
    o("You told a friend", "bg Allies", {f: "aw:slow", p: "a Sleeper friend|who saw your first coincidence"})
  ], {when: L("mage")}),
  ev("m.turn.crisis", "turning", "A crisis", "Death came for you, or for someone you loved, and the world bent.", [
    o("You saved them", "bg Avatar|note Brave", {f: "aw:crisis", p: "the one you saved|who saw too much"}),
    o("You could not", "flaw Nightmares|bg Avatar", {f: "aw:crisis"})
  ], {when: L("mage")}),
  ev("m.turn.teacher", "turning", "Woken by a teacher", "A stranger pushed you through.", [
    o("You were grateful", "bg Mentor", {f: "aw:taught", p: "the teacher|who woke you"}),
    o("You were afraid", "flaw Enemy", {f: "aw:taught"})
  ], {when: L("mage")}),
  ev("m.turn.miracle", "turning", "A miracle", "Before the town and the priest, you did something holy or damned.", [
    o("Called a saint", "bg Fame|merit True Faith", {f: "aw:crisis"}),
    o("Called a witch", "flaw Hunted", {f: "aw:crisis"})
  ], {when: L("mage", {spans: S([1100, 1650])}), w: 15}),
  ev("m.turn.lab", "turning", "In the laboratory", "The experiment should have failed. It worked because you needed it to.", [
    o("You published", "ab Science|bg Fame", {f: "aw:slow"}),
    o("You hid the notes", "ab Science|flaw Dark Secret", {f: "aw:slow"})
  ], {when: L("mage", {spans: S([1600, 2300])}), w: 12}),
  ev("m.turn.net", "turning", "In the Net", "Code is reality, and for one night you could read it.", [
    o("You stayed online for days", "ab Computer|bg Avatar"),
    o("You crashed something big", "ab Computer|flaw Hunted")
  ], {when: L("mage", {spans: S([1985, 2300])}), w: 15}),
  ev("m.after.mentor", "after", "The mentor", "Someone takes you on, or no one does.", [
    o("A strict master", "bg Mentor|ab Occult", {f: "mm:strict"}),
    o("A gentle guide", "bg Mentor|ab Empathy", {f: "mm:kind"}),
    o("Self-taught", "ab Enigmas|ab Survival", {f: "mm:alone"})
  ], {when: L("mage")}),
  ev("m.after2.seeking", "after2", "The first Seeking", "Your Avatar set you a riddle in a dream.", [
    o("You solved it", "bg Avatar|ab Enigmas"),
    o("You failed it", "flaw Nightmares")
  ], {when: L("mage")}),
  ev("m.after2.paradox", "after2", "Paradox", "You pushed too hard in front of witnesses.", [
    o("It burned you", "note A Paradox scar"),
    o("Something came to collect", "flaw Enemy (spirit)")
  ], {when: L("mage"), more: {"mm:alone": 3, "mm:strict": 0.5}}),
  ev("m.after2.rival", "after2", "A rival apprentice", "Your mentor had another student.", [
    o("Friends", "bg Allies", {p: "a fellow apprentice|you trust"}),
    o("Enemies", "flaw Enemy", {p: "a fellow apprentice|who took your place"})
  ], {when: L("mage", {not: ["mm:alone"]})}),
  ev("m.after2.reason", "after2", "Reason notices", "Agents in grey, or Masons of the Order, or the Technocracy's agents, asked about you.", [
    o("They recruited you", "bg Contacts|flaw Dark Secret"),
    o("You hid", "ab Stealth|flaw Hunted")
  ], {when: L("mage", {spans: S([1450, 2300])}), more: {"mm:alone": 2}}),
  ev("m.after2.node", "after2", "A place of power", "You found a Node, a sacred spring or a forgotten shrine.", [
    o("You claimed it", "bg Node"),
    o("You shared it", "bg Allies|bg Node")
  ], {when: L("mage")}),
  ev("m.after2.library", "after2", "Books", "A dead mage's library came to you.", [
    o("Kept it", "bg Library"),
    o("Sold most of it", "bg Resources")
  ], {when: L("mage"), more: {"mm:strict": 2}})
];

/* ------------------------------------------------------------------ */
/*  Changeling                                                         */
/* ------------------------------------------------------------------ */
const CHANGELING = [
  ev("c.turn.art", "turning", "Art", "A song, a painting or a story woke the fae soul in you.", [
    o("Yours", "ab Expression|bg Dreamers", {f: "ch:art"}),
    o("Someone else's", "bg Dreamers", {f: "ch:art", p: "the artist|whose work woke you"})
  ], {when: L("changeling")}),
  ev("c.turn.love", "turning", "Love", "You fell so hard the world turned bright.", [
    o("It lasted", "bg Dreamers", {p: "the one you loved|and who still inspires you"}),
    o("It broke", "note Banality has a hold on you")
  ], {when: L("changeling")}),
  ev("c.turn.terror", "turning", "Terror", "Something chased you, and you became something it should fear.", [
    o("You won", "note Brave"),
    o("You ran and changed as you ran", "ab Athletics")
  ], {when: L("changeling")}),
  ev("c.turn.brought", "turning", "Brought out", "A changeling found you and brought it on.", [
    o("A noble's doing", "bg Title|bg Mentor", {f: "ch:noble", p: "the noble|who brought on your Chrysalis"}),
    o("A commoner's doing", "bg Contacts", {f: "ch:common", p: "the commoner|who found you"})
  ], {when: L("changeling")}),
  ev("c.turn.wild", "turning", "In a fae place", "You wandered into a hill, a fair or a wood at the wrong hour.", [
    o("You came out changed", "bg Chimera|ab Kenning"),
    o("You came out years later", "note Years lost in the fae place")
  ], {when: L("changeling", {spans: S([1100, 1500])}), w: 15}),
  ev("c.after.foster", "after", "Fostering", "Someone teaches you what you are.", [
    o("A noble household", "bg Title|ab Etiquette", {f: "cf:noble"}),
    o("A commoner motley", "bg Allies", {f: "cf:common"}),
    o("No one", "ab Survival", {f: "cf:alone"})
  ], {when: L("changeling")}),
  ev("c.after2.saining", "after2", "The Saining", "You learned your true name.", [
    o("It fit", "merit Iron Will"),
    o("It frightened you", "flaw Nightmares")
  ], {when: L("changeling"), more: {"cf:alone": 0.3}}),
  ev("c.after2.banality", "after2", "Banality's pull", "A dull job, a dull town, a dull love. The dream fades.", [
    o("You fought it", "bg Dreamers"),
    o("It took a little of you", "note Banality has a hold on you")
  ], {when: L("changeling"), more: {"cf:alone": 3}}),
  ev("c.after2.chimera", "after2", "A chimera", "A creature of dream follows you home.", [
    o("Kept it", "bg Chimera"),
    o("Sent it away", "ab Kenning")
  ], {when: L("changeling")}),
  ev("c.after2.freehold", "after2", "A freehold", "A place where Glamour runs.", [
    o("A place there", "bg Holdings"),
    o("A quarrel there", "flaw Enemy", {p: "the freehold's keeper|whom you offended"})
  ], {when: L("changeling"), more: {"cf:noble": 2}})
];

/* ------------------------------------------------------------------ */
/*  Wraith                                                             */
/* ------------------------------------------------------------------ */
const WRAITH = [
  ev("wr.turn.violence", "turning", "Murdered", "Someone killed you, and you came back angry.", [
    o("You know who", "note Passion: justice|note Fetter: the place you died", {p: "your murderer|who is still alive"}),
    o("You do not know who", "note Passion: to find out|ab Investigation")
  ], {when: L("wraith")}),
  ev("wr.turn.illness", "turning", "A long illness", "You died slowly in a bed, with time to think about what you would leave.", [
    o("Surrounded by family", "note Fetter: your family's house", {p: "a relative|who sat with you to the end"}),
    o("Alone", "note Passion: to be remembered")
  ], {when: L("wraith")}),
  ev("wr.turn.accident", "turning", "An accident", "A cart, a beam, a machine, a car. Stupid and quick.", [
    o("At work", "note Fetter: your workplace"),
    o("On the way home", "note Passion: to finish the journey")
  ], {when: L("wraith")}),
  ev("wr.turn.war", "turning", "In the war", "You died with a weapon in your hands, or no weapon at all.", [
    o("In battle", "ab Melee|note Fetter: your comrades", {p: "a comrade|who died beside you and is among the dead too", lasting: true}),
    o("A civilian in the way", "note Passion: to protect the innocent")
  ], {when: L("wraith", {spans: S([1241, 1241], [1419, 1434], [1618, 1648], [1805, 1813], [1914, 1918], [1939, 1945])}), w: 30}),
  ev("wr.turn.plague", "turning", "Plague", "The cart took you with the rest.", [
    o("You remember the cart", "flaw Nightmares|note Fetter: the plague pit")
  ], {when: L("wraith", {spans: S([1348, 1352], [1380, 1381], [1679, 1681], [1713, 1715], [1831, 1832], [1918, 1919], [2020, 2021])}), w: 30}),
  ev("wr.turn.executed", "turning", "Executed", "The axe, the rope, the stake, the wall.", [
    o("Innocent", "note Passion: vengeance on the judge", {p: "the judge|who sentenced you"}),
    o("Guilty", "flaw Dark Secret|note Passion: to make amends")
  ], {when: L("wraith"), w: 6}),
  ev("wr.after.reaped", "after", "The Reaping", "Something found you as you woke in the Shadowlands.", [
    o("A Legion's reapers", "note Legion: by your death", {f: "rp:hierarchy"}),
    o("A Renegade gang", "bg Allies", {f: "rp:renegade"}),
    o("A Heretic cult", "ab Theology", {f: "rp:heretic"}),
    o("No one: you woke alone", "ab Survival", {f: "rp:alone"})
  ], {when: L("wraith")}),
  ev("wr.after2.harrow", "after2", "The first Harrowing", "The Tempest pulled you down and showed you what you fear.", [
    o("You came back", "merit Iron Will"),
    o("You came back changed", "note The Shadow left its mark")
  ], {when: L("wraith")}),
  ev("wr.after2.shadow", "after2", "The Shadow speaks", "A voice in you, a lot like yours, says the easy thing.", [
    o("You listened", "flaw Dark Secret"),
    o("You refused", "merit Iron Will")
  ], {when: L("wraith"), more: {"rp:alone": 2}}),
  ev("wr.after2.fetter", "after2", "A Fetter in danger", "The house is to be sold, the grave moved, the ring melted.", [
    o("You saved it", "note Fetter: kept safe"),
    o("You lost it", "flaw Nightmares")
  ], {when: L("wraith")}),
  ev("wr.after2.guild", "after2", "A guild comes calling", "A guild of the dead wants your talent.", [
    o("You joined", "bg Mentor", {p: "a guild master|of the dead who took you in", lasting: true}),
    o("You turned it down", "flaw Enemy")
  ], {when: L("wraith")}),
  ev("wr.after2.chains", "after2", "Chains", "The Hierarchy wants your soul for coin or for labour.", [
    o("You escaped", "flaw Hunted"),
    o("You served", "bg Status")
  ], {when: L("wraith"), more: {"rp:hierarchy": 2, "rp:renegade": 2}})
];

/* ------------------------------------------------------------------ */
/*  Hunter: inquisitor before 1500, Hunters Hunted to 1998, imbued     */
/* ------------------------------------------------------------------ */
const HUNTER = [
  ev("h.turn.order", "turning", "The calling", "A vision, a sermon, or a death in your village set you against the Devil's children.", [
    o("Taken in by an order", "bg Mentor|ab Theology", {f: "hu:order", p: "a confessor|who showed you the work"}),
    o("You went alone, with a cross and a knife", "merit True Faith|ab Melee", {f: "hu:alone"})
  ], {when: L("hunter", {spans: S([1100, 1499])})}),
  ev("h.turn.seen", "turning", "What you saw", "You saw a vampire feed, a wolf stand up, a ghost speak. No one believes you.", [
    o("You went looking", "ab Investigation|ab Occult", {f: "hu:alone"}),
    o("You found others who saw", "bg Allies", {f: "hu:cell", p: "a fellow hunter|who saw it too"}),
    o("It took someone from you", "flaw Obsession", {f: "hu:alone"})
  ], {when: L("hunter", {spans: S([1500, 1998])})}),
  ev("h.turn.agency", "turning", "Recruited", "A government office with a dull name asked if you would like to know the truth.", [
    o("You said yes", "bg Contacts|ab Firearms", {f: "hu:order"}),
    o("You said yes, and kept a copy of the files", "flaw Dark Secret|ab Investigation", {f: "hu:order"})
  ], {when: L("hunter", {spans: S([1880, 2300])}), w: 6}),
  ev("h.turn.imbued", "turning", "The Imbuing", "You saw a monster for what it was, and something spoke to you in words that were not words.", [
    o("You acted at once", "note Brave|ab Brawl", {f: "hu:imbued"}),
    o("You froze, then followed it", "ab Investigation|ab Stealth", {f: "hu:imbued"}),
    o("Someone else was there too", "bg Allies", {f: ["hu:imbued", "hu:cell"], p: "another imbued|from that night"})
  ], {when: L("hunter", {spans: S([1999, 2300])})}),
  ev("h.after.first", "after", "The first hunt", "You go after the thing.", [
    o("You plan it carefully", "ab Investigation", {f: "hh:careful"}),
    o("You go in hard", "ab Firearms|ab Melee", {f: "hh:hard"}),
    o("You try to talk to it", "ab Empathy", {f: "hh:talk"})
  ], {when: L("hunter")}),
  ev("h.after2.cost", "after2", "The cost at home", "Your family does not know where you go at night.", [
    o("They found out", "note Someone depends on you"),
    o("They left", "merit Iron Will")
  ], {when: L("hunter")}),
  ev("h.after2.face", "after2", "A monster with a face", "One of them was a person once, and still acts like one.", [
    o("You spared it", "bg Contacts", {p: "a monster|you spared, who owes you"}),
    o("You did not", "flaw Nightmares")
  ], {when: L("hunter"), more: {"hh:talk": 3}}),
  ev("h.after2.cell", "after2", "Others like you", "You found a cell, a brotherhood or a mailing list.", [
    o("Joined", "bg Allies"),
    o("Stayed apart", "ab Survival")
  ], {when: L("hunter"), more: {"hu:cell": 2}}),
  ev("h.after2.hunted", "after2", "The hunted hunt back", "They know your name now.", [
    o("You moved", "flaw Hunted"),
    o("You set a trap", "ab Crafts|ab Investigation")
  ], {when: L("hunter"), more: {"hh:hard": 3}})
];

/* ------------------------------------------------------------------ */
/*  Mummy: older Immortals before 1999, the Reborn from 1999           */
/* ------------------------------------------------------------------ */
const MUMMY = [
  ev("mu.turn.reborn", "turning", "The Spell of Life", "You died. A soul from ancient Egypt joined yours in the Underworld, and the two of you came back.", [
    o("The ancient half speaks loud", "ab Occult|note Memory of a past life", {f: "mu:ancient"}),
    o("Your own half speaks loud", "bg Allies|ab Empathy", {f: "mu:modern"})
  ], {when: L("mummy", {spans: S([1999, 2300])})}),
  ev("mu.turn.old", "turning", "An Immortal of the old spell", "You have died and come back many times since Egypt. This life began when you woke in another body.", [
    o("Woken in a tomb", "ab Occult|ab Survival", {f: "mu:ancient"}),
    o("Woken in a museum", "ab Academics|bg Resources", {f: "mu:ancient"})
  ], {when: L("mummy", {spans: S([1100, 1998])})}),
  ev("mu.turn.chrome", "turning", "Chrome immortal", "A corporation dug up your old body and paid to see what it could do.", [
    o("Escaped the lab", "flaw Hunted|ab Technology", {f: "mu:modern"}),
    o("Still on the payroll", "note Someone owns your contract|bg Resources", {f: "mu:modern"})
  ], {when: L("mummy", {spans: S([2010, 2300])}), w: 20}),
  ev("mu.after.duty", "after", "The duty", "What Ma'at asks of you first.", [
    o("Guard a place", "note A charge to keep", {f: "md:guard"}),
    o("Hunt a servant of Apophis", "ab Investigation|ab Brawl", {f: "md:hunt"}),
    o("Find the others", "bg Allies", {f: "md:find"})
  ], {when: L("mummy")}),
  ev("mu.after2.cult", "after2", "A cult", "Mortals who worship you, or wish to.", [
    o("You lead them", "bg Cult"),
    o("You refuse them", "merit Iron Will")
  ], {when: L("mummy")}),
  ev("mu.after2.bane", "after2", "Set's children", "A Bane mummy or a Setite has your scent.", [
    o("You fought", "flaw Enemy"),
    o("You hid", "ab Stealth")
  ], {when: L("mummy"), more: {"md:hunt": 3}}),
  ev("mu.after2.death", "after2", "Another death", "You died again and came back. It hurt more this time.", [
    o("You learned from it", "merit Iron Will"),
    o("You lost a memory", "flaw Amnesia")
  ], {when: L("mummy")})
];

/* ------------------------------------------------------------------ */
/*  Demon (from 1999)                                                  */
/* ------------------------------------------------------------------ */
const DEMON = [
  ev("d.turn.dying", "turning", "A dying host", "The host's soul was leaving. You slipped in as it went.", [
    o("A good person", "note The host's conscience still speaks", {f: "dh:good", p: "the host's partner|who thinks the host survived"}),
    o("A wicked one", "flaw Dark Secret", {f: "dh:bad", p: "the host's accomplice|who expects business as usual"})
  ], {when: L("demon", {spans: S([1999, 2300])})}),
  ev("d.turn.code", "turning", "Out of the code", "You came through the Net and woke in a body on life support.", [
    o("A corporate body", "bg Resources|note Someone owns your contract"),
    o("A street body", "ab Streetwise|merit Tough")
  ], {when: L("demon", {spans: S([2014, 2300])}), w: 20}),
  ev("d.after.memory", "after", "Remembering", "The host's memories and yours fight for room.", [
    o("The host wins most days", "ab Empathy", {f: "dm:host"}),
    o("You win", "note Torment runs high", {f: "dm:fallen"}),
    o("A truce", "merit Iron Will", {f: "dm:truce"})
  ], {when: L("demon")}),
  ev("d.after2.faction", "after2", "A faction calls", "Other Fallen want you on their side.", [
    o("Join them", "bg Allies"),
    o("Stay free", "flaw Hunted")
  ], {when: L("demon")}),
  ev("d.after2.thrall", "after2", "The first thrall", "A mortal offers you faith.", [
    o("Accept", "bg Followers"),
    o("Refuse", "merit Iron Will")
  ], {when: L("demon"), more: {"dm:fallen": 2}}),
  ev("d.after2.family", "after2", "The host's family", "How long can you play the part?", [
    o("Years", "bg Allies"),
    o("Not long", "flaw Enemy")
  ], {when: L("demon"), more: {"dm:host": 2}})
];

/* ------------------------------------------------------------------ */
/*  Kuei-jin                                                           */
/* ------------------------------------------------------------------ */
const KUEIJIN = [
  ev("k.turn.hell", "turning", "Climbing out of hell", "You died and went down to Yomi. You climbed back up, and now you hunger for breath.", [
    o("You remember hell", "flaw Nightmares|ab Occult", {f: "kj:hell"}),
    o("You remember nothing", "merit Iron Will")
  ], {when: L("kueijin")}),
  ev("k.turn.court", "turning", "A court was waiting", "Others like you had watched your grave.", [
    o("Taken in", "bg Status|bg Mentor", {f: "kj:court", p: "your mentor in the court|who watched your grave"}),
    o("You fled them", "flaw Hunted", {f: "kj:alone"})
  ], {when: L("kueijin")}),
  ev("k.after.teach", "after", "The way", "How you learn to balance yin and yang.", [
    o("Harsh training in a monastery", "ab Martial Arts|merit Iron Will", {f: "kt:strict"}),
    o("A wu that is like family", "bg Allies", {f: "kt:kind"}),
    o("No teacher", "ab Survival", {f: "kt:alone"})
  ], {when: L("kueijin")}),
  ev("k.after2.balance", "after2", "Out of balance", "Too much yin, too much yang, or the demon in your soul.", [
    o("You found balance", "merit Iron Will"),
    o("The P'o grows", "flaw Short Fuse")
  ], {when: L("kueijin"), more: {"kt:alone": 3}}),
  ev("k.after2.west", "after2", "The barbarians", "A Kin-jin came into your city.", [
    o("You traded with them", "bg Contacts"),
    o("You drove them out", "flaw Enemy")
  ], {when: L("kueijin", {spans: S([1500, 2300])})}),
  ev("k.after2.arco", "after2", "Dragon nests", "The arcologies sit on the old dragon lines.", [
    o("You claimed a nest", "bg Dragon Nest"),
    o("A corp claimed it first", "flaw Enemy")
  ], {when: L("kueijin", {spans: S([2020, 2300])}), w: 20})
];

/* ------------------------------------------------------------------ */
/*  Orpheus (from 1848)                                                */
/* ------------------------------------------------------------------ */
const ORPHEUS = [
  ev("op.turn.medium", "turning", "The table rapped", "At a séance in a parlour, your spirit left your body for the first time.", [
    o("You performed for money", "ab Performance|bg Resources"),
    o("You hid it", "ab Occult|flaw Dark Secret")
  ], {when: L("orpheus", {spans: S([1848, 1960])})}),
  ev("op.turn.coma", "turning", "Near death", "On the table, your heart stopped. You watched them work.", [
    o("You came back", "ab Awareness", {f: "or:skimmer"}),
    o("You stayed out a while", "ab Occult|flaw Nightmares", {f: "or:spirit"})
  ], {when: L("orpheus")}),
  ev("op.turn.cryo", "turning", "Sleeping for money", "A company paid you to lie in a cold box and leave your body.", [
    o("You signed", "bg Resources|note Someone owns your contract", {f: "or:sleeper"}),
    o("You read the fine print later", "flaw Enemy", {f: "or:sleeper"})
  ], {when: L("orpheus", {spans: S([1990, 2300])})}),
  ev("op.turn.braindance", "turning", "Braindance", "A recording of a death, and you went out with it.", [
    o("Addicted", "flaw Addiction"),
    o("Hired for it", "bg Resources")
  ], {when: L("orpheus", {spans: S([2010, 2300])}), w: 20}),
  ev("op.after.crucible", "after", "The crucible", "Who you work with.", [
    o("A company team", "bg Resources|bg Allies", {f: "oc:corp"}),
    o("Freelancers", "bg Contacts", {f: "oc:free"}),
    o("Alone", "ab Survival", {f: "oc:alone"})
  ], {when: L("orpheus")}),
  ev("op.after2.spectre", "after2", "Something in the dark", "A spectre noticed you out there.", [
    o("It follows you", "flaw Haunted"),
    o("You beat it", "note Brave")
  ], {when: L("orpheus")}),
  ev("op.after2.client", "after2", "The first client", "A haunting to clear for someone who could pay.", [
    o("Done well", "bg Fame"),
    o("It went wrong", "flaw Enemy")
  ], {when: L("orpheus"), more: {"oc:free": 2, "oc:corp": 2}})
];

export const TURNING_EVENTS = [...VAMPIRE, ...GHOUL, ...REVENANT, ...WEREWOLF, ...MAGE, ...CHANGELING, ...WRAITH, ...HUNTER, ...MUMMY, ...DEMON, ...KUEIJIN, ...ORPHEUS];
