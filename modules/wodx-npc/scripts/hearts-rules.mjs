/**
 * WoDX NPC 0.58.0: courtship, marriage and the law, children, households and loved ones as a weak spot (B2854-B2862).
 * Pure: no Foundry. Every table covers 1197 to the far future and every way of life in Chronicle's world-rules.
 *
 *   warmth     a romance tie's track, kept on the one who feels it: flags["wodx-npc"].warmth {otherId: {value, log}}
 *   marriages  flags["wodx-npc"].marriages [{id, with: [{id, name}], at, region, year, rite, record, money, ended}]
 *   household  flags["wodx-npc"].household [{id, name, role}]
 * The numbers are house rules (B2855, B2859, B2861); the laws are dated readings of history (B2857).
 */

/* ------------------------------------------------------------------ */
/*  Courtship and romance (h1)                                         */
/* ------------------------------------------------------------------ */

export const WARMTH = [
  {value: -1, word: "Wary"}, {value: 0, word: "Cool"}, {value: 1, word: "Warm"}, {value: 2, word: "Fond"}, {value: 3, word: "Devoted"}
];
export const WARMTH_MIN = -1, WARMTH_MAX = 3;
export const warmthWord = v => (WARMTH.find(w => w.value === clampW(v)) ?? WARMTH[1]).word;
const clampW = v => Math.max(WARMTH_MIN, Math.min(WARMTH_MAX, Math.round(Number(v) || 0)));

/** What moves warmth, and by how much. A social roll's step is set by its successes. */
export const WARMTH_EVENTS = {
  time: {delta: 1, label: "Time spent together", kind: "time"},
  gift: {delta: 1, label: "A gift", kind: "gift"},
  aid: {delta: 1, label: "Help when it was needed", kind: "aid"},
  talk: {delta: 1, label: "A long talk", kind: "talk"},
  daring: {delta: 1, label: "Something bold done together", kind: "daring"},
  custom: {delta: 1, label: "Courting by the proper custom", kind: "custom"},
  promise: {delta: 1, label: "A promise kept", kind: "promise"},
  roll: {delta: 1, label: "A social roll won them over", kind: "roll"},
  slight: {delta: -1, label: "A slight or a broken promise", kind: "slight"},
  cruelty: {delta: -2, label: "Cruelty", kind: "cruelty"},
  betrayal: {delta: -2, label: "A betrayal", kind: "betrayal"}
};
/** What each Nature (V20 archetypes) warms to most: one more step for that kind of event. House reading. */
export const NATURE_LIKES = {
  architect: "talk", autocrat: "custom", "bon vivant": "gift", bravo: "daring", caregiver: "aid", celebrant: "time", child: "gift",
  competitor: "daring", conformist: "custom", conniver: "gift", curmudgeon: "aid", deviant: "daring", director: "custom", fanatic: "talk",
  gallant: "gift", judge: "promise", loner: "talk", martyr: "aid", masochist: "daring", monster: "daring", pedagogue: "talk",
  penitent: "aid", perfectionist: "promise", rebel: "daring", rogue: "daring", survivor: "aid", "thrill-seeker": "daring",
  traditionalist: "custom", trickster: "time", visionary: "talk"
};
/** A social roll's step: 1 or 2 successes warm by one, 3 or more by two; a botch cools by one. */
export const rollStep = (successes = 0, botch = false) => (botch ? -1 : successes >= 3 ? 2 : successes >= 1 ? 1 : 0);

/**
 * What the supernatural truth does to a romance. who: the one loved {line, humanity, path, rage}; partner: the one who
 * feels it {line}. Returns {cap, halve, notes}: cap is the highest warmth it can reach, halve halves gains from time.
 */
