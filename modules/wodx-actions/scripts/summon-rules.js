/**
 * WoDX Actions: the rules every summoned being lives by (B4820-B4829). Pure rules, no Foundry: the harness tests them;
 * the Foundry side is summons.js.
 *
 * A summon spec says what a power brings and how it behaves, from the power's own book page (summon-specs.js):
 *   what      animal, swarm, spirit, ghost, corpse, construct, elemental, plant, faerie, shade, double, person, beast,
 *             demon, object
 *   profile   servant (obeys the summoner), called (comes with its own will, takes requests), wild (hostile or out of
 *             hand), person (an existing being made to travel to the summoner)
 *   count     how many: {by, mult, fixed, max}
 *   lasts     {kind, n, perSuccess}: rounds, scene, night, hours, days, weeks, or no timer (until dismissed, until
 *             destroyed, until its task is done, while its upkeep is paid)
 *   control   {mode, range, orders}: direct (the summoner's player moves and acts for it), orders (it takes the
 *             summoner's orders through WoDX NPC, hard ones weighed by the Storyteller), none, hostile
 *   roll      the book's roll to keep it in hand: {when, who, pool, diff, fail, ladder}
 *   upkeep    what keeps a lasting servant going: {pool, points, every, fail}
 *   persist   a companion that stays across scenes and nights
 * resolve() turns a spec and a casting into the numbers WoDX applies. Everything a summoning makes ends somehow:
 * resolve() never returns a being with no timer, no task, no upkeep and no way to dismiss it.
 */

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const WHAT = {
  animal: "animal", swarm: "swarm", spirit: "spirit", ghost: "ghost", corpse: "risen corpse", construct: "construct",
  elemental: "elemental", plant: "living tree", faerie: "faerie", shade: "shade", double: "double", person: "person",
  beast: "great beast", demon: "demon", object: "living object"
};
export const PROFILES = {
  servant: "Obeys the summoner",
  called: "Comes with a will of its own: it takes requests, and hard ones are the Storyteller's call",
  wild: "Out of hand: it goes for whoever is nearest",
  person: "Someone who already exists, made to come to the summoner"
};
export const CONTROL = {
  direct: "The summoner's player commands it",
  orders: "It takes the summoner's orders (Orders tool); hard orders wait for the Storyteller",
  none: "No one commands it; the Storyteller plays it",
  hostile: "Hostile: it attacks the nearest living thing"
};

/** Kinds of time a summoning can last, in WoDX Chronicle's timed-effect terms. */
const SECONDS = {hours: 3600, days: 86400, weeks: 7 * 86400};
const PERIOD = {day: 86400, week: 7 * 86400, month: 30 * 86400};
/** The most tokens one summoning places (more make one swarm token). */
export const MAX_TOKENS = 12;

/** The look each kind arrives and leaves with (WoDX Chronicle looks). */
export const LOOK = {
  spirit: "smoke", ghost: "fog", shade: "smoke", demon: "smoke", elemental: "smoke", faerie: "fog", double: "smoke",
  corpse: "rubble", construct: "rubble", plant: "rubble", object: "rubble", beast: "smoke", animal: null, swarm: null, person: null
};

/** A spec for the Mage keyword and the Storyteller's effect when the power has no page of its own (M20 pp. 513-523). */
export const KEYWORD_SPEC = {
  what: "spirit", profile: "called", count: {by: "successes", mult: 0.5, max: 5},
  lasts: {kind: "ladder"}, control: {mode: "orders", range: null, orders: "simple"}, roll: null, upkeep: null, persist: false,
  page: "Mage 20th pp. 513-523", note: "A being called by magick is not bound by it: binding it takes Spirit 4 or Mind (a Bind keyword on the same casting)."
};

