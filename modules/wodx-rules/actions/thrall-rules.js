/**
 * WoDX Actions (B7920-B7926): the infernal thrall of Dark Ages: Devil's Due (2003), pure rules. A mortal who took
 * Resolve from a demon: Vice, Resolve, Torment and the Hierarchy of Sins (pp. 85-87, 94-98), the effects of Torment
 * (Aura of Sin, Consumption, Vice Addiction, Vulnerability to Faith, p. 97-98), atonement (p. 98, 100), the Arcana and
 * Taints and Pacts caps (pp. 96, 101), the three-part Pact (pp. 124-125), the Rites Background with summoning and
 * binding (pp. 93, 102-103), the crossover for a mage thrall (p. 132) and Absolution of the Damned (p. 133).
 * Summaries in our own words with the printed page. No Foundry calls.
 */

export const REF = "Dark Ages: Devil's Due";
const n = v => { const x = Number(v); return Number.isFinite(x) ? Math.trunc(x) : 0; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, n(v)));

/* ---- Vice (pp. 85-87) ---- */

/** The seven Vices, each with the virtue that opposes it (atonement lives by that virtue). */
export const VICES = {
    pride: { label: "Pride", virtue: "humility" },
    envy: { label: "Envy", virtue: "kindness" },
    gluttony: { label: "Gluttony", virtue: "temperance" },
    lust: { label: "Lust", virtue: "love" },
    wrath: { label: "Wrath", virtue: "mercy" },
    avarice: { label: "Avarice", virtue: "generosity" },
    sloth: { label: "Sloth", virtue: "diligence" }
};
export const viceOf = k => VICES[k] ?? null;

/* ---- The thrall's record (flag wodx-actions.thrall) ---- */

/** A thrall as a sheet keeps one: start values of p. 85 (Resolve 1, Torment 1). */
export function thrallFlag(t = {}) {
    const perm = clamp(t.torment ?? 1, 1, 10);
    const res = clamp(t.resolve ?? 1, 1, 10);
    return {
        vice: VICES[t.vice] ? t.vice : "pride", master: String(t.master ?? ""),
        resolve: { perm: res, temp: res }, torment: { perm, temp: clamp(t.tormentTemp ?? 0, 0, 9) },
        pacts: (Array.isArray(t.pacts) ? t.pacts : []).map((p, i) => ({ id: String(p.id ?? `pact-${i + 1}`), oath: String(p.oath ?? ""), costs: String(p.costs ?? ""), ...pactValue(p) })).filter(p => p.ok),
        taints: (Array.isArray(t.taints) ? t.taints : []).map(x => ({ name: String(x.name ?? "A Taint"), value: Math.max(1, n(x.value)) })),
        arcana: (Array.isArray(t.arcana) ? t.arcana : []).map(x => ({ name: String(x.name ?? "An Arcana"), cost: Math.max(1, n(x.cost)) })), rites: Array.isArray(t.rites) ? t.rites.map(rite) : [], bound: Array.isArray(t.bound) ? t.bound.map(boundDemon) : [],
        untainted: !!t.untainted, mage: !!t.mage
    };
}
/** A flag read safely. */
export function stateOf(f = {}) {
    const res = { perm: clamp(f.resolve?.perm ?? 1, 0, 10), temp: clamp(f.resolve?.temp ?? f.resolve?.perm ?? 1, 0, 10) };
    const tor = { perm: clamp(f.torment?.perm ?? 1, 0, 10), temp: clamp(f.torment?.temp ?? 0, 0, 9) };
    return { ...f, vice: VICES[f.vice] ? f.vice : "pride", resolve: res, torment: tor,
        pacts: Array.isArray(f.pacts) ? f.pacts : [], taints: Array.isArray(f.taints) ? f.taints : [],
        arcana: Array.isArray(f.arcana) ? f.arcana : [], rites: Array.isArray(f.rites) ? f.rites : [], bound: Array.isArray(f.bound) ? f.bound : [] };
}

/* ---- Torment and the Hierarchy of Sins (pp. 94-97) ---- */

/** The hierarchy, by the Torment it guards (our words). */
export const HIERARCHY = {
    9: "Casual cruelty: slaughter, torture, harm done without thought",
    8: "Planned harm: murder, a long-sought revenge",
    7: "Harm in passion: a killing in rage; breaking something deeply meaningful",
    6: "Meaning to hurt someone, in body, heart or soul",
    5: "Harm by carelessness; neglecting a duty; betraying a trust",
    4: "Theft or wanton destruction; breaking a sworn word",
    3: "Hurting a mortal except in self-defence or for the greater good",
    2: "Giving in to your own Vice",
    1: "Giving in to any vice; letting lesser sins pass unopposed"
};
/**
 * B7925: what play records as a sin, at its line of the hierarchy (a house reading of which line names the act).
 * A null is no sin for a thrall.
 */
