/**
 * Threads of Fate hook cards that belong to What Sleeps Beneath Rothenstein (moved from WoDX Storyteller's
 * data/threads-cards.mjs, Chronicle Packs Desk b1/b2). Each carries chronicle: "rothenstein"; WoDX Storyteller's deck adds
 * them only while this chronicle is in play. Own words; no book text.
 */
export const CARDS = [
 {
  "key": "roth-hunt-failed",
  "title": "The hunt that failed",
  "steps": [
   {
    "key": "s1",
    "title": "Signs",
    "text": "Small wrong things: a smell, a missing face, a story that does not fit.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "It spreads",
    "text": "More people are touched by it, and someone powerful notices.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The night it breaks",
    "text": "It comes into the open. Whoever has not chosen a side is chosen for.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "stopped",
    "label": "It is stopped, at a cost",
    "writes": [
     {
      "to": "rumours",
      "what": "Word goes round that it was ended"
     },
     {
      "to": "factions",
      "what": "Those who helped gain standing"
     }
    ]
   },
   {
    "key": "bargain",
    "label": "It is bargained down, not ended",
    "writes": [
     {
      "to": "ledger",
      "what": "A debt is owed to whoever held it back"
     }
    ]
   },
   {
    "key": "lost",
    "label": "It wins this time",
    "writes": [
     {
      "to": "towns",
      "what": "The place is changed for the worse"
     },
     {
      "to": "rumours",
      "what": "A frightened story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "uneasy",
  "open": "The dogs came back without the huntsmen, and one of them was carrying a hand.",
  "who": "the lord's huntsman",
  "cast": [
   "hunter",
   "family"
  ],
  "place": [
   "wild",
   "house"
  ],
  "needs": [
   "fight",
   "death",
   "hunters",
   "saga"
  ],
  "surface": "A hunting party went into the woods after a beast and did not come back whole.",
  "want": "To have the beast named and killed, and the blame put somewhere else.",
  "beneath": {
   "werewolf": "The beast was Kin gone wrong, and the sept would rather bury it quietly.",
   "vampire": "A Gangrel fed on the survivors and left one alive to talk.",
   "mortal": "The huntsmen ran, and one of them killed another to hide it."
  },
  "complication": "The lord wants a trophy by Sunday, any trophy.",
  "find": "Tracks that change shape halfway across the clearing.",
  "question": "Who is the beast, and who made it one?",
  "cost": "A trophy means someone else's death.",
  "valve": "The surviving huntsman will talk for a coin and a drink.",
  "fight": "wild",
  "faction": "the castle",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-harvest-game",
  "title": "The harvest game",
  "steps": [
   {
    "key": "s1",
    "title": "An insult",
    "text": "An old wound is opened by a new slight.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "Blood",
    "text": "Someone is hurt, and both sides count it.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The reckoning",
    "text": "The feud must end, grow, or pass to the next generation.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "peace",
    "label": "Peace is made",
    "writes": [
     {
      "to": "factions",
      "what": "Both sides owe the peacemakers"
     },
     {
      "to": "tales",
      "what": "A tale of the peace"
     }
    ]
   },
   {
    "key": "fall",
    "label": "One side falls",
    "writes": [
     {
      "to": "memory",
      "what": "The survivors remember who helped"
     },
     {
      "to": "towns",
      "what": "The place changes hands"
     }
    ]
   },
   {
    "key": "passes",
    "label": "The feud passes on",
    "writes": [
     {
      "to": "rumours",
      "what": "The quarrel lives on in talk"
     },
     {
      "to": "memory",
      "what": "Grudges carry to the heirs"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "any",
  "mood": "festive",
  "open": "The harvest game ends with one village carrying the sheaf and the other carrying a body.",
  "who": "the reeve of Dolany",
  "cast": [
   "family",
   "elder"
  ],
  "place": [
   "town",
   "wild"
  ],
  "needs": [
   "fight",
   "grudge",
   "tale",
   "saga"
  ],
  "surface": "A rough game between two villages has turned into a quarrel that will outlast the winter.",
  "want": "Revenge before the first snow.",
  "beneath": {
   "vampire": "A herd on each side, and a Kindred who feeds better while they fight.",
   "changeling": "The sheaf is a true treasure and the game was always for it.",
   "mortal": "The dead player owed money to the reeve."
  },
  "complication": "The priest has banned the game, and both villages blame the players for it.",
  "find": "The sheaf hides a token older than the church.",
  "question": "Can the game end without a second death?",
  "cost": "Taking a side loses the other village's trust.",
  "valve": "The widow wants peace more than revenge.",
  "fight": "town",
  "faction": "the villages",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-black-grain",
  "title": "The black grain",
  "steps": [
   {
    "key": "s1",
    "title": "Signs",
    "text": "Small wrong things: a smell, a missing face, a story that does not fit.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "It spreads",
    "text": "More people are touched by it, and someone powerful notices.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The night it breaks",
    "text": "It comes into the open. Whoever has not chosen a side is chosen for.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "stopped",
    "label": "It is stopped, at a cost",
    "writes": [
     {
      "to": "rumours",
      "what": "Word goes round that it was ended"
     },
     {
      "to": "factions",
      "what": "Those who helped gain standing"
     }
    ]
   },
   {
    "key": "bargain",
    "label": "It is bargained down, not ended",
    "writes": [
     {
      "to": "ledger",
      "what": "A debt is owed to whoever held it back"
     }
    ]
   },
   {
    "key": "lost",
    "label": "It wins this time",
    "writes": [
     {
      "to": "towns",
      "what": "The place is changed for the worse"
     },
     {
      "to": "rumours",
      "what": "A frightened story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "dread",
  "open": "The bread tastes of iron, and in the night the bakers dance until their feet bleed.",
  "who": "the miller",
  "cast": [
   "merchant",
   "family"
  ],
  "place": [
   "town",
   "market",
   "river"
  ],
  "needs": [
   "plague",
   "change",
   "cult",
   "saga"
  ],
  "surface": "Spoiled grain is making the town mad with fits and visions.",
  "want": "To sell the grain anyway, before the price falls.",
  "beneath": {
   "werewolf": "The rot is the Wyrm's, seeded in the field by a fomori.",
   "vampire": "The madness spreads through the blood, and the herd goes sour.",
   "mage": "A hedge witch's curse on the miller has gone wider than meant.",
   "mortal": "Ergot, greed, and a miller who knew."
  },
  "complication": "The mad see true things in their fits, and some of them are about the players.",
  "find": "The miller's books show the grain came from one field.",
  "question": "Burn the harvest and starve, or eat it and go mad?",
  "cost": "Burning the grain means a hungry winter.",
  "valve": "A wise woman in the woods knows the cure, for a price.",
  "fight": "market",
  "faction": "the guild",
  "tags": [
   "fire",
   "plague"
  ],
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-ridge-toll",
  "title": "Toll of the ridge road",
  "steps": [
   {
    "key": "s1",
    "title": "An insult",
    "text": "An old wound is opened by a new slight.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "Blood",
    "text": "Someone is hurt, and both sides count it.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The reckoning",
    "text": "The feud must end, grow, or pass to the next generation.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "peace",
    "label": "Peace is made",
    "writes": [
     {
      "to": "factions",
      "what": "Both sides owe the peacemakers"
     },
     {
      "to": "tales",
      "what": "A tale of the peace"
     }
    ]
   },
   {
    "key": "fall",
    "label": "One side falls",
    "writes": [
     {
      "to": "memory",
      "what": "The survivors remember who helped"
     },
     {
      "to": "towns",
      "what": "The place changes hands"
     }
    ]
   },
   {
    "key": "passes",
    "label": "The feud passes on",
    "writes": [
     {
      "to": "rumours",
      "what": "The quarrel lives on in talk"
     },
     {
      "to": "memory",
      "what": "Grudges carry to the heirs"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "any",
  "mood": "tense",
  "open": "The toll on the ridge road has doubled, and the toll-keeper is wearing a dead man's cloak.",
  "who": "the toll-keeper",
  "cast": [
   "official",
   "stranger"
  ],
  "place": [
   "road",
   "fort"
  ],
  "needs": [
   "grudge",
   "law",
   "debt",
   "saga"
  ],
  "surface": "A toll-keeper is squeezing every traveller, and someone powerful lets it happen.",
  "want": "Enough silver to buy a way out of the margrave's service.",
  "beneath": {
   "vampire": "The toll-keeper is a ghoul, and the silver pays for a domain.",
   "mortal": "The toll-keeper killed the last keeper and took the post.",
   "hunter": "Each traveller is written down, and the list goes to a priest."
  },
  "complication": "The merchants will pay the players to end the toll, but the castle will not forgive it.",
  "find": "The ledger of the toll, with names that should not be there.",
  "question": "Who does the road belong to?",
  "cost": "Breaking the toll angers the castle.",
  "valve": "The toll-keeper wants out and will deal.",
  "fight": "road",
  "faction": "the castle",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-apothecary-debt",
  "title": "The apothecary's debt",
  "steps": [
   {
    "key": "s1",
    "title": "The bill",
    "text": "An old bargain falls due, and the one who made it is not the one who must pay.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "The price grows",
    "text": "Refusing has a cost, and the cost is shown.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "Due",
    "text": "Pay, break or remake the bargain tonight.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "paid",
    "label": "The price is paid",
    "writes": [
     {
      "to": "ledger",
      "what": "What was paid is gone"
     },
     {
      "to": "memory",
      "what": "The creditor is satisfied"
     }
    ]
   },
   {
    "key": "broken",
    "label": "The bargain is broken",
    "writes": [
     {
      "to": "memory",
      "what": "A powerful grudge"
     },
     {
      "to": "rumours",
      "what": "Word that a pact was broken"
     }
    ]
   },
   {
    "key": "remade",
    "label": "A new bargain is struck",
    "writes": [
     {
      "to": "ledger",
      "what": "A new debt, longer and stranger"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "any",
  "mood": "tense",
  "open": "The apothecary pays the debt in a jar, and in the jar is something still moving.",
  "who": "the apothecary",
  "cast": [
   "merchant",
   "scholar"
  ],
  "place": [
   "town",
   "house"
  ],
  "needs": [
   "debt",
   "project",
   "rumour",
   "saga"
  ],
  "surface": "An apothecary owes a dangerous person and offers payment no one wants.",
  "want": "To be free of the debt without giving up the shop.",
  "beneath": {
   "vampire": "The creditor wants vitae tinctures, and the apothecary has been bleeding the poor.",
   "mage": "The shop is a front for a chantry's supplies.",
   "mortal": "The creditor is the town's moneylender, and the jar is a threat."
  },
  "complication": "The apothecary has written the players' names in the debt book as sureties.",
  "find": "The jar's contents came from the Adit.",
  "question": "Who should pay for someone else's bargain?",
  "cost": "Paying the debt makes the players debtors too.",
  "valve": "The apothecary's apprentice knows where the real money is.",
  "fight": "house",
  "faction": "the guild",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-lower-smoke",
  "title": "Smoke in the lower town",
  "steps": [
   {
    "key": "s1",
    "title": "Signs",
    "text": "Small wrong things: a smell, a missing face, a story that does not fit.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "It spreads",
    "text": "More people are touched by it, and someone powerful notices.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The night it breaks",
    "text": "It comes into the open. Whoever has not chosen a side is chosen for.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "stopped",
    "label": "It is stopped, at a cost",
    "writes": [
     {
      "to": "rumours",
      "what": "Word goes round that it was ended"
     },
     {
      "to": "factions",
      "what": "Those who helped gain standing"
     }
    ]
   },
   {
    "key": "bargain",
    "label": "It is bargained down, not ended",
    "writes": [
     {
      "to": "ledger",
      "what": "A debt is owed to whoever held it back"
     }
    ]
   },
   {
    "key": "lost",
    "label": "It wins this time",
    "writes": [
     {
      "to": "towns",
      "what": "The place is changed for the worse"
     },
     {
      "to": "rumours",
      "what": "A frightened story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "dread",
  "open": "The lower town is burning, and the bucket line is being held back by men with clubs.",
  "who": "the weavers' master",
  "cast": [
   "official",
   "family"
  ],
  "place": [
   "town",
   "house"
  ],
  "needs": [
   "fire",
   "war",
   "town",
   "saga"
  ],
  "surface": "A fire in the poor quarter, set or allowed, that clears land someone wants.",
  "want": "The quarter cleared, and no questions.",
  "beneath": {
   "vampire": "A rival's havens are in the lower town, and this is how a domain is won.",
   "werewolf": "The fire covers the killing of Kinfolk.",
   "wraith": "The burned dead rise angry and stay near the ash.",
   "mortal": "Land for a new guild hall, paid for in lives."
  },
  "complication": "The players are seen near the first flames.",
  "find": "Oil jars from the guild's own store.",
  "question": "Save the people or catch the arsonist?",
  "cost": "Whoever is saved, someone else burns.",
  "valve": "The watch captain hates the guild and will listen.",
  "fight": "town",
  "faction": "the guild",
  "tags": [
   "fire"
  ],
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-north-hermit",
  "title": "The hermit of the north wood",
  "steps": [
   {
    "key": "s1",
    "title": "Word of it",
    "text": "Someone learns where it is, and tells the wrong person.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "The race",
    "text": "More than one party is after it, and they know of each other.",
    "days": 5
   },
   {
    "key": "s3",
    "title": "Who holds it",
    "text": "It changes hands, by trade, theft or blood.",
    "days": 12
   }
  ],
  "endings": [
   {
    "key": "kept",
    "label": "The players keep it",
    "writes": [
     {
      "to": "tales",
      "what": "A tale of the finding"
     },
     {
      "to": "factions",
      "what": "Its old keepers remember"
     }
    ]
   },
   {
    "key": "returned",
    "label": "It goes home to its keepers",
    "writes": [
     {
      "to": "memory",
      "what": "Its keepers owe a kindness"
     },
     {
      "to": "rumours",
      "what": "Word of an honest deed"
     }
    ]
   },
   {
    "key": "destroyed",
    "label": "No one has it now",
    "writes": [
     {
      "to": "factions",
      "what": "Every party that wanted it is angry"
     },
     {
      "to": "tales",
      "what": "A tale of the loss"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "any",
  "mood": "uneasy",
  "open": "The hermit says the players have come at last, and asks which of them will carry the stone.",
  "who": "the hermit",
  "cast": [
   "elder",
   "outcast",
   "spirit"
  ],
  "place": [
   "wild",
   "holy"
  ],
  "needs": [
   "node",
   "caern",
   "fate",
   "saga"
  ],
  "surface": "A holy hermit in the woods keeps something and wants to hand it on before dying.",
  "want": "An heir worth the burden.",
  "beneath": {
   "mage": "The hermit guards a Node and its Tass.",
   "werewolf": "The stone is a fetish and its spirit picks its bearer.",
   "changeling": "The hermit is a kinain who remembers the old courts.",
   "mortal": "A holy man, and a relic that the bishop wants."
  },
  "complication": "Taking it means being hunted for it.",
  "find": "The hermit's hut holds letters from every age of the wood.",
  "question": "Who is fit to carry it?",
  "cost": "The bearer is marked.",
  "valve": "The hermit will settle for a promise.",
  "fight": "wild",
  "faction": "the church",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-altenhof",
  "title": "The ruins of Altenhof",
  "steps": [
   {
    "key": "s1",
    "title": "Word of it",
    "text": "Someone learns where it is, and tells the wrong person.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "The race",
    "text": "More than one party is after it, and they know of each other.",
    "days": 5
   },
   {
    "key": "s3",
    "title": "Who holds it",
    "text": "It changes hands, by trade, theft or blood.",
    "days": 12
   }
  ],
  "endings": [
   {
    "key": "kept",
    "label": "The players keep it",
    "writes": [
     {
      "to": "tales",
      "what": "A tale of the finding"
     },
     {
      "to": "factions",
      "what": "Its old keepers remember"
     }
    ]
   },
   {
    "key": "returned",
    "label": "It goes home to its keepers",
    "writes": [
     {
      "to": "memory",
      "what": "Its keepers owe a kindness"
     },
     {
      "to": "rumours",
      "what": "Word of an honest deed"
     }
    ]
   },
   {
    "key": "destroyed",
    "label": "No one has it now",
    "writes": [
     {
      "to": "factions",
      "what": "Every party that wanted it is angry"
     },
     {
      "to": "tales",
      "what": "A tale of the loss"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "dread",
  "open": "The fog lifts off Altenhof for one hour, and in that hour the ruins have lights in them.",
  "who": "the last lord's ghost",
  "cast": [
   "dead",
   "family"
  ],
  "place": [
   "grave",
   "fort",
   "wild"
  ],
  "needs": [
   "breach",
   "death",
   "change",
   "saga"
  ],
  "surface": "A burned manor where something of its last family still waits.",
  "want": "Its last secret kept, or told to the right person.",
  "beneath": {
   "wraith": "The ghosts are fettered to the cellar and want the fetter freed or kept.",
   "vampire": "A Tzimisce's old haven, with the earth still in it.",
   "hunter": "The family was burned for witchcraft and the burners were wrong.",
   "mortal": "A treasure in the cellar, and a story that keeps people away."
  },
  "complication": "Someone else is digging there by night.",
  "find": "A family tree that ends with a living name.",
  "question": "What happened at Altenhof, and who still lives because of it?",
  "cost": "Opening the cellar wakes it.",
  "valve": "The old cook in town lived there once.",
  "fight": "grave",
  "faction": "the castle",
  "tags": [
   "fire"
  ],
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-winter-pack",
  "title": "The winter pack",
  "steps": [
   {
    "key": "s1",
    "title": "Signs",
    "text": "Small wrong things: a smell, a missing face, a story that does not fit.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "It spreads",
    "text": "More people are touched by it, and someone powerful notices.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The night it breaks",
    "text": "It comes into the open. Whoever has not chosen a side is chosen for.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "stopped",
    "label": "It is stopped, at a cost",
    "writes": [
     {
      "to": "rumours",
      "what": "Word goes round that it was ended"
     },
     {
      "to": "factions",
      "what": "Those who helped gain standing"
     }
    ]
   },
   {
    "key": "bargain",
    "label": "It is bargained down, not ended",
    "writes": [
     {
      "to": "ledger",
      "what": "A debt is owed to whoever held it back"
     }
    ]
   },
   {
    "key": "lost",
    "label": "It wins this time",
    "writes": [
     {
      "to": "towns",
      "what": "The place is changed for the worse"
     },
     {
      "to": "rumours",
      "what": "A frightened story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "dread",
  "season": [
   "winter"
  ],
  "open": "The wolves came into the town square in daylight and sat, as if waiting to be spoken to.",
  "who": "the grey alpha",
  "cast": [
   "spirit",
   "hunter"
  ],
  "place": [
   "wild",
   "town"
  ],
  "needs": [
   "wyrm",
   "caern",
   "fight",
   "saga"
  ],
  "surface": "A wolf pack, too bold and too clever, presses on the town all winter.",
  "want": "Something the town took back.",
  "beneath": {
   "werewolf": "The pack's alpha is a Lupus Kin, and the caern's spirit is angry.",
   "vampire": "A Gangrel leads the wolves and wants a toll in blood.",
   "mortal": "Starving wolves and a hunting ban that the lord will not lift."
  },
  "complication": "Killing the alpha makes it worse.",
  "find": "A shrine to a wolf spirit under the town's old wall.",
  "question": "What did the town take?",
  "cost": "Giving it back shames the church.",
  "valve": "The hermit can speak to the pack.",
  "fight": "wild",
  "faction": "the sept",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-wedding-no-bride",
  "title": "The wedding with one missing",
  "steps": [
   {
    "key": "s1",
    "title": "The first name",
    "text": "Someone is named. It may be true.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "The crowd grows",
    "text": "More voices join, and old quarrels ride on the new one.",
    "days": 4
   },
   {
    "key": "s3",
    "title": "Judgement",
    "text": "A court, a mob or a cell decides.",
    "days": 10
   }
  ],
  "endings": [
   {
    "key": "truth",
    "label": "The truth is told",
    "writes": [
     {
      "to": "rumours",
      "what": "The true story spreads"
     },
     {
      "to": "memory",
      "what": "The accused remembers who stood by them"
     }
    ]
   },
   {
    "key": "scapegoat",
    "label": "Someone else pays for it",
    "writes": [
     {
      "to": "memory",
      "what": "A grudge against the players"
     },
     {
      "to": "hunters",
      "what": "The watchers are satisfied for now"
     }
    ]
   },
   {
    "key": "exposed",
    "label": "The hidden are exposed instead",
    "writes": [
     {
      "to": "hunters",
      "what": "Hunters gain a lead"
     },
     {
      "to": "rumours",
      "what": "A terrible story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "any",
  "mood": "festive",
  "tags": [
   "romance"
  ],
  "open": "The feast is ready and the guests are drunk, and one of the pair to be wed is gone.",
  "who": "the head of the other family",
  "cast": [
   "family",
   "official"
  ],
  "place": [
   "town",
   "house"
  ],
  "needs": [
   "arrival",
   "tale",
   "rumour",
   "saga"
  ],
  "surface": "The one to be wed has fled or been taken on the eve of a great match.",
  "want": "The match made, whatever the cost.",
  "beneath": {
   "vampire": "A Toreador wanted the betrothed, and the other family owes the Toreador.",
   "changeling": "The betrothed is a changeling's mortal love and has gone to the hill.",
   "mortal": "The betrothed ran from a match never wanted."
  },
  "complication": "Whoever finds the runaway must decide whether to bring them back.",
  "find": "A letter in the runaway's hand, addressed to someone else.",
  "question": "Whose wedding is it?",
  "cost": "Bringing them back is a cruelty; leaving them starts a feud.",
  "valve": "A younger sibling knows where.",
  "fight": "house",
  "faction": "the families",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-lower-mill",
  "title": "The dam at the lower mill",
  "steps": [
   {
    "key": "s1",
    "title": "Signs",
    "text": "Small wrong things: a smell, a missing face, a story that does not fit.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "It spreads",
    "text": "More people are touched by it, and someone powerful notices.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The night it breaks",
    "text": "It comes into the open. Whoever has not chosen a side is chosen for.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "stopped",
    "label": "It is stopped, at a cost",
    "writes": [
     {
      "to": "rumours",
      "what": "Word goes round that it was ended"
     },
     {
      "to": "factions",
      "what": "Those who helped gain standing"
     }
    ]
   },
   {
    "key": "bargain",
    "label": "It is bargained down, not ended",
    "writes": [
     {
      "to": "ledger",
      "what": "A debt is owed to whoever held it back"
     }
    ]
   },
   {
    "key": "lost",
    "label": "It wins this time",
    "writes": [
     {
      "to": "towns",
      "what": "The place is changed for the worse"
     },
     {
      "to": "rumours",
      "what": "A frightened story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "dread",
  "open": "The millpond has dropped three feet in a night, and the mud is full of bones.",
  "who": "the miller's widow",
  "cast": [
   "family",
   "dead"
  ],
  "place": [
   "river",
   "town"
  ],
  "needs": [
   "flood",
   "death",
   "town",
   "saga"
  ],
  "surface": "A failing dam and a drained pond expose an old crime.",
  "want": "The dam mended and the mud covered.",
  "beneath": {
   "wraith": "The drowned are waking, and their fetters are in the mud.",
   "werewolf": "The river spirit is sick, and the dam is choking it.",
   "mortal": "Twenty years ago someone drowned a rival here."
  },
  "complication": "The dam will burst in the spring if nothing is done.",
  "find": "A ring with the Weissen crest.",
  "question": "Who is under the mud?",
  "cost": "Opening the old crime ruins a family.",
  "valve": "The widow will trade the truth for help with the dam.",
  "fight": "river",
  "faction": "the guild",
  "tags": [
   "plague"
  ],
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-missing-child",
  "title": "The missing child",
  "steps": [
   {
    "key": "s1",
    "title": "Signs",
    "text": "Small wrong things: a smell, a missing face, a story that does not fit.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "It spreads",
    "text": "More people are touched by it, and someone powerful notices.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The night it breaks",
    "text": "It comes into the open. Whoever has not chosen a side is chosen for.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "stopped",
    "label": "It is stopped, at a cost",
    "writes": [
     {
      "to": "rumours",
      "what": "Word goes round that it was ended"
     },
     {
      "to": "factions",
      "what": "Those who helped gain standing"
     }
    ]
   },
   {
    "key": "bargain",
    "label": "It is bargained down, not ended",
    "writes": [
     {
      "to": "ledger",
      "what": "A debt is owed to whoever held it back"
     }
    ]
   },
   {
    "key": "lost",
    "label": "It wins this time",
    "writes": [
     {
      "to": "towns",
      "what": "The place is changed for the worse"
     },
     {
      "to": "rumours",
      "what": "A frightened story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "dread",
  "open": "The search for the child has been called off, but the child's lantern is still seen in the fog each night.",
  "who": "the child's mother",
  "cast": [
   "family",
   "stranger"
  ],
  "place": [
   "wild",
   "town"
  ],
  "needs": [
   "death",
   "rumour",
   "change",
   "saga"
  ],
  "surface": "A child is lost in the fog and the town has given up.",
  "want": "The child home, or the truth.",
  "beneath": {
   "changeling": "The child was taken under the hill, and a stock left in their place.",
   "wraith": "The lantern is carried by a ghost who leads the lost home, or away.",
   "mortal": "Someone in the search knows more than they say."
  },
  "complication": "A second child has started to see the lantern too.",
  "find": "Small footprints that stop in the middle of a field.",
  "question": "Is the child alive?",
  "cost": "Following the lantern means leaving the road.",
  "valve": "The old shepherd knows where the fog is thickest.",
  "fight": "wild",
  "faction": "the church",
  "tags": [
   "children"
  ],
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-strange-silver",
  "title": "The silver that was not struck here",
  "steps": [
   {
    "key": "s1",
    "title": "Word of it",
    "text": "Someone learns where it is, and tells the wrong person.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "The race",
    "text": "More than one party is after it, and they know of each other.",
    "days": 5
   },
   {
    "key": "s3",
    "title": "Who holds it",
    "text": "It changes hands, by trade, theft or blood.",
    "days": 12
   }
  ],
  "endings": [
   {
    "key": "kept",
    "label": "The players keep it",
    "writes": [
     {
      "to": "tales",
      "what": "A tale of the finding"
     },
     {
      "to": "factions",
      "what": "Its old keepers remember"
     }
    ]
   },
   {
    "key": "returned",
    "label": "It goes home to its keepers",
    "writes": [
     {
      "to": "memory",
      "what": "Its keepers owe a kindness"
     },
     {
      "to": "rumours",
      "what": "Word of an honest deed"
     }
    ]
   },
   {
    "key": "destroyed",
    "label": "No one has it now",
    "writes": [
     {
      "to": "factions",
      "what": "Every party that wanted it is angry"
     },
     {
      "to": "tales",
      "what": "A tale of the loss"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "any",
  "mood": "uneasy",
  "open": "The coins in the poor box are fresh silver from a mint that closed a hundred years ago.",
  "who": "the mint-master",
  "cast": [
   "merchant",
   "official"
  ],
  "place": [
   "mine",
   "town",
   "market"
  ],
  "needs": [
   "project",
   "rumour",
   "event",
   "saga"
  ],
  "surface": "Old coins are turning up new, and the margrave's mint wants to know why.",
  "want": "The source, before the margrave finds it.",
  "beneath": {
   "mage": "Someone in the Adit has found a way to the past, or to silver that remembers it.",
   "vampire": "An elder is paying old debts in old money.",
   "mortal": "Counterfeiters with a sense of humour."
  },
  "complication": "The margrave's auditor arrives next week.",
  "find": "A coin with a face no one remembers.",
  "question": "Where is the old silver coming from?",
  "cost": "Following it leads under the hill.",
  "valve": "A beggar will sell a coin and a story.",
  "fight": "mine",
  "faction": "the castle",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-seen-the-lady",
  "title": "The one who saw the Lady",
  "steps": [
   {
    "key": "s1",
    "title": "The first name",
    "text": "Someone is named. It may be true.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "The crowd grows",
    "text": "More voices join, and old quarrels ride on the new one.",
    "days": 4
   },
   {
    "key": "s3",
    "title": "Judgement",
    "text": "A court, a mob or a cell decides.",
    "days": 10
   }
  ],
  "endings": [
   {
    "key": "truth",
    "label": "The truth is told",
    "writes": [
     {
      "to": "rumours",
      "what": "The true story spreads"
     },
     {
      "to": "memory",
      "what": "The accused remembers who stood by them"
     }
    ]
   },
   {
    "key": "scapegoat",
    "label": "Someone else pays for it",
    "writes": [
     {
      "to": "memory",
      "what": "A grudge against the players"
     },
     {
      "to": "hunters",
      "what": "The watchers are satisfied for now"
     }
    ]
   },
   {
    "key": "exposed",
    "label": "The hidden are exposed instead",
    "writes": [
     {
      "to": "hunters",
      "what": "Hunters gain a lead"
     },
     {
      "to": "rumours",
      "what": "A terrible story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "any",
  "mood": "sacred",
  "open": "A young pilgrim says the Lady spoke at the shrine, and the bishop has sent someone to make the pilgrim say otherwise.",
  "who": "the pilgrim",
  "cast": [
   "priest",
   "stranger"
  ],
  "place": [
   "holy",
   "church"
  ],
  "needs": [
   "tale",
   "change",
   "trial",
   "saga"
  ],
  "surface": "A vision draws pilgrims and makes the church nervous.",
  "want": "To be believed.",
  "beneath": {
   "hunter": "The vision was true, and it named something in the town.",
   "vampire": "A Kindred with a gift for dreams sent the vision to bring in a herd.",
   "mortal": "A true believer, and a church that cannot have a saint it did not choose."
  },
  "complication": "The pilgrims are bringing money into the town and the town wants them to keep coming.",
  "find": "The shrine's old book records the same vision a century ago.",
  "question": "What did the Lady say?",
  "cost": "Backing the pilgrim angers the bishop.",
  "valve": "The old priest believes the pilgrim.",
  "fight": "church",
  "faction": "the church",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-knight-duel",
  "title": "The knight who wanted a duel",
  "steps": [
   {
    "key": "s1",
    "title": "An insult",
    "text": "An old wound is opened by a new slight.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "Blood",
    "text": "Someone is hurt, and both sides count it.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The reckoning",
    "text": "The feud must end, grow, or pass to the next generation.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "peace",
    "label": "Peace is made",
    "writes": [
     {
      "to": "factions",
      "what": "Both sides owe the peacemakers"
     },
     {
      "to": "tales",
      "what": "A tale of the peace"
     }
    ]
   },
   {
    "key": "fall",
    "label": "One side falls",
    "writes": [
     {
      "to": "memory",
      "what": "The survivors remember who helped"
     },
     {
      "to": "towns",
      "what": "The place changes hands"
     }
    ]
   },
   {
    "key": "passes",
    "label": "The feud passes on",
    "writes": [
     {
      "to": "rumours",
      "what": "The quarrel lives on in talk"
     },
     {
      "to": "memory",
      "what": "Grudges carry to the heirs"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "any",
  "mood": "dread",
  "open": "The knight has hung a glove on the church door with a player character's name under it.",
  "who": "the knight",
  "cast": [
   "soldier",
   "family"
  ],
  "place": [
   "town",
   "fort"
  ],
  "needs": [
   "grudge",
   "fight",
   "debt",
   "saga"
  ],
  "surface": "A knight demands a duel over an insult, real or made up.",
  "want": "Honour, or a death that looks like honour.",
  "beneath": {
   "vampire": "The knight is a Brujah's pawn and the duel is a test of the players.",
   "mortal": "The knight is broke and needs a famous win.",
   "hunter": "The knight saw something at night and wants to prove it with a sword."
  },
  "complication": "Refusing is cowardice in the eyes of the town.",
  "find": "The knight's squire has doubts.",
  "question": "Can honour be satisfied without blood?",
  "cost": "Winning makes enemies; losing makes a grave.",
  "valve": "The bishop can forbid the duel, for a favour.",
  "fight": "town",
  "faction": "the castle",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-dolany-witch",
  "title": "The witch of Dolany",
  "steps": [
   {
    "key": "s1",
    "title": "The first name",
    "text": "Someone is named. It may be true.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "The crowd grows",
    "text": "More voices join, and old quarrels ride on the new one.",
    "days": 4
   },
   {
    "key": "s3",
    "title": "Judgement",
    "text": "A court, a mob or a cell decides.",
    "days": 10
   }
  ],
  "endings": [
   {
    "key": "truth",
    "label": "The truth is told",
    "writes": [
     {
      "to": "rumours",
      "what": "The true story spreads"
     },
     {
      "to": "memory",
      "what": "The accused remembers who stood by them"
     }
    ]
   },
   {
    "key": "scapegoat",
    "label": "Someone else pays for it",
    "writes": [
     {
      "to": "memory",
      "what": "A grudge against the players"
     },
     {
      "to": "hunters",
      "what": "The watchers are satisfied for now"
     }
    ]
   },
   {
    "key": "exposed",
    "label": "The hidden are exposed instead",
    "writes": [
     {
      "to": "hunters",
      "what": "Hunters gain a lead"
     },
     {
      "to": "rumours",
      "what": "A terrible story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "dread",
  "open": "They have the healer of Dolany tied to the well, and they are waiting for the priest to say the word.",
  "who": "the accused healer",
  "cast": [
   "outcast",
   "priest",
   "family"
  ],
  "place": [
   "town",
   "holy"
  ],
  "needs": [
   "hunters",
   "trial",
   "arrest",
   "saga"
  ],
  "surface": "A village accuses a healer of witchcraft after a death.",
  "want": "Someone to blame for the death.",
  "beneath": {
   "mage": "The healer is a Verbena, and their Avatar knows the players.",
   "hunter": "The real witch is the one who started the shouting.",
   "werewolf": "The healer is Kinfolk and the sept will come for the mob.",
   "mortal": "An old healer who knew too much about herbs."
  },
  "complication": "The dead child's parents are good people.",
  "find": "The death came from the black grain, not from a curse.",
  "question": "Who killed the child?",
  "cost": "Saving the healer means facing the mob.",
  "valve": "The reeve can be persuaded to send for a court.",
  "fight": "town",
  "faction": "the church",
  "tags": [
   "children",
   "mob"
  ],
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-blind-cross",
  "title": "The blind man at the cross",
  "steps": [
   {
    "key": "s1",
    "title": "The bill",
    "text": "An old bargain falls due, and the one who made it is not the one who must pay.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "The price grows",
    "text": "Refusing has a cost, and the cost is shown.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "Due",
    "text": "Pay, break or remake the bargain tonight.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "paid",
    "label": "The price is paid",
    "writes": [
     {
      "to": "ledger",
      "what": "What was paid is gone"
     },
     {
      "to": "memory",
      "what": "The creditor is satisfied"
     }
    ]
   },
   {
    "key": "broken",
    "label": "The bargain is broken",
    "writes": [
     {
      "to": "memory",
      "what": "A powerful grudge"
     },
     {
      "to": "rumours",
      "what": "Word that a pact was broken"
     }
    ]
   },
   {
    "key": "remade",
    "label": "A new bargain is struck",
    "writes": [
     {
      "to": "ledger",
      "what": "A new debt, longer and stranger"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "any",
  "mood": "dread",
  "open": "The blind man at the crossroads knows the players' names, and their real names too.",
  "who": "blind Havel",
  "cast": [
   "stranger",
   "spirit"
  ],
  "place": [
   "road",
   "holy"
  ],
  "needs": [
   "fate",
   "lifepath",
   "hook",
   "saga"
  ],
  "surface": "A blind beggar at the crossroads tells fortunes that come true.",
  "want": "Something only a player character can give.",
  "beneath": {
   "wraith": "Havel speaks for the dead and the dead have a message.",
   "changeling": "Havel is a Sluagh's eyes in the waking world.",
   "vampire": "Havel is a Malkavian's oracle, and every fortune is a move in a game.",
   "mortal": "A clever beggar with a network of children."
  },
  "complication": "The fortune told is bad, and coming true.",
  "find": "Havel was not born blind.",
  "question": "What does Havel want for the rest of the fortune?",
  "cost": "The rest of the fortune has a price.",
  "valve": "Havel will speak plainly to someone who sits all night.",
  "fight": "road",
  "faction": "the dead",
  "tags": [
   "children"
  ],
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-high-woods",
  "title": "The thing in the high woods",
  "steps": [
   {
    "key": "s1",
    "title": "Signs",
    "text": "Small wrong things: a smell, a missing face, a story that does not fit.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "It spreads",
    "text": "More people are touched by it, and someone powerful notices.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The night it breaks",
    "text": "It comes into the open. Whoever has not chosen a side is chosen for.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "stopped",
    "label": "It is stopped, at a cost",
    "writes": [
     {
      "to": "rumours",
      "what": "Word goes round that it was ended"
     },
     {
      "to": "factions",
      "what": "Those who helped gain standing"
     }
    ]
   },
   {
    "key": "bargain",
    "label": "It is bargained down, not ended",
    "writes": [
     {
      "to": "ledger",
      "what": "A debt is owed to whoever held it back"
     }
    ]
   },
   {
    "key": "lost",
    "label": "It wins this time",
    "writes": [
     {
      "to": "towns",
      "what": "The place is changed for the worse"
     },
     {
      "to": "rumours",
      "what": "A frightened story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "tense",
  "open": "The charcoal burners have left the high woods, all of them, in one night, without their tools.",
  "who": "the charcoal burners' headman",
  "cast": [
   "outcast",
   "spirit"
  ],
  "place": [
   "wild",
   "mine"
  ],
  "needs": [
   "wyrm",
   "breach",
   "change",
   "saga"
  ],
  "surface": "Something in the high woods has driven out the people who work there.",
  "want": "To go home.",
  "beneath": {
   "werewolf": "A Bane has come up from the Adit into the woods.",
   "mage": "The Gauntlet is thin, and something came through.",
   "wraith": "A Spectre walks the woods, and the burners saw it.",
   "mortal": "Bandits dressed as monsters."
  },
  "complication": "The castle wants its charcoal by the end of the month.",
  "find": "Burned trees in a perfect circle.",
  "question": "What came out of the hill?",
  "cost": "Going up there means a night in the woods.",
  "valve": "The headman's son stayed behind.",
  "fight": "wild",
  "faction": "the sept",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-margrave-auditor",
  "title": "The margrave's auditor",
  "steps": [
   {
    "key": "s1",
    "title": "The first name",
    "text": "Someone is named. It may be true.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "The crowd grows",
    "text": "More voices join, and old quarrels ride on the new one.",
    "days": 4
   },
   {
    "key": "s3",
    "title": "Judgement",
    "text": "A court, a mob or a cell decides.",
    "days": 10
   }
  ],
  "endings": [
   {
    "key": "truth",
    "label": "The truth is told",
    "writes": [
     {
      "to": "rumours",
      "what": "The true story spreads"
     },
     {
      "to": "memory",
      "what": "The accused remembers who stood by them"
     }
    ]
   },
   {
    "key": "scapegoat",
    "label": "Someone else pays for it",
    "writes": [
     {
      "to": "memory",
      "what": "A grudge against the players"
     },
     {
      "to": "hunters",
      "what": "The watchers are satisfied for now"
     }
    ]
   },
   {
    "key": "exposed",
    "label": "The hidden are exposed instead",
    "writes": [
     {
      "to": "hunters",
      "what": "Hunters gain a lead"
     },
     {
      "to": "rumours",
      "what": "A terrible story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "uneasy",
  "open": "The margrave's auditor has a list of everyone who has not paid, and a second list no one is allowed to see.",
  "who": "the auditor",
  "cast": [
   "official",
   "scholar"
  ],
  "place": [
   "court",
   "town",
   "fort"
  ],
  "needs": [
   "law",
   "seat",
   "event",
   "saga"
  ],
  "surface": "An auditor from the margrave counts the town's debts and finds more than money.",
  "want": "A reason to replace the town's masters.",
  "beneath": {
   "vampire": "The auditor is a Ventrue's eyes, counting the Prince's herd.",
   "hunter": "The second list is of those who do not age.",
   "mortal": "An honest official in a town that cannot afford honesty."
  },
  "complication": "The auditor asks the players to help.",
  "find": "The second list has a player character's name on it.",
  "question": "Who is the auditor really working for?",
  "cost": "Helping the auditor betrays the town.",
  "valve": "The auditor's clerk can be bought.",
  "fight": "court",
  "faction": "the castle",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-silver-adit",
  "title": "What sleeps under the hill",
  "steps": [
   {
    "key": "s1",
    "title": "Signs",
    "text": "Small wrong things: a smell, a missing face, a story that does not fit.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "It spreads",
    "text": "More people are touched by it, and someone powerful notices.",
    "days": 7
   },
   {
    "key": "s3",
    "title": "The night it breaks",
    "text": "It comes into the open. Whoever has not chosen a side is chosen for.",
    "days": 14
   }
  ],
  "endings": [
   {
    "key": "stopped",
    "label": "It is stopped, at a cost",
    "writes": [
     {
      "to": "rumours",
      "what": "Word goes round that it was ended"
     },
     {
      "to": "factions",
      "what": "Those who helped gain standing"
     }
    ]
   },
   {
    "key": "bargain",
    "label": "It is bargained down, not ended",
    "writes": [
     {
      "to": "ledger",
      "what": "A debt is owed to whoever held it back"
     }
    ]
   },
   {
    "key": "lost",
    "label": "It wins this time",
    "writes": [
     {
      "to": "towns",
      "what": "The place is changed for the worse"
     },
     {
      "to": "rumours",
      "what": "A frightened story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1300,
  "from": 1190,
  "role": "anchor",
  "mood": "dread",
  "open": "The miners will not go below the third gallery, and the ones who did came back speaking a language no one taught them.",
  "who": "the mine reeve",
  "cast": [
   "family",
   "elder",
   "dead"
  ],
  "place": [
   "mine",
   "grave"
  ],
  "needs": [
   "change",
   "wyrm",
   "cult",
   "breach",
   "saga"
  ],
  "surface": "The Silver Adit has broken into something older than the town.",
  "want": "The silver to keep coming.",
  "beneath": {
   "vampire": "Konrad's work, and an elder sleeping in the earth.",
   "werewolf": "The Wyrm's breath rises from the deep galleries.",
   "mage": "A wrong pattern, an old Node twisted.",
   "wraith": "The galleries open onto the Shadowlands.",
   "mortal": "Bad air, and a reeve who sends people down anyway."
  },
  "complication": "The silver is the town's life.",
  "find": "A carved door with the old Moravian cross upside down.",
  "question": "Close the Adit and starve the town, or keep digging?",
  "cost": "Sealing the Adit ruins the town's trade.",
  "valve": "An old miner knows the lost map.",
  "fight": "mine",
  "faction": "the guild",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-lantern-flame",
  "title": "The lantern and the flame",
  "steps": [
   {
    "key": "s1",
    "title": "The first name",
    "text": "Someone is named. It may be true.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "The crowd grows",
    "text": "More voices join, and old quarrels ride on the new one.",
    "days": 4
   },
   {
    "key": "s3",
    "title": "Judgement",
    "text": "A court, a mob or a cell decides.",
    "days": 10
   }
  ],
  "endings": [
   {
    "key": "truth",
    "label": "The truth is told",
    "writes": [
     {
      "to": "rumours",
      "what": "The true story spreads"
     },
     {
      "to": "memory",
      "what": "The accused remembers who stood by them"
     }
    ]
   },
   {
    "key": "scapegoat",
    "label": "Someone else pays for it",
    "writes": [
     {
      "to": "memory",
      "what": "A grudge against the players"
     },
     {
      "to": "hunters",
      "what": "The watchers are satisfied for now"
     }
    ]
   },
   {
    "key": "exposed",
    "label": "The hidden are exposed instead",
    "writes": [
     {
      "to": "hunters",
      "what": "Hunters gain a lead"
     },
     {
      "to": "rumours",
      "what": "A terrible story spreads"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1350,
  "from": 1190,
  "role": "anchor",
  "mood": "tense",
  "open": "A lantern on the ferry signals the wrong way, and the heretics on the far bank are waiting for it.",
  "who": "the ferryman",
  "cast": [
   "priest",
   "outcast",
   "family"
  ],
  "place": [
   "river",
   "church"
  ],
  "needs": [
   "hunters",
   "cult",
   "trial",
   "saga"
  ],
  "surface": "Heretics hide across the river and the inquisitors are close.",
  "want": "Safe passage for the hunted, or their names.",
  "beneath": {
   "vampire": "The heretics shelter a Kindred, and the Prince wants them all gone.",
   "hunter": "The inquisitors are not all mortal.",
   "mortal": "Families on both banks, and a ferryman who has to choose."
  },
  "complication": "An informant is among the heretics.",
  "find": "The lantern code, written in a psalter.",
  "question": "Who do the players hand to the fire?",
  "cost": "Every choice burns someone.",
  "valve": "The chapter-house has a back door.",
  "fight": "river",
  "faction": "the church",
  "tags": [
   "fire"
  ],
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-patriarch-dream",
  "title": "The patriarch's last dream",
  "steps": [
   {
    "key": "s1",
    "title": "Setting out",
    "text": "The road is chosen and the company gathers. Someone in it has a secret.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "Halfway",
    "text": "The road turns against them: weather, raiders, a stranger who knows too much.",
    "days": 5
   },
   {
    "key": "s3",
    "title": "Arrival",
    "text": "They reach the end, or what is left of them does.",
    "days": 10
   }
  ],
  "endings": [
   {
    "key": "arrived",
    "label": "They arrive as hoped",
    "writes": [
     {
      "to": "tales",
      "what": "A tale of the road"
     },
     {
      "to": "factions",
      "what": "Whoever waited is grateful"
     }
    ]
   },
   {
    "key": "turned",
    "label": "They turn back",
    "writes": [
     {
      "to": "memory",
      "what": "Whoever waited is let down"
     }
    ]
   },
   {
    "key": "changed",
    "label": "They arrive, changed by the road",
    "writes": [
     {
      "to": "tales",
      "what": "A strange tale of the road"
     },
     {
      "to": "rumours",
      "what": "Questions about what they found"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1400,
  "from": 1190,
  "role": "anchor",
  "mood": "sacred",
  "open": "An envoy from the south carries a dying patriarch's last request, and it names the players.",
  "who": "the envoy",
  "cast": [
   "priest",
   "elder",
   "stranger"
  ],
  "place": [
   "road",
   "court",
   "holy"
  ],
  "needs": [
   "arrival",
   "fate",
   "seat",
   "saga"
  ],
  "surface": "A long road south to a city across the water, where an old power is dying.",
  "want": "The dream fulfilled, or ended.",
  "beneath": {
   "vampire": "The patriarch is an elder of the Dream, and the succession is a war.",
   "mage": "The dream is a working that needs living hands.",
   "mortal": "A dying churchman and the people waiting to inherit."
  },
  "complication": "The road south is watched.",
  "find": "A covenant signed by three powers.",
  "question": "What was the patriarch's dream, and who will inherit it?",
  "cost": "The journey takes a season.",
  "valve": "The humble man on the road can be trusted.",
  "fight": "road",
  "faction": "the church",
  "chronicle": "rothenstein"
 },
 {
  "key": "roth-road-enoch",
  "title": "The road to Enoch",
  "steps": [
   {
    "key": "s1",
    "title": "Setting out",
    "text": "The road is chosen and the company gathers. Someone in it has a secret.",
    "days": 0
   },
   {
    "key": "s2",
    "title": "Halfway",
    "text": "The road turns against them: weather, raiders, a stranger who knows too much.",
    "days": 5
   },
   {
    "key": "s3",
    "title": "Arrival",
    "text": "They reach the end, or what is left of them does.",
    "days": 10
   }
  ],
  "endings": [
   {
    "key": "arrived",
    "label": "They arrive as hoped",
    "writes": [
     {
      "to": "tales",
      "what": "A tale of the road"
     },
     {
      "to": "factions",
      "what": "Whoever waited is grateful"
     }
    ]
   },
   {
    "key": "turned",
    "label": "They turn back",
    "writes": [
     {
      "to": "memory",
      "what": "Whoever waited is let down"
     }
    ]
   },
   {
    "key": "changed",
    "label": "They arrive, changed by the road",
    "writes": [
     {
      "to": "tales",
      "what": "A strange tale of the road"
     },
     {
      "to": "rumours",
      "what": "Questions about what they found"
     }
    ]
   }
  ],
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "wodx",
  "to": 1400,
  "from": 1190,
  "role": "anchor",
  "mood": "dread",
  "open": "The ledger says the first city was never lost, only moved, and it gives the road.",
  "who": "a scribe",
  "cast": [
   "scholar",
   "elder",
   "stranger"
  ],
  "place": [
   "road",
   "holy",
   "grave"
  ],
  "needs": [
   "project",
   "fate",
   "rumour",
   "saga"
  ],
  "surface": "A ledger points east, toward the oldest city of the Kindred legends.",
  "want": "The city found, or the ledger burned.",
  "beneath": {
   "vampire": "The Scribes of Nod want the road; the Sabbat want the scribes.",
   "mage": "The road is a ley line and the city is a Horizon realm.",
   "mortal": "A scholar's obsession and a long road east."
  },
  "complication": "A black-wax letter warns them off, signed by someone who should be dead.",
  "find": "The marshes hold a library.",
  "question": "Is Enoch real, and should it be found?",
  "cost": "Every step east costs the road home.",
  "valve": "The Iron Gates can be passed by river.",
  "fight": "road",
  "faction": "the scribes",
  "tags": [
   "fire"
  ],
  "chronicle": "rothenstein"
 }
];
