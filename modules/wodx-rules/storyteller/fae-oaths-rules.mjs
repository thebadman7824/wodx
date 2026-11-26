/**
 * Fae oaths kept by the village, the pure part. No Foundry in here.
 *
 * No freehold stands near most villages, so the fae reach them through their people. This file keeps the record of each
 * oath between the fae and the living, in the five parts Dark Ages: Fae sets (pp. 109-110): what the fae does, what the
 * humans do, what breaks it on each side, and the punishment in shame. It also keeps:
 *   Gold Oaths    sworn with a whole people long ago and now remembered only as a custom (p. 108); nothing but breaking
 *                 the custom ends one, and baptism does not touch it (p. 108)
 *   Stone, Iron   a household and its heirs (Stone, p. 108) or one life (Iron, p. 109); baptism washes both away (p. 108);
 *                 an Iron Oath a side cannot keep is inactive, not broken (p. 109)
 *   Lordship      an oathcircle that rules a village through its oaths: a rising of the peasants breaks them, and the
 *                 hetman speaks for the village (p. 204)
 *   Courts        each Court's way with oaths and with those who break them (pp. 67, 69, 71, 73, 74)
 *   Helpers       household sprites that do the chores for a small oath and turn spiteful when spurned (p. 183), and the
 *                 brownie of Dark Ages: Mage (p. 194), driven off by gifts, praise or the sun
 *   Faerie food   a mortal who eats it is one success weaker on Willpower rolls against faerie wiles for a day (p. 85)
 *   Retinue       servants fed and clothed or they revolt; betraying the master needs Willpower at 10; raising a hand to
 *                 the master costs aggravated damage equal to the master's Mists (p. 94)
 */
import {DAY} from "../core/terms.mjs";

export const REF = "Dark Ages: Fae";
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(num(v))));

/** The three tiers (pp. 108-109): the rating range, who the human side is, and whether baptism washes it away. */
export const TIERS = {
  iron: {label: "Iron Oath", min: 1, max: 3, humans: "one person (at most four)", baptism: true, page: 109,
    note: "lasts one lifetime; inactive, not broken, while a side cannot keep it"},
  stone: {label: "Stone Oath", min: 3, max: 5, humans: "the head of a household, binding the family and its heirs", baptism: true, page: 108,
    note: "few Echoes pierce it"},
  gold: {label: "Gold Oath", min: 4, max: 5, humans: "a whole village or people", baptism: false, page: 108,
    note: "remembered now as a custom; nothing but breaking it ends it, and baptism does not"}
};

/** Each Court's oaths: what they tend to offer and ask, and how they treat a human who breaks one. In WoDX's words. */
export const COURTS = {
  spring: {label: "Spring", page: 67, style: "help, healing and guarding for gratitude or privacy",
    punish: "a human tricked into breaking it is pitied; one who broke it on purpose suffers for the rest of their life"},
  summer: {label: "Summer", page: 69, style: "rewards for those who behave, with a temptation the human must live beside",
    punish: "swift justice, however the oath was broken"},
  autumn: {label: "Autumn", page: 71, style: "the heart's desire for a price, with every term made plain",
    punish: "the oath-breaker is bound to service for a time, or set a hard and unpleasant task"},
  winter: {label: "Winter", page: 73, style: "blunt bans (keep out of a place, never sing a song, never wear a thing) in return for being let live",
    punish: "the bargain was the human's life"},
  solstice: {label: "Solstice", page: 74, style: "the unSained hold almost no oaths with humans",
    punish: "the Storyteller decides", none: true}
};