/** How many come: {by, mult, fixed, max} read against the casting. */
export function countOf(count = {}, ctx = {}) {
  const c = count ?? {};
  let k;
  switch ( c.by ) {
    case "fixed": k = n(c.fixed) || 1; break;
    case "faith": k = n(ctx.faith); break;
    case "level": k = n(ctx.level); break;
    case "gnosis-spent": k = n(ctx.gnosisSpent) || 1; break;
    case "rage+gnosis-spent": k = (n(ctx.rageSpent) + n(ctx.gnosisSpent)) || 1; break;
    case "willpower-spent": k = n(ctx.willpowerSpent) || 1; break;
    case "blood-spent": k = n(ctx.bloodSpent) || n(ctx.successes); break;
    default: k = n(ctx.successes);
  }
  if ( c.by !== "fixed" && c.mult ) k = c.mult < 1 ? Math.ceil(k * c.mult) : k * n(c.mult);
  const max = typeof c.max === "number" ? c.max : c.max ? n(ctx[c.max] ?? ctx.traits?.[c.max]) : Infinity;
  return Math.max(1, Math.min(max || Infinity, Math.round(k) || 1));
}

/**
 * How long it stays, as a WoDX Chronicle duration ({kind: rounds|scene|night|time}) or null when no clock ends it.
 * ladder: the M20 duration ladder step the casting reached (passed in ctx.ladder from effects-rules.durationFor).
 */
export function timedOf(lasts = {}, ctx = {}) {
  const L = lasts ?? {};
  const times = L.perSuccess ? Math.max(1, n(ctx.successes)) * Math.max(1, n(L.n) || 1) : Math.max(1, n(L.n) || 1);
  switch ( L.kind ) {
    case "rounds": return {kind: "rounds", rounds: times};
    case "scene": return {kind: "scene"};
    case "night": return L.perSuccess && times > 1 ? {kind: "time", seconds: times * 86400} : {kind: "night"};
    case "hours": case "days": case "weeks": return {kind: "time", seconds: times * SECONDS[L.kind]};
    case "ladder": return ctx.ladder ?? {kind: "scene"};
    default: return null;
  }
}

/** The words for how long it stays. */
export function lastsText(lasts = {}, ctx = {}) {
  const L = lasts ?? {};
  const times = L.perSuccess ? Math.max(1, n(ctx.successes)) * Math.max(1, n(L.n) || 1) : Math.max(1, n(L.n) || 1);
  const many = (one, k) => `${k} ${one}${k === 1 ? "" : "s"}`;
  switch ( L.kind ) {
    case "rounds": return many("turn", times);
    case "scene": return "the scene";
    case "night": return times > 1 ? many("night", times) : "until dawn";
    case "hours": return many("hour", times);
    case "days": return many("day", times);
    case "weeks": return many("week", times);
    case "ladder": return ctx.ladderLabel ?? "the scene";
    case "task": return "until its task is done";
    case "until-destroyed": return "until destroyed";
    case "upkeep": return "while it is kept fed";
    default: return "until dismissed";
  }
}

/** The difficulty of a keeping roll: a number, the summoner's Torment, the casting's successes + 4, or the being's Willpower. */
export const SPIRIT_RANK = {gaffling: 4, jaggling: 5, avatar: 7, incarna: 8, celestine: 10};

export function diffOf(diff, ctx = {}) {
  let d;
  if ( typeof diff === "number" ) d = diff;
  else if ( diff === "torment" ) d = n(ctx.torment) || 6;
  else if ( diff === "successes+4" ) d = n(ctx.successes) + 4;
  else if ( diff === "creature-willpower" ) d = n(ctx.creatureWillpower) || 6;
  else if ( diff === "faith" ) d = n(ctx.faith) || 6;
  // A spirit's rank sets it (W20 p. 212): Gaffling 4, Jaggling 5, a totem's avatar 7, Incarna 8, Celestine 10
  else if ( diff === "spirit-rank" ) d = SPIRIT_RANK[ctx.spiritRank] ?? 5;
  else d = n(diff) || 6;
  return Math.max(3, Math.min(10, d));
}