export const SIN_EVENTS = { kill: 8, killFrenzy: 7, killFeed: 8, embrace: 8, mindMortal: 6, lie: 5, wordBroken: 4, theft: 4, vice: 2,
    diablerie: null, frenzy: null, notRidden: null, starve: null, feedUnwilling: null };
export const sinForEvent = event => (event in SIN_EVENTS ? SIN_EVENTS[event] : null);

/** Does a sin at this line call for a check? A thrall counts Torment two higher (p. 96); at 10 nothing does. */
export function sinApplies(level, torment, { thrall = true } = {}) {
    const t = n(torment), l = n(level);
    if (t >= 10 || l < 1) return false;
    return l >= t + (thrall ? 2 : 0);
}
/** The degeneration roll: Conscience at 6 for a thrall, Resolve at 8 for a demon; +1 with no Resolve left (p. 94). */
export function degeneration(s, { thrall = true } = {}) {
    const empty = n(s?.resolve?.temp) < 1;
    return { trait: thrall ? "conscience" : "resolve", difficulty: (thrall ? 6 : 8) + (empty ? 1 : 0), empty };
}
/** Torment moved by k temporary points: ten make a permanent dot; going below 0 spends a permanent dot as 10 (p. 96, 101). */
export function shiftTorment(t = {}, k = 0) {
    let perm = clamp(t.perm, 0, 10), temp = n(t.temp) + n(k);
    while ( temp >= 10 && perm < 10 ) { temp -= 10; perm += 1; }
    while ( temp < 0 && perm > 0 ) { temp += 10; perm -= 1; }
    if ( perm >= 10 ) { perm = 10; temp = 0; }
    return { perm, temp: Math.max(0, Math.min(9, temp)) };
}
/** A failed degeneration roll: a temporary point. */
export const sinFailed = t => shiftTorment(t, 1);

/** Atonement for a virtuous act: one experience, a temporary point off, or a permanent dot turned into nine (p. 98). */
export function atone(t = {}) {
    const perm = clamp(t.perm, 0, 10), temp = clamp(t.temp, 0, 9);
    if ( temp > 0 ) return { perm, temp: temp - 1, xp: 1 };
    if ( perm > 0 ) return { perm: perm - 1, temp: 9, xp: 1 };
    return { perm, temp, xp: 0 };
}

/* ---- The effects of Torment (pp. 97-98) ---- */

/** Aura of Sin: reading the Vice is Perception + Empathy at 12 - permanent Torment (10 at most). */
export const auraReadDiff = torment => Math.min(10, Math.max(2, 12 - n(torment)));
/** The Social shift the Vice gives (p. 97; the book's rows overlap at 8, read here as 9-10 for 3). */
export const auraShift = torment => { const t = n(torment); return t >= 9 ? 3 : t >= 6 ? 2 : t >= 3 ? 1 : 0; };
/** The ticks a thrall's roll offers for the Aura of Sin (trait-hooks.js). */
export const AURA_TICKS = [
    { key: "vice-suits", label: "Your Vice suits this deed (Aura of Sin)" },
    { key: "vice-repels", label: "The other finds your Vice foul (Aura of Sin)" }
];
/** Consumption: permanent Torment over Resolve is that many unsoakable lethal levels at dawn, unhealable meanwhile. */
export const consumption = (torment, resolve) => Math.max(0, n(torment) - n(resolve));
/** Vice Addiction: Torment over permanent Willpower means a Self-Control roll at the Torment to resist the Vice. */
export function viceAddiction(torment, willpower) {
    const t = n(torment);
    return t > n(willpower) ? { roll: true, trait: "selfcontrol", difficulty: Math.min(10, Math.max(2, t)) } : { roll: false };
}
/** What a Vice Addiction roll means: a botch gives in and calls for degeneration. */
export const addictionOutcome = r => (r?.botch ? "botch" : n(r?.successes) > 0 ? "resists" : "indulges");
/** Vulnerability to Faith: dice a turn equal to the Faith rating, bashing for a thrall; none at Torment 1; Courage at the Torment to stay (p. 98). */
export function faithBurn(faith, torment, { thrall = true } = {}) {
    const f = clamp(faith, 0, 10), t = n(torment);
    return { dice: t <= 1 ? 0 : f, type: thrall ? "bashing" : "aggravated", stay: { trait: thrall ? "courage" : "resolve", difficulty: Math.min(10, Math.max(2, t)) } };
}

/* ---- Resolve (p. 94, 100) and the crossover for a mage thrall (p. 132) ---- */

