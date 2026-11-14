/**
 * Places of power, the pure part (B3450-B3456). No Foundry in here.
 *
 * Mage Nodes and their Tass, chantries, and Changeling freeholds with their balefires, so that those two lines get the
 * same running loop as blood upkeep for Vampire and caerns for Werewolf.
 *
 *   Node       M20 pp. 320-321 (printed 319-320): the Background rating sets how much Quintessence wells up each week,
 *              half free for meditation and half as Tass. The Storyteller sets the weekly rate; the book suggests 2 a
 *              dot for an industrial-era game, 5 to 10 for high fantasy, 1 or 2 where magic is dying. WoDX picks the
 *              rate by year (house rule, B3451). The supply is finite: a drained Node must fill again, so untapped
 *              energy only builds up to a cap (B3452). Absorbing through the Avatar (p. 333 / 332): no more than the
 *              Avatar rating a turn without Prime 1, Tass needs Prime 3, and the Avatar rating caps what is held.
 *   Chantry    M20 pp. 309-310 (printed 308-309): a pooled Background; the pool sets the size; a member who quits or
 *              dies takes their points with them, and a fractured group loses all. The name follows the era (B3453).
 *   Freehold   C20 pp. 170, 312-314 (printed 169, 311-313): Holdings 1 to 5, Glamour equal to the rank for a night's
 *              dreaming by the balefire (capped by each sleeper's Glamour rating; an oathcircle splits it, at least 1
 *              each; a Glade gives only to the first sleeper). Reaving with Banality at 7; every two successes over the
 *              rank cost the freehold a rank; lost ranks come back one a month if the balefire rests, one a season if
 *              it is harvested every day. Swearing the oath invests Glamour equal to the rating; a destroyed freehold
 *              gives its keeper that much Banality. Untended freeholds in a dull place fade (house rule, B3454).
 *   Caern      W20 (caern-rules.mjs, B3470-B3476): the Garou kind on the same register.
 */
import * as C from "./caern-rules.mjs";

export const DAY = 86400;
export const WEEK = 7 * DAY;
export const MONTH = 30 * DAY;
export const SEASON = 91 * DAY;
export const LOG_CAP = 30;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const int = v => Math.round(num(v));
const str = (v, n = 120) => String(v ?? "").slice(0, n);

/* ------------------------------------------------------------------ */
/*  Nodes and Tass                                                     */
/* ------------------------------------------------------------------ */

/** Quintessence a week for each dot, by year (house rule B3451, from the book's range on M20 p. 320). */
export const NODE_RATES = [
  {to: 1449, perDot: 4, label: "the Mythic Age: wellsprings run full"},
  {to: 1699, perDot: 3, label: "the Renaissance and the Order of Reason's rise"},
  {to: 2022, perDot: 2, label: "the industrial and modern world (the book's suggestion)"},
  {to: Infinity, perDot: 1, label: "the World of Future Darkness: magic is dying"}
];
export function nodeRateFor(year) {
  const y = num(year);
  return NODE_RATES.find(r => y <= r.to) ?? NODE_RATES[NODE_RATES.length - 1];
}

/** Weeks of output a Node can hold before it stops building up (house rule B3452). */
export const NODE_CAP_WEEKS = 4;

/** Who holds the Node: mystic Nodes thin the Gauntlet, Technocratic ones thicken it (M20 p. 320). */
export const NODE_SIDES = {
  mystic: {label: "Mystic (a Tradition, a Craft, a shrine)", gauntlet: -1, note: "The Gauntlet thins around it."},
  tech: {label: "Technocratic (a Construct, a lab, a power plant)", gauntlet: 1, note: "The Gauntlet thickens around it, unless the Union works it with Dimensional Science."},
  wild: {label: "Unclaimed or wild", gauntlet: 0, note: "Nobody holds it yet: werewolves, spirits and rival mages may come looking."}
};

/** The caern level the book pairs with each Node rating (M20 p. 321). */
export const NODE_CAERN = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
export const caernOf = rating => NODE_CAERN[clamp(int(rating), 0, 10)];

/** What the Node is like at each rating, in brief (M20 p. 321, own words). */
export const NODE_LEVELS = ["", "a tiny place of small account", "a thin trickle of power", "a steady flow", "a strong pulse that leaves plenty of Tass",
  "a wellspring of plenty", "a refined Node, its energy worked by Prime", "a great force", "a rare place, thick with raw Prime",
  "one of the grandest holy places or refineries on Earth", "one of the rarest sites in the world, and a battlefield for whoever wants it"];