/** Village oaths the book gives as models (pp. 33, 34, 39), as templates in WoDX's words. */
export const MODELS = {
  apple: {label: "The windfall apples", tier: "gold", rating: 4, court: "spring", page: 33,
    deal: "the orchards are kept free of blight", duty: "the windfall apples are left lying under the trees for the Good Folk",
    faeBreaks: "blight takes the orchards through their neglect", humanBreaks: "the windfalls are gathered in",
    punishFae: "to tend that orchard unseen and unthanked for a hundred years", punishHuman: "the next harvest rots on the branch",
    custom: "No one gathers the windfalls: they belong to the Good Folk, and the orchards stay clean."},
  well: {label: "The well that heals or eases", tier: "gold", rating: 5, court: "spring", page: 34,
    deal: "a sick child named at the well is healed, or dies without pain, by dawn", duty: "no one of the village sets foot in the forest",
    faeBreaks: "a child named at the well suffers", humanBreaks: "a villager walks into the forest",
    punishFae: "the well runs dry for a generation", punishHuman: "the well answers no one from the village again",
    custom: "Bend an iron nail, drop it in the well and say the sick child's name. And never go into the forest."},
  miners: {label: "The miners' warning", tier: "gold", rating: 4, court: "winter", page: 39,
    deal: "the folk below leave the miners be, and warn one who will die the next day so they can say goodbye", duty: "no one whistles below ground",
    faeBreaks: "a miner is taken who never whistled, or dies unwarned", humanBreaks: "someone whistles in the workings",
    punishFae: "the warning is never heard again", punishHuman: "the one who whistled is taken or killed below",
    custom: "Never whistle below ground. A miner who is warned in the night says their goodbyes."}
};

export const STATES = {kept: "Kept", inactive: "Inactive", broken: "Broken", washed: "Washed away"};

const id = () => Math.random().toString(36).slice(2, 10);
const ids = a => (Array.isArray(a) ? a : []).map(x => (typeof x === "string" ? {id: null, name: str(x, 80)} : {id: x?.id ? String(x.id) : null, name: str(x?.name, 80)})).filter(x => x.name);

/** A clean oath record. */
export function normOath(o = {}) {
  const tier = TIERS[o.tier] ? o.tier : "iron", T = TIERS[tier];
  const court = COURTS[o.court] ? o.court : "spring";
  return {id: str(o.id, 40) || id(), tier, rating: clamp(o.rating || T.min, T.min, T.max), court,
    fae: ids(o.fae), humans: ids(o.humans).slice(0, tier === "iron" ? 4 : 50), town: o.town ? str(o.town, 80) : null,
    deal: str(o.deal), duty: str(o.duty), faeBreaks: str(o.faeBreaks), humanBreaks: str(o.humanBreaks),
    punishFae: str(o.punishFae), punishHuman: str(o.punishHuman), custom: str(o.custom), lordship: !!o.lordship, tricked: !!o.tricked,
    state: STATES[o.state] ? o.state : "kept", made: Number.isFinite(Number(o.made)) ? Number(o.made) : 0,
    broke: o.broke ? {side: o.broke.side === "fae" ? "fae" : "human", why: str(o.broke.why), at: num(o.broke.at)} : null};
}

/** The five parts are all there (p. 109): what each side does, what breaks it on each side, the punishment. */
export function missingParts(o) {
  const x = normOath(o), out = [];
  if ( !x.deal ) out.push("what the fae does");
  if ( !x.duty ) out.push("what the humans do");
  if ( !x.faeBreaks ) out.push("what breaks it on the fae's side");
  if ( !x.humanBreaks ) out.push("what breaks it on the humans' side");
  if ( !x.punishFae && !x.punishHuman ) out.push("the punishment");
  if ( !x.fae.length ) out.push("the fae who swore it");
  return out;
}

/** An oath shields its fae from Echoes only while both sides keep it (p. 110). */
export const shields = o => normOath(o).state === "kept";

/** The line for the fae's sheet (WoDX Actions' oath list): kind, rating and terms. ledgerId ties it back here. */
export function sheetOath(o) {
  const x = normOath(o);
  return {kind: x.tier, rating: x.rating, terms: `${x.deal || "a deal"}, if ${x.duty || "a duty"}`.slice(0, 200), active: x.state === "kept" || x.state === "inactive" ? x.state === "kept" : false, ledgerId: x.id};
}