/** At sunrise a thrall regains one point; a mage thrall regains a point a success on Foundation at 7. */
export const MAGE_DAWN_DIFF = 7;
export const dawnResolve = (s, { mageSuccesses = null } = {}) => Math.min(n(s?.resolve?.perm), n(s?.resolve?.temp) + (mageSuccesses === null ? 1 : Math.max(0, n(mageSuccesses))));
/** A day index whose day turns at sunrise (06:00). */
export const dawnIndex = (worldTime, day, hour) => Math.floor((Number(worldTime) - 6 * hour) / day);
/** Resolve bought with experience: current x 7 for a thrall, x 5 for a demon. */
export const resolveXp = (current, { thrall = true } = {}) => Math.max(1, n(current)) * (thrall ? 7 : 5);
/** A mage thrall's botched casting: each permanent Torment counts as one more 1 for the Backlash. */
export const mageBacklashOnes = torment => Math.max(0, n(torment));

/* ---- Arcana, Taints and Pacts (pp. 96, 101) ---- */

const sum = (list, k = "value") => (list ?? []).reduce((s, x) => s + Math.max(0, n(x?.[k])), 0);
export const arcanaTotal = s => sum(s?.arcana, "cost");
/** Arcana may not total more than permanent Torment x 10 + temporary Torment + Taints + Pacts. */
export const arcanaCap = s => n(s?.torment?.perm) * 10 + n(s?.torment?.temp) + sum(s?.taints) + sum(s?.pacts);
/** Taints and Pacts together may not pass Willpower x 5. */
export const taintCap = willpower => Math.max(0, n(willpower)) * 5;
export function canInvest(s, cost) {
    const c = Math.max(1, n(cost));
    const after = arcanaTotal(s) + c, cap = arcanaCap(s);
    return after <= cap ? { ok: true, after, cap } : { ok: false, after, cap, why: `Arcana would total ${after}, over the ${cap} the Torment, Taints and Pacts allow` };
}
/** A Taint or Pact laid on a thrall takes its value off the temporary Torment (the master spends a Resolve). */
export function addBurden(s, value, willpower) {
    const v = Math.max(1, n(value)), now = sum(s?.taints) + sum(s?.pacts), cap = taintCap(willpower);
    if ( now + v > cap ) return { ok: false, why: `Taints and Pacts would total ${now + v}, over Willpower x 5 (${cap})` };
    return { ok: true, torment: shiftTorment(s?.torment, -v) };
}

/* ---- The three-part Pact (pp. 124-125) ---- */

export const OBLIGATION = ["", "A trifle, or giving up what is never done anyway", "Little effort or inconvenience", "Moderate effort or slight danger; giving up something not cared for",
    "Serious effort or danger; giving up something enjoyed", "Grueling effort or great peril; giving up something dearly loved and done often"];
export const FREQUENCY = ["", "Every day, or never at all", "Three times a week, or most of the time", "Once a week, or about half the time", "Every other week", "Once a month"];
export const CONSEQUENCE = ["", "The pact ends and the Torment it held comes back (or a Willpower lost each failure)", "An unsoakable aggravated level", "A dot of an Ability named at the sealing, lost",
    "A permanent dot of Torment", "A horrible death"];
/** The value of a pact: Obligation + Consequence - Frequency. An abstention is never rarer than 3; a pact of 0 or less is no use. */
export function pactValue({ obligation = 1, frequency = 1, consequence = 1, avoid = false } = {}) {
    const o = clamp(obligation, 1, 5), c = clamp(consequence, 1, 5);
    let f = clamp(frequency, 1, 5);
    const notes = [];
    if ( avoid && f > 3 ) { f = 3; notes.push("an abstention is at most Frequency 3"); }
    const value = o + c - f;
    return { obligation: o, frequency: f, consequence: c, avoid: !!avoid, value, ok: value > 0, notes, why: value > 0 ? "" : "a pact worth 0 or less holds no faith" };
}
/** A failure: by choice the full Consequence, under compulsion only a warning (rating 1). */
export const failedConsequence = (pact, { chosen = true } = {}) => (chosen ? clamp(pact?.consequence, 1, 5) : 0);

/* ---- Rites, summoning and binding (pp. 93, 102-103) ---- */