/** Resonance shapes Tass (M20 pp. 79-81, 320): example forms the Storyteller can pick or overwrite. */
export const TASS_FORMS = {
  water: {label: "Spring or well", form: "clear water that never stales"},
  battle: {label: "Battlefield", form: "ash, bone chips and rust-brown earth"},
  grove: {label: "Grove or garden", form: "berries, sap or leaves that stay green"},
  shrine: {label: "Shrine or church", form: "candle stubs, incense ash or holy water"},
  lab: {label: "Laboratory or works", form: "charge held in batteries and capacitors"},
  hearth: {label: "Home or tavern", form: "bread crusts, ale dregs, embers that stay warm"},
  grave: {label: "Graveyard", form: "grave dust and cold stones"},
  art: {label: "Theatre, studio or library", form: "ink, paint flakes, old ticket stubs"},
  other: {label: "Other", form: ""}
};

export function blankNode() {
  return {kind: "node", rating: 1, side: "mystic", resonance: "", tass: "water", tassForm: "", rate: null, store: {quint: 0, tass: 0}, last: null};
}
export function normNode(n = {}) {
  const b = blankNode();
  const rating = clamp(int(n.rating ?? b.rating), 1, 10);
  return {kind: "node", rating, side: NODE_SIDES[n.side] ? n.side : b.side, resonance: str(n.resonance, 200),
    tass: TASS_FORMS[n.tass] ? n.tass : b.tass, tassForm: str(n.tassForm, 200),
    rate: n.rate === null || n.rate === undefined || n.rate === "" ? null : clamp(int(n.rate), 0, 20),
    store: {quint: Math.max(0, int(n.store?.quint)), tass: Math.max(0, int(n.store?.tass))},
    last: Number.isFinite(Number(n.last)) && n.last !== null && n.last !== "" ? Number(n.last) : null};
}

/** A week's output: half free Quintessence, half Tass; an odd point goes to the free half. */
export function nodeWeekly(node, year) {
  const n = normNode(node);
  const per = n.rate ?? nodeRateFor(year).perDot;
  const total = per * n.rating;
  const tass = Math.floor(total / 2);
  return {total, quint: total - tass, tass};
}
export function nodeCap(node, year) {
  const w = nodeWeekly(node, year);
  return {quint: w.quint * NODE_CAP_WEEKS, tass: w.tass * NODE_CAP_WEEKS};
}

/** The whole weeks since the Node was last filled; the Node builds up to its cap. Returns {node, weeks, added}. */
export function accrueNode(node, now, year) {
  const n = normNode(node);
  if ( n.last === null ) return {node: {...n, last: num(now)}, weeks: 0, added: {quint: 0, tass: 0}, full: false};
  const weeks = Math.max(0, Math.floor((num(now) - n.last) / WEEK));
  if ( !weeks ) return {node: n, weeks: 0, added: {quint: 0, tass: 0}, full: false};
  const w = nodeWeekly(n, year), cap = nodeCap(n, year);
  const quint = Math.min(cap.quint, n.store.quint + w.quint * weeks), tass = Math.min(cap.tass, n.store.tass + w.tass * weeks);
  const added = {quint: quint - n.store.quint, tass: tass - n.store.tass};
  return {node: {...n, store: {quint, tass}, last: n.last + weeks * WEEK}, weeks, added, full: quint >= cap.quint && tass >= cap.tass};
}

/**
 * Meditating at the Node to take free Quintessence through the Avatar (M20 p. 333 / 332).
 * @param {object} m  {avatar, prime, quint (held now), paradox, turns (time spent, a turn each), want}
 * @returns {{ok, take, held, why, notes}}
 */
