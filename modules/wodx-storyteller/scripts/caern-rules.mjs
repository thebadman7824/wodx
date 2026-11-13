/**
 * Living caerns, the pure part (B3470-B3476). No Foundry in here.
 *
 * The Garou side of places of power: a caern on the register with its level, its kind and totem, the sept that
 * guards it and the offices it fills, the monthly moot that keeps it consecrated, and the raids and caern wars that can
 * cost it a level or take it outright.
 *
 *   Level and Gauntlet   W20 pdf p. 313 (printed 311): a caern rates 1 to 5; levels 1-2 have a Gauntlet of 4, 3-4 of
 *                        3, level 5 of 2. Moon Bridges reach 1,000 miles a level up to level 3, 6,000 at 4, 10,000 at 5.
 *   Kinds                W20 pdf p. 312 (printed 310), the Caerns chart: each kind lends one power to the Rite of the
 *                        Opened Caern, a point, a level or a die for each success.
 *   The Opened Caern     W20 pdf p. 208 (printed 206): Wits + Rituals at 7 against the caern spirit, which rolls the
 *                        caern's level at the ritemaster's Gnosis; first to its target wins (the ritemaster needs the
 *                        caern's level in successes, the spirit the ritemaster's Willpower).
 *   The Moot Rite        W20 pdf p. 208 (printed 206): held at least once a month to keep the caern consecrated; the
 *                        gathered Garou give 5 Gnosis a level between them to fill it.
 *   The sept             W20 pdf pp. 57-58 (printed 55-56) and 254 (printed 252): a sept leader, the Master of the
 *                        Rite (the highest-ranking Theurge), the Warder of the bawn, and offices of consequence (Warder,
 *                        Master of the Rite, Gatekeeper) held from Adren (Rank 3) up; others such as the Master of the
 *                        Howl, the Talesinger, the Truthcatcher and the den parent.
 *   Building a caern     W20 pdf p. 210 (printed 208): 13 Garou and 100 Gnosis; a fifth level only with another 100.
 *
 * The books give no clock for a caern losing or gaining levels, no raid odds and no rules for a caern war. WoDX
 * fills those in (house rules, B3471-B3475): missed moots, a year of full moots, raids by era, a contest of septs.
 */

export const DAY = 86400;
export const MONTH = 30 * DAY;
export const LOG_CAP = 30;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const int = v => Math.trunc(num(v));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const str = (v, n = 200) => String(v ?? "").slice(0, n);
const up = t => (t ? t[0].toUpperCase() + t.slice(1) : t);

/* ------------------------------------------------------------------ */
/*  Level, Gauntlet, Moon Bridges, kinds                                 */
/* ------------------------------------------------------------------ */

export const gauntletFor = level => [5, 4, 4, 3, 3, 2][clamp(int(level), 0, 5)];
export const bridgeMiles = level => [0, 1000, 2000, 3000, 6000, 10000][clamp(int(level), 0, 5)];
/** What the Moot Rite needs to fill the caern: 5 Gnosis a level. */
export const mootNeed = level => 5 * clamp(int(level), 0, 5);

/** The Caerns chart, in WoDX's words. `gain` says what an opened caern lends: a trait to add to, or dice. */
export const CAERN_TYPES = {
  enigmas: {label: "Enigmas", power: "dice to Enigmas", spirits: "illusion, shadow and chameleon spirits"},
  gnosis: {label: "Gnosis", power: "Gnosis points", gain: "gnosis", spirits: "Englings and ghosts"},
  healing: {label: "Healing", power: "health levels healed", spirits: "spirits of peace and calm, water elementals"},
  leadership: {label: "Leadership", power: "dice to Leadership and Intimidation", spirits: "war spirits and bird spirits"},
  rage: {label: "Rage", power: "Rage points", gain: "rage", spirits: "war and pain spirits"},
  stamina: {label: "Stamina", power: "soak dice", spirits: "protection and guardian spirits, turtle spirits"},
  strength: {label: "Strength", power: "dots of Strength", spirits: "war spirits"},
  urban: {label: "Urban", power: "dice to Streetwise", spirits: "city elementals"},
  visions: {label: "Visions", power: "oracular visions", spirits: "bird spirits"},
  will: {label: "Will", power: "Willpower points", gain: "willpower", spirits: "war spirits and ancestor spirits"},
  wisdom: {label: "Wisdom", power: "dice to Rituals and Expression", spirits: "owl spirits and ancestor spirits"},
  wyld: {label: "Wyld", power: "anything the Storyteller allows", spirits: "Wyldlings"}
};