export function hindrance(who = {}, partner = {}) {
  const notes = [];
  let cap = WARMTH_MAX, halve = false;
  const mortal = !partner.line || ["mortal", "kinfolk", "ghoul", "hunter"].includes(partner.line);
  if ( who.line === "vampire" ) {
    if ( who.path ) { cap = Math.min(cap, 2); notes.push("On a Path, love is held at arm's length: no more than Fond."); }
    else if ( Number(who.humanity) > 0 && Number(who.humanity) <= 4 ) { cap = Math.min(cap, 2); notes.push("With Humanity this low the Beast shows: no more than Fond."); }
    notes.push("A Kindred lover needs blood, keeps nights only, and risks the Masquerade.");
  }
  if ( who.line === "werewolf" && mortal && partner.line !== "kinfolk" && Number(who.rage) >= 5 ) {
    halve = true; notes.push("Rage makes mortals uneasy (the Curse): time together warms half as fast.");
  }
  if ( who.line === "werewolf" && mortal && partner.line !== "kinfolk" ) notes.push("If the lover sees the Crinos, the Delirium blurs what they remember.");
  if ( who.line === "changeling" && mortal ) notes.push("The Mists cloud what a mortal lover remembers of the fae's true self.");
  if ( who.line === "wraith" ) { cap = Math.min(cap, 2); notes.push("Across the Shroud, love is a Passion, not an embrace."); }
  if ( who.line === "mage" && mortal ) notes.push("A mortal lover near open magick draws Paradox.");
  return {cap, halve, notes};
}
/** One event on the warmth one person feels for another. Returns the new map. */
export function moveWarmth(map = {}, otherId, event, {at = 0, why = "", nature = "", successes = 0, botch = false, cap = WARMTH_MAX, halve = false} = {}) {
  const ev = WARMTH_EVENTS[event];
  let delta = event === "roll" ? rollStep(successes, botch) : ev ? ev.delta : Number(event) || 0;
  if ( ev && delta > 0 && NATURE_LIKES[String(nature).toLowerCase()] === ev.kind ) delta += 1;
  const t = normWarmth(map);
  const cur = t[otherId] ?? {value: 0, log: [], half: 0};
  if ( halve && event === "time" && delta > 0 ) {
    // Half as fast: every second time counts
    cur.half = (Number(cur.half) || 0) + 1;
    delta = cur.half % 2 === 0 ? delta : 0;
  }
  const next = clampW(cur.value + delta);
  cur.value = delta > 0 ? Math.min(next, Math.max(cur.value, cap)) : next;
  cur.log.push({at, why: why || ev?.label || "", delta});
  cur.log = cur.log.slice(-12);
  t[otherId] = cur;
  return t;
}
export function normWarmth(t = {}) {
  const out = {};
  for ( const [k, v] of Object.entries(t ?? {}) ) if ( k && v && typeof v === "object" ) out[k] = {value: clampW(v.value), half: Number(v.half) || 0, log: (v.log ?? []).slice(-12)};
  return out;
}

/** How courting is done, by way of life and century. */
const COURT = {
  arranged: "The families arrange the match through a go-between; the couple may meet only a few times before the wedding.",
  calling: "A suitor calls on the family and writes letters; the couple meet under a chaperone's eye.",
  consent: "The families arrange the match, and the bride's consent is asked before witnesses.",
  matchmaker: "A matchmaker brings the families together; horoscopes and gifts are exchanged.",
  miai: "A formal meeting of the two families decides it; love may come after.",
  dating: "The couple meet at dances, work or the pictures and choose each other; families have a say.",
  online: "People meet through friends, work or the net, and choose for themselves.",
  net: "Matches are suggested by the net's reckoning of each person; choosing is still the couple's.",
  custom: "Courting follows the people's own custom: gifts between families, a time of service, or a feast."
};
const COURT_BY = {
  latin: [[-9999, "arranged"], [1750, "calling"], [1920, "dating"], [1995, "online"], [2040, "net"]],
  orthodox: [[-9999, "arranged"], [1850, "calling"], [1925, "dating"], [1995, "online"], [2040, "net"]],
  islamic: [[-9999, "consent"], [1960, "dating"], [2005, "online"], [2040, "net"]],
  indic: [[-9999, "matchmaker"], [1990, "dating"], [2005, "online"], [2040, "net"]],
  sinic: [[-9999, "matchmaker"], [1950, "dating"], [2000, "online"], [2040, "net"]],
  japanese: [[-9999, "miai"], [1960, "dating"], [2000, "online"], [2040, "net"]]
};
export function courtshipFor(sphere, year) {
  const rows = COURT_BY[sphere] ?? [[-9999, "custom"], [1960, "dating"], [2005, "online"], [2040, "net"]];
  let k = rows[0][1];
  for ( const [from, v] of rows ) if ( Number(year) >= from ) k = v;
  return {key: k, text: COURT[k]};
}