export function meditate(node, {avatar = 0, prime = 0, quint = 0, paradox = 0, turns = 1, want = Infinity} = {}) {
  const n = normNode(node);
  const av = int(avatar);
  if ( av < 1 ) return {ok: false, take: 0, why: "Only a mage with an Avatar can draw on a Node by meditation."};
  const room = Math.max(0, Math.min(av, 20 - int(paradox)) - int(quint));
  if ( !room ) return {ok: false, take: 0, why: `The Avatar (${av}) holds all the Quintessence it can${int(paradox) ? ", with the Paradox on the wheel" : ""}.`};
  const perTurn = int(prime) >= 1 ? Infinity : av;
  const take = Math.max(0, Math.min(n.store.quint, room, perTurn * Math.max(1, int(turns)), want === Infinity ? Infinity : int(want)));
  if ( !take ) return {ok: false, take: 0, why: "The Node is drained; it must fill again before it gives more."};
  const notes = [];
  if ( take >= 3 ) notes.push("Lights dim and the air stirs or changes temperature as the energy moves.");
  if ( take >= 10 ) notes.push("A shift this large shows to mortal eyes and counts as vulgar.");
  return {ok: true, take, held: int(quint) + take, node: {...n, store: {...n.store, quint: n.store.quint - take}}, notes};
}

/** Gathering Tass: anyone can carry it off; only Prime 3 lets a mage absorb it later. */
export function gatherTass(node, want = Infinity) {
  const n = normNode(node);
  const take = Math.max(0, Math.min(n.store.tass, want === Infinity ? Infinity : int(want)));
  return {take, node: {...n, store: {...n.store, tass: n.store.tass - take}}, form: n.tassForm || TASS_FORMS[n.tass]?.form || "", resonance: n.resonance};
}
export function absorbTass({prime = 0, avatar = 0, quint = 0, paradox = 0, points = 0} = {}) {
  if ( int(prime) < 3 ) return {ok: false, take: 0, why: "Taking Quintessence out of Tass needs Prime 3."};
  const room = Math.max(0, Math.min(int(avatar), 20 - int(paradox)) - int(quint));
  const take = Math.min(room, Math.max(0, int(points)));
  return take ? {ok: true, take} : {ok: false, take: 0, why: "The Avatar holds all it can."};
}

/* ------------------------------------------------------------------ */
/*  Chantries                                                          */
/* ------------------------------------------------------------------ */

export const CHANTRY_TIERS = [
  {min: 0, max: 9, label: "Too few points for a stronghold of its own"},
  {min: 10, max: 20, label: "Secure squat"},
  {min: 21, max: 30, label: "Small sanctuary"},
  {min: 31, max: 70, label: "Mystic chantry"},
  {min: 71, max: 100, label: "Stronghold"},
  {min: 101, max: Infinity, label: "Power center"}
];
/** M20 p. 309 gives 21-30 and 30-70; a pool of 30 is read as a small sanctuary (B3453). */
export const chantryTier = pool => CHANTRY_TIERS.find(t => int(pool) >= t.min && int(pool) <= t.max) ?? CHANTRY_TIERS[0];

/** What the stronghold is called in the year (M20 p. 308: covenants first, chantries and Constructs by the 1900s; B3453). */
export function chantryName(year, side = "mystic") {
  const y = num(year);
  if ( side === "tech" ) return y >= 1899 ? "Construct" : y >= 1325 ? "Order of Reason house" : "Craftmasons' lodge";
  return y >= 1466 ? "Chantry" : "Covenant";
}

export function blankChantry() { return {kind: "chantry", side: "mystic", members: [], duties: ""}; }
export function normChantry(c = {}) {
  const members = (Array.isArray(c.members) ? c.members : []).map(m => ({actor: str(m?.actor, 64), name: str(m?.name), points: clamp(int(m?.points), 0, 200), gone: !!m?.gone}))
    .filter(m => m.actor || m.name).slice(0, 40);
  return {kind: "chantry", side: c.side === "tech" ? "tech" : "mystic", members, duties: str(c.duties, 300)};
}
export const chantryPool = c => normChantry(c).members.filter(m => !m.gone).reduce((s, m) => s + m.points, 0);

/** A member quits or dies: their points go (M20 p. 309). Returns the new chantry, the points lost and the tier change. */
export function memberLeaves(chantry, who) {
  const c = normChantry(chantry);
  const before = chantryPool(c);
  const members = c.members.map(m => (m.actor === who || m.name === who) && !m.gone ? {...m, gone: true} : m);
  const after = chantryPool({...c, members});
  return {chantry: {...c, members}, lost: before - after, from: chantryTier(before).label, to: chantryTier(after).label, dropped: chantryTier(after).min < chantryTier(before).min};
}
/** The whole group breaks apart: every pool point goes and the stronghold is gone. */
export const fracture = chantry => ({...normChantry(chantry), members: normChantry(chantry).members.map(m => ({...m, gone: true}))});