export const STATUS = {
  held: "Held and consecrated",
  lapsed: "Held, but the Moot Rite has lapsed",
  wyrm: "Taken by the Wyrm",
  calcified: "Calcified by the Weaver",
  dead: "Dead"
};
const alive = c => c.status === "held" || c.status === "lapsed";

/* ------------------------------------------------------------------ */
/*  The sept and its offices                                             */
/* ------------------------------------------------------------------ */

/** The offices (W20 pp. 57-58, 254). `rank` is the least rank WoDX suggests for it; `auspice` the one the book names. */
export const OFFICES = {
  leader: {label: "Sept leader", rank: 3},
  rite: {label: "Master of the Rite", rank: 3, auspice: "theurge"},
  warder: {label: "Warder", rank: 3},
  gatekeeper: {label: "Gatekeeper", rank: 3},
  howl: {label: "Master of the Howl", rank: 0},
  talesinger: {label: "Talesinger", rank: 0},
  truthcatcher: {label: "Truthcatcher", rank: 0},
  den: {label: "Den parent (keeper of the cubs)", rank: 0}
};

/** Who should be Master of the Rite: the highest-ranking Theurge among the sept's Garou. */
export function masterOfTheRite(garou = []) {
  const t = garou.filter(g => /theurge/i.test(String(g.auspice ?? ""))).sort((a, b) => num(b.rank) - num(a.rank));
  return t[0]?.id ?? null;
}