/* ------------------------------------------------------------------ */
/*  Marriage, divorce and the law (h2)                                 */
/* ------------------------------------------------------------------ */

export const MONEY_KINDS = {
  dowry: {label: "Dowry", payer: "the bride's family", to: "the new household"},
  mahr: {label: "Mahr", payer: "the groom", to: "the bride, to keep"},
  brideWealth: {label: "Bride wealth", payer: "the groom's family", to: "the bride's family"},
  gifts: {label: "Betrothal gifts and dowry", payer: "both families", to: "the new household"},
  none: {label: "No set payment", payer: "", to: ""}
};
/** Each way of life's marriage before the law changes: rite, record, money, more than two, divorce, same-sex unions. */
export const SPHERE_MARRIAGE = {
  latin: {rite: "a church wedding after the banns", record: "the priest and witnesses", money: "dowry", plural: false, divorce: false, sameSex: false},
  orthodox: {rite: "the church crowning", record: "the parish book", money: "dowry", plural: false, divorce: true, sameSex: false},
  islamic: {rite: "the nikah contract before two witnesses", record: "the qadi's register", money: "mahr", plural: true, divorce: true, sameSex: false},
  indic: {rite: "the seven steps round the sacred fire", record: "the family and the priest", money: "dowry", plural: true, divorce: false, sameSex: false},
  sinic: {rite: "the bride's procession and bows before the ancestors", record: "the clan register", money: "gifts", plural: true, divorce: true, sameSex: false},
  japanese: {rite: "the exchange of cups before the family", record: "the house register", money: "gifts", plural: true, divorce: true, sameSex: false},
  theravada: {rite: "a blessing by monks and the elders", record: "the village", money: "brideWealth", plural: true, divorce: true, sameSex: false},
  tibetan: {rite: "a feast and the lama's blessing", record: "the family", money: "gifts", plural: true, divorce: true, sameSex: false},
  malay: {rite: "the akad nikah", record: "the kadi", money: "mahr", plural: true, divorce: true, sameSex: false},
  sahel: {rite: "the marriage before the families and the imam", record: "the families", money: "brideWealth", plural: true, divorce: true, sameSex: false},
  swahili: {rite: "the nikah and the wedding feast", record: "the kadi", money: "mahr", plural: true, divorce: true, sameSex: false},
  bantu: {rite: "the families' agreement and the feast", record: "the elders", money: "brideWealth", plural: true, divorce: true, sameSex: false},
  mesoamerican: {rite: "the tying of the cloaks before the elders", record: "the elders", money: "gifts", plural: true, divorce: true, sameSex: false},
  andean: {rite: "a trial marriage, then the community's blessing", record: "the ayllu", money: "gifts", plural: true, divorce: true, sameSex: false},
  polynesian: {rite: "the families' exchange of gifts and a feast", record: "the families", money: "gifts", plural: true, divorce: true, sameSex: false},
  northern: {rite: "the families' agreement and gifts", record: "the band", money: "brideWealth", plural: true, divorce: true, sameSex: false}
};
/**
 * Dated changes by region, applied in order over the way of life. civil: a civil register and wedding; sameSex: "union"
 * for a registered partnership, "marriage" for marriage. Readings of history; the Storyteller may move a date.
 */