/* ------------------------------------------------------------------ */
/*  Freeholds and balefires                                            */
/* ------------------------------------------------------------------ */

/** Kinds of freehold (C20 pp. 313-314, own words). glade: no balefire, a sacred stone, one harvester only. */
export const FREEHOLD_FORMS = {
  hearth: {label: "Hearth", note: "A wayhouse, coffee shop or taproom open to every changeling; held sacred above all others."},
  stronghold: {label: "Stronghold", note: "A noble's fortified seat, built to stand a siege."},
  thorpe: {label: "Thorpe", note: "A neighbourhood or village of mostly fae folk; may keep several balefires."},
  manor: {label: "Manor", note: "A small community around the house that holds the balefire."},
  market: {label: "Market", note: "Where chimerical goods and work are traded; thrives in towns where others wither."},
  homestead: {label: "Homestead", note: "Chimerical crops and beasts, mostly in the Near Dreaming."},
  workshop: {label: "Workshop", note: "Where chimerical steel is forged and voile sewn; its Glamour goes into Treasures."},
  glade: {label: "Glade", glade: true, note: "A wellspring with a sacred stone, no balefire; only the first to sleep there gains Glamour."},
  lost: {label: "Lost One freehold", note: "Sealed since the Shattering: strong, wild, and a Bedlam risk to visitors."},
  nunnehi: {label: "Nunnehi lodge", note: "Sacred ground shaped by the dreams of the people who care for it."}
};

/** Fae ages (C20 pp. 35-39) for the freehold's era words and the fading threshold (house rule B3454). */
export const FAE_AGES = [
  {to: 1229, label: "before the Shattering", fade: 9, note: "Freeholds are many and bright; the Dreaming and the world still mingle."},
  {to: 1399, label: "the Shattering", fade: 6, note: "Trods close and freeholds vanish; the Black Death feeds the Dreaming's dark."},
  {to: 1968, label: "the Interregnum", fade: 6, note: "Changelings huddle round dying balefires; many freeholds fail."},
  {to: Infinity, label: "after the Resurgence", fade: 7, note: "Since July 1969 balefires burn brighter, but the world is still dull."}
];
export function faeAgeFor(year) { const y = num(year); return FAE_AGES.find(a => y <= a.to) ?? FAE_AGES[FAE_AGES.length - 1]; }

/** Days a freehold may go without its keeper before it is untended (house rule B3454). */
export const FREEHOLD_TEND_DAYS = 30;

export function blankFreehold() {
  return {kind: "freehold", rating: 1, base: 1, form: "hearth", banality: 5, oath: null, creator: null, lastHarvest: null, daily: 0, lastRegen: null, lastTended: null, lastFade: null, destroyed: false};
}
const stamp = v => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : null);
export function normFreehold(f = {}) {
  const b = blankFreehold();
  const base = clamp(int(f.base ?? f.rating ?? b.base), 1, 5);
  return {kind: "freehold", base, rating: clamp(int(f.rating ?? base), 0, base), form: FREEHOLD_FORMS[f.form] ? f.form : b.form,
    banality: clamp(int(f.banality ?? b.banality), 0, 10), oath: f.oath ? str(f.oath, 64) : null, creator: f.creator ? str(f.creator, 64) : null,
    lastHarvest: stamp(f.lastHarvest), daily: clamp(int(f.daily), 0, 400), lastRegen: stamp(f.lastRegen), lastTended: stamp(f.lastTended),
    lastFade: stamp(f.lastFade), destroyed: !!f.destroyed};
}

/**
 * A night's dreaming by the balefire (C20 p. 313 / 312). sleepers: [{id, glamour, perm}] (Glamour now and the rating).
 * Returns per-sleeper gains. A Glade gives only to the first.
 */
export function harvest(freehold, sleepers = []) {
  const f = normFreehold(freehold);
  if ( f.destroyed || f.rating < 1 ) return {ok: false, gains: [], why: "The balefire is out."};
  const list = (FREEHOLD_FORMS[f.form]?.glade ? sleepers.slice(0, 1) : sleepers).filter(Boolean);
  if ( !list.length ) return {ok: false, gains: [], why: "Nobody sleeps by the balefire."};
  const share = list.length > 1 ? Math.max(1, Math.floor(f.rating / list.length)) : f.rating;
  const gains = list.map(s => { const room = Math.max(0, int(s.perm) - int(s.glamour)); return {id: s.id, gain: Math.min(share, room), capped: share > room}; });
  return {ok: true, gains, share};
}

