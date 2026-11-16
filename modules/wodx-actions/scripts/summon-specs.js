/**
 * WoDX Actions: the page-checked rules for every summoning power (B4820-B4829), in WoDX's own words with page refs.
 * Generated from the book read of 14 November 2026; edit by hand from here. Keys: specKey(line, name).
 * Each spec: what comes, its profile, how many (count), how long (lasts), who commands it (control), the keeping roll,
 * upkeep, stats, page and a short note. unsure: the book read was unclear (on the review desk).
 * NOT_SUMMON: powers the inventory tagged as summonings that call nothing; kw is the keyword set they work through
 * instead (a curse is a Bind, a thing fetched to hand is a Make; B4836).
 */
export const slug = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const specKey = (line, name) => `${slug(line)}|${slug(String(name ?? "").replace(/^[•\s]+/, ""))}`;

export const SPECS = {
 "fae-dark-ages|lesser-hounds-of-hell": {
  "what": "beast",
  "profile": "servant",
  "count": {"by": "successes", "mult": 2},
  "lasts": {"kind": "scene"},
  "control": {"mode": "orders", "orders": "simple"},
  "page": "DA:Fae p. 142",
  "note": "B6550: two black hounds a success bay at one foe and harry them for the scene, never biting."
 },
 "fae-dark-ages|greater-hounds-of-hell": {
  "what": "beast",
  "profile": "servant",
  "count": {"by": "successes", "mult": 2},
  "lasts": {"kind": "scene"},
  "control": {"mode": "orders", "orders": "simple"},
  "stats": {"attack": "six dice to hit, five lethal dice of harm"},
  "page": "DA:Fae p. 144",
  "note": "B6550: two hounds a success that bite (six dice to hit, five lethal dice of harm) for the scene."
 },
 "fomor|animal-control": {
  "what": "animal",
  "profile": "servant",
  "count": {"by": "successes"},
  "lasts": {"kind": "scene"},
  "control": {"mode": "orders", "range": "120 yards", "orders": "simple"},
  "page": "W20 p. 430",
  "note": "B5615: Manipulation + Animal Ken 6 after a Willpower: one weak or sick animal a success within 120 yards; each follows an order of five words or fewer for the scene."
 },
 "fomor|slither-skin": {
  "what": "double",
  "profile": "servant",
  "count": {"by": "fixed", "fixed": 1},
  "lasts": {"kind": "scene"},
  "control": {"mode": "direct"},
  "stats": {"health": 1},
  "page": "W20 p. 437",
  "note": "B5615: the fomor's own skin walks off: one dot in each Physical Attribute, one health level, none of the fomor's powers. It must come back by the end of the scene or it falls apart."
 },
 "mage-dark-ages|one-fights-as-many": {
  "extra": true,
  "what": "double",
  "profile": "servant",
  "count": {"by": "successes"},
  "lasts": {"kind": "scene"},
  "control": {"mode": "direct", "range": "near"},
  "cost": {"pool": "quintessence", "per": 1},
  "shareWounds": "highest",
  "page": "DA Mage p. 109",
  "note": "One Quintessence a self, up to the successes. One self casts or spends Willpower a turn; the mage takes the worst harm any self took. B4841."
 },
 "vampire-dark-ages|call-the-wild": {
  "what": "animal",
  "profile": "called",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "page": "VtDA20 p. 191",
  "note": "Charisma + Survival 6, one named kind in earshot: 1 success one animal, 2 a quarter, 3 half, 4 most, 5 all. Friendly, never obedient."
 },
 "vampire-dark-ages|summon": {
  "what": "person",
  "profile": "person",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "night"
  },
  "control": {
   "mode": "none"
  },
  "page": "VtDA20 p. 237",
  "note": "Anyone ever met, any distance. Successes set speed and willingness; self-preservation stays. Ends at dawn unless spare successes prolong it."
 },
 "vampire-dark-ages|mother-of-monsters": {
  "what": "beast",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-destroyed"
  },
  "control": {
   "mode": "direct",
   "orders": "simple"
  },
  "persist": true,
  "onDeath": "The marked health level stays until the vampire reabsorbs the corpse.",
  "page": "VtDA20 p. 253",
  "note": "Blood point plus a marked health level; extra blood is its own pool for healing or Serpentis 1 to 4. Childlike wits, unshakably obedient."
 },
 "vampire-dark-ages|summon-spirit-beast": {
  "what": "spirit",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "rounds"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "stats": {
   "health": "as the natural animal"
  },
  "page": "VtDA20 p. 255",
  "note": "Local animal spirit, only acts within its nature. Duration ladder: 1 turn, 5 turns, an hour, a night, a week. Incapacitated returns it to spirit."
 },
 "vampire-dark-ages|the-body-impolitic": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-destroyed"
  },
  "control": {
   "mode": "direct"
  },
  "persist": true,
  "stats": {
   "health": 1
  },
  "onDeath": "Regrowing the part takes a blood point and a Vicissitude roll; it cannot regrow while detached.",
  "page": "VtDA20 p. 269",
  "note": "A severed extremity holding 1 to 5 blood. Athletics 3, senses only what it has. Disciplines work through it; spending its last blood withers it."
 },
 "vampire-dark-ages|calling-the-hungry-shade": {
  "what": "shade",
  "profile": "wild",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "stats": {
   "strength": "obtenebration (max 4)",
   "dexterity": "obtenebration (max 4)",
   "stamina": "obtenebration (max 4)",
   "brawl": "obtenebration",
   "melee": "obtenebration",
   "health": 12,
   "attack": "shadow form, as Talon of the Abyss"
  },
  "page": "VtDA20 p. 272",
  "note": "Dusk to moonset, Intelligence + Occult 9, minus 1 per helping Mystic. Independent and hungry for vampires; no control given. Botch: attacks caster. Duration unstated."
 },
 "vampire-dark-ages|plague-of-beasts": {
  "what": "swarm",
  "profile": "servant",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "rounds",
   "n": 1,
   "perSuccess": true
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "stats": {
   "attack": "pool grows 2 dice a turn; damage 3+successes bashing"
  },
  "page": "VtDA20 p. 194",
  "note": "Charisma + Animal Ken 8; every animal within a mile per success comes. Rough orders only, can spare chosen targets. Perception +2 difficulty inside."
 },
 "vampire-dark-ages|demonic-servitor": {
  "what": "demon",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "night"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "upkeep": {
   "pool": "willpower",
   "points": 1,
   "every": "day",
   "fail": "stops"
  },
  "stats": {
   "strength": 2,
   "dexterity": 2,
   "stamina": 2,
   "perception": 3,
   "intelligence": 3,
   "wits": 3,
   "brawl": 1,
   "health": 6,
   "attack": "natural weapons Strength+1 aggravated"
  },
  "page": "VtDA20 p. 211",
  "note": "Blood plus a Willpower point; extra blood adds dots. Choose a sin template. Rebels in petty ways, flees danger. Keeping it means forgoing nightly Willpower."
 },
 "vampire-dark-ages|call-forth-the-herald-of-hell": {
  "what": "demon",
  "profile": "wild",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "until-destroyed"
  },
  "control": {
   "mode": "hostile"
  },
  "stats": {
   "strength": 7,
   "dexterity": 2,
   "stamina": 9,
   "perception": 7,
   "intelligence": 5,
   "wits": 5,
   "brawl": 7,
   "health": 24,
   "attack": "brawl 7, Daimoinon 6"
  },
  "page": "VtDA20 p. 211",
  "note": "Five blood, Manipulation + Occult 7; each success wounds the caster. One die must then roll at or under successes. Fades an aggravated level hourly."
 },
 "vampire-dark-ages|shadow-twin": {
  "what": "double",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "hours",
   "n": 1,
   "perSuccess": true
  },
  "control": {
   "mode": "direct",
   "range": "near"
  },
  "stats": {
   "strength": "half the source",
   "dexterity": "half the source",
   "stamina": "half the source",
   "attack": "deals and takes half damage"
  },
  "onDeath": "The source loses half their Willpower points and rolls against Rotschreck at 9.",
  "page": "VtDA20 p. 230",
  "note": "Blood and Willpower roll 8 on anyone with a soul. Roams 50 feet. Sunrise ends it. Fire and supernatural attacks do full damage."
 },
 "vampire-dark-ages|awaken-the-homuncular-servant": {
  "what": "corpse",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "night",
   "n": 1,
   "perSuccess": true
  },
  "control": {
   "mode": "direct",
   "range": "near"
  },
  "stats": {
   "strength": 2,
   "dexterity": 2,
   "stamina": 2,
   "health": 2
  },
  "page": "VtDA20 p. 279",
  "note": "Hand, head or small dead animal. Stops moving beyond 100 yards of its master. Sends sights by crude telepathy. Can be reanimated again and again."
 },
 "vampire-dark-ages|shambling-hordes": {
  "what": "corpse",
  "profile": "servant",
  "count": {
   "by": "successes",
   "mult": 2
  },
  "lasts": {
   "kind": "until-destroyed"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "persist": true,
  "page": "VtDA20 p. 280",
  "note": "Wits + Occult 8; each success plus a blood point raises two. Another blood per corpse adds Necromancy in Physical dots. They wait centuries."
 },
 "vampire-dark-ages|summon-soul": {
  "what": "ghost",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none",
   "range": "sight"
  },
  "page": "VtDA20 p. 287",
  "note": "Needs its name or a supernatural image, plus an object it knew. Stays in sight; may attack or lie. Willpower dismisses; botch brings a Spectre."
 },
 "vampire-dark-ages|summon-elemental": {
  "what": "elemental",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "roll": {
   "when": "arrival",
   "who": "summoner",
   "pool": "manipulation+occult",
   "diff": "successes+4",
   "fail": "leave",
   "ladder": [
    {
     "min": 0,
     "control": "hostile",
     "note": "failure: leaves or attacks those near; botch: attacks the caster"
    },
    {
     "min": 1,
     "control": "none",
     "note": "will not attack the caster"
    },
    {
     "min": 2,
     "control": "orders",
     "note": "one service for fair payment"
    },
    {
     "min": 3,
     "control": "orders",
     "note": "one service that suits its nature"
    },
    {
     "min": 4,
     "control": "orders",
     "note": "any single task that does not endanger it"
    },
    {
     "min": 5,
     "control": "direct",
     "note": "any task, even risky or nights long"
    }
   ]
  },
  "stats": {
   "strength": 3,
   "dexterity": 3,
   "stamina": 3,
   "perception": 3,
   "intelligence": 3,
   "wits": 3
  },
  "page": "VtDA20 p. 299",
  "note": "Needs some of its element nearby. Each casting success adds a dot to one Attribute. Duration unstated, scene assumed. Powers at Storyteller choice."
 },
 "vampire-v20|beckoning": {
  "what": "animal",
  "profile": "called",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "page": "V20 p. 130",
  "note": "Charisma + Survival 6, one named kind in earshot: 1 success one animal, 2 a quarter, 3 half, 4 most, 5 all. Friendly, never obedient."
 },
 "vampire-v20|summon-soul": {
  "what": "ghost",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none",
   "range": "sight"
  },
  "page": "V20 p. 161",
  "note": "Needs its name or a supernatural image, plus an object it knew. Stays in sight; may attack or lie. Willpower dismisses; botch brings a Spectre."
 },
 "vampire-v20|apprentice-s-brooms": {
  "what": "corpse",
  "profile": "servant",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "task"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "persist": true,
  "stats": {
   "strength": 3,
   "dexterity": 2,
   "stamina": 4,
   "perception": 0,
   "intelligence": 0,
   "wits": 0,
   "brawl": 2,
   "dodge": 0,
   "health": 10,
   "attack": "brawl, acts last each turn"
  },
  "page": "V20 p. 164",
  "note": "Blood and Willpower, Wits + Occult 7. Literal tasks only; they never defend, and collapse when the job is done. Slow decay continues."
 },
 "vampire-v20|shambling-hordes": {
  "what": "corpse",
  "profile": "servant",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "until-destroyed"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "persist": true,
  "stats": {
   "strength": 3,
   "dexterity": 2,
   "stamina": 4,
   "perception": 0,
   "intelligence": 0,
   "wits": 0,
   "brawl": 2,
   "dodge": 0,
   "health": 10,
   "attack": "brawl, acts last each turn"
  },
  "page": "V20 p. 165",
  "note": "Willpower point, Wits + Occult 8, one blood per corpse raised; unpaid successes are lost. One simple order each, kept for years."
 },
 "vampire-v20|summon": {
  "what": "person",
  "profile": "person",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "night"
  },
  "control": {
   "mode": "none"
  },
  "page": "V20 p. 195",
  "note": "Anyone ever met, any distance. Successes set speed and willingness; self-preservation stays. Ends at dawn; repeat each night until the subject arrives."
 },
 "vampire-v20|summon-elemental": {
  "what": "elemental",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "roll": {
   "when": "arrival",
   "who": "summoner",
   "pool": "manipulation+occult",
   "diff": "successes+4",
   "fail": "leave",
   "ladder": [
    {
     "min": 0,
     "control": "hostile",
     "note": "failure: leaves or attacks those near; botch: attacks the caster"
    },
    {
     "min": 1,
     "control": "none",
     "note": "will not attack the caster"
    },
    {
     "min": 2,
     "control": "orders",
     "note": "friendly, one service for a price"
    },
    {
     "min": 3,
     "control": "orders",
     "note": "one reasonable service"
    },
    {
     "min": 4,
     "control": "orders",
     "note": "any single task that does not endanger it"
    },
    {
     "min": 5,
     "control": "direct",
     "note": "any task, even risky or nights long"
    }
   ]
  },
  "stats": {
   "strength": 3,
   "dexterity": 3,
   "stamina": 3,
   "perception": 3,
   "intelligence": 3,
   "wits": 3
  },
  "page": "V20 p. 215",
  "note": "Needs some of its element nearby. Each casting success adds a dot to one Attribute. Duration unstated, scene assumed. Powers at Storyteller choice."
 },
 "vampire-v20|awaken-the-forest-giants": {
  "what": "plant",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "rounds",
   "n": 1,
   "perSuccess": true
  },
  "control": {
   "mode": "direct",
   "range": "near"
  },
  "stats": {
   "strength": "thaumaturgy",
   "dexterity": 2,
   "stamina": "thaumaturgy",
   "brawl": "caster's Brawl",
   "attack": "brawl"
  },
  "page": "V20 p. 217",
  "note": "Touch the tree; one blood, then one more per success. Immune to bashing, lethal pools halved. Roots where it stands and sleeps until next night."
 },
 "werewolf-dark-ages|call-of-the-wyrm": {
  "what": "beast",
  "profile": "person",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "task"
  },
  "control": {
   "mode": "hostile"
  },
  "roll": {
   "when": "arrival",
   "who": "summoner",
   "pool": "manipulation+performance",
   "diff": 7,
   "fail": "free"
  },
  "page": "DA:W p. 125",
  "note": "Resisted against the Wyrm creature's Willpower, both at 7. A loser must come to the caller, often into an ambush. Groups test by Willpower."
 },
 "werewolf-dark-ages|call-to-duty": {
  "what": "spirit",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "task"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "roll": {
   "when": "arrival",
   "who": "summoner",
   "pool": "charisma+leadership",
   "diff": "creature-willpower",
   "fail": "refuse"
  },
  "page": "DA:W p. 122",
  "note": "Must know the spirit's name. One command, then it departs. Or 2 Gnosis calls every Gaian spirit within a mile. Abusers may be refused."
 },
 "werewolf-dark-ages|faerie-aid": {
  "what": "faerie",
  "profile": "called",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "page": "DA:W p. 135",
  "note": "1+ Gnosis, Manipulation + Occult 8. Gnosis spent sets their power, successes their number. They obey but question orders. Duration unstated."
 },
 "werewolf-dark-ages|woadling": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "direct"
  },
  "stats": {
   "attack": "no damage; minus a die per Gnosis success from the target's attack and defence pools"
  },
  "page": "DA:W p. 135",
  "note": "Dexterity + Occult 6 paints a figure per success. In combat 1 Gnosis each wakes them, then Gnosis roll 6. Gone at scene end."
 },
 "werewolf-dark-ages|beast-life": {
  "what": "animal",
  "profile": "called",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "page": "DA:W p. 116",
  "note": "1 Gnosis, Charisma + Animal Ken 7; draws all animals within 10 miles per success and speaks with them. 1 Gnosis per extra scene."
 },
 "werewolf-dark-ages|horde-of-valhalla": {
  "what": "spirit",
  "profile": "servant",
  "count": {
   "by": "rage+gnosis-spent"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "page": "DA:W p. 134",
  "note": "Great Wolves, as Hounds of the Wild Hunt (Willpower 6, Rage 7, Gnosis 2, Essence 15). Charisma + Animal Ken 6. Not for light use."
 },
 "werewolf-dark-ages|shadow-pack": {
  "what": "double",
  "profile": "servant",
  "count": {
   "by": "gnosis-spent"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "direct"
  },
  "stats": {
   "strength": "as caster",
   "dexterity": "as caster",
   "stamina": "as caster",
   "health": 1
  },
  "page": "DA:W p. 139",
  "note": "Gnosis roll 8. Copies share Attributes and Abilities but no fetishes, Gifts, Gnosis or Willpower. Any unsoaked hit destroys one."
 },
 "werewolf-dark-ages|song-of-the-great-beast": {
  "what": "beast",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "task"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "page": "DA:W p. 117",
  "note": "Deep wilderness only. 1 Gnosis, Charisma + Primal-Urge 8. Extra successes make it more willing. It grants one request in its own way."
 },
 "werewolf-dark-ages|the-living-wood": {
  "what": "plant",
  "profile": "servant",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "page": "DA:W p. 132",
  "note": "1 Gnosis, Charisma + Survival 8, one nearby tree per success. Trees restrain, block and fight those harming the Garou. Duration unstated."
 },
 "werewolf-dark-ages|wyld-warp": {
  "what": "spirit",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "page": "DA:W p. 129",
  "note": "1 Gnosis and 1 Rage, Wits + Enigmas against the Gauntlet. A variable number of Wyldlings act unpredictably, but always to the Fury's benefit."
 },
 "werewolf-w20|faerie-kin": {
  "what": "faerie",
  "profile": "called",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "page": "W20 p. 179",
  "note": "1+ Gnosis, Manipulation + Occult 8. More Gnosis, stronger fae. On Earth mostly chimera; true fae only in fitting Umbral realms. They question orders."
 },
 "werewolf-w20|call-the-hunt": {
  "what": "spirit",
  "profile": "called",
  "count": {
   "by": "rage+gnosis-spent",
   "fixed": 2
  },
  "lasts": {
   "kind": "task"
  },
  "control": {
   "mode": "none"
  },
  "page": "W20 p. 180",
  "note": "Hour of chanting, 1 Gnosis, Charisma + Occult 8. Huntsman, a hound, one more per extra point. Unworthy prey or monthly repeat: caller hunted."
 },
 "werewolf-w20|summon-net-spider": {
  "what": "spirit",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "direct"
  },
  "page": "W20 p. 185",
  "note": "1 Gnosis, Charisma + Computer 8. It wrecks or controls computer systems on command. The Gift also permanently halves computer difficulties."
 },
 "werewolf-w20|crocodile-pact": {
  "what": "person",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "task"
  },
  "control": {
   "mode": "orders"
  },
  "page": "W20 p. 186",
  "note": "2 Gnosis, Charisma + Rituals 7. Help comes within the hour: werecrocodiles to fight or ancestor spirits to advise, as the Storyteller decides."
 },
 "werewolf-w20|call-elemental": {
  "what": "elemental",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders"
  },
  "roll": {
   "when": "arrival",
   "who": "summoner",
   "pool": "manipulation+occult",
   "diff": 7,
   "fail": "refuse"
  },
  "page": "W20 p. 198",
  "note": "1 Gnosis, Gnosis roll against the Gauntlet calls earth, air, fire or water. A second roll wins its help. It vanishes at scene end."
 },
 "werewolf-w20|call-of-the-cannibal-spirit": {
  "what": "spirit",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "task"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "onDeath": "On a botch, or if stopped from killing the target, it comes back to kill the summoner.",
  "page": "W20 p. 201",
  "note": "Three turns of dancing, 1 Rage and 1 Gnosis, Charisma + Occult 8. Needs a piece of the target, whose heart it eats."
 },
 "wraith-w20|revivify": {
  "what": "corpse",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "rounds",
   "n": 2,
   "perSuccess": true
  },
  "control": {
   "mode": "direct"
  },
  "stats": {
   "strength": "the body's",
   "dexterity": "the body's",
   "stamina": "the body's",
   "health": "wraith's Willpower"
  },
  "page": "Wraith 20th p. 214",
  "note": "The wraith rides a body dead no longer than their Stamina in hours. 3 Pathos, 1 Willpower; Shadow gains Angst. Shares damage; heavy wound penalty."
 },
 "mage-dark-ages|utterance-of-the-72-names": {
  "what": "construct",
  "profile": "servant",
  "count": {"by": "fixed", "fixed": 1, "max": 1},
  "lasts": {"kind": "until-destroyed"},
  "control": {"mode": "orders", "orders": "simple"},
  "cost": {"pool": "quintessence", "per": 1},
  "stats": {"strength": 10, "dexterity": 2, "stamina": 8, "wits": 2, "brawl": 2, "health": 10, "armor": 4, "willpower": 3, "attack": "brawl"},
  "onDeath": "Broken, it slumps back into wet earth.",
  "page": "DA Mage Grimoire p. 58",
  "note": "B6017: a golem of clean earth and water, best kept as an Ongoing spell. Eats 1 Quintessence a day or sleeps; refuses cruel orders; a botch puts a hostile spirit inside it."
 },
 "mage-dark-ages|ancient-warder-of-the-land": {
  "what": "plant",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "stats": {
   "strength": 8,
   "dexterity": 1,
   "stamina": 8,
   "wits": 1,
   "brawl": 1,
   "health": 11,
   "soak": "aggravated",
   "attack": "brawl"
  },
  "onDeath": "Slain, or left where roots cannot reach soil, it topples and withers.",
  "page": "DA Mage p. 119",
  "note": "Needs a huge ancient tree. Soaks anything not striking its pattern. Every three successes add an Attribute dot or a health level. Effect duration."
 },
 "mage-dark-ages|unsleeping-swords": {
  "what": "corpse",
  "profile": "servant",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "stats": {
   "strength": 4,
   "dexterity": 1,
   "stamina": 4,
   "wits": 1,
   "brawl": 2,
   "melee": 2,
   "health": 6,
   "attack": "weapon or brawl"
  },
  "page": "DA Mage p. 135",
  "note": "Battle slain only. One Quintessence per body, up to the successes. Extra successes and Quintessence on one body raise traits. Raised to fight."
 },
 "mage-dark-ages|solomonic-summoning": {
  "what": "spirit",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "task"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "page": "DA Grimoire p. 22",
  "note": "Summoning only calls the djinn; Binding holds it; Command needs its Willpower + 3 successes at difficulty 10 for one task, obeyed to the letter.",
  "unsure": "summary"
 },
 "mage-dark-ages|the-giant-s-dance": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "night"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "stats": {
   "strength": 8,
   "dexterity": 1,
   "stamina": 8,
   "wits": 1,
   "brawl": 1,
   "health": 11,
   "soak": "aggravated",
   "attack": "brawl"
  },
  "page": "DA Grimoire p. 71",
  "note": "Stone giant from open stony ground, built like Ancient Warder. Simple orders; seems to last until sunrise, then crumbles. Page text is badly scanned.",
  "unsure": "unsure"
 },
 "mage-dark-ages|slip-the-shadow": {
  "what": "double",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene",
   "n": 1,
   "perSuccess": true
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "onDeath": "On a botch it rebels; the mage loses half permanent Willpower, regained a point a day once a new shadow grows.",
  "page": "DA Grimoire p. 87",
  "note": "The shadow leaves the body to spy or distract. With Wise One 3 it reports what it sees and hears.",
  "unsure": "summary"
 },
 "mage-dark-ages|spirit-army": {
  "what": "spirit",
  "profile": "servant",
  "count": {
   "by": "successes",
   "mult": 2
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "direct"
  },
  "stats": {
   "strength": 2,
   "dexterity": 3,
   "stamina": 2,
   "perception": 1,
   "intelligence": 1,
   "wits": 1,
   "brawl": 2,
   "melee": 4,
   "attack": "skeleton figures"
  },
  "page": "DA Grimoire p. 88",
  "note": "Sensitivity + Warrior, two per success, in like vessels. Stone 5/2/6, oak 4/2/5, armour 3/3/6 with other skills. Utterly loyal; leave when the spell ends."
 },
 "mage-dark-ages|welcoming-waters": {
  "what": "elemental",
  "profile": "servant",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "direct",
   "range": "near"
  },
  "stats": {
   "strength": "successes",
   "dexterity": "successes"
  },
  "page": "DA Grimoire p. 88",
  "note": "Sensitivity + Wise One at water bigger than a pond; a water arm per success. Blades, even magic, cannot hurt them. Five seize a boat.",
  "unsure": "summary"
 },
 "mage-dark-ages|summon-the-pack": {
  "what": "animal",
  "profile": "servant",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "stats": {
   "strength": 4,
   "dexterity": 3,
   "stamina": 4,
   "perception": 6,
   "wits": 5,
   "brawl": 3,
   "dodge": 2,
   "health": 6,
   "attack": "bite and claw 4 lethal"
  },
  "page": "DA Grimoire p. 101",
  "note": "Wild places only, one large wolf per success. Willpower 3, Survival 5. Control and duration are not legible in the scan.",
  "unsure": "unsure"
 },
 "demon-dtf|animate": {
  "what": "object",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": "faith"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "direct",
   "range": "sight"
  },
  "roll": {
   "when": "each-turn",
   "who": "summoner",
   "pool": "willpower",
   "diff": "torment",
   "fail": "attack-nearest"
  },
  "page": "DtF p. 181",
  "note": "1 Faith, Intelligence + Crafts; successes become its action pool each turn. Touch to animate. The Willpower roll applies only at high Torment."
 },
 "demon-dtf|restore-life": {
  "what": "corpse",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": "faith"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "direct"
  },
  "roll": {
   "when": "each-turn",
   "who": "summoner",
   "pool": "willpower",
   "diff": "torment",
   "fail": "attack-nearest"
  },
  "page": "DtF p. 182",
  "note": "1 Faith, Stamina + Medicine: 6 fresh, 7+ up to a week dead, within Faith yards. Willpower makes it permanent. Torment roll only when high."
 },
 "demon-dtf|summon-animals": {
  "what": "animal",
  "profile": "servant",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "roll": {
   "when": "each-turn",
   "who": "summoner",
   "pool": "willpower",
   "diff": "torment",
   "fail": "attack-nearest"
  },
  "page": "DtF p. 204",
  "note": "Senses animals within Faith miles; one beast per success, or a swarm a square yard per success. They guard the demon. High Torment: predators only."
 },
 "demon-dtf|summon-the-dead": {
  "what": "ghost",
  "profile": "called",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none",
   "range": "near"
  },
  "roll": {
   "when": "arrival",
   "who": "creature",
   "pool": "willpower",
   "diff": "faith",
   "fail": "free"
  },
  "page": "DtF p. 211",
  "note": "Manipulation + Leadership; ghosts in 10 square yards times Faith must come and stay till dismissed. A strong one may resist against the successes."
 },
 "mummy-2nd|simple-creature": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-dismissed"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "upkeep": {
   "pool": "sekhem",
   "points": 1,
   "every": "week",
   "fail": "stops"
  },
  "persist": true,
  "page": "MtR p. 108",
  "note": "Crafts + Effigy 6, 3 Sekhem. Tiny animal with its natural senses and weapons, no smarter than the real thing. Carries notes, searches small spaces."
 },
 "mummy-2nd|simple-servitor": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-dismissed"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "upkeep": {
   "pool": "sekhem",
   "points": 1,
   "every": "month",
   "fail": "stops"
  },
  "persist": true,
  "stats": {
   "health": 3,
   "soak": "lethal"
  },
  "page": "MtR p. 109",
  "note": "Crafts + Effigy 6, 1 Sekhem. Ushabti for digging, carrying, following and stopping; harder orders jam it. Cannot fight or heal; no wound penalties."
 },
 "mummy-2nd|lesser-creature": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-dismissed"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "upkeep": {
   "pool": "sekhem",
   "points": 1,
   "every": "week",
   "fail": "stops"
  },
  "persist": true,
  "page": "MtR p. 110",
  "note": "Crafts + Effigy 7, 4 Sekhem. Small animal such as a cat or vulture; loyal and fights for its maker when told. No real venom."
 },
 "mummy-2nd|major-creature": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-dismissed"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "upkeep": {
   "pool": "sekhem",
   "points": 2,
   "every": "week",
   "fail": "stops"
  },
  "persist": true,
  "page": "MtR p. 111",
  "note": "Crafts + Effigy 8, 8 Sekhem. Medium animal with any real venom, fiercely loyal, clever enough for detailed directions; fights to destruction defending."
 },
 "mummy-2nd|overseer": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-dismissed"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "upkeep": {
   "pool": "sekhem",
   "points": 1,
   "every": "week",
   "fail": "stops"
  },
  "persist": true,
  "stats": {
   "health": 7,
   "soak": "lethal"
  },
  "page": "MtR p. 112",
  "note": "Crafts + Effigy 7, 2 Sekhem. Fairly complex orders; directs up to ten Servitors or five Guards. No sentience, cannot fight or heal."
 },
 "mummy-2nd|guard": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-dismissed"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "upkeep": {
   "pool": "sekhem",
   "points": 1,
   "every": "week",
   "fail": "stops"
  },
  "persist": true,
  "stats": {
   "strength": 3,
   "dexterity": 3,
   "stamina": 3,
   "dodge": 3,
   "melee": 3,
   "health": 7,
   "soak": "lethal",
   "attack": "sword or spear"
  },
  "page": "MtR p. 112",
  "note": "Crafts + Effigy 8, 4 Sekhem. Warrior figurine taking defensive orders from its activator or an Overseer; fights until destroyed. Cannot heal."
 },
 "mummy-2nd|superior-creature": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-dismissed"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "upkeep": {
   "pool": "sekhem",
   "points": 1,
   "every": "day",
   "fail": "stops"
  },
  "persist": true,
  "page": "MtR p. 113",
  "note": "Crafts + Effigy 8, 15 Sekhem. Large beast such as a lion with near human wit and memory; follows complex orders, defends its maker unasked."
 },
 "mummy-2nd|princely-creature": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-dismissed"
  },
  "control": {
   "mode": "direct",
   "orders": "complex"
  },
  "upkeep": {
   "pool": "sekhem",
   "points": 1,
   "every": "day",
   "fail": "stops"
  },
  "persist": true,
  "page": "MtR p. 114",
  "note": "Crafts + Effigy 9, 25 Sekhem. Any animal of any size, sharing its maker's knowledge and skills. Absolutely loyal, always guards the maker's interests."
 },
 "mummy-2nd|summon-the-dead": {
  "what": "ghost",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "roll": {
   "when": "arrival",
   "who": "creature",
   "pool": "willpower",
   "diff": 6,
   "fail": "free"
  },
  "page": "MtR p. 117",
  "note": "Name a known ghost; Occult + Necromancy against its Willpower, both at 6. It arrives free to act; other spells compel it. Living mummies only."
 },
 "mummy-2nd|animate-corpse": {
  "what": "corpse",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": "balance+necromancy"
  },
  "lasts": {
   "kind": "until-destroyed"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "persist": true,
  "page": "MtR p. 121",
  "note": "Thanatology + Necromancy 8, 3 Sekhem. A shambler (p. 209) that only follows simple explicit orders and rots unless Body Preservation holds it."
 },
 "mummy-2nd|call-the-khaibit": {
  "what": "shade",
  "profile": "wild",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "until-destroyed"
  },
  "control": {
   "mode": "hostile"
  },
  "persist": true,
  "page": "MtR p. 122",
  "note": "Cast over a dying person, who passes in peace while their shadow-soul stays there as a strong spirit harming the living. Necromancy binds it."
 },
 "kuei-jin-kote|spirit-caul": {
  "what": "spirit",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "page": "KotE p. 103",
  "note": "Intelligence + Yin or Yang against the Wall. A spirit comes at its leisure, owing nothing. Three successes call a named nearby spirit."
 },
 "kuei-jin-kote|blood-that-wakes-the-image": {
  "what": "object",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders"
  },
  "stats": {
   "strength": "1 per Yang",
   "dexterity": "1 per Yang",
   "stamina": "1 per Yang",
   "health": "2 per Yang"
  },
  "page": "KotE p. 111",
  "note": "Yang blood wakes a well crafted statue able to move; it obeys as best it can, small ones grow. No duration given. Yin freezes spirits.",
  "unsure": "unsure"
 },
 "kuei-jin-kote|pelesit": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "night"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "stats": {
   "strength": "1 per level given",
   "dexterity": 3,
   "stamina": "1 per level given",
   "perception": 2,
   "intelligence": 2,
   "wits": 2,
   "brawl": 2,
   "dodge": 2,
   "health": "2 per level given",
   "attack": "bite Strength bashing"
  },
  "onDeath": "If killed or not returned by dawn, the vampire loses the lent health levels and heals them normally.",
  "page": "KotE p. 117",
  "note": "1 Yang Chi and lent health levels. A flesh spy that hops, climbs and speaks. Dies at dawn; merging back returns the levels."
 },
 "rituals-v20|sanguine-assistant": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "night",
   "n": 1,
   "perSuccess": true
  },
  "control": {
   "mode": "direct",
   "orders": "complex"
  },
  "stats": {
   "strength": 1,
   "dexterity": "caster's",
   "stamina": 1,
   "perception": "caster's",
   "intelligence": "caster's",
   "wits": "caster's"
  },
  "page": "V20 p. 236",
  "note": "Five blood. Foot tall helper of workshop junk with the caster's Abilities minus one; Social dots grow nightly. Timid, immune to mind control."
 },
 "rituals-v20|splinter-servant": {
  "what": "object",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "rounds",
   "n": 5,
   "perSuccess": true
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "roll": {
   "when": "arrival",
   "who": "summoner",
   "pool": "none",
   "diff": 6,
   "fail": "attack-nearest"
  },
  "stats": {
   "health": 3,
   "attack": "stake: caster's Wits + Occult at 9, damage caster's Thaumaturgy"
  },
  "page": "V20 p. 238",
  "note": "Unwrapped, it must be aimed and commanded that turn or it attacks the nearest being. Moves 30 yards, attacks against it at +3."
 },
 "rituals-v20-dark-ages|samira-s-kihanah": {
  "what": "spirit",
  "profile": "called",
  "count": {"by": "fixed", "fixed": 1, "max": 1},
  "lasts": {"kind": "scene"},
  "control": {"mode": "none"},
  "page": "VtDA20 p. 307",
  "note": "B5792: a djinn called into the metal item answers the caster's questions for the scene; it serves no other way."
 },
 "rituals-v20-dark-ages|eyes-of-the-abyss": {
  "what": "elemental",
  "profile": "servant",
  "count": {"by": "fixed", "fixed": 1, "max": 1},
  "lasts": {"kind": "scene"},
  "control": {"mode": "direct"},
  "page": "VtDA20 p. 271",
  "note": "B5792: a tiny elemental of the Abyss, the caster's eyes in the shadows for the scene."
 },
 "rituals-w20|baptism-of-fire": {
  "what": "spirit",
  "profile": "servant",
  "count": {"by": "fixed", "fixed": 1, "max": 1},
  "lasts": {"kind": "hours", "n": 720},
  "control": {"mode": "none"},
  "page": "W20 p. 210",
  "note": "B5792: a Kin-Fetch that watches over the marked child; more successes keep track of the child better."
 },
 "rituals-v20-dark-ages|summon-guardian-spirit": {
  "what": "spirit",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "hours",
   "n": 24
  },
  "control": {
   "mode": "none"
  },
  "page": "VtDA20 p. 305",
  "note": "An unseen, mute spirit that only warns of danger, waking the caster and pointing toward the threat. Visible to the caster and supernatural senses."
 },
 "rituals-v20-dark-ages|animated-assistants": {
  "what": "object",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "night",
   "n": 1,
   "perSuccess": true
  },
  "control": {
   "mode": "direct"
  },
  "page": "VtDA20 p. 306",
  "note": "Haven ritual: five minutes and one blood per ten feet. Loose items fetch tools and do small chores; they cannot attack or defend."
 },
 "rituals-v20-dark-ages|calling-the-hungry-shade": {
  "what": "shade",
  "profile": "wild",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "stats": {
   "strength": "obtenebration (max 4)",
   "dexterity": "obtenebration (max 4)",
   "stamina": "obtenebration (max 4)",
   "brawl": "obtenebration",
   "melee": "obtenebration",
   "health": 12,
   "attack": "shadow form, as Talon of the Abyss"
  },
  "page": "VtDA20 p. 272",
  "note": "Dusk to moonset, Intelligence + Occult 9, minus 1 per helping Mystic. Independent and hungry for vampires; no control given. Botch: attacks caster. Duration unstated."
 },
 "rituals-w20|rite-of-summoning": {
  "what": "spirit",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "roll": {
   "when": "arrival",
   "who": "summoner",
   "pool": "gnosis",
   "diff": "spirit-rank",
   "fail": "refuse",
   "ladder": [
    {
     "min": 1,
     "control": "hostile",
     "note": "comes eventually, hostile at first"
    },
    {
     "min": 2,
     "control": "hostile",
     "note": "comes quickly, hostile at first"
    },
    {
     "min": 3,
     "control": "none",
     "note": "comes at once, neutral"
    },
    {
     "min": 4,
     "control": "none",
     "note": "comes at once, passively benign"
    },
    {
     "min": 5,
     "control": "orders",
     "note": "comes at once, friendly"
    }
   ],
   "rankText": "4 Gaffling, 5 Jaggling, 7 totem avatar, 8-9 Incarna, 10 Celestine"
  },
  "page": "W20 p. 212",
  "note": "Pierce the Gauntlet first unless in the Umbra. The spirit cannot flee and must attend, but need not obey. Minus 1 difficulty hourly, minimum 3."
 },
 "rituals-dark-ages-werewolf|rite-of-summoning": {
  "what": "spirit",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "roll": {
   "when": "arrival",
   "who": "summoner",
   "pool": "gnosis",
   "diff": "spirit-rank",
   "fail": "refuse",
   "ladder": [
    {
     "min": 1,
     "control": "hostile",
     "note": "comes eventually, hostile at first"
    },
    {
     "min": 2,
     "control": "hostile",
     "note": "comes quickly, hostile at first"
    },
    {
     "min": 3,
     "control": "none",
     "note": "comes at once, neutral"
    },
    {
     "min": 4,
     "control": "none",
     "note": "comes at once, passively benign"
    },
    {
     "min": 5,
     "control": "orders",
     "note": "comes at once, friendly"
    }
   ],
   "rankText": "4 Gaffling, 5 Jaggling, 7 totem avatar, 8-9 Incarna, 10 Celestine"
  },
  "page": "DA:W p. 150",
  "note": "Lesser spirits must come; great ones come from curiosity. Difficulty drops 1 per hour, minimum 3. Attitude, not obedience. Botch calls wrong spirits."
 },
 "rituals-mummy-the-resurrection|simple-servitor": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "until-dismissed"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "upkeep": {
   "pool": "sekhem",
   "points": 1,
   "every": "month",
   "fail": "stops"
  },
  "persist": true,
  "stats": {
   "health": 3,
   "soak": "lethal"
  },
  "page": "MtR p. 109",
  "note": "Crafts + Effigy 6, 1 Sekhem. Ushabti for digging, carrying, following and stopping; harder orders jam it. Cannot fight or heal; no wound penalties."
 },
 "rituals-mummy-the-resurrection|summon-the-dead": {
  "what": "ghost",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "roll": {
   "when": "arrival",
   "who": "creature",
   "pool": "willpower",
   "diff": 6,
   "fail": "free"
  },
  "page": "MtR p. 117",
  "note": "Name a known ghost; Occult + Necromancy against its Willpower, both at 6. It arrives free to act; other spells compel it. Living mummies only."
 },
 "rituals-mummy-the-resurrection|animate-corpse": {
  "what": "corpse",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": "balance+necromancy"
  },
  "lasts": {
   "kind": "until-destroyed"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "persist": true,
  "page": "MtR p. 121",
  "note": "Thanatology + Necromancy 8, 3 Sekhem. A shambler (p. 209) that only follows simple explicit orders and rots unless Body Preservation holds it."
 },
 "werewolf-changing-breeds|brethren-call": {
  "what": "swarm",
  "profile": "servant",
  "count": {
   "by": "successes",
   "mult": 50
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "orders",
   "orders": "simple"
  },
  "page": "W20 CB p. 68",
  "note": "1 blood, Willpower 7. Spiders arrive at once ready to help. At difficulty 8 it instead alerts the two nearest Ananasi, who travel there."
 },
 "werewolf-changing-breeds|river-of-blood": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "direct"
  },
  "stats": {
   "strength": "2 x successes",
   "health": "2 x successes"
  },
  "page": "W20 CB p. 90",
  "note": "1 Rage, Manipulation + Primal-Urge 7, or 5 at a famous bloodshed site. Three turns to gather spilled blood into any shape the Swara wants."
 },
 "werewolf-changing-breeds|call-to-allies": {
  "what": "person",
  "profile": "person",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "task"
  },
  "control": {
   "mode": "none"
  },
  "page": "W20 CB p. 131",
  "note": "A cry for help, no roll. Clan, friends, local spirits and sensitive mortals hear it and are guided straight to the Kitsune."
 },
 "werewolf-changing-breeds|swarm-of-servants": {
  "what": "swarm",
  "profile": "servant",
  "count": {
   "by": "successes",
   "mult": 25
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "direct",
   "range": "near"
  },
  "stats": {
   "strength": 1,
   "attack": "harass: minus 1 die per 25 vermin"
  },
  "page": "W20 CB p. 132",
  "note": "1 Willpower, Stamina + Occult 8. Vermin shaken from the tail must stay within 20 feet; they harass foes and do small tasks. Duration unstated."
 },
 "werewolf-changing-breeds|attraction": {
  "what": "animal",
  "profile": "called",
  "count": {
   "by": "successes"
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "page": "W20 CB p. 135",
  "note": "A crafted kami draws or repels one kind of animal; more successes, stronger pull. Manipulation + Animal Ken 7. Duration unstated."
 },
 "werewolf-changing-breeds|paper-beast": {
  "what": "construct",
  "profile": "servant",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "direct"
  },
  "stats": {
   "strength": "as the animal",
   "dexterity": "as the animal",
   "stamina": "as the animal",
   "health": 1
  },
  "page": "W20 CB p. 135",
  "note": "2 Gnosis, Gnosis roll 7; spit on the paper kami and it grows into the animal. Paper Flesh (level 5) makes it real flesh."
 },
 "mage-m20|summon-keyword": {
  "what": "spirit",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "roll": {
   "when": "arrival",
   "who": "summoner",
   "pool": "willpower",
   "diff": "creature-willpower",
   "fail": "refuse"
  },
  "page": "M20 p. 509, 521-522",
  "note": "Spirit 3 conjures but does not compel. Spirit 4 forces appearance or binding by resisted Willpower; Mind 4/Spirit 4 commands. Earthly beings: Correspondence 4/Life 2."
 },
 "mage-m20|familiar": {
  "what": "beast",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "until-destroyed"
  },
  "control": {
   "mode": "orders",
   "orders": "complex"
  },
  "upkeep": {
   "pool": "quintessence",
   "points": 1,
   "every": "week",
   "fail": "leaves"
  },
  "persist": true,
  "onDeath": "Lose 1 permanent Willpower and 2 Quintessence per dot; Quintessence the mage lacks becomes Paradox.",
  "page": "M20 p. 315-316",
  "note": "Weekly Quintessence equals the rating. Within 10 yards holds 5 Paradox per dot, shedding 1 a week; overflow backlashes both. Has its own mind."
 },
 "werewolf-w20|rite-of-summoning": {
  "what": "spirit",
  "profile": "called",
  "count": {
   "by": "fixed",
   "fixed": 1,
   "max": 1
  },
  "lasts": {
   "kind": "scene"
  },
  "control": {
   "mode": "none"
  },
  "roll": {
   "when": "arrival",
   "who": "summoner",
   "pool": "gnosis",
   "diff": "spirit-rank",
   "fail": "refuse",
   "ladder": [
    {
     "min": 1,
     "control": "hostile",
     "note": "comes eventually, hostile at first"
    },
    {
     "min": 2,
     "control": "hostile",
     "note": "comes quickly, hostile at first"
    },
    {
     "min": 3,
     "control": "none",
     "note": "comes at once, neutral"
    },
    {
     "min": 4,
     "control": "none",
     "note": "comes at once, passively benign"
    },
    {
     "min": 5,
     "control": "orders",
     "note": "comes at once, friendly"
    }
   ],
   "rankText": "4 Gaffling, 5 Jaggling, 7 totem avatar, 8-9 Incarna, 10 Celestine"
  },
  "page": "W20 p. 212",
  "note": "Checked: the spirit cannot escape its caller and must attend, but nothing binds it to obey. Success count sets only its attitude."
 }
};