export const REGION_MARRIAGE = {
  "france": [[1792, {civil: true, divorce: true}], [1816, {divorce: false}], [1884, {divorce: true}], [1999, {sameSex: "union"}], [2013, {sameSex: "marriage"}]],
  "low-countries": [[1796, {civil: true, divorce: true}], [1998, {sameSex: "union"}], [2001, {sameSex: "marriage"}]],
  "german-lands": [[1875, {civil: true, divorce: true}], [2001, {sameSex: "union"}], [2017, {sameSex: "marriage"}]],
  "moravia": [[1919, {civil: true, divorce: true}], [2006, {sameSex: "union"}]],
  "british-isles": [[1837, {civil: true}], [1857, {divorce: true}], [2005, {sameSex: "union"}], [2014, {sameSex: "marriage"}]],
  "iberia": [[1870, {civil: true}], [1932, {divorce: true}], [1939, {divorce: false}], [1981, {divorce: true}], [2005, {sameSex: "marriage"}]],
  "italy": [[1865, {civil: true}], [1970, {divorce: true}], [2016, {sameSex: "union"}]],
  "scandinavia": [[1536, {divorce: true}], [1915, {civil: true}], [1989, {sameSex: "union"}], [2009, {sameSex: "marriage"}]],
  "poland-baltic": [[1945, {civil: true, divorce: true}]],
  "russia": [[1917, {civil: true, divorce: true}]],
  "anatolia": [[1926, {civil: true, plural: false}]],
  "persia": [[1931, {civil: true}]],
  "india": [[1955, {plural: false, divorce: true, civil: true}]],
  "china": [[1950, {civil: true, plural: false, divorce: true}]],
  "korea": [[1948, {civil: true, plural: false}]],
  "japan": [[1880, {plural: false}], [1898, {civil: true}]],
  "north-america-east": [[1640, {civil: true}], [1700, {divorce: true}], [2015, {sameSex: "marriage"}]],
  "north-america-west": [[1850, {civil: true, divorce: true}], [2015, {sameSex: "marriage"}]],
  "canada": [[1867, {civil: true}], [1968, {divorce: true}], [2005, {sameSex: "marriage"}]],
  "mexico": [[1859, {civil: true}], [1914, {divorce: true}], [2022, {sameSex: "marriage"}]],
  "brazil": [[1890, {civil: true}], [1977, {divorce: true}], [2013, {sameSex: "marriage"}]],
  "southern-cone": [[1888, {civil: true}], [1987, {divorce: true}], [2010, {sameSex: "marriage"}]],
  "southern-africa": [[1652, {civil: true, divorce: true, plural: false}], [2006, {sameSex: "marriage"}]],
  "australia": [[1788, {civil: true, plural: false}], [1959, {divorce: true}], [2017, {sameSex: "marriage"}]],
  "aotearoa": [[1840, {civil: true, plural: false}], [1867, {divorce: true}], [2013, {sameSex: "marriage"}]]
};
/** The law of marriage in a region and year. sphere: world-rules sphereFor(region, year). */
export function marriageLaw(region, year, sphere = "latin") {
  const base = {...(SPHERE_MARRIAGE[sphere] ?? SPHERE_MARRIAGE.latin), civil: false};
  for ( const [from, change] of REGION_MARRIAGE[region] ?? [] ) if ( Number(year) >= from ) Object.assign(base, change);
  // Western Christendom: registers kept from the Council of Trent (1563)
  if ( sphere === "latin" && Number(year) >= 1563 && !base.civil ) base.record = "the parish register";
  if ( base.civil ) base.record = "the civil register";
  return {...base, moneyKind: MONEY_KINDS[base.money] ?? MONEY_KINDS.none};
}
/** Can these people marry here and now? sexes: the partners' sexes ("m"/"f"/"" for unknown). married: how many spouses each already has. */
export function canMarry(law, {sexes = [], married = []} = {}) {
  const why = [];
  const known = sexes.filter(Boolean);
  if ( known.length >= 2 && new Set(known).size === 1 && law.sameSex !== "marriage" ) why.push(law.sameSex === "union" ? "Only a registered partnership is lawful here." : "The law here does not marry two people of one sex.");
  if ( married.some(n => Number(n) > 0) && !law.plural ) why.push("One of them is married already, and the law allows one spouse.");
  return {ok: !why.length, why};
}
/** The payment a marriage moves, as a share of the payer's purse (a house rule): a dowry or bride wealth a tenth, a mahr a twentieth. */
export const marriagePayment = (kind, purse = 0) => Math.max(0, Math.round((Number(purse) || 0) * ({dowry: 0.1, brideWealth: 0.1, mahr: 0.05, gifts: 0.05}[kind] ?? 0)));
export const canDivorce = law => !!law.divorce;

