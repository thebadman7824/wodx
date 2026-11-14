/**
 * WoDX NPC 0.46.0 (B2500 to B2504): the residents of a generated town. The town and village generators
 * (tools/mapgen/ddtown.py, ddsite.py) write each building's household as roles only; WoDX Interactables keeps the
 * household on the building's region when the map is adopted. Here each role becomes a planned NPC: a routine with
 * the building as home (and as workplace for a trade kept at home), a template, and a name that fits the household.
 * No Foundry calls, so the harness can test it; residents.mjs makes the sheets.
 *
 * The routines follow the year through routine-rules (medieval hours to the modern week), and the names through
 * WoDX Creation's People generator (the era and homeland in play), so a household seeded in 1197 and one seeded in
 * 1995 differ without anything set here. House readings (PENDING-REVIEW): which trades work at home, the routine
 * each role keeps, a partner being of the other sex nine times in ten, and the family names a household shares.
 */
import {PRESETS, originFaith} from "./routine-rules.mjs";
import {faithFor} from "../../wodx-chronicle/scripts/faith-rules.mjs";
import {FEMININE, FAMILY_FIRST} from "../../wodx-creation/data/people-world.mjs";
import {CLAN} from "../../wodx-creation/data/people-haudenosaunee.mjs";

/** "Son of" and "daughter of" a father's name: Hebrew ben and bat, Arabic ibn and bint, Malay and Swahili bin and binti. */
const CHILD = /^(ben|bat|ibn|bint|bin|binti) /;
const CHILD_WORDS = {ben: ["ben", "bat"], bat: ["ben", "bat"], ibn: ["ibn", "bint"], bint: ["ibn", "bint"], bin: ["bin", "binti"], binti: ["bin", "binti"]};
const childWord = (name, sex) => (CHILD_WORDS[CHILD.exec(String(name ?? ""))?.[1]] ?? CHILD_WORDS.ben)[sex === "female" ? 1 : 0];

const IX = "wodx-interactables", NPC = "wodx-npc";

/**
 * The record a region keeps of its seeded residents, with one more household added. before: the region's record or
 * null; returns {actors (everyone seeded there), houses: [{id, actors}], ownerSet, at}. A list, not a map, since a
 * household id may hold a full stop.
 */
export function residentRecord(before, householdId, actorIds, {ownerSet = false, at = 0} = {}) {
  const houses = (Array.isArray(before?.houses) ? before.houses : []).filter(x => x.id !== householdId);
  houses.push({id: householdId, actors: [...actorIds]});
  const hidden = before?.hidden ? {hidden: before.hidden} : {};
  return {actors: [...new Set([...(Array.isArray(before?.actors) ? before.actors : []), ...actorIds])], houses, ownerSet: !!(before?.ownerSet || ownerSet), at, ...hidden};
}

/* ------------------------------------------------------------------ */
/*  Reading the map                                                    */
/* ------------------------------------------------------------------ */

/**
 * The households kept on a scene's regions. regions: [{uuid, name, flags}] (plain data or documents).
 * Returns [{region, regionName, kind, owner, shared, household, seeded}] in the map's order; shared is how many
 * households the building holds, and seeded lists the actor ids an earlier seeding made for this household.
 */