/** The control a keeping roll leaves: from its ladder by successes, or held or lost. botch: always the worst. */
export function controlAfter(roll, {successes = 0, botch = false} = {}) {
  if ( !roll ) return null;
  if ( Array.isArray(roll.ladder) && roll.ladder.length ) {
    const steps = [...roll.ladder].sort((a, b) => n(a.min) - n(b.min));
    if ( botch ) return {mode: "hostile", fail: "attack-summoner", note: steps[0]?.note ?? "It turns on the summoner"};
    const got = steps.filter(s => n(successes) >= n(s.min)).pop();
    if ( !got || got.control === "hostile" || got.control === "none" ) return {mode: got?.control === "none" ? "none" : "hostile", fail: roll.fail ?? "free", note: got?.note ?? ""};
    return {mode: got.control, fail: null, note: got.note ?? ""};
  }
  if ( botch ) return {mode: "hostile", fail: roll.fail === "leave" ? "attack-nearest" : (roll.fail ?? "attack-nearest"), note: "Botched"};
  return successes > 0 ? {mode: "kept", fail: null, note: ""} : {mode: roll.fail === "leave" ? "gone" : roll.fail === "free" ? "none" : "hostile", fail: roll.fail ?? "attack-nearest", note: ""};
}

/** What a being that slips control does: {mode, attack: "nearest"|"summoner"|null, leaves}. */
export function slipOf(fail) {
  switch ( fail ) {
    case "attack-summoner": return {mode: "hostile", attack: "summoner", leaves: false, text: "turns on its summoner"};
    case "leave": return {mode: "gone", attack: null, leaves: true, text: "breaks free and leaves"};
    case "free": case "refuse": return {mode: "none", attack: null, leaves: false, text: "goes free, its own master now"};
    default: return {mode: "hostile", attack: "nearest", leaves: false, text: "goes for the nearest living thing"};
  }
}

/** Upkeep owed between two moments: how many periods have run, and when the next falls due. */
export function upkeepDue(upkeep, paidAt, now) {
  if ( !upkeep?.every || !PERIOD[upkeep.every] ) return {periods: 0, next: null};
  const p = PERIOD[upkeep.every];
  const periods = Math.max(0, Math.floor((n(now) - n(paidAt)) / p));
  return {periods, next: n(paidAt) + (periods + 1) * p, period: p};
}

/** M20 Familiar/Companion (pp. 316-317): the weekly feed, the Paradox it can hold, and what its death costs. */
export function familiarOf(rating) {
  const r = Math.max(1, Math.min(5, n(rating) || 1));
  return {rating: r, upkeep: {pool: "quintessence", points: r, every: "week", fail: "leaves"}, paradoxCap: 5 * r,
    onDeath: {willpowerPermanent: 1, quintessence: 2 * r}, page: "Mage 20th pp. 315-317"};
}
/** A familiar's death: the Quintessence the mage has covers what it can, the rest turns to Paradox. */
export function familiarDeath(rating, quintHave) {
  const F = familiarOf(rating);
  const take = Math.min(n(quintHave), F.onDeath.quintessence);
  return {willpower: 1, quintessence: take, paradox: F.onDeath.quintessence - take};
}

/** Stats with "3+successes" style values worked out. */
export function statsOf(stats, ctx = {}) {
  if ( !stats ) return null;
  const out = {};
  for ( const [k, v] of Object.entries(stats) ) {
    if ( typeof v === "number" ) out[k] = v;
    else if ( typeof v === "string" && /^\s*\d+\s*\+\s*successes\s*$/i.test(v) ) out[k] = n(v.match(/\d+/)[0]) + n(ctx.successes);
    else if ( typeof v === "string" && /^\s*successes\s*$/i.test(v) ) out[k] = n(ctx.successes);
    else out[k] = v;
  }
  return out;
}

/**
 * The full set of rules a summoning brings, from its spec and the casting.
 * ctx: {successes, faith, level, torment, gnosisSpent, rageSpent, willpowerSpent, bloodSpent, ladder, ladderLabel,
 *       bound (a Bind keyword on the same casting), npc (the summoner has no player)}
 */
