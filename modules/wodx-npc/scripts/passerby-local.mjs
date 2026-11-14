/**
 * WoDX NPC 0.52.0 (B2674): local looks for passers-by. Pure data, harness-tested.
 *
 * passerby-world.mjs gives each way of life its own street, so Fez and Isfahan, or Seoul and Hangzhou, walk the same
 * crowd. This file changes that street once more for the region itself: what people wear, carry and sell there, and
 * a few kinds no other land of that way of life has. The changes are keyed by region, then by the way of life the
 * region keeps that year (so Mexico before 1521 and New Spain after differ), then by age.
 *
 * An age key is one of passerby-rules.mjs AGES, or "all" (every age), "old" (medieval and early modern) or "late"
 * (1914 on). They apply in that order: all, then old or late, then the age itself.
 * A change with a who is a whole kind: it replaces the kind of that key or adds a new one. A change without a who
 * only changes the fields it gives (most often the looks) of a kind the street already has, and is skipped when the
 * street lacks that kind. null takes the kind away.
 *
 * House readings (docs/PENDING-REVIEW.md, B2674): every kind and look below. No book gives street tables.
 */
const P = (who, looks, day, night, more = {}) => ({who, looks, day, night, ...more});
const L = looks => ({looks});
const DRUNK = {drunk: 0.9, areas: {slums: 1.5, lower: 1.3}};
const RICH = {areas: {merchant: 2, slums: 0.2}};
const CAMELS = looks => P("a camel driver", looks, 3, 0.3);
const TEA = looks => P("a regular of the tea house", looks, 0.5, 1.2);

