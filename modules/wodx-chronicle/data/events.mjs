/**
 * Dated events. Each fires once when the Chronicle Clock passes its date, and each is a switch the Storyteller can
 * turn off or move. `branch`: "classic" fires only on the classic timeline, "future" only on the Future Darkness
 * branch, "both" on either. `metaplot: true` marks events the 20th Anniversary books leave to each Storyteller; those
 * start switched off. `dateNote` says where a book gives no exact date and WoDX picked one (a house rule).
 * Pages: "pdf" is the PDF page, "p." the printed page.
 */
export default {
  version: 1,
  events: [
    {
      id: "black-death", year: 1347, month: 10, day: 1, branch: "both", lines: ["all", "wraith"],
      name: "The Black Death and the Second Great Maelstrom",
      summary: "Plague reaches Europe. The dead cross the Shroud in such numbers that the Second Great Maelstrom breaks over the Underworld.",
      source: "Wraith 20th p. 34 (pdf 99)",
      dateNote: "The book gives the year; the day is the plague's arrival in Sicily, a house rule."
    },
    {
      id: "shattering", year: 1350, branch: "both", lines: ["changeling"],
      name: "The Shattering",
      summary: "Banality closes the ways to Arcadia. The last open trods fail and the fae who stay must hide in mortal bodies.",
      source: "C20 pp. 35-37",
      dateNote: "C20 ties it to the Black Plague; WoDX uses 1350, the year era advancement uses."
    },
    {
      id: "camarilla", year: 1435, branch: "both", lines: ["vampire"],
      name: "The Camarilla is formed",
      summary: "Elders of several clans bind themselves into one sect to hide the Kindred from the Inquisition.",
      source: "V20 Lore of the Clans pdf 251"
    },
    {
      id: "cappadocians", year: 1444, branch: "both", lines: ["vampire", "wraith"],
      name: "The fall of the Cappadocians",
      summary: "Augustus Giovanni diablerizes Cappadocius. The Giovanni set out to destroy what is left of the clan.",
      source: "V20 p. 418 (pdf 426)",
      dateNote: "V20 gives no year. 1444 is the date the era table already uses."
    },
    {
      id: "grand-convocation", year: 1466, branch: "both", lines: ["mage"],
      name: "The Grand Convocation ends",
      summary: "After nine years of talks the mystic mages found the Council of Nine Traditions against the Order of Reason.",
      source: "M20 pdf 30, 42"
    },
    {
      id: "first-conclave", year: 1486, branch: "both", lines: ["vampire"],
      name: "The first Camarilla Conclave",
      summary: "The sect holds its first Conclave and names its first Justicars.",
      source: "V20 Lore of the Clans pdf 251"
    },
    {
      id: "thorns", year: 1493, branch: "both", lines: ["vampire"],
      name: "The Convention of Thorns",
      summary: "The Anarch Revolt ends at Thorns. The anarchs who refuse the treaty go on to found the Sabbat; the Assamites are cursed.",
      source: "V20 Lore of the Clans pdf 251"
    },
    {
      id: "croatan", year: 1590, branch: "both", lines: ["werewolf"],
      name: "The Croatan give themselves at Roanoke",
      summary: "The whole tribe dies to stop a great servant of the Wyrm. No living Croatan remains.",
      source: "W20 p. 40",
      dateNote: "W20 gives Roanoke, not a year; 1590 matches the lost-tribe year in era advancement."
    },
    {
      id: "third-great-maelstrom", year: 1600, branch: "both", lines: ["wraith"],
      name: "The Third Great Maelstrom",
      summary: "After the Looting, the Breaking of the Guilds and the Flaying of Obsidian, the worst storm yet cuts Stygia off. The Shroud thickens.",
      source: "Wraith 20th p. 36 (pdf 101)",
      dateNote: "The book places it after 1598 without a year. 1600 is a house rule; move it to suit the chronicle."
    },
    {
      id: "technocracy", year: 1897, branch: "both", lines: ["mage"],
      name: "The Order of Reason becomes the Technocratic Union",
      summary: "The Order of Reason reorganizes as the Technocracy.",
      source: "M20 pdf 27"
    },
    {
      id: "war-of-tears", year: 1899, branch: "both", lines: ["werewolf"],
      name: "The War of Tears ends",
      summary: "The Bunyip are hunted out as Europeans settle Australia. No living Bunyip remains.",
      source: "W20 pp. 40-41",
      dateNote: "W20 gives no end year; 1899 matches the lost-tribe year in era advancement."
    },
    {
      id: "fourth-great-maelstrom", year: 1916, month: 7, day: 1, branch: "both", lines: ["wraith"],
      name: "The Fourth Great Maelstrom",
      summary: "The dead of the Great War flood the Underworld. The Somme sets off a storm that ravages the Shadowlands.",
      source: "Wraith 20th p. 39 (pdf 104); Wraith: The Great War pdf 34, 206"
    },
    {
      id: "second-anarch-revolt", year: 1944, branch: "both", lines: ["vampire"],
      name: "The Second Anarch Revolt",
      summary: "Anarchs drive the Camarilla out of California and declare the Anarch Free State.",
      source: "V20 p. 44 (pdf 52)"
    },
    {
      id: "fifth-great-maelstrom", year: 1945, month: 8, day: 6, branch: "both", lines: ["wraith"],
      name: "The Fifth Great Maelstrom",
      summary: "The bombs tear the Tempest open. Gorool rises, and Charon is lost fighting it.",
      source: "Wraith 20th pp. 40-41, 21 (pdf 105, 86)"
    },
    {
      id: "resurgence", year: 1969, month: 7, day: 20, branch: "both", lines: ["changeling"],
      name: "The Resurgence",
      summary: "As people watch the first steps on the Moon, Dreaming floods back into the world and some of the lost fae return.",
      source: "C20 pp. 35-37"
    },
    {
      id: "doissetep", year: 1997, month: 11, day: 10, branch: "classic", lines: ["mage"], metaplot: true,
      name: "The fall of Doissetep",
      summary: "The Hermetic stronghold destroys itself. The Digital Web crashes in the Great Whiteout.",
      source: "M20 pdf 29-30, 51"
    },
    {
      id: "week-of-nightmares", year: 1999, month: 6, day: 1, branch: "classic", lines: ["all", "vampire"], metaplot: true,
      name: "The Week of Nightmares",
      summary: "A week of mass nightmares and visions as something ancient wakes and rampages across India and Bangladesh.",
      source: "M20 pdf 31"
    },
    {
      id: "avatar-storm", year: 1999, month: 6, day: 8, branch: "classic", lines: ["mage", "werewolf"], metaplot: true,
      name: "The Avatar Storm",
      summary: "A storm in the spirit world flays the souls of mages who try to cross the Gauntlet.",
      source: "M20 pdf 30-31, 83"
    },
    {
      id: "sixth-great-maelstrom", year: 1999, month: 6, day: 8, branch: "classic", lines: ["wraith", "demon", "mummy"], metaplot: true,
      name: "The Sixth Great Maelstrom",
      summary: "The greatest storm of all scours the Underworld. In its chaos the Abyss cracks and the mummies' souls are torn loose.",
      source: "Wraith: The Oblivion, Ends of Empire (2nd edition). Wraith 20th p. 213 (pdf 278) treats it as not yet come.",
      dateNote: "Wraith 20th leaves it unhappened, so it starts off."
    },
    {
      id: "reckoning", year: 1999, branch: "classic", lines: ["hunter"],
      name: "The Reckoning",
      summary: "The first of the imbued see the world as it is. From now on hunters follow Hunter: The Reckoning.",
      source: "Hunter: The Reckoning pp. 26-38 (pdf 27-39), the opening journal, dated October 1999",
      dateNote: "Hunter rules switch at the start of 1999, so the event is dated to the year."
    },
    {
      id: "fallen-escape", year: 1999, branch: "classic", lines: ["demon"],
      name: "The Fallen escape the Abyss",
      summary: "Fallen angels slip out of their prison and take the bodies of the dying.",
      source: "Demon: The Fallen pp. 13, 65"
    },
    {
      id: "time-of-judgment", year: 2004, branch: "classic", lines: ["all"], metaplot: true,
      name: "The Time of Judgment",
      summary: "The end the lines foretold. Each line's ending is the Storyteller's to choose, or to skip.",
      source: "Era table: Time of Judgment (house rule switch)"
    },
    {
      id: "venice-conclave", year: 2009, branch: "future", lines: ["vampire"],
      name: "The Venice Conclave",
      summary: "The Inner Circle tightens its grip on neonates and anarchs and moves to bring the West Coast under control. The Children of Carthage form in its wake.",
      source: "World of Future Darkness p. 16 (pdf 3)"
    },
    {
      id: "cyberpunks-bloodline", year: 2016, branch: "future", lines: ["vampire"],
      name: "The Cyberpunks bloodline is made",
      summary: "A netrunner and a Ravnos make the first Cyberpunks in Night City. Technica appears.",
      source: "World of Future Darkness p. 19 (pdf 6)"
    },
    {
      id: "masquerade-frays", year: 2024, branch: "future", lines: ["all", "vampire"],
      name: "The Masquerade falls apart",
      summary: "Sensors, cyberoptics and the megacorps see too much. The Masquerade is in tatters and the elders throw the young to the wolves.",
      source: "World of Future Darkness p. 16 (pdf 3)",
      dateNote: "The article says 2024 or 2025 at the latest (2021 in its playtest); move it to suit the chronicle."
    }
  ],
  /** Which timeline each kind of event belongs to (a house rule, recorded in Chronicle Rules). */
  branchNote: "The Future Darkness branch splits from the classic timeline in the 1990s. Events up to 1969 fire on both. The 1997 and 1999 events and the Time of Judgment are classic only, since World of Future Darkness was written before them and never mentions them. The Venice Conclave, the Cyberpunks and the fall of the Masquerade are Future Darkness only."
};