/** Office holders below the suggested rank, for a quiet note to the Storyteller. */
export function officeNotes(caern, garou = []) {
  const c = normCaern(caern), out = [];
  for ( const [k, o] of Object.entries(OFFICES) ) {
    const who = c.offices[k];
    if ( !who ) continue;
    const g = garou.find(x => x.id === who);
    if ( g && num(g.rank) < o.rank ) out.push(`${g.name} holds ${o.label} below Adren (Rank ${num(g.rank)}).`);
    if ( g && o.auspice && !new RegExp(o.auspice, "i").test(String(g.auspice ?? "")) ) out.push(`${g.name} is Master of the Rite but not a Theurge.`);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  The record                                                           */
/* ------------------------------------------------------------------ */

export function blankCaern() {
  return {kind: "caern", level: 1, type: "gnosis", totem: "", sept: "", tribes: "", garou: 0, offices: {}, status: "held",
    charge: 0, lastMoot: null, missed: 0, streak: 0, ready: false, raids: true, raid: null, urban: false, lastRaidCheck: null};
}

export function normCaern(c = {}) {
  const b = {...blankCaern(), ...c};
  const offices = {};
  for ( const k of Object.keys(OFFICES) ) if ( b.offices?.[k] ) offices[k] = str(b.offices[k], 120);
  const raid = b.raid && typeof b.raid === "object"
    ? {foe: b.raid.foe === "weaver" ? "weaver" : "wyrm", strength: clamp(int(b.raid.strength) || 1, 1, 5), at: num(b.raid.at), what: str(b.raid.what, 200)} : null;
  const level = clamp(int(b.level), 0, 5);
  return {...b, kind: "caern", level, type: CAERN_TYPES[b.type] ? b.type : "gnosis", totem: str(b.totem, 80), sept: str(b.sept, 120),
    tribes: str(b.tribes, 200), garou: clamp(int(b.garou), 0, 500), offices, status: STATUS[b.status] ? b.status : "held",
    charge: clamp(int(b.charge), 0, mootNeed(level)), lastMoot: b.lastMoot === null || b.lastMoot === undefined ? null : num(b.lastMoot),
    missed: clamp(int(b.missed), 0, 99), streak: clamp(int(b.streak), 0, 999), ready: !!b.ready, raids: b.raids !== false, raid,
    urban: !!b.urban || b.type === "urban", lastRaidCheck: b.lastRaidCheck === null || b.lastRaidCheck === undefined ? null : num(b.lastRaidCheck)};
}

/* ------------------------------------------------------------------ */
/*  Dice (W20: successes at or over the difficulty, each 1 takes one)   */
/* ------------------------------------------------------------------ */

export function successes(pool, diff, rand = Math.random) {
  let s = 0;
  for ( let i = 0; i < clamp(int(pool), 0, 40); i++ ) {
    const d = 1 + Math.floor(rand() * 10);
    if ( d === 1 ) s -= 1; else if ( d >= diff ) s += 1;
  }
  return s;
}

/* ------------------------------------------------------------------ */
/*  The Moot Rite                                                        */
/* ------------------------------------------------------------------ */

/** A year of moons: this many full moots in a row and the caern may grow (house rule, B3472). */
export const RISE_MOOTS = 13;
/** Months of lapsed moots before the caern loses a level (house rule, B3471). */
export const LAPSE_MONTHS = 3;
/** Gnosis offered at a rite of raising: 100 to reach levels 2-4, 200 to reach level 5 (as Caern Building, W20 p. 210). */
export const riseCost = level => (int(level) >= 4 ? 200 : 100);

/**
 * Hold the Moot Rite. `gifts` = [{id, gnosis}] the Gnosis each participant gives (no more than they have).
 * @returns {{ok, caern, given, need, full, takes:[{id, give}], lines}}
 */
export function holdMoot(caern, gifts = [], now = 0) {
  const c = normCaern(caern);
  if ( !alive(c) ) return {ok: false, why: `The caern is ${STATUS[c.status].toLowerCase()}: no moot can open there.`};
  if ( !c.level ) return {ok: false, why: "The caern has no level left."};
  const need = mootNeed(c.level);
  let left = need;
  const takes = [];
  for ( const g of gifts ) {
    const give = Math.min(Math.max(0, int(g.gnosis)), left);
    if ( give ) takes.push({id: g.id, give});
    left -= give;
  }
  const given = need - left, full = given >= need, lines = [];
  const wasLapsed = c.status === "lapsed";
  const streak = full ? c.streak + 1 : 0;
  const ready = c.ready || (full && streak >= RISE_MOOTS && c.level < 5);
  if ( wasLapsed ) lines.push("The Moot Rite is kept again and the caern is consecrated once more.");
  lines.push(full ? `The howl fills the caern: ${given} Gnosis, all it holds.` : `Only ${given} of ${need} Gnosis was given: the caern is consecrated but not full.`);
  if ( ready && !c.ready ) lines.push(`A year of full moots: the caern is ready to grow, with a rite and ${riseCost(c.level)} Gnosis offered.`);
  return {ok: true, caern: {...c, status: "held", charge: given, lastMoot: num(now), missed: 0, streak, ready}, given, need, full, takes, lines, wasLapsed};
}

/** Raise the caern a level with the rite and the offering (house rule, B3472). */
export function raiseCaern(caern, offered = 0) {
  const c = normCaern(caern);
  if ( !alive(c) ) return {ok: false, why: `The caern is ${STATUS[c.status].toLowerCase()}.`};
  if ( c.level >= 5 ) return {ok: false, why: "The caern is already level 5."};
  if ( !c.ready ) return {ok: false, why: `The caern needs ${RISE_MOOTS} full moots in a row first (${c.streak} so far).`};
  const cost = riseCost(c.level);
  if ( int(offered) < cost ) return {ok: false, why: `The rite needs ${cost} Gnosis; ${int(offered)} was offered.`};
  return {ok: true, caern: {...c, level: c.level + 1, ready: false, streak: 0, charge: 0}, cost};
}

/* ------------------------------------------------------------------ */
/*  Opening the caern                                                    */
/* ------------------------------------------------------------------ */

/** The Rite of the Opened Caern, rolled out turn by turn. */
export function openCaern(caern, {wits = 0, rituals = 0, gnosis = 1, willpower = 1} = {}, rand = Math.random) {
  const c = normCaern(caern);
  if ( !alive(c) || !c.level ) return {ok: false, why: "Only a living caern can be opened."};
  const need = c.level, spiritNeed = Math.max(1, int(willpower)), diffSpirit = clamp(int(gnosis) || 1, 2, 10);
  let mine = 0, spirit = 0, turns = 0, botch = false;
  while ( mine < need && spirit < spiritNeed && turns < 30 ) {
    turns++;
    const s = successes(int(wits) + int(rituals), 7, rand);
    if ( s < 0 && mine === 0 ) { botch = true; break; }
    mine = Math.max(0, mine + s);
    spirit = Math.max(0, spirit + successes(c.level, diffSpirit, rand));
  }
  const won = !botch && mine >= need;
  const t = CAERN_TYPES[c.type];
  return {ok: true, won, botch, turns, gain: won ? c.level : 0, power: t.power, trait: t.gain ?? null,
    line: won ? `The caern opens: ${c.level} ${t.power} for the scene.` : botch ? "The caern spirit throws the ritemaster back: a botch." : "The caern spirit holds its power back."};
}

/* ------------------------------------------------------------------ */
/*  Raids                                                                */
/* ------------------------------------------------------------------ */

/** Chance each month of a Wyrm raid and of the Weaver pressing in, by year (house rule, B3473). */
export const RAID_ODDS = [
  {to: 1499, wyrm: 0.03, weaver: 0.01, label: "before 1500"},
  {to: 1799, wyrm: 0.04, weaver: 0.03, label: "1500 to 1799"},
  {to: 1945, wyrm: 0.06, weaver: 0.06, label: "1800 to 1945"},
  {to: 2022, wyrm: 0.08, weaver: 0.07, label: "1946 to 2022"},
  {to: Infinity, wyrm: 0.10, weaver: 0.09, label: "after 2022"}
];
export const raidOddsFor = year => RAID_ODDS.find(r => num(year) <= r.to) ?? RAID_ODDS[RAID_ODDS.length - 1];
/** A raid not met by the Storyteller within this many days settles itself. */
export const RAID_GRACE_DAYS = 7;

export const RAID_KINDS = {
  wyrm: ["Banes boil out of a polluted spring", "fomori from a Pentex plant probe the bawn", "Black Spiral Dancers come at the new moon", "a corrupted spirit pack harries the bridge", "a cult digs at the heart stone"],
  weaver: ["a road is surveyed through the bawn", "a quarry opens on the ridge", "the town builds out to the treeline", "Pattern Spiders spin across the Gauntlet", "a railway cutting slices the land"]
};

/** The month's odds for this caern: a lapsed one draws the Wyrm twice as often, an urban one the Weaver. */
export function raidChance(caern, year) {
  const c = normCaern(caern), o = raidOddsFor(year);
  return {wyrm: Math.min(0.9, o.wyrm * (c.status === "lapsed" ? 2 : 1)), weaver: Math.min(0.9, o.weaver * (c.urban ? 2 : 1))};
}

/** Roll for a raid this month. */
export function rollRaid(caern, year, now = 0, rand = Math.random) {
  const c = normCaern(caern);
  if ( !alive(c) || !c.raids || c.raid ) return null;
  const ch = raidChance(c, year), r = rand();
  const foe = r < ch.wyrm ? "wyrm" : r < ch.wyrm + ch.weaver ? "weaver" : null;
  if ( !foe ) return null;
  const strength = clamp(1 + Math.floor(rand() * 5), 1, 5), list = RAID_KINDS[foe];
  return {foe, strength, at: num(now), what: list[Math.floor(rand() * list.length) % list.length]};
}

/** The sept's defence pool: its Garou, the Warder and the Gatekeeper, and the caern's own spirits. */
export function defencePool(caern) {
  const c = normCaern(caern);
  return clamp(Math.ceil(c.garou / 2) + (c.offices.warder ? 2 : 0) + (c.offices.gatekeeper ? 1 : 0) + c.level, 1, 20);
}

/**
 * Settle a raid: the sept's pool against twice the raid's strength, both at 6. `bonus` adds dice for what the
 * players did. Lost to the Wyrm: a level, and the caern is taken at 0 or when the raid outdid the sept by 3. Lost to
 * the Weaver: a level, and the caern calcifies at 0.
 */
export function settleRaid(caern, {bonus = 0, outcome = null} = {}, rand = Math.random) {
  const c = normCaern(caern);
  if ( !c.raid ) return {ok: false, why: "No raid is waiting."};
  const raid = c.raid;
  const us = outcome === null ? successes(defencePool(c) + int(bonus), 6, rand) : outcome === "held" ? 1 : 0;
  const them = outcome === null ? successes(raid.strength * 2, 6, rand) : outcome === "held" ? 0 : outcome === "overrun" ? 3 : 1;
  const lines = [];
  let next = {...c, raid: null}, drift = null;
  if ( us >= them ) {
    lines.push(`The sept holds the caern against ${raid.what}.`);
  } else {
    next.level = Math.max(0, c.level - 1);
    next.charge = Math.min(next.charge, mootNeed(next.level));
    drift = raid.foe === "wyrm" ? "taint" : "weaver";
    if ( raid.foe === "wyrm" && (next.level === 0 || them - us >= 3) ) {
      next.status = "wyrm";
      lines.push(`The sept is driven off: ${raid.what}, and the caern falls to the Wyrm.`);
    } else if ( raid.foe === "weaver" && next.level === 0 ) {
      next.status = "calcified";
      lines.push(`${up(raid.what)}: the Weaver's webs close over the caern and it calcifies.`);
    } else {
      lines.push(`${up(raid.what)}: the caern is hurt and falls to level ${next.level}.`);
    }
  }
  return {ok: true, caern: next, us, them, won: us >= them, drift, lines};
}

/* ------------------------------------------------------------------ */
/*  Caern wars and taking a caern back                                   */
/* ------------------------------------------------------------------ */

/**
 * A caern war: another sept comes to take it. Each side rolls half its Garou plus its best rank, at 6.
 * The winner holds the caern; a taken caern changes sept, its offices fall empty, and it loses a level for the blood
 * on the bawn (house rule, B3474).
 */
export function caernWar(caern, {sept = "", garou = 0, rank = 0, bonus = 0, defRank = 0} = {}, rand = Math.random) {
  const c = normCaern(caern);
  if ( !alive(c) ) return {ok: false, why: `The caern is ${STATUS[c.status].toLowerCase()}.`};
  const them = successes(Math.ceil(int(garou) / 2) + int(rank), 6, rand);
  const us = successes(defencePool(c) - c.level + int(defRank) + int(bonus), 6, rand);
  if ( us >= them ) return {ok: true, won: false, us, them, caern: c, lines: [`${c.sept || "The sept"} holds the caern against ${sept || "the challengers"}.`]};
  const level = Math.max(1, c.level - 1);
  return {ok: true, won: true, us, them, lines: [`${sept || "The challengers"} take the caern from ${c.sept || "its sept"}; it falls to level ${level}.`],
    caern: {...c, sept: str(sept || "The new sept", 120), garou: clamp(int(garou), 0, 500), offices: {}, level, charge: 0, streak: 0, ready: false}};
}

/** Take back a caern lost to the Wyrm or the Weaver: the sept's Garou against the hold, at 7 (house rule, B3475). */
export function reclaim(caern, {garou = 0, rank = 0, bonus = 0} = {}, rand = Math.random) {
  const c = normCaern(caern);
  if ( c.status !== "wyrm" && c.status !== "calcified" ) return {ok: false, why: "Only a caern lost to the Wyrm or the Weaver can be taken back."};
  const us = successes(Math.ceil(int(garou) / 2) + int(rank) + int(bonus), 7, rand), need = 3;
  if ( us < need ) return {ok: true, won: false, us, need, caern: c, lines: [`The attempt to take back the caern fails (${Math.max(0, us)} of ${need}).`]};
  return {ok: true, won: true, us, need, caern: {...c, status: "lapsed", level: 1, charge: 0, missed: 0, streak: 0, ready: false, lastMoot: null},
    lines: ["The caern is taken back, cleansed to level 1; the Moot Rite must be held to consecrate it."]};
}

/* ------------------------------------------------------------------ */
/*  The clock                                                            */
/* ------------------------------------------------------------------ */

/**
 * What a month and more does to a caern: moots missed, a lapse, levels lost, a raid rolled, a raid settling itself.
 * @returns {{caern, lines: string[], drift: string[], died: boolean}}
 */
export function caernTime(caern, now, {year = 2000, rand = Math.random} = {}) {
  let c = normCaern(caern);
  const lines = [], drift = [];
  if ( !alive(c) ) return {caern: c, lines, drift, died: false};
  if ( c.lastMoot === null ) c.lastMoot = num(now);
  if ( c.lastRaidCheck === null ) c.lastRaidCheck = num(now);
  // Missed moots
  const months = Math.floor((num(now) - c.lastMoot) / MONTH);
  if ( months > c.missed ) {
    const add = months - c.missed;
    if ( c.status === "held" ) { c.status = "lapsed"; drift.push("neglect"); lines.push(`No Moot Rite for a month: ${c.sept || "the sept"} lets the caern lapse and the Gauntlet thickens.`); }
    c.missed = months; c.streak = 0; c.charge = 0;
    const lost = Math.floor(months / LAPSE_MONTHS) - Math.floor((months - add) / LAPSE_MONTHS);
    if ( lost > 0 ) {
      c.level = Math.max(0, c.level - lost);
      if ( c.level === 0 ) { c.status = "dead"; lines.push("Too long without its moots, the caern spirit leaves and the caern dies."); }
      else lines.push(`Untended for ${months} months, the caern sinks to level ${c.level}.`);
    }
  }
  // A raid that waited too long settles itself
  if ( c.raid && num(now) - c.raid.at >= RAID_GRACE_DAYS * DAY && alive(c) ) {
    const s = settleRaid(c, {}, rand);
    c = s.caern; lines.push(`Left to itself, the raid is settled: ${s.lines.join(" ")}`);
    if ( s.drift ) drift.push(s.drift);
  }
  // A new raid, once a month
  while ( alive(c) && num(now) - c.lastRaidCheck >= MONTH ) {
    c.lastRaidCheck += MONTH;
    const r = rollRaid(c, year, c.lastRaidCheck, rand);
    if ( r ) { c.raid = r; lines.push(`Raid on the caern (${r.foe === "wyrm" ? "the Wyrm" : "the Weaver"}, strength ${r.strength}): ${r.what}. Meet it within ${RAID_GRACE_DAYS} days or it settles itself.`); break; }
  }
  if ( !alive(c) ) c.lastRaidCheck = num(now);
  return {caern: c, lines, drift, died: c.status === "dead"};
}

export function describeCaern(caern, {year = 2000} = {}) {
  const c = normCaern(caern), t = CAERN_TYPES[c.type];
  const head = `${c.name ?? "Caern"}: caern of ${t.label}, level ${c.level}`;
  if ( !alive(c) ) return `${head}; ${STATUS[c.status].toLowerCase()}.`;
  return `${head}${c.totem ? `, totem ${c.totem}` : ""}; ${c.sept || "no sept"}${c.garou ? ` (${c.garou} Garou)` : ""}; ${STATUS[c.status].toLowerCase()}; `
    + `Gnosis ${c.charge}/${mootNeed(c.level)}; Gauntlet ${gauntletFor(c.level)}; Moon Bridges to ${bridgeMiles(c.level).toLocaleString("en")} miles`
    + `${c.raid ? `; RAID: ${c.raid.what}` : ""}${c.ready ? "; ready to grow" : ""}.`;
}