export const LOCAL_LOOKS = {
  /* ---- The lands of Islam ---- */
  maghreb: {islamic: {
    old: {
      burgher: L(["in a hooded wool burnous", "in yellow leather slippers", "with a fine white haik over one shoulder"]),
      peasant: P("a Berber farmer come to market", ["with a basket of olives", "leading a mule laden with argan nuts", "in a striped wool cloak"], 4, 0.1),
      water: L(["in a red tasselled hat, ringing a brass bell", "with a dripping goatskin and brass cups"]),
      tanner: P("a hand from the tanneries", ["stained to the elbows", "reeking of the dye pits"], 2, 0.2, {areas: {slums: 1.5, merchant: 0.5}})
    },
    early: {wagoner: CAMELS(["with a string of camels from the desert road", "in an indigo veil"]),
      hawker: L(["with a tray of almond pastries", "crying fresh mint", "with a bundle of leather slippers"]), journeyman: null},
    industrial: {student: L(["in a red felt cap and a djellaba", "with a satchel of books"])},
    late: {
      worker: L(["in a hooded djellaba", "in blue work clothes"]), shopper: L(["in a hooded djellaba", "with a basket of mint and bread"]),
      commuter: L(["in a hooded djellaba over jeans", "in a leather jacket", "with a moped helmet under one arm"]),
      drinker: TEA(["with a glass of sweet mint tea", "watching the street over a newspaper"])
    }
  }},
  persia: {islamic: {
    old: {
      burgher: P("a silk merchant", ["in a long sashed coat", "with a henna-dyed beard", "with a string of turquoise beads"], 2, 0.3, RICH),
      peasant: L(["with a load of pistachios", "leading a donkey with sacks of saffron", "in a felt cap"]),
      friar: P("a dervish", ["in a tall felt cap", "with a begging bowl carved from a coconut", "reciting a poet's verses"], 1.5, 0.4)
    },
    early: {
      soldier: P("a red-capped horse soldier off duty", ["in a turban with a red baton", "with a curved sword"], 1, 1, {drunk: 0.1}),
      teller: P("a coffee house storyteller", ["with a painted cloth of heroes", "reciting the deeds of the old kings"], 0.3, 1, {from: 1550}),
      hawker: L(["crying sherbet and rosewater", "with a tray of sugared almonds", "with a roll of small carpets"]),
      wagoner: CAMELS(["leading a caravan through the city gate", "with bells on the lead camel"]), journeyman: null
    },
    industrial: {
      soldier: P("a soldier of the shah's guard", ["in a lambskin cap", "with a rifle slung"], 1, 1, {drunk: 0.1}),
      student: L(["in a lambskin cap", "with a satchel of books"]), teller: P("a coffee house storyteller", ["with a painted cloth of heroes"], 0.3, 1)
    },
    c20: {shopper: L(["in a printed headscarf", "with a string bag of flatbread", "in a western coat"])},
    modern: {
      shopper: P("a shopper", ["in a black chador", "in a long coat and headscarf", "with bags from the bazaar"], 3, 0.5),
      commuter: L(["in a long coat and headscarf", "in a collarless shirt", "with a string of prayer beads"])
    },
    late: {drinker: TEA(["with a glass of tea and a sugar lump", "smelling of the water pipe"])}
  }},
  anatolia: {islamic: {
    old: {
      burgher: L(["in a fur-trimmed kaftan", "in a tall turban", "with an amber pipe stem"]),
      porter: P("a porter", ["bent under a load on a padded saddle", "with a rope over one shoulder"], 3, 0.3)
    },
    early: {hawker: L(["with a tray of sesame rings", "crying boza in the cold", "with a stack of copper pans"]),
      wagoner: P("an ox cart driver", ["with a creaking two-wheeled cart", "in baggy trousers"], 3, 0.3)},
    industrial: {porter: P("a porter", ["bent under a load on a padded saddle"], 3, 0.3)},
    late: {
      drinker: TEA(["with a tulip glass of tea", "clicking prayer beads", "over a game of backgammon"]),
      worker: L(["in a flat cap", "with a simit tray on the head"])
    }
  }},
  levant: {islamic: {
    old: {
      burgher: P("a soap and silk merchant", ["in a striped silk robe", "with a sash of fine damask", "smelling of olive soap"], 2, 0.3, RICH),
      peasant: L(["with a basket of olives", "leading a donkey laden with lemons", "in a white headcloth"]),
      pilgrim: P("a pilgrim to the holy places", ["with a palm frond", "asking the way to Jerusalem", "with a water skin"], 1.2, 0.3)
    },
    early: {hawker: L(["with a tray of sweets in syrup", "crying licorice water", "with strings of dried figs"]),
      wagoner: CAMELS(["in from the desert road", "with a load of soap for the coast"]), journeyman: null},
    late: {
      drinker: TEA(["with a cup of bitter coffee", "playing cards in the shade"]),
      commuter: L(["in a checked headscarf", "in a cheap suit", "with a string of prayer beads"])
    }
  }},
  egypt: {islamic: {
    old: {
      peasant: P("a fellah come to market", ["with a basket of onions", "in a blue galabiya", "leading a water buffalo"], 4, 0.1),
      burgher: L(["in a wide-sleeved robe", "with a fly whisk", "in a fine turban"]),
      boatman: P("a boatman off the river", ["with a coil of rope", "smelling of river mud"], 2, 0.5)
    },
    early: {hawker: L(["crying licorice water", "with a tray of flat loaves on the head", "with a basket of dates"]),
      wagoner: P("a donkey driver for hire", ["with a saddled donkey", "calling out to strangers"], 3, 0.3), journeyman: null},
    medieval: {mamluk: P("a mounted slave soldier", ["on a fine horse", "in a yellow sash", "with a mace at the saddle"], 0.8, 0.3, RICH)},
    industrial: {boatman: P("a boatman off the river", ["with a coil of rope"], 2, 0.5)},
    late: {
      drinker: TEA(["playing dominoes", "with a water pipe and a glass of tea"]),
      commuter: L(["in a galabiya", "in a cheap suit", "hanging off a crowded bus"])
    }
  }},
  arabia: {islamic: {
    old: {
      peasant: P("a bedouin come to market", ["leading a camel", "in a black goat-hair cloak", "with a curved dagger at the belt"], 3, 0.1),
      burgher: P("an incense and pearl merchant", ["smelling of frankincense", "in a fine white robe", "with a pouch of pearls"], 2, 0.3, RICH),
      pilgrim: L(["in the two white cloths of the pilgrimage", "with a water skin from the wells"]),
      dates: P("a date seller", ["with baskets of dates", "under a palm-leaf awning"], 2, 0.1)
    },
    early: {hawker: L(["with a tray of coffee beans", "with a basket of incense"]), wagoner: CAMELS(["in from the desert", "with a load of dates"]), journeyman: null},
    late: {
      commuter: L(["in a white robe and a red-checked headcloth", "in a black abaya", "on a phone in a shopping mall's car park"]),
      drinker: TEA(["with a small cup of cardamom coffee", "beside a coal brazier"])
    }
  }},
  "central-asia": {islamic: {
    old: {
      burgher: P("a caravan merchant", ["in a striped quilted robe", "in a fur hat, leading a two-humped camel"], 2, 0.3, RICH),
      peasant: L(["with a load of melons", "on a small steppe horse", "in a quilted robe"]),
      herder: P("a horse herder", ["with a lasso pole", "smelling of mare's milk"], 1.5, 0.2)
    },
    early: {hawker: L(["with a stack of round flatbreads", "with a basket of dried apricots"]),
      wagoner: CAMELS(["leading two-humped camels", "in a quilted robe and fur hat"]), journeyman: null},
    c20: {soldier: P("a Red Army soldier", ["in a drab tunic", "with a rifle slung"], 1, 1, {drunk: 0.4})},
    late: {drinker: TEA(["in a tea house under the plane trees", "with a bowl of green tea"]),
      shopper: L(["in a bright ikat dress", "with a basket of flatbread"])}
  }},
  aegean: {
    islamic: {old: {fisher: P("a fisher", ["with a basket of octopus", "mending a net"], 2.5, 0.5)},
      industrial: {fisher: P("a fisher", ["mending a net"], 2.5, 0.5)}},
    orthodox: {
      old: {
        burgher: L(["in a silk tunic", "with gold coins in a purse", "with a seal ring"]),
        fisher: P("a fisher", ["with a basket of octopus", "mending a net"], 2.5, 0.5)
      },
      industrial: {diver: P("a sponge diver", ["with salt-cracked skin", "with a sack of sponges"], 1.5, 0.3)},
      late: {drinker: P("a regular of the village coffee house", ["clicking worry beads", "over a game of backgammon"], 0.5, 1.2)}
    }
  },

  /* ---- The Eastern church ---- */
  russia: {orthodox: {
    old: {
      burgher: L(["in a fur hat and a long kaftan", "with a beard to the chest", "with a fat purse at the belt"]),
      peasant: L(["in bast shoes and a sheepskin", "with a sledge of firewood", "with a basket of mushrooms"])
    },
    early: {soldier: P("a musketeer of the tsar", ["in a long red coat", "with a poleaxe and a musket"], 1, 1, {drunk: 0.6})},
    industrial: {cabman: P("a sledge cab driver", ["in a padded coat and a low hat", "waiting for a fare"], 2, 1, {drunk: 0.4})},
    c20: {soldier: P("a Red Army soldier", ["in a drab greatcoat", "with a rifle slung"], 1, 1, {drunk: 0.5}),
      shopper: L(["in a queue with a string bag", "in a headscarf and felt boots"])}
  }},
  siberia: {orthodox: {
    early: {
      fur: P("a fur trader", ["with a load of sable pelts", "in a coat of furs"], 2, 0.3),
      soldier: P("a Cossack of the outpost", ["with a musket and a fur cap", "on a shaggy horse"], 1, 1, {drunk: 0.6})
    },
    industrial: {exile: P("an exile", ["in a convict's grey coat", "with a shaven half-head"], 1, 0.3)}
  }, northern: {
    medieval: {carter: P("a reindeer herder", ["leading a reindeer sledge", "in reindeer skins"], 2, 0.3)}
  }},

  /* ---- China and Korea ---- */
  china: {sinic: {
    old: {tea: P("a tea seller", ["with a kettle on a shoulder pole", "calling out the price of a bowl"], 2, 0.4)},
    early: {
      soldier: P("a bannerman of the garrison", ["with a shaved brow and a long queue", "in the colours of a banner"], 1, 1, {drunk: 0.4}),
      burgher: L(["in a padded silk gown", "with a long queue", "followed by a porter"])
    },
    industrial: {burgher: L(["in a silk gown and a skullcap", "with a long queue", "with a pipe of tobacco"])}
  }},
  korea: {sinic: {
    old: {
      burgher: P("a merchant of the town", ["in a white ramie robe", "in a black horsehair hat"], 2, 0.3, RICH),
      peasant: P("a farmer come to market", ["with a load on an A-frame carrier", "in white hemp"], 4, 0.1)
    },
    early: {
      priest: P("a scholar of the gentry", ["in a wide black horsehair hat", "with a long pipe", "followed by a servant"], 1.5, 0.3, RICH),
      student: P("a student of the Confucian academy", ["in a blue robe", "with the classics wrapped in cloth"], 1.2, 0.4, {drunk: 0.2})
    },
    industrial: {cabman: P("a porter with an A-frame", ["waiting for a load"], 2, 0.5)}
  }},

  /* ---- Africa below the desert ---- */
  "central-africa": {bantu: {
    old: {
      burgher: P("a noble of the court", ["in a raffia-cloth wrap", "with a cap of office", "with a fly whisk"], 2, 0.3),
      peasant: L(["with a basket of yams", "with a load of palm nuts"]),
      weaver: P("a raffia weaver", ["with a bundle of fine cloth", "with dye on the fingers"], 2, 0.2)
    },
    early: {
      peasant: L(["with a basket of cassava", "with a load of palm nuts"]),
      catechist: P("a catechist of the Kongo church", ["with a wooden cross", "in raffia cloth"], 0.5, 0.2, {from: 1491})
    }
  }},
  "southern-africa": {
    bantu: {old: {gold: P("a gold trader from the hills", ["with a little bag of gold dust", "with copper rings on the arms"], 1, 0.2)}},
    latin: {
      early: {wagoner: P("an ox wagon driver", ["in a broad-brimmed hat", "with a long whip"], 3, 0.3)},
      industrial: {hand: P("a mine hand", ["with dust in every crease", "carrying a lamp"], 3, 1.5)},
      late: {commuter: L(["in a bright print shirt", "off a minibus taxi"])}
    }
  },

  /* ---- The Americas before the settlers ---- */
  caribbean: {mesoamerican: {
    medieval: {
      carter: null, apprentice: null,
      burgher: P("a chief's attendant", ["with a gold disc on the chest", "painted red and black"], 2, 0.3),
      peasant: P("a farmer from the mounded gardens", ["with a basket of cassava bread", "with a load of sweet potatoes"], 4, 0.1),
      friar: P("a healer and seer", ["with a carved snuff tray", "with a figure of a spirit"], 1, 0.4),
      fisher: P("a fisher", ["with a canoe paddle", "with a basket of conch"], 3, 0.5)
    }
  }},
  brazil: {andean: {
    medieval: {
      carter: null, runner: null,
      burgher: P("a village elder", ["with a feather headdress", "painted with black dye"], 2, 0.3),
      peasant: P("a farmer from the manioc gardens", ["with a basket of manioc", "with a gourd of water"], 4, 0.1),
      friar: P("a shaman", ["with a feathered rattle", "blowing tobacco smoke"], 1, 0.4),
      reveller: P("a guest from a drinking feast", ["swaying", "singing"], 0.5, 1.2, DRUNK),
      fisher: P("a fisher", ["with a bow and fish arrows", "with a string of fish"], 3, 0.5)
    }
  }},
  "southern-cone": {andean: {
    medieval: {
      runner: null,
      burgher: P("a village head", ["in a woven poncho", "with a carved staff"], 2, 0.3),
      friar: P("a healer", ["with a painted drum", "with a sprig of cinnamon tree"], 1, 0.4),
      peasant: L(["with a bag of potatoes", "with a basket of pine nuts", "in a woven poncho"])
    }
  }},
  "north-america-east": {northern: {
    medieval: {
      carter: P("a hunter back from the woods", ["with a deer over the shoulders", "in deerskin leggings"], 2, 0.3),
      peasant: P("a farmer from the cornfields", ["with a basket of corn and beans", "with a hoe of bone"], 4, 0.1),
      burgher: P("a clan elder", ["in a robe of turkey feathers", "with a string of shell beads"], 1.5, 0.3),
      friar: P("a healer", ["with a turtle-shell rattle", "with a pouch of tobacco"], 1, 0.4),
      fisher: P("a fisher", ["with a weir basket", "in a bark canoe"], 2, 0.3)
    }
  }, latin: {
    early: {hunter: P("a frontier hunter in town", ["in a fringed hunting shirt", "with a long rifle"], 1.5, 0.5, {drunk: 0.5})},
    industrial: {hand: L(["in shirtsleeves and braces", "with a lunch pail"])}
  }},
  "north-america-west": {northern: {
    medieval: {
      carter: P("a hunter", ["with a bow and a string of rabbits", "in a rabbit-skin robe"], 2, 0.3),
      peasant: P("a gatherer come to trade", ["with a basket of acorns", "with a load of dried salmon"], 3, 0.1),
      burgher: P("a house chief", ["in a woven cedar-bark robe", "with a carved staff"], 1.5, 0.3),
      fisher: P("a fisher", ["with a string of salmon", "in a cedar-bark cape"], 3, 0.4)
    }
  }, latin: {
    early: {vaquero: P("a mounted cattle hand", ["in a wide hat", "with a coiled lariat"], 2, 0.6, {drunk: 0.5})},
    industrial: {prospector: P("a prospector", ["with a pan and a pick", "muddy to the knees"], 1.5, 1, {drunk: 0.6})}
  }},
  canada: {northern: {
    medieval: {
      carter: P("a hunter back from the woods", ["with a moose hide", "on snowshoes"], 2, 0.3),
      peasant: P("a hunter come to trade", ["with a bundle of beaver pelts", "in a birchbark canoe"], 3, 0.2),
      fisher: P("a fisher", ["in a birchbark canoe", "with a string of whitefish"], 2, 0.3)
    }
  }, latin: {
    early: {voyageur: P("a fur trade canoe hand", ["in a red sash and a wool cap", "with a pack of furs on a tumpline"], 1.5, 0.8, {drunk: 0.6})},
    industrial: {voyageur: P("a lumber hand down from the camps", ["in a checked wool coat", "with a peavey over one shoulder"], 1.5, 1, {drunk: 0.6})}
  }},
  australia: {northern: {
    medieval: {
      carter: null, burgher: null,
      peasant: P("a hunter back from the bush", ["with a spear and a spear-thrower", "carrying a kangaroo"], 3, 0.2),
      friar: P("an elder", ["painted with white clay", "carrying a message stick"], 1, 0.3),
      fisher: P("a fisher", ["with a fish spear", "from a bark canoe"], 2, 0.3),
      gatherer: P("a gatherer", ["with a carved wooden dish of seeds", "with a digging stick"], 3, 0.1)
    }
  }, latin: {
    early: {convict: P("a convict of a work gang", ["in coarse slops", "with a broad arrow on the shirt"], 2, 0.1)},
    industrial: {drover: P("a drover in town", ["in a cabbage-tree hat", "dusty from the stock route"], 1.5, 1, {drunk: 0.6}),
      digger: P("a digger from the goldfields", ["in a blue serge shirt", "with a swag on the back"], 1.5, 1, {drunk: 0.6})}
  }},
  aotearoa: {polynesian: {
    medieval: {
      burgher: P("a chief's kin", ["in a flax cloak with a feather border", "with a greenstone club at the belt"], 2, 0.3),
      peasant: L(["with a basket of sweet potatoes", "with a digging stick"]),
      friar: P("a learned priest", ["with a carved staff", "chanting under the breath"], 1, 0.3),
      carver: P("a carver", ["with chisels of greenstone", "with wood shavings in the hair"], 2, 0.2)
    }
  }, latin: {
    industrial: {digger: P("a gum digger", ["with a spear for probing the swamp", "with a sack of kauri gum"], 1.5, 0.6, {drunk: 0.5})}
  }},
  "pacific-islands": {latin: {
    industrial: {whaler: P("a whaler ashore", ["smelling of try-pot smoke", "with a sea chest"], 1.5, 1.5, {drunk: 0.7}),
      copra: P("a copra trader", ["in a pith helmet", "with sacks of dried coconut"], 1.5, 0.3)}
  }},

  /* ---- The Americas after the settlers ---- */
  mexico: {latin: {
    early: {
      burgher: P("a merchant of New Spain", ["in a black Spanish doublet", "with a silver chain"], 2, 0.3, RICH),
      hawker: L(["selling tortillas from a cloth", "with a basket of chillies", "with a load of cacao beans"]),
      porter: P("a porter", ["with a tumpline load", "bent under a basket of maize"], 3, 0.2),
      priest: L(["in a grey friar's habit", "with a rosary of wooden beads", "on the way to the mission church"])
    },
    industrial: {hand: L(["in a wide straw hat", "in a striped serape", "in white cotton"])},
    late: {
      worker: L(["in a straw hat", "with a machete at the belt"]),
      vendor: P("a street food seller", ["with a cart of tacos", "with a pot of corn on the cob"], 3, 1.5)
    }
  }},
  andes: {latin: {
    early: {
      hawker: L(["in a wide woven skirt and shawl", "with a load of potatoes", "with a bundle of coca leaves"]),
      carter: P("a llama driver", ["with a string of llamas", "chewing coca"], 3, 0.2)
    },
    industrial: {carter: P("a llama driver", ["with a string of llamas"], 3, 0.2)},
    late: {shopper: L(["in a bowler hat and layered skirts", "with a bright woven carrying cloth"])}
  }}
};