/** Marks a harvest night: a balefire used most nights recovers lost ranks only by the season. */
export function noteHarvest(freehold, now) {
  const f = normFreehold(freehold);
  const recent = f.lastHarvest !== null && num(now) - f.lastHarvest <= 2 * DAY;
  return {...f, lastHarvest: num(now), daily: recent ? f.daily + 1 : 1, lastTended: num(now)};
}
/** Harvested on (nearly) every night lately: at least 20 nights running counts as daily (house reading, B3455). */
export const harvestedDaily = (f, now) => { const x = normFreehold(f); return x.daily >= 20 && x.lastHarvest !== null && num(now) - x.lastHarvest <= 2 * DAY; };

/** Reaving (C20 p. 313 / 312): Banality dice at 7; successes are Glamour; every two over the rank cost a rank. */
export function reave(freehold, successes) {
  const f = normFreehold(freehold);
  const s = Math.max(0, int(successes));
  const lose = s > f.rating ? Math.floor((s - f.rating) / 2) : 0;
  const rating = Math.max(0, f.rating - lose);
  return {glamour: s, lose, freehold: {...f, rating}, out: rating === 0, pool: "Banality", difficulty: 7};
}

/**
 * Time passing for a freehold: lost ranks come back (one a month resting, one a season harvested daily), and an
 * untended freehold in a dull place fades a rank a season (house rule B3454). Returns {freehold, regained, faded}.
 */
export function freeholdTime(freehold, now, {year = 2000, banality = null} = {}) {
  let f = normFreehold(freehold);
  const t = num(now);
  let regained = 0, faded = 0;
  if ( f.destroyed ) return {freehold: f, regained, faded};
  if ( f.lastRegen === null ) f = {...f, lastRegen: t};
  if ( f.lastTended === null ) f = {...f, lastTended: t};
  if ( f.lastFade === null ) f = {...f, lastFade: t};
  if ( f.rating < f.base ) {
    const step = harvestedDaily(f, t) ? SEASON : MONTH;
    const steps = Math.floor((t - f.lastRegen) / step);
    if ( steps > 0 ) { regained = Math.min(steps, f.base - f.rating); f = {...f, rating: f.rating + regained, lastRegen: f.lastRegen + steps * step}; }
  } else f = {...f, lastRegen: t};
  const dull = num(banality ?? f.banality) >= faeAgeFor(year).fade;
  const untended = t - f.lastTended > FREEHOLD_TEND_DAYS * DAY;
  if ( dull && untended ) {
    const seasons = Math.floor((t - Math.max(f.lastFade, f.lastTended + FREEHOLD_TEND_DAYS * DAY)) / SEASON);
    if ( seasons > 0 ) { faded = Math.min(seasons, f.rating); f = {...f, rating: f.rating - faded, base: Math.max(1, f.base - faded), lastFade: t}; }
  } else f = {...f, lastFade: t};
  return {freehold: f, regained, faded, out: f.rating === 0};
}

/** Swearing to protect it invests Glamour equal to the rating (C20 p. 312 / 311). */
export const oathCost = freehold => normFreehold(freehold).base;
/** A destroyed freehold: its keeper takes the rating in Banality; a creator gets the invested Glamour back. */
export function destroyFreehold(freehold, {keeperIsCreator = false} = {}) {
  const f = normFreehold(freehold);
  return {freehold: {...f, rating: 0, destroyed: true}, banality: f.base, glamourBack: keeperIsCreator ? f.base : 0};
}
/** Inside the keeper's own freehold (C20 p. 312 / 311): dice to defend and soak, and the penalty for breaking the keeper's word. */
export function freeholdRights(freehold) {
  const r = normFreehold(freehold).rating;
  return {defend: r, soak: Math.floor(r / 2), mandate: r, cantrip: -1};
}

/* ------------------------------------------------------------------ */
/*  The register of places                                              */
/* ------------------------------------------------------------------ */