export function householdsOn(regions = []) {
  const out = [];
  for ( const r of regions ) {
    // 0.48.0: a block of flats keeps every flat's household (Interactables 0.35.2); other buildings keep one
    const many = Array.isArray(r?.flags?.[IX]?.households) && r.flags[IX].households.length > 1 ? r.flags[IX].households : null;
    const all = (many ?? [r?.flags?.[IX]?.household]).filter(hh => hh && Array.isArray(hh.people) && hh.people.length);
    const place = r?.flags?.[NPC]?.place ?? {};
    const rec = r?.flags?.[NPC]?.residents;
    for ( const hh of all ) {
      const id = String(hh.id ?? r.uuid);
      const mine = Array.isArray(rec?.houses) ? rec.houses.find(x => x.id === id)?.actors : null;
      out.push({region: r.uuid, regionName: String(r.name ?? hh.label ?? ""), kind: place.kind ?? "home", owner: place.owner ?? "", shared: all.length,
        household: {id, label: String(hh.label ?? r.name ?? "A household"), trade: String(hh.trade ?? ""), people: hh.people.map(p => ({role: String(p.role ?? "").trim()})).filter(p => p.role)},
        seeded: mine ?? (all.length === 1 && Array.isArray(rec?.actors) ? rec.actors : [])});
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Who each role is                                                   */
/* ------------------------------------------------------------------ */

/** Trades that work in the house they live in (a cottage craft, a farm). Any building tagged as a workplace counts too. */
const AT_HOME = /smith|potter|weaver|spinner|cobbler|shoemaker|dyer|tanner|cooper|turner|basket|wheelwright|butcher|baker|brewer|miller|tailor|seamstress|carpenter|joiner|chandler|glazier|saddler|farmer|cottager|alehouse|innkeeper|tavern|shopkeeper|spicer|merchant|grocer|apothecary|barber|priest|parson|rabbi|craft|mason/i;
const WORK_KINDS = new Set(["workplace", "tavern", "market", "yard", "castle", "church", "mosque", "synagogue", "temple", "hospital", "station", "docks"]);

/** Clergy of every faith (0.51.0, B2672): the words a household's trade or role may use for them. */
const CLERGY_WORDS = /priest|chaplain|parson|vicar|monk|friar|nun|rabbi|curate|imam|mullah|muezzin|qadi|mufti|dervish|sheikh of the|lama|bhikkhu|abbot|abbess|brahmin|pujari|diviner|shaman|kannushi|daoist|taoist|temple keeper|keeper of the old ways|marabout|cantor|hazzan/;

/**
 * What the clergy of each faith are called (0.51.0, B2672; house reading): the town generator writes Moravia's
 * words, and a house of worship in another land takes its own. [priest, monk or nun, the one who calls or sings].
 */
export const CLERGY = {
  western: ["priest", "monk", "sexton"], orthodox: ["priest of the Eastern church", "monk", "reader"],
  islamic: ["imam", "dervish", "muezzin"], jewish: ["rabbi", "student of the law", "cantor"],
  hindu: ["temple priest", "holy ascetic", "temple drummer"], theravada: ["monk", "novice monk", "temple attendant"],
  tibetan: ["lama", "monk", "temple attendant"], chinese: ["temple keeper", "Buddhist monk", "temple attendant"],
  own: ["keeper of the old ways", "diviner", "drummer"]
};
const CLERIC_SLOT = [[/priest|parson|vicar|curate|chaplain|pastor|minister|rabbi|imam|lama|temple keeper/, 0], [/monk|friar|nun|abbot|abbess|prior/, 1], [/sexton|cantor|reader|muezzin|clerk|bell/, 2]];
/**
 * A clergy trade in the words of the faith a place keeps: "priest" at a mosque in Cairo is the imam, "monk" in Lhasa
 * a monk still. Other trades, and clergy of the place's own faith, come back as they were.
 */
export function localClergy(trade, faith) {
  const t = String(trade ?? ""), low = t.toLowerCase(), words = CLERGY[faith];
  if ( !words || faith === "western" || !(CLERGY_WORDS.test(low) || /sexton|bell-ringer/.test(low)) ) return t;
  if ( /\bnun\b|abbess/.test(low) && ["theravada", "tibetan", "chinese"].includes(faith) ) return "nun";
  if ( Object.values(CLERGY).find(w => w.includes(low)) === words ) return t;
  if ( /rabbi|cantor/.test(low) && faith !== "jewish" ) return t; // a synagogue keeps its own in any land
  const slot = CLERIC_SLOT.find(([re]) => re.test(low))?.[1];
  return slot === undefined ? t : words[slot];
}

/** The ready routine for a trade. Every key is one routine-rules (or mortal-rules) already has. */
export function presetForTrade(trade = "") {
  const t = String(trade).toLowerCase();
  if ( CLERGY_WORDS.test(t) ) return "priest";
  if ( /innkeeper|tavern|alehouse|publican|landlord|barkeep|bartender/.test(t) ) return "innkeeper";
  if ( /merchant|trader|chandler|draper|mercer|grocer|shopkeeper|spicer|pedlar|stallholder|apothecary/.test(t) ) return "merchant";
  if ( /guard|watch|sergeant|constable|bailiff|police|gendarme/.test(t) ) return "day-watch";
  if ( /nurse|orderly|warder/.test(t) ) return "orderly";
  if ( /physician|doctor|surgeon|barber/.test(t) ) return "physician";
  if ( /journalist|reporter/.test(t) ) return "journalist";
  if ( /pensioner|retired|widow/.test(t) && !/spinner/.test(t) ) return "recluse";
  if ( /^student|schoolchild|pupil/.test(t) ) return "child";
  return "labourer";
}

/** The household's kin: they share the master's family name. Everyone else keeps their own. */
export const KIN = new Set(["partner", "child", "elder", "household"]);

/** A role's plain label for the sheet's concept and the preview: "the smith", "the smith's child". */
export function roleLabel(role, trade) {
  const r = String(role || "").toLowerCase(), t = String(trade || "").toLowerCase();
  if ( !t || r === t ) return r || "resident";
  if ( r === "household" ) return `of the ${t}'s household`;
  if ( ["partner", "child", "elder", "apprentice", "servant", "farmhand", "lodger", "clerk"].includes(r) ) return `the ${t}'s ${r}`;
  return r;
}

/**
 * The plan for one role in a household. h: {region, kind, household: {trade, people}}; i: the person's index; year.
 * Returns {role, label, master, kin, trade, template, preset, roles}: roles maps routine roles to place ids.
 */
export function planRole(h, i, {year = 0, land = null} = {}) {
  const {household: hh, region, kind} = h;
  // 0.51.0: a house of worship of the land's faith (or one tagged mosque or temple) names its clergy that faith's way
  const faith = land ? (kind === "mosque" ? "islamic" : kind === "synagogue" ? "jewish" : land) : null;
  const local = x => faith ? localClergy(x, faith) : x;
  const role = local(hh.people[i]?.role ?? "resident");
  const trade = local(hh.trade || hh.people[0]?.role || "");
  const r = role.toLowerCase();
  const master = i === 0 && !["staff", "household"].includes(r);
  const atHome = WORK_KINDS.has(kind) || AT_HOME.test(trade);
  const roles = {home: region};
  let preset = "labourer", template = "civilian";
  if ( master || r === "owner" ) {
    preset = presetForTrade(trade);
    if ( atHome ) roles.work = region;
  } else if ( r === "partner" || r === "household" ) {
    // A partner keeps the house's trade with the master when it is kept at home, else goes out to work
    preset = atHome && ["innkeeper", "merchant"].includes(presetForTrade(trade)) ? presetForTrade(trade) : "labourer";
    if ( atHome ) roles.work = region;
  } else if ( r === "child" ) { preset = "child"; template = "child"; }
  else if ( r === "elder" || r === "pensioner" ) preset = "recluse";
  else if ( r === "servant" ) { preset = "servant"; template = "servant"; }
  else if ( ["apprentice", "farmhand", "journeyman"].includes(r) ) { preset = "labourer"; roles.work = region; }
  else if ( r === "staff" ) { preset = presetForTrade(trade); delete roles.home; roles.work = region; }
  else if ( r === "clerk" && /priest|rabbi|parson|imam|lama/.test(trade.toLowerCase()) ) preset = "labourer";
  else preset = presetForTrade(role);
  if ( preset === "priest" && ["church", "mosque", "synagogue", "temple"].includes(kind) ) roles.church = region;
  if ( preset === "innkeeper" && kind === "tavern" ) roles.tavern = region;
  if ( !PRESETS[preset] ) preset = "labourer";
  const ageOk = PRESETS[preset];
  if ( Number(year) && ((ageOk.from && year < ageOk.from) || (ageOk.to && year > ageOk.to)) ) preset = "labourer";
  return {role, label: roleLabel(role, trade), master, kin: KIN.has(r), trade, template, preset, roles};
}

/** The plans for a whole household, in its order. */
export const planHousehold = (h, opts = {}) => h.household.people.map((p, i) => planRole(h, i, opts));

/* ------------------------------------------------------------------ */
/*  Names in a household                                               */
/* ------------------------------------------------------------------ */

/**
 * A Czech or Slovak family name or byname in its feminine form (house reading of the usual endings): -ý to -á,
 * -í and -a to -ová, -ek to -ková, -ec to -cová, otherwise -ová. "z Plzně" (of a place) stays as it is.
 */
export function czechFeminine(name = "") {
  const n = String(name).trim();
  if ( !n || /^z(e)? /.test(n) || /(ová|á)$/.test(n) ) return n;
  if ( n.endsWith("ý") ) return `${n.slice(0, -1)}á`;
  if ( n.endsWith("í") || n.endsWith("a") || n.endsWith("e") || n.endsWith("ě") ) return `${n.slice(0, -1)}ová`;
  if ( n.endsWith("ek") ) return `${n.slice(0, -2)}ková`;
  if ( n.endsWith("ec") ) return `${n.slice(0, -2)}cová`;
  return `${n}ová`;
}
/** A German medieval byname for a woman: "der Lange" to "die Lange", "der Schmied" to "die Schmiedin". */
export function germanFeminine(name = "") {
  const n = String(name).trim();
  const m = /^der (.+)$/.exec(n);
  if ( !m ) return n;
  return /e$/.test(m[1]) ? `die ${m[1]}` : `die ${m[1]}in`;
}

/**
 * The family name one member of a household takes. house: {family (the male form), origin, masterGiven, masterSex};
 * p: the drawn person {sex, origin, given, family}. Kin of a Jewish household in the Middle Ages are ben or bat the
 * master's name when the master is a man; others keep their own byname.
 */
export function kinFamily(house, p) {
  const origin = house.origin ?? p.origin;
  // A clan passes from the mother (the Haudenosaunee, B3120): grown people keep their own, children take the mother's
  if ( CLAN.test(String(house.family ?? "")) || CLAN.test(String(p.family ?? "")) ) return house.motherClan ?? p.family;
  if ( CHILD.test(String(house.family ?? "")) || CHILD.test(String(p.family ?? "")) ) {
    return house.masterSex === "male" && house.masterGiven ? `${childWord(CHILD.test(String(house.family ?? "")) ? house.family : p.family, p.nameForm ?? p.sex)} ${house.masterGiven}` : p.family;
  }
  if ( !house.family ) return p.family;
  if ( ["czech", "slovak"].includes(origin) ) return (p.nameForm ?? p.sex) === "female" ? czechFeminine(house.family) : house.family;
  if ( origin === "german" ) return (p.nameForm ?? p.sex) === "female" ? germanFeminine(house.family) : house.family;
  // Other peoples whose family names follow sex (Russian, Polish, Greek, Irish, old Norse): the listed feminine form
  if ( (p.nameForm ?? p.sex) === "female" && FEMININE[origin]?.[house.family] ) return FEMININE[origin][house.family];
  return house.family;
}

/**
 * Name a household's people. plans: planHousehold(); draw(index, {sex, trade}) returns a People generator person
 * ({sex, origin, given, family, name, ...}); index HOUSE_ROW is the household's own draw. rand: a seeded number
 * source for the partner's sex. The household's family name comes from a man's draw, so its male form is known and
 * each member takes the form for their sex; a partner is of the other sex nine times in ten (house reading).
 * Returns the people in order, each the drawn person with name and family set, plus its plan.
 */
export const HOUSE_ROW = 31;
/** Rows a retry steps by, so a retried draw never lands on another member's row. */
export const RETRY_STEP = 100, RETRIES = 8;

/**
 * What a role asks of the person who fills it. Before 0.51.0 a house reading of the church in Moravia; now of every
 * faith (B2672): a person keeps the faith their origin points to (routine-rules originFaith), else the land's
 * (faithFor of the region). Christian clergy are Christian, an imam, muezzin or dervish Muslim, a rabbi or cantor
 * Jewish, a lama or monk of a Buddhist land Buddhist, a temple priest Hindu. Priests, monks, imams and lamas are men,
 * as are rabbis until 1990; nuns are women. Protestant churches ordained women only in the twentieth century, so
 * from 1950 a parson or vicar may be either. Returns {sex: "male"|"female"|null, origin: (origin) => boolean}.
 */
const BUDDHIST = new Set(["theravada", "tibetan", "chinese"]);
export function wantsFor(trade = "", {year = 0, region = null, land = null} = {}) {
  const t = String(trade).toLowerCase(), y = Number(year) || 0;
  land ??= region ? faithFor(region, y || 1197) : "western";
  const faithOf = o => originFaith(o) ?? (o === "jewish" ? "jewish" : land);
  const keeps = test => o => test(faithOf(o ?? ""));
  const christian = keeps(f => f === "western" || f === "orthodox");
  if ( /rabbi|cantor|hazzan/.test(t) ) return {sex: y >= 1990 ? null : "male", origin: o => o === "jewish"};
  if ( /imam|mullah|muezzin|qadi|mufti|dervish|marabout/.test(t) ) return {sex: "male", origin: keeps(f => f === "islamic")};
  if ( /lama|bhikkhu|buddhist monk|novice monk/.test(t) || (/\bmonk\b/.test(t) && BUDDHIST.has(land)) ) return {sex: "male", origin: keeps(f => BUDDHIST.has(f))};
  if ( /temple priest|brahmin|pujari|holy ascetic/.test(t) ) return {sex: "male", origin: keeps(f => f === "hindu")};
  if ( /\bnun\b|abbess|prioress/.test(t) ) return {sex: "female", origin: BUDDHIST.has(land) ? keeps(f => BUDDHIST.has(f)) : christian};
  if ( /parson|vicar|pastor|minister/.test(t) ) return {sex: y >= 1950 ? null : "male", origin: christian};
  if ( /priest|chaplain|monk|friar|curate|canon|deacon|abbot|prior/.test(t) ) return {sex: "male", origin: christian};
  return {sex: null, origin: () => true};
}
const fits = (p, want) => !!p && (!want.sex || p.sex === want.sex) && want.origin(p.origin ?? "");
/** Draw until the person fits what the role asks, stepping rows; the last draw stands when none fits. */
export function drawFit(draw, i, opts, want) {
  let p = null;
  for ( let k = 0; k < RETRIES; k++ ) {
    p = draw(i + k * RETRY_STEP, {...opts, sex: want.sex ?? opts.sex});
    if ( fits(p, want) ) return p;
  }
  return p;
}

export function nameHousehold(plans, draw, rand = Math.random, {year = 0, region = null, land = null} = {}) {
  if ( !plans.length ) return [];
  const trade0 = plans[0].trade || plans[0].role;
  const want = plans[0].master ? wantsFor(trade0, {year, region, land}) : {sex: null, origin: () => true};
  const first = drawFit(draw, 0, {sex: "any", trade: trade0}, want);
  // The household's name is drawn from a man of the master's own origin, so a Czech master never heads a ben-or-bat household
  const fam = drawFit(draw, HOUSE_ROW, {sex: "male", trade: trade0}, {sex: "male", origin: o => !first.origin || o === first.origin}) ?? {};
  const house = {family: fam.family ?? first.family ?? "", origin: fam.origin ?? first.origin, masterGiven: first.given, masterSex: first.sex};
  // A medieval Jewish household is named for the master's father; the master is ben or bat him
  if ( CHILD.test(house.family) ) house.family = `${childWord(house.family, first.sex)} ${house.family.replace(CHILD, "")}`;
  const out = [];
  plans.forEach((plan, i) => {
    let p = first;
    if ( i > 0 ) {
      const sex = plan.role === "partner" ? (rand() < 0.9 ? (first.sex === "female" ? "male" : "female") : first.sex) : "any";
      // Kin of a Jewish household are Jewish, and kin of a Christian one are not (house reading of the Middle Ages to 1945)
      const sameFaith = o => !first.origin || !o || (o === "jewish") === (first.origin === "jewish") || (Number(year) >= 1946);
      // Before 1946 kin of a Jewish household are asked for by origin, since the generator draws few Jewish people
      const asked = plan.kin && Number(year) < 1946 && first.origin === "jewish" ? {origin: "jewish"} : {};
      p = plan.kin ? drawFit(draw, i, {sex, trade: plan.label, ...asked}, {sex: null, origin: sameFaith}) : draw(i, {sex, trade: plan.role});
    }
    let family = p.family;
    // In a clan household the master and the partner keep their own clans; the woman's clan is the children's
    if ( CLAN.test(String(p.family ?? "")) && (i === 0 || plan.role === "partner" || !plan.kin) ) {
      if ( p.sex === "female" && (i === 0 || !house.motherClan) ) house.motherClan = p.family;
      out.push({...p, family, name: [p.given, family].filter(Boolean).join(" ") || p.name || plan.label, plan});
      return;
    }
    if ( i === 0 ) family = CHILD.test(house.family) ? house.family : kinFamily({...house, masterGiven: null}, p);
    else if ( plan.kin && plan.role !== "partner" ) family = kinFamily(house, p);
    else if ( plan.kin ) family = CHILD.test(house.family) ? p.family : kinFamily({...house, masterGiven: null}, p);
    out.push({...p, family, name: (FAMILY_FIRST.has(p.origin) ? [family, p.given] : [p.given, family]).filter(Boolean).join(" ") || p.name || plan.label, plan});
  });
  return out;
}

/* ------------------------------------------------------------------ */
/*  The flags each resident gets                                       */
/* ------------------------------------------------------------------ */

/**
 * What WoDX NPC keeps on a resident's actor. person: from nameHousehold; h: the household entry; scene: its uuid.
 * behaviour: the template and household (so the household answers a cry); routine: on, its preset and places.
 */
export function residentFlags(person, h, scene) {
  const {plan} = person;
  return {
    behavior: {template: plan.template, household: h.household.label.slice(0, 60)},
    routine: {on: true, mode: null, preset: plan.preset, age: null, roles: {...plan.roles}, blocks: null},
    resident: {scene, region: h.region, household: h.household.id, role: plan.role, master: plan.master,
      // NPC 0.49.0 (B2572): a household whose origin keeps another faith than the land's (a Jewish family in Brno)
      ...(originFaith(person.origin) ? {faith: originFaith(person.origin)} : {})}
  };
}

/** How many people a seeding would make: the households not yet seeded, or all of them. */
export const countPeople = (list, {again = false} = {}) => list.filter(h => again || !h.seeded.length).reduce((s, h) => s + h.household.people.length, 0);

/** Above this many people at once the Storyteller is warned (each is a sheet in the Actors list). */
export const LARGE = 60;
