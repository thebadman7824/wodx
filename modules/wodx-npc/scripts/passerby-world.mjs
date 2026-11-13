/**
 * WoDX NPC 0.51.0 (B2671): passers-by by the world's ways of life. Pure data, harness-tested.
 *
 * passerby-rules.mjs holds the streets of central Europe by age. A scene that stands elsewhere (its own region, or
 * the chronicle's homeland) follows the way of life its region keeps in that year (WoDX Chronicle sphereFor). Each
 * way of life changes the street's table for an age: a kind given here replaces the one of that key, null takes it
 * away, and a new key adds a kind. The ages after 1914 are much alike the world over, so most ways of life change
 * only their clergy and a few looks there. "all" changes every age at once, before an age's own changes.
 *
 * House readings (docs/PENDING-REVIEW.md, B2671): every kind and look below. No book gives street tables.
 */
const P = (who, looks, day, night, more = {}) => ({who, looks, day, night, ...more});
const DRUNK = {drunk: 0.9, areas: {slums: 1.5, lower: 1.3}};
const POOR = {areas: {slums: 2, merchant: 0.4}};

/* Lands where few drink in the open street: the drinker gives way to someone out late on other business */
const SOBER = {
  reveller: P("a guest walking home from a late supper", ["with a link-bearer ahead", "smelling of rosewater", "full of the evening's talk"], 0.3, 1.2),
  drinker: P("a regular of the coffee house", ["smelling of coffee and tobacco", "still arguing over a game of backgammon"], 0.5, 1.2, {from: 1550})
};