export const NOT_SUMMON = {
 "vampire-dark-ages|into-the-chasm": {
  "kw": [
   "move"
  ],
  "page": "VtDA20 p. 273",
  "why": "A portal through the Abyss. Only a botch releases Hungry Shades, one per 1 rolled."
 },
 "vampire-v20|night-cry": {
  "kw": [
   "harm"
  ],
  "page": "V20 p. 176",
  "why": "A scream that aids or wounds targets. Only a botch draws unruly ghosts or Spectres."
 },
 "werewolf-dark-ages|summon-talisman": {
  "kw": [
   "make",
   "move"
  ],
  "page": "DA:W p. 140",
  "why": "Pulls a dedicated handheld item to the Garou's grip, even out of another's hand."
 },
 "werewolf-w20|king-of-the-beasts": {
  "kw": [
   "sway"
  ],
  "page": "W20 p. 167",
  "why": "Commands one animal already within 100 feet; it obeys fully until released. Only one at a time."
 },
 "werewolf-w20|infest": {
  "kw": [
   "place",
   "bind"
  ],
  "page": "W20 p. 176",
  "why": "Floods a building with local vermin that settle in rather than attack. Five successes leave it unlivable for a long time."
 },
 "werewolf-w20|fetish-fetch": {
  "kw": [
   "make",
   "move"
  ],
  "page": "W20 p. 197",
  "why": "Calls fetishes to hand from one hidden cache, or sends them back, for a Gnosis point."
 },
 "changeling-c20|shivers": {
  "kw": [
   "bind",
   "place"
  ],
  "page": "C20 p. 199",
  "why": "Makes a person, place or thing a beacon for hauntings. Ghosts already exist; none are called or controlled."
 },
 "demon-dtf|command-animals": {
  "kw": [
   "sway"
  ],
  "page": "DtF p. 204",
  "why": "Commands animals already present, one per success, by thought, for a day; they gain Intelligence 1."
 },
 "mummy-2nd|rousing-apophis": {
  "kw": [
   "harm",
   "weather"
  ],
  "page": "MtR p. 106",
  "why": "An earthquake of 8 or more centred on the caster. No creature serves; the caster likely dies."
 },
 "rituals-v20|call-of-the-hungry-dead": {
  "kw": [
   "bind",
   "sense"
  ],
  "page": "V20 p. 177",
  "why": "The target hears the dead across the Shroud, often as maddening noise. Nothing is called."
 },
 "rituals-v20-dark-ages|call-of-the-hungry-dead": {
  "kw": [
   "bind",
   "sense"
  ],
  "page": "VtDA20 p. 292",
  "why": "The target hears the dead while the black candle burns, at +2 to hearing rolls. Nothing is called."
 },
 "rituals-w20|rite-of-spirit-awakening": {
  "kw": [
   "make"
  ],
  "page": "W20 p. 212",
  "why": "Wakes an object's sleeping spirit in the Umbra, unmoving unless the object moves; plants give one talen use. Grants no control."
 },
 "rituals-w20|rite-of-the-totem": {
  "kw": [
   "bind"
  ],
  "page": "W20 p. 213",
  "why": "Joins a pack to a totem that judges them worthy. Needs the Totem Background."
 },
 "rituals-w20|the-hunt": {
  "kw": [
   "bind"
  ],
  "page": "W20 p. 215",
  "why": "Sets a sept's hunt on a werewolf criminal, who loses a dot of Rank. Hunters are Garou, not summoned beings."
 },
 "rituals-w20|the-great-hunt": {
  "kw": [
   "harm"
  ],
  "page": "W20 p. 218",
  "why": "A Midsummer sacred hunt of a worthy foe for Glory. Nothing is summoned."
 },
 "rituals-dark-ages-werewolf|rite-of-spirit-awakening": {
  "kw": [
   "make"
  ],
  "page": "DA:W p. 149",
  "why": "Wakes a dormant object or plant spirit; difficulty is its Rage. Grants no control; not on sentient beings."
 },
 "rituals-dark-ages-werewolf|rite-of-the-totem": {
  "kw": [
   "bind"
  ],
  "page": "DA:W p. 150",
  "why": "The pack hunts the Umbra for a totem's sign and binds to it. Needs the Totem Background."
 },
 "rituals-dark-ages-werewolf|the-hunt": {
  "kw": [
   "bind"
  ],
  "page": "DA:W p. 152",
  "why": "Charisma + Rituals against Rank + 4 sets the pack on an offender. Nothing is summoned."
 },
 "rituals-dark-ages-werewolf|the-great-hunt": {
  "kw": [
   "harm"
  ],
  "page": "DA:W p. 154",
  "why": "Sacred Midsummer hunt; Gaia may rarely demand a great warrior as the quarry. Nothing is summoned."
 },
 "rituals-mummy-the-resurrection|call-the-stars": {
  "kw": [
   "harm",
   "weather"
  ],
  "page": "MtR p. 102",
  "why": "Meteors pound a small town for minutes equal to Balance, one aggravated level a turn to those exposed."
 },
 "rituals-mummy-the-resurrection|rousing-apophis": {
  "kw": [
   "harm",
   "weather"
  ],
  "page": "MtR p. 106",
  "why": "An earthquake of 8 or more centred on the caster. Only the serpent's image appears, not a servant."
 },
 "werewolf-changing-breeds|mind-of-the-swarm": {
  "kw": [
   "sway"
  ],
  "page": "W20 CB p. 188",
  "why": "Commands mundane rats, ten per success, for hours equal to Obligation. Nothing says they are called from afar."
 }
};