/** What the village knows: a Gold Oath is only a custom to them (p. 108); other oaths are known to the humans sworn. */
export function customLine(o) {
  const x = normOath(o);
  if ( x.tier === "gold" ) return x.custom || `${x.duty ? x.duty.charAt(0).toUpperCase() + x.duty.slice(1) : "An old custom"}: it has always been done so.`;
  return `${x.humans.map(h => h.name).join(", ") || "Someone"} keeps a bargain with the Good Folk: ${x.duty || "a duty"}.`;
}

/**
 * One side breaks the oath (p. 110). Returns {oath, punishment, court, words}. A Spring fae pities a human tricked into
 * it (p. 67). An Iron Oath a side simply cannot keep is not broken; use inactive() for that (p. 109).
 */
export function breakOath(o, side = "human", {why = "", at = 0} = {}) {
  const x = normOath(o), C = COURTS[x.court];
  const s = side === "fae" ? "fae" : "human";
  const oath = {...x, state: "broken", broke: {side: s, why: str(why), at: num(at)}};
  let punishment = s === "fae" ? x.punishFae : x.punishHuman;
  let court = "";
  if ( s === "human" ) {
    court = x.court === "spring" && x.tricked ? "The Spring fae pities a human tricked into it, and lets the worst of it pass." : `${C.label} fae: ${C.punish}.`;
    if ( x.court === "spring" && x.tricked ) punishment = "";
  }
  const words = s === "fae" ? `The fae's side fails${why ? `: ${why}` : ""}. The oath no longer shields them from Echoes.`
    : `${x.tier === "gold" ? "The custom is broken" : "The human side is broken"}${why ? `: ${why}` : ""}. The fae loses the oath's shield against Echoes.`;
  return {oath, punishment, court, words};
}

/** An Iron Oath whose human cannot keep it (lost an office, gone away) waits, inactive, and wakes when they can (p. 109). */
export function inactive(o, on = true) {
  const x = normOath(o);
  if ( x.tier !== "iron" || !["kept", "inactive"].includes(x.state) ) return x;
  return {...x, state: on ? "inactive" : "kept"};
}

/** A person is baptised: every Iron and Stone Oath they are sworn to washes away; Gold Oaths stay (p. 108). */
export function baptise(oaths, who = {}) {
  const hit = h => (who.id && h.id === who.id) || (!who.id && h.name && h.name === who.name) || (who.id && !h.id && h.name === who.name);
  const gone = [];
  const out = (oaths ?? []).map(normOath).map(o => {
    if ( !TIERS[o.tier].baptism || o.state === "washed" || o.state === "broken" ) return o;
    if ( !o.humans.some(hit) && !o.fae.some(hit) ) return o;
    gone.push(o.id);
    return {...o, state: "washed", broke: {side: "human", why: "baptism", at: 0}};
  });
  return {oaths: out, gone};
}

/** A town rises: the oaths that rule it break, and with them the shield (p. 204). */
export function rising(oaths, town, at = 0) {
  const gone = [];
  const out = (oaths ?? []).map(normOath).map(o => {
    if ( !o.lordship || o.town !== town || !["kept", "inactive"].includes(o.state) ) return o;
    gone.push(o.id);
    return breakOath(o, "human", {why: "the village rose against its masters", at}).oath;
  });
  return {oaths: out, gone};
}

/* ---- Household helpers ---- */

/** Kinds of household helper and what slights them. */
export const HELPERS = {
  sprite: {label: "Household sprite", page: "Dark Ages: Fae p. 183",
    does: "does the chores at night for a small oath: a bowl of milk, a crust, a corner of the hearth",
    slights: {neglect: "turned", holy: "turned", gift: null, praise: null, sun: null},
    spite: "A spurned sprite turns vindictive: spoiled milk and soured bread at first, and it may lead wolves or worse to the house."},
  brownie: {label: "Brownie", page: "Dark Ages: Mage p. 194",
    does: "does the chores at night and wants no reward",
    slights: {gift: "offended", praise: "gone", sun: "mushrooms", holy: null, neglect: null},
    spite: "A brownie pressed with gifts again either leaves for good or turns murderous."}
};
export const MOODS = {content: "Content", offended: "Offended (refused the gift)", spiteful: "Spiteful", gone: "Gone", mushrooms: "Mushrooms in the sun (seven days)"};
export const SLIGHTS = {gift: "Left a gift or reward", praise: "Thanked or praised it", sun: "Caught by sunlight", holy: "The house turned to the Church and drove it off", neglect: "Its small oath went unkept"};

