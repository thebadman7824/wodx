/**
 * WoDX NPC 0.23.0 (B1005 to B1009): criminals, combatants and townsfolk. Each archetype is a temperament (a template
 * beside the line templates in npc-rules), a routine (its own ready routine, or one the town already has) and the
 * years it belongs to. WoDX readings of how each kind of person carries on, in Moravia, 1197 to the Future Darkness;
 * house rules, not book rules (PENDING-REVIEW). No Foundry calls, so the harness can test it.
 *
 *   morale (0 to 2) is new: how well the NPC holds when its leader falls or half its side is down. Only these
 *   archetypes carry it, so the older templates fight as they did.
 *   group: criminal, combatant or townsfolk. from and to: the years it is found (null: always).
 */

const B = (from, to, place, activity, more = {}) => ({from, to, place, activity, when: "any", days: null, feast: "any", label: "", ...more});
const weekdays = [0, 1, 2, 3, 4, 5], monFri = [0, 1, 2, 3, 4];
const night = {when: "night"}, day = {when: "day"};

const T = (label, v) => ({label, line: "mortal", aggression: 0.6, caution: 1, cunning: 0.5, loyalty: 0.8, cowardice: 0.8, berserk: 0, power: 0,
  fleeAt: 3, frenzyProne: false, morale: 1, fears: ["supernatural"], tactics: ["melee"], ...v});