/** A ritual the diabolist holds or is working on. */
export function rite(r = {}) {
    const kind = r.kind === "summon" ? "summon" : "bind", demon = String(r.demon ?? "");
    return { id: String(r.id ?? `rite-${kind}-${demon.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`), demon, kind,
        resolve: clamp(r.resolve ?? 3, 1, 10), torment: clamp(r.torment ?? 6, 1, 10), willpower: clamp(r.willpower ?? 5, 1, 10),
        trueName: !!r.trueName, known: { nature: !!r.known?.nature, vice: !!r.known?.vice, function: !!r.known?.function },
        progress: n(r.progress), botches: n(r.botches), ready: r.ready !== undefined ? !!r.ready : true, spoiled: !!r.spoiled, master: !!r.master };
}
/** Rites held may not pass the Demonology rating (learned in play they may). */
export const ritesCap = demonology => Math.max(0, n(demonology));
/** Research a week: Intelligence + Demonology at 8 (Occult 10), -1 for each of Nature, Vice and function known, -3 the True Name; successes to Resolve + Torment. */
export function researchPlan(r, { ability = "demonology" } = {}) {
    const x = rite(r);
    const known = ["nature", "vice", "function"].filter(k => x.known[k]).length;
    const difficulty = Math.max(2, (ability === "occult" ? 10 : 8) - known - (x.trueName ? 3 : 0));
    return { difficulty, need: x.resolve + x.torment, have: x.progress };
}
/** A week's research: a botch ruins the work; a second botch in a row leaves a rite that will botch when spoken. */
export function researchWeek(r, roll) {
    const x = rite(r);
    const plan = researchPlan(x);
    if ( roll?.botch ) {
        if ( x.botches >= 1 ) return { ...x, ready: true, spoiled: true, botches: 0, progress: plan.need, note: "the diabolist believes the rite complete; spoken, it botches" };
        return { ...x, progress: 0, botches: 1, ready: false, note: "a botch: the work is ruined and starts again" };
    }
    const progress = x.progress + Math.max(0, n(roll?.successes));
    const ready = progress >= plan.need;
    return { ...x, progress, botches: 0, ready, note: ready ? "the rite is complete" : `${progress} of ${plan.need}` };
}
/** Performing: Wits + Demonology hourly (summoning) or each minute (binding) at the demon's Resolve, +2 with Occult, -1 a ten helpers, -3 the True Name, 5 at least; above 10 impossible. */
export function performPlan(r, { ability = "demonology", helpers = 0, thrall = false } = {}) {
    const x = rite(r);
    if ( x.kind === "bind" && thrall && x.master ) return { ok: false, why: "a thrall cannot bind the demon that holds them" };
    const raw = x.resolve + (ability === "occult" ? 2 : 0) - Math.floor(Math.max(0, n(helpers)) / 10) - (x.trueName ? 3 : 0);
    const difficulty = Math.max(5, raw);
    if ( difficulty > 10 ) return { ok: false, why: "the difficulty passes 10: the rite cannot be done this way" };
    return { ok: true, difficulty, need: x.resolve, interval: x.kind === "summon" ? "hour" : "minute" };
}
/**
 * The rolls of a rite in order until it is decided. A summoning goes on until its successes; a botch may still bring
 * the demon but no binding takes. A binding fails on two failures in a row or a botch.
 */
export function performRun(r, rolls = [], { spoiled = false } = {}) {
    const x = rite(r);
    let got = 0, misses = 0, i = 0;
    for ( const roll of rolls ) {
        i++;
        if ( spoiled || roll?.botch ) return { done: true, ok: false, botch: true, steps: i, got };
        if ( n(roll?.successes) > 0 ) { got += n(roll.successes); misses = 0; }
        else misses++;
        if ( got >= x.resolve ) return { done: true, ok: true, steps: i, got };
        if ( x.kind === "bind" && misses >= 2 ) return { done: true, ok: false, steps: i, got };
    }
    return { done: false, ok: false, steps: i, got };
}
/** A demon bound: it obeys a day, then each day Wits + Occult against its Willpower, both at 6, until it wins. */
export const BOND_DIFF = 6;
export function boundDemon(b = {}) {
    return { name: String(b.name ?? "A demon"), willpower: clamp(b.willpower ?? 5, 1, 10), resolve: clamp(b.resolve ?? 3, 1, 10), torment: clamp(b.torment ?? 6, 1, 10),
        sinceDay: n(b.sinceDay), lastDay: b.lastDay === undefined ? null : n(b.lastDay), free: !!b.free, note: String(b.note ?? "") };
}
/** Is the day's contest due? Not on the first day. */
export const bondDue = (b, day) => !b.free && n(day) > n(b.sinceDay) && (b.lastDay === null || n(b.lastDay) < n(day));
/** The contest: the demon wins on more successes. */
export const bondHolds = (mine, theirs) => n(mine?.successes) >= n(theirs?.successes) || !!theirs?.botch;

/* ---- Absolution of the Damned (p. 133) ---- */

/** An inquisitor's level 3 ritus: Intelligence + Holy Art at permanent Torment + 3 (10 at most). */
export const ABSOLUTION_LEVEL = 3;
export const absolutionDiff = torment => Math.min(10, n(torment) + 3);
/** Absolved: the Resolve, Torment, Arcana and Curses go, at one die of lethal for each five points of Arcana. */
export const absolutionDice = s => Math.floor(arcanaTotal(s) / 5);