export function normHelper(h = {}) {
  const kind = HELPERS[h.kind] ? h.kind : "sprite";
  return {id: str(h.id, 40) || id(), kind, name: str(h.name, 80) || HELPERS[kind].label, household: str(h.household, 120), town: h.town ? str(h.town, 80) : null,
    mood: MOODS[h.mood] ? h.mood : "content", gifts: clamp(h.gifts, 0, 99), back: Number.isFinite(Number(h.back)) ? Number(h.back) : null};
}

/**
 * The household slights its helper. rng() picks a brownie's way when gifts are pressed on it again (gone or murderous).
 * Returns {helper, words, spite} where spite is true when the helper turns on the house.
 */
export function slight(h, how, {now = 0, rng = Math.random} = {}) {
  const x = normHelper(h), K = HELPERS[x.kind];
  if ( x.mood === "gone" ) return {helper: x, words: `${x.name} is gone already.`, spite: false};
  if ( x.kind === "brownie" ) {
    if ( how === "gift" ) {
      const gifts = x.gifts + 1;
      if ( gifts === 1 ) return {helper: {...x, gifts, mood: "offended"}, words: `${x.name} will not touch the gift and goes on with the chores, colder.`, spite: false};
      const murderous = rng() < 0.5;
      return {helper: {...x, gifts, mood: murderous ? "spiteful" : "gone"}, words: murderous ? `${x.name} is offended past bearing and turns murderous.` : `${x.name} leaves the house for good.`, spite: murderous};
    }
    if ( how === "praise" ) return {helper: {...x, mood: "gone"}, words: `Praised, ${x.name} slips away and does not come back.`, spite: false};
    if ( how === "sun" ) return {helper: {...x, mood: "mushrooms", back: now + 7 * DAY}, words: `Caught by the sun, ${x.name} is a heap of mushrooms for seven days.`, spite: false};
    return {helper: x, words: `${x.name} takes no notice.`, spite: false};
  }
  if ( K.slights[how] === "turned" ) return {helper: {...x, mood: "spiteful"}, words: `${x.name} is spurned. ${K.spite}`, spite: true};
  return {helper: x, words: `${x.name} takes no notice.`, spite: false};
}

/** A brownie back from mushrooms after seven days (Dark Ages: Mage p. 194). */
export function helperBack(h, now = 0) {
  const x = normHelper(h);
  return x.mood === "mushrooms" && x.back !== null && now >= x.back ? {...x, mood: "content", back: null} : x;
}
/** Chores done in the night: only a content helper does them. */
export const doesChores = h => normHelper(h).mood === "content";

/* ---- Faerie food and the retinue ---- */

/** Faerie food (p. 85) lives with the fae rules in WoDX Actions, which read it on the rolls. */
export {FOOD, foodActive, afterFood} from "../actions/fae-da-rules.js";

/** The retinue (p. 94). */
export const RETINUE = {betrayDiff: 10, page: 94,
  upkeep: "Servants must be fed and clothed, or they revolt.",
  harm: "A servant who lifts a hand against the master coughs up blood and suffers aggravated levels, as many as the master has dots of Mists."};
export const harmDamage = masterMists => Math.max(0, num(masterMists));

/* ---- The state ---- */

export const blank = () => ({oaths: [], helpers: []});
export function normState(s = {}) {
  return {oaths: (Array.isArray(s?.oaths) ? s.oaths : []).map(normOath), helpers: (Array.isArray(s?.helpers) ? s.helpers : []).map(normHelper)};
}