export const MORTALS = {
  /* Criminals: they pick a mark, keep clear of the watch and give up early when the odds turn */
  cutpurse: {group: "criminal", template: T("Cutpurse or pickpocket", {aggression: 0.1, caution: 1.4, cunning: 1.2, cowardice: 1.6, fleeAt: 1, morale: 0.4,
    fears: ["supernatural", "violence"], tactics: ["flee", "scatter"]}),
    preset: {label: "Cutpurse, works the crowds", blocks: [B(9, 13, "market", "work", {days: weekdays, label: "Working the market crowd"}),
      B(18, 23, "tavern", "work", {label: "Working the taproom"}), B(23, 9, "alley", "sleep"), B(0, 24, "alley", "rest")]}},
  footpad: {group: "criminal", template: T("Footpad or mugger", {aggression: 1, caution: 0.8, cunning: 0.8, cowardice: 1, fleeAt: 2, morale: 0.5,
    tactics: ["melee", "stalk", "surrender"]}),
    preset: {label: "Footpad, waits in the dark", blocks: [B(0, 24, "alley", "hunt", {...night, label: "Waiting for someone alone"}), B(0, 24, "home", "sleep", day)]}},
  burglar: {group: "criminal", template: T("Burglar", {aggression: 0.3, caution: 1.6, cunning: 1.2, cowardice: 1.4, fleeAt: 1, morale: 0.4,
    fears: ["supernatural", "violence"], tactics: ["flee", "surrender"]}),
    preset: {label: "Burglar, out in the small hours", blocks: [B(1, 4, "street", "hunt", {...night, label: "Trying the dark houses"}), B(10, 18, "tavern", "rest"),
      B(4, 10, "home", "sleep"), B(0, 24, "home", "rest")]}},
  bandit: {group: "criminal", to: 1850, template: T("Robber knight or bandit", {aggression: 1.2, caution: 0.7, cunning: 0.7, loyalty: 1, cowardice: 0.6, fleeAt: 4,
    morale: 0.8, tactics: ["melee", "ranged", "pack", "alive", "parley", "surrender"]}),
    preset: {label: "Bandit, waits on the road", blocks: [B(8, 18, "wilds", "hunt", {...day, label: "Watching the road"}), B(0, 24, "wilds", "rest", {label: "In the camp"})]}},
  highwayman: {group: "criminal", from: 1600, to: 1850, template: T("Highwayman", {aggression: 0.8, caution: 1, cunning: 1, cowardice: 0.8, fleeAt: 2, morale: 0.6,
    tactics: ["ranged", "parley", "flee"]}),
    preset: {label: "Highwayman, out at dusk", blocks: [B(16, 22, "wilds", "hunt", {label: "On the high road"}), B(22, 12, "tavern", "sleep"), B(0, 24, "tavern", "rest")]}},
  smuggler: {group: "criminal", template: T("Smuggler", {aggression: 0.6, caution: 1.2, cunning: 1, cowardice: 0.8, fleeAt: 3, morale: 0.7,
    tactics: ["melee", "flee", "cover"]}),
    preset: {label: "Smuggler, crosses at night", blocks: [B(23, 4, "docks", "work", {...night, days: [1, 4], label: "A night crossing"}),
      B(10, 18, "tavern", "rest"), B(4, 10, "home", "sleep"), B(0, 24, "home", "rest")]}},
  fence: {group: "criminal", template: T("Fence", {aggression: 0.2, caution: 1.4, cunning: 1.4, cowardice: 1.2, fleeAt: 2, morale: 0.5,
    fears: ["supernatural", "violence"], tactics: ["call", "flee"]}), preset: "merchant"},
  conman: {group: "criminal", template: T("Con artist", {aggression: 0.1, caution: 1.2, cunning: 1.6, cowardice: 1.4, fleeAt: 1, morale: 0.4,
    fears: ["supernatural", "violence"], tactics: ["parley", "flee"]}),
    preset: {label: "Con artist, follows the crowd", blocks: [B(10, 16, "market", "work", {days: weekdays}), B(18, 24, "tavern", "work", {label: "Finding a mark"}),
      B(0, 10, "home", "sleep"), B(0, 24, "home", "rest")]}},
  gang: {group: "criminal", from: 1850, template: T("Street gang", {aggression: 1.2, caution: 0.6, cunning: 0.6, loyalty: 1.2, cowardice: 0.6, fleeAt: 3, morale: 0.6,
    territory: 1.5, tactics: ["melee", "pack", "ground", "surrender"]}),
    preset: {label: "Street gang, owns the corner", blocks: [B(20, 3, "street", "patrol", {...night, label: "On the corner"}), B(14, 20, "alley", "rest"),
      B(3, 12, "home", "sleep"), B(0, 24, "home", "rest")]}},
  mobster: {group: "criminal", from: 1900, template: T("Organised crime", {aggression: 0.9, caution: 1, cunning: 1.4, loyalty: 1.4, cowardice: 0.4, fleeAt: 3, morale: 1.2,
    tactics: ["ranged", "call", "hostage", "lead"]}),
    preset: {label: "Organised crime, business and collections", blocks: [B(11, 18, "work", "work", {days: monFri, label: "The legitimate business"}),
      B(21, 2, "street", "errand", {...night, days: [4, 5], label: "Collections"}), B(18, 21, "tavern", "drink"), B(2, 10, "home", "sleep"), B(0, 24, "home", "rest")]}},
  dealer: {group: "criminal", from: 1960, template: T("Drug dealer", {aggression: 0.7, caution: 1.2, cunning: 0.8, cowardice: 1, fleeAt: 2, morale: 0.5,
    tactics: ["melee", "flee", "hostage"]}),
    preset: {label: "Dealer, out late", blocks: [B(21, 4, "alley", "work", {...night, label: "Selling"}), B(4, 13, "home", "sleep"), B(0, 24, "home", "rest")]}},
  informer: {group: "criminal", template: T("Informer", {aggression: 0, caution: 1.6, cunning: 1.4, loyalty: 0.4, cowardice: 1.8, fleeAt: 1, morale: 0.2,
    fears: ["supernatural", "violence"], tactics: ["flee", "report"]}), preset: "clerk"},
  fixer: {group: "criminal", from: 1990, template: T("Data thief or fixer", {aggression: 0.1, caution: 1.6, cunning: 1.8, cowardice: 1.4, fleeAt: 1, morale: 0.4,
    fears: ["supernatural", "violence"], tactics: ["call", "flee"]}),
    preset: {label: "Fixer, works at night", blocks: [B(22, 5, "tavern", "work", {...night, label: "Meeting clients"}), B(5, 14, "home", "sleep"), B(0, 24, "home", "work")]}},

  /* Combatants: morale and formation do most of the work; weapons come from the era goods */
  militia: {group: "combatant", to: 1700, template: T("Town militia or levy", {aggression: 0.7, caution: 1, loyalty: 1, cowardice: 1, fleeAt: 2, morale: 0.4, herd: 1,
    tactics: ["melee", "formation", "call", "surrender"]}), preset: "labourer"},
  knight: {group: "combatant", to: 1550, template: T("Knight or noble rider", {aggression: 1.2, caution: 0.6, cunning: 0.8, loyalty: 1.4, cowardice: 0.1, fleeAt: 5, morale: 1.8,
    tactics: ["melee", "parley", "alive", "lead"]}), preset: "noble"},
  "man-at-arms": {group: "combatant", to: 1550, template: T("Man-at-arms or crossbowman", {aggression: 1, caution: 0.8, loyalty: 1.3, cowardice: 0.5, fleeAt: 4, morale: 1,
    tactics: ["melee", "ranged", "formation", "cover", "pack"]}), preset: "soldier"},
  hussite: {group: "combatant", from: 1419, to: 1434, template: T("Hussite wagon crew", {aggression: 1, caution: 0.8, loyalty: 1.6, cowardice: 0.3, fleeAt: 5, morale: 1.8,
    tactics: ["ranged", "formation", "ground", "cover"]}),
    preset: {label: "Hussite crew, camp and prayer", blocks: [B(5, 7, "church", "pray", {label: "Sermon and prayer"}), B(7, 19, "post", "patrol", {label: "On the wagon fort"}),
      B(19, 21, "church", "pray"), B(21, 5, "home", "sleep", {label: "In the camp"}), B(0, 24, "home", "rest")]}},
  mercenary: {group: "combatant", from: 1480, to: 1650, template: T("Mercenary or Landsknecht", {aggression: 1.2, caution: 0.7, loyalty: 0.5, cowardice: 0.6, fleeAt: 4, morale: 0.7,
    tactics: ["melee", "pack", "scavenge", "surrender"]}),
    preset: {label: "Mercenary, camp and tavern", blocks: [B(7, 12, "post", "patrol", {label: "Drill"}), B(14, 2, "tavern", "drink"), B(2, 7, "home", "sleep"), B(0, 24, "home", "rest")]}},
  musketeer: {group: "combatant", from: 1620, to: 1870, template: T("Musketeer or line infantry", {aggression: 0.9, caution: 0.9, loyalty: 1.4, cowardice: 0.5, fleeAt: 4, morale: 1.2,
    tactics: ["ranged", "formation", "cover"]}), preset: "soldier"},
  hussar: {group: "combatant", from: 1650, to: 1918, template: T("Hussar or dragoon", {aggression: 1.3, caution: 0.6, loyalty: 1.2, cowardice: 0.4, fleeAt: 4, morale: 1.3,
    tactics: ["melee", "pack", "ranged"]}), preset: "soldier"},
  rifleman: {group: "combatant", from: 1914, to: 1945, template: T("Rifleman", {aggression: 0.9, caution: 1.1, loyalty: 1.4, cowardice: 0.5, fleeAt: 4, morale: 1.1,
    tactics: ["ranged", "cover", "call", "pack"]}), preset: "soldier"},
  occupier: {group: "combatant", from: 1939, to: 1945, template: T("Occupation trooper or Gestapo", {aggression: 1, caution: 1, cunning: 0.9, loyalty: 1.5, cowardice: 0.3, fleeAt: 4,
    morale: 1.4, tactics: ["ranged", "call", "alive", "formation"]}),
    preset: {label: "Occupation patrol and curfew checks", blocks: [B(8, 16, "street", "patrol", {label: "Patrols"}), B(20, 24, "street", "patrol", {label: "Curfew checks"}),
      B(0, 8, "post", "sleep", {label: "In barracks"}), B(0, 24, "post", "rest")]}},
  partisan: {group: "combatant", from: 1939, template: T("Partisan or resister", {aggression: 0.9, caution: 1.2, cunning: 1.2, loyalty: 1.4, cowardice: 0.6, fleeAt: 3, morale: 1,
    tactics: ["ranged", "stalk", "scatter", "cover"]}),
    preset: {label: "Partisan, hides by day", blocks: [B(0, 24, "wilds", "hide", {...day, label: "Lying low"}), B(0, 24, "wilds", "hunt", {...night, label: "Out on a raid"})]}},
  "riot-police": {group: "combatant", from: 1948, template: T("People's Militia or riot police", {aggression: 0.9, caution: 0.9, loyalty: 1.4, cowardice: 0.4, fleeAt: 4, morale: 1.2,
    tactics: ["melee", "formation", "alive", "call"]}), preset: "police"},
  swat: {group: "combatant", from: 1970, template: T("Armed police or SWAT", {aggression: 0.9, caution: 1.2, cunning: 1, loyalty: 1.5, cowardice: 0.2, fleeAt: 4, morale: 1.6,
    tactics: ["ranged", "cover", "formation", "call", "alive", "parley"]}), preset: "police"},
  security: {group: "combatant", from: 1990, template: T("Private security or contractor", {aggression: 0.7, caution: 1.2, loyalty: 0.8, cowardice: 0.8, fleeAt: 3, morale: 0.6,
    tactics: ["ranged", "cover", "call", "surrender"]}),
    preset: {label: "Security, building rounds", blocks: [B(20, 24, "work", "patrol", {label: "Rounds"}), B(0, 6, "work", "patrol", {label: "Rounds"}),
      B(8, 16, "home", "sleep"), B(0, 24, "home", "rest")]}},
  duellist: {group: "combatant", from: 1550, to: 1900, template: T("Duellist or bravo", {aggression: 1.1, caution: 0.8, cunning: 1, loyalty: 0.6, cowardice: 0.3, fleeAt: 3, morale: 1.2,
    tactics: ["melee", "parley"]}),
    preset: {label: "Duellist, the fencing school and the tavern", blocks: [B(9, 12, "work", "work", {days: weekdays, label: "The fencing school"}), B(18, 24, "tavern", "drink"),
      B(0, 9, "home", "sleep"), B(0, 24, "home", "rest")]}},
  bodyguard: {group: "combatant", template: T("Bodyguard", {aggression: 1, caution: 0.8, loyalty: 2, cowardice: 0.2, fleeAt: 5, morale: 1.6, tactics: ["melee", "ranged", "guard", "call"]}),
    preset: {label: "Bodyguard, with the one they guard", blocks: [B(0, 24, "home", "attend", {label: "Beside the one they guard"})]}},

  /* Townsfolk: what they see matters more than how they fight */
  child: {group: "townsfolk", template: T("Child", {aggression: 0, caution: 0.6, cunning: 0.4, cowardice: 1.8, fleeAt: 1, morale: 0.2, fears: ["supernatural", "violence"],
    tactics: ["flee", "report"]}),
    preset: {label: "Child, plays by day", blocks: [B(7, 9, "church", "pray", {days: [6], label: "Mass"}), B(8, 18, "street", "wander", {...day, label: "At play"}),
      B(19, 7, "home", "sleep"), B(0, 24, "home", "rest")],
      ages: {early: [B(8, 12, "work", "work", {days: weekdays, feast: "not", label: "At school"}), B(12, 18, "street", "wander", {...day, label: "At play"}),
        B(19, 7, "home", "sleep"), B(0, 24, "home", "rest")]}}},
  gossip: {group: "townsfolk", template: T("Gossip", {aggression: 0.1, caution: 0.8, cunning: 0.8, cowardice: 1.2, fleeAt: 1, morale: 0.4, fears: ["supernatural", "violence"],
    tactics: ["flee", "report"]}),
    preset: {label: "Gossip, market and church", blocks: [B(8, 10, "church", "pray", {days: [6]}), B(8, 13, "market", "errand", {days: weekdays}),
      B(13, 18, "street", "wander"), B(21, 7, "home", "sleep"), B(0, 24, "home", "rest")]}},
  drunk: {group: "townsfolk", template: T("Drunk", {aggression: 1, caution: 0.2, cunning: 0.1, cowardice: 0.6, berserk: 0.4, fleeAt: 2, morale: 0.5, fears: ["supernatural"],
    tactics: ["melee"]}),
    preset: {label: "Drunk, in the taproom late", blocks: [B(16, 3, "tavern", "drink", {label: "Drinking"}), B(3, 12, "street", "sleep", {label: "Sleeping it off"}), B(0, 24, "home", "rest")]}},
  physician: {group: "townsfolk", template: T("Physician", {aggression: 0, caution: 1, cunning: 1, loyalty: 1, cowardice: 1, fleeAt: 2, morale: 1, fears: ["violence"],
    tactics: ["flee", "call"]}),
    preset: {label: "Physician, rounds by day", blocks: [B(8, 17, "street", "errand", {label: "On rounds"}), B(17, 22, "home", "work"), B(22, 7, "home", "sleep"), B(0, 24, "home", "rest")],
      ages: {industrial: [B(8, 17, "hospital", "work", {days: weekdays, label: "At the hospital"}), B(17, 22, "home", "work"), B(22, 7, "home", "sleep"), B(0, 24, "home", "rest")]}}},
  executioner: {group: "townsfolk", to: 1850, template: T("Executioner", {aggression: 0.8, caution: 0.8, loyalty: 1.2, cowardice: 0.2, fleeAt: 4, morale: 1.5, fears: [],
    tactics: ["melee", "alive"]}),
    preset: {label: "Executioner, lives outside the walls", blocks: [B(8, 16, "work", "work", {days: weekdays, label: "The town's work"}), B(20, 6, "home", "sleep"), B(0, 24, "home", "rest")]}},
  pilgrim: {group: "townsfolk", template: T("Pilgrim or traveller", {aggression: 0.2, caution: 1.2, cunning: 0.5, cowardice: 1.2, fleeAt: 2, morale: 0.6, fears: ["supernatural", "violence"],
    tactics: ["flee"]}),
    preset: {label: "Pilgrim, church and inn", blocks: [B(6, 12, "church", "pray"), B(12, 18, "street", "wander"), B(18, 22, "tavern", "rest"), B(22, 6, "tavern", "sleep")]}},
  servant: {group: "townsfolk", template: T("Servant", {aggression: 0.2, caution: 1.2, cunning: 0.6, loyalty: 1.6, cowardice: 1.2, fleeAt: 1, morale: 0.6, fears: ["supernatural", "violence"],
    tactics: ["call", "flee", "report"]}),
    preset: {label: "Servant, the household's hours", blocks: [B(5, 21, "home", "work", {label: "At work in the house"}), B(9, 11, "market", "errand", {days: weekdays}),
      B(21, 5, "home", "sleep"), B(0, 24, "home", "rest")]}},
  lamplighter: {group: "townsfolk", from: 1700, to: 1930, template: T("Lamplighter or night worker", {aggression: 0.2, caution: 1.2, cowardice: 1.2, fleeAt: 1, morale: 0.6,
    fears: ["supernatural", "violence"], tactics: ["call", "flee"]}),
    preset: {label: "Lamplighter, dusk and dawn rounds", blocks: [B(17, 20, "street", "work", {label: "Lighting the lamps"}), B(5, 7, "street", "work", {label: "Putting them out"}),
      B(7, 15, "home", "sleep"), B(0, 24, "home", "rest")]}},
  journalist: {group: "townsfolk", from: 1850, template: T("Journalist or photographer", {aggression: 0.2, caution: 0.6, cunning: 1.2, cowardice: 0.8, fleeAt: 2, morale: 0.8,
    fears: ["violence"], tactics: ["flee", "report"]}),
    preset: {label: "Journalist, the office and the streets", blocks: [B(9, 13, "work", "work", {days: monFri, label: "The office"}), B(13, 20, "street", "errand", {label: "After a story"}),
      B(20, 24, "tavern", "drink"), B(0, 9, "home", "sleep"), B(0, 24, "home", "rest")]}},
  prophet: {group: "townsfolk", template: T("Madman or prophet", {aggression: 0.4, caution: 0.2, cunning: 0.2, cowardice: 0.6, fleeAt: 2, morale: 1, fears: [],
    tactics: ["parley", "report"]}),
    preset: {label: "Prophet, wanders and preaches", blocks: [B(8, 18, "market", "wander", {label: "Preaching in the square"}), B(18, 8, "street", "sleep"), B(0, 24, "street", "wander")]}},
  orderly: {group: "townsfolk", from: 1780, template: T("Asylum or hospital staff", {aggression: 0.5, caution: 1, loyalty: 1, cowardice: 0.6, fleeAt: 3, morale: 1, fears: ["supernatural"],
    tactics: ["melee", "alive", "call"]}),
    preset: {label: "Orderly, shift hours", blocks: [B(7, 19, "hospital", "work", {days: weekdays, label: "On shift"}), B(19, 23, "tavern", "drink", {days: [4]}),
      B(23, 7, "home", "sleep"), B(0, 24, "home", "rest")]}}
};

