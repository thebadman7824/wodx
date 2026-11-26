/**
 * WoDX Creation: the four monsters of the V20 Dark Ages Companion (2017), with their powers and weaknesses (B7702).
 * Numbers from the book's stat blocks (book-text OCR, checked against the page markers); the descriptions and rules are
 * WoDX's own words. They have the sheet's usual seven health levels and no attack of their own: the book gives neither, so they fight with Brawl. "Equivalent
 * Disciplines" are made as Disciplines; a power the book limits to named powers says so in the notes.
 * dac-demons-rules.mjs plans them as it does the Companion's demons; dac-demons.mjs makes them.
 */
export const BOOK = "V20 DA Companion";
export const MONSTERS = [
  {key: "black-dog", name: "Black Dog", group: "Monsters of the V20 Companion", p: 35, kind: "monster",
    attributes: {strength: 2, dexterity: 3, stamina: 2, charisma: 5, manipulation: 1, appearance: 4, perception: 4, intelligence: 3, wits: 3},
    abilities: {Alertness: 2, Athletics: 4, Awareness: 4, Brawl: 2, Empathy: 4, Intimidation: 5, Stealth: 3, Subterfuge: 2},
    disciplines: {Celerity: 4, Daimoinon: 2, Protean: 7, Serpentis: 1, "Valeren (Watcher)": 1}, paths: {}, blood: 5, willpower: 7, road: 3,
    about: "A man-sized black hound with ember eyes that haunts the moors and byways of the Isles, a harbinger that shadows those marked for death. It hates Cainites and hounds them toward madness.",
    rules: ["It regains spent blood points by sleeping or stalking its prey for six unbroken hours.",
      "It is neither spirit nor ghost to powers that name them; anything that touches the immaterial can harm it in Spectral Body.",
      "Its Protean is only Eyes of the Beast and Spectral Body; its Sense Cycle shows omens of where and when its target may die."]},
  {key: "fossegrim", name: "Fossegrim", group: "Monsters of the V20 Companion", p: 48, kind: "monster",
    attributes: {strength: 1, dexterity: 4, stamina: 2, charisma: 4, manipulation: 4, appearance: 5, perception: 2, intelligence: 2, wits: 2},
    abilities: {Alertness: 2, "Animal Ken": 3, Awareness: 3, Brawl: 1, Empathy: 4, Etiquette: 3, Expression: 2, "Hearth Wisdom": 2, Legerdemain: 2, Occult: 2, Performance: 5, Subterfuge: 2},
    disciplines: {Animalism: 1, Auspex: 2, Potence: 2, Presence: 1, Spiritus: 2}, paths: {}, blood: 6, willpower: 7, road: 5,
    about: "A water spirit fused with a mortal by an ancient koldun, haunting the falls and pools of the North with an enchanted fiddle or harp. It hates the Tzimisce and draws others in to plot their fall.",
    rules: ["Six hours straight of sleep or of making music restores its spent blood points.",
      "Its Presence works only while it plays a stringed instrument or dances to another's music.",
      "Each week away from its own waters costs a point of permanent Willpower; at none it dies.",
      "After hours of communion and a real payment, a student may buy one dot of Charisma, Empathy, Performance or Presence at half the experience cost, once per fossegrim."]},
  {key: "kallikantzaros", name: "Kallikantzaros", group: "Monsters of the V20 Companion", p: 66, kind: "monster",
    attributes: {strength: 4, dexterity: 3, stamina: 3, charisma: 3, manipulation: 5, appearance: 1, perception: 3, intelligence: 2, wits: 4},
    abilities: {Alertness: 4, Athletics: 2, Awareness: 5, Brawl: 3, Empathy: 4, Etiquette: 3, Expression: 4, Intimidation: 3, Melee: 2, Occult: 3, Subterfuge: 5, Theology: 3},
    disciplines: {Auspex: 6, Chimerstry: 6, Dominate: 1, Obtenebration: 2}, paths: {}, blood: 9, willpower: 9, road: 4,
    about: "A goblin of Greek and Roman lands that rises from its tunnels on winter's holy days, wearing the face of a god, saint or devil to steal the worship of the faithful and drag them below.",
    rules: ["It regains a blood point for each minute of worship turned toward it, whatever face it wears.",
      "Its powers work only on holy days of the local faiths, and only in winter.",
      "Its Appearance is that of the face it shows; those who see through illusion (Auspex) see a mismatched monster at Appearance 1, as the sheet has it."]},
  {key: "pishacha", name: "Pishacha", group: "Monsters of the V20 Companion", p: 97, kind: "monster",
    attributes: {strength: 5, dexterity: 4, stamina: 2, charisma: 2, manipulation: 2, appearance: 1, perception: 5, intelligence: 2, wits: 3},
    abilities: {Alertness: 3, Athletics: 2, Awareness: 2, Brawl: 4, Intimidation: 3, Leadership: 2, Melee: 2, Occult: 1, Stealth: 5, Subterfuge: 1, Survival: 3},
    disciplines: {Abombwe: 3, Celerity: 1, Dementation: 1, Dominate: 5, Obfuscate: 2, Potence: 2}, paths: {}, blood: 6, willpower: 4, road: 1,
    about: "A flesh-eating cousin of the Cainites that haunts the burning grounds and charnel houses of India, carrying sickness, and speaks only through the mouths of those it possesses.",
    rules: ["It spends blood as a vampire of the Thirteenth Generation, but its vitae makes no bonds or childer and it cannot seem alive. It eats flesh: living flesh counts as fresh blood, a corpse's halves for each hour dead, and a supernatural's gives a point more a turn.",
      "The first time in a scene it enters a place of gory death or great anger or grief, or wins with Dementation or Possession, it gains a temporary Willpower point.",
      "Its Dominate is only Command, Subjugation and Possession. While it uses Dementation or Dominate its body is empty and cannot defend itself.",
      "Staked to Incapacitated it crumbles to dust; it frenzies from hunger but never anger, and cannot soak sunlight at all."]}
];