/* The Caribbean, Brazil and the Southern Cone after the settlers, beside their older streets above */
Object.assign(LOCAL_LOOKS.caribbean, {latin: {
  early: {hand: P("a field hand off a sugar estate", ["sweat-soaked from the boiling house", "with a cane knife"], 2, 0.3),
    sailor: P("a sailor off a ship", ["with a tarred pigtail", "smelling of rum"], 2, 1.5, {drunk: 0.7})},
  industrial: {hand: L(["in a straw hat", "with a machete at the belt"])},
  late: {drinker: L(["smelling of rum", "slapping down dominoes"]), commuter: L(["in a bright print shirt", "with a transistor radio"])}
}});
Object.assign(LOCAL_LOOKS.brazil, {latin: {
  early: {hand: P("a field hand off a sugar estate", ["with a cane knife", "sweat-soaked from the mill"], 2, 0.3)},
  industrial: {coffee: P("a coffee carrier", ["with a sack on the head", "trotting to the docks"], 2.5, 0.2)},
  late: {drinker: L(["smelling of cane spirit", "with a cold bottle of beer"]), clubber: L(["on the way to a samba school", "with a tambourine"])}
}});
Object.assign(LOCAL_LOOKS["southern-cone"], {latin: {
  industrial: {gaucho: P("a gaucho in town", ["in a poncho and wide trousers", "with a knife at the back of the belt"], 1.5, 1, {drunk: 0.6})},
  late: {drinker: L(["with a gourd of mate", "with a thermos under one arm"])}
}});