export const MORTAL_TEMPLATES = Object.fromEntries(Object.entries(MORTALS).map(([k, m]) => [k, {...m.template, group: m.group}]));
/** Ready routines of their own (archetypes whose preset is a string use the town's routine of that name). */
export const MORTAL_PRESETS = Object.fromEntries(Object.entries(MORTALS).filter(([, m]) => typeof m.preset === "object")
  .map(([k, m]) => [k, {...m.preset, ...(m.from ? {from: m.from} : {}), ...(m.to ? {to: m.to} : {})}]));
export const MORTAL_DEFAULT_PRESET = Object.fromEntries(Object.entries(MORTALS).map(([k, m]) => [k, typeof m.preset === "string" ? m.preset : k]));

/** Is the archetype found in a year? No year known: yes. */
export function inYear(key, year) {
  const m = MORTALS[key], y = Number(year);
  if ( !m ) return false;
  if ( !Number.isFinite(y) || !y ) return true;
  return (!m.from || y >= m.from) && (!m.to || y <= m.to);
}
/** Every archetype of a group found in a year. */
export const mortalsFor = ({year = null, group = null} = {}) => Object.keys(MORTALS).filter(k => (!group || MORTALS[k].group === group) && inYear(k, year));

/** NPC 0.23.0: hours before someone who saw something tells the watch, the gang or the secret police. */
export const REPORT_HOURS = 2;

