/**
 * Threads of Fate hook cards (B3650-B3656), made by the build script kept with the project files
 * (story-weaver/build_cards.py). Own words; no book text. Groups: the 45 world regions
 * (r-<region> and r-<region>-alt), line doors for twists (door-), and a player's own threads (own-). A chronicle's own cards live in its module (Rothenstein's roth- cards: wodx-rothenstein/data/cards.mjs).
 * The Storyteller can add, change, refuse or lock any card in play; the Storyteller's lines always win.
 */
export const CARDS = [
 {
  "key": "r-moravia",
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
  "role": "anchor",
  "open": "Someone dug too deep, and the earth answered in a voice.",
  "surface": "Old graves of Great Moravia lie under the towns, and every age digs into them.",
  "want": "To keep digging.",
  "question": "What did the digging wake?",
  "complication": "The diggers are paid well, and will not stop.",
  "needs": [
   "change",
   "breach",
   "wyrm"
  ],
  "place": [
   "mine",
   "grave"
  ],
  "cast": [
   "family",
   "dead"
  ],
  "beneath": {
   "vampire": "An elder slept in that earth.",
   "werewolf": "A Wyrm pit under the hill.",
   "wraith": "The diggers broke into the Shadowlands.",
   "mortal": "Bad air and a foreman who lies."
  },
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "history"
 },
 {
  "key": "r-moravia-alt",
  "title": "The heretic's hidden chalice",
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
  "role": "any",
  "surface": "A forbidden faith kept in secret through every age, and a chalice that proves it.",
  "needs": [
   "hunters",
   "cult",
   "arrest"
  ],
  "place": [
   "church",
   "house"
  ],
  "cast": [
   "family",
   "priest"
  ],
  "beneath": {
   "hunter": "The chalice burns the hands of the Damned.",
   "mortal": "A family's faith, and a neighbour who would sell them."
  },
  "regions": [
   "moravia"
  ],
  "region": "moravia",
  "src": "history"
 },
 {
  "key": "r-german-lands",
  "title": "The charter and the wall",
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
  "role": "anchor",
  "open": "The charter says the streets are the council's, and the bishop has burned the charter.",
  "surface": "Two powers claim the same city, and a paper decides it.",
  "want": "The paper, delivered or destroyed.",
  "question": "Who rules the streets?",
  "complication": "Carrying the paper makes the carrier a target.",
  "needs": [
   "seat",
   "law",
   "war"
  ],
  "place": [
   "court",
   "town"
  ],
  "cast": [
   "official",
   "merchant"
  ],
  "beneath": {
   "vampire": "Two Princes, one city.",
   "mortal": "Council against prince, faith against faith, east against west.",
   "mage": "The charter is bound with a working."
  },
  "regions": [
   "german-lands"
  ],
  "region": "german-lands",
  "src": "history",
  "tags": [
   "fire"
  ]
 },
 {
  "key": "r-german-lands-alt",
  "title": "The ledger of the guild",
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
  "role": "any",
  "surface": "A merchant house's book names who owes the Ventrue.",
  "needs": [
   "debt",
   "project",
   "rumour"
  ],
  "place": [
   "market",
   "house"
  ],
  "cast": [
   "merchant",
   "elder"
  ],
  "beneath": {
   "vampire": "Every debt in it is a boon.",
   "mortal": "A book that could ruin half the city."
  },
  "regions": [
   "german-lands"
  ],
  "region": "german-lands",
  "src": "history"
 },
 {
  "key": "r-british-isles",
  "title": "A bargain under the hill",
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
  "role": "anchor",
  "open": "The road crew found the mound, and that night the foreman's child was gone.",
  "surface": "A road, a field or a mill is built over an old place, and an old bargain falls due.",
  "want": "What was promised long ago.",
  "question": "Who made the bargain, and who pays?",
  "complication": "The price was a name, and the name is a player character's.",
  "needs": [
   "debt",
   "town",
   "breach"
  ],
  "place": [
   "wild",
   "holy"
  ],
  "cast": [
   "spirit",
   "family"
  ],
  "beneath": {
   "changeling": "The sidhe of the hill want what is theirs.",
   "werewolf": "The mound is a caern of the Fianna.",
   "mortal": "An old family's secret, and a debt of land."
  },
  "regions": [
   "british-isles"
  ],
  "region": "british-isles",
  "src": "history",
  "tags": [
   "children"
  ]
 },
 {
  "key": "r-british-isles-alt",
  "title": "The border reivers' feud",
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
  "role": "any",
  "surface": "Two families on either side of a border, kept at war by something that feeds on it.",
  "needs": [
   "grudge",
   "fight",
   "war"
  ],
  "place": [
   "road",
   "fort"
  ],
  "cast": [
   "family",
   "soldier"
  ],
  "beneath": {
   "vampire": "A Kindred feeds on the raids.",
   "wraith": "The dead of the feud will not rest until it ends."
  },
  "regions": [
   "british-isles"
  ],
  "region": "british-isles",
  "src": "history"
 },
 {
  "key": "r-france",
  "title": "The lists of the condemned",
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
  "role": "anchor",
  "open": "A name is being added to the list tonight, and the ink is still wet.",
  "surface": "Someone writes a list: heretics, nobles, collaborators. A name on it is death.",
  "want": "A name taken off, or put on.",
  "question": "Whose name is next?",
  "complication": "Taking a name off means putting another on.",
  "needs": [
   "hunters",
   "trial",
   "arrest"
  ],
  "place": [
   "court",
   "grave"
  ],
  "cast": [
   "official",
   "priest"
  ],
  "beneath": {
   "vampire": "The list cleans the Prince's enemies out of the city.",
   "wraith": "The catacombs hold everyone the lists killed.",
   "hunter": "The listmaker knows what walks at night.",
   "mortal": "Fear, and neighbours who use it."
  },
  "regions": [
   "france"
  ],
  "region": "france",
  "src": "history"
 },
 {
  "key": "r-france-alt",
  "title": "The court of love",
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
  "role": "any",
  "surface": "A salon where a poem or a portrait can ruin a reputation.",
  "needs": [
   "tale",
   "rumour",
   "grudge"
  ],
  "place": [
   "court",
   "house"
  ],
  "cast": [
   "elder",
   "family"
  ],
  "beneath": {
   "vampire": "A Toreador salon, and a rivalry of centuries.",
   "changeling": "A troubadour of the Seelie Court plays for keeps."
  },
  "regions": [
   "france"
  ],
  "region": "france",
  "src": "history",
  "tags": [
   "romance"
  ]
 },
 {
  "key": "r-iberia",
  "title": "The hidden faith",
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
  "role": "anchor",
  "open": "The old prayers were heard through the wall, and the neighbour has gone to the tribunal.",
  "surface": "A family kept its old faith after a forced conversion, and now someone threatens to expose it.",
  "want": "The family safe.",
  "question": "Who will speak for them?",
  "complication": "A player character owes them a debt, or shares their blood.",
  "needs": [
   "hunters",
   "trial",
   "cult"
  ],
  "place": [
   "house",
   "church"
  ],
  "cast": [
   "family",
   "priest"
  ],
  "beneath": {
   "hunter": "The tribunal hunts more than heretics.",
   "vampire": "A Lasombra uses the tribunal as a weapon.",
   "mortal": "Old faith, new fear."
  },
  "regions": [
   "iberia"
  ],
  "region": "iberia",
  "src": "history"
 },
 {
  "key": "r-iberia-alt",
  "title": "The frontier castle",
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
  "role": "any",
  "surface": "A castle that changes hands every generation, and its master who never does.",
  "needs": [
   "war",
   "seat",
   "fight"
  ],
  "place": [
   "fort",
   "road"
  ],
  "cast": [
   "soldier",
   "elder"
  ],
  "beneath": {
   "vampire": "The master is the same Kindred under every banner.",
   "mortal": "A garrison that has learned to change flags."
  },
  "regions": [
   "iberia"
  ],
  "region": "iberia",
  "src": "history"
 },
 {
  "key": "r-italy",
  "title": "The vendetta",
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
  "role": "anchor",
  "open": "The wedding was meant to end it, and the groom was found at dawn with a knife in the back.",
  "surface": "Two families have killed each other's children for generations.",
  "want": "Blood for blood.",
  "question": "Can it end?",
  "complication": "A player character is drawn in by marriage or debt.",
  "needs": [
   "grudge",
   "fight",
   "death"
  ],
  "place": [
   "town",
   "house"
  ],
  "cast": [
   "family",
   "elder"
  ],
  "beneath": {
   "vampire": "The Giovanni profit from every death.",
   "wraith": "The dead of both families want it to go on.",
   "mortal": "Pride, and the land that started it."
  },
  "regions": [
   "italy"
  ],
  "region": "italy",
  "src": "history",
  "tags": [
   "children",
   "romance"
  ]
 },
 {
  "key": "r-italy-alt",
  "title": "The Doge's mask",
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
  "role": "any",
  "surface": "A masked carnival where one death can pass for an accident.",
  "needs": [
   "death",
   "rumour",
   "fate"
  ],
  "place": [
   "town",
   "court"
  ],
  "cast": [
   "official",
   "stranger"
  ],
  "beneath": {
   "vampire": "Masks hide the Kindred too.",
   "mortal": "Carnival, and a debt paid in the crowd."
  },
  "regions": [
   "italy"
  ],
  "region": "italy",
  "src": "history"
 },
 {
  "key": "r-low-countries",
  "title": "The sea takes back the land",
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
  "role": "anchor",
  "open": "The dike-reeve's lantern went out in the storm, and no one has seen the reeve since.",
  "surface": "A dike is failing, and someone is letting it fail on purpose.",
  "want": "The land drowned for profit.",
  "question": "Who wants the village under water?",
  "complication": "Mending the dike takes more hands than the village has.",
  "needs": [
   "flood",
   "town",
   "project"
  ],
  "place": [
   "sea",
   "town"
  ],
  "cast": [
   "official",
   "family"
  ],
  "beneath": {
   "werewolf": "Something lies under the fields that the sea is meant to drown.",
   "vampire": "A domain, bought by flood.",
   "mortal": "A wager on a drowning."
  },
  "regions": [
   "low-countries"
  ],
  "region": "low-countries",
  "src": "history"
 },
 {
  "key": "r-low-countries-alt",
  "title": "The bubble",
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
  "role": "any",
  "surface": "A speculation that will make or ruin a character, run by someone who knows when it will burst.",
  "needs": [
   "project",
   "debt",
   "rumour"
  ],
  "place": [
   "market",
   "house"
  ],
  "cast": [
   "merchant",
   "stranger"
  ],
  "beneath": {
   "vampire": "A Ventrue sells before the fall.",
   "mage": "The prices follow a working."
  },
  "regions": [
   "low-countries"
  ],
  "region": "low-countries",
  "src": "history"
 },
 {
  "key": "r-scandinavia",
  "title": "The winter that will not end",
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
  "role": "anchor",
  "open": "A wolf walked through the market at noon, and the priest's bell would not ring.",
  "surface": "Signs of the end from the old songs, read one way by the Fenrir, another by the church.",
  "want": "The signs answered.",
  "question": "Is it the end?",
  "complication": "Each side means to make the signs come true their way.",
  "needs": [
   "change",
   "wyrm",
   "fate"
  ],
  "place": [
   "wild",
   "holy"
  ],
  "cast": [
   "spirit",
   "priest"
  ],
  "beneath": {
   "werewolf": "The Get of Fenris read it as the last battle.",
   "wraith": "A ship of the dead in the fjord.",
   "mortal": "A long winter and a hungry people."
  },
  "regions": [
   "scandinavia"
  ],
  "region": "scandinavia",
  "src": "history"
 },
 {
  "key": "r-scandinavia-alt",
  "title": "The saga's lie",
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
  "role": "any",
  "surface": "A famous saga hides who really killed whom, and the dead want it told.",
  "needs": [
   "tale",
   "death",
   "fate"
  ],
  "place": [
   "house",
   "grave"
  ],
  "cast": [
   "dead",
   "family"
  ],
  "beneath": {
   "wraith": "The murdered dead are fettered to the lie.",
   "mortal": "A family's honour rests on a story."
  },
  "regions": [
   "scandinavia"
  ],
  "region": "scandinavia",
  "src": "history"
 },
 {
  "key": "r-poland-baltic",
  "title": "The last sacred grove",
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
  "role": "anchor",
  "open": "The surveyors have marked the oak, and the grove's keepers have marked the surveyors.",
  "surface": "A grove kept since before the crusades is wanted by someone.",
  "want": "The grove cut down.",
  "question": "Who keeps the grove?",
  "complication": "The keepers ask for help, or ask the players to look away.",
  "needs": [
   "town",
   "war",
   "caern"
  ],
  "place": [
   "wild",
   "holy"
  ],
  "cast": [
   "spirit",
   "outcast"
  ],
  "beneath": {
   "werewolf": "The grove is a caern, and its spirit is old.",
   "mage": "A Node of the old gods.",
   "mortal": "Old folk, and a new landlord."
  },
  "regions": [
   "poland-baltic"
  ],
  "region": "poland-baltic",
  "src": "history"
 },
 {
  "key": "r-poland-baltic-alt",
  "title": "The partition's heir",
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
  "role": "any",
  "surface": "A family split between three empires that each want the same heirloom.",
  "needs": [
   "fate",
   "arrival",
   "seat"
  ],
  "place": [
   "house",
   "court"
  ],
  "cast": [
   "family",
   "official"
  ],
  "beneath": {
   "vampire": "The heirloom is a Kindred's prize.",
   "mortal": "Three cousins and one inheritance."
  },
  "regions": [
   "poland-baltic"
  ],
  "region": "poland-baltic",
  "src": "history"
 },
 {
  "key": "r-carpathians-balkans",
  "title": "Two masters on the border",
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
  "role": "anchor",
  "open": "Both masters sent collectors this month, and the village has only one harvest.",
  "surface": "A frontier village serves two masters, and each wants proof against the other.",
  "want": "Proof of the other master's work.",
  "question": "Which master does the village serve?",
  "complication": "The villagers pay for every answer.",
  "needs": [
   "war",
   "hunters",
   "seat"
  ],
  "place": [
   "town",
   "fort"
  ],
  "cast": [
   "official",
   "family"
  ],
  "beneath": {
   "vampire": "Tzimisce and Tremere, voivode and chantry.",
   "mortal": "Prince and sultan, state and secret police.",
   "werewolf": "The sept serves neither."
  },
  "regions": [
   "carpathians-balkans"
  ],
  "region": "carpathians-balkans",
  "src": "history"
 },
 {
  "key": "r-carpathians-balkans-alt",
  "title": "The fleshcrafted garrison",
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
  "role": "any",
  "surface": "Soldiers who are more than soldiers, and a deserter who wants out.",
  "needs": [
   "fight",
   "war",
   "breach"
  ],
  "place": [
   "fort",
   "wild"
  ],
  "cast": [
   "soldier",
   "outcast"
  ],
  "beneath": {
   "vampire": "A Tzimisce's war ghouls.",
   "mortal": "A deserter's story no one believes."
  },
  "regions": [
   "carpathians-balkans"
  ],
  "region": "carpathians-balkans",
  "src": "history",
  "tags": [
   "cannibalism"
  ]
 },
 {
  "key": "r-russia",
  "title": "Tribute to the far master",
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
  "role": "anchor",
  "open": "The collectors came with sledges, and this year one of the sledges is for people.",
  "surface": "A town owes tribute to a power far away, and this year's tribute is not money.",
  "want": "Its tribute, in full.",
  "question": "What is the tribute, and who pays it?",
  "complication": "Refusing brings the master's army.",
  "needs": [
   "law",
   "seat",
   "debt"
  ],
  "place": [
   "town",
   "road"
  ],
  "cast": [
   "official",
   "family"
  ],
  "beneath": {
   "vampire": "The tribute is blood for an elder in the capital.",
   "mage": "The master is a Technocracy station.",
   "mortal": "Horde, Tsar or Party."
  },
  "regions": [
   "russia"
  ],
  "region": "russia",
  "src": "history"
 },
 {
  "key": "r-russia-alt",
  "title": "The winter road",
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
  "role": "any",
  "surface": "A sledge journey across frozen rivers with a passenger who must not arrive.",
  "needs": [
   "arrival",
   "war",
   "fate"
  ],
  "place": [
   "road",
   "river"
  ],
  "cast": [
   "stranger",
   "soldier"
  ],
  "beneath": {
   "vampire": "The passenger is a Kindred courier.",
   "mortal": "A fugitive, and those who hunt them."
  },
  "regions": [
   "russia"
  ],
  "region": "russia",
  "src": "history"
 },
 {
  "key": "r-aegean",
  "title": "The relic that changed hands",
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
  "role": "anchor",
  "open": "The icon in the dealer's window weeps on feast days, and the dealer is frightened.",
  "surface": "A relic carried off in a sack, a sale or a theft still works for someone.",
  "want": "The relic home.",
  "question": "Who should keep it?",
  "complication": "Its old keepers want it, and so does its new owner.",
  "needs": [
   "event",
   "rumour",
   "cult"
  ],
  "place": [
   "holy",
   "market"
  ],
  "cast": [
   "priest",
   "merchant"
  ],
  "beneath": {
   "vampire": "The Dream wants it for Byzantium's return.",
   "mage": "The relic is a Wonder.",
   "mortal": "A holy thing in a dealer's shop."
  },
  "regions": [
   "aegean"
  ],
  "region": "aegean",
  "src": "history"
 },
 {
  "key": "r-aegean-alt",
  "title": "The fallen dream",
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
  "role": "any",
  "surface": "An elder who still believes Byzantium can rise again, and needs one more piece.",
  "needs": [
   "seat",
   "fate",
   "project"
  ],
  "place": [
   "court",
   "holy"
  ],
  "cast": [
   "elder",
   "scholar"
  ],
  "beneath": {
   "vampire": "An elder of the Dream, unbroken.",
   "mortal": "An old exile and a lost cause."
  },
  "regions": [
   "aegean"
  ],
  "region": "aegean",
  "src": "history"
 },
 {
  "key": "r-anatolia",
  "title": "The caravanserai",
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
  "role": "anchor",
  "open": "The gate is barred until morning, and the guest in the best room is dead.",
  "surface": "A road house where many faiths sleep under one roof, and tonight something has gone wrong.",
  "want": "The killer named before dawn.",
  "question": "Who did it, and who else recognised whom?",
  "complication": "No one may leave until the morning.",
  "needs": [
   "death",
   "arrival",
   "rumour"
  ],
  "place": [
   "road",
   "house"
  ],
  "cast": [
   "stranger",
   "merchant"
  ],
  "beneath": {
   "vampire": "Two Kindred in one inn, both hungry.",
   "mummy": "A traveller has died before, and will again.",
   "mortal": "A smuggler, a spy and a debt."
  },
  "regions": [
   "anatolia"
  ],
  "region": "anatolia",
  "src": "history"
 },
 {
  "key": "r-anatolia-alt",
  "title": "The tax-farmer's ledger",
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
  "role": "any",
  "surface": "Whoever holds it holds the province.",
  "needs": [
   "law",
   "debt",
   "seat"
  ],
  "place": [
   "court",
   "market"
  ],
  "cast": [
   "official",
   "merchant"
  ],
  "beneath": {
   "vampire": "A Ventrue's grip on the province.",
   "mortal": "A record of every bribe."
  },
  "regions": [
   "anatolia"
  ],
  "region": "anatolia",
  "src": "history"
 },
 {
  "key": "r-levant",
  "title": "Three faiths, one shrine",
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
  "role": "anchor",
  "open": "Three keys open the shrine, and one of the key-holders has vanished.",
  "surface": "A holy place matters to more than one faith and more than one kind of creature.",
  "want": "The shrine kept, or taken.",
  "question": "Who keeps the shrine?",
  "complication": "A pilgrim, a soldier or a scholar is about to change it.",
  "needs": [
   "war",
   "cult",
   "event"
  ],
  "place": [
   "holy",
   "town"
  ],
  "cast": [
   "priest",
   "soldier"
  ],
  "beneath": {
   "vampire": "The shrine is a haven, and its keepers are ghouls.",
   "hunter": "The shrine burns the Damned.",
   "demon": "A Fallen remembers the shrine before the faiths.",
   "mortal": "Faith, land and memory."
  },
  "regions": [
   "levant"
  ],
  "region": "levant",
  "src": "history"
 },
 {
  "key": "r-levant-alt",
  "title": "The library under the sand",
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
  "role": "any",
  "surface": "The last copies of a book every faction wants burned or kept.",
  "needs": [
   "project",
   "rumour",
   "fate"
  ],
  "place": [
   "grave",
   "holy"
  ],
  "cast": [
   "scholar",
   "priest"
  ],
  "beneath": {
   "mage": "The book is a Grimoire.",
   "vampire": "The book names a methuselah."
  },
  "regions": [
   "levant"
  ],
  "region": "levant",
  "src": "history",
  "tags": [
   "fire"
  ]
 },
 {
  "key": "r-egypt",
  "title": "The tomb that is opened",
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
  "role": "anchor",
  "open": "The sealed door had a warning on it, and the dig master read it aloud for the newspapers.",
  "surface": "A tomb is opened by robbers, scholars or a dam crew, and whatever sleeps there walks.",
  "want": "To sell what they took.",
  "question": "What walks, and what does it want back?",
  "complication": "The openers sell the pieces to different buyers.",
  "needs": [
   "breach",
   "death",
   "event"
  ],
  "place": [
   "grave",
   "market"
  ],
  "cast": [
   "scholar",
   "stranger"
  ],
  "beneath": {
   "mummy": "One of the Undying wakes in the wrong age.",
   "vampire": "A Setite's prize, long hidden.",
   "werewolf": "A spirit of the old gods is free.",
   "mortal": "Thieves, scholars and a curse in the papers."
  },
  "regions": [
   "egypt"
  ],
  "region": "egypt",
  "src": "history"
 },
 {
  "key": "r-egypt-alt",
  "title": "The serpent's temple",
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
  "role": "any",
  "surface": "A Setite cult offers the river city what it lacks.",
  "needs": [
   "cult",
   "debt",
   "town"
  ],
  "place": [
   "holy",
   "town"
  ],
  "cast": [
   "priest",
   "outcast"
  ],
  "beneath": {
   "vampire": "The Followers of Set, at the city's throat.",
   "mummy": "An Apep cult's long patience."
  },
  "regions": [
   "egypt"
  ],
  "region": "egypt",
  "src": "history"
 },
 {
  "key": "r-arabia",
  "title": "The road of the pilgrims",
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
  "role": "anchor",
  "open": "The caravan master counts the riders at dusk, and there is one more than at dawn.",
  "surface": "The great pilgrim caravan crosses the desert with raiders, spirits and a traveller with a secret.",
  "want": "To reach the holy city.",
  "question": "Who is the extra rider?",
  "complication": "The caravan cannot stop for long.",
  "needs": [
   "arrival",
   "fight",
   "fate"
  ],
  "place": [
   "road",
   "holy"
  ],
  "cast": [
   "stranger",
   "spirit"
  ],
  "beneath": {
   "vampire": "A Kindred rides by night in a closed litter.",
   "mage": "The well spirits are bound by an Ahl-i-Batin.",
   "mortal": "Raiders, thirst and a pilgrim with a past."
  },
  "regions": [
   "arabia"
  ],
  "region": "arabia",
  "src": "history"
 },
 {
  "key": "r-arabia-alt",
  "title": "The well that answers",
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
  "role": "any",
  "surface": "A spirit in a well that grants wishes for a price, and the town that grew rich on it.",
  "needs": [
   "debt",
   "town",
   "change"
  ],
  "place": [
   "holy",
   "town"
  ],
  "cast": [
   "spirit",
   "elder"
  ],
  "beneath": {
   "werewolf": "The well spirit is hungry.",
   "mortal": "A town that cannot stop wishing."
  },
  "regions": [
   "arabia"
  ],
  "region": "arabia",
  "src": "history"
 },
 {
  "key": "r-maghreb",
  "title": "The captive's ransom",
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
  "role": "anchor",
  "open": "The ransom letter is in a player character's hand, and they did not write it.",
  "surface": "Someone taken at sea is held for ransom, and the captive is not what they seem.",
  "want": "The ransom paid.",
  "question": "Who is the captive?",
  "complication": "Families, an order, a consul and a rival all bargain.",
  "needs": [
   "arrival",
   "debt",
   "fate"
  ],
  "place": [
   "sea",
   "town"
  ],
  "cast": [
   "family",
   "stranger"
  ],
  "beneath": {
   "vampire": "The captive is a Kindred, sleeping in a hold.",
   "mortal": "Corsairs, a consul and a lost child.",
   "hunter": "The captive is bait."
  },
  "regions": [
   "maghreb"
  ],
  "region": "maghreb",
  "src": "history",
  "tags": [
   "children"
  ]
 },
 {
  "key": "r-maghreb-alt",
  "title": "The kasbah's water",
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
  "role": "any",
  "surface": "Whoever controls the mountain springs controls the valley.",
  "needs": [
   "seat",
   "town",
   "war"
  ],
  "place": [
   "fort",
   "wild"
  ],
  "cast": [
   "elder",
   "family"
  ],
  "beneath": {
   "werewolf": "The springs feed a caern.",
   "mortal": "Two clans and one river."
  },
  "regions": [
   "maghreb"
  ],
  "region": "maghreb",
  "src": "history"
 },
 {
  "key": "r-persia",
  "title": "The mountain fortress's contract",
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
  "role": "anchor",
  "open": "The dagger on the pillow means the contract is signed, and the name on it is a friend's.",
  "surface": "A death is ordered from a fortress in the mountains.",
  "want": "The contract kept.",
  "question": "Who ordered the death, and why?",
  "complication": "Breaking the contract is harder than keeping it.",
  "needs": [
   "death",
   "fate",
   "hunters"
  ],
  "place": [
   "fort",
   "road"
  ],
  "cast": [
   "stranger",
   "elder"
  ],
  "beneath": {
   "vampire": "The Assamites take their pay in blood.",
   "mortal": "A fortress of killers and a famous name.",
   "mage": "The fortress keeps a secret of the Batini."
  },
  "regions": [
   "persia"
  ],
  "region": "persia",
  "src": "history"
 },
 {
  "key": "r-persia-alt",
  "title": "The poet's garden",
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
  "role": "any",
  "surface": "A garden of verses where a hidden word opens a door.",
  "needs": [
   "node",
   "tale",
   "change"
  ],
  "place": [
   "holy",
   "house"
  ],
  "cast": [
   "scholar",
   "spirit"
  ],
  "beneath": {
   "mage": "A Horizon realm behind a verse.",
   "changeling": "The garden is a trod."
  },
  "regions": [
   "persia"
  ],
  "region": "persia",
  "src": "history"
 },
 {
  "key": "r-central-asia",
  "title": "The message across the steppe",
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
  "role": "anchor",
  "open": "The relay rider arrived dead in the saddle, and the message case was empty.",
  "surface": "A message must cross a thousand miles of steppe, and someone wants it stopped or changed.",
  "want": "The message delivered unchanged.",
  "question": "What does the message say?",
  "complication": "Someone wants it changed before it arrives.",
  "needs": [
   "war",
   "event",
   "arrival"
  ],
  "place": [
   "road",
   "wild"
  ],
  "cast": [
   "soldier",
   "stranger"
  ],
  "beneath": {
   "vampire": "The message names a Kindred to the khan.",
   "werewolf": "The steppe spirits carry their own messages.",
   "mortal": "A dispatch that will start or end a war."
  },
  "regions": [
   "central-asia"
  ],
  "region": "central-asia",
  "src": "history"
 },
 {
  "key": "r-central-asia-alt",
  "title": "The khan's tomb",
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
  "role": "any",
  "surface": "A hidden grave with a curse on whoever names its place.",
  "needs": [
   "death",
   "breach",
   "fate"
  ],
  "place": [
   "grave",
   "wild"
  ],
  "cast": [
   "dead",
   "elder"
  ],
  "beneath": {
   "wraith": "The khan's dead still guard it.",
   "mortal": "A grave of gold and a curse."
  },
  "regions": [
   "central-asia"
  ],
  "region": "central-asia",
  "src": "history"
 },
 {
  "key": "r-siberia",
  "title": "The exile camp",
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
  "role": "anchor",
  "open": "The convoy reached the camp short three prisoners, and the guards will not say why.",
  "surface": "People sent east to vanish meet the shamans, and something old meets them both.",
  "want": "To survive the winter.",
  "question": "What walks the taiga at night?",
  "complication": "The guards report to someone far away.",
  "needs": [
   "arrival",
   "law",
   "change"
  ],
  "place": [
   "wild",
   "fort"
  ],
  "cast": [
   "outcast",
   "spirit"
  ],
  "beneath": {
   "werewolf": "A taiga spirit takes its own tithe.",
   "wraith": "The camp is full of the dead.",
   "mortal": "Exiles, guards and a hard winter."
  },
  "regions": [
   "siberia"
  ],
  "region": "siberia",
  "src": "history"
 },
 {
  "key": "r-siberia-alt",
  "title": "What fell at Tunguska",
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
  "role": "any",
  "surface": "The forest flattened for miles, and the spirits of the place changed.",
  "needs": [
   "change",
   "breach",
   "event"
  ],
  "place": [
   "wild"
  ],
  "cast": [
   "spirit",
   "scholar"
  ],
  "beneath": {
   "mage": "Something came through the Gauntlet.",
   "werewolf": "The spirits are wrong now."
  },
  "regions": [
   "siberia"
  ],
  "region": "siberia",
  "src": "history"
 },
 {
  "key": "r-tibet-himalaya",
  "title": "The search for the rebirth",
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
  "role": "anchor",
  "open": "The signs point to a farmhouse below the pass, and two search parties are racing for it.",
  "surface": "A great teacher has died and must be found again, reborn.",
  "want": "The child found, and safe.",
  "question": "Who finds the child first?",
  "complication": "Not every searcher wants the child found safe.",
  "needs": [
   "fate",
   "arrival",
   "seat"
  ],
  "place": [
   "holy",
   "road"
  ],
  "cast": [
   "priest",
   "family"
  ],
  "beneath": {
   "kuei-jin": "A Kuei-jin court wants the rebirth as a pawn.",
   "mage": "The teacher's Avatar is the prize.",
   "mortal": "A family that does not want to give up a child."
  },
  "regions": [
   "tibet-himalaya"
  ],
  "region": "tibet-himalaya",
  "src": "history",
  "tags": [
   "children"
  ]
 },
 {
  "key": "r-tibet-himalaya-alt",
  "title": "The pass in winter",
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
  "role": "any",
  "surface": "A crossing that closes at the first snow, and a party that must get over it now.",
  "needs": [
   "arrival",
   "death",
   "fate"
  ],
  "place": [
   "road",
   "wild"
  ],
  "cast": [
   "stranger",
   "spirit"
  ],
  "beneath": {
   "werewolf": "The mountain's spirit takes its due.",
   "mortal": "Snow, and a guide who lies."
  },
  "regions": [
   "tibet-himalaya"
  ],
  "region": "tibet-himalaya",
  "src": "history"
 },
 {
  "key": "r-india",
  "title": "The company's agent",
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
  "role": "anchor",
  "open": "The agent has a paper with a seal on it, and wants the temple's treasury counted by morning.",
  "surface": "An agent of a far power wants something from a temple or a ruler, and a Ravnos or a rakshasa wants it more.",
  "want": "The treasure counted and taken.",
  "question": "Who keeps the temple's treasure?",
  "complication": "The agent's masters are far away and impatient.",
  "needs": [
   "law",
   "seat",
   "project"
  ],
  "place": [
   "court",
   "holy"
  ],
  "cast": [
   "official",
   "priest"
  ],
  "beneath": {
   "vampire": "A Ravnos and a company man play the same game.",
   "kuei-jin": "A rakshasa sees an opening.",
   "mortal": "A tax-man, a trading company, an empire."
  },
  "regions": [
   "india"
  ],
  "region": "india",
  "src": "history"
 },
 {
  "key": "r-india-alt",
  "title": "The ghat at the burning ground",
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
  "role": "any",
  "surface": "The dead who will not burn, and those who feed on them.",
  "needs": [
   "death",
   "breach",
   "change"
  ],
  "place": [
   "holy",
   "river"
  ],
  "cast": [
   "dead",
   "priest"
  ],
  "beneath": {
   "wraith": "The dead cling to the ghat.",
   "kuei-jin": "A hungry ghost feeds there."
  },
  "regions": [
   "india"
  ],
  "region": "india",
  "src": "history",
  "tags": [
   "fire"
  ]
 },
 {
  "key": "r-china",
  "title": "Omens of a lost Mandate",
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
  "role": "anchor",
  "open": "A comet over the capital, a flood in the south, and hungry ghosts at the city walls.",
  "surface": "Heaven withdraws its favour from the dynasty, and every court scrambles to stand with the next ruler.",
  "want": "To stand with the winner.",
  "question": "Who will hold the Mandate next?",
  "complication": "Every sign can be read two ways.",
  "needs": [
   "seat",
   "change",
   "war"
  ],
  "place": [
   "court",
   "town"
  ],
  "cast": [
   "official",
   "spirit"
  ],
  "beneath": {
   "kuei-jin": "The courts of the Middle Kingdom choose sides.",
   "mage": "The Wu Lung read the stars.",
   "mortal": "Floods, comets and rebels."
  },
  "regions": [
   "china"
  ],
  "region": "china",
  "src": "history"
 },
 {
  "key": "r-china-alt",
  "title": "The opium den's debt",
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
  "role": "any",
  "surface": "A powerful family hooked and ruined by a supplier with other aims.",
  "needs": [
   "debt",
   "town",
   "cult"
  ],
  "place": [
   "house",
   "market"
  ],
  "cast": [
   "merchant",
   "family"
  ],
  "beneath": {
   "kuei-jin": "The supplier feeds on the ruin.",
   "mortal": "A merchant house falling."
  },
  "regions": [
   "china"
  ],
  "region": "china",
  "src": "history"
 },
 {
  "key": "r-japan",
  "title": "The ghost's grievance",
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
  "role": "anchor",
  "open": "The ghost has written a name on the paper screens in blood, and it is the name of the lord.",
  "surface": "A vengeful ghost will not rest until its wrong is set right, and the one who did it is still powerful.",
  "want": "Its wrong set right.",
  "question": "What was the wrong?",
  "complication": "The one who did it is still powerful.",
  "needs": [
   "death",
   "breach",
   "grudge"
  ],
  "place": [
   "house",
   "fort"
  ],
  "cast": [
   "dead",
   "family"
  ],
  "beneath": {
   "wraith": "A ghost with a great Passion and a fetter in the house.",
   "kuei-jin": "A Kuei-jin court protects the lord.",
   "mortal": "An old crime in a great house."
  },
  "regions": [
   "japan"
  ],
  "region": "japan",
  "src": "history"
 },
 {
  "key": "r-japan-alt",
  "title": "The closed port",
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
  "role": "any",
  "surface": "A single trading island where every foreign visitor is watched.",
  "needs": [
   "arrival",
   "law",
   "rumour"
  ],
  "place": [
   "sea",
   "market"
  ],
  "cast": [
   "stranger",
   "official"
  ],
  "beneath": {
   "kuei-jin": "The watchers are not all mortal.",
   "mortal": "Spies, traders and a secret cargo."
  },
  "regions": [
   "japan"
  ],
  "region": "japan",
  "src": "history"
 },
 {
  "key": "r-korea",
  "title": "Kin across the line",
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
  "role": "anchor",
  "open": "The letter came across the line in a dead man's boot, and it asks for medicine.",
  "surface": "A family split by a border needs something only the other side has.",
  "want": "To cross and come back.",
  "question": "Is it worth the crossing?",
  "complication": "Crossing means risking everything.",
  "needs": [
   "war",
   "arrival",
   "law"
  ],
  "place": [
   "road",
   "fort"
  ],
  "cast": [
   "family",
   "soldier"
  ],
  "beneath": {
   "kuei-jin": "A court on each side of the line.",
   "wraith": "The dead cross the line freely.",
   "mortal": "A family, and soldiers on both sides."
  },
  "regions": [
   "korea"
  ],
  "region": "korea",
  "src": "history"
 },
 {
  "key": "r-korea-alt",
  "title": "The shaman's drum",
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
  "role": "any",
  "surface": "A village rite keeps something bound, and an official has banned it.",
  "needs": [
   "law",
   "change",
   "breach"
  ],
  "place": [
   "holy",
   "town"
  ],
  "cast": [
   "priest",
   "official"
  ],
  "beneath": {
   "werewolf": "The bound thing is a Bane.",
   "mortal": "An old rite and a new law."
  },
  "regions": [
   "korea"
  ],
  "region": "korea",
  "src": "history"
 },
 {
  "key": "r-southeast-asia",
  "title": "The temple the forest swallowed",
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
  "role": "anchor",
  "open": "The explorers' camp is empty, and their notes end with a drawing of a face in the stone.",
  "surface": "A temple city lies under the forest, and the guardians decide who leaves.",
  "want": "Treasure, or knowledge.",
  "question": "Who are the guardians?",
  "complication": "Looters and soldiers are close behind.",
  "needs": [
   "breach",
   "arrival",
   "fight"
  ],
  "place": [
   "wild",
   "holy",
   "grave"
  ],
  "cast": [
   "scholar",
   "dead"
  ],
  "beneath": {
   "kuei-jin": "The temple is a dragon nest.",
   "wraith": "The dead of the city keep it.",
   "mortal": "Explorers, looters and a jungle."
  },
  "regions": [
   "southeast-asia"
  ],
  "region": "southeast-asia",
  "src": "history"
 },
 {
  "key": "r-southeast-asia-alt",
  "title": "The river war",
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
  "role": "any",
  "surface": "Boats, smugglers and a spirit that owns the river.",
  "needs": [
   "war",
   "fight",
   "debt"
  ],
  "place": [
   "river"
  ],
  "cast": [
   "merchant",
   "spirit"
  ],
  "beneath": {
   "werewolf": "The river spirit takes sides.",
   "mortal": "Smugglers fight for the trade."
  },
  "regions": [
   "southeast-asia"
  ],
  "region": "southeast-asia",
  "src": "history"
 },
 {
  "key": "r-philippines",
  "title": "The galleon is late",
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
  "role": "anchor",
  "open": "The ship from across the ocean is a month overdue, and a fisher swears it passed the point at night with no one at the wheel.",
  "surface": "A trading ship everyone's fortune rides on has come back wrong, or not at all.",
  "want": "The cargo, the crew, or the truth.",
  "question": "What came back on the ship?",
  "complication": "Half the town has borrowed against what it carries.",
  "needs": [
   "arrival",
   "debt",
   "rumour"
  ],
  "place": [
   "sea",
   "market"
  ],
  "cast": [
   "merchant",
   "dead"
  ],
  "beneath": {
   "kuei-jin": "Something from the far shore rides in the hold.",
   "wraith": "The drowned crew are still sailing it.",
   "mortal": "Debts, a storm and a captain who lied."
  },
  "regions": [
   "philippines"
  ],
  "region": "philippines",
  "src": "history"
 },
 {
  "key": "r-philippines-alt",
  "title": "The datu's buried gold",
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
  "role": "any",
  "surface": "A chief's treasure hidden from the Spanish, and the spirit set to keep it.",
  "needs": [
   "hook",
   "rumour",
   "fight"
  ],
  "place": [
   "wild",
   "grave"
  ],
  "cast": [
   "spirit",
   "stranger"
  ],
  "beneath": {
   "werewolf": "A spirit of the old barangay keeps the hoard.",
   "mortal": "Treasure hunters and a family that knows the place."
  },
  "regions": [
   "philippines"
  ],
  "region": "philippines",
  "src": "history"
 },
 {
  "key": "r-nusantara",
  "title": "When the mountain wakes",
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
  "role": "anchor",
  "open": "The mountain has smoked for a week, and the priests are arguing over whose sacrifice it wants.",
  "surface": "A volcano stirs, and every power on the island reads what it wants.",
  "want": "The mountain calmed, or used.",
  "question": "What does the mountain want?",
  "complication": "Each reading means a different sacrifice.",
  "needs": [
   "change",
   "fire",
   "event"
  ],
  "place": [
   "wild",
   "holy"
  ],
  "cast": [
   "priest",
   "merchant"
  ],
  "beneath": {
   "werewolf": "The mountain's spirit is waking.",
   "kuei-jin": "A dragon nest under the volcano.",
   "mortal": "Traders, a sultan and a coming eruption."
  },
  "regions": [
   "nusantara"
  ],
  "region": "nusantara",
  "src": "history"
 },
 {
  "key": "r-nusantara-alt",
  "title": "The spice monopoly",
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
  "role": "any",
  "surface": "A single nutmeg grove that a company will kill for.",
  "needs": [
   "war",
   "project",
   "death"
  ],
  "place": [
   "wild",
   "market"
  ],
  "cast": [
   "merchant",
   "soldier"
  ],
  "beneath": {
   "vampire": "A Ventrue's company.",
   "mortal": "A grove and a massacre."
  },
  "regions": [
   "nusantara"
  ],
  "region": "nusantara",
  "src": "history",
  "tags": [
   "atrocity"
  ]
 },
 {
  "key": "r-west-africa",
  "title": "The song that names the lost",
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
  "role": "anchor",
  "open": "The griot sang the king's line and left out a name, and that night the forgotten one's grave was open.",
  "surface": "A song has been changed, a name left out, a lineage stolen, and the dead notice.",
  "want": "The true song sung.",
  "question": "Who changed the song?",
  "complication": "The new song makes a powerful family legitimate.",
  "needs": [
   "tale",
   "fate",
   "death"
  ],
  "place": [
   "court",
   "town"
  ],
  "cast": [
   "elder",
   "dead"
  ],
  "beneath": {
   "wraith": "The forgotten dead want their name back.",
   "vampire": "A Kindred erased their mortal family.",
   "mortal": "A griot's honour and a king's claim."
  },
  "regions": [
   "west-africa"
  ],
  "region": "west-africa",
  "src": "history"
 },
 {
  "key": "r-west-africa-alt",
  "title": "The gate of no return",
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
  "role": "any",
  "surface": "The dead of the Middle Passage and the Shadowlands' coast.",
  "needs": [
   "death",
   "breach",
   "event"
  ],
  "place": [
   "sea",
   "fort"
  ],
  "cast": [
   "dead",
   "soldier"
  ],
  "beneath": {
   "wraith": "A Maelstrom off the coast.",
   "mortal": "A fort's terrible memory."
  },
  "regions": [
   "west-africa"
  ],
  "region": "west-africa",
  "src": "history"
 },
 {
  "key": "r-east-africa",
  "title": "The keepers of the rock church",
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
  "role": "anchor",
  "open": "The stranger has asked to see what lies behind the third door, and has offered a great deal.",
  "surface": "Churches cut from rock, or a coast mosque, hold something kept for centuries.",
  "want": "To see it, buy it or take it.",
  "question": "What is behind the door?",
  "complication": "The stranger will not take no.",
  "needs": [
   "arrival",
   "cult",
   "rumour"
  ],
  "place": [
   "holy",
   "church"
  ],
  "cast": [
   "priest",
   "stranger"
  ],
  "beneath": {
   "hunter": "What is kept there burns the Damned.",
   "vampire": "A Kindred wants it destroyed.",
   "mortal": "Keepers, a collector and a relic."
  },
  "regions": [
   "east-africa"
  ],
  "region": "east-africa",
  "src": "history"
 },
 {
  "key": "r-east-africa-alt",
  "title": "The monsoon wind",
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
  "role": "any",
  "surface": "A ship that must sail before the wind turns, with a cargo nobody admits to.",
  "needs": [
   "arrival",
   "debt",
   "fate"
  ],
  "place": [
   "sea"
  ],
  "cast": [
   "merchant",
   "stranger"
  ],
  "beneath": {
   "vampire": "The cargo sleeps by day.",
   "mortal": "Smuggling and a deadline."
  },
  "regions": [
   "east-africa"
  ],
  "region": "east-africa",
  "src": "history"
 },
 {
  "key": "r-southern-africa",
  "title": "The claim on the land",
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
  "role": "anchor",
  "open": "The surveyor's pegs are in the old burial ground, and the elders have pulled them out.",
  "surface": "Newcomers with papers and guns claim land that others were on first.",
  "want": "The land, by any paper.",
  "question": "Whose land is it?",
  "complication": "The spirits of the place have their own claim.",
  "needs": [
   "town",
   "war",
   "law"
  ],
  "place": [
   "wild",
   "mine"
  ],
  "cast": [
   "official",
   "elder"
  ],
  "beneath": {
   "werewolf": "The land is a caern.",
   "wraith": "The dead of the burial ground rise.",
   "mortal": "Papers, guns and a people."
  },
  "regions": [
   "southern-africa"
  ],
  "region": "southern-africa",
  "src": "history"
 },
 {
  "key": "r-southern-africa-alt",
  "title": "The diamond that should not have been found",
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
  "role": "any",
  "surface": "A stone that brings ruin to each owner.",
  "needs": [
   "fate",
   "death",
   "project"
  ],
  "place": [
   "mine",
   "market"
  ],
  "cast": [
   "merchant",
   "outcast"
  ],
  "beneath": {
   "mage": "The stone holds Quintessence.",
   "mortal": "Greed and a cursed stone."
  },
  "regions": [
   "southern-africa"
  ],
  "region": "southern-africa",
  "src": "history"
 },
 {
  "key": "r-central-africa",
  "title": "The river station's ledger",
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
  "role": "anchor",
  "open": "The station chief's ledger is missing a page, and the forest has gone silent around the station.",
  "surface": "A trading station keeps a ledger of what it takes, and a page is missing.",
  "want": "The page found and burned.",
  "question": "What is on the missing page?",
  "complication": "The forest wants the page back.",
  "needs": [
   "death",
   "law",
   "breach"
  ],
  "place": [
   "river",
   "fort"
  ],
  "cast": [
   "official",
   "dead"
  ],
  "beneath": {
   "wraith": "The dead of the station want their names written.",
   "werewolf": "The forest's spirits are at war with the station.",
   "mortal": "A record of atrocity."
  },
  "regions": [
   "central-africa"
  ],
  "region": "central-africa",
  "src": "history",
  "from": 1880,
  "tags": [
   "atrocity",
   "fire"
  ]
 },
 {
  "key": "r-central-africa-alt",
  "title": "The forest that hides",
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
  "role": "any",
  "surface": "A hidden village of people who fled the stations, and what protects them.",
  "needs": [
   "arrival",
   "fight",
   "hunters"
  ],
  "place": [
   "wild"
  ],
  "cast": [
   "outcast",
   "spirit"
  ],
  "beneath": {
   "werewolf": "Kinfolk and their protectors.",
   "mortal": "Refugees and their hunters."
  },
  "regions": [
   "central-africa"
  ],
  "region": "central-africa",
  "src": "history",
  "from": 1880
 },
 {
  "key": "r-canada",
  "title": "The hunger in deep winter",
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
  "role": "anchor",
  "open": "Three weeks from the thaw, the cook has started counting the men by weight.",
  "surface": "Far from help in the worst of winter, someone starts to hunger for human flesh.",
  "want": "To eat.",
  "question": "Who is hungry, and what is feeding the hunger?",
  "complication": "No one can leave until the thaw.",
  "needs": [
   "death",
   "change",
   "wyrm"
  ],
  "place": [
   "wild",
   "fort"
  ],
  "cast": [
   "outcast",
   "spirit"
  ],
  "beneath": {
   "werewolf": "A Wendigo's curse on the post.",
   "vampire": "A Kindred is starving too.",
   "mortal": "Cold, hunger and fear."
  },
  "regions": [
   "canada"
  ],
  "region": "canada",
  "src": "history",
  "tags": [
   "cannibalism"
  ]
 },
 {
  "key": "r-canada-alt",
  "title": "The voyageur's canoe",
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
  "role": "any",
  "surface": "A long river journey with a debt that must reach a post before freeze-up.",
  "needs": [
   "arrival",
   "debt",
   "fate"
  ],
  "place": [
   "river",
   "wild"
  ],
  "cast": [
   "merchant",
   "stranger"
  ],
  "beneath": {
   "werewolf": "The river spirits demand a toll.",
   "mortal": "A debt and a deadline."
  },
  "regions": [
   "canada"
  ],
  "region": "canada",
  "src": "history"
 },
 {
  "key": "r-north-america-east",
  "title": "The accusation",
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
  "role": "anchor",
  "open": "The town meeting has voted, and the accused has until Sunday.",
  "surface": "A town turns on one of its own: a witch, a traitor, a red, a monster.",
  "want": "Someone to blame.",
  "question": "Is the accused one of the hidden?",
  "complication": "The panic feeds something.",
  "needs": [
   "hunters",
   "trial",
   "rumour"
  ],
  "place": [
   "town",
   "church"
  ],
  "cast": [
   "family",
   "priest"
  ],
  "beneath": {
   "hunter": "The accused is a monster, or the accuser is.",
   "vampire": "A Kindred stokes the panic to cover a feeding.",
   "mortal": "Fear, and neighbours who use it."
  },
  "regions": [
   "north-america-east"
  ],
  "region": "north-america-east",
  "src": "history"
 },
 {
  "key": "r-north-america-east-alt",
  "title": "The machine of the city",
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
  "role": "any",
  "surface": "A political boss whose favours run every ward, and who serves someone else.",
  "needs": [
   "seat",
   "law",
   "debt"
  ],
  "place": [
   "town",
   "court"
  ],
  "cast": [
   "official",
   "merchant"
  ],
  "beneath": {
   "vampire": "The boss is a Ventrue's ghoul.",
   "mortal": "Patronage and a reformer."
  },
  "regions": [
   "north-america-east"
  ],
  "region": "north-america-east",
  "src": "history"
 },
 {
  "key": "r-north-america-west",
  "title": "The boomtown claim",
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
  "role": "anchor",
  "open": "The claim office opened at dawn and the first claim was filed by someone who died last year.",
  "surface": "A strike makes a town overnight, claims are jumped, and the land was never empty.",
  "want": "The claim.",
  "question": "Who owns the strike?",
  "complication": "The railway is coming.",
  "needs": [
   "town",
   "law",
   "fight"
  ],
  "place": [
   "mine",
   "town"
  ],
  "cast": [
   "merchant",
   "outcast"
  ],
  "beneath": {
   "werewolf": "The land is sacred to the Uktena.",
   "vampire": "A Kindred buys the town.",
   "mortal": "Claim jumpers and a railway."
  },
  "regions": [
   "north-america-west"
  ],
  "region": "north-america-west",
  "src": "history",
  "from": 1598
 },
 {
  "key": "r-north-america-west-alt",
  "title": "The medicine wheel",
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
  "role": "any",
  "surface": "A sacred site on a railway survey line.",
  "needs": [
   "town",
   "caern",
   "project"
  ],
  "place": [
   "holy",
   "wild"
  ],
  "cast": [
   "elder",
   "official"
  ],
  "beneath": {
   "werewolf": "A caern of the Wendigo.",
   "mortal": "A survey and a people."
  },
  "regions": [
   "north-america-west"
  ],
  "region": "north-america-west",
  "src": "history",
  "from": 1598
 },
 {
  "key": "r-mexico",
  "title": "The altar of the dead",
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
  "role": "anchor",
  "open": "The marigolds on the altar have turned black, and the dead visitor will not leave.",
  "surface": "On the nights when the dead come home, an altar is set for someone who did not die the way the family believes.",
  "want": "The truth told.",
  "question": "How did they really die?",
  "complication": "The truth shames the living.",
  "needs": [
   "death",
   "tale",
   "fate"
  ],
  "place": [
   "house",
   "grave"
  ],
  "cast": [
   "dead",
   "family"
  ],
  "beneath": {
   "wraith": "The dead visitor has a Passion to settle.",
   "vampire": "A Kindred killed them.",
   "mortal": "A family secret."
  },
  "regions": [
   "mexico"
  ],
  "region": "mexico",
  "src": "history"
 },
 {
  "key": "r-mexico-alt",
  "title": "The feathered serpent's return",
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
  "role": "any",
  "surface": "A prophecy someone is using for their own ends.",
  "needs": [
   "cult",
   "event",
   "seat"
  ],
  "place": [
   "holy",
   "town"
  ],
  "cast": [
   "priest",
   "stranger"
  ],
  "beneath": {
   "vampire": "A Setite plays the prophet.",
   "mage": "The prophecy is a working."
  },
  "regions": [
   "mexico"
  ],
  "region": "mexico",
  "src": "history"
 },
 {
  "key": "r-caribbean",
  "title": "The crossroads and the spirits",
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
  "role": "anchor",
  "open": "At midnight, the drummers stop, and something steps out of the crossroads asking for its due.",
  "surface": "At a crossroads someone made a bargain with the spirits, and the bill comes due.",
  "want": "Its due.",
  "question": "Who made the bargain?",
  "complication": "The bargain-maker is dead, and their heirs pay.",
  "needs": [
   "debt",
   "death",
   "breach"
  ],
  "place": [
   "road",
   "holy"
  ],
  "cast": [
   "spirit",
   "family"
  ],
  "beneath": {
   "wraith": "The spirits of the dead keep the bargain.",
   "mage": "A bargain with a Loa.",
   "mortal": "Freedom, wealth or revenge, and a price."
  },
  "regions": [
   "caribbean"
  ],
  "region": "caribbean",
  "src": "history",
  "from": 1492
 },
 {
  "key": "r-caribbean-alt",
  "title": "The pirate's cache",
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
  "role": "any",
  "surface": "Treasure buried with a guardian who was buried with it.",
  "needs": [
   "fight",
   "death",
   "rumour"
  ],
  "place": [
   "sea",
   "grave"
  ],
  "cast": [
   "dead",
   "outcast"
  ],
  "beneath": {
   "wraith": "The guardian is a Shade.",
   "mortal": "Treasure hunters and a map."
  },
  "regions": [
   "caribbean"
  ],
  "region": "caribbean",
  "src": "history",
  "from": 1492
 },
 {
  "key": "r-andes",
  "title": "The mountain that eats miners",
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
  "role": "anchor",
  "open": "The miners leave offerings for the spirit at the gallery mouth, and this week the offerings were refused.",
  "surface": "A silver or tin mountain swallows those who work it, and each power has its price.",
  "want": "More silver.",
  "question": "What is the mountain's price?",
  "complication": "The owners will not pay it.",
  "needs": [
   "death",
   "project",
   "town"
  ],
  "place": [
   "mine",
   "holy"
  ],
  "cast": [
   "outcast",
   "spirit"
  ],
  "beneath": {
   "werewolf": "The mountain spirit is old and hungry.",
   "wraith": "The dead miners still work.",
   "mortal": "Forced labour and a silver mountain."
  },
  "regions": [
   "andes"
  ],
  "region": "andes",
  "src": "history",
  "tags": [
   "slavery"
  ]
 },
 {
  "key": "r-andes-alt",
  "title": "The road of the Inca",
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
  "role": "any",
  "surface": "A message relay over the high passes that nobody controls.",
  "needs": [
   "arrival",
   "war",
   "rumour"
  ],
  "place": [
   "road"
  ],
  "cast": [
   "stranger",
   "elder"
  ],
  "beneath": {
   "mage": "The road is a ley line.",
   "mortal": "Runners and a message."
  },
  "regions": [
   "andes"
  ],
  "region": "andes",
  "src": "history"
 },
 {
  "key": "r-brazil",
  "title": "The hidden free town",
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
  "role": "anchor",
  "open": "A runaway came to the players' door with a map drawn in charcoal, and slave-catchers came after.",
  "surface": "A town of people who fled bondage, and everyone wants to find it.",
  "want": "The town hidden.",
  "question": "Who protects the free town?",
  "complication": "Slave-catchers, a planter and a missionary all hunt it.",
  "needs": [
   "hunters",
   "arrival",
   "fight"
  ],
  "place": [
   "wild",
   "town"
  ],
  "cast": [
   "outcast",
   "family"
  ],
  "beneath": {
   "werewolf": "The forest's guardians protect it.",
   "vampire": "A Kindred hunts the runaways.",
   "mortal": "Freedom and its price."
  },
  "regions": [
   "brazil"
  ],
  "region": "brazil",
  "src": "history",
  "from": 1500,
  "tags": [
   "slavery"
  ]
 },
 {
  "key": "r-brazil-alt",
  "title": "The rubber baron's opera house",
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
  "role": "any",
  "surface": "Luxury in the jungle, paid for in lives.",
  "needs": [
   "death",
   "project",
   "tale"
  ],
  "place": [
   "court",
   "house"
  ],
  "cast": [
   "merchant",
   "outcast"
  ],
  "beneath": {
   "vampire": "The baron is a Kindred's puppet.",
   "mortal": "A gala and a massacre."
  },
  "regions": [
   "brazil"
  ],
  "region": "brazil",
  "src": "history",
  "from": 1500,
  "tags": [
   "atrocity"
  ]
 },
 {
  "key": "r-southern-cone",
  "title": "The disappeared",
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
  "role": "anchor",
  "open": "The mothers march in the square every Thursday, and this Thursday one of them did not come home.",
  "surface": "People vanish and the state says they never existed.",
  "want": "The names remembered.",
  "question": "Where are the disappeared?",
  "complication": "Someone with power wants the lists burned.",
  "needs": [
   "hunters",
   "death",
   "law"
  ],
  "place": [
   "town",
   "grave"
  ],
  "cast": [
   "family",
   "official"
  ],
  "beneath": {
   "wraith": "The disappeared remember the names.",
   "hunter": "The hunters know who ordered it.",
   "mortal": "A dictatorship and its victims."
  },
  "regions": [
   "southern-cone"
  ],
  "region": "southern-cone",
  "src": "history",
  "from": 1536,
  "tags": [
   "fire"
  ]
 },
 {
  "key": "r-southern-cone-alt",
  "title": "The end of the world",
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
  "role": "any",
  "surface": "A ship to Patagonia carrying someone who wants to vanish.",
  "needs": [
   "arrival",
   "fate",
   "rumour"
  ],
  "place": [
   "sea",
   "wild"
  ],
  "cast": [
   "stranger",
   "outcast"
  ],
  "beneath": {
   "vampire": "A Kindred flees a blood hunt.",
   "mortal": "A fugitive and a long voyage."
  },
  "regions": [
   "southern-cone"
  ],
  "region": "southern-cone",
  "src": "history",
  "from": 1536
 },
 {
  "key": "r-australia",
  "title": "The songline cut",
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
  "role": "anchor",
  "open": "The railway crew found the painted rock, and the foreman ordered it blasted.",
  "surface": "A road, fence, railway or mine cuts a songline, and the Dreaming answers.",
  "want": "The line built.",
  "question": "What does the songline hold?",
  "complication": "The crew is paid by the mile.",
  "needs": [
   "town",
   "project",
   "caern"
  ],
  "place": [
   "wild",
   "holy"
  ],
  "cast": [
   "elder",
   "official"
  ],
  "beneath": {
   "werewolf": "The Bunyip's lost kin, and the Dreaming.",
   "changeling": "The Dreaming here is old and strange.",
   "mortal": "A railway and a people."
  },
  "regions": [
   "australia"
  ],
  "region": "australia",
  "src": "history",
  "from": 1788
 },
 {
  "key": "r-australia-alt",
  "title": "The convict's escape",
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
  "role": "any",
  "surface": "An escaped prisoner in the bush, and what found them there.",
  "needs": [
   "arrival",
   "fight",
   "change"
  ],
  "place": [
   "wild"
  ],
  "cast": [
   "outcast",
   "spirit"
  ],
  "beneath": {
   "werewolf": "The bush spirits took the convict.",
   "mortal": "A fugitive and the trackers."
  },
  "regions": [
   "australia"
  ],
  "region": "australia",
  "src": "history",
  "from": 1788
 },
 {
  "key": "r-aotearoa",
  "title": "The guardian of the river",
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
  "role": "anchor",
  "open": "The dam's first stones were laid, and by morning they were at the bottom of the river.",
  "surface": "A river, lake or harbour has a guardian, and a dam, treaty or mine threatens it.",
  "want": "The dam built.",
  "question": "What does the guardian want?",
  "complication": "The guardian is not patient.",
  "needs": [
   "town",
   "project",
   "change"
  ],
  "place": [
   "river",
   "holy"
  ],
  "cast": [
   "spirit",
   "elder"
  ],
  "beneath": {
   "werewolf": "A guardian spirit, and its people.",
   "mortal": "A treaty, a dam and a people."
  },
  "regions": [
   "aotearoa"
  ],
  "region": "aotearoa",
  "src": "history"
 },
 {
  "key": "r-aotearoa-alt",
  "title": "The broken treaty",
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
  "role": "any",
  "surface": "Two texts of one treaty that say different things.",
  "needs": [
   "law",
   "seat",
   "event"
  ],
  "place": [
   "court"
  ],
  "cast": [
   "official",
   "elder"
  ],
  "beneath": {
   "mortal": "Two texts and two peoples.",
   "vampire": "A Kindred wrote one text."
  },
  "regions": [
   "aotearoa"
  ],
  "region": "aotearoa",
  "src": "history"
 },
 {
  "key": "r-pacific-islands",
  "title": "The island not on the chart",
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
  "role": "anchor",
  "open": "The navigator says the island is a day west, and the captain says there is nothing there.",
  "surface": "A navigator knows an island no chart shows, and others want it.",
  "want": "The island found.",
  "question": "Should the island be found?",
  "complication": "The island's own powers would rather stay hidden.",
  "needs": [
   "arrival",
   "change",
   "event"
  ],
  "place": [
   "sea",
   "holy"
  ],
  "cast": [
   "stranger",
   "spirit"
  ],
  "beneath": {
   "werewolf": "The island is a caern.",
   "mage": "The island is a Node.",
   "mortal": "A navigator, a navy and a test crew."
  },
  "regions": [
   "pacific-islands"
  ],
  "region": "pacific-islands",
  "src": "history"
 },
 {
  "key": "r-pacific-islands-alt",
  "title": "The god who was carried off",
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
  "role": "any",
  "surface": "A carved figure in a far museum that its people want home.",
  "needs": [
   "event",
   "tale",
   "rumour"
  ],
  "place": [
   "holy",
   "market"
  ],
  "cast": [
   "priest",
   "scholar"
  ],
  "beneath": {
   "werewolf": "The figure holds a spirit.",
   "mortal": "A museum and a people."
  },
  "regions": [
   "pacific-islands"
  ],
  "region": "pacific-islands",
  "src": "history"
 },
 {
  "key": "r-arctic",
  "title": "The lost expedition",
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
  "role": "anchor",
  "open": "The searchers found the first camp, and the tents were pitched inside out.",
  "surface": "An expedition went north and never came back, and the ice gives back things it should not.",
  "want": "To learn what happened.",
  "question": "What happened to them?",
  "complication": "A relative, a company and a searcher all want different answers.",
  "needs": [
   "death",
   "arrival",
   "fate"
  ],
  "place": [
   "wild",
   "sea"
  ],
  "cast": [
   "dead",
   "scholar"
  ],
  "beneath": {
   "wraith": "The lost are still walking.",
   "werewolf": "A Wendigo hunts the ice.",
   "mortal": "Cold, madness and a company."
  },
  "regions": [
   "arctic"
  ],
  "region": "arctic",
  "src": "history"
 },
 {
  "key": "r-arctic-alt",
  "title": "The northern lights",
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
  "role": "any",
  "surface": "Spirits that walk when the sky burns green.",
  "needs": [
   "change",
   "breach",
   "event"
  ],
  "place": [
   "wild"
  ],
  "cast": [
   "spirit",
   "outcast"
  ],
  "beneath": {
   "werewolf": "The lights are spirits.",
   "mortal": "A strange sky and stranger nights."
  },
  "regions": [
   "arctic"
  ],
  "region": "arctic",
  "src": "history"
 },
 {
  "key": "r-antarctica",
  "title": "What the ice core holds",
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
  "role": "anchor",
  "open": "The ice core came up red, and the drill operator has not slept since.",
  "surface": "Something is found deep in the southern ice, and the team is cut off until spring.",
  "want": "To study it.",
  "question": "What is in the ice?",
  "complication": "The team is cut off until spring.",
  "needs": [
   "change",
   "breach",
   "project"
  ],
  "place": [
   "wild",
   "fort"
  ],
  "cast": [
   "scholar",
   "outcast"
  ],
  "beneath": {
   "werewolf": "The ice holds an old Bane.",
   "mage": "The Technocracy wants the sample.",
   "mortal": "A discovery and a winter."
  },
  "regions": [
   "antarctica"
  ],
  "region": "antarctica",
  "src": "history",
  "from": 1899
 },
 {
  "key": "r-antarctica-alt",
  "title": "The hollow earth",
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
  "role": "any",
  "surface": "A madman's map of a way under the ice, and those who believe it.",
  "needs": [
   "rumour",
   "fate",
   "change"
  ],
  "place": [
   "wild"
  ],
  "cast": [
   "outcast",
   "scholar"
  ],
  "beneath": {
   "mage": "The map is a gateway.",
   "mortal": "A mad expedition."
  },
  "regions": [
   "antarctica"
  ],
  "region": "antarctica",
  "src": "history",
  "from": 1899
 },
 {
  "key": "door-vampire-1",
  "title": "Debt of favours",
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
  "role": "twist",
  "needs": [
   "debt",
   "grudge"
  ],
  "place": [
   "court",
   "town"
  ],
  "cast": [
   "elder"
  ],
  "beneath": {
   "vampire": "A boon falls due in the middle of it, owed to someone who wants this storyline to go their way."
  },
  "complication": "A boon falls due in the middle of it, owed to someone who wants this storyline to go their way.",
  "src": "lore"
 },
 {
  "key": "door-vampire-2",
  "title": "A breach to clean up",
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
  "role": "twist",
  "needs": [
   "breach",
   "rumour"
  ],
  "place": [
   "town",
   "house"
  ],
  "cast": [
   "official",
   "stranger"
  ],
  "beneath": {
   "vampire": "Someone saw something they should not have, and the Masquerade needs mending before the story can go on."
  },
  "complication": "Someone saw something they should not have, and the Masquerade needs mending before the story can go on.",
  "src": "lore"
 },
 {
  "key": "door-vampire-3",
  "title": "The herd goes sour",
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
  "role": "twist",
  "needs": [
   "plague",
   "change"
  ],
  "place": [
   "market",
   "town"
  ],
  "cast": [
   "family"
  ],
  "beneath": {
   "vampire": "The people the characters feed on are touched by it, and the blood tastes wrong."
  },
  "complication": "The people the characters feed on are touched by it, and the blood tastes wrong.",
  "src": "lore",
  "tags": [
   "plague"
  ]
 },
 {
  "key": "door-werewolf-1",
  "title": "A caern in danger",
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
  "role": "twist",
  "needs": [
   "caern",
   "wyrm"
  ],
  "place": [
   "wild",
   "holy"
  ],
  "cast": [
   "spirit"
  ],
  "beneath": {
   "werewolf": "The trouble spills onto a caern, and the sept demands it be dealt with."
  },
  "complication": "The trouble spills onto a caern, and the sept demands it be dealt with.",
  "src": "lore"
 },
 {
  "key": "door-werewolf-2",
  "title": "Kinfolk caught up",
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
  "role": "twist",
  "needs": [
   "arrival",
   "fight"
  ],
  "place": [
   "town",
   "house"
  ],
  "cast": [
   "family"
  ],
  "beneath": {
   "werewolf": "Kinfolk are among those touched by it, and they do not know what they are."
  },
  "complication": "Kinfolk are among those touched by it, and they do not know what they are.",
  "src": "lore"
 },
 {
  "key": "door-werewolf-3",
  "title": "A spirit's price",
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
  "role": "twist",
  "needs": [
   "change",
   "debt"
  ],
  "place": [
   "wild",
   "river"
  ],
  "cast": [
   "spirit"
  ],
  "beneath": {
   "werewolf": "A spirit will help, for a price that matters."
  },
  "complication": "A spirit will help, for a price that matters.",
  "src": "lore"
 },
 {
  "key": "door-mage-1",
  "title": "A Node to win or lose",
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
  "role": "twist",
  "needs": [
   "node",
   "project"
  ],
  "place": [
   "holy",
   "wild"
  ],
  "cast": [
   "scholar"
  ],
  "beneath": {
   "mage": "The trouble sits on a Node, and whoever ends it holds the Node."
  },
  "complication": "The trouble sits on a Node, and whoever ends it holds the Node.",
  "src": "lore"
 },
 {
  "key": "door-mage-2",
  "title": "Paradox to hide",
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
  "role": "twist",
  "needs": [
   "breach",
   "rumour"
  ],
  "place": [
   "town",
   "house"
  ],
  "cast": [
   "stranger"
  ],
  "beneath": {
   "mage": "Magic was seen, and the reality around it is sore."
  },
  "complication": "Magic was seen, and the reality around it is sore.",
  "src": "lore"
 },
 {
  "key": "door-mage-3",
  "title": "The Order closes in",
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
  "role": "twist",
  "needs": [
   "hunters",
   "law"
  ],
  "place": [
   "court",
   "town"
  ],
  "cast": [
   "official"
  ],
  "beneath": {
   "mage": "The Order of Reason or the Technocracy is looking into the same trouble."
  },
  "complication": "The Order of Reason or the Technocracy is looking into the same trouble.",
  "src": "lore"
 },
 {
  "key": "door-changeling-1",
  "title": "A dreamer in danger",
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
  "role": "twist",
  "needs": [
   "arrival",
   "change"
  ],
  "place": [
   "town",
   "house"
  ],
  "cast": [
   "family",
   "stranger"
  ],
  "beneath": {
   "changeling": "A mortal of great Glamour is caught in it, and Banality is closing on them."
  },
  "complication": "A mortal of great Glamour is caught in it, and Banality is closing on them.",
  "src": "lore"
 },
 {
  "key": "door-changeling-2",
  "title": "An oath to honour",
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
  "role": "twist",
  "needs": [
   "debt",
   "tale"
  ],
  "place": [
   "court",
   "holy"
  ],
  "cast": [
   "elder"
  ],
  "beneath": {
   "changeling": "An old oath binds someone at the heart of it."
  },
  "complication": "An old oath binds someone at the heart of it.",
  "src": "lore"
 },
 {
  "key": "door-changeling-3",
  "title": "A chimera loose",
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
  "role": "twist",
  "needs": [
   "change",
   "fight"
  ],
  "place": [
   "wild",
   "town"
  ],
  "cast": [
   "spirit"
  ],
  "beneath": {
   "changeling": "A chimera born of the trouble runs loose."
  },
  "complication": "A chimera born of the trouble runs loose.",
  "src": "lore"
 },
 {
  "key": "door-wraith-1",
  "title": "A fetter in danger",
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
  "role": "twist",
  "needs": [
   "death",
   "town"
  ],
  "place": [
   "house",
   "grave"
  ],
  "cast": [
   "dead",
   "family"
  ],
  "beneath": {
   "wraith": "A fetter is caught up in it, and the dead cannot let it go."
  },
  "complication": "A fetter is caught up in it, and the dead cannot let it go.",
  "src": "lore"
 },
 {
  "key": "door-wraith-2",
  "title": "A Spectre at the door",
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
  "role": "twist",
  "needs": [
   "breach",
   "change"
  ],
  "place": [
   "grave",
   "wild"
  ],
  "cast": [
   "dead"
  ],
  "beneath": {
   "wraith": "The trouble has thinned the Shroud, and something worse than a ghost is near."
  },
  "complication": "The trouble has thinned the Shroud, and something worse than a ghost is near.",
  "src": "lore"
 },
 {
  "key": "door-wraith-3",
  "title": "A message to the living",
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
  "role": "twist",
  "needs": [
   "fate",
   "tale"
  ],
  "place": [
   "house",
   "holy"
  ],
  "cast": [
   "dead",
   "family"
  ],
  "beneath": {
   "wraith": "A ghost has something to say about it, and needs someone to say it."
  },
  "complication": "A ghost has something to say about it, and needs someone to say it.",
  "src": "lore"
 },
 {
  "key": "door-hunter-1",
  "title": "Proof to find",
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
  "role": "twist",
  "needs": [
   "hunters",
   "rumour"
  ],
  "place": [
   "town",
   "church"
  ],
  "cast": [
   "hunter"
  ],
  "beneath": {
   "hunter": "There is proof here of what walks at night, if someone dares to take it."
  },
  "complication": "There is proof here of what walks at night, if someone dares to take it.",
  "src": "lore"
 },
 {
  "key": "door-hunter-2",
  "title": "A victim to save",
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
  "role": "twist",
  "needs": [
   "death",
   "arrival"
  ],
  "place": [
   "house",
   "wild"
  ],
  "cast": [
   "family"
  ],
  "beneath": {
   "hunter": "Someone innocent is about to be taken by it."
  },
  "complication": "Someone innocent is about to be taken by it.",
  "src": "lore"
 },
 {
  "key": "door-hunter-3",
  "title": "The ally who might be one of them",
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
  "role": "twist",
  "needs": [
   "grudge",
   "trial"
  ],
  "place": [
   "town",
   "court"
  ],
  "cast": [
   "stranger"
  ],
  "beneath": {
   "hunter": "Someone helping may be one of the monsters."
  },
  "complication": "Someone helping may be one of the monsters.",
  "src": "lore"
 },
 {
  "key": "door-mummy-1",
  "title": "A tomb or a relic",
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
  "role": "twist",
  "needs": [
   "breach",
   "event"
  ],
  "place": [
   "grave",
   "holy"
  ],
  "cast": [
   "scholar"
  ],
  "beneath": {
   "mummy": "An old tomb or relic of the Undying is caught up in it."
  },
  "complication": "An old tomb or relic of the Undying is caught up in it.",
  "src": "lore"
 },
 {
  "key": "door-mummy-2",
  "title": "An Apep cult",
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
  "role": "twist",
  "needs": [
   "cult",
   "change"
  ],
  "place": [
   "holy",
   "town"
  ],
  "cast": [
   "priest"
  ],
  "beneath": {
   "mummy": "A serpent cult uses the trouble as cover."
  },
  "complication": "A serpent cult uses the trouble as cover.",
  "src": "lore"
 },
 {
  "key": "door-mummy-3",
  "title": "A mortal life to finish",
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
  "role": "twist",
  "needs": [
   "fate",
   "lifepath"
  ],
  "place": [
   "house",
   "town"
  ],
  "cast": [
   "family"
  ],
  "beneath": {
   "mummy": "One of the Undying left a mortal life unfinished here."
  },
  "complication": "One of the Undying left a mortal life unfinished here.",
  "src": "lore"
 },
 {
  "key": "door-demon-1",
  "title": "A mortal's faith",
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
  "role": "twist",
  "needs": [
   "cult",
   "tale"
  ],
  "place": [
   "holy",
   "town"
  ],
  "cast": [
   "priest",
   "family"
  ],
  "beneath": {
   "demon": "A mortal's faith is caught up in it, and a Fallen needs that faith."
  },
  "complication": "A mortal's faith is caught up in it, and a Fallen needs that faith.",
  "src": "lore",
  "from": 1999
 },
 {
  "key": "door-demon-2",
  "title": "An Earthbound's cult",
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
  "role": "twist",
  "needs": [
   "cult",
   "hunters"
  ],
  "place": [
   "holy",
   "grave"
  ],
  "cast": [
   "priest"
  ],
  "beneath": {
   "demon": "The trouble is the work of an Earthbound's cult."
  },
  "complication": "The trouble is the work of an Earthbound's cult.",
  "src": "lore",
  "from": 1999
 },
 {
  "key": "door-demon-3",
  "title": "An old enemy",
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
  "role": "twist",
  "needs": [
   "grudge",
   "fate"
  ],
  "place": [
   "court",
   "town"
  ],
  "cast": [
   "stranger"
  ],
  "beneath": {
   "demon": "An enemy from the war in Heaven is on the other side."
  },
  "complication": "An enemy from the war in Heaven is on the other side.",
  "src": "lore",
  "from": 1999
 },
 {
  "key": "door-kuei-jin-1",
  "title": "The balance of Dharma",
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
  "role": "twist",
  "needs": [
   "change",
   "fate"
  ],
  "place": [
   "holy",
   "court"
  ],
  "cast": [
   "elder"
  ],
  "beneath": {
   "kuei-jin": "The trouble tips the balance of yin and yang, and the court must answer."
  },
  "complication": "The trouble tips the balance of yin and yang, and the court must answer.",
  "src": "lore"
 },
 {
  "key": "door-kuei-jin-2",
  "title": "A dragon nest",
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
  "role": "twist",
  "needs": [
   "node",
   "caern"
  ],
  "place": [
   "wild",
   "holy"
  ],
  "cast": [
   "spirit"
  ],
  "beneath": {
   "kuei-jin": "The trouble sits on a dragon nest."
  },
  "complication": "The trouble sits on a dragon nest.",
  "src": "lore"
 },
 {
  "key": "door-kuei-jin-3",
  "title": "A hungry ghost",
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
  "role": "twist",
  "needs": [
   "death",
   "breach"
  ],
  "place": [
   "grave",
   "town"
  ],
  "cast": [
   "dead"
  ],
  "beneath": {
   "kuei-jin": "A hungry ghost feeds on it."
  },
  "complication": "A hungry ghost feeds on it.",
  "src": "lore"
 },
 {
  "key": "door-mortal-1",
  "title": "Money",
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
  "role": "twist",
  "needs": [
   "debt",
   "project"
  ],
  "place": [
   "market",
   "town"
  ],
  "cast": [
   "merchant"
  ],
  "beneath": {
   "mortal": "Someone stands to make a fortune from it, or lose one."
  },
  "complication": "Someone stands to make a fortune from it, or lose one.",
  "src": "lore"
 },
 {
  "key": "door-mortal-2",
  "title": "Family",
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
  "role": "twist",
  "needs": [
   "arrival",
   "fate"
  ],
  "place": [
   "house",
   "town"
  ],
  "cast": [
   "family"
  ],
  "beneath": {
   "mortal": "A character's family is drawn in."
  },
  "complication": "A character's family is drawn in.",
  "src": "lore"
 },
 {
  "key": "door-mortal-3",
  "title": "The law",
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
  "role": "twist",
  "needs": [
   "law",
   "arrest"
  ],
  "place": [
   "court",
   "town"
  ],
  "cast": [
   "official"
  ],
  "beneath": {
   "mortal": "The law takes an interest, and it is not fair."
  },
  "complication": "The law takes an interest, and it is not fair.",
  "src": "lore"
 },
 {
  "key": "own-past-returns",
  "title": "The past comes back",
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
  "role": "anchor",
  "needs": [
   "hook",
   "lifepath"
  ],
  "place": [
   "town",
   "house"
  ],
  "cast": [
   "family",
   "stranger"
  ],
  "beneath": {
   "vampire": "Someone from a character's past arrives, wanting what was left unfinished.",
   "werewolf": "Someone from a character's past arrives, wanting what was left unfinished.",
   "mage": "Someone from a character's past arrives, wanting what was left unfinished.",
   "changeling": "Someone from a character's past arrives, wanting what was left unfinished.",
   "wraith": "Someone from a character's past arrives, wanting what was left unfinished.",
   "hunter": "Someone from a character's past arrives, wanting what was left unfinished.",
   "mummy": "Someone from a character's past arrives, wanting what was left unfinished.",
   "kuei-jin": "Someone from a character's past arrives, wanting what was left unfinished.",
   "mortal": "Someone from a character's past arrives, wanting what was left unfinished."
  },
  "surface": "Someone from a character's past arrives, wanting what was left unfinished.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-old-promise",
  "title": "An old promise",
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
  "role": "anchor",
  "needs": [
   "hook",
   "lifepath",
   "debt"
  ],
  "place": [
   "house",
   "holy"
  ],
  "cast": [
   "elder",
   "family"
  ],
  "beneath": {
   "vampire": "A promise a character made long ago is called in.",
   "werewolf": "A promise a character made long ago is called in.",
   "mage": "A promise a character made long ago is called in.",
   "changeling": "A promise a character made long ago is called in.",
   "wraith": "A promise a character made long ago is called in.",
   "hunter": "A promise a character made long ago is called in.",
   "mummy": "A promise a character made long ago is called in.",
   "kuei-jin": "A promise a character made long ago is called in.",
   "mortal": "A promise a character made long ago is called in."
  },
  "surface": "A promise a character made long ago is called in.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-the-sire",
  "title": "The one who made them",
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
  "role": "anchor",
  "needs": [
   "hook",
   "lifepath"
  ],
  "place": [
   "court",
   "house"
  ],
  "cast": [
   "elder"
  ],
  "beneath": {
   "vampire": "The one who brought a character into the night wants something.",
   "werewolf": "The one who brought a character into the night wants something.",
   "mage": "The one who brought a character into the night wants something.",
   "changeling": "The one who brought a character into the night wants something.",
   "wraith": "The one who brought a character into the night wants something.",
   "hunter": "The one who brought a character into the night wants something.",
   "mummy": "The one who brought a character into the night wants something.",
   "kuei-jin": "The one who brought a character into the night wants something.",
   "mortal": "The one who brought a character into the night wants something."
  },
  "surface": "The one who brought a character into the night wants something.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-lost-kin",
  "title": "Kin thought lost",
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
  "role": "anchor",
  "needs": [
   "hook",
   "lifepath",
   "arrival"
  ],
  "place": [
   "road",
   "town"
  ],
  "cast": [
   "family"
  ],
  "beneath": {
   "vampire": "Word comes that someone a character lost is alive.",
   "werewolf": "Word comes that someone a character lost is alive.",
   "mage": "Word comes that someone a character lost is alive.",
   "changeling": "Word comes that someone a character lost is alive.",
   "wraith": "Word comes that someone a character lost is alive.",
   "hunter": "Word comes that someone a character lost is alive.",
   "mummy": "Word comes that someone a character lost is alive.",
   "kuei-jin": "Word comes that someone a character lost is alive.",
   "mortal": "Word comes that someone a character lost is alive."
  },
  "surface": "Word comes that someone a character lost is alive.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-enemy",
  "title": "The enemy who waited",
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
  "role": "anchor",
  "needs": [
   "hook",
   "grudge"
  ],
  "place": [
   "town",
   "road"
  ],
  "cast": [
   "stranger",
   "soldier"
  ],
  "beneath": {
   "vampire": "An enemy has waited for the right moment, and it has come.",
   "werewolf": "An enemy has waited for the right moment, and it has come.",
   "mage": "An enemy has waited for the right moment, and it has come.",
   "changeling": "An enemy has waited for the right moment, and it has come.",
   "wraith": "An enemy has waited for the right moment, and it has come.",
   "hunter": "An enemy has waited for the right moment, and it has come.",
   "mummy": "An enemy has waited for the right moment, and it has come.",
   "kuei-jin": "An enemy has waited for the right moment, and it has come.",
   "mortal": "An enemy has waited for the right moment, and it has come."
  },
  "surface": "An enemy has waited for the right moment, and it has come.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-secret",
  "title": "The secret gets out",
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
  "role": "anchor",
  "needs": [
   "hook",
   "rumour",
   "tale"
  ],
  "place": [
   "town",
   "court"
  ],
  "cast": [
   "official",
   "family"
  ],
  "beneath": {
   "vampire": "A secret a character has kept begins to spread.",
   "werewolf": "A secret a character has kept begins to spread.",
   "mage": "A secret a character has kept begins to spread.",
   "changeling": "A secret a character has kept begins to spread.",
   "wraith": "A secret a character has kept begins to spread.",
   "hunter": "A secret a character has kept begins to spread.",
   "mummy": "A secret a character has kept begins to spread.",
   "kuei-jin": "A secret a character has kept begins to spread.",
   "mortal": "A secret a character has kept begins to spread."
  },
  "surface": "A secret a character has kept begins to spread.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-goal",
  "title": "Within reach",
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
  "role": "anchor",
  "needs": [
   "hook",
   "project"
  ],
  "place": [
   "town",
   "market"
  ],
  "cast": [
   "merchant",
   "elder"
  ],
  "beneath": {
   "vampire": "What a character has wanted all along is suddenly within reach, at a cost.",
   "werewolf": "What a character has wanted all along is suddenly within reach, at a cost.",
   "mage": "What a character has wanted all along is suddenly within reach, at a cost.",
   "changeling": "What a character has wanted all along is suddenly within reach, at a cost.",
   "wraith": "What a character has wanted all along is suddenly within reach, at a cost.",
   "hunter": "What a character has wanted all along is suddenly within reach, at a cost.",
   "mummy": "What a character has wanted all along is suddenly within reach, at a cost.",
   "kuei-jin": "What a character has wanted all along is suddenly within reach, at a cost.",
   "mortal": "What a character has wanted all along is suddenly within reach, at a cost."
  },
  "surface": "What a character has wanted all along is suddenly within reach, at a cost.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-grudge",
  "title": "The grudge comes due",
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
  "role": "anchor",
  "needs": [
   "grudge"
  ],
  "place": [
   "town",
   "house"
  ],
  "cast": [
   "family",
   "stranger"
  ],
  "beneath": {
   "vampire": "Someone a character wronged has stopped waiting.",
   "werewolf": "Someone a character wronged has stopped waiting.",
   "mage": "Someone a character wronged has stopped waiting.",
   "changeling": "Someone a character wronged has stopped waiting.",
   "wraith": "Someone a character wronged has stopped waiting.",
   "hunter": "Someone a character wronged has stopped waiting.",
   "mummy": "Someone a character wronged has stopped waiting.",
   "kuei-jin": "Someone a character wronged has stopped waiting.",
   "mortal": "Someone a character wronged has stopped waiting."
  },
  "surface": "Someone a character wronged has stopped waiting.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-debt",
  "title": "Payment is asked",
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
  "role": "anchor",
  "needs": [
   "debt"
  ],
  "place": [
   "market",
   "court"
  ],
  "cast": [
   "merchant",
   "elder"
  ],
  "beneath": {
   "vampire": "Someone the characters owe asks for payment, now.",
   "werewolf": "Someone the characters owe asks for payment, now.",
   "mage": "Someone the characters owe asks for payment, now.",
   "changeling": "Someone the characters owe asks for payment, now.",
   "wraith": "Someone the characters owe asks for payment, now.",
   "hunter": "Someone the characters owe asks for payment, now.",
   "mummy": "Someone the characters owe asks for payment, now.",
   "kuei-jin": "Someone the characters owe asks for payment, now.",
   "mortal": "Someone the characters owe asks for payment, now."
  },
  "surface": "Someone the characters owe asks for payment, now.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-tale",
  "title": "The tale grows",
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
  "role": "anchor",
  "needs": [
   "tale"
  ],
  "place": [
   "town",
   "market"
  ],
  "cast": [
   "stranger",
   "family"
  ],
  "beneath": {
   "vampire": "A tale of a character's deed has grown in the telling, and someone believes the worst version.",
   "werewolf": "A tale of a character's deed has grown in the telling, and someone believes the worst version.",
   "mage": "A tale of a character's deed has grown in the telling, and someone believes the worst version.",
   "changeling": "A tale of a character's deed has grown in the telling, and someone believes the worst version.",
   "wraith": "A tale of a character's deed has grown in the telling, and someone believes the worst version.",
   "hunter": "A tale of a character's deed has grown in the telling, and someone believes the worst version.",
   "mummy": "A tale of a character's deed has grown in the telling, and someone believes the worst version.",
   "kuei-jin": "A tale of a character's deed has grown in the telling, and someone believes the worst version.",
   "mortal": "A tale of a character's deed has grown in the telling, and someone believes the worst version."
  },
  "surface": "A tale of a character's deed has grown in the telling, and someone believes the worst version.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-heir",
  "title": "The inheritance",
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
  "role": "anchor",
  "needs": [
   "fate"
  ],
  "place": [
   "house",
   "court"
  ],
  "cast": [
   "family",
   "official"
  ],
  "beneath": {
   "vampire": "A death leaves something to the characters, and others want it.",
   "werewolf": "A death leaves something to the characters, and others want it.",
   "mage": "A death leaves something to the characters, and others want it.",
   "changeling": "A death leaves something to the characters, and others want it.",
   "wraith": "A death leaves something to the characters, and others want it.",
   "hunter": "A death leaves something to the characters, and others want it.",
   "mummy": "A death leaves something to the characters, and others want it.",
   "kuei-jin": "A death leaves something to the characters, and others want it.",
   "mortal": "A death leaves something to the characters, and others want it."
  },
  "surface": "A death leaves something to the characters, and others want it.",
  "src": "wodx",
  "question": "What does the past want now?"
 },
 {
  "key": "own-arrival",
  "title": "A newcomer",
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
  "role": "anchor",
  "needs": [
   "arrival"
  ],
  "place": [
   "town",
   "road"
  ],
  "cast": [
   "stranger",
   "family"
  ],
  "beneath": {
   "vampire": "Someone new arrives and asks for the characters by name.",
   "werewolf": "Someone new arrives and asks for the characters by name.",
   "mage": "Someone new arrives and asks for the characters by name.",
   "changeling": "Someone new arrives and asks for the characters by name.",
   "wraith": "Someone new arrives and asks for the characters by name.",
   "hunter": "Someone new arrives and asks for the characters by name.",
   "mummy": "Someone new arrives and asks for the characters by name.",
   "kuei-jin": "Someone new arrives and asks for the characters by name.",
   "mortal": "Someone new arrives and asks for the characters by name."
  },
  "surface": "Someone new arrives and asks for the characters by name.",
  "src": "wodx",
  "question": "What does the past want now?"
 }
];