export const PEOPLE_WORLD = {
  orthodox: {
    medieval: {
      burgher: P("a merchant of the town", ["in a silk-lined kaftan", "with a fat purse at the belt", "with a seal ring"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
      friar: P("a monk", ["in a black cassock and tall hat", "with a prayer rope", "carrying an icon wrapped in cloth"], 1.5, 0.3),
      pilgrim: P("a pilgrim", ["with a staff and a flask of holy oil", "footsore from the road to a monastery"], 1, 0.3)
    },
    early: {priest: P("a priest of the Eastern church", ["bearded, in a black cassock", "with a censer", "carrying the sacrament to the dying"], 1.5, 0.4),
      student: P("a seminary student", ["in a long coat", "with a psalter under one arm"], 1, 0.6, {drunk: 0.4})},
    industrial: {student: P("a student", ["in a peaked cap", "with a bundle of pamphlets", "with a satchel of books"], 1.5, 1, {drunk: 0.5})},
    all: {}
  },
  islamic: {
    medieval: {
      burgher: P("a cloth merchant", ["in a striped silk robe", "with a fat purse at the belt", "in a fine turban"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
      peasant: P("a farmer come to market", ["with a basket of dates", "leading a laden donkey", "in a coarse wool cloak"], 4, 0.1, {areas: {merchant: 0.5}}),
      friar: P("a dervish", ["in a patched cloak", "with a begging bowl", "murmuring the names of God"], 1.5, 0.4),
      pilgrim: P("a pilgrim bound for Mecca", ["in white, footsore", "with a water skin", "asking the way to the caravanserai"], 1, 0.3),
      apprentice: P("an apprentice of the bazaar", ["with dyed hands", "carrying a master's tools", "with a copper pot on one shoulder"], 3, 0.5),
      water: P("a water seller", ["with a dripping goatskin", "clinking brass cups"], 2.5, 0.2),
      ...SOBER
    },
    early: {
      priest: P("an imam", ["in a white turban", "with prayer beads", "on the way to the mosque"], 1.5, 0.4),
      student: P("a student of a madrasa", ["with a book of law", "in a plain robe"], 1.5, 0.6, {drunk: 0}),
      soldier: P("a janissary off duty", ["in a tall felt cap", "with a long knife in the sash"], 1, 1, {drunk: 0.1}),
      lamplighter: null,
      water: P("a water seller", ["with a dripping goatskin", "clinking brass cups"], 2.5, 0.2),
      ...SOBER
    },
    industrial: {student: P("a student", ["in a fez", "with a satchel of books"], 1.5, 1, {drunk: 0.1}), ...SOBER,
      soldier: P("a soldier of the garrison", ["in a fez and a drab tunic", "on a pass until the night prayer"], 1, 1, {drunk: 0.1})},
    c20: {drinker: SOBER.drinker}, modern: {drinker: SOBER.drinker, clubber: null}, future: {},
    all: {}
  },
  indic: {
    medieval: {
      burgher: P("a cloth merchant", ["in fine muslin", "with a fat purse at the waist", "with a vermilion mark on the brow"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
      peasant: P("a farmer come to market", ["with a basket of mangoes", "driving a bullock cart", "in a plain dhoti"], 4, 0.1),
      friar: P("a holy wanderer", ["ash-smeared, with a trident", "in saffron, with a begging bowl", "with matted hair"], 1.5, 0.5),
      pilgrim: P("a pilgrim bound for the river", ["with a brass water pot", "singing a hymn"], 1, 0.3),
      water: P("a water carrier", ["with a dripping skin bag"], 2, 0.2)
    },
    early: {priest: P("a temple priest", ["with a sacred thread over the shoulder", "carrying flowers for the shrine"], 1.5, 0.4),
      student: P("a student of a learned teacher", ["with palm-leaf books", "reciting verses"], 1, 0.4, {drunk: 0}), lamplighter: null},
    industrial: {cabman: P("a rickshaw puller", ["barefoot and sweating", "waiting for a fare"], 2, 1), lamplighter: null},
    all: {}
  },
  sinic: {
    medieval: {
      burgher: P("a merchant of the town", ["in a padded silk gown", "with strings of cash at the belt", "followed by a porter"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
      peasant: P("a farmer come to market", ["with baskets on a shoulder pole", "in a straw rain cape", "with a load of cabbages"], 4, 0.1),
      friar: P("a Buddhist monk", ["with a shaven head and a grey robe", "with an alms bowl", "telling beads"], 1.5, 0.3),
      pilgrim: P("a pilgrim bound for a holy mountain", ["with a yellow bag of incense", "footsore from the road"], 1, 0.3),
      reveller: P("a guest from a wine house", ["swaying", "reciting poetry badly", "looking for the way home"], 0.3, 1.5, DRUNK),
      gongfarmer: P("a night-soil carrier", ["with two buckets on a pole", "with a reeking cart"], 0, 0.8),
      scholar: P("an examination candidate", ["in a scholar's cap", "with brushes and an ink stone"], 1, 0.3)
    },
    early: {priest: P("a Buddhist monk", ["with a shaven head and a grey robe", "with an alms bowl"], 1.5, 0.3),
      student: P("an examination candidate", ["in a scholar's cap", "with a bundle of the classics"], 1.5, 0.6, {drunk: 0.3}),
      soldier: P("a soldier of the garrison", ["in a quilted coat", "with a spear and a banner pole"], 1, 1, {drunk: 0.4}), lamplighter: null},
    industrial: {cabman: P("a rickshaw puller", ["in a sweat-dark vest", "waiting for a fare"], 2, 1), lamplighter: null,
      student: P("a student", ["in a long gown", "with a satchel of new books"], 1.5, 1, {drunk: 0.3})},
    all: {}
  },
  japanese: {
    medieval: {
      burgher: P("a merchant of the town", ["in a sober silk kimono", "with strings of coin at the belt"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
      peasant: P("a farmer come to market", ["in a straw rain cape", "with baskets on a shoulder pole"], 4, 0.1),
      friar: P("a wandering monk", ["in a deep basket hat", "with a staff and a bell"], 1.5, 0.4),
      pilgrim: P("a pilgrim to the shrines", ["in white, with a staff", "with a pilgrim's book of seals"], 1, 0.3),
      servant: P("a retainer on an errand", ["with two swords", "in a lord's crest"], 2, 0.5),
      reveller: P("a guest from a sake house", ["swaying", "singing off-key"], 0.3, 1.5, DRUNK)
    },
    early: {priest: P("a temple priest", ["with a shaven head", "with prayer beads"], 1.5, 0.3),
      soldier: P("a masterless swordsman", ["in a worn hakama", "with two swords and an empty purse"], 1, 1, {drunk: 0.5}),
      student: null, lamplighter: null},
    industrial: {cabman: P("a rickshaw puller", ["in a happi coat", "waiting for a fare"], 2, 1)},
    all: {}
  },
  theravada: {
    medieval: {
      burgher: P("a merchant of the town", ["in a silk sarong", "shaded by a parasol"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
      peasant: P("a rice farmer come to market", ["with a basket of fish", "with baskets on a shoulder pole"], 4, 0.1),
      friar: P("a monk on the alms round", ["in a saffron robe", "with a black alms bowl", "barefoot and silent"], 2, 0.1),
      pilgrim: P("a pilgrim to the stupa", ["with lotus buds and gold leaf"], 1, 0.3),
      gongfarmer: null
    },
    early: {priest: P("a monk on the alms round", ["in a saffron robe", "with a black alms bowl"], 2, 0.1), student: null, lamplighter: null},
    industrial: {cabman: P("a rickshaw puller", ["barefoot", "waiting for a fare"], 2, 1), lamplighter: null},
    all: {}
  },
  tibetan: {
    medieval: {
      burgher: P("a trader in from the passes", ["in a fur-lined chuba", "leading yaks laden with salt"], 2, 0.3),
      peasant: P("a herder come to market", ["in a sheepskin chuba", "with a load of butter"], 4, 0.1),
      friar: P("a monk", ["in a maroon robe", "turning a prayer wheel", "with prayer beads"], 2, 0.3),
      pilgrim: P("a pilgrim on the circuit", ["prostrating at every step", "turning a prayer wheel"], 1.5, 0.3),
      reveller: P("a drinker from a barley-beer house", ["swaying", "singing"], 0.3, 1, DRUNK), gongfarmer: null
    },
    early: {priest: P("a lama", ["in a maroon robe and a yellow hat", "with a bell and a ritual dagger"], 1.5, 0.3), student: null, lamplighter: null,
      soldier: null},
    all: {}
  },
  malay: {
    medieval: {
      burgher: P("a spice merchant", ["in a batik sarong", "with a kris in the sash", "smelling of cloves"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
      peasant: P("a rice farmer come to market", ["with a basket of fruit", "in a conical hat"], 4, 0.1),
      friar: P("a temple attendant", ["with offerings of flowers", "in white"], 1.5, 0.3),
      pilgrim: null, gongfarmer: null,
      sailor: P("a sailor off a trading ship", ["barefoot, in a headcloth", "with a bundle of cloth"], 2, 1, {drunk: 0.3})
    },
    early: {priest: P("an imam", ["in a white cap", "on the way to the mosque"], 1.5, 0.4), ...SOBER, student: null, lamplighter: null,
      sailor: P("a sailor off a trading ship", ["barefoot, in a headcloth"], 2, 1, {drunk: 0.2})},
    all: {}
  },
  sahel: {
    medieval: {
      burgher: P("a salt and gold trader", ["in a wide indigo robe", "in a turban, with a camel driver behind"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
      peasant: P("a farmer come to market", ["with a calabash of millet", "with a basket of kola nuts"], 4, 0.1),
      friar: P("a scholar of the mosque", ["with a wooden writing board", "with a Qur'an in a leather case"], 1.5, 0.3),
      pilgrim: P("a pilgrim bound for Mecca", ["with a water skin", "asking for the caravan"], 1, 0.3),
      griot: P("a griot", ["with a kora", "singing the deeds of a family"], 1.5, 0.8),
      ...SOBER, gongfarmer: null
    },
    early: {priest: P("an imam", ["in a white robe", "on the way to the mosque"], 1.5, 0.4), ...SOBER, student: null, lamplighter: null,
      griot: P("a griot", ["with a kora", "singing the deeds of a family"], 1.5, 0.8)},
    all: {}
  },
  swahili: {
    medieval: {
      burgher: P("a coast merchant", ["in a white kanzu", "with a carved walking stick"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
      peasant: P("a farmer come to market", ["with a basket of coconuts", "with a load of millet"], 4, 0.1),
      friar: P("a teacher of the mosque", ["in a white cap", "with a Qur'an"], 1.5, 0.3),
      pilgrim: null, gongfarmer: null, ...SOBER,
      sailor: P("a sailor off a dhow", ["barefoot", "smelling of the sea"], 2, 1, {drunk: 0.2})
    },
    early: {priest: P("an imam", ["in a white kanzu", "on the way to the mosque"], 1.5, 0.4), ...SOBER, student: null, lamplighter: null},
    all: {}
  },
  bantu: {
    medieval: {
      burgher: P("a cattle owner of standing", ["in a leopard-skin cloak", "with a carved staff"], 2, 0.3),
      peasant: P("a farmer come to market", ["with a basket of sorghum", "with a pot of beer on the head"], 4, 0.1),
      friar: P("a diviner", ["with a bag of bones", "in strings of beads"], 1, 0.5),
      pilgrim: null, gongfarmer: null,
      reveller: P("a drinker from a beer gathering", ["swaying", "singing"], 0.5, 1.2, DRUNK),
      herder: P("a herder driving cattle", ["with a stick and a spear"], 2, 0.2)
    },
    early: {priest: P("a diviner", ["with a bag of bones", "in strings of beads"], 1, 0.5), student: null, lamplighter: null,
      soldier: P("a warrior of the chief", ["with a hide shield and spears"], 1, 0.6)},
    all: {}
  },
  mesoamerican: {
    medieval: {
      carter: P("a porter", ["with a tumpline load", "bent under a basket of maize"], 3, 0.2),
      burgher: P("a long-distance trader", ["in a fine cotton cloak", "with a fan and a staff"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
      peasant: P("a farmer come to market", ["with a load of maize", "with a basket of chillies", "in a maguey-fibre cloak"], 4, 0.1),
      friar: P("a temple priest", ["with black-painted skin and long matted hair", "with a censer of copal"], 1, 0.4),
      pilgrim: null, gongfarmer: null, reveller: null,
      apprentice: P("an apprentice craftsperson", ["with feathers in a basket", "with obsidian dust on the hands"], 3, 0.3)
    },
    early: {},
    all: {}
  },
  andean: {
    medieval: {
      carter: P("a llama driver", ["with a string of llamas", "chewing coca"], 3, 0.2),
      burgher: P("a lord's steward", ["with knotted cords for counting", "in a fine woven tunic"], 2, 0.3),
      peasant: P("a farmer come to market", ["with a bag of potatoes", "in an alpaca-wool tunic"], 4, 0.1),
      friar: P("a priest of the huacas", ["with a coca bag", "with a gift for the shrine"], 1, 0.4),
      pilgrim: null, gongfarmer: null,
      reveller: P("a drinker from a chicha house", ["swaying", "singing"], 0.3, 1.2, DRUNK),
      runner: P("a runner of the roads", ["with a conch shell", "breathing hard"], 1, 0.4)
    },
    early: {},
    all: {}
  },
  polynesian: {
    medieval: {
      carter: null, burgher: P("a chief's attendant", ["in a feather cloak", "with a carved staff"], 2, 0.3),
      peasant: P("a farmer from the gardens", ["with a basket of taro", "with a digging stick"], 4, 0.1),
      friar: P("a priest", ["with a carved figure", "chanting under the breath"], 1, 0.3),
      pilgrim: null, gongfarmer: null, reveller: null, servant: null, beggar: null,
      fisher: P("a fisher", ["with a net over one shoulder", "with a string of fish"], 3, 0.5)
    },
    early: {},
    all: {}
  },
  northern: {
    medieval: {
      carter: P("a hunter back from the ice", ["with a sled of seal meat", "in caribou skins"], 2, 0.3),
      burgher: null, apprentice: null, servant: null, pilgrim: null, gongfarmer: null, reveller: null, beggar: null,
      peasant: P("a hunter come to trade", ["with furs", "with a bundle of hides"], 3, 0.2),
      friar: P("a shaman", ["with a drum", "in a coat hung with charms"], 0.5, 0.5),
      fisher: P("a fisher", ["with a spear and a string of fish"], 2, 0.3)
    },
    early: {},
    all: {}
  }
};
/* The ages a way of life of the time before settlers leaves as they are: the medieval street serves */
for ( const s of ["mesoamerican", "andean", "polynesian", "northern"] ) PEOPLE_WORLD[s].early = PEOPLE_WORLD[s].medieval;

/** Clergy of each faith in the modern streets (c20 on): the cleric who walks past. */
const CLERIC = {
  orthodox: P("a priest of the Eastern church", ["bearded, in a black cassock"], 0.5, 0.2),
  islamic: P("an imam", ["in a white cap", "on the way to the mosque"], 0.6, 0.3),
  indic: P("a temple priest", ["with flowers for the shrine"], 0.5, 0.2),
  sinic: P("a Buddhist monk", ["with a shaven head", "in a grey robe"], 0.4, 0.1),
  japanese: P("a temple priest", ["with a shaven head", "with prayer beads"], 0.4, 0.1),
  theravada: P("a monk on the alms round", ["in a saffron robe"], 1, 0.1),
  tibetan: P("a monk", ["in a maroon robe", "turning a prayer wheel"], 1, 0.2),
  malay: P("an imam", ["in a white cap"], 0.6, 0.3), sahel: P("an imam", ["in a white robe"], 0.6, 0.3),
  swahili: P("an imam", ["in a white kanzu"], 0.6, 0.3)
};
for ( const [s, p] of Object.entries(CLERIC) ) for ( const age of ["c20", "modern", "future"] ) PEOPLE_WORLD[s][age] = {cleric: p, ...(PEOPLE_WORLD[s][age] ?? {})};

/** The street of an age for a way of life: the central European table with that way of life's changes. */
export function tableFor(base, sphere, age) {
  const ch = PEOPLE_WORLD[sphere];
  if ( !ch ) return base;
  const out = {...base};
  for ( const part of [ch.all, ch[age]] ) for ( const [k, p] of Object.entries(part ?? {}) ) { if ( p === null ) delete out[k]; else out[k] = p; }
  return Object.keys(out).length ? out : base;
}

/**
 * The faith a passer-by keeps outside Moravia: mostly the land's (WoDX Chronicle faithFor), with the minorities the
 * region's people bring (WoDX NPC originFaith on the region's mix). Tags use plain words: catholic, protestant,
 * orthodox, muslim, jewish, hindu, buddhist, folk (the chinese year), traditional (a count of their own).
 */
export const FAITH_TAG = {western: "catholic", orthodox: "orthodox", islamic: "muslim", jewish: "jewish", hindu: "hindu", theravada: "buddhist",
  tibetan: "buddhist", chinese: "folk", own: "traditional"};
/** Lands where the Reformation won, and from when (house reading); a share of their Western Christians are Protestant. */
export const PROTESTANT = {"british-isles": [1534, 0.85], "scandinavia": [1527, 0.95], "german-lands": [1530, 0.5], "low-countries": [1580, 0.55],
  "north-america-east": [1607, 0.8], "canada": [1760, 0.5], "australia": [1788, 0.6], "aotearoa": [1840, 0.6], "southern-africa": [1652, 0.6],
  "poland-baltic": [1550, 0.15], "carpathians-balkans": [1550, 0.25], "france": [1560, 0.08]};
/** From when fewer keep any faith in the street (house reading): Europe and its settler lands, then the communist lands. */
export const SECULAR = {latin: 1960, orthodox: 1925, sinic: 1950, japanese: 1950};