const NAMES = [[/cutpurse|pickpocket|pick-pocket/, "cutpurse"], [/footpad|mugger|cutthroat/, "footpad"], [/burglar|housebreaker|cat burglar/, "burglar"],
  [/robber knight|bandit|brigand|outlaw/, "bandit"], [/highwayman/, "highwayman"], [/smuggler/, "smuggler"], [/\bfence\b/, "fence"],
  [/con ?man|con artist|swindler|trickster/, "conman"], [/gang|thug/, "gang"], [/mobster|mafia|gangster|boss/, "mobster"], [/dealer|pusher/, "dealer"],
  [/informer|snitch|stool/, "informer"], [/fixer|hacker|data thief/, "fixer"], [/militia|levy|watchman/, "militia"], [/\bknight|\bsir\b/, "knight"],
  [/man-at-arms|men-at-arms|crossbow|sergeant/, "man-at-arms"], [/hussite|taborite|orphan brother/, "hussite"], [/mercenar|landsknecht|sellsword/, "mercenary"],
  [/musketeer|grenadier|fusilier/, "musketeer"], [/hussar|dragoon|cuirassier|uhlan/, "hussar"], [/rifleman|infantryman|legionnaire/, "rifleman"],
  [/gestapo|wehrmacht|\bss\b|occupation/, "occupier"], [/partisan|resister|resistance/, "partisan"], [/riot police|people's militia/, "riot-police"],
  [/swat|armed police|tactical/, "swat"], [/security|contractor|bouncer/, "security"], [/duellist|duelist|bravo|fencing master/, "duellist"],
  [/bodyguard|guardsman to/, "bodyguard"], [/\bchild\b|\bboy\b|\bgirl\b|urchin/, "child"], [/gossip/, "gossip"], [/drunk|sot\b|drunkard/, "drunk"],
  [/physician|doctor|surgeon|leech/, "physician"], [/executioner|headsman|hangman/, "executioner"], [/pilgrim|traveller|traveler/, "pilgrim"],
  [/servant|maid|footman|butler|valet/, "servant"], [/lamplighter/, "lamplighter"], [/journalist|reporter|photographer/, "journalist"],
  [/prophet|madman|madwoman|lunatic/, "prophet"], [/orderly|nurse|warder/, "orderly"]];
/** A guess at a mortal's archetype from a name ("Old Hans the footpad" is a footpad); null when nothing fits. */
export function guessMortal(name) {
  const n = String(name ?? "").toLowerCase();
  return NAMES.find(([re]) => re.test(n))?.[1] ?? null;
}