export const KINDS = {node: "Node", chantry: "Chantry", freehold: "Freehold", caern: "Caern"};
export function blankState() { return {v: 1, list: []}; }
export function normPlace(p = {}) {
  const kind = KINDS[p.kind] ? p.kind : "node";
  const body = kind === "node" ? normNode(p) : kind === "chantry" ? normChantry(p) : kind === "caern" ? C.normCaern(p) : normFreehold(p);
  return {...body, id: str(p.id || "", 40), name: str(p.name || KINDS[kind], 120), scene: p.scene ? str(p.scene, 64) : null,
    keepers: (Array.isArray(p.keepers) ? p.keepers : []).map(k => str(k, 64)).filter(Boolean).slice(0, 20),
    node: kind === "chantry" && p.node ? str(p.node, 40) : null,
    note: str(p.note, 500), log: (Array.isArray(p.log) ? p.log : []).slice(-LOG_CAP).map(l => ({t: num(l?.t), text: str(l?.text, 300)}))};
}
export function normState(s = {}) {
  const list = (Array.isArray(s?.list) ? s.list : []).map(normPlace).filter(p => p.id);
  return {v: 1, list};
}
export const placeById = (st, id) => normState(st).list.find(p => p.id === id) ?? null;
export const logLine = (p, t, text) => ({...p, log: [...(p.log ?? []), {t: num(t), text: str(text, 300)}].slice(-LOG_CAP)});

/**
 * Everything the clock does to the places since they were last looked at.
 * @returns {{state, lines: string[]}}  lines only for things the Storyteller should hear about
 */
export function tick(state, now, {year = 2000, banalityOf = () => null, rand = Math.random} = {}) {
  const st = normState(state), lines = [], drift = [];
  const list = st.list.map(p => {
    if ( p.kind === "node" ) {
      const r = accrueNode(p, now, year);
      let q = {...p, ...r.node};
      if ( r.weeks && r.full && !(p.store.quint >= nodeCap(p, year).quint && p.store.tass >= nodeCap(p, year).tass) ) {
        lines.push(`${p.name} is full: ${q.store.quint} Quintessence and ${q.store.tass} Tass wait to be taken.`);
        q = logLine(q, now, "Full.");
      }
      return q;
    }
    if ( p.kind === "freehold" ) {
      const r = freeholdTime(p, now, {year, banality: banalityOf(p)});
      let q = {...p, ...r.freehold};
      if ( r.regained ) { lines.push(`${p.name}: the balefire regains ${r.regained === 1 ? "a rank" : `${r.regained} ranks`} (now ${q.rating}).`); q = logLine(q, now, `Regained ${r.regained}.`); }
      if ( r.faded ) {
        lines.push(`${p.name}: untended in a dull place, the balefire fades by ${r.faded === 1 ? "a rank" : `${r.faded} ranks`} (now ${q.rating}).${r.out ? " It has gone out." : ""}`);
        q = logLine(q, now, `Faded ${r.faded}.`);
      }
      return q;
    }
    if ( p.kind === "caern" ) {
      const r = C.caernTime(p, now, {year, rand});
      let q = {...p, ...r.caern};
      for ( const l of r.lines ) { lines.push(`${p.name}: ${l}`); q = logLine(q, now, l); }
      for ( const k of r.drift ) drift.push({id: p.id, scene: p.scene, kind: k});
      return q;
    }
    return p;
  });
  return {state: {...st, list}, lines, drift};
}

/** One line for a place, for lists and cards. */
export function describe(p, {year = 2000} = {}) {
  const x = normPlace(p);
  if ( x.kind === "caern" ) return C.describeCaern(x, {year});
  if ( x.kind === "node" ) {
    const w = nodeWeekly(x, year), cap = nodeCap(x, year);
    return `${x.name}: Node ${x.rating} (caern level ${caernOf(x.rating)}), ${NODE_SIDES[x.side].label.split(" (")[0].toLowerCase()}; ${w.quint} Quintessence and ${w.tass} Tass a week; holds ${x.store.quint}/${cap.quint} and ${x.store.tass}/${cap.tass} Tass.`;
  }
  if ( x.kind === "chantry" ) {
    const pool = chantryPool(x);
    return `${x.name}: ${chantryName(year, x.side)}, ${chantryTier(pool).label.toLowerCase()} (${pool} pool points, ${x.members.filter(m => !m.gone).length} members).`;
  }
  return `${x.name}: ${FREEHOLD_FORMS[x.form].label} ${x.rating}${x.rating < x.base ? ` of ${x.base}` : ""}${x.destroyed ? ", destroyed" : ""}; ${faeAgeFor(year).label}.`;
}