/* ------------------------------------------------------------------ */
/*  Children (h3)                                                      */
/* ------------------------------------------------------------------ */

/** Who can have children (V20, W20, M20, C20 and the hunter books): most undying beings cannot. */
export const CAN_HAVE_CHILDREN = {mortal: true, kinfolk: true, ghoul: true, werewolf: true, changeling: true, mage: true, hunter: true,
  vampire: false, wraith: false, mummy: false, demon: false, kueijin: false};
export const canHaveChildren = line => CAN_HAVE_CHILDREN[line] ?? true;
/**
 * What a child of these two parents is. lines: the parents' lines. roll: 0-1. A Garou with a mortal or Kinfolk has a
 * Kinfolk child who breeds true one time in ten (house); two Garou have a metis (W20); a changeling's child is mortal
 * with fae blood (Kinain); a mage's or hunter's child is mortal and may Awaken or take up the hunt.
 */
export function childOf(lines = [], roll = 0.5) {
  const [a, b] = lines.map(l => String(l || "mortal"));
  if ( !canHaveChildren(a) || !canHaveChildren(b) ) return null;
  const garou = [a, b].filter(l => l === "werewolf").length;
  if ( garou === 2 ) return {line: "werewolf", kind: "metis", note: "A metis: born in Crinos, sterile, with a deformity (W20)."};
  if ( garou === 1 ) return roll < 0.1 ? {line: "kinfolk", kind: "garou-to-be", note: "Kinfolk blood that breeds true: the First Change may come at puberty."}
    : {line: "kinfolk", kind: "kinfolk", note: "Kinfolk: Garou blood, no Change."};
  if ( [a, b].includes("kinfolk") ) return {line: "kinfolk", kind: "kinfolk", note: "Kinfolk, like the parent."};
  if ( [a, b].includes("changeling") ) return {line: "mortal", kind: "kinain", note: "Mortal, with fae blood (Kinain): Glamour may stir in them."};
  if ( [a, b].includes("mage") ) return {line: "mortal", kind: "mortal", note: "Mortal; Avatars run in families, and the child may Awaken one day."};
  if ( [a, b].includes("hunter") ) return {line: "mortal", kind: "mortal", note: "Mortal; the child may be drawn into the hunt."};
  return {line: "mortal", kind: "mortal", note: ""};
}
/** A child's stage by age. */
export const childStage = age => (age < 2 ? "infant" : age < 7 ? "small child" : age < 13 ? "child" : age < 18 ? "youth" : "grown");

/* ------------------------------------------------------------------ */
/*  Households (h4)                                                    */
/* ------------------------------------------------------------------ */