/** What a summoning costs up front (One Fights as Many: a Quintessence a copy): how many can come and what is paid. */
export function payFor(cost, count, have) {
  if ( !cost?.per ) return {count, paid: 0};
  const can = Math.floor(n(have) / n(cost.per));
  const k = Math.max(0, Math.min(count, can));
  return {count: k, paid: k * n(cost.per)};
}

export function resolve(spec, ctx = {}) {
  const s = spec ?? KEYWORD_SPEC;
  const what = WHAT[s.what] ? s.what : "spirit";
  const profile = PROFILES[s.profile] ? s.profile : "called";
  let mode = s.control?.mode ?? (profile === "servant" ? "direct" : profile === "wild" ? "hostile" : "orders");
  if ( ctx.bound && mode !== "hostile" ) mode = "direct";
  if ( profile === "wild" ) mode = "hostile";
  let count = countOf(s.count, ctx);
  const swarm = what === "swarm" || count > MAX_TOKENS;
  const timed = timedOf(s.lasts, ctx);
  let lastsKind = s.lasts?.kind ?? (timed ? "scene" : "until-dismissed");
  // Nothing stays for ever by default: a being with no timer, task, upkeep or lasting place ends with the scene
  const endless = !timed && !["task", "until-destroyed", "upkeep", "until-dismissed"].includes(lastsKind);
  if ( endless ) lastsKind = "scene";
  const roll = s.roll ? {...s.roll, diff: diffOf(s.roll.diff, ctx)} : null;
  const out = {
    what, whatLabel: WHAT[what], profile, control: mode, range: s.control?.range ?? null, orders: s.control?.orders ?? null,
    count, tokens: swarm ? 1 : count, swarm, timed: endless ? {kind: "scene"} : timed,
    lasts: lastsText({...(s.lasts ?? {}), kind: lastsKind}, ctx), lastsKind, roll, upkeep: s.upkeep ?? null, persist: !!s.persist,
    stats: statsOf(s.stats, ctx), onDeath: s.onDeath ?? null, page: s.page ?? "", note: s.note ?? "", look: LOOK[what] ?? null,
    dismiss: true, cost: s.cost ?? null, shareWounds: s.shareWounds ?? null
  };
  return out;
}

/** The lines a summoning card shows: what came, how long, who commands it, the keeping roll, the upkeep. */
export function cardLines(r, {caster = "the summoner"} = {}) {
  if ( !r ) return [];
  const lines = [];
  lines.push(`${r.swarm ? `A swarm (${r.count})` : r.count === 1 ? `One ${r.whatLabel}` : `${r.count} of them (${r.whatLabel})`}, for ${r.lasts}`);
  lines.push(`${cap(CONTROL[r.control] ?? CONTROL.orders).replace("The summoner", caster)}${r.range === "sight" ? ", while in sight" : ""}${r.orders === "simple" ? "; simple orders only" : ""}`);
  if ( r.roll ) {
    const when = {"each-turn": "Each of its turns", arrival: "When it comes", "each-order": "Each order", away: "Each turn it is away from the summoner"}[r.roll.when] ?? "When it comes";
    const pool = String(r.roll.pool ?? "willpower").split("+").map(cap).join(" + ");
    lines.push(`${when}: ${r.roll.who === "creature" ? "it rolls" : `${caster} rolls`} ${pool} at ${r.roll.diff}; failing, it ${slipOf(r.roll.fail).text}`);
  }
  if ( r.upkeep ) lines.push(`Kept by ${r.upkeep.points} ${r.upkeep.pool} a ${r.upkeep.every}; unpaid, it ${r.upkeep.fail === "dies" ? "dies" : r.upkeep.fail === "stops" ? "falls still" : "leaves"}`);
  if ( r.note ) lines.push(r.note);
  return lines;
}
