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
import {PRESETS} from "./routine-rules.mjs";

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
    // 0.48.0: a block of flats keeps every flat's household (Interactables 0.35.1); other buildings keep one
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
const WORK_KINDS = new Set(["workplace", "tavern", "market", "yard", "castle", "church", "hospital", "station", "docks"]);

/** The ready routine for a trade. Every key is one routine-rules (or mortal-rules) already has. */
export function presetForTrade(trade = "") {
  const t = String(trade).toLowerCase();
  if ( /priest|chaplain|parson|vicar|monk|friar|nun|rabbi|curate/.test(t) ) return "priest";
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
export function planRole(h, i, {year = 0} = {}) {
  const {household: hh, region, kind} = h;
  const role = hh.people[i]?.role ?? "resident";
  const trade = hh.trade || hh.people[0]?.role || "";
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
  else if ( r === "clerk" && /priest|rabbi|parson/.test(trade.toLowerCase()) ) preset = "labourer";
  else preset = presetForTrade(role);
  if ( preset === "priest" && kind === "church" ) roles.church = region;
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
  if ( /^(ben|bat) /.test(String(house.family ?? "")) || /^(ben|bat) /.test(String(p.family ?? "")) ) {
    return house.masterSex === "male" && house.masterGiven ? `${p.sex === "female" ? "bat" : "ben"} ${house.masterGiven}` : p.family;
  }
  if ( !house.family ) return p.family;
  if ( ["czech", "slovak"].includes(origin) ) return p.sex === "female" ? czechFeminine(house.family) : house.family;
  if ( origin === "german" ) return p.sex === "female" ? germanFeminine(house.family) : house.family;
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
 * What a role asks of the person who fills it (house reading of the church in Moravia): Christian clergy are not
 * Jewish, and priests, monks and friars are men, as are rabbis, who are Jewish; nuns are women. Protestant churches
 * ordained women only in the twentieth century, so from 1950 a parson or vicar may be either. Returns
 * {sex: "male"|"female"|null, origin: (origin) => boolean}.
 */
export function wantsFor(trade = "", {year = 0} = {}) {
  const t = String(trade).toLowerCase(), y = Number(year) || 0;
  if ( /rabbi/.test(t) ) return {sex: y >= 1990 ? null : "male", origin: o => o === "jewish"};
  if ( /\bnun\b|abbess|prioress/.test(t) ) return {sex: "female", origin: o => o !== "jewish"};
  if ( /parson|vicar|pastor|minister/.test(t) ) return {sex: y >= 1950 ? null : "male", origin: o => o !== "jewish"};
  if ( /priest|chaplain|monk|friar|curate|canon|deacon|abbot|prior/.test(t) ) return {sex: "male", origin: o => o !== "jewish"};
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

export function nameHousehold(plans, draw, rand = Math.random, {year = 0} = {}) {
  if ( !plans.length ) return [];
  const trade0 = plans[0].trade || plans[0].role;
  const want = plans[0].master ? wantsFor(trade0, {year}) : {sex: null, origin: () => true};
  const first = drawFit(draw, 0, {sex: "any", trade: trade0}, want);
  // The household's name is drawn from a man of the master's own origin, so a Czech master never heads a ben-or-bat household
  const fam = drawFit(draw, HOUSE_ROW, {sex: "male", trade: trade0}, {sex: "male", origin: o => !first.origin || o === first.origin}) ?? {};
  const house = {family: fam.family ?? first.family ?? "", origin: fam.origin ?? first.origin, masterGiven: first.given, masterSex: first.sex};
  // A medieval Jewish household is named for the master's father; the master is ben or bat him
  if ( /^(ben|bat) /.test(house.family) ) house.family = `${first.sex === "female" ? "bat" : "ben"} ${house.family.replace(/^(ben|bat) /, "")}`;
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
    if ( i === 0 ) family = /^(ben|bat) /.test(house.family) ? house.family : kinFamily({...house, masterGiven: null}, p);
    else if ( plan.kin && plan.role !== "partner" ) family = kinFamily(house, p);
    else if ( plan.kin ) family = /^(ben|bat) /.test(house.family) ? p.family : kinFamily({...house, masterGiven: null}, p);
    out.push({...p, family, name: [p.given, family].filter(Boolean).join(" ") || p.name || plan.label, plan});
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
    resident: {scene, region: h.region, household: h.household.id, role: plan.role, master: plan.master}
  };
}

/** How many people a seeding would make: the households not yet seeded, or all of them. */
export const countPeople = (list, {again = false} = {}) => list.filter(h => again || !h.seeded.length).reduce((s, h) => s + h.household.people.length, 0);

/** Above this many people at once the Storyteller is warned (each is a sheet in the Actors list). */
export const LARGE = 60;