/** Who lives under the roof, and the monthly cost as a share of a one-dot worker's wage (a house rule). */
export const HOUSEHOLD_ROLES = {
  spouse: {label: "Spouse", cost: 0.5}, child: {label: "Child", cost: 0.25}, kin: {label: "Kin", cost: 0.4},
  servant: {label: "Servant", cost: 0.6}, ghoul: {label: "Ghoul", cost: 0.6, note: "and vitae each month"},
  apprentice: {label: "Apprentice", cost: 0.3}, retainer: {label: "Retainer", cost: 0.8}, ward: {label: "Ward", cost: 0.25}
};
export const normHousehold = list => (Array.isArray(list) ? list : []).filter(x => x?.id || x?.name)
  .map(x => ({id: x.id ? String(x.id) : null, name: String(x.name ?? ""), role: HOUSEHOLD_ROLES[x.role] ? x.role : "kin"}));
export function householdCost(list = [], wage = 0, months = 1) {
  const rows = normHousehold(list).map(x => ({...x, cost: Math.round(HOUSEHOLD_ROLES[x.role].cost * (Number(wage) || 0))}));
  return {rows, total: rows.reduce((s, r) => s + r.cost, 0) * Math.max(0, Number(months) || 0)};
}
/** A Kindred keeping mortals under the roof: how much the Masquerade is at risk (0 none, 1 some, 2 great). */
export function masqueradeRisk(line, list = []) {
  if ( line !== "vampire" ) return 0;
  const n = normHousehold(list).filter(x => ["spouse", "child", "kin", "servant", "ward"].includes(x.role)).length;
  return n >= 3 ? 2 : n ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/*  Loved ones as a weak spot (h5)                                     */
/* ------------------------------------------------------------------ */

/** Who counts as close: these tie kinds always, a lover or friend at Fond or warmer. */
export const CLOSE_KINDS = ["spouse", "child", "parent", "sibling", "lover", "friend", "childe", "ward", "apprentice", "retainer"];
export const isClose = (kind, warmth = 0) => (["lover", "friend"].includes(kind) ? Number(warmth) >= 2 || kind === "lover" : CLOSE_KINDS.includes(kind));
const GREAT = ["spouse", "child", "lover", "childe"];
/**
 * The checks for harm to someone close, by the line of the one who loves them. ev: "harm", "death" or "taken".
 * Returns [{text}]. The books' checks: frenzy for the Kindred (V20) and Garou (W20), Willpower for the rest; a great
 * loss risks a Derangement on a botch. The difficulties are house rules.
 */
export function weakSpotChecks(line, kind, ev, {name = "them"} = {}) {
  const great = GREAT.includes(kind);
  const out = [];
  if ( ev === "harm" || ev === "taken" ) {
    if ( line === "vampire" ) out.push({text: `Seeing ${name} ${ev === "taken" ? "taken" : "hurt"} may stir the Beast: a frenzy check (Self-Control or Instinct) at difficulty ${great ? 7 : 6}.`});
    else if ( line === "werewolf" ) out.push({text: `Rage at ${name} being ${ev === "taken" ? "taken" : "hurt"}: a frenzy check (Rage) at difficulty ${great ? 6 : 7}.`});
    else out.push({text: `Willpower at difficulty ${great ? 7 : 6} to keep a clear head while ${name} is ${ev === "taken" ? "held" : "in danger"}.`});
    if ( ev === "taken" ) out.push({text: "Whoever holds them has leverage: their demands go in the Ledger."});
  }
  if ( ev === "death" ) {
    out.push({text: `Grief for ${name}: Willpower at difficulty ${great ? 8 : 7}, or lose a point of temporary Willpower.`});
    if ( great ) out.push({text: "A botch leaves a Derangement from the loss (the Storyteller picks it)."});
    if ( line === "vampire" ) out.push({text: "If the Kindred's own hand or neglect caused it, a degeneration roll may follow."});
    if ( line === "werewolf" ) out.push({text: "Rage at the loss: a frenzy check at difficulty 6."});
    if ( line === "changeling" ) out.push({text: "Grief dims the Dreaming: Banality may rise by one (Storyteller)."});
    if ( line === "wraith" ) out.push({text: "A Passion tied to them may fade, and the Shadow speaks of it."});
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Adoption of children and adults (NPC 0.69.0, Ben 2026-11-13)        */
/* ------------------------------------------------------------------ */

/**
 * How each way of life takes in another's child or makes an adult its own, before the law changes. child: what taking
 * in a child is ("adoption" makes a son or daughter and heir; "fostering" a ward with no right to inherit; "kafala"
 * the Islamic guardianship, a ward who keeps their own name and inherits only by bequest); adult: whether an adult can
 * be adopted (an heir made, a name carried on); rite and record: how it is done and kept. Readings of history in
 * WoDX's own words; the Storyteller may move a date.
 */
export const SPHERE_ADOPTION = {
  latin: {child: "fostering", adult: false, rite: "taking the child in before the priest, often with godparents", record: "the parish and the family"},
  orthodox: {child: "adoption", adult: true, rite: "a church blessing of the adoption", record: "the parish book"},
  islamic: {child: "kafala", adult: false, rite: "kafala, guardianship before the qadi; the child keeps their own name", record: "the qadi's register"},
  indic: {child: "adoption", adult: false, rite: "the giving and taking of a son (dattaka) before the priest", record: "the family and the priest"},
  sinic: {child: "adoption", adult: true, rite: "an heir taken from the same clan, entered before the ancestors", record: "the clan register"},
  japanese: {child: "adoption", adult: true, rite: "adoption into the house (yoshi), often of a grown heir or a son-in-law", record: "the house register"},
  theravada: {child: "adoption", adult: true, rite: "taking in before the elders and the monks", record: "the village"},
  tibetan: {child: "adoption", adult: true, rite: "taking in before the family and the lama", record: "the family"},
  malay: {child: "kafala", adult: false, rite: "taking in a child (anak angkat); the child keeps their own name", record: "the kadi"},
  sahel: {child: "kafala", adult: false, rite: "fostering by kin, kafala before the imam", record: "the families"},
  swahili: {child: "kafala", adult: false, rite: "kafala before the kadi", record: "the kadi"},
  bantu: {child: "adoption", adult: true, rite: "taking in before the elders, by the lineage's custom", record: "the elders"},
  mesoamerican: {child: "adoption", adult: true, rite: "taking in before the elders", record: "the elders"},
  andean: {child: "adoption", adult: true, rite: "taking in by the ayllu's custom", record: "the ayllu"},
  polynesian: {child: "adoption", adult: true, rite: "customary adoption between kin (whangai, hanai)", record: "the families"},
  northern: {child: "adoption", adult: true, rite: "taking in by the band's custom, often to replace one lost", record: "the band"}
};
/** Dated changes by region: legal adoption under a code (child and adult), applied in order. */
export const REGION_ADOPTION = {
  "france": [[1804, {adult: true, rite: "adoption of an adult before the court (the Civil Code)", record: "the civil register"}], [1923, {child: "adoption", rite: "adoption before the court", record: "the civil register"}]],
  "moravia": [[1811, {child: "adoption", adult: true, rite: "adoption by contract approved by the court (the Civil Code of 1811)", record: "the court and the civil register"}]],
  "german-lands": [[1900, {child: "adoption", adult: true, rite: "adoption by contract approved by the court (the Civil Code)", record: "the civil register"}]],
  "italy": [[1865, {adult: true, rite: "adoption of an adult before the court", record: "the civil register"}], [1967, {child: "adoption"}]],
  "iberia": [[1889, {child: "adoption", adult: true, rite: "adoption before a judge", record: "the civil register"}]],
  "low-countries": [[1956, {child: "adoption", rite: "adoption before the court", record: "the civil register"}]],
  "british-isles": [[1926, {child: "adoption", rite: "an adoption order of the court", record: "the adopted children register"}]],
  "scandinavia": [[1917, {child: "adoption", adult: true, rite: "adoption by royal or court order", record: "the civil register"}]],
  "russia": [[1918, {child: "fostering", adult: false, rite: "guardianship (the Soviet code forbade adoption)"}], [1926, {child: "adoption", rite: "adoption by the guardianship office", record: "the civil register"}]],
  "north-america-east": [[1851, {child: "adoption", adult: true, rite: "adoption decreed by a probate court", record: "the court"}]],
  "north-america-west": [[1870, {child: "adoption", adult: true, rite: "adoption decreed by a court", record: "the court"}]],
  "canada": [[1873, {child: "adoption", rite: "adoption by court order", record: "the court"}]],
  "australia": [[1896, {child: "adoption", rite: "adoption by court order", record: "the court"}]],
  "aotearoa": [[1881, {child: "adoption", rite: "adoption by court order, beside whangai by custom", record: "the court"}]],
  "india": [[1956, {child: "adoption", rite: "adoption under the Hindu Adoptions Act", record: "the registrar"}]],
  "japan": [[1898, {record: "the family register (koseki)"}]],
  "china": [[1950, {child: "adoption", rite: "adoption registered with the state", record: "the civil register"}]],
  "korea": [[1960, {child: "adoption", record: "the family register"}]],
  "mexico": [[1917, {child: "adoption", adult: false, rite: "adoption before a judge", record: "the civil register"}]],
  "brazil": [[1916, {child: "adoption", adult: true, rite: "adoption by public deed", record: "the civil register"}]],
  "southern-cone": [[1948, {child: "adoption", rite: "adoption before a judge", record: "the civil register"}]],
  "southern-africa": [[1923, {child: "adoption", rite: "adoption by court order", record: "the court"}]]
};
export const ADOPTION_KINDS = {
  adoption: {label: "Adoption", tie: ["parent", "child"], inherits: true, note: "A son or daughter in full, and an heir."},
  fostering: {label: "Fostering or wardship", tie: ["guardian", "ward"], inherits: false, note: "Raised as family, with no right to inherit; a will can still leave them a share."},
  kafala: {label: "Kafala", tie: ["guardian", "ward"], inherits: false, note: "The guardian raises the child, who keeps their own name and lineage; a bequest of up to a third is allowed."},
  adult: {label: "Adoption of an adult", tie: ["parent", "child"], inherits: true, note: "An heir made, a name and house carried on."}
};
/** The law of adoption in a region and year. From 2100 every way of life allows full adoption of children and adults. */
export function adoptionLaw(region, year, sphere = "latin") {
  const base = {...(SPHERE_ADOPTION[sphere] ?? SPHERE_ADOPTION.latin)};
  for ( const [from, change] of REGION_ADOPTION[region] ?? [] ) if ( Number(year) >= from ) Object.assign(base, change);
  if ( Number(year) >= 2100 ) Object.assign(base, {child: base.child === "kafala" ? "kafala" : "adoption", adult: true, record: "the net's register"});
  return base;
}
/**
 * Can this adoption go ahead, and of what kind? who: {parentMinor, childMinor, parentBorn, childBorn, same}. An adult
 * is adopted only where the law allows it; the one adopting must be an adult and, where both births are known, older.
 * Returns {ok, why: [], kind, kindInfo}.
 */
export function canAdopt(law, {parentMinor = false, childMinor = false, parentBorn = null, childBorn = null, same = false} = {}) {
  const why = [];
  if ( same ) why.push("No one can adopt themselves.");
  if ( parentMinor ) why.push("The one adopting must be an adult.");
  const pb = Number(parentBorn), cb = Number(childBorn);
  if ( parentBorn !== null && childBorn !== null && Number.isFinite(pb) && Number.isFinite(cb) && pb >= cb ) why.push("The one adopting must be older than the one adopted.");
  const kind = childMinor ? law.child : "adult";
  if ( !childMinor && !law.adult ) why.push("The law here does not allow an adult to be adopted.");
  return {ok: !why.length, why, kind, kindInfo: ADOPTION_KINDS[kind] ?? ADOPTION_KINDS.fostering};
}