/* ---- Europe: a touch of each land on the central European street ---- */
Object.assign(LOCAL_LOOKS, {
  italy: {latin: {
    medieval: {burgher: L(["in a red cloak of fine cloth", "with a banker's ledger", "in a close-fitting cap"])},
    early: {hawker: L(["with a tray of holy pictures", "crying roasted chestnuts", "with a basket of lemons"])}
  }},
  iberia: {latin: {
    old: {muleteer: P("a muleteer", ["with a string of mules", "in a wide sash"], 2.5, 0.3)},
    early: {water: P("a water carrier", ["with clay jars on a donkey", "calling out fresh water"], 2, 0.2)}
  }},
  "british-isles": {latin: {
    early: {link: P("a torch-bearer for hire", ["with a pitch torch", "offering a light home"], 0, 1.2)},
    industrial: {coster: P("a costermonger", ["with a barrow of fruit", "in a pearl-buttoned coat"], 3, 0.8)}
  }},
  france: {latin: {
    medieval: {carter: L(["with casks of wine", "in a mud-spattered hood"])},
    industrial: {boatman: P("a river boatman", ["in a blue smock", "with a coil of tow rope"], 2, 0.5)}
  }},
  "low-countries": {latin: {early: {skipper: P("a canal boatman", ["with a punting pole", "smelling of peat smoke"], 2.5, 0.5)}}},
  scandinavia: {latin: {old: {fisher: P("a fisher", ["with a bundle of dried cod", "in a sealskin coat"], 2.5, 0.4)}}},
  "poland-baltic": {latin: {medieval: {amber: P("an amber trader", ["with a pouch of amber", "in a fur-lined cap"], 1.5, 0.2)}}},
  "carpathians-balkans": {latin: {old: {shepherd: P("a shepherd down from the mountains", ["in a long sheepskin cloak", "with a crook"], 2, 0.2)}}}
});

/** Age keys a change may use, with the ages each one covers. */
export const LOCAL_AGES = {all: null, old: ["medieval", "early"], late: ["c20", "modern", "future"]};

/**
 * The street of an age with a region's own looks on it. table: the way of life's street (passerby-world.mjs
 * tableFor); returns the same object when the region has nothing of its own then.
 */
export function localTable(table, region, sphere, age) {
  const changes = LOCAL_LOOKS[region]?.[sphere];
  if ( !changes ) return table;
  const parts = [changes.all];
  for ( const [k, ages] of Object.entries(LOCAL_AGES) ) if ( ages?.includes(age) ) parts.push(changes[k]);
  parts.push(changes[age]);
  const live = parts.filter(Boolean);
  if ( !live.length ) return table;
  const out = {...table};
  for ( const part of live ) for ( const [k, p] of Object.entries(part) ) {
    if ( p === null ) delete out[k];
    else if ( p.who ) out[k] = p;
    else if ( out[k] ) out[k] = {...out[k], ...p};
  }
  return Object.keys(out).length ? out : table;
}
